"use client";

import { useState } from "react";

interface Props {
  onSubmit: (confidence: number, decision: "report" | "ignore") => void;
}

export function ConfidenceSlider({ onSubmit }: Props) {
  const [confidence, setConfidence] = useState(3);
  const [decision, setDecision] = useState<"report" | "ignore" | null>(null);

  const labels = ["全くわからない", "あまり確信なし", "やや確信あり", "かなり確信あり", "完全に確信"];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center pb-8 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-center mb-4">判定してください</h2>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setDecision("report")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "report"
                ? "bg-red-500 text-white scale-105"
                : "bg-red-100 text-red-700"
            }`}
          >
            🚨 詐欺として報告
          </button>
          <button
            onClick={() => setDecision("ignore")}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              decision === "ignore"
                ? "bg-green-500 text-white scale-105"
                : "bg-green-100 text-green-700"
            }`}
          >
            ✅ 正常・無視する
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2 text-center">確信度：{labels[confidence - 1]}</p>
          <input
            type="range"
            min={1}
            max={5}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>

        <button
          disabled={!decision}
          onClick={() => decision && onSubmit(confidence, decision)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          決定する
        </button>
      </div>
    </div>
  );
}
