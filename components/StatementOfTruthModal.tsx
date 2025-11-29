/**
 * Statement of Truth Warning Modal
 *
 * CRITICAL LEGAL COMPLIANCE:
 * Under CPR Part 22, signing a Statement of Truth without an honest belief
 * in the truth of the facts stated is contempt of court - a CRIMINAL OFFENCE.
 *
 * This modal ensures users understand the serious consequences before signing
 * court documents (N1, N225, N225A, etc.)
 */

import React, { useState } from 'react';
import { AlertTriangle, Scale, X } from 'lucide-react';

interface StatementOfTruthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentType: string; // e.g., "Form N1", "Default Judgment (N225)"
}

export const StatementOfTruthModal: React.FC<StatementOfTruthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentType
}) => {
  const [hasReadWarning, setHasReadWarning] = useState(false);
  const [confirmsTruth, setConfirmsTruth] = useState(false);

  const handleConfirm = () => {
    if (hasReadWarning && confirmsTruth) {
      onConfirm();
      // Reset state for next time
      setHasReadWarning(false);
      setConfirmsTruth(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setHasReadWarning(false);
    setConfirmsTruth(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-700 rounded-2xl shadow-dark-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-600">
        {/* Header - Red warning theme */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Statement of Truth Warning</h2>
              <p className="text-red-100 text-sm mt-0.5">Criminal Offence - Read Carefully</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What You're About to Sign */}
          <div className="bg-dark-600 border border-dark-500 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <Scale className="w-6 h-6 text-violet-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-lg">You are about to sign: {documentType}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  This document contains a <span className="font-bold text-white">Statement of Truth</span> under CPR Part 22
                </p>
              </div>
            </div>
          </div>

          {/* Legal Warning */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
            <h3 className="font-bold text-red-300 text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Criminal Offence Warning
            </h3>
            <div className="space-y-3 text-sm text-red-400">
              <p className="font-medium">
                Under the Civil Procedure Rules Part 22.1(1), the Statement of Truth means:
              </p>
              <div className="bg-dark-800 border border-red-500/30 rounded-lg p-4 italic">
                <p className="text-red-400">
                  "I believe that the facts stated in this [document] are true. I understand that proceedings for contempt
                  of court may be brought against anyone who makes, or causes to be made, a false statement in a document
                  verified by a statement of truth without an honest belief in its truth."
                </p>
              </div>
              <p className="font-bold text-red-300 bg-red-500/20 p-3 rounded-lg border border-red-500/30">
                Contempt of court is a CRIMINAL OFFENCE punishable by:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2 text-red-400">
                <li><span className="font-bold text-red-300">Imprisonment</span> (up to 2 years)</li>
                <li><span className="font-bold text-red-300">Unlimited fines</span></li>
                <li><span className="font-bold text-red-300">Legal costs</span> of the other party</li>
                <li><span className="font-bold text-red-300">Claim struck out</span> immediately</li>
              </ul>
            </div>
          </div>

          {/* What This Means */}
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-5">
            <h3 className="font-bold text-violet-300 text-lg mb-3">What this means:</h3>
            <ul className="space-y-2 text-sm text-violet-200">
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-violet-400">✓</span>
                <span>You must have an <span className="font-bold text-white">honest belief</span> that every fact in this document is true</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-violet-400">✓</span>
                <span>You must have <span className="font-bold text-white">checked all amounts</span> (invoice total, interest, court fees)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-violet-400">✓</span>
                <span>You must have <span className="font-bold text-white">verified all addresses</span> are correct and suitable for legal service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-violet-400">✓</span>
                <span>You must have <span className="font-bold text-white">reviewed all timeline events</span> for accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-violet-400">✓</span>
                <span>You understand you are <span className="font-bold text-white">personally liable</span> for false statements, even if made by mistake</span>
              </li>
            </ul>
          </div>

          {/* Before You Sign - Review Checklist */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
            <h3 className="font-bold text-amber-300 text-lg mb-3">Before you sign, have you:</h3>
            <ul className="space-y-2 text-sm text-amber-200">
              <li>Reviewed the entire document carefully?</li>
              <li>Verified all monetary amounts are correct?</li>
              <li>Confirmed all addresses are accurate?</li>
              <li>Checked all dates are accurate?</li>
              <li>Attached all supporting evidence?</li>
              <li>Considered whether you need legal advice?</li>
            </ul>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="space-y-4 bg-dark-600 border border-dark-500 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasReadWarning}
                onChange={(e) => setHasReadWarning(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-dark-500 bg-dark-700 text-violet-500 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover:text-slate-200">
                <span className="font-bold text-white">I have read and understand</span> the criminal offence warning above
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmsTruth}
                onChange={(e) => setConfirmsTruth(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-dark-500 bg-dark-700 text-violet-500 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover:text-slate-200">
                <span className="font-bold text-white">I confirm that I have an honest belief</span> that all information in this document is true and accurate
              </span>
            </label>
          </div>

          {/* Solicitor Recommendation */}
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 text-center">
            <p className="text-sm text-violet-200">
              <span className="font-bold text-violet-300">Not sure?</span> We recommend consulting a solicitor before signing court documents.
              This software is a tool to assist you, not a replacement for legal advice.
            </p>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-dark-800 border-t border-dark-600 p-6 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-dark-600 border border-dark-500 hover:bg-dark-500 text-slate-300 rounded-xl font-medium transition-colors duration-200"
          >
            Cancel - Review Document
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasReadWarning || !confirmsTruth}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-dark-600 disabled:to-dark-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 shadow-glow disabled:shadow-none"
          >
            {hasReadWarning && confirmsTruth ? 'Proceed to Sign' : 'Complete Confirmations Above'}
          </button>
        </div>
      </div>
    </div>
  );
};
