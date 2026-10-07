// 両タブで共用する部品のマークアップ。企業カード、ドシエ、元素カード、中国依存ダッシュボード。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function companyCardHtml(company,attribute,activeId){
  var tagHtml=company.tags.map(function(tag){return'<span class="re-tag" style="color:'+colors[tag]+';border-color:'+colors[tag]+'">'+tagLabel(tag)+'</span>'}).join("");
  if(company.atlaProcurement)tagHtml+='<span class="re-tag re-atla-badge">'+esc(tr("atla"))+'</span>';
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
function dossierMarkup(company){
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
  }).join("")+'</dl></div>'
}
function dependencyDashboardHtml(){
  var rows=dependencyRows.filter(function(d){return selectedElements.indexOf(d.tag)>=0});
  function dependencyColor(token){return depColors[token]||depColors.line}
  function gradient(segments){var at=0;return"conic-gradient("+segments.map(function(s){var from=at;at+=s.value;return dependencyColor(s.color)+" "+from+"% "+at+"%"}).join(",")+")"}
  return'<section class="re-dep-dashboard" aria-label="'+esc(tr("china"))+'">'+
    '<div class="re-dep-intro">'+esc(tr("dependencyIntro"))+'</div>'+
    '<div class="re-dep-grid">'+rows.map(function(d){return '<article class="re-dep-card"><div class="re-dep-head"><div class="re-dep-element"><i style="background:'+colors[d.tag]+'"></i>'+esc(d.label)+'</div><span class="re-dep-badge">'+esc(d.quality)+'</span></div>'+
      '<div class="re-dep-metric">'+esc(d.metric)+'</div>'+
      '<div class="re-dep-pie" role="img" aria-label="'+esc(d.label+' '+tr("chinaRatio",{value:d.china}))+'" style="background:'+gradient(d.segments)+'"><div class="re-dep-pie-value"><strong>'+d.china+'%</strong><span>'+esc(tr("china"))+'</span></div></div>'+
      '<div class="re-dep-legend">'+d.segments.map(function(s){return'<div class="re-dep-legend-item"><i style="background:'+dependencyColor(s.color)+'"></i><span>'+esc(s.name)+'</span><strong>'+s.value+'%</strong></div>'}).join("")+'</div>'+
      '<div class="re-dep-evidence">'+esc(d.evidence)+'<br><a class="re-dep-source" href="'+esc(d.url)+'" target="_blank" rel="noopener noreferrer">'+esc(d.source)+'</a></div></article>'
    }).join("")+'</div>'+
    '<div class="re-dep-note">'+esc(tr("dependencyNote"))+'</div>'+
  '</section>'
}

