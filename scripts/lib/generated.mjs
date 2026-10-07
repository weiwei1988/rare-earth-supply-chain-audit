// 生成領域を安全なJSONデータとして直列化・抽出するユーティリティ。
// 生成物はコードとして評価せず、許可した代入文だけをJSON.parseする。
// 生成領域は2種類ある。データ（src/data から）とアプリのコード（src/app から）。
export const DATA_REGION = "GENERATED DATA";
export const APP_REGION = "APP CODE";

function markerPatterns(region) {
  return {
    start: new RegExp(`^[ \\t]*\\/\\* ${region} START\\b[^\\r\\n]*\\*\\/[ \\t]*$`, "gm"),
    end: new RegExp(`^[ \\t]*\\/\\* ${region} END \\*\\/[ \\t]*$`, "gm"),
  };
}

function marker(source, pattern, label, path) {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`${path} に${label}マーカーが${matches.length}件あります。`);
  return matches[0];
}

function bounds(source, path, region = DATA_REGION) {
  const patterns = markerPatterns(region);
  const start = marker(source, patterns.start, `${region} START`, path);
  const end = marker(source, patterns.end, `${region} END`, path);
  if (end.index <= start.index) throw new Error(`${path} の ${region} マーカーの順序が不正です。`);
  const bodyStart = source.indexOf("\n", start.index + start[0].length) + 1;
  const bodyEnd = source.lastIndexOf("\n", end.index);
  if (bodyStart <= 0 || bodyEnd < bodyStart) throw new Error(`${path} の生成領域に改行がありません。`);
  return { start, end, bodyStart, bodyEnd };
}

// JSONをHTMLのscript raw-text内に置いても終了タグを作らない表現にする。
// U+2028/U+2029もJavaScriptソースとの互換性のため明示的にエスケープする。
export function serializeGeneratedJson(value, indent) {
  return JSON.stringify(value, null, indent || undefined)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function readGeneratedRegion(source, path, region = DATA_REGION) {
  const { bodyStart, bodyEnd } = bounds(source, path, region);
  return source.slice(bodyStart, bodyEnd);
}

export function replaceGeneratedRegion(source, generated, path, region = DATA_REGION) {
  const { start, end } = bounds(source, path, region);
  const head = source.slice(0, source.lastIndexOf("\n", start.index) + 1);
  const tail = source.slice(source.indexOf("\n", end.index + end[0].length) + 1);
  return head + generated + tail;
}

function skipWhitespace(source, cursor) {
  while (cursor < source.length && /\s/u.test(source[cursor])) cursor += 1;
  return cursor;
}

function parseDeclaration(region, cursor, declaration, path) {
  cursor = skipWhitespace(region, cursor);
  if (!region.startsWith(declaration, cursor)) {
    throw new Error(`${path} の生成領域に ${declaration} が所定の位置にありません。`);
  }
  cursor = skipWhitespace(region, cursor + declaration.length);
  const start = cursor;
  const opening = region[cursor];
  if (opening !== "[" && opening !== "{") throw new Error(`${path} の ${declaration} はJSON配列またはオブジェクトではありません。`);

  const stack = [];
  let inString = false;
  let escaped = false;
  for (; cursor < region.length; cursor += 1) {
    const char = region[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "[" || char === "{") stack.push(char);
    else if (char === "]" || char === "}") {
      const expected = char === "]" ? "[" : "{";
      if (stack.pop() !== expected) throw new Error(`${path} の ${declaration} の括弧が不正です。`);
      if (!stack.length) {
        const json = region.slice(start, cursor + 1);
        cursor = skipWhitespace(region, cursor + 1);
        if (region[cursor] !== ";") throw new Error(`${path} の ${declaration} の末尾にセミコロンがありません。`);
        return { value: JSON.parse(json), cursor: cursor + 1 };
      }
    }
  }
  throw new Error(`${path} の ${declaration} が完結していません。`);
}

function parseDeclarations(source, path, declarations) {
  const region = readGeneratedRegion(source, path);
  const values = {};
  let cursor = 0;
  for (const [declaration, name] of declarations) {
    const parsed = parseDeclaration(region, cursor, declaration, path);
    values[name] = parsed.value;
    cursor = parsed.cursor;
  }
  if (skipWhitespace(region, cursor) !== region.length) {
    throw new Error(`${path} の生成領域に許可されていない文があります。`);
  }
  return values;
}

export function parseHtmlData(html) {
  return parseDeclarations(html, "index.html", [
    ["var elements=", "elements"],
    ["var seed=", "seed"],
    ["var stages=", "stages"],
    ["var commerceSubs=", "commerceSubs"],
    ["var parts=", "parts"],
    ["var modules=", "modules"],
    ["var systems=", "systems"],
    ["var columnOrder=", "columnOrder"],
    ["var dependencyRows=", "dependencyRows"],
    ["var localeData=", "localeData"],
  ]);
}

