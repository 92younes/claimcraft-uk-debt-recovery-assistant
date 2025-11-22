
import { Party, PartyType, InvoiceData, ClaimState, INITIAL_PARTY, INITIAL_INVOICE } from "../types";

const STORAGE_KEY = 'claimcraft_xero_auth';

export interface XeroAuth {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  connectedAt: number;
  orgName: string;
}

// Helper to get dynamic date strings relative to today
const getDateString = (daysOffset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

// Generate Mock Data on the fly so dates are always relevant
const generateMockInvoices = () => [
  {
    InvoiceID: 'inv-001',
    InvoiceNumber: 'INV-2024-101',
    Reference: 'Web Dev Project Alpha',
    DateString: getDateString(-45), // Issued 45 days ago
    DueDateString: getDateString(-15), // Overdue by 15 days
    Total: 2400.00,
    CurrencyCode: 'GBP',
    Contact: {
      Name: 'Quantum Dynamics Ltd',
      Addresses: [
        { 
          AddressType: 'POBOX', 
          AddressLine1: 'Unit 4', 
          AddressLine2: 'Innovation Park',
          City: 'Cambridge', 
          Region: 'Cambridgeshire', 
          PostalCode: 'CB4 0WS' 
        }
      ],
      EmailAddress: 'accounts@quantumdynamics.co.uk',
      Phones: [{ PhoneNumber: '01223 555 0199' }]
    },
    LineItems: [{ Description: 'Full Stack Development Services - Phase 1' }]
  },
  {
    InvoiceID: 'inv-002',
    InvoiceNumber: 'INV-2024-142',
    Reference: 'Consulting Retainer',
    DateString: getDateString(-10), // Issued 10 days ago
    DueDateString: getDateString(20), // Not due yet (Future)
    Total: 850.50,
    CurrencyCode: 'GBP',
    Contact: {
      Name: 'Sarah Jenkins',
      Addresses: [
        { 
          AddressType: 'STREET', 
          AddressLine1: '42 High Street', 
          City: 'Bristol', 
          Region: 'Avon', 
          PostalCode: 'BS1 5TY' 
        }
      ],
      EmailAddress: 'sarah.j@example.com',
      Phones: [{ PhoneNumber: '07700 900 123' }]
    },
    LineItems: [{ Description: 'Marketing Strategy Consultation' }]
  },
  {
    InvoiceID: 'inv-003',
    InvoiceNumber: 'INV-2024-189',
    Reference: 'Hardware Supply',
    DateString: getDateString(-65), // Issued 65 days ago
    DueDateString: getDateString(-35), // Overdue by 35 days
    Total: 4500.00,
    CurrencyCode: 'GBP',
    Contact: {
      Name: 'BuildRight Construction PLC',
      Addresses: [
        { 
          AddressType: 'POBOX', 
          AddressLine1: 'The Shard', 
          AddressLine2: '32 London Bridge St',
          City: 'London', 
          Region: 'Greater London', 
          PostalCode: 'SE1 9SG' 
        }
      ],
      EmailAddress: 'finance@buildright.com',
      Phones: [{ PhoneNumber: '020 7946 0000' }]
    },
    LineItems: [{ Description: 'Supply of IT Infrastructure Equipment' }]
  }
];

export const getStoredAuth = (): XeroAuth | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const storeAuth = (clientId: string, clientSecret: string, tenantId: string) => {
  const auth: XeroAuth = { 
    clientId, 
    clientSecret, 
    tenantId,
    connectedAt: Date.now(),
    orgName: "My Tech Company Ltd" // Simulated user org
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const fetchXeroInvoices = async (): Promise<any[]> => {
  // In a real app, this would use the stored token to call api.xero.com
  await new Promise(r => setTimeout(r, 800)); // Simulate API latency
  return generateMockInvoices();
};

export const mapXeroToClaim = (xeroInvoice: any, myOrgName: string): Partial<ClaimState> => {
  const contact = xeroInvoice.Contact;
  
  // Robust Address Mapping: Xero addresses can be array or incomplete
  // We prioritize POBOX, then STREET, then whatever is first.
  const rawAddress = contact.Addresses?.find((a: any) => a.AddressType === 'POBOX') 
                  || contact.Addresses?.find((a: any) => a.AddressType === 'STREET') 
                  || contact.Addresses?.[0] 
                  || {};

  // Concatenate lines to form a complete address string
  const addressLines = [rawAddress.AddressLine1, rawAddress.AddressLine2, rawAddress.AddressLine3, rawAddress.AddressLine4]
    .filter(Boolean)
    .join(', ');

  // Heuristic: Infer party type based on name
  const nameLower = (contact.Name || '').toLowerCase();
  const isBusiness = nameLower.includes('ltd') || 
                     nameLower.includes('plc') || 
                     nameLower.includes('limited') ||
                     nameLower.includes('llp') ||
                     nameLower.includes('consulting') ||
                     nameLower.includes('associates');

  const defendant: Party = {
    type: isBusiness ? PartyType.BUSINESS : PartyType.INDIVIDUAL,
    name: contact.Name || '',
    address: addressLines || '',
    city: rawAddress.City || '',
    county: rawAddress.Region || '',
    postcode: rawAddress.PostalCode || '',
    email: contact.EmailAddress || '',
    phone: contact.Phones?.[0]?.PhoneNumber || ''
  };

  // Mock Claimant - Simulate fetching User Org Address from Xero API
  // In a real production app, we'd hit https://api.xero.com/api.xro/2.0/Organisation
  const claimant: Party = {
    ...INITIAL_PARTY,
    type: PartyType.BUSINESS, // Xero users are typically businesses
    name: myOrgName,
    address: '71-75 Shelton Street', // Mock default address for "User"
    city: 'London',
    county: 'Greater London',
    postcode: 'WC2H 9JQ',
    email: 'accounts@' + myOrgName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.co.uk',
    phone: '020 7123 4567'
  };

  const invoice: InvoiceData = {
    invoiceNumber: xeroInvoice.InvoiceNumber,
    dateIssued: xeroInvoice.DateString,
    dueDate: xeroInvoice.DueDateString,
    totalAmount: xeroInvoice.Total,
    currency: xeroInvoice.CurrencyCode,
    // Use the first line item description or the reference
    description: xeroInvoice.LineItems?.[0]?.Description || xeroInvoice.Reference || 'Services Rendered'
  };

  // Auto-generate a timeline event for the invoice creation
  const timeline = [{
      date: xeroInvoice.DateString,
      description: `Invoice ${xeroInvoice.InvoiceNumber} issued to ${contact.Name}. Due date: ${xeroInvoice.DueDateString}`,
      type: 'invoice' as const
  }];

  return {
    source: 'xero',
    claimant,
    defendant,
    invoice,
    timeline
  };
};
