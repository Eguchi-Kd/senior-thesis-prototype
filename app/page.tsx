"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

export default function TitlePage() {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const setPhase = useGameStore((s) => s.setPhase);

  // 開発時(next dev) または ?test=1 のときだけ「3Dルーム直行」ボタンを表示する。
  // 本番ビルドでは自動的に非表示になり、実験フロー（同意→属性→事前テスト）に影響しない。
  const [showDev, setShowDev] = useState(false);
  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    const hasTest = new URLSearchParams(window.location.search).get("test") === "1";
    setShowDev(isDev || hasTest);
  }, []);

  const handleStart = () => {
    reset(); // 新しいセッションを初期化（sessionId・提示順・計測をリセット）
    router.push("/consent");
  };

  // 同意・属性・事前テストを飛ばして即座に3Dルームへ（開発/確認用）
  const handleDevStart = () => {
    reset();
    setPhase("exploring");
    router.push("/game");
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center text-white px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">SCAM DETECTIVE</h1>
        <p className="text-gray-400 text-sm mb-8">
          デジタル詐欺を見破れ — 認知学習ゲーム
        </p>

        <div className="bg-gray-800 rounded-2xl p-5 mb-8 text-left text-sm text-gray-300 space-y-2">
          <p>🏠 3D空間を探索して不審な点を探そう</p>
          <p>📱 スマホやPCの画面と周囲の情報を照らし合わせよう</p>
          <p>⚡ 反応速度も計測されます — 直感を鍛えよう</p>
          <p>🎯 詐欺を見破ろう！（正常な通知もあります）</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl"
        >
          ゲームをはじめる →
        </motion.button>

        {showDev && (
          <button
            onClick={handleDevStart}
            className="w-full py-3 mt-3 border border-dashed border-yellow-500/70 text-yellow-300 text-sm font-bold rounded-2xl"
          >
            🔧 テスト：3Dルームへ直行（同意/属性/事前テストを飛ばす）
          </button>
        )}

        <p className="text-gray-600 text-xs mt-6">
          青森大学 情報科学研究室 — 卒業研究プロトタイプ v0.1
        </p>
      </motion.div>
    </div>
  );
}
