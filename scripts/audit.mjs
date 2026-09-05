// グラフ接続監査。工程間の接続は src/data/subcategories.json の src だけを根拠にする
// （画面側の描画も同じ src を読むので、監査と表示がずれない）。
import { loadDataset, fatal, ELEMENTS } from "./lib/dataset.mjs";

const dataset = await loadDataset().catch(fatal);

// 画面側 activeEls と同じ規則：企業が1社もいない元素は線を引かない（forceEls は例外）。
function activeElements(sub) {
  return sub.els.filter((element) => (sub.forceEls ?? []).includes(element) || dataset.elementCount(sub.id, element) > 0);
}

const active = new Map(dataset.subcategories.map((sub) => [sub.id, activeElements(sub)]));

const edges = [];
const emptyEndpointEdges = [];
const edgeKeys = new Set();
const duplicateEdgeKeys = [];

// Stage 01（中国原料）は全元素の起点として Stage 02 の各ノードへ接続する。
for (const sub of dataset.stageSubs(2)) {
  for (const element of sub.els) {
    const record = { from: "stage01", to: sub.id, element };
    if (!active.get(sub.id).includes(element)) emptyEndpointEdges.push(record);
    else edges.push(record);
  }
}

for (const sub of dataset.subcategories.filter((item) => item.stage > 2)) {
  for (const source of sub.src) {
    const shared = ELEMENTS.filter((element) => dataset.bySub.get(source).els.includes(element) && sub.els.includes(element));
    for (const element of shared) {
      const record = { from: source, to: sub.id, element };
      const key = `${source}|${sub.id}|${element}`;
      if (!active.get(source).includes(element) || !active.get(sub.id).includes(element)) {
        emptyEndpointEdges.push(record);
        continue;
      }
      if (edgeKeys.has(key)) duplicateEdgeKeys.push(key);
      edgeKeys.add(key);
      edges.push(record);
    }
  }
}

// 到達性：Stage 05 の各ノードが Stage 02 まで遡れるか（元素ごと）。
const incoming = new Map(dataset.subcategories.map((sub) => [sub.id, sub.src ?? []]));
function reachesOrigin(id, element, seen = new Set()) {
  const sub = dataset.bySub.get(id);
  if (!active.get(id).includes(element)) return false;
  if (sub.stage === 2) return true;
  if (seen.has(id)) return false;
  seen.add(id);
  return incoming.get(id).some((source) => reachesOrigin(source, element, seen));
}

const unreachable = dataset.subcategories
  .filter((sub) => sub.stage === 5)
  .flatMap((sub) => active.get(sub.id).filter((element) => !reachesOrigin(sub.id, element)).map((element) => `${sub.id}:${element}`));

// Stage 05 の各サブカテゴリーに何社ぶら下がっているか（元素別）。
const stage05Coverage = Object.fromEntries(
  dataset.stageSubs(5).map((sub) => [
    sub.id,
    Object.fromEntries(ELEMENTS.map((element) => [element, dataset.elementCount(sub.id, element)]).filter(([, count]) => count > 0)),
  ]),
);

const orphanCompanies = dataset.companies.filter((company) => company.subs.every((id) => dataset.bySub.get(id).stage <= 2)).map((company) => company.name);

const report = {
  companies: dataset.companies.length,
  categories: dataset.subcategories.length,
  edges: edges.length,
  duplicateEdgeKeys,
  emptyEndpointEdges,
  unreachableStage05: unreachable,
  stage05Coverage,
  stage02OnlyCompanies: orphanCompanies,
};

console.log(JSON.stringify(report, null, 2));

const failures = [];
if (duplicateEdgeKeys.length) failures.push(`接続線が重複しています: ${duplicateEdgeKeys.join(", ")}`);
if (unreachable.length) failures.push(`Stage 05 から Stage 02 まで遡れない元素があります: ${unreachable.join(", ")}`);
if (failures.length) {
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
