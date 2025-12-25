import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ClaimState, DocumentType, AccountingConnection, Deadline, DeadlinePriority, DeadlineStatus, Step } from '../types';
import { Plus, FileText, CheckCircle2, Trash2, Upload, Briefcase, Calendar, ChevronRight, Zap, Link as LinkIcon, Download, XCircle, Search, Filter, PoundSterling, CircleCheck, AlertTriangle, Clock, ChevronLeft, ArrowUpDown, ArrowUp, ArrowDown, X, Edit3, Scale, MessageSquareText, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { ConfirmModal } from './ConfirmModal';
import { QuickEditModal } from './QuickEditModal';
import { Tooltip } from './ui/Tooltip';
import { getDaysUntilDeadline } from '../services/deadlineService';
import { DashboardEmptyState } from './Dashboard_empty_state';
import { safeFormatDate } from '../utils/formatters';

/**
 * Sanitize null-like strings that may have been stored in claim data.
 * Returns empty string for values that should be treated as missing.
 */
const sanitizeDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === 'none') {
    return '';
  }
  return value.trim();
};

interface DashboardProps {
  claims: ClaimState[];
  onCreateNew: () => void;
  onResume: (claim: ClaimState) => void;
  onDelete: (id: string) => void;
  onUpdateClaim?: (claim: ClaimState) => Promise<void>;
  onImportCsv: () => void;
  accountingConnection?: AccountingConnection | null;
  onConnectAccounting?: () => void;
  onExportAllData?: () => void;
  onDeleteAllData?: () => void;
  // Optional for backward compatibility if needed, but App passes them
  onCreateDemo?: () => void;
  onStartManualWizard?: () => void;
  deadlines?: Deadline[];
  onDeadlineClick?: (deadline: Deadline) => void;
  onCompleteDeadline?: (deadline: Deadline) => void;
  onViewAllDeadlines?: () => void;
}

type SortField = 'defendant' | 'value' | 'status' | 'lastUpdated';
type SortDirection = 'asc' | 'desc' | null;

export const Dashboard: React.FC<DashboardProps> = ({
  claims,
  onCreateNew,
  onResume,
  onDelete,
  onUpdateClaim,
  onImportCsv,
  accountingConnection,
  onConnectAccounting,
  onExportAllData,
  onDeleteAllData,
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
  const itemsPerPage = 15;

  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Bulk actions state
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Quick edit modal state
  const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
  const [claimToEdit, setClaimToEdit] = useState<ClaimState | null>(null);
  const totalRecoverable = claims.reduce((acc, curr) => acc + curr.invoice.totalAmount + curr.interest.totalInterest + curr.compensation, 0);
  // Exclude claims with £0 value and no defendant name from active count (they're incomplete drafts)
  const activeClaims = claims.filter(c =>
    c.status !== 'paid' &&
    (c.invoice.totalAmount > 0 || c.defendant.name?.trim())
  ).length;

  // Count urgent actions (claims needing attention)
  const urgentActions = useMemo(() => {
    return claims.filter(c => c.status === 'overdue').length;
  }, [claims]);

  // Status order for sorting (overdue is highest priority)
  const statusOrder: Record<string, number> = {
    overdue: 1,
    court: 2,
    judgment: 3,
    review: 4,
    sent: 5,
    draft: 6,
    paid: 7
  };

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter, search, and sort claims
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

    // Apply sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'defendant':
            comparison = a.defendant.name.localeCompare(b.defendant.name);
            break;
          case 'value':
            comparison = a.invoice.totalAmount - b.invoice.totalAmount;
            break;
          case 'status':
            comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            break;
          case 'lastUpdated':
            comparison = a.lastModified - b.lastModified;
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [claims, statusFilter, searchQuery, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const paginatedClaims = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClaims.slice(startIndex, endIndex);
  }, [filteredClaims, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Clear selections when filters or page changes
  React.useEffect(() => {
    setSelectedClaims(new Set());
  }, [searchQuery, statusFilter, currentPage]);

  // Bulk actions handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClaims(new Set(paginatedClaims.map(c => c.id)));
    } else {
      setSelectedClaims(new Set());
    }
  };

  const handleSelectClaim = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedClaims);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedClaims(newSelected);
  };

  const handleBulkDelete = () => {
    setBulkDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = () => {
    selectedClaims.forEach(id => onDelete(id));
    setSelectedClaims(new Set());
    setBulkDeleteModalOpen(false);
  };

  const handleBulkExport = () => {
    const selectedClaimsData = claims.filter(c => selectedClaims.has(c.id));
    const dataStr = JSON.stringify(selectedClaimsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `claimcraft-selected-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!onUpdateClaim) {
      toast.error('Unable to update claims');
      return;
    }

    const claimsToUpdate = claims.filter(c => selectedClaims.has(c.id));
    let successCount = 0;

    for (const claim of claimsToUpdate) {
      try {
        await onUpdateClaim({ ...claim, status: newStatus as ClaimState['status'] });
        successCount++;
      } catch (error) {
        console.error('Failed to update claim:', claim.id, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Updated ${successCount} claim${successCount !== 1 ? 's' : ''} to ${newStatus}`);
    }
    if (successCount < claimsToUpdate.length) {
      toast.error(`Failed to update ${claimsToUpdate.length - successCount} claim${claimsToUpdate.length - successCount !== 1 ? 's' : ''}`);
    }

    setSelectedClaims(new Set());
  };

  const handleClearSelection = () => {
    setSelectedClaims(new Set());
  };

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

  // Handle quick edit
  const handleQuickEditClick = (e: React.MouseEvent, claim: ClaimState) => {
    e.stopPropagation();
    setClaimToEdit(claim);
    setQuickEditModalOpen(true);
  };

  const handleQuickEditSave = async (updatedClaim: ClaimState) => {
    if (onUpdateClaim) {
      await onUpdateClaim(updatedClaim);
    }
  };

  // Check if all current page items are selected
  const isAllSelected = paginatedClaims.length > 0 && paginatedClaims.every(c => selectedClaims.has(c.id));
  const isSomeSelected = paginatedClaims.some(c => selectedClaims.has(c.id)) && !isAllSelected;

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-teal-600" />;
    }
    return <ArrowDown className="w-3.5 h-3.5 text-teal-600" />;
  };

  // Status badge colors - Consistent color system
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'review': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sent': return 'bg-green-50 text-green-700 border-green-200';
      case 'overdue': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'court': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'judgment': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Get claim progress (which workflow step the claim is at)
  // Steps: 1=Evidence, 2=Verify, 3=Strategy, 4=Draft, 5=Review
  const getClaimProgress = (claim: ClaimState): { currentStep: number; steps: string[]; completionPercentage: number; missingFields: string[] } => {
    const steps = ['Evidence', 'Verify', 'Strategy', 'Draft', 'Review'];
    let currentStep = 1;
    const missingFields: string[] = [];

    // Check for missing required fields (invoice number is optional)
    if (!claim.defendant.name) missingFields.push('Defendant name');
    if (!claim.defendant.address) missingFields.push('Defendant address');
    if (!claim.claimant.name) missingFields.push('Claimant name');
    if (!claim.claimant.address) missingFields.push('Claimant address');
    if (!claim.invoice.totalAmount || claim.invoice.totalAmount === 0) missingFields.push('Invoice amount');
    if (!claim.invoice.dateIssued) missingFields.push('Invoice date');

    // Determine step based on claim state
    if (claim.status === 'review' || claim.status === 'sent' || claim.status === 'paid') {
      currentStep = 5; // Review/Complete
    } else if (claim.generated) {
      currentStep = 4; // Draft generated
    } else if (claim.selectedDocType) {
      currentStep = 3; // Strategy selected
    } else if (claim.claimant?.name || claim.defendant?.name || claim.invoice?.totalAmount > 0) {
      currentStep = 2; // Has data to verify
    }

    // Calculate completion percentage based on current step
    const completionPercentage = Math.round((currentStep / steps.length) * 100);

    return { currentStep, steps, completionPercentage, missingFields };
  };

  // Progress indicator component
  const ProgressIndicator: React.FC<{ claim: ClaimState }> = ({ claim }) => {
    const { currentStep, steps, completionPercentage, missingFields } = getClaimProgress(claim);

    const tooltipContent = (
      <div className="text-xs">
        <div className="font-semibold mb-1">{steps[currentStep - 1]} (Step {currentStep} of 5)</div>
        <div className="text-slate-300 mb-1">{completionPercentage}% complete</div>
        {missingFields.length > 0 && (
          <div className="text-amber-300 mt-2">
            <div className="font-medium">Missing:</div>
            <ul className="list-disc list-inside">
              {missingFields.slice(0, 3).map((field, idx) => (
                <li key={idx}>{field}</li>
              ))}
              {missingFields.length > 3 && <li>+{missingFields.length - 3} more</li>}
            </ul>
          </div>
        )}
      </div>
    );

    return (
      <Tooltip content={tooltipContent}>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {steps.map((step, idx) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx + 1 <= currentStep ? 'bg-teal-500' : 'bg-slate-200'
                }`}
                title={step}
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400 ml-0.5 font-medium">{completionPercentage}%</span>
        </div>
      </Tooltip>
    );
  };

  // Status legend items
  const statusLegend = [
    { status: 'draft', label: 'Draft', color: 'bg-slate-400' },
    { status: 'review', label: 'Review', color: 'bg-blue-500' },
    { status: 'sent', label: 'Sent', color: 'bg-green-500' },
    { status: 'overdue', label: 'Overdue', color: 'bg-orange-500' },
    { status: 'court', label: 'Court', color: 'bg-purple-500' },
    { status: 'judgment', label: 'Judgment', color: 'bg-yellow-500' },
    { status: 'paid', label: 'Paid', color: 'bg-emerald-500' },
  ];

  return (
    <div className="md:p-0 p-2 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-display tracking-tight">Claims Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and track your debt recovery cases</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {onConnectAccounting && (
              <Button
                variant="outline"
                onClick={onConnectAccounting}
                icon={<LinkIcon className="w-4 h-4 text-teal-500" />}
                className="flex-1 md:flex-none"
              >
                {accountingConnection ? 'Connected' : 'Connect Xero'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onImportCsv}
              icon={<Upload className="w-4 h-4" />}
              aria-label="Import claims from CSV file"
              className="flex-1 md:flex-none"
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              onClick={onCreateNew}
              icon={<Plus className="w-4 h-4" />}
              aria-label="Create new claim case"
              className="flex-1 md:flex-none"
            >
              New Claim
            </Button>
        </div>
      </div>

      {/* Stats Row - Compact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
        {/* Total Recoverable */}
        <button
          onClick={() => {
            setStatusFilter('all');
            setSearchQuery('');
          }}
          className="bg-gradient-to-br from-teal-50 to-white p-3 rounded-lg border border-teal-100 flex items-center gap-2.5 relative overflow-hidden hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer text-left w-full"
          aria-label="Show all claims with recoverable amounts"
        >
           <div className="absolute top-0 right-0 w-16 h-16 bg-teal-100/50 rounded-full -mr-4 -mt-4"></div>
           <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
              <PoundSterling className="w-4 h-4" />
           </div>
           <div className="relative z-10">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Recoverable</p>
              <p className="text-lg font-bold text-slate-900">£{totalRecoverable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
           </div>
        </button>

        {/* Active Claims */}
        <button
          onClick={() => {
            setStatusFilter('all');
            setSearchQuery('');
          }}
          className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-2.5 hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer text-left w-full"
          aria-label="Show all active claims"
        >
           <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 flex-shrink-0">
              <Briefcase className="w-4 h-4" />
           </div>
           <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Active Claims</p>
              <p className="text-lg font-bold text-slate-900">{activeClaims}</p>
           </div>
        </button>

        {/* Status */}
        <button
          onClick={() => {
            if (urgentActions > 0) {
              setStatusFilter('overdue');
              setSearchQuery('');
            }
          }}
          className={`bg-white p-3 rounded-lg border flex items-center gap-2.5 transition-all text-left w-full ${
            urgentActions > 0
              ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-sm cursor-pointer'
              : 'border-slate-200 cursor-default'
          }`}
          disabled={urgentActions === 0}
          aria-label={urgentActions > 0 ? 'Show overdue claims' : 'No claims need action'}
        >
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${urgentActions > 0 ? 'bg-amber-100 text-amber-600' : 'bg-teal-50 text-teal-500'}`}>
              {urgentActions > 0 ? <AlertTriangle className="w-4 h-4" /> : <CircleCheck className="w-4 h-4" />}
           </div>
           <div>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Status</p>
              <p className={`text-base font-bold ${urgentActions > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {urgentActions > 0 ? `${urgentActions} Need Action` : 'All Good'}
              </p>
           </div>
        </button>
      </div>

      {/* Status Color Legend */}
      {claims.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          {statusLegend.map(({ status, label, color }) => {
            const count = claims.filter(c => c.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                  statusFilter === status ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'
                } ${count === 0 ? 'opacity-50' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-slate-600">{label}</span>
                {count > 0 && (
                  <span className="text-slate-400 font-medium">({count})</span>
                )}
              </button>
            );
          })}
          {/* Amount Legend */}
          <span className="ml-auto text-slate-400">
            <span className="text-teal-600">*</span> = includes statutory interest + compensation
          </span>
        </div>
      )}

      {/* Search and Filter Bar with Claim Count */}
      {claims.length > 0 && (
        <div className="mb-2 flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          {/* Claim Count - Left side */}
          <div className="text-sm text-slate-500 whitespace-nowrap flex-shrink-0">
            {filteredClaims.length !== claims.length ? (
              <>{filteredClaims.length} of {claims.length}</>
            ) : (
              <>{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredClaims.length)} of {filteredClaims.length}</>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all duration-200 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="relative flex-shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-6 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 appearance-none cursor-pointer min-w-[130px] transition-all duration-200 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="overdue">Overdue</option>
              <option value="review">Review</option>
              <option value="sent">Sent</option>
              <option value="court">Court</option>
              <option value="judgment">Judgment</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedClaims.size > 0 && (
        <div className="mb-2 bg-teal-50/30 border border-slate-200 border-l-4 border-l-teal-500 rounded-lg px-3 py-2 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{selectedClaims.size} claim{selectedClaims.size !== 1 ? 's' : ''} selected</span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-xs text-teal-700 hover:text-teal-900 underline"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkExport}
              icon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>

            <div className="relative group">
              <Button
                variant="secondary"
                size="sm"
                className="px-3"
              >
                Change Status
                <ChevronRight className="w-3 h-3 ml-1 -rotate-90" />
              </Button>
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {['draft', 'review', 'sent', 'overdue', 'court', 'judgment', 'paid'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleBulkStatusChange(status)}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors capitalize"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>

            <button
              onClick={handleClearSelection}
              className="ml-2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              aria-label="Close bulk actions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Claims Table - Clean table design matching mockup */}
      {claims.length === 0 ? (
        <DashboardEmptyState onCreateNew={onCreateNew} />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-3 md:px-4 py-2 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50/50">
             {/* Checkbox column */}
             <div className="col-span-1 flex items-center">
               <input
                 type="checkbox"
                 checked={isAllSelected}
                 ref={(el) => {
                   if (el) el.indeterminate = isSomeSelected;
                 }}
                 onChange={(e) => handleSelectAll(e.target.checked)}
                 className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                 aria-label="Select all claims"
               />
             </div>

             {/* Defendant - Sortable */}
             <button
               onClick={() => handleSort('defendant')}
               className="col-span-3 flex items-center gap-1.5 hover:text-slate-700 transition-colors text-left focus:outline-none focus:text-slate-700"
             >
               <span>Defendant</span>
               {renderSortIcon('defendant')}
             </button>

             {/* Value - Sortable */}
             <button
               onClick={() => handleSort('value')}
               className="col-span-2 hidden md:flex items-center gap-1.5 hover:text-slate-700 transition-colors text-left focus:outline-none focus:text-slate-700"
             >
               <span>Value</span>
               {renderSortIcon('value')}
             </button>

             {/* Document - Not sortable */}
             <span className="col-span-2 hidden md:block">Document</span>

             {/* Status - Sortable */}
             <button
               onClick={() => handleSort('status')}
               className="col-span-2 flex items-center gap-1.5 hover:text-slate-700 transition-colors text-left focus:outline-none focus:text-slate-700"
             >
               <span>Status</span>
               {renderSortIcon('status')}
             </button>

             {/* Last Updated - Sortable */}
             <button
               onClick={() => handleSort('lastUpdated')}
               className="col-span-2 hidden md:flex items-center gap-1.5 hover:text-slate-700 transition-colors text-right justify-end focus:outline-none focus:text-slate-700"
             >
               <span>Last Updated</span>
               {renderSortIcon('lastUpdated')}
             </button>
          </div>

          {filteredClaims.length === 0 && claims.length > 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-2">No claims match your search</h3>
              <p className="text-slate-500 mb-4 text-sm">Try different keywords or clear your filters</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="p-0 h-auto"
              >
                Clear all filters
              </Button>
            </div>
          ) : paginatedClaims.map((claim, idx) => {
            const stageBadgeColor = getStatusBadgeColor(claim.status);
            // Sanitize invoice number to avoid displaying literal "null" strings
            const sanitizedInvoiceNumber = sanitizeDisplayValue(claim.invoice.invoiceNumber);
            // Provide more meaningful display for claims without defendant names
            const defendantName = sanitizeDisplayValue(claim.defendant.name)
              ? claim.defendant.name
              : sanitizedInvoiceNumber
                ? `Invoice #${sanitizedInvoiceNumber.slice(0, 12)}${sanitizedInvoiceNumber.length > 12 ? '...' : ''}`
                : `Draft Claim`;
            const isUnknownDefendant = !sanitizeDisplayValue(claim.defendant.name);
            const isSelected = selectedClaims.has(claim.id);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group grid grid-cols-12 gap-3 px-3 md:px-4 py-2 items-center transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-teal-50/50 hover:bg-teal-100/50'
                  : idx % 2 === 1
                    ? 'bg-slate-50/40 hover:bg-slate-100'
                    : 'bg-white hover:bg-slate-50'
              } ${
                idx !== paginatedClaims.length - 1 ? 'border-b border-slate-100' : ''
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onResume(claim); }}
              aria-label={`Open claim for ${defendantName}`}
            >
               {/* Checkbox */}
               <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                 <input
                   type="checkbox"
                   checked={isSelected}
                   onChange={(e) => {
                     handleSelectClaim(claim.id, e.target.checked);
                   }}
                   className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                   aria-label={`Select claim for ${defendantName}`}
                 />
               </div>

               {/* Debtor */}
               <div className="col-span-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors flex-shrink-0">
                     <FileText className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                     <Tooltip content={isUnknownDefendant ? 'Add defendant details to complete this claim' : defendantName}>
                       <p className={`text-sm font-medium truncate max-w-[180px] ${isUnknownDefendant ? 'text-slate-500 italic' : 'text-slate-900'}`}>
                         {defendantName}
                       </p>
                     </Tooltip>
                     <div className="flex items-center gap-1.5">
                       <p className="text-[10px] text-slate-400 font-mono">{claim.id.toUpperCase().slice(0,8)}</p>
                       <ProgressIndicator claim={claim} />
                     </div>
                  </div>
               </div>

               {/* Value */}
               <div className="col-span-2 hidden md:block">
                  {(() => {
                    const totalValue = claim.invoice.totalAmount + claim.interest.totalInterest + claim.compensation;
                    const hasInterestOrComp = claim.interest.totalInterest > 0 || claim.compensation > 0;
                    return (
                      <Tooltip content={hasInterestOrComp ? `Principal: £${claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })} + Interest: £${claim.interest.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })} + Compensation: £${claim.compensation.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : 'Principal amount only'}>
                        <p className="text-sm font-medium text-slate-700">
                          £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          {hasInterestOrComp && <span className="text-teal-600 text-[10px] ml-0.5">*</span>}
                        </p>
                      </Tooltip>
                    );
                  })()}
               </div>

               {/* Document */}
               <div className="col-span-2 hidden md:block">
                  {claim.selectedDocType ? (
                    <p className="text-xs text-slate-600">
                      {claim.selectedDocType === DocumentType.LBA ? 'LBA' :
                       claim.selectedDocType === DocumentType.FORM_N1 ? 'N1 Form' :
                       claim.selectedDocType === DocumentType.POLITE_CHASER ? 'Reminder' :
                       claim.selectedDocType}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Not selected</p>
                  )}
               </div>

               {/* Status Badge */}
               <div className="col-span-2">
                   <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide border ${stageBadgeColor}`}>
                       {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                   </span>
               </div>

               {/* Last Updated + Actions */}
               <div className="col-span-2 hidden md:flex items-center justify-end gap-1.5">
                   <span className="text-xs text-slate-500">
                     {new Date(claim.lastModified).toLocaleDateString('en-GB')}
                   </span>

                   {/* Quick Edit button - visible on hover */}
                   {onUpdateClaim && (
                     <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        onClick={(e) => handleQuickEditClick(e, claim)}
                        icon={<Edit3 className="w-3.5 h-3.5" />}
                        aria-label={`Quick edit claim for ${defendantName}`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-opacity p-1"
                     />
                   )}

                   {/* Delete button - visible on hover */}
                   <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(claim.id, defendantName);
                      }}
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      aria-label={`Delete claim for ${defendantName}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-opacity p-1"
                   />

                   {/* Visual indicator that row is clickable */}
                   <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
               </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {claims.length > 0 && filteredClaims.length > itemsPerPage && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              icon={<ChevronLeft className="w-4 h-4" />}
              aria-label="Previous page"
            >
              Previous
            </Button>

            {/* Page numbers */}
            <div className="hidden md:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;

                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-teal-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="w-4 h-4" />}
              aria-label="Next page"
            >
              Next
            </Button>
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

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Delete Multiple Claims"
        message={`Are you sure you want to permanently delete ${selectedClaims.size} claim${selectedClaims.size !== 1 ? 's' : ''}? This action cannot be undone and all associated data will be lost.`}
        confirmText={`Delete ${selectedClaims.size} Claim${selectedClaims.size !== 1 ? 's' : ''}`}
        cancelText="Cancel"
        variant="danger"
      />

      {/* Quick Edit Modal */}
      <QuickEditModal
        isOpen={quickEditModalOpen}
        onClose={() => {
          setQuickEditModalOpen(false);
          setClaimToEdit(null);
        }}
        claim={claimToEdit}
        onSave={handleQuickEditSave}
      />
    </div>
  );
};
