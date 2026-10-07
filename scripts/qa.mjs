// 静的QA。src/data/*.json と生成物が一致し、6工程の元素別接続が公開境界を守ることを検査する。
import fs from "node:fs/promises";
import { loadDataset, fatal, ELEMENTS } from "./lib/dataset.mjs";
import { readGeneratedRegion, parseHtmlData, APP_REGION } from "./lib/generated.mjs";

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
  sameJson(Object.fromEntries([2, 3, 4, 5, 6].map((stage) => [stage, dataset.companies.filter((company) => company.stages.includes(stage)).length])), { 2: 8, 3: 17, 4: 38, 5: 65, 6: 101 }),
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
const htmlData = parseHtmlData(html);
check("index.html の企業データがJSONと一致", sameJson(htmlData.seed, dataset.companies));
const htmlSubs = [...htmlData.commerceSubs, ...htmlData.parts, ...htmlData.modules, ...htmlData.systems];
check("index.html のサブカテゴリーがJSONと一致", sameJson(htmlSubs, dataset.subcategories));
check("index.html の列順がJSONと一致", sameJson(htmlData.columnOrder, dataset.columnOrder));
check("index.html の工程見出しがJSONと一致", sameJson(htmlData.stages, dataset.stages));
check("中国依存データの生成物同期", sameJson(htmlData.dependencyRows, dataset.dependency));
const PUBLISHED_LOCALES = ["en", "zh-CN"];
check(
  "翻訳オーバーレイの生成物同期",
  sameJson(htmlData.localeData, Object.fromEntries(PUBLISHED_LOCALES.map((locale) => [locale, dataset.locales[locale]]))),
);
// ja は日本語正本と同一であることを dataset.mjs が強制しているため、配布物に重複して載せない。
check("日本語オーバーレイを配布物から除外", !Object.prototype.hasOwnProperty.call(htmlData.localeData, "ja"));
check(
  "企業カード本文を日本語・英語・簡体中文で全197社収録",
  ["ja", "en", "zh-CN"].every((locale) => Object.keys(dataset.locales[locale].companies).length === dataset.companies.length),
);
check(
  "簡体中文の未翻訳カタカナ社名は英語名と日本語名を併記",
  dataset.companies.every((company) => {
    const chineseName = dataset.locales["zh-CN"].companies[company.id].name;
    return !/[ァ-ヺー]/u.test(chineseName) || (
      chineseName.includes(dataset.locales.en.companies[company.id].name) &&
      chineseName.includes(company.name)
    );
  }),
);
const translatedRouteCount = dataset.subcategories.filter((sub) => sub.srcNotes).length;
check(
  "サブカテゴリー間接続説明を3言語で全件収録",
  ["ja", "en", "zh-CN"].every((locale) => Object.keys(dataset.locales[locale].routes).length === translatedRouteCount),
);

// --- 画面側の手書きテーブルがJSONを網羅しているか ---------------------------
// uiStrings / stageTranslations / subTranslations / flowOrderByElement は生成領域の外に
// 手書きされているため、JSONへ工程・サブカテゴリー・元素を足しても自動では追随しない。
// 画面側は未定義なら日本語へ黙ってフォールバックするので、ここで網羅を検査する。
function inlineBlock(source, opener) {
  const start = source.indexOf(opener);
  if (start < 0) return "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let quote = "";
  for (let i = start + opener.length - 1; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === "{" || char === "[") depth += 1;
    else if (char === "}" || char === "]") {
      depth -= 1;
      if (!depth) return source.slice(start + opener.length - 1, i + 1);
    }
  }
  return "";
}

const TRANSLATED_LOCALES = [
  { locale: "en", opener: "en:{" },
  { locale: "zh-CN", opener: '"zh-CN":{' },
];

const subTranslationBlock = inlineBlock(html, "var subTranslations={");
const missingSubTranslations = [];
for (const { locale, opener } of TRANSLATED_LOCALES) {
  const localeBlock = inlineBlock(subTranslationBlock, opener);
  for (const sub of dataset.subcategories) {
    if (!localeBlock.includes('"' + sub.id + '":[')) missingSubTranslations.push(locale + "/" + sub.id);
  }
}
check(
  "サブカテゴリー名称を英語・簡体中文で全件翻訳",
  missingSubTranslations.length === 0,
  "index.html の subTranslations に未定義: " + missingSubTranslations.join(", "),
);

const stageTranslationBlock = inlineBlock(html, "var stageTranslations={");
const missingStageTranslations = [];
for (const { locale, opener } of TRANSLATED_LOCALES) {
  const localeBlock = inlineBlock(stageTranslationBlock, opener);
  for (const stage of dataset.stages) {
    if (!localeBlock.includes(stage.id + ":[")) missingStageTranslations.push(locale + "/" + stage.id);
  }
}
check(
  "工程名称を英語・簡体中文で全件翻訳",
  missingStageTranslations.length === 0,
  "index.html の stageTranslations に未定義: " + missingStageTranslations.join(", "),
);

const uiStringBlock = inlineBlock(html, "var uiStrings={");
const japaneseUiKeys = [...inlineBlock(uiStringBlock, "ja:{").matchAll(/[,{]([A-Za-z][A-Za-z0-9]*):/g)].map((match) => match[1]);
const missingUiStrings = [];
for (const { locale, opener } of TRANSLATED_LOCALES) {
  const localeBlock = inlineBlock(uiStringBlock, opener);
  for (const key of japaneseUiKeys) {
    if (!new RegExp("[,{]" + key + ":").test(localeBlock)) missingUiStrings.push(locale + "/" + key);
  }
}
check(
  "画面ラベルを英語・簡体中文で全件翻訳",
  japaneseUiKeys.length > 0 && missingUiStrings.length === 0,
  "index.html の uiStrings に未定義: " + missingUiStrings.join(", "),
);

const flowOrderBlock = inlineBlock(html, "var flowOrderByElement={");
const flowOrderGaps = [];
for (const element of ELEMENTS) {
  const elementBlock = inlineBlock(flowOrderBlock, element + ":{");
  if (!elementBlock) {
    flowOrderGaps.push(element + ": 定義なし");
    continue;
  }
  for (const stage of dataset.stages.filter((item) => item.id >= 2)) {
    const stageBlock = inlineBlock(elementBlock, stage.id + ":[");
    const listed = [...stageBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    const expected = dataset.subcategories
      .filter((sub) => sub.stage === stage.id && sub.els.includes(element))
      .map((sub) => sub.id);
    const extra = listed.filter((id) => !expected.includes(id));
    const missing = expected.filter((id) => !listed.includes(id));
    if (extra.length) flowOrderGaps.push(element + "/" + stage.id + " 余分: " + extra.join(","));
    if (missing.length) flowOrderGaps.push(element + "/" + stage.id + " 不足: " + missing.join(","));
  }
}
check(
  "元素別フローの表示順が全サブカテゴリーを過不足なく網羅",
  flowOrderGaps.length === 0,
  "index.html の flowOrderByElement: " + flowOrderGaps.join(" / "),
);

const elementTables = [
  ["サブカテゴリーカードの配色 colors", inlineBlock(html, "var colors={")],
  ["接続線のレーン lane", inlineBlock(html, "var lane={")],
  ["中国依存ダッシュボードの配色 depColors", inlineBlock(html, "var depColors={")],
];
for (const [label, table] of elementTables) {
  const missing = ELEMENTS.filter((element) => !new RegExp("[,{]" + element + ":").test(table));
  check(label + " が全元素を網羅", missing.length === 0, "未定義: " + missing.join(", "));
}
const flowElementMetaBlock = inlineBlock(html, "var flowElementMeta={");
const missingElementMeta = ELEMENTS.filter(
  (element) => flowElementMetaBlock.split(element + ":{symbol:").length - 1 !== 3,
);
check(
  "元素カードの解説を3言語×全元素で定義",
  missingElementMeta.length === 0,
  "index.html の flowElementMeta に不足: " + missingElementMeta.join(", "),
);

// --- 公開画面の構造 -------------------------------------------------------
check("index.html に iframe がない", !/<iframe/i.test(html));
check("全工程を画面幅に合わせて表示", html.includes(".re-flow-canvas{position:relative;isolation:isolate;width:1200px") && html.includes("W=Math.max(1200,Math.floor(viewport.clientWidth))") && html.includes("var cardWidth=Math.max(176,Math.min(240") && html.includes("var xByStage={2:sidePadding+columnStep") && html.includes("stage:6,items:systems") && html.includes("canvas.style.width=W+\"px\"") && html.includes(".re-flow-wrap{position:relative;max-width:100%;overflow-x:auto;overflow-y:hidden;height:auto"));
check("海外の資源・分離を起点カードとして表示", html.includes("海外の資源・分離") && !html.includes("STAGE 01 — 中国原料"));
check(
  "Stage見出しを拡大し、元素フィルター連動の企業数を表示",
  html.includes(".re-column-label-title{grid-column:1;font-size:14.5px") &&
    html.includes(".re-column-label-count{grid-column:2") &&
    html.includes("function stageLabel(stage,x)") &&
    html.includes("companyCount(countStage(stage.id))") &&
    html.includes("function countStage(id){return visible().filter"),
);
check(
  "日本語・英語・簡体字中国語を両表示モードで切替",
  ["ja", "en", "zh-CN"].every((language) => html.includes(`data-language="${language}"`)) &&
    html.includes("var uiStrings={") &&
    html.includes("var stageTranslations={") &&
    html.includes("var subTranslations={") &&
    html.includes("function setLanguage(next)") &&
    html.includes('localStorage.setItem("rareEarthLanguage",language)') &&
    html.includes("document.documentElement.lang=language") &&
    html.includes('root.querySelector("#re-tab-overview").textContent=tr("overview")') &&
    html.includes('root.querySelector("#re-tab-element-flow").textContent=tr("elementFlow")'),
);
check(
  "元素フローの長い名称を省略せず複数行表示",
  html.includes("function flowLabelLines(value,limit)") &&
    html.includes("labelLines=flowLabelLines(label,language===\"en\"?30:16)") &&
    html.includes("labelLines=flowLabelLines(stageText(stage,\"label\"),language===\"en\"?22:18)") &&
    html.includes("shortLines=flowLabelLines(stageText(stage,\"short\"),language===\"en\"?34:28)") &&
    html.includes('svg.classList.toggle("is-english",language==="en")') &&
    !html.includes("shortenedLabel(label,16)") &&
    !html.includes("shortenedLabel(stageText(stage,\"short\"),28)"),
);
check("接続線は全工程のsrcElsと多言語srcNotesから描画", html.includes("item.srcEls&&item.srcEls[sourceId]") && html.includes("routeText(item,sourceId)") && html.includes("function routeText(target,source)") && html.includes("curve(a.x+a.w,a.y+lane[element],b.x,b.y+lane[element])") && html.includes("width:'+pos.w+'px") && html.includes("width:'+source.w+'px"));
check(
  "企業カードと検索は言語別オーバーレイを参照",
  html.includes("function companyText(company,key)") &&
    html.includes('companyText(company,"name")') &&
    html.includes('companyText(company,"prod")') &&
    html.includes('companyText(company,"def")') &&
    html.includes("translated.concat(canonical"),
);
check(
  "全体では全接続線、分類選択時は全上流・全下流を強調",
  html.includes("function traceLinkedEdges(edges,startId,reader,elementList)") &&
    html.includes("traceLinkedEdges(edges,id,edgeReader,selectedElements)") &&
    html.includes("allSubs.forEach(function(target){if((target.src||[]).indexOf(selected.id)>=0)"),
);
check("工程全体とサブカテゴリーの高さを所属会社数に比例", html.includes("minCardHeight=100,columnGap=8,columnBaseSpan=220,perStageCompany=16.6,perCardScaleCompany=.8,maxColumnSpan=1580") && html.includes("minimumSpan+stageCompanyCount*perCardScaleCompany") && html.includes("columnBaseSpan+stageCompanyCount*perStageCompany") && html.includes("extraHeight*weights[index]/weightTotal") && html.includes(".re-sub-card{width:176px;min-height:100px") && html.includes(".re-card-description{font-size:9.5px") && !html.includes("is-compact .re-card-description{display:none}"));
check(
  "元素フィルターの有無でサブカテゴリーカードの高さを固定",
  html.includes("function totalStageCount(id){return data.filter") &&
    html.includes("var stageCompanyCount=totalStageCount(stageMeta[column.stage].id)") &&
    !html.includes("var stageCompanyCount=countStage(stageMeta[column.stage].id)"),
);
const visualStageSpans = [2, 3, 4, 5, 6].map((stage) => {
  const categoryCount = dataset.columnOrder[stage].length;
  const companyCount = dataset.companies.filter((company) => company.stages.includes(stage)).length;
  const minimumSpan = categoryCount * 100 + Math.max(0, categoryCount - 1) * 8;
  return Math.max(minimumSpan + companyCount * 0.8, Math.min(1580, 220 + companyCount * 16.6));
});
check("工程列の総高は社数増加に合わせて下流ほど長い", visualStageSpans.every((span, index) => index === 0 || span > visualStageSpans[index - 1]), visualStageSpans.join(" < "));
check("元素絞り込みを代表色と分割配色で強調", html.includes(".re-sub-card.is-filter-match") && html.includes("function segmentedGradient(tags,angle,colorValue)") && html.includes("matchedEls.length>1?"));
check(
  "元素別フローを独立タブで表示",
  html.includes('data-view="overview"') &&
    html.includes('data-view="element-flow"') &&
    html.includes('id="re-element-flow-canvas"') &&
    html.includes("function renderElementFlow()") &&
    html.includes("target.item.srcEls[sourceId]") &&
    html.includes("各カテゴリーに出入りする帯の合計幅は、そのカテゴリーに所属する該当元素企業数に比例します") &&
    html.includes("traceLinkedEdges(edges,flowSelectionId,flowEdgeReader,null)") &&
    html.includes("linkedEdges.has(edge)?' is-linked':'") &&
    html.includes('svg.classList.toggle("is-tracing",!!flowSelectionId)') &&
    html.includes("function renderFlowElementControls()") &&
    html.includes("function renderOverviewElementControls()") &&
    html.includes("re-overview-element-controls") &&
    html.includes('class="re-flow-option-dependency"') &&
    html.includes('button.style.setProperty("--re-dependency"') &&
    html.includes('stageCount=flowStageCount(stage.id,flowElement)') &&
    html.includes('class="re-ef-stage-count"') &&
    html.includes('class="re-ef-stage-count-bg"') &&
    html.includes("countWidth=26+Array.from(countLabel).length*7.2") &&
    html.includes('class="re-ef-node-count-bg"') &&
    html.includes('class="re-ef-node-count"') &&
    html.includes("countWidth=20+Array.from(meta).length*6.5") &&
    html.includes("var flowOrderByElement={") &&
    html.includes('3:["03_ceramic","03_yag_crystal","03_dielectric_additive","03_yttria_powder"]') &&
    html.includes('4:["04_laser_medium","04_dielectric","04_mag"]') &&
    html.includes('3:["03_magnet_powder","03_magnet_alloy"]') &&
    html.includes('5:["05_am","05_sofc","05_electronics","05_scaln_film","05_tube"]') &&
    html.includes("flowSortIndex(flowElement,stage,a.id,order)-flowSortIndex(flowElement,stage,b.id,order)") &&
    html.includes('root.querySelector("#re-element-flow-frame").addEventListener("click"') &&
    !html.includes('var panel=root.querySelector(view==="element-flow"?"#re-view-element-flow":"#re-view-overview")') &&
    html.includes('id="re-flow-companies"') &&
    html.includes("function renderFlowCompanyResults()"),
);
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
check("画面からExcel読込機能を撤去", !html.includes('type="file"') && !html.includes("Excelを読み込む") && !/\bXLSX\b/.test(html));
check("公開画面の外部通信とリファラー送信を制限", html.includes('name="referrer" content="no-referrer"') && html.includes("connect-src 'none'") && html.includes("default-src 'self'"));

// --- アプリコードの置き場所 -------------------------------------------------
// 画面のスクリプトは src/app/*.js が正本。index.html には連結結果だけが入る。
const appFiles = (await fs.readdir(new URL("../src/app/", import.meta.url))).filter((name) => name.endsWith(".js")).sort();
report.appFiles = appFiles.length;
check("src/app に画面のスクリプトがある", appFiles.length >= 5, "見つかったファイル: " + appFiles.join(", "));
const appSources = Object.fromEntries(await Promise.all(appFiles.map(async (name) => [
  name, await fs.readFile(new URL(`../src/app/${name}`, import.meta.url), "utf8"),
])));
const withModuleSyntax = appFiles.filter((name) => /^\s*(?:import|export)\b/m.test(appSources[name]));
check(
  "src/app は連結して使うため import / export を持たない",
  withModuleSyntax.length === 0,
  "import / export がある: " + withModuleSyntax.join(", "),
);
const appRegionSource = readGeneratedRegion(html, "index.html", APP_REGION);
const notConcatenated = appFiles.filter((name) => !appRegionSource.includes(`// ---- src/app/${name} ----`));
check(
  "src/app の全ファイルが index.html に連結されている",
  notConcatenated.length === 0,
  "連結されていない: " + notConcatenated.join(", "),
);
// 画面のスクリプトが生成領域の外に書かれていないか（index.html を直接編集していないか）。
const inlineScript = html.slice(html.lastIndexOf("<script>"), html.lastIndexOf("</script>"));
const outsideRegions = inlineScript
  .replace(/\/\* GENERATED DATA START[\s\S]*?\/\* GENERATED DATA END \*\//, "")
  .replace(/\/\* APP CODE START[\s\S]*?\/\* APP CODE END \*\//, "")
  .split("\n").map((line) => line.trim()).filter(Boolean);
check(
  "index.html の手書きスクリプトは生成領域の中だけ",
  outsideRegions.every((line) => ["<script>", "(function(){", "})();"].includes(line)),
  "領域外の行: " + outsideRegions.filter((line) => !["<script>", "(function(){", "})();"].includes(line)).join(" / "),
);
check(
  "再描画の入口が refresh() に一本化されている",
  html.includes("function refresh(scope)") &&
    !/[^n]\brender\(\)/.test(appSources["view.js"] ?? "") &&
    appFiles.every((name) => !/\brenderList\(\);\s*renderDossier\(\)/.test(name === "view.js" ? "" : appSources[name])),
);

// 生成領域外へのデータ複製を防ぐ。
const htmlRegion = readGeneratedRegion(html, "index.html");
for (const declaration of ["var elements=", "var seed=", "var commerceSubs=", "var parts=", "var modules=", "var systems=", "var columnOrder=", "var dependencyRows=", "var localeData="]) {
  check("index.html の " + declaration + " が生成領域内に1つだけ", html.split(declaration).length - 1 === 1 && htmlRegion.split(declaration).length - 1 === 1);
}
check("元素の一覧を生成領域から供給", sameJson(htmlData.elements, ELEMENTS) && html.includes("allElements=elements.slice()") && html.includes("selectedElements=elements.slice()"));

console.log(JSON.stringify(report, null, 2));
if (failures.length) {
  console.error("\nQA失敗 " + failures.length + " 件:");
  failures.forEach((failure) => console.error(" - " + failure));
  process.exit(1);
}
