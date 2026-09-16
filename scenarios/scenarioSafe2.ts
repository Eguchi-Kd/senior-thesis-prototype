// 安全（非詐欺）シナリオ：領収書とデジタル通知が整合＝正常。
export const scenarioSafe2 = {
  id: 102,
  title: "サブスクの領収通知",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "safe_receipt",
    clue: "領収書の内容と、公式ドメインからの決済完了メールが一致している",
  },
  objects: [
    {
      id: "receipt",
      label: "領収書",
      position: [2, 1.5, -3] as [number, number, number],
      content: "領収書\n\nサービス名: 音楽ストリーミング\n金額: 1,080円（税込）\n支払日: 2026年6月1日\nステータス: 支払い済み",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "email",
        sender: "receipt@music-stream.co.jp",
        body: "お支払いありがとうございます。音楽ストリーミング 6月分（1,080円）の決済が完了しました。ご利用明細は公式アプリからご確認いただけます。",
        timestamp: "09:15",
      },
    },
  ],
  isFraud: false,
  explanation:
    "手元の領収書（6月1日・1,080円・支払い済み）とメールの内容・金額が一致しています。送信元も公式ドメイン（music-stream.co.jp）で、外部リンクや支払い要求もありません。これは正常な決済完了通知です。",
  learningPoint: "内容が現実の記録と一致し、金額・日付に矛盾がなく、緊急の支払い要求や不審なリンクがなければ正常です。焦らせる文言がないことも手がかりになります。",
};
