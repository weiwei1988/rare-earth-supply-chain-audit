import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('criticality deduplicates downstream companies and scopes share by element',()=>{
 const s={elements:['Y','Sc'],data:[{id:'a',tags:['Y','Sc'],subs:['02_a'],subEls:{'02_a':['Y','Sc']}},{id:'b',tags:['Y','Sc'],subs:['03_b','06_c'],subEls:{'03_b':['Y','Sc'],'06_c':['Y','Sc']}},{id:'c',tags:['Y','Sc'],subs:['06_c'],subEls:{'06_c':['Y','Sc']}}],allSubs:[{id:'02_a',stage:2,els:['Y','Sc']},{id:'03_b',stage:3,els:['Y','Sc'],src:['02_a'],srcEls:{'02_a':['Y','Sc']}},{id:'06_c',stage:6,els:['Y','Sc'],src:['03_b'],srcEls:{'03_b':['Y','Sc']}}],companyShares:{entries:[{company:'a',node:'02_a',els:['Y'],level:4}]}};
 vm.createContext(s);vm.runInContext(fs.readFileSync(new URL('../src/app/model.js',import.meta.url),'utf8'),s);
 const p=s.criticalityPoints();assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').downstream,2);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').score,100);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Sc').score,50);assert.ok(p.every(p=>p.maximum===2&&p.score>=0&&p.score<=100));
});
test('production matrix and ranking render in all locales with shared flow scores',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
 const nodes=new Map();const element=()=>({innerHTML:'',textContent:'',insertAdjacentHTML(){},querySelectorAll(){return[]},querySelector(){return null},scrollIntoView(){}});
 const root={querySelector(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}};
 const s={root,activeView:'criticality',language:'ja',elements:['Y','DyTb','Sm','Sc'],data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),stages:read('stages'),dependencyRows:read('dependency'),flowElementMeta:{ja:{},en:{},'zh-CN':{}},columnOrder:read('column-order'),companyText:(c,k)=>c[k],subText:(s,k)=>s[k],stageText:(s,k)=>s[k],tr:()=>'',flowSelectionId:null,selection:{type:'all'},selectedElements:['Y'],refresh(){}};
 s.colors={Y:'green',DyTb:'purple',Sm:'orange',Sc:'blue'};
 for(const lang of ['ja','en','zh-CN'])for(const el of s.elements)s.flowElementMeta[lang][el]={symbol:el,name:el+' name'};
 vm.createContext(s);for(const file of ['text','model','parts','criticality'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
 for(const language of ['ja','en','zh-CN']){s.language=language;s.renderCriticality();assert.match(nodes.get('#re-view-criticality').innerHTML,/data-cr-key/);assert.match(nodes.get('#re-cr-selection').innerHTML,/re-cr-facts/);assert.ok(nodes.get('#re-cr-companies').innerHTML.includes('data-cr-company'));}
 for(const sort of ['score','down','share']){const ranked=s.crSorted(sort);const key=sort==='down'?'downstream':sort==='share'?'level':'score';assert.ok(ranked.every((p,i)=>!i||ranked[i-1][key]>=p[key]));}
 assert.equal(s.crPoints().length,60);assert.equal(s.criticalityPoint('02_compound','Y').score,s.crPoints().find(p=>p.node==='02_compound'&&p.element==='Y').score);
});
test('シェア根拠は呼び出し元が渡した条件だけで決まる（別画面の選択が混ざらない）',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
 const elements=['Y','DyTb','Sm','Sc'];
 const s={elements,allElements:elements,data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),
  language:'ja',activeView:'overview',selection:{type:'all',id:'all'},selectedElements:elements.slice(),
  flowElement:'Y',flowSelectionId:null,crSelected:()=>null,criticalText:()=>'',subLabel:id=>id,tagLabel:t=>t,esc:v=>String(v),companyText:(c,k)=>c[k],tr:()=>''};
 vm.createContext(s);for(const file of ['text','model','parts'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
 const company=s.data.find(c=>c.id==='seed-3');
 const overview={node:null,elements};
 const baseline=s.shareRows(company,overview).length;
 assert.ok(baseline>1);
 // 別画面を開いていても、渡した条件が同じなら結果は変わらない（言語切替での再描画を模す）
 for(const view of ['criticality','element-flow','overview']){
  s.activeView=view;s.flowSelectionId='03_ceramic';s.flowElement='Sm';s.crSelected=()=>({node:'03_ceramic',element:'Y'});
  assert.equal(s.shareRows(company,overview).length,baseline);
 }
 // 条件を変えれば、その範囲だけに絞られる
 assert.deepEqual(s.shareRows(company,{node:'04_faraday',elements:['Y']}).map(r=>r.node+'|'+r.element),['04_faraday|Y']);
 assert.equal(s.shareRows(company,{node:'04_faraday',elements}).length,2);
});
