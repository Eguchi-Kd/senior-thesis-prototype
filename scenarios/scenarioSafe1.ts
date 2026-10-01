import type { Scenario } from "./types";

// 安全・中：一見「心当たりのないログイン警告」で不審に見えるが、メモの行動（その時刻に自分で新しいPCからログイン）と一致。
// 「身に覚えがない＝詐欺」というヒューリスティックを壊す。
export const scenarioSafe1: Scenario = {
  id: 101,
  title: "新しい端末からのログイン",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "safe_login_alert",
    clue: "メモの『6/29 20時ごろ新しいWindowsのPCで自分のGoogleアカウントにログイン』と、通知の内容・時刻が一致し、入力も求めていない",
  },
  hint: "最近の自分の行動が書かれたものと、スマホに届いた通知（内容・時刻・送信元）を見比べよう。",
  relevantIds: ["receipt", "smartphone"],
  difficulty: "medium",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "6月の予定（2026年）\n・6/25（木）ゼミ\n・6/27（土）バイト 10:00〜15:00\n・7/1（水）サークルの飲み会",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "PCメモ\n・6/29 20時ごろ、新しいWindowsのPCで自分のGoogleアカウントにログインした\n・古いPCからデータを移す\n・プリンタのドライバを入れる",
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
          body: "週末、帰ってくる？",
          timestamp: "6/29 18:05",
        },
      ],
    },
  ],
  isFraud: false,
  explanation:
    "メモには、6/29 20時ごろに新しいWindowsのPCで自分のGoogleアカウントにログインしたとあり、20:03に届いた「新しいWindows端末からのログイン」の通知と内容も時刻も一致します。送信元もリンク先もサイト名の右端は google.com で、パスワードなどの入力も求めていません。ほかの通知にも不審な点はありません。この事例では、自分の行動と一致し不審な要求もないので、正常と判断できます。",
  learningPoint: "ログインの通知＝詐欺ではありません。まず自分の行動と一致するかを確かめましょう。送信元の表示や https だけでは本物の保証にならないので、不安なときは通知のリンクではなく、公式アプリや自分で開いたアカウント画面でログイン履歴を確認します。",
  cardEmoji: "💻",
  keyPoints: {
    basis: "6/29 20時ごろ自分で新しいPCからログインした事実と、通知の内容・時刻が一致し、入力も求めていない",
    compared: "PCメモ（自分の行動）↔ ログイン通知の内容・時刻・送信元",
    action: "不安なら通知のリンクではなく、公式アプリや自分で開いた画面でログイン履歴を確認する",
  },
};
