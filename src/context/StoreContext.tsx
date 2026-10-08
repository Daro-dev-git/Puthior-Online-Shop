import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Product,
  ProductVariant,
  DressType,
  ColorItem,
  SizeItem,
  Customer,
  Order,
  OrderItem,
  InventoryTransaction,
  InventoryTransactionType,
  PriceCategory,
  StoreSettings,
  CartItem,
  UserRole,
  AppUser,
} from '../types';
import { compareSizes } from '../utils/sizeUtils';
import {
  INITIAL_PRODUCTS,
  INITIAL_DRESS_TYPES,
  INITIAL_SIZES,
  INITIAL_COLORS,
  INITIAL_CUSTOMERS,
  INITIAL_ORDERS,
  INITIAL_TRANSACTIONS,
  INITIAL_PRICE_CATEGORIES,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../data/initialData';
import {
  seedInitialFirestoreData,
  subscribeProducts,
  subscribeOrders,
  subscribeTransactions,
  subscribeCustomers,
  subscribeUsers,
  loadStaticCollectionCacheFirst,
  loadSettingsCacheFirst,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveCustomerToFirestore,
  saveDressTypeToFirestore,
  deleteDressTypeFromFirestore,
  saveSizeToFirestore,
  deleteSizeFromFirestore,
  saveColorToFirestore,
  deleteColorFromFirestore,
  saveSettingsToFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
} from '../firebase/firestoreService';
import { subscribeQuotaStatus, FIRESTORE_UPGRADE_URL } from '../firebase/config';
import { isValidEmail, normalizeEmail } from '../utils/validators';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface CompleteSaleArgs {
  items: CartItem[];
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  discount: number;
  paymentMethod: 'cash' | 'card' | 'cod' | 'transfer';
  notes?: string;
  createdBy?: string;
}

interface ReceiveStockArgs {
  productCode: string;
  size: string;
  color: string;
  quantity: number;
  actualPrice?: number;
  sellingPrice?: number;
  supplier?: string;
  notes?: string;
  transactionType?: InventoryTransactionType;
  date?: string;
  createdBy?: string;
}

interface IssueStockArgs {
  type: 'Damaged' | 'Lost' | 'Adjustment OUT' | 'Supplier Return' | 'Customer Sale';
  productCode: string;
  size: string;
  color: string;
  quantity: number;
  customerName?: string;
  notes?: string;
  date?: string;
  createdBy?: string;
}

interface StoreContextType {
  // Navigation & UI State
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;

  // Session & Authentication
  currentUser: AppUser | null;
  role: UserRole;
  isAdmin: boolean;
  loginWithNumber: (userNumber: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: AppUser[];
  addUserAccount: (user: Omit<AppUser, 'userId'>) => Promise<{ success: boolean; error?: string }>;
  updateUserAccount: (user: AppUser) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Data Collections (Live Firestore Synchronized)
  products: Product[];
  dressTypes: DressType[];
  sizes: SizeItem[];
  colors: ColorItem[];
  customers: Customer[];
  orders: Order[];
  transactions: InventoryTransaction[];
  priceCategories: PriceCategory[];
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<{ success: boolean; error?: string }>;

  // Cart for POS and Online Store
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'Quantity'>, qty?: number) => boolean;
  removeFromCart: (variantId: string) => void;
  updateCartQuantity: (variantId: string, quantity: number) => boolean;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;

  // Core Operations
  addProduct: (product: Omit<Product, 'ProductID' | 'CreatedDate' | 'ModifiedDate'>) => { success: boolean; error?: string };
  updateProduct: (product: Product) => { success: boolean; error?: string };
  deleteProduct: (productId: string) => void;

  // Variant & Stock Adjustments (Admin)
  updateVariant: (
    productId: string,
    variant: ProductVariant,
    stockAdjustment?: {
      newStock: number;
      reason?: string;
    }
  ) => { success: boolean; error?: string };
  adjustVariantStock: (productId: string, variantId: string, newStock: number, reason: string) => { success: boolean; error?: string };
  addVariantToProduct: (productId: string, variant: Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>) => { success: boolean; error?: string };
  deleteVariantFromProduct: (productId: string, variantId: string) => { success: boolean; error?: string };

  receiveStock: (args: ReceiveStockArgs) => { success: boolean; error?: string };
  issueStock: (args: IssueStockArgs) => { success: boolean; error?: string };
  completeSale: (args: CompleteSaleArgs) => { success: boolean; order?: Order; error?: string };

  // Orders & Transactions Management (Admin editable with auto-deduct / real-time stock sync)
  updateOrder: (updatedOrder: Order) => { success: boolean; error?: string };
  deleteOrder: (orderId: string, restoreStock?: boolean) => { success: boolean; error?: string };
  updateTransaction: (updatedTx: InventoryTransaction) => { success: boolean; error?: string };
  deleteTransaction: (transactionId: string) => { success: boolean; error?: string };

  // Masters Management
  addDressType: (type: Omit<DressType, 'DressTypeID'>) => void;
  updateDressType: (type: DressType) => void;
  deleteDressType: (id: string) => void;

  addSize: (sizeValue: string) => { success: boolean; error?: string };
  updateSize: (size: SizeItem) => void;
  deleteSize: (id: string) => void;

  addColor: (name: string, hex: string) => { success: boolean; error?: string };
  updateColor: (color: ColorItem) => void;
  deleteColor: (id: string) => void;

  addCustomer: (customer: Omit<Customer, 'CustomerID' | 'CreatedDate' | 'TotalOrders' | 'TotalSpend'>) => Customer;
  updateCustomer: (customer: Customer) => void;

  // Notifications
  notifications: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Helper Lookups
  getDressTypeName: (id: string) => string;
  getProductByCode: (code: string) => Product | undefined;
  getVariant: (code: string, size: string, color: string) => ProductVariant | undefined;
  getAvailableSizesForCode: (code: string) => string[];
  getAvailableColorsForCodeAndSize: (code: string, size: string) => string[];

  // Aggregated KPIs
  kpis: {
    totalProducts: number;
    totalVariants: number;
    totalStockUnits: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockProductsCount: number;
    definedThreshold: number;
    todayRevenue: number;
    todayProfit: number;
    todayCost: number;
    todayOrders: number;
    todayItemsSold: number;
    todayStockIn: number;
    todayStockOut: number;
  };

  isFirebaseConnected: boolean;
  isQuotaExceeded: boolean;
  quotaUpgradeUrl: string;
  updateLowStockThreshold: (threshold: number) => Promise<void>;
  lowStockItemsList: Array<{
    productId: string;
    productName: string;
    productCode: string;
    variantId: string;
    size: string;
    color: string;
    currentStock: number;
    threshold: number;
    sellingPrice: number;
    image?: string;
  }>;

  // Low Stock Email Notification System
  emailAlertRecipients: string[];
  sendLowStockEmailAlert: (customNotes?: string) => Promise<{
    success: boolean;
    recipients: string[];
    subject: string;
    body: string;
    mailtoUrl: string;
    error?: string;
  }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'gds_active_user_session';

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation & View state
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  // Firestore Collections State with resilient local caching for offline / quota limits
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_products');
      return cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [dressTypes, setDressTypes] = useState<DressType[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_dress_types');
      return cached ? JSON.parse(cached) : INITIAL_DRESS_TYPES;
    } catch {
      return INITIAL_DRESS_TYPES;
    }
  });
  const [sizes, setSizes] = useState<SizeItem[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_sizes');
      const base: SizeItem[] = cached ? JSON.parse(cached) : INITIAL_SIZES;
      return [...base].sort((a, b) => compareSizes(a.SizeValue, b.SizeValue));
    } catch {
      return [...INITIAL_SIZES].sort((a, b) => compareSizes(a.SizeValue, b.SizeValue));
    }
  });
  const [colors, setColors] = useState<ColorItem[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_colors');
      return cached ? JSON.parse(cached) : INITIAL_COLORS;
    } catch {
      return INITIAL_COLORS;
    }
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_customers');
      return cached ? JSON.parse(cached) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_orders');
      return cached ? JSON.parse(cached) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_transactions');
      return cached ? JSON.parse(cached) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });
  const [priceCategories] = useState<PriceCategory[]>(INITIAL_PRICE_CATEGORIES);
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_store_settings');
      return cached ? { ...INITIAL_SETTINGS, ...JSON.parse(cached) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_users');
      return cached ? JSON.parse(cached) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Session & Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const role: UserRole = currentUser?.role || 'admin';
  const isAdmin = role === 'admin';

  // Cart State (session local)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 1. Initialize Firestore & Attach Live Subscriptions for All Collections
  useEffect(() => {
    // Seed initial data if empty in Firestore (checked from cache first)
    seedInitialFirestoreData().catch(console.error);

    // Static lookup collections: Load Cache-First from localStorage / IndexedDB cache
    // Hits server ONLY if cache is completely empty on clean boot (saves 1,000s of reads daily)
    loadStaticCollectionCacheFirst<DressType>('dress_types', 'gds_cached_dress_types', INITIAL_DRESS_TYPES)
      .then((list) => {
        if (list && list.length > 0) {
          setDressTypes((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
        }
      })
      .catch(() => {});

    loadStaticCollectionCacheFirst<SizeItem>('sizes', 'gds_cached_sizes', INITIAL_SIZES)
      .then((list) => {
        if (list && list.length > 0) {
          const sortedList = [...list].sort((a, b) => compareSizes(a.SizeValue, b.SizeValue));
          setSizes((prev) => (JSON.stringify(prev) === JSON.stringify(sortedList) ? prev : sortedList));
        }
      })
      .catch(() => {});

    loadStaticCollectionCacheFirst<ColorItem>('colors', 'gds_cached_colors', INITIAL_COLORS)
      .then((list) => {
        if (list && list.length > 0) {
          setColors((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
        }
      })
      .catch(() => {});

    loadSettingsCacheFirst()
      .then((loadedSettings) => {
        if (loadedSettings) {
          setSettings((prev) => (JSON.stringify(prev) === JSON.stringify(loadedSettings) ? prev : loadedSettings));
        }
      })
      .catch(() => {});

    // Dynamic collections: Subscribe with strict limits (products <= 30, orders <= 25, tx <= 25, cust <= 25)
    const unsubs: Array<() => void> = [];

    // Listen to Firebase Quota status
    unsubs.push(
      subscribeQuotaStatus((status) => {
        setIsQuotaExceeded(status.isExceeded);
      })
    );

    // 1. Products (increased limit to 100 to ensure all 40+ products load completely)
    unsubs.push(
      subscribeProducts((list) => {
        if (list.length > 0) {
          setProducts((prev) => {
            // Protect against Firestore snapshot rolling back recently updated products with newer local timestamp
            const merged = [...prev];
            list.forEach((incoming) => {
              const idx = merged.findIndex((p) => p.ProductID === incoming.ProductID);
              if (idx >= 0) {
                const current = merged[idx];
                // Only replace if incoming from Firestore is newer or current has no ModifiedDate
                if (
                  !current.ModifiedDate ||
                  !incoming.ModifiedDate ||
                  new Date(incoming.ModifiedDate).getTime() >= new Date(current.ModifiedDate).getTime()
                ) {
                  merged[idx] = incoming;
                }
              } else {
                merged.push(incoming);
              }
            });

            if (JSON.stringify(prev) === JSON.stringify(merged)) {
              return prev;
            }
            try {
              localStorage.setItem('gds_cached_products', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }, undefined, 100)
    );

    // 2. Customers (limited to 25 items max)
    unsubs.push(
      subscribeCustomers((list) => {
        setCustomers((prev) => {
          if (prev.length === list.length && JSON.stringify(prev) === JSON.stringify(list)) {
            return prev;
          }
          try {
            localStorage.setItem('gds_cached_customers', JSON.stringify(list));
          } catch {}
          return list;
        });
      }, undefined, 25)
    );

    // 3. Orders (limited to 25 recent items with orderBy createdAt desc)
    unsubs.push(
      subscribeOrders((list) => {
        setOrders((prev) => {
          if (prev.length === list.length && JSON.stringify(prev) === JSON.stringify(list)) {
            return prev;
          }
          try {
            localStorage.setItem('gds_cached_orders', JSON.stringify(list));
          } catch {}
          return list;
        });
      }, undefined, 25)
    );

    // 4. Inventory Transactions (limited to 25 recent items with orderBy createdAt desc)
    unsubs.push(
      subscribeTransactions((list) => {
        setTransactions((prev) => {
          if (prev.length === list.length && JSON.stringify(prev) === JSON.stringify(list)) {
            return prev;
          }
          try {
            localStorage.setItem('gds_cached_transactions', JSON.stringify(list));
          } catch {}
          return list;
        });
      }, undefined, 25)
    );

    // 5. Users (cache prioritized)
    unsubs.push(
      subscribeUsers((list) => {
        if (list.length > 0) {
          setUsers((prev) => {
            if (prev.length === list.length && JSON.stringify(prev) === JSON.stringify(list)) {
              return prev;
            }
            try {
              localStorage.setItem('gds_cached_users', JSON.stringify(list));
            } catch {}
            return list;
          });
          // Session validation: If current user was deleted or deactivated, log out
          setCurrentUser((current) => {
            if (!current) return null;
            const found = list.find((u) => u.userId === current.userId || u.userNumber === current.userNumber);
            if (!found || found.status === 'inactive') {
              localStorage.removeItem(SESSION_STORAGE_KEY);
              return null;
            }
            return found;
          });
        }
      })
    );

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  // Login handler with user number & password validation
  const loginWithNumber = async (
    userNumber: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanNum = userNumber.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Check user list (or fallback initial users)
    const activeList = users.length > 0 ? users : INITIAL_USERS;
    const userExists = activeList.find(
      (u) =>
        u.userNumber.toLowerCase() === cleanNum ||
        u.userId.toLowerCase() === cleanNum ||
        (cleanNum === 'admin' && u.role === 'admin')
    );

    if (!userExists) {
      return {
        success: false,
        error: `User Number "${userNumber}" not found in database. New staff accounts must be created by the Administrator.`,
      };
    }

    if (userExists.password !== cleanPass) {
      return {
        success: false,
        error: `Incorrect password for User #${userExists.userNumber}. Please check your password and try again.`,
      };
    }

    if (userExists.status === 'inactive') {
      return {
        success: false,
        error: `This account (#${userExists.userNumber}) has been deactivated. Please contact the administrator.`,
      };
    }

    // Update lastLogin
    const updatedUser: AppUser = {
      ...userExists,
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
    saveUserToFirestore(updatedUser).catch(console.error);

    showToast(`Welcome back, ${updatedUser.name}! (${updatedUser.role === 'admin' ? 'Administrator' : 'Sales Staff'})`);
    return { success: true };
  };

  // Logout handler
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    showToast('Signed out successfully', 'info');
  };

  // Staff Account Management
  const addUserAccount = async (
    newUser: Omit<AppUser, 'userId'>
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanNum = newUser.userNumber.trim();
    if (!cleanNum) {
      return { success: false, error: 'User Number is required' };
    }

    const existing = users.find(
      (u) => u.userNumber.trim().toLowerCase() === cleanNum.toLowerCase()
    );
    if (existing) {
      return { success: false, error: `User Number "${cleanNum}" already exists! Please use a unique number.` };
    }

    // Validate email address format if provided
    let cleanEmail: string | undefined = undefined;
    if (newUser.email !== undefined && newUser.email.trim() !== '') {
      if (!isValidEmail(newUser.email)) {
        return {
          success: false,
          error: `"${newUser.email}" is not a valid email format. Please provide a valid email (e.g. staff@girldressshop.com).`,
        };
      }
      cleanEmail = normalizeEmail(newUser.email);
    }

    const created: AppUser = {
      ...newUser,
      userNumber: cleanNum,
      name: newUser.name.trim(),
      password: newUser.password.trim(),
      email: cleanEmail,
      receiveStockAlerts: newUser.receiveStockAlerts ?? true,
      userId: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: newUser.status || 'active',
      lastLogin: '',
    };

    try {
      setUsers((prev) => [...prev, created]);
      await saveUserToFirestore(created);
      showToast(`Staff account "${created.name}" created and saved to database!`);
      return { success: true };
    } catch (err) {
      console.error('Failed to create user in database:', err);
      return { success: false, error: 'Failed to save new user to database.' };
    }
  };

  const updateUserAccount = async (user: AppUser): Promise<{ success: boolean; error?: string }> => {
    const cleanNum = user.userNumber.trim();
    if (!cleanNum) {
      return { success: false, error: 'User Number cannot be empty' };
    }

    const duplicate = users.find(
      (u) =>
        u.userId !== user.userId &&
        u.userNumber.trim().toLowerCase() === cleanNum.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `User Number "${cleanNum}" is already assigned to "${duplicate.name}".` };
    }

    // Validate email address format if provided
    let cleanEmail: string | undefined = undefined;
    if (user.email !== undefined && user.email.trim() !== '') {
      if (!isValidEmail(user.email)) {
        return {
          success: false,
          error: `"${user.email}" is not a valid email format. Please provide a valid email (e.g. staff@girldressshop.com).`,
        };
      }
      cleanEmail = normalizeEmail(user.email);
    }

    const sanitizedUser: AppUser = {
      ...user,
      userNumber: cleanNum,
      name: user.name.trim(),
      password: user.password.trim(),
      email: cleanEmail,
      receiveStockAlerts: user.receiveStockAlerts ?? true,
    };

    try {
      setUsers((prev) => prev.map((u) => (u.userId === user.userId ? sanitizedUser : u)));
      await saveUserToFirestore(sanitizedUser);
      if (currentUser?.userId === user.userId) {
        setCurrentUser(sanitizedUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sanitizedUser));
      }
      showToast(`User "${sanitizedUser.name}" changes saved to database.`);
      return { success: true };
    } catch (err) {
      console.error('Failed to update user in database:', err);
      return { success: false, error: 'Failed to save user changes to database.' };
    }
  };

  const deleteUserAccount = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const targetUser = users.find((u) => u.userId === userId);
    if (!targetUser) {
      return { success: false, error: 'User account not found' };
    }

    const remainingUsers = users.filter((u) => u.userId !== userId);
    if (remainingUsers.length === 0) {
      return {
        success: false,
        error: 'Cannot delete the only remaining user account. Please create another administrator or staff account first.',
      };
    }

    try {
      setUsers(remainingUsers);
      await deleteUserFromFirestore(userId);

      if (currentUser?.userId === userId) {
        logout();
        showToast('Your account was deleted from database. Session closed.', 'info');
      } else {
        showToast(`User "${targetUser.name}" (ID #${targetUser.userNumber}) deleted from database.`);
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to delete user from database:', err);
      return { success: false, error: 'Failed to delete user from database.' };
    }
  };

  // Helper Lookups (memoized with useCallback to maintain stable reference identity)
  const getDressTypeName = useCallback((id: string): string => {
    const found = dressTypes.find((dt) => dt.DressTypeID === id);
    return found ? found.Name : 'Girl Dress';
  }, [dressTypes]);

  const getProductByCode = useCallback((code: string): Product | undefined => {
    if (!code) return undefined;
    return products.find((p) => p.ProductCode.trim().toUpperCase() === code.trim().toUpperCase());
  }, [products]);

  const getVariant = useCallback((code: string, size: string, color: string): ProductVariant | undefined => {
    const prod = getProductByCode(code);
    if (!prod) return undefined;
    return prod.Variants.find(
      (v) =>
        v.Size.trim().toLowerCase() === size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === color.trim().toLowerCase()
    );
  }, [getProductByCode]);

  const getAvailableSizesForCode = useCallback((code: string): string[] => {
    const prod = getProductByCode(code);
    if (!prod) return [];
    const sizeSet = new Set<string>();
    prod.Variants.forEach((v) => {
      if (v.Status === 'active') sizeSet.add(v.Size);
    });
    return Array.from(sizeSet).sort(compareSizes);
  }, [getProductByCode]);

  const getAvailableColorsForCodeAndSize = useCallback((code: string, size: string): string[] => {
    const prod = getProductByCode(code);
    if (!prod) return [];
    const colorSet = new Set<string>();
    prod.Variants.forEach((v) => {
      if (v.Status === 'active' && v.Size.trim().toLowerCase() === size.trim().toLowerCase()) {
        colorSet.add(v.Color);
      }
    });
    return Array.from(colorSet);
  }, [getProductByCode]);

  // ---------------- Core Business Operations ----------------

  // Add Product
  const addProduct = (
    data: Omit<Product, 'ProductID' | 'CreatedDate' | 'ModifiedDate'>
  ): { success: boolean; error?: string } => {
    const cleanCode = data.ProductCode.trim().toUpperCase();
    if (products.some((p) => p.ProductCode.trim().toUpperCase() === cleanCode)) {
      return { success: false, error: `Product Code "${cleanCode}" already exists. SKU must be unique!` };
    }

    const newId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProduct: Product = {
      ...data,
      ProductID: newId,
      ProductCode: cleanCode,
      CreatedDate: new Date().toISOString(),
      ModifiedDate: new Date().toISOString(),
      Variants: data.Variants.map((v, i) => ({
        ...v,
        VariantID: v.VariantID || `var-${newId}-${i}-${Date.now()}`,
        ProductID: newId,
        ProductCode: cleanCode,
      })),
    };

    setProducts((prev) => [newProduct, ...prev]);
    saveProductToFirestore(newProduct).catch(console.error);

    // Create Initial Stock Receiving Transaction for any variant with stock > 0
    newProduct.Variants.forEach((v) => {
      if (v.CurrentStock > 0) {
        const tx: InventoryTransaction = {
          TransactionID: `TX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          TransactionDate: new Date().toISOString(),
          TransactionType: 'Stock Received',
          VariantID: v.VariantID,
          ProductCode: newProduct.ProductCode,
          ProductName: newProduct.ProductName,
          Size: v.Size,
          Color: v.Color,
          Quantity: v.CurrentStock,
          ActualPrice: v.ActualPrice,
          SellingPrice: v.SellingPrice,
          TotalCost: v.ActualPrice * v.CurrentStock,
          TotalSellingValue: v.SellingPrice * v.CurrentStock,
          Notes: 'Initial stock on product creation',
          CreatedBy: currentUser?.name || 'Administrator',
        };
        setTransactions((prev) => [tx, ...prev]);
        saveTransactionToFirestore(tx).catch(console.error);
      }
    });

    showToast(`Product "${newProduct.ProductName}" (${newProduct.ProductCode}) created successfully!`);
    return { success: true };
  };

  // Update Product (Supports multi-item variant adjustments of Cost, Selling, and Qty simultaneously)
  const updateProduct = (product: Product): { success: boolean; error?: string } => {
    const cleanCode = product.ProductCode.trim().toUpperCase();
    const existing = products.find(
      (p) => p.ProductCode.trim().toUpperCase() === cleanCode && p.ProductID !== product.ProductID
    );
    if (existing) {
      return { success: false, error: `Another product already uses code "${cleanCode}". SKU must be unique.` };
    }

    const currentProd = products.find((p) => p.ProductID === product.ProductID);
    const oldVariants = currentProd?.Variants || [];

    // Track stock diffs and generate atomic audit transactions for any adjusted variant quantities
    const stockTransactions: InventoryTransaction[] = [];
    const nowIso = new Date().toISOString();
    let totalDeducted = 0;
    let totalAdded = 0;

    const updatedVariants = (product.Variants || []).map((v, idx) => {
      const oldVar = oldVariants.find((ov) => ov.VariantID === v.VariantID);
      const oldStock = oldVar ? oldVar.CurrentStock : v.CurrentStock;
      const newStock = Math.max(0, Number(v.CurrentStock) || 0);
      const diff = newStock - oldStock;

      const actPrice = Number(v.ActualPrice) >= 0 ? Number(v.ActualPrice) : (oldVar?.ActualPrice || 0);
      const sellPrice = Number(v.SellingPrice) >= 0 ? Number(v.SellingPrice) : (oldVar?.SellingPrice || 0);

      if (diff !== 0) {
        const isPositive = diff > 0;
        const absQty = Math.abs(diff);
        const txType: InventoryTransactionType = isPositive ? 'Adjustment IN' : 'Adjustment OUT';

        if (isPositive) {
          totalAdded += absQty;
        } else {
          totalDeducted += absQty;
        }

        const tx: InventoryTransaction = {
          TransactionID: `TX-ADJ-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          TransactionDate: nowIso,
          TransactionType: txType,
          VariantID: v.VariantID,
          ProductCode: cleanCode,
          ProductName: product.ProductName,
          Size: v.Size.trim(),
          Color: v.Color.trim(),
          Quantity: absQty,
          ActualPrice: actPrice,
          SellingPrice: sellPrice,
          TotalCost: actPrice * absQty,
          TotalSellingValue: sellPrice * absQty,
          Notes: `Multi-item inventory adjustment by Admin (${oldStock} -> ${newStock} units)`,
          CreatedBy: currentUser?.name || 'Administrator',
        };
        stockTransactions.push(tx);
      }

      return {
        ...v,
        ProductCode: cleanCode,
        Size: v.Size.trim(),
        Color: v.Color.trim(),
        ActualPrice: actPrice,
        SellingPrice: sellPrice,
        CurrentStock: newStock,
        MinimumStock: Number(v.MinimumStock) >= 0 ? Number(v.MinimumStock) : 5,
        Status: v.Status || 'active',
      };
    });

    const updated: Product = {
      ...product,
      ProductCode: cleanCode,
      Variants: updatedVariants,
      ModifiedDate: nowIso,
    };

    setProducts((prev) => {
      const next = prev.map((p) => (p.ProductID === product.ProductID ? updated : p));
      try {
        localStorage.setItem('gds_cached_products', JSON.stringify(next));
      } catch {}
      return next;
    });
    saveProductToFirestore(updated).catch(console.error);

    if (stockTransactions.length > 0) {
      setTransactions((prev) => {
        const next = [...stockTransactions, ...prev];
        try {
          localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
        } catch {}
        return next;
      });
      stockTransactions.forEach((tx) => {
        saveTransactionToFirestore(tx).catch(console.error);
      });
    }

    if (stockTransactions.length > 0) {
      const summaryMsg = [];
      if (totalDeducted > 0) summaryMsg.push(`deducted ${totalDeducted} units`);
      if (totalAdded > 0) summaryMsg.push(`added ${totalAdded} units`);
      showToast(
        `Product "${product.ProductName}" updated: ${stockTransactions.length} variant(s) adjusted (${summaryMsg.join(', ')})!`
      );
    } else {
      showToast(`Product "${product.ProductName}" (${cleanCode}) updated successfully.`);
    }

    return { success: true };
  };

  // Delete Product
  const deleteProduct = (productId: string) => {
    const prod = products.find((p) => p.ProductID === productId);
    setProducts((prev) => prev.filter((p) => p.ProductID !== productId));
    deleteProductFromFirestore(productId).catch(console.error);
    if (prod) {
      showToast(`Product "${prod.ProductName}" removed.`);
    }
  };

  // Update Existing Variant (Admin or adjustments) - Atomic prices, details and stock adjustment
  const updateVariant = (
    productId: string,
    variant: ProductVariant,
    stockAdjustment?: {
      newStock: number;
      reason?: string;
    }
  ): { success: boolean; error?: string } => {
    const prod = products.find((p) => p.ProductID === productId);
    if (!prod) return { success: false, error: 'Product not found' };

    // Check if another variant with the same Size and Color exists
    const duplicate = prod.Variants.find(
      (v) =>
        v.VariantID !== variant.VariantID &&
        v.Size.trim().toLowerCase() === variant.Size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === variant.Color.trim().toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        error: `Variant with Size "${variant.Size}" and Color "${variant.Color}" already exists for this product.`,
      };
    }

    const existingVariant = prod.Variants.find((v) => v.VariantID === variant.VariantID) || variant;
    const oldStock = existingVariant.CurrentStock;

    // Handle stock adjustment atomically with price updates
    let finalStock = variant.CurrentStock;
    let recordedTx: InventoryTransaction | null = null;

    if (stockAdjustment && typeof stockAdjustment.newStock === 'number') {
      if (stockAdjustment.newStock < 0) {
        return { success: false, error: 'Stock quantity cannot be negative' };
      }
      finalStock = stockAdjustment.newStock;
      const diff = finalStock - oldStock;
      if (diff !== 0) {
        const isPositive = diff > 0;
        const absQty = Math.abs(diff);
        const txType: InventoryTransactionType = isPositive ? 'Adjustment IN' : 'Adjustment OUT';

        recordedTx = {
          TransactionID: `TX-ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          TransactionDate: new Date().toISOString(),
          TransactionType: txType,
          VariantID: variant.VariantID,
          ProductCode: prod.ProductCode,
          ProductName: prod.ProductName,
          Size: variant.Size.trim(),
          Color: variant.Color.trim(),
          Quantity: absQty,
          ActualPrice: Number(variant.ActualPrice) || 0, // Freshly updated cost price
          SellingPrice: Number(variant.SellingPrice) || 0, // Freshly updated selling price
          TotalCost: (Number(variant.ActualPrice) || 0) * absQty,
          TotalSellingValue: (Number(variant.SellingPrice) || 0) * absQty,
          Notes: stockAdjustment.reason || `Manual Stock Adjustment by Admin (${oldStock} -> ${finalStock})`,
          CreatedBy: currentUser?.name || 'Administrator',
        };
      }
    }

    const finalVariant: ProductVariant = {
      ...variant,
      Size: variant.Size.trim(),
      Color: variant.Color.trim(),
      ActualPrice: Number(variant.ActualPrice) || 0,
      SellingPrice: Number(variant.SellingPrice) || 0,
      CurrentStock: finalStock,
      MinimumStock: Number(variant.MinimumStock) || 0,
      Status: variant.Status,
    };

    const updatedVariants = prod.Variants.map((v) => (v.VariantID === variant.VariantID ? finalVariant : v));
    const updatedProd: Product = {
      ...prod,
      Variants: updatedVariants,
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => {
      const next = prev.map((p) => (p.ProductID === productId ? updatedProd : p));
      try {
        localStorage.setItem('gds_cached_products', JSON.stringify(next));
      } catch {}
      return next;
    });

    saveProductToFirestore(updatedProd).catch((err) => {
      console.error('Failed to save updated variant to Firestore:', err);
    });

    if (recordedTx) {
      setTransactions((prev) => {
        const next = [recordedTx!, ...prev];
        try {
          localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
        } catch {}
        return next;
      });
      saveTransactionToFirestore(recordedTx).catch((err) => {
        console.error('Failed to save adjustment transaction to Firestore:', err);
      });
    }

    if (recordedTx) {
      const dir = recordedTx.TransactionType === 'Adjustment IN' ? 'increased' : 'deducted';
      showToast(
        `Variant updated & stock ${dir} (${oldStock} → ${finalStock} units) for ${prod.ProductCode} (${finalVariant.Size}/${finalVariant.Color}).`
      );
    } else {
      showToast(`Variant (Size ${finalVariant.Size}, Color ${finalVariant.Color}) updated successfully.`);
    }

    return { success: true };
  };

  // Admin Stock Adjustment directly on variant
  const adjustVariantStock = (
    productId: string,
    variantId: string,
    newStock: number,
    reason: string
  ): { success: boolean; error?: string } => {
    let result: { success: boolean; error?: string } = { success: false };

    setProducts((prevProducts) => {
      const prod = prevProducts.find((p) => p.ProductID === productId);
      if (!prod) {
        result = { success: false, error: 'Product not found' };
        return prevProducts;
      }

      const variant = prod.Variants.find((v) => v.VariantID === variantId);
      if (!variant) {
        result = { success: false, error: 'Variant not found' };
        return prevProducts;
      }

      if (newStock < 0) {
        result = { success: false, error: 'Stock quantity cannot be negative' };
        return prevProducts;
      }

      const diff = newStock - variant.CurrentStock;
      if (diff === 0) {
        result = { success: true };
        return prevProducts;
      }

      const isPositive = diff > 0;
      const absQty = Math.abs(diff);
      const txType: InventoryTransactionType = isPositive ? 'Adjustment IN' : 'Adjustment OUT';

      const updatedVariant = { ...variant, CurrentStock: newStock };
      const updatedVariants = prod.Variants.map((v) => (v.VariantID === variantId ? updatedVariant : v));
      const updatedProd: Product = {
        ...prod,
        Variants: updatedVariants,
        ModifiedDate: new Date().toISOString(),
      };

      saveProductToFirestore(updatedProd).catch(console.error);

      // Record adjustment transaction
      const tx: InventoryTransaction = {
        TransactionID: `TX-ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        TransactionDate: new Date().toISOString(),
        TransactionType: txType,
        VariantID: variant.VariantID,
        ProductCode: prod.ProductCode,
        ProductName: prod.ProductName,
        Size: variant.Size,
        Color: variant.Color,
        Quantity: absQty,
        ActualPrice: variant.ActualPrice,
        SellingPrice: variant.SellingPrice,
        TotalCost: variant.ActualPrice * absQty,
        TotalSellingValue: variant.SellingPrice * absQty,
        Notes: reason || `Manual Stock Adjustment by Admin (${variant.CurrentStock} -> ${newStock})`,
        CreatedBy: currentUser?.name || 'Administrator',
      };

      setTransactions((prev) => {
        const next = [tx, ...prev];
        try {
          localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
        } catch {}
        return next;
      });
      saveTransactionToFirestore(tx).catch(console.error);

      showToast(`Stock adjusted from ${variant.CurrentStock} to ${newStock} units for ${prod.ProductCode} (${variant.Size}/${variant.Color})`);
      result = { success: true };

      const nextProducts = prevProducts.map((p) => (p.ProductID === productId ? updatedProd : p));
      try {
        localStorage.setItem('gds_cached_products', JSON.stringify(nextProducts));
      } catch {}
      return nextProducts;
    });

    return result;
  };

  // Add New Variant to an Existing Product (Admin)
  const addVariantToProduct = (
    productId: string,
    variantData: Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>
  ): { success: boolean; error?: string } => {
    const prod = products.find((p) => p.ProductID === productId);
    if (!prod) return { success: false, error: 'Product not found' };

    const exists = prod.Variants.find(
      (v) =>
        v.Size.trim().toLowerCase() === variantData.Size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === variantData.Color.trim().toLowerCase()
    );
    if (exists) {
      return {
        success: false,
        error: `Variant with Size ${variantData.Size} and Color ${variantData.Color} already exists!`,
      };
    }

    const newVariant: ProductVariant = {
      ...variantData,
      VariantID: `var-${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ProductID: prod.ProductID,
      ProductCode: prod.ProductCode,
    };

    const updatedProd: Product = {
      ...prod,
      Variants: [...prod.Variants, newVariant],
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === productId ? updatedProd : p)));
    saveProductToFirestore(updatedProd).catch(console.error);

    if (newVariant.CurrentStock > 0) {
      const tx: InventoryTransaction = {
        TransactionID: `TX-NEWVAR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        TransactionDate: new Date().toISOString(),
        TransactionType: 'Stock Received',
        VariantID: newVariant.VariantID,
        ProductCode: prod.ProductCode,
        ProductName: prod.ProductName,
        Size: newVariant.Size,
        Color: newVariant.Color,
        Quantity: newVariant.CurrentStock,
        ActualPrice: newVariant.ActualPrice,
        SellingPrice: newVariant.SellingPrice,
        TotalCost: newVariant.ActualPrice * newVariant.CurrentStock,
        TotalSellingValue: newVariant.SellingPrice * newVariant.CurrentStock,
        Notes: 'Initial stock on new variant creation',
        CreatedBy: currentUser?.name || 'Administrator',
      };
      setTransactions((prev) => [tx, ...prev]);
      saveTransactionToFirestore(tx).catch(console.error);
    }

    showToast(`Added new variant (${newVariant.Size} / ${newVariant.Color}) to ${prod.ProductCode}`);
    return { success: true };
  };

  // Delete Variant from Product
  const deleteVariantFromProduct = (
    productId: string,
    variantId: string
  ): { success: boolean; error?: string } => {
    const prod = products.find((p) => p.ProductID === productId);
    if (!prod) return { success: false, error: 'Product not found' };

    if (prod.Variants.length <= 1) {
      return {
        success: false,
        error: 'Product must keep at least one variant. To delete the dress completely, remove the product.',
      };
    }

    const targetVar = prod.Variants.find((v) => v.VariantID === variantId);
    const updatedProd: Product = {
      ...prod,
      Variants: prod.Variants.filter((v) => v.VariantID !== variantId),
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === productId ? updatedProd : p)));
    saveProductToFirestore(updatedProd).catch(console.error);
    showToast(`Variant (${targetVar?.Size} / ${targetVar?.Color}) removed.`);
    return { success: true };
  };

  // Inventory IN (Receive Stock)
  const receiveStock = (args: ReceiveStockArgs): { success: boolean; error?: string } => {
    const {
      productCode,
      size,
      color,
      quantity,
      actualPrice,
      sellingPrice,
      supplier,
      notes,
      transactionType = 'Stock Received',
      date,
      createdBy,
    } = args;

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const product = getProductByCode(productCode);
    if (!product) {
      return { success: false, error: `Product code "${productCode}" not found` };
    }

    const variantIndex = product.Variants.findIndex(
      (v) =>
        v.Size.trim().toLowerCase() === size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === color.trim().toLowerCase()
    );

    let updatedVariant: ProductVariant;
    const updatedVariants = [...product.Variants];

    if (variantIndex >= 0) {
      const existingVar = updatedVariants[variantIndex];
      updatedVariant = {
        ...existingVar,
        CurrentStock: existingVar.CurrentStock + quantity,
        ActualPrice: actualPrice !== undefined ? actualPrice : existingVar.ActualPrice,
        SellingPrice: sellingPrice !== undefined ? sellingPrice : existingVar.SellingPrice,
      };
      updatedVariants[variantIndex] = updatedVariant;
    } else {
      updatedVariant = {
        VariantID: `var-${product.ProductID}-${Date.now()}`,
        ProductID: product.ProductID,
        ProductCode: product.ProductCode,
        Size: size,
        Color: color,
        ActualPrice: actualPrice || 15,
        SellingPrice: sellingPrice || 25,
        CurrentStock: quantity,
        MinimumStock: settings.LowStockThreshold || 5,
        Status: 'active',
      };
      updatedVariants.push(updatedVariant);
    }

    const updatedProduct: Product = {
      ...product,
      Variants: updatedVariants,
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === product.ProductID ? updatedProduct : p)));
    saveProductToFirestore(updatedProduct).catch(console.error);

    // Create IN Transaction
    const unitCost = updatedVariant.ActualPrice;
    const unitSelling = updatedVariant.SellingPrice;
    const tx: InventoryTransaction = {
      TransactionID: `TX-IN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      TransactionDate: date || new Date().toISOString(),
      TransactionType: transactionType,
      VariantID: updatedVariant.VariantID,
      ProductCode: product.ProductCode,
      ProductName: product.ProductName,
      Size: size,
      Color: color,
      Quantity: quantity,
      ActualPrice: unitCost,
      SellingPrice: unitSelling,
      TotalCost: unitCost * quantity,
      TotalSellingValue: unitSelling * quantity,
      Supplier: supplier,
      Notes: notes || `Stock IN received (${quantity} units)`,
      CreatedBy: createdBy || currentUser?.name || 'Staff',
    };

    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirestore(tx).catch(console.error);

    showToast(`Received ${quantity} units of ${product.ProductCode} (Size ${size}, ${color})!`);
    return { success: true };
  };

  // Inventory OUT (Deduction / Damage / Lost)
  const issueStock = (args: IssueStockArgs): { success: boolean; error?: string } => {
    const { type, productCode, size, color, quantity, customerName, notes, date, createdBy } = args;

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const product = getProductByCode(productCode);
    if (!product) {
      return { success: false, error: `Product code "${productCode}" not found` };
    }

    const variantIndex = product.Variants.findIndex(
      (v) =>
        v.Size.trim().toLowerCase() === size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === color.trim().toLowerCase()
    );

    if (variantIndex < 0) {
      return { success: false, error: `Variant (Size ${size}, Color ${color}) not found for ${productCode}` };
    }

    const existingVar = product.Variants[variantIndex];
    if (existingVar.CurrentStock < quantity) {
      return {
        success: false,
        error: `Insufficient stock! Requested: ${quantity}, Available: ${existingVar.CurrentStock}`,
      };
    }

    const updatedVariants = [...product.Variants];
    const updatedVariant = {
      ...existingVar,
      CurrentStock: existingVar.CurrentStock - quantity,
    };
    updatedVariants[variantIndex] = updatedVariant;

    const updatedProduct: Product = {
      ...product,
      Variants: updatedVariants,
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === product.ProductID ? updatedProduct : p)));
    saveProductToFirestore(updatedProduct).catch(console.error);

    // Create OUT Transaction
    const tx: InventoryTransaction = {
      TransactionID: `TX-OUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      TransactionDate: date || new Date().toISOString(),
      TransactionType: type,
      VariantID: existingVar.VariantID,
      ProductCode: product.ProductCode,
      ProductName: product.ProductName,
      Size: size,
      Color: color,
      Quantity: quantity,
      ActualPrice: existingVar.ActualPrice,
      SellingPrice: existingVar.SellingPrice,
      TotalCost: existingVar.ActualPrice * quantity,
      TotalSellingValue: existingVar.SellingPrice * quantity,
      CustomerName: customerName,
      Notes: notes || `Stock issued OUT: ${type}`,
      CreatedBy: createdBy || currentUser?.name || 'Staff',
    };

    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirestore(tx).catch(console.error);

    showToast(`Deducted ${quantity} units from ${product.ProductCode} (${type})`);
    return { success: true };
  };

  // Cart Operations
  const addToCart = (item: Omit<CartItem, 'Quantity'>, qty = 1): boolean => {
    // Validate stock
    const variant = getVariant(item.ProductCode, item.Size, item.Color);
    const availableStock = variant ? variant.CurrentStock : item.CurrentStock;

    const existingItem = cart.find((c) => c.VariantID === item.VariantID);
    const currentQtyInCart = existingItem ? existingItem.Quantity : 0;
    const newTotalQty = currentQtyInCart + qty;

    if (newTotalQty > availableStock) {
      showToast(`Cannot add ${qty}. Only ${availableStock} in stock (already ${currentQtyInCart} in cart).`, 'error');
      return false;
    }

    if (existingItem) {
      setCart((prev) =>
        prev.map((c) => (c.VariantID === item.VariantID ? { ...c, Quantity: newTotalQty } : c))
      );
    } else {
      setCart((prev) => [...prev, { ...item, Quantity: qty }]);
    }

    showToast(`Added ${item.ProductName} (${item.Size} / ${item.Color}) to cart`);
    return true;
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((c) => c.VariantID !== variantId));
  };

  const updateCartQuantity = (variantId: string, quantity: number): boolean => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return true;
    }

    const item = cart.find((c) => c.VariantID === variantId);
    if (!item) return false;

    const variant = getVariant(item.ProductCode, item.Size, item.Color);
    const availableStock = variant ? variant.CurrentStock : item.CurrentStock;

    if (quantity > availableStock) {
      showToast(`Cannot set to ${quantity}. Maximum available stock is ${availableStock}`, 'error');
      return false;
    }

    setCart((prev) => prev.map((c) => (c.VariantID === variantId ? { ...c, Quantity: quantity } : c)));
    return true;
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.SellingPrice * item.Quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.Quantity, 0);
  }, [cart]);

  // Complete Sale / Checkout (POS & Customer Shop)
  const completeSale = (args: CompleteSaleArgs): { success: boolean; order?: Order; error?: string } => {
    const { items, customerId, customerName, customerPhone, customerAddress, discount, paymentMethod, notes, createdBy } = args;

    if (items.length === 0) {
      return { success: false, error: 'Cannot complete sale with an empty cart' };
    }

    // Step 1: Validate stock for all items first
    for (const item of items) {
      const variant = getVariant(item.ProductCode, item.Size, item.Color);
      if (!variant) {
        return { success: false, error: `Item ${item.ProductCode} (${item.Size}/${item.Color}) is no longer available` };
      }
      if (variant.CurrentStock < item.Quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${item.ProductName} (${item.Size}/${item.Color}). Available: ${variant.CurrentStock}, Requested: ${item.Quantity}`,
        };
      }
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    let orderSubtotal = 0;
    let orderCost = 0;

    const orderItems: OrderItem[] = items.map((item, idx) => {
      const lineSubtotal = item.SellingPrice * item.Quantity;
      const lineCost = item.ActualPrice * item.Quantity;
      const lineProfit = lineSubtotal - lineCost;

      orderSubtotal += lineSubtotal;
      orderCost += lineCost;

      return {
        OrderItemID: `item-${orderId}-${idx}`,
        OrderID: orderId,
        VariantID: item.VariantID,
        ProductCode: item.ProductCode,
        ProductName: item.ProductName,
        Size: item.Size,
        Color: item.Color,
        Quantity: item.Quantity,
        UnitPrice: item.SellingPrice,
        ActualPrice: item.ActualPrice,
        Subtotal: lineSubtotal,
        Profit: lineProfit,
        ProductImage: item.ImageURL,
      };
    });

    const finalDiscount = Math.min(discount, orderSubtotal);
    const orderTotal = Math.max(0, orderSubtotal - finalDiscount);
    const orderProfit = orderTotal - orderCost;

    const newOrder: Order = {
      OrderID: orderId,
      CustomerID: customerId,
      CustomerName: customerName || 'Walk-in Customer',
      CustomerPhone: customerPhone,
      CustomerAddress: customerAddress,
      OrderDate: nowIso,
      Status: 'completed',
      Subtotal: orderSubtotal,
      Discount: finalDiscount,
      Total: orderTotal,
      Cost: orderCost,
      Profit: orderProfit,
      PaymentMethod: paymentMethod,
      Items: orderItems,
      Notes: notes,
      CreatedBy: createdBy || currentUser?.name || 'Sales Staff',
    };

    // Step 2: Deduct stock from products & save
    const updatedProducts = [...products];
    const newTxList: InventoryTransaction[] = [];

    items.forEach((item) => {
      // Robust lookup: match by ProductID, or by ProductCode, or by variant containing item.VariantID
      let pIndex = updatedProducts.findIndex((p) => Boolean(item.ProductID) && p.ProductID === item.ProductID);
      if (pIndex < 0) {
        pIndex = updatedProducts.findIndex(
          (p) =>
            (Boolean(item.ProductCode) && p.ProductCode.trim().toUpperCase() === item.ProductCode.trim().toUpperCase()) ||
            p.Variants.some((v) => v.VariantID === item.VariantID)
        );
      }

      if (pIndex >= 0) {
        const prod = updatedProducts[pIndex];
        let vIndex = prod.Variants.findIndex((v) => v.VariantID === item.VariantID);
        if (vIndex < 0) {
          vIndex = prod.Variants.findIndex(
            (v) =>
              v.Size.trim().toLowerCase() === item.Size.trim().toLowerCase() &&
              v.Color.trim().toLowerCase() === item.Color.trim().toLowerCase()
          );
        }

        if (vIndex >= 0) {
          const v = prod.Variants[vIndex];
          const newStock = Math.max(0, v.CurrentStock - item.Quantity);
          const updatedVar = {
            ...v,
            CurrentStock: newStock,
          };
          const updatedVarList = [...prod.Variants];
          updatedVarList[vIndex] = updatedVar;
          const updatedProd = {
            ...prod,
            Variants: updatedVarList,
            ModifiedDate: nowIso,
          };
          updatedProducts[pIndex] = updatedProd;
          saveProductToFirestore(updatedProd).catch(console.error);
        }
      }

      // Generate OUT Inventory Transaction
      const tx: InventoryTransaction = {
        TransactionID: `TX-SALE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        TransactionDate: nowIso,
        TransactionType: 'Customer Sale',
        VariantID: item.VariantID,
        ProductCode: item.ProductCode,
        ProductName: item.ProductName,
        Size: item.Size,
        Color: item.Color,
        Quantity: item.Quantity,
        ActualPrice: item.ActualPrice,
        SellingPrice: item.SellingPrice,
        TotalCost: item.ActualPrice * item.Quantity,
        TotalSellingValue: item.SellingPrice * item.Quantity,
        ReferenceID: orderId,
        CustomerID: customerId,
        CustomerName: customerName || 'Walk-in Customer',
        Notes: `POS Sale checkout (${orderId})`,
        CreatedBy: createdBy || currentUser?.name || 'Sales Staff',
      };
      newTxList.push(tx);
      saveTransactionToFirestore(tx).catch(console.error);
    });

    setProducts(updatedProducts);
    try {
      localStorage.setItem('gds_cached_products', JSON.stringify(updatedProducts));
    } catch {}

    setTransactions((prev) => {
      const nextTx = [...newTxList, ...prev];
      try {
        localStorage.setItem('gds_cached_transactions', JSON.stringify(nextTx));
      } catch {}
      return nextTx;
    });

    setOrders((prev) => {
      const nextOrders = [newOrder, ...prev];
      try {
        localStorage.setItem('gds_cached_orders', JSON.stringify(nextOrders));
      } catch {}
      return nextOrders;
    });
    saveOrderToFirestore(newOrder).catch(console.error);

    // Update customer spend if registered
    if (customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.CustomerID === customerId) {
            const updated = {
              ...c,
              TotalOrders: c.TotalOrders + 1,
              TotalSpend: c.TotalSpend + orderTotal,
            };
            saveCustomerToFirestore(updated).catch(console.error);
            return updated;
          }
          return c;
        })
      );
    }

    clearCart();
    setActiveReceiptOrder(newOrder);
    showToast(`Sale completed! Receipt #${newOrder.OrderID}`);
    return { success: true, order: newOrder };
  };

  // Update Order (Admin: adjusts item quantities, status, payment and recalculates stock in real-time)
  const updateOrder = (updatedOrder: Order): { success: boolean; error?: string } => {
    const existing = orders.find((o) => o.OrderID === updatedOrder.OrderID);
    if (!existing) {
      return { success: false, error: 'Order not found' };
    }

    const wasActive = existing.Status !== 'cancelled';
    const willBeActive = updatedOrder.Status !== 'cancelled';

    // Calculate item quantities changes: map of variant key -> net delta to DEDUCT from stock
    // Positive delta = need to deduct more stock from inventory
    // Negative delta = need to restore stock to inventory
    const stockDeltas = new Map<
      string,
      { delta: number; productCode: string; size: string; color: string; productName: string }
    >();

    if (wasActive) {
      existing.Items.forEach((item) => {
        const key = `${item.ProductCode}___${item.Size}___${item.Color}`.toLowerCase();
        const prev = stockDeltas.get(key) || {
          delta: 0,
          productCode: item.ProductCode,
          size: item.Size,
          color: item.Color,
          productName: item.ProductName,
        };
        prev.delta -= item.Quantity; // undo previous deduction
        stockDeltas.set(key, prev);
      });
    }

    if (willBeActive) {
      updatedOrder.Items.forEach((item) => {
        const key = `${item.ProductCode}___${item.Size}___${item.Color}`.toLowerCase();
        const prev = stockDeltas.get(key) || {
          delta: 0,
          productCode: item.ProductCode,
          size: item.Size,
          color: item.Color,
          productName: item.ProductName,
        };
        prev.delta += item.Quantity; // apply new deduction
        stockDeltas.set(key, prev);
      });
    }

    // Check availability and update product stock
    const updatedProducts = [...products];
    const newTxList: InventoryTransaction[] = [];
    const nowIso = new Date().toISOString();

    for (const [, info] of stockDeltas.entries()) {
      if (info.delta === 0) continue;

      let pIndex = updatedProducts.findIndex(
        (p) => p.ProductCode.trim().toUpperCase() === info.productCode.trim().toUpperCase()
      );
      if (pIndex < 0) {
        return { success: false, error: `Product "${info.productCode}" not found in catalog` };
      }

      const prod = updatedProducts[pIndex];
      const vIndex = prod.Variants.findIndex(
        (v) =>
          v.Size.trim().toLowerCase() === info.size.trim().toLowerCase() &&
          v.Color.trim().toLowerCase() === info.color.trim().toLowerCase()
      );
      if (vIndex < 0) {
        return {
          success: false,
          error: `Variant (${info.size}/${info.color}) not found for ${info.productCode}`,
        };
      }

      const variant = prod.Variants[vIndex];
      if (info.delta > 0 && variant.CurrentStock < info.delta) {
        return {
          success: false,
          error: `Insufficient stock for ${info.productName} (${info.size}/${info.color}). Available: ${variant.CurrentStock}, Needed additional: ${info.delta}`,
        };
      }

      // Deduct or restore stock
      const newStock = Math.max(0, variant.CurrentStock - info.delta);
      const updatedVar = {
        ...variant,
        CurrentStock: newStock,
      };
      const updatedVarList = [...prod.Variants];
      updatedVarList[vIndex] = updatedVar;
      const updatedProd = {
        ...prod,
        Variants: updatedVarList,
        ModifiedDate: nowIso,
      };
      updatedProducts[pIndex] = updatedProd;
      saveProductToFirestore(updatedProd).catch(console.error);

      // Audit transaction
      const tx: InventoryTransaction = {
        TransactionID: `TX-ORDEDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        TransactionDate: nowIso,
        TransactionType: info.delta > 0 ? 'Customer Sale' : 'Adjustment IN',
        VariantID: variant.VariantID,
        ProductCode: info.productCode,
        ProductName: info.productName,
        Size: info.size,
        Color: info.color,
        Quantity: Math.abs(info.delta),
        ActualPrice: variant.ActualPrice,
        SellingPrice: variant.SellingPrice,
        TotalCost: variant.ActualPrice * Math.abs(info.delta),
        TotalSellingValue: variant.SellingPrice * Math.abs(info.delta),
        ReferenceID: updatedOrder.OrderID,
        CustomerID: updatedOrder.CustomerID,
        CustomerName: updatedOrder.CustomerName || 'Walk-in Customer',
        Notes: `Order #${updatedOrder.OrderID} edit: stock ${info.delta > 0 ? `deducted (-${info.delta})` : `restored (+${Math.abs(info.delta)})`}`,
        CreatedBy: currentUser?.name || 'Administrator',
      };
      newTxList.push(tx);
      saveTransactionToFirestore(tx).catch(console.error);
    }

    // Recalculate totals
    let newSubtotal = 0;
    let newCost = 0;
    const recalculatedItems: OrderItem[] = updatedOrder.Items.map((item, idx) => {
      const lineSubtotal = item.UnitPrice * item.Quantity;
      const lineCost = item.ActualPrice * item.Quantity;
      newSubtotal += lineSubtotal;
      newCost += lineCost;
      return {
        ...item,
        OrderItemID: item.OrderItemID || `item-${updatedOrder.OrderID}-${idx}`,
        OrderID: updatedOrder.OrderID,
        Subtotal: lineSubtotal,
        Profit: lineSubtotal - lineCost,
      };
    });

    const finalDiscount = Math.min(updatedOrder.Discount || 0, newSubtotal);
    const finalTotal = Math.max(0, newSubtotal - finalDiscount);
    const finalProfit = finalTotal - newCost;

    const finalOrder: Order = {
      ...updatedOrder,
      Items: recalculatedItems,
      Subtotal: newSubtotal,
      Discount: finalDiscount,
      Total: finalTotal,
      Cost: newCost,
      Profit: finalProfit,
    };

    setProducts(updatedProducts);
    try {
      localStorage.setItem('gds_cached_products', JSON.stringify(updatedProducts));
    } catch {}

    if (newTxList.length > 0) {
      setTransactions((prev) => {
        const next = [...newTxList, ...prev];
        try {
          localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    setOrders((prev) => {
      const next = prev.map((o) => (o.OrderID === finalOrder.OrderID ? finalOrder : o));
      try {
        localStorage.setItem('gds_cached_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (activeReceiptOrder?.OrderID === finalOrder.OrderID) {
      setActiveReceiptOrder(finalOrder);
    }

    saveOrderToFirestore(finalOrder).catch(console.error);
    showToast(`Order #${finalOrder.OrderID} updated and inventory stock synchronized!`);
    return { success: true };
  };

  // Delete Order (Admin: deletes order and optionally restores stock to inventory)
  const deleteOrder = (orderId: string, restoreStock: boolean = true): { success: boolean; error?: string } => {
    const existing = orders.find((o) => o.OrderID === orderId);
    if (!existing) {
      return { success: false, error: 'Order not found' };
    }

    const updatedProducts = [...products];
    const newTxList: InventoryTransaction[] = [];
    const nowIso = new Date().toISOString();

    if (restoreStock && existing.Status !== 'cancelled') {
      existing.Items.forEach((item) => {
        const pIndex = updatedProducts.findIndex(
          (p) => p.ProductCode.trim().toUpperCase() === item.ProductCode.trim().toUpperCase()
        );
        if (pIndex >= 0) {
          const prod = updatedProducts[pIndex];
          const vIndex = prod.Variants.findIndex(
            (v) =>
              v.Size.trim().toLowerCase() === item.Size.trim().toLowerCase() &&
              v.Color.trim().toLowerCase() === item.Color.trim().toLowerCase()
          );
          if (vIndex >= 0) {
            const v = prod.Variants[vIndex];
            const updatedVar = {
              ...v,
              CurrentStock: v.CurrentStock + item.Quantity,
            };
            const updatedVarList = [...prod.Variants];
            updatedVarList[vIndex] = updatedVar;
            const updatedProd = {
              ...prod,
              Variants: updatedVarList,
              ModifiedDate: nowIso,
            };
            updatedProducts[pIndex] = updatedProd;
            saveProductToFirestore(updatedProd).catch(console.error);

            const tx: InventoryTransaction = {
              TransactionID: `TX-ORDDEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              TransactionDate: nowIso,
              TransactionType: 'Adjustment IN',
              VariantID: v.VariantID,
              ProductCode: item.ProductCode,
              ProductName: item.ProductName,
              Size: item.Size,
              Color: item.Color,
              Quantity: item.Quantity,
              ActualPrice: item.ActualPrice,
              SellingPrice: item.UnitPrice,
              TotalCost: item.ActualPrice * item.Quantity,
              TotalSellingValue: item.UnitPrice * item.Quantity,
              ReferenceID: orderId,
              Notes: `Restored stock from deleted order #${orderId}`,
              CreatedBy: currentUser?.name || 'Administrator',
            };
            newTxList.push(tx);
            saveTransactionToFirestore(tx).catch(console.error);
          }
        }
      });

      setProducts(updatedProducts);
      try {
        localStorage.setItem('gds_cached_products', JSON.stringify(updatedProducts));
      } catch {}

      if (newTxList.length > 0) {
        setTransactions((prev) => {
          const next = [...newTxList, ...prev];
          try {
            localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    }

    setOrders((prev) => {
      const next = prev.filter((o) => o.OrderID !== orderId);
      try {
        localStorage.setItem('gds_cached_orders', JSON.stringify(next));
      } catch {}
      return next;
    });

    if (activeReceiptOrder?.OrderID === orderId) {
      setActiveReceiptOrder(null);
    }

    deleteOrderFromFirestore(orderId).catch(console.error);
    showToast(`Order #${orderId} deleted and ${restoreStock ? 'stock restored' : 'removed'}.`);
    return { success: true };
  };

  // Update Inventory Transaction (Admin: recalculates stock delta and syncs with inventory)
  const updateTransaction = (updatedTx: InventoryTransaction): { success: boolean; error?: string } => {
    const existing = transactions.find((t) => t.TransactionID === updatedTx.TransactionID);
    if (!existing) {
      return { success: false, error: 'Transaction not found' };
    }

    const isOut = ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(
      existing.TransactionType
    );
    const isIn = ['Stock Received', 'Restock', 'Initial Stock', 'Adjustment IN', 'Supplier Purchase'].includes(
      existing.TransactionType
    );

    const qtyDelta = updatedTx.Quantity - existing.Quantity;
    const updatedProducts = [...products];
    const nowIso = new Date().toISOString();

    if (qtyDelta !== 0) {
      const pIndex = updatedProducts.findIndex(
        (p) => p.ProductCode.trim().toUpperCase() === existing.ProductCode.trim().toUpperCase()
      );
      if (pIndex >= 0) {
        const prod = updatedProducts[pIndex];
        const vIndex = prod.Variants.findIndex(
          (v) =>
            v.Size.trim().toLowerCase() === existing.Size.trim().toLowerCase() &&
            v.Color.trim().toLowerCase() === existing.Color.trim().toLowerCase()
        );
        if (vIndex >= 0) {
          const v = prod.Variants[vIndex];
          let newStock = v.CurrentStock;
          if (isOut) {
            // OUT transaction: increasing quantity deducts more, decreasing quantity restores
            if (qtyDelta > 0 && v.CurrentStock < qtyDelta) {
              return { success: false, error: `Insufficient stock! Only ${v.CurrentStock} available to deduct.` };
            }
            newStock = Math.max(0, v.CurrentStock - qtyDelta);
          } else if (isIn) {
            // IN transaction: increasing quantity adds more, decreasing quantity subtracts
            newStock = Math.max(0, v.CurrentStock + qtyDelta);
          }

          const updatedVar = { ...v, CurrentStock: newStock };
          const updatedVarList = [...prod.Variants];
          updatedVarList[vIndex] = updatedVar;
          const updatedProd = { ...prod, Variants: updatedVarList, ModifiedDate: nowIso };
          updatedProducts[pIndex] = updatedProd;
          saveProductToFirestore(updatedProd).catch(console.error);

          setProducts(updatedProducts);
          try {
            localStorage.setItem('gds_cached_products', JSON.stringify(updatedProducts));
          } catch {}
        }
      }
    }

    const finalTx: InventoryTransaction = {
      ...updatedTx,
      TotalCost: (updatedTx.ActualPrice || 0) * updatedTx.Quantity,
      TotalSellingValue: (updatedTx.SellingPrice || 0) * updatedTx.Quantity,
    };

    setTransactions((prev) => {
      const next = prev.map((t) => (t.TransactionID === finalTx.TransactionID ? finalTx : t));
      try {
        localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
      } catch {}
      return next;
    });

    saveTransactionToFirestore(finalTx).catch(console.error);
    showToast(`Transaction #${finalTx.TransactionID} updated and stock recalculated!`);
    return { success: true };
  };

  // Delete Inventory Transaction (Admin: reverses stock impact and deletes)
  const deleteTransaction = (transactionId: string): { success: boolean; error?: string } => {
    const existing = transactions.find((t) => t.TransactionID === transactionId);
    if (!existing) {
      return { success: false, error: 'Transaction not found' };
    }

    const isOut = ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(
      existing.TransactionType
    );
    const isIn = ['Stock Received', 'Restock', 'Initial Stock', 'Adjustment IN', 'Supplier Purchase'].includes(
      existing.TransactionType
    );

    const updatedProducts = [...products];
    const nowIso = new Date().toISOString();

    const pIndex = updatedProducts.findIndex(
      (p) => p.ProductCode.trim().toUpperCase() === existing.ProductCode.trim().toUpperCase()
    );
    if (pIndex >= 0) {
      const prod = updatedProducts[pIndex];
      const vIndex = prod.Variants.findIndex(
        (v) =>
          v.Size.trim().toLowerCase() === existing.Size.trim().toLowerCase() &&
          v.Color.trim().toLowerCase() === existing.Color.trim().toLowerCase()
      );
      if (vIndex >= 0) {
        const v = prod.Variants[vIndex];
        let newStock = v.CurrentStock;
        if (isOut) {
          // Reversing an OUT transaction restores stock
          newStock = v.CurrentStock + existing.Quantity;
        } else if (isIn) {
          // Reversing an IN transaction removes stock
          newStock = Math.max(0, v.CurrentStock - existing.Quantity);
        }

        const updatedVar = { ...v, CurrentStock: newStock };
        const updatedVarList = [...prod.Variants];
        updatedVarList[vIndex] = updatedVar;
        const updatedProd = { ...prod, Variants: updatedVarList, ModifiedDate: nowIso };
        updatedProducts[pIndex] = updatedProd;
        saveProductToFirestore(updatedProd).catch(console.error);

        setProducts(updatedProducts);
        try {
          localStorage.setItem('gds_cached_products', JSON.stringify(updatedProducts));
        } catch {}
      }
    }

    setTransactions((prev) => {
      const next = prev.filter((t) => t.TransactionID !== transactionId);
      try {
        localStorage.setItem('gds_cached_transactions', JSON.stringify(next));
      } catch {}
      return next;
    });

    deleteTransactionFromFirestore(transactionId).catch(console.error);
    showToast(`Transaction deleted and inventory stock reversed!`);
    return { success: true };
  };

  // Masters Management
  const addDressType = (type: Omit<DressType, 'DressTypeID'>) => {
    const newType: DressType = {
      ...type,
      DressTypeID: `dt-${Date.now()}`,
    };
    setDressTypes((prev) => [...prev, newType]);
    saveDressTypeToFirestore(newType).catch(console.error);
    showToast(`Dress type "${newType.Name}" added.`);
  };

  const updateDressType = (type: DressType) => {
    setDressTypes((prev) => prev.map((dt) => (dt.DressTypeID === type.DressTypeID ? type : dt)));
    saveDressTypeToFirestore(type).catch(console.error);
    showToast(`Dress type "${type.Name}" updated.`);
  };

  const deleteDressType = (id: string) => {
    setDressTypes((prev) => prev.filter((dt) => dt.DressTypeID !== id));
    deleteDressTypeFromFirestore(id).catch(console.error);
    showToast('Dress type removed.');
  };

  const addSize = (sizeValue: string): { success: boolean; error?: string } => {
    const clean = sizeValue.trim();
    if (!clean) return { success: false, error: 'Size cannot be empty' };
    if (sizes.some((s) => s.SizeValue.toLowerCase() === clean.toLowerCase())) {
      return { success: false, error: `Size "${clean}" already exists!` };
    }
    const newSize: SizeItem = {
      SizeID: `sz-${Date.now()}`,
      SizeValue: clean,
      Status: 'active',
    };
    const updated = [...sizes, newSize].sort((a, b) => {
      const numA = parseInt(a.SizeValue, 10);
      const numB = parseInt(b.SizeValue, 10);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.SizeValue.localeCompare(b.SizeValue);
    });
    setSizes(updated);
    saveSizeToFirestore(newSize).catch(console.error);
    showToast(`Size "${clean}" added.`);
    return { success: true };
  };

  const updateSize = (size: SizeItem) => {
    setSizes((prev) => prev.map((s) => (s.SizeID === size.SizeID ? size : s)));
    saveSizeToFirestore(size).catch(console.error);
    showToast(`Size "${size.SizeValue}" updated.`);
  };

  const deleteSize = (id: string) => {
    setSizes((prev) => prev.filter((s) => s.SizeID !== id));
    deleteSizeFromFirestore(id).catch(console.error);
    showToast('Size removed.');
  };

  const addColor = (name: string, hex: string): { success: boolean; error?: string } => {
    const cleanName = name.trim();
    if (!cleanName) return { success: false, error: 'Color name cannot be empty' };
    if (colors.some((c) => c.ColorName.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `Color "${cleanName}" already exists!` };
    }
    const newColor: ColorItem = {
      ColorID: `c-${Date.now()}`,
      ColorName: cleanName,
      HexCode: hex.startsWith('#') ? hex : `#${hex}`,
      Status: 'active',
    };
    setColors((prev) => [...prev, newColor]);
    saveColorToFirestore(newColor).catch(console.error);
    showToast(`Color "${cleanName}" added.`);
    return { success: true };
  };

  const updateColor = (color: ColorItem) => {
    setColors((prev) => prev.map((c) => (c.ColorID === color.ColorID ? color : c)));
    saveColorToFirestore(color).catch(console.error);
    showToast(`Color "${color.ColorName}" updated.`);
  };

  const deleteColor = (id: string) => {
    setColors((prev) => prev.filter((c) => c.ColorID !== id));
    deleteColorFromFirestore(id).catch(console.error);
    showToast('Color removed.');
  };

  const addCustomer = (
    data: Omit<Customer, 'CustomerID' | 'CreatedDate' | 'TotalOrders' | 'TotalSpend'>
  ): Customer => {
    const newCustomer: Customer = {
      ...data,
      CustomerID: `cust-${Date.now()}`,
      CreatedDate: new Date().toISOString().split('T')[0],
      TotalOrders: 0,
      TotalSpend: 0,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    saveCustomerToFirestore(newCustomer).catch(console.error);
    showToast(`Customer "${newCustomer.CustomerName}" created.`);
    return newCustomer;
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.CustomerID === customer.CustomerID ? customer : c)));
    saveCustomerToFirestore(customer).catch(console.error);
    showToast(`Customer "${customer.CustomerName}" updated.`);
  };

  const updateSettings = async (
    newSettings: Partial<StoreSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    const updated: StoreSettings = {
      ...settings,
      ...newSettings,
      StoreName: newSettings.StoreName !== undefined ? newSettings.StoreName.trim() : settings.StoreName,
      Tagline: newSettings.Tagline !== undefined ? newSettings.Tagline.trim() : settings.Tagline,
      Phone: newSettings.Phone !== undefined ? newSettings.Phone.trim() : settings.Phone,
      Email: newSettings.Email !== undefined ? newSettings.Email.trim() : settings.Email,
      Address: newSettings.Address !== undefined ? newSettings.Address.trim() : settings.Address,
      Currency: newSettings.Currency || settings.Currency || '$',
      LowStockThreshold: newSettings.LowStockThreshold || settings.LowStockThreshold || 5,
      ReceiptFooterMessage:
        newSettings.ReceiptFooterMessage !== undefined
          ? newSettings.ReceiptFooterMessage.trim()
          : settings.ReceiptFooterMessage,
    };

    setSettings(updated);
    try {
      localStorage.setItem('gds_cached_store_settings', JSON.stringify(updated));
      await saveSettingsToFirestore(updated);
      showToast('Store Profile & Receipt Details saved permanently to database!');
      return { success: true };
    } catch (err) {
      console.error('Failed to save store settings to database:', err);
      showToast('Failed to save store settings to database', 'error');
      return { success: false, error: 'Database save failed' };
    }
  };

  // Quick updater for admin to define/change low stock threshold
  const updateLowStockThreshold = async (newThreshold: number) => {
    const safeThreshold = Math.max(1, Math.min(100, Math.floor(newThreshold)));
    await updateSettings({ LowStockThreshold: safeThreshold });
  };

  // Aggregated KPIs calculation
  const kpis = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const threshold = settings.LowStockThreshold || 5;

    let totalVariants = 0;
    let totalStockUnits = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProductIds = new Set<string>();

    products.forEach((p) => {
      let productHasLowStock = false;
      p.Variants.forEach((v) => {
        totalVariants += 1;
        totalStockUnits += v.CurrentStock;
        totalInventoryValue += v.CurrentStock * v.ActualPrice;
        const itemThreshold = v.MinimumStock || threshold;
        if (v.CurrentStock === 0) {
          outOfStockCount += 1;
          lowStockCount += 1;
          productHasLowStock = true;
        } else if (v.CurrentStock <= itemThreshold) {
          lowStockCount += 1;
          productHasLowStock = true;
        }
      });
      if (productHasLowStock) {
        lowStockProductIds.add(p.ProductID);
      }
    });

    const todayOrdersList = orders.filter((o) => o.OrderDate.startsWith(today));
    const todayRevenue = todayOrdersList.reduce((sum, o) => sum + o.Total, 0);
    const todayCost = todayOrdersList.reduce((sum, o) => sum + o.Cost, 0);
    const todayProfit = todayOrdersList.reduce((sum, o) => sum + o.Profit, 0);
    const todayOrders = todayOrdersList.length;
    const todayItemsSold = todayOrdersList.reduce(
      (sum, o) => sum + o.Items.reduce((iSum, item) => iSum + item.Quantity, 0),
      0
    );

    const todayTxList = transactions.filter((t) => t.TransactionDate.startsWith(today));
    const todayStockIn = todayTxList
      .filter((t) => ['Purchase', 'Stock Received', 'Customer Return', 'Adjustment IN'].includes(t.TransactionType))
      .reduce((sum, t) => sum + t.Quantity, 0);
    const todayStockOut = todayTxList
      .filter((t) => ['Customer Sale', 'Damaged', 'Lost', 'Adjustment OUT', 'Supplier Return'].includes(t.TransactionType))
      .reduce((sum, t) => sum + t.Quantity, 0);

    return {
      totalProducts: products.length,
      totalVariants,
      totalStockUnits,
      totalInventoryValue,
      lowStockCount,
      outOfStockCount,
      lowStockProductsCount: lowStockProductIds.size,
      definedThreshold: threshold,
      todayRevenue,
      todayProfit,
      todayCost,
      todayOrders,
      todayItemsSold,
      todayStockIn,
      todayStockOut,
    };
  }, [products, orders, transactions, settings.LowStockThreshold]);

  // Real-time Low Stock Items List for Notifications & Badges
  const lowStockItemsList = useMemo(() => {
    const threshold = settings.LowStockThreshold || 5;
    const list: Array<{
      productId: string;
      productName: string;
      productCode: string;
      variantId: string;
      size: string;
      color: string;
      currentStock: number;
      threshold: number;
      sellingPrice: number;
      image?: string;
    }> = [];

    products.forEach((p) => {
      p.Variants.forEach((v) => {
        const itemThreshold = v.MinimumStock || threshold;
        if (v.CurrentStock <= itemThreshold) {
          list.push({
            productId: p.ProductID,
            productName: p.ProductName,
            productCode: p.ProductCode,
            variantId: v.VariantID,
            size: v.Size,
            color: v.Color,
            currentStock: v.CurrentStock,
            threshold: itemThreshold,
            sellingPrice: v.SellingPrice,
            image: p.Images?.[0]?.ImageURL,
          });
        }
      });
    });

    return list.sort((a, b) => a.currentStock - b.currentStock);
  }, [products, settings.LowStockThreshold]);

  // Active email alert recipients list (admins + staff who opted in + store alert emails)
  const emailAlertRecipients = useMemo(() => {
    const set = new Set<string>();

    // 1. Staff and admin users with valid emails who have alerts enabled
    users.forEach((u) => {
      if (u.status !== 'inactive' && u.email && isValidEmail(u.email)) {
        if (u.role === 'admin' || u.receiveStockAlerts !== false) {
          set.add(normalizeEmail(u.email));
        }
      }
    });

    // 2. AlertEmailRecipients from store settings (comma/space/semicolon separated)
    if (settings.AlertEmailRecipients) {
      settings.AlertEmailRecipients.split(/[,;\s]+/).forEach((em) => {
        if (isValidEmail(em)) {
          set.add(normalizeEmail(em));
        }
      });
    }

    // 3. Store contact email if valid and set is empty
    if (set.size === 0 && settings.Email && isValidEmail(settings.Email)) {
      set.add(normalizeEmail(settings.Email));
    }

    return Array.from(set);
  }, [users, settings.AlertEmailRecipients, settings.Email]);

  // Dispatch / Format Low Stock Email Alert Notification
  const sendLowStockEmailAlert = async (
    customNotes?: string
  ): Promise<{
    success: boolean;
    recipients: string[];
    subject: string;
    body: string;
    mailtoUrl: string;
    error?: string;
  }> => {
    const recipients = emailAlertRecipients;
    const threshold = settings.LowStockThreshold || 5;
    const storeTitle = settings.StoreName || 'Girl Dress Shop';
    const alertItems = lowStockItemsList;

    if (alertItems.length === 0) {
      return {
        success: false,
        recipients: [],
        subject: '',
        body: '',
        mailtoUrl: '',
        error: 'No product variants are currently below threshold. All stock levels are healthy.',
      };
    }

    const subject = `[Stock Alert] ${storeTitle}: ${alertItems.length} Products Below Threshold (≤${threshold} units)`;

    const dateStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    let bodyText = `INVENTORY RESTOCK ALERT - ${storeTitle.toUpperCase()}\n`;
    bodyText += `Date/Time: ${dateStr}\n`;
    bodyText += `Defined Low Stock Threshold: ${threshold} available units\n`;
    bodyText += `Total Alert Items: ${alertItems.length} variant(s) requiring restock\n`;
    bodyText += `\n------------------------------------------------------------\n`;
    bodyText += `ITEMS BELOW THRESHOLD:\n`;
    bodyText += `------------------------------------------------------------\n`;

    alertItems.forEach((item, idx) => {
      const status = item.currentStock === 0 ? 'CRITICAL - OUT OF STOCK' : 'LOW STOCK';
      bodyText += `${idx + 1}. [${item.productCode}] ${item.productName}\n`;
      bodyText += `   Size: ${item.size} | Color: ${item.color}\n`;
      bodyText += `   Available Stock: ${item.currentStock} units (Threshold: ${item.threshold})\n`;
      bodyText += `   Status: ${status} | Price: $${item.sellingPrice.toFixed(2)}\n\n`;
    });

    if (customNotes && customNotes.trim()) {
      bodyText += `\nADMINISTRATOR NOTES:\n${customNotes.trim()}\n`;
    }

    bodyText += `\nPlease access the store Inventory IN portal to receive incoming vendor shipments and restock inventory.\n`;
    bodyText += `Generated by ${storeTitle} POS & Inventory Management System.`;

    const recipientParam = recipients.join(',');
    const mailtoUrl = `mailto:${recipientParam}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    const nowIso = new Date().toISOString();
    try {
      await updateSettings({ LastAlertEmailSent: nowIso });
    } catch {
      // ignore
    }

    showToast(
      recipients.length > 0
        ? `Low stock alert email prepared for ${recipients.length} recipient(s)!`
        : 'Alert email prepared. (Note: Add staff emails in Settings to enable direct recipient delivery)'
    );

    return {
      success: true,
      recipients,
      subject,
      body: bodyText,
      mailtoUrl,
    };
  };

  return (
    <StoreContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedProductId,
        setSelectedProductId,
        selectedOrderId,
        setSelectedOrderId,
        activeReceiptOrder,
        setActiveReceiptOrder,

        currentUser,
        role,
        isAdmin,
        loginWithNumber,
        logout,
        users,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,

        products,
        dressTypes,
        sizes,
        colors,
        customers,
        orders,
        transactions,
        priceCategories,
        settings,
        updateSettings,

        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartItemCount,

        addProduct,
        updateProduct,
        deleteProduct,
        updateVariant,
        adjustVariantStock,
        addVariantToProduct,
        deleteVariantFromProduct,

        receiveStock,
        issueStock,
        completeSale,

        updateOrder,
        deleteOrder,
        updateTransaction,
        deleteTransaction,

        addDressType,
        updateDressType,
        deleteDressType,

        addSize,
        updateSize,
        deleteSize,

        addColor,
        updateColor,
        deleteColor,

        addCustomer,
        updateCustomer,

        notifications,
        showToast,
        dismissToast,

        getDressTypeName,
        getProductByCode,
        getVariant,
        getAvailableSizesForCode,
        getAvailableColorsForCodeAndSize,

        kpis,
        isFirebaseConnected,
        isQuotaExceeded,
        quotaUpgradeUrl: FIRESTORE_UPGRADE_URL,
        updateLowStockThreshold,
        lowStockItemsList,
        emailAlertRecipients,
        sendLowStockEmailAlert,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
