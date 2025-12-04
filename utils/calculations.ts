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
