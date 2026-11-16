// クリティカル度の比較と内訳。元素フローと同じ集計結果を参照する。
var criticalState={sort:'score',key:null,company:null,pane:'matrix',expanded:false};
function crText(key){
  var labels={
    ja:{bands:['下流への影響は限定的','下流への影響はやや広い','下流への影響は広い','下流への影響が最も広い'],downShort:'下流',shareShort:'水準',legend:'色の読み方',view:'表示',showAll:'全体を表示',collapse:'折りたたむ',tab:'クリティカル度マップ',matrix:'工程 × 元素のクリティカル度',ranking:'ランキング',score:'クリティカル度が高い順',down:'下流企業が多い順',share:'シェア水準が高い順',downstream:'下流の収録企業・事業単位',maximum:'主力製品のシェア（最大値）',breakdown:'下流の内訳',evidence:'この工程の企業とシェア根拠',nodes:'下流の工程',companies:'この工程の企業',choose:'マトリックスのセル、またはランキングから選択してください。',unavailable:'経路外・算出対象外',none:'該当する企業はありません。',stage:'工程',company:'企業',original:'評価根拠'},
    en:{bands:['Limited downstream reach','Moderately wide reach','Wide downstream reach','Widest downstream reach'],downShort:'Downstream',shareShort:'Share',legend:'Reading the colours',view:'View',showAll:'Show all',collapse:'Collapse',tab:'Criticality Map',matrix:'Criticality by category and element',ranking:'Ranking',score:'Highest criticality',down:'Most downstream companies',share:'Highest share level',downstream:'Downstream listed companies / business units',maximum:'Highest product share level',breakdown:'Downstream breakdown',evidence:'Category companies and share evidence',nodes:'Downstream categories',companies:'Companies in this category',choose:'Select a matrix cell or ranking entry.',unavailable:'Off-path / not scored',none:'No matching companies.',stage:'Stage',company:'Company',original:'Assessment evidence'},
    'zh-CN':{bands:['对下游影响有限','对下游影响较广','对下游影响广泛','对下游影响最广'],downShort:'下游',shareShort:'等级',legend:'颜色的含义',view:'显示',showAll:'显示全部',collapse:'收起',tab:'关键度地图',matrix:'工序 × 元素关键度',ranking:'排名',score:'关键度从高到低',down:'下游企业数从多到少',share:'份额等级从高到低',downstream:'下游收录企业及业务单位',maximum:'主要产品最高份额等级',breakdown:'下游构成',evidence:'本工序企业及份额依据',nodes:'下游工序',companies:'本工序企业',choose:'请选择矩阵单元格或排名条目。',unavailable:'路径外／不评分',none:'无符合条件的企业。',stage:'工序',company:'企业',original:'评价依据'}
  };return labels[language][key];
}
function crKey(p){return p.node+'|'+p.element}
function crElement(element){return'<span class="re-cr-element"><i aria-hidden="true" style="background:'+colors[element]+'"></i>'+esc(tagLabel(element))+'</span>'}
// 表頭だけは元素記号を大きく出し、その下に元素名を添える（ランキングの行には使わない）
function crElementHead(element){
  var meta=flowElementMeta[language][element];
  return'<span class="re-cr-element re-cr-element-head"><i aria-hidden="true" style="background:'+colors[element]+'"></i>'+esc(meta?meta.symbol:tagLabel(element))+'</span>'+(meta&&meta.name?'<span class="re-cr-el-name">'+esc(meta.name)+'</span>':'')
}
function crBadge(score){return score===null?'—':'<span class="re-criticality re-criticality-'+criticalityTier(Math.round(score))+' re-criticality-legend">'+Math.round(score)+'</span>'}
function crPoints(){if(!criticalityCache)criticalityCache=criticalityPoints();return criticalityCache}
function crSelected(){return crPoints().find(function(p){return crKey(p)===criticalState.key})}
function crSorted(sort){return crPoints().filter(function(p){return p.score!==null}).slice().sort(function(a,b){return(sort==='down'?b.downstream-a.downstream:sort==='share'?b.level-a.level:b.score-a.score)||b.score-a.score||b.downstream-a.downstream||crKey(a).localeCompare(crKey(b))})}
function crSelect(key){criticalState.key=key;criticalState.company=null;refresh('criticality');var heading=root.querySelector('#re-cr-selection');heading.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
function crMembers(id,element){return data.filter(function(c){return companyHasElement(c,id,element)})}
// --- 画面の組み立て。HTML の生成は役割ごとに小さく分ける ---
function crMatrixHeadHtml(){
  return'<thead><tr><th scope="col">'+esc(crText('stage'))+'</th>'+elements.map(function(el){
    var dep=dependencyRows.find(function(row){return row.tag===el});
    return'<th scope="col">'+crElementHead(el)+'<span class="re-cr-china">'+esc(dep?tr('chinaRatio',{value:dep.china}):tr('chinaReference'))+'</span></th>'
  }).join('')+'</tr></thead>'
}
function crCellHtml(sub,element,point){
  if(!point)return'<td><span class="re-cr-na" aria-label="'+esc(crText('unavailable'))+'">—</span></td>';
  var score=point.score===null?null:Math.round(point.score);
  var detail=score===null?crText('unavailable'):crText('downShort')+' '+point.downstream+' / '+crText('shareShort')+' '+point.level;
  var aria=subText(sub,'label')+' / '+tagLabel(element)+' / '+(score===null?crText('unavailable'):crText('score')+' '+score+' · '+crText('downstream')+' '+point.downstream+' · '+criticalText('share')+' '+point.level);
  return'<td><button type="button" class="re-cr-cell'+(score===null?'':' re-criticality re-criticality-'+criticalityTier(score))+'" data-cr-key="'+esc(crKey(point))+'" aria-pressed="'+(criticalState.key===crKey(point))+'" aria-label="'+esc(aria)+'">'+
    '<span class="re-cr-cell-score">'+(score===null?'—':score)+'</span><small>'+(score===null?esc(detail):'<span class="re-cr-cell-detail">'+esc(crText('downShort')+' '+point.downstream)+'</span><span class="re-cr-cell-detail">'+esc(crText('shareShort')+' '+point.level)+'</span>')+'</small></button></td>'
}
function crMatrixRowHtml(id,points){
  var sub=allSubs.find(function(item){return item.id===id}),note=subText(sub,'description');
  // 行の下の注釈は「サプライチェーン全体像」のカードと同じ description を使う
  return'<tr><th scope="row"><span class="re-cr-row-name">'+esc(subText(sub,'label'))+'</span>'+(note?'<span class="re-cr-row-note">'+esc(note)+'</span>':'')+'</th>'+
    elements.map(function(el){return crCellHtml(sub,el,points.find(function(p){return p.node===id&&p.element===el}))}).join('')+'</tr>'
}
function crMatrixHtml(points){
  var body=stages.filter(function(stage){return stage.id>=2&&stage.id<6}).map(function(stage){
    return'<tr class="re-cr-stage"><th colspan="5">STAGE '+esc(stage.code)+' · '+esc(stageText(stage,'label'))+'</th></tr>'+
      (columnOrder[stage.id]||[]).map(function(id){return crMatrixRowHtml(id,points)}).join('')
  }).join('');
  return'<table class="re-cr-table re-cr-matrix">'+crMatrixHeadHtml()+'<tbody>'+body+'</tbody></table>'
}
function crLegendHtml(){
  return'<div class="re-cr-legend"><span class="re-cr-legend-title">'+esc(crText('legend'))+'</span>'+criticalityBands.map(function(band){
    return'<span class="re-cr-legend-item"><span class="re-criticality re-criticality-'+band.tier+' re-criticality-legend">'+band.label+'</span><span class="re-cr-legend-text">'+esc(crText('bands')[band.tier-1])+'</span></span>'
  }).join('')+'</div>'
}
// 広い画面では2つを横に並べ、狭い画面ではこのボタンで片方ずつ出す。
function crTabsHtml(){
  return'<div class="re-cr-tabs" role="group" aria-label="'+esc(crText('view'))+'">'+[['matrix','matrix'],['rank','ranking']].map(function(item){
    return'<button type="button" data-cr-pane="'+item[0]+'" aria-controls="re-cr-pane-'+item[0]+'" aria-pressed="'+(criticalState.pane===item[0])+'">'+esc(crText(item[1]))+'</button>'
  }).join('')+'</div>'
}
function crRankRowHtml(point,index){
  return'<button type="button" class="re-cr-rank" data-cr-key="'+esc(crKey(point))+'" aria-pressed="'+(criticalState.key===crKey(point))+'">'+
    '<span>'+(index+1)+'. '+crElement(point.element)+' '+esc(subLabel(point.node))+'</span>'+crBadge(point.score)+
    '<small>'+esc(crText('downstream')+' '+point.downstream+' · '+criticalText('share')+' '+point.level)+'</small>'+
    '<span class="re-cr-bar re-criticality re-criticality-'+criticalityTier(Math.round(point.score))+'"><i style="width:'+point.score+'%"></i></span></button>'
}
function crRankPaneHtml(ranked){
  var sorts=['score','down','share'].map(function(sort){
    return'<button type="button" data-cr-sort="'+sort+'" aria-pressed="'+(criticalState.sort===sort)+'">'+esc(crText(sort))+'</button>'
  }).join('');
  var more=esc(criticalState.expanded?crText('collapse'):crText('showAll')+(language==='en'?' ('+ranked.length+')':'（'+ranked.length+'）'));
  return'<section class="re-cr-pane re-cr-pane-rank'+(criticalState.expanded?' is-expanded':'')+'" id="re-cr-pane-rank" role="region" aria-label="'+esc(crText('ranking'))+'">'+
    '<h3>'+esc(crText('ranking'))+'</h3><div class="re-cr-sorts">'+sorts+'</div>'+
    '<div class="re-cr-ranking">'+ranked.map(crRankRowHtml).join('')+'</div>'+
    '<button type="button" class="re-cr-more" data-cr-expand aria-expanded="'+criticalState.expanded+'">'+more+'</button></section>'
}
function crMatrixPaneHtml(points){
  return'<section class="re-cr-pane re-cr-pane-matrix" id="re-cr-pane-matrix" role="region" aria-label="'+esc(crText('matrix'))+'">'+
    '<h3>'+esc(crText('matrix'))+'</h3>'+crLegendHtml()+'<div class="re-cr-scroll">'+crMatrixHtml(points)+'</div></section>'
}
function crBindEvents(host){
  host.querySelectorAll('[data-cr-key]').forEach(function(button){button.addEventListener('click',function(){crSelect(button.dataset.crKey)})});
  host.querySelectorAll('[data-cr-sort]').forEach(function(button){button.addEventListener('click',function(){criticalState.sort=button.dataset.crSort;refresh('criticality')})});
  host.querySelectorAll('[data-cr-pane]').forEach(function(button){button.addEventListener('click',function(){criticalState.pane=button.dataset.crPane;refresh('criticality')})});
  host.querySelectorAll('[data-cr-expand]').forEach(function(button){button.addEventListener('click',function(){criticalState.expanded=!criticalState.expanded;refresh('criticality')})});
}
function renderCriticality(){
  if(activeView!=='criticality')return;
  var host=root.querySelector('#re-view-criticality'),points=crPoints(),ranked=crSorted(criticalState.sort);
  if(!criticalState.key&&ranked.length)criticalState.key=crKey(ranked[0]);
  host.innerHTML='<h2>'+esc(crText('tab'))+'</h2><p>'+esc(criticalDefinition())+'</p>'+crTabsHtml()+
    '<div class="re-cr-panes" data-pane="'+criticalState.pane+'" data-expanded="'+criticalState.expanded+'">'+crMatrixPaneHtml(points)+crRankPaneHtml(ranked)+'</div>'+
    '<section id="re-cr-selection" tabindex="-1"></section>'+
    '<section><h3>'+esc(crText('companies'))+'</h3><div class="re-main"><div id="re-cr-companies" class="re-company-grid"></div><aside id="re-cr-dossier"></aside></div></section>'+
    '<section class="re-cr-explanation"><p>'+esc(criticalText('formula'))+'</p>'+shareCriteriaHtml()+'</section>';
  renderCriticalSelection();
  crBindEvents(host);
}
// 選んだマスの内訳。算式・下流の構成・所属企業の根拠に分ける
function crFactsHtml(point){
  var score=point.score===null?crText('unavailable'):'100 × √('+point.downstream+'/'+point.maximum+' × '+point.level+'/4)';
  return'<div class="re-cr-facts">'+
    '<div>'+esc(criticalText('score'))+'<strong>'+crBadge(point.score)+'</strong><small>'+esc(score)+'</small></div>'+
    '<div>'+esc(crText('downstream'))+'<strong>'+point.downstream+'</strong><small>'+esc(language==='en'?'companies / business units':'社')+'</small></div>'+
    '<div>'+esc(crText('maximum'))+'<strong>'+point.level+'</strong><small>'+esc(point.representative?companyText(point.representative,'name'):'—')+'</small></div></div>'
}
function crBreakdownHtml(point,sub){
  var down=new Set(point.downstreamNodes);
  return'<ul>'+stages.filter(function(stage){return stage.id>sub.stage}).map(function(stage){
    var members=point.downstreamCompanies.filter(function(c){return c.subs.some(function(id){return down.has(id)&&subStage(id)===stage.id&&companyHasElement(c,id,point.element)})});
    return members.length?'<li>STAGE '+esc(stage.code)+' '+esc(stageText(stage,'label'))+(language==='en'?': ':'：')+members.length+'</li>':''
  }).join('')+'</ul>'
}
function crEvidenceHtml(point){
  var members=point.companies.slice().sort(function(a,b){return shareEntry(b.id,point.node,point.element).level-shareEntry(a.id,point.node,point.element).level});
  var rows=members.map(function(company){
    var e=shareEntry(company.id,point.node,point.element);
    return'<tr><th>'+esc(companyText(company,'name'))+'</th><td>'+esc(criticalText('share')+' '+e.level+' · '+shareLevelText(e.level,'label'))+
      (e.product?'<p>'+esc(shareText(e,'product')+' / '+shareText(e,'share'))+'</p>':'')+
      (e.source?'<a target="_blank" rel="noopener noreferrer" href="'+esc(e.source)+'">'+esc(criticalText('source'))+'</a>':'')+
      (e.note?'<p>'+esc(shareText(e,'note'))+'</p>':'')+'</td></tr>'
  }).join('');
  return'<div class="re-cr-scroll"><table class="re-cr-table re-cr-evidence"><colgroup><col class="re-cr-evidence-company"><col></colgroup><thead><tr><th>'+esc(crText('company'))+'</th><th>'+esc(crText('original'))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
}
function crDownNodesHtml(point){
  return'<ul class="re-cr-downnodes">'+point.downstreamNodes.slice().sort(function(a,b){return subStage(a)-subStage(b)}).map(function(id){
    return'<li>'+esc(subLabel(id))+' ('+crMembers(id,point.element).length+')</li>'
  }).join('')+'</ul>'
}
function renderCriticalSelection(){
  var point=crSelected(),section=root.querySelector('#re-cr-selection');
  if(!point){section.textContent=crText('choose');return}
  var sub=allSubs.find(function(item){return item.id===point.node});
  section.innerHTML='<h3>'+esc(tagLabel(point.element)+' · '+subText(sub,'label'))+'</h3>'+crFactsHtml(point)+
    '<h4>'+esc(crText('breakdown'))+'</h4>'+crBreakdownHtml(point,sub)+
    '<h4>'+esc(crText('evidence'))+'</h4>'+crEvidenceHtml(point)+
    '<h4>'+esc(crText('nodes'))+'</h4>'+crDownNodesHtml(point);
  renderCriticalCompanies();
}
function renderCriticalCompanies(){
  var p=crSelected();if(!p)return;
  var box=root.querySelector('#re-cr-companies'),dossier=root.querySelector('#re-cr-dossier');
  var scope={node:p.node,elements:[p.element]};
  box.innerHTML=p.companies.map(function(c){return companyCardHtml(c,'data-cr-company',criticalState.company,scope)}).join('')||'<p>'+esc(crText('none'))+'</p>';
  dossier.innerHTML=dossierMarkup(p.companies.find(function(c){return c.id===criticalState.company}),scope);
  box.querySelectorAll('[data-cr-company]').forEach(function(button){button.addEventListener('click',function(){criticalState.company=button.dataset.crCompany;renderCriticalCompanies();var title=dossier.querySelector('.re-dossier-title');if(title){var rect=title.getBoundingClientRect();if(rect.top<0||rect.bottom>window.innerHeight||rect.right>window.innerWidth)dossier.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}})});
}
// 起動前にタブとパネルを設置し、既存のタブ配線へ参加させる。
root.querySelector('.re-view-tabs').insertAdjacentHTML('beforeend','<button class="re-view-tab" id="re-tab-criticality" data-view="criticality" type="button" role="tab" aria-selected="false" tabindex="-1" aria-controls="re-view-criticality"></button>');
root.querySelector('#re-view-element-flow').insertAdjacentHTML('afterend','<section class="re-view-panel" id="re-view-criticality" role="tabpanel" aria-labelledby="re-tab-criticality" hidden></section>');
