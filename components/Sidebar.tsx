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
  X
} from 'lucide-react';

interface SidebarProps {
  view: 'landing' | 'dashboard' | 'wizard';
  currentStep: number;
  onDashboardClick: () => void;
  onCloseMobile?: () => void;
  onStepSelect?: (step: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, currentStep, onDashboardClick, onCloseMobile, onStepSelect }) => {
  
  // Updated step order to match App.tsx Enum
  const steps = [
    { id: 1, label: 'Evidence Source', icon: Upload },
    { id: 2, label: 'Details & Analysis', icon: SearchCheck },
    { id: 3, label: 'Legal Viability', icon: Scale },
    { id: 4, label: 'Timeline', icon: CalendarClock },
    { id: 5, label: 'Clarification', icon: MessageSquareText },
    { id: 6, label: 'Final Review', icon: CheckCircle2 },
    { id: 7, label: 'Drafting', icon: FileSignature },
  ];

  return (
    <aside className="w-full h-full bg-slate-900 text-white flex flex-col border-r border-slate-800 shadow-2xl no-print">
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
             <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
             <h1 className="text-lg font-bold font-serif tracking-wide">ClaimCraft</h1>
             <span className="text-[10px] text-slate-400 uppercase tracking-widest">Legal OS</span>
          </div>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden text-slate-400 hover:text-white transition-colors p-2">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* User Profile Snippet */}
      <div className="px-6 py-6 flex-shrink-0">
         <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white font-bold text-xs shadow-lg">
               G
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">Guest User</p>
               <p className="text-xs text-slate-400 truncate">Local Session</p>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto space-y-1">
         {view === 'dashboard' ? (
             <>
                <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Main Menu</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-900/20 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold">Dashboard</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <FolderOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">Archived Claims</span>
                </div>
             </>
         ) : (
             <>
               <div 
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors mb-6 border border-dashed border-slate-700"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </div>
               
               <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Current Workflow</p>
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
                       className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                            : canClick
                              ? 'text-slate-300 hover:bg-slate-800/50 cursor-pointer hover:text-white'
                              : 'text-slate-600 opacity-50 cursor-not-allowed'
                       }`}
                     >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-600'}`} />
                        <span className={`text-sm font-medium ${isActive ? 'font-bold' : ''}`}>{step.label}</span>
                        {isCompleted && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>}
                     </div>
                  );
               })}
             </>
         )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex-shrink-0">
         <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <ShieldAlert className="w-4 h-4" />
            <span>Legal Disclaimer</span>
         </button>
      </div>
    </aside>
  );
};