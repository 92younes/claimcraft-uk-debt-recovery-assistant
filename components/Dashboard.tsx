import React, { useMemo, useState } from 'react';
import { ClaimState, DocumentType, AccountingConnection } from '../types';
import { Plus, FileText, CheckCircle2, Trash2, Upload, Briefcase, Calendar, ChevronRight, Zap, Link as LinkIcon, Download, XCircle, Search, Filter, PoundSterling, CircleCheck } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredClaims.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClaims, currentPage]);

  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);

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

  // Status badge colors - Light theme with teal
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'overdue': return 'bg-red-50 text-red-600 border-red-200';
      case 'pre-action': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'court': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'judgment': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'paid': return 'bg-teal-50 text-teal-600 border-teal-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="md:p-0 p-4 max-w-7xl mx-auto animate-fade-in min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-display tracking-tight">Claims Dashboard</h1>
          <p className="text-base text-slate-500 mt-1">Manage and track your debt recovery cases</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {onConnectAccounting && (
              <button
                onClick={onConnectAccounting}
                className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-teal-400 text-slate-700 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LinkIcon className="w-4 h-4 text-teal-500" />
                {accountingConnection ? 'Connected' : 'Connect Xero'}
              </button>
            )}

            <button
              onClick={onImportCsv}
              aria-label="Import claims from CSV file"
              className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-teal-400 text-slate-700 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              <Upload className="w-4 h-4" aria-hidden="true" /> Import CSV
            </button>
            <button
              onClick={onCreateNew}
              aria-label="Create new claim case"
              className="flex-1 md:flex-none bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-teal-md focus:outline-none focus:ring-2 focus:ring-teal-500/30 btn-primary"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> New Claim
            </button>
        </div>
      </div>

      {/* Stats Row - Clean card design matching mockup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Total Recoverable - with gradient background */}
        <div className="bg-gradient-to-br from-teal-50 to-white p-5 rounded-xl border border-teal-100 flex items-center gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-24 h-24 bg-teal-100/50 rounded-full -mr-8 -mt-8"></div>
           <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
              <PoundSterling className="w-6 h-6" />
           </div>
           <div className="relative z-10">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Total Recoverable</p>
              <p className="text-2xl font-bold text-slate-900">£{totalRecoverable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
           </div>
        </div>

        {/* Active Claims */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
           <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
              <Briefcase className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Active Claims</p>
              <p className="text-2xl font-bold text-slate-900">{activeClaims}</p>
           </div>
        </div>

        {/* Status - All Good or needs attention */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center gap-4">
           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${urgentActions > 0 ? 'bg-amber-50 text-amber-500' : 'bg-teal-50 text-teal-500'}`}>
              <CircleCheck className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">Status</p>
              <p className={`text-xl font-bold ${urgentActions > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {urgentActions > 0 ? `${urgentActions} Need Action` : 'All Good'}
              </p>
           </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {claims.length > 0 && (
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all duration-200"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 appearance-none cursor-pointer min-w-[140px] transition-all duration-200"
            >
              <option value="all">All Status</option>
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

      {/* Claims Table - Clean table design matching mockup */}
      {claims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
           <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-7 h-7" />
           </div>
           <h3 className="text-lg font-semibold text-slate-900 mb-2">No Claims Yet</h3>
           <p className="text-slate-500 mb-6">Start a new claim to recover your unpaid debt.</p>
           <button onClick={onCreateNew} className="text-teal-600 font-medium hover:text-teal-700 transition-colors">Create your first claim</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
             <span className="col-span-4">Debtor</span>
             <span className="col-span-2 hidden md:block">Value</span>
             <span className="col-span-2 hidden md:block">Document</span>
             <span className="col-span-2">Status</span>
             <span className="col-span-2 text-right hidden md:block">Last Updated</span>
          </div>

          {filteredClaims.length === 0 && claims.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">No matches found</h3>
              <p className="text-slate-500 mb-4 text-sm">Try adjusting your search or filter</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-teal-600 font-medium hover:text-teal-700 transition-colors text-sm"
              >
                Clear filters
              </button>
            </div>
          ) : paginatedClaims.map((claim, idx) => {
            const stageBadgeColor = getStatusBadgeColor(claim.status);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                idx !== paginatedClaims.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
               {/* Debtor */}
               <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex-shrink-0">
                     <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                     <p className="font-medium text-slate-900 truncate">{claim.defendant.name || "Unknown Entity"}</p>
                     <p className="text-xs text-slate-400 font-mono">{claim.id.toUpperCase().slice(0,8)}</p>
                  </div>
               </div>

               {/* Value */}
               <div className="col-span-2 hidden md:block">
                  <p className="font-medium text-slate-700">£{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
               </div>

               {/* Document */}
               <div className="col-span-2 hidden md:block">
                  <p className="text-sm text-slate-600">
                    {claim.selectedDocType === 'lba' ? 'LBA' :
                     claim.selectedDocType === 'n1' ? 'N1 Form' :
                     'Pending'}
                  </p>
               </div>

               {/* Status Badge */}
               <div className="col-span-2">
                   <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${stageBadgeColor}`}>
                       {claim.status}
                   </span>
               </div>

               {/* Last Updated + Actions */}
               <div className="col-span-2 hidden md:flex items-center justify-end gap-3">
                   <span className="text-sm text-slate-500">{new Date(claim.lastModified).toLocaleDateString('en-GB')}</span>
                   <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
               </div>

               {/* Delete button - visible on hover */}
               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(claim.id, claim.defendant.name || 'Unknown');
                  }}
                  aria-label={`Delete claim for ${claim.defendant.name || 'Unknown'}`}
                  className="absolute right-16 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
               >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
               </button>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredClaims.length > itemsPerPage && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Data Management Section (GDPR Compliance) */}
      {(onExportAllData || onDeleteAllData) && claims.length > 0 && (
        <div className="mt-10 pt-8 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Data Management</h2>
              <p className="text-sm text-slate-500">Export or delete your claim data (GDPR rights)</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {onExportAllData && (
                <button
                  onClick={onExportAllData}
                  className="flex-1 md:flex-none bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export All
                </button>
              )}
              {onDeleteAllData && (
                <button
                  onClick={onDeleteAllData}
                  className="flex-1 md:flex-none bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4" />
                  Delete All
                </button>
              )}
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-800">Your GDPR Rights:</strong> Export data as JSON (Article 20) or permanently delete all data (Article 17).
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
