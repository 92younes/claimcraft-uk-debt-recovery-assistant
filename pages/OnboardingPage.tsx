import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { useClaimStore } from '../store/claimStore';
import { UserProfile } from '../types';

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const { saveUserProfile, userProfile } = useClaimStore();

  const handleComplete = async (profile: UserProfile) => {
    await saveUserProfile(profile);
    navigate('/dashboard');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      onCancel={handleCancel}
      existingProfile={userProfile}
      layout="fullscreen"
    />
  );
};
