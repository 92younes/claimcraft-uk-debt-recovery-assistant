import React, { useMemo } from 'react';
import { PartyType } from '../types';
import { calculateInterest, calculateCompensation, calculateCourtFee } from '../services/legalRules';
import { LATE_PAYMENT_ACT_RATE, BOE_BASE_RATE } from '../constants';
import { Calculator, TrendingUp, Clock, PoundSterling, Info, HelpCircle, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from './ui/Tooltip';

interface InterestPreviewProps {
  amount: number;
  dateIssued: string;
  dueDate?: string;
  claimantType: PartyType;
  defendantType: PartyType;
  className?: string;
}

export const InterestPreview: React.FC<InterestPreviewProps> = ({
  amount,
  dateIssued,
  dueDate,
  claimantType,
  defendantType,
  className = '',
}) => {
  // Calculate interest data
  const interestData = useMemo(() => {
    return calculateInterest(amount, dateIssued, dueDate, claimantType, defendantType);
  }, [amount, dateIssued, dueDate, claimantType, defendantType]);

  // Calculate compensation (B2B only)
  const compensation = useMemo(() => {
    return calculateCompensation(amount, claimantType, defendantType);
  }, [amount, claimantType, defendantType]);

  // Determine if B2B transaction
  const isClaimantBusiness = claimantType === PartyType.BUSINESS || claimantType === PartyType.SOLE_TRADER;
  const isDefendantBusiness = defendantType === PartyType.BUSINESS || defendantType === PartyType.SOLE_TRADER;
  const isB2B = isClaimantBusiness && isDefendantBusiness;

  // Calculate applicable rate
  const applicableRate = isB2B ? LATE_PAYMENT_ACT_RATE : 8.0;
  const rateLegalBasis = isB2B
    ? `Late Payment of Commercial Debts Act 1998 (BoE ${BOE_BASE_RATE}% + 8%)`
    : 'County Courts Act 1984 s.69';

  // Total claim value
  const totalClaimValue = amount + interestData.totalInterest + compensation;

  // Calculate estimated court fees using centralized function from legalRules
  const courtFee = useMemo(() => {
    return calculateCourtFee(totalClaimValue);
  }, [totalClaimValue]);

  // State for court fees accordion
  const [showCourtFees, setShowCourtFees] = useState(false);

  // Don't render if no amount or date
  if (!amount || !dateIssued) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
          <Calculator className="w-4 h-4 text-teal-600" />
        </div>
        <h4 className="font-semibold text-slate-900">Interest Calculator Preview</h4>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Days Overdue */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            <span>Days Overdue</span>
          </div>
          <p className={`text-xl font-bold ${interestData.daysOverdue > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {interestData.daysOverdue}
          </p>
        </div>

        {/* Daily Rate */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>Daily Rate</span>
          </div>
          <p className="text-xl font-bold text-slate-700">
            {interestData.dailyRate > 0 ? `£${interestData.dailyRate.toFixed(2)}` : '£0.00'}
          </p>
        </div>

        {/* Total Interest */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <PoundSterling className="w-3 h-3" />
            <span>Interest Accrued</span>
          </div>
          <p className={`text-xl font-bold ${interestData.totalInterest > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            £{interestData.totalInterest.toFixed(2)}
          </p>
        </div>

        {/* Compensation (B2B only) */}
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
            <PoundSterling className="w-3 h-3" />
            <span>Compensation</span>
            <Tooltip content="Fixed fee under Late Payment Act 1998: £40 (up to £999), £70 (£1,000-£9,999), or £100 (£10,000+). B2B claims only." position="top">
              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-teal-500 cursor-help" />
            </Tooltip>
          </div>
          <p className={`text-xl font-bold ${compensation > 0 ? 'text-teal-600' : 'text-slate-400'}`}>
            {compensation > 0 ? `£${compensation.toFixed(2)}` : 'N/A'}
          </p>
          {!isB2B && (
            <p className="text-[10px] text-slate-400 mt-0.5">B2B only</p>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pt-3 border-t border-slate-200">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-500 break-words">
            <div className="flex items-center gap-1">
              <p className="font-medium text-slate-600">Interest Rate: {applicableRate}% per annum</p>
              <Tooltip content={isB2B ? "Statutory interest for B2B debts: Bank of England base rate + 8%. This is your legal right under the Late Payment of Commercial Debts Act 1998." : "Standard court interest rate of 8% applies to non-B2B claims under County Courts Act 1984."} position="top">
                <HelpCircle className="w-3 h-3 text-slate-400 hover:text-teal-500 cursor-help" />
              </Tooltip>
            </div>
            <p className="leading-relaxed">{rateLegalBasis}</p>
          </div>
        </div>

        <div className="bg-teal-600 text-white rounded-lg px-4 py-2 text-center sm:text-right flex-shrink-0">
          <p className="text-xs text-teal-100">Total Claim Value</p>
          <p className="text-lg font-bold">£{totalClaimValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Info message if payment is not yet overdue */}
      {interestData.daysOverdue === 0 && (
        <div className="mt-3 p-3 bg-blue-100 border-2 border-blue-300 rounded-lg flex items-start gap-2">
          <span className="text-blue-600 text-lg leading-none">ℹ️</span>
          <p className="text-sm font-medium text-blue-800">
            Payment is not yet overdue. Interest will begin accruing after the due date passes.
          </p>
        </div>
      )}

      {/* Court Fees Estimate (collapsible) */}
      <div className="mt-3">
        <button
          onClick={() => setShowCourtFees(!showCourtFees)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Estimated Court Fees</span>
            <Tooltip content="Fees apply if proceeding to court via Money Claim Online (MCOL). Fees are set by HMCTS and may change." position="top">
              <HelpCircle className="w-3 h-3 text-slate-400 hover:text-teal-500 cursor-help" />
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">£{courtFee.toLocaleString()}</span>
            {showCourtFees ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showCourtFees && (
          <div className="mt-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
            <p className="mb-2">If proceeding to court, you'll pay:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Court Issue Fee:</p>
                <p className="font-semibold text-slate-700">£{courtFee.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">Total Outlay:</p>
                <p className="font-semibold text-slate-700">£{(totalClaimValue + courtFee).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Court fees can be added to your claim if successful. Fees based on HMCTS Money Claim Online rates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterestPreview;
