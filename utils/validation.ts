/**
 * Validation Utilities for ClaimCraft UK
 *
 * Legal compliance and data quality checks for debt recovery claims
 */

/**
 * Validates UK postcode format
 *
 * Ensures postcode meets Royal Mail formatting standards.
 * Invalid postcodes can cause claims to be struck out due to improper service.
 *
 * Examples of valid postcodes:
 * - SW1A 1AA (with space)
 * - SW1A1AA (without space)
 * - M1 1AE
 * - B33 8TH
 * - CR2 6XH
 * - DN55 1PT
 *
 * @param postcode - The postcode to validate
 * @returns true if valid UK postcode format, false otherwise
 */
export const validateUKPostcode = (postcode: string): boolean => {
  if (!postcode || typeof postcode !== 'string') {
    return false;
  }

  // Remove all whitespace for consistent checking
  const cleaned = postcode.trim().replace(/\s+/g, '').toUpperCase();

  // Improved UK postcode regex pattern (more strict)
  // Formats: AA9A 9AA, A9A 9AA, A9 9AA, A99 9AA, AA9 9AA, AA99 9AA
  // Special cases: GIR 0AA, BFPO postcodes
  const ukPostcodeRegex = /^(GIR0AA|[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2})$/;

  return ukPostcodeRegex.test(cleaned);
};

/**
 * Formats UK postcode to standard format with space
 *
 * @param postcode - Raw postcode input
 * @returns Formatted postcode with proper spacing (e.g., "SW1A 1AA")
 */
export const formatUKPostcode = (postcode: string): string => {
  if (!postcode) return '';

  // Remove all whitespace
  const cleaned = postcode.trim().replace(/\s+/g, '').toUpperCase();

  if (!validateUKPostcode(cleaned)) {
    return postcode; // Return original if invalid
  }

  // Insert space before last 3 characters (outward code + space + inward code)
  const outward = cleaned.slice(0, -3);
  const inward = cleaned.slice(-3);

  return `${outward} ${inward}`;
};

/**
 * Validates allowed file types for evidence upload
 *
 * Only allows document and image formats that can be:
 * 1. Safely processed without security risks
 * 2. Analyzed by AI for automatic claim generation
 * 3. Submitted to courts as evidence
 *
 * @param file - File object from upload
 * @returns true if file type is allowed, false otherwise
 */
export const validateFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',                                                      // PDF documents
    'image/jpeg',                                                           // JPEG images
    'image/jpg',                                                            // JPG images
    'image/png',                                                            // PNG images
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword'                                                    // DOC (legacy)
  ];

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc'];

  // Check MIME type
  if (allowedTypes.includes(file.type)) {
    return true;
  }

  // Fallback: Check file extension (in case MIME type is missing/incorrect)
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Gets user-friendly error message for invalid file type
 *
 * @param file - File object that failed validation
 * @returns Error message explaining allowed types
 */
export const getFileTypeError = (file: File): string => {
  return `"${file.name}" is not an allowed file type. Please upload PDF, JPG, PNG, or Word documents only. These formats can be safely processed and submitted to the court.`;
};

/**
 * Validates email format
 *
 * @param email - Email address to validate
 * @returns true if valid email format, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates UK phone number format
 *
 * Accepts various formats:
 * - 020 7946 0958 (London)
 * - 0121 496 0000 (Birmingham)
 * - 07700 900123 (Mobile)
 * - +44 20 7946 0958 (International)
 *
 * @param phone - Phone number to validate
 * @returns true if valid UK phone format, false otherwise
 */
export const validateUKPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all spaces, hyphens, and brackets
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');

  // UK phone regex patterns
  // Matches: 07xxx xxxxxx, 01xx xxx xxxx, 02x xxxx xxxx, +447xxx xxxxxx, etc.
  const ukPhoneRegex = /^(\+44|0)[127]\d{9}$/;

  return ukPhoneRegex.test(cleaned);
};

/**
 * Validates that a date is not in the future
 *
 * Timeline events (invoices sent, chasers sent, etc.) must be historical.
 * Future dates indicate data entry errors.
 *
 * @param dateString - ISO date string or Date object
 * @returns true if date is today or in the past, false if in future
 */
export const validatePastDate = (dateString: string | Date): boolean => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString);

    // Check for invalid date
    if (isNaN(date.getTime())) {
      return false;
    }

    // Use UTC to avoid timezone issues
    const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const now = new Date();
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    return dateUTC <= todayUTC;
  } catch (error) {
    console.error('Error validating past date:', error);
    return false;
  }
};

/**
 * Validates date relationships (e.g., invoice date before due date)
 *
 * @param invoiceDate - ISO date string for invoice date
 * @param dueDate - ISO date string for due date
 * @returns object with isValid boolean and optional error message
 */
export const validateDateRelationship = (
  invoiceDate: string,
  dueDate: string
): { isValid: boolean; error?: string } => {
  try {
    if (!invoiceDate || !dueDate) {
      return { isValid: true }; // Empty fields handled by required validation
    }

    const invoice = new Date(invoiceDate);
    const due = new Date(dueDate);

    // Check for invalid dates
    if (isNaN(invoice.getTime()) || isNaN(due.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }

    // Invoice date must be before or equal to due date
    if (invoice.getTime() > due.getTime()) {
      return { isValid: false, error: 'Invoice date cannot be after due date' };
    }

    // Check if invoice is more than 6 years old (Limitation Act 1980)
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

    if (invoice.getTime() < sixYearsAgo.getTime()) {
      return { isValid: false, error: 'Invoice is more than 6 years old (statute-barred under Limitation Act 1980)' };
    }

    // Check if due date is in the future (unusual for debt claims)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due.getTime() > today.getTime()) {
      return { isValid: false, error: 'Due date is in the future - payment is not yet overdue' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating date relationship:', error);
    return { isValid: false, error: 'Failed to validate dates' };
  }
};

/**
 * Validates interest calculation against formula
 *
 * Formula: (principal × rate × days) / (365 × 100)
 * B2B: 12.75% per annum
 * B2C: 8% per annum
 *
 * @param principal - Invoice amount
 * @param rate - Interest rate percentage (e.g., 12.75 or 8)
 * @param daysOverdue - Number of days overdue
 * @param calculatedInterest - The interest amount to verify
 * @returns object with isValid boolean and optional error message
 */
export const validateInterestCalculation = (
  principal: number,
  rate: number,
  daysOverdue: number,
  calculatedInterest: number
): { isValid: boolean; error?: string; expectedInterest?: number } => {
  try {
    if (principal <= 0 || rate <= 0 || daysOverdue < 0) {
      return { isValid: true }; // Let other validation handle negative/zero values
    }

    // Calculate expected interest: (principal × rate × days) / (365 × 100)
    const expectedInterest = (principal * rate * daysOverdue) / (365 * 100);

    // Allow small rounding differences (within 1 penny)
    const difference = Math.abs(calculatedInterest - expectedInterest);

    if (difference > 0.01) {
      return {
        isValid: false,
        error: `Interest calculation incorrect. Expected £${expectedInterest.toFixed(2)} but got £${calculatedInterest.toFixed(2)}`,
        expectedInterest: expectedInterest
      };
    }

    return { isValid: true, expectedInterest: expectedInterest };
  } catch (error) {
    console.error('Error validating interest calculation:', error);
    return { isValid: false, error: 'Failed to validate interest calculation' };
  }
};

/**
 * Validates invoice number is not already used in existing claims
 *
 * Prevents duplicate claims for the same invoice which could:
 * 1. Waste court fees
 * 2. Confuse court administration
 * 3. Constitute abuse of process
 *
 * Note: This function needs to be called from a component with access to storageService
 *
 * @param invoiceNumber - Invoice number to check
 * @param currentClaimId - ID of current claim (to exclude from duplicate check)
 * @param existingClaims - Array of existing claims from IndexedDB
 * @returns true if invoice is unique, false if already used
 */
export const validateUniqueInvoice = (
  invoiceNumber: string,
  currentClaimId: string | null,
  existingClaims: any[]
): boolean => {
  if (!invoiceNumber || !invoiceNumber.trim()) {
    return true; // Empty invoice number is handled by other validation
  }

  try {
    // Check if invoice number already exists in other claims
    const duplicate = existingClaims.some((claim: any) =>
      claim.id !== currentClaimId && // Exclude current claim
      claim.invoice?.invoiceNumber?.trim().toLowerCase() === invoiceNumber.trim().toLowerCase()
    );

    return !duplicate;
  } catch (error) {
    console.error('Error checking invoice uniqueness:', error);
    // Fail safe: return false (duplicate) to prevent potential duplicate filing
    return false;
  }
};

/**
 * Import Validation Result
 */
export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates claim data from imports (CSV, Xero, AI extraction)
 *
 * Ensures imported data meets minimum requirements before being added to the system.
 * This provides consistent validation regardless of the data source.
 *
 * @param claim - Partial claim data from import source
 * @returns Validation result with errors and warnings
 */
export const validateImportedClaim = (claim: {
  defendant?: { name?: string; postcode?: string };
  claimant?: { name?: string; postcode?: string };
  invoice?: { totalAmount?: number; invoiceNumber?: string; dateIssued?: string; dueDate?: string };
}): ImportValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: Defendant name
  if (!claim.defendant?.name || !claim.defendant.name.trim()) {
    errors.push('Defendant name is required');
  }

  // Required: Invoice amount
  if (!claim.invoice?.totalAmount || claim.invoice.totalAmount <= 0) {
    errors.push('Valid invoice amount is required (must be greater than 0)');
  }

  // Warning: Missing claimant name (can be filled later)
  if (!claim.claimant?.name || !claim.claimant.name.trim()) {
    warnings.push('Claimant name is missing - you will need to provide this');
  }

  // Warning: Defendant postcode validation
  if (claim.defendant?.postcode && !validateUKPostcode(claim.defendant.postcode)) {
    warnings.push('Defendant postcode may be invalid or incorrectly formatted');
  }

  // Warning: Claimant postcode validation
  if (claim.claimant?.postcode && !validateUKPostcode(claim.claimant.postcode)) {
    warnings.push('Claimant postcode may be invalid or incorrectly formatted');
  }

  // Warning: Invoice number missing
  if (!claim.invoice?.invoiceNumber || !claim.invoice.invoiceNumber.trim()) {
    warnings.push('Invoice number is missing - you should add this for reference');
  }

  // Date validation
  if (claim.invoice?.dateIssued && claim.invoice?.dueDate) {
    const dateResult = validateDateRelationship(
      claim.invoice.dateIssued,
      claim.invoice.dueDate
    );
    if (!dateResult.isValid) {
      // Date issues are errors, not warnings, as they affect legal viability
      errors.push(dateResult.error || 'Invalid date relationship');
    }
  } else if (claim.invoice?.dateIssued) {
    // Check if invoice date is in the future
    const invoiceDate = new Date(claim.invoice.dateIssued);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (invoiceDate > today) {
      warnings.push('Invoice date appears to be in the future');
    }

    // Check for statute of limitations
    const sixYearsAgo = new Date();
    sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
    if (invoiceDate < sixYearsAgo) {
      warnings.push('Invoice is more than 6 years old - may be statute-barred');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validates a UK company number format
 *
 * UK company numbers:
 * - Are exactly 8 characters (or 6-7 with leading zeros implied)
 * - Can start with 2-letter prefixes for Scottish (SC), Northern Irish (NI), etc.
 * - The numeric portion should be valid
 *
 * @param companyNumber - The company number to validate
 * @returns true if valid format, false otherwise
 */
export const validateCompanyNumber = (companyNumber: string): boolean => {
  if (!companyNumber || typeof companyNumber !== 'string') {
    return false;
  }

  const cleaned = companyNumber.trim().toUpperCase();

  // Empty is valid (company number is optional for some party types)
  if (cleaned.length === 0) {
    return true;
  }

  // UK company number regex pattern
  // Prefixes: SC (Scotland), NI (Northern Ireland), NP, NC, NF, LP, SL, OC, SO, SF, R0-R9, AC, ZC, RC, IC, IP, SP, RS
  // Followed by 6-8 digits
  const ukCompanyNumberRegex = /^(SC|NI|NP|NC|NF|LP|SL|OC|SO|SF|R[0-9]|AC|ZC|RC|IC|IP|SP|RS)?[0-9]{6,8}$/i;

  return ukCompanyNumberRegex.test(cleaned);
};
