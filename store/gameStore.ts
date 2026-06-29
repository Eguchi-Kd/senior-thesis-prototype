import { create } from "zustand";

export type Decision = "report" | "ignore" | "mistake" | null;
export type GamePhase =
  | "title"
  | "exploring"
  | "investigating"
  | "judging"
  | "feedback"
  | "transfer_test"
  | "result";

interface ScenarioLog {
  scenarioId: number;
  reactionTimeMs: number;
  decision: Decision;
  confidence: number;
  hintUsed: boolean;
  correct: boolean;
}

interface GameState {
  phase: GamePhase;
  currentScenario: number;
  totalScenarios: number;
  rtStartTime: number | null;
  hintUsed: boolean;
  logs: ScenarioLog[];
  sessionId: string;

  setPhase: (phase: GamePhase) => void;
  startTimer: () => void;
  stopTimer: () => number;
  useHint: () => void;
  submitDecision: (decision: Decision, confidence: number, correct: boolean) => void;
  nextScenario: () => void;
  reset: () => void;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useGameStore = create<GameState>((set, get) => ({
  phase: "title",
  currentScenario: 1,
  totalScenarios: 4,
  rtStartTime: null,
  hintUsed: false,
  logs: [],
  sessionId: generateSessionId(),

  setPhase: (phase) => set({ phase }),

  startTimer: () => set({ rtStartTime: performance.now() }),

  stopTimer: () => {
    const { rtStartTime } = get();
    if (!rtStartTime) return 0;
    const elapsed = Math.round(performance.now() - rtStartTime);
    set({ rtStartTime: null });
    return elapsed;
  },

  useHint: () => set({ hintUsed: true }),

  submitDecision: (decision, confidence, correct) => {
    const { currentScenario, hintUsed, logs, stopTimer } = get();
    const reactionTimeMs = stopTimer();
    const log: ScenarioLog = {
      scenarioId: currentScenario,
      reactionTimeMs,
      decision,
      confidence,
      hintUsed,
      correct,
    };
    set({ logs: [...logs, log] });
  },

  nextScenario: () => {
    const { currentScenario, totalScenarios } = get();
    if (currentScenario >= totalScenarios) {
      set({ phase: "transfer_test" });
    } else {
      set({ currentScenario: currentScenario + 1, hintUsed: false, phase: "exploring" });
    }
  },

  reset: () =>
    set({
      phase: "title",
      currentScenario: 1,
      rtStartTime: null,
      hintUsed: false,
      logs: [],
      sessionId: generateSessionId(),
    }),
}));
