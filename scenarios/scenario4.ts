import type { Scenario } from "./types";

// 詐欺・難：QRで開いたページのサイト名が、公式サイト名を先頭に含む別ドメイン（https でも詐欺の例）。
// ポスターの「ログイン不要」とも食い違う。
export const scenario4: Scenario = {
  id: 4,
  title: "QRコードの読み取り",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "subdomain_spoof",
    clue: "サイト名の右端が login-check.info でポスターの公式サイト aomori-fes.ac.jp と違い、不要なはずのログインを求めている",
  },
  hint: "ポスターの公式サイトと、開いたページのサイト名（「//」の後〜最初の「/」）を比べよう。ログインが必要かどうかも確認。",
  relevantIds: ["poster", "smartphone"],
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "11月の予定（2026年）\n・11/3（火・祝）学祭に行く（友人と10時に正門）\n・11/5（木）レポート締切\n・11/8（日）バイト",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "学祭メモ\n・模擬店の割引券を持っていく\n・現金を多めに\n・モバイルバッテリー",
    },
    {
      id: "poster",
      label: "ポスター",
      content: "【学祭2026】\n日時: 11月3日\n公式サイト: aomori-fes.ac.jp\n（詳細はQRコードから。ログイン不要で閲覧できます）",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      content: [
        {
          type: "app",
          sender: "友人（LINE）",
          body: "明日10時に正門ね！",
          timestamp: "11/2 21:40",
        },
        {
          type: "app",
          sender: "天気アプリ",
          body: "11/3 は晴れ。最高気温 14℃ の予報です。",
          timestamp: "11/2 20:00",
        },
        {
          type: "system",
          sender: "QRコードで開いたページ",
          body: "ポスターのQRコードを読み取ってページを開いたら、「続きを見るにはログインしてください」と表示された。",
          url: "https://aomori-fes.ac.jp.login-check.info/signin",
          timestamp: "現在",
        },
      ],
    },
  ],
  isFraud: true,
  explanation:
    "URLの「//」の後から最初の「/」まで（aomori-fes.ac.jp.login-check.info）がサイト名です。このサイトを登録しているのは右端の「login-check.info」の部分で、先頭の「aomori-fes.ac.jp」はその前に付けた飾りにすぎません。ポスターの公式サイト（aomori-fes.ac.jp）とは別のサイトです。また、ポスターには「ログイン不要」とあるのに、ログインを求めています。https で始まっていても安全とは限りません。偽サイトへ誘導するQRコードと判断できます。",
  learningPoint: "サイト名（「//」の後〜最初の「/」）の右端が、公式として確認したドメインと同じかを見ます。QRコードで開いたページでは、何かを入力する前にポスターなどの公式情報と見比べ、食い違えば公式サイトを自分で検索して開きましょう。",
  cardEmoji: "📷",
  keyPoints: {
    basis: "サイト名の右端が login-check.info で、ポスターの公式サイト aomori-fes.ac.jp と違う。不要なはずのログインも求めている",
    compared: "ポスターの公式サイトと注意書き ↔ 開いたページのURLと要求",
    action: "何も入力せずに閉じ、公式サイトを自分で検索して開く",
  },
};
