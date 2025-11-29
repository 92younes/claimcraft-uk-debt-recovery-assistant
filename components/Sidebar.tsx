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
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  view: 'landing' | 'dashboard' | 'wizard';
  currentStep: number;
  onDashboardClick: () => void;
  onCloseMobile?: () => void;
  onStepSelect?: (step: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, currentStep, onDashboardClick, onCloseMobile, onStepSelect }) => {

  // Step IDs must match App.tsx Step enum values (ASSESSMENT=3 is skipped in flow)
  const steps = [
    { id: 1, label: 'Evidence Source', icon: Upload },            // Step.SOURCE
    { id: 2, label: 'Details & Analysis', icon: SearchCheck },    // Step.DETAILS
    { id: 4, label: 'Timeline', icon: CalendarClock },            // Step.TIMELINE (3 is skipped)
    { id: 5, label: 'AI Consultation', icon: MessageSquareText }, // Step.QUESTIONS
    { id: 6, label: 'Strategy', icon: Scale },                    // Step.FINAL
    { id: 7, label: 'Document Draft', icon: FileSignature },      // Step.DRAFT
    { id: 8, label: 'Final Review', icon: CheckCircle2 },         // Step.PREVIEW
  ];

  return (
    <aside className="w-full h-full bg-dark-900 text-white flex flex-col border-r border-dark-700/50 shadow-dark-xl no-print">
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-dark-700/50 bg-dark-900/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-2.5 rounded-xl shadow-glow">
             <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
             <h1 className="text-lg font-bold font-serif tracking-wide text-white">ClaimCraft</h1>
             <span className="text-[10px] text-slate-500 uppercase tracking-widest">Legal Assistant</span>
          </div>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-white transition-colors duration-200 p-2 hover:bg-dark-700 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* User Profile Snippet */}
      <div className="px-6 py-6 flex-shrink-0">
         <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800 border border-dark-600/50 hover:border-violet-500/30 transition-colors duration-300">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">
               G
            </div>
            <div className="overflow-hidden flex-1">
               <p className="text-sm font-semibold truncate text-slate-100">Guest User</p>
               <p className="text-xs text-slate-500 truncate">Local Session</p>
            </div>
            <Sparkles className="w-4 h-4 text-violet-400" />
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-1">
         {view === 'dashboard' ? (
             <>
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-3 tracking-wider">Main Menu</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-glow cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold">Dashboard</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-dark-700 hover:text-white cursor-pointer transition-all duration-200">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Archived Claims</span>
                </div>
             </>
         ) : (
             <>
               <div
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-dark-700 cursor-pointer transition-all duration-200 mb-6 border border-dashed border-dark-600 hover:border-violet-500/50"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </div>

               <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-3 tracking-wider">Current Workflow</p>
               {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  // Allow navigation to previous steps or current step
                  const canClick = isCompleted || isActive || (onStepSelect && step.id < currentStep);

                  return (
                     <div
                       key={step.id}
                       onClick={() => {
                           if (canClick && onStepSelect) {
                               onStepSelect(step.id);
                               onCloseMobile?.();
                           }
                       }}
                       className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-glow translate-x-1'
                            : canClick
                              ? 'text-slate-300 hover:bg-dark-700 cursor-pointer hover:text-white'
                              : 'text-slate-600 opacity-40 cursor-not-allowed'
                       }`}
                     >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-600'}`} />
                        <span className={`text-sm font-medium ${isActive ? 'font-bold' : ''}`}>{step.label}</span>
                        {isCompleted && <div className="ml-auto w-2 h-2 rounded-full bg-green-400 shadow-glow-success"></div>}
                     </div>
                  );
               })}
             </>
         )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-dark-700/50 bg-dark-900/50 flex-shrink-0">
         <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-500 hover:text-slate-300 hover:bg-dark-700 rounded-xl transition-all duration-200">
            <ShieldAlert className="w-4 h-4" />
            <span>Legal Disclaimer</span>
         </button>
      </div>
    </aside>
  );
};