import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  ArrowDownToLine,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  PackageCheck,
  AlertCircle,
  Shirt,
  Sparkles,
} from 'lucide-react';

interface InventoryInViewProps {
  initialCode?: string;
  initialSize?: string;
  initialColor?: string;
}

export const InventoryInView: React.FC<InventoryInViewProps> = ({
  initialCode,
  initialSize,
  initialColor,
}) => {
  const {
    products,
    getAvailableSizesForCode,
    getAvailableColorsForCodeAndSize,
    getVariant,
    getProductByCode,
    receiveStock,
    transactions,
    isAdmin,
    showToast,
  } = useStore();

  const [productCode, setProductCode] = useState<string>(initialCode || 'GD001');
  const [size, setSize] = useState<string>(initialSize || '');
  const [color, setColor] = useState<string>(initialColor || '');
  const [quantity, setQuantity] = useState<number>(20);
  const [supplier, setSupplier] = useState<string>('ABC Boutique Garments Ltd.');
  const [actualPrice, setActualPrice] = useState<number>(15);
  const [sellingPrice, setSellingPrice] = useState<number>(25);
  const [transactionType, setTransactionType] = useState<
    'Purchase' | 'Stock Received' | 'Customer Return' | 'Adjustment IN'
  >('Stock Received');
  const [notes, setNotes] = useState<string>('Seasonal replenishment stock');
  const [date, setDate] = useState<string>('2026-10-04');

  // Available Sizes for selected code
  const availableSizes = useMemo(() => {
    if (!productCode) return [];
    return getAvailableSizesForCode(productCode);
  }, [productCode, products, getAvailableSizesForCode]);

  useEffect(() => {
    if (availableSizes.length > 0) {
      if (!size || !availableSizes.includes(size)) {
        setSize(availableSizes[0]);
      }
    } else {
      setSize('');
    }
  }, [productCode, availableSizes]);

  // Available Colors for selected code and size
  const availableColors = useMemo(() => {
    if (!productCode || !size) return [];
    return getAvailableColorsForCodeAndSize(productCode, size);
  }, [productCode, size, products, getAvailableColorsForCodeAndSize]);

  // Section 13: Auto-select color
  useEffect(() => {
    if (availableColors.length === 1) {
      setColor(availableColors[0]);
    } else if (availableColors.length > 1) {
      if (!color || !availableColors.includes(color)) {
        setColor(availableColors[0]);
      }
    } else {
      setColor('');
    }
  }, [availableColors]);

  // Auto-load prices and current stock when Variant is resolved
  const currentVariant = useMemo(() => {
    if (!productCode || !size || !color) return undefined;
    return getVariant(productCode, size, color);
  }, [productCode, size, color, products, getVariant]);

  const currentProduct = useMemo(() => {
    return getProductByCode(productCode);
  }, [productCode, products, getProductByCode]);

  useEffect(() => {
    if (currentVariant) {
      setActualPrice(currentVariant.ActualPrice);
      setSellingPrice(currentVariant.SellingPrice);
    }
  }, [currentVariant]);

  // Handle Receive Stock
  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productCode || !size || !color) {
      showToast('Please select a valid Product Code, Size, and Color', 'error');
      return;
    }

    if (quantity <= 0) {
      showToast('Quantity must be greater than zero', 'error');
      return;
    }

    const result = receiveStock({
      productCode,
      size,
      color,
      quantity,
      actualPrice,
      sellingPrice,
      supplier: supplier.trim(),
      notes: notes.trim(),
      transactionType,
      date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
    });

    if (result.success) {
      setNotes('');
    }
  };

  // Recent IN transactions
  const recentInTransactions = useMemo(() => {
    return transactions
      .filter((t) => ['Purchase', 'Stock Received', 'Customer Return', 'Adjustment IN'].includes(t.TransactionType))
      .slice(0, 8);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-3 border-b border-stone-200">
        <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
          Inventory IN (Stock Receiving)
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Process inbound inventory from garment manufacturers, supplier deliveries, or stock adjustments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inbound Stock Configuration (Section 15) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">Inbound Stock Details</h2>
          </div>

          <form onSubmit={handleReceiveStock} className="space-y-4">
            {/* Top row: Supplier & Date & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  required
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. ABC Supplier"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Receiving Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Stock Received">Stock Received</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Customer Return">Customer Return</option>
                  <option value="Adjustment IN">Adjustment IN</option>
                </select>
              </div>
            </div>

            {/* Product Code Selection */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Code (SKU)
              </label>
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:bg-white focus:ring-1 focus:ring-rose-500"
              >
                {products.map((p) => (
                  <option key={p.ProductID} value={p.ProductCode}>
                    {p.ProductCode} — {p.ProductName}
                  </option>
                ))}
              </select>
            </div>

            {/* Size & Color Auto-load (Sections 12 & 13) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-stone-700">Size</label>
                  <span className="text-[11px] text-stone-400">Available: {availableSizes.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 border border-stone-200 rounded-lg min-h-[42px]">
                  {availableSizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSize(sz)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition-all ${
                        size === sz
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-stone-700">Color</label>
                  <span className="text-[11px] text-stone-400">
                    {availableColors.length === 1 ? 'Auto-selected' : `${availableColors.length} available`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2 bg-stone-50 border border-stone-200 rounded-lg min-h-[42px]">
                  {availableColors.map((cl) => (
                    <button
                      key={cl}
                      type="button"
                      onClick={() => setColor(cl)}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-all ${
                        color === cl
                          ? 'bg-rose-50 text-rose-900 border-rose-500 font-bold ring-1 ring-rose-300'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {cl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity, Actual Price, Selling Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quantity IN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-bold font-mono-numbers focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Actual Cost Price ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(parseFloat(e.target.value) || 0)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:ring-1 focus:ring-rose-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers font-semibold focus:ring-1 focus:ring-rose-500 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Transaction Notes / Bill Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Invoice #PO-9821, container delivery"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
              />
            </div>

            {/* Dynamic Status Preview Box */}
            {currentVariant && currentProduct && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-emerald-950">
                  <span>Stock Projection:</span>
                  <span>
                    Current: {currentVariant.CurrentStock} → After IN:{' '}
                    <strong className="text-emerald-700 text-sm">
                      {currentVariant.CurrentStock + quantity} units
                    </strong>
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 font-mono-numbers text-[11px]">
                  <span>Total Inbound Cost: ${(actualPrice * quantity).toFixed(2)}</span>
                  <span>Total Inbound Retail: ${(sellingPrice * quantity).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Receive Stock (+{quantity} Units)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Recent Inbound Transactions Audit Log */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Recent IN Movements</h3>
              <span className="text-[11px] text-stone-400">Preserved in audit trail</span>
            </div>

            <div className="space-y-2 mt-3 overflow-y-auto max-h-[460px] pr-1">
              {recentInTransactions.map((tx) => (
                <div
                  key={tx.TransactionID}
                  className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{tx.ProductName}</span>
                    <span className="font-mono-numbers font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      +{tx.Quantity} IN
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                    <span>
                      {tx.ProductCode} · {tx.Size} / {tx.Color}
                    </span>
                    <span>{new Date(tx.TransactionDate).toLocaleDateString('en-US')}</span>
                  </div>
                  <div className="text-[11px] text-stone-600 truncate">
                    Supplier: {tx.Supplier || 'N/A'} · User: {tx.CreatedBy}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg text-[11px] text-stone-500 border border-stone-200">
            <strong>Audit Guarantee:</strong> When stock is received, the variant master stock is atomically updated and a permanent, immutable ledger transaction is logged.
          </div>
        </div>
      </div>
    </div>
  );
};
