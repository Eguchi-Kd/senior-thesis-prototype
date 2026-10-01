"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { saveSnapshot } from "@/lib/logger";
import { resumePath } from "@/lib/progress";

export default function ConsentPage() {
  const router = useRouter();
  const setConsent = useGameStore((s) => s.setConsent);
  const markPhase = useGameStore((s) => s.markPhase);
  const playMode = useGameStore((s) => s.playMode);
  const setPhase = useGameStore((s) => s.setPhase);
  const [agreed, setAgreed] = useState(false);

  // 同意済みで戻ってきた場合は、回答状況に応じた場所へ送る（再同意や段階の巻き戻しをしない）
  useEffect(() => {
    const path = resumePath(useGameStore.getState());
    if (path !== "/consent") router.replace(path);
    else setPhase("consent");
  }, [router, setPhase]);

  const handleNext = () => {
    if (!agreed) return;
    setConsent(true);
    markPhase("consent");
    void saveSnapshot();
    // 自由プレイは属性・事前テストを省いてゲームへ
    router.push(playMode === "free" ? "/game" : "/intake");
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center px-6 py-8 text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-2xl font-black mb-4 text-center">研究へのご協力のお願い</h1>

        <div className="bg-gray-800 rounded-2xl p-5 mb-6 text-sm text-gray-300 space-y-3 leading-relaxed">
          <p>本ゲームは卒業研究「体験型ゲームを用いたデジタル詐欺認知学習の効果検証」のためのものです。</p>
          <p>プレイ中の回答・反応時間・アンケート結果などを、<strong className="text-white">匿名で</strong>研究目的にのみ利用します。氏名・連絡先など個人を特定する情報は取得しません。</p>
          <p>回答はいつでも中断でき、協力しないことによる不利益はありません。収集データは研究終了後に適切に管理・破棄されます。</p>        </div>

        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 mb-6 text-sm text-amber-200 leading-relaxed">
          🙏 正確な研究のため、<strong className="text-amber-100">一人で、誰とも相談せずに</strong>プレイしてください。
        </div>

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 accent-blue-500"
          />
          <span className="text-sm">上記に同意し、研究に協力します</span>
        </label>

        <button
          disabled={!agreed}
          onClick={handleNext}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          同意して次へ →
        </button>
      </motion.div>
    </div>
  );
}
