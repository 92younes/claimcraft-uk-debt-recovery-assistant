import React from 'react';
import { Check, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../../types';
import { REFERRAL_SOURCES } from '../../../constants';
import { Select } from '../../ui/Input';

interface AccountTypeStepProps {
  data: Partial<UserProfile>;
  onChange: (updates: Partial<UserProfile>) => void;
  errors: Record<string, string>;
}

export const AccountTypeStep: React.FC<AccountTypeStepProps> = ({
  data,
  onChange,
  errors
}) => {
  const handleAuthoritySelect = (hasAuthority: boolean) => {
    onChange({ hasAuthority });
  };

  const handleReferralChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ referralSource: e.target.value });
  };

  const handleTosAccept = (accepted: boolean) => {
    onChange({ tosAcceptedAt: accepted ? new Date().toISOString() : '' });
  };

  const handleDisclaimerAccept = (accepted: boolean) => {
    onChange({ disclaimerAcceptedAt: accepted ? new Date().toISOString() : '' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Account type</h2>
        <p className="text-slate-500 mt-1">Choose your account type</p>
      </div>

      {/* Authority Question */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            Are you authorised to verify this company?
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            For security and compliance reasons, only company owners or authorised representatives can complete the verification process
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4" role="group" aria-label="Authority verification selection">
          <button
            type="button"
            onClick={() => handleAuthoritySelect(true)}
            aria-pressed={data.hasAuthority === true}
            aria-label="Yes, I have authority to verify this company"
            className={`
              relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${data.hasAuthority === true
                ? 'border-teal-500 bg-teal-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${data.hasAuthority === true ? 'bg-teal-500 text-white' : 'bg-slate-100 text-teal-600'}
            `}>
              <Check className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className={`font-semibold ${data.hasAuthority === true ? 'text-teal-700' : 'text-slate-900'}`}>
                Yes
              </p>
              <p className="text-xs text-slate-500">
                I have the authority to verify this company
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAuthoritySelect(false)}
            aria-pressed={data.hasAuthority === false}
            aria-label="No, I do not have authority to verify this company"
            className={`
              relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left
              focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
              ${data.hasAuthority === false
                ? 'border-red-300 bg-red-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${data.hasAuthority === false ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-red-400'}
            `}>
              <X className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className={`font-semibold ${data.hasAuthority === false ? 'text-red-700' : 'text-slate-900'}`}>
                No
              </p>
              <p className="text-xs text-slate-500">
                I do not have the authority to verify this company
              </p>
            </div>
          </button>
        </div>
        {errors.hasAuthority && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">{errors.hasAuthority}</p>
        )}
      </div>

      {/* Referral Source */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            How did you hear about us?
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Please let us know how you heard about ClaimCraft UK
          </p>
        </div>

        <Select
          label="Referral source"
          hideLabel
          value={data.referralSource || ''}
          onChange={handleReferralChange}
          options={[
            { value: '', label: 'Select an option' },
            ...REFERRAL_SOURCES
          ]}
          error={errors.referralSource}
          noMargin
        />
      </div>

      {/* Disclaimer Section */}
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Important Legal Notice
          </h3>
          <div className="text-slate-600 space-y-2 text-sm leading-relaxed">
            <p>
              <strong className="text-slate-900">ClaimCraft UK is a document preparation service.</strong> We are NOT a law firm,
              solicitors, or legal advisors. We do NOT provide legal advice.
            </p>
            <p>
              All documents are generated using AI and MUST be reviewed by a qualified solicitor
              before use in court proceedings.
            </p>
          </div>

          {/* Acknowledgements */}
          <div className="mt-4 pt-4 border-t border-amber-200">
            <h4 className="font-semibold text-slate-900 text-sm mb-2">By using this service, you acknowledge:</h4>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex gap-2">
                <span className="text-teal-500">•</span>
                <span>You are responsible for verifying all information is correct and truthful</span>
              </div>
              <div className="flex gap-2">
                <span className="text-teal-500">•</span>
                <span>AI-generated documents may contain errors and must be reviewed carefully</span>
              </div>
              <div className="flex gap-2">
                <span className="text-teal-500">•</span>
                <span>You should consult a qualified solicitor before filing documents</span>
              </div>
              <div className="flex gap-2">
                <span className="text-teal-500">•</span>
                <span>No solicitor-client relationship is created by using this service</span>
              </div>
            </div>
          </div>
        </div>

        {/* What We Provide */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-teal-500" />
            What We DO Provide
          </h3>
          <ul className="text-slate-600 space-y-1 text-xs">
            <li className="flex gap-2">
              <span className="text-teal-500">✓</span>
              <span>Document templates based on UK Civil Procedure Rules</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500">✓</span>
              <span>AI-powered document drafting assistance</span>
            </li>
            <li className="flex gap-2">
              <span className="text-teal-500">✓</span>
              <span>Legal compliance checks & procedural guidance</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Terms of Service */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Terms of Service</h3>
        <p className="text-sm text-slate-500">
          Please read and accept our terms of service to continue. We limit our liability as set out in the attached terms of service.
        </p>

        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={!!data.tosAcceptedAt && !!data.disclaimerAcceptedAt}
              onChange={(e) => {
                handleTosAccept(e.target.checked);
                handleDisclaimerAccept(e.target.checked);
              }}
              aria-label="Accept Terms of Service and acknowledge legal disclaimer"
              className="sr-only peer"
            />
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/30 peer-focus-visible:ring-offset-2
              ${data.tosAcceptedAt && data.disclaimerAcceptedAt
                ? 'bg-teal-500 border-teal-500'
                : 'border-slate-300 group-hover:border-teal-400'
              }
            `}>
              {data.tosAcceptedAt && data.disclaimerAcceptedAt && (
                <Check className="w-3 h-3 text-white" aria-hidden="true" />
              )}
            </div>
          </div>
          <span className="text-sm text-slate-600">
            I accept ClaimCraft UK's{' '}
            <a href="/terms" target="_blank" className="text-teal-600 hover:underline font-medium">
              Terms of Service
            </a>
            {' '}and acknowledge the legal disclaimer above
          </span>
        </label>
        {(errors.tosAccepted || errors.disclaimerAccepted) && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">{errors.tosAccepted || errors.disclaimerAccepted}</p>
        )}
      </div>
    </div>
  );
};
