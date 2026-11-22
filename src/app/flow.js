// 「元素別フロー」タブの描画。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function renderElementFlow(){
  if(activeView!=="element-flow")return;
  renderFlowElementControls();
  var frame=root.querySelector("#re-element-flow-frame"),svg=root.querySelector("#re-element-flow-canvas");
  var W=Math.max(language==="en"?1320:1200,Math.floor(frame.clientWidth||1200)),left=34,right=language==="en"?270:245,bottom=54,nodeGap=language==="en"?34:32,companyScale=5;
  var stageMap=Object.fromEntries(stages.map(function(stage){return[stage.id,stage]}));
  var order={};Object.keys(columnOrder).forEach(function(stage){columnOrder[stage].forEach(function(id,index){order[id]=index})});
  var graph=elementSupplyGraph(flowElement),byStage={};
  for(var stage=2;stage<=6;stage++)byStage[stage]=graph.nodes.filter(function(item){return item.stage===stage}).sort(function(a,b){return flowSortIndex(flowElement,stage,a.id,order)-flowSortIndex(flowElement,stage,b.id,order)});
  var step=(W-left-right)/5,positions={},nodes=[];
  // ラベルは列の幅に収める。文字数の上限を列幅から決め、長い分類名が次の工程に重ならないようにする
  var labelEm=language==="en"?5.9:11.5,labelLimit=Math.max(language==="en"?16:8,Math.floor((step-25)/labelEm));
  var lineHeight=language==="en"?11:12;
  function labelLinesOf(item){return flowLabelLines(subText(item,"label"),labelLimit)}
  // ラベルは工程の棒の上に伸びるため、折り返した行数のぶんだけ縦の間隔を広げて、上の工程のラベルと重ならないようにする
  function gapBefore(item){return nodeGap+(labelLinesOf(item).length-1)*lineHeight}
  // 工程見出しの小さい説明も列の幅に収める
  var shortEm=language==="en"?5.2:9.5,shortLimit=Math.max(language==="en"?18:10,Math.floor((step-12)/shortEm));
  // 工程見出しは「サプライチェーン全体像」と同じ形：左に STAGE 番号と工程名、右に社数（工程名の1行目の横）。その下に小さい説明を置く。
  // 工程名は、社数の札を除いた幅で折り返す。STAGE 01 は国内企業がいないため社数を出さない
  var headWidth=step-20,stageTitleSize=language==="en"?13:14.5,stageTitleLine=language==="en"?16:18;
  function stageCountLabel(stage){return stage.id===1?"":companyCount(flowStageCount(stage.id,flowElement))}
  function stageCountWidth(stage){var label=stageCountLabel(stage);return label?18+Array.from(label).length*7.2:0}
  function stageLabelLinesOf(stage){var room=headWidth-(stageCountWidth(stage)?stageCountWidth(stage)+9:0);return flowLabelLines(stageText(stage,"label"),Math.max(4,Math.floor(room/(language==="en"?stageTitleSize*.56:stageTitleSize*.92))))}
  function stageShortLinesOf(stage){return flowLabelLines(stageText(stage,"short"),shortLimit)}
  function stageShortY(stage){return 42+(stageLabelLinesOf(stage).length-1)*stageTitleLine+17}
  // 図は、見出しの下端と、工程の棒の上に伸びるラベルの高さを足した位置から始める
  var headerBottom=Math.max.apply(null,stages.map(function(stage){return stageShortY(stage)+(stageShortLinesOf(stage).length-1)*11}));
  var topLabelLines=Math.max.apply(null,[1].concat(Object.keys(byStage).map(function(stage){
    return Math.max.apply(null,[1].concat(byStage[stage].map(function(item){return labelLinesOf(item).length})))
  })));
  var top=Math.max(language==="en"?136:112,Math.round(headerBottom+10+topLabelLines*lineHeight));
  function columnSpan(items){
    return items.reduce(function(sum,item,index){
      return sum+Math.max(8,graph.members.get(item.id).length*companyScale)+(index?gapBefore(item):0)
    },0)
  }
  var columnSpans=Object.keys(byStage).map(function(stage){return columnSpan(byStage[stage])});
  var H=Math.max(760,top+bottom+Math.max.apply(null,[1].concat(columnSpans)));
  function positionColumn(items,stage){
    var span=columnSpan(items);
    var cursor=top+(H-top-bottom-span)/2;
    items.forEach(function(item,index){
      if(index)cursor+=gapBefore(item);
      var count=graph.members.get(item.id).length,height=Math.max(8,count*companyScale);
      var pos={id:item.id,item:item,stage:stage,count:count,x:left+(stage-1)*step,y:cursor+height/2,h:height,incoming:[],outgoing:[]};
      cursor+=height;positions[item.id]=pos;nodes.push(pos)
    })
  }
  Object.keys(byStage).forEach(function(stage){positionColumn(byStage[stage],Number(stage))});
  var dep=dependencyRows.find(function(row){return row.tag===flowElement});
  // 起点は各工程の列と同じ中心線にそろえる（H/2 だと見出しのぶんだけ上にずれる）
  var axis=top+(H-top-bottom)/2;
  var source={id:FLOW_SOURCE_ID,stage:1,count:flowStageCount(2,flowElement),x:left,y:axis,h:Math.max(8,flowStageCount(2,flowElement)*companyScale),incoming:[],outgoing:[]};
  positions[source.id]=source;
  var edges=[];
  byStage[2].forEach(function(target){edges.push({from:source.id,to:target.id})});
  // 描画座標や帯の幅は共通モデルを変更せず、描画用のコピーだけに追加する。
  graph.edges.forEach(function(edge){edges.push({from:edge.from,to:edge.to,assembly:edge.assembly})});
  // 各工程の棒の縁に帯の口を積む。右の縁は下流へ出る帯、左の縁は上流から入る帯。
  // 同じ列の中の組み込みは、送り手・受け手とも入口（左の縁）につなぎ、U 字の帯で結ぶ。
  edges.forEach(function(edge){
    edge.a=positions[edge.from];edge.b=positions[edge.to];
    (edge.assembly?edge.a.incoming:edge.a.outgoing).push({edge:edge,end:"from",other:edge.b});
    edge.b.incoming.push({edge:edge,end:"to",other:edge.a})
  });
  var flowEdgeReader={from:function(edge){return edge.from},to:function(edge){return edge.to}};
  var linkedEdges=flowSelectionId?traceLinkedEdges(edges,flowSelectionId,flowEdgeReader,null).linked:new Set();
  // 口の並び：相手の上下の位置で並べる。U 字の口は、上にいる相手へ向かうものを縁の上端に、下にいる相手へ向かうものを下端に寄せ、
  // 近い相手ほど内側にして入れ子にする
  function slotKey(node,slot){
    if(!slot.edge.assembly)return[1,slot.other.y];
    return slot.other.y<node.y?[0,-slot.other.y]:[2,-slot.other.y]
  }
  function stack(node,slots){
    slots.sort(function(p,q){var a=slotKey(node,p),b=slotKey(node,q);return a[0]-b[0]||a[1]-b[1]});
    var weight=slots.reduce(function(sum,slot){return sum+slot.other.count},0),cursor=node.y-node.h/2;
    slots.forEach(function(slot){
      var h=node.h*slot.other.count/Math.max(1,weight);
      if(slot.end==="from"){slot.edge.fromH=h;slot.edge.fromY=cursor+h/2}else{slot.edge.toH=h;slot.edge.toY=cursor+h/2}
      cursor+=h
    })
  }
  [source].concat(nodes).forEach(function(node){stack(node,node.outgoing);stack(node,node.incoming)});
  var flowColor=colors[flowElement];
  function ribbon(edge){
    var x1=edge.a.x+8,x2=edge.b.x,mid=x1+(x2-x1)*.5;
    var aTop=edge.fromY-edge.fromH/2,aBottom=edge.fromY+edge.fromH/2,bTop=edge.toY-edge.toH/2,bBottom=edge.toY+edge.toH/2;
    if(edge.assembly)return uRibbonPath(edge.a.x,aTop,aBottom,bTop,bBottom,-1);
    return"M"+x1+","+aTop+" C"+mid+","+aTop+" "+mid+","+bTop+" "+x2+","+bTop+" L"+x2+","+bBottom+" C"+mid+","+bBottom+" "+mid+","+aBottom+" "+x1+","+aBottom+" Z"
  }
  function nodeMarkup(node){
    var label=subText(node.item,"label"),meta=companyCount(node.count),countWidth=20+Array.from(meta).length*6.5,labelLines=labelLinesOf(node.item),labelY=node.y-6-(labelLines.length-1)*lineHeight;
    var point=criticalityPoint(node.id,flowElement),score=point&&point.score!==null?Math.round(point.score):null;
    var scoreMarkup='';
    if(score!==null){
      var tier=criticalityTier(score);
      var scorePrefix=meta+' · '+criticalText('score')+colon();
      var scoreLabel=scorePrefix+score;
      var prefixWidth=Array.from(scorePrefix).reduce(function(width,ch){return width+(/[\u2e80-\uffef]/.test(ch)?11:6.3)},0);
      var badgeX=node.x+15+prefixWidth;
      scoreMarkup='<g><title>'+esc(scoreLabel+' / '+point.downstream+' / '+criticalText('share')+' '+point.level)+'</title><text x="'+(node.x+15)+'" y="'+(node.y+14)+'" style="font:11px sans-serif;fill:var(--sub)">'+esc(scorePrefix)+'</text><g class="re-criticality re-criticality-'+tier+'"><rect x="'+badgeX+'" y="'+(node.y+1)+'" width="29" height="18" rx="7"></rect><text x="'+(badgeX+14.5)+'" y="'+(node.y+14)+'" text-anchor="middle">'+score+'</text></g></g>';
    }
    return'<g class="re-ef-node'+(flowSelectionId===node.id?' is-selected':'')+'" data-flow-node="'+esc(node.id)+'" tabindex="0" role="button" aria-label="'+esc(label+"、"+meta)+'">'+
      '<rect class="re-ef-node-bar" x="'+node.x+'" y="'+(node.y-node.h/2)+'" width="8" height="'+node.h+'" fill="'+flowColor+'"></rect>'+
      '<text class="re-ef-node-title">'+labelLines.map(function(line,index){return'<tspan x="'+(node.x+15)+'" y="'+(labelY+index*lineHeight)+'">'+esc(line)+'</tspan>'}).join("")+'</text>'+
      (scoreMarkup||('<rect class="re-ef-node-count-bg" x="'+(node.x+14)+'" y="'+(node.y+2)+'" width="'+countWidth+'" height="17" rx="6" fill="'+flowColor+'" stroke="'+flowColor+'"></rect>'+
      '<text class="re-ef-node-count" x="'+(node.x+21)+'" y="'+(node.y+13.5)+'">'+esc(meta)+'</text>'))+'</g>'
  }
  var title=tr("flowTitle",{element:tagLabel(flowElement)});
  root.querySelector("#re-element-flow-title").textContent=title;
  root.querySelectorAll("[data-flow-element]").forEach(function(button){button.setAttribute("aria-pressed",String(button.dataset.flowElement===flowElement))});
  root.querySelector(".re-element-flow-swatch").style.setProperty("--flow-color",flowColor);
  var markup='<title>'+esc(tr("flowAria",{element:tagLabel(flowElement)}))+'</title>';
  stages.forEach(function(stage){
    var x=left+(stage.id-1)*step,countLabel=stageCountLabel(stage),countWidth=stageCountWidth(stage),countX=x+headWidth-countWidth,labelLines=stageLabelLinesOf(stage),shortY=stageShortY(stage),shortLines=stageShortLinesOf(stage);
    markup+='<text class="re-ef-stage-code" x="'+x+'" y="22">STAGE '+stage.code+'</text><text class="re-ef-stage-label">'+labelLines.map(function(line,index){return'<tspan x="'+x+'" y="'+(42+index*stageTitleLine)+'">'+esc(line)+'</tspan>'}).join("")+'</text>'+
      (countLabel?'<rect class="re-ef-stage-count-bg" x="'+countX+'" y="16" width="'+countWidth+'" height="22" rx="11" style="fill:color-mix(in srgb,'+flowColor+' 24%,var(--bg));stroke:'+flowColor+'"></rect><text class="re-ef-stage-count" x="'+(countX+countWidth/2)+'" y="31" text-anchor="middle">'+countLabel+'</text>':'')+
      '<text class="re-ef-stage-short">'+shortLines.map(function(line,index){return'<tspan x="'+x+'" y="'+(shortY+index*11)+'">'+esc(line)+'</tspan>'}).join("")+'</text>'
  });
  markup+='<g aria-hidden="true">'+edges.map(function(edge){
    var from=edge.from===source.id?stageText(stageMap[1],"label"):subText(edge.a.item,"label"),to=subText(edge.b.item,"label");
    var linked=linkedEdges.has(edge)?' is-linked':'';
    var link='<path class="re-ef-link'+(edge.assembly?' is-assembly':'')+linked+'" d="'+ribbon(edge)+'" fill="'+flowColor+'"><title>'+esc(from+" "+companyCount(edge.a.count)+" → "+to+" "+companyCount(edge.b.count)+" / "+tagLabel(flowElement)+(edge.assembly?" — "+tr("routeAssembly"):""))+'</title></path>';
    return link
  }).join("")+'</g>';
  // U 字の帯の向きの印は、工程のラベル・バッジに隠れないよう、工程より手前に描く
  var assemblyMarks=edges.filter(function(edge){return edge.assembly}).map(function(edge){
    var marks=uRibbonMarks(edge.a.x,edge.fromY-edge.fromH/2,edge.fromY+edge.fromH/2,edge.toY-edge.toH/2,edge.toY+edge.toH/2,-1);
    return'<g class="re-ef-assembly-mark'+(linkedEdges.has(edge)?' is-linked':'')+'" aria-hidden="true"><path class="re-ef-assembly-head" d="'+marks.head+'" fill="'+flowColor+'"></path><path class="re-ef-assembly-chevron" d="'+marks.chevron+'"></path></g>'
  }).join("");
  var chinaText=dep?tr("chinaRatio",{value:dep.china}):tr("chinaReference");
  markup+='<g class="re-ef-node re-ef-source'+(flowSelectionId===source.id?' is-selected':'')+'" data-flow-node="'+esc(source.id)+'" tabindex="0" role="button" aria-label="'+esc(tr("stageSource")+"、"+chinaText)+'"><rect class="re-ef-node-bar" x="'+source.x+'" y="'+(source.y-source.h/2)+'" width="8" height="'+source.h+'" fill="'+flowColor+'"></rect><text class="re-ef-source-title" x="'+(source.x+15)+'" y="'+(source.y-4)+'">'+esc(tr("stageSource"))+'</text><text class="re-ef-node-meta" x="'+(source.x+15)+'" y="'+(source.y+13)+'">'+esc(chinaText)+'</text></g>';
  markup+=nodes.map(nodeMarkup).join("")+assemblyMarks;
  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  svg.setAttribute("width",W);svg.setAttribute("height",H);svg.style.height=H+"px";svg.classList.toggle("is-tracing",!!flowSelectionId);svg.classList.toggle("is-english",language==="en");svg.innerHTML=markup;
  // 実際のフォント幅でバッジを配置し、英語の狭い文字にも追随する。
  svg.querySelectorAll('g.re-criticality').forEach(function(badge){
    var prefix=badge.previousElementSibling;
    if(!prefix||prefix.tagName.toLowerCase()!=='text')return;
    var width=prefix.getComputedTextLength();
    if(!Number.isFinite(width)||width<=0)return;
    var x=Number(prefix.getAttribute('x'))+width+4;
    badge.querySelector('rect').setAttribute('x',x);
    badge.querySelector('text').setAttribute('x',x+14.5);
  });
  root.querySelector("#re-element-flow-stats").textContent=tagLabel(flowElement)+" · "+metricCount(nodes.length,"category")+" · "+metricCount(edges.length,"connection")+" · "+companyUnitCount(data.filter(function(company){return company.tags.indexOf(flowElement)>=0}).length);
  function openNode(id){
    rememberMapPosition();
    flowSelectionId=id;flowSelectedId=null;refresh("flow");
    requestAnimationFrame(function(){var heading=root.querySelector("#re-flow-list-title");if(heading)heading.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})})
  }
  svg.querySelectorAll("[data-flow-node]").forEach(function(node){
    node.addEventListener("click",function(){openNode(node.dataset.flowNode)});
    node.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();openNode(node.dataset.flowNode)}})
  })
}
// 選んだ工程の前後の接続根拠。図に描いている線（その元素が流れ、両端に該当企業がいる接続）だけを出す
function renderFlowRouteNote(){
  var holder=root.querySelector("#re-flow-route-note");
  var rows=routeRows(flowSelectionId,elementSupplyGraph(flowElement));
  holder.hidden=!rows.length;
  holder.innerHTML=rows.length?routeRowsHtml(rows):""
}
// 元素別フローのシェア根拠は、選んでいる工程とその元素で絞る
function flowShareScope(){return{node:flowSelectionId,elements:[flowElement]}}
function renderFlowCompanyResults(){
  var section=root.querySelector("#re-element-flow-results");
  var main=section.querySelector(".re-main");
  if(!flowSelectionId){section.hidden=true;return}
  section.hidden=false;
  renderFlowRouteNote();
  // 海外の起点には国内企業がないため、全体像の STAGE 01 と同じ中国依存カードを出す。
  if(flowSelectionId===FLOW_SOURCE_ID){
    main.classList.add("is-dependency");
    root.querySelector("#re-flow-list-title").textContent=tagLabel(flowElement)+" — "+stageText(stages[0],"label");
    root.querySelector("#re-flow-list-count").textContent=tr("publicStats");
    root.querySelector("#re-flow-companies").innerHTML=dependencyDashboardHtml([flowElement]);
    root.querySelector("#re-flow-dossier").innerHTML="";
    return
  }
  main.classList.remove("is-dependency");
  var sub=allSubs.find(function(item){return item.id===flowSelectionId});
  var items=data.filter(function(company){return companyHasElement(company,flowSelectionId,flowElement)});
  root.querySelector("#re-flow-list-title").textContent=tagLabel(flowElement)+" — "+(sub?subText(sub,"label"):flowSelectionId);
  root.querySelector("#re-flow-list-count").textContent=companyUnitCount(items.length);
  var box=root.querySelector("#re-flow-companies");
  box.innerHTML=items.length?items.map(function(company){
    return companyCardHtml(company,"data-flow-company",flowSelectedId,flowShareScope())
  }).join(""):'<div class="re-empty">'+esc(tr("emptyFlowCompanies"))+'</div>';
  var dossier=root.querySelector("#re-flow-dossier");
  dossier.innerHTML=dossierMarkup(data.find(function(company){return company.id===flowSelectedId}),flowShareScope());
  box.querySelectorAll("[data-flow-company]").forEach(function(button){button.addEventListener("click",function(){
    flowSelectedId=button.dataset.flowCompany;renderFlowCompanyResults();
    requestAnimationFrame(function(){revealDossier(dossier)})
  })})
}
