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
  FileText,
  Calendar,
  Settings
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  view: 'landing' | 'dashboard' | 'wizard' | 'conversation' | 'calendar' | 'settings';
  currentStep: number;
  maxStepReached?: number;
  onDashboardClick: () => void;
  onCalendarClick?: () => void;
  onSettingsClick?: () => void;
  onLegalClick?: () => void;
  onCloseMobile?: () => void;
  onStepSelect?: (step: number) => void;
  upcomingDeadlinesCount?: number;
  userProfile?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, currentStep, maxStepReached, onDashboardClick, onCalendarClick, onSettingsClick, onLegalClick, onCloseMobile, onStepSelect, upcomingDeadlinesCount, userProfile }) => {

  // 5-step wizard flow (ASSESSMENT merged into VERIFY)
  const steps = [
    { id: 1, displayNum: 1, label: 'Evidence', sublabel: 'Upload or import', icon: Upload },
    { id: 2, displayNum: 2, label: 'Verify & Assess', sublabel: 'Review & legal check', icon: FileText },
    { id: 3, displayNum: 3, label: 'Strategy', sublabel: 'Select document', icon: ShieldCheck },
    { id: 4, displayNum: 4, label: 'Draft', sublabel: 'Generate & edit', icon: FileSignature },
    { id: 5, displayNum: 5, label: 'Review', sublabel: 'Ready to send', icon: CheckCircle2 },
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
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-slate-900 transition-colors duration-200 p-2 hover:bg-slate-100 rounded-lg"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="px-5 pb-5 flex-shrink-0">
         <button
           type="button"
           className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
           onClick={() => { onSettingsClick?.(); onCloseMobile?.(); }}
           aria-label={userProfile ? 'Open profile settings' : 'Open settings'}
         >
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold text-sm">
               {userProfile?.businessName?.charAt(0).toUpperCase() || 'G'}
            </div>
            <div className="overflow-hidden flex-1">
               <p className="text-sm font-medium text-slate-900 truncate">{userProfile?.businessName || 'Guest User'}</p>
               <p className="text-xs text-slate-400">{userProfile ? 'Click to edit profile' : 'Local Session'}</p>
            </div>
            {userProfile && <Settings className="w-4 h-4 text-slate-400" />}
         </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-4 overflow-y-auto">
         {view === 'dashboard' || view === 'calendar' ? (
             <>
                <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-3 tracking-wider">Main Menu</p>
                <button
                  type="button"
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 ${
                    view === 'dashboard'
                      ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500'
                      : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                  aria-current={view === 'dashboard' ? 'page' : undefined}
                >
                    <LayoutDashboard className={`w-4 h-4 ${view === 'dashboard' ? 'text-teal-500' : ''}`} />
                    <span className={`text-sm ${view === 'dashboard' ? 'font-semibold' : 'font-medium'}`}>Dashboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onCalendarClick?.(); onCloseMobile?.(); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 ${
                    view === 'calendar'
                      ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-500'
                      : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                  aria-current={view === 'calendar' ? 'page' : undefined}
                >
                    <Calendar className={`w-4 h-4 ${view === 'calendar' ? 'text-teal-500' : ''}`} />
                    <span className={`text-sm ${view === 'calendar' ? 'font-semibold' : 'font-medium'}`}>Calendar</span>
                    {upcomingDeadlinesCount && upcomingDeadlinesCount > 0 && view !== 'calendar' && (
                      <span className="ml-auto bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {upcomingDeadlinesCount}
                      </span>
                    )}
                </button>
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 cursor-not-allowed transition-all duration-200 mt-1"
                  title="Coming soon"
                  aria-disabled="true"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">Archived Claims</span>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                </div>
             </>
         ) : view === 'conversation' ? (
             <>
               {/* Back to Dashboard */}
               <button
                  type="button"
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 transition-all duration-200 mb-6 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </button>

               {/* Conversation Entry Indicator */}
               <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-4 tracking-wider">New Claim</p>
               <div className="flex items-center gap-3 px-4 py-3 rounded-r-xl bg-teal-50 border-l-4 border-teal-500">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-teal-500 text-white">
                    <MessageSquareText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block font-semibold text-teal-700">Describe Your Claim</span>
                    <span className="text-xs text-teal-600">Upload or describe</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
               </div>
               <div className="mt-4 px-3">
                  <p className="text-xs text-slate-400">Next: Verify details in wizard</p>
               </div>
             </>
         ) : (
             <>
               {/* Back to Dashboard */}
               <button
                  type="button"
                  onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 transition-all duration-200 mb-6 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
               >
                   <LayoutDashboard className="w-4 h-4" />
                   <span className="text-sm font-medium">Back to Dashboard</span>
               </button>

               {/* Workflow Steps */}
               <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-4 tracking-wider">Workflow Steps</p>
               <div className="space-y-1">
                 {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const effectiveMax = maxStepReached ?? currentStep;
                    const isCompleted = step.id < effectiveMax;
                    const canClick = step.id <= effectiveMax;

                    return (
                       <button
                         type="button"
                         key={step.id}
                         onClick={() => {
                             if (canClick && onStepSelect) {
                                 onStepSelect(step.id);
                                 onCloseMobile?.();
                             }
                         }}
                         disabled={!canClick}
                         aria-current={isActive ? 'step' : undefined}
                         className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all duration-200 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 ${
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
                       </button>
                    );
                 })}
               </div>
             </>
         )}
      </nav>

      {/* Legal Disclaimer */}
      <div className="p-4 flex-shrink-0">
         <button
           onClick={() => {
             onLegalClick?.();
             onCloseMobile?.();
           }}
           className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
           title="View legal information"
         >
            <ShieldCheck className="w-4 h-4" />
            <span>Legal Disclaimer</span>
         </button>
      </div>
    </aside>
  );
};
