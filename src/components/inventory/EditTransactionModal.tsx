import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { InventoryTransaction } from '../../types';
import {
  X,
  Save,
  Trash2,
  AlertCircle,
  PackageMinus,
  Calendar,
  User,
  FileText,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Shirt,
} from 'lucide-react';

interface EditTransactionModalProps {
  transaction: InventoryTransaction;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose }) => {
  const { updateTransaction, deleteTransaction, getVariant, showToast } = useStore();

  const [quantity, setQuantity] = useState<number>(transaction.Quantity);
  const [transactionType, setTransactionType] = useState<string>(transaction.TransactionType);
  const [date, setDate] = useState<string>(
    transaction.TransactionDate ? transaction.TransactionDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [customerOrRef, setCustomerOrRef] = useState<string>(
    transaction.CustomerName || transaction.Supplier || ''
  );
  const [notes, setNotes] = useState<string>(transaction.Notes || '');
  const [actualPrice, setActualPrice] = useState<number>(transaction.ActualPrice || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(transaction.SellingPrice || 0);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Variant lookup
  const variant = useMemo(() => {
    return getVariant(transaction.ProductCode, transaction.Size, transaction.Color);
  }, [transaction, getVariant]);

  const isOut = ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(
    transaction.TransactionType
  );
  const isIn = ['Stock Received', 'Restock', 'Initial Stock', 'Adjustment IN', 'Supplier Purchase'].includes(
    transaction.TransactionType
  );

  // Projected stock calculation
  const qtyDelta = quantity - transaction.Quantity;
  const projectedStock = useMemo(() => {
    if (!variant) return 0;
    if (isOut) {
      // OUT movement: if quantity increased, more is deducted from stock
      return Math.max(0, variant.CurrentStock - qtyDelta);
    } else if (isIn) {
      // IN movement: if quantity increased, more is added to stock
      return Math.max(0, variant.CurrentStock + qtyDelta);
    }
    return variant.CurrentStock;
  }, [variant, isOut, isIn, qtyDelta]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (quantity <= 0) {
      setErrorMsg('Quantity must be at least 1 unit.');
      return;
    }

    if (isOut && qtyDelta > 0 && variant && variant.CurrentStock < qtyDelta) {
      setErrorMsg(
        `Insufficient stock! Variant only has ${variant.CurrentStock} units available to deduct ${qtyDelta} additional.`
      );
      return;
    }

    setIsSaving(true);

    const updatedTx: InventoryTransaction = {
      ...transaction,
      Quantity: quantity,
      TransactionType: transactionType as any,
      TransactionDate: `${date}T${new Date().toTimeString().slice(0, 8)}`,
      CustomerName: isOut ? customerOrRef.trim() : undefined,
      Supplier: isIn ? customerOrRef.trim() : undefined,
      ActualPrice: actualPrice,
      SellingPrice: sellingPrice,
      Notes: notes.trim(),
    };

    const res = updateTransaction(updatedTx);
    setIsSaving(false);

    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleDelete = () => {
    const res = deleteTransaction(transaction.TransactionID);
    if (res.success) {
      onClose();
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <PackageMinus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-display text-stone-900">
                  Edit Inventory Movement
                </h2>
                <span className="font-mono text-xs font-bold bg-stone-100 text-stone-800 px-2 py-0.5 rounded">
                  {transaction.TransactionID}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Adjust quantity or reason — inventory stock recalculates in real-time
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Overview Box */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-stone-900">{transaction.ProductName}</div>
                <div className="font-mono text-[11px] text-stone-500">
                  {transaction.ProductCode} · Size {transaction.Size} · Color {transaction.Color}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-stone-400">Current Stock</div>
              <div className="font-mono-numbers font-bold text-sm text-stone-900">
                {variant?.CurrentStock ?? 0} units
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Movement Type (Reason)
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-semibold focus:bg-white cursor-pointer"
              >
                <optgroup label="OUT Movements (Stock Deductions)">
                  <option value="Damaged">Damaged Garment</option>
                  <option value="Lost">Lost / Shrinkage</option>
                  <option value="Supplier Return">Supplier Return</option>
                  <option value="Adjustment OUT">Adjustment OUT (Count)</option>
                  <option value="Customer Sale">Customer Sale</option>
                </optgroup>
                <optgroup label="IN Movements (Stock Inbound)">
                  <option value="Stock Received">Stock Received</option>
                  <option value="Restock">Restock</option>
                  <option value="Adjustment IN">Adjustment IN</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Movement Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Quantity (Units)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-mono-numbers font-bold text-rose-950 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Recipient / Customer / Reference
              </label>
              <input
                type="text"
                value={customerOrRef}
                onChange={(e) => setCustomerOrRef(e.target.value)}
                placeholder="e.g. Audit Inspector, Customer"
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
              />
            </div>
          </div>

          {/* Pricing fields */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualPrice}
                onChange={(e) => setActualPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-mono-numbers focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                Unit Selling Value ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg font-mono-numbers focus:bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
              Transaction Notes & Explanations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for adjustment, write-off report, or inspector reference..."
              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
            />
          </div>

          {/* Stock Projection Alert Box */}
          {variant && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-rose-950">
                <span>Real-Time Inventory Projection:</span>
                <span>
                  Current: <strong>{variant.CurrentStock}</strong> → After Edit:{' '}
                  <strong className="text-rose-700 text-sm font-mono-numbers">
                    {projectedStock} units
                  </strong>
                </span>
              </div>
              <p className="text-[11px] text-stone-600">
                {qtyDelta === 0
                  ? 'No quantity change.'
                  : qtyDelta > 0
                  ? `Increased by ${qtyDelta} units: will deduct ${qtyDelta} additional units from inventory stock.`
                  : `Decreased by ${Math.abs(qtyDelta)} units: will restore ${Math.abs(qtyDelta)} units back to inventory stock.`}
              </p>
            </div>
          )}

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
                  <span>Delete & Restore Stock</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700 font-semibold">Delete movement?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
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
                    <span>Syncing Stock...</span>
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
