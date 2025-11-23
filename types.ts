

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

export interface AssessmentResult {
  isViable: boolean;
  limitationCheck: { passed: boolean; message: string }; // Limitation Act 1980
  valueCheck: { passed: boolean; message: string }; // Small claims limit
  solvencyCheck: { passed: boolean; message: string }; // Companies House status
  recommendation: string;
  // New AI Fields
  strengthScore?: number; // 0-100
  strengthAnalysis?: string;
  weaknesses?: string[];
}

export enum DocumentType {
  LBA = 'Letter Before Action',
  FORM_N1 = 'Form N1 (Claim Form)'
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

export interface TimelineEvent {
  date: string;
  description: string;
  type: 'contract' | 'invoice' | 'payment_due' | 'chaser' | 'communication';
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

export interface WorkflowState {
  currentStage: ClaimStage;
  nextAction: string;
  nextActionDue: string | null; // ISO date when next action should be taken
  daysUntilEscalation: number | null; // Days before auto-escalation
  autoEscalate: boolean; // Whether to show escalation warning
  escalationWarning: string | null;
  stageHistory: {
    stage: ClaimStage;
    enteredAt: string; // ISO date
    notes?: string;
  }[];
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
  workflow?: WorkflowState; // Workflow tracking
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
