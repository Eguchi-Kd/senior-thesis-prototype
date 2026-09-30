import type { Scenario } from "./types";

// 安全・中：一見「心当たりのないログイン警告」で不審に見えるが、メモと一致（本人）＋正規ドメイン＋https。
// 「身に覚えがない＝詐欺」というヒューリスティックを壊す。
export const scenarioSafe1: Scenario = {
  id: 101,
  title: "新しい端末からのログイン",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "safe_login_alert",
    clue: "一見不審なログイン警告だが、メモの行動と一致し送信元も正規",
  },
  hint: "最近の自分の行動が書かれたものと、スマホに届いた通知を見比べてみよう。送信元のアドレスにも注目。",
  relevantIds: ["receipt", "smartphone"],
  difficulty: "medium",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "6月の予定\n・6/26（木）ゼミ\n・6/28（土）バイト 10:00〜15:00\n・7/2（水）サークルの飲み会",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "PCメモ\n・6/29 新しいノートPC（Windows）をセットアップした\n・古いPCからデータを移す\n・プリンタのドライバを入れる",
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
          type: "app",
          sender: "Google",
          senderAddress: "no-reply@accounts.google.com",
          body: "新しいWindows端末からのログインがありました。心当たりがない場合のみご確認ください。",
          url: "https://myaccount.google.com/notifications",
          timestamp: "6/29 20:03",
        },
        {
          type: "app",
          sender: "YouTube",
          body: "登録チャンネルが新しい動画を公開しました。",
          timestamp: "6/29 19:30",
        },
        {
          type: "app",
          sender: "母（LINE）",
          body: "新しいパソコン、ちゃんと動いた？",
          timestamp: "6/29 18:05",
        },
      ],
    },
  ],
  isFraud: false,
  explanation:
    "メモには、今日新しいWindowsのノートPCをセットアップしたとあり、通知の「新しいWindows端末からのログイン」と一致します。送信元もリンク先もホスト名の右端は google.com で、パスワードなどの入力も求めていません。ほかの通知にも不審な点はありません。この事例では、自分の行動と一致し不審な要求もないので、正常と判断できます。",
  learningPoint: "ログインの通知＝詐欺ではありません。まず自分の行動と一致するかを確かめましょう。送信元の表示やhttpsだけでは本物の保証にならないので、不安なときは通知のリンクではなく、公式アプリや自分で開いたアカウント画面でログイン履歴を確認します。",
};
