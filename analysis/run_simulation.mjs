// simulate_sessions.ts を jiti（Next の依存に含まれるTSランナー）で実行し、JSONに書き出す
import { createJiti } from "jiti";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const jiti = createJiti(import.meta.url, { alias: { "@": root } });
const { sessions } = await jiti.import(join(here, "simulate_sessions.ts"));

mkdirSync(join(here, "data"), { recursive: true });
const out = join(here, "data", "simulated_sessions.json");
writeFileSync(out, JSON.stringify(sessions, null, 2), "utf-8");
console.log(`simulated ${sessions.length} sessions -> ${out}`);
process.exit(0);
