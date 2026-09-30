"use client";

import { motion } from "framer-motion";
import { LearningCard } from "./LearningCard";

interface Props {
  correct: boolean;
  title: string;
  explanation: string;
  learningPoint: string;
  newCard: boolean; // この端末で初めて入手したカードか
  isLast: boolean;
  onNext: () => void;
}

export function FeedbackCard({ correct, title, explanation, learningPoint, newCard, isLast, onNext }: Props) {
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
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
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

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
        </div>

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
            <LearningCard title={title} learningPoint={learningPoint} delay={0.3} />
          </div>
        ) : (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border-l-4 border-blue-400">
            <p className="text-xs font-bold text-blue-700 mb-1">📚 学習ポイント</p>
            <p className="text-sm text-blue-800">{learningPoint}</p>
          </div>
        )}

        <button
          onClick={onNext}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
        >
          {isLast ? "結果へ →" : "次のシナリオへ →"}
        </button>
      </motion.div>
    </motion.div>
  );
}
