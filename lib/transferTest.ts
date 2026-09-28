import type { Difficulty } from "@/scenarios/types";

export interface TestDetails {
  senderAddress?: string;
  url?: string;
  date?: string;
}

export interface TestQuestion {
  id: string;
  title: string;
  scenario: string;
  isFraud: boolean;
  difficulty: Difficulty;
  details?: TestDetails; // 精査対象の手がかり（送信元/URL/日付）をQuizRunnerで明示表示
  explanation: string;
}

// 事後（転移）テスト：未学習の文脈での応用力。詐欺3＋安全2、難易度を分散。
// 「身に覚え」だけでは解けないよう、身に覚えのある詐欺／一見不審な正常を混在させる。
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
      "『番号が変わった』と新しい連絡先を信じ込ませ、本人確認をさせないままお金を立て替えさせるのは、なりすまし詐欺の典型です。必ず元の連絡先で本人確認を。",
  },
  {
    id: "POST_F2",
    title: "銀行からのログイン確認",
    scenario:
      "銀行を名乗るメールで「不正アクセスの可能性があります。至急ご確認ください」とあり、確認用リンクが記載されています。",
    isFraud: true,
    difficulty: "hard",
    details: { senderAddress: "security@mizuho-alert.com", url: "https://mizuho.co.jp.secure-login.info/verify" },
    explanation:
      "URLは『mizuho.co.jp』で始まりますが、実際のドメインは末尾の『secure-login.info』です（サブドメイン偽装）。https でも安全とは限りません。ドメインは末尾で判断します。",
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
      "利用した覚えのないサービスの未払い請求で、停止をちらつかせて焦らせ、非公式ドメイン（.xyz・http）へ誘導しています。架空請求（未払い料金）詐欺です。",
  },
  {
    id: "POST_S1",
    title: "クレジットカードの利用通知",
    scenario:
      "先週コンビニでカードを使いました。カード会社の公式アプリから「ご利用がありました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "easy",
    details: { senderAddress: "no-reply@card-company.co.jp" },
    explanation:
      "実際の利用と一致し、正規ドメインからで、リンクや情報入力を求めていません。矛盾も要求もなく正常な利用通知です。",
  },
  {
    id: "POST_S2",
    title: "パスワード変更の通知",
    scenario:
      "昨日、自分でSNSのパスワードを変更しました。今日「パスワードが変更されました。心当たりがなければご確認ください」と通知が届きました。",
    isFraud: false,
    difficulty: "hard",
    details: { senderAddress: "no-reply@sns-official.com", url: "https://help.sns-official.com/security" },
    explanation:
      "自分で変更した事実と一致し、送信元は正規ドメイン、リンクも公式ヘルプで情報入力を求めていません。セキュリティ通知＝詐欺ではありません。",
  },
];
