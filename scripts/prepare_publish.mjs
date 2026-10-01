// 配信専用リポジトリ（公開）へ送るファイルを用意する。
// ビルド出力 out/ を publish/ に「コピー」し、コピーからコメント・書き残し・不要ファイルを取り除く。
// ソースのファイル（コメント入り）や out/ 自体は一切変更しない。
//   node scripts/prepare_publish.mjs [入力=out] [出力=publish]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { minify } = require("next/dist/compiled/terser");

const SRC = path.resolve(process.argv[2] || "out");
const DST = path.resolve(process.argv[3] || "publish");

// ゲームに不要なファイル（Next のテンプレート画像・説明書き・ソースマップ）
const REMOVE_NAMES = new Set(["file.svg", "globe.svg", "next.svg", "vercel.svg", "window.svg"]);
const isRemovable = (rel) => {
  const base = path.basename(rel).toLowerCase();
  return rel.endsWith(".map") || base.endsWith(".md") || base.startsWith("readme") || REMOVE_NAMES.has(path.basename(rel));
};

// 公開物に含まれてはいけない文字列（個人情報・AI とのやり取り・手元の環境・鍵）
const LEAK_PATTERNS = [
  /student7653/i, /@gmail\.com/i, /PC_User/, /C:[\\/]+Users/i, /\bClaude\b/, /\bCodex\b/,
  /AI_HANDOFF/, /CLAUDE\.md/, /AGENTS\.md/, /serviceAccountKey/, /private_key/, /BEGIN [A-Z ]*PRIVATE KEY/,
];

// React が描画に使う HTML の目印コメント（消すと表示が壊れるので残す）
const REACT_MARKER = /^(\s*|\$|\/\$|\$\?|\$!|&|\/&)$/;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : [p];
});

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`ビルド出力がありません: ${SRC}`);
  fs.rmSync(DST, { recursive: true, force: true });
  fs.cpSync(SRC, DST, { recursive: true });

  const licenses = new Set();
  const stats = { removed: [], js: 0, css: 0, html: 0, htmlCommentsRemoved: 0 };

  for (const file of walk(DST)) {
    const rel = path.relative(DST, file).replaceAll("\\", "/");
    if (isRemovable(rel)) {
      fs.rmSync(file);
      stats.removed.push(rel);
      continue;
    }
    if (rel.endsWith(".js")) {
      const code = fs.readFileSync(file, "utf8");
      for (const m of code.matchAll(/\/\*![\s\S]*?\*\/|\/\*\*?\s*@license[\s\S]*?\*\//g)) licenses.add(m[0].trim());
      // コードは変えず（圧縮・名前変更なし）、コメントだけをすべて落として書き直す
      const out = await minify(code, { compress: false, mangle: false, format: { comments: false } });
      if (out.code == null) throw new Error(`JS の処理に失敗: ${rel}`);
      fs.writeFileSync(file, out.code);
      stats.js++;
    } else if (rel.endsWith(".css")) {
      const css = fs.readFileSync(file, "utf8");
      for (const m of css.matchAll(/\/\*![\s\S]*?\*\//g)) licenses.add(m[0].trim());
      fs.writeFileSync(file, css.replace(/\/\*[\s\S]*?\*\//g, ""));
      stats.css++;
    } else if (rel.endsWith(".html")) {
      const html = fs.readFileSync(file, "utf8");
      const cleaned = html.replace(/<!--([\s\S]*?)-->/g, (all, inner) => {
        if (REACT_MARKER.test(inner)) return all;
        stats.htmlCommentsRemoved++;
        return "";
      });
      fs.writeFileSync(file, cleaned);
      stats.html++;
    }
  }

  // 第三者ライブラリのライセンス表記（表示義務のため1ファイルにまとめて残す。個人情報は含まない）
  const licenseText = [
    "Third-party software notices",
    "This site bundles open-source libraries. Their license notices are reproduced below.",
    "",
    ...[...licenses].map((l) => l.replace(/^\/\*!?\*?\s*|\s*\*\/$/g, "").replace(/^\s*\*\s?/gm, "").trim()),
  ].join("\n\n");
  fs.writeFileSync(path.join(DST, "licenses.txt"), licenseText + "\n");
  // _next フォルダを GitHub Pages で配信するため（Jekyll の処理を止める）
  fs.writeFileSync(path.join(DST, ".nojekyll"), "");

  // ─── 確認：コメントの残り・漏えい ───
  const problems = [];
  for (const file of walk(DST)) {
    const rel = path.relative(DST, file).replaceAll("\\", "/");
    const text = fs.readFileSync(file, "latin1").includes("\u0000") ? "" : fs.readFileSync(file, "utf8");
    if (!text) continue;
    for (const re of LEAK_PATTERNS) if (re.test(text)) problems.push(`${rel}: 公開してはいけない文字列 ${re}`);
    if (rel.endsWith(".css") && /\/\*/.test(text)) problems.push(`${rel}: CSS にコメントが残っている`);
    if (rel.endsWith(".html")) {
      for (const m of text.matchAll(/<!--([\s\S]*?)-->/g)) if (!REACT_MARKER.test(m[1])) problems.push(`${rel}: HTML にコメントが残っている`);
    }
    if (rel.endsWith(".js") && /sourceMappingURL/.test(text)) problems.push(`${rel}: ソースマップの参照が残っている`);
  }

  console.log(`JS ${stats.js}・CSS ${stats.css}・HTML ${stats.html} ファイルを処理（HTML コメント ${stats.htmlCommentsRemoved} 件を除去）`);
  console.log(`削除したファイル: ${stats.removed.length ? stats.removed.join(", ") : "なし"}`);
  console.log(`ライセンス表記: ${licenses.size} 件を licenses.txt にまとめた`);
  if (problems.length) {
    console.error("\n[ERROR] 公開できない内容が見つかりました:");
    for (const p of [...new Set(problems)]) console.error("  " + p);
    process.exit(1);
  }
  console.log(`\n確認 OK：コメントの残り・公開してはいけない文字列なし → ${DST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
