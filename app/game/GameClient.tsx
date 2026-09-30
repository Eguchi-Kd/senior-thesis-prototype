"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Room } from "@/components/game/Room";
import { FPSControls } from "@/components/game/FPSControls";
import { PostFX } from "@/components/game/PostFX";
import { ConfidenceSlider } from "@/components/ui/ConfidenceSlider";
import { FeedbackCard } from "@/components/ui/FeedbackCard";
import { StageScreen } from "@/components/ui/StageScreen";
import { useGameStore, type Decision } from "@/store/gameStore";
import { getScenarioById } from "@/lib/scenarios";
import { practiceScenario } from "@/scenarios/practice";
import { saveSnapshot } from "@/lib/logger";
import { addToCollection, scenarioCardId } from "@/lib/collection";

type Stage = "intro" | "practice" | "main" | "outro";

// 本編の終了画面。ここから先（事後テスト・アンケート）は縦画面なので、横画面ロックを解除して縦持ちを促す
function GameOutro({ total, freePlay, onNext }: { total: number; freePlay: boolean; onNext: () => void }) {
  useEffect(() => {
    try {
      (screen.orientation as unknown as { unlock?: () => void })?.unlock?.();
    } catch {
      /* 非対応環境は無視 */
    }
  }, []);
  return (
    <StageScreen
      step={freePlay ? "自由プレイ" : "STEP 2 / 3 クリア"}
      emoji="🏆"
      title="ゲーム本編クリア！"
      buttonLabel={freePlay ? "結果発表へ →" : "事後テストへ →"}
      onNext={onNext}
    >
      <p>全{total}問、おつかれさまでした！ {freePlay ? "遊んでくれてありがとう！" : "ご協力ありがとうございます。"}</p>
      {!freePlay && <p>最後に、学んだことを確かめる短いテストとアンケートがあります。結果発表はそのあと！</p>}
      <div className="flex items-center gap-3 bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 mt-2">
        <span className="text-3xl animate-pulse">📱↻</span>
        <p className="text-amber-200 font-bold">ここからは、スマホを <span className="text-amber-100">縦向き</span> に戻してください。</p>
      </div>
    </StageScreen>
  );
}
type PracticeCheck = { move: boolean; look: boolean; inspect: boolean };

export default function GameClient() {
  const router = useRouter();
  const {
    phase, setPhase, startTimer, markScenarioStart, markJudgeOpen, submitDecision, nextScenario,
    hintUsed, useHint, recordInspect, closeInspect, markPhase, completePractice,
    currentInspected, scenarioOrder, currentIndex, practiceDone, logs, playMode,
  } = useGameStore();

  // 再読み込み時：本編を終えていれば終了画面、練習済みなら本編から
  const [stage, setStage] = useState<Stage>(() =>
    phase === "transfer_test" ? "outro" : practiceDone ? "main" : "intro",
  );
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showJudge, setShowJudge] = useState(false);
  const [draftDecision, setDraftDecision] = useState<Decision | null>(null);
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null);
  // 解説の表示中に再読み込みした場合は、記録済みの判定から同じ解説を再表示する
  const [lastResult, setLastResult] = useState<{ correct: boolean; newCard: boolean } | null>(() =>
    phase === "feedback" && logs.length > currentIndex ? { correct: logs[currentIndex].correct, newCard: false } : null,
  );
  const [practice, setPractice] = useState<PracticeCheck>({ move: false, look: false, inspect: false });
  const [practiceDoneModal, setPracticeDoneModal] = useState(false);

  const inPractice = stage === "practice";
  const scenario = inPractice ? practiceScenario : getScenarioById(scenarioOrder[currentIndex]);
  const isLast = currentIndex >= scenarioOrder.length - 1;

  // 本編の各シナリオ開始で時刻・per-scenario 状態をリセット
  useEffect(() => {
    if (stage !== "main") return;
    markPhase("gameStart");
    markScenarioStart();
    setDraftDecision(null);
    setDraftConfidence(null);
  }, [stage, currentIndex, markScenarioStart, markPhase]);

  const onActivity = useCallback((kind: "move" | "look") => {
    setPractice((p) => (p[kind] ? p : { ...p, [kind]: true }));
  }, []);

  const handleInspect = (id: string) => {
    if (inspectedId || showJudge || lastResult) return;
    if (inPractice) {
      setInspectedId(id);
      setPractice((p) => (p.inspect ? p : { ...p, inspect: true }));
      return;
    }
    // 記録できない状態ではパネルも開かない（開いたのに記録されない、を防ぐ）
    if (phase !== "exploring" && phase !== "investigating") return;
    setInspectedId(id);
    recordInspect(id);
    setPhase("investigating");
    startTimer(); // シナリオ内で最初の調査時のみ計測開始（store側でガード）
  };

  // 調査パネルを閉じたら探索に戻す（他のオブジェクトも調べられる）
  const handleCloseInspect = () => {
    setInspectedId(null);
    if (inPractice) return;
    closeInspect();
    setPhase("exploring");
  };

  // 関連オブジェクトの数を悟らせないため、確認ダイアログや件数表示は出さない
  const openJudge = () => {
    if (inPractice) {
      setPracticeDoneModal(true);
      return;
    }
    markJudgeOpen();
    setShowJudge(true);
    setPhase("judging");
  };

  // 判定画面から探索に戻って調べ直す（答え・確信度・ヒントは保持）
  const backToExplore = () => {
    setShowJudge(false);
    setPhase("exploring");
  };

  const handleSubmit = () => {
    if (!draftDecision || draftConfidence == null) return;
    const correct =
      (draftDecision === "report" && scenario.isFraud) || (draftDecision === "ignore" && !scenario.isFraud);
    submitDecision(draftDecision, draftConfidence, correct, scenario.isFraud);
    const newCard = correct ? addToCollection(scenarioCardId(scenario.id)) : false;
    setLastResult({ correct, newCard });
    setShowJudge(false);
    setPhase("feedback");
    void saveSnapshot(); // シナリオ完了ごとに逐次保存
  };

  const handleNext = () => {
    setLastResult(null);
    setInspectedId(null);
    if (isLast) markPhase("gameEnd");
    nextScenario(); // 最後なら phase=transfer_test
    if (isLast) {
      void saveSnapshot();
      setStage("outro");
    }
  };

  const startPractice = () => {
    markPhase("practiceStart");
    setPhase("practice");
    setStage("practice");
  };

  const finishPractice = () => {
    markPhase("practiceEnd");
    completePractice();
    setPracticeDoneModal(false);
    setInspectedId(null);
    setPhase("exploring");
    setStage("main");
  };

  // ─── 区切り画面 ───
  if (stage === "intro") {
    return (
 <StageScreen step={playMode === "free" ? "自由プレイ" : "STEP 2 / 3"} emoji="🏠" title="ゲーム本編" buttonLabel="操作の練習へ →" onNext={startPractice}>
        <p>あなたは部屋にいる探偵です。スマホに届いた通知の中に <b>詐欺</b> がまぎれていないか、部屋にある情報（カレンダー・メモ・ポスター）と見比べて見破ろう。</p>
        <p>全{scenarioOrder.length}問。まずは30秒ほど、操作の練習をします。</p>
        <p className="text-gray-400 text-xs">📱 スマホは横向きでプレイしてください。</p>
      </StageScreen>
    );
  }
  if (stage === "outro") {
    return <GameOutro total={scenarioOrder.length} freePlay={playMode === "free"} onNext={() => router.push("/result")} />;
  }

  const inspectedObj = scenario.objects.find((o) => o.id === inspectedId);
  const controlsEnabled = !inspectedObj && !showJudge && !lastResult && !practiceDoneModal;
  const practiceReady = practice.move && practice.look && practice.inspect;

  return (
    <div className="w-full h-dvh bg-black relative overflow-hidden">
      {/* 縦持ち時の回転誘導オーバーレイ（横画面でプレイさせる） */}
      <div className="hidden portrait:flex fixed inset-0 z-[60] bg-gray-950 flex-col items-center justify-center text-center px-8">
        <div className="text-6xl mb-4 animate-pulse">📱↻</div>
        <p className="text-white text-lg font-bold">端末を横向きにしてください</p>
        <p className="text-gray-400 text-sm mt-2">このゲームは横画面でプレイします</p>
      </div>

      <Canvas shadows dpr={[1, 2]} camera={{ fov: 75 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Room onInspect={handleInspect} scenario={scenario} />
          <FPSControls enabled={controlsEnabled} onActivity={inPractice ? onActivity : undefined} />
        </Suspense>
        <PostFX />
      </Canvas>

      {/* 進捗バー（本編のみ） */}
      {!inPractice && (
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

      {/* 操作練習のチェックリスト */}
      {inPractice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-black/70 backdrop-blur rounded-2xl px-4 py-2 text-white text-xs pointer-events-none">
          <p className="font-bold text-center mb-1">🎮 操作練習（記録されません）</p>
          <div className="flex gap-3">
            <span className={practice.move ? "text-green-400" : ""}>{practice.move ? "✅" : "⬜"} 移動（左スティック / WASD）</span>
            <span className={practice.look ? "text-green-400" : ""}>{practice.look ? "✅" : "⬜"} 見回す（右スティック / ドラッグ）</span>
            <span className={practice.inspect ? "text-green-400" : ""}>{practice.inspect ? "✅" : "⬜"} 🔍ラベルをタップして調べる</span>
          </div>
        </div>
      )}

      {/* クロスヘア */}
      {controlsEnabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full opacity-60" />
        </div>
      )}

      {/* 探索ガイド（本編でまだ何も調べていないとき） */}
      {!inPractice && phase === "exploring" && currentInspected.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs text-center pointer-events-none px-4">
          左スティックで移動 ・ 右スティックで見回す<br />
          （PC: WASDで移動・ドラッグで視点） 近づいてタップで調べる
        </div>
      )}

      {/* 判定ボタン：本編は1つ以上調べたら、練習は3項目クリアで表示 */}
      {controlsEnabled &&
        ((inPractice && practiceReady) || (!inPractice && phase === "exploring" && currentInspected.length >= 1)) && (
          <button
            onClick={openJudge}
            className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg pointer-events-auto ${
              inPractice ? "animate-bounce" : ""
            }`}
          >
            ⚖️ 判定する
          </button>
        )}

      {/* 移動ジョイスティックゾーン（左下） */}
      <div id="joystick-zone" className="absolute bottom-0 left-0 w-1/3 h-1/2 pointer-events-auto z-30" />
      {/* 視点ジョイスティックゾーン（右下） */}
      <div id="look-zone" className="absolute bottom-0 right-0 w-1/3 h-1/2 pointer-events-auto z-30" />

      {/* 調査パネル */}
      {inspectedObj && (
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
            <button onClick={handleCloseInspect} className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-bold">
              確認した（閉じる）
            </button>
          </div>
        </div>
      )}

      {/* 練習完了 */}
      {practiceDoneModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-2">👍</div>
            <h3 className="text-lg font-bold mb-2">操作はバッチリ！</h3>
            <p className="text-sm text-gray-600 mb-5">
              本番では、判定画面で「詐欺あり／なし」と自信の度合いを選びます。<br />
              迷ったら「もう一度調べる」で部屋に戻れます。
            </p>
            <button onClick={finishPractice} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">
              本番スタート →
            </button>
          </div>
        </div>
      )}

      {/* 判定UI（本編） */}
      {showJudge && phase === "judging" && (
        <ConfidenceSlider
          decision={draftDecision}
          confidence={draftConfidence}
          onDecision={setDraftDecision}
          onConfidence={setDraftConfidence}
          onSubmit={handleSubmit}
          onBack={backToExplore}
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
          newCard={lastResult.newCard}
          isLast={isLast}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
