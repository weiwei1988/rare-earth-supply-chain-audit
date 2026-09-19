// 人力判定シートのローカルスナップショットを読み込む。元シートはリポジトリ外に保持する。
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const normalizeName = (value) => String(value ?? '').normalize('NFKC')
  .replace(/株式会社|有限会社|合同会社|[\s・･]/g, '').toLowerCase();
export const sheetTags = (value) => {
  const tokens = String(value ?? '').split(/[,、\s]+/).filter(Boolean);
  if (tokens.length === 1 && tokens[0] === '対象外') return [];
  if (tokens.some(t => !['Y', 'Dy', 'Tb', 'Sm', 'Sc'].includes(t))) throw new Error(`未知の希土類指定: ${value}`);
  return ['Y', 'DyTb', 'Sm', 'Sc'].filter(t => t === 'DyTb' ? tokens.includes('Dy') || tokens.includes('Tb') : tokens.includes(t));
};
const uniq = xs => [...new Set(xs)];
const namesForRow = row => uniq([row[1], ...String(row[3] ?? '').split(' ／ ')].filter(Boolean));
const parts = (value, marker) => String(value ?? '').split(/ ／ (?=(?:05_[a-z_]+|X\d+) )/).map(text => {
  const start = text.indexOf(marker);
  return { text, id: text.match(/^05_[a-z_]+/)?.[0], products: start < 0 ? [] : text.slice(start + marker.length).replace(/）$/, '').split('；').filter(Boolean) };
});

// 統合契約時系列の契約件名を一次抽出し、新設カテゴリー候補へ振り分けた品目。
// 対UAV専用装備は「無人装備・ドローン」から外し、実際の無人機・UGV・USVとその管制品を収録する。
export const SUPPLEMENTAL_STAGE5 = {
  '2011101014084': [{ id: '05_military_radar', products: ['捜索用レーダ整備用器材', 'UAV捜索レーダ(検証用)', '捜索用レーダ HPS-106', '捜索用レーダ HPS-106B', '捜索用レーダ(HPS-106B・P-1用)', '捜索用レーダ(HPS-106B・P-1用)(初度費)', 'レーダ波監視装置 GFRQ-26-B', '多目的監視レーダ(試験用)(その1)', '計測用レーダ', '多目的監視レーダ(試験用)(その2)', 'P-1捜索用レーダ専用試験装置', '警戒管制レーダー用味方識別装置J/UPX-111()', '多目的監視レーダ試験用資材', '捜索用レーダ(HPS-106B・P-1(BL2)用)(初度費)', '捜索用レーダ(HPS-106B・P-1(BL2)用)', '固定式警戒管制レーダー装置J/FPS-4()', '固定式警戒管制レーダー装置J/FPS-4()(初度費)', '捜索用レーダ HPS-106B・電子作戦機(試作機)用', '捜索用レーダHPS-106B'] }],
  '8010001057337': [{ id: '05_military_radar', products: ['電子管(捜索レーダ送受信機用)', '電子管 捜索レーダ送受信機用'] }],
  '7010701017021': [{ id: '05_military_radar', products: ['局地気象レーダ装置 GFMQ-1-B'] }],
  '8010001032091': [{ id: '05_military_radar', products: ['電子管 捜索レーダ送受信機モジュール'] }],
  '7013301019486': [{ id: '05_military_radar', products: ['3次元ミリ波レーダー'] }],
  '8011001039795': [{ id: '05_military_radar', products: ['弾道レーダ(洋上試験対応)', '初速レーダ', '弾道追随レーダ装置'] }],
  '2010001098064': [{ id: '05_military_radar', products: ['レーダ試験器ラインテスタYPM-25'] }],
  '9010801024873': [{ id: '05_military_radar', products: ['海上監視レーダ装置 JTPS-P4'] }],
  '8120001062020': [{ id: '05_military_radar', products: ['ターミナルレーダ用防雷装置 GPD-4-B'] }],
  '4010401057023': [{ id: '05_military_radar', products: ['捜索レーダ OM-100D', '捜索レーダ(OM-100D・US-2用)', '捜索レーダ(OM-100D)'] }],
  '8020001003257': [{ id: '05_military_radar', products: ['UAV模擬標的機(多目的監視レーダ試験用)'] }, { id: '05_unmanned', products: ['小型UAV(固定翼型)', 'UAV模擬標的機(多目的監視レーダ試験用)'] }],
  '3010801002612': [{ id: '05_military_radar', products: ['光レーダ'] }],
  '4310001003520': [{ id: '05_military_radar', products: ['光学式監視装置(レーザーレーダ)改2'] }],
  '1010001058548': [{ id: '05_military_radar', products: ['電子管 捜索レーダ送受信機モジュール用'] }],
  '4010001052390': [{ id: '05_unmanned', products: ['レーザ計測ドローン', '3次元情報収集ドローン'] }],
  '3010001033004': [{ id: '05_unmanned', products: ['機雷対処用水中無人機RXX-2', '小型UGV(歩行型)用無線機(STREAMCASTER)'] }],
  '1010401098920': [{ id: '05_unmanned', products: ['爆発物対処用UGV(改)'] }],
  '5011101016202': [{ id: '05_unmanned', products: ['小型攻撃用UAVIII型(固定翼型)概念実証業務委託', '攻撃用UAV概念実証業務委託(その1)'] }],
  '1120003008110': [{ id: '05_unmanned', products: ['3次元情報収集ドローン解析装置', '3次元情報収集ドローン', 'レーザ計測ドローン'] }],
  '7010001225687': [{ id: '05_unmanned', products: ['UAV(実動対抗部隊用)GDXS-15'] }],
  '4130001044153': [{ id: '05_unmanned', products: ['小型多用途USVII型概念実証業務委託'] }],
  '2010001022478': [{ id: '05_unmanned', products: ['ドローン(1)'] }],
  '7010701022780': [{ id: '05_unmanned', products: ['撮影計測用UAV', '小型無人機対処器材用ドローン', 'UAV(災害用II型)GDXS-13-B', 'UAV(災害用II型) GDXS-13-B', '小型無人機(ドローン)'] }],
};

// 契約件名にカテゴリー語が含まれても、装置本体・直接モジュールではない品目を除外する。
// 会社単位ではなく「法人番号 × サブカテゴリー × 品目」で管理し、他カテゴリーの適合品は残す。
export const STAGE5_CONTEXT_EXCLUSIONS = {
  '2010001098064': {
    '05_guid': ['航法通信整備実習装置'],
    '05_military_radar': ['レーダ試験器ラインテスタYPM-25'],
  },
  '2011101014084': {
    '05_guid': ['91式携帯地対空誘導弾(B)訓練器材'],
    '05_rf_sensor': ['捜索用レーダ整備用器材'],
    '05_military_radar': ['捜索用レーダ整備用器材', 'レーダ波監視装置 GFRQ-26-B', 'P-1捜索用レーダ専用試験装置', '多目的監視レーダ試験用資材'],
  },
  '1020001081053': {
    '05_guid': ['F-15慣性航法装置用補給処整備器材J/USM-1003(初度費)', 'F-15慣性航法装置用補給処整備器材J/USM-1003'],
  },
  '5011101016202': {
    '05_guid': ['多重電磁波偽装網セット(誘導武器器材用)'],
    '05_defense_electronics': ['多重電磁波偽装網セット(通信電子器材用)'],
  },
  '8010001057337': {
    '05_guid': ['ミサイル評価装置構成品', 'ミサイル警報装置用ラインテスター'],
  },
  '4130001044153': {
    '05_guid': ['地対艦誘導弾用洋上標的装置'],
  },
  '1020001006613': {
    '05_guid': ['誘導弾射爆撃訓練用水上標的', '誘導弾射爆撃訓練用水上標的(GNSS付加)(モニタリング・テスト用)(初度費)'],
  },
  '5010001070887': {
    '05_guid': ['統合火力誘導シミュレータ(簡易型) GSM-23'],
  },
  '2010001010788': {
    '05_guid': ['誘導武器部品自動倉庫中央制御処理装置借上(05延長)', '誘導武器部品自動倉庫中央制御処理装置借上(06換装)'],
    '05_defense_electronics': ['ネットワーク解析装置', '通信保管分類倉庫用中央制御処理装置借上(05延長)'],
  },
  '4010601031653': {
    '05_sat': ['92式地雷原処理用ロケット弾'],
  },
  '4010001052390': {
    '05_laser': ['レーザ計測ドローン'],
  },
  '8011001039795': {
    '05_laser': ['可視化用レーザー照明', 'レーザーカーテン速度計システム'],
  },
  '7010001225687': {
    '05_laser': ['夜間照準補助具(可視レーザー(緑))'],
  },
  '3013301035504': {
    '05_laser': ['夜間照準補助具(可視レーザー(赤))'],
  },
  '9011601013273': {
    '05_laser': ['レーザーサイト', '夜間照準補助具(可視レーザー(緑))'],
  },
  '3122001014600': {
    '05_laser': ['レーザーサイト'],
  },
  '4310001003520': {
    '05_laser': ['光学式監視装置(レーザーレーダ)改2'],
    '05_rf_sensor': ['光学式監視装置(レーザーレーダ)改2'],
    '05_military_radar': ['光学式監視装置(レーザーレーダ)改2'],
  },
  '1120003008110': {
    '05_laser': ['レーザ計測ドローン'],
  },
  '3010001029349': {
    '05_laser': ['可視化用レーザー照明'],
  },
  '4070001022669': {
    '05_laser': ['ヤグレーザー光凝固装置', 'マルチカラーレーザ光凝固装置'],
  },
  '5010001007914': {
    '05_laser': ['レーザーメス装置'],
  },
  '8020001003257': {
    '05_rf_sensor': ['UAV模擬標的機(多目的監視レーダ試験用)'],
    '05_military_radar': ['UAV模擬標的機(多目的監視レーダ試験用)'],
  },
  '3010801002612': {
    '05_rf_sensor': ['光レーダ'],
    '05_military_radar': ['光レーダ'],
  },
  '8120001062020': {
    '05_rf_sensor': ['ターミナルレーダ用防雷装置 GPD-4-B'],
    '05_military_radar': ['ターミナルレーダ用防雷装置 GPD-4-B'],
  },
  '4010401057023': {
    '05_rf_sensor': ['中赤外線監視装置'],
  },
  '3010001020497': {
    '05_rf_sensor': ['高周波ヘッドトルソシミュレータシステム'],
  },
  '5010401123798': {
    '05_rf_sensor': ['基準電圧電流発生器 GTS-326'],
  },
  '7010401188476': {
    '05_rf_sensor': ['基準電圧電流発生器 GTS-326'],
  },
  '9010501010505': {
    '05_defense_electronics': ['無線機用試験器 N-TS-503D', 'ネットワークアナライザ'],
  },
  '6020001145951': {
    '05_defense_electronics': ['無線機テストセット', '総合無線試験器 JTS-309-D'],
  },
  '3010403011350': {
    '05_defense_electronics': ['ネットワークアナライザ', 'マイクロ波ネットワークアナライザ'],
  },
};

function applyContextReview(corporateNumber, categories, report, companyName) {
  const rules = STAGE5_CONTEXT_EXCLUSIONS[String(corporateNumber)] ?? {};
  return categories.map(category => {
    const excluded = new Set((rules[category.id] ?? []).map(product => product.normalize('NFKC').trim()));
    const products = category.products.filter(product => {
      const omit = excluded.has(product.normalize('NFKC').trim());
      if (omit) report.contextExcludedProducts.push({ company: companyName, corporateNumber: String(corporateNumber), category: category.id, product });
      return !omit;
    });
    return { ...category, products };
  }).filter(category => category.products.length);
}

function cleanCategoryResidue(company) {
  if (company.chn) company.chn = company.chn
    .replace(/所属するStage 05サブカテゴリーの希土類フラグを継承。\s*/g, '')
    .replace(/防衛半導体・電子回路・通信についてDy\/Tbの企業固有BOMを公開確認できず、フラグを削除。/g, 'Dy/Tbの企業固有BOMを公開確認できず、フラグを削除。')
    .replace(/\s*／\s*／\s*/g, ' ／ ').trim();
  if (company.note) company.note = company.note.split(' ／ ').filter(segment =>
    !/正式採用ルール|採用元:.*05_|Stage 05所属サブカテゴリー|Stage 05『|^05_[a-z_]+/.test(segment)
  ).join(' ／ ');
  if (company.name === '東芝（株式会社東芝）') company.note = 'SmCo磁石材料は東芝マテリアルへ整理。';
  if (company.name === '日本アビオニクス') company.note = '企業固有BOM未確認のためDy/Tbフラグを削除。';
  return company;
}

export function integrate(source, original, subcategories) {
  if (source.headers[26] !== '工程5判定（調達品目基準）' || source.headers[27] !== 'ユーザー判定' ||
      source.headers[28] !== '工程5サブカテゴリー（該当品目）' || source.headers[30] !== '希土類フラグ（調達品目基準：Y, Dy, Tb, Sm, Sc）' || source.headers[31] !== '希土類利用可能性') throw new Error('列定義が変わっています');
  const companies = structuredClone(original);
  const report = { sourceRows: source.rows.length, selected: 0, added: [], updated: [], badgeOnly: [], excludedCompanies: [], excludedProducts: [], contextExcludedProducts: [], contextExcludedCompanies: [], supplementalCategories: [], specialCases: [] };
  const excludedIds = new Set();
  const byName = new Map();
  for (const c of companies) for (const name of [c.name, c.name.split(/[（(／]/)[0]]) {
    const key = normalizeName(name);
    if (key.length > 2) {
      if (byName.has(key) && byName.get(key) !== c) throw new Error(`曖昧な既存企業: ${name}`);
      byName.set(key, c);
    }
  }
  const seen = new Set();
  for (const row of source.rows) {
    const key = String(row[20]);
    if (seen.has(key)) throw new Error(`シート内の名寄せキー重複: ${key}`);
    seen.add(key);
    if (!['対象', '対象外'].includes(row[26])) throw new Error(`判定未確定: No.${row[0]}`);
    const names = namesForRow(row);
    const matches = uniq(names.map(n => byName.get(normalizeName(n))).filter(Boolean));
    if (matches.length > 1) throw new Error(`複数の既存カードに一致: No.${row[0]}`);
    let company = matches[0];
    // 希土類判定は工程5判定より優先し、一致する既存カードも全工程から除外する。
    const reasons = [30, 31].filter(i => String(row[i] ?? '').trim() === '対象外').map(i => source.headers[i]);
    if (!reasons.length && row[26] === '対象' && !sheetTags(row[30]).length) reasons.push('希土類フラグなし');
    const preserveExistingRareEarth = company?.id === 'seed-4';
    if (reasons.length && !preserveExistingRareEarth) {
      if (company) excludedIds.add(company.id);
      if (row[26] === '対象' || company) report.excludedCompanies.push({ id: company?.id ?? `atla-${String(row[2] || row[0])}`, name: company?.name ?? row[1], row: Number(row[0]) + 1, decision: row[26], reasons });
      continue;
    }
    if (row[26] !== '対象' && !company) continue;
    const selected = row[26] === '対象';
    const rowNumber = Number(row[0]) + 1;
    // 公開用データには元SpreadsheetのID・行番号・自由記述を残さない。
    // 行番号はこの関数が返すローカル取込レポート内だけで利用する。
    const provenance = {
      corporateNumber: String(row[2] ?? ''),
      decision: row[26],
      years: row[4],
      readAt: source.readAt,
    };
    if (!selected) {
      company.atlaProcurement = true;
      company.atla = provenance;
      report.badgeOnly.push({ id: company.id, name: company.name, row: rowNumber });
      continue;
    }
    report.selected++;
    const excluded = new Set(parts(row[29], '（品目：').flatMap(p => p.products).map(p => p.normalize('NFKC').trim()));
    let categories = parts(row[28], '（該当品目：').map(part => {
      const products = part.products.filter(p => {
        const omit = excluded.has(p.normalize('NFKC').trim());
        if (omit) report.excludedProducts.push({ row: rowNumber, product: p });
        return !omit;
      });
      return { id: part.id, products };
    });
    const supplemental = (SUPPLEMENTAL_STAGE5[String(row[2])] ?? []).map(category => ({
      ...category,
      products: category.products.filter(product => {
        const omit = excluded.has(product.normalize('NFKC').trim());
        if (omit && !report.excludedProducts.some(item => item.row === rowNumber && item.product === product)) report.excludedProducts.push({ row: rowNumber, product });
        return !omit;
      }),
      sourceSheet: '統合契約時系列',
    })).filter(category => category.products.length);
    categories.push(...supplemental);
    if (supplemental.length) report.supplementalCategories.push({ row: rowNumber, corporateNumber: String(row[2]), categories: supplemental });
    // ユーザーが品目「蓄電池」を明示し、既存SOFC分類への暫定収容を指定した行。
    if (row[2] === '4130001041539' && String(row[28]).includes('SOFCではないが') && row[27] === '蓄電池') {
      categories = [{ id: '05_energy', products: ['蓄電池'] }];
      report.specialCases.push({ row: rowNumber, reason: row[28] });
    }
    categories = categories.filter(p => p.products.length);
    if (categories.some(p => !subcategories.some(s => s.id === p.id && s.stage === 5))) throw new Error(`品目・分類を解決できません: No.${row[0]}`);
    categories = applyContextReview(row[2], categories, report, company?.name ?? row[1]);
    if (!categories.length) {
      report.contextExcludedCompanies.push({ id: company?.id ?? `atla-${String(row[2] || row[0])}`, name: company?.name ?? row[1], row: rowNumber });
      continue;
    }
    let name = row[1];
    if (!normalizeName(name)) name = names.find(n => normalizeName(n).length > 2);
    if (!name) throw new Error(`社名が不明: No.${row[0]}`);
    const created = !company;
    if (!company) {
      company = { id: `atla-${String(row[2] || row[0])}`, name, stages: [5], subs: [], tags: [], own: '所有・上場区分は未確認', pos: '', chn: '原料調達国・中国依存は未確認', ev: 'B', exc: 0 };
      companies.push(company);
    }
    const productItems = uniq(categories.flatMap(p => p.products));
    Object.assign(company, {
      subs: uniq([...company.subs, ...categories.map(p => p.id)]), stages: uniq([...company.stages, 5]),
      tags: sheetTags(row[30]), atlaProcurement: true,
      atla: { ...provenance, categories, rareEarthFlags: row[30], rareEarthPossibility: row[31] },
      rev: [row[21], row[23], row[24]].filter(Boolean).join(' ／ '),
      prod: productItems.join(' ／ '),
      def: `防衛装備庁納入品（${row[4]}）：${productItems.join('；')}`,
      chn: String(company.chn || '原料調達国・中国依存は未確認').replace('所属するStage 05サブカテゴリーの希土類フラグを継承。', '希土類フラグは人力更新シートの調達品目基準に従う。'),
      bom: row[32] || '型式固有のBOMは未確認',
      gap: '希土類フラグは調達品目を基準としたシート判定。型式固有の含有量・原料調達国・市場シェアは未確認。',
      src: [company.src, row[25], row[33]].filter(Boolean).join(' ／ '),
      note: [String(company.note || '').split(' ／ ').filter(s => !/^売上根拠：|^希土類フラグはStage/.test(s)).join(' ／ '), '人力確認済み工程5判定：対象。', `希土類判定：${row[30]}。${row[31] || ''}`, report.specialCases.some(s => s.row === rowNumber) ? '蓄電池をユーザー指定でSOFC／SOEC分類へ暫定収容。SOFC製品ではない。' : ''].filter(Boolean).join(' ／ '),
    });
    for (const n of names) if (normalizeName(n)) byName.set(normalizeName(n), company);
    report[created ? 'added' : 'updated'].push({ id: company.id, name: company.name, row: rowNumber });
  }
  if (new Set(companies.map(c => normalizeName(c.name))).size !== companies.length) throw new Error('統合後の企業名重複');
  const included = companies.filter(c => !excludedIds.has(c.id)).map(cleanCategoryResidue);
  report.total = included.length;
  return { companies: included, report };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [sourcePath, reportPath, baseCompaniesPath] = process.argv.slice(2);
  if (!sourcePath || !reportPath) throw new Error('usage: node scripts/import-atla.mjs <private-source.json> <private-report.json>');
  const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
  const companiesUrl = new URL('../src/data/companies.json', import.meta.url);
  const original = JSON.parse(await fs.readFile(baseCompaniesPath || companiesUrl, 'utf8'));
  if (!baseCompaniesPath && original.some(c => c.atla)) throw new Error('取込済みです。二重実行せず差分を確認してください。');
  const subs = JSON.parse(await fs.readFile(new URL('../src/data/subcategories.json', import.meta.url), 'utf8'));
  const result = integrate(source, original, subs);
  await fs.writeFile(companiesUrl, JSON.stringify(result.companies, null, 2) + '\n');
  await fs.writeFile(reportPath, JSON.stringify(result.report, null, 2) + '\n');
  console.log(JSON.stringify({ selected: result.report.selected, added: result.report.added.length, updated: result.report.updated.length, badgeOnly: result.report.badgeOnly.length, total: result.report.total, excludedProducts: result.report.excludedProducts.length, contextExcludedProducts: result.report.contextExcludedProducts.length, contextExcludedCompanies: result.report.contextExcludedCompanies.length }));
}
