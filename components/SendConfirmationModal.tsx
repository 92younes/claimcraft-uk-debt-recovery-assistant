import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Mail, MapPin, FileText, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { ClaimState, DocumentType } from '../types';
import { getCurrencySymbol } from '../utils/calculations';

interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  claim: ClaimState;
  sendMethod: 'email' | 'post';
  isLoading?: boolean;
}

const getDocumentName = (docType: DocumentType): string => {
  switch (docType) {
    case DocumentType.LBA:
      return 'Letter Before Action';
    case DocumentType.FORM_N1:
      return 'Form N1 Claim Form';
    case DocumentType.POLITE_CHASER:
      return 'Payment Reminder';
    case DocumentType.PART_36_OFFER:
      return 'Part 36 Settlement Offer';
    case DocumentType.INSTALLMENT_AGREEMENT:
      return 'Installment Agreement';
    default:
      return 'Document';
  }
};

export const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  claim,
  sendMethod,
  isLoading = false
}) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
    }
  };

  // Reset confirmation when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmed(false);
    }
  }, [isOpen]);

  const currencySymbol = getCurrencySymbol(claim.invoice?.currency);
  const totalClaim = (claim.invoice?.totalAmount || 0) + (claim.interest?.totalInterest || 0) + (claim.compensation || 0);
  const isLBA = claim.selectedDocType === DocumentType.LBA;

  // Check if email is missing when email method is selected
  const isEmailMissing = sendMethod === 'email' && !claim.defendant.email?.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sendMethod === 'email' ? 'Confirm Email' : 'Confirm Postal Delivery'}
      description="Please verify the details below before sending"
      maxWidthClassName="max-w-lg"
    >
      <div className="space-y-4">
        {/* Recipient */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start gap-3">
            {sendMethod === 'email' ? (
              <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
            ) : (
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                {sendMethod === 'email' ? 'Sending To' : 'Postal Address'}
              </p>
              <p className="font-semibold text-slate-900 truncate">{claim.defendant.name}</p>
              {sendMethod === 'email' ? (
                claim.defendant.email ? (
                  <p className="text-sm text-slate-600">{claim.defendant.email}</p>
                ) : (
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Email address required</span>
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Please add the defendant's email address in the Verify Details step before sending by email.
                    </p>
                  </div>
                )
              ) : (
                <div className="text-sm text-slate-600">
                  <p>{claim.defendant.address}</p>
                  <p>{claim.defendant.city}{claim.defendant.county ? `, ${claim.defendant.county}` : ''}</p>
                  <p>{claim.defendant.postcode}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Details */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-teal-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">Document</p>
              <p className="font-semibold text-slate-900">{getDocumentName(claim.selectedDocType)}</p>
              <p className="text-sm text-slate-600">
                Claim Value: {currencySymbol}{totalClaim.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Attachments (for LBA) */}
        {isLBA && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Attachments</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Main Letter (Letter Before Action)
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Annex 1: Information Sheet
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Annex 2: Reply Form
              </li>
              {claim.evidence.length > 0 && (
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {claim.evidence.length} supporting document{claim.evidence.length !== 1 ? 's' : ''}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Legal Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Important</p>
              <p>
                {isLBA
                  ? 'This Letter Before Action is a formal legal document. Once sent, the debtor will have 30 days to respond before court proceedings can begin.'
                  : 'Once sent, this document becomes part of the formal record of your claim.'}
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-slate-200 hover:border-teal-300 transition-colors">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">
            I confirm that the recipient details and document content are correct, and I authorise sending this document.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!confirmed || isLoading || isEmailMissing}
          isLoading={isLoading}
          icon={!isLoading && <Send className="w-4 h-4" />}
        >
          {isEmailMissing ? 'Email Required' : (sendMethod === 'email' ? 'Open Email Client' : 'Send by Post')}
        </Button>
      </div>
    </Modal>
  );
};

export default SendConfirmationModal;
