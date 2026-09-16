import type { TestQuestion } from "./transferTest";

// 事前（ベースライン）テスト：事後（転移）テストと並行フォーム。
// 難易度（易/中/難）と詐欺:安全＝3:2の構成を事後と揃え、内容だけ変えて「答えの丸暗記」を防ぐ。
export const preTestQuestions: TestQuestion[] = [
  {
    id: "PRE_F1",
    title: "宅配便の再配達",
    scenario:
      "フリマアプリで買った品物の到着を待っています。「ご不在のため持ち帰りました。再配達のお申し込みはこちら」とSMSが来ました。",
    isFraud: true,
    difficulty: "medium",
    details: { senderAddress: "sagawa@sagawa-redelivery.info", url: "http://sagawa-redelivery.info/re", date: "配送予定日の前日" },
    explanation:
      "荷物待ちは事実でも、送信元は公式（sagawa-exp.co.jp）ではなく sagawa-redelivery.info、URLも http です。文脈が本物でもドメインで詐欺と分かります。",
  },
  {
    id: "PRE_F2",
    title: "アカウントの確認",
    scenario:
      "通販サイトを名乗るメールで「アカウントに異常なアクセスがありました。確認しないと利用停止になります」とあり、確認リンクが載っています。",
    isFraud: true,
    difficulty: "hard",
    details: { senderAddress: "support@amazon-alert.com", url: "https://amazon.co.jp.account-verify.info/login" },
    explanation:
      "URLは『amazon.co.jp』で始まりますが、実際のドメインは末尾の『account-verify.info』です（サブドメイン偽装）。ドメインは末尾で判断します。",
  },
  {
    id: "PRE_F3",
    title: "還付金のお知らせ",
    scenario:
      "「税金の還付金があります。受け取り手続きは本日中にこちらから」とSMSが届きました。申請した覚えはありません。",
    isFraud: true,
    difficulty: "easy",
    details: { senderAddress: "info@refund-go.xyz", url: "http://refund-go.xyz/apply" },
    explanation:
      "申請した覚えのない還付通知で、ドメインも .xyz の非公式、http です。行政がSMSのリンクで手続きを求めることは通常ありません。",
  },
  {
    id: "PRE_S1",
    title: "サブスクの決済完了",
    scenario:
      "動画配信サービスを月額で契約しています。公式アプリから「今月分の決済が完了しました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "medium",
    details: { senderAddress: "receipt@video-service.co.jp" },
    explanation:
      "契約している事実と一致し、正規ドメインからで、リンクや情報入力を求めていません。正常な決済通知です。",
  },
  {
    id: "PRE_S2",
    title: "ログイン用の確認コード",
    scenario:
      "自分でメールにログインしようとした直後に「確認コード: 428915（他人には教えないでください）」というメッセージが届きました。ちょうどログイン画面でコード入力を求められています。",
    isFraud: false,
    difficulty: "hard",
    details: { senderAddress: "no-reply@mail-service.co.jp" },
    explanation:
      "自分のログイン操作と一致して届いた二段階認証コードで、正規ドメインから、コードを外部に入力させるリンクもありません。正常な認証コードです。",
  },
];
