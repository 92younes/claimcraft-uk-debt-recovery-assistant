
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
