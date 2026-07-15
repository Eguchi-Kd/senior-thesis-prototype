export const scenario4 = {
  id: 4,
  title: "改ざんQRコード",
  description: "部屋を探索して、不審な点を見つけよう",
  anomaly: {
    type: "qr_hijack",
    clue: "ポスターに記載されている公式URLと、QRコードが示すURLのドメインが異なる",
  },
  objects: [
    {
      id: "poster",
      label: "ポスター",
      position: [-3, 2, -4] as [number, number, number],
      content: "【大学祭2026】\n日時: 2026年11月3日（月）\n場所: 青森市民センター\n\n公式サイト: univ-fes2026.ac.jp\n※QRコードからもアクセスできます",
    },
    {
      id: "smartphone",
      label: "スマートフォン",
      position: [-1.5, 1, -2] as [number, number, number],
      content: {
        type: "sms",
        sender: "QRスキャン結果",
        body: "スキャンしたQRコードのURL:\nhttp://univ-fes-info.xyz/login\n\n（ポスター記載の公式URL: univ-fes2026.ac.jp）",
        timestamp: "現在",
      },
    },
  ],
  isFraud: true,
  explanation:
    "ポスターには公式サイト「univ-fes2026.ac.jp」と書かれていますが、QRコードをスキャンすると「univ-fes-info.xyz」という全く別のドメインに誘導されます。QRコードは物理的に上から貼り替えられることがあります。",
  learningPoint: "QRコードはそのまま信用せず、印刷物に記載されているURLと一致しているか必ず確認しましょう。特にログインを求めるページは要注意です。",
};
