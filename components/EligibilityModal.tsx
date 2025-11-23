
import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEligible: () => void;
}

export const EligibilityModal: React.FC<EligibilityModalProps> = ({ isOpen, onClose, onEligible }) => {
  const [step, setStep] = useState(0);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string | null>(null);

  const questions = [
    {
      id: 'location',
      question: "Is the debtor (defendant) based in England or Wales?",
      details: "Small Claims Court procedures differ for Scotland and Northern Ireland.",
      yes: () => setStep(1),
      no: () => setDisqualifiedReason("ClaimCraft currently only supports claims within England & Wales jurisdiction.")
    },
    {
      id: 'age',
      question: "Is the debt less than 6 years old?",
      details: "Under the Limitation Act 1980, most debts older than 6 years are statute-barred.",
      yes: () => setStep(2),
      no: () => setDisqualifiedReason("The debt appears to be statute-barred (too old to claim in court).")
    },
    {
      id: 'insolvency',
      question: "To your knowledge, is the debtor currently solvent?",
      details: "If the company is already dissolved or in liquidation, legal action typically costs more than you can recover.",
      yes: () => onEligible(), // Passed all checks
      no: () => setDisqualifiedReason("Suing an insolvent or dissolved entity usually results in zero recovery.")
    }
  ];

  if (!isOpen) return null;

  const currentQ = questions[step];

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
          <X className="w-5 h-5" />
        </button>

        <div className="bg-slate-50 p-6 border-b border-slate-100 text-center">
           <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-200">
              <ShieldAlert className="w-6 h-6 text-white" />
           </div>
           <h2 className="text-xl font-bold text-slate-900">Eligibility Check</h2>
           <p className="text-sm text-slate-500">Let's ensure your claim is viable before we start.</p>
        </div>

        <div className="p-8">
           {disqualifiedReason ? (
             <div className="text-center animate-fade-in">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-bold text-red-900 mb-1">Not Recommended</p>
                  <p className="text-red-700 text-sm leading-relaxed">{disqualifiedReason}</p>
                </div>
                <button onClick={onClose} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors duration-200">
                  Close Check
                </button>
             </div>
           ) : (
             <div className="animate-fade-in">
                <div className="mb-2 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span>Question {step + 1} of 3</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-blue-600' : i < step ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                    ))}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-3">{currentQ.question}</h3>
                <p className="text-slate-600 mb-8 text-sm">{currentQ.details}</p>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={currentQ.no}
                     className="py-4 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                   >
                     No
                   </button>
                   <button 
                     onClick={currentQ.yes}
                     className="py-4 rounded-xl bg-slate-900 text-white font-bold shadow-lg hover:bg-blue-600 hover:shadow-blue-200/50 transition-all duration-200"
                   >
                     Yes
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
