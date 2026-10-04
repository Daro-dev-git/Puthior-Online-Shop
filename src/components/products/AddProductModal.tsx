import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductVariant, ProductImage } from '../../types';
import { processLocalImageFile } from '../../utils/imageUtils';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface AttachedLocalImage {
  id: string;
  dataUrl: string;
  name: string;
  isPrimary: boolean;
  caption: string;
}

interface AddProductModalProps {
  onClose: () => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ onClose }) => {
  const { dressTypes, sizes, colors, addProduct, settings, showToast } = useStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Form fields
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [dressTypeId, setDressTypeId] = useState(dressTypes[0]?.DressTypeID || '');
  const [brand, setBrand] = useState('Girl Dress Shop');
  const [description, setDescription] = useState('');
  const [mainImageUrl, setMainImageUrl] = useState('');

  // Local Computer Attached Images
  const [attachedImages, setAttachedImages] = useState<AttachedLocalImage[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2 Matrix Generator state
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['90', '100', '110']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['Pink', 'Blue']);
  const [defaultActualPrice, setDefaultActualPrice] = useState<number>(15);
  const [defaultSellingPrice, setDefaultSellingPrice] = useState<number>(26);
  const [defaultInitialStock, setDefaultInitialStock] = useState<number>(10);
  const [defaultMinStock, setDefaultMinStock] = useState<number>(settings.LowStockThreshold || 5);

  const [generatedVariants, setGeneratedVariants] = useState<
    Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>[]
  >([]);

  // Handle local files selected from computer
  const handleProcessFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    try {
      const newItems: AttachedLocalImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const processed = await processLocalImageFile(file);
        newItems.push({
          id: `local-img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          dataUrl: processed.dataUrl,
          name: file.name,
          isPrimary: attachedImages.length === 0 && i === 0,
          caption: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        });
      }
      if (newItems.length > 0) {
        setAttachedImages((prev) => {
          const combined = [...prev, ...newItems];
          if (!combined.some((img) => img.isPrimary)) {
            combined[0].isPrimary = true;
          }
          return combined;
        });
        showToast(`Attached ${newItems.length} photo(s) from your computer`);
      }
    } catch {
      showToast('Error processing local image file', 'error');
    } finally {
      setIsProcessingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleProcessFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setAttachedImages((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  };

  // Toggle size selection
  const handleToggleSize = (sizeVal: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sizeVal) ? prev.filter((s) => s !== sizeVal) : [...prev, sizeVal]
    );
  };

  // Toggle color selection
  const handleToggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  // Generate Matrix
  const handleGenerateMatrix = () => {
    if (selectedSizes.length === 0 || selectedColors.length === 0) {
      showToast('Select at least one size and one color to generate variants', 'error');
      return;
    }

    const newMatrix: Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>[] = [];

    // Sort sizes numerically if possible
    const sortedSizes = [...selectedSizes].sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
    });

    sortedSizes.forEach((sz) => {
      selectedColors.forEach((cl) => {
        newMatrix.push({
          Size: sz,
          Color: cl,
          ActualPrice: defaultActualPrice,
          SellingPrice: defaultSellingPrice,
          CurrentStock: defaultInitialStock,
          MinimumStock: defaultMinStock,
          Status: 'active',
        });
      });
    });

    setGeneratedVariants(newMatrix);
    showToast(`Generated ${newMatrix.length} variant combinations!`);
  };

  // Update single row in generated matrix
  const handleRowChange = (
    index: number,
    field: keyof Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>,
    value: any
  ) => {
    setGeneratedVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove row from matrix
  const handleRemoveRow = (index: number) => {
    setGeneratedVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Move to Step 2
  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = productCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Product Code is required', 'error');
      return;
    }
    if (!productName.trim()) {
      showToast('Product Name is required', 'error');
      return;
    }
    setStep(2);
    if (generatedVariants.length === 0) {
      handleGenerateMatrix();
    }
  };

  // Save new product
  const handleSaveProduct = () => {
    if (generatedVariants.length === 0) {
      showToast('Please add at least one product variant', 'error');
      return;
    }

    const cleanCode = productCode.trim().toUpperCase();

    // Map attached local images
    const images: ProductImage[] = attachedImages.map((img, idx) => ({
      ImageID: `img-${Date.now()}-${idx}`,
      ProductID: '',
      ImageURL: img.dataUrl,
      IsPrimary: img.isPrimary,
      Caption: img.caption || 'Dress photo',
    }));

    // Fallback if URL was typed and no local images
    if (images.length === 0 && mainImageUrl.trim()) {
      images.push({
        ImageID: `img-${Date.now()}-url`,
        ProductID: '',
        ImageURL: mainImageUrl.trim(),
        IsPrimary: true,
        Caption: 'Main view',
      });
    }

    if (images.length > 0 && !images.some((img) => img.IsPrimary)) {
      images[0].IsPrimary = true;
    }

    const variants: ProductVariant[] = generatedVariants.map((v, i) => ({
      ...v,
      VariantID: `var-${Date.now()}-${i}`,
      ProductID: '',
      ProductCode: cleanCode,
    }));

    const result = addProduct({
      ProductCode: cleanCode,
      ProductName: productName.trim(),
      Description: description.trim(),
      DressTypeID: dressTypeId,
      Brand: brand.trim(),
      Status: 'active',
      Images: images,
      Variants: variants,
    });

    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-display text-stone-900">Add New Girl Dress</h2>
            <div className="text-xs text-stone-500">
              {step === 1 ? 'Step 1: Basic Information & Master Attributes' : 'Step 2: Generate & Customize Variant Matrix'}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-2 bg-stone-100/70 border-b border-stone-200 flex items-center gap-3 text-xs">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'font-bold text-rose-700' : 'text-stone-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-rose-600 text-white' : 'bg-stone-300 text-stone-700'}`}>
              1
            </span>
            <span>Basic Info</span>
          </div>
          <span className="text-stone-300">→</span>
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'font-bold text-rose-700' : 'text-stone-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-rose-600 text-white' : 'bg-stone-300 text-stone-700'}`}>
              2
            </span>
            <span>Variant Matrix (Sizes & Colors)</span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <form id="step1-form" onSubmit={handleGoToStep2} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Product Code / SKU <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GD011"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  />
                  <span className="text-[11px] text-stone-400 mt-0.5 block">
                    Must be unique in store catalog
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Princess Butterfly Gala Dress"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Dress Type / Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dressTypeId}
                    onChange={(e) => setDressTypeId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  >
                    {dressTypes
                      .filter((d) => d.Status === 'active')
                      .map((d) => (
                        <option key={d.DressTypeID} value={d.DressTypeID}>
                          {d.Name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Petite Royale"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Local Computer Photo Attachment Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-900">
                    Product Photos (Attach from Local Computer)
                  </label>
                  <span className="text-[11px] text-stone-400 font-mono-numbers">
                    {attachedImages.length} photo(s) selected
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-rose-500 bg-rose-50/70'
                      : 'border-stone-300 hover:border-rose-400 bg-stone-50/60 hover:bg-stone-50'
                  }`}
                >
                  {isProcessingFiles ? (
                    <div className="flex flex-col items-center gap-2 text-rose-600 py-2">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-medium">Processing images from your computer...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2 shadow-2xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-stone-900">
                        Click to browse or drag & drop dress photos from your computer
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 max-w-sm">
                        Supports high-resolution PNG, JPG, and WEBP. You can select multiple images at once (front, back, details).
                      </p>
                    </>
                  )}
                </div>

                {/* Attached Local Images Previews */}
                {attachedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {attachedImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className={`relative rounded-lg overflow-hidden border-2 bg-stone-100 group ${
                          img.isPrimary ? 'border-rose-600 ring-2 ring-rose-200' : 'border-stone-200'
                        }`}
                      >
                        <div className="h-28 w-full overflow-hidden">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {img.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Primary
                          </span>
                        )}

                        <div className="p-1.5 bg-white text-[10px] space-y-1">
                          <div className="truncate font-medium text-stone-800" title={img.name}>
                            {img.name}
                          </div>
                          <div className="flex items-center justify-between pt-0.5 border-t border-stone-100">
                            {!img.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="text-rose-600 hover:text-rose-800 font-semibold"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="text-stone-400 hover:text-rose-600 ml-auto"
                              title="Remove image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Image URL Toggle */}
                <div className="pt-1">
                  <details className="text-[11px] text-stone-500">
                    <summary className="cursor-pointer hover:text-stone-800 font-medium">
                      Or use image web URL instead...
                    </summary>
                    <input
                      type="url"
                      placeholder="https://... image address"
                      value={mainImageUrl}
                      onChange={(e) => setMainImageUrl(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded text-xs focus:bg-white"
                    />
                  </details>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Fabric composition, cut, occasion, lining, and care instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Matrix Generator Controls */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Matrix Combinations Generator
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateMatrix}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Regenerate Matrix
                  </button>
                </div>

                {/* Size Checkboxes */}
                <div>
                  <span className="text-xs font-semibold text-stone-700 block mb-1.5">
                    1. Select Sizes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sizes.map((s) => {
                      const isChecked = selectedSizes.includes(s.SizeValue);
                      return (
                        <button
                          key={s.SizeID}
                          type="button"
                          onClick={() => handleToggleSize(s.SizeValue)}
                          className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
                            isChecked
                              ? 'bg-rose-600 text-white border-rose-600 font-bold'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {s.SizeValue}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Checkboxes */}
                <div>
                  <span className="text-xs font-semibold text-stone-700 block mb-1.5">
                    2. Select Colors:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => {
                      const isChecked = selectedColors.includes(c.ColorName);
                      return (
                        <button
                          key={c.ColorID}
                          type="button"
                          onClick={() => handleToggleColor(c.ColorName)}
                          className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 transition-all ${
                            isChecked
                              ? 'bg-rose-50 text-rose-900 border-rose-500 font-bold ring-1 ring-rose-300'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-stone-300 shrink-0"
                            style={{ backgroundColor: c.HexCode }}
                          />
                          <span>{c.ColorName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Batch Defaults */}
                <div className="pt-2 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-stone-500 block text-[11px] mb-1">Default Cost Price</label>
                    <input
                      type="number"
                      step="0.5"
                      value={defaultActualPrice}
                      onChange={(e) => setDefaultActualPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 block text-[11px] mb-1">Default Selling Price</label>
                    <input
                      type="number"
                      step="0.5"
                      value={defaultSellingPrice}
                      onChange={(e) => setDefaultSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 block text-[11px] mb-1">Initial Stock</label>
                    <input
                      type="number"
                      value={defaultInitialStock}
                      onChange={(e) => setDefaultInitialStock(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-stone-500 block text-[11px] mb-1">Min Alert Stock</label>
                    <input
                      type="number"
                      value={defaultMinStock}
                      onChange={(e) => setDefaultMinStock(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Variant Table */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-stone-800">
                    Generated Variants for {productCode} ({generatedVariants.length} Combinations)
                  </span>
                  <span className="text-stone-400 text-[11px]">
                    Customize prices or stock individually below before saving
                  </span>
                </div>

                <div className="overflow-x-auto border border-stone-200 rounded-lg max-h-64">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3">Color</th>
                        <th className="py-2 px-3 text-right">Actual Cost ($)</th>
                        <th className="py-2 px-3 text-right">Selling Price ($)</th>
                        <th className="py-2 px-3 text-right">Profit ($)</th>
                        <th className="py-2 px-3 text-center">Initial Stock</th>
                        <th className="py-2 px-3 text-center">Min Alert</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {generatedVariants.map((row, idx) => {
                        const profit = row.SellingPrice - row.ActualPrice;
                        return (
                          <tr key={idx} className="hover:bg-stone-50/70">
                            <td className="py-2 px-3 font-mono-numbers font-semibold text-stone-900">
                              {row.Size}
                            </td>
                            <td className="py-2 px-3 text-stone-800 font-medium">{row.Color}</td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.5"
                                value={row.ActualPrice}
                                onChange={(e) =>
                                  handleRowChange(idx, 'ActualPrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-0.5 text-right bg-white border border-stone-300 rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                step="0.5"
                                value={row.SellingPrice}
                                onChange={(e) =>
                                  handleRowChange(idx, 'SellingPrice', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-0.5 text-right bg-white border border-stone-300 rounded text-xs font-semibold"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono-numbers text-emerald-700 font-medium">
                              ${profit.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={row.CurrentStock}
                                onChange={(e) =>
                                  handleRowChange(idx, 'CurrentStock', parseInt(e.target.value, 10) || 0)
                                }
                                className="w-14 px-1.5 py-0.5 text-center bg-white border border-stone-300 rounded text-xs font-bold text-stone-900"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                value={row.MinimumStock}
                                onChange={(e) =>
                                  handleRowChange(idx, 'MinimumStock', parseInt(e.target.value, 10) || 1)
                                }
                                className="w-12 px-1.5 py-0.5 text-center bg-white border border-stone-300 rounded text-xs"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          {step === 1 ? (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="step1-form"
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Next: Variants</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-between w-full">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Step 1</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Product & Variants</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
