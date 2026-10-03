"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGameStore, type TestLog } from "@/store/gameStore";
import { confirmFinalSave, saveSession, saveSnapshot, toParticipantCode } from "@/lib/logger";
import { orderedQuestions, findQuestion } from "@/lib/testForms";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { StageScreen } from "@/components/ui/StageScreen";
import { TapWord } from "@/components/ui/TapWord";
import { LikertButtons } from "@/components/ui/LikertButtons";
import { getScenarioById } from "@/lib/scenarios";
import { computeProfile, diagnosePlayerType, PLAYER_TYPES, type PlayerTypeId } from "@/lib/playerType";
import { RadarChart } from "@/components/ui/RadarChart";
import { fetchStats, submitStats, DEMO_STATS, withSelf, type DemoPreset, type Stats } from "@/lib/stats";
import { addToCollection, loadCollection, typeCardId } from "@/lib/collection";
import { TOTAL_CARDS } from "@/lib/cards";

type Screen = "intro" | "transfer" | "outro" | "survey" | "score";

// System Usability Scale（日本語版・10項目）。奇数=肯定、偶数=否定の文。
// 得点 = (Σ奇数(x-1) + Σ偶数(5-x)) × 2.5（0〜100）。分析側で算出する。
const SUS_ITEMS = [
  "このゲームをまた使いたいと思う",
  "このゲームは必要以上に複雑だと感じた",
  "このゲームは簡単に使いこなせると思った",
  "このゲームを使うには、詳しい人の助けが必要だと感じた",
  "このゲームのいろいろな機能はうまくまとまっていると感じた",
  "このゲームにはちぐはぐなところが多いと感じた",
  "たいていの人は、このゲームの使い方をすぐに覚えられると思う",
  "このゲームはとても扱いにくいと感じた",
  "このゲームを自信を持って使えた",
  "このゲームを使い始める前に、多くのことを覚える必要があった",
];

const MIN_PEERS = 5; // 比較表示に必要な最低人数

export default function ResultClient() {
  const router = useRouter();
  const store = useGameStore();
  const {
    logs, preTestLogs, transferTestLogs, submitTransferTest, setSurvey, reset, markPhase, setPhase,
    sessionId, testForms, testItemOrder, survey, resultType, setResultType, testRun, playMode,
  } = store;
  const freePlay = playMode === "free";
  const postQuestions = orderedQuestions(testForms.post, testItemOrder.post);

  // 再読み込み時は進み具合から画面を復元
  const [screen, setScreen] = useState<Screen>(() => {
    if (survey || freePlay) return "score"; // 自由プレイは事後テスト・アンケートなしで結果発表へ
    if (transferTestLogs.length >= postQuestions.length) return "survey";
    if (transferTestLogs.length > 0) return "transfer";
    return "intro";
  });

  // 直接アクセス（ログ無し）はタイトルへ、本編が終わっていなければゲームへ戻す
  const gameDone = logs.length >= store.scenarioOrder.length;
  useEffect(() => {
    if (logs.length === 0) router.replace("/");
    else if (!gameDone) router.replace("/game");
  }, [logs, gameDone, router]);

  // 本編が終わっていない（直行ガードで /game に戻す）間は段階を変えない
  useEffect(() => {
    if (!gameDone) return;
    setPhase(screen === "score" ? "result" : screen === "survey" ? "survey" : "transfer_test");
  }, [screen, setPhase, gameDone]);

  // 自由プレイの完了処理（テスト・アンケートがないので結果発表に来た時点で完了）
  useEffect(() => {
    if (!freePlay || !gameDone || resultType) return;
    const type = diagnosePlayerType(logs);
    setResultType(type);
    addToCollection(typeCardId(type));
    markPhase("resultShown");
    setPhase("result");
    void saveSession();
  }, [freePlay, gameDone, resultType, logs, setResultType, markPhase, setPhase]);

  const handleTransferComplete = useCallback(() => {
    markPhase("posttestEnd");
    void saveSnapshot();
    setScreen("outro");
  }, [markPhase]);

  if (logs.length === 0 || !gameDone) return null;

  if (screen === "intro") {
    return (
      <StageScreen
        step="STEP 3 / 3"
        emoji="🧠"
        title="事後テスト"
        buttonLabel="はじめる →"
        onNext={() => {
          markPhase("posttestStart");
          setScreen("transfer");
        }}
      >
        <p>ゲームで学んだことを、はじめて見る場面で試してみよう。</p>
        <p>事前テストと同じように、<b>詐欺</b> か <b>正常</b> かを選び、自信の度合いを<TapWord />してください（全{postQuestions.length}問）。</p>
        <p className="text-amber-300">💡 事前テストと合わせて、答え合わせはこのあと結果発表で！</p>
      </StageScreen>
    );
  }

  if (screen === "transfer") {
    return (
      <QuizRunner
        questions={postQuestions}
        startIndex={transferTestLogs.length}
        form={testForms.post}
        headerLabel="事後テスト"
        onSubmitOne={(r) => submitTransferTest(r)}
        onComplete={handleTransferComplete}
      />
    );
  }

  if (screen === "outro") {
    return (
      <StageScreen
        step="STEP 3 / 3 クリア"
        emoji="🎊"
        title="すべてのテストが終わりました！"
        buttonLabel="アンケートへ →"
        onNext={() => setScreen("survey")}
      >
        <p>最後まで取り組んでいただき、本当にありがとうございます！</p>
        <p>最後に1分ほどのアンケートにご協力ください。回答すると、いよいよ <b>結果発表</b> です。</p>
      </StageScreen>
    );
  }

  if (screen === "survey") {
    return (
      <SurveyScreen
        onSubmit={(values) => {
          setSurvey(
            { learning: values.learning, immersion: values.immersion, difficulty: values.difficulty, sus: values.sus, freeText: values.freeText },
            values.selfEfficacyPost,
          );
          const type = diagnosePlayerType(logs);
          setResultType(type);
          addToCollection(typeCardId(type));
          markPhase("surveyEnd");
          setPhase("result");
          void saveSession(); // 全工程完了 → 最終保存（匿名集計の送信は結果発表の画面で行う）
          setScreen("score");
        }}
      />
    );
  }

  return (
    <ScoreScreen
      sessionId={sessionId}
      resultType={(resultType as PlayerTypeId) ?? diagnosePlayerType(logs)}
      testRun={testRun}
      onReplay={() => {
        reset();
        router.push("/");
      }}
      preTestLogs={preTestLogs}
      transferTestLogs={transferTestLogs}
    />
  );
}

// ─── アンケート ───────────────────────────────
function SurveyScreen({
  onSubmit,
}: {
  onSubmit: (v: { selfEfficacyPost: number; learning: number; immersion: number; difficulty: number; sus: number[]; freeText: string }) => void;
}) {
  const [selfEfficacyPost, setSelfEfficacyPost] = useState<number | null>(null);
  const [learning, setLearning] = useState<number | null>(null);
  const [immersion, setImmersion] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [sus, setSus] = useState<(number | null)[]>(() => SUS_ITEMS.map(() => null));
  const [freeText, setFreeText] = useState("");

  const ready = selfEfficacyPost != null && learning != null && immersion != null && difficulty != null && sus.every((v) => v != null);

  const Item = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) => (
    <div className="mb-4">
      <p className="text-base text-gray-300 mb-1">{label}</p>
      <LikertButtons value={value} onChange={onChange} dark />
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-6 py-8 text-white">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black mb-1 text-center">アンケート</h1>
        <p className="text-gray-400 text-sm text-center mb-6">1（全くそう思わない）〜 5（とてもそう思う）</p>

        <Item label="詐欺を見抜ける自信（今の気持ち）" value={selfEfficacyPost} onChange={setSelfEfficacyPost} />
        <Item label="詐欺の見分け方について学びがあった" value={learning} onChange={setLearning} />
        <Item label="ゲームに夢中になれた" value={immersion} onChange={setImmersion} />
        <Item label="内容は難しかった" value={difficulty} onChange={setDifficulty} />

        <div className="border-t border-gray-800 my-5" />
        <p className="text-base text-gray-300 mb-3 font-bold">使いやすさについて</p>
        {SUS_ITEMS.map((item, i) => (
          <Item key={i} label={item} value={sus[i]} onChange={(v) => setSus((prev) => prev.map((x, idx) => (idx === i ? v : x)))} />
        ))}

        <div className="mt-4 mb-6">
          <p className="text-base text-gray-300 mb-2">感想・気づいたこと（任意）</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-gray-800 text-white p-3 text-base"
            placeholder="自由にご記入ください（お名前などの個人情報は書かないでください）"
          />
        </div>

        <button
          disabled={!ready}
          onClick={() =>
            ready &&
            onSubmit({
              selfEfficacyPost: selfEfficacyPost!,
              learning: learning!,
              immersion: immersion!,
              difficulty: difficulty!,
              sus: sus as number[],
              freeText,
            })
          }
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {ready ? "回答して結果発表へ →" : "すべての項目に回答してください"}
        </button>
      </div>
    </div>
  );
}

// ─── 結果発表 ───────────────────────────────
function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gray-900 rounded-2xl p-3"
    >
      <p className="text-gray-400 text-xs font-bold mb-2 tracking-wide">{title}</p>
      {children}
    </motion.div>
  );
}

function ScoreScreen({
  sessionId,
  resultType,
  testRun,
  onReplay,
  preTestLogs,
  transferTestLogs,
}: {
  sessionId: string;
  resultType: PlayerTypeId;
  testRun: boolean;
  onReplay: () => void;
  preTestLogs: TestLog[];
  transferTestLogs: TestLog[];
}) {
  const logs = useGameStore((s) => s.logs);
  // 最終データがサーバーに届いたことを、このセッションの書き込み完了で確かめる（再読み込みのたびに再確認）
  const [saveState, setSaveState] = useState<"checking" | "confirmed" | "failed">("checking");
  const [online, setOnline] = useState(true);
  const runConfirm = useCallback(() => {
    setSaveState("checking");
    void confirmFinalSave().then((ok) => setSaveState(ok ? "confirmed" : "failed"));
  }, []);
  useEffect(() => {
    runConfirm();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [runConfirm]);
  const [realStats, setStats] = useState<Stats | null | undefined>(undefined);
  const [demo, setDemo] = useState<DemoPreset | null>(null); // テスト実行時の表示確認用
  const [collected, setCollected] = useState(0);

  const playMode = useGameStore((s) => s.playMode);
  const freePlay = playMode === "free";
  const gameCorrect = logs.filter((l) => l.correct).length;
  const postCorrect = transferTestLogs.filter((l) => l.correct).length;

  // 匿名集計：研究用の本番セッションだけ1回加算する。先に取得して表示し、加算の完了後に取り直す。
  // pending（オフラインで送信待ち）は SDK が端末に保持して再送するので、再読み込み後も再送しない（二重加算防止）
  useEffect(() => {
    let alive = true;
    setCollected(loadCollection().length);
    void fetchStats().then((st) => alive && setStats(st));
    const s = useGameStore.getState();
    const eligible = !s.testRun && s.playMode === "research";
    if (eligible && (s.statsState === "none" || s.statsState === "failed")) {
      s.setStatsState("pending");
      const sentFor = s.sessionId;
      void submitStats(gameCorrect, postCorrect, resultType).then(async (ok) => {
        // 送信中に次の参加者のセッションへ切り替わっていたら、その状態は書き換えない
        const now = useGameStore.getState();
        if (now.sessionId === sentFor) now.setStatsState(ok ? "done" : "failed");
        if (ok) {
          const st = await fetchStats();
          if (alive) setStats(st);
        }
      });
    }
    return () => {
      alive = false;
    };
  }, [gameCorrect, postCorrect, resultType]);

  const selfCorrect = logs.filter((l) => l.correct && !l.hintUsed).length;
  const hintCorrect = gameCorrect - selfCorrect;
  const preCorrect = preTestLogs.filter((l) => l.correct).length;
  const totalScore = gameCorrect * 15 + postCorrect * 10;
  const type = PLAYER_TYPES[resultType];
  const profile = computeProfile(logs);
  // ダミー表示中は、本番で自分の加算後に取得した場合と同じく自分の結果を1人分含める
  const stats = demo ? withSelf(DEMO_STATS[demo].stats, gameCorrect, postCorrect, resultType) : realStats;
  const n = stats?.n ?? 0;
  const enoughPeers = n >= MIN_PEERS;
  const wrongLogs = logs.filter((l) => !l.correct);

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-3 py-4">
      <div className="w-full max-w-md landscape:max-w-4xl md:max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-3">
          <h1 className="text-white text-2xl font-black">🏆 結果発表</h1>
          {testRun && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-[11px]">
              <span className="text-yellow-300">🧪 表示確認：</span>
              {([null, "few", "30", "120"] as (DemoPreset | null)[]).map((d) => (
                <button
                  key={d ?? "real"}
                  onClick={() => setDemo(d)}
                  className={`px-2 py-1 rounded-full border ${demo === d ? "bg-yellow-400 text-gray-900 border-yellow-400" : "border-yellow-500/60 text-yellow-200"}`}
                >
                  {d ? `ダミー ${DEMO_STATS[d].label}` : "実データ"}
                </button>
              ))}
            </div>
          )}
          <p className="text-gray-300 text-xs mt-1">研究へのご協力、本当にありがとうございました！ あなたの回答が、詐欺から身を守る学び方づくりに役立ちます。</p>
        </motion.div>

        <div className="grid gap-3 landscape:grid-cols-2 md:grid-cols-2 items-start">
          {/* ─── 左列：スコア・タイプ・成長 ─── */}
          <div className="space-y-3">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-blue-600 rounded-2xl px-4 py-3 flex items-center gap-4">
              <div className="text-center shrink-0">
                <p className="text-blue-200 text-[11px]">総合スコア</p>
                <p className="text-white text-4xl font-black leading-none">{totalScore}</p>
              </div>
              <p className="text-blue-100 text-xs leading-relaxed">
                本編 {gameCorrect}/{logs.length} 正解（自力 {selfCorrect}・ヒントあり {hintCorrect}）<br />
                {freePlay ? "🎮 自由プレイ（研究用データとは別に記録）" : `事後テスト ${postCorrect}/${transferTestLogs.length} 正解`}
              </p>
            </motion.div>

            {/* タイプ診断 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white">
              <p className="text-[10px] font-bold tracking-[0.2em] opacity-80 mb-1">あなたの詐欺対策タイプ</p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-4xl">{type.emoji}</span>
                <span className="text-xl font-black">{type.name}</span>
              </div>
              <div className="flex flex-col items-center gap-2 min-[420px]:flex-row min-[420px]:items-start">
                <div className="flex-1">
                  <p className="text-xs leading-relaxed mb-1.5">{type.desc}</p>
                  <p className="text-[11px] leading-relaxed opacity-90 mb-2">📋 判定理由：{type.rule}</p>
                  <p className="text-[11px] bg-white/15 rounded-lg p-2 leading-relaxed">💡 {type.tip}</p>
                </div>
                <div className="flex flex-col items-center">
                  <RadarChart
                    axes={[
                      { label: "見破る", value: profile.detect },
                      { label: "見極める", value: profile.discern },
                      { label: "両方確認", value: profile.compare },
                      { label: "時間", value: profile.time },
                      { label: "自力", value: profile.selfReliance },
                    ]}
                  />
                  <p className="text-[9px] opacity-60 -mt-1 text-center leading-tight">本編6問からのざっくりの目安<br />（時間は長いほど良いという意味ではありません）</p>
                </div>
              </div>
              <p className="text-xs font-bold mt-2">
                {stats === undefined
                  ? "集計を読み込み中…"
                  : stats === null
                    ? "（通信できないため、他の人との比較は表示できません）"
                    : enoughPeers
                      ? `同じタイプは ${stats[`t_${resultType}`] ?? 0} 人（全 ${n} 人中）${demo ? "〔ダミー〕" : ""}`
                      : `まだ参加者が少ないため集計中です（現在 ${n} 人）`}
              </p>
              {testRun && <p className="text-[10px] opacity-70 mt-1">※テスト実行のため、あなたの結果は集計に含まれません</p>}
              <p className="text-[10px] opacity-55 mt-2 leading-snug">
                ※ゲーム本編6問の回答から簡易的に判定したものです。実力や性格を正確に表すものではありません。
              </p>
            </motion.div>

            {/* 事前→事後（自由プレイはテストなし） */}
            {!freePlay && (
            <Section title="事前と事後のテスト結果" delay={0.3}>
              {[
                { label: "事前", v: preCorrect, total: preTestLogs.length, color: "bg-gray-500" },
                { label: "事後", v: postCorrect, total: transferTestLogs.length, color: "bg-emerald-500" },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-300 w-8 shrink-0">{bar.label}</span>
                  <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.total ? (bar.v / bar.total) * 100 : 0}%` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className={`h-full ${bar.color} rounded-full`}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-12 text-right shrink-0">{bar.v}/{bar.total}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-1">
                {postCorrect > preCorrect ? `🎉 事後のほうが ${postCorrect - preCorrect} 問多く正解！` : postCorrect === preCorrect ? "事前と同じ正解数でした" : "答え合わせで復習しよう"}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">※事前と事後は別の問題です。差がそのまま実力の伸びを表すわけではありません。</p>
            </Section>
            )}
          </div>

          {/* ─── 右列：比較・詳細（開閉式）・コレクション ─── */}
          <div className="space-y-3">
            <Section title={`みんなとの比較（本編の正解数）${demo ? "〔ダミー集計〕" : ""}`} delay={0.4}>
              {stats && enoughPeers ? (
                <PeerHistogram stats={stats} mine={gameCorrect} max={logs.length} />
              ) : (
                <p className="text-xs text-gray-400">
                  {stats === null ? "通信できないため表示できません。" : `参加者が ${MIN_PEERS} 人以上集まると、みんなの分布が表示されます。`}
                </p>
              )}
            </Section>

            <Collapsible title={`ゲーム本編の結果（${gameCorrect}/${logs.length}）`}>
              <div className="space-y-1.5">
                {logs.map((log) => {
                  const s = getScenarioById(log.scenarioId);
                  return (
                    <div key={log.scenarioId} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 truncate mr-2">{log.presentationOrder}. {s.title}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500 text-xs">🔍{log.inspectEvents.length}回・{Math.round(log.reactionTimeMs / 1000)}秒</span>
                        {log.hintUsed && <span className="text-amber-400 text-xs">💡</span>}
                        <span className={`font-bold ${log.correct ? "text-green-400" : "text-red-400"}`}>{log.correct ? "○" : "×"}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </Collapsible>

            {wrongLogs.length > 0 && (
              <Collapsible title={`復習しよう（間違えた問題 ${wrongLogs.length}問）`}>
                <div className="space-y-2">
                  {wrongLogs.map((l) => {
                    const s = getScenarioById(l.scenarioId);
                    return (
                      <div key={l.scenarioId} className="bg-gray-800 rounded-xl p-3">
                        <p className="text-white text-sm font-bold mb-1">{s.title}（{s.isFraud ? "詐欺" : "正常"}）</p>
                        <p className="text-gray-300 text-xs leading-relaxed mb-2">{s.explanation}</p>
                        <p className="text-blue-300 text-xs leading-relaxed">📚 {s.learningPoint}</p>
                      </div>
                    );
                  })}
                </div>
              </Collapsible>
            )}

            {!freePlay && (
              <Collapsible title="テストの答え合わせ">
                <AnswerReview label="事前テスト" logs={preTestLogs} />
                <AnswerReview label="事後テスト" logs={transferTestLogs} />
              </Collapsible>
            )}

            {/* コレクション */}
            <div className="bg-gray-900 rounded-2xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-white text-sm shrink-0">📇 収集率</span>
                <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400" style={{ width: `${(collected / TOTAL_CARDS) * 100}%` }} />
                </div>
                <span className="text-white font-black text-sm shrink-0">{collected}/{TOTAL_CARDS}</span>
              </div>
              <Link href="/collection" className="block w-full py-2 text-center bg-indigo-600 text-white rounded-xl font-bold text-sm">
                コレクションを見る
              </Link>
            </div>

            {/* 参加者コード・保存状態 */}
            <div className="bg-gray-900 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-gray-400 text-[10px]">参加者コード</p>
                <p className="text-white text-lg font-mono font-black tracking-widest leading-tight">{toParticipantCode(sessionId)}</p>
              </div>
              <div className={`text-[11px] text-right ${saveState === "confirmed" ? "text-emerald-300" : saveState === "failed" ? "text-red-300" : "text-amber-300"}`}>
                {saveState === "confirmed"
                  ? "✓ データ送信済み（サーバーで確認）"
                  : saveState === "failed"
                    ? (
                      <>
                        ⚠ 送信に失敗しました。スタッフにお知らせください
                        <button onClick={runConfirm} className="block ml-auto mt-1 px-2 py-0.5 rounded bg-red-500/30 text-red-100">再送する</button>
                      </>
                    )
                    : online
                      ? "⏳ 送信を確認中…"
                      : "⏳ 送信待ち（通信が戻ると自動で送信されます）"}
              </div>
            </div>

            <button onClick={onReplay} className="w-full py-3 bg-blue-600 text-white font-black rounded-2xl">
              もう一度プレイ →
            </button>
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-3">ご参加ありがとうございました！ 🙏</p>
      </div>
    </div>
  );
}

// 開閉式のセクション（初期は閉じる）
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="bg-gray-900 rounded-2xl p-3 group">
      <summary className="cursor-pointer list-none flex items-center justify-between text-sm text-white font-bold">
        <span>{title}</span>
        <span className="text-gray-400 text-xs transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function PeerHistogram({ stats, mine, max }: { stats: Stats; mine: number; max: number }) {
  const counts = Array.from({ length: max + 1 }, (_, k) => stats[`g${k}`] ?? 0);
  const peak = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const below = counts.slice(0, mine).reduce((a, b) => a + b, 0);
  const topPercent = total > 0 ? Math.max(1, Math.round(((total - below) / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {counts.map((c, k) => (
          <div key={k} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[10px] text-gray-400 mb-0.5">{c}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(c / peak) * 100}%` }}
              transition={{ delay: 0.7 + k * 0.05 }}
              className={`w-full rounded-t ${k === mine ? "bg-amber-400" : "bg-gray-600"}`}
              style={{ minHeight: c > 0 ? 3 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {counts.map((_, k) => (
          <span key={k} className={`flex-1 text-center text-[10px] ${k === mine ? "text-amber-300 font-bold" : "text-gray-500"}`}>{k}問</span>
        ))}
      </div>
      <p className="text-xs text-gray-300 mt-2">🟨 があなた。全 {total} 人中、上位 {topPercent}% です！</p>
    </div>
  );
}

function AnswerReview({ label, logs }: { label: string; logs: TestLog[] }) {
  return (
    <details className="mb-2 group">
      <summary className="cursor-pointer text-sm text-white font-bold py-1">
        {label}（{logs.filter((l) => l.correct).length}/{logs.length}）
      </summary>
      <div className="space-y-2 mt-2">
        {logs.map((l) => {
          const q = findQuestion(l.questionId);
          if (!q) return null;
          return (
            <div key={l.questionId} className="bg-gray-800 rounded-xl p-3">
              <p className="text-sm text-white font-bold mb-1">
                <span className={l.correct ? "text-green-400" : "text-red-400"}>{l.correct ? "○" : "×"}</span> {q.title}
              </p>
              <p className="text-xs text-gray-400 mb-1">
                正解：{q.isFraud ? "詐欺" : "正常"} ／ あなた：{l.answer === "fraud" ? "詐欺" : "正常"}
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">{q.explanation}</p>
            </div>
          );
        })}
      </div>
    </details>
  );
}
