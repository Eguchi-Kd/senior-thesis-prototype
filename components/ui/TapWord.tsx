"use client";

import { useDevice } from "@/lib/device";

// 「タップ」（スマホ）／「クリック」（PC）を端末に合わせて表示する
export function TapWord() {
  return <>{useDevice() === "pc" ? "クリック" : "タップ"}</>;
}
