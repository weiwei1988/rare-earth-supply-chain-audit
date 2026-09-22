// 静的QA。src/data/*.json と生成物が一致し、6工程の元素別接続が公開境界を守ることを検査する。
import fs from "node:fs/promises";
import { loadDataset, fatal, ELEMENTS } from "./lib/dataset.mjs";
import { readGeneratedRegion, evaluateHtmlData, evaluateJsxData } from "./lib/generated.mjs";

const failures = [];
const report = {};

function check(name, condition, detail) {
  report[name] = condition ? "ok" : detail ?? "不一致";
  if (!condition) failures.push(name + ": " + (detail ?? "不一致"));
}
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const dataset = await loadDataset().catch(fatal);
const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
const jsx = await fs.readFile(new URL("../src/希土類サプライチェーン.jsx", import.meta.url), "utf8");
const financials = JSON.parse(await fs.readFile(new URL("../src/data/company-financials.json", import.meta.url), "utf8"));
const finalStage = Math.max(...dataset.stages.map((stage) => stage.id));

report.companies = dataset.companies.length;
report.subcategories = dataset.subcategories.length;
report.stages = dataset.stages.length;

// --- 構造・公開データ ------------------------------------------------------
check("6工程・47分類・197社", dataset.stages.length === 6 && dataset.subcategories.length === 47 && dataset.companies.length === 197);
check(
  "工程名称を6工程構造へ更新",
  sameJson(dataset.stages.map((stage) => stage.label), ["海外の資源・分離", "素材", "材料", "部材", "モジュール・機器", "装備・システム"]),
);
check(
  "工程別の延べ企業数",
  sameJson(Object.fromEntries([2, 3, 4, 5, 6].map((stage) => [stage, dataset.companies.filter((company) => company.stages.includes(stage)).length])), { 2: 8, 3: 17, 4: 37, 5: 65, 6: 101 }),
);
check(
  "列順が全47分類を工程ごとに一度ずつ指定",
  sameJson(Object.values(dataset.columnOrder).flat().sort(), dataset.subcategories.map((sub) => sub.id).sort()),
);
check("全分類に簡潔な解説文を収録", dataset.subcategories.every((sub) => sub.description.length >= 8 && sub.description.length <= 40));
check("希土類フラグなし企業は0件", dataset.companies.every((company) => company.tags.length));
check("最終工程の希土類フラグなし企業は0件", dataset.companies.filter((company) => company.stages.includes(finalStage)).every((company) => company.tags.length));
check("希土類対象外企業を収録しない", dataset.companies.every((company) => company.atla?.rareEarthFlags !== "対象外" && company.atla?.rareEarthPossibility !== "対象外"));

const routeCount = dataset.subcategories.reduce((sum, sub) => sum + (sub.src?.length ?? 0), 0);
const routeKeys = dataset.subcategories.flatMap((sub) => (sub.src ?? []).flatMap((source) => (sub.srcEls[source] ?? []).map((element) => source + "|" + sub.id + "|" + element)));
const skippedRoutes = dataset.subcategories.flatMap((sub) => Object.keys(sub.srcSkip ?? {}).map((source) => source + "|" + sub.id));
check("76本の監査済みカテゴリー接続", routeCount === 76);
check("元素別接続に重複なし", routeKeys.length === new Set(routeKeys).size);
check(
  "全工程の接続に元素と根拠を定義",
  dataset.subcategories.filter((sub) => sub.stage > 2).every((sub) =>
    sub.src.every((source) => (sub.srcEls[source] ?? []).length && typeof sub.srcNotes[source] === "string" && sub.srcNotes[source].trim()),
  ),
);
check(
  "分類の元素フラグは接続元素と一致",
  dataset.subcategories.filter((sub) => sub.stage > 2).every((sub) =>
    sameJson([...new Set(Object.values(sub.srcEls).flat())].sort(), [...sub.els].sort()),
  ),
);
check(
  "工程飛ばしは根拠付きの2接続のみ",
  sameJson(skippedRoutes.sort(), ["03_ceramic|05_tbc", "03_yttria_powder|05_plasma_parts"]),
);

// --- 企業カードと公開境界 ------------------------------------------------
const reviewed = dataset.companies.filter((company) => company.atla?.decision === "対象");
check("人力確認済みの調達品目対象57社を維持", reviewed.length === 57);
check("人力判定対象企業に希土類フラグを収録", reviewed.every((company) => company.tags.length && company.atla.rareEarthFlags));
check("防衛装備庁調達実績フラグ63社", dataset.companies.filter((company) => company.atlaProcurement).length === 63);
const forbiddenPublicProvenance = ["row", "sourceUrl", "userReason", "spreadsheetId", "sheetId"];
check(
  "公開企業データに内部Spreadsheet識別子がない",
  dataset.companies.every((company) => !forbiddenPublicProvenance.some((key) => company.atla?.[key] !== undefined)) &&
    !JSON.stringify(dataset.companies).includes("docs.google.com/spreadsheets/"),
);
const addedCompanies = ["堺化学工業", "共立マテリアル", "富士チタン工業", "戸田工業", "日本化学工業", "ニッキ株式会社", "東京エレクトロン", "日立ハイテク", "KOKUSAI ELECTRIC", "アルバック", "キヤノンアネルバ", "芝浦メカトロニクス", "サムコ", "パナソニック コネクト", "TOTO", "NTKセラテック", "クアーズテック", "西村陶業", "つばさ真空理研", "住友大阪セメント", "コベルコ科研", "日立GEニュークリア・エナジー"];
check("再構成で追加した22社を収録", addedCompanies.every((name) => dataset.companies.some((company) => company.name === name)));
check(
  "MLCC の村田製作所を1枚に統合し、太陽誘電を収録",
  ["株式会社出雲村田製作所", "株式会社福井村田製作所", "村田製作所 コンデンサ事業"].every((name) => !dataset.companies.some((company) => company.name === name)) &&
    ["村田製作所", "太陽誘電"].every((name) => dataset.companies.some((company) => company.name === name && company.subs.includes("05_electronics"))),
);
const removedCompanies = ["日本精工（NSK）", "NTN", "ジャムコ", "日機装", "エフ・エー・エス", "富士エアロスペーステクノロジー", "富士航空整備", "輸送機工業"];
check("関連性の薄い8社を除外", removedCompanies.every((name) => !dataset.companies.some((company) => company.name === name)));
const addedEngineIds = ["engine-ihi-aero", "engine-khi-aero", "engine-mhiael", "engine-mhi-gt", "engine-ihi-power"];
check(
  "航空エンジン・ガスタービン追加5社を最終工程へ収録",
  addedEngineIds.every((id) => {
    const company = dataset.companies.find((item) => item.id === id);
    return company?.stages.includes(6) && company.subs.includes("06_engine") && sameJson(company.tags, ["Y"]) && company.atlaProcurement;
  }),
);
check("所有・売上の公開情報調査57社を保持", financials.length === 57 && financials.every((item) => dataset.companies.some((company) => company.name === item.name && company.financial?.sourceUrls?.length)));
const legacySubIds = ["02_trade", "03_magnet", "03_precursor", "04_opt", "04_coat", "04_am", "05_engine", "05_energy", "05_military_radar", "05_unmanned"];
check("廃止サブカテゴリーIDを企業分類から除去", dataset.companies.every((company) => company.subs.every((id) => !legacySubIds.includes(id))));

// --- 生成物の同期 ---------------------------------------------------------
const htmlData = evaluateHtmlData(html);
const jsxData = evaluateJsxData(jsx);
check("index.html の企業データがJSONと一致", sameJson(htmlData.seed, dataset.companies));
check("JSX の企業データがJSONと一致", sameJson(jsxData.SEED, dataset.companies));
const htmlSubs = [...htmlData.commerceSubs, ...htmlData.parts, ...htmlData.modules, ...htmlData.systems];
check("index.html のサブカテゴリーがJSONと一致", sameJson(htmlSubs, dataset.subcategories));
check("index.html の列順がJSONと一致", sameJson(htmlData.columnOrder, dataset.columnOrder));
check("JSX のサブカテゴリーがJSONと一致", sameJson(jsxData.SUBCATS, dataset.subcategories));
check("JSX の工程がJSONと一致", sameJson(jsxData.STAGES, dataset.stages));
check("index.html の工程見出しがJSONと一致", sameJson(htmlData.stages, dataset.stages));
const dependencyShape = (rows) => rows.map((row) => ({ id: row.id, china: row.china, values: row.segments.map((segment) => segment.value) }));
check("中国依存データの生成物同期", sameJson(dependencyShape(htmlData.dependencyRows), dependencyShape(dataset.dependency)) && sameJson(dependencyShape(jsxData.DEPENDENCY_ROWS), dependencyShape(dataset.dependency)));

// --- 公開画面の構造 -------------------------------------------------------
check("index.html に iframe がない", !/<iframe/i.test(html));
check("全工程を画面幅に合わせて表示", html.includes(".re-flow-canvas{position:relative;isolation:isolate;width:1200px") && html.includes("W=Math.max(1200,Math.floor(viewport.clientWidth))") && html.includes("var cardWidth=Math.max(168,Math.min(240") && html.includes("var xByStage={2:sidePadding+columnStep") && html.includes("stage:6,items:systems") && html.includes("canvas.style.width=W+\"px\"") && html.includes(".re-flow-wrap{position:relative;overflow:visible;height:auto"));
check("海外の資源・分離を起点カードとして表示", html.includes("海外の資源・分離") && !html.includes("STAGE 01 — 中国原料"));
check("接続線は全工程のsrcElsとsrcNotesから描画", html.includes("item.srcEls&&item.srcEls[sourceId]") && html.includes("item.srcNotes&&item.srcNotes[sourceId]") && html.includes("curve(a.x+a.w,a.y+lane[element],b.x,b.y+lane[element])") && html.includes("width:'+pos.w+'px") && html.includes("width:'+source.w+'px"));
check(
  "全体では全接続線、分類選択時は全上流・全下流を強調",
  html.includes("function walk(direction,element)") &&
    html.includes('selectedElements.forEach(function(element){walk("up",element);walk("down",element)}') &&
    html.includes("allSubs.forEach(function(target){if((target.src||[]).indexOf(selected.id)>=0)"),
);
check("コンパクトなサブカテゴリーの高さを所属会社数に比例", html.includes("minCardHeight=92,perCompany=3,columnGap=8") && html.includes("totalSubCount(item.id)*perCompany") && html.includes(".re-card-description{font-size:9px") && !html.includes("is-compact .re-card-description{display:none}"));
check("元素絞り込みを代表色と分割配色で強調", html.includes(".re-sub-card.is-filter-match") && html.includes("function segmentedGradient(tags,angle,colorValue)") && html.includes("matchedEls.length>1?"));
check("サブカテゴリー選択時に企業一覧へ自動スクロール", html.includes("if(traceable)requestAnimationFrame(function(){") && html.includes('root.querySelector("#re-list-title")') && html.includes('heading.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})'));
check(
  "企業カードの評価ランク表示と色分けを撤去",
  !html.includes('aria-label="DD評価"') &&
    !html.includes("riskLabel") &&
    !html.includes("re-risk-dot") &&
    !html.includes("ratingOrder") &&
    html.includes("border-top:3px solid var(--risk-a)") &&
    html.includes('<div class="re-company-name">'),
);
check(
  "マップのズーム・ドラッグ操作を撤去してページスクロールに一本化",
  html.includes('id="re-flow-viewport"') &&
    html.includes("function initResponsiveMap()") &&
    !html.includes("re-map-zoom-out") &&
    !html.includes("function zoomMap(") &&
    !html.includes("function beginPinch()") &&
    !html.includes("mapView"),
);
check("画面からExcel読込機能を撤去", !html.includes('type="file"') && !jsx.includes('type="file"') && !html.includes("Excelを読み込む") && !jsx.includes("Excelを読み込む") && !/\bXLSX\b/.test(html) && !/\bXLSX\b/.test(jsx));
check("公開画面の外部通信とリファラー送信を制限", html.includes('name="referrer" content="no-referrer"') && html.includes("connect-src 'none'") && html.includes("default-src 'self'"));

// 生成領域外へのデータ複製を防ぐ。
const htmlRegion = readGeneratedRegion(html, "index.html");
for (const declaration of ["var seed=", "var commerceSubs=", "var parts=", "var modules=", "var systems=", "var columnOrder=", "var dependencyRows="]) {
  check("index.html の " + declaration + " が生成領域内に1つだけ", html.split(declaration).length - 1 === 1 && htmlRegion.split(declaration).length - 1 === 1);
}
check("JSX の生成データ定義が1組", ["const SEED =", "const SUBCATS =", "const STAGES =", "const DEPENDENCY_ROWS ="].every((declaration) => jsx.split(declaration).length - 1 === 1));
check("元素の一覧がindex.htmlと一致", ELEMENTS.every((element) => html.includes('"' + element + '"')));

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error("\nQA失敗 " + failures.length + " 件:");
  failures.forEach((failure) => console.error(" - " + failure));
  process.exit(1);
}
