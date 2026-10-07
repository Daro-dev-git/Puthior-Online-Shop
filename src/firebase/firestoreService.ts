import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  query,
  limit,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  getDocsFromCache,
  getDocFromCache,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  isQuotaExceededError,
  setFirestoreQuotaExceeded,
  getFirestoreQuotaStatus,
} from './config';
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
// Optimized to avoid redundant reads: checks client storage, quota status, and cache first
export async function seedInitialFirestoreData(): Promise<void> {
  // If quota is already exceeded, don't attempt server initialization reads
  if (getFirestoreQuotaStatus().isExceeded) {
    return;
  }

  // If already verified/seeded in this client, avoid 5 redundant collection reads
  if (typeof window !== 'undefined' && localStorage.getItem('gds_initial_firestore_seeded_v1') === 'true') {
    return;
  }

  try {
    // 1. Check local cache first before making server network requests
    try {
      const [cacheDt, cacheSz, cacheCl] = await Promise.all([
        getDocsFromCache(collection(db, COLLECTIONS.DRESS_TYPES)),
        getDocsFromCache(collection(db, COLLECTIONS.SIZES)),
        getDocsFromCache(collection(db, COLLECTIONS.COLORS)),
      ]);
      if (!cacheDt.empty && !cacheSz.empty && !cacheCl.empty) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('gds_initial_firestore_seeded_v1', 'true');
        }
        return;
      }
    } catch {
      // Cache not populated yet, proceed with server verification
    }

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

    if (typeof window !== 'undefined') {
      localStorage.setItem('gds_initial_firestore_seeded_v1', 'true');
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
      console.warn('Initial seed skipped: Firestore quota exceeded. Operating with cached and local data.');
      return;
    }
    console.warn('Initial master setup completed or already present:', error);
  }
}

// ----------------- Real-time Subscriptions with Cache Prioritization & Limits -----------------

/**
 * Subscribes to products with cache-first delivery and limit constraint (default: 100 items to load full catalog)
 */
export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 100
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  const q = maxLimit > 0 ? query(colRef, limit(maxLimit)) : colRef;

  // 1. Immediately prioritize local cache to avoid waiting for server or burning reads
  getDocsFromCache(q)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: Product[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Product));
        onData(cachedList);
      }
    })
    .catch(() => {});

  // 2. Attach real-time listener scoped to limit
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Product);
      });
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.PRODUCTS}`);
        getDocsFromCache(q)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: Product[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Product));
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.PRODUCTS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Fetches products in small batches (e.g., 20 items) with strict cache prioritization
 * to minimize read units and support pagination across large product catalogs.
 */
export async function fetchProductsBatch(
  batchSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ products: Product[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null }> {
  const colRef = collection(db, COLLECTIONS.PRODUCTS);
  const q = lastDoc
    ? query(colRef, orderBy('ProductCode', 'asc'), startAfter(lastDoc), limit(batchSize))
    : query(colRef, orderBy('ProductCode', 'asc'), limit(batchSize));

  // 1. Try local cache first
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      const products: Product[] = [];
      cacheSnap.forEach((d) => products.push(d.data() as Product));
      const lastVisible = cacheSnap.docs[cacheSnap.docs.length - 1] || null;
      return { products, lastVisible };
    }
  } catch {
    // Cache miss or index not yet established in cache
  }

  // 2. Fallback to server if cache missed and quota not exceeded
  if (getFirestoreQuotaStatus().isExceeded) {
    return { products: [], lastVisible: null };
  }

  try {
    const snap = await getDocs(q);
    const products: Product[] = [];
    snap.forEach((d) => products.push(d.data() as Product));
    const lastVisible = snap.docs[snap.docs.length - 1] || null;
    return { products, lastVisible };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true, (err as { message?: string })?.message || String(err));
    }
    return { products: [], lastVisible: null };
  }
}

/**
 * Subscribes to orders with cache-first delivery, limit(25) and orderBy("createdAt", "desc")
 */
export function subscribeOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 25
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.ORDERS);
  let q = maxLimit > 0 ? query(colRef, orderBy('createdAt', 'desc'), limit(maxLimit)) : colRef;

  // Prioritize local cache
  getDocsFromCache(q)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: Order[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Order));
        cachedList.sort((a, b) => new Date(b.OrderDate || (b as any).createdAt || 0).getTime() - new Date(a.OrderDate || (a as any).createdAt || 0).getTime());
        onData(cachedList);
      }
    })
    .catch(() => {
      // Fallback cache without order index if needed
      getDocsFromCache(colRef)
        .then((cacheSnap) => {
          if (!cacheSnap.empty) {
            const cachedList: Order[] = [];
            cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Order));
            cachedList.sort((a, b) => new Date(b.OrderDate || (b as any).createdAt || 0).getTime() - new Date(a.OrderDate || (a as any).createdAt || 0).getTime());
            onData(cachedList.slice(0, maxLimit));
          }
        })
        .catch(() => {});
    });

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Order);
      });
      list.sort((a, b) => new Date(b.OrderDate || (b as any).createdAt || 0).getTime() - new Date(a.OrderDate || (a as any).createdAt || 0).getTime());
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.ORDERS}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: Order[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Order));
              cachedList.sort((a, b) => new Date(b.OrderDate || (b as any).createdAt || 0).getTime() - new Date(a.OrderDate || (a as any).createdAt || 0).getTime());
              onData(cachedList.slice(0, maxLimit));
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.ORDERS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to inventory transactions with cache-first delivery, limit(25) and orderBy("createdAt", "desc")
 */
export function subscribeTransactions(
  onData: (txs: InventoryTransaction[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 25
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.TRANSACTIONS);
  let q = maxLimit > 0 ? query(colRef, orderBy('createdAt', 'desc'), limit(maxLimit)) : colRef;

  // Prioritize local cache
  getDocsFromCache(q)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: InventoryTransaction[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as InventoryTransaction));
        cachedList.sort((a, b) => new Date(b.TransactionDate || (b as any).createdAt || 0).getTime() - new Date(a.TransactionDate || (a as any).createdAt || 0).getTime());
        onData(cachedList);
      }
    })
    .catch(() => {
      getDocsFromCache(colRef)
        .then((cacheSnap) => {
          if (!cacheSnap.empty) {
            const cachedList: InventoryTransaction[] = [];
            cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as InventoryTransaction));
            cachedList.sort((a, b) => new Date(b.TransactionDate || (b as any).createdAt || 0).getTime() - new Date(a.TransactionDate || (a as any).createdAt || 0).getTime());
            onData(cachedList.slice(0, maxLimit));
          }
        })
        .catch(() => {});
    });

  return onSnapshot(
    q,
    (snapshot) => {
      const list: InventoryTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as InventoryTransaction);
      });
      list.sort((a, b) => new Date(b.TransactionDate || (b as any).createdAt || 0).getTime() - new Date(a.TransactionDate || (a as any).createdAt || 0).getTime());
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.TRANSACTIONS}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: InventoryTransaction[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as InventoryTransaction));
              cachedList.sort((a, b) => new Date(b.TransactionDate || (b as any).createdAt || 0).getTime() - new Date(a.TransactionDate || (a as any).createdAt || 0).getTime());
              onData(cachedList.slice(0, maxLimit));
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.TRANSACTIONS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to customers with cache-first delivery and limit (default: 25 items)
 */
export function subscribeCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: Error) => void,
  maxLimit: number = 25
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.CUSTOMERS);
  const q = maxLimit > 0 ? query(colRef, limit(maxLimit)) : colRef;

  // Prioritize local cache
  getDocsFromCache(q)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: Customer[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Customer));
        onData(cachedList);
      }
    })
    .catch(() => {});

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Customer);
      });
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.CUSTOMERS}`);
        getDocsFromCache(q)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: Customer[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as Customer));
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.CUSTOMERS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to dress types with cache prioritization
 */
export function subscribeDressTypes(
  onData: (types: DressType[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.DRESS_TYPES);

  getDocsFromCache(colRef)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: DressType[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as DressType));
        onData(cachedList);
      }
    })
    .catch(() => {});

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DressType[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DressType);
      });
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.DRESS_TYPES}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: DressType[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as DressType));
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.DRESS_TYPES);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to sizes with cache prioritization
 */
export function subscribeSizes(
  onData: (sizes: SizeItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.SIZES);

  getDocsFromCache(colRef)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: SizeItem[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as SizeItem));
        cachedList.sort((a, b) => {
          const numA = parseInt(a.SizeValue, 10);
          const numB = parseInt(b.SizeValue, 10);
          return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.SizeValue.localeCompare(b.SizeValue);
        });
        onData(cachedList);
      }
    })
    .catch(() => {});

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: SizeItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SizeItem);
      });
      list.sort((a, b) => {
        const numA = parseInt(a.SizeValue, 10);
        const numB = parseInt(b.SizeValue, 10);
        return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.SizeValue.localeCompare(b.SizeValue);
      });
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.SIZES}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: SizeItem[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as SizeItem));
              cachedList.sort((a, b) => {
                const numA = parseInt(a.SizeValue, 10);
                const numB = parseInt(b.SizeValue, 10);
                return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.SizeValue.localeCompare(b.SizeValue);
              });
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.SIZES);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to colors with cache prioritization
 */
export function subscribeColors(
  onData: (colors: ColorItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.COLORS);

  getDocsFromCache(colRef)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: ColorItem[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as ColorItem));
        onData(cachedList);
      }
    })
    .catch(() => {});

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ColorItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ColorItem);
      });
      onData(list);
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.COLORS}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: ColorItem[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as ColorItem));
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.COLORS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to settings with cache prioritization
 */
export function subscribeSettings(
  onData: (settings: StoreSettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'store');

  getDocFromCache(docRef)
    .then((cacheSnap) => {
      if (cacheSnap.exists()) {
        onData(cacheSnap.data() as StoreSettings);
      }
    })
    .catch(() => {});

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as StoreSettings);
      }
    },
    (error) => {
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.SETTINGS}`);
        getDocFromCache(docRef)
          .then((cacheSnap) => {
            if (cacheSnap.exists()) {
              onData(cacheSnap.data() as StoreSettings);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, `${COLLECTIONS.SETTINGS}/store`);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Subscribes to users with cache prioritization
 */
export function subscribeUsers(
  onData: (users: AppUser[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, COLLECTIONS.USERS);

  getDocsFromCache(colRef)
    .then((cacheSnap) => {
      if (!cacheSnap.empty) {
        const cachedList: AppUser[] = [];
        cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as AppUser));
        cachedList.sort((a, b) => a.userNumber.localeCompare(b.userNumber, undefined, { numeric: true }));
        onData(cachedList);
      }
    })
    .catch(() => {});

  return onSnapshot(
    colRef,
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
      if (isQuotaExceededError(error)) {
        setFirestoreQuotaExceeded(true, (error as { message?: string })?.message || String(error));
        console.warn(`Firestore subscription operating from cache due to quota limit: ${COLLECTIONS.USERS}`);
        getDocsFromCache(colRef)
          .then((cacheSnap) => {
            if (!cacheSnap.empty) {
              const cachedList: AppUser[] = [];
              cacheSnap.forEach((docSnap) => cachedList.push(docSnap.data() as AppUser));
              cachedList.sort((a, b) => a.userNumber.localeCompare(b.userNumber, undefined, { numeric: true }));
              onData(cachedList);
            }
          })
          .catch(() => {});
        return;
      }
      if (onError) onError(error as Error);
      try {
        handleFirestoreError(error, OperationType.GET, COLLECTIONS.USERS);
      } catch (e) {
        console.warn('Subscription error handled:', e);
      }
    }
  );
}

/**
 * Helper to fetch documents prioritizing cache first
 */
export async function getDocsCacheFirst<T>(
  colPath: string,
  maxLimit?: number
): Promise<T[]> {
  const colRef = collection(db, colPath);
  const q = maxLimit && maxLimit > 0 ? query(colRef, limit(maxLimit)) : colRef;
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      const list: T[] = [];
      cacheSnap.forEach((d) => list.push(d.data() as T));
      return list;
    }
  } catch {
    // Cache miss or offline cache disabled
  }
  const snap = await getDocs(q);
  const list: T[] = [];
  snap.forEach((d) => list.push(d.data() as T));
  return list;
}

/**
 * Helper to fetch a single document prioritizing cache first
 */
export async function getDocCacheFirst<T>(
  colPath: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, colPath, docId);
  try {
    const cacheSnap = await getDocFromCache(docRef);
    if (cacheSnap.exists()) {
      return cacheSnap.data() as T;
    }
  } catch {
    // Cache miss
  }
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as T) : null;
}

/**
 * Loads static collection prioritizing localStorage and Firestore offline cache.
 * Hits the server ONLY if both local sources are completely empty.
 */
export async function loadStaticCollectionCacheFirst<T>(
  colName: 'dress_types' | 'sizes' | 'colors',
  storageKey: string,
  initialFallback: T[]
): Promise<T[]> {
  // 1. Check browser localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as T[];
        }
      }
    } catch {}
  }

  const colRef = collection(db, colName);

  // 2. Check Firestore IndexedDB local cache
  try {
    const cacheSnap = await getDocsFromCache(colRef);
    if (!cacheSnap.empty) {
      const list: T[] = [];
      cacheSnap.forEach((docSnap) => list.push(docSnap.data() as T));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(list));
        } catch {}
      }
      return list;
    }
  } catch {}

  // 3. If quota already exceeded, return fallback without hitting server
  if (getFirestoreQuotaStatus().isExceeded) {
    return initialFallback;
  }

  // 4. Server fetch ONLY if cache was completely empty
  try {
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: T[] = [];
      snap.forEach((docSnap) => list.push(docSnap.data() as T));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(list));
        } catch {}
      }
      return list;
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true, (err as { message?: string })?.message || String(err));
      return initialFallback;
    }
  }

  return initialFallback;
}

/**
 * Loads store settings prioritizing localStorage and Firestore offline cache.
 * Hits the server ONLY if both local sources are completely empty.
 */
export async function loadSettingsCacheFirst(): Promise<StoreSettings> {
  const STORAGE_KEY = 'gds_cached_store_settings';
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...INITIAL_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
  }

  const docRef = doc(db, COLLECTIONS.SETTINGS, 'store');
  try {
    const cacheSnap = await getDocFromCache(docRef);
    if (cacheSnap.exists()) {
      const data = { ...INITIAL_SETTINGS, ...(cacheSnap.data() as StoreSettings) };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
      return data;
    }
  } catch {}

  if (getFirestoreQuotaStatus().isExceeded) {
    return INITIAL_SETTINGS;
  }

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...INITIAL_SETTINGS, ...(snap.data() as StoreSettings) };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
      return data;
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      setFirestoreQuotaExceeded(true, (err as { message?: string })?.message || String(err));
      return INITIAL_SETTINGS;
    }
  }

  return INITIAL_SETTINGS;
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
  const payload = {
    ...order,
    createdAt: (order as any).createdAt || order.OrderDate || new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, COLLECTIONS.ORDERS, order.OrderID), sanitizeForFirestore(payload));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveTransactionToFirestore(tx: InventoryTransaction): Promise<void> {
  const path = `${COLLECTIONS.TRANSACTIONS}/${tx.TransactionID}`;
  const payload = {
    ...tx,
    createdAt: (tx as any).createdAt || tx.TransactionDate || new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, tx.TransactionID), sanitizeForFirestore(payload));
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
