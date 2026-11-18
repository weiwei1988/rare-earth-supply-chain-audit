// 日本語の正規データから、多言語オーバーレイと同じ形の ja.json を同期する。
// 英語・簡体中文との差分確認用であり、事実データの正本は従来どおり companies.json / subcategories.json。
import fs from "node:fs/promises";
import { canonicalGraphLocale } from "./lib/graph-locales.mjs";

const dataDir = new URL("../src/data/", import.meta.url);
const localeDir = new URL("../src/data/locales/", import.meta.url);
const COMPANY_TEXT_FIELDS = ["name", "own", "rev", "prod", "pos", "def", "chn", "bom", "gap", "src", "note"];

const [companies, subcategories, dependency, stages] = await Promise.all([
  fs.readFile(new URL("companies.json", dataDir), "utf8").then(JSON.parse),
  fs.readFile(new URL("subcategories.json", dataDir), "utf8").then(JSON.parse),
  fs.readFile(new URL("dependency.json", dataDir), "utf8").then(JSON.parse),
  fs.readFile(new URL("stages.json", dataDir), "utf8").then(JSON.parse),
]);

const overlay = {
  locale: "ja",
  companies: Object.fromEntries(companies.map((company) => [
    company.id,
    Object.fromEntries(COMPANY_TEXT_FIELDS
      .filter((field) => typeof company[field] === "string" && company[field].trim())
      .map((field) => [field, company[field]])),
  ])),
  ...canonicalGraphLocale(stages, subcategories),
  dependency: Object.fromEntries(dependency.map((row) => [row.id, {
    quality: row.quality,
    metric: row.metric,
    evidence: row.evidence,
    source: row.source,
    segments: row.segments.map((segment) => segment.name),
  }])),
};

await fs.mkdir(localeDir, { recursive: true });
await fs.writeFile(new URL("ja.json", localeDir), `${JSON.stringify(overlay, null, 2)}\n`);
console.log(JSON.stringify({
  locale: overlay.locale,
  companies: Object.keys(overlay.companies).length,
  stages: Object.keys(overlay.stages).length,
  subcategories: Object.keys(overlay.subcategories).length,
  dependency: Object.keys(overlay.dependency).length,
}));
