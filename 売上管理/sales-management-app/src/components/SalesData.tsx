
import React, { useState, useMemo } from 'react';

// 2. データ構造の定義 (TypeScript Interface)
// 商品マスタ (Product Master) - 参考情報として
interface ProductMaster {
  store_code: string;     // 店舗コード (8桁)
  file_version: string;   // ファイルバージョン
  item_code: string;      // 商品コード (8桁: 先頭1-3桁が分類, 4-8桁が番号)
  price: number;          // 販売単価
  cost: number;           // 仕入単価
  sale_flg: number;       // 0:販売前, 1:販売中, 2:廃止
}

// 店舗売上 (Store Sales)
interface StoreSales {
  store_code: string;     // 店舗コード
  agg_date: string;       // 集計年月 (YYYYMM)
  item_code: string;      // 商品コード
  price: number;          // 販売時の設定単価
  quantity: number;       // 売上総数量
  discount: number;       // 割引適用総額
  locate_date: string;    // 取込日時 (Datetime)
  
  // 画面表示用結合データ
  item_name: string;      // 商品名
}

// 4. ビジネスロジック・挙動 (Logic) - モックデータ
const initialData: StoreSales[] = [
  { store_code: 'S001', agg_date: '202411', item_code: '001-0001', price: 150, quantity: 10, discount: 50, locate_date: '2024/11/15 10:30', item_name: '新鮮たまごパック' },
  { store_code: 'S001', agg_date: '202411', item_code: '001-0002', price: 200, quantity: 5, discount: 0, locate_date: '2024/11/15 11:00', item_name: '国産牛乳 1L' },
  { store_code: 'S002', agg_date: '202411', item_code: '002-0001', price: 120000, quantity: 1, discount: 10000, locate_date: '2024/11/16 14:00', item_name: '新型スマートフォン' },
  { store_code: 'S001', agg_date: '202411', item_code: '003-0001', price: 300, quantity: 3, discount: 0, locate_date: '2024/11/17 09:00', item_name: 'ティッシュペーパー 5箱' },
  { store_code: 'S001', agg_date: '202412', item_code: '001-0003', price: 450, quantity: 8, discount: 100, locate_date: '2024/12/01 18:00', item_name: 'こだわり食パン' },
  { store_code: 'S003', agg_date: '202412', item_code: '004-0001', price: 800, quantity: 2, discount: 0, locate_date: '2024/12/02 13:20', item_name: 'おしゃれなノート' },
  { store_code: 'S002', agg_date: '202412', item_code: '002-0002', price: 5000, quantity: 1, discount: 500, locate_date: '2024/12/03 15:00', item_name: 'ワイヤレスイヤホン' },
  { store_code: 'S001', agg_date: '202412', item_code: '001-0001', price: 160, quantity: 20, discount: 150, locate_date: '2024/12/05 10:00', item_name: '新鮮たまごパック' },
  { store_code: 'S003', agg_date: '202412', item_code: '003-0002', price: 500, quantity: 5, discount: 0, locate_date: '2024/12/08 19:30', item_name: '液体洗剤 詰替用' },
  { store_code: 'S002', agg_date: '202412', item_code: '001-0004', price: 80, quantity: 15, discount: 20, locate_date: '2024/12/10 12:00', item_name: 'ポテトチップス' },
];

const CATEGORIES = {
  '001': '食料品',
  '002': '機器',
  '003': '生活用品',
  '004': 'その他用品',
};

type CategoryKey = keyof typeof CATEGORIES;

const getCategoryName = (itemCode: string): string => {
  const categoryCode = itemCode.substring(0, 3) as CategoryKey;
  return CATEGORIES[categoryCode] || '不明';
};

export const SalesData = () => {
  const [filteredData, setFilteredData] = useState<StoreSales[]>(initialData);

  // 検索条件のState
  const [periodFrom, setPeriodFrom] = useState('2024/11');
  const [periodTo, setPeriodTo] = useState('2024/12');
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({
    '001': false, '002': false, '003': false, '004': false,
  });
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');

  const handleCategoryChange = (categoryCode: string) => {
    setSelectedCategories(prev => ({ ...prev, [categoryCode]: !prev[categoryCode] }));
  };

  const handleSearch = () => {
    let data = [...initialData];

    // 期間 (YYYY/MM -> YYYYMM)
    const from = periodFrom.replace('/', '');
    const to = periodTo.replace('/', '');
    data = data.filter(d => d.agg_date >= from && d.agg_date <= to);

    // 商品分類
    const activeCategories = Object.keys(selectedCategories).filter(k => selectedCategories[k]);
    if (activeCategories.length > 0) {
      data = data.filter(d => activeCategories.includes(d.item_code.substring(0, 3)));
    }

    // 商品番号
    if (itemCode) {
      data = data.filter(d => d.item_code.includes(itemCode));
    }

    // 商品名
    if (itemName) {
      data = data.filter(d => d.item_name.toLowerCase().includes(itemName.toLowerCase()));
    }

    setFilteredData(data);
  };

  const handleClear = () => {
    setPeriodFrom('2024/11');
    setPeriodTo('2024/12');
    setSelectedCategories({ '001': false, '002': false, '003': false, '004': false });
    setItemCode('');
    setItemName('');
    setFilteredData(initialData);
  };

  return (
    <div className="bg-white p-4 font-sans text-sm w-full h-screen flex flex-col">
      {/* A. ヘッダーエリア */}
      <h1 className="text-xl font-bold mb-2">売上管理</h1>

      {/* B. 検索条件エリア */}
      <div className="border border-gray-300 rounded p-3 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
          {/* 期間 */}
          <div className="flex items-center">
            <label className="w-20 shrink-0">期間</label>
            <input type="text" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 w-full" />
            <span className="mx-2">〜</span>
            <input type="text" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 w-full" />
          </div>
          {/* 商品分類 */}
          <div className="flex items-center col-span-1 md:col-span-2 lg:col-span-3">
            <label className="w-20 shrink-0">商品分類</label>
            <div className="flex items-center space-x-4">
              {Object.entries(CATEGORIES).map(([code, name]) => (
                <label key={code} className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories[code]}
                    onChange={() => handleCategoryChange(code)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 商品番号 */}
          <div className="flex items-center">
            <label htmlFor="item_code" className="w-20 shrink-0">商品番号</label>
            <input id="item_code" type="text" value={itemCode} onChange={e => setItemCode(e.target.value)} className="border border-gray-300 rounded px-2 py-1 w-full" />
          </div>
          {/* 商品名 */}
          <div className="flex items-center">
            <label htmlFor="item_name" className="w-20 shrink-0">商品名</label>
            <input id="item_name" type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="border border-gray-300 rounded px-2 py-1 w-full" />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm">検索</button>
          <button onClick={handleClear} className="bg-gray-200 text-gray-800 px-4 py-1 rounded hover:bg-gray-300 ml-2 text-sm">条件クリア</button>
        </div>
      </div>

      {/* C. データグリッドエリア */}
      <div className="flex-grow border border-gray-300 rounded overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">販売日時</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">分類</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">商品番号</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">商品名</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">売上数量</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">割引適用額</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">売上額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((row, index) => {
                const salesAmount = row.price * row.quantity - row.discount;
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-1 whitespace-nowrap">{row.locate_date}</td>
                    <td className="px-3 py-1 whitespace-nowrap">{getCategoryName(row.item_code)}</td>
                    <td className="px-3 py-1 whitespace-nowrap">{row.item_code}</td>
                    <td className="px-3 py-1 whitespace-nowrap">{row.item_name}</td>
                    <td className="px-3 py-1 whitespace-nowrap text-right">{row.quantity.toLocaleString()}</td>
                    <td className="px-3 py-1 whitespace-nowrap text-right">{row.discount.toLocaleString()}</td>
                    <td className="px-3 py-1 whitespace-nowrap text-right font-medium">{salesAmount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* D. フッターエリア */}
      <div className="flex justify-between items-center mt-3">
        <div>
          <button className="bg-gray-200 text-gray-800 px-4 py-1 rounded hover:bg-gray-300 text-sm">売上データ送信</button>
        </div>
        <div className="flex space-x-2">
          <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm">更新</button>
          <button className="bg-gray-200 text-gray-800 px-4 py-1 rounded hover:bg-gray-300 text-sm">閉じる</button>
        </div>
      </div>
    </div>
  );
};

export default SalesData;
