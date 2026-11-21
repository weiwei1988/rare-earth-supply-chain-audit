import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('criticality deduplicates downstream companies and scopes share by element',()=>{
 const s={elements:['Y','Sc'],data:[{id:'a',tags:['Y','Sc'],subs:['02_a'],subEls:{'02_a':['Y','Sc']}},{id:'b',tags:['Y','Sc'],subs:['03_b','06_c'],subEls:{'03_b':['Y','Sc'],'06_c':['Y','Sc']}},{id:'c',tags:['Y','Sc'],subs:['06_c'],subEls:{'06_c':['Y','Sc']}}],allSubs:[{id:'02_a',stage:2,els:['Y','Sc']},{id:'03_b',stage:3,els:['Y','Sc'],src:['02_a'],srcEls:{'02_a':['Y','Sc']}},{id:'06_c',stage:6,els:['Y','Sc'],src:['03_b'],srcEls:{'03_b':['Y','Sc']}}],companyShares:{entries:[{company:'a',node:'02_a',els:['Y'],level:4}]}};
 vm.createContext(s);for(const file of ['supply-graph','model'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
 const p=s.criticalityPoints();assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').downstream,2);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').score,100);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Sc').score,100*Math.sqrt(3/6));assert.ok(p.every(p=>p.maximum===2&&p.score>=0&&p.score<=100));
});
test('production matrix and ranking render in all locales with shared flow scores',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
 const nodes=new Map();const element=()=>({innerHTML:'',textContent:'',insertAdjacentHTML(){},querySelectorAll(){return[]},querySelector(){return null},scrollIntoView(){}});
 const root={querySelector(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)}};
 const s={root,activeView:'criticality',language:'ja',elements:['Y','DyTb','Sm','Sc'],data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),stages:read('stages'),dependencyRows:read('dependency'),flowElementMeta:{ja:{},en:{},'zh-CN':{}},columnOrder:read('column-order'),companyText:(c,k)=>c[k],subText:(s,k)=>s[k],stageText:(s,k)=>s[k],tr:()=>'',flowSelectionId:null,selection:{type:'all'},selectedElements:['Y'],refresh(){}};
 s.colors={Y:'green',DyTb:'purple',Sm:'orange',Sc:'blue'};
 for(const lang of ['ja','en','zh-CN'])for(const el of s.elements)s.flowElementMeta[lang][el]={symbol:el,name:el+' name'};
 vm.createContext(s);for(const file of ['text','supply-graph','model','parts','criticality'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
 for(const language of ['ja','en','zh-CN']){s.language=language;s.renderCriticality();assert.match(nodes.get('#re-view-criticality').innerHTML,/data-cr-key/);assert.match(nodes.get('#re-cr-selection').innerHTML,/re-cr-facts/);assert.ok(nodes.get('#re-cr-companies').innerHTML.includes('data-cr-company'));}
 for(const sort of ['score','down','share']){const ranked=s.crSorted(sort);const key=sort==='down'?'downstream':sort==='share'?'level':'score';assert.ok(ranked.every((p,i)=>!i||ranked[i-1][key]>=p[key]));}
 // 工程別の内訳は下流企業数と同じ集合から作る（同じ工程の中の組み込みの先にいる企業も漏らさない）
 for(const p of s.crPoints().filter(p=>p.onPath)){const ids=new Set(p.downstreamByStage.flatMap(r=>r.companies.map(c=>c.id)));assert.equal(ids.size,p.downstream,p.node+'|'+p.element);}
 for(const element of ['DyTb','Sm']){const mag=s.criticalityPoint('04_mag',element);assert.ok(mag.downstreamByStage.some(r=>r.stage===4&&r.companies.length>0),'04_mag '+element);}
 assert.equal(s.crPoints().length,69);assert.equal(s.criticalityPoint('02_compound','Y').score,s.crPoints().find(p=>p.node==='02_compound'&&p.element==='Y').score);
});
test('シェア根拠は呼び出し元が渡した条件だけで決まる（別画面の選択が混ざらない）',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
 const elements=['Y','DyTb','Sm','Sc'];
 const s={elements,allElements:elements,data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),
  language:'ja',activeView:'overview',selection:{type:'all',id:'all'},selectedElements:elements.slice(),
  flowElement:'Y',flowSelectionId:null,crSelected:()=>null,criticalText:()=>'',subLabel:id=>id,tagLabel:t=>t,esc:v=>String(v),companyText:(c,k)=>c[k],tr:()=>''};
 vm.createContext(s);for(const file of ['text','supply-graph','model','parts'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
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
 assert.deepEqual(s.shareRows(company,{node:'04_faraday_tele',elements:['Y']}).map(r=>r.node+'|'+r.element),['04_faraday_tele|Y']);
 assert.equal(s.shareRows(company,{node:'04_faraday_tele',elements}).length,3);
});
test('装備からの逆算は共通モデルの経路と同じ工程・接続をたどり、3言語の文言がそろう',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
 const element=()=>({innerHTML:'',textContent:'',insertAdjacentHTML(){},querySelectorAll(){return[]},querySelector(){return null},scrollIntoView(){}});
 const root={querySelector(){return element()}};
 const s={root,activeView:'overview',language:'ja',elements:['Y','DyTb','Sm','Sc'],data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),stages:read('stages'),dependencyRows:read('dependency'),columnOrder:read('column-order'),companyText:(c,k)=>c[k],subText:(s,k)=>s[k],stageText:(s,k)=>s[k],tr:()=>'',colors:{Y:'green',DyTb:'purple',Sm:'orange',Sc:'blue'}};
 vm.createContext(s);for(const file of ['text','supply-graph','model','parts','equipment'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
 // 文言の項目は3言語で同じ
 const keys=Object.keys(s.eqLabels.ja).sort();for(const lang of ['en','zh-CN'])assert.deepEqual(Object.keys(s.eqLabels[lang]).sort(),keys,lang);
 // 装備・システムは列順の STAGE 06 をすべて並べる
 assert.deepEqual(s.equipmentIds,read('column-order')['6']);
 for(const eq of s.equipmentIds){
  const P=s.eqPathModel(eq);
  for(const el of P.els){
   const path=s.elementPath(el).path;assert.ok(path.has(eq),eq+'|'+el);
   // 道筋の工程は、その元素の経路上にあり、クリティカル度が付く
   for(const item of P.nodes.filter(n=>n.els.has(el))){assert.ok(path.has(item.id));assert.notEqual(s.criticalityPoint(item.id,el).score,null,item.id+'|'+el)}
  }
 }
 // 同じ工程の中の組み込み（永久磁石 → 回転子・アイソレータ）も道筋に入る
 assert.ok(s.eqPathModel('06_laser').links.some(l=>l.assembly&&l.from==='04_mag'&&l.to==='04_faraday_laser'&&l.element==='Sm'));
 // 装備カードの段階別か所数は、工程チップに出す丸めた点数の段階と一致する（49.75 点は 50 点として 50–69 に入る）
 assert.equal(s.scoreTier(49.75),s.scoreTier(50));assert.notEqual(s.scoreTier(49.4),s.scoreTier(50));
 let boundary=0;
 for(const eq of s.equipmentIds){
  const points=s.eqPathPoints(eq),shown={};
  for(const p of points){const tier=s.criticalityTier(Math.round(p.score));shown[tier]=(shown[tier]||0)+1;if(s.criticalityTier(p.score)!==tier)boundary++}
  for(const row of s.eqTierCounts(points))assert.equal(row.count,shown[row.band.tier]||0,eq+'|'+row.band.label);
 }
 // 現行データには丸めで段階が変わる工程があり、この検査が実際に境界を通っている
 assert.ok(boundary>0);
});
