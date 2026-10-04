import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Customer } from '../../types';
import { Users, Search, Plus, Phone, Mail, MapPin, ShoppingBag, X } from 'lucide-react';

export const CustomersView: React.FC<{ onOpenAddCustomer: () => void }> = ({ onOpenAddCustomer }) => {
  const { customers, orders, updateCustomer, setCurrentView } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.CustomerName.toLowerCase().includes(q) ||
        c.Phone.toLowerCase().includes(q) ||
        c.Email.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      (o) =>
        o.CustomerID === selectedCustomer.CustomerID ||
        o.CustomerName.toLowerCase() === selectedCustomer.CustomerName.toLowerCase()
    );
  }, [selectedCustomer, orders]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage client profiles, purchase histories, and contact information
          </p>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => (
          <div
            key={cust.CustomerID}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
                    {cust.CustomerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">{cust.CustomerName}</h3>
                    <span className="text-[11px] text-stone-400">Since {cust.CreatedDate}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(cust)}
                  className="text-xs text-rose-700 hover:text-rose-800 font-semibold"
                >
                  History →
                </button>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-stone-600">
                {cust.Phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{cust.Phone}</span>
                  </div>
                )}
                {cust.Email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{cust.Email}</span>
                  </div>
                )}
                {cust.Address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{cust.Address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono-numbers">
              <div>
                <span className="text-stone-400 block text-[10px]">Total Orders</span>
                <span className="font-bold text-stone-900">{cust.TotalOrders} orders</span>
              </div>
              <div className="text-right">
                <span className="text-stone-400 block text-[10px]">Lifetime Spend</span>
                <span className="font-bold text-rose-700">${cust.TotalSpend.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  {selectedCustomer.CustomerName}'s Orders
                </h3>
                <span className="text-xs text-stone-500 font-mono-numbers">
                  Lifetime Value: ${selectedCustomer.TotalSpend.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {customerOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-400">
                  No orders found for this customer profile.
                </div>
              ) : (
                customerOrders.map((o) => (
                  <div
                    key={o.OrderID}
                    className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-stone-900">{o.OrderID}</span>
                      <span className="font-mono-numbers font-bold text-stone-900">
                        ${o.Total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>{new Date(o.OrderDate).toLocaleDateString()}</span>
                      <span className="capitalize">{o.PaymentMethod}</span>
                    </div>
                    <div className="text-[11px] text-stone-600">
                      {o.Items.map((i) => `${i.Quantity}x ${i.ProductName} (${i.Size}/${i.Color})`).join(', ')}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
