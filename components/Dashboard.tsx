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

  // Simple status badge color helper (dark theme)
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-500/20 text-slate-300 border-slate-600';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'pre-action': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'court': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'judgment': return 'bg-violet-500/20 text-violet-400 border-violet-500/50';
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in pt-20 md:pt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-serif mb-2">Legal Dashboard</h1>
          <p className="text-slate-400">Overview of your active litigation files.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {accountingConnection && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-glow-success"></div>
                <span className="text-sm font-medium text-green-400">Xero Connected</span>
              </div>
            )}

            {onConnectAccounting && (
              <button
                onClick={onConnectAccounting}
                className="flex-1 md:flex-none bg-dark-700 border border-dark-600 hover:border-violet-500/50 text-slate-300 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200"
              >
                <LinkIcon className="w-4 h-4" />
                {accountingConnection ? 'Manage' : 'Connect'} Accounting
              </button>
            )}

            <button
              onClick={onImportCsv}
              aria-label="Import claims from CSV file"
              className="flex-1 md:flex-none bg-dark-700 border border-dark-600 hover:border-violet-500/50 text-slate-300 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <Upload className="w-4 h-4" aria-hidden="true" /> Import CSV
            </button>
            <button
              onClick={onCreateNew}
              aria-label="Create new claim case"
              className="flex-1 md:flex-none bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white px-6 py-3 rounded-xl font-bold shadow-glow flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> New Case File
            </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 p-6 rounded-2xl shadow-glow flex items-center gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
           <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
              <Scale className="w-6 h-6" />
           </div>
           <div className="relative z-10">
              <p className="text-xs font-bold text-violet-200 uppercase tracking-wide">Total Exposure</p>
              <p className="text-2xl font-bold text-white font-serif">£{totalRecoverable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
           </div>
        </div>
        <div className="bg-dark-700 p-6 rounded-2xl border border-dark-600 flex items-center gap-4 hover:border-violet-500/30 transition-all duration-300">
           <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center text-violet-400">
              <Briefcase className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active Cases</p>
              <p className="text-2xl font-bold text-white font-serif">{activeClaims}</p>
           </div>
        </div>
        <div className="bg-dark-700 p-6 rounded-2xl border border-dark-600 flex items-center gap-4 hover:border-violet-500/30 transition-all duration-300">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${urgentActions > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {urgentActions > 0 ? <Bell className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
           </div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                {urgentActions > 0 ? 'Urgent Actions' : 'Success Probability'}
              </p>
              <p className={`text-2xl font-bold font-serif ${urgentActions > 0 ? 'text-red-400' : 'text-white'}`}>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by debtor, invoice number, or claimant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 bg-dark-700 border border-dark-600 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 appearance-none cursor-pointer min-w-[180px] transition-all duration-200"
            >
              <option value="all" className="bg-dark-700">All Statuses</option>
              <option value="draft" className="bg-dark-700">Draft</option>
              <option value="overdue" className="bg-dark-700">Overdue</option>
              <option value="pre-action" className="bg-dark-700">Pre-Action</option>
              <option value="court" className="bg-dark-700">Court</option>
              <option value="judgment" className="bg-dark-700">Judgment</option>
              <option value="paid" className="bg-dark-700">Paid</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      {claims.length > 0 && filteredClaims.length !== claims.length && (
        <div className="mb-4 text-sm text-slate-400">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      )}

      {/* Claims List (Case File Style) */}
      {claims.length === 0 ? (
        <div className="text-center py-20 bg-dark-700 rounded-2xl border border-dashed border-dark-600">
           <div className="w-16 h-16 bg-dark-600 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
              <FileText className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No Active Cases</h3>
           <p className="text-slate-400 mb-6">Start a new file to recover your unpaid debt.</p>
           <div className="flex justify-center gap-4">
              <button onClick={onCreateNew} className="text-violet-400 font-bold hover:text-violet-300 transition-colors">Create your first case</button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-6 mb-2">
             <span>Case Details</span>
             <span className="hidden md:block mr-24">Workflow Stage</span>
          </div>
          {filteredClaims.length === 0 && claims.length > 0 ? (
            <div className="text-center py-12 bg-dark-700 rounded-xl border border-dark-600">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">No matches found</h3>
              <p className="text-slate-400 mb-4">Try adjusting your search or filter</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
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
              className={`group bg-dark-700 p-5 rounded-xl border transition-all duration-300 cursor-pointer relative hover:-translate-y-1 ${
                isUrgent ? 'border-red-500/50 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/10' : 'border-dark-600 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10'
              }`}
            >
               {/* Urgency indicator */}
               {isUrgent && (
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse z-10">
                   <Zap className="w-4 h-4 text-white" />
                 </div>
               )}

               <div className="flex flex-col gap-4">
                  {/* Top Row: ID, Parties, Stage */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                     {/* Left: ID & Date */}
                     <div className="flex items-center gap-4 min-w-[180px]">
                        <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-slate-400 group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors duration-200">
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
                             <p className="text-xs text-slate-500 uppercase font-bold mb-1">Defendant</p>
                             <p className="font-bold text-white text-lg truncate">{claim.defendant.name || "Unknown Entity"}</p>
                         </div>
                         <div>
                             <p className="text-xs text-slate-500 uppercase font-bold mb-1">Value</p>
                             <p className="font-mono text-slate-300">£{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                         </div>
                     </div>

                     {/* Right: Stage Badge */}
                     <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                         <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${stageBadgeColor}`}>
                             {claim.status}
                         </span>
                         <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all duration-200" />
                     </div>
                  </div>

                  {/* Bottom Row: Claim Info */}
                  <div className={`px-4 py-3 rounded-lg border-l-4 ${
                    isUrgent ? 'bg-red-500/10 border-red-500' : 'bg-dark-600 border-violet-500/50'
                  }`}>
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                           <FileText className="w-4 h-4 text-slate-500" />
                           <span className="text-sm font-medium text-slate-300">
                             {claim.selectedDocType === 'lba' ? 'Letter Before Action' :
                              claim.selectedDocType === 'n1' ? 'Form N1 Claim' :
                              'Document pending'}
                           </span>
                        </div>
                        {claim.interest.daysOverdue > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                             <span className="font-bold text-red-400">
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
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
        <div className="mt-12 pt-8 border-t border-dark-600">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Data Management</h2>
              <p className="text-sm text-slate-400">Export or delete your claim data (GDPR rights)</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {onExportAllData && (
                <button
                  onClick={onExportAllData}
                  className="flex-1 md:flex-none bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-semibold shadow-glow-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              )}
              {onDeleteAllData && (
                <button
                  onClick={onDeleteAllData}
                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4" />
                  Delete All Data
                </button>
              )}
            </div>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <p className="text-sm text-violet-200">
              <strong className="text-violet-300">Your GDPR Rights:</strong> You can export all your claim data as JSON (Article 20 - Data Portability)
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