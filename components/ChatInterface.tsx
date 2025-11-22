import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, User, Scale, ArrowRight, Loader2, CheckCircle2, Briefcase, Gavel } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto animate-fade-in flex flex-col h-[calc(100vh-180px)]">
      <div className="text-center mb-6 flex-shrink-0">
        <div className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-slate-300">
          <Gavel className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-serif">Case Consultation</h2>
        <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-1">Confidential • Procedural Guidance</p>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto px-6 py-6 bg-white rounded-t-2xl border border-slate-200 shadow-xl space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.length === 0 && !isThinking && (
             <div className="text-center text-slate-400 italic mt-10 text-sm">
               Establishing secure link to AI legal assistant...
             </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-900 text-white border-slate-900'}`}>
               {msg.role === 'user' ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div className="flex flex-col max-w-[80%]">
                <span className={`text-[10px] font-bold uppercase mb-1 ${msg.role === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-500'}`}>
                    {msg.role === 'user' ? 'Client' : 'Legal Assistant'}
                </span>
                <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                    ? 'bg-blue-50 text-slate-800 border border-blue-100 rounded-tr-sm' 
                    : 'bg-white text-slate-900 border border-slate-200 rounded-tl-sm shadow-md'
                }`}>
                {msg.content}
                </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Briefcase className="w-5 h-5" />
             </div>
             <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-md w-fit">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">Reviewing Evidence</span>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-50 border-x border-b border-slate-200 rounded-b-2xl p-4 shadow-lg flex-shrink-0">
        <form onSubmit={handleSend} className="relative flex gap-2">
           <input 
             type="text" 
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Answer clearly..."
             className="flex-grow px-4 py-4 pr-14 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all text-sm shadow-inner"
             disabled={isThinking}
             autoFocus
           />
           <button 
             type="submit" 
             disabled={!input.trim() || isThinking}
             className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-all shadow-md flex items-center justify-center"
           >
             <Send className="w-4 h-4" />
           </button>
        </form>
        <div className="mt-4 flex justify-between items-center px-2">
           <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Press Enter to send</span>
           <button 
             onClick={onComplete}
             className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white px-3 py-2 rounded-lg transition-colors uppercase tracking-wide border border-transparent hover:border-slate-200"
           >
             Skip to Drafting <ArrowRight className="w-3 h-3" />
           </button>
        </div>
      </div>
    </div>
  );
};