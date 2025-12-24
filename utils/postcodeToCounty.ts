/**
 * UK Postcode to County Mapping
 *
 * Maps UK postcode prefixes to ceremonial/administrative counties.
 * Used as fallback when county is not extracted from documents.
 *
 * Note: This is not exhaustive - covers major urban areas.
 * For full coverage, consider using a postcode API.
 */

// Postcode prefix to county mapping
const POSTCODE_COUNTY_MAP: Record<string, string> = {
  // Greater London
  'E': 'Greater London',
  'EC': 'Greater London',
  'N': 'Greater London',
  'NW': 'Greater London',
  'SE': 'Greater London',
  'SW': 'Greater London',
  'W': 'Greater London',
  'WC': 'Greater London',
  'BR': 'Greater London',
  'CR': 'Greater London',
  'DA': 'Greater London',
  'EN': 'Greater London',
  'HA': 'Greater London',
  'IG': 'Greater London',
  'KT': 'Greater London',
  'RM': 'Greater London',
  'SM': 'Greater London',
  'TW': 'Greater London',
  'UB': 'Greater London',
  'WD': 'Greater London',

  // West Midlands
  'B': 'West Midlands',
  'CV': 'West Midlands',
  'DY': 'West Midlands',
  'WS': 'West Midlands',
  'WV': 'West Midlands',

  // Greater Manchester
  'M': 'Greater Manchester',
  'BL': 'Greater Manchester',
  'OL': 'Greater Manchester',
  'SK': 'Greater Manchester',
  'WN': 'Greater Manchester',

  // West Yorkshire
  'BD': 'West Yorkshire',
  'HD': 'West Yorkshire',
  'HX': 'West Yorkshire',
  'LS': 'West Yorkshire',
  'WF': 'West Yorkshire',

  // South Yorkshire
  'DN': 'South Yorkshire',
  'S': 'South Yorkshire',

  // Merseyside
  'L': 'Merseyside',
  'CH': 'Merseyside',
  'PR': 'Lancashire',

  // Tyne and Wear
  'NE': 'Tyne and Wear',
  'SR': 'Tyne and Wear',
  'DH': 'County Durham',

  // Scotland
  'AB': 'Aberdeenshire',
  'DD': 'Angus',
  'DG': 'Dumfries and Galloway',
  'EH': 'City of Edinburgh',
  'FK': 'Stirlingshire',
  'G': 'Glasgow',
  'IV': 'Highland',
  'KA': 'Ayrshire',
  'KY': 'Fife',
  'ML': 'Lanarkshire',
  'PA': 'Renfrewshire',
  'PH': 'Perth and Kinross',
  'TD': 'Scottish Borders',

  // Wales
  'CF': 'South Glamorgan',
  'LL': 'Gwynedd',
  'NP': 'Gwent',
  'SA': 'West Glamorgan',
  'SY': 'Powys',

  // Northern Ireland
  'BT': 'Northern Ireland',

  // Other major areas
  'AL': 'Hertfordshire',
  'BA': 'Somerset',
  'BB': 'Lancashire',
  'BH': 'Dorset',
  'BN': 'East Sussex',
  'BS': 'Bristol',
  'CA': 'Cumbria',
  'CB': 'Cambridgeshire',
  'CM': 'Essex',
  'CO': 'Essex',
  'CT': 'Kent',
  'CW': 'Cheshire',
  'DE': 'Derbyshire',
  'DL': 'County Durham',
  'DT': 'Dorset',
  'EX': 'Devon',
  'GL': 'Gloucestershire',
  'GU': 'Surrey',
  'HG': 'North Yorkshire',
  'HP': 'Buckinghamshire',
  'HR': 'Herefordshire',
  'HU': 'East Riding of Yorkshire',
  'IP': 'Suffolk',
  'LA': 'Cumbria',
  'LE': 'Leicestershire',
  'LN': 'Lincolnshire',
  'LU': 'Bedfordshire',
  'ME': 'Kent',
  'MK': 'Buckinghamshire',
  'NG': 'Nottinghamshire',
  'NN': 'Northamptonshire',
  'NR': 'Norfolk',
  'OX': 'Oxfordshire',
  'PE': 'Cambridgeshire',
  'PL': 'Devon',
  'PO': 'Hampshire',
  'RG': 'Berkshire',
  'RH': 'Surrey',
  'SG': 'Hertfordshire',
  'SL': 'Berkshire',
  'SN': 'Wiltshire',
  'SO': 'Hampshire',
  'SP': 'Wiltshire',
  'SS': 'Essex',
  'ST': 'Staffordshire',
  'TA': 'Somerset',
  'TF': 'Shropshire',
  'TN': 'Kent',
  'TQ': 'Devon',
  'TR': 'Cornwall',
  'TS': 'North Yorkshire',
  'WA': 'Cheshire',
  'WR': 'Worcestershire',
  'YO': 'North Yorkshire',
};

/**
 * Get county from UK postcode
 *
 * @param postcode - UK postcode (e.g., "SW1A 1AA" or "SW1A1AA")
 * @returns County name or null if not found
 */
export const postcodeToCounty = (postcode: string): string | null => {
  if (!postcode) return null;

  // Normalize: remove spaces, convert to uppercase
  const normalized = postcode.replace(/\s/g, '').toUpperCase();

  // Extract outward code (first part before numbers start in middle)
  // E.g., "SW1A1AA" -> "SW", "M11AA" -> "M", "NW101AA" -> "NW"
  const outwardMatch = normalized.match(/^([A-Z]{1,2})/);
  if (!outwardMatch) return null;

  const prefix = outwardMatch[1];

  // Try exact match first (e.g., "NW", "SW", "EC")
  if (POSTCODE_COUNTY_MAP[prefix]) {
    return POSTCODE_COUNTY_MAP[prefix];
  }

  // Try single letter if two-letter prefix not found
  if (prefix.length === 2 && POSTCODE_COUNTY_MAP[prefix[0]]) {
    return POSTCODE_COUNTY_MAP[prefix[0]];
  }

  return null;
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
