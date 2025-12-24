import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationEntry } from '../components/ConversationEntry';
import { useClaimStore } from '../store/claimStore';
import { Step, ChatMessage, ClaimState, ConversationMessage, TimelineEvent, Party, InvoiceData } from '../types';
import { calculateInterest, calculateCompensation } from '../services/legalRules';

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

  // Guard: ensure we always have an active claim before intake
  React.useEffect(() => {
    if (!claimData.id) {
      createNewClaim();
    }
  }, [claimData.id, createNewClaim]);

  // Guard: conversation intake requires onboarding/profile
  React.useEffect(() => {
    if (!isLoading && !userProfile) {
      navigate('/onboarding');
    }
  }, [isLoading, userProfile, navigate]);

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
      const mergedInvoice = mergeDefinedValues(prev.invoice, extractedData.invoice as Partial<InvoiceData>);

      // CRITICAL FIX: Never overwrite claimant data from conversation
      // Claimant is ALWAYS the logged-in user's profile data set in ConversationEntry
      // extractedData.claimant comes from ConversationEntry which already uses profileToClaimantParty
      const mergedClaimant = extractedData.claimant || prev.claimant;

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
    <div className="h-screen bg-white flex flex-col overflow-hidden">
        <ConversationEntry
            userProfile={userProfile}
            onComplete={handleConversationComplete}
            onSkipToWizard={handleSkipToWizard}
        />
    </div>
  );
};


