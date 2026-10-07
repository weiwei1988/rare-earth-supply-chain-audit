// src/data/*.json と src/app/*.js から index.html（配布用画面）を組み立てる。
//   node scripts/build.mjs          … 生成物を書き戻す
//   node scripts/build.mjs --check  … 生成物とJSONの差分を検査する（npm test から実行）
import fs from "node:fs/promises";
import { loadDataset, fatal, ELEMENTS } from "./lib/dataset.mjs";
import { replaceGeneratedRegion, serializeGeneratedJson, APP_REGION, DATA_REGION } from "./lib/generated.mjs";

const START = "GENERATED DATA START";
const END = "GENERATED DATA END";
const NOTICE = "scripts/build.mjs が src/data/*.json から生成。直接編集せず、JSONを編集して npm run build を実行すること。";
const APP_NOTICE = "scripts/build.mjs が src/app/*.js から生成。直接編集せず、src/app を編集して npm run build を実行すること。";

// 連結する順番。var の初期化はこの順に実行されるため、並べ替えるときは依存を確かめること。
const APP_FILES = ["state", "i18n", "text", "model", "graph", "parts", "overview", "flow", "view"];

const htmlUrl = new URL("../index.html", import.meta.url);
const appDir = new URL("../src/app/", import.meta.url);

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

// ja オーバーレイは dataset.mjs が日本語正本と同一であることを強制しているため、
// 配布物には載せない。画面側は companyText / routeText が正本へフォールバックする。
function publishedLocales(locales) {
  return Object.fromEntries(Object.entries(locales).filter(([locale]) => locale !== "ja"));
}

function htmlRegion(dataset) {
  return [
    `  /* ${START} — ${NOTICE} */`,
    `  var elements=${serializeGeneratedJson(ELEMENTS)};`,
    `  var seed=${serializeGeneratedJson(dataset.companies)};`,
    `  var stages=${serializeGeneratedJson(dataset.stages)};`,
    `  var commerceSubs=${serializeGeneratedJson(dataset.subcategories.filter((sub) => sub.stage <= 3).map(subcatForHtml))};`,
    `  var parts=${serializeGeneratedJson(dataset.stageSubs(4).map(subcatForHtml))};`,
    `  var modules=${serializeGeneratedJson(dataset.stageSubs(5).map(subcatForHtml))};`,
    `  var systems=${serializeGeneratedJson(dataset.stageSubs(6).map(subcatForHtml))};`,
    `  var columnOrder=${serializeGeneratedJson(dataset.columnOrder)};`,
    `  var dependencyRows=${serializeGeneratedJson(dataset.dependency)};`,
    `  var localeData=${serializeGeneratedJson(publishedLocales(dataset.locales))};`,
    `  /* ${END} */`,
  ].join("\n") + "\n";
}

// src/app/*.js をひとつの即時実行関数の中身として連結する。各ファイルは同じスコープを共有するため
// import を持たない。行頭に2スペースを足して、index.html の中のインデントにそろえる。
async function appRegion() {
  const names = (await fs.readdir(appDir)).filter((name) => name.endsWith(".js")).map((name) => name.slice(0, -3)).sort();
  const listed = [...APP_FILES].sort();
  if (names.join(",") !== listed.join(",")) {
    fatal(new Error(`src/app のファイルと APP_FILES が一致しません（src/app: ${names.join(",")} / APP_FILES: ${listed.join(",")}）。`));
  }
  const parts = [`  /* ${APP_REGION} START — ${APP_NOTICE} */`];
  for (const name of APP_FILES) {
    const source = await fs.readFile(new URL(`${name}.js`, appDir), "utf8");
    const body = source.replace(/^\/\/[^\n]*\n(?:\/\/[^\n]*\n)*\n/, "").trimEnd();
    if (/^\s*(?:import|export)\b/m.test(body)) fatal(new Error(`src/app/${name}.js に import / export があります。連結して使うため使えません。`));
    parts.push(`  // ---- src/app/${name}.js ----`);
    parts.push(body.split("\n").map((line) => (line ? `  ${line}` : line)).join("\n"));
  }
  parts.push(`  /* ${APP_REGION} END */`);
  return parts.join("\n") + "\n";
}

const dataset = await loadDataset().catch(fatal);
const check = process.argv.includes("--check");
const targets = [
  { path: "index.html", url: htmlUrl, region: htmlRegion(dataset), name: DATA_REGION },
  { path: "index.html", url: htmlUrl, region: await appRegion(), name: APP_REGION },
];

const stale = [];
const updated = [];
for (const target of targets) {
  const current = await fs.readFile(target.url, "utf8");
  const next = replaceGeneratedRegion(current, target.region, target.path, target.name);
  if (current === next) continue;
  if (check) stale.push(`${target.path}（${target.name}）`);
  else {
    await fs.writeFile(target.url, next);
    updated.push(`${target.path}（${target.name}）`);
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
  appFiles: APP_FILES.length,
  ...(check ? { inSync: true } : { updated }),
}));
