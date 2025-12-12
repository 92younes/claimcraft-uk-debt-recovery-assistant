
import { Deadline, ClaimState, DeadlinePriority, DeadlineStatus } from '../types';

// ==========================================
// iCal File Generation Service
// ==========================================

/**
 * Format date to iCal DATE format (YYYYMMDD)
 */
const formatICalDate = (date: Date): string => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

/**
 * Format date to iCal DATETIME format (YYYYMMDDTHHMMSSZ)
 */
const formatICalDateTime = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Escape special characters for iCal text fields
 * According to RFC 5545, we need to escape: backslash, semicolon, comma, newlines
 */
const escapeICalText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
};

/**
 * Convert deadline priority to iCal priority (1-9, where 1 is highest)
 */
const priorityToICalPriority = (priority: DeadlinePriority): number => {
  switch (priority) {
    case DeadlinePriority.CRITICAL:
      return 1;
    case DeadlinePriority.HIGH:
      return 3;
    case DeadlinePriority.MEDIUM:
      return 5;
    case DeadlinePriority.LOW:
      return 9;
    default:
      return 5;
  }
};

/**
 * Generate a unique UID for iCal event
 */
const generateUID = (deadlineId: string): string => {
  return `${deadlineId}@claimcraft.uk`;
};

/**
 * Generate iCal VEVENT for a single deadline
 */
export const deadlineToICalEvent = (
  deadline: Deadline,
  claim: ClaimState | undefined
): string => {
  const dueDate = new Date(deadline.dueDate);
  const now = new Date();

  const summary = escapeICalText(deadline.title);
  const description = escapeICalText(
    `${deadline.description}${claim ? `\n\nClaim: ${claim.defendant.name}\nAmount: £${claim.invoice.totalAmount.toFixed(2)}` : ''}${deadline.legalReference ? `\n\nLegal Reference: ${deadline.legalReference}` : ''}`
  );

  const status = deadline.status === DeadlineStatus.COMPLETED ? 'COMPLETED' : 'NEEDS-ACTION';

  // Build VEVENT
  const lines = [
    'BEGIN:VEVENT',
    `UID:${generateUID(deadline.id)}`,
    `DTSTAMP:${formatICalDateTime(now)}`,
    `DTSTART;VALUE=DATE:${formatICalDate(dueDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `CATEGORIES:ClaimCraft,${deadline.type}`,
    `PRIORITY:${priorityToICalPriority(deadline.priority)}`,
    `STATUS:${status}`,
  ];

  // Add alarm for reminder (1 day before)
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Deadline reminder',
    'TRIGGER:-P1D',
    'END:VALARM'
  );

  lines.push('END:VEVENT');

  return lines.join('\r\n');
};

/**
 * Generate complete iCal (.ics) file content from deadlines
 */
export const generateICalFile = (
  deadlines: Deadline[],
  claims: ClaimState[]
): string => {
  const events = deadlines.map(deadline => {
    const claim = claims.find(c => c.id === deadline.claimId);
    return deadlineToICalEvent(deadline, claim);
  }).join('\r\n');

  const calendarContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClaimCraft UK//Debt Recovery Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ClaimCraft Deadlines',
    'X-WR-TIMEZONE:Europe/London',
    events,
    'END:VCALENDAR'
  ].join('\r\n');

  return calendarContent;
};

/**
 * Generate iCal for a single deadline
 */
export const generateSingleDeadlineIcal = (
  deadline: Deadline,
  claim: ClaimState | undefined
): string => {
  const event = deadlineToICalEvent(deadline, claim);

  const calendarContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClaimCraft UK//Debt Recovery Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    event,
    'END:VCALENDAR'
  ].join('\r\n');

  return calendarContent;
};

/**
 * Trigger download of .ics file in the browser
 */
export const downloadICalFile = (
  deadlines: Deadline[],
  claims: ClaimState[],
  filename: string = 'claimcraft-deadlines.ics'
): void => {
  const content = generateICalFile(deadlines, claims);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download a single deadline as .ics file
 */
export const downloadSingleDeadlineIcal = (
  deadline: Deadline,
  claim: ClaimState | undefined,
  filename?: string
): void => {
  const content = generateSingleDeadlineIcal(deadline, claim);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = filename || `deadline-${deadline.id}.ics`;

  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate iCal data URL for use in links
 */
export const generateICalDataUrl = (
  deadlines: Deadline[],
  claims: ClaimState[]
): string => {
  const content = generateICalFile(deadlines, claims);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
};
