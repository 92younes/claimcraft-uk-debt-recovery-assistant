import React from 'react';
import { Scale, Menu, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface HeaderProps {
  onMenuClick?: () => void;
  onGetStarted?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onGetStarted }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Open navigation menu"
              >
                 <Menu className="w-6 h-6" />
              </button>
           )}
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-teal-500 p-2.5 rounded-xl shadow-teal-md group-hover:shadow-teal-lg transition-all duration-300">
                 <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">ClaimCraft</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium hidden sm:block">UK Debt Recovery</span>
              </div>
           </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <button
            type="button"
            disabled
            title="Coming soon"
            className="text-slate-400 cursor-not-allowed relative"
            aria-disabled="true"
          >
            Features
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="text-slate-400 cursor-not-allowed relative"
            aria-disabled="true"
          >
            Pricing
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="text-slate-400 cursor-not-allowed relative"
            aria-disabled="true"
          >
            Protocol Guide
          </button>

          {onGetStarted && (
            <Button
              onClick={onGetStarted}
              className="ml-4"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Get Started
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
