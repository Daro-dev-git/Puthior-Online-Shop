import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderItem } from '../../types';
import {
  X,
  Save,
  Trash2,
  Plus,
  AlertCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  CreditCard,
  Package,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ order, onClose }) => {
  const {
    products,
    updateOrder,
    deleteOrder,
    getVariant,
    getAvailableSizesForCode,
    getAvailableColorsForCodeAndSize,
    showToast,
  } = useStore();

  // Basic Order Information
  const [customerName, setCustomerName] = useState(order.CustomerName || 'Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState(order.CustomerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(order.CustomerAddress || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cod' | 'transfer'>(
    order.PaymentMethod || 'cash'
  );
  const [status, setStatus] = useState<'completed' | 'pending' | 'cancelled'>(
    order.Status || 'completed'
  );
  const [discount, setDiscount] = useState<number>(order.Discount || 0);
  const [notes, setNotes] = useState(order.Notes || '');

  // Order Items
  const [items, setItems] = useState<OrderItem[]>(order.Items ? [...order.Items] : []);

  // New Item Adding Drawer
  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductCode, setNewProductCode] = useState(products[0]?.ProductCode || '');
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newQty, setNewQty] = useState<number>(1);
  const [newPrice, setNewPrice] = useState<number>(0);

  // Modal feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Available sizes for currently selected product code in "Add Item" drawer
  const availableSizes = useMemo(() => {
    if (!newProductCode) return [];
    return getAvailableSizesForCode(newProductCode);
  }, [newProductCode, getAvailableSizesForCode]);

  // Available colors for selected size
  const availableColors = useMemo(() => {
    if (!newProductCode || !newSize) return [];
    return getAvailableColorsForCodeAndSize(newProductCode, newSize);
  }, [newProductCode, newSize, getAvailableColorsForCodeAndSize]);

  // Current matched variant in "Add Item" drawer
  const matchedVariant = useMemo(() => {
    if (!newProductCode || !newSize || !newColor) return undefined;
    return getVariant(newProductCode, newSize, newColor);
  }, [newProductCode, newSize, newColor, getVariant]);

  // Auto-set size/color when product code changes in drawer
  React.useEffect(() => {
    if (availableSizes.length > 0 && (!newSize || !availableSizes.includes(newSize))) {
      setNewSize(availableSizes[0]);
    }
  }, [newProductCode, availableSizes, newSize]);

  React.useEffect(() => {
    if (availableColors.length > 0 && (!newColor || !availableColors.includes(newColor))) {
      setNewColor(availableColors[0]);
    }
  }, [newSize, availableColors, newColor]);

  React.useEffect(() => {
    if (matchedVariant) {
      setNewPrice(matchedVariant.SellingPrice);
    }
  }, [matchedVariant]);

  // Live Totals calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
  }, [items]);

  const cost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.ActualPrice * item.Quantity, 0);
  }, [items]);

  const effectiveDiscount = Math.min(discount || 0, subtotal);
  const total = Math.max(0, subtotal - effectiveDiscount);
  const profit = total - cost;

  // Modify Item Quantity
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        Quantity: newQty,
        Subtotal: copy[index].UnitPrice * newQty,
        Profit: (copy[index].UnitPrice - copy[index].ActualPrice) * newQty,
      };
      return copy;
    });
  };

  // Modify Item Price
  const handleUpdateItemPrice = (index: number, price: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        UnitPrice: Math.max(0, price),
        Subtotal: Math.max(0, price) * copy[index].Quantity,
        Profit: (Math.max(0, price) - copy[index].ActualPrice) * copy[index].Quantity,
      };
      return copy;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add Item
  const handleAddItemToOrder = () => {
    if (!matchedVariant) {
      setErrorMsg('Please select a valid size and color.');
      return;
    }

    const prod = products.find((p) => p.ProductCode === newProductCode);
    if (!prod) return;

    const existingIdx = items.findIndex(
      (i) =>
        i.ProductCode.toLowerCase() === newProductCode.toLowerCase() &&
        i.Size.toLowerCase() === newSize.toLowerCase() &&
        i.Color.toLowerCase() === newColor.toLowerCase()
    );

    if (existingIdx >= 0) {
      // Increment existing item
      handleUpdateItemQty(existingIdx, items[existingIdx].Quantity + newQty);
    } else {
      const newItem: OrderItem = {
        OrderItemID: `item-${order.OrderID}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        OrderID: order.OrderID,
        VariantID: matchedVariant.VariantID,
        ProductCode: prod.ProductCode,
        ProductName: prod.ProductName,
        Size: newSize,
        Color: newColor,
        Quantity: newQty,
        UnitPrice: newPrice,
        ActualPrice: matchedVariant.ActualPrice,
        Subtotal: newPrice * newQty,
        Profit: (newPrice - matchedVariant.ActualPrice) * newQty,
        ProductImage: prod.Images[0]?.ImageURL || '',
      };
      setItems((prev) => [...prev, newItem]);
    }

    setShowAddItem(false);
    setNewQty(1);
    showToast(`Added ${prod.ProductName} (${newSize}/${newColor}) to order.`);
  };

  // Save Order
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (items.length === 0) {
      setErrorMsg('An order must have at least one product item.');
      return;
    }

    setIsSaving(true);

    const updatedOrder: Order = {
      ...order,
      CustomerName: customerName.trim() || 'Walk-in Customer',
      CustomerPhone: customerPhone.trim() || undefined,
      CustomerAddress: customerAddress.trim() || undefined,
      PaymentMethod: paymentMethod,
      Status: status,
      Discount: effectiveDiscount,
      Notes: notes.trim() || undefined,
      Items: items,
      Subtotal: subtotal,
      Total: total,
      Cost: cost,
      Profit: profit,
    };

    const res = updateOrder(updatedOrder);
    setIsSaving(false);

    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  // Delete Order
  const handleDeleteOrder = () => {
    const res = deleteOrder(order.OrderID, true);
    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-stone-900">
                  Edit Order & Receipt
                </h2>
                <span className="font-mono text-xs font-bold bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded">
                  {order.OrderID}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Adjust quantities, customer details, or status — inventory updates in real time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSaveOrder} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer & Status Bar */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-rose-600" />
              <span>Customer & Order Status</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Order Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg font-semibold capitalize cursor-pointer ${
                    status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : status === 'pending'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  <option value="completed">Completed (Stock Deducted)</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled (Restores Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg uppercase cursor-pointer"
                >
                  <option value="cash">CASH</option>
                  <option value="card">CREDIT / DEBIT CARD</option>
                  <option value="cod">CASH ON DELIVERY (COD)</option>
                  <option value="transfer">BANK TRANSFER</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Delivery / Address (optional)
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, City, Unit..."
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Order Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-rose-600" />
                  <span>Purchased Dress Items ({items.length})</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Changing quantities automatically recalibrates inventory stock
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddItem(!showAddItem)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item to Order</span>
              </button>
            </div>

            {/* Add Item to Order Drawer */}
            {showAddItem && (
              <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-3 animate-fadeIn text-xs">
                <div className="font-bold text-rose-950 flex items-center justify-between">
                  <span>Add Item to Receipt</span>
                  <button
                    type="button"
                    onClick={() => setShowAddItem(false)}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                      Product
                    </label>
                    <select
                      value={newProductCode}
                      onChange={(e) => setNewProductCode(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded font-mono font-medium text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.ProductID} value={p.ProductCode}>
                          {p.ProductCode} — {p.ProductName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                      Size
                    </label>
                    <select
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-xs"
                    >
                      {availableSizes.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">
                      Color
                    </label>
                    <select
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded text-xs"
                    >
                      {availableColors.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-500">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={newQty}
                        onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 px-2 py-1 bg-white border border-stone-300 rounded font-mono-numbers text-xs text-center"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-500">Price:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-18 px-2 py-1 bg-white border border-stone-300 rounded font-mono-numbers text-xs text-right"
                      />
                    </div>

                    {matchedVariant && (
                      <span className="text-[11px] text-stone-500">
                        In Stock: <strong>{matchedVariant.CurrentStock}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemToOrder}
                    disabled={!matchedVariant}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-2xs text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Add Line Item
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3">Size & Color</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => {
                    const variant = getVariant(item.ProductCode, item.Size, item.Color);
                    const currentStock = variant ? variant.CurrentStock : 0;

                    return (
                      <tr key={item.OrderItemID || idx} className="hover:bg-stone-50/70">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-stone-900">{item.ProductName}</div>
                          <div className="font-mono text-[10px] text-rose-700">{item.ProductCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-stone-700">
                          <div>
                            {item.Size} / {item.Color}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            Current Stock: {currentStock} units
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, item.Quantity - 1)}
                              className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.Quantity}
                              onChange={(e) =>
                                handleUpdateItemQty(idx, Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-12 px-1 py-0.5 text-center bg-white border border-stone-200 rounded font-mono-numbers font-bold text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(idx, item.Quantity + 1)}
                              className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.UnitPrice}
                            onChange={(e) =>
                              handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-1.5 py-0.5 text-right bg-white border border-stone-200 rounded font-mono-numbers text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-stone-900">
                          ${(item.UnitPrice * item.Quantity).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations & Discount */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs font-mono-numbers">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal ({items.reduce((s, i) => s + i.Quantity, 0)} items):</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center text-stone-700">
              <span className="font-sans">Discount ($):</span>
              <div className="flex items-center gap-1 font-mono-numbers">
                <span className="text-rose-600">-$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2 py-0.5 bg-white border border-stone-300 rounded text-right text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200">
              <span className="font-sans">Grand Total:</span>
              <span className="text-rose-950">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Order Notes / Cashier Remarks
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional customer requests, return policy notice..."
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
            />
          </div>

          {/* Stock Policy Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Automatic Inventory Real-time Synchronization:</strong> Increasing item quantities
              will automatically deduct stock. Decreasing quantities or cancelling the order will
              immediately return items to stock.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <div>
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Order</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700 font-semibold">Restore stock & delete?</span>
                  <button
                    type="button"
                    onClick={handleDeleteOrder}
                    className="px-2.5 py-1 text-xs bg-red-600 text-white rounded font-bold cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing Inventory...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Update Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
