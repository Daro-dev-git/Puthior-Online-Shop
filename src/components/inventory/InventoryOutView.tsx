import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { InventoryTransaction } from '../../types';
import { EditTransactionModal } from './EditTransactionModal';
import {
  ArrowUpFromLine,
  AlertTriangle,
  PackageMinus,
  CheckCircle2,
  HelpCircle,
  Shirt,
  Edit2,
} from 'lucide-react';

export const InventoryOutView: React.FC = () => {
  const {
    products,
    getAvailableSizesForCode,
    getAvailableColorsForCodeAndSize,
    getVariant,
    getProductByCode,
    issueStock,
    transactions,
    isAdmin,
    showToast,
  } = useStore();

  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);

  const [productCode, setProductCode] = useState<string>('GD001');
  const [size, setSize] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [outType, setOutType] = useState<
    'Damaged' | 'Lost' | 'Adjustment OUT' | 'Supplier Return' | 'Customer Sale'
  >('Damaged');
  const [referenceName, setReferenceName] = useState<string>('Quality Inspection');
  const [notes, setNotes] = useState<string>('Fabric defect noted during packing');
  const [date, setDate] = useState<string>('2026-10-04');

  // Load available sizes
  const availableSizes = useMemo(() => {
    if (!productCode) return [];
    return getAvailableSizesForCode(productCode);
  }, [productCode, products, getAvailableSizesForCode]);

  const sizesKey = availableSizes.join(',');
  useEffect(() => {
    if (availableSizes.length > 0) {
      if (!size || !availableSizes.includes(size)) {
        setSize(availableSizes[0]);
      }
    } else if (size) {
      setSize('');
    }
  }, [productCode, sizesKey]);

  // Load available colors
  const availableColors = useMemo(() => {
    if (!productCode || !size) return [];
    return getAvailableColorsForCodeAndSize(productCode, size);
  }, [productCode, size, products, getAvailableColorsForCodeAndSize]);

  const colorsKey = availableColors.join(',');
  useEffect(() => {
    if (availableColors.length === 1) {
      if (color !== availableColors[0]) setColor(availableColors[0]);
    } else if (availableColors.length > 1) {
      if (!color || !availableColors.includes(color)) {
        setColor(availableColors[0]);
      }
    } else if (color) {
      setColor('');
    }
  }, [colorsKey]);

  // Resolve Variant
  const currentVariant = useMemo(() => {
    if (!productCode || !size || !color) return undefined;
    return getVariant(productCode, size, color);
  }, [productCode, size, color, products, getVariant]);

  const currentProduct = useMemo(() => {
    return getProductByCode(productCode);
  }, [productCode, products, getProductByCode]);

  const handleIssueStock = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productCode || !size || !color) {
      showToast('Please select Product Code, Size, and Color', 'error');
      return;
    }

    if (quantity <= 0) {
      showToast('Quantity must be greater than zero', 'error');
      return;
    }

    if (!currentVariant || currentVariant.CurrentStock < quantity) {
      showToast(
        `Cannot issue ${quantity} units. Current stock is only ${currentVariant?.CurrentStock || 0}`,
        'error'
      );
      return;
    }

    const result = issueStock({
      type: outType,
      productCode,
      size,
      color,
      quantity,
      customerName: referenceName.trim(),
      notes: notes.trim(),
      date: `${date}T${new Date().toTimeString().slice(0, 8)}`,
    });

    if (result.success) {
      setNotes('');
      setQuantity(1);
    }
  };

  const recentOutTransactions = useMemo(() => {
    return transactions
      .filter((t) => ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(t.TransactionType))
      .slice(0, 8);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-stone-200">
        <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
          Inventory OUT (Stock Deductions & Write-Offs)
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Process stock reductions for damaged garments, inventory shrinkage, supplier returns, or manual adjustments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Inbound Stock Configuration (Section 16) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
            <ArrowUpFromLine className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-stone-900">Stock Deduction Details</h2>
          </div>

          <form onSubmit={handleIssueStock} className="space-y-4">
            {/* Top row: Reason/Type & Date & Ref */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Deduction Reason (Type)
                </label>
                <select
                  value={outType}
                  onChange={(e) => setOutType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                >
                  <option value="Damaged">Damaged Garment</option>
                  <option value="Lost">Lost / Shrinkage</option>
                  <option value="Supplier Return">Supplier Return / Defect</option>
                  <option value="Adjustment OUT">Adjustment OUT (Audit Count)</option>
                  <option value="Customer Sale">Manual Customer Sale</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
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
                  Recipient / Reference
                </label>
                <input
                  type="text"
                  value={referenceName}
                  onChange={(e) => setReferenceName(e.target.value)}
                  placeholder="e.g. Inspector Name, Vendor"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Product Code */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Code (SKU)
              </label>
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold focus:bg-white focus:ring-1 focus:ring-rose-500"
              >
                {[...products]
                  .sort((a, b) => a.ProductCode.localeCompare(b.ProductCode, undefined, { numeric: true, sensitivity: 'base' }))
                  .map((p) => (
                    <option key={p.ProductID} value={p.ProductCode}>
                      {p.ProductCode} — {p.ProductName}
                    </option>
                  ))}
              </select>
            </div>

            {/* Sizes & Colors */}
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

            {/* Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quantity OUT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={currentVariant?.CurrentStock || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-bold font-mono-numbers focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Unit Selling Value (Auto-loaded)
                </label>
                <div className="px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-xs font-mono-numbers font-semibold text-stone-800">
                  ${currentVariant ? currentVariant.SellingPrice.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason / Detailed Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details of defect, damage report, or audit discrepancy..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
              />
            </div>

            {/* Stock Projection Alert Box */}
            {currentVariant && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-rose-950">
                  <span>Stock Projection:</span>
                  <span>
                    Current: <strong>{currentVariant.CurrentStock}</strong> → After OUT:{' '}
                    <strong className="text-rose-700 text-sm">
                      {Math.max(0, currentVariant.CurrentStock - quantity)} units
                    </strong>
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 font-mono-numbers text-[11px]">
                  <span>Subtotal Value: ${(currentVariant.SellingPrice * quantity).toFixed(2)}</span>
                  <span>
                    {currentVariant.CurrentStock < quantity ? (
                      <span className="text-rose-600 font-bold">INSUFFICIENT STOCK!</span>
                    ) : (
                      <span className="text-emerald-700">Stock available for issue</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!currentVariant || currentVariant.CurrentStock < quantity}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <PackageMinus className="w-4 h-4" />
              <span>Deduct / Issue Stock (-{quantity} Units)</span>
            </button>
          </form>
        </div>

        {/* Right Column: Recent Out Movements */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Recent OUT Movements</h3>
              <span className="text-[11px] text-stone-400">Sales & Write-Offs</span>
            </div>

            <div className="space-y-2 mt-3 overflow-y-auto max-h-[460px] pr-1">
              {recentOutTransactions.map((tx) => (
                <div
                  key={tx.TransactionID}
                  className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-900">{tx.ProductName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-numbers font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        -{tx.Quantity} OUT
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setEditingTransaction(tx)}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-stone-200/60 rounded cursor-pointer transition-colors"
                          title="Edit movement & recalculate stock"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 font-mono text-[11px]">
                    <span>
                      {tx.ProductCode} · {tx.Size} / {tx.Color}
                    </span>
                    <span>{new Date(tx.TransactionDate).toLocaleDateString('en-US')}</span>
                  </div>
                  <div className="text-[11px] text-stone-600 truncate">
                    Reason: <strong>{tx.TransactionType}</strong> · {tx.Notes}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg text-[11px] text-stone-500 border border-stone-200">
            <strong>Never Negative Policy:</strong> The inventory engine enforces physical reality: stock cannot fall below zero. Every deduction creates a verifiable audit record.
          </div>
        </div>
      </div>

      {/* Edit Inventory Movement Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};
