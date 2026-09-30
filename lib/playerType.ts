import type { ScenarioLog } from "@/store/gameStore";

export type PlayerTypeId = "detective" | "cautious" | "trusting" | "intuitive" | "balanced";

export const PLAYER_TYPES: Record<PlayerTypeId, { name: string; emoji: string; desc: string; tip: string }> = {
  detective: {
    name: "名探偵タイプ",
    emoji: "🕵️",
    desc: "部屋の情報とスマホをしっかり見比べて、ほとんどの問題を見破りました。",
    tip: "その「見比べる習慣」を実生活でも。迷ったら公式アプリや登録済みの連絡先で確かめよう。",
  },
  cautious: {
    name: "慎重派タイプ",
    emoji: "🛡️",
    desc: "怪しいものを見逃さない用心深さの持ち主。ただ、正常な通知まで疑ってしまうことも。",
    tip: "疑ったら終わりではなく、自分の行動や公式情報と一致するかを確かめると、正常な通知も安心して扱えます。",
  },
  trusting: {
    name: "お人よしタイプ",
    emoji: "🤝",
    desc: "人や通知を信じられるやさしさの持ち主。そのぶん、巧妙な詐欺にだまされやすい面も。",
    tip: "「急がせる」「口止めする」「いつもと違う」がそろったら一度立ち止まり、別の手段で確認しよう。",
  },
  intuitive: {
    name: "直感派タイプ",
    emoji: "⚡",
    desc: "決断の早さが持ち味。ただ、部屋の情報とじっくり見比べる前に決めてしまうことがありました。",
    tip: "スマホの通知だけでなく、予定やメモなど手元の情報と照らし合わせると、直感がもっと当たるようになります。",
  },
  balanced: {
    name: "バランスタイプ",
    emoji: "⚖️",
    desc: "疑いすぎず信じすぎず、バランスよく判断できています。",
    tip: "送信元のドメインの読み方など、細かな手がかりを押さえると名探偵に近づけます。",
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
