import React, { useMemo, useRef, useState } from "react";

/**
 * 希土類サプライチェーン DD Explorer
 *
 * - 統合Excelの内容を初期データとして内蔵
 * - 同じ列構造の .xlsx / .xls を画面から再アップロード可能
 * - Stage 04 / 05 のサブカテゴリーと Y / DyTb / Sm / Sc フラグを自動反映
 *
 * XLSXの読込みには SheetJS をブラウザで遅延ロードします。
 */

const COLORS = {
  ink: "var(--re-bg)", panel: "var(--re-panel)", panelHi: "var(--re-panel-hi)", line: "var(--re-line)",
  text: "var(--re-text)", sub: "var(--re-sub)", faint: "var(--re-faint)",
  Y: "var(--re-y)", DyTb: "var(--re-dytb)", Sm: "var(--re-sm)", Sc: "var(--re-sc)",
  A: "var(--re-risk-a)", B: "var(--re-risk-b)", C: "var(--re-risk-c)", X: "var(--re-risk-x)"
};

const ELEMENTS = [
  { id: "all", label: "全体" },
  { id: "Y", label: "Y" },
  { id: "DyTb", label: "Dy・Tb" },
  { id: "Sm", label: "Sm" },
  { id: "Sc", label: "Sc" }
];
const ALL_ELEMENT_IDS = ["Y", "DyTb", "Sm", "Sc"];

const STAGES = [
  { id: 1, code: "01", label: "中国原料", short: "採掘・分離精製・輸出管理" },
  { id: 2, code: "02", label: "分離精製・高純度化／一次変換", short: "純度・元素形態で取引される一次素材" },
  { id: 3, code: "03", label: "組成設計・用途別中間材料", short: "用途固有の組成・粒径・性能を設計" },
  { id: 4, code: "04", label: "機能材料・部材／製造用消耗材", short: "機能部材・ターゲット・工程投入材" },
  { id: 5, code: "05", label: "機器・コンポーネント", short: "レーザー・推進・センサー" }
];

const SUBCATS = [
  {
    "id": "02_compound",
    "stage": 2,
    "label": "高純度酸化物・化合物",
    "header": "02 高純度酸化物・化合物",
    "els": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ]
  },
  {
    "id": "02_metal",
    "stage": 2,
    "label": "金属化・還元／一次金属",
    "header": "02 金属化・還元／一次金属",
    "els": [
      "DyTb",
      "Sm",
      "Sc"
    ]
  },
  {
    "id": "02_recycle",
    "stage": 2,
    "label": "回収・再精製",
    "header": "02 回収・再精製",
    "els": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ]
  },
  {
    "id": "02_trade",
    "stage": 2,
    "label": "原料輸入・販売・品質保証",
    "header": "02 原料輸入・販売・品質保証",
    "els": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ]
  },
  {
    "id": "03_ceramic",
    "stage": 3,
    "label": "高機能粉末（YSZ・ScSZ）",
    "header": "03 高機能粉末（YSZ・ScSZ）",
    "els": [
      "Y",
      "Sc"
    ]
  },
  {
    "id": "03_magnet",
    "stage": 3,
    "label": "磁石合金・磁粉・コンパウンド",
    "header": "03 磁石合金・磁粉・コンパウンド",
    "els": [
      "DyTb",
      "Sm"
    ]
  },
  {
    "id": "03_light_alloy",
    "stage": 3,
    "label": "Al-Sc母合金（構造材・半導体）",
    "header": "03 Al-Sc母合金（構造材・半導体）",
    "els": [
      "Sc"
    ]
  },
  {
    "id": "03_am_feedstock",
    "stage": 3,
    "label": "金属AM・結合用原料",
    "header": "03 金属AM・結合用原料",
    "els": [
      "Sc"
    ]
  },
  {
    "id": "03_precursor",
    "stage": 3,
    "label": "結晶（YAG・SAM）・セラミックス・前駆体",
    "header": "03 結晶（YAG・SAM）・セラミックス・前駆体",
    "els": [
      "Y",
      "Sc"
    ]
  },
  {
    "id": "04_opt",
    "label": "固体レーザー発振器（YAG）",
    "header": "04 固体レーザー発振器（YAG）",
    "els": [
      "Y"
    ],
    "stage": 4
  },
  {
    "id": "04_coat",
    "label": "耐熱（TBC）／耐プラズマコーティング",
    "header": "04 耐熱（TBC）／耐プラズマコーティング",
    "els": [
      "Y"
    ],
    "stage": 4
  },
  {
    "id": "04_elec",
    "label": "電解質・センサ基板",
    "header": "04 電解質・センサ基板",
    "els": [
      "Y",
      "Sc"
    ],
    "stage": 4
  },
  {
    "id": "04_mag",
    "label": "磁石（焼結・ボンド）",
    "header": "04 磁石（焼結・ボンド）",
    "els": [
      "DyTb",
      "Sm"
    ],
    "stage": 4
  },
  {
    "id": "04_target",
    "label": "薄膜・スパッタリングターゲット",
    "header": "04 薄膜・スパッタリングターゲット",
    "els": [
      "Y",
      "Sc"
    ],
    "stage": 4
  },
  {
    "id": "04_sc_crystal",
    "label": "SAMウェハ・テンプレート",
    "header": "04 SAMウェハ・テンプレート",
    "els": [
      "Sc"
    ],
    "stage": 4
  },
  {
    "id": "04_am",
    "label": "金属AM造形・加工",
    "header": "04 金属AM造形・加工",
    "els": [
      "Sc"
    ],
    "stage": 4
  },
  {
    "id": "05_laser",
    "label": "高出力レーザー",
    "els": [
      "Y"
    ],
    "src": [
      "04_opt"
    ],
    "stage": 5,
    "header": "05 高出力レーザー"
  },
  {
    "id": "05_engine",
    "label": "航空エンジン・ガスタービン",
    "els": [
      "Y"
    ],
    "src": [
      "04_coat"
    ],
    "stage": 5,
    "header": "05 航空エンジン・ガスタービン"
  },
  {
    "id": "05_energy",
    "label": "固体酸化物形燃料電池（SOFC）／固体酸化物形電解（SOEC）",
    "els": [
      "Y",
      "Sc"
    ],
    "forceEls": [
      "Y"
    ],
    "src": [
      "04_elec"
    ],
    "stage": 5,
    "header": "05 固体酸化物形燃料電池（SOFC）／固体酸化物形電解（SOEC）"
  },
  {
    "id": "05_nuclear",
    "label": "原子力・核燃料被覆材",
    "els": [
      "Y"
    ],
    "src": [
      "04_coat"
    ],
    "stage": 5,
    "header": "05 原子力・核燃料被覆材"
  },
  {
    "id": "05_guid",
    "label": "誘導・慣性・航法",
    "els": [
      "DyTb",
      "Sm"
    ],
    "src": [
      "04_mag"
    ],
    "stage": 5,
    "header": "05 誘導・慣性・航法"
  },
  {
    "id": "05_sat",
    "label": "衛星・宇宙機・ロケット",
    "els": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "src": [
      "04_mag",
      "04_sc_crystal",
      "04_am",
      "04_elec"
    ],
    "stage": 5,
    "header": "05 衛星・宇宙機・ロケット"
  },
  {
    "id": "05_flight",
    "label": "飛行制御・電動化",
    "els": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "src": [
      "04_mag",
      "04_am"
    ],
    "stage": 5,
    "header": "05 飛行制御・電動化"
  },
  {
    "id": "05_robot",
    "label": "ロボティクス・精密",
    "els": [
      "DyTb",
      "Sm"
    ],
    "src": [
      "04_mag"
    ],
    "stage": 5,
    "header": "05 ロボティクス・精密"
  },
  {
    "id": "05_rf_sensor",
    "label": "RF・圧電・高温センサ",
    "header": "05 RF・圧電・高温センサー",
    "els": [
      "Sc"
    ],
    "src": [
      "04_target",
      "04_sc_crystal"
    ],
    "stage": 5
  },
  {
    "id": "05_defense_electronics",
    "label": "防衛半導体・電子回路・通信",
    "header": "05 防衛半導体・電子回路・通信",
    "els": [
      "Y",
      "Sc"
    ],
    "src": [
      "04_coat",
      "04_elec",
      "04_target",
      "04_sc_crystal"
    ],
    "stage": 5
  },
  {
    "id": "05_airframe_support",
    "label": "航空機構造・整備",
    "header": "05 航空機構造・整備",
    "els": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "src": [
      "04_coat",
      "04_mag",
      "04_am"
    ],
    "stage": 5
  }
];

const SEED_ROWS = [
  {
    "name": "ネオマグ（商流ノード）",
    "jsx": "商流ノード（ネオマグ等）",
    "stages": [
      2
    ],
    "subs": [
      "02_trade"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "非上場・磁石加工販売／輸入商社層",
    "rev": "小規模・条件内推定",
    "prod": "NdFeB・SmCo等の永久磁石の加工・販売、試作・小ロット供給",
    "pos": "中国製磁石が国内中小モータ・センサ産業へ入る商流ノード",
    "def": "研究開発・少量の防衛／宇宙部材に接続し得る",
    "chn": "高。輸入元、原産国証明、再輸出規制該否を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "JSXではctx=1の商流参考ノード。企業名として統合表に収録",
    "id": "seed-0"
  },
  {
    "name": "三井金属鉱業（レアマテリアル事業部）",
    "jsx": "三井金属レアマテリアル事業部",
    "stages": [
      2,
      3
    ],
    "subs": [
      "02_compound",
      "02_recycle",
      "03_magnet"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm"
    ],
    "own": "三井金属鉱業の事業部。旧・日本イットリウムを2025年4月吸収合併",
    "rev": "事業部非開示／親会社約7,000億円",
    "prod": "高純度Y₂O₃・YF₃・YOF、YSZ用Y化合物、SmCo磁性合金粉末、Tb-Gd合金",
    "pos": "国内Y系分離精製の根元。全希土類を扱う国内希少ノード",
    "def": "耐プラズマ、TBC、レーザー、磁石の上流。防衛電子・宇宙用半導体",
    "chn": "中～高。原料の中国原産比率、非中国・リサイクル原料、在庫月数を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／Y DD／DyTb DD／Sm DD",
    "note": "法人ではなく事業部単位。売上条件は例外",
    "id": "seed-1"
  },
  {
    "name": "三徳",
    "jsx": "三徳",
    "stages": [
      2,
      3
    ],
    "subs": [
      "02_metal",
      "02_recycle",
      "03_magnet"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "プロテリアル子会社・非上場",
    "rev": "約239億円（2018年3月期）",
    "prod": "Nd磁石合金、Sm磁石合金、高純度希土類金属、磁石リサイクル",
    "pos": "国内Nd磁石合金市場シェア約65%とされる上流チョークポイント",
    "def": "高性能磁石メーカーの上流。国内循環・リサイクルの要",
    "chn": "高。Dy/Tb/Sm原料と中国JV経路、輸出許可を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "親会社プロテリアルとは別法人として収録",
    "id": "seed-2"
  },
  {
    "name": "信越化学工業",
    "jsx": "信越化学（Shin-Etsu Rare Earth）／信越化学工業（磁石）",
    "stages": [
      2,
      3,
      4
    ],
    "subs": [
      "02_compound",
      "03_ceramic",
      "03_precursor",
      "04_mag"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm"
    ],
    "own": "東証プライム(4063)",
    "rev": "約2.6兆円",
    "prod": "Y₂O₃・YF₃・YOF・YAG系材料、NdFeB・SmCo磁石、粒界拡散技術",
    "pos": "Y系精製・粉末と高性能磁石の双方を持つ総合ノード",
    "def": "半導体耐プラズマ材、TBC周辺、高性能磁石、航空宇宙・防衛電子",
    "chn": "高。Y/Dy/Tb/Sm調達、海外精製拠点、輸出管理対象混合物を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／Y DD／DyTb DD／Sm DD",
    "note": "JSXの2ノードを法人単位で重複統合",
    "id": "seed-3"
  },
  {
    "name": "高純度化学研究所",
    "jsx": "高純度化学研究所",
    "stages": [
      2,
      4
    ],
    "subs": [
      "02_compound",
      "04_target"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "非上場",
    "rev": "小規模推定",
    "prod": "高純度Y系酸化物、Sc₂O₃、セラミック／金属ターゲット、研究用無機化合物",
    "pos": "試作・特殊薄膜・単結晶開発用の少量高純度材料ノード",
    "def": "防衛電子・宇宙材料、Y₂O₃薄膜、Sc含有結晶・ScSZ・AlScNの研究開発",
    "chn": "高。Sc₂O₃を含む原料原産国証明、ロット量、中国輸出許可を確認",
    "ev": "B",
    "exc": 0,
    "src": "JSX／Y DD／Sc DD／https://www.kojundo.co.jp/dcms_media/other/SCO01PAG.pdf",
    "note": "量産よりR&D・試作ノード",
    "id": "seed-4"
  },
  {
    "name": "東ソー",
    "jsx": "東ソー",
    "stages": [
      3
    ],
    "subs": [
      "03_ceramic"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証プライム(4042)",
    "rev": "約1兆円",
    "prod": "YSZ粉末TZシリーズ（4Y～10Y）",
    "pos": "YSZ粉末で世界トップ級。国内下流の中心性が高い",
    "def": "SOFC、酸素センサ、遮熱材、航空機エンジン・ガスタービン",
    "chn": "高。安定化剤Y₂O₃の原産国、非中国Y、顧客優先供給を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／Y DD",
    "note": "売上条件は例外",
    "id": "seed-5"
  },
  {
    "name": "第一稀元素化学工業",
    "jsx": "第一稀元素化学工業",
    "stages": [
      3
    ],
    "subs": [
      "03_ceramic"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "東証プライム(4082)",
    "rev": "357.51億円（2026年3月期）",
    "prod": "YSZ粉末、10Sc1CeSZ等のScSZ、SOFC向けジルコニア",
    "pos": "Zr化合物世界トップ級。Y系・Sc系安定化ジルコニアとレアアースフリー代替材を保有",
    "def": "SOFC、酸素センサ、高温セラミックス、航空・艦艇補機電源",
    "chn": "中～高。Y₂O₃／Sc₂O₃の原産国、Sc含有量別在庫、代替材の実用度を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Y DD／Sc DD／https://www.dkkk.co.jp/products/functions.html",
    "note": "条件内のYSZ・ScSZ粉末中核",
    "id": "seed-6"
  },
  {
    "name": "フジミインコーポレーテッド",
    "jsx": "フジミインコーポレーテッド",
    "stages": [
      3
    ],
    "subs": [
      "03_ceramic"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証プライム(5384)",
    "rev": "770億円（2026年3月期計画）",
    "prod": "Y₂O₃・YF₃・YSZ・YAG溶射粉末",
    "pos": "溶射材国内大手。半導体装置用耐プラズマ材",
    "def": "航空機エンジンTBC、防衛半導体、宇宙用電子部品製造",
    "chn": "高。高純度Y原料ソース、粉末拠点、顧客別優先供給を確認",
    "ev": "B",
    "exc": 0,
    "src": "JSX／Y DD",
    "note": "条件内の溶射粉末中核",
    "id": "seed-7"
  },
  {
    "name": "住友金属鉱山／住鉱国富電子",
    "jsx": "住友金属鉱山（酸化Sc）／住鉱国富電子（SmFeN）",
    "stages": [
      2,
      3
    ],
    "subs": [
      "02_compound",
      "03_magnet"
    ],
    "tags": [
      "Sm",
      "Sc"
    ],
    "own": "住友金属鉱山および100%子会社・住鉱国富電子",
    "rev": "親会社は1,000億円超／子会社非開示",
    "prod": "フィリピン産中間体からの高純度Sc₂O₃、SmFeN磁石粉Wellmax、ボンド磁石用コンパウンド",
    "pos": "非中国Sc供給の国内中核と、SmFeN国内単一拠点を同一グループに保有",
    "def": "SOFC、Al–Sc航空宇宙合金、レーザー・電子材料、Dyフリー磁石",
    "chn": "Scは低～中（フィリピン→日本の代替供給側）。Smは高。HPAL稼働率、精製拠点集中、Sm原料を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／Sm DD／Sc DD／https://www.smm.co.jp/business/refining/products/scandium/",
    "note": "親会社のSc事業と実製造子会社のSm事業を1行に統合",
    "id": "seed-8"
  },
  {
    "name": "Magnequench（Neo Performance Materials）",
    "jsx": "Magnequench（Neo Performance）",
    "stages": [
      3
    ],
    "subs": [
      "03_magnet"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "外資・カナダNeo Performance Materials傘下",
    "rev": "外資・参考",
    "prod": "ボンドNdFeB用磁粉MQP/MQ3、重希土類低減磁粉",
    "pos": "ボンドNdFeB磁粉の世界的プレイヤー",
    "def": "小型高性能モータ、航空宇宙補機、ロボティクス",
    "chn": "高。中国・タイ等の拠点、原料原産国、ライセンスを確認",
    "ev": "参考",
    "exc": 1,
    "src": "JSX／DyTb DD",
    "note": "日本企業ではないが日本側BOM上の重要供給源",
    "id": "seed-9"
  },
  {
    "name": "神島化学工業",
    "jsx": "神島化学工業",
    "stages": [
      3
    ],
    "subs": [
      "03_precursor"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証スタンダード(4026)",
    "rev": "274.05億円（2025年4月期）",
    "prod": "透明YAG・Y₂O₃セラミックス、レーザー媒質、蛍光体",
    "pos": "大型・接合YAGで世界唯一級とされる",
    "def": "高出力レーザー、宇宙デブリ捕捉、レーザー核融合",
    "chn": "高。高純度Y₂O₃とNd/Yb等ドーパント原産国を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Y DD",
    "note": "Y系機能部材の最重要候補 ／ Stage 04『固体レーザー発振器（YAG）』から除外し、YAG結晶・セラミックス材料側のStage 03に限定",
    "id": "seed-10"
  },
  {
    "name": "信光社",
    "jsx": "信光社",
    "stages": [
      3
    ],
    "subs": [
      "03_precursor"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場",
    "rev": "推定数十億円",
    "prod": "YAG単結晶ロッド・光学部材",
    "pos": "国内YAG単結晶の老舗専業",
    "def": "レーザー測距・加工・研究用光学への波及",
    "chn": "高と推定。原料調達先の一次確認が必要",
    "ev": "C",
    "exc": 0,
    "src": "JSX",
    "note": "一次資料未確認。確度△ ／ Stage 04『固体レーザー発振器（YAG）』から除外し、YAG結晶・セラミックス材料側のStage 03に限定",
    "id": "seed-11"
  },
  {
    "name": "オキサイド",
    "jsx": "固体レーザー発振器DD正式採用",
    "stages": [
      4,
      3
    ],
    "subs": [
      "04_opt",
      "03_precursor"
    ],
    "tags": [
      "Y"
    ],
    "own": "証券コード：6521",
    "rev": "100.4億円（2026年2月期・連結）",
    "prod": "266nm・193nm全固体深紫外レーザー、CW／QCW／ピコ秒レーザー、波長変換モジュール",
    "pos": "深紫外レーザー世界シェア30%以上、波長変換単結晶95%以上（会社推計）。",
    "def": "深紫外レーザーは先端半導体検査・微細加工の基盤。航空機・ドローン・衛星向け特殊レーザーも扱うが、同製品は米Areté製。自社深紫外レーザーの防衛納入は未確認。 ／ 今回の公開情報確認では直接契約を特定できず。",
    "chn": "当該DUV製品はBBO等の非線形結晶が主要。Y曝露は基本波源BOMを確認するまで確定不可。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.opt-oxide.com/products-list/laser/ ／ https://www.opt-oxide.com/products-list/laser/qcw-laser/item_LA00008 ／ https://www.opt-oxide.com/v2019/wp-content/uploads/2013/03/266Laser_r12-1.pdf ／ https://www.opt-oxide.com/ir/meeting/meeting26_review/ ／ https://www.opt-oxide.com/products-list/laser/special",
    "note": "固体レーザー発振器DDの「採用候補（発振器）」に基づきStage 04へ正式採用。",
    "id": "seed-12",
    "bom": "266nm QCWは赤外ファイバー増幅光源を2段波長変換。現行製品のファイバー添加材・変換結晶は非開示。CW Frequadは超高純度BBOを明記。YAG媒質は確認できない。 ／ 当該DUV発振器のYAG使用は未確認",
    "gap": "自社製と輸入販売を区別し、防衛・宇宙顧客、基本波源の媒質、輸出管理該非を確認。",
    "formal": true,
    "formalSource": "固体レーザー発振器DD：採用候補"
  },
  {
    "name": "トーカロ",
    "jsx": "トーカロ",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証プライム(3433)",
    "rev": "570億円（2026年3月期予想）",
    "prod": "Y₂O₃/YF₃/YSZ溶射、TBC、半導体チャンバー部材",
    "pos": "表面改質の国内シェア44%とされる",
    "def": "航空機エンジン、ガスタービン、船舶、半導体装置",
    "chn": "高。認証済み粉末の供給元、切替時再認証、広州拠点を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Y DD",
    "note": "加工ノード。急所は粉末・原料側",
    "id": "seed-13"
  },
  {
    "name": "AGC／AGCセイミケミカル",
    "jsx": "AGC／AGCセイミケミカル",
    "stages": [
      4
    ],
    "subs": [
      "04_coat",
      "04_elec"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "AGCおよび100%子会社AGCセイミケミカル",
    "rev": "親会社は1,000億円超",
    "prod": "Y₂O₃・Y₅O₄F₇耐プラズマ膜、SOFC用複合酸化物、ScSZ関連技術",
    "pos": "半導体装置用膜と燃料電池材料を同一グループに保有",
    "def": "防衛半導体、宇宙用電子部品、SOFC・SOEC分散電源",
    "chn": "中～高。Y／Sc原料、現行商用品のScSZ比率、成膜・粉末供給経路を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／Y DD／Sc DD／https://www.seimichemical.co.jp/product/fuel/",
    "note": "ScSZの現行商用比率は未確認。親会社・子会社を統合",
    "id": "seed-14"
  },
  {
    "name": "京セラ",
    "jsx": "京セラ",
    "stages": [
      3
    ],
    "subs": [
      "03_precursor"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証プライム(6971)",
    "rev": "約2兆円",
    "prod": "単結晶YAG育成・加工、Y₂O₃ファインセラミックス、耐プラズマ工程部品",
    "pos": "半導体装置用セラミックスの大手",
    "def": "防衛電子、半導体装置、センサ・通信部品",
    "chn": "中～高。高純度Y₂O₃調達を確認",
    "ev": "B",
    "exc": 1,
    "src": "JSX／Y DD",
    "note": "売上条件は例外",
    "id": "seed-15"
  },
  {
    "name": "日本ファインセラミックス",
    "jsx": "日本ファインセラミックス",
    "stages": [
      4
    ],
    "subs": [
      "04_elec"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場",
    "rev": "136.74億円（2026年3月期）",
    "prod": "8YSZ基板、固体電解質、酸素センサ基板",
    "pos": "酸素イオン伝導基板のニッチメーカー",
    "def": "SOFC、高温センサ、宇宙・防衛用センサ部材",
    "chn": "中～高。YSZ粉末供給元と東ソー／第一稀元素依存を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Y DD",
    "note": "条件内の電解質部材中核",
    "id": "seed-16"
  },
  {
    "name": "ニッカトー",
    "jsx": "ニッカトー",
    "stages": [
      3
    ],
    "subs": [
      "03_ceramic"
    ],
    "tags": [
      "Y"
    ],
    "own": "東証スタンダード(5367)",
    "rev": "条件内（数百億円未満）",
    "prod": "YTZ/YTZ-Sジルコニアボール、粉砕・分散材",
    "pos": "MLCC等の粉体工程で使う定番工程材",
    "def": "防衛電子・通信・センサ用セラミック材料の製造工程",
    "chn": "東ソー依存が高いと開示。Y₂O₃→YSZ→工程材の間接リスク",
    "ev": "B",
    "exc": 0,
    "src": "JSX／Y DD",
    "note": "単一供給依存が定量開示された例",
    "id": "seed-17"
  },
  {
    "name": "プロテリアル",
    "jsx": "プロテリアル",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "非上場・旧日立金属",
    "rev": "約7,686億円（2025年度）",
    "prod": "NEOMAX NdFeB焼結磁石、低Dy化磁石",
    "pos": "三徳を傘下に合金→磁石→リサイクルを統合",
    "def": "航空宇宙・防衛用モータ、発電機、センサ",
    "chn": "高。Dy/Tb拡散材、Nd/Pr、リサイクル材の原産地を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／DyTb DD",
    "note": "売上条件は例外",
    "id": "seed-18"
  },
  {
    "name": "TDK",
    "jsx": "TDK",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "東証プライム(6762)",
    "rev": "約2.2兆円",
    "prod": "NdFeB・SmCo磁石、HAL工法、Dy削減・フリー磁石",
    "pos": "高性能磁石・SmCoの世界的大手",
    "def": "センサ、モータ、航空宇宙アクチュエータ、防衛電子",
    "chn": "高。Dy/Tb/Sm調達、拡散材在庫、製品グレード別使用量を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "売上条件は例外",
    "id": "seed-19"
  },
  {
    "name": "東芝マテリアル",
    "jsx": "東芝マテリアル",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "Sm"
    ],
    "own": "東芝子会社・非上場",
    "rev": "非開示",
    "prod": "SmCo磁石（約300℃級の高温対応）",
    "pos": "国内SmCo生産3社の一角とされる。約300℃級の高温対応と高出力密度を狙う独自SmCo磁石・モーター技術。",
    "def": "航空機エンジン周辺など高温・耐放射線環境",
    "chn": "高。Sm原料、能力維持投資、補助金採択状況を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Sm DD",
    "note": "高温磁石の代替困難性が高い ／ SmCo磁石材料の開発・製造ノードとしてStage 04『磁石（焼結・ボンド）』に配置",
    "id": "seed-20"
  },
  {
    "name": "トーキン",
    "jsx": "トーキン",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "Sm"
    ],
    "own": "台湾Yageo傘下",
    "rev": "非開示",
    "prod": "SmCo磁石",
    "pos": "国内SmCo生産3社の一角とされる",
    "def": "高温センサ・モータ・アクチュエータ",
    "chn": "高。Sm原料と外資所有構造を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Sm DD",
    "note": "所有・ガバナンスもDD対象",
    "id": "seed-21"
  },
  {
    "name": "シチズンファインデバイス",
    "jsx": "シチズンファインデバイス",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "Sm"
    ],
    "own": "シチズン時計100%子会社・非上場",
    "rev": "非開示",
    "prod": "SmCo焼結磁石、高精度加工",
    "pos": "国内SmCo残存能力の一角",
    "def": "産業・車載アクチュエータ、防衛用途は要確認",
    "chn": "高。Sm原料と焼結内製／加工特化の内製深度を確認",
    "ev": "B",
    "exc": 0,
    "src": "JSX／Sm DD",
    "note": "防衛実績は非開示",
    "id": "seed-22"
  },
  {
    "name": "セイコーインスツル",
    "jsx": "セイコーインスツル",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "Sm"
    ],
    "own": "セイコーグループ100%・非上場",
    "rev": "非開示",
    "prod": "SmCo磁石DIANET、微小ローター磁石",
    "pos": "φ1mm級時計用ローター磁石で世界トップクラスとされる",
    "def": "微小磁石工程は誘導機器・宇宙機へ転用可能",
    "chn": "高。Sm原料、用途別顧客、原産国を確認",
    "ev": "B",
    "exc": 0,
    "src": "JSX／Sm DD",
    "note": "防衛・宇宙実績は要確認",
    "id": "seed-23"
  },
  {
    "name": "ダイドー電子（大同特殊鋼グループ）",
    "jsx": "ダイドー電子（大同特殊鋼G）",
    "stages": [
      3,
      4
    ],
    "subs": [
      "03_magnet",
      "04_mag"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "大同特殊鋼グループ・非上場",
    "rev": "約113億円（2024年度）",
    "prod": "熱間加工NdFeB、NdFeB/SmFeNボンド磁石・磁粉",
    "pos": "重希土類フリー熱間加工磁石、SmFeN量産の希少プレイヤー",
    "def": "小型高出力モータ、ロボット、航空宇宙アクチュエータ",
    "chn": "中～高。Nd/Pr/Sm、Magnequench系磁粉、製品別BOMを確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "Dy/Tb回避側とSm規制曝露側を併有",
    "id": "seed-24"
  },
  {
    "name": "愛知製鋼",
    "jsx": "愛知製鋼",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "東証プライム(5482)・トヨタグループ",
    "rev": "1,000億円超",
    "prod": "Dy/Tb/Coフリー異方性NdFeBボンド磁石MAGFINE",
    "pos": "重希土類フリーの代替側プレイヤー",
    "def": "車載、ロボット、無人機補機、小型モータ",
    "chn": "中。Dy/Tb依存は低減するがNd/Pr中国依存は残存",
    "ev": "A",
    "exc": 1,
    "src": "JSX／DyTb DD",
    "note": "供給途絶時の代替技術候補",
    "id": "seed-25"
  },
  {
    "name": "多摩川精機",
    "jsx": "多摩川精機",
    "stages": [
      5
    ],
    "subs": [
      "05_guid",
      "05_sat",
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "非上場",
    "rev": "単体約481億円／連結約822億円",
    "prod": "レゾルバ、ジャイロ、サーボ、リアクションホイール、航空機EMA",
    "pos": "HEVレゾルバ国内約7割、航空宇宙・防衛の中核",
    "def": "衛星姿勢制御、航空機電動アクチュエータ、慣性機器",
    "chn": "中。NdFeB/SmCo材質、磁石メーカー、原産国、海外拠点を確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "磁石だけでなく技能継承も論点",
    "id": "seed-26"
  },
  {
    "name": "東京計器",
    "jsx": "東京計器",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "東証プライム(7721)",
    "rev": "約500～600億円",
    "prod": "ジャイロ、慣性装置、防衛電子機器",
    "pos": "航法・計測の老舗、防衛売上比率が高い",
    "def": "誘導・航法・レーダーに直接接続",
    "chn": "中。モータ・センサ磁石経由の間接依存",
    "ev": "A",
    "exc": 0,
    "src": "JSX／Sm DD",
    "note": "磁石材質・BOMは要確認",
    "id": "seed-27"
  },
  {
    "name": "三菱プレシジョン",
    "jsx": "三菱プレシジョン",
    "stages": [
      5
    ],
    "subs": [
      "05_guid",
      "05_sat"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "三菱グループ",
    "rev": "約278億円（2025年）",
    "prod": "リアクションホイール、慣性航法、誘導・制御システム",
    "pos": "宇宙・航法・誘導系の専門企業",
    "def": "衛星姿勢制御、誘導・航法に直結",
    "chn": "中～高。ホイール内モータ・センサ磁石のBOMを確認",
    "ev": "A",
    "exc": 0,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "磁石変更時の認証・設計変更期間が重要",
    "id": "seed-28"
  },
  {
    "name": "シナノケンシ（ASPINA）",
    "jsx": "シナノケンシ（ASPINA）",
    "stages": [
      5
    ],
    "subs": [
      "05_sat",
      "05_robot"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "非上場",
    "rev": "単体約435億円／連結約470億円",
    "prod": "BLDCモータ、小型衛星用リアクションホイール",
    "pos": "小型衛星・CubeSat向けを開発",
    "def": "衛星・宇宙機器・ロボティクス",
    "chn": "中。NdFeB/SmCo選定、耐放射線仕様、原産国を確認",
    "ev": "B",
    "exc": 0,
    "src": "JSX／DyTb DD",
    "note": "民生部品活用型でBOM次第",
    "id": "seed-29"
  },
  {
    "name": "ハーモニック・ドライブ・システムズ",
    "jsx": "ハーモニック・ドライブ・システムズ",
    "stages": [
      5
    ],
    "subs": [
      "05_sat",
      "05_robot"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "東証スタンダード(6324)",
    "rev": "約600億円",
    "prod": "精密波動歯車減速機、アクチュエータ",
    "pos": "精密制御用減速機で世界的高シェア",
    "def": "衛星、探査機、防衛ロボティクス",
    "chn": "中。NdFeBモータ経由の間接依存",
    "ev": "B",
    "exc": 0,
    "src": "JSX／DyTb DD",
    "note": "磁石は内蔵モータ側の間接曝露",
    "id": "seed-30"
  },
  {
    "name": "ナブテスコ",
    "jsx": "ナブテスコ",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "東証プライム(6268)",
    "rev": "約3,400億円",
    "prod": "航空機フライトコントロール・アクチュエーション",
    "pos": "国産防衛機の飛行制御作動系で高い地位",
    "def": "防衛航空機の飛行制御に直結",
    "chn": "中。電動化に伴うNdFeB依存増加、磁石BOMを確認",
    "ev": "B",
    "exc": 1,
    "src": "JSX／DyTb DD",
    "note": "売上条件は例外",
    "id": "seed-31"
  },
  {
    "name": "シンフォニアテクノロジー",
    "jsx": "シンフォニアテクノロジー",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "東証プライム(6507)",
    "rev": "約1,192億円（2024年度）",
    "prod": "航空機発電機・電源、ロケットTVC、サーボ、推進モータ",
    "pos": "国内唯一の航空機電源システムメーカーとされる",
    "def": "航空機、ロケット、艦艇の電動化・発電・作動",
    "chn": "中～高。PM/誘導型、SmCo/高保磁力NdFeBの採否を確認",
    "ev": "A",
    "exc": 1,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "条件をやや超過する例外",
    "id": "seed-32"
  },
  {
    "name": "ミネベアミツミ",
    "jsx": "ミネベアミツミ",
    "stages": [
      5
    ],
    "subs": [
      "05_flight",
      "05_robot"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "東証プライム(6479)",
    "rev": "約1.5兆円",
    "prod": "航空機・防衛用モータ、アクチュエータ、精密軸受、磁石内製技術",
    "pos": "防衛省・民間航空機向け特殊モータで確立した地位",
    "def": "航空機、艦艇、eVTOL、精密ロボティクス",
    "chn": "中～高。内製/外部調達、NdFeB/SmCo、Dy/Tb/Sm調達元を確認",
    "ev": "B",
    "exc": 1,
    "src": "JSX／DyTb DD／Sm DD",
    "note": "売上条件は例外",
    "id": "seed-33"
  },
  {
    "name": "岩谷産業",
    "jsx": "Sc DD追加",
    "stages": [
      2
    ],
    "subs": [
      "02_trade"
    ],
    "tags": [
      "Sc"
    ],
    "own": "東証プライム(8088)",
    "rev": "1,000億円超（例外）",
    "prod": "Sc₂O₃を含むレアアース化合物の調達、国内粉砕・品質保証",
    "pos": "商社機能と国内加工・品質保証を組み合わせたSc商流ノード",
    "def": "ScSZ、単結晶、Al–Scターゲット、航空宇宙・電子材料への原料供給",
    "chn": "高。Sc₂O₃の供給国・メーカー、国内加工前原産地、中国輸出許可を確認",
    "ev": "B",
    "exc": 1,
    "src": "Sc DD／https://www.iwatani.co.jp/jpn/business/material/resources-advanced/products/re/",
    "note": "会社別Sc調達比率は非開示",
    "id": "seed-34"
  },
  {
    "name": "オーエステック",
    "jsx": "Sc DD追加",
    "stages": [
      2
    ],
    "subs": [
      "02_compound",
      "02_metal",
      "02_trade"
    ],
    "tags": [
      "Sc"
    ],
    "own": "非上場",
    "rev": "小規模・条件内推定",
    "prod": "Sc金属、酸化Sc、Al–Sc用途向け特殊レアメタル供給",
    "pos": "少量・特殊規格の輸入・商流ノード",
    "def": "航空宇宙Al合金、特殊光学膜、原子炉関連、研究開発",
    "chn": "高。製造国、輸入元、原産国証明、在庫、再輸出管理を確認",
    "ev": "B",
    "exc": 0,
    "src": "Sc DD／https://www.ostech.co.jp/products/special_raremetal/scandium/",
    "note": "量産能力・国内加工深度は要確認",
    "id": "seed-35"
  },
  {
    "name": "フルヤ金属",
    "jsx": "Sc DD追加",
    "stages": [
      2,
      3,
      4
    ],
    "subs": [
      "02_metal",
      "03_light_alloy",
      "04_target"
    ],
    "tags": [
      "Sc"
    ],
    "own": "東証プライム(7826)",
    "rev": "573.79億円（2025年6月期）",
    "prod": "Al–Scスパッタリングターゲット、酸化Sc還元・Al–Sc母合金製錬技術",
    "pos": "2022～23年にAl–Scターゲット量産開始。国内外顧客へ展開",
    "def": "5G／6G RFフィルター、衛星通信、HAPS、UAV、MEMS・高温センサー",
    "chn": "高～中。現行Sc調達国、中国許可、国内還元・使用済みターゲット回収の量産化を確認",
    "ev": "A",
    "exc": 0,
    "src": "Sc DD／https://www.furuyametals.co.jp/stories/future03/／https://www.furuyametals.co.jp/ir/message/",
    "note": "Sc原料の金属化・Al-Scターゲット用合金調製からターゲット製造までを表現し、Stage 02『金属化・還元／一次金属』、Stage 03『Al-Sc母合金（構造材・半導体）』、Stage 04『薄膜・スパッタリングターゲット』に配置",
    "id": "seed-36"
  },
  {
    "name": "東洋アルミニウム",
    "jsx": "Sc DD追加",
    "stages": [
      3
    ],
    "subs": [
      "03_am_feedstock"
    ],
    "tags": [
      "Sc"
    ],
    "own": "日本軽金属ホールディングス100%子会社",
    "rev": "1,133.59億円（2026年3月期・やや超過）",
    "prod": "Scalmalloy®／SPHERALLOY、AlMg4.5Sc0.7Zr0.3のAM用球状粉末",
    "pos": "APWORKSとScalmalloyの開発・製造・流通で戦略提携",
    "def": "航空宇宙構造、衛星部品、熱交換器、軽量高強度AM部品",
    "chn": "高～要確認。Sc原料・母合金、APWORKS指定調達、航空認証ロットの代替可否",
    "ev": "A",
    "exc": 1,
    "src": "Sc DD／https://www.toyal.co.jp/products/pw_pt/product/powdalloy.html／https://www.toyal.co.jp/abouttoyal/",
    "note": "売上条件を約134億円超過する例外",
    "id": "seed-37"
  },
  {
    "name": "UACJ",
    "jsx": "Sc DD追加",
    "stages": [
      3,
      4
    ],
    "subs": [
      "03_light_alloy",
      "03_am_feedstock",
      "04_am"
    ],
    "tags": [
      "Sc"
    ],
    "own": "東証プライム(5741)",
    "rev": "1,000億円超（例外）",
    "prod": "WAAM向けSc入り高強度Al合金ワイヤー、輸送機器用Al–Sc合金",
    "pos": "JAXA・三菱重工・富山住友電工と国内初のロケット用Al–Sc実用化を推進",
    "def": "ロケット推進薬タンク、大型宇宙輸送構造、高温軽量部品",
    "chn": "低～中。豪州Sc共同開発ルートと量産時の原料ソース、ロケット認証を確認",
    "ev": "A",
    "exc": 1,
    "src": "Sc DD／https://www.uacj.co.jp/release/20250303.html／https://www.uacj.co.jp/release/20210826.html",
    "note": "非中国原料開発側の戦略例外",
    "id": "seed-38"
  },
  {
    "name": "富山住友電工",
    "jsx": "Sc DD追加",
    "stages": [
      3
    ],
    "subs": [
      "03_light_alloy",
      "03_am_feedstock"
    ],
    "tags": [
      "Sc"
    ],
    "own": "住友電気工業100%子会社・非上場",
    "rev": "非公開",
    "prod": "WAAM向けSc入り高強度Al合金ワイヤーの試作・量産工程開発",
    "pos": "UACJ・三菱重工・JAXA共同研究のワイヤー製造ノード",
    "def": "ロケット推進薬タンク、大型宇宙輸送構造、将来の航空宇宙溶接ワイヤー",
    "chn": "中～高・未確定。Sc₂O₃直接購入かAl–Sc中間材受入か、母合金供給元、工程分担を確認",
    "ev": "A",
    "exc": 0,
    "src": "Sc DD／https://www.kenkai.jaxa.jp/project/kakushinyusou/results/pdf/01_06.pdf／https://www.uacj.co.jp/release/20250303.html",
    "note": "『国内3社のみ』『ミサイル用途』『中国100%依存』は根拠不足のため不採用 ／ Stage 03『Al-Sc母合金（構造材・半導体）』『金属AM・結合用原料』を横断",
    "id": "seed-39"
  },
  {
    "name": "日本触媒",
    "jsx": "Sc DD追加",
    "stages": [
      4
    ],
    "subs": [
      "04_elec"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "東証プライム(4114)",
    "rev": "約4,000億円（2026年3月期・例外）",
    "prod": "3YSZ・8YSZ、6ScSZ・10Sc1CeSZのSOFC用ジルコニア電解質シート",
    "pos": "日本国内で商業生産し、最大1,000cm²のカスタム品を世界のSOFCメーカーへ展開",
    "def": "基地・艦艇・遠隔地用分散電源、SOFC・SOEC",
    "bom": "公式製品表で3YSZ（Y2O3 3mol%）、8YSZ（Y2O3 8mol%）、6ScSZ、10Sc1CeSZを確認。",
    "chn": "中～高。YSZ／ScSZ粉末供給元、Y・Sc原産国、顧客認証、材料系統別の生産比率を確認",
    "ev": "A",
    "exc": 1,
    "src": "Sc DD／https://www.shokubai.co.jp/ja/products/detail/sofc/",
    "note": "YSZ・ScSZ系SOFC電解質シートの国内商業生産ノード",
    "id": "seed-40"
  },
  {
    "name": "福田結晶技術研究所",
    "jsx": "Sc DD追加",
    "stages": [
      4,
      3
    ],
    "subs": [
      "04_sc_crystal",
      "03_precursor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "非上場",
    "rev": "小規模・条件内推定",
    "prod": "ScAlMgO₄（SAM）単結晶・ウエハ",
    "pos": "世界初の4インチSAM単結晶、2インチ無転位結晶。6インチ化を開発",
    "def": "GaN LED／LD、RF・パワーデバイス、レーザー、レーダー、衛星通信",
    "chn": "高～要確認。Sc₂O₃調達元、結晶歩留まり、坩堝・育成炉能力、代替基板を確認",
    "ev": "A",
    "exc": 0,
    "src": "Sc DD／https://fxtal2002.com/technology/crystal1",
    "note": "Sc含有単結晶・半導体基板の国内最重要候補",
    "id": "seed-41"
  },
  {
    "name": "NTTデータ ザムテクノロジーズ",
    "jsx": "Sc DD追加",
    "stages": [
      4
    ],
    "subs": [
      "04_am"
    ],
    "tags": [
      "Sc"
    ],
    "own": "NTTデータグループ・非上場",
    "rev": "非公開",
    "prod": "Al合金粉末の金属積層造形、東洋アルミ・日軽MCとの粉末循環",
    "pos": "金属AMの造形・再資源化ノード",
    "def": "航空宇宙・防衛向け複雑形状、軽量構造、熱交換器",
    "chn": "中～要確認。Scalmalloy実使用比率、粉末銘柄、航空顧客、認証、Sc回収率を確認",
    "ev": "C",
    "exc": 0,
    "src": "Sc DD／https://www.toyal.co.jp/whatsnews/2023/10/2023100501.html",
    "note": "Scalmalloyの直接採用は未確認のため監視ノード",
    "id": "seed-42"
  },
  {
    "name": "デンソー",
    "jsx": "Sc DD追加",
    "stages": [
      5
    ],
    "subs": [
      "05_rf_sensor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "東証プライム(6902)",
    "rev": "1,000億円超（例外）",
    "prod": "産総研とのScAlN高圧電薄膜・高温センサー共同研究",
    "pos": "ScAlNの初期国内デバイス研究を担った下流候補",
    "def": "航空機、発電機、自動車、化学プラント用高温振動・圧力センサー",
    "chn": "中～要確認。現行量産品のScAlN採用、ターゲット供給元、Sc原産国をBOM確認",
    "ev": "B",
    "exc": 1,
    "src": "Sc DD／https://www.aist.go.jp/aist_j/press_release/pr2008/pr20081121/pr20081121.html",
    "note": "量産Sc採用は未確認。R&D・下流監視ノード",
    "id": "seed-43"
  },
  {
    "name": "JX金属",
    "jsx": "正式採用追加",
    "stages": [
      3,
      4
    ],
    "subs": [
      "03_precursor",
      "03_light_alloy",
      "04_opt",
      "04_target"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "東証プライム(5016)。AlScスパッタリングターゲットは薄膜材料事業。YAGセラミックスの担当事業部・製造拠点・子会社は公式公開資料で非開示。",
    "rev": "連結売上高8,846億円（2026年3月期）／YAGセラミックス事業売上は非開示（開発品）",
    "prod": "Nd:YAG・Yb:YAG等の透明YAGセラミックス（最大6インチ、高均質・高濃度ドープ）。／低酸素AlSc合金スパッタリングターゲット（開発品、AlScN圧電膜・BAW/RFフィルタ向け）。",
    "pos": "YAGはセラミックス原料粉体のハンドリング・焼結技術を応用。AlScターゲットは薄膜材料事業が高純度化・合金化・組織制御を用いて開発。構造用Al-Sc合金材の製造・加工は公開情報で確認できない。",
    "def": "EX-Fusionとレーザー核融合向け共同開発。高出力レーザー、宇宙センシング等へ接続。防衛納入は非開示。 ／ RFフィルターはレーダー・衛星通信へ転用可能だが、会社用途は移動通信端末中心。",
    "bom": "YAG（Y₃Al₅O₁₂）を製品として明示。 ／ AlScターゲットを公式掲載。",
    "chn": "Y・Sc原料の調達国と中国比率は非開示。AlScターゲットは開発品で、Sc原料ソース・量産拠点・認定状況も非開示。",
    "gap": "Y₂O₃の原産国、非中国供給比率、在庫、YAG量産能力と認証顧客を確認。 ／ AlSc量産開始、単独シェア、航空宇宙・防衛顧客、Sc原産国を確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.jx-nmm.com/products/development/yag/ ／ https://www.jx-nmm.com/products/sputtering/alsc/ ／ https://www.jx-nmm.com/company/industry/thin_film/ ／ https://www.jx-nmm.com/newsrelease/2025/10/14/upload_files/6019045_01_20251014_01.pdf ／ https://www2.jpx.co.jp/disc/50160/140120260510521173.pdf",
    "note": "Stage 03『結晶（YAG・SAM）・セラミックス・前駆体』『Al-Sc母合金（構造材・半導体）』、Stage 04『固体レーザー発振器（YAG）』『薄膜・スパッタリングターゲット』を横断。母合金分類はAlScターゲット用合金の調製・加工能力に基づくもので、航空構造用Al-Sc材の実績を意味しない。",
    "formal": true,
    "formalSource": "採用候補（Y／04_opt） ／ 監視（Sc／04_target）",
    "id": "seed-44"
  },
  {
    "name": "Linde AMT Japan",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "外資・日本法人",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "YSZ系TBC材料、APS／EBPVD／SPS等のコーティング、航空部品向け特殊工程。",
    "pos": "材料・装置・施工を垂直統合。日本拠点はJIS Q 9100・Nadcap Coatings認証。",
    "def": "航空エンジンのブレード・ベーン向けTBCに直接接続。",
    "bom": "主要TBC材料としてYSZを公式解説。",
    "chn": "日本法人の粉末調達国、中国Y比率、輸出許可影響は非開示。 ／ 構造的曝露",
    "gap": "国内施工と輸入粉末の分担、認証顧客・エンジンプログラム、供給元代替性を確認。",
    "ev": "A-",
    "exc": 0,
    "src": "https://www.linde-amt.com/resource-library/articles/thermal-barrier-coatings ／ https://www.linde-amt.com/resource-library/articles/aerospace-coating ／ https://www.linde-amt.com/about-us/locations",
    "note": "日本国内供給ノード。兵庫・埼玉等に拠点。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／04_coat）",
    "formal": true,
    "formalSource": "採用候補（Y／04_coat）",
    "id": "seed-45"
  },
  {
    "name": "SHM株式会社",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "日本企業／商流",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "NdFeB・SmCo等の磁石調達・加工・販売。",
    "pos": "中国系供給ネットワークを持つが、国内外シェアは未確認。",
    "def": "航空・通信用途を訴求するが、防衛顧客・型番は未確認。",
    "bom": "NdFeB／SmCoを扱う。Dy/Tb含有量は非開示。",
    "chn": "中国商流への直接接続が示唆される。 ／ 商流曝露／要確認",
    "gap": "メーカー・原産地、Dy/Tb含有量、防衛納入、用途別売上を確認。",
    "ev": "C",
    "exc": 0,
    "src": "https://j-shm.co.jp/ ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf ／ https://english.mofcom.gov.cn/Policies/AnnouncementsOrders/art/2025/art_0dd87cbee7b045bf93fabe6ab2faceee.html",
    "note": "高シェア・直接防衛用途が不足。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb・Sm／04_mag）",
    "formal": true,
    "formalSource": "監視（DyTb・Sm／04_mag）",
    "id": "seed-46"
  },
  {
    "name": "アイ・シイ・エス",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "航空宇宙エンジン部品向けYSZ・Ni合金等の溶射、熱処理・コーティング特殊工程。",
    "pos": "航空宇宙特殊工程を約50年、JIS Q 9100・Nadcap認証。一貫加工の国内ニッチ。定量シェアは非開示。",
    "def": "航空宇宙エンジン部品・燃焼器部品・YSZ溶射を公式資料に明示。",
    "bom": "溶射膜種としてYSZを会社資料で確認。",
    "chn": "YSZ粉末供給元、Y₂O₃原産地、中国比率は非開示。 ／ 構造的曝露",
    "gap": "YSZ粉末銘柄、Nadcap認定範囲、航空防衛顧客比率、安全在庫を確認。",
    "ev": "B+",
    "exc": 0,
    "src": "https://www.ics-21.com/download/AerospaceTechnology_Jp.pdf ／ https://www.ics-21.com/wp/wp-content/uploads/2026/06/ICS_Company_Profile_2024.3_Latest.pdf ／ https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-yttrium.pdf",
    "note": "条件2は長期実績・特殊工程認証で代替評価。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／04_coat）",
    "formal": true,
    "formalSource": "採用候補（Y／04_coat）",
    "id": "seed-47"
  },
  {
    "name": "エリコンジャパン／Oerlikon Metco",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "外資・日本法人／拠点",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "8YSZ・MCrAlY粉末、溶射装置、コーティングサービス。",
    "pos": "世界的な溶射技術リーダー。材料・装置・施工を一括提供し、航空エンジンTBCで強い地位。",
    "def": "ジェットエンジン、アフターバーナー、着陸装置、ポンプ、アクチュエータを対象。",
    "bom": "8YSZおよびMCrAlYをTBC材料として明示。",
    "chn": "グローバル調達および日本向け供給のY原産国・中国比率は非開示。 ／ 構造的曝露",
    "gap": "日本法人の在庫・輸入経路、航空認証済み粉末の原産国、中国輸出許可の影響を確認。",
    "ev": "A-",
    "exc": 0,
    "src": "https://www.oerlikon.com/metco/en/products-services/materials/understanding-tbcs-thermal-barrier-coatings/ ／ https://www.oerlikon.com/metco/ja/%E5%B8%82%E5%A0%B4/%E8%88%AA%E7%A9%BA%E5%AE%87%E5%AE%99/ ／ https://www.oerlikon.com/metco/en/about-us/locations/oerlikon-tokyo/",
    "note": "日本企業限定ではなく、日本国内供給ノードとして収録。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／04_coat）",
    "formal": true,
    "formalSource": "採用候補（Y／04_coat）",
    "id": "seed-48"
  },
  {
    "name": "シグマ光機／OptoSigma",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_opt"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "Yb:YAGレーザー結晶スラブ、YAG系光学部品の販売。",
    "pos": "光学部品の幅広い品揃えを持つが、対象製品シェアは未確認。",
    "def": "高出力レーザー研究・加工へ供給可能。防衛・宇宙顧客は未確認。",
    "bom": "Yb:YAG製品を公式販売。",
    "chn": "結晶製造者・Y原産国は非開示。 ／ 構造的曝露",
    "gap": "製造主体、原産国、防衛・宇宙顧客、販売シェアを確認。",
    "ev": "C",
    "exc": 0,
    "src": "https://www.optosigma.com/us_en/optics/yb-yag-laser-crystal-a-slab.html ／ https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-yttrium.pdf ／ https://english.mofcom.gov.cn/Policies/AnnouncementsOrders/art/2025/art_0dd87cbee7b045bf93fabe6ab2faceee.html",
    "note": "商社・加工販売ノードの可能性。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（Y／04_opt）",
    "formal": true,
    "formalSource": "監視（Y／04_opt）",
    "id": "seed-49"
  },
  {
    "name": "倉敷ボーリング機工",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "YSZ、Y₂O₃、MCrAlYの溶射。航空エンジン燃焼筒・タービンブレードのTBC施工。",
    "pos": "JIS Q 9100・Nadcap Coatings等の特殊工程認証を持つ国内ニッチ施工企業。定量シェアは非開示。",
    "def": "航空機エンジンのTBC、燃焼筒、タービンブレード、ランディングギア用途を公式掲載。",
    "bom": "ZrO₂-Y₂O₃、Y₂O₃、MCrAlYを材料一覧に明示。",
    "chn": "粉末サプライヤー、Y₂O₃原産国、中国比率は非開示。 ／ 構造的曝露",
    "gap": "航空認証済み粉末の銘柄・原産国、供給元切替時の再認証期間、顧客別売上を確認。",
    "ev": "A-",
    "exc": 0,
    "src": "https://www.kbknet.co.jp/thermal-spraying/thermal-spraying-list/ ／ https://www.kbknet.co.jp/semiconductor-spaceindustry/ ／ https://www.kbknet.co.jp/quality/",
    "note": "条件2は認証・ニッチ性で代替評価。シェアは未確認。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／04_coat）",
    "formal": true,
    "formalSource": "採用候補（Y／04_coat）",
    "id": "seed-50"
  },
  {
    "name": "相模化学金属",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_mag"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "日本企業／商流",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "SmCo・NdFeB磁石の輸入販売・加工、輸出管理情報提供。",
    "pos": "希土類磁石の専門商流だが、対象用途シェアは未確認。",
    "def": "特殊磁石は航空宇宙・防衛に転用可能。直接顧客は非開示。",
    "bom": "SmCo取扱いを確認。Dy/TbはNdFeBグレード依存。",
    "chn": "中国輸出管理の影響を自社資料で説明。会社別調達比率は非開示。 ／ 商流曝露",
    "gap": "原産国、供給元、Dy/Tb含有量、防衛顧客、シェアを確認。",
    "ev": "C",
    "exc": 0,
    "src": "https://www.sagami-magnet.co.jp/glossary/%E3%82%B5%E3%83%9E%E3%82%B3%E3%83%90%E7%A3%81%E7%9F%B3 ／ https://www.sagami-magnet.co.jp/wp-content/uploads/2025/04/China_Rare_Earth_Items_7Types-Impact_of_Export_Control4_0522.pdf ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "商流監視候補。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb・Sm／04_mag）",
    "formal": true,
    "formalSource": "監視（DyTb・Sm／04_mag）",
    "id": "seed-51"
  },
  {
    "name": "放電精密加工研究所",
    "jsx": "正式採用追加",
    "stages": [
      4
    ],
    "subs": [
      "04_coat"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "航空エンジン部品の表面処理・溶射。",
    "pos": "航空宇宙の特殊工程を担う国内企業。Y系材料でのシェアは未確認。",
    "def": "航空エンジン部品へ直接接続。",
    "bom": "YSZ／Y₂O₃の使用を公開資料で確認できず。",
    "chn": "Y曝露は未立証。 ／ BOM未確認",
    "gap": "溶射膜種、YSZ使用、粉末供給元、Nadcap範囲を確認。",
    "ev": "C",
    "exc": 0,
    "src": "https://www.hsk.co.jp/ja/introduction/aerospace.html ／ https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-yttrium.pdf ／ https://english.mofcom.gov.cn/Policies/AnnouncementsOrders/art/2025/art_0dd87cbee7b045bf93fabe6ab2faceee.html",
    "note": "Y系BOM確認後に再評価。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（Y／04_coat）",
    "formal": true,
    "formalSource": "監視（Y／04_coat）",
    "id": "seed-52"
  },
  {
    "name": "EX-Fusion",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_laser"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "レーザー核融合向け高出力レーザー、光制御、ターゲット追尾・照射。",
    "pos": "模擬燃料への毎秒10回連続照射を世界初実証。国内唯一の民間レーザー核融合企業を標榜。",
    "def": "高速移動ターゲット追尾・精密照射・高出力光制御はデュアルユース性が高いが防衛顧客は非開示。",
    "bom": "JX金属とYAGセラミックスを共同開発。現行装置BOMは未確認。",
    "chn": "YAGのY原料を通じた構造曝露。 ／ 構造的曝露",
    "gap": "現行装置のYAG採用比率、用途別売上、防衛・宇宙顧客、調達先を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://ex-fusion.com/news/%E4%B8%96%E7%95%8C%E5%88%9D%E3%80%811%E7%A7%92%E9%96%93%E3%81%AB10%E5%9B%9E%E3%80%81%E6%A8%A1%E6%93%AC%E7%87%83%E6%96%99%E3%81%AB%E5%AF%BE%E3%81%99%E3%82%8B%E3%83%AC%E3%83%BC%E3%82%B6%E3%83%BC ／ https://ex-fusion.com/component ／ https://www.jx-nmm.com/newsrelease/2025/20251014_01.html",
    "note": "YAG接続は確認済みだが現行システムBOMが不足。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（Y／05_laser）",
    "formal": true,
    "formalSource": "監視（Y／05_laser）",
    "id": "seed-53"
  },
  {
    "name": "maxon Japan／maxon group",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_robot",
      "05_sat"
    ],
    "tags": [
      "Sm"
    ],
    "own": "外資・日本法人",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "宇宙・ロボティクス用精密モーター。別製品系列でSmCo磁石を明示。",
    "pos": "NASA火星ローバーで25年以上の採用実績。",
    "def": "火星ローバー、衛星、ISS、宇宙船、ロケットエンジンバルブ等。",
    "bom": "HDモーターのSmCo使用は確認できるが、宇宙搭載型が同仕様か未確認。",
    "chn": "SmCo型番の原産国・中国比率は非開示。 ／ 可能性／同一型番未確認",
    "gap": "宇宙搭載型番のSmCo採用、製造国、原産国証明、日本法人の供給範囲を確認。",
    "ev": "B-",
    "exc": 0,
    "src": "https://www.maxongroup.com/en/knowledge-and-support/blog/maxon-drives-on-the-red-planet-18150 ／ https://www.maxongroup.com/en-us/market-solutions/industrial-automation/oil-and-gas-industry ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "用途とBOMの同一性が確認できるまで監視。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（Sm／05_sat・05_robot）",
    "formal": true,
    "formalSource": "監視（Sm／05_sat・05_robot）",
    "id": "seed-54"
  },
  {
    "name": "Niterra（エネルギー事業本部）",
    "jsx": "SOFC/SOEC追加DD正式採用",
    "stages": [
      5
    ],
    "subs": [
      "05_energy"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "東証プライム（5334）。CECYLLS・森村SOFCテクノロジーをグループ会社として保有。",
    "rev": "連結売上高7,312億円。SOFC／SOEC事業売上は非開示。",
    "prod": "平板型・円筒型SOFC量産系列、単一セルスタックでSOFC／SOECを切り替える可逆SOC（rSOC）システム。",
    "pos": "高温電気化学、酸素センサ由来のセラミックス量産、平板・円筒の製造系列と約700℃ホットモジュールを統合。",
    "def": "分散型・非常用電源、長期水素貯蔵、基地レジリエンスへ転用可能。ただし防衛契約・装備搭載実績は公開未確認。",
    "bom": "現行説明はジルコニア電解質を明記。Y／Sc安定化剤の種類・含有量、原料供給元は非開示。",
    "chn": "ジルコニア安定化剤がYまたはScの場合に希土類原料へ構造曝露。現行BOMと原産国は要確認。",
    "gap": "rSOC製品化時期、年産能力、グループ内IP・製造分担、防衛BCP用途、ジルコニア安定化剤とY／Sc原料調達を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.niterragroup.com/english/business/innovation/new_business/rsoc/ ／ https://www.niterragroup.com/english/business/innovation/sofc/ ／ https://www.niterragroup.com/english/corporate/networks/ ／ https://www.niterragroup.com/ir/",
    "note": "旧『Niterra（日本特殊陶業）』監視カードを追加DDで更新。工程5『SOFC／SOEC』へ正式採用し、重要として表示。",
    "formal": true,
    "formalSource": "SOFC/SOEC追加DD：正式採用",
    "id": "seed-55"
  },
  {
    "name": "三菱重工業（エナジードメイン）",
    "jsx": "SOFC/SOEC追加DD正式採用",
    "stages": [
      5
    ],
    "subs": [
      "05_energy"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "東証プライム（7011）。エナジードメインがSOFC／SOECのシステム開発・統合を担当。",
    "rev": "連結売上収益4兆9,741億円（2025年度）。SOFC／SOEC事業売上は非開示。",
    "prod": "円筒横縞型SOFC／SOECセルスタック、カートリッジ、モジュール、BOP、250kW級SOFC-MGT、400kW級SOECシステム。",
    "pos": "セル設計からカートリッジ、熱・流体、発電・電解システムまで統合。400kW級SOECデモ機を約3,000時間運転し、MW級を検討。",
    "def": "同一法人が潜水艦・艦艇・航空防衛のプライム能力を保有し、基地・艦艇電源への統合余地が大きい。ただしSOFC／SOECの防衛契約・艦載実績は公開未確認。",
    "bom": "自社資料で安定化ジルコニア電解質まで確認。安定化剤がYかScか、含有量、原料国・供給元は非開示。",
    "chn": "電解質安定化剤に由来するY／Sc原料曝露の可能性。BOM確認まで元素別依存は確定しない。",
    "gap": "防衛省向け契約、MIL規格、JP-5／JP-8対応、閉鎖循環・排熱、艦載試験、セルBOMとY／Sc原料調達を確認。",
    "ev": "A",
    "exc": 1,
    "src": "https://www.mhi.com/jp/technology/review/sites/g/files/jwhtju2326/files/2025-07/623040.pdf ／ https://www.mhi.com/jp/business/products-services/space-defense/submarines ／ https://www.mhi.com/jp/finance/library/result/ ／ https://www.mhi.com/jp/technology/review/sites/g/files/jwhtju2326/files/tr/pdf/411/411030.pdf",
    "note": "工程5『SOFC／SOEC』へ正式採用。システム統合能力と防衛プライム能力を評価し、最重要として表示。",
    "formal": true,
    "formalSource": "SOFC/SOEC追加DD：正式採用",
    "id": "sofc-dd-mhi"
  },
  {
    "name": "CECYLLS",
    "jsx": "SOFC/SOEC追加DD正式採用",
    "stages": [
      5
    ],
    "subs": [
      "05_energy"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "Niterraグループ。2020年設立時は日本特殊陶業70%・三菱日立パワーシステムズ30%。現行持分は要確認。",
    "rev": "単体売上非開示。設立時資本金3億円。",
    "prod": "MHI系円筒横縞形SOFCセルスタックの製造・販売。",
    "pos": "三菱重工系のセル設計とNiterraのセラミックス量産技術を接続する専用スタック量産ノード。",
    "def": "静粛・高効率な分散電源、基地・艦艇補助電源へ転用可能。ただし防衛契約、艦艇／UAV搭載、MIL試験は公開未確認。",
    "bom": "セラミック基体管上に燃料極・電解質・空気極・インターコネクタを形成。電解質安定化剤とY／Sc比率は非開示。",
    "chn": "電解質のY／Sc原料、原産国、単一供給依存は非開示。",
    "gap": "現行株主比率、年産本数、歩留まり、単一顧客依存、SOEC対応範囲、防衛品質保証、電解質組成・原料供給元を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.niterragroup.com/english/news/detail/002107.html ／ https://www.niterragroup.com/english/corporate/networks/ ／ https://www.niterragroup.com/english/business/innovation/sofc/",
    "note": "工程5『SOFC／SOEC』へ正式採用し、重要として表示。",
    "formal": true,
    "formalSource": "SOFC/SOEC追加DD：正式採用",
    "id": "sofc-dd-cecylls"
  },
  {
    "name": "森村SOFCテクノロジー",
    "jsx": "SOFC/SOEC追加DD正式採用",
    "stages": [
      5
    ],
    "subs": [
      "05_energy"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "Niterraグループ。設立時出資は日本特殊陶業67%、TOTO20%、日本ガイシ8%、ノリタケ5%。",
    "rev": "単体売上非開示。設立時資本金1億円。",
    "prod": "平板型SOFCのセル、スタック、モジュール、システムを研究・開発・製造・販売。DC500Wモノジェネ試作機。",
    "pos": "2021年に量産開始。2025年にDC500W、効率65%、48kg、水素混合対応試作機を公表し、2027年度商品化を目標。",
    "def": "可搬・遠隔の静粛電源、監視設備、基地電源へ転用可能。ただし防衛顧客、軍用燃料、耐振動・耐衝撃試験は公開未確認。",
    "bom": "SOFC電解質はジルコニア系と説明。平板セルの安定化剤、Y／Sc含有量、調達元は非開示。",
    "chn": "セル電解質のY／Sc原料と供給国は非開示。",
    "gap": "可搬式の商品化、年産能力・顧客、燃料柔軟性、起動時間、MIL試験、セル電解質組成・原料供給元を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.niterragroup.com/news/upload/f679bfe62f0ddc701713cdacb7375518.pdf ／ https://www.niterragroup.com/english/corporate/networks/ ／ https://www.niterragroup.com/english/business/innovation/sofc/ ／ https://jp.toto.com/company/press/company/management/2019_12_03_009224/",
    "note": "工程5『SOFC／SOEC』へ正式採用し、重要として表示。",
    "formal": true,
    "formalSource": "SOFC/SOEC追加DD：正式採用",
    "id": "sofc-dd-morimura"
  },
  {
    "name": "NPMハイテクノロジーズ",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_guid",
      "05_sat"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "日本企業／外資製品の国内商流",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "Kollmorgen等の高性能モーターの選定・技術支援。シーカー、レーダー、宇宙用アクチュエータ。",
    "pos": "航空・宇宙・防衛用途の長期供給実績を公表。NPM自身の用途別シェアは未確認。",
    "def": "ミサイル、IRカメラジンバル、レーダー、無人システム、衛星向け。",
    "bom": "取扱KBMモーターはNdFeB磁石を明記。Dy/Tbの有無・含有量は非開示。",
    "chn": "NdFeBの高保磁力グレードではDy/Tb曝露の可能性。型番別BOM未確認。 ／ 可能性／BOM未確認",
    "gap": "日本向け型番の磁石組成、Dy/Tb含有量、原産国、用途別シェアを確認。",
    "ev": "B-",
    "exc": 0,
    "src": "https://npm-ht.co.jp/features/aerospace-defense ／ https://www.kollmorgen.com/en-us/products/motors/direct-drive/kbm-series-frameless ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "Dy/Tbフラグは仮置き。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb／05_guid・05_sat）",
    "formal": true,
    "formalSource": "監視（DyTb／05_guid・05_sat）",
    "id": "seed-56"
  },
  {
    "name": "キヤノン電子",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "小型衛星、リアクションホイール、磁気トルカ、各種センサー・アクチュエータ。",
    "pos": "自社衛星と主要コンポーネントを内製・販売。希土類関連製品のシェアは未確認。",
    "def": "CE-SAT、H3搭載、小型ロケット飛行制御へ接続。",
    "bom": "モーター・磁性部品技術は明示するが永久磁石材種は非開示。",
    "chn": "Dy/Tb/Sm曝露は未立証。 ／ BOM未確認",
    "gap": "リアクションホイール／トルカの磁石材種、原産国、宇宙用途シェアを確認。",
    "ev": "C+",
    "exc": 0,
    "src": "https://www.canon-elec.co.jp/space/ ／ https://www.canon-elec.co.jp/products/motor/dc/ ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "希土類フラグは候補仮置き。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb・Sm／05_sat）",
    "formal": true,
    "formalSource": "監視（DyTb・Sm／05_sat）",
    "id": "seed-57"
  },
  {
    "name": "トルンプ（TRUMPF日本法人）",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_laser"
    ],
    "tags": [
      "Y"
    ],
    "own": "外資・日本法人",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "Yb:YAGディスクを中核とするTruDisk高出力固体レーザー、レーザー加工システム。",
    "pos": "産業用レーザーの世界市場リーダーを標榜。高出力ディスクレーザーで確立した地位。",
    "def": "航空宇宙用タービン／コンプレッサーブレード、ブリスク、ロケット・宇宙部品の製造・修理に利用。",
    "bom": "ディスクレーザー媒質はYb:YAG。日本向け機種別BOMは要確認。",
    "chn": "レーザー媒質のY原産地、中国比率は非開示。 ／ 構造的曝露",
    "gap": "日本向け装置のYb:YAG調達元、航空防衛顧客比率、媒質交換・在庫体制を確認。",
    "ev": "B+",
    "exc": 0,
    "src": "https://www.trumpf.com/ja_JP/%E8%A3%BD%E5%93%81/%E3%83%AC%E3%83%BC%E3%82%B6/%E3%83%AC%E3%83%BC%E3%82%B6%E8%A3%85%E7%BD%AE/cw%E3%83%AC%E3%83%BC%E3%82%B6/trudisk/ ／ https://www.trumpf.com/ja_JP/%E3%82%BD%E3%83%AA%E3%83%A5%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3/%E6%A5%AD%E7%95%8C/%E8%88%AA%E7%A9%BA%E5%AE%87%E5%AE%99%E7%94%A3%E6%A5%AD/ ／ https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-yttrium.pdf",
    "note": "日本国内販売・保守ノードとして収録。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／05_laser）",
    "formal": true,
    "formalSource": "採用候補（Y／05_laser）",
    "id": "seed-58"
  },
  {
    "name": "ニデック／Nidec Aerospace",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "日本企業／海外JV",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "eVTOL用電動推進ユニット、234 kW級リフトモーター。",
    "pos": "精密小型ブラシレスモーターで世界的地位。航空推進JVを設立。航空製品シェアは未確立。",
    "def": "有人・無人航空機、eVTOL、ドローン用電動推進。",
    "bom": "eVTOLと希土類永久磁石を技術解説で関連付けるが、量産EPUの材種・Dy/Tb量は未開示。",
    "chn": "高性能NdFeBを通じた構造曝露の可能性。 ／ 可能性／BOM未確認",
    "gap": "EPUの磁石材種、Dy/Tb使用量、量産顧客、非中国磁石調達を確認。",
    "ev": "B-",
    "exc": 0,
    "src": "https://www.nidec.com/jp/technology/motor/academic/020/ ／ https://moen.nidec.com/aerospace/ ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "航空BOMが確認できるまで監視。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb／05_flight）",
    "formal": true,
    "formalSource": "監視（DyTb／05_flight）",
    "id": "seed-59"
  },
  {
    "name": "関東航空計器",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "防衛向けモーター駆動ジンバル、空間安定装置、航法・自動操縦装置。",
    "pos": "FDR国内シェアNo.1を自社公表。ジンバルの磁石関連シェアは未確認。",
    "def": "防衛省、戦闘機、飛翔体、艦艇向け。",
    "bom": "モーター駆動は確認できるが永久磁石方式・磁石材種は非開示。",
    "chn": "Dy/Tb/Sm曝露は未立証。 ／ BOM未確認",
    "gap": "ジンバルモーター方式、磁石材種、原産国証明、用途別売上を確認。",
    "ev": "C+",
    "exc": 0,
    "src": "https://www.kaiweb.jp/index.html ／ https://www.kaiweb.jp/gimbal.html ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "条件2はFDR事業のシェアであり対象磁石製品とはずれがある。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 監視（DyTb・Sm／05_guid）",
    "formal": true,
    "formalSource": "監視（DyTb・Sm／05_guid）",
    "id": "seed-60"
  },
  {
    "name": "東芝（株式会社東芝）",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "Sm"
    ],
    "own": "日本企業",
    "rev": "年間売上高（連結）3兆7,091億円（2026年3月31日現在）",
    "prod": "100 kW級空冷高出力密度モーター。2 MW級航空機推進システムを視野。",
    "pos": "航空機推進向け高出力密度モーター・電動化技術の研究開発ノード。",
    "def": "JAXA環境を想定した航空機推進系の電動化に直結。",
    "bom": "SmCo磁石の使用を会社資料で明示。",
    "chn": "Sm原料の調達国・中国比率は非開示。中国はSm供給・磁石生産の主要国。 ／ 構造的曝露",
    "gap": "SmCo磁石の製造主体、原料ソース、航空認証ロードマップ、量産顧客・在庫を確認。",
    "ev": "A-",
    "exc": 0,
    "src": "https://www.global.toshiba/jp/technology/corporate/review/2024/03.html ／ https://www.global.toshiba/ww/technology/corporate/rdc/rd/topics/17/1703-01.html ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf ／ https://www.global.toshiba/jp/outline/corporate/profile.html",
    "note": "東芝本体はStage 05『飛行制御・電動化』のみ。SmCo磁石材料は東芝マテリアルへ整理。",
    "formal": true,
    "formalSource": "採用候補（Sm／05_flight）",
    "id": "seed-61"
  },
  {
    "name": "日本アビオニクス",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics",
      "05_sat",
      "05_rf_sensor"
    ],
    "tags": [
      "Y",
      "Sc",
      "Sm"
    ],
    "own": "日本企業",
    "rev": "291.94億円（2026年3月期・連結）",
    "prod": "防衛用情報システム、警戒管制・航空管制／戦闘機搭載レーダ向け信号処理・表示装置、航空機搭載関連装置、宇宙用ハイブリッドIC、精密接合装置",
    "pos": "防衛情報システムと航空・宇宙向け高信頼電子機器に強み。JAXA認定ハイブリッドICメーカーで、精密接合では4工法を扱う",
    "def": "警戒管制、航空管制、戦闘機搭載レーダ、航空機搭載装置、人工衛星・ロケットに直接接続",
    "bom": "宇宙・防衛用ハイブリッドICと電子機器は確認。対象機器におけるY系材料・希土類磁石の使用は公開情報で未確認",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "gap": "航空機搭載装置の具体的な機能、モーター／アクチュエータの有無、希土類材料の採否と原産国を確認",
    "ev": "A",
    "exc": 0,
    "src": "https://www.avio.co.jp/company/business/system.html ／ https://www.avio.co.jp/products/device/me/products.html ／ https://www.avio.co.jp/company/business/product.html ／ https://www.avio.co.jp/company/outline/profile.html",
    "note": "現行事業を横断的に再評価し、防衛半導体・電子回路・通信、衛星・宇宙機・ロケット、RF・圧電・高温センサーへ再分類。飛行制御・電動化と高出力レーザーからは除外 ／ 希土類フラグは所属するStage 05サブカテゴリーから自動付与",
    "formal": true,
    "formalSource": "再調査（05_defense_electronics・05_sat・05_rf_sensor／所属サブカテゴリーの元素フラグを継承）",
    "id": "seed-62"
  },
  {
    "name": "日本ムーグ",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_flight",
      "05_guid",
      "05_sat"
    ],
    "tags": [
      "Sm"
    ],
    "own": "外資・日本法人",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "SmCo選択可能なDCトルクモーター、航空・防衛用アクチュエータ／モーション制御。",
    "pos": "Moogは航空宇宙・防衛モーション制御の世界的リーダー。日本法人が国内供給・技術支援。",
    "def": "レーダー、ミサイル、シーカー、火器管制、軍用アクチュエータ、航空機・宇宙作動系を明示。",
    "bom": "製品カタログでSamarium Cobalt magnet、MIL-SPEC 810、Defense用途を同一製品系列で確認。",
    "chn": "Sm磁石の原産国・中国比率は非開示。防衛調達では非中国材の可能性もあるため要個別確認。 ／ 構造的曝露／反証余地",
    "gap": "日本向け防衛・宇宙型番のSmCo採用、磁石製造国・原産国証明、在庫と代替型番を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.moog.co.jp/content/dam/moog/literature/products/motors-servomotors/Moog-Power-and-Data-Motor-and-Resolver-Catalog.pdf ／ https://www.moog.co.jp/products/actuators-servoactuators/defense.html ／ https://www.moog.co.jp/products/actuators-servoactuators/aircraft.html",
    "note": "会社別中国依存は特に不確実。採用はBOM確認条件付き。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Sm／05_guid・05_flight・05_sat）",
    "formal": true,
    "formalSource": "採用候補（Sm／05_guid・05_flight・05_sat）",
    "id": "seed-63"
  },
  {
    "name": "日本航空電子工業",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "H3向けIMU、慣性航法・誘導。別事業で永久磁石リニアモーター。",
    "pos": "H3向けIMU等で高い技術力。",
    "def": "ロケット、航空機、慣性誘導へ直接接続。",
    "bom": "航空宇宙IMUと永久磁石モーターは別製品群で、対象機器のDy/Tb/Sm使用を立証できない。",
    "chn": "希土類曝露未立証。 ／ 非該当",
    "gap": "航空・防衛製品の磁石BOMが開示された場合に再評価。",
    "ev": "C",
    "exc": 0,
    "src": "https://www.jae.com/owned/h3/ ／ https://www.jae.com/Motion_Sensor_Control/ ／ https://www.meti.go.jp/policy/economy/economic_security/magnet/magnet_hoshin_260331.pdf",
    "note": "同一企業内の別製品をつなげる推定は採用しない。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 除外→ユーザー指定（DyTb・Sm／05_guid） ／ 公開情報では対象機器のDy/Tb/Sm磁石BOM未確認だが、ユーザー指定により正式採用。",
    "formal": true,
    "formalSource": "除外→ユーザー指定（DyTb・Sm／05_guid）",
    "id": "seed-64"
  },
  {
    "name": "浜松ホトニクス",
    "jsx": "正式採用追加",
    "stages": [
      5
    ],
    "subs": [
      "05_laser"
    ],
    "tags": [
      "Y"
    ],
    "own": "日本企業",
    "rev": "売上条件解除（本追加DDでは未評価）",
    "prod": "Yb:YAG系LD励起大出力固体レーザー／レーザー照射設備。",
    "pos": "200 J×10 Hz（平均2 kW）のLD励起固体レーザーで世界最高出力を公表。装置・計測・照射施設まで保有。",
    "def": "レーザー核融合、宇宙デブリ除去、半導体露光を経済安全保障上の国家的重要技術として明記。",
    "bom": "高出力固体レーザーのYb:YAG媒質を会社資料で確認。",
    "chn": "Y原料・レーザー媒質の調達先と中国比率は非開示。 ／ 構造的曝露",
    "gap": "Yb:YAG媒質の内製／外製、Y原産国、国家プロジェクト・防衛顧客、代替媒質を確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.hamamatsu.com/content/dam/hamamatsu-photonics/sites/documents/01_HQ/01_news/01_news_2025/2025_08_28_ja.pdf ／ https://www.hamamatsu.com/content/dam/hamamatsu-photonics/sites/documents/01_HQ/01_news/01_news_2025/2025_07_31_ja.pdf ／ https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-yttrium.pdf",
    "note": "以前のSc/GSSG仮説は一次資料で確認できず、Y系のみ採用。 ／ 正式採用ルール: 採用候補 OR 監視 OR 日本航空電子工業。採用元: 採用候補（Y／05_laser）",
    "formal": true,
    "formalSource": "採用候補（Y／05_laser）",
    "id": "seed-65"
  },
  {
    "id": "stage05-integrated-1",
    "name": "アンリツ",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_rf_sensor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：6754",
    "rev": "約1,175億円 ／ 連結実績 ／ 2026/3期",
    "prod": "マイクロ波・ミリ波・光通信・レーダー評価装置、妨害波監視",
    "pos": "衛星・防衛・航空・船舶の通信、レーダー、妨害波評価に直接接続。民生5G計測と技術基盤を共有。",
    "def": "衛星・防衛・航空・船舶の通信、レーダー、妨害波評価に直接接続。民生5G計測と技術基盤を共有。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.anritsu.com/ja-jp/test-measurement/solutions/aerospace-lp ／ https://www.anritsu.com/ja-jp/about-anritsu/corporate-information/profile",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社概要の連結売上高 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-2",
    "name": "東陽テクニカ",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_rf_sensor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：8151",
    "rev": "350–450億円 ／ 概算 ／ 2025/9期",
    "prod": "防衛・海洋ソナー／水中音響、GNSS/INS、レーダー・大形アンテナ評価、衛星レーザー測距",
    "pos": "防衛装備、水中音響、レーダー・地上局アンテナ、JAXA衛星レーザー測距に直接接続。",
    "def": "防衛装備、水中音響、レーダー・地上局アンテナ、JAXA衛星レーザー測距に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.toyo.co.jp/kaiyo/index.html ／ https://www.toyo.co.jp/company/outline/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：直近の連結売上規模を丸めたレンジ ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-3",
    "name": "日本電波工業（NDK）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_rf_sensor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：6779",
    "rev": "約546億円 ／ 連結実績 ／ 2026/3期",
    "prod": "宇宙用水晶振動子・発振器、周波数シンセサイザ、QCMセンサ",
    "pos": "人工衛星・ロケット、官公庁・防衛通信、民生通信・車載に共通する高安定周波数源。",
    "def": "人工衛星・ロケット、官公庁・防衛通信、民生通信・車載に共通する高安定周波数源。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.ndk.com/jp/company/business/ ／ https://www.ndk.com/jp/company/profile/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社概要の2025年度連結売上高 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-4",
    "name": "日本無線（JRC）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_rf_sensor"
    ],
    "tags": [
      "Sc"
    ],
    "own": "非上場子会社 ／ 親会社：日清紡ホールディングス ／ 自社証券コード：非上場（旧6751） ／ 親会社証券コード：3105",
    "rev": "1,000–1,500億円 ／ 概算 ／ 2026年時点",
    "prod": "船舶レーダー、ECDIS、衛星通信、気象レーダー、防衛無線応用機器",
    "pos": "防衛省向け無線応用機器・システムを明示。商船・防災・気象向けと共通技術。",
    "def": "防衛省向け無線応用機器・システムを明示。商船・防災・気象向けと共通技術。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.jrc.co.jp/about",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：親会社セグメント・人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-5",
    "name": "GITAI",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_robot"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "10–30億円 ／ 概算 ／ 2026年時点",
    "prod": "宇宙用自律ロボットアーム、ロボット衛星、月面ローバー",
    "pos": "軌道上サービス、衛星修理・寿命延長、月面建設に直接接続。民間・政府ミッション双方へ展開可能。",
    "def": "軌道上サービス、衛星修理・寿命延長、月面建設に直接接続。民間・政府ミッション双方へ展開可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://gitai.tech/2024/03/19/gitai-completes-fully-successful-technology-demonstration-outside-the-iss/ ／ https://gitai.tech/about/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場スタートアップ。人員・資金調達・開発段階からのレンジ推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-6",
    "name": "THK",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_robot"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "上場企業 ／ 自社証券コード：6481",
    "rev": "約2,404億円 ／ 連結実績 ／ 2025/12期",
    "prod": "LMガイド、ボールねじ、XYステージ、宇宙ロボット用直動機構",
    "pos": "JAXAの軌道上サービス技術実証用大型XYステージやISS船外活動支援ロボットに採用。民生ロボット・工作機械と共通。",
    "def": "JAXAの軌道上サービス技術実証用大型XYステージやISS船外活動支援ロボットに採用。民生ロボット・工作機械と共通。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.thk.com/jp/ja/contents/pages/recruit/about/company/ ／ https://www.thk.com/jp/ja/ir/finance/highlights/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：継続事業ベースの連結売上収益 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-7",
    "name": "日本精工（NSK）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_robot"
    ],
    "tags": [
      "DyTb"
    ],
    "own": "上場企業 ／ 自社証券コード：6471",
    "rev": "約9,000億円 ／ 連結予想 ／ 2026/3期",
    "prod": "精密軸受、ボールねじ、航空・宇宙・ロボット用モーション部品",
    "pos": "航空・宇宙・ロボットの精密運動部に直結。防衛向け個別実績は非開示。",
    "def": "航空・宇宙・ロボットの精密運動部に直結。防衛向け個別実績は非開示。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.nsk.com/jp-ja/company/investors/management/message/ ／ https://www.nsk.com/jp-ja/company/investors/financial-announcements/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社公表の通期予想 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-8",
    "name": "ispace",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：9348",
    "rev": "約47.4億円 ／ 連結実績 ／ 2025/3期",
    "prod": "月着陸船、月面輸送、マイクロローバー、深宇宙航行・管制",
    "pos": "月面輸送・探査・資源利用に直結し、深宇宙航法・通信・着陸技術は安全保障にも転用可能。",
    "def": "月面輸送・探査・資源利用に直結し、深宇宙航法・通信・着陸技術は安全保障にも転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://ispace-inc.com/jpn/news/?p=7035 ／ https://ispace-inc.com/jpn/ir",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社公表の通期実績 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-9",
    "name": "Pale Blue",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "10億円未満 ／ 概算 ／ 2026年時点",
    "prod": "小型衛星用水スラスタ、水イオンエンジン、ホールスラスタ",
    "pos": "小型衛星の軌道投入・維持・衝突回避・デオービットに直接接続。安全保障衛星にも転用可能。",
    "def": "小型衛星の軌道投入・維持・衝突回避・デオービットに直接接続。安全保障衛星にも転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://pale-blue.co.jp/jpn/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場宇宙スタートアップ。量産立上げ段階としての概算 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-10",
    "name": "QPS研究所",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場子会社 ／ 親会社：QPSホールディングス ／ 自社証券コード：非上場 ／ 親会社証券コード：5595",
    "rev": "20–50億円 ／ 概算 ／ 2026/5期",
    "prod": "小型SAR衛星QPS-SAR、衛星間通信・オンボード処理",
    "pos": "防衛省の宇宙共通キー技術実証の契約相手方で、衛星コンステレーション事業にも参画。",
    "def": "防衛省の宇宙共通キー技術実証の契約相手方で、衛星コンステレーション事業にも参画。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.mod.go.jp/j/press/news/2024/03/01c.html ／ https://i-qps.net/ir-archives/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：完全親会社QPSホールディングスの開示と事業規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-11",
    "name": "Synspective",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：290A",
    "rev": "20–50億円 ／ 概算 ／ 2025/12期",
    "prod": "小型SAR衛星StriX、衛星コンステレーション、SARデータ解析",
    "pos": "防衛省の衛星コンステレーション整備・運営事業を落札。安全保障・インテリジェンス用途を明示。",
    "def": "防衛省の衛星コンステレーション整備・運営事業を落札。安全保障・インテリジェンス用途を明示。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://synspective.com/jp/company/ ／ https://synspective.com/jp/ir/results/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：上場会社の衛星・データ事業規模からレンジ表示 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-12",
    "name": "アークエッジ・スペース",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "10–30億円 ／ 概算 ／ 2026年時点",
    "prod": "超小型衛星、衛星コンステレーション、ホステッドペイロード、月測位・通信",
    "pos": "地球観測、衛星通信、測位・位置情報、月インフラ、深宇宙探査に直接接続。",
    "def": "地球観測、衛星通信、測位・位置情報、月インフラ、深宇宙探査に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://arkedgespace.com/products-services ／ https://arkedgespace.com/about-us",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場宇宙スタートアップ。案件・人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-13",
    "name": "アクセルスペース",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 親会社：アクセルスペースホールディングス ／ 自社証券コード：非上場 ／ 親会社証券コード：非上場",
    "rev": "10–30億円 ／ 概算 ／ 2026年時点",
    "prod": "小型光学衛星、AxelGlobe地球観測、AxelLiner衛星開発・運用",
    "pos": "防衛省衛星コンステレーション事業で光学衛星画像の取得業務を受注。",
    "def": "防衛省衛星コンステレーション事業で光学衛星画像の取得業務を受注。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.axelspace.com/ja/news/satellite_constellation_project/ ／ https://www.axelspace.com/ja/company/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：上場準備中の非上場宇宙企業。案件・人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-14",
    "name": "インターステラテクノロジズ",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "10–30億円 ／ 概算 ／ 2026年時点",
    "prod": "小型衛星打上げロケットZERO、観測ロケットMOMO、通信衛星",
    "pos": "ロケット開発・製造・打上げ、人工衛星開発・運用に直接接続。安全保障通信・即応打上げへ転用可能。",
    "def": "ロケット開発・製造・打上げ、人工衛星開発・運用に直接接続。安全保障通信・即応打上げへ転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.istellartech.com/about",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場ロケット企業。人員・開発案件から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-15",
    "name": "スペースワン",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 親会社：キヤノン電子・IHIエアロスペースほか ／ 自社証券コード：非上場 ／ 親会社証券コード：7739・7013ほか",
    "rev": "10億円未満 ／ 概算 ／ 2026年時点",
    "prod": "小型ロケットKAIROS、民間射場スペースポート紀伊、打上げサービス",
    "pos": "小型衛星の打上げ・射場運用に直接接続し、安全保障衛星の即応打上げへ転用可能。",
    "def": "小型衛星の打上げ・射場運用に直接接続し、安全保障衛星の即応打上げへ転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.space-one.co.jp/about/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：打上げ実証段階の非上場企業としての概算 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-16",
    "name": "明星電気",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場子会社 ／ 親会社：IHI ／ 自社証券コード：非上場（旧6709） ／ 親会社証券コード：7013",
    "rev": "150–300億円 ／ 概算 ／ 2026年時点",
    "prod": "衛星搭載観測機器、航法カメラ、高圧電源、粒子センサー、超小型衛星",
    "pos": "衛星・ロケット・ISS搭載機器に加え、防衛省公示で気象・計測装置部品の供給主体として確認。",
    "def": "衛星・ロケット・ISS搭載機器に加え、防衛省公示で気象・計測装置部品の供給主体として確認。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.meisei.co.jp/products/products_category/space ／ https://www.meisei.co.jp/company/profile",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：IHIグループ内の宇宙・気象機器事業規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-17",
    "name": "アストロスケールホールディングス",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_sat",
      "05_robot"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：186A",
    "rev": "30–100億円 ／ 概算 ／ 2026/4期",
    "prod": "軌道上サービス、デブリ除去、ランデブー・近接運用、宇宙領域把握 ／ 衛星捕獲機構、RPO航法、軌道上点検・除去サービス",
    "pos": "防衛省から機動対応宇宙システム実証機を受注。民生の衛星寿命延長・デブリ除去と防衛SDAに共通。 ／ 民生衛星の寿命延長・デブリ除去と、防衛SDA・機動対応宇宙システムに共通。",
    "def": "防衛省から機動対応宇宙システム実証機を受注。民生の衛星寿命延長・デブリ除去と防衛SDAに共通。 ／ 民生衛星の寿命延長・デブリ除去と、防衛SDA・機動対応宇宙システムに共通。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.astroscale.com/ja/missions/responsive-space-system-demonstration-satellite-prototype ／ https://www.astroscale.com/ja/investors/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：上場会社の契約収益・開発段階を踏まえたレンジ表示 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-18",
    "name": "原子燃料工業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_nuclear"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "300–500億円 ／ 概算 ／ 2026年時点",
    "prod": "PWR/BWR燃料集合体、燃料棒・被覆管関連部品、研究炉・試験炉燃料",
    "pos": "商用炉、研究炉・試験炉の核燃料製造と特殊核物質管理に直結する安全保障上の重要ノード。",
    "def": "商用炉、研究炉・試験炉の核燃料製造と特殊核物質管理に直結する安全保障上の重要ノード。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.nfi.co.jp/product ／ https://www.nfi.co.jp/company/outline",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：国内2工場・燃料製造能力と人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-19",
    "name": "三菱原子燃料",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_nuclear"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場企業 ／ 親会社：三菱重工業・三菱マテリアル・Oranoほか ／ 自社証券コード：非上場 ／ 親会社証券コード：7011・5711ほか",
    "rev": "300–500億円 ／ 概算 ／ 2026年時点",
    "prod": "PWR燃料集合体、燃料棒、炉心構成品、燃料サイクル関連サービス",
    "pos": "原子炉炉心と核燃料サイクルに直接接続し、原子力安全保障・核不拡散管理上の重要ノード。",
    "def": "原子炉炉心と核燃料サイクルに直接接続し、原子力安全保障・核不拡散管理上の重要ノード。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.mhi.com/jp/group/mnf/business",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：PWR燃料製造拠点・人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-20",
    "name": "日本核燃料開発",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_nuclear"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場企業 ／ 親会社：東芝エネルギーシステムズ・日立GEニュークリア ／ 自社証券コード：非上場 ／ 親会社証券コード：6502・6501系",
    "rev": "50–100億円 ／ 概算 ／ 2026年時点",
    "prod": "核燃料・照射材料の試験評価、ジルカロイ被覆管・圧力容器鋼の解析",
    "pos": "燃料信頼性向上、事故耐性、被覆管・炉材料評価に直接接続する原子力安全保障R&Dノード。",
    "def": "燃料信頼性向上、事故耐性、被覆管・炉材料評価に直接接続する原子力安全保障R&Dノード。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.nfd.jp/business/business.html ／ https://www.nfd.jp/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：専門試験研究会社の人員・設備規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-21",
    "name": "AeroEdge",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_engine"
    ],
    "tags": [
      "Y"
    ],
    "own": "上場企業 ／ 自社証券コード：7409",
    "rev": "約50.5億円 ／ 会社予想 ／ 2026/6期",
    "prod": "LEAPエンジン用チタンアルミ製低圧タービンブレード",
    "pos": "A320neo・737MAX・C919向けベストセラー民間航空エンジンに直結。加工・品質保証技術は防衛エンジンへ転用可能。",
    "def": "A320neo・737MAX・C919向けベストセラー民間航空エンジンに直結。加工・品質保証技術は防衛エンジンへ転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://aeroedge.co.jp/ir/individual/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：通期会社予想 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-22",
    "name": "NTN 軸受事業本部 航空宇宙技術部／桑名製作所",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_engine"
    ],
    "tags": [
      "Y"
    ],
    "own": "親会社内組織・工場 ／ 親会社：NTN ／ 自社証券コード：事業部 ／ 親会社証券コード：6472",
    "rev": "100–300億円 ／ 概算 ／ 2026年時点",
    "prod": "航空機・ジェットエンジン用高精度軸受、特殊環境用軸受",
    "pos": "国内初の航空宇宙用軸受専門工場。P&Wエンジン用軸受を量産。",
    "def": "国内初の航空宇宙用軸受専門工場。P&Wエンジン用軸受を量産。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.ntn.co.jp/japan/news/press/news201300003.html",
    "note": "統合処理：事業部置換 ／ 置換元：NTN ／ 売上根拠：航空宇宙用軸受の専用工場・製品範囲から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-23",
    "name": "ジャムコ",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_engine"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場（旧7408）",
    "rev": "600–700億円 ／ 概算 ／ 2025/3期",
    "prod": "航空機エンジン用クーリングマニホールド・配管、航空宇宙特殊工程",
    "pos": "民間航空機エンジン部品に加え、防衛省・自衛隊関連の航空宇宙機器・整備に直接接続。",
    "def": "民間航空機エンジン部品に加え、防衛省・自衛隊関連の航空宇宙機器・整備に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.jamco.co.jp/ja/business/jco/engine_partts.html ／ https://www.jamco.co.jp/ja/company/profile.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場化前の連結売上規模を丸めたレンジ ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-24",
    "name": "日機装",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_engine"
    ],
    "tags": [
      "Y"
    ],
    "own": "上場企業 ／ 自社証券コード：6376",
    "rev": "2,500–3,000億円 ／ 概算 ／ 2025/12期",
    "prod": "航空機エンジンナセル用CFRPカスケード、航空機・エンジン構造部品",
    "pos": "Boeing、Airbus等の民間航空機エンジン・逆噴射装置に直接搭載。航空エンジン部品の設計・量産技術は防衛機にも転用可能。",
    "def": "Boeing、Airbus等の民間航空機エンジン・逆噴射装置に直接搭載。航空エンジン部品の設計・量産技術は防衛機にも転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.nikkiso.co.jp/products/cfrp/ ／ https://www.nikkiso.co.jp/company/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社公表の連結売上規模をレンジ化 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-25",
    "name": "SUBARU 航空宇宙カンパニー",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_airframe_support"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "親会社内カンパニー ／ 親会社：SUBARU ／ 自社証券コード：事業部 ／ 親会社証券コード：7270",
    "rev": "約1,417億円 ／ セグメント実績 ／ 2026/3期",
    "prod": "航空機・ヘリ・無人機の開発、生産、システム統合、運用支援",
    "pos": "自衛隊向け練習機、UH-2、無人航空機、次期戦闘機に直接接続。",
    "def": "自衛隊向け練習機、UH-2、無人航空機、次期戦闘機に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.subaru.co.jp/outline/about/aerospace/ ／ https://www.subaru.co.jp/ir/finance/segment.html",
    "note": "統合処理：カンパニー置換 ／ 置換元：SUBARU ／ 売上根拠：親会社の航空宇宙セグメント売上収益 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-26",
    "name": "株式会社エフ・エー・エス",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_airframe_support"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "子会社 ／ 親会社：SUBARU ／ 自社証券コード：非上場 ／ 親会社証券コード：7270",
    "rev": "20–50億円 ／ 概算 ／ 2026年時点",
    "prod": "航空機部品の加工・組立、設備保全、計測器校正、品質保証",
    "pos": "SUBARU航空宇宙カンパニーの航空機製造を担う専業子会社。",
    "def": "SUBARU航空宇宙カンパニーの航空機製造を担う専業子会社。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://fas.subaru.co.jp/outline/outline.html",
    "note": "統合処理：子会社追加 ／ 置換元：SUBARU ／ 売上根拠：航空機加工・組立・品質保証の人員規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-27",
    "name": "富士エアロスペーステクノロジー株式会社（FATEC）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_airframe_support"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "子会社／関係会社 ／ 親会社：SUBARU ／ 自社証券コード：非上場 ／ 親会社証券コード：7270",
    "rev": "約28.7億円 ／ 会社公表値 ／ 2024年度",
    "prod": "機体設計、解析、生産技術、航空宇宙ソフトウェア",
    "pos": "航空宇宙専業の設計・生産技術法人。",
    "def": "航空宇宙専業の設計・生産技術法人。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://fatec.subaru.co.jp/company/outline.html",
    "note": "統合処理：子会社追加 ／ 置換元：SUBARU ／ 売上根拠：会社概要の売上高 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-28",
    "name": "富士航空整備株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_airframe_support"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "子会社 ／ 親会社：SUBARU ／ 自社証券コード：非上場 ／ 親会社証券コード：7270",
    "rev": "20–50億円 ／ 概算 ／ 2026年時点",
    "prod": "自衛隊航空機・搭載装備品・フライトシミュレータの整備、教育",
    "pos": "自衛隊航空機の整備を行う民活会社第1号。",
    "def": "自衛隊航空機の整備を行う民活会社第1号。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://fam.subaru.co.jp/company/",
    "note": "統合処理：子会社追加 ／ 置換元：SUBARU ／ 売上根拠：自衛隊機MRO専業の人員・契約規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-29",
    "name": "輸送機工業株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_airframe_support"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "子会社／関係会社 ／ 親会社：SUBARU ／ 自社証券コード：非上場 ／ 親会社証券コード：7270",
    "rev": "50–150億円 ／ 概算 ／ 2026年時点",
    "prod": "アルミ合金航空機構造部品の板金・機械加工・ユニット組立",
    "pos": "SUBARU、三菱重工、川崎重工、日本飛行機、新明和等へ供給。",
    "def": "SUBARU、三菱重工、川崎重工、日本飛行機、新明和等へ供給。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://yusoki.subaru.co.jp/company/index.html",
    "note": "統合処理：子会社追加 ／ 置換元：SUBARU ／ 売上根拠：複数機体メーカー向け構造部品専業の人員・工程規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-30",
    "name": "タムロン",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_laser"
    ],
    "tags": [
      "Y"
    ],
    "own": "上場企業 ／ 自社証券コード：7740",
    "rev": "約851億円 ／ 連結実績 ／ 2025/12期",
    "prod": "高出力レーザー用光学系、人工衛星搭載光学系、空間光通信用ビーム制御",
    "pos": "人工衛星搭載光学系と空間光通信へ直接接続。高出力レーザー光学は宇宙・防衛センシングへ転用可能。",
    "def": "人工衛星搭載光学系と空間光通信へ直接接続。高出力レーザー光学は宇宙・防衛センシングへ転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.tamron.com/jp/technology/optics/ ／ https://www.tamron.com/jp/company/company_profile.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社公表の連結売上高 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-31",
    "name": "Orbital Lasers",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_laser",
      "05_sat"
    ],
    "tags": [
      "Y",
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場企業 ／ 自社証券コード：非上場",
    "rev": "10億円未満 ／ 概算 ／ 2026年時点",
    "prod": "宇宙搭載用高出力レーザー、衛星ライダー、レーザーデブリ除去 ／ 衛星ライダー、レーザー式スペースデブリ除去衛星、専用衛星バス",
    "pos": "衛星ライダー、デブリ制御、地球観測、安全保障の双方へ明示的に展開するデュアルユース技術。 ／ 地球観測、宇宙状況把握、スペースデブリ制御、安全保障に直接接続。",
    "def": "衛星ライダー、デブリ制御、地球観測、安全保障の双方へ明示的に展開するデュアルユース技術。 ／ 地球観測、宇宙状況把握、スペースデブリ制御、安全保障に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.orbitallasers.com/technology/ ／ https://www.orbitallasers.com/about/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：創業初期の非上場宇宙スタートアップとしての概算 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-32",
    "name": "カヤバ（KYB）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：7242",
    "rev": "約4,815億円 ／ 連結実績 ／ 2026/3期",
    "prod": "航空機用降着装置、ステアリング・操舵装置、油圧・緊急作動装置",
    "pos": "防衛省・自衛隊保有機向け装備品・補用品の契約実績を公表。民間航空機・産業油圧と技術を共有。",
    "def": "防衛省・自衛隊保有機向け装備品・補用品の契約実績を公表。民間航空機・産業油圧と技術を共有。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.kyb.co.jp/company/information.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社概要の2025年度連結実績 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-33",
    "name": "新明和工業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：7224",
    "rev": "約2,700億円 ／ 連結実績（概数） ／ 2026/3期",
    "prod": "US-2救難飛行艇、航空機構造・動翼、機外燃料タンク、整備",
    "pos": "海上自衛隊の救難飛行艇と民間航空機構造部品・整備に直接接続。",
    "def": "海上自衛隊の救難飛行艇と民間航空機構造部品・整備に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.shinmaywa.co.jp/products/aircraft/pdf/AircraftDivisionGuide.pdf ／ https://www.shinmaywa.co.jp/ir/factsheet.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：連結売上高を100億円単位で丸めて表示 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-34",
    "name": "島津製作所",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：7701",
    "rev": "約5,607億円 ／ 連結実績 ／ 2026/3期",
    "prod": "フライトコントロール、空調、コックピット表示、航空機搭載機器",
    "pos": "P-1/C-2等の防衛機とB747-8等の民間機にフライトコントロールを供給。",
    "def": "P-1/C-2等の防衛機とB747-8等の民間機にフライトコントロールを供給。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.shimadzu.co.jp/sites/shimadzu.co.jp/files/ir/6dog/srnepvp1yzsd995a.pdf ／ https://www.shimadzu.co.jp/aboutus/company/profile.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：会社概要の連結売上高 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-35",
    "name": "ダイキン工業 特機事業（淀川製作所）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "親会社内事業部 ／ 親会社：ダイキン工業 ／ 自社証券コード：事業部 ／ 親会社証券コード：6367",
    "rev": "100–300億円 ／ 概算 ／ 2026年時点",
    "prod": "誘導弾・砲弾部品、航空機部品、航空機用消火器、精密加工",
    "pos": "防衛省向け砲弾・誘導弾部品・航空機部品を開示。",
    "def": "防衛省向け砲弾・誘導弾部品・航空機部品を開示。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.daikin.co.jp/corporate/overview/business/defense",
    "note": "統合処理：事業部置換 ／ 置換元：ダイキン工業 ／ 売上根拠：親会社の特機・その他事業開示と製品範囲から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-36",
    "name": "OKIサーキットテクノロジー株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "子会社 ／ 親会社：沖電気工業（OKI） ／ 自社証券コード：非上場 ／ 親会社証券コード：6703",
    "rev": "200–400億円 ／ 概算 ／ 2026年時点",
    "prod": "高多層・高密度PCB、フレックスリジッド基板、航空宇宙向け基板設計・製造",
    "pos": "JAXA認定PCBがロケット・人工衛星に採用。防衛省認定、JIS Q 9100取得。",
    "def": "JAXA認定PCBがロケット・人工衛星に採用。防衛省認定、JIS Q 9100取得。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.oki-otc.jp/company/outline.html",
    "note": "統合処理：子会社置換 ／ 置換元：沖電気工業（OKI） ／ 売上根拠：従業員707名と高付加価値PCB製造の売上/人員レンジから推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-37",
    "name": "ルネサス エレクトロニクス",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：6723",
    "rev": "約1兆3,212億円 ／ 連結実績 ／ 2025/12期",
    "prod": "耐放射線・高信頼デジタルIC、宇宙・航空・防衛向け半導体",
    "pos": "人工衛星・宇宙機・航空防衛電子機器へ直接組み込まれる耐放射線半導体を供給。",
    "def": "人工衛星・宇宙機・航空防衛電子機器へ直接組み込まれる耐放射線半導体を供給。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.renesas.com/en/products/space-harsh-environment/hi-rel-digital ／ https://www.renesas.com/ja/about/newsroom/renesas-reports-financial-results-year-ended-december-31-2025",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：IFRS連結売上収益 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-38",
    "name": "株式会社出雲村田製作所",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "製造子会社 ／ 親会社：村田製作所 ／ 自社証券コード：非上場 ／ 親会社証券コード：6981",
    "rev": "1,000–3,000億円 ／ 概算 ／ 2026年時点",
    "prod": "積層セラミックコンデンサの開発・製造",
    "pos": "宇宙用途との接続は親会社製品として確認。子会社単独の認証情報は不足。",
    "def": "宇宙用途との接続は親会社製品として確認。子会社単独の認証情報は不足。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://corporate.murata.com/en-us/newsroom/news/company/general/2019/1024",
    "note": "統合処理：子会社追加（監視） ／ 置換元：村田製作所 ／ 売上根拠：大規模MLCC製造拠点の人員・設備規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-39",
    "name": "株式会社福井村田製作所",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "製造子会社 ／ 親会社：村田製作所 ／ 自社証券コード：非上場 ／ 親会社証券コード：6981",
    "rev": "1,000–3,000億円 ／ 概算 ／ 2026年時点",
    "prod": "積層セラミックコンデンサの研究開発・製造",
    "pos": "宇宙・防衛向け認定名義と型番の子会社単独開示は不足。",
    "def": "宇宙・防衛向け認定名義と型番の子会社単独開示は不足。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://corporate.murata.com/en-global/newsroom/news/company/general/2026/0205",
    "note": "統合処理：子会社追加（監視） ／ 置換元：村田製作所 ／ 売上根拠：大規模MLCC開発・製造拠点の人員・設備規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-40",
    "name": "住友電気工業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：5802",
    "rev": "約4.7兆円 ／ 連結実績（概数） ／ 2026/3期",
    "prod": "S帯・X帯高出力GaN HEMT、衛星通信・航空管制レーダー用RFデバイス",
    "pos": "航空管制、船舶・気象レーダー、衛星通信に直結し、防衛レーダー・通信へ転用可能。",
    "def": "航空管制、船舶・気象レーダー、衛星通信に直結し、防衛レーダー・通信へ転用可能。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://sumitomoelectric.com/jp/products/optical-devices ／ https://sumitomoelectric.com/jp/ir/financial",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：連結売上高を0.1兆円単位で丸めて表示 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-41",
    "name": "村田製作所 コンデンサ事業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "親会社内事業 ／ 親会社：村田製作所 ／ 自社証券コード：事業部 ／ 親会社証券コード：6981",
    "rev": "8,000–10,000億円 ／ 概算 ／ 2026年時点",
    "prod": "宇宙グレードMLCC、タイミング・高周波・センサデバイス",
    "pos": "国内唯一のJAXA認定MLCCメーカーとして宇宙機採用を公表。",
    "def": "国内唯一のJAXA認定MLCCメーカーとして宇宙機採用を公表。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.murata.com/en-us/products/capacitor/ceramiccapacitor/overview/strength",
    "note": "統合処理：事業部置換 ／ 置換元：村田製作所 ／ 売上根拠：親会社のコンデンサ関連売上構成から概算 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-42",
    "name": "富士通ディフェンス＆ナショナルセキュリティ株式会社（FDNS）",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "子会社 ／ 親会社：富士通 ／ 自社証券コード：非上場 ／ 親会社証券コード：6702",
    "rev": "約688億円 ／ 会社公表値 ／ 2025年度",
    "prod": "防衛ICT、センサー、AI・サイバー、24時間365日維持支援",
    "pos": "防衛省・自衛隊の情報通信システム開発・維持を行う専業会社。",
    "def": "防衛省・自衛隊の情報通信システム開発・維持を行う専業会社。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://global.fujitsu/ja-jp/subsidiaries/fdns/about",
    "note": "統合処理：子会社置換 ／ 置換元：富士通 ／ 売上根拠：会社概要・採用資料に基づく専業会社売上規模 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-43",
    "name": "富士通特機コンポーネント株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "孫会社 ／ 親会社：富士通 ／ 自社証券コード：非上場 ／ 親会社証券コード：6702",
    "rev": "5–20億円 ／ 概算 ／ 2026年時点",
    "prod": "ガラス・金属・セラミック・サファイア接合、精密加工・組立ユニット",
    "pos": "JIS Q 9100認証範囲に航空機搭載防衛装備品ユニットを明記。",
    "def": "JIS Q 9100認証範囲に航空機搭載防衛装備品ユニットを明記。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://global.fujitsu/ja-jp/subsidiaries/fdns/tcl/about",
    "note": "統合処理：子会社追加 ／ 置換元：富士通 ／ 売上根拠：従業員規模と防衛航空機向け精密製造の売上/人員レンジから推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-44",
    "name": "沖エンジニアリング株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_defense_electronics"
    ],
    "tags": [
      "Y",
      "Sc"
    ],
    "own": "子会社／グループ会社 ／ 親会社：沖電気工業（OKI） ／ 自社証券コード：非上場 ／ 親会社証券コード：6703",
    "rev": "20–50億円 ／ 概算 ／ 2026年時点",
    "prod": "宇宙・防衛用電子部品の試験、故障解析、環境評価、スクリーニング",
    "pos": "MIL-STD-883、JAXA-QTS-2010に基づく宇宙用電子部品試験を提供。",
    "def": "MIL-STD-883、JAXA-QTS-2010に基づく宇宙用電子部品試験を提供。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.oeg.co.jp/company/prof.html",
    "note": "統合処理：子会社置換 ／ 置換元：沖電気工業（OKI） ／ 売上根拠：従業員174名の試験・評価専業会社として推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-45",
    "name": "YDKテクノロジーズ",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "非上場子会社 ／ 親会社：横河電機 ／ 自社証券コード：非上場 ／ 親会社証券コード：6841",
    "rev": "100–300億円 ／ 概算 ／ 2026年時点",
    "prod": "艦艇用ジャイロコンパス、航法支援装置、電磁ログ、対勢作図装置",
    "pos": "陸海空の防衛製品、特に自衛艦の航法・姿勢・速度計測に直接接続。",
    "def": "陸海空の防衛製品、特に自衛艦の航法・姿勢・速度計測に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.ydktechs.co.jp/jp/corporation/index.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：人員・製品構成と親会社開示から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-46",
    "name": "セイコーエプソン センシングシステム事業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "親会社内事業 ／ 親会社：セイコーエプソン ／ 自社証券コード：事業部 ／ 親会社証券コード：6724",
    "rev": "50–150億円 ／ 概算 ／ 2026年時点",
    "prod": "水晶ジャイロ、加速度センサー、慣性計測ユニット（IMU）",
    "pos": "M-G370シリーズIMUがISS『きぼう』Int-Ball2に採用。",
    "def": "M-G370シリーズIMUがISS『きぼう』Int-Ball2に採用。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://corporate.epson/ja/news/2024/240311.html",
    "note": "統合処理：事業部置換 ／ 置換元：セイコーエプソン ／ 売上根拠：IMU・センシング製品群と対象市場規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-47",
    "name": "宮崎エプソン株式会社",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_guid"
    ],
    "tags": [
      "DyTb",
      "Sm"
    ],
    "own": "製造子会社 ／ 親会社：セイコーエプソン ／ 自社証券コード：非上場 ／ 親会社証券コード：6724",
    "rev": "100–300億円 ／ 概算 ／ 2026年時点",
    "prod": "水晶デバイス、ジャイロセンサー振動片",
    "pos": "親会社IMUは宇宙採用実績あり。完成品・保証は親会社名義。",
    "def": "親会社IMUは宇宙採用実績あり。完成品・保証は親会社名義。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://corporate.epson/ja/about/network/domestic/miyazakiepson/company/history.html",
    "note": "統合処理：子会社追加（監視） ／ 置換元：セイコーエプソン ／ 売上根拠：水晶デバイス製造拠点の人員・設備規模から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-48",
    "name": "古野電気",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_guid",
      "05_rf_sensor"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "上場企業 ／ 自社証券コード：6814",
    "rev": "1,400–1,600億円 ／ 概算 ／ 2026/2期",
    "prod": "船舶レーダー、ECDIS、GNSS、デジタルマップ、水中音響機器 ／ 船舶レーダー、水中音響、GNSS、通信・航海統合装置",
    "pos": "防衛省向け水中音響機器・GNSS関連機器・デジタルマップ装置を明示。商船・漁船向けと技術基盤を共有。 ／ 防衛省向け水中音響機器・GNSS関連機器を明示。商船・漁船向けレーダーとのデュアルユース性が高い。",
    "def": "防衛省向け水中音響機器・GNSS関連機器・デジタルマップ装置を明示。商船・漁船向けと技術基盤を共有。 ／ 防衛省向け水中音響機器・GNSS関連機器を明示。商船・漁船向けレーダーとのデュアルユース性が高い。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.furuno.co.jp/corporate/business/marine.html ／ https://www.furuno.co.jp/ir/library/bs.html",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：通期決算規模を丸めたレンジ ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "id": "stage05-integrated-49",
    "name": "住友精密工業",
    "jsx": "統合企業リスト_子会社置換",
    "stages": [
      5
    ],
    "subs": [
      "05_guid",
      "05_flight"
    ],
    "tags": [
      "DyTb",
      "Sm",
      "Sc"
    ],
    "own": "非上場子会社 ／ 親会社：住友商事 ／ 自社証券コード：非上場（旧6355） ／ 親会社証券コード：8053",
    "rev": "600–800億円 ／ 概算 ／ 2026年時点",
    "prod": "MEMSジャイロ、慣性センサ、姿勢センサユニット、Northfinder ／ 航空機脚システム、油圧・熱交換器、電動油圧アクチュエーション",
    "pos": "航空宇宙・船舶向け慣性センシングと、防衛省保有機の約8割に搭載される脚システムを同社内に保有。 ／ 防衛・民間航空機の降着装置、熱管理、電動化に直接接続。",
    "def": "航空宇宙・船舶向け慣性センシングと、防衛省保有機の約8割に搭載される脚システムを同社内に保有。 ／ 防衛・民間航空機の降着装置、熱管理、電動化に直接接続。",
    "chn": "所属するStage 05サブカテゴリーの希土類フラグを継承。企業固有の希土類BOM・中国依存は未確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.spp.co.jp/business/sensor/ ／ https://www.spp.co.jp/company/profile/",
    "note": "統合処理：既存候補（親会社置換対象外） ／ 売上根拠：非上場化前の連結売上規模と現事業構成から推計 ／ 希土類フラグはStage 05所属サブカテゴリーから自動付与"
  },
  {
    "name": "豊港（豊港化学）",
    "jsx": "追加DD（SAMウェハ・テンプレート）",
    "stages": [
      4
    ],
    "subs": [
      "04_sc_crystal"
    ],
    "tags": [
      "Sc"
    ],
    "own": "非上場・株式会社豊港。中国に連結製造子会社の豊港化学材料科技（張家港）有限公司を保有。",
    "rev": "連結売上高47億円（2023年度実績）／70億円（2025年度予測）",
    "prod": "2～4インチScAlMgO₄（SAM）ウェハ・インゴット、10mm角／2インチMBE-GaN on SAMテンプレート。",
    "pos": "SAM単結晶製品とGaN-on-SAMテンプレートを供給。GaNとの格子・熱膨張差が小さく、LED・LD・FET・GaNパワーデバイス向け。SAMの製造主体・原料調達先は非開示。",
    "def": "GaNのRF・パワー・光デバイスへ波及するデュアルユース材料。航空・宇宙・防衛への直接納入実績は公開情報で未確認。",
    "chn": "中国製造子会社とアジア調達網を保有するが、SAM製品の製造国・Sc原料原産国・中国比率は非開示。",
    "ev": "B",
    "exc": 0,
    "src": "https://toyokou.jp/semiconductor/scaimgo ／ https://www.toyokou.co.jp/about/summary ／ https://toyokou.co.jp/about/organization",
    "note": "Stage 04『SAMウェハ・テンプレート』へ追加。公開ページは製品供給を確認できるが、内製範囲・製造拠点・防衛顧客は追加確認が必要。",
    "id": "company-116"
  },
  {
    "id": "laser-dd-kyocera-soc",
    "name": "京セラSOC株式会社",
    "jsx": "固体レーザー発振器DD正式採用",
    "stages": [
      4
    ],
    "subs": [
      "04_opt"
    ],
    "tags": [
      "Y"
    ],
    "own": "証券コード：非上場（京セラ子会社）",
    "rev": "単体非公開（従業員286人、2026年4月）",
    "prod": "JUNOシリーズ、594nm DPSS、Nd:YAG／Nd:YVO4レーザー、組込用小型レーザー",
    "pos": "レーザー累計出荷10万台超、月産能力1,000台。市場シェア率は非開示。",
    "def": "会社として宇宙分野向け高信頼光学製品実績を掲げる。公開製品の主用途は分析・計測・バイオで、防衛向け発振器納入は未確認。 ／ 今回の公開情報確認では直接契約を特定できず。",
    "bom": "594nm製品はNd:YAGとNd:YVO4をレーザー媒質に使用し、共振器内非線形結晶で和周波生成。 ／ Y（Nd:YAGを明示）",
    "chn": "Nd:YAGのY原料・Ndドーパントの調達国は非開示。結晶は世界から調達すると説明。",
    "gap": "YAG結晶の原産国、宇宙・防衛型式、MIL/JAXA認証、顧客別売上を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://www.ksoc.co.jp/kaisha/kaisha/ ／ https://www.ksoc.co.jp/technical/lasers.html ／ https://www.ksoc.co.jp/seihin/lasers/j594.html ／ https://www.ksoc.co.jp/seihin/lasers/juno_compact.html ／ https://www.ksoc.co.jp/seihin/optical-element/crystal.html",
    "note": "固体レーザー発振器DDの「採用候補（小型固体発振器）」に基づきStage 04へ正式採用。",
    "formal": true,
    "formalSource": "固体レーザー発振器DD：採用候補"
  },
  {
    "id": "laser-dd-towa",
    "name": "TOWAレーザーフロント株式会社",
    "jsx": "固体レーザー発振器DD正式採用",
    "stages": [
      4
    ],
    "subs": [
      "04_opt"
    ],
    "tags": [
      "Y"
    ],
    "own": "証券コード：6315（親会社TOWA）",
    "rev": "20.07億円（2026年3月期・TOWAレーザ加工装置事業。子会社単体非公開）",
    "prod": "SL18Xシリーズ（Nd:YAG、1064nm／532nm、最大12W級）、レーザートリマー、ウェハーマーカー、微細加工・溶接装置",
    "pos": "前身を含め1972年に固体レーザーを世界で初めて商用化したと自社説明。現行市場シェアは非開示。",
    "def": "大阪大学とレーザー核融合燃焼模擬試験装置を契約。高出力レーザー・核融合・精密加工に直接接続するデュアルユース企業。防衛向け納入は未確認。 ／ 防衛装備庁との直接契約は今回確認できず。2025-11-28に大阪大学と核融合燃焼模擬試験装置を契約。",
    "bom": "Nd:YAGを公式製品ページで明示。励起LD・共振器・SHGを含む発振器として製造。YAG結晶の供給元は非開示。 ／ Y（Nd:YAGを明示）",
    "chn": "Nd:YAG結晶のY原料・結晶供給元・原産国は非開示。上流Y原料に構造的曝露。",
    "gap": "防衛顧客、YAG結晶供給元、年間生産台数、宇宙・防衛認証、SL18X以外の現行高出力型式を確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.laserfront.jp/company-data/ ／ https://www.laserfront.jp/product-10/ ／ https://www.towajapan.co.jp/jp/wp-content/uploads/sites/2/2026/05/2025FY_annual.pdf ／ https://www.laserfront.jp/topics/%E5%9B%BD%E7%AB%8B%E5%A4%A7%E5%AD%A6%E6%B3%95%E4%BA%BA%E5%A4%A7%E9%98%AA%E5%A4%A7%E5%AD%A6%E3%81%A8%E6%A0%B8%E8%9E%8D%E5%90%88%E7%87%83%E7%84%BC%E6%A8%A1%E6%93%AC%E8%A9%A6%E9%A8%93%E8%A3%85%E7%BD%AE/ ／ https://www.laserfront.jp/",
    "note": "固体レーザー発振器DDの「採用候補（現行Nd:YAG発振器）」に基づきStage 04へ正式採用。",
    "formal": true,
    "formalSource": "固体レーザー発振器DD：採用候補"
  },
  {
    "id": "laser-dd-optoquest",
    "name": "株式会社オプトクエスト",
    "jsx": "固体レーザー発振器DD正式採用",
    "stages": [
      4
    ],
    "subs": [
      "04_opt"
    ],
    "tags": [
      "Y"
    ],
    "own": "証券コード：非上場",
    "rev": "非公開（資本金1億円）",
    "prod": "1064nmサブナノ秒Nd:YAGパルスレーザー（800ps typ.、2.5mJ、MW級）、光学実装・波長変換・OEM装置",
    "pos": "小型・空冷でサブナノ秒／MW級という高尖頭出力ニッチ。数値シェア・年間出荷は非開示。",
    "def": "LIBS、LiDAR、レーザー超音波、レーザー点火・ピーニング等へ接続。防衛装備庁研究成果資料で同社製受動Qスイッチマイクロチップレーザーの使用を確認。 ／ 直接契約主体であることは未確認。ただし安全保障技術研究推進制度の成果資料に同社製レーザー照射装置の使用を明記。",
    "bom": "Nd:YAGを公式ページで明示。受動Qスイッチ型マイクロチップレーザー。Qスイッチ材・結晶供給元は非開示。 ／ Y（Nd:YAGを明示）",
    "chn": "Nd:YAG結晶・Qスイッチ材の原産国非開示。Y原料に構造的曝露。",
    "gap": "防衛装備庁との契約関係、航空宇宙顧客、結晶・Qスイッチ材BOM、市場シェア、年間生産台数を確認。",
    "ev": "A",
    "exc": 0,
    "src": "https://www.optoquest.co.jp/products/325/ ／ https://www.optoquest.co.jp/company/ ／ https://www.optoquest.co.jp/about/ ／ https://www.mod.go.jp/atla/funding/hyouka/r07_seika/R7seika_04riken.pdf",
    "note": "固体レーザー発振器DDの「採用候補（マイクロチップNd:YAG）」に基づきStage 04へ正式採用。",
    "formal": true,
    "formalSource": "固体レーザー発振器DD：採用候補"
  },
  {
    "id": "laser-dd-sct",
    "name": "エスシーティー株式会社（SCT）",
    "jsx": "固体レーザー発振器DD・ユーザー指定正式採用",
    "stages": [
      4
    ],
    "subs": [
      "04_opt"
    ],
    "tags": [
      "Y"
    ],
    "own": "非上場・2018年設立の研究開発企業",
    "rev": "非公開（自社説明では『未だ非常に小規模』）",
    "prod": "固体材料高速探索システム、レーザー媒質探索、Thin Disc型YAG高出力レーザー研究、固体レーザー研究プロジェクト統括",
    "pos": "固体材料コンビナトリアル研究ネットワークで世界有数と自社説明。量産発振器の市場シェア・出荷実績は非開示。",
    "def": "防衛装備庁・安全保障技術研究推進制度の代表機関。課題『結晶設計・格子操作技術による固体レーザーの高速探索と機能開発』を2019～2023年度に実施し、日本大学、コメット、バキュームプロダクツ、信光社、三菱重工業等と共同研究。研究総経費（契約額）は1,955,394千円。",
    "bom": "Thin Disc型YAGを設計して10kW超を実証。成果資料で世界最大級Yb:YAG単結晶を提示。",
    "chn": "研究用YAG／Yb:YAGの原料・結晶調達先、中国原産比率は非開示。",
    "gap": "発振器の商用品型式、製造設備、年間生産台数、販売顧客、研究成果の技術移管、YAG結晶・Yb原料の調達国を確認。",
    "ev": "B",
    "exc": 0,
    "src": "https://sct-inc.co.jp/about/ ／ https://sct-inc.co.jp/service/ ／ https://www.mod.go.jp/atla/funding/seika/R06gaiyo.pdf ／ https://www.mod.go.jp/atla/funding/hyouka/r06_seika/R6seika_02sct.pdf ／ https://www.mod.go.jp/atla/funding/hyouka/r06_shuryo/R6hyouka_02sct.pdf",
    "note": "発振器量産メーカーではなくR&Dノード。防衛装備庁との共同研究実績を明記し、ユーザー指定によりStage 04へ正式採用。",
    "formal": true,
    "formalSource": "ユーザー指定：防衛装備庁共同研究R&Dノード"
  }
];

const applyStage05RobotSmExposure = (rows) => rows.map((company) =>
  (company.subs || []).includes("05_robot")
    ? { ...company, tags: [...new Set([...(company.tags || []), "Sm"])] }
    : company
);
const SEED = applyStage05RobotSmExposure(SEED_ROWS);

const DEPENDENCY_ROWS = [
  { id: "Y", tag: "Y", label: "Y", quality: "元素別実績", china: 94, metric: "日本の酸化イットリウム輸入・2023年", segments: [{ name: "中国", value: 94, color: COLORS.A }, { name: "豪州", value: 3, color: COLORS.Y }, { name: "米国", value: 2, color: COLORS.Sc }, { name: "その他", value: 1, color: COLORS.line }], evidence: "財務省貿易統計を基にした純分数量。中国961t／合計1,019t。", source: "JOGMEC 鉱物資源マテリアルフロー2024（表3-2-4-2）", url: "https://journal.jogmec.go.jp/content/300601767.pdf" },
  { id: "Dy", tag: "DyTb", label: "Dy", quality: "重希土類実績", china: 100, metric: "日本の重希土類輸入・2024年公表", segments: [{ name: "中国", value: 100, color: COLORS.A }], evidence: "経済産業省は重希土類の輸入について中国依存度100%と整理。元素別通関値ではなくDy・Tbを含む重希土類区分。", source: "経済産業省 鉱物政策を巡る状況について（2024年10月）", url: "https://www.meti.go.jp/shingikai/sankoshin/seizo_sangyo/mining/pdf/001_03_00.pdf" },
  { id: "Tb", tag: "DyTb", label: "Tb", quality: "重希土類実績", china: 100, metric: "日本の重希土類輸入・2024年公表", segments: [{ name: "中国", value: 100, color: COLORS.A }], evidence: "経済産業省は重希土類の輸入について中国依存度100%と整理。元素別通関値ではなくDy・Tbを含む重希土類区分。", source: "経済産業省 鉱物政策を巡る状況について（2024年10月）", url: "https://www.meti.go.jp/shingikai/sankoshin/seizo_sangyo/mining/pdf/001_03_00.pdf" },
  { id: "Sm", tag: "Sm", label: "Sm", quality: "品目代理", china: 73, metric: "希土類金属の日本輸入構成・2023年", segments: [{ name: "中国", value: 73, color: COLORS.A }, { name: "ベトナム", value: 21, color: COLORS.Y }, { name: "タイ", value: 6, color: COLORS.Sm }], evidence: "Smは日本の通関コードで元素別分離できないため、希土類金属（Sc・Yを含む）の輸入構成を代理使用。", source: "JOGMEC 鉱物資源マテリアルフロー2024（表3-2-2）", url: "https://journal.jogmec.go.jp/content/300601767.pdf" },
  { id: "Sc", tag: "Sc", label: "Sc", quality: "品目代理", china: 70, metric: "その他希土類化合物の日本輸入・2023年", segments: [{ name: "中国", value: 70, color: COLORS.A }, { name: "ベトナム", value: 16, color: COLORS.Y }, { name: "エストニア", value: 10, color: COLORS.DyTb }, { name: "その他", value: 4, color: COLORS.line }], evidence: "Scは日本の通関コードで元素別分離できないため、Ce・Y・La以外の希土類化合物の輸入構成を代理使用。", source: "JOGMEC 鉱物資源マテリアルフロー2024（表3-2-5）", url: "https://journal.jogmec.go.jp/content/300601767.pdf" }
];

function pieGradient(segments) {
  let at = 0;
  return "conic-gradient(" + segments.map((segment) => {
    const from = at;
    at += segment.value;
    return segment.color + " " + from + "% " + at + "%";
  }).join(",") + ")";
}

export default function RareEarthDDExplorer() {
  const [companies, setCompanies] = useState(SEED);
  const [selectedElements, setSelectedElements] = useState(ALL_ELEMENT_IDS);
  const [selection, setSelection] = useState({ stage: 2, sub: null });
  const [companyId, setCompanyId] = useState(null);
  const [sourceName, setSourceName] = useState("統合DD初期データ");
  const [status, setStatus] = useState("");
  const fileRef = useRef(null);

  const filteredByElement = useMemo(() =>
    companies.filter((company) => company.tags.some((tag) => selectedElements.includes(tag))),
    [companies, selectedElements]
  );

  const stageCounts = useMemo(() => Object.fromEntries(
    STAGES.map((stage) => [stage.id, filteredByElement.filter((company) => company.stages.includes(stage.id)).length])
  ), [filteredByElement]);

  const subCounts = useMemo(() => Object.fromEntries(
    SUBCATS.map((sub) => [sub.id, filteredByElement.filter((company) => company.subs.includes(sub.id)).length])
  ), [filteredByElement]);

  const list = useMemo(() => filteredByElement.filter((company) =>
    selection.sub ? company.subs.includes(selection.sub) : company.stages.includes(selection.stage)
  ), [filteredByElement, selection]);

  const selectedCompany = companies.find((company) => company.id === companyId) || null;
  const selectedSub = SUBCATS.find((sub) => sub.id === selection.sub);
  const isDependency = selection.stage === 1 && !selection.sub;
  const visibleDependencyRows = DEPENDENCY_ROWS.filter((row) => selectedElements.includes(row.tag));
  const heading = selectedSub
    ? "Stage " + String(selectedSub.stage).padStart(2, "0") + " — " + selectedSub.label
    : "Stage " + String(selection.stage).padStart(2, "0") + " — " + STAGES.find((s) => s.id === selection.stage).label;

  const selectStage = (stage) => {
    setSelection({ stage, sub: null });
    setCompanyId(null);
  };

  const selectSub = (sub) => {
    setSelection({ stage: sub.stage, sub: sub.id });
    setCompanyId(null);
  };

  const importFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setStatus("読込中…");
    try {
      const result = await readExcel(file);
      const next = applyStage05RobotSmExposure(result.mode === "formal" ? upsertCompanyRows(SEED, result.rows) : result.rows);
      setCompanies(next);
      setSourceName(file.name);
      setStatus(next.length + "社・事業単位を反映");
      setCompanyId(null);
    } catch (error) {
      setStatus("読込エラー: " + (error && error.message ? error.message : String(error)));
    } finally {
      event.target.value = "";
    }
  };

  const reset = () => {
    setCompanies(SEED);
    setSourceName("統合DD初期データ");
    setStatus("初期データに戻しました");
    setCompanyId(null);
    setSelectedElements(ALL_ELEMENT_IDS);
    setSelection({ stage: 2, sub: null });
  };

  const toggleElement = (id) => {
    if (id === "all") {
      setSelectedElements(ALL_ELEMENT_IDS);
    } else if (selectedElements.length === ALL_ELEMENT_IDS.length) {
      setSelectedElements([id]);
    } else if (selectedElements.includes(id)) {
      if (selectedElements.length > 1) setSelectedElements(selectedElements.filter((item) => item !== id));
    } else {
      setSelectedElements([...selectedElements, id]);
    }
    setCompanyId(null);
  };

  return (
    <div className="re-root" style={{ minHeight: "100vh", background: COLORS.ink, color: COLORS.text, fontFamily: '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif' }}>
      <style>{`
        .re-root{color-scheme:light dark;--re-bg:#ffffff;--re-panel:#f6f7f8;--re-panel-hi:#e9edf1;--re-line:#c9d0d7;--re-text:#101418;--re-sub:#4f5b66;--re-faint:#727d87;--re-y:#007f73;--re-dytb:#6654cc;--re-sm:#9a5a00;--re-sc:#006cab;--re-risk-a:#c43d28;--re-risk-b:#506a80;--re-risk-c:#806b00;--re-risk-x:#727d87}
        @media(prefers-color-scheme:dark){.re-root{--re-bg:#0f1317;--re-panel:#171c22;--re-panel-hi:#1e252d;--re-line:#2a323b;--re-text:#e9e6dd;--re-sub:#9aa3ac;--re-faint:#6b7681;--re-y:#5fd4c4;--re-dytb:#9d8cff;--re-sm:#f2b24e;--re-sc:#55a8e8;--re-risk-a:#e4573d;--re-risk-b:#8ca3b8;--re-risk-c:#e0c36a;--re-risk-x:#6b7681}}
        .re-wrap{max-width:1540px;margin:0 auto;padding:26px 24px 56px}
        .re-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;flex-wrap:wrap}
        .re-kicker{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;color:${COLORS.faint}}
        .re-title{font-family:"Hiragino Mincho ProN","Yu Mincho",serif;font-size:30px;margin:7px 0 0}
        .re-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .re-btn,.re-file{border:1px solid ${COLORS.line};background:transparent;color:${COLORS.sub};border-radius:999px;padding:7px 13px;font:13px inherit;cursor:pointer}
        .re-btn[data-active="true"]{color:${COLORS.text};border-color:currentColor;background:${COLORS.panelHi}}
        .re-btn[data-element="Y"]{--re-filter-color:${COLORS.Y}}
        .re-btn[data-element="DyTb"]{--re-filter-color:${COLORS.DyTb}}
        .re-btn[data-element="Sm"]{--re-filter-color:${COLORS.Sm}}
        .re-btn[data-element="Sc"]{--re-filter-color:${COLORS.Sc}}
        .re-btn[data-element]:not([data-element="all"]){color:var(--re-filter-color);border-color:var(--re-filter-color)}
        .re-btn[data-element]:not([data-element="all"]):hover{color:var(--re-filter-color);border-color:var(--re-filter-color);background:color-mix(in srgb,var(--re-filter-color) 14%,transparent)}
        .re-btn[data-element]:not([data-element="all"])[data-active="true"]{color:${COLORS.ink};border-color:var(--re-filter-color);background:var(--re-filter-color)}
        .re-file{border-radius:8px;color:${COLORS.text};background:${COLORS.panelHi}}
        .re-flow{display:grid;grid-template-columns:repeat(5,minmax(215px,1fr));gap:20px;margin-top:24px;overflow-x:auto;padding-bottom:8px}
        .re-stage{position:relative;min-height:158px;border:1px solid ${COLORS.line};border-top:3px solid ${COLORS.line};border-radius:12px;background:${COLORS.panel};padding:14px;text-align:left;color:${COLORS.text};cursor:pointer}
        .re-stage[data-active="true"]{border-top-color:${COLORS.text};background:${COLORS.panelHi}}
        .re-stage:not(:last-child):after{content:"›";position:absolute;right:-12px;top:60px;color:${COLORS.faint};font-size:22px;z-index:2}
        .re-code{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:${COLORS.faint};letter-spacing:.13em}
        .re-stage-title{font-size:15px;font-weight:600;margin-top:8px}
        .re-stage-short{font-size:12px;color:${COLORS.sub};margin-top:5px;line-height:1.5}
        .re-count{position:absolute;right:12px;top:11px;border:1px solid ${COLORS.line};border-radius:999px;padding:1px 8px;color:${COLORS.sub};font:12px ui-monospace,SFMono-Regular,Menlo,monospace}
        .re-subs{display:flex;gap:5px;flex-wrap:wrap;margin-top:11px}
        .re-sub{border:1px solid ${COLORS.line};background:${COLORS.ink};color:${COLORS.sub};border-radius:6px;padding:4px 6px;font:11px inherit;cursor:pointer;text-align:left}
        .re-sub[data-active="true"]{color:${COLORS.text};border-color:${COLORS.text}}
        .re-sub[data-id="05_energy"]{font-size:9px;line-height:1.2;letter-spacing:-.02em}
        .re-meta{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:12px;color:${COLORS.faint};font-size:12px;flex-wrap:wrap}
        .re-main{display:grid;grid-template-columns:minmax(0,1fr) 410px;gap:20px;margin-top:26px;align-items:start}
        .re-main.re-dependency-mode{grid-template-columns:1fr}
        .re-dep-dashboard{display:grid;gap:14px}
        .re-dep-intro{font-size:12px;color:${COLORS.sub};line-height:1.65;max-width:920px}
        .re-dep-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
        .re-dep-card{border:1px solid ${COLORS.line};border-radius:12px;background:${COLORS.panel};padding:14px;min-width:0}
        .re-dep-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
        .re-dep-element{display:flex;align-items:center;gap:8px;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
        .re-dep-element i{width:9px;height:9px;border-radius:50%;flex:none}
        .re-dep-badge{border:1px solid ${COLORS.line};border-radius:999px;padding:2px 7px;font-size:10px;color:${COLORS.sub};white-space:nowrap}
        .re-dep-metric{font-size:11px;color:${COLORS.sub};line-height:1.45;margin-top:5px;min-height:32px}
        .re-dep-pie{position:relative;width:132px;height:132px;border-radius:50%;margin:13px auto 11px}
        .re-dep-pie::after{content:"";position:absolute;inset:25px;border-radius:50%;background:${COLORS.panel};border:1px solid ${COLORS.line}}
        .re-dep-pie-value{position:absolute;inset:0;z-index:1;display:grid;place-content:center;text-align:center;pointer-events:none}
        .re-dep-pie-value strong{font:500 24px ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1}
        .re-dep-pie-value span{font-size:9px;color:${COLORS.faint};margin-top:5px}
        .re-dep-legend{display:grid;gap:4px;margin-top:4px}
        .re-dep-legend-item{display:grid;grid-template-columns:9px 1fr auto;gap:6px;align-items:center;font-size:10px;color:${COLORS.sub}}
        .re-dep-legend-item i{width:8px;height:8px;border-radius:50%}
        .re-dep-legend-item strong{font:500 10px ui-monospace,SFMono-Regular,Menlo,monospace;color:${COLORS.text}}
        .re-dep-evidence{font-size:12px;color:${COLORS.sub};line-height:1.6}
        .re-dep-source{display:inline-block;margin-top:5px;color:${COLORS.text};font-size:11px;text-underline-offset:3px}
        .re-dep-note{font-size:11px;color:${COLORS.faint};line-height:1.65}
        .re-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
        .re-company{border:1px solid ${COLORS.line};background:${COLORS.panel};color:${COLORS.text};border-radius:10px;padding:12px;text-align:left;cursor:pointer}
        .re-company[data-active="true"]{background:${COLORS.panelHi}}
        .re-name{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500}
        .re-dot{width:9px;height:9px;border-radius:50%;flex:none}
        .re-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}
        .re-tag{border:1px solid ${COLORS.line};border-radius:999px;padding:1px 7px;font:10px ui-monospace,SFMono-Regular,Menlo,monospace}
        .re-pos{font-size:12px;color:${COLORS.sub};line-height:1.55;margin-top:8px}
        .re-detail{border:1px solid ${COLORS.line};border-radius:12px;background:${COLORS.panel};padding:18px;position:sticky;top:14px}
        .re-empty{border:1px dashed ${COLORS.line};border-radius:12px;padding:24px;color:${COLORS.faint};font-size:13px}
        .re-dl{margin:14px 0 0}
        .re-row{display:grid;grid-template-columns:96px 1fr;gap:10px;border-top:1px solid ${COLORS.line};padding:8px 0}
        .re-row dt{font-size:12px;color:${COLORS.faint}} .re-row dd{margin:0;font-size:13px;line-height:1.65}
        .re-note{color:${COLORS.Sm}}
        @media(max-width:980px){.re-main{grid-template-columns:1fr}.re-detail{position:static}.re-flow{grid-template-columns:repeat(5,210px)}}
        @media(max-width:720px){.re-dep-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}}
        @media(max-width:560px){.re-wrap{padding:18px 12px 36px}.re-title{font-size:23px}.re-flow{grid-template-columns:1fr;overflow:visible}.re-stage:not(:last-child):after{display:none}.re-main{margin-top:18px}.re-list{grid-template-columns:1fr}}
      `}</style>

      <div className="re-wrap">
        <div className="re-top">
          <div>
            <div className="re-kicker">DUAL-USE SUPPLY CHAIN AUDIT — Y / Dy·Tb / Sm / Sc</div>
            <h1 className="re-title">希土類デュアルユース・サプライチェーン監査</h1>
          </div>
          <div className="re-controls">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importFile} style={{ display: "none" }} />
            <button className="re-file" onClick={() => fileRef.current && fileRef.current.click()}>Excelを読み込む</button>
            <button className="re-btn" onClick={reset}>初期データ</button>
          </div>
        </div>

        <div className="re-controls" style={{ marginTop: 16 }}>
          {ELEMENTS.map((item) => (
            <button key={item.id} className="re-btn" data-element={item.id}
              data-active={item.id === "all" ? selectedElements.length === ALL_ELEMENT_IDS.length : selectedElements.includes(item.id)}
              aria-pressed={item.id === "all" ? selectedElements.length === ALL_ELEMENT_IDS.length : selectedElements.includes(item.id)}
              onClick={() => toggleElement(item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="re-meta">
          <span>{companies.length}社・事業単位　|　データ: {sourceName}</span>
          <span>{status}</span>
        </div>

        <section className="re-flow" aria-label="希土類サプライチェーン">
          {STAGES.map((stage) => {
            const active = selection.stage === stage.id && !selection.sub;
            const subs = SUBCATS.filter((sub) => sub.stage === stage.id && sub.els.some((id) => selectedElements.includes(id)));
            return (
              <div key={stage.id} className="re-stage" data-active={active} onClick={() => selectStage(stage.id)}>
                {stage.id !== 1 && <span className="re-count">{stageCounts[stage.id] || 0}</span>}
                <div className="re-code">STAGE {stage.code}</div>
                <div className="re-stage-title">{stage.label}</div>
                <div className="re-stage-short">{stage.short}</div>
                {subs.length > 0 && (
                  <div className="re-subs">
                    {subs.map((sub) => (
                      <button key={sub.id} className="re-sub" data-id={sub.id} data-active={selection.sub === sub.id}
                        onClick={(event) => { event.stopPropagation(); selectSub(sub); }}>
                        {sub.label} · {subCounts[sub.id] || 0}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <main className={"re-main" + (isDependency ? " re-dependency-mode" : "")}>
          <section>
            {isDependency ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <h2 style={{ fontFamily: '"Hiragino Mincho ProN","Yu Mincho",serif', fontSize: 19, margin: 0 }}>工程 1 — 中国原料</h2>
                  <span style={{ color: COLORS.faint, fontSize: 12 }}>公的統計・公的資料ベース</span>
                </div>
                <section className="re-dep-dashboard" aria-label="希土類別の中国依存度">
                  <div className="re-dep-intro">円グラフは日本の輸入相手国構成を数量ベースで表示。Yは元素別実績、Dy・Tbは政府公表の重希土類区分、Sm・Scは日本の通関統計で元素別に分離できないため近接品目の代理指標です。</div>
                  <div className="re-dep-grid">
                    {visibleDependencyRows.map((row) => (
                      <article className="re-dep-card" key={row.id}>
                        <div className="re-dep-head"><div className="re-dep-element"><i style={{ background: COLORS[row.tag] }} />{row.label}</div><span className="re-dep-badge">{row.quality}</span></div>
                        <div className="re-dep-metric">{row.metric}</div>
                        <div className="re-dep-pie" role="img" aria-label={row.label + "の中国比率" + row.china + "%"} style={{ background: pieGradient(row.segments) }}><div className="re-dep-pie-value"><strong>{row.china}%</strong><span>中国</span></div></div>
                        <div className="re-dep-legend">{row.segments.map((segment) => <div className="re-dep-legend-item" key={segment.name}><i style={{ background: segment.color }} /><span>{segment.name}</span><strong>{segment.value}%</strong></div>)}</div>
                        <div className="re-dep-evidence">{row.evidence}<br /><a className="re-dep-source" href={row.url} target="_blank" rel="noopener noreferrer">{row.source}</a></div>
                      </article>
                    ))}
                  </div>
                  <div className="re-dep-note">データ品質：Sm・Scの円グラフは元素固有の輸入シェアではありません。<a className="re-dep-source" href="https://www.customs.go.jp/tariff/2024_04_01/data/j_28.htm" target="_blank" rel="noopener noreferrer">日本の輸入統計品目</a>は酸化Yを分離する一方、Dy・Tb・Sm・Scの化合物を個別分離していません。Scにはフィリピン由来中間体→日本精製という非中国ルートが確認されています（<a className="re-dep-source" href="https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-scandium.pdf" target="_blank" rel="noopener noreferrer">USGS MCS 2026</a>）。</div>
                </section>
              </>
            ) : (
              <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 style={{ fontFamily: '"Hiragino Mincho ProN","Yu Mincho",serif', fontSize: 19, margin: 0 }}>{heading}</h2>
              <span style={{ color: COLORS.faint, fontSize: 12 }}>{list.length}社・事業単位</span>
            </div>
            <div className="re-list">
              {list.length === 0 && <div className="re-empty">この条件では該当企業がありません。</div>}
              {list.map((company) => (
                <button key={company.id} className="re-company" data-active={companyId === company.id}
                  onClick={() => setCompanyId(company.id)}
                  style={{ borderTop: "3px solid " + (COLORS[company.ev] || COLORS.C) }}>
                  <div className="re-name">
                    <span className="re-dot" style={{ background: COLORS[company.ev] || COLORS.C }} />
                    <span>{company.name}</span>
                  </div>
                  <div className="re-tags">
                    {company.tags.map((tag) => (
                      <span key={tag} className="re-tag" style={{ color: COLORS[tag], borderColor: COLORS[tag] }}>{tag === "DyTb" ? "Dy・Tb" : tag}</span>
                    ))}
                  </div>
                  <div className="re-pos">{company.pos || company.prod || "詳細は企業カードを選択"}</div>
                </button>
              ))}
            </div>
              </>
            )}
          </section>

          {!isDependency && <aside>
            {!selectedCompany ? (
              <div className="re-empty">企業カードを選ぶと、所有構造、売上、製品、市場地位、防衛接続、中国依存、参照元を表示します。</div>
            ) : (
              <div className="re-detail" style={{ borderTop: "3px solid " + (COLORS[selectedCompany.ev] || COLORS.C) }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong style={{ fontSize: 17 }}>{selectedCompany.name}</strong>
                  <span style={{ color: COLORS[selectedCompany.ev] || COLORS.C, fontSize: 12 }}>{evLabel[selectedCompany.ev] || evLabel.C}</span>
                </div>
                <dl className="re-dl">
                  {[
                    ["所有・上場", selectedCompany.own],
                    ["売上高", selectedCompany.rev],
                    ["主要製品・役割", selectedCompany.prod],
                    ["市場地位", selectedCompany.pos],
                    ["航空・宇宙・防衛", selectedCompany.def],
                    ["中国依存・DD", selectedCompany.chn],
                    ["BOM根拠", selectedCompany.bom],
                    ["追加DDギャップ", selectedCompany.gap],
                    ["分類", selectedCompany.stages.map((n) => "Stage " + String(n).padStart(2, "0")).join(" / ")],
                    ["サブカテゴリー", selectedCompany.subs.map((id) => (SUBCATS.find((s) => s.id === id) || {}).label || id).join(" / ")],
                    ["参照元", selectedCompany.src],
                    ["備考", selectedCompany.note]
                  ].filter((entry) => entry[1]).map(([label, value]) => (
                    <div className="re-row" key={label}>
                      <dt>{label}</dt>
                      <dd className={label === "備考" ? "re-note" : ""}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>}
        </main>
      </div>
    </div>
  );
}
