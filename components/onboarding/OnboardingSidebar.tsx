import React from 'react';
import { Check, User, Building2, MapPin, FileCheck, ShieldCheck, HelpCircle, LogOut } from 'lucide-react';
import { ONBOARDING_STEPS } from '../../constants';

interface OnboardingSidebarProps {
  currentStep: number;
  completedSteps: number[];
  onCancel: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  User: <User className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
  MapPin: <MapPin className="w-5 h-5" />,
  FileCheck: <FileCheck className="w-5 h-5" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5" />
};

export const OnboardingSidebar: React.FC<OnboardingSidebarProps> = ({
  currentStep,
  completedSteps,
  onCancel
}) => {
  return (
    <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-teal-sm">
            <span className="text-white font-bold text-lg">CC</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 font-display">ClaimCraft UK</h1>
            <p className="text-xs text-slate-500">Account Setup</p>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 p-6 overflow-y-auto">
        <nav className="space-y-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = currentStep === step.id;
            const isPending = !isCompleted && !isActive;

            return (
              <div
                key={step.id}
                className={`
                  relative flex items-start gap-3 p-3 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-teal-50 border border-teal-200' : ''}
                  ${isCompleted ? 'opacity-70' : ''}
                `}
              >
                {/* Step indicator line */}
                {index < ONBOARDING_STEPS.length - 1 && (
                  <div
                    className={`
                      absolute left-[1.65rem] top-14 w-0.5 h-6
                      ${isCompleted ? 'bg-teal-400' : 'bg-slate-200'}
                    `}
                  />
                )}

                {/* Icon circle */}
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isCompleted ? 'bg-teal-500 text-white' : ''}
                    ${isActive ? 'bg-teal-600 text-white shadow-sm' : ''}
                    ${isPending ? 'bg-slate-200 text-slate-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    iconMap[step.icon]
                  )}
                </div>

                {/* Step text */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`
                      font-medium text-sm
                      ${isActive ? 'text-teal-700' : ''}
                      ${isCompleted ? 'text-slate-600' : ''}
                      ${isPending ? 'text-slate-400' : ''}
                    `}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`
                      text-xs mt-0.5
                      ${isActive ? 'text-teal-600' : 'text-slate-400'}
                    `}
                  >
                    {step.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {step.estimatedTime}
                  </p>
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-200 space-y-3">
        <div className="bg-slate-100 rounded-xl p-4">
          <h4 className="font-medium text-slate-700 text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            Having trouble?
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Feel free to contact us and we will help you through the process.
          </p>
          <a
            href="mailto:support@claimcraft.uk"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Contact support
          </a>
        </div>

        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cancel setup
        </button>
      </div>
    </div>
  );
};
