
import React from 'react';
import { AssessmentResult, ClaimStrength } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Scale, Clock, Building2, MessageSquareText, Brain, TrendingUp, Minus, TrendingDown } from 'lucide-react';

interface AssessmentReportProps {
  assessment: AssessmentResult;
  onContinue: () => void;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({ assessment, onContinue }) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header Section - Horizontal Layout */}
      <div className="flex items-center gap-6 mb-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className={`w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${assessment.isViable ? 'bg-teal-100' : 'bg-amber-100'}`}>
           {assessment.isViable ? <Scale className="w-8 h-8 text-teal-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />}
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-900 mb-1 font-display tracking-tight">Legal Assessment</h2>
           <p className="text-slate-600 text-sm leading-relaxed">{assessment.recommendation}</p>
        </div>
      </div>

      {/* AI Claim Strength Assessment */}
      {assessment.strength && (
         <div className={`p-5 rounded-xl shadow-sm mb-6 relative overflow-hidden border ${
            assessment.strength === ClaimStrength.HIGH ? 'bg-teal-50 border-teal-200' :
            assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
         }`}>
            <div className="flex items-start gap-4 relative z-10">
               <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                     assessment.strength === ClaimStrength.HIGH ? 'bg-teal-600' :
                     assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-500' :
                     'bg-red-500'
                  }`}>
                     {assessment.strength === ClaimStrength.HIGH && <TrendingUp className="w-6 h-6 text-white" />}
                     {assessment.strength === ClaimStrength.MEDIUM && <Minus className="w-6 h-6 text-white" />}
                     {assessment.strength === ClaimStrength.LOW && <TrendingDown className="w-6 h-6 text-white" />}
                  </div>
               </div>
               <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-1">
                     <h3 className={`text-base font-bold flex items-center gap-2 ${
                        assessment.strength === ClaimStrength.HIGH ? 'text-teal-900' :
                        assessment.strength === ClaimStrength.MEDIUM ? 'text-amber-900' :
                        'text-red-900'
                     }`}>
                        <Brain className="w-4 h-4" /> AI Case Strength Assessment
                     </h3>
                     <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                        assessment.strength === ClaimStrength.HIGH ? 'bg-teal-200 text-teal-900' :
                        assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-200 text-amber-900' :
                        'bg-red-200 text-red-900'
                     }`}>
                        {assessment.strength === ClaimStrength.HIGH ? 'Strong Case' :
                         assessment.strength === ClaimStrength.MEDIUM ? 'Moderate Risk' :
                         'High Risk'}
                     </span>
                  </div>
                  <p className={`text-sm leading-relaxed mb-2 ${
                     assessment.strength === ClaimStrength.HIGH ? 'text-teal-800' :
                     assessment.strength === ClaimStrength.MEDIUM ? 'text-amber-800' :
                     'text-red-800'
                  }`}>
                     {assessment.strengthAnalysis || "Analysis pending..."}
                  </p>
                  {assessment.weaknesses && assessment.weaknesses.length > 0 && (
                     <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-semibold text-slate-600">Gaps:</span>
                        {assessment.weaknesses.map((w, i) => (
                           <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${
                              assessment.strength === ClaimStrength.HIGH ? 'bg-teal-100 border-teal-300 text-teal-800' :
                              assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-100 border-amber-300 text-amber-800' :
                              'bg-red-100 border-red-300 text-red-800'
                           }`}>{w}</span>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* 3-Column Grid for Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Limitation Act Check */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <div className="flex justify-between items-start">
             <div className="bg-slate-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-slate-600" />
             </div>
             {assessment.limitationCheck.passed ?
                <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200"><CheckCircle className="w-3 h-3"/> PASS</span> :
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200"><XCircle className="w-3 h-3"/> FAIL</span>
             }
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">Limitation Act 1980</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{assessment.limitationCheck.message}</p>
          </div>
        </div>

        {/* Small Claims Value Check */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <div className="flex justify-between items-start">
             <div className="bg-slate-100 p-2 rounded-lg">
                <Scale className="w-5 h-5 text-slate-600" />
             </div>
             {assessment.valueCheck.passed ?
                <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200"><CheckCircle className="w-3 h-3"/> OK</span> :
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200"><AlertTriangle className="w-3 h-3"/> HIGH</span>
             }
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm mb-1">Claim Value (CPR 27)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{assessment.valueCheck.message}</p>
          </div>
        </div>

        {/* Solvency Check */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <div className="flex justify-between items-start">
             <div className="bg-slate-100 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-slate-600" />
             </div>
             {assessment.solvencyCheck.passed ?
                <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200"><CheckCircle className="w-3 h-3"/> ACTIVE</span> :
                <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-200"><XCircle className="w-3 h-3"/> RISK</span>
             }
          </div>
          <div>
             <h3 className="font-semibold text-slate-800 text-sm mb-1">Defendant Solvency</h3>
             <p className="text-xs text-slate-500 leading-relaxed">{assessment.solvencyCheck.message}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onContinue}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl shadow-sm font-semibold transition-all duration-200 flex items-center gap-2 btn-primary hover:shadow-teal-md hover:-translate-y-0.5"
        >
          Proceed to Timeline <Clock className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
