

export enum PartyType {
  INDIVIDUAL = 'Individual',
  BUSINESS = 'Business' // Ltd, PLC, Sole Trader
}

export interface Party {
  type: PartyType;
  name: string; // Trading name or Full Name
  address: string;
  city: string;
  county: string;
  postcode: string;
  phone?: string;
  email?: string;
  companyNumber?: string; // For Companies House
  solvencyStatus?: 'Active' | 'Insolvent' | 'Dissolved' | 'Unknown';
}

export interface InvoiceData {
  invoiceNumber: string;
  dateIssued: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  description: string;
}

export interface InterestData {
  daysOverdue: number;
  dailyRate: number;
  totalInterest: number;
}

export enum ClaimStrength {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface AssessmentResult {
  isViable: boolean;
  limitationCheck: { passed: boolean; message: string }; // Limitation Act 1980
  valueCheck: { passed: boolean; message: string }; // Small claims limit
  solvencyCheck: { passed: boolean; message: string }; // Companies House status
  recommendation: string;
  // New AI Fields
  strength?: ClaimStrength; // HIGH/MEDIUM/LOW based on score
  strengthScore?: number; // 0-100 (internal use)
  strengthAnalysis?: string;
  weaknesses?: string[];
}

export enum DocumentType {
  POLITE_CHASER = 'Polite Payment Reminder',
  LBA = 'Letter Before Action',
  FORM_N1 = 'Form N1 (Claim Form)',
  DEFAULT_JUDGMENT = 'Form N225 (Default Judgment)',
  ADMISSION = 'Form N225A (Judgment - Admission)',
  DEFENCE_RESPONSE = 'Response to Defence',
  DIRECTIONS_QUESTIONNAIRE = 'Form N180 (Directions Questionnaire)',
  PART_36_OFFER = 'Part 36 Settlement Offer',
  INSTALLMENT_AGREEMENT = 'Installment Payment Agreement',
  TRIAL_BUNDLE = 'Trial Bundle',
  SKELETON_ARGUMENT = 'Skeleton Argument'
}

export interface GeneratedContent {
  documentType: DocumentType;
  content: string; // The body text
  briefDetails?: string; // For N1 Box
  legalBasis: string;
  nextSteps: string[];
  validation?: {
    isValid: boolean;
    warnings: string[];
    generatedAt: string;
  };
  review?: {
    isPass: boolean;
    critique: string;
    improvements: string[];
    correctedContent?: string; // AI Auto-fix
  };
}

// AI Chat Data Extraction Types
export interface ExtractedClaimData {
  claimant?: Partial<Party>;
  defendant?: Partial<Party>;
  invoice?: Partial<InvoiceData>;
  timeline?: TimelineEvent[];
  recommendedDocument: DocumentType;
  documentReason: string;
  confidenceScore: number; // 0-100 - how confident AI is in the extraction
  extractedFields: string[]; // List of fields that were extracted from chat
}

export interface TimelineEvent {
  date: string;
  description: string;
  type: 'contract' | 'service_delivered' | 'invoice' | 'payment_due' | 'part_payment' | 'chaser' | 'lba_sent' | 'acknowledgment' | 'communication';
}

export interface EvidenceFile {
  name: string;
  type: string; // mime type
  data: string; // base64 (raw, no prefix)
  classification?: string; // e.g., "Invoice", "Contract", "Email"
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  readyToProceed?: boolean; // AI signals when enough information has been collected
  collected?: {
    claimantName: boolean;
    claimantAddress: boolean;
    defendantName: boolean;
    defendantAddress: boolean;
    invoiceDetails: boolean;
    timelineEvents: boolean;
  };
}

export interface ChatResponse {
  message: string;
  readyToProceed: boolean;
  collected?: {
    claimantName: boolean;
    claimantAddress: boolean;
    defendantName: boolean;
    defendantAddress: boolean;
    invoiceDetails: boolean;
    timelineEvents: boolean;
  };
}

export type ClaimStatus = 'draft' | 'review' | 'sent' | 'paid';

export enum ClaimStage {
  DRAFT = 'Draft',
  OVERDUE = 'Overdue',
  REMINDER_SENT = 'Reminder Sent',
  FINAL_DEMAND = 'Final Demand',
  LBA_SENT = 'LBA Sent',
  COURT_CLAIM = 'Court Claim',
  JUDGMENT = 'Judgment Obtained',
  ENFORCEMENT = 'Enforcement',
  SETTLED = 'Settled',
  ABANDONED = 'Abandoned'
}

export interface ClaimState {
  id: string;
  status: ClaimStatus;
  lastModified: number;
  source: 'manual' | 'upload' | 'xero' | 'csv';
  claimant: Party;
  defendant: Party;
  invoice: InvoiceData;
  interest: InterestData;
  compensation: number; // Late Payment of Commercial Debts Act 1998
  courtFee: number;
  timeline: TimelineEvent[];
  evidence: EvidenceFile[]; // Store multiple files
  userNotes: string;
  chatHistory: ChatMessage[];
  assessment: AssessmentResult | null;
  selectedDocType: DocumentType;
  generated: GeneratedContent | null;
  signature: string | null; // Base64 signature image
  importSource?: {
    provider: 'xero' | 'quickbooks';
    invoiceId: string;
    importedAt: string;
  };
}

// Accounting Integration Types

export interface AccountingConnection {
  provider: 'xero' | 'quickbooks' | 'freeagent' | 'sage';
  connectionId: string; // Nango connection ID
  organizationName: string;
  connectedAt: string; // ISO timestamp
  lastSyncAt: string | null;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: 'ACCREC'; // Accounts Receivable
  Contact: {
    ContactID: string;
    Name: string;
  };
  Date: string; // ISO date
  DueDate: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  CurrencyCode: string;
  Reference?: string;
}

export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  Addresses?: {
    AddressType: 'POBOX' | 'STREET';
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }[];
  Phones?: {
    PhoneType: 'DEFAULT' | 'MOBILE' | 'FAX';
    PhoneNumber?: string;
  }[];
}

// ==========================================
// User Profile & Onboarding Types
// ==========================================

export enum BusinessType {
  SOLE_TRADER = 'Sole trader',
  LIMITED_COMPANY = 'Limited company',
  LLP = 'Limited Liability Partnership',
  PARTNERSHIP = 'Partnership',
  OTHER = 'Other'
}

export interface UserAddress {
  line1: string;
  line2?: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
}

export interface UserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Step 1: Account Type
  hasAuthority: boolean;
  referralSource: string;
  tosAcceptedAt: string;
  disclaimerAcceptedAt: string;

  // Step 2: Business Details
  businessType: BusinessType;
  businessName: string;
  businessDescription?: string;
  companyNumber?: string;

  // Step 3: Address
  businessAddress: UserAddress;
  tradingAddressSame: boolean;

  // Step 4: Declarations
  isPEP: boolean;
  jurisdictionConfirmed: boolean;

  // Step 5: Identity Verification
  kycStatus: 'pending' | 'verified' | 'not_required';

  // Contact
  email?: string;
  phone?: string;
}

export const INITIAL_USER_ADDRESS: UserAddress = {
  line1: '',
  city: '',
  county: '',
  postcode: '',
  country: 'United Kingdom'
};

export const INITIAL_USER_PROFILE: UserProfile = {
  id: '',
  createdAt: '',
  updatedAt: '',
  hasAuthority: false,
  referralSource: '',
  tosAcceptedAt: '',
  disclaimerAcceptedAt: '',
  businessType: BusinessType.LIMITED_COMPANY,
  businessName: '',
  businessAddress: { ...INITIAL_USER_ADDRESS },
  tradingAddressSame: true,
  isPEP: false,
  jurisdictionConfirmed: false,
  kycStatus: 'not_required'
};

export const INITIAL_PARTY: Party = {
  type: PartyType.BUSINESS,
  name: '',
  address: '',
  city: '',
  county: '',
  postcode: '',
  phone: '',
  email: '',
  solvencyStatus: 'Unknown'
};

export const INITIAL_INVOICE: InvoiceData = {
  invoiceNumber: '',
  dateIssued: '',
  dueDate: '',
  totalAmount: 0,
  currency: 'GBP',
  description: ''
};

export const INITIAL_INTEREST: InterestData = {
  daysOverdue: 0,
  dailyRate: 0,
  totalInterest: 0
};

export const INITIAL_STATE: ClaimState = {
  id: '',
  status: 'draft',
  lastModified: Date.now(),
  source: 'manual',
  claimant: { ...INITIAL_PARTY },
  defendant: { ...INITIAL_PARTY },
  invoice: { ...INITIAL_INVOICE },
  interest: { ...INITIAL_INTEREST },
  compensation: 0,
  courtFee: 0,
  timeline: [],
  evidence: [],
  userNotes: '',
  chatHistory: [],
  assessment: null,
  selectedDocType: DocumentType.LBA,
  generated: null,
  signature: null
};
