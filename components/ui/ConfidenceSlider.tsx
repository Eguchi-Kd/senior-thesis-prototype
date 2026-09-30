"use client";

import { useState } from "react";
import { LikertButtons } from "./LikertButtons";

type Decision = "report" | "ignore";

interface Props {
  decision: Decision | null;
  confidence: number | null;
  onDecision: (d: Decision) => void;
  onConfidence: (c: number) => void;
  onSubmit: () => void;
  onBack: () => void; // 探索に戻って調べ直す（選んだ答え・確信度・ヒントは保持）
  hint: string;
  hintUsed: boolean;
  onUseHint: (decisionBeforeHint: Decision | null) => void;
}

const LABELS = ["全くわからない", "あまり自信なし", "やや自信あり", "かなり自信あり", "完全に自信あり"];

// 判定画面。答えと確信度は親（GameClient）が保持し、調べ直して戻っても消えない
export function ConfidenceSlider({
  decision,
  confidence,
  onDecision,
  onConfidence,
  onSubmit,
  onBack,
  hint,
  hintUsed,
  onUseHint,
}: Props) {
  const [showHint, setShowHint] = useState(hintUsed);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <h2 className="text-lg font-bold text-center mb-1">判定してください</h2>
        <p className="text-sm text-gray-600 text-center mb-4">スマホに届いた通知の中に、詐欺はありましたか？</p>

        {/* ヒント（減点なし。どこを見比べるかだけを示す） */}
        <div className="flex justify-center mb-4">
          {showHint ? (
            <div className="w-full bg-amber-100 text-amber-900 text-sm rounded-xl p-3 text-center">
              <p className="font-bold mb-1">💡 ヒント</p>
              <p>{hint}</p>
            </div>
          ) : (
            <button
              onClick={() => { onUseHint(decision); setShowHint(true); }}
              className="px-4 py-2 bg-amber-100 text-amber-900 text-sm font-bold rounded-full"
            >
              💡 ヒントを見る
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-5">
          <button
            onClick={() => onDecision("report")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "report" ? "bg-red-500 text-white scale-105" : "bg-red-100 text-red-700"
            }`}
          >
            🚨 詐欺あり（報告する）
          </button>
          <button
            onClick={() => onDecision("ignore")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "ignore" ? "bg-green-500 text-white scale-105" : "bg-green-100 text-green-700"
            }`}
          >
            ✅ 詐欺なし（問題ない）
          </button>
        </div>

        <div className="mb-5">
          <p className="text-sm text-gray-600 mb-2 text-center">
            確信度：{confidence != null ? LABELS[confidence - 1] : "選んでください"}
          </p>
          <LikertButtons value={confidence} onChange={onConfidence} minLabel="全くわからない" maxLabel="完全に自信あり" />
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold text-sm">
            🔍 もう一度調べる
          </button>
          <button
            disabled={!decision || confidence == null}
            onClick={onSubmit}
            className="flex-[1.4] py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            決定する
          </button>
        </div>
      </div>
    </div>
  );
}
