/**
 * Document Recommendation Service
 *
 * Centralized logic for recommending the next document based on claim state.
 * Consolidates logic from geminiService.ts and ConversationEntry.tsx.
 */

import { DocumentType, ClaimState, TimelineEvent, ClaimStrength } from '../types';
import { isLbaExpired, detectLbaStatus } from '../utils/timelineNormalizer';

/**
 * Claim stage for document recommendation
 */
export type ClaimStage =
  | 'initial'           // No actions taken yet
  | 'pre_lba'           // Before Letter Before Action
  | 'lba_sent'          // LBA sent, waiting for response
  | 'lba_expired'       // LBA response period passed (14+ days)
  | 'court_filed'       // Claim filed at court
  | 'acknowledgment'    // Defendant acknowledged
  | 'defense_filed'     // Defendant filed defence
  | 'judgment_entered'  // Judgment obtained
  | 'enforcement';      // Enforcement stage

/**
 * Relationship context for recommendation
 */
export type RelationshipContext =
  | 'preserve'          // Want to preserve relationship
  | 'neutral'           // No strong preference
  | 'terminated';       // Relationship already ended

/**
 * Input for document recommendation
 */
export interface RecommendationInput {
  /** Timeline events */
  timeline?: TimelineEvent[];
  /** Claim status */
  claimStatus?: string;
  /** Claim strength assessment */
  claimStrength?: ClaimStrength;
  /** Whether the claim has been filed at court */
  courtFiled?: boolean;
  /** Total claim amount */
  totalAmount?: number;
  /** Relationship context */
  relationship?: RelationshipContext;
  /** Whether defendant has responded */
  defendantResponded?: boolean;
  /** Whether judgment has been obtained */
  judgmentObtained?: boolean;
  /** Days since due date */
  daysSinceDue?: number;
  /** Number of chasers/reminders sent */
  chaserCount?: number;
  /** Has the defendant made any partial payments? */
  hasPartialPayment?: boolean;
}

/**
 * Document recommendation result
 */
export interface DocumentRecommendation {
  /** Primary recommended document */
  primaryDocument: DocumentType;
  /** Reason for recommendation */
  reason: string;
  /** Alternative documents to consider */
  alternatives: {
    document: DocumentType;
    reason: string;
  }[];
  /** Current claim stage */
  stage: ClaimStage;
  /** Urgency level (1-5) */
  urgency: number;
  /** Warnings or considerations */
  warnings: string[];
}

/**
 * Determine the current claim stage
 */
export const determineStage = (input: RecommendationInput): ClaimStage => {
  if (input.judgmentObtained) {
    return 'enforcement';
  }

  if (input.courtFiled) {
    if (input.defendantResponded) {
      return 'defense_filed';
    }
    return 'court_filed';
  }

  const timeline = input.timeline || [];
  const lbaStatus = detectLbaStatus(timeline);

  if (lbaStatus.lbaSent) {
    if (lbaStatus.daysSinceLba !== null && lbaStatus.daysSinceLba >= 14) {
      return 'lba_expired';
    }
    return 'lba_sent';
  }

  const chaserCount = input.chaserCount || timeline.filter(e => e.type === 'chaser').length;
  if (chaserCount > 0) {
    return 'pre_lba';
  }

  return 'initial';
};

/**
 * Check if claim qualifies for small claims track
 * Small claims: up to £10,000 (or £1,000 for personal injury)
 */
export const isSmallClaims = (amount: number | undefined): boolean => {
  if (!amount) return true;
  return amount <= 10000;
};

/**
 * Get urgency level based on stage and timing
 */
const getUrgency = (stage: ClaimStage, input: RecommendationInput): number => {
  switch (stage) {
    case 'lba_expired':
      return 4; // High urgency - can now proceed to court
    case 'court_filed':
      return 5; // Critical - court deadlines apply
    case 'lba_sent':
      return 3; // Moderate - waiting for response
    case 'pre_lba':
      return 2; // Low-moderate - should escalate
    case 'initial':
      return input.daysSinceDue && input.daysSinceDue > 30 ? 2 : 1;
    default:
      return 3;
  }
};

/**
 * Get document recommendation based on claim state
 */
export const recommendDocument = (input: RecommendationInput): DocumentRecommendation => {
  const stage = determineStage(input);
  const urgency = getUrgency(stage, input);
  const warnings: string[] = [];
  const alternatives: { document: DocumentType; reason: string }[] = [];

  // Determine primary recommendation based on stage
  let primaryDocument: DocumentType;
  let reason: string;

  switch (stage) {
    case 'initial':
      // No actions taken - recommend based on relationship
      if (input.relationship === 'preserve') {
        primaryDocument = DocumentType.POLITE_CHASER;
        reason = 'A polite reminder is appropriate as a first step when preserving the business relationship.';
        alternatives.push({
          document: DocumentType.LBA,
          reason: 'If you need to escalate, a Letter Before Action gives formal notice.'
        });
      } else {
        primaryDocument = DocumentType.POLITE_CHASER;
        reason = 'Start with a polite reminder to give the debtor an opportunity to pay before escalating.';
        alternatives.push({
          document: DocumentType.LBA,
          reason: 'Skip straight to formal Letter Before Action if the debt is already significantly overdue.'
        });
      }
      break;

    case 'pre_lba':
      // Chasers sent but no LBA yet
      primaryDocument = DocumentType.LBA;
      reason = 'Previous reminders have not resulted in payment. A formal Letter Before Action is the required pre-court step.';

      if (input.hasPartialPayment) {
        alternatives.push({
          document: DocumentType.INSTALLMENT_AGREEMENT,
          reason: 'Partial payments show willingness to pay - consider a formal installment agreement.'
        });
      }
      break;

    case 'lba_sent':
      // LBA sent, waiting for response
      primaryDocument = DocumentType.LBA; // Re-send or wait
      reason = 'The Letter Before Action has been sent. You should wait at least 14 days for a response before proceeding to court.';
      warnings.push('The 14-day response period has not yet elapsed. Filing at court before this period expires may result in cost penalties.');
      break;

    case 'lba_expired':
      // LBA period passed - can proceed to court
      primaryDocument = DocumentType.FORM_N1;
      reason = 'The Letter Before Action response period has expired. You can now file a claim at court using Form N1.';

      if (input.claimStrength === 'low') {
        warnings.push('Your claim strength has been assessed as low. Consider seeking legal advice before proceeding to court.');
        alternatives.push({
          document: DocumentType.PART_36_OFFER,
          reason: 'A Part 36 settlement offer may be advantageous given the claim strength assessment.'
        });
      }

      if (!isSmallClaims(input.totalAmount)) {
        warnings.push(`Your claim amount (£${input.totalAmount?.toLocaleString()}) exceeds the small claims limit. Legal representation is recommended.`);
      }
      break;

    case 'court_filed':
      // Claim filed, waiting for defendant response
      primaryDocument = DocumentType.DIRECTIONS_QUESTIONNAIRE;
      reason = 'Your claim has been filed. You may need to complete a Directions Questionnaire (N180) for case management.';

      alternatives.push({
        document: DocumentType.DEFAULT_JUDGMENT,
        reason: 'If the defendant fails to respond within the deadline, you can apply for default judgment.'
      });

      alternatives.push({
        document: DocumentType.PART_36_OFFER,
        reason: 'A Part 36 offer can protect against costs if the defendant eventually settles for less.'
      });
      break;

    case 'defense_filed':
      // Defendant has responded
      primaryDocument = DocumentType.DIRECTIONS_QUESTIONNAIRE;
      reason = 'The defendant has filed a response. Complete the Directions Questionnaire to proceed with the case.';

      alternatives.push({
        document: DocumentType.PART_36_OFFER,
        reason: 'Consider a Part 36 settlement offer to potentially resolve without trial.'
      });
      break;

    case 'judgment_entered':
    case 'enforcement':
      // Have judgment, need to enforce
      primaryDocument = DocumentType.FORM_N1; // Placeholder - enforcement forms not fully modeled
      reason = 'Judgment has been obtained. Consider enforcement options such as warrant of control or attachment of earnings.';
      warnings.push('Enforcement may require additional court applications and fees.');
      break;

    default:
      primaryDocument = DocumentType.LBA;
      reason = 'Letter Before Action is the standard first formal step in debt recovery.';
  }

  return {
    primaryDocument,
    reason,
    alternatives,
    stage,
    urgency,
    warnings
  };
};

/**
 * Get recommendation from extracted claim data
 * Used by extractDataFromChat and other extraction functions
 */
export const recommendFromClaimState = (state: Partial<ClaimState>): DocumentRecommendation => {
  const input: RecommendationInput = {
    timeline: state.timeline,
    claimStatus: state.status,
    claimStrength: state.assessment?.strength,
    courtFiled: state.status === 'court' || state.status === 'judgment',
    totalAmount: state.invoice?.totalAmount,
    judgmentObtained: state.status === 'judgment',
    daysSinceDue: calculateDaysSinceDue(state.invoice?.dueDate)
  };

  // Check for LBA in timeline
  if (state.timeline) {
    const lbaStatus = detectLbaStatus(state.timeline);
    input.chaserCount = state.timeline.filter(e => e.type === 'chaser').length;
    input.hasPartialPayment = state.timeline.some(e => e.type === 'part_payment');
  }

  return recommendDocument(input);
};

/**
 * Calculate days since due date
 */
const calculateDaysSinceDue = (dueDate: string | undefined): number | undefined => {
  if (!dueDate) return undefined;

  try {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return undefined;
  }
};

/**
 * Map AI-generated document name to DocumentType enum
 * Handles variations in how AI models name documents
 */
export const mapToDocumentType = (aiDocumentName: string | undefined): DocumentType => {
  if (!aiDocumentName) return DocumentType.LBA;

  const normalized = aiDocumentName.toLowerCase().trim();

  // Map variations to DocumentType
  const mappings: Record<string, DocumentType> = {
    // Polite reminder variations
    'polite payment reminder': DocumentType.POLITE_CHASER,
    'polite reminder': DocumentType.POLITE_CHASER,
    'payment reminder': DocumentType.POLITE_CHASER,
    'reminder': DocumentType.POLITE_CHASER,
    'chaser': DocumentType.POLITE_CHASER,
    'friendly reminder': DocumentType.POLITE_CHASER,

    // LBA variations
    'letter before action': DocumentType.LBA,
    'lba': DocumentType.LBA,
    'letter before claim': DocumentType.LBA,
    'pre-action letter': DocumentType.LBA,
    'final demand': DocumentType.LBA,
    'formal demand': DocumentType.LBA,

    // Form N1 variations
    'form n1': DocumentType.FORM_N1,
    'form n1 (claim form)': DocumentType.FORM_N1,
    'claim form': DocumentType.FORM_N1,
    'n1': DocumentType.FORM_N1,
    'court claim': DocumentType.FORM_N1,
    'money claim': DocumentType.FORM_N1,

    // Default judgment variations
    'form n225': DocumentType.DEFAULT_JUDGMENT,
    'form n225 (default judgment)': DocumentType.DEFAULT_JUDGMENT,
    'default judgment': DocumentType.DEFAULT_JUDGMENT,
    'n225': DocumentType.DEFAULT_JUDGMENT,

    // Part 36 variations
    'part 36 offer': DocumentType.PART_36_OFFER,
    'part 36 settlement offer': DocumentType.PART_36_OFFER,
    'settlement offer': DocumentType.PART_36_OFFER,
    'part 36': DocumentType.PART_36_OFFER,

    // Installment variations
    'installment agreement': DocumentType.INSTALLMENT_AGREEMENT,
    'installment payment agreement': DocumentType.INSTALLMENT_AGREEMENT,
    'payment plan': DocumentType.INSTALLMENT_AGREEMENT,
    'payment arrangement': DocumentType.INSTALLMENT_AGREEMENT,

    // Directions questionnaire
    'form n180': DocumentType.DIRECTIONS_QUESTIONNAIRE,
    'directions questionnaire': DocumentType.DIRECTIONS_QUESTIONNAIRE,
    'n180': DocumentType.DIRECTIONS_QUESTIONNAIRE,

    // Admission judgment
    'form n225a': DocumentType.ADMISSION,
    'judgment admission': DocumentType.ADMISSION,
    'n225a': DocumentType.ADMISSION
  };

  // Find matching key
  for (const [key, docType] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      return docType;
    }
  }

  // Default to LBA if no match
  return DocumentType.LBA;
};

/**
 * Get human-readable document name
 */
export const getDocumentDisplayName = (docType: DocumentType): string => {
  // DocumentType enum values are already display names
  return docType;
};

/**
 * Get short document name for UI badges
 */
export const getDocumentShortName = (docType: DocumentType): string => {
  switch (docType) {
    case DocumentType.POLITE_CHASER:
      return 'Reminder';
    case DocumentType.LBA:
      return 'LBA';
    case DocumentType.FORM_N1:
      return 'N1 Form';
    case DocumentType.DEFAULT_JUDGMENT:
      return 'N225';
    case DocumentType.ADMISSION:
      return 'N225A';
    case DocumentType.DIRECTIONS_QUESTIONNAIRE:
      return 'N180';
    case DocumentType.PART_36_OFFER:
      return 'Part 36';
    case DocumentType.INSTALLMENT_AGREEMENT:
      return 'Installments';
    case DocumentType.TRIAL_BUNDLE:
      return 'Trial Bundle';
    case DocumentType.SKELETON_ARGUMENT:
      return 'Skeleton';
    default:
      return 'Document';
  }
};

export default {
  recommendDocument,
  recommendFromClaimState,
  determineStage,
  isSmallClaims,
  mapToDocumentType,
  getDocumentDisplayName,
  getDocumentShortName
};
