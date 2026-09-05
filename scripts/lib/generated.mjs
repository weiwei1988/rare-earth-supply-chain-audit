// 生成領域（GENERATED DATA START / END）を取り出して評価するユーティリティ。
// マーカーで区切るため、整形やインデントを変えても抽出が壊れない。
const START = "GENERATED DATA START";
const END = "GENERATED DATA END";

export function readGeneratedRegion(source, path) {
  const startIndex = source.indexOf(START);
  const endIndex = source.indexOf(END, startIndex + START.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`${path} に生成領域のマーカーがありません。`);
  if (source.indexOf(START, startIndex + START.length) >= 0) throw new Error(`${path} に生成領域が2つ以上あります。`);
  const bodyStart = source.indexOf("\n", startIndex) + 1;
  const bodyEnd = source.lastIndexOf("\n", endIndex);
  return source.slice(bodyStart, bodyEnd);
}

// index.html の生成領域は depColors（CSS変数への対応表）を参照する。
const DEP_COLORS = {
  A: "var(--risk-a)",
  Y: "var(--y)",
  DyTb: "var(--dytb)",
  Sm: "var(--sm)",
  Sc: "var(--sc)",
  line: "var(--line)",
};

export function evaluateHtmlData(html) {
  const region = readGeneratedRegion(html, "index.html");
  return new Function("depColors", `${region}\nreturn {seed,stages,commerceSubs,mats,devices,dependencyRows};`)(DEP_COLORS);
}

// JSX の生成領域は COLORS（CSS変数への対応表）を参照する。
const JSX_COLORS = {
  A: "var(--re-risk-a)",
  Y: "var(--re-y)",
  DyTb: "var(--re-dytb)",
  Sm: "var(--re-sm)",
  Sc: "var(--re-sc)",
  line: "var(--re-line)",
};

export function evaluateJsxData(jsx) {
  const region = readGeneratedRegion(jsx, "src/希土類サプライチェーン.jsx");
  return new Function("COLORS", `${region}\nreturn {STAGES,SUBCATS,SEED,DEPENDENCY_ROWS};`)(JSX_COLORS);
}
