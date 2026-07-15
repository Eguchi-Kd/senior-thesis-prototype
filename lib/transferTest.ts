export interface TransferQuestion {
  id: string;
  title: string;
  scenario: string;
  isFraud: boolean;
  explanation: string;
}

export const transferTestQuestions: TransferQuestion[] = [
  {
    id: "T1",
    title: "当選通知メール",
    scenario:
      "メールに「おめでとうございます！あなたはキャンペーンに当選しました。賞金100万円を受け取るには今すぐ手続きを → http://prize-claim.xyz」と届きました。あなたはこのキャンペーンに応募した記憶はありません。",
    isFraud: true,
    explanation:
      "応募していないキャンペーンの当選通知は詐欺です。「応募した記憶がない（現実）」と「当選した（デジタル）」の矛盾を見抜くことが重要です。",
  },
  {
    id: "T2",
    title: "家族からの緊急LINE",
    scenario:
      "カレンダーには「兄 → 海外出張中 7/1〜7/10」とメモがあります。LINEに「弟だけど事故にあって警察に保護金が必要。今すぐ3万円振り込んで」とメッセージが届きました。",
    isFraud: true,
    explanation:
      "カレンダーの記録（兄は海外出張中）と、国内で事故に遭ったというLINEの内容が矛盾しています。これはなりすまし詐欺（オレオレ詐欺）のパターンです。",
  },
  {
    id: "T3",
    title: "アプリ更新通知",
    scenario:
      "スマートフォンに「銀行アプリの重要なセキュリティ更新があります。今すぐダウンロード → http://mybank-update.net/app」という通知が届きました。公式アプリストア（App Store / Google Play）には新しい更新は表示されていません。",
    isFraud: true,
    explanation:
      "公式アプリストアに更新が出ていないのに外部リンクからダウンロードを促す通知は偽物です。現実（ストアの状態）とデジタル通知の矛盾です。",
  },
];
