import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
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

// CRITICAL: getFirestore must pass firestoreDatabaseId as required by the integration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Quota exceeded') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Free daily read units per project')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuth = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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

  if (isQuotaExceededError(error)) {
    setFirestoreQuotaExceeded(true, errInfo.error);
  }

  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by the skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using cache where available.');
    }
  }
}

testConnection().catch(() => {});

