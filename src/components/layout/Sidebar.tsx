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
  badge?: number | string;
  badgeColor?: 'default' | 'alert';
  highlight?: boolean;
  adminOnly?: boolean;
}

interface MenuSection {
  group: string;
  adminOnly?: boolean;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentView, setCurrentView, kpis, role, isAdmin, settings, language, t } = useStore();

  const menuSections: MenuSection[] = [
    {
      group: t('group_store_catalog'),
      items: [
        {
          id: 'dashboard',
          label: t('nav_dashboard'),
          icon: LayoutDashboard,
          badge: isAdmin && kpis.lowStockCount > 0 ? `${kpis.lowStockCount} alert` : undefined,
          badgeColor: 'alert',
        },
        { id: 'products', label: t('nav_products'), icon: Shirt, badge: kpis.totalProducts },
        { id: 'inventory', label: t('nav_inventory'), icon: Boxes },
        { id: 'shop', label: t('nav_shop'), icon: Store },
      ],
    },
    {
      group: t('group_stock_movements'),
      items: [
        { id: 'inventory-in', label: t('nav_inventory_in'), icon: ArrowDownToLine, highlight: true },
        { id: 'inventory-out', label: t('nav_inventory_out'), icon: ArrowUpFromLine },
        { id: 'pos', label: t('nav_pos'), icon: ShoppingCart, highlight: true },
      ],
    },
    {
      group: t('group_operations'),
      items: [
        { id: 'orders', label: t('nav_orders'), icon: Receipt },
        { id: 'customers', label: t('nav_customers'), icon: Users },
        { id: 'reports', label: t('nav_reports'), icon: BarChart3 },
      ],
    },
    {
      group: t('group_admin'),
      adminOnly: true,
      items: [
        { id: 'categories', label: t('nav_categories'), icon: Tags, adminOnly: true },
        { id: 'settings', label: t('nav_settings'), icon: Settings, adminOnly: true },
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

  const storeTitle = settings?.StoreName || 'Puthipor Shop';

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
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-all duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center font-serif text-base font-bold shadow-xs">
              {storeTitle
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'PS'}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold font-display tracking-tight text-stone-900 dark:text-stone-100 leading-tight truncate max-w-[160px]">
                {storeTitle}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium truncate max-w-[160px]">
                {settings?.Tagline || (language === 'km' ? 'ហាងសម្លៀកបំពាក់ ភុទ្ធីពរ' : 'Clothing Store & POS')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {visibleMenuSections.map((section, idx) => (
            <div key={idx}>
              <div className="px-3 mb-2 text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
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
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                          : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-rose-600 dark:text-rose-400' : 'text-stone-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[11px] font-mono-numbers px-1.5 py-0.5 rounded font-semibold ${
                            item.badgeColor === 'alert'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse'
                              : 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800'
                          }`}
                        >
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
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-stone-500 dark:text-stone-400">{t('session_role')}:</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                role === 'admin'
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {role === 'admin' ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <User className="w-3 h-3" />
              )}
              <span>{role === 'admin' ? t('admin') : t('sales_staff')}</span>
            </span>
          </div>
          <div className="flex items-center justify-between font-mono-numbers text-[11px]">
            <span className="text-stone-500 dark:text-stone-400">{t('stock')} ({t('units')}):</span>
            <span className="font-bold text-stone-800 dark:text-stone-200">{kpis.totalStockUnits}</span>
          </div>
          {kpis.lowStockCount > 0 && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-1 rounded flex items-center justify-between">
              <span>{t('low_stock')}</span>
              <span className="font-bold font-mono-numbers">{kpis.lowStockCount}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
