"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { saveSession } from "@/lib/logger";
import { transferTestQuestions } from "@/lib/transferTest";

type Screen = "transfer" | "score";

export default function ResultClient() {
  const router = useRouter();
  const { logs, transferTestLogs, sessionId, submitTransferTest, reset } = useGameStore();

  const [screen, setScreen] = useState<Screen>("transfer");
  const [currentQ, setCurrentQ] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [answer, setAnswer] = useState<"fraud" | "safe" | null>(null);
  const [saved, setSaved] = useState(false);

  // 直接アクセス時はタイトルへ戻す
  useEffect(() => {
    if (logs.length === 0) {
      router.replace("/");
    }
  }, [logs, router]);

  const question = transferTestQuestions[currentQ];
  const confidenceLabels = ["全くわからない", "あまり確信なし", "やや確信あり", "かなり確信あり", "完全に確信"];

  const handleAnswerSubmit = () => {
    if (!answer) return;
    const correct = (answer === "fraud") === question.isFraud;
    submitTransferTest(question.id, answer, correct, confidence);

    if (currentQ < transferTestQuestions.length - 1) {
      setCurrentQ((q) => q + 1);
      setAnswer(null);
      setConfidence(3);
    } else {
      // 全問終了 → Firebase保存 → スコア画面
      const updatedLogs = useGameStore.getState().transferTestLogs;
      if (!saved) {
        setSaved(true);
        saveSession({ sessionId, logs, transferTest: updatedLogs });
      }
      setScreen("score");
    }
  };

  const handleReplay = () => {
    reset();
    router.push("/");
  };

  // ─── スコア計算 ──────────────────────────────
  const scenarioCorrect = logs.filter((l) => l.correct).length;
  const hintPenalty = logs.filter((l) => l.hintUsed).length * 10;
  const allTransferLogs = useGameStore.getState().transferTestLogs;
  const transferCorrect = allTransferLogs.filter((l) => l.correct).length;
  const totalScore = scenarioCorrect * 25 - hintPenalty + transferCorrect * 10;
  const avgRt =
    logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.reactionTimeMs, 0) / logs.length)
      : 0;

  // ─── 転移テスト画面 ──────────────────────────
  if (screen === "transfer") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* ヘッダー */}
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-1">転移テスト</p>
            <h1 className="text-white text-xl font-black">
              問 {currentQ + 1} / {transferTestQuestions.length}
            </h1>
            <div className="flex gap-1 mt-3 justify-center">
              {transferTestQuestions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-10 rounded-full ${i <= currentQ ? "bg-blue-500" : "bg-gray-700"}`}
                />
              ))}
            </div>
          </div>

          {/* 問題カード */}
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-5 mb-4"
          >
            <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">
              {question.title}
            </p>
            <p className="text-gray-800 text-sm leading-relaxed">{question.scenario}</p>
          </motion.div>

          {/* 判定ボタン */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setAnswer("fraud")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                answer === "fraud"
                  ? "bg-red-500 text-white scale-105"
                  : "bg-red-100 text-red-700"
              }`}
            >
              🚨 詐欺だと思う
            </button>
            <button
              onClick={() => setAnswer("safe")}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                answer === "safe"
                  ? "bg-green-500 text-white scale-105"
                  : "bg-green-100 text-green-700"
              }`}
            >
              ✅ 正常だと思う
            </button>
          </div>

          {/* 確信度スライダー */}
          <div className="bg-gray-900 rounded-xl p-4 mb-5">
            <p className="text-gray-400 text-xs mb-2 text-center">
              確信度：{confidenceLabels[confidence - 1]}
            </p>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>

          {/* 決定ボタン */}
          <button
            disabled={!answer}
            onClick={handleAnswerSubmit}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {currentQ < transferTestQuestions.length - 1 ? "次の問題へ →" : "結果を見る →"}
          </button>
        </div>
      </div>
    );
  }

  // ─── スコア画面 ──────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-white text-3xl font-black mb-1">ゲームクリア！</h1>
          <p className="text-gray-400 text-sm">4シナリオ + 転移テスト 完了</p>
        </motion.div>

        {/* 総合スコア */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-600 rounded-2xl p-5 text-center mb-4"
        >
          <p className="text-blue-200 text-sm mb-1">総合スコア</p>
          <p className="text-white text-6xl font-black">{totalScore}</p>
          <p className="text-blue-200 text-sm">/ 130 pt</p>
        </motion.div>

        {/* シナリオ結果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gray-900 rounded-2xl p-4 mb-3"
        >
          <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">
            シナリオ結果
          </p>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.scenarioId} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">シナリオ {log.scenarioId}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs">{log.reactionTimeMs}ms</span>
                  {log.hintUsed && (
                    <span className="text-yellow-500 text-xs">ヒント-10pt</span>
                  )}
                  <span className={`text-sm font-bold ${log.correct ? "text-green-400" : "text-red-400"}`}>
                    {log.correct ? "✓ 正解" : "✗ 不正解"}
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="text-gray-400 text-xs">平均反応時間</span>
              <span className="text-gray-300 text-xs">{avgRt}ms</span>
            </div>
          </div>
        </motion.div>

        {/* 転移テスト結果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900 rounded-2xl p-4 mb-5"
        >
          <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">
            転移テスト（未知の詐欺）
          </p>
          <div className="space-y-2">
            {allTransferLogs.map((log, i) => (
              <div key={log.questionId} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  問{i + 1}　{transferTestQuestions[i]?.title}
                </span>
                <span className={`text-sm font-bold ${log.correct ? "text-green-400" : "text-red-400"}`}>
                  {log.correct ? "✓ 正解" : "✗ 不正解"}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="text-gray-400 text-xs">転移テスト正答率</span>
              <span className="text-gray-300 text-xs">
                {transferCorrect} / {transferTestQuestions.length} 問正解
              </span>
            </div>
          </div>
        </motion.div>

        {/* スコア内訳 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="bg-gray-900 rounded-xl p-3 mb-5 text-xs text-gray-500 space-y-1"
        >
          <div className="flex justify-between">
            <span>シナリオ正解 {scenarioCorrect} × 25pt</span>
            <span className="text-gray-300">+{scenarioCorrect * 25}pt</span>
          </div>
          {hintPenalty > 0 && (
            <div className="flex justify-between">
              <span>ヒント使用ペナルティ</span>
              <span className="text-red-400">-{hintPenalty}pt</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>転移テストボーナス {transferCorrect} × 10pt</span>
            <span className="text-green-400">+{transferCorrect * 10}pt</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={handleReplay}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl"
        >
          もう一度プレイ →
        </motion.button>
      </div>
    </div>
  );
}
