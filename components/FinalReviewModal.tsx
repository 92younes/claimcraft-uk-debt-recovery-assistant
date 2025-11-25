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
import { CheckCircle, AlertTriangle, FileCheck, X, Eye } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

interface FinalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  claimData: {
    claimantName: string;
    debtorName: string;
    invoiceNumber: string;
    invoiceAmount: number;
    interest: number;
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
    description: 'Interest rate matches party types (12.75% B2B, 8% B2C)',
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

  const handleConfirm = () => {
    if (canProceed) {
      onConfirm();
      // Only reset after successful confirmation
      setCheckedItems(new Set());
      setAcknowledgesConsequences(false);
    }
  };

  const handleClose = () => {
    // Don't reset state on close - preserve user progress
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Final Review Checklist</h2>
              <p className="text-blue-100 text-sm mt-0.5">Last Check Before Filing</p>
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
          {/* Claim Summary */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Claim Summary
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Claimant</p>
                <p className="font-medium text-slate-900">{claimData.claimantName}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Defendant</p>
                <p className="font-medium text-slate-900">{claimData.debtorName}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Invoice Number</p>
                <p className="font-medium text-slate-900">{claimData.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Invoice Amount</p>
                <p className="font-medium text-slate-900">£{claimData.invoiceAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Interest</p>
                <p className="font-medium text-slate-900">£{claimData.interest.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-600 text-xs uppercase font-bold mb-1">Court Fee</p>
                <p className="font-medium text-slate-900">£{claimData.courtFee.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-slate-200">
              <div className="flex justify-between items-center">
                <p className="font-bold text-slate-700">Total Claim Amount:</p>
                <p className="font-bold text-2xl text-blue-600">£{claimData.totalClaim.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Statement of Truth Reminder */}
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 text-lg mb-2">Critical Reminder: Statement of Truth</h3>
                <p className="text-sm text-red-900 mb-3">
                  This Form N1 contains a <span className="font-bold">Statement of Truth</span> under CPR Part 22.
                  False statements are <span className="font-bold">contempt of court - a criminal offence</span> punishable by
                  imprisonment, unlimited fines, and immediate claim dismissal.
                </p>
                <div className="bg-white border border-red-200 rounded-lg p-3 text-xs text-red-800 italic">
                  "I believe that the facts stated in this claim form are true. I understand that proceedings for contempt
                  of court may be brought against anyone who makes, or causes to be made, a false statement in a document
                  verified by a statement of truth without an honest belief in its truth."
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Filing Checklist */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Pre-Filing Checklist</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please confirm you have completed ALL critical items below. Non-critical items are recommended but optional.
            </p>

            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      isChecked
                        ? 'bg-green-50 border-green-300'
                        : item.critical
                        ? 'bg-white border-red-200 hover:border-red-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      className="mt-1 w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-sm ${isChecked ? 'text-green-900' : 'text-slate-900'}`}>
                          {item.label}
                        </span>
                        {item.critical && !isChecked && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${isChecked ? 'text-green-800' : 'text-slate-600'}`}>
                        {item.description}
                      </p>
                    </div>
                    {isChecked && (
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    )}
                  </label>
                );
              })}
            </div>

            {/* Progress Indicator */}
            <div className="mt-4 pt-4 border-t border-slate-200">
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
                  className={`h-full transition-all duration-200 ${
                    allCriticalChecked ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${(criticalItems.filter(i => checkedItems.has(i.id)).length / criticalItems.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Final Acknowledgment */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acknowledgesConsequences}
                onChange={(e) => setAcknowledgesConsequences(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-900 group-hover:text-slate-700">
                <span className="font-bold">I confirm that:</span>
                <ul className="mt-2 space-y-1.5 ml-4 list-disc">
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
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-900">
                <span className="font-bold">Not Ready to Proceed:</span> Please complete all critical checklist items
                and read the final acknowledgment above before downloading Form N1.
              </p>
            </div>
          )}

          {/* Solicitor Recommendation */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 text-center">
            <p className="text-sm text-slate-700">
              <span className="font-bold">Final Recommendation:</span> Have a solicitor review your Form N1 before filing.
              Even a brief consultation (£100-£300) can identify critical errors and save you thousands in potential
              costs if your claim is struck out.
            </p>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-200 p-6 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel - Review Document
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 shadow-md disabled:shadow-none"
          >
            {canProceed ? 'Download Form N1' : `Complete ${criticalItems.length - criticalItems.filter(i => checkedItems.has(i.id)).length} Critical Items`}
          </button>
        </div>
      </div>
    </div>
  );
};
