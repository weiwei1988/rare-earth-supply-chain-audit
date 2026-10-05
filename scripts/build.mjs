// src/data/*.json から index.html（配布用画面）と JSX スナップショットのデータ部を生成する。
//   node scripts/build.mjs          … 生成物を書き戻す
//   node scripts/build.mjs --check  … 生成物とJSONの差分を検査する（npm test から実行）
import fs from "node:fs/promises";
import { loadDataset, fatal } from "./lib/dataset.mjs";
import { replaceGeneratedRegion, serializeGeneratedJson } from "./lib/generated.mjs";

const START = "GENERATED DATA START";
const END = "GENERATED DATA END";
const NOTICE = "scripts/build.mjs が src/data/*.json から生成。直接編集せず、JSONを編集して npm run build を実行すること。";

const htmlUrl = new URL("../index.html", import.meta.url);
const jsxUrl = new URL("../src/希土類サプライチェーン.jsx", import.meta.url);

function subcatForHtml(sub) {
  const out = { id: sub.id, stage: sub.stage, label: sub.label, header: sub.header, description: sub.description, els: sub.els };
  if (sub.forceEls) out.forceEls = sub.forceEls;
  if (sub.src) out.src = sub.src;
  if (sub.srcEls) out.srcEls = sub.srcEls;
  if (sub.srcNotes) out.srcNotes = sub.srcNotes;
  if (sub.srcSkip) out.srcSkip = sub.srcSkip;
  if (sub.note) out.note = sub.note;
  return out;
}

function htmlRegion(dataset) {
  return [
    `  /* ${START} — ${NOTICE} */`,
    `  var seed=${serializeGeneratedJson(dataset.companies)};`,
    `  var stages=${serializeGeneratedJson(dataset.stages)};`,
    `  var commerceSubs=${serializeGeneratedJson(dataset.subcategories.filter((sub) => sub.stage <= 3).map(subcatForHtml))};`,
    `  var parts=${serializeGeneratedJson(dataset.stageSubs(4).map(subcatForHtml))};`,
    `  var modules=${serializeGeneratedJson(dataset.stageSubs(5).map(subcatForHtml))};`,
    `  var systems=${serializeGeneratedJson(dataset.stageSubs(6).map(subcatForHtml))};`,
    `  var columnOrder=${serializeGeneratedJson(dataset.columnOrder)};`,
    `  var dependencyRows=${serializeGeneratedJson(dataset.dependency)};`,
    `  var localeData=${serializeGeneratedJson(dataset.locales)};`,
    `  /* ${END} */`,
  ].join("\n") + "\n";
}

function jsxRegion(dataset) {
  return [
    `/* ${START} — ${NOTICE} */`,
    `const STAGES = ${serializeGeneratedJson(dataset.stages, 2)};`,
    ``,
    `const SUBCATS = ${serializeGeneratedJson(dataset.subcategories, 2)};`,
    ``,
    `const SEED = ${serializeGeneratedJson(dataset.companies, 2)};`,
    ``,
    `const DEPENDENCY_ROWS = ${serializeGeneratedJson(dataset.dependency, 2)};`,
    `/* ${END} */`,
  ].join("\n") + "\n";
}

const dataset = await loadDataset().catch(fatal);
const check = process.argv.includes("--check");
const targets = [
  { path: "index.html", url: htmlUrl, region: htmlRegion(dataset) },
  { path: "src/希土類サプライチェーン.jsx", url: jsxUrl, region: jsxRegion(dataset) },
];

const stale = [];
const updated = [];
for (const target of targets) {
  const current = await fs.readFile(target.url, "utf8");
  const next = replaceGeneratedRegion(current, target.region, target.path);
  if (current === next) continue;
  if (check) stale.push(target.path);
  else {
    await fs.writeFile(target.url, next);
    updated.push(target.path);
  }
}

if (check && stale.length) {
  console.error(`生成物が src/data/*.json と同期していません: ${stale.join(", ")}`);
  console.error("`npm run build` を実行して差分を取り込んでください。");
  process.exit(1);
}

console.log(JSON.stringify({
  mode: check ? "check" : "build",
  companies: dataset.companies.length,
  subcategories: dataset.subcategories.length,
  stages: dataset.stages.length,
  dependencyRows: dataset.dependency.length,
  ...(check ? { inSync: true } : { updated }),
}));
