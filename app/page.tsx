"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resolveTestMode, saveTestMode } from "@/lib/testMode";
import { resolveWindowCity } from "@/lib/windowView";
import { useGameStore } from "@/store/gameStore";

const PLAY_COUNT_KEY = "scamDetective.playCount";

// この端末での過去のプレイ回数を返し、今回の分を加算する（再プレイを分析から除外するため）
// この端末での過去のプレイ回数（読むだけ）。取得できない環境では 0
function readPlayCount(): number {
  try {
    return Number(localStorage.getItem(PLAY_COUNT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

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
    // 窓の外の都市風景（検証用）：?city=1 / ?city=0 をここで端末に保存する（3Dルームへ進むと URL のクエリが消えるため）
    resolveWindowCity();
    setShowDev(on);
    useGameStore.setState({ testRun: on });
  }, []);

  const exitTestMode = () => {
    saveTestMode(false);
    // URL に ?test=1 が残っていると次の開始（reset）で再びテストモードになるため、クエリも消す
    window.history.replaceState(null, "", window.location.pathname);
    useGameStore.setState({ testRun: process.env.NODE_ENV === "development" });
    setShowDev(process.env.NODE_ENV === "development");
  };

  // research=はじめて（研究用データ）/ free=2回目以降（自由プレイ・研究用データとは別に記録）
  // この端末に過去のプレイ記録があるのに「はじめて遊ぶ」を押した場合は、本当にはじめてか確認する（2回目の誤操作を防ぐ）
  const [confirmFirst, setConfirmFirst] = useState(false);

  const startSession = (mode: "research" | "free", firstTimeConfirmed: boolean | null) => {
    reset(); // 新しいセッションを初期化（sessionId・提示順・計測をリセット）
    setPriorPlays(countPlay());
    setPlayMode(mode);
    useGameStore.getState().setFirstTimeConfirmed(firstTimeConfirmed);
    router.push("/consent");
  };

  const handleStart = (mode: "research" | "free") => {
    if (mode === "research" && readPlayCount() >= 1) {
      setConfirmFirst(true);
      return;
    }
    startSession(mode, null);
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

        {confirmFirst && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white text-gray-900 rounded-2xl p-6 w-full max-w-sm text-left">
              <p className="text-lg font-bold mb-2">はじめて遊びますか？</p>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                この端末では、以前にこのゲームを遊んだ記録があります。<br />
                <b>あなた自身</b>がこのゲームを遊ぶのが今回はじめてなら「はじめてです」を、以前に遊んだことがあれば「2回目以降です」を選んでください。
              </p>
              <button onClick={() => startSession("research", true)} className="w-full py-3 mb-2 bg-blue-600 text-white rounded-xl font-bold">
                はじめてです
              </button>
              <button onClick={() => startSession("free", false)} className="w-full py-3 mb-2 bg-gray-700 text-white rounded-xl font-bold">
                2回目以降です（自由プレイ）
              </button>
              <button onClick={() => setConfirmFirst(false)} className="w-full py-2 text-gray-500 text-sm">
                戻る
              </button>
            </div>
          </div>
        )}

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
