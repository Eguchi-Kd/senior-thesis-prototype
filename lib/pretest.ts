import type { TestQuestion } from "./transferTest";

// フォームA（lib/testForms.ts でフォームBと事前/事後にランダム割付＝カウンターバランス）。
// 難易度（易2/中2/難2）と詐欺:安全＝3:3の構成をフォームBと揃え、内容だけ変えて「答えの丸暗記」を防ぐ。
// ※ id の PRE_ 接頭辞は項目の識別子であり、事前/事後どちらで出たかはログの phase を見る。
// 解説の方針：出題された情報だけで正解を説明し、HTTPS・表示上の送信元・リンクの有無など
// 単一の表面的特徴を「安全の保証」として書かない。
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
      "警察や銀行が「安全な口座」へお金を移すよう求めることはありません。公的機関を名乗り、あせらせてお金を動かさせるのは、ニセ警察（なりすまし）詐欺の典型です。心配なときは一度切り、自分で調べた警察署の代表番号や警察相談専用電話（#9110）にかけて確かめましょう。",
  },
  {
    id: "PRE_F2",
    title: "アカウントの確認",
    scenario:
      "通販サイトを名乗るメールで「アカウントに異常なアクセスがありました。確認しないと利用停止になります」とあり、確認リンクが載っています。",
    isFraud: true,
    difficulty: "hard",
    details: {
      senderAddress: "support@amazon-alert.com",
      url: "https://amazon.co.jp.account-verify.info/login",
      officialInfo: "いつも使っている通販サイトの公式サイトは amazon.co.jp",
    },
    explanation:
      "URLの「//」の後から最初の「/」までがホスト名（amazon.co.jp.account-verify.info）で、本当の持ち主はその右端の「account-verify.info」です。先頭の「amazon.co.jp」は飾りで、公式の amazon.co.jp とは別物です。https でも、偽サイトであることは変わりません。気になるときはリンクを開かず、公式アプリや自分で開いた公式サイトから確認しましょう。",
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
      "何の料金かも書かれていない、心当たりのない請求です。「法的措置」とおどして今日中に払わせようとし、SMSのリンクから支払いへ誘導しています。本当に契約している料金なら、契約先の公式アプリや書面で確かめられます。架空請求（未払い料金）詐欺と判断できます。",
  },
  {
    id: "PRE_S1",
    title: "サブスクの決済完了",
    scenario:
      "動画配信サービスを月額で契約しています。公式アプリから「今月分の決済が完了しました。明細はアプリでご確認ください」と通知が来ました。リンクや入力要求はありません。",
    isFraud: false,
    difficulty: "easy",
    details: {
      senderAddress: "receipt@video-service.co.jp",
      officialInfo: "契約している動画配信サービスの公式サイトは video-service.co.jp",
    },
    explanation:
      "自分が契約しているサービスの月額決済の通知で、公式アプリに届き、送信元も公式サイトと同じドメインです。支払いや情報の入力も求めていません。この事例では、事実と一致し不審な要求もないので、正常な通知と判断できます。",
  },
  {
    id: "PRE_S2",
    title: "ログイン用の確認コード",
    scenario:
      "自分でメールにログインしようとした直後に「確認コード: 428915（他人には教えないでください）」というメッセージが届きました。ちょうどログイン画面でコード入力を求められています。",
    isFraud: false,
    difficulty: "hard",
    details: {
      senderAddress: "no-reply@mail-service.co.jp",
      officialInfo: "使っているメールサービスの公式ドメインは mail-service.co.jp",
    },
    explanation:
      "自分でログインした直後に届いた二段階認証のコードで、今まさに自分で開いたログイン画面がコードを求めています。コードを誰かに伝えたり、別のサイトに入力させたりもしていません。この事例では正常です。ただし、自分でログインしていないのにコードが届いたら、誰かがログインしようとしている合図なので、コードは誰にも教えないでください。",
  },
  {
    id: "PRE_S3",
    title: "注文した商品の発送通知",
    scenario:
      "昨日、いつも使っている通販サイトで本を注文しました。今日「ご注文の商品を発送しました。配送状況は注文履歴からご確認いただけます」とメールが届き、リンクが付いています。",
    isFraud: false,
    difficulty: "medium",
    details: {
      senderAddress: "ship-info@netshop.co.jp",
      url: "https://www.netshop.co.jp/orders",
      officialInfo: "会員登録した通販サイトの公式サイトは netshop.co.jp",
    },
    explanation:
      "自分の注文と一致する発送通知です。リンク先のホスト名の右端は公式サイトと同じ netshop.co.jp で、ログインや支払い情報の入力も求めていません。この事例では正常と判断できます。リンクがある＝詐欺ではありませんが、心配なら公式アプリの注文履歴から確認するのが確実です。",
  },
];
