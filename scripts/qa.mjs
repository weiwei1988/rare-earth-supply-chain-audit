// 静的QA。src/data/*.json の内容そのものと、生成物（index.html / JSX）が
// JSONと一致しているかを検査する。文字列やインデックス位置に依存した抽出は行わない。
import fs from "node:fs/promises";
import { loadDataset, fatal, ELEMENTS, normalizeEv } from "./lib/dataset.mjs";
import { readGeneratedRegion, evaluateHtmlData, evaluateJsxData } from "./lib/generated.mjs";

const failures = [];
const report = {};

function check(name, condition, detail) {
  report[name] = condition ? "ok" : detail ?? "不一致";
  if (!condition) failures.push(`${name}: ${detail ?? "不一致"}`);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const dataset = await loadDataset().catch(fatal);
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
const jsx = await fs.readFile(new URL("../src/希土類サプライチェーン.jsx", import.meta.url), "utf8");

// --- データ側の不変条件 ---------------------------------------------------
report.companies = dataset.companies.length;
report.subcategories = dataset.subcategories.length;
report.stages = dataset.stages.length;

const taglessCompanies = dataset.companies.filter((company) => !company.tags.length).map((company) => company.name);
check("全企業に希土類タグがある", taglessCompanies.length === 0, taglessCompanies.join(", "));

const overTagged = dataset.companies
  .filter((company) => {
    const declared = new Set(company.subs.flatMap((id) => dataset.bySub.get(id).els));
    return company.tags.some((tag) => !declared.has(tag));
  })
  .map((company) => company.name);
check("企業タグが所属サブカテゴリーの宣言元素に収まる", overTagged.length === 0, overTagged.join(", "));

// 公開BOM未確認のため Dy/Tb を落としている工程（データ側で確定済みであることを保つ）。
const defenseDyTb = dataset.companiesInSub("05_defense_electronics").filter((company) => company.tags.includes("DyTb")).map((company) => company.name);
check("05_defense_electronics に Dy/Tb タグがない", defenseDyTb.length === 0, defenseDyTb.join(", "));

const robotMissingSm = dataset.companiesInSub("05_robot").filter((company) => !company.tags.includes("Sm")).map((company) => company.name);
check("05_robot 所属企業はすべて Sm を持つ", robotMissingSm.length === 0, robotMissingSm.join(", "));

const unknownEv = dataset.companies.filter((company) => !["A", "B", "X"].includes(normalizeEv(company.ev))).map((company) => company.name);
check("評価が A/B/X に正規化できる", unknownEv.length === 0, unknownEv.join(", "));
report.evaluationCounts = dataset.companies.reduce((counts, company) => {
  const rank = normalizeEv(company.ev);
  counts[rank] = (counts[rank] ?? 0) + 1;
  return counts;
}, {});

// 宣言だけあって企業が1社もない元素は、画面側で線が消える（forceEls 指定分を除く）。
report.unbackedElements = dataset.subcategories.flatMap((sub) =>
  sub.els
    .filter((element) => !(sub.forceEls ?? []).includes(element) && dataset.elementCount(sub.id, element) === 0)
    .map((element) => `${sub.id}:${element}`),
);

// --- 生成物がJSONと一致しているか -----------------------------------------
const htmlData = evaluateHtmlData(html);
const jsxData = evaluateJsxData(jsx);

check("index.html の企業データがJSONと一致", sameJson(htmlData.seed, dataset.companies), `埋め込み ${htmlData.seed.length} 件`);
check("JSX の企業データがJSONと一致", sameJson(jsxData.SEED, dataset.companies), `埋め込み ${jsxData.SEED.length} 件`);

const htmlSubs = [...htmlData.commerceSubs, ...htmlData.mats, ...htmlData.devices];
check("index.html のサブカテゴリーがJSONと一致", sameJson(htmlSubs, dataset.subcategories), `埋め込み ${htmlSubs.length} 件`);
check("JSX のサブカテゴリーがJSONと一致", sameJson(jsxData.SUBCATS, dataset.subcategories), `埋め込み ${jsxData.SUBCATS.length} 件`);
check("JSX の工程がJSONと一致", sameJson(jsxData.STAGES, dataset.stages));
check(
  "index.html の工程見出しがJSONと一致",
  sameJson(htmlData.stages, dataset.stages.filter((stage) => stage.id <= 3).map((stage) => ({ id: stage.id, label: stage.label, sub: stage.short }))),
);

const dependencyShape = (rows) => rows.map((row) => ({ id: row.id, china: row.china, values: row.segments.map((segment) => segment.value) }));
check("index.html の中国依存データがJSONと一致", sameJson(dependencyShape(htmlData.dependencyRows), dependencyShape(dataset.dependency)));
check("JSX の中国依存データがJSONと一致", sameJson(dependencyShape(jsxData.DEPENDENCY_ROWS), dependencyShape(dataset.dependency)));
check(
  "中国依存データの色が解決済み",
  htmlData.dependencyRows.every((row) => row.segments.every((segment) => String(segment.color).startsWith("var(--"))) &&
    jsxData.DEPENDENCY_ROWS.every((row) => row.segments.every((segment) => String(segment.color).startsWith("var(--"))),
);

// --- 生成物の構造 ---------------------------------------------------------
check("index.html に iframe がない", !/<iframe/i.test(html));
check("フロー図の高さが900", /viewBox="0 0 \d+ 900"/.test(html) || html.includes("var W=1400,H=900"));
check("SheetJS の読み込みタグがある", html.includes("xlsx.full.min.js"));

// データ定義が生成領域の外に散らばっていないこと（手書きのコピーが復活していないかの検出）。
const htmlRegion = readGeneratedRegion(html, "index.html");
for (const declaration of ["var seed=", "var commerceSubs=", "var mats=", "var devices=", "var dependencyRows="]) {
  const inWhole = html.split(declaration).length - 1;
  const inRegion = htmlRegion.split(declaration).length - 1;
  check(`index.html の ${declaration} が生成領域内に1つだけ`, inWhole === 1 && inRegion === 1, `全体 ${inWhole} 箇所 / 生成領域 ${inRegion} 箇所`);
}
const jsxRegion = readGeneratedRegion(jsx, "src/希土類サプライチェーン.jsx");
for (const declaration of ["const SEED =", "const SUBCATS =", "const STAGES =", "const DEPENDENCY_ROWS ="]) {
  const inWhole = jsx.split(declaration).length - 1;
  const inRegion = jsxRegion.split(declaration).length - 1;
  check(`JSX の ${declaration} が生成領域内に1つだけ`, inWhole === 1 && inRegion === 1, `全体 ${inWhole} 箇所 / 生成領域 ${inRegion} 箇所`);
}
check("JSX に旧 SEED_ROWS が残っていない", !jsx.includes("SEED_ROWS"));

// 画面側のハードコードされた接続表が復活していないこと（接続は src/data 側が持つ）。
check("フロー図の接続表がデータ由来", !html.includes("var s2to3=") && !html.includes("var s3to4="));

// 元素の集合が全ファイルで一致していること。
check("元素の一覧が index.html と一致", ELEMENTS.every((element) => html.includes(`"${element}"`)));

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`\nQA失敗 ${failures.length} 件:`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
