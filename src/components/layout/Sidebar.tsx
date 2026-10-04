import React from 'react';
import { useStore } from '../../context/StoreContext';
import {
  LayoutDashboard,
  Shirt,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  Receipt,
  Users,
  BarChart3,
  Tags,
  Settings,
  Store,
  X,
  ShieldCheck,
  User,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  highlight?: boolean;
  adminOnly?: boolean;
}

interface MenuSection {
  group: string;
  adminOnly?: boolean;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentView, setCurrentView, kpis, role, isAdmin } = useStore();

  const menuSections: MenuSection[] = [
    {
      group: 'Store & Catalog',
      items: [
        { id: 'dashboard', label: 'Home / Dashboard', icon: LayoutDashboard },
        { id: 'products', label: 'Products & Variants', icon: Shirt, badge: kpis.totalProducts },
        { id: 'inventory', label: 'Inventory Overview', icon: Boxes },
        { id: 'shop', label: 'Customer Online Shop', icon: Store },
      ],
    },
    {
      group: 'Stock Movements',
      items: [
        { id: 'inventory-in', label: 'Inventory IN (Receive)', icon: ArrowDownToLine, highlight: true },
        { id: 'inventory-out', label: 'Inventory OUT (Issue)', icon: ArrowUpFromLine },
        { id: 'pos', label: 'Sales / POS Terminal', icon: ShoppingCart, highlight: true },
      ],
    },
    {
      group: 'Operations & Records',
      items: [
        { id: 'orders', label: 'Orders & Receipts', icon: Receipt },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'Admin Configuration',
      adminOnly: true,
      items: [
        { id: 'categories', label: 'Dress Types & Categories', icon: Tags, adminOnly: true },
        { id: 'settings', label: 'Admin Settings', icon: Settings, adminOnly: true },
      ],
    },
  ];

  // Role-based permission filtering: strictly hide admin functions from sales staff
  const visibleMenuSections = menuSections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0);

  const handleSelect = (id: string) => {
    setCurrentView(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-stone-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
              GD
            </div>
            <div>
              <div className="text-base font-bold font-display tracking-tight text-stone-900 leading-tight">
                Girl Dress Shop
              </div>
              <div className="text-xs text-stone-500 font-medium">Boutique Inventory & POS</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleMenuSections.map((section, idx) => (
            <div key={idx}>
              <div className="px-3 mb-2 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 text-rose-900 font-semibold'
                          : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-rose-600' : 'text-stone-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="text-[11px] font-mono-numbers text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                      {item.highlight && !isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Role & Quick Stock Indicator Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/70 text-xs text-stone-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Access Role:</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                role === 'admin'
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <User className="w-3 h-3" />
              )}
              <span>{role === 'admin' ? 'Administrator' : 'Sales Staff'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between font-mono-numbers text-[11px]">
            <span className="text-stone-500">Total Stock Units:</span>
            <span className="font-bold text-stone-800">{kpis.totalStockUnits}</span>
          </div>
          {kpis.lowStockCount > 0 && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center justify-between">
              <span>Low Stock Alerts</span>
              <span className="font-bold font-mono-numbers">{kpis.lowStockCount}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
