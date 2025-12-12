
export const UK_COUNTIES = [
  // England
  "Avon", "Bedfordshire", "Berkshire", "Buckinghamshire", "Cambridgeshire", "Cheshire",
  "Cleveland", "Cornwall", "Cumbria", "Derbyshire", "Devon", "Dorset", "Durham",
  "East Sussex", "East Yorkshire", "Essex", "Gloucestershire", "Greater London", "Greater Manchester",
  "Hampshire", "Herefordshire", "Hertfordshire", "Isle of Wight", "Kent", "Lancashire",
  "Leicestershire", "Lincolnshire", "Merseyside", "Norfolk", "North Yorkshire",
  "Northamptonshire", "Northumberland", "Nottinghamshire", "Oxfordshire", "Shropshire",
  "Somerset", "South Yorkshire", "Staffordshire", "Suffolk", "Surrey", "Tyne and Wear",
  "Warwickshire", "West Midlands", "West Sussex", "West Yorkshire", "Wiltshire", "Worcestershire",
  // Scotland
  "Aberdeenshire", "Angus", "Ayrshire", "City of Edinburgh", "City of Glasgow",
  "Dumfries and Galloway", "Fife", "Highland", "Perth and Kinross", "Renfrewshire",
  "Scottish Borders", "Shetland Islands", "South Lanarkshire", "Stirling",
  // Wales
  "Gwent", "Gwynedd", "Powys", "South Glamorgan", "West Glamorgan",
  // Northern Ireland
  "County Antrim"
];

// Bank of England base rate - LAST UPDATED: January 2025
// Check https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate for current rate
export const BOE_BASE_RATE = 4.75;
export const BOE_RATE_LAST_UPDATED = '2025-01-01';

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
  'DH': 'Durham', 'DL': 'Durham', 'NE': 'Tyne and Wear', 'SR': 'Tyne and Wear',
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

// ==========================================
// Onboarding Constants
// ==========================================

export const BUSINESS_TYPES = [
  { value: 'Sole trader', label: 'Sole trader', description: 'A self-employed individual running their own business' },
  { value: 'Limited company', label: 'Limited company', description: 'Registered limited company (Ltd or PLC)' },
  { value: 'Limited Liability Partnership', label: 'Limited Liability Partnership', description: 'Registered limited liability partnership (LLP)' },
  { value: 'Partnership', label: 'Partnership', description: 'Unincorporated business or partnership' },
  { value: 'Other', label: 'Other', description: 'Other business structure' }
];

export const REFERRAL_SOURCES = [
  { value: 'search_engine', label: 'Search Engine (Google, Bing)' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'professional_referral', label: 'Professional Referral (Accountant, Solicitor)' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'other', label: 'Other' }
];

export const ONBOARDING_STEPS = [
  {
    id: 1,
    key: 'account' as const,
    title: 'Account type',
    description: 'Choose your account type',
    estimatedTime: '~1 minute',
    icon: 'User'
  },
  {
    id: 2,
    key: 'business' as const,
    title: 'Business details',
    description: 'Tell us about your business',
    estimatedTime: '~2 minutes',
    icon: 'Building2'
  },
  {
    id: 3,
    key: 'address' as const,
    title: 'Address',
    description: 'Where is your office located',
    estimatedTime: '~30 seconds',
    icon: 'MapPin'
  },
  {
    id: 4,
    key: 'declarations' as const,
    title: 'Declarations',
    description: 'Provide your declarations',
    estimatedTime: '~10 seconds',
    icon: 'FileCheck'
  },
  {
    id: 5,
    key: 'verification' as const,
    title: 'Identity verification',
    description: 'Verify your identity',
    estimatedTime: '~4 minutes',
    icon: 'ShieldCheck'
  }
];

// ==========================================
// UK Legal Deadline Constants
// ==========================================

/**
 * UK Legal Deadline Rules
 * Based on Pre-Action Protocol for Debt Claims and Civil Procedure Rules
 */
export const UK_LEGAL_DEADLINES = {
  // Pre-Action Protocol for Debt Claims
  LBA_RESPONSE_PERIOD: 14,              // Minimum 14 days response time for business
  LBA_RESPONSE_PERIOD_CONSUMER: 30,     // Up to 30 days for consumers

  // Court Proceedings (CPR)
  ACKNOWLEDGMENT_PERIOD: 14,            // Days to acknowledge service
  DEFENCE_PERIOD_AFTER_ACK: 14,         // Additional days after acknowledgment
  DEFENCE_PERIOD_TOTAL: 28,             // Total days to file defence without ack
  JUDGMENT_APPLICATION_WINDOW: 14,      // Days after default to apply for judgment

  // Enforcement
  ENFORCEMENT_WAIT_AFTER_JUDGMENT: 14,  // Days to wait before enforcement

  // Statutory Limits
  LIMITATION_PERIOD_YEARS: 6,           // Limitation Act 1980
};

/**
 * Deadline Priority Colors for UI
 * Matches Tailwind CSS classes
 */
export const DEADLINE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  low: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-400' },
};

/**
 * Default reminder intervals (days before deadline)
 */
export const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0];

/**
 * Deadline type labels for UI display
 */
export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  lba_response: 'LBA Response Period',
  court_filing: 'Court Filing Deadline',
  defendant_response: 'Defendant Response',
  acknowledgment: 'Acknowledgment of Service',
  defence_deadline: 'Defence Filing Deadline',
  judgment_deadline: 'Judgment Application',
  enforcement: 'Enforcement Action',
  custom: 'Custom Deadline',
};