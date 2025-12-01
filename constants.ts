
export const UK_COUNTIES = [
  "Avon", "Bedfordshire", "Berkshire", "Buckinghamshire", "Cambridgeshire", "Cheshire", 
  "Cleveland", "Cornwall", "Cumbria", "Derbyshire", "Devon", "Dorset", "Durham", 
  "East Sussex", "Essex", "Gloucestershire", "Greater London", "Greater Manchester", 
  "Hampshire", "Herefordshire", "Hertfordshire", "Isle of Wight", "Kent", "Lancashire", 
  "Leicestershire", "Lincolnshire", "Merseyside", "Norfolk", "North Yorkshire", 
  "Northamptonshire", "Northumberland", "Nottinghamshire", "Oxfordshire", "Shropshire", 
  "Somerset", "South Yorkshire", "Staffordshire", "Suffolk", "Surrey", "Tyne and Wear", 
  "Warwickshire", "West Midlands", "West Sussex", "West Yorkshire", "Wiltshire", "Worcestershire"
];

// Bank of England base rate (as of Jan 2025)
export const BOE_BASE_RATE = 4.75;

// Late Payment of Commercial Debts (Interest) Act 1998
// Statutory rate = BoE base rate + 8%
export const STATUTORY_INTEREST_ADDITION = 8.0;
export const LATE_PAYMENT_ACT_RATE = BOE_BASE_RATE + STATUTORY_INTEREST_ADDITION; // 12.75%

export const DAILY_INTEREST_DIVISOR = 365;

// Default payment terms (days)
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/**
 * UK Postcode to County/Region Mapping
 * Maps postcode area prefixes to their ceremonial/administrative counties
 * Used when Xero/Accounting data doesn't include county information
 */
export const POSTCODE_COUNTY_MAP: Record<string, string> = {
  // Greater London
  'E': 'Greater London', 'EC': 'Greater London', 'N': 'Greater London', 'NW': 'Greater London',
  'SE': 'Greater London', 'SW': 'Greater London', 'W': 'Greater London', 'WC': 'Greater London',

  // South East
  'BN': 'East Sussex', 'BR': 'Greater London', 'CR': 'Greater London', 'CT': 'Kent',
  'DA': 'Kent', 'EN': 'Hertfordshire', 'GU': 'Surrey', 'HA': 'Greater London',
  'HP': 'Buckinghamshire', 'IG': 'Greater London', 'KT': 'Surrey', 'LU': 'Bedfordshire',
  'ME': 'Kent', 'MK': 'Buckinghamshire', 'OX': 'Oxfordshire', 'PO': 'Hampshire',
  'RG': 'Berkshire', 'RH': 'Surrey', 'RM': 'Greater London', 'SG': 'Hertfordshire',
  'SL': 'Berkshire', 'SM': 'Greater London', 'SO': 'Hampshire', 'SS': 'Essex',
  'TN': 'Kent', 'TW': 'Greater London', 'UB': 'Greater London', 'WD': 'Hertfordshire',

  // South West
  'BA': 'Somerset', 'BH': 'Dorset', 'BS': 'Avon', 'DT': 'Dorset', 'EX': 'Devon',
  'GL': 'Gloucestershire', 'PL': 'Devon', 'SN': 'Wiltshire', 'SP': 'Wiltshire',
  'TA': 'Somerset', 'TQ': 'Devon', 'TR': 'Cornwall',

  // West Midlands
  'B': 'West Midlands', 'CV': 'West Midlands', 'DY': 'West Midlands', 'HR': 'Herefordshire',
  'ST': 'Staffordshire', 'TF': 'Shropshire', 'WR': 'Worcestershire', 'WS': 'West Midlands',
  'WV': 'West Midlands',

  // East Midlands
  'DE': 'Derbyshire', 'DN': 'South Yorkshire', 'LE': 'Leicestershire', 'LN': 'Lincolnshire',
  'NG': 'Nottinghamshire', 'NN': 'Northamptonshire', 'PE': 'Cambridgeshire',

  // East of England
  'AL': 'Hertfordshire', 'CB': 'Cambridgeshire', 'CM': 'Essex', 'CO': 'Essex',
  'IP': 'Suffolk', 'NR': 'Norfolk',

  // Yorkshire & Humber
  'BD': 'West Yorkshire', 'HD': 'West Yorkshire', 'HG': 'North Yorkshire', 'HU': 'East Yorkshire',
  'HX': 'West Yorkshire', 'LS': 'West Yorkshire', 'S': 'South Yorkshire', 'WF': 'West Yorkshire',
  'YO': 'North Yorkshire',

  // North West
  'BB': 'Lancashire', 'BL': 'Greater Manchester', 'CA': 'Cumbria', 'CH': 'Cheshire',
  'CW': 'Cheshire', 'FY': 'Lancashire', 'L': 'Merseyside', 'LA': 'Cumbria',
  'M': 'Greater Manchester', 'OL': 'Greater Manchester', 'PR': 'Lancashire',
  'SK': 'Cheshire', 'WA': 'Cheshire', 'WN': 'Greater Manchester',

  // North East
  'DH': 'County Durham', 'DL': 'County Durham', 'NE': 'Tyne and Wear', 'SR': 'Tyne and Wear',
  'TS': 'Cleveland',

  // Wales (use region names)
  'CF': 'South Glamorgan', 'LD': 'Powys', 'LL': 'Gwynedd', 'NP': 'Gwent',
  'SA': 'West Glamorgan', 'SY': 'Powys',

  // Scotland (use council areas)
  'AB': 'Aberdeenshire', 'DD': 'Angus', 'DG': 'Dumfries and Galloway',
  'EH': 'City of Edinburgh', 'FK': 'Stirling', 'G': 'City of Glasgow',
  'IV': 'Highland', 'KA': 'Ayrshire', 'KW': 'Highland', 'KY': 'Fife',
  'ML': 'South Lanarkshire', 'PA': 'Renfrewshire', 'PH': 'Perth and Kinross',
  'TD': 'Scottish Borders', 'ZE': 'Shetland Islands',

  // Northern Ireland
  'BT': 'County Antrim'
};

/**
 * Get county from UK postcode
 * @param postcode - UK postcode (e.g., "SW1A 1AA", "M1 1AA")
 * @returns County name or empty string if not found
 */
export const getCountyFromPostcode = (postcode: string): string => {
  if (!postcode) return '';

  // Clean and uppercase
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, '');

  // Extract area code (1-2 letters at start)
  const match = clean.match(/^([A-Z]{1,2})/);
  if (!match) return '';

  const areaCode = match[1];

  // Try two-letter code first, then single letter
  if (areaCode.length === 2 && POSTCODE_COUNTY_MAP[areaCode]) {
    return POSTCODE_COUNTY_MAP[areaCode];
  }

  if (POSTCODE_COUNTY_MAP[areaCode[0]]) {
    return POSTCODE_COUNTY_MAP[areaCode[0]];
  }

  return '';
};