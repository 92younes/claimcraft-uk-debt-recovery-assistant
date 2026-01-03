/**
 * Field Formatters Utility
 *
 * Centralized formatting for money, dates, and postcodes.
 * Used across document generation, PDF filling, and templates.
 */

/**
 * Format money amount with 2 decimal places
 * @param amount - The amount to format
 * @param currency - Optional currency code (default: GBP)
 * @returns Formatted string like "1,234.56"
 */
export const formatMoney = (amount: number, currency: string = 'GBP'): string => {
  if (!Number.isFinite(amount)) return '0.00';

  const formatted = amount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatted;
};

/**
 * Format money for PDF form fields (no currency symbol, just number)
 * @param amount - The amount to format
 * @returns Formatted string like "1234.56"
 */
export const formatMoneyForForm = (amount: number): string => {
  if (!Number.isFinite(amount)) return '0.00';
  return amount.toFixed(2);
};

/**
 * Format money with currency symbol
 * @param amount - The amount to format
 * @param currency - Currency code (default: GBP)
 * @returns Formatted string like "£1,234.56"
 */
export const formatMoneyWithSymbol = (amount: number, currency: string = 'GBP'): string => {
  if (!Number.isFinite(amount)) return '£0.00';

  const symbol = getCurrencySymbol(currency);
  return `${symbol}${formatMoney(amount, currency)}`;
};

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    CHF: 'CHF ',
    AUD: 'A$',
    CAD: 'C$'
  };
  return symbols[currency?.toUpperCase()] || currency + ' ';
};

/**
 * Format date in UK format (e.g., "1 January 2025")
 * @param date - ISO date string or Date object
 * @returns Formatted date string
 */
export const formatDateUK = (date: string | Date): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

/**
 * Check if a date value is valid
 * @param date - Date string or Date object to validate
 * @returns true if the date is valid
 */
export const isValidDate = (date: string | Date | undefined | null): boolean => {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
};

/**
 * Safe date formatter with customizable fallback
 * Use this for UI display to avoid showing "Invalid Date"
 *
 * @param date - ISO date string or Date object
 * @param options - Formatting options
 * @returns Formatted date string or fallback
 */
export const safeFormatDate = (
  date: string | Date | undefined | null,
  options: {
    fallback?: string;
    format?: 'short' | 'long' | 'medium';
  } = {}
): string => {
  const { fallback = '', format = 'medium' } = options;

  if (!date) return fallback;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return fallback;

    // Format based on requested style
    switch (format) {
      case 'short':
        // "1 Jan 2025"
        return d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      case 'long':
        // "1 January 2025"
        return d.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      case 'medium':
      default:
        // "01/01/2025"
        return d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
    }
  } catch {
    return fallback;
  }
};

/**
 * Format date in short UK format (e.g., "01/01/2025")
 * @param date - ISO date string or Date object
 * @returns Formatted date string
 */
export const formatDateShort = (date: string | Date): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};

/**
 * Format date in ISO format (YYYY-MM-DD) using local timezone
 * @param date - Date string or Date object
 * @returns ISO formatted date string
 */
export const formatDateISO = (date: string | Date): string => {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    // Use local timezone instead of UTC to avoid off-by-one errors
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

/**
 * Format date for PDF form fields (separate day/month/year)
 * @param date - ISO date string or Date object
 * @returns Object with day, month, year strings
 */
export const formatDateForForm = (date: string | Date): { day: string; month: string; year: string } => {
  if (!date) return { day: '', month: '', year: '' };

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return { day: '', month: '', year: '' };

    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: (d.getMonth() + 1).toString().padStart(2, '0'),
      year: d.getFullYear().toString()
    };
  } catch {
    return { day: '', month: '', year: '' };
  }
};

/**
 * Get today's date in UK format
 */
export const getTodayUK = (): string => {
  return formatDateUK(new Date());
};

/**
 * Get today's date in ISO format
 */
export const getTodayISO = (): string => {
  return formatDateISO(new Date());
};

/**
 * Format a UK postcode with proper spacing
 * @param postcode - Postcode string
 * @returns Formatted postcode (e.g., "SW1A 1AA")
 */
export const formatPostcode = (postcode: string): string => {
  if (!postcode) return '';

  const clean = postcode.replace(/\s/g, '').toUpperCase();
  if (clean.length >= 5) {
    return clean.slice(0, -3) + ' ' + clean.slice(-3);
  }
  return clean;
};

/**
 * Calculate days between two dates
 * @param startDate - Start date (earlier)
 * @param endDate - End date (later, defaults to today)
 * @returns Number of days between dates
 */
export const daysBetween = (startDate: string | Date, endDate: string | Date = new Date()): number => {
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

/**
 * Format a number as a percentage
 * @param value - The value (0-100 or 0-1)
 * @param isDecimal - Whether the value is in decimal form (0-1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, isDecimal: boolean = false): string => {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(2)}%`;
};

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncate = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Truncate text to a maximum word count
 * @param text - The text to truncate
 * @param maxWords - Maximum number of words
 * @returns Truncated text
 */
export const truncateWords = (text: string, maxWords: number): string => {
  if (!text) return '';
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

/**
 * Payment term type as defined in InvoiceData
 */
export type PaymentTermsType = 'net_7' | 'net_14' | 'net_30' | 'net_60' | 'net_90' | 'custom';

/**
 * Normalize payment terms from various formats to standard enum values
 * Handles common variations like "30 days", "Net 30", "1 month", etc.
 *
 * @param terms - Raw payment terms string from AI extraction
 * @returns Normalized payment terms enum value, or undefined if unrecognized
 */
export const normalizePaymentTerms = (terms: string | undefined | null): PaymentTermsType | undefined => {
  if (!terms || typeof terms !== 'string') return undefined;

  const normalized = terms.toLowerCase().trim();

  // Direct enum matches
  const directMatches: Record<string, PaymentTermsType> = {
    'net_7': 'net_7',
    'net_14': 'net_14',
    'net_30': 'net_30',
    'net_60': 'net_60',
    'net_90': 'net_90',
    'custom': 'custom'
  };

  if (directMatches[normalized]) {
    return directMatches[normalized];
  }

  // Common variations mapping
  const variations: Array<{ patterns: RegExp[]; value: PaymentTermsType }> = [
    {
      patterns: [
        /^7\s*days?$/,
        /^net\s*7$/i,
        /^1\s*week$/,
        /^one\s*week$/i,
        /^within\s*7\s*days?$/i
      ],
      value: 'net_7'
    },
    {
      patterns: [
        /^14\s*days?$/,
        /^net\s*14$/i,
        /^2\s*weeks?$/,
        /^two\s*weeks?$/i,
        /^within\s*14\s*days?$/i,
        /^fortnight$/i
      ],
      value: 'net_14'
    },
    {
      patterns: [
        /^30\s*days?$/,
        /^net\s*30$/i,
        /^1\s*month$/,
        /^one\s*month$/i,
        /^within\s*30\s*days?$/i,
        /^monthly$/i
      ],
      value: 'net_30'
    },
    {
      patterns: [
        /^60\s*days?$/,
        /^net\s*60$/i,
        /^2\s*months?$/,
        /^two\s*months?$/i,
        /^within\s*60\s*days?$/i
      ],
      value: 'net_60'
    },
    {
      patterns: [
        /^90\s*days?$/,
        /^net\s*90$/i,
        /^3\s*months?$/,
        /^three\s*months?$/i,
        /^within\s*90\s*days?$/i,
        /^quarterly$/i
      ],
      value: 'net_90'
    }
  ];

  for (const { patterns, value } of variations) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return value;
      }
    }
  }

  // If no match found but there's a value, mark as custom
  if (normalized.length > 0) {
    return 'custom';
  }

  return undefined;
};

/**
 * Convert payment terms enum to number of days
 * @param terms - Payment terms enum value
 * @returns Number of days, or 30 as default
 */
export const paymentTermsToDays = (terms: PaymentTermsType | undefined): number => {
  const mapping: Record<PaymentTermsType, number> = {
    'net_7': 7,
    'net_14': 14,
    'net_30': 30,
    'net_60': 60,
    'net_90': 90,
    'custom': 30 // Default to 30 for custom
  };
  return terms ? mapping[terms] : 30;
};

/**
 * Format payment terms for display
 * @param terms - Payment terms enum value
 * @returns Human-readable string
 */
export const formatPaymentTerms = (terms: PaymentTermsType | undefined): string => {
  const mapping: Record<PaymentTermsType, string> = {
    'net_7': 'Net 7 days',
    'net_14': 'Net 14 days',
    'net_30': 'Net 30 days',
    'net_60': 'Net 60 days',
    'net_90': 'Net 90 days',
    'custom': 'Custom terms'
  };
  return terms ? mapping[terms] : 'Not specified';
};

export default {
  formatMoney,
  formatMoneyForForm,
  formatMoneyWithSymbol,
  getCurrencySymbol,
  formatDateUK,
  formatDateShort,
  formatDateISO,
  formatDateForForm,
  getTodayUK,
  getTodayISO,
  formatPostcode,
  daysBetween,
  formatPercentage,
  truncate,
  truncateWords,
  isValidDate,
  safeFormatDate,
  normalizePaymentTerms,
  paymentTermsToDays,
  formatPaymentTerms
};
