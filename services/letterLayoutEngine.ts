/**
 * Letter Layout Engine
 *
 * Handles text wrapping, page breaks, and positioning for PDF generation.
 * Uses pdf-lib for vector PDF output.
 */

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import {
  LetterPdfContent,
  LetterParagraph,
  PdfLayoutConfig,
  DEFAULT_LETTER_LAYOUT,
  TextRenderOptions,
  InfoSheetContent,
  ReplyFormContent
} from './letterPdfTypes';

/**
 * Layout Engine for rendering letter documents to PDF
 */
export class LetterLayoutEngine {
  private pdfDoc: PDFDocument;
  private currentPage: PDFPage;
  private yPosition: number;
  private config: PdfLayoutConfig;

  // Fonts
  private fontRegular!: PDFFont;
  private fontBold!: PDFFont;
  private fontItalic!: PDFFont;

  constructor(
    pdfDoc: PDFDocument,
    config: PdfLayoutConfig = DEFAULT_LETTER_LAYOUT
  ) {
    this.pdfDoc = pdfDoc;
    this.config = config;
    this.currentPage = pdfDoc.addPage([config.pageWidth, config.pageHeight]);
    this.yPosition = config.pageHeight - config.marginTop;
  }

  /**
   * Initialize fonts (must be called before rendering)
   */
  async initFonts(): Promise<void> {
    this.fontRegular = await this.pdfDoc.embedFont(StandardFonts.TimesRoman);
    this.fontBold = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    this.fontItalic = await this.pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  }

  /**
   * Get content width (page width minus margins)
   */
  get contentWidth(): number {
    return this.config.pageWidth - this.config.marginLeft - this.config.marginRight;
  }

  /**
   * Ensure there's enough space on the page, add new page if needed
   */
  ensureSpace(requiredHeight: number): void {
    if (this.yPosition - requiredHeight < this.config.marginBottom) {
      this.addNewPage();
    }
  }

  /**
   * Add a new page
   */
  addNewPage(): PDFPage {
    this.currentPage = this.pdfDoc.addPage([this.config.pageWidth, this.config.pageHeight]);
    this.yPosition = this.config.pageHeight - this.config.marginTop;
    return this.currentPage;
  }

  /**
   * Move down by specified points
   */
  moveDown(points: number): void {
    this.yPosition -= points;
  }

  /**
   * Get text width for a given string
   */
  getTextWidth(text: string, fontSize: number, bold: boolean = false): number {
    const font = bold ? this.fontBold : this.fontRegular;
    return font.widthOfTextAtSize(text, fontSize);
  }

  /**
   * Wrap text to fit within maxWidth, returning array of lines
   */
  wrapText(text: string, maxWidth: number, fontSize: number, bold: boolean = false): string[] {
    const font = bold ? this.fontBold : this.fontRegular;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Draw text at current position
   */
  drawText(
    text: string,
    options: Partial<TextRenderOptions> = {}
  ): void {
    const {
      fontSize = this.config.fontSizeBody,
      bold = false,
      align = 'left',
      color = { r: 0, g: 0, b: 0 }
    } = options;

    const font = bold ? this.fontBold : this.fontRegular;
    let x = this.config.marginLeft;

    // Calculate x position based on alignment
    if (align === 'right') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      x = this.config.pageWidth - this.config.marginRight - textWidth;
    } else if (align === 'center') {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      x = (this.config.pageWidth - textWidth) / 2;
    }

    this.currentPage.drawText(text, {
      x,
      y: this.yPosition,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b)
    });
  }

  /**
   * Draw a text block with automatic wrapping and page breaks
   */
  drawTextBlock(
    text: string,
    options: Partial<TextRenderOptions> = {}
  ): void {
    const {
      fontSize = this.config.fontSizeBody,
      bold = false,
      lineHeight = this.config.lineHeight,
      maxWidth = this.contentWidth
    } = options;

    const lines = this.wrapText(text, maxWidth, fontSize, bold);
    const lineSpacing = fontSize * lineHeight;

    for (const line of lines) {
      this.ensureSpace(lineSpacing);
      this.drawText(line, { ...options, fontSize, bold });
      this.yPosition -= lineSpacing;
    }
  }

  /**
   * Draw right-aligned text block (for sender address)
   */
  drawRightAlignedBlock(lines: string[], fontSize: number = this.config.fontSizeBody): void {
    const lineSpacing = fontSize * this.config.lineHeight;

    for (const line of lines) {
      this.ensureSpace(lineSpacing);
      this.drawText(line, { fontSize, align: 'right' });
      this.yPosition -= lineSpacing;
    }
  }

  /**
   * Draw sender address block (right-aligned)
   */
  drawSenderBlock(content: LetterPdfContent): void {
    const fontSize = this.config.fontSizeBody;
    const lineSpacing = fontSize * this.config.lineHeight;

    // Sender name (bold)
    this.drawText(content.sender.name, { fontSize, bold: true, align: 'right' });
    this.yPosition -= lineSpacing;

    // Contact name if present
    if (content.sender.contactName) {
      this.drawText(content.sender.contactName, { fontSize, align: 'right' });
      this.yPosition -= lineSpacing;
    }

    // Address lines
    this.drawRightAlignedBlock(content.sender.lines, fontSize);

    // Extra spacing after sender block
    this.moveDown(this.config.paragraphSpacing);
  }

  /**
   * Draw date line (right-aligned)
   */
  drawDateLine(date: string): void {
    this.drawText(date, { fontSize: this.config.fontSizeBody, align: 'right' });
    this.moveDown(this.config.fontSizeBody * this.config.lineHeight);
    this.moveDown(this.config.paragraphSpacing);
  }

  /**
   * Draw recipient address block (left-aligned)
   */
  drawRecipientBlock(content: LetterPdfContent): void {
    const fontSize = this.config.fontSizeBody;
    const lineSpacing = fontSize * this.config.lineHeight;

    // Recipient name (bold)
    this.drawText(content.recipient.name, { fontSize, bold: true });
    this.yPosition -= lineSpacing;

    // Contact name if present
    if (content.recipient.contactName) {
      this.drawText(content.recipient.contactName, { fontSize });
      this.yPosition -= lineSpacing;
    }

    // Address lines
    for (const line of content.recipient.lines) {
      this.drawText(line, { fontSize });
      this.yPosition -= lineSpacing;
    }

    // Extra spacing after recipient block
    this.moveDown(this.config.paragraphSpacing);
  }

  /**
   * Draw reference line (bold, underlined)
   */
  drawReferenceLine(reference: string): void {
    const fontSize = this.config.fontSizeBody;
    this.drawTextBlock(reference, { fontSize, bold: true });
    this.moveDown(this.config.paragraphSpacing);
  }

  /**
   * Draw salutation
   */
  drawSalutation(salutation: string): void {
    this.drawText(salutation, { fontSize: this.config.fontSizeBody });
    this.moveDown(this.config.fontSizeBody * this.config.lineHeight);
    this.moveDown(this.config.paragraphSpacing);
  }

  /**
   * Draw body paragraphs with proper formatting
   */
  drawBodyParagraphs(paragraphs: LetterParagraph[]): void {
    for (const para of paragraphs) {
      // Handle headings
      if (para.isHeading) {
        this.ensureSpace(this.config.fontSizeHeading2 * 2);
        this.moveDown(this.config.paragraphSpacing / 2);
        this.drawTextBlock(para.text, {
          fontSize: this.config.fontSizeHeading2,
          bold: true
        });
        this.moveDown(this.config.paragraphSpacing / 2);
        continue;
      }

      // Handle bullet lists
      if (para.isBulletList && para.bulletItems) {
        for (const item of para.bulletItems) {
          this.ensureSpace(this.config.fontSizeBody * this.config.lineHeight);

          // Draw bullet
          this.currentPage.drawText('•', {
            x: this.config.marginLeft,
            y: this.yPosition,
            size: this.config.fontSizeBody,
            font: this.fontRegular,
            color: rgb(0, 0, 0)
          });

          // Draw item text with indent
          const indent = 15;
          const lines = this.wrapText(item, this.contentWidth - indent, this.config.fontSizeBody);
          const lineSpacing = this.config.fontSizeBody * this.config.lineHeight;

          for (let i = 0; i < lines.length; i++) {
            if (i > 0) {
              this.ensureSpace(lineSpacing);
            }
            this.currentPage.drawText(lines[i], {
              x: this.config.marginLeft + indent,
              y: this.yPosition,
              size: this.config.fontSizeBody,
              font: this.fontRegular,
              color: rgb(0, 0, 0)
            });
            this.yPosition -= lineSpacing;
          }
        }
        this.moveDown(this.config.paragraphSpacing / 2);
        continue;
      }

      // Regular paragraph
      if (para.text) {
        this.drawTextBlock(para.text, {
          fontSize: this.config.fontSizeBody,
          bold: para.bold
        });
        this.moveDown(this.config.paragraphSpacing);
      }
    }
  }

  /**
   * Draw closing and signature block
   */
  drawClosingBlock(content: LetterPdfContent): void {
    const fontSize = this.config.fontSizeBody;
    const lineSpacing = fontSize * this.config.lineHeight;

    // Closing phrase
    this.drawText(content.closing, { fontSize });
    this.yPosition -= lineSpacing;
    this.moveDown(this.config.paragraphSpacing);

    // Signature image if present
    if (content.signatureImage) {
      // Reserve space for signature (approximately 50 points height)
      this.ensureSpace(60);
      // Signature rendering would go here
      // For now, leave space
      this.moveDown(40);
    } else {
      // Leave space for handwritten signature
      this.moveDown(40);
    }

    // Signer name
    this.drawText(content.signerName, { fontSize, bold: true });
    this.yPosition -= lineSpacing;

    // Signer title if present
    if (content.signerTitle) {
      this.drawText(content.signerTitle, { fontSize });
      this.yPosition -= lineSpacing;
    }
  }

  /**
   * Draw enclosures list
   */
  drawEnclosures(enclosures: string[]): void {
    if (!enclosures || enclosures.length === 0) return;

    this.moveDown(this.config.paragraphSpacing);

    // Draw separator line
    this.currentPage.drawLine({
      start: { x: this.config.marginLeft, y: this.yPosition },
      end: { x: this.config.marginLeft + 100, y: this.yPosition },
      thickness: 0.5,
      color: rgb(0, 0, 0)
    });

    this.moveDown(this.config.paragraphSpacing);

    const fontSize = this.config.fontSizeSmall;
    const lineSpacing = fontSize * this.config.lineHeight;

    this.drawText('Enclosures:', { fontSize, bold: true });
    this.yPosition -= lineSpacing;

    for (const enc of enclosures) {
      this.drawText(`• ${enc}`, { fontSize });
      this.yPosition -= lineSpacing;
    }
  }

  /**
   * Draw Info Sheet page (Annex 1)
   */
  drawInfoSheetPage(infoSheet: InfoSheetContent): void {
    this.addNewPage();

    const headingSize = this.config.fontSizeHeading1;
    const bodySize = this.config.fontSizeBody;
    const lineSpacing = bodySize * this.config.lineHeight;

    // Title
    this.drawText(infoSheet.title, {
      fontSize: headingSize,
      bold: true,
      align: 'center'
    });
    this.moveDown(headingSize * this.config.lineHeight);
    this.moveDown(this.config.paragraphSpacing);

    // Warning box
    const warningBoxHeight = 60;
    this.ensureSpace(warningBoxHeight);

    // Draw warning box border
    this.currentPage.drawRectangle({
      x: this.config.marginLeft,
      y: this.yPosition - warningBoxHeight + 10,
      width: this.contentWidth,
      height: warningBoxHeight,
      borderColor: rgb(0.8, 0.2, 0.2),
      borderWidth: 2,
      color: rgb(1, 0.95, 0.95)
    });

    // Warning text inside box
    this.yPosition -= 20;
    const warningLines = this.wrapText(infoSheet.warningText, this.contentWidth - 20, bodySize, true);
    for (const line of warningLines) {
      this.currentPage.drawText(line, {
        x: this.config.marginLeft + 10,
        y: this.yPosition,
        size: bodySize,
        font: this.fontBold,
        color: rgb(0.6, 0, 0)
      });
      this.yPosition -= lineSpacing;
    }
    this.yPosition -= (warningBoxHeight - 40);
    this.moveDown(this.config.paragraphSpacing);

    // Help organizations section
    this.drawText('WHERE TO GET FREE HELP', {
      fontSize: this.config.fontSizeHeading2,
      bold: true
    });
    this.moveDown(this.config.fontSizeHeading2 * this.config.lineHeight);
    this.moveDown(this.config.paragraphSpacing / 2);

    for (const org of infoSheet.helpOrganizations) {
      this.ensureSpace(lineSpacing * 3);

      // Organization name
      this.drawText(org.name, { fontSize: bodySize, bold: true });
      this.yPosition -= lineSpacing;

      // Phone
      if (org.phone) {
        this.drawText(`Phone: ${org.phone}`, { fontSize: bodySize });
        this.yPosition -= lineSpacing;
      }

      // Website
      if (org.website) {
        this.drawText(`Website: ${org.website}`, { fontSize: bodySize });
        this.yPosition -= lineSpacing;
      }

      // Description
      if (org.description) {
        this.drawText(org.description, { fontSize: this.config.fontSizeSmall });
        this.yPosition -= this.config.fontSizeSmall * this.config.lineHeight;
      }

      this.moveDown(this.config.paragraphSpacing / 2);
    }

    // Additional info
    this.moveDown(this.config.paragraphSpacing);
    for (const info of infoSheet.additionalInfo) {
      this.drawTextBlock(`• ${info}`, { fontSize: bodySize });
    }
  }

  /**
   * Draw Reply Form page (Annex 2)
   */
  drawReplyFormPage(replyForm: ReplyFormContent): void {
    this.addNewPage();

    const headingSize = this.config.fontSizeHeading1;
    const subheadingSize = this.config.fontSizeHeading2;
    const bodySize = this.config.fontSizeBody;
    const lineSpacing = bodySize * this.config.lineHeight;

    // Title
    this.drawText(replyForm.title, {
      fontSize: headingSize,
      bold: true,
      align: 'center'
    });
    this.moveDown(headingSize * this.config.lineHeight);
    this.moveDown(this.config.paragraphSpacing);

    // Claim details
    this.drawText(`To: ${replyForm.claimantName}`, { fontSize: bodySize });
    this.yPosition -= lineSpacing;
    this.drawText(`From: ${replyForm.debtorName}`, { fontSize: bodySize });
    this.yPosition -= lineSpacing;
    this.drawText(`Amount Claimed: ${replyForm.claimAmount}`, { fontSize: bodySize, bold: true });
    this.yPosition -= lineSpacing;
    this.drawText(`Invoice Reference: ${replyForm.invoiceRef}`, { fontSize: bodySize });
    this.moveDown(this.config.paragraphSpacing);

    // Sections
    for (const section of replyForm.sections) {
      this.ensureSpace(subheadingSize * 3);

      // Section title
      this.drawText(section.title, { fontSize: subheadingSize, bold: true });
      this.yPosition -= subheadingSize * this.config.lineHeight;

      // Instructions
      if (section.instructions) {
        this.drawTextBlock(section.instructions, { fontSize: bodySize });
      }

      // Options with checkboxes
      if (section.options) {
        for (const option of section.options) {
          this.ensureSpace(lineSpacing * 2);

          if (option.hasCheckbox) {
            // Draw checkbox
            this.currentPage.drawRectangle({
              x: this.config.marginLeft,
              y: this.yPosition - 3,
              width: 12,
              height: 12,
              borderColor: rgb(0, 0, 0),
              borderWidth: 1
            });

            // Draw label
            const labelLines = this.wrapText(option.label, this.contentWidth - 20, bodySize);
            for (let i = 0; i < labelLines.length; i++) {
              this.currentPage.drawText(labelLines[i], {
                x: this.config.marginLeft + 18,
                y: this.yPosition,
                size: bodySize,
                font: this.fontRegular,
                color: rgb(0, 0, 0)
              });
              this.yPosition -= lineSpacing;
            }
          } else {
            // Just text (input field style)
            this.drawTextBlock(option.label, { fontSize: bodySize });
          }

          this.moveDown(4);
        }
      }

      // Signature and date lines
      if (section.hasSignatureLine) {
        this.ensureSpace(50);
        this.moveDown(this.config.paragraphSpacing);

        this.drawText('Signature: _______________________', { fontSize: bodySize });
        this.yPosition -= lineSpacing * 1.5;
      }

      if (section.hasDateLine) {
        this.drawText('Date: _______________________', { fontSize: bodySize });
        this.yPosition -= lineSpacing;
      }

      this.moveDown(this.config.paragraphSpacing);
    }
  }

  /**
   * Add page numbers to all pages ("Page X of Y")
   */
  addPageNumbers(): void {
    const pages = this.pdfDoc.getPages();
    const totalPages = pages.length;

    pages.forEach((page, index) => {
      const text = `Page ${index + 1} of ${totalPages}`;
      const textWidth = this.fontRegular.widthOfTextAtSize(text, 9);

      page.drawText(text, {
        x: (this.config.pageWidth - textWidth) / 2,
        y: 30, // 30 points from bottom
        size: 9,
        font: this.fontRegular,
        color: rgb(0.4, 0.4, 0.4)
      });
    });
  }

  /**
   * Embed and draw signature image
   */
  async embedSignature(signatureBase64: string): Promise<void> {
    try {
      // Remove data URL prefix if present
      let base64Data = signatureBase64;
      let isPng = true;

      if (signatureBase64.startsWith('data:')) {
        const matches = signatureBase64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
        if (matches) {
          isPng = matches[1] === 'png';
          base64Data = matches[2];
        } else {
          // Try to extract base64 anyway
          base64Data = signatureBase64.split(',')[1] || signatureBase64;
        }
      }

      // Decode base64 to Uint8Array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Embed the image
      const image = isPng
        ? await this.pdfDoc.embedPng(bytes)
        : await this.pdfDoc.embedJpg(bytes);

      // Calculate dimensions (max height 40 points, maintain aspect ratio)
      const maxHeight = 40;
      const maxWidth = 150;
      const aspectRatio = image.width / image.height;

      let drawHeight = maxHeight;
      let drawWidth = drawHeight * aspectRatio;

      if (drawWidth > maxWidth) {
        drawWidth = maxWidth;
        drawHeight = drawWidth / aspectRatio;
      }

      // Ensure space and draw
      this.ensureSpace(drawHeight + 10);

      this.currentPage.drawImage(image, {
        x: this.config.marginLeft,
        y: this.yPosition - drawHeight,
        width: drawWidth,
        height: drawHeight
      });

      this.yPosition -= drawHeight + 5;
    } catch (error) {
      console.warn('Failed to embed signature image:', error);
      // Fall back to leaving space
      this.moveDown(40);
    }
  }

  /**
   * Draw a two-column table (for debt details)
   */
  drawTable(rows: { label: string; value: string; bold?: boolean }[]): void {
    const fontSize = this.config.fontSizeBody;
    const lineSpacing = fontSize * this.config.lineHeight + 4; // Extra padding
    const labelWidth = 180; // Fixed width for labels
    const valueX = this.config.marginLeft + labelWidth;

    for (const row of rows) {
      this.ensureSpace(lineSpacing);

      const font = row.bold ? this.fontBold : this.fontRegular;

      // Draw label (left-aligned)
      this.currentPage.drawText(row.label, {
        x: this.config.marginLeft,
        y: this.yPosition,
        size: fontSize,
        font: row.bold ? this.fontBold : this.fontRegular,
        color: rgb(0, 0, 0)
      });

      // Draw value (right side, can be right-aligned for numbers)
      const isAmount = row.value.startsWith('£') || row.value.startsWith('$') || row.value.startsWith('€');
      if (isAmount) {
        // Right-align amounts
        const valueWidth = font.widthOfTextAtSize(row.value, fontSize);
        const rightEdge = this.config.pageWidth - this.config.marginRight;
        this.currentPage.drawText(row.value, {
          x: rightEdge - valueWidth,
          y: this.yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      } else {
        // Left-align other values
        this.currentPage.drawText(row.value, {
          x: valueX,
          y: this.yPosition,
          size: fontSize,
          font,
          color: rgb(0, 0, 0)
        });
      }

      this.yPosition -= lineSpacing;
    }

    this.moveDown(this.config.paragraphSpacing / 2);
  }

  /**
   * Get the PDF document
   */
  getDocument(): PDFDocument {
    return this.pdfDoc;
  }

  /**
   * Get current page
   */
  getCurrentPage(): PDFPage {
    return this.currentPage;
  }
}
