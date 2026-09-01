import fs from "node:fs/promises";

const htmlUrl = new URL("../index.html", import.meta.url);
const html = await fs.readFile(htmlUrl, "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error("アプリ本体のscriptが見つかりません。");

const start = script.indexOf("(function(){") + "(function(){".length;
const end = script.indexOf("  var dependencyRows=");
if (start < 0 || end < 0) throw new Error("初期データ領域を抽出できません。");
const initBody = script.slice(start, end);
const mergeStart = script.indexOf("  function mergeCompanyRows(");
const mergeEnd = script.indexOf("  function inSelection(", mergeStart);
if (mergeStart < 0 || mergeEnd < 0) throw new Error("企業統合関数を抽出できません。");
const mergeFunction = script.slice(mergeStart, mergeEnd);
const evStart = script.indexOf("  function ev(");
const evEnd = script.indexOf("\n", evStart);
if (evStart < 0 || evEnd < 0) throw new Error("評価正規化関数を抽出できません。");
const evFunction = script.slice(evStart, evEnd);
const init = new Function(
  "document",
  `${initBody}\n${evFunction}\n${mergeFunction}\nreturn {seed:seed,commerceSubs:commerceSubs,mats:mats,devices:devices};`,
)({ getElementById() { return {}; } });

const { seed, commerceSubs, mats, devices } = init;
const categories = [...commerceSubs, ...mats, ...devices];
const categoryMap = new Map(categories.map((item) => [item.id, item]));
const elements = ["Y", "DyTb", "Sm", "Sc"];

const duplicateCategoryIds = categories
  .map((item) => item.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
const duplicateCompanyNames = seed
  .map((company) => company.name)
  .filter((name, index, names) => names.indexOf(name) !== index);

function companyCount(id, element) {
  return seed.filter(
    (company) =>
      Array.isArray(company.subs) &&
      company.subs.includes(id) &&
      Array.isArray(company.tags) &&
      company.tags.includes(element),
  ).length;
}

function declaredElements(id) {
  return categoryMap.get(id)?.els ?? [];
}

const s2to3 = {
  "02_compound": ["03_ceramic", "03_precursor", "03_magnet", "03_light_alloy"],
  "02_metal": ["03_magnet", "03_light_alloy", "03_am_feedstock"],
  "02_recycle": ["03_ceramic", "03_magnet", "03_precursor", "03_light_alloy"],
  "02_trade": ["03_ceramic", "03_magnet", "03_precursor", "03_light_alloy", "03_am_feedstock"],
};
const s3to4 = {
  "03_ceramic": ["04_coat", "04_elec"],
  "03_precursor": ["04_coat", "04_opt", "04_target", "04_sc_crystal"],
  "03_magnet": ["04_mag"],
  "03_light_alloy": ["04_target", "04_am"],
  "03_am_feedstock": ["04_am"],
};

const candidateEdges = [];
function addCandidates(from, to, allowed = null) {
  const fromElements = from === "stage01" ? elements : declaredElements(from);
  const toElements = declaredElements(to);
  const pool = allowed ?? fromElements;
  for (const element of pool) {
    if (fromElements.includes(element) && toElements.includes(element)) {
      candidateEdges.push({ from, to, element });
    }
  }
}

for (const item of commerceSubs.filter((item) => item.stage === 2)) {
  addCandidates("stage01", item.id, item.els);
}
for (const [from, targets] of Object.entries(s2to3)) {
  for (const to of targets) addCandidates(from, to);
}
for (const [from, targets] of Object.entries(s3to4)) {
  for (const to of targets) addCandidates(from, to);
}
for (const device of devices) {
  for (const from of device.src) addCandidates(from, device.id);
}

const keyOf = (edge) => `${edge.from}|${edge.to}|${edge.element}`;
const duplicateEdgeKeys = candidateEdges
  .map(keyOf)
  .filter((key, index, keys) => keys.indexOf(key) !== index);

function endpointHasCompany(id, element) {
  return id === "stage01" ||
    companyCount(id, element) > 0 ||
    (categoryMap.get(id)?.forceEls ?? []).includes(element);
}
const emptyEndpointEdges = candidateEdges.filter(
  (edge) =>
    !endpointHasCompany(edge.from, edge.element) ||
    !endpointHasCompany(edge.to, edge.element),
);
const validEdgeMap = new Map();
for (const edge of candidateEdges) {
  if (
    endpointHasCompany(edge.from, edge.element) &&
    endpointHasCompany(edge.to, edge.element)
  ) {
    validEdgeMap.set(keyOf(edge), edge);
  }
}
const validEdges = [...validEdgeMap.values()];

const activeCounts = Object.fromEntries(
  categories.map((category) => [
    category.id,
    Object.fromEntries(
      elements
        .map((element) => [element, companyCount(category.id, element)])
        .filter(([, count]) => count > 0),
    ),
  ]),
);

const report = {
  companies: seed.length,
  categories: categories.length,
  duplicateCategoryIds: [...new Set(duplicateCategoryIds)],
  duplicateCompanyNames: [...new Set(duplicateCompanyNames)],
  japanAvionicsTags: seed.find((company) => company.name === "日本アビオニクス")?.tags ?? [],
  defenseElectronicsDeclaredElements: declaredElements("05_defense_electronics"),
  defenseElectronicsDyTbCompanies: seed
    .filter((company) => company.subs?.includes("05_defense_electronics") && company.tags?.includes("DyTb"))
    .map((company) => company.name),
  robotDeclaredElements: declaredElements("05_robot"),
  robotCompanies: seed
    .filter((company) => company.subs?.includes("05_robot"))
    .map((company) => company.name),
  robotCompaniesMissingSm: seed
    .filter((company) => company.subs?.includes("05_robot") && !company.tags?.includes("Sm"))
    .map((company) => company.name),
  solidStateLaserStage04Companies: seed
    .filter((company) => company.subs?.includes("04_opt"))
    .map((company) => company.name),
  candidateEdges: candidateEdges.length,
  duplicateEdgeKeys: [...new Set(duplicateEdgeKeys)],
  emptyEndpointEdges,
  validUniqueEdges: validEdges.length,
  removedEdges: candidateEdges.length - validEdges.length,
  postFilterDuplicateEdgeKeys: [],
  postFilterEmptyEndpointEdges: validEdges.filter(
    (edge) =>
      !endpointHasCompany(edge.from, edge.element) ||
      !endpointHasCompany(edge.to, edge.element),
  ),
  activeCounts,
  sofcSoecYEdgePresent: validEdges.some(
    (edge) => edge.from === "04_elec" && edge.to === "05_energy" && edge.element === "Y",
  ),
  robotSmEdgePresent: validEdges.some(
    (edge) => edge.from === "04_mag" && edge.to === "05_robot" && edge.element === "Sm",
  ),
};

if (
  report.companies !== 123 ||
  report.duplicateCategoryIds.length ||
  report.duplicateCompanyNames.length ||
  report.japanAvionicsTags.includes("DyTb") ||
  report.defenseElectronicsDeclaredElements.includes("DyTb") ||
  report.defenseElectronicsDyTbCompanies.length ||
  !report.robotDeclaredElements.includes("Sm") ||
  report.robotCompanies.length !== 8 ||
  report.robotCompaniesMissingSm.length ||
  report.solidStateLaserStage04Companies.length !== 7 ||
  report.solidStateLaserStage04Companies.includes("神島化学工業") ||
  report.solidStateLaserStage04Companies.includes("信光社") ||
  !report.sofcSoecYEdgePresent ||
  !report.robotSmEdgePresent ||
  report.postFilterDuplicateEdgeKeys.length ||
  report.postFilterEmptyEndpointEdges.length
) {
  throw new Error(JSON.stringify(report, null, 2));
}

console.log(JSON.stringify(report, null, 2));
