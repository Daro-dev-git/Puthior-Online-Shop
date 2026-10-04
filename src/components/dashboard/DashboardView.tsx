import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  Plus,
  ArrowDownToLine,
  UserPlus,
  ArrowUpRight,
  Shirt,
  Calendar,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const DashboardView: React.FC<{
  onOpenAddProduct: () => void;
  onOpenAddCustomer: () => void;
}> = ({ onOpenAddProduct, onOpenAddCustomer }) => {
  const {
    kpis,
    orders,
    products,
    setCurrentView,
    setSelectedProductId,
    isAdmin,
    getDressTypeName,
  } = useStore();

  const [chartDays, setChartDays] = useState<7 | 14 | 30>(30);
  const [topSellingRange, setTopSellingRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // 30-Day Daily Sales Volume & Trends Dataset from Real Orders
  const thirtyDaySalesTrend = useMemo(() => {
    const list: {
      date: string;
      label: string;
      shortLabel: string;
      unitsSold: number;
      revenue: number;
      ordersCount: number;
    }[] = [];

    const now = new Date();
    // Build array for last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const shortLabel = d.getDate().toString();

      list.push({
        date: dateKey,
        label,
        shortLabel,
        unitsSold: 0,
        revenue: 0,
        ordersCount: 0,
      });
    }

    const dateMap = new Map(list.map((item) => [item.date, item]));

    orders.forEach((o) => {
      const oDate = o.OrderDate.split('T')[0];
      const entry = dateMap.get(oDate);
      if (entry) {
        entry.ordersCount += 1;
        entry.revenue += o.Total;
        entry.unitsSold += o.Items.reduce((acc, item) => acc + item.Quantity, 0);
      }
    });

    return list;
  }, [orders]);

  // Active chart slice based on selected time window
  const activeChartData = useMemo(() => {
    return thirtyDaySalesTrend.slice(-chartDays);
  }, [thirtyDaySalesTrend, chartDays]);

  // 30-Day Aggregated Metrics
  const thirtyDayTotalUnits = useMemo(() => {
    return thirtyDaySalesTrend.reduce((sum, d) => sum + d.unitsSold, 0);
  }, [thirtyDaySalesTrend]);

  const thirtyDayTotalRevenue = useMemo(() => {
    return thirtyDaySalesTrend.reduce((sum, d) => sum + d.revenue, 0);
  }, [thirtyDaySalesTrend]);

  const peakDay = useMemo(() => {
    const sorted = [...thirtyDaySalesTrend].sort((a, b) => b.unitsSold - a.unitsSold);
    return sorted[0]?.unitsSold > 0 ? sorted[0] : null;
  }, [thirtyDaySalesTrend]);

  const avgDailyUnits = (thirtyDayTotalUnits / 30).toFixed(1);

  // Aggregated Sales by Dress Type
  const salesByDressType = useMemo(() => {
    const typeMap: Record<string, { name: string; count: number; revenue: number }> = {};

    orders.forEach((o) => {
      o.Items.forEach((item) => {
        const prod = products.find((p) => p.ProductCode === item.ProductCode);
        const typeName = prod ? getDressTypeName(prod.DressTypeID) : 'Girl Dress';
        if (!typeMap[typeName]) {
          typeMap[typeName] = { name: typeName, count: 0, revenue: 0 };
        }
        typeMap[typeName].count += item.Quantity;
        typeMap[typeName].revenue += item.Subtotal;
      });
    });

    return Object.values(typeMap).sort((a, b) => b.revenue - a.revenue);
  }, [orders, products, getDressTypeName]);

  // Top Selling Products
  const topSellingProducts = useMemo(() => {
    const map: Record<
      string,
      {
        code: string;
        name: string;
        image: string;
        units: number;
        revenue: number;
        profit: number;
        dressType: string;
      }
    > = {};

    orders.forEach((o) => {
      o.Items.forEach((item) => {
        const prod = products.find((p) => p.ProductCode === item.ProductCode);
        const dressType = prod ? getDressTypeName(prod.DressTypeID) : 'Dress';
        const img = item.ProductImage || prod?.Images[0]?.ImageURL || '';

        if (!map[item.ProductCode]) {
          map[item.ProductCode] = {
            code: item.ProductCode,
            name: item.ProductName,
            image: img,
            units: 0,
            revenue: 0,
            profit: 0,
            dressType,
          };
        }
        map[item.ProductCode].units += item.Quantity;
        map[item.ProductCode].revenue += item.Subtotal;
        map[item.ProductCode].profit += item.Profit;
      });
    });

    return Object.values(map).sort((a, b) => b.units - a.units);
  }, [orders, products, getDressTypeName]);

  // Top Selling Sizes
  const topSellingSizes = useMemo(() => {
    const sizeMap: Record<string, number> = {};
    orders.forEach((o) => {
      o.Items.forEach((item) => {
        sizeMap[item.Size] = (sizeMap[item.Size] || 0) + item.Quantity;
      });
    });
    return Object.entries(sizeMap)
      .map(([size, units]) => ({ size, units }))
      .sort((a, b) => b.units - a.units);
  }, [orders]);

  // Top Selling Colors
  const topSellingColors = useMemo(() => {
    const colorMap: Record<string, number> = {};
    orders.forEach((o) => {
      o.Items.forEach((item) => {
        colorMap[item.Color] = (colorMap[item.Color] || 0) + item.Quantity;
      });
    });
    return Object.entries(colorMap)
      .map(([color, units]) => ({ color, units }))
      .sort((a, b) => b.units - a.units);
  }, [orders]);

  // Low Stock Variants
  const lowStockItems = useMemo(() => {
    const list: {
      productId: string;
      code: string;
      name: string;
      size: string;
      color: string;
      currentStock: number;
      minStock: number;
      actualPrice: number;
      sellingPrice: number;
    }[] = [];

    products.forEach((p) => {
      p.Variants.forEach((v) => {
        if (v.CurrentStock <= v.MinimumStock) {
          list.push({
            productId: p.ProductID,
            code: p.ProductCode,
            name: p.ProductName,
            size: v.Size,
            color: v.Color,
            currentStock: v.CurrentStock,
            minStock: v.MinimumStock,
            actualPrice: v.ActualPrice,
            sellingPrice: v.SellingPrice,
          });
        }
      });
    });

    return list.sort((a, b) => a.currentStock - b.currentStock);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Title & Store Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-stone-900 tracking-tight">
            Girl Dress Shop
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Store Performance, 30-Day Sales Trend & Real-Time Inventory
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentView('pos')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ New Sale</span>
          </button>
          <button
            onClick={() => setCurrentView('inventory-in')}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Stock IN</span>
          </button>
          {isAdmin && (
            <button
              onClick={onOpenAddProduct}
              className="px-3 py-2 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Product</span>
            </button>
          )}
          <button
            onClick={onOpenAddCustomer}
            className="px-3 py-2 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Customer</span>
          </button>
          <button
            onClick={() => setCurrentView('inventory')}
            className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            View Inventory
          </button>
          <button
            onClick={() => setCurrentView('reports')}
            className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            View Reports
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-stone-900">
            ${kpis.todayRevenue.toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
            <span className="text-emerald-700 font-medium">+{kpis.todayOrders} orders</span>
            <span>·</span>
            <span className="font-mono-numbers">{kpis.todayItemsSold} dresses</span>
          </div>
        </div>

        {/* Today's Profit (Admin Protected) */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Today's Profit</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-stone-900">
            {isAdmin ? `$${kpis.todayProfit.toFixed(2)}` : '••••••'}
          </div>
          <div className="mt-2 text-xs text-stone-500">
            {isAdmin ? (
              <span>
                Margin:{' '}
                <strong className="text-stone-800 font-mono-numbers">
                  {kpis.todayCost > 0
                    ? `${((kpis.todayProfit / kpis.todayCost) * 100).toFixed(1)}%`
                    : '42.5%'}
                </strong>
              </span>
            ) : (
              <span className="text-stone-400 italic">Admin role required</span>
            )}
          </div>
        </div>

        {/* Total Inventory Units */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Stock in Inventory</span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-stone-900">
            {kpis.totalStockUnits}
          </div>
          <div className="mt-2 text-xs text-stone-500 flex items-center gap-1.5">
            <span>Across {kpis.totalVariants} variants</span>
            <span>·</span>
            <span className="font-medium text-stone-700">{kpis.totalProducts} models</span>
          </div>
        </div>

        {/* Low Stock & Out of Stock */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Low Stock / Out</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono-numbers text-amber-600">
              {kpis.lowStockCount}
            </span>
            <span className="text-xs text-stone-400 font-mono-numbers">
              / {kpis.outOfStockCount} zero stock
            </span>
          </div>
          <div className="mt-2 text-xs text-stone-500">
            {isAdmin && (
              <span>
                Valuation: <strong className="font-mono-numbers">${kpis.totalInventoryValue.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RECHARTS 30-DAY DAILY SALES VOLUME & TRENDS SECTION */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-stone-900">
                Daily Sales Volume & Shopping Trends (Last 30 Days)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Interactive Recharts line visualization of daily dresses sold and sales revenue trends
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 bg-stone-100 rounded-lg text-xs">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setChartDays(days)}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    chartDays === days
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Last {days} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shopping Trend Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">30-Day Total Units</div>
            <div className="text-lg font-bold font-mono-numbers text-rose-900 mt-0.5">
              {thirtyDayTotalUnits} dresses
            </div>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">30-Day Revenue</div>
            <div className="text-lg font-bold font-mono-numbers text-emerald-800 mt-0.5">
              ${thirtyDayTotalRevenue.toFixed(2)}
            </div>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">Daily Average Sold</div>
            <div className="text-lg font-bold font-mono-numbers text-stone-800 mt-0.5">
              {avgDailyUnits} units / day
            </div>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
            <div className="text-[11px] text-stone-500 font-medium">Peak Shopping Day</div>
            <div className="text-lg font-bold font-mono-numbers text-stone-800 mt-0.5 truncate">
              {peakDay ? `${peakDay.label} (${peakDay.unitsSold} units)` : 'No sales yet'}
            </div>
          </div>
        </div>

        {/* Recharts Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E11D48" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval={chartDays === 30 ? 3 : chartDays === 14 ? 1 : 0}
              />
              <YAxis
                yAxisId="units"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-stone-900/95 text-white p-3 rounded-xl shadow-xl border border-stone-700 text-xs space-y-1.5 backdrop-blur-md">
                        <div className="font-bold text-stone-200 border-b border-stone-700 pb-1 flex items-center justify-between gap-4">
                          <span>{data.label}</span>
                          <span className="text-[10px] text-stone-400 font-mono font-normal">
                            {data.ordersCount} order{data.ordersCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-rose-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Units Sold:</span>
                          </span>
                          <span className="font-mono-numbers font-bold text-white">
                            {data.unitsSold} dresses
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-emerald-400">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Revenue:</span>
                          </span>
                          <span className="font-mono-numbers font-bold text-white">
                            ${data.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />
              <Area
                yAxisId="units"
                type="monotone"
                dataKey="unitsSold"
                name="Daily Sales Volume (Units)"
                stroke="#E11D48"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#unitsGradient)"
                activeDot={{ r: 6, fill: '#E11D48', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Daily Revenue ($)"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Sales by Dress Type & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-stone-900">Top Selling Products</h3>
              <p className="text-xs text-stone-500">Ranked by volume of girl dresses sold</p>
            </div>
            <div className="flex items-center p-0.5 bg-stone-100 rounded-lg text-xs">
              {(['today', 'week', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopSellingRange(t)}
                  className={`px-2 py-1 rounded-md capitalize font-medium cursor-pointer ${
                    topSellingRange === t ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400">
                  <th className="py-2.5 font-semibold">Rank</th>
                  <th className="py-2.5 font-semibold">Product</th>
                  <th className="py-2.5 font-semibold">Dress Type</th>
                  <th className="py-2.5 font-semibold text-center">Units Sold</th>
                  <th className="py-2.5 font-semibold text-right">Revenue</th>
                  {isAdmin && <th className="py-2.5 font-semibold text-right">Profit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topSellingProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      No sales recorded yet. Process a checkout in the POS to see top rankings.
                    </td>
                  </tr>
                ) : (
                  topSellingProducts.slice(0, 5).map((item, idx) => (
                    <tr key={item.code} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-2.5 font-mono-numbers font-medium text-stone-500">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-md bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-400">
                                <Shirt className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-stone-900">{item.name}</div>
                            <div className="text-[11px] font-mono text-stone-500">{item.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-stone-600">{item.dressType}</td>
                      <td className="py-2.5 text-center font-mono-numbers font-semibold text-stone-900">
                        {item.units}
                      </td>
                      <td className="py-2.5 text-right font-mono-numbers font-medium text-stone-900">
                        ${item.revenue.toFixed(2)}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 text-right font-mono-numbers text-emerald-700 font-semibold">
                          +${item.profit.toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales by Dress Type Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900 mb-1">Sales by Dress Type</h3>
            <p className="text-xs text-stone-500 mb-4">Distribution by clothing category</p>

            {salesByDressType.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                No categorized sales data yet
              </div>
            ) : (
              <div className="space-y-3">
                {salesByDressType.slice(0, 5).map((cat, idx) => {
                  const maxRev = salesByDressType[0]?.revenue || 1;
                  const widthPct = Math.round((cat.revenue / maxRev) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-800">{cat.name}</span>
                        <span className="font-mono-numbers font-semibold text-stone-900">
                          ${cat.revenue.toFixed(2)} ({cat.count} sold)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-xs">
            <span className="text-stone-500">Categories tracked: {salesByDressType.length}</span>
            {isAdmin && (
              <button
                onClick={() => setCurrentView('categories')}
                className="text-rose-700 hover:text-rose-800 font-medium cursor-pointer"
              >
                Manage Types →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Top Sizes & Top Colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Sizes */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider mb-3">
            Top Selling Sizes
          </h4>
          {topSellingSizes.length === 0 ? (
            <div className="py-4 text-center text-stone-400 text-xs">No size sales data yet</div>
          ) : (
            <div className="space-y-2">
              {topSellingSizes.slice(0, 5).map((s, idx) => (
                <div key={s.size} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-stone-400 font-mono-numbers">0{idx + 1}.</span>
                    <span className="font-medium text-stone-800">Size {s.size}</span>
                  </div>
                  <span className="font-mono-numbers font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                    {s.units} units sold
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Colors */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs">
          <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider mb-3">
            Top Selling Colors
          </h4>
          {topSellingColors.length === 0 ? (
            <div className="py-4 text-center text-stone-400 text-xs">No color sales data yet</div>
          ) : (
            <div className="space-y-2">
              {topSellingColors.slice(0, 5).map((c, idx) => (
                <div key={c.color} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-stone-400 font-mono-numbers">0{idx + 1}.</span>
                    <span className="font-medium text-stone-800">{c.color}</span>
                  </div>
                  <span className="font-mono-numbers font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                    {c.units} units sold
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Low Stock Warnings Alert Section */}
      {lowStockItems.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-semibold text-stone-900">
                Low Stock & Restock Alert ({lowStockItems.length} Variants)
              </h3>
            </div>
            <button
              onClick={() => setCurrentView('inventory-in')}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 cursor-pointer"
            >
              Go to Inventory IN →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400">
                  <th className="py-2 font-semibold">Product</th>
                  <th className="py-2 font-semibold">Code</th>
                  <th className="py-2 font-semibold">Size</th>
                  <th className="py-2 font-semibold">Color</th>
                  <th className="py-2 font-semibold text-center">Current Stock</th>
                  <th className="py-2 font-semibold text-center">Min Threshold</th>
                  <th className="py-2 font-semibold text-right">Selling Price</th>
                  <th className="py-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lowStockItems.slice(0, 6).map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-2 font-medium text-stone-900">{item.name}</td>
                    <td className="py-2 font-mono text-stone-600">{item.code}</td>
                    <td className="py-2 font-semibold text-stone-800">{item.size}</td>
                    <td className="py-2 text-stone-700">{item.color}</td>
                    <td className="py-2 text-center font-mono-numbers font-bold text-amber-600">
                      {item.currentStock}
                    </td>
                    <td className="py-2 text-center font-mono-numbers text-stone-500">
                      {item.minStock}
                    </td>
                    <td className="py-2 text-right font-mono-numbers">${item.sellingPrice.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setCurrentView('inventory-in')}
                        className="px-2.5 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors cursor-pointer"
                      >
                        Restock
                      </button>
                    </td>
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
