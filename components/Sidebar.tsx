import React from 'react';
import {
  LayoutDashboard,
  Upload,
  SearchCheck,
  Scale,
  CalendarClock,
  MessageSquareText,
  FileSignature,
  CheckCircle2,
  ShieldCheck,
  FolderOpen,
  X,
  ChevronRight,
  FileText
} from 'lucide-react';

interface SidebarProps {
  view: 'landing' | 'dashboard' | 'wizard';
  currentStep: number;
  maxStepReached?: number;
  onDashboardClick: () => void;
  onCloseMobile?: () => void;
  onStepSelect?: (step: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, currentStep, maxStepReached, onDashboardClick, onCloseMobile, onStepSelect }) => {

  const steps = [
    { id: 1, displayNum: 1, label: 'Evidence Source', sublabel: 'Import your data', icon: Upload },
    { id: 2, displayNum: 2, label: 'Details & Analysis', sublabel: 'Review claim details', icon: SearchCheck },
    { id: 3, displayNum: 3, label: 'Legal Viability', sublabel: 'Check requirements', icon: Scale },
    { id: 4, displayNum: 4, label: 'Timeline', sublabel: 'Build chronology', icon: CalendarClock },
    { id: 5, displayNum: 5, label: 'Clarification', sublabel: 'AI consultation', icon: MessageSquareText },
    { id: 6, displayNum: 6, label: 'Data Review', sublabel: 'Verify details', icon: FileText },
    { id: 7, displayNum: 7, label: 'Strategy', sublabel: 'Select approach', icon: ShieldCheck },
    { id: 8, displayNum: 8, label: 'Drafting', sublabel: 'Generate documents', icon: FileSignature },
    { id: 9, displayNum: 9, label: 'Final Review', sublabel: 'Ready to send', icon: CheckCircle2 },
  ];

  return (
    <aside className="w-full h-full bg-white text-slate-900 flex flex-col border-r border-slate-200 no-print">
      {/* Logo Area */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500 p-2.5 rounded-xl shadow-teal-sm">
               <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
               <h1 className="text-lg font-bold font-display tracking-tight text-slate-900">ClaimCraft</h1>
               <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">UK Debt Recovery</span>
            </div>
          </div>
          {onCloseMobile && (
            <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-slate-900 transition-colors duration-200 p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="px-5 pb-5 flex-shrink-0">
         <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold text-sm">
               G
            </div>
            <div className="overflow-hidden flex-1">
               <p className="text-sm font-medium text-slate-900">Guest User</p>
               <p className="text-xs text-slate-400">Local Session</p>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto">
         {view === 'dashboard' ? (
             <>
                <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-3 tracking-wider">Main Menu</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 text-teal-700 border-l-4 border-teal-500 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-semibold">Dashboard</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer transition-all duration-200 mt-1">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Archived Claims</span>
                </div>
             </>
         ) : (
             <>
               {/* Back to Dashboard */}
               <div
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 cursor-pointer transition-all duration-200 mb-6"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </div>

               {/* Workflow Steps */}
               <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-4 tracking-wider">Workflow Steps</p>
               <div className="space-y-1">
                 {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const effectiveMax = maxStepReached ?? currentStep;
                    const isCompleted = step.id < effectiveMax;
                    const canClick = step.id <= effectiveMax;

                    return (
                       <div
                         key={step.id}
                         onClick={() => {
                             if (canClick && onStepSelect) {
                                 onStepSelect(step.id);
                                 onCloseMobile?.();
                             }
                         }}
                         className={`flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all duration-200 relative ${
                            isActive
                              ? 'bg-teal-50 border-l-4 border-teal-500'
                              : canClick
                                ? 'hover:bg-slate-50 cursor-pointer border-l-4 border-transparent'
                                : 'opacity-50 cursor-not-allowed border-l-4 border-transparent'
                         }`}
                       >
                          {/* Step Number */}
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                            isActive
                              ? 'bg-teal-500 text-white'
                              : isCompleted
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.displayNum}
                          </div>

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm block ${
                              isActive ? 'font-semibold text-teal-700' : 'font-medium text-slate-700'
                            }`}>
                              {step.label}
                            </span>
                            {isActive && (
                              <span className="text-xs text-teal-600">{step.sublabel}</span>
                            )}
                          </div>

                          {/* Arrow for active */}
                          {isActive && (
                            <ChevronRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          )}
                       </div>
                    );
                 })}
               </div>
             </>
         )}
      </nav>

      {/* Legal Disclaimer */}
      <div className="p-4 flex-shrink-0">
         <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Legal Disclaimer</span>
         </button>
      </div>
    </aside>
  );
};
