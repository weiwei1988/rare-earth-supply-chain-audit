# 希土類デュアルユース・サプライチェーン監査

日本企業を中心に、Y、Dy/Tb、Sm、Scのサプライチェーンと航空・宇宙・防衛用途への接続を可視化する静的インターフェースです。

## 公開画面

GitHub Pagesで `index.html` を公開します。元素フィルター、工程別カード、企業詳細、出典表示をブラウザ上で操作できます。`index.html` はiframeを使わない単一ファイル版で、初期データを内包しています。

## 使用方法

### 公開画面を使う

1. GitHub PagesのURLをブラウザで開きます。
2. `Y`、`Dy・Tb`、`Sm`、`Sc`ボタンで元素を絞り込みます。
3. 工程またはサブカテゴリーを選び、企業カードをクリックすると詳細を確認できます。
4. 手元の対応Excelを反映する場合は、`Excelを読み込む`からファイルを選択します。元に戻す場合は`初期データ`を押します。

Excelファイル自体はこのリポジトリに収録していません。読み込んだファイルはブラウザ内で処理され、サーバーへアップロードする機能はありません。

### ローカルで表示する

リポジトリを取得し、ルートディレクトリで静的HTTPサーバーを起動します。

```bash
git clone https://github.com/weiwei1988/rare-earth-supply-chain-audit.git
cd rare-earth-supply-chain-audit
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。Excel読込機能では外部CDNからSheetJSを取得するため、利用時はインターネット接続が必要です。

### データを編集する

企業・サブカテゴリー・工程・中国依存のデータは `src/data/*.json` が唯一の情報源です。JSONを編集してから次を実行すると、`index.html` と JSX スナップショットの両方のデータ部が生成し直されます。

```bash
npm run build
```

`index.html` と `src/希土類サプライチェーン.jsx` の `GENERATED DATA START` 〜 `GENERATED DATA END` の間は生成物です。直接編集しても `npm test` で差分として検出され、次回の `npm run build` で上書きされます。マーカーの外側（画面のレイアウト・描画ロジック・Reactコンポーネント）は手で編集して構いません。

### QAを実行する

Node.js 18以降を用意し、次を実行します。追加のnpmパッケージは不要です。

```bash
npm test
```

`npm test` は次の3段階です。

1. `node scripts/build.mjs --check` — 生成物がJSONと同期しているか
2. `node scripts/qa.mjs` — データの不変条件と、生成物の構造
3. `node scripts/audit.mjs` — 工程間グラフの接続監査

## 構成

- `src/data/*.json` — 唯一の情報源（`companies` 123件 / `subcategories` 27件 / `stages` / `dependency`）
- `index.html` — iframeを使わない配布用画面。データ部は生成物
- `src/希土類サプライチェーン.jsx` — JSXソーススナップショット。データ部は生成物
- `scripts/build.mjs` — 生成と同期チェック
- `scripts/lib/dataset.mjs` — JSONの読み込みと検証（参照整合・工程整合・構成比100%など）
- `scripts/lib/generated.mjs` — 生成領域の抽出
- `scripts/qa.mjs` — 静的QA
- `scripts/audit.mjs` — グラフ接続監査

## 検証

`scripts/lib/dataset.mjs` の読み込み時に、ID重複、subs／src／tagsの参照整合、サブカテゴリーIDと工程の一致、上流工程の隣接、評価表記、中国依存の構成比合計100%などを検査します。

`scripts/qa.mjs` は、企業タグが所属サブカテゴリーの宣言元素に収まること、工程5「防衛半導体・電子回路・通信」にDy/Tbタグがないこと、工程5「ロボティクス・精密」の全社がSmを持つこと、iframe不在、生成領域の外にデータ定義のコピーがないことなどを検査します。

`scripts/audit.mjs` は、接続線を `subcategories.json` の `src` からのみ組み立て、重複、企業ゼロで消える端点、工程5から工程2まで遡れない元素を報告します。画面のフロー図も同じ `src` を読むため、監査と表示がずれません。

## データ利用上の注意

画面内の情報は公開情報に基づく調査・分析用スナップショットです。希土類利用可能性には一般的な製品構成からの評価が含まれ、企業・型式固有のBOMを保証するものではありません。最新性・完全性・契約主体の名寄せ結果は、原資料でも再確認してください。
