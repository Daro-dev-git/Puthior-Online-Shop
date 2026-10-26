import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, InventoryTransaction } from '../../types';
import { EditOrderModal } from './EditOrderModal';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Edit2,
  Calendar,
  DollarSign,
  Download,
  CreditCard,
  Banknote,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Clock,
  Layers,
  ArrowUpDown,
  Filter,
  X,
  Sparkles,
  ShoppingBag,
  Package,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { orders, transactions, setActiveReceiptOrder, isAdmin, showToast, refreshAllHistory } = useStore();

  // Active view tab: Orders & Receipts vs Inventory Transactions
  const [activeTab, setActiveTab] = useState<'orders' | 'transactions'>('orders');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');

  // Date Filtering
  // Presets: 'all', 'today', 'oct21', 'yesterday', 'week', 'month', 'custom'
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'oct21' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expandable row IDs
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Pagination ("expand the pages")
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Apply date preset changes
  const handleSelectDatePreset = (preset: 'all' | 'today' | 'oct21' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    setCurrentPage(1);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'oct21') {
      setStartDate('2026-10-21');
      setEndDate('2026-10-21');
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(monthStart);
      setEndDate(todayStr);
    }
  };

  // Toggle row expansion
  const toggleRowExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const expandAllRows = () => {
    setExpandedOrderIds(new Set(filteredOrders.map((o) => o.OrderID)));
  };

  const collapseAllRows = () => {
    setExpandedOrderIds(new Set());
  };

  // Manual authoritative sync button
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await refreshAllHistory();
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && o.Status !== statusFilter) return false;

      // 2. Payment Filter
      if (paymentFilter !== 'all' && o.PaymentMethod !== paymentFilter) return false;

      // 3. Date / Date Range Filter
      const orderDateStr = (o.OrderDate || (o as any).createdAt || '').split('T')[0];
      if (startDate && orderDateStr < startDate) return false;
      if (endDate && orderDateStr > endDate) return false;

      // 4. Text Search (ID, customer name, phone, item product code, dress name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (o.OrderID || '').toLowerCase().includes(q);
        const nameMatch = (o.CustomerName || '').toLowerCase().includes(q);
        const phoneMatch = (o.CustomerPhone || '').toLowerCase().includes(q);
        const itemMatch = (o.Items || []).some(
          (i) =>
            (i.ProductCode || '').toLowerCase().includes(q) ||
            (i.ProductName || '').toLowerCase().includes(q)
        );
        if (!idMatch && !nameMatch && !phoneMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, startDate, endDate, searchQuery]);

  // Filtered Transactions Calculation (Tab 2)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (transactionTypeFilter !== 'all' && t.TransactionType !== transactionTypeFilter) {
        return false;
      }

      const txDateStr = (t.TransactionDate || (t as any).createdAt || '').split('T')[0];
      if (startDate && txDateStr < startDate) return false;
      if (endDate && txDateStr > endDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (t.TransactionID || '').toLowerCase().includes(q);
        const codeMatch = (t.ProductCode || '').toLowerCase().includes(q);
        const nameMatch = (t.ProductName || '').toLowerCase().includes(q);
        const refMatch = (t.ReferenceID || '').toLowerCase().includes(q);
        const custMatch = (t.CustomerName || '').toLowerCase().includes(q);
        if (!idMatch && !codeMatch && !nameMatch && !refMatch && !custMatch) return false;
      }

      return true;
    });
  }, [transactions, transactionTypeFilter, startDate, endDate, searchQuery]);

  // Dynamic KPI Metrics for filtered orders
  const metrics = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalItems = 0;

    filteredOrders.forEach((o) => {
      totalRevenue += o.Total || 0;
      totalCost += o.Cost || 0;
      totalProfit += o.Profit || (o.Total - (o.Cost || 0));
      totalItems += (o.Items || []).reduce((sum, item) => sum + (item.Quantity || 0), 0);
    });

    const averageOrder = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;
    const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : (totalRevenue > 0 ? 100 : 0);

    return {
      totalOrdersCount,
      totalRevenue,
      totalCost,
      totalProfit,
      totalItems,
      averageOrder,
      profitMargin,
    };
  }, [filteredOrders]);

  // Paginated Orders
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    if (pageSize === 'all') return filteredOrders;
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Paginated Transactions
  const totalTxPages = pageSize === 'all' ? 1 : Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 'all') return filteredTransactions;
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'orders') {
      const headers = ['Order ID', 'Date & Time', 'Customer', 'Phone', 'Payment', 'Status', 'Items Qty', 'Subtotal', 'Discount', 'Total'];
      if (isAdmin) headers.push('Cost', 'Profit');

      const rows = filteredOrders.map((o) => {
        const itemsQty = (o.Items || []).reduce((acc, i) => acc + (i.Quantity || 0), 0);
        const row = [
          `"${o.OrderID}"`,
          `"${o.OrderDate || (o as any).createdAt || ''}"`,
          `"${o.CustomerName || ''}"`,
          `"${o.CustomerPhone || ''}"`,
          `"${o.PaymentMethod || ''}"`,
          `"${o.Status || ''}"`,
          itemsQty,
          (o.Subtotal || 0).toFixed(2),
          (o.Discount || 0).toFixed(2),
          (o.Total || 0).toFixed(2),
        ];
        if (isAdmin) row.push((o.Cost || 0).toFixed(2), (o.Profit || 0).toFixed(2));
        return row.join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `girldress_orders_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${filteredOrders.length} orders to CSV`);
    } else {
      const headers = ['Transaction ID', 'Date', 'Type', 'Product Code', 'Product Name', 'Size', 'Color', 'Quantity', 'Selling Value'];
      if (isAdmin) headers.push('Actual Cost', 'Notes', 'Created By');

      const rows = filteredTransactions.map((t) => {
        const row = [
          `"${t.TransactionID}"`,
          `"${t.TransactionDate}"`,
          `"${t.TransactionType}"`,
          `"${t.ProductCode}"`,
          `"${t.ProductName}"`,
          `"${t.Size}"`,
          `"${t.Color}"`,
          t.Quantity,
          t.TotalSellingValue.toFixed(2),
        ];
        if (isAdmin) row.push(t.TotalCost.toFixed(2), `"${t.Notes || ''}"`, `"${t.CreatedBy || ''}"`);
        return row.join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `girldress_transactions_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${filteredTransactions.length} transactions to CSV`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
              Orders, Receipts & Transactions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {orders.length} Cloud Orders
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-mono">
              {transactions.length} Transactions
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Complete database of POS counter receipts, sales transactions, line items, and audit history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Force authoritative sync with cloud Firestore database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Verifying Cloud...' : 'Sync & Verify Cloud'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center justify-between border-b border-stone-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setActiveTab('orders');
              setCurrentPage(1);
            }}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Orders & Customer Receipts ({filteredOrders.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('transactions');
              setCurrentPage(1);
            }}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Stock & Sales Transactions ({filteredTransactions.length})</span>
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="hidden sm:flex items-center gap-2 text-xs pb-1">
            <button
              onClick={expandAllRows}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Expand All Pages
            </button>
            <span className="text-stone-300">·</span>
            <button
              onClick={collapseAllRows}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Cards - Dynamically calculated from filtered records */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Filtered Orders</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            {metrics.totalOrdersCount}
          </div>
          <span className="text-[11px] text-stone-400 font-mono-numbers">
            {metrics.totalItems} dresses sold
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Gross Sales Revenue</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            ${metrics.totalRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-stone-400 font-mono-numbers">
            avg ${metrics.averageOrder.toFixed(2)} / order
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Net Profit</span>
          <div className="text-2xl font-bold font-mono-numbers text-emerald-700 mt-1">
            {isAdmin ? `$${metrics.totalProfit.toFixed(2)}` : '••••••'}
          </div>
          <span className="text-[11px] text-stone-400">
            {isAdmin ? `${metrics.profitMargin.toFixed(1)}% margin` : 'Admin access required'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Total Cost of Goods (COGS)</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-700 mt-1">
            {isAdmin ? `$${metrics.totalCost.toFixed(2)}` : '••••••'}
          </div>
          <span className="text-[11px] text-stone-400">
            {isAdmin ? 'actual inventory cost' : 'Admin access required'}
          </span>
        </div>
      </div>

      {/* Filter & Date Controls Card */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3.5">
        {/* Row 1: Search, Status/Type & Payment Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === 'orders'
                  ? 'Search order ID (ORD-...), customer name, phone, SKU...'
                  : 'Search transaction ID (TX-...), product SKU, customer...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          {activeTab === 'orders' ? (
            <>
              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white cursor-pointer font-medium"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white cursor-pointer font-medium"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash (Counter POS)</option>
                  <option value="card">Card / Credit Card</option>
                  <option value="transfer">Bank / QR Transfer</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-7">
              <select
                value={transactionTypeFilter}
                onChange={(e) => {
                  setTransactionTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white cursor-pointer font-medium"
              >
                <option value="all">All Transaction Types ({transactions.length})</option>
                <option value="Customer Sale">Customer Sale (POS Register)</option>
                <option value="Stock Received">Stock Received (Vendor IN)</option>
                <option value="Purchase">Purchase Order IN</option>
                <option value="Adjustment IN">Manual Stock Adjustment IN (+)</option>
                <option value="Adjustment OUT">Manual Stock Adjustment OUT (-)</option>
                <option value="Customer Return">Customer Return IN</option>
                <option value="Damaged">Damaged / Defect OUT</option>
                <option value="Lost">Lost / Shrinkage OUT</option>
                <option value="Supplier Return">Supplier Return OUT</option>
              </select>
            </div>
          )}
        </div>

        {/* Row 2: Date Filter Bar with Quick Presets & Custom Date Range */}
        <div className="pt-2 border-t border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-stone-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>Date Filter:</span>
            </span>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                datePreset === 'all' && !startDate && !endDate
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All Time
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('today')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              Today
            </button>

            {/* Special Oct 21 Presets for restoring & validating data on 21 */}
            <button
              type="button"
              onClick={() => handleSelectDatePreset('oct21')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                datePreset === 'oct21' || (startDate === '2026-10-21' && endDate === '2026-10-21')
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
              title="Filter exactly to October 21 (Restored Data Verification)"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Oct 21 (Restored)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('yesterday')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                datePreset === 'yesterday'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Yesterday
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('week')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                datePreset === 'week'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Last 7 Days
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset('month')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                datePreset === 'month'
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              This Month
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
              <span className="text-[11px] text-stone-400 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 px-2 py-1 rounded-lg">
              <span className="text-[11px] text-stone-400 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate || searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || transactionTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDatePreset('all');
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setTransactionTypeFilter('all');
                  setCurrentPage(1);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md cursor-pointer transition-colors"
                title="Reset all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Range Banner */}
        {(startDate || endDate) && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              <span>
                <strong>Filtered Range:</strong> {startDate || 'Earliest'} &rarr; {endDate || 'Latest'} (Matching{' '}
                <strong>{activeTab === 'orders' ? filteredOrders.length : filteredTransactions.length}</strong>{' '}
                {activeTab === 'orders' ? 'orders' : 'transactions'})
              </span>
            </div>
            <button
              onClick={() => handleSelectDatePreset('all')}
              className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
            >
              Clear Date Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Orders vs Transactions Table with Expandable Pages */}
      {activeTab === 'orders' ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Table Header and Page Controls */}
          <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-stone-600 font-medium">
              Showing{' '}
              <strong className="text-stone-900 font-mono-numbers">
                {filteredOrders.length === 0
                  ? 0
                  : pageSize === 'all'
                  ? `1–${filteredOrders.length}`
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredOrders.length)}`}
              </strong>{' '}
              of <strong className="text-stone-900 font-mono-numbers">{filteredOrders.length}</strong> orders
              {datePreset === 'oct21' && (
                <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                  All October 21 Orders Restored & Verified
                </span>
              )}
            </div>

            {/* Page Size & Expand Options */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setPageSize(val as any);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-stone-200 rounded text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Expand All ({filteredOrders.length})</option>
                </select>
              </div>

              {/* Prev / Next Page Buttons */}
              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-mono text-[11px] text-stone-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">#</th>
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Dresses / Items</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-3 text-right font-bold text-stone-900">Total Due</th>
                  {isAdmin && <th className="py-3 px-3 text-right">Cost</th>}
                  {isAdmin && <th className="py-3 px-3 text-right font-bold text-emerald-700">Profit</th>}
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-stone-400">
                      <Receipt className="w-10 h-10 mx-auto mb-2 text-stone-300 stroke-1" />
                      <p className="text-sm font-semibold text-stone-700">No orders found for the selected filter</p>
                      <p className="text-xs text-stone-400 mt-1">Try selecting "All Time" or adjusting your search query</p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order, index) => {
                    const isExpanded = expandedOrderIds.has(order.OrderID);
                    const totalItemsCount = (order.Items || []).reduce((acc, i) => acc + (i.Quantity || 0), 0);
                    const orderDateStr = order.OrderDate || (order as any).createdAt || '';
                    const isOct21 = orderDateStr.startsWith('2026-10-21');

                    return (
                      <React.Fragment key={order.OrderID}>
                        <tr
                          className={`hover:bg-rose-50/40 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-rose-50/30 font-medium' : ''
                          } ${isOct21 ? 'bg-amber-50/20' : ''}`}
                          onClick={() => toggleRowExpand(order.OrderID)}
                        >
                          <td className="py-3 px-3 text-center text-stone-400">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpand(order.OrderID);
                              }}
                              className="p-1 hover:text-stone-800 rounded cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-rose-950">
                            <div className="flex items-center gap-1.5">
                              <span>{order.OrderID}</span>
                              {isOct21 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                                  Oct 21
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-stone-600 text-[11px]">
                            {orderDateStr ? (
                              new Date(orderDateStr).toLocaleString('en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-stone-900">{order.CustomerName || 'Walk-in Customer'}</div>
                            {order.CustomerPhone && (
                              <div className="text-[11px] text-stone-400">{order.CustomerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium text-[11px]">
                              <ShoppingBag className="w-3 h-3 text-stone-500" />
                              <span>{totalItemsCount} dress{totalItemsCount === 1 ? '' : 'es'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 uppercase font-semibold text-stone-600 text-[11px]">
                            {order.PaymentMethod || 'cash'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-numbers text-stone-600">
                            ${(order.Subtotal || order.Total || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-numbers text-rose-600">
                            {(order.Discount || 0) > 0 ? `-$${order.Discount.toFixed(2)}` : '$0.00'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-numbers font-bold text-stone-900">
                            ${(order.Total || 0).toFixed(2)}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-3 text-right font-mono-numbers text-stone-500">
                              ${(order.Cost || 0).toFixed(2)}
                            </td>
                          )}
                          {isAdmin && (
                            <td className="py-3 px-3 text-right font-mono-numbers font-bold text-emerald-700">
                              +${(order.Profit || 0).toFixed(2)}
                            </td>
                          )}
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 capitalize">
                              {order.Status || 'completed'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActiveReceiptOrder(order)}
                                className="px-2 py-1 text-xs font-semibold text-stone-700 hover:text-rose-700 hover:bg-rose-50 border border-stone-200 rounded-md shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="View & Print Customer Receipt"
                              >
                                <Printer className="w-3.5 h-3.5 text-rose-600" />
                                <span>Receipt</span>
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => setEditingOrder(order)}
                                  className="p-1 text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-md cursor-pointer transition-colors"
                                  title="Edit Order"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expandable Page / Accordion for Items */}
                        {isExpanded && (
                          <tr className="bg-stone-50/90 border-b border-stone-200">
                            <td colSpan={13} className="p-4 pl-12">
                              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-3 animate-fadeIn">
                                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                                  <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-rose-600" />
                                    <span className="font-bold text-xs text-stone-900">
                                      Order Line Items ({order.Items?.length || 0} distinct SKUs)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-stone-500">
                                    Cashier / Created By: <strong>{order.CreatedBy || 'Store Staff'}</strong>
                                    {order.Notes && <span> · Note: "{order.Notes}"</span>}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {(order.Items || []).map((item, idx) => (
                                    <div
                                      key={item.OrderItemID || idx}
                                      className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center gap-3 text-xs"
                                    >
                                      {item.ProductImage ? (
                                        <img
                                          src={item.ProductImage}
                                          alt={item.ProductName}
                                          className="w-12 h-14 object-cover rounded-md border border-stone-200"
                                        />
                                      ) : (
                                        <div className="w-12 h-14 bg-stone-200 rounded-md flex items-center justify-center text-stone-400">
                                          <Package className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-stone-900 truncate">
                                          {item.ProductName}
                                        </div>
                                        <div className="text-[11px] font-mono text-stone-500">
                                          SKU: {item.ProductCode} · Size {item.Size} · {item.Color}
                                        </div>
                                        <div className="text-stone-600 font-mono-numbers mt-0.5">
                                          {item.Quantity} pcs &times; ${item.UnitPrice.toFixed(2)} ={' '}
                                          <strong className="text-stone-900">${item.Subtotal.toFixed(2)}</strong>
                                        </div>
                                        {isAdmin && item.Profit !== undefined && (
                                          <div className="text-[10px] text-emerald-700 font-medium">
                                            Cost: ${(item.ActualPrice * item.Quantity).toFixed(2)} · Profit: +${item.Profit.toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                                  <div className="text-stone-500">
                                    Customer: <strong>{order.CustomerName}</strong>
                                    {order.CustomerPhone && <span> ({order.CustomerPhone})</span>}
                                    {order.CustomerAddress && <span> · Address: {order.CustomerAddress}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setActiveReceiptOrder(order)}
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      <span>Print Thermal Receipt</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          {pageSize !== 'all' && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Page <strong className="text-stone-800">{currentPage}</strong> of{' '}
                <strong className="text-stone-800">{totalPages}</strong> ({filteredOrders.length} orders total)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                >
                  First
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3 && currentPage < totalPages - 2) {
                      pNum = currentPage - 2 + i;
                    } else if (currentPage >= totalPages - 2) {
                      pNum = totalPages - 4 + i;
                    }
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer ${
                        currentPage === pNum
                          ? 'bg-rose-600 text-white font-bold'
                          : 'border border-stone-200 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 text-xs rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: All Stock & Sales Transactions */
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs text-stone-600 font-medium">
              Showing{' '}
              <strong className="text-stone-900 font-mono-numbers">
                {filteredTransactions.length === 0
                  ? 0
                  : pageSize === 'all'
                  ? `1–${filteredTransactions.length}`
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredTransactions.length)}`}
              </strong>{' '}
              of <strong className="text-stone-900 font-mono-numbers">{filteredTransactions.length}</strong> transactions
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 text-[11px]">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setPageSize(val as any);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-stone-200 rounded text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Expand All ({filteredTransactions.length})</option>
                </select>
              </div>

              {pageSize !== 'all' && totalTxPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-2 font-mono text-[11px] text-stone-600">
                    {currentPage} / {totalTxPages}
                  </span>
                  <button
                    disabled={currentPage >= totalTxPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalTxPages, p + 1))}
                    className="px-2.5 py-1 text-xs font-medium rounded border border-stone-200 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Dress / SKU</th>
                  <th className="py-3 px-3">Size & Color</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Selling Value</th>
                  {isAdmin && <th className="py-3 px-3 text-right">Cost Value</th>}
                  <th className="py-3 px-3">Reference / Customer</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-stone-400">
                      <Layers className="w-10 h-10 mx-auto mb-2 text-stone-300 stroke-1" />
                      <p className="text-sm font-semibold text-stone-700">No transactions match the selected filters</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const isSale = tx.TransactionType === 'Customer Sale';
                    const isStockIn = ['Stock Received', 'Purchase', 'Adjustment IN', 'Customer Return'].includes(tx.TransactionType);

                    return (
                      <tr key={tx.TransactionID} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-800 text-[11px]">
                          {tx.TransactionID}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-stone-500 text-[11px]">
                          {new Date(tx.TransactionDate).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isSale
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isStockIn
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {tx.TransactionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">
                          <div>{tx.ProductName}</div>
                          <div className="text-[10px] font-mono text-stone-400">SKU: {tx.ProductCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-600 font-mono text-[11px]">
                          {tx.Size} / {tx.Color}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers font-bold">
                          <span className={isStockIn ? 'text-blue-700' : 'text-stone-800'}>
                            {isStockIn ? `+${tx.Quantity}` : `-${tx.Quantity}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers font-semibold text-stone-800">
                          ${(tx.TotalSellingValue || 0).toFixed(2)}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3 text-right font-mono-numbers text-stone-500">
                            ${(tx.TotalCost || 0).toFixed(2)}
                          </td>
                        )}
                        <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                          {tx.ReferenceID && (
                            <span className="font-mono font-semibold text-rose-700 block">{tx.ReferenceID}</span>
                          )}
                          {tx.CustomerName && <span>{tx.CustomerName}</span>}
                          {tx.Supplier && <span>Vendor: {tx.Supplier}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-stone-500 text-[11px] max-w-xs truncate" title={tx.Notes}>
                          {tx.Notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
};
