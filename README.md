# 希土類デュアルユース・サプライチェーン監査

Y、Dy/Tb、Sm、Scについて、中国原料から国内の素材・部材、航空・宇宙・防衛用途までのつながりを、184社・事業単位と29サブカテゴリーから探索する静的な監査インターフェースです。HTML・CSS・JavaScriptで動作し、画面表示にビルドは不要です。

**[公開画面を開く](https://weiwei1988.github.io/rare-earth-supply-chain-audit/index.html)**

配布用HTMLそのものは [`index.html`](index.html) で確認できます。

## 使い方

公開画面をブラウザで開いてください。初期データは `index.html` に収録済みです。ローカルで使う場合はリポジトリを取得し、ルートディレクトリで静的HTTPサーバーを起動します。

```bash
git clone https://github.com/weiwei1988/rare-earth-supply-chain-audit.git
cd rare-earth-supply-chain-audit
python3 -m http.server 8000
```

その後、`http://localhost:8000/` を開きます。

- `Y`、`Dy・Tb`、`Sm`、`Sc`で表示対象の元素を絞り込めます。
- 工程またはサブカテゴリーを選ぶと、該当する企業・事業単位を一覧表示します。
- 企業カードを選ぶと、所有・上場、売上、製品、市場地位、航空・宇宙・防衛用途、中国依存、BOM根拠、追加DDギャップ、参照元を確認できます。
- 工程1では、元素別の中国依存度、指標の定義、データ品質、一次資料へのリンクを表示します。
- 狭い画面ではフロー図を横スクロールできます。明暗テーマにも対応します。
- 「全体」ではすべての接続線を表示し、サブカテゴリーを選ぶとその前後の直結線だけを表示します。
- 「防衛装備庁調達実績あり」は、人力更新シートに調達実績がある企業の表示です。詳細欄で工程5判定、対象品目、希土類判定を確認できます。
- 工程5は希土類フラグを持つ企業だけを表示します。「軍事用レーダー・モジュール」と「無人装備・ドローン」では、防衛装備庁の契約件名を文脈まで再確認した該当企業を表示します。

## 収録内容

- 5工程：原料依存から分離・精製、素材・部材、航空・宇宙・防衛などの最終用途まで
- 29サブカテゴリー
- 対象希土類：Y、Dy、Tb、Sm、Sc（画面ではDyとTbをまとめて表示）
- 184社・事業単位

収録件数には企業の事業部、子会社、企業グループなども含まれます。企業カードの情報は公開情報をもとに整理した調査時点のスナップショットです。

## ファイルと内容

| ファイル | 内容 |
| --- | --- |
| [`index.html`](index.html) | iframeを使わない配布用画面。初期データを内包する生成物 |
| [`src/data/companies.json`](src/data/companies.json) | 184社・事業単位の分類、元素フラグ、DD情報、公開参照元、調達実績 |
| [`src/data/company-financials.json`](src/data/company-financials.json) | 新規ATLA企業57社の所有・上場、最新確認FYの売上、確度、公開出典 |
| [`src/data/subcategories.json`](src/data/subcategories.json) | 29サブカテゴリーの工程、対象元素、上流接続。工程5は `srcEls` で上流ごとの接続元素、`srcNotes` で接続根拠も定義 |
| [`src/data/stages.json`](src/data/stages.json) | 5工程の名称と説明 |
| [`src/data/dependency.json`](src/data/dependency.json) | 工程1の元素別中国依存指標、構成比、品質注記、出典 |
| [`src/希土類サプライチェーン.jsx`](src/希土類サプライチェーン.jsx) | React向けJSXソーススナップショット。データ部は生成物 |
| [`scripts/build.mjs`](scripts/build.mjs) | JSONから `index.html` とJSXのデータ部を生成し、同期を確認 |
| [`scripts/lib/dataset.mjs`](scripts/lib/dataset.mjs) | JSONの読み込み、正規化、参照・工程・構成比の検証 |
| [`scripts/lib/generated.mjs`](scripts/lib/generated.mjs) | HTML・JSXの生成領域を抽出し、埋め込みデータをQA用に読み取る補助 |
| [`scripts/qa.mjs`](scripts/qa.mjs) | 件数、元素フラグ、分類、生成物、iframe不在などの静的QA |
| [`scripts/audit.mjs`](scripts/audit.mjs) | 工程間接続の重複、空端点、上流到達性の監査 |
| [`scripts/import-atla.mjs`](scripts/import-atla.mjs) | リポジトリ外の人力判定スナップショットから画面用データを統合する一回限りの取込処理 |
| [`scripts/apply-financial-research.mjs`](scripts/apply-financial-research.mjs) | 分割調査JSONを検証し、57社の所有・上場／売上と出典を企業カードへ反映 |
| [`package.json`](package.json) | 生成、同期確認、QA、監査のnpmコマンド |
| [`.nojekyll`](.nojekyll) | GitHub Pagesで静的ファイルをそのまま配信するための設定 |

`src/data/*.json` がデータの正本です。`index.html` とJSX内の `GENERATED DATA START` から `GENERATED DATA END` までは生成領域であり、直接編集しても次回の生成で上書きされます。

## 検証

Node.js 18以降で、生成物の同期、データ構造、元素フラグ、工程間接続をまとめて検証します。追加のnpmパッケージは不要です。

```bash
npm test
```

## 更新時

企業や分類を変更する場合は、目的に応じて `src/data/*.json` を編集し、生成と検証を実行してください。

```bash
npm run build
npm test
```

画面のレイアウトや描画ロジックは、`index.html` とJSXの生成マーカー外を編集します。サブカテゴリーを追加・変更する場合は、対象元素と1工程上流の `src` 接続も更新してください。工程5では `src` の各上流IDに対応する `srcEls` の希土類も更新し、用途と関係のない共通元素を自動接続しないでください。未確認のBOM、調達国、防衛契約、企業関係を推測で確定しないでください。
