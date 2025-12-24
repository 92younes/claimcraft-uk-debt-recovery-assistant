import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-1.5 -ml-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label="Open navigation menu"
              >
                 <Menu className="w-5 h-5" />
              </button>
           )}
        </div>

        {/* Spacer for layout balance when hamburger menu is present */}
        <div className="flex-1" />
      </div>
    </header>
  );
};
