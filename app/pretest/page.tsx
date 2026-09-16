"use client";

import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { preTestQuestions } from "@/lib/pretest";
import { saveSnapshot } from "@/lib/logger";

export default function PretestPage() {
  const router = useRouter();
  const submitPreTest = useGameStore((s) => s.submitPreTest);
  const setPhase = useGameStore((s) => s.setPhase);

  return (
    <QuizRunner
      questions={preTestQuestions}
      headerLabel="事前テスト（プレイ前）"
      onSubmitOne={(r) => submitPreTest(r)}
      onComplete={() => {
        void saveSnapshot();
        setPhase("exploring");
        router.push("/game");
      }}
    />
  );
}
