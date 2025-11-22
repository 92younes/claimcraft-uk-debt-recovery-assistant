import { GoogleGenAI, Type } from "@google/genai";
import { ClaimState, GeneratedContent, Party, InvoiceData, DocumentType, EvidenceFile, ChatMessage, PartyType } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to safely format currency
const formatCurrency = (val: number | undefined) => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return val.toFixed(2);
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
  const ai = getClient();
  
  const prompt = `
    Analyze the provided evidence documents (Invoices, Contracts, Emails).
    Extract the following details for a UK Debt Claim.
    
    1. Identify the Creditor (Claimant).
    2. Identify the Debtor (Defendant).
    3. Extract the MAIN Invoice details (Number, Date, Due Date, Amount).
    4. Look for any other dates in the documents (emails, contracts) to build a mini-timeline of events.
    5. CLASSIFY each document:
       - Is it a "Signed Contract"?
       - Is it an "Unpaid Invoice"?
       - Is it a "Payment Chaser (Email/Letter)"?
       - Is it a "Text/Whatsapp Message"?
       - Is it a "Bank Statement"?

    Return valid JSON matching the schema.
    Use 'Individual' or 'Business' based on entities (Ltd/Plc = Business).
  `;

  const parts: any[] = files.map(f => ({
    inlineData: {
      data: f.data,
      mimeType: f.type
    }
  }));
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          claimant: { type: Type.OBJECT, properties: { 
              name: { type: Type.STRING }, 
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
          } },
          defendant: { type: Type.OBJECT, properties: { 
              name: { type: Type.STRING }, 
              address: { type: Type.STRING },
              city: { type: Type.STRING },
              postcode: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['Individual', 'Business'] }
          } },
          invoice: { type: Type.OBJECT, properties: {
              invoiceNumber: { type: Type.STRING },
              dateIssued: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              currency: { type: Type.STRING }
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

export const getClaimStrengthAssessment = async (data: ClaimState): Promise<{ score: number, analysis: string, weaknesses: string[] }> => {
  const ai = getClient();
  
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
    - score: number (0-100)
    - analysis: string (Concise summary of the case strength)
    - weaknesses: string[] (List specific gaps, e.g., "Missing signed contract", "No proof of delivery", "Debt relies on verbal agreement")
  `;

  const response = await ai.models.generateContent({
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
    return JSON.parse(cleanJson(response.text || '{}'));
  } catch (e) {
    return { score: 50, analysis: "Could not assess strength automatically.", weaknesses: [] };
  }
};

export const startClarificationChat = async (data: ClaimState): Promise<string> => {
  const ai = getClient();

  // Safe Financials
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const totalDebt = (principal + interest + comp).toFixed(2);

  const prompt = `
    Act as an Expert Legal Assistant (UK Law). 
    Review the claim data:
    
    - Claimant: ${data.claimant.name}
    - Defendant: ${data.defendant.name}
    - Total Value: £${totalDebt}
    - Timeline: ${JSON.stringify(data.timeline)}

    Your goal is to find the weakest link in the case immediately to help the user prepare.
    
    Generate the FIRST message to the user.
    1. Be extremely succinct. No fluff.
    2. Do not greet.
    3. Ask the single most critical question to determine if the claim is valid (e.g., "Do you have a signed contract?").
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });
  
  return response.text || "Do you have a written contract signed by the defendant?";
};

export const sendChatMessage = async (history: ChatMessage[], userMessage: string, data: ClaimState): Promise<string> => {
  const ai = getClient();
  
  // Inject calculated financials so the AI understands the full claim value
  const principal = data.invoice.totalAmount || 0;
  const interest = data.interest.totalInterest || 0;
  const comp = data.compensation || 0;
  const fee = data.courtFee || 0;

  const totalDebt = (principal + interest + comp).toFixed(2);
  const grandTotal = (principal + interest + comp + fee).toFixed(2);

  const systemInstruction = `
    You are an AI Legal Assistant for UK Small Claims. 
    You are NOT a solicitor and cannot provide legal advice. You provide "Legal Information" and procedural guidance based on the Civil Procedure Rules (CPR).
    
    CASE METRICS:
    - Value: £${totalDebt} (Total with Fee: £${grandTotal})
    - Claimant: ${data.claimant.name}
    - Defendant: ${data.defendant.name}
    
    TIMELINE:
    ${JSON.stringify(data.timeline)}
    
    COMMUNICATION PROTOCOL (STRICT):
    1. **EXTREME BREVITY.** Max 2 sentences.
    2. **DIRECTNESS.** No "I understand", "Hello", or "Thank you".
    3. **INTERROGATE.** Ask one specific question to identify evidence gaps.
    4. **ADVISE.** If facts are clear, state the legal position under UK CPR (Civil Procedure Rules).
    5. **CLOSE.** If you have enough facts (Contract, Invoice, Proof of Delivery), state exactly: "I have sufficient facts. Click 'Final Review' to draft the papers."
    6. **DISCLAIMER.** If asked for specific advice, state "I am a legal assistant, not a solicitor. This is procedural guidance."
  `;

  const sdkHistory = history.slice(0, -1).map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    },
    history: sdkHistory
  });

  const result = await chat.sendMessage({ message: userMessage });
  
  return result.text || "Please clarify.";
};

export const draftUKClaim = async (data: ClaimState): Promise<GeneratedContent> => {
  const ai = getClient();
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

  const response = await ai.models.generateContent({
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
  const ai = getClient();
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });
  
  return response.text || currentContent;
};

export const reviewDraft = async (data: ClaimState): Promise<{ isPass: boolean; critique: string; improvements: string[]; correctedContent?: string }> => {
  const ai = getClient();
  
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

  const response = await ai.models.generateContent({
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

  return JSON.parse(cleanJson(response.text || '{"isPass": false, "critique": "Error analyzing", "improvements": []}'));
};