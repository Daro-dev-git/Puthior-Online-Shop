import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductImage } from '../../types';
import { processLocalImageFile } from '../../utils/imageUtils';
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  Shirt,
  Layers,
  Sparkles,
} from 'lucide-react';

interface EditProductModalProps {
  productId: string;
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ productId, onClose }) => {
  const { products, dressTypes, updateProduct, showToast } = useStore();
  const product = products.find((p) => p.ProductID === productId);

  // Form states
  const [productCode, setProductCode] = useState(product?.ProductCode || '');
  const [productName, setProductName] = useState(product?.ProductName || '');
  const [dressTypeId, setDressTypeId] = useState(product?.DressTypeID || '');
  const [brand, setBrand] = useState(product?.Brand || 'Girl Dress Shop');
  const [description, setDescription] = useState(product?.Description || '');
  const [images, setImages] = useState<ProductImage[]>(product?.Images ? [...product.Images] : []);

  // Variant editing (prices)
  const [variants, setVariants] = useState(product?.Variants ? [...product.Variants] : []);

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

  const handleVariantPriceChange = (variantId: string, field: 'SellingPrice' | 'ActualPrice', val: number) => {
    setVariants((prev) =>
      prev.map((v) => (v.VariantID === variantId ? { ...v, [field]: Math.max(0, val) } : v))
    );
  };

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

    // Synchronize variant product codes if product code changed
    const updatedVariants = variants.map((v) => ({
      ...v,
      ProductCode: cleanCode,
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

          {/* Variants Quick Overview */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-rose-600" />
                <span>Existing Variants ({variants.length} items)</span>
              </h3>
              <span className="text-[11px] text-stone-500 font-mono-numbers">
                Total Stock: {variants.reduce((s, v) => s + v.CurrentStock, 0)} units
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Size</th>
                    <th className="py-2 px-3">Color</th>
                    <th className="py-2 px-3 text-center">Current Stock</th>
                    <th className="py-2 px-3">Cost ($)</th>
                    <th className="py-2 px-3">Selling Price ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {variants.map((v) => (
                    <tr key={v.VariantID} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-semibold text-stone-900">{v.Size}</td>
                      <td className="py-2 px-3 text-stone-700">{v.Color}</td>
                      <td className="py-2 px-3 text-center font-mono-numbers">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            v.CurrentStock === 0
                              ? 'bg-rose-100 text-rose-700'
                              : v.CurrentStock <= 5
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {v.CurrentStock}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.ActualPrice}
                          onChange={(e) =>
                            handleVariantPriceChange(v.VariantID, 'ActualPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 bg-white border border-stone-200 rounded text-xs text-stone-700 focus:ring-1 focus:ring-rose-500 font-mono-numbers"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.SellingPrice}
                          onChange={(e) =>
                            handleVariantPriceChange(v.VariantID, 'SellingPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 bg-white border border-stone-200 rounded text-xs font-bold text-rose-700 focus:ring-1 focus:ring-rose-500 font-mono-numbers"
                        />
                      </td>
                    </tr>
                  ))}
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
