import React, { useMemo } from 'react';
import { ClaimState, DocumentType, AccountingConnection } from '../types';
import { Plus, ArrowRight, FileText, Clock, CheckCircle2, TrendingUp, Trash2, Upload, AlertCircle, Briefcase, Scale, Calendar, ChevronRight, Bell, Zap, Link as LinkIcon } from 'lucide-react';
import { WorkflowEngine } from '../services/workflowEngine';

interface DashboardProps {
  claims: ClaimState[];
  onCreateNew: () => void;
  onResume: (claim: ClaimState) => void;
  onDelete: (id: string) => void;
  onImportCsv: () => void;
  accountingConnection?: AccountingConnection | null;
  onConnectAccounting?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  claims,
  onCreateNew,
  onResume,
  onDelete,
  onImportCsv,
  accountingConnection,
  onConnectAccounting
}) => {
  const totalRecoverable = claims.reduce((acc, curr) => acc + curr.invoice.totalAmount + curr.interest.totalInterest, 0);
  const activeClaims = claims.filter(c => c.status !== 'paid').length;

  // Calculate workflow states for all claims (memoized for performance)
  const claimsWithWorkflow = useMemo(() => {
    return claims.map(claim => ({
      claim,
      workflow: WorkflowEngine.calculateWorkflowState(claim)
    }));
  }, [claims]);

  // Count urgent actions
  const urgentActions = useMemo(() => {
    return claimsWithWorkflow.filter(({ workflow }) =>
      WorkflowEngine.getUrgencyLevel(workflow) === 'critical' ||
      WorkflowEngine.getUrgencyLevel(workflow) === 'high'
    ).length;
  }, [claimsWithWorkflow]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in pt-20 md:pt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-serif mb-2">Legal Dashboard</h1>
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
                className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <LinkIcon className="w-4 h-4" />
                {accountingConnection ? 'Manage' : 'Connect'} Accounting
              </button>
            )}

            <button
              onClick={onImportCsv}
              className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button
              onClick={onCreateNew}
              className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-1"
            >
              <Plus className="w-4 h-4" /> New Case File
            </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg flex items-center gap-4 relative overflow-hidden">
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
          {claimsWithWorkflow.map(({ claim, workflow }) => {
            const urgency = WorkflowEngine.getUrgencyLevel(workflow);
            const stageBadgeColor = WorkflowEngine.getStageBadgeColor(workflow.currentStage);

            return (
            <div
              key={claim.id}
              onClick={() => onResume(claim)}
              className={`group bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer relative ${
                urgency === 'critical' ? 'border-red-300 hover:border-red-500' :
                urgency === 'high' ? 'border-orange-300 hover:border-orange-500' :
                'border-slate-200 hover:border-blue-500'
              }`}
            >
               {/* Urgency indicator */}
               {workflow.autoEscalate && (
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse z-10">
                   <Zap className="w-4 h-4 text-white" />
                 </div>
               )}

               <div className="flex flex-col gap-4">
                  {/* Top Row: ID, Parties, Stage */}
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                     {/* Left: ID & Date */}
                     <div className="flex items-center gap-4 min-w-[180px]">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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
                             {workflow.currentStage}
                         </span>
                         <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                     </div>
                  </div>

                  {/* Bottom Row: Next Action & Due Date */}
                  <div className={`px-4 py-3 rounded-lg border-l-4 ${
                    urgency === 'critical' ? 'bg-red-50 border-red-500' :
                    urgency === 'high' ? 'bg-orange-50 border-orange-500' :
                    urgency === 'medium' ? 'bg-blue-50 border-blue-500' :
                    'bg-slate-50 border-slate-300'
                  }`}>
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                           <Clock className="w-4 h-4 text-slate-500" />
                           <span className="text-sm font-medium text-slate-700">Next: {workflow.nextAction}</span>
                        </div>
                        {workflow.nextActionDue && (
                          <div className="flex items-center gap-2 text-sm">
                             <span className={`font-bold ${
                               urgency === 'critical' ? 'text-red-600' :
                               urgency === 'high' ? 'text-orange-600' :
                               'text-slate-600'
                             }`}>
                               Due: {new Date(workflow.nextActionDue).toLocaleDateString('en-GB')}
                             </span>
                             {workflow.daysUntilEscalation !== null && workflow.daysUntilEscalation <= 3 && (
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 workflow.daysUntilEscalation < 0 ? 'bg-red-600 text-white' :
                                 workflow.daysUntilEscalation === 0 ? 'bg-red-500 text-white' :
                                 'bg-orange-500 text-white'
                               }`}>
                                 {workflow.daysUntilEscalation < 0 ? `${Math.abs(workflow.daysUntilEscalation)}d overdue` :
                                  workflow.daysUntilEscalation === 0 ? 'TODAY' :
                                  `${workflow.daysUntilEscalation}d`}
                               </span>
                             )}
                          </div>
                        )}
                     </div>
                     {workflow.escalationWarning && (
                       <div className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {workflow.escalationWarning}
                       </div>
                     )}
                  </div>
               </div>

               {/* Delete Hover */}
               <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("Archive this case file?")) onDelete(claim.id);
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
               >
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};