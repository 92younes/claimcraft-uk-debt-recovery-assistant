/**
 * Letter PDF Generator
 *
 * Generates vector PDFs for letter documents (LBA, Polite Chaser, etc.)
 * using pdf-lib for true vector text output.
 *
 * This replaces the html2canvas approach which produced large rasterized PDFs.
 */

import { PDFDocument } from 'pdf-lib';
import { ClaimState, DocumentType } from '../types';
import { LetterPdfContent, DEFAULT_LETTER_LAYOUT } from './letterPdfTypes';
import { transformToLetterContent } from './letterContentTransformer';
import { LetterLayoutEngine } from './letterLayoutEngine';

/**
 * Generate a vector PDF from ClaimState data
 *
 * @param data - The claim state with generated content
 * @returns PDF as Uint8Array
 */
export async function generateLetterPdfFromData(data: ClaimState): Promise<Uint8Array> {
  // Transform claim data to structured letter content
  const letterContent = transformToLetterContent(data);

  // Generate PDF from structured content
  return generateLetterPdfFromContent(letterContent);
}

/**
 * Generate a vector PDF from structured LetterPdfContent
 *
 * @param content - Structured letter content
 * @returns PDF as Uint8Array
 */
export async function generateLetterPdfFromContent(content: LetterPdfContent): Promise<Uint8Array> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();

  // Set document metadata
  pdfDoc.setTitle(getDocumentTitle(content));
  pdfDoc.setSubject(`Invoice: ${content.invoiceNumber || 'N/A'}`);
  pdfDoc.setCreator('ClaimCraft UK');
  pdfDoc.setProducer('ClaimCraft UK - Debt Recovery Assistant');
  pdfDoc.setCreationDate(new Date());

  // Create layout engine
  const layout = new LetterLayoutEngine(pdfDoc, DEFAULT_LETTER_LAYOUT);
  await layout.initFonts();

  // Render main letter (async for signature embedding)
  await renderMainLetter(layout, content);

  // Render annexes if LBA
  if (content.includeInfoSheet && content.infoSheet) {
    layout.drawInfoSheetPage(content.infoSheet);
  }

  if (content.includeReplyForm && content.replyForm) {
    layout.drawReplyFormPage(content.replyForm);
  }

  // Add page numbers to all pages
  layout.addPageNumbers();

  // Save and return PDF bytes
  return pdfDoc.save();
}

/**
 * Generate PDF and return as Blob (for browser download)
 */
export async function generateLetterPdfBlob(data: ClaimState): Promise<Blob> {
  const pdfBytes = await generateLetterPdfFromData(data);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Generate only the main letter (no annexes) as PDF
 */
export async function generateMainLetterOnly(data: ClaimState): Promise<Uint8Array> {
  const letterContent = transformToLetterContent(data);

  // Override to exclude annexes
  letterContent.includeInfoSheet = false;
  letterContent.includeReplyForm = false;

  return generateLetterPdfFromContent(letterContent);
}

/**
 * Generate only Info Sheet (Annex 1) as separate PDF
 */
export async function generateInfoSheetPdf(data: ClaimState): Promise<Uint8Array> {
  const letterContent = transformToLetterContent(data);

  if (!letterContent.infoSheet) {
    throw new Error('Info sheet content not available');
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Information Sheet - Annex 1');
  pdfDoc.setCreator('ClaimCraft UK');

  const layout = new LetterLayoutEngine(pdfDoc, DEFAULT_LETTER_LAYOUT);
  await layout.initFonts();

  // Remove initial page and draw info sheet
  layout.drawInfoSheetPage(letterContent.infoSheet);

  // Remove the initial blank page
  pdfDoc.removePage(0);

  return pdfDoc.save();
}

/**
 * Generate only Reply Form (Annex 2) as separate PDF
 */
export async function generateReplyFormPdf(data: ClaimState): Promise<Uint8Array> {
  const letterContent = transformToLetterContent(data);

  if (!letterContent.replyForm) {
    throw new Error('Reply form content not available');
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Reply Form - Annex 2');
  pdfDoc.setCreator('ClaimCraft UK');

  const layout = new LetterLayoutEngine(pdfDoc, DEFAULT_LETTER_LAYOUT);
  await layout.initFonts();

  // Draw reply form (creates its own page)
  layout.drawReplyFormPage(letterContent.replyForm);

  // Remove the initial blank page
  pdfDoc.removePage(0);

  return pdfDoc.save();
}

/**
 * Render the main letter content to PDF
 */
async function renderMainLetter(layout: LetterLayoutEngine, content: LetterPdfContent): Promise<void> {
  // 1. Sender address block (right-aligned)
  layout.drawSenderBlock(content);

  // 2. Date
  layout.drawDateLine(content.date);

  // 3. Recipient address block
  layout.drawRecipientBlock(content);

  // 4. Reference line
  layout.drawReferenceLine(content.reference);

  // 5. Salutation
  layout.drawSalutation(content.salutation);

  // 6. Body paragraphs
  layout.drawBodyParagraphs(content.bodyParagraphs);

  // 7. Debt details table (LBA only)
  if (content.debtDetails && content.debtDetails.length > 0) {
    layout.drawTable(content.debtDetails);
  }

  // 8. Closing and signature
  await renderClosingWithSignature(layout, content);

  // 9. Enclosures (if any)
  if (content.enclosures && content.enclosures.length > 0) {
    layout.drawEnclosures(content.enclosures);
  }
}

/**
 * Render closing block with optional signature image
 */
async function renderClosingWithSignature(layout: LetterLayoutEngine, content: LetterPdfContent): Promise<void> {
  const config = DEFAULT_LETTER_LAYOUT;
  const fontSize = config.fontSizeBody;
  const lineSpacing = fontSize * config.lineHeight;

  // Closing phrase
  layout.drawText(content.closing, { fontSize });
  layout.moveDown(lineSpacing);
  layout.moveDown(config.paragraphSpacing);

  // Signature image if present
  if (content.signatureImage) {
    await layout.embedSignature(content.signatureImage);
  } else {
    // Leave space for handwritten signature
    layout.moveDown(40);
  }

  // Signer name
  layout.drawText(content.signerName, { fontSize, bold: true });
  layout.moveDown(lineSpacing);

  // Signer title if present
  if (content.signerTitle) {
    layout.drawText(content.signerTitle, { fontSize });
    layout.moveDown(lineSpacing);
  }
}

/**
 * Get document title based on type
 */
function getDocumentTitle(content: LetterPdfContent): string {
  switch (content.documentType) {
    case DocumentType.LBA:
      return `Letter Before Action - ${content.invoiceNumber || 'Claim'}`;
    case DocumentType.POLITE_CHASER:
      return `Payment Reminder - ${content.invoiceNumber || 'Invoice'}`;
    default:
      return `Legal Document - ${content.invoiceNumber || 'Claim'}`;
  }
}

/**
 * Check if a document type uses the letter PDF generator
 * (vs the form-filling PDF generator used for N1, N225, etc.)
 */
export function isLetterDocument(docType: DocumentType): boolean {
  return [
    DocumentType.LBA,
    DocumentType.POLITE_CHASER,
    DocumentType.INSTALLMENT_AGREEMENT,
    DocumentType.PART_36_OFFER
  ].includes(docType);
}

/**
 * Estimate PDF size before generation (for UI feedback)
 * Vector PDFs are typically 50-150KB for a 3-page document
 */
export function estimatePdfSize(data: ClaimState): number {
  const baseSize = 30000; // ~30KB base
  const perPage = 15000; // ~15KB per page

  let pages = 1; // Main letter

  // Estimate pages for main letter based on content length
  const contentLength = data.generated?.content?.length || 0;
  if (contentLength > 3000) pages += 1;
  if (contentLength > 6000) pages += 1;

  // Add annex pages for LBA
  if (data.selectedDocType === DocumentType.LBA) {
    pages += 2; // Info sheet + Reply form
  }

  return baseSize + (pages * perPage);
}
