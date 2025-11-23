import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, User, X, MessageSquare, Briefcase, Sparkles, Loader2, Minimize2 } from 'lucide-react';

interface FloatingChatWidgetProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isThinking: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export const FloatingChatWidget: React.FC<FloatingChatWidgetProps> = ({
  messages,
  onSendMessage,
  isThinking,
  isOpen,
  onToggle
}) => {
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
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-110 flex items-center gap-2 group"
          title="Open AI Legal Assistant"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium">
            Ask AI Assistant
          </span>
        </button>
      )}

      {/* Chat Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border-2 border-slate-200 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 rounded-t-xl flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Legal Assistant</h3>
                <p className="text-[10px] text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Powered by Gemini AI
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
              title="Close chat"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && !isThinking && (
              <div className="text-center text-slate-400 italic text-sm mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-xs">Ask me questions about your claim,<br/>legal procedures, or evidence requirements.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-800 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                </div>
                <div className={`px-3 py-2 rounded-lg text-xs max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex-shrink-0">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-grow px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all"
                disabled={isThinking}
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-all flex items-center justify-center"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-slate-400 mt-2 text-center uppercase tracking-wider">
              Press Enter to send • Available throughout wizard
            </p>
          </div>
        </div>
      )}
    </>
  );
};
