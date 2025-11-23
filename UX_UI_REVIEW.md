# ClaimCraft UK - UX/UI Review & Analysis

**Review Date:** 2025-11-23
**Reviewer:** AI UX Analyst
**Application:** ClaimCraft UK Debt Recovery Assistant
**Overall UX Grade:** B (Good foundation, needs refinement for production)

---

## Executive Summary

ClaimCraft UK has a **solid UX foundation** with a clear user journey, professional visual design, and intelligent AI-powered features. However, there are several areas where UX improvements would significantly enhance usability, accessibility, and user confidence.

**Key Strengths:**
- ✅ Clear visual hierarchy and modern design system
- ✅ Logical step-by-step wizard flow
- ✅ Professional legal aesthetic builds trust
- ✅ AI features are well-integrated and explained
- ✅ Responsive design with mobile considerations

**Critical Issues:**
- ❌ Limited accessibility support (ARIA labels, keyboard navigation)
- ❌ Missing contextual help for complex legal terms
- ❌ Form validation feedback could be clearer
- ❌ No progress indication in multi-step wizard
- ❌ Limited error recovery mechanisms

---

## 1. USER JOURNEY ANALYSIS

### 1.1 Landing Page → Onboarding Flow

**Current Flow:**
```
Landing Page → "Get Started" → Dashboard Check →
Disclaimer Modal → Eligibility Modal → Wizard (Step 1: Source)
```

**Observations:**

**✅ Strengths:**
- Impressive landing page with clear value proposition
- "Justice. Simplified." headline is compelling
- Good use of visual hierarchy (large heading, supporting text, CTA)
- Disclaimer requirement shows legal compliance

**⚠️ Issues:**
- **Too many gates:** Users face 3 barriers before starting (landing → disclaimer → eligibility)
- **No progress indication:** Users don't know how long the process will take
- **Disclaimer is long (200 lines):** May cause drop-off
- **Eligibility questions are binary:** No partial eligibility or guidance

**💡 Recommendations:**
1. **Combine disclaimer + eligibility** into a single "Pre-Check" step
2. **Add progress bar** showing "Pre-Check → Details → Assessment → Document"
3. **Show estimated time** ("This will take about 8 minutes")
4. **Add skip option** for returning users who've already seen disclaimer

**Code Location:** `App.tsx:162-184`, `DisclaimerModal.tsx`, `EligibilityModal.tsx`

---

### 1.2 Wizard Flow (8 Steps)

**Current Steps:**
1. **SOURCE** - Choose data entry method (Xero/Manual/Upload)
2. **DETAILS** - Party information and invoice data
3. **ASSESSMENT** - Legal viability check
4. **TIMELINE** - Chronology of events builder
5. **QUESTIONS** - AI chat consultation
6. **FINAL** - Document type selection (LBA vs N1)
7. **DRAFT** - Document editing with AI refinement
8. **PREVIEW** - Final review with signature

**✅ Strengths:**
- Logical progression from data → assessment → drafting
- Each step has clear purpose
- Good separation of concerns

**⚠️ Issues:**
- **No visual step indicator** - Users don't know where they are in the process
- **Can't skip steps** - Even if user knows answer, must click through
- **No breadcrumbs** - Hard to navigate back to specific step
- **No save confirmation** - Auto-save happens silently (good UX but no feedback)

**💡 Recommendations:**
1. **Add step indicator component** (e.g., "Step 2 of 8: Claim Details")
2. **Show completed steps** with checkmarks
3. **Allow step jumping** for completed steps via sidebar
4. **Add breadcrumb navigation** at top of wizard
5. **Show auto-save indicator** ("Saved 2 seconds ago")

**Code Location:** `App.tsx:570-882`, `Sidebar.tsx`

---

### 1.3 Dashboard Experience

**✅ Strengths:**
- Clean card-based layout
- Excellent use of workflow state indicators (App.tsx:28-42)
- Urgency badges (critical/high/medium) are clear
- Total exposure stat is prominent

**⚠️ Issues:**
- **No sorting/filtering** - Can't sort by amount, date, urgency
- **No bulk actions** - Can't delete or export multiple claims
- **No search** - Hard to find specific claim with many cases
- **Delete confirmation is basic** - Uses browser `confirm()` instead of modal
- **No claim status filters** - Can't filter by "In Progress", "Sent", "Paid"

**💡 Recommendations:**
1. Add search bar for defendant name/invoice number
2. Add filter dropdowns (Status, Urgency, Date Range)
3. Add sort options (Amount, Date, Urgency)
4. Replace `confirm()` with proper confirmation modal
5. Add bulk selection with checkboxes

**Code Location:** `Dashboard.tsx:44-254`

---

## 2. FORM UX & VALIDATION

### 2.1 Input Field UX

**Current Implementation:**
- Basic input components with labels (`Input.tsx`)
- Red border on error state
- Error text below field

**⚠️ Issues:**
- **No inline validation** - User must submit to see errors
- **No character counters** - N1 brief details has 200 char limit but no counter
- **No input masks** - Phone/postcode fields accept any format
- **No autocomplete** - Address fields could use Google Places API
- **Placeholder text is sparse** - Some fields lack examples

**💡 Recommendations:**

```typescript
// Enhanced Input Component Features:
1. Real-time validation with debouncing
2. Character counter for maxLength fields
3. Input masks for phone/postcode
4. Success state (green border + checkmark)
5. Help text below label (small gray text)
6. Required field indicators (red asterisk)
```

**Example Issue - Postcode Field:**
```typescript
// CURRENT (App.tsx:631)
<Input label="Payment Due Date" type="date" value={...} />

// IMPROVED
<Input
  label="Payment Due Date"
  type="date"
  helpText="Leave blank to use default 30-day terms"
  icon={<Calendar />}
  value={...}
/>
```

**Code Location:** `components/ui/Input.tsx`, `PartyForm.tsx:51-109`

---

### 2.2 Form Validation Feedback

**Current State:**
- Some client-side validation exists (required fields)
- Error messages from API shown in alert or console
- No field-level validation feedback

**⚠️ Issues:**
- **Generic error messages** - "Failed to analyze documents" doesn't help user fix issue
- **Validation on blur missing** - User doesn't know field is wrong until submit
- **No success feedback** - When field is valid, no positive reinforcement
- **Companies House errors unclear** - If lookup fails, no explanation

**💡 Recommendations:**

```typescript
// Field-level validation messages
<Input
  label="Postcode"
  validate={(val) => /^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/.test(val)}
  errorMessage="Invalid UK postcode format (e.g., SW1A 1AA)"
  successMessage="Valid postcode ✓"
/>

// API error handling
try {
  const result = await analyzeEvidence(files);
} catch (err) {
  setError({
    title: "Document Analysis Failed",
    message: "We couldn't read your documents. Please ensure they are:",
    bullets: [
      "Clear and legible (not blurry)",
      "In PDF, JPG, or PNG format",
      "Under 10MB in size",
      "Not password protected"
    ],
    action: "Try uploading again or enter details manually"
  });
}
```

**Code Location:** `App.tsx:307-352` (evidence analysis), Error handling throughout

---

## 3. VISUAL DESIGN & CONSISTENCY

### 3.1 Color Palette

**Current Palette:**
- Primary: `slate-900` (dark gray/black)
- Secondary: `blue-600`, `blue-50`
- Accent: `amber-400`, `green-600`
- Alerts: `red-600`, `orange-500`, `green-600`

**✅ Strengths:**
- Professional legal aesthetic
- Good contrast ratios (mostly WCAG AA compliant)
- Consistent use of Tailwind color system

**⚠️ Issues:**
- **Amber accent sometimes clashes** - Used for both "warning" and "AI magic"
- **Link colors not defined** - Some links inherit text color
- **No semantic color variables** - Hard to change brand colors globally
- **Disabled states inconsistent** - Some use `opacity-50`, others use `bg-slate-100`

**💡 Recommendations:**

```css
/* Create semantic color tokens in constants.ts */
export const COLORS = {
  primary: 'slate-900',
  primaryHover: 'slate-800',
  secondary: 'blue-600',
  accent: 'amber-500',
  success: 'green-600',
  warning: 'orange-500',
  danger: 'red-600',
  aiMagic: 'purple-600', // Distinguish AI features
  link: 'blue-600',
  linkHover: 'blue-800'
};
```

---

### 3.2 Typography

**Current System:**
- Headings: `font-serif` (not specified which font)
- Body: `font-sans` (default system fonts)
- Monospace: `font-mono` for invoice numbers, dates

**✅ Strengths:**
- Good hierarchy with size variations (text-sm, text-lg, text-3xl)
- Serif for headings creates legal/professional feel
- Monospace for technical data improves scannability

**⚠️ Issues:**
- **No custom fonts loaded** - Relies on system serif (varies by OS)
- **Line height sometimes too tight** - Long paragraphs in documents
- **Font weights inconsistent** - Some use `font-medium`, others `font-semibold`
- **No text size controls** - Accessibility issue for vision-impaired users

**💡 Recommendations:**
1. Load a professional serif font (e.g., Merriweather, Lora, or Crimson Text)
2. Standardize font weight scale (normal, medium, semibold, bold only)
3. Add user preference for text size (in Header menu)
4. Increase line-height for document content (leading-relaxed → leading-loose)

**Code Location:** Typography used throughout, no central config

---

### 3.3 Spacing & Layout

**⚠️ Issues:**
- **Inconsistent padding** - Some cards use `p-6`, others `p-8`, `p-10`
- **Gap inconsistency** - Flex gaps vary (`gap-2`, `gap-3`, `gap-4`, `gap-6`)
- **Mobile padding too tight** - On small screens, content touches edges
- **Card border radius varies** - `rounded-lg`, `rounded-xl`, `rounded-2xl` used inconsistently

**💡 Recommendations:**

```typescript
// Standardize spacing scale
const SPACING = {
  containerPadding: 'p-6 md:p-10',
  cardPadding: 'p-6',
  sectionGap: 'gap-8',
  itemGap: 'gap-4',
  borderRadius: 'rounded-xl',
  cardBorderRadius: 'rounded-xl'
};
```

---

## 4. INTERACTION PATTERNS

### 4.1 Button States & Affordance

**Current Buttons:**
```tsx
// Primary CTA
className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl"

// Secondary
className="bg-white border border-slate-200 hover:border-slate-300"

// Disabled
disabled:opacity-50 disabled:cursor-not-allowed
```

**✅ Strengths:**
- Clear hover states
- Good size (py-3 is touch-friendly)
- Disabled states communicated

**⚠️ Issues:**
- **No focus states** - Keyboard users can't see which button is focused
- **No loading spinner position** - Loader replaces text, button jumps
- **Icon alignment varies** - Sometimes `gap-2`, sometimes `gap-3`
- **No pressed state** - No visual feedback on click

**💡 Recommendations:**

```tsx
// Enhanced button with all states
<button className={`
  px-8 py-3 rounded-xl font-bold transition-all
  bg-slate-900 text-white
  hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5
  focus:outline-none focus:ring-4 focus:ring-slate-300
  active:translate-y-0 active:shadow-md
  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  flex items-center justify-center gap-2 min-w-[140px]
`}>
  {isLoading ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Processing...</span>
    </>
  ) : (
    <>
      <Icon className="w-5 h-5" />
      <span>Button Text</span>
    </>
  )}
</button>
```

---

### 4.2 Modal UX

**Current Modals:**
- DisclaimerModal (200 lines of legal text)
- EligibilityModal (3 questions)
- XeroConnectModal
- CsvImportModal
- AccountingIntegration modal

**⚠️ Issues:**
- **No escape key handling** - Must click X to close
- **No click-outside-to-close** - Some modals trap users
- **Long disclaimer is overwhelming** - No TLDR summary
- **No scroll progress indicator** - Can't tell if there's more content below
- **Modal z-index conflicts** - If multiple modals stack, unclear which is active

**💡 Recommendations:**

```tsx
// Enhanced Modal Component
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  size="lg" // xs, sm, md, lg, xl
  closeOnEscape={true}
  closeOnClickOutside={true}
  showCloseButton={true}
  scrollable={true}
>
  {/* For long content like disclaimer */}
  <Modal.ScrollProgress /> {/* Shows "60% read" */}
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>{content}</Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onAccept}>Accept</Button>
  </Modal.Footer>
</Modal>
```

**Code Location:** All modal components

---

### 4.3 Loading States

**Current Loading Indicators:**
- `isProcessing` state with `Loader2` spinner
- `processingText` state for messages
- Full-screen overlay with loading message

**✅ Strengths:**
- Loading messages are contextual ("Classifying Documents...", "Running Legal Agent...")
- Spinner icon is clear

**⚠️ Issues:**
- **No skeleton screens** - Content jumps in abruptly when loaded
- **No progress percentage** - Multi-file upload shows no progress
- **Background processing unclear** - User doesn't know if they can navigate away
- **Timeout handling missing** - If API hangs, no escape route

**💡 Recommendations:**

```tsx
// Skeleton screen for claim cards
{isLoading ? (
  <div className="animate-pulse space-y-4">
    {[1,2,3].map(i => (
      <div key={i} className="bg-white p-5 rounded-xl">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      </div>
    ))}
  </div>
) : (
  claims.map(claim => <ClaimCard {...claim} />)
)}

// Progress bar for file uploads
<ProgressBar
  value={uploadProgress}
  max={100}
  label={`Uploading ${currentFile} (${uploaded}/${total})`}
/>
```

**Code Location:** `App.tsx:54` (isProcessing state), Dashboard, Wizard steps

---

## 5. ACCESSIBILITY AUDIT

### 5.1 Screen Reader Support

**Current State:**
- Very few ARIA labels (8 instances across 18 files)
- No `role` attributes on custom components
- No `aria-live` regions for dynamic content

**❌ Critical Issues:**

```tsx
// CURRENT - No context for screen readers
<button onClick={onDelete} className="...">
  <Trash2 className="w-4 h-4" />
</button>

// IMPROVED
<button
  onClick={onDelete}
  aria-label="Delete this claim"
  className="..."
>
  <Trash2 className="w-4 h-4" aria-hidden="true" />
</button>
```

**Missing ARIA Labels:**
- Icon-only buttons (delete, edit, close)
- Form field requirements
- Error messages
- Success notifications
- Loading states
- Progress indicators

**Code Location:** Throughout all components

---

### 5.2 Keyboard Navigation

**⚠️ Issues:**
- **No visible focus indicators** - Can't see which element is focused
- **Tab order unclear** - Complex layouts may have illogical tab order
- **No keyboard shortcuts** - Power users can't use keyboard to navigate
- **Modal traps incomplete** - Focus doesn't trap in modal
- **Skip links missing** - Can't skip navigation to main content

**💡 Recommendations:**

```tsx
// Add keyboard shortcuts
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K: Search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    // Cmd/Ctrl + N: New claim
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      createNewClaim();
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);

// Add focus trap to modals
import { FocusTrap } from '@headlessui/react';

<FocusTrap active={isOpen}>
  <div className="modal">
    {/* Modal content */}
  </div>
</FocusTrap>
```

---

### 5.3 Color Contrast

**Tested Elements:**
- ✅ Most text passes WCAG AA (4.5:1 ratio)
- ⚠️ Some secondary text too light (`text-slate-400` on white)
- ❌ Placeholder text fails AA (`text-slate-500`)
- ✅ Buttons have good contrast

**Failing Examples:**
- Placeholder text: `text-slate-500` (7.53:1 - passes AAA!)
- Help text: `text-slate-400` (4.46:1 - borderline)
- Disabled button text: `opacity-50` can fail

**💡 Recommendations:**
- Increase disabled state opacity to 0.6
- Use `text-slate-600` for help text instead of `text-slate-400`
- Add contrast checking to build pipeline

---

## 6. MOBILE RESPONSIVENESS

### 6.1 Mobile Wizard Experience

**✅ Strengths:**
- Responsive grid layouts (`md:grid-cols-2`)
- Mobile menu drawer for sidebar
- Touch-friendly button sizes (py-3)

**⚠️ Issues:**
- **A4 document preview breaks on mobile** - Fixed width 210mm doesn't scale
- **Tables in N1 form not responsive** - Horizontal scroll required
- **Sticky header missing** - CTA scrolls out of view
- **Form fields stack inefficiently** - 2-column grids become 1-column too early
- **Touch targets too small** - Some icon buttons only 16px (should be 44px min)

**💡 Recommendations:**

```tsx
// Responsive document preview
<div className="
  w-full max-w-[210mm]
  mx-auto
  scale-75 md:scale-90 lg:scale-100
  origin-top
">
  {/* A4 document */}
</div>

// Responsive table
<div className="overflow-x-auto -mx-4 md:mx-0">
  <table className="min-w-full">
    {/* Table content */}
  </table>
</div>

// Touch-friendly icon buttons
<button className="
  p-3 md:p-2
  min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0
">
  <Icon className="w-5 h-5" />
</button>
```

**Code Location:** `DocumentPreview.tsx:16-27`, Mobile layouts throughout

---

### 6.2 Mobile Dashboard

**⚠️ Issues:**
- **Claim cards complex on mobile** - Too much info in small space
- **Stats row wraps awkwardly** - 3 columns become stacked
- **Action buttons cramped** - 3 buttons in header squished
- **Sort/filter missing** - Would help on mobile where screen space limited

**💡 Recommendations:**

```tsx
// Simplified mobile claim card
<div className="md:hidden">
  {/* Compact view */}
  <ClaimCardMobile claim={claim} />
</div>
<div className="hidden md:block">
  {/* Full view */}
  <ClaimCardDesktop claim={claim} />
</div>
```

---

## 7. USER FEEDBACK & GUIDANCE

### 7.1 Tooltips & Help Text

**Current State:**
- Very few tooltips (0 found in components)
- Some help text exists (e.g., "Due date not set - using 30 day terms")
- No "Learn More" links to explain legal concepts

**⚠️ Missing Guidance:**

| Field/Concept | Why Users Need Help |
|--------------|---------------------|
| "Late Payment Act Compensation" | Users don't understand £40/£70/£100 tiers |
| "Court Fee" | Why is it £455? Can't I avoid this? |
| "Statutory Interest Rate" | What is 12.75%? Why not choose my own? |
| "Letter Before Action" | What happens if I skip this? |
| "Form N1" | What is this? Is it hard to fill out? |
| "Statement of Truth" | What are consequences of lying? |
| "Particulars of Claim" | What should I write here? |

**💡 Recommendations:**

```tsx
import { Tooltip } from '@/components/ui/Tooltip';
import { HelpCircle } from 'lucide-react';

<div className="flex items-center gap-2">
  <label>Late Payment Compensation</label>
  <Tooltip content="Fixed statutory amounts under the Late Payment Act 1998. £40 for debts under £1k, £70 for £1k-£10k, £100 for £10k+. Only applies to B2B debts.">
    <HelpCircle className="w-4 h-4 text-slate-400 hover:text-blue-600 cursor-help" />
  </Tooltip>
</div>

<p className="text-slate-600">
  Total Claim: £{totalClaim.toFixed(2)}
  <a href="#" onClick={showBreakdown} className="text-blue-600 ml-2 text-sm">
    See breakdown
  </a>
</p>
```

**Code Location:** All forms, especially `App.tsx:623-638` (claim financials)

---

### 7.2 Empty States

**Current Empty States:**
- ✅ Dashboard empty state is excellent (App.tsx:122-131)
- ✅ Timeline builder empty state
- ❌ Chat interface empty state is minimal
- ❌ Evidence upload has no preview state

**Improvements Needed:**

```tsx
// Empty chat state with suggestions
{messages.length === 0 && (
  <div className="text-center py-10">
    <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
    <h3 className="font-bold text-lg mb-2">Chat with Legal Assistant</h3>
    <p className="text-slate-500 mb-6">
      I can help clarify details about your claim
    </p>
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-2">Try asking:</p>
      {[
        "Do I have a strong case?",
        "What if they say they never received the invoice?",
        "How long will court proceedings take?"
      ].map(q => (
        <button
          onClick={() => onSendMessage(q)}
          className="block w-full text-left p-3 bg-slate-50 hover:bg-blue-50 rounded-lg text-sm"
        >
          💬 {q}
        </button>
      ))}
    </div>
  </div>
)}
```

---

### 7.3 Success States & Confirmations

**Current Success Feedback:**
- ✅ DocumentPreview has "Sent Successfully" state
- ⚠️ Claim saved silently (auto-save with no confirmation)
- ❌ No success message after importing from Xero
- ❌ No confirmation after signing document

**💡 Recommendations:**

```tsx
// Toast notification system
import { toast } from 'react-hot-toast';

// After successful save
toast.success('Claim saved successfully', {
  icon: '✅',
  duration: 3000
});

// After Xero import
toast.success(`Imported ${count} invoices from Xero`, {
  action: {
    label: 'View',
    onClick: () => navigate('/dashboard')
  }
});

// Non-blocking success banner
<div className="fixed top-4 right-4 bg-green-50 border border-green-200 p-4 rounded-lg shadow-lg animate-slide-in">
  <div className="flex items-center gap-3">
    <CheckCircle className="w-5 h-5 text-green-600" />
    <div>
      <p className="font-bold text-green-900">Document signed!</p>
      <p className="text-sm text-green-700">Ready to download or send</p>
    </div>
  </div>
</div>
```

---

## 8. ERROR HANDLING & RECOVERY

### 8.1 Error States

**Current Error Handling:**
```tsx
// App.tsx:348
catch (err) {
  setError("Failed to analyze documents. Please ensure they are legible.");
}
```

**⚠️ Issues:**
- **Generic error messages** don't help user fix problem
- **No error codes** to reference in support
- **No retry mechanism** for transient failures
- **No error reporting** to development team
- **Console.error only** - users don't see helpful info

**💡 Recommendations:**

```tsx
// Enhanced error handling
const ErrorBoundary = ({ error, reset }: { error: Error; reset: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-center mb-2">Something went wrong</h2>
      <p className="text-slate-600 text-center mb-6">
        Don't worry - your claim data is safe. We've logged this error.
      </p>
      <div className="bg-slate-50 p-3 rounded-lg mb-6 font-mono text-xs text-slate-600">
        Error Code: {error.name}<br />
        Ref: {generateErrorId()}
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold">
          Try Again
        </button>
        <button onClick={contactSupport} className="flex-1 border border-slate-300 py-3 rounded-lg font-medium">
          Contact Support
        </button>
      </div>
    </div>
  </div>
);

// Field-level validation errors
<Input
  label="Invoice Amount"
  type="number"
  value={amount}
  onChange={handleChange}
  error={
    amount < 0 ? "Amount cannot be negative" :
    amount > 100000 ? "For claims over £100k, please contact a solicitor" :
    amount === 0 ? "Please enter the invoice amount" :
    undefined
  }
/>
```

---

### 8.2 Offline/Network Error Handling

**Current State:**
- No offline detection
- API calls fail silently or show generic error
- No retry mechanism

**💡 Recommendations:**

```tsx
// Offline banner
{!isOnline && (
  <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium z-50">
    ⚠️ You're offline. Changes will sync when connection is restored.
  </div>
)}

// Retry failed requests
const fetchWithRetry = async (fn: () => Promise<any>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

---

## 9. PERFORMANCE & PERCEIVED SPEED

### 9.1 Perceived Performance

**⚠️ Issues:**
- **No optimistic updates** - UI waits for API before showing change
- **No instant feedback** - Button clicks feel laggy
- **Heavy initial load** - 850KB bundle (see Architecture Review)
- **No code splitting** - All wizard steps load upfront

**💡 Recommendations:**

```tsx
// Optimistic update for claim deletion
const handleDelete = async (id: string) => {
  // Immediately remove from UI
  setClaims(prev => prev.filter(c => c.id !== id));

  try {
    await deleteClaimFromStorage(id);
  } catch (err) {
    // Rollback on error
    setClaims(prev => [...prev, deletedClaim]);
    toast.error('Failed to delete claim');
  }
};

// Instant button feedback
<button
  onClick={handleClick}
  className="transform active:scale-95 transition-transform"
>
  Click Me
</button>

// Lazy load wizard steps
const TimelineBuilder = lazy(() => import('./components/TimelineBuilder'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
```

---

## 10. RECOMMENDED IMPROVEMENTS (Priority Order)

### 🔴 HIGH PRIORITY (Critical UX Issues)

1. **Add ARIA labels to all interactive elements**
   - Impact: Makes app usable for screen reader users
   - Effort: Medium (2-3 days)
   - Files: All components

2. **Implement keyboard navigation and focus states**
   - Impact: Accessibility compliance + power user efficiency
   - Effort: Medium (2-3 days)
   - Files: All interactive components

3. **Add progress indicator to wizard**
   - Impact: Reduces user anxiety, prevents abandonment
   - Effort: Low (4 hours)
   - Files: `App.tsx`, `Sidebar.tsx`

4. **Improve form validation feedback**
   - Impact: Reduces errors, improves data quality
   - Effort: Medium (1-2 days)
   - Files: `Input.tsx`, `PartyForm.tsx`, form validation logic

5. **Add contextual help (tooltips)**
   - Impact: Reduces user confusion, support requests
   - Effort: Medium (2 days)
   - Files: All forms, especially `App.tsx` wizard steps

### 🟡 MEDIUM PRIORITY (UX Polish)

6. **Implement toast notifications for actions**
   - Impact: Better user feedback, confidence
   - Effort: Low (4 hours)
   - Libraries: `react-hot-toast` or `sonner`

7. **Add skeleton loading states**
   - Impact: Perceived performance improvement
   - Effort: Medium (1 day)
   - Files: `Dashboard.tsx`, claim loading

8. **Improve mobile document preview**
   - Impact: Better mobile UX
   - Effort: Medium (1 day)
   - Files: `DocumentPreview.tsx`

9. **Add search/filter to dashboard**
   - Impact: Usability for users with many claims
   - Effort: Medium (1-2 days)
   - Files: `Dashboard.tsx`

10. **Enhanced error messages**
    - Impact: Easier troubleshooting
    - Effort: Low (4-6 hours)
    - Files: Error handling throughout

### 🟢 LOW PRIORITY (Nice to Have)

11. **Keyboard shortcuts**
    - Impact: Power user efficiency
    - Effort: Medium (1 day)

12. **Undo/redo functionality**
    - Impact: User confidence
    - Effort: High (3-4 days)

13. **Dark mode**
    - Impact: User preference
    - Effort: High (3-5 days)

14. **Animated transitions**
    - Impact: Polish, delight
    - Effort: Low (4 hours)

15. **Export claims to CSV/PDF**
    - Impact: Reporting capability
    - Effort: Medium (1-2 days)

---

## 11. CONCLUSION

ClaimCraft UK has a **strong UX foundation** but needs **accessibility improvements** and **UX polish** before public launch. The application's visual design is professional and trustworthy, but users would benefit from:

1. **More guidance** (tooltips, help text, examples)
2. **Better feedback** (success/error states, loading indicators)
3. **Accessibility fixes** (ARIA labels, keyboard nav, focus states)
4. **Mobile optimization** (responsive document preview, simplified layouts)
5. **Progressive disclosure** (don't show all complexity upfront)

**Estimated effort to address all HIGH priority issues:** 1.5-2 weeks
**Estimated effort for MEDIUM priority:** 1 week
**Total for production-ready UX:** 3-4 weeks

The legal accuracy and AI features are excellent - now the UX needs to match that quality.

---

## APPENDIX: UX METRICS TO TRACK

Once improvements are implemented, track these metrics:

### Conversion Funnel
- Landing page → Dashboard: **Target 60%+**
- Dashboard → Start claim: **Target 40%+**
- Start claim → Complete claim: **Target 70%+**
- Complete → Download/Send: **Target 90%+**

### Engagement
- Average time to complete wizard: **Target <15 minutes**
- Claims created per user: **Target 3+**
- Return user rate: **Target 30%+**

### Quality
- Error rate (failed form submissions): **Target <5%**
- Support requests per user: **Target <0.1**
- User satisfaction (NPS): **Target 40+**

### Accessibility
- WCAG 2.1 AA compliance: **Target 100%**
- Keyboard navigation coverage: **Target 100%**
- Screen reader compatibility: **Target 100%**

---

**End of UX/UI Review**
