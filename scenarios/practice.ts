import type { Scenario } from "./types";

// 操作練習用（分析対象外・正誤なし）。詐欺の手がかりを含めず、操作の確認だけを行う。
export const practiceScenario: Scenario = {
  id: 0,
  title: "操作練習",
  description: "操作に慣れよう",
  anomaly: { type: "practice", clue: "" },
  hint: "本番では、ここに「どこを見比べるとよいか」のヒントが表示されます。",
  relevantIds: [],
  difficulty: "easy",
  objects: [
    { id: "calendar", label: "カレンダー", content: "練習中！\n本番では、ここに予定が書かれています。" },
    { id: "receipt", label: "メモ", content: "練習中！\n本番では、ここにメモが貼られています。" },
    { id: "poster", label: "ポスター", content: "練習中！\n本番では、ここにポスターの案内が書かれています。" },
    {
      id: "smartphone",
      label: "スマートフォン",
      content: [
        {
          type: "app",
          sender: "練習メッセージ",
          body: "本番では、ここにスマホに届いた通知が並びます。部屋の情報と見比べて、詐欺かどうかを見破ろう！",
          timestamp: "いま",
        },
      ],
    },
  ],
  isFraud: false,
  explanation: "",
  learningPoint: "",
};
