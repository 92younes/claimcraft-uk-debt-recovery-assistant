/**
 * Zustand Store for ClaimCraft UK
 * Manages global application state for claims, user profile, deadlines, and wizard flow
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ClaimState,
  UserProfile,
  Deadline,
  AccountingConnection,
  ExtractedClaimData,
  INITIAL_STATE,
  Party,
  DeadlineStatus,
  Step,
  EvidenceFile
} from '../types';
import {
  getStoredClaims,
  saveClaimToStorage,
  deleteClaimFromStorage,
  getUserProfile,
  saveUserProfile as persistUserProfile,
  getDeadlines,
  saveDeadline as persistDeadline,
  deleteDeadline as deleteDeadlineFromStorage,
  deleteDeadlinesForClaim
} from '../services/storageService';
import { profileToClaimantParty } from '../services/userProfileService';
import { calculateInterest, calculateCompensation } from '../services/legalRules';
import { analyzeEvidence } from '../services/geminiService';
import { processEvidenceExtraction, toClaimStateUpdate } from '../services/extractionProcessor';

// Re-export Step for backwards compatibility
export { Step } from '../types';

interface ClaimStore {
  // === LOADING STATE ===
  isLoading: boolean;
  isInitialized: boolean;
  isProcessing: boolean;
  processingText: string;
  showSaveIndicator: boolean;

  // === USER STATE ===
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  loadUserProfile: () => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;

  // === CLAIMS STATE ===
  dashboardClaims: ClaimState[];
  setDashboardClaims: (claims: ClaimState[]) => void;
  loadClaims: () => Promise<void>;

  // === CURRENT CLAIM STATE ===
  claimData: ClaimState;
  setClaimData: (data: ClaimState | ((prev: ClaimState) => ClaimState)) => void;
  createNewClaim: () => void;
  saveClaim: () => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;

  // === WIZARD STATE ===
  step: Step;
  maxStepReached: Step;
  setStep: (step: Step) => void;
  resetWizardState: () => void;

  // === DEADLINES STATE ===
  deadlines: Deadline[];
  setDeadlines: (deadlines: Deadline[]) => void;
  loadDeadlines: () => Promise<void>;
  addDeadline: (deadline: Deadline) => Promise<void>;
  completeDeadline: (deadline: Deadline) => Promise<void>;
  deleteDeadline: (deadlineId: string) => Promise<void>;
  snoozeDeadline: (deadlineId: string, newDate: string) => Promise<void>;

  // === AI EXTRACTION STATE ===
  extractedData: ExtractedClaimData | null;
  setExtractedData: (data: ExtractedClaimData | null) => void;
  canProceed: boolean;
  setCanProceed: (can: boolean) => void;

  // === INTEGRATIONS ===
  accountingConnection: AccountingConnection | null;
  setAccountingConnection: (conn: AccountingConnection | null) => void;

  // === INITIALIZATION ===
  initialize: () => Promise<void>;

  // === CLAIM FIELD UPDATERS ===
  updateClaimant: (party: Party) => void;
  updateDefendant: (party: Party) => void;
  updateInvoiceDetails: (field: string, value: string | number) => void;

  // === AI PROCESSING ===
  analyzeEvidenceFiles: () => Promise<void>;
}

export const useClaimStore = create<ClaimStore>()(
  persist(
    (set, get) => ({
      // === INITIAL STATE ===
      isLoading: true,
      isInitialized: false,
      isProcessing: false,
      processingText: '',
      showSaveIndicator: false,

      userProfile: null,
      dashboardClaims: [],
      claimData: { ...INITIAL_STATE },

      step: Step.EVIDENCE,
      maxStepReached: Step.EVIDENCE,

      deadlines: [],
      extractedData: null,
      canProceed: false,
      accountingConnection: null,

      // === INITIALIZATION ===
      initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });
        try {
          const [claims, profile, deadlines] = await Promise.all([
            getStoredClaims(),
            getUserProfile(),
            getDeadlines()
          ]);
          set({
            dashboardClaims: claims,
            userProfile: profile,
            deadlines,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          console.error('Failed to initialize store:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // === USER PROFILE ACTIONS ===
      setUserProfile: (profile) => set({ userProfile: profile }),

      loadUserProfile: async () => {
        const profile = await getUserProfile();
        set({ userProfile: profile });
      },

      saveUserProfile: async (profile) => {
        await persistUserProfile(profile);
        set({ userProfile: profile });
      },

      // === CLAIMS ACTIONS ===
      setDashboardClaims: (claims) => set({ dashboardClaims: claims }),

      loadClaims: async () => {
        const claims = await getStoredClaims();
        set({ dashboardClaims: claims });
      },

      setClaimData: (data) => {
        if (typeof data === 'function') {
          set((state) => ({ claimData: data(state.claimData) }));
        } else {
          set({ claimData: data });
        }
      },

      createNewClaim: () => {
        const { userProfile } = get();
        const claimant = userProfile
          ? profileToClaimantParty(userProfile)
          : INITIAL_STATE.claimant;

        set({
          claimData: {
            ...INITIAL_STATE,
            id: Math.random().toString(36).substr(2, 9),
            claimant,
            lastModified: Date.now()
          },
          step: Step.EVIDENCE,
          maxStepReached: Step.EVIDENCE,
          extractedData: null,
          canProceed: false
        });
      },

      saveClaim: async () => {
        const { claimData, loadClaims } = get();
        if (!claimData.id) return;

        set({ showSaveIndicator: true });
        await saveClaimToStorage({ ...claimData, lastModified: Date.now() });
        await loadClaims();

        // Hide indicator after delay
        setTimeout(() => set({ showSaveIndicator: false }), 2000);
      },

      deleteClaim: async (id) => {
        await deleteDeadlinesForClaim(id);
        await deleteClaimFromStorage(id);
        set((state) => ({
          dashboardClaims: state.dashboardClaims.filter(c => c.id !== id),
          deadlines: state.deadlines.filter(d => d.claimId !== id)
        }));
      },

      // === WIZARD ACTIONS ===
      setStep: (step) => {
        set((state) => ({
          step,
          maxStepReached: Math.max(state.maxStepReached, step) as Step
        }));
      },

      resetWizardState: () => {
        set({
          step: Step.EVIDENCE,
          maxStepReached: Step.EVIDENCE,
          extractedData: null,
          canProceed: false
        });
      },

      // === DEADLINES ACTIONS ===
      setDeadlines: (deadlines) => set({ deadlines }),

      loadDeadlines: async () => {
        const deadlines = await getDeadlines();
        set({ deadlines });
      },

      addDeadline: async (deadline) => {
        await persistDeadline(deadline);
        set((state) => ({
          deadlines: [...state.deadlines, deadline]
        }));
      },

      completeDeadline: async (deadline) => {
        const updatedDeadline: Deadline = {
          ...deadline,
          status: DeadlineStatus.COMPLETED,
          completedAt: new Date().toISOString()
        };
        await persistDeadline(updatedDeadline);
        set((state) => ({
          deadlines: state.deadlines.map(d =>
            d.id === deadline.id ? updatedDeadline : d
          )
        }));
      },

      deleteDeadline: async (deadlineId) => {
        // Remove from storage
        await deleteDeadlineFromStorage(deadlineId);
        // Remove from state
        set((state) => ({
          deadlines: state.deadlines.filter(d => d.id !== deadlineId)
        }));
      },

      snoozeDeadline: async (deadlineId, newDate) => {
        const { deadlines } = get();
        const deadline = deadlines.find(d => d.id === deadlineId);
        if (!deadline) return;

        const updatedDeadline: Deadline = {
          ...deadline,
          dueDate: newDate,
          status: DeadlineStatus.SNOOZED,
          snoozedUntil: newDate
        };
        await persistDeadline(updatedDeadline);
        set((state) => ({
          deadlines: state.deadlines.map(d =>
            d.id === deadlineId ? updatedDeadline : d
          )
        }));
      },

      // === AI STATE ACTIONS ===
      setExtractedData: (data) => set({ extractedData: data }),
      setCanProceed: (can) => set({ canProceed: can }),

      // === INTEGRATION ACTIONS ===
      setAccountingConnection: (conn) => set({ accountingConnection: conn }),

      // === CLAIM FIELD UPDATERS ===
      updateClaimant: (party) => {
        set((state) => {
          // Recalculate interest and compensation when claimant changes (affects B2B vs B2C)
          const interest = calculateInterest(
            state.claimData.invoice.totalAmount,
            state.claimData.invoice.dateIssued,
            state.claimData.invoice.dueDate,
            party.type,
            state.claimData.defendant.type
          );

          const compensation = calculateCompensation(
            state.claimData.invoice.totalAmount,
            party.type,
            state.claimData.defendant.type
          );

          return {
            claimData: {
              ...state.claimData,
              claimant: party,
              interest,
              compensation,
              assessment: null
            }
          };
        });
      },

      updateDefendant: (party) => {
        set((state) => {
          // Recalculate interest and compensation when defendant changes (affects B2B vs B2C)
          const interest = calculateInterest(
            state.claimData.invoice.totalAmount,
            state.claimData.invoice.dateIssued,
            state.claimData.invoice.dueDate,
            state.claimData.claimant.type,
            party.type
          );

          const compensation = calculateCompensation(
            state.claimData.invoice.totalAmount,
            state.claimData.claimant.type,
            party.type
          );

          return {
            claimData: {
              ...state.claimData,
              defendant: party,
              interest,
              compensation,
              assessment: null
            }
          };
        });
      },

      updateInvoiceDetails: (field, value) => {
        set((state) => {
          const updatedInvoice = {
            ...state.claimData.invoice,
            [field]: field === 'totalAmount' ? parseFloat(String(value)) || 0 : value
          };

          // Recalculate interest and compensation when invoice details change
          const interest = calculateInterest(
            updatedInvoice.totalAmount,
            updatedInvoice.dateIssued,
            updatedInvoice.dueDate,
            state.claimData.claimant.type,
            state.claimData.defendant.type
          );

          const compensation = calculateCompensation(
            updatedInvoice.totalAmount,
            state.claimData.claimant.type,
            state.claimData.defendant.type
          );

          return {
            claimData: {
              ...state.claimData,
              invoice: updatedInvoice,
              interest,
              compensation,
              assessment: null
            }
          };
        });
      },

      analyzeEvidenceFiles: async () => {
        const { claimData, setClaimData } = get();
        if (claimData.evidence.length === 0) return;

        set({ isProcessing: true, processingText: 'Analyzing evidence files...' });

        try {
          const evidenceResult = await analyzeEvidence(claimData.evidence);

          // Best-effort: map AI classifications back onto the uploaded evidence list
          const byName = new Map<string, string>();
          const byIndex = new Map<number, string>();
          for (const c of evidenceResult.classifications || []) {
            const key = (c.fileName || '').trim().toLowerCase();
            if (key) byName.set(key, c.type);
            if (/^\d+$/.test(key)) {
              const idx = Number(key);
              if (Number.isFinite(idx)) byIndex.set(idx, c.type);
            }
          }

          const evidenceWithClassifications = claimData.evidence.map((f, idx) => {
            const match =
              byName.get((f.name || '').trim().toLowerCase()) ??
              byIndex.get(idx) ??
              f.classification;
            return match ? { ...f, classification: match } : f;
          });

          // Normalize + validate + infer (county/type) via extractionProcessor
          const extraction = processEvidenceExtraction(
            {
              defendant: evidenceResult.defendant,
              invoice: evidenceResult.invoice,
              timeline: evidenceResult.timelineEvents,
              confidence: 85
            },
            claimData.evidence.map(f => f.name).join(', ') || 'evidence upload'
          );

          const update = toClaimStateUpdate(extraction);

          const mergeDefined = <T extends Record<string, any>>(base: T, incoming: Partial<T> | undefined): T => {
            if (!incoming) return base;
            const out = { ...base };
            for (const [k, v] of Object.entries(incoming)) {
              if (v === undefined || v === null) continue;
              if (typeof v === 'string' && v.trim() === '') continue;
              if (typeof v === 'number') {
                if (!Number.isFinite(v)) continue;
                // Avoid overwriting totals with 0
                if (k === 'totalAmount' && v <= 0) continue;
              }
              (out as any)[k] = v;
            }
            return out;
          };

          const dedupeTimeline = (events: any[]) => {
            const seen = new Set<string>();
            const out: any[] = [];
            for (const e of events) {
              const key = `${e.type}|${e.date}|${(e.description || '').trim().toLowerCase()}`;
              if (seen.has(key)) continue;
              seen.add(key);
              out.push(e);
            }
            return out;
          };

          const mergedDefendant = mergeDefined(claimData.defendant, update.defendant as any);
          const mergedInvoice = mergeDefined(claimData.invoice, update.invoice as any);

          const mergedTimeline =
            Array.isArray(update.timeline) && update.timeline.length > 0
              ? dedupeTimeline([...(claimData.timeline || []), ...(update.timeline || [])])
              : claimData.timeline;

          // Recalculate interest/compensation after merging
          const interest = calculateInterest(
            mergedInvoice.totalAmount,
            mergedInvoice.dateIssued,
            mergedInvoice.dueDate,
            claimData.claimant.type,
            mergedDefendant.type
          );

          const compensation = calculateCompensation(
            mergedInvoice.totalAmount,
            claimData.claimant.type,
            mergedDefendant.type
          );

          setClaimData(prev => ({
            ...prev,
            source: 'upload',
            evidence: evidenceWithClassifications,
            defendant: mergedDefendant,
            invoice: mergedInvoice,
            timeline: mergedTimeline,
            // Only allow AI recommendation to update doc type if the user hasn't explicitly chosen one
            selectedDocType: prev.userSelectedDocType ? prev.selectedDocType : (update.selectedDocType || prev.selectedDocType),
            interest,
            compensation,
            assessment: null
          }));

          set({ isProcessing: false, processingText: '' });
        } catch (error) {
          console.error('Evidence analysis failed:', error);
          set({ isProcessing: false, processingText: '' });
        }
      }
    }),
    {
      name: 'claimcraft-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist minimal state - the rest loads from IndexedDB
        accountingConnection: state.accountingConnection
      })
    }
  )
);
