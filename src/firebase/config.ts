import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// CRITICAL: Initialize Firestore with IndexedDB local cache persistence and firestoreDatabaseId
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db = firestoreDb;

export const FIRESTORE_UPGRADE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

// Quota Listener System
export interface QuotaStatus {
  isExceeded: boolean;
  message?: string;
  upgradeUrl: string;
}

let currentQuotaStatus: QuotaStatus = {
  isExceeded: false,
  upgradeUrl: FIRESTORE_UPGRADE_URL,
};

const quotaListeners = new Set<(status: QuotaStatus) => void>();

export function getFirestoreQuotaStatus(): QuotaStatus {
  return currentQuotaStatus;
}

export function subscribeQuotaStatus(listener: (status: QuotaStatus) => void): () => void {
  quotaListeners.add(listener);
  listener(currentQuotaStatus);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function setFirestoreQuotaExceeded(exceeded: boolean, message?: string) {
  currentQuotaStatus = {
    isExceeded: exceeded,
    message,
    upgradeUrl: FIRESTORE_UPGRADE_URL,
  };
  quotaListeners.forEach((l) => l(currentQuotaStatus));
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const anyErr = error as { code?: string; message?: string };
  const code = typeof anyErr?.code === 'string' ? anyErr.code : '';
  const message = typeof anyErr?.message === 'string' ? anyErr.message : '';
  const str = String(error);
  const combined = `${code} ${message} ${str}`.toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    combined.includes('quota exceeded') ||
    combined.includes('quota limit exceeded') ||
    combined.includes('resource-exhausted') ||
    combined.includes('free daily read units') ||
    combined.includes('free tier database') ||
    combined.includes('quota metric') ||
    combined.includes('exceed free quota limits') ||
    combined.includes('retry after quota limits are reset')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaExceededError(error)) {
    const errorMsg = (error as { message?: string })?.message || String(error);
    setFirestoreQuotaExceeded(true, errorMsg);
    console.warn(
      'Firestore Free Tier Daily Quota Exceeded (Free daily read units per project limit reached). Operating seamlessly with cached and local data.',
      FIRESTORE_UPGRADE_URL
    );
    throw new Error('Firestore daily free quota limit reached. Database is operating in cached/offline mode.');
  }

  const currentAuth = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: (error as { message?: string })?.message || String(error),
    operationType,
    path,
    authInfo: {
      userId: currentAuth?.uid || null,
      email: currentAuth?.email || null,
      emailVerified: currentAuth?.emailVerified || null,
      isAnonymous: currentAuth?.isAnonymous || null,
      tenantId: currentAuth?.tenantId || null,
      providerInfo: currentAuth?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by the skill (cached per session to save reads)
async function testConnection() {
  if (typeof window !== 'undefined' && sessionStorage.getItem('gds_connection_verified')) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'settings', 'connection_test'));
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gds_connection_verified', 'true');
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      setFirestoreQuotaExceeded(true, error instanceof Error ? error.message : String(error));
      console.warn('Firebase quota limit detected during connection check. Operating in offline/cached mode.');
    } else if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using cache where available.');
    }
  }
}

testConnection().catch(() => {});

