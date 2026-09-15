// 公開情報調査の分割成果を統合し、新規ATLA企業カードの所有・上場／売上情報へ反映する。
// usage: node scripts/apply-financial-research.mjs <chunk1.json> <chunk2.json> <chunk3.json>
import fs from 'node:fs/promises';

const chunkPaths = process.argv.slice(2);
if (!chunkPaths.length) throw new Error('調査結果JSONを1件以上指定してください');

const chunks = await Promise.all(chunkPaths.map(async path => JSON.parse(await fs.readFile(path, 'utf8'))));
const research = chunks.flat();
const companiesUrl = new URL('../src/data/companies.json', import.meta.url);
const financialsUrl = new URL('../src/data/company-financials.json', import.meta.url);
const companies = JSON.parse(await fs.readFile(companiesUrl, 'utf8'));
const targets = companies.filter(company => company.atla?.decision === '対象');
const targetNames = new Set(targets.map(company => company.name));

if (research.length !== targets.length) throw new Error(`調査件数 ${research.length} が対象 ${targets.length} と一致しません`);
if (new Set(research.map(item => item.name)).size !== research.length) throw new Error('調査結果に企業名の重複があります');
const missing = targets.filter(company => !research.some(item => item.name === company.name)).map(company => company.name);
const extra = research.filter(item => !targetNames.has(item.name)).map(item => item.name);
if (missing.length || extra.length) throw new Error(`企業名が一致しません（不足: ${missing.join(', ') || 'なし'} / 余分: ${extra.join(', ') || 'なし'}）`);

for (const item of research) {
  if (!item.ownership_listing || /所有・上場区分は未確認|^日本企業$/.test(item.ownership_listing)) {
    throw new Error(`${item.name}: ownership_listing が未確認のままです`);
  }
  if (!item.revenue_display) throw new Error(`${item.name}: revenue_display がありません`);
  if (!['A', 'B', 'C'].includes(item.confidence)) throw new Error(`${item.name}: confidence が不正です`);
  if (!Array.isArray(item.source_urls) || !item.source_urls.length) throw new Error(`${item.name}: source_urls がありません`);
  for (const url of item.source_urls) {
    if (!/^https:\/\//.test(url) || /(?:token|signature|key)=/i.test(url)) throw new Error(`${item.name}: 出典URLが不正です: ${url}`);
  }
}

const byName = new Map(research.map(item => [item.name, item]));
const updated = companies.map(company => {
  const item = byName.get(company.name);
  if (!item) return company;
  const sourceParts = String(company.src || '').split(' ／ ').filter(Boolean);
  const sourceUrls = [...new Set([...sourceParts, ...item.source_urls])];
  return {
    ...company,
    own: item.ownership_listing,
    rev: item.revenue_display,
    src: sourceUrls.join(' ／ '),
    financial: {
      fiscalYear: item.fiscal_year || null,
      revenueValueJpy: Number.isFinite(item.revenue_value_jpy) ? item.revenue_value_jpy : null,
      scope: item.scope || '非公表／不明',
      confidence: item.confidence,
      evidenceNote: item.evidence_note || '',
      sourceUrls: item.source_urls,
      researchedAt: '2026-09-15'
    }
  };
});

const normalized = research.map(item => ({
  ...item,
  revenue_value_jpy: Number.isFinite(item.revenue_value_jpy) ? item.revenue_value_jpy : null,
  fiscal_year: item.fiscal_year || null,
  scope: item.scope || '非公表／不明',
  researched_at: '2026-09-15'
})).sort((a, b) => a.name.localeCompare(b.name, 'ja'));

await fs.writeFile(financialsUrl, JSON.stringify(normalized, null, 2) + '\n');
await fs.writeFile(companiesUrl, JSON.stringify(updated, null, 2) + '\n');
console.log(JSON.stringify({ researched: normalized.length, updated: research.length, output: 'src/data/company-financials.json' }));
