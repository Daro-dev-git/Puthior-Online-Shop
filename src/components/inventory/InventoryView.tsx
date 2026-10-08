import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { compareSizes } from '../../utils/sizeUtils';
import {
  Boxes,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  Shirt,
  Palette,
} from 'lucide-react';

interface InventoryViewProps {
  onOpenRestock: (code: string, size?: string, color?: string) => void;
  onOpenIssue: (code: string, size?: string, color?: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenRestock, onOpenIssue }) => {
  const { products, dressTypes, colors, kpis, getDressTypeName, isAdmin, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Flatten products into variant rows, ordered by Product Code and size number
  const allVariants = useMemo(() => {
    const rows: {
      productId: string;
      variantId: string;
      productCode: string;
      productName: string;
      dressTypeName: string;
      size: string;
      color: string;
      actualPrice: number;
      sellingPrice: number;
      currentStock: number;
      minimumStock: number;
      image: string;
    }[] = [];

    // Order by Product Code
    const sortedProducts = [...products].sort((a, b) =>
      a.ProductCode.localeCompare(b.ProductCode, undefined, { numeric: true, sensitivity: 'base' })
    );

    sortedProducts.forEach((p) => {
      const typeName = getDressTypeName(p.DressTypeID);
      const img = p.Images[0]?.ImageURL || '';

      // Order variants by size number
      const sortedVariants = [...p.Variants].sort((a, b) => {
        const sizeDiff = compareSizes(a.Size, b.Size);
        if (sizeDiff !== 0) return sizeDiff;
        return a.Color.localeCompare(b.Color);
      });

      sortedVariants.forEach((v) => {
        rows.push({
          productId: p.ProductID,
          variantId: v.VariantID,
          productCode: p.ProductCode,
          productName: p.ProductName,
          dressTypeName: typeName,
          size: v.Size,
          color: v.Color,
          actualPrice: v.ActualPrice,
          sellingPrice: v.SellingPrice,
          currentStock: v.CurrentStock,
          minimumStock: v.MinimumStock,
          image: img,
        });
      });
    });

    return rows;
  }, [products, getDressTypeName]);

  // Filtered rows
  const filteredVariants = useMemo(() => {
    return allVariants.filter((row) => {
      if (selectedType !== 'all' && row.dressTypeName !== selectedType) {
        return false;
      }

      if (selectedColor !== 'all' && row.color.toLowerCase() !== selectedColor.toLowerCase()) {
        return false;
      }

      if (stockStatusFilter === 'out_of_stock' && row.currentStock > 0) return false;
      if (stockStatusFilter === 'low_stock' && (row.currentStock > row.minimumStock || row.currentStock === 0)) return false;
      if (stockStatusFilter === 'in_stock' && row.currentStock === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = row.productCode.toLowerCase().includes(q);
        const nameMatch = row.productName.toLowerCase().includes(q);
        const sizeMatch = row.size.toLowerCase().includes(q);
        const colorMatch = row.color.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !sizeMatch && !colorMatch) return false;
      }

      return true;
    });
  }, [allVariants, selectedType, selectedColor, stockStatusFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Product Code', 'Product Name', 'Dress Type', 'Size', 'Color', 'Selling Price', 'Current Stock', 'Min Stock'];
    if (isAdmin) {
      headers.push('Actual Cost', 'Profit', 'Margin %');
    }

    const rows = filteredVariants.map((v) => {
      const profit = v.sellingPrice - v.actualPrice;
      const margin = v.actualPrice > 0 ? ((profit / v.actualPrice) * 100).toFixed(1) + '%' : '0%';
      const row = [
        `"${v.productCode}"`,
        `"${v.productName}"`,
        `"${v.dressTypeName}"`,
        `"${v.size}"`,
        `"${v.color}"`,
        v.sellingPrice.toFixed(2),
        v.currentStock,
        v.minimumStock,
      ];
      if (isAdmin) {
        row.push(v.actualPrice.toFixed(2), profit.toFixed(2), `"${margin}"`);
      }
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `girl_dress_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported inventory ledger to CSV');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Inventory & Stock Master
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Atomic tracking per unique variant (Product Code + Size + Color)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Total Stock Units</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            {kpis.totalStockUnits}
          </div>
          <span className="text-[11px] text-stone-400 font-mono-numbers">
            across {kpis.totalVariants} unique variants
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Inventory Valuation</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            {isAdmin ? `$${kpis.totalInventoryValue.toLocaleString()}` : '••••••'}
          </div>
          <span className="text-[11px] text-stone-400">
            {isAdmin ? 'at cost basis' : 'Admin access required'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Low Stock Variants</span>
          <div className="text-2xl font-bold font-mono-numbers text-amber-600 mt-1">
            {kpis.lowStockCount}
          </div>
          <span className="text-[11px] text-stone-400">≤ minimum threshold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Out of Stock Variants</span>
          <div className="text-2xl font-bold font-mono-numbers text-rose-600 mt-1">
            {kpis.outOfStockCount}
          </div>
          <span className="text-[11px] text-stone-400">zero units available</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code (GD001), dress name, size (100), color (Pink)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white"
            >
              <option value="all">All Dress Types</option>
              {dressTypes.map((dt) => (
                <option key={dt.DressTypeID} value={dt.Name}>
                  {dt.Name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white"
            >
              <option value="all">All Colors</option>
              {colors.map((c) => (
                <option key={c.ColorID} value={c.ColorName}>
                  {c.ColorName}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white font-medium"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock Alert</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 flex justify-between pt-1">
          <span>Showing {filteredVariants.length} inventory variants</span>
          <span className="font-mono-numbers">
            Sum Units: {filteredVariants.reduce((s, v) => s + v.currentStock, 0)}
          </span>
        </div>
      </div>

      {/* Main Inventory Ledger Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
              <tr>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Size (Ordered by Number)</th>
                <th className="py-3 px-3">Color</th>
                {isAdmin && <th className="py-3 px-3 text-right">Actual Cost</th>}
                <th className="py-3 px-3 text-right">Selling Price</th>
                {isAdmin && <th className="py-3 px-3 text-right">Profit Margin</th>}
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Min Alert</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredVariants.map((item) => {
                const profit = item.sellingPrice - item.actualPrice;
                const marginPct = item.actualPrice > 0 ? (profit / item.actualPrice) * 100 : 0;
                const isOut = item.currentStock === 0;
                const isLow = item.currentStock <= item.minimumStock && !isOut;

                return (
                  <tr key={item.variantId} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-900">
                      {item.productCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900">{item.productName}</div>
                      <div className="text-[10px] text-stone-400">{item.dressTypeName}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono-numbers font-semibold text-stone-800">
                      {item.size}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-stone-800">{item.color}</span>
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-right font-mono-numbers text-stone-600">
                        ${item.actualPrice.toFixed(2)}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-stone-900">
                      ${item.sellingPrice.toFixed(2)}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-right font-mono-numbers">
                        <span className="text-emerald-700 font-medium">
                          +${profit.toFixed(2)}
                        </span>
                        <span className="text-stone-400 text-[10px] ml-1">
                          ({marginPct.toFixed(0)}%)
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-mono-numbers font-bold px-2 py-0.5 rounded ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono-numbers text-stone-400">
                      {item.minimumStock}
                    </td>
                    <td className="py-2.5 px-3">
                      {isOut ? (
                        <span className="text-rose-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Out
                        </span>
                      ) : isLow ? (
                        <span className="text-amber-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenRestock(item.productCode, item.size, item.color)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-0.5"
                          title="Stock IN"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>+IN</span>
                        </button>
                        <button
                          onClick={() => onOpenIssue(item.productCode, item.size, item.color)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold transition-colors flex items-center gap-0.5"
                          title="Stock OUT"
                        >
                          <ArrowUpFromLine className="w-3 h-3" />
                          <span>-OUT</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
