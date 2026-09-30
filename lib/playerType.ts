import type { ScenarioLog } from "@/store/gameStore";

export type PlayerTypeId = "detective" | "cautious" | "trusting" | "intuitive" | "balanced";

export const PLAYER_TYPES: Record<PlayerTypeId, { name: string; emoji: string; desc: string; tip: string; rule: string }> = {
  detective: {
    name: "名探偵タイプ",
    emoji: "🕵️",
    desc: "部屋の情報とスマホをしっかり見比べて、ほとんどの問題を見破りました。",
    tip: "その「見比べる習慣」を実生活でも。迷ったら公式アプリや登録済みの連絡先で確かめよう。",
    rule: "6問中5問以上正解し、5問以上で判定に必要な情報を両方調べたため。",
  },
  cautious: {
    name: "慎重派タイプ",
    emoji: "🛡️",
    desc: "怪しいものを見逃さない用心深さの持ち主。ただ、正常な通知まで疑ってしまうことも。",
    tip: "疑ったら終わりではなく、自分の行動や公式情報と一致するかを確かめると、正常な通知も安心して扱えます。",
    rule: "正常な通知を詐欺と判断した割合が、詐欺を見逃した割合より高かったため。",
  },
  trusting: {
    name: "お人よしタイプ",
    emoji: "🤝",
    desc: "人や通知を信じられるやさしさの持ち主。そのぶん、巧妙な詐欺にだまされやすい面も。",
    tip: "「急がせる」「口止めする」「いつもと違う」がそろったら一度立ち止まり、別の手段で確認しよう。",
    rule: "詐欺を見逃した割合が、正常な通知を詐欺と判断した割合より高かったため。",
  },
  intuitive: {
    name: "直感派タイプ",
    emoji: "⚡",
    desc: "決断の早さが持ち味。ただ、部屋の情報とじっくり見比べる前に決めてしまうことがありました。",
    tip: "スマホの通知だけでなく、予定やメモなど手元の情報と照らし合わせると、直感がもっと当たるようになります。",
    rule: "調べた数が少なめ（1問あたり平均2個未満）、または判定が早め（中央値15秒未満）だったため。",
  },
  balanced: {
    name: "バランスタイプ",
    emoji: "⚖️",
    desc: "疑いすぎず信じすぎず、バランスよく判断できています。",
    tip: "送信元のドメインの読み方など、細かな手がかりを押さえると名探偵に近づけます。",
    rule: "見逃しと誤警報の割合が同じくらいで、時間をかけて見比べていたため。",
  },
};

export const PLAYER_TYPE_IDS = Object.keys(PLAYER_TYPES) as PlayerTypeId[];

// ゲーム本編のログからタイプを判定（上から順に当てはまるものを採用）
export function diagnosePlayerType(logs: ScenarioLog[]): PlayerTypeId {
  if (logs.length === 0) return "balanced";
  const correct = logs.filter((l) => l.correct).length;
  const nSafe = logs.filter((l) => !l.isFraud).length;
  const nFraud = logs.length - nSafe;
  // 本編は詐欺4・安全2で問題数が違うため、回数ではなく率で比べる
  const faRate = nSafe ? logs.filter((l) => l.signalType === "fa").length / nSafe : 0;
  const missRate = nFraud ? logs.filter((l) => l.signalType === "miss").length / nFraud : 0;
  const relevantRate = logs.filter((l) => l.viewedAllRelevant).length / logs.length;
  const avgInspected = logs.reduce((s, l) => s + l.inspectedIds.length, 0) / logs.length;

  if (correct >= logs.length - 1 && relevantRate >= 0.8) return "detective";
  if (faRate > missRate) return "cautious";
  if (missRate > faRate) return "trusting";
  if (avgInspected < 2 || median(logs.map((l) => l.reactionTimeMs)) < QUICK_MS) return "intuitive";
  return "balanced";
}

const QUICK_MS = 15_000; // 初回調査→決定の中央値がこれ未満なら「すばやく決めた」とみなす

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface PlayerProfile {
  detect: number; // 見破る：詐欺を詐欺と判断できた割合
  discern: number; // 見極める：正常を正常と判断できた割合
  compare: number; // 見比べる：判定に必要な情報を両方調べた割合
  patience: number; // じっくり：判定までの時間の中央値（30秒で満点）
  selfReliance: number; // 自力：ヒントを使わずに判定した割合
}

const PATIENCE_FULL_MS = 30_000;

// 結果画面のレーダーチャート用。いずれも 0〜1。6問しかないので値は粗い目安
export function computeProfile(logs: ScenarioLog[]): PlayerProfile {
  if (logs.length === 0) return { detect: 0, discern: 0, compare: 0, patience: 0, selfReliance: 0 };
  const fraud = logs.filter((l) => l.isFraud);
  const safe = logs.filter((l) => !l.isFraud);
  const rate = (arr: ScenarioLog[], f: (l: ScenarioLog) => boolean) => (arr.length ? arr.filter(f).length / arr.length : 0);
  return {
    detect: rate(fraud, (l) => l.correct),
    discern: rate(safe, (l) => l.correct),
    compare: rate(logs, (l) => l.viewedAllRelevant),
    patience: Math.min(1, median(logs.map((l) => l.reactionTimeMs)) / PATIENCE_FULL_MS),
    selfReliance: rate(logs, (l) => !l.hintUsed),
  };
}
