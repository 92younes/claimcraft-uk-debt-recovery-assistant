/**
 * ConversationEntry Component
 *
 * Garfield-style conversation entry point for new claims.
 * Users can upload evidence or describe their claim in natural language.
 * AI extracts data and asks brief follow-up questions if needed.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, Send, X, Loader2, ArrowRight, FileText, Sparkles, ChevronRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { analyzeClaimInput, extractDataFromChat } from '../services/geminiService';
import { ClaimState, EvidenceFile, UserProfile, ClaimIntakeResult, ConversationMessage, ChatMessage, DocumentType, Party, DataCorrection } from '../types';
import { profileToClaimantParty } from '../services/userProfileService';
import { getCurrencySymbol } from '../utils/calculations';
import { AlertTriangle, Scale, Calendar, MapPin, User } from 'lucide-react';
import { DataPreviewPanel } from './DataPreviewPanel';
import { DataConflictModal } from './DataConflictModal';

interface ConversationEntryProps {
  userProfile: UserProfile | null;
  onComplete: (extractedData: Partial<ClaimState>, messages: ConversationMessage[]) => void;
  onSkipToWizard?: () => void;
}

// Helper to get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Helper to safely render text with bold formatting (no dangerouslySetInnerHTML)
const renderFormattedText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

export const ConversationEntry: React.FC<ConversationEntryProps> = ({
  userProfile,
  onComplete,
  onSkipToWizard
}) => {
  // State
  const [files, setFiles] = useState<EvidenceFile[]>([]); // Current batch of files to upload
  const [allUploadedFiles, setAllUploadedFiles] = useState<EvidenceFile[]>([]); // All files uploaded during conversation
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [extractionStages, setExtractionStages] = useState<{
    documents: 'pending' | 'active' | 'done';
    debtor: 'pending' | 'active' | 'done';
    invoice: 'pending' | 'active' | 'done';
    timeline: 'pending' | 'active' | 'done';
  }>({ documents: 'pending', debtor: 'pending', invoice: 'pending', timeline: 'pending' });
  const [extractedData, setExtractedData] = useState<Partial<ClaimState> | null>(null);
  const [readyToProceed, setReadyToProceed] = useState(false);
  const [lastAcknowledgment, setLastAcknowledgment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<{ text: string; files: EvidenceFile[] } | null>(null);

  // Validation warnings state
  const [validationWarnings, setValidationWarnings] = useState<{
    currencyWarning?: boolean;
    countyMissing?: boolean;
    claimantCountyMissing?: boolean;  // Separate flag for claimant county (from profile)
    defendantCountyMissing?: boolean; // Separate flag for defendant county (from extraction)
    limitationWarning?: boolean;
    debtAgeYears?: number;
    exceedsSmallClaims?: boolean;
    dateError?: boolean;
  }>({});

  // Document recommendation state
  const [recommendedDocument, setRecommendedDocument] = useState<string | null>(null);
  const [documentReason, setDocumentReason] = useState<string | null>(null);
  const [isGettingRecommendation, setIsGettingRecommendation] = useState(false);

  // Data preview panel state
  const [newlyExtractedFields, setNewlyExtractedFields] = useState<string[]>([]);
  const [previewPanelCollapsed, setPreviewPanelCollapsed] = useState(true);

  // Data conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [profilePartyData, setProfilePartyData] = useState<Party | null>(null);
  const [chatPartyData, setChatPartyData] = useState<Partial<Party> | null>(null);

  // Applied corrections state (for visual feedback)
  const [appliedCorrections, setAppliedCorrections] = useState<DataCorrection[]>([]);

  // Helpers

  /**
   * Apply corrections to extracted data
   * Returns the updated data with corrections applied
   */
  const applyCorrections = (
    data: Partial<ClaimState> | null,
    corrections: DataCorrection[]
  ): Partial<ClaimState> | null => {
    if (!corrections || corrections.length === 0) return data;
    if (!data) data = {};

    const updated = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const correction of corrections) {
      const { field, newValue } = correction;
      const parts = field.split('.');

      if (parts.length === 2) {
        const [section, key] = parts;
        // Ensure the section exists
        if (!updated[section]) updated[section] = {};

        // Handle numeric values for certain fields
        if (key === 'totalAmount' && section === 'invoice') {
          const parsed = parseFloat(newValue.replace(/[£$,\s]/g, ''));
          if (!isNaN(parsed)) {
            updated[section][key] = parsed;
          }
        } else {
          updated[section][key] = newValue;
        }

        console.log(`[ConversationEntry] Applied correction: ${field} = "${newValue}"`);
      }
    }

    return updated;
  };
  const buildChatHistory = (msgs: ConversationMessage[]): ChatMessage[] => {
    return msgs.map((msg, idx) => ({
      id: `msg-${idx}-${msg.timestamp}`,
      // Standardized role: 'user' or 'assistant'
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  };

  const mergeExtractedData = (
    prev: Partial<ClaimState> | null,
    incoming?: Partial<ClaimState> | null
  ): Partial<ClaimState> | null => {
    if (!incoming) return prev;
    if (!prev) return incoming;

    // SECURITY GUARD: Log and discard any AI-extracted claimant data
    // Claimant MUST always come from user profile, never from document extraction
    // This prevents potential hallucination or confusion between creditor/debtor
    if (incoming.claimant && (incoming.claimant.name || incoming.claimant.address)) {
      console.warn('[ConversationEntry] AI attempted to extract claimant data - discarding. Claimant must come from user profile only.', {
        attemptedClaimant: incoming.claimant.name || 'unknown'
      });
    }

    return {
      ...prev,
      ...incoming,
      // Deep merge for nested objects
      defendant: { ...prev.defendant, ...incoming.defendant },
      // CRITICAL: Never merge AI-extracted claimant data - always preserve profile data
      claimant: prev.claimant,
      invoice: { ...prev.invoice, ...incoming.invoice },
      timeline: [...(prev.timeline || []), ...(incoming.timeline || [])]
    };
  };

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: EvidenceFile[] = [];
    const fileArray: File[] = Array.from(selectedFiles);

    for (const file of fileArray) {
      // Validate file type
      if (!file.type.match(/^(image\/(png|jpeg|jpg|gif|webp)|application\/pdf)$/)) {
        setError(`${file.name} is not a supported file type. Please use PDF or images.`);
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      newFiles.push({
        name: file.name,
        type: file.type,
        data: base64
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
    setError(null);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a file
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle send message
  const handleSend = async (override?: { text?: string; files?: EvidenceFile[] }) => {
    if (isAnalyzing) return;

    const textToSend = override?.text ?? inputText;
    const filesToSend = override?.files ?? files;
    if (!textToSend.trim() && filesToSend.length === 0) return;

    setIsAnalyzing(true);
    setLoadingStage('Processing...');
    setExtractionStages({ documents: 'pending', debtor: 'pending', invoice: 'pending', timeline: 'pending' });
    setError(null);

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: textToSend || (filesToSend.length > 0 ? `[Uploaded ${filesToSend.length} file(s)]` : ''),
      timestamp: Date.now(),
      attachments: filesToSend.length > 0 ? [...filesToSend] : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input and accumulate files
    const currentInput = textToSend;
    const currentFiles = [...filesToSend];
    setInputText('');
    setFiles([]);
    // Track all uploaded files for evidence attachment
    if (currentFiles.length > 0) {
      setAllUploadedFiles(prev => [...prev, ...currentFiles]);
    }

    try {
      // Convert messages to format expected by analyzeClaimInput
      const previousMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Update extraction stages based on what we're processing
      if (currentFiles.length > 0) {
        setExtractionStages(prev => ({ ...prev, documents: 'active' }));
      }
      setExtractionStages(prev => ({ ...prev, debtor: 'active' }));

      // Call AI to analyze
      const result: ClaimIntakeResult = await analyzeClaimInput(
        currentInput,
        currentFiles,
        previousMessages
      );

      // Update extraction stages based on what data was returned
      if (result.extractedData) {
        if (currentFiles.length > 0) {
          setExtractionStages(prev => ({ ...prev, documents: 'done' }));
        }
        setExtractionStages(prev => ({ ...prev, invoice: 'active' }));
        await new Promise(resolve => setTimeout(resolve, 200));

        if (result.extractedData.defendant) {
          setExtractionStages(prev => ({ ...prev, debtor: 'done' }));
        }
        if (result.extractedData.invoice) {
          setExtractionStages(prev => ({ ...prev, invoice: 'done' }));
        }
        if (result.extractedData.timeline && result.extractedData.timeline.length > 0) {
          setExtractionStages(prev => ({ ...prev, timeline: 'done' }));
        }
      }

      // TWO-PHASE EXTRACTION FLOW (see ClaimIntakeResult docs in types.ts):
      // Phase 1: readyToExtract controls whether we merge extracted data
      //   - false: AI needs clarification (ambiguous data) - don't merge yet
      //   - true:  Data is unambiguous - safe to merge into state
      // Phase 2: readyToProceed controls whether user can proceed to wizard
      //   - false: Missing required fields - keep asking questions
      //   - true:  Minimum viable data collected - show "Continue" button
      let nextExtractedData: Partial<ClaimState> | null = extractedData;
      if (result.readyToExtract !== false) {
        // Track newly extracted fields for preview panel highlighting
        const newFields: string[] = [];
        const newData = result.extractedData;
        if (newData?.defendant) {
          Object.keys(newData.defendant).forEach(k => {
            if (newData.defendant?.[k as keyof typeof newData.defendant]) {
              newFields.push(`defendant.${k}`);
            }
          });
        }
        if (newData?.invoice) {
          Object.keys(newData.invoice).forEach(k => {
            if (newData.invoice?.[k as keyof typeof newData.invoice]) {
              newFields.push(`invoice.${k}`);
            }
          });
        }
        if (newData?.timeline && newData.timeline.length > 0) {
          newData.timeline.forEach((_, idx) => newFields.push(`timeline.${idx}`));
        }
        setNewlyExtractedFields(newFields);

        // Expand preview panel when we have new data
        if (newFields.length > 0) {
          setPreviewPanelCollapsed(false);
        }

        nextExtractedData = mergeExtractedData(extractedData, result.extractedData);
        setExtractedData(nextExtractedData);
      }
      // If readyToExtract is false, don't update extractedData - wait for user to answer clarifying questions

      // Apply any corrections detected in user message
      if (result.corrections && result.corrections.length > 0) {
        console.log('[ConversationEntry] Corrections detected:', result.corrections);
        nextExtractedData = applyCorrections(nextExtractedData, result.corrections);
        setExtractedData(nextExtractedData);
        setAppliedCorrections(prev => [...prev, ...result.corrections]);

        // Add corrected fields to newly extracted fields for preview highlighting
        const correctedFields = result.corrections.map(c => c.field);
        setNewlyExtractedFields(prev => [...new Set([...prev, ...correctedFields])]);

        // Expand preview panel to show the correction
        setPreviewPanelCollapsed(false);
      }

      // Build AI response
      let aiContent = result.acknowledgment;

      // Add follow-up questions if:
      // 1. Not ready to extract (two-phase: needs clarification before extracting), OR
      // 2. Not ready to proceed (needs more info after extraction)
      if ((result.readyToExtract === false || !result.readyToProceed) &&
          result.followUpQuestions && result.followUpQuestions.length > 0) {
        aiContent += '\n\n' + result.followUpQuestions.join('\n');
      }

      // Add AI message
      const aiMessage: ConversationMessage = {
        role: 'assistant',  // Standardized role name
        content: aiContent,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update state
      setReadyToProceed(result.readyToProceed || false);
      setLastAcknowledgment(result.acknowledgment);

      // Store validation warnings
      // Check both claimant (from profile) and defendant (from extraction) counties
      const claimantCountyMissing = !userProfile?.businessAddress?.county;
      const defendantCountyMissing = result.countyMissing;

      setValidationWarnings({
        currencyWarning: result.currencyWarning,
        countyMissing: claimantCountyMissing || defendantCountyMissing, // Either party missing = true
        claimantCountyMissing,
        defendantCountyMissing,
        limitationWarning: result.limitationWarning,
        debtAgeYears: result.debtAgeYears,
        exceedsSmallClaims: result.exceedsSmallClaims,
        dateError: result.dateError
      });

      // If ready to proceed, get document recommendation
      if (result.readyToProceed && nextExtractedData) {
        const messagesForRecommendation = [...messages, userMessage, aiMessage];
        const evidenceForRecommendation = currentFiles.length > 0
          ? [...allUploadedFiles, ...currentFiles]
          : allUploadedFiles;
        getDocumentRecommendation(messagesForRecommendation, nextExtractedData, evidenceForRecommendation);
      }

    } catch (err: any) {
      console.error('Analysis error:', err);

      // Store failed input for retry
      setLastFailedInput({ text: currentInput, files: currentFiles });

      // Provide specific error messages based on error type
      let errorMsg = 'Something went wrong. Please try again.';
      if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        errorMsg = 'Network error - please check your connection and try again.';
      } else if (err?.message?.includes('timeout')) {
        errorMsg = 'Request timed out - the AI service is busy. Please try again.';
      } else if (err?.message?.includes('rate') || err?.message?.includes('limit')) {
        errorMsg = 'Too many requests - please wait a moment and try again.';
      } else if (err?.message?.includes('API') || err?.message?.includes('service')) {
        errorMsg = 'AI service temporarily unavailable. Please try again shortly.';
      }
      setError(errorMsg);

      // Add error message to conversation
      const errorMessage: ConversationMessage = {
        role: 'assistant',  // Standardized role name
        content: "I'm sorry, I had trouble processing that. You can try again using the retry button below.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle retry after error
  const handleRetry = () => {
    if (!lastFailedInput) return;
    setError(null);
    const retryPayload = { ...lastFailedInput };
    setLastFailedInput(null);
    handleSend({ text: retryPayload.text, files: retryPayload.files });
  };

  // Get document recommendation based on chat history
  const getDocumentRecommendation = async (
    msgs: ConversationMessage[],
    data: Partial<ClaimState>,
    evidenceFiles: EvidenceFile[]
  ) => {
    if (!data) return;

    setIsGettingRecommendation(true);
    try {
      // Convert ConversationMessage[] to ChatMessage[] for extractDataFromChat
      const chatHistory: ChatMessage[] = buildChatHistory(msgs);

      // Build a minimal ClaimState for extractDataFromChat
      const currentData: ClaimState = {
        id: '',
        claimant: data.claimant || { name: '', address: '', city: '', county: '', postcode: '' },
        defendant: data.defendant || { name: '', address: '', city: '', county: '', postcode: '' },
        invoice: data.invoice || { invoiceNumber: '', totalAmount: 0, dateIssued: '', currency: 'GBP' },
        timeline: data.timeline || [],
        interest: { totalInterest: 0, dailyRate: 0, daysOverdue: 0 },
        compensation: 0,
        courtFee: 0,
        evidence: evidenceFiles,
        chatHistory: chatHistory,
        source: 'upload'
      } as ClaimState;

      const result = await extractDataFromChat(chatHistory, currentData);

      if (result.recommendedDocument) {
        setRecommendedDocument(result.recommendedDocument);
        setDocumentReason(result.documentReason || null);
      }
    } catch (err) {
      console.error('Failed to get document recommendation:', err);
      // Default to LBA if recommendation fails
      setRecommendedDocument('Letter Before Action');
      setDocumentReason('We recommend starting with a Letter Before Action as required by the Pre-Action Protocol.');
    } finally {
      setIsGettingRecommendation(false);
    }
  };

  // Helper to check if two string values differ meaningfully
  const valuesDiffer = (a?: string, b?: string): boolean => {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return a.trim().toLowerCase() !== b.trim().toLowerCase();
  };

  // Check if extracted claimant data conflicts with profile data
  const hasClaimantConflict = (profileParty: Party, chatClaimant: Partial<Party>): boolean => {
    // Only check if chat actually has claimant data
    if (!chatClaimant.name && !chatClaimant.address) return false;

    // Check for meaningful differences in key fields
    const nameDiffers = valuesDiffer(profileParty.name, chatClaimant.name);
    const addressDiffers = valuesDiffer(profileParty.address, chatClaimant.address);
    const cityDiffers = valuesDiffer(profileParty.city, chatClaimant.city);
    const postcodeDiffers = valuesDiffer(profileParty.postcode, chatClaimant.postcode);

    return nameDiffers || addressDiffers || cityDiffers || postcodeDiffers;
  };

  // Complete the wizard transition with selected claimant data
  const completeWithClaimant = (claimantData: Party) => {
    if (!extractedData) return;

    const finalData = { ...extractedData };
    // Ensure claimant is properly set (from user profile, not extracted)
    finalData.claimant = claimantData;

    // Attach all uploaded evidence files to the claim
    if (allUploadedFiles.length > 0) {
      finalData.evidence = allUploadedFiles;
    }

    // Include recommended document type with comprehensive mapping
    if (recommendedDocument) {
      const docTypeMap: Record<string, DocumentType> = {
        // Primary names
        'Letter Before Action': DocumentType.LBA,
        'Form N1 (Claim Form)': DocumentType.FORM_N1,
        'Polite Payment Reminder': DocumentType.POLITE_CHASER,
        'Part 36 Settlement Offer': DocumentType.PART_36_OFFER,
        'Installment Agreement': DocumentType.INSTALLMENT_AGREEMENT,
        'Installment Payment Agreement': DocumentType.INSTALLMENT_AGREEMENT,
        'Form N225 (Default Judgment)': DocumentType.DEFAULT_JUDGMENT,
        'Default Judgment': DocumentType.DEFAULT_JUDGMENT,
        // Common variations
        'LBA': DocumentType.LBA,
        'N1': DocumentType.FORM_N1,
        'Form N1': DocumentType.FORM_N1,
        'Claim Form': DocumentType.FORM_N1,
        'Payment Reminder': DocumentType.POLITE_CHASER,
        'Reminder': DocumentType.POLITE_CHASER,
        'Part 36': DocumentType.PART_36_OFFER,
        'Settlement Offer': DocumentType.PART_36_OFFER,
        'N225': DocumentType.DEFAULT_JUDGMENT,
        'Form N225': DocumentType.DEFAULT_JUDGMENT
      };

      // Normalize the recommended document for lookup (trim and case-insensitive matching)
      const normalizedRecommendation = recommendedDocument.trim();
      const matchedDocType = docTypeMap[normalizedRecommendation] ||
        Object.entries(docTypeMap).find(([key]) =>
          key.toLowerCase() === normalizedRecommendation.toLowerCase()
        )?.[1];

      if (matchedDocType) {
        finalData.selectedDocType = matchedDocType;
      } else {
        // Log unrecognized document type for debugging but fallback to LBA
        console.warn(`[ConversationEntry] Unrecognized document type: "${recommendedDocument}", defaulting to LBA`);
        finalData.selectedDocType = DocumentType.LBA;
      }
    }

    setShowConflictModal(false);
    onComplete(finalData, messages);
  };

  // Handle continue to wizard
  const handleContinue = () => {
    if (!extractedData) return;

    // CRITICAL FIX: Always use profile data for claimant (logged-in user)
    // The claimant is ALWAYS the logged-in user's company, never extracted from documents
    const profileClaimant = userProfile ? profileToClaimantParty(userProfile) : null;

    if (!profileClaimant) {
      console.error('[ConversationEntry] No user profile available - cannot proceed');
      setError('User profile not found. Please complete onboarding first.');
      return;
    }

    // Use profile data for claimant (ignore any AI-extracted claimant data)
    completeWithClaimant(profileClaimant);
  };

  // Handle user selecting profile data from conflict modal
  const handleSelectProfileData = () => {
    if (profilePartyData) {
      completeWithClaimant(profilePartyData);
    }
  };

  // Handle user selecting chat data from conflict modal
  const handleSelectChatData = () => {
    if (chatPartyData) {
      completeWithClaimant(chatPartyData);
    }
  };

  // Get user's name for greeting
  const userName = userProfile?.businessName || '';

  // Extraction progress side panel component
  const ExtractionProgressPanel = () => {
    if (!isAnalyzing) return null;

    const stages = [
      { key: 'documents', label: 'Scanning Documents', icon: FileText, show: files.length > 0 || allUploadedFiles.length > 0 },
      { key: 'debtor', label: 'Debtor Details', icon: User, show: true },
      { key: 'invoice', label: 'Invoice & Amounts', icon: FileText, show: true },
      { key: 'timeline', label: 'Key Dates', icon: Calendar, show: true },
    ];

    const getStatusIcon = (status: 'pending' | 'active' | 'done') => {
      if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
      if (status === 'active') return <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />;
      return <div className="w-4 h-4 rounded-full border-2 border-slate-200" />;
    };

    return (
      <div className="w-56 flex-shrink-0 border-l border-slate-200 bg-slate-50/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-semibold text-slate-700">Extracting</span>
        </div>
        <div className="space-y-3">
          {stages.filter(s => s.show).map((stage) => {
            const status = extractionStages[stage.key as keyof typeof extractionStages];
            const StageIcon = stage.icon;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                {getStatusIcon(status)}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StageIcon className={`w-3.5 h-3.5 ${status === 'done' ? 'text-teal-500' : status === 'active' ? 'text-teal-500' : 'text-slate-400'}`} />
                  <span className={`text-xs truncate ${status === 'done' ? 'text-slate-700' : status === 'active' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {/* Header - compact, only show when no messages */}
          {messages.length === 0 && (
            <div className="py-4 px-4 text-center flex-shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 mb-3 shadow-lg shadow-teal-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-display font-bold text-slate-900 mb-1">
                {getGreeting()}{userName ? `, ${userName}` : ''}
              </h1>
              <p className="text-slate-500 text-sm">
                Let's recover what you're owed
              </p>
            </div>
          )}

        {/* Main Content - positioned at top, not centered */}
        <div className={`flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 ${messages.length === 0 ? 'pt-2' : 'pb-2'}`}>
          {/* Initial Options (shown when no messages yet) */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center space-y-4 py-4 w-full">
              {/* Explanation Card */}
              <div className="bg-teal-50/30 border border-slate-200 border-l-4 border-l-teal-500 rounded-xl p-4 w-full max-w-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">How this works</h3>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Start your claim in two ways: upload your invoice/contract for AI extraction, or describe your situation in plain language. I'll ask follow-up questions if needed, then guide you through verification and document generation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Single Upload Button - typing is done in the chat input below */}
              <Tooltip content="Upload invoices, contracts, or emails. AI will extract debtor details, amounts, and dates automatically." position="top">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-xl transition-all group w-full max-w-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                    <Upload className="w-5 h-5 text-teal-500" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-slate-900 text-sm">Upload Documents</p>
                      <HelpCircle className="w-3 h-3 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500">AI extracts claim details automatically</p>
                  </div>
                </button>
              </Tooltip>

              <div className="mt-4 w-full max-w-lg">
                <p className="text-xs text-slate-500 font-medium mb-2">Try something like:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => setInputText("I'm owed £5,000 for unpaid invoices from a client who hasn't paid for 3 months")}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    "I'm owed £5,000 for unpaid invoices..."
                  </button>
                  <button
                    onClick={() => setInputText("A customer hasn't paid for web design work completed 60 days ago")}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    "A customer hasn't paid for 60 days..."
                  </button>
                  <button
                    onClick={() => setInputText("I need to chase a debt from XYZ Ltd for £3,500")}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-teal-400 hover:text-teal-700 transition-colors"
                  >
                    "I need to chase a debt from XYZ Ltd..."
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4">
                Or type your own description in the chat below ↓
              </p>

              {onSkipToWizard && (
                <Tooltip content="Use a traditional step-by-step form instead of conversational AI intake" position="bottom">
                  <button
                    onClick={onSkipToWizard}
                    className="text-slate-500 hover:text-slate-700 text-xs flex items-center gap-1 transition-colors"
                  >
                    Prefer step-by-step? Use the guided wizard
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </Tooltip>
              )}
            </div>
          )}

          {/* Conversation Messages */}
          {messages.length > 0 && (
            <div className="space-y-3 mb-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((file, fileIdx) => (
                          <Tooltip key={fileIdx} content={file.name} position="top">
                            <div className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded text-xs">
                              <FileText className="w-3 h-3" />
                              <span className="truncate max-w-[100px]">{file.name}</span>
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content.split('\n').map((line, lineIdx) => (
                        <p key={lineIdx} className={lineIdx > 0 ? 'mt-1' : ''}>
                          {renderFormattedText(line)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                      <span className="text-slate-600 text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Ready to proceed card */}
          {readyToProceed && extractedData && (
            <div className="mb-2 p-3 bg-teal-50/30 border border-slate-200 border-l-4 border-l-teal-500 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Ready to verify details</p>
                  <p className="text-xs text-slate-600">Review what I've extracted</p>
                </div>
              </div>

              {(validationWarnings.limitationWarning || validationWarnings.exceedsSmallClaims || validationWarnings.claimantCountyMissing || validationWarnings.defendantCountyMissing) && (
                <div className="bg-amber-50/30 border border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-2 mb-3 space-y-1">
                  <div className="flex items-center gap-1 text-amber-700 font-medium text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Warnings</span>
                  </div>
                  {validationWarnings.limitationWarning && (
                    <p className="text-xs text-amber-800">
                      Debt is {validationWarnings.debtAgeYears ? `${validationWarnings.debtAgeYears}+` : '5+'} years old (6-year limit)
                    </p>
                  )}
                  {validationWarnings.exceedsSmallClaims && (
                    <p className="text-xs text-amber-800">May exceed £10,000 Small Claims limit</p>
                  )}
                  {validationWarnings.claimantCountyMissing && (
                    <p className="text-xs text-amber-800">Your business county is missing - update your profile settings</p>
                  )}
                  {validationWarnings.defendantCountyMissing && (
                    <p className="text-xs text-amber-800">Defendant county is missing for court forms</p>
                  )}
                </div>
              )}

              <div className="bg-white rounded-lg p-2 mb-3 space-y-1 border border-slate-200 text-xs">
                {extractedData.defendant?.name && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal-500" />
                    <span className="text-slate-500">Defendant:</span>
                    <span className="text-slate-900 font-medium">{extractedData.defendant.name}</span>
                  </div>
                )}
                {extractedData.invoice?.totalAmount && extractedData.invoice.totalAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal-500" />
                    <span className="text-slate-500">Amount:</span>
                    <span className="text-slate-900 font-medium">{getCurrencySymbol(extractedData.invoice?.currency)}{extractedData.invoice.totalAmount.toLocaleString()}</span>
                  </div>
                )}
                {extractedData.invoice?.invoiceNumber && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal-500" />
                    <span className="text-slate-500">Invoice:</span>
                    <span className="text-slate-900 font-medium">{extractedData.invoice.invoiceNumber}</span>
                  </div>
                )}
              </div>

              {isGettingRecommendation ? (
                <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 mb-3 flex items-center gap-3">
                  <div className="relative">
                    <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                    <div className="absolute inset-0 w-4 h-4 bg-teal-500/20 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <span className="text-slate-700 text-xs font-medium block">Determining next steps...</span>
                    <span className="text-slate-500 text-xs">Analyzing your claim status</span>
                  </div>
                </div>
              ) : recommendedDocument && (
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-slate-900 text-sm">Recommended: {recommendedDocument}</span>
                  </div>
                  {documentReason && (
                    <p className="text-xs text-slate-600">{documentReason}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleContinue}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  disabled={isGettingRecommendation}
                  size="sm"
                >
                  {isGettingRecommendation ? 'Please wait...' : 'Continue'}
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-2 p-3 bg-red-50/30 border border-slate-200 border-l-4 border-l-red-500 rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={() => { setError(null); setLastFailedInput(null); }}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {lastFailedInput && (
                <button
                  onClick={handleRetry}
                  className="mt-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input Area at Bottom - Made more prominent */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {files.map((file, idx) => (
                <Tooltip key={idx} content={file.name} position="top">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm">
                    <FileText className="w-4 h-4 text-teal-500" />
                    <span className="text-slate-700 truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </Tooltip>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Describe your claim or upload evidence..."
              className="flex-1 bg-slate-50 text-gray-900 placeholder-slate-400 resize-none outline-none text-base min-h-[48px] max-h-[120px] px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              rows={2}
              disabled={isAnalyzing}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="p-3 text-slate-400 hover:text-teal-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              title="Attach file"
            >
              <Upload className="w-5 h-5" />
            </button>

            <button
              onClick={handleSend}
              disabled={isAnalyzing || (!inputText.trim() && files.length === 0)}
              className="p-3 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-colors"
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {messages.length > 0 && !readyToProceed && onSkipToWizard && (
            <div className="text-center mt-3">
              <button
                onClick={onSkipToWizard}
                className="text-slate-500 hover:text-slate-700 text-sm transition-colors"
              >
                Continue with manual entry →
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      </div>

      {/* Right Sidebar - Extracted Data & Progress */}
      <div className="w-72 flex-shrink-0 border-l border-slate-200 bg-slate-50/50 flex flex-col hidden lg:flex">
        {/* Extraction Progress - shows during analysis */}
        {isAnalyzing && (
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-semibold text-slate-700">Extracting</span>
            </div>
            <div className="space-y-3">
              {[
                { key: 'documents', label: 'Scanning Documents', icon: FileText, show: files.length > 0 || allUploadedFiles.length > 0 },
                { key: 'debtor', label: 'Debtor Details', icon: User, show: true },
                { key: 'invoice', label: 'Invoice & Amounts', icon: FileText, show: true },
                { key: 'timeline', label: 'Key Dates', icon: Calendar, show: true },
              ].filter(s => s.show).map((stage) => {
                const status = extractionStages[stage.key as keyof typeof extractionStages];
                const StageIcon = stage.icon;
                const getStatusIcon = (status: 'pending' | 'active' | 'done') => {
                  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
                  if (status === 'active') return <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />;
                  return <div className="w-4 h-4 rounded-full border-2 border-slate-200" />;
                };
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <StageIcon className={`w-3.5 h-3.5 ${status === 'done' ? 'text-teal-500' : status === 'active' ? 'text-teal-500' : 'text-slate-400'}`} />
                      <span className={`text-xs truncate ${status === 'done' ? 'text-slate-700' : status === 'active' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {stage.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extracted Data Panel - always visible when data exists */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Extracted Data</span>
          </div>

          {!extractedData && messages.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">
              Upload documents or describe your claim to see extracted data here
            </p>
          )}

          {extractedData && (
            <DataPreviewPanel
              data={extractedData}
              newlyExtractedFields={newlyExtractedFields}
              collapsed={false}
              onCollapseChange={() => {}}
            />
          )}
        </div>
      </div>

      {/* Data Conflict Modal */}
      {profilePartyData && chatPartyData && (
        <DataConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          profileData={profilePartyData}
          chatData={chatPartyData}
          onSelectProfile={handleSelectProfileData}
          onSelectChat={handleSelectChatData}
        />
      )}
    </div>
  );
};
