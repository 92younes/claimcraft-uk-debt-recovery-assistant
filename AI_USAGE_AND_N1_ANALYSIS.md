# AI Usage & N1 Form Generation Analysis

**Date:** 2025-01-23
**Application:** ClaimCraft UK - Debt Recovery Assistant

---

## Executive Summary

**Question 1: Are we using AI the right way?**
- ✅ **Generally YES** - Strong hybrid approach with proper safeguards
- ⚠️ **BUT** - API keys exposed on frontend (security issue)
- ✅ Excellent separation: Gemini for analysis, Claude for documents
- ✅ Low temperature (0.1) prevents hallucinations
- ✅ Structured outputs with JSON schemas
- ⚠️ Could benefit from prompt versioning and A/B testing

**Question 2: Are we generating N1 from scratch or filling in the PDF?**
- ✅ **PDF Filling** - Correct approach is implemented
- ❌ **BUT CRITICAL ISSUE** - Missing the official N1.pdf template file
- ❌ **No `public/` directory exists** - Infrastructure gap
- ⚠️ Dual approach: Text for preview, PDF for download (good)
- ✅ Code is ready, just needs the template file

**Overall Grade: B+ (Good design, missing critical infrastructure)**

---

## Part 1: AI Usage Analysis

### 1.1 Current AI Architecture

```
┌─────────────────────────────────────────────────┐
│             DUAL AI SYSTEM                      │
├─────────────────────────────────────────────────┤
│  Google Gemini 2.5 Flash                        │
│    ✓ Evidence classification                    │
│    ✓ Claim strength assessment (0-100 score)    │
│    ✓ Legal consultation chat                    │
│    ✓ Fast, cheap, good for analysis             │
├─────────────────────────────────────────────────┤
│  Claude 3.5 Sonnet (Anthropic)                  │
│    ✓ Document generation (N1, LBA)              │
│    ✓ Document refinement                        │
│    ✓ High quality, formal legal writing         │
└─────────────────────────────────────────────────┘
```

**✅ This is a SMART approach:**
- Gemini is cheaper/faster for analysis tasks
- Claude excels at formal legal writing
- Avoids vendor lock-in
- Cost-optimized ($0.075 per 1M tokens for Gemini vs $3/1M for Claude)

---

### 1.2 Prompt Engineering Quality

#### ✅ STRONG POINTS

**1. Hybrid Template + AI Approach (documentBuilder.ts:8-17)**
```typescript
/**
 * HYBRID TEMPLATE + AI DOCUMENT BUILDER
 *
 * Architecture:
 * 1. Fill template with hard facts (no AI) - prevents hallucinations
 * 2. Use AI to refine only customizable sections - ensures quality
 * 3. Validate output - catches errors
 * 4. Log for compliance - audit trail
 */
```

This is **BEST PRACTICE** and matches garfield.law's approach. You're NOT doing pure AI generation (risky), you're doing AI-assisted refinement (safe).

**2. Low Temperature for Legal Documents (documentBuilder.ts:175)**
```typescript
temperature: 0.1,  // LOW temperature for consistency and safety
```

✅ **Correct!** Legal documents need consistency, not creativity.

**3. Strict Anti-Hallucination Rules (documentBuilder.ts:156-164)**
```typescript
STRICT RULES:
1. DO NOT invent facts not present in the context or timeline
2. DO NOT cite case law unless it was explicitly mentioned by the user
3. DO NOT change any amounts, dates, names, or legal citations already in the template
4. Use formal legal language appropriate for UK County Court
5. Keep descriptions concise - this is a Small Claims case, not High Court
6. DO NOT include uncertain language like "allegedly", "may have", "possibly"
```

✅ **Excellent!** Clear constraints prevent AI misbehavior.

**4. Structured Outputs (geminiService.ts:161-172)**
```typescript
config: {
  responseMimeType: 'application/json',
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.NUMBER },
      analysis: { type: Type.STRING },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  }
}
```

✅ **Best practice!** JSON schema forces structured responses.

---

#### ⚠️ AREAS FOR IMPROVEMENT

**1. Frontend API Keys (CRITICAL SECURITY ISSUE)**

**Current (INSECURE):**
```typescript
// services/geminiService.ts:5-10
const getClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY (Gemini) is not defined...");
  }
  return new GoogleGenAI({ apiKey });
};
```

**Problem:** API keys are bundled in frontend JavaScript. Anyone can:
1. Open browser DevTools → Network tab
2. See API requests with your API key in headers
3. Copy your key and rack up your bill

**Impact:**
- ❌ Unlimited usage by malicious actors
- ❌ API quota exhaustion
- ❌ Could cost thousands in unauthorized usage
- ❌ Violates Anthropic/Google ToS (API keys must be server-side)

**Solution:** Backend API proxy
```typescript
// Secure approach (requires backend)
const response = await fetch('/api/generate-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claimData })
});
// Backend validates user, adds API key server-side
```

**Recommendation:**
- Short-term: Add usage limits + monitoring
- Long-term: Deploy backend (Cloudflare Workers, Vercel Edge Functions, or Express.js)

---

**2. No Prompt Versioning**

**Current:** Prompts are hardcoded strings in source files.

**Problem:**
- Can't A/B test prompt improvements
- No rollback if new prompt performs worse
- Hard to track which version generated each document

**Recommendation:**
```typescript
// Versioned prompts
const PROMPT_VERSIONS = {
  'v1.0': 'Original prompt...',
  'v1.1': 'Improved prompt with better context...',
  'v2.0': 'Complete rewrite for better accuracy...'
};

const currentVersion = 'v1.1';
const prompt = PROMPT_VERSIONS[currentVersion];

// Log in document metadata
logDocumentGeneration({ promptVersion: currentVersion, ... });
```

---

**3. No Prompt Testing Framework**

**Current:** No automated testing of AI outputs.

**Problem:**
- Prompt changes might break edge cases
- No regression testing
- Can't measure quality improvements

**Recommendation:**
```typescript
// tests/prompts/documentGeneration.test.ts
describe('Document Generation Prompts', () => {
  it('should not hallucinate amounts', async () => {
    const testClaim = { invoice: { totalAmount: 5000 }, ... };
    const doc = await DocumentBuilder.generateDocument(testClaim);
    expect(doc.content).not.toContain('£6000'); // Wrong amount
    expect(doc.content).toContain('£5000.00'); // Correct
  });

  it('should not cite fake case law', async () => {
    const doc = await DocumentBuilder.generateDocument(testClaim);
    expect(doc.validation.errors).not.toContain('case law');
  });
});
```

---

**4. Chat System Lacks Memory Management**

**Current (geminiService.ts:263-268):**
```typescript
const sdkHistory = history.slice(0, -1).map(msg => ({
  role: msg.role === 'ai' ? 'model' : 'user',
  parts: [{ text: msg.content }]
}));
```

**Problem:**
- No token counting
- Could exceed model context window (128k tokens for Gemini)
- No summarization of old messages

**Recommendation:**
```typescript
// Token-aware chat
const MAX_CHAT_TOKENS = 10000; // Reserve space for system prompt
const recentHistory = pruneToTokenLimit(history, MAX_CHAT_TOKENS);
// If history > limit, summarize old messages
```

---

### 1.3 AI Usage Best Practices Checklist

| Practice | Status | Notes |
|----------|--------|-------|
| ✅ Hybrid template + AI | **DONE** | Strong architecture |
| ✅ Low temperature (0.1) | **DONE** | Prevents hallucinations |
| ✅ Structured outputs | **DONE** | JSON schemas enforced |
| ✅ Validation after generation | **DONE** | 8-point validation |
| ✅ Fallback when AI fails | **DONE** | Safe defaults |
| ⚠️ API key security | **MISSING** | Frontend exposure |
| ⚠️ Prompt versioning | **MISSING** | No tracking |
| ⚠️ Prompt testing | **MISSING** | No automated tests |
| ⚠️ Token management | **MISSING** | No limits |
| ⚠️ Cost monitoring | **MISSING** | No usage tracking |

**Overall AI Usage Grade: B+ (Strong foundation, needs production hardening)**

---

## Part 2: N1 Form Generation Analysis

### 2.1 Current Implementation

**The Good News:** You ALREADY have PDF filling implemented! 🎉

**services/pdfGenerator.ts (352 lines):**
- ✅ Comprehensive field mapping (56+ fields)
- ✅ Multi-page support (5 pages)
- ✅ Checkbox handling
- ✅ Signature embedding
- ✅ Right-aligned financial fields
- ✅ Text wrapping for long content

**Example Code:**
```typescript
const TEXT_FIELDS: Record<string, FieldConfig> = {
  claimantName: {
    page: 0, x: 45, y: 700, size: 10, isBold: true,
    getValue: (d) => d.claimant.name
  },
  defendantName: {
    page: 0, x: 45, y: 555, size: 10, isBold: true,
    getValue: (d) => d.defendant.name
  },
  particulars: {
    page: 2, x: 75, y: 730, size: 10, maxWidth: 460, lineHeight: 14,
    getValue: (d) => d.generated?.content || "Particulars of claim are attached."
  },
  // ... 50+ more fields
};
```

**DocumentPreview.tsx integrates it:**
```typescript
const handleDownloadPDF = async () => {
  if (data.selectedDocType === DocumentType.FORM_N1) {
    const pdfBytes = await generateN1PDF(data);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    // ... download logic
  }
};
```

---

### 2.2 THE CRITICAL PROBLEM

**❌ Missing Infrastructure:**

1. **No `public/` directory exists**
   ```bash
   $ ls public/
   ls: cannot access 'public/': No such file or directory
   ```

2. **No official N1.pdf template file**

   The code expects:
   ```typescript
   // pdfGenerator.ts:268
   const res = await fetch('/N1.pdf');
   if (!res.ok) throw new Error("Template file not found");
   ```

   But `/N1.pdf` doesn't exist!

3. **User Experience Impact:**
   - User clicks "Download Official N1 Form"
   - Error: "Official N1 Form Template (N1.pdf) is missing..."
   - Falls back to browser print (not ideal)

---

### 2.3 Dual Approach Explained

**Current Strategy (GOOD):**

1. **For Preview/Edit (Text-based):**
   - Display in browser as HTML
   - User can edit in textarea
   - Easy to review and modify
   - Uses `DocumentBuilder.generateDocument()`

2. **For Submission (PDF-based):**
   - Download official HMCTS Form N1 PDF
   - All fields filled programmatically
   - Looks professional
   - Court-ready format
   - Uses `generateN1PDF()`

**Why Both?**
- Text version: Easy editing, review, refinement
- PDF version: Official court format, professional appearance

**This is the CORRECT approach!** ✅

---

### 2.4 What You Need to Do

**IMMEDIATE ACTION REQUIRED:**

**Step 1: Create public directory**
```bash
mkdir public
```

**Step 2: Get official N1 form**
- Download from: https://www.gov.uk/government/publications/form-n1-claim-form-cpr-part-7
- Save as `public/N1.pdf`
- Ensure it's the fillable PDF version (not scanned image)

**Step 3: Verify PDF structure**

The coordinates in `pdfGenerator.ts` are calibrated for a specific N1 template version. You may need to adjust them:

```typescript
// Test coordinates by filling sample data
const testData = { claimant: { name: "TEST" }, ... };
const pdf = await generateN1PDF(testData);
// Visual inspection: Are fields in correct positions?
```

**Step 4: Add to .gitignore (if applicable)**
```
# .gitignore
public/*.pdf  # Don't commit large binary files
```

**Step 5: Document where to get it**
```markdown
# README.md
## Setup

1. Download the official N1 Claim Form PDF:
   - URL: https://www.gov.uk/government/publications/form-n1-claim-form-cpr-part-7
   - Save as `public/N1.pdf`

2. Verify the form version matches:
   - Form N1 (09.24) or later
   - Must be fillable PDF (not scanned)
```

---

### 2.5 Alternative Approaches (If PDF Coordinates Don't Match)

**Option 1: Use pdf-lib form fields (Recommended)**

If the N1 PDF has fillable form fields:
```typescript
const form = pdfDoc.getForm();
const claimantNameField = form.getTextField('claimant_name');
claimantNameField.setText(data.claimant.name);
```

**Pros:**
- No manual coordinates
- Works across PDF versions
- More maintainable

**Cons:**
- Requires PDF with form fields
- HMCTS PDFs sometimes don't have them

---

**Option 2: Generate PDF from scratch (NOT recommended)**

Using pdf-lib to create from blank:
```typescript
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4
page.drawText('Claim Form', { x: 50, y: 800 });
```

**Pros:**
- Full control
- No external dependencies

**Cons:**
- ❌ Won't look like official N1 form
- ❌ May not be accepted by court
- ❌ 10x more work

---

**Option 3: Third-party PDF service**

Use DocuSign, Adobe PDF Services, or PDFtron:
```typescript
const result = await adobePdfServices.fillForm({
  template: 'N1.pdf',
  data: fieldMapping
});
```

**Pros:**
- Professional quality
- Handles complex layouts

**Cons:**
- ❌ Monthly subscription ($50-200/month)
- ❌ External dependency
- ❌ Overkill for this use case

---

## Recommendations

### Priority 1: CRITICAL (Do immediately)

1. **Create `public/` directory**
2. **Download official N1.pdf from gov.uk**
3. **Test PDF generation** with sample data
4. **Move API keys to backend** (prevents unauthorized usage)

### Priority 2: HIGH (Do this week)

5. **Add prompt versioning** for audit trail
6. **Implement usage monitoring** (track API costs)
7. **Add token limits** to chat (prevent runaway costs)

### Priority 3: MEDIUM (Do this month)

8. **Create prompt test suite** (regression testing)
9. **Add A/B testing framework** for prompt improvements
10. **Document AI decision-making** (explainability)

---

## Conclusion

**Are we using AI the right way?**
- ✅ YES - Architecture is solid
- ⚠️ BUT - Security and monitoring gaps

**Are we generating N1 from scratch or filling PDF?**
- ✅ PDF filling (correct approach)
- ❌ BUT - Missing the template file!

**Overall:** Strong technical foundation, needs operational maturity.

**Estimated Time to Fix:**
- PDF template: 15 minutes
- API key security: 2-4 hours (backend deployment)
- Monitoring/testing: 1-2 days

---

**Next Steps:**
1. Run: `mkdir public && cd public`
2. Download N1.pdf from gov.uk
3. Test PDF generation
4. Consider backend migration for API security
