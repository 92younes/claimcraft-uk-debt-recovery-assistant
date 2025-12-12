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
import { AlertTriangle, Scale } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Statement of Truth Warning"
      description="Criminal offence — read carefully before signing."
      maxWidthClassName="max-w-2xl"
      footer={(
        <div className="w-full flex gap-3">
          <Button
            onClick={handleClose}
            variant="secondary"
            className="flex-1"
          >
            Cancel - Review Document
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasReadWarning || !confirmsTruth}
            className="flex-1"
          >
            {hasReadWarning && confirmsTruth ? 'Proceed to Sign' : 'Complete Confirmations Above'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
          {/* What You're About to Sign */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <Scale className="w-6 h-6 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-lg">You are about to sign: {documentType}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  This document contains a <span className="font-bold text-slate-900">Statement of Truth</span> under CPR Part 22
                </p>
              </div>
            </div>
          </div>

          {/* Legal Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Criminal Offence Warning
            </h3>
            <div className="space-y-3 text-sm text-red-700">
              <p className="font-medium">
                Under the Civil Procedure Rules Part 22.1(1), the Statement of Truth means:
              </p>
              <div className="bg-white border border-red-200 rounded-lg p-4 italic">
                <p className="text-red-700">
                  "I believe that the facts stated in this [document] are true. I understand that proceedings for contempt
                  of court may be brought against anyone who makes, or causes to be made, a false statement in a document
                  verified by a statement of truth without an honest belief in its truth."
                </p>
              </div>
              <p className="font-bold text-red-800 bg-red-100 p-3 rounded-lg border border-red-200">
                Contempt of court is a CRIMINAL OFFENCE punishable by:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2 text-red-700">
                <li><span className="font-bold text-red-800">Imprisonment</span> (up to 2 years)</li>
                <li><span className="font-bold text-red-800">Unlimited fines</span></li>
                <li><span className="font-bold text-red-800">Legal costs</span> of the other party</li>
                <li><span className="font-bold text-red-800">Claim struck out</span> immediately</li>
              </ul>
            </div>
          </div>

          {/* What This Means */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
            <h3 className="font-bold text-teal-800 text-lg mb-3">What this means:</h3>
            <ul className="space-y-2 text-sm text-teal-700">
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-teal-600">✓</span>
                <span>You must have an <span className="font-bold text-slate-900">honest belief</span> that every fact in this document is true</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-teal-600">✓</span>
                <span>You must have <span className="font-bold text-slate-900">checked all amounts</span> (invoice total, interest, court fees)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-teal-600">✓</span>
                <span>You must have <span className="font-bold text-slate-900">verified all addresses</span> are correct and suitable for legal service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-teal-600">✓</span>
                <span>You must have <span className="font-bold text-slate-900">reviewed all timeline events</span> for accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0 text-teal-600">✓</span>
                <span>You understand you are <span className="font-bold text-slate-900">personally liable</span> for false statements, even if made by mistake</span>
              </li>
            </ul>
          </div>

          {/* Before You Sign - Review Checklist */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-amber-800 text-lg mb-3">Before you sign, have you:</h3>
            <ul className="space-y-2 text-sm text-amber-700">
              <li>Reviewed the entire document carefully?</li>
              <li>Verified all monetary amounts are correct?</li>
              <li>Confirmed all addresses are accurate?</li>
              <li>Checked all dates are accurate?</li>
              <li>Attached all supporting evidence?</li>
              <li>Considered whether you need legal advice?</li>
            </ul>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasReadWarning}
                onChange={(e) => setHasReadWarning(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 bg-white text-teal-500 focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                <span className="font-bold text-slate-900">I have read and understand</span> the criminal offence warning above
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmsTruth}
                onChange={(e) => setConfirmsTruth(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 bg-white text-teal-500 focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                <span className="font-bold text-slate-900">I confirm that I have an honest belief</span> that all information in this document is true and accurate
              </span>
            </label>
          </div>

          {/* Solicitor Recommendation */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
            <p className="text-sm text-teal-800">
              <span className="font-bold text-teal-900">Not sure?</span> We recommend consulting a solicitor before signing court documents.
              This software is a tool to assist you, not a replacement for legal advice.
            </p>
          </div>
      </div>
    </Modal>
  );
};
