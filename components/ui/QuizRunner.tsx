"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TestQuestion } from "@/lib/transferTest";
import type { TestForm } from "@/lib/testForms";
import type { Difficulty } from "@/scenarios/types";
import { useGameStore } from "@/store/gameStore";

export interface QuizResult {
  questionId: string;
  form: TestForm;
  position: number;
  difficulty: Difficulty;
  isFraud: boolean;
  answer: "fraud" | "safe";
  correct: boolean;
  confidence: number;
  reactionTimeMs: number;
  hiddenMs: number;
}

const CONFIDENCE = ["全くわからない", "あまり自信なし", "やや自信あり", "かなり自信あり", "完全に自信あり"];

// 事前・事後テスト共通の出題ランナー。
// 出題順は呼び出し側（ストア）で固定し、再読み込み時は startIndex から続ける。
// 正誤はここでは見せない（テストで答えを知ると学習効果の測定が崩れるため。答え合わせはリザルトでまとめて）。
// 答えを選ぶ → 確信度をタップした時点で回答確定・次の問題へ（タップ数を減らして飽きにくくする）。
export function QuizRunner({
  questions,
  startIndex = 0,
  form,
  headerLabel,
  onSubmitOne,
  onComplete,
}: {
  questions: TestQuestion[];
  startIndex?: number;
  form: TestForm;
  headerLabel: string;
  onSubmitOne: (r: QuizResult) => void;
  onComplete: () => void;
}) {
  const [currentQ, setCurrentQ] = useState(startIndex);
  const [answer, setAnswer] = useState<"fraud" | "safe" | null>(null);
  const [locked, setLocked] = useState(false);
  const startRef = useRef(0);
  const hiddenStartRef = useRef(0);

  // 各問の表示開始でRTと非表示時間の計測をリセット
  useEffect(() => {
    startRef.current = performance.now();
    hiddenStartRef.current = useGameStore.getState().hiddenTotalMs;
  }, [currentQ]);

  // 全問回答済みで開かれた（再読み込み等）場合はそのまま完了へ
  useEffect(() => {
    if (startIndex >= questions.length) onComplete();
  }, [startIndex, questions.length, onComplete]);

  if (currentQ >= questions.length) return null;
  const question = questions[currentQ];
  const remaining = questions.length - currentQ - 1;

  const submit = (confidence: number) => {
    if (!answer || locked) return;
    setLocked(true);
    onSubmitOne({
      questionId: question.id,
      form,
      position: currentQ + 1,
      difficulty: question.difficulty,
      isFraud: question.isFraud,
      answer,
      correct: (answer === "fraud") === question.isFraud,
      confidence,
      reactionTimeMs: Math.round(performance.now() - startRef.current),
      hiddenMs: useGameStore.getState().hiddenTotalMs - hiddenStartRef.current,
    });
    // 選んだ確信度が一瞬見えてから次へ
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ((q) => q + 1);
        setAnswer(null);
        setLocked(false);
      } else {
        onComplete();
      }
    }, 250);
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm mb-1">{headerLabel}</p>
          <div className="flex gap-1.5 justify-center mb-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  i < currentQ ? "bg-blue-500" : i === currentQ ? "bg-blue-300" : "bg-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="text-white text-base font-bold">
            問 {currentQ + 1} / {questions.length}
            <span className="text-gray-400 font-normal ml-2">
              {remaining > 0 ? `あと ${remaining} 問！` : "ラスト1問！"}
            </span>
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* 状況 */}
            <div className="bg-gray-800 rounded-2xl p-4 mb-3">
              <p className="text-[13px] font-bold text-blue-300 mb-1 tracking-wide">状況：{question.title}</p>
              <p className="text-gray-100 text-base leading-relaxed">{question.scenario}</p>
              {question.details?.officialInfo && (
                <div className="mt-3 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-3 py-2">
                  <p className="text-[13px] font-bold text-emerald-300">📌 公式情報（あなたが以前から知っていること）</p>
                  <p className="text-base text-emerald-100 break-all">{question.details.officialInfo}</p>
                </div>
              )}
            </div>

            {/* スマホの通知風：手がかり（送信元・リンク・日付） */}
            {question.details && (question.details.senderAddress || question.details.url || question.details.date) && (
              <div className="bg-white/95 rounded-2xl p-3 mb-4 shadow-lg border border-white/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs flex items-center justify-center">✉</span>
                  <span className="text-[13px] text-gray-500">届いた通知の詳細</span>
                </div>
                <div className="text-base space-y-1">
                  {question.details.senderAddress && (
                    <p className="text-gray-500 break-all">送信元の番号・アドレス：<span className="text-gray-900 font-mono">{question.details.senderAddress}</span></p>
                  )}
                  {question.details.url && (
                    <p className="text-gray-500 break-all">
                      {/^https?:\/\//.test(question.details.url) ? "リンク先：" : "求められていること："}
                      <span className={/^https?:\/\//.test(question.details.url) ? "text-blue-700 font-mono" : "text-gray-900"}>
                        {question.details.url}
                      </span>
                    </p>
                  )}
                  {question.details.date && (
                    <p className="text-gray-500">日付：<span className="text-gray-900">{question.details.date}</span></p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => !locked && setAnswer("fraud")}
                className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${
                  answer === "fraud" ? "bg-red-500 text-white scale-105" : "bg-red-100 text-red-700"
                }`}
              >
                🚨 詐欺だと思う
              </button>
              <button
                onClick={() => !locked && setAnswer("safe")}
                className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${
                  answer === "safe" ? "bg-green-500 text-white scale-105" : "bg-green-100 text-green-700"
                }`}
              >
                ✅ 正常だと思う
              </button>
            </div>

            {/* 答えを選ぶと確信度が出る。確信度のタップで回答確定 */}
            <div className={`bg-gray-900 rounded-xl p-3 transition-opacity ${answer ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <p className="text-gray-300 text-sm mb-2 text-center">
                {answer ? "どのくらい自信がある？（タップで次へ）" : "まず答えを選んでください"}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {CONFIDENCE.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => submit(i + 1)}
                    className="flex flex-col items-center py-2 rounded-lg bg-gray-800 text-gray-200 active:bg-blue-600 hover:bg-gray-700"
                  >
                    <span className="text-sm font-bold">{i + 1}</span>
                    <span className="text-[11px] leading-tight mt-0.5 text-gray-400">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
