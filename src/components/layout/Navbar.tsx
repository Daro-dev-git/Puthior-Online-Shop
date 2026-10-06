import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  ShoppingBag,
  ShieldCheck,
  User,
  Menu,
  Store,
  LogOut,
  Bell,
  BellRing,
  AlertTriangle,
  ArrowRight,
  ArrowDownToLine,
  Mail,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    logout,
    cartItemCount,
    settings,
    isAdmin,
    kpis,
    lowStockItemsList,
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'pos', label: 'Sales / POS' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-7xl mx-auto">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-stone-600 hover:text-stone-900 rounded-lg lg:hidden cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-xl sm:text-2xl font-bold font-display tracking-tight text-rose-950 hover:text-rose-700 transition-colors text-left flex items-center gap-2 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-serif font-bold italic shadow-xs">
              {(settings?.StoreName || 'G').charAt(0).toUpperCase()}
            </span>
            <span className="hidden xs:inline">{settings?.StoreName || 'Girl Dress Shop'}</span>
          </button>

          {/* Real-time Cloud persistence badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firebase Cloud Synced</span>
          </div>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentView(link.id)}
                className={`py-1 transition-colors relative whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-rose-700 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-rose-600'
                    : 'hover:text-stone-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions + User Profile & Session Validation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Customer Storefront preview toggle */}
          <button
            onClick={() => setCurrentView(currentView === 'shop' ? 'dashboard' : 'shop')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap border cursor-pointer ${
              currentView === 'shop'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{currentView === 'shop' ? 'Admin Portal' : 'Customer Shop'}</span>
            <span className="sm:hidden">{currentView === 'shop' ? 'Admin' : 'Shop'}</span>
          </button>

          {/* Administrator Low Stock Notification Bell with Badge */}
          {isAdmin && (
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className={`relative p-2 rounded-lg border transition-colors cursor-pointer ${
                  kpis.lowStockCount > 0
                    ? 'border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
                aria-label="Stock Notifications"
                title={
                  kpis.lowStockCount > 0
                    ? `Alert: ${kpis.lowStockCount} items below threshold of ${kpis.definedThreshold} units`
                    : 'All stock levels healthy'
                }
              >
                {kpis.lowStockCount > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
                ) : (
                  <Bell className="w-4 h-4 text-stone-500" />
                )}
                {kpis.lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full shadow-2xs">
                    {kpis.lowStockCount}
                  </span>
                )}
              </button>

              {/* Notification Flyout Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-fadeIn">
                  <div className="p-3.5 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-rose-100 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          Low Stock Alerts ({kpis.lowStockCount})
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Threshold: ≤{kpis.definedThreshold} available units
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        setCurrentView('inventory-in');
                      }}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 cursor-pointer"
                    >
                      Restock All →
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                    {lowStockItemsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500">
                        All product variants are above the defined alert threshold!
                      </div>
                    ) : (
                      lowStockItemsList.slice(0, 8).map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-900 truncate">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{item.productCode}</span>
                              <span>·</span>
                              <span>Size {item.size}</span>
                              <span>·</span>
                              <span>{item.color}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.currentStock === 0
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.currentStock === 0 ? 'Out: 0' : `${item.currentStock} left`}
                              </span>
                              <button
                                onClick={() => {
                                  setShowNotifications(false);
                                  setCurrentView('inventory-in');
                                }}
                                className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
                              >
                                Restock
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs gap-2">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        setCurrentView('dashboard');
                        window.location.hash = 'low-stock-alert-section';
                      }}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-rose-600" />
                      <span>Send Email Alert</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        setCurrentView('dashboard');
                        window.location.hash = 'low-stock-alert-section';
                      }}
                      className="text-[11px] font-semibold text-stone-700 hover:text-stone-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Alert Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Cart button if items exist */}
          {cartItemCount > 0 && (
            <button
              onClick={() => setCurrentView('pos')}
              className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{cartItemCount}</span>
            </button>
          )}

          {/* Authenticated User Session info */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="flex items-center gap-1.5 bg-stone-100/80 px-2.5 py-1 rounded-lg border border-stone-200/80 text-xs">
                {currentUser.role === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                )}
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-semibold text-stone-900 truncate max-w-[100px] sm:max-w-[140px]">
                    #{currentUser.userNumber}
                  </span>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                    {currentUser.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                title="Sign out of current session"
                className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
