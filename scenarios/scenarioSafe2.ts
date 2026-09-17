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
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3],
      content: "6/28 銀行アプリのパスワードを変更した",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "email",
        sender: "みずほ銀行",
        senderAddress: "info@mizuhobank.co.jp",
        body: "お客様のログインパスワードが変更されました。お心当たりがない場合はお客様センターまでお電話ください。本メールにご返信いただく必要はありません。",
        timestamp: "6/28 18:42",
      },
    },
  ],
  isFraud: false,
  explanation:
    "「パスワードが変更された」という通知は警戒すべきに見えますが、カレンダーのとおり本人が6/28に変更しており矛盾はありません。送信元は正規ドメイン mizuhobank.co.jp で、リンクや情報入力を求めず、むしろ問い合わせは電話へ案内しています。正常な確認通知です。",
  learningPoint: "セキュリティ通知＝詐欺ではありません。リンクで情報を入力させず、自分の操作と一致し、正規ドメインからであれば正常です。焦らせる文言やリンクの有無が見分けの鍵です。",
};
