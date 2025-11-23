# Public Assets Directory

This directory contains static files that are served directly by Vite.

## Required Files

### 1. N1.pdf - Official HMCTS Claim Form ⚠️ **REQUIRED**

**Status:** ❌ NOT PRESENT (You must add this file)

**What:** Official Form N1 (Claim Form) from HM Courts & Tribunals Service

**Where to get it:**
- **Official Source:** https://www.gov.uk/government/publications/form-n1-claim-form-cpr-part-7
- **Direct Link:** https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1184952/n1-eng.pdf
- **Form Version:** N1 (09.24) or later
- **Important:** Must be fillable PDF, not scanned image

**How to add:**
1. Download the PDF from the link above
2. Save it as `public/N1.pdf` (exactly this name, case-sensitive)
3. Verify file size is approximately 200-400 KB

**Why it's needed:**
- The application fills in the official court form programmatically using `pdf-lib`
- Coordinates in `services/pdfGenerator.ts` are calibrated for this template
- Without this file, users can only print a text version (not court-ready)

**Error if missing:**
```
Official N1 Form Template (N1.pdf) is missing.
Please add it to the public directory.
```

---

## Optional Files

### 2. index.css (currently linked but may not be needed)

If you see build warnings about `/index.css`, you can safely ignore them or create an empty file:
```bash
touch public/index.css
```

---

## Vite Static Assets

Files in this directory are:
- ✅ Served at the root URL (e.g., `/N1.pdf`)
- ✅ Not processed by Vite (served as-is)
- ✅ Cached by browsers
- ✅ Available in both dev and production builds

**Example usage in code:**
```typescript
// Fetching from public directory
const response = await fetch('/N1.pdf');
const pdfBytes = await response.arrayBuffer();
```

---

## .gitignore Recommendation

Consider adding to `.gitignore` to avoid committing large binary files:
```
# Large PDF templates (can be downloaded separately)
public/*.pdf
!public/README.md
```

Then document the download instructions in your main README.md.

---

## Testing

After adding N1.pdf, test PDF generation:

1. Start dev server: `npm run dev`
2. Create a test claim
3. Click "Download Official N1 Form"
4. Verify:
   - PDF downloads successfully
   - Fields are filled correctly
   - Layout matches official form

If fields are misaligned, adjust coordinates in `services/pdfGenerator.ts`.

---

## Troubleshooting

**Q: PDF downloads but fields are blank**
- A: The N1.pdf might not have the expected structure. Try a different version or use coordinate-based filling (current approach).

**Q: Fields are in wrong positions**
- A: Coordinates in `pdfGenerator.ts` need adjustment. Use pdf-lib inspector tools to find correct positions.

**Q: Error: "Failed to load PDF"**
- A: Check file name is exactly `N1.pdf` (case-sensitive)
- A: Verify file is in `public/` directory
- A: Clear browser cache and reload

**Q: Should I commit N1.pdf to git?**
- A: Generally NO (large binary files bloat repo)
- A: Add download instructions to README instead
- A: Exception: If distributing as single package, yes

---

Last updated: 2025-01-23
