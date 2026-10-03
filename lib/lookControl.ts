// 視点操作の設定と、画面のボタン（正面に戻す・感度）から 3D 側（FPSControls）への合図。
// React の状態にせず共有オブジェクトで受け渡す（毎フレーム読むため・再描画を起こさないため）。

export type LookSensitivity = "low" | "mid" | "high";

const KEY = "scamDetective.lookSensitivity";
// 画面の横幅いっぱいをなぞったときの回転量（ラジアン）。中＝約180°
export const SENSITIVITY_RAD: Record<LookSensitivity, number> = { low: Math.PI * 0.6, mid: Math.PI, high: Math.PI * 1.6 };
export const SENSITIVITY_LABEL: Record<LookSensitivity, string> = { low: "低", mid: "中", high: "高" };
const ORDER: LookSensitivity[] = ["low", "mid", "high"];

function loadSensitivity(): LookSensitivity {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "low" || v === "mid" || v === "high") return v;
  } catch {
    /* 保存できない環境では既定値 */
  }
  return "mid";
}

export const lookControl = {
  sensitivity: "mid" as LookSensitivity,
  loaded: false,
  recenterRequested: false,
  lastSwipeEndAt: 0, // なぞる操作を終えた時刻（直後のタップを「調べる」にしないため）
};

export function getSensitivity(): LookSensitivity {
  if (!lookControl.loaded && typeof window !== "undefined") {
    lookControl.sensitivity = loadSensitivity();
    lookControl.loaded = true;
  }
  return lookControl.sensitivity;
}

export function cycleSensitivity(): LookSensitivity {
  const next = ORDER[(ORDER.indexOf(getSensitivity()) + 1) % ORDER.length];
  lookControl.sensitivity = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* 保存できない環境では今回だけ有効 */
  }
  return next;
}

export function requestRecenter() {
  lookControl.recenterRequested = true;
}

// なぞる操作の直後（0.35秒以内）は、物を調べるタップとして扱わない
export function justSwiped(): boolean {
  return performance.now() - lookControl.lastSwipeEndAt < 350;
}
