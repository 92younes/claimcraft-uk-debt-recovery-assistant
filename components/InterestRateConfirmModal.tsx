/**
 * Interest Rate Confirmation Modal
 *
 * CRITICAL COMPLIANCE:
 * Interest rates are legally determined by party types:
 * - B2B: Late Payment of Commercial Debts Act 1998 - 12.75% (8% Bank of England + 8% statutory)
 * - B2C: County Courts Act 1984 - 8%
 *
 * Incorrect categorization can lead to:
 * - Overclaiming (abuse of process)
 * - Cost sanctions
 * - Claim struck out
 *
 * This modal ensures users verify their party types before proceeding.
 */

import React, { useState } from 'react';
import { Percent, Building2, User, AlertTriangle, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface InterestRateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  claimantType: 'company' | 'individual';
  debtorType: 'company' | 'individual';
  interestRate: number;
  totalInterest: number;
  invoiceAmount: number;
}

export const InterestRateConfirmModal: React.FC<InterestRateConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  claimantType,
  debtorType,
  interestRate,
  totalInterest,
  invoiceAmount
}) => {
  const [hasVerified, setHasVerified] = useState(false);

  const isB2B = claimantType === 'company' && debtorType === 'company';
  const expectedRate = isB2B ? 12.75 : 8;
  const rateIsCorrect = Math.abs(interestRate - expectedRate) < 0.01;

  const handleConfirm = () => {
    // Only allow confirmation if rate is correct AND verified
    if (hasVerified && rateIsCorrect) {
      onConfirm();
      setHasVerified(false);
    }
  };

  const handleClose = () => {
    onClose();
    setHasVerified(false);
  };

  const canProceed = hasVerified && rateIsCorrect;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Interest Rate Confirmation"
      description="Verify the party types and interest rate before proceeding."
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            {!rateIsCorrect ? 'Back - Fix Party Types' : 'Cancel - Review Party Types'}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed}
            variant={rateIsCorrect ? 'primary' : 'secondary'}
            className={!rateIsCorrect ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none hover:bg-slate-100' : 'flex-1'}
          >
            {!rateIsCorrect ? 'Cannot Proceed - Rate Incorrect' : hasVerified ? 'Confirm & Proceed' : 'Complete Verification Above'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
          {/* Party Types Summary */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Current Party Classification:</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Claimant */}
              <div className="bg-white border-2 border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {claimantType === 'company' ? (
                    <Building2 className="w-5 h-5 text-teal-600" />
                  ) : (
                    <User className="w-5 h-5 text-teal-600" />
                  )}
                  <span className="text-xs font-bold text-slate-500 uppercase">Claimant (You)</span>
                </div>
                <p className="font-bold text-slate-900 text-lg capitalize">{claimantType}</p>
              </div>

              {/* Debtor */}
              <div className="bg-white border-2 border-teal-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {debtorType === 'company' ? (
                    <Building2 className="w-5 h-5 text-teal-600" />
                  ) : (
                    <User className="w-5 h-5 text-teal-600" />
                  )}
                  <span className="text-xs font-bold text-slate-500 uppercase">Defendant (Debtor)</span>
                </div>
                <p className="font-bold text-slate-900 text-lg capitalize">{debtorType}</p>
              </div>
            </div>
          </div>

          {/* Interest Calculation */}
          <div className={`border-2 rounded-xl p-5 ${rateIsCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-start gap-3 mb-4">
              {rateIsCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className={`font-bold text-lg ${rateIsCorrect ? 'text-green-900' : 'text-red-900'}`}>
                  {isB2B ? 'Business-to-Business (B2B) Claim' : 'Business-to-Consumer (B2C) or Mixed Claim'}
                </h3>
                <p className={`text-sm mt-1 ${rateIsCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {isB2B
                    ? 'Late Payment of Commercial Debts (Interest) Act 1998 applies'
                    : 'County Courts Act 1984 s.69 applies'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Invoice Amount:</span>
                <span className="font-bold text-slate-900">£{invoiceAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Interest Rate:</span>
                <span className="font-bold text-lg text-teal-700">{interestRate}% per annum</span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">Total Interest:</span>
                <span className="font-bold text-xl text-slate-900">£{totalInterest.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Legal Explanation */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-5">
            <h3 className="font-bold text-teal-900 text-lg mb-3">Interest Rate Rules:</h3>
            <div className="space-y-3 text-sm text-teal-900">
              <div className="bg-white border border-teal-200 rounded-lg p-3">
                <p className="font-bold flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4" />
                  Business-to-Business (B2B): 12.75%
                </p>
                <p className="text-xs text-teal-800">
                  When BOTH parties are companies/LLPs - Late Payment of Commercial Debts Act 1998
                  (4.75% Bank of England base rate + 8% statutory = 12.75% total)
                </p>
              </div>
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Rate based on BoE base rate as of Jan 2025. Verify current rate at bankofengland.co.uk before filing.
              </p>

              <div className="bg-white border border-teal-200 rounded-lg p-3">
                <p className="font-bold flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  Business-to-Consumer (B2C) or Mixed: 8%
                </p>
                <p className="text-xs text-teal-800">
                  When either party is an individual - County Courts Act 1984 s.69
                </p>
              </div>
            </div>
          </div>

          {/* Warning about incorrect classification */}
          {!rateIsCorrect && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-red-900">
                  <p className="font-bold text-lg">Interest Rate Mismatch Detected</p>
                  <p>
                    Based on your party types ({claimantType} vs {debtorType}), the expected interest rate is{' '}
                    <span className="font-bold">{expectedRate}%</span>, but the calculated rate is{' '}
                    <span className="font-bold">{interestRate}%</span>.
                  </p>
                  <p className="bg-white border border-red-200 rounded p-2 font-medium">
                    ⚠️ Please verify your party types are correct before proceeding. Incorrect interest rates can lead
                    to your claim being struck out or cost sanctions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Consequences of Incorrect Rate */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
            <h3 className="font-bold text-amber-900 text-lg mb-3">Risks of Incorrect Classification:</h3>
            <ul className="space-y-2 text-sm text-amber-900">
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <span><span className="font-bold">Overclaiming:</span> Claiming too much interest is abuse of process</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <span><span className="font-bold">Cost Sanctions:</span> Court may order you to pay defendant's legal costs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <span><span className="font-bold">Claim Struck Out:</span> Entire claim could be dismissed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <span><span className="font-bold">Criminal Liability:</span> Intentional overclaiming could be contempt of court</span>
              </li>
            </ul>
          </div>

          {/* Verification Checkbox */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={hasVerified}
                onChange={(e) => setHasVerified(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-sm text-slate-900 group-hover:text-slate-700">
                <span className="font-bold">I confirm that:</span>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>I have verified the party types (company vs individual) are correct</li>
                  <li>I understand the interest rate is {interestRate}% based on this classification</li>
                  <li>I understand the consequences of incorrect classification</li>
                  <li>The total interest amount of £{totalInterest.toFixed(2)} is correct</li>
                </ul>
              </span>
            </label>
          </div>
      </div>
    </Modal>
  );
};
