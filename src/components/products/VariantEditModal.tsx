import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductVariant } from '../../types';
import { X, Save, Trash2, ArrowUpDown, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface VariantEditModalProps {
  productId: string;
  variant: ProductVariant;
  onClose: () => void;
}

export const VariantEditModal: React.FC<VariantEditModalProps> = ({ productId, variant, onClose }) => {
  const { sizes, colors, updateVariant, adjustVariantStock, deleteVariantFromProduct, isAdmin, showToast } =
    useStore();

  // Variant field states
  const [size, setSize] = useState(variant.Size);
  const [color, setColor] = useState(variant.Color);
  const [actualPrice, setActualPrice] = useState(variant.ActualPrice);
  const [sellingPrice, setSellingPrice] = useState(variant.SellingPrice);
  const [minStock, setMinStock] = useState(variant.MinimumStock);
  const [status, setStatus] = useState<'active' | 'inactive'>(variant.Status);

  // Stock Adjustment state
  const [adjustedStock, setAdjustedStock] = useState(variant.CurrentStock);
  const [adjustmentReason, setAdjustmentReason] = useState(
    'Inventory count correction / physical audit'
  );
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const stockDiff = adjustedStock - variant.CurrentStock;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Update basic variant attributes
      const updatedVariant: ProductVariant = {
        ...variant,
        Size: size.trim(),
        Color: color.trim(),
        ActualPrice: actualPrice,
        SellingPrice: sellingPrice,
        MinimumStock: minStock,
        Status: status,
      };

      const res = updateVariant(productId, updatedVariant);
      if (!res.success) {
        showToast(res.error || 'Failed to update variant', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. If stock was adjusted, record stock adjustment
      if (stockDiff !== 0) {
        const reason = customReason.trim() || adjustmentReason;
        adjustVariantStock(productId, variant.VariantID, adjustedStock, reason);
      }

      onClose();
    } catch {
      showToast('Error updating variant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDelete = () => {
    const res = deleteVariantFromProduct(productId, variant.VariantID);
    if (res.success) {
      onClose();
    } else {
      showToast(res.error || 'Cannot delete variant', 'error');
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 text-rose-800">
                {variant.ProductCode}
              </span>
              <h3 className="text-base font-bold text-stone-900">
                Edit Variant & Stock Adjustment
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Size {variant.Size} • {variant.Color} • Current Stock: {variant.CurrentStock} units
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
          {/* Size & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Size</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
              >
                {sizes.map((s) => (
                  <option key={s.SizeID} value={s.SizeValue}>
                    {s.SizeValue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Color</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
              >
                {colors.map((c) => (
                  <option key={c.ColorID} value={c.ColorName}>
                    {c.ColorName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing & Threshold */}
          <div className="grid grid-cols-3 gap-3">
            {isAdmin && (
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Actual Price (Cost)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={actualPrice}
                    onChange={(e) => setActualPrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Selling Price (Retail)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers font-semibold focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Min Stock Alert</label>
              <input
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
              />
            </div>
          </div>

          {/* Profit preview if admin */}
          {isAdmin && (
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>Unit Profit Margin:</span>
              <span className="font-bold">
                +${(sellingPrice - actualPrice).toFixed(2)} (
                {actualPrice > 0 ? (((sellingPrice - actualPrice) / actualPrice) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          )}

          {/* Stock Adjustment Panel (Admin) */}
          {isAdmin && (
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-stone-900">
                  <ArrowUpDown className="w-4 h-4 text-rose-600" />
                  <span>Admin Stock Adjustment</span>
                </div>
                <span className="text-[11px] font-mono-numbers text-stone-500">
                  Current: <strong className="text-stone-800">{variant.CurrentStock} units</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Adjust To New Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustedStock}
                    onChange={(e) => setAdjustedStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs font-mono-numbers font-bold text-stone-900 focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="text-[11px] p-2 rounded bg-white border border-stone-200">
                  <span className="text-stone-500 block">Inventory Difference:</span>
                  <span
                    className={`font-mono-numbers font-bold text-sm ${
                      stockDiff > 0
                        ? 'text-emerald-600'
                        : stockDiff < 0
                        ? 'text-rose-600'
                        : 'text-stone-500'
                    }`}
                  >
                    {stockDiff > 0 ? `+${stockDiff} units (IN)` : stockDiff < 0 ? `${stockDiff} units (OUT)` : 'No stock change'}
                  </span>
                </div>
              </div>

              {stockDiff !== 0 && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  <label className="block text-[11px] font-semibold text-stone-700">
                    Reason for Stock Adjustment
                  </label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="Inventory count correction / physical audit">
                      Inventory count correction / physical audit
                    </option>
                    <option value="Damaged / defective item found">Damaged / defective item found</option>
                    <option value="Lost / missing inventory">Lost / missing inventory</option>
                    <option value="Found misplaced merchandise">Found misplaced merchandise</option>
                    <option value="Supplier return / exchange">Supplier return / exchange</option>
                    <option value="Customer return / restock">Customer return / restock</option>
                    <option value="Other adjustment">Other (type custom reason below)</option>
                  </select>

                  {adjustmentReason === 'Other adjustment' && (
                    <input
                      type="text"
                      placeholder="Specify adjustment notes..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs mt-1"
                    />
                  )}
                  <p className="text-[10px] text-stone-400">
                    * This will immediately log an inventory movement audit transaction in Firestore.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status Selection */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-stone-700">Variant Status</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200'
                    : 'bg-white text-stone-600 border-stone-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${
                  status === 'inactive'
                    ? 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-200'
                    : 'bg-white text-stone-600 border-stone-200'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            {isAdmin ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 p-1 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-[11px] font-bold text-red-700 px-1">Delete variant?</span>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[11px] hover:bg-stone-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Variant</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
