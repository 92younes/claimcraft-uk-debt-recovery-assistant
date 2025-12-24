import React from 'react';
import { Check } from 'lucide-react';
import { UserProfile, UserAddress } from '../../../types';
import { UK_COUNTIES, getCountyFromPostcode } from '../../../constants';
import { Input, Select } from '../../ui/Input';

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
        <p className="text-slate-500 mt-1">Enter your business address</p>
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
          <Input
            label="First line"
            value={address.line1 || ''}
            onChange={(e) => onAddressChange({ line1: e.target.value })}
            placeholder="e.g., 128, City Road"
            required
            error={errors.line1}
            noMargin
          />

          {/* Second Line */}
          <Input
            label="Second line"
            value={address.line2 || ''}
            onChange={(e) => onAddressChange({ line2: e.target.value })}
            placeholder="e.g., Littleport"
            noMargin
          />

          {/* Town and County */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Town"
              value={address.city || ''}
              onChange={(e) => onAddressChange({ city: e.target.value })}
              placeholder="e.g., London"
              required
              error={errors.city}
              noMargin
            />

            <Select
              label="County"
              value={address.county || ''}
              onChange={(e) => onAddressChange({ county: e.target.value })}
              options={[
                { value: '', label: 'Select county' },
                ...UK_COUNTIES.map(county => ({ value: county, label: county }))
              ]}
              required
              error={errors.county}
              noMargin
            />
          </div>

          {/* Postal Code and Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Postcode"
              value={address.postcode || ''}
              onChange={(e) => onAddressChange({ postcode: e.target.value.toUpperCase() })}
              onBlur={handlePostcodeBlur}
              placeholder="e.g., EC1V 2NX"
              required
              error={errors.postcode}
              noMargin
            />

            <Select
              label="Country"
              value={address.country || 'United Kingdom'}
              onChange={(e) => onAddressChange({ country: e.target.value })}
              options={[{ value: 'United Kingdom', label: 'United Kingdom' }]}
              required
              noMargin
            />
          </div>
        </div>

        {/* Trading Address Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group mt-6">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={data.tradingAddressSame !== false}
              onChange={(e) => onChange({ tradingAddressSame: e.target.checked })}
              aria-label="My trading address is the same as my registered office address"
              className="sr-only peer"
            />
            <div className={`
              w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500/30 peer-focus-visible:ring-offset-2
              ${data.tradingAddressSame !== false
                ? 'bg-teal-500 border-teal-500'
                : 'border-slate-300 group-hover:border-teal-400'
              }
            `}>
              {data.tradingAddressSame !== false && (
                <Check className="w-3 h-3 text-white" aria-hidden="true" />
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
