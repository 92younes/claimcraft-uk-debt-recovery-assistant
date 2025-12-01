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
  ShieldAlert,
  FolderOpen,
  X,
  Sparkles,
  FileCheck
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

  // Step IDs must match App.tsx Step enum values (ASSESSMENT=3 is skipped in flow)
  const steps = [
    { id: 1, label: 'Evidence Source', icon: Upload },            // Step.SOURCE
    { id: 2, label: 'Details & Analysis', icon: SearchCheck },    // Step.DETAILS
    { id: 4, label: 'Timeline', icon: CalendarClock },            // Step.TIMELINE (3 is skipped)
    { id: 5, label: 'AI Consultation', icon: MessageSquareText }, // Step.QUESTIONS
    { id: 6, label: 'Review Data', icon: FileCheck },             // Step.DATA_REVIEW
    { id: 7, label: 'Strategy', icon: Scale },                    // Step.RECOMMENDATION
    { id: 8, label: 'Document Draft', icon: FileSignature },      // Step.DRAFT
    { id: 9, label: 'Final Review', icon: CheckCircle2 },         // Step.PREVIEW
  ];

  return (
    <aside className="w-full h-full bg-white text-slate-900 flex flex-col border-r border-slate-200 no-print">
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-emerald-sm">
             <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
             <h1 className="text-xl font-bold font-display tracking-tight text-slate-900">ClaimCraft</h1>
             <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Legal Assistant</span>
          </div>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-slate-900 transition-colors duration-200 p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* User Profile Snippet */}
      <div className="px-5 py-5 flex-shrink-0">
         <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-emerald-100">
               G
            </div>
            <div className="overflow-hidden flex-1">
               <p className="text-sm font-semibold truncate text-slate-900">Guest User</p>
               <p className="text-xs text-slate-500 truncate">Local Session</p>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-1">
         {view === 'dashboard' ? (
             <>
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider">Main Menu</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-emerald-md cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold">Dashboard</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-all duration-200">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Archived Claims</span>
                </div>
             </>
         ) : (
             <>
               <div
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer transition-all duration-200 mb-6 border border-dashed border-slate-300 hover:border-emerald-400"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </div>

               <p className="px-3 text-xs font-semibold text-slate-400 uppercase mb-3 tracking-wider">Current Workflow</p>
               {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const effectiveMax = maxStepReached ?? currentStep;
                  const isCompleted = step.id < effectiveMax;
                  // Allow navigation to any step up to and including maxStepReached
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
                       className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-emerald-md'
                            : canClick
                              ? 'text-slate-700 hover:bg-slate-50 cursor-pointer hover:text-slate-900'
                              : 'text-slate-400 opacity-60 cursor-not-allowed'
                       }`}
                     >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{step.label}</span>
                        {isCompleted && (
                          <div className="ml-auto">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                        )}
                     </div>
                  );
               })}
             </>
         )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
         <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200">
            <ShieldAlert className="w-4 h-4" />
            <span>Legal Disclaimer</span>
         </button>
      </div>
    </aside>
  );
};
