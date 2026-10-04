import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

interface AddVariantModalProps {
  productId: string;
  productCode: string;
  onClose: () => void;
}

export const AddVariantModal: React.FC<AddVariantModalProps> = ({ productId, productCode, onClose }) => {
  const { sizes, colors, addVariantToProduct, showToast, settings } = useStore();

  const [size, setSize] = useState(sizes[0]?.SizeValue || '100');
  const [color, setColor] = useState(colors[0]?.ColorName || 'Pink');
  const [actualPrice, setActualPrice] = useState(15);
  const [sellingPrice, setSellingPrice] = useState(25);
  const [initialStock, setInitialStock] = useState(10);
  const [minStock, setMinStock] = useState(settings.LowStockThreshold || 5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = addVariantToProduct(productId, {
        Size: size.trim(),
        Color: color.trim(),
        ActualPrice: actualPrice,
        SellingPrice: sellingPrice,
        CurrentStock: initialStock,
        MinimumStock: minStock,
        Status: 'active',
      });

      if (res.success) {
        onClose();
      } else {
        showToast(res.error || 'Failed to add variant', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 text-rose-800">
              {productCode}
            </span>
            <h3 className="text-base font-bold text-stone-900">Add New Variant</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Size (70–190)</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
              >
                {sizes.map((s) => (
                  <option key={s.SizeID} value={s.SizeValue}>
                    Size {s.SizeValue}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Actual Price (Cost)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={actualPrice}
                  onChange={(e) => setActualPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Selling Price (Retail)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers font-semibold focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Initial Stock (Units)</label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
                required
              />
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

          <div className="p-2.5 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-between text-xs text-pink-800">
            <span>Estimated Profit per unit:</span>
            <span className="font-bold">+${(sellingPrice - actualPrice).toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
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
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Adding...' : 'Add Variant'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
