import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useGameStore } from "@/store/gameStore";

// 現在のストア状態から Firestore 保存用ペイロードを組み立てる
function buildPayload() {
  const s = useGameStore.getState();
  return {
    sessionId: s.sessionId,
    startedAt: s.startedAt,
    deviceInfo: s.deviceInfo,
    scenarioOrder: s.scenarioOrder,
    consent: s.consent,
    demographics: s.demographics,
    selfEfficacyPre: s.selfEfficacyPre,
    selfEfficacyPost: s.selfEfficacyPost,
    preTest: s.preTestLogs,
    logs: s.logs,
    transferTest: s.transferTestLogs,
    survey: s.survey,
    phase: s.phase,
  };
}

// sessionId をドキュメントIDにして merge 保存（フェーズごとに逐次上書き＝途中離脱でも部分データが残る）
export async function saveSnapshot(extra: Record<string, unknown> = {}): Promise<void> {
  try {
    const sessionId = useGameStore.getState().sessionId;
    await setDoc(
      doc(db, "sessions", sessionId),
      { ...buildPayload(), ...extra, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    // Ollama等と同様、外部サービス障害でゲームが止まらないよう握りつぶす
    console.error("Failed to save session:", error);
  }
}

// 全工程完了時の最終保存
export async function saveSession(): Promise<void> {
  await saveSnapshot({ completed: true, completedAt: serverTimestamp() });
}

// 離脱（タブを閉じる/バックグラウンド化）時にベストエフォートで部分保存する
export function registerDropoutSave(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    if (document.visibilityState === "hidden") {
      const phase = useGameStore.getState().phase;
      void saveSnapshot({ dropoutPhase: phase });
    }
  };
  document.addEventListener("visibilitychange", handler);
  window.addEventListener("pagehide", handler);
  return () => {
    document.removeEventListener("visibilitychange", handler);
    window.removeEventListener("pagehide", handler);
  };
}
