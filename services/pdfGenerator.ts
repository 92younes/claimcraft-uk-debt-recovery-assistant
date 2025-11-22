import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ClaimState, PartyType } from '../types';

// ============================================================================
// PDF FORM SCHEMA DEFINITION
// ============================================================================

interface FieldConfig {
  page: number; // 0-indexed page number
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
  lineHeight?: number;
  isBold?: boolean;
  align?: 'left' | 'right' | 'center';
  getValue: (data: ClaimState) => string | undefined;
}

interface CheckboxConfig {
  page: number;
  x: number;
  y: number;
  size?: number;
  condition: (data: ClaimState) => boolean;
}

interface ImageConfig {
  page: number;
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
  getData: (data: ClaimState) => string | null;
}

// ----------------------------------------------------------------------------
// 1. TEXT FIELDS MAPPING
// ----------------------------------------------------------------------------
const TEXT_FIELDS: Record<string, FieldConfig> = {
  // --- PAGE 1: Claim Form ---
  
  // Header Info
  courtName: {
    page: 0, x: 375, y: 792, size: 10, isBold: true,
    getValue: (d) => "County Court Business Centre" // Centralized processing usually
  },

  // Claimant Details (Top Left Box)
  claimantName: {
    page: 0, x: 45, y: 700, size: 10, isBold: true,
    getValue: (d) => d.claimant.name
  },
  claimantAddress: {
    page: 0, x: 45, y: 686, size: 10,
    getValue: (d) => d.claimant.address
  },
  claimantCity: {
    page: 0, x: 45, y: 672, size: 10,
    getValue: (d) => d.claimant.city
  },
  claimantCounty: {
    page: 0, x: 45, y: 658, size: 10,
    getValue: (d) => d.claimant.county
  },
  claimantPostcode: {
    page: 0, x: 45, y: 644, size: 10,
    getValue: (d) => d.claimant.postcode
  },

  // Defendant Details (Middle Left Box)
  defendantName: {
    page: 0, x: 45, y: 555, size: 10, isBold: true,
    getValue: (d) => d.defendant.name
  },
  defendantAddress: {
    page: 0, x: 45, y: 541, size: 10,
    getValue: (d) => d.defendant.address
  },
  defendantCity: {
    page: 0, x: 45, y: 527, size: 10,
    getValue: (d) => d.defendant.city
  },
  defendantCounty: {
    page: 0, x: 45, y: 513, size: 10,
    getValue: (d) => d.defendant.county
  },
  defendantPostcode: {
    page: 0, x: 45, y: 499, size: 10,
    getValue: (d) => d.defendant.postcode
  },

  // Brief Details (Right Column)
  briefDetails: {
    page: 0, x: 310, y: 680, size: 10, maxWidth: 230, lineHeight: 14,
    getValue: (d) => d.generated?.briefDetails || `Claim for payment of outstanding invoices (Ref: ${d.invoice.invoiceNumber}) regarding provided services/goods.`
  },

  // Value (Bottom Left Text Area)
  valueDescription: {
    page: 0, x: 45, y: 410, size: 10, maxWidth: 230,
    getValue: (d) => {
       const total = d.invoice.totalAmount + d.interest.totalInterest + d.compensation;
       return `The claimant expects to recover £${(total + d.courtFee).toFixed(2)}`;
    }
  },

  // Defendant Service Box (Bottom Left Box)
  defServiceBoxName: {
    page: 0, x: 45, y: 280, size: 10,
    getValue: (d) => d.defendant.name
  },
  defServiceBoxAddress: {
    page: 0, x: 45, y: 265, size: 10,
    getValue: (d) => d.defendant.address
  },
  defServiceBoxPostcode: {
    page: 0, x: 45, y: 220, size: 10,
    getValue: (d) => d.defendant.postcode
  },

  // Financial Totals (Bottom Right Table)
  // Coordinates based on typical PDF grid
  amountClaimed: {
    page: 0, x: 530, y: 260, size: 11, align: 'right',
    getValue: (d) => (d.invoice.totalAmount + d.interest.totalInterest + d.compensation).toFixed(2)
  },
  courtFee: {
    page: 0, x: 530, y: 238, size: 11, align: 'right',
    getValue: (d) => d.courtFee.toFixed(2)
  },
  legalCosts: {
    page: 0, x: 530, y: 216, size: 11, align: 'right',
    getValue: (d) => "0.00"
  },
  totalAmount: {
    page: 0, x: 530, y: 194, size: 11, align: 'right', isBold: true,
    getValue: (d) => {
       const total = d.invoice.totalAmount + d.interest.totalInterest + d.compensation + d.courtFee;
       return total.toFixed(2);
    }
  },

  // --- PAGE 2: Hearing Info ---
  hearingCentre: {
    page: 1, x: 80, y: 735, size: 11,
    getValue: (d) => d.claimant.city ? `${d.claimant.city} County Court` : ''
  },

  // --- PAGE 3: Particulars of Claim ---
  // The large text box
  particulars: {
    page: 2, x: 75, y: 730, size: 10, maxWidth: 460, lineHeight: 14,
    getValue: (d) => d.generated?.content || "Particulars of claim are attached."
  },

  // --- PAGE 4: Statement of Truth ---
  // Signed Date
  dateDay: {
    page: 3, x: 110, y: 440, size: 11,
    getValue: () => new Date().getDate().toString().padStart(2, '0')
  },
  dateMonth: {
    page: 3, x: 160, y: 440, size: 11,
    getValue: () => (new Date().getMonth() + 1).toString().padStart(2, '0')
  },
  dateYear: {
    page: 3, x: 210, y: 440, size: 11,
    getValue: () => new Date().getFullYear().toString()
  },
  
  // Signer Details
  signerName: {
    page: 3, x: 95, y: 405, size: 11,
    getValue: (d) => d.claimant.name
  },
  signerRole: {
    page: 3, x: 95, y: 280, size: 11,
    getValue: (d) => d.claimant.type === PartyType.BUSINESS ? "Director / Authorised Signatory" : ""
  },

  // --- PAGE 5: Service Address ---
  // If applicable (usually filled with Claimant details)
  serviceBuilding: {
    page: 4, x: 95, y: 690, size: 11,
    getValue: (d) => d.claimant.address.split(',')[0]
  },
  serviceStreet: {
    page: 4, x: 95, y: 660, size: 11,
    getValue: (d) => d.claimant.address.split(',').slice(1).join(', ')
  },
  serviceCity: {
    page: 4, x: 95, y: 630, size: 11,
    getValue: (d) => d.claimant.city
  },
  serviceCounty: {
    page: 4, x: 95, y: 600, size: 11,
    getValue: (d) => d.claimant.county
  },
  servicePostcode: {
    page: 4, x: 98, y: 550, size: 14,
    getValue: (d) => d.claimant.postcode.split('').join('  ') // Spaced
  },
  servicePhone: {
    page: 4, x: 250, y: 485, size: 11,
    getValue: (d) => d.claimant.phone || ""
  },
  serviceRef: {
    page: 4, x: 250, y: 415, size: 11,
    getValue: (d) => d.invoice.invoiceNumber || ""
  },
  serviceEmail: {
    page: 4, x: 250, y: 380, size: 11,
    getValue: (d) => d.claimant.email || ""
  }
};

// ----------------------------------------------------------------------------
// 2. CHECKBOX MAPPING
// ----------------------------------------------------------------------------
const CHECKBOX_FIELDS: Record<string, CheckboxConfig> = {
  vulnerableNo: {
    page: 1, x: 132, y: 535, size: 14,
    condition: () => true
  },
  humanRightsNo: {
    page: 1, x: 132, y: 440, size: 14,
    condition: () => true
  },
  // Statement of Truth Checkboxes (Page 4)
  // "I believe" (Top box)
  statementTruthIndividual: {
    page: 3, x: 95, y: 672, size: 14,
    condition: (d) => d.claimant.type === PartyType.INDIVIDUAL
  },
  // "The claimant believes" (Bottom box)
  statementTruthBusiness: {
    page: 3, x: 95, y: 625, size: 14,
    condition: (d) => d.claimant.type !== PartyType.INDIVIDUAL
  },
  // Signer Role Checkbox: "Claimant" (Page 4)
  signerIsClaimant: {
    page: 3, x: 95, y: 495, size: 14,
    condition: () => true
  }
};

// ----------------------------------------------------------------------------
// 3. IMAGE MAPPING (Signature)
// ----------------------------------------------------------------------------
const IMAGE_FIELDS: Record<string, ImageConfig> = {
  signature: {
    page: 3, x: 100, y: 520, maxWidth: 150, maxHeight: 50,
    getData: (d) => d.signature
  }
};


// ============================================================================
// PDF GENERATION LOGIC
// ============================================================================

export const generateN1PDF = async (data: ClaimState): Promise<Uint8Array> => {
  // 1. Load the N1 template from the public folder
  let existingPdfBytes: ArrayBuffer;
  try {
    const res = await fetch('/N1.pdf');
    if (!res.ok) throw new Error("Template file not found");
    existingPdfBytes = await res.arrayBuffer();
  } catch (e) {
    console.error("PDF Load Error:", e);
    throw new Error("Official N1 Form Template (N1.pdf) is missing. Please add it to the public directory.");
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // 2. Process Text Fields
  for (const key in TEXT_FIELDS) {
    const field = TEXT_FIELDS[key];
    const text = field.getValue(data);
    
    if (!text) continue;
    if (field.page >= pages.length) continue;

    const fontToUse = field.isBold ? boldFont : font;
    const fontSize = field.size || 10;
    let xPos = field.x;

    // Handle Right Alignment (calculate width and shift left)
    if (field.align === 'right') {
      const textWidth = fontToUse.widthOfTextAtSize(text, fontSize);
      xPos = field.x - textWidth;
    }

    pages[field.page].drawText(text, {
      x: xPos,
      y: field.y,
      size: fontSize,
      font: fontToUse,
      maxWidth: field.maxWidth,
      lineHeight: field.lineHeight,
      color: rgb(0, 0, 0)
    });
  }

  // 3. Process Checkboxes
  for (const key in CHECKBOX_FIELDS) {
    const box = CHECKBOX_FIELDS[key];
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

  // 4. Process Images (Signatures)
  for (const key in IMAGE_FIELDS) {
    const imgConfig = IMAGE_FIELDS[key];
    const rawData = imgConfig.getData(data);
    
    if (rawData && imgConfig.page < pages.length) {
      try {
        // Handle Data URI scheme (e.g., "data:image/png;base64,...")
        let base64Data = rawData;
        if (rawData.includes('base64,')) {
          base64Data = rawData.split('base64,')[1];
        }

        const image = await pdfDoc.embedPng(base64Data);
        const dims = image.scaleToFit(imgConfig.maxWidth, imgConfig.maxHeight);
        
        pages[imgConfig.page].drawImage(image, {
          x: imgConfig.x,
          y: imgConfig.y,
          width: dims.width,
          height: dims.height
        });
      } catch (e) {
        console.warn(`Failed to embed image for ${key}`, e);
      }
    }
  }

  return await pdfDoc.save();
};