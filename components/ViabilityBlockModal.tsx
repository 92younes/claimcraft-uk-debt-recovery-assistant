import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Scale, FileWarning } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ViabilityIssue {
  type: 'statute_barred' | 'defendant_dissolved' | 'exceeds_track' | 'other';
  message: string;
}

interface ViabilityBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  issues: ViabilityIssue[];
}

export const ViabilityBlockModal: React.FC<ViabilityBlockModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  issues
}) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleProceed = () => {
    if (hasAcknowledged) {
      onProceed();
      onClose();
      setHasAcknowledged(false);
    }
  };

  const handleClose = () => {
    setHasAcknowledged(false);
    onClose();
  };

  const getIssueIcon = (type: ViabilityIssue['type']) => {
    switch (type) {
      case 'statute_barred':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'defendant_dissolved':
        return <FileWarning className="w-5 h-5 text-red-500" />;
      case 'exceeds_track':
        return <Scale className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getIssueTitle = (type: ViabilityIssue['type']) => {
    switch (type) {
      case 'statute_barred':
        return 'Limitation Act 1980';
      case 'defendant_dissolved':
        return 'Company Status';
      case 'exceeds_track':
        return 'Court Track';
      default:
        return 'Viability Issue';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Claim Viability Warning"
      description="Our assessment found serious issues that may make this claim unviable."
      maxWidthClassName="max-w-lg"
      titleIcon={(
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
      )}
      footer={(
        <div className="w-full flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            Go Back
          </Button>
          <Button
            variant="danger"
            onClick={handleProceed}
            disabled={!hasAcknowledged}
            className="flex-1"
          >
            Proceed Anyway
          </Button>
        </div>
      )}
    >
      <div className="space-y-6">
          <p className="text-base text-slate-600 leading-relaxed">
            Our legal assessment has identified serious issues that may make this claim unviable or inadvisable:
          </p>

          {/* Issues List */}
          <div className="space-y-3">
            {issues.map((issue, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3"
              >
                {getIssueIcon(issue.type)}
                <div>
                  <h4 className="font-bold text-red-900 text-sm">{getIssueTitle(issue.type)}</h4>
                  <p className="text-red-800 text-sm mt-1">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Legal Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-bold text-amber-900 text-sm mb-2">Legal Implications</h4>
            <ul className="text-amber-800 text-sm space-y-1 list-disc list-inside">
              <li>Court fees and legal costs may be unrecoverable</li>
              <li>The claim may be struck out or dismissed</li>
              <li>You may be liable for the defendant's costs</li>
              <li>Proceeding knowingly may constitute abuse of process</li>
            </ul>
          </div>

          {/* Recommendation */}
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
            <p className="text-slate-700 text-sm">
              <strong>Recommendation:</strong> We strongly advise seeking professional legal advice before proceeding.
              Consider consulting a solicitor or Citizens Advice for guidance on your options.
            </p>
          </div>

          {/* Acknowledgment Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-2 focus:ring-red-500/30"
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              I understand that this claim has significant viability issues and may be unsuccessful.
              I acknowledge that I am proceeding at my own risk and accept full responsibility for
              any costs or consequences that may arise.
            </span>
          </label>
      </div>
    </Modal>
  );
};
