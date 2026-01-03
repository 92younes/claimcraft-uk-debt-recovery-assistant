import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationEntry } from '../components/ConversationEntry';
import { useClaimStore } from '../store/claimStore';
import { Step, ChatMessage, ClaimState, ConversationMessage, TimelineEvent, Party, InvoiceData } from '../types';
import { calculateInterest, calculateCompensation } from '../services/legalRules';
import { normalizePaymentTerms } from '../constants';

/**
 * Deep merge utility that only merges defined, non-empty values.
 * Prevents overwriting existing data with undefined/empty values from extracted data.
 */
const mergeDefinedValues = <T extends Record<string, any>>(target: T, source: Partial<T> | undefined): T => {
  if (!source) return target;

  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];

    // Only merge if source value is defined and non-empty
    if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
};

export const ConversationPage = () => {
  const navigate = useNavigate();
  const { userProfile, isLoading, claimData, createNewClaim, setClaimData, setStep } = useClaimStore();

  // Combined guard: ensure proper initialization sequence
  // 1. Wait for loading to complete
  // 2. If no user profile, redirect to onboarding
  // 3. If profile exists but no claim, create one
  // This prevents race conditions between navigation and claim creation
  React.useEffect(() => {
    // Wait for auth/profile loading to complete
    if (isLoading) return;

    // If no profile, redirect to onboarding first
    if (!userProfile) {
      navigate('/onboarding');
      return;
    }

    // Profile exists, ensure we have an active claim
    if (!claimData.id) {
      createNewClaim();
    }
  }, [isLoading, userProfile, claimData.id, createNewClaim, navigate]);

  const dedupeTimeline = (events: TimelineEvent[]): TimelineEvent[] => {
    const seen = new Set<string>();
    const out: TimelineEvent[] = [];
    for (const e of events) {
      const key = `${e.type}|${e.date}|${(e.description || '').trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
    return out;
  };

  const handleConversationComplete = useCallback((extractedData: Partial<ClaimState>, messages: ConversationMessage[]) => {
    // Debug logging to trace data transfer
    console.log('[ConversationPage] handleConversationComplete called');
    console.log('[ConversationPage] extractedData:', JSON.stringify(extractedData, null, 2));

    // Map conversation messages into chat history (preserve timestamps; generate stable IDs)
    const history: ChatMessage[] = messages.map((msg) => ({
      id: crypto.randomUUID(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    const hasEvidence = Array.isArray(extractedData.evidence) && extractedData.evidence.length > 0;

    setClaimData((prev) => {
      console.log('[ConversationPage] Previous claimData:', JSON.stringify(prev, null, 2));

      // Use defensive merge to prevent overwriting valid data with undefined/empty values
      const mergedDefendant = mergeDefinedValues(prev.defendant, extractedData.defendant as Partial<Party>);

      // Normalize payment terms from AI extraction (e.g., "30 days" -> "net_30")
      const extractedInvoice = extractedData.invoice as Partial<InvoiceData> | undefined;
      const normalizedPaymentTerms = normalizePaymentTerms(extractedInvoice?.paymentTerms as string);
      const invoiceWithNormalizedTerms = extractedInvoice ? {
        ...extractedInvoice,
        paymentTerms: normalizedPaymentTerms || extractedInvoice.paymentTerms
      } : undefined;

      const mergedInvoice = mergeDefinedValues(prev.invoice, invoiceWithNormalizedTerms);

      // CRITICAL FIX: Never overwrite claimant data from AI extraction
      // Claimant is ALWAYS the logged-in user's profile data (set when claim was created)
      // AI may hallucinate claimant addresses from documents - always use user's profile instead
      const mergedClaimant = prev.claimant;

      // Recalculate interest and compensation based on merged data
      const interest = calculateInterest(
        mergedInvoice.totalAmount,
        mergedInvoice.dateIssued,
        mergedInvoice.dueDate,
        mergedClaimant.type,
        mergedDefendant.type
      );

      const compensation = calculateCompensation(
        mergedInvoice.totalAmount,
        mergedClaimant.type,
        mergedDefendant.type
      );

      const newClaimData = {
        ...prev,
        chatHistory: history,
        source: hasEvidence ? 'upload' as const : 'manual' as const,
        claimant: mergedClaimant,
        defendant: mergedDefendant,
        invoice: mergedInvoice,
        interest,
        compensation,
        timeline: dedupeTimeline([...(prev.timeline || []), ...((extractedData.timeline as TimelineEvent[]) || [])]),
        evidence: hasEvidence ? extractedData.evidence : prev.evidence,
        // Preserve other extracted fields
        selectedDocType: extractedData.selectedDocType || prev.selectedDocType,
        lbaAlreadySent: extractedData.lbaAlreadySent ?? prev.lbaAlreadySent,
        lbaSentDate: extractedData.lbaSentDate || prev.lbaSentDate
      };

      console.log('[ConversationPage] New claimData:', JSON.stringify(newClaimData, null, 2));
      return newClaimData;
    });

    // setStep already advances maxStepReached inside the store
    setStep(Step.VERIFY);

    // Use requestAnimationFrame to ensure state update is processed before navigation
    requestAnimationFrame(() => {
      navigate('/wizard');
    });
  }, [setClaimData, setStep, navigate]);

  const handleSkipToWizard = () => {
    setStep(Step.EVIDENCE);
    navigate('/wizard');
  };

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
        <ConversationEntry
            userProfile={userProfile}
            onComplete={handleConversationComplete}
            onSkipToWizard={handleSkipToWizard}
        />
    </div>
  );
};


