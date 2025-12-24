
import { ClaimState, UserProfile, Deadline, DeadlineReminder, UserNotificationPreferences } from '../types';

const DB_NAME = 'claimcraft_db';
const CLAIMS_STORE = 'claims';
const USER_PROFILE_STORE = 'user_profile';
const DEADLINES_STORE = 'deadlines';
const REMINDERS_STORE = 'reminders';
const NOTIFICATION_PREFS_STORE = 'notification_preferences';
const DB_VERSION = 3; // Bumped for deadline stores

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Claims store (existing)
      if (!db.objectStoreNames.contains(CLAIMS_STORE)) {
        db.createObjectStore(CLAIMS_STORE, { keyPath: 'id' });
      }

      // User profile store (new in v2)
      if (!db.objectStoreNames.contains(USER_PROFILE_STORE)) {
        db.createObjectStore(USER_PROFILE_STORE, { keyPath: 'id' });
      }

      // Deadlines store (new in v3)
      if (!db.objectStoreNames.contains(DEADLINES_STORE)) {
        const deadlinesStore = db.createObjectStore(DEADLINES_STORE, { keyPath: 'id' });
        deadlinesStore.createIndex('claimId', 'claimId', { unique: false });
        deadlinesStore.createIndex('dueDate', 'dueDate', { unique: false });
        deadlinesStore.createIndex('status', 'status', { unique: false });
      }

      // Reminders store (new in v3)
      if (!db.objectStoreNames.contains(REMINDERS_STORE)) {
        const remindersStore = db.createObjectStore(REMINDERS_STORE, { keyPath: 'id' });
        remindersStore.createIndex('deadlineId', 'deadlineId', { unique: false });
        remindersStore.createIndex('reminderDate', 'reminderDate', { unique: false });
        remindersStore.createIndex('sent', 'sent', { unique: false });
      }

      // Notification preferences store (new in v3)
      if (!db.objectStoreNames.contains(NOTIFICATION_PREFS_STORE)) {
        db.createObjectStore(NOTIFICATION_PREFS_STORE, { keyPath: 'id' });
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
      const transaction = db.transaction(CLAIMS_STORE, 'readonly');
      const store = transaction.objectStore(CLAIMS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
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
      const transaction = db.transaction(CLAIMS_STORE, 'readwrite');
      const store = transaction.objectStore(CLAIMS_STORE);
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
          const transaction = db.transaction(CLAIMS_STORE, 'readwrite');
          const store = transaction.objectStore(CLAIMS_STORE);
          const request = store.delete(id);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to delete claim from DB", e);
        throw e; // Re-throw to allow caller to handle the error
    }
}

// ==========================================
// User Profile Functions
// ==========================================

export const getUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(USER_PROFILE_STORE, 'readonly');
            const store = transaction.objectStore(USER_PROFILE_STORE);
            const request = store.get('current'); // Single profile with fixed ID

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load user profile from DB", e);
        return null;
    }
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
    try {
        const db = await openDB();
        const profileWithId = {
            ...profile,
            id: 'current', // Fixed ID for single profile
            updatedAt: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(USER_PROFILE_STORE, 'readwrite');
            const store = transaction.objectStore(USER_PROFILE_STORE);
            const request = store.put(profileWithId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    } catch (e) {
        console.error("Failed to save user profile to DB", e);
        return false;
    }
};

export const hasCompletedOnboarding = async (): Promise<boolean> => {
    const profile = await getUserProfile();
    return profile !== null && profile.jurisdictionConfirmed;
};

export const deleteUserProfile = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(USER_PROFILE_STORE, 'readwrite');
            const store = transaction.objectStore(USER_PROFILE_STORE);
            const request = store.delete('current');

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to delete user profile from DB", e);
        throw e;
    }
};

// ==========================================
// GDPR Functions
// ==========================================

/**
 * Export all user data as JSON (GDPR Article 20 - Data Portability)
 * Includes claims, user profile, settings, and connection metadata (not sensitive tokens)
 */
export const exportAllUserData = async (): Promise<Blob> => {
    try {
        const allClaims = await getStoredClaims();
        const userProfile = await getUserProfile();

        // Get application settings from localStorage
        const settings = localStorage.getItem('appSettings');
        const xeroConnection = localStorage.getItem('xeroAuth');
        const nangoConnection = localStorage.getItem('nangoConnection');

        // Build export object
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            application: 'ClaimCraft UK',
            userProfile: userProfile,
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
        // 1. Delete all claims from IndexedDB (batch operation)
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(CLAIMS_STORE, 'readwrite');
            const store = transaction.objectStore(CLAIMS_STORE);
            const request = store.clear(); // Clears all records at once

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 1b. Delete user profile from IndexedDB
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(USER_PROFILE_STORE, 'readwrite');
            const store = transaction.objectStore(USER_PROFILE_STORE);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

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

// ==========================================
// Deadline Functions
// ==========================================

export const getDeadlines = async (): Promise<Deadline[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DEADLINES_STORE, 'readonly');
            const store = transaction.objectStore(DEADLINES_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load deadlines from DB", e);
        return [];
    }
};

export const saveDeadline = async (deadline: Deadline): Promise<boolean> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DEADLINES_STORE, 'readwrite');
            const store = transaction.objectStore(DEADLINES_STORE);
            const request = store.put(deadline);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    } catch (e) {
        console.error("Failed to save deadline to DB", e);
        return false;
    }
};

export const deleteDeadline = async (id: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DEADLINES_STORE, 'readwrite');
            const store = transaction.objectStore(DEADLINES_STORE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to delete deadline from DB", e);
        throw e;
    }
};

export const getDeadlinesForClaim = async (claimId: string): Promise<Deadline[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(DEADLINES_STORE, 'readonly');
            const store = transaction.objectStore(DEADLINES_STORE);
            const index = store.index('claimId');
            const request = index.getAll(claimId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load deadlines for claim from DB", e);
        return [];
    }
};

export const deleteDeadlinesForClaim = async (claimId: string): Promise<void> => {
    try {
        const deadlines = await getDeadlinesForClaim(claimId);
        for (const deadline of deadlines) {
            await deleteDeadline(deadline.id);
        }
    } catch (e) {
        console.error("Failed to delete deadlines for claim from DB", e);
        throw e;
    }
};

// ==========================================
// Reminder Functions
// ==========================================

export const getReminders = async (): Promise<DeadlineReminder[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(REMINDERS_STORE, 'readonly');
            const store = transaction.objectStore(REMINDERS_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load reminders from DB", e);
        return [];
    }
};

export const saveReminder = async (reminder: DeadlineReminder): Promise<boolean> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(REMINDERS_STORE, 'readwrite');
            const store = transaction.objectStore(REMINDERS_STORE);
            const request = store.put(reminder);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    } catch (e) {
        console.error("Failed to save reminder to DB", e);
        return false;
    }
};

export const getRemindersForDeadline = async (deadlineId: string): Promise<DeadlineReminder[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(REMINDERS_STORE, 'readonly');
            const store = transaction.objectStore(REMINDERS_STORE);
            const index = store.index('deadlineId');
            const request = index.getAll(deadlineId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load reminders for deadline from DB", e);
        return [];
    }
};

export const getPendingReminders = async (): Promise<DeadlineReminder[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(REMINDERS_STORE, 'readonly');
            const store = transaction.objectStore(REMINDERS_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                // Filter for unsent reminders in JavaScript since IDB can't index booleans directly
                const allReminders = request.result || [];
                const pendingReminders = allReminders.filter((r: DeadlineReminder) => !r.sent);
                resolve(pendingReminders);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load pending reminders from DB", e);
        return [];
    }
};

// ==========================================
// Notification Preferences Functions
// ==========================================

export const getNotificationPreferences = async (): Promise<UserNotificationPreferences | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(NOTIFICATION_PREFS_STORE, 'readonly');
            const store = transaction.objectStore(NOTIFICATION_PREFS_STORE);
            const request = store.get('current');

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("Failed to load notification preferences from DB", e);
        return null;
    }
};

export const saveNotificationPreferences = async (prefs: UserNotificationPreferences): Promise<boolean> => {
    try {
        const db = await openDB();
        const prefsWithId = { ...prefs, id: 'current' };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(NOTIFICATION_PREFS_STORE, 'readwrite');
            const store = transaction.objectStore(NOTIFICATION_PREFS_STORE);
            const request = store.put(prefsWithId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(false);
        });
    } catch (e) {
        console.error("Failed to save notification preferences to DB", e);
        return false;
    }
};
