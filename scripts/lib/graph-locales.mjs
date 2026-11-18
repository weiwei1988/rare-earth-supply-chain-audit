// 工程・分類翻訳のスキーマ。日本語同期とビルド時の検証で共用する。
export function canonicalGraphLocale(stages, subcategories) {
  return {
    stages: Object.fromEntries(stages.map(({ id, label, short }) => [id, { label, short }])),
    subcategories: Object.fromEntries(subcategories.map(({ id, label, description, srcNotes }) => [
      id, { label, description, ...(srcNotes ? { srcNotes: { ...srcNotes } } : {}) },
    ])),
  };
}

// 全キーが日本語正本と一致し、各末端が空でない文字列であることを検証する。
// ja は正本と同じ文言でなければならない。ID・項目・接続元の欠落と余分なキーを同じ規則で扱う。
export function validateGraphLocale(overlay, canonical, locale) {
  function validate(actual, expected, path) {
    if (typeof expected === 'string') {
      if (typeof actual !== 'string' || !actual.trim()) throw new Error(`${path} に翻訳文がありません。`);
      if (locale === 'ja' && actual !== expected) throw new Error(`${path} が日本語正本と同期していません。`);
      return;
    }
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error(`${path} はオブジェクトである必要があります。`);
    const missing = Object.keys(expected).filter(key => !Object.hasOwn(actual, key));
    const extra = Object.keys(actual).filter(key => !Object.hasOwn(expected, key));
    if (missing.length || extra.length) throw new Error(`${path} が正本と一致しません（不足: ${missing.join(', ') || 'なし'} / 余分: ${extra.join(', ') || 'なし'}）。`);
    for (const key of Object.keys(expected)) validate(actual[key], expected[key], `${path}.${key}`);
  }
  for (const section of ['stages', 'subcategories']) validate(overlay[section], canonical[section], `${locale}.${section}`);
}
