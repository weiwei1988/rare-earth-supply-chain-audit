// 「サプライチェーン全体像」タブの描画。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function renderFlow(){
  // 非表示のパネルは clientWidth が 0 になり、最小幅で固定されたまま残るため描画を保留する。
  if(activeView!=="overview"){flowLayoutStale=true;return}
  flowLayoutStale=false;
  var viewport=root.querySelector("#re-flow-viewport"),W=Math.max(1200,Math.floor(viewport.clientWidth));
  var sidePadding=Math.max(18,Math.min(60,Math.round(18+(W-1200)*.05)));
  var cardWidth=Math.max(176,Math.min(240,Math.round(176+(W-1200)*.082)));
  var columnStep=cardWidth+(W-sidePadding*2-cardWidth*6)/5;
  var minCardHeight=100,columnGap=8,columnBaseSpan=220,perStageCompany=16.6,perCardScaleCompany=.8,maxColumnSpan=1580;
  var xByStage={2:sidePadding+columnStep,3:sidePadding+columnStep*2,4:sidePadding+columnStep*3,5:sidePadding+columnStep*4,6:sidePadding+columnStep*5};
  var lane={Y:-6,DyTb:-2,Sm:2,Sc:6};
  var stageMeta={};stages.forEach(function(stage){stageMeta[stage.id]=stage});
  var columns=[
    {stage:2,items:commerceSubs.filter(function(item){return item.stage===2})},
    {stage:3,items:commerceSubs.filter(function(item){return item.stage===3})},
    {stage:4,items:parts},
    {stage:5,items:modules},
    {stage:6,items:systems}
  ];
  function orderNodes(column){
    var byId={};column.items.forEach(function(item){byId[item.id]=item});
    return (columnOrder[column.stage]||column.items.map(function(item){return item.id})).map(function(id){return byId[id]}).filter(Boolean)
  }
  columns.forEach(function(column){column.nodes=orderNodes(column)});
  function sizeColumn(column){
    var nodes=column.nodes,gapSpan=Math.max(0,nodes.length-1)*columnGap;
    var minimumSpan=nodes.length*minCardHeight+gapSpan;
    var stageCompanyCount=totalStageCount(stageMeta[column.stage].id);
    var targetSpan=Math.max(minimumSpan+stageCompanyCount*perCardScaleCompany,Math.min(maxColumnSpan,columnBaseSpan+stageCompanyCount*perStageCompany));
    var weights=nodes.map(function(item){return Math.max(1,totalSubCount(item.id))});
    var weightTotal=weights.reduce(function(sum,value){return sum+value},0);
    var extraHeight=targetSpan-gapSpan-nodes.length*minCardHeight;
    column.heights=nodes.map(function(item,index){return minCardHeight+extraHeight*weights[index]/weightTotal});
    column.span=column.heights.reduce(function(sum,height){return sum+height},0)+gapSpan
  }
  columns.forEach(sizeColumn);
  var maxSpan=Math.max.apply(null,columns.map(function(column){return column.span}));
  var columnTopClearance=72,H=Math.max(920,Math.ceil(maxSpan+columnTopClearance*2)),CY=H/2;
  var source={id:"stage01",x:sidePadding,w:cardWidth,y:CY,els:["Y","DyTb","Sm","Sc"]};
  function layoutColumn(column){
    var top=(H-column.span)/2;
    return column.nodes.map(function(item,index){var h=column.heights[index],position={item:item,h:h,y:top+h/2};top+=h+columnGap;return position})
  }
  var nodeMap={};
  columns.forEach(function(column){
    column.layout=layoutColumn(column);
    column.layout.forEach(function(position){
      var item=position.item;
      nodeMap[item.id]={id:item.id,x:xByStage[column.stage],w:cardWidth,y:position.y,h:position.h,els:activeEls(item),node:item};
    })
  });

  var svg='<svg class="re-flow-svg" viewBox="0 0 '+W+' '+H+'" role="img"><title>'+esc(tr("mapCanvas"))+'</title>';
  var edgeKeys=new Set();
  function connect(a,b,allowed,note){
    if(!a||!b)return;
    var common=Array.from(new Set(allowed||a.els)).filter(function(element){return a.els.indexOf(element)>=0&&b.els.indexOf(element)>=0});
    common.forEach(function(element){
      var edgeKey=a.id+"|"+b.id+"|"+element;
      if(edgeKeys.has(edgeKey))return;
      edgeKeys.add(edgeKey);
      var fromLabel=a.node?subText(a.node,"label"):stageText(stageMeta[1]||{id:1,label:"海外の資源・分離"},"label"),toLabel=b.node?subText(b.node,"label"):b.id;
      var title=fromLabel+" → "+toLabel+" / "+tagLabel(element)+(note?" — "+note:"");
      svg+=path(curve(a.x+a.w,a.y+lane[element],b.x,b.y+lane[element]),colors[element],selectedElements.indexOf(element)<0,{from:a.id,to:b.id,element:element,title:title})
    })
  }
  columns.filter(function(column){return column.stage===2}).forEach(function(column){
    column.nodes.forEach(function(item){connect(source,nodeMap[item.id],nodeMap[item.id].els)})
  });
  columns.filter(function(column){return column.stage>2}).forEach(function(column){
    column.nodes.forEach(function(item){
      (item.src||[]).forEach(function(sourceId){connect(nodeMap[sourceId],nodeMap[item.id],item.srcEls&&item.srcEls[sourceId],routeText(item,sourceId))})
    })
  });
  svg+='</svg>';

  function segmentedGradient(tags,angle,colorValue){
    if(tags.length===1)return colorValue(tags[0]);
    var stops=[];
    tags.forEach(function(tag,index){var start=index*100/tags.length,end=(index+1)*100/tags.length,color=colorValue(tag);stops.push(color+" "+start+"%",color+" "+end+"%")});
    return"linear-gradient("+angle+","+stops.join(",")+")"
  }
  function highlightVars(tags){
    if(!tags.length)return"";
    var band=segmentedGradient(tags,"90deg",function(tag){return colors[tag]});
    var background=segmentedGradient(tags,"135deg",function(tag){return"color-mix(in srgb,"+colors[tag]+" 15%,var(--panel))"});
    return";--re-highlight-primary:"+colors[tags[0]]+";--re-highlight-band:"+band+";--re-highlight-bg:"+background
  }
  function subCard(item,pos,stage){
    var dim=pos.els.length===0||!pos.els.some(function(element){return selectedElements.indexOf(element)>=0});
    var matchedEls=selectedElements.length===allElements.length?[]:pos.els.filter(function(element){return selectedElements.indexOf(element)>=0});
    var highlight=matchedEls.length>0;
    var routeTitle=(item.src||[]).map(function(sourceId){return(subLabel(sourceId)+" → "+subText(item,"label")+" / "+(item.srcEls[sourceId]||[]).map(tagLabel).join("・")+" — "+routeText(item,sourceId))}).join("\n");
    return'<button type="button" class="re-card re-sub-card'+(dim?" is-dim":"")+(highlight?" is-filter-match":"")+(matchedEls.length>1?" is-filter-multi":"")+'" data-type="sub" data-id="'+esc(item.id)+'" data-node-id="'+esc(item.id)+'"'+(routeTitle?' title="'+esc(routeTitle)+'"':'')+' aria-pressed="'+(selection.type==="sub"&&selection.id===item.id)+'" style="left:'+pos.x+'px;top:'+(pos.y-pos.h/2)+'px;width:'+pos.w+'px;height:'+pos.h+'px'+highlightVars(matchedEls)+'">'+
      '<div class="re-card-code">STAGE '+stage.code+' / '+esc(stageText(stage,"label"))+'</div><div class="re-card-title">'+esc(subText(item,"label"))+'</div><div class="re-card-description">'+esc(subText(item,"description"))+'</div><div class="re-card-tags">'+tagsHtml(pos.els)+'</div><span class="re-card-count">'+companyCount(totalSubCount(item.id))+'</span></button>'
  }

  var sourceStage=stageMeta[1]||{code:"01",label:"海外の資源・分離",short:"採掘・分離精製・輸出管理"};
  var cards='';
  function stageLabel(stage,x){return'<div class="re-column-label" style="left:'+x+'px;width:'+cardWidth+'px"><span class="re-column-label-code">STAGE '+stage.code+'</span><strong class="re-column-label-title">'+esc(stageText(stage,"label"))+'</strong><span class="re-column-label-count">'+companyCount(countStage(stage.id))+'</span></div>'}
  cards+=stageLabel(sourceStage,source.x);
  columns.forEach(function(column){cards+=stageLabel(stageMeta[column.stage],xByStage[column.stage])});
  cards+='<div class="re-stamp" style="left:18px;top:'+(CY-310)+'px;transform:rotate(-5deg)">2025.04 七元素規制</div>';
  cards+='<div class="re-stamp" style="left:40px;top:'+(CY-277)+'px;transform:rotate(3deg)">2026.01 対日強化</div>';
  cards+='<button type="button" class="re-card re-stage-card" data-type="stage" data-id="1" data-node-id="stage01" aria-pressed="'+(selection.type==="stage"&&Number(selection.id)===1)+'" style="left:'+source.x+'px;top:'+(CY-41)+'px;width:'+source.w+'px"><div class="re-card-code">SOURCE / STAGE '+sourceStage.code+'</div><div class="re-card-title">'+esc(stageText(sourceStage,"label"))+'</div><div class="re-card-sub">'+esc(stageText(sourceStage,"short"))+'</div></button>';
  columns.forEach(function(column){var stage=stageMeta[column.stage];column.nodes.forEach(function(item){cards+=subCard(item,nodeMap[item.id],stage)})});
  var canvas=root.querySelector("#re-flow-canvas");
  canvas.style.width=W+"px";
  canvas.style.height=H+"px";
  canvas.innerHTML=svg+cards;
  var edgeReader={from:function(edge){return edge.dataset.from},to:function(edge){return edge.dataset.to},element:function(edge){return edge.dataset.element}};
  function traceEdges(id){
    canvas.classList.toggle("is-tracing",!!id);
    var edges=Array.from(canvas.querySelectorAll(".re-edge"));
    var traced=id?traceLinkedEdges(edges,id,edgeReader,selectedElements):{linked:new Set(),downstream:new Set()};
    traced.downstream.forEach(function(node){
      edges.forEach(function(edge){if(!edge.dataset.element&&edge.dataset.from===node)traced.linked.add(edge)})
    });
    edges.forEach(function(edge){edge.classList.toggle("is-linked",!!id&&traced.linked.has(edge))})
  }
  traceEdges(traceNodeId);
  root.querySelectorAll("[data-type]").forEach(function(btn){btn.addEventListener("click",function(event){
    event.stopPropagation();
    var traceable=btn.dataset.type==="sub";
    traceNodeId=traceable?btn.dataset.id:null;
    selection={type:btn.dataset.type,id:btn.dataset.id};selectedId=null;refresh("overview");
    if(traceable)requestAnimationFrame(function(){
      var heading=root.querySelector("#re-list-title");
      if(heading)heading.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})
    })
  })})
}

function initResponsiveMap(){
  var viewport=root.querySelector("#re-flow-viewport"),lastWidth=Math.max(1200,Math.floor(viewport.clientWidth)),reflowTimer=null;
  function handleViewportResize(){
    if(activeView!=="overview")return;
    var nextWidth=Math.max(1200,Math.floor(viewport.clientWidth));
    if(nextWidth===lastWidth)return;
    clearTimeout(reflowTimer);
    reflowTimer=setTimeout(function(){
      var currentWidth=Math.max(1200,Math.floor(viewport.clientWidth));
      if(currentWidth!==lastWidth){lastWidth=currentWidth;refresh("overview")}
    },80)
  }
  if(window.ResizeObserver)new ResizeObserver(handleViewportResize).observe(viewport);
  else window.addEventListener("resize",handleViewportResize)
}

function renderRouteNote(){
  var holder=root.querySelector("#re-route-note"),rows=[];
  if(selection.type==="sub"){
    var selected=allSubs.find(function(item){return item.id===selection.id});
    if(selected){
      (selected.src||[]).forEach(function(source){rows.push({from:source,to:selected.id,elements:selected.srcEls[source],note:routeText(selected,source)})});
      allSubs.forEach(function(target){if((target.src||[]).indexOf(selected.id)>=0)rows.push({from:selected.id,to:target.id,elements:target.srcEls[selected.id],note:routeText(target,selected.id)})})
    }
  }
  if(!rows.length){
    holder.innerHTML='<div class="re-route-note-title">END-TO-END ROUTE TRACE</div>'+esc(tr("routeDefault"));
    return
  }
  holder.innerHTML='<div class="re-route-note-title">'+esc(tr("routeTitle",{count:rows.length}))+'</div>'+rows.map(function(row){return'<div class="re-route-row"><span class="re-route-pair">'+esc(subLabel(row.from))+' → '+esc(subLabel(row.to))+'</span><span class="re-route-elements">'+tagsHtml(row.elements)+'</span><span>'+esc(row.note)+'</span></div>'}).join("")
}

function renderList(){
  var dependency=selection.type==="stage"&&Number(selection.id)===1;
  root.querySelector(".re-company-search").hidden=dependency;
  root.querySelector(".re-main").classList.toggle("is-dependency",dependency);
  if(dependency){
    root.querySelector("#re-list-title").textContent=tr("stage")+" 1 — "+stageText(stages.find(function(stage){return stage.id===1}),"label");
    root.querySelector("#re-list-count").textContent=tr("publicStats");
    root.querySelector("#re-companies").innerHTML=dependencyDashboardHtml();
    return
  }
  var items=list();
  root.querySelector("#re-list-title").textContent=selectionLabel();
  root.querySelector("#re-list-count").textContent=companyUnitCount(items.length)+(root.querySelector("#re-company-search").value.trim()?" ("+tr("searchResult")+")":"");
  var box=root.querySelector("#re-companies");
  if(!items.length){box.innerHTML='<div class="re-empty">'+esc(tr("emptyCompanies"))+'</div>';return}
  box.innerHTML=items.map(function(company){
    return companyCardHtml(company,"data-company",selectedId)
  }).join("");
  root.querySelectorAll("[data-company]").forEach(function(btn){btn.addEventListener("click",function(){
    selectedId=btn.dataset.company;refresh("list");
    requestAnimationFrame(function(){
      var dossier=root.querySelector("#re-dossier");
      var heading=dossier&&dossier.querySelector(".re-dossier-title");
      if(!heading)return;
      var rect=heading.getBoundingClientRect();
      var inView=rect.top>=0&&rect.bottom<=window.innerHeight&&rect.left>=0&&rect.right<=window.innerWidth;
      if(!inView)dossier.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})
    })
  })});
}

function renderDossier(){
  var host=root.querySelector("#re-dossier");
  if(selection.type==="stage"&&Number(selection.id)===1){host.innerHTML="";return}
  host.innerHTML=dossierMarkup(data.find(function(company){return company.id===selectedId}))
}

