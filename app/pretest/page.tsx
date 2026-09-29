"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { testForms } from "@/lib/testForms";
import { saveSnapshot, registerDropoutSave } from "@/lib/logger";

export default function PretestPage() {
  const router = useRouter();
  const submitPreTest = useGameStore((s) => s.submitPreTest);
  const setPhase = useGameStore((s) => s.setPhase);
  const markPhase = useGameStore((s) => s.markPhase);
  const form = useGameStore((s) => s.testForms.pre);

  useEffect(() => registerDropoutSave(), []);
  useEffect(() => markPhase("pretestStart"), [markPhase]);

  return (
    <QuizRunner
      questions={testForms[form]}
      form={form}
      headerLabel="事前テスト（プレイ前）"
      onSubmitOne={(r) => submitPreTest(r)}
      onComplete={() => {
        markPhase("pretestEnd");
        void saveSnapshot();
        setPhase("exploring");
        router.push("/game");
      }}
    />
  );
}
