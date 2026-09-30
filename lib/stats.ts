import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { PlayerTypeId } from "./playerType";

// 他プレイヤーとの比較用の集計（個人のログは含まない匿名の人数カウントのみ）。
// キー：n=参加人数, g0..g6=本編の正答数, p0..p6=事後テストの正答数, t_<type>=タイプ別人数
const STATS_REF = () => doc(db, "stats", "festival2026");

export type Stats = Record<string, number>;

export async function submitStats(gameCorrect: number, postCorrect: number, type: PlayerTypeId): Promise<boolean> {
  try {
    await setDoc(
      STATS_REF(),
      { n: increment(1), [`g${gameCorrect}`]: increment(1), [`p${postCorrect}`]: increment(1), [`t_${type}`]: increment(1) },
      { merge: true },
    );
    return true;
  } catch (e) {
    console.error("Failed to submit stats:", e);
    return false;
  }
}

export async function fetchStats(): Promise<Stats | null> {
  try {
    const snap = await getDoc(STATS_REF());
    return snap.exists() ? (snap.data() as Stats) : {};
  } catch (e) {
    console.error("Failed to fetch stats:", e);
    return null;
  }
}
