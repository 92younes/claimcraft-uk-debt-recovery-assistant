import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ClaimState, PartyType } from '../types';

// ============================================================================
// N1 FORM FILLABLE FIELD MAPPING
// ============================================================================
// Field IDs extracted from N1.pdf (version 12.24) using pypdf
// These are the actual AcroForm field names in the PDF
// ============================================================================

interface FillableFieldConfig {
  fieldId: string;
  getValue: (data: ClaimState) => string;
}

interface CheckboxFieldConfig {
  fieldId: string;
  condition: (data: ClaimState) => boolean;
}

// Text field mappings - fieldId matches the actual PDF form field name
const N1_TEXT_FIELDS: FillableFieldConfig[] = [
  // Page 1: Claim Form
  {
    fieldId: 'Text35', // "In the" court name
    getValue: () => 'County Court Business Centre'
  },
  {
    fieldId: 'Text21', // Claimant details box
    getValue: (d) => {
      const parts = [d.claimant.name];
      if (d.claimant.address) parts.push(d.claimant.address);
      if (d.claimant.city) parts.push(d.claimant.city);
      if (d.claimant.county) parts.push(d.claimant.county);
      if (d.claimant.postcode) parts.push(d.claimant.postcode);
      return parts.join('\n');
    }
  },
  {
    fieldId: 'Text22', // Defendant details box
    getValue: (d) => {
      const parts = [d.defendant.name];
      if (d.defendant.address) parts.push(d.defendant.address);
      if (d.defendant.city) parts.push(d.defendant.city);
      if (d.defendant.county) parts.push(d.defendant.county);
      if (d.defendant.postcode) parts.push(d.defendant.postcode);
      return parts.join('\n');
    }
  },
  {
    fieldId: 'Text23', // Brief details of claim
    getValue: (d) => d.generated?.briefDetails ||
      `Claim for payment of outstanding invoices (Ref: ${d.invoice.invoiceNumber}) regarding provided services/goods.`
  },
  {
    fieldId: 'Text24', // Value box
    getValue: (d) => {
      const total = d.invoice.totalAmount + d.interest.totalInterest + d.compensation;
      return `The claimant expects to recover £${(total + d.courtFee).toFixed(2)}`;
    }
  },
  {
    fieldId: 'Text25', // Amount claimed
    getValue: (d) => (d.invoice.totalAmount + d.interest.totalInterest + d.compensation).toFixed(2)
  },
  {
    fieldId: 'Text26', // Court fee
    getValue: (d) => d.courtFee.toFixed(2)
  },
  {
    fieldId: 'Text27', // Legal representative's costs
    getValue: () => '0.00'
  },
  {
    fieldId: 'Text28', // Total amount
    getValue: (d) => {
      const total = d.invoice.totalAmount + d.interest.totalInterest + d.compensation + d.courtFee;
      return total.toFixed(2);
    }
  },
  {
    fieldId: 'Text Field 48', // Defendant's service address box
    getValue: (d) => {
      const parts = [d.defendant.name];
      if (d.defendant.address) parts.push(d.defendant.address);
      if (d.defendant.city) parts.push(d.defendant.city);
      if (d.defendant.postcode) parts.push(d.defendant.postcode);
      return parts.join('\n');
    }
  },

  // Page 2: Hearing Centre & Questions
  {
    fieldId: 'Text Field 28', // Preferred County Court Hearing Centre
    getValue: (d) => d.claimant.city ? `${d.claimant.city} County Court` : 'County Court Business Centre'
  },

  // Page 3: Particulars of Claim
  {
    fieldId: 'Text30', // Particulars of claim text area
    getValue: (d) => d.generated?.content || 'Particulars of claim are attached.'
  },

  // Page 4: Statement of Truth
  {
    fieldId: 'Text31', // Day
    getValue: () => new Date().getDate().toString().padStart(2, '0')
  },
  {
    fieldId: 'Text32', // Month
    getValue: () => (new Date().getMonth() + 1).toString().padStart(2, '0')
  },
  {
    fieldId: 'Text33', // Year
    getValue: () => new Date().getFullYear().toString()
  },
  {
    fieldId: 'Text Field 46', // Full name
    getValue: (d) => d.claimant.name
  },
  {
    fieldId: 'Text Field 44', // Position/office held
    getValue: (d) => d.claimant.type === PartyType.BUSINESS ? 'Director / Authorised Signatory' : ''
  },

  // Page 5: Claimant's Service Address
  {
    fieldId: 'Text Field 10', // Building and street
    getValue: (d) => d.claimant.address?.split(',')[0] || d.claimant.address || ''
  },
  {
    fieldId: 'Text Field 9', // Second line of address
    getValue: (d) => {
      const parts = d.claimant.address?.split(',');
      return parts && parts.length > 1 ? parts.slice(1).join(', ').trim() : '';
    }
  },
  {
    fieldId: 'Text Field 8', // Town or city
    getValue: (d) => d.claimant.city || ''
  },
  {
    fieldId: 'Text Field 7', // County
    getValue: (d) => d.claimant.county || ''
  },
  {
    fieldId: 'Text34', // Postcode
    getValue: (d) => d.claimant.postcode || ''
  },
  {
    fieldId: 'Text Field 6', // Phone number
    getValue: (d) => d.claimant.phone || ''
  },
  {
    fieldId: 'Text Field 3', // Your Ref
    getValue: (d) => d.invoice.invoiceNumber || ''
  },
  {
    fieldId: 'Text Field 2', // Email
    getValue: (d) => d.claimant.email || ''
  }
];

// Checkbox field mappings
const N1_CHECKBOX_FIELDS: CheckboxFieldConfig[] = [
  // Page 2: Vulnerability & Human Rights
  {
    fieldId: 'Check Box40', // Vulnerability - No
    condition: () => true // Default to No
  },
  {
    fieldId: 'Check Box42', // Human Rights - No
    condition: () => true // Default to No
  },

  // Page 3: Particulars of Claim
  {
    fieldId: 'Check Box43', // Attached checkbox
    condition: (d) => !!(d.generated?.content)
  },

  // Page 4: Statement of Truth
  {
    fieldId: 'Check Box45', // "I believe" (individual)
    condition: (d) => d.claimant.type === PartyType.INDIVIDUAL
  },
  {
    fieldId: 'Check Box46', // "The claimant believes" (business/authorised)
    condition: (d) => d.claimant.type !== PartyType.INDIVIDUAL
  },
  {
    fieldId: 'Check Box47', // Claimant checkbox
    condition: (d) => d.claimant.type === PartyType.INDIVIDUAL
  }
];

// ============================================================================
// PDF GENERATION LOGIC - Using Fillable Form Fields
// ============================================================================

export const generateN1PDF = async (data: ClaimState): Promise<Uint8Array> => {
  // 1. Load the N1 template from the public folder
  let existingPdfBytes: ArrayBuffer;
  try {
    const res = await fetch('/N1.pdf');
    if (!res.ok) throw new Error('Template file not found');
    existingPdfBytes = await res.arrayBuffer();
  } catch (e) {
    console.error('PDF Load Error:', e);
    throw new Error('Official N1 Form Template (N1.pdf) is missing. Please add it to the public directory.');
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();

  console.log(`📄 N1 PDF has ${pages.length} pages`);

  // 2. Fill text fields using AcroForm field names
  for (const fieldConfig of N1_TEXT_FIELDS) {
    try {
      const field = form.getTextField(fieldConfig.fieldId);
      const value = fieldConfig.getValue(data);
      if (value) {
        field.setText(value);
        console.log(`✅ N1 Field '${fieldConfig.fieldId}' filled`);
      }
    } catch (e) {
      console.warn(`⚠️ N1 Field '${fieldConfig.fieldId}' not found or error:`, e);
    }
  }

  // 3. Fill checkbox fields
  for (const checkConfig of N1_CHECKBOX_FIELDS) {
    try {
      const field = form.getCheckBox(checkConfig.fieldId);
      if (checkConfig.condition(data)) {
        field.check();
        console.log(`✅ N1 Checkbox '${checkConfig.fieldId}' checked`);
      } else {
        field.uncheck();
      }
    } catch (e) {
      console.warn(`⚠️ N1 Checkbox '${checkConfig.fieldId}' not found or error:`, e);
    }
  }

  // 4. Handle signature image (draw on page since it's not a form field)
  if (data.signature && pages.length >= 4) {
    try {
      let base64Data = data.signature;
      if (data.signature.includes('base64,')) {
        base64Data = data.signature.split('base64,')[1];
      }

      const image = await pdfDoc.embedPng(base64Data);
      const dims = image.scaleToFit(180, 45);

      // Signature box is on page 4 (index 3), field "Text Field 47" area
      // rect: [54.5669, 517.485, 309.685, 562.839]
      pages[3].drawImage(image, {
        x: 60,
        y: 520,
        width: dims.width,
        height: dims.height
      });
      console.log('✅ N1 Signature image embedded');
    } catch (e) {
      console.warn('Failed to embed signature image:', e);
    }
  }

  // 5. Flatten the form to prevent further editing (optional)
  // form.flatten(); // Uncomment if you want to lock the form

  return await pdfDoc.save();
};


// ============================================================================
// FORM N225 - DEFAULT JUDGMENT PDF GENERATOR
// ============================================================================

interface N225FieldConfig {
  page: number;
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
  isBold?: boolean;
  getValue: (data: ClaimState) => string;
}

interface CheckboxConfig {
  page: number;
  x: number;
  y: number;
  size?: number;
  condition: (data: ClaimState) => boolean;
}

const N225_TEXT_FIELDS: Record<string, N225FieldConfig> = {
  // Page 1 - Header
  claimNumber: {
    page: 0, x: 400, y: 770, size: 11, isBold: true,
    getValue: () => '[TO BE ALLOCATED]'
  },

  // Claimant Details
  claimantName: {
    page: 0, x: 100, y: 720, size: 11, isBold: true,
    getValue: (d) => d.claimant.name
  },
  claimantAddress: {
    page: 0, x: 100, y: 705, size: 10,
    getValue: (d) => `${d.claimant.address}, ${d.claimant.city}, ${d.claimant.county}, ${d.claimant.postcode}`
  },

  // Defendant Details
  defendantName: {
    page: 0, x: 100, y: 660, size: 11, isBold: true,
    getValue: (d) => d.defendant.name
  },
  defendantAddress: {
    page: 0, x: 100, y: 645, size: 10,
    getValue: (d) => `${d.defendant.address}, ${d.defendant.city}, ${d.defendant.county}, ${d.defendant.postcode}`
  },

  // Amount Claimed Section
  principalAmount: {
    page: 0, x: 450, y: 450, size: 11,
    getValue: (d) => `£${d.invoice.totalAmount.toFixed(2)}`
  },
  interestAmount: {
    page: 0, x: 450, y: 430, size: 11,
    getValue: (d) => `£${d.interest.totalInterest.toFixed(2)}`
  },
  courtFeeAmount: {
    page: 0, x: 450, y: 410, size: 11,
    getValue: (d) => `£${d.courtFee.toFixed(2)}`
  },
  totalJudgment: {
    page: 0, x: 450, y: 385, size: 12, isBold: true,
    getValue: (d) => `£${(d.invoice.totalAmount + d.interest.totalInterest + d.courtFee).toFixed(2)}`
  },

  // Continuing Interest
  dailyInterestRate: {
    page: 0, x: 300, y: 340, size: 10,
    getValue: (d) => `£${d.interest.dailyRate.toFixed(4)}`
  },

  // Statement of Truth - Date
  truthDate: {
    page: 0, x: 400, y: 200, size: 10,
    getValue: () => new Date().toLocaleDateString('en-GB')
  },

  // Signature Name
  signerName: {
    page: 0, x: 100, y: 180, size: 11,
    getValue: (d) => d.claimant.name
  }
};

const N225_CHECKBOXES: Record<string, CheckboxConfig> = {
  statementOfTruth: {
    page: 0, x: 80, y: 220, size: 14,
    condition: () => true
  }
};

export const generateN225PDF = async (data: ClaimState): Promise<Uint8Array> => {
  let existingPdfBytes: ArrayBuffer;
  try {
    const res = await fetch('/N225.pdf');
    if (!res.ok) throw new Error('N225 template not found');
    existingPdfBytes = await res.arrayBuffer();
  } catch (e) {
    console.error('N225 PDF Load Error:', e);
    throw new Error('Official N225 Form Template (N225.pdf) is missing.');
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Fill text fields
  for (const key in N225_TEXT_FIELDS) {
    const field = N225_TEXT_FIELDS[key];
    const text = field.getValue(data);
    if (text && field.page < pages.length) {
      pages[field.page].drawText(text, {
        x: field.x,
        y: field.y,
        size: field.size || 10,
        font: field.isBold ? boldFont : font,
        maxWidth: field.maxWidth,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Fill checkboxes
  for (const key in N225_CHECKBOXES) {
    const box = N225_CHECKBOXES[key];
    if (box.condition(data) && box.page < pages.length) {
      pages[box.page].drawText('X', {
        x: box.x,
        y: box.y,
        size: box.size || 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Add signature if available
  if (data.signature && pages.length > 0) {
    try {
      let base64Data = data.signature;
      if (data.signature.includes('base64,')) {
        base64Data = data.signature.split('base64,')[1];
      }
      const image = await pdfDoc.embedPng(base64Data);
      const dims = image.scaleToFit(120, 40);
      pages[0].drawImage(image, {
        x: 100,
        y: 160,
        width: dims.width,
        height: dims.height
      });
    } catch (e) {
      console.warn('Failed to embed signature on N225', e);
    }
  }

  return await pdfDoc.save();
};


// ============================================================================
// FORM N225A - ADMISSION JUDGMENT PDF GENERATOR
// ============================================================================

const N225A_TEXT_FIELDS: Record<string, N225FieldConfig> = {
  // Header
  claimNumber: {
    page: 0, x: 400, y: 770, size: 11, isBold: true,
    getValue: () => '[TO BE ALLOCATED]'
  },

  // Parties
  claimantName: {
    page: 0, x: 100, y: 720, size: 11, isBold: true,
    getValue: (d) => d.claimant.name
  },
  defendantName: {
    page: 0, x: 100, y: 680, size: 11, isBold: true,
    getValue: (d) => d.defendant.name
  },

  // Admission Details
  admissionDate: {
    page: 0, x: 250, y: 600, size: 10,
    getValue: () => '[DATE DEFENDANT ADMITTED]'
  },
  amountAdmitted: {
    page: 0, x: 250, y: 580, size: 11,
    getValue: (d) => `£${(d.invoice.totalAmount + d.interest.totalInterest + d.courtFee).toFixed(2)}`
  },
  defendantProposal: {
    page: 0, x: 100, y: 545, size: 10, maxWidth: 400,
    getValue: () => '[DEFENDANT\'S PROPOSED PAYMENT TERMS]'
  },

  // Claimant's Position
  rejectionReasons: {
    page: 0, x: 100, y: 480, size: 10, maxWidth: 400,
    getValue: () => 'The proposed payment terms are inadequate given the defendant\'s financial position and the age of the debt.'
  },

  // Claimant's Proposal
  claimantPaymentTerms: {
    page: 0, x: 100, y: 420, size: 10, maxWidth: 400,
    getValue: () => 'Payment in full within 14 days, or monthly installments of £[AMOUNT] (to be determined based on defendant\'s means)'
  },

  // Total Amount
  totalAmount: {
    page: 0, x: 450, y: 380, size: 12, isBold: true,
    getValue: (d) => `£${(d.invoice.totalAmount + d.interest.totalInterest + d.courtFee).toFixed(2)}`
  },

  // Statement of Truth
  truthDate: {
    page: 0, x: 400, y: 200, size: 10,
    getValue: () => new Date().toLocaleDateString('en-GB')
  },
  signerName: {
    page: 0, x: 100, y: 180, size: 11,
    getValue: (d) => d.claimant.name
  }
};

const N225A_CHECKBOXES: Record<string, CheckboxConfig> = {
  statementOfTruth: {
    page: 0, x: 80, y: 220, size: 14,
    condition: () => true
  }
};

export const generateN225APDF = async (data: ClaimState): Promise<Uint8Array> => {
  let existingPdfBytes: ArrayBuffer;
  try {
    const res = await fetch('/N225A.pdf');
    if (!res.ok) throw new Error('N225A template not found');
    existingPdfBytes = await res.arrayBuffer();
  } catch (e) {
    console.error('N225A PDF Load Error:', e);
    throw new Error('Official N225A Form Template (N225A.pdf) is missing.');
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Fill text fields
  for (const key in N225A_TEXT_FIELDS) {
    const field = N225A_TEXT_FIELDS[key];
    const text = field.getValue(data);
    if (text && field.page < pages.length) {
      pages[field.page].drawText(text, {
        x: field.x,
        y: field.y,
        size: field.size || 10,
        font: field.isBold ? boldFont : font,
        maxWidth: field.maxWidth,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Fill checkboxes
  for (const key in N225A_CHECKBOXES) {
    const box = N225A_CHECKBOXES[key];
    if (box.condition(data) && box.page < pages.length) {
      pages[box.page].drawText('X', {
        x: box.x,
        y: box.y,
        size: box.size || 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Add signature
  if (data.signature && pages.length > 0) {
    try {
      let base64Data = data.signature;
      if (data.signature.includes('base64,')) {
        base64Data = data.signature.split('base64,')[1];
      }
      const image = await pdfDoc.embedPng(base64Data);
      const dims = image.scaleToFit(120, 40);
      pages[0].drawImage(image, {
        x: 100,
        y: 160,
        width: dims.width,
        height: dims.height
      });
    } catch (e) {
      console.warn('Failed to embed signature on N225A', e);
    }
  }

  return await pdfDoc.save();
};


// ============================================================================
// FORM N180 - DIRECTIONS QUESTIONNAIRE PDF GENERATOR
// ============================================================================

const N180_TEXT_FIELDS: Record<string, N225FieldConfig> = {
  // Header
  claimNumber: {
    page: 0, x: 400, y: 770, size: 11, isBold: true,
    getValue: () => '[TO BE ALLOCATED]'
  },
  claimantName: {
    page: 0, x: 100, y: 735, size: 11, isBold: true,
    getValue: (d) => d.claimant.name
  },
  defendantName: {
    page: 0, x: 100, y: 710, size: 11, isBold: true,
    getValue: (d) => d.defendant.name
  },

  // Track Allocation
  claimValue: {
    page: 0, x: 250, y: 640, size: 11,
    getValue: (d) => `£${d.invoice.totalAmount.toFixed(2)}`
  },

  // Witnesses
  witnessCount: {
    page: 0, x: 450, y: 560, size: 11,
    getValue: () => '1'
  },
  witnessName1: {
    page: 0, x: 120, y: 535, size: 10,
    getValue: (d) => `${d.claimant.name} (Claimant)`
  },

  // Hearing
  hearingDuration: {
    page: 0, x: 350, y: 460, size: 11,
    getValue: () => '1'
  },
  unavailableDates: {
    page: 0, x: 100, y: 430, size: 10, maxWidth: 400,
    getValue: () => '[List any dates you cannot attend]'
  },

  // Documents
  documentsList: {
    page: 0, x: 100, y: 350, size: 10, maxWidth: 400,
    getValue: (d) => `Invoice ${d.invoice.invoiceNumber}, Proof of delivery/service, Letter Before Action, Payment reminders`
  },

  // Statement of Truth
  truthDate: {
    page: 0, x: 400, y: 180, size: 10,
    getValue: () => new Date().toLocaleDateString('en-GB')
  },
  signerName: {
    page: 0, x: 100, y: 160, size: 11,
    getValue: (d) => d.claimant.name
  }
};

const N180_CHECKBOXES: Record<string, CheckboxConfig> = {
  // Section A - Settlement
  settlementStayYes: {
    page: 0, x: 420, y: 680, size: 12,
    condition: () => true
  },
  mediationYes: {
    page: 0, x: 420, y: 660, size: 12,
    condition: () => true
  },

  // Section B - Track
  smallClaimsTrack: {
    page: 0, x: 250, y: 620, size: 12,
    condition: () => true
  },

  // Section D - Experts
  expertsNo: {
    page: 0, x: 180, y: 500, size: 12,
    condition: () => true
  },

  // Section E - Special Requirements
  disabilityNo: {
    page: 0, x: 180, y: 405, size: 12,
    condition: () => true
  },

  // Section G - Costs
  lossOfEarningsNo: {
    page: 0, x: 180, y: 310, size: 12,
    condition: () => true
  },

  // Statement of Truth
  statementOfTruth: {
    page: 0, x: 80, y: 200, size: 14,
    condition: () => true
  }
};

export const generateN180PDF = async (data: ClaimState): Promise<Uint8Array> => {
  let existingPdfBytes: ArrayBuffer;
  try {
    const res = await fetch('/N180.pdf');
    if (!res.ok) throw new Error('N180 template not found');
    existingPdfBytes = await res.arrayBuffer();
  } catch (e) {
    console.error('N180 PDF Load Error:', e);
    throw new Error('Official N180 Form Template (N180.pdf) is missing.');
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Fill text fields
  for (const key in N180_TEXT_FIELDS) {
    const field = N180_TEXT_FIELDS[key];
    const text = field.getValue(data);
    if (text && field.page < pages.length) {
      pages[field.page].drawText(text, {
        x: field.x,
        y: field.y,
        size: field.size || 10,
        font: field.isBold ? boldFont : font,
        maxWidth: field.maxWidth,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Fill checkboxes
  for (const key in N180_CHECKBOXES) {
    const box = N180_CHECKBOXES[key];
    if (box.condition(data) && box.page < pages.length) {
      pages[box.page].drawText('X', {
        x: box.x,
        y: box.y,
        size: box.size || 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
    }
  }

  // Add signature
  if (data.signature && pages.length > 0) {
    try {
      let base64Data = data.signature;
      if (data.signature.includes('base64,')) {
        base64Data = data.signature.split('base64,')[1];
      }
      const image = await pdfDoc.embedPng(base64Data);
      const dims = image.scaleToFit(120, 40);
      pages[0].drawImage(image, {
        x: 100,
        y: 140,
        width: dims.width,
        height: dims.height
      });
    } catch (e) {
      console.warn('Failed to embed signature on N180', e);
    }
  }

  return await pdfDoc.save();
};
