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
  hint: "カレンダーの予定と、スマホに届いた通知の内容を見比べてみよう。送信元のアドレスやリンク先にも注目。",
  relevantIds: ["calendar", "smartphone"],
  difficulty: "easy",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "6月の予定\n・6/27（金）企画書の締切\n・6/28（土）友人とランチ 12:00\n・6/29（日）一日中 在宅（外出の予定なし）\n・7/1（火）歯医者 18:30",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "買い物メモ\n・牛乳\n・洗濯用洗剤\n・単3電池",
    },
    {
      id: "poster",
      label: "ポスター",
      content: "青森ねぶた祭 2026\n8月2日〜7日\n会場：青森市中心部",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      content: [
        {
          type: "sms",
          sender: "佐川急便",
          senderAddress: "sagawa@sagawa-saihai.info",
          body: "本日お届けにあがりましたがご不在でした。再配達のお申し込みはこちらから。",
          url: "http://sagawa-saihai.info/redelivery",
          timestamp: "6/29 15:00",
        },
        {
          type: "app",
          sender: "母（LINE）",
          body: "明日の夜ご飯、いる？",
          timestamp: "6/29 12:10",
        },
        {
          type: "app",
          sender: "天気アプリ",
          body: "明日は午後から雨の予報です。傘をお忘れなく。",
          timestamp: "6/29 07:00",
        },
      ],
    },
  ],
  isFraud: true,
  explanation:
    "カレンダーでは「一日中在宅」なのに不在通知が来ています（矛盾）。さらに送信元ドメインは公式（sagawa-exp.co.jp）ではなく sagawa-saihai.info、リンクも http で始まる非暗号化です。フィッシングSMSです。",
  learningPoint: "『在宅していた』という現実と矛盾する通知は要注意。送信元アドレスとURLのドメインが公式かどうかも必ず確認しましょう。",
};
