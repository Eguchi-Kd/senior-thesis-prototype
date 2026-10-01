// 画面を経由した「戻る・再入場」の回帰確認（Edge ヘッドレス＋CDP。Firestore 通信は遮断する）。
// 保存状態（sessionStorage）を与えて各ページを開き、着いたページ・表示・回答件数を確かめる。
//   node scripts/check_navigation.cjs [ベースURL]
//   例）node scripts/check_navigation.cjs http://localhost:3001/senior-thesis-prototype/
//       node scripts/check_navigation.cjs https://eguchi-kd.github.io/senior-thesis-prototype/
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const WS = require("next/dist/compiled/ws");

const BASE = (process.argv[2] || "http://localhost:3001/senior-thesis-prototype/").replace(/\/?$/, "/");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PORT = 9241;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "nav-check-"));
  const proc = spawn(EDGE, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`,
    "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let ws;
  let failures = 0;
  try {
    let targets;
    for (let i = 0; i < 40 && !targets; i++) {
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { await sleep(250); }
    }
    if (!targets) throw new Error("Edge を起動できません");
    ws = new WS(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r) => ws.on("open", r));
    let id = 0;
    const pending = new Map();
    const errors = [];
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }));
    });
    ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      if (m.method === "Fetch.requestPaused") void send("Fetch.failRequest", { requestId: m.params.requestId, errorReason: "BlockedByClient" });
      if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*firestore.googleapis.com*" }, { urlPattern: "*firebaseio.com*" }] });
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    // タイトルを開いて、アプリが作る本物の初期状態を得る（?test=1：テスト扱い）
    await send("Page.navigate", { url: BASE + "?test=1" });
    await sleep(5000);
    const base = await evaluate(`JSON.parse(sessionStorage.getItem('scamDetective.session'))`);
    if (!base) throw new Error("初期状態を取得できません");
    const st0 = base.state;

    // 回答済みデータの合成
    const log = (sid, i) => ({ scenarioId: sid, isFraud: sid < 100, difficulty: "easy", presentationOrder: i + 1, reactionTimeMs: 20000,
      explorationTimeMs: 5000, decisionLatencyMs: 4000, finalJudgeLatencyMs: 4000, judgeOpenCount: 1, decision: sid < 100 ? "report" : "ignore",
      confidence: 4, hintUsed: false, hintAtMs: null, hintAtScenarioMs: null, decisionBeforeHint: null, correct: true,
      signalType: sid < 100 ? "hit" : "cr", inspectedIds: ["smartphone"], inspectEvents: [{ id: "smartphone", openMs: 5000, dwellMs: 3000 }],
      viewedAllRelevant: false, distractorsInspected: 0, hiddenMs: 0, hiddenAfterFirstInspectMs: 0, restarted: false });
    const tlog = (qid, form, i) => ({ questionId: qid, form, position: i + 1, difficulty: "easy", isFraud: qid.includes("_F"),
      answer: qid.includes("_F") ? "fraud" : "safe", correct: true, confidence: 3, reactionTimeMs: 8000, hiddenMs: 0, restarted: false,
      signalType: qid.includes("_F") ? "hit" : "cr" });
    const order = st0.scenarioOrder;
    const pre = st0.testItemOrder.pre.map((q, i) => tlog(q, st0.testForms.pre, i));
    const post = st0.testItemOrder.post.map((q, i) => tlog(q, st0.testForms.post, i));
    const survey = { learning: 4, immersion: 4, difficulty: 3, sus: [4, 2, 4, 1, 4, 2, 4, 2, 4, 2], freeText: "" };
    const common = { ...st0, testRun: true, consent: { agreed: true, timestamp: Date.now() },
      demographics: { ageGroup: "19-22", occupation: "大学・専門学生", gender: "", scamExperience: "ない", itConfidence: 3 }, selfEfficacyPre: 3,
      preTestLogs: pre, practiceDone: true };
    const mid = { ...common, logs: order.slice(0, 2).map(log), currentIndex: 2 };
    const done = { ...common, logs: order.map(log), currentIndex: order.length - 1 };

    async function openWith(state, page) {
      const script = await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('scamDetective.session', ${JSON.stringify(JSON.stringify({ ...base, state }))}); sessionStorage.setItem('__seeded','1'); }`,
      });
      await send("Page.navigate", { url: "about:blank" });
      await evaluate("1");
      await send("Page.navigate", { url: BASE + page });
      await sleep(6500);
      await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: script.identifier });
      const r = await evaluate(`(() => { const s = JSON.parse(sessionStorage.getItem('scamDetective.session')).state;
        return { path: location.pathname, text: document.body.innerText, phase: s.phase, logs: s.logs.length, pre: s.preTestLogs.length, post: s.transferTestLogs.length }; })()`);
      await evaluate("sessionStorage.removeItem('__seeded')");
      return r;
    }

    const cases = [
      ["本編途中（phase=consent のまま）→ /game で操作できる", { ...mid, phase: "consent" }, "game/", (r) => r.path.endsWith("/game/") && r.text.includes("ヒント") && r.text.includes("3 / 6") && r.phase === "exploring"],
      ["本編途中 → /consent に戻る → /game へ送られる", { ...mid, phase: "exploring" }, "consent/", (r) => r.path.endsWith("/game/") && r.text.includes("ヒント")],
      ["本編途中 → /intake に戻る → /game へ送られる", { ...mid, phase: "exploring" }, "intake/", (r) => r.path.endsWith("/game/") && r.text.includes("ヒント")],
      ["本編途中 → /pretest に戻る → /game へ送られ操作できる", { ...mid, phase: "exploring" }, "pretest/", (r) => r.path.endsWith("/game/") && r.text.includes("ヒント") && r.phase === "exploring"],
      ["本編終了直後（事後未着手）→ /game で終了画面", { ...done, phase: "transfer_test" }, "game/", (r) => r.text.includes("ゲーム本編クリア")],
      ["最終問の解説中に再入場 → 同じ解説", { ...done, phase: "feedback" }, "game/", (r) => r.text.includes("結果へ")],
      ["事後テスト途中 → /game → 終了画面（事後テストへ戻れる）", { ...done, phase: "transfer_test", transferTestLogs: post.slice(0, 3) }, "game/", (r) => r.text.includes("ゲーム本編クリア")],
      ["アンケート中 → /game → 結果側（アンケート）へ", { ...done, phase: "survey", transferTestLogs: post }, "game/", (r) => r.path.endsWith("/result/") && r.text.includes("アンケート")],
      ["研究の結果 → /game → 結果発表へ", { ...done, phase: "result", transferTestLogs: post, survey, selfEfficacyPost: 4, resultType: "detective" }, "game/", (r) => r.path.endsWith("/result/") && r.text.includes("結果発表")],
      ["自由プレイの結果 → /game → 結果発表へ", { ...st0, testRun: true, consent: { agreed: true, timestamp: Date.now() }, playMode: "free", practiceDone: true, logs: order.map(log), currentIndex: order.length - 1, phase: "result", resultType: "balanced" }, "game/", (r) => r.path.endsWith("/result/") && r.text.includes("結果発表")],
      ["研究の結果 → /pretest に戻る → 結果側へ", { ...done, phase: "result", transferTestLogs: post, survey, selfEfficacyPost: 4, resultType: "detective" }, "pretest/", (r) => r.path.endsWith("/result/")],
    ];
    for (const [name, state, page, ok] of cases) {
      const r = await openWith(state, page);
      const counts = r.logs <= 6 && r.pre <= 6 && r.post <= 6;
      const pass = ok(r) && counts;
      if (!pass) failures++;
      console.log(`${pass ? "OK  " : "FAIL"} ${name}  [着いた: ${r.path} / phase=${r.phase} / 本編${r.logs}・事前${r.pre}・事後${r.post}]`);
      if (!pass) console.log("      表示: " + r.text.replace(/\s+/g, " ").slice(0, 160));
    }
    if (errors.length) console.log("ページの例外:", [...new Set(errors)].slice(0, 5));
    console.log(failures ? `\n${failures} 件 FAIL` : "\nすべて OK");
  } finally {
    try { ws && ws.close(); } catch {}
    proc.kill();
  }
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
