import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { LegalDisclaimerModal } from '../components/LegalDisclaimerModal';
import { useClaimStore } from '../store/claimStore';
import { Sparkles, ClipboardList } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export const WizardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<{
    breadcrumbs?: React.ComponentProps<typeof Header>['breadcrumbs'];
    rightContent?: React.ComponentProps<typeof Header>['rightContent'];
  }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { step, maxStepReached, setStep, userProfile, isLoading } = useClaimStore();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Determine view based on route - conversation route gets special sidebar
  const currentView = useMemo(() => {
    if (location.pathname === '/conversation') return 'conversation';
    return 'wizard';
  }, [location.pathname]) as 'wizard' | 'conversation';

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
        aria-hidden={!isDesktop && !isMobileMenuOpen}
      >
        <Sidebar
          view={currentView}
          currentStep={step}
          maxStepReached={maxStepReached}
          onDashboardClick={() => navigate('/dashboard')}
          onSettingsClick={() => navigate('/settings')}
          onStepSelect={(s) => setStep(s)}
          onLegalClick={() => setShowLegalDisclaimer(true)}
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
        <Header
          onMenuClick={() => setIsMobileMenuOpen(true)}
          breadcrumbs={headerConfig.breadcrumbs}
          rightContent={headerConfig.rightContent}
        />

        {/* Mode Indicator Bar - Only show during Evidence/Verify steps, hide from Strategy onwards */}
        {step <= 2 && (
          <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-1.5">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Current Mode Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Mode:</span>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  currentView === 'conversation'
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentView === 'conversation' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Assistant
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-3.5 h-3.5" />
                      Manual Entry
                    </>
                  )}
                </div>
              </div>

              {/* Switch Mode Button */}
              <button
                onClick={() => navigate(currentView === 'conversation' ? '/wizard' : '/conversation')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {currentView === 'conversation' ? (
                  <>
                    <ClipboardList className="w-3.5 h-3.5" />
                    Switch to Manual
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Switch to AI
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <main className={`flex-1 overflow-y-auto scroll-smooth ${
          currentView === 'conversation' ? 'p-0' : 'p-4 md:p-6'
        }`}>
          <div className={currentView === 'conversation' ? 'h-full' : 'max-w-7xl mx-auto'}>
            <Outlet context={{ setHeaderConfig }} />
          </div>
        </main>
      </div>

      {/* Legal Disclaimer Modal */}
      <LegalDisclaimerModal
        isOpen={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
    </div>
  );
};


