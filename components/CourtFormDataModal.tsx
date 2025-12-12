import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { CourtFormData, DocumentType } from '../types';
import { FileText, Calendar, Users, Scale, HelpCircle } from 'lucide-react';

interface CourtFormDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CourtFormData) => void;
  documentType: DocumentType;
  existingData?: CourtFormData;
}

export const CourtFormDataModal: React.FC<CourtFormDataModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  documentType,
  existingData
}) => {
  const [formData, setFormData] = useState<CourtFormData>(existingData || {});

  useEffect(() => {
    if (existingData) {
      setFormData(existingData);
    }
  }, [existingData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const updateField = <K extends keyof CourtFormData>(field: K, value: CourtFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Determine which form to show based on document type
  const isN225A = documentType === 'N225A';
  const isN180 = documentType === 'N180';
  const isN225 = documentType === 'N225';

  const getTitle = () => {
    if (isN225A) return 'N225A - Request for Judgment on Admission';
    if (isN180) return 'N180 - Directions Questionnaire';
    if (isN225) return 'N225 - Request for Judgment';
    return 'Court Form Details';
  };

  const getDescription = () => {
    if (isN225A) return 'Please provide details about the defendant\'s admission and your proposed payment terms.';
    if (isN180) return 'Please answer these questions to help the court allocate your case to the appropriate track.';
    if (isN225) return 'Please provide the claim number and any additional details.';
    return 'Please complete the required information for this court form.';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      description={getDescription()}
      maxWidthClassName="max-w-2xl"
      titleIcon={
        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-teal-600" />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Common Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-teal-600" />
            Claim Details
          </h3>
          <Input
            label="Claim Number (if known)"
            placeholder="e.g., A12YX345"
            value={formData.claimNumber || ''}
            onChange={(e) => updateField('claimNumber', e.target.value)}
            helpText="Leave blank if your claim hasn't been issued yet"
          />
        </div>

        {/* N225A Specific Fields */}
        {isN225A && (
          <div className="space-y-4 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Admission Details
            </h3>
            <Input
              label="Date Defendant Admitted"
              type="date"
              value={formData.admissionDate || ''}
              onChange={(e) => updateField('admissionDate', e.target.value)}
              required
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Defendant's Proposed Payment Terms
              </label>
              <textarea
                value={formData.defendantProposal || ''}
                onChange={(e) => updateField('defendantProposal', e.target.value)}
                placeholder="e.g., £50 per month starting from 1st of next month"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Your Proposed Payment Terms
              </label>
              <textarea
                value={formData.claimantPaymentTerms || ''}
                onChange={(e) => updateField('claimantPaymentTerms', e.target.value)}
                placeholder="e.g., Payment in full within 14 days, or monthly installments of £100"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                rows={3}
              />
              <p className="text-xs text-slate-500">Leave blank to default to "Payment in full within 14 days"</p>
            </div>
            <Input
              label="Monthly Installment Amount (if applicable)"
              type="number"
              placeholder="e.g., 100"
              value={formData.installmentAmount?.toString() || ''}
              onChange={(e) => updateField('installmentAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
              helpText="Enter if you're proposing installment payments"
            />
          </div>
        )}

        {/* N180 Specific Fields */}
        {isN180 && (
          <>
            {/* Settlement Section */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                Settlement & Mediation
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="wantsSettlementStay"
                    checked={formData.wantsSettlementStay !== false}
                    onChange={(e) => updateField('wantsSettlementStay', e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 rounded border-slate-300"
                  />
                  <div>
                    <label htmlFor="wantsSettlementStay" className="text-sm font-medium text-slate-900">
                      Request a stay to attempt settlement
                    </label>
                    <p className="text-xs text-slate-500">
                      A stay pauses court proceedings to allow time for negotiation
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="wantsMediation"
                    checked={formData.wantsMediation !== false}
                    onChange={(e) => updateField('wantsMediation', e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 rounded border-slate-300"
                  />
                  <div>
                    <label htmlFor="wantsMediation" className="text-sm font-medium text-slate-900">
                      Willing to try mediation
                    </label>
                    <p className="text-xs text-slate-500">
                      Free mediation service for small claims under £10,000
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Witnesses Section */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Witnesses
              </h3>
              <Input
                label="Number of Witnesses"
                type="number"
                min="1"
                max="10"
                value={formData.witnessCount?.toString() || '1'}
                onChange={(e) => updateField('witnessCount', parseInt(e.target.value) || 1)}
                helpText="Include yourself if you will give evidence"
              />
            </div>

            {/* Hearing Section */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                Hearing
              </h3>
              <Input
                label="Estimated Hearing Duration (hours)"
                type="number"
                min="1"
                max="8"
                value={formData.estimatedHearingDuration?.toString() || '1'}
                onChange={(e) => updateField('estimatedHearingDuration', parseInt(e.target.value) || 1)}
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Dates You Cannot Attend <span className="text-slate-400">(Optional)</span>
                </label>
                <textarea
                  value={formData.unavailableDates || ''}
                  onChange={(e) => updateField('unavailableDates', e.target.value)}
                  placeholder="e.g., 15-20 March 2025 (pre-booked holiday), 5 April 2025 (medical appointment)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  rows={2}
                />
                <p className="text-xs text-slate-500">
                  List any dates in the next 6 months when you cannot attend court
                </p>
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-600" />
                Additional Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="needsExpert"
                    checked={formData.needsExpert || false}
                    onChange={(e) => updateField('needsExpert', e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 rounded border-slate-300"
                  />
                  <div>
                    <label htmlFor="needsExpert" className="text-sm font-medium text-slate-900">
                      I need expert evidence
                    </label>
                    <p className="text-xs text-slate-500">
                      E.g., surveyor, medical expert, accountant
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="hasDisability"
                    checked={formData.hasDisability || false}
                    onChange={(e) => updateField('hasDisability', e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 rounded border-slate-300"
                  />
                  <div>
                    <label htmlFor="hasDisability" className="text-sm font-medium text-slate-900">
                      I have a disability affecting my attendance
                    </label>
                    <p className="text-xs text-slate-500">
                      The court can make special arrangements
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="claimLossOfEarnings"
                    checked={formData.claimLossOfEarnings || false}
                    onChange={(e) => updateField('claimLossOfEarnings', e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 rounded border-slate-300"
                  />
                  <div>
                    <label htmlFor="claimLossOfEarnings" className="text-sm font-medium text-slate-900">
                      I will claim loss of earnings for attending
                    </label>
                    <p className="text-xs text-slate-500">
                      You may be able to recover this from the other party
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            Save & Continue
          </Button>
        </div>
      </form>
    </Modal>
  );
};
