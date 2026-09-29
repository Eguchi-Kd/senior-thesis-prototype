"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { saveSession, saveSnapshot, registerDropoutSave, toParticipantCode } from "@/lib/logger";
import { testForms } from "@/lib/testForms";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { LearningCard } from "@/components/ui/LearningCard";
import { LikertButtons } from "@/components/ui/LikertButtons";
import { getScenarioById } from "@/lib/scenarios";

type Screen = "transfer" | "survey" | "score";

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

export default function ResultClient() {
  const router = useRouter();
  const { logs, transferTestLogs, submitTransferTest, setSurvey, reset, markPhase, sessionId } = useGameStore();
  const postForm = useGameStore((s) => s.testForms.post);

  const [screen, setScreen] = useState<Screen>("transfer");

  // アンケート状態（初期値なし＝選ぶまで未回答）
  const [selfEfficacyPost, setSelfEfficacyPost] = useState<number | null>(null);
  const [learning, setLearning] = useState<number | null>(null);
  const [immersion, setImmersion] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [sus, setSus] = useState<(number | null)[]>(() => SUS_ITEMS.map(() => null));
  const [freeText, setFreeText] = useState("");

  const surveyReady =
    selfEfficacyPost != null && learning != null && immersion != null && difficulty != null && sus.every((v) => v != null);

  // 直接アクセス（ログ無し）はタイトルへ
  useEffect(() => {
    if (logs.length === 0) router.replace("/");
  }, [logs, router]);

  useEffect(() => registerDropoutSave(), []);

  const handleSurveySubmit = () => {
    if (!surveyReady) return;
    setSurvey(
      { learning: learning!, immersion: immersion!, difficulty: difficulty!, sus: sus as number[], freeText },
      selfEfficacyPost!,
    );
    markPhase("surveyEnd");
    void saveSession(); // 全工程完了 → 最終保存
    setScreen("score");
  };

  const handleReplay = () => {
    reset();
    router.push("/");
  };

  // ─── スコア計算 ──────────────────────────────
  const scenarioCorrect = logs.filter((l) => l.correct).length;
  const hintPenalty = logs.filter((l) => l.hintUsed).length * 10;
  const transferCorrect = transferTestLogs.filter((l) => l.correct).length;
  const totalScore = scenarioCorrect * 15 - hintPenalty + transferCorrect * 10;
  const avgRt =
    logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.reactionTimeMs, 0) / logs.length) : 0;

  // ─── 転移テスト ──────────────────────────────
  if (screen === "transfer") {
    return (
      <QuizRunner
        questions={testForms[postForm]}
        form={postForm}
        headerLabel="事後テスト（プレイ後）"
        onSubmitOne={(r) => submitTransferTest(r)}
        onComplete={() => {
          markPhase("posttestEnd");
          void saveSnapshot();
          setScreen("survey");
        }}
      />
    );
  }

  // ─── アンケート ──────────────────────────────
  if (screen === "survey") {
    const Slider = ({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) => (
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

          <Slider label="詐欺を見抜ける自信（今の気持ち）" value={selfEfficacyPost} onChange={setSelfEfficacyPost} />
          <Slider label="詐欺の見分け方について学びがあった" value={learning} onChange={setLearning} />
          <Slider label="ゲームに夢中になれた" value={immersion} onChange={setImmersion} />
          <Slider label="内容は難しかった" value={difficulty} onChange={setDifficulty} />

          <div className="border-t border-gray-800 my-5" />
          <p className="text-sm text-gray-300 mb-3 font-bold">使いやすさについて</p>
          {SUS_ITEMS.map((item, i) => (
            <Slider
              key={i}
              label={item}
              value={sus[i]}
              onChange={(v) => setSus((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
            />
          ))}

          <div className="mt-4 mb-6">
            <p className="text-sm text-gray-300 mb-2">感想・気づいたこと（任意）</p>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              className="w-full rounded-xl bg-gray-800 text-white p-3 text-sm"
              placeholder="自由にご記入ください"
            />
          </div>

          <button
            disabled={!surveyReady}
            onClick={handleSurveySubmit}
            className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {surveyReady ? "回答して結果を見る →" : "すべての項目に回答してください"}
          </button>
        </div>
      </div>
    );
  }

  // ─── スコア画面 ──────────────────────────────
  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-6">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-white text-3xl font-black mb-1">ゲームクリア！</h1>
          <p className="text-gray-400 text-sm">全シナリオ + 転移テスト 完了</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-blue-600 rounded-2xl p-5 text-center mb-4">
          <p className="text-blue-200 text-sm mb-1">総合スコア</p>
          <p className="text-white text-6xl font-black">{totalScore}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-gray-900 rounded-2xl p-4 mb-3">
          <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">シナリオ結果</p>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">
                  {i + 1}問目 {log.isFraud ? "🚨" : "✅"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs">{log.reactionTimeMs}ms</span>
                  {log.hintUsed && <span className="text-yellow-500 text-xs">ヒント-10pt</span>}
                  <span className={`text-sm font-bold ${log.correct ? "text-green-400" : "text-red-400"}`}>
                    {log.correct ? "✓ 正解" : "✗ 不正解"}
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
              <span className="text-gray-400 text-xs">平均反応時間</span>
              <span className="text-gray-300 text-xs">{avgRt}ms</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gray-900 rounded-2xl p-4 mb-5">
          <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">転移テスト（未知の問題）</p>
          <div className="flex justify-between">
            <span className="text-gray-400 text-xs">正答率</span>
            <span className="text-gray-300 text-xs">{transferCorrect} / {transferTestLogs.length} 問正解</span>
          </div>
        </motion.div>

        {/* 獲得した学習カード（正解シナリオ分） */}
        {logs.some((l) => l.correct) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mb-5">
            <p className="text-gray-400 text-xs font-bold mb-3 uppercase tracking-wide">
              獲得した学習カード（{logs.filter((l) => l.correct).length}枚）
            </p>
            <div className="space-y-3">
              {logs.filter((l) => l.correct).map((l, i) => {
                const s = getScenarioById(l.scenarioId);
                return (
                  <LearningCard key={l.scenarioId} title={s.title} learningPoint={s.learningPoint} index={i + 1} delay={0.1 * i} />
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="bg-gray-900 rounded-2xl p-4 mb-5 text-center">
          <p className="text-gray-400 text-xs mb-1">参加者コード</p>
          <p className="text-white text-2xl font-mono font-black tracking-widest">{toParticipantCode(sessionId)}</p>
          <p className="text-gray-500 text-xs mt-2">データの削除を希望する場合は、このコードを研究者にお伝えください。</p>
        </div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} onClick={handleReplay} className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl">
          もう一度プレイ →
        </motion.button>
      </div>
    </div>
  );
}
