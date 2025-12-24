import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number | React.ReactNode;
}

interface HorizontalTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const HorizontalTabs: React.FC<HorizontalTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`border-b border-slate-200 ${className}`}>
      <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-inset
                ${isActive
                  ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
              role="tab"
              aria-selected={isActive}
            >
              {tab.icon && (
                <span className={isActive ? 'text-teal-500' : 'text-slate-400'}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                typeof tab.badge === 'string' || typeof tab.badge === 'number' ? (
                  <span className={`
                    ml-1 px-2 py-0.5 text-xs font-semibold rounded-full
                    ${isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-600'
                    }
                  `}>
                    {tab.badge}
                  </span>
                ) : (
                  <span className="ml-1">
                    {tab.badge}
                  </span>
                )
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default HorizontalTabs;
