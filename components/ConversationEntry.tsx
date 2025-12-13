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

interface ConversationEntryProps {
  userProfile: UserProfile | null;
  onComplete: (extractedData: Partial<ClaimState>) => void;
  onSkipToWizard: () => void;
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
  onComplete,
  onSkipToWizard
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
        if (!prev) return result.extractedData;
        return {
          ...prev,
          ...result.extractedData,
          // Deep merge for nested objects
          defendant: { ...prev.defendant, ...result.extractedData.defendant },
          claimant: { ...prev.claimant, ...result.extractedData.claimant },
          invoice: { ...prev.invoice, ...result.extractedData.invoice },
          timeline: [...(prev.timeline || []), ...(result.extractedData.timeline || [])]
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

    onComplete(finalData);
  };

  // Get user's name for greeting
  const userName = userProfile?.businessName || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 mb-6 shadow-lg shadow-teal-500/25">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          I'm your legal assistant. Let's recover what you're owed.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pb-4 min-h-0">
        {/* Initial Options (shown when no messages yet) */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-6">
            {/* Two main buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-3 p-6 bg-dark-700/50 hover:bg-dark-700 border-2 border-dashed border-dark-500 hover:border-teal-500 rounded-2xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <Upload className="w-6 h-6 text-teal-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Upload Evidence</p>
                  <p className="text-sm text-slate-400">Invoice or contract</p>
                </div>
              </button>

              <button
                onClick={() => textareaRef.current?.focus()}
                className="flex-1 flex items-center justify-center gap-3 p-6 bg-dark-700/50 hover:bg-dark-700 border-2 border-dashed border-dark-500 hover:border-teal-500 rounded-2xl transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <MessageSquare className="w-6 h-6 text-teal-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Describe Claim</p>
                  <p className="text-sm text-slate-400">Tell me what happened</p>
                </div>
              </button>
            </div>

            {/* Skip to wizard link */}
            <button
              onClick={onSkipToWizard}
              className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 transition-colors"
            >
              Prefer step-by-step? Use the guided wizard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Conversation Area (shown when messages exist) */}
        {messages.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 min-h-0">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-dark-700 text-slate-200 border border-dark-600'
                  }`}
                >
                  {/* Show attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((file, fileIdx) => (
                        <div
                          key={fileIdx}
                          className="flex items-center gap-1 px-2 py-1 bg-black/20 rounded text-xs"
                        >
                          <FileText className="w-3 h-3" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Message content with markdown-like formatting */}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content.split('\n').map((line, lineIdx) => {
                      // Handle bold text
                      const formattedLine = line.replace(
                        /\*\*(.*?)\*\*/g,
                        '<strong class="font-semibold">$1</strong>'
                      );
                      return (
                        <p
                          key={lineIdx}
                          className={lineIdx > 0 ? 'mt-1' : ''}
                          dangerouslySetInnerHTML={{ __html: formattedLine }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="bg-dark-700 border border-dark-600 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                  <span className="text-slate-400 text-sm">Analyzing...</span>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Ready to proceed card */}
        {readyToProceed && extractedData && (
          <div className="mb-4 p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Ready to verify details</p>
                  <p className="text-sm text-slate-400">I've gathered the key information</p>
                </div>
              </div>
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-teal-500/25"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
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
        <div className="flex-shrink-0 bg-dark-800/50 backdrop-blur-sm border border-dark-600 rounded-2xl p-3">
          {/* File chips */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-dark-600">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 rounded-lg text-sm"
                >
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span className="text-slate-300 truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input and buttons */}
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tell me what happened... (e.g., 'ABC Ltd owes me £5,000 for unpaid invoices')"
              className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none outline-none text-sm min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isAnalyzing}
            />

            <div className="flex items-center gap-2">
              {/* File upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="p-2.5 text-slate-400 hover:text-teal-400 hover:bg-dark-700 rounded-xl transition-colors disabled:opacity-50"
                title="Attach file"
              >
                <Upload className="w-5 h-5" />
              </button>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={isAnalyzing || (!inputText.trim() && files.length === 0)}
                className="p-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-dark-600 disabled:text-slate-500 text-white rounded-xl transition-colors"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
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
              onClick={onSkipToWizard}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              Continue anyway with manual entry →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
