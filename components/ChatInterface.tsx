import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, User, Scale, ArrowRight, Loader2, CheckCircle2, Briefcase, Gavel, Sparkles, AlertTriangle } from 'lucide-react';
import { ChatSidebar } from './ChatSidebar';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onComplete: () => void;
  isThinking: boolean;
  canProceed?: boolean; // AI determines when enough info has been collected
  error?: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onComplete, isThinking, canProceed = false, error }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the latest progress from the last AI message
  const lastAiMessage = [...messages].reverse().find(m => m.role === 'ai');
  const progress = lastAiMessage?.collected || {
    claimantName: false,
    claimantAddress: false,
    defendantName: false,
    defendantAddress: false,
    invoiceDetails: false,
    timelineEvents: false
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking, error]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex h-[calc(100vh-140px)] gap-6">
       {/* Sidebar - Checklist */}
       <ChatSidebar progress={progress} />

       {/* Chat Container */}
       <div className="flex-grow flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="text-center py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-teal-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-teal-sm">
              <Gavel className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 font-display tracking-tight">AI Case Consultation</h2>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-slate-400">
            <Sparkles className="w-3 h-3 text-teal-500" />
            <span>Powered by Google Gemini AI</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-grow overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && !isThinking && !error && (
              <div className="text-center text-slate-400 italic mt-10 text-sm">
                Establishing secure link to AI legal assistant...
              </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isLastInGroup = index === messages.length - 1 || messages[index + 1].role !== msg.role;
            const showAvatar = isLastInGroup;

            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} ${!showAvatar ? (isUser ? 'mr-14' : 'ml-14') : ''}`}>
                {showAvatar && (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${isUser ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-teal-600 text-white border-teal-500 shadow-teal-sm'}`}>
                    {isUser ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isUser
                        ? 'bg-teal-50 text-slate-800 border border-teal-200 rounded-tr-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
                    }`}>
                    {msg.content}
                    </div>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="flex gap-4 ml-0">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-teal-sm">
                  <Briefcase className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 w-fit shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase mr-2 tracking-wide">Thinking</span>
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          )}

          {error && (
              <div className="flex gap-4 animate-fade-in">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-200">
                      <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="bg-red-50 border border-red-200 px-5 py-4 rounded-2xl rounded-tl-sm text-sm text-red-800 shadow-sm">
                      <p className="font-semibold mb-1">Connection Error</p>
                      {error}
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex-shrink-0">
          <form onSubmit={handleSend} className="relative flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer here..."
              className="flex-grow px-4 py-3.5 pr-14 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all duration-200 shadow-sm"
              disabled={isThinking}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="absolute right-2 top-2 bottom-2 bg-teal-600 hover:bg-teal-700 text-white px-4 rounded-lg disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-200 shadow-sm flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-3 flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Press Enter to send</span>
            
            <div className="flex items-center gap-3">
                {!canProceed && (
                      <span className="text-xs text-slate-400 italic">
                        Answer questions to proceed
                      </span>
                )}
                <button
                  onClick={onComplete}
                  disabled={!canProceed}
                  title={!canProceed ? "Please answer the assistant's questions first" : "Proceed to review"}
                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm ${
                      canProceed 
                      ? "text-white bg-teal-600 hover:bg-teal-700 btn-primary animate-fade-in" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Review Extracted Data <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
