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
      "このように「捜査」や「資産を守るため」を口実に、指定の口座へお金を移させる要求は、ニセ警察（なりすまし）詐欺の典型です。本物の警察が、こうしたお金の移動を求めることはありません。心配なときは一度切り、自分で調べた警察署の代表番号や警察相談専用電話（#9110）にかけて確かめましょう。",
  },
  {
    id: "PRE_F2",
    title: "アカウントの確認",
    scenario:
      "いつも使っている通販サイトから、普段の案内に似たメールで「アカウントに異常なアクセスがありました。確認しないと利用停止になります」と届き、確認リンクが載っています。",
    isFraud: true,
    difficulty: "hard",
    details: {
      senderAddress: "support@amazon-alert.com",
      url: "https://amazon.co.jp.account-verify.info/login",
      officialInfo: "いつも使っている通販サイトの公式サイトは amazon.co.jp",
    },
    explanation:
      "URLの「//」の後から最初の「/」まで（amazon.co.jp.account-verify.info）がサイト名で、このサイトを登録しているのは右端の「account-verify.info」の部分です。先頭の「amazon.co.jp」は公式と同じ文字ですが、その前に付けた飾りにすぎず、公式の amazon.co.jp とは別のサイトです。https でも、偽サイトであることは変わりません。気になるときはリンクを開かず、公式アプリや自分で開いた公式サイトから確認しましょう。",
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
      "動画配信サービスを月額で契約しています。毎月の決済日の今日、サービスからメールで「今月分の決済が完了しました。明細はアプリでご確認ください」と届きました。リンクや入力の要求はありません。",
    isFraud: false,
    difficulty: "easy",
    details: {
      senderAddress: "receipt@video-service.co.jp",
      officialInfo: "契約している動画配信サービスの公式サイトは video-service.co.jp",
    },
    explanation:
      "自分が契約しているサービスの、決済日どおりの通知です。送信元のサイト名は公式サイトと同じ video-service.co.jp で、支払いや情報の入力も求めていません。この事例では、事実と一致し不審な要求もないので、正常な通知と判断できます。",
  },
  {
    id: "PRE_S2",
    title: "ログイン用の確認コード",
    scenario:
      "普段使っているメールの公式アプリから自分でログインしようとした直後に「確認コード: 428915（他人には教えないでください）」というメッセージが届きました。ちょうどその公式アプリでコードの入力を求められています。",
    isFraud: false,
    difficulty: "hard",
    details: {
      senderAddress: "no-reply@mail-service.co.jp",
      officialInfo: "使っているメールサービスの公式ドメインは mail-service.co.jp",
    },
    explanation:
      "普段使っている公式アプリから自分でログインした直後に届いた二段階認証のコードで、そのアプリがコードを求めています。コードを誰かに伝えさせたり、別のサイトに入力させたりもしていません。この事例では正常です。なお、自分でログインしていないのにコードが届いた場合は、誰かがログインを試みている可能性があります。コードは誰にも教えず、公式アプリで確認しましょう。",
  },
  {
    id: "PRE_S3",
    title: "注文した商品の発送通知",
    scenario:
      "昨日、いつも使っている通販サイトで本『はじめてのプログラミング』を注文しました。今日「ご注文の『はじめてのプログラミング』を発送しました。配送状況は注文履歴からご確認いただけます」とメールが届き、リンクが付いています。",
    isFraud: false,
    difficulty: "medium",
    details: {
      senderAddress: "ship-info@netshop.co.jp",
      url: "https://www.netshop.co.jp/orders",
      officialInfo: "会員登録した通販サイトの公式サイトは netshop.co.jp",
    },
    explanation:
      "注文した本と同じ商品の発送通知です。リンク先のサイト名の右端は公式サイトと同じ netshop.co.jp で、通知自体は支払いや情報の入力を求めていません（公式サイトで注文履歴を見るときにログインが必要なのは、自分で開いた公式サイトでの通常の手続きで、通知が入力を迫るのとは別です）。この事例では正常と判断できます。リンクがある＝詐欺ではありませんが、心配なら公式アプリの注文履歴から確認するのが確実です。",
  },
];
