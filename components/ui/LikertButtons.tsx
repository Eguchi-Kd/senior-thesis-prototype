"use client";

// 1〜5 の選択ボタン。初期値を持たせず（null）、選ぶまで回答扱いにしない＝「触らずに3」の混入を防ぐ。
export function LikertButtons({
  value,
  onChange,
  minLabel,
  maxLabel,
  dark = false,
}: {
  value: number | null;
  onChange: (v: number) => void;
  minLabel?: string;
  maxLabel?: string;
  dark?: boolean;
}) {
  const idle = dark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600";
  const sub = dark ? "text-gray-500" : "text-gray-400";
  return (
    <div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              value === n ? "bg-blue-600 text-white scale-105" : idle
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className={`flex justify-between text-xs mt-1 ${sub}`}>
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
