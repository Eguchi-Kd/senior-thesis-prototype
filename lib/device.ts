"use client";

import { useEffect, useState } from "react";

// プレイしている端末の種類（操作説明の文言の出し分けに使う。ログには記録しない）
export type DeviceKind = "pc" | "android" | "ios";

// iPhone・iPad・iPod（iPadOS は Mac と名乗るのでタッチ点の数で見分ける）
function isApple(ua: string): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function detectDevice(): DeviceKind {
  if (typeof window === "undefined") return "android";
  const ua = navigator.userAgent;
  if (isApple(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  // マウスなど細かく指せる入力がある端末は PC。タッチだけの端末はスマホと同じ文言にする
  try {
    if (window.matchMedia("(pointer: fine)").matches) return "pc";
  } catch {
    // matchMedia が使えない古いブラウザはスマホ扱い
  }
  return "android";
}

// 静的書き出しでは描画前に端末が分からないので、最初はスマホの文言で描き、表示後に判定し直す
export function useDevice(): DeviceKind {
  const [device, setDevice] = useState<DeviceKind>("android");
  useEffect(() => setDevice(detectDevice()), []);
  return device;
}
