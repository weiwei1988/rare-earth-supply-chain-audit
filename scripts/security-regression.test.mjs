import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { assertPublicHttpsUrl, assertValidSubcategoryId, ValidationError } from "./lib/dataset.mjs";
import { parseHtmlData, serializeGeneratedJson } from "./lib/generated.mjs";

const start = "/* GENERATED DATA START — test */";
const end = "/* GENERATED DATA END */";

function htmlFixture(seed, extra = "") {
  const value = serializeGeneratedJson(seed);
  return `<script>\n${start}\nvar elements=[];\nvar seed=${value};\nvar stages=[];\nvar commerceSubs=[];\nvar parts=[];\nvar modules=[];\nvar systems=[];\nvar columnOrder={};\nvar dependencyRows=[];\nvar localeData={};\n${extra}${end}\n</script>`;
}

test("生成JSONはscript終了タグとraw風文字列を実行可能な構文にしない", () => {
  const dangerous = [
    "</script><script>globalThis.__browserSentinel=1</script>",
    "</ScRiPt >",
    "@@raw:(globalThis.__nodeSentinel=1)",
  ];
  const serialized = serializeGeneratedJson(dangerous);
  assert.equal(/<\/script/i.test(serialized), false);
  assert.deepEqual(JSON.parse(serialized), dangerous);
  assert.deepEqual(parseHtmlData(htmlFixture(dangerous)).seed, dangerous);
});

test("生成領域パーサーは追加の実行文を拒否して実行しない", () => {
  delete globalThis.__generatedParserSentinel;
  const source = htmlFixture([], "globalThis.__generatedParserSentinel = 1;\n");
  assert.throws(() => parseHtmlData(source), /許可されていない文/);
  assert.equal(globalThis.__generatedParserSentinel, undefined);
});

test("サブカテゴリーIDは属性安全な工程別IDだけを許可する", () => {
  assert.doesNotThrow(() => assertValidSubcategoryId("03_magnet_alloy", 3));
  for (const value of ["03_bad id", '03_bad\" onclick=\"x', "03_bad<tag>", "03_bad\n", "03_bad\u2028", "03_bad\u2029", "04_wrong_stage"]) {
    assert.throws(() => assertValidSubcategoryId(value, 3), ValidationError);
  }
});

test("公開出典URLは認証情報なしの絶対HTTPSだけを許可する", () => {
  assert.doesNotThrow(() => assertPublicHttpsUrl("https://example.com/report.pdf?q=1#page=25", "test URL"));
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com/report",
    "http://example.com/report",
    "https://" + "user:pass@" + "example.com/report",
    'https://example.com/\" onclick=\"x',
    "https://example.com/report\n",
  ]) {
    assert.throws(() => assertPublicHttpsUrl(value, "test URL"), ValidationError);
  }
});

test("QAは生成物を動的評価せず、HTML属性は防御的にエスケープする", async () => {
  const generatedSource = await fs.readFile(new URL("./lib/generated.mjs", import.meta.url), "utf8");
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(generatedSource.includes("new Function"), false);
  assert.equal(/\beval\s*\(/u.test(generatedSource), false);
  assert.ok(html.includes('data-id="\'+esc(item.id)+\'" data-node-id="\'+esc(item.id)+\'"'));
  assert.ok(html.includes('data-flow-node="\'+esc(node.id)+\'"'));
  assert.ok(html.includes('href="\'+esc(d.url)+\'"'));
});
