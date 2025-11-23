
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
  // Only applies B2B
  if (claimantType !== PartyType.BUSINESS || defendantType !== PartyType.BUSINESS) {
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
  const invoiceDate = new Date(state.invoice.dateIssued);
  const diffTime = Math.abs(now.getTime() - invoiceDate.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  // 1. Limitation Act 1980 Check
  const limitationCheck = {
    passed: diffYears < LIMITATION_PERIOD_YEARS,
    message: diffYears < LIMITATION_PERIOD_YEARS 
      ? "Within the 6-year statutory limitation period (Limitation Act 1980)."
      : "Claim is statute-barred (older than 6 years). You likely cannot recover this debt."
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
      message: "Warning: Defendant is marked as Insolvent/Dissolved. Recovering money is highly unlikely."
    };
  } else if (state.defendant.type === PartyType.BUSINESS && state.defendant.solvencyStatus === 'Dissolved') {
    solvencyCheck = {
      passed: false,
      message: "Defendant company is Dissolved. You cannot sue a company that does not exist."
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
