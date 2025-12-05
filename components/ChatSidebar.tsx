import React from 'react';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';

interface ProgressItem {
  key: string;
  label: string;
}

interface ChatSidebarProps {
  progress: Record<string, boolean>;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ progress }) => {
  const items: ProgressItem[] = [
    { key: 'claimantName', label: 'Claimant Identity' },
    { key: 'claimantAddress', label: 'Claimant Address' },
    { key: 'defendantName', label: 'Debtor Identity' },
    { key: 'defendantAddress', label: 'Debtor Address' },
    { key: 'invoiceDetails', label: 'Debt Amount' },
    { key: 'timelineEvents', label: 'Timeline & Proof' },
  ];

  // Calculate completion based on items
  const completedCount = items.filter(item => progress[item.key]).length;
  // const totalCount = items.length;
  // const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-slate-50 border-l border-slate-200 w-72 p-6 hidden lg:block overflow-y-auto h-full flex-shrink-0">
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Required Information</h3>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const isComplete = progress[item.key];
          return (
            <div key={item.key} className="flex items-start gap-3 transition-all duration-300">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0 animate-fade-in" />
              ) : (
                <Circle className="w-5 h-5 text-slate-300 shrink-0" />
              )}
              <span className={`text-sm ${isComplete ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-teal-50 rounded-xl border border-teal-100">
        <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-xs text-teal-800 leading-relaxed">
                Collecting this information ensures your legal documents are court-compliant.
            </p>
        </div>
      </div>
    </div>
  );
};

