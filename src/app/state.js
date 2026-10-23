// 画面全体で共有する状態と、データから組み立てた定数。
// 元素の一覧（elements）は src/data から生成した領域が供給する。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

var root=document.getElementById("rare-earth-original-flow");
var depColors={A:"var(--risk-a)",Y:"var(--y)",DyTb:"var(--dytb)",Sm:"var(--sm)",Sc:"var(--sc)",line:"var(--line)"};
var allSubs=commerceSubs.concat(parts,modules,systems);
// 元素別フローの「海外の資源・分離」ノードのID（企業ではなく中国依存カードを出す）。
var FLOW_SOURCE_ID="flow-source";
var colors={Y:"var(--y)",DyTb:"var(--dytb)",Sm:"var(--sm)",Sc:"var(--sc)"};
var data=seed.slice(),allElements=elements.slice(),selectedElements=elements.slice(),selection={type:"all",id:"all"},traceNodeId=null,selectedId=null,activeView="overview",flowElement=elements[0],flowSelectionId=null,flowSelectedId=null,flowLayoutStale=false;
