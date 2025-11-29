import React from 'react';
import { Scale, Menu, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onGetStarted?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onGetStarted }) => {
  return (
    <header className="glass border-b border-dark-700/50 sticky top-0 z-50 no-print transition-all duration-300">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 hover:bg-dark-700 rounded-lg text-slate-400 hover:text-white transition-colors duration-200"
              >
                 <Menu className="w-6 h-6" />
              </button>
           )}
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-2.5 rounded-xl shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
                 <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-white font-serif">ClaimCraft</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-sans hidden sm:block">Legal Assistant</span>
              </div>
           </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <span className="hover:text-white transition-colors duration-200 cursor-pointer">Features</span>
          <span className="hover:text-white transition-colors duration-200 cursor-pointer">Pricing</span>
          <span className="hover:text-white transition-colors duration-200 cursor-pointer">Protocol Guide</span>

          {onGetStarted && (
            <button
              onClick={onGetStarted}
              className="ml-4 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 btn-glow transition-all duration-300"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
