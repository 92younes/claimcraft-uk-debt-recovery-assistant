/**
 * Letter Content Transformer
 *
 * Transforms ClaimState into LetterPdfContent structure
 * for vector PDF generation
 */

import { ClaimState, DocumentType, Party, PartyType } from '../types';
import {
  LetterPdfContent,
  LetterAddressBlock,
  LetterParagraph,
  InfoSheetContent,
  ReplyFormContent,
  HelpOrganization,
  TableRow
} from './letterPdfTypes';

/**
 * Transform ClaimState to LetterPdfContent for PDF generation
 */
export function transformToLetterContent(data: ClaimState): LetterPdfContent {
  const isLBA = data.selectedDocType === DocumentType.LBA;
  const isPoliteChaser = data.selectedDocType === DocumentType.POLITE_CHASER;

  // Parse the generated content into paragraphs
  const bodyParagraphs = parseGeneratedContent(data.generated?.content || '');

  // Calculate total claim
  const totalClaim = (data.invoice?.totalAmount || 0) +
    (data.interest?.totalInterest || 0) +
    (data.compensation || 0);

  return {
    // Document metadata
    documentType: data.selectedDocType,
    invoiceNumber: data.invoice?.invoiceNumber,
    generatedAt: new Date().toISOString(),

    // Sender (claimant) - right-aligned header
    sender: formatAddressBlock(data.claimant),
    date: formatDate(new Date()),

    // Recipient (defendant)
    recipient: formatAddressBlock(data.defendant),

    // Reference line
    reference: generateReferenceLine(data, totalClaim),

    // Salutation
    salutation: generateSalutation(data.defendant, isPoliteChaser),

    // Body content (parsed from generated content)
    bodyParagraphs,

    // Debt details table (for LBA)
    debtDetails: isLBA ? generateDebtDetailsTable(data, totalClaim) : undefined,

    // Closing
    closing: isPoliteChaser ? 'Kind regards,' : 'Yours faithfully,',

    // Signature
    signatureImage: data.signature || undefined,
    signerName: data.claimant.name,
    signerTitle: getSignerTitle(data.claimant),

    // Enclosures (LBA only)
    enclosures: isLBA ? [
      'Annex 1: Information Sheet on Debt and Mental Health',
      'Annex 2: Financial Statement (Reply Form)'
    ] : undefined,

    // Annexes
    includeInfoSheet: isLBA,
    includeReplyForm: isLBA,

    // Info Sheet content (Pre-Action Protocol compliant)
    infoSheet: isLBA ? generateInfoSheetContent() : undefined,

    // Reply Form content
    replyForm: isLBA ? generateReplyFormContent(data, totalClaim) : undefined
  };
}

/**
 * Generate debt details table rows
 */
function generateDebtDetailsTable(data: ClaimState, totalClaim: number): TableRow[] {
  const currency = data.invoice?.currency || 'GBP';
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  const rows: TableRow[] = [
    {
      label: 'Invoice Number:',
      value: data.invoice?.invoiceNumber || 'N/A'
    },
    {
      label: 'Invoice Date:',
      value: data.invoice?.dateIssued
        ? new Date(data.invoice.dateIssued).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : 'N/A'
    },
    {
      label: 'Principal Amount:',
      value: `${symbol}${(data.invoice?.totalAmount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
    }
  ];

  // Add interest if present
  if (data.interest?.totalInterest && data.interest.totalInterest > 0) {
    rows.push({
      label: 'Interest:',
      value: `${symbol}${data.interest.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
    });
  }

  // Add compensation if present
  if (data.compensation && data.compensation > 0) {
    rows.push({
      label: 'Late Payment Compensation:',
      value: `${symbol}${data.compensation.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
    });
  }

  // Total row (bold)
  rows.push({
    label: 'Total Outstanding:',
    value: `${symbol}${totalClaim.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
    bold: true
  });

  return rows;
}

/**
 * Format a Party into an address block
 */
function formatAddressBlock(party: Party): LetterAddressBlock {
  const lines: string[] = [];

  if (party.address) lines.push(party.address);
  if (party.city) lines.push(party.city);
  if (party.county) lines.push(party.county);
  if (party.postcode) lines.push(party.postcode);

  return {
    name: party.name,
    contactName: party.contactName,
    lines
  };
}

/**
 * Format date for letter (UK format)
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Generate the RE: reference line
 */
function generateReferenceLine(data: ClaimState, totalClaim: number): string {
  const isLBA = data.selectedDocType === DocumentType.LBA;
  const isPoliteChaser = data.selectedDocType === DocumentType.POLITE_CHASER;

  if (isPoliteChaser) {
    return `Re: Invoice ${data.invoice?.invoiceNumber || '[Invoice Number]'} - Payment Reminder`;
  }

  if (isLBA) {
    return `RE: PRE-ACTION PROTOCOL FOR DEBT CLAIMS - OUTSTANDING DEBT OF £${totalClaim.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  }

  return `Re: Invoice ${data.invoice?.invoiceNumber || '[Invoice Number]'}`;
}

/**
 * Generate appropriate salutation
 */
function generateSalutation(defendant: Party, isPoliteChaser: boolean): string {
  if (isPoliteChaser) {
    // Friendly greeting for polite chaser
    if (defendant.contactName) {
      return `Dear ${defendant.contactName},`;
    }
    if (defendant.type === PartyType.INDIVIDUAL) {
      const firstName = defendant.name.split(' ')[0];
      return `Dear ${firstName},`;
    }
    return `Dear ${defendant.name},`;
  }

  // Formal salutation for LBA
  if (defendant.contactName) {
    return `Dear ${defendant.contactName},`;
  }
  if (defendant.type === PartyType.INDIVIDUAL) {
    return `Dear ${defendant.name},`;
  }
  return 'Dear Sirs,';
}

/**
 * Get signer title based on party type
 */
function getSignerTitle(claimant: Party): string | undefined {
  switch (claimant.type) {
    case PartyType.BUSINESS:
      return 'Director';
    case PartyType.SOLE_TRADER:
      return 'Sole Trader';
    default:
      return undefined;
  }
}

/**
 * Strip markdown formatting from text
 * Converts **bold** to plain text (PDF rendering handles bold separately)
 */
function stripMarkdown(text: string): string {
  // Remove bold markers
  return text.replace(/\*\*/g, '');
}

/**
 * Check if a line is entirely bold (starts and ends with **)
 */
function isEntirelyBold(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4;
}

/**
 * Check if line contains inline bold that should make it a "bold paragraph"
 * e.g., "**Total Outstanding: £500**" at the start
 */
function startsWithBold(line: string): boolean {
  return line.trim().startsWith('**');
}

/**
 * Parse generated content string into structured paragraphs
 */
function parseGeneratedContent(content: string): LetterParagraph[] {
  if (!content) return [];

  const paragraphs: LetterParagraph[] = [];
  const lines = content.split('\n');

  let currentParagraph: string[] = [];
  let inBulletList = false;
  let bulletItems: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip header lines (already handled separately)
    if (isHeaderLine(trimmedLine)) {
      continue;
    }

    // Detect section headings (entire line is bold with **)
    if (isEntirelyBold(trimmedLine)) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        paragraphs.push({
          text: stripMarkdown(currentParagraph.join(' ')),
          bold: false
        });
        currentParagraph = [];
      }

      // Flush bullet list if any
      if (inBulletList && bulletItems.length > 0) {
        paragraphs.push({
          text: '',
          isBulletList: true,
          bulletItems: bulletItems.map(stripMarkdown)
        });
        bulletItems = [];
        inBulletList = false;
      }

      // Add heading (strip the ** markers)
      const headingText = trimmedLine.slice(2, -2).trim();
      paragraphs.push({
        text: headingText,
        isHeading: true,
        headingLevel: 2,
        bold: true
      });
      continue;
    }

    // Detect bullet points
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      // Flush current paragraph before starting list
      if (currentParagraph.length > 0) {
        paragraphs.push({
          text: stripMarkdown(currentParagraph.join(' ')),
          bold: false
        });
        currentParagraph = [];
      }

      inBulletList = true;
      bulletItems.push(trimmedLine.substring(2).trim());
      continue;
    }

    // End of bullet list (non-bullet line after bullets)
    if (inBulletList && trimmedLine && !trimmedLine.startsWith('- ') && !trimmedLine.startsWith('• ')) {
      if (bulletItems.length > 0) {
        paragraphs.push({
          text: '',
          isBulletList: true,
          bulletItems: bulletItems.map(stripMarkdown)
        });
        bulletItems = [];
      }
      inBulletList = false;
    }

    // Empty line - flush paragraph
    if (!trimmedLine) {
      if (currentParagraph.length > 0) {
        const text = stripMarkdown(currentParagraph.join(' '));
        // Check if the paragraph starts with bold text - render entire paragraph as bold
        const isBoldParagraph = currentParagraph[0]?.trim().startsWith('**');
        paragraphs.push({
          text,
          bold: isBoldParagraph
        });
        currentParagraph = [];
      }
      continue;
    }

    // Regular text line
    if (!inBulletList) {
      currentParagraph.push(trimmedLine);
    }
  }

  // Flush remaining content
  if (currentParagraph.length > 0) {
    const text = stripMarkdown(currentParagraph.join(' '));
    const isBoldParagraph = currentParagraph[0]?.trim().startsWith('**');
    paragraphs.push({
      text,
      bold: isBoldParagraph
    });
  }

  if (bulletItems.length > 0) {
    paragraphs.push({
      text: '',
      isBulletList: true,
      bulletItems: bulletItems.map(stripMarkdown)
    });
  }

  return paragraphs;
}

/**
 * Check if line is a header line (address, date, salutation)
 * These are handled separately, not in body content
 */
function isHeaderLine(line: string): boolean {
  // Skip address lines (handled separately)
  if (line.match(/^[A-Z][A-Z0-9\s,]+$/)) return true; // Postcode-like
  if (line.match(/^\d{1,2}\s+[A-Z][a-z]+\s+\d{4}$/)) return true; // Date
  if (line.startsWith('Dear ')) return true; // Salutation
  if (line.startsWith('RE:') || line.startsWith('Re:')) return true; // Reference (handled separately)
  if (line.startsWith('Yours faithfully') || line.startsWith('Kind regards')) return true; // Closing (handled separately)
  if (line === '---') return true; // Separator
  if (line.startsWith('IMPORTANT:')) return true; // Footer disclaimer

  return false;
}

/**
 * Generate Info Sheet content (Annex 1)
 * Pre-Action Protocol compliant debt advice information
 */
function generateInfoSheetContent(): InfoSheetContent {
  const helpOrganizations: HelpOrganization[] = [
    {
      name: 'Citizens Advice',
      phone: '0800 144 8848',
      website: 'www.citizensadvice.org.uk',
      description: 'Free, confidential advice on debt and other issues'
    },
    {
      name: 'StepChange Debt Charity',
      phone: '0800 138 1111',
      website: 'www.stepchange.org',
      description: 'Free debt advice and solutions'
    },
    {
      name: 'National Debtline',
      phone: '0808 808 4000',
      website: 'www.nationaldebtline.org',
      description: 'Free, independent debt advice'
    },
    {
      name: 'Money Helper',
      phone: '0800 138 7777',
      website: 'www.moneyhelper.org.uk',
      description: 'Free, impartial money guidance'
    }
  ];

  return {
    title: 'INFORMATION SHEET',
    warningText: 'DO NOT IGNORE THIS LETTER. If you do not respond within 30 days, court action may be taken against you.',
    responseDays: 30,
    helpOrganizations,
    additionalInfo: [
      'If you are struggling with debt, free help is available.',
      'You should seek advice as soon as possible.',
      'Ignoring this letter will not make the debt go away.',
      'If you dispute this debt, you must respond in writing within 30 days explaining why.'
    ]
  };
}

/**
 * Generate Reply Form content (Annex 2)
 * Pre-Action Protocol compliant response form
 */
function generateReplyFormContent(data: ClaimState, totalClaim: number): ReplyFormContent {
  return {
    title: 'REPLY FORM',
    claimantName: data.claimant.name,
    debtorName: data.defendant.name,
    claimAmount: `£${totalClaim.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
    invoiceRef: data.invoice?.invoiceNumber || '',
    sections: [
      {
        title: 'SECTION 1: YOUR RESPONSE',
        instructions: 'Please tick ONE of the following options:',
        options: [
          {
            label: 'I accept that I owe the full amount claimed and will pay within 30 days',
            hasCheckbox: true
          },
          {
            label: 'I accept that I owe the debt but cannot pay in full. I propose to pay by instalments (complete Section 2)',
            hasCheckbox: true
          },
          {
            label: 'I dispute this debt (please provide full details in Section 3)',
            hasCheckbox: true
          }
        ]
      },
      {
        title: 'SECTION 2: PAYMENT PROPOSAL (if applicable)',
        instructions: 'If you cannot pay in full, please propose a payment plan:',
        options: [
          {
            label: 'I propose to pay £_______ per month',
            hasCheckbox: false
          },
          {
            label: 'I can make a lump sum payment of £_______ immediately',
            hasCheckbox: false
          }
        ]
      },
      {
        title: 'SECTION 3: DISPUTE (if applicable)',
        instructions: 'If you dispute this debt, please explain why:'
      },
      {
        title: 'SECTION 4: DOCUMENTS',
        instructions: 'Please tick if you require copies of the following:',
        options: [
          {
            label: 'Copy of the original invoice',
            hasCheckbox: true
          },
          {
            label: 'Copy of the contract/agreement',
            hasCheckbox: true
          },
          {
            label: 'Statement of account',
            hasCheckbox: true
          }
        ]
      },
      {
        title: 'DECLARATION',
        hasSignatureLine: true,
        hasDateLine: true
      }
    ]
  };
}

/**
 * Export helper function for getting formatted currency
 */
export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';
  return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
}
