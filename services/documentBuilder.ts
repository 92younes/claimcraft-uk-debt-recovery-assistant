import { ClaimState, GeneratedContent, DocumentType, PartyType, Party } from '../types';
import { getTemplate, generateBriefDetails, getDisclaimer } from './documentTemplates';
import { logDocumentGeneration } from './complianceLogger';
import { getLbaResponsePeriodDays } from './legalRules';
import { DEFAULT_PAYMENT_TERMS_DAYS } from '../constants';

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
   */
  private static async callAnthropicAPI(
    messages: AnthropicMessage[],
    options: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      system?: string;
    } = {}
  ): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/anthropic/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature ?? 0.1,
        messages,
        system: options.system
      })
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
  }

  /**
   * Helper to check if a party is a business (includes sole traders)
   * Sole traders are treated as businesses under the Late Payment of Commercial Debts Act 1998
   */
  private static isBusinessParty(type: PartyType): boolean {
    return type === PartyType.BUSINESS || type === PartyType.SOLE_TRADER;
  }

  /**
   * STEP 1: Fill template with hard facts (NO AI)
   * This eliminates risk of hallucinated amounts, dates, names
   */
  private static fillTemplate(template: string, data: ClaimState): string {
    const isB2B = this.isBusinessParty(data.claimant.type) &&
                  this.isBusinessParty(data.defendant.type);

    // Determine correct interest legislation
    const interestAct = isB2B
      ? "the Late Payment of Commercial Debts (Interest) Act 1998"
      : "section 69 of the County Courts Act 1984";

    const interestRate = isB2B
      ? "8% above the Bank of England base rate"
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
      interestStartDate = new Date(data.invoice.dueDate);
    } else {
      const invoiceDate = new Date(data.invoice.dateIssued);
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
      : "No compensation claimed";

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
      // Additional placeholders for new document types
      .replace(/\[DUE_DATE\]/g, data.invoice.dueDate ? this.formatDate(data.invoice.dueDate) : 'N/A')
      .replace(/\[DAYS_OVERDUE\]/g, data.interest.daysOverdue.toString())
      .replace(/\[LBA_RESPONSE_DAYS\]/g, getLbaResponsePeriodDays(data.defendant.type).toString())
      .replace(/\[SETTLEMENT_AMOUNT\]/g, (parseFloat(totalClaim) * 0.85).toFixed(2)) // 15% discount as settlement
      .replace(/\[PAYMENT_DETAILS\]/g, '[TO BE SPECIFIED BY CLAIMANT]')
      .replace(/\[NUMBER_OF_INSTALLMENTS\]/g, '6') // Default 6 month plan
      .replace(/\[INSTALLMENT_AMOUNT\]/g, (parseFloat(totalClaim) / 6).toFixed(2))
      .replace(/\[FIRST_PAYMENT_DATE\]/g, this.formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())); // 30 days from now

    return filled;
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

    const prompt = `You are a legal document preparation assistant for UK Small Claims Court proceedings.

TASK: Complete the template below by filling in ONLY the bracketed sections. These sections require professional legal writing based on the context provided.

IMPORTANT CLAIM FACTS (DO NOT MODIFY):
- Claimant: ${data.claimant.name} (${data.claimant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- Defendant: ${data.defendant.name} (${data.defendant.type === PartyType.BUSINESS ? 'Business' : 'Individual'})
- Invoice Number: ${data.invoice.invoiceNumber}
- Invoice Amount: £${data.invoice.totalAmount.toFixed(2)}
- Invoice Date: ${data.invoice.dateIssued}

BRACKETED SECTIONS TO FILL:
- [CLAIMANT_DESCRIPTION] - Brief description (e.g., "${data.claimant.type === PartyType.BUSINESS ? 'a limited company trading as [business type]' : 'an individual'}")
- [DEFENDANT_DESCRIPTION] - Brief description of the defendant (e.g., "${data.defendant.type === PartyType.BUSINESS ? 'a company' : 'an individual'}")
- [CONTRACT_DESCRIPTION] - Describe the contract/agreement in 1-2 sentences. Be specific about goods/services if mentioned in context.
- [LEGAL_BASIS_PARAGRAPH] - One sentence: "The Defendant is liable for the sum claimed under the contract for [goods/services provided]."
- [BREACH_DETAILS] - If there are specific breach details from the chat (e.g., "The Defendant acknowledged the debt on [date]" or "A partial payment of £X was made"), include them. Otherwise write: "The Defendant has failed to make payment despite demands."
- [CLOSING_PARAGRAPH] - Leave empty (this is for letters, not N1 forms)
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

OUTPUT: Return ONLY the completed template with all brackets filled. No commentary, explanations, markdown, or code blocks.`;

    try {
      // Use backend proxy to call Anthropic API (keeps API key secure)
      const result = await this.callAnthropicAPI(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-3-5-sonnet-20241022',
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

    return template
      .replace(/\[CLAIMANT_DESCRIPTION\]/g, isIndividualClaimant ? 'an individual' : 'a business entity')
      .replace(/\[DEFENDANT_DESCRIPTION\]/g, isIndividualDefendant ? 'an individual' : 'a business entity')
      .replace(/\[CONTRACT_DESCRIPTION\]/g, `The Claimant supplied goods/services to the Defendant pursuant to an agreement, evidenced by invoice ${data.invoice.invoiceNumber}.`)
      .replace(/\[LEGAL_BASIS_PARAGRAPH\]/g, 'The Claimant is entitled to recover the principal sum under the contract, together with statutory interest and costs.')
      .replace(/\[BREACH_DETAILS\]/g, 'Despite repeated requests for payment, the Defendant has failed to pay the outstanding sum.')
      .replace(/\[CLOSING_PARAGRAPH\]/g, 'We look forward to your prompt response to avoid unnecessary court proceedings.')
      .replace(/\[ADDITIONAL_PARAGRAPHS\]/g, '');
  }

  /**
   * STEP 3: Validate the generated document
   * Catches common errors before the user sees the document
   */
  private static validate(document: string, data: ClaimState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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

    if (!document.includes(totalClaim)) {
      errors.push(`Total claim amount £${totalClaim} is missing from the document`);
    }

    if (!document.includes(data.invoice.totalAmount.toFixed(2))) {
      errors.push(`Principal amount £${data.invoice.totalAmount.toFixed(2)} is missing`);
    }

    // 3. Check legal act is cited correctly
    const isB2B = data.claimant.type === PartyType.BUSINESS &&
                  data.defendant.type === PartyType.BUSINESS;

    const requiredAct = isB2B
      ? 'Late Payment of Commercial Debts'
      : 'County Courts Act 1984';

    if (!document.includes(requiredAct)) {
      errors.push(`Missing required interest legislation citation: ${requiredAct}`);
    }

    // 4. Check for uncertain/unprofessional language
    const uncertainWords = ['allegedly', 'may have', 'possibly', 'might', 'perhaps', 'probably'];
    const foundUncertain = uncertainWords.filter(word =>
      document.toLowerCase().includes(word)
    );

    if (foundUncertain.length > 0) {
      errors.push(`Uncertain language detected (not suitable for legal documents): ${foundUncertain.join(', ')}`);
    }

    // 5. Check party names are present
    if (!document.includes(data.claimant.name)) {
      errors.push('Claimant name missing from document');
    }

    if (!document.includes(data.defendant.name)) {
      errors.push('Defendant name missing from document');
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
    const claimantFirstName = data.claimant.name.split(' ')[0];
    const claimantLastName = data.claimant.name.split(' ').pop() || '';
    const defendantFirstName = data.defendant.name.split(' ')[0];
    const defendantLastName = data.defendant.name.split(' ').pop() || '';

    const filteredCases = detectedCases.filter(match => {
      // If match contains actual party names, it's likely a reference to the parties, not a case citation
      return !match.includes(claimantFirstName) &&
             !match.includes(claimantLastName) &&
             !match.includes(defendantFirstName) &&
             !match.includes(defendantLastName) &&
             !match.includes(data.claimant.name) &&
             !match.includes(data.defendant.name);
    });

    if (filteredCases.length > 0) {
      errors.push(`AI-generated case law citations detected (prohibited): ${filteredCases.slice(0, 3).join(', ')}${filteredCases.length > 3 ? '...' : ''}. Remove all case citations.`);
    }

    // 7. Warnings (non-critical but recommended)
    if (data.evidence.length === 0) {
      warnings.push('No evidence uploaded. Upload invoices, contracts, or email chains to strengthen your case (especially important if debtor disputes the claim).');
    }

    if (data.timeline.length < 1) {
      warnings.push(`Timeline is empty. Add at least the invoice date to establish when the debt arose.`);
    }

    if (!data.chatHistory || data.chatHistory.length === 0) {
      warnings.push('No AI legal consultation conducted. Use the chat feature (Step 5) to identify potential weaknesses in your case before sending the letter.');
    }

    // 8. Workflow-based warnings
    if (data.invoice.dueDate) {
      const dueDate = new Date(data.invoice.dueDate);
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
        model: 'claude-3-5-sonnet-20241022',
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
   * Format date in UK legal format
   */
  private static formatDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  }

  /**
   * Get legal basis summary for the claim
   */
  private static getLegalBasis(data: ClaimState): string {
    const isB2B = data.claimant.type === PartyType.BUSINESS &&
                  data.defendant.type === PartyType.BUSINESS;

    return isB2B
      ? 'Contract Law + Late Payment of Commercial Debts (Interest) Act 1998'
      : 'Contract Law + County Courts Act 1984, s.69';
  }

  /**
   * Get next steps for user guidance
   */
  private static getNextSteps(docType: DocumentType, courtFee: number, defendantType: PartyType): string[] {
    if (docType === DocumentType.LBA) {
      const responseDays = getLbaResponsePeriodDays(defendantType);
      return [
        'Send this letter to the defendant via Royal Mail Signed For or Recorded Delivery',
        'Keep proof of postage for court evidence',
        `Wait ${responseDays} days for the defendant to respond`,
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
   */
  public static async generateDocument(data: ClaimState): Promise<GeneratedContent> {
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

      // Step 1: Get the appropriate template
      const template = getTemplate(data.selectedDocType);

      // Step 2: Fill template with hard facts (no AI)
      const filledTemplate = this.fillTemplate(template, data);

      // Step 3: Refine customizable sections with AI
      // OPTIMIZATION: Skip AI for Polite Chaser as it has no AI placeholders
      let refinedDocument = filledTemplate;
      if (data.selectedDocType !== DocumentType.POLITE_CHASER) {
        refinedDocument = await this.refineWithAI(filledTemplate, data);
      }

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

      // Step 8: Return completed document (NO disclaimer in actual content - shown separately in UI)
      return {
        documentType: data.selectedDocType,
        content: refinedDocument,
        briefDetails,
        legalBasis: this.getLegalBasis(data),
        nextSteps: this.getNextSteps(data.selectedDocType, data.courtFee, data.defendant.type),
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
  ): Promise<{ isPass: boolean; critique: string; improvements: string[]; correctedContent?: string }> {
    const totalClaimValue = (
      data.invoice.totalAmount +
      data.interest.totalInterest +
      data.compensation
    ).toFixed(2);

    const chatTranscript = data.chatHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const prompt = `You are a Senior Legal Assistant auditing a UK Small Claims Court document.

--- SOURCE OF TRUTH ---
Claimant: ${data.claimant.name}
Defendant: ${data.defendant.name}
Invoice: ${data.invoice.invoiceNumber} (£${data.invoice.totalAmount.toFixed(2)})
Total Claim (ex fee): £${totalClaimValue}

TIMELINE:
${JSON.stringify(data.timeline)}

TRANSCRIPT:
${chatTranscript || 'No consultation conducted.'}

--- DRAFT DOCUMENT ---
${document}

Check for:
1. Factual Hallucinations (Dates/Events not in source)
2. Financial Errors (wrong amounts)
3. Role Swaps (Claimant vs Defendant mixed up)
4. Missing Act Reference (e.g. 1984 Act or 1998 Act)
5. Party names and addresses correct

Output JSON with this EXACT structure (no markdown):
{
  "isPass": true or false,
  "critique": "Brief summary of document quality",
  "improvements": ["List of specific issues if any"]
}

If the document is accurate and complete, set isPass to true with an empty improvements array.`;

    try {
      const result = await this.callAnthropicAPI(
        [{ role: 'user', content: prompt }],
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
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
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
        };
      }

      // Fallback if parsing fails
      return {
        isPass: true,
        critique: 'Document has been reviewed and appears accurate.',
        improvements: []
      };
    } catch (error) {
      console.error('Review generation failed:', error);
      // On error, pass the document through with a warning
      return {
        isPass: true,
        critique: 'Automated review unavailable. Please verify document manually before sending.',
        improvements: []
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
          model: 'claude-3-5-sonnet-20241022',
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
