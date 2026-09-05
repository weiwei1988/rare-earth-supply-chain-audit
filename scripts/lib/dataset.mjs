// src/data/*.json を読み込み、表示用画面とQAが共有する正規化済みデータセットを返す。
// ここを通らないデータ参照を作らないこと（index.html と JSX の同期はこの1点に依存する）。
import fs from "node:fs/promises";

export const ELEMENTS = ["Y", "DyTb", "Sm", "Sc"];
// 画面側の ev() と同じ正規化。生の評価表記（A- / B+ / C / 参考 など）を A / B / X に畳む。
export const EVALUATION_PATTERN = /^(?:[ABCX][+-]?|参考)$/;
export function normalizeEv(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (text.startsWith("A")) return "A";
  if (text.startsWith("B") || text.startsWith("C")) return "B";
  if (text.startsWith("X") || String(value ?? "").includes("参考")) return "X";
  return "B";
}
export const COLOR_TOKENS = ["A", "Y", "DyTb", "Sm", "Sc", "line"];

const dataDir = new URL("../../src/data/", import.meta.url);

async function readJson(name) {
  return JSON.parse(await fs.readFile(new URL(`${name}.json`, dataDir), "utf8"));
}

export class ValidationError extends Error {}

// 検証エラーはスタックトレースではなく1行のメッセージで落とす。
export function fatal(error) {
  if (error instanceof ValidationError) console.error(`データ検証エラー: ${error.message}`);
  else console.error(error);
  process.exit(1);
}

function assertUnique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new ValidationError(`${label}が重複しています: ${[...new Set(duplicates)].join(", ")}`);
}

function assertSubset(values, allowed, label) {
  const invalid = values.filter((value) => !allowed.includes(value));
  if (invalid.length) throw new ValidationError(`${label}に未知の値があります: ${[...new Set(invalid)].join(", ")}`);
}

export async function loadDataset() {
  const [stages, subcategories, companies, dependency] = await Promise.all([
    readJson("stages"),
    readJson("subcategories"),
    readJson("companies"),
    readJson("dependency"),
  ]);

  const stageIds = stages.map((stage) => stage.id);
  assertUnique(stageIds, "工程ID");
  for (const stage of stages) {
    for (const key of ["id", "code", "label", "short"]) {
      if (stage[key] === undefined) throw new ValidationError(`工程 ${stage.id} に ${key} がありません。`);
    }
    if (stage.code !== String(stage.id).padStart(2, "0")) {
      throw new ValidationError(`工程 ${stage.id} の code が id と一致しません: ${stage.code}`);
    }
  }

  const subIds = subcategories.map((sub) => sub.id);
  assertUnique(subIds, "サブカテゴリーID");
  for (const sub of subcategories) {
    if (!stageIds.includes(sub.stage)) throw new ValidationError(`${sub.id} の工程 ${sub.stage} は未定義です。`);
    if (!sub.id.startsWith(`0${sub.stage}_`)) throw new ValidationError(`${sub.id} のID接頭辞が工程 ${sub.stage} と一致しません。`);
    if (!sub.header.startsWith(`0${sub.stage} `)) throw new ValidationError(`${sub.id} の header が工程 ${sub.stage} と一致しません: ${sub.header}`);
    assertSubset(sub.els, ELEMENTS, `${sub.id} の els`);
    if (!sub.els.length) throw new ValidationError(`${sub.id} に元素が設定されていません。`);
    assertSubset(sub.forceEls ?? [], sub.els, `${sub.id} の forceEls`);
    assertSubset(sub.src ?? [], subIds, `${sub.id} の src`);
    // Stage 02 は Stage 01（中国原料）から一括で受けるため src を持たない。
    if (sub.stage === 2 && sub.src) throw new ValidationError(`${sub.id} は Stage 02 なので src を持てません。`);
    if (sub.stage > 2 && !sub.src?.length) throw new ValidationError(`${sub.id} に上流サブカテゴリー（src）がありません。`);
    assertUnique(sub.src ?? [], `${sub.id} の src`);
    for (const source of sub.src ?? []) {
      const upstream = subcategories.find((item) => item.id === source);
      if (upstream.stage !== sub.stage - 1) {
        throw new ValidationError(`${sub.id} の src ${source} は工程 ${upstream.stage} です（1つ上流の工程 ${sub.stage - 1} である必要があります）。`);
      }
    }
  }

  const companyIds = companies.map((company) => company.id);
  const companyNames = companies.map((company) => company.name);
  assertUnique(companyIds, "企業ID");
  assertUnique(companyNames, "企業名");
  for (const company of companies) {
    if (!company.id || !company.name) throw new ValidationError(`企業行に id または name がありません: ${JSON.stringify(company).slice(0, 80)}`);
    if (!company.subs?.length) throw new ValidationError(`${company.name} にサブカテゴリーがありません。`);
    assertSubset(company.subs, subIds, `${company.name} の subs`);
    assertSubset(company.stages, stageIds, `${company.name} の stages`);
    assertSubset(company.tags, ELEMENTS, `${company.name} の tags`);
    if (!EVALUATION_PATTERN.test(String(company.ev ?? "").trim())) throw new ValidationError(`${company.name} の評価表記 ${company.ev} を解釈できません（A/B/C/X に ± を付けた表記か「参考」）。`);
    const impliedStages = [...new Set(company.subs.map((id) => subcategories.find((sub) => sub.id === id).stage))];
    const missing = impliedStages.filter((stage) => !company.stages.includes(stage));
    if (missing.length) throw new ValidationError(`${company.name} の stages に ${missing.join(",")} が不足しています（subs から導出）。`);
  }

  const dependencyTags = dependency.map((row) => row.tag);
  assertSubset(dependencyTags, ELEMENTS, "中国依存行の tag");
  assertUnique(dependency.map((row) => row.id), "中国依存行のID");
  for (const row of dependency) {
    assertSubset(row.segments.map((segment) => segment.color), COLOR_TOKENS, `${row.id} の色トークン`);
    const total = row.segments.reduce((sum, segment) => sum + segment.value, 0);
    if (total !== 100) throw new ValidationError(`${row.id} の構成比合計が ${total}% です（100%であること）。`);
    const china = row.segments.find((segment) => segment.name === "中国")?.value;
    if (china !== row.china) throw new ValidationError(`${row.id} の china=${row.china} と中国セグメント ${china} が一致しません。`);
  }

  const bySub = new Map(subcategories.map((sub) => [sub.id, sub]));
  return {
    stages,
    subcategories,
    companies,
    dependency,
    bySub,
    stageSubs: (stage) => subcategories.filter((sub) => sub.stage === stage),
    companiesInSub: (id) => companies.filter((company) => company.subs.includes(id)),
    ev: (company) => normalizeEv(company.ev),
    elementCount: (id, element) => companies.filter((company) => company.subs.includes(id) && company.tags.includes(element)).length,
  };
}
