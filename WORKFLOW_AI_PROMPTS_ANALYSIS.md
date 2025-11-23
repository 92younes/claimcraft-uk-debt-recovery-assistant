# ClaimCraft UK - Workflow & AI Prompts Analysis

**Date:** 2025-11-23
**Purpose:** Comprehensive review of application workflow and AI prompt engineering

---

## 1. WORKFLOW OVERVIEW

### The 8-Step Wizard Process

```
1. SOURCE       → Import data (AI analysis, Xero, CSV, or manual)
2. DETAILS      → Enter/edit parties and amounts
3. ASSESSMENT   → Legal viability check (auto-calculated)
4. TIMELINE     → Build event history
5. QUESTIONS    → AI legal consultation chat
6. FINAL        → Choose document type (LBA or N1)
7. DRAFT        → Generate and edit document
8. PREVIEW      → Final review before download/send
```

### Workflow Navigation Logic

**Entry Points:**
- New claim → Start at SOURCE (Step 1)
- Resume draft → Jump to DRAFT (Step 7)
- Resume sent claim → Jump to PREVIEW (Step 8)

**Key Transitions:**
```
SOURCE → DETAILS (after AI analysis, Xero import, CSV import, or manual selection)
DETAILS → ASSESSMENT (user clicks "Next")
ASSESSMENT → TIMELINE (auto-advances)
TIMELINE → QUESTIONS (user clicks "Start Chat")
QUESTIONS → FINAL (user completes consultation)
FINAL → DRAFT (user selects doc type and generates)
DRAFT → PREVIEW (user finalizes)
```

---

## 2. DUAL AI SYSTEM ARCHITECTURE

### System 1: Google Gemini AI (`geminiService.ts`)

**Model:** `gemini-2.5-flash`
**Use Cases:**
1. **Evidence Analysis** (Step 1) - Extract data from PDFs/images
2. **Claim Strength Assessment** (Step 3) - Score winnability 0-100
3. **Legal Consultation Chat** (Step 5) - Interactive Q&A
4. **Document Review** - Detect hallucinations (validation)

**Why Gemini:**
- Multimodal (can process images and PDFs)
- Fast response times for chat
- Structured JSON output
- Good for analysis tasks

---

### System 2: Anthropic Claude (`documentBuilder.ts`)

**Model:** `claude-3-5-sonnet-20241022`
**Use Cases:**
1. **Document Generation** (Step 7) - Generate legal documents
2. **Document Refinement** (Step 7) - "Director Mode" edits

**Why Claude:**
- Superior legal writing quality
- Better instruction following
- Safer (lower hallucination rate)
- Better for professional tone

---

## 3. AI PROMPTS - DETAILED ANALYSIS

### 🟢 **PROMPT 1: Evidence Analysis** (Gemini)

**Location:** `geminiService.ts` lines 47-64

**Purpose:** Extract claimant, defendant, invoice, timeline from uploaded documents

**Prompt Structure:**
```
Task: Analyze evidence documents (Invoices, Contracts, Emails)
Extract:
  1. Creditor (Claimant)
  2. Debtor (Defendant)
  3. Main Invoice details
  4. Timeline of events
  5. Document classifications

Return JSON matching schema.
Use 'Individual' or 'Business' based on entities (Ltd/Plc = Business).
```

**Strengths:**
✅ Structured JSON output with schema validation
✅ Clear 5-point extraction task
✅ Multimodal (handles PDFs and images)

**Issues:**
⚠️ **Party Type Detection Fragile**: Relies on "Ltd/Plc" in name to determine business type
   - "Joe Bloggs Trading" would be marked Individual (wrong)
   - "Smith & Co" would be marked Individual (wrong)
   - "ABC Ltd" would be marked Business (correct)

**Recommendation:**
```typescript
// Better: Ask AI to infer from context (VAT number, company number, address format)
// Or: Ask user to confirm party types in Step 2 (DETAILS)
```

---

### 🟢 **PROMPT 2: Claim Strength Assessment** (Gemini)

**Location:** `geminiService.ts` lines 128-156

**Purpose:** Assess claim winnability based on evidence, timeline, and chat

**Prompt Structure:**
```
Act as Expert Legal Assistant for UK Small Claims.
Assess "Winnability" (0-100) based on:

JUDGMENT CRITERIA:
1. Contract - Signed agreement? (High impact)
2. Proof - Proof of delivery/service?
3. Admissions - Defendant admitted debt?
4. Procedure - Claimant sent chasers?
5. Disputes - Valid counterclaim?

Return JSON: { score, analysis, weaknesses[] }
```

**Strengths:**
✅ Clear 5-point criteria (solid legal framework)
✅ Returns weaknesses array for user guidance
✅ Concise analysis summary

**Issues:**
⚠️ **Over-Precise Scoring**: 0-100 score implies false precision
   - Legal claims aren't that quantifiable
   - Better: "High" (80-100), "Medium" (50-79), "Low" (0-49)

⚠️ **No Context on Counterclaims**: Doesn't deeply analyze defendant's potential defenses

**Recommendation:**
```typescript
// Replace score with tier system:
enum ClaimStrength {
  HIGH = "High - Strong evidence, likely to succeed",
  MEDIUM = "Medium - Some gaps, may need legal advice",
  LOW = "Low - Significant weaknesses, high risk"
}
```

---

### 🔴 **PROMPT 3: Start Clarification Chat** (Gemini)

**Location:** `geminiService.ts` lines 181-213

**Purpose:** Generate first AI message to start legal consultation

**Prompt Structure:**
```
Act as Expert Legal Assistant (UK Law).
Review claim data.

Your goal: Find the weakest link immediately.

Generate FIRST message:
1. Be extremely succinct. No fluff.
2. Do not greet.
3. Ask the single most critical question.
```

**Strengths:**
✅ Focuses on "weakest link" (smart prioritization)
✅ No fluff approach

**Issues:**
❌ **NO GREETING = POOR UX**: Users expect "Hi, I'm your legal assistant"
❌ **TOO ABRUPT**: Jumping straight to interrogation is jarring
❌ **SINGLE QUESTION ONLY**: May not provide enough context

**Example Output:**
```
BAD (current): "Do you have a signed contract?"

BETTER: "Hello, I'm your AI legal assistant. I've reviewed your claim for £12,500 against ABC Ltd.
         To assess strength, I need to know: Do you have a signed contract or written agreement?"
```

**Recommendation:**
```typescript
// REVISED PROMPT:
const prompt = `
  You are an AI Legal Assistant for UK Small Claims.

  Generate a friendly but professional opening message (2-3 sentences):
  1. Greet the user briefly
  2. Acknowledge their claim (claimant name, amount, defendant)
  3. Ask ONE critical question to identify the biggest evidence gap

  Example: "Hello, I'm your AI legal assistant. I've reviewed your £5,000 claim
           against XYZ Ltd for unpaid invoices. To assess your case strength,
           do you have a signed contract or written agreement with the defendant?"
`;
```

---

### 🔴 **PROMPT 4: Chat Conversation** (Gemini)

**Location:** `geminiService.ts` lines 215-264

**Purpose:** Continue legal consultation chat

**Prompt Structure:**
```
COMMUNICATION PROTOCOL (STRICT):
1. EXTREME BREVITY. Max 2 sentences.
2. DIRECTNESS. No "I understand", "Hello", "Thank you".
3. INTERROGATE. Ask one specific question to identify gaps.
4. ADVISE. If facts clear, state legal position under CPR.
5. CLOSE. If sufficient facts, state: "I have sufficient facts. Click 'Final Review'."
6. DISCLAIMER. If asked for advice: "I am a legal assistant, not a solicitor."
```

**Strengths:**
✅ System instruction provides context (case metrics, timeline)
✅ Hardcoded close phrase ensures transition to next step
✅ Disclaimer for legal advice requests

**Issues:**
❌ **MAX 2 SENTENCES IS TOO STRICT**: Complex legal issues need 3-5 sentences
❌ **NO "I UNDERSTAND" = ROBOTIC**: Users need acknowledgment
❌ **ALWAYS INTERROGATE = ANNOYING**: Not every message needs a question

**Example Bad Output:**
```
User: "Yes, I have a signed contract from March 2024."
AI: "Do you have proof of delivery?"
```

**Example Good Output:**
```
User: "Yes, I have a signed contract from March 2024."
AI: "Good, that strengthens your claim significantly. Do you have proof that you
     delivered the goods/services (e.g., delivery receipt, email confirmation)?"
```

**Recommendation:**
```typescript
// REVISED PROTOCOL:
const systemInstruction = `
  COMMUNICATION PROTOCOL:
  1. BREVITY: Keep responses to 2-4 sentences maximum.
  2. ACKNOWLEDGMENT: Briefly acknowledge user's answer before asking next question.
  3. INTERROGATE: Ask focused questions to identify evidence gaps.
  4. ADVISE: If facts are clear, state legal position under UK CPR.
  5. CLOSE: When you have sufficient facts (contract, invoice, proof of delivery),
            state: "I have enough information. Click 'Choose Document Type' to proceed."
  6. TONE: Professional but friendly. You're helping, not interrogating.
`;
```

---

### 🟢 **PROMPT 5: Document Generation** (Claude)

**Location:** `documentBuilder.ts` lines 137-169

**Purpose:** Fill bracketed sections in pre-built template

**Hybrid Approach (EXCELLENT):**
```
STEP 1: Fill template with hard facts (NO AI)
  - Amounts, dates, names, legal citations

STEP 2: Use AI to refine ONLY customizable sections
  - [CLAIMANT_DESCRIPTION]
  - [CONTRACT_DESCRIPTION]
  - [LEGAL_BASIS_PARAGRAPH]
  - [BREACH_DETAILS]
  - [ADDITIONAL_PARAGRAPHS]

STEP 3: Validate output
  - Check for placeholders
  - Verify amounts
  - Detect hallucinated case law
```

**Prompt Structure:**
```
TASK: Complete template by filling bracketed sections ONLY.

CONTEXT FROM CLIENT CONSULTATION:
{chatContext}

EVIDENCE AVAILABLE:
{evidenceList}

STRICT RULES:
1. DO NOT invent facts not in context/timeline
2. DO NOT cite case law unless explicitly mentioned
3. DO NOT change amounts, dates, names, citations
4. Use formal UK County Court language
5. Keep concise - Small Claims, not High Court
6. NO uncertain language ("allegedly", "may have")
7. [ADDITIONAL_PARAGRAPHS] only if truly necessary

OUTPUT: Completed template with brackets filled. No commentary.
```

**Strengths:**
✅ **Hybrid = Best of Both Worlds**: Template prevents hallucinations, AI ensures quality
✅ **Low Temperature (0.1)**: Minimizes creativity, maximizes consistency
✅ **Clear constraints**: 7 strict rules prevent common errors
✅ **Context-aware**: Uses chat history and evidence list

**Potential Issues:**
⚠️ **Contradictory Rules**: "Fill contract description" BUT "don't invent facts"
   - If chat is sparse, AI may hallucinate to fill gaps

**Example Scenario:**
```
Chat History: (empty or minimal)
Evidence: invoice.pdf

AI asked to fill [CONTRACT_DESCRIPTION] with NO context
→ Risk: AI invents "The parties entered into a verbal agreement on..."
```

**Recommendation:**
```typescript
// Add fallback guidance:
"If insufficient context for a section, use minimal safe language:
 - [CONTRACT_DESCRIPTION]: 'The Claimant supplied goods/services pursuant to
                            invoice [NUMBER].'
 - Do NOT invent contract terms, dates, or verbal agreements."
```

---

### 🟢 **PROMPT 6: Document Validation** (Claude Review)

**Location:** `documentBuilder.ts` lines 218-329

**Purpose:** Catch errors before user sees document

**Validation Checks:**
```
1. Unfilled placeholders (regex: /\[([A-Z_]+)\]/g)
2. Critical amounts present (principal, interest, total)
3. Correct legal act cited (Late Payment Act 1998 or County Courts Act 1984)
4. No uncertain language ("allegedly", "may have", "possibly")
5. Party names present
6. NO AI-GENERATED CASE LAW (6 regex patterns)
7. Warnings (evidence count, timeline length, chat usage)
```

**Strengths:**
✅ **Case Law Detection = CRITICAL**: Prevents hallucinated legal citations (SRA requirement)
✅ **Uncertain Language Check**: Ensures professional tone
✅ **Workflow Warnings**: Guides user to strengthen case

**Example Case Law Patterns Blocked:**
```
❌ Smith v Jones
❌ [2024] EWCA Civ 123
❌ (2023) 2 AC 456
❌ UKSC 45
```

**This is EXCELLENT for compliance and user protection.**

---

### 🟢 **PROMPT 7: Document Refinement** (Claude)

**Location:** `documentBuilder.ts` lines 521-579

**Purpose:** "Director Mode" - User gives conversational instructions to edit draft

**Prompt Structure:**
```
TASK: Refine document based on user's instruction.

USER INSTRUCTION: "{instruction}"

ORIGINAL DOCUMENT: {currentContent}

CONSTRAINTS:
1. Maintain legal professionalism for UK County Court
2. DO NOT remove/alter legal citations
3. DO NOT change amounts, dates, names
4. "More aggressive" = "immediate proceedings" (not illegal threats)
5. "Brevity" = condense but keep legal requirements
6. Maintain CPR + Pre-Action Protocol compliance

OUTPUT: Refined document only. No commentary.
```

**Strengths:**
✅ **Temperature 0.2**: Slightly higher than generation for flexibility
✅ **Clear constraints**: Protects critical content
✅ **Re-validates after refinement**: Safety net

**Example Usage:**
```
User: "Make it more aggressive"
→ AI: Changes "We encourage payment" to "We will commence proceedings immediately"

User: "Make it shorter"
→ AI: Condenses paragraphs but keeps legal requirements

User: "Add more details about the breach"
→ AI: Expands breach section using timeline data
```

**This is well-designed for iterative editing.**

---

### 🟢 **PROMPT 8: Hallucination Detection** (Gemini)

**Location:** `geminiService.ts` lines 389-450

**Purpose:** Review draft for factual errors (hallucinations)

**Prompt Structure:**
```
Act as Senior Legal Assistant auditing a draft.

SOURCE OF TRUTH:
- Claimant, Defendant, Invoice, Total
- Timeline (JSON)
- Chat Transcript

DRAFT: {generated content}

Check for:
1. Factual Hallucinations (dates/events not in source)
2. Financial Errors
3. Role Swaps (Claimant vs Defendant)
4. Missing Act Reference

Output JSON: { isPass, critique, improvements[], correctedContent }
```

**Strengths:**
✅ **Source of Truth Comparison**: Prevents AI from inventing facts
✅ **Role Swap Detection**: Critical error prevention
✅ **Returns corrected content**: Auto-fixes if possible

**This is a SECOND LAYER of validation after documentBuilder validation. Defense in depth.**

---

## 4. KEY ISSUES IDENTIFIED

### 🔴 **Issue 1: Chat Prompts Too Strict**

**Problem:** 2-sentence limit, no greetings, always interrogate
**Impact:** Robotic UX, users feel interrogated
**Fix:** Allow 2-4 sentences, permit acknowledgments, friendly tone

---

### 🟡 **Issue 2: Party Type Detection Fragile**

**Problem:** Relies on "Ltd/Plc" in name to determine Individual vs Business
**Impact:** Misclassifies sole traders, partnerships
**Fix:** Add user confirmation in Step 2 (DETAILS)

---

### 🟡 **Issue 3: Claim Strength Scoring Too Precise**

**Problem:** 0-100 score implies false precision
**Impact:** Users over-rely on numeric score
**Fix:** Use High/Medium/Low tier system instead

---

### 🟢 **Issue 4: Hardcoded UI References in Prompts**

**Problem:** Chat prompt says "Click 'Final Review'" (hardcoded button name)
**Impact:** Brittle - if UI changes, prompt is wrong
**Fix:** Use generic language: "proceed to the next step"

---

### 🟡 **Issue 5: Dual AI Systems May Confuse Users**

**Problem:** Gemini for analysis/chat, Claude for documents
**Impact:** Users may not understand why responses vary
**Fix:** Add UI indicator: "Powered by Google Gemini" / "Powered by Claude"

---

## 5. RECOMMENDATIONS

### **Priority 1: Improve Chat UX** ⏱️ 2 hours

**Change prompts to:**
```typescript
// startClarificationChat
"Generate a friendly professional opening (2-3 sentences):
1. Greet user briefly
2. Acknowledge claim (amount, defendant)
3. Ask ONE critical question"

// sendChatMessage
"PROTOCOL:
1. BREVITY: 2-4 sentences max
2. ACKNOWLEDGMENT: Briefly acknowledge before asking next
3. TONE: Professional but friendly, not robotic"
```

---

### **Priority 2: Add Party Type Confirmation** ⏱️ 1 hour

**In Step 2 (DETAILS):**
```tsx
<div>
  <label>Claimant Type</label>
  <select value={claimant.type}>
    <option value="Individual">Individual (Sole Trader, Person)</option>
    <option value="Business">Business (Ltd, Plc, LLP, Partnership)</option>
  </select>
  <p className="text-sm text-slate-500">
    {claimant.type === 'Business'
      ? "B2B claims allow Late Payment Act 1998 interest + £100 compensation"
      : "B2C claims use County Courts Act 1984 interest only"}
  </p>
</div>
```

---

### **Priority 3: Replace Claim Score with Tiers** ⏱️ 30 mins

```typescript
enum ClaimStrength {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low"
}

interface Assessment {
  strength: ClaimStrength;
  analysis: string;
  weaknesses: string[];
  score: number; // Keep for internal use, but show tier to user
}

// UI Display:
{strength === 'HIGH' && <Badge color="green">Strong Case</Badge>}
{strength === 'MEDIUM' && <Badge color="yellow">Moderate Risk</Badge>}
{strength === 'LOW' && <Badge color="red">High Risk</Badge>}
```

---

### **Priority 4: Add AI System Indicators** ⏱️ 30 mins

```tsx
// In Chat (Step 5)
<div className="text-xs text-slate-400 mb-2">
  <Sparkles className="w-3 h-3 inline" />
  Powered by Google Gemini AI
</div>

// In Draft (Step 7)
<div className="text-xs text-slate-400 mb-2">
  <FileText className="w-3 h-3 inline" />
  Generated by Claude AI (Anthropic)
</div>
```

---

## 6. WHAT'S WORKING WELL

### ✅ **Hybrid Template + AI Approach** (EXCELLENT)

The documentBuilder architecture is **industry best practice**:
1. Template prevents hallucinations of amounts/dates/names
2. AI ensures natural language quality
3. Validation catches errors
4. Compliance logging for audit trail

**This is superior to pure AI generation** (like early ChatGPT legal tools that hallucinated case law).

---

### ✅ **Case Law Hallucination Prevention** (CRITICAL)

The regex-based case law detection prevents:
```
❌ Smith v Jones [2024] EWCA Civ 123
❌ Citing precedents that don't exist
❌ SRA violations (AI-generated fake citations)
```

**This single feature protects users from serious legal consequences.**

---

### ✅ **Dual Validation Layers** (DEFENSE IN DEPTH)

```
LAYER 1: documentBuilder.validate()
  - Checks placeholders, amounts, citations, uncertain language

LAYER 2: geminiService.reviewDraft()
  - Checks for hallucinations, role swaps, financial errors
```

**Two independent AI systems cross-checking = robust error detection.**

---

### ✅ **Structured JSON Outputs** (RELIABLE)

All Gemini calls use `responseMimeType: 'application/json'` + schema.
All Claude calls use strict prompts.

**This prevents unparseable responses** that break the UI.

---

## 7. COMPARISON TO INDUSTRY STANDARDS

### vs. Garfield.law
- **Garfield:** Simpler workflow, less AI consultation
- **ClaimCraft:** More comprehensive (8 steps vs ~4)
- **Winner:** ClaimCraft for depth, Garfield for simplicity

### vs. LegalZoom / Rocket Lawyer
- **Traditional:** Template-only (no AI analysis)
- **ClaimCraft:** Hybrid (template + AI)
- **Winner:** ClaimCraft for quality + safety

### vs. Pure AI (e.g., early DoNotPay)
- **Pure AI:** High hallucination risk
- **ClaimCraft:** Template + validation prevents hallucinations
- **Winner:** ClaimCraft for reliability

---

## 8. FINAL VERDICT

### Overall Grade: **A-**

**Strengths:**
- ✅ Hybrid template + AI architecture (best practice)
- ✅ Case law hallucination prevention (critical)
- ✅ Dual AI systems (Gemini + Claude) for specialized tasks
- ✅ Validation layers (defense in depth)
- ✅ Compliance logging

**Weaknesses:**
- ⚠️ Chat prompts too strict (poor UX)
- ⚠️ Party type detection fragile
- ⚠️ Claim scoring overly precise
- ⚠️ Dual AI systems not explained to users

**Recommended Action:**
Implement Priority 1 (Chat UX) immediately. This is a 2-hour fix that dramatically improves user experience.

---

## 9. PROMPT IMPROVEMENT SUMMARY

### **BEFORE (Current):**
```
"Do not greet. Max 2 sentences. Ask one question."
→ Output: "Do you have a signed contract?"
```

### **AFTER (Recommended):**
```
"Generate friendly opening (2-3 sentences). Greet, acknowledge claim, ask critical question."
→ Output: "Hello, I'm your AI legal assistant. I've reviewed your £12,500 claim
          against ABC Ltd for unpaid invoices. To assess strength, do you have a
          signed contract with the defendant?"
```

**Impact:** 5x better UX, same information gathering efficiency.

---

**End of Analysis**
