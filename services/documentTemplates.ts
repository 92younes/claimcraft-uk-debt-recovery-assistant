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

In accordance with the Pre-Action Protocol for Debt Claims, you must respond to this letter within [LBA_RESPONSE_DAYS] days of the date of this letter.

If you dispute this debt, you must set out your reasons in writing within [LBA_RESPONSE_DAYS] days. If you fail to respond or do not pay the outstanding sum in full, court proceedings will be commenced against you without further notice.

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
IMPORTANT: If you dispute this claim, you should seek independent legal advice immediately.
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
 * TEMPLATE: Polite Payment Reminder (Pre-LBA Step)
 *
 * A friendly, informal reminder sent before formal Letter Before Action.
 * Maintains professional relationship while requesting payment.
 * NO formal legal elements, NO annexes - purely relationship-focused.
 */
export const POLITE_CHASER_TEMPLATE = `[CLAIMANT_NAME]
[CLAIMANT_ADDRESS]

[DATE]

[DEFENDANT_NAME]
[DEFENDANT_ADDRESS]

Dear Sir/Madam,

RE: FRIENDLY REMINDER - INVOICE [INVOICE_NUMBER]

I hope this letter finds you well. I am writing regarding an outstanding invoice that may have been overlooked:

INVOICE DETAILS

Invoice Number: [INVOICE_NUMBER]
Invoice Date: [INVOICE_DATE]
Amount Due: £[AMOUNT_DUE]
Description: [INVOICE_DESCRIPTION]
Payment Due Date: [DUE_DATE]

Our records show that payment is now [DAYS_OVERDUE] days overdue. I wanted to reach out personally as there may be a simple explanation.

POSSIBLE REASONS

- The invoice may not have reached your accounts department
- There may be a query about the goods or services provided
- Payment may have simply been overlooked in a busy period

If any of these apply, please do get in touch so we can sort this out together.

HOW TO PAY

Payment can be made by bank transfer to:

[PAYMENT_DETAILS]

Please use invoice number [INVOICE_NUMBER] as your payment reference.

NEED TO DISCUSS?

If there is anything you would like to discuss about this invoice, or if you are experiencing any difficulties, please contact me:

[CLAIMANT_NAME]
[CLAIMANT_ADDRESS]

We value our relationship and are happy to discuss payment arrangements if that would help.

I look forward to hearing from you soon.

Yours faithfully,

[CLAIMANT_NAME]
`;

/**
 * TEMPLATE: Installment Payment Agreement
 *
 * Formal agreement for payment by installments.
 * Legally binding once signed by both parties.
 */
export const INSTALLMENT_AGREEMENT_TEMPLATE = `INSTALLMENT PAYMENT AGREEMENT

This Agreement is made on [DATE]

BETWEEN:

(1) [CLAIMANT_NAME] of [CLAIMANT_ADDRESS] ("the Creditor"); and

(2) [DEFENDANT_NAME] of [DEFENDANT_ADDRESS] ("the Debtor").

**BACKGROUND**

A. The Debtor owes the Creditor the sum of £[TOTAL_CLAIM] ("the Debt") arising from Invoice [INVOICE_NUMBER] dated [INVOICE_DATE].

B. The parties have agreed that the Debt shall be repaid by installments on the terms set out below.

**AGREED TERMS**

1. **ACKNOWLEDGMENT OF DEBT**
   The Debtor acknowledges that they owe the Creditor the sum of £[TOTAL_CLAIM].

2. **PAYMENT BY INSTALLMENTS**
   The Debtor agrees to pay the Debt by [NUMBER_OF_INSTALLMENTS] monthly installments of £[INSTALLMENT_AMOUNT] each.

3. **PAYMENT SCHEDULE**
   The first payment shall be due on [FIRST_PAYMENT_DATE] and subsequent payments shall be due on the same day of each following month until the Debt is paid in full.

4. **DEFAULT**
   If the Debtor misses any payment, the entire outstanding balance shall become immediately due and payable, and the Creditor may commence legal proceedings without further notice.

5. **INTEREST**
   No further interest shall accrue provided all installments are paid on time. If the Debtor defaults, interest shall accrue at [INTEREST_RATE] on the outstanding balance.

6. **EARLY REPAYMENT**
   The Debtor may repay the Debt in full or in part at any time without penalty.

7. **GOVERNING LAW**
   This Agreement shall be governed by the laws of England and Wales.

**SIGNED BY THE PARTIES**

Signed by [CLAIMANT_NAME]: ___________________ Date: ___________

Signed by [DEFENDANT_NAME]: ___________________ Date: ___________
`;

/**
 * TEMPLATE: Default Judgment (Form N225)
 *
 * Application for default judgment when defendant fails to respond.
 * Must be filed within 6 months of service.
 */
export const DEFAULT_JUDGMENT_TEMPLATE = `FORM N225 - REQUEST FOR DEFAULT JUDGMENT

**CLAIM NUMBER:** [CLAIM_NUMBER]

**CLAIMANT:** [CLAIMANT_NAME]

**DEFENDANT:** [DEFENDANT_NAME]

**APPLICATION FOR DEFAULT JUDGMENT**

I [CLAIMANT_NAME] apply for default judgment against the Defendant in respect of the claim issued on [CLAIM_ISSUE_DATE].

**GROUNDS FOR APPLICATION**

1. The claim was served on the Defendant on [SERVICE_DATE].

2. The time for filing a defence has now expired (14 days from service, or 28 days if Acknowledgment of Service filed).

3. The Defendant has failed to:
   - File an Acknowledgment of Service; OR
   - File a Defence within the prescribed time

4. No response has been received from the Defendant to date.

**AMOUNT CLAIMED**

Principal sum claimed: £[PRINCIPAL]
Interest to date of judgment: £[INTEREST]
Court fees: £[COURT_FEE]
**Total amount of judgment requested: £[TOTAL_CLAIM]**

**CONTINUING INTEREST**

I request that interest continues to accrue at the rate of £[DAILY_RATE] per day from the date of judgment until payment in full.

**STATEMENT OF TRUTH**

I believe that the facts stated in this application are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

Signed: _________________ Date: [DATE]

[CLAIMANT_NAME]
`;

/**
 * TEMPLATE: Admission Response (Form N225A)
 *
 * Application for judgment following defendant's admission.
 * Used when defendant admits claim but disputes payment terms.
 */
export const ADMISSION_TEMPLATE = `FORM N225A - REQUEST FOR JUDGMENT (ADMISSION)

**CLAIM NUMBER:** [CLAIM_NUMBER]

**CLAIMANT:** [CLAIMANT_NAME]

**DEFENDANT:** [DEFENDANT_NAME]

**APPLICATION FOR JUDGMENT ON ADMISSION**

The Defendant has admitted liability for the full amount of the claim but has proposed payment terms that are not acceptable to the Claimant.

**DEFENDANT'S ADMISSION**

Date of admission: [ADMISSION_DATE]
Amount admitted: £[TOTAL_CLAIM]
Defendant's proposed payment: [DEFENDANT_PROPOSAL]

**CLAIMANT'S POSITION**

The Claimant does NOT accept the Defendant's proposed payment terms for the following reasons:

[REJECTION_REASONS]

**CLAIMANT'S PROPOSAL**

The Claimant requests judgment for the full amount of £[TOTAL_CLAIM] to be paid as follows:

[PAYMENT_TERMS]

**FINANCIAL INFORMATION**

Based on the financial information provided by the Defendant in Form N9A, the Defendant has the means to pay [AFFORDABILITY_ANALYSIS].

**STATEMENT OF TRUTH**

I believe that the facts stated in this application are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

Signed: _________________ Date: [DATE]

[CLAIMANT_NAME]
`;

/**
 * TEMPLATE: Directions Questionnaire (Form N180)
 *
 * Filed when defence is submitted and matter allocated to track.
 * Required by CPR Part 26.
 */
export const DIRECTIONS_QUESTIONNAIRE_TEMPLATE = `FORM N180 - DIRECTIONS QUESTIONNAIRE (SMALL CLAIMS TRACK)

**CLAIM NUMBER:** [CLAIM_NUMBER]

**CLAIMANT:** [CLAIMANT_NAME]

**DEFENDANT:** [DEFENDANT_NAME]

**A. SETTLEMENT**

1. Do you wish there to be a one-month stay to attempt settlement? YES / NO

2. Are you prepared to attend mediation? YES / NO

**B. TRACK ALLOCATION**

3. I believe this claim should be allocated to the: SMALL CLAIMS TRACK

4. Value of claim: £[PRINCIPAL]

**C. WITNESSES**

5. How many witnesses (including yourself) will give evidence on your behalf? [WITNESS_COUNT]

6. Names of witnesses:
   - [CLAIMANT_NAME] (Claimant)
   - [ADDITIONAL_WITNESSES]

**D. EXPERTS**

7. Do you wish to use expert evidence? NO
   (Expert evidence is rarely permitted in small claims)

**E. HEARING**

8. Estimated length of hearing: [HEARING_DURATION] hours

9. Dates to avoid (next 6 months):
   [UNAVAILABLE_DATES]

10. Do you have a disability that means you need special facilities or assistance? YES / NO
    If YES, please specify: [SPECIAL_REQUIREMENTS]

**F. DOCUMENTS**

11. List the key documents you intend to rely on at the hearing:
    - Invoice [INVOICE_NUMBER]
    - [EVIDENCE_LIST]

**G. COSTS**

12. Are you claiming any loss of earnings? YES / NO
    If YES, amount: £[LOSS_EARNINGS]

**H. OTHER INFORMATION**

13. Any other information you wish the court to consider:

[ADDITIONAL_INFORMATION]

**STATEMENT OF TRUTH**

I believe that the facts stated in this questionnaire are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

Signed: _________________ Date: [DATE]

[CLAIMANT_NAME]
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
    case DocumentType.POLITE_CHASER:
      return POLITE_CHASER_TEMPLATE;
    case DocumentType.LBA:
      return LETTER_BEFORE_ACTION_TEMPLATE;
    case DocumentType.FORM_N1:
      return FORM_N1_PARTICULARS_TEMPLATE;
    case DocumentType.DEFAULT_JUDGMENT:
      return DEFAULT_JUDGMENT_TEMPLATE;
    case DocumentType.ADMISSION:
      return ADMISSION_TEMPLATE;
    case DocumentType.DIRECTIONS_QUESTIONNAIRE:
      return DIRECTIONS_QUESTIONNAIRE_TEMPLATE;
    case DocumentType.INSTALLMENT_AGREEMENT:
      return INSTALLMENT_AGREEMENT_TEMPLATE;
    default:
      throw new Error(`Template not yet implemented for document type: ${docType}`);
  }
};

/**
 * Legal disclaimers for each document type
 */
export const DISCLAIMERS = {
  [DocumentType.POLITE_CHASER]: `
DISCLAIMER: This is an informal, friendly payment reminder prepared using AI-assisted
document assembly software. We are not a law firm and do not provide legal advice.
This letter is designed to maintain a positive business relationship while requesting payment.
  `.trim(),

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
  `.trim(),

  [DocumentType.INSTALLMENT_AGREEMENT]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. This agreement is legally binding.
You should seek independent legal advice from a qualified solicitor before signing.
  `.trim(),

  [DocumentType.DEFAULT_JUDGMENT]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Default judgment applications must
comply with CPR Part 12. Seek independent legal advice before filing.
  `.trim(),

  [DocumentType.ADMISSION]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Seek independent legal advice
before accepting an admission or applying for judgment.
  `.trim(),

  [DocumentType.DIRECTIONS_QUESTIONNAIRE]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. The Directions Questionnaire must
comply with CPR Part 26. Seek independent legal advice before filing.
  `.trim()
};

/**
 * Get disclaimer for document type
 */
export const getDisclaimer = (docType: DocumentType): string => {
  return DISCLAIMERS[docType] || '';
};
