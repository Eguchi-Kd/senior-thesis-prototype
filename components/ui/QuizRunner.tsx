"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { TestQuestion } from "@/lib/transferTest";

export interface QuizResult {
  questionId: string;
  isFraud: boolean;
  answer: "fraud" | "safe";
  correct: boolean;
  confidence: number;
  reactionTimeMs: number;
}

const confidenceLabels = ["全くわからない", "あまり確信なし", "やや確信あり", "かなり確信あり", "完全に確信"];

// 事前テスト・転移テスト共通の出題ランナー。1問ごとにRTと確信度を計測する。
export function QuizRunner({
  questions,
  headerLabel,
  onSubmitOne,
  onComplete,
}: {
  questions: TestQuestion[];
  headerLabel: string;
  onSubmitOne: (r: QuizResult) => void;
  onComplete: () => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [confidence, setConfidence] = useState(3);
  const [answer, setAnswer] = useState<"fraud" | "safe" | null>(null);
  const startRef = useRef<number>(0);

  // 各問の表示開始でRT計測をリセット
  useEffect(() => {
    startRef.current = performance.now();
  }, [currentQ]);

  const question = questions[currentQ];

  const handleSubmit = () => {
    if (!answer) return;
    const correct = (answer === "fraud") === question.isFraud;
    const reactionTimeMs = Math.round(performance.now() - startRef.current);
    onSubmitOne({
      questionId: question.id,
      isFraud: question.isFraud,
      answer,
      correct,
      confidence,
      reactionTimeMs,
    });
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setAnswer(null);
      setConfidence(3);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm mb-1">{headerLabel}</p>
          <h1 className="text-white text-xl font-black">
            問 {currentQ + 1} / {questions.length}
          </h1>
          <div className="flex gap-1 mt-3 justify-center">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-10 rounded-full ${i <= currentQ ? "bg-blue-500" : "bg-gray-700"}`}
              />
            ))}
          </div>
        </div>

        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-5 mb-4"
        >
          <p className="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">{question.title}</p>
          <p className="text-gray-800 text-sm leading-relaxed">{question.scenario}</p>
          {question.details && (
            <div className="bg-gray-100 rounded-xl p-3 mt-3 text-xs space-y-1">
              {question.details.senderAddress && (
                <p className="text-gray-500 font-mono break-all">送信元：<span className="text-gray-800">{question.details.senderAddress}</span></p>
              )}
              {question.details.url && (
                <p className="text-gray-500 font-mono break-all">リンク先：<span className="text-blue-700">{question.details.url}</span></p>
              )}
              {question.details.date && (
                <p className="text-gray-500">日付：<span className="text-gray-800">{question.details.date}</span></p>
              )}
            </div>
          )}
        </motion.div>

        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setAnswer("fraud")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              answer === "fraud" ? "bg-red-500 text-white scale-105" : "bg-red-100 text-red-700"
            }`}
          >
            🚨 詐欺だと思う
          </button>
          <button
            onClick={() => setAnswer("safe")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              answer === "safe" ? "bg-green-500 text-white scale-105" : "bg-green-100 text-green-700"
            }`}
          >
            ✅ 正常だと思う
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl p-4 mb-5">
          <p className="text-gray-400 text-xs mb-2 text-center">確信度：{confidenceLabels[confidence - 1]}</p>
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

        <button
          disabled={!answer}
          onClick={handleSubmit}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {currentQ < questions.length - 1 ? "次の問題へ →" : "完了 →"}
        </button>
      </div>
    </div>
  );
}
