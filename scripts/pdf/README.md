# PDF Form Scripts

This directory contains Python scripts for analyzing and filling PDF forms.

## N1.pdf Field Information

The N1.pdf form (version 12.24) has **43 fillable AcroForm fields**. The field mapping has been extracted to `n1_fields.json`.

### Key Field IDs:

**Page 1 (Claim Form):**
- `Text35` - Court name ("In the" field)
- `Text21` - Claimant details box
- `Text22` - Defendant details box
- `Text23` - Brief details of claim
- `Text24` - Value box
- `Text25` - Amount claimed
- `Text26` - Court fee
- `Text27` - Legal rep costs
- `Text28` - Total amount
- `Text Field 48` - Defendant's service address

**Page 2 (Hearing Centre):**
- `Text Field 28` - Preferred County Court
- `Check Box39` - Vulnerability Yes
- `Check Box40` - Vulnerability No
- `Check Box41` - Human Rights Yes
- `Check Box42` - Human Rights No

**Page 3 (Particulars):**
- `Check Box43` - Attached
- `Check Box44` - To follow
- `Text30` - Particulars of claim text

**Page 4 (Statement of Truth):**
- `Check Box45` - "I believe"
- `Check Box46` - "The claimant believes"
- `Text Field 47` - Signature area
- `Check Box47` - Claimant
- `Check Box48` - Litigation friend
- `Check Box49` - Legal rep
- `Text31` - Day
- `Text32` - Month
- `Text33` - Year
- `Text Field 46` - Full name
- `Text Field 45` - Legal rep firm
- `Text Field 44` - Position

**Page 5 (Service Address):**
- `Text Field 10` - Building/street
- `Text Field 9` - Second line
- `Text Field 8` - Town/city
- `Text Field 7` - County
- `Text34` - Postcode
- `Text Field 6` - Phone
- `Text Field 4` - DX number
- `Text Field 3` - Your Ref
- `Text Field 2` - Email

## Setup

Install dependencies:
```bash
pip install pypdf pdfplumber pdf2image pillow
# On Linux/WSL also install poppler for pdf2image:
apt-get install poppler-utils
```

## Usage

### Check if a PDF has fillable fields
```bash
cd scripts/pdf/pdf_scripts
python check_fillable_fields.py ../../../public/N1.pdf
```

### Extract field information
```bash
python extract_form_field_info.py ../../../public/N1.pdf ../n1_fields.json
```

### Convert PDF to images for visual analysis
```bash
python convert_pdf_to_images.py ../../../public/N1.pdf ./n1_images/
```

## Integration with TypeScript

The `pdfGenerator.ts` now uses pdf-lib's native form filling:

```typescript
const form = pdfDoc.getForm();
const field = form.getTextField('Text21');
field.setText('Claimant Name\n123 Address');

const checkbox = form.getCheckBox('Check Box40');
checkbox.check();
```

This is more reliable than coordinate-based text positioning because:
1. Field positions are defined in the PDF itself
2. Text wrapping is handled automatically
3. Checkboxes toggle correctly with proper values
