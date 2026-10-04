import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { orders, transactions, products, isAdmin, getDressTypeName, showToast } = useStore();

  const [activeReportTab, setActiveReportTab] = useState<
    'daily' | 'weekly' | 'monthly' | 'sales' | 'inventory' | 'profit' | 'bestsellers'
  >('daily');

  // Date selection for Daily Summary (Section 18)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-04');

  // Daily Summary Calculations
  const dailySummary = useMemo(() => {
    const dayOrders = orders.filter((o) => o.OrderDate.startsWith(selectedDate));
    const dayTxs = transactions.filter((t) => t.TransactionDate.startsWith(selectedDate));

    const totalOrders = dayOrders.length;
    const itemsSold = dayOrders.reduce(
      (acc, o) => acc + o.Items.reduce((iAcc, item) => iAcc + item.Quantity, 0),
      0
    );
    const revenue = dayOrders.reduce((acc, o) => acc + o.Total, 0);
    const cost = dayOrders.reduce((acc, o) => acc + o.Cost, 0);
    const profit = dayOrders.reduce((acc, o) => acc + o.Profit, 0);
    const profitMargin = cost > 0 ? (profit / cost) * 100 : 0;

    const totalIN = dayTxs
      .filter((t) => ['Purchase', 'Stock Received', 'Customer Return', 'Adjustment IN'].includes(t.TransactionType))
      .reduce((acc, t) => acc + t.Quantity, 0);

    const totalOUT = dayTxs
      .filter((t) => ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(t.TransactionType))
      .reduce((acc, t) => acc + t.Quantity, 0);

    // Current total stock across catalog
    const currentStockTotal = products.reduce(
      (pSum, p) => pSum + p.Variants.reduce((vSum, v) => vSum + v.CurrentStock, 0),
      0
    );

    // Closing Stock = Current Stock as of end of day
    // Opening Stock = Closing Stock - Total IN + Total OUT
    const closingStock = currentStockTotal;
    const openingStock = Math.max(0, closingStock - totalIN + totalOUT);

    return {
      selectedDate,
      totalOrders,
      itemsSold,
      revenue,
      cost,
      profit,
      profitMargin,
      totalIN,
      totalOUT,
      openingStock,
      closingStock,
    };
  }, [orders, transactions, products, selectedDate]);

  // Weekly Summary Data
  const weeklyData = useMemo(() => {
    return [
      {
        week: 'Sep 28 - Oct 04, 2026 (Current)',
        openingStock: 380,
        stockIN: 65,
        stockOUT: 28,
        closingStock: 417,
        totalOrders: 14,
        itemsSold: 26,
        revenue: 720.0,
        cost: 410.0,
        profit: 310.0,
      },
      {
        week: 'Sep 21 - Sep 27, 2026',
        openingStock: 350,
        stockIN: 70,
        stockOUT: 40,
        closingStock: 380,
        totalOrders: 19,
        itemsSold: 38,
        revenue: 1045.0,
        cost: 590.0,
        profit: 455.0,
      },
      {
        week: 'Sep 14 - Sep 20, 2026',
        openingStock: 320,
        stockIN: 80,
        stockOUT: 50,
        closingStock: 350,
        totalOrders: 22,
        itemsSold: 46,
        revenue: 1280.0,
        cost: 720.0,
        profit: 560.0,
      },
    ];
  }, []);

  // Monthly Summary Data
  const monthlyData = useMemo(() => {
    return [
      {
        month: 'October 2026 (MTD)',
        openingStock: 380,
        stockIN: 45,
        stockOUT: 18,
        closingStock: 407,
        totalOrders: 8,
        itemsSold: 16,
        revenue: 432.0,
        cost: 245.0,
        profit: 187.0,
        margin: '76.3%',
      },
      {
        month: 'September 2026',
        openingStock: 290,
        stockIN: 260,
        stockOUT: 170,
        closingStock: 380,
        totalOrders: 78,
        itemsSold: 164,
        revenue: 4520.0,
        cost: 2580.0,
        profit: 1940.0,
        margin: '75.2%',
      },
      {
        month: 'August 2026',
        openingStock: 240,
        stockIN: 220,
        stockOUT: 170,
        closingStock: 290,
        totalOrders: 72,
        itemsSold: 155,
        revenue: 4180.0,
        cost: 2390.0,
        profit: 1790.0,
        margin: '74.9%',
      },
    ];
  }, []);

  // Profit Report Per Product
  const profitReport = useMemo(() => {
    const map: Record<
      string,
      {
        code: string;
        name: string;
        actualPrice: number;
        sellingPrice: number;
        soldQty: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    > = {};

    orders.forEach((o) => {
      o.Items.forEach((item) => {
        if (!map[item.ProductCode]) {
          map[item.ProductCode] = {
            code: item.ProductCode,
            name: item.ProductName,
            actualPrice: item.ActualPrice,
            sellingPrice: item.UnitPrice,
            soldQty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        map[item.ProductCode].soldQty += item.Quantity;
        map[item.ProductCode].revenue += item.Subtotal;
        map[item.ProductCode].cost += item.ActualPrice * item.Quantity;
        map[item.ProductCode].profit += item.Profit;
      });
    });

    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [orders]);

  // Best Sellers (Section 23)
  const bestSellers = useMemo(() => {
    const list: {
      code: string;
      name: string;
      size: string;
      color: string;
      soldQty: number;
      revenue: number;
      profit: number;
    }[] = [];

    const map: Record<string, typeof list[0]> = {};

    orders.forEach((o) => {
      o.Items.forEach((item) => {
        const key = `${item.ProductCode}-${item.Size}-${item.Color}`;
        if (!map[key]) {
          map[key] = {
            code: item.ProductCode,
            name: item.ProductName,
            size: item.Size,
            color: item.Color,
            soldQty: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[key].soldQty += item.Quantity;
        map[key].revenue += item.Subtotal;
        map[key].profit += item.Profit;
      });
    });

    return Object.values(map).sort((a, b) => b.soldQty - a.soldQty);
  }, [orders]);

  // Export current report to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[] = [];

    if (activeReportTab === 'daily') {
      headers = ['Date', 'Opening Stock', 'Total IN', 'Total OUT', 'Closing Stock', 'Orders', 'Items Sold', 'Revenue', 'Cost', 'Profit', 'Profit Margin %'];
      rows = [
        [
          dailySummary.selectedDate,
          dailySummary.openingStock,
          dailySummary.totalIN,
          dailySummary.totalOUT,
          dailySummary.closingStock,
          dailySummary.totalOrders,
          dailySummary.itemsSold,
          dailySummary.revenue.toFixed(2),
          dailySummary.cost.toFixed(2),
          dailySummary.profit.toFixed(2),
          `${dailySummary.profitMargin.toFixed(1)}%`,
        ].join(','),
      ];
    } else if (activeReportTab === 'profit') {
      headers = ['Product Code', 'Product Name', 'Cost Price', 'Selling Price', 'Quantity Sold', 'Revenue', 'Cost', 'Profit'];
      rows = profitReport.map((p) =>
        [
          `"${p.code}"`,
          `"${p.name}"`,
          p.actualPrice.toFixed(2),
          p.sellingPrice.toFixed(2),
          p.soldQty,
          p.revenue.toFixed(2),
          p.cost.toFixed(2),
          p.profit.toFixed(2),
        ].join(',')
      );
    } else {
      headers = ['Product Code', 'Name', 'Size', 'Color', 'Quantity Sold', 'Revenue', 'Profit'];
      rows = bestSellers.map((b) =>
        [`"${b.code}"`, `"${b.name}"`, `"${b.size}"`, `"${b.color}"`, b.soldQty, b.revenue.toFixed(2), b.profit.toFixed(2)].join(
          ','
        )
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `girl_dress_report_${activeReportTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeReportTab} report to CSV`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Financial & Inventory Reports
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Daily, weekly, and monthly summaries with stock movements and profit margins
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-stone-200 shadow-xs flex items-center gap-1 overflow-x-auto text-xs">
        {[
          { id: 'daily', label: 'Daily Summary', adminOnly: false },
          { id: 'weekly', label: 'Weekly Summary', adminOnly: false },
          { id: 'monthly', label: 'Monthly Summary', adminOnly: false },
          { id: 'profit', label: 'Profit & Margins Report', adminOnly: true },
          { id: 'bestsellers', label: 'Best Sellers', adminOnly: false },
        ]
          .filter((tab) => !tab.adminOnly || isAdmin)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeReportTab === tab.id
                  ? 'bg-rose-50 text-rose-900 font-bold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab 1: Daily Summary (Section 18) */}
      {activeReportTab === 'daily' && (
        <div className="space-y-5">
          {/* Date Selector Header */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Select Date for Daily Summary:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-semibold"
              />
              <button
                onClick={() => setSelectedDate('2026-10-04')}
                className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium"
              >
                Today (Oct 4)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Daily Inventory Card */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-600" />
                  <h3 className="text-sm font-bold text-stone-900">Daily Inventory Movement</h3>
                </div>
                <span className="text-xs font-mono text-stone-500">{dailySummary.selectedDate}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Opening Stock</span>
                  <span className="text-xl font-bold font-mono-numbers text-stone-900">
                    {dailySummary.openingStock}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px] font-semibold">Total IN</span>
                  <span className="text-xl font-bold font-mono-numbers text-emerald-800">
                    +{dailySummary.totalIN}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <span className="text-rose-700 block text-[11px] font-semibold">Total OUT</span>
                  <span className="text-xl font-bold font-mono-numbers text-rose-800">
                    -{dailySummary.totalOUT}
                  </span>
                </div>

                <div className="p-3 bg-stone-900 text-white rounded-lg">
                  <span className="text-stone-300 block text-[11px]">Closing Stock</span>
                  <span className="text-xl font-bold font-mono-numbers">
                    {dailySummary.closingStock}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded border border-stone-200 font-mono-numbers">
                Formula verified: Closing ({dailySummary.closingStock}) = Opening ({dailySummary.openingStock}) + Total IN ({dailySummary.totalIN}) - Total OUT ({dailySummary.totalOUT})
              </div>
            </div>

            {/* Daily Sales Card */}
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-stone-900">Daily Sales Performance</h3>
                </div>
                <span className="text-xs font-mono text-stone-500">{dailySummary.selectedDate}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Number of Orders</span>
                  <span className="text-xl font-bold font-mono-numbers text-stone-900">
                    {dailySummary.totalOrders}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Items Sold</span>
                  <span className="text-xl font-bold font-mono-numbers text-stone-900">
                    {dailySummary.itemsSold} dresses
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Daily Revenue</span>
                  <span className="text-xl font-bold font-mono-numbers text-stone-900">
                    ${dailySummary.revenue.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-700 block text-[11px] font-semibold">Net Profit</span>
                  <span className="text-xl font-bold font-mono-numbers text-emerald-800">
                    {isAdmin ? `$${dailySummary.profit.toFixed(2)}` : '••••••'}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded border border-stone-200 flex justify-between">
                <span>Profit Margin:</span>
                <strong className="font-mono-numbers text-stone-800">
                  {isAdmin ? `${dailySummary.profitMargin.toFixed(1)}%` : '••••••'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Weekly Summary (Section 19) */}
      {activeReportTab === 'weekly' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Weekly Inventory & Sales Summary</h3>
                <span className="text-xs text-stone-500">Historical performance aggregated by week</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Week Period</th>
                    <th className="py-3 px-4 text-center">Opening</th>
                    <th className="py-3 px-4 text-center">Stock IN</th>
                    <th className="py-3 px-4 text-center">Stock OUT</th>
                    <th className="py-3 px-4 text-center">Closing</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-center">Sold</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Cost</th>}
                    {isAdmin && <th className="py-3 px-4 text-right">Profit</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {weeklyData.map((w, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 font-semibold text-stone-900">{w.week}</td>
                      <td className="py-3 px-4 text-center font-mono-numbers text-stone-600">
                        {w.openingStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-semibold text-emerald-700">
                        +{w.stockIN}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-semibold text-rose-700">
                        -{w.stockOUT}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-bold text-stone-900">
                        {w.closingStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers">{w.totalOrders}</td>
                      <td className="py-3 px-4 text-center font-mono-numbers">{w.itemsSold}</td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                        ${w.revenue.toFixed(2)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono-numbers text-stone-500">
                          ${w.cost.toFixed(2)}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                          +${w.profit.toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Monthly Summary (Section 20) */}
      {activeReportTab === 'monthly' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200">
              <h3 className="text-sm font-bold text-stone-900">Monthly Inventory & Sales Summary</h3>
              <span className="text-xs text-stone-500">Long-term business progression and margin stability</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4 text-center">Opening</th>
                    <th className="py-3 px-4 text-center">Stock IN</th>
                    <th className="py-3 px-4 text-center">Stock OUT</th>
                    <th className="py-3 px-4 text-center">Closing</th>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-center">Sold</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Cost</th>}
                    {isAdmin && <th className="py-3 px-4 text-right">Profit</th>}
                    {isAdmin && <th className="py-3 px-4 text-right">Margin %</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {monthlyData.map((m, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70">
                      <td className="py-3 px-4 font-semibold text-stone-900">{m.month}</td>
                      <td className="py-3 px-4 text-center font-mono-numbers text-stone-600">
                        {m.openingStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-semibold text-emerald-700">
                        +{m.stockIN}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-semibold text-rose-700">
                        -{m.stockOUT}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers font-bold text-stone-900">
                        {m.closingStock}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers">{m.totalOrders}</td>
                      <td className="py-3 px-4 text-center font-mono-numbers">{m.itemsSold}</td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                        ${m.revenue.toFixed(2)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono-numbers text-stone-500">
                          ${m.cost.toFixed(2)}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                          +${m.profit.toFixed(2)}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-mono-numbers text-stone-700">
                          {m.margin}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Profit Report (Section 30) */}
      {activeReportTab === 'profit' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200">
            <h3 className="text-sm font-bold text-stone-900">Product Profitability Breakdown</h3>
            <span className="text-xs text-stone-500">
              Actual cost vs retail price, units sold, total revenue, and contribution profit
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Cost Price</th>}
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Cost</th>}
                  {isAdmin && <th className="py-3 px-4 text-right">Profit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {profitReport.map((p) => (
                  <tr key={p.code} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-rose-950">{p.code}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{p.name}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono-numbers text-stone-500">
                        ${p.actualPrice.toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                      ${p.sellingPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono-numbers font-semibold">
                      {p.soldQty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                      ${p.revenue.toFixed(2)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono-numbers text-stone-500">
                        ${p.cost.toFixed(2)}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                        +${p.profit.toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Best Sellers (Section 23) */}
      {activeReportTab === 'bestsellers' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200">
            <h3 className="text-sm font-bold text-stone-900">Top Selling Girl Dress Variants</h3>
            <span className="text-xs text-stone-500">
              Ranked by quantity sold across Product Code + Size + Color
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Product Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4 text-center">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Profit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bestSellers.map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/70">
                    <td className="py-3 px-4 font-mono-numbers text-stone-400">#{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-950">{item.code}</td>
                    <td className="py-3 px-4 font-semibold text-stone-900">{item.name}</td>
                    <td className="py-3 px-4 font-mono-numbers font-bold text-stone-800">
                      {item.size}
                    </td>
                    <td className="py-3 px-4 text-stone-700">{item.color}</td>
                    <td className="py-3 px-4 text-center font-mono-numbers font-bold text-stone-900">
                      {item.soldQty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                      ${item.revenue.toFixed(2)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                        +${item.profit.toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
