export const scenario2 = {
  id: 2,
  title: "社内セキュリティアラート",
  description: "部屋を探索して、不審な点を見つけよう",
  anomaly: {
    type: "email_phishing",
    clue: "社員証の社員番号と一致するが、メールのURLが社内ドメインではない",
  },
  objects: [
    {
      id: "id_card",
      label: "社員証",
      position: [2, 1.3, -2.5] as [number, number, number],
      content: "氏名: 山田 太郎\n社員番号: EMP-0923\n所属: システム開発部",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "email",
        sender: "security-alert@corp-it-support.xyz",
        body: "【重要】本日 EMP-0923 のアカウントで不審なログインを検知しました。24時間以内に本人確認を行ってください → http://emp-security-verify.xyz/verify",
        timestamp: "10:47",
      },
    },
  ],
  isFraud: true,
  explanation:
    "メールの送信元ドメイン（corp-it-support.xyz）もリンク先URL（emp-security-verify.xyz）も、社内の正式ドメインではありません。社員番号が正しく書かれていても、ドメインが違えばフィッシングメールです。",
  learningPoint: "「あなたの情報が正確に書かれている」=「本物」ではありません。送信元ドメインとリンク先URLを必ず確認しましょう。",
};
