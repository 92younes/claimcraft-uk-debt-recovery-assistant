import React from 'react';
import { Party, PartyType } from '../types';
import { Input, Select } from './ui/Input';
import { UK_COUNTIES } from '../constants';

interface PartyFormProps {
  title: string;
  party: Party;
  onChange: (updatedParty: Party) => void;
  readOnly?: boolean;
}

export const PartyForm: React.FC<PartyFormProps> = ({ title, party, onChange, readOnly = false }) => {
  const handleChange = (field: keyof Party, value: string) => {
    if (readOnly) return;
    onChange({ ...party, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      
      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Party Type</label>
        <div className="flex gap-4">
          <button
            onClick={() => handleChange('type', PartyType.INDIVIDUAL)}
            disabled={readOnly}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
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
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              party.type === PartyType.BUSINESS
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Limited Company (Ltd/PLC)
          </button>
        </div>
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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="col-span-2 md:col-span-3">
          <Input
            label="Town/City"
            value={party.city}
            onChange={(e) => handleChange('city', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="col-span-1 md:col-span-1">
           <Input
            label="Postcode"
            value={party.postcode}
            onChange={(e) => handleChange('postcode', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="col-span-1 md:col-span-2">
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