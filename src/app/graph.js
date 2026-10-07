// 接続線の描画と、上流・下流のたどり方。全体像マップと元素別フローで共用する。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function curve(x1,y1,x2,y2){var dx=(x2-x1)*.55;return"M "+x1+" "+y1+" C "+(x1+dx)+" "+y1+", "+(x2-dx)+" "+y2+", "+x2+" "+y2}
function path(d,color,dim,meta){
  var attrs=meta?' data-from="'+esc(meta.from)+'" data-to="'+esc(meta.to)+'" data-element="'+esc(meta.element)+'" role="img" aria-label="'+esc(meta.title)+'"':'';
  return'<g class="re-edge"'+attrs+' opacity="'+(dim?.08:1)+'">'+(meta?'<title>'+esc(meta.title)+'</title>':'')+'<path class="re-path-bg" stroke="'+color+'" d="'+d+'"></path><path class="re-path-fg" stroke="'+color+'" d="'+d+'"></path></g>'
}
// 上流・下流のたどり方は全体像マップと元素別フローで共通。edges の形が違うため
// from/to/element の取り出し方だけを呼び出し側から渡す。elements が null なら元素で絞らない。
function traceLinkedEdges(edges,startId,reader,elementList){
  var linked=new Set(),downstream=new Set();
  function walk(direction,element){
    var frontier=[startId],visited=new Set(frontier);
    while(frontier.length){
      var node=frontier.pop();
      edges.forEach(function(edge){
        if(element!==null&&reader.element(edge)!==element)return;
        var matches=direction==="up"?reader.to(edge)===node:reader.from(edge)===node;
        if(!matches)return;
        linked.add(edge);
        var next=direction==="up"?reader.from(edge):reader.to(edge);
        if(!visited.has(next)){visited.add(next);frontier.push(next)}
      })
    }
    if(direction==="down")visited.forEach(function(node){downstream.add(node)})
  }
  (elementList||[null]).forEach(function(element){walk("up",element);walk("down",element)});
  return{linked:linked,downstream:downstream}
}
