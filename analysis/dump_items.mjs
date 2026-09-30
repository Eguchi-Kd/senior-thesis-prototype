// 問題の定義（ID・正解・難易度・フォーム）を analysis/items.json に書き出す。
// validate_export.py がログの問題IDと正解を照合するのに使う。問題を変更したら再実行してコミットする。
//   node analysis/dump_items.mjs
import { createJiti } from "jiti";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const jiti = createJiti(import.meta.url, { alias: { "@": root } });
const { testForms } = await jiti.import(join(root, "lib/testForms.ts"));
const { allScenarios } = await jiti.import(join(root, "lib/scenarios.ts"));
const { CONTENT_VERSION } = await jiti.import(join(root, "lib/version.ts"));

const items = {
  contentVersion: CONTENT_VERSION,
  tests: Object.entries(testForms).flatMap(([form, qs]) =>
    qs.map((q) => ({ id: q.id, form, isFraud: q.isFraud, difficulty: q.difficulty })),
  ),
  scenarios: allScenarios.map((s) => ({ id: s.id, isFraud: s.isFraud, difficulty: s.difficulty })),
};
const out = join(here, "items.json");
writeFileSync(out, JSON.stringify(items, null, 2) + "\n", "utf-8");
console.log(`items: tests=${items.tests.length} scenarios=${items.scenarios.length} (${CONTENT_VERSION}) -> ${out}`);
process.exit(0);
