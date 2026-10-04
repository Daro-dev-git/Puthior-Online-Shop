import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './config';
import {
  Product,
  DressType,
  SizeItem,
  ColorItem,
  Customer,
  Order,
  InventoryTransaction,
  StoreSettings,
  AppUser,
} from '../types';
import {
  INITIAL_DRESS_TYPES,
  INITIAL_SIZES,
  INITIAL_COLORS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from '../data/initialData';

const COLLECTIONS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  TRANSACTIONS: 'inventory_transactions',
  CUSTOMERS: 'customers',
  DRESS_TYPES: 'dress_types',
  SIZES: 'sizes',
  COLORS: 'colors',
  SETTINGS: 'settings',
  USERS: 'users',
} as const;

/**
 * Sanitizes object by removing undefined keys to prevent Firestore Unsupported Field Value errors.
 */
function sanitizeForFirestore<T>(val: T): T {
  if (val === null || val === undefined) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(val, (_key, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

// Seed initial master configurations (categories, sizes, colors, settings, initial admin if empty)
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    // Purge any residual mock sample products
    const sampleDoc1 = doc(db, COLLECTIONS.PRODUCTS, 'prod-001');
    const sampleDoc2 = doc(db, COLLECTIONS.PRODUCTS, 'prod-002');
    await deleteDoc(sampleDoc1).catch(() => {});
    await deleteDoc(sampleDoc2).catch(() => {});

    // Check dress types
    const dtSnap = await getDocs(collection(db, COLLECTIONS.DRESS_TYPES));
    if (dtSnap.empty) {
      for (const dt of INITIAL_DRESS_TYPES) {
        await setDoc(doc(db, COLLECTIONS.DRESS_TYPES, dt.DressTypeID), sanitizeForFirestore(dt));
      }
    }

    // Check sizes
    const szSnap = await getDocs(collection(db, COLLECTIONS.SIZES));
    if (szSnap.empty) {
      for (const sz of INITIAL_SIZES) {
        await setDoc(doc(db, COLLECTIONS.SIZES, sz.SizeID), sanitizeForFirestore(sz));
      }
    }

    // Check colors
    const clSnap = await getDocs(collection(db, COLLECTIONS.COLORS));
    if (clSnap.empty) {
      for (const cl of INITIAL_COLORS) {
        await setDoc(doc(db, COLLECTIONS.COLORS, cl.ColorID), sanitizeForFirestore(cl));
      }
    }

    // Check settings
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'store');
    const settingsSnap = await getDocs(collection(db, COLLECTIONS.SETTINGS));
    if (settingsSnap.empty) {
      await setDoc(settingsRef, sanitizeForFirestore(INITIAL_SETTINGS));
    }

    // Check users - ensure at least 1 Administrator exists if no users are in the database
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnap.empty) {
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.userId), sanitizeForFirestore(u));
      }
    }
  } catch (error) {
    console.warn('Initial master setup completed or already present:', error);
  }
}

// ----------------- Real-time Subscriptions -----------------

export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.PRODUCTS),
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Product);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.PRODUCTS);
    }
  );
}

export function subscribeOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.ORDERS),
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Order);
      });
      // Sort newest orders first
      list.sort((a, b) => new Date(b.OrderDate).getTime() - new Date(a.OrderDate).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.ORDERS);
    }
  );
}

export function subscribeTransactions(
  onData: (txs: InventoryTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.TRANSACTIONS),
    (snapshot) => {
      const list: InventoryTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as InventoryTransaction);
      });
      list.sort((a, b) => new Date(b.TransactionDate).getTime() - new Date(a.TransactionDate).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.TRANSACTIONS);
    }
  );
}

export function subscribeCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.CUSTOMERS),
    (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Customer);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.CUSTOMERS);
    }
  );
}

export function subscribeDressTypes(
  onData: (types: DressType[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.DRESS_TYPES),
    (snapshot) => {
      const list: DressType[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DressType);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.DRESS_TYPES);
    }
  );
}

export function subscribeSizes(
  onData: (sizes: SizeItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.SIZES),
    (snapshot) => {
      const list: SizeItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SizeItem);
      });
      // Sort sizes numerically or alphabetically
      list.sort((a, b) => {
        const numA = parseInt(a.SizeValue, 10);
        const numB = parseInt(b.SizeValue, 10);
        return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.SizeValue.localeCompare(b.SizeValue);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.SIZES);
    }
  );
}

export function subscribeColors(
  onData: (colors: ColorItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.COLORS),
    (snapshot) => {
      const list: ColorItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ColorItem);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.COLORS);
    }
  );
}

export function subscribeSettings(
  onData: (settings: StoreSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, 'store'),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as StoreSettings);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.SETTINGS}/store`);
    }
  );
}

export function subscribeUsers(
  onData: (users: AppUser[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTIONS.USERS),
    (snapshot) => {
      const list: AppUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AppUser);
      });
      // Sort users by userNumber
      list.sort((a, b) => a.userNumber.localeCompare(b.userNumber, undefined, { numeric: true }));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.USERS);
    }
  );
}

// ----------------- CRUD Mutators -----------------

export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `${COLLECTIONS.PRODUCTS}/${product.ProductID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.PRODUCTS, product.ProductID), sanitizeForFirestore(product));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `${COLLECTIONS.PRODUCTS}/${productId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveOrderToFirestore(order: Order): Promise<void> {
  const path = `${COLLECTIONS.ORDERS}/${order.OrderID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ORDERS, order.OrderID), sanitizeForFirestore(order));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveTransactionToFirestore(tx: InventoryTransaction): Promise<void> {
  const path = `${COLLECTIONS.TRANSACTIONS}/${tx.TransactionID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.TransactionID), sanitizeForFirestore(tx));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  const path = `${COLLECTIONS.CUSTOMERS}/${customer.CustomerID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.CustomerID), sanitizeForFirestore(customer));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveDressTypeToFirestore(type: DressType): Promise<void> {
  const path = `${COLLECTIONS.DRESS_TYPES}/${type.DressTypeID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.DRESS_TYPES, type.DressTypeID), sanitizeForFirestore(type));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteDressTypeFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.DRESS_TYPES}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.DRESS_TYPES, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSizeToFirestore(size: SizeItem): Promise<void> {
  const path = `${COLLECTIONS.SIZES}/${size.SizeID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SIZES, size.SizeID), sanitizeForFirestore(size));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSizeFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.SIZES}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SIZES, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveColorToFirestore(color: ColorItem): Promise<void> {
  const path = `${COLLECTIONS.COLORS}/${color.ColorID}`;
  try {
    await setDoc(doc(db, COLLECTIONS.COLORS, color.ColorID), sanitizeForFirestore(color));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteColorFromFirestore(id: string): Promise<void> {
  const path = `${COLLECTIONS.COLORS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.COLORS, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveSettingsToFirestore(settings: StoreSettings): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/store`;
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'store'), sanitizeForFirestore(settings));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveUserToFirestore(user: AppUser): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${user.userId}`;
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.userId), sanitizeForFirestore(user));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${userId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
