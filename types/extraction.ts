/**
 * Extraction Types with Provenance
 *
 * Types for tracking where extracted data came from,
 * enabling auditing and confidence display in the UI.
 */

import { Party, InvoiceData, TimelineEvent, DocumentType } from '../types';

/**
 * Source of extracted data
 */
export type ExtractionSource =
  | 'ai_evidence'    // Extracted from uploaded documents (PDFs/images)
  | 'ai_chat'        // Extracted from conversation
  | 'ai_intake'      // Extracted during intake flow
  | 'manual'         // Manually entered by user
  | 'xero'           // Imported from Xero
  | 'quickbooks'     // Imported from QuickBooks
  | 'csv';           // Imported from CSV

/**
 * Provenance metadata for a single field
 */
export interface FieldProvenance {
  /** Source of the data */
  source: ExtractionSource;
  /** Confidence score (0-100) */
  confidence: number;
  /** When the data was extracted */
  extractedAt: string; // ISO timestamp
  /** Original value before normalization (if different) */
  rawValue?: string;
  /** Reference to source location (e.g., "invoice.pdf page 1", "chat message 3") */
  sourceReference?: string;
  /** Whether this field was auto-inferred (e.g., county from postcode) */
  inferred?: boolean;
}

/**
 * A field value with provenance metadata
 */
export interface ExtractedField<T> {
  value: T;
  provenance: FieldProvenance;
}

/**
 * Helper to create an extracted field with provenance
 */
export const createExtractedField = <T>(
  value: T,
  source: ExtractionSource,
  confidence: number = 100,
  options?: Partial<Omit<FieldProvenance, 'source' | 'confidence' | 'extractedAt'>>
): ExtractedField<T> => ({
  value,
  provenance: {
    source,
    confidence,
    extractedAt: new Date().toISOString(),
    ...options
  }
});

/**
 * Party with provenance tracking per field
 */
export interface TrackedParty {
  name?: ExtractedField<string>;
  contactName?: ExtractedField<string>;
  address?: ExtractedField<string>;
  city?: ExtractedField<string>;
  county?: ExtractedField<string>;
  postcode?: ExtractedField<string>;
  phone?: ExtractedField<string>;
  email?: ExtractedField<string>;
  type?: ExtractedField<string>;
  companyNumber?: ExtractedField<string>;
}

/**
 * Invoice with provenance tracking per field
 */
export interface TrackedInvoice {
  invoiceNumber?: ExtractedField<string>;
  dateIssued?: ExtractedField<string>;
  dueDate?: ExtractedField<string>;
  totalAmount?: ExtractedField<number>;
  currency?: ExtractedField<string>;
  description?: ExtractedField<string>;
}

/**
 * Timeline event with provenance
 */
export interface TrackedTimelineEvent extends TimelineEvent {
  provenance?: FieldProvenance;
}

/**
 * Full tracked claim data with provenance
 */
export interface TrackedClaimData {
  claimant?: TrackedParty;
  defendant?: TrackedParty;
  invoice?: TrackedInvoice;
  timeline?: TrackedTimelineEvent[];
}

/**
 * Result from extraction with metadata
 */
export interface ExtractionResult {
  /** Extracted data */
  data: TrackedClaimData;
  /** Overall confidence score (0-100) */
  overallConfidence: number;
  /** List of fields that were extracted */
  extractedFields: string[];
  /** List of fields that need user verification */
  needsVerification: string[];
  /** Warnings about the extraction */
  warnings: ExtractionWarning[];
  /** Recommended document based on extraction */
  recommendedDocument?: DocumentType;
  /** Reason for document recommendation */
  documentReason?: string;
}

/**
 * Warning from extraction process
 */
export interface ExtractionWarning {
  type: 'currency' | 'county_missing' | 'limitation' | 'small_claims' | 'date_error' | 'lba_status';
  message: string;
  field?: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Convert tracked party to regular party (strip provenance)
 */
export const toParty = (tracked: TrackedParty | undefined): Partial<Party> => {
  if (!tracked) return {};

  return {
    name: tracked.name?.value,
    contactName: tracked.contactName?.value,
    address: tracked.address?.value,
    city: tracked.city?.value,
    county: tracked.county?.value,
    postcode: tracked.postcode?.value,
    phone: tracked.phone?.value,
    email: tracked.email?.value,
    type: tracked.type?.value as any,
    companyNumber: tracked.companyNumber?.value
  };
};

/**
 * Convert tracked invoice to regular invoice (strip provenance)
 */
export const toInvoice = (tracked: TrackedInvoice | undefined): Partial<InvoiceData> => {
  if (!tracked) return {};

  return {
    invoiceNumber: tracked.invoiceNumber?.value,
    dateIssued: tracked.dateIssued?.value,
    dueDate: tracked.dueDate?.value,
    totalAmount: tracked.totalAmount?.value,
    currency: tracked.currency?.value,
    description: tracked.description?.value
  };
};

/**
 * Get fields with low confidence (below threshold)
 */
export const getLowConfidenceFields = (
  data: TrackedClaimData,
  threshold: number = 70
): string[] => {
  const lowConfidence: string[] = [];

  const checkParty = (party: TrackedParty | undefined, prefix: string) => {
    if (!party) return;
    Object.entries(party).forEach(([key, field]) => {
      if (field?.provenance?.confidence < threshold) {
        lowConfidence.push(`${prefix}.${key}`);
      }
    });
  };

  const checkInvoice = (invoice: TrackedInvoice | undefined) => {
    if (!invoice) return;
    Object.entries(invoice).forEach(([key, field]) => {
      if (field?.provenance?.confidence < threshold) {
        lowConfidence.push(`invoice.${key}`);
      }
    });
  };

  checkParty(data.claimant, 'claimant');
  checkParty(data.defendant, 'defendant');
  checkInvoice(data.invoice);

  return lowConfidence;
};

/**
 * Get inferred fields (auto-populated)
 */
export const getInferredFields = (data: TrackedClaimData): string[] => {
  const inferred: string[] = [];

  const checkParty = (party: TrackedParty | undefined, prefix: string) => {
    if (!party) return;
    Object.entries(party).forEach(([key, field]) => {
      if (field?.provenance?.inferred) {
        inferred.push(`${prefix}.${key}`);
      }
    });
  };

  checkParty(data.claimant, 'claimant');
  checkParty(data.defendant, 'defendant');

  return inferred;
};

export default {
  createExtractedField,
  toParty,
  toInvoice,
  getLowConfidenceFields,
  getInferredFields
};
