import { Type } from "@google/genai";
import { ClaimState, GeneratedContent, Party, InvoiceData, DocumentType, EvidenceFile, ChatMessage, PartyType, ClaimStrength, ExtractedClaimData, TimelineEvent, ChatResponse, ClaimIntakeResult } from "../types";
import { formatCurrency, formatTotalDebt, formatGrandTotal } from "../utils/calculations";
import { getCountyFromPostcode } from "../constants";

// Get backend URL from environment or default to localhost
const getBackendUrl = () => {
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

// Helper to call Gemini through backend proxy
const callGeminiProxy = async (params: {
  model: string;
  prompt: string;
  files?: Array<{ data: string; mimeType: string }>;
  config?: any;
}): Promise<{ text: string; candidates?: any[] }> => {
  const backendUrl = getBackendUrl();

  const response = await fetch(`${backendUrl}/api/gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Gemini API request failed: ${response.status}`);
  }

  return response.json();
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

    1. Identify the Creditor (Claimant) with full address including UK county.
    2. Identify the Debtor (Defendant) with full address including UK county.
    3. Extract the MAIN Invoice details (Number, Date, Due Date, Amount, Description of goods/services).
    4. Look for any other dates in the documents (emails, contracts) to build a mini-timeline of events.
    5. CLASSIFY each document:
       - Is it a "Signed Contract"?
       - Is it an "Unpaid Invoice"?
       - Is it a "Payment Chaser (Email/Letter)"?
       - Is it a "Text/Whatsapp Message"?
       - Is it a "Bank Statement"?

    IMPORTANT: Extract the UK county for both claimant and defendant addresses (e.g., "Greater London", "West Midlands", "Surrey").
    If county is not explicitly stated, infer it from the postcode or city.

    Return valid JSON matching the schema.
    Use 'Individual' or 'Business' based on entities (Ltd/Plc = Business).
  `;

  // Convert files to the format expected by the proxy
  const proxyFiles = files.map(f => ({
    data: f.data,
    mimeType: f.type
  }));

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
    files: proxyFiles,
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
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
          } },
          defendant: { type: Type.OBJECT, properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              county: { type: Type.STRING, description: "UK county (e.g. Greater London, West Yorkshire)" },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
          } },
          invoice: { type: Type.OBJECT, properties: {
              invoiceNumber: { type: Type.STRING },
              dateIssued: { type: Type.STRING },
              dueDate: { type: Type.STRING },
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
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse AI response");
  }
};

/**
 * Analyze claim input from conversation entry (description + optional files)
 * Used by the new ConversationEntry component for Garfield-style intake
 * Returns extracted data, acknowledgment, and follow-up questions if needed
 */
export const analyzeClaimInput = async (
  description: string,
  attachments: EvidenceFile[] = [],
  previousMessages: { role: 'user' | 'ai'; content: string }[] = []
): Promise<ClaimIntakeResult> => {

  // Build context from previous messages if any
  const conversationContext = previousMessages.length > 0
    ? `\n\nPREVIOUS CONVERSATION:\n${previousMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `
    You are a friendly UK debt recovery assistant. Analyze the user's input and any attached documents to understand their claim.

    USER INPUT: "${description}"
    ${conversationContext}
    ${attachments.length > 0 ? `\n\nATTACHED DOCUMENTS: ${attachments.length} file(s) provided for analysis` : ''}

    YOUR TASK:
    1. Extract any claim-related information mentioned:
       - Debtor name (who owes money)
       - Amount owed
       - Invoice number/reference
       - Invoice date and due date
       - Any timeline events (when invoice sent, chasers sent, etc.)
       - Claimant details (user's business name if mentioned)
       - Prior communications status (informal reminders, formal LBA, etc.)
       - LBA status AND the date it was sent (if applicable)

    2. Generate a KEY POINTS acknowledgment (brief, friendly):
       Format it like:
       "Here's what I understand:
       **Amount Owed:** £X,XXX
       **Debtor:** [Name]
       **Invoice:** #[Number], due [Date] (if available)
       **Status:** [X] days overdue (if calculable)"

       Only include fields you actually found. Keep it concise.

    3. Determine if you have enough to proceed (STRICT - all must be answered):
       - READY if ALL of these are TRUE:
         a) Amount AND debtor name are clear
         b) You have EXPLICIT confirmation of prior communication status:
            - EITHER: User confirmed they haven't sent ANY reminders yet (priorCommunications = 'none')
            - OR: User confirmed they've sent informal reminders but no LBA (priorCommunications = 'informal_only')
            - OR: User confirmed they've sent a formal LBA AND you know WHEN it was sent (priorCommunications = 'formal_lba')
         c) You can confidently recommend a specific document type
         d) You have NO critical unanswered questions
       - NOT READY if:
         - User gave vague answer like "I've been chasing them" (need explicit yes/no on LBA)
         - Missing the LBA sent DATE if they say they sent one
         - Missing amount OR debtor name
         - You haven't asked about prior contact at all yet

    4. FOLLOW-UP QUESTION PRIORITY (ask in this order until you have clear answers):
       **FIRST**: Prior communications - "Have you sent any payment reminders or chaser emails to [Debtor name]?"
       **SECOND**: LBA status - "Have you sent a formal Letter Before Action (LBA) giving them 30 days to respond?"
       **THIRD**: LBA date (if they said yes to LBA) - "When did you send the LBA? Has it been more than 30 days?"
       **FOURTH**: Evidence - "Do you have a written contract or proof that the service/goods were delivered?"

       IMPORTANT:
       - If user gives vague answer like "I've chased them a lot", ask for clarification: "Just to clarify - have you sent a FORMAL Letter Before Action (LBA) that gave them 30 days to respond, or were these informal reminders?"
       - Do NOT mark ready until you have explicit answers to prior communications AND LBA status

    5. DOCUMENT RECOMMENDATION LOGIC (when you have all the info):
       - If NO prior contact at all → recommend "Polite Payment Reminder"
       - If informal reminders sent but NO LBA → recommend "Letter Before Action"
       - If LBA sent less than 30 days ago → recommend "Wait for 30-day period to expire"
       - If LBA sent 30+ days ago with no response → recommend "Court Claim (Form N1)"
       - If user prefers to settle → recommend "Part 36 Settlement Offer"

    6. When READY, end your acknowledgment with a clear call-to-action:
       "Based on what you've told me, I recommend starting with a **[Document Type]**.
       Click the **Continue** button below to review the details and proceed."

    7. Calculate confidence (0-100):
       - 90+: Clear amount, debtor name, explicit LBA status with date, evidence status known
       - 70-89: Amount and debtor clear, LBA status explicit but some details missing
       - 50-69: Basic info present but LBA status vague or date unknown
       - <50: Missing critical info (amount, debtor, or prior contact status unclear)

    IMPORTANT RULES:
    - Be warm and helpful, not robotic
    - Don't ask for information already explicitly answered in the conversation
    - If user uploaded an invoice, extract everything you can from it
    - UK-specific: Look for postcodes, company numbers, Ltd/PLC indicators
    - For dates, prefer DD/MM/YYYY format common in UK
    - NEVER mark readyToProceed as true unless you have EXPLICIT answers about prior contact
    - If user says "I've been chasing" or similar vague statements, ALWAYS ask for clarification
  `;

  // Convert attachments to proxy format
  const proxyFiles = attachments.map(f => ({
    data: f.data,
    mimeType: f.type
  }));

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
    files: proxyFiles.length > 0 ? proxyFiles : undefined,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          defendant: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              county: { type: Type.STRING },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
            }
          },
          claimant: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              county: { type: Type.STRING },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
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
                type: { type: Type.STRING }
              }
            }
          },
          acknowledgment: { type: Type.STRING, description: "Friendly key points summary of what was understood. When readyToProceed is true, must end with document recommendation and 'Click the Continue button below'" },
          followUpQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "1-2 targeted questions if more info needed. Priority: prior contact status, then LBA status, then LBA date, then evidence"
          },
          readyToProceed: { type: Type.BOOLEAN, description: "True only if amount + debtor + EXPLICIT prior contact/LBA status are known and can make document recommendation" },
          confidence: { type: Type.NUMBER, description: "0-100 confidence in extraction" },
          lbaStatus: { type: Type.STRING, enum: ['not_sent', 'sent_under_30_days', 'sent_over_30_days', 'unknown'], description: "Status of Letter Before Action. Use 'unknown' if user gave vague answer." },
          lbaSentDate: { type: Type.STRING, description: "ISO date (YYYY-MM-DD) when LBA was sent, if applicable. Required if lbaStatus is 'sent_under_30_days' or 'sent_over_30_days'" },
          priorCommunications: { type: Type.STRING, enum: ['none', 'informal_only', 'formal_lba', 'unknown'], description: "Level of prior contact: 'none' = no contact, 'informal_only' = reminders but no LBA, 'formal_lba' = sent formal LBA" },
          hasContract: { type: Type.BOOLEAN, description: "Does user have a signed contract?" },
          hasProofOfDelivery: { type: Type.BOOLEAN, description: "Does user have proof of delivery/service completion?" },
          recommendedDocument: { type: Type.STRING, enum: ['Polite Payment Reminder', 'Letter Before Action', 'Court Claim (Form N1)', 'Part 36 Settlement Offer', 'Wait for 30-day period'], description: "Recommended document based on prior contact status" }
        },
        required: ['acknowledgment', 'readyToProceed', 'confidence']
      }
    }
  });

  try {
    const result = JSON.parse(cleanJson(response.text || '{}'));

    // Enhance with county lookup if postcode present
    if (result.defendant?.postcode && !result.defendant?.county) {
      result.defendant.county = getCountyFromPostcode(result.defendant.postcode);
    }
    if (result.claimant?.postcode && !result.claimant?.county) {
      result.claimant.county = getCountyFromPostcode(result.claimant.postcode);
    }

    // Build extracted data in ClaimState-compatible format
    const extractedData: Partial<ClaimState> = {};

    if (result.defendant) {
      extractedData.defendant = {
        type: result.defendant.type === 'Business' ? PartyType.BUSINESS : PartyType.INDIVIDUAL,
        name: result.defendant.name || '',
        address: result.defendant.address || '',
        city: result.defendant.city || '',
        county: result.defendant.county || '',
        postcode: result.defendant.postcode || '',
        solvencyStatus: 'Unknown'
      };
    }

    if (result.claimant) {
      extractedData.claimant = {
        type: result.claimant.type === 'Business' ? PartyType.BUSINESS : PartyType.INDIVIDUAL,
        name: result.claimant.name || '',
        address: result.claimant.address || '',
        city: result.claimant.city || '',
        county: result.claimant.county || '',
        postcode: result.claimant.postcode || '',
        solvencyStatus: 'Unknown'
      };
    }

    if (result.invoice) {
      extractedData.invoice = {
        invoiceNumber: result.invoice.invoiceNumber || '',
        totalAmount: result.invoice.totalAmount || 0,
        dateIssued: result.invoice.dateIssued || '',
        dueDate: result.invoice.dueDate || '',
        currency: 'GBP',
        description: result.invoice.description || ''
      };
    }

    if (result.timeline && result.timeline.length > 0) {
      extractedData.timeline = result.timeline;
    }

    return {
      extractedData,
      acknowledgment: result.acknowledgment || "I couldn't extract much from that. Could you tell me more about your claim?",
      followUpQuestions: result.followUpQuestions || [],
      readyToProceed: result.readyToProceed === true,
      confidence: result.confidence || 50,
      lbaStatus: result.lbaStatus || 'unknown',
      lbaSentDate: result.lbaSentDate,
      priorCommunications: result.priorCommunications || 'unknown',
      hasContract: result.hasContract,
      hasProofOfDelivery: result.hasProofOfDelivery,
      recommendedDocument: result.recommendedDocument
    };
  } catch (e) {
    console.error('[analyzeClaimInput] Parse error:', e);
    return {
      extractedData: {},
      acknowledgment: "I had trouble understanding that. Could you tell me: who owes you money and how much?",
      followUpQuestions: ["How much money are you owed?", "Who owes you this money (person or company name)?"],
      readyToProceed: false,
      confidence: 0,
      priorCommunications: 'unknown'
    };
  }
};

export const getClaimStrengthAssessment = async (data: ClaimState): Promise<{ score: number, strength: ClaimStrength, analysis: string, weaknesses: string[] }> => {
  const prompt = `
    Act as an Expert Legal Assistant for UK Small Claims.
    Assess the "Winnability" (Probability of Success) of this claim on the **Balance of Probabilities** (Civil Standard >50%).

    CLAIMANT: ${data.claimant.name}
    DEFENDANT: ${data.defendant.name}
    DEFENDANT SOLVENCY: ${data.defendant.solvencyStatus || 'Unknown'}
    AMOUNT: £${data.invoice.totalAmount}

    TIMELINE OF EVENTS:
    ${JSON.stringify(data.timeline)}

    EVIDENCE BUNDLE:
    ${data.evidence.map(e => `- ${e.name}: Classified as "${e.classification || 'Unknown Document'}"`).join('\n')}

    CLARIFICATIONS (Client Interview):
    ${data.chatHistory.filter(m => m.role === 'user').map(m => `- Client: ${m.content}`).join('\n')}

    JUDGMENT CRITERIA:
    1. **Contract Formation**: Is there a signed contract OR clear evidence of agreement (emails, texts, conduct)?
    2. **Performance**: Is there proof the service/goods were delivered?
    3. **Admissions**: Did the defendant admit the debt? (Strongest evidence)
    4. **Solvency Risk**: Is the defendant active/solvent? (Crucial for recovery)
    5. **Disputes**: Is there a valid counterclaim or dispute mentioned in the chat?

    SCORING LOGIC:
    - 75-100: Clear agreement + Proof of delivery + No valid dispute.
    - 50-74: Verbal agreement but good email trail OR minor dispute.
    - 0-49: No evidence OR Defendant is insolvent OR valid counterclaim.

    Return JSON:
    - score: number (0-100)
    - analysis: string (Concise summary of the case strength)
    - weaknesses: string[] (List specific gaps, e.g., "Missing signed contract", "No proof of delivery", "Debt relies on verbal agreement")
  `;

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
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

export const startClarificationChat = async (data: ClaimState, hasHistory: boolean = false): Promise<string> => {

  // Safe Financials
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const totalDebt = formatTotalDebt(principal, interest, comp);

  // Identify critical missing data
  const missingAddressFields: string[] = [];
  if (!data.claimant.county?.trim()) missingAddressFields.push("your county (e.g., Greater London, Surrey)");
  if (!data.claimant.address?.trim()) missingAddressFields.push("your street address");
  if (!data.defendant.county?.trim()) missingAddressFields.push("the defendant's county");
  if (!data.defendant.address?.trim()) missingAddressFields.push("the defendant's street address");

  const hasMissingAddress = missingAddressFields.length > 0;
  const missingAddressContext = hasMissingAddress
    ? `\n\nIMPORTANT: The following required fields are MISSING:\n${missingAddressFields.map(f => `- ${f}`).join('\n')}\n\nYou MUST ask for this information first. Court forms require complete addresses including UK county.`
    : '';

  const prompt = `
    You are an AI Legal Assistant for UK Small Claims.

    Review the claim data:
    - Claimant: ${data.claimant.name || 'Not provided'}
    - Claimant Address: ${data.claimant.address || 'MISSING'}, ${data.claimant.city || 'MISSING'}, ${data.claimant.county || 'MISSING'}, ${data.claimant.postcode || 'MISSING'}
    - Defendant: ${data.defendant.name || 'Not provided'}
    - Defendant Address: ${data.defendant.address || 'MISSING'}, ${data.defendant.city || 'MISSING'}, ${data.defendant.county || 'MISSING'}, ${data.defendant.postcode || 'MISSING'}
    - Total Value: £${totalDebt}
    - Timeline: ${JSON.stringify(data.timeline)}
    ${missingAddressContext}

    Generate a friendly but professional ${hasHistory ? 'continuation' : 'opening'} message (2-3 sentences):
    ${hasHistory ? `
    1. Acknowledge the user has verified their details in the wizard.
    2. Transition back to the conversation.
    3. ${hasMissingAddress ? 'Ask for the MISSING address information listed above.' : 'Ask ONE critical question about evidence (e.g., contract, proof of delivery).'}
    ` : `
    1. Greet the user briefly (e.g., "Hello, I'm your AI legal assistant")
    2. Acknowledge their claim (mention the amount and defendant name if available)
    3. ${hasMissingAddress ? 'Ask for the MISSING address information listed above.' : 'Ask ONE critical question to identify the biggest evidence gap.'}
    `}

    ${hasMissingAddress ? 'Example: "I see we still need some address details for the court forms. Could you please provide..."' : 'Example: "Thanks for verifying those details. To assess your case strength, do you have a signed contract..."'}

    Keep it conversational and helpful, not robotic or interrogating.
  `;

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt
  });

  return response.text || (hasHistory 
    ? "Thanks for verifying your details. Now, do you have a written contract signed by the defendant?"
    : "Hello, I'm your AI legal assistant. To assess your case strength, do you have a written contract signed by the defendant?");
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
  const missingFields: string[] = [];
  if (!data.claimant.county?.trim()) missingFields.push("Claimant's county");
  if (!data.claimant.address?.trim()) missingFields.push("Claimant's street address");
  if (!data.claimant.city?.trim()) missingFields.push("Claimant's city/town");
  if (!data.claimant.postcode?.trim()) missingFields.push("Claimant's postcode");
  if (!data.defendant.county?.trim()) missingFields.push("Defendant's county");
  if (!data.defendant.address?.trim()) missingFields.push("Defendant's street address");
  if (!data.defendant.city?.trim()) missingFields.push("Defendant's city/town");
  if (!data.defendant.postcode?.trim()) missingFields.push("Defendant's postcode");
  if (!data.invoice.invoiceNumber?.trim()) missingFields.push("Invoice number/reference");
  if (!data.invoice.dateIssued) missingFields.push("Invoice date");

  const missingFieldsNote = missingFields.length > 0
    ? `\n\nCRITICAL MISSING DATA (MUST collect before proceeding):\n${missingFields.map(f => `- ${f}`).join('\n')}\n\nYou MUST ask for these specific fields. The court requires complete addresses including county.`
    : '\n\nAll required address and invoice fields are complete.';

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

  // Check if we have minimum required info for readiness
  const hasClaimantName = !!data.claimant.name?.trim();
  const hasDefendantName = !!data.defendant.name?.trim();
  const hasInvoiceAmount = data.invoice.totalAmount > 0;
  const hasMinExchanges = history.filter(m => m.role === 'user').length >= 2;

  const systemInstruction = `
    You are an AI Legal Assistant for UK Small Claims.
    You are NOT a solicitor and cannot provide legal advice. You provide "Legal Information" and procedural guidance based on the Civil Procedure Rules (CPR).

    CASE METRICS:
    - Value: £${totalDebt} (Total with Fee: £${grandTotal})
    - Claimant: ${data.claimant.name || 'Not provided'}
    - Defendant: ${data.defendant.name || 'Not provided'}

    CLAIMANT ADDRESS STATUS:
    - Street: ${data.claimant.address || 'MISSING'}
    - City: ${data.claimant.city || 'MISSING'}
    - County: ${data.claimant.county || 'MISSING'} (REQUIRED for court forms)
    - Postcode: ${data.claimant.postcode || 'MISSING'}

    DEFENDANT ADDRESS STATUS:
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

    DOCUMENT DETERMINATION QUESTIONS (ask these IN ORDER to determine the right document):
    **STEP 1 - Prior Contact Status:**
    - "Have you sent any payment reminders or chaser emails to the debtor?"
    - If NO → Recommend Polite Payment Reminder FIRST, then LBA if no response
    - If YES (informal only) → Move to Step 2

    **STEP 2 - LBA Status:**
    - "Have you sent a formal Letter Before Action (LBA) giving them 30 days to pay?"
    - If NO → Recommend Letter Before Action
    - If YES → Move to Step 3

    **STEP 3 - LBA Timing (CRITICAL):**
    - "When did you send the LBA? What was the date?"
    - Calculate if 30 days have passed
    - If <30 days → "You need to wait for the 30-day period to expire before filing a court claim."
    - If 30+ days → Recommend Court Claim (Form N1)

    **STEP 4 - Evidence Questions (for case strength):**
    - "Do you have a signed contract or written agreement?"
    - "Do you have proof that the service/goods were delivered?"

    **STEP 5 - Post-Filing (only if they mention court claim filed):**
    - "Has the defendant responded to the claim?"
    - No response after 14 days → Default Judgment (Form N225)
    - Defendant admitted → Judgment on Admission (Form N225A)
    - Defendant filed defence → Response to Defence

    **STEP 6 - Settlement Preference:**
    - "Would you prefer to negotiate a settlement or proceed to court?"
    - If settlement preferred → Part 36 Settlement Offer

    COMMUNICATION PROTOCOL:
    1. **PRIORITY:** If addresses are MISSING, ask for them FIRST (including UK county).
    2. **QUESTION FLOW:** Follow the steps above IN ORDER. Don't skip ahead.
    3. **VAGUE ANSWERS:** If user says "I've been chasing them", ask for clarification: "Just to clarify - were these informal reminders, or did you send a formal Letter Before Action (LBA) with a 30-day deadline?"
    4. **BREVITY:** Keep responses to 2-4 sentences maximum.
    5. **ACKNOWLEDGMENT:** Briefly acknowledge the user's answer before asking the next question.
    6. **NO REPETITION:** Do NOT ask the same question twice. Track what you've learned.
    7. **CLOSING:** When you have enough info, conclude with your recommendation:
       - If NO prior contact: "Since you haven't contacted the debtor yet, I recommend starting with a **Polite Payment Reminder** to maintain the business relationship. Click 'Continue' to review the details."
       - If informal reminders but NO LBA: "Based on our conversation, I recommend sending a formal **Letter Before Action**. This is required before court proceedings. Click 'Continue' to review the details."
       - If LBA sent <30 days ago: "Since you sent the LBA on [date], you need to wait until [30-day date] before you can file a court claim. I'll note this deadline for you."
       - If LBA sent 30+ days ago: "Since you've sent an LBA and 30 days have passed with no response, you're ready to file a **court claim (Form N1)**. Click 'Continue' to review the details."
       - If user wants settlement: "Given your preference to settle, I recommend a **Part 36 Settlement Offer**. Click 'Continue' to review the details."
    8. **DISCLAIMER:** If asked for legal advice, state: "I'm a legal assistant, not a solicitor. This is procedural guidance, not legal advice."
    9. **TONE:** Professional, concise, and goal-oriented. Use bullet points for lists and **bold** for key terms.

    RESPONSE FORMAT:
    You MUST respond with a JSON object containing:
    {
      "message": "Your conversational response here",
      "readyToProceed": true/false,
      "collected": {
         "claimantName": true/false,
         "claimantAddress": true/false,
         "defendantName": true/false,
         "defendantAddress": true/false,
         "invoiceDetails": true/false,
         "timelineEvents": true/false
      }
    }

    Set "collected" fields to TRUE if you have successfully gathered that information or if it was already provided in the context.

    Set readyToProceed to TRUE only when ALL of these conditions are met:
    1. You have confirmed the key claim details (claimant, defendant, amount)
    2. You have asked about LBA status and got a clear answer
    3. You have enough information to recommend a specific document
    4. You are concluding the consultation with a recommendation

    Set readyToProceed to FALSE if you still need to gather more information.
  `;

  // Build conversation history into the prompt
  const conversationHistory = history
    .slice(0, -1) // Exclude the last message (it's the current user message)
    .map(msg => `${msg.role === 'ai' ? 'ASSISTANT' : 'USER'}: ${msg.content}`)
    .join('\n');

  const fullPrompt = `${systemInstruction}

CONVERSATION HISTORY:
${conversationHistory}

USER: ${userMessage}

ASSISTANT (respond in JSON):`;

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt: fullPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          message: { type: Type.STRING, description: "The conversational response to the user" },
          readyToProceed: { type: Type.BOOLEAN, description: "Whether enough information has been collected to proceed" },
          collected: {
             type: Type.OBJECT,
             properties: {
                 claimantName: { type: Type.BOOLEAN },
                 claimantAddress: { type: Type.BOOLEAN },
                 defendantName: { type: Type.BOOLEAN },
                 defendantAddress: { type: Type.BOOLEAN },
                 invoiceDetails: { type: Type.BOOLEAN },
                 timelineEvents: { type: Type.BOOLEAN }
             }
          }
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
      readyToProceed: parsed.readyToProceed === true,
      collected: parsed.collected
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

    ${currentContext}

    CHAT TRANSCRIPT:
    ${chatTranscript}

    EXTRACTION RULES:
    1. Extract ANY addresses, postcodes, UK counties mentioned (e.g., "Greater London", "Surrey", "West Yorkshire")
    2. Extract invoice numbers, amounts, dates if mentioned
    3. Extract timeline events: When was invoice sent? When did they chase? When was LBA sent?
    4. ONLY extract data that was EXPLICITLY mentioned in the chat - do not invent data
    5. If data is already in "CURRENT" fields and matches what was said, don't re-extract it

    DOCUMENT RECOMMENDATION RULES (in order of priority):
    Based on the conversation, determine which document the user should generate:
    1. If user mentioned sending a Letter Before Action (LBA, formal letter, final demand) AND it's been 30+ days → Recommend FORM_N1
    2. If user sent LBA but less than 30 days ago → Note they need to WAIT (but can prepare Form N1)
    3. If user mentioned chasing/reminders but NO formal LBA yet → Recommend LBA
    4. If user wants to settle/negotiate → Recommend PART_36_OFFER
    5. If NO prior contact mentioned (first time reaching out) → Recommend POLITE_CHASER
    6. Default if unclear → Recommend LBA (pre-action protocol requirement)

    IMPORTANT: If user explicitly said they haven't contacted the debtor yet, ALWAYS recommend POLITE_CHASER first.

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

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          claimant: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
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
              address: { type: Type.STRING },
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

    // Enhance address data with lookup logic if county is missing
    const enhancedClaimant = { ...result.claimant };
    if (!enhancedClaimant.county && enhancedClaimant.postcode) {
      enhancedClaimant.county = getCountyFromPostcode(enhancedClaimant.postcode);
    }

    const enhancedDefendant = { ...result.defendant };
    if (!enhancedDefendant.county && enhancedDefendant.postcode) {
      enhancedDefendant.county = getCountyFromPostcode(enhancedDefendant.postcode);
    }

    return {
      claimant: enhancedClaimant || {},
      defendant: enhancedDefendant || {},
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
  const isB2B = data.claimant.type === PartyType.BUSINESS && data.defendant.type === PartyType.BUSINESS;
  const interestClause = isB2B 
      ? "Late Payment of Commercial Debts (Interest) Act 1998"
      : "Section 69 of the County Courts Act 1984";
  
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

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
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

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt
  });

  return response.text || currentContent;
};

export const reviewDraft = async (data: ClaimState): Promise<{ isPass: boolean; critique: string; improvements: string[]; correctedContent?: string }> => {
  
  // Safe Financials for "The Truth"
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const fee = data.courtFee || 0;

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

  const response = await callGeminiProxy({
    model: 'gemini-2.5-flash',
    prompt,
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