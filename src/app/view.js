// タブ・言語の切り替え、再描画の入口、イベントの配線、起動。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function setView(view){
  activeView=view;
  root.querySelectorAll("[data-view]").forEach(function(button){
    var selected=button.dataset.view===view;
    button.setAttribute("aria-selected",String(selected));
    button.setAttribute("tabindex",selected?"0":"-1")
  });
  root.querySelector("#re-view-overview").hidden=view!=="overview";
  root.querySelector("#re-view-element-flow").hidden=view!=="element-flow";
  // 表示に切り替えた側をここで描き直す。clientWidth の読み出しでレイアウトが確定するため、
  // requestAnimationFrame を待たずに描いてよい。待つと、背面タブなどで rAF が止まっている間
  // 図が空のままになる。
  if(view==="overview"){if(flowLayoutStale)renderFlow()}
  else refresh("flow")
}
function applyStaticTranslations(){
  document.documentElement.lang=language;
  document.title=tr("pageTitle");
  root.querySelector("#re-page-title").textContent=tr("pageTitle");
  root.querySelector(".re-view-tabs").setAttribute("aria-label",tr("viewMode"));
  root.querySelector("#re-tab-overview").textContent=tr("overview");
  root.querySelector("#re-tab-element-flow").textContent=tr("elementFlow");
  root.querySelector('[data-element="all"]').textContent=tr("showAll");
  root.querySelector(".re-overview-element-controls").setAttribute("aria-label",tr("elementSelect"));
  root.querySelector(".re-element-flow-controls").setAttribute("aria-label",tr("elementSelectOne"));
  root.querySelector(".re-map-help").textContent=tr("mapHelp");
  root.querySelector("#re-flow-viewport").setAttribute("aria-label",tr("mapLabel"));
  root.querySelector("#re-flow-canvas").setAttribute("aria-label",tr("mapCanvas"));
  root.querySelector('.re-company-search label').textContent=tr("search");
  root.querySelector(".re-company-search").setAttribute("aria-label",tr("search"));
  root.querySelector("#re-company-search").setAttribute("placeholder",tr("searchPlaceholder"));
  root.querySelector("#re-search-clear").textContent=tr("clear");
  root.querySelector("#re-search-help").textContent=tr("searchHelp");
  root.querySelector(".re-element-flow-lead").textContent=tr("flowLead");
  root.querySelector("#re-flow-to-overview").textContent=tr("viewOverview");
  root.querySelector(".re-element-flow-note > div").innerHTML=esc(tr("flowNote"))+'<div class="re-element-flow-stats" id="re-element-flow-stats"></div>';
  root.querySelector("#re-language-switch").setAttribute("aria-label",tr("language"));
  root.querySelectorAll("[data-language]").forEach(function(button){button.setAttribute("aria-pressed",String(button.dataset.language===language))});
  root.querySelector("#re-status").textContent=tr("prepared",{count:data.length});
}
function setLanguage(next){
  if(!uiStrings[next]||next===language)return;
  language=next;
  try{localStorage.setItem("rareEarthLanguage",language)}catch(error){}
  applyStaticTranslations();
  refresh("all")
}

// 再描画の入口はこの関数だけ。状態を変えたあとに、描き直す範囲を渡して呼ぶ。
//   "overview" … 全体像タブ（元素ボタン・マップ・接続根拠・企業一覧・ドシエ）
//   "list"     … 企業一覧とドシエだけ
//   "flow"     … 元素別フロータブ（表示中のときだけ）
//   "flowList" … 元素別フローの企業一覧とドシエだけ
//   "all"      … 両タブ
function refresh(scope){
  if(scope==="overview"||scope==="all"){
    renderOverviewElementControls();
    root.querySelectorAll("[data-element]").forEach(function(btn){
      var key=btn.dataset.element;
      var pressed=key==="all"?selectedElements.length===allElements.length:selectedElements.indexOf(key)>=0;
      btn.setAttribute("aria-pressed",String(pressed))
    });
    renderFlow();renderRouteNote()
  }
  if(scope==="overview"||scope==="all"||scope==="list"){renderList();renderDossier()}
  // 元素別フローは、表示中のときだけ描く（非表示のまま描くと採寸が合わない）。
  if((scope==="flow"||scope==="all")&&activeView==="element-flow"){renderElementFlow();renderFlowCompanyResults()}
  else if(scope==="flowList")renderFlowCompanyResults()
}
root.querySelector("#re-flow-viewport").addEventListener("click",function(event){
  if(event.target.closest("button,.re-edge,.re-column-label,.re-stamp"))return;
  if(selection.type!=="all"||traceNodeId){
    selection={type:"all",id:"all"};
  }else if(selectedElements.length!==allElements.length){
    selectedElements=allElements.slice();
  }else return;
  traceNodeId=null;selectedId=null;
  refresh("overview")
});
root.querySelectorAll("[data-element]").forEach(function(btn){btn.addEventListener("click",function(){
  var key=btn.dataset.element;
  if(key==="all"){
    selectedElements=allElements.slice();selection={type:"all",id:"all"}
  }else if(selectedElements.length===allElements.length){
    selectedElements=[key]
  }else if(selectedElements.indexOf(key)>=0){
    if(selectedElements.length>1)selectedElements=selectedElements.filter(function(e){return e!==key})
  }else{
    selectedElements=selectedElements.concat(key)
  }
  traceNodeId=null;selectedId=null;
  refresh("overview")
})});
root.querySelectorAll("[data-view]").forEach(function(button){button.addEventListener("click",function(){setView(button.dataset.view)})});
root.querySelectorAll("[data-language]").forEach(function(button){button.addEventListener("click",function(){setLanguage(button.dataset.language)})});
root.querySelectorAll("[data-flow-element]").forEach(function(button){button.addEventListener("click",function(){
  flowElement=button.dataset.flowElement;flowSelectionId=null;flowSelectedId=null;refresh("flow")
})});
root.querySelector("#re-flow-to-overview").addEventListener("click",function(){
  selectedElements=[flowElement];selection={type:"all",id:"all"};traceNodeId=null;selectedId=null;setView("overview");refresh("overview")
});
root.querySelector("#re-element-flow-frame").addEventListener("click",function(event){
  var canvas=root.querySelector("#re-element-flow-canvas");
  if(event.target!==this&&event.target!==canvas)return;
  if(flowSelectedId){
    flowSelectedId=null;refresh("flowList");return
  }
  if(flowSelectionId){
    flowSelectionId=null;flowSelectedId=null;refresh("flow")
  }
});
var elementFlowResizeTimer=null;
if(window.ResizeObserver)new ResizeObserver(function(){
  if(activeView!=="element-flow")return;
  clearTimeout(elementFlowResizeTimer);elementFlowResizeTimer=setTimeout(renderElementFlow,80)
}).observe(root.querySelector("#re-element-flow-frame"));
var searchInput=root.querySelector("#re-company-search");
function updateSearch(){selectedId=null;refresh("list")}
searchInput.addEventListener("input",function(event){if(!event.isComposing)updateSearch()});
searchInput.addEventListener("compositionend",updateSearch);
root.querySelector("#re-search-clear").addEventListener("click",function(){searchInput.value="";updateSearch();searchInput.focus()});
applyStaticTranslations();refresh("overview");initResponsiveMap()
