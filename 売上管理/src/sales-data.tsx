// /src/components/sales-data.tsx

"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import type { StoreSales } from "@/lib/types";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  FileDown, 
  Search,
  Calendar as CalendarIcon
} from "lucide-react";

// --- Mock Data ---
// 本来はAPIから非同期で取得します
const mockSalesData: StoreSales[] = [
  { store_code: "00000001", agg_date: "202511", item_code: "10100001", item_name: "プレミアムブレンドコーヒー", price: 500, quantity: 120, discount: 5000, locate_date: "2025-12-01T10:00:00Z" },
  { store_code: "00000001", agg_date: "202511", item_code: "10100002", item_name: "アイスコーヒー", price: 450, quantity: 250, discount: 12000, locate_date: "2025-12-01T10:00:00Z" },
  { store_code: "00000002", agg_date: "202511", item_code: "10200001", item_name: "クロワッサン", price: 300, quantity: 300, discount: 8000, locate_date: "2025-12-01T10:00:00Z" },
  { store_code: "00000001", agg_date: "202512", item_code: "10100001", item_name: "プレミアムブレンドコーヒー", price: 500, quantity: 150, discount: 6000, locate_date: "2025-12-18T10:00:00Z" },
  { store_code: "00000001", agg_date: "202512", item_code: "10200002", item_name: "パン・オ・ショコラ", price: 350, quantity: 180, discount: 4500, locate_date: "2025-12-18T10:00:00Z" },
  { store_code: "00000002", agg_date: "202512", item_code: "10100002", item_name: "アイスコーヒー", price: 450, quantity: 200, discount: 9000, locate_date: "2025-12-18T10:00:00Z" },
  // ... more data
];

type SortKey = keyof StoreSales | 'total_sales';
type SortDirection = 'asc' | 'desc';

const SalesData: React.FC = () => {
  const [data] = useState<StoreSales[]>(mockSalesData);
  const [searchTerm, setSearchTerm] = useState("");
  const [aggDate, setAggDate] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredAndSortedData = useMemo(() => {
    let filteredData = data.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.item_code.includes(searchTerm);
      const matchesDate = aggDate ? item.agg_date === aggDate.replace("-", "") : true;
      return matchesSearch && matchesDate;
    });

    if (sortConfig !== null) {
      filteredData.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'total_sales') {
          aValue = a.price * a.quantity - a.discount;
          bValue = b.price * b.quantity - b.discount;
        } else {
          aValue = a[sortConfig.key as keyof StoreSales];
          bValue = b[sortConfig.key as keyof StoreSales];
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredData;
  }, [data, searchTerm, aggDate, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ja-JP').format(value);
  };

  const SortableHeader: React.FC<{ columnKey: SortKey; title: string; className?: string }> = ({ columnKey, title, className }) => (
    <th className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer ${className}`} onClick={() => handleSort(columnKey)}>
      <div className="flex items-center">
        {title}
        {sortConfig?.key === columnKey ? (
          sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
        ) : (
          <div className="ml-1 h-4 w-4" />
        )}
      </div>
    </th>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">売上管理</h1>
          <p className="text-sm text-gray-600 mt-1">店舗ごとの商品売上データを表示・管理します。</p>
        </header>

        {/* Filter and Actions */}
        <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="商品名・コードで検索..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="month"
                value={aggDate}
                onChange={(e) => { setAggDate(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="lg:col-start-4 flex items-center justify-end">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <FileDown className="mr-2 h-4 w-4" />
                CSVエクスポート
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader columnKey="agg_date" title="集計年月" />
                <SortableHeader columnKey="store_code" title="店舗コード" />
                <SortableHeader columnKey="item_code" title="商品コード" />
                <SortableHeader columnKey="item_name" title="商品名" />
                <SortableHeader columnKey="price" title="単価" className="text-right" />
                <SortableHeader columnKey="quantity" title="数量" className="text-right" />
                <SortableHeader columnKey="discount" title="割引額" className="text-right" />
                <SortableHeader columnKey="total_sales" title="売上金額" className="text-right" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((sale, index) => {
                  const totalSales = sale.price * sale.quantity - sale.discount;
                  return (
                    <tr key={`${sale.store_code}-${sale.item_code}-${sale.agg_date}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{sale.agg_date}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{sale.store_code}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{sale.item_code}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{sale.item_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono">{formatCurrency(sale.price)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-mono">{formatNumber(sale.quantity)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 text-right font-mono">{formatCurrency(sale.discount)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono font-bold">{formatCurrency(totalSales)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    データが見つかりません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            全 {filteredAndSortedData.length} 件中 {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedData.length)} - {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} 件を表示
          </div>
          <div className="inline-flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-700">
              {currentPage} / {totalPages > 0 ? totalPages : 1}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesData;
