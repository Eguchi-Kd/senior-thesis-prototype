"use client";

import { useState } from "react";
import { LikertButtons } from "./LikertButtons";

type Decision = "report" | "ignore";

interface Props {
  onSubmit: (confidence: number, decision: Decision) => void;
  hint: string;
  hintUsed: boolean;
  onUseHint: (decisionBeforeHint: Decision | null) => void;
}

export function ConfidenceSlider({ onSubmit, hint, hintUsed, onUseHint }: Props) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [showHint, setShowHint] = useState(hintUsed);

  const labels = ["全くわからない", "あまり確信なし", "やや確信あり", "かなり確信あり", "完全に確信"];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <h2 className="text-lg font-bold text-center mb-1">判定してください</h2>
        <p className="text-sm text-gray-600 text-center mb-4">スマホに届いた通知の中に、詐欺はありましたか？</p>

        {/* ヒント（使用すると -10pt） */}
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
              💡 ヒントを見る（-10pt）
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setDecision("report")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "report"
                ? "bg-red-500 text-white scale-105"
                : "bg-red-100 text-red-700"
            }`}
          >
            🚨 詐欺あり（報告する）
          </button>
          <button
            onClick={() => setDecision("ignore")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "ignore"
                ? "bg-green-500 text-white scale-105"
                : "bg-green-100 text-green-700"
            }`}
          >
            ✅ 詐欺なし（問題ない）
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2 text-center">
            確信度：{confidence != null ? labels[confidence - 1] : "選んでください"}
          </p>
          <LikertButtons value={confidence} onChange={setConfidence} minLabel="全くわからない" maxLabel="完全に確信" />
        </div>

        <button
          disabled={!decision || confidence == null}
          onClick={() => decision && confidence != null && onSubmit(confidence, decision)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          決定する
        </button>
      </div>
    </div>
  );
}
