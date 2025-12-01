/**
 * Xero Invoice Puller - Fetch and Transform Invoices
 *
 * Fetches overdue invoices from Xero and transforms them into ClaimState format.
 * Handles interest calculations per Late Payment of Commercial Debts Act 1998.
 */

import { NangoClient } from './nangoClient';
import { calculateCourtFee, calculateCompensation } from './legalRules';
import { LATE_PAYMENT_ACT_RATE, DAILY_INTEREST_DIVISOR, getCountyFromPostcode } from '../constants';
import {
  XeroInvoice,
  XeroContact,
  ClaimState,
  Party,
  PartyType,
  DocumentType,
  InterestData,
  TimelineEvent
} from '../types';

/**
 * Parse Xero date format which can be either:
 * - Microsoft JSON date: /Date(1757548800000+0000)/
 * - ISO string: 2025-09-11T00:00:00
 */
function parseXeroDate(dateString: string): Date {
  if (!dateString) {
    return new Date();
  }

  // Check for Microsoft JSON date format: /Date(1234567890000+0000)/
  const msDateMatch = dateString.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
  if (msDateMatch) {
    const timestamp = parseInt(msDateMatch[1], 10);
    return new Date(timestamp);
  }

  // Otherwise try parsing as ISO string
  return new Date(dateString);
}

/**
 * Convert Xero date to ISO string for storage
 */
function xeroDateToISOString(dateString: string): string {
  const date = parseXeroDate(dateString);
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

export class XeroPuller {
  /**
   * Fetch all invoices from Xero
   *
   * @param connectionId - Nango connection ID (optional, uses stored if not provided)
   * @returns Array of Xero invoices
   */
  static async fetchInvoices(connectionId?: string): Promise<XeroInvoice[]> {
    try {
      const response = await NangoClient.callXeroApi<{ Invoices: XeroInvoice[] }>(
        '/api.xro/2.0/Invoices',
        connectionId,
        {
          where: 'Type=="ACCREC"', // Only accounts receivable (sales invoices)
          order: 'DueDate DESC'
        }
      );

      // Update last sync time
      NangoClient.updateLastSync('xero');

      return response.Invoices || [];
    } catch (error) {
      console.error('❌ Failed to fetch Xero invoices:', error);
      throw new Error(`Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter for overdue invoices only
   *
   * @param invoices - Array of Xero invoices
   * @returns Only invoices past due date and unpaid
   */
  static filterOverdueInvoices(invoices: XeroInvoice[]): XeroInvoice[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    console.log(`📋 Filtering ${invoices.length} invoices for overdue...`);
    console.log(`📅 Today's date: ${today.toISOString()}`);

    return invoices.filter(invoice => {
      // Parse the Xero date format
      const dueDate = parseXeroDate(invoice.DueDate);
      dueDate.setHours(0, 0, 0, 0);

      console.log(`  Invoice ${invoice.InvoiceNumber}: Status=${invoice.Status}, AmountDue=${invoice.AmountDue}, DueDate=${invoice.DueDate} -> Parsed: ${dueDate.toISOString()}`);

      // Must be AUTHORISED (not draft, paid, or voided)
      if (invoice.Status !== 'AUTHORISED') {
        console.log(`    ❌ Skipped: Status is ${invoice.Status}, not AUTHORISED`);
        return false;
      }

      // Must have amount due
      if (invoice.AmountDue <= 0) {
        console.log(`    ❌ Skipped: AmountDue is ${invoice.AmountDue}`);
        return false;
      }

      // Must be past due date
      const isOverdue = dueDate < today;
      if (!isOverdue) {
        console.log(`    ❌ Skipped: Due date ${dueDate.toISOString()} is not past today ${today.toISOString()}`);
      } else {
        console.log(`    ✅ OVERDUE: Due date ${dueDate.toISOString()} is past today ${today.toISOString()}`);
      }

      return isOverdue;
    });
  }

  /**
   * Fetch contact details from Xero
   *
   * @param contactId - Xero contact ID
   * @param connectionId - Nango connection ID (optional)
   * @returns Xero contact details
   */
  static async fetchContactDetails(contactId: string, connectionId?: string): Promise<XeroContact> {
    try {
      const response = await NangoClient.callXeroApi<{ Contacts: XeroContact[] }>(
        `/api.xro/2.0/Contacts/${contactId}`,
        connectionId
      );

      if (response.Contacts && response.Contacts.length > 0) {
        return response.Contacts[0];
      }

      throw new Error('Contact not found');
    } catch (error) {
      console.error(`❌ Failed to fetch contact ${contactId}:`, error);
      // Return minimal contact info
      return {
        ContactID: contactId,
        Name: 'Unknown Contact'
      };
    }
  }

  /**
   * Calculate statutory interest per Late Payment of Commercial Debts Act 1998
   *
   * @param amount - Principal amount
   * @param dueDate - Payment due date
   * @returns Interest data (days overdue, daily rate, total interest)
   */
  static calculateInterest(amount: number, dueDate: string): InterestData {
    const today = new Date();
    const due = parseXeroDate(dueDate);

    // Calculate days overdue
    const diffMs = today.getTime() - due.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Daily interest rate: (amount * annual rate) / 365
    const annualRate = LATE_PAYMENT_ACT_RATE / 100; // Convert percentage to decimal
    const dailyRate = (amount * annualRate) / DAILY_INTEREST_DIVISOR;

    // Total interest accrued
    const totalInterest = dailyRate * daysOverdue;

    return {
      daysOverdue,
      dailyRate: parseFloat(dailyRate.toFixed(4)),
      totalInterest: parseFloat(totalInterest.toFixed(2))
    };
  }

  // Compensation and court fee calculations now imported from legalRules.ts

  /**
   * Transform Xero contact to Party
   *
   * @param contact - Xero contact
   * @returns Party object
   */
  static transformContactToParty(contact: XeroContact): Party {
    // Get primary address (prefer STREET over POBOX)
    const streetAddress = contact.Addresses?.find(a => a.AddressType === 'STREET');
    const address = streetAddress || contact.Addresses?.[0];

    // Get primary phone
    const phone = contact.Phones?.find(p => p.PhoneType === 'DEFAULT');

    const postcode = address?.PostalCode || '';

    // Xero's Region field is often empty for UK contacts
    // Fall back to inferring county from postcode if Region is not set
    let county = address?.Region || '';
    if (!county && postcode) {
      county = getCountyFromPostcode(postcode);
    }

    return {
      type: PartyType.BUSINESS, // Assume business, user can change later
      name: contact.Name,
      address: [address?.AddressLine1, address?.AddressLine2]
        .filter(Boolean)
        .join(', ') || '',
      city: address?.City || '',
      county,
      postcode,
      phone: phone?.PhoneNumber || '',
      email: contact.EmailAddress || '',
      solvencyStatus: 'Unknown'
    };
  }

  /**
   * Transform Xero invoice to ClaimState
   *
   * @param invoice - Xero invoice
   * @param contact - Xero contact (debtor)
   * @param claimant - User's business details
   * @returns ClaimState object ready for dashboard
   */
  static transformToClaim(
    invoice: XeroInvoice,
    contact: XeroContact,
    claimant: Party
  ): ClaimState {
    // Use AmountDue (outstanding balance) for interest calculation, not Total
    // Under Late Payment of Commercial Debts (Interest) Act 1998, interest accrues
    // on the unpaid amount, not the original invoice total
    const principal = invoice.AmountDue > 0 ? invoice.AmountDue : invoice.Total;

    console.log('🔄 transformToClaim - Raw invoice data:', {
      InvoiceNumber: invoice.InvoiceNumber,
      Date: invoice.Date,
      DueDate: invoice.DueDate,
      Total: invoice.Total,
      AmountDue: invoice.AmountDue,
      AmountPaid: invoice.AmountPaid
    });

    const interest = this.calculateInterest(principal, invoice.DueDate);
    const defendant = this.transformContactToParty(contact);

    // Calculate compensation on the outstanding principal (B2B only)
    const compensation = calculateCompensation(principal, claimant.type, defendant.type);
    const totalClaim = principal + interest.totalInterest + compensation;
    const courtFee = calculateCourtFee(totalClaim);

    // Convert Xero dates to ISO format for storage
    const invoiceDateISO = xeroDateToISOString(invoice.Date);
    const dueDateISO = xeroDateToISOString(invoice.DueDate);

    console.log('🔄 transformToClaim - Converted values:', {
      principal,
      invoiceDateISO,
      dueDateISO,
      interest,
      compensation,
      totalClaim,
      courtFee
    });

    // Build timeline
    const timeline: TimelineEvent[] = [
      {
        date: invoiceDateISO,
        type: 'invoice',
        description: `Invoice ${invoice.InvoiceNumber} issued`
      },
      {
        date: dueDateISO,
        type: 'payment_due',
        description: 'Payment due date'
      }
    ];

    // Generate unique claim ID
    const claimId = `xero_${invoice.InvoiceID.substring(0, 8)}_${Date.now()}`;

    return {
      id: claimId,
      status: 'draft',
      lastModified: Date.now(),
      source: 'xero',
      claimant,
      defendant,
      invoice: {
        invoiceNumber: invoice.InvoiceNumber,
        dateIssued: invoiceDateISO,
        dueDate: dueDateISO,
        totalAmount: principal, // Use outstanding balance (AmountDue), not original total
        currency: invoice.CurrencyCode,
        description: invoice.Reference || `Imported from Xero: Invoice ${invoice.InvoiceNumber}`
      },
      interest,
      compensation,
      courtFee,
      timeline,
      evidence: [],
      userNotes: `Imported from Xero on ${new Date().toLocaleDateString('en-GB')}\n\nOriginal amount: £${invoice.Total.toFixed(2)}\nAmount paid: £${invoice.AmountPaid.toFixed(2)}\nAmount due: £${invoice.AmountDue.toFixed(2)}`,
      chatHistory: [],
      assessment: null,
      selectedDocType: DocumentType.LBA, // Start with Letter Before Action
      generated: null,
      signature: null,
      importSource: {
        provider: 'xero',
        invoiceId: invoice.InvoiceID,
        importedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Bulk import: Fetch invoices, filter overdue, and transform to claims
   *
   * @param claimant - User's business details
   * @param connectionId - Nango connection ID (optional)
   * @returns Array of ClaimState objects
   */
  static async fetchAndTransformOverdueInvoices(
    claimant: Party,
    connectionId?: string
  ): Promise<ClaimState[]> {
    try {
      console.log('📥 Fetching Xero invoices...');

      // Fetch all invoices
      const allInvoices = await this.fetchInvoices(connectionId);
      console.log(`✅ Fetched ${allInvoices.length} invoices from Xero`);

      // Filter overdue
      const overdueInvoices = this.filterOverdueInvoices(allInvoices);
      console.log(`⚠️ Found ${overdueInvoices.length} overdue invoices`);

      if (overdueInvoices.length === 0) {
        return [];
      }

      // Fetch contact details and transform
      const claims: ClaimState[] = [];

      for (const invoice of overdueInvoices) {
        try {
          const contact = await this.fetchContactDetails(invoice.Contact.ContactID, connectionId);
          const claim = this.transformToClaim(invoice, contact, claimant);
          claims.push(claim);
        } catch (error) {
          console.error(`⚠️ Failed to import invoice ${invoice.InvoiceNumber}:`, error);
          // Continue with other invoices
        }
      }

      console.log(`✅ Successfully transformed ${claims.length} invoices to claims`);

      return claims;
    } catch (error) {
      console.error('❌ Bulk import failed:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for overdue invoices
   *
   * @param connectionId - Nango connection ID (optional)
   * @returns Summary stats
   */
  static async getOverdueSummary(connectionId?: string): Promise<{
    count: number;
    totalValue: number;
    oldestDaysOverdue: number;
    totalInterest: number;
  }> {
    const allInvoices = await this.fetchInvoices(connectionId);
    const overdueInvoices = this.filterOverdueInvoices(allInvoices);

    const totalValue = overdueInvoices.reduce((sum, inv) => sum + inv.AmountDue, 0);

    let oldestDaysOverdue = 0;
    let totalInterest = 0;

    overdueInvoices.forEach(invoice => {
      // Calculate interest on outstanding balance (AmountDue), not original total
      const principal = invoice.AmountDue > 0 ? invoice.AmountDue : invoice.Total;
      const interest = this.calculateInterest(principal, invoice.DueDate);
      if (interest.daysOverdue > oldestDaysOverdue) {
        oldestDaysOverdue = interest.daysOverdue;
      }
      totalInterest += interest.totalInterest;
    });

    return {
      count: overdueInvoices.length,
      totalValue,
      oldestDaysOverdue,
      totalInterest
    };
  }
}
