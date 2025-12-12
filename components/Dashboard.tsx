import React, { useMemo, useState } from 'react';
import { ClaimState, DocumentType, AccountingConnection, Deadline } from '../types';
import { Plus, FileText, CheckCircle2, Trash2, Upload, Briefcase, Calendar, ChevronRight, Zap, Link as LinkIcon, Download, XCircle, Search, Filter, PoundSterling, CircleCheck, Clock, AlertCircle, FolderOpen, MessageSquare, ClipboardList } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { DeadlineWidget } from './DeadlineWidget';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { EvidenceLibrary } from './EvidenceLibrary';

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
  onCreateDemo?: () => void;
  onStartManualWizard?: () => void;
  // Deadline props
  deadlines?: Deadline[];
  onDeadlineClick?: (deadline: Deadline) => void;
  onCompleteDeadline?: (deadline: Deadline) => void;
  onViewAllDeadlines?: () => void;
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
  onDeleteAllData,
  onCreateDemo,
  onStartManualWizard,
  deadlines = [],
  onDeadlineClick,
  onCompleteDeadline,
  onViewAllDeadlines
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'claims' | 'evidence'>('claims');
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
      case 'court': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'judgment': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'paid': return 'bg-green-50 text-green-600 border-green-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Helper to determine next action
  const getNextAction = (claim: ClaimState) => {
      if (claim.status === 'draft') return { label: 'Review Draft', date: null, urgent: false };
      if (claim.status === 'overdue') return { label: 'Send Reminder', date: new Date(Date.now() + 86400000).toISOString(), urgent: true }; // Due tomorrow
      if (claim.status === 'pre-action') return { label: 'Wait for Response', date: new Date(Date.now() + 30*86400000).toISOString(), urgent: false }; // 30 days
      if (claim.status === 'court') return { label: 'File Particulars', date: null, urgent: true };
      return { label: 'View Details', date: null, urgent: false };
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
              <Button
                variant="secondary"
                onClick={onConnectAccounting}
                icon={<LinkIcon className="w-4 h-4 text-teal-500" />}
              >
                {accountingConnection ? 'Connected' : 'Connect Xero'}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={onImportCsv}
              aria-label="Import claims from CSV file"
              icon={<Upload className="w-4 h-4" />}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              onClick={onCreateNew}
              aria-label="Create new claim case"
              icon={<Plus className="w-4 h-4" />}
            >
              New Claim
            </Button>
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
            <Input
              label="Search claims"
              hideLabel
              noMargin
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              icon={<Search className="w-4 h-4" />}
              className="py-2.5"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Select
              label="Filter by status"
              hideLabel
              noMargin
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'pre-action', label: 'Pre-Action' },
                { value: 'court', label: 'Court' },
                { value: 'judgment', label: 'Judgment' },
                { value: 'paid', label: 'Paid' },
              ]}
              className="pl-10 pr-10 py-2.5 appearance-none cursor-pointer min-w-[160px] rounded-xl"
            />
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>
      )}

      {/* Results Count */}
      {claims.length > 0 && filteredClaims.length !== claims.length && (
        <div className="mb-4 text-sm text-slate-500">
          Showing {filteredClaims.length} of {claims.length} claims
        </div>
      )}

      {/* Deadline Widget */}
      {deadlines.length > 0 && onDeadlineClick && onCompleteDeadline && onViewAllDeadlines && (
        <DeadlineWidget
          deadlines={deadlines}
          claims={claims}
          onDeadlineClick={onDeadlineClick}
          onCompleteDeadline={onCompleteDeadline}
          onViewAllClick={onViewAllDeadlines}
        />
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'claims'
              ? 'border-teal-500 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Claims
          {claims.length > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              activeTab === 'claims' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {claims.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'evidence'
              ? 'border-teal-500 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Evidence Library
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'evidence' ? (
        <EvidenceLibrary
          claims={claims}
          onViewClaim={(claimId) => {
            const claim = claims.find(c => c.id === claimId);
            if (claim) onResume(claim);
          }}
        />
      ) : (
        <>
        {/* Claims Table - Clean table design matching mockup */}
        {claims.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
           <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-7 h-7" />
           </div>
           <h3 className="text-lg font-semibold text-slate-900 mb-2">No Claims Yet</h3>
           <p className="text-slate-500 mb-6 max-w-md mx-auto">Choose how you'd like to start recovering your unpaid debt.</p>

           {/* Dual CTA options */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto px-4 mb-6">
             <button
               onClick={onCreateNew}
               className="group flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-teal-50 to-teal-100/50 border-2 border-teal-200 rounded-xl hover:border-teal-400 hover:shadow-md transition-all"
             >
               <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 group-hover:bg-teal-200 transition-colors">
                 <MessageSquare className="w-6 h-6" />
               </div>
               <div className="text-center">
                 <span className="block font-semibold text-slate-900 mb-1">Start with AI Assistant</span>
                 <span className="text-sm text-slate-500">Upload documents and chat to extract details</span>
               </div>
             </button>

             {onStartManualWizard && (
               <button
                 onClick={onStartManualWizard}
                 className="group flex flex-col items-center gap-3 p-6 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-slate-400 hover:shadow-md transition-all"
               >
                 <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
                   <ClipboardList className="w-6 h-6" />
                 </div>
                 <div className="text-center">
                   <span className="block font-semibold text-slate-900 mb-1">Start with Manual Wizard</span>
                   <span className="text-sm text-slate-500">Enter claim details step by step</span>
                 </div>
               </button>
             )}
           </div>

           {onCreateDemo && (
             <div className="pt-4 border-t border-slate-100">
               <p className="text-xs text-slate-400 mb-2">Or explore with sample data</p>
               <Button variant="ghost" size="sm" onClick={onCreateDemo}>
                 Load Demo Claim
               </Button>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
             <span className="col-span-4">Debtor</span>
             <span className="col-span-2 hidden md:block">Value</span>
             <span className="col-span-3">Next Step</span>
             <span className="col-span-2 hidden md:block">Status</span>
             <span className="col-span-1 text-right hidden md:block"></span>
          </div>

          {filteredClaims.length === 0 && claims.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">No matches found</h3>
              <p className="text-slate-500 mb-4 text-sm">Try adjusting your search or filter</p>
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-sm font-medium"
              >
                Clear filters
              </Button>
            </div>
          ) : paginatedClaims.map((claim, idx) => {
            const stageBadgeColor = getStatusBadgeColor(claim.status);
            const nextAction = getNextAction(claim);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-all duration-200 hover:bg-slate-50 ${
                idx !== paginatedClaims.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
               {/* Debtor */}
               <div className="col-span-8 md:col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex-shrink-0">
                     <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                     <p className="font-medium text-slate-900 truncate">{claim.defendant.name || "Unknown Entity"}</p>
                     <p className="text-xs text-slate-400 font-mono">{claim.id.toUpperCase().slice(0,8)}</p>
                     
                     {/* MOBILE ONLY: Show Value and Status here */}
                     <div className="md:hidden flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-slate-700">
                          £{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${stageBadgeColor}`}>
                          {claim.status}
                        </span>
                     </div>
                  </div>
               </div>

               {/* Value */}
               <div className="col-span-2 hidden md:block">
                  <p className="font-medium text-slate-700">£{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
               </div>

               {/* Next Action */}
               <div className="col-span-4 md:col-span-3">
                  <div className="flex flex-col items-end md:items-start">
                    <div className="flex items-center gap-1.5 font-medium text-slate-900 text-sm text-right md:text-left">
                        {nextAction.urgent && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                        {nextAction.label}
                    </div>
                    {nextAction.date && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 justify-end md:justify-start">
                            <Clock className="w-3 h-3" />
                            <span>Due {new Date(nextAction.date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}</span>
                        </div>
                    )}
                  </div>
               </div>

               {/* Status Badge */}
               <div className="col-span-2 hidden md:flex items-center">
                   <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide border ${stageBadgeColor}`}>
                       {claim.status}
                   </span>
               </div>

               {/* Action Arrow */}
               <div className="col-span-1 hidden md:flex items-center justify-end">
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
      </>
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
