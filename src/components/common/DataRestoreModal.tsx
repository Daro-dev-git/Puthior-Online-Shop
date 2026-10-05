import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  RotateCcw,
  Download,
  Upload,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  Layers,
  Shirt,
  ShoppingCart,
  Users,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface DataRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataRestoreModal: React.FC<DataRestoreModalProps> = ({ isOpen, onClose }) => {
  const {
    restoreCuratedData,
    exportBackupJSON,
    importBackupJSON,
    isRestoringData,
    products,
    orders,
    customers,
    transactions,
    dressTypes,
    showToast,
  } = useStore();

  const [jsonInput, setJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'quick' | 'import' | 'export'>('quick');
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleQuickRestore = async () => {
    setErrorMessage(null);
    setRestoreSuccess(null);
    const res = await restoreCuratedData();
    if (res.success) {
      setRestoreSuccess(`Successfully restored all input data! (${res.count} items written to Firestore and local cache)`);
      showToast('All input data, products, orders & stock movements restored!');
    } else {
      setErrorMessage(res.error || 'Failed to restore data.');
    }
  };

  const handleExport = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `girldressshop_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Store backup downloaded successfully!');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonInput(content);
        setErrorMessage(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      setErrorMessage('Please paste or upload a JSON backup file.');
      return;
    }

    setErrorMessage(null);
    setRestoreSuccess(null);
    const res = await importBackupJSON(jsonInput.trim());
    if (res.success) {
      setRestoreSuccess(`Custom JSON backup restored successfully! (${res.count} items synchronized)`);
      showToast('Custom backup restored successfully!');
      setJsonInput('');
    } else {
      setErrorMessage(res.error || 'Failed to import JSON backup.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Data Recovery & Backup Hub</h2>
              <p className="text-xs text-stone-500">
                Restore input data, products, stock records, and manage JSON backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 px-5 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('quick');
              setRestoreSuccess(null);
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Full Restore</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setRestoreSuccess(null);
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON File</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('export');
              setRestoreSuccess(null);
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-rose-600 text-rose-700 font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {restoreSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Instant Restore Tab */}
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-rose-950">Restore Complete Boutique Input Data</h3>
                    <p className="text-xs text-rose-800/90 leading-relaxed">
                      This will populate your database with real boutique inventory: Princess Gowns, Floral Sun Dresses, Velvet Holiday Dresses, Lace Flower Girl dresses, stock batches across sizes 70–190, customer records, and POS transactions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1">
                  <Shirt className="w-4 h-4 text-stone-600 mx-auto" />
                  <div className="font-bold text-stone-800">6 Products</div>
                  <div className="text-[10px] text-stone-500">24+ Size/Color Variants</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1">
                  <Layers className="w-4 h-4 text-stone-600 mx-auto" />
                  <div className="font-bold text-stone-800">10 Dress Types</div>
                  <div className="text-[10px] text-stone-500">13 Sizes & 10 Colors</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1">
                  <Users className="w-4 h-4 text-stone-600 mx-auto" />
                  <div className="font-bold text-stone-800">4 Customers</div>
                  <div className="text-[10px] text-stone-500">Verified Profiles</div>
                </div>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center space-y-1">
                  <ShoppingCart className="w-4 h-4 text-stone-600 mx-auto" />
                  <div className="font-bold text-stone-800">Stock & Orders</div>
                  <div className="text-[10px] text-stone-500">Transactions & Receipts</div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleQuickRestore}
                  disabled={isRestoringData}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isRestoringData ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Writing to Cloud Firestore & Local Cache...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore All Input Data Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Import JSON Tab */}
          {activeTab === 'import' && (
            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700">
                  Upload or Paste JSON Backup Payload
                </label>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-rose-600" />
                    <span>Choose .json File</span>
                  </button>
                </div>
              </div>

              <textarea
                rows={8}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"products": [...], "dressTypes": [...], "orders": [...]}'
                className="w-full p-3 font-mono text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 outline-hidden"
              />

              <button
                type="submit"
                disabled={isRestoringData || !jsonInput.trim()}
                className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRestoringData ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring from JSON...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Import & Restore to Database</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Export Backup Tab */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
                  <HardDrive className="w-4 h-4 text-rose-600" />
                  <span>Current Live Database Snapshot</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 pt-1">
                  <div>• {products.length} Products in catalog</div>
                  <div>• {dressTypes.length} Dress Types & Categories</div>
                  <div>• {customers.length} Registered Customers</div>
                  <div>• {orders.length} Completed Orders</div>
                  <div>• {transactions.length} Stock Transactions</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete JSON Store Backup</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Directly Syncs to Firestore & Offline Storage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
