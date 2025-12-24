/**
 * PDF Field Mapper Service
 *
 * Centralized field mappings for all court form PDFs.
 * Provides a single source of truth for mapping ClaimState to form fields.
 */

import { ClaimState, PartyType, DocumentType } from '../types';
import { splitAddress, formatPartyBlock, ensureCounty } from '../utils/addressFormatter';
import { formatMoney, formatMoneyForForm, formatDateForForm, getTodayISO } from '../utils/formatters';
import { isB2B, calculateCompensation, getInterestAct, getInterestRate } from '../utils/partyTypeUtils';

/**
 * Form field types
 */
export type FormType = 'N1' | 'N225' | 'N225A' | 'N180';

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  fieldId: string;
  getValue: (data: ClaimState) => string;
  maxLength?: number;
  required?: boolean;
  validate?: (value: string) => boolean;
}

/**
 * Checkbox mapping configuration
 */
export interface CheckboxMapping {
  fieldId: string;
  condition: (data: ClaimState) => boolean;
}

/**
 * Form mapping result
 */
export interface FormMappingResult {
  textFields: Record<string, string>;
  checkboxes: Record<string, boolean>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// ============================================================================
// UTILITY FUNCTIONS FOR FIELD VALUES
// ============================================================================

/**
 * Format claimant address block for N1 form
 */
const formatClaimantBlock = (data: ClaimState): string => {
  const party = ensureCounty(data.claimant);
  return formatPartyBlock(party);
};

/**
 * Format defendant address block for N1 form
 */
const formatDefendantBlock = (data: ClaimState): string => {
  const party = ensureCounty(data.defendant);
  return formatPartyBlock(party);
};

/**
 * Calculate total claim amount (principal + interest + compensation)
 */
const getTotalClaimAmount = (data: ClaimState): number => {
  return (data.invoice.totalAmount || 0) +
         (data.interest?.totalInterest || 0) +
         (data.compensation || 0);
};

/**
 * Calculate grand total including court fee
 */
const getGrandTotal = (data: ClaimState): number => {
  return getTotalClaimAmount(data) + (data.courtFee || 0);
};

/**
 * Get brief details for N1 form (Box 4)
 */
const getBriefDetails = (data: ClaimState): string => {
  if (data.generated?.briefDetails) {
    return data.generated.briefDetails;
  }

  const invoiceRef = data.invoice.invoiceNumber || 'unpaid invoice';
  const amount = formatMoney(data.invoice.totalAmount || 0);
  const b2b = isB2B(data.claimant.type, data.defendant.type);

  let details = `The Claimant claims £${amount} being the sum due under ${invoiceRef}.`;

  if (b2b && data.compensation && data.compensation > 0) {
    details += ` The Claimant also claims statutory compensation of £${formatMoney(data.compensation)} pursuant to the Late Payment of Commercial Debts (Interest) Act 1998.`;
  }

  if (data.interest?.totalInterest && data.interest.totalInterest > 0) {
    details += ` Interest of £${formatMoney(data.interest.totalInterest)} is claimed under ${getInterestAct(b2b)}.`;
  }

  return details;
};

/**
 * Get value statement for N1 form
 */
const getValueStatement = (data: ClaimState): string => {
  const total = getGrandTotal(data);
  return `The claimant expects to recover £${formatMoney(total)}`;
};

/**
 * Get address line 1 (building and street)
 */
const getAddressLine1 = (address: string | undefined): string => {
  if (!address) return '';
  const lines = splitAddress(address);
  return lines.line1;
};

/**
 * Get address line 2
 */
const getAddressLine2 = (address: string | undefined): string => {
  if (!address) return '';
  const lines = splitAddress(address);
  return lines.line2;
};

/**
 * Get preferred hearing centre
 */
const getPreferredCourt = (data: ClaimState): string => {
  if (data.claimant.city) {
    return `${data.claimant.city} County Court`;
  }
  return 'County Court Business Centre';
};

/**
 * Get today's date parts
 */
const getTodayParts = (): { day: string; month: string; year: string } => {
  return formatDateForForm(new Date());
};

/**
 * Get position/office held text for business claimants
 */
const getPositionHeld = (data: ClaimState): string => {
  if (data.claimant.type === PartyType.BUSINESS) {
    return 'Director / Authorised Signatory';
  }
  if (data.claimant.type === PartyType.SOLE_TRADER) {
    return 'Sole Trader / Owner';
  }
  return '';
};

// ============================================================================
// N1 FORM FIELD MAPPINGS
// ============================================================================

/**
 * N1 Form (Claim Form) text field mappings
 * Field IDs match actual AcroForm field names in N1.pdf
 */
export const N1_TEXT_MAPPINGS: FieldMapping[] = [
  // Page 1: Claim Form Header
  {
    fieldId: 'Text35',
    getValue: () => 'County Court Business Centre',
    maxLength: 50
  },
  {
    fieldId: 'Text21', // Claimant details box
    getValue: formatClaimantBlock,
    maxLength: 300,
    required: true
  },
  {
    fieldId: 'Text22', // Defendant details box
    getValue: formatDefendantBlock,
    maxLength: 300,
    required: true
  },
  {
    fieldId: 'Text23', // Brief details of claim
    getValue: getBriefDetails,
    maxLength: 500
  },
  {
    fieldId: 'Text24', // Value box
    getValue: getValueStatement,
    maxLength: 100
  },
  {
    fieldId: 'Text25', // Amount claimed
    getValue: (d) => formatMoneyForForm(getTotalClaimAmount(d)),
    required: true
  },
  {
    fieldId: 'Text26', // Court fee
    getValue: (d) => formatMoneyForForm(d.courtFee || 0)
  },
  {
    fieldId: 'Text27', // Legal representative's costs
    getValue: () => '0.00'
  },
  {
    fieldId: 'Text28', // Total amount
    getValue: (d) => formatMoneyForForm(getGrandTotal(d)),
    required: true
  },
  {
    fieldId: 'Text Field 48', // Defendant's service address
    getValue: formatDefendantBlock,
    maxLength: 200
  },

  // Page 2: Hearing Centre
  {
    fieldId: 'Text Field 28', // Preferred County Court
    getValue: getPreferredCourt,
    maxLength: 100
  },

  // Page 3: Particulars of Claim
  {
    fieldId: 'Text30', // Particulars text area
    getValue: (d) => d.generated?.content || 'Particulars of claim are attached.',
    maxLength: 2000
  },

  // Page 4: Statement of Truth - Date
  {
    fieldId: 'Text31', // Day
    getValue: () => getTodayParts().day
  },
  {
    fieldId: 'Text32', // Month
    getValue: () => getTodayParts().month
  },
  {
    fieldId: 'Text33', // Year
    getValue: () => getTodayParts().year
  },
  {
    fieldId: 'Text Field 46', // Full name
    getValue: (d) => d.claimant.name,
    required: true
  },
  {
    fieldId: 'Text Field 44', // Position/office held
    getValue: getPositionHeld
  },

  // Page 5: Claimant's Service Address
  {
    fieldId: 'Text Field 10', // Building and street
    getValue: (d) => getAddressLine1(d.claimant.address),
    maxLength: 50
  },
  {
    fieldId: 'Text Field 9', // Second line
    getValue: (d) => getAddressLine2(d.claimant.address),
    maxLength: 50
  },
  {
    fieldId: 'Text Field 8', // Town or city
    getValue: (d) => d.claimant.city || '',
    maxLength: 30
  },
  {
    fieldId: 'Text Field 7', // County
    getValue: (d) => d.claimant.county || '',
    maxLength: 30
  },
  {
    fieldId: 'Text34', // Postcode
    getValue: (d) => d.claimant.postcode || '',
    maxLength: 10
  },
  {
    fieldId: 'Text Field 6', // Phone number
    getValue: (d) => d.claimant.phone || '',
    maxLength: 20
  },
  {
    fieldId: 'Text Field 3', // Your Ref
    getValue: (d) => d.invoice.invoiceNumber || ''
  },
  {
    fieldId: 'Text Field 2', // Email
    getValue: (d) => d.claimant.email || '',
    maxLength: 50
  }
];

/**
 * N1 Form checkbox mappings
 */
export const N1_CHECKBOX_MAPPINGS: CheckboxMapping[] = [
  // Page 2: Vulnerability & Human Rights
  {
    fieldId: 'Check Box40', // Vulnerability - No
    condition: () => true
  },
  {
    fieldId: 'Check Box42', // Human Rights - No
    condition: () => true
  },

  // Page 3: Particulars attached
  {
    fieldId: 'Check Box43',
    condition: (d) => !!(d.generated?.content)
  },

  // Page 4: Statement of Truth
  {
    fieldId: 'Check Box45', // "I believe" (individual)
    condition: (d) => d.claimant.type === PartyType.INDIVIDUAL
  },
  {
    fieldId: 'Check Box46', // "The claimant believes" (business)
    condition: (d) => d.claimant.type !== PartyType.INDIVIDUAL
  },
  {
    fieldId: 'Check Box47', // Claimant checkbox
    condition: (d) => d.claimant.type === PartyType.INDIVIDUAL
  }
];

// ============================================================================
// N225 FORM FIELD MAPPINGS (Default Judgment)
// ============================================================================

export const N225_TEXT_MAPPINGS: FieldMapping[] = [
  {
    fieldId: 'claimNumber',
    getValue: (d) => (d as ClaimState & { caseNumber?: string }).caseNumber || d.invoice.invoiceNumber || '',
    required: true
  },
  {
    fieldId: 'claimantName',
    getValue: (d) => d.claimant.name,
    required: true
  },
  {
    fieldId: 'defendantName',
    getValue: (d) => d.defendant.name,
    required: true
  },
  {
    fieldId: 'amountOwed',
    getValue: (d) => formatMoneyForForm(d.invoice.totalAmount || 0),
    required: true
  },
  {
    fieldId: 'interestAmount',
    getValue: (d) => formatMoneyForForm(d.interest?.totalInterest || 0)
  },
  {
    fieldId: 'courtFee',
    getValue: (d) => formatMoneyForForm(d.courtFee || 0)
  },
  {
    fieldId: 'totalAmount',
    getValue: (d) => formatMoneyForForm(getGrandTotal(d)),
    required: true
  },
  {
    fieldId: 'dateDay',
    getValue: () => getTodayParts().day
  },
  {
    fieldId: 'dateMonth',
    getValue: () => getTodayParts().month
  },
  {
    fieldId: 'dateYear',
    getValue: () => getTodayParts().year
  },
  {
    fieldId: 'signatureName',
    getValue: (d) => d.claimant.name
  }
];

export const N225_CHECKBOX_MAPPINGS: CheckboxMapping[] = [
  {
    fieldId: 'judgmentImmediately',
    condition: () => true // Default to request immediate payment
  }
];

// ============================================================================
// N180 FORM FIELD MAPPINGS (Directions Questionnaire)
// ============================================================================

export const N180_TEXT_MAPPINGS: FieldMapping[] = [
  {
    fieldId: 'caseNumber',
    getValue: (d) => (d as ClaimState & { caseNumber?: string }).caseNumber || '',
    required: true
  },
  {
    fieldId: 'claimant',
    getValue: (d) => d.claimant.name,
    required: true
  },
  {
    fieldId: 'defendant',
    getValue: (d) => d.defendant.name,
    required: true
  },
  {
    fieldId: 'claimantAddress',
    getValue: formatClaimantBlock
  },
  {
    fieldId: 'phone',
    getValue: (d) => d.claimant.phone || ''
  },
  {
    fieldId: 'email',
    getValue: (d) => d.claimant.email || ''
  },
  {
    fieldId: 'reference',
    getValue: (d) => d.invoice.invoiceNumber || ''
  },
  {
    fieldId: 'dateDay',
    getValue: () => getTodayParts().day
  },
  {
    fieldId: 'dateMonth',
    getValue: () => getTodayParts().month
  },
  {
    fieldId: 'dateYear',
    getValue: () => getTodayParts().year
  }
];

export const N180_CHECKBOX_MAPPINGS: CheckboxMapping[] = [
  {
    fieldId: 'noSettlement', // Settlement not expected
    condition: () => true // Default - we're filing so presumably no settlement expected
  },
  {
    fieldId: 'noExpert',
    condition: () => true // Default for small claims
  },
  {
    fieldId: 'noWitnesses', // Using written evidence only
    condition: () => true
  }
];

// ============================================================================
// FORM MAPPING FUNCTIONS
// ============================================================================

/**
 * Get text field mappings for a form type
 */
export const getTextMappings = (formType: FormType): FieldMapping[] => {
  switch (formType) {
    case 'N1':
      return N1_TEXT_MAPPINGS;
    case 'N225':
      return N225_TEXT_MAPPINGS;
    case 'N180':
      return N180_TEXT_MAPPINGS;
    default:
      return [];
  }
};

/**
 * Get checkbox mappings for a form type
 */
export const getCheckboxMappings = (formType: FormType): CheckboxMapping[] => {
  switch (formType) {
    case 'N1':
      return N1_CHECKBOX_MAPPINGS;
    case 'N225':
      return N225_CHECKBOX_MAPPINGS;
    case 'N180':
      return N180_CHECKBOX_MAPPINGS;
    default:
      return [];
  }
};

/**
 * Map claim data to form fields with validation
 */
export const mapClaimToFormFields = (
  data: ClaimState,
  formType: FormType
): FormMappingResult => {
  const textMappings = getTextMappings(formType);
  const checkboxMappings = getCheckboxMappings(formType);

  const textFields: Record<string, string> = {};
  const checkboxes: Record<string, boolean> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // Process text fields
  for (const mapping of textMappings) {
    try {
      let value = mapping.getValue(data);

      // Truncate if max length specified
      if (mapping.maxLength && value.length > mapping.maxLength) {
        value = value.substring(0, mapping.maxLength);
        warnings.push(`Field ${mapping.fieldId} truncated to ${mapping.maxLength} characters`);
      }

      // Validate required fields
      if (mapping.required && !value) {
        errors.push(`Required field ${mapping.fieldId} is missing`);
      }

      // Custom validation
      if (mapping.validate && !mapping.validate(value)) {
        errors.push(`Field ${mapping.fieldId} failed validation`);
      }

      textFields[mapping.fieldId] = value;
    } catch (err) {
      errors.push(`Error processing field ${mapping.fieldId}: ${err}`);
      textFields[mapping.fieldId] = '';
    }
  }

  // Process checkboxes
  for (const mapping of checkboxMappings) {
    try {
      checkboxes[mapping.fieldId] = mapping.condition(data);
    } catch (err) {
      errors.push(`Error processing checkbox ${mapping.fieldId}: ${err}`);
      checkboxes[mapping.fieldId] = false;
    }
  }

  return {
    textFields,
    checkboxes,
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  };
};

/**
 * Validate claim data before PDF generation
 */
export const validateForPdf = (
  data: ClaimState,
  formType: FormType
): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common validations
  if (!data.claimant?.name) {
    errors.push('Claimant name is required');
  }

  if (!data.defendant?.name) {
    errors.push('Defendant name is required');
  }

  if (!data.invoice?.totalAmount || data.invoice.totalAmount <= 0) {
    errors.push('Claim amount must be greater than zero');
  }

  // Form-specific validations
  if (formType === 'N1') {
    if (!data.claimant?.address && !data.claimant?.postcode) {
      warnings.push('Claimant address is incomplete');
    }

    if (!data.defendant?.address && !data.defendant?.postcode) {
      warnings.push('Defendant address is incomplete');
    }

    if (!data.claimant?.county) {
      warnings.push('Claimant county is missing - may be required by court');
    }

    if (!data.defendant?.county) {
      warnings.push('Defendant county is missing - may be required by court');
    }

    // Check interest calculation
    const b2b = isB2B(data.claimant?.type, data.defendant?.type);
    if (data.interest?.totalInterest && data.interest.totalInterest > 0) {
      if (!data.interest.dailyRate) {
        warnings.push('Interest rate not specified');
      }
    }
  }

  if (formType === 'N225' || formType === 'N180') {
    // Case number is assigned by court after filing - check for optional extended property
    const extendedData = data as ClaimState & { caseNumber?: string };
    if (!extendedData.caseNumber) {
      warnings.push('Case number is required for this form - enter after court assigns one');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get form type from DocumentType enum
 */
export const documentTypeToFormType = (docType: DocumentType): FormType | null => {
  switch (docType) {
    case DocumentType.FORM_N1:
      return 'N1';
    case DocumentType.DEFAULT_JUDGMENT:
      return 'N225';
    case DocumentType.ADMISSION:
      return 'N225'; // N225A uses similar mapping
    case DocumentType.DIRECTIONS_QUESTIONNAIRE:
      return 'N180';
    default:
      return null;
  }
};

/**
 * Check if document type requires PDF form filling
 */
export const requiresPdfFilling = (docType: DocumentType): boolean => {
  return documentTypeToFormType(docType) !== null;
};

/**
 * Get PDF template filename for a form type
 */
export const getPdfTemplatePath = (formType: FormType): string => {
  switch (formType) {
    case 'N1':
      return '/N1.pdf';
    case 'N225':
      return '/N225.pdf';
    case 'N225A':
      return '/N225A.pdf';
    case 'N180':
      return '/N180.pdf';
    default:
      throw new Error(`Unknown form type: ${formType}`);
  }
};

export default {
  mapClaimToFormFields,
  validateForPdf,
  getTextMappings,
  getCheckboxMappings,
  documentTypeToFormType,
  requiresPdfFilling,
  getPdfTemplatePath
};
