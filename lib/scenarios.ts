import { scenario1 } from "@/scenarios/scenario1";
import { scenario2 } from "@/scenarios/scenario2";
import { scenario3 } from "@/scenarios/scenario3";
import { scenario4 } from "@/scenarios/scenario4";
import { scenarioSafe1 } from "@/scenarios/scenarioSafe1";
import { scenarioSafe2 } from "@/scenarios/scenarioSafe2";
import { shuffle } from "@/lib/shuffle";

// 詐欺4本 + 安全2本。安全シナリオは誤警報(False Alarm)・正棄却の測定に必須。
export const fraudScenarios = [scenario1, scenario2, scenario3, scenario4];
export const safeScenarios = [scenarioSafe1, scenarioSafe2];
export const allScenarios = [...fraudScenarios, ...safeScenarios];

// idからシナリオを引く（詐欺=1〜4, 安全=101,102）
export function getScenarioById(id: number) {
  return allScenarios.find((s) => s.id === id) ?? scenario1;
}


// セッション開始時に詐欺+安全を混ぜたシャッフル済みのid配列を作る
export function buildSessionOrder(): number[] {
  return shuffle(allScenarios.map((s) => s.id));
}
