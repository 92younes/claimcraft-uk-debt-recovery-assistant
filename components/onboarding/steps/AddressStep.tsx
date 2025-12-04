import React from 'react';
import { Check } from 'lucide-react';
import { UserProfile, UserAddress } from '../../../types';
import { UK_COUNTIES, getCountyFromPostcode } from '../../../constants';

interface AddressStepProps {
  data: Partial<UserProfile>;
  onAddressChange: (updates: Partial<UserAddress>) => void;
  onChange: (updates: Partial<UserProfile>) => void;
  errors: Record<string, string>;
}

export const AddressStep: React.FC<AddressStepProps> = ({
  data,
  onAddressChange,
  onChange,
  errors
}) => {
  const address = data.businessAddress || {};

  const handlePostcodeBlur = () => {
    // Auto-fill county based on postcode
    if (address.postcode && !address.county) {
      const suggestedCounty = getCountyFromPostcode(address.postcode);
      if (suggestedCounty) {
        onAddressChange({ county: suggestedCounty });
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display">Address</h2>
        <p className="text-slate-500 mt-1">Where is your office located</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            What's your business's registered office address?
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Please tell us where your business is registered
          </p>
        </div>

        {/* Address Form */}
        <div className="space-y-4">
          {/* First Line */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              First line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address.line1 || ''}
              onChange={(e) => onAddressChange({ line1: e.target.value })}
              placeholder="e.g., 128, City Road"
              className={`
                w-full px-4 py-3 border rounded-xl bg-white text-slate-900
                focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                ${errors.line1 ? 'border-red-300' : 'border-slate-200'}
              `}
            />
            {errors.line1 && (
              <p className="text-sm text-red-500">{errors.line1}</p>
            )}
          </div>

          {/* Second Line */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Second line
            </label>
            <input
              type="text"
              value={address.line2 || ''}
              onChange={(e) => onAddressChange({ line2: e.target.value })}
              placeholder="e.g., Littleport"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {/* Town and County */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Town <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.city || ''}
                onChange={(e) => onAddressChange({ city: e.target.value })}
                placeholder="e.g., London"
                className={`
                  w-full px-4 py-3 border rounded-xl bg-white text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  ${errors.city ? 'border-red-300' : 'border-slate-200'}
                `}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                County <span className="text-red-500">*</span>
              </label>
              <select
                value={address.county || ''}
                onChange={(e) => onAddressChange({ county: e.target.value })}
                className={`
                  w-full px-4 py-3 border rounded-xl bg-white text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  ${errors.county ? 'border-red-300' : 'border-slate-200'}
                `}
              >
                <option value="">Select county</option>
                {UK_COUNTIES.map(county => (
                  <option key={county} value={county}>{county}</option>
                ))}
              </select>
              {errors.county && (
                <p className="text-sm text-red-500">{errors.county}</p>
              )}
            </div>
          </div>

          {/* Postal Code and Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address.postcode || ''}
                onChange={(e) => onAddressChange({ postcode: e.target.value.toUpperCase() })}
                onBlur={handlePostcodeBlur}
                placeholder="e.g., EC1V 2NX"
                className={`
                  w-full px-4 py-3 border rounded-xl bg-white text-slate-900
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  ${errors.postcode ? 'border-red-300' : 'border-slate-200'}
                `}
              />
              {errors.postcode && (
                <p className="text-sm text-red-500">{errors.postcode}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                value={address.country || 'United Kingdom'}
                onChange={(e) => onAddressChange({ country: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              >
                <option value="United Kingdom">United Kingdom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trading Address Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group mt-6">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={data.tradingAddressSame !== false}
              onChange={(e) => onChange({ tradingAddressSame: e.target.checked })}
              className="sr-only"
            />
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${data.tradingAddressSame !== false
                ? 'bg-teal-500 border-teal-500'
                : 'border-slate-300 group-hover:border-teal-400'
              }
            `}>
              {data.tradingAddressSame !== false && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          <span className="text-sm text-slate-600">
            My trading address is the same as my registered office address
          </span>
        </label>
      </div>
    </div>
  );
};
