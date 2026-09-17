import type { Scenario } from "./types";

// 詐欺・易：在宅の事実と不在通知の矛盾＋非公式ドメイン。手がかりが2つあり比較的わかりやすい。
export const scenario1: Scenario = {
  id: 1,
  title: "不在通知SMS",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "sms_phishing",
    clue: "在宅だった事実と不在通知の矛盾、および送信元ドメインが公式でない",
  },
  difficulty: "easy",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3],
      content: "6/29（日）一日中 在宅（外出の予定なし）",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "sms",
        sender: "佐川急便",
        senderAddress: "sagawa@sagawa-saihai.info",
        body: "本日お届けにあがりましたがご不在でした。再配達のお申し込みはこちらから。",
        url: "http://sagawa-saihai.info/redelivery",
        timestamp: "6/29 15:00",
      },
    },
  ],
  isFraud: true,
  explanation:
    "カレンダーでは「一日中在宅」なのに不在通知が来ています（矛盾）。さらに送信元ドメインは公式（sagawa-exp.co.jp）ではなく sagawa-saihai.info、リンクも http で始まる非暗号化です。フィッシングSMSです。",
  learningPoint: "『在宅していた』という現実と矛盾する通知は要注意。送信元アドレスとURLのドメインが公式かどうかも必ず確認しましょう。",
};
