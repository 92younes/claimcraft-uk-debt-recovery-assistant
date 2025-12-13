import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConversationEntry } from '../components/ConversationEntry';
import { useClaimStore } from '../store/claimStore';
import { Step, ChatMessage, ClaimIntakeResult, ConversationMessage, TimelineEvent } from '../types';

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

  const handleConversationComplete = (intake: ClaimIntakeResult, messages: ConversationMessage[]) => {
    // Map conversation messages into chat history (preserve timestamps; generate stable IDs)
    const history: ChatMessage[] = messages.map((msg) => ({
      id: crypto.randomUUID(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));

    setClaimData((prev) => {
      const extracted = intake.extractedData || {};
      const hasEvidence = Array.isArray(extracted.evidence) && extracted.evidence.length > 0;

      return {
        ...prev,
        ...extracted,
        chatHistory: history,
        source: hasEvidence ? 'upload' : 'manual',
        claimant: { ...prev.claimant, ...(extracted.claimant || {}) },
        defendant: { ...prev.defendant, ...(extracted.defendant || {}) },
        invoice: { ...prev.invoice, ...(extracted.invoice || {}) },
        timeline: dedupeTimeline([...(prev.timeline || []), ...((extracted.timeline as TimelineEvent[]) || [])]),
        evidence: (extracted.evidence as any) ?? prev.evidence
      };
    });

    // setStep already advances maxStepReached inside the store
    setStep(Step.VERIFY);
    navigate('/wizard');
  };

  return (
    <div className="h-screen bg-white flex flex-col">
        <ConversationEntry 
            userProfile={userProfile}
            onComplete={handleConversationComplete}
        />
    </div>
  );
};


