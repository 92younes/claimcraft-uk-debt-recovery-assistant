/**
 * Xero Invoice Importer Modal
 *
 * Displays overdue invoices from Xero in a selectable table.
 * Users can filter, select, and bulk import invoices as claims.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, CheckSquare, Square, Loader, AlertCircle, Filter, CheckCircle, AlertTriangle } from 'lucide-react';
import { XeroPuller, parseXeroDate } from '../services/xeroPuller';
import { ClaimState, Party, XeroInvoice } from '../types';

interface XeroInvoiceImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (claims: ClaimState[]) => void;
  claimant: Party; // User's business details
}

type FilterType = 'all' | '30days' | '60days' | '90days';

interface InvoiceRow {
  invoice: XeroInvoice;
  daysOverdue: number;
  selected: boolean;
}

export const XeroInvoiceImporter: React.FC<XeroInvoiceImporterProps> = ({
  isOpen,
  onClose,
  onImport,
  claimant
}) => {
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectAll, setSelectAll] = useState(false);

  // Load invoices when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInvoices();
    } else {
      // Reset state when modal closes
      setInvoiceRows([]);
      setFilter('all');
      setSelectAll(false);
      setError(null);
    }
  }, [isOpen]);

  const loadInvoices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allInvoices = await XeroPuller.fetchInvoices();
      const overdueInvoices = XeroPuller.filterOverdueInvoices(allInvoices);

      const rows: InvoiceRow[] = overdueInvoices.map(invoice => {
        // Use AmountDue (outstanding balance) for interest calculation, not Total
        // This is consistent with xeroPuller.ts transformToClaim()
        const principal = invoice.AmountDue > 0 ? invoice.AmountDue : invoice.Total;
        const interest = XeroPuller.calculateInterest(principal, invoice.DueDate);
        return {
          invoice,
          daysOverdue: interest.daysOverdue,
          selected: false
        };
      });

      // Sort by days overdue (descending)
      rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

      setInvoiceRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter invoices based on selected filter
  const filteredRows = useMemo(() => {
    if (filter === 'all') return invoiceRows;

    const threshold = filter === '30days' ? 30 : filter === '60days' ? 60 : 90;

    return invoiceRows.filter(row => row.daysOverdue >= threshold);
  }, [invoiceRows, filter]);

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const selected = filteredRows.filter(row => row.selected);
    const count = selected.length;
    const totalValue = selected.reduce((sum, row) => sum + row.invoice.Total, 0);

    return { count, totalValue };
  }, [filteredRows]);

  const handleToggleRow = (index: number) => {
    setInvoiceRows(prev => {
      const newRows = [...prev];
      const globalIndex = prev.indexOf(filteredRows[index]);
      newRows[globalIndex] = {
        ...newRows[globalIndex],
        selected: !newRows[globalIndex].selected
      };
      return newRows;
    });
  };

  const handleToggleAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    setInvoiceRows(prev => {
      return prev.map(row => {
        // Only toggle rows that are currently visible in filtered view
        if (filteredRows.includes(row)) {
          return { ...row, selected: newSelectAll };
        }
        return row;
      });
    });
  };

  const handleImport = async () => {
    const selectedInvoices = invoiceRows.filter(row => row.selected);

    if (selectedInvoices.length === 0) {
      setError('Please select at least one invoice to import');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const claims: ClaimState[] = [];

      for (const row of selectedInvoices) {
        try {
          const contact = await XeroPuller.fetchContactDetails(row.invoice.Contact.ContactID);
          const claim = XeroPuller.transformToClaim(row.invoice, contact, claimant);
          claims.push(claim);
        } catch (err) {
          console.error(`Failed to import invoice ${row.invoice.InvoiceNumber}:`, err);
          // Continue with other invoices
        }
      }

      if (claims.length === 0) {
        throw new Error('No invoices could be imported. Please check the console for errors.');
      }

      // Success! Pass claims to parent
      onImport(claims);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const getUrgencyBadge = (daysOverdue: number) => {
    if (daysOverdue >= 90) {
      return { icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-300', label: `${daysOverdue}d` };
    } else if (daysOverdue >= 60) {
      return { icon: AlertCircle, color: 'bg-orange-100 text-orange-700 border-orange-300', label: `${daysOverdue}d` };
    } else if (daysOverdue >= 30) {
      return { icon: AlertCircle, color: 'bg-amber-100 text-amber-700 border-amber-300', label: `${daysOverdue}d` };
    } else {
      return { icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300', label: `${daysOverdue}d` };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-3">
              <Download className="w-6 h-6 text-teal-600" />
              Import Overdue Invoices from Xero
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isLoading
                ? 'Loading invoices...'
                : `Found ${invoiceRows.length} overdue invoice${invoiceRows.length === 1 ? '' : 's'} in your Xero account`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="w-12 h-12 text-teal-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Fetching overdue invoices from Xero...</p>
              <p className="text-sm text-slate-400 mt-2">This may take a few seconds</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && invoiceRows.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Overdue Invoices!</h3>
              <p className="text-slate-600">All your invoices are up to date. Great job! 🎉</p>
            </div>
          )}

          {/* Invoice List */}
          {!isLoading && invoiceRows.length > 0 && (
            <>
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Filter:</span>
                {(['all', '30days', '60days', '90days'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      filter === f
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : `>${f.replace('days', '')} days`}
                  </button>
                ))}
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between py-2 border-y border-slate-200">
                <button
                  onClick={handleToggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors duration-200"
                >
                  {selectAll ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
                <div className="text-sm text-slate-600">
                  Selected: <span className="font-bold text-slate-900">{selectionSummary.count}</span> invoice{selectionSummary.count === 1 ? '' : 's'}
                  {selectionSummary.count > 0 && (
                    <span className="ml-2 text-teal-600 font-bold font-mono">
                      (£{selectionSummary.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })})
                    </span>
                  )}
                </div>
              </div>

              {/* Invoice Table */}
              <div className="space-y-2">
                {filteredRows.map((row, index) => {
                  const urgency = getUrgencyBadge(row.daysOverdue);
                  const Icon = urgency.icon;

                  return (
                    <div
                      key={row.invoice.InvoiceID}
                      onClick={() => handleToggleRow(index)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        row.selected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <div className="shrink-0">
                          {row.selected ? (
                            <CheckSquare className="w-5 h-5 text-teal-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {/* Invoice Number */}
                        <div className="min-w-[120px]">
                          <p className="font-mono font-bold text-slate-900">{row.invoice.InvoiceNumber}</p>
                          <p className="text-xs text-slate-500">
                            Due: {parseXeroDate(row.invoice.DueDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>

                        {/* Customer */}
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium text-slate-900 truncate">{row.invoice.Contact.Name}</p>
                          <p className="text-xs text-slate-500">{row.invoice.CurrencyCode}</p>
                        </div>

                        {/* Amount */}
                        <div className="min-w-[120px] text-right">
                          <p className="font-bold text-slate-900">
                            £{row.invoice.Total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-500">
                            Due: £{row.invoice.AmountDue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Urgency Badge */}
                        <div className={`px-3 py-1 rounded-lg border font-bold text-sm flex items-center gap-2 ${urgency.color}`}>
                          <Icon className="w-4 h-4" />
                          {urgency.label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filtered Empty State */}
              {filteredRows.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-600">No invoices match this filter</p>
                  <button
                    onClick={() => setFilter('all')}
                    className="mt-2 text-teal-600 font-medium hover:underline"
                  >
                    Show all invoices
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && invoiceRows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || selectionSummary.count === 0}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Importing {selectionSummary.count}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Import {selectionSummary.count} Invoice{selectionSummary.count === 1 ? '' : 's'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
