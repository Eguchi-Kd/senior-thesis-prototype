import type { Scenario } from "./types";

// 詐欺・易：配送会社を名乗る不在通知。メモにある公式サイト（ブックマーク済み）と、通知のサイトが一致しない。
// 在宅予定は補助情報（在宅でも不在扱いはあり得るので、それだけで決めつけない）。
export const scenario1: Scenario = {
  id: 1,
  title: "不在通知SMS",
  description: "部屋を探索して、状況を確認しよう",
  anomaly: {
    type: "sms_phishing",
    clue: "通知のサイト（hayabusa-saihai.info）がメモにある公式サイト（hayabusa-unyu.co.jp）と一致しない。在宅予定との食い違いは補助",
  },
  hint: "メモにある公式サイトと、通知の送信元・リンク先のサイト名（「//」の後〜最初の「/」）を見比べよう。カレンダーの予定も参考に。",
  relevantIds: ["receipt", "smartphone"],
  difficulty: "easy",
  objects: [
    {
      id: "calendar",
      label: "カレンダー",
      content: "6月の予定（2026年）\n・6/27（土）友人とランチ 12:00\n・6/28（日）買い物\n・6/29（月）在宅勤務（一日中家にいる）\n・7/1（水）歯医者 18:30",
    },
    {
      id: "receipt",
      label: "メモ",
      content: "メモ\n・ブックマークしている公式サイト\n　はやぶさ運輸：hayabusa-unyu.co.jp\n　つばめ便：tsubame-bin.co.jp\n・買うもの：牛乳、洗濯用洗剤",
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
          type: "sms",
          sender: "はやぶさ運輸",
          senderAddress: "info@hayabusa-saihai.info",
          body: "本日お届けにあがりましたがご不在でした。再配達のお申し込みはこちらから。",
          url: "http://hayabusa-saihai.info/redelivery",
          timestamp: "6/29 15:00",
        },
        {
          type: "app",
          sender: "母（LINE）",
          body: "明日の夜ご飯、いる？",
          timestamp: "6/29 12:10",
        },
        {
          type: "app",
          sender: "天気アプリ",
          body: "明日は午後から雨の予報です。傘をお忘れなく。",
          timestamp: "6/29 07:00",
        },
      ],
    },
  ],
  isFraud: true,
  explanation:
    "メモには、ブックマークしてあるはやぶさ運輸の公式サイト「hayabusa-unyu.co.jp」があります。通知ははやぶさ運輸を名乗っていますが、送信元もリンク先も「hayabusa-saihai.info」で、公式サイトと一致しません。さらに、カレンダーでは一日中家にいる予定なのに「不在でした」と届いています（インターホンに気づかなかった可能性もあるので、これだけで決めつけることはできません）。公式と一致しないサイトへ誘導していることが決め手となり、詐欺（フィッシングSMS）と判断できます。",
  learningPoint: "不在通知が気になったら、SMSのリンクは開かず、ブックマークや自分で入れた公式アプリから配達状況を確かめましょう。送信元の名前は簡単に偽れるので、名前ではなくサイト名（ドメイン）が公式と一致するかを見ることが大切です。",
  keyPoints: {
    basis: "通知のサイト（hayabusa-saihai.info）が、メモにある公式サイト（hayabusa-unyu.co.jp）と一致しない",
    compared: "メモの公式サイト ↔ 通知の送信元・リンク先（補助：カレンダーの在宅予定）",
    action: "SMSのリンクは開かず、ブックマークや公式アプリから配達状況を確かめる",
  },
};
