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

// 現在のストア状態から Firestore 保存用ペイロードを組み立てる（analysis/simulate_sessions.ts でも使用）
export function buildPayload() {
  const s = useGameStore.getState();
  return {
    sessionId: s.sessionId,
    participantCode: toParticipantCode(s.sessionId),
    schemaVersion: s.schemaVersion,
    contentVersion: s.contentVersion,
    contentVersionsSeen: s.contentVersionsSeen,
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
// 同意前（テスト実行を除く）は保存しない。呼び出し側は基本 await しない（通信待ちで進行を止めない）。
// 戻り値：サーバーが書き込みを受け付けたら true（オフライン中は復帰して届くまで解決しない）、失敗なら false
export async function saveSnapshot(extra: Record<string, unknown> = {}): Promise<boolean> {
  const s = useGameStore.getState();
  if (!s.consent.agreed && !s.testRun) return false;
  useSaveStatus.setState((st) => ({ pending: st.pending + 1 }));
  try {
    await setDoc(doc(db, "sessions", s.sessionId), { ...buildPayload(), ...extra, updatedAt: serverTimestamp() }, { merge: true });
    useSaveStatus.setState((st) => ({ pending: st.pending - 1, lastSyncedAt: Date.now(), lastError: null }));
    return true;
  } catch (error) {
    // 外部サービス障害でゲームが止まらないよう握りつぶし、状態だけ残す
    console.error("Failed to save session:", error);
    useSaveStatus.setState((st) => ({ pending: st.pending - 1, lastError: String(error) }));
    return false;
  }
}

// 全工程完了時の最終保存
export async function saveSession(): Promise<boolean> {
  return saveSnapshot({ completed: true, completedAt: serverTimestamp() });
}

// 結果画面で最終データの到達を確かめる（再読み込み後も再実行する。completedAt は最初の完了時刻を残すため送らない）
export function confirmFinalSave(): Promise<boolean> {
  return saveSnapshot({ completed: true });
}
