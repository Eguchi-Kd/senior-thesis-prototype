import { allScenarios } from "./scenarios";
import { PLAYER_TYPES, PLAYER_TYPE_IDS } from "./playerType";
import { scenarioCardId, typeCardId } from "./collection";

export interface CardDef {
  id: string;
  kind: "scenario" | "type";
  emoji: string;
  title: string;
  body: string;
  howToGet: string;
}

// 学習カードの一覧：シナリオ（正解で入手）＋ タイプ（そのタイプになると入手）
export const CARDS: CardDef[] = [
  ...allScenarios.map((s) => ({
    id: scenarioCardId(s.id),
    kind: "scenario" as const,
    emoji: s.isFraud ? "🚨" : "✅",
    title: s.title,
    body: s.learningPoint,
    howToGet: "ゲーム本編でこの問題に正解する",
  })),
  ...PLAYER_TYPE_IDS.map((t) => ({
    id: typeCardId(t),
    kind: "type" as const,
    emoji: PLAYER_TYPES[t].emoji,
    title: PLAYER_TYPES[t].name,
    body: `${PLAYER_TYPES[t].desc} ${PLAYER_TYPES[t].tip}`,
    howToGet: "結果発表でこのタイプと診断される",
  })),
];

export const TOTAL_CARDS = CARDS.length;
