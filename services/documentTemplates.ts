import { DocumentType } from "../types";

/**
 * TEMPLATE: Letter Before Action (Pre-Action Protocol for Debt Claims)
 *
 * This template complies with the Pre-Action Protocol for Debt Claims.
 * Mandatory fields are filled programmatically to prevent hallucinations.
 * AI only fills bracketed sections like [CLAIMANT_DESCRIPTION].
 */
export const LETTER_BEFORE_ACTION_TEMPLATE = `[CLAIMANT_NAME]
[CLAIMANT_ADDRESS]

[DATE]

[DEFENDANT_NAME]
[DEFENDANT_ADDRESS]

Dear Sir/Madam,

RE: PRE-ACTION PROTOCOL FOR DEBT CLAIMS - OUTSTANDING DEBT OF £[TOTAL_CLAIM]

We write on behalf of [CLAIMANT_NAME] ("the Creditor") regarding the following outstanding debt:

**DEBT DETAILS**

Invoice Number: [INVOICE_NUMBER]
Invoice Date: [INVOICE_DATE]
Principal Amount: £[PRINCIPAL]
Interest (under [INTEREST_ACT]): £[INTEREST]
Compensation (Late Payment Act 1998): £[COMPENSATION]
**Total Outstanding: £[TOTAL_CLAIM]**

**CHRONOLOGY OF EVENTS**

[TIMELINE_EVENTS]

**LEGAL BASIS**

[LEGAL_BASIS_PARAGRAPH]

**WHAT YOU MUST DO NOW**

In accordance with the Pre-Action Protocol for Debt Claims, you must respond to this letter within 30 days of the date of this letter.

If you dispute this debt, you must set out your reasons in writing within 30 days. If you fail to respond or do not pay the outstanding sum in full, court proceedings will be commenced against you without further notice.

This may result in:
- A County Court Judgment (CCJ) being registered against you
- Additional court fees and legal costs being added to your debt
- Enforcement action including bailiffs and charging orders
- Damage to your credit rating

**PRE-ACTION PROTOCOL COMPLIANCE**

This letter is sent in strict compliance with the Pre-Action Protocol for Debt Claims. Please find enclosed the following documents required by the Protocol:
- Annex 1: Information Sheet on Debt and Mental Health
- Annex 2: Financial Statement (Reply Form)

We strongly encourage you to seek free debt advice from organisations such as Citizens Advice or StepChange if you are experiencing financial difficulties.

[CLOSING_PARAGRAPH]

Yours faithfully,

[CLAIMANT_NAME]

---
IMPORTANT NOTICE: This is not legal advice. If you dispute this claim, you should seek independent legal advice immediately.
`;

/**
 * TEMPLATE: Form N1 - Particulars of Claim
 *
 * This template follows the CPR (Civil Procedure Rules) format for Small Claims Track.
 * Structured in numbered paragraphs as required by Practice Direction 16.
 */
export const FORM_N1_PARTICULARS_TEMPLATE = `PARTICULARS OF CLAIM

1. THE PARTIES

   1.1 The Claimant is [CLAIMANT_DESCRIPTION].

   1.2 The Defendant is [DEFENDANT_DESCRIPTION].

2. THE AGREEMENT

   2.1 [CONTRACT_DESCRIPTION]

   2.2 The invoice numbered [INVOICE_NUMBER] was issued to the Defendant on [INVOICE_DATE] for the sum of £[PRINCIPAL].

   2.3 Payment was due [PAYMENT_DUE_DESCRIPTION].

3. THE BREACH

   3.1 In breach of the agreement, the Defendant has failed to pay the invoice despite repeated requests for payment.

   3.2 The timeline of events is as follows:

   [TIMELINE_NUMBERED]

   3.3 [BREACH_DETAILS]

4. THE CLAIM

   4.1 The Claimant claims the following sums:

       (a) Principal sum: £[PRINCIPAL]

       (b) Interest of £[INTEREST] pursuant to [INTEREST_ACT] calculated at [INTEREST_RATE] from [INTEREST_START_DATE] to [DATE]

       (c) [COMPENSATION_CLAUSE]

       (d) Continuing interest at the daily rate of £[DAILY_RATE] pursuant to [INTEREST_ACT] from [DATE] until judgment or sooner payment

       (e) Court fees and costs as permitted under CPR Part 27

   4.2 The total claim amount is £[TOTAL_CLAIM].

[ADDITIONAL_PARAGRAPHS]

AND the Claimant claims:

(1) The sum of £[TOTAL_CLAIM]
(2) Interest as set out above
(3) Costs
`;

/**
 * Brief details generator for Form N1 front page
 * (Limited to 24 words on the physical form)
 */
export const generateBriefDetails = (
  invoiceNumber: string,
  defendantName: string,
  serviceDescription: string = "goods/services"
): string => {
  const brief = `Money claim for unpaid invoice ${invoiceNumber} regarding ${serviceDescription} supplied to ${defendantName}`;

  // Truncate to ~24 words if needed
  const words = brief.split(' ');
  if (words.length > 24) {
    return words.slice(0, 24).join(' ') + '...';
  }

  return brief;
};

/**
 * Get the appropriate template based on document type
 */
export const getTemplate = (docType: DocumentType): string => {
  switch (docType) {
    case DocumentType.FORM_N1:
      return FORM_N1_PARTICULARS_TEMPLATE;
    case DocumentType.LBA:
      return LETTER_BEFORE_ACTION_TEMPLATE;
    default:
      throw new Error(`Unknown document type: ${docType}`);
  }
};

/**
 * Legal disclaimers for each document type
 */
export const DISCLAIMERS = {
  [DocumentType.LBA]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. This letter is provided for
informational purposes only. You should consult a qualified solicitor before sending
this letter or taking any legal action.
  `.trim(),

  [DocumentType.FORM_N1]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Before filing this claim with
the court, you MUST:
1. Review all details for accuracy
2. Ensure you have complied with the Pre-Action Protocol for Debt Claims
3. Seek independent legal advice from a qualified solicitor
4. Sign the Statement of Truth only if all information is true to the best of your knowledge
  `.trim()
};

/**
 * Get disclaimer for document type
 */
export const getDisclaimer = (docType: DocumentType): string => {
  return DISCLAIMERS[docType] || '';
};
