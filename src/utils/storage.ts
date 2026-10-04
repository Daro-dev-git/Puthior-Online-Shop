/**
 * Robust persistence layer utilizing browser IndexedDB with automatic LocalStorage fallback.
 * Allows storing full store databases, products, variants, transaction history,
 * and high-resolution local computer attached images without quota errors.
 */

const DB_NAME = 'GirlDressShopDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const persistentStorage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const db = await openDatabase();
      return new Promise<T>((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result !== undefined && request.result !== null) {
            resolve(request.result as T);
          } else {
            // Check localStorage fallback
            try {
              const lsItem = localStorage.getItem(key);
              resolve(lsItem ? JSON.parse(lsItem) : fallback);
            } catch {
              resolve(fallback);
            }
          }
        };

        request.onerror = () => {
          // Fallback to localStorage
          try {
            const lsItem = localStorage.getItem(key);
            resolve(lsItem ? JSON.parse(lsItem) : fallback);
          } catch {
            resolve(fallback);
          }
        };
      });
    } catch {
      try {
        const lsItem = localStorage.getItem(key);
        return lsItem ? JSON.parse(lsItem) : fallback;
      } catch {
        return fallback;
      }
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    // Save to IndexedDB
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('IndexedDB write error, attempting localStorage', e);
    }

    // Also mirror to localStorage when possible (excluding huge payloads)
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length < 4000000) {
        localStorage.setItem(key, serialized);
      }
    } catch {
      // Ignore localStorage quota exceeded since IndexedDB has already persisted it
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).clear();
    } catch {
      // ignore
    }
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },
};
