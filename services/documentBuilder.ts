import { ClaimState, GeneratedContent, DocumentType, PartyType, Party, UserProfile, PaymentDetails } from '../types';
import { getTemplate, generateBriefDetails, getDisclaimer } from './documentTemplates';
import { logDocumentGeneration } from './complianceLogger';
import { DEFAULT_PAYMENT_TERMS_DAYS } from '../constants';

/**
 * Format payment details for inclusion in documents
 * Returns a formatted string or fallback placeholder
 */
const formatPaymentDetails = (paymentDetails?: PaymentDetails): string => {
  if (!paymentDetails) {
    return '[ADD YOUR BANK DETAILS HERE]';
  }

  const { bankAccountHolder, bankName, sortCode, accountNumber, paymentReference } = paymentDetails;

  // Check if we have the minimum required fields
  if (!bankAccountHolder || !sortCode || !accountNumber) {
    return '[ADD YOUR BANK DETAILS HERE]';
  }

  const lines: string[] = [
    `Account Name: ${bankAccountHolder}`,
  ];

  if (bankName) {
    lines.push(`Bank: ${bankName}`);
  }

  lines.push(`Sort Code: ${sortCode}`);
  lines.push(`Account Number: ${accountNumber}`);

  if (paymentReference) {
    lines.push(`Reference: ${paymentReference}`);
  }

  return lines.join('\n');
};

/**
 * HYBRID TEMPLATE + AI DOCUMENT BUILDER
 *
 * Architecture:
 * 1. Fill template with hard facts (no AI) - prevents hallucinations
 * 2. Use AI to refine only customizable sections - ensures quality
 * 3. Validate output - catches errors
 * 4. Log for compliance - audit trail
 *
 * This approach is safer than pure AI generation and matches Garfield.law's methodology.
 *
 * SECURITY: Anthropic API calls are routed through the backend server
 * to keep API keys secure and prevent exposure in the browser.
 */

// Backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Warn if API URL is not configured (falling back to localhost)
if (!import.meta.env.VITE_API_URL) {
  console.warn(
    'VITE_API_URL environment variable is not set. Falling back to localhost:3001. ' +
    'Set VITE_API_URL in your .env file for production deployments.'
  );
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

export class DocumentBuilder {

  /**
   * Call Anthropic API through backend proxy
   * This keeps the API key secure on the server side
   * Includes 30-second timeout to prevent hanging
   */
  private static async callAnthropicAPI(
    messages: AnthropicMessage[],
    options: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      system?: string;
      timeout?: number; // Optional timeout in ms, defaults to 30000
    } = {}
  ): Promise<string> {
    const timeoutMs = options.timeout ?? 30000; // 30 second default timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE_URL}/api/anthropic/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || 'claude-sonnet-4-20250514',
          max_tokens: options.max_tokens || 4000,
          temperature: options.temperature ?? 0.1,
          messages,
          system: options.system
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Anthropic API error: ${error.message || response.statusText}`);
      }

      const data: AnthropicResponse = await response.json();

      const textContent = data.content.find(c => c.type === 'text');
      if (!textContent || !textContent.text) {
        throw new Error('Unexpected response format from Claude API');
      }

      return textContent.text;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`API request timed out after ${timeoutMs / 1000} seconds. Please try again.`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * STEP 1: Fill template with hard facts (NO AI)
   * This eliminates risk of hallucinated amounts, dates, names
   */
  private static fillTemplate(template: string, data: ClaimState, paymentDetails?: PaymentDetails): string {
    // B2B includes Sole Traders per Late Payment of Commercial Debts (Interest) Act 1998
    const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
    const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
    const isB2B = isClaimantBusiness && isDefendantBusiness;

    // Determine correct interest legislation
    const interestAct = isB2B
      ? "the Late Payment of Commercial Debts (Interest) Act 1998"
      : "section 69 of the County Courts Act 1984";

    const interestRate = isB2B
      ? "8 percentage points above the Bank of England base rate"
      : "8% per annum";

    // Calculate totals
    const totalClaim = (
      data.invoice.totalAmount +
      data.interest.totalInterest +
      data.compensation
    ).toFixed(2);

    // Format timeline for Letter Before Action (bullet points)
    const timelineEvents = data.timeline
      .map(event => `- ${this.formatDate(event.date)}: ${event.description}`)
      .join('\n');

    // Format timeline for Form N1 (numbered paragraphs)
    const timelineNumbered = data.timeline
      .map((event, idx) => `       ${idx + 1}. ${this.formatDate(event.date)}: ${event.description}`)
      .join('\n\n');

    // Determine interest start date
    // Use actual due date if provided, otherwise default to invoice date + default payment terms
    let interestStartDate: Date;
    if (data.invoice.dueDate) {
      const parsedDueDate = this.parseDate(data.invoice.dueDate);
      if (!parsedDueDate) {
        throw new Error('Invalid due date format. Please enter a valid date.');
      }
      interestStartDate = parsedDueDate;
    } else {
      const invoiceDate = this.parseDate(data.invoice.dateIssued);
      if (!invoiceDate) {
        throw new Error('Invalid invoice date format. Please enter a valid date.');
      }
      interestStartDate = new Date(invoiceDate);
      interestStartDate.setDate(interestStartDate.getDate() + DEFAULT_PAYMENT_TERMS_DAYS);
    }

    // Payment due description
    const paymentDueDesc = data.invoice.dueDate
      ? `on ${this.formatDate(data.invoice.dueDate)}`
      : `within ${DEFAULT_PAYMENT_TERMS_DAYS} days of the invoice date`;

    // Compensation clause (only for B2B)
    const compensationClause = data.compensation > 0
      ? `Fixed compensation of £${data.compensation.toFixed(2)} pursuant to the Late Payment of Commercial Debts (Interest) Act 1998`
      : "Not applicable";

    // Pre-Action Protocol standard response time for debt claims
    const LBA_RESPONSE_DAYS = 30;

    // Perform all replacements
    let filled = template
      .replace(/\[CLAIMANT_NAME\]/g, data.claimant.name)
      .replace(/\[CLAIMANT_ADDRESS\]/g, this.formatAddress(data.claimant))
      .replace(/\[DEFENDANT_NAME\]/g, data.defendant.name)
      .replace(/\[DEFENDANT_ADDRESS\]/g, this.formatAddress(data.defendant))
      .replace(/\[DATE\]/g, this.formatDate(new Date().toISOString()))
      .replace(/\[INVOICE_NUMBER\]/g, data.invoice.invoiceNumber || 'N/A')
      .replace(/\[INVOICE_DATE\]/g, this.formatDate(data.invoice.dateIssued))
      .replace(/\[PRINCIPAL\]/g, data.invoice.totalAmount.toFixed(2))
      .replace(/\[INTEREST\]/g, data.interest.totalInterest.toFixed(2))
      .replace(/\[COMPENSATION\]/g, data.compensation.toFixed(2))
      .replace(/\[TOTAL_CLAIM\]/g, totalClaim)
      .replace(/\[INTEREST_ACT\]/g, interestAct)
      .replace(/\[INTEREST_RATE\]/g, interestRate)
      .replace(/\[DAILY_RATE\]/g, data.interest.dailyRate.toFixed(2))
      .replace(/\[TIMELINE_EVENTS\]/g, timelineEvents)
      .replace(/\[TIMELINE_NUMBERED\]/g, timelineNumbered)
      .replace(/\[INTEREST_START_DATE\]/g, this.formatDate(interestStartDate.toISOString()))
      .replace(/\[PAYMENT_DUE_DESCRIPTION\]/g, paymentDueDesc)
      .replace(/\[COMPENSATION_CLAUSE\]/g, compensationClause)
      .replace(/\[LBA_RESPONSE_DAYS\]/g, LBA_RESPONSE_DAYS.toString())
      // Additional placeholders for new document types
      .replace(/\[DUE_DATE\]/g, data.invoice.dueDate ? this.formatDate(data.invoice.dueDate) : 'N/A')
      .replace(/\[INVOICE_DESCRIPTION\]/g, data.invoice.description || 'Goods/services as per invoice')
      .replace(/\[DAYS_OVERDUE\]/g, data.interest.daysOverdue.toString())
      // AMOUNT_DUE: For polite reminders, user can choose principal-only or total (with interest)
      .replace(/\[AMOUNT_DUE\]/g, data.includeInterestInReminder ? totalClaim : data.invoice.totalAmount.toFixed(2))
      .replace(/\[SETTLEMENT_AMOUNT\]/g, (parseFloat(totalClaim) * 0.85).toFixed(2)) // 15% discount as settlement
      .replace(/\[PAYMENT_DETAILS\]/g, formatPaymentDetails(paymentDetails))
      .replace(/\[NUMBER_OF_INSTALLMENTS\]/g, '6') // Default 6 month plan
      .replace(/\[INSTALLMENT_AMOUNT\]/g, (parseFloat(totalClaim) / 6).toFixed(2))
      .replace(/\[FIRST_PAYMENT_DATE\]/g, this.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())) // 30 days from now
      // Polite Reminder specific placeholders
      .replace(/\[CLAIMANT_CONTACT_LINE\]/g, this.formatContactLine(data.claimant))
      .replace(/\[GREETING_NAME\]/g, data.defendant.contactName || 'Accounts Department')
      // Personalized salutation: use contact name if available, otherwise formal
      .replace(/\[SALUTATION\]/g, this.formatSalutation(data.defendant.contactName));

    return filled;
  }

  /**
   * Format a personalized salutation based on contact name availability
   * If contact name exists, use "Dear Mr/Ms [LastName],"
   * Otherwise, use formal "Dear Sir/Madam,"
   */
  private static formatSalutation(contactName?: string): string {
    if (!contactName || contactName.trim() === '') {
      return 'Dear Sir/Madam,';
    }

    // Extract last name (assume last word is surname)
    const nameParts = contactName.trim().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];

    // Check for common titles already in the name
    const lowerName = contactName.toLowerCase();
    if (lowerName.includes('mr ') || lowerName.includes('mr.')) {
      return `Dear Mr ${lastName},`;
    }
    if (lowerName.includes('mrs ') || lowerName.includes('mrs.')) {
      return `Dear Mrs ${lastName},`;
    }
    if (lowerName.includes('ms ') || lowerName.includes('ms.')) {
      return `Dear Ms ${lastName},`;
    }
    if (lowerName.includes('miss ')) {
      return `Dear Miss ${lastName},`;
    }
    if (lowerName.includes('dr ') || lowerName.includes('dr.') || lowerName.includes('doctor')) {
      return `Dear Dr ${lastName},`;
    }

    // Default: use full name for professional correspondence
    return `Dear ${contactName},`;
  }

  /**
   * STEP 2: Use AI to refine ONLY customizable sections
   * AI fills: [CLAIMANT_DESCRIPTION], [CONTRACT_DESCRIPTION], etc.
   * This gives human-quality writing while preventing hallucinations.
   */
  private static async refineWithAI(
    filledTemplate: string,
    data: ClaimState
  ): Promise<string> {

    // Prepare context from chat history
    const chatContext = data.chatHistory.length > 0
      ? data.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
      : 'No consultation chat available.';

    // Prepare evidence list
    const evidenceList = data.evidence.length > 0
      ? data.evidence.map(e => `- ${e.name}: ${e.classification || 'Unclassified'}`).join('\n')
      : 'No evidence files uploaded.';

    // Determine document type for appropriate instructions
    const isPoliteReminder = data.selectedDocType === DocumentType.POLITE_CHASER;
    const isLBA = data.selectedDocType === DocumentType.LBA;

    // Determine party types for legal basis
    const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
    const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
    const isB2B = isClaimantBusiness && isDefendantBusiness;

    const prompt = isPoliteReminder
      ? `You are a business communication assistant helping draft a polite payment reminder.

TASK: Complete the template below by filling in ONLY the bracketed sections. This is an INFORMAL, FRIENDLY reminder - not a legal document.

IMPORTANT FACTS (DO NOT MODIFY):
- From: ${data.claimant.name} (${data.claimant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- To: ${data.defendant.name} (${data.defendant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- Invoice Number: ${data.invoice.invoiceNumber}
- Invoice Amount: £${data.invoice.totalAmount.toFixed(2)}
- Invoice Date: ${data.invoice.dateIssued}

BRACKETED SECTIONS TO FILL:
- [CLAIMANT_DESCRIPTION] - Usually leave empty for polite reminders
- [DEFENDANT_DESCRIPTION] - Usually leave empty for polite reminders
- [CONTRACT_DESCRIPTION] - Usually leave empty for polite reminders
- [LEGAL_BASIS_PARAGRAPH] - Usually leave empty for polite reminders
- [BREACH_DETAILS] - Usually leave empty for polite reminders
- [CLOSING_PARAGRAPH] - Usually leave empty for polite reminders
- [ADDITIONAL_PARAGRAPHS] - Usually leave empty for polite reminders

CONTEXT FROM CONVERSATION:
${chatContext}

EVIDENCE AVAILABLE:
${evidenceList}

TONE AND STYLE:
1. Keep it friendly, polite, and professional
2. Assume good faith - suggest possible reasons for oversight (invoice lost, query about service, payment overlooked)
3. Use softer language - "may have", "might be", "perhaps" are APPROPRIATE here
4. DO NOT threaten legal action - this is pre-LBA
5. DO NOT cite legal acts or statutes - this is not a legal letter
6. Keep it brief and conversational
7. Most bracketed sections should be left empty - the template already has good content

TEMPLATE TO COMPLETE:
${filledTemplate}

OUTPUT: Return ONLY the completed template with all brackets filled. No commentary, explanations, markdown, or code blocks. DO NOT use any markdown formatting such as **bold**, *italic*, # headers, or bullet points with dashes. Output plain text only.`
      : `You are a legal document preparation assistant for UK Small Claims Court proceedings.

TASK: Complete the template below by filling in ONLY the bracketed sections. These sections require professional legal writing based on the context provided.

IMPORTANT CLAIM FACTS (DO NOT MODIFY):
- Claimant: ${data.claimant.name} (${data.claimant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- Defendant: ${data.defendant.name} (${data.defendant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- Invoice Number: ${data.invoice.invoiceNumber}
- Invoice Amount: £${data.invoice.totalAmount.toFixed(2)}
- Invoice Date: ${data.invoice.dateIssued}

BRACKETED SECTIONS TO FILL (ALL MUST BE FILLED - DO NOT LEAVE ANY BRACKETS):
- [CLAIMANT_DESCRIPTION] - Brief description (e.g., "${data.claimant.type === PartyType.BUSINESS ? 'a limited company trading as [business type]' : 'an individual'}")
- [DEFENDANT_DESCRIPTION] - Brief description of the defendant (e.g., "${data.defendant.type === PartyType.BUSINESS ? 'a company' : 'an individual'}")
- [CONTRACT_DESCRIPTION] - Describe the contract/agreement in 1-2 sentences. Be specific about goods/services if mentioned in context.
- [LEGAL_BASIS_PARAGRAPH] - REQUIRED. Write: "The Defendant is liable to pay the Claimant the sum of £${(data.invoice.totalAmount + data.interest.totalInterest + data.compensation).toFixed(2)} under the contract for [goods/services]. The Claimant is entitled to statutory interest under ${isB2B ? 'the Late Payment of Commercial Debts (Interest) Act 1998' : 'section 69 of the County Courts Act 1984'}."
- [BREACH_DETAILS] - If there are specific breach details from the chat (e.g., "The Defendant acknowledged the debt on [date]" or "A partial payment of £X was made"), include them. Otherwise write: "The Defendant has failed to make payment despite repeated demands."
- [CLOSING_PARAGRAPH] - ${isLBA ? 'REQUIRED for LBA. Write a professional closing such as "We trust you will treat this matter with the urgency it deserves. Failure to respond or pay will result in court proceedings being commenced without further notice."' : 'Leave empty for N1 forms.'}
- [ADDITIONAL_PARAGRAPHS] - Only add if there's genuinely unique information (partial payment, dispute, admission). Otherwise leave empty.

CONTEXT FROM CLIENT CONSULTATION:
${chatContext}

EVIDENCE AVAILABLE:
${evidenceList}

STRICT RULES:
1. DO NOT invent facts - only use information from the context above
2. DO NOT cite case law unless explicitly mentioned by the user
3. DO NOT change any amounts, dates, names, or legal citations already in the template
4. Use formal but concise legal language - Small Claims Track, not High Court
5. Keep each bracketed section to 1-2 sentences maximum
6. DO NOT include uncertain language like "allegedly", "may have", "possibly", "appears"
7. [ADDITIONAL_PARAGRAPHS] should usually be empty unless there are special circumstances
8. If a bracketed section is not applicable or has no info, replace it with a simple factual statement

TEMPLATE TO COMPLETE:
${filledTemplate}

OUTPUT: Return ONLY the completed template with all brackets filled. No commentary, explanations, markdown, or code blocks. DO NOT use any markdown formatting such as **bold**, *italic*, # headers, or bullet points with dashes. Output plain text only.`;

    try {
      // Use backend proxy to call Anthropic API (keeps API key secure)
      const result = await this.callAnthropicAPI(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.1  // LOW temperature for consistency and safety
        }
      );

      return result;

    } catch (error: any) {
      console.error('AI refinement failed:', error);

      // Fallback: Return template with minimal fills
      return this.fillTemplateFallback(filledTemplate, data);
    }
  }

  /**
   * Fallback if AI fails - fill with minimal safe content
   */
  private static fillTemplateFallback(template: string, data: ClaimState): string {
    const isIndividualClaimant = data.claimant.type === PartyType.INDIVIDUAL;
    const isIndividualDefendant = data.defendant.type === PartyType.INDIVIDUAL;
    const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
    const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
    const isB2B = isClaimantBusiness && isDefendantBusiness;

    // For Polite Reminder, keep bracketed sections empty (template already has good content)
    if (data.selectedDocType === DocumentType.POLITE_CHASER) {
      return template
        .replace(/\[CLAIMANT_DESCRIPTION\]/g, '')
        .replace(/\[DEFENDANT_DESCRIPTION\]/g, '')
        .replace(/\[CONTRACT_DESCRIPTION\]/g, '')
        .replace(/\[LEGAL_BASIS_PARAGRAPH\]/g, '')
        .replace(/\[BREACH_DETAILS\]/g, '')
        .replace(/\[CLOSING_PARAGRAPH\]/g, '')
        .replace(/\[ADDITIONAL_PARAGRAPHS\]/g, '');
    }

    // Determine claimant description
    const claimantDesc = isIndividualClaimant
      ? 'an individual'
      : data.claimant.type === PartyType.SOLE_TRADER
        ? 'a sole trader'
        : 'a limited company';

    // Determine defendant description
    const defendantDesc = isIndividualDefendant
      ? 'an individual'
      : data.defendant.type === PartyType.SOLE_TRADER
        ? 'a sole trader'
        : 'a limited company';

    // Legal basis with correct interest act
    const totalClaim = (data.invoice.totalAmount + data.interest.totalInterest + data.compensation).toFixed(2);
    const interestAct = isB2B
      ? 'the Late Payment of Commercial Debts (Interest) Act 1998'
      : 'section 69 of the County Courts Act 1984';

    const legalBasisParagraph = `The Defendant is liable to pay the Claimant the sum of £${totalClaim} under the contract for goods and/or services supplied. The Claimant is entitled to statutory interest under ${interestAct}.`;

    // Closing paragraph for LBA
    const closingParagraph = data.selectedDocType === DocumentType.LBA
      ? 'We trust you will treat this matter with the urgency it deserves. Failure to respond or pay within the stated time will result in court proceedings being commenced without further notice, which may result in additional costs being awarded against you.'
      : '';

    // For formal legal documents
    return template
      .replace(/\[CLAIMANT_DESCRIPTION\]/g, claimantDesc)
      .replace(/\[DEFENDANT_DESCRIPTION\]/g, defendantDesc)
      .replace(/\[CONTRACT_DESCRIPTION\]/g, `The Claimant supplied goods and/or services to the Defendant pursuant to a contract, as evidenced by invoice ${data.invoice.invoiceNumber} dated ${this.formatDate(data.invoice.dateIssued)}.`)
      .replace(/\[LEGAL_BASIS_PARAGRAPH\]/g, legalBasisParagraph)
      .replace(/\[BREACH_DETAILS\]/g, 'Despite repeated demands for payment, the Defendant has failed to pay the outstanding sum.')
      .replace(/\[CLOSING_PARAGRAPH\]/g, closingParagraph)
      .replace(/\[ADDITIONAL_PARAGRAPHS\]/g, '');
  }

  /**
   * STEP 3: Validate the generated document
   * Catches common errors before the user sees the document
   */
  private static validate(document: string, data: ClaimState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determine if this is a formal legal document or an informal reminder
    const isFormalDocument = data.selectedDocType !== DocumentType.POLITE_CHASER;

    // 1. Check for unfilled placeholders
    const placeholderMatch = document.match(/\[([A-Z_]+)\]/g);
    if (placeholderMatch) {
      errors.push(`Template contains unfilled placeholders: ${placeholderMatch.join(', ')}`);
    }

    // 2. Check critical amounts are present and correct
    const totalClaim = (
      data.invoice.totalAmount +
      data.interest.totalInterest +
      data.compensation
    ).toFixed(2);

    // For Polite Reminder, only check principal amount (it doesn't include interest/compensation)
    if (data.selectedDocType === DocumentType.POLITE_CHASER) {
      if (!document.includes(data.invoice.totalAmount.toFixed(2))) {
        errors.push(`Principal amount £${data.invoice.totalAmount.toFixed(2)} is missing`);
      }
    } else {
      // For formal documents, check total claim amount
      if (!document.includes(totalClaim)) {
        errors.push(`Total claim amount £${totalClaim} is missing from the document`);
      }

      if (!document.includes(data.invoice.totalAmount.toFixed(2))) {
        errors.push(`Principal amount £${data.invoice.totalAmount.toFixed(2)} is missing`);
      }
    }

    // 3. Check legal act is cited correctly (ONLY for formal legal documents)
    // Polite Reminder doesn't require legal citations - it's an informal friendly reminder
    if (isFormalDocument) {
      // B2B includes Sole Traders per Late Payment of Commercial Debts (Interest) Act 1998
      const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
      const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
      const isB2B = isClaimantBusiness && isDefendantBusiness;

      const requiredAct = isB2B
        ? 'Late Payment of Commercial Debts'
        : 'County Courts Act 1984';

      if (!document.includes(requiredAct)) {
        errors.push(`Missing required interest legislation citation: ${requiredAct}`);
      }
    }

    // 4. Check for uncertain/unprofessional language (ONLY for formal legal documents)
    // Polite Reminder is intentionally informal and uses softer language like "may have"
    if (isFormalDocument) {
      const uncertainWords = ['allegedly', 'may have', 'possibly', 'might', 'perhaps', 'probably'];
      const foundUncertain = uncertainWords.filter(word =>
        document.toLowerCase().includes(word)
      );

      if (foundUncertain.length > 0) {
        errors.push(`Uncertain language detected (not suitable for legal documents): ${foundUncertain.join(', ')}`);
      }
    }

    // 5. Check party names are present (with safety checks for empty/null names)
    // NOTE: N1 forms use party descriptions (e.g., "an individual", "a company") instead of
    // actual names per UK CPR Practice Direction 16, so we skip this check for N1 documents.
    const claimantName = data.claimant?.name?.trim() || '';
    const defendantName = data.defendant?.name?.trim() || '';
    const isN1Form = data.selectedDocType === DocumentType.FORM_N1;

    // Only check name presence for non-N1 documents (N1 uses descriptions, not names)
    if (!isN1Form) {
      if (claimantName && !document.toLowerCase().includes(claimantName.toLowerCase())) {
        console.warn(`[validate] Claimant name "${claimantName}" not found in document`);
        errors.push('Claimant name missing from document');
      }

      if (defendantName && !document.toLowerCase().includes(defendantName.toLowerCase())) {
        console.warn(`[validate] Defendant name "${defendantName}" not found in document`);
        errors.push('Defendant name missing from document');
      }
    }

    // Also check if names themselves are missing (sanity check)
    if (!claimantName) {
      errors.push('Claimant name is empty or missing in claim data');
    }
    if (!defendantName) {
      errors.push('Defendant name is empty or missing in claim data');
    }

    // 6. Check for AI-generated case law (PROHIBITED - SRA requirement)
    const caseLawPatterns = [
      /\b[A-Z][a-z]+ v\.? [A-Z][a-z]+\b/g,           // Smith v Jones, Smith v. Jones
      /\[\d{4}\]\s+[A-Z]{2,}/g,                      // [2023] EWCA, [2024] UKSC
      /\(\d{4}\)\s+[A-Z]{2,}/g,                      // (2023) QB, (2024) AC
      /\bEWCA Civ\s+\d+/gi,                          // EWCA Civ 123
      /\bUKSC\s+\d+/gi,                              // UKSC 45
      /\b\d+\s+[A-Z]{2,}\s+\d+\b/g,                 // 2 AC 123, 3 WLR 456
    ];

    const detectedCases: string[] = [];
    caseLawPatterns.forEach(pattern => {
      const matches = document.match(pattern);
      if (matches) {
        detectedCases.push(...matches);
      }
    });

    // Filter out false positives: exclude party names from "X v Y" pattern matches
    const claimantFirstName = claimantName.split(' ')[0] || '';
    const claimantLastName = claimantName.split(' ').pop() || '';
    const defendantFirstName = defendantName.split(' ')[0] || '';
    const defendantLastName = defendantName.split(' ').pop() || '';

    const filteredCases = detectedCases.filter(match => {
      // If match contains actual party names, it's likely a reference to the parties, not a case citation
      // Skip empty names in the filter
      const excludeClaimantFirst = claimantFirstName && match.includes(claimantFirstName);
      const excludeClaimantLast = claimantLastName && match.includes(claimantLastName);
      const excludeDefendantFirst = defendantFirstName && match.includes(defendantFirstName);
      const excludeDefendantLast = defendantLastName && match.includes(defendantLastName);
      const excludeClaimantFull = claimantName && match.includes(claimantName);
      const excludeDefendantFull = defendantName && match.includes(defendantName);

      return !excludeClaimantFirst &&
             !excludeClaimantLast &&
             !excludeDefendantFirst &&
             !excludeDefendantLast &&
             !excludeClaimantFull &&
             !excludeDefendantFull;
    });

    if (filteredCases.length > 0) {
      errors.push(`AI-generated case law citations detected (prohibited): ${filteredCases.slice(0, 3).join(', ')}${filteredCases.length > 3 ? '...' : ''}. Remove all case citations.`);
    }

    // 7. Additional validation for LBA documents
    if (data.selectedDocType === DocumentType.LBA) {
      // Check that LBA_RESPONSE_DAYS is present
      if (!document.includes('30 days')) {
        warnings.push('LBA response deadline (30 days) may be missing. Verify the letter includes the Pre-Action Protocol response time.');
      }

      // Check for essential LBA elements
      if (!document.toLowerCase().includes('pre-action protocol')) {
        errors.push('LBA must reference the Pre-Action Protocol for Debt Claims');
      }
    }

    // 8. Additional validation for N1 documents
    if (data.selectedDocType === DocumentType.FORM_N1) {
      // Check for required N1 structure
      if (!document.includes('PARTICULARS OF CLAIM')) {
        errors.push('N1 must include "PARTICULARS OF CLAIM" heading');
      }

      if (!document.includes('THE PARTIES')) {
        errors.push('N1 must include "THE PARTIES" section');
      }

      if (!document.includes('AND the Claimant claims:')) {
        errors.push('N1 must include the formal claims section starting with "AND the Claimant claims:"');
      }

      // Check for continuing interest clause
      if (!document.toLowerCase().includes('continuing interest')) {
        warnings.push('N1 should include continuing interest provision');
      }
    }

    // 9. Warnings (non-critical but recommended)
    if (data.evidence.length === 0) {
      warnings.push('No evidence uploaded. Upload invoices, contracts, or email chains to strengthen your case (especially important if debtor disputes the claim).');
    }

    if (data.timeline.length < 1) {
      warnings.push(`Timeline is empty. Add at least the invoice date to establish when the debt arose.`);
    }

    if (!data.chatHistory || data.chatHistory.length === 0) {
      warnings.push('No AI legal consultation conducted. Use the chat feature (Step 5) to identify potential weaknesses in your case before sending the letter.');
    }

    // 10. Workflow-based warnings
    if (data.invoice.dueDate) {
      const dueDate = this.parseDate(data.invoice.dueDate);
      if (!dueDate) {
        errors.push('Invalid due date format');
        return { isValid: false, errors, warnings };
      }
      const now = new Date();
      const daysSinceDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (data.selectedDocType === DocumentType.LBA && daysSinceDue < 7) {
        warnings.push(`Sending Letter Before Action only ${daysSinceDue} days after payment due date may seem aggressive. Consider sending a friendly reminder first to maintain the business relationship.`);
      }

      if (daysSinceDue > 180) {
        warnings.push(`Debt is ${Math.floor(daysSinceDue / 30)} months overdue. Very old debts may be harder to recover and could approach the 6-year limitation period.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * STEP 4: Log document generation for compliance/audit
   */
  private static async logGeneration(data: ClaimState, document: string): Promise<void> {
    try {
      await logDocumentGeneration({
        claimId: data.id,
        userId: data.claimant.email || 'unknown',
        documentType: data.selectedDocType,
        generatedAt: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
        templateVersion: '1.0',
        inputData: {
          principal: data.invoice.totalAmount,
          interest: data.interest.totalInterest,
          compensation: data.compensation,
          totalClaim: data.invoice.totalAmount + data.interest.totalInterest + data.compensation,
          claimant: data.claimant.name,
          defendant: data.defendant.name,
          invoiceNumber: data.invoice.invoiceNumber
        },
        documentHash: this.hashDocument(document),
        evidenceCount: data.evidence.length,
        timelineEventCount: data.timeline.length,
        chatMessageCount: data.chatHistory.length
      });
    } catch (error) {
      console.error('Compliance logging failed (non-critical):', error);
      // Don't throw - logging failure shouldn't block document generation
    }
  }

  /**
   * Simple hash for document verification
   */
  private static hashDocument(doc: string): string {
    // Simple hash using btoa - in production use crypto.subtle.digest
    try {
      return btoa(doc.substring(0, 1000)).substring(0, 32);
    } catch {
      return 'hash-error';
    }
  }

  /**
   * Format address for legal documents
   */
  private static formatAddress(party: Party): string {
    const parts = [
      party.address,
      party.city,
      party.county,
      party.postcode
    ].filter(p => p && p.trim() !== '');

    return parts.join('\n');
  }

  /**
   * Format contact line for Polite Reminder (phone and email)
   * Returns formatted string like "Tel: 0123 456789 | Email: info@company.com"
   * or empty string if no contact details available
   */
  private static formatContactLine(party: Party): string {
    const parts: string[] = [];

    if (party.phone && party.phone.trim()) {
      parts.push(`Tel: ${party.phone.trim()}`);
    }

    if (party.email && party.email.trim()) {
      parts.push(`Email: ${party.email.trim()}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  }

  /**
   * Validate and parse a date string
   * Returns a valid Date object or null if invalid
   */
  private static parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Check if date is within reasonable range (1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      return null;
    }

    return date;
  }

  /**
   * Format date in UK legal format
   * Returns the original string if date is invalid
   */
  private static formatDate(isoDate: string): string {
    try {
      const date = this.parseDate(isoDate);
      if (!date) {
        console.warn('Invalid date for formatting:', isoDate);
        return isoDate;
      }

      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, isoDate);
      return isoDate;
    }
  }

  /**
   * Get legal basis summary for the claim
   */
  private static getLegalBasis(data: ClaimState): string {
    // B2B includes Sole Traders per Late Payment of Commercial Debts (Interest) Act 1998
    const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
    const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
    const isB2B = isClaimantBusiness && isDefendantBusiness;

    return isB2B
      ? 'Contract Law + Late Payment of Commercial Debts (Interest) Act 1998'
      : 'Contract Law + County Courts Act 1984, s.69';
  }

  /**
   * Get next steps for user guidance
   */
  private static getNextSteps(docType: DocumentType, courtFee: number): string[] {
    if (docType === DocumentType.LBA) {
      return [
        'Send this letter to the defendant via Royal Mail Signed For or Recorded Delivery',
        'Keep proof of postage for court evidence',
        'Wait 30 days for the defendant to respond',
        'If no response or payment, proceed to file Form N1 with the County Court',
        'Consider seeking legal advice before court proceedings'
      ];
    } else {
      return [
        'Review the Particulars of Claim carefully for accuracy',
        `Pay the court fee of £${courtFee.toFixed(2)} when filing`,
        'Complete and sign the Statement of Truth on Form N1',
        'Submit via Money Claim Online (MCOL) at www.moneyclaim.gov.uk or by post to your local County Court',
        'Serve a copy of the claim on the defendant within 4 months',
        'The defendant has 14 days to respond after service'
      ];
    }
  }

  /**
   * MAIN PUBLIC METHOD
   * Generates a legal document using the hybrid template + AI approach
   * @param data - The claim data
   * @param userProfile - Optional user profile for payment details in documents
   */
  public static async generateDocument(data: ClaimState, userProfile?: UserProfile): Promise<GeneratedContent> {
    try {
      // Pre-validation: Ensure we have minimum required data
      if (!data.invoice.totalAmount || data.invoice.totalAmount <= 0) {
        throw new Error('Invalid claim amount. Please enter a valid invoice amount.');
      }

      if (!data.claimant.name || !data.defendant.name) {
        throw new Error('Both claimant and defendant names are required.');
      }

      if (!data.selectedDocType) {
        throw new Error('No document type selected. Please choose Letter Before Action or Form N1.');
      }

      // Validate invoice date
      if (!data.invoice.dateIssued) {
        throw new Error('Invoice date is required.');
      }
      const invoiceDate = this.parseDate(data.invoice.dateIssued);
      if (!invoiceDate) {
        throw new Error('Invalid invoice date format. Please enter a valid date in DD/MM/YYYY format.');
      }

      // Validate due date if provided
      if (data.invoice.dueDate) {
        const dueDate = this.parseDate(data.invoice.dueDate);
        if (!dueDate) {
          throw new Error('Invalid due date format. Please enter a valid date in DD/MM/YYYY format.');
        }
      }

      // Step 1: Get the appropriate template
      const template = getTemplate(data.selectedDocType);

      // Step 2: Fill template with hard facts (no AI)
      const filledTemplate = this.fillTemplate(template, data, userProfile?.paymentDetails);

      // Step 3: Refine customizable sections with AI
      const refinedDocument = await this.refineWithAI(filledTemplate, data);

      // Step 4: Validate the output
      const validation = this.validate(refinedDocument, data);

      if (!validation.isValid) {
        console.error('Document validation failed:', validation.errors);
        throw new Error(`Document validation failed: ${validation.errors.join('; ')}`);
      }

      // Log warnings (don't throw)
      if (validation.warnings.length > 0) {
        console.warn('Document warnings:', validation.warnings);
      }

      // Step 5: Log for compliance
      await this.logGeneration(data, refinedDocument);

      // Step 6: Generate brief details for Form N1
      const briefDetails = data.selectedDocType === DocumentType.FORM_N1
        ? generateBriefDetails(
            data.invoice.invoiceNumber || 'N/A',
            data.defendant.name,
            'goods/services'
          )
        : undefined;

      // Step 7: Generate review/compliance check
      const review = await this.generateReview(refinedDocument, data);

      // Step 8: Auto-apply corrections if available
      let finalContent = refinedDocument;
      if (!review.isPass && review.correctedContent) {
        // Validate the corrected content before using it
        const correctedValidation = this.validate(review.correctedContent, data);
        if (correctedValidation.isValid) {
          // Auto-correction successful - use corrected content
          finalContent = review.correctedContent;
          // Preserve original review data for UI display
          review.wasAutoCorrected = true;
          review.originalCritique = review.critique;
          review.originalImprovements = [...review.improvements];
          // Update review to reflect successful auto-correction
          review.isPass = true;
          review.critique = 'Document verified. Minor issues were automatically corrected.';
          // Keep improvements for display in collapsible section
        } else {
          // Corrected content also has issues - keep original and require manual review
          console.warn('Auto-correction produced invalid document, keeping original:', correctedValidation.errors);
        }
      }

      // Step 9: Return completed document (NO disclaimer in actual content - shown separately in UI)
      return {
        documentType: data.selectedDocType,
        content: finalContent,
        briefDetails,
        legalBasis: this.getLegalBasis(data),
        nextSteps: this.getNextSteps(data.selectedDocType, data.courtFee),
        validation: {
          isValid: validation.isValid,
          warnings: validation.warnings,
          generatedAt: new Date().toISOString()
        },
        review
      };

    } catch (error: any) {
      console.error('Document generation failed:', error);
      throw new Error(`Failed to generate document: ${error.message}`);
    }
  }

  /**
   * Generate review/compliance check for the document
   * This enables the "Approve to Send" flow
   */
  private static async generateReview(
    document: string,
    data: ClaimState
  ): Promise<{
    isPass: boolean;
    critique: string;
    improvements: string[];
    correctedContent?: string;
    wasAutoCorrected?: boolean;
    originalCritique?: string;
    originalImprovements?: string[];
  }> {
    const totalClaimValue = (
      data.invoice.totalAmount +
      data.interest.totalInterest +
      data.compensation
    ).toFixed(2);

    const chatTranscript = data.chatHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    // Determine the legally correct interest statute to expect in the draft
    // B2B includes Sole Traders per Late Payment of Commercial Debts (Interest) Act 1998
    const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
    const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
    const isB2B = isClaimantBusiness && isDefendantBusiness;
    const expectedInterestStatute = isB2B
      ? 'the Late Payment of Commercial Debts (Interest) Act 1998'
      : 'section 69 of the County Courts Act 1984';

    const prompt = `You are a Senior Legal Assistant auditing a UK Small Claims Court document.

--- SOURCE OF TRUTH ---
Claimant: ${data.claimant.name} (${data.claimant.type})
Claimant Address: ${data.claimant.address || ''}, ${data.claimant.city || ''}, ${data.claimant.county || ''}, ${data.claimant.postcode || ''}
Defendant: ${data.defendant.name} (${data.defendant.type})
Defendant Address: ${data.defendant.address || ''}, ${data.defendant.city || ''}, ${data.defendant.county || ''}, ${data.defendant.postcode || ''}

INVOICE DETAILS:
- Invoice Number: ${data.invoice.invoiceNumber}
- Invoice Amount: £${data.invoice.totalAmount.toFixed(2)}
- Invoice Date: ${data.invoice.dateIssued || 'Not specified'}
- Due Date: ${data.invoice.dueDate || 'Not specified'}
- Description: ${data.invoice.description || 'Not specified'}

CLAIM TOTALS:
- Principal: £${data.invoice.totalAmount.toFixed(2)}
- Interest: £${data.interest?.totalInterest?.toFixed(2) || '0.00'}
- Compensation: £${data.compensation?.toFixed(2) || '0.00'}
- Total Claim (ex court fee): £${totalClaimValue}

EXPECTED STATUTORY INTEREST BASIS:
- The document MUST cite: ${expectedInterestStatute}

TIMELINE (Events entered by user):
${data.timeline.map(t => `- ${t.date}: ${t.description} [${t.type}]`).join('\n') || 'No timeline events'}

LBA STATUS: ${data.lbaAlreadySent ? `Sent on ${data.lbaSentDate || 'date not recorded'}` : 'Not yet sent'}

TRANSCRIPT:
${chatTranscript || 'No consultation conducted.'}

--- DRAFT DOCUMENT ---
${document}

Check for:
1. Factual Hallucinations - ONLY flag facts that are NOT in the SOURCE OF TRUTH above. Dates and events from the user's timeline are NOT hallucinations.
2. Financial Errors - amounts must match the CLAIM TOTALS above
3. Role Swaps - Claimant vs Defendant names/roles mixed up
4. Missing Interest Statute - must cite EXACTLY: ${expectedInterestStatute}
5. Party names and addresses must match SOURCE OF TRUTH

IMPORTANT: The invoice date, due date, timeline events, and LBA status shown above were entered by the user. These are NOT hallucinations - they are verified source data.

Output JSON with this EXACT structure (no markdown):
{
  "isPass": true or false,
  "critique": "Brief summary of document quality",
  "improvements": ["List of specific issues if any"],
  "correctedContent": "If isPass is false, provide the COMPLETE corrected document text here with all issues fixed. If isPass is true, omit this field or set to null."
}

IMPORTANT: If there are issues (isPass is false), you MUST provide the correctedContent field with the full corrected document. Do not just describe the issues - fix them in the correctedContent.

If the document is accurate and matches the SOURCE OF TRUTH, set isPass to true with an empty improvements array.`;

    try {
      const result = await this.callAnthropicAPI(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000, // Increased to allow full corrected document
          temperature: 0
        }
      );

      // Parse the JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isPass: Boolean(parsed.isPass),
          critique: parsed.critique || 'Document reviewed.',
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
          correctedContent: parsed.correctedContent || undefined
        };
      }

      // Fallback if parsing fails
      return {
        isPass: false,
        critique: 'Automated review failed (unparseable response). Please verify the document manually before approving.',
        improvements: ['Automated compliance review could not be parsed; manual review required before sending.']
      };
    } catch (error) {
      console.error('Review generation failed:', error);
      // Fail closed: if review is unavailable, require user override to proceed
      return {
        isPass: false,
        critique: 'Automated review unavailable. Please verify the document manually before approving.',
        improvements: ['Automated compliance review did not run; manual review required before sending.']
      };
    }
  }

  /**
   * Refine an existing document based on user instructions
   * (Used for "Director Mode" - conversational refinement)
   */
  public static async refineDocument(
    currentContent: string,
    instruction: string,
    data: ClaimState
  ): Promise<string> {
    const prompt = `You are a legal document specialist for UK Small Claims Court.

TASK: Refine the legal document below based on the user's instruction.

USER INSTRUCTION: "${instruction}"

ORIGINAL DOCUMENT:
${currentContent}

CONSTRAINTS:
1. Maintain strict legal professionalism suitable for UK County Court
2. DO NOT remove or alter legal citations (e.g., County Courts Act 1984, Late Payment Act 1998)
3. DO NOT change any monetary amounts, dates, or party names
4. If the instruction asks for "more aggressive" tone, use phrases like "immediate commencement of proceedings" but never threaten illegal action
5. If the instruction asks for brevity, condense paragraphs but keep all legal requirements
6. Maintain compliance with CPR (Civil Procedure Rules) and Pre-Action Protocol

OUTPUT: Return ONLY the refined document text. No commentary or explanations.`;

    try {
      const result = await this.callAnthropicAPI(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.2
        }
      );

      // Validate the refined document
      const validation = this.validate(result, data);

      if (!validation.isValid) {
        console.warn('Refinement produced invalid document, returning original:', validation.errors);
        return currentContent;
      }

      return result;
    } catch (error) {
      console.error('Document refinement failed:', error);
      // On error, return original content
      return currentContent;
    }
  }
}
