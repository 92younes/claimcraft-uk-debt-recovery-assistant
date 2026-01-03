import React from 'react';
import { Building2, PoundSterling, Clock, FileText } from 'lucide-react';
import { ClaimState, DocumentType } from '../types';
import { getCurrencySymbol } from '../utils/calculations';

interface ClaimSummaryCardProps {
  claim: ClaimState;
  className?: string;
}

const getDocumentTypeLabel = (docType: DocumentType): string => {
  switch (docType) {
    case DocumentType.LBA:
      return 'LBA';
    case DocumentType.FORM_N1:
      return 'Form N1';
    case DocumentType.POLITE_CHASER:
      return 'Reminder';
    case DocumentType.PART_36_OFFER:
      return 'Part 36';
    case DocumentType.INSTALLMENT_AGREEMENT:
      return 'Agreement';
    default:
      return 'Document';
  }
};

export const ClaimSummaryCard: React.FC<ClaimSummaryCardProps> = ({ claim, className = '' }) => {
  const currencySymbol = getCurrencySymbol(claim.invoice?.currency);
  const principal = claim.invoice?.totalAmount || 0;
  const interest = claim.interest?.totalInterest || 0;
  const compensation = claim.compensation || 0;
  const total = principal + interest + compensation;
  const daysOverdue = claim.interest?.daysOverdue || 0;
  const hasInterest = interest > 0 || compensation > 0;

  // Show placeholder if no defendant name (instead of hiding completely)
  const defendantName = claim.defendant?.name?.trim();

  return (
    <div className={`flex items-center gap-4 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 ${className}`}>
      {/* Debtor */}
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className={`w-4 h-4 flex-shrink-0 ${defendantName ? 'text-slate-400' : 'text-amber-400'}`} />
        {defendantName ? (
          <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]" title={defendantName}>
            {defendantName}
          </span>
        ) : (
          <span className="text-sm font-medium text-amber-600 italic">
            Defendant not set
          </span>
        )}
      </div>

      <div className="w-px h-4 bg-slate-300" />

      {/* Amount */}
      <div className="flex items-center gap-2">
        <PoundSterling className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-slate-900">
            {currencySymbol}{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {hasInterest && (
            <span className="text-xs text-teal-600">
              (+{currencySymbol}{(interest + compensation).toFixed(0)})
            </span>
          )}
        </div>
      </div>

      <div className="w-px h-4 bg-slate-300" />

      {/* Days Overdue */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className={`text-sm font-medium ${daysOverdue > 0 ? 'text-red-600' : 'text-slate-500'}`}>
          {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Not overdue'}
        </span>
      </div>

      {/* Document Type (if selected) */}
      {claim.selectedDocType && (
        <>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {getDocumentTypeLabel(claim.selectedDocType)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ClaimSummaryCard;
