/**
 * Extraction Processor Service
 *
 * Unified entry point for processing AI-extracted data.
 * Applies normalization, validation, county inference, and provenance tracking.
 */

import {
  ExtractionSource,
  ExtractionResult,
  ExtractionWarning,
  TrackedClaimData,
  TrackedParty,
  TrackedInvoice,
  createExtractedField,
  toParty,
  toInvoice,
  getLowConfidenceFields
} from '../types/extraction';

import {
  normalizeTimeline,
  TrackedTimelineEvent,
  RawTimelineEvent,
  detectLbaStatus,
  isLbaExpired,
  validateTimeline as validateTimelineCompleteness
} from '../utils/timelineNormalizer';

import {
  recommendFromClaimState,
  mapToDocumentType
} from './documentRecommendation';

import {
  coerceAndValidate,
  validateAIExtraction
} from '../schemas/claimSchemas';

import { postcodeToCounty } from '../utils/postcodeToCounty';
import { inferPartyType } from '../utils/partyTypeUtils';
import { ClaimState, Party, InvoiceData, TimelineEvent, DocumentType } from '../types';

/**
 * Raw AI extraction input (before processing)
 */
export interface RawExtractionInput {
  /** Defendant/debtor information */
  defendant?: {
    name?: string;
    address?: string;
    city?: string;
    county?: string;
    postcode?: string;
    phone?: string;
    email?: string;
    type?: string;
    companyNumber?: string;
  };
  /** Claimant/creditor information */
  claimant?: {
    name?: string;
    address?: string;
    city?: string;
    county?: string;
    postcode?: string;
    phone?: string;
    email?: string;
    type?: string;
    companyNumber?: string;
  };
  /** Invoice/debt information */
  invoice?: {
    invoiceNumber?: string;
    dateIssued?: string;
    dueDate?: string;
    totalAmount?: number | string;
    currency?: string;
    description?: string;
  };
  /** Timeline events */
  timeline?: RawTimelineEvent[];
  /** LBA status */
  lbaStatus?: {
    sent?: boolean;
    dateSent?: string;
  };
  /** AI's document recommendation */
  recommendedDocument?: string;
  documentReason?: string;
  /** Confidence score */
  confidence?: number;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  /** Source of the extraction */
  source: ExtractionSource;
  /** Reference to source (e.g., "invoice.pdf page 1", "chat message 5") */
  sourceReference?: string;
  /** Default confidence if not provided */
  defaultConfidence?: number;
  /** Whether to infer missing counties from postcodes */
  inferCounty?: boolean;
  /** Whether to infer party types from names */
  inferPartyType?: boolean;
  /** Existing claim data to merge with */
  existingData?: TrackedClaimData;
}

/**
 * Process a raw party extraction into tracked party with provenance
 */
const processParty = (
  raw: RawExtractionInput['defendant'],
  source: ExtractionSource,
  confidence: number,
  sourceReference?: string,
  options?: { inferCounty?: boolean; inferPartyType?: boolean }
): TrackedParty | undefined => {
  if (!raw || !raw.name) return undefined;

  const tracked: TrackedParty = {};

  // Process each field with provenance
  if (raw.name) {
    tracked.name = createExtractedField(raw.name, source, confidence, { sourceReference });
  }

  if (raw.address) {
    tracked.address = createExtractedField(raw.address, source, confidence, { sourceReference });
  }

  if (raw.city) {
    tracked.city = createExtractedField(raw.city, source, confidence, { sourceReference });
  }

  if (raw.postcode) {
    // Normalize postcode
    const normalized = raw.postcode.replace(/\s+/g, ' ').trim().toUpperCase();
    tracked.postcode = createExtractedField(normalized, source, confidence, {
      sourceReference,
      rawValue: raw.postcode !== normalized ? raw.postcode : undefined
    });

    // Infer county from postcode if missing
    if (options?.inferCounty && !raw.county) {
      const inferredCounty = postcodeToCounty(normalized);
      if (inferredCounty) {
        tracked.county = createExtractedField(inferredCounty, source, 85, {
          sourceReference,
          inferred: true
        });
      }
    }
  }

  if (raw.county) {
    tracked.county = createExtractedField(raw.county, source, confidence, { sourceReference });
  }

  if (raw.phone) {
    tracked.phone = createExtractedField(raw.phone.replace(/[\s\-\(\)]/g, ''), source, confidence, {
      sourceReference,
      rawValue: raw.phone
    });
  }

  if (raw.email) {
    tracked.email = createExtractedField(raw.email.toLowerCase().trim(), source, confidence, {
      sourceReference,
      rawValue: raw.email
    });
  }

  if (raw.type) {
    tracked.type = createExtractedField(raw.type, source, confidence, { sourceReference });
  } else if (options?.inferPartyType && raw.name) {
    // Infer party type from name
    const inferredType = inferPartyType(raw.name, raw.companyNumber);
    tracked.type = createExtractedField(inferredType, source, 70, {
      sourceReference,
      inferred: true
    });
  }

  if (raw.companyNumber) {
    tracked.companyNumber = createExtractedField(
      raw.companyNumber.toUpperCase().replace(/\s/g, ''),
      source,
      confidence,
      { sourceReference }
    );
  }

  return tracked;
};

/**
 * Process raw invoice extraction into tracked invoice with provenance
 */
const processInvoice = (
  raw: RawExtractionInput['invoice'],
  source: ExtractionSource,
  confidence: number,
  sourceReference?: string
): TrackedInvoice | undefined => {
  if (!raw) return undefined;

  const tracked: TrackedInvoice = {};

  if (raw.invoiceNumber) {
    tracked.invoiceNumber = createExtractedField(raw.invoiceNumber, source, confidence, { sourceReference });
  }

  if (raw.dateIssued) {
    tracked.dateIssued = createExtractedField(raw.dateIssued, source, confidence, { sourceReference });
  }

  if (raw.dueDate) {
    tracked.dueDate = createExtractedField(raw.dueDate, source, confidence, { sourceReference });
  }

  if (raw.totalAmount !== undefined) {
    // Handle string or number
    const amount = typeof raw.totalAmount === 'string'
      ? parseFloat(raw.totalAmount.replace(/[£$€,]/g, ''))
      : raw.totalAmount;

    if (!isNaN(amount)) {
      tracked.totalAmount = createExtractedField(amount, source, confidence, {
        sourceReference,
        rawValue: typeof raw.totalAmount === 'string' ? raw.totalAmount : undefined
      });
    }
  }

  if (raw.currency) {
    tracked.currency = createExtractedField(raw.currency.toUpperCase(), source, confidence, { sourceReference });
  }

  if (raw.description) {
    tracked.description = createExtractedField(raw.description, source, confidence, { sourceReference });
  }

  return tracked;
};

/**
 * Generate warnings based on extracted data
 */
const generateWarnings = (data: TrackedClaimData): ExtractionWarning[] => {
  const warnings: ExtractionWarning[] = [];

  // Check for missing county
  if (data.defendant?.postcode?.value && !data.defendant?.county?.value) {
    warnings.push({
      type: 'county_missing',
      message: 'Defendant county could not be determined from postcode. Please verify.',
      field: 'defendant.county',
      severity: 'warning'
    });
  }

  if (data.claimant?.postcode?.value && !data.claimant?.county?.value) {
    warnings.push({
      type: 'county_missing',
      message: 'Claimant county could not be determined from postcode. Please verify.',
      field: 'claimant.county',
      severity: 'warning'
    });
  }

  // Check for non-GBP currency
  if (data.invoice?.currency?.value && data.invoice.currency.value !== 'GBP') {
    warnings.push({
      type: 'currency',
      message: `Claim amount is in ${data.invoice.currency.value}. UK courts prefer GBP amounts.`,
      field: 'invoice.currency',
      severity: 'warning'
    });
  }

  // Check claim amount for small claims limit
  if (data.invoice?.totalAmount?.value && data.invoice.totalAmount.value > 10000) {
    warnings.push({
      type: 'small_claims',
      message: `Claim exceeds small claims limit (£10,000). Legal representation recommended.`,
      field: 'invoice.totalAmount',
      severity: 'info'
    });
  }

  // Check limitation period (6 years for simple contract)
  if (data.timeline && data.timeline.length > 0) {
    const invoiceEvent = data.timeline.find(e => e.type === 'invoice');
    if (invoiceEvent) {
      const invoiceDate = new Date(invoiceEvent.date);
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

      if (invoiceDate < sixYearsAgo) {
        warnings.push({
          type: 'limitation',
          message: 'This debt may be statute-barred (over 6 years old). Seek legal advice.',
          field: 'timeline',
          severity: 'error'
        });
      }
    }
  }

  // Check LBA status for court filing
  if (data.timeline) {
    const lbaStatus = detectLbaStatus(data.timeline);
    if (!lbaStatus.lbaSent) {
      warnings.push({
        type: 'lba_status',
        message: 'No Letter Before Action found. This is required before court proceedings.',
        field: 'timeline',
        severity: 'warning'
      });
    } else if (lbaStatus.daysSinceLba !== null && lbaStatus.daysSinceLba < 14) {
      warnings.push({
        type: 'lba_status',
        message: `LBA sent ${lbaStatus.daysSinceLba} days ago. Wait 14 days before court filing.`,
        field: 'timeline',
        severity: 'info'
      });
    }
  }

  return warnings;
};

/**
 * Get list of extracted field paths
 */
const getExtractedFieldPaths = (data: TrackedClaimData): string[] => {
  const fields: string[] = [];

  const extractFromParty = (party: TrackedParty | undefined, prefix: string) => {
    if (!party) return;
    Object.keys(party).forEach(key => {
      if ((party as Record<string, unknown>)[key]) {
        fields.push(`${prefix}.${key}`);
      }
    });
  };

  const extractFromInvoice = (invoice: TrackedInvoice | undefined) => {
    if (!invoice) return;
    Object.keys(invoice).forEach(key => {
      if ((invoice as Record<string, unknown>)[key]) {
        fields.push(`invoice.${key}`);
      }
    });
  };

  extractFromParty(data.claimant, 'claimant');
  extractFromParty(data.defendant, 'defendant');
  extractFromInvoice(data.invoice);

  if (data.timeline && data.timeline.length > 0) {
    fields.push('timeline');
  }

  return fields;
};

/**
 * Main extraction processing function
 *
 * Processes raw AI output into validated, normalized data with provenance tracking.
 */
export const processExtraction = (
  rawInput: RawExtractionInput,
  options: ProcessingOptions
): ExtractionResult => {
  const {
    source,
    sourceReference,
    defaultConfidence = 80,
    inferCounty = true,
    inferPartyType = true
  } = options;

  // Validate and coerce input
  const validation = coerceAndValidate(rawInput);
  const confidence = rawInput.confidence || defaultConfidence;

  // Process parties
  const claimant = processParty(
    rawInput.claimant,
    source,
    confidence,
    sourceReference,
    { inferCounty, inferPartyType }
  );

  const defendant = processParty(
    rawInput.defendant,
    source,
    confidence,
    sourceReference,
    { inferCounty, inferPartyType }
  );

  // Process invoice
  const invoice = processInvoice(
    rawInput.invoice,
    source,
    confidence,
    sourceReference
  );

  // Process timeline
  const timeline = rawInput.timeline
    ? normalizeTimeline(rawInput.timeline, source, confidence, sourceReference)
    : [];

  // Build tracked claim data
  const data: TrackedClaimData = {
    claimant,
    defendant,
    invoice,
    timeline
  };

  // Merge with existing data if provided
  if (options.existingData) {
    data.claimant = mergeTrackedParty(options.existingData.claimant, data.claimant);
    data.defendant = mergeTrackedParty(options.existingData.defendant, data.defendant);
    data.invoice = mergeTrackedInvoice(options.existingData.invoice, data.invoice);
    data.timeline = mergeTimelines(options.existingData.timeline || [], data.timeline || []);
  }

  // Generate warnings
  const warnings = generateWarnings(data);

  // Add validation warnings
  if (validation.warnings) {
    validation.warnings.forEach(w => {
      warnings.push({
        type: 'date_error',
        message: w,
        severity: 'info'
      });
    });
  }

  // Get extracted field list
  const extractedFields = getExtractedFieldPaths(data);

  // Get low confidence fields that need verification
  const needsVerification = getLowConfidenceFields(data, 70);

  // Get document recommendation
  const recommendation = recommendFromClaimState({
    timeline: data.timeline,
    invoice: data.invoice ? toInvoice(data.invoice) as InvoiceData : undefined
  });

  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(data);

  return {
    data,
    overallConfidence,
    extractedFields,
    needsVerification,
    warnings,
    recommendedDocument: rawInput.recommendedDocument
      ? mapToDocumentType(rawInput.recommendedDocument)
      : recommendation.primaryDocument,
    documentReason: rawInput.documentReason || recommendation.reason
  };
};

/**
 * Calculate overall confidence from tracked data
 */
const calculateOverallConfidence = (data: TrackedClaimData): number => {
  const confidences: number[] = [];

  const collectConfidences = (obj: Record<string, unknown> | undefined) => {
    if (!obj) return;
    Object.values(obj).forEach(field => {
      if (field && typeof field === 'object' && 'provenance' in field) {
        const f = field as { provenance?: { confidence?: number } };
        if (f.provenance?.confidence !== undefined) {
          confidences.push(f.provenance.confidence);
        }
      }
    });
  };

  collectConfidences(data.claimant as unknown as Record<string, unknown>);
  collectConfidences(data.defendant as unknown as Record<string, unknown>);
  collectConfidences(data.invoice as unknown as Record<string, unknown>);

  if (confidences.length === 0) return 0;
  return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
};

/**
 * Merge two tracked parties (new values override old if higher confidence)
 */
const mergeTrackedParty = (
  existing: TrackedParty | undefined,
  incoming: TrackedParty | undefined
): TrackedParty | undefined => {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged: TrackedParty = { ...existing };
  const keys = ['name', 'address', 'city', 'county', 'postcode', 'phone', 'email', 'type', 'companyNumber'] as const;

  keys.forEach(key => {
    const existingField = existing[key];
    const incomingField = incoming[key];

    if (!existingField && incomingField) {
      (merged as Record<string, unknown>)[key] = incomingField;
    } else if (existingField && incomingField) {
      // Keep higher confidence value
      if (incomingField.provenance.confidence > existingField.provenance.confidence) {
        (merged as Record<string, unknown>)[key] = incomingField;
      }
    }
  });

  return merged;
};

/**
 * Merge two tracked invoices
 */
const mergeTrackedInvoice = (
  existing: TrackedInvoice | undefined,
  incoming: TrackedInvoice | undefined
): TrackedInvoice | undefined => {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged: TrackedInvoice = { ...existing };
  const keys = ['invoiceNumber', 'dateIssued', 'dueDate', 'totalAmount', 'currency', 'description'] as const;

  keys.forEach(key => {
    const existingField = existing[key];
    const incomingField = incoming[key];

    if (!existingField && incomingField) {
      (merged as Record<string, unknown>)[key] = incomingField;
    } else if (existingField && incomingField) {
      if (incomingField.provenance.confidence > existingField.provenance.confidence) {
        (merged as Record<string, unknown>)[key] = incomingField;
      }
    }
  });

  return merged;
};

/**
 * Merge timelines (from timelineNormalizer)
 */
const mergeTimelines = (
  existing: TrackedTimelineEvent[],
  incoming: TrackedTimelineEvent[]
): TrackedTimelineEvent[] => {
  const combined = [...existing, ...incoming];
  const seen = new Map<string, TrackedTimelineEvent>();

  for (const event of combined) {
    const key = `${event.date}|${event.type}`;
    const existingEvent = seen.get(key);

    if (!existingEvent) {
      seen.set(key, event);
    } else if (event.description.length > existingEvent.description.length) {
      seen.set(key, event);
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Convert extraction result to partial ClaimState for store update
 */
export const toClaimStateUpdate = (result: ExtractionResult): Partial<ClaimState> => {
  return {
    defendant: result.data.defendant ? toParty(result.data.defendant) as Party : undefined,
    claimant: result.data.claimant ? toParty(result.data.claimant) as Party : undefined,
    invoice: result.data.invoice ? toInvoice(result.data.invoice) as InvoiceData : undefined,
    timeline: result.data.timeline?.map(e => ({
      date: e.date,
      description: e.description,
      type: e.type
    })) || [],
    selectedDocType: result.recommendedDocument
  };
};

/**
 * Quick helper to process evidence file extraction
 */
export const processEvidenceExtraction = (
  rawData: RawExtractionInput,
  fileName: string
): ExtractionResult => {
  return processExtraction(rawData, {
    source: 'ai_evidence',
    sourceReference: fileName,
    defaultConfidence: 85
  });
};

/**
 * Quick helper to process chat extraction
 */
export const processChatExtraction = (
  rawData: RawExtractionInput,
  messageIndex?: number
): ExtractionResult => {
  return processExtraction(rawData, {
    source: 'ai_chat',
    sourceReference: messageIndex ? `chat message ${messageIndex}` : undefined,
    defaultConfidence: 75
  });
};

/**
 * Quick helper to process intake form extraction
 */
export const processIntakeExtraction = (
  rawData: RawExtractionInput
): ExtractionResult => {
  return processExtraction(rawData, {
    source: 'ai_intake',
    defaultConfidence: 90
  });
};

export default {
  processExtraction,
  processEvidenceExtraction,
  processChatExtraction,
  processIntakeExtraction,
  toClaimStateUpdate
};
