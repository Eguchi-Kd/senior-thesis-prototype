import type { Scenario } from "./types";

// 詐欺・難：一見ポスターの公式URLで始まるが、実体は別ドメイン（サブドメイン偽装）＋不要なログイン要求。
export const scenario4: Scenario = {
  id: 4,
  title: "QRコードの読み取り",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "subdomain_spoof",
    clue: "公式URLで始まるが実際のドメインは別物、かつ本来不要なログインを要求",
  },
  difficulty: "hard",
  objects: [
    {
      id: "poster",
      label: "ポスター",
      position: [-3, 2, -4],
      content: "【学祭2026】\n日時: 11月3日\n公式サイト: aomori-fes.ac.jp\n（詳細はQRコードから。ログイン不要で閲覧できます）",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "system",
        sender: "QRスキャン結果",
        body: "読み取ったページを開きますか？ ログインが求められています。",
        url: "http://aomori-fes.ac.jp.login-check.info/signin",
        timestamp: "現在",
      },
    },
  ],
  isFraud: true,
  explanation:
    "URLは『aomori-fes.ac.jp』で始まるので一見公式に見えますが、実際のドメインは末尾の『login-check.info』です（aomori-fes.ac.jp はその前に付いたサブドメインに過ぎない）。ポスターは『ログイン不要』と明記しているのにログインを要求している点も矛盾。http でもあり、貼り替えQRによる誘導詐欺です。",
  learningPoint: "URLは『どこで始まるか』でなく『末尾のドメイン』で判断します。印刷物の案内（ログイン不要など）と食い違う要求は疑いましょう。",
};
