import type { Scenario } from "./types";

// 安全・難：「パスワード変更の通知」で一見警戒すべきだが、自分で変更した事実と一致＋正規ドメイン＋リンク/入力要求なし。
// 「セキュリティ警告＝詐欺」というヒューリスティックを壊す。
export const scenarioSafe2: Scenario = {
  id: 102,
  title: "パスワード変更のお知らせ",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "safe_security_notice",
    clue: "セキュリティ通知だが本人の操作と一致し、リンクも情報要求もない",
  },
  hint: "カレンダーの予定と、スマホに届いたメールを見比べてみよう。リンクや入力の要求があるかにも注目。",
  relevantIds: ["calendar", "smartphone"],
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "6月の予定\n・6/27（金）歯医者 18:00\n・6/28（土）銀行アプリのパスワードを変更した\n・6/29（日）バイト 10:00〜15:00",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "買い物メモ\n・トイレットペーパー\n・コーヒー豆\n・ノート（B5）",
    },
    {
      id: "poster",
      label: "ポスター",
      content: "映画『星降る港』\n7月18日 全国ロードショー",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      content: [
        {
          type: "app",
          sender: "バイト先（LINE）",
          body: "明日のシフト、10時からでお願いします！",
          timestamp: "6/28 20:15",
        },
        {
          type: "email",
          sender: "みずほ銀行",
          senderAddress: "info@mizuhobank.co.jp",
          body: "お客様のログインパスワードが変更されました。お心当たりがない場合はお客様センターまでお電話ください。本メールにご返信いただく必要はありません。",
          timestamp: "6/28 18:42",
        },
        {
          type: "app",
          sender: "天気アプリ",
          body: "明日は晴れ。熱中症に注意しましょう。",
          timestamp: "6/28 17:00",
        },
      ],
    },
  ],
  isFraud: false,
  explanation:
    "「パスワードが変更された」という通知は警戒すべきに見えますが、カレンダーのとおり本人が6/28に変更しており矛盾はありません。送信元は正規ドメイン mizuhobank.co.jp で、リンクや情報入力を求めず、むしろ問い合わせは電話へ案内しています。ほかの通知にも不審な点はなく、正常です。",
  learningPoint: "セキュリティ通知＝詐欺ではありません。リンクで情報を入力させず、自分の操作と一致し、正規ドメインからであれば正常です。焦らせる文言やリンクの有無が見分けの鍵です。",
};
