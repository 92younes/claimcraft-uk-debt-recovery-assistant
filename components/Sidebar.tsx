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
  X,
  ChevronRight,
  FileText,
  Calendar,
  Settings,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { UserProfile } from '../types';

/**
 * Premium Sidebar Component
 *
 * World-class navigation with:
 * - Smooth hover animations
 * - Visual hierarchy
 * - Step progress indicators
 * - Keyboard navigation support
 */

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

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  currentStep,
  maxStepReached,
  onDashboardClick,
  onCalendarClick,
  onSettingsClick,
  onLegalClick,
  onCloseMobile,
  onStepSelect,
  upcomingDeadlinesCount,
  userProfile
}) => {

  // 5-step wizard flow
  const steps = [
    { id: 1, displayNum: 1, label: 'Evidence', sublabel: 'Upload or import', icon: Upload },
    { id: 2, displayNum: 2, label: 'Verify Details', sublabel: 'Review extracted info', icon: FileText },
    { id: 3, displayNum: 3, label: 'Strategy', sublabel: 'Select document', icon: ShieldCheck },
    { id: 4, displayNum: 4, label: 'Draft', sublabel: 'Generate & edit', icon: FileSignature },
    { id: 5, displayNum: 5, label: 'Review', sublabel: 'Ready to send', icon: CheckCircle2 },
  ];

  // Navigation item component for reuse
  const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: React.ReactNode;
    sublabel?: string;
  }> = ({ icon, label, isActive, onClick, badge, sublabel }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        group w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-inset
        ${isActive
          ? 'bg-gradient-to-r from-teal-50 to-teal-50/50 text-teal-700 shadow-soft border-l-4 border-teal-500 ml-0 pl-3'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent hover:translate-x-0.5'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className={`
        w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200
        ${isActive
          ? 'bg-teal-500 text-white shadow-teal-sm'
          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
        }
      `}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm block ${isActive ? 'font-bold' : 'font-medium'}`}>
          {label}
        </span>
        {sublabel && (
          <span className={`text-xs ${isActive ? 'text-teal-600' : 'text-slate-400'}`}>
            {sublabel}
          </span>
        )}
      </div>
      {badge}
    </button>
  );

  return (
    <aside className="w-full h-full bg-white text-slate-900 flex flex-col border-r border-slate-200 no-print">
      {/* Logo Area */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl shadow-teal transition-transform duration-300 group-hover:scale-105">
                <Scale className="w-5 h-5 text-white" />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-teal-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-slate-900">ClaimCraft</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">UK Debt Recovery</span>
            </div>
          </div>
          {onCloseMobile && (
            <Button
              variant="ghost"
              onClick={onCloseMobile}
              className="lg:hidden"
              aria-label="Close navigation menu"
              icon={<X className="w-5 h-5" />}
              iconOnly
            />
          )}
        </div>
      </div>

      {/* User Profile - Premium card style */}
      <div className="px-5 pb-5 flex-shrink-0">
        <Tooltip content={userProfile?.businessName || 'Guest User'} position="right">
          <button
            type="button"
            className={`
              w-full text-left flex items-center gap-3 p-3 rounded-xl
              transition-all duration-200 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50
              ${userProfile
                ? 'bg-gradient-to-br from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-100 border border-slate-200/50'
                : 'bg-slate-50 hover:bg-slate-100'
              }
            `}
            onClick={() => { onSettingsClick?.(); onCloseMobile?.(); }}
            aria-label={userProfile ? 'Open profile settings' : 'Open settings'}
          >
            {/* Avatar with gradient border */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-teal-600 font-semibold text-sm">
                  {userProfile?.businessName?.charAt(0).toUpperCase() || 'G'}
                </div>
              </div>
              {/* Online indicator */}
              {userProfile && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {userProfile?.businessName || 'Guest User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {userProfile ? 'Click to edit profile' : 'Local Session'}
              </p>
            </div>
            <Settings className={`w-4 h-4 flex-shrink-0 transition-colors ${userProfile ? 'text-slate-400' : 'text-slate-300'}`} />
          </button>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-4 overflow-y-auto scrollbar-hide">
        {view === 'dashboard' || view === 'calendar' || view === 'settings' ? (
          <>
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-3 tracking-wider">
              Main Menu
            </p>
            <div className="space-y-1">
              <NavItem
                icon={<LayoutDashboard className="w-5 h-5" />}
                label="Dashboard"
                isActive={view === 'dashboard'}
                onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
              />
              <NavItem
                icon={<Calendar className="w-5 h-5" />}
                label="Calendar"
                isActive={view === 'calendar'}
                onClick={() => { onCalendarClick?.(); onCloseMobile?.(); }}
                badge={
                  view !== 'calendar' && upcomingDeadlinesCount && upcomingDeadlinesCount > 0 ? (
                    <span className="px-2 py-0.5 bg-teal-500 text-white text-xs font-semibold rounded-full shadow-teal-sm animate-pulse-soft">
                      {upcomingDeadlinesCount}
                    </span>
                  ) : view !== 'calendar' ? (
                    <span className="text-xs text-slate-400">No upcoming</span>
                  ) : null
                }
              />
            </div>
          </>
        ) : view === 'conversation' ? (
          <>
            {/* Back to Dashboard */}
            <button
              type="button"
              onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 mb-6 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>

            {/* Conversation Entry Indicator */}
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-4 tracking-wider">New Claim</p>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-50 to-teal-50/50 border-l-4 border-teal-500 p-4">
              {/* Decorative pattern */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/50 rounded-full -mr-10 -mt-10" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal-500 text-white shadow-teal-sm flex-shrink-0">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm block font-semibold text-teal-700">Describe Your Claim</span>
                  <span className="text-xs text-teal-600">Upload or describe</span>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-500 flex-shrink-0" />
              </div>
            </div>
            <div className="mt-4 px-3 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3 h-3" />
              <span>Next: Verify details in wizard</span>
            </div>
          </>
        ) : (
          <>
            {/* Back to Dashboard */}
            <button
              type="button"
              onClick={() => { onDashboardClick(); onCloseMobile?.(); }}
              className="w-full text-left flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-150 mb-6 rounded-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>

            {/* Workflow Steps */}
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase mb-4 tracking-wider">Workflow Steps</p>

            {/* Progress bar */}
            <div className="px-3 mb-4">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-400">Step {currentStep} of {steps.length}</span>
                <span className="text-[10px] font-medium text-teal-600">{Math.round((currentStep / steps.length) * 100)}%</span>
              </div>
            </div>

            <div
              className="space-y-1"
              role="tablist"
              aria-label="Wizard steps"
              onKeyDown={(e) => {
                const effectiveMax = maxStepReached ?? currentStep;
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  const nextStep = Math.min(currentStep + 1, effectiveMax);
                  if (nextStep <= effectiveMax && onStepSelect) {
                    onStepSelect(nextStep);
                  }
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const prevStep = Math.max(currentStep - 1, 1);
                  if (onStepSelect) {
                    onStepSelect(prevStep);
                  }
                }
              }}
            >
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const effectiveMax = maxStepReached ?? currentStep;
                const isCompleted = step.id < currentStep;
                const canClick = step.id <= effectiveMax;
                const StepIcon = step.icon;

                return (
                  <button
                    type="button"
                    key={step.id}
                    role="tab"
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => {
                      if (canClick && onStepSelect) {
                        onStepSelect(step.id);
                        onCloseMobile?.();
                      }
                    }}
                    disabled={!canClick}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Step ${step.displayNum}: ${step.label}${isCompleted ? ' (completed)' : ''}${!canClick ? ' (locked)' : ''}`}
                    title={!canClick ? 'Complete previous steps first' : isCompleted ? `Go back to ${step.label}` : step.label}
                    className={`
                      group w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200 ease-out relative
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-inset
                      ${isActive
                        ? 'bg-gradient-to-r from-teal-50 to-teal-50/30 border-l-4 border-teal-500 ml-0 pl-3 shadow-soft'
                        : canClick
                          ? 'hover:bg-slate-50 hover:translate-x-1 cursor-pointer border-l-4 border-transparent'
                          : 'opacity-40 cursor-not-allowed border-l-4 border-transparent'
                      }
                    `}
                  >
                    {/* Step Number/Icon */}
                    <div className={`
                      w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0
                      transition-all duration-200
                      ${isActive
                        ? 'bg-teal-500 text-white shadow-teal-sm'
                        : isCompleted
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`
                        text-sm block
                        ${isActive ? 'font-semibold text-teal-700' : canClick ? 'font-medium text-slate-700' : 'font-medium text-slate-400'}
                      `}>
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

      {/* Legal Disclaimer - Premium subtle design */}
      <div className="p-4 flex-shrink-0 border-t border-slate-100">
        <button
          onClick={() => {
            onLegalClick?.();
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
          title="View legal information"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="text-sm font-medium">Legal Disclaimer</span>
        </button>
      </div>
    </aside>
  );
};
