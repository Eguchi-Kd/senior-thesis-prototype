"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import { Room } from "@/components/game/Room";
import { FPSControls } from "@/components/game/FPSControls";
import { PostFX } from "@/components/game/PostFX";
import { ConfidenceSlider } from "@/components/ui/ConfidenceSlider";
import { FeedbackCard } from "@/components/ui/FeedbackCard";
import { getScenarioById } from "@/lib/scenarios";
import { saveSnapshot, registerDropoutSave } from "@/lib/logger";

export default function GameClient() {
  const router = useRouter();
  const { phase, setPhase, startTimer, markScenarioStart, markJudgeOpen, submitDecision, nextScenario, hintUsed, useHint, recordInspect, closeInspect, markPhase, currentInspected, scenarioOrder, currentIndex } = useGameStore();
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showJudge, setShowJudge] = useState(false);
  const [lastResult, setLastResult] = useState<{ correct: boolean } | null>(null);

  const scenarioId = scenarioOrder[currentIndex];
  const scenario = getScenarioById(scenarioId);

  // 離脱（タブを閉じる/バックグラウンド化）時のベストエフォート保存
  useEffect(() => registerDropoutSave(), []);
  useEffect(() => markPhase("gameStart"), [markPhase]);
  // 各シナリオ開始で時刻・per-scenario状態をリセット
  useEffect(() => {
    markScenarioStart();
  }, [currentIndex, markScenarioStart]);

  const handleInspect = (id: string) => {
    if (phase !== "exploring" && phase !== "investigating") return;
    recordInspect(id);
    setInspectedId(id);
    setPhase("investigating");
    startTimer(); // シナリオ内で最初の調査時のみ計測開始（store側でガード）
  };

  // 調査パネルを閉じたら探索に戻す（もう一方のオブジェクトも調べられる）
  const handleCloseInspect = () => {
    closeInspect();
    setInspectedId(null);
    setPhase("exploring");
  };

  // 関連オブジェクトの数を悟らせないため、確認ダイアログや件数表示は出さない
  const openJudge = () => {
    markJudgeOpen(); // 判定UI表示時刻を記録
    setShowJudge(true);
    setPhase("judging");
  };

  const handleSubmit = (confidence: number, decision: "report" | "ignore") => {
    const correct =
      (decision === "report" && scenario.isFraud) ||
      (decision === "ignore" && !scenario.isFraud);
    submitDecision(decision, confidence, correct, scenario.isFraud);
    setLastResult({ correct });
    setShowJudge(false);
    setPhase("feedback");
    void saveSnapshot(); // シナリオ完了ごとに逐次保存
  };

  const handleNext = () => {
    setLastResult(null);
    setInspectedId(null);
    const isLast = currentIndex >= scenarioOrder.length - 1;
    nextScenario();
    if (isLast) {
      markPhase("gameEnd");
      router.push("/result");
    } else {
      setPhase("exploring");
    }
  };

  const inspectedObj = scenario.objects.find((o) => o.id === inspectedId);

  return (
    <div className="w-full h-dvh bg-black relative overflow-hidden">
      {/* 縦持ち時の回転誘導オーバーレイ（横画面でプレイさせる） */}
      <div className="hidden portrait:flex fixed inset-0 z-[60] bg-gray-950 flex-col items-center justify-center text-center px-8">
        <div className="text-6xl mb-4 animate-pulse">📱↻</div>
        <p className="text-white text-lg font-bold">端末を横向きにしてください</p>
        <p className="text-gray-400 text-sm mt-2">このゲームは横画面でプレイします</p>
      </div>

      {/* 3Dキャンバス */}
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 75 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Room onInspect={handleInspect} />
          <FPSControls />
        </Suspense>
        <PostFX />
      </Canvas>

      {/* 進捗バー */}
      {(phase === "exploring" || phase === "investigating") && (
        <div className="absolute top-4 left-4 w-40 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/70 text-xs">進捗</span>
            <span className="text-white/70 text-xs ml-auto">
              {currentIndex + 1} / {scenarioOrder.length}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / scenarioOrder.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* クロスヘア */}
      {phase === "exploring" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full opacity-60" />
        </div>
      )}

      {/* 探索ガイド（まだ何も調べていないとき） */}
      {phase === "exploring" && currentInspected.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs text-center pointer-events-none px-4">
          左スティックで移動 ・ 右スティックで見回す<br />
          （PC: WASDで移動・ドラッグで視点） 近づいてタップで調べる
        </div>
      )}

      {/* 判定ボタン（1つ以上調べたら表示） */}
      {phase === "exploring" && currentInspected.length >= 1 && (
        <button
          onClick={openJudge}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg pointer-events-auto"
        >
          ⚖️ 判定する
        </button>
      )}

      {/* 移動ジョイスティックゾーン（左下） */}
      <div
        id="joystick-zone"
        className="absolute bottom-0 left-0 w-1/3 h-1/2 pointer-events-auto z-30"
      />

      {/* 視点ジョイスティックゾーン（右下） */}
      <div
        id="look-zone"
        className="absolute bottom-0 right-0 w-1/3 h-1/2 pointer-events-auto z-30"
      />

      {/* 調査パネル */}
      {inspectedObj && phase === "investigating" && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90dvh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">
              {inspectedObj.label}
              {typeof inspectedObj.content !== "string" && (
                <span className="text-sm font-normal text-gray-500 ml-2">通知 {inspectedObj.content.length}件</span>
              )}
            </h3>
            {typeof inspectedObj.content === "string" ? (
              <p className="text-gray-700 text-sm mb-4 whitespace-pre-line">{inspectedObj.content}</p>
            ) : (
              <div className="mb-4 space-y-2">
                {inspectedObj.content.map((msg, i) => (
                  <div key={i} className="bg-gray-100 rounded-xl p-3 text-sm space-y-1">
                    {/* 手がかりを別行で明示：送信元名・実アドレス・日時・本文・リンク先URL */}
                    <p className="text-xs text-gray-500">送信元：<span className="text-gray-700">{msg.sender}</span></p>
                    {msg.senderAddress && (
                      <p className="text-xs text-gray-500 font-mono break-all">アドレス：<span className="text-gray-800">{msg.senderAddress}</span></p>
                    )}
                    <p className="text-xs text-gray-500">日時：<span className="text-gray-700">{msg.timestamp}</span></p>
                    <p className="text-gray-800 pt-1 border-t border-gray-200 mt-1">{msg.body}</p>
                    {msg.url && (
                      <p className="text-xs text-gray-500 font-mono break-all pt-1">リンク先：<span className="text-blue-700">{msg.url}</span></p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleCloseInspect}
              className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-bold"
            >
              確認した（閉じる）
            </button>
          </div>
        </div>
      )}

      {/* 判定UI */}
      {showJudge && phase === "judging" && (
        <ConfidenceSlider
          onSubmit={handleSubmit}
          hint={scenario.hint}
          hintUsed={hintUsed}
          onUseHint={useHint}
        />
      )}

      {/* フィードバック */}
      {phase === "feedback" && lastResult && (
        <FeedbackCard
          correct={lastResult.correct}
          title={scenario.title}
          explanation={scenario.explanation}
          learningPoint={scenario.learningPoint}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
