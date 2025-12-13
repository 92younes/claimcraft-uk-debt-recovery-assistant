import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { useClaimStore } from '../store/claimStore';

export const WizardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { step, maxStepReached, setStep, userProfile, isLoading } = useClaimStore();

  // Guard: prevent accessing wizard routes without onboarding/profile
  useEffect(() => {
    if (!isLoading && !userProfile) {
      navigate('/onboarding');
    }
  }, [isLoading, userProfile, navigate]);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-slate-900">
       <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isMobileMenuOpen && window.innerWidth < 768}
      >
        <Sidebar 
          view="wizard" 
          currentStep={step}
          maxStepReached={maxStepReached}
          onDashboardClick={() => navigate('/dashboard')}
          onStepSelect={(s) => setStep(s)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          userProfile={userProfile}
        />
      </div>

      {/* Overlay for mobile - z-[49] to be just below sidebar (z-50) but clickable */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
           <Outlet />
        </main>
      </div>
    </div>
  );
};


