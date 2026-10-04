import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductVariant, ProductImage } from '../../types';
import { processLocalImageFile } from '../../utils/imageUtils';
import { VariantEditModal } from './VariantEditModal';
import { AddVariantModal } from './AddVariantModal';
import {
  X,
  Shirt,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Upload,
  Loader2,
  SlidersHorizontal,
  Edit2,
} from 'lucide-react';

interface ProductDetailModalProps {
  productId: string;
  onClose: () => void;
  onOpenRestock: (code: string, size?: string, color?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ productId, onClose, onOpenRestock }) => {
  const { products, updateProduct, deleteProduct, getDressTypeName, transactions, isAdmin, showToast } = useStore();
  const product = products.find((p) => p.ProductID === productId);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showAddImage, setShowAddImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'variants' | 'history'>('variants');
  const [isAttachingLocal, setIsAttachingLocal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!product) return null;

  const dressTypeName = getDressTypeName(product.DressTypeID);
  const productImages = product.Images.length > 0 ? product.Images : [
    { ImageID: 'fallback', ProductID: product.ProductID, ImageURL: '', IsPrimary: true, Caption: 'Default View' }
  ];

  const currentDisplayImage = productImages[activeImageIndex] || productImages[0];

  // Specific transaction history for this product
  const productTransactions = transactions.filter(
    (t) => t.ProductCode.trim().toUpperCase() === product.ProductCode.trim().toUpperCase()
  );

  const totalStock = product.Variants.reduce((sum, v) => sum + v.CurrentStock, 0);

  // Handle local image attachment from computer
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAttachingLocal(true);
    try {
      const newImages: ProductImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const processed = await processLocalImageFile(file);
        newImages.push({
          ImageID: `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          ProductID: product.ProductID,
          ImageURL: processed.dataUrl,
          IsPrimary: product.Images.length === 0 && i === 0,
          Caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        });
      }

      if (newImages.length > 0) {
        const updatedImages = [...product.Images, ...newImages];
        if (!updatedImages.some((img) => img.IsPrimary)) {
          updatedImages[0].IsPrimary = true;
        }
        updateProduct({ ...product, Images: updatedImages });
        setActiveImageIndex(updatedImages.length - 1);
        showToast(`Attached ${newImages.length} image(s) from your computer`);
      }
    } catch {
      showToast('Error attaching local image', 'error');
    } finally {
      setIsAttachingLocal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Set primary image
  const handleSetPrimary = (index: number) => {
    const updatedImages = product.Images.map((img, idx) => ({
      ...img,
      IsPrimary: idx === index,
    }));
    updateProduct({ ...product, Images: updatedImages });
    setActiveImageIndex(index);
    showToast('Primary image updated');
  };

  // Add new image from URL
  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    const newImg: ProductImage = {
      ImageID: `img-${Date.now()}`,
      ProductID: product.ProductID,
      ImageURL: newImageUrl.trim(),
      IsPrimary: product.Images.length === 0,
      Caption: newImageCaption.trim() || 'Product angle',
    };

    const updatedImages = [...product.Images, newImg];
    updateProduct({ ...product, Images: updatedImages });
    setNewImageUrl('');
    setNewImageCaption('');
    setShowAddImage(false);
    setActiveImageIndex(updatedImages.length - 1);
    showToast('New image added to product gallery');
  };

  // Delete image
  const handleDeleteImage = (index: number) => {
    if (product.Images.length <= 1) {
      showToast('Product must retain at least one image', 'error');
      return;
    }
    const updatedImages = product.Images.filter((_, idx) => idx !== index);
    if (updatedImages.length > 0 && !updatedImages.some((img) => img.IsPrimary)) {
      updatedImages[0].IsPrimary = true;
    }
    updateProduct({ ...product, Images: updatedImages });
    setActiveImageIndex(0);
    showToast('Image removed from gallery');
  };

  // Update variant inline
  const handleVariantPriceChange = (variantId: string, field: 'ActualPrice' | 'SellingPrice' | 'MinimumStock', value: number) => {
    const updatedVariants = product.Variants.map((v) =>
      v.VariantID === variantId ? { ...v, [field]: value } : v
    );
    updateProduct({ ...product, Variants: updatedVariants });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-100 text-rose-800 rounded">
              {product.ProductCode}
            </span>
            <div>
              <h2 className="text-lg font-bold font-display text-stone-900">{product.ProductName}</h2>
              <div className="text-xs text-stone-500">
                {dressTypeName} · Brand: {product.Brand} · Total Stock: {totalStock} units
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top section: Gallery + Basic Overview */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Gallery Column */}
            <div className="md:col-span-5 space-y-3">
              {/* Main Image Display */}
              <div className="w-full h-64 sm:h-72 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 relative group">
                {currentDisplayImage?.ImageURL ? (
                  <img
                    src={currentDisplayImage.ImageURL}
                    alt={product.ProductName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                    <Shirt className="w-12 h-12 stroke-[1.2]" />
                    <span className="text-xs mt-2">No image uploaded</span>
                  </div>
                )}
                {currentDisplayImage?.IsPrimary && (
                  <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                    Primary Image
                  </span>
                )}
              </div>

              {/* Thumbnails row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.Images.map((img, idx) => (
                  <div key={img.ImageID} className="relative group shrink-0">
                    <button
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                        activeImageIndex === idx ? 'border-rose-600 ring-2 ring-rose-200' : 'border-stone-200'
                      }`}
                    >
                      <img src={img.ImageURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                    {isAdmin && (
                      <div className="absolute -top-1 -right-1 hidden group-hover:flex items-center gap-0.5 bg-stone-900/90 text-white rounded p-0.5">
                        {!img.IsPrimary && (
                          <button
                            title="Set as Primary"
                            onClick={() => handleSetPrimary(idx)}
                            className="p-1 hover:text-emerald-400"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          title="Delete image"
                          onClick={() => handleDeleteImage(idx)}
                          className="p-1 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Hidden input for local computer file upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLocalFileSelect}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAttachingLocal}
                    className="w-14 h-14 rounded-md border border-dashed border-rose-300 bg-rose-50/60 hover:bg-rose-100/80 hover:border-rose-500 flex flex-col items-center justify-center text-rose-700 transition-colors shrink-0 text-[10px] font-medium"
                    title="Attach Photos from Local Computer"
                  >
                    {isAttachingLocal ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="leading-tight text-[9px] mt-0.5">Computer</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => setShowAddImage(!showAddImage)}
                    className="w-14 h-14 rounded-md border border-dashed border-stone-300 hover:border-stone-500 hover:bg-stone-100 flex flex-col items-center justify-center text-stone-500 hover:text-stone-800 transition-colors shrink-0 text-[10px]"
                    title="Attach by URL"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px]">URL</span>
                  </button>
                )}
              </div>

              {/* Add Image Inline Form */}
              {showAddImage && (
                <form onSubmit={handleAddImage} className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-2">
                  <div className="font-semibold text-stone-800">Attach New Product Image</div>
                  <input
                    type="url"
                    placeholder="Image URL (or paste data URI)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Caption (e.g. Back view, Close-up embroidery)"
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddImage(false)}
                      className="px-2 py-1 text-stone-600 hover:bg-stone-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium"
                    >
                      Save Image
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Product Metadata Details */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Description
                </h3>
                <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
                  {product.Description || 'No detailed description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Category</span>
                  <span className="font-semibold text-stone-800">{dressTypeName}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Brand Label</span>
                  <span className="font-semibold text-stone-800">{product.Brand}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Created Date</span>
                  <span className="font-mono text-stone-800">{product.CreatedDate}</span>
                </div>
                <div className="bg-stone-50 p-2.5 rounded border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Status</span>
                  <span className="font-semibold text-emerald-700 capitalize">{product.Status}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onOpenRestock(product.ProductCode)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Receive Stock (Inventory IN)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs: Variants vs Inventory History */}
          <div className="border-b border-stone-200 flex items-center gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('variants')}
              className={`pb-2 transition-colors relative ${
                activeTab === 'variants'
                  ? 'text-rose-700 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-rose-600'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Variant Matrix ({product.Variants.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'text-rose-700 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-rose-600'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Stock Movement Audit ({productTransactions.length})</span>
            </button>
          </div>

          {/* Section 6 & 9: Variant Matrix Table */}
          {activeTab === 'variants' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
                <span>Unique inventory keys: Product Code + Size + Color</span>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddVariant(true)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Variant</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-stone-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Color</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {isAdmin && <th className="py-2.5 px-3 text-right">Actual Price</th>}
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                      {isAdmin && <th className="py-2.5 px-3 text-right">Profit</th>}
                      {isAdmin && <th className="py-2.5 px-3 text-right">Margin %</th>}
                      <th className="py-2.5 px-3 text-center">Stock</th>
                      <th className="py-2.5 px-3 text-center">Min Stock</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {product.Variants.map((v) => {
                      const profit = v.SellingPrice - v.ActualPrice;
                      const marginPct = v.ActualPrice > 0 ? (profit / v.ActualPrice) * 100 : 0;
                      const isLow = v.CurrentStock <= v.MinimumStock;
                      const isOut = v.CurrentStock === 0;

                      return (
                        <tr key={v.VariantID} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-stone-900 font-mono-numbers">
                            {v.Size}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-medium text-stone-800">{v.Color}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                v.Status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-stone-200 text-stone-600'
                              }`}
                            >
                              {v.Status}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-right font-mono-numbers font-medium text-stone-600">
                              ${v.ActualPrice.toFixed(2)}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right font-mono-numbers font-semibold text-stone-900">
                            ${v.SellingPrice.toFixed(2)}
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-right font-mono-numbers font-medium text-emerald-700">
                              +${profit.toFixed(2)}
                            </td>
                          )}
                          {isAdmin && (
                            <td className="py-2.5 px-3 text-right font-mono-numbers text-stone-600">
                              {marginPct.toFixed(1)}%
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono-numbers font-bold text-xs ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {v.CurrentStock}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono-numbers text-stone-500">
                            {v.MinimumStock}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setEditingVariant(v)}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit variant details & stock adjustment"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Edit / Adjust</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenRestock(product.ProductCode, v.Size, v.Color)}
                                className="text-[11px] font-medium text-stone-700 hover:text-stone-900 px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                                title="Quick stock receive"
                              >
                                + IN
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 32: Complete Product Stock Movement Audit Trail */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-xs text-stone-500">
                Audit log for Product Code <strong>{product.ProductCode}</strong>. Every IN & OUT movement is preserved.
              </div>

              {productTransactions.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-lg text-xs text-stone-500">
                  No stock transactions recorded for this product yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Size / Color</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3">Ref / Notes</th>
                        <th className="py-2.5 px-3">User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {productTransactions.map((tx) => {
                        const isIN = ['Purchase', 'Stock Received', 'Customer Return', 'Adjustment IN'].includes(
                          tx.TransactionType
                        );
                        return (
                          <tr key={tx.TransactionID} className="hover:bg-stone-50/70">
                            <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">
                              {new Date(tx.TransactionDate).toLocaleString('en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                  isIN ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {isIN ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                                {tx.TransactionType}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-semibold">{tx.Size}</span> · {tx.Color}
                            </td>
                            <td
                              className={`py-2 px-3 text-center font-mono-numbers font-bold ${
                                isIN ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isIN ? `+${tx.Quantity}` : `-${tx.Quantity}`}
                            </td>
                            <td className="py-2 px-3 text-stone-600 max-w-xs truncate">
                              {tx.Supplier || tx.CustomerName ? `${tx.Supplier || tx.CustomerName} · ` : ''}
                              {tx.Notes}
                            </td>
                            <td className="py-2 px-3 text-stone-500 text-[11px]">{tx.CreatedBy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-xs text-stone-500">Product ID: {product.ProductID}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Variant Edit & Stock Adjustment Modal */}
      {editingVariant && (
        <VariantEditModal
          productId={product.ProductID}
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
        />
      )}

      {/* Add New Variant Modal */}
      {showAddVariant && (
        <AddVariantModal
          productId={product.ProductID}
          productCode={product.ProductCode}
          onClose={() => setShowAddVariant(false)}
        />
      )}
    </div>
  );
};
