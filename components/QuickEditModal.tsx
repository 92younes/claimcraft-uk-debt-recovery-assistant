import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, TextArea, Select } from './ui/Input';
import { ClaimState, ClaimStatus, PartyType } from '../types';
import { validateUKPostcode, formatUKPostcode, validateEmail, validateUKPhone, validateCompanyNumber } from '../utils/validation';
import { UK_COUNTIES, getCountyFromPostcode } from '../constants';
import { calculateInterest, calculateCompensation } from '../services/legalRules';

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimState | null;
  onSave: (updatedClaim: ClaimState) => Promise<void>;
}

interface ValidationErrors {
  defendantName?: string;
  defendantAddress?: string;
  defendantCity?: string;
  defendantPostcode?: string;
  defendantCounty?: string;
  defendantEmail?: string;
  defendantPhone?: string;
  defendantCompanyNumber?: string;
  claimAmount?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
  isOpen,
  onClose,
  claim,
  onSave
}) => {
  // Local state for form fields
  const [defendantName, setDefendantName] = useState('');
  const [defendantType, setDefendantType] = useState<PartyType>(PartyType.BUSINESS);
  const [defendantAddress, setDefendantAddress] = useState('');
  const [defendantCity, setDefendantCity] = useState('');
  const [defendantPostcode, setDefendantPostcode] = useState('');
  const [defendantCounty, setDefendantCounty] = useState('');
  const [defendantEmail, setDefendantEmail] = useState('');
  const [defendantPhone, setDefendantPhone] = useState('');
  const [defendantCompanyNumber, setDefendantCompanyNumber] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('draft');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form when claim changes
  useEffect(() => {
    if (claim) {
      setDefendantName(claim.defendant.name || '');
      setDefendantType(claim.defendant.type || PartyType.BUSINESS);
      setDefendantAddress(claim.defendant.address || '');
      setDefendantCity(claim.defendant.city || '');
      setDefendantPostcode(claim.defendant.postcode || '');
      setDefendantCounty(claim.defendant.county || '');
      setDefendantEmail(claim.defendant.email || '');
      setDefendantPhone(claim.defendant.phone || '');
      setDefendantCompanyNumber(claim.defendant.companyNumber || '');
      setClaimAmount(claim.invoice.totalAmount.toString() || '0');
      setInvoiceNumber(claim.invoice.invoiceNumber || '');
      setInvoiceDate(claim.invoice.dateIssued || '');
      setDueDate(claim.invoice.dueDate || '');
      setStatus(claim.status);
      setNotes(claim.userNotes || '');
      setErrors({});
      setTouched(new Set());
      setSaveError(null);
    }
  }, [claim]);

  // Validation functions
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'defendantName':
        return !value.trim() ? 'Defendant name is required' : undefined;
      case 'defendantAddress':
        return !value.trim() ? 'Address is required' : undefined;
      case 'defendantCity':
        return !value.trim() ? 'Town/City is required' : undefined;
      case 'defendantPostcode':
        if (!value.trim()) return 'Postcode is required';
        if (!validateUKPostcode(value)) return 'Invalid UK postcode format';
        return undefined;
      case 'defendantCounty':
        return !value.trim() ? 'County is required' : undefined;
      case 'defendantEmail':
        if (value.trim() && !validateEmail(value)) return 'Invalid email format';
        return undefined;
      case 'defendantPhone':
        if (value.trim() && !validateUKPhone(value)) return 'Invalid UK phone number';
        return undefined;
      case 'defendantCompanyNumber':
        // Company number is optional but validate format if provided
        if (defendantType === PartyType.BUSINESS && value.trim()) {
          if (!validateCompanyNumber(value)) return 'Invalid company number format';
        }
        return undefined;
      case 'claimAmount':
        const amount = parseFloat(value);
        if (!value.trim() || isNaN(amount)) return 'Valid claim amount is required';
        if (amount <= 0) return 'Claim amount must be greater than 0';
        return undefined;
      case 'invoiceNumber':
        return !value.trim() ? 'Invoice number is required' : undefined;
      case 'invoiceDate':
        if (!value.trim()) return 'Invoice date is required';
        const invDate = new Date(value);
        if (isNaN(invDate.getTime())) return 'Invalid date';
        if (invDate > new Date()) return 'Invoice date cannot be in the future';
        return undefined;
      case 'dueDate':
        if (!value.trim()) return 'Due date is required';
        const dDate = new Date(value);
        if (isNaN(dDate.getTime())) return 'Invalid date';
        if (invoiceDate && dDate < new Date(invoiceDate)) {
          return 'Due date cannot be before invoice date';
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {};

    newErrors.defendantName = validateField('defendantName', defendantName);
    newErrors.defendantAddress = validateField('defendantAddress', defendantAddress);
    newErrors.defendantCity = validateField('defendantCity', defendantCity);
    newErrors.defendantPostcode = validateField('defendantPostcode', defendantPostcode);
    newErrors.defendantCounty = validateField('defendantCounty', defendantCounty);
    newErrors.defendantEmail = validateField('defendantEmail', defendantEmail);
    newErrors.defendantPhone = validateField('defendantPhone', defendantPhone);
    newErrors.defendantCompanyNumber = validateField('defendantCompanyNumber', defendantCompanyNumber);
    newErrors.claimAmount = validateField('claimAmount', claimAmount);
    newErrors.invoiceNumber = validateField('invoiceNumber', invoiceNumber);
    newErrors.invoiceDate = validateField('invoiceDate', invoiceDate);
    newErrors.dueDate = validateField('dueDate', dueDate);

    setErrors(newErrors);

    // Mark all fields as touched
    const allFields = new Set([
      'defendantName', 'defendantAddress', 'defendantCity', 'defendantPostcode',
      'defendantCounty', 'claimAmount', 'invoiceNumber', 'invoiceDate', 'dueDate'
    ]);
    if (defendantType === PartyType.BUSINESS) {
      allFields.add('defendantCompanyNumber');
    }
    setTouched(allFields);

    return !Object.values(newErrors).some(err => err !== undefined);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
    const error = validateField(field, getFieldValue(field));
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const getFieldValue = (field: string): string => {
    const fieldMap: Record<string, string> = {
      defendantName,
      defendantAddress,
      defendantCity,
      defendantPostcode,
      defendantCounty,
      defendantEmail,
      defendantPhone,
      defendantCompanyNumber,
      claimAmount,
      invoiceNumber,
      invoiceDate,
      dueDate
    };
    return fieldMap[field] || '';
  };

  const handlePostcodeBlur = () => {
    handleBlur('defendantPostcode');

    // Auto-format and auto-fill county
    if (defendantPostcode && validateUKPostcode(defendantPostcode)) {
      const formatted = formatUKPostcode(defendantPostcode);
      if (formatted !== defendantPostcode) {
        setDefendantPostcode(formatted);
      }

      // Auto-fill county if empty
      if (!defendantCounty) {
        const suggestedCounty = getCountyFromPostcode(defendantPostcode);
        if (suggestedCounty) {
          setDefendantCounty(suggestedCounty);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!claim) return;

    // Validate all fields
    if (!validateAll()) {
      setSaveError('Please fix all validation errors before saving');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Recalculate interest and compensation based on updated values
      const amount = parseFloat(claimAmount);
      const interest = calculateInterest(
        amount,
        invoiceDate,
        dueDate,
        claim.claimant.type,
        defendantType
      );
      const compensation = calculateCompensation(
        amount,
        claim.claimant.type,
        defendantType
      );

      const updatedClaim: ClaimState = {
        ...claim,
        defendant: {
          ...claim.defendant,
          type: defendantType,
          name: defendantName.trim(),
          address: defendantAddress.trim(),
          city: defendantCity.trim(),
          postcode: defendantPostcode.trim(),
          county: defendantCounty.trim(),
          email: defendantEmail.trim(),
          phone: defendantPhone.trim(),
          companyNumber: defendantCompanyNumber.trim()
        },
        invoice: {
          ...claim.invoice,
          totalAmount: amount,
          invoiceNumber: invoiceNumber.trim(),
          dateIssued: invoiceDate,
          dueDate: dueDate
        },
        interest,
        compensation,
        status,
        userNotes: notes.trim(),
        lastModified: Date.now()
      };

      await onSave(updatedClaim);
      onClose();
    } catch (error) {
      console.error('Failed to save claim:', error);
      setSaveError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (claim) {
      setDefendantName(claim.defendant.name || '');
      setDefendantType(claim.defendant.type || PartyType.BUSINESS);
      setDefendantAddress(claim.defendant.address || '');
      setDefendantCity(claim.defendant.city || '');
      setDefendantPostcode(claim.defendant.postcode || '');
      setDefendantCounty(claim.defendant.county || '');
      setDefendantEmail(claim.defendant.email || '');
      setDefendantPhone(claim.defendant.phone || '');
      setDefendantCompanyNumber(claim.defendant.companyNumber || '');
      setClaimAmount(claim.invoice.totalAmount.toString() || '0');
      setInvoiceNumber(claim.invoice.invoiceNumber || '');
      setInvoiceDate(claim.invoice.dateIssued || '');
      setDueDate(claim.invoice.dueDate || '');
      setStatus(claim.status);
      setNotes(claim.userNotes || '');
      setErrors({});
      setTouched(new Set());
      setSaveError(null);
    }
    onClose();
  };

  if (!claim) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Quick Edit Claim"
      description="Edit key claim details without opening the full wizard"
      maxWidthClassName="max-w-xl"
      maxHeightClassName="max-h-[90vh]"
      titleIcon={
        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
          <Edit3 className="w-5 h-5" />
        </div>
      }
      footer={
        <div className="w-full flex flex-col-reverse sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            disabled={isSaving}
            icon={<Save className="w-4 h-4" />}
            className="flex-1 sm:flex-none"
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{saveError}</p>
          </div>
        )}

        {/* Defendant Details Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
            Defendant Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Party Type
              </label>
              <div className="flex gap-2">
                {[
                  { value: PartyType.INDIVIDUAL, label: 'Individual' },
                  { value: PartyType.SOLE_TRADER, label: 'Sole Trader' },
                  { value: PartyType.BUSINESS, label: 'Limited Company' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDefendantType(option.value)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                      defendantType === option.value
                        ? 'bg-teal-50 border-teal-500 text-teal-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <Input
                label={defendantType === PartyType.BUSINESS ? "Company Name" : "Full Name"}
                placeholder={defendantType === PartyType.BUSINESS ? "e.g. Acme Services Ltd" : "e.g. John Smith"}
                value={defendantName}
                onChange={(e) => setDefendantName(e.target.value)}
                onBlur={() => handleBlur('defendantName')}
                error={touched.has('defendantName') ? errors.defendantName : undefined}
                required
                noMargin
              />
            </div>

            {defendantType === PartyType.BUSINESS && (
              <div className="md:col-span-1">
                <Input
                  label="Company Number"
                  placeholder="e.g. 12345678"
                  value={defendantCompanyNumber}
                  onChange={(e) => setDefendantCompanyNumber(e.target.value)}
                  onBlur={() => handleBlur('defendantCompanyNumber')}
                  error={touched.has('defendantCompanyNumber') ? errors.defendantCompanyNumber : undefined}
                  required
                  noMargin
                />
              </div>
            )}

            <div className="md:col-span-3">
              <Input
                label="Address"
                placeholder="e.g. 10 Downing Street"
                value={defendantAddress}
                onChange={(e) => setDefendantAddress(e.target.value)}
                onBlur={() => handleBlur('defendantAddress')}
                error={touched.has('defendantAddress') ? errors.defendantAddress : undefined}
                required
                noMargin
              />
            </div>

            <div className="md:col-span-1">
              <Input
                label="Town/City"
                placeholder="e.g. London"
                value={defendantCity}
                onChange={(e) => setDefendantCity(e.target.value)}
                onBlur={() => handleBlur('defendantCity')}
                error={touched.has('defendantCity') ? errors.defendantCity : undefined}
                required
                noMargin
              />
            </div>

            <div className="md:col-span-1">
              <Input
                label="Postcode"
                placeholder="e.g. SW1A 1AA"
                value={defendantPostcode}
                onChange={(e) => setDefendantPostcode(e.target.value)}
                onBlur={handlePostcodeBlur}
                error={touched.has('defendantPostcode') ? errors.defendantPostcode : undefined}
                required
                noMargin
              />
            </div>

            <div className="md:col-span-1">
              <Select
                label="County"
                options={UK_COUNTIES.map(c => ({ value: c, label: c }))}
                value={defendantCounty}
                onChange={(e) => setDefendantCounty(e.target.value)}
                onBlur={() => handleBlur('defendantCounty')}
                error={touched.has('defendantCounty') ? errors.defendantCounty : undefined}
                required
                noMargin
              />
            </div>

            <div className="md:col-span-1">
              <Input
                label="Email (Optional)"
                type="email"
                placeholder="e.g. name@example.com"
                value={defendantEmail}
                onChange={(e) => setDefendantEmail(e.target.value)}
                onBlur={() => handleBlur('defendantEmail')}
                error={touched.has('defendantEmail') ? errors.defendantEmail : undefined}
                noMargin
              />
            </div>

            <div className="md:col-span-1">
              <Input
                label="Phone (Optional)"
                type="tel"
                placeholder="e.g. 020 7946 0958"
                value={defendantPhone}
                onChange={(e) => setDefendantPhone(e.target.value)}
                onBlur={() => handleBlur('defendantPhone')}
                error={touched.has('defendantPhone') ? errors.defendantPhone : undefined}
                noMargin
              />
            </div>
          </div>
        </div>

        {/* Invoice Details Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
            Invoice Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Claim Amount"
              type="number"
              step="0.01"
              placeholder="e.g. 5000.00"
              value={claimAmount}
              onChange={(e) => setClaimAmount(e.target.value)}
              onBlur={() => handleBlur('claimAmount')}
              error={touched.has('claimAmount') ? errors.claimAmount : undefined}
              required
              noMargin
            />

            <Input
              label="Invoice Number"
              placeholder="e.g. INV-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              onBlur={() => handleBlur('invoiceNumber')}
              error={touched.has('invoiceNumber') ? errors.invoiceNumber : undefined}
              required
              noMargin
            />

            <Input
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              onBlur={() => handleBlur('invoiceDate')}
              error={touched.has('invoiceDate') ? errors.invoiceDate : undefined}
              required
              noMargin
            />

            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => handleBlur('dueDate')}
              error={touched.has('dueDate') ? errors.dueDate : undefined}
              required
              noMargin
            />
          </div>
        </div>

        {/* Claim Status Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
            Claim Status
          </h3>

          <Select
            label="Status"
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'review', label: 'Review' },
              { value: 'sent', label: 'Sent' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'court', label: 'Court' },
              { value: 'judgment', label: 'Judgment' },
              { value: 'paid', label: 'Paid' }
            ]}
            value={status}
            onChange={(e) => setStatus(e.target.value as ClaimStatus)}
            required
            noMargin
          />
        </div>

        {/* Notes Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
            Notes (Optional)
          </h3>

          <TextArea
            label="Additional Notes"
            placeholder="Add any additional notes or comments about this claim..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            noMargin
          />
        </div>
      </div>
    </Modal>
  );
};
