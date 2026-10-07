// 「元素別フロー」タブの描画。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function renderElementFlow(){
  if(activeView!=="element-flow")return;
  renderFlowElementControls();
  var frame=root.querySelector("#re-element-flow-frame"),svg=root.querySelector("#re-element-flow-canvas");
  var W=Math.max(language==="en"?1320:1200,Math.floor(frame.clientWidth||1200)),left=34,right=language==="en"?270:245,top=language==="en"?136:112,bottom=54,nodeGap=language==="en"?34:32,companyScale=5;
  var stageMap=Object.fromEntries(stages.map(function(stage){return[stage.id,stage]}));
  var order={};Object.keys(columnOrder).forEach(function(stage){columnOrder[stage].forEach(function(id,index){order[id]=index})});
  var byStage={};
  for(var stage=2;stage<=6;stage++)byStage[stage]=allSubs.filter(function(item){return item.stage===stage&&item.els.indexOf(flowElement)>=0&&flowCompanyCount(item.id,flowElement)>0}).sort(function(a,b){return flowSortIndex(flowElement,stage,a.id,order)-flowSortIndex(flowElement,stage,b.id,order)});
  var columnSpans=Object.keys(byStage).map(function(stage){
    var items=byStage[stage];
    return items.reduce(function(sum,item){return sum+Math.max(8,flowCompanyCount(item.id,flowElement)*companyScale)},0)+Math.max(0,items.length-1)*nodeGap
  });
  var H=Math.max(760,top+bottom+Math.max.apply(null,[1].concat(columnSpans)));
  var step=(W-left-right)/5,positions={},nodes=[];
  function positionColumn(items,stage){
    var heights=items.map(function(item){return Math.max(8,flowCompanyCount(item.id,flowElement)*companyScale)});
    var span=heights.reduce(function(sum,height){return sum+height},0)+Math.max(0,items.length-1)*nodeGap;
    var cursor=top+(H-top-bottom-span)/2;
    items.forEach(function(item,index){
      var count=flowCompanyCount(item.id,flowElement),height=heights[index];
      var pos={id:item.id,item:item,stage:stage,count:count,x:left+(stage-1)*step,y:cursor+height/2,h:height,incoming:[],outgoing:[]};
      cursor+=height+nodeGap;positions[item.id]=pos;nodes.push(pos)
    })
  }
  Object.keys(byStage).forEach(function(stage){positionColumn(byStage[stage],Number(stage))});
  var dep=dependencyRows.find(function(row){return row.tag===flowElement});
  var source={id:"flow-source",stage:1,count:flowStageCount(2,flowElement),x:left,y:H/2,h:Math.max(8,flowStageCount(2,flowElement)*companyScale),incoming:[],outgoing:[]};
  positions[source.id]=source;
  var edges=[];
  byStage[2].forEach(function(target){edges.push({from:source.id,to:target.id})});
  nodes.forEach(function(target){
    if(target.stage<=2)return;
    var incoming=(target.item.src||[]).filter(function(sourceId){return positions[sourceId]&&(target.item.srcEls[sourceId]||[]).indexOf(flowElement)>=0});
    incoming.forEach(function(sourceId){edges.push({from:sourceId,to:target.id})})
  });
  edges.forEach(function(edge){
    edge.a=positions[edge.from];edge.b=positions[edge.to];edge.a.outgoing.push(edge);edge.b.incoming.push(edge)
  });
  var flowEdgeReader={from:function(edge){return edge.from},to:function(edge){return edge.to}};
  var linkedEdges=flowSelectionId?traceLinkedEdges(edges,flowSelectionId,flowEdgeReader,null).linked:new Set();
  [source].concat(nodes).forEach(function(node){
    node.outgoing.sort(function(a,b){return a.b.y-b.b.y});
    node.incoming.sort(function(a,b){return a.a.y-b.a.y});
    var outgoingWeight=node.outgoing.reduce(function(sum,edge){return sum+edge.b.count},0),outCursor=node.y-node.h/2;
    node.outgoing.forEach(function(edge){edge.fromH=node.h*edge.b.count/Math.max(1,outgoingWeight);edge.fromY=outCursor+edge.fromH/2;outCursor+=edge.fromH});
    var incomingWeight=node.incoming.reduce(function(sum,edge){return sum+edge.a.count},0),inCursor=node.y-node.h/2;
    node.incoming.forEach(function(edge){edge.toH=node.h*edge.a.count/Math.max(1,incomingWeight);edge.toY=inCursor+edge.toH/2;inCursor+=edge.toH})
  });
  var flowColor=colors[flowElement];
  function ribbon(edge){
    var x1=edge.a.x+8,x2=edge.b.x,mid=x1+(x2-x1)*.5;
    var aTop=edge.fromY-edge.fromH/2,aBottom=edge.fromY+edge.fromH/2,bTop=edge.toY-edge.toH/2,bBottom=edge.toY+edge.toH/2;
    return"M"+x1+","+aTop+" C"+mid+","+aTop+" "+mid+","+bTop+" "+x2+","+bTop+" L"+x2+","+bBottom+" C"+mid+","+bBottom+" "+mid+","+aBottom+" "+x1+","+aBottom+" Z"
  }
  function nodeMarkup(node){
    var label=subText(node.item,"label"),meta=companyCount(node.count),countWidth=20+Array.from(meta).length*6.5,labelLines=flowLabelLines(label,language==="en"?30:16),lineHeight=language==="en"?11:12,labelY=node.y-6-(labelLines.length-1)*lineHeight;
    return'<g class="re-ef-node'+(flowSelectionId===node.id?' is-selected':'')+'" data-flow-node="'+esc(node.id)+'" tabindex="0" role="button" aria-label="'+esc(label+"、"+meta)+'">'+
      '<rect class="re-ef-node-bar" x="'+node.x+'" y="'+(node.y-node.h/2)+'" width="8" height="'+node.h+'" fill="'+flowColor+'"></rect>'+
      '<text class="re-ef-node-title">'+labelLines.map(function(line,index){return'<tspan x="'+(node.x+15)+'" y="'+(labelY+index*lineHeight)+'">'+esc(line)+'</tspan>'}).join("")+'</text>'+
      '<rect class="re-ef-node-count-bg" x="'+(node.x+14)+'" y="'+(node.y+2)+'" width="'+countWidth+'" height="18" rx="9" fill="'+flowColor+'" stroke="'+flowColor+'"></rect>'+
      '<text class="re-ef-node-count" x="'+(node.x+21)+'" y="'+(node.y+14.5)+'">'+meta+'</text></g>'
  }
  var title=tr("flowTitle",{element:tagLabel(flowElement)});
  root.querySelector("#re-element-flow-title").textContent=title;
  root.querySelectorAll("[data-flow-element]").forEach(function(button){button.setAttribute("aria-pressed",String(button.dataset.flowElement===flowElement))});
  root.querySelector(".re-element-flow-swatch").style.setProperty("--flow-color",flowColor);
  var markup='<title>'+esc(tr("flowAria",{element:tagLabel(flowElement)}))+'</title>';
  stages.forEach(function(stage){
    var x=left+(stage.id-1)*step,stageCount=flowStageCount(stage.id,flowElement),countLabel=companyCount(stageCount),countWidth=26+Array.from(countLabel).length*7.2,labelLines=flowLabelLines(stageText(stage,"label"),language==="en"?22:18),countY=56+(labelLines.length-1)*13,shortY=countY+38,shortLines=flowLabelLines(stageText(stage,"short"),language==="en"?34:28);
    markup+='<text class="re-ef-stage-code" x="'+x+'" y="28">STAGE '+stage.code+'</text><text class="re-ef-stage-label">'+labelLines.map(function(line,index){return'<tspan x="'+x+'" y="'+(48+index*13)+'">'+esc(line)+'</tspan>'}).join("")+'</text><rect class="re-ef-stage-count-bg" x="'+x+'" y="'+countY+'" width="'+countWidth+'" height="21" rx="10.5" fill="'+flowColor+'" stroke="'+flowColor+'"></rect><text class="re-ef-stage-count" x="'+(x+9)+'" y="'+(countY+14.5)+'">'+countLabel+'</text><text class="re-ef-stage-short">'+shortLines.map(function(line,index){return'<tspan x="'+x+'" y="'+(shortY+index*11)+'">'+esc(line)+'</tspan>'}).join("")+'</text>'
  });
  markup+='<g aria-hidden="true">'+edges.map(function(edge){
    var from=edge.from===source.id?stageText(stageMap[1],"label"):subText(edge.a.item,"label"),to=subText(edge.b.item,"label");
    return'<path class="re-ef-link'+(linkedEdges.has(edge)?' is-linked':'')+'" d="'+ribbon(edge)+'" fill="'+flowColor+'"><title>'+esc(from+" "+companyCount(edge.a.count)+" → "+to+" "+companyCount(edge.b.count)+" / "+tagLabel(flowElement))+'</title></path>'
  }).join("")+'</g>';
  var chinaText=dep?tr("chinaRatio",{value:dep.china}):tr("chinaReference");
  markup+='<g class="re-ef-source"><rect class="re-ef-node-bar" x="'+source.x+'" y="'+(source.y-source.h/2)+'" width="8" height="'+source.h+'" fill="'+flowColor+'"></rect><text class="re-ef-source-title" x="'+(source.x+15)+'" y="'+(source.y-4)+'">'+esc(tr("stageSource"))+'</text><text class="re-ef-node-meta" x="'+(source.x+15)+'" y="'+(source.y+13)+'">'+esc(chinaText)+'</text></g>';
  markup+=nodes.map(nodeMarkup).join("");
  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  svg.setAttribute("width",W);svg.setAttribute("height",H);svg.style.height=H+"px";svg.classList.toggle("is-tracing",!!flowSelectionId);svg.classList.toggle("is-english",language==="en");svg.innerHTML=markup;
  root.querySelector("#re-element-flow-stats").textContent=tagLabel(flowElement)+" · "+metricCount(nodes.length,"category")+" · "+metricCount(edges.length,"connection")+" · "+companyUnitCount(data.filter(function(company){return company.tags.indexOf(flowElement)>=0}).length);
  function openNode(id){
    flowSelectionId=id;flowSelectedId=null;refresh("flow");
    requestAnimationFrame(function(){var heading=root.querySelector("#re-flow-list-title");if(heading)heading.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})})
  }
  svg.querySelectorAll("[data-flow-node]").forEach(function(node){
    node.addEventListener("click",function(){openNode(node.dataset.flowNode)});
    node.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();openNode(node.dataset.flowNode)}})
  })
}
function renderFlowCompanyResults(){
  var section=root.querySelector("#re-element-flow-results");
  if(!flowSelectionId){section.hidden=true;return}
  var sub=allSubs.find(function(item){return item.id===flowSelectionId});
  var items=data.filter(function(company){return company.tags.indexOf(flowElement)>=0&&company.subs.indexOf(flowSelectionId)>=0});
  section.hidden=false;
  root.querySelector("#re-flow-list-title").textContent=tagLabel(flowElement)+" — "+(sub?subText(sub,"label"):flowSelectionId);
  root.querySelector("#re-flow-list-count").textContent=companyUnitCount(items.length);
  var box=root.querySelector("#re-flow-companies");
  box.innerHTML=items.length?items.map(function(company){
    return companyCardHtml(company,"data-flow-company",flowSelectedId)
  }).join(""):'<div class="re-empty">'+esc(tr("emptyFlowCompanies"))+'</div>';
  var dossier=root.querySelector("#re-flow-dossier");
  dossier.innerHTML=dossierMarkup(data.find(function(company){return company.id===flowSelectedId}));
  box.querySelectorAll("[data-flow-company]").forEach(function(button){button.addEventListener("click",function(){
    flowSelectedId=button.dataset.flowCompany;renderFlowCompanyResults();
    requestAnimationFrame(function(){
      var heading=dossier.querySelector(".re-dossier-title");if(!heading)return;
      var rect=heading.getBoundingClientRect(),inView=rect.top>=0&&rect.bottom<=window.innerHeight&&rect.left>=0&&rect.right<=window.innerWidth;
      if(!inView)dossier.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})
    })
  })})
}
