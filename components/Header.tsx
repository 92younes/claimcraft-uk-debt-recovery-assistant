import React from 'react';
import { Scale, Menu, ArrowRight } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onGetStarted?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onGetStarted }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors duration-200"
              >
                 <Menu className="w-6 h-6" />
              </button>
           )}
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-emerald-600 p-2.5 rounded-xl shadow-emerald-md group-hover:shadow-emerald-lg transition-all duration-300">
                 <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">ClaimCraft</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium hidden sm:block">Legal Assistant</span>
              </div>
           </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <span className="hover:text-slate-900 transition-colors duration-200 cursor-pointer relative group">
            Features
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </span>
          <span className="hover:text-slate-900 transition-colors duration-200 cursor-pointer relative group">
            Pricing
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </span>
          <span className="hover:text-slate-900 transition-colors duration-200 cursor-pointer relative group">
            Protocol Guide
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 group-hover:w-full transition-all duration-200"></span>
          </span>

          {onGetStarted && (
            <button
              onClick={onGetStarted}
              className="ml-4 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm hover:shadow-emerald-md transition-all duration-200 btn-primary"
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
