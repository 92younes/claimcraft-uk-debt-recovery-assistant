import React from 'react';
import { User, Building2, Users, Briefcase, HelpCircle } from 'lucide-react';
import { UserProfile, BusinessType } from '../../../types';
import { BUSINESS_TYPES } from '../../../constants';
import { requiresCompanyNumber } from '../../../services/userProfileService';

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

        <div className="space-y-3">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => handleBusinessTypeSelect(type.value as BusinessType)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
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
              `}>
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
          <p className="text-sm text-red-500">{errors.businessType}</p>
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Business name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.businessName || ''}
            onChange={(e) => onChange({ businessName: e.target.value })}
            placeholder="Enter your business name"
            className={`
              w-full px-4 py-3 border rounded-xl bg-white text-slate-900
              focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
              ${errors.businessName ? 'border-red-300' : 'border-slate-200'}
            `}
          />
          {errors.businessName && (
            <p className="text-sm text-red-500">{errors.businessName}</p>
          )}
        </div>

        {/* Business Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Business description
          </label>
          <input
            type="text"
            value={data.businessDescription || ''}
            onChange={(e) => onChange({ businessDescription: e.target.value })}
            placeholder="e.g., Accounting, Construction, Consulting"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
          <p className="text-xs text-slate-400">Optional - helps us understand your business</p>
        </div>

        {/* Company Number (conditional) */}
        {data.businessType && requiresCompanyNumber(data.businessType as BusinessType) && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Company registration number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.companyNumber || ''}
                onChange={(e) => onChange({ companyNumber: e.target.value.toUpperCase() })}
                placeholder="e.g., 12345678 or SC123456"
                className={`
                  w-full px-4 py-3 border rounded-xl bg-white text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  ${errors.companyNumber ? 'border-red-300' : 'border-slate-200'}
                `}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Find your company number on Companies House or your certificate of incorporation
                  </div>
                </div>
              </div>
            </div>
            {errors.companyNumber && (
              <p className="text-sm text-red-500">{errors.companyNumber}</p>
            )}
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
