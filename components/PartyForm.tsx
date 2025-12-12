import React, { useState, useEffect } from 'react';
import { Party, PartyType } from '../types';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { UK_COUNTIES, getCountyFromPostcode } from '../constants';
import { validateUKPostcode, formatUKPostcode, validateEmail, validateUKPhone, validateCompanyNumber } from '../utils/validation';
import { searchCompaniesHouse } from '../services/companiesHouse';
import { Search, Loader2, CheckCircle, AlertCircle, Building2, HelpCircle } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface PartyFormProps {
  title: string;
  party: Party;
  onChange: (updatedParty: Party) => void;
  readOnly?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  city?: string;
  postcode?: string;
  county?: string;
  companyNumber?: string;
  email?: string;
  phone?: string;
}

export const PartyForm: React.FC<PartyFormProps> = ({ title, party, onChange, readOnly = false, onValidationChange }) => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Companies House lookup state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState(false);

  // Check if this is the defendant form (Companies House lookup only for defendant)
  const isDefendant = title.toLowerCase().includes('defendant');

  // Companies House lookup handler
  const handleCompaniesHouseLookup = async () => {
    const searchQuery = party.companyNumber?.trim() || party.name?.trim();

    if (!searchQuery) {
      setSearchError('Enter a company number or name to search');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchSuccess(false);

    try {
      const result = await searchCompaniesHouse(searchQuery);

      if (result) {
        // Merge found data with existing party data
        onChange({
          ...party,
          ...result,
          type: PartyType.BUSINESS
        });
        setSearchSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setSearchSuccess(false), 3000);
      } else {
        setSearchError('No company found. Try a different search term.');
      }
    } catch (err) {
      setSearchError('Search failed. Please try again.');
      console.error('Companies House lookup error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Validation logic
  const validateField = (field: keyof Party, value: string): string | undefined => {
    // Required fields
    if (field === 'name' && !value.trim()) {
      return 'Name is required';
    }
    if (field === 'address' && !value.trim()) {
      return 'Address is required';
    }
    if (field === 'city' && !value.trim()) {
      return 'Town/City is required';
    }
    if (field === 'postcode') {
      if (!value.trim()) {
        return 'Postcode is required';
      }
      if (!validateUKPostcode(value)) {
        return 'Invalid UK postcode format (e.g., SW1A 1AA)';
      }
    }
    if (field === 'county' && !value.trim()) {
      return 'County is required';
    }

    // Company number validation for businesses
    if (field === 'companyNumber' && party.type === PartyType.BUSINESS) {
      if (!value.trim()) {
        return 'Company number is required for limited companies';
      }
      if (!validateCompanyNumber(value)) {
        return 'Invalid company number format (e.g., 12345678 or SC123456)';
      }
    }

    // Optional field validation (only if provided)
    if (field === 'email' && value.trim() && !validateEmail(value)) {
      return 'Invalid email format';
    }
    if (field === 'phone' && value.trim() && !validateUKPhone(value)) {
      return 'Invalid UK phone number';
    }

    return undefined;
  };

  const validateAll = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    newErrors.name = validateField('name', party.name);
    newErrors.address = validateField('address', party.address);
    newErrors.city = validateField('city', party.city);
    newErrors.postcode = validateField('postcode', party.postcode);
    newErrors.county = validateField('county', party.county);

    if (party.type === PartyType.BUSINESS) {
      newErrors.companyNumber = validateField('companyNumber', party.companyNumber || '');
    }

    if (party.email) {
      newErrors.email = validateField('email', party.email);
    }
    if (party.phone) {
      newErrors.phone = validateField('phone', party.phone);
    }

    return newErrors;
  };

  // Update validation state when party changes
  useEffect(() => {
    const newErrors = validateAll();
    setErrors(newErrors);

    // Notify parent if validation callback provided
    const hasErrors = Object.values(newErrors).some(err => err !== undefined);
    if (onValidationChange) {
      onValidationChange(!hasErrors);
    }
  }, [party, onValidationChange]);

  const handleChange = (field: keyof Party, value: string) => {
    if (readOnly) return;
    onChange({ ...party, [field]: value });
  };

  const handleBlur = (field: keyof Party) => {
    setTouched(prev => new Set(prev).add(field));
  };

  const handlePostcodeBlur = () => {
    handleBlur('postcode');
    // Auto-format valid postcodes and auto-fill county
    if (party.postcode && party.postcode.trim() && validateUKPostcode(party.postcode)) {
      const formatted = formatUKPostcode(party.postcode);
      const updates: Partial<Party> = {};

      if (formatted !== party.postcode) {
        updates.postcode = formatted;
      }

      // Auto-fill county if empty
      if (!party.county) {
        const suggestedCounty = getCountyFromPostcode(party.postcode);
        if (suggestedCounty) {
          updates.county = suggestedCounty;
        }
      }

      if (Object.keys(updates).length > 0) {
        onChange({ ...party, ...updates });
      }
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200 font-display">{title}</h2>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700 block">Party Type</label>
          <Tooltip content="Different rules apply. Businesses can claim £40-£100 compensation + 8% interest above base rate. Individuals claim 8% fixed interest.">
             <HelpCircle className="w-4 h-4 text-slate-400 hover:text-teal-500 cursor-help" />
          </Tooltip>
        </div>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => handleChange('type', PartyType.INDIVIDUAL)}
            disabled={readOnly}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 ${
              party.type === PartyType.INDIVIDUAL
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Individual (Consumer)
          </button>
          <button
            onClick={() => handleChange('type', PartyType.SOLE_TRADER)}
            disabled={readOnly}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 ${
              party.type === PartyType.SOLE_TRADER
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sole Trader
          </button>
          <button
            onClick={() => handleChange('type', PartyType.BUSINESS)}
            disabled={readOnly}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-2 ${
              party.type === PartyType.BUSINESS
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Limited Company
          </button>
        </div>
        {title.includes('Claimant') && (party.type === PartyType.BUSINESS || party.type === PartyType.SOLE_TRADER) && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-sm">
            <p className="text-teal-900">
              <strong>B2B Claim Benefits:</strong> {party.type === PartyType.SOLE_TRADER ? 'Sole Traders' : 'Businesses'} can claim Late Payment of Commercial Debts (Interest) Act 1998 interest (8% + Bank of England base rate) plus £40-£100 statutory compensation per invoice.
            </p>
          </div>
        )}
        {title.includes('Claimant') && party.type === PartyType.INDIVIDUAL && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
            <p className="text-slate-700">
              <strong>Consumer Claim:</strong> Individual claims use County Courts Act 1984 s.69 interest (8% per annum) but do not qualify for statutory compensation.
            </p>
          </div>
        )}
      </div>

      <Input
        label={party.type === PartyType.BUSINESS ? "Company Name" : (party.type === PartyType.SOLE_TRADER ? "Trading Name / Full Name" : "Full Name")}
        placeholder={party.type === PartyType.BUSINESS ? "e.g. Acme Services Ltd" : (party.type === PartyType.SOLE_TRADER ? "e.g. Joe Bloggs T/A Joe's Plumbing" : "e.g. John Smith")}
        value={party.name}
        onChange={(e) => handleChange('name', e.target.value)}
        onBlur={() => handleBlur('name')}
        error={touched.has('name') ? errors.name : undefined}
        required
        readOnly={readOnly}
      />

      {party.type === PartyType.BUSINESS && (
        <div className="space-y-3">
          {/* Companies House Lookup UI - Only for Defendant */}
          {isDefendant && !readOnly && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <span className="font-medium text-slate-900">Companies House Lookup</span>
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Enter a company number or name below, then click search to auto-fill details.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Company number (e.g. 12345678) or name"
                    value={party.companyNumber || ''}
                    onChange={(e) => handleChange('companyNumber', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white transition-colors"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCompaniesHouseLookup}
                  disabled={isSearching}
                  isLoading={isSearching}
                  variant="primary"
                  className="px-4 py-2.5"
                  icon={!isSearching && <Search className="w-4 h-4" />}
                >
                  Search
                </Button>
              </div>
              {/* Search feedback */}
              {searchError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {searchError}
                </div>
              )}
              {searchSuccess && (
                <div className="mt-2 flex items-center gap-2 text-teal-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Company details loaded successfully!
                </div>
              )}
              {/* Solvency status display */}
              {party.solvencyStatus && party.solvencyStatus !== 'Unknown' && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${
                  party.solvencyStatus === 'Active' ? 'text-teal-700' :
                  party.solvencyStatus === 'Insolvent' ? 'text-red-700' :
                  'text-amber-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    party.solvencyStatus === 'Active' ? 'bg-teal-500' :
                    party.solvencyStatus === 'Insolvent' ? 'bg-red-500' :
                    'bg-amber-500'
                  }`} />
                  Company Status: <strong>{party.solvencyStatus}</strong>
                  {party.solvencyStatus === 'Insolvent' && (
                    <span className="text-red-600 font-medium ml-1">(Debt recovery may be difficult)</span>
                  )}
                  {party.solvencyStatus === 'Dissolved' && (
                    <span className="text-amber-600 font-medium ml-1">(Company no longer exists)</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Regular Company Number Input (shown for claimant or if lookup not available) */}
          {(!isDefendant || readOnly) && (
            <Input
              label="Company Number"
              placeholder="e.g. 12345678"
              value={party.companyNumber || ''}
              onChange={(e) => handleChange('companyNumber', e.target.value)}
              onBlur={() => handleBlur('companyNumber')}
              error={touched.has('companyNumber') ? errors.companyNumber : undefined}
              helpText="Companies House registration number (8 digits)"
              maxLength={8}
              required
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      <Input
        label="Address Line 1"
        placeholder="e.g. 10 Downing Street"
        value={party.address}
        onChange={(e) => handleChange('address', e.target.value)}
        onBlur={() => handleBlur('address')}
        error={touched.has('address') ? errors.address : undefined}
        required
        readOnly={readOnly}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <Input
            label="Town/City"
            value={party.city}
            onChange={(e) => handleChange('city', e.target.value)}
            onBlur={() => handleBlur('city')}
            error={touched.has('city') ? errors.city : undefined}
            required
            readOnly={readOnly}
          />
        </div>
        <div className="md:col-span-1">
          <Input
            label="Postcode"
            placeholder="e.g. SW1A 1AA"
            value={party.postcode}
            onChange={(e) => handleChange('postcode', e.target.value)}
            onBlur={handlePostcodeBlur}
            error={touched.has('postcode') ? errors.postcode : undefined}
            required
            readOnly={readOnly}
          />
        </div>
        <div className="md:col-span-2">
          <Select
            label="County"
            options={UK_COUNTIES.map(s => ({ value: s, label: s }))}
            value={party.county}
            onChange={(e) => handleChange('county', e.target.value)}
            onBlur={() => handleBlur('county')}
            error={touched.has('county') ? errors.county : undefined}
            required
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Phone (Optional)"
          type="tel"
          placeholder="e.g. 020 7946 0958"
          value={party.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          error={touched.has('phone') ? errors.phone : undefined}
          helpText="UK format: 01234 567890 or 07123 456789"
          readOnly={readOnly}
        />
        <Input
          label="Email (Optional)"
          type="email"
          placeholder="e.g. name@example.com"
          value={party.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={touched.has('email') ? errors.email : undefined}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};