# 希土類デュアルユース・サプライチェーン監査

Y、Dy・Tb、Sm、Scが、海外の資源・分離から素材、材料、部材、モジュール・機器を経て、装備・システムへどのようにつながるかを探索できる公開インターフェースです。6工程・47サブカテゴリー・197社／事業単位を収録し、日本語・英語・簡体中文に対応しています。

**[公開画面を開く](https://weiwei1988.github.io/rare-earth-supply-chain-audit/index.html)**

## 主な機能


### 3言語表示

画面右上から、次の表示言語を切り替えられます。

- 日本語
- English
- 简体中文

画面操作、工程・サブカテゴリー、企業カード、企業詳細、サブカテゴリー間の接続説明を各言語で表示します。簡体中文で固有の中国語社名を確認できない企業は、識別しやすいよう英語名と日本語名を併記しています。


### サプライチェーン全体像

- 6工程を横断して、監査済みのサブカテゴリー間接続を表示します。
- サブカテゴリーカードの高さと工程ごとの表示量から、登録企業が下流へ広がる様子を確認できます。
- `Y`、`Dy・Tb`、`Sm`、`Sc`を単独または複数選択すると、該当するサブカテゴリーと接続線を元素の代表色で強調します。
- サブカテゴリーを選ぶと、同じ元素でつながる全上流・全下流工程をハイライトし、所属企業を表示します。


### 元素フロー

- 元素ごとに、原料がどの工程へ分岐し、どの装備・システムへ到達するかを帯状のフロー図で表示します。
- 各カテゴリーに出入りする帯の合計幅は、その元素に関係する登録企業数に比例します。
- カテゴリーを選ぶと前後の経路を強調し、他の帯を薄く表示します。同じ画面の下部で所属企業も確認できます。
- 工程見出しとサブカテゴリーには、選択中の元素に該当する企業・事業単位数を表示します。

> 帯の幅は企業・事業単位数を示すもので、物量、金額、市場規模、実際の商流比率を示すものではありません。


### 企業検索と詳細情報

- 現在の元素・工程・サブカテゴリーの絞り込み範囲内で、企業名、製品、技術などを検索できます。
- スペース区切りで複数語を入力すると、すべての語を含む企業だけを表示します。
- 企業カードから、所有・上場、売上規模、主要製品、市場での地位、防衛・航空宇宙用途、中国依存、BOM根拠、参照元などを確認できます。
- 「防衛装備庁調達実績あり」は、確認対象データに調達実績がある企業を示します。

## 基本操作

1. 画面右上で表示言語を選びます。
2. 「サプライチェーン全体像」または「元素フロー」を選びます。
3. 元素カード、工程、サブカテゴリーを選んで対象を絞り込みます。
4. 表示された企業カードを選んで詳細を確認します。
5. マップまたはフローの空白部分をクリックすると、サブカテゴリー選択、元素絞り込みの順に一段ずつ前の表示へ戻ります。

## 収録範囲

| 項目 | 収録内容 |
| --- | --- |
| 工程 | 6工程：海外の資源・分離、素材、材料、部材、モジュール・機器、装備・システム |
| サブカテゴリー | 47分類 |
| 対象元素 | Y、Dy、Tb、Sm、Sc（画面ではDyとTbをまとめて表示） |
| 企業 | 197社・事業単位 |

企業数には事業部、子会社、企業グループなども含まれます。企業カードは公開情報を整理した調査時点のスナップショットであり、網羅性や現在時点での完全性を保証するものではありません。

## 中国依存・供給シェアの見方

工程1では、元素カードと円グラフに中国依存・供給シェアを表示します。

- Y・Dy・Tb：日本の輸入に占める中国の比率
- Sm：酸化物の世界供給に占める中国の比率
- Sc：酸化物の世界生産に占める中国の比率

SmとScは2024年の推計です。Scは中国に加え、カナダ、ロシア、日本・フィリピン等の概算内訳を表示します。元素ごとに対象年、統計範囲、推計方法が異なるため、同一条件の順位として単純比較しないでください。画面内の注記と参照元も併せて確認してください。

## ローカルで開く

配布用画面は [`index.html`](index.html) にデータを内包しており、追加のWeb APIやデータベースなしで動作します。

```bash
git clone https://github.com/weiwei1988/rare-earth-supply-chain-audit.git
cd rare-earth-supply-chain-audit
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開いてください。

## データと実装

公開されるのは `index.html` ただ1つです。事実データと画面のスクリプトはそれぞれ別の正本を持ち、`npm run build` がその2つを `index.html` に流し込みます。

```
src/data/*.json  ─┐
                  ├─ scripts/build.mjs ─→ index.html（GitHub Pagesで公開）
src/app/*.js     ─┘
```

### 事実・構造データの正本

| ファイル | 内容 |
| --- | --- |
| [`src/data/companies.json`](src/data/companies.json) | 企業・事業単位の分類、元素フラグ、公開情報、調達実績 |
| [`src/data/subcategories.json`](src/data/subcategories.json) | サブカテゴリー、元素、上流接続、接続根拠 |
| [`src/data/stages.json`](src/data/stages.json) | 6工程の名称と説明 |
| [`src/data/dependency.json`](src/data/dependency.json) | 元素別の中国依存・供給シェア、構成比、注記、出典 |
| [`src/data/column-order.json`](src/data/column-order.json) | 元素フローを含むサブカテゴリーの表示順 |
| [`src/data/company-financials.json`](src/data/company-financials.json) | 所有・売上の公開情報調査 |
| [`src/data/locales/`](src/data/locales/) | 英語・簡体中文の企業情報と接続説明。`ja.json` は日本語正本との同期検査用 |

日本語の企業情報と接続説明は `companies.json` と `subcategories.json` が正本です。`locales/ja.json` はそれと完全一致していることを検査で強制しており、配布物には載せません（画面側が正本へフォールバックします）。

### 画面のスクリプトの正本

`npm run build` が下の順に連結し、`index.html` のひとつの即時実行関数に収めます。配布物は単一のHTMLのままです。ファイル同士は同じスコープを共有するため、`import` / `export` は使いません。

| ファイル | 役割 |
| --- | --- |
| [`src/app/state.js`](src/app/state.js) | 画面全体で共有する状態と定数 |
| [`src/app/i18n.js`](src/app/i18n.js) | 表示文言と言語切り替え |
| [`src/app/text.js`](src/app/text.js) | 文字列の整形（エスケープ、省略、折り返し） |
| [`src/app/model.js`](src/app/model.js) | 絞り込みと数え上げ（DOMに触れない） |
| [`src/app/graph.js`](src/app/graph.js) | 接続線の描画と上流・下流のたどり方 |
| [`src/app/parts.js`](src/app/parts.js) | 両タブで共用する部品のマークアップ |
| [`src/app/overview.js`](src/app/overview.js) | 「サプライチェーン全体像」タブの描画 |
| [`src/app/flow.js`](src/app/flow.js) | 「元素別フロー」タブの描画 |
| [`src/app/view.js`](src/app/view.js) | タブ・言語の切り替え、再描画の入口、イベント配線 |

連結の順は [`scripts/build.mjs`](scripts/build.mjs) の `APP_FILES` が持ちます。`var` の初期化はこの順に実行されるため、並べ替えるときは依存を確認してください。ファイルを追加したら `APP_FILES` にも追加します（一致しないとビルドが止まります）。

再描画は `view.js` の `refresh(scope)` が唯一の入口です。状態を変えたあと、描き直す範囲を渡して呼びます。

| scope | 描き直す範囲 |
| --- | --- |
| `overview` | 元素ボタン、マップ、接続根拠、企業一覧、企業詳細 |
| `list` | 企業一覧と企業詳細だけ |
| `flow` | 元素別フロー（表示中のときだけ） |
| `flowList` | 元素別フローの企業一覧と企業詳細だけ |
| `all` | 両タブ |

### 生成物

[`index.html`](index.html) には2つの生成領域があります。**いずれも直接編集せず、正本を更新して `npm run build` を実行してください。**

| 領域 | 生成元 |
| --- | --- |
| `GENERATED DATA START`〜`GENERATED DATA END` | `src/data/*.json` |
| `APP CODE START`〜`APP CODE END` | `src/app/*.js` |

`index.html` を直接編集すると `npm test` が失敗します。

### 道具

| ファイル | 内容 |
| --- | --- |
| [`scripts/build.mjs`](scripts/build.mjs) | 正本JSONと `src/app/*.js` から `index.html` を組み立て（`--check` で同期を検査） |
| [`scripts/lib/dataset.mjs`](scripts/lib/dataset.mjs) | 正本JSONの読み込みと、工程・分類・接続・公開境界の検証 |
| [`scripts/lib/generated.mjs`](scripts/lib/generated.mjs) | 生成領域の読み書き。生成物はコードとして評価しない |
| [`scripts/sync-ja-locale.mjs`](scripts/sync-ja-locale.mjs) | 日本語正本から日本語ロケールを同期 |
| [`scripts/import-atla.mjs`](scripts/import-atla.mjs) | 防衛装備庁の調達実績を企業カードへ取り込み |
| [`scripts/apply-financial-research.mjs`](scripts/apply-financial-research.mjs) | 所有・売上の公開情報調査を企業カードへ反映 |
| [`scripts/qa.mjs`](scripts/qa.mjs) | 件数、分類、多言語データの網羅、画面機能、生成物の同期を検証 |
| [`scripts/audit.mjs`](scripts/audit.mjs) | 工程間接続の重複、空端点、上流到達性を監査 |
| [`scripts/security-audit.mjs`](scripts/security-audit.mjs) | 公開ファイルへの認証情報やローカルパス等の混入を検査 |

`qa.mjs` は、手書きのテーブル（画面ラベル、工程名、サブカテゴリー名、元素別フローの表示順、元素の配色）が正本JSONを網羅しているかも検査します。分類や元素を足して翻訳を書き忘れると、画面に日本語が出る前にビルドが止まります。

## 開発・検証

Node.js 18以降を使用します。追加のnpmパッケージは不要です。

```bash
npm run locales:sync-ja
npm run build
npm test
```

`npm test`では、生成物の同期、データ構造、企業・分類件数、元素フラグ、工程間接続、多言語データ、公開前のセキュリティ検査をまとめて実行します。

企業や分類を変更する場合は、該当する正本JSONと各言語ロケールを更新してください。新しい接続には対象元素と根拠を記録し、未確認のBOM、調達国、防衛契約、企業関係を推測で確定しないでください。
