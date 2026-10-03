"use client";

import { ScrollPanel } from "./ScrollHint";
import { motion } from "framer-motion";
import { LearningCard } from "./LearningCard";
import type { Scenario } from "@/scenarios/types";

interface Props {
  correct: boolean;
  title: string;
  explanation: string;
  learningPoint: string;
  keyPoints?: Scenario["keyPoints"];
  cardEmoji?: string;
  newCard: boolean; // この端末で初めて入手したカードか
  isLast: boolean;
  nextNumber: number; // 次の問題の番号（ボタンに「第n問へ進む」と出す）
  onNext: () => void;
}

export function FeedbackCard({ correct, title, explanation, learningPoint, keyPoints, cardEmoji, newCard, isLast, nextNumber, onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ y: 40, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md"
      >
        <ScrollPanel className="bg-white rounded-2xl p-6 max-h-[90dvh]">
        {/* 正誤アイコン：正解はポップ、不正解は横揺れ */}
        <motion.div
          className="text-center text-5xl mb-3"
          initial={{ scale: 0 }}
          animate={correct ? { scale: 1 } : { scale: 1, x: [0, -10, 10, -6, 6, 0] }}
          transition={correct ? { type: "spring", stiffness: 300, damping: 12 } : { duration: 0.5 }}
        >
          {correct ? "✅" : "❌"}
        </motion.div>
        <h2 className={`text-xl font-bold text-center mb-4 ${correct ? "text-green-600" : "text-red-600"}`}>
          {correct ? "正解！お見事！" : "不正解"}
        </h2>

        {/* 要点を先に（今回の根拠・見比べた情報・次に取る行動）。詳しい解説は開閉式 */}
        {keyPoints ? (
          <div className="mb-4 space-y-2">
            {[
              { icon: "🔎", label: "今回の根拠", text: keyPoints.basis },
              { icon: "🔁", label: "見比べた情報", text: keyPoints.compared },
              { icon: "✅", label: "次に取る行動", text: keyPoints.action },
            ].map((k) => (
              <div key={k.label} className="flex gap-2 bg-gray-50 rounded-xl p-3">
                <span className="text-lg leading-none">{k.icon}</span>
                <div>
                  <p className="text-[13px] font-bold text-gray-500">{k.label}</p>
                  <p className="text-base text-gray-800 leading-relaxed">{k.text}</p>
                </div>
              </div>
            ))}
            <details className="bg-gray-50 rounded-xl p-3">
              <summary className="cursor-pointer text-base font-bold text-gray-600">詳しい解説を読む</summary>
              <p className="text-base text-gray-700 leading-relaxed mt-2">{explanation}</p>
            </details>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-base text-gray-700 leading-relaxed">{explanation}</p>
          </div>
        )}

        {correct ? (
          <div className="mb-6">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center text-sm font-bold text-blue-700 mb-2"
            >
              {newCard ? "🎉 新しい学習カードを獲得！" : "📇 学習カード（入手済み）"}
            </motion.p>
            <LearningCard title={title} learningPoint={learningPoint} delay={0.3} emoji={cardEmoji} />
          </div>
        ) : (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border-l-4 border-blue-400">
            <p className="text-sm font-bold text-blue-700 mb-1">📚 学習ポイント</p>
            <p className="text-base text-blue-800">{learningPoint}</p>
          </div>
        )}

        <button
          onClick={onNext}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
        >
          {isLast ? "本編を終える →" : `第${nextNumber}問へ進む →`}
        </button>
        </ScrollPanel>
      </motion.div>
    </motion.div>
  );
}
