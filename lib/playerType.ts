import type { ScenarioLog } from "@/store/gameStore";

export type PlayerTypeId = "detective" | "growing" | "cautious" | "trusting" | "intuitive" | "balanced";

// 説明文は「回答で何が起きたか」の記述にとどめ、性格は推測しない（本編6問からの簡易判定のため）
export const PLAYER_TYPES: Record<PlayerTypeId, { name: string; emoji: string; desc: string; tip: string; rule: string }> = {
  detective: {
    name: "名探偵タイプ",
    emoji: "🕵️",
    desc: "部屋の情報とスマホを見比べて、ほとんどの問題を見破りました。",
    tip: "その「見比べる習慣」を実生活でも。迷ったら公式アプリや登録済みの連絡先で確かめよう。",
    rule: "6問中5問以上正解し、5問以上で判定に必要な情報を両方調べたため。",
  },
  growing: {
    name: "のびしろタイプ",
    emoji: "🌱",
    desc: "今回は見分けるのが難しい問題が多かったようです。解説で見比べるポイントを知ると、ぐっと見破りやすくなります。",
    tip: "「復習しよう」で間違えた問題の解説を読んでみよう。予定やメモとスマホの通知を見比べるのがコツです。",
    rule: "6問中の正解が3問以下だったため。",
  },
  cautious: {
    name: "慎重派タイプ",
    emoji: "🛡️",
    desc: "怪しい通知を見逃さない一方で、正常な通知まで「詐欺かも」と判断することが多めでした。",
    tip: "疑ったら終わりではなく、自分の行動や公式情報と一致するかを確かめると、正常な通知も安心して扱えます。",
    rule: "正常な通知を詐欺と判断した割合が、詐欺を見逃した割合より高かったため。",
  },
  trusting: {
    name: "お人よしタイプ",
    emoji: "🤝",
    desc: "詐欺の通知を「問題ない」と判断してしまうことが多めでした。",
    tip: "「急がせる」「口止めする」「いつもと違う」がそろったら一度立ち止まり、別の手段で確認しよう。",
    rule: "詐欺を見逃した割合が、正常な通知を詐欺と判断した割合より高かったため。",
  },
  intuitive: {
    name: "直感派タイプ",
    emoji: "⚡",
    desc: "判断は早めでしたが、部屋の情報とじっくり見比べる前に決めてしまうことがありました。",
    tip: "スマホの通知だけでなく、予定やメモなど手元の情報と照らし合わせると、直感がもっと当たるようになります。",
    rule: "調べた数が少なめ（1問あたり平均2個未満）、または判定が早め（画面を見ていた時間の中央値15秒未満）だったため。",
  },
  balanced: {
    name: "バランスタイプ",
    emoji: "⚖️",
    desc: "詐欺も正常な通知も、きちんと見分けられていました。",
    tip: "判定に必要な情報を毎回両方とも確かめる習慣がつくと、名探偵に近づけます。",
    rule: "全問正解でしたが、判定に必要な情報を両方調べた問題が5問未満だったため。",
  },
};

export const PLAYER_TYPE_IDS = Object.keys(PLAYER_TYPES) as PlayerTypeId[];

const QUICK_MS = 15_000; // 画面を見ていた判定時間の中央値がこれ未満なら「すばやく決めた」とみなす
const TIME_FULL_MS = 30_000; // レーダーの「時間」はこの時間で目盛りいっぱい（長いほど良いという意味ではない）

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 初回調査→決定の時間から、画面が非表示だった時間（アプリ切替など）を除く
const activeRt = (l: ScenarioLog) => Math.max(0, l.reactionTimeMs - (l.hiddenMs ?? 0));

// ゲーム本編のログからタイプを判定（上から順に当てはまるものを採用）
export function diagnosePlayerType(logs: ScenarioLog[]): PlayerTypeId {
  if (logs.length === 0) return "growing";
  const correct = logs.filter((l) => l.correct).length;
  const nSafe = logs.filter((l) => !l.isFraud).length;
  const nFraud = logs.length - nSafe;
  // 本編は詐欺4・安全2で問題数が違うため、回数ではなく率で比べる
  const faRate = nSafe ? logs.filter((l) => l.signalType === "fa").length / nSafe : 0;
  const missRate = nFraud ? logs.filter((l) => l.signalType === "miss").length / nFraud : 0;
  const relevantRate = logs.filter((l) => l.viewedAllRelevant).length / logs.length;
  const avgInspected = logs.reduce((s, l) => s + l.inspectedIds.length, 0) / logs.length;

  if (correct >= logs.length - 1 && relevantRate >= 0.8) return "detective";
  if (correct <= logs.length / 2) return "growing"; // 正解が半分以下なら、偏りより復習を優先して伝える
  if (faRate > missRate) return "cautious";
  if (missRate > faRate) return "trusting";
  if (avgInspected < 2 || median(logs.map(activeRt)) < QUICK_MS) return "intuitive";
  return "balanced";
}

export interface PlayerProfile {
  detect: number; // 見破る：詐欺を詐欺と判断できた割合
  discern: number; // 見極める：正常を正常と判断できた割合
  compare: number; // 両方確認：判定に必要な情報を両方開いた割合（理解したかまでは分からない）
  time: number; // 時間：画面を見ていた判定時間の中央値（30秒で目盛りいっぱい）
  selfReliance: number; // 自力：ヒントを使わずに判定した割合
}

// 結果画面のレーダーチャート用。いずれも 0〜1。6問しかないので値は粗い目安
export function computeProfile(logs: ScenarioLog[]): PlayerProfile {
  if (logs.length === 0) return { detect: 0, discern: 0, compare: 0, time: 0, selfReliance: 0 };
  const fraud = logs.filter((l) => l.isFraud);
  const safe = logs.filter((l) => !l.isFraud);
  const rate = (arr: ScenarioLog[], f: (l: ScenarioLog) => boolean) => (arr.length ? arr.filter(f).length / arr.length : 0);
  return {
    detect: rate(fraud, (l) => l.correct),
    discern: rate(safe, (l) => l.correct),
    compare: rate(logs, (l) => l.viewedAllRelevant),
    time: Math.min(1, median(logs.map(activeRt)) / TIME_FULL_MS),
    selfReliance: rate(logs, (l) => !l.hintUsed),
  };
}
