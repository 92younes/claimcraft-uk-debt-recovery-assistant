import React from 'react';
import { Menu, Home, ChevronRight } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

export interface BreadcrumbItem {
  label: string;
  /** Full label to show on hover if truncated */
  fullLabel?: string;
  onClick?: () => void;
  isCurrentPage?: boolean;
}

interface HeaderProps {
  onMenuClick?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  rightContent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, breadcrumbs, rightContent }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0 flex-1">
           {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-1.5 -ml-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white flex-shrink-0"
                aria-label="Open navigation menu"
              >
                 <Menu className="w-5 h-5" />
              </button>
           )}

           {/* Breadcrumb Navigation */}
           {breadcrumbs && breadcrumbs.length > 0 && (
             <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1 min-w-0 overflow-hidden">
               {breadcrumbs.map((item, index) => (
                 <div key={index} className="flex items-center gap-1 min-w-0">
                   {index > 0 && (
                     <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                   )}
                   {item.onClick && !item.isCurrentPage ? (
                     <Tooltip content={item.fullLabel || item.label} position="bottom">
                       <button
                         onClick={() => item.onClick?.()}
                         className="text-sm text-slate-600 hover:text-teal-600 transition-colors flex items-center gap-1.5 truncate"
                       >
                         {index === 0 && <Home className="w-3.5 h-3.5 flex-shrink-0" />}
                         <span className="truncate">{item.label}</span>
                       </button>
                     </Tooltip>
                   ) : (
                     <Tooltip content={item.fullLabel || item.label} position="bottom">
                       <span
                         className={`text-sm truncate ${item.isCurrentPage ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                         aria-current={item.isCurrentPage ? 'page' : undefined}
                       >
                         {index === 0 && <Home className="w-3.5 h-3.5 inline mr-1.5" />}
                         {item.label}
                       </span>
                     </Tooltip>
                   )}
                 </div>
               ))}
             </nav>
           )}
        </div>

        {/* Right side content */}
        {rightContent && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
};
