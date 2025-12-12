/**
 * ConversationEntry Component
 *
 * Garfield-style conversation entry point for new claims.
 * Users can upload evidence or describe their claim in natural language.
 * AI extracts data and asks brief follow-up questions if needed.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, Send, X, Loader2, ArrowRight, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { analyzeClaimInput } from '../services/geminiService';
import { ClaimState, EvidenceFile, UserProfile, ClaimIntakeResult, ConversationMessage } from '../types';
import { profileToClaimantParty } from '../services/userProfileService';
import { Button } from './ui/Button';

interface ConversationEntryProps {
  userProfile: UserProfile | null;
  onComplete: (extractedData: Partial<ClaimState>, messages: ConversationMessage[]) => void;
}

// Helper to get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const ConversationEntry: React.FC<ConversationEntryProps> = ({
  userProfile,
  onComplete
}) => {
  // State
  const [files, setFiles] = useState<EvidenceFile[]>([]); // Current batch of files to upload
  const [allUploadedFiles, setAllUploadedFiles] = useState<EvidenceFile[]>([]); // All files uploaded during conversation
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<ClaimState> | null>(null);
  const [readyToProceed, setReadyToProceed] = useState(false);
  const [lastAcknowledgment, setLastAcknowledgment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;

    const update = () => {
      prefersReducedMotionRef.current = mq.matches;
    };

    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth'
    });
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
  const handleSend = async () => {
    if (!inputText.trim() && files.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: inputText || (files.length > 0 ? `[Uploaded ${files.length} file(s)]` : ''),
      timestamp: Date.now(),
      attachments: files.length > 0 ? [...files] : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    // Clear input and accumulate files
    const currentInput = inputText;
    const currentFiles = [...files];
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

      // Call AI to analyze
      const result: ClaimIntakeResult = await analyzeClaimInput(
        currentInput,
        currentFiles,
        previousMessages
      );

      // Merge extracted data with any previous extractions
      setExtractedData(prev => {
        if (!prev) return {
          ...result.extractedData,
          // Store LBA and communication tracking fields
          lbaSentDate: result.lbaSentDate,
          priorCommunications: result.priorCommunications,
          hasContract: result.hasContract,
          hasProofOfDelivery: result.hasProofOfDelivery
        };
        return {
          ...prev,
          ...result.extractedData,
          // Deep merge for nested objects
          defendant: { ...prev.defendant, ...result.extractedData.defendant },
          claimant: { ...prev.claimant, ...result.extractedData.claimant },
          invoice: { ...prev.invoice, ...result.extractedData.invoice },
          timeline: [...(prev.timeline || []), ...(result.extractedData.timeline || [])],
          // Preserve or update LBA tracking fields
          lbaSentDate: result.lbaSentDate || prev.lbaSentDate,
          priorCommunications: result.priorCommunications !== 'unknown' ? result.priorCommunications : prev.priorCommunications,
          hasContract: result.hasContract ?? prev.hasContract,
          hasProofOfDelivery: result.hasProofOfDelivery ?? prev.hasProofOfDelivery
        };
      });

      // Build AI response
      let aiContent = result.acknowledgment;

      // Add follow-up questions if not ready
      if (!result.readyToProceed && result.followUpQuestions && result.followUpQuestions.length > 0) {
        aiContent += '\n\n' + result.followUpQuestions.join('\n');
      }

      // Add AI message
      const aiMessage: ConversationMessage = {
        role: 'ai',
        content: aiContent,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Update state
      setReadyToProceed(result.readyToProceed);
      setLastAcknowledgment(result.acknowledgment);

    } catch (err) {
      console.error('Analysis error:', err);
      setError('Something went wrong. Please try again.');

      // Add error message
      const errorMessage: ConversationMessage = {
        role: 'ai',
        content: "I'm sorry, I had trouble processing that. Could you try again or describe your claim differently?",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle continue to wizard
  const handleContinue = () => {
    if (!extractedData) return;

    // Merge with user profile claimant data if available
    const finalData = { ...extractedData };
    if (userProfile) {
      const profileClaimant = profileToClaimantParty(userProfile);
      finalData.claimant = {
        ...profileClaimant,
        ...finalData.claimant
      };
    }

    // Attach all uploaded evidence files to the claim
    if (allUploadedFiles.length > 0) {
      finalData.evidence = allUploadedFiles;
    }

    onComplete(finalData, messages);
  };

  // Get user's name for greeting
  const userName = userProfile?.businessName || '';

  // Safe text renderer: handles **bold** markdown and newlines without dangerouslySetInnerHTML
  const renderSafeText = (text: string) => {
    // Split by both bold markers and newlines to handle all formatting
    const parts = text.split(/(\*\*[^*]+\*\*|\n)/g).filter(Boolean);
    return parts.map((part, i) => {
      // Handle newlines as <br/> elements
      if (part === '\n') {
        return <br key={i} />;
      }
      // Handle bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Plain text - render safely without innerHTML
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 mb-4 shadow-lg shadow-teal-500/25">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          I'm your legal assistant. Let's recover what you're owed.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-6 pb-6 pt-2">
        {/* Initial Options (shown when no messages yet) */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-start pt-4 space-y-5">
            {/* Two main buttons */}
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-4 p-6 bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl transition-all duration-300 group shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <Upload className="w-6 h-6 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Upload Evidence</p>
                  <p className="text-sm text-slate-500">Invoice or contract</p>
                </div>
              </button>

              <button
                onClick={() => textareaRef.current?.focus()}
                className="flex-1 flex items-center justify-center gap-4 p-6 bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl transition-all duration-300 group shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <MessageSquare className="w-6 h-6 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900">Describe Claim</p>
                  <p className="text-sm text-slate-500">Tell me what happened</p>
                </div>
              </button>
            </div>

            {/* Skip to wizard link */}
            <button
              onClick={() => {
                // Pass empty data when skipping from initial state
                onComplete({}, []);
              }}
              className="text-slate-500 hover:text-teal-600 text-sm flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-md px-1.5 py-1"
            >
              Prefer step-by-step? Use the guided wizard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Conversation Area (shown when messages exist) */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-6 py-4 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {/* Show attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((file, fileIdx) => (
                        <div
                          key={fileIdx}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            msg.role === 'user' ? 'bg-teal-500/30' : 'bg-slate-100'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Message content with safe markdown-like formatting */}
                  <div className="text-sm leading-relaxed">
                    {renderSafeText(msg.content)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                  <span className="text-slate-500 text-sm">Analyzing...</span>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Ready to proceed card */}
        {readyToProceed && extractedData && (
          <div className="mb-6 p-5 bg-teal-50 border border-teal-200 rounded-2xl animate-bounce-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ready to verify details</p>
                  <p className="text-sm text-slate-500">I've gathered the key information</p>
                </div>
              </div>
              <Button
                onClick={handleContinue}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="px-8"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          {/* File chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-200">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm"
                >
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="text-slate-700 truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    aria-label={`Remove file ${file.name}`}
                    className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input and buttons */}
          <div className="flex items-end gap-4">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tell me what happened... (e.g., 'ABC Ltd owes me £5,000 for unpaid invoices')"
              className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 resize-none outline-none text-sm min-h-[56px] max-h-[160px]"
              rows={1}
              disabled={isAnalyzing}
            />

            <div className="flex items-center gap-2">
              {/* File upload button */}
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                aria-label="Attach file"
                title="Attach file"
                variant="ghost"
                size="sm"
                icon={<Upload className="w-5 h-5" />}
                iconOnly
                className="p-2.5"
              />

              {/* Send button */}
              <Button
                type="button"
                onClick={handleSend}
                disabled={isAnalyzing || (!inputText.trim() && files.length === 0)}
                aria-label="Send message"
                title="Send"
                variant="primary"
                size="sm"
                isLoading={isAnalyzing}
                icon={!isAnalyzing ? <Send className="w-5 h-5" /> : undefined}
                iconOnly
                className="p-2.5 shadow-sm hover:shadow-sm hover:translate-y-0"
              />
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Skip to wizard link (shown when in conversation) */}
        {messages.length > 0 && !readyToProceed && (
          <div className="text-center mt-4">
            <button
              onClick={() => {
                // Pass partial data even when AI hasn't finished
                const partialData: Partial<ClaimState> = { ...extractedData };

                // Merge with user profile claimant data if available
                if (userProfile) {
                  const profileClaimant = profileToClaimantParty(userProfile);
                  partialData.claimant = {
                    ...profileClaimant,
                    ...partialData.claimant
                  };
                }

                // Attach all uploaded evidence files
                if (allUploadedFiles.length > 0) {
                  partialData.evidence = allUploadedFiles;
                }

                onComplete(partialData, messages);
              }}
              className="text-slate-500 hover:text-teal-600 text-sm transition-colors"
            >
              Continue anyway with manual entry →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
