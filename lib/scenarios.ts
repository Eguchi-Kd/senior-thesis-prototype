import { scenario1 } from "@/scenarios/scenario1";
import { scenario2 } from "@/scenarios/scenario2";
import { scenario3 } from "@/scenarios/scenario3";
import { scenario4 } from "@/scenarios/scenario4";

export const allScenarios = [scenario1, scenario2, scenario3, scenario4];

export function getScenario(id: number) {
  return allScenarios[id - 1] ?? scenario1;
}
