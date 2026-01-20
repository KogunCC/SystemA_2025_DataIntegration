# 結合テスト仕様書：売上管理システム (Sales Management System)

## 1. システム概要とテスト環境
本ドキュメントは、Azure SQL DatabaseおよびSFTPサーバ（全店舗管理サーバ）を使用する「売上管理システム」の結合テスト仕様である。

### 1.1 インフラ構成
* **Database:** Azure SQL Database
* **File Server:** SFTP Server (全店舗管理サーバ)
* **Client/Batch Server:** 店舗サーバ（バッチ処理実行環境）

### 1.2 ディレクトリ構成 (店舗サーバ)
ファイル送受信処理において、以下のディレクトリを使用する。
* `/send` : 送信待ちフォルダ（作成されたバイナリ配置場所）
* `/send_backup` : 送信済みフォルダ（SFTP転送成功時の移動先）
* `/recv` : 受信フォルダ（SFTPからのダウンロード先）
* `/recv_done` : 受信済みフォルダ（DB取込成功時の移動先）
* `/error` : エラーフォルダ（取込失敗時の移動先）

---

## 2. データベース定義 (DDL)

```sql
/* 1. 店舗マスタ */
CREATE TABLE store_master (
    store_code CHAR(8) NOT NULL, -- 店舗コード
    store_name VARCHAR(100),     -- 店舗名
    active_flg TINYINT DEFAULT 1,-- 稼働フラグ(1:稼働, 0:停止)
    reg_date DATE,               -- 登録日
    PRIMARY KEY (store_code)
);

/* 2. 商品マスタ (バイナリ取込対象) */
CREATE TABLE item_master (
    item_code CHAR(8) NOT NULL,  -- 商品コード
    store_code CHAR(8) NOT NULL, -- 店舗コード
    price INT DEFAULT 0,         -- 販売単価
    cost INT DEFAULT 0,          -- 仕入単価
    sale_flg SMALLINT DEFAULT 1, -- 販売フラグ(0:販売前, 1:販売中, 2:廃止)
    file_version CHAR(4),        -- ファイルバージョン
    reg_date DATE,               -- 登録日
    PRIMARY KEY (store_code, item_code) 
);

/* 3. 商品名 (CSV取込対象) */
CREATE TABLE item_name (
    item_code CHAR(8) NOT NULL,  -- 商品コード
    item_name VARCHAR(100),      -- 商品名
    update_date DATE,            -- 更新日
    PRIMARY KEY (item_code)
);

/* 4. 店舗売上 (送信対象) */
CREATE TABLE store_sales (
    store_code CHAR(8) NOT NULL, -- 店舗コード
    agg_date CHAR(6) NOT NULL,   -- 集計年月(YYYYMM)
    item_code CHAR(8) NOT NULL,  -- 商品コード
    price INT NOT NULL DEFAULT 0,    -- 販売時の設定単価
    quantity INT NOT NULL DEFAULT 0, -- 売上総数量
    discount INT NOT NULL DEFAULT 0, -- 割引適用総額
    locate_date DATETIME NOT NULL,   -- レコード追加日時
    PRIMARY KEY (store_code, agg_date, item_code)
);

/* 5. 送信ログ */
CREATE TABLE send_log (
    send_id INT IDENTITY(1,1) PRIMARY KEY, -- 自動採番(AzureSQL)
    store_code CHAR(8) NOT NULL,
    send_date DATETIME,
    send_filename VARCHAR(255),
    status VARCHAR(20) -- '正常', '異常'
);

/* 6. 受信ログ */
CREATE TABLE recv_log (
    recv_id INT IDENTITY(1,1) PRIMARY KEY, -- 自動採番
    store_code CHAR(8) NOT NULL,
    recv_date DATETIME,
    recv_filename VARCHAR(255),
    status VARCHAR(20) -- '正常', '異常'
);

/* 7. エラーログ (例外記録用) */
CREATE TABLE error_log (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    process_name VARCHAR(50),
    error_message NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
```

-----

## 3. ファイルインターフェース仕様

### 3.1 店舗売上データ (送信ファイル)

店舗から本部へ送信するバイナリファイル。

  * **ファイル名:** `{店舗コード:8桁}{集計年月:yyyyMM}{作成日時:yyyyMMddHHmmss}[2]`
      * 例: `9999000120251220251231235959`
  * **形式:** 固定長バイナリ
  * **レイアウト:**

| 項目 | 形式 | バイト数 | 値範囲/説明 |
| :--- | :--- | :--- | :--- |
| 店舗コード | BCD | 4 | 8桁 (例: `99990001` -> `0x99 0x99 0x00 0x01`) |
| 集計年月 | BCD | 3 | 6桁 (例: `202512` -> `0x20 0x25 0x12`) |
| 商品コード | BCD | 4 | 8桁 (1-3桁:分類, 4-8桁:番号) |
| 販売単価 | BIN | 4 | Integer (Big Endian) |
| 売上総数量 | BIN | 4 | Integer (Big Endian) |
| 割引適用総額 | BIN | 4 | Integer (Big Endian) |
| 予約領域 | BIN | 5 | ALL `0x00` (Padding) |

### 3.2 商品マスタ (受信ファイル)

本部から店舗へ配信されるバイナリファイル。

  * **形式:** 固定長バイナリ
  * **レイアウト:**
      * 店舗コード (BCD 4byte)
      * ファイルバージョン (BCD 2byte)
      * 商品コード (BCD 4byte)
      * 販売単価 (BIN 4byte)
      * 仕入単価 (BIN 4byte)
      * 販売フラグ (BIN 2byte)

### 3.3 商品名マスタ (受信ファイル)

  * **ファイル名:** `Product_{作成日:yyyyMMdd}.csv`
  * **形式:** CSV (ヘッダ無し), UTF-8
  * **レイアウト:**
    1.  商品コード (8桁)
    2.  商品名 (フリーテキスト)

-----

## 4. バッチ処理ロジックとエラーハンドリング

### 4.1 店舗売上データ送信処理 (Send Batch)

1.  **データ取得:** 指定された「開始年月～終了年月」のデータを `store_sales` から取得。
2.  **ファイル生成:** 固定長バイナリファイルを `/send` に作成。
3.  **送信 (SFTP):** `/send` のファイルをSFTPサーバへアップロード。
4.  **事後処理:**
      * **成功時:** ファイルを `/send_backup` に移動。`send_log` に「正常」記録。
      * **失敗時:** ファイルは `/send` に**残す**（次回実行時に**自動リトライ**対象とする）。`send_log` に「異常」記録。DBエラーログ記録。

### 4.2 商品マスタ受信処理 (Recv Batch)

1.  **取得 (SFTP):** SFTPサーバから `/recv` にファイルをダウンロード。
2.  **登録 (DB):**
      * **部分取込 (Partial Import):** 複数レコード中、一部にフォーマットエラー（型不正など）があっても、**正常なレコードはコミット**する。
      * **エラー制御:** エラーレコードについてはスキップし、`error_log` テーブルに詳細を記録する。
3.  **事後処理:**
      * 全件成功または部分成功時: ファイルを `/recv_done` に移動。
      * 致命的エラー時: ファイルを `/error` に移動。

-----

## 5. 結合テストケース詳細

### T1: 商品マスタ受信 (正常系)

  * **手順:**
    1.  SFTPサーバに正常な商品マスタ(バイナリ)を配置。
    2.  処理区分`2`で受信バッチを起動。
  * **検証:**
      * `item_master` テーブルにデータが登録されていること。
      * `/recv` フォルダが空になり、`/recv_done` にファイルが移動していること。
      * `recv_log` ステータスが「正常」であること。

### T2: 商品名受信 (正常系 CSV)

  * **手順:**
    1.  SFTPサーバに `Product_20251201.csv` を配置。
    2.  商品名取込処理を起動。
  * **検証:**
      * `item_name` テーブルに商品コードと名称が登録されること。
      * UTF-8文字化けがないこと。

### T3: 商品マスタ受信 (準正常系 - 部分取込)

  * **手順:**
    1.  100件中1件だけ不正データ（BCD定義箇所に`0xFF`等）を含むバイナリを作成し配置。
    2.  受信バッチを起動。
  * **検証:**
      * **99件のデータは登録**されていること。
      * **1件はスキップ**されていること。
      * `error_log` テーブルに当該レコードのエラーが記録されていること。
      * ファイルは処理済みとして `/recv_done` に移動していること（仕様によるがログ確認を主とする）。

### T4: 店舗売上送信 (正常系 - 単月)

  * **手順:**
    1.  DB `store_sales` に2025年12月のデータを準備。
    2.  パラメータ「開始:202512, 終了:202512」で送信バッチ起動。
  * **検証:**
      * SFTPサーバにファイルが転送されていること。
      * ファイル名が正しいこと (`{店舗CD}202512...`)。
      * ローカルの `/send` が空で、`/send_backup` にファイルがあること。

### T5: 店舗売上送信 (バイナリ内容検証)

  * **手順:**
    1.  T4で生成されたファイルをバイナリエディタまたはダンプツールで確認。
  * **検証:**
      * 店舗コード等のBCD値が正しい16進数で表現されていること。
      * 数値項目(BIN)がBig Endian整数になっていること。
      * 末尾の予約領域(5byte)が `0x00` 埋めされていること。

### T6: 店舗売上送信 (異常系 - 自動リトライ)

  * **手順:**
    1.  **[1回目]** SFTPサーバを停止(またはNW遮断)してバッチ起動。
          * -> 検証: エラーログ出力、ファイルは `/send` に残留。
    2.  **[2回目]** SFTPサーバを復旧してバッチ起動。
          * -> 検証: 残留していたファイルが送信され、`/send_backup` へ移動。

### T7: DB接続エラー (異常系)

  * **手順:**
    1.  Azure SQL DatabaseへのFirewall設定等で接続を遮断し、バッチ起動。
  * **検証:**
      * アプリケーションがクラッシュせず、エラーログを出力して終了すること。

### T8: 画面連携確認

  * **手順:**
    1.  送受信管理画面を開き、検索を行う。
  * **検証:**
    1.  T1～T6の実行結果（処理日時、ステータス、ファイル名）が一覧に正しく表示されること。

-----

## 6. 検証用SQLクエリ

```sql
-- 受信結果確認
SELECT * FROM item_master WHERE item_code = 'TEST0001';
SELECT * FROM item_name WHERE item_code = 'TEST0001';

-- 部分取込エラーログ確認
SELECT * FROM error_log ORDER BY created_at DESC;

-- 送信ログ確認
SELECT TOP 10 * FROM send_log ORDER BY send_date DESC;

-- 送信データ準備 (例)
INSERT INTO store_sales (store_code, agg_date, item_code, price, quantity, discount, locate_date)
VALUES ('99990001', '202512', '00100001', 1000, 10, 0, GETDATE());
```
