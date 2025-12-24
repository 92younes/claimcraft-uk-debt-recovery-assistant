import { ClaimState, GeneratedContent, Party, InvoiceData, DocumentType, EvidenceFile, ChatMessage, PartyType, ClaimStrength, ExtractedClaimData, TimelineEvent, ChatResponse, ClaimIntakeResult } from "../types";
import { formatCurrency, formatTotalDebt, formatGrandTotal } from "../utils/calculations";
import { postcodeToCounty } from "../utils/postcodeToCounty";
import { cleanPartyAddress } from "../utils/addressParser";
import { generateContent, Type, createMultimodalContent } from "./geminiApiClient";

// Helper to get today's date in UK format
const getTodayUK = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Helper to get ISO date for calculations
const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Helper to convert numeric score to strength tier
const scoreToStrength = (score: number): ClaimStrength => {
  if (score >= 75) return ClaimStrength.HIGH;
  if (score >= 50) return ClaimStrength.MEDIUM;
  return ClaimStrength.LOW;
};

// Helper to clean AI response text (strip markdown) before JSON parsing
const cleanJson = (text: string): string => {
  if (!text) return '{}';
  
  // 1. Try to find markdown code block
  const match = text.match(/```(?:json)?([\s\S]*?)```/);
  if (match) return match[1].trim();
  
  // 2. Fallback: Try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1);
  }

  return text.trim();
};

// Helper to process multiple evidence files (PDFs/Images)
export const analyzeEvidence = async (files: EvidenceFile[]): Promise<{
  claimant: Party,
  defendant: Party,
  invoice: InvoiceData,
  timelineEvents: any[],
  classifications: { fileName: string, type: string }[]
}> => {
  const prompt = `
    Analyze the provided evidence documents (Invoices, Contracts, Emails).
    Extract the following details for a UK Debt Claim.

    **TODAY'S DATE: ${getTodayUK()} (${getTodayISO()})**
    Use this date to determine if dates in documents are in the past or future.

    1. Identify the Creditor (Claimant) with full address including UK county.
    3. Extract Contact Person names from signatures, letterheads, "Attn:", "FAO:", or titles like "Managing Director"
    2. Identify the Debtor (Defendant) with full address including UK county.
    4. Extract the MAIN Invoice details (Number, Date, Due Date, Amount, Description of goods/services).
           - Invoice Number: Look for patterns like "Invoice #123", "Inv No: 456", or reference numbers
       - Due Date: Calculate from payment terms if mentioned (e.g., "30 days" = Invoice Date + 30 days)
       - Payment Terms: Extract any mention of payment periods
    5. Look for any other dates in the documents (emails, contracts) to build a mini-timeline of events.
    5. CLASSIFY each document:
       - Is it a "Signed Contract"?
       - Is it an "Unpaid Invoice"?
       - Is it a "Payment Chaser (Email/Letter)"?
       - Is it a "Text/Whatsapp Message"?
       - Is it a "Bank Statement"?

    IMPORTANT: Extract the UK county for both claimant and defendant addresses (e.g., "Greater London", "West Midlands", "Surrey").
    If county is not explicitly stated, infer it from the postcode (e.g., SW1A = Greater London, M1 = Greater Manchester).

    Return valid JSON matching the schema.
    Use 'Individual' or 'Business' based on entities (Ltd/Plc = Business).
  `;

  // Create multimodal content with files
  const contents = createMultimodalContent(
    files.map(f => ({ data: f.data, type: f.type })),
    prompt
  );

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          claimant: { type: Type.OBJECT, properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              county: { type: Type.STRING, description: "UK county (e.g. Greater London, West Yorkshire)" },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] },
              contactName: { type: Type.STRING, description: "Contact person name if mentioned (e.g., 'John Smith, Managing Director')" }
          } },
          defendant: { type: Type.OBJECT, properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              county: { type: Type.STRING, description: "UK county (e.g. Greater London, West Yorkshire)" },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] },
              contactName: { type: Type.STRING, description: "Contact person name if mentioned (e.g., 'John Smith, Managing Director')" }
          } },
          invoice: { type: Type.OBJECT, properties: {
              invoiceNumber: { type: Type.STRING, description: "Extract invoice/reference number from patterns like 'Invoice #123', 'Inv-456', standalone numbers" },
              dateIssued: { type: Type.STRING },
              dueDate: { type: Type.STRING, description: "Payment due date - calculate from payment terms if mentioned (e.g. '30 days' means dateIssued + 30 days)" },
              paymentTerms: { type: Type.STRING, description: "Extract payment terms mentioned (e.g., 'Net 30', '30 days', 'Due on receipt', '14 days')" },
              totalAmount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              description: { type: Type.STRING, description: "Brief description of goods/services provided" }
          } },
          timelineEvents: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING }
          }}},
          classifications: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
              fileName: { type: Type.STRING, description: "The estimated file name or index this classification applies to" },
              type: { type: Type.STRING, description: "e.g. 'Signed Contract', 'Invoice', 'Email Chain'" }
          }}}
        }
      }
    }
  });

  try {
    const result = JSON.parse(cleanJson(response.text || '{}'));

    // Post-process: Infer county from postcode if missing
    if (result.defendant?.postcode && !result.defendant?.county) {
      const inferredCounty = postcodeToCounty(result.defendant.postcode);
      if (inferredCounty) {
        result.defendant.county = inferredCounty;
        console.log(`[analyzeEvidence] Inferred defendant county: ${inferredCounty}`);
      }
    }

    if (result.claimant?.postcode && !result.claimant?.county) {
      const inferredCounty = postcodeToCounty(result.claimant.postcode);
      if (inferredCounty) {
        result.claimant.county = inferredCounty;
        console.log(`[analyzeEvidence] Inferred claimant county: ${inferredCounty}

    // Post-process: Clean addresses if they contain full address strings
    if (result.claimant) {
      const cleanedClaimant = cleanPartyAddress(result.claimant);
      result.claimant.address = cleanedClaimant.address;
      result.claimant.city = cleanedClaimant.city || result.claimant.city;
      result.claimant.postcode = cleanedClaimant.postcode || result.claimant.postcode;
    }

    if (result.defendant) {
      const cleanedDefendant = cleanPartyAddress(result.defendant);
      result.defendant.address = cleanedDefendant.address;
      result.defendant.city = cleanedDefendant.city || result.defendant.city;
      result.defendant.postcode = cleanedDefendant.postcode || result.defendant.postcode;
    }`);
      }
    }

    return result;
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse AI response");
  }
};

export const getClaimStrengthAssessment = async (data: ClaimState): Promise<{ score: number, strength: ClaimStrength, analysis: string, weaknesses: string[] }> => {
  const prompt = `
    Act as an Expert Legal Assistant for UK Small Claims.
    Assess the "Winnability" (Probability of Success) of this claim based on the available evidence, timeline, and clarifications.

    CLAIMANT: ${data.claimant.name}
    DEFENDANT: ${data.defendant.name}
    AMOUNT: £${data.invoice.totalAmount}

    TIMELINE OF EVENTS:
    ${JSON.stringify(data.timeline)}

    EVIDENCE BUNDLE:
    ${data.evidence.map(e => `- ${e.name}: Classified as "${e.classification || 'Unknown Document'}"`).join('\n')}

    CLARIFICATIONS (Client Interview):
    ${data.chatHistory.filter(m => m.role === 'user').map(m => `- Client: ${m.content}`).join('\n')}

    JUDGMENT CRITERIA:
    1. **Contract**: Is there a signed contract or clear written agreement? (High impact)
    2. **Proof**: Is there proof of delivery/service performance?
    3. **Admissions**: Did the defendant admit the debt in emails/chats?
    4. **Procedure**: Did the claimant send chasers/warnings?
    5. **Disputes**: Is there a valid counterclaim or dispute mentioned in the chat?

    Return JSON:
    - score: number (0-100, where 75+ = strong case, 50-74 = moderate, <50 = weak)
    - analysis: string (Concise summary of the case strength)
    - weaknesses: string[] (List specific gaps, e.g., "Missing signed contract", "No proof of delivery", "Debt relies on verbal agreement")
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
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
  });

  try {
    const result = JSON.parse(cleanJson(response.text || '{}'));
    // Use nullish coalescing to handle legitimate 0 scores
    const rawScore = Number(result.score);
    // Clamp score to [0, 100] range to guard against model drift or out-of-range values
    const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 50;

    console.log(`[getClaimStrengthAssessment] Raw score: ${rawScore}, Clamped score: ${score}`);

    return {
      score,
      strength: scoreToStrength(score),
      analysis: result.analysis || "Could not assess strength automatically.",
      weaknesses: result.weaknesses || []
    };
  } catch (e) {
    console.error('[getClaimStrengthAssessment] JSON parse error:', e);
    return {
      score: 50,
      strength: ClaimStrength.MEDIUM,
      analysis: "Could not assess strength automatically.",
      weaknesses: []
    };
  }
};

export const startClarificationChat = async (data: ClaimState): Promise<string> => {
  // Safe Financials
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const totalDebt = formatTotalDebt(principal, interest, comp);

  // Identify critical missing data
  // NOTE: Claimant data comes from user profile, not chat
  const missingAddressFields: string[] = [];
  if (!data.defendant.county?.trim()) missingAddressFields.push("the defendant's county");
  if (!data.defendant.address?.trim()) missingAddressFields.push("the defendant's street address");

  const hasMissingAddress = missingAddressFields.length > 0;
  const missingAddressContext = hasMissingAddress
    ? `\n\nIMPORTANT: The following required fields are MISSING:\n${missingAddressFields.map(f => `- ${f}`).join('\n')}\n\nYou MUST ask for this information first. Court forms require complete addresses including UK county for the defendant.`
    : '';

  const prompt = `
    You are an AI Legal Assistant for UK Small Claims.

    Review the claim data:
    - Claimant: ${data.claimant.name || 'Not provided'} (from user profile)
    - Defendant: ${data.defendant.name || 'Not provided'}
    - Defendant Address: ${data.defendant.address || 'MISSING'}, ${data.defendant.city || 'MISSING'}, ${data.defendant.county || 'MISSING'}, ${data.defendant.postcode || 'MISSING'}
    - Total Value: £${totalDebt}
    - Timeline: ${JSON.stringify(data.timeline)}
    ${missingAddressContext}

    Generate a friendly but professional opening message (2-3 sentences):
    1. Greet the user briefly (e.g., "Hello, I'm your AI legal assistant")
    2. Acknowledge their claim (mention the amount and defendant name if available)
    3. ${hasMissingAddress ? 'Ask for the MISSING address information listed above - the court requires complete addresses including UK county.' : 'Ask ONE critical question to identify the biggest evidence gap (e.g., contract, proof of delivery, written agreement)'}

    ${hasMissingAddress ? 'Example: "Hello, I\'m your AI legal assistant. I see you have a claim for £5,000. Before we proceed, I need your complete address including the UK county (e.g., Greater London, Surrey, West Yorkshire) for the court forms."' : 'Example: "Hello, I\'m your AI legal assistant. I\'ve reviewed your £5,000 claim against XYZ Ltd for unpaid invoices. To assess your case strength, do you have a signed contract or written agreement with the defendant?"'}

    Keep it conversational and helpful, not robotic or interrogating.
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return response.text || "Hello, I'm your AI legal assistant. To assess your case strength, do you have a written contract signed by the defendant?";
};

export const sendChatMessage = async (history: ChatMessage[], userMessage: string, data: ClaimState): Promise<ChatResponse> => {
  // Inject calculated financials so the AI understands the full claim value
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const fee = data.courtFee || 0;

  const totalDebt = formatTotalDebt(principal, interest, comp);
  const grandTotal = formatGrandTotal(principal, interest, comp, fee);

  // Identify missing required fields
  // NOTE: Claimant data comes from user profile, not chat extraction
  const missingFields: string[] = [];
  if (!data.defendant.county?.trim()) missingFields.push("Defendant's county");
  if (!data.defendant.address?.trim()) missingFields.push("Defendant's street address");
  if (!data.defendant.city?.trim()) missingFields.push("Defendant's city/town");
  if (!data.defendant.postcode?.trim()) missingFields.push("Defendant's postcode");
  if (!data.invoice.invoiceNumber?.trim()) missingFields.push("Invoice number/reference");
  if (!data.invoice.dateIssued) missingFields.push("Invoice date");

  const missingFieldsNote = missingFields.length > 0
    ? `\n\nCRITICAL MISSING DATA (MUST collect before proceeding):\n${missingFields.map(f => `- ${f}`).join('\n')}\n\nYou MUST ask for these specific fields. The court requires complete addresses including county for the defendant.`
    : '\n\nAll required defendant address and invoice fields are complete.';

  // Count questions already asked to prevent going in circles
  const aiMessages = history.filter(m => m.role === 'ai').length;
  const circleWarning = aiMessages > 5
    ? '\n\nIMPORTANT: You have asked several questions already. If you have gathered contract, invoice, and payment chase information, conclude the consultation. Do not keep asking similar questions.'
    : '';

  // Check if timeline already has LBA sent
  const hasLBAInTimeline = data.timeline.some(e =>
    e.type === 'lba_sent' ||
    (e.type === 'chaser' && (
      e.description.toLowerCase().includes('letter before action') ||
      e.description.toLowerCase().includes('lba') ||
      e.description.toLowerCase().includes('formal demand')
    ))
  );

  // Build conversation history for context
  const conversationContext = history.slice(0, -1)
    .map(msg => `${msg.role === 'ai' ? 'ASSISTANT' : 'USER'}: ${msg.content}`)
    .join('\n\n');

  const prompt = `
You are an AI Legal Assistant for UK Small Claims.
You are NOT a solicitor and cannot provide legal advice. You provide "Legal Information" and procedural guidance based on the Civil Procedure Rules (CPR).

**TODAY'S DATE: ${getTodayUK()} (${getTodayISO()})**
Use this date for ALL date calculations. Any date before today is in the PAST. Any date after today is in the FUTURE.

CASE METRICS:
- Value: £${totalDebt} (Total with Fee: £${grandTotal})
- Claimant: ${data.claimant.name || 'Not provided'} (from user profile)
- Defendant: ${data.defendant.name || 'Not provided'}

DEFENDANT ADDRESS STATUS (Required for court forms):
- Street: ${data.defendant.address || 'MISSING'}
- City: ${data.defendant.city || 'MISSING'}
- County: ${data.defendant.county || 'MISSING'} (REQUIRED for court forms)
- Postcode: ${data.defendant.postcode || 'MISSING'}
${missingFieldsNote}
${circleWarning}

TIMELINE:
${JSON.stringify(data.timeline)}
LBA ALREADY SENT: ${hasLBAInTimeline ? 'YES' : 'NO'}

YOUR GOAL: Gather enough information to recommend the RIGHT document for their situation.

DOCUMENT DETERMINATION QUESTIONS (ask these to determine the right document):
1. "Have you already started a court claim (filed Form N1)?" → If YES, ask if they need to request judgment or respond to a defence.
2. "If you have a judgment, do you need to enforce it?" → Not yet supported, but good context.
3. "Have you sent any payment reminders or chaser emails to the debtor?" → If NO, suggest starting with a Polite Reminder
4. "Have you sent a formal Letter Before Action (LBA) giving them 30 days to pay?" → Critical for court claim eligibility
5. "If you sent an LBA, when was it sent? Has 30 days passed?" → If YES to both, they can file Form N1
6. "Has the debtor acknowledged the debt or responded to your communications?" → Affects case strength
7. "Would you prefer to negotiate a settlement or proceed to court?" → If settlement, suggest Part 36 Offer

COMMUNICATION PROTOCOL:
1. **ONE QUESTION AT A TIME:** Ask only ONE question per response. Never ask multiple questions in the same message - this feels overwhelming. Wait for the user's answer before asking the next question.
2. **PRIORITY:** If addresses are MISSING, ask for them FIRST (including UK county).
3. **DOCUMENT FOCUS:** Ask about LBA status early - this determines the recommended document.
4. **BREVITY:** Keep responses to 2-3 sentences maximum. One brief acknowledgment + one question.
5. **ACKNOWLEDGMENT:** Briefly acknowledge the user's answer before asking the next question.
6. **NO REPETITION:** Do NOT ask the same question twice. Track what you've learned.
7. **CLOSING:** When you have enough info, conclude with your recommendation:
   - If NO LBA sent: "Based on our conversation, I recommend starting with a Letter Before Action. This is required before court proceedings. Click 'Continue' to review the details."
   - If LBA sent 30+ days ago: "Since you've already sent an LBA and 30 days have passed, you're ready to file a court claim (Form N1). Click 'Continue' to review the details."
   - If already filed claim (no response): "If the defendant hasn't responded within 14 days of service, you can request a Default Judgment (Form N225). Click 'Continue' to proceed."
   - If already filed claim (admission): "If the defendant admitted the debt, you can request Judgment on Admission (Form N225A). Click 'Continue' to proceed."
   - If user wants settlement: "Given your preference to settle, I recommend a Part 36 Settlement Offer. Click 'Continue' to review the details."
8. **DISCLAIMER:** If asked for legal advice, state: "I'm a legal assistant, not a solicitor. This is procedural guidance, not legal advice."
9. **TONE:** Professional but friendly. Be helpful, not interrogating.

CONVERSATION HISTORY:
${conversationContext}

USER'S NEW MESSAGE:
${userMessage}

Respond with a JSON object containing:
{
  "message": "Your conversational response here",
  "readyToProceed": true/false
}

Set readyToProceed to TRUE only when ALL of these conditions are met:
1. You have confirmed the key claim details (claimant, defendant, amount)
2. You have asked about LBA status and got a clear answer
3. You have enough information to recommend a specific document
4. You are concluding the consultation with a recommendation

Set readyToProceed to FALSE if you still need to gather more information.
`;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "The conversational response to the user" },
          readyToProceed: { type: Type.BOOLEAN, description: "Whether enough information has been collected to proceed" }
        },
        required: ['message', 'readyToProceed']
      }
    }
  });

  const responseText = response.text || '{"message": "Please clarify.", "readyToProceed": false}';

  try {
    const parsed = JSON.parse(cleanJson(responseText));
    return {
      message: parsed.message || "Please clarify.",
      readyToProceed: parsed.readyToProceed === true
    };
  } catch (e) {
    console.warn('Could not parse structured response, falling back to plain text');
    return {
      message: responseText,
      readyToProceed: false
    };
  }
};

/**
 * Extract structured data from chat history
 * Called when user clicks "Continue" after AI consultation
 * Returns extracted fields + document recommendation
 */
export const extractDataFromChat = async (
  chatHistory: ChatMessage[],
  currentData: ClaimState
): Promise<ExtractedClaimData> => {
  // Format chat history as transcript
  const chatTranscript = chatHistory
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  // Current data context (what user already entered)
  const currentContext = `
    CURRENT CLAIMANT: ${currentData.claimant.name || 'Not set'}, ${currentData.claimant.address || 'No address'}, ${currentData.claimant.city || ''}, ${currentData.claimant.county || 'No county'}, ${currentData.claimant.postcode || ''}
    CURRENT DEFENDANT: ${currentData.defendant.name || 'Not set'}, ${currentData.defendant.address || 'No address'}, ${currentData.defendant.city || ''}, ${currentData.defendant.county || 'No county'}, ${currentData.defendant.postcode || ''}
    CURRENT INVOICE: ${currentData.invoice.invoiceNumber || 'Not set'}, £${currentData.invoice.totalAmount || 0}, ${currentData.invoice.dateIssued || 'No date'}
    CURRENT TIMELINE: ${JSON.stringify(currentData.timeline)}
  `;

  const prompt = `
    You are a legal data extraction assistant. Analyze the chat conversation below and extract any claim-related data mentioned.

    **TODAY'S DATE: ${getTodayUK()} (${getTodayISO()})**
    Use this date for ALL date calculations. Any date before today is in the PAST.

    ${currentContext}

    CHAT TRANSCRIPT:
    ${chatTranscript}

    EXTRACTION RULES:
    1. Extract ANY addresses, postcodes, UK counties mentioned (e.g., "Greater London", "Surrey", "West Yorkshire")
    2. Extract invoice numbers, amounts, dates if mentioned
    3. Extract timeline events: When was invoice sent? When did they chase? When was LBA sent?
    4. ONLY extract data that was EXPLICITLY mentioned in the chat - do not invent data
    5. If data is already in "CURRENT" fields and matches what was said, don't re-extract it

    DOCUMENT RECOMMENDATION RULES:
    Based on the conversation, determine which document the user should generate:
    - If user mentioned sending a Letter Before Action (LBA, formal letter, final demand letter) AND it's been 30+ days → Recommend FORM_N1
    - If user mentioned chasing/reminders but NO formal LBA yet → Recommend LBA
    - If user wants to settle/negotiate → Recommend PART_36_OFFER
    - If no prior contact mentioned → Recommend POLITE_CHASER
    - Default if unclear → Recommend LBA (pre-action protocol requirement)

    Return JSON with:
    - claimant: Any NEW address fields mentioned (county especially important)
    - defendant: Any NEW address fields mentioned
    - invoice: Any invoice details mentioned
    - timeline: Array of events mentioned (date, description, type)
    - recommendedDocument: One of "Polite Payment Reminder", "Letter Before Action", "Form N1 (Claim Form)", "Part 36 Settlement Offer"
    - documentReason: 1-2 sentence explanation of WHY this document
    - confidenceScore: 0-100 how confident you are in the recommendation
    - extractedFields: Array of field names that were extracted
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          claimant: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    address: { type: Type.STRING, description: "Street address only (e.g. '10 Downing Street'), no city or postcode" },
              city: { type: Type.STRING },
              county: { type: Type.STRING },
              postcode: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          },
          defendant: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    address: { type: Type.STRING, description: "Street address only (e.g. '10 Downing Street'), no city or postcode" },
              city: { type: Type.STRING },
              county: { type: Type.STRING },
              postcode: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING }
            }
          },
          invoice: {
            type: Type.OBJECT,
            properties: {
              invoiceNumber: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              dateIssued: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['contract', 'service_delivered', 'invoice', 'payment_due', 'part_payment', 'chaser', 'lba_sent', 'acknowledgment', 'communication'] }
              }
            }
          },
          recommendedDocument: { type: Type.STRING },
          documentReason: { type: Type.STRING },
          confidenceScore: { type: Type.NUMBER },
          extractedFields: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    const result = JSON.parse(cleanJson(response.text || '{}'));

    // Post-process: Infer county from postcode if missing
    const claimantData = result.claimant || {};
    const defendantData = result.defendant || {};

    // Infer defendant county from postcode if missing
    if (defendantData.postcode && !defendantData.county) {
      const inferredCounty = postcodeToCounty(defendantData.postcode);
      if (inferredCounty) {
        defendantData.county = inferredCounty;
        console.log(`[extractDataFromChat] Inferred defendant county: ${inferredCounty}`);
      }
    }

    // Infer claimant county from postcode if missing
    if (claimantData.postcode && !claimantData.county) {
      const inferredCounty = postcodeToCounty(claimantData.postcode);
      if (inferredCounty) {
        claimantData.county = inferredCounty;
        console.log(`[extractDataFromChat] Inferred claimant county: ${inferredCounty}`);
      }
    }

    // Map string document type to enum
    const docTypeMap: Record<string, DocumentType> = {
      'Polite Payment Reminder': DocumentType.POLITE_CHASER,
      'Letter Before Action': DocumentType.LBA,
      'Form N1 (Claim Form)': DocumentType.FORM_N1,
      'Part 36 Settlement Offer': DocumentType.PART_36_OFFER,
      'Form N225 (Default Judgment)': DocumentType.DEFAULT_JUDGMENT,
      'Installment Payment Agreement': DocumentType.INSTALLMENT_AGREEMENT
    };

    const recommendedDoc = docTypeMap[result.recommendedDocument] || DocumentType.LBA;

    return {
      claimant: claimantData,
      defendant: defendantData,
      invoice: result.invoice || {},
      timeline: result.timeline || [],
      recommendedDocument: recommendedDoc,
      documentReason: result.documentReason || 'Based on your consultation, this is the recommended next step.',
      confidenceScore: result.confidenceScore || 70,
      extractedFields: result.extractedFields || []
    };
  } catch (e) {
    console.error('[extractDataFromChat] Parse error:', e);
    // Return default recommendation on error
    return {
      recommendedDocument: DocumentType.LBA,
      documentReason: 'Unable to analyze conversation. Letter Before Action is recommended as the standard first step.',
      confidenceScore: 50,
      extractedFields: []
    };
  }
};

export const draftUKClaim = async (data: ClaimState): Promise<GeneratedContent> => {
  const isN1 = data.selectedDocType === DocumentType.FORM_N1;
  const docTypeLabel = isN1 ? "Particulars of Claim for Form N1" : "Letter Before Action (Pre-Action Protocol)";

  // Safe Financials
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const totalDebt = (principal + interest + comp).toFixed(2);

  // Determine applicable Interest Act (Crucial for Validity)
  // B2B = Late Payment Act 1998. B2C = County Courts Act 1984 s.69.
  // B2B includes Sole Traders per Late Payment of Commercial Debts (Interest) Act 1998
  const isClaimantBusiness = data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER;
  const isDefendantBusiness = data.defendant.type === PartyType.BUSINESS || data.defendant.type === PartyType.SOLE_TRADER;
  const isB2B = isClaimantBusiness && isDefendantBusiness;
  const interestClause = isB2B
      ? "the Late Payment of Commercial Debts (Interest) Act 1998"
      : "section 69 of the County Courts Act 1984";

  const interestRate = isB2B ? "8% above Bank of England Base Rate" : "8% per annum";

  // Prepare Chat Context for Drafting
  const chatContext = data.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
    Draft the ${docTypeLabel} for a UK Small Claims Court case.

    PARTIES:
    - Claimant: ${data.claimant.name} (${data.claimant.type})
    - Defendant: ${data.defendant.name} (${data.defendant.type})

    FINANCIALS:
    - Principal: £${formatCurrency(principal)}
    - Interest: £${formatCurrency(interest)} (Calculated under ${interestClause} at ${interestRate})
    - Compensation: £${formatCurrency(comp)}
    - Total Claim Amount: £${totalDebt}

    TIMELINE: ${JSON.stringify(data.timeline)}
    CONSULTATION NOTES: ${chatContext}

    REQUIREMENTS:
    1. **Legal Basis**: YOU MUST cite "${interestClause}" for the interest claim.

    2. **IF DRAFTING FORM N1 (Particulars of Claim)**:
       - Structure strictly: "1. The Parties", "2. The Agreement", "3. The Breach", "4. The Claim".
       - Use formal "The Claimant claims interest under..." phrasing.
       - Do NOT include a "Statement of Truth" at the bottom (it is handled by the form checkboxes).
       - Concise, numbered paragraphs fitting for the 'Particulars of Claim' box on Page 3.

    3. **IF DRAFTING LETTER BEFORE ACTION (LBA)**:
       - Must comply with "Pre-Action Protocol for Debt Claims".
       - Must explicitly state: "If you do not reply within 30 days, we will start court proceedings."
       - Must reference the enclosed "Information Sheet" (Annex 1) and "Reply Form" (Annex 2).
       - Tone: Firm but professional.
       - Break down the debt clearly.

    4. **BriefDetails** (For N1 Only): A max 25-word summary. e.g. "Money claim for unpaid invoices [Ref] regarding [Service/Goods]."

    Return JSON.
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          documentType: { type: Type.STRING },
          content: { type: Type.STRING },
          briefDetails: { type: Type.STRING },
          legalBasis: { type: Type.STRING },
          nextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    const result = JSON.parse(cleanJson(response.text || '{}'));
    return {
      documentType: data.selectedDocType,
      content: result.content || '',
      briefDetails: result.briefDetails,
      legalBasis: result.legalBasis || 'Contract Law',
      nextSteps: result.nextSteps || []
    };
  } catch (e) {
    console.error("Draft Parse Error", e);
    throw new Error("Failed to generate draft.");
  }
};

// New Function for "Director Mode" - Conversational Refinement
export const refineDraft = async (currentContent: string, instruction: string): Promise<string> => {
  const prompt = `
    Act as a Legal Document Specialist.
    Refine the text below based on the user's directive.

    DIRECTIVE: "${instruction}"

    ORIGINAL TEXT:
    "${currentContent}"

    Constraints:
    - Maintain strict legal professionalism suitable for UK Courts.
    - **DO NOT** remove legal citations (e.g. County Courts Act 1984).
    - If the user asks for "more aggressive", use "immediate commencement of proceedings" but do not threaten illegal action.
    - Output ONLY the refined text.
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  return response.text || currentContent;
};

export const reviewDraft = async (data: ClaimState): Promise<{ isPass: boolean; critique: string; improvements: string[]; correctedContent?: string }> => {
  // Safe Financials for "The Truth"
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;

  const totalClaimValue = (principal + interest + comp).toFixed(2);

  // Format Chat History as Transcript
  const chatTranscript = data.chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
    Act as a Senior Legal Assistant auditing a draft.

    --- SOURCE OF TRUTH ---
    Claimant: ${data.claimant.name}
    Defendant: ${data.defendant.name}
    Invoice: ${data.invoice.invoiceNumber} (£${formatCurrency(principal)})
    Total Claim (ex fee): £${totalClaimValue}

    TIMELINE:
    ${JSON.stringify(data.timeline)}

    TRANSCRIPT:
    ${chatTranscript}

    --- DRAFT ---
    "${data.generated?.content}"

    Check for:
    1. Factual Hallucinations (Dates/Events not in source).
    2. Financial Errors.
    3. Role Swaps (Claimant vs Defendant).
    4. Missing Act Reference (e.g. 1984 Act or 1998 Act).

    Output JSON.
  `;

  const response = await generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isPass: { type: Type.BOOLEAN },
          critique: { type: Type.STRING },
          improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctedContent: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(cleanJson(response.text || '{"isPass": false, "critique": "Error analyzing", "improvements": []}'));
  } catch (error) {
    console.error('[reviewDraft] JSON parse error:', error);
    // Return safe default on parse failure
    return {
      isPass: false,
      critique: 'Unable to parse review response from AI. Please try again.',
      improvements: ['AI response was malformed - manual review recommended'],
      correctedContent: data.generated?.content || ''
    };
  }
};

/**
 * Analyze claim input from conversation entry - combines user text and files
 */
export const analyzeClaimInput = async (
  userInput: string,
  files: EvidenceFile[],
  previousMessages: { role: string; content: string }[]
): Promise<ClaimIntakeResult> => {
  // Build context from previous messages
  const conversationContext = previousMessages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  // If we have files, analyze them first
  let fileAnalysis = '';
  if (files.length > 0) {
    try {
      const evidenceResult = await analyzeEvidence(files);
      // analyzeEvidence returns {claimant, defendant, invoice, timelineEvents, classifications}
      fileAnalysis = `\nExtracted from uploaded files:\n${JSON.stringify(evidenceResult, null, 2)}`;
    } catch (e) {
      console.error('[analyzeClaimInput] File analysis error:', e);
    }
  }

  // Determine if this is the first file upload (no prior conversation about these files)
  const isFirstFileAnalysis = files.length > 0 && previousMessages.length === 0;

  const prompt = `
    You are a UK debt recovery assistant helping a user describe their claim.

    **TODAY'S DATE: ${getTodayUK()} (${getTodayISO()})**
    Use this date for ALL date calculations. Any date before today is in the PAST. Any date after today is in the FUTURE.

    **CRITICAL: DO NOT EXTRACT CLAIMANT DATA**
    The CLAIMANT is the logged-in user (the person filing the claim). Their details come from their user profile.
    You should ONLY extract DEFENDANT (debtor) information from the documents/conversation.
    If you see two companies in a document, the one OWED money is the claimant (ignore it), the one OWING money is the defendant (extract it).

    Previous conversation:
    ${conversationContext || 'None'}

    User's latest message: "${userInput}"
    ${fileAnalysis}

    ${isFirstFileAnalysis ? `
    *** IMPORTANT - TWO-PHASE EXTRACTION ***
    This is the FIRST time analyzing uploaded documents. You MUST follow this two-phase process:

    PHASE 1 - REVIEW FIRST (current phase):
    Before extracting data, scan the document(s) and identify ANY ambiguities:
    1. Is the currency clearly GBP (£)? If you see $, USD, EUR, or other currencies, you MUST ask to confirm.
    2. Are there multiple invoices? Ask which one the claim is about.
    3. Is the defendant clearly identifiable? If unclear, ask.
    4. Are dates ambiguous or potentially in different formats (US vs UK)?
    5. Is the invoice amount clearly readable?

    IF there are ANY ambiguities:
    - Set readyToExtract: false
    - Set extractedData to empty objects (do NOT extract yet)
    - Include ONLY ONE clarifying question in followUpQuestions - ask the MOST important question first
    - The user MUST answer this question before we proceed with extraction
    - After they answer, you can ask the next question in the following turn

    ONLY if the document is completely clear (GBP currency, single invoice, clear parties):
    - Set readyToExtract: true
    - Proceed with full extraction
    ` : `
    The user has already been asked clarifying questions or this is a follow-up message.
    Now you may proceed with extraction if you have enough information.
    `}

    
    === CRITICAL ADDRESS PARSING ===
    When extracting addresses from full address strings:
    - SPLIT addresses into separate fields: address (street only), city, postcode
    - Example: "10 Downing Street, London, SW1A 1AA" should become:
      address: "10 Downing Street"
      city: "London"
      postcode: "SW1A 1AA"
    - Do NOT put the entire address in the address field
    - Infer county from postcode if not stated explicitly

    === CRITICAL VALIDATIONS ===

    1. CURRENCY RULE:
    - This is a UK debt recovery system - claims MUST be in GBP
    - If you see $, USD, EUR, or any non-GBP currency, set currencyWarning: true and ask to confirm
    - Example question: "I noticed the amount appears to be in USD. UK courts require claims in GBP. Is this already in GBP, or do you need to convert it?"

    2. INVOICE & CONTACT EXTRACTION:
    - Invoice numbers: Look for patterns like "Invoice #123", "Inv No: 456", "INV-2024-001", or standalone numbers preceded by "Invoice"
    - Contact person: Extract names with titles like "John Smith, Managing Director" or from signatures, "Attn:", "FAO:" lines

    3. UK COUNTY REQUIREMENT:
    - All UK court forms require the county (e.g., "Greater London", "West Midlands", "Kent")
    - If county is NOT clearly stated for claimant OR defendant:
      - Try to infer from the postcode (e.g., SW1A = Greater London, M1 = Greater Manchester)
      - If cannot infer, set countyMissing: true and ask: "What county is [party name] located in?"
    - NEVER set readyToProceed: true without county for both parties

    3. STATUTE OF LIMITATIONS (6-YEAR RULE):
    - UK contract debts have a 6-year limitation period from the due date
    - Calculate how old the debt is from the due date (or invoice date + 30 days if no due date)
    - If debt is over 5 years old, set limitationWarning: true
    - If debt is over 6 years old, the claim may be statute-barred - warn strongly
    - Ask: "This debt appears to be [X] years old. Are you aware of the 6-year limitation period for debt claims?"

    4. SMALL CLAIMS TRACK LIMIT:
    - UK Small Claims Track limit is £10,000
    - If total claim amount exceeds £10,000, set exceedsSmallClaims: true
    - Warn: "Your claim may exceed the Small Claims Track limit (£10,000). Consider seeking legal advice."

    5. DATE VALIDATION:
    - Invoice date must be in the past
    - Due date must be after invoice date
    - If dates are illogical or ambiguous, set dateError: true and ask for clarification
    - Use UK date format (DD/MM/YYYY or "1 January 2024")

    6. LBA STATUS (for document recommendation):
    - Ask if user has already sent a Letter Before Action (LBA)
    - If LBA sent, ask when and if 30+ days have passed
    - This determines whether to recommend LBA or Form N1

    Return JSON with:
    - extractedData: Claim details (defendant, invoice, timeline ONLY - DO NOT include claimant) - leave empty if readyToExtract is false
    - followUpQuestions: Array with ONE clarifying question (the most important one) - ask questions one at a time
    - acknowledgment: Brief acknowledgment of what you understood/found
    - readyToProceed: true if we have enough info to continue (defendant name + invoice amount in GBP + defendant county)
    - readyToExtract: false if this is first file analysis AND there are ambiguities to clarify; true otherwise
    - confidence: 0-100 confidence in the data
    - currencyWarning: true if non-GBP currency detected
    - countyMissing: true if county is missing for defendant (ignore claimant county - comes from profile)
    - limitationWarning: true if debt is over 5 years old
    - debtAgeYears: number of years since due date (if calculable)
    - exceedsSmallClaims: true if claim amount > £10,000
    - dateError: true if dates are illogical or ambiguous
    - lbaSent: true if user mentioned sending LBA, false if not sent, null if unknown
    - lbaDaysAgo: number of days since LBA was sent (if known)
  `;

  try {
    const response = await generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedData: {
              type: Type.OBJECT,
              properties: {
                defendant: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    address: { type: Type.STRING, description: "Street address only (e.g. '10 Downing Street'), no city or postcode" },
                    city: { type: Type.STRING },
                    county: { type: Type.STRING },
                    postcode: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    companyNumber: { type: Type.STRING }
                  }
                },
                invoice: {
                  type: Type.OBJECT,
                  properties: {
                    invoiceNumber: { type: Type.STRING, description: "Extract from patterns like 'Invoice #123', 'Inv-456'" },
                    totalAmount: { type: Type.NUMBER },
                    dateIssued: { type: Type.STRING },
                    dateDue: { type: Type.STRING, description: "Calculate from payment terms if mentioned (e.g., '30 days' = dateIssued + 30 days)" },
                    paymentTerms: { type: Type.STRING, description: "Extract payment terms (e.g., 'Net 30', '30 days')" },
                    description: { type: Type.STRING },
                    currency: { type: Type.STRING }
                  }
                },
                timeline: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING },
                      description: { type: Type.STRING },
                      type: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            acknowledgment: { type: Type.STRING },
            readyToProceed: { type: Type.BOOLEAN },
            readyToExtract: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            currencyWarning: { type: Type.BOOLEAN },
            countyMissing: { type: Type.BOOLEAN },
            limitationWarning: { type: Type.BOOLEAN },
            debtAgeYears: { type: Type.NUMBER },
            exceedsSmallClaims: { type: Type.BOOLEAN },
            dateError: { type: Type.BOOLEAN },
            lbaSent: { type: Type.BOOLEAN },
            lbaDaysAgo: { type: Type.NUMBER }
          }
        }
      }
    });

    const result = JSON.parse(cleanJson(response.text || '{}'));

    // Post-process: Infer county from postcode if missing
    const extractedData = result.extractedData || {};

    // Clean addresses if they contain full address strings
    if (extractedData.defendant) {
      const cleanedDefendant = cleanPartyAddress(extractedData.defendant);
      extractedData.defendant.address = cleanedDefendant.address;
      extractedData.defendant.city = cleanedDefendant.city || extractedData.defendant.city;
      extractedData.defendant.postcode = cleanedDefendant.postcode || extractedData.defendant.postcode;
    }

    if (extractedData.claimant) {
      const cleanedClaimant = cleanPartyAddress(extractedData.claimant);
      extractedData.claimant.address = cleanedClaimant.address;
      extractedData.claimant.city = cleanedClaimant.city || extractedData.claimant.city;
      extractedData.claimant.postcode = cleanedClaimant.postcode || extractedData.claimant.postcode;
    }

    // Infer defendant county from postcode if missing
    if (extractedData.defendant?.postcode && !extractedData.defendant?.county) {
      const inferredCounty = postcodeToCounty(extractedData.defendant.postcode);
      if (inferredCounty) {
        extractedData.defendant.county = inferredCounty;
        console.log(`[analyzeClaimInput] Inferred defendant county: ${inferredCounty} from postcode ${extractedData.defendant.postcode}`);
      }
    }

    // Recalculate countyMissing after inference
    // Note: Claimant county comes from user profile, not extraction
    const defendantCountyMissing = !extractedData.defendant?.county;
    const countyStillMissing = defendantCountyMissing;

    return {
      extractedData,
      followUpQuestions: result.followUpQuestions || [],
      acknowledgment: result.acknowledgment || 'I received your input.',
      readyToProceed: result.readyToProceed || false,
      readyToExtract: result.readyToExtract !== false, // Default to true unless explicitly false
      confidence: result.confidence || 50,
      currencyWarning: result.currencyWarning || false,
      countyMissing: countyStillMissing, // Use recalculated value
      limitationWarning: result.limitationWarning || false,
      debtAgeYears: result.debtAgeYears,
      exceedsSmallClaims: result.exceedsSmallClaims || false,
      dateError: result.dateError || false,
      lbaSent: result.lbaSent,
      lbaDaysAgo: result.lbaDaysAgo
    };
  } catch (error) {
    console.error('[analyzeClaimInput] Error:', error);
    return {
      extractedData: {},
      followUpQuestions: ['Could you tell me more about your claim?'],
      acknowledgment: 'I had trouble processing that. Let me ask some questions.',
      readyToProceed: false,
      confidence: 0
    };
  }
};