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
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-glow">
          <Gavel className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white font-serif">AI Case Consultation</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Answer a few questions to strengthen your claim. The AI will identify gaps in your evidence and help ensure your case is complete.
        </p>
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
          <Sparkles className="w-3 h-3 text-violet-400" />
          <span>Powered by Google Gemini AI • Confidential</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto px-6 py-6 bg-dark-800 rounded-t-2xl border border-dark-600 shadow-dark-xl space-y-6 scrollbar-thin scrollbar-thumb-dark-600">
        {messages.length === 0 && !isThinking && (
             <div className="text-center text-slate-500 italic mt-10 text-sm">
               Establishing secure link to AI legal assistant...
             </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-dark-600 text-slate-300 border-dark-500' : 'bg-gradient-to-br from-violet-500 to-violet-600 text-white border-violet-500 shadow-glow-sm'}`}>
               {msg.role === 'user' ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div className="flex flex-col max-w-[80%]">
                <span className={`text-[10px] font-bold uppercase mb-1 ${msg.role === 'user' ? 'text-right text-slate-500' : 'text-left text-slate-500'}`}>
                    {msg.role === 'user' ? 'Client' : 'Legal Assistant'}
                </span>
                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                    ? 'bg-violet-500/20 text-slate-100 border border-violet-500/30 rounded-tr-sm'
                    : 'bg-dark-700 text-slate-200 border border-dark-600 rounded-tl-sm'
                }`}>
                {msg.content}
                </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-glow-sm">
                <Briefcase className="w-5 h-5" />
             </div>
             <div className="bg-dark-700 border border-dark-600 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 w-fit">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">Reviewing Evidence</span>
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-dark-700 border-x border-b border-dark-600 rounded-b-2xl p-4 flex-shrink-0">
        <form onSubmit={handleSend} className="relative flex gap-2">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Answer clearly..."
             className="flex-grow px-4 py-4 pr-14 bg-dark-800 border border-dark-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 text-sm"
             disabled={isThinking}
             autoFocus
           />
           <button
             type="submit"
             disabled={!input.trim() || isThinking}
             className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white px-4 rounded-lg hover:from-violet-500 hover:to-violet-400 disabled:bg-dark-600 disabled:from-dark-600 disabled:to-dark-600 transition-all duration-200 shadow-glow-sm flex items-center justify-center"
           >
             <Send className="w-4 h-4" />
           </button>
        </form>
        <div className="mt-4 flex justify-between items-center px-2">
           <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Press Enter to send</span>
           <button
             onClick={onComplete}
             className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 px-4 py-2 rounded-lg transition-all duration-200 shadow-glow-sm"
           >
             Continue to Strategy <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    </div>
  );
};