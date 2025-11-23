/**
 * COMPLIANCE LOGGING SERVICE
 *
 * Purpose: Create an audit trail of all AI-generated legal documents.
 *
 * Why this is critical:
 * 1. Legal liability - If a user claims your AI gave bad advice, you need proof of what was generated
 * 2. Quality monitoring - Track which prompts/templates produce better results
 * 3. Regulatory compliance - SRA or future regulation may require AI audit trails
 * 4. Insurance - Professional indemnity insurers may require generation logs
 *
 * Storage: Currently logs to console and IndexedDB. In production, send to Supabase/backend.
 */

export interface ComplianceLogEntry {
  claimId: string;
  userId: string;
  documentType: string;
  generatedAt: string;
  model: string;
  templateVersion: string;
  inputData: {
    principal: number;
    interest: number;
    compensation: number;
    totalClaim: number;
    claimant: string;
    defendant: string;
    invoiceNumber: string;
  };
  documentHash: string;
  evidenceCount: number;
  timelineEventCount: number;
  chatMessageCount: number;
}

/**
 * Log a document generation event
 */
export const logDocumentGeneration = async (entry: ComplianceLogEntry): Promise<void> => {
  try {
    // 1. Console log for development
    console.log('📋 COMPLIANCE LOG:', {
      timestamp: entry.generatedAt,
      claim: entry.claimId,
      type: entry.documentType,
      model: entry.model,
      hash: entry.documentHash
    });

    // 2. Store in IndexedDB for local audit trail
    await storeInIndexedDB(entry);

    // 3. TODO: Send to backend in production
    // await sendToBackend(entry);

  } catch (error) {
    console.error('Compliance logging failed (non-critical):', error);
    // Don't throw - logging failure shouldn't block user workflow
  }
};

/**
 * Store compliance log in IndexedDB
 */
const storeInIndexedDB = async (entry: ComplianceLogEntry): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('claimcraft_compliance', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');

        store.add({
          ...entry,
          id: `${entry.claimId}-${Date.now()}`
        });

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };

      } catch (error) {
        db.close();
        reject(error);
      }
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' });
        store.createIndex('claimId', 'claimId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }
    };
  });
};

/**
 * Retrieve compliance logs for a specific claim
 */
export const getComplianceLogsForClaim = async (claimId: string): Promise<ComplianceLogEntry[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('claimcraft_compliance', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const index = store.index('claimId');
        const query = index.getAll(claimId);

        query.onsuccess = () => {
          db.close();
          resolve(query.result || []);
        };

        query.onerror = () => {
          db.close();
          reject(query.error);
        };

      } catch (error) {
        db.close();
        reject(error);
      }
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' });
        store.createIndex('claimId', 'claimId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }
    };
  });
};

/**
 * Get all compliance logs (for admin/debugging)
 */
export const getAllComplianceLogs = async (): Promise<ComplianceLogEntry[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('claimcraft_compliance', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction(['logs'], 'readonly');
        const store = transaction.objectStore('logs');
        const query = store.getAll();

        query.onsuccess = () => {
          db.close();
          resolve(query.result || []);
        };

        query.onerror = () => {
          db.close();
          reject(query.error);
        };

      } catch (error) {
        db.close();
        reject(error);
      }
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' });
        store.createIndex('claimId', 'claimId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }
    };
  });
};

/**
 * Clear old compliance logs (GDPR compliance - keep only 12 months)
 */
export const clearOldComplianceLogs = async (monthsToKeep: number = 12): Promise<number> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('claimcraft_compliance', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      try {
        const transaction = db.transaction(['logs'], 'readwrite');
        const store = transaction.objectStore('logs');
        const index = store.index('generatedAt');

        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);

        const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
        const query = index.openCursor(range);

        let deletedCount = 0;

        query.onsuccess = (event: any) => {
          const cursor = event.target.result;

          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            db.close();
            resolve(deletedCount);
          }
        };

        query.onerror = () => {
          db.close();
          reject(query.error);
        };

      } catch (error) {
        db.close();
        reject(error);
      }
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' });
        store.createIndex('claimId', 'claimId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('generatedAt', 'generatedAt', { unique: false });
      }
    };
  });
};

/**
 * Export compliance logs as JSON (for regulatory requests)
 */
export const exportComplianceLogs = async (): Promise<string> => {
  const logs = await getAllComplianceLogs();
  return JSON.stringify(logs, null, 2);
};

/**
 * TODO: Send logs to backend/Supabase in production
 */
const sendToBackend = async (entry: ComplianceLogEntry): Promise<void> => {
  // Example implementation for Supabase:
  /*
  import { supabase } from './supabaseClient';

  const { error } = await supabase
    .from('compliance_logs')
    .insert([entry]);

  if (error) {
    console.error('Failed to log to backend:', error);
  }
  */

  // For now, just log that we would send to backend
  console.log('TODO: Send to backend:', entry.claimId);
};
