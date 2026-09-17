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
    title: "宅配便の不在通知",
    scenario:
      "通販で注文した荷物の到着を待っています。「お届けにあがりましたがご不在でした。再配達はこちら」とSMSが届きました。",
    isFraud: true,
    difficulty: "medium",
    details: { senderAddress: "yamato@yamato-saihai.net", url: "http://yamato-saihai.net/redelivery", date: "配送予定日の前日" },
    explanation:
      "荷物を待っているのは事実でも、送信元は公式（kuronekoyamato.co.jp）ではなく yamato-saihai.net、URLも http です。文脈が本物でもドメインで詐欺と見抜けます。",
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
    title: "キャッシュバック当選",
    scenario:
      "「アンケート回答のお礼に5,000円をキャッシュバック！受け取りは今すぐこちらから」とメールが届きました。回答した覚えはありません。",
    isFraud: true,
    difficulty: "easy",
    details: { senderAddress: "reward@cash-back.xyz", url: "http://cash-back.xyz/get" },
    explanation:
      "回答した覚えのない特典通知で、ドメインも .xyz の非公式、http です。身に覚えのなさとドメインの両方から詐欺と判断できます。",
  },
  {
    id: "POST_S1",
    title: "クレジットカードの利用通知",
    scenario:
      "先週コンビニでカードを使いました。カード会社の公式アプリから「ご利用がありました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "medium",
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
