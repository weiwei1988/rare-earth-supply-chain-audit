// 「使い方ガイド」タブ：初めての利用者向けに、4つの画面の見方・使い方を、配置をデフォルメした模式図と番号付きの手順で紹介する。
// 模式図は画面の部品（元素カード・構造図・企業カード・詳細など）の位置関係だけを描き、実在の企業名や実データの数値は載せない。
// 「この画面を開く」は上部のタブを押したのと同じ動きにする。
// index.html のひとつの即時実行関数に連結される（scripts/build.mjs）。
// ファイル間で同じスコープを共有するため、import は使わない。

var guideLabels={
  ja:{
    tab:'使い方ガイド',eyebrow:'使い方ガイド',title:'はじめての方へ：4つの画面の見方と使い方',
    lead:'このサイトは、Y・Dy・Tb・Sm・Sc の希土類が、海外の資源・分離から素材・材料・部材・モジュール・機器を経て、日本の装備・システムへどうつながるかを、{count}社・事業単位の公開情報からまとめたデューデリジェンス（DD）用の静的データベースです。下の順に読むと、主な機能を一通り使えるようになります。',
    basics:'3つの基本',stagesTitle:'6つの工程（STAGE）',stagesAria:'上流から下流への6つの工程',
    stagesNote:'左（上流）から右（下流）へ流れます。STAGE 01 は海外の工程で、国内企業はいません。中国の比率を元素ごとに示します。',
    elementsTitle:'4つの元素と色',elementsNote:'本データベースの対象元素は、Y: イットリウム／Dy・Tb: ジスプロシウム・テルビウム／Sm: サマリウム／Sc: スカンジウムです。',
    critTitle:'クリティカル度（0〜100）',critNote:'その工程が止まると、下流にどれだけ広く影響が出るかを示す相対的な指標です。下流の国内企業数と、その工程の企業の主力製品のシェア水準から求めます。停止損失額や発生確率ではありません。',
    tocAria:'ガイドの目次',toc:['全体の構造をつかむ','1つの元素の流れを追う','装備から上流へさかのぼる','弱点になり得る工程を比べる'],
    open:'この画面を開く →',tip:'ヒント',figure:'{name}の画面の模式図',
    overviewLead:'すべての工程とサブカテゴリー（工程の中の分類）を1枚の図で見渡す画面です。上流は細く、下流ほど企業が増えて広がる「ラッパ形」になります。',
    overviewSteps:[
      ['元素を1つ選ぶ','上の元素カードを押すと、その元素を扱うサブカテゴリーが元素の色で塗られ、その元素が流れる線だけが太く色付きになります。扱わないサブカテゴリーは薄くなります。もう一度押すか「全元素を表示」で元に戻ります。'],
      ['サブカテゴリーを選ぶ','図の四角を押すと、同じ元素でつながる上流・下流の工程と線が強調され、ほかは暗くなります。もう一度押すと選択が外れます。'],
      ['企業を探す','選んだサブカテゴリーの国内企業カードが下に並びます。何も選ばなくても、検索欄に企業名・製品・技術を入れると探せます。スペースで区切ると、すべての語を含む企業だけを表示します。'],
      ['企業の詳細を読む','企業カードを押すと、所有・売上・主要製品・市場での地位・防衛用途・中国依存などが横（狭い画面では下）に出ます。'],
      ['元に戻す','図の余白をクリックすると、サブカテゴリーの選択 → 元素の選択の順に一段ずつ戻ります。']
    ],
    overviewTip:'左端の「海外の資源・分離」を押すと、元素ごとの中国の比率の内訳（公的統計など）が見られます。',
    flowLead:'元素を1つ選び、その元素が海外からどの工程へ分かれ、どの装備・システムへ届くかを帯の流れで追う画面です。',
    flowSteps:[
      ['元素を選ぶ','上の元素カードで、追いかける元素を1つ選びます。'],
      ['帯の太さを読む','帯の太さは、その工程にその元素で関わる国内企業（事業単位）の数です。物量・金額・商流の比率ではありません。'],
      ['工程を選ぶ','工程の棒を押すと、つながる経路だけが残り、関わる国内企業のカードと詳細が下に出ます。'],
      ['クリティカル度を見る','STAGE 02〜05 の工程の横の色付きの数字がクリティカル度です。色が濃い（赤に近い）ほど、下流への影響が広い工程です。']
    ],
    flowTip:'図の下に、クリティカル度の計算方法とシェア水準の判定基準をまとめています。「全体像で見る」を押すと、同じ元素を選んだ全体像に移れます。',
    flowCaption:'工程を選ぶと、関わる国内企業のカードと企業詳細がこの下に出る',
    eqLead:'装備・システム（航空機、レーダー、衛星など）を1つ選び、それを作るためのモジュール・部材・材料・素材を、海外までさかのぼって見る画面です。',
    eqSteps:[
      ['装備・システムを選ぶ','上のカードから1つ選びます。カードの色の帯は、その装備の経路上にある工程×元素を、クリティカル度の段ごとに数えたものです。'],
      ['元素で強調する','図の右上の元素ボタンで、1つの元素の帯と工程だけを強調できます。'],
      ['工程を選ぶ','図の工程のカードを押すと、その工程の国内企業と企業詳細が下に出ます。カードのチップは、元素ごとの関わる社数とクリティカル度です。'],
      ['企業を確かめる','企業カードを押すと、企業詳細が横（狭い画面では下）に出ます。']
    ],
    eqTip:'図は左が下流（装備）、右が上流（海外）です。全体像・元素別フローとは左右が逆になっている点に注意してください。',
    crLead:'STAGE 02〜05 のすべての工程×元素のクリティカル度を、表と順位で比べる画面です。止まると影響が広い工程を探すのに使います。',
    crSteps:[
      ['表で見比べる','行が工程、列が元素です。色付きのマスがクリティカル度で、「—」はその元素が経路に入らない工程です。'],
      ['順位を切り替える','右のランキングは「クリティカル度が高い順」「下流企業が多い順」「シェア水準が高い順」に並べ替えられます。棒の長さは常にクリティカル度です。'],
      ['内訳を読む','マスやランキングの行を押すと、下に計算の内訳、最大のシェア水準と代表企業、工程別の下流企業数、シェアの根拠と出典が出ます。'],
      ['企業を確かめる','内訳の下の「この工程の企業」からカードを選ぶと、企業詳細が出ます。']
    ],
    crTip:'クリティカル度は、下流の広さとシェアの高さを掛け合わせた相対指標です。在庫や代替可能性、中国依存度そのものを測るものではありません。',
    sorts:['点数','下流','シェア'],
    notesTitle:'読むときの注意',
    notes:['収録しているのは公開情報で確認できた国内企業（事業単位）です。「0社」は、データ上で確認できていないという意味で、存在しないことの証明ではありません。','帯や棒の太さは企業数で、物量・金額・市場規模・実際の商流の比率を示すものではありません。','元素のフラグは、製品の構成や製造工程から使うと考えられるものも含めています。個別製品の含有を確認したものとは限りません。']
  },
  en:{
    tab:'How to Use',eyebrow:'How to use',title:'Getting started: reading and using the four views',
    lead:'This site is a static due-diligence (DD) database compiled from public information on {count} companies / business units. It shows how the rare earths Y, Dy, Tb, Sm and Sc travel from overseas resources and separation through feedstocks, materials, components and modules & equipment into Japanese defense equipment and systems. Read the sections below in order to learn every main feature.',
    basics:'Three basics',stagesTitle:'Six stages',stagesAria:'Six stages from upstream to downstream',
    stagesNote:'Flow runs from upstream (left) to downstream (right). STAGE 01 is overseas and has no domestic companies; it shows China’s share for each element.',
    elementsTitle:'Four elements and their colours',elementsNote:'The elements covered by this database are Y: yttrium / Dy・Tb: dysprosium and terbium / Sm: samarium / Sc: scandium.',
    critTitle:'Criticality (0–100)',critNote:'A relative index of how widely a stoppage at that stage would spread downstream. It combines the number of downstream domestic companies with the share level of the stage’s main products. It is not an estimate of loss or probability.',
    tocAria:'Guide contents',toc:['Grasp the whole structure','Follow one element','Trace a system upstream','Compare potential weak points'],
    open:'Open this view →',tip:'Tip',figure:'Schematic of the {name} view',
    overviewLead:'One diagram of every stage and subcategory. It is narrow upstream and widens downstream as the number of companies grows — a “trumpet” shape.',
    overviewSteps:[
      ['Choose one element','Press an element card to colour the subcategories that handle it and thicken only the links it flows through. Subcategories that do not handle it fade out. Press it again, or “Show all elements”, to reset.'],
      ['Choose a subcategory','Press a box in the diagram to highlight the upstream and downstream stages and links connected by the same element; the rest dims. Press it again to clear the selection.'],
      ['Find companies','Company cards for the selected subcategory appear below. Without a selection, type a company, product or technology into the search box. Separate terms with spaces to require every keyword.'],
      ['Read the details','Press a company card to see ownership, revenue, key products, market position, defense uses and China exposure beside it (below it on narrow screens).'],
      ['Step back','Click a blank area of the diagram to step back: first the subcategory selection, then the element selection.']
    ],
    overviewTip:'Press “Overseas resources & separation” at the far left to see the breakdown of China’s share by element (official statistics and other sources).',
    flowLead:'Choose one element and follow, as ribbons, where it branches from overseas and which systems it reaches.',
    flowSteps:[
      ['Choose an element','Use the element cards to pick the element to follow.'],
      ['Read ribbon width','Ribbon width is the number of domestic companies (business units) involved with that element at the stage — not volume, value or trade share.'],
      ['Choose a stage','Press a stage bar to keep only the connected paths and list the domestic companies and their details below.'],
      ['Check criticality','The coloured numbers beside STAGE 02–05 categories are criticality scores. The darker (closer to red), the wider the downstream impact.']
    ],
    flowTip:'The calculation method and the share-level criteria are summarised below the diagram. “View in overview” opens the overview with the same element selected.',
    flowCaption:'Select a stage to list its domestic companies and details here',
    eqLead:'Choose a system (aircraft, radar, satellite, etc.) and trace the modules, components, materials and feedstocks it depends on back to overseas sources.',
    eqSteps:[
      ['Choose a system','Pick one of the cards at the top. The coloured bar on each card counts the stage × element points on its paths by criticality band.'],
      ['Highlight an element','Use the element buttons at the top right of the diagram to highlight one element’s ribbons and stages.'],
      ['Choose a stage','Press a stage card in the diagram to list its domestic companies and details below. The chips show, per element, the number of companies and the criticality.'],
      ['Check a company','Press a company card to see its details beside it (below it on narrow screens).']
    ],
    eqTip:'Here the left side is downstream (systems) and the right side is upstream (overseas) — the reverse of the overview and element flows.',
    crLead:'Compares the criticality of every stage × element in STAGE 02–05 as a matrix and a ranking. Use it to find the stages whose stoppage would spread most widely.',
    crSteps:[
      ['Compare in the matrix','Rows are categories and columns are elements. Coloured cells show criticality; “—” means the element does not pass through that category.'],
      ['Switch the ranking','The ranking can be sorted by highest criticality, most downstream companies or highest share level. Bar length always shows criticality.'],
      ['Read the breakdown','Press a cell or ranking row to see the calculation, the highest share level and its company, downstream companies by stage, and the share evidence and sources below.'],
      ['Check a company','Choose a card under “Category companies” to see the company’s details.']
    ],
    crTip:'Criticality multiplies downstream reach by share level. It does not measure stockpiles, substitutability or China dependence itself.',
    sorts:['Score','Down','Share'],
    notesTitle:'Points to keep in mind',
    notes:['Only domestic companies (business units) confirmed in public information are included. “0 companies” means none are confirmed in the data — not proof that none exist.','Ribbon and bar widths are company counts; they do not show volume, value, market size or actual trade shares.','Element flags include elements that a product’s composition or manufacturing process is expected to use; they are not always confirmed for individual products.']
  },
  'zh-CN':{
    tab:'使用指南',eyebrow:'使用指南',title:'初次使用：四个画面的看法与用法',
    lead:'本站是一个面向尽职调查（DD）的静态数据库，基于{count}家企业/业务单位的公开信息整理而成，展示 Y、Dy、Tb、Sm、Sc 等稀土如何从海外资源与分离，经由素材、材料、部件、模块与设备，连接到日本的装备与系统。按以下顺序阅读，即可掌握主要功能。',
    basics:'三个基本概念',stagesTitle:'六个阶段（STAGE）',stagesAria:'从上游到下游的六个阶段',
    stagesNote:'从左（上游）流向右（下游）。STAGE 01 为海外工序，没有国内企业，按元素显示中国占比。',
    elementsTitle:'四种元素与颜色',elementsNote:'本数据库的对象元素为 Y：钇／Dy・Tb：镝・铽／Sm：钐／Sc：钪。',
    critTitle:'关键度（0〜100）',critNote:'表示该工序一旦停止，对下游影响范围有多广的相对指标。根据下游国内企业数量与该工序企业主要产品的份额等级计算，并非停产损失金额或发生概率。',
    tocAria:'指南目录',toc:['把握整体结构','追踪一种元素','从装备向上游追溯','比较可能的薄弱环节'],
    open:'打开此画面 →',tip:'提示',figure:'{name}画面示意图',
    overviewLead:'用一张图纵览所有阶段与子类别（阶段内的分类）。上游较窄，越往下游企业越多，呈“喇叭形”展开。',
    overviewSteps:[
      ['选择一种元素','点击上方元素卡片后，处理该元素的子类别会以元素颜色填充，只有该元素流经的连线会加粗着色；不涉及的子类别会变淡。再次点击或点击“显示全部元素”即可恢复。'],
      ['选择子类别','点击图中的方框，由同一元素相连的上游与下游工序及连线会被突出显示，其余变暗。再次点击即可取消。'],
      ['查找企业','所选子类别的国内企业卡片会显示在下方。即使未作选择，也可在搜索框中输入企业名称、产品或技术进行查找；用空格分隔时，仅显示包含全部关键词的企业。'],
      ['阅读企业详情','点击企业卡片，所有权、营收、主要产品、市场地位、国防用途、对华依赖等信息会显示在旁边（窄屏时显示在下方）。'],
      ['返回上一步','点击图中空白处，会按“子类别选择 → 元素选择”的顺序逐级返回。']
    ],
    overviewTip:'点击最左侧的“海外资源与分离”，可查看各元素中国占比的明细（官方统计等）。',
    flowLead:'选择一种元素，以流带追踪该元素从海外分流到哪些工序、最终到达哪些装备与系统。',
    flowSteps:[
      ['选择元素','用上方元素卡片选择要追踪的元素。'],
      ['阅读带宽','带宽表示在该工序涉及该元素的国内企业（业务单位）数量，并非实物数量、金额或贸易比例。'],
      ['选择工序','点击工序的竖条，只保留相连的路径，相关国内企业卡片与详情会显示在下方。'],
      ['查看关键度','STAGE 02〜05 各工序旁带颜色的数字即关键度。颜色越深（越接近红色），对下游的影响越广。']
    ],
    flowTip:'图的下方汇总了关键度的计算方法与份额等级的判定标准。点击“在全景中查看”，可切换到选中同一元素的全景。',
    flowCaption:'选择工序后，相关国内企业卡片与详情会显示在此处下方',
    eqLead:'选择一个装备或系统（飞机、雷达、卫星等），逆向追溯制造它所需的模块、部件、材料与原料，一直追溯到海外。',
    eqSteps:[
      ['选择装备或系统','从上方卡片中选择一个。卡片上的色条，是按关键度区间统计该装备路径上的工序×元素处数。'],
      ['按元素突出显示','用图右上方的元素按钮，可只突出显示一种元素的流带与工序。'],
      ['选择工序','点击图中的工序卡片，该工序的国内企业与详情会显示在下方。卡片上的标签显示各元素涉及的企业数与关键度。'],
      ['确认企业','点击企业卡片，企业详情会显示在旁边（窄屏时显示在下方）。']
    ],
    eqTip:'此图左侧为下游（装备），右侧为上游（海外），与全景和元素流向的左右方向相反，请注意。',
    crLead:'以矩阵和排名比较 STAGE 02〜05 所有工序×元素的关键度，用于找出一旦停止影响最广的工序。',
    crSteps:[
      ['在矩阵中比较','行是工序，列是元素。带颜色的格子是关键度，“—”表示该元素不经过此工序。'],
      ['切换排名','右侧排名可按“关键度从高到低”“下游企业数从多到少”“份额等级从高到低”排序。条形长度始终表示关键度。'],
      ['阅读明细','点击格子或排名行，下方会显示计算明细、最高份额等级及代表企业、各阶段下游企业数、份额依据与出处。'],
      ['确认企业','从明细下方的“本工序企业及份额依据”中选择卡片，即可查看企业详情。']
    ],
    crTip:'关键度是下游广度与份额高低相乘得到的相对指标，并不衡量库存、可替代性或对华依赖度本身。',
    sorts:['分数','下游','份额'],
    notesTitle:'阅读时的注意事项',
    notes:['收录的是通过公开信息能够确认的国内企业（业务单位）。“0家”表示数据中未能确认，并不证明不存在。','流带和竖条的粗细表示企业数量，不代表实物数量、金额、市场规模或实际贸易比例。','元素标记也包括根据产品构成或制造工序推断会使用的元素，不一定已确认个别产品的含量。']
  }
};
function guideText(key,values){
  var table=guideLabels[language]||guideLabels.ja,value=table[key]!==undefined?table[key]:guideLabels.ja[key];
  Object.keys(values||{}).forEach(function(name){value=value.split('{'+name+'}').join(values[name])});
  return value
}

// ---- 模式図の部品 ----
function gdPin(n,x,y){return'<g class="re-gd-pin" transform="translate('+x+' '+y+')"><circle r="11"/><text y="4">'+n+'</text></g>'}
function gdChipRow(x0,step,selected){
  return elements.map(function(el,i){
    return'<g transform="translate('+(x0+i*step)+' 10)"><rect class="re-gd-card'+(el===selected?' is-sel':'')+'" width="84" height="30" rx="7"/><circle cx="14" cy="15" r="5" fill="'+colors[el]+'"/><text class="re-gd-t" x="26" y="19">'+esc(tagLabel(el))+'</text></g>'
  }).join('')
}
function gdRibbon(x1,y1a,y1b,x2,y2a,y2b,color,dim){
  var m=(x1+x2)/2;
  return'<path class="re-gd-rib'+(dim?' is-dim':'')+'" fill="'+color+'" d="M'+x1+','+y1a+' C'+m+','+y1a+' '+m+','+y2a+' '+x2+','+y2a+' L'+x2+','+y2b+' C'+m+','+y2b+' '+m+','+y1b+' '+x1+','+y1b+' Z"/>'
}
function gdBadge(x,y,value,tier){return'<g class="re-criticality re-criticality-'+tier+'" transform="translate('+x+' '+y+')"><rect width="28" height="15" rx="7"/><text class="re-gd-badge" x="14" y="11">'+value+'</text></g>'}
function gdLines(x,y,widths,gap){return widths.map(function(w,i){return'<rect class="re-gd-line" x="'+x+'" y="'+(y+i*gap)+'" width="'+w+'" height="5" rx="2"/>'}).join('')}
function gdSvg(name,height,body){return'<svg class="re-gd-fig" viewBox="0 0 620 '+height+'" role="img" aria-label="'+esc(guideText('figure',{name:name}))+'">'+body+'</svg>'}

// 全体像：Y を選び、STAGE 04 のサブカテゴリーを選んだ状態
function guideOverviewFigure(){
  var cols=[
    {x:18,nodes:[[118,56]]},
    {x:118,nodes:[[96,26],[128,26],[160,26]]},
    {x:218,nodes:[[82,24],[112,24],[142,24],[172,24]]},
    {x:318,nodes:[[70,24],[100,24],[130,24],[160,24],[190,24]]},
    {x:418,nodes:[[60,22],[86,22],[112,22],[138,22],[164,22],[190,22]]},
    {x:518,nodes:[[52,20],[76,20],[100,20],[124,20],[148,20],[172,20],[196,20]]}
  ],w=78,on={'1-0':1,'2-1':1,'3-1':1,'4-2':1,'4-3':1,'5-2':1,'5-4':1},sel='3-1',edges='',horn='',nodes='';
  function center(c,i){var n=cols[c].nodes[i];return[cols[c].x,n[0]+n[1]/2]}
  [[0,0,1,0],[0,0,1,1],[0,0,1,2],[1,0,2,0],[1,0,2,1],[1,1,2,2],[1,2,2,3],[2,0,3,0],[2,1,3,1],[2,2,3,2],[2,3,3,4],[3,0,4,0],[3,1,4,2],[3,1,4,3],[3,2,4,1],[3,3,4,4],[3,4,4,5],[4,0,5,0],[4,1,5,1],[4,2,5,2],[4,3,5,4],[4,4,5,5],[4,5,5,6]].forEach(function(link){
    var a=center(link[0],link[1]),b=center(link[2],link[3]),ka=link[0]+'-'+link[1],kb=link[2]+'-'+link[3];
    var hot=(on[ka]||ka===sel)&&(on[kb]||kb===sel),sx=a[0]+w,mx=(sx+b[0])/2;
    edges+='<path class="re-gd-edge '+(hot?'is-on':'is-dim')+'" d="M'+sx+','+a[1]+' C'+mx+','+a[1]+' '+mx+','+b[1]+' '+b[0]+','+b[1]+'"/>'
  });
  cols.forEach(function(col,c){
    if(c>0){var last=col.nodes[col.nodes.length-1],top=col.nodes[0][0]-6,bottom=last[0]+last[1]+6;horn+='<rect class="re-gd-horn" x="'+(col.x-5)+'" y="'+top+'" width="'+(w+10)+'" height="'+(bottom-top)+'" rx="8"/>'}
    col.nodes.forEach(function(node,i){
      var key=c+'-'+i;
      nodes+='<rect class="re-gd-node '+(key===sel?'is-sel':on[key]?'is-on':'is-dim')+'" x="'+col.x+'" y="'+node[0]+'" width="'+w+'" height="'+(node[1]-4)+'" rx="4"/>'
    })
  });
  var bars=elements.map(function(el,i){return'<rect x="26" y="'+(128+i*11)+'" width="'+[56,60,58,48][i]+'" height="4" rx="2" fill="'+colors[el]+'"/>'}).join('');
  var heads=cols.map(function(col,c){return'<text class="re-gd-cap" x="'+col.x+'" y="58">STAGE 0'+(c+1)+'</text>'}).join('');
  var lower='<g transform="translate(18 270)"><rect class="re-gd-card" width="300" height="22" rx="6"/><text class="re-gd-cap" x="10" y="15">'+esc(tr('searchPlaceholder'))+'</text>'+
    [0,1,2].map(function(i){return'<rect class="re-gd-card" x="'+(i*102)+'" y="30" width="96" height="44" rx="6"/><rect class="re-gd-line" x="'+(i*102+8)+'" y="40" width="56" height="5" rx="2"/><circle cx="'+(i*102+12)+'" cy="58" r="3.5" fill="'+colors[elements[i]]+'"/><rect class="re-gd-line" x="'+(i*102+20)+'" y="56" width="40" height="4" rx="2"/>'}).join('')+
    '<rect class="re-gd-card is-strong" x="320" y="0" width="276" height="74" rx="8"/>'+gdLines(334,12,[120,220,190,160],15)+'</g>';
  return gdSvg(tr('overview'),348,'<g style="--re-gd-el:'+colors.Y+'">'+gdChipRow(18,92,'Y')+heads+'<g transform="translate(0 18)">'+horn+edges+nodes+bars+'</g>'+lower+'</g>'+
    gdPin(1,14,10)+gdPin(2,330,122)+gdPin(3,14,270)+gdPin(4,334,270)+gdPin(5,604,250))
}

// 元素別フロー：Dy・Tb を選んだ状態
function guideFlowFigure(){
  var c=colors.DyTb,xs=[30,140,250,360,470,580];
  function bar(x,y,h){return'<rect x="'+x+'" y="'+y+'" width="10" height="'+h+'" rx="3" fill="'+c+'"/>'}
  var heads=xs.map(function(x,i){return'<text class="re-gd-cap" x="'+(i===0?x:i===5?x+10:x+5)+'" y="70" text-anchor="'+(i===0?'start':i===5?'end':'middle')+'">STAGE 0'+(i+1)+'</text>'}).join('');
  var ribbons=gdRibbon(40,130,210,140,110,150,c)+gdRibbon(40,210,250,140,200,240,c)+gdRibbon(150,110,150,250,100,140,c)+gdRibbon(150,200,240,250,210,250,c)+
    gdRibbon(260,100,140,360,90,130,c)+gdRibbon(260,210,250,360,220,250,c)+gdRibbon(370,90,122,470,96,128,c)+gdRibbon(370,222,250,470,200,228,c,true)+
    gdRibbon(480,96,128,580,84,108,c)+gdRibbon(480,96,128,580,150,174,c)+gdRibbon(480,200,228,580,214,238,c,true);
  var bars=bar(30,130,120)+bar(140,110,40)+bar(140,200,40)+bar(250,100,40)+bar(250,210,40)+bar(360,90,40)+bar(360,210,40)+bar(470,96,32)+bar(470,200,28)+bar(580,84,24)+bar(580,150,24)+bar(580,214,24);
  var badges=gdBadge(156,92,69,3)+gdBadge(266,82,67,3)+gdBadge(376,72,65,3)+gdBadge(486,80,52,3)+gdBadge(376,248,35,2);
  var caption='<g transform="translate(20 268)"><rect class="re-gd-card" width="580" height="24" rx="6"/><text class="re-gd-cap" x="12" y="16">'+esc(guideText('flowCaption'))+'</text></g>';
  return gdSvg(tr('elementFlow'),300,gdChipRow(20,92,'DyTb')+heads+ribbons+bars+badges+caption+gdPin(1,112,10)+gdPin(2,110,138)+gdPin(3,255,120)+gdPin(4,473,88))
}

// 装備からの逆算：右上の元素ボタンで Sm を選んだ状態（Sm の帯と工程を強調し、ほかの元素は薄く）
function guideEquipmentFigure(){
  var xs=[20,122,224,326,428,530];
  var cards=[0,1,2,3,4,5].map(function(i){return'<g transform="translate('+(20+i*98)+' 10)"><rect class="re-gd-card'+(i===1?' is-sel':'')+'" width="90" height="56" rx="8"/><rect class="re-gd-icon" x="9" y="9" width="16" height="16" rx="4"/><rect class="re-gd-line" x="31" y="13" width="48" height="5" rx="2"/><rect class="re-criticality-3 re-gd-crit-bar" x="9" y="38" width="72" height="5" rx="2"/></g>'}).join('');
  var focus='<g transform="translate(400 76)">'+[eqText('all')].concat(elements.map(tagLabel)).map(function(label,i){return'<rect class="re-gd-pill'+(i===3?' is-sel':'')+'" x="'+(i*42)+'" y="0" width="38" height="14" rx="7"/><text class="re-gd-mini" x="'+(i*42+19)+'" y="10">'+esc(label)+'</text>'}).join('')+'</g>';
  var heads=['06','05','04','03','02','01'].map(function(code,i){return'<text class="re-gd-cap" x="'+xs[i]+'" y="104">STAGE '+code+'</text>'}).join('');
  function rib(x1,y1,x2,y2,color,dim){return gdRibbon(x1,y1,y1+8,x2,y2,y2+8,color,dim)}
  function node(x,y,pick,els,dim){
    return'<g transform="translate('+x+' '+y+')"'+(dim?' class="re-gd-dim"':'')+'><rect class="re-gd-node'+(pick?' is-pick':'')+'" width="80" height="40" rx="6"/><rect class="re-gd-line" x="8" y="8" width="54" height="5" rx="2"/>'+
      els.map(function(el,k){return'<rect class="re-gd-chip" x="'+(8+k*24)+'" y="22" width="20" height="10" rx="5"/><circle cx="'+(13+k*24)+'" cy="27" r="2.5" fill="'+colors[el]+'"/>'}).join('')+'</g>'
  }
  var sm=colors.Sm,y=colors.Y;
  var ribbons=rib(100,166,122,136,sm)+rib(100,176,122,196,y,true)+rib(202,136,224,126,sm)+rib(202,196,224,206,y,true)+rib(304,126,326,136,sm)+rib(304,206,326,206,y,true)+
    rib(406,136,428,156,sm)+rib(406,206,428,176,y,true)+rib(508,156,530,136,sm)+rib(508,176,530,196,y,true);
  var nodes=node(20,150,false,[])+node(122,120,true,['Sm'])+node(122,186,false,['Y'],true)+node(224,110,false,['Sm'])+node(224,196,false,['Y'],true)+
    node(326,120,false,['Sm'])+node(326,190,false,['Y'],true)+node(428,146,false,['Y','Sm'])+node(530,120,false,['Sm'])+node(530,180,false,['Y'],true);
  var lower='<g transform="translate(20 262)"><rect class="re-gd-card" width="380" height="58" rx="8"/>'+[0,1,2].map(function(i){return'<rect class="re-gd-card" x="'+(10+i*122)+'" y="10" width="114" height="38" rx="6"/><rect class="re-gd-line" x="'+(18+i*122)+'" y="20" width="70" height="5" rx="2"/>'}).join('')+
    '<rect class="re-gd-card is-strong" x="390" width="190" height="58" rx="8"/>'+gdLines(402,12,[120,160,140],14)+'</g>';
  return gdSvg(eqText('tab'),330,cards+focus+heads+ribbons+nodes+lower+gdPin(1,112,12)+gdPin(2,392,76)+gdPin(3,112,120)+gdPin(4,16,262))
}

// クリティカル度マップ：マトリックス・ランキング・下の内訳
function guideCriticalityFigure(){
  var tiers=[[4,3,3,0],[3,3,2,2],[2,3,0,1],[3,0,2,1],[2,2,1,0],[1,2,2,1]],base={1:22,2:41,3:61,4:78};
  var head=elements.map(function(el,i){return'<circle cx="'+(134+i*60)+'" cy="20" r="4" fill="'+colors[el]+'"/><text class="re-gd-t" x="'+(141+i*60)+'" y="24">'+esc(tagLabel(el))+'</text>'}).join('');
  var cells='';
  tiers.forEach(function(row,r){
    cells+='<rect class="re-gd-line" x="20" y="'+(42+r*30)+'" width="90" height="6" rx="2"/>';
    row.forEach(function(tier,c){
      var x=130+c*60,y=34+r*30;
      cells+=tier?'<g class="re-criticality re-criticality-'+tier+'" transform="translate('+x+' '+y+')"><rect width="52" height="24" rx="5"/><text class="re-gd-badge" x="26" y="16">'+(base[tier]+r)+'</text></g>':'<text class="re-gd-cap" x="'+(x+22)+'" y="'+(y+16)+'">—</text>'
    })
  });
  var rank=[78,70,66,61,55,49].map(function(v,i){return'<g transform="translate(400 '+(40+i*26)+')"><text class="re-gd-mini" x="8" y="12">'+(i+1)+'</text><rect class="re-gd-line" x="22" y="4" width="90" height="5" rx="2"/><rect class="re-criticality-'+criticalityTier(v)+' re-gd-crit-bar" x="22" y="13" width="'+(v*1.6)+'" height="4" rx="2"/></g>'}).join('');
  var sorts='<g transform="translate(400 16)">'+guideText('sorts').map(function(label,i){return'<rect class="re-gd-pill'+(i===0?' is-sel':'')+'" x="'+(i*56)+'" y="0" width="50" height="14" rx="7"/><text class="re-gd-mini" x="'+(i*56+25)+'" y="10">'+esc(label)+'</text>'}).join('')+'</g>';
  var lower='<g transform="translate(10 232)"><rect class="re-gd-card is-strong" width="600" height="90" rx="10"/><rect class="re-gd-line" x="16" y="14" width="180" height="7" rx="3"/>'+
    [0,1,2].map(function(i){return'<rect class="re-gd-card" x="'+(16+i*120)+'" y="32" width="110" height="44" rx="6"/>'+gdLines(26+i*120,44,[60,80],14)}).join('')+
    [0,1].map(function(i){return'<rect class="re-gd-card" x="'+(392+i*102)+'" y="32" width="94" height="44" rx="6"/><rect class="re-gd-line" x="'+(402+i*102)+'" y="46" width="60" height="5" rx="2"/>'}).join('')+'</g>';
  return gdSvg(crText('tab'),330,'<rect class="re-gd-card" x="10" y="6" width="370" height="214" rx="10"/>'+head+cells+'<rect class="re-gd-card" x="390" y="6" width="220" height="214" rx="10"/>'+sorts+rank+lower+
    gdPin(1,126,34)+gdPin(2,396,12)+gdPin(3,18,236)+gdPin(4,392,268))
}

// ---- ページの組み立て ----
function guideSection(id,no,view,name,lead,figure,steps,tip){
  return'<section class="re-gd-panel re-gd-section" id="re-guide-'+id+'" aria-labelledby="re-guide-'+id+'-title">'+
    '<div class="re-gd-section-head"><span class="re-gd-no">'+no+'</span><div><h3 class="re-gd-h" id="re-guide-'+id+'-title">'+esc(name)+'</h3><p class="re-gd-lead">'+esc(lead)+'</p></div>'+
    '<button class="re-gd-open" type="button" data-guide-open="'+view+'">'+esc(guideText('open'))+'</button></div>'+
    '<div class="re-gd-body"><figure class="re-gd-figure">'+figure+'</figure><ol class="re-gd-steps">'+steps.map(function(step){return'<li><strong>'+esc(step[0])+'</strong><span>'+esc(step[1])+'</span></li>'}).join('')+'</ol></div>'+
    '<p class="re-gd-tip"><b>'+esc(guideText('tip'))+'</b><span>'+esc(tip)+'</span></p></section>'
}
function guideBasicsHtml(){
  var stageItems=stages.map(function(stage){return'<li><span>STAGE '+esc(stage.code)+'</span>'+esc(stageText(stage,'label'))+'</li>'}).join('');
  var elementItems=elements.map(function(el){return'<li><i style="background:'+colors[el]+'"></i>'+esc(tagLabel(el))+'</li>'}).join('');
  var tierItems=criticalityBands.map(function(band,i){return'<li><span class="re-criticality re-criticality-'+band.tier+'">'+esc(band.label)+'</span>'+esc(crText('bands')[i])+'</li>'}).join('');
  function basic(no,title,body,note,wide){return'<div class="re-gd-basic'+(wide?' is-wide':'')+'"><p class="re-gd-basic-title"><span class="re-gd-no is-small">'+no+'</span>'+esc(title)+'</p>'+body+'<p class="re-gd-note">'+esc(note)+'</p></div>'}
  return'<section class="re-gd-panel" aria-labelledby="re-guide-basics-title"><h3 class="re-gd-h" id="re-guide-basics-title">'+esc(guideText('basics'))+'</h3><div class="re-gd-basics">'+
    basic(1,guideText('stagesTitle'),'<div class="re-gd-stages-scroll"><ol class="re-gd-stages" aria-label="'+esc(guideText('stagesAria'))+'">'+stageItems+'</ol></div>',guideText('stagesNote'),true)+
    basic(2,guideText('elementsTitle'),'<ul class="re-gd-els">'+elementItems+'</ul>',guideText('elementsNote'))+
    basic(3,guideText('critTitle'),'<ul class="re-gd-tiers">'+tierItems+'</ul>',guideText('critNote'))+
    '</div></section>'
}
function renderGuide(){
  var host=root.querySelector('#re-view-guide'),names=[tr('overview'),tr('elementFlow'),eqText('tab'),crText('tab')],ids=['overview','flow','equipment','criticality'],toc=guideText('toc');
  host.innerHTML='<div class="re-element-flow-head"><div><p class="re-gd-eyebrow">'+esc(guideText('eyebrow'))+'</p><h2 class="re-element-flow-title">'+esc(guideText('title'))+'</h2><p class="re-gd-intro">'+esc(guideText('lead',{count:data.length}))+'</p></div></div>'+
    guideBasicsHtml()+
    '<nav class="re-gd-toc" aria-label="'+esc(guideText('tocAria'))+'">'+ids.map(function(id,i){return'<a class="re-gd-toc-item" href="#re-guide-'+id+'"><span class="re-gd-no is-small">'+(i+1)+'</span><b>'+esc(names[i])+'</b><small>'+esc(toc[i])+'</small></a>'}).join('')+'</nav>'+
    guideSection('overview',1,'overview',names[0],guideText('overviewLead'),guideOverviewFigure(),guideText('overviewSteps'),guideText('overviewTip'))+
    guideSection('flow',2,'element-flow',names[1],guideText('flowLead'),guideFlowFigure(),guideText('flowSteps'),guideText('flowTip'))+
    guideSection('equipment',3,'equipment',names[2],guideText('eqLead'),guideEquipmentFigure(),guideText('eqSteps'),guideText('eqTip'))+
    guideSection('criticality',4,'criticality',names[3],guideText('crLead'),guideCriticalityFigure(),guideText('crSteps'),guideText('crTip'))+
    '<section class="re-gd-panel re-gd-notes" aria-labelledby="re-guide-notes-title"><h3 class="re-gd-h" id="re-guide-notes-title">'+esc(guideText('notesTitle'))+'</h3><ul>'+guideText('notes').map(function(note){return'<li>'+esc(note)+'</li>'}).join('')+'</ul></section>'
}
// タブは「サプライチェーン全体像」の前に、表示領域は全体像の前に置く。ページを開いたときは、このガイドを最初に表示する
root.querySelector('#re-tab-overview').insertAdjacentHTML('beforebegin','<button class="re-view-tab" id="re-tab-guide" data-view="guide" type="button" role="tab" aria-selected="false" tabindex="-1" aria-controls="re-view-guide"></button>');
root.querySelector('#re-view-overview').insertAdjacentHTML('beforebegin','<section class="re-view-panel re-guide" id="re-view-guide" role="tabpanel" aria-labelledby="re-tab-guide" hidden></section>');
root.querySelector('#re-view-guide').addEventListener('click',function(event){
  var smooth=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  var open=event.target.closest('[data-guide-open]');
  if(open){setView(open.dataset.guideOpen);root.querySelector('.re-view-tabs').scrollIntoView({behavior:smooth,block:'start'});return}
  // 目次はページ内の見出しへ送る（URL は書き換えない）
  var link=event.target.closest('.re-gd-toc-item');
  if(link){event.preventDefault();var target=root.querySelector(link.getAttribute('href'));if(target)target.scrollIntoView({behavior:smooth,block:'start'})}
});
