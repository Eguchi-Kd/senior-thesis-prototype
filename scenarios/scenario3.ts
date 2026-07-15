export const scenario3 = {
  id: 3,
  title: "架空請求メール",
  description: "部屋を探索して、不審な点を見つけよう",
  anomaly: {
    type: "fake_invoice",
    clue: "領収書では支払い済みなのに、メールには「未払い」と書かれている",
  },
  objects: [
    {
      id: "receipt",
      label: "領収書",
      position: [2, 1.5, -3] as [number, number, number],
      content: "領収書\n\nサービス名: クラウドストレージ Pro\n金額: 980円（税込）\n支払日: 2026年6月1日\nステータス: 支払い済み",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "email",
        sender: "billing@cloudstorage-pro-support.net",
        body: "【未払い通知】クラウドストレージ Pro 6月分（980円）の未払いが確認されました。本日中にお支払いがない場合、アカウントを停止します。→ http://payment-urgent.net/pay",
        timestamp: "15:32",
      },
    },
  ],
  isFraud: true,
  explanation:
    "手元の領収書に「6月1日支払い済み」と記録されているにもかかわらず、メールは「未払い」と主張しています。支払い済みの事実がある場合、このようなメールは架空請求詐欺です。",
  learningPoint: "現実の記録（領収書・通帳）がデジタル通知と矛盾している場合、まず自分の記録を信じて、公式サイトから直接ログインして確認しましょう。",
};
