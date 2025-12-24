/**
 * Timeline Event Normalizer
 *
 * Standardizes timeline events from various AI extraction sources.
 * Handles synonym mapping, deduplication, date validation, and sorting.
 */

import { TimelineEvent } from '../types';
import { FieldProvenance, ExtractionSource } from '../types/extraction';

/**
 * Canonical timeline event types (from types.ts)
 */
export type TimelineEventType = TimelineEvent['type'];

/**
 * Timeline event with provenance tracking
 */
export interface TrackedTimelineEvent extends TimelineEvent {
  provenance?: FieldProvenance;
}

/**
 * Raw timeline event as extracted from AI (before normalization)
 */
export interface RawTimelineEvent {
  date?: string;
  description?: string;
  type?: string;
  // Common AI extraction variations
  event_type?: string;
  eventType?: string;
  event?: string;
  what?: string;
  when?: string;
}

/**
 * Synonym mappings for timeline event types
 * Maps common AI-generated variations to canonical types
 */
const TYPE_SYNONYMS: Record<string, TimelineEventType> = {
  // Contract variations
  'contract': 'contract',
  'agreement': 'contract',
  'signed': 'contract',
  'contract_signed': 'contract',
  'agreement_signed': 'contract',
  'terms_agreed': 'contract',

  // Service delivery variations
  'service_delivered': 'service_delivered',
  'services_delivered': 'service_delivered',
  'delivered': 'service_delivered',
  'delivery': 'service_delivered',
  'goods_delivered': 'service_delivered',
  'work_completed': 'service_delivered',
  'completed': 'service_delivered',
  'fulfillment': 'service_delivered',
  'service_complete': 'service_delivered',

  // Invoice variations
  'invoice': 'invoice',
  'invoiced': 'invoice',
  'invoice_sent': 'invoice',
  'invoice_issued': 'invoice',
  'billed': 'invoice',
  'billing': 'invoice',

  // Payment due variations
  'payment_due': 'payment_due',
  'due_date': 'payment_due',
  'due': 'payment_due',
  'deadline': 'payment_due',
  'payment_deadline': 'payment_due',

  // Part payment variations
  'part_payment': 'part_payment',
  'partial_payment': 'part_payment',
  'payment_received': 'part_payment',
  'part_paid': 'part_payment',
  'partial': 'part_payment',

  // Chaser/reminder variations
  'chaser': 'chaser',
  'reminder': 'chaser',
  'follow_up': 'chaser',
  'followup': 'chaser',
  'chase': 'chaser',
  'chased': 'chaser',
  'reminder_sent': 'chaser',
  'payment_reminder': 'chaser',
  'first_reminder': 'chaser',
  'second_reminder': 'chaser',
  'third_reminder': 'chaser',

  // LBA (Letter Before Action) variations
  'lba_sent': 'lba_sent',
  'lba': 'lba_sent',
  'letter_before_action': 'lba_sent',
  'final_demand': 'lba_sent',
  'final_notice': 'lba_sent',
  'demand_letter': 'lba_sent',
  'pre_action_letter': 'lba_sent',
  'legal_notice': 'lba_sent',
  'formal_demand': 'lba_sent',
  '7_day_notice': 'lba_sent',
  '14_day_notice': 'lba_sent',
  'statutory_demand': 'lba_sent',

  // Acknowledgment variations
  'acknowledgment': 'acknowledgment',
  'acknowledgement': 'acknowledgment',
  'acknowledged': 'acknowledgment',
  'response': 'acknowledgment',
  'response_received': 'acknowledgment',
  'defendant_response': 'acknowledgment',

  // Communication variations
  'communication': 'communication',
  'email': 'communication',
  'phone': 'communication',
  'call': 'communication',
  'phone_call': 'communication',
  'meeting': 'communication',
  'letter': 'communication',
  'contact': 'communication',
  'correspondence': 'communication',
  'message': 'communication',
};

/**
 * Normalize a type string to a canonical TimelineEventType
 */
export const normalizeEventType = (rawType: string | undefined): TimelineEventType => {
  if (!rawType) return 'communication';

  const normalized = rawType
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  return TYPE_SYNONYMS[normalized] || 'communication';
};

/**
 * Parse and validate a date string
 * Returns ISO date string or null if invalid
 */
export const parseDate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null;

  try {
    // Try direct Date parsing first
    let date = new Date(dateStr);

    // Handle UK date format (DD/MM/YYYY)
    if (isNaN(date.getTime())) {
      const ukMatch = dateStr.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (ukMatch) {
        const [, day, month, year] = ukMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }
    }

    // Handle text dates like "1st January 2025"
    if (isNaN(date.getTime())) {
      const cleanedDate = dateStr
        .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      date = new Date(cleanedDate);
    }

    if (isNaN(date.getTime())) return null;

    // Return ISO date string (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

/**
 * Normalize a raw timeline event
 */
export const normalizeEvent = (
  raw: RawTimelineEvent,
  source: ExtractionSource = 'ai_chat',
  confidence: number = 80,
  sourceReference?: string
): TrackedTimelineEvent | null => {
  // Extract date from various possible fields
  const rawDate = raw.date || raw.when;
  const date = parseDate(rawDate);

  if (!date) {
    // Skip events without valid dates
    return null;
  }

  // Extract description from various possible fields
  const description = raw.description || raw.what || raw.event || '';

  // Extract and normalize type
  const rawType = raw.type || raw.event_type || raw.eventType;
  const type = normalizeEventType(rawType);

  return {
    date,
    description: description.trim(),
    type,
    provenance: {
      source,
      confidence,
      extractedAt: new Date().toISOString(),
      rawValue: rawType !== type ? rawType : undefined,
      sourceReference
    }
  };
};

/**
 * Create a unique key for deduplication
 */
const getEventKey = (event: TimelineEvent): string => {
  return `${event.date}|${event.type}`;
};

/**
 * Deduplicate timeline events by date and type
 * Keeps the event with the longest description
 */
export const deduplicateEvents = (events: TrackedTimelineEvent[]): TrackedTimelineEvent[] => {
  const seen = new Map<string, TrackedTimelineEvent>();

  for (const event of events) {
    const key = getEventKey(event);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, event);
    } else {
      // Keep the one with more information (longer description)
      if (event.description.length > existing.description.length) {
        seen.set(key, event);
      }
    }
  }

  return Array.from(seen.values());
};

/**
 * Sort events by date (ascending)
 */
export const sortEventsByDate = (events: TrackedTimelineEvent[]): TrackedTimelineEvent[] => {
  return [...events].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateA - dateB;
  });
};

/**
 * Normalize a full timeline
 * Handles raw AI output and produces clean, deduplicated, sorted timeline
 */
export const normalizeTimeline = (
  rawEvents: RawTimelineEvent[],
  source: ExtractionSource = 'ai_chat',
  confidence: number = 80,
  sourceReference?: string
): TrackedTimelineEvent[] => {
  if (!Array.isArray(rawEvents)) {
    return [];
  }

  // Normalize each event
  const normalized = rawEvents
    .map(raw => normalizeEvent(raw, source, confidence, sourceReference))
    .filter((event): event is TrackedTimelineEvent => event !== null);

  // Deduplicate
  const deduplicated = deduplicateEvents(normalized);

  // Sort by date
  const sorted = sortEventsByDate(deduplicated);

  return sorted;
};

/**
 * Merge two timelines, deduplicating and sorting
 */
export const mergeTimelines = (
  existing: TrackedTimelineEvent[],
  incoming: TrackedTimelineEvent[]
): TrackedTimelineEvent[] => {
  const combined = [...existing, ...incoming];
  const deduplicated = deduplicateEvents(combined);
  return sortEventsByDate(deduplicated);
};

/**
 * Detect LBA status from timeline
 */
export const detectLbaStatus = (events: TimelineEvent[]): {
  lbaSent: boolean;
  lbaDate: string | null;
  daysSinceLba: number | null;
} => {
  const lbaEvent = events.find(e => e.type === 'lba_sent');

  if (!lbaEvent) {
    return { lbaSent: false, lbaDate: null, daysSinceLba: null };
  }

  const lbaDate = new Date(lbaEvent.date);
  const today = new Date();
  const diffTime = today.getTime() - lbaDate.getTime();
  const daysSinceLba = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    lbaSent: true,
    lbaDate: lbaEvent.date,
    daysSinceLba
  };
};

/**
 * Check if LBA response period (14 days) has elapsed
 */
export const isLbaExpired = (events: TimelineEvent[]): boolean => {
  const { lbaSent, daysSinceLba } = detectLbaStatus(events);
  return lbaSent && daysSinceLba !== null && daysSinceLba >= 14;
};

/**
 * Get timeline summary for display
 */
export const getTimelineSummary = (events: TimelineEvent[]): {
  totalEvents: number;
  hasContract: boolean;
  hasInvoice: boolean;
  hasLba: boolean;
  lastEventDate: string | null;
  lastEventType: TimelineEventType | null;
} => {
  const sorted = sortEventsByDate(events as TrackedTimelineEvent[]);
  const lastEvent = sorted[sorted.length - 1];

  return {
    totalEvents: events.length,
    hasContract: events.some(e => e.type === 'contract'),
    hasInvoice: events.some(e => e.type === 'invoice'),
    hasLba: events.some(e => e.type === 'lba_sent'),
    lastEventDate: lastEvent?.date || null,
    lastEventType: lastEvent?.type || null
  };
};

/**
 * Validate timeline for completeness
 */
export const validateTimeline = (events: TimelineEvent[]): {
  isComplete: boolean;
  missingEvents: string[];
  warnings: string[];
} => {
  const missingEvents: string[] = [];
  const warnings: string[] = [];

  const hasContract = events.some(e => e.type === 'contract');
  const hasServiceDelivered = events.some(e => e.type === 'service_delivered');
  const hasInvoice = events.some(e => e.type === 'invoice');
  const hasPaymentDue = events.some(e => e.type === 'payment_due');

  // Core events for a debt claim
  if (!hasInvoice) {
    missingEvents.push('Invoice date');
  }

  if (!hasPaymentDue) {
    warnings.push('No explicit payment due date found - will infer from invoice terms');
  }

  // Recommendations
  if (!hasContract) {
    warnings.push('Contract date not specified - may weaken claim if disputed');
  }

  if (!hasServiceDelivered) {
    warnings.push('Service delivery date not specified - recommended for stronger claim');
  }

  return {
    isComplete: missingEvents.length === 0,
    missingEvents,
    warnings
  };
};

export default {
  normalizeEventType,
  parseDate,
  normalizeEvent,
  normalizeTimeline,
  mergeTimelines,
  deduplicateEvents,
  sortEventsByDate,
  detectLbaStatus,
  isLbaExpired,
  getTimelineSummary,
  validateTimeline
};
