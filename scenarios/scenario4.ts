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
  hint: "ポスターに書かれた案内と、QRコードを読み取った結果を見比べてみよう。URLの末尾にも注目。",
  relevantIds: ["poster", "smartphone"],
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "11月の予定\n・11/3（火・祝）学祭に行く（友人と10時に正門）\n・11/5（木）レポート締切\n・11/8（日）バイト",
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
          sender: "QRスキャン結果",
          body: "読み取ったページを開きますか？ ログインが求められています。",
          url: "http://aomori-fes.ac.jp.login-check.info/signin",
          timestamp: "現在",
        },
      ],
    },
  ],
  isFraud: true,
  explanation:
    "URLの「//」の後から最初の「/」までがホスト名で、今回は「aomori-fes.ac.jp.login-check.info」です。本当の持ち主はホスト名の右端の「login-check.info」で、先頭の「aomori-fes.ac.jp」は飾りにすぎません。ポスターの公式サイト（aomori-fes.ac.jp）と一致せず、ポスターには「ログイン不要」とあるのにログインを求めている点も食い違います。貼り替えられたQRコードによるフィッシングと判断できます。",
  learningPoint: "URLの持ち主は、ホスト名（「//」の後から最初の「/」まで）の右端で確かめます。QRコードを読んだら、開く前にURLをポスターなどの公式情報と見比べ、食い違えば公式サイトを自分で検索して開きましょう。",
};
