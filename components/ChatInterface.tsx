import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, User, Scale, ArrowRight, Loader2, CheckCircle2, Briefcase, Gavel, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onComplete: () => void;
  isThinking: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, onComplete, isThinking }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in flex flex-col h-[calc(100vh-180px)]">
      <div className="text-center mb-6 flex-shrink-0">
        <div className="bg-emerald-600 text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-emerald-md">
          <Gavel className="w-6 h-6" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-display tracking-tight">AI Case Consultation</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Answer a few questions to strengthen your claim. The AI will identify gaps in your evidence and help ensure your case is complete.
        </p>
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Powered by Google Gemini AI</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto px-6 py-6 bg-white rounded-t-2xl border border-slate-200 shadow-sm space-y-6">
        {messages.length === 0 && !isThinking && (
             <div className="text-center text-slate-400 italic mt-10 text-sm">
               Establishing secure link to AI legal assistant...
             </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-sm'}`}>
               {msg.role === 'user' ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div className="flex flex-col max-w-[80%]">
                <span className={`text-[10px] font-semibold uppercase mb-1 tracking-wider ${msg.role === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-400'}`}>
                    {msg.role === 'user' ? 'Client' : 'Legal Assistant'}
                </span>
                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                    ? 'bg-emerald-50 text-slate-800 border border-emerald-200 rounded-tr-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-sm'
                }`}>
                {msg.content}
                </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-emerald-sm">
                <Briefcase className="w-5 h-5" />
             </div>
             <div className="bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 w-fit">
                <span className="text-xs font-semibold text-slate-500 uppercase mr-2 tracking-wide">Reviewing Evidence</span>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-2xl p-4 flex-shrink-0">
        <form onSubmit={handleSend} className="relative flex gap-2">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Answer clearly..."
             className="flex-grow px-4 py-3.5 pr-14 bg-white border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200"
             disabled={isThinking}
             autoFocus
           />
           <button
             type="submit"
             disabled={!input.trim() || isThinking}
             className="absolute right-2 top-2 bottom-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 rounded-lg disabled:bg-slate-200 disabled:text-slate-400 transition-all duration-200 shadow-sm flex items-center justify-center"
           >
             <Send className="w-4 h-4" />
           </button>
        </form>
        <div className="mt-4 flex justify-between items-center px-2">
           <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Press Enter to send</span>
           <button
             onClick={onComplete}
             className="flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-all duration-200 shadow-sm btn-primary"
           >
             Review Extracted Data <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
};
