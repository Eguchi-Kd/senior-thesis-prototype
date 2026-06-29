"use client";

import { motion } from "framer-motion";

interface Props {
  correct: boolean;
  explanation: string;
  learningPoint: string;
  onNext: () => void;
}

export function FeedbackCard({ correct, explanation, learningPoint, onNext }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className={`text-center text-4xl mb-3`}>{correct ? "✅" : "❌"}</div>
        <h2 className={`text-xl font-bold text-center mb-4 ${correct ? "text-green-600" : "text-red-600"}`}>
          {correct ? "正解！よく気づきました" : "不正解"}
        </h2>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 border-l-4 border-blue-400">
          <p className="text-xs font-bold text-blue-700 mb-1">📚 学習ポイント</p>
          <p className="text-sm text-blue-800">{learningPoint}</p>
        </div>

        <button
          onClick={onNext}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
        >
          次のシナリオへ →
        </button>
      </div>
    </motion.div>
  );
}
