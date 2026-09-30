import type { Difficulty } from "@/scenarios/types";

export interface TestDetails {
  senderAddress?: string;
  url?: string;
  date?: string;
  officialInfo?: string; // 正規かどうかを判断するための公式情報（例：会員登録時に確認した公式ドメイン）
}

export interface TestQuestion {
  id: string;
  title: string;
  scenario: string;
  isFraud: boolean;
  difficulty: Difficulty;
  details?: TestDetails; // 精査対象の手がかり（送信元/URL/日付/公式情報）をQuizRunnerで明示表示
  explanation: string;
}

// フォームB（lib/testForms.ts でフォームAと事前/事後にランダム割付＝カウンターバランス）。
// 詐欺3＋安全3、難易度は易2/中2/難2。「身に覚え」だけでは解けないよう、身に覚えのある詐欺／一見不審な正常を混在させる。
// ※ id の POST_ 接頭辞は項目の識別子であり、事前/事後どちらで出たかはログの phase を見る。
// 解説の方針はフォームAと同じ（単一の表面的特徴を安全の保証にしない）。
export const transferTestQuestions: TestQuestion[] = [
  {
    id: "POST_F1",
    title: "家族を名乗るメッセージ",
    scenario:
      "「携帯を壊して番号が変わった」とSMSが来て、続けて「急な支払いが必要だから、このあと送る口座に立て替えておいて」と家族を名乗って頼まれました。",
    isFraud: true,
    difficulty: "medium",
    details: { senderAddress: "登録外の新しい番号", url: "指定口座への立替振込を要求" },
    explanation:
      "「番号が変わった」と新しい連絡先を信じ込ませ、本人かどうか確かめさせないまま、お金を立て替えさせようとしています。なりすまし詐欺の典型です。家族を名乗る連絡でお金を求められたら、連絡先に登録済みの元の番号にかけて、本人に直接確かめましょう。",
  },
  {
    id: "POST_F2",
    title: "銀行からのログイン確認",
    scenario:
      "銀行を名乗るメールで「不正アクセスの可能性があります。至急ご確認ください」とあり、確認用リンクが記載されています。",
    isFraud: true,
    difficulty: "hard",
    details: {
      senderAddress: "security@mizuho-alert.com",
      url: "https://mizuho.co.jp.secure-login.info/verify",
      officialInfo: "取引している銀行の公式サイトは mizuhobank.co.jp",
    },
    explanation:
      "URLの「//」の後から最初の「/」までがホスト名（mizuho.co.jp.secure-login.info）で、本当の持ち主はその右端の「secure-login.info」です。公式の mizuhobank.co.jp とは別物で、先頭の「mizuho.co.jp」は飾りです。https でも偽サイトであることは変わりません。銀行の確認は、公式アプリや自分で開いた公式サイトから行いましょう。",
  },
  {
    id: "POST_F3",
    title: "動画サイトの未払い通知",
    scenario:
      "「ご利用中の動画サイトの未払いがあります。本日中に支払わないとアカウントを停止します。今すぐこちら」とSMSが届きました。そのサイトを使った覚えはありません。",
    isFraud: true,
    difficulty: "easy",
    details: { senderAddress: "billing@video-mibarai.xyz", url: "http://video-mibarai.xyz/pay" },
    explanation:
      "使った覚えのないサービスの未払い請求で、「今日中に払わないと停止」とあせらせ、SMSのリンクから支払わせようとしています。本当に使っているサービスなら、公式アプリや自分で開いた公式サイトで請求を確かめられます。架空請求（未払い料金）詐欺と判断できます。",
  },
  {
    id: "POST_S1",
    title: "クレジットカードの利用通知",
    scenario:
      "先週コンビニでカードを使いました。カード会社の公式アプリから「ご利用がありました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "easy",
    details: {
      senderAddress: "no-reply@card-company.co.jp",
      officialInfo: "カード会社の公式サイトは card-company.co.jp",
    },
    explanation:
      "自分の利用と一致する通知で、公式アプリに届き、送信元も公式サイトと同じドメインです。支払いや情報の入力も求めていません。この事例では、事実と一致し不審な要求もないので、正常な通知と判断できます。",
  },
  {
    id: "POST_S2",
    title: "パスワード変更の通知",
    scenario:
      "昨日、自分でSNSのパスワードを変更しました。今日「パスワードが変更されました。心当たりがなければご確認ください」と通知が届きました。",
    isFraud: false,
    difficulty: "hard",
    details: {
      senderAddress: "no-reply@sns-official.com",
      url: "https://help.sns-official.com/security",
      officialInfo: "使っているSNSの公式サイトは sns-official.com",
    },
    explanation:
      "自分で変更した事実と一致する通知です。リンク先のホスト名の右端は公式サイトと同じ sns-official.com のヘルプページで、パスワードなどの入力も求めていません。この事例では正常と判断できます。セキュリティの通知＝詐欺ではありませんが、心当たりがないときは公式アプリから確認しましょう。",
  },
  {
    id: "POST_S3",
    title: "携帯料金の確定のお知らせ",
    scenario:
      "契約している携帯会社から「今月のご利用料金が確定しました。明細は会員ページでご確認いただけます」とメールが届き、リンクが付いています。金額はいつもと同じくらいです。",
    isFraud: false,
    difficulty: "medium",
    details: {
      senderAddress: "bill-info@mobile-carrier.co.jp",
      url: "https://my.mobile-carrier.co.jp/bill",
      officialInfo: "契約している携帯会社の公式サイトは mobile-carrier.co.jp",
    },
    explanation:
      "契約している携帯会社の、いつもどおりの料金確定の通知です。リンク先のホスト名の右端は公式サイトと同じ mobile-carrier.co.jp で、支払いを急がせたり情報を入力させたりもしていません。この事例では正常と判断できます。リンクがある＝詐欺ではありませんが、心配なら公式アプリの明細から確認するのが確実です。",
  },
];
