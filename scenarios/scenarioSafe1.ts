// 安全（非詐欺）シナリオ：現実情報とデジタル情報が矛盾しない＝正常。
// 「報告」すると誤警報(False Alarm)として記録され、過剰警戒の測定に使う。
export const scenarioSafe1 = {
  id: 101,
  title: "再配達のお知らせ",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "safe_delivery",
    clue: "カレンダーの外出予定と、正規ドメインからの不在通知が整合している",
  },
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3] as [number, number, number],
      content: "6/29（日）13:00-16:00 → 買い物で外出",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "sms",
        sender: "クロネコヤマト",
        body: "ご不在のため荷物を持ち帰りました。再配達のお申し込みはこちら → https://www.kuronekoyamato.co.jp/redelivery",
        timestamp: "14:23",
      },
    },
  ],
  isFraud: false,
  explanation:
    "カレンダーでは「13:00-16:00 外出」となっており、不在だった事実と通知が一致しています。送信元・URLも公式ドメイン（kuronekoyamato.co.jp）で、httpsも正しい。これは正常な再配達通知です。",
  learningPoint: "すべての通知を疑う必要はありません。現実の状況と整合し、公式ドメイン・httpsが確認できれば正常と判断できます。過剰な警戒は日常を不便にします。",
};
