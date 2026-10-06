import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductVariant } from '../../types';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  User,
  CreditCard,
  Banknote,
  Percent,
  Sparkles,
  ArrowRight,
  Shirt,
  Receipt,
  Layers,
} from 'lucide-react';

export const PosSalesView: React.FC = () => {
  const {
    products,
    customers,
    getAvailableSizesForCode,
    getAvailableColorsForCodeAndSize,
    getVariant,
    getProductByCode,
    completeSale,
    isAdmin,
    showToast,
  } = useStore();

  // POS State
  const [selectedProductCode, setSelectedProductCode] = useState<string>('GD001');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Search filter for product selector
  const [productSearch, setProductSearch] = useState('');

  // Cart
  const [cart, setCart] = useState<
    {
      variantId: string;
      productCode: string;
      productName: string;
      size: string;
      color: string;
      actualPrice: number;
      sellingPrice: number;
      currentStock: number;
      quantity: number;
      image: string;
    }[]
  >([]);

  // Customer & Checkout info
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cod' | 'transfer'>('cash');
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Load available sizes when Product Code changes
  const availableSizes = useMemo(() => {
    if (!selectedProductCode) return [];
    return getAvailableSizesForCode(selectedProductCode);
  }, [selectedProductCode, products, getAvailableSizesForCode]);

  const sizesKey = availableSizes.join(',');
  // Auto-select first size if current size is invalid or empty
  useEffect(() => {
    if (availableSizes.length > 0) {
      if (!selectedSize || !availableSizes.includes(selectedSize)) {
        setSelectedSize(availableSizes[0]);
      }
    } else if (selectedSize) {
      setSelectedSize('');
    }
  }, [selectedProductCode, sizesKey]);

  // Load available colors when size changes
  const availableColors = useMemo(() => {
    if (!selectedProductCode || !selectedSize) return [];
    return getAvailableColorsForCodeAndSize(selectedProductCode, selectedSize);
  }, [selectedProductCode, selectedSize, products, getAvailableColorsForCodeAndSize]);

  const colorsKey = availableColors.join(',');
  // Requirement #13: Color auto-selection logic
  useEffect(() => {
    if (availableColors.length === 1) {
      // If only one color is available for the selected size, automatically select that color!
      if (selectedColor !== availableColors[0]) {
        setSelectedColor(availableColors[0]);
      }
    } else if (availableColors.length > 1) {
      if (!selectedColor || !availableColors.includes(selectedColor)) {
        setSelectedColor(availableColors[0]);
      }
    } else if (selectedColor) {
      setSelectedColor('');
    }
  }, [colorsKey]);

  // Current matched variant
  const currentVariant = useMemo(() => {
    if (!selectedProductCode || !selectedSize || !selectedColor) return undefined;
    return getVariant(selectedProductCode, selectedSize, selectedColor);
  }, [selectedProductCode, selectedSize, selectedColor, products, getVariant]);

  const currentProduct = useMemo(() => {
    return getProductByCode(selectedProductCode);
  }, [selectedProductCode, products, getProductByCode]);

  // Filtered product codes list
  const filteredProductList = useMemo(() => {
    return products.filter((p) => {
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase();
      return p.ProductCode.toLowerCase().includes(q) || p.ProductName.toLowerCase().includes(q);
    });
  }, [products, productSearch]);

  // Add Item to Sale Cart
  const handleAddToCart = () => {
    if (!currentProduct || !currentVariant) {
      showToast('Please select a valid product, size, and color', 'error');
      return;
    }

    if (quantity <= 0) {
      showToast('Quantity must be at least 1', 'error');
      return;
    }

    const inCartQty = cart.find((i) => i.variantId === currentVariant.VariantID)?.quantity || 0;
    const totalRequested = inCartQty + quantity;

    if (totalRequested > currentVariant.CurrentStock) {
      showToast(
        `Insufficient stock! Only ${currentVariant.CurrentStock - inCartQty} available for ${selectedProductCode} (${selectedSize}/${selectedColor})`,
        'error'
      );
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.variantId === currentVariant.VariantID);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      }
      return [
        ...prev,
        {
          variantId: currentVariant.VariantID,
          productCode: currentProduct.ProductCode,
          productName: currentProduct.ProductName,
          size: currentVariant.Size,
          color: currentVariant.Color,
          actualPrice: currentVariant.ActualPrice,
          sellingPrice: currentVariant.SellingPrice,
          currentStock: currentVariant.CurrentStock,
          quantity,
          image: currentProduct.Images[0]?.ImageURL || '',
        },
      ];
    });

    showToast(`Added ${quantity}x ${currentProduct.ProductName} (${selectedSize}/${selectedColor})`);
    setQuantity(1);
  };

  // Cart Qty modification
  const handleUpdateQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            if (newQty > item.currentStock) {
              showToast(`Cannot exceed current stock of ${item.currentStock}`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as typeof cart
    );
  };

  const handleRemoveFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  // Totals
  const subtotal = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.sellingPrice * i.quantity, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal - discount);

  // Complete checkout
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showToast('Sale cart is empty', 'error');
      return;
    }

    const payloadItems = cart.map((i) => ({
      VariantID: i.variantId,
      ProductID: '',
      ProductCode: i.productCode,
      ProductName: i.productName,
      DressTypeName: '',
      Size: i.size,
      Color: i.color,
      ActualPrice: i.actualPrice,
      SellingPrice: i.sellingPrice,
      Quantity: i.quantity,
      CurrentStock: i.currentStock,
      ImageURL: i.image,
    }));

    const result = completeSale({
      items: payloadItems,
      customerId: customerId || undefined,
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      discount: discount || 0,
      paymentMethod,
      notes: orderNotes.trim() || undefined,
    });

    if (result.success) {
      setCart([]);
      setDiscount(0);
      setOrderNotes('');
      setCustomerId('');
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
    }
  };

  // Select customer from dropdown
  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    if (!id) {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      return;
    }
    const cust = customers.find((c) => c.CustomerID === id);
    if (cust) {
      setCustomerName(cust.CustomerName);
      setCustomerPhone(cust.Phone);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Sales & POS Terminal
          </h1>
          <p className="text-xs text-stone-500">
            Fast counter sales with auto-loaded variants, stock validation, and instant receipt generation
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-400">Inventory Sync:</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Real-Time
          </span>
        </div>
      </div>

      {/* POS Grid: Left is Item Builder, Right is Cart / Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Product & Variant Auto-Loader (Sections 12, 13, 14) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Step 1: Select Product Code */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                1. Select Product Code (SKU)
              </label>
              <div className="w-48 relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter codes..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 bg-stone-50 border border-stone-200 rounded text-xs focus:bg-white"
                />
              </div>
            </div>

            {/* Product Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredProductList.map((p) => {
                const isSelected = selectedProductCode === p.ProductCode;
                const totalStock = p.Variants.reduce((s, v) => s + v.CurrentStock, 0);

                return (
                  <button
                    key={p.ProductID}
                    type="button"
                    onClick={() => setSelectedProductCode(p.ProductCode)}
                    className={`p-2 rounded-lg border text-left transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-500 shadow-xs ring-1 ring-rose-300'
                        : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                      {p.Images[0]?.ImageURL ? (
                        <img
                          src={p.Images[0].ImageURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Shirt className="w-4 h-4 m-auto text-stone-400 mt-2" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-xs text-rose-950 truncate">
                        {p.ProductCode}
                      </div>
                      <div className="text-[11px] font-medium text-stone-800 truncate">
                        {p.ProductName}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono-numbers">
                        Stock: {totalStock}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 & 3: Size & Color Auto-Selection (Section 12 & 13) */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-4">
            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  2. Select Size
                </label>
                <span className="text-[11px] text-stone-400">
                  {availableSizes.length} sizes available for {selectedProductCode}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                      selectedSize === sz
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector with Auto-Selection Notice */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  3. Select Color
                </label>
                <span className="text-[11px] text-stone-400">
                  {availableColors.length === 1
                    ? 'Only 1 color available (Auto-selected)'
                    : `${availableColors.length} colors available for Size ${selectedSize}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    onClick={() => setSelectedColor(cl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                      selectedColor === cl
                        ? 'bg-rose-50 text-rose-950 border-rose-500 ring-1 ring-rose-400 shadow-xs font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <span>{cl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Loaded Prices and Stock Display (Section 12 & 36) */}
            {currentVariant && currentProduct && (
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-stone-900">
                      {currentProduct.ProductName}
                    </div>
                    <div className="text-xs text-stone-500 font-mono">
                      {selectedProductCode} · Size {selectedSize} · {selectedColor}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-stone-400">Unit Selling Price</div>
                    <div className="text-xl font-bold font-mono-numbers text-rose-700">
                      ${currentVariant.SellingPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Details Banner */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-200/60 text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px]">Current Stock</span>
                    <span
                      className={`font-mono-numbers font-bold ${
                        currentVariant.CurrentStock === 0
                          ? 'text-rose-600'
                          : currentVariant.CurrentStock <= 5
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {currentVariant.CurrentStock} units
                    </span>
                  </div>

                  {isAdmin && (
                    <div>
                      <span className="text-stone-400 block text-[11px]">Cost Price</span>
                      <span className="font-mono-numbers font-medium text-stone-700">
                        ${currentVariant.ActualPrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {isAdmin && (
                    <div>
                      <span className="text-stone-400 block text-[11px]">Profit / Unit</span>
                      <span className="font-mono-numbers font-bold text-emerald-700">
                        +${(currentVariant.SellingPrice - currentVariant.ActualPrice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity and Add Button */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-2.5 py-1.5 text-stone-600 hover:bg-stone-100"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={currentVariant.CurrentStock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-14 text-center text-xs font-bold font-mono-numbers py-1 border-0 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(currentVariant.CurrentStock, q + 1))
                      }
                      className="px-2.5 py-1.5 text-stone-600 hover:bg-stone-100"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={currentVariant.CurrentStock <= 0}
                    onClick={handleAddToCart}
                    className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>
                      {currentVariant.CurrentStock > 0 ? 'Add to Sale Cart' : 'Out of Stock'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Sale Cart & Fast Checkout (Section 14) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-stone-900">Current Sale Cart</h2>
              </div>
              <span className="text-xs font-mono-numbers text-stone-500">
                {cart.length} line items
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 flex-1">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="text-xs">No items in sale cart yet</p>
                  <p className="text-[11px] text-stone-400">
                    Select a dress product and click "Add to Sale Cart"
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const lineTotal = item.sellingPrice * item.quantity;
                  return (
                    <div
                      key={item.variantId}
                      className="p-2.5 rounded-lg border border-stone-200 bg-stone-50/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-stone-900 truncate">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {item.productCode} · Size {item.size} · {item.color}
                        </div>
                        <div className="text-[11px] text-stone-600 font-mono-numbers">
                          ${item.sellingPrice.toFixed(2)} each
                        </div>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex items-center border border-stone-300 rounded bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.variantId, -1)}
                          className="px-1.5 py-1 text-stone-500 hover:bg-stone-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold font-mono-numbers text-[11px]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.variantId, 1)}
                          className="px-1.5 py-1 text-stone-500 hover:bg-stone-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="text-right">
                        <div className="font-bold font-mono-numbers text-stone-900">
                          ${lineTotal.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.variantId)}
                          className="text-[10px] text-stone-400 hover:text-rose-600 mt-0.5 inline-block"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer & Payment Selection */}
            <div className="pt-2 border-t border-stone-200 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Customer Account
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.CustomerID} value={c.CustomerID}>
                        {c.CustomerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2 py-1.5 bg-stone-50 border border-stone-200 rounded text-xs"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['cash', 'card', 'transfer', 'cod'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 px-2 rounded text-[11px] font-semibold uppercase border transition-all text-center ${
                        paymentMethod === m
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-stone-600 text-xs">Discount ($):</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2 py-1 text-right bg-stone-50 border border-stone-200 rounded text-xs font-mono-numbers"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-stone-200 space-y-1.5 text-xs font-mono-numbers">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Grand Total</span>
                <span className="text-rose-700">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Sale Action */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>Complete Sale (${grandTotal.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
