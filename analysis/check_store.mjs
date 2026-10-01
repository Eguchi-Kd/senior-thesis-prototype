// ストアの「実際の persist 復元（rehydrate）」を使って、再読み込み時の扱いを確かめる。
//   node analysis/check_store.mjs   （全ケース OK なら終了コード0）
import { createJiti } from "jiti";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

// ブラウザ環境の最小限の代用
const mem = new Map();
let throwOnSet = false;
globalThis.sessionStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    if (throwOnSet) throw new Error("QuotaExceededError");
    mem.set(k, v);
  },
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { location: { search: "?test=1" }, innerWidth: 800, innerHeight: 400, screen: { width: 800, height: 400 } };
globalThis.screen = globalThis.window.screen;
const local = new Map();
globalThis.localStorage = { getItem: (k) => (local.has(k) ? local.get(k) : null), setItem: (k, v) => local.set(k, v), removeItem: (k) => local.delete(k) };
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, "navigator", { value: { userAgent: "node-probe", maxTouchPoints: 0, language: "ja" }, configurable: true });
}

const jiti = createJiti(import.meta.url, { alias: { "@": root } });
const { useGameStore } = await jiti.import(join(root, "store/gameStore.ts"));
const { CONTENT_VERSION } = await jiti.import(join(root, "lib/version.ts"));
const KEY = "scamDetective.session";
const tick = () => new Promise((r) => setTimeout(r, 0));

// 保存済みの状態を書き換えてから復元する（＝その状態で再読み込みした）
async function reloadWith(mutate) {
  const saved = JSON.parse(mem.get(KEY));
  mutate(saved.state);
  mem.set(KEY, JSON.stringify(saved));
  await useGameStore.persist.rehydrate();
  await tick(); // onRehydrateStorage の反映（queueMicrotask）を待つ
  return useGameStore.getState();
}

let failures = 0;
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
  if (!cond) failures++;
};

const st = () => useGameStore.getState();
st().reset();
st().setConsent(true);

// 1. 解説表示中の再読み込み → 同じ解説（feedback, 同じ index）から再開
st().setPhase("exploring");
st().markScenarioStart();
st().recordInspect("smartphone");
st().submitDecision("report", 4, true, true);
st().setPhase("feedback");
let s = await reloadWith(() => {});
check("解説中の再読み込みで同じ解説から再開", s.phase === "feedback" && s.currentIndex === 0 && s.logs.length === 1, `phase=${s.phase} index=${s.currentIndex}`);

// 2. 判定前の再読み込み → 同じシナリオを最初から（restarted 印）
st().nextScenario();
st().markScenarioStart();
st().recordInspect("calendar");
s = await reloadWith(() => {});
check("判定前の再読み込みで同じシナリオをやり直し", s.phase === "exploring" && s.currentIndex === 1 && s.scenarioRestarted === true && s.currentInspected.length === 0);

// 3. 途中で配信が更新された → ラベルは旧版のまま、見た版を追記
s = await reloadWith((x) => {
  x.contentVersion = "old-content";
  x.contentVersionsSeen = ["old-content"];
});
check("旧版の途中セッションは版を書き換えず記録", s.contentVersion === "old-content" && s.contentVersionsSeen.join("|") === `old-content|${CONTENT_VERSION}`, s.contentVersionsSeen.join("|"));

// 4. 非表示のまま再読み込み → 非表示時間に加算
const before = st().hiddenTotalMs;
s = await reloadWith((x) => {
  x.hiddenAt = Date.now() - 40_000;
});
const added = s.hiddenTotalMs - before;
check("再読み込みをまたぐ非表示時間を加算", added >= 40_000 && added < 45_000 && s.hiddenAt === null, `+${added}ms`);

// 5. テスト中の再読み込み → 次の回答に restarted、その後は付かない
st().setPhase("pretest");
s = await reloadWith(() => {});
const q = { questionId: "PRE_F1", form: "A", position: 1, difficulty: "medium", isFraud: true, answer: "fraud", correct: true, confidence: 3, reactionTimeMs: 5000, hiddenMs: 0 };
st().submitPreTest(q);
st().submitPreTest({ ...q, questionId: "PRE_F2", position: 2 });
const [a, b] = st().preTestLogs;
check("テスト中の再読み込み後の最初の回答だけ restarted", a.restarted === true && b.restarted === false);

// 6. 保存領域が例外を投げても進行が止まらない
throwOnSet = true;
let threw = false;
try {
  st().setPhase("intake");
} catch {
  threw = true;
}
throwOnSet = false;
check("保存領域の例外でも setPhase が例外を投げない", !threw && st().phase === "intake");

// 7. テストモード：?test=1 で開始 → 結果画面（クエリなし）から再プレイしても維持 → ?test=0 で解除
window.location.search = "?test=1";
st().reset();
const t1 = st().testRun;
window.location.search = ""; // 結果画面・タイトル（クエリなし）
st().reset();
const t2 = st().testRun;
window.location.search = "?test=0";
st().reset();
const t3 = st().testRun;
window.location.search = "";
st().reset();
const t4 = st().testRun;
check("テストモードは再プレイ後も維持され、?test=0 で解除", t1 && t2 && !t3 && !t4, `${t1},${t2},${t3},${t4}`);

// 7b. ?test=1 を開いた画面で解除ボタン → そのまま開始（タイトルの exitTestMode と同じ処理）
const { saveTestMode } = await jiti.import(join(root, "lib/testMode.ts"));
window.location.search = "?test=1";
st().reset();
saveTestMode(false);
window.location.search = ""; // exitTestMode は history.replaceState でクエリを消す
st().reset();
check("?test=1 の画面で解除してから開始すると本番扱い", st().testRun === false && local.get("scamDetective.testMode") === undefined);

// 8. 初回調査以降の非表示時間は、初回調査前の非表示を含まない
st().reset();
st().setConsent(true);
st().setPhase("exploring");
st().markScenarioStart();
useGameStore.setState({ hiddenTotalMs: st().hiddenTotalMs + 40_000 }); // 調査前に40秒非表示
st().recordInspect("smartphone");
st().startTimer();
useGameStore.setState({ hiddenTotalMs: st().hiddenTotalMs + 5_000 }); // 調査後に5秒非表示
st().submitDecision("report", 3, true, true);
const lg = st().logs[0];
check("初回調査以降の非表示時間だけを別に記録", lg.hiddenMs === 45_000 && lg.hiddenAfterFirstInspectMs === 5_000, `hidden=${lg.hiddenMs} afterInspect=${lg.hiddenAfterFirstInspectMs}`);

console.log(failures ? `\n${failures} 件 FAIL` : "\nすべて OK");
process.exit(failures ? 1 : 0);
