import type { Scenario } from "./types";

// 詐欺・難：本当に注文を待っている（身に覚えあり）状況に便乗。綻びは「日付の矛盾」と「サブドメイン偽装」。
export const scenario2: Scenario = {
  id: 2,
  title: "再配達のお願い",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "lookalike_domain",
    clue: "注文は事実だが、配送予定日より前の不在通知＋ドメインがサブドメイン偽装",
  },
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3],
      content: "6/28 Amazonで注文（お届け予定：6/30）",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "sms",
        sender: "Amazon",
        senderAddress: "info@amazon-jp.delivery-support.com",
        body: "お荷物のお届けにあがりましたがご不在でした。24時間以内に再配達のお手続きをお願いします。",
        url: "http://amazon-jp.delivery-support.com/redelivery",
        timestamp: "6/29 15:10",
      },
    },
  ],
  isFraud: true,
  explanation:
    "注文自体は本物ですが、お届け予定は6/30なのに6/29に「不在通知」が来ています（日付の矛盾）。さらにドメインは amazon.co.jp ではなく『delivery-support.com』で、amazon-jp はその一部（サブドメイン偽装）に過ぎません。http・24時間以内という煽りも典型的な詐欺です。",
  learningPoint: "本当に待っている荷物でも油断は禁物。ドメインは末尾（例: delivery-support.com）で正体を見分け、日付のつじつまが合うかも確認しましょう。",
};
