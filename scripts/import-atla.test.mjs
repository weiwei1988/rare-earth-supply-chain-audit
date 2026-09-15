import test from 'node:test';
import assert from 'node:assert/strict';
import { integrate, sheetTags, SUPPLEMENTAL_STAGE5, STAGE5_CONTEXT_EXCLUSIONS } from './import-atla.mjs';

const headers = [];
headers[26] = '工程5判定（調達品目基準）'; headers[27] = 'ユーザー判定';
headers[28] = '工程5サブカテゴリー（該当品目）'; headers[30] = '希土類フラグ（調達品目基準：Y, Dy, Tb, Sm, Sc）';
headers[31] = '希土類利用可能性';
const row = (no, name, decision, category, flags) => {
  const r = []; r[0] = no; r[1] = name; r[2] = String(no); r[3] = name; r[4] = 'FY2025';
  r[20] = `corp:${no}`; r[26] = decision; r[28] = category; r[30] = flags; r[31] = '中（一般論）'; return r;
};
const source = rows => ({ headers, rows, spreadsheetId: 'test', sheetId: 1, readAt: '2026-09-15' });
const subs = [{ id: '05_robot', stage: 5, label: 'ロボティクス' }, { id: '05_sat', stage: 5, label: '衛星' }, { id: '05_rf_sensor', stage: 5, label: 'RF・圧電・高温センサ' }, { id: '05_military_radar', stage: 5, label: '軍事用レーダー・モジュール' }, { id: '05_unmanned', stage: 5, label: '無人装備・ドローン' }];
test('工程5対象でも希土類対象外またはフラグなしの企業は追加しない', () => {
  const result = integrate(source([
    row(1, '株式会社検証甲', '対象外', '05_sat 衛星（該当品目：試験機）', 'Y'),
    row(2, '株式会社検証乙', '対象', '05_sat 衛星（該当品目：実証機）', '対象外'),
    row(3, '株式会社検証丙', '対象', '05_sat 衛星（該当品目：実証機）', ''),
  ]), [], subs);
  assert.equal(result.companies.length, 0);
  assert.equal(result.report.excludedCompanies.length, 2);
});
test('利用可能性だけが対象外でも除外し、既存の他工程カードも残さない', () => {
  for (const decision of ['対象', '対象外']) {
    const r = row(1, '株式会社検証甲', decision, '', 'Y'); r[31] = '対象外';
    const original = [{ id: 'old', name: '検証甲', stages: [2, 4], subs: ['04_opt'], tags: ['Y'] }];
    const result = integrate(source([r]), original, subs);
    assert.equal(result.companies.length, 0);
    assert.equal(result.report.excludedCompanies[0].id, 'old');
    assert.equal(original.length, 1);
  }
});
test('高純度化学研究所は既存のY・Scカードを維持して調達実績を付ける', () => {
  const r = row(996, '株式会社', '対象外', '', '対象外'); r[2] = '9030001068752'; r[3] = '株式会社高純度化学研究所'; r[31] = '対象外';
  const original = [{ id: 'seed-4', name: '高純度化学研究所', stages: [2, 4], subs: ['04_opt'], tags: ['Y', 'Sc'], def: '既存内容' }];
  const result = integrate(source([r]), original, subs);
  assert.equal(result.companies.length, 1);
  assert.deepEqual(result.companies[0].tags, ['Y', 'Sc']);
  assert.equal(result.companies[0].def, '既存内容');
  assert.equal(result.companies[0].atlaProcurement, true);
});
test('レーダ試験用UAVはレーダー分類から外し、実機として無人装備には残す', () => {
  const r = row(168, 'フジ・インバック株式会社', '対象', '05_robot ロボティクス（該当品目：試験機）', 'Sc'); r[2] = '8020001003257';
  const result = integrate(source([r]), [], subs);
  assert.deepEqual(new Set(result.companies[0].subs), new Set(['05_robot', '05_unmanned']));
  assert.ok(result.companies[0].def.includes('UAV模擬標的機(多目的監視レーダ試験用)'));
  assert.equal(result.report.contextExcludedProducts[0].category, '05_military_radar');
  assert.equal(Object.values(SUPPLEMENTAL_STAGE5).filter(cs => cs.some(c => c.id === '05_military_radar')).length, 14);
  assert.equal(Object.values(SUPPLEMENTAL_STAGE5).filter(cs => cs.some(c => c.id === '05_unmanned')).length, 10);
});
test('レーダ試験器は軍事用レーダーから外してRF試験器に残し、表示文から分類名を消す', () => {
  const r = row(168, '株式会社国際電気', '対象', '05_rf_sensor RF（該当品目：レーダ試験器ラインテスタYPM-25）', 'Y, Sc'); r[2] = '2010001098064';
  const result = integrate(source([r]), [], subs);
  assert.deepEqual(result.companies[0].subs, ['05_rf_sensor']);
  assert.equal(result.companies[0].def, '防衛装備庁納入品（FY2025）：レーダ試験器ラインテスタYPM-25');
  assert.equal(result.companies[0].def.includes('RF・圧電・高温センサ：'), false);
  assert.equal(result.report.contextExcludedProducts[0].category, '05_military_radar');
  assert.ok(STAGE5_CONTEXT_EXCLUSIONS['2010001098064']['05_military_radar'].includes('レーダ試験器ラインテスタYPM-25'));
});
test('法人表記を名寄せして既存IDを維持し、品目別フラグを優先する', () => {
  const r = row(1, '株式会社', '対象', '05_robot ロボティクス（該当品目：ロボット） ／ 05_sat 衛星（該当品目：試験衛星）', 'Dy');
  r[3] = '株式会社検証甲';
  const original = [{ id: 'old', name: '検証甲', stages: [5], subs: ['05_sat'], tags: ['Y'], own: '維持すべき属性', ev: 'A' }];
  const result = integrate(source([r]), original, subs);
  assert.equal(result.companies.length, 1);
  assert.equal(result.companies[0].id, 'old');
  assert.equal(result.companies[0].own, '維持すべき属性');
  assert.deepEqual(result.companies[0].tags, ['DyTb']);
  assert.deepEqual(new Set(result.companies[0].subs), new Set(['05_sat', '05_robot']));
  assert.deepEqual(original[0].tags, ['Y']);
});
test('対象外品目を除外し、親子会社は別企業として保持する', () => {
  const r = row(1, '株式会社検証子会社', '対象', '05_robot ロボティクス（該当品目：ロボット；整備役務）', 'Sm');
  r[29] = 'X07 試験・整備（品目：整備役務）';
  const result = integrate(source([r]), [{ id: 'parent', name: '検証ホールディングス', stages: [5], subs: ['05_robot'], tags: ['Y'] }], subs);
  assert.equal(result.companies.length, 2);
  assert.equal(result.companies[1].def.includes('整備役務'), false);
  assert.deepEqual(result.companies[1].atla.categories[0].products, ['ロボット']);
});
test('工程5対象外の既存企業には調達実績だけを付ける', () => {
  const original = [{ id: 'old', name: '検証甲', stages: [4], subs: ['04_opt'], tags: ['Y'], def: '既存内容' }];
  const result = integrate(source([row(1, '株式会社検証甲', '対象外', '', 'Y')]), original, subs);
  assert.deepEqual(result.companies[0].stages, [4]);
  assert.deepEqual(result.companies[0].tags, ['Y']);
  assert.equal(result.companies[0].def, '既存内容');
  assert.equal(result.companies[0].atlaProcurement, true);
});
test('未知の元素・分類・未確定判定を黙って取り込まない', () => {
  assert.throws(() => sheetTags('Nd'), /未知/);
  assert.throws(() => integrate(source([row(1, '株式会社検証', '保留', '', '')]), [], subs), /判定未確定/);
  assert.throws(() => integrate(source([row(1, '株式会社検証', '対象', '05_unknown 未知（該当品目：装置）', 'Y')]), [], subs), /解決できません/);
});
