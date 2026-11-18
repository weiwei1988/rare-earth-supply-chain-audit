// 表示するデータの絞り込みと数え上げ。DOM には触れない。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

// Share levels are scoped to company, category and element, rather than company-wide.
function shareEntry(companyId,nodeId,element){
  return companyShares.entries.filter(function(e){return e.company===companyId&&e.node===nodeId&&(!element||!e.els||!e.els.length||e.els.indexOf(element)>=0)}).sort(function(a,b){return b.level-a.level})[0]||{company:companyId,node:nodeId,level:1};
}
function criticalityPoints(){
  var points=[];
  elements.forEach(function(element){
    var active=allSubs.filter(function(s){return s.els.indexOf(element)>=0&&flowCompanyCount(s.id,element)>0}),ids=new Set(active.map(function(s){return s.id})),edges=[];
    active.forEach(function(s){(s.src||[]).forEach(function(from){if(ids.has(from)&&(s.srcEls[from]||[]).indexOf(element)>=0)edges.push([from,s.id])})});
    function walk(start,reverse){var seen=new Set(),stack=[start];while(stack.length){var id=stack.pop();edges.forEach(function(e){if(e[reverse?1:0]===id&&!seen.has(e[reverse?0:1])){seen.add(e[reverse?0:1]);stack.push(e[reverse?0:1])}})}return seen}
    var reachable=new Set();active.filter(function(s){return s.stage===2}).forEach(function(s){reachable.add(s.id);walk(s.id,false).forEach(function(id){reachable.add(id)})});
    var finals=new Set(active.filter(function(s){return s.stage===6}).map(function(s){return s.id}));
    var path=new Set(active.filter(function(s){return reachable.has(s.id)&&(finals.has(s.id)||Array.from(walk(s.id,false)).some(function(id){return finals.has(id)}))}).map(function(s){return s.id}));
    active.filter(function(s){return s.stage<6}).forEach(function(s){
      var down=walk(s.id,false),companies=data.filter(function(c){return c.subs.some(function(id){return down.has(id)&&path.has(id)&&companyHasElement(c,id,element)})});
      var members=data.filter(function(c){return companyHasElement(c,s.id,element)}),level=1;
      members.forEach(function(c){level=Math.max(level,shareEntry(c.id,s.id,element).level)});
      var representative=members.find(function(c){return shareEntry(c.id,s.id,element).level===level});
      points.push({node:s.id,element:element,downstream:path.has(s.id)?companies.length:0,level:level,score:null,onPath:path.has(s.id),companies:members,downstreamCompanies:path.has(s.id)?companies:[],downstreamNodes:Array.from(down).filter(function(id){return path.has(id)}),representative:representative});
    });
  });
  var max=Math.max.apply(null,[1].concat(points.map(function(p){return p.downstream})));
  points.forEach(function(p){if(p.onPath)p.score=100*Math.sqrt(p.downstream/max*p.level/4);p.maximum=max});return points;
}
var criticalityCache;
function criticalityPoint(id,element){if(!criticalityCache)criticalityCache=criticalityPoints();return criticalityCache.find(function(p){return p.node===id&&p.element===element})}
function visible(){
  return data.filter(function(c){
    var tags=Array.isArray(c.tags)?c.tags:[];
    return tags.some(function(tag){return selectedElements.indexOf(tag)>=0})
  })
}
// 選んだ元素を、その企業がその工程（サブカテゴリー）で扱うか。企業単位の tags は
// 各工程の元素の和集合なので、工程を絞って数えるときは必ず subEls で判定する。
function matchesSelectedElement(company,id){
  return selectedElements.some(function(element){return companyHasElement(company,id,element)})
}
function inSelection(c){
  if(selection.type==="all")return true;
  if(selection.type==="stage")return c.subs.some(function(id){return subStage(id)===Number(selection.id)&&matchesSelectedElement(c,id)});
  if(selection.type==="sub")return matchesSelectedElement(c,selection.id);
  return false
}
function normalizeSearch(value){return String(value||"").normalize("NFKC").toLocaleLowerCase("ja")}
function list(){
  var terms=normalizeSearch(root.querySelector("#re-company-search").value).trim().split(/\s+/).filter(Boolean);
  return visible().filter(inSelection).filter(function(c){
    var translated=["name","own","rev","prod","pos","def","chn","bom","gap","src","note"].map(function(key){return companyText(c,key)});
    var canonical=[c.name,c.own,c.rev,c.prod,c.pos,c.def,c.chn,c.bom,c.gap,c.note];
    var text=normalizeSearch(translated.concat(canonical,c.atlaProcurement?[tr("atla"),"防衛装備庁調達実績あり"]:[]).filter(Boolean).join(" "));
    return terms.every(function(term){return text.includes(term)})
  })
}
function countStage(id){return data.filter(function(c){return c.subs.some(function(sub){return subStage(sub)===id&&matchesSelectedElement(c,sub)})}).length}
function totalStageCount(id){return data.filter(function(c){return c.stages.indexOf(id)>=0}).length}
function countSub(id){return data.filter(function(c){return matchesSelectedElement(c,id)}).length}
function totalSubCount(id){return data.filter(function(c){return c.subs.indexOf(id)>=0}).length}
// 元素の所属はサブカテゴリーごとに持つ（subEls）。企業の tags はその和集合なので、工程別に数えるときは使わない。
function companyHasElement(company,id,element){var els=company.subEls&&company.subEls[id];return Array.isArray(els)&&els.indexOf(element)>=0}
function subElementCount(id,element){return data.filter(function(c){return companyHasElement(c,id,element)}).length}
function activeEls(item){var forced=item.forceEls||[];return item.els.filter(function(element){return forced.indexOf(element)>=0||subElementCount(item.id,element)>0})}

function subLabel(id){var sub=allSubs.find(function(item){return item.id===id});return sub?subText(sub,"label"):id}
function flowCompanyCount(id,element){
  return data.filter(function(company){return companyHasElement(company,id,element)}).length
}
function flowStageCount(stage,element){
  return data.filter(function(company){return company.subs.some(function(id){return companyHasElement(company,id,element)&&subStage(id)===stage})}).length
}
function subStage(id){var sub=allSubs.find(function(item){return item.id===id});return sub?sub.stage:null}
var flowOrderByElement={
  Y:{
    2:["02_compound","02_recycle"],
    3:["03_ceramic","03_yag_crystal","03_magneto_garnet","03_dielectric_additive","03_yttria_powder"],
    4:["04_tbc_spray","04_elec","04_media","04_laser_medium","04_faraday_tele","04_dielectric","04_plasma_spray","04_ods"],
    5:["05_tbc","05_sofc","05_laser_osc","05_electronics","05_photonics","05_plasma_parts","05_cladding"],
    6:["06_engine","06_energy","06_unmanned","06_laser","06_aircraft","06_launch","06_space","06_radar","06_rf_sensor","06_guidance","06_naval","06_comm","06_optical_net","06_semi","06_nuclear"]
  },
  DyTb:{
    2:["02_compound","02_recycle","02_metal"],
    3:["03_yag_crystal","03_magneto_garnet","03_dielectric_additive","03_magnet_alloy","03_magnet_powder"],
    4:["04_faraday_laser","04_faraday_tele","04_dielectric","04_mag"],
    5:["05_laser_osc","05_photonics","05_electronics","05_motor"],
    6:["06_laser","06_optical_net","06_comm","06_guidance","06_naval","06_space","06_aircraft","06_unmanned","06_launch","06_radar","06_energy"]
  },
  Sm:{
    2:["02_compound","02_metal","02_recycle"],
    3:["03_magnet_powder","03_magnet_alloy"],
    4:["04_mag"],
    5:["05_motor","05_tube","05_electronics"],
    6:["06_aircraft","06_guidance","06_unmanned","06_naval","06_launch","06_space","06_energy","06_radar","06_comm"]
  },
  Sc:{
    2:["02_compound","02_metal"],
    3:["03_light_alloy","03_ceramic","03_sam_crystal","03_alsc_semi"],
    4:["04_am_feedstock","04_elec","04_sc_crystal","04_target"],
    5:["05_am","05_sofc","05_electronics","05_scaln_film","05_tube"],
    6:["06_launch","06_aircraft","06_energy","06_naval","06_space","06_guidance","06_rf_sensor","06_radar","06_comm"]
  }
};
function flowSortIndex(element,stage,id,fallbackOrder){
  var ids=(flowOrderByElement[element]||{})[stage]||[],index=ids.indexOf(id);
  return index>=0?index:ids.length+(Object.prototype.hasOwnProperty.call(fallbackOrder,id)?fallbackOrder[id]:999)
}
function selectionLabel(){
  if(selection.type==="all")return tr("allSelection");
  if(selection.type==="stage"){
    var s=stages.find(function(x){return x.id===Number(selection.id)});
    return tr("stage")+" "+selection.id+" — "+stageText(s,"label");
  }
  if(selection.type==="sub"){var q=allSubs.find(function(x){return x.id===selection.id});return tr("stage")+" "+q.stage+" — "+subText(q,"label")}
  return tr("allSelection")
}

