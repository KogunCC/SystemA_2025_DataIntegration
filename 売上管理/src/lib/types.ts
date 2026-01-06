// /src/lib/types.ts

// 商品マスタ (Product Master)
export interface ProductMaster {
  store_code: string;     // 店舗コード (8桁)
  file_version: string;   // ファイルバージョン
  item_code: string;      // 商品コード (8桁: 1-3桁=分類, 4-8桁=商品番号)
  price: number;          // 販売単価
  cost: number;           // 仕入単価
  sale_flg: number;       // 0:販売前, 1:販売中, 2:廃止
}

// 店舗売上 (Store Sales)
export interface StoreSales {
  store_code: string;     // 店舗コード (8桁)
  agg_date: string;       // 集計年月 (YYYYMM)
  item_code: string;      // 商品コード (8桁)
  price: number;          // 販売時の設定単価
  quantity: number;       // 売上総数量
  discount: number;       // 割引適用総額
  locate_date: string;    // 取込日時 (Datetime文字列)
  
  // 画面表示用結合データ（本来はJOIN等で取得する想定）
  item_name: string;      // 商品名
}
