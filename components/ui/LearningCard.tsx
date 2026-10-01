"use client";

import { motion } from "framer-motion";

interface Props {
  title: string;
  learningPoint: string;
  index?: number;
  delay?: number;
  emoji?: string; // カードの内容を表す絵文字
}

// 学び（learningPoint）を「コレクションカード」として見せる共通コンポーネント。
// フィードバック画面での獲得演出と、結果画面のギャラリーの両方で使う。
export function LearningCard({ title, learningPoint, index, delay = 0, emoji = "📇" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateY: -12 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 18 }}
      className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-[0.2em] opacity-80">
          学習カード{index != null ? ` #${index}` : ""}
        </span>
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="font-bold text-sm mb-1">{title}</p>
      <p className="text-xs leading-relaxed opacity-95">{learningPoint}</p>
    </motion.div>
  );
}
