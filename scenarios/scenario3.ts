import type { Scenario } from "./types";

// 詐欺・中：サポート詐欺／偽警告。契約していないセキュリティソフトの感染警告が出て、
// 至急サポート番号へ電話をかけさせようとする（公式は電話をかけさせない）。
export const scenario3: Scenario = {
  id: 3,
  title: "ウイルス感染の警告",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "tech_support_scam",
    clue: "契約していないセキュリティソフトの感染警告が出て、電話をかけさせようとしている",
  },
  hint: "パソコンやソフトの契約について書かれたものと、スマホに表示された内容を見比べてみよう。",
  relevantIds: ["receipt", "smartphone"],
  difficulty: "medium",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "7月の予定\n・7/8（火）バイト 17:00〜21:00\n・7/10（木）ゼミ発表\n・7/12（土）実家に帰る",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "PCメモ\n・セキュリティソフトは特に契約していない（OS標準の保護のみ）\n・Wi-Fiのパスワードはルーターの裏\n・プリンタのインク残りわずか",
    },
    {
      id: "poster",
      label: "ポスター",
      content: "ASAMUSHI SUMMER LIVE 2026\n7月20日（日）開場 17:00\n会場：浅虫海岸特設ステージ",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      content: [
        {
          type: "app",
          sender: "ニュースアプリ",
          body: "【速報】青森県内で今年初の真夏日を観測",
          timestamp: "7/9 13:05",
        },
        {
          type: "system",
          sender: "セキュリティ警告（ポップアップ）",
          body: "【警告】ウイルスに感染しました！個人情報が危険です。今すぐサポートへお電話ください。操作を続けると被害が拡大します。",
          url: "サポート窓口: 0120-000-000 に今すぐ発信",
          timestamp: "現在",
        },
        {
          type: "app",
          sender: "バイト先（LINE）",
          body: "明日のシフト、17時からでお願いします！",
          timestamp: "7/9 11:30",
        },
      ],
    },
  ],
  isFraud: true,
  explanation:
    "メモのとおりセキュリティソフトは契約していないのに、その感染警告が出ています（矛盾）。恐怖をあおって『今すぐ電話』させ、遠隔操作や有償契約に誘導するのはサポート詐欺（偽警告）の典型です。正規のOSやソフトが警告から電話を求めることはありません。",
  learningPoint: "『ウイルス感染！今すぐ電話』の警告は偽物を疑いましょう。契約している製品か・公式が電話を求めるかを確認し、警告画面の番号には決してかけないことが大切です。",
};
