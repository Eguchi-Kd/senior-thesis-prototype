// 回答済みのデータから「参加者が今いるべきページ」を決める。
// phase（画面の目印）は戻る操作などで実態とずれることがあるため、遷移の判断には使わない。
interface ProgressState {
  consent: { agreed: boolean };
  playMode: "research" | "free";
  demographics: unknown | null;
  preTestLogs: unknown[];
  logs: unknown[];
  scenarioOrder: number[];
  testItemOrder: { pre: string[] };
}

export function resumePath(s: ProgressState): "/consent" | "/intake" | "/pretest" | "/game" | "/result" {
  if (!s.consent.agreed) return "/consent";
  if (s.playMode === "research") {
    if (!s.demographics) return "/intake";
    if (s.preTestLogs.length < s.testItemOrder.pre.length) return "/pretest";
  }
  if (s.logs.length < s.scenarioOrder.length) return "/game";
  return "/result";
}
