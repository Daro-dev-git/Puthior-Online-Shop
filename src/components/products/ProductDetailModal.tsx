import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductVariant, ProductImage } from '../../types';
import { processLocalImageFile } from '../../utils/imageUtils';
import { compareSizes } from '../../utils/sizeUtils';
import { VariantEditModal } from './VariantEditModal';
import { AddVariantModal } from './AddVariantModal';
import { EditProductModal } from './EditProductModal';
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
  Palette,
  Check,
} from 'lucide-react';

interface ProductDetailModalProps {
  productId: string;
  onClose: () => void;
  onOpenRestock: (code: string, size?: string, color?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ productId, onClose, onOpenRestock }) => {
  const { products, updateProduct, deleteProduct, getDressTypeName, transactions, isAdmin, showToast, colors } = useStore();
  const product = products.find((p) => p.ProductID === productId);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [showAddImage, setShowAddImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'variants' | 'history'>('variants');
  const [isAttachingLocal, setIsAttachingLocal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [selectedVariantColor, setSelectedVariantColor] = useState<string>('all');
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

  // Requirement #3: Color list of distinct colors in variants for selection
  const availableVariantColors = useMemo(() => {
    if (!product) return [];
    const map = new Map<string, { count: number; inStock: number }>();
    product.Variants.forEach((v) => {
      const existing = map.get(v.Color) || { count: 0, inStock: 0 };
      map.set(v.Color, {
        count: existing.count + 1,
        inStock: existing.inStock + v.CurrentStock,
      });
    });
    return Array.from(map.entries()).map(([colorName, data]) => {
      const colorDef = colors.find((c) => c.ColorName.toLowerCase() === colorName.toLowerCase());
      return {
        colorName,
        count: data.count,
        inStock: data.inStock,
        hexCode: colorDef?.HexCode || colorName.toLowerCase(),
      };
    });
  }, [product, colors]);

  // Requirements #2 & #3: Filter by selected color & strictly order by size number
  const filteredAndSortedVariants = useMemo(() => {
    if (!product) return [];
    const list = product.Variants.filter((v) => {
      if (selectedVariantColor === 'all') return true;
      return v.Color.trim().toLowerCase() === selectedVariantColor.trim().toLowerCase();
    });

    return list.sort((a, b) => {
      const sizeComparison = compareSizes(a.Size, b.Size);
      if (sizeComparison !== 0) return sizeComparison;
      return a.Color.localeCompare(b.Color);
    });
  }, [product, selectedVariantColor]);

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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowEditProductModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit Product Code, Name, Category, Brand, Description"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Product</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                    <Shirt className="w-12 h-12 mb-2 stroke-1" />
                    <span className="text-xs">No Photo Attached</span>
                  </div>
                )}

                {currentDisplayImage?.IsPrimary && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded shadow-xs">
                    Primary Cover
                  </span>
                )}
              </div>

              {/* Thumbnails list */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {productImages.map((img, idx) => (
                  <button
                    key={img.ImageID}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-14 rounded-md overflow-hidden border-2 shrink-0 transition-all cursor-pointer relative ${
                      activeImageIndex === idx ? 'border-rose-600 ring-2 ring-rose-200' : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {img.ImageURL ? (
                      <img src={img.ImageURL} alt={img.Caption || 'thumbnail'} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                        <Shirt className="w-5 h-5" />
                      </div>
                    )}
                  </button>
                ))}

                {/* Upload from Computer Trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLocalFileSelect}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAttachingLocal}
                  title="Attach Photo from Computer"
                  className="w-14 h-14 rounded-md border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/50 hover:bg-rose-50 text-rose-700 flex flex-col items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isAttachingLocal ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[9px] font-bold">Local</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowAddImage(true)}
                  title="Add Image via Web URL"
                  className="w-14 h-14 rounded-md border-2 border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 hover:bg-stone-100 flex flex-col items-center justify-center text-stone-500 shrink-0 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px]">URL</span>
                </button>
              </div>

              {/* Gallery Image Actions */}
              {product.Images.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-1">
                  {!currentDisplayImage.IsPrimary ? (
                    <button
                      onClick={() => handleSetPrimary(activeImageIndex)}
                      className="text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Make Primary Cover
                    </button>
                  ) : (
                    <span className="text-emerald-600 font-medium text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Current Primary Cover
                    </span>
                  )}

                  {product.Images.length > 1 && (
                    <button
                      onClick={() => handleDeleteImage(activeImageIndex)}
                      className="text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Image
                    </button>
                  )}
                </div>
              )}

              {/* Add image form */}
              {showAddImage && (
                <form onSubmit={handleAddImage} className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2 text-xs">
                  <div className="font-semibold text-stone-700">Add Image URL</div>
                  <input
                    type="url"
                    placeholder="https://example.com/dress.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                  <input
                    type="text"
                    placeholder="Caption (e.g. Back view, Detail embroidery)"
                    value={newImageCaption}
                    onChange={(e) => setNewImageCaption(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded text-xs focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddImage(false)}
                      className="px-2.5 py-1 text-stone-500 hover:text-stone-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 cursor-pointer"
                    >
                      Save Image
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Overview Details Column */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  Product Description
                </h4>
                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200">
                  {product.Description || 'No detailed description specified.'}
                </p>
              </div>

              {/* Master specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Dress Category</span>
                  <span className="font-semibold text-stone-800">{dressTypeName}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Brand Name</span>
                  <span className="font-semibold text-stone-800">{product.Brand}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-stone-400 block text-[11px]">Available Variants</span>
                  <span className="font-semibold text-stone-800 font-mono-numbers">
                    {product.Variants.length} distinct items
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-100 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-rose-900">
                  <span className="font-bold font-mono-numbers">{totalStock}</span> total items across all sizes and colors
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenRestock(product.ProductCode)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Receive Stock (Stock IN)</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setShowAddVariant(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Variant</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-stone-200 flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('variants')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'variants'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Variant Matrix & Stock Levels ({product.Variants.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Inventory History Log ({productTransactions.length})</span>
            </button>
          </div>

          {/* Tab 1: Variant Matrix Table (Requirements #2 and #3) */}
          {activeTab === 'variants' && (
            <div className="space-y-3.5">
              {/* Color Filter & Related Colors Toolbar */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Filter Variants by Color:
                    </span>
                    <span className="text-[11px] text-stone-500 font-mono-numbers">
                      ({availableVariantColors.length} distinct {availableVariantColors.length === 1 ? 'color' : 'colors'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {selectedVariantColor !== 'all' && (
                      <button
                        onClick={() => setSelectedVariantColor('all')}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer self-start sm:self-auto"
                      >
                        Reset / Show All Colors
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setShowEditProductModal(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100/70 hover:bg-rose-200 border border-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Simultaneously adjust wholesale cost, retail selling price, and stock quantities across multiple items"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Adjust Multi-Variants (Cost, Selling & Qty)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Color Pills Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* All Colors Pill */}
                  <button
                    type="button"
                    onClick={() => setSelectedVariantColor('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      selectedVariantColor === 'all'
                        ? 'bg-rose-950 text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                    }`}
                  >
                    <span>All Colors</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers ${
                        selectedVariantColor === 'all' ? 'bg-rose-800 text-white' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {product.Variants.length}
                    </span>
                  </button>

                  {/* Individual Color Pills */}
                  {availableVariantColors.map((c) => {
                    const isSelected = selectedVariantColor.toLowerCase() === c.colorName.toLowerCase();
                    return (
                      <button
                        key={c.colorName}
                        type="button"
                        onClick={() => setSelectedVariantColor(isSelected ? 'all' : c.colorName)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-100 text-rose-950 border-2 border-rose-500 ring-2 ring-rose-200 shadow-xs font-bold'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.hexCode }}
                        />
                        <span>{c.colorName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono-numbers ${
                            isSelected ? 'bg-rose-200 text-rose-900 font-bold' : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {c.count} {c.count === 1 ? 'size' : 'sizes'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Related Colors Context Banner (Requirement #3) */}
                {selectedVariantColor !== 'all' && (
                  <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-stone-700">
                      Showing variants for color <span className="font-bold text-rose-900">{selectedVariantColor}</span>{' '}
                      (<span className="font-mono-numbers font-semibold">{filteredAndSortedVariants.length}</span> sizes, ordered by size number).
                    </div>
                    {availableVariantColors.filter((c) => c.colorName.toLowerCase() !== selectedVariantColor.toLowerCase()).length > 0 && (
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                        <span className="font-medium text-stone-600">Other related colors:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {availableVariantColors
                            .filter((c) => c.colorName.toLowerCase() !== selectedVariantColor.toLowerCase())
                            .map((rc) => (
                              <button
                                key={rc.colorName}
                                type="button"
                                onClick={() => setSelectedVariantColor(rc.colorName)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-300 text-stone-700 hover:text-rose-800 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                                title={`Switch to ${rc.colorName}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full border border-stone-300"
                                  style={{ backgroundColor: rc.hexCode }}
                                />
                                <span>{rc.colorName}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Variant Matrix Table */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Size (Ordered by Number)</th>
                      <th className="py-2.5 px-3">Color</th>
                      <th className="py-2.5 px-3 text-right">Cost (Actual)</th>
                      <th className="py-2.5 px-3 text-right">Selling Price</th>
                      <th className="py-2.5 px-3 text-center">Min Stock</th>
                      <th className="py-2.5 px-3 text-center">On Hand</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAndSortedVariants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-500 text-xs">
                          No variants found matching color "{selectedVariantColor}".
                          <button
                            onClick={() => setSelectedVariantColor('all')}
                            className="ml-2 text-rose-600 font-semibold underline cursor-pointer"
                          >
                            Show All Colors
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedVariants.map((v) => {
                        const isLow = v.CurrentStock <= v.MinimumStock && v.CurrentStock > 0;
                        const isOut = v.CurrentStock === 0;

                        return (
                          <tr key={v.VariantID} className="hover:bg-stone-50/70">
                            <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                              <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                                {v.Size}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-stone-300"
                                  style={{
                                    backgroundColor:
                                      colors.find((c) => c.ColorName.toLowerCase() === v.Color.toLowerCase())?.HexCode ||
                                      v.Color.toLowerCase(),
                                  }}
                                />
                                {v.Color}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-numbers text-stone-600">
                              ${v.ActualPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-stone-900">
                              ${v.SellingPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono-numbers text-stone-500">
                              {v.MinimumStock}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`font-mono-numbers font-bold px-2 py-0.5 rounded text-[11px] ${
                                  isOut
                                    ? 'bg-rose-100 text-rose-800 font-bold'
                                    : isLow
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {v.CurrentStock}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isOut ? (
                                <span className="text-[10px] font-bold text-rose-600 uppercase">Out of stock</span>
                              ) : isLow ? (
                                <span className="text-[10px] font-bold text-amber-600 uppercase">Low alert</span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Available</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => onOpenRestock(product.ProductCode, v.Size, v.Color)}
                                  title="Add stock for this size/color"
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => setEditingVariant(v)}
                                    title="Edit variant prices & adjust stock count"
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Inventory History Log */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {productTransactions.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-lg text-xs text-stone-500">
                  No stock transactions recorded for this product yet.
                </div>
              ) : (
                <div className="border border-stone-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Size / Color</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Selling Price</th>
                        <th className="py-2.5 px-3">Notes</th>
                        <th className="py-2.5 px-3">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {productTransactions.map((tx) => {
                        const isStockIn =
                          tx.TransactionType === 'Stock Received' ||
                          tx.TransactionType === 'Purchase' ||
                          tx.TransactionType === 'Customer Return' ||
                          tx.TransactionType === 'Adjustment IN';

                        return (
                          <tr key={tx.TransactionID} className="hover:bg-stone-50/70">
                            <td className="py-2.5 px-3 font-mono text-stone-500">
                              {new Date(tx.TransactionDate).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isStockIn
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {tx.TransactionType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-stone-800">
                              Size {tx.Size} · {tx.Color}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-numbers font-bold">
                              {isStockIn ? `+${tx.Quantity}` : `-${tx.Quantity}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-numbers text-stone-600">
                              ${tx.SellingPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-stone-600">{tx.Notes || '-'}</td>
                            <td className="py-2.5 px-3 text-stone-500">{tx.CreatedBy}</td>
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

      {/* Edit Product General Info Modal */}
      {showEditProductModal && (
        <EditProductModal
          productId={product.ProductID}
          onClose={() => setShowEditProductModal(false)}
        />
      )}
    </div>
  );
};
