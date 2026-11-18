// 分類間の監査済み接続を組み立てる純粋なモデル。DOM・言語・画面の選択状態には依存しない。
// element を省略すると全分類・全接続。指定時はその元素を扱う企業がいる分類だけを返す。
// 海外起点は分類ではないため含めず、表示側が STAGE 02 へ接続する。

function buildSupplyGraph(subcategories,companies,element){
  var members=new Map();
  subcategories.forEach(function(sub){members.set(sub.id,[])});
  companies.forEach(function(company){
    members.forEach(function(list,id){
      if(element?companyHasElement(company,id,element):company.subs.indexOf(id)>=0)list.push(company)
    })
  });
  var nodes=subcategories.filter(function(sub){return !element||(sub.els.indexOf(element)>=0&&members.get(sub.id).length>0)});
  var byId=new Map(),incoming=new Map(),outgoing=new Map(),edges=[];
  nodes.forEach(function(sub){byId.set(sub.id,sub);incoming.set(sub.id,[]);outgoing.set(sub.id,[])});
  nodes.forEach(function(target){
    (target.src||[]).forEach(function(from){
      var allowed=(target.srcEls&&target.srcEls[from])||[];
      if(!byId.has(from)||(element&&allowed.indexOf(element)<0))return;
      var edge={from:from,to:target.id,elements:allowed.slice()};
      edges.push(edge);incoming.get(target.id).push(edge);outgoing.get(from).push(edge)
    })
  });
  return{nodes:nodes,byId:byId,edges:edges,incoming:incoming,outgoing:outgoing,members:members}
}
function supplyGraphReachable(graph,start,reverse){
  var seen=new Set(),stack=[start],adjacent=reverse?graph.incoming:graph.outgoing;
  while(stack.length){
    var id=stack.pop();
    (adjacent.get(id)||[]).forEach(function(edge){
      var next=reverse?edge.from:edge.to;
      if(!seen.has(next)){seen.add(next);stack.push(next)}
    })
  }
  return seen
}
// 入力接続を先、出力接続を後に並べる。根拠の翻訳・HTML 化は表示層で行う。
function supplyGraphRoutes(graph,id){return(graph.incoming.get(id)||[]).concat(graph.outgoing.get(id)||[])}
