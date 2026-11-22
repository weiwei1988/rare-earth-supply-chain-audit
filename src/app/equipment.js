// 「装備からの逆算」タブ。装備・システムを選ぶと、モジュール・機器 → 部材 → 材料 → 素材 → 海外へ、
// その装備につながる経路をさかのぼって表示する。経路は共通モデル（elementPath）を使い、クリティカル度と一致させる。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

var eqLabels={
  ja:{tab:'装備からの逆算',title:'装備からの逆算',lead:'装備・システムを選ぶと、使われるモジュール・機器・部材・材料・素材を遡ったサプライチェーンを見ることができます。',choose:'装備・システムを選ぶ',domestic:'国内{count}社',pathPoints:'経路上の工程',points:'{count}か所',noPath:'国内企業のいる工程を経る経路なし',tierTitle:'クリティカル度 {label}：{count}か所',cardsNote:'カードの帯と数字は、その装備・システムの経路上にある工程×元素を、クリティカル度の段ごとに数えたか所数です。',pathTitle:'「{name}」の希土類への依存の道筋',focus:'色で強調する元素',all:'全体',hint:'各ステージのカードを選ぶと、対象となる国内企業のカードを下に表示します。',overseas:'海外',flagOnly:'{element} のフラグが付く企業のみ。この工程が扱う元素：{elements}',handles:'この工程が扱う元素：{elements}',chinaBreakdown:'{element} の中国比率の内訳',skip:'間の工程を通らない接続',width:'帯の太さ＝{node}に {element} で関わる国内企業 {count}社',chip:'下流{down}社・シェア水準{level}',empty:'この工程の国内企業は、データ上確認できていません。'},
  en:{tab:'Trace from Systems',title:'Trace from Systems',lead:'Select a system to see its supply chain traced back through the modules & equipment, components, materials and raw materials it uses.',choose:'Select a system',domestic:'{count} domestic companies',pathPoints:'Stages × elements on the path',points:'{count}',noPath:'No path through stages with domestic companies',tierTitle:'Criticality {label}: {count}',cardsNote:'The bar and numbers on each card count the stage × element points on that system’s paths, by criticality band.',pathTitle:'Rare-earth dependency path of “{name}”',focus:'Element to highlight',all:'All',hint:'Select a card at any stage to list the domestic companies involved below.',overseas:'Overseas',flagOnly:'Only companies flagged for {element}. Elements handled at this stage: {elements}',handles:'Elements handled at this stage: {elements}',chinaBreakdown:'China share breakdown for {element}',skip:'Link that skips the stage in between',width:'Ribbon width = {count} domestic companies handling {element} at {node}',chip:'{down} downstream · share level {level}',empty:'No domestic companies are confirmed in the data for this stage.'},
  'zh-CN':{tab:'从装备逆向追溯',title:'从装备逆向追溯',lead:'选择装备或系统，即可查看从其所用的模块与设备、部件、材料、原料逆向追溯的供应链。',choose:'选择装备或系统',domestic:'国内{count}家',pathPoints:'路径上的工序×元素',points:'{count}处',noPath:'没有经过有国内企业工序的路径',tierTitle:'关键度 {label}：{count}处',cardsNote:'卡片上的色条与数字，是按关键度区间统计该装备或系统路径上的工序×元素处数。',pathTitle:'“{name}”的稀土依赖路径',focus:'用颜色突出的元素',all:'全部',hint:'选择各阶段的卡片，即可在下方显示相关的国内企业。',overseas:'海外',flagOnly:'仅显示标注{element}的企业。本工序涉及的元素：{elements}',handles:'本工序涉及的元素：{elements}',chinaBreakdown:'{element}的中国占比明细',skip:'跳过中间工序的连接',width:'带宽＝在{node}涉及{element}的国内企业{count}家',chip:'下游{down}家・份额等级{level}',empty:'数据中未能确认本工序的国内企业。'}
};
function eqText(key,values){var table=eqLabels[language]||eqLabels.ja,value=table[key]!==undefined?table[key]:eqLabels.ja[key];Object.keys(values||{}).forEach(function(name){value=value.split('{'+name+'}').join(values[name])});return value}

// 装備・システムのアイコン（線画。色は文字色に合わせる）
var eqIcons={
  '06_aircraft':'<path d="M21 15.5v-1.8l-7.5-4.7V4.2a1.5 1.5 0 0 0-3 0V9L3 13.7v1.8l7.5-2.2v4.5l-2 1.5V21l3.5-1 3.5 1v-1.7l-2-1.5v-4.5z"/>',
  '06_engine':'<path d="M3 9.5h11.5L20 12l-5.5 2.5H3z"/><path d="M7 9.5v5M10.5 9.5v5M20 12h1.5"/>',
  '06_launch':'<path d="M12 2.5c3 2.2 4.5 5.6 4.5 9.5v4.5h-9V12c0-3.9 1.5-7.3 4.5-9.5z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M7.5 13.5 5 16.5v3l2.5-1.5M16.5 13.5l2.5 3v3l-2.5-1.5M10.5 16.5v4M13.5 16.5v4"/>',
  '06_space':'<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M2.5 9.5h4.5v5H2.5zM17 9.5h4.5v5H17zM7 12h2M15 12h2M12 9V5.5M10 5h4"/>',
  '06_guidance':'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5l2.5 5.5-2.5 5.5-2.5-5.5z"/><path d="M12 2v1.5M12 20.5V22M2 12h1.5M20.5 12H22"/>',
  '06_unmanned':'<rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9.5 9.5 6.8 6.8M14.5 9.5l2.7-2.7M9.5 14.5l-2.7 2.7M14.5 14.5l2.7 2.7"/><circle cx="5.5" cy="5.5" r="2.3"/><circle cx="18.5" cy="5.5" r="2.3"/><circle cx="5.5" cy="18.5" r="2.3"/><circle cx="18.5" cy="18.5" r="2.3"/>',
  '06_naval':'<path d="M3 15.5h18l-2.5 4h-13z"/><path d="M6 15.5V11h12v4.5M9 11V7.5h5V11M11.5 7.5V4"/>',
  '06_laser':'<rect x="2.5" y="9" width="8" height="6" rx="1"/><path d="M10.5 12h11M15.5 8l1.5-2M15.5 16l1.5 2M19 9.5l2-1M19 14.5l2 1"/>',
  '06_radar':'<path d="M4.5 20.5h15M12 20.5v-4"/><path d="M5 12.5a7 7 0 0 0 12.1 4.8L7.2 7.4A7 7 0 0 0 5 12.5z"/><path d="M12.2 12.3 17.5 7M15 4.5a4.5 4.5 0 0 1 4.5 4.5"/>',
  '06_comm':'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><path d="M11 7.8 7 16.2M13 7.8l4 8.4M8 18h8"/>',
  '06_optical_net':'<path d="M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/><path d="M7 12c1.5-2 3-2 5 0s3.5 2 5 0"/>',
  '06_rf_sensor':'<circle cx="12" cy="10" r="1.5"/><path d="M12 11.5v9M8.5 20.5h7M8.3 6.3a5.2 5.2 0 0 0 0 7.4M15.7 6.3a5.2 5.2 0 0 1 0 7.4M5.5 3.5a9.2 9.2 0 0 0 0 13M18.5 3.5a9.2 9.2 0 0 1 0 13"/>',
  '06_energy':'<rect x="4" y="4" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="16" width="16" height="4" rx="1"/>',
  '06_nuclear':'<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  '06_semi':'<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4" rx=".5"/><path d="M9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5"/>'
};
function eqIconSvg(id){return'<svg viewBox="0 0 24 24" aria-hidden="true">'+(eqIcons[id]||'<circle cx="12" cy="12" r="8"/>')+'</svg>'}

var equipmentIds=(columnOrder[6]||[]).filter(function(id){return allSubs.some(function(sub){return sub.id===id&&sub.stage===6})});
// 選んでいる装備（eq）、色で強調する元素（focus：空＝全体）、選んだカード（target：空＝装備そのもの、origin:元素＝海外）、企業（company）
var eqState={eq:equipmentIds.indexOf('06_aircraft')>=0?'06_aircraft':equipmentIds[0],focus:'',target:'',company:''},eqPath=null;
function eqOriginKey(element){return'origin:'+element}
function eqSub(id){return allSubs.find(function(sub){return sub.id===id})}
function eqStageTitle(stageId){var stage=stages.find(function(item){return item.id===stageId});return'STAGE '+stage.code+' '+stageText(stage,'label')}
function eqDomestic(id){return eqText('domestic',{count:totalSubCount(id)})}
function eqElementList(list){return list.map(tagLabel).join(language==='en'?', ':'・')}

// この装備の経路上にある工程×元素（クリティカル度の高い順。値はその工程の下流全体で数えたもの）
function eqPathPoints(eqId){
  var found=[];
  equipmentElements(eqId).forEach(function(element){
    equipmentUpstream(eqId,element).forEach(function(id){var point=criticalityPoint(id,element);if(point&&point.score!==null)found.push(point)})
  });
  return found.sort(function(a,b){return b.score-a.score||b.downstream-a.downstream})
}

// 装備から上流へ：経路上の工程（node）と、工程どうし・海外からの接続（link）
function eqPathModel(eqId){
  var els=equipmentElements(eqId),nodes=new Map(),links=[];
  function addNode(id,element){if(!nodes.has(id))nodes.set(id,{id:id,sub:eqSub(id),els:new Set()});nodes.get(id).els.add(element)}
  els.forEach(function(element){
    var info=elementPath(element),up=equipmentUpstream(eqId,element);
    info.graph.edges.forEach(function(edge){
      if(!up.has(edge.from)||!(edge.to===eqId||up.has(edge.to)))return;
      var target=eqSub(edge.to);
      // skip：工程を1つ飛ばす接続（例：Y₂O₃ 粉末を焼結して耐プラズマ部品にする）／assembly：同じ工程の中の組み込み
      links.push({from:edge.from,to:edge.to,element:element,skip:Boolean(target.srcSkip&&target.srcSkip[edge.from]),assembly:edge.assembly});
      addNode(edge.from,element);if(edge.to!==eqId)addNode(edge.to,element)
    });
    // 素材（STAGE 02）は海外からの輸入を受ける
    up.forEach(function(id){if(eqSub(id).stage===2)links.push({from:eqOriginKey(element),to:id,element:element,skip:false,assembly:false})})
  });
  return{els:els,nodes:Array.from(nodes.values()),links:links}
}
function eqResolveTarget(P){
  var id=eqState.target;
  if(id.indexOf('origin:')===0){var element=id.slice(7);if(P.els.indexOf(element)>=0)return{kind:'origin',id:id,element:element}}
  else if(id){var item=P.nodes.find(function(node){return node.id===id});if(item)return{kind:'node',id:id,item:item}}
  return{kind:'eq',id:eqState.eq}
}
function eqResolveFocus(P){return eqState.focus&&P.els.indexOf(eqState.focus)>=0?eqState.focus:null}

// ---- 装備・システムのカード ----
// 段階ごとのか所数（高い段から）。工程チップと同じく、丸めた点数で段階を決める
function eqTierCounts(points){return criticalityBands.slice().reverse().map(function(band){return{band:band,count:points.filter(function(point){return scoreTier(point.score)===band.tier}).length}})}
function eqTierBreakdown(points){
  var tiers=eqTierCounts(points).filter(function(row){return row.count});
  return'<span class="re-eq-tiers"><span class="re-eq-tier-bar">'+tiers.map(function(row){return'<i class="re-criticality re-criticality-'+row.band.tier+'" style="flex-grow:'+row.count+'"></i>'}).join('')+'</span><span class="re-eq-tier-counts">'+tiers.map(function(row){return'<span class="re-criticality re-criticality-'+row.band.tier+'" title="'+esc(eqText('tierTitle',{label:row.band.label,count:row.count}))+'">'+row.count+'</span>'}).join('')+'</span></span>'
}
function eqCardHtml(id){
  var sub=eqSub(id),els=equipmentElements(id),points=eqPathPoints(id),name=subText(sub,'label');
  var body=points.length?'<span class="re-eq-caption"><span>'+esc(eqText('pathPoints'))+'</span><strong>'+esc(eqText('points',{count:points.length}))+'</strong></span>'+eqTierBreakdown(points):'<span class="re-eq-caption">'+esc(eqText('noPath'))+'</span>';
  return'<button type="button" class="re-eq-card'+(points.length?'':' is-empty')+'" data-eq="'+esc(id)+'" aria-pressed="'+(eqState.eq===id)+'"><span class="re-eq-head"><span class="re-eq-icon">'+eqIconSvg(id)+'</span><span class="re-eq-name">'+esc(name)+'</span><span class="re-eq-count">'+esc(eqDomestic(id))+'</span></span><span class="re-tags">'+tagsHtml(els)+'</span>'+body+'</button>'
}

// ---- 依存の道筋 ----
function eqFocusHtml(P,focus){
  if(!P.els.length)return'';
  return'<button type="button" data-eq-focus="" aria-pressed="'+(focus===null)+'">'+esc(eqText('all'))+'</button>'+P.els.map(function(element){return'<button type="button" data-eq-focus="'+esc(element)+'" aria-pressed="'+(focus===element)+'"><i class="re-eq-dot" style="background:'+colors[element]+'"></i>'+esc(tagLabel(element))+'</button>'}).join('')
}
function eqNodeHtml(entry,focus,targetId){
  var pressed=' tabindex="0" role="button" data-eq-target="'+esc(entry.id)+'" aria-pressed="'+(entry.id===targetId)+'"';
  if(entry.kind==='eq'){
    return'<div class="re-eq-node re-eq-node-eq" data-eq-node="'+esc(entry.id)+'"'+pressed+'><span class="re-eq-icon">'+eqIconSvg(entry.id)+'</span><span><span class="re-eq-node-stage">STAGE 06</span><span class="re-eq-node-label">'+esc(subText(eqSub(entry.id),'label'))+'</span><span class="re-eq-node-meta">'+esc(eqDomestic(entry.id))+'</span></span></div>'
  }
  if(entry.kind==='origin'){
    var match=focus&&focus===entry.element,dep=dependencyRows.find(function(row){return row.tag===entry.element});
    return'<div class="re-eq-node re-eq-node-origin'+(focus&&!match?' is-dim':'')+(match?' is-target':'')+'" style="--re-eq-el:'+colors[entry.element]+'" data-eq-node="'+esc(entry.id)+'"'+pressed+'><span class="re-eq-node-stage">STAGE 01 '+esc(eqText('overseas'))+'</span><span class="re-eq-node-chips">'+tagsHtml([entry.element])+'</span>'+(dep?'<span class="re-eq-node-stat"><strong>'+dep.china+'%</strong><span>'+esc(dependencyText(dep,'metric'))+'</span></span>':'')+'</div>'
  }
  var item=entry.item,matchNode=focus&&item.els.has(focus);
  var chips=elements.filter(function(element){return item.els.has(element)}).map(function(element){
    var point=criticalityPoint(item.id,element),score=point&&point.score!==null?Math.round(point.score):null,tier=score===null?1:scoreTier(point.score);
    var count=point?point.companies.length:0;
    var title=eqText('chip',{down:point?point.downstream:0,level:point?point.level:'—'})+(point&&point.representative?'（'+companyText(point.representative,'name')+'）':'');
    return'<span class="re-eq-chip re-criticality re-criticality-'+tier+(focus&&element!==focus?' is-muted':'')+'" title="'+esc(title)+'"><i class="re-eq-dot" style="background:'+colors[element]+'"></i>'+esc(tagLabel(element)+' '+companyCount(count)+(score===null?'':' · '+score))+'</span>'
  }).join('');
  return'<div class="re-eq-node'+(focus&&!matchNode?' is-dim':'')+(matchNode?' is-target':'')+'"'+(matchNode?' style="--re-eq-el:'+colors[focus]+'"':'')+' data-eq-node="'+esc(entry.id)+'"'+pressed+'><span class="re-eq-node-stage" title="'+esc(subText(item.sub,'description'))+'">'+esc(subText(item.sub,'description'))+'</span><span class="re-eq-node-label">'+esc(subText(item.sub,'label'))+'</span><span class="re-eq-node-chips">'+chips+'</span></div>'
}
function renderEquipmentPath(){
  var host=root.querySelector('#re-view-equipment'),P=eqPathModel(eqState.eq),focus=eqResolveFocus(P),target=eqResolveTarget(P);
  eqPath=P;
  if(target.kind==='eq')eqState.target='';
  host.querySelector('#re-eq-path-title').textContent=eqText('pathTitle',{name:subText(eqSub(eqState.eq),'label')});
  var focusBox=host.querySelector('#re-eq-focus');
  focusBox.innerHTML=eqFocusHtml(P,focus);focusBox.setAttribute('aria-label',eqText('focus'));
  // 列：装備・システム → モジュール・機器 → 部材 → 材料 → 素材 → 海外（左が下流）
  var columns=[[],[],[],[],[],[]];
  columns[0].push({id:eqState.eq,kind:'eq'});
  P.nodes.forEach(function(item){columns[6-item.sub.stage].push({id:item.id,kind:'node',item:item})});
  P.els.forEach(function(element){columns[5].push({id:eqOriginKey(element),kind:'origin',element:element})});
  // 左隣の列（下流）での並び順の平均で並べ、帯の交差を減らす
  for(var c=1;c<columns.length;c++){
    var prev=new Map(columns[c-1].map(function(item,index){return[item.id,index]}));
    var score=new Map(columns[c].map(function(item){
      var indexes=P.links.filter(function(link){return link.from===item.id&&prev.has(link.to)}).map(function(link){return prev.get(link.to)});
      return[item.id,indexes.length?indexes.reduce(function(sum,i){return sum+i},0)/indexes.length:0]
    }));
    columns[c].sort(function(a,b){return score.get(a.id)-score.get(b.id)})
  }
  // 海外（STAGE 01）は帯の並びより、元素の並び（Y → Dy・Tb → Sm → Sc）を優先して固定する
  columns[5].sort(function(a,b){return elements.indexOf(a.element)-elements.indexOf(b.element)});
  var grid=host.querySelector('#re-eq-path-grid');
  // 列の見出しには、その列の工程にいる国内企業の数（重複を除く）を出す。元素を強調しているときは、その元素で関わる企業だけを数え、元素の色で示す
  function columnCount(items){
    var ids=new Set();
    items.forEach(function(entry){
      if(entry.kind==='origin')return;
      var id=entry.kind==='eq'?entry.id:entry.item.id,els=focus?[focus]:(entry.kind==='eq'?null:elements.filter(function(element){return entry.item.els.has(element)}));
      data.forEach(function(company){if(company.subs.indexOf(id)>=0&&(!els||els.some(function(element){return companyHasElement(company,id,element)})))ids.add(company.id)})
    });
    return ids.size
  }
  grid.innerHTML=columns.map(function(items,index){var stage=6-index;return'<div class="re-eq-col"><div class="re-eq-col-head"><span class="re-eq-col-title">'+esc(eqStageTitle(stage))+'</span>'+(stage===1?'':'<span class="re-eq-col-count'+(focus?' is-el':'')+'"'+(focus?' style="--re-eq-el:'+colors[focus]+'"':'')+'>'+esc(companyCount(columnCount(items)))+'</span>')+'</div><div class="re-eq-stack">'+items.map(function(item){return eqNodeHtml(item,focus,target.id)}).join('')+'</div></div>'}).join('');
  host.querySelector('#re-eq-path').classList.toggle('is-empty',!P.els.length);
  grid.querySelectorAll('[data-eq-target]').forEach(function(card){
    card.addEventListener('click',function(event){event.stopPropagation();eqSelectTarget(card.dataset.eqTarget)});
    card.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();eqSelectTarget(card.dataset.eqTarget)}})
  });
  focusBox.querySelectorAll('[data-eq-focus]').forEach(function(button){button.addEventListener('click',function(){eqState.focus=button.dataset.eqFocus;eqState.company='';renderEquipmentPath();renderEquipmentList()})});
  drawEquipmentLinks(P,focus)
}

// 工程どうしは帯で結ぶ（元素別フローと同じ見せ方）。帯の太さは、上流の工程にその元素で関わる国内企業の数
function eqRibbonSource(link){return link.from.indexOf('origin:')===0?link.to:link.from}
function eqRibbonCount(link){return elementPath(link.element).graph.members.get(eqRibbonSource(link)).length}
function eqRibbonWidth(link){return Math.min(21,5+Math.max(0,eqRibbonCount(link)-1))}
function drawEquipmentLinks(P,focus){
  var wrap=root.querySelector('#re-eq-path'),svg=root.querySelector('#re-eq-path-svg');
  if(!wrap||wrap.offsetParent===null)return;
  var box=wrap.getBoundingClientRect(),rects=new Map();
  svg.setAttribute('width',wrap.offsetWidth);svg.setAttribute('height',wrap.offsetHeight);
  function rectOf(id){
    if(!rects.has(id)){var card=wrap.querySelector('[data-eq-node="'+CSS.escape(id)+'"]'),r=card&&card.getBoundingClientRect();rects.set(id,r?{x1:r.left-box.left,x2:r.right-box.left,y:r.top-box.top,h:r.height}:null)}
    return rects.get(id)
  }
  var links=P.links.filter(function(link){return rectOf(link.from)&&rectOf(link.to)}).map(function(link){return Object.assign({w:eqRibbonWidth(link)},link)});
  // カードの縁に帯を積む。左の縁は下流へ出る帯、右の縁は上流から入る帯。同じ列の中の組み込みは、送り手・受け手とも入口（右の縁）につなぐ
  var sides={left:new Map(),right:new Map()},starts=new Map(),ends=new Map();
  function add(side,id,other,link,store){if(!sides[side].has(id))sides[side].set(id,[]);sides[side].get(id).push({link:link,other:other,store:store})}
  links.forEach(function(link){add(link.assembly?'right':'left',link.from,link.to,link,starts);add('right',link.to,link.from,link,ends)});
  Object.keys(sides).forEach(function(side){
    sides[side].forEach(function(list,id){
      var card=rectOf(id);
      function middle(rect){return rect.y+rect.h/2}
      // 相手の上下で並べる。U 字の口は、上の相手へ向かうものを上端に、下の相手へ向かうものを下端に寄せ、近い相手ほど内側にする
      function key(item){var y=middle(rectOf(item.other)),order=elements.indexOf(item.link.element);if(!item.link.assembly)return[1,y,order];return y<middle(card)?[0,-y,-order]:[2,-y,order]}
      list.sort(function(a,b){var ka=key(a),kb=key(b);return ka[0]-kb[0]||ka[1]-kb[1]||ka[2]-kb[2]});
      var total=list.reduce(function(sum,item){return sum+item.link.w},0)+2*Math.max(0,list.length-1);
      var room=Math.max(card.h-8,5*list.length),scale=total>room?room/total:1,y=card.y+card.h/2-total*scale/2;
      list.forEach(function(item){var w=item.link.w*scale;item.store.set(item.link,{x:side==='left'?card.x1:card.x2,top:y,bottom:y+w});y+=w+2*scale})
    })
  });
  // 同じ工程の中の組み込み（U 字）は、カードの右（上流側）の余白へ迂回する。列の間隔は変えず、外側の端が次の列（一つ前の工程）の
  // カードに届く場合は、その列の U 字の振れ幅（カーブの R）を同じ倍率で縮めて余白に収める（入れ子の内外の順は保つ）
  var columns=Array.from(root.querySelectorAll('#re-eq-path-grid .re-eq-col')),swingScale={};
  links.filter(function(link){return link.assembly}).forEach(function(link){
    var a=starts.get(link),b=ends.get(link),index=6-eqSub(link.from).stage,next=columns[index+1];if(!next)return;
    var room=next.getBoundingClientRect().left-box.left-10-Math.max(a.x,b.x),swing=uRibbonOuter(a.top,a.bottom,b.top,b.bottom)*.75;
    if(room<swing)swingScale[index]=Math.min(swingScale[index]||1,Math.max(.12,room/swing))
  });
  function scaleOf(link){return swingScale[6-eqSub(link.from).stage]}
  function ribbon(a,b){var mid=(a.x+b.x)/2;return'M'+a.x+','+a.top+' C'+mid+','+a.top+' '+mid+','+b.top+' '+b.x+','+b.top+' L'+b.x+','+b.bottom+' C'+mid+','+b.bottom+' '+mid+','+a.bottom+' '+a.x+','+a.bottom+' Z'}
  function nodeName(id){return id.indexOf('origin:')===0?stageText(stages[0],'label'):subText(eqSub(id),'label')}
  var back=[],front=[],marks=[];
  links.forEach(function(link){
    var a=starts.get(link),b=ends.get(link),isFocus=focus===link.element,color=colors[link.element];
    var x=Math.max(a.x,b.x);
    var d=link.assembly?uRibbonPath(x,a.top,a.bottom,b.top,b.bottom,1,scaleOf(link)):ribbon(a,b);
    var cls='re-eq-rib'+(isFocus?' is-focus':'')+(focus&&!isFocus?' is-dim':'')+(link.skip?' is-skip':'');
    var title=nodeName(link.from)+' → '+nodeName(link.to)+'（'+tagLabel(link.element)+'）｜'+eqText('width',{node:nodeName(eqRibbonSource(link)),element:tagLabel(link.element),count:eqRibbonCount(link)})+(link.skip?'｜'+eqText('skip'):link.assembly?'｜'+tr('routeAssembly'):'');
    var markup='<path class="'+cls+'" d="'+d+'" fill="'+color+'"'+(link.skip?' stroke="'+color+'"':'')+'><title>'+esc(title)+'</title></path>';
    (isFocus?front:back).push(markup);
    // U 字の帯には、受け手の入口に矢じり、迂回の頂点に受け手側を向く山形を付けて向きを示す
    if(link.assembly){
      var m=uRibbonMarks(x,a.top,a.bottom,b.top,b.bottom,1,scaleOf(link));
      marks.push('<g class="re-eq-asm-mark'+(isFocus?' is-focus':'')+(focus&&!isFocus?' is-dim':'')+'"><path d="'+m.head+'" fill="'+color+'"></path><path class="re-eq-asm-chevron" d="'+m.chevron+'"></path></g>')
    }
  });
  svg.innerHTML=back.join('')+front.join('')+marks.join('')
}

// ---- 下に表示する企業カード ----
function renderEquipmentList(){
  var host=root.querySelector('#re-view-equipment'),P=eqPath,target=eqResolveTarget(P);
  var title=host.querySelector('#re-eq-list-title'),count=host.querySelector('#re-eq-list-count'),note=host.querySelector('#re-eq-list-note'),box=host.querySelector('#re-eq-companies'),dossier=host.querySelector('#re-eq-dossier'),main=host.querySelector('.re-main');
  if(target.kind==='origin'){
    // 海外には国内企業がいないため、全体像・元素別フローと同じく中国比率の内訳を出す
    main.classList.add('is-dependency');
    title.textContent=eqStageTitle(1)+' — '+eqText('chinaBreakdown',{element:tagLabel(target.element)});
    count.textContent=tr('publicStats');note.hidden=true;
    box.innerHTML=dependencyDashboardHtml([target.element]);dossier.innerHTML='';
    return
  }
  main.classList.remove('is-dependency');
  var items,scope=null,noteText='';
  if(target.kind==='node'){
    var item=target.item,focus=eqResolveFocus(P),picked=focus&&item.els.has(focus)?focus:'',handled=elements.filter(function(element){return item.els.has(element)}),els=picked?[picked]:handled;
    items=data.filter(function(company){return els.some(function(element){return companyHasElement(company,item.id,element)})});
    title.textContent=eqStageTitle(item.sub.stage)+' — '+subText(item.sub,'label');
    noteText=picked?eqText('flagOnly',{element:tagLabel(picked),elements:eqElementList(handled)}):eqText('handles',{elements:eqElementList(handled)});
    scope={node:item.id,elements:els}
  }else{
    items=data.filter(function(company){return company.subs.indexOf(eqState.eq)>=0});
    title.textContent=eqStageTitle(6)+' — '+subText(eqSub(eqState.eq),'label')
  }
  count.textContent=companyUnitCount(items.length);
  note.hidden=!noteText;note.textContent=noteText;
  box.innerHTML=items.length?items.map(function(company){return companyCardHtml(company,'data-eq-company',eqState.company,scope)}).join(''):'<div class="re-empty">'+esc(eqText('empty'))+'</div>';
  dossier.innerHTML=dossierMarkup(items.find(function(company){return company.id===eqState.company}),scope);
  box.querySelectorAll('[data-eq-company]').forEach(function(button){button.addEventListener('click',function(){
    eqState.company=button.dataset.eqCompany;renderEquipmentList();
    revealDossier(dossier)
  })})
}
function eqSelectTarget(id){
  rememberMapPosition();
  eqState.target=id===eqState.eq?'':id;eqState.company='';
  var targetId=eqResolveTarget(eqPath).id;
  root.querySelectorAll('#re-eq-path [data-eq-target]').forEach(function(card){card.setAttribute('aria-pressed',String(card.dataset.eqTarget===targetId))});
  renderEquipmentList();
  eqRevealList()
}
// 企業一覧の一列目が画面の下で切れているときだけ、一列目の下端が画面に収まるまで動かす（見出しは画面上端より上へ出さない）。
// 一列目がすでに見えていれば動かさないため、図の近くのカードを続けて選んでも画面が跳ねない
function eqRevealList(){
  var heading=root.querySelector('#re-eq-list-title'),first=root.querySelector('#re-eq-companies > *');if(!heading)return;
  var margin=16,bottom=(first||heading).getBoundingClientRect().bottom,overflow=bottom+margin-window.innerHeight;
  if(overflow<=0)return;
  var room=heading.getBoundingClientRect().top-margin;
  window.scrollBy({top:Math.min(overflow,Math.max(room,0)),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
}

// ---- 画面全体 ----
function renderEquipment(){
  var host=root.querySelector('#re-view-equipment');
  if(!host.querySelector('#re-eq-grid')){
    host.innerHTML='<div class="re-element-flow-head"><div><h2 class="re-element-flow-title" id="re-eq-title"></h2><p class="re-element-flow-lead" id="re-eq-lead"></p></div></div>'+
      '<div class="re-eq-grid" id="re-eq-grid" role="group"></div><p class="re-eq-note" id="re-eq-cards-note"></p>'+
      '<section class="re-eq-path-panel" id="re-eq-path-panel"><div class="re-eq-path-head"><h3 id="re-eq-path-title"></h3><div class="re-eq-focus" id="re-eq-focus" role="group"></div></div><p class="re-eq-note" id="re-eq-hint"></p>'+
      '<div class="re-eq-scroll" id="re-eq-frame"><div class="re-eq-path" id="re-eq-path"><svg class="re-eq-path-svg" id="re-eq-path-svg" aria-hidden="true"></svg><div class="re-eq-path-grid" id="re-eq-path-grid"></div></div></div></section>'+
      '<section class="re-element-flow-results" id="re-eq-results"><div class="re-element-flow-results-head"><h2 id="re-eq-list-title"></h2><span id="re-eq-list-count"></span>'+mapReturnButton()+'</div><p class="re-eq-note" id="re-eq-list-note" hidden></p>'+
      '<main class="re-main"><section class="re-company-grid" id="re-eq-companies" aria-live="polite"></section><aside id="re-eq-dossier"></aside></main></section>'+
      // クリティカル度の求め方・凡例とシェア水準の判定基準は、企業カードの下に置く（元素別フローと同じ）
      '<div class="re-element-flow-note re-cr-legend-note" id="re-eq-cr-note"></div>';
    // 図の余白を押すと、強調を一段戻す（選んだカード → 元素の強調 → 全体）
    host.querySelector('#re-eq-frame').addEventListener('click',function(event){
      if(event.target.closest('[data-eq-target]'))return;
      if(eqState.target){eqState.target='';eqState.company=''}else if(eqState.focus)eqState.focus='';else return;
      renderEquipmentPath();renderEquipmentList()
    });
    if(window.ResizeObserver){var timer=null;new ResizeObserver(function(){if(activeView!=='equipment'||!eqPath)return;clearTimeout(timer);timer=setTimeout(function(){drawEquipmentLinks(eqPath,eqResolveFocus(eqPath))},80)}).observe(host.querySelector('#re-eq-frame'))}
  }
  host.querySelector('#re-eq-title').textContent=eqText('title');
  host.querySelector('#re-eq-lead').textContent=eqText('lead');
  host.querySelector('#re-eq-cards-note').textContent=eqText('cardsNote');
  host.querySelector('#re-eq-hint').textContent=eqText('hint');
  host.querySelector('#re-eq-cr-note').innerHTML='<div>'+criticalityLegendHtml()+shareCriteriaHtml()+'</div>';
  var grid=host.querySelector('#re-eq-grid');
  grid.setAttribute('aria-label',eqText('choose'));
  grid.innerHTML=equipmentIds.map(eqCardHtml).join('');
  grid.querySelectorAll('[data-eq]').forEach(function(card){card.addEventListener('click',function(){
    eqState={eq:card.dataset.eq,focus:'',target:'',company:''};renderEquipment();
    host.querySelector('#re-eq-path-panel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})
  })});
  renderEquipmentPath();renderEquipmentList()
}
// 起動前にタブとパネルを設置し、既存のタブ配線へ参加させる（元素別フローの次に置く）
root.querySelector('#re-tab-element-flow').insertAdjacentHTML('afterend','<button class="re-view-tab" id="re-tab-equipment" data-view="equipment" type="button" role="tab" aria-selected="false" tabindex="-1" aria-controls="re-view-equipment"></button>');
root.querySelector('#re-view-element-flow').insertAdjacentHTML('afterend','<section class="re-view-panel re-equipment" id="re-view-equipment" role="tabpanel" aria-labelledby="re-tab-equipment" hidden></section>');
