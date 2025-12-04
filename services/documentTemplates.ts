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
 * A friendly reminder sent before formal Letter Before Action.
 * Maintains professional relationship while requesting payment.
 */
export const POLITE_CHASER_TEMPLATE = `[CLAIMANT_NAME]
[CLAIMANT_ADDRESS]

[DATE]

[DEFENDANT_NAME]
[DEFENDANT_ADDRESS]

Dear Sir/Madam,

RE: PAYMENT REMINDER - INVOICE [INVOICE_NUMBER]

I hope this letter finds you well. I am writing regarding the following outstanding invoice:

**INVOICE DETAILS**

Invoice Number: [INVOICE_NUMBER]
Invoice Date: [INVOICE_DATE]
Amount Due: £[PRINCIPAL]
Payment Due Date: [DUE_DATE]

We have not yet received payment for this invoice, which is now [DAYS_OVERDUE] days overdue. I wanted to reach out as there may be a simple explanation for this delay.

**POSSIBLE REASONS**

- The invoice may not have reached your accounts department
- There may be a query about the goods/services provided
- Payment may have been overlooked

If any of these apply, please contact me immediately so we can resolve this matter amicably.

**NEXT STEPS**

If payment has not yet been made, please arrange payment within 7 days to avoid escalation to formal legal proceedings. We value our business relationship and would prefer to resolve this matter informally.

If there is a genuine dispute regarding this invoice, please contact me within 7 days to discuss.

Should you require a copy of the original invoice or any supporting documentation, I am happy to provide these upon request.

I look forward to hearing from you soon.

Yours faithfully,

[CLAIMANT_NAME]

---
This is a polite payment reminder. If payment is not received or a response provided within 7 days, formal legal action may be commenced.
`;

/**
 * TEMPLATE: Part 36 Settlement Offer
 *
 * Formal settlement offer under CPR Part 36.
 * Carries cost consequences if not accepted.
 */
export const PART_36_OFFER_TEMPLATE = `[CLAIMANT_NAME]
[CLAIMANT_ADDRESS]

[DATE]

[DEFENDANT_NAME]
[DEFENDANT_ADDRESS]

Dear Sir/Madam,

RE: PART 36 OFFER - CLAIM FOR £[TOTAL_CLAIM]

Without prejudice save as to costs.

**NOTICE OF OFFER UNDER PART 36**

I hereby make you an offer to settle this claim in accordance with Part 36 of the Civil Procedure Rules.

**OFFER TERMS**

1. The Defendant shall pay the Claimant the sum of £[SETTLEMENT_AMOUNT] in full and final settlement of this claim.

2. Payment shall be made within 21 days of the date of this offer.

3. This offer is made in accordance with CPR Part 36 and is inclusive of all interest and costs to date.

4. This offer remains open for acceptance for 21 days from the date of this letter, after which it may be withdrawn.

**CONSEQUENCES OF NON-ACCEPTANCE**

If you do not accept this offer and the matter proceeds to trial, and you fail to obtain a judgment more advantageous than this offer, you may be liable for costs on an indemnity basis from the date when this offer should have been accepted, together with interest on those costs.

**ACCEPTANCE**

If you wish to accept this offer, you must serve written notice of acceptance on the Claimant within 21 days. Upon acceptance and payment, these proceedings will be stayed.

**PAYMENT DETAILS**

Payment should be made to: [PAYMENT_DETAILS]

This offer is made in accordance with CPR 36.5 and will have the cost consequences set out in CPR 36.17 if not accepted.

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
 * TEMPLATE: Defence Response
 *
 * Claimant's response to defendant's defence.
 * Sets out why the defence should be rejected.
 */
export const DEFENCE_RESPONSE_TEMPLATE = `CLAIMANT'S RESPONSE TO DEFENCE

**CLAIM NUMBER:** [CLAIM_NUMBER]

**CLAIMANT:** [CLAIMANT_NAME]

**DEFENDANT:** [DEFENDANT_NAME]

**INTRODUCTION**

1. This is the Claimant's response to the Defence filed by the Defendant on [DEFENCE_DATE].

2. The Claimant maintains that the claim is well-founded and that the Defence should be rejected for the reasons set out below.

**RESPONSE TO DEFENDANT'S CASE**

3. The Defendant's Defence is denied. Specifically:

[DEFENCE_REBUTTALS]

**CLAIMANT'S CASE**

4. The Claimant's case is as pleaded in the Particulars of Claim dated [CLAIM_DATE].

5. In addition, the Claimant relies on the following:

[ADDITIONAL_EVIDENCE]

**DOCUMENTARY EVIDENCE**

6. The Claimant will rely on the following documents at trial:

   - Invoice [INVOICE_NUMBER] dated [INVOICE_DATE]
   - [EVIDENCE_LIST]

**WITNESS EVIDENCE**

7. The Claimant will rely on witness evidence from:

   - [CLAIMANT_NAME] (Claimant)
   - [ADDITIONAL_WITNESSES]

**CONCLUSION**

8. For the reasons set out above, the Claimant maintains that the Defence has no merit and requests that judgment be entered for the full amount claimed.

9. The Claimant is willing to engage in alternative dispute resolution if the Defendant makes a reasonable settlement offer.

**STATEMENT OF TRUTH**

I believe that the facts stated in this response are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

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
 * TEMPLATE: Trial Bundle Index
 *
 * Organized bundle of all documents for trial.
 * Must comply with Practice Direction 39A.
 */
export const TRIAL_BUNDLE_TEMPLATE = `TRIAL BUNDLE INDEX

**CLAIM NUMBER:** [CLAIM_NUMBER]

**CLAIMANT:** [CLAIMANT_NAME] v. **DEFENDANT:** [DEFENDANT_NAME]

**HEARING DATE:** [HEARING_DATE]

---

**SECTION A: CASE SUMMARY & PLEADINGS**

A1. Case Summary (1 page maximum)
A2. Claim Form (N1)
A3. Particulars of Claim
A4. Defence (if any)
A5. Reply to Defence (if any)
A6. Directions Order

---

**SECTION B: CONTRACTS & AGREEMENTS**

B1. [CONTRACT_DESCRIPTION]
B2. Terms and Conditions
B3. Order Confirmation / Purchase Order
B4. [ADDITIONAL_CONTRACTS]

---

**SECTION C: INVOICES & FINANCIAL DOCUMENTS**

C1. Invoice [INVOICE_NUMBER] dated [INVOICE_DATE]
C2. Proof of Delivery / Completion
C3. [ADDITIONAL_INVOICES]

---

**SECTION D: CORRESPONDENCE**

D1. Payment Reminder dated [REMINDER_DATE]
D2. Letter Before Action dated [LBA_DATE]
D3. Defendant's Response (if any)
D4. [ADDITIONAL_CORRESPONDENCE]

---

**SECTION E: WITNESS STATEMENTS**

E1. Witness Statement of [CLAIMANT_NAME] dated [STATEMENT_DATE]
E2. [ADDITIONAL_WITNESS_STATEMENTS]

---

**SECTION F: EXPERT EVIDENCE** (if applicable)

F1. [EXPERT_REPORTS]

---

**SECTION G: LEGAL AUTHORITIES** (if applicable)

G1. [CASE_LAW]
G2. [STATUTES]

---

**BUNDLE PREPARATION NOTES**

✓ All pages numbered consecutively
✓ Documents in chronological order within each section
✓ Original documents available for inspection
✓ Bundle paginated and indexed
✓ Copies prepared for: Judge, Defendant, Court file

Prepared by: [CLAIMANT_NAME]
Date: [DATE]
`;

/**
 * TEMPLATE: Skeleton Argument
 *
 * Summary of legal arguments for trial.
 * Concise document outlining case and legal basis.
 */
export const SKELETON_ARGUMENT_TEMPLATE = `SKELETON ARGUMENT

**CLAIM NUMBER:** [CLAIM_NUMBER]

**HEARING:** [HEARING_DATE] at [COURT_NAME]

**CLAIMANT:** [CLAIMANT_NAME]

**DEFENDANT:** [DEFENDANT_NAME]

---

**1. INTRODUCTION**

1.1 This is the Claimant's skeleton argument for the final hearing listed on [HEARING_DATE].

1.2 The claim is for £[TOTAL_CLAIM] arising from unpaid invoice(s) for [SERVICE_DESCRIPTION].

---

**2. FACTUAL BACKGROUND**

2.1 The Claimant and Defendant entered into a contract on [CONTRACT_DATE] whereby the Claimant agreed to provide [CONTRACT_DESCRIPTION].

2.2 The Claimant performed their obligations under the contract by [PERFORMANCE_DESCRIPTION].

2.3 The Defendant has failed to pay invoice [INVOICE_NUMBER] dated [INVOICE_DATE] for the sum of £[PRINCIPAL].

2.4 The key chronology is:
    [TIMELINE_EVENTS]

---

**3. ISSUES**

3.1 The issues for determination are:
    (a) Whether a binding contract existed between the parties
    (b) Whether the Claimant performed their obligations under the contract
    (c) Whether the Defendant is liable to pay the sum claimed
    (d) [ADDITIONAL_ISSUES]

---

**4. LAW**

4.1 **Contract Formation:** There was a valid contract between the parties evidenced by [CONTRACT_EVIDENCE].

4.2 **Payment Terms:** The contract provided for payment [PAYMENT_TERMS_DESCRIPTION].

4.3 **Late Payment:** The Claimant is entitled to interest under [INTEREST_ACT] at the rate of [INTEREST_RATE].

4.4 **Compensation:** The Claimant is entitled to compensation under the Late Payment of Commercial Debts (Interest) Act 1998.

---

**5. EVIDENCE**

5.1 The Claimant relies on the following evidence:
    - Invoice [INVOICE_NUMBER] (Bundle C1)
    - [EVIDENCE_REFERENCES]
    - Witness statement of [CLAIMANT_NAME] (Bundle E1)

---

**6. CLAIMANT'S CASE**

6.1 The Claimant's case is straightforward:
    (a) A valid contract existed
    (b) The Claimant performed their obligations
    (c) The Defendant received the goods/services
    (d) The Defendant has failed to pay
    (e) The debt is due and owing

6.2 The Defendant's defence [is non-existent / is without merit because [DEFENCE_REBUTTAL]].

---

**7. RELIEF SOUGHT**

7.1 The Claimant seeks:
    (a) Judgment for £[TOTAL_CLAIM]
    (b) Continuing interest at £[DAILY_RATE] per day
    (c) Costs

---

**8. CONCLUSION**

8.1 For the reasons set out above, the Claimant respectfully requests that the Court enter judgment for the full amount claimed.

---

[CLAIMANT_NAME]
Claimant in Person
Dated: [DATE]
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
    case DocumentType.DEFENCE_RESPONSE:
      return DEFENCE_RESPONSE_TEMPLATE;
    case DocumentType.DIRECTIONS_QUESTIONNAIRE:
      return DIRECTIONS_QUESTIONNAIRE_TEMPLATE;
    case DocumentType.PART_36_OFFER:
      return PART_36_OFFER_TEMPLATE;
    case DocumentType.INSTALLMENT_AGREEMENT:
      return INSTALLMENT_AGREEMENT_TEMPLATE;
    case DocumentType.TRIAL_BUNDLE:
      return TRIAL_BUNDLE_TEMPLATE;
    case DocumentType.SKELETON_ARGUMENT:
      return SKELETON_ARGUMENT_TEMPLATE;
    default:
      throw new Error(`Template not yet implemented for document type: ${docType}`);
  }
};

/**
 * Legal disclaimers for each document type
 */
export const DISCLAIMERS = {
  [DocumentType.POLITE_CHASER]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. This is an informal payment
reminder. You should consult a qualified solicitor before taking further legal action.
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

  [DocumentType.PART_36_OFFER]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Part 36 offers have serious
cost consequences if made incorrectly. You MUST seek independent legal advice from a
qualified solicitor before making or accepting a Part 36 offer.
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

  [DocumentType.DEFENCE_RESPONSE]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Responding to a defence requires
compliance with CPR Part 15. Seek independent legal advice.
  `.trim(),

  [DocumentType.DIRECTIONS_QUESTIONNAIRE]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. The Directions Questionnaire must
comply with CPR Part 26. Seek independent legal advice before filing.
  `.trim(),

  [DocumentType.TRIAL_BUNDLE]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Trial bundles must comply with
Practice Direction 39A. Seek independent legal advice.
  `.trim(),

  [DocumentType.SKELETON_ARGUMENT]: `
DISCLAIMER: This document was prepared using AI-assisted document assembly software.
We are not a law firm and do not provide legal advice. Skeleton arguments must comply
with court requirements. Seek independent legal advice.
  `.trim()
};

/**
 * Get disclaimer for document type
 */
export const getDisclaimer = (docType: DocumentType): string => {
  return DISCLAIMERS[docType] || '';
};
