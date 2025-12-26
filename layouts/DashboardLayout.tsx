import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { LegalDisclaimerModal } from '../components/LegalDisclaimerModal';
import { useClaimStore } from '../store/claimStore';
import { useMediaQuery } from '../hooks/useMediaQuery';

export const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<{
    breadcrumbs?: React.ComponentProps<typeof Header>['breadcrumbs'];
    rightContent?: React.ComponentProps<typeof Header>['rightContent'];
  }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, isLoading, isInitialized, deadlines } = useClaimStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Determine current view based on route
  const currentView = useMemo(() => {
    if (location.pathname === '/calendar') return 'calendar';
    if (location.pathname === '/settings') return 'settings';
    return 'dashboard';
  }, [location.pathname]) as 'dashboard' | 'calendar' | 'settings';

  // Calculate upcoming deadlines count for sidebar badge
  const upcomingDeadlinesCount = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return deadlines.filter(d => {
      const dueDate = new Date(d.dueDate);
      return d.status === 'pending' && dueDate >= now && dueDate <= weekFromNow;
    }).length;
  }, [deadlines]);

  // Guard: prevent accessing dashboard routes without onboarding/profile
  // Only redirect after store is fully initialized to avoid race conditions
  useEffect(() => {
    if (isInitialized && !isLoading && !userProfile) {
      console.log('[DashboardLayout] No profile found after initialization, redirecting to onboarding');
      navigate('/onboarding');
    }
  }, [isInitialized, isLoading, userProfile, navigate]);

  // Show loading state while store is initializing to prevent content flash
  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen h-[100dvh] bg-slate-50 items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isDesktop && !isMobileMenuOpen}
      >
        <Sidebar
          view={currentView}
          currentStep={0}
          onDashboardClick={() => navigate('/dashboard')}
          onCalendarClick={() => navigate('/calendar')}
          onSettingsClick={() => navigate('/settings')}
          onLegalClick={() => setShowLegalDisclaimer(true)}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          userProfile={userProfile}
          upcomingDeadlinesCount={upcomingDeadlinesCount}
        />
      </div>
      
      {/* Overlay for mobile/tablet - z-[49] to be just below sidebar (z-50) but clickable */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[49] lg:hidden"
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
        <main className="flex-1 overflow-y-auto p-3 md:p-4 scroll-smooth">
          <div className="max-w-7xl mx-auto">
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


