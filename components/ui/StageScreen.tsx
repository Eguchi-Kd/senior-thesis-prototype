"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// 事前テスト・ゲーム本編・事後テストの「開始」「終了」を区切る1枚の画面
export function StageScreen({
  step,
  emoji,
  title,
  children,
  buttonLabel,
  onNext,
}: {
  step?: string;
  emoji: string;
  title: string;
  children: ReactNode;
  buttonLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center px-6 py-8 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md text-center"
      >
        {step && <p className="text-blue-300 text-xs font-bold tracking-[0.25em] mb-3">{step}</p>}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-6xl mb-4"
        >
          {emoji}
        </motion.div>
        <h1 className="text-2xl font-black mb-4">{title}</h1>
        <div className="bg-gray-800/80 rounded-2xl p-5 mb-8 text-base text-gray-200 leading-relaxed text-left space-y-2">
          {children}
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onNext}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl"
        >
          {buttonLabel}
        </motion.button>
      </motion.div>
    </div>
  );
}
