import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductVariant } from '../../types';
import {
  ShoppingBag,
  Search,
  Filter,
  Check,
  Truck,
  Heart,
  Sparkles,
  Shirt,
  X,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CustomerShopView: React.FC = () => {
  const {
    products,
    dressTypes,
    priceCategories,
    getDressTypeName,
    getAvailableSizesForCode,
    getAvailableColorsForCodeAndSize,
    getVariant,
    addToCart,
    cart,
    cartTotal,
    cartItemCount,
    updateCartQuantity,
    removeFromCart,
    completeSale,
    showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriceCat, setSelectedPriceCat] = useState('all');

  // Selected dress modal for customer
  const [activeDress, setActiveDress] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Customer Checkout Drawer
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'transfer'>('cod');

  // Filtered Products for customer catalog
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.Status !== 'active') return false;
      if (selectedType !== 'all' && p.DressTypeID !== selectedType) return false;

      // Price category
      if (selectedPriceCat !== 'all') {
        const cat = priceCategories.find((c) => c.ID === selectedPriceCat);
        if (cat) {
          const minPrice = Math.min(...p.Variants.map((v) => v.SellingPrice), 0);
          const maxPrice = Math.max(...p.Variants.map((v) => v.SellingPrice), 0);
          if (cat.MaxPrice !== null) {
            if (minPrice > cat.MaxPrice || maxPrice < cat.MinPrice) return false;
          } else {
            if (maxPrice < cat.MinPrice) return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = p.ProductCode.toLowerCase().includes(q);
        const nameMatch = p.ProductName.toLowerCase().includes(q);
        const brandMatch = p.Brand.toLowerCase().includes(q);
        const descMatch = p.Description.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !brandMatch && !descMatch) return false;
      }

      return true;
    });
  }, [products, selectedType, selectedPriceCat, searchQuery, priceCategories]);

  // Open Product Modal
  const handleOpenDress = (product: Product) => {
    setActiveDress(product);
    setActiveImageIndex(0);
    const sizes = getAvailableSizesForCode(product.ProductCode);
    const initialSize = sizes[0] || '';
    setSelectedSize(initialSize);

    if (initialSize) {
      const colors = getAvailableColorsForCodeAndSize(product.ProductCode, initialSize);
      setSelectedColor(colors[0] || '');
    } else {
      setSelectedColor('');
    }
  };

  // When size changes inside modal
  const handleSizeChange = (newSize: string) => {
    if (!activeDress) return;
    setSelectedSize(newSize);
    const colors = getAvailableColorsForCodeAndSize(activeDress.ProductCode, newSize);
    setSelectedColor(colors[0] || '');
  };

  // Matched variant in customer modal
  const currentVariant = useMemo(() => {
    if (!activeDress || !selectedSize || !selectedColor) return undefined;
    return getVariant(activeDress.ProductCode, selectedSize, selectedColor);
  }, [activeDress, selectedSize, selectedColor, getVariant]);

  // Add to Customer Cart
  const handleAddModalToCart = () => {
    if (!activeDress || !currentVariant) return;

    if (currentVariant.CurrentStock <= 0) {
      showToast('This size/color combination is currently out of stock', 'error');
      return;
    }

    addToCart(
      {
        VariantID: currentVariant.VariantID,
        ProductID: activeDress.ProductID,
        ProductCode: activeDress.ProductCode,
        ProductName: activeDress.ProductName,
        DressTypeName: getDressTypeName(activeDress.DressTypeID),
        Size: currentVariant.Size,
        Color: currentVariant.Color,
        ActualPrice: currentVariant.ActualPrice,
        SellingPrice: currentVariant.SellingPrice,
        CurrentStock: currentVariant.CurrentStock,
        ImageURL: activeDress.Images[0]?.ImageURL || '',
      },
      1
    );

    setActiveDress(null);
  };

  // Online Checkout Handler
  const handleCustomerCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim() || !phone.trim() || !address.trim()) {
      showToast('Please provide your name, phone number, and delivery address', 'error');
      return;
    }

    const res = completeSale({
      items: cart,
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim(),
      discount: 0,
      paymentMethod,
      notes: `Online Storefront Order (${paymentMethod.toUpperCase()})`,
      createdBy: 'Online Customer',
    });

    if (res.success) {
      setIsCheckoutOpen(false);
      setCustomerName('');
      setPhone('');
      setAddress('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner for Girl Dress Shop */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-rose-900 via-pink-900 to-rose-950 text-white p-6 sm:p-10 shadow-lg">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="text-xs uppercase tracking-widest text-rose-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Autumn/Winter Gala & Everyday Collection
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight leading-tight">
            Magical Moments, Handcrafted Dresses
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            Discover exquisite flower girl ballgowns, fairy party dresses, and comfortable summer floral sundresses for ages 1 to 14.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-rose-200">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-400" /> Premium Cotton Linings
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-400" /> Multi-Layer Tulle
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-emerald-400" /> Free Returns in 14 Days
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dresses, styles, floral prints, party gowns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white flex-1 md:flex-initial"
          >
            <option value="all">All Dress Styles</option>
            {dressTypes
              .filter((d) => d.Status === 'active')
              .map((d) => (
                <option key={d.DressTypeID} value={d.DressTypeID}>
                  {d.Name}
                </option>
              ))}
          </select>

          <select
            value={selectedPriceCat}
            onChange={(e) => setSelectedPriceCat(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:bg-white flex-1 md:flex-initial"
          >
            <option value="all">Price Range</option>
            {priceCategories.map((pc) => (
              <option key={pc.ID} value={pc.ID}>
                {pc.Name}
              </option>
            ))}
          </select>

          {/* Cart Drawer Trigger */}
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag ({cartItemCount})</span>
          </button>
        </div>
      </div>

      {/* Customer Product Showcase Cards (Section 8, 9, 35) */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <Shirt className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800">No dresses currently on display</h3>
          <p className="text-xs text-stone-500">
            Catalog is empty or no dresses match your search criteria. Add products with photos in the Admin Portal!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const typeName = getDressTypeName(p.DressTypeID);
            const minPrice = Math.min(...p.Variants.map((v) => v.SellingPrice));
            const maxPrice = Math.max(...p.Variants.map((v) => v.SellingPrice));
            const priceLabel =
              minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`;

            const totalStock = p.Variants.reduce((s, v) => s + v.CurrentStock, 0);
            const primaryImage = p.Images.find((img) => img.IsPrimary)?.ImageURL || p.Images[0]?.ImageURL;

            const availableSizesList = Array.from(new Set(p.Variants.map((v) => v.Size)));
            const availableColorsList = Array.from(new Set(p.Variants.map((v) => v.Color)));

            return (
              <div
                key={p.ProductID}
                onClick={() => handleOpenDress(p)}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div className="h-64 bg-stone-100 relative overflow-hidden">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={p.ProductName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <Shirt className="w-12 h-12" />
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <span className="w-8 h-8 rounded-full bg-white/90 shadow-xs flex items-center justify-center text-stone-400 hover:text-rose-600 transition-colors">
                      <Heart className="w-4 h-4" />
                    </span>
                  </div>

                  {totalStock === 0 && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase tracking-wider bg-rose-600 px-3 py-1 rounded">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                      {typeName} · {p.Brand}
                    </div>
                    <h3 className="font-bold text-sm text-stone-900 line-clamp-1 group-hover:text-rose-600 transition-colors mt-0.5">
                      {p.ProductName}
                    </h3>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-bold font-mono-numbers text-rose-950">
                        {priceLabel}
                      </span>
                      <span className="text-xs text-stone-400 font-mono-numbers">
                        {availableSizesList.length} sizes available
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="truncate">Sizes: {availableSizesList.join(', ')}</span>
                      <span className="truncate">{availableColorsList.join(', ')}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2 bg-stone-900 group-hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Select Size & Buy</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Product Modal */}
      {activeDress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                {getDressTypeName(activeDress.DressTypeID)}
              </span>
              <button
                onClick={() => setActiveDress(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gallery */}
              <div className="space-y-3">
                <div className="w-full h-72 rounded-xl bg-stone-100 overflow-hidden border border-stone-200">
                  <img
                    src={activeDress.Images[activeImageIndex]?.ImageURL || activeDress.Images[0]?.ImageURL}
                    alt={activeDress.ProductName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                {activeDress.Images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {activeDress.Images.map((img, idx) => (
                      <button
                        key={img.ImageID}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                          activeImageIndex === idx ? 'border-rose-600' : 'border-stone-200'
                        }`}
                      >
                        <img src={img.ImageURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Selection Module */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display text-stone-900">
                    {activeDress.ProductName}
                  </h2>
                  <div className="text-xs text-stone-500 mt-1">Brand: {activeDress.Brand}</div>

                  <div className="mt-3 text-2xl font-bold font-mono-numbers text-rose-700">
                    ${currentVariant ? currentVariant.SellingPrice.toFixed(2) : '---'}
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed mt-2 bg-stone-50 p-3 rounded-lg border border-stone-200">
                    {activeDress.Description}
                  </p>

                  {/* Size Buttons */}
                  <div className="mt-4">
                    <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-1.5">
                      Select Size (Child Height):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableSizesForCode(activeDress.ProductCode).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleSizeChange(sz)}
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

                  {/* Color Buttons */}
                  {selectedSize && (
                    <div className="mt-4">
                      <label className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-1.5">
                        Select Color:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableColorsForCodeAndSize(activeDress.ProductCode, selectedSize).map(
                          (cl) => (
                            <button
                              key={cl}
                              type="button"
                              onClick={() => setSelectedColor(cl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                selectedColor === cl
                                  ? 'bg-rose-50 text-rose-950 border-rose-500 ring-1 ring-rose-400 font-bold'
                                  : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                              }`}
                            >
                              {cl}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stock notice (Customer view does not reveal actual cost!) */}
                  {currentVariant && (
                    <div className="mt-3 text-xs">
                      {currentVariant.CurrentStock > 0 ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> In Stock & Ready to Ship
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">Currently Sold Out in this variant</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!currentVariant || currentVariant.CurrentStock <= 0}
                    onClick={handleAddModalToCart}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Shopping Bag</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Customer Checkout Drawer */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-stone-900">Your Shopping Bag ({cartItemCount})</h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bag items list */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  Your shopping bag is empty.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.VariantID}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-stone-200 overflow-hidden shrink-0">
                        {item.ImageURL ? (
                          <img src={item.ImageURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <Shirt className="w-6 h-6 m-auto text-stone-400 mt-3" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 truncate">
                          {item.ProductName}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          Size {item.Size} · {item.Color}
                        </div>
                        <div className="font-mono-numbers font-bold text-rose-700">
                          ${item.SellingPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-stone-300 rounded bg-white overflow-hidden">
                        <button
                          onClick={() => updateCartQuantity(item.VariantID, item.Quantity - 1)}
                          className="px-1.5 py-0.5 text-stone-500 hover:bg-stone-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-[11px]">
                          {item.Quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.VariantID, item.Quantity + 1)}
                          className="px-1.5 py-0.5 text-stone-500 hover:bg-stone-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Delivery Details Form */}
              {cart.length > 0 && (
                <form id="checkout-form" onSubmit={handleCustomerCheckout} className="space-y-3 pt-3 border-t border-stone-200 text-xs">
                  <div className="font-bold text-stone-900">Delivery Information</div>
                  <div>
                    <label className="block text-stone-600 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Katherine Davis"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +1 (555) 234-5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">Shipping Address</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Street, apartment, city, state, postal code"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 mb-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'cod', label: 'Cash on Deliv' },
                        { id: 'card', label: 'Credit Card' },
                        { id: 'transfer', label: 'Bank Transfer' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all text-center ${
                            paymentMethod === m.id
                              ? 'bg-rose-600 text-white border-rose-600 font-bold'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3 text-xs">
              <div className="flex justify-between text-base font-bold text-stone-900 font-mono-numbers">
                <span>Total Amount:</span>
                <span className="text-rose-700">${cartTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={cart.length === 0}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Place Order Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
