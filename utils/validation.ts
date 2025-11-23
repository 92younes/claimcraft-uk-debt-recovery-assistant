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
  const cleaned = postcode.trim().replace(/\s+/g, '');

  // UK postcode regex pattern
  // Format: A(A)N(A/N) NAA
  // Where A = Letter, N = Number
  const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i;

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
 * Validates that a date is not in the future
 *
 * Timeline events (invoices sent, chasers sent, etc.) must be historical.
 * Future dates indicate data entry errors.
 *
 * @param dateString - ISO date string or Date object
 * @returns true if date is today or in the past, false if in future
 */
export const validatePastDate = (dateString: string | Date): boolean => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const today = new Date();

  // Set to start of day for fair comparison
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date <= today;
};

/**
 * Validates invoice number is not already used in existing claims
 *
 * Prevents duplicate claims for the same invoice which could:
 * 1. Waste court fees
 * 2. Confuse court administration
 * 3. Constitute abuse of process
 *
 * @param invoiceNumber - Invoice number to check
 * @returns true if invoice is unique, false if already used
 */
export const validateUniqueInvoice = async (invoiceNumber: string): Promise<boolean> => {
  if (!invoiceNumber) return true;

  try {
    // Check localStorage for saved claims
    const savedClaimsStr = localStorage.getItem('claimcraft_saved_claims');
    if (!savedClaimsStr) return true;

    const savedClaims = JSON.parse(savedClaimsStr);

    // Check if invoice number already exists
    const duplicate = savedClaims.some((claim: any) =>
      claim.invoice?.invoiceNumber === invoiceNumber
    );

    return !duplicate;
  } catch (error) {
    console.error('Error checking invoice uniqueness:', error);
    return true; // Allow if check fails
  }
};
