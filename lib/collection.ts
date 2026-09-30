// 学習カードのコレクション（この端末の localStorage に保存）。
// 使えない環境（プライベートモード等）でもゲームが止まらないよう、失敗は握りつぶす。
const KEY = "scamDetective.collection";

export function loadCollection(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addToCollection(cardId: string): boolean {
  const current = loadCollection();
  if (current.includes(cardId)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify([...current, cardId]));
  } catch {
    /* 保存できなくても進行は続ける */
  }
  return true;
}

export const scenarioCardId = (scenarioId: number) => `scenario-${scenarioId}`;
export const typeCardId = (typeId: string) => `type-${typeId}`;
