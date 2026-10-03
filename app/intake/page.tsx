"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { saveSnapshot } from "@/lib/logger";
import { resumePath } from "@/lib/progress";
import { LikertButtons } from "@/components/ui/LikertButtons";

// 単一選択チップ
function ChipGroup({
  label,
  options,
  value,
  onChange,
  optional,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="mb-5">
      <p className="text-base text-gray-300 mb-2 font-bold">
        {label}
        {optional && <span className="text-gray-500 font-normal text-sm">（任意）</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-2 rounded-xl text-base transition-all ${
              value === opt ? "bg-blue-600 text-white scale-105" : "bg-gray-800 text-gray-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="mb-5">
      <p className="text-base text-gray-300 mb-2 font-bold">{label}</p>
      <LikertButtons value={value} onChange={onChange} minLabel="1 低い" maxLabel="5 高い" dark />
    </div>
  );
}

export default function IntakePage() {
  const router = useRouter();
  const setDemographics = useGameStore((s) => s.setDemographics);
  const markPhase = useGameStore((s) => s.markPhase);
  const setPhase = useGameStore((s) => s.setPhase);

  // 回答済み（または同意前・自由プレイ）で開かれた場合は、回答状況に応じた場所へ送る（属性の上書きや段階の巻き戻しをしない）
  useEffect(() => {
    const path = resumePath(useGameStore.getState());
    if (path !== "/intake") router.replace(path);
    else setPhase("intake");
  }, [router, setPhase]);

  const [ageGroup, setAgeGroup] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [scamExperience, setScamExperience] = useState("");
  const [itConfidence, setItConfidence] = useState<number | null>(null);
  const [selfEfficacyPre, setSelfEfficacyPre] = useState<number | null>(null);

  const ready = ageGroup && occupation && scamExperience && itConfidence != null && selfEfficacyPre != null;

  const handleNext = () => {
    if (!ready) return;
    setDemographics(
      { ageGroup, occupation, gender, scamExperience, itConfidence: itConfidence! },
      selfEfficacyPre!,
    );
    markPhase("intakeEnd");
    void saveSnapshot();
    router.push("/pretest");
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center px-6 py-8 text-white">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <h1 className="text-2xl font-black mb-1 text-center">あなたについて</h1>
        <p className="text-gray-400 text-sm text-center mb-6">分析に使います（匿名）</p>

        <ChipGroup label="年齢層" options={["13-15", "16-18", "19-22", "23-29", "30-39", "40以上"]} value={ageGroup} onChange={setAgeGroup} />
        <ChipGroup label="職業・学年" options={["中学生", "高校生", "大学・専門学生", "社会人", "その他"]} value={occupation} onChange={setOccupation} />
        <ChipGroup label="性別" options={["男性", "女性", "回答しない"]} value={gender} onChange={setGender} optional />
        <ChipGroup label="詐欺に遭遇したことは？" options={["ない", "不審な連絡を受けた", "だまされかけた", "被害にあった"]} value={scamExperience} onChange={setScamExperience} />
        <Scale label="ITやセキュリティへの自信" value={itConfidence} onChange={setItConfidence} />
        <Scale label="詐欺を見抜ける自信（今の気持ち）" value={selfEfficacyPre} onChange={setSelfEfficacyPre} />

        <button
          disabled={!ready}
          onClick={handleNext}
          className="w-full py-4 bg-blue-600 text-white text-lg font-black rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          次へ →
        </button>
      </motion.div>
    </div>
  );
}
