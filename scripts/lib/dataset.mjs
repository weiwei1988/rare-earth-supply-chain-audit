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
  const [stages, subcategories, companies, dependency, columnOrder] = await Promise.all([
    readJson("stages"),
    readJson("subcategories"),
    readJson("companies"),
    readJson("dependency"),
    readJson("column-order"),
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
  const orderIds = Object.values(columnOrder).flat();
  assertUnique(orderIds, "列順のサブカテゴリーID");
  assertSubset(orderIds, subIds, "列順のサブカテゴリーID");
  if (orderIds.length !== subIds.length || subIds.some((id) => !orderIds.includes(id))) {
    throw new ValidationError("列順にすべてのサブカテゴリーを一度ずつ指定してください。");
  }
  for (const stage of stageIds.filter((id) => id >= 2)) {
    const order = columnOrder[stage];
    if (!Array.isArray(order) || !order.length) throw new ValidationError(`工程 ${stage} の列順がありません。`);
    if (order.some((id) => subcategories.find((sub) => sub.id === id)?.stage !== stage)) {
      throw new ValidationError(`工程 ${stage} の列順に別工程のサブカテゴリーがあります。`);
    }
  }
  for (const sub of subcategories) {
    for (const key of ["label", "header", "description"]) {
      if (typeof sub[key] !== "string" || !sub[key].trim()) throw new ValidationError(`${sub.id} に ${key} がありません。`);
    }
    if (!stageIds.includes(sub.stage)) throw new ValidationError(`${sub.id} の工程 ${sub.stage} は未定義です。`);
    if (!sub.id.startsWith(`0${sub.stage}_`)) throw new ValidationError(`${sub.id} のID接頭辞が工程 ${sub.stage} と一致しません。`);
    if (!sub.header.startsWith(`0${sub.stage} `)) throw new ValidationError(`${sub.id} の header が工程 ${sub.stage} と一致しません: ${sub.header}`);
    assertSubset(sub.els, ELEMENTS, `${sub.id} の els`);
    if (!sub.els.length) throw new ValidationError(`${sub.id} に元素が設定されていません。`);
    assertSubset(sub.forceEls ?? [], sub.els, `${sub.id} の forceEls`);
    assertSubset(sub.src ?? [], subIds, `${sub.id} の src`);
    // Stage 02 は Stage 01（海外の資源・分離）から一括で受けるため src を持たない。
    if (sub.stage === 2 && sub.src) throw new ValidationError(`${sub.id} は Stage 02 なので src を持てません。`);
    if (sub.stage > 2 && !sub.src?.length) throw new ValidationError(`${sub.id} に上流サブカテゴリー（src）がありません。`);
    assertUnique(sub.src ?? [], `${sub.id} の src`);
    for (const source of sub.src ?? []) {
      const upstream = subcategories.find((item) => item.id === source);
      if (upstream.stage >= sub.stage) {
        throw new ValidationError(`${sub.id} の src ${source} は上流工程ではありません。`);
      }
      if (upstream.stage < sub.stage - 1 && !sub.srcSkip?.[source]) {
        throw new ValidationError(`${sub.id} の src ${source} は工程を飛ばすため srcSkip に理由が必要です。`);
      }
    }
    // 工程3以降は、上流カテゴリーごとに接続する元素と根拠を明示する。
    // src と els の単純な積集合にすると、カテゴリーの元素追加だけで無関係な線が増えるため。
    if (sub.stage > 2) {
      if (!sub.srcEls || typeof sub.srcEls !== "object" || Array.isArray(sub.srcEls)) {
        throw new ValidationError(`${sub.id} に元素別接続（srcEls）がありません。`);
      }
      const routeSources = Object.keys(sub.srcEls);
      const missingSources = sub.src.filter((source) => !routeSources.includes(source));
      const extraSources = routeSources.filter((source) => !sub.src.includes(source));
      if (missingSources.length || extraSources.length) {
        throw new ValidationError(`${sub.id} の src と srcEls が一致しません（不足: ${missingSources.join(", ") || "なし"} / 余分: ${extraSources.join(", ") || "なし"}）。`);
      }
      for (const source of sub.src) {
        const routeElements = sub.srcEls[source];
        if (!Array.isArray(routeElements) || !routeElements.length) {
          throw new ValidationError(`${sub.id} の srcEls.${source} に元素がありません。`);
        }
        assertUnique(routeElements, `${sub.id} の srcEls.${source}`);
        assertSubset(routeElements, sub.els, `${sub.id} の srcEls.${source}`);
        assertSubset(routeElements, subcategories.find((item) => item.id === source).els, `${sub.id} の srcEls.${source}`);
      }
      const connectedElements = [...new Set(Object.values(sub.srcEls).flat())].sort();
      if (JSON.stringify(connectedElements) !== JSON.stringify([...sub.els].sort())) {
        throw new ValidationError(`${sub.id} の元素フラグと接続元素が一致しません。`);
      }
      if (!sub.srcNotes || typeof sub.srcNotes !== "object" || Array.isArray(sub.srcNotes)) {
        throw new ValidationError(`${sub.id} に接続根拠（srcNotes）がありません。`);
      }
      const noteSources = Object.keys(sub.srcNotes);
      const missingNotes = sub.src.filter((source) => !noteSources.includes(source));
      const extraNotes = noteSources.filter((source) => !sub.src.includes(source));
      if (missingNotes.length || extraNotes.length) {
        throw new ValidationError(`${sub.id} の src と srcNotes が一致しません（不足: ${missingNotes.join(", ") || "なし"} / 余分: ${extraNotes.join(", ") || "なし"}）。`);
      }
      for (const source of sub.src) {
        if (typeof sub.srcNotes[source] !== "string" || !sub.srcNotes[source].trim()) {
          throw new ValidationError(`${sub.id} の srcNotes.${source} に接続根拠がありません。`);
        }
      }
      if (sub.srcSkip !== undefined) {
        if (!sub.srcSkip || typeof sub.srcSkip !== "object" || Array.isArray(sub.srcSkip)) throw new ValidationError(`${sub.id} の srcSkip が不正です。`);
        for (const [source, reason] of Object.entries(sub.srcSkip)) {
          const upstream = subcategories.find((item) => item.id === source);
          if (!sub.src.includes(source) || !upstream || upstream.stage >= sub.stage - 1 || typeof reason !== "string" || !reason.trim()) {
            throw new ValidationError(`${sub.id} の srcSkip.${source} が不正です。`);
          }
        }
      }
    } else if (sub.srcEls !== undefined || sub.srcNotes !== undefined || sub.srcSkip !== undefined) {
      throw new ValidationError(`${sub.id} は工程2のため接続詳細を持てません。`);
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
    const privateAtlaFields = ["row", "sourceUrl", "userReason", "spreadsheetId", "sheetId"].filter((key) => company.atla?.[key] !== undefined);
    if (privateAtlaFields.length) throw new ValidationError(`${company.name} の公開データに内部シート情報があります: ${privateAtlaFields.join(", ")}`);
    if (JSON.stringify(company).includes("docs.google.com/spreadsheets/")) throw new ValidationError(`${company.name} の公開データにGoogle Spreadsheet URLがあります`);
    if (company.financial) {
      if (!['A', 'B', 'C'].includes(company.financial.confidence)) throw new ValidationError(`${company.name} の財務調査確度が不正です`);
      if (!Array.isArray(company.financial.sourceUrls) || !company.financial.sourceUrls.length) throw new ValidationError(`${company.name} の財務調査出典がありません`);
      if (company.financial.sourceUrls.some((url) => !/^https:\/\//.test(url))) throw new ValidationError(`${company.name} の財務調査出典URLが不正です`);
    }
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
    columnOrder,
    bySub,
    stageSubs: (stage) => subcategories.filter((sub) => sub.stage === stage),
    companiesInSub: (id) => companies.filter((company) => company.subs.includes(id)),
    ev: (company) => normalizeEv(company.ev),
    elementCount: (id, element) => companies.filter((company) => company.subs.includes(id) && company.tags.includes(element)).length,
  };
}
