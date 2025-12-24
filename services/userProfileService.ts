/**
 * User Profile Service
 * Provides helper functions for working with user profiles
 */

import { UserProfile, Party, PartyType, BusinessType } from '../types';

/**
 * Convert a UserProfile to a Party object for pre-filling claimant details
 */
export const profileToClaimantParty = (profile: UserProfile): Party => {
  // Determine party type based on business type
  // Sole traders are treated as businesses for Late Payment Act purposes
  const partyType = profile.businessType === BusinessType.SOLE_TRADER
    ? PartyType.SOLE_TRADER
    : PartyType.BUSINESS;

  return {
    type: partyType,
    name: profile.businessName,
    address: profile.businessAddress.line1 + (profile.businessAddress.line2 ? `, ${profile.businessAddress.line2}` : ''),
    city: profile.businessAddress.city,
    county: profile.businessAddress.county,
    postcode: profile.businessAddress.postcode,
    companyNumber: profile.companyNumber,
    email: profile.email,
    phone: profile.phone,
    solvencyStatus: 'Active' // User's own business is assumed active
  };
};

/**
 * Check if a business type requires a company number
 */
export const requiresCompanyNumber = (businessType: BusinessType): boolean => {
  return [
    BusinessType.LIMITED_COMPANY,
    BusinessType.LLP
  ].includes(businessType);
};

/**
 * Generate a unique profile ID
 */
export const generateProfileId = (): string => {
  return `profile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Validate onboarding step data
 */
export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateAccountTypeStep = (profile: Partial<UserProfile>): StepValidation => {
  const errors: Record<string, string> = {};

  if (!profile.hasAuthority) {
    errors.hasAuthority = 'You must have authority to verify this company';
  }

  if (!profile.referralSource) {
    errors.referralSource = 'Please tell us how you heard about us';
  }

  if (!profile.tosAcceptedAt) {
    errors.tosAccepted = 'You must accept the Terms of Service';
  }

  if (!profile.disclaimerAcceptedAt) {
    errors.disclaimerAccepted = 'You must acknowledge the disclaimer';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateBusinessDetailsStep = (profile: Partial<UserProfile>): StepValidation => {
  const errors: Record<string, string> = {};

  if (!profile.businessType) {
    errors.businessType = 'Please select your business type';
  }

  if (!profile.businessName || profile.businessName.trim().length < 2) {
    errors.businessName = 'Please enter your business name (at least 2 characters)';
  }

  if (profile.businessType && requiresCompanyNumber(profile.businessType as BusinessType)) {
    if (!profile.companyNumber) {
      errors.companyNumber = 'Company number is required for this business type';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateAddressStep = (profile: Partial<UserProfile>): StepValidation => {
  const errors: Record<string, string> = {};

  if (!profile.businessAddress?.line1) {
    errors.line1 = 'Please enter the first line of your address';
  }

  if (!profile.businessAddress?.city) {
    errors.city = 'Please enter your town/city';
  }

  if (!profile.businessAddress?.county) {
    errors.county = 'Please select your county';
  }

  if (!profile.businessAddress?.postcode) {
    errors.postcode = 'Please enter your postcode';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateDeclarationsStep = (profile: Partial<UserProfile>): StepValidation => {
  const errors: Record<string, string> = {};

  if (!profile.jurisdictionConfirmed) {
    errors.jurisdictionConfirmed = 'Please confirm your jurisdiction';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateVerificationStep = (_profile: Partial<UserProfile>): StepValidation => {
  // Verification step is optional/placeholder for now
  return {
    isValid: true,
    errors: {}
  };
};

/**
 * Validate payment details (optional but must be valid if provided)
 * Sort code format: XX-XX-XX (6 digits with dashes)
 * Account number: 8 digits
 */
export const validatePaymentDetailsStep = (profile: Partial<UserProfile>): StepValidation => {
  const errors: Record<string, string> = {};
  const payment = profile.paymentDetails;

  // Payment details are optional, but if any field is provided, validate format
  if (!payment) {
    return { isValid: true, errors: {} };
  }

  const hasAnyField = payment.bankAccountHolder || payment.bankName || payment.sortCode || payment.accountNumber;

  if (!hasAnyField) {
    return { isValid: true, errors: {} };
  }

  // If sort code is provided, validate format
  if (payment.sortCode) {
    // Normalize and check format
    const digits = payment.sortCode.replace(/\D/g, '');
    if (digits.length !== 6) {
      errors.sortCode = 'Sort code must be 6 digits (format: XX-XX-XX)';
    }
  }

  // If account number is provided, validate format
  if (payment.accountNumber) {
    const digits = payment.accountNumber.replace(/\D/g, '');
    if (digits.length !== 8) {
      errors.accountNumber = 'Account number must be 8 digits';
    }
  }

  // If reference is provided, check length
  if (payment.paymentReference && payment.paymentReference.length > 20) {
    errors.paymentReference = 'Payment reference must be 20 characters or less';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
