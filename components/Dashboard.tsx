import React from 'react';
import { ClaimState, DocumentType } from '../types';
import { Plus, ArrowRight, FileText, Clock, CheckCircle2, TrendingUp, Trash2, Upload, AlertCircle, Briefcase, Scale, Calendar, ChevronRight } from 'lucide-react';

interface DashboardProps {
  claims: ClaimState[];
  onCreateNew: () => void;
  onResume: (claim: ClaimState) => void;
  onDelete: (id: string) => void;
  onImportCsv: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ claims, onCreateNew, onResume, onDelete, onImportCsv }) => {
  const totalRecoverable = claims.reduce((acc, curr) => acc + curr.invoice.totalAmount + curr.interest.totalInterest, 0);
  const activeClaims = claims.filter(c => c.status !== 'paid').length;

  const getNextAction = (claim: ClaimState) => {
    if (claim.status === 'draft') {
      if (!claim.generated) return { label: "Draft Strategy", color: "text-blue-600 bg-blue-50 border-blue-100" };
      if (claim.selectedDocType === DocumentType.LBA) return { label: "Finalize LBA", color: "text-purple-600 bg-purple-50 border-purple-100" };
      return { label: "Finalize N1", color: "text-slate-800 bg-slate-100 border-slate-200" };
    }
    if (claim.status === 'review') return { label: "Ready to Sign", color: "text-green-600 bg-green-50 border-green-100" };
    if (claim.status === 'sent') {
      if (claim.selectedDocType === DocumentType.LBA) {
         return { label: "Await Response", color: "text-amber-600 bg-amber-50 border-amber-100" };
      }
      return { label: "Court Pending", color: "text-slate-600 bg-slate-50 border-slate-200" };
    }
    return { label: "View Case", color: "text-slate-600" };
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in pt-20 md:pt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-serif mb-2">Legal Dashboard</h1>
          <p className="text-slate-500">Overview of your active litigation files.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
            <button 
            onClick={onImportCsv}
            className="flex-1 md:flex-none bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all"
            >
            <Upload className="w-4 h-4" /> Import
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
           <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-6 h-6" />
           </div>
           <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Success Probability</p>
              <p className="text-2xl font-bold text-slate-900 font-serif">High</p>
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
             <span className="hidden md:block mr-24">Next Action</span>
          </div>
          {claims.map((claim) => {
            const action = getNextAction(claim);
            return (
            <div 
              key={claim.id} 
              onClick={() => onResume(claim)}
              className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative"
            >
               <div className="flex flex-col md:flex-row md:items-center gap-6">
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

                  {/* Right: Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                      <span className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide border ${action.color}`}>
                          {action.label}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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