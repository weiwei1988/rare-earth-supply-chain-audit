import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('criticality deduplicates downstream companies and scopes share by element',()=>{
 const s={elements:['Y','Sc'],data:[{id:'a',tags:['Y','Sc'],subs:['02_a']},{id:'b',tags:['Y','Sc'],subs:['03_b','06_c']},{id:'c',tags:['Y','Sc'],subs:['06_c']}],allSubs:[{id:'02_a',stage:2,els:['Y','Sc']},{id:'03_b',stage:3,els:['Y','Sc'],src:['02_a'],srcEls:{'02_a':['Y','Sc']}},{id:'06_c',stage:6,els:['Y','Sc'],src:['03_b'],srcEls:{'03_b':['Y','Sc']}}],companyShares:{entries:[{company:'a',node:'02_a',els:['Y'],level:4}]}};
 vm.createContext(s);vm.runInContext(fs.readFileSync(new URL('../src/app/model.js',import.meta.url),'utf8'),s);
 const p=s.criticalityPoints();assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').downstream,2);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Y').score,100);assert.equal(p.find(p=>p.node==='02_a'&&p.element==='Sc').score,50);assert.ok(p.every(p=>p.maximum===2&&p.score>=0&&p.score<=100));
});
