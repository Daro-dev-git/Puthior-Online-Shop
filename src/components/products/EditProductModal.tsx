import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductImage, ProductVariant } from '../../types';
import { processLocalImageFile } from '../../utils/imageUtils';
import { compareSizes } from '../../utils/sizeUtils';
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  Shirt,
  Layers,
  Sparkles,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';

interface EditProductModalProps {
  productId: string;
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ productId, onClose }) => {
  const { products, dressTypes, updateProduct, showToast, isAdmin } = useStore();
  const product = products.find((p) => p.ProductID === productId);

  // Form states
  const [productCode, setProductCode] = useState(product?.ProductCode || '');
  const [productName, setProductName] = useState(product?.ProductName || '');
  const [dressTypeId, setDressTypeId] = useState(product?.DressTypeID || '');
  const [brand, setBrand] = useState(product?.Brand || 'Girl Dress Shop');
  const [description, setDescription] = useState(product?.Description || '');
  const [images, setImages] = useState<ProductImage[]>(product?.Images ? [...product.Images] : []);

  // Variant editing (prices, quantities, stock thresholds)
  const [variants, setVariants] = useState<ProductVariant[]>(() =>
    product?.Variants ? product.Variants.map((v) => ({ ...v })) : []
  );

  // Keep reference of original variants to display stock adjustment deltas
  const originalVariants = useMemo(() => {
    const map = new Map<string, ProductVariant>();
    if (product?.Variants) {
      product.Variants.forEach((v) => map.set(v.VariantID, { ...v }));
    }
    return map;
  }, [product]);

  // Bulk adjustment drawer / tools
  const [bulkCost, setBulkCost] = useState<string>('');
  const [bulkSelling, setBulkSelling] = useState<string>('');
  const [showBulkTools, setShowBulkTools] = useState<boolean>(false);

  // Adding new image states
  const [showAddUrlImage, setShowAddUrlImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!product) {
    return null;
  }

  // Handle local files from computer
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    try {
      const newItems: ProductImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const processed = await processLocalImageFile(file);
        newItems.push({
          ImageID: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          ProductID: product.ProductID,
          ImageURL: processed.dataUrl,
          IsPrimary: images.length === 0 && i === 0,
          Caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        });
      }
      if (newItems.length > 0) {
        setImages((prev) => {
          const combined = [...prev, ...newItems];
          if (!combined.some((img) => img.IsPrimary)) {
            combined[0].IsPrimary = true;
          }
          return combined;
        });
        showToast(`Attached ${newItems.length} photo(s) from computer`);
      }
    } catch {
      showToast('Error reading image file', 'error');
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrlImage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newImageUrl.trim();
    if (!cleanUrl) return;

    const newImg: ProductImage = {
      ImageID: `img-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ProductID: product.ProductID,
      ImageURL: cleanUrl,
      IsPrimary: images.length === 0,
      Caption: newImageCaption.trim() || productName,
    };

    setImages((prev) => [...prev, newImg]);
    setNewImageUrl('');
    setNewImageCaption('');
    setShowAddUrlImage(false);
    showToast('Image URL added to product gallery');
  };

  const handleSetPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        IsPrimary: idx === index,
      }))
    );
  };

  const handleDeleteImage = (index: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      if (filtered.length > 0 && !filtered.some((img) => img.IsPrimary)) {
        filtered[0].IsPrimary = true;
      }
      return filtered;
    });
  };

  // Multi-item individual variant field change (Cost, Selling, Quantity, Min Alert)
  const handleVariantFieldChange = (
    variantId: string,
    field: 'SellingPrice' | 'ActualPrice' | 'CurrentStock' | 'MinimumStock',
    val: number
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.VariantID === variantId ? { ...v, [field]: Math.max(0, val) } : v))
    );
  };

  // Bulk actions across all variants
  const handleApplyBulkCost = () => {
    const num = parseFloat(bulkCost);
    if (isNaN(num) || num < 0) {
      showToast('Please enter a valid positive cost price', 'error');
      return;
    }
    setVariants((prev) => prev.map((v) => ({ ...v, ActualPrice: num })));
    showToast(`Applied wholesale cost of $${num.toFixed(2)} to all ${variants.length} variants`);
    setBulkCost('');
  };

  const handleApplyBulkSelling = () => {
    const num = parseFloat(bulkSelling);
    if (isNaN(num) || num < 0) {
      showToast('Please enter a valid positive selling price', 'error');
      return;
    }
    setVariants((prev) => prev.map((v) => ({ ...v, SellingPrice: num })));
    showToast(`Applied retail selling price of $${num.toFixed(2)} to all ${variants.length} variants`);
    setBulkSelling('');
  };

  const handleBulkStockDelta = (delta: number) => {
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        CurrentStock: Math.max(0, v.CurrentStock + delta),
      }))
    );
    showToast(`${delta > 0 ? `Added +${delta}` : `Deducted ${delta}`} unit(s) across all variants`);
  };

  // Calculate total stock change for visual feedback
  const totalStockDelta = useMemo(() => {
    return variants.reduce((acc, v) => {
      const orig = originalVariants.get(v.VariantID);
      const diff = v.CurrentStock - (orig?.CurrentStock || 0);
      return acc + diff;
    }, 0);
  }, [variants, originalVariants]);

  // Submit Update
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = productCode.trim().toUpperCase();
    const cleanName = productName.trim();

    if (!cleanCode) {
      setErrorMsg('Product Code (SKU) is required.');
      return;
    }

    if (!cleanName) {
      setErrorMsg('Product Name is required.');
      return;
    }

    // Check code uniqueness across other products
    const collision = products.find(
      (p) => p.ProductID !== product.ProductID && p.ProductCode.trim().toUpperCase() === cleanCode
    );
    if (collision) {
      setErrorMsg(`Product code "${cleanCode}" is already used by "${collision.ProductName}". SKU must be unique.`);
      return;
    }

    setIsSaving(true);

    // Synchronize variant product codes and sanitize prices/quantities
    const updatedVariants = variants.map((v) => ({
      ...v,
      ProductCode: cleanCode,
      ActualPrice: Number(v.ActualPrice) >= 0 ? Number(v.ActualPrice) : 0,
      SellingPrice: Number(v.SellingPrice) >= 0 ? Number(v.SellingPrice) : 0,
      CurrentStock: Math.max(0, Number(v.CurrentStock) || 0),
      MinimumStock: Math.max(0, Number(v.MinimumStock) || 0),
    }));

    const updatedProduct: Product = {
      ...product,
      ProductCode: cleanCode,
      ProductName: cleanName,
      DressTypeID: dressTypeId || product.DressTypeID,
      Brand: brand.trim() || 'Girl Dress Shop',
      Description: description.trim(),
      Images: images,
      Variants: updatedVariants,
      ModifiedDate: new Date().toISOString(),
    };

    const res = updateProduct(updatedProduct);
    setIsSaving(false);

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
              <Shirt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-stone-900">
                Edit Product Information
              </h2>
              <p className="text-xs text-stone-500">
                Update product code, name, category, brand, and description
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Code */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Code / SKU <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                placeholder="e.g. GD001"
                className="w-full px-3 py-2 font-mono font-bold bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-rose-950"
              />
              <p className="text-[11px] text-stone-400 mt-0.5">
                Changing code will automatically update all {variants.length} variant SKUs
              </p>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Product Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Floral Princess Party Dress"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-stone-900"
              />
            </div>

            {/* Category / Dress Type */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Dress Category (Dress Type)
              </label>
              <select
                value={dressTypeId}
                onChange={(e) => setDressTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-stone-800 cursor-pointer"
              >
                {dressTypes.map((dt) => (
                  <option key={dt.DressTypeID} value={dt.DressTypeID}>
                    {dt.Name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Girl Dress Shop"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-stone-800"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description, fabric, features, care instructions..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 text-stone-800 leading-relaxed"
            />
          </div>

          {/* Images Section */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-rose-600" />
                  <span>Product Gallery ({images.length} photos)</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Select cover photo, attach photos from computer, or add via URL
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFiles}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingFiles ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload from PC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddUrlImage(!showAddUrlImage)}
                  className="px-2.5 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add URL</span>
                </button>
              </div>
            </div>

            {/* URL input drawer */}
            {showAddUrlImage && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/dress.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Caption (optional)"
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUrlImage(false)}
                    className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddUrlImage}
                    className="px-3 py-1 text-xs bg-rose-600 text-white rounded font-medium hover:bg-rose-700 cursor-pointer"
                  >
                    Attach Image
                  </button>
                </div>
              </div>
            )}

            {/* Images Grid */}
            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.ImageID || idx}
                    className={`relative rounded-xl border-2 overflow-hidden group bg-stone-100 ${
                      img.IsPrimary ? 'border-rose-600 ring-2 ring-rose-200' : 'border-stone-200'
                    }`}
                  >
                    <div className="h-24 w-full">
                      <img
                        src={img.ImageURL}
                        alt={img.Caption || 'Product'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {img.IsPrimary && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-600 text-white rounded shadow-2xs">
                        Primary Cover
                      </span>
                    )}

                    <div className="p-1.5 bg-white flex items-center justify-between text-[11px] border-t border-stone-100">
                      {!img.IsPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          className="text-stone-500 hover:text-rose-600 font-medium text-[10px] cursor-pointer"
                        >
                          Make Cover
                        </button>
                      ) : (
                        <span className="text-rose-600 font-bold text-[10px]">Cover</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteImage(idx)}
                        className="text-stone-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-stone-400 text-xs">
                No images attached. Upload from computer or add an image URL.
              </div>
            )}
          </div>

          {/* Variants Quick Overview & Multi-Item Adjustment */}
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-rose-600" />
                  <span>Adjust Variants: Cost, Selling Price & Stock ({variants.length} items)</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Simultaneously adjust wholesale cost, selling prices, and stock quantities with automated inventory deductions
                </p>
              </div>

              <div className="flex items-center gap-2">
                {totalStockDelta !== 0 && (
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono-numbers font-bold ${
                      totalStockDelta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Net Stock: {totalStockDelta > 0 ? `+${totalStockDelta}` : totalStockDelta} units
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowBulkTools(!showBulkTools)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showBulkTools ? 'Hide Bulk Tools' : 'Bulk Adjust Tools'}</span>
                </button>
              </div>
            </div>

            {/* Bulk Adjustment Toolbar */}
            {showBulkTools && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 animate-fadeIn text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                  <span>Bulk Apply to All Variants</span>
                  <span className="text-[10px] text-stone-400 font-normal">Apply values in one click across all sizes/colors</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-600 font-medium">Cost $:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 18.00"
                      value={bulkCost}
                      onChange={(e) => setBulkCost(e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-stone-300 rounded text-xs font-mono-numbers"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkCost}
                      className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded font-semibold text-[11px] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-600 font-medium">Sell $:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 38.00"
                      value={bulkSelling}
                      onChange={(e) => setBulkSelling(e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-stone-300 rounded text-xs font-mono-numbers"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkSelling}
                      className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded font-semibold text-[11px] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-stone-600 font-medium">Stock:</span>
                    <button
                      type="button"
                      onClick={() => handleBulkStockDelta(-1)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold text-[11px] cursor-pointer"
                    >
                      -1 All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStockDelta(1)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] cursor-pointer"
                    >
                      +1 All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStockDelta(5)}
                      className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] cursor-pointer"
                    >
                      +5 All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Variants Multi-Item Table */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Size (Order by #)</th>
                    <th className="py-2.5 px-3">Color</th>
                    <th className="py-2.5 px-3 text-center">Stock (Qty)</th>
                    <th className="py-2.5 px-3">Cost Basis ($)</th>
                    <th className="py-2.5 px-3">Selling Price ($)</th>
                    <th className="py-2.5 px-3 text-right">Unit Margin</th>
                    <th className="py-2.5 px-3 text-center">Min Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {[...variants]
                    .sort((a, b) => {
                      const sizeDiff = compareSizes(a.Size, b.Size);
                      if (sizeDiff !== 0) return sizeDiff;
                      return a.Color.localeCompare(b.Color);
                    })
                    .map((v) => {
                      const orig = originalVariants.get(v.VariantID);
                      const origStock = orig ? orig.CurrentStock : v.CurrentStock;
                      const stockDiff = v.CurrentStock - origStock;
                      const profit = v.SellingPrice - v.ActualPrice;
                      const marginPct = v.ActualPrice > 0 ? (profit / v.ActualPrice) * 100 : 0;

                      return (
                        <tr key={v.VariantID} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-2 px-3 font-semibold text-stone-900 font-mono-numbers">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200">
                              {v.Size}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-stone-700 font-medium">{v.Color}</td>

                          {/* Editable Stock Quantity with Quick Increment / Decrement */}
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleVariantFieldChange(v.VariantID, 'CurrentStock', Math.max(0, v.CurrentStock - 1))
                                }
                                className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer text-xs"
                                title="Deduct 1 unit"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={v.CurrentStock}
                                onChange={(e) =>
                                  handleVariantFieldChange(
                                    v.VariantID,
                                    'CurrentStock',
                                    Math.max(0, parseInt(e.target.value, 10) || 0)
                                  )
                                }
                                className="w-14 px-1.5 py-1 text-center bg-stone-50 border border-stone-200 rounded font-mono-numbers font-bold text-xs focus:bg-white focus:ring-1 focus:ring-rose-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleVariantFieldChange(v.VariantID, 'CurrentStock', v.CurrentStock + 1)
                                }
                                className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center cursor-pointer text-xs"
                                title="Add 1 unit"
                              >
                                +
                              </button>

                              {/* Delta visual indicator */}
                              {stockDiff !== 0 && (
                                <span
                                  className={`px-1 py-0.2 rounded text-[10px] font-mono-numbers font-bold ${
                                    stockDiff > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                  title={`Original was ${origStock} units`}
                                >
                                  {stockDiff > 0 ? `+${stockDiff}` : stockDiff}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Editable Cost Price (ActualPrice) */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-stone-400 text-[11px]">$</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                value={v.ActualPrice}
                                onChange={(e) =>
                                  handleVariantFieldChange(
                                    v.VariantID,
                                    'ActualPrice',
                                    Math.max(0, parseFloat(e.target.value) || 0)
                                  )
                                }
                                className="w-22 pl-5 pr-1.5 py-1 bg-stone-50 border border-stone-200 rounded text-xs text-stone-700 focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono-numbers"
                              />
                            </div>
                          </td>

                          {/* Editable Selling Price (SellingPrice) */}
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-rose-400 text-[11px]">$</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                value={v.SellingPrice}
                                onChange={(e) =>
                                  handleVariantFieldChange(
                                    v.VariantID,
                                    'SellingPrice',
                                    Math.max(0, parseFloat(e.target.value) || 0)
                                  )
                                }
                                className="w-22 pl-5 pr-1.5 py-1 bg-stone-50 border border-stone-200 rounded text-xs font-bold text-rose-700 focus:bg-white focus:ring-1 focus:ring-rose-500 font-mono-numbers"
                              />
                            </div>
                          </td>

                          {/* Real-time Profit Preview */}
                          <td className="py-2 px-3 text-right font-mono-numbers">
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              +${profit.toFixed(2)}
                            </span>
                            <span className="text-stone-400 text-[10px] ml-1">
                              ({marginPct.toFixed(0)}%)
                            </span>
                          </td>

                          {/* Editable Minimum Stock Alert */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={v.MinimumStock}
                              onChange={(e) =>
                                handleVariantFieldChange(
                                  v.VariantID,
                                  'MinimumStock',
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                )
                              }
                              className="w-12 px-1 py-1 text-center bg-stone-50 border border-stone-200 rounded text-xs text-stone-600 focus:bg-white font-mono-numbers"
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200">
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
