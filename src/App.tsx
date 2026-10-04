import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { ReceiptModal } from './components/common/ReceiptModal';
import { ShieldAlert } from 'lucide-react';

import { DashboardView } from './components/dashboard/DashboardView';
import { ProductListView } from './components/products/ProductListView';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { AddProductModal } from './components/products/AddProductModal';
import { InventoryView } from './components/inventory/InventoryView';
import { InventoryInView } from './components/inventory/InventoryInView';
import { InventoryOutView } from './components/inventory/InventoryOutView';
import { PosSalesView } from './components/pos/PosSalesView';
import { OrdersView } from './components/orders/OrdersView';
import { CustomersView } from './components/customers/CustomersView';
import { AddCustomerModal } from './components/customers/AddCustomerModal';
import { ReportsView } from './components/reports/ReportsView';
import { DressTypesView } from './components/categories/DressTypesView';
import { SettingsView } from './components/settings/SettingsView';
import { CustomerShopView } from './components/shop/CustomerShopView';

const AdminOnlyAccessGate: React.FC<{ title: string; onReturn: () => void }> = ({ title, onReturn }) => (
  <div className="p-8 sm:p-12 bg-white rounded-2xl border border-stone-200 shadow-xs text-center max-w-lg mx-auto space-y-4 my-8 animate-fadeIn">
    <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto ring-4 ring-purple-100">
      <ShieldAlert className="w-8 h-8" />
    </div>
    <div className="space-y-1">
      <h2 className="text-xl font-bold font-display text-stone-900">Administrator Access Required</h2>
      <p className="text-xs text-stone-500 leading-relaxed">
        <strong>{title}</strong> is restricted to store administrators. Please log in with an administrator account to access this configuration area.
      </p>
    </div>
    <button
      onClick={onReturn}
      className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
    >
      Return to Dashboard
    </button>
  </div>
);

const MainAppLayout: React.FC = () => {
  const { currentUser, currentView, setCurrentView, selectedProductId, setSelectedProductId, isAdmin } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Deep linking to Inventory IN / OUT with pre-filled variant parameters
  const [stockActionParams, setStockActionParams] = useState<{
    code: string;
    size?: string;
    color?: string;
  } | null>(null);

  const handleOpenRestock = (code: string, size?: string, color?: string) => {
    setStockActionParams({ code, size, color });
    setSelectedProductId(null);
    setCurrentView('inventory-in');
  };

  const handleOpenIssue = (code: string, size?: string, color?: string) => {
    setStockActionParams({ code, size, color });
    setSelectedProductId(null);
    setCurrentView('inventory-out');
  };

  // If user is not authenticated, show Login Screen with Number & Password validation
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-900 font-sans">
      {/* Top Navigation */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* App Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Viewport Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {currentView === 'dashboard' && (
            <DashboardView
              onOpenAddProduct={() => setShowAddProduct(true)}
              onOpenAddCustomer={() => setShowAddCustomer(true)}
            />
          )}

          {currentView === 'products' && (
            <ProductListView
              onOpenAddProduct={() => setShowAddProduct(true)}
              onOpenRestock={handleOpenRestock}
            />
          )}

          {currentView === 'inventory' && (
            <InventoryView
              onOpenRestock={handleOpenRestock}
              onOpenIssue={handleOpenIssue}
            />
          )}

          {currentView === 'inventory-in' && (
            <InventoryInView
              initialCode={stockActionParams?.code}
              initialSize={stockActionParams?.size}
              initialColor={stockActionParams?.color}
            />
          )}

          {currentView === 'inventory-out' && <InventoryOutView />}

          {currentView === 'pos' && <PosSalesView />}

          {currentView === 'orders' && <OrdersView />}

          {currentView === 'customers' && (
            <CustomersView onOpenAddCustomer={() => setShowAddCustomer(true)} />
          )}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'categories' && (
            isAdmin ? (
              <DressTypesView />
            ) : (
              <AdminOnlyAccessGate
                title="Dress Types & Categories"
                onReturn={() => setCurrentView('dashboard')}
              />
            )
          )}

          {currentView === 'settings' && (
            isAdmin ? (
              <SettingsView />
            ) : (
              <AdminOnlyAccessGate
                title="Admin Settings & Staff Management"
                onReturn={() => setCurrentView('dashboard')}
              />
            )
          )}

          {currentView === 'shop' && <CustomerShopView />}
        </main>
      </div>

      {/* Global Modals */}
      {selectedProductId && (
        <ProductDetailModal
          productId={selectedProductId}
          onClose={() => setSelectedProductId(null)}
          onOpenRestock={handleOpenRestock}
        />
      )}

      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} />}

      {showAddCustomer && <AddCustomerModal onClose={() => setShowAddCustomer(false)} />}

      <ReceiptModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppLayout />
    </StoreProvider>
  );
}
