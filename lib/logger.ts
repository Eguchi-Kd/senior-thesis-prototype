import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { create } from "zustand";
import { db } from "./firebase";
import { useGameStore } from "@/store/gameStore";

// 保存状態（ブースでの確認用）。pending>0 はサーバー未到達（オフライン中は端末に保持され、復帰後に自動送信）
export const useSaveStatus = create<{ pending: number; lastSyncedAt: number | null; lastError: string | null }>(() => ({
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
}));

// 終了画面に表示する参加者コード（データ削除の申し出用）。sessionId の乱数部から作る
export function toParticipantCode(sessionId: string): string {
  return (sessionId.split("_").pop() ?? sessionId).slice(0, 6).toUpperCase();
}

// 現在のストア状態から Firestore 保存用ペイロードを組み立てる
function buildPayload() {
  const s = useGameStore.getState();
  return {
    sessionId: s.sessionId,
    participantCode: toParticipantCode(s.sessionId),
    schemaVersion: s.schemaVersion,
    contentVersion: s.contentVersion,
    startedAt: s.startedAt,
    deviceInfo: s.deviceInfo,
    testRun: s.testRun,
    priorPlays: s.priorPlays,
    resumeCount: s.resumeCount,
    testForms: s.testForms,
    testItemOrder: s.testItemOrder,
    phaseTimes: s.phaseTimes,
    hiddenCount: s.hiddenCount,
    hiddenTotalMs: s.hiddenTotalMs,
    lastHiddenPhase: s.lastHiddenPhase,
    scenarioOrder: s.scenarioOrder,
    consent: s.consent,
    demographics: s.demographics,
    selfEfficacyPre: s.selfEfficacyPre,
    selfEfficacyPost: s.selfEfficacyPost,
    preTest: s.preTestLogs,
    logs: s.logs,
    transferTest: s.transferTestLogs,
    survey: s.survey,
    resultType: s.resultType,
    phase: s.phase,
  };
}

// sessionId をドキュメントIDにして merge 保存（フェーズごとに逐次上書き＝途中離脱でも部分データが残る）。
// 同意前（テスト実行を除く）は保存しない。呼び出し側は await しない（通信待ちで進行を止めない）。
export async function saveSnapshot(extra: Record<string, unknown> = {}): Promise<void> {
  const s = useGameStore.getState();
  if (!s.consent.agreed && !s.testRun) return;
  useSaveStatus.setState((st) => ({ pending: st.pending + 1 }));
  try {
    await setDoc(doc(db, "sessions", s.sessionId), { ...buildPayload(), ...extra, updatedAt: serverTimestamp() }, { merge: true });
    useSaveStatus.setState((st) => ({ pending: st.pending - 1, lastSyncedAt: Date.now(), lastError: null }));
  } catch (error) {
    // 外部サービス障害でゲームが止まらないよう握りつぶし、状態だけ残す
    console.error("Failed to save session:", error);
    useSaveStatus.setState((st) => ({ pending: st.pending - 1, lastError: String(error) }));
  }
}

// 全工程完了時の最終保存
export async function saveSession(): Promise<void> {
  await saveSnapshot({ completed: true, completedAt: serverTimestamp() });
}
