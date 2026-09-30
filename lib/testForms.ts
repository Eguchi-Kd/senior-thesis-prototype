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

// ストアに保存した出題順（id配列）どおりに問題を並べる
export function orderedQuestions(form: TestForm, ids: string[]): TestQuestion[] {
  const all = testForms[form];
  const ordered = ids.map((id) => all.find((q) => q.id === id)).filter((q): q is TestQuestion => !!q);
  return ordered.length === all.length ? ordered : all;
}

export function findQuestion(id: string): TestQuestion | undefined {
  return [...testForms.A, ...testForms.B].find((q) => q.id === id);
}
