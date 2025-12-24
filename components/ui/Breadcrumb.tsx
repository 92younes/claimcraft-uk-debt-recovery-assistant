import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = item.onClick && !item.isCurrentPage;

        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
            )}
            {isClickable ? (
              <button
                type="button"
                onClick={item.onClick}
                className="text-slate-600 hover:text-teal-600 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 rounded px-1 -mx-1"
                aria-current={item.isCurrentPage ? 'page' : undefined}
              >
                {index === 0 && <Home className="w-4 h-4 inline mr-1" aria-hidden="true" />}
                {item.label}
              </button>
            ) : (
              <span
                className={`${isLast || item.isCurrentPage ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'} px-1`}
                aria-current={item.isCurrentPage || isLast ? 'page' : undefined}
              >
                {index === 0 && <Home className="w-4 h-4 inline mr-1" aria-hidden="true" />}
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
