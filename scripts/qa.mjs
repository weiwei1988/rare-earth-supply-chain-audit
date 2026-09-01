import fs from "node:fs/promises";

const htmlUrl = new URL("../index.html", import.meta.url);
const html = await fs.readFile(htmlUrl, "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("アプリ本体のscriptが見つかりません。");
new Function(script);

const seedJson = script.match(/var seed=(\[[\s\S]*?\]);\n  seed=seed\.map/)?.[1];
const integratedJson = script.match(/var integratedStage05=(\[[\s\S]*?\])\.map\(function\(company\)/)?.[1];
const laserAdoptionsJson = script.match(/var solidStateLaserAdoptions=(\[[\s\S]*?\]);\n  seed=mergeCompanyRows\(seed,solidStateLaserAdoptions\)/)?.[1];
if (!seedJson || !integratedJson || !laserAdoptionsJson) throw new Error("埋め込みデータを抽出できません。");

const seed = JSON.parse(seedJson);
const integrated = JSON.parse(integratedJson);
const laserAdoptions = JSON.parse(laserAdoptionsJson);
const initStart = script.indexOf("(function(){") + "(function(){".length;
const initEnd = script.indexOf("  var dependencyRows=");
const mergeStart = script.indexOf("  function mergeCompanyRows(");
const mergeEnd = script.indexOf("  function inSelection(", mergeStart);
const evStart = script.indexOf("  function ev(");
const evEnd = script.indexOf("\n", evStart);
const finalSeed = new Function(
  "document",
  `${script.slice(initStart, initEnd)}\n${script.slice(evStart, evEnd)}\n${script.slice(mergeStart, mergeEnd)}\nreturn seed;`,
)({ getElementById() { return {}; } });
const deviceElements = {
  "05_laser": ["Y"],
  "05_engine": ["Y"],
  "05_energy": ["Y", "Sc"],
  "05_nuclear": ["Y"],
  "05_guid": ["DyTb", "Sm"],
  "05_sat": ["Y", "DyTb", "Sm", "Sc"],
  "05_flight": ["DyTb", "Sm", "Sc"],
  "05_robot": ["DyTb", "Sm"],
  "05_rf_sensor": ["Sc"],
  "05_defense_electronics": ["Y", "Sc"],
  "05_airframe_support": ["Y", "DyTb", "Sm", "Sc"],
};

const inherited = (subs) => [...new Set(subs.flatMap((sub) => deviceElements[sub] ?? []))];
const invalidSubs = integrated.flatMap((company) => company.subs.filter((sub) => !deviceElements[sub]).map((sub) => `${company.name}:${sub}`));
const withoutTags = integrated.filter((company) => inherited(company.subs).length === 0).map((company) => company.name);
const duplicates = integrated.map((company) => company.name).filter((name, index, all) => all.indexOf(name) !== index);
const excluded = ["沖電気工業（OKI）", "ダイキン工業", "村田製作所", "富士通", "セイコーエプソン", "NTN", "SUBARU"];
const seedAfterExclusion = seed.filter((company) => !excluded.includes(company.name));
const mergedNames = new Set(seedAfterExclusion.map((company) => company.name));
integrated.forEach((company) => mergedNames.add(company.name));
mergedNames.add("豊港（豊港化学）");
laserAdoptions.forEach((company) => mergedNames.add(company.name));

const expectedJapanAvionicsTags = inherited(["05_defense_electronics", "05_sat", "05_rf_sensor"])
  .filter((tag) => tag !== "DyTb");
const japanAvionicsRuntimeTags = finalSeed.find((company) => company.name === "日本アビオニクス")?.tags ?? [];
const japanAvionicsTagsValid =
  japanAvionicsRuntimeTags.length === expectedJapanAvionicsTags.length &&
  expectedJapanAvionicsTags.every((tag) => japanAvionicsRuntimeTags.includes(tag));
const defenseElectronicsDyTbCompanies = finalSeed
  .filter((company) => company.subs?.includes("05_defense_electronics") && company.tags?.includes("DyTb"))
  .map((company) => company.name);
const robotCompanies = finalSeed.filter((company) => company.subs?.includes("05_robot"));
const robotCompaniesMissingSm = robotCompanies
  .filter((company) => !company.tags?.includes("Sm"))
  .map((company) => company.name);
const hasPowderLabel = script.includes('label:"高機能粉末（YSZ・ScSZ）",header:"03 高機能粉末（YSZ・ScSZ）"');
const hasCrystalLabel = script.includes('label:"結晶（YAG・SAM）・セラミックス・前駆体",header:"03 結晶（YAG・SAM）・セラミックス・前駆体"');
const hasSamLabel = script.includes('label:"SAMウェハ・テンプレート",header:"04 SAMウェハ・テンプレート"');
const hasAlScMasterAlloyLabel = script.includes('label:"Al-Sc母合金（構造材・半導体）",header:"03 Al-Sc母合金（構造材・半導体）"');
const hasMetalAmFeedstockLabel = script.includes('label:"金属AM・結合用原料",header:"03 金属AM・結合用原料"');
const hasYagOscillatorLabel = script.includes('label:"固体レーザー発振器（YAG）",header:"04 固体レーザー発振器（YAG）"');
const hasSofcSoecLabel = script.includes('label:"固体酸化物形燃料電池（SOFC）／固体酸化物形電解（SOEC）",els:["Y","Sc"],forceEls:["Y"],src:["04_elec"]');
const hasCoatLabel = script.includes('label:"耐熱（TBC）／耐プラズマコーティング",header:"04 耐熱（TBC）／耐プラズマコーティング"');
const hasForcedNodeElementSupport = script.includes('var forced=item.forceEls||[]') &&
  script.includes('forced.indexOf(element)>=0||subElementCount(item.id,element)>0');
const mostImportantOverridesValid = [
  "AGC／AGCセイミケミカル",
  "日本ファインセラミックス",
].every((name) => finalSeed.find((company) => company.name === name)?.ev === "A");
const expectedLaserAdoptionNames = [
  "オキサイド",
  "京セラSOC株式会社",
  "TOWAレーザーフロント株式会社",
  "株式会社オプトクエスト",
  "エスシーティー株式会社（SCT）",
];
const laserAdoptionNames = laserAdoptions.map((company) => company.name);
const validLaserAdoptions =
  laserAdoptions.length === 5 &&
  expectedLaserAdoptionNames.every((name) => laserAdoptionNames.includes(name)) &&
  laserAdoptions.every((company) => company.id && company.formal === true && company.subs.includes("04_opt") && company.tags.includes("Y"));
const hasSctAtlaResearch = script.includes("防衛装備庁・安全保障技術研究推進制度の代表機関") &&
  script.includes("結晶設計・格子操作技術による固体レーザーの高速探索と機能開発") &&
  script.includes("1,955,394千円") &&
  script.includes("発振器量産メーカーではなくR&Dノード");
const stage04LaserNames = finalSeed.filter((company) => company.subs.includes("04_opt")).map((company) => company.name);
const materialMakersRemovedFromStage04 = !stage04LaserNames.includes("神島化学工業") && !stage04LaserNames.includes("信光社");
const missingCompanyIds = finalSeed.filter((company) => !company.id).map((company) => company.name);
const duplicateCompanyIds = finalSeed.map((company) => company.id).filter((id, index, ids) => ids.indexOf(id) !== index);
const detailDataComplete = [
  "京セラSOC株式会社",
  "TOWAレーザーフロント株式会社",
  "株式会社オプトクエスト",
  "エスシーティー株式会社（SCT）",
].every((name) => {
  const company = finalSeed.find((item) => item.name === name);
  return company && company.id && company.rev && company.prod && company.pos && company.def && company.chn && company.bom && company.gap && company.src;
});
const hasToyokou = script.includes('name:"豊港（豊港化学）"') &&
  script.includes('subs:["04_sc_crystal"]') &&
  script.includes('2～4インチScAlMgO₄（SAM）ウェハ・インゴット');
const hasJxCrossStagePatch = script.includes('if(company.name==="JX金属")') &&
  script.includes('stages:[3,4],\n        subs:["03_precursor","03_light_alloy","04_opt","04_target"]') &&
  script.includes('連結売上高8,846億円（2026年3月期）／YAGセラミックス事業売上は非開示（開発品）');
const hasFuruyaUpstreamPatch = script.includes('stages:[2,3,4],\n        subs:["02_metal","03_light_alloy","04_target"]');
const hasToyamaCrossCategoryPatch = script.includes('if(company.name==="富山住友電工")') &&
  script.includes('subs:["03_light_alloy","03_am_feedstock"]');
const hasStage02OrderSwap = script.includes('s2:["02_compound","02_metal","02_trade","02_recycle"]');
const hasMetalToAmEdge = script.includes('"02_metal":["03_magnet","03_light_alloy","03_am_feedstock"]');
const hasCompanyBackedElementNodes =
  script.includes("function subElementCount(id,element)") &&
  script.includes("els:activeEls(s)");
const hasElementEdgeDedup =
  script.includes("var edgeKeys=new Set()") &&
  script.includes('var edgeKey=a.id+"|"+b.id+"|"+e;') &&
  script.includes("if(edgeKeys.has(edgeKey))return;");
const hasEmptyPrimeGuard = script.includes("if(s5map[d.id].els.length>0)svg+=path");
const hasActualElementTagDisplay = script.includes("tagsHtml(pos.els)");
const hasNodeAndSourceDedup =
  script.includes("Array.from(new Set(activeOrders.s2))") &&
  script.includes("Array.from(new Set(d.src))");
const checks = {
  syntax: "ok",
  integratedRows: integrated.length,
  uniqueIntegratedCompanies: new Set(integrated.map((company) => company.name)).size,
  invalidSubs,
  withoutTags,
  duplicateIntegratedNames: duplicates,
  runtimeCompanyCount: finalSeed.length,
  airframeCompanies: integrated.filter((company) => company.subs.includes("05_airframe_support")).map((company) => company.name),
  japanAvionicsExpectedTags: expectedJapanAvionicsTags,
  japanAvionicsRuntimeTags,
  japanAvionicsTagsValid,
  defenseElectronicsDyTbCompanies,
  robotCompanyCount: robotCompanies.length,
  robotCompaniesMissingSm,
  powderLabelUpdated: hasPowderLabel,
  crystalLabelUpdated: hasCrystalLabel,
  samLabelUpdated: hasSamLabel,
  alScMasterAlloyLabelUpdated: hasAlScMasterAlloyLabel,
  metalAmFeedstockLabelUpdated: hasMetalAmFeedstockLabel,
  yagOscillatorLabelUpdated: hasYagOscillatorLabel,
  sofcSoecLabelUpdated: hasSofcSoecLabel,
  coatLabelUpdated: hasCoatLabel,
  forcedNodeElementSupport: hasForcedNodeElementSupport,
  mostImportantOverridesValid,
  laserAdoptionNames,
  solidStateLaserAdoptionsValid: validLaserAdoptions,
  sctAtlaResearchPresent: hasSctAtlaResearch,
  stage04LaserNames,
  materialMakersRemovedFromStage04,
  missingCompanyIds,
  duplicateCompanyIds,
  laserDetailDataComplete: detailDataComplete,
  toyokouAdded: hasToyokou,
  jxCrossStagePatchPresent: hasJxCrossStagePatch,
  furuyaUpstreamPatchPresent: hasFuruyaUpstreamPatch,
  toyamaCrossCategoryPatchPresent: hasToyamaCrossCategoryPatch,
  stage02OrderSwapped: hasStage02OrderSwap,
  metalToAmEdgePresent: hasMetalToAmEdge,
  companyBackedElementNodes: hasCompanyBackedElementNodes,
  elementEdgeDedup: hasElementEdgeDedup,
  emptyPrimeGuard: hasEmptyPrimeGuard,
  actualElementTagDisplay: hasActualElementTagDisplay,
  nodeAndSourceDedup: hasNodeAndSourceDedup,
  noIframe: !/<iframe\b/i.test(html),
  canvasHeight900: html.includes(".re-flow-canvas{position:relative;width:1400px;height:900px"),
};

if (
  checks.integratedRows !== 49 ||
  checks.uniqueIntegratedCompanies !== 49 ||
  checks.runtimeCompanyCount !== 123 ||
  invalidSubs.length ||
  withoutTags.length ||
  duplicates.length ||
  !japanAvionicsTagsValid ||
  defenseElectronicsDyTbCompanies.length ||
  robotCompanies.length !== 8 ||
  robotCompaniesMissingSm.length ||
  !hasPowderLabel ||
  !hasCrystalLabel ||
  !hasSamLabel ||
  !hasAlScMasterAlloyLabel ||
  !hasMetalAmFeedstockLabel ||
  !hasYagOscillatorLabel ||
  !hasSofcSoecLabel ||
  !hasCoatLabel ||
  !hasForcedNodeElementSupport ||
  !mostImportantOverridesValid ||
  !validLaserAdoptions ||
  !hasSctAtlaResearch ||
  stage04LaserNames.length !== 7 ||
  !materialMakersRemovedFromStage04 ||
  missingCompanyIds.length ||
  duplicateCompanyIds.length ||
  !detailDataComplete ||
  !hasToyokou ||
  !hasJxCrossStagePatch ||
  !hasFuruyaUpstreamPatch ||
  !hasToyamaCrossCategoryPatch ||
  !hasStage02OrderSwap ||
  !hasMetalToAmEdge ||
  !hasCompanyBackedElementNodes ||
  !hasElementEdgeDedup ||
  !hasEmptyPrimeGuard ||
  !hasActualElementTagDisplay ||
  !hasNodeAndSourceDedup ||
  !checks.noIframe ||
  !checks.canvasHeight900
) {
  throw new Error(JSON.stringify(checks));
}

console.log(JSON.stringify(checks));
