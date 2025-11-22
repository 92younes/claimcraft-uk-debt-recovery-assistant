import React from 'react';
import { Scale, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-white/70 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-50 no-print transition-all duration-300 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
           {onMenuClick && (
              <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-600">
                 <Menu className="w-6 h-6" />
              </button>
           )}
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-slate-900 p-2 rounded-xl shadow-md group-hover:bg-blue-600 transition-colors duration-300">
                 <Scale className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-serif">ClaimCraft</h1>
           </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-slate-600">
          <span className="hover:text-slate-900 transition-colors cursor-pointer">Features</span>
          <span className="hover:text-slate-900 transition-colors cursor-pointer">Pricing</span>
          <span className="hover:text-slate-900 transition-colors cursor-pointer">Protocol Guide</span>
        </nav>
      </div>
    </header>
  );
};
