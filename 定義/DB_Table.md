/* 1. 店舗マスタ */
CREATE TABLE store_master (
    store_code CHAR(8) NOT NULL COMMENT '店舗コード',
    store_name VARCHAR(100) COMMENT '店舗名',
    active_flg TINYINT DEFAULT 1 COMMENT '稼働フラグ(1:稼働, 0:停止)',
    reg_date DATE COMMENT '登録日',
    PRIMARY KEY (store_code)
);

/* 2. 商品マスタ (※画像2のバイナリ定義に基づく) */
CREATE TABLE item_master (
    item_code CHAR(8) NOT NULL COMMENT '商品コード',
    store_code CHAR(8) NOT NULL COMMENT '店舗コード(店舗ごとに単価が違う場合)',
    price INT DEFAULT 0 COMMENT '販売単価',
    cost INT DEFAULT 0 COMMENT '仕入単価',
    sale_flg SMALLINT DEFAULT 1 COMMENT '販売フラグ(0:販売前, 1:販売中, 2:廃止)',
    file_version CHAR(4) COMMENT 'ファイルバージョン',
    reg_date DATE COMMENT '登録日',
    /* 店舗ごとに商品を管理するなら複合主キー */
    PRIMARY KEY (store_code, item_code) 
);

/* 3. 商品名 (名称マスタ/履歴) */
CREATE TABLE item_name (
    item_code CHAR(8) NOT NULL COMMENT '商品コード',
    item_name VARCHAR(100) COMMENT '商品名',
    update_date DATE COMMENT '更新日',
    PRIMARY KEY (item_code)
    /* 必要に応じて store_code も主キーに含めるか検討 */
);

/* 4. 店舗売上 (物理定義画像に基づく) */
CREATE TABLE store_sales (
    store_code CHAR(8) NOT NULL COMMENT '店舗コード',
    agg_date CHAR(6) NOT NULL COMMENT '集計年月(YYYYMM)',
    item_code CHAR(8) NOT NULL COMMENT '商品コード',
    price INT NOT NULL DEFAULT 0 COMMENT '販売時の設定単価',
    quantity INT NOT NULL DEFAULT 0 COMMENT '集計月内の売上総数量',
    discount INT NOT NULL DEFAULT 0 COMMENT '集計月内の割引適用総額',
    locate_date DATETIME NOT NULL COMMENT 'レコード追加日時',
    PRIMARY KEY (store_code, agg_date, item_code),
    FOREIGN KEY (store_code) REFERENCES store_master(store_code)
    /* item_masterへの外部キーは、構成次第で追加 */
);

/* 5. 送信ログ */
CREATE TABLE send_log (
    send_id INT AUTO_INCREMENT NOT NULL COMMENT '送信ID',
    store_code CHAR(8) NOT NULL COMMENT '店舗コード',
    send_date DATETIME COMMENT '送信日時',
    send_filename VARCHAR(255) COMMENT '送信ファイル名',
    status VARCHAR(20) COMMENT 'ステータス',
    PRIMARY KEY (send_id),
    FOREIGN KEY (store_code) REFERENCES store_master(store_code)
);

/* 6. 受信ログ */
CREATE TABLE recv_log (
    recv_id INT AUTO_INCREMENT NOT NULL COMMENT '受信ID',
    store_code CHAR(8) NOT NULL COMMENT '店舗コード',
    recv_date DATETIME COMMENT '受信日時',
    recv_filename VARCHAR(255) COMMENT '受信ファイル名',
    status VARCHAR(20) COMMENT 'ステータス',
    PRIMARY KEY (recv_id),
    FOREIGN KEY (store_code) REFERENCES store_master(store_code)
);