/**
 * Letter PDF Types
 *
 * Type definitions for vector PDF generation of letter documents
 * (LBA, Polite Chaser, etc.)
 */

import { DocumentType } from '../types';

/**
 * Address block for letter header/recipient
 */
export interface LetterAddressBlock {
  name: string;
  contactName?: string;
  lines: string[]; // Address lines (street, city, county, postcode)
}

/**
 * Table row for debt details display
 */
export interface TableRow {
  label: string;
  value: string;
  bold?: boolean;
}

/**
 * Structured content for letter PDF generation
 */
export interface LetterPdfContent {
  // Document metadata
  documentType: DocumentType;
  invoiceNumber?: string;
  generatedAt: string;

  // Header section (right-aligned)
  sender: LetterAddressBlock;
  date: string; // Formatted date string

  // Recipient section (left-aligned)
  recipient: LetterAddressBlock;

  // Letter content
  reference: string; // "RE:" line with claim details
  salutation: string; // "Dear [Name],"
  bodyParagraphs: LetterParagraph[];
  closing: string; // "Yours faithfully," etc.

  // Debt details table (for LBA)
  debtDetails?: TableRow[];

  // Signature block
  signatureImage?: string; // Base64 PNG/JPEG
  signerName: string;
  signerTitle?: string; // e.g., "Director", "Sole Trader"

  // Enclosures (for LBA)
  enclosures?: string[];

  // Annexes (LBA only)
  includeInfoSheet: boolean;
  includeReplyForm: boolean;

  // Info Sheet content (Annex 1)
  infoSheet?: InfoSheetContent;

  // Reply Form content (Annex 2)
  replyForm?: ReplyFormContent;
}

/**
 * Paragraph with optional formatting
 */
export interface LetterParagraph {
  text: string;
  bold?: boolean;
  indent?: boolean;
  isBulletList?: boolean;
  bulletItems?: string[];
  isHeading?: boolean;
  headingLevel?: 1 | 2 | 3;
}

/**
 * Info Sheet (Annex 1) content for LBA
 * Pre-Action Protocol compliant debt advice information
 */
export interface InfoSheetContent {
  title: string;
  warningText: string;
  responseDays: number;
  helpOrganizations: HelpOrganization[];
  additionalInfo: string[];
}

export interface HelpOrganization {
  name: string;
  phone?: string;
  website?: string;
  description?: string;
}

/**
 * Reply Form (Annex 2) content for LBA
 * Pre-Action Protocol compliant response form
 */
export interface ReplyFormContent {
  title: string;
  claimantName: string;
  debtorName: string;
  claimAmount: string;
  invoiceRef: string;
  sections: ReplyFormSection[];
}

export interface ReplyFormSection {
  title: string;
  instructions?: string;
  options?: ReplyFormOption[];
  hasSignatureLine?: boolean;
  hasDateLine?: boolean;
}

export interface ReplyFormOption {
  label: string;
  hasCheckbox: boolean;
  subOptions?: string[];
}

/**
 * PDF layout configuration
 */
export interface PdfLayoutConfig {
  // Page dimensions (A4 in points: 72 points = 1 inch)
  pageWidth: number;
  pageHeight: number;

  // Margins
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;

  // Typography
  fontSizeBody: number;
  fontSizeHeading1: number;
  fontSizeHeading2: number;
  fontSizeSmall: number;
  lineHeight: number;
  paragraphSpacing: number;

  // Alignment
  headerAlign: 'left' | 'right' | 'center';
  bodyAlign: 'left' | 'justify';
}

/**
 * Default A4 layout configuration for legal letters
 */
export const DEFAULT_LETTER_LAYOUT: PdfLayoutConfig = {
  // A4 dimensions in points (72 points = 1 inch)
  pageWidth: 595.28,  // 210mm
  pageHeight: 841.89, // 297mm

  // Margins (approximately 25mm / 1 inch each side)
  marginTop: 72,
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72,

  // Typography (professional legal document style)
  fontSizeBody: 11,
  fontSizeHeading1: 16,
  fontSizeHeading2: 14,
  fontSizeSmall: 9,
  lineHeight: 1.6,
  paragraphSpacing: 12,

  // Alignment
  headerAlign: 'right',
  bodyAlign: 'left'
};

/**
 * Helper type for text rendering options
 */
export interface TextRenderOptions {
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  color?: { r: number; g: number; b: number };
  align?: 'left' | 'right' | 'center' | 'justify';
  maxWidth?: number;
  lineHeight?: number;
}
