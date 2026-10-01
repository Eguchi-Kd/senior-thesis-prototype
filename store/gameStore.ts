import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { buildSessionOrder, getScenarioById } from "@/lib/scenarios";
import type { Difficulty } from "@/scenarios/types";
import { drawTestForms, testForms as formQuestions, type TestForm } from "@/lib/testForms";
import { shuffle } from "@/lib/shuffle";
import { SCHEMA_VERSION, CONTENT_VERSION } from "@/lib/version";
import { resolveTestMode } from "@/lib/testMode";

export type Decision = "report" | "ignore";
export type Answer = "fraud" | "safe";
// 信号検出理論：hit=詐欺を報告 / miss=詐欺を見逃し / fa=安全を誤報告 / cr=安全を正しく無視
export type SignalType = "hit" | "miss" | "fa" | "cr";

export type GamePhase =
  | "title"
  | "consent"
  | "intake"
  | "pretest"
  | "practice"
  | "exploring"
  | "investigating"
  | "judging"
  | "feedback"
  | "transfer_test"
  | "survey"
  | "result";

const GAME_PHASES: GamePhase[] = ["exploring", "investigating", "judging", "feedback"];

// decision × isFraud から信号検出のカテゴリを確定的に導出
export function deriveSignalType(decision: Decision, isFraud: boolean): SignalType {
  if (isFraud) return decision === "report" ? "hit" : "miss";
  return decision === "report" ? "fa" : "cr";
}

export interface InspectEvent {
  id: string;
  openMs: number; // シナリオ開始からの経過
  dwellMs: number; // 調査パネルを開いていた時間
}

export interface ScenarioLog {
  scenarioId: number;
  isFraud: boolean;
  difficulty: Difficulty; // 項目難易度（易/中/難）
  presentationOrder: number; // 提示順位（1始まり）
  reactionTimeMs: number; // 主要RT：初回調査→最終決定
  explorationTimeMs: number; // シナリオ開始→最初の調査
  decisionLatencyMs: number; // 最初に判定画面を開く→決定
  finalJudgeLatencyMs: number; // 最後に判定画面を開く→決定
  judgeOpenCount: number; // 判定画面を開いた回数（2以上＝調べ直した）
  decision: Decision;
  confidence: number;
  hintUsed: boolean;
  hintAtMs: number | null; // 旧定義（判定画面を開いてから）。schemaVersion 4 以降はヒントが探索画面のみなので常に null
  hintAtScenarioMs: number | null; // シナリオ開始からヒントを押すまで（schemaVersion 4〜）
  decisionBeforeHint: Decision | null; // 判定画面から戻って調べ直している時に選んでいた答え（それ以外は null）
  correct: boolean;
  signalType: SignalType;
  inspectedIds: string[];
  inspectEvents: InspectEvent[];
  viewedAllRelevant: boolean; // 判定に必要なオブジェクトをすべて調べたか
  distractorsInspected: number; // 調べたダミーオブジェクトの数
  hiddenMs: number; // このシナリオ中に画面が非表示だった時間（RTから除外する判断用）
  hiddenAfterFirstInspectMs: number; // 初回調査以降に非表示だった時間（reactionTimeMs と同じ区間）
  restarted: boolean; // 再読み込みでこのシナリオをやり直したか
}

export interface TestLog {
  questionId: string;
  form: TestForm;
  position: number; // テスト内の出題順（1始まり）
  difficulty: Difficulty;
  isFraud: boolean;
  answer: Answer;
  correct: boolean;
  confidence: number;
  reactionTimeMs: number;
  hiddenMs: number;
  restarted: boolean; // 回答中に再読み込みがあり、RTが途中から測り直しになった
  signalType: SignalType;
}

export interface Demographics {
  ageGroup: string;
  occupation: string;
  gender: string;
  scamExperience: string;
  itConfidence: number;
}

export interface Survey {
  learning: number;
  immersion: number;
  difficulty: number;
  sus: number[]; // SUS 10項目
  freeText: string;
}

export interface DeviceInfo {
  ua: string;
  screen: string;
  viewport: string;
  touch: boolean;
  orientation: string;
  language: string;
}

interface GameState {
  sessionId: string;
  schemaVersion: number;
  contentVersion: string;
  startedAt: number;
  deviceInfo: DeviceInfo | null;
  testRun: boolean;
  priorPlays: number; // この端末での過去のプレイ回数（-1=取得不可）。共用端末があるので自動除外には使わない
  testForms: { pre: TestForm; post: TestForm };
  testItemOrder: { pre: string[]; post: string[] }; // 出題順（再読み込みでも同じ順で続きから）
  phaseTimes: Record<string, number>; // 各フェーズの到達時刻（epoch ms）
  resumeCount: number; // 再読み込みで再開した回数
  contentVersionsSeen: string[]; // このセッション中に見た内容の版（2つ以上＝途中で配信が更新された）
  testRestartPending: boolean; // テスト中の再読み込み後、次の回答に restarted を付ける

  // 画面の非表示（アプリ切替など）の記録。一時的な切替を「離脱」とは決めない
  hiddenCount: number;
  hiddenTotalMs: number;
  hiddenAt: number | null;
  lastHiddenPhase: GamePhase | null;

  scenarioOrder: number[];
  currentIndex: number;
  phase: GamePhase;
  practiceDone: boolean;

  // シナリオ内の計測（performance.now 基準。再読み込みで無効になるためリセットする）
  scenarioStartTime: number | null;
  firstInspectTime: number | null;
  judgeOpenTime: number | null;
  lastJudgeOpenTime: number | null;
  judgeOpenCount: number;
  rtLocked: boolean;
  scenarioHiddenStart: number; // シナリオ開始時点の hiddenTotalMs
  inspectHiddenStart: number | null; // 初回調査時点の hiddenTotalMs
  scenarioRestarted: boolean;
  hintUsed: boolean;
  hintAtMs: number | null;
  hintAtScenarioMs: number | null;
  decisionBeforeHint: Decision | null;
  currentInspected: string[];
  currentInspectEvents: InspectEvent[];
  inspectOpenAt: number | null;

  logs: ScenarioLog[];
  preTestLogs: TestLog[];
  transferTestLogs: TestLog[];

  consent: { agreed: boolean; timestamp: number | null };
  demographics: Demographics | null;
  selfEfficacyPre: number | null;
  selfEfficacyPost: number | null;
  survey: Survey | null;
  resultType: string | null;
  // 匿名集計の送信状態。pending はオフライン中でもSDKが端末に保持して再送するので、再読み込み後も再送しない（二重加算防止）
  statsState: "none" | "pending" | "done" | "failed";
  // research=はじめて（研究用データ） / free=2回目以降の自由プレイ（研究用データと分けて収集・テストなし）
  playMode: "research" | "free";

  // actions
  setPhase: (phase: GamePhase) => void;
  startTimer: () => void;
  markScenarioStart: () => void;
  markJudgeOpen: () => void;
  takeHint: (decisionBeforeHint: Decision | null) => void;
  recordInspect: (id: string) => void;
  closeInspect: () => void;
  markPhase: (name: string) => void;
  setPriorPlays: (n: number) => void;
  markHidden: () => void;
  markVisible: () => void;
  completePractice: () => void;
  submitDecision: (decision: Decision, confidence: number, correct: boolean, isFraud: boolean) => void;
  submitPreTest: (log: Omit<TestLog, "signalType" | "restarted">) => void;
  submitTransferTest: (log: Omit<TestLog, "signalType" | "restarted">) => void;
  nextScenario: () => void;
  setConsent: (agreed: boolean) => void;
  setDemographics: (d: Demographics, selfEfficacyPre: number) => void;
  setSurvey: (s: Survey, selfEfficacyPost: number) => void;
  setResultType: (t: string) => void;
  setStatsState: (st: GameState["statsState"]) => void;
  setPlayMode: (m: GameState["playMode"]) => void;
  reset: () => void;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const captureDeviceInfo = (): DeviceInfo | null => {
  if (typeof window === "undefined") return null;
  return {
    ua: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
    language: navigator.language,
  };
};

// 開発サーバー、?test=1、または端末に保存されたテストモード（解除するまで維持）はテストとして記録する
const isTestRun = () => resolveTestMode();

// 関連オブジェクトの網羅とダミーへの寄り道を算出（探索プロセスの分析用）
function computeRelevance(scenarioId: number, inspected: string[]) {
  const relevant: string[] = getScenarioById(scenarioId).relevantIds;
  return {
    viewedAllRelevant: relevant.every((id) => inspected.includes(id)),
    distractorsInspected: inspected.filter((id) => !relevant.includes(id)).length,
  };
}

const toTestLog = (log: Omit<TestLog, "signalType" | "restarted">, restarted: boolean): TestLog => ({
  ...log,
  restarted,
  signalType: deriveSignalType(log.answer === "fraud" ? "report" : "ignore", log.isFraud),
});

const perScenarioReset = () => ({
  inspectHiddenStart: null as number | null,
  scenarioStartTime: null as number | null,
  firstInspectTime: null as number | null,
  judgeOpenTime: null as number | null,
  lastJudgeOpenTime: null as number | null,
  judgeOpenCount: 0,
  rtLocked: false,
  hintUsed: false,
  hintAtMs: null as number | null,
  hintAtScenarioMs: null as number | null,
  decisionBeforeHint: null as Decision | null,
  currentInspected: [] as string[],
  currentInspectEvents: [] as InspectEvent[],
  inspectOpenAt: null as number | null,
});

const initialState = () => {
  const forms = drawTestForms();
  return {
    sessionId: generateSessionId(),
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    startedAt: Date.now(),
    deviceInfo: captureDeviceInfo(),
    testRun: isTestRun(),
    priorPlays: 0,
    testForms: forms,
    testItemOrder: {
      pre: shuffle(formQuestions[forms.pre].map((q) => q.id)),
      post: shuffle(formQuestions[forms.post].map((q) => q.id)),
    },
    phaseTimes: {} as Record<string, number>,
    resumeCount: 0,
    contentVersionsSeen: [CONTENT_VERSION],
    testRestartPending: false,
    hiddenCount: 0,
    hiddenTotalMs: 0,
    hiddenAt: null as number | null,
    lastHiddenPhase: null as GamePhase | null,
    scenarioOrder: buildSessionOrder(),
    currentIndex: 0,
    phase: "title" as GamePhase,
    practiceDone: false,
    ...perScenarioReset(),
    scenarioHiddenStart: 0,
    scenarioRestarted: false,
    logs: [] as ScenarioLog[],
    preTestLogs: [] as TestLog[],
    transferTestLogs: [] as TestLog[],
    consent: { agreed: false, timestamp: null as number | null },
    demographics: null as Demographics | null,
    selfEfficacyPre: null as number | null,
    selfEfficacyPost: null as number | null,
    survey: null as Survey | null,
    resultType: null as string | null,
    statsState: "none" as GameState["statsState"],
    playMode: "research" as GameState["playMode"],
  };
};

// サーバー（静的書き出し時）では何も保存しないダミーストレージ
const noopStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

// 保存領域が使えない・満杯（QuotaExceeded 等）でもゲームを止めず、メモリ上だけで続行する
let storageWarned = false;
const safeSessionStorage: StateStorage = {
  getItem: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {
      if (!storageWarned) console.warn("セッションを端末に保存できません（再読み込みすると続きから再開できません）:", e);
      storageWarned = true;
    }
  },
  removeItem: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* 無視 */
    }
  },
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setPhase: (phase) => set({ phase }),

      // rtLocked が立っている間は再スタートしない（再タップでRTが歪むのを防ぐ）
      startTimer: () => {
        if (get().rtLocked) return;
        set({ firstInspectTime: performance.now(), rtLocked: true, inspectHiddenStart: get().hiddenTotalMs });
      },

      // 各シナリオ開始時に時刻と per-scenario 状態をリセット
      markScenarioStart: () =>
        set({ ...perScenarioReset(), scenarioStartTime: performance.now(), scenarioHiddenStart: get().hiddenTotalMs }),

      // 判定画面を開いた時刻（最初と最後の両方）と回数
      markJudgeOpen: () => {
        const now = performance.now();
        const { judgeOpenTime, judgeOpenCount } = get();
        set({ judgeOpenTime: judgeOpenTime ?? now, lastJudgeOpenTime: now, judgeOpenCount: judgeOpenCount + 1 });
      },

      // ヒントは探索画面のボタンからのみ。初回使用時にシナリオ開始からの時刻とヒント前の答えを記録
      takeHint: (decisionBeforeHint) => {
        const { hintUsed, scenarioStartTime } = get();
        if (hintUsed) return;
        set({
          hintUsed: true,
          hintAtMs: null,
          hintAtScenarioMs: scenarioStartTime != null ? Math.round(performance.now() - scenarioStartTime) : null,
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

      markHidden: () => {
        if (get().hiddenAt != null) return;
        set((s) => ({ hiddenAt: Date.now(), hiddenCount: s.hiddenCount + 1, lastHiddenPhase: s.phase }));
      },

      markVisible: () => {
        const { hiddenAt, hiddenTotalMs } = get();
        if (hiddenAt == null) return;
        set({ hiddenAt: null, hiddenTotalMs: hiddenTotalMs + (Date.now() - hiddenAt) });
      },

      completePractice: () => set({ practiceDone: true }),

      submitDecision: (decision, confidence, correct, isFraud) => {
        const s = get();
        const scenarioId = s.scenarioOrder[s.currentIndex];
        const now = performance.now();
        const since = (t: number | null) => (t != null ? Math.round(now - t) : 0);
        const log: ScenarioLog = {
          scenarioId,
          isFraud,
          difficulty: getScenarioById(scenarioId).difficulty,
          presentationOrder: s.currentIndex + 1,
          reactionTimeMs: since(s.firstInspectTime),
          explorationTimeMs:
            s.scenarioStartTime != null && s.firstInspectTime != null
              ? Math.round(s.firstInspectTime - s.scenarioStartTime)
              : 0,
          decisionLatencyMs: since(s.judgeOpenTime),
          finalJudgeLatencyMs: since(s.lastJudgeOpenTime),
          judgeOpenCount: s.judgeOpenCount,
          decision,
          confidence,
          hintUsed: s.hintUsed,
          hintAtMs: s.hintAtMs,
          hintAtScenarioMs: s.hintAtScenarioMs,
          decisionBeforeHint: s.decisionBeforeHint,
          correct,
          signalType: deriveSignalType(decision, isFraud),
          inspectedIds: s.currentInspected,
          inspectEvents: s.currentInspectEvents,
          ...computeRelevance(scenarioId, s.currentInspected),
          hiddenMs: s.hiddenTotalMs - s.scenarioHiddenStart,
          hiddenAfterFirstInspectMs: s.inspectHiddenStart != null ? s.hiddenTotalMs - s.inspectHiddenStart : 0,
          restarted: s.scenarioRestarted,
        };
        set({ logs: [...s.logs, log], scenarioRestarted: false });
      },

      submitPreTest: (log) =>
        set((state) => ({
          preTestLogs: [...state.preTestLogs, toTestLog(log, state.testRestartPending)],
          testRestartPending: false,
        })),

      submitTransferTest: (log) =>
        set((state) => ({
          transferTestLogs: [...state.transferTestLogs, toTestLog(log, state.testRestartPending)],
          testRestartPending: false,
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

      setResultType: (t) => set({ resultType: t }),

      setStatsState: (statsState) => set({ statsState }),

      setPlayMode: (playMode) => set({ playMode }),

      reset: () => set({ ...initialState() }),
    }),
    {
      name: "scamDetective.session",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? safeSessionStorage : noopStorage)),
      // 再読み込み後は performance.now 基準の時刻が無効になるので、計測中のシナリオをやり直しにする
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const inGame = GAME_PHASES.includes(state.phase);
        const answeredCurrent = state.logs.length > state.currentIndex;
        const patch: Partial<GameState> = {
          ...perScenarioReset(),
          hiddenAt: null,
          deviceInfo: captureDeviceInfo() ?? state.deviceInfo,
        };
        // 非表示のまま再読み込みされた場合、その時間も非表示時間に含める
        if (state.hiddenAt != null) {
          patch.hiddenTotalMs = state.hiddenTotalMs + Math.max(0, Date.now() - state.hiddenAt);
        }
        // 途中で配信が更新された場合：旧版のラベルは書き換えず、見た版をすべて記録する（分析で検出・除外する）
        const seen = state.contentVersionsSeen?.length ? state.contentVersionsSeen : [state.contentVersion];
        if (!seen.includes(CONTENT_VERSION)) patch.contentVersionsSeen = [...seen, CONTENT_VERSION];
        if (inGame || state.phase === "practice" || state.phase === "pretest" || state.phase === "transfer_test") {
          patch.resumeCount = state.resumeCount + 1;
        }
        // テスト中の再読み込み：次に回答する問題のRTはやり直し扱い（ログに restarted を付ける）
        if (state.phase === "pretest" || state.phase === "transfer_test") patch.testRestartPending = true;
        if (inGame) {
          if (answeredCurrent) {
            // 判定済み（解説を表示中）で再読み込み → 同じ解説から再開する（GameClient がログから復元）
            patch.phase = "feedback";
          } else {
            patch.phase = "exploring";
            patch.scenarioRestarted = true;
          }
        }
        // 復元はストア生成中に同期で走り useGameStore が未定義のため、生成後に反映する
        queueMicrotask(() => useGameStore.setState(patch));
      },
    },
  ),
);
