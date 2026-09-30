"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGameStore, type TestLog } from "@/store/gameStore";
import { saveSession, saveSnapshot, toParticipantCode, useSaveStatus } from "@/lib/logger";
import { orderedQuestions, findQuestion } from "@/lib/testForms";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { StageScreen } from "@/components/ui/StageScreen";
import { LikertButtons } from "@/components/ui/LikertButtons";
import { getScenarioById } from "@/lib/scenarios";
import { diagnosePlayerType, PLAYER_TYPES, type PlayerTypeId } from "@/lib/playerType";
import { fetchStats, submitStats, type Stats } from "@/lib/stats";
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
    sessionId, testForms, testItemOrder, survey, resultType, setResultType, statsSubmitted, markStatsSubmitted, testRun,
  } = store;
  const postQuestions = orderedQuestions(testForms.post, testItemOrder.post);

  // 再読み込み時は進み具合から画面を復元
  const [screen, setScreen] = useState<Screen>(() => {
    if (survey) return "score";
    if (transferTestLogs.length >= postQuestions.length) return "survey";
    if (transferTestLogs.length > 0) return "transfer";
    return "intro";
  });

  // 直接アクセス（ログ無し）はタイトルへ
  useEffect(() => {
    if (logs.length === 0) router.replace("/");
  }, [logs, router]);

  useEffect(() => {
    setPhase(screen === "score" ? "result" : screen === "survey" ? "survey" : "transfer_test");
  }, [screen, setPhase]);

  const handleTransferComplete = useCallback(() => {
    markPhase("posttestEnd");
    void saveSnapshot();
    setScreen("outro");
  }, [markPhase]);

  if (logs.length === 0) return null;

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
        <p>事前テストと同じように、<b>詐欺</b> か <b>正常</b> かを選び、自信の度合いをタップしてください（全{postQuestions.length}問）。</p>
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
          void saveSession(); // 全工程完了 → 最終保存
          if (!testRun && !statsSubmitted) {
            markStatsSubmitted();
            void submitStats(
              logs.filter((l) => l.correct).length,
              transferTestLogs.filter((l) => l.correct).length,
              type,
            );
          }
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
      <p className="text-sm text-gray-300 mb-1">{label}</p>
      <LikertButtons value={value} onChange={onChange} dark />
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-6 py-8 text-white">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-black mb-1 text-center">アンケート</h1>
        <p className="text-gray-400 text-xs text-center mb-6">1（全くそう思わない）〜 5（とてもそう思う）</p>

        <Item label="詐欺を見抜ける自信（今の気持ち）" value={selfEfficacyPost} onChange={setSelfEfficacyPost} />
        <Item label="詐欺の見分け方について学びがあった" value={learning} onChange={setLearning} />
        <Item label="ゲームに夢中になれた" value={immersion} onChange={setImmersion} />
        <Item label="内容は難しかった" value={difficulty} onChange={setDifficulty} />

        <div className="border-t border-gray-800 my-5" />
        <p className="text-sm text-gray-300 mb-3 font-bold">使いやすさについて</p>
        {SUS_ITEMS.map((item, i) => (
          <Item key={i} label={item} value={sus[i]} onChange={(v) => setSus((prev) => prev.map((x, idx) => (idx === i ? v : x)))} />
        ))}

        <div className="mt-4 mb-6">
          <p className="text-sm text-gray-300 mb-2">感想・気づいたこと（任意）</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-gray-800 text-white p-3 text-sm"
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
      className="bg-gray-900 rounded-2xl p-4 mb-4"
    >
      <p className="text-gray-400 text-xs font-bold mb-3 tracking-wide">{title}</p>
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
  const save = useSaveStatus();
  const [stats, setStats] = useState<Stats | null | undefined>(undefined);
  const [collected, setCollected] = useState(0);

  useEffect(() => {
    // 集計の加算が反映されるよう少し待ってから取得
    const t = setTimeout(() => void fetchStats().then(setStats), 800);
    setCollected(loadCollection().length);
    return () => clearTimeout(t);
  }, []);

  const gameCorrect = logs.filter((l) => l.correct).length;
  const selfCorrect = logs.filter((l) => l.correct && !l.hintUsed).length;
  const hintCorrect = gameCorrect - selfCorrect;
  const preCorrect = preTestLogs.filter((l) => l.correct).length;
  const postCorrect = transferTestLogs.filter((l) => l.correct).length;
  const totalScore = gameCorrect * 15 + postCorrect * 10;
  const type = PLAYER_TYPES[resultType];
  const n = stats?.n ?? 0;
  const enoughPeers = n >= MIN_PEERS;
  const wrongLogs = logs.filter((l) => !l.correct);

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-5">
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-white text-3xl font-black mb-2">結果発表</h1>
          <p className="text-gray-300 text-sm leading-relaxed">
            研究へのご協力、本当にありがとうございました！<br />
            あなたの回答が、詐欺から身を守る学び方づくりに役立ちます。
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="bg-blue-600 rounded-2xl p-5 text-center mb-4">
          <p className="text-blue-200 text-sm mb-1">総合スコア</p>
          <p className="text-white text-6xl font-black">{totalScore}</p>
          <p className="text-blue-100 text-xs mt-2">
            本編 {gameCorrect}/{logs.length} 正解（自力 {selfCorrect}・ヒントあり {hintCorrect}）＋ 事後テスト {postCorrect}/{transferTestLogs.length}
          </p>
        </motion.div>

        {/* タイプ診断 */}
        <motion.div initial={{ opacity: 0, rotateX: -20 }} animate={{ opacity: 1, rotateX: 0 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 mb-4 text-white">
          <p className="text-xs font-bold tracking-[0.2em] opacity-80 mb-2">あなたの詐欺対策タイプ</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-5xl">{type.emoji}</span>
            <span className="text-2xl font-black">{type.name}</span>
          </div>
          <p className="text-sm leading-relaxed mb-2">{type.desc}</p>
          <p className="text-xs bg-white/15 rounded-lg p-2 leading-relaxed">💡 {type.tip}</p>
          <p className="text-sm font-bold mt-3">
            {stats === undefined
              ? "集計を読み込み中…"
              : stats === null
                ? "（通信できないため、他の人との比較は表示できません）"
                : enoughPeers
                  ? `同じタイプは ${stats[`t_${resultType}`] ?? 0} 人（全 ${n} 人中）`
                  : `まだ参加者が少ないため集計中です（現在 ${n} 人）`}
          </p>
          {testRun && <p className="text-[10px] opacity-70 mt-1">※テスト実行のため、あなたの結果は集計に含まれません</p>}
        </motion.div>

        {/* 事前→事後 */}
        <Section title="テストの成長（事前 → 事後）" delay={0.4}>
          {[
            { label: "事前テスト", v: preCorrect, total: preTestLogs.length, color: "bg-gray-500" },
            { label: "事後テスト", v: postCorrect, total: transferTestLogs.length, color: "bg-emerald-500" },
          ].map((b) => (
            <div key={b.label} className="mb-2">
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span>{b.label}</span>
                <span>{b.v} / {b.total} 問正解</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.total ? (b.v / b.total) * 100 : 0}%` }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className={`h-full ${b.color} rounded-full`}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 mt-2">
            {postCorrect > preCorrect ? `🎉 ${postCorrect - preCorrect} 問アップ！` : postCorrect === preCorrect ? "キープ！" : "答え合わせで復習しよう"}
          </p>
        </Section>

        {/* みんなとの比較 */}
        <Section title="みんなとの比較（本編の正解数）" delay={0.5}>
          {stats && enoughPeers ? (
            <PeerHistogram stats={stats} mine={gameCorrect} max={logs.length} />
          ) : (
            <p className="text-xs text-gray-400">
              {stats === null ? "通信できないため表示できません。" : `参加者が ${MIN_PEERS} 人以上集まると、みんなの分布が表示されます。`}
            </p>
          )}
        </Section>

        {/* 本編の結果 */}
        <Section title="ゲーム本編の結果" delay={0.6}>
          <div className="space-y-2">
            {logs.map((log) => {
              const s = getScenarioById(log.scenarioId);
              return (
                <div key={log.scenarioId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate mr-2">
                    {log.presentationOrder}. {s.title}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500 text-xs">🔍{log.inspectEvents.length}回・{Math.round(log.reactionTimeMs / 1000)}秒</span>
                    {log.hintUsed && <span className="text-amber-400 text-xs">💡</span>}
                    <span className={`font-bold ${log.correct ? "text-green-400" : "text-red-400"}`}>{log.correct ? "○" : "×"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 復習（間違えた問題を優先） */}
        {wrongLogs.length > 0 && (
          <Section title={`復習しよう（間違えた問題 ${wrongLogs.length}問）`} delay={0.7}>
            <div className="space-y-3">
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
          </Section>
        )}

        {/* テストの答え合わせ */}
        <Section title="テストの答え合わせ" delay={0.8}>
          <AnswerReview label="事前テスト" logs={preTestLogs} />
          <AnswerReview label="事後テスト" logs={transferTestLogs} />
        </Section>

        {/* コレクション */}
        <Section title="学習カード コレクション" delay={0.9}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">収集率</span>
            <span className="text-white font-black">{collected} / {TOTAL_CARDS}</span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400" style={{ width: `${(collected / TOTAL_CARDS) * 100}%` }} />
          </div>
          <Link href="/collection" className="block w-full py-3 text-center bg-indigo-600 text-white rounded-xl font-bold text-sm">
            📇 コレクションを見る
          </Link>
        </Section>

        {/* 参加者コード・保存状態 */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-5 text-center">
          <p className="text-gray-400 text-xs mb-1">参加者コード</p>
          <p className="text-white text-2xl font-mono font-black tracking-widest">{toParticipantCode(sessionId)}</p>
          <p className={`text-xs mt-2 ${save.pending > 0 ? "text-amber-300" : save.lastError ? "text-red-300" : "text-emerald-300"}`}>
            {save.pending > 0
              ? "⏳ データ送信待ち（通信が戻ると自動で送信されます）"
              : save.lastError
                ? "⚠ 送信に失敗しました。スタッフにお知らせください"
                : "✓ データ送信済み"}
          </p>
        </div>

        <p className="text-center text-gray-400 text-xs mb-4">ご参加ありがとうございました！ 🙏</p>

        <button onClick={onReplay} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl">
          もう一度プレイ →
        </button>
      </div>
    </div>
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
