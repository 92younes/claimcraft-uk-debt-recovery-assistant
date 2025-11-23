import React, { useState, useEffect } from 'react';
import { Cookie, X, Shield, Settings } from 'lucide-react';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onAccept, onDecline }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
    onDecline?.();
  };

  const handleDismiss = () => {
    // Temporarily hide without saving choice (will reappear on next visit)
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      {showDetails && (
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Banner */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto animate-slide-up">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl shrink-0">
              <Cookie className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                We value your privacy
              </h2>
              <p className="text-slate-600 leading-relaxed">
                ClaimCraft UK uses <strong>local storage</strong> (similar to cookies) to save your claim drafts
                and preferences on your device. We do not use tracking cookies or share your data with advertisers.
              </p>
            </div>
          </div>

          {/* Details Panel (Expandable) */}
          {showDetails && (
            <div className="mb-6 bg-slate-50 rounded-xl p-6 border border-slate-200 animate-fade-in">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                What we store locally:
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Essential Storage (Required)</h4>
                  <ul className="list-disc ml-6 space-y-1 text-slate-700 text-sm">
                    <li><strong>Claim Drafts:</strong> Your saved claims (debtor details, amounts, timelines)</li>
                    <li><strong>Application Settings:</strong> Theme preferences, UI state</li>
                    <li><strong>OAuth Tokens:</strong> Authentication for Xero/accounting integrations (if used)</li>
                    <li><strong>Compliance Logs:</strong> Document generation logs (includes claim IDs, party names, document types, timestamps - retained for 12 months for legal audit purposes, then deleted)</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2">
                    These are necessary for the application to function. Declining will prevent the app from saving your work.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Analytics (Optional - Currently Disabled)</h4>
                  <p className="text-slate-700 text-sm">
                    We may add privacy-friendly analytics (Plausible) in the future to understand how users interact
                    with ClaimCraft UK. This would be cookie-free and GDPR-compliant by default.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">What we DON'T do:</h4>
                  <ul className="list-disc ml-6 space-y-1 text-slate-700 text-sm">
                    <li>❌ No third-party tracking cookies (Google Analytics, Facebook Pixel, etc.)</li>
                    <li>❌ No advertising or remarketing cookies</li>
                    <li>❌ No selling your data to third parties</li>
                    <li>❌ No cross-site tracking</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  For more information, read our{' '}
                  <button
                    onClick={() => {
                      // This will be handled by App.tsx routing
                      window.dispatchEvent(new CustomEvent('navigate-privacy'));
                    }}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Privacy Policy
                  </button>
                  {' '}and{' '}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-terms'));
                    }}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    Terms of Service
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium px-4 py-2 hover:bg-slate-100 rounded-lg"
            >
              <Settings className="w-4 h-4" />
              {showDetails ? 'Hide details' : 'Show details'}
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDecline}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Accept & Continue
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-slate-500 mt-4 text-center">
            By clicking "Accept", you consent to our use of local storage as described above.
            You can change your preferences at any time in Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function to check if user has consented
export const hasUserConsented = (): boolean | null => {
  const consent = localStorage.getItem('cookieConsent');
  if (consent === 'accepted') return true;
  if (consent === 'declined') return false;
  return null; // No decision made yet
};

// Helper function to reset consent (for Settings page)
export const resetCookieConsent = (): void => {
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
};

// Custom animation styles (add to global CSS or Tailwind config)
const styles = `
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.4s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
`;

// Export styles for use in App
export const cookieConsentStyles = styles;
