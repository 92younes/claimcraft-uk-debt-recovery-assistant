
import React from 'react';
import { AssessmentResult } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Scale, Clock, Building2, MessageSquareText, Brain } from 'lucide-react';

interface AssessmentReportProps {
  assessment: AssessmentResult;
  onContinue: () => void;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({ assessment, onContinue }) => {
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${assessment.isViable ? 'bg-green-100' : 'bg-amber-100'}`}>
           {assessment.isViable ? <Scale className="w-10 h-10 text-green-600" /> : <AlertTriangle className="w-10 h-10 text-amber-600" />}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Legal Assessment</h2>
        <p className="text-slate-600 max-w-md mx-auto">{assessment.recommendation}</p>
      </div>

      {/* AI Strength Score Banner */}
      {assessment.strengthScore !== undefined && (
         <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="flex items-center gap-4 relative z-10">
               <div className="flex-shrink-0">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-700" />
                        <circle 
                           cx="40" cy="40" r="36" 
                           stroke="currentColor" 
                           strokeWidth="8" 
                           fill="transparent" 
                           className={`${assessment.strengthScore > 70 ? 'text-green-400' : assessment.strengthScore > 40 ? 'text-amber-400' : 'text-red-400'}`}
                           strokeDasharray={`${assessment.strengthScore * 2.26}, 226`}
                        />
                     </svg>
                     <span className="absolute text-xl font-bold">{assessment.strengthScore}%</span>
                  </div>
               </div>
               <div className="flex-grow">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" /> AI Win Probability</h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-2">{assessment.strengthAnalysis || "Analysis pending..."}</p>
                  {assessment.weaknesses && assessment.weaknesses.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                        {assessment.weaknesses.map((w, i) => (
                           <span key={i} className="text-[10px] bg-red-500/20 text-red-200 px-2 py-1 rounded border border-red-500/30">{w}</span>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        
        {/* Limitation Act Check */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800">Limitation Act 1980</h3>
              {assessment.limitationCheck.passed ? 
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/> PASS</span> : 
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/> FAIL</span>
              }
            </div>
            <p className="text-sm text-slate-600">{assessment.limitationCheck.message}</p>
          </div>
        </div>

        {/* Small Claims Value Check */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Scale className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800">Claim Value (CPR Part 27)</h3>
               {assessment.valueCheck.passed ? 
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/> SMALL CLAIMS</span> : 
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3"/> HIGH VALUE</span>
              }
            </div>
            <p className="text-sm text-slate-600">{assessment.valueCheck.message}</p>
          </div>
        </div>

        {/* Solvency Check */}
        <div className="p-6 flex items-start gap-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-slate-800">Defendant Solvency</h3>
              {assessment.solvencyCheck.passed ? 
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/> ACTIVE</span> : 
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/> HIGH RISK</span>
              }
            </div>
            <p className="text-sm text-slate-600">{assessment.solvencyCheck.message}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={onContinue}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg shadow-lg font-medium transition-all flex items-center gap-2"
        >
          Start Clarification Chat <MessageSquareText className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
