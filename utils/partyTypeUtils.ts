/**
 * Party Type Utilities
 *
 * Centralized B2B logic and party type helpers.
 * This consolidates duplicate logic from 8+ files in the codebase.
 */

import { PartyType } from '../types';

/**
 * Check if a party type is a business (includes sole traders)
 * Per Late Payment of Commercial Debts (Interest) Act 1998, sole traders are treated as businesses
 */
export const isBusiness = (type: PartyType | string | undefined): boolean => {
  if (!type) return false;
  return type === PartyType.BUSINESS || type === PartyType.SOLE_TRADER ||
         type === 'Business' || type === 'Sole Trader';
};

/**
 * Check if a party type is an individual
 */
export const isIndividual = (type: PartyType | string | undefined): boolean => {
  if (!type) return true; // Default to individual if not specified
  return type === PartyType.INDIVIDUAL || type === 'Individual';
};

/**
 * Check if a transaction is B2B (Business to Business)
 * This determines which interest act applies:
 * - B2B: Late Payment of Commercial Debts (Interest) Act 1998
 * - B2C: County Courts Act 1984 s.69
 */
export const isB2B = (
  claimantType: PartyType | string | undefined,
  defendantType: PartyType | string | undefined
): boolean => {
  return isBusiness(claimantType) && isBusiness(defendantType);
};

/**
 * Get the applicable interest act citation
 * @param b2b - Whether the transaction is B2B
 * @returns The legal citation string
 */
export const getInterestAct = (b2b: boolean): string => {
  return b2b
    ? 'the Late Payment of Commercial Debts (Interest) Act 1998'
    : 'section 69 of the County Courts Act 1984';
};

/**
 * Get the applicable interest act short name
 * @param b2b - Whether the transaction is B2B
 * @returns Short form of the act name
 */
export const getInterestActShort = (b2b: boolean): string => {
  return b2b
    ? 'Late Payment Act 1998'
    : 'County Courts Act 1984 s.69';
};

/**
 * Get the applicable interest rate description
 * @param b2b - Whether the transaction is B2B
 * @returns Interest rate description string
 */
export const getInterestRate = (b2b: boolean): string => {
  return b2b
    ? '8% above Bank of England Base Rate'
    : '8% per annum';
};

/**
 * Get the current BOE base rate (as of code date)
 * Note: In production, this should be fetched from an API
 */
export const getBOEBaseRate = (): number => {
  return 5.25; // Updated periodically
};

/**
 * Get the statutory interest rate for B2B claims
 * Late Payment Act 1998: BOE Base Rate + 8%
 */
export const getStatutoryB2BRate = (): number => {
  return getBOEBaseRate() + 8.0;
};

/**
 * Get the statutory interest rate for B2C claims
 * County Courts Act 1984 s.69: Fixed 8% per annum
 */
export const getStatutoryB2CRate = (): number => {
  return 8.0;
};

/**
 * Get the appropriate interest rate based on party types
 * @param claimantType - Type of claimant
 * @param defendantType - Type of defendant
 * @returns Annual interest rate as a percentage
 */
export const getInterestRatePercentage = (
  claimantType: PartyType | string | undefined,
  defendantType: PartyType | string | undefined
): number => {
  return isB2B(claimantType, defendantType)
    ? getStatutoryB2BRate()
    : getStatutoryB2CRate();
};

/**
 * Calculate late payment compensation for B2B claims
 * Per Late Payment of Commercial Debts (Interest) Act 1998
 * @param principalAmount - The debt amount
 * @param claimantType - Type of claimant
 * @param defendantType - Type of defendant
 * @returns Compensation amount (£40, £70, or £100)
 */
export const calculateCompensation = (
  principalAmount: number,
  claimantType: PartyType | string | undefined,
  defendantType: PartyType | string | undefined
): number => {
  // Compensation only applies to B2B transactions
  if (!isB2B(claimantType, defendantType)) {
    return 0;
  }

  // Late Payment Act 1998 fixed compensation amounts
  if (principalAmount < 1000) return 40;
  if (principalAmount < 10000) return 70;
  return 100;
};

/**
 * Get the compensation clause text for B2B claims
 * @param b2b - Whether the transaction is B2B
 * @param compensationAmount - The calculated compensation amount
 * @returns Compensation clause text or empty string
 */
export const getCompensationClause = (b2b: boolean, compensationAmount: number): string => {
  if (!b2b || compensationAmount <= 0) return '';

  return `The Claimant is entitled to statutory compensation of £${compensationAmount.toFixed(2)} ` +
         `pursuant to section 5A of the Late Payment of Commercial Debts (Interest) Act 1998.`;
};

/**
 * Format party type for display
 */
export const formatPartyType = (type: PartyType | string | undefined): string => {
  if (!type) return 'Individual';
  if (type === PartyType.BUSINESS || type === 'Business') return 'Business';
  if (type === PartyType.SOLE_TRADER || type === 'Sole Trader') return 'Sole Trader';
  return 'Individual';
};

/**
 * Determine party type from company indicators
 * @param name - Party name
 * @param companyNumber - Optional company registration number
 * @returns Inferred party type
 */
export const inferPartyType = (name: string, companyNumber?: string): PartyType => {
  if (!name) return PartyType.INDIVIDUAL;

  // If company number exists, it's a business
  if (companyNumber?.trim()) {
    return PartyType.BUSINESS;
  }

  const nameLower = name.toLowerCase();

  // Check for company indicators
  const companyIndicators = [
    ' ltd', ' limited', ' plc', ' llp', ' lp',
    ' inc', ' corp', ' corporation',
    'trading as', 't/a'
  ];

  if (companyIndicators.some(indicator => nameLower.includes(indicator))) {
    return PartyType.BUSINESS;
  }

  // Default to individual
  return PartyType.INDIVIDUAL;
};

export default {
  isBusiness,
  isIndividual,
  isB2B,
  getInterestAct,
  getInterestActShort,
  getInterestRate,
  getBOEBaseRate,
  getStatutoryB2BRate,
  getStatutoryB2CRate,
  getInterestRatePercentage,
  calculateCompensation,
  getCompensationClause,
  formatPartyType,
  inferPartyType
};
