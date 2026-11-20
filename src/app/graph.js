// 接続線の描画と、上流・下流のたどり方。全体像マップと元素別フローで共用する。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

// 同じ列の中の組み込みを、2つの工程の入口どうし（x）を列の脇へ迂回する U 字の帯で結ぶ。dir は迂回する向き（-1 で左）。
// 内側の振れは両端の距離に比例させ、入れ子になった U 字（遠い相手ほど外側）が重ならないようにする。
function uRibbonReach(y1a,y1b,y2a,y2b){return Math.min(72,18+Math.abs((y2a+y2b)/2-(y1a+y1b)/2)*.55)}
function uRibbonPath(x,y1a,y1b,y2a,y2b,dir){
  var inner=uRibbonReach(y1a,y1b,y2a,y2b),outer=inner+Math.max(y1b-y1a,y2b-y2a)*1.4;
  var ends=y1a<y2a?[y1a,y2b,y2a,y1b]:[y1b,y2a,y2b,y1a],o1=ends[0],o2=ends[1],i2=ends[2],i1=ends[3];
  return"M"+x+","+o1+" C"+(x+dir*outer)+","+o1+" "+(x+dir*outer)+","+o2+" "+x+","+o2+" L"+x+","+i2+" C"+(x+dir*inner)+","+i2+" "+(x+dir*inner)+","+i1+" "+x+","+i1+" Z"
}
// U 字の帯の向き：受け手の入口に帯の中へ入る矢じり、迂回の頂点に受け手の側を向く山形
function uRibbonMarks(x,y1a,y1b,y2a,y2b,dir){
  var inner=uRibbonReach(y1a,y1b,y2a,y2b),outer=inner+Math.max(y1b-y1a,y2b-y2a)*1.4;
  var y1=(y1a+y1b)/2,y2=(y2a+y2b)/2,half=Math.max(3,Math.min(5,(y2b-y2a)/2+1.5));
  var ax=x+dir*.75*(inner+outer)/2,ay=(y1+y2)/2,down=y2>y1?1:-1;
  return{
    head:"M"+x+","+y2+" L"+(x+dir*8)+","+(y2-half)+" L"+(x+dir*8)+","+(y2+half)+" Z",
    chevron:"M"+(ax-4)+","+(ay-down*2.5)+" L"+ax+","+(ay+down*2.5)+" L"+(ax+4)+","+(ay-down*2.5)
  }
}
function curve(x1,y1,x2,y2){var dx=(x2-x1)*.55;return"M "+x1+" "+y1+" C "+(x1+dx)+" "+y1+", "+(x2-dx)+" "+y2+", "+x2+" "+y2}
// option.className は線の種類（組み込みの鉤形など）、option.extra は線に添える印（矢じりなど）の SVG
function path(d,color,dim,meta,option){
  var attrs=meta?' data-from="'+esc(meta.from)+'" data-to="'+esc(meta.to)+'" data-element="'+esc(meta.element)+'" role="img" aria-label="'+esc(meta.title)+'"':'';
  var className=option&&option.className?" "+option.className:"";
  return'<g class="re-edge'+className+'"'+attrs+' opacity="'+(dim?.08:1)+'">'+(meta?'<title>'+esc(meta.title)+'</title>':'')+'<path class="re-path-bg" stroke="'+color+'" d="'+d+'"></path><path class="re-path-fg" stroke="'+color+'" d="'+d+'"></path>'+(option&&option.extra||'')+'</g>'
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
