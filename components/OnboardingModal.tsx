import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onDecline: () => void;
}

/**
 * COMBINED ONBOARDING MODAL (Disclaimer + Eligibility)
 *
 * Reduces modal interruptions by combining:
 * 1. Legal Disclaimer (was DisclaimerModal)
 * 2. Eligibility Check (was EligibilityModal)
 *
 * Phase 2 UX improvement: 2 modals → 1 modal
 */
export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onDecline
}) => {
  const [stage, setStage] = useState<'disclaimer' | 'eligibility'>('disclaimer');
  const [eligibilityStep, setEligibilityStep] = useState(0);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const eligibilityQuestions = [
    {
      id: 'location',
      question: "Is the debtor (defendant) based in England or Wales?",
      details: "Small Claims Court procedures differ for Scotland and Northern Ireland.",
      yes: () => setEligibilityStep(1),
      no: () => setDisqualifiedReason("ClaimCraft currently only supports claims within England & Wales jurisdiction.")
    },
    {
      id: 'age',
      question: "Is the debt less than 6 years old?",
      details: "Under the Limitation Act 1980, most debts older than 6 years are statute-barred.",
      yes: () => setEligibilityStep(2),
      no: () => setDisqualifiedReason("The debt appears to be statute-barred (too old to claim in court).")
    },
    {
      id: 'insolvency',
      question: "To your knowledge, is the debtor currently solvent?",
      details: "If the company is already dissolved or in liquidation, legal action typically costs more than you can recover.",
      yes: () => onComplete(),
      no: () => setDisqualifiedReason("Suing an insolvent or dissolved entity usually results in zero recovery.")
    }
  ];

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDecline();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  const currentQuestion = eligibilityQuestions[eligibilityStep];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto focus:outline-none border border-slate-200"
      >

        {/* STAGE 1: DISCLAIMER */}
        {stage === 'disclaimer' && (
          <>
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 font-display mb-2">
                    Important Legal Notice
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Please read carefully before using ClaimCraft UK
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Main Disclaimer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  This is NOT a Law Firm
                </h3>
                <div className="text-slate-600 space-y-2 text-sm leading-relaxed">
                  <p>
                    <strong className="text-slate-900">ClaimCraft UK is a document preparation service.</strong> We are NOT a law firm,
                    solicitors, or legal advisors. We do NOT provide legal advice.
                  </p>
                  <p>
                    All documents are generated using AI and MUST be reviewed by a qualified solicitor
                    before use in court proceedings.
                  </p>
                </div>
              </div>

              {/* Acknowledgements (Condensed) */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900 text-sm">By using this service, you acknowledge:</h3>
                <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>You are responsible for verifying all information is correct and truthful</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>AI-generated documents may contain errors and must be reviewed carefully</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>You should consult a qualified solicitor before filing documents</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>No solicitor-client relationship is created by using this service</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>You use this service entirely at your own risk</span>
                  </div>
                </div>
              </div>

              {/* What We Provide (Condensed) */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  What We DO Provide
                </h3>
                <ul className="text-slate-600 space-y-1 text-xs">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 text-xs">✓</span>
                    <span>Document templates based on UK Civil Procedure Rules</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 text-xs">✓</span>
                    <span>AI-powered document drafting assistance</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 text-xs">✓</span>
                    <span>Legal compliance checks & procedural guidance</span>
                  </li>
                </ul>
              </div>

              {/* Free Legal Resources (Compact) */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">Need Free Legal Advice?</h3>
                <div className="text-slate-600 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span><strong className="text-slate-900">Citizens Advice:</strong> www.citizensadvice.org.uk</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span><strong className="text-slate-900">Find a Solicitor:</strong> www.lawsociety.org.uk</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-4">
              <button
                onClick={onDecline}
                className="flex-1 px-6 py-3 border border-slate-200 bg-white text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                I Do Not Accept
              </button>
              <button
                onClick={() => setStage('eligibility')}
                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm btn-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                I Understand & Accept
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* STAGE 2: ELIGIBILITY CHECK */}
        {stage === 'eligibility' && (
          <>
            <div className="bg-slate-50 p-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-emerald-sm">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 font-display">Eligibility Check</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">Quick questions to ensure your claim is viable</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {disqualifiedReason ? (
                <div className="text-center animate-fade-in">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="font-bold text-red-700 mb-1">Not Recommended</p>
                    <p className="text-red-600 text-sm leading-relaxed">{disqualifiedReason}</p>
                  </div>
                  <button
                    onClick={onDecline}
                    className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors duration-200 border border-slate-200"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="mb-4 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Question {eligibilityStep + 1} of 3</span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full ${
                            i === eligibilityStep
                              ? 'bg-emerald-500 shadow-sm'
                              : i < eligibilityStep
                              ? 'bg-emerald-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3">{currentQuestion.question}</h3>
                  <p className="text-slate-500 mb-8 text-sm">{currentQuestion.details}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={currentQuestion.no}
                      className="py-4 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                    >
                      No
                    </button>
                    <button
                      onClick={currentQuestion.yes}
                      className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm btn-primary transition-all duration-200"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
