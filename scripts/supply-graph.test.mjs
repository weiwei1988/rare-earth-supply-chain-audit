import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name+'.json',import.meta.url),'utf8'));
function load(extra={}){
  const s={elements:['Y','DyTb','Sm','Sc'],data:read('companies'),allSubs:read('subcategories'),companyShares:read('company-shares'),...extra};
  vm.createContext(s);
  for(const file of ['supply-graph','model','parts','flow'])vm.runInContext(fs.readFileSync(new URL('../src/app/'+file+'.js',import.meta.url),'utf8'),s);
  return s;
}
const pairs=edges=>Array.from(edges,e=>e.from+'|'+e.to);
test('element graph excludes empty endpoints and disallowed elements without mutating inputs',()=>{
  const subs=[{id:'a',stage:2,els:['Y']},{id:'b',stage:3,els:['Y'],src:['a'],srcEls:{a:['Sc']}},{id:'c',stage:4,els:['Y'],src:['a'],srcEls:{a:['Y']}}];
  const companies=[{id:'one',subs:['a','b'],subEls:{a:['Y'],b:['Y']}}];
  const s=load(),snapshot=JSON.stringify([subs,companies]);
  const graph=s.buildSupplyGraph(subs,companies,'Y');
  assert.deepEqual(Array.from(graph.byId.keys()),['a','b']);
  assert.equal(graph.edges.length,0);
  assert.deepEqual(pairs(s.buildSupplyGraph(subs,companies).edges),['a|b','a|c']);
  assert.equal(JSON.stringify([subs,companies]),snapshot);
  assert.equal(s.supplyGraphRoutes(graph,'missing').length,0);
});
test('TGG laser routes do not reach optical communications; telecom garnet routes remain available',()=>{
  const s=load(),graph=s.elementSupplyGraph('DyTb');
  assert.ok(s.supplyGraphReachable(graph,'03_yag_crystal').has('06_laser'));
  assert.ok(!s.supplyGraphReachable(graph,'03_yag_crystal').has('06_optical_net'));
  assert.ok(s.supplyGraphReachable(graph,'03_magneto_garnet').has('06_optical_net'));
});
test('rendered element edges and direct route explanations use the same graph in every element',()=>{
  const nodes=new Map();
  function dom(){return{clientWidth:1200,innerHTML:'',style:{setProperty(){}},classList:{toggle(){}},setAttribute(){},querySelectorAll(){return[]}}}
  const root={querySelector(id){if(!nodes.has(id))nodes.set(id,dom());return nodes.get(id)},querySelectorAll(){return[]}};
  const s=load({root,activeView:'element-flow',language:'ja',stages:read('stages'),columnOrder:read('column-order'),dependencyRows:read('dependency'),FLOW_SOURCE_ID:'flow-source',colors:{Y:'green',DyTb:'purple',Sm:'orange',Sc:'blue'}});
  let rendered;
  Object.assign(s,{renderFlowElementControls(){},flowLabelLines:label=>[label],subText:(sub,key)=>sub[key],stageText:(stage,key)=>stage[key],companyCount:String,metricCount:String,companyUnitCount:String,tagLabel:String,tr:key=>key,esc:String,criticalityPoint:()=>null,routeText:(target,from)=>target.srcNotes?.[from]||'',traceLinkedEdges(edges){rendered=edges;return{linked:new Set()}}});
  for(const element of s.elements){
    s.flowElement=element;s.flowSelectionId='02_compound';
    const graph=s.elementSupplyGraph(element),before=JSON.stringify(graph.edges);
    s.renderElementFlow();
    assert.deepEqual(pairs(rendered.filter(e=>e.from!==s.FLOW_SOURCE_ID)).sort(),pairs(graph.edges).sort());
    assert.deepEqual(Array.from(rendered.filter(e=>e.from===s.FLOW_SOURCE_ID),e=>e.to).sort(),Array.from(graph.nodes.filter(n=>n.stage===2),n=>n.id).sort());
    for(const sub of graph.nodes){
      const expected=rendered.filter(e=>e.from!==s.FLOW_SOURCE_ID&&(e.from===sub.id||e.to===sub.id));
      assert.deepEqual(pairs(s.routeRows(sub.id,graph)).sort(),pairs(expected).sort());
    }
    assert.equal(JSON.stringify(graph.edges),before);
    assert.equal(s.routeRows(s.FLOW_SOURCE_ID,graph).length,0);
  }
});
test('reachability terminates for cycles and follows only the requested direction',()=>{
  const s=load();
  const graph=s.buildSupplyGraph([{id:'a',src:['b'],srcEls:{b:['Y']}},{id:'b',src:['a'],srcEls:{a:['Y']}},{id:'c',src:['b'],srcEls:{b:['Y']}}],[]);
  assert.deepEqual(Array.from(s.supplyGraphReachable(graph,'a')).sort(),['a','b','c']);
  assert.deepEqual(Array.from(s.supplyGraphReachable(graph,'a',true)).sort(),['a','b']);
});
