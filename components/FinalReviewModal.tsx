/**
 * Final Review Modal
 *
 * Last checkpoint before user downloads Form N1 for filing.
 */

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, FileCheck, Eye, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface FinalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  claimData: {
    claimantName: string;
    debtorName: string;
    invoiceNumber: string;
    invoiceAmount: number;
    interest: number;
    compensation: number;
    courtFee: number;
    totalClaim: number;
  };
}

export const FinalReviewModal: React.FC<FinalReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  claimData
}) => {
  const [acknowledgesConsequences, setAcknowledgesConsequences] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canProceed = acknowledgesConsequences;

  const handleConfirm = async () => {
    if (canProceed && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onConfirm();
        // Only reset after successful confirmation
        setAcknowledgesConsequences(false);
      } catch (error) {
        // Keep state on failure so user can retry
        console.error('Download failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    // Don't reset state on close - preserve user progress
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Final Review Checklist"
      description="Last check before filing"
      maxWidthClassName="max-w-2xl"
      bodyClassName="p-0"
      headerClassName="bg-gradient-to-r from-teal-600 to-teal-500 text-white border-b-0"
      titleClassName="text-white"
      descriptionClassName="text-teal-100"
      closeButtonClassName="text-white hover:text-white hover:bg-white/20"
      titleIcon={(
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <FileCheck className="w-8 h-8 text-white" />
        </div>
      )}
      footer={(
        <div className="w-full flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancel - Review Document
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed || isSubmitting}
            isLoading={isSubmitting}
            className="flex-1"
          >
            {isSubmitting
              ? 'Generating PDF...'
              : canProceed
                ? 'Download Form'
                : 'Confirm to Continue'}
          </Button>
        </div>
      )}
    >
      <div className="p-6 md:p-8 space-y-6">
          {/* Claim Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-500" />
              Claim Summary
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Claimant</p>
                <p className="font-medium text-slate-900">{claimData.claimantName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Defendant</p>
                <p className="font-medium text-slate-900">{claimData.debtorName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Invoice Number</p>
                <p className="font-medium text-slate-900 font-mono">{claimData.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Invoice Amount</p>
                <p className="font-medium text-slate-900 font-mono">£{claimData.invoiceAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Interest</p>
                <p className="font-medium text-slate-900 font-mono">£{claimData.interest.toFixed(2)}</p>
              </div>
              {claimData.compensation > 0 && (
                <div>
                  <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Late Payment Compensation</p>
                  <p className="font-medium text-slate-900 font-mono">£{claimData.compensation.toFixed(2)}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-xs uppercase font-bold mb-1 tracking-wider">Court Fee</p>
                <p className="font-medium text-slate-900 font-mono">£{claimData.courtFee.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-700">Total Claim Amount:</p>
                <p className="font-bold text-2xl text-teal-600 font-mono">£{claimData.totalClaim.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Final Acknowledgment */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acknowledgesConsequences}
                onChange={(e) => setAcknowledgesConsequences(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 bg-white text-teal-500 focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
              />
              <span className="text-sm text-slate-700 group-hover:text-slate-900">
                <span className="font-bold text-slate-900">I confirm that:</span>
                <ul className="mt-2 space-y-1.5 ml-4 list-disc text-slate-600">
                  <li>I have personally reviewed the entire Form N1 and all information is accurate</li>
                  <li>I have an honest belief that all facts stated are true</li>
                  <li>I understand that signing a false Statement of Truth is contempt of court (criminal offence)</li>
                  <li>I understand the risks of self-representation and have considered legal advice</li>
                  <li>I am ready to proceed with filing this claim at court</li>
                </ul>
              </span>
            </label>
          </div>

          {/* Warning if not ready */}
          {!canProceed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700">
                <span className="font-bold text-amber-800">Not Ready to Proceed:</span> Please complete all critical checklist items
                and the final acknowledgment above before downloading.
              </p>
            </div>
          )}
      </div>
    </Modal>
  );
};
