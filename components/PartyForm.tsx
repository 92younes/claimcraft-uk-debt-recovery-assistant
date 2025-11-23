import React, { useState, useEffect } from 'react';
import { Party, PartyType } from '../types';
import { Input, Select } from './ui/Input';
import { UK_COUNTIES } from '../constants';
import { validateUKPostcode, formatUKPostcode } from '../utils/validation';

interface PartyFormProps {
  title: string;
  party: Party;
  onChange: (updatedParty: Party) => void;
  readOnly?: boolean;
}

export const PartyForm: React.FC<PartyFormProps> = ({ title, party, onChange, readOnly = false }) => {
  const [postcodeError, setPostcodeError] = useState<string | null>(null);

  const handleChange = (field: keyof Party, value: string) => {
    if (readOnly) return;

    // Clear error when user edits postcode (don't validate while typing)
    if (field === 'postcode') {
      setPostcodeError(null);
    }

    onChange({ ...party, [field]: value });
  };

  const handlePostcodeBlur = () => {
    if (party.postcode && party.postcode.trim()) {
      const isValid = validateUKPostcode(party.postcode);
      if (!isValid) {
        setPostcodeError('Invalid UK postcode format (e.g., SW1A 1AA)');
      } else {
        setPostcodeError(null);
        // Auto-format valid postcodes
        const formatted = formatUKPostcode(party.postcode);
        if (formatted !== party.postcode) {
          onChange({ ...party, postcode: formatted });
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Party Type</label>
        <div className="flex gap-4 mb-3">
          <button
            onClick={() => handleChange('type', PartyType.INDIVIDUAL)}
            disabled={readOnly}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
              party.type === PartyType.INDIVIDUAL
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Individual / Sole Trader
          </button>
          <button
            onClick={() => handleChange('type', PartyType.BUSINESS)}
            disabled={readOnly}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
              party.type === PartyType.BUSINESS
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Limited Company (Ltd/PLC)
          </button>
        </div>
        {title.includes('Claimant') && party.type === PartyType.BUSINESS && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-900">
              <strong>B2B Claim Benefits:</strong> Business-to-Business claims allow Late Payment of Commercial Debts (Interest) Act 1998 interest (8% + Bank of England base rate) plus £100 statutory compensation.
            </p>
          </div>
        )}
        {title.includes('Claimant') && party.type === PartyType.INDIVIDUAL && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
            <p className="text-slate-700">
              <strong>B2C Claim:</strong> Individual/Sole Trader claims use County Courts Act 1984 s.69 interest (8% per annum) without statutory compensation.
            </p>
          </div>
        )}
      </div>

      <Input
        label={party.type === PartyType.BUSINESS ? "Company Name" : "Full Name"}
        placeholder={party.type === PartyType.BUSINESS ? "e.g. Acme Services Ltd" : "e.g. John Smith"}
        value={party.name}
        onChange={(e) => handleChange('name', e.target.value)}
        readOnly={readOnly}
      />

      <Input
        label="Address Line 1"
        placeholder="e.g. 10 Downing Street"
        value={party.address}
        onChange={(e) => handleChange('address', e.target.value)}
        readOnly={readOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <Input
            label="Town/City"
            value={party.city}
            onChange={(e) => handleChange('city', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="md:col-span-1">
          <div className="relative">
            <Input
              label="Postcode"
              value={party.postcode}
              onChange={(e) => handleChange('postcode', e.target.value)}
              onBlur={handlePostcodeBlur}
              readOnly={readOnly}
              className={postcodeError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
            />
            {postcodeError && (
              <p className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="shrink-0">⚠️</span>
                <span>{postcodeError}</span>
              </p>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <Select
            label="County"
            options={UK_COUNTIES.map(s => ({ value: s, label: s }))}
            value={party.county}
            onChange={(e) => handleChange('county', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone (Optional)"
          type="tel"
          value={party.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          readOnly={readOnly}
        />
        <Input
          label="Email (Optional)"
          type="email"
          value={party.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};