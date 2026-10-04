import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { DressType } from '../../types';
import { Tag, Plus, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';

export const DressTypesView: React.FC = () => {
  const {
    dressTypes,
    addDressType,
    updateDressType,
    deleteDressType,
    products,
    showToast,
    isAdmin,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingType, setEditingType] = useState<DressType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Dress type name is required', 'error');
      return;
    }
    addDressType({
      Name: name.trim(),
      Description: description.trim(),
      Status: 'active',
    });
    setShowAddForm(false);
    setName('');
    setDescription('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    if (!name.trim()) {
      showToast('Dress type name is required', 'error');
      return;
    }
    updateDressType({
      ...editingType,
      Name: name.trim(),
      Description: description.trim(),
    });
    setEditingType(null);
    setName('');
    setDescription('');
  };

  const handleStartEdit = (dt: DressType) => {
    setEditingType(dt);
    setName(dt.Name);
    setDescription(dt.Description);
    setShowAddForm(false);
  };

  const handleToggleStatus = (dt: DressType) => {
    updateDressType({
      ...dt,
      Status: dt.Status === 'active' ? 'inactive' : 'active',
    });
  };

  const handlePromptDelete = (id: string, name: string) => {
    const productsInType = products.filter((p) => p.DressTypeID === id);
    if (productsInType.length > 0) {
      showToast(`Cannot delete "${name}" because ${productsInType.length} product(s) are assigned to it`, 'error');
      return;
    }
    setCategoryToDelete({ id, name });
  };

  const handleConfirmDelete = () => {
    if (!categoryToDelete) return;
    deleteDressType(categoryToDelete.id);
    setCategoryToDelete(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 tracking-tight">
            Dress Types & Clothing Categories
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage categories, occasion labels, and catalog classification for Girl Dress Shop
          </p>
        </div>

        {isAdmin && !showAddForm && !editingType && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setName('');
              setDescription('');
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors self-start cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Dress Type</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form Modal/Box */}
      {(showAddForm || editingType) && (
        <form
          onSubmit={editingType ? handleUpdate : handleCreate}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              {editingType ? `Edit Dress Type: ${editingType.Name}` : 'Create New Dress Type / Category'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingType(null);
              }}
              className="p-1 text-stone-400 hover:text-stone-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category Name (Required)
              </label>
              <input
                type="text"
                placeholder="e.g. Princess Dress, Floral Dress"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description & Style Notes
              </label>
              <input
                type="text"
                placeholder="Brief description of fabrics and silhouettes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingType(null);
              }}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingType ? 'Save Changes' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dressTypes.map((dt) => {
          const associatedProducts = products.filter((p) => p.DressTypeID === dt.DressTypeID);
          const totalStockInType = associatedProducts.reduce(
            (sum, p) => sum + p.Variants.reduce((vSum, v) => vSum + v.CurrentStock, 0),
            0
          );

          return (
            <div
              key={dt.DressTypeID}
              className={`p-4 bg-white rounded-xl border shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                dt.Status === 'inactive' ? 'opacity-60 border-stone-300' : 'border-stone-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-900">{dt.Name}</h3>
                  <button
                    onClick={() => handleToggleStatus(dt)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize cursor-pointer ${
                      dt.Status === 'active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {dt.Status}
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">{dt.Description}</p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-mono-numbers">
                  {associatedProducts.length} models ({totalStockInType} units)
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(dt)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100 cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePromptDelete(dt.DressTypeID, dt.Name)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* In-App Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Delete Category
                </h3>
                <p className="text-xs text-stone-500">
                  "{categoryToDelete.name}"
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete this dress category from the database?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-2 text-stone-600 hover:text-stone-900 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
