// テストモード（パイロット・動作確認）：?test=1 を開いた時点で端末に保存し、明示的に解除するまで維持する。
// 結果画面からの再プレイ等でURLのクエリが消えても、次の参加者が本番扱いにならないようにするため。
const KEY = "scamDetective.testMode";

export function isTestModeSaved(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function saveTestMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* 保存できない環境では URL の ?test=1 のみで判定される */
  }
}

// URL の ?test=1 / ?test=0 を端末の保存状態に反映してから、現在のテストモードを返す
export function resolveTestMode(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("test");
  if (q === "1") saveTestMode(true);
  if (q === "0") saveTestMode(false);
  return q === "1" || isTestModeSaved();
}
