import React from 'react';
import { ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../../types';

interface VerificationStepProps {
  data: Partial<UserProfile>;
  onChange: (updates: Partial<UserProfile>) => void;
  errors: Record<string, string>;
}

export const VerificationStep: React.FC<VerificationStepProps> = ({
  data,
  onChange,
}) => {
  // For now, we skip verification and mark as not required
  React.useEffect(() => {
    if (data.kycStatus !== 'not_required') {
      onChange({ kycStatus: 'not_required' });
    }
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Identity verification</h2>
        <p className="text-slate-500 mt-1">Verify your identity</p>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-teal-600" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Identity Verification Coming Soon
        </h3>

        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          We're working on adding identity verification to enhance security and compliance.
          For now, you can proceed without verification.
        </p>

        <div className="bg-white border border-slate-200 rounded-xl p-4 max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-900 text-sm">Estimated time</p>
              <p className="text-xs text-slate-500">~4 minutes when available</p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
        <h4 className="font-semibold text-teal-800 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          You're almost done!
        </h4>
        <p className="text-sm text-teal-700 mb-3">
          Click "Complete Setup" to finish your account setup and start using ClaimCraft UK.
        </p>
        <ul className="text-sm text-teal-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-1">✓</span>
            <span>Your business details have been saved</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-1">✓</span>
            <span>Your address will pre-fill in future claims</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 mt-1">✓</span>
            <span>You can update your profile anytime from settings</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
