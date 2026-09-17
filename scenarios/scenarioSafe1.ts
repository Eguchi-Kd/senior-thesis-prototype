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
  difficulty: "medium",
  objects: [
    {
      id: "receipt",
      label: "メモ",
      position: [2, 1.5, -3],
      content: "6/29 新しいノートPC（Windows）をセットアップした",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "app",
        sender: "Google",
        senderAddress: "no-reply@accounts.google.com",
        body: "新しいWindows端末からのログインがありました。心当たりがない場合のみご確認ください。",
        url: "https://myaccount.google.com/notifications",
        timestamp: "6/29 20:03",
      },
    },
  ],
  isFraud: false,
  explanation:
    "「心当たりのないログイン」に見えますが、メモのとおり本人が今日新しいPCを設定しており矛盾はありません。送信元は正規ドメイン accounts.google.com、リンクも https の公式ページで、パスワードや個人情報の入力も求めていません。正常な通知です。",
  learningPoint: "ログイン警告＝詐欺ではありません。自分の行動と一致するか、送信元が正規ドメイン・httpsか、情報入力を迫っていないかで正常と判断できます。過剰な警戒は日常を不便にします。",
};
