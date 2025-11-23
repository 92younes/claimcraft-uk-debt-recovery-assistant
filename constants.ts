
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