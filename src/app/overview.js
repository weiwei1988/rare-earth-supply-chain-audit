// 「サプライチェーン全体像」タブの描画。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

// 全体像で選ぶ元素は1つだけ（空＝全元素）。企業一覧・件数が使う selectedElements はここから作る。
// 選んだ元素を扱わないサブカテゴリーの選択は外す（押せない状態のまま残さない）
function setOverviewElement(element){
  overviewElement=element||"";
  selectedElements=overviewElement?[overviewElement]:allElements.slice();
  if(overviewElement&&selection.type==="sub"){
    var sub=allSubs.find(function(item){return item.id===selection.id});
    if(!sub||activeEls(sub).indexOf(overviewElement)<0){selection={type:"all",id:"all"};traceNodeId=null}
  }
}
// 全体像の文言（STAGE 01 の中国比率）
var ovLabels={
  ja:{originCaption:"中国の比率（指標は元素ごとに異なる）"},
  en:{originCaption:"China’s share (the measure differs by element)"},
  "zh-CN":{originCaption:"中国占比（各元素的指标不同）"}
};
function ovText(key){return(ovLabels[language]||ovLabels.ja)[key]}

// 配置（列の幅・カードの高さ・線の形）は画面の幅と言語で決まり、元素や工程を選んでも変えない。
// 選択の変化は updateFlowState でクラスだけを付け替え、強調の切り替えをなめらかに見せる
var flowBuiltKey="",flowBuiltWidth=0;
// 図の最小の幅。11インチ iPad の横向き（画面幅 1180px 前後、図の枠は約 1115px）でも横スクロールせずに収まる幅にする。
// これより狭い画面では横スクロールにする
var FLOW_MIN_WIDTH=1100;
function renderFlow(){
  // 非表示のパネルは clientWidth が 0 になり、最小幅で固定されたまま残るため描画を保留する。
  if(activeView!=="overview"){flowLayoutStale=true;return}
  flowLayoutStale=false;
  var viewport=root.querySelector("#re-flow-viewport"),W=Math.max(FLOW_MIN_WIDTH,Math.floor(viewport.clientWidth));
  var canvas=root.querySelector("#re-flow-canvas"),key=W+"|"+language;
  if(key!==flowBuiltKey||!canvas.firstChild){buildFlow(W);flowBuiltKey=key;flowBuiltWidth=W}
  updateFlowState()
}

function buildFlow(W){
  var sidePadding=Math.max(18,Math.min(60,Math.round(18+(W-1200)*.05)));
  // カードの幅は、図の幅 1200px で 176px。広い画面では 240px まで広げ、1200px より狭い画面では 162px まで縮めて列の間隔を保つ
  var cardWidth=W>=1200?Math.max(176,Math.min(240,Math.round(176+(W-1200)*.082))):Math.max(162,Math.round(176-(1200-W)*.16));
  var columnStep=cardWidth+(W-sidePadding*2-cardWidth*6)/5;
  var minCardHeight=100,columnGap=8,columnBaseSpan=220,perStageCompany=16.6,perCardScaleCompany=.8,maxColumnSpan=1580,downstreamStep=40;
  var xByStage={2:sidePadding+columnStep,3:sidePadding+columnStep*2,4:sidePadding+columnStep*3,5:sidePadding+columnStep*4,6:sidePadding+columnStep*5};
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
  // 下流の列は、上流の列の高さに「社数の比の平方根」をかけた高さより短くしない。
  // カード1枚の最低の高さで列の高さが決まる工程（カードが多い工程）でも、社数の増え方が縦の長さに出るようにする。
  // 正比例にすると装備・システムの列が長くなりすぎるため、平方根で伸ばす。prev は1つ上流の列
  function sizeColumn(column,prev){
    var floor=prev?Math.max(prev.span+downstreamStep,prev.span*Math.sqrt(Math.max(1,totalStageCount(stageMeta[column.stage].id))/Math.max(1,totalStageCount(stageMeta[prev.stage].id)))):0;
    var nodes=column.nodes,gapSpan=Math.max(0,nodes.length-1)*columnGap;
    var minimumSpan=nodes.length*minCardHeight+gapSpan;
    var stageCompanyCount=totalStageCount(stageMeta[column.stage].id);
    var targetSpan=Math.max(minimumSpan+stageCompanyCount*perCardScaleCompany,Math.min(maxColumnSpan,columnBaseSpan+stageCompanyCount*perStageCompany),floor);
    var weights=nodes.map(function(item){return Math.max(1,totalSubCount(item.id))});
    var weightTotal=weights.reduce(function(sum,value){return sum+value},0);
    var extraHeight=targetSpan-gapSpan-nodes.length*minCardHeight;
    column.heights=nodes.map(function(item,index){return minCardHeight+extraHeight*weights[index]/weightTotal});
    column.span=column.heights.reduce(function(sum,height){return sum+height},0)+gapSpan
  }
  columns.forEach(function(column,index){sizeColumn(column,index?columns[index-1]:null)});
  var maxSpan=Math.max.apply(null,columns.map(function(column){return column.span}));
  var columnTopClearance=72,H=Math.max(920,Math.ceil(maxSpan+columnTopClearance*2)),CY=H/2;
  var source={id:"stage01",x:sidePadding,w:cardWidth,y:CY,els:allElements.slice()};
  function layoutColumn(column){
    var top=(H-column.span)/2;
    return column.nodes.map(function(item,index){var h=column.heights[index],position={item:item,h:h,y:top+h/2};top+=h+columnGap;return position})
  }
  var nodeMap={};
  columns.forEach(function(column){
    column.top=(H-column.span)/2;
    column.layout=layoutColumn(column);
    column.layout.forEach(function(position){
      var item=position.item;
      nodeMap[item.id]={id:item.id,x:xByStage[column.stage],w:cardWidth,y:position.y,h:position.h,els:activeEls(item),node:item};
    })
  });

  // ステージの外枠：各ステージのカードの列を灰色の地で囲み、隣のステージへ曲線でつなぐ（上流は細く、下流ほど太い）
  function hornPath(){
    var pad=12,list=columns.map(function(column){return{x:xByStage[column.stage]-8,w:cardWidth+16,top:column.top-pad,bottom:column.top+column.span+pad}});
    var d="M"+list[0].x+","+list[0].top;
    list.forEach(function(column,index){
      d+=" L"+(column.x+column.w)+","+column.top;
      var next=list[index+1];
      if(next){var mid=(column.x+column.w+next.x)/2;d+=" C"+mid+","+column.top+" "+mid+","+next.top+" "+next.x+","+next.top}
    });
    for(var index=list.length-1;index>=0;index--){
      var column=list[index],previous=list[index-1];
      d+=" L"+(column.x+column.w)+","+column.bottom+" L"+column.x+","+column.bottom;
      if(previous){var mid=(previous.x+previous.w+column.x)/2;d+=" C"+mid+","+column.bottom+" "+mid+","+previous.bottom+" "+(previous.x+previous.w)+","+previous.bottom}
    }
    return d+" Z"
  }

  // 接続は工程の組ごとに1本の細い実線。data-els に、その接続を流れる元素を持たせ、選択に応じて強調だけを変える
  var edgeKeys=new Set(),edgeMarkup=[];
  function edgeTitle(a,b,els,note,assembly){
    var fromLabel=a.node?subText(a.node,"label"):stageText(stageMeta[1]||{id:1,label:"海外の資源・分離"},"label"),toLabel=b.node?subText(b.node,"label"):b.id;
    return fromLabel+" → "+toLabel+" / "+els.map(tagLabel).join("・")+(assembly?" — "+tr("routeAssembly"):"")+(note?" — "+note:"")
  }
  function commonEls(a,b,allowed){return allElements.filter(function(element){return allowed.indexOf(element)>=0&&a.els.indexOf(element)>=0&&b.els.indexOf(element)>=0})}
  function edgeGroup(a,b,els,title,className,inner){
    return'<g class="re-edge'+className+'" data-from="'+esc(a.id)+'" data-to="'+esc(b.id)+'" data-els="'+esc(els.join(" "))+'" role="img" aria-label="'+esc(title)+'"><title>'+esc(title)+'</title>'+inner+'</g>'
  }
  function connect(a,b,allowed,note){
    if(!a||!b)return;
    var els=commonEls(a,b,allowed||a.els),edgeKey=a.id+"|"+b.id;
    if(!els.length||edgeKeys.has(edgeKey))return;
    edgeKeys.add(edgeKey);
    // 出発点カードの右端中点から、到達点カードの左端中点へ結び、到達点に小さな点を打つ
    edgeMarkup.push(edgeGroup(a,b,els,edgeTitle(a,b,els,note,false),"",'<path class="re-edge-line" d="'+curve(a.x+a.w,a.y,b.x,b.y)+'"></path><circle class="re-edge-end" cx="'+b.x+'" cy="'+b.y+'" r="1.8"></circle>'))
  }
  // 同じ列の中の組み込み（部材を部材に組む）は、列の右脇の溝を縦に通る鉤形の破線で受け手へ入れ、矢じりで向きを示す。
  // ステージをまたぐ線（カードの中点から出る）と重ならないよう、送り手は下寄り・受け手は上寄りに付ける
  function connectAssembly(a,b,allowed,note){
    if(!a||!b)return;
    var els=commonEls(a,b,allowed),edgeKey=a.id+"|"+b.id;
    if(!els.length||edgeKeys.has(edgeKey))return;
    edgeKeys.add(edgeKey);
    var trunkX=a.x+a.w+10,r=6,startY=a.y+a.h/2-12,endY=b.y-b.h/2+12,endX=b.x+b.w+3,down=endY>startY?1:-1;
    var d="M"+(a.x+a.w)+","+startY+" H"+(trunkX-r)+" Q"+trunkX+","+startY+" "+trunkX+","+(startY+down*r)+" V"+(endY-down*r)+" Q"+trunkX+","+endY+" "+(trunkX-r)+","+endY+" H"+endX;
    var arrow="M"+(endX+5)+","+(endY-3.5)+" L"+endX+","+endY+" L"+(endX+5)+","+(endY+3.5);
    edgeMarkup.push(edgeGroup(a,b,els,edgeTitle(a,b,els,note,true)," re-edge-assembly",'<path class="re-edge-line" d="'+d+'"></path><path class="re-edge-arrow" d="'+arrow+'"></path><circle class="re-edge-end" cx="'+(a.x+a.w)+'" cy="'+startY+'" r="2"></circle>'))
  }
  columns.filter(function(column){return column.stage===2}).forEach(function(column){
    column.nodes.forEach(function(item){connect(source,nodeMap[item.id],nodeMap[item.id].els)})
  });
  var graph=buildSupplyGraph(allSubs,data);
  graph.edges.forEach(function(edge){
    var draw=edge.assembly?connectAssembly:connect;
    draw(nodeMap[edge.from],nodeMap[edge.to],edge.elements,routeText(graph.byId.get(edge.to),edge.from))
  });
  // 強調した線を手前に出すため、線は2つの層に分けて持つ（updateFlowState が層を移す）
  var svg='<svg class="re-flow-svg" viewBox="0 0 '+W+' '+H+'" role="img"><title>'+esc(tr("mapCanvas"))+'</title><path class="re-flow-horn" d="'+hornPath()+'"></path><g class="re-edge-layer">'+edgeMarkup.join("")+'</g><g class="re-edge-layer re-edge-layer-top"></g></svg>';

  function subCard(item,pos,stage){
    var routeTitle=(item.src||[]).map(function(sourceId){return(subLabel(sourceId)+" → "+subText(item,"label")+" / "+(item.srcEls[sourceId]||[]).map(tagLabel).join("・")+" — "+routeText(item,sourceId))}).join("\n");
    return'<button type="button" class="re-card re-sub-card" data-type="sub" data-id="'+esc(item.id)+'" data-node-id="'+esc(item.id)+'" data-els="'+esc(pos.els.join(" "))+'"'+(routeTitle?' title="'+esc(routeTitle)+'"':'')+' aria-pressed="false" style="left:'+pos.x+'px;top:'+(pos.y-pos.h/2)+'px;width:'+pos.w+'px;height:'+pos.h+'px">'+
      '<div class="re-card-code">STAGE '+stage.code+' / '+esc(stageText(stage,"label"))+'</div><div class="re-card-title">'+esc(subText(item,"label"))+'</div><div class="re-card-description">'+esc(subText(item,"description"))+'</div><div class="re-card-tags">'+tagsHtml(pos.els,true)+'</div><span class="re-card-count"></span></button>'
  }
  // STAGE 01：元素ごとの中国の比率を棒で示す（元素を選ぶと、その元素の棒だけを残す）
  function originRows(){
    return'<span class="re-origin-caption">'+esc(ovText("originCaption"))+'</span><span class="re-origin-rows">'+allElements.map(function(element){
      var dep=dependencyRows.find(function(row){return row.tag===element}),china=dep?Math.max(0,Math.min(100,dep.china)):0;
      return'<span class="re-origin-row" data-el="'+esc(element)+'" style="--re-origin-color:'+colors[element]+'"'+(dep?' title="'+esc(dependencyText(dep,"metric"))+'"':'')+'><span class="re-origin-el"><i aria-hidden="true"></i>'+esc(tagLabel(element))+'</span><span class="re-origin-val">'+(dep?dep.china+"%":"—")+'</span><span class="re-origin-bar" aria-hidden="true"><i style="width:'+china+'%"></i></span></span>'
    }).join("")+'</span>'
  }

  var sourceStage=stageMeta[1]||{code:"01",label:"海外の資源・分離",short:"採掘・分離精製・輸出管理"};
  var cards='';
  function stageLabel(stage,x){return'<div class="re-column-label" data-stage="'+stage.id+'" style="left:'+x+'px;width:'+cardWidth+'px"><span class="re-column-label-code">STAGE '+stage.code+'</span><strong class="re-column-label-title">'+esc(stageText(stage,"label"))+'</strong><span class="re-column-label-count"></span></div>'}
  cards+=stageLabel(sourceStage,source.x);
  columns.forEach(function(column){cards+=stageLabel(stageMeta[column.stage],xByStage[column.stage])});
  cards+='<div class="re-stamp" style="left:18px;top:'+(CY-310)+'px;transform:rotate(-5deg)">'+esc(tr("stampSeven"))+'</div>';
  cards+='<div class="re-stamp" style="left:40px;top:'+(CY-277)+'px;transform:rotate(3deg)">'+esc(tr("stampJapan"))+'</div>';
  cards+='<button type="button" class="re-card re-stage-card" data-type="stage" data-id="1" data-node-id="stage01" aria-pressed="false" style="left:'+source.x+'px;top:'+(CY-41)+'px;width:'+source.w+'px"><div class="re-card-code">SOURCE / STAGE '+sourceStage.code+'</div><div class="re-card-title">'+esc(stageText(sourceStage,"label"))+'</div><div class="re-card-sub">'+esc(stageText(sourceStage,"short"))+'</div>'+originRows()+'</button>';
  columns.forEach(function(column){var stage=stageMeta[column.stage];column.nodes.forEach(function(item){cards+=subCard(item,nodeMap[item.id],stage)})});
  var canvas=root.querySelector("#re-flow-canvas");
  canvas.style.width=W+"px";
  canvas.style.height=H+"px";
  canvas.classList.toggle("is-english",language==="en");
  canvas.innerHTML=svg+cards;
  // STAGE 01 カードの高さは言語で変わる（英語は2行になる）。挿入後に実測し、
  // 接続線の始点 CY に中心をそろえる。
  var sourceCard=canvas.querySelector(".re-stage-card");
  if(sourceCard)sourceCard.style.top=(CY-sourceCard.offsetHeight/2)+"px";
  canvas.querySelectorAll("[data-type]").forEach(function(btn){btn.addEventListener("click",function(event){
    event.stopPropagation();
    rememberMapPosition();
    var type=btn.dataset.type,id=btn.dataset.id;
    // 選んでいるカードをもう一度押すと、選択を外す
    if(selection.type===type&&String(selection.id)===String(id)){selection={type:"all",id:"all"};traceNodeId=null;selectedId=null;refresh("overview");return}
    traceNodeId=type==="sub"?id:null;
    selection={type:type,id:id};selectedId=null;refresh("overview");
    // STAGE 01 を押したときは中国依存カードが一覧の位置に出るため、サブカテゴリーと同じく送る。
    requestAnimationFrame(function(){
      var heading=root.querySelector("#re-list-title");
      if(heading)heading.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})
    })
  })})
}

// 選んだ工程から上流・下流へ、元素ごとにたどる（別の元素の線を乗り継いで、その工程の元素が実際には流れない線まで光らせない）
function traceFlow(edges,startId,elementList){
  var nodes=new Set([startId]),linked=new Set();
  elementList.forEach(function(element){
    ["up","down"].forEach(function(direction){
      var stack=[startId],seen=new Set(stack);
      while(stack.length){
        var id=stack.pop();
        edges.forEach(function(edge){
          if(edge.els.indexOf(element)<0||(direction==="up"?edge.to:edge.from)!==id)return;
          linked.add(edge.node);
          var next=direction==="up"?edge.from:edge.to;
          nodes.add(next);
          if(!seen.has(next)){seen.add(next);stack.push(next)}
        })
      }
    })
  });
  return{nodes:nodes,edges:linked}
}

function updateFlowState(){
  var canvas=root.querySelector("#re-flow-canvas"),element=overviewElement;
  var layers=canvas.querySelectorAll(".re-edge-layer");
  var edges=Array.from(canvas.querySelectorAll(".re-edge")).map(function(node){return{node:node,from:node.dataset.from,to:node.dataset.to,els:node.dataset.els.split(" ")}});
  var traced=null;
  if(traceNodeId){
    var card=Array.from(canvas.querySelectorAll(".re-sub-card")).find(function(item){return item.dataset.id===traceNodeId});
    var nodeEls=card?card.dataset.els.split(" "):[];
    traced=traceFlow(edges,traceNodeId,element?[element]:nodeEls);
  }
  canvas.classList.toggle("is-tracing",!!traced);
  canvas.classList.toggle("has-element",!!element);
  if(element)canvas.style.setProperty("--re-edge-el",colors[element]);else canvas.style.removeProperty("--re-edge-el");
  edges.forEach(function(edge){
    var related=!element||edge.els.indexOf(element)>=0,on=!!traced&&traced.edges.has(edge.node);
    edge.node.classList.toggle("is-el",!!element&&related);
    edge.node.classList.toggle("is-off",!!element&&!related);
    edge.node.classList.toggle("is-on",on);
    edge.node.classList.toggle("is-dim",!!traced&&!on);
    var layer=layers[(on||(!!element&&related&&!traced))?1:0];
    if(layer&&edge.node.parentNode!==layer)layer.appendChild(edge.node)
  });
  canvas.querySelectorAll(".re-sub-card").forEach(function(card){
    var id=card.dataset.id,els=card.dataset.els?card.dataset.els.split(" "):[],relevant=!element||els.indexOf(element)>=0;
    var count=element&&relevant?subElementCount(id,element):totalSubCount(id);
    card.disabled=!!element&&!relevant;
    card.setAttribute("aria-pressed",String(selection.type==="sub"&&selection.id===id));
    card.classList.toggle("is-target",!!element&&relevant);
    card.classList.toggle("is-off",!!element&&!relevant);
    card.classList.toggle("is-dim",!!traced&&relevant&&!traced.nodes.has(id));
    card.classList.toggle("is-linked",!!traced&&traced.nodes.has(id)&&id!==traceNodeId);
    card.classList.toggle("is-gap",count===0);
    if(element&&relevant)card.style.setProperty("--node-el",colors[element]);else card.style.removeProperty("--node-el");
    card.querySelector(".re-card-count").textContent=companyCount(count);
    card.querySelectorAll(".re-card-tags [data-el]").forEach(function(tag){tag.classList.toggle("is-match",tag.dataset.el===element)})
  });
  var sourceCard=canvas.querySelector(".re-stage-card");
  if(sourceCard){
    sourceCard.setAttribute("aria-pressed",String(selection.type==="stage"&&Number(selection.id)===1));
    sourceCard.classList.toggle("is-dim",!!traced&&!traced.nodes.has("stage01"));
    sourceCard.querySelectorAll(".re-origin-row").forEach(function(row){
      row.classList.toggle("is-off",!!element&&row.dataset.el!==element);
      row.classList.toggle("is-match",row.dataset.el===element)
    })
  }
  // 海外（STAGE 01）には国内企業がいないため、社数は出さない
  canvas.querySelectorAll(".re-column-label").forEach(function(label){var stage=Number(label.dataset.stage),count=label.querySelector(".re-column-label-count");count.hidden=stage===1;count.textContent=stage===1?"":companyCount(countStage(stage))})
}

function initResponsiveMap(){
  // 比べる相手は、実際に描いた図の幅（flowBuiltWidth）。最初の描画のあとに縦スクロールバーが出て枠が狭くなった場合も描き直す
  var viewport=root.querySelector("#re-flow-viewport"),reflowTimer=null;
  function widthNow(){return Math.max(FLOW_MIN_WIDTH,Math.floor(viewport.clientWidth))}
  function handleViewportResize(){
    if(activeView!=="overview"||widthNow()===flowBuiltWidth)return;
    clearTimeout(reflowTimer);
    reflowTimer=setTimeout(function(){if(widthNow()!==flowBuiltWidth)refresh("overview")},80)
  }
  if(window.ResizeObserver)new ResizeObserver(handleViewportResize).observe(viewport);
  else window.addEventListener("resize",handleViewportResize)
}

function renderRouteNote(){
  var holder=root.querySelector("#re-route-note"),rows=selection.type==="sub"?routeRows(selection.id):[];
  if(!rows.length){
    holder.innerHTML='<div class="re-route-note-title">END-TO-END ROUTE TRACE</div>'+esc(tr("routeDefault"));
    return
  }
  holder.innerHTML=routeRowsHtml(rows)
}

// 全体像のシェア根拠は、選んでいるサブカテゴリーと元素フィルターで絞る
function overviewShareScope(){return{node:selection.type==="sub"?selection.id:null,elements:selectedElements}}
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
    return companyCardHtml(company,"data-company",selectedId,overviewShareScope())
  }).join("");
  root.querySelectorAll("[data-company]").forEach(function(btn){btn.addEventListener("click",function(){
    selectedId=btn.dataset.company;refresh("list");
    requestAnimationFrame(function(){revealDossier(root.querySelector("#re-dossier"))})
  })});
}

function renderDossier(){
  var host=root.querySelector("#re-dossier");
  if(selection.type==="stage"&&Number(selection.id)===1){host.innerHTML="";return}
  host.innerHTML=dossierMarkup(data.find(function(company){return company.id===selectedId}),overviewShareScope())
}

