/**
 * Address Formatter Utility
 *
 * Robust address splitting and formatting for UK court forms.
 * Handles comma-separated, newline-separated, and addresses without delimiters.
 */

import { postcodeToCounty } from './postcodeToCounty';

export interface AddressLines {
  line1: string;      // Building/street
  line2: string;      // Additional info
  city: string;
  county: string;
  postcode: string;
}

export interface Party {
  name?: string;
  address?: string;
  city?: string;
  county?: string;
  postcode?: string;
}

/**
 * Normalize a UK postcode to standard format (e.g., "SW1A 1AA")
 */
export const normalizePostcode = (postcode: string): string => {
  if (!postcode) return '';
  const clean = postcode.replace(/\s/g, '').toUpperCase();
  if (clean.length >= 5) {
    return clean.slice(0, -3) + ' ' + clean.slice(-3);
  }
  return clean;
};

/**
 * Extract postcode from an address string
 */
export const extractPostcode = (address: string): string | null => {
  if (!address) return null;
  // UK postcode regex (handles common formats)
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const match = address.match(postcodeRegex);
  return match ? normalizePostcode(match[1]) : null;
};

/**
 * Smart address splitter that handles multiple formats
 *
 * Strategies:
 * 1. If address contains newlines, split by newlines
 * 2. If address contains commas, split by commas
 * 3. Otherwise, use postcode detection to separate
 */
export const splitAddress = (
  fullAddress: string,
  knownPostcode?: string,
  knownCity?: string,
  knownCounty?: string
): AddressLines => {
  if (!fullAddress) {
    return {
      line1: '',
      line2: '',
      city: knownCity || '',
      county: knownCounty || '',
      postcode: knownPostcode || ''
    };
  }

  // Normalize the address
  const normalized = fullAddress.trim();

  // Extract postcode if not provided
  const postcode = knownPostcode || extractPostcode(normalized) || '';

  // Remove postcode from address for easier parsing
  const addressWithoutPostcode = postcode
    ? normalized.replace(new RegExp(postcode.replace(/\s/g, '\\s?'), 'i'), '').trim()
    : normalized;

  // Try to infer county from postcode if not provided
  let county = knownCounty || '';
  if (!county && postcode) {
    county = postcodeToCounty(postcode) || '';
  }

  let parts: string[] = [];

  // Strategy 1: Split by newlines
  if (addressWithoutPostcode.includes('\n')) {
    parts = addressWithoutPostcode.split('\n').map(p => p.trim()).filter(Boolean);
  }
  // Strategy 2: Split by commas
  else if (addressWithoutPostcode.includes(',')) {
    parts = addressWithoutPostcode.split(',').map(p => p.trim()).filter(Boolean);
  }
  // Strategy 3: No delimiter - treat as single line
  else {
    parts = [addressWithoutPostcode];
  }

  // Remove county from parts if it matches known county
  if (county) {
    parts = parts.filter(p => p.toLowerCase() !== county.toLowerCase());
  }

  // Last part is likely the city (if we have multiple parts)
  const city = knownCity || (parts.length > 1 ? parts.pop() || '' : '');

  // First part is line 1
  const line1 = parts.shift() || '';

  // Remaining parts are line 2
  const line2 = parts.join(', ');

  return {
    line1,
    line2,
    city,
    county,
    postcode
  };
};

/**
 * Format address for PDF form fields with character limits
 */
export const formatAddressForForm = (
  address: AddressLines,
  options: { maxCharsPerLine?: number } = {}
): string[] => {
  const maxChars = options.maxCharsPerLine || 50;
  const lines: string[] = [];

  if (address.line1) {
    lines.push(address.line1.substring(0, maxChars));
  }
  if (address.line2) {
    lines.push(address.line2.substring(0, maxChars));
  }
  if (address.city) {
    lines.push(address.city.substring(0, maxChars));
  }
  if (address.county) {
    lines.push(address.county.substring(0, maxChars));
  }
  if (address.postcode) {
    lines.push(normalizePostcode(address.postcode));
  }

  return lines;
};

/**
 * Format a Party object into a multi-line address block
 * Used for N1 form Text21/Text22 fields
 */
export const formatPartyBlock = (party: Party): string => {
  const parts: string[] = [];

  if (party.name) parts.push(party.name);
  if (party.address) parts.push(party.address);
  if (party.city) parts.push(party.city);
  if (party.county) parts.push(party.county);
  if (party.postcode) parts.push(normalizePostcode(party.postcode));

  return parts.join('\n');
};

/**
 * Format address as a single line (for letters)
 */
export const formatAddressInline = (party: Party): string => {
  const parts: string[] = [];

  if (party.address) parts.push(party.address);
  if (party.city) parts.push(party.city);
  if (party.county) parts.push(party.county);
  if (party.postcode) parts.push(normalizePostcode(party.postcode));

  return parts.join(', ');
};

/**
 * Ensure address has county (infer from postcode if missing)
 */
export const ensureCounty = (party: Party): Party => {
  if (party.county?.trim()) return party;

  const postcode = party.postcode;
  if (!postcode) return party;

  const inferredCounty = postcodeToCounty(postcode);
  if (inferredCounty) {
    return { ...party, county: inferredCounty };
  }

  return party;
};

export default {
  splitAddress,
  formatAddressForForm,
  formatPartyBlock,
  formatAddressInline,
  normalizePostcode,
  extractPostcode,
  ensureCounty
};
