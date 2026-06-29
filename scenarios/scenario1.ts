export const scenario1 = {
  id: 1,
  title: "不在着信SMS",
  description: "部屋を探索して、不審な点を見つけよう",
  anomaly: {
    type: "sms_phishing",
    clue: "カレンダーの予定と、SMSの発信者情報が矛盾している",
  },
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3] as [number, number, number],
      content: "6/29（日）終日 → 自宅待機・外出なし",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "sms",
        sender: "ヤマト運輸",
        body: "本日14:00に不在のため、荷物を持ち帰りました。再配達はこちら→ http://yamato-tracking.xyz/redelivery",
        timestamp: "14:23",
      },
    },
  ],
  isFraud: true,
  explanation:
    "カレンダーでは「終日自宅待機」なのに、SMSには「不在のため持ち帰り」と書かれています。URLも公式ドメイン（kuronekoyamato.co.jp）ではありません。これはフィッシング詐欺SMSです。",
  learningPoint: "現実の状況（自宅にいた）とデジタル情報の矛盾を見つけることが、詐欺を見抜く鍵です。",
};
