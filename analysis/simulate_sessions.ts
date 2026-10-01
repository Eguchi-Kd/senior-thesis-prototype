/**
 * 実際のストア（store/gameStore.ts）と保存ペイロード（lib/logger.ts の buildPayload）を使って
 * 典型的なプレイを再現し、Firestore に保存されるのと同じ形のセッションJSONを出力する。
 * ログの種類と質の検証用（Firestore には書き込まない）。
 *
 * 使い方（プロジェクトルートで）:
 *   node analysis/run_simulation.mjs
 *   python analysis/export_firestore.py --from-json analysis/data/simulated_sessions.json --include-test
 *   python analysis/validate_export.py analysis/data/<出力フォルダ>
 */
import { useGameStore, type Decision } from "@/store/gameStore";
import { buildPayload } from "@/lib/logger";
import { getScenarioById } from "@/lib/scenarios";
import { orderedQuestions } from "@/lib/testForms";
import { diagnosePlayerType } from "@/lib/playerType";

// 決定的な時計（performance.now / Date.now を差し替えて、所要時間を現実的な値にする）
let clockMs = 0;
const EPOCH = Date.UTC(2026, 10, 3, 1, 0, 0);
globalThis.performance.now = () => clockMs;
Date.now = () => EPOCH + clockMs;
const wait = (ms: number) => {
  clockMs += ms;
};

type Pattern = "careful" | "allReport" | "hintReinvestigate" | "rushed" | "reloadMidGame" | "appSwitch" | "freePlay";

function play(pattern: Pattern) {
  const st = () => useGameStore.getState();
  st().reset();
  useGameStore.setState({ testRun: true });
  st().setPriorPlays(pattern === "freePlay" ? 1 : 0);
  if (pattern === "freePlay") st().setPlayMode("free");
  const free = pattern === "freePlay";

  // 同意・属性
  wait(20_000);
  st().setConsent(true);
  st().setPhase("consent");
  st().markPhase("consent");
  wait(25_000);
  if (!free) {
    st().setPhase("intake");
    st().setDemographics(
      { ageGroup: "19-22", occupation: "大学・専門学生", gender: "回答しない", scamExperience: "不審な連絡を受けた", itConfidence: 3 },
      3,
    );
    st().markPhase("intakeEnd");
  }

  // 事前テスト（QuizRunner と同じ項目を記録）
  const runTest = (phase: "pre" | "post") => {
    const s = st();
    const form = phase === "pre" ? s.testForms.pre : s.testForms.post;
    const qs = orderedQuestions(form, phase === "pre" ? s.testItemOrder.pre : s.testItemOrder.post);
    qs.forEach((q, i) => {
      const hiddenBefore = st().hiddenTotalMs;
      const t0 = performance.now();
      wait(pattern === "rushed" ? 3_000 : 12_000);
      if (pattern === "appSwitch" && phase === "pre" && i === 2) {
        st().markHidden();
        wait(40_000);
        st().markVisible();
      }
      const answer = pattern === "allReport" ? "fraud" : q.isFraud === (i % 5 !== 4) ? "fraud" : "safe";
      const log = {
        questionId: q.id,
        form,
        position: i + 1,
        difficulty: q.difficulty,
        isFraud: q.isFraud,
        answer: answer as "fraud" | "safe",
        correct: (answer === "fraud") === q.isFraud,
        confidence: 1 + (i % 5),
        reactionTimeMs: Math.round(performance.now() - t0),
        hiddenMs: st().hiddenTotalMs - hiddenBefore,
      };
      if (phase === "pre") st().submitPreTest(log);
      else st().submitTransferTest(log);
    });
  };

  if (!free) {
    st().setPhase("pretest");
    st().markPhase("pretestStart");
    runTest("pre");
    st().markPhase("pretestEnd");
  }

  // 操作練習（ログに入らない）
  st().setPhase("practice");
  st().markPhase("practiceStart");
  wait(30_000);
  st().markPhase("practiceEnd");
  st().completePractice();
  st().setPhase("exploring");

  // ゲーム本編
  st().markPhase("gameStart");
  const order = st().scenarioOrder;
  order.forEach((sid, idx) => {
    const sc = getScenarioById(sid);
    st().markScenarioStart();
    wait(pattern === "rushed" ? 4_000 : 15_000);

    // 再読み込み：シナリオ途中でリロード → 同じシナリオを最初から（onRehydrateStorage と同じ扱い）
    if (pattern === "reloadMidGame" && idx === 2) {
      st().recordInspect("calendar");
      wait(5_000);
      useGameStore.setState({ resumeCount: st().resumeCount + 1, scenarioRestarted: true });
      st().markScenarioStart();
      wait(8_000);
    }

    const toInspect =
      pattern === "rushed" ? ["smartphone"] : [...sc.relevantIds, ...(idx % 2 === 0 ? ["poster" as const] : [])];
    const unique = [...new Set(toInspect)];
    unique.forEach((id, k) => {
      if (k === 0) st().startTimer();
      st().recordInspect(id);
      wait(pattern === "rushed" ? 2_000 : 8_000);
      st().closeInspect();
      wait(3_000);
    });

    st().markJudgeOpen();
    wait(4_000);
    let decision: Decision =
      pattern === "allReport" ? "report" : pattern === "careful" || sc.isFraud ? (sc.isFraud ? "report" : "ignore") : "report";
    if (pattern === "hintReinvestigate" && idx < 2) {
      st().takeHint("report");
      wait(3_000);
      // 調べ直し
      st().recordInspect(sc.relevantIds[0]);
      wait(6_000);
      st().closeInspect();
      st().markJudgeOpen();
      wait(3_000);
      decision = sc.isFraud ? "report" : "ignore";
    }
    const correct = (decision === "report") === sc.isFraud;
    st().submitDecision(decision, 4, correct, sc.isFraud);
    wait(10_000);
    st().nextScenario();
  });
  st().markPhase("gameEnd");

  if (free) {
    // 自由プレイ：テスト・アンケートなしで結果発表
    st().setResultType(diagnosePlayerType(st().logs));
    st().markPhase("resultShown");
    st().setPhase("result");
    return { ...buildPayload(), completed: true, simulatedPattern: pattern };
  }

  // 事後テスト
  st().setPhase("transfer_test");
  st().markPhase("posttestStart");
  runTest("post");
  st().markPhase("posttestEnd");

  // アンケート
  st().setPhase("survey");
  wait(60_000);
  st().setSurvey({ learning: 4, immersion: 4, difficulty: 3, sus: [4, 2, 4, 1, 4, 2, 5, 2, 4, 2], freeText: "" }, 4);
  st().setResultType(diagnosePlayerType(st().logs));
  st().markPhase("surveyEnd");
  st().setPhase("result");

  return { ...buildPayload(), completed: true, simulatedPattern: pattern };
}

const patterns: Pattern[] = ["careful", "allReport", "hintReinvestigate", "rushed", "reloadMidGame", "appSwitch", "freePlay"];
export const sessions = patterns.map((p) => play(p));
