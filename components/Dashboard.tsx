import React, { useMemo, useState } from 'react';
import { ClaimState, DocumentType, AccountingConnection } from '../types';
import { Plus, ArrowRight, FileText, Clock, CheckCircle2, TrendingUp, Trash2, Upload, AlertCircle, Briefcase, Scale, Calendar, ChevronRight, Bell, Zap, Link as LinkIcon, Download, XCircle, Search, Filter } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  claims: ClaimState[];
  onCreateNew: () => void;
  onResume: (claim: ClaimState) => void;
  onDelete: (id: string) => void;
  onImportCsv: () => void;
  accountingConnection?: AccountingConnection | null;
  onConnectAccounting?: () => void;
  onExportAllData?: () => void;
  onDeleteAllData?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  claims,
  onCreateNew,
  onResume,
  onDelete,
  onImportCsv,
  accountingConnection,
  onConnectAccounting,
  onExportAllData,
  onDeleteAllData
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const totalRecoverable = claims.reduce((acc, curr) => acc + curr.invoice.totalAmount + curr.interest.totalInterest + curr.compensation, 0);
  const activeClaims = claims.filter(c => c.status !== 'paid').length;

  // Count urgent actions (claims needing attention)
  const urgentActions = useMemo(() => {
    return claims.filter(c =>
      c.status === 'overdue' || c.status === 'pre-action'
    ).length;
  }, [claims]);

  // Filter and search claims
  const filteredClaims = useMemo(() => {
    let filtered = [...claims];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.defendant.name.toLowerCase().includes(query) ||
        c.invoice.invoiceNumber.toLowerCase().includes(query) ||
        c.claimant.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [claims, statusFilter, searchQuery]);

  // Handle delete confirmation
  const handleDeleteClick = (id: string, name: string) => {
    setClaimToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (claimToDelete) {
      onDelete(claimToDelete.id);
    }
  };

  // Status badge colors - Slate/Emerald theme
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'overdue': return 'bg-red-50 text-red-600 border-red-200';
      case 'pre-action': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'court': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'judgment': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in pt-20 md:pt-10 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-display tracking-tight mb-2">Legal Dashboard</h1>
          <p className="text-base text-slate-500 leading-relaxed">Overview of your active litigation files.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {accountingConnection && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-600">Xero Connected</span>
              </div>
            )}

            {onConnectAccounting && (
              <button
                onClick={onConnectAccounting}
                className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LinkIcon className="w-4 h-4" />
                {accountingConnection ? 'Manage' : 'Connect'} Accounting
              </button>
            )}

            <button
              onClick={onImportCsv}
              aria-label="Import claims from CSV file"
              className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <Upload className="w-4 h-4" aria-hidden="true" /> Import CSV
            </button>
            <button
              onClick={onCreateNew}
              aria-label="Create new claim case"
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-emerald-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 btn-primary"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> New Case File
            </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Hero stat - Emerald gradient */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 rounded-2xl shadow-emerald-lg flex items-center gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
           <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-6 -mb-6"></div>
           <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
              <Scale className="w-7 h-7" />
           </div>
           <div className="relative z-10">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider mb-1">Total Exposure</p>
              <p className="text-2xl md:text-3xl font-bold text-white font-mono">£{totalRecoverable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all duration-300 group">
           <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Briefcase className="w-7 h-7" />
           </div>
           <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Cases</p>
              <p className="text-2xl md:text-3xl font-bold text-slate-900 font-mono">{activeClaims}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition-all duration-300 group">
           <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${urgentActions > 0 ? 'bg-red-50 text-red-500 group-hover:bg-red-100' : 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100'}`}>
              {urgentActions > 0 ? <Bell className="w-7 h-7" /> : <TrendingUp className="w-7 h-7" />}
           </div>
           <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {urgentActions > 0 ? 'Urgent Actions' : 'Success Probability'}
              </p>
              <p className={`text-2xl md:text-3xl font-bold font-mono ${urgentActions > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                {urgentActions > 0 ? urgentActions : 'High'}
              </p>
           </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {claims.length > 0 && (
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by debtor, invoice number, or claimant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200 shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none cursor-pointer min-w-[180px] transition-all duration-200 shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="overdue">Overdue</option>
              <option value="pre-action">Pre-Action</option>
              <option value="court">Court</option>
              <option value="judgment">Judgment</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      {claims.length > 0 && filteredClaims.length !== claims.length && (
        <div className="mb-4 text-sm text-slate-500">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      )}

      {/* Claims List (Case File Style) */}
      {claims.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
           <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Cases</h3>
           <p className="text-slate-500 mb-6">Start a new file to recover your unpaid debt.</p>
           <div className="flex justify-center gap-4">
              <button onClick={onCreateNew} className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">Create your first case</button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 mb-2">
             <span>Case Details</span>
             <span className="hidden md:block mr-24">Workflow Stage</span>
          </div>
          {filteredClaims.length === 0 && claims.length > 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">No matches found</h3>
              <p className="text-slate-500 mb-4">Try adjusting your search or filter</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : filteredClaims.map((claim) => {
            const isUrgent = claim.status === 'overdue' || claim.status === 'pre-action';
            const stageBadgeColor = getStatusBadgeColor(claim.status);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group bg-white p-5 rounded-xl border transition-all duration-200 cursor-pointer relative hover:-translate-y-0.5 shadow-sm ${
                isUrgent ? 'border-red-200 hover:border-red-400 hover:shadow-md' : 'border-slate-200 hover:border-emerald-400 hover:shadow-md'
              }`}
            >
               {/* Urgency indicator */}
               {isUrgent && (
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse z-10">
                   <Zap className="w-3.5 h-3.5 text-white" />
                 </div>
               )}

               <div className="flex flex-col gap-4">
                  {/* Top Row: ID, Parties, Stage */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                     {/* Left: ID & Date */}
                     <div className="flex items-center gap-4 min-w-[180px]">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors duration-200">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-mono text-slate-500 mb-0.5">{claim.id.toUpperCase().slice(0,6)}</p>
                           <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(claim.lastModified).toLocaleDateString()}</p>
                        </div>
                     </div>

                     {/* Middle: Parties */}
                     <div className="flex-grow grid md:grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Defendant</p>
                             <p className="font-semibold text-slate-900 text-lg truncate">{claim.defendant.name || "Unknown Entity"}</p>
                         </div>
                         <div>
                             <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Value</p>
                             <p className="font-mono text-slate-700 font-medium">£{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                         </div>
                     </div>

                     {/* Right: Stage Badge */}
                     <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                         <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide border ${stageBadgeColor}`}>
                             {claim.status}
                         </span>
                         <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all duration-200" />
                     </div>
                  </div>

                  {/* Bottom Row: Claim Info */}
                  <div className={`px-4 py-3 rounded-lg border-l-4 ${
                    isUrgent ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-emerald-500'
                  }`}>
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                           <FileText className="w-4 h-4 text-slate-500" />
                           <span className="text-sm font-medium text-slate-700">
                             {claim.selectedDocType === 'lba' ? 'Letter Before Action' :
                              claim.selectedDocType === 'n1' ? 'Form N1 Claim' :
                              'Document pending'}
                           </span>
                        </div>
                        {claim.interest.daysOverdue > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                             <span className="font-semibold text-red-600">
                               {claim.interest.daysOverdue} days overdue
                             </span>
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Delete Hover */}
               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(claim.id, claim.defendant.name || 'Unknown');
                  }}
                  aria-label={`Delete claim for ${claim.defendant.name || 'Unknown'}`}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
               >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
               </button>
            </div>
            );
          })}
        </div>
      )}

      {/* Data Management Section (GDPR Compliance) */}
      {(onExportAllData || onDeleteAllData) && claims.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Data Management</h2>
              <p className="text-sm text-slate-500 leading-relaxed">Export or delete your claim data (GDPR rights)</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {onExportAllData && (
                <button
                  onClick={onExportAllData}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200 btn-primary"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              )}
              {onDeleteAllData && (
                <button
                  onClick={onDeleteAllData}
                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4" />
                  Delete All Data
                </button>
              )}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-slate-700">
              <strong className="text-slate-900">Your GDPR Rights:</strong> You can export all your claim data as JSON (Article 20 - Data Portability)
              or permanently delete all data (Article 17 - Right to Erasure). These actions cannot be undone.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Claim"
        message={`Are you sure you want to permanently delete the claim for "${claimToDelete?.name}"? This action cannot be undone and all associated data will be lost.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
