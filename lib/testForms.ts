import { preTestQuestions } from "./pretest";
import { transferTestQuestions } from "./transferTest";
import type { TestQuestion } from "./transferTest";

// 並行テストフォーム。どちらを事前/事後に使うかはセッションごとにランダム（カウンターバランス）。
export type TestForm = "A" | "B";

export const testForms: Record<TestForm, TestQuestion[]> = {
  A: preTestQuestions,
  B: transferTestQuestions,
};

export function drawTestForms(): { pre: TestForm; post: TestForm } {
  return Math.random() < 0.5 ? { pre: "A", post: "B" } : { pre: "B", post: "A" };
}
