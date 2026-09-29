import type { TestQuestion } from "./transferTest";

// フォームA（lib/testForms.ts でフォームBと事前/事後にランダム割付＝カウンターバランス）。
// 難易度（易2/中2/難2）と詐欺:安全＝3:3の構成をフォームBと揃え、内容だけ変えて「答えの丸暗記」を防ぐ。
// ※ id の PRE_ 接頭辞は項目の識別子であり、事前/事後どちらで出たかはログの phase を見る。
export const preTestQuestions: TestQuestion[] = [
  {
    id: "PRE_F1",
    title: "警察からの連絡",
    scenario:
      "「警察」を名乗る相手から電話とSMSがあり、「あなたの口座が犯罪に使われている。資産を守るため、指定の『安全な口座』に一度お金を移してほしい」と言われました。",
    isFraud: true,
    difficulty: "medium",
    details: { senderAddress: "非通知／登録外の番号", url: "指定口座への振込を要求" },
    explanation:
      "警察や銀行が『安全な口座に移せ』とお金の移動を求めることはありません。公的機関を名乗って振込を要求するのは、ニセ警察（なりすまし）詐欺です。",
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
    title: "未払い料金の督促",
    scenario:
      "「未払いの料金があります。本日中にお支払いがない場合は法的措置に移行します。至急こちらから手続きを」とSMSが届きました。心当たりはありません。",
    isFraud: true,
    difficulty: "easy",
    details: { senderAddress: "info@ryokin-shiharai.xyz", url: "http://ryokin-shiharai.xyz/pay" },
    explanation:
      "心当たりのない未払い請求で、法的措置をちらつかせて焦らせ、非公式ドメイン（.xyz・http）のリンクへ誘導しています。典型的な架空請求（未払い料金）詐欺です。",
  },
  {
    id: "PRE_S1",
    title: "サブスクの決済完了",
    scenario:
      "動画配信サービスを月額で契約しています。公式アプリから「今月分の決済が完了しました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "easy",
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
  {
    id: "PRE_S3",
    title: "注文した商品の発送通知",
    scenario:
      "昨日、いつも使っている通販サイトで本を注文しました。今日「ご注文の商品を発送しました。配送状況は注文履歴からご確認いただけます」とメールが届き、リンクが付いています。",
    isFraud: false,
    difficulty: "medium",
    details: { senderAddress: "ship-info@netshop.co.jp", url: "https://www.netshop.co.jp/orders" },
    explanation:
      "自分の注文と一致し、送信元もリンク先も同じ正規ドメイン（netshop.co.jp・https）で、ログインや支払い情報の入力も求めていません。リンクがある＝詐欺ではなく、正常な発送通知です。",
  },
];
