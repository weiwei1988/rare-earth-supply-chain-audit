import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { canonicalGraphLocale, validateGraphLocale } from './lib/graph-locales.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
const stages=read('stages'),subs=read('subcategories'),canonical=canonicalGraphLocale(stages,subs);

test('graph locale validation rejects missing, stale and empty translations',()=>{
  const id=subs.find(sub=>sub.src?.length).id;
  const cases=[
    overlay=>delete overlay.subcategories[id],
    overlay=>overlay.subcategories.retired_category={label:'old',description:'old'},
    overlay=>delete overlay.subcategories[id].description,
    overlay=>overlay.subcategories[id].label=' ',
    overlay=>overlay.subcategories[id].label=['invalid'],
    overlay=>delete overlay.subcategories[id].srcNotes[Object.keys(overlay.subcategories[id].srcNotes)[0]],
    overlay=>overlay.subcategories[id].srcNotes.retired_source='old',
    overlay=>delete overlay.stages[stages[0].id],
    overlay=>overlay.stages[stages[0].id].short='',
    overlay=>overlay.subcategories=[],
  ];
  for(const change of cases){const overlay=read('locales/en');change(overlay);assert.throws(()=>validateGraphLocale(overlay,canonical,'en'));}
  const ja=read('locales/ja');ja.subcategories[id].label+='変更';
  assert.throws(()=>validateGraphLocale(ja,canonical,'ja'),/同期/);
  for(const locale of ['ja','en','zh-CN'])assert.doesNotThrow(()=>validateGraphLocale(read('locales/'+locale),canonical,locale));
});

test('all screens resolve graph text from locale records and fall back by field',()=>{
  const s={localeData:{en:read('locales/en'),'zh-CN':read('locales/zh-CN')}};
  vm.createContext(s);vm.runInContext(fs.readFileSync(new URL('../src/app/i18n.js',import.meta.url),'utf8'),s);
  for(const locale of ['en','ja','zh-CN','en']){
    s.language=locale;
    const expected=locale==='ja'?canonical:s.localeData[locale];
    for(const stage of stages)for(const key of ['label','short'])assert.equal(s.stageText(stage,key),expected.stages[stage.id][key]);
    for(const sub of subs){
      for(const key of ['label','description'])assert.equal(s.subText(sub,key),expected.subcategories[sub.id][key]);
      for(const from of sub.src||[])assert.equal(s.routeText(sub,from),expected.subcategories[sub.id].srcNotes[from]);
    }
  }
  const sub=subs.find(sub=>sub.src?.length),from=sub.src[0];
  delete s.localeData.en.subcategories[sub.id].description;
  delete s.localeData.en.subcategories[sub.id].srcNotes[from];
  assert.equal(s.subText(sub,'description'),sub.description);
  assert.equal(s.routeText(sub,from),sub.srcNotes[from]);
  delete s.localeData.en.subcategories;
  assert.equal(s.subText(sub,'label'),sub.label);
  assert.equal(s.routeText(sub,from),sub.srcNotes[from]);
});
