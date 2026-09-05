// src/data/*.json から index.html（配布用画面）と JSX スナップショットのデータ部を生成する。
//   node scripts/build.mjs          … 生成物を書き戻す
//   node scripts/build.mjs --check  … 生成物とJSONの差分を検査する（npm test から実行）
import fs from "node:fs/promises";
import { loadDataset, fatal } from "./lib/dataset.mjs";

const START = "GENERATED DATA START";
const END = "GENERATED DATA END";
const NOTICE = "scripts/build.mjs が src/data/*.json から生成。直接編集せず、JSONを編集して npm run build を実行すること。";

const htmlUrl = new URL("../index.html", import.meta.url);
const jsxUrl = new URL("../src/希土類サプライチェーン.jsx", import.meta.url);

// COLORS.A のような識別子を一旦JSON文字列として持たせ、直列化の最後に引用符を外す。
const RAW_PREFIX = "@@raw:";
const raw = (expression) => `${RAW_PREFIX}${expression}`;
function serialize(value, indent) {
  const json = JSON.stringify(value, null, indent || undefined);
  return json.replace(new RegExp(`"${RAW_PREFIX}([^"]*)"`, "g"), "$1");
}

function replaceRegion(source, generated, path) {
  const startIndex = source.indexOf(START);
  const endIndex = source.indexOf(END);
  if (startIndex < 0 || endIndex < 0) {
    throw new Error(`${path} に生成領域のマーカー（${START} / ${END}）がありません。`);
  }
  const head = source.slice(0, source.lastIndexOf("\n", startIndex) + 1);
  const tail = source.slice(source.indexOf("\n", endIndex) + 1);
  return head + generated + tail;
}

function subcatForHtml(sub) {
  const out = { id: sub.id, stage: sub.stage, label: sub.label, header: sub.header, els: sub.els };
  if (sub.forceEls) out.forceEls = sub.forceEls;
  if (sub.src) out.src = sub.src;
  return out;
}

function dependencyWith(dataset, colorRef) {
  return dataset.dependency.map((row) => ({
    ...row,
    segments: row.segments.map((segment) => ({
      name: segment.name,
      value: segment.value,
      color: raw(colorRef(segment.color)),
    })),
  }));
}

function htmlRegion(dataset) {
  // 画面は左3列（Stage 01〜03）の見出しだけを stages から描画する。
  const headerStages = dataset.stages
    .filter((stage) => stage.id <= 3)
    .map((stage) => ({ id: stage.id, label: stage.label, sub: stage.short }));
  return [
    `  /* ${START} — ${NOTICE} */`,
    `  var seed=${serialize(dataset.companies)};`,
    `  var stages=${serialize(headerStages)};`,
    `  var commerceSubs=${serialize(dataset.subcategories.filter((sub) => sub.stage <= 3).map(subcatForHtml))};`,
    `  var mats=${serialize(dataset.stageSubs(4).map(subcatForHtml))};`,
    `  var devices=${serialize(dataset.stageSubs(5).map(subcatForHtml))};`,
    `  var dependencyRows=${serialize(dependencyWith(dataset, (token) => `depColors.${token}`))};`,
    `  /* ${END} */`,
  ].join("\n") + "\n";
}

function jsxRegion(dataset) {
  return [
    `/* ${START} — ${NOTICE} */`,
    `const STAGES = ${serialize(dataset.stages, 2)};`,
    ``,
    `const SUBCATS = ${serialize(dataset.subcategories, 2)};`,
    ``,
    `const SEED = ${serialize(dataset.companies, 2)};`,
    ``,
    `const DEPENDENCY_ROWS = ${serialize(dependencyWith(dataset, (token) => `COLORS.${token}`), 2)};`,
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
  const next = replaceRegion(current, target.region, target.path);
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
