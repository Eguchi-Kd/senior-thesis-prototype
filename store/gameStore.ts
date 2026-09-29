import { create } from "zustand";
import { buildSessionOrder, getScenarioById } from "@/lib/scenarios";
import type { Difficulty } from "@/scenarios/types";
import { drawTestForms, type TestForm } from "@/lib/testForms";

export type Decision = "report" | "ignore";
export type Answer = "fraud" | "safe";
// 信号検出理論：hit=詐欺を報告 / miss=詐欺を見逃し / fa=安全を誤報告 / cr=安全を正しく無視
export type SignalType = "hit" | "miss" | "fa" | "cr";

export type GamePhase =
  | "title"
  | "exploring"
  | "investigating"
  | "judging"
  | "feedback"
  | "transfer_test"
  | "survey"
  | "result";

// decision × isFraud から信号検出のカテゴリを確定的に導出
export function deriveSignalType(decision: Decision, isFraud: boolean): SignalType {
  if (isFraud) return decision === "report" ? "hit" : "miss";
  return decision === "report" ? "fa" : "cr";
}

export interface ScenarioLog {
  scenarioId: number;
  isFraud: boolean;
  difficulty: Difficulty; // 項目難易度（易/中/難）— 項目レベル分析・天井効果の確認に使う
  presentationOrder: number; // 提示順位（1始まり）— 順序効果の統制に使う
  reactionTimeMs: number; // 主要RT：初回調査→判定
  explorationTimeMs: number; // シナリオ開始→最初の調査（探索時間）
  decisionLatencyMs: number; // 判定UI表示→決定（決定潜時）
  decision: Decision;
  confidence: number;
  hintUsed: boolean;
  hintAtMs: number | null; // 判定画面を開いてからヒントを押すまで
  decisionBeforeHint: Decision | null; // ヒントを押す前に選んでいた答え（未選択なら null）
  correct: boolean;
  signalType: SignalType;
  inspectedIds: string[]; // 調べたオブジェクト（プロセスデータ）
  inspectEvents: InspectEvent[]; // 調査の開閉（順序・滞在時間・再訪を含む）
  viewedAllRelevant: boolean; // 判定に必要なオブジェクトをすべて調べたか
  distractorsInspected: number; // 調べたダミーオブジェクトの数
}

export interface InspectEvent {
  id: string;
  openMs: number; // シナリオ開始からの経過
  dwellMs: number; // 調査パネルを開いていた時間
}

export interface TestLog {
  questionId: string;
  form: TestForm;
  position: number; // テスト内の出題順（1始まり・シャッフル後）
  difficulty: Difficulty;
  isFraud: boolean;
  answer: Answer;
  correct: boolean;
  confidence: number;
  reactionTimeMs: number;
  signalType: SignalType;
}

export interface Demographics {
  ageGroup: string;
  occupation: string;
  gender: string;
  scamExperience: string;
  itConfidence: string;
}

export interface Survey {
  learning: number;
  immersion: number;
  difficulty: number;
  sus: number[]; // SUS簡易(5項目)
  freeText: string;
}

interface GameState {
  sessionId: string;
  startedAt: number;
  deviceInfo: { ua: string; screen: string; language: string } | null;
  testRun: boolean;
  priorPlays: number; // この端末での過去のプレイ回数（再プレイの除外用）
  testForms: { pre: TestForm; post: TestForm }; // 事前/事後テストのフォーム割付
  phaseTimes: Record<string, number>; // 各フェーズの到達時刻（epoch ms）

  // シナリオ提示順
  scenarioOrder: number[];
  currentIndex: number;

  phase: GamePhase;
  scenarioStartTime: number | null; // シナリオ開始（探索開始）時刻
  firstInspectTime: number | null;  // 最初の調査を開いた時刻（主要RTの起点）
  judgeOpenTime: number | null;     // 判定UIを開いた時刻
  rtLocked: boolean; // シナリオ内で firstInspectTime を一度だけ確定する
  hintUsed: boolean;
  hintAtMs: number | null;
  decisionBeforeHint: Decision | null;
  currentInspected: string[]; // 現シナリオで調べたid
  currentInspectEvents: InspectEvent[];
  inspectOpenAt: number | null; // 開いている調査パネルの開始時刻

  logs: ScenarioLog[];
  preTestLogs: TestLog[];
  transferTestLogs: TestLog[];

  consent: { agreed: boolean; timestamp: number | null };
  demographics: Demographics | null;
  selfEfficacyPre: number | null;
  selfEfficacyPost: number | null;
  survey: Survey | null;
  dropoutPhase: GamePhase | null;

  // actions
  setPhase: (phase: GamePhase) => void;
  startTimer: () => void;
  markScenarioStart: () => void;
  markJudgeOpen: () => void;
  useHint: (decisionBeforeHint: Decision | null) => void;
  recordInspect: (id: string) => void;
  closeInspect: () => void;
  markPhase: (name: string) => void;
  setPriorPlays: (n: number) => void;
  submitDecision: (decision: Decision, confidence: number, correct: boolean, isFraud: boolean) => void;
  submitPreTest: (log: Omit<TestLog, "signalType">) => void;
  submitTransferTest: (log: Omit<TestLog, "signalType">) => void;
  nextScenario: () => void;
  setConsent: (agreed: boolean) => void;
  setDemographics: (d: Demographics, selfEfficacyPre: number) => void;
  setSurvey: (s: Survey, selfEfficacyPost: number) => void;
  reset: () => void;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const captureDeviceInfo = () => {
  if (typeof window === "undefined") return null;
  return {
    ua: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  };
};

// ?test=1 付き、または開発サーバー（next dev）での実行はテストとして記録し、分析時に除外できるようにする
const isTestRun = () => {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("test") === "1";
};

// 関連オブジェクトの網羅とダミーへの寄り道を算出（探索プロセスの分析用）
function computeRelevance(scenarioId: number, inspected: string[]) {
  const { relevantIds } = getScenarioById(scenarioId);
  const relevant: string[] = relevantIds;
  return {
    viewedAllRelevant: relevant.every((id) => inspected.includes(id)),
    distractorsInspected: inspected.filter((id) => !relevant.includes(id)).length,
  };
}

const initialState = () => ({
  sessionId: generateSessionId(),
  startedAt: Date.now(),
  deviceInfo: captureDeviceInfo(),
  testRun: isTestRun(),
  priorPlays: 0,
  testForms: drawTestForms(),
  phaseTimes: {} as Record<string, number>,
  scenarioOrder: buildSessionOrder(),
  currentIndex: 0,
  phase: "title" as GamePhase,
  scenarioStartTime: null,
  firstInspectTime: null,
  judgeOpenTime: null,
  rtLocked: false,
  hintUsed: false,
  hintAtMs: null as number | null,
  decisionBeforeHint: null as Decision | null,
  currentInspected: [] as string[],
  currentInspectEvents: [] as InspectEvent[],
  inspectOpenAt: null as number | null,
  logs: [] as ScenarioLog[],
  preTestLogs: [] as TestLog[],
  transferTestLogs: [] as TestLog[],
  consent: { agreed: false, timestamp: null as number | null },
  demographics: null as Demographics | null,
  selfEfficacyPre: null as number | null,
  selfEfficacyPost: null as number | null,
  survey: null as Survey | null,
  dropoutPhase: null as GamePhase | null,
});

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState(),

  setPhase: (phase) => set({ phase }),

  // rtLocked が立っている間は再スタートしない（再タップでRTが歪むのを防ぐ）
  startTimer: () => {
    if (get().rtLocked) return;
    set({ firstInspectTime: performance.now(), rtLocked: true });
  },

  // 各シナリオ開始時に時刻と per-scenario 状態をリセット
  markScenarioStart: () =>
    set({
      scenarioStartTime: performance.now(),
      firstInspectTime: null,
      judgeOpenTime: null,
      rtLocked: false,
      hintUsed: false,
      hintAtMs: null,
      decisionBeforeHint: null,
      currentInspected: [],
      currentInspectEvents: [],
      inspectOpenAt: null,
    }),

  // 判定UIを開いた時刻（初回のみ記録）
  markJudgeOpen: () => {
    if (get().judgeOpenTime != null) return;
    set({ judgeOpenTime: performance.now() });
  },

  // 初回使用時のみタイミングとヒント前の答えを記録
  useHint: (decisionBeforeHint) => {
    const { hintUsed, judgeOpenTime } = get();
    if (hintUsed) return;
    set({
      hintUsed: true,
      hintAtMs: judgeOpenTime != null ? Math.round(performance.now() - judgeOpenTime) : null,
      decisionBeforeHint,
    });
  },

  recordInspect: (id) => {
    const { currentInspected, currentInspectEvents, scenarioStartTime } = get();
    const now = performance.now();
    set({
      currentInspected: currentInspected.includes(id) ? currentInspected : [...currentInspected, id],
      currentInspectEvents: [
        ...currentInspectEvents,
        { id, openMs: scenarioStartTime != null ? Math.round(now - scenarioStartTime) : 0, dwellMs: 0 },
      ],
      inspectOpenAt: now,
    });
  },

  closeInspect: () => {
    const { currentInspectEvents, inspectOpenAt } = get();
    if (inspectOpenAt == null || currentInspectEvents.length === 0) return;
    const events = [...currentInspectEvents];
    const last = events[events.length - 1];
    events[events.length - 1] = { ...last, dwellMs: Math.round(performance.now() - inspectOpenAt) };
    set({ currentInspectEvents: events, inspectOpenAt: null });
  },

  markPhase: (name) => {
    const { phaseTimes } = get();
    if (phaseTimes[name] != null) return;
    set({ phaseTimes: { ...phaseTimes, [name]: Date.now() } });
  },

  setPriorPlays: (n) => set({ priorPlays: n }),

  submitDecision: (decision, confidence, correct, isFraud) => {
    const { scenarioOrder, currentIndex, hintUsed, hintAtMs, decisionBeforeHint, logs, currentInspected, currentInspectEvents, scenarioStartTime, firstInspectTime, judgeOpenTime } = get();
    const scenarioId = scenarioOrder[currentIndex];
    const now = performance.now();
    const reactionTimeMs = firstInspectTime != null ? Math.round(now - firstInspectTime) : 0;
    const explorationTimeMs =
      scenarioStartTime != null && firstInspectTime != null ? Math.round(firstInspectTime - scenarioStartTime) : 0;
    const decisionLatencyMs = judgeOpenTime != null ? Math.round(now - judgeOpenTime) : 0;
    const log: ScenarioLog = {
      scenarioId,
      isFraud,
      difficulty: getScenarioById(scenarioId).difficulty,
      presentationOrder: currentIndex + 1,
      reactionTimeMs,
      explorationTimeMs,
      decisionLatencyMs,
      decision,
      confidence,
      hintUsed,
      hintAtMs,
      decisionBeforeHint,
      correct,
      signalType: deriveSignalType(decision, isFraud),
      inspectedIds: currentInspected,
      inspectEvents: currentInspectEvents,
      ...computeRelevance(scenarioId, currentInspected),
    };
    set({ logs: [...logs, log] });
  },

  submitPreTest: (log) =>
    set((state) => ({
      preTestLogs: [
        ...state.preTestLogs,
        { ...log, signalType: deriveSignalType(log.answer === "fraud" ? "report" : "ignore", log.isFraud) },
      ],
    })),

  submitTransferTest: (log) =>
    set((state) => ({
      transferTestLogs: [
        ...state.transferTestLogs,
        { ...log, signalType: deriveSignalType(log.answer === "fraud" ? "report" : "ignore", log.isFraud) },
      ],
    })),

  nextScenario: () => {
    const { currentIndex, scenarioOrder } = get();
    if (currentIndex >= scenarioOrder.length - 1) {
      set({ phase: "transfer_test" });
    } else {
      // per-scenario のリセットは markScenarioStart（GameClient の currentIndex 効果）が担う
      set({ currentIndex: currentIndex + 1, phase: "exploring" });
    }
  },

  setConsent: (agreed) => set({ consent: { agreed, timestamp: Date.now() } }),

  setDemographics: (d, selfEfficacyPre) => set({ demographics: d, selfEfficacyPre }),

  setSurvey: (s, selfEfficacyPost) => set({ survey: s, selfEfficacyPost }),

  reset: () => set({ ...initialState() }),
}));
