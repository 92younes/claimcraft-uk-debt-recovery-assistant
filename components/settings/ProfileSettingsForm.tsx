import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { UserProfile, BusinessType, INITIAL_PAYMENT_DETAILS } from '../../types';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { HorizontalTabs, Tab } from '../ui/HorizontalTabs';
import { UK_COUNTIES } from '../../constants';
import { requiresCompanyNumber, validateAddressStep, validateBusinessDetailsStep, validatePaymentDetailsStep } from '../../services/userProfileService';
import { Building2, MapPin, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<string>('business');

  const countyOptions = useMemo(
    () => [
      { value: '', label: 'Select county' },
      ...UK_COUNTIES.map((c) => ({ value: c, label: c })),
    ],
    []
  );

  const companyNumberRequired = requiresCompanyNumber(draft.businessType);

  // Validation helper functions for each tab
  const validateBusinessTab = (): FieldErrors => {
    const business = validateBusinessDetailsStep(draft);
    const merged: FieldErrors = { ...business.errors };

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

    return merged;
  };

  const validateAddressTab = (): FieldErrors => {
    const address = validateAddressStep(draft);
    return address.errors;
  };

  const validatePaymentTab = (): FieldErrors => {
    const payment = validatePaymentDetailsStep(draft);
    return payment.errors;
  };

  const validate = (): { isValid: boolean; errors: FieldErrors } => {
    const merged: FieldErrors = {
      ...validateBusinessTab(),
      ...validateAddressTab(),
      ...validatePaymentTab(),
    };

    return { isValid: Object.keys(merged).length === 0, errors: merged };
  };

  // Define tabs with validation status
  const getTabStatus = (tabId: string): 'complete' | 'incomplete' => {
    let tabErrors: FieldErrors = {};

    switch (tabId) {
      case 'business':
        tabErrors = validateBusinessTab();
        break;
      case 'address':
        tabErrors = validateAddressTab();
        break;
      case 'payment':
        tabErrors = validatePaymentTab();
        break;
    }

    return Object.keys(tabErrors).length === 0 ? 'complete' : 'incomplete';
  };

  const profileTabs: Tab[] = [
    {
      id: 'business',
      label: 'Business & Contact',
      icon: <Building2 className="w-4 h-4" />,
      badge: getTabStatus('business') === 'complete' ?
        <CheckCircle className="w-4 h-4 text-teal-500" /> :
        <AlertCircle className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'address',
      label: 'Address',
      icon: <MapPin className="w-4 h-4" />,
      badge: getTabStatus('address') === 'complete' ?
        <CheckCircle className="w-4 h-4 text-teal-500" /> :
        <AlertCircle className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'payment',
      label: 'Payment Details',
      icon: <CreditCard className="w-4 h-4" />,
      badge: getTabStatus('payment') === 'complete' ?
        <CheckCircle className="w-4 h-4 text-teal-500" /> :
        <AlertCircle className="w-4 h-4 text-amber-500" />
    },
  ];

  const handleSave = async () => {
    const v = validate();
    setErrors(v.errors);
    if (!v.isValid) {
      setStatus('error');
      toast.error('Please fix the highlighted fields');
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
      toast.success('Profile saved successfully');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      toast.error('Failed to save profile. Please try again.');
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

      {/* Horizontal Tabs */}
      <HorizontalTabs
        tabs={profileTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6 lg:px-8"
      />

      <div className="p-6 lg:p-8">
        {/* Business & Contact Tab */}
        {activeTab === 'business' && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Business Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Business Address</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

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
          </div>
        )}

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Payment Details</h3>
              <p className="text-sm text-slate-500 mt-1">
                Bank details for payment instructions in generated documents. These are stored locally on your device only.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <Input
                label="Account holder name"
                value={draft.paymentDetails?.bankAccountHolder || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    paymentDetails: { ...(p.paymentDetails || INITIAL_PAYMENT_DETAILS), bankAccountHolder: e.target.value },
                  }))
                }
                error={errors.bankAccountHolder}
                placeholder="e.g. Acme Ltd"
              />

              <Input
                label="Bank name"
                value={draft.paymentDetails?.bankName || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    paymentDetails: { ...(p.paymentDetails || INITIAL_PAYMENT_DETAILS), bankName: e.target.value },
                  }))
                }
                error={errors.bankName}
                placeholder="e.g. Barclays"
              />

              <Input
                label="Sort code"
                value={draft.paymentDetails?.sortCode || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    paymentDetails: { ...(p.paymentDetails || INITIAL_PAYMENT_DETAILS), sortCode: e.target.value },
                  }))
                }
                error={errors.sortCode}
                placeholder="e.g. 20-00-00"
                helpText="Format: XX-XX-XX"
              />

              <Input
                label="Account number"
                value={draft.paymentDetails?.accountNumber || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    paymentDetails: { ...(p.paymentDetails || INITIAL_PAYMENT_DETAILS), accountNumber: e.target.value },
                  }))
                }
                error={errors.accountNumber}
                placeholder="e.g. 12345678"
                helpText="8 digits"
              />

              <Input
                label="Payment reference (optional)"
                value={draft.paymentDetails?.paymentReference || ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    paymentDetails: { ...(p.paymentDetails || INITIAL_PAYMENT_DETAILS), paymentReference: e.target.value },
                  }))
                }
                error={errors.paymentReference}
                placeholder="e.g. Invoice number"
                helpText="Instructions for the debtor when making payment"
              />
            </div>
          </div>
        )}

        {/* Save Button - Always visible */}
        <div className="mt-8 flex items-center justify-between gap-4">
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








