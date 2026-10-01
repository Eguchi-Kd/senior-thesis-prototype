"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { QuizRunner } from "@/components/ui/QuizRunner";
import { StageScreen } from "@/components/ui/StageScreen";
import { orderedQuestions } from "@/lib/testForms";
import { saveSnapshot } from "@/lib/logger";
import { resumePath } from "@/lib/progress";

type Screen = "intro" | "quiz" | "outro";

export default function PretestClient() {
  const router = useRouter();
  const { submitPreTest, setPhase, markPhase, testForms, testItemOrder, preTestLogs } = useGameStore();
  const questions = orderedQuestions(testForms.pre, testItemOrder.pre);
  const answered = preTestLogs.length;
  // 途中で再読み込みした場合は続きから
  const [screen, setScreen] = useState<Screen>(() => (answered >= questions.length ? "outro" : answered > 0 ? "quiz" : "intro"));

  // 戻る操作で再訪した場合：同意・属性が未回答ならそちらへ、事前テストを終えて本編に入っていれば本編（以降）へ送る。
  // 段階（phase）を pretest に戻すのは、事前テストを実際に行う場合だけ
  const [leaving] = useState(() => {
    const s = useGameStore.getState();
    const path = resumePath(s);
    const done = s.preTestLogs.length >= questions.length;
    return path === "/consent" || path === "/intake" || s.playMode === "free" || (done && (s.practiceDone || s.logs.length > 0));
  });
  useEffect(() => {
    if (leaving) router.replace(resumePath(useGameStore.getState()));
    else setPhase("pretest");
  }, [leaving, router, setPhase]);

  const handleComplete = useCallback(() => {
    markPhase("pretestEnd");
    void saveSnapshot();
    setScreen("outro");
  }, [markPhase]);

  if (leaving) return null;

  if (screen === "intro") {
    return (
      <StageScreen
        step="STEP 1 / 3"
        emoji="📝"
        title="事前テスト"
        buttonLabel="はじめる →"
        onNext={() => {
          markPhase("pretestStart");
          setScreen("quiz");
        }}
      >
        <p>ゲームの前に、今の実力をチェックします。</p>
        <p>届いたメッセージが <b>詐欺</b> か <b>正常</b> かを選び、どのくらい自信があるかをタップしてください（全{questions.length}問・約2分）。</p>
        <p className="text-amber-300">💡 答え合わせは最後にまとめて発表！ お楽しみに。</p>
      </StageScreen>
    );
  }

  if (screen === "outro") {
    return (
      <StageScreen
        step="STEP 1 / 3 クリア"
        emoji="🎉"
        title="事前テスト おつかれさま！"
        buttonLabel="ゲーム本編へ →"
        onNext={() => {
          setPhase("practice");
          router.push("/game");
        }}
      >
        <p>回答ありがとうございました！</p>
        <p>次はいよいよゲーム本編。3Dの部屋を歩き回って、スマホに届いた通知が詐欺かどうかを見破ろう。</p>
      </StageScreen>
    );
  }

  return (
    <QuizRunner
      questions={questions}
      startIndex={answered}
      form={testForms.pre}
      headerLabel="事前テスト"
      onSubmitOne={(r) => submitPreTest(r)}
      onComplete={handleComplete}
    />
  );
}
