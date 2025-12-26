/**
 * UK Postcode to County Mapping
 *
 * This module provides postcode-to-county lookup functionality.
 * Uses the centralized POSTCODE_COUNTY_MAP from constants.ts as the single source of truth.
 *
 * Note: For full coverage, consider using a postcode API.
 */

import { getCountyFromPostcode } from '../constants';

/**
 * Get county from UK postcode
 *
 * @param postcode - UK postcode (e.g., "SW1A 1AA" or "SW1A1AA")
 * @returns County name or null if not found
 */
export const postcodeToCounty = (postcode: string): string | null => {
  const county = getCountyFromPostcode(postcode);
  return county || null;
};

/**
 * Validate UK postcode format
 *
 * @param postcode - Postcode to validate
 * @returns true if valid UK postcode format
 */
export const isValidUKPostcode = (postcode: string): boolean => {
  if (!postcode) return false;

  // UK postcode regex (handles most formats)
  const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
  return postcodeRegex.test(postcode.trim());
};

/**
 * Format postcode to standard UK format (with space)
 *
 * @param postcode - Postcode to format
 * @returns Formatted postcode or original if invalid
 */
export const formatPostcode = (postcode: string): string => {
  if (!postcode) return postcode;

  // Remove all spaces and uppercase
  const clean = postcode.replace(/\s/g, '').toUpperCase();

  // Insert space before last 3 characters
  if (clean.length >= 5) {
    return clean.slice(0, -3) + ' ' + clean.slice(-3);
  }

  return clean;
};
