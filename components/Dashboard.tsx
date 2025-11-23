import React, { useMemo } from 'react';
import { ClaimState, DocumentType, AccountingConnection } from '../types';
import { Plus, ArrowRight, FileText, Clock, CheckCircle2, TrendingUp, Trash2, Upload, AlertCircle, Briefcase, Scale, Calendar, ChevronRight, Bell, Zap, Link as LinkIcon, Download, XCircle } from 'lucide-react';

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
  const totalRecoverable = claims.reduce((acc, curr) => acc + curr.invoice.totalAmount + curr.interest.totalInterest + curr.compensation, 0);
  const activeClaims = claims.filter(c => c.status !== 'paid').length;

  // Count urgent actions (claims needing attention)
  const urgentActions = useMemo(() => {
    return claims.filter(c =>
      c.status === 'overdue' || c.status === 'pre-action'
    ).length;
  }, [claims]);

  // Simple status badge color helper
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-300';
      case 'pre-action': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'court': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'judgment': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'paid': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in pt-20 md:pt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-serif mb-2">Legal Dashboard</h1>
          <p className="text-slate-500">Overview of your active litigation files.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {accountingConnection && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Xero Connected</span>
              </div>
            )}

            {onConnectAccounting && (
              <button
                onClick={onConnectAccounting}
                className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all duration-200"
              >
                <LinkIcon className="w-4 h-4" />
                {accountingConnection ? 'Manage' : 'Connect'} Accounting
              </button>
            )}

            <button
              onClick={onImportCsv}
              aria-label="Import claims from CSV file"
              className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Upload className="w-4 h-4" aria-hidden="true" /> Import CSV
            </button>
            <button
              onClick={onCreateNew}
              aria-label="Create new claim case"
              className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> New Case File
            </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 p-6 rounded-xl shadow-md flex items-center gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
           <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white border border-white/10 backdrop-blur-sm">
              <Scale className="w-6 h-6" />
           </div>
           <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Exposure</p>
              <p className="text-2xl font-bold text-white font-serif">£{totalRecoverable.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
              <Briefcase className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Cases</p>
              <p className="text-2xl font-bold text-slate-900 font-serif">{activeClaims}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${urgentActions > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              {urgentActions > 0 ? <Bell className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
           </div>
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                {urgentActions > 0 ? 'Urgent Actions' : 'Success Probability'}
              </p>
              <p className={`text-2xl font-bold font-serif ${urgentActions > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {urgentActions > 0 ? urgentActions : 'High'}
              </p>
           </div>
        </div>
      </div>

      {/* Claims List (Case File Style) */}
      {claims.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText className="w-8 h-8" />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Cases</h3>
           <p className="text-slate-500 mb-6">Start a new file to recover your unpaid debt.</p>
           <div className="flex justify-center gap-4">
              <button onClick={onCreateNew} className="text-blue-600 font-bold hover:underline">Create your first case</button>
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-6 mb-2">
             <span>Case Details</span>
             <span className="hidden md:block mr-24">Workflow Stage</span>
          </div>
          {claims.map((claim) => {
            const isUrgent = claim.status === 'overdue' || claim.status === 'pre-action';
            const stageBadgeColor = getStatusBadgeColor(claim.status);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative ${
                isUrgent ? 'border-red-300 hover:border-red-500' : 'border-slate-200 hover:border-blue-500'
              }`}
            >
               {/* Urgency indicator */}
               {isUrgent && (
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse z-10">
                   <Zap className="w-4 h-4 text-white" />
                 </div>
               )}

               <div className="flex flex-col gap-4">
                  {/* Top Row: ID, Parties, Stage */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                     {/* Left: ID & Date */}
                     <div className="flex items-center gap-4 min-w-[180px]">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-200">
                           <FileText className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-mono text-slate-500 mb-0.5">{claim.id.toUpperCase().slice(0,6)}</p>
                           <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(claim.lastModified).toLocaleDateString()}</p>
                        </div>
                     </div>

                     {/* Middle: Parties */}
                     <div className="flex-grow grid md:grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-slate-400 uppercase font-bold mb-1">Defendant</p>
                             <p className="font-bold text-slate-900 text-lg truncate">{claim.defendant.name || "Unknown Entity"}</p>
                         </div>
                         <div>
                             <p className="text-xs text-slate-400 uppercase font-bold mb-1">Value</p>
                             <p className="font-mono text-slate-700">£{claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                         </div>
                     </div>

                     {/* Right: Stage Badge */}
                     <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                         <span className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border ${stageBadgeColor}`}>
                             {claim.status}
                         </span>
                         <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                     </div>
                  </div>

                  {/* Bottom Row: Claim Info */}
                  <div className={`px-4 py-3 rounded-lg border-l-4 ${
                    isUrgent ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-300'
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
                             <span className="font-bold text-red-600">
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
                    if(confirm("Permanently delete this claim? This cannot be undone.")) onDelete(claim.id);
                  }}
                  aria-label={`Delete claim for ${claim.defendant.name || 'Unknown'}`}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
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
              <h2 className="text-xl font-bold text-slate-900 mb-1">Data Management</h2>
              <p className="text-sm text-slate-500">Export or delete your claim data (GDPR rights)</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {onExportAllData && (
                <button
                  onClick={onExportAllData}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export All Data
                </button>
              )}
              {onDeleteAllData && (
                <button
                  onClick={onDeleteAllData}
                  className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <XCircle className="w-4 h-4" />
                  Delete All Data
                </button>
              )}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Your GDPR Rights:</strong> You can export all your claim data as JSON (Article 20 - Data Portability)
              or permanently delete all data (Article 17 - Right to Erasure). These actions cannot be undone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};