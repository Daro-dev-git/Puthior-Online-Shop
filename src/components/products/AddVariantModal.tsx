import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { compareSizes } from '../../utils/sizeUtils';
import { X, Plus, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

interface AddVariantModalProps {
  productId: string;
  productCode: string;
  onClose: () => void;
}

export const AddVariantModal: React.FC<AddVariantModalProps> = ({ productId, productCode, onClose }) => {
  const { products, sizes, colors, addVariantToProduct, showToast, settings } = useStore();

  const existingProduct = products.find((p) => p.ProductID === productId);
  const existingVariants = existingProduct?.Variants || [];

  // Sort available sizes by size number (Requirement #2)
  const sortedSizes = useMemo(() => {
    return [...sizes].sort((a, b) => compareSizes(a.SizeValue, b.SizeValue));
  }, [sizes]);

  // Requirement #4: Auto-select actual price & selling price from existing product variant
  const defaultVariant = existingVariants.find((v) => v.Status === 'active') || existingVariants[0];
  const initialActualPrice = defaultVariant ? defaultVariant.ActualPrice : 15;
  const initialSellingPrice = defaultVariant ? defaultVariant.SellingPrice : 25;
  const initialMinStock = defaultVariant?.MinimumStock ?? (settings.LowStockThreshold || 5);

  const [size, setSize] = useState(sortedSizes[0]?.SizeValue || '100');
  const [color, setColor] = useState(colors[0]?.ColorName || 'Pink');
  const [actualPrice, setActualPrice] = useState<number>(initialActualPrice);
  const [sellingPrice, setSellingPrice] = useState<number>(initialSellingPrice);
  const [initialStock, setInitialStock] = useState<number>(10);
  const [minStock, setMinStock] = useState<number>(initialMinStock);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSelected, setIsAutoSelected] = useState<boolean>(Boolean(defaultVariant));

  // Requirement #4: When color changes, automatically select prices from matching or existing variants
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (existingVariants.length > 0) {
      const match = existingVariants.find(
        (v) => v.Color.trim().toLowerCase() === newColor.trim().toLowerCase()
      );
      const source = match || defaultVariant;
      if (source) {
        setActualPrice(source.ActualPrice);
        setSellingPrice(source.SellingPrice);
        if (source.MinimumStock) setMinStock(source.MinimumStock);
        setIsAutoSelected(true);
      }
    }
  };

  const handleResetToAutoPrices = () => {
    const match = existingVariants.find(
      (v) => v.Color.trim().toLowerCase() === color.trim().toLowerCase()
    );
    const source = match || defaultVariant;
    if (source) {
      setActualPrice(source.ActualPrice);
      setSellingPrice(source.SellingPrice);
      setIsAutoSelected(true);
      showToast(`Restored existing variant pricing ($${source.ActualPrice} cost / $${source.SellingPrice} retail)`);
    }
  };

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
            <div>
              <h3 className="text-base font-bold text-stone-900">Add New Variant</h3>
              {existingProduct && (
                <p className="text-[11px] text-stone-500 line-clamp-1">
                  {existingProduct.ProductName} · {existingVariants.length} existing variant(s)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-selected Price Notification (Requirement #4) */}
        {defaultVariant && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Auto-selected existing variant prices:{' '}
                <strong className="text-emerald-950 font-mono-numbers">
                  ${actualPrice.toFixed(2)}
                </strong>{' '}
                cost /{' '}
                <strong className="text-emerald-950 font-mono-numbers">
                  ${sellingPrice.toFixed(2)}
                </strong>{' '}
                selling
              </span>
            </div>
            {!isAutoSelected && (
              <button
                type="button"
                onClick={handleResetToAutoPrices}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 underline cursor-pointer ml-1"
                title="Restore auto-selected prices"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Size (Ordered by Number)
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
              >
                {sortedSizes.map((s) => (
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
                onChange={(e) => handleColorChange(e.target.value)}
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
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-stone-700">Actual Price (Cost)</label>
                {isAutoSelected && (
                  <span className="text-[10px] text-emerald-600 font-medium">Auto-selected</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={actualPrice}
                  onChange={(e) => {
                    setActualPrice(parseFloat(e.target.value) || 0);
                    setIsAutoSelected(false);
                  }}
                  className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-stone-700">Selling Price (Retail)</label>
                {isAutoSelected && (
                  <span className="text-[10px] text-emerald-600 font-medium">Auto-selected</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-stone-400">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => {
                    setSellingPrice(parseFloat(e.target.value) || 0);
                    setIsAutoSelected(false);
                  }}
                  className="w-full pl-6 pr-2 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono-numbers font-semibold focus:bg-white text-rose-950"
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
            <span className="font-bold font-mono-numbers">+${(sellingPrice - actualPrice).toFixed(2)}</span>
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
