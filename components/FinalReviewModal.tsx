/**
 * Final Review Checklist Modal
 *
 * CRITICAL SAFEGUARD:
 * Last checkpoint before user downloads Form N1 for filing.
 * Ensures all critical elements are verified to prevent:
 * - False Statement of Truth (contempt of court)
 * - Incorrect amounts (overclaiming)
 * - Invalid service addresses (claim struck out)
 * - Missing evidence (weak case)
 *
 * This modal is the final line of defence against user error.
 */

import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, FileCheck, Eye, Loader2, Scale, CheckSquare } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

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

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'amounts',
    label: 'Verified All Amounts',
    description: 'Invoice amount, interest calculation, and court fee are all correct',
    critical: true
  },
  {
    id: 'addresses',
    label: 'Confirmed Addresses',
    description: 'Both claimant and defendant addresses are accurate and suitable for legal service',
    critical: true
  },
  {
    id: 'names',
    label: 'Checked Names & Details',
    description: 'All party names, company numbers (if applicable), and personal details are correct',
    critical: true
  },
  {
    id: 'evidence',
    label: 'Attached Evidence',
    description: 'All supporting documents (invoice, contract, correspondence) are included',
    critical: true
  },
  {
    id: 'timeline',
    label: 'Reviewed Timeline',
    description: 'All dates are accurate and events are in chronological order',
    critical: true
  },
  {
    id: 'particulars',
    label: 'Read Particulars of Claim',
    description: 'The claim description is accurate, clear, and complete',
    critical: true
  },
  {
    id: 'interest',
    label: 'Verified Interest Rate',
    description: 'Interest rate matches party types (8% + BoE base rate for B2B, 8% for B2C)',
    critical: true
  },
  {
    id: 'lba',
    label: 'Sent Letter Before Action',
    description: 'Pre-Action Protocol complied with - LBA sent and reasonable time given to respond',
    critical: true
  },
  {
    id: 'jurisdiction',
    label: 'Confirmed Jurisdiction',
    description: 'This is a debt claim within England & Wales, within 6-year limitation period',
    critical: false
  },
  {
    id: 'legal_advice',
    label: 'Considered Legal Advice',
    description: 'Evaluated whether professional legal representation is appropriate for this claim',
    critical: false
  }
];

export const FinalReviewModal: React.FC<FinalReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  claimData
}) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [acknowledgesConsequences, setAcknowledgesConsequences] = useState(false);

  const criticalItems = CHECKLIST_ITEMS.filter(item => item.critical);
  const allCriticalChecked = criticalItems.every(item => checkedItems.has(item.id));
  const canProceed = allCriticalChecked && acknowledgesConsequences;

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (canProceed && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onConfirm();
        // Only reset after successful confirmation
        setCheckedItems(new Set());
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
                : `Complete ${criticalItems.length - criticalItems.filter(i => checkedItems.has(i.id)).length} Critical Items`}
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

          {/* Statement of Truth Reminder */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 text-lg mb-2">Critical Reminder: Statement of Truth</h3>
                <p className="text-sm text-red-700 mb-3">
                  This Form N1 contains a <span className="font-bold text-red-800">Statement of Truth</span> under CPR Part 22.
                  False statements are <span className="font-bold text-red-800">contempt of court - a criminal offence</span> punishable by
                  imprisonment, unlimited fines, and immediate claim dismissal.
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-3 text-xs text-red-700 italic">
                  "I believe that the facts stated in this claim form are true. I understand that proceedings for contempt
                  of court may be brought against anyone who makes, or causes to be made, a false statement in a document
                  verified by a statement of truth without an honest belief in its truth."
                </div>
              </div>
            </div>
          </div>

          {/* Solicitor Recommendation - Moved higher for prominence */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
            <Scale className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-teal-900 text-sm mb-1">Recommended: Professional Review</p>
              <p className="text-sm text-teal-800">
                Have a solicitor review your Form before filing. Even a brief consultation (£100-£300) can identify
                critical errors and save you thousands in potential costs if your claim is struck out.
              </p>
            </div>
          </div>

          {/* Pre-Filing Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Pre-Filing Checklist</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Confirm ALL critical items below. Non-critical items are recommended but optional.
                </p>
              </div>
              {!allCriticalChecked && (
                <button
                  onClick={() => {
                    const newChecked = new Set(checkedItems);
                    criticalItems.forEach(item => newChecked.add(item.id));
                    setCheckedItems(newChecked);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors duration-200"
                  title="Check all required items"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Check All Required
                </button>
              )}
            </div>

            {/* Grouped Checklist Items */}
            <div className="space-y-5">
              {/* Document Accuracy Group */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Document Accuracy</h4>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.filter(item => ['amounts', 'names', 'particulars', 'timeline'].includes(item.id)).map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <label
                        key={item.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleItem(item.id);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isChecked}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                          isChecked
                            ? 'bg-teal-50 border-teal-300'
                            : item.critical
                            ? 'bg-white border-red-200 hover:border-red-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id)}
                          tabIndex={-1}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-teal-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isChecked ? 'text-teal-700' : 'text-slate-900'}`}>
                              {item.label}
                            </span>
                            {item.critical && !isChecked && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                REQUIRED
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isChecked ? 'text-teal-600' : 'text-slate-500'}`}>
                            {item.description}
                          </p>
                        </div>
                        {isChecked && (
                          <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Legal Compliance Group */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legal Compliance</h4>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.filter(item => ['lba', 'interest', 'jurisdiction'].includes(item.id)).map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <label
                        key={item.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleItem(item.id);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isChecked}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                          isChecked
                            ? 'bg-teal-50 border-teal-300'
                            : item.critical
                            ? 'bg-white border-red-200 hover:border-red-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id)}
                          tabIndex={-1}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-teal-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isChecked ? 'text-teal-700' : 'text-slate-900'}`}>
                              {item.label}
                            </span>
                            {item.critical && !isChecked && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                REQUIRED
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isChecked ? 'text-teal-600' : 'text-slate-500'}`}>
                            {item.description}
                          </p>
                        </div>
                        {isChecked && (
                          <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Evidence & Preparation Group */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Evidence & Preparation</h4>
                <div className="space-y-2">
                  {CHECKLIST_ITEMS.filter(item => ['addresses', 'evidence', 'legal_advice'].includes(item.id)).map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <label
                        key={item.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            toggleItem(item.id);
                          }
                        }}
                        role="checkbox"
                        aria-checked={isChecked}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                          isChecked
                            ? 'bg-teal-50 border-teal-300'
                            : item.critical
                            ? 'bg-white border-red-200 hover:border-red-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(item.id)}
                          tabIndex={-1}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-teal-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-sm ${isChecked ? 'text-teal-700' : 'text-slate-900'}`}>
                              {item.label}
                            </span>
                            {item.critical && !isChecked && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                REQUIRED
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isChecked ? 'text-teal-600' : 'text-slate-500'}`}>
                            {item.description}
                          </p>
                        </div>
                        {isChecked && (
                          <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-600">
                  Critical Items: {criticalItems.filter(i => checkedItems.has(i.id)).length} / {criticalItems.length}
                </span>
                <span className="text-slate-600">
                  All Items: {checkedItems.size} / {CHECKLIST_ITEMS.length}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out ${
                    allCriticalChecked ? 'bg-teal-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${(criticalItems.filter(i => checkedItems.has(i.id)).length / criticalItems.length) * 100}%`
                  }}
                />
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
