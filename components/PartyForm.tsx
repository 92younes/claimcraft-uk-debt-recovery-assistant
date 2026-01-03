import React, { useState, useEffect } from 'react';
import { Party, PartyType } from '../types';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { UK_COUNTIES, getCountyFromPostcode } from '../constants';
import { validateUKPostcode, formatUKPostcode, validateEmail, validateUKPhone, validateCompanyNumber } from '../utils/validation';
import { searchCompaniesHouse } from '../services/companiesHouse';
import { Search, Loader2, CheckCircle, AlertCircle, Building2, HelpCircle, AlertTriangle } from 'lucide-react';
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

  // Issue 10: County lookup warning
  const [countyLookupWarning, setCountyLookupWarning] = useState<string | null>(null);

  // Address mismatch warning after Companies House lookup
  const [addressMismatchWarning, setAddressMismatchWarning] = useState<string | null>(null);

  // Companies House override confirmation modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [pendingCompaniesHouseData, setPendingCompaniesHouseData] = useState<Partial<Party> | null>(null);

  // Check if this is the defendant form (Companies House lookup only for defendant)
  const isDefendant = title.toLowerCase().includes('defendant');

  // Track if we've already searched to avoid duplicate searches
  const [lastSearchedValue, setLastSearchedValue] = useState<string>('');

  // Companies House lookup handler
  const handleCompaniesHouseLookup = async (autoTriggered = false) => {
    const searchQuery = party.companyNumber?.trim() || party.name?.trim();

    if (!searchQuery) {
      if (!autoTriggered) {
        setSearchError('Enter a company number or name to search');
      }
      return;
    }

    // Prevent duplicate searches
    if (searchQuery === lastSearchedValue) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchSuccess(false);
    setAddressMismatchWarning(null);
    setLastSearchedValue(searchQuery);

    // Store original address for comparison
    const originalAddress = {
      address: party.address?.trim().toLowerCase() || '',
      city: party.city?.trim().toLowerCase() || '',
      postcode: party.postcode?.trim().toLowerCase().replace(/\s+/g, '') || ''
    };

    try {
      const result = await searchCompaniesHouse(searchQuery);

      if (result) {
        // Compare addresses if user had already entered one
        const hadOriginalAddress = originalAddress.address || originalAddress.city || originalAddress.postcode;
        if (hadOriginalAddress && result.address) {
          const fetchedAddress = {
            address: result.address?.trim().toLowerCase() || '',
            city: result.city?.trim().toLowerCase() || '',
            postcode: result.postcode?.trim().toLowerCase().replace(/\s+/g, '') || ''
          };

          // Check if addresses differ
          const addressDiffers = (originalAddress.address && fetchedAddress.address && originalAddress.address !== fetchedAddress.address);
          const cityDiffers = (originalAddress.city && fetchedAddress.city && originalAddress.city !== fetchedAddress.city);
          const postcodeDiffers = (originalAddress.postcode && fetchedAddress.postcode && originalAddress.postcode !== fetchedAddress.postcode);

          if (addressDiffers || cityDiffers || postcodeDiffers) {
            setAddressMismatchWarning(
              `The address from Companies House differs from what you entered. The Companies House registered address has been used. Please verify this is the correct address for correspondence.`
            );
          }
        }

        // Check if user has existing data that would be overwritten
        const hasExistingData = party.name?.trim() || party.address?.trim() || party.city?.trim();
        const wouldOverwrite = hasExistingData && (
          (result.name && result.name !== party.name) ||
          (result.address && result.address !== party.address) ||
          (result.city && result.city !== party.city)
        );

        if (wouldOverwrite && !autoTriggered) {
          // Store pending data and show confirmation modal
          setPendingCompaniesHouseData({
            ...result,
            type: PartyType.BUSINESS
          });
          setShowOverrideModal(true);
        } else {
          // No conflict or auto-triggered - apply directly
          onChange({
            ...party,
            ...result,
            type: PartyType.BUSINESS
          });
          setSearchSuccess(true);
          // Clear success message after 3 seconds
          setTimeout(() => setSearchSuccess(false), 3000);
        }
      } else if (!autoTriggered) {
        setSearchError('No company found. Try a different search term.');
      }
    } catch (err) {
      if (!autoTriggered) {
        setSearchError('Search failed. Please try again.');
      }
      console.error('Companies House lookup error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-trigger search when company number is complete (8 digits or valid format with prefix)
  useEffect(() => {
    if (!isDefendant || readOnly || party.type !== PartyType.BUSINESS) return;

    const companyNum = party.companyNumber?.trim() || '';
    // Valid formats: 12345678, SC123456, NI123456, OC123456, etc.
    const isValidFormat = /^[A-Z]{0,2}\d{6,8}$/i.test(companyNum);
    const isComplete = companyNum.length >= 8 && isValidFormat;

    if (isComplete && companyNum !== lastSearchedValue && !isSearching) {
      // Debounce the search slightly
      const timer = setTimeout(() => {
        handleCompaniesHouseLookup(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [party.companyNumber, party.type, isDefendant, readOnly, lastSearchedValue, isSearching]);

  // Auto-trigger search when name looks like a company (debounced)
  useEffect(() => {
    if (!isDefendant || readOnly) return;

    const name = party.name?.trim() || '';
    // Check if name looks like a company
    const companyPatterns = /\b(Ltd\.?|Limited|PLC|LLP|Inc\.?|Corporation|Corp\.?|Company|Co\.?)\b/i;
    const looksLikeCompany = companyPatterns.test(name) && name.length >= 5;

    if (looksLikeCompany && name !== lastSearchedValue && !party.companyNumber && !isSearching) {
      // Longer debounce for name-based search
      const timer = setTimeout(() => {
        handleCompaniesHouseLookup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [party.name, party.companyNumber, isDefendant, readOnly, lastSearchedValue, isSearching]);

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

    // Company number validation for businesses (optional but must be valid if provided)
    if (field === 'companyNumber' && value.trim() && party.type === PartyType.BUSINESS) {
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

    // Company number is optional but validate format if provided
    if (party.type === PartyType.BUSINESS && party.companyNumber) {
      newErrors.companyNumber = validateField('companyNumber', party.companyNumber);
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
    setCountyLookupWarning(null); // Clear any previous warning

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
        } else {
          // Issue 10: Show warning when county couldn't be auto-determined
          setCountyLookupWarning('County could not be determined from postcode. Please select manually.');
        }
      }

      if (Object.keys(updates).length > 0) {
        onChange({ ...party, ...updates });
      }
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 font-display">{title}</h2>
        <p className="text-xs text-slate-500"><span className="text-teal-500">*</span> Required fields</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="party-type" className="text-sm font-medium text-slate-700 block">Party Type</label>
          <Tooltip content="Different rules apply. Businesses can claim £40-£100 compensation + 8% interest above base rate. Individuals claim 8% fixed interest.">
             <HelpCircle className="w-4 h-4 text-slate-400 hover:text-teal-500 cursor-help" />
          </Tooltip>
        </div>
        <Select
          id="party-type"
          options={[
            { value: PartyType.INDIVIDUAL, label: 'Individual (Consumer)' },
            { value: PartyType.SOLE_TRADER, label: 'Sole Trader' },
            { value: PartyType.BUSINESS, label: 'Limited Company' },
          ]}
          value={party.type}
          onChange={(e) => handleChange('type', e.target.value as PartyType)}
          disabled={readOnly}
          noMargin
        />
        {/* Info boxes with consistent height */}
        <div className="min-h-[80px]">
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
          {title.includes('Defendant') && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm">
              <p className="text-slate-600">
                <strong>Defendant Details:</strong> Enter accurate information for the party you are claiming against. Incorrect details may delay your claim.
              </p>
            </div>
          )}
        </div>
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

      {/* Contact Person Field - for businesses and sole traders */}
      {(party.type === PartyType.BUSINESS || party.type === PartyType.SOLE_TRADER) && (
        <Input
          label="Contact Person (Optional)"
          placeholder="e.g. John Smith, Accounts Department"
          value={party.contactName || ''}
          onChange={(e) => handleChange('contactName', e.target.value)}
          helpText="Named contact for correspondence"
          readOnly={readOnly}
        />
      )}

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
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Company Number or Name"
                    placeholder="Company number (e.g. 12345678) or name"
                    value={party.companyNumber || ''}
                    onChange={(e) => handleChange('companyNumber', e.target.value)}
                    noMargin
                  />
                </div>
                <div className="pb-[1px]">
                  <Button
                    type="button"
                    onClick={() => handleCompaniesHouseLookup(false)}
                    disabled={isSearching}
                    isLoading={isSearching}
                    variant="primary"
                    className="px-4 py-3"
                    icon={!isSearching && <Search className="w-4 h-4" />}
                  >
                    Search
                  </Button>
                </div>
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
              label="Company Number (Optional)"
              placeholder="e.g. 12345678"
              value={party.companyNumber || ''}
              onChange={(e) => handleChange('companyNumber', e.target.value)}
              onBlur={() => handleBlur('companyNumber')}
              error={touched.has('companyNumber') ? errors.companyNumber : undefined}
              helpText="Companies House registration number - optional"
              maxLength={8}
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

      {/* Address mismatch warning after Companies House lookup */}
      {addressMismatchWarning && isDefendant && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Address Mismatch Detected</p>
            <p className="text-amber-700 mt-1">{addressMismatchWarning}</p>
          </div>
        </div>
      )}

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
            onChange={(e) => {
              handleChange('county', e.target.value);
              setCountyLookupWarning(null); // Clear warning once user selects
            }}
            onBlur={() => handleBlur('county')}
            error={touched.has('county') ? errors.county : undefined}
            disabled={readOnly}
            required
          />
          {/* Issue 10: County lookup warning */}
          {countyLookupWarning && !party.county && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {countyLookupWarning}
            </p>
          )}
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

      {/* Companies House Override Confirmation Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => {
          setShowOverrideModal(false);
          setPendingCompaniesHouseData(null);
        }}
        title="Update with Companies House Data?"
        description="Companies House returned different information than what you entered."
        maxWidthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              The registered company details differ from what you entered. Would you like to use the official Companies House data?
            </p>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-2">Your Entry</p>
              {party.name && <p className="text-slate-600 truncate">{party.name}</p>}
              {party.address && <p className="text-slate-500 text-xs truncate">{party.address}</p>}
              {party.city && <p className="text-slate-500 text-xs">{party.city}</p>}
            </div>
            <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
              <p className="font-semibold text-teal-700 mb-2">Companies House</p>
              {pendingCompaniesHouseData?.name && (
                <p className="text-teal-600 truncate">{pendingCompaniesHouseData.name}</p>
              )}
              {pendingCompaniesHouseData?.address && (
                <p className="text-teal-500 text-xs truncate">{pendingCompaniesHouseData.address}</p>
              )}
              {pendingCompaniesHouseData?.city && (
                <p className="text-teal-500 text-xs">{pendingCompaniesHouseData.city}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowOverrideModal(false);
                setPendingCompaniesHouseData(null);
              }}
            >
              Keep My Entry
            </Button>
            <Button
              onClick={() => {
                if (pendingCompaniesHouseData) {
                  onChange({
                    ...party,
                    ...pendingCompaniesHouseData
                  });
                  setSearchSuccess(true);
                  setTimeout(() => setSearchSuccess(false), 3000);
                }
                setShowOverrideModal(false);
                setPendingCompaniesHouseData(null);
              }}
            >
              Use Companies House Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};