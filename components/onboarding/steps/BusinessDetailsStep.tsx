import React from 'react';
import { User, Building2, Users, Briefcase, HelpCircle } from 'lucide-react';
import { UserProfile, BusinessType } from '../../../types';
import { BUSINESS_TYPES } from '../../../constants';
import { requiresCompanyNumber } from '../../../services/userProfileService';
import { Input } from '../../ui/Input';

interface BusinessDetailsStepProps {
  data: Partial<UserProfile>;
  onChange: (updates: Partial<UserProfile>) => void;
  errors: Record<string, string>;
}

const businessTypeIcons: Record<string, React.ReactNode> = {
  'Sole trader': <User className="w-5 h-5" />,
  'Limited company': <Building2 className="w-5 h-5" />,
  'Limited Liability Partnership': <Users className="w-5 h-5" />,
  'Partnership': <Users className="w-5 h-5" />,
  'Other': <Briefcase className="w-5 h-5" />
};

export const BusinessDetailsStep: React.FC<BusinessDetailsStepProps> = ({
  data,
  onChange,
  errors
}) => {
  const handleBusinessTypeSelect = (type: BusinessType) => {
    onChange({
      businessType: type,
      // Clear company number if switching to type that doesn't need it
      companyNumber: requiresCompanyNumber(type) ? data.companyNumber : undefined
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Business details</h2>
        <p className="text-slate-500 mt-1">Tell us about your business</p>
      </div>

      {/* Business Type Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            What type of business are you?
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            This will help us get you verified more quickly
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="group" aria-label="Business type selection">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleBusinessTypeSelect(type.value as BusinessType)}
              aria-pressed={data.businessType === type.value}
              aria-label={`${type.label}: ${type.description}`}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2
                ${data.businessType === type.value
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${data.businessType === type.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-100 text-teal-600'
                }
              `} aria-hidden="true">
                {businessTypeIcons[type.value]}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${data.businessType === type.value ? 'text-teal-700' : 'text-slate-900'}`}>
                  {type.label}
                </p>
                <p className="text-sm text-slate-500">
                  {type.description}
                </p>
              </div>
            </button>
          ))}
        </div>
        {errors.businessType && (
          <p className="text-sm text-red-500" role="alert" aria-live="polite">{errors.businessType}</p>
        )}
      </div>

      {/* Business Details Form */}
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">
            Please tell us a bit about your business
          </h3>
          <p className="text-sm text-slate-500 -mt-2 mb-4">
            We will use this information to set up your account
          </p>
        </div>

        {/* Business Name */}
        <Input
          label="Business name"
          value={data.businessName || ''}
          onChange={(e) => onChange({ businessName: e.target.value })}
          placeholder="Enter your business name"
          required
          error={errors.businessName}
        />

        {/* Business Description */}
        <Input
          label="Business description"
          value={data.businessDescription || ''}
          onChange={(e) => onChange({ businessDescription: e.target.value })}
          placeholder="e.g., Accounting, Construction, Consulting"
          helpText="Optional - helps us understand your business"
        />

        {/* Company Number (conditional) */}
        {data.businessType && requiresCompanyNumber(data.businessType as BusinessType) && (
          <div className="space-y-2">
            <div className="relative">
              <Input
                label="Company registration number"
                value={data.companyNumber || ''}
                onChange={(e) => onChange({ companyNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., 12345678 or SC123456"
                required
                error={errors.companyNumber}
                noMargin
              />
              <div className="absolute right-3 top-9 -translate-y-1/2">
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <div
                    role="tooltip"
                    className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10"
                  >
                    Find your company number on Companies House or your certificate of incorporation
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              You can find this on{' '}
              <a
                href="https://find-and-update.company-information.service.gov.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                Companies House
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
