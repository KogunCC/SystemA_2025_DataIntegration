```marmeid
    store_master ||--o{ store_sales : "販売実績を持つ"
    store_master ||--o{ send_log : "ファイルを送信する"
    store_master ||--o{ recv_log : "ファイルを受信する"
    
    %% 商品マスタが「店舗ごと」か「全店共通」かで線が変わりますが、
    %% 今回は図1に基づき、商品マスタと売上を直接つなぎます。
    item_master ||--o{ store_sales : "商品が含まれる"
    item_master ||--|{ item_name : "名称を持つ"

    store_master {
        CHAR(8) store_code PK "店舗コード"
        VARCHAR(100) store_name "店舗名"
        TINYINT active_flg "稼働フラグ"
        DATE reg_date "登録日"
    }

    item_master {
        CHAR(8) item_code PK "商品コード"
        CHAR(8) store_code FK "店舗コード(※)"
        INT price "販売単価"
        INT cost "仕入単価"
        SMALLINT sale_flg "販売フラグ"
    }

    item_name {
        CHAR(8) item_code PK,FK "商品コード"
        VARCHAR(100) item_name "商品名"
        DATE update_date "更新日"
    }

    store_sales {
        CHAR(8) store_code PK,FK "店舗コード"
        CHAR(6) agg_date PK "集計年月"
        CHAR(8) item_code PK,FK "商品コード"
        INT price "販売単価"
        INT quantity "売上総数量"
        INT discount "割引適用総額"
        DATETIME locate_date "取込日時"
    }

    send_log {
        INT send_id PK "送信ID"
        CHAR(8) store_code FK "店舗コード"
        DATETIME send_date "送信日時"
        VARCHAR(255) send_filename "送信ファイル名"
        VARCHAR(20) status "ステータス"
    }

    recv_log {
        INT recv_id PK "受信ID"
        CHAR(8) store_code FK "店舗コード"
        DATETIME recv_date "受信日時"
        VARCHAR(255) recv_filename "受信ファイル名"
        VARCHAR(20) status "ステータス"
    }
```