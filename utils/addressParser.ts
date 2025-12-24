/**
 * Address parsing utility for splitting UK addresses into component fields
 */

/**
 * Parse a full UK address string into structured components
 * @param fullAddress - Complete address string (e.g., "10 Downing Street, London, SW1A 1AA")
 * @returns Structured address with separate fields
 */
export function parseUKAddress(fullAddress: string): {
  address: string;
  city: string;
  postcode: string;
} {
  if (!fullAddress || !fullAddress.trim()) {
    return { address: '', city: '', postcode: '' };
  }

  // Clean the input
  const cleaned = fullAddress.trim();

  // UK postcode regex pattern - matches standard UK postcodes at end of string
  const postcodePattern = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\s*$/i;
  const postcodeMatch = cleaned.match(postcodePattern);

  let postcode = '';
  let remaining = cleaned;

  // Extract postcode if found
  if (postcodeMatch) {
    postcode = postcodeMatch[1].toUpperCase();
    remaining = cleaned.substring(0, postcodeMatch.index).trim();
  }

  // Split remaining by comma to separate street address and city
  const parts = remaining.split(/,\s*/);

  let address = '';
  let city = '';

  if (parts.length === 0) {
    // No commas, treat entire string as address
    address = remaining;
  } else if (parts.length === 1) {
    // Single part - could be just address or address+city without comma
    address = parts[0];
  } else if (parts.length === 2) {
    // Two parts: street address, city
    address = parts[0];
    city = parts[1];
  } else {
    // Three or more parts: combine first parts as address, last part as city
    city = parts[parts.length - 1];
    address = parts.slice(0, parts.length - 1).join(', ');
  }

  return {
    address: address.trim(),
    city: city.trim(),
    postcode: postcode.trim()
  };
}

/**
 * Check if a string contains a full address (has multiple components)
 * @param input - String to check
 * @returns True if it appears to be a full address
 */
export function isFullAddress(input: string): boolean {
  if (!input) return false;

  // Check for UK postcode pattern
  const hasPostcode = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i.test(input);

  // Check for commas (common in full addresses)
  const hasCommas = input.includes(',');

  // If it has both postcode and commas, likely a full address
  if (hasPostcode && hasCommas) return true;

  // If it has 3+ commas, probably a full address even without postcode
  if ((input.match(/,/g) || []).length >= 2) return true;

  return false;
}

/**
 * Auto-clean and parse address fields from a Party object
 * If the address field contains a full address, split it appropriately
 */
export function cleanPartyAddress(party: {
  address?: string;
  city?: string;
  postcode?: string;
}): {
  address: string;
  city: string;
  postcode: string;
} {
  const { address = '', city = '', postcode = '' } = party;

  // If address field looks like a full address, parse it
  if (isFullAddress(address)) {
    const parsed = parseUKAddress(address);

    // Merge with existing city/postcode if they weren't in the address string
    return {
      address: parsed.address || address,
      city: parsed.city || city,
      postcode: parsed.postcode || postcode
    };
  }

  // Otherwise, return as-is
  return {
    address: address.trim(),
    city: city.trim(),
    postcode: postcode.trim()
  };
}
