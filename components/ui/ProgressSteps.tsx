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
                    relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                    ${completed ? 'bg-green-600 border-green-600' :
                      current ? 'bg-blue-600 border-blue-600' :
                      'bg-white border-slate-300'}
                  `}
                  aria-current={current ? 'step' : undefined}
                >
                  {completed ? (
                    <Check className="w-5 h-5 text-white" aria-hidden="true" />
                  ) : (
                    <span className={`text-sm font-bold ${current ? 'text-white' : 'text-slate-500'}`}>
                      {step.number}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`
                    mt-2 text-xs font-medium text-center
                    ${completed || current ? 'text-slate-900' : 'text-slate-500'}
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
                    ${completed ? 'bg-green-600' : 'bg-slate-300'}
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

// Compact version for mobile
export const ProgressStepsCompact: React.FC<ProgressStepsProps> = ({
  steps,
  currentStep
}) => {
  const currentStepData = steps.find(s => s.number === currentStep);
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-xs text-slate-500">
          {Math.round(progress)}% complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${Math.round(progress)}% complete`}
        />
      </div>

      {currentStepData && (
        <p className="mt-2 text-xs text-slate-600 font-medium">
          {currentStepData.label}
        </p>
      )}
    </div>
  );
};
