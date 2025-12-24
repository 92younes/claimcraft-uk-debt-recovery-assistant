/**
 * Claim Validation Schemas
 *
 * Zod schemas for runtime validation of AI-extracted data.
 * Ensures data integrity before updating claim state.
 */

import { z } from 'zod';

/**
 * UK postcode regex pattern
 * Matches formats: SW1A 1AA, SW1A1AA, EC1A 1BB, etc.
 */
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;

/**
 * UK phone number pattern
 * Matches: 07xxx, 01xxx, 02xxx, +44xxx formats
 */
const UK_PHONE_REGEX = /^(\+44|0)[1-9]\d{8,10}$/;

/**
 * Party type enum values
 */
export const PartyTypeSchema = z.enum(['Individual', 'Business', 'Sole Trader']);

/**
 * Timeline event type enum
 */
export const TimelineEventTypeSchema = z.enum([
  'contract',
  'service_delivered',
  'invoice',
  'payment_due',
  'part_payment',
  'chaser',
  'lba_sent',
  'acknowledgment',
  'communication'
]);

/**
 * ISO date string schema (YYYY-MM-DD format)
 */
export const ISODateSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Allow empty for optional fields
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid date format. Expected ISO date string (YYYY-MM-DD).' }
);

/**
 * UK postcode schema with normalization
 */
export const PostcodeSchema = z.string().transform((val) => {
  if (!val) return val;
  // Normalize: remove extra spaces, uppercase
  const cleaned = val.replace(/\s+/g, ' ').trim().toUpperCase();
  // Add space if missing
  if (cleaned.length >= 5 && !cleaned.includes(' ')) {
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
  }
  return cleaned;
}).pipe(
  z.string().regex(UK_POSTCODE_REGEX, { message: 'Invalid UK postcode format' }).optional().or(z.literal(''))
);

/**
 * Email schema
 */
export const EmailSchema = z.string().email({ message: 'Invalid email address' }).optional().or(z.literal(''));

/**
 * Phone schema (UK format)
 */
export const PhoneSchema = z.string().transform((val) => {
  if (!val) return val;
  // Remove common formatting
  return val.replace(/[\s\-\(\)]/g, '');
}).pipe(
  z.string().regex(UK_PHONE_REGEX, { message: 'Invalid UK phone number' }).optional().or(z.literal(''))
);

/**
 * Money amount schema (positive number with 2 decimal places)
 */
export const MoneyAmountSchema = z.number()
  .nonnegative({ message: 'Amount must be non-negative' })
  .multipleOf(0.01, { message: 'Amount must have at most 2 decimal places' });

/**
 * Currency schema
 */
export const CurrencySchema = z.enum(['GBP', 'USD', 'EUR']).default('GBP');

/**
 * Company number schema (UK Companies House format)
 */
export const CompanyNumberSchema = z.string()
  .regex(/^[A-Z]{0,2}\d{6,8}$/i, { message: 'Invalid company number format' })
  .optional()
  .or(z.literal(''));

/**
 * UK sort code regex pattern (XX-XX-XX format)
 */
const UK_SORT_CODE_REGEX = /^\d{2}-\d{2}-\d{2}$/;

/**
 * UK bank account number regex pattern (8 digits)
 */
const UK_ACCOUNT_NUMBER_REGEX = /^\d{8}$/;

/**
 * Sort code schema with normalization
 * Accepts: 12-34-56, 123456, 12 34 56
 */
export const SortCodeSchema = z.string().transform((val) => {
  if (!val) return val;
  // Remove all non-digits
  const digits = val.replace(/\D/g, '');
  if (digits.length !== 6) return val; // Return as-is to trigger validation error
  // Format as XX-XX-XX
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}).pipe(
  z.string().regex(UK_SORT_CODE_REGEX, { message: 'Invalid UK sort code (format: XX-XX-XX)' }).optional().or(z.literal(''))
);

/**
 * Account number schema with validation
 */
export const AccountNumberSchema = z.string().transform((val) => {
  if (!val) return val;
  // Remove all non-digits
  return val.replace(/\D/g, '');
}).pipe(
  z.string().regex(UK_ACCOUNT_NUMBER_REGEX, { message: 'Invalid UK account number (must be 8 digits)' }).optional().or(z.literal(''))
);

/**
 * Payment details schema - for bank transfer information in documents
 */
export const PaymentDetailsSchema = z.object({
  bankAccountHolder: z.string().max(100).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  sortCode: SortCodeSchema.optional(),
  accountNumber: AccountNumberSchema.optional(),
  paymentReference: z.string().max(20).optional().or(z.literal(''))
}).strict();

/**
 * Party schema - validates claimant/defendant data
 */
export const PartySchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).max(200),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: PostcodeSchema.optional(),
  phone: PhoneSchema.optional(),
  email: EmailSchema.optional(),
  type: PartyTypeSchema.optional(),
  companyNumber: CompanyNumberSchema.optional()
}).strict();

/**
 * Partial party schema for incremental extraction
 */
export const PartialPartySchema = PartySchema.partial();

/**
 * Invoice data schema
 */
export const InvoiceSchema = z.object({
  invoiceNumber: z.string().max(100).optional(),
  dateIssued: ISODateSchema.optional(),
  dueDate: ISODateSchema.optional(),
  totalAmount: MoneyAmountSchema,
  currency: CurrencySchema.optional(),
  description: z.string().max(1000).optional()
}).strict();

/**
 * Partial invoice schema for incremental extraction
 */
export const PartialInvoiceSchema = InvoiceSchema.partial();

/**
 * Timeline event schema
 */
export const TimelineEventSchema = z.object({
  date: ISODateSchema,
  description: z.string().max(500),
  type: TimelineEventTypeSchema
}).strict();

/**
 * Array of timeline events
 */
export const TimelineSchema = z.array(TimelineEventSchema);

/**
 * Claim strength enum
 */
export const ClaimStrengthSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Claim strength assessment schema
 */
export const ClaimStrengthAssessmentSchema = z.object({
  strength: ClaimStrengthSchema,
  score: z.number().min(0).max(100),
  analysis: z.string().optional(),
  weaknesses: z.array(z.string()).optional()
}).strict();

/**
 * LBA status schema
 */
export const LbaStatusSchema = z.object({
  sent: z.boolean(),
  dateSent: ISODateSchema.optional(),
  responseReceived: z.boolean().optional(),
  responseDate: ISODateSchema.optional()
}).strict();

/**
 * Document type enum
 */
export const DocumentTypeSchema = z.enum([
  'Polite Payment Reminder',
  'Letter Before Action',
  'Form N1 (Claim Form)',
  'Form N225 (Default Judgment)',
  'Form N225A (Judgment - Admission)',
  'Response to Defence',
  'Form N180 (Directions Questionnaire)',
  'Part 36 Settlement Offer',
  'Installment Payment Agreement',
  'Trial Bundle',
  'Skeleton Argument'
]);

/**
 * Full claim data schema (for validation before state update)
 */
export const ClaimDataSchema = z.object({
  claimant: PartySchema.optional(),
  defendant: PartySchema.optional(),
  invoice: InvoiceSchema.optional(),
  timeline: TimelineSchema.optional(),
  claimStrength: ClaimStrengthAssessmentSchema.optional(),
  lbaStatus: LbaStatusSchema.optional(),
  selectedDocType: DocumentTypeSchema.optional()
}).strict();

/**
 * AI extraction result schema
 * More permissive than ClaimDataSchema - allows partial/uncertain data
 */
export const AIExtractionResultSchema = z.object({
  claimant: PartialPartySchema.optional(),
  defendant: PartialPartySchema.optional(),
  invoice: PartialInvoiceSchema.optional(),
  timeline: TimelineSchema.optional(),
  recommendedDocument: z.string().optional(),
  documentReason: z.string().optional(),
  lbaStatus: z.object({
    sent: z.boolean().optional(),
    dateSent: z.string().optional()
  }).optional(),
  // Meta fields
  confidence: z.number().min(0).max(100).optional(),
  missingFields: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional()
}).passthrough(); // Allow extra fields from AI

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodIssue[];
  warnings?: string[];
}

/**
 * Validate party data
 */
export const validateParty = (data: unknown): ValidationResult<z.infer<typeof PartySchema>> => {
  const result = PartySchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Validate invoice data
 */
export const validateInvoice = (data: unknown): ValidationResult<z.infer<typeof InvoiceSchema>> => {
  const result = InvoiceSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Validate timeline events
 */
export const validateTimeline = (data: unknown): ValidationResult<z.infer<typeof TimelineSchema>> => {
  const result = TimelineSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Validate payment details
 */
export const validatePaymentDetails = (data: unknown): ValidationResult<z.infer<typeof PaymentDetailsSchema>> => {
  const result = PaymentDetailsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Validate full claim data
 */
export const validateClaimData = (data: unknown): ValidationResult<z.infer<typeof ClaimDataSchema>> => {
  const result = ClaimDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Validate AI extraction result (more permissive)
 */
export const validateAIExtraction = (data: unknown): ValidationResult<z.infer<typeof AIExtractionResultSchema>> => {
  const result = AIExtractionResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
};

/**
 * Safe parse with default values
 * Returns validated data with defaults filled in, or null if invalid
 */
export const safeParseWithDefaults = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null => {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
};

/**
 * Coerce and validate - attempts to fix common issues
 */
export const coerceAndValidate = (data: unknown): ValidationResult<z.infer<typeof AIExtractionResultSchema>> => {
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      errors: [{
        code: 'invalid_type',
        expected: 'object',
        input: data,
        path: [],
        message: 'Expected object'
      } as z.ZodIssue]
    };
  }

  const warnings: string[] = [];
  const coerced = { ...data } as Record<string, unknown>;

  // Coerce invoice amount from string to number
  if (coerced.invoice && typeof coerced.invoice === 'object') {
    const invoice = coerced.invoice as Record<string, unknown>;
    if (typeof invoice.totalAmount === 'string') {
      const parsed = parseFloat(invoice.totalAmount.replace(/[£$€,]/g, ''));
      if (!isNaN(parsed)) {
        invoice.totalAmount = parsed;
        warnings.push('Converted invoice amount from string to number');
      }
    }
  }

  // Normalize dates
  const normalizeDates = (obj: Record<string, unknown>) => {
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase().includes('date') && typeof obj[key] === 'string') {
        const dateStr = obj[key] as string;
        // Try UK format first (DD/MM/YYYY)
        const ukMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if (ukMatch) {
          const [, day, month, year] = ukMatch;
          const fullYear = year.length === 2 ? `20${year}` : year;
          obj[key] = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          warnings.push(`Converted date ${dateStr} to ISO format`);
        }
      }
    }
  };

  if (coerced.invoice && typeof coerced.invoice === 'object') {
    normalizeDates(coerced.invoice as Record<string, unknown>);
  }

  const result = validateAIExtraction(coerced);
  if (result.success) {
    result.warnings = warnings;
  }
  return result;
};

export default {
  PartySchema,
  PartialPartySchema,
  InvoiceSchema,
  PartialInvoiceSchema,
  TimelineEventSchema,
  TimelineSchema,
  ClaimDataSchema,
  AIExtractionResultSchema,
  PaymentDetailsSchema,
  SortCodeSchema,
  AccountNumberSchema,
  validateParty,
  validateInvoice,
  validateTimeline,
  validatePaymentDetails,
  validateClaimData,
  validateAIExtraction,
  safeParseWithDefaults,
  coerceAndValidate
};
