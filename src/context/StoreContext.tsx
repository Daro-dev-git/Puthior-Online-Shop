import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  subscribeDressTypes,
  subscribeSizes,
  subscribeColors,
  subscribeSettings,
  subscribeUsers,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveOrderToFirestore,
  saveTransactionToFirestore,
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
  updateVariant: (productId: string, variant: ProductVariant) => { success: boolean; error?: string };
  adjustVariantStock: (productId: string, variantId: string, newStock: number, reason: string) => { success: boolean; error?: string };
  addVariantToProduct: (productId: string, variant: Omit<ProductVariant, 'VariantID' | 'ProductID' | 'ProductCode'>) => { success: boolean; error?: string };
  deleteVariantFromProduct: (productId: string, variantId: string) => { success: boolean; error?: string };

  receiveStock: (args: ReceiveStockArgs) => { success: boolean; error?: string };
  issueStock: (args: IssueStockArgs) => { success: boolean; error?: string };
  completeSale: (args: CompleteSaleArgs) => { success: boolean; order?: Order; error?: string };

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

  // Firestore Collections State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [dressTypes, setDressTypes] = useState<DressType[]>(INITIAL_DRESS_TYPES);
  const [sizes, setSizes] = useState<SizeItem[]>(INITIAL_SIZES);
  const [colors, setColors] = useState<ColorItem[]>(INITIAL_COLORS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(INITIAL_TRANSACTIONS);
  const [priceCategories] = useState<PriceCategory[]>(INITIAL_PRICE_CATEGORIES);
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const cached = localStorage.getItem('gds_cached_store_settings');
      return cached ? { ...INITIAL_SETTINGS, ...JSON.parse(cached) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
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
    // Seed initial data if empty in Firestore
    seedInitialFirestoreData().catch(console.error);

    // Subscribe to live Firestore changes across all clients/sessions
    const unsubs: Array<() => void> = [];

    // Listen to Firebase Quota status
    unsubs.push(
      subscribeQuotaStatus((status) => {
        setIsQuotaExceeded(status.isExceeded);
      })
    );

    unsubs.push(
      subscribeProducts((list) => {
        if (list.length > 0) setProducts(list);
      })
    );

    unsubs.push(
      subscribeDressTypes((list) => {
        if (list.length > 0) setDressTypes(list);
      })
    );

    unsubs.push(
      subscribeSizes((list) => {
        if (list.length > 0) setSizes(list);
      })
    );

    unsubs.push(
      subscribeColors((list) => {
        if (list.length > 0) setColors(list);
      })
    );

    unsubs.push(
      subscribeCustomers((list) => {
        setCustomers(list);
      })
    );

    unsubs.push(
      subscribeOrders((list) => {
        setOrders(list);
      })
    );

    unsubs.push(
      subscribeTransactions((list) => {
        setTransactions(list);
      })
    );

    unsubs.push(
      subscribeSettings((data) => {
        if (data) {
          const merged: StoreSettings = { ...INITIAL_SETTINGS, ...data };
          setSettings(merged);
          try {
            localStorage.setItem('gds_cached_store_settings', JSON.stringify(merged));
          } catch {
            // ignore
          }
        }
      })
    );

    unsubs.push(
      subscribeUsers((list) => {
        if (list.length > 0) {
          setUsers(list);
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

    const created: AppUser = {
      ...newUser,
      userNumber: cleanNum,
      name: newUser.name.trim(),
      password: newUser.password.trim(),
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

    const sanitizedUser: AppUser = {
      ...user,
      userNumber: cleanNum,
      name: user.name.trim(),
      password: user.password.trim(),
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

  // Helper Lookups
  const getDressTypeName = (id: string): string => {
    const found = dressTypes.find((dt) => dt.DressTypeID === id);
    return found ? found.Name : 'Girl Dress';
  };

  const getProductByCode = (code: string): Product | undefined => {
    if (!code) return undefined;
    return products.find((p) => p.ProductCode.trim().toUpperCase() === code.trim().toUpperCase());
  };

  const getVariant = (code: string, size: string, color: string): ProductVariant | undefined => {
    const prod = getProductByCode(code);
    if (!prod) return undefined;
    return prod.Variants.find(
      (v) =>
        v.Size.trim().toLowerCase() === size.trim().toLowerCase() &&
        v.Color.trim().toLowerCase() === color.trim().toLowerCase()
    );
  };

  const getAvailableSizesForCode = (code: string): string[] => {
    const prod = getProductByCode(code);
    if (!prod) return [];
    const sizeSet = new Set<string>();
    prod.Variants.forEach((v) => {
      if (v.Status === 'active') sizeSet.add(v.Size);
    });
    return Array.from(sizeSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.localeCompare(b);
    });
  };

  const getAvailableColorsForCodeAndSize = (code: string, size: string): string[] => {
    const prod = getProductByCode(code);
    if (!prod) return [];
    const colorSet = new Set<string>();
    prod.Variants.forEach((v) => {
      if (v.Status === 'active' && v.Size.trim().toLowerCase() === size.trim().toLowerCase()) {
        colorSet.add(v.Color);
      }
    });
    return Array.from(colorSet);
  };

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

  // Update Product
  const updateProduct = (product: Product): { success: boolean; error?: string } => {
    const cleanCode = product.ProductCode.trim().toUpperCase();
    const existing = products.find(
      (p) => p.ProductCode.trim().toUpperCase() === cleanCode && p.ProductID !== product.ProductID
    );
    if (existing) {
      return { success: false, error: `Another product already uses code "${cleanCode}". SKU must be unique.` };
    }

    const updated: Product = {
      ...product,
      ProductCode: cleanCode,
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === product.ProductID ? updated : p)));
    saveProductToFirestore(updated).catch(console.error);
    showToast(`Product "${product.ProductName}" updated.`);
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

  // Update Existing Variant (Admin or adjustments)
  const updateVariant = (productId: string, variant: ProductVariant): { success: boolean; error?: string } => {
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

    const updatedVariants = prod.Variants.map((v) => (v.VariantID === variant.VariantID ? variant : v));
    const updatedProd: Product = {
      ...prod,
      Variants: updatedVariants,
      ModifiedDate: new Date().toISOString(),
    };

    setProducts((prev) => prev.map((p) => (p.ProductID === productId ? updatedProd : p)));
    saveProductToFirestore(updatedProd).catch(console.error);
    showToast(`Variant (Size ${variant.Size}, Color ${variant.Color}) updated successfully.`);
    return { success: true };
  };

  // Admin Stock Adjustment directly on variant
  const adjustVariantStock = (
    productId: string,
    variantId: string,
    newStock: number,
    reason: string
  ): { success: boolean; error?: string } => {
    const prod = products.find((p) => p.ProductID === productId);
    if (!prod) return { success: false, error: 'Product not found' };

    const variant = prod.Variants.find((v) => v.VariantID === variantId);
    if (!variant) return { success: false, error: 'Variant not found' };

    if (newStock < 0) {
      return { success: false, error: 'Stock quantity cannot be negative' };
    }

    const diff = newStock - variant.CurrentStock;
    if (diff === 0) {
      return { success: true };
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

    setProducts((prev) => prev.map((p) => (p.ProductID === productId ? updatedProd : p)));
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

    setTransactions((prev) => [tx, ...prev]);
    saveTransactionToFirestore(tx).catch(console.error);

    showToast(`Stock adjusted from ${variant.CurrentStock} to ${newStock} units for ${prod.ProductCode} (${variant.Size}/${variant.Color})`);
    return { success: true };
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
      const pIndex = updatedProducts.findIndex((p) => p.ProductID === item.ProductID);
      if (pIndex >= 0) {
        const prod = updatedProducts[pIndex];
        const vIndex = prod.Variants.findIndex((v) => v.VariantID === item.VariantID);
        if (vIndex >= 0) {
          const v = prod.Variants[vIndex];
          const updatedVar = {
            ...v,
            CurrentStock: Math.max(0, v.CurrentStock - item.Quantity),
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
    setTransactions((prev) => [...newTxList, ...prev]);
    setOrders((prev) => [newOrder, ...prev]);
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
