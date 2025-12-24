/**
 * Shared calculation utilities for claim amounts
 *
 * Centralizes financial calculations that were previously duplicated
 * across multiple files (geminiService.ts, App.tsx, etc.)
 */

/**
 * Format a number as currency with 2 decimal places
 */
export const formatCurrency = (val: number | undefined): string => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return val.toFixed(2);
};

/**
 * Calculate total debt (principal + interest + compensation)
 * Does NOT include court fee
 */
export const calculateTotalDebt = (
  principal: number,
  interest: number,
  compensation: number
): number => {
  return principal + interest + compensation;
};

/**
 * Calculate grand total (debt + court fee)
 */
export const calculateGrandTotal = (
  principal: number,
  interest: number,
  compensation: number,
  courtFee: number
): number => {
  return principal + interest + compensation + courtFee;
};

/**
 * Format total debt as currency string
 */
export const formatTotalDebt = (
  principal: number,
  interest: number,
  compensation: number
): string => {
  return formatCurrency(calculateTotalDebt(principal, interest, compensation));
};

/**
 * Format grand total as currency string
 */
export const formatGrandTotal = (
  principal: number,
  interest: number,
  compensation: number,
  courtFee: number
): string => {
  return formatCurrency(calculateGrandTotal(principal, interest, compensation, courtFee));
};

/**
 * Get currency symbol from currency code
 * Defaults to GBP for UK debt recovery context
 */
export const getCurrencySymbol = (currency?: string): string => {
  const symbols: Record<string, string> = {
    'GBP': '\u00A3',
    'USD': '$',
    'EUR': '\u20AC',
    'AUD': 'A$',
    'CAD': 'C$'
  };
  return symbols[currency || 'GBP'] || '\u00A3';
};

/**
 * Recalculate interest and compensation for a claim
 * This should be called whenever invoice amount, dates, or party types change
 * to ensure all views show consistent values
 */
export const recalculateClaimFinancials = (
  claim: {
    invoice: { totalAmount: number; dateIssued: string; dueDate: string };
    claimant: { type: any };
    defendant: { type: any };
  },
  calculateInterestFn: (amount: number, dateIssued: string, dueDate: string, claimantType: any, defendantType: any) => any,
  calculateCompensationFn: (amount: number, claimantType: any, defendantType: any) => number
) => {
  const interest = calculateInterestFn(
    claim.invoice.totalAmount,
    claim.invoice.dateIssued,
    claim.invoice.dueDate,
    claim.claimant.type,
    claim.defendant.type
  );

  const compensation = calculateCompensationFn(
    claim.invoice.totalAmount,
    claim.claimant.type,
    claim.defendant.type
  );

  return { interest, compensation };
};
