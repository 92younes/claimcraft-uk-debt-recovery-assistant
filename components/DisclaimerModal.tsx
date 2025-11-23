import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * LEGAL DISCLAIMER MODAL
 *
 * Critical for legal protection. Users must acknowledge:
 * 1. This is NOT legal advice
 * 2. Documents are AI-generated and need review
 * 3. They should consult a solicitor before filing
 *
 * This follows Garfield.law's approach - clear disclaimer BEFORE document generation.
 * WCAG 2.1 AA compliant: focus trap, ESC handler, ARIA attributes
 */
export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onAccept,
  onDecline
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element for restoration
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus modal when opened
    modalRef.current?.focus();

    // Handle ESC key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDecline();
      }
    };

    // Add keyboard listener
    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      // Cleanup
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';

      // Restore focus to previously focused element
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-description"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto focus:outline-none"
      >

        {/* Header */}
        <div className="bg-amber-50 border-b-2 border-amber-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 id="disclaimer-title" className="text-2xl font-bold text-slate-900 font-serif mb-2">
                Important Legal Notice
              </h2>
              <p id="disclaimer-description" className="text-slate-600 text-sm">
                Please read this carefully before using ClaimCraft UK
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Main Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              This is NOT a Law Firm
            </h3>
            <div className="text-slate-700 space-y-2 text-sm leading-relaxed">
              <p>
                <strong>ClaimCraft UK is a document preparation service.</strong> We are NOT a law firm,
                solicitors, or legal advisors. We do NOT provide legal advice.
              </p>
              <p>
                All documents are generated using artificial intelligence (AI) technology and MUST be
                reviewed by a qualified solicitor before use in court proceedings or legal correspondence.
              </p>
            </div>
          </div>

          {/* What This Means */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900">By using this service, you acknowledge that:</h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div className="text-slate-700 text-sm">
                  <strong>You are responsible for accuracy.</strong> You must verify all information
                  entered into this system is correct and truthful.
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div className="text-slate-700 text-sm">
                  <strong>AI can make mistakes.</strong> Documents are generated by AI and may contain
                  errors, omissions, or inaccuracies. You must review all generated content carefully.
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-sm">3</span>
                </div>
                <div className="text-slate-700 text-sm">
                  <strong>You need legal advice.</strong> Before sending any legal letter or filing
                  court documents, you should consult with a qualified solicitor who can provide
                  independent legal advice specific to your situation.
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-sm">4</span>
                </div>
                <div className="text-slate-700 text-sm">
                  <strong>No solicitor-client relationship.</strong> Using this service does NOT
                  create a solicitor-client relationship or any legal representation.
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold text-sm">5</span>
                </div>
                <div className="text-slate-700 text-sm">
                  <strong>You accept all risks.</strong> You use this service entirely at your own
                  risk. We are not liable for any outcomes resulting from your use of generated documents.
                </div>
              </div>
            </div>
          </div>

          {/* What We Provide */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What We DO Provide
            </h3>
            <ul className="text-slate-700 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Document templates based on UK Civil Procedure Rules</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>AI-powered document drafting assistance</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Legal compliance checks against statutory requirements</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Guidance on procedural requirements</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-600">✓</span>
                <span>Document preparation tools to save time and cost</span>
              </li>
            </ul>
          </div>

          {/* Free Legal Resources */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="font-bold text-slate-900 mb-3">Need Free Legal Advice?</h3>
            <p className="text-slate-700 text-sm mb-3">
              Before proceeding with legal action, consider contacting:
            </p>
            <ul className="text-slate-700 space-y-1 text-sm">
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Citizens Advice:</strong> www.citizensadvice.org.uk</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Law Society Find a Solicitor:</strong> www.lawsociety.org.uk/find-a-solicitor</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Civil Legal Advice:</strong> 0345 345 4 345</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-4">
          <button
            onClick={onDecline}
            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-100 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            I Do Not Accept
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            <CheckCircle className="w-4 h-4" />
            I Understand & Accept
          </button>
        </div>

      </div>
    </div>
  );
};
