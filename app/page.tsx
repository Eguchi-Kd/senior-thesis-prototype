"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveTestMode, saveTestMode } from "@/lib/testMode";
import { useGameStore } from "@/store/gameStore";

const PLAY_COUNT_KEY = "scamDetective.playCount";

// この端末での過去のプレイ回数を返し、今回の分を加算する（再プレイを分析から除外するため）
function countPlay(): number {
  try {
    const prior = Number(localStorage.getItem(PLAY_COUNT_KEY) ?? "0") || 0;
    localStorage.setItem(PLAY_COUNT_KEY, String(prior + 1));
    return prior;
  } catch {
    return -1; // 取得不可（プライベートモード等）
  }
}

export default function TitlePage() {
  const router = useRouter();
  const reset = useGameStore((s) => s.reset);
  const setPhase = useGameStore((s) => s.setPhase);
  const setPriorPlays = useGameStore((s) => s.setPriorPlays);
  const setPlayMode = useGameStore((s) => s.setPlayMode);

  // テストモード（開発時・?test=1 を開いた端末）のときだけ「3Dルーム直行」とテストモード表示を出す。
  // ?test=1 は端末に保存され、解除するまで続く（パイロットの連続実施で本番扱いにならないように）
  const [showDev, setShowDev] = useState(false);
  useEffect(() => {
    const on = resolveTestMode();
    setShowDev(on);
    useGameStore.setState({ testRun: on });
  }, []);

  const exitTestMode = () => {
    saveTestMode(false);
    useGameStore.setState({ testRun: process.env.NODE_ENV === "development" });
    setShowDev(process.env.NODE_ENV === "development");
  };

  // research=はじめて（研究用データ）/ free=2回目以降（自由プレイ・研究用データとは別に記録）
  const handleStart = (mode: "research" | "free") => {
    reset(); // 新しいセッションを初期化（sessionId・提示順・計測をリセット）
    setPriorPlays(countPlay());
    setPlayMode(mode);
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
          <p>🧐 あわてず、情報を見比べてから判断しよう</p>
          <p>🎯 詐欺を見破ろう！（正常な通知もあります）</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleStart("research")}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl"
        >
          はじめて遊ぶ →
          <span className="block text-xs font-normal opacity-80 mt-0.5">テスト・アンケートつき（研究にご協力ください）</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleStart("free")}
          className="w-full py-3 mt-3 bg-gray-700 text-white font-bold rounded-2xl"
        >
          2回目以降（自由プレイ）
          <span className="block text-xs font-normal opacity-70 mt-0.5">テストなしでゲームだけ遊べます</span>
        </motion.button>

        <Link
          href="/collection"
          className="block w-full py-3 mt-3 text-center bg-gray-800 text-gray-200 text-sm font-bold rounded-2xl"
        >
          📇 学習カード コレクション
        </Link>

        {showDev && (
          <div className="mt-4 rounded-2xl border border-yellow-500/60 bg-yellow-500/10 px-3 py-2 text-left text-xs text-yellow-200">
            🧪 <b>テストモード中</b>：この端末のプレイは本番データと区別して記録されます（解除するまで続きます）。
            {process.env.NODE_ENV !== "development" && (
              <button onClick={exitTestMode} className="ml-2 underline text-yellow-100">
                テストモードを解除
              </button>
            )}
          </div>
        )}

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
