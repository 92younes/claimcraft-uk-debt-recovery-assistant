
import { ClaimState } from '../types';

const DB_NAME = 'claimcraft_db';
const STORE_NAME = 'claims';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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

export const getStoredClaims = async (): Promise<ClaimState[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load claims from DB", e);
    return [];
  }
};

export const saveClaimToStorage = async (claim: ClaimState): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(claim); // put handles both add and update if keyPath exists

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(false);
    });
  } catch (e) {
    console.error("Failed to save claim to DB", e);
    return false;
  }
};

export const deleteClaimFromStorage = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to delete claim from DB", e);
    }
}

/**
 * Export all user data as JSON (GDPR Article 20 - Data Portability)
 * Includes claims, settings, and connection metadata (not sensitive tokens)
 */
export const exportAllUserData = async (): Promise<Blob> => {
    try {
        const allClaims = await getStoredClaims();

        // Get application settings from localStorage
        const settings = localStorage.getItem('appSettings');
        const xeroConnection = localStorage.getItem('xeroAuth');
        const nangoConnection = localStorage.getItem('nangoConnection');

        // Build export object
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            application: 'ClaimCraft UK',
            claims: allClaims,
            settings: settings ? JSON.parse(settings) : null,
            connections: {
                xero: xeroConnection ? { connected: true, note: 'OAuth tokens excluded for security' } : null,
                nango: nangoConnection ? JSON.parse(nangoConnection) : null
            },
            disclaimer: 'This export contains your ClaimCraft UK data. OAuth tokens are excluded for security. You may need to reconnect integrations after importing.'
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
    } catch (e) {
        console.error("Failed to export user data", e);
        throw e;
    }
};

/**
 * Delete all user data from browser storage (GDPR Article 17 - Right to Erasure)
 * This includes claims, settings, OAuth tokens, and connections
 */
export const deleteAllUserData = async (): Promise<void> => {
    try {
        // 1. Delete all claims from IndexedDB
        const allClaims = await getStoredClaims();
        for (const claim of allClaims) {
            await deleteClaimFromStorage(claim.id);
        }

        // 2. Delete OAuth tokens
        localStorage.removeItem('xeroAuth');
        localStorage.removeItem('nangoConnection');

        // 3. Delete application settings
        localStorage.removeItem('appSettings');
        localStorage.removeItem('disclaimerAccepted');

        // 4. Delete compliance logs (after a brief delay to allow logging the erasure event)
        setTimeout(() => {
            localStorage.removeItem('complianceLogs');
            localStorage.removeItem('lastLogCleanup');
        }, 5000); // 5-second delay

        console.log('✅ All user data has been permanently deleted');
    } catch (e) {
        console.error("Failed to delete all user data", e);
        throw e;
    }
};
