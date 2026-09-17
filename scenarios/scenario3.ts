import type { Scenario } from "./types";

// 詐欺・中：自動更新のはずなのに「カード再入力」を要求。綻びは非公式ドメイン＋認証情報の要求。
export const scenario3: Scenario = {
  id: 3,
  title: "支払い情報の確認メール",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "credential_request",
    clue: "自動更新契約なのにカード再入力を要求、ドメインも公式でない",
  },
  difficulty: "medium",
  objects: [
    {
      id: "receipt",
      label: "領収書",
      position: [2, 1.5, -3],
      content: "領収書\nサービス: 音楽ストリーミング\n月額: 980円\n支払方法: 登録済みクレジット（自動更新）\n次回更新: 7/1",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "email",
        sender: "音楽ストリーミング",
        senderAddress: "billing@musicstream-support.net",
        body: "お支払い情報の確認が必要です。更新を継続するため、お手数ですがカード番号を再度ご入力ください。",
        url: "http://musicstream-support.net/update",
        timestamp: "6/29 11:20",
      },
    },
  ],
  isFraud: true,
  explanation:
    "領収書のとおり支払いは「登録済みクレジットで自動更新」なので、カード番号の再入力は本来不要です（矛盾）。送信元も公式ドメインではなく musicstream-support.net、リンクは http。カード情報を抜き取るフィッシングです。",
  learningPoint: "『自動更新なのに再入力を求める』のは危険信号。正規サービスがメールのリンクからカード情報を再入力させることは通常ありません。",
};
