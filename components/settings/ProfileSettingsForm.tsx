import React, { useMemo, useState } from 'react';
import { UserProfile, BusinessType } from '../../types';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { UK_COUNTIES } from '../../constants';
import { requiresCompanyNumber, validateAddressStep, validateBusinessDetailsStep } from '../../services/userProfileService';

interface ProfileSettingsFormProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void> | void;
}

type FieldErrors = Record<string, string>;

const BUSINESS_TYPE_OPTIONS = [
  { value: BusinessType.SOLE_TRADER, label: 'Sole trader' },
  { value: BusinessType.LIMITED_COMPANY, label: 'Limited company' },
  { value: BusinessType.LLP, label: 'Limited Liability Partnership (LLP)' },
  { value: BusinessType.PARTNERSHIP, label: 'Partnership' },
  { value: BusinessType.OTHER, label: 'Other' },
];

export const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ profile, onSave }) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const countyOptions = useMemo(
    () => [
      { value: '', label: 'Select county' },
      ...UK_COUNTIES.map((c) => ({ value: c, label: c })),
    ],
    []
  );

  const companyNumberRequired = requiresCompanyNumber(draft.businessType);

  const validate = (): { isValid: boolean; errors: FieldErrors } => {
    const business = validateBusinessDetailsStep(draft);
    const address = validateAddressStep(draft);

    const merged: FieldErrors = {
      ...business.errors,
      ...address.errors,
    };

    // Contact info is optional, but if present, enforce basic shape
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      merged.email = 'Please enter a valid email address';
    }

    if (draft.phone && draft.phone.trim().length < 7) {
      merged.phone = 'Please enter a valid phone number';
    }

    // If company number is required, keep error messaging consistent
    if (companyNumberRequired && !draft.companyNumber) {
      merged.companyNumber = merged.companyNumber || 'Company number is required for this business type';
    }

    return { isValid: Object.keys(merged).length === 0, errors: merged };
  };

  const handleSave = async () => {
    const v = validate();
    setErrors(v.errors);
    if (!v.isValid) {
      setStatus('error');
      return;
    }

    setIsSaving(true);
    setStatus('idle');
    try {
      const updated: UserProfile = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      await onSave(updated);
      setDraft(updated);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="p-6 lg:p-8 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Update your business details used to pre-fill claimant information.</p>
      </div>

      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Business</h3>
            <Select
              label="Business type"
              value={draft.businessType}
              onChange={(e) => {
                const nextType = e.target.value as BusinessType;
                setDraft((p) => ({
                  ...p,
                  businessType: nextType,
                  companyNumber: requiresCompanyNumber(nextType) ? p.companyNumber : '',
                }));
              }}
              options={BUSINESS_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              error={errors.businessType}
            />

            <Input
              label="Business name"
              value={draft.businessName}
              onChange={(e) => setDraft((p) => ({ ...p, businessName: e.target.value }))}
              error={errors.businessName}
              placeholder="e.g. Acme Ltd"
            />

            <Input
              label="Company number"
              value={draft.companyNumber || ''}
              onChange={(e) => setDraft((p) => ({ ...p, companyNumber: e.target.value }))}
              error={errors.companyNumber}
              placeholder="e.g. 01234567"
              helpText={companyNumberRequired ? 'Required for Limited companies and LLPs' : 'Optional'}
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Contact</h3>
            <Input
              label="Email"
              value={draft.email || ''}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              error={errors.email}
              placeholder="e.g. accounts@acme.co.uk"
              type="email"
            />
            <Input
              label="Phone"
              value={draft.phone || ''}
              onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
              error={errors.phone}
              placeholder="e.g. 020 7946 0000"
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Business address</h3>
          </div>

          <Input
            label="Address line 1"
            value={draft.businessAddress.line1}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                businessAddress: { ...p.businessAddress, line1: e.target.value },
              }))
            }
            error={errors.line1}
          />

          <Input
            label="Address line 2"
            value={draft.businessAddress.line2 || ''}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                businessAddress: { ...p.businessAddress, line2: e.target.value },
              }))
            }
          />

          <Input
            label="Town / City"
            value={draft.businessAddress.city}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                businessAddress: { ...p.businessAddress, city: e.target.value },
              }))
            }
            error={errors.city}
          />

          <Select
            label="County"
            value={draft.businessAddress.county}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                businessAddress: { ...p.businessAddress, county: e.target.value },
              }))
            }
            options={countyOptions}
            error={errors.county}
          />

          <Input
            label="Postcode"
            value={draft.businessAddress.postcode}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                businessAddress: { ...p.businessAddress, postcode: e.target.value },
              }))
            }
            error={errors.postcode}
            placeholder="e.g. SW1A 1AA"
          />
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <div className="text-sm">
            {status === 'saved' && <span className="text-teal-700 font-medium">Saved</span>}
            {status === 'error' && <span className="text-red-600 font-medium">Please fix the highlighted fields</span>}
          </div>
          <Button onClick={handleSave} isLoading={isSaving} className="px-10">
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};


