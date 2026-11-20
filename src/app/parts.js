// 両タブで共用する部品のマークアップ。企業カード、ドシエ、元素カード、中国依存ダッシュボード。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

// クリティカル度の段。境界と表示ラベルはここだけで定義し、元素別フロー・マップ・凡例が共有する。
var criticalityBands=[{tier:1,min:0,label:'0–29'},{tier:2,min:30,label:'30–49'},{tier:3,min:50,label:'50–69'},{tier:4,min:70,label:'70–100'}];
function criticalityTier(score){var found=criticalityBands[0];criticalityBands.forEach(function(band){if(score>=band.min)found=band});return found.tier}
// 水準の呼び方と判定基準は company-shares.json の levels が正本。日本語は label / rule、
// 英語・簡体中国語は i18n に持つ（言語ごとの文言を JS 側に二重で持たない）。
function shareLevel(level){return companyShares.levels.find(function(item){return item.level===level})}
function shareLevelText(level,key){var item=shareLevel(level);if(!item)return'';var t=item.i18n&&item.i18n[language];return t&&t[key]?t[key]:item[key]}
// 区切りのコロンは、英語だけ半角＋空白にする。
function colon(){return language==='en'?': ':'：'}
// 「水準4（世界首位級）」の形。括弧と語順は言語ごとに合わせる。
function shareLevelSummary(level){var label=shareLevelText(level,'label');return language==='en'?'Level '+level+' ('+label+')':(language==='zh-CN'?'等级':'水準')+level+'（'+label+'）'}
function criticalText(key){var labels={ja:{score:'クリティカル度',share:'シェア水準',formula:'クリティカル度＝100 × √［（下流の収録企業・事業単位数 ÷ 全元素・全採点対象の最大値）×（（シェア水準 ＋ 2）÷ 6）］。Stage 02〜05を採点し、同じ元素で起点から最終工程までつながる経路を集計します。下流企業は重複排除し、自カテゴリーを含めません。シェア水準は所属企業の最高値、未確認は水準1。市場シェアの実数や中国依存度・在庫・代替可能性を直接示す指標ではありません。',source:'出典（原文）'},en:{score:'Criticality',share:'Share level',formula:'Criticality = 100 × √[(downstream listed companies/business units ÷ maximum across all elements and scored categories) × ((share level + 2) ÷ 6)]. Stages 02–05 are scored on same-element paths from origin to final systems. Downstream companies are deduplicated; the current category is excluded. The highest member share level is used; unverified = level 1. This relative index does not directly measure actual market share, China dependency, inventories or substitutability.',source:'Source (original language)'},'zh-CN':{score:'关键度',share:'份额等级',formula:'关键度＝100 × √［（下游收录企业及业务单位数 ÷ 全元素全部评分分类的最大值）×（（份额等级 ＋ 2）÷ 6）］。评分范围为Stage 02～05，仅统计同一元素从起点连至最终系统的路径。下游企业去重，不含本分类；采用成员企业最高份额等级，未确认为等级1。本相对指标不直接衡量实际市场份额、中国依赖、库存或可替代性。',source:'来源（原文）'}};return labels[language][key]}
function criticalDefinition(){return language==='en'?'Criticality: an indicator of how widely a shutdown at a process could affect the downstream supply chain.':language==='zh-CN'?'关键度：衡量某一工序停运后，会对供应链下游产生多大范围影响的指标。':'クリティカル度：その工程が止まるとサプライチェーンの下流にどれだけ広範な影響が出るのか？を表す指標'}
function shareCriteriaHtml(){
  var title=language==='en'?'Share-level assessment criteria':language==='zh-CN'?'份额等级判定标准':'シェア水準の判定基準';
  var note=language==='en'?'Numerical market shares take precedence; leadership or sole-supplier claims are used only when figures are unavailable. Technical performance alone is not market share. Assessments apply to the specified product, category and element; missing assessments default to level 1. At overlapping boundaries, the higher level takes precedence.':language==='zh-CN'?'优先采用数值份额，仅在缺少数值时使用第一或唯一供应商等表述；技术性能不等于市场份额。判定限定于对应产品、分类及元素，缺失判定按等级1处理。边界重叠时优先采用较高等级。':'数値のシェアを優先し、「首位」「唯一」等の表現は数値がない場合のみ用います。性能・技術面の記載はシェアとみなしません。判定は対象製品・サブカテゴリ・元素に限定し、判定がない場合は水準1とします。境界が重なる場合は上位水準を優先します。';
  var items=companyShares.levels.slice().sort(function(a,b){return b.level-a.level});
  return '<section class="re-share-criteria"><p class="re-share-criteria-title">'+esc(title)+'</p><dl class="re-share-legend">'+items.map(function(item){return'<dt><span class="re-cr-share-badge re-share-'+item.level+'">'+esc(criticalText('share')+' '+item.level+colon()+shareLevelText(item.level,'label'))+'</span></dt><dd>'+esc(shareLevelText(item.level,'rule'))+'</dd>'}).join('')+'</dl><p class="re-share-criteria-note">'+esc(note)+'</p></section>';
}
// シェア判定の文面は日本語が正本。en / zh-CN は company-shares.json の i18n に持ち、無ければ日本語に戻す。
function shareText(entry,key){if(!entry)return'';var t=entry.i18n&&entry.i18n[language];return t&&t[key]?t[key]:(entry[key]||'')}
var mapReturnPositions={};
function rememberMapPosition(){mapReturnPositions[activeView]={top:window.scrollY,left:window.scrollX,rankTop:root.querySelector('.re-cr-ranking')?root.querySelector('.re-cr-ranking').scrollTop:0}}
function mapReturnLabel(){return language==='en'?'Back to overview':language==='zh-CN'?'返回全貌':'全体像に戻る'}
function mapReturnButton(){return'<button type="button" class="re-return-map" data-return-map>'+esc(mapReturnLabel())+'</button>'}
function returnToMap(){var position=mapReturnPositions[activeView];if(position){var rank=root.querySelector('.re-cr-ranking');if(rank)rank.scrollTop=position.rankTop;window.scrollTo({top:position.top,left:position.left,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}else{var target=root.querySelector(activeView==='criticality'?'.re-cr-panes':activeView==='element-flow'?'#re-element-flow-frame':'#re-flow-viewport');if(target)target.scrollIntoView({behavior:'smooth',block:'start'})}}
function shareRows(company,scope){
  var node=scope&&scope.node?scope.node:null;
  var els=scope&&scope.elements&&scope.elements.length?scope.elements:allElements;
  return company.subs.filter(function(id){return subStage(id)<6&&(!node||id===node)}).flatMap(function(id){return els.filter(function(el){return companyHasElement(company,id,el)}).map(function(el){return{entry:shareEntry(company.id,id,el),node:id,element:el}})});
}
function shareBadgesHtml(company,scope){var seen=new Set();return shareRows(company,scope).filter(function(row){if(seen.has(row.entry.level))return false;seen.add(row.entry.level);return true}).map(function(row){var e=row.entry;return'<span class="re-tag re-share-level re-share-'+e.level+'">'+esc(criticalText('share')+' '+e.level+colon()+shareLevelText(e.level,'label'))+'</span>'}).join('')}
function shareEvidenceHtml(company,scope){return shareRows(company,scope).map(function(row){var e=row.entry;return'<div class="re-dossier-row"><dt>'+esc(subLabel(row.node)+' / '+tagLabel(row.element))+'</dt><dd>'+esc(criticalText('share')+' '+e.level+' · '+shareLevelText(e.level,'label'))+(e.product?'<p>'+esc(shareText(e,'product')+colon()+shareText(e,'share'))+'</p>':'')+(e.source?'<a href="'+esc(e.source)+'" target="_blank" rel="noopener noreferrer">'+esc(criticalText('source'))+'</a>':'')+(e.note?'<p>'+esc(shareText(e,'note'))+'</p>':'')+'</dd></div>'}).join('')}
function companyCardHtml(company,attribute,activeId,scope){
  var tagHtml=company.tags.map(function(tag){return'<span class="re-tag" style="color:'+colors[tag]+';border-color:'+colors[tag]+'">'+tagLabel(tag)+'</span>'}).join("");
  if(company.atlaProcurement)tagHtml+='<span class="re-tag re-atla-badge">'+esc(tr("atla"))+'</span>';
  if(attribute!=='data-company')tagHtml+=shareBadgesHtml(company,scope);
  var summary=companySummary(company);
  return'<button type="button" class="re-company" '+attribute+'="'+esc(company.id)+'" aria-pressed="'+(activeId===company.id)+'"><div class="re-company-name">'+esc(companyText(company,"name"))+'</div><div class="re-tags">'+tagHtml+'</div><div class="re-company-pos" title="'+esc(summary.full)+'">'+esc(summary.short)+'</div></button>'
}
function tagsHtml(tags){return tags.map(function(t){return'<span style="color:'+colors[t]+'">'+tagLabel(t)+'</span>'}).join("")}
function renderElementControlCards(selector){
  root.querySelectorAll(selector).forEach(function(button){
    var element=button.dataset.flowElement||button.dataset.element,meta=flowElementMeta[language][element],dep=dependencyRows.find(function(row){return row.tag===element}),china=dep?dep.china:0;
    button.style.setProperty("--re-dependency",Math.max(0,Math.min(100,china))+"%");
    button.setAttribute("aria-label",meta.symbol+" "+meta.name+". "+meta.use+". "+meta.dependency+" "+china+" "+tr("percent"));
    button.innerHTML='<span class="re-flow-option-symbol"><span class="re-flow-option-dot" aria-hidden="true"></span>'+esc(meta.symbol)+'</span><span class="re-flow-option-name">'+esc(meta.name)+'</span><span class="re-flow-option-use">'+esc(meta.use)+'</span><span class="re-flow-option-dependency"><strong>'+china+'%</strong><span>'+esc(meta.dependency)+'</span></span><span class="re-flow-option-bar" aria-hidden="true"><span></span></span>'
  })
}
function renderFlowElementControls(){renderElementControlCards("[data-flow-element]")}
function renderOverviewElementControls(){renderElementControlCards('[data-element]:not([data-element="all"])')}
function dossierMarkup(company,scope){
  if(!company)return'<div class="re-empty">'+esc(tr("emptyDossier"))+'</div>';
  var fields=tr("fields"),subLabels=company.subs.map(function(id){var sub=allSubs.find(function(item){return item.id===id});return sub?subText(sub,"label"):id}).join(" / ");
  var rows=[
    [fields[0],companyText(company,"own")],[fields[1],companyText(company,"rev")],[fields[2],companyText(company,"prod")],[fields[3],marketPosition(companyText(company,"pos"))],
    [fields[4],companyText(company,"def")],[fields[5],company.atlaProcurement?tr("atla"):""],[fields[6],company.atla?atlaDecisionText(company.atla.decision):""],[fields[7],company.atla?company.atla.rareEarthFlags:""],[fields[8],companyText(company,"chn")],[fields[9],companyText(company,"bom")],[fields[10],companyText(company,"gap")],[fields[11],company.stages.map(function(stage){return"Stage 0"+stage}).join(" / ")],
    [fields[12],subLabels],[fields[13],companyText(company,"src")],[fields[14],companyText(company,"note")]
  ].filter(function(row){return row[1]});
  return'<div class="re-dossier"><div class="re-dossier-title"><strong>'+esc(companyText(company,"name"))+'</strong></div><dl>'+rows.map(function(row){
    var display=(row[0]===fields[2]||row[0]===fields[4])?summarizeItems(row[1],5):{short:row[1],full:row[1],hidden:0};
    var more=display.hidden?'<details class="re-more"><summary>'+esc(tr("more",{count:display.hidden+5}))+'</summary><div>'+esc(display.full)+'</div></details>':'';
    return'<div class="re-dossier-row"><dt>'+esc(row[0])+'</dt><dd>'+esc(display.short)+more+'</dd></div>'
  }).join("")+shareEvidenceHtml(company,scope)+'</dl></div>'
}
function dependencyDashboardHtml(elements){
  var shown=elements||selectedElements;
  var rows=dependencyRows.filter(function(d){return shown.indexOf(d.tag)>=0});
  function dependencyColor(token){return depColors[token]||depColors.line}
  function gradient(segments){var at=0;return"conic-gradient("+segments.map(function(s){var from=at;at+=s.value;return dependencyColor(s.color)+" "+from+"% "+at+"%"}).join(",")+")"}
  return'<section class="re-dep-dashboard" aria-label="'+esc(tr("china"))+'">'+
    '<div class="re-dep-intro">'+esc(tr("dependencyIntro"))+'</div>'+
    '<div class="re-dep-grid">'+rows.map(function(d){return '<article class="re-dep-card"><div class="re-dep-head"><div class="re-dep-element"><i style="background:'+colors[d.tag]+'"></i>'+esc(d.label)+'</div><span class="re-dep-badge">'+esc(dependencyText(d,"quality"))+'</span></div>'+
      '<div class="re-dep-metric">'+esc(dependencyText(d,"metric"))+'</div>'+
      '<div class="re-dep-pie" role="img" aria-label="'+esc(d.label+' '+tr("chinaRatio",{value:d.china}))+'" style="background:'+gradient(d.segments)+'"><div class="re-dep-pie-value"><strong>'+d.china+'%</strong><span>'+esc(tr("china"))+'</span></div></div>'+
      '<div class="re-dep-legend">'+d.segments.map(function(s,index){return'<div class="re-dep-legend-item"><i style="background:'+dependencyColor(s.color)+'"></i><span>'+esc(dependencySegmentName(d,index))+'</span><strong>'+s.value+'%</strong></div>'}).join("")+'</div>'+
      '<div class="re-dep-evidence">'+esc(dependencyText(d,"evidence"))+'<br><a class="re-dep-source" href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">'+esc(dependencyText(d,"source"))+'</a></div></article>'
    }).join("")+'</div>'+
    '<div class="re-dep-note">'+esc(tr("dependencyNote"))+'</div>'+
  '</section>'
}


// 接続説明は両画面で共用。全体像は企業未登録の分類も含む監査済み接続を表示する。
function routeRows(id,graph){
  graph=graph||buildSupplyGraph(allSubs,data);
  return supplyGraphRoutes(graph,id).map(function(edge){
    return{from:edge.from,to:edge.to,elements:edge.elements,assembly:edge.assembly,note:routeText(graph.byId.get(edge.to),edge.from)}
  })
}
function routeRowsHtml(rows){
  return'<div class="re-route-note-title">'+esc(tr("routeTitle",{count:rows.length}))+'</div>'+rows.map(function(row){return'<div class="re-route-row"><span class="re-route-pair">'+esc(subLabel(row.from))+' → '+esc(subLabel(row.to))+'</span><span class="re-route-elements">'+tagsHtml(row.elements)+'</span><span>'+(row.assembly?'<span class="re-route-chip">'+esc(tr("routeAssembly"))+'</span>':'')+esc(row.note)+'</span></div>'}).join("")
}
