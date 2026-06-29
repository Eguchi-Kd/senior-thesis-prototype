"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import { Room } from "@/components/game/Room";
import { FPSControls } from "@/components/game/FPSControls";
import { ConfidenceSlider } from "@/components/ui/ConfidenceSlider";
import { FeedbackCard } from "@/components/ui/FeedbackCard";
import { scenario1 } from "@/scenarios/scenario1";

export default function GameClient() {
  const { phase, setPhase, startTimer, submitDecision, nextScenario, hintUsed, useHint } = useGameStore();
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showJudge, setShowJudge] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean } | null>(null);

  const scenario = scenario1;

  const handleInspect = (id: string) => {
    if (phase !== "exploring" && phase !== "investigating") return;
    setInspectedId(id);
    setPhase("investigating");
    if (!hintUsed) startTimer();
  };

  const handleCloseInspect = () => {
    setInspectedId(null);
    setShowJudge(true);
    setPhase("judging");
  };

  const handleSubmit = (confidence: number, decision: "report" | "ignore") => {
    const correct =
      (decision === "report" && scenario.isFraud) ||
      (decision === "ignore" && !scenario.isFraud);
    submitDecision(decision, confidence, correct);
    setLastResult({ correct });
    setShowJudge(false);
    setPhase("feedback");
  };

  const handleNext = () => {
    setLastResult(null);
    setInspectedId(null);
    setPhase("exploring");
    nextScenario();
  };

  const inspectedObj = scenario.objects.find((o) => o.id === inspectedId);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      {/* 3Dキャンバス */}
      <Canvas shadows camera={{ fov: 75 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Room onInspect={handleInspect} />
          <FPSControls />
        </Suspense>
      </Canvas>

      {/* クロスヘア */}
      {phase === "exploring" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full opacity-60" />
        </div>
      )}

      {/* ヒントボタン */}
      {(phase === "exploring" || phase === "investigating") && (
        <button
          onClick={() => { useHint(); }}
          className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-xs px-3 py-2 rounded-lg"
        >
          💡 ヒント {hintUsed && "(使用済み -10pt)"}
        </button>
      )}

      {/* 探索ガイド */}
      {phase === "exploring" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm text-center">
          オブジェクトに近づいてタップして調べよう
        </div>
      )}

      {/* ジョイスティックゾーン */}
      <div
        id="joystick-zone"
        className="absolute bottom-0 left-0 w-1/2 h-48 pointer-events-auto"
      />

      {/* 調査パネル */}
      {inspectedObj && phase === "investigating" && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-bold text-lg mb-3">{inspectedObj.label}</h3>
            {typeof inspectedObj.content === "string" ? (
              <p className="text-gray-700 text-sm mb-4">{inspectedObj.content}</p>
            ) : (
              <div className="bg-gray-100 rounded-xl p-3 mb-4 font-mono text-sm">
                <p className="text-xs text-gray-500 mb-1">
                  送信者：{inspectedObj.content.sender} {inspectedObj.content.timestamp}
                </p>
                <p className="text-gray-800">{inspectedObj.content.body}</p>
              </div>
            )}
            <button
              onClick={handleCloseInspect}
              className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-bold"
            >
              確認した → 判定する
            </button>
          </div>
        </div>
      )}

      {/* 判定UI */}
      {showJudge && phase === "judging" && (
        <ConfidenceSlider onSubmit={handleSubmit} />
      )}

      {/* フィードバック */}
      {phase === "feedback" && lastResult && (
        <FeedbackCard
          correct={lastResult.correct}
          explanation={scenario.explanation}
          learningPoint={scenario.learningPoint}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
