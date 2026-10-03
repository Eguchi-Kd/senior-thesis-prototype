"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Room } from "@/components/game/Room";
import { FPSControls } from "@/components/game/FPSControls";
import { PostFX } from "@/components/game/PostFX";
import { ConfidenceSlider } from "@/components/ui/ConfidenceSlider";
import { FeedbackCard } from "@/components/ui/FeedbackCard";
import { StageScreen } from "@/components/ui/StageScreen";
import { OrientationButton, useJustEnteredFullscreen } from "@/components/ui/OrientationButton";
import { ScrollPanel } from "@/components/ui/ScrollHint";
import { cycleSensitivity, getSensitivity, requestRecenter, SENSITIVITY_LABEL, type LookSensitivity } from "@/lib/lookControl";
import { useDevice } from "@/lib/device";
import { useGameStore, type Decision } from "@/store/gameStore";
import { getScenarioById } from "@/lib/scenarios";
import { practiceScenario } from "@/scenarios/practice";
import { saveSnapshot } from "@/lib/logger";
import { resumePath } from "@/lib/progress";
import { addToCollection, scenarioCardId } from "@/lib/collection";

type Stage = "intro" | "practice" | "main" | "outro";

// 移動スティックの位置：画面下端から高さの約22%（最低80px）＋セーフエリア、左端から少し内側
const STICK_STYLE = {
  width: 150,
  height: 150,
  left: "calc(max(5vw, 20px) + env(safe-area-inset-left))",
  bottom: "calc(max(22dvh, 80px) + env(safe-area-inset-bottom))",
} as const;
// 右側の補助ボタン（スティックと同じ高さ）
const LOOK_TOOLS_STYLE = {
  right: "calc(max(5vw, 20px) + env(safe-area-inset-right))",
  bottom: "calc(max(22dvh, 80px) + env(safe-area-inset-bottom) + 20px)",
} as const;

// URL（リンク）か、振込先・電話番号などの「要求」かでラベルを分ける
const isLink = (v: string) => /^https?:\/\//.test(v);

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
      <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 mt-2 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-pulse">📱↻</span>
          <p className="text-amber-200 font-bold">ここからは、スマホを <span className="text-amber-100">縦向き</span> に戻してください。</p>
        </div>
        <OrientationButton dir="portrait" />
      </div>
    </StageScreen>
  );
}
// 操作練習の段階（1手順＝1動作。できたら自動で次へ）。文言はスマホ（touch）と PC（pc）で出し分ける
const PRACTICE_STEPS = [
  {
    key: "look", title: "見回す",
    touch: "画面を指でなぞって、部屋を見回してみよう",
    pc: "画面をマウスでドラッグして、部屋を見回してみよう",
    sub: "見回す速さは右の「感度」ボタンで 低・中・高 に変えられます",
  },
  { key: "recenter", title: "正面に戻す", touch: "右下の「🎯 正面」を押すと、机の方向に向き直れます", pc: "右下の「🎯 正面」をクリックすると、机の方向に向き直れます" },
  { key: "move", title: "歩く", touch: "左下のスティックを上に倒して、前へ進んでみよう", pc: "W キー（または ↑）で前へ進んでみよう。A・S・D で左・後ろ・右に動けます" },
  {
    key: "phone", title: "スマホの通知を見る",
    touch: "「🔍 スマートフォン」を押して、届いた通知を見てみよう。見たら「確認した」で閉じます",
    pc: "「🔍 スマートフォン」をクリックして、届いた通知を見てみよう。見たら「確認した」で閉じます",
  },
  { key: "room", title: "部屋の情報を見る", touch: "カレンダー・メモ・ポスターのどれかを🔍で調べてみよう", pc: "カレンダー・メモ・ポスターのどれかの🔍をクリックして調べてみよう" },
  { key: "hint", title: "ヒントを見る", touch: "迷ったら「💡 ヒント」。押してみよう（もう一度押すか × で閉じます）", pc: "迷ったら「💡 ヒント」。クリックしてみよう（もう一度押すか × で閉じます）" },
  {
    key: "judge", title: "判定する",
    touch: "集めた情報とスマホの通知を見比べて、食い違い（矛盾）がないか考えたら「⚖️ 判定する」",
    pc: "集めた情報とスマホの通知を見比べて、食い違い（矛盾）がないか考えたら「⚖️ 判定する」",
  },
  {
    key: "decide", title: "答えて決定",
    touch: "詐欺あり／なしと自信の度合いを選んで「決定する」。練習なのでどちらを選んでも大丈夫",
    pc: "詐欺あり／なしと自信の度合いを選んで「決定する」。練習なのでどちらを選んでも大丈夫",
  },
] as const;
type PracticeKey = (typeof PRACTICE_STEPS)[number]["key"];
const ROOM_IDS = ["calendar", "receipt", "poster", "id_card"];

export default function GameClient() {
  const router = useRouter();
  const {
    phase, setPhase, startTimer, markScenarioStart, markJudgeOpen, submitDecision, nextScenario,
    hintUsed, takeHint, recordInspect, closeInspect, markPhase, completePractice,
    currentInspected, scenarioOrder, currentIndex, practiceDone, logs, playMode,
  } = useGameStore();

  // 入場時の行き先を、phase ではなく回答済みデータから決める（戻る・再入場で操作不能にならないように）
  const gameDone = logs.length >= scenarioOrder.length;
  const showSavedFeedback = phase === "feedback" && logs.length > currentIndex; // 解説の表示中に再読み込み/再入場
  const [entry] = useState<"stay" | "toResult" | "toEarlier">(() => {
    const s = useGameStore.getState();
    const path = resumePath(s);
    // 開発用の直行（テスト実行・同意なし）は前の工程へ戻さない
    if ((path === "/consent" || path === "/intake" || path === "/pretest") && !(s.testRun && !s.consent.agreed)) return "toEarlier";
    // 本編を終えて事後テスト・アンケート・結果に進んでいる → 結果側（ResultClient が回答データから画面を復元）
    if (gameDone && !showSavedFeedback && phase !== "transfer_test") return "toResult";
    return "stay";
  });
  const [stage, setStage] = useState<Stage>(() =>
    gameDone && !showSavedFeedback ? "outro" : practiceDone ? "main" : "intro",
  );

  useEffect(() => {
    if (entry === "toResult") router.replace("/result");
    else if (entry === "toEarlier") router.replace(resumePath(useGameStore.getState()));
    // 本編の途中で他の画面から戻ってきた場合、段階を探索中に戻す（調査・判定・ヒントが効かなくなるのを防ぐ）
    else if (practiceDone && !gameDone && !showSavedFeedback) setPhase("exploring");
    // 入場時に一度だけ判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 調査パネルを開いたまま本編を離れた場合は、離れた時点で閉じた扱いにする（離れていた時間を dwellMs に入れない）
  useEffect(() => () => useGameStore.getState().closeInspect(), []);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [showJudge, setShowJudge] = useState(false);
  const [draftDecision, setDraftDecision] = useState<Decision | null>(null);
  const [draftConfidence, setDraftConfidence] = useState<number | null>(null);
  // 解説の表示中に再読み込みした場合は、記録済みの判定から同じ解説を再表示する
  const [lastResult, setLastResult] = useState<{ correct: boolean; newCard: boolean } | null>(() =>
    phase === "feedback" && logs.length > currentIndex ? { correct: logs[currentIndex].correct, newCard: false } : null,
  );
  const [practiceStep, setPracticeStep] = useState(0);
  const [banner, setBanner] = useState<number | null>(null); // 問題開始の表示（第n問）
  const [practiceDoneModal, setPracticeDoneModal] = useState(false);
  const [showHintCard, setShowHintCard] = useState(false);
  const device = useDevice();
  const isPC = device === "pc";
  // 全画面に入った直後は Chrome の通知が画面下に出るので、下のボタンを上へ逃がす
  const justFullscreen = useJustEnteredFullscreen(4000);
  // 練習：段階をクリアしたときに画面中央へ出す表示（約1.4秒。操作は止めない）
  const [stepToast, setStepToast] = useState<{ n: number; title: string; next: string } | null>(null);
  const prevStep = useRef(0);
  useEffect(() => {
    const done = prevStep.current;
    prevStep.current = practiceStep;
    // 最後の「答えて決定」は練習完了の画面が代わりになるので出さない
    if (practiceStep <= done || practiceStep >= PRACTICE_STEPS.length) return;
    setStepToast({ n: done + 1, title: PRACTICE_STEPS[done].title, next: PRACTICE_STEPS[practiceStep].title });
    const t = setTimeout(() => setStepToast(null), 1400);
    return () => clearTimeout(t);
  }, [practiceStep]);

  const inPractice = stage === "practice";
  const scenario = inPractice ? practiceScenario : getScenarioById(scenarioOrder[currentIndex]);
  const isLast = currentIndex >= scenarioOrder.length - 1;

  // 本編の各シナリオ開始で時刻・per-scenario 状態をリセット
  useEffect(() => {
    if (stage !== "main" || entry !== "stay") return; // 別の画面へ送る場合は計測を始めない
    markPhase("gameStart");
    markScenarioStart();
    setDraftDecision(null);
    setDraftConfidence(null);
    setShowHintCard(false);
    setBanner(currentIndex + 1);
    const t = setTimeout(() => setBanner(null), 2200);
    return () => clearTimeout(t);
  }, [stage, currentIndex, markScenarioStart, markPhase, entry]);

  // 練習：いまの段階の動作が済んだら次の段階へ（先の段階の動作を先にしても進まない）
  const advance = useCallback((done: PracticeKey) => {
    setPracticeStep((i) => (PRACTICE_STEPS[i]?.key === done ? i + 1 : i));
  }, []);
  const onActivity = useCallback((kind: "move" | "look" | "recenter") => advance(kind), [advance]);
  const [sens, setSens] = useState<LookSensitivity>("mid");
  useEffect(() => setSens(getSensitivity()), []);

  const handleInspect = (id: string) => {
    if (inspectedId || showJudge || lastResult) return;
    if (inPractice) {
      setInspectedId(id); // 練習：閉じた時点で段階を進める
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
    if (inPractice) {
      advance(inspectedId === "smartphone" ? "phone" : "room");
      setInspectedId(null);
      return;
    }
    setInspectedId(null);
    closeInspect();
    setPhase("exploring");
  };

  // 関連オブジェクトの数を悟らせないため、確認ダイアログや件数表示は出さない
  const openJudge = () => {
    if (inPractice) {
      advance("judge");
      setShowJudge(true); // 練習：判定画面の操作を体験（正解なし・記録なし）
      return;
    }
    markJudgeOpen();
    setShowJudge(true);
    setPhase("judging");
  };

  // ヒントの表示（初回だけ記録。判定画面から戻って調べ直している場合は、その時選んでいた答えも記録）
  const openHint = () => {
    if (inPractice) {
      advance("hint");
    } else if (!hintUsed) {
      takeHint(draftDecision);
    }
    setShowHintCard((v) => !v);
  };

  // 判定画面から探索に戻って調べ直す（答え・確信度・ヒントは保持）
  const backToExplore = () => {
    setShowJudge(false);
    if (!inPractice) setPhase("exploring");
  };

  const handleSubmit = () => {
    if (!draftDecision || draftConfidence == null) return;
    if (inPractice) {
      // 練習の判定は記録せず、正解も示さない（詐欺の手がかりを事前に教えない）
      setShowJudge(false);
      setDraftDecision(null);
      setDraftConfidence(null);
      setShowHintCard(false);
      advance("decide");
      setPracticeDoneModal(true);
      return;
    }
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

  const skipPractice = () => {
    markPhase("practiceSkipped");
    completePractice();
    setPhase("exploring");
    setStage("main");
  };

  const finishPractice = () => {
    markPhase("practiceEnd");
    completePractice();
    setPracticeDoneModal(false);
    setInspectedId(null);
    setPhase("exploring");
    setStage("main");
  };

  if (entry !== "stay") return null;

  // ─── 区切り画面 ───
  if (stage === "intro") {
    const free = playMode === "free";
    return (
      <StageScreen
        step={free ? "自由プレイ" : "STEP 2 / 3"}
        emoji="🏠"
        title="ゲーム本編"
        buttonLabel={free ? "本編をはじめる →" : "操作の練習へ →"}
        onNext={free ? skipPractice : startPractice}
      >
        <p>あなたは部屋にいる探偵です。スマホに届いた通知の中に <b>詐欺</b> がまぎれていないか、部屋にある情報（カレンダー・メモ・ポスター）と見比べて見破ろう。</p>
        {free ? (
          <p>
            全{scenarioOrder.length}問。2回目以降なので操作の練習は省略します。
            <button onClick={startPractice} className="ml-1 underline text-blue-300">操作を確認する</button>
          </p>
        ) : (
          <p>全{scenarioOrder.length}問。まずは1分ほど、ゲームの流れを練習します。</p>
        )}
        <p className="text-gray-400 text-sm">
          {isPC
            ? "🖱️ マウスとキーボードで操作します。"
            : device === "ios"
              ? "📱 画面の回転ロックを解除して、スマホを横向きにしてプレイしてください。"
              : "📱 スマホは横向きでプレイしてください。下のボタンで横向きにできます。"}
        </p>
        {/* Android：部屋に入る前に横向き（全画面）にしておく。全画面の通知がこの画面の上で出て消え、ゲームのボタンを隠さない */}
        {device === "android" && <OrientationButton dir="landscape" />}
      </StageScreen>
    );
  }
  if (stage === "outro") {
    return <GameOutro total={scenarioOrder.length} freePlay={playMode === "free"} onNext={() => router.push("/result")} />;
  }

  const inspectedObj = scenario.objects.find((o) => o.id === inspectedId);
  const controlsEnabled = !inspectedObj && !showJudge && !lastResult && !practiceDoneModal;
  const step = inPractice ? PRACTICE_STEPS[practiceStep]?.key : undefined;
  // 練習では、いまの段階で使う物のラベルだけを出す（他は隠して迷わないように）
  const visibleIds = !inPractice ? undefined : step === "phone" ? ["smartphone"] : step === "room" ? ROOM_IDS : [];
  const showJudgeButton = inPractice ? step === "judge" : phase === "exploring" && currentInspected.length >= 1;
  const showHintButton = inPractice ? step === "hint" || step === "judge" : phase === "exploring";
  const showRecenter = !inPractice || practiceStep >= 1; // 🎯正面は「正面に戻す」の段階から
  // 「下にスクロール」の合図と画面下の操作説明は、練習と第1問だけ（操作に慣れた2問目以降は出さない）
  const firstRound = inPractice || currentIndex === 0;
  // 本編の第1問だけ、進め方の手順を小さく表示（どの物を見るべきかは示さない）
  const showGuide = !inPractice && currentIndex === 0 && !lastResult;
  const sawPhone = currentInspected.includes("smartphone");
  const sawRoom = currentInspected.some((id) => id !== "smartphone");
  const ring = "ring-4 ring-yellow-300 animate-pulse";

  return (
    <div className="w-full h-dvh bg-black relative overflow-hidden">
      {/* 縦持ち時の回転誘導オーバーレイ（横画面でプレイさせる） */}
      <div className="hidden portrait:flex fixed inset-0 z-[60] bg-gray-950 flex-col items-center justify-center text-center px-8">
        <div className="text-6xl mb-4 animate-pulse">📱↻</div>
        <p className="text-white text-xl font-bold">端末を横向きにしてください</p>
        <p className="text-gray-400 text-base mt-2 mb-4">このゲームは横画面でプレイします</p>
        <OrientationButton dir="landscape" />
      </div>

      <Canvas shadows dpr={[1, 2]} camera={{ fov: 75 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <Room onInspect={handleInspect} scenario={scenario} visibleIds={visibleIds} />
          {/* 練習→本編、各問の開始で位置と向きを初期位置に戻す */}
          <FPSControls enabled={controlsEnabled} resetKey={`${stage}-${currentIndex}`} onActivity={inPractice ? onActivity : undefined} />
        </Suspense>
        <PostFX />
      </Canvas>

      {/* 進捗バー（本編のみ） */}
      {!inPractice && (
        <div className="absolute top-4 left-4 w-40 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/80 text-sm">進捗</span>
            <span className="text-white/80 text-sm ml-auto">
              {currentIndex + 1} / {scenarioOrder.length}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / scenarioOrder.length) * 100}%` }}
            />
          </div>
          <p className="text-white/70 text-xs mt-1">
            {scenarioOrder.length - currentIndex > 1 ? `あと${scenarioOrder.length - currentIndex}問でクリア！` : "ラスト1問！"}
          </p>
        </div>
      )}

      {/* 問題開始の表示（どの物を先に見るかへは誘導しない） */}
      {banner != null && !inPractice && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 backdrop-blur rounded-2xl px-8 py-4 text-center text-white">
            <p className="text-3xl font-black">第{banner}問 <span className="text-lg font-bold text-white/70">/ 全{scenarioOrder.length}問</span></p>
            <p className="text-base text-white/85 mt-1">部屋の情報とスマホを見比べよう</p>
          </div>
        </div>
      )}

      {/* 操作練習：いまの段階の指示だけを表示 */}
      {inPractice && step && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,34rem)] bg-black/75 backdrop-blur rounded-2xl px-4 py-2.5 text-white pointer-events-none">
          <p className="text-xs text-yellow-300 font-bold text-center">
            🎮 練習 {practiceStep + 1} / {PRACTICE_STEPS.length}：{PRACTICE_STEPS[practiceStep].title}（記録されません）
          </p>
          <p className="text-base text-center leading-snug mt-0.5">{PRACTICE_STEPS[practiceStep][isPC ? "pc" : "touch"]}</p>
          {"sub" in PRACTICE_STEPS[practiceStep] && (
            <p className="text-sm text-center text-white/80 leading-snug mt-1">{(PRACTICE_STEPS[practiceStep] as { sub: string }).sub}</p>
          )}
        </div>
      )}
      {/* 練習「見回す」：右側をなぞる合図 */}
      {inPractice && step === "look" && controlsEnabled && (
        <div className="absolute right-[12%] top-1/2 -translate-y-1/2 z-20 pointer-events-none text-center text-white">
          <div className="text-5xl animate-sway">{isPC ? "🖱️" : "👆"}</div>
          <p className="text-sm font-bold bg-black/60 rounded-full px-3 py-1 mt-1">{isPC ? "← ドラッグ →" : "← なぞる →"}</p>
        </div>
      )}

      {/* 練習：段階をクリアしたら画面中央に表示（判定画面の上にも出る・操作は止めない） */}
      <AnimatePresence>
        {inPractice && stepToast && (
          <motion.div
            key={stepToast.n}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="absolute inset-0 z-[65] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-green-600/95 text-white rounded-2xl px-8 py-4 text-center shadow-2xl">
              <p className="text-2xl font-black">✅ できた！</p>
              <p className="text-base font-bold mt-1">練習 {stepToast.n} / {PRACTICE_STEPS.length}：{stepToast.title}</p>
              <p className="text-sm text-white/85 mt-1">次：{stepToast.next}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 本編の第1問：進め方の手順（済んだら✓。強制はしない）。進捗バーの右隣に置く（右上はポスターのラベルが出る位置なので避ける） */}
      {showGuide && controlsEnabled && (
        <div className="absolute top-3 left-[12.5rem] z-20 bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-white text-sm pointer-events-none space-y-0.5">
          <p className="text-xs text-white/70 font-bold">進め方</p>
          <p className={sawPhone ? "text-green-300" : ""}>{sawPhone ? "✓" : "①"} 📱 スマホの通知を見る</p>
          <p className={sawRoom ? "text-green-300" : ""}>{sawRoom ? "✓" : "②"} 🏠 部屋の情報を見る</p>
          <p>③ ⚖️ 見比べて判定する</p>
        </div>
      )}

      {/* クロスヘア */}
      {controlsEnabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-white rounded-full opacity-60" />
        </div>
      )}

      {/* 操作説明（練習中と、第1問でまだ何も調べていないとき。2問目以降は出さない） */}
      {controlsEnabled && !justFullscreen && (inPractice || (currentIndex === 0 && phase === "exploring" && currentInspected.length === 0)) && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center pointer-events-none px-4 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          {isPC ? (
            <>WASD・矢印キーで移動 ・ ドラッグで見回す<br />🔍 をクリックで調べる</>
          ) : (
            <>左のスティックで移動 ・ 画面をなぞって見回す<br />近づいて 🔍 をタップで調べる</>
          )}
        </div>
      )}

      {/* 下部ボタン：判定（本編は1つ以上調べたら／練習は3項目クリアで表示）＋ヒント（本編の探索中は最初から表示） */}
      {controlsEnabled && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 transition-[bottom] duration-300 ${
            justFullscreen ? "bottom-24" : "bottom-5"
          }`}
        >
          {showJudgeButton && (
            <button
              onClick={openJudge}
              className={`px-6 py-3 bg-blue-600 text-white text-base font-bold rounded-full shadow-lg pointer-events-auto ${
                inPractice ? ring : ""
              }`}
            >
              ⚖️ 判定する
            </button>
          )}
          {showHintButton && (
            <button
              onClick={openHint}
              className={`px-5 py-3 bg-amber-400 text-amber-950 text-base font-bold rounded-full shadow-lg pointer-events-auto ${
                inPractice && step === "hint" ? ring : ""
              }`}
            >
              💡 ヒント
            </button>
          )}
        </div>
      )}

      {/* ヒント（どこを見比べるかだけを示す。入口はこのボタンのみ） */}
      {showHintCard && (inPractice || phase === "exploring") && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-[min(90vw,28rem)] bg-amber-100 text-amber-950 rounded-2xl shadow-lg p-3 pointer-events-auto">
          <div className="flex items-start gap-2">
            <p className="text-base leading-relaxed flex-1">
              <span className="font-bold">💡 ヒント：</span>
              {scenario.hint}
            </p>
            <button
              onClick={() => setShowHintCard(false)}
              className="shrink-0 -mt-1 -mr-1 w-11 h-11 rounded-full bg-amber-200 active:bg-amber-300 text-amber-900 text-2xl font-black leading-none flex items-center justify-center"
              aria-label="ヒントを閉じる"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 移動ジョイスティック：親指が届く高さの小さな円だけ（3Dのラベルを覆わない） */}
      <div
        id="joystick-zone"
        className={`absolute z-30 rounded-full pointer-events-auto ${inPractice && step === "move" ? ring : ""}`}
        style={STICK_STYLE}
      />
      {/* 右側：正面に戻す・視点の感度（なぞって見回す操作の補助） */}
      {controlsEnabled && (
        <div className="absolute z-30 flex flex-col items-center gap-2" style={LOOK_TOOLS_STYLE}>
          {showRecenter && (
          <button
            onClick={requestRecenter}
            className={`w-16 h-16 rounded-full bg-black/60 border border-white/40 text-white text-sm font-bold leading-tight shadow-lg pointer-events-auto ${
              inPractice && step === "recenter" ? ring : ""
            }`}
            aria-label="正面に戻す"
          >
            🎯<br />正面
          </button>
          )}
          <button
            onClick={() => setSens(cycleSensitivity())}
            className={`px-3 py-1.5 rounded-full bg-black/60 border border-white/30 text-white text-xs font-bold pointer-events-auto ${
              inPractice && step === "look" ? "ring-2 ring-yellow-300/80" : ""
            }`}
          >
            感度：{SENSITIVITY_LABEL[sens]}
          </button>
        </div>
      )}

      {/* 調査パネル */}
      {inspectedObj && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <ScrollPanel hint={firstRound} className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90dvh]">
            <h3 className="font-bold text-xl mb-3">
              {inspectedObj.label}
              {typeof inspectedObj.content !== "string" && (
                <span className="text-sm font-normal text-gray-500 ml-2">通知 {inspectedObj.content.length}件</span>
              )}
            </h3>
            {typeof inspectedObj.content === "string" ? (
              <p className="text-gray-800 text-base leading-relaxed mb-4 whitespace-pre-line">{inspectedObj.content}</p>
            ) : (
              <div className="mb-4 space-y-2">
                {inspectedObj.content.map((msg, i) => msg.type === "alert" ? (
                  <div key={i} className="rounded-xl overflow-hidden border-2 border-red-600 text-base shadow-lg">
                    <div className="bg-gray-200 px-3 py-1 text-xs text-gray-600 flex justify-between">
                      <span>🌐 {msg.sender}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="bg-red-600 text-white px-3 py-2 font-black flex items-center gap-2">
                      <span className="text-xl">⚠️</span> セキュリティ警告
                    </div>
                    <div className="bg-white px-3 py-3 space-y-2">
                      <p className="text-red-700 font-bold leading-relaxed">{msg.body}</p>
                      {msg.url && (
                        <p className="text-base text-gray-500 break-all">
                          求められていること：<span className="text-gray-900 font-bold">{msg.url}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="bg-gray-100 rounded-xl p-3 text-base space-y-1">
                    {/* 手がかりを別行で明示：表示名・実際の番号/アドレス・日時・本文・リンク先 or 要求内容 */}
                    <p className="text-[15px] text-gray-500">送信元：<span className="text-gray-800">{msg.sender}</span></p>
                    {msg.senderAddress && (
                      <p className="text-[15px] text-gray-500 break-all">送信元の番号・アドレス：<span className="text-gray-900 font-mono">{msg.senderAddress}</span></p>
                    )}
                    <p className="text-[15px] text-gray-500">日時：<span className="text-gray-800">{msg.timestamp}</span></p>
                    <p className="text-gray-900 pt-1 border-t border-gray-200 mt-1">{msg.body}</p>
                    {msg.url && (
                      <p className="text-[15px] text-gray-500 break-all pt-1">
                        {isLink(msg.url) ? "リンク先：" : "求められていること："}
                        <span className={isLink(msg.url) ? "text-blue-700 font-mono" : "text-gray-900"}>{msg.url}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleCloseInspect} className="w-full py-2.5 bg-gray-800 text-white rounded-xl text-base font-bold">
              確認した（閉じる）
            </button>
          </ScrollPanel>
        </div>
      )}

      {/* 練習完了 */}
      {practiceDoneModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-2">👍</div>
            <h3 className="text-lg font-bold mb-2">流れはバッチリ！</h3>
            <p className="text-sm text-gray-600 mb-5">
              本番も同じ流れです：部屋の情報とスマホを調べる → 迷ったら💡ヒント → ⚖️判定する。<br />
              判定画面の「もう一度調べる」で部屋に戻ることもできます。練習の判定には正解はありません。
            </p>
            <button onClick={finishPractice} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">
              本番スタート →
            </button>
          </div>
        </div>
      )}

      {/* 判定UI（本編） */}
      {showJudge && (phase === "judging" || inPractice) && (
        <ConfidenceSlider
          decision={draftDecision}
          confidence={draftConfidence}
          onDecision={setDraftDecision}
          onConfidence={setDraftConfidence}
          onSubmit={handleSubmit}
          onBack={backToExplore}
          hint={scenario.hint}
          hintUsed={inPractice ? practiceStep > 5 : hintUsed}
          scrollHint={firstRound}
        />
      )}

      {/* フィードバック */}
      {phase === "feedback" && lastResult && (
        <FeedbackCard
          correct={lastResult.correct}
          title={scenario.title}
          explanation={scenario.explanation}
          learningPoint={scenario.learningPoint}
          keyPoints={scenario.keyPoints}
          cardEmoji={scenario.cardEmoji}
          newCard={lastResult.newCard}
          isLast={isLast}
          nextNumber={currentIndex + 2}
          onNext={handleNext}
          scrollHint={firstRound}
        />
      )}
    </div>
  );
}
