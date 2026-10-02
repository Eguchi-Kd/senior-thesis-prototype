import { resolveTestMode } from "@/lib/testMode";

// 窓の外の表示の切り替え（検証中の都市風景 3D）。
// 本収集中の参加者に出ないよう、テストモード（?test=1）の端末で ?city=1 を開いたときだけ有効にする。
// ?city=0 で解除。既定は従来のループ映像（Room.tsx の WindowView）。
const KEY = "scamDetective.windowCity";

export function resolveWindowCity(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("city");
  let saved = false;
  try {
    if (q === "1") localStorage.setItem(KEY, "1");
    if (q === "0") localStorage.removeItem(KEY);
    saved = localStorage.getItem(KEY) === "1";
  } catch {
    /* 保存できない環境では URL の ?city=1 のみで判定する */
  }
  return (q === "1" || saved) && resolveTestMode();
}
