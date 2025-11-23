
import React from 'react';
import { AssessmentResult, ClaimStrength } from '../types';
import { CheckCircle, XCircle, AlertTriangle, Scale, Clock, Building2, MessageSquareText, Brain, TrendingUp, Minus, TrendingDown } from 'lucide-react';

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

      {/* AI Claim Strength Assessment */}
      {assessment.strength && (
         <div className={`p-6 rounded-xl shadow-lg mb-8 relative overflow-hidden ${
            assessment.strength === ClaimStrength.HIGH ? 'bg-green-50 border-2 border-green-200' :
            assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-50 border-2 border-amber-200' :
            'bg-red-50 border-2 border-red-200'
         }`}>
            <div className="flex items-start gap-4 relative z-10">
               <div className="flex-shrink-0">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-md ${
                     assessment.strength === ClaimStrength.HIGH ? 'bg-green-500' :
                     assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-500' :
                     'bg-red-500'
                  }`}>
                     {assessment.strength === ClaimStrength.HIGH && <TrendingUp className="w-8 h-8 text-white" />}
                     {assessment.strength === ClaimStrength.MEDIUM && <Minus className="w-8 h-8 text-white" />}
                     {assessment.strength === ClaimStrength.LOW && <TrendingDown className="w-8 h-8 text-white" />}
                  </div>
               </div>
               <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                     <h3 className={`text-lg font-bold flex items-center gap-2 ${
                        assessment.strength === ClaimStrength.HIGH ? 'text-green-900' :
                        assessment.strength === ClaimStrength.MEDIUM ? 'text-amber-900' :
                        'text-red-900'
                     }`}>
                        <Brain className="w-5 h-5" /> AI Case Strength Assessment
                     </h3>
                     <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        assessment.strength === ClaimStrength.HIGH ? 'bg-green-200 text-green-900' :
                        assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-200 text-amber-900' :
                        'bg-red-200 text-red-900'
                     }`}>
                        {assessment.strength === ClaimStrength.HIGH ? 'STRONG CASE' :
                         assessment.strength === ClaimStrength.MEDIUM ? 'MODERATE RISK' :
                         'HIGH RISK'}
                     </span>
                  </div>
                  <p className={`text-sm leading-relaxed mb-3 ${
                     assessment.strength === ClaimStrength.HIGH ? 'text-green-800' :
                     assessment.strength === ClaimStrength.MEDIUM ? 'text-amber-800' :
                     'text-red-800'
                  }`}>
                     {assessment.strengthAnalysis || "Analysis pending..."}
                  </p>
                  {assessment.weaknesses && assessment.weaknesses.length > 0 && (
                     <div>
                        <p className="text-xs font-semibold text-slate-600 mb-2">Evidence Gaps:</p>
                        <div className="flex flex-wrap gap-2">
                           {assessment.weaknesses.map((w, i) => (
                              <span key={i} className={`text-xs px-2 py-1 rounded border ${
                                 assessment.strength === ClaimStrength.HIGH ? 'bg-green-100 border-green-300 text-green-800' :
                                 assessment.strength === ClaimStrength.MEDIUM ? 'bg-amber-100 border-amber-300 text-amber-800' :
                                 'bg-red-100 border-red-300 text-red-800'
                              }`}>{w}</span>
                           ))}
                        </div>
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
