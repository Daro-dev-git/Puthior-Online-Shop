import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Calendar,
  DollarSign,
  Download,
  CreditCard,
  Banknote,
  Truck,
  CheckCircle2,
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { orders, setActiveReceiptOrder, isAdmin, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.Status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = o.OrderID.toLowerCase().includes(q);
        const nameMatch = o.CustomerName.toLowerCase().includes(q);
        const phoneMatch = o.CustomerPhone?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + o.Total, 0);
  }, [filteredOrders]);

  const totalProfit = useMemo(() => {
    return filteredOrders.reduce((acc, o) => acc + o.Profit, 0);
  }, [filteredOrders]);

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'Payment', 'Status', 'Subtotal', 'Discount', 'Total'];
    if (isAdmin) headers.push('Cost', 'Profit');

    const rows = filteredOrders.map((o) => {
      const row = [
        `"${o.OrderID}"`,
        `"${o.OrderDate}"`,
        `"${o.CustomerName}"`,
        `"${o.CustomerPhone || ''}"`,
        `"${o.PaymentMethod}"`,
        `"${o.Status}"`,
        o.Subtotal.toFixed(2),
        o.Discount.toFixed(2),
        o.Total.toFixed(2),
      ];
      if (isAdmin) row.push(o.Cost.toFixed(2), o.Profit.toFixed(2));
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `girl_dress_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported orders to CSV');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Orders & Sales History
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Complete record of POS register transactions, walk-in sales, and customer purchases
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Orders CSV</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Total Filtered Orders</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            {filteredOrders.length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Gross Revenue</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            ${totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Net Profit</span>
          <div className="text-2xl font-bold font-mono-numbers text-emerald-700 mt-1">
            {isAdmin ? `$${totalProfit.toFixed(2)}` : '••••••'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">Average Order Value</span>
          <div className="text-2xl font-bold font-mono-numbers text-stone-900 mt-1">
            ${filteredOrders.length > 0 ? (totalRevenue / filteredOrders.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order ID (ORD-2026...), customer name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg text-xs">
          {(['all', 'completed', 'pending', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md capitalize font-medium transition-all ${
                statusFilter === st ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Total Due</th>
                {isAdmin && <th className="py-3 px-4 text-right">Profit</th>}
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.map((order) => {
                const totalItemsCount = order.Items.reduce((acc, i) => acc + i.Quantity, 0);

                return (
                  <tr key={order.OrderID} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-950">
                      {order.OrderID}
                    </td>
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px]">
                      {new Date(order.OrderDate).toLocaleString('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900">{order.CustomerName}</div>
                      {order.CustomerPhone && (
                        <div className="text-[11px] text-stone-400">{order.CustomerPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-stone-700 hover:text-rose-600 font-medium underline flex items-center gap-1"
                      >
                        <span>{totalItemsCount} dresses</span>
                        <Eye className="w-3 h-3 text-stone-400" />
                      </button>
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-stone-600 text-[11px]">
                      {order.PaymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-stone-600">
                      ${order.Subtotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-rose-600">
                      {order.Discount > 0 ? `-$${order.Discount.toFixed(2)}` : '$0.00'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-bold text-stone-900">
                      ${order.Total.toFixed(2)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right font-mono-numbers font-bold text-emerald-700">
                        +${order.Profit.toFixed(2)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 capitalize">
                        {order.Status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActiveReceiptOrder(order)}
                        className="px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-300 rounded-md shadow-2xs inline-flex items-center gap-1"
                        title="View / Print Receipt"
                      >
                        <Printer className="w-3 h-3 text-rose-600" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Item Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  Order Details: {selectedOrder.OrderID}
                </h3>
                <span className="text-[11px] text-stone-500">Customer: {selectedOrder.CustomerName}</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-96 space-y-3">
              {selectedOrder.Items.map((item) => (
                <div
                  key={item.OrderItemID}
                  className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-stone-900">{item.ProductName}</div>
                    <div className="text-[11px] font-mono text-stone-500">
                      {item.ProductCode} · Size {item.Size} · {item.Color}
                    </div>
                    <div className="text-stone-500 text-[11px] font-mono-numbers">
                      {item.Quantity} x ${item.UnitPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right font-mono-numbers">
                    <div className="font-bold text-stone-900">${item.Subtotal.toFixed(2)}</div>
                    {isAdmin && (
                      <div className="text-emerald-700 text-[11px] font-medium">
                        +${item.Profit.toFixed(2)} profit
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-between items-center text-xs">
              <span className="text-stone-500">
                Grand Total: <strong className="text-stone-900 font-mono-numbers">${selectedOrder.Total.toFixed(2)}</strong>
              </span>
              <button
                onClick={() => {
                  setActiveReceiptOrder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Full Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
