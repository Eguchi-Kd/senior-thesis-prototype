import type { Scenario } from "./types";

// 詐欺・難：なりすまし（家族/ニセ警察系）。カレンダーで家族は海外なのに、
// 国内での事故を理由に緊急の振込を要求＋「誰にも言うな」で急かす典型手口。
export const scenario2: Scenario = {
  id: 2,
  title: "家族からの緊急連絡",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "impersonation",
    clue: "カレンダーでは兄は海外赴任中なのに、国内で事故に遭ったと国内口座への振込を求めている",
  },
  difficulty: "hard",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      position: [2, 1.5, -3],
      content: "今月の予定\n・兄は海外赴任中（〜来月まで帰国なし）\n・6/29 自分は在宅",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2],
      content: {
        type: "sms",
        sender: "兄",
        senderAddress: "090-XXXX-XXXX（登録外の番号）",
        body: "事故を起こして示談金がすぐ必要になった。下の口座に30万円振り込んで。会社にも警察にも家族にも言わないで、今すぐお願い。",
        timestamp: "6/29 19:40",
        url: "振込先: △△銀行 ○○支店 普通 1234567",
      },
    },
  ],
  isFraud: true,
  explanation:
    "カレンダーのとおり兄は海外赴任中で、国内で事故に遭うことはありません（矛盾）。さらに登録外の番号から、緊急の振込と『誰にも言うな』という口止めで急かすのは、なりすまし（オレオレ／ニセ警察）詐欺の典型です。",
  learningPoint: "『今すぐ』『誰にも言うな』と急かし、確認をさせないのが なりすまし詐欺の常套手段。相手の状況（海外にいるはず等）と食い違わないか、本人に別の手段で必ず確認しましょう。",
};
