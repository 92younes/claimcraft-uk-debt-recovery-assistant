
import { ClaimState, AssessmentResult, PartyType } from "../types";

const SMALL_CLAIMS_LIMIT = 10000;
const LIMITATION_PERIOD_YEARS = 6;

/**
 * UK Civil Proceedings Fees Order 2021 (Money Claims Online Fees)
 * Court fees are capped at £10,000 for claims over £200,000
 */
export const calculateCourtFee = (amount: number): number => {
  if (amount <= 300) return 35;
  if (amount <= 500) return 50;
  if (amount <= 1000) return 70;
  if (amount <= 1500) return 80;
  if (amount <= 3000) return 115;
  if (amount <= 5000) return 205;
  if (amount <= 10000) return 455;
  if (amount <= 200000) return Math.min(amount * 0.05, 10000); // 5% capped at £10k
  return 10000; // Maximum court fee for claims over £200k
};

/**
 * Late Payment of Commercial Debts (Interest) Act 1998
 * Fixed compensation for debt recovery costs.
 */
export const calculateCompensation = (amount: number, claimantType: PartyType, defendantType: PartyType): number => {
  // Only applies B2B (Business/Sole Trader vs Business/Sole Trader)
  const isClaimantBusiness = claimantType === PartyType.BUSINESS || claimantType === PartyType.SOLE_TRADER;
  const isDefendantBusiness = defendantType === PartyType.BUSINESS || defendantType === PartyType.SOLE_TRADER;

  if (!isClaimantBusiness || !isDefendantBusiness) {
    return 0;
  }

  if (amount < 1000) return 40;
  if (amount < 10000) return 70;
  return 100; // £100 for debts over £10,000
};

/**
 * THE EXPERT SYSTEM
 * A deterministic rules engine that validates the claim against UK Civil Procedure Rules.
 */
export const assessClaimViability = (state: ClaimState): AssessmentResult => {
  const now = new Date();
  
  // 1. Limitation Act 1980 Check
  const invoiceDate = new Date(state.invoice.dateIssued);
  // If due date is available, limitation runs from then. Otherwise, estimate due date as issued + 30 days.
  const limitationStart = state.invoice.dueDate ? new Date(state.invoice.dueDate) : new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  const diffTime = Math.abs(now.getTime() - limitationStart.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  const limitationCheck = {
    passed: diffYears < LIMITATION_PERIOD_YEARS,
    message: diffYears < LIMITATION_PERIOD_YEARS 
      ? "Within the 6-year statutory limitation period (Limitation Act 1980)."
      : "Claim is statute-barred (older than 6 years from due date). You likely cannot recover this debt."
  };

  // 2. Value Check (CPR Part 27)
  const totalValue = state.invoice.totalAmount + state.interest.totalInterest + state.compensation;
  const valueCheck = {
    passed: totalValue <= SMALL_CLAIMS_LIMIT,
    message: totalValue <= SMALL_CLAIMS_LIMIT
      ? `Claim value (£${totalValue.toFixed(2)}) is within the Small Claims Track limit (£10,000).`
      : `Claim value (£${totalValue.toFixed(2)}) exceeds £10,000. This requires Fast Track or Multi-Track (higher legal risk/costs).`
  };

  // 3. Solvency Check (Companies House Simulation)
  let solvencyCheck = { passed: true, message: "Defendant appears to be an active entity." };
  if (state.defendant.type === PartyType.BUSINESS && state.defendant.solvencyStatus === 'Insolvent') {
    solvencyCheck = {
      passed: false,
      message: "⚠️ Warning: Defendant company is Insolvent. Recovery is highly unlikely even if you win judgment."
    };
  } else if (state.defendant.type === PartyType.BUSINESS && state.defendant.solvencyStatus === 'Dissolved') {
    solvencyCheck = {
      passed: false,
      message: "❌ Defendant company is Dissolved. You cannot pursue legal action against a non-existent entity."
    };
  }

  const isViable = limitationCheck.passed && valueCheck.passed && solvencyCheck.passed;

  let recommendation = "Proceed with caution.";
  if (isViable) {
    recommendation = "Claim appears legally viable for the Small Claims Track.";
  } else if (!limitationCheck.passed) {
    recommendation = "Do not proceed. The claim is too old.";
  } else if (!solvencyCheck.passed) {
    recommendation = "Do not proceed. The defendant cannot pay.";
  } else {
    recommendation = "Proceed with caution. Seek legal advice as this exceeds small claims limits.";
  }

  return {
    isViable,
    limitationCheck,
    valueCheck,
    solvencyCheck,
    recommendation
  };
};

// ==========================================
// Deadline Calculation Rules
// ==========================================

/**
 * Get the appropriate LBA response period based on defendant type
 * Pre-Action Protocol for Debt Claims:
 * - Business to Business: 14 days minimum
 * - Business to Consumer: 30 days recommended
 */
export const getLbaResponsePeriodDays = (defendantType: PartyType): number => {
  return defendantType === PartyType.INDIVIDUAL ? 30 : 14;
};

/**
 * Calculate when the LBA response period expires
 */
export const calculateLbaExpiryDate = (lbaDate: string, defendantType: PartyType): Date => {
  const days = getLbaResponsePeriodDays(defendantType);
  const date = new Date(lbaDate);
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Check if LBA response period has expired
 */
export const hasLbaExpired = (lbaDate: string, defendantType: PartyType): boolean => {
  const expiryDate = calculateLbaExpiryDate(lbaDate, defendantType);
  return new Date() > expiryDate;
};

/**
 * CPR Part 7 - Acknowledgment of Service deadline
 * Defendant has 14 days from service to acknowledge
 */
export const calculateAcknowledgmentDeadline = (serviceDate: string): Date => {
  const date = new Date(serviceDate);
  date.setDate(date.getDate() + 14);
  return date;
};

/**
 * CPR Part 15 - Defence filing deadline
 * 14 days after acknowledgment, or 28 days total from service if no acknowledgment
 */
export const calculateDefenceDeadline = (serviceDate: string, hasAcknowledged: boolean, acknowledgmentDate?: string): Date => {
  if (hasAcknowledged && acknowledgmentDate) {
    // 14 days from acknowledgment date
    const date = new Date(acknowledgmentDate);
    date.setDate(date.getDate() + 14);
    return date;
  }
  // 28 days from service if no acknowledgment
  const date = new Date(serviceDate);
  date.setDate(date.getDate() + 28);
  return date;
};

/**
 * CPR Part 12 - Default Judgment
 * Can apply for default judgment if no defence filed within time limit
 */
export const canApplyForDefaultJudgment = (defenceDeadline: Date): boolean => {
  return new Date() > defenceDeadline;
};

/**
 * Enforcement waiting period after judgment
 * Generally recommended to wait 14 days before enforcement
 */
export const calculateEnforcementDate = (judgmentDate: string): Date => {
  const date = new Date(judgmentDate);
  date.setDate(date.getDate() + 14);
  return date;
};
