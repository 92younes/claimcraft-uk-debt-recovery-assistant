import React, { useState } from 'react';
import { ClaimState } from '../types';
import { Copy, ExternalLink, CheckCircle, X, AlertTriangle } from 'lucide-react';

interface McolSidecarProps {
  claim: ClaimState;
  onClose: () => void;
}

export const McolSidecar: React.FC<McolSidecarProps> = ({ claim, onClose }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const totalClaimAmount = (
    claim.invoice.totalAmount + 
    claim.interest.totalInterest + 
    claim.compensation
  ).toFixed(2);

  // MCOL limit is 1080 characters for Particulars of Claim
  const particularsText = claim.generated?.briefDetails || 
    `Claim for outstanding invoice(s) ${claim.invoice.invoiceNumber} dated ${claim.invoice.dateIssued}.\n\n` +
    `The claimant claims the sum of £${claim.invoice.totalAmount.toFixed(2)} for ${claim.invoice.description || 'goods/services provided'}.\n\n` +
    `The claimant also claims interest under s.69 of the County Courts Act 1984 at a rate of 8% a year from ${claim.invoice.dueDate} to ${new Date().toLocaleDateString()} amounting to £${claim.interest.totalInterest.toFixed(2)} and continuing at a daily rate of £${claim.interest.dailyRate.toFixed(2)}.\n\n` +
    `The claimant also claims £${claim.compensation.toFixed(2)} compensation under the Late Payment of Commercial Debts (Interest) Act 1998.`;

  const isTooLong = particularsText.length > 1080;

  const fields = [
    {
      id: 'claimant_name',
      label: 'Claimant Name',
      value: claim.claimant.name,
      govLabel: 'About you > Name'
    },
    {
      id: 'claimant_address',
      label: 'Claimant Address',
      value: `${claim.claimant.address}, ${claim.claimant.city}, ${claim.claimant.postcode}`, // Flattened for copy-paste to single box if needed, or user can manually split
      govLabel: 'About you > Address'
    },
    {
      id: 'defendant_name',
      label: 'Defendant Name',
      value: claim.defendant.name,
      govLabel: 'The defendant > Name'
    },
    {
      id: 'claim_amount',
      label: 'Claim Amount',
      value: totalClaimAmount,
      govLabel: 'Claim amount > Amount'
    },
    {
      id: 'particulars',
      label: 'Particulars of Claim',
      value: particularsText,
      govLabel: 'Claim details > Reason for claim',
      isLong: true,
      warning: isTooLong ? `Text is ${particularsText.length} chars. MCOL limit is 1080.` : undefined
    }
  ];

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-300 animate-slide-in-right">
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-md">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            MCOL Assistant
          </h3>
          <p className="text-xs text-slate-300">Copy details to Money Claim Online</p>
        </div>
        <button onClick={onClose} className="hover:bg-slate-700 p-1 rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
        <strong>Instructions:</strong> We have opened the official MCOL website in a new tab. Use the buttons below to copy your verified data into the government form.
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {field.label}
              </label>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                Map to: {field.govLabel}
              </span>
            </div>
            
            <div className="relative group">
              {field.isLong ? (
                <>
                  <textarea 
                    readOnly 
                    value={field.value}
                    className={`w-full text-sm p-3 pr-10 bg-slate-50 border rounded-lg text-slate-600 h-32 focus:outline-none focus:ring-2 focus:ring-teal-500 ${field.warning ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  />
                  {field.warning && (
                    <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      {field.warning}
                    </div>
                  )}
                </>
              ) : (
                <input 
                  readOnly 
                  value={field.value}
                  className="w-full text-sm p-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
              
              <button
                onClick={() => handleCopy(field.value, field.id)}
                className={`absolute right-2 top-2 p-1.5 rounded-md transition-all ${
                  copiedField === field.id 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-white text-slate-400 opacity-0 group-hover:opacity-100 hover:text-teal-700 shadow-sm border border-slate-200'
                }`}
                title="Copy to clipboard"
              >
                {copiedField === field.id ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}

        <div className="pt-6 border-t border-gray-100 space-y-3">
            <p className="text-xs text-gray-500 text-center italic">
                Double-check all details on the MCOL website before submitting. You are responsible for the accuracy of your claim.
            </p>
          <a 
            href="https://www.moneyclaim.gov.uk/web/mcol/welcome" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium shadow-sm"
          >
            Open MCOL Website <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

