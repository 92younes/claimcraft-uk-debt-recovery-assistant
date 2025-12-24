import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  completedSteps?: number[];
}

export const ProgressSteps: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  completedSteps = []
}) => {
  const isStepCompleted = (stepNumber: number) => {
    return completedSteps.includes(stepNumber) || stepNumber < currentStep;
  };

  const isStepCurrent = (stepNumber: number) => {
    return stepNumber === currentStep;
  };

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const completed = isStepCompleted(step.number);
          const current = isStepCurrent(step.number);

          return (
            <li key={step.number} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                    ${completed ? 'bg-teal-600 border-teal-600 shadow-teal-sm' :
                      current ? 'bg-teal-600 border-teal-600 shadow-teal-md' :
                      'bg-slate-100 border-slate-300'}
                  `}
                  aria-current={current ? 'step' : undefined}
                >
                  {completed ? (
                    <Check className="w-5 h-5 text-white" aria-hidden="true" />
                  ) : (
                    <span className={`text-sm font-semibold ${current ? 'text-white' : 'text-slate-500'}`}>
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium text-center
                    ${completed ? 'text-teal-600' : current ? 'text-slate-900' : 'text-slate-500'}
                  `}
                >
                  {step.label}
                </span>

                {/* Optional Description */}
                {step.description && (
                  <span className="mt-1 text-[10px] text-slate-400 text-center max-w-[100px]">
                    {step.description}
                  </span>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5 -translate-y-1/2
                    ${completed ? 'bg-teal-500' : 'bg-slate-200'}
                  `}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Compact version for mobile with enhanced progress visualization
export const ProgressStepsCompact: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep,
  completedSteps = []
}) => {
  // Use index for progress calculation, not the step ID (since step IDs may skip numbers)
  const currentIndex = steps.findIndex(s => s.number === currentStep);
  const currentStepData = steps.find(s => s.number === currentStep);
  const progress = currentIndex === -1 ? 0 : (currentIndex / (steps.length - 1)) * 100;

  const isStepCompleted = (stepNumber: number) => {
    return completedSteps.includes(stepNumber) || steps.findIndex(s => s.number === stepNumber) < currentIndex;
  };

  return (
    <div className="mb-6">
      {/* Header with step info and percentage pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">
            Step {currentIndex + 1} of {steps.length}
          </span>
          {currentStepData && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              — {currentStepData.label}
            </span>
          )}
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar with Step Markers */}
      <div className="relative">
        {/* Background track */}
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-500 to-teal-400 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${Math.round(progress)}% complete`}
          />
        </div>

        {/* Step markers on the progress bar */}
        <div className="absolute top-0 left-0 w-full h-2.5 flex items-center">
          {steps.map((step, index) => {
            const markerPosition = index === 0 ? 0 : (index / (steps.length - 1)) * 100;
            const isCompleted = isStepCompleted(step.number);
            const isCurrent = step.number === currentStep;

            return (
              <div
                key={step.number}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${markerPosition}%` }}
                title={step.label}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-teal-500 border-teal-600'
                      : isCurrent
                        ? 'bg-white border-teal-500 shadow-sm'
                        : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  {isCompleted && (
                    <Check className="w-2 h-2 text-white m-auto mt-0.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step name (visible on mobile where header doesn't show it) */}
      {currentStepData && (
        <p className="mt-2 text-xs text-teal-600 font-medium sm:hidden">
          {currentStepData.label}
        </p>
      )}
    </div>
  );
};
