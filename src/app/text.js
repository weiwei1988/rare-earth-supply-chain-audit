// 文字列の整形。エスケープ、項目の省略、言い回しの除去、折り返し。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function summarizeItems(value,limit){
  var text=String(value||"").trim(),prefix="",body=text,match=text.match(/^(防衛装備庁納入品（[^）]+）：)(.*)$/);
  if(match){prefix=match[1];body=match[2]}
  var separator=body.indexOf("；")>=0?"；":body.indexOf("／")>=0?" ／ ":body.indexOf("、")>=0?"、":body.indexOf("，")>=0?"，":" ／ ",items=body.split(/\s*(?:；|／|、|，)\s*/).filter(Boolean);
  if(items.length<=limit)return{short:text,full:text,hidden:0};
  var remaining=items.length-limit,other=language==="en"?remaining+" more":language==="zh-CN"?"另有"+remaining+"项":"ほか"+remaining+"件";
  return{short:prefix+items.slice(0,limit).join(separator)+separator+other,full:text,hidden:remaining}
}
function marketPosition(value){
  return String(value||"").trim().split(/(?<=[。！？])\s*/u).filter(function(sentence){
    return !/(?:シェア|市場での地位|市場地位|出荷実績).*(?:未確認|非開示|不明|非公表|未公表|未確立|確認できない)/u.test(sentence)&&!/(?:market share|market position|shipment record).*(?:not verified|not confirmed|not disclosed|unknown|not public|unavailable)/iu.test(sentence)&&!/(?:市场份额|市场地位|出货记录).*(?:未确认|未披露|不明|未公开|无法确认)/u.test(sentence)
  }).join("").trim()
}
function companySummary(company){
  var productText=companyText(company,"prod"),defenseText=companyText(company,"def"),products=summarizeItems(productText,2),position=marketPosition(companyText(company,"pos"));
  var short=[products.short,position].filter(Boolean).join(" → ");
  var full=[productText,position].filter(Boolean).join(" → ");
  return{short:short||defenseText||"",full:full||defenseText||""}
}
function tagLabel(t){return t==="DyTb"?"Dy・Tb":t}
function shortenedLabel(value,limit){
  var chars=Array.from(String(value||""));
  return chars.length>limit?chars.slice(0,limit-1).join("")+"…":chars.join("")
}
function flowLabelLines(value,limit){
  var text=String(value||"").trim();
  if(!text)return[""];
  var words=text.split(/\s+/),lines=[],line="";
  words.forEach(function(word){
    var chunks=[];
    while(Array.from(word).length>limit){chunks.push(Array.from(word).slice(0,limit).join(""));word=Array.from(word).slice(limit).join("")}
    if(word)chunks.push(word);
    chunks.forEach(function(chunk){
      var candidate=line?line+" "+chunk:chunk;
      if(line&&Array.from(candidate).length>limit){lines.push(line);line=chunk}else{line=candidate}
    })
  });
  if(line)lines.push(line);
  return lines.length?lines:[text]
}
