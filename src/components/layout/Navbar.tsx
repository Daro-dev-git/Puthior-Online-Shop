import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ShoppingBag, ShieldCheck, User, Menu, Store, LogOut, CloudCheck } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { currentView, setCurrentView, currentUser, logout, cartItemCount, isFirebaseConnected } = useStore();

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
              G
            </span>
            <span className="hidden xs:inline">Girl Dress Shop</span>
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
