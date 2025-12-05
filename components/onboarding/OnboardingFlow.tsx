import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { OnboardingSidebar } from './OnboardingSidebar';
import { AccountTypeStep } from './steps/AccountTypeStep';
import { BusinessDetailsStep } from './steps/BusinessDetailsStep';
import { AddressStep } from './steps/AddressStep';
import { DeclarationsStep } from './steps/DeclarationsStep';
import { VerificationStep } from './steps/VerificationStep';
import { UserProfile, INITIAL_USER_PROFILE, INITIAL_USER_ADDRESS } from '../../types';
import {
  validateAccountTypeStep,
  validateBusinessDetailsStep,
  validateAddressStep,
  validateDeclarationsStep,
  validateVerificationStep,
  generateProfileId
} from '../../services/userProfileService';

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
  onCancel: () => void;
  existingProfile?: UserProfile | null;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onCancel,
  existingProfile
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [profileData, setProfileData] = useState<Partial<UserProfile>>(
    existingProfile || {
      ...INITIAL_USER_PROFILE,
      id: generateProfileId(),
      createdAt: new Date().toISOString(),
      businessAddress: { ...INITIAL_USER_ADDRESS }
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isStepValid, setIsStepValid] = useState(false);
  const [disqualified, setDisqualified] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    modalRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Validate current step whenever data changes
  useEffect(() => {
    const validation = validateCurrentStep();
    setIsStepValid(validation.isValid);
    // Only show errors after user interaction (don't show on initial load)
  }, [profileData, currentStep]);

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return validateAccountTypeStep(profileData);
      case 2:
        return validateBusinessDetailsStep(profileData);
      case 3:
        return validateAddressStep(profileData);
      case 4:
        return validateDeclarationsStep(profileData);
      case 5:
        return validateVerificationStep(profileData);
      default:
        return { isValid: true, errors: {} };
    }
  };

  const handleDataChange = (updates: Partial<UserProfile>) => {
    setProfileData(prev => ({
      ...prev,
      ...updates
    }));
  };

  const handleAddressChange = (updates: Partial<UserProfile['businessAddress']>) => {
    setProfileData(prev => ({
      ...prev,
      businessAddress: {
        ...(prev.businessAddress || INITIAL_USER_ADDRESS),
        ...updates
      }
    }));
  };

  const handleNext = () => {
    const validation = validateCurrentStep();

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Clear errors and mark step as completed
    setErrors({});
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - complete onboarding
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setErrors({});
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const finalProfile: UserProfile = {
      ...INITIAL_USER_PROFILE,
      ...profileData,
      id: profileData.id || generateProfileId(),
      createdAt: profileData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      businessAddress: {
        ...INITIAL_USER_ADDRESS,
        ...profileData.businessAddress
      }
    } as UserProfile;

    onComplete(finalProfile);
  };

  const handleDisqualification = (reason: string) => {
    setDisqualified(reason);
  };

  const renderStepContent = () => {
    if (disqualified) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-red-800 mb-2">Unable to Continue</h2>
            <p className="text-red-600 mb-6">{disqualified}</p>
            <button
              onClick={onCancel}
              className="w-full px-6 py-3 bg-white border border-red-200 text-red-700 font-medium rounded-xl hover:bg-red-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <AccountTypeStep
            data={profileData}
            onChange={handleDataChange}
            errors={errors}
          />
        );
      case 2:
        return (
          <BusinessDetailsStep
            data={profileData}
            onChange={handleDataChange}
            errors={errors}
          />
        );
      case 3:
        return (
          <AddressStep
            data={profileData}
            onAddressChange={handleAddressChange}
            onChange={handleDataChange}
            errors={errors}
          />
        );
      case 4:
        return (
          <DeclarationsStep
            data={profileData}
            onChange={handleDataChange}
            errors={errors}
            onDisqualify={handleDisqualification}
          />
        );
      case 5:
        return (
          <VerificationStep
            data={profileData}
            onChange={handleDataChange}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <OnboardingSidebar
        currentStep={currentStep}
        completedSteps={completedSteps}
        onCancel={onCancel}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-2xl mx-auto">
            {renderStepContent()}
          </div>
        </div>

        {/* Footer Navigation */}
        {!disqualified && (
          <div className="border-t border-slate-200 bg-slate-50 px-8 py-4">
            <div className="max-w-2xl mx-auto flex justify-between items-center">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`
                  flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-colors
                  ${currentStep === 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100'
                  }
                `}
              >
                <ArrowLeft className="w-4 h-4" />
                Go back
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                {currentStep === 5 ? 'Complete Setup' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
