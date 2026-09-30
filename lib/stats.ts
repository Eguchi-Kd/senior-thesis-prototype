import { doc, getDoc, increment, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { PlayerTypeId } from "./playerType";

// 他プレイヤーとの比較用の集計（個人のログは含まない匿名の人数カウントのみ）。
// キー：n=参加人数, g0..g6=本編の正答数, p0..p6=事後テストの正答数, t_<type>=タイプ別人数（firestore.rules の許可キーと一致させる）
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

// ─── 表示確認用のダミー集計（テスト実行時のみ使用。Firestore には読み書きしない） ───
export type DemoPreset = "few" | "30" | "120";

const toStats = (g: number[], p: number[], t: Record<PlayerTypeId, number>): Stats => {
  const s: Stats = { n: g.reduce((a, b) => a + b, 0) };
  g.forEach((v, k) => (s[`g${k}`] = v));
  p.forEach((v, k) => (s[`p${k}`] = v));
  (Object.keys(t) as PlayerTypeId[]).forEach((k) => (s[`t_${k}`] = t[k]));
  return s;
};

export const DEMO_STATS: Record<DemoPreset, { label: string; stats: Stats }> = {
  few: {
    label: "集計中（3人）",
    stats: toStats([0, 0, 0, 1, 1, 1, 0], [0, 0, 0, 1, 1, 1, 0], { detective: 1, growing: 1, cautious: 1, trusting: 0, intuitive: 0, balanced: 0 }),
  },
  "30": {
    label: "30人",
    stats: toStats([0, 1, 2, 5, 9, 8, 5], [0, 1, 3, 6, 9, 7, 4], { detective: 9, growing: 8, cautious: 6, trusting: 4, intuitive: 2, balanced: 1 }),
  },
  "120": {
    label: "120人",
    stats: toStats([1, 3, 9, 20, 35, 32, 20], [1, 4, 11, 24, 37, 28, 15], { detective: 40, growing: 33, cautious: 22, trusting: 15, intuitive: 7, balanced: 3 }),
  },
};

// ダミー集計に自分の結果を1人分加える（本番で自分の加算後に取得するのと同じ見え方にする）
export function withSelf(stats: Stats, gameCorrect: number, postCorrect: number, type: PlayerTypeId): Stats {
  const s = { ...stats };
  const inc = (k: string) => (s[k] = (s[k] ?? 0) + 1);
  inc("n");
  inc(`g${gameCorrect}`);
  inc(`p${postCorrect}`);
  inc(`t_${type}`);
  return s;
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
