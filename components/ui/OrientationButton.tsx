"use client";

import { useEffect, useState } from "react";
import { detectDevice } from "@/lib/device";

type Lockable = ScreenOrientation & { lock?: (o: "landscape" | "portrait") => Promise<void>; unlock?: () => void };

// ボタンで画面の向きを固定できる端末か（Android の Chrome 等）。
// iPhone・iPad の Safari はブラウザが向きの固定に対応していないので、ボタンを出さず案内文にする
function canLockOrientation(): boolean {
  if (typeof window === "undefined") return false;
  const o = screen.orientation as Lockable | undefined;
  return detectDevice() !== "ios" && typeof document.documentElement.requestFullscreen === "function" && typeof o?.lock === "function";
}

async function lockTo(dir: "landscape" | "portrait"): Promise<boolean> {
  try {
    // 向きの固定は全画面表示中だけ許可される（全画面表示中は引っぱり更新も起きない）
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    await (screen.orientation as Lockable).lock?.(dir);
    return true;
  } catch {
    return false;
  }
}

const APPLE_HELP = "画面の向きのロックを解除して（コントロールセンターの🔒）、スマホを回してください";

// dir="landscape"：横向きにする（本編の前）／ dir="portrait"：縦向きに戻す（事後テストの前）
export function OrientationButton({ dir, dark = true }: { dir: "landscape" | "portrait"; dark?: boolean }) {
  const [lockable, setLockable] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setLockable(canLockOrientation()), []);

  const label = dir === "landscape" ? "↻ 横向きにする" : "↻ 縦向きに戻す";
  if (!lockable || failed) {
    return <p className={`text-sm leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>{APPLE_HELP}</p>;
  }
  return (
    <button
      onClick={async () => setFailed(!(await lockTo(dir)))}
      className="mt-1 px-6 py-3 rounded-full bg-blue-600 text-white text-base font-bold shadow-lg"
    >
      {label}
    </button>
  );
}
