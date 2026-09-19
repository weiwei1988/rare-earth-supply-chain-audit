// 静的QA。src/data/*.json の内容そのものと、生成物（index.html / JSX）が
// JSONと一致しているかを検査する。文字列やインデックス位置に依存した抽出は行わない。
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadDataset, fatal, ELEMENTS, normalizeEv } from "./lib/dataset.mjs";
import { readGeneratedRegion, evaluateHtmlData, evaluateJsxData } from "./lib/generated.mjs";
import { sheetTags } from "./import-atla.mjs";

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
const financials = JSON.parse(await fs.readFile(new URL("../src/data/company-financials.json", import.meta.url), "utf8"));
const pagesWorkflow = await fs.readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const vendoredXlsx = await fs.readFile(new URL("../assets/vendor/xlsx.full.min.js", import.meta.url));

// --- データ側の不変条件 ---------------------------------------------------
report.companies = dataset.companies.length;
report.subcategories = dataset.subcategories.length;
report.stages = dataset.stages.length;

const reviewed = dataset.companies.filter(c => c.atla?.decision === "対象");
const taglessCompanies = dataset.companies.filter((company) => !company.tags.length).map((company) => company.name);
check("希土類フラグなし企業は0件", taglessCompanies.length === 0, taglessCompanies.join(", "));
check("工程5の希土類フラグなし企業は0件", dataset.companies.filter(c => c.stages.includes(5)).every(c => c.tags.length));
check("希土類対象外企業を収録しない", dataset.companies.every(c => c.atla?.rareEarthFlags !== "対象外" && c.atla?.rareEarthPossibility !== "対象外"));
check("文脈再確認後の人力判定57社を収録", reviewed.length === 57);
check("シート指定の希土類フラグと一致", reviewed.every(c => sameJson(c.tags, sheetTags(c.atla.rareEarthFlags))));
check("人力判定の分類と納入品を収録", reviewed.every(c => c.atlaProcurement && c.stages.includes(5) && c.atla.categories.every(s => c.subs.includes(s.id) && s.products.length && s.products.every(p => c.def.includes(p)))));
check("調達実績フラグ63社", dataset.companies.filter(c => c.atlaProcurement).length === 63);
const forbiddenPublicProvenance = ["row", "sourceUrl", "userReason", "spreadsheetId", "sheetId"];
check(
  "公開企業データに元Spreadsheetの識別子・行番号・自由記述がない",
  dataset.companies.every(company => !forbiddenPublicProvenance.some(key => company.atla?.[key] !== undefined)) &&
    !JSON.stringify(dataset.companies).includes("docs.google.com/spreadsheets/"),
);
check("希土類対象外のQPS研究所は除外", !dataset.companies.some(c => c.id === "stage05-integrated-10"));
check("高純度化学研究所はY・Scを維持", sameJson(dataset.companies.find(c => c.id === "seed-4")?.tags, ["Y", "Sc"]));
const santoku = dataset.companies.find(c => c.id === "seed-2");
check(
  "三徳は正式商号を維持してプロテリアルマグネティクス傘下と表示",
  santoku?.name === "三徳（プロテリアルマグネティクス傘下）" &&
    santoku?.own.includes("2026年7月1日") && santoku?.note.includes("正式商号は株式会社三徳")
);
const shinEtsu = dataset.companies.find(c => c.id === "seed-3");
check(
  "信越化学工業はグループ範囲で工程2・3の磁石上流を収録",
  ["02_compound", "02_metal", "02_recycle", "03_magnet", "03_ceramic", "03_precursor", "04_mag"].every(id => shinEtsu?.subs.includes(id)) &&
    [2, 3, 4].every(stage => shinEtsu?.stages.includes(stage)) &&
    shinEtsu?.note.includes("信越化学グループ")
);
const tdk = dataset.companies.find(c => c.id === "seed-19");
check(
  "TDKはグループ範囲で工程3に収録し工程2は対象外",
  tdk?.subs.includes("03_magnet") && tdk?.subs.includes("04_mag") &&
    tdk?.stages.includes(3) && tdk?.stages.includes(4) && !tdk?.stages.includes(2) &&
    tdk?.note.includes("TDK Ganzhou") && tdk?.note.includes("工程2対象外")
);
check("軍事用レーダー・モジュール9社、無人装備・ドローン10社", dataset.companiesInSub("05_military_radar").length === 9 && dataset.companiesInSub("05_unmanned").length === 10);
check("新設カテゴリーは調達実績企業のみ", [...dataset.companiesInSub("05_military_radar"), ...dataset.companiesInSub("05_unmanned")].every(c => c.atlaProcurement));
const addedEngineIds = ["engine-ihi-aero", "engine-khi-aero", "engine-mhiael", "engine-mhi-gt", "engine-ihi-power"];
const addedEngineCompanies = addedEngineIds.map(id => dataset.companies.find(c => c.id === id));
check(
  "航空エンジン・ガスタービンの追加調査5社を最重要として収録",
  addedEngineCompanies.every(company => company?.stages.includes(5) && sameJson(company.subs, ["05_engine"]) && sameJson(company.tags, ["Y"]) && company.ev === "A" && company.atlaProcurement && company.note.includes("2026-09-17公開情報調査で追加")) &&
    dataset.companiesInSub("05_engine").length === 9
);
check("企業・事業単位184件、工程5は135件、29分類", dataset.companies.length === 184 && dataset.companies.filter(c => c.stages.includes(5)).length === 135 && dataset.subcategories.length === 29);
check("全29分類に簡潔な解説文を収録", dataset.subcategories.every(sub => typeof sub.description === "string" && sub.description.trim().length >= 8 && sub.description.length <= 40));
const financialNames = new Set(financials.map(item => item.name));
check("新規ATLA企業57社の所有・売上を公開情報で調査", financials.length === 57 && reviewed.every(company => financialNames.has(company.name)));
check("所有・上場の仮表示を57社から解消", reviewed.every(company => company.own && !/所有・上場区分は未確認|^日本企業$/.test(company.own)));
check("売上規模に対象FY・年度不明・非公表のいずれかを明記", reviewed.every(company => company.rev && (/\d{4}|FY|対象年度|対象FY|非公表／不明/.test(company.rev))));
check("財務調査の構造化根拠とURLを保持", reviewed.every(company => company.financial?.sourceUrls?.length && company.financial.sourceUrls.every(url => company.src.includes(url))));
check("財務調査結果は売上数値33社・不明24社", financials.filter(item => item.revenue_value_jpy != null).length === 33 && financials.filter(item => item.revenue_value_jpy == null).length === 24);
check("HTMLとJSXに調達実績フラグ表示あり", html.includes('re-atla-badge') && jsx.includes('re-atla-badge'));
check(
  "多品目企業を一覧3件・詳細5件に要約し全件展開できる",
  html.includes("summarizeItems(c.prod,3)") && html.includes('details class="re-more"') && html.includes("display.hidden+5") &&
    jsx.includes("summarizeItems(full, 3)") && jsx.includes("summarizeItems(value, 5)") && jsx.includes("<details className=\"re-more\">")
);
const stage05Labels = dataset.stageSubs(5).flatMap(sub => [sub.label, sub.header.replace(/^05 /, '')]);
const categoryResidue = dataset.companies.filter(c => c.stages.includes(5)).flatMap(c => ['prod', 'def'].flatMap(field => stage05Labels.filter(label => String(c[field] ?? '').includes(`${label}：`)).map(label => `${c.name}:${field}:${label}`)));
check("工程5カードの主要製品・防衛用途に分類名接頭辞なし", categoryResidue.length === 0, categoryResidue.join(", "));
const internalResidue = dataset.companies.filter(c => c.stages.includes(5)).filter(c => /Stage 05『|05_[a-z_]+|所属するStage 05サブカテゴリー/.test(`${c.chn ?? ''} ${c.note ?? ''}`)).map(c => c.name);
check("工程5カードの注記・中国依存に内部分類名なし", internalResidue.length === 0, internalResidue.join(", "));
const kokusai = dataset.companies.find(c => c.name === "株式会社国際電気");
check("国際電気のラインテスタはRFのみでレーダー分類外", kokusai?.subs.includes("05_rf_sensor") && !kokusai?.subs.includes("05_military_radar") && kokusai?.prod.includes("レーダ試験器ラインテスタYPM-25"));
const contextualFalsePositiveIds = ["atla-6020001145951", "atla-3013301035504", "atla-9011601013273", "atla-5010001070887", "atla-3122001014600", "atla-4310001003520", "atla-3010801002612", "atla-8120001062020", "atla-5010401123798", "atla-2010001010788", "atla-3010001029349", "atla-4070001022669", "atla-5010001007914", "atla-7010401188476", "atla-3010001020497"];
check("文脈不適合のみの15カードを工程5から除外", contextualFalsePositiveIds.every(id => !dataset.companies.some(c => c.id === id)));

// 工程4→5はカテゴリー間の共通元素を全部つながず、用途に対応する元素だけを許可する。
const expectedStage05Routes = {
  "05_laser": { "04_opt": ["Y"] },
  "05_engine": { "04_coat": ["Y"] },
  "05_energy": { "04_elec": ["Y", "Sc"] },
  "05_nuclear": { "04_coat": ["Y"] },
  "05_guid": { "04_opt": ["Y"], "04_mag": ["DyTb", "Sm"], "04_target": ["Sc"], "04_sc_crystal": ["Sc"] },
  "05_sat": { "04_opt": ["Y"], "04_mag": ["DyTb", "Sm"], "04_sc_crystal": ["Sc"], "04_am": ["Sc"] },
  "05_flight": { "04_mag": ["DyTb", "Sm"] },
  "05_robot": { "04_mag": ["DyTb", "Sm"] },
  "05_rf_sensor": { "04_elec": ["Y", "Sc"], "04_target": ["Sc"], "04_sc_crystal": ["Sc"] },
  "05_defense_electronics": { "04_target": ["Y", "Sc"], "04_sc_crystal": ["Sc"] },
  "05_military_radar": { "04_target": ["Y", "Sc"], "04_sc_crystal": ["Sc"] },
  "05_unmanned": { "04_mag": ["DyTb", "Sm"] },
  "05_airframe_support": { "04_am": ["Sc"] },
};
const actualStage05Routes = Object.fromEntries(dataset.stageSubs(5).map((sub) => [sub.id, sub.srcEls]));
check("工程4→5の元素別接続表が監査済み定義と一致", sameJson(actualStage05Routes, expectedStage05Routes));
const stage05RouteKeys = dataset.stageSubs(5).flatMap((sub) => Object.entries(sub.srcEls).flatMap(([source, elements]) => elements.map((element) => `${source}|${sub.id}|${element}`)));
check("工程4→5の定義線は32本で重複なし", stage05RouteKeys.length === 32 && new Set(stage05RouteKeys).size === 32);
check("工程4→5の全接続に判定根拠あり", dataset.stageSubs(5).every((sub) => sub.src.every((source) => typeof sub.srcNotes[source] === "string" && sub.srcNotes[source].trim())));
check("サブカテゴリー元素フラグが接続元素と一致", dataset.stageSubs(5).every((sub) => sameJson(sub.els, [...new Set(Object.values(sub.srcEls).flat())])));
check(
  "全体では全接続線、サブカテゴリー選択時は関係する全上流・全下流接続だけを表示",
  html.includes('.re-edge{transition:opacity .12s ease}') &&
    html.includes('.re-flow-canvas.is-tracing .re-edge:not(.is-linked){opacity:0!important}') &&
    html.includes('traceNodeId=null') &&
    html.includes('selection={type:"all",id:"all"}') &&
    html.includes('if(selection.type==="all")return true') &&
    html.includes('traceNodeId=traceable?btn.dataset.id:null') &&
    html.includes('function walk(direction,element)') &&
    html.includes('selectedElements.forEach(function(element){walk("up",element);walk("down",element)}') &&
    html.includes('linked.has(edge)') &&
    !html.includes('edge.dataset.from===id||edge.dataset.to===id') &&
    !html.includes('mouseenter', html.indexOf('function traceEdges'))
);

const overTagged = dataset.companies
  .filter((company) => {
    // 人力確認シートの品目別タグはカテゴリーの一般的な宣言元素より優先する。
    // 上流接続はシートに根拠がないため自動で追加しない。
    if (company.atla?.decision === "対象") return false;
    const declared = new Set(company.subs.flatMap((id) => dataset.bySub.get(id).els));
    return company.tags.some((tag) => !declared.has(tag));
  })
  .map((company) => company.name);
check("従来カードのタグが宣言元素に収まり人力判定はシートと一致", overTagged.length === 0, overTagged.join(", "));

// 公開BOM未確認のため Dy/Tb を落としている工程（データ側で確定済みであることを保つ）。
const defenseDyTb = dataset.companiesInSub("05_defense_electronics").filter((company) => company.atla?.decision !== "対象" && company.tags.includes("DyTb")).map((company) => company.name);
check("旧防衛電子カードにカテゴリー由来のDy/Tbを再付与しない", defenseDyTb.length === 0, defenseDyTb.join(", "));

const robotMissingSm = dataset.companiesInSub("05_robot").filter((company) => !company.atla && !company.tags.includes("Sm")).map((company) => company.name);
check("旧ロボティクスカードのSmを維持しシート判定には継承しない", robotMissingSm.length === 0, robotMissingSm.join(", "));

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
check(
  "サブカテゴリーの高さを所属会社数に比例させる",
  html.includes("minCardHeight=70,perCompany=1.8,columnGap=6") &&
    html.includes("totalSubCount(item.id)*perCompany") &&
    html.includes("canvas.style.height=H+\"px\"") &&
    html.includes("totalSubCount(item.id)+'社")
);
check("サブカテゴリーに解説文を表示", html.includes('class="re-card-description"') && html.includes("esc(item.description)"));
check(
  "サブカテゴリーを横長にして工程間隔を確保",
  html.includes(".re-sub-card{width:230px") &&
    html.includes("var W=1400") &&
    html.includes("var s2x=295,s3x=578,s4x=861,s5x=1144") &&
    html.includes("var nodeW=230,matW=230,devW=230"),
);
check(
  "中国原料カードの横幅と比率をサブカテゴリーへ統一",
  html.includes(".re-stage-card{width:230px;height:82px") && html.includes('var source={id:"stage01",x:12,w:230'),
);
check(
  "元素絞り込みを代表色と複数色の分割配色で強調",
  html.includes(".re-sub-card.is-filter-match") &&
    html.includes("function segmentedGradient(tags,angle,colorValue)") &&
    html.includes("matchedEls.length>1?\" is-filter-multi\"") &&
    html.includes("--re-highlight-band:"),
);
check(
  "サプライチェーンを上下左右移動・拡大縮小・初期表示へ復帰",
  html.includes('id="re-flow-viewport"') &&
    html.includes('id="re-map-zoom-out"') &&
    html.includes('id="re-map-zoom-in"') &&
    html.includes('id="re-map-fit"') &&
    html.includes('function fitMapView()') &&
    html.includes('mapView.scale=1') &&
    html.includes('canvas.querySelector(\'[data-node-id="stage01"]\')') &&
    html.includes('sourceTargetLeft=Math.max(32,Math.min(80,viewport.clientWidth*.07))') &&
    html.includes('mapView.x=source?sourceTargetLeft-source.offsetLeft:0') &&
    html.includes('function zoomMap(nextScale,clientX,clientY)') &&
    html.includes('zoomIn.addEventListener("click",function(){zoomMap(mapView.scale+.1)') &&
    html.includes('zoomOut.addEventListener("click",function(){zoomMap(mapView.scale-.1)') &&
    html.includes('viewport.addEventListener("pointermove"') &&
    html.includes('viewport.addEventListener("wheel"') &&
    html.includes('Math.exp(-event.deltaY*.006)') &&
    html.includes('mapView.pointers=new Map()') &&
    html.includes('function beginPinch()') &&
    html.includes('mapView.pinchStartScale*(distance/mapView.pinchStartDistance)') &&
    html.includes('viewport.addEventListener("gesturechange"') &&
    html.includes('height:clamp(520px,72vh,900px)'),
);
check(
  "工程4・5の名称を更新し枠外システム統合を撤去",
  html.includes("STAGE 04 — モジュール・機器") &&
    html.includes("STAGE 05 — 装備・システム") &&
    !html.includes("OUT OF SCOPE / 枠外") &&
    !html.includes("re-prime-card") &&
    !html.includes("→ システム統合"),
);
check(
  "SheetJSを検証済みローカル資産から読み込む",
  html.includes('<script src="./assets/vendor/xlsx.full.min.js"></script>') &&
    !/<script[^>]+src=["']https?:\/\//i.test(html) &&
    createHash("sha256").update(vendoredXlsx).digest("hex") === "cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41" &&
    pagesWorkflow.includes("cp -R assets _site/"),
);
check(
  "公開生成物に元Spreadsheet情報がない",
  !html.includes("docs.google.com/spreadsheets/") && !jsx.includes("docs.google.com/spreadsheets/") &&
    !/\buserReason\b/.test(html) && !/\buserReason\b/.test(jsx),
);
check(
  "公開画面の外部通信とリファラー送信を制限",
  html.includes('name="referrer" content="no-referrer"') &&
    html.includes("connect-src 'none'") && html.includes("default-src 'self'"),
);

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
check("フロー図の接続表がデータ由来", !html.includes("var s2to3=") && !html.includes("var s3to4=") && html.includes("d.srcEls&&d.srcEls[src]"));

// 元素の集合が全ファイルで一致していること。
check("元素の一覧が index.html と一致", ELEMENTS.every((element) => html.includes(`"${element}"`)));

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error(`\nQA失敗 ${failures.length} 件:`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
