import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { EditOrderModal } from '../orders/EditOrderModal';
import { Printer, X, CheckCircle2, Edit2 } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { activeReceiptOrder, setActiveReceiptOrder, settings, isAdmin } = useStore();
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);

  if (!activeReceiptOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(activeReceiptOrder.OrderDate).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-stone-900">Sale Receipt</span>
          </div>
          <button
            onClick={() => setActiveReceiptOrder(null)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable thermal receipt layout */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-50/50">
          <div
            id="printable-receipt"
            className="bg-white p-6 border border-stone-200 rounded-lg shadow-xs text-stone-900 text-sm mx-auto max-w-sm font-sans"
          >
            {/* Store branding */}
            <div className="text-center pb-4 border-b border-stone-200">
              <h2 className="text-xl font-bold font-display tracking-tight text-stone-900">
                {settings.StoreName}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">{settings.Tagline}</p>
              <p className="text-xs text-stone-600 mt-1">{settings.Address}</p>
              <p className="text-xs text-stone-600">{settings.Phone}</p>
            </div>

            {/* Receipt Meta */}
            <div className="py-3 border-b border-stone-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Order ID:</span>
                <span className="font-mono font-medium">{activeReceiptOrder.OrderID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span className="font-medium">{activeReceiptOrder.CustomerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Cashier:</span>
                <span>{activeReceiptOrder.CreatedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="uppercase text-stone-700 font-medium">
                  {activeReceiptOrder.PaymentMethod}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-stone-200">
              <div className="text-xs font-semibold text-stone-500 grid grid-cols-12 pb-2">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amount</span>
              </div>
              <div className="space-y-2 text-xs">
                {activeReceiptOrder.Items.map((item) => (
                  <div key={item.OrderItemID} className="grid grid-cols-12 items-start">
                    <div className="col-span-6">
                      <div className="font-medium text-stone-900">{item.ProductName}</div>
                      <div className="text-[11px] text-stone-500">
                        {item.ProductCode} · {item.Size} · {item.Color}
                      </div>
                    </div>
                    <div className="col-span-2 text-center font-mono-numbers">
                      {item.Quantity}
                    </div>
                    <div className="col-span-4 text-right font-mono-numbers font-medium">
                      ${item.Subtotal.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Totals */}
            <div className="py-3 border-b border-stone-200 text-xs space-y-1.5 font-mono-numbers">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>${activeReceiptOrder.Subtotal.toFixed(2)}</span>
              </div>
              {activeReceiptOrder.Discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-${activeReceiptOrder.Discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-stone-900 pt-1 border-t border-dashed border-stone-300">
                <span>Total Due</span>
                <span>${activeReceiptOrder.Total.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Message */}
            <div className="pt-4 text-center text-xs text-stone-500 space-y-1">
              <p>{settings.ReceiptFooterMessage}</p>
              <p className="text-[10px] text-stone-400">Inventory automatically synced</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-between gap-3">
          {isAdmin ? (
            <button
              onClick={() => setShowEditOrderModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Receipt / Items</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveReceiptOrder(null)}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Edit Order Modal */}
      {showEditOrderModal && (
        <EditOrderModal
          order={activeReceiptOrder}
          onClose={() => setShowEditOrderModal(false)}
        />
      )}
    </div>
  );
};
