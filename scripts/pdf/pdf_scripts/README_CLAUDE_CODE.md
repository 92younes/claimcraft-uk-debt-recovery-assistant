# PDF Form Filling Scripts for Claude Code

## Setup

1. Place these scripts in your project directory (e.g., `scripts/pdf/`)

2. Install required dependencies:
```bash
pip install pypdf pdfplumber pdf2image pillow --break-system-packages
```

3. For `pdf2image` to work, you also need poppler:
```bash
# Ubuntu/Debian
sudo apt-get install poppler-utils

# macOS
brew install poppler
```

## Usage Instructions

### Step 1: Check if PDF has fillable fields
```bash
python scripts/pdf/check_fillable_fields.py input.pdf
```

### If PDF HAS fillable fields:

```bash
# Extract field info to JSON
python scripts/pdf/extract_form_field_info.py input.pdf field_info.json

# Convert to images to visually identify fields
python scripts/pdf/convert_pdf_to_images.py input.pdf ./images/

# Create field_values.json with your data (see FORMS.md for format)

# Fill the form
python scripts/pdf/fill_fillable_fields.py input.pdf field_values.json output.pdf
```

### If PDF does NOT have fillable fields:

```bash
# Convert to images
python scripts/pdf/convert_pdf_to_images.py input.pdf ./images/

# Analyze images and create fields.json (see FORMS.md for format)

# Create validation images to verify bounding boxes
python scripts/pdf/create_validation_image.py 1 fields.json ./images/page_1.png ./validation_page_1.png

# Check bounding boxes don't overlap
python scripts/pdf/check_bounding_boxes.py fields.json

# Fill form with annotations
python scripts/pdf/fill_pdf_form_with_annotations.py input.pdf fields.json output.pdf
```

## File Formats

### field_values.json (for fillable PDFs)
```json
[
  {
    "field_id": "last_name",
    "description": "User's last name",
    "page": 1,
    "value": "Smith"
  },
  {
    "field_id": "Checkbox1",
    "description": "Agreement checkbox",
    "page": 1,
    "value": "/On"
  }
]
```

### fields.json (for non-fillable PDFs)
```json
{
  "pages": [
    {"page_number": 1, "image_width": 850, "image_height": 1100}
  ],
  "form_fields": [
    {
      "page_number": 1,
      "description": "Last name field",
      "field_label": "Last Name",
      "label_bounding_box": [30, 125, 95, 142],
      "entry_bounding_box": [100, 125, 280, 142],
      "entry_text": {
        "text": "Smith",
        "font_size": 12,
        "font_color": "000000"
      }
    }
  ]
}
```

## Integration Prompt for Claude Code

When asking Claude Code to fill a PDF, provide this context:

```
I have PDF form filling scripts in ./scripts/pdf/. Use this workflow:

1. Run check_fillable_fields.py to determine approach
2. If fillable: use extract_form_field_info.py + fill_fillable_fields.py
3. If not fillable: use convert_pdf_to_images.py + create fields.json + fill_pdf_form_with_annotations.py

Always validate with check_bounding_boxes.py and create_validation_image.py before final output.

See FORMS.md for detailed field format specifications.
```
