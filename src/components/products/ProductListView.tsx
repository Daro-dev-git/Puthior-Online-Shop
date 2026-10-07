import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { EditProductModal } from './EditProductModal';
import {
  Search,
  Plus,
  Filter,
  Grid,
  List,
  Shirt,
  Eye,
  Edit2,
  Trash2,
  ArrowDownToLine,
  ShoppingCart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProductListViewProps {
  onOpenAddProduct: () => void;
  onOpenRestock: (code: string, size?: string, color?: string) => void;
}

export const ProductListView: React.FC<ProductListViewProps> = ({ onOpenAddProduct, onOpenRestock }) => {
  const {
    products,
    dressTypes,
    priceCategories,
    setSelectedProductId,
    deleteProduct,
    setCurrentView,
    getDressTypeName,
    isAdmin,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriceCat, setSelectedPriceCat] = useState('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [productToDelete, setProductToDelete] = useState<{ id: string; code: string; name: string } | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Dress Type filter
      if (selectedType !== 'all' && p.DressTypeID !== selectedType) {
        return false;
      }

      // Stock status filter
      const totalStock = p.Variants.reduce((s, v) => s + v.CurrentStock, 0);
      const hasLowStockVariant = p.Variants.some((v) => v.CurrentStock <= v.MinimumStock && v.CurrentStock > 0);
      const isOutOfStock = totalStock === 0;

      if (selectedStockFilter === 'out_of_stock' && !isOutOfStock) return false;
      if (selectedStockFilter === 'low_stock' && (!hasLowStockVariant || isOutOfStock)) return false;
      if (selectedStockFilter === 'in_stock' && isOutOfStock) return false;

      // Price Category filter
      if (selectedPriceCat !== 'all') {
        const cat = priceCategories.find((c) => c.ID === selectedPriceCat);
        if (cat) {
          const minVariantPrice = Math.min(...p.Variants.map((v) => v.SellingPrice), 0);
          const maxVariantPrice = Math.max(...p.Variants.map((v) => v.SellingPrice), 0);
          if (cat.MaxPrice !== null) {
            if (minVariantPrice > cat.MaxPrice || maxVariantPrice < cat.MinPrice) return false;
          } else {
            if (maxVariantPrice < cat.MinPrice) return false;
          }
        }
      }

      // Search Query across code, name, description, brand, sizes, colors
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = p.ProductCode.toLowerCase().includes(query);
        const nameMatch = p.ProductName.toLowerCase().includes(query);
        const brandMatch = p.Brand.toLowerCase().includes(query);
        const typeMatch = getDressTypeName(p.DressTypeID).toLowerCase().includes(query);
        const sizeMatch = p.Variants.some((v) => v.Size.toLowerCase().includes(query));
        const colorMatch = p.Variants.some((v) => v.Color.toLowerCase().includes(query));

        if (!codeMatch && !nameMatch && !brandMatch && !typeMatch && !sizeMatch && !colorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedType, selectedPriceCat, selectedStockFilter, priceCategories, getDressTypeName]);

  // Reset to page 1 on filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedPriceCat, selectedStockFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePromptDelete = (productId: string, code: string, name: string) => {
    setProductToDelete({ id: productId, code, name });
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
              Girl Dress Products & Master Catalog
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {products.length} Products Total
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage multi-variant dresses, size matrices, and pricing
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={onOpenAddProduct}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search code (GD001), name, size, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          {/* Dress Type Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white cursor-pointer"
            >
              <option value="all">All Dress Categories ({dressTypes.length})</option>
              {dressTypes.map((dt) => (
                <option key={dt.DressTypeID} value={dt.DressTypeID}>
                  {dt.Name}
                </option>
              ))}
            </select>
          </div>

          {/* Price Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedPriceCat}
              onChange={(e) => setSelectedPriceCat(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:ring-1 focus:ring-rose-500 focus:bg-white cursor-pointer"
            >
              <option value="all">All Price Categories</option>
              {priceCategories.map((pc) => (
                <option key={pc.ID} value={pc.ID}>
                  {pc.Name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="md:col-span-2 flex items-center justify-end gap-1">
            <div className="bg-stone-100 p-1 rounded-lg flex items-center gap-1 border border-stone-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="Grid Cards View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-stone-400 hover:text-stone-700'
                }`}
                title="Table Matrix View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-100 text-xs">
          <span className="text-stone-400 font-medium mr-1">Stock Filter:</span>
          {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((filterVal) => {
            const labels = {
              all: 'All Products',
              in_stock: 'In Stock',
              low_stock: 'Low Stock Alert',
              out_of_stock: 'Out of Stock',
            };
            const isActive = selectedStockFilter === filterVal;
            return (
              <button
                key={filterVal}
                onClick={() => setSelectedStockFilter(filterVal)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-rose-100 text-rose-900 font-semibold'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {labels[filterVal]}
              </button>
            );
          })}
          <span className="ml-auto text-stone-400 font-mono-numbers">
            Showing {filteredProducts.length} of {products.length} products
          </span>
        </div>
      </div>

      {/* Product Display (Grid vs Table) */}
      {products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Shirt className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-stone-900">Your Catalog is Clean & Empty</h3>
            <p className="text-xs text-stone-500 mt-1">
              Sample data was cleared. You can now attach real dress photos directly from your computer and generate variant matrices.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={onOpenAddProduct}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Attach Product from Computer</span>
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200 shadow-xs space-y-3">
          <Shirt className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-semibold text-stone-800">No dresses matched your filter</h3>
          <p className="text-xs text-stone-500">
            Try adjusting your search query, price category, or selected dress type.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedType('all');
              setSelectedPriceCat('all');
              setSelectedStockFilter('all');
            }}
            className="px-4 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {paginatedProducts.map((product) => {
            const dressTypeName = getDressTypeName(product.DressTypeID);
            const totalStock = product.Variants.reduce((s, v) => s + v.CurrentStock, 0);
            const minPrice = Math.min(...product.Variants.map((v) => v.SellingPrice));
            const maxPrice = Math.max(...product.Variants.map((v) => v.SellingPrice));
            const priceLabel =
              minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`;

            const distinctSizes = Array.from(new Set(product.Variants.map((v) => v.Size)));
            const distinctColors = Array.from(new Set(product.Variants.map((v) => v.Color)));
            const isOutOfStock = totalStock === 0;
            const isLowStock = product.Variants.some((v) => v.CurrentStock <= v.MinimumStock && v.CurrentStock > 0);

            const primaryImage = product.Images.find((img) => img.IsPrimary)?.ImageURL || product.Images[0]?.ImageURL;

            return (
              <div
                key={product.ProductID}
                className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
              >
                {/* Product Image */}
                <div
                  onClick={() => setSelectedProductId(product.ProductID)}
                  className="h-56 bg-stone-100 relative overflow-hidden cursor-pointer"
                >
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={product.ProductName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 bg-stone-50">
                      <Shirt className="w-12 h-12 mb-2 stroke-1" />
                      <span className="text-xs">No Photo Attached</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isOutOfStock ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded-full shadow-xs">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full shadow-xs">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full shadow-xs">
                        In Stock ({totalStock})
                      </span>
                    )}
                  </div>

                  {/* Product Code overlay */}
                  <div className="absolute bottom-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-mono font-medium">
                    {product.ProductCode}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                      <span className="font-semibold text-rose-700 uppercase tracking-wider text-[10px]">
                        {dressTypeName}
                      </span>
                      <span>{product.Brand}</span>
                    </div>

                    <h3
                      onClick={() => setSelectedProductId(product.ProductID)}
                      className="text-sm font-bold text-stone-900 line-clamp-1 hover:text-rose-600 transition-colors cursor-pointer"
                      title={product.ProductName}
                    >
                      {product.ProductName}
                    </h3>

                    {/* Price & Variants Count */}
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-base font-bold font-mono-numbers text-rose-950">
                        {priceLabel}
                      </span>
                      <span className="text-xs font-mono-numbers text-stone-500">
                        {totalStock} in stock ({product.Variants.length} variants)
                      </span>
                    </div>

                    {/* Sizes and Colors preview */}
                    <div className="mt-3 pt-2 border-t border-stone-100 text-[11px] space-y-1">
                      <div className="flex items-center gap-1 text-stone-500 truncate">
                        <span className="font-semibold text-stone-700">Sizes:</span>
                        <span>{distinctSizes.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-stone-500 truncate">
                        <span className="font-semibold text-stone-700">Colors:</span>
                        <span>{distinctColors.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => setSelectedProductId(product.ProductID)}
                      className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-semibold transition-colors text-center cursor-pointer"
                    >
                      {isAdmin ? 'Manage Variants' : 'View Variants'}
                    </button>

                    <button
                      onClick={() => onOpenRestock(product.ProductCode)}
                      title="Receive Stock (Inventory IN)"
                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setEditingProductId(product.ProductID)}
                        title="Edit Product Info (Code, Name, Category)"
                        className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handlePromptDelete(product.ProductID, product.ProductCode, product.ProductName)}
                        title="Delete Product"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Sizes</th>
                  <th className="py-3 px-4">Colors</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Variants</th>
                  <th className="py-3 px-4 text-center">Total Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedProducts.map((p) => {
                  const typeName = getDressTypeName(p.DressTypeID);
                  const totalStock = p.Variants.reduce((s, v) => s + v.CurrentStock, 0);
                  const minPrice = Math.min(...p.Variants.map((v) => v.SellingPrice));
                  const maxPrice = Math.max(...p.Variants.map((v) => v.SellingPrice));
                  const distinctSizes = Array.from(new Set(p.Variants.map((v) => v.Size)));
                  const distinctColors = Array.from(new Set(p.Variants.map((v) => v.Color)));

                  return (
                    <tr key={p.ProductID} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-rose-800">
                        {p.ProductCode}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedProductId(p.ProductID)}
                          className="font-bold text-stone-900 hover:text-rose-600 text-left cursor-pointer"
                        >
                          {p.ProductName}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-stone-600">{typeName}</td>
                      <td className="py-3 px-4 text-stone-600">{p.Brand}</td>
                      <td className="py-3 px-4 font-mono-numbers text-stone-700">
                        {distinctSizes.join(', ')}
                      </td>
                      <td className="py-3 px-4 text-stone-700">{distinctColors.join(', ')}</td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-stone-900">
                        ${minPrice.toFixed(2)}
                        {minPrice !== maxPrice ? ` – $${maxPrice.toFixed(2)}` : ''}
                      </td>
                      <td className="py-3 px-4 text-center font-mono-numbers">{p.Variants.length}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono-numbers font-bold px-2 py-0.5 rounded ${
                            totalStock === 0
                              ? 'bg-rose-100 text-rose-800'
                              : totalStock <= 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {totalStock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedProductId(p.ProductID)}
                            className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded cursor-pointer"
                            title="View Details & Variants"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenRestock(p.ProductCode)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            title="Receive Stock"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => setEditingProductId(p.ProductID)}
                              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded cursor-pointer"
                              title="Edit Product Info (Code, Name, Category)"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handlePromptDelete(p.ProductID, p.ProductCode, p.ProductName)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200 text-xs">
          <div className="flex items-center gap-3 text-stone-500 flex-wrap">
            <span>
              Showing <strong className="text-stone-800 font-semibold">{Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
              <strong className="text-stone-800 font-semibold">{Math.min(filteredProducts.length, currentPage * itemsPerPage)}</strong> of{' '}
              <strong className="text-stone-800 font-semibold">{filteredProducts.length}</strong> products
            </span>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-stone-400">Show per page:</span>
              {[20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setItemsPerPage(num);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    itemsPerPage === num
                      ? 'bg-rose-600 text-white font-bold shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors ${
                        currentPage === pageNum
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* In-App Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Delete Dress Product
                </h3>
                <p className="text-xs font-mono text-rose-700">
                  {productToDelete.code}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{productToDelete.name}</strong> ({productToDelete.code}) and all its variant records from the database?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProductId && (
        <EditProductModal
          productId={editingProductId}
          onClose={() => setEditingProductId(null)}
        />
      )}
    </div>
  );
};
