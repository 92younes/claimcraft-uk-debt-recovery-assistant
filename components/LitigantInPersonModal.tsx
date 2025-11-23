/**
 * Litigant in Person (LiP) Warning Modal
 *
 * IMPORTANT DISCLOSURE:
 * Self-represented litigants face significant challenges in civil proceedings:
 * - Complex procedural rules (CPR)
 * - No cost recovery for time spent
 * - Higher risk of procedural errors leading to strike-out
 * - Defendants often instruct solicitors, creating power imbalance
 *
 * This modal ensures users understand the risks before proceeding with Form N1
 * without legal representation, especially for Fast Track (>£10k) claims.
 */

import React, { useState } from 'react';
import { Scale, AlertTriangle, HelpCircle, CheckCircle, DollarSign, X } from 'lucide-react';

interface LitigantInPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  claimValue: number; // Total claim including interest and fees
}

export const LitigantInPersonModal: React.FC<LitigantInPersonModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  claimValue
}) => {
  const [acknowledgesRisks, setAcknowledgesRisks] = useState(false);
  const [understandsCosts, setUnderstandsCosts] = useState(false);

  const isFastTrack = claimValue > 10000;
  const isMultiTrack = claimValue > 25000;

  const handleProceed = () => {
    if (acknowledgesRisks && understandsCosts) {
      onProceed();
      // Reset for next time
      setAcknowledgesRisks(false);
      setUnderstandsCosts(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset
    setAcknowledgesRisks(false);
    setUnderstandsCosts(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Litigant in Person Warning</h2>
              <p className="text-amber-100 text-sm mt-0.5">Self-Representation Risks</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* What is a Litigant in Person */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-blue-900 text-lg mb-2">What is a Litigant in Person (LiP)?</h3>
                <p className="text-sm text-blue-900">
                  A Litigant in Person (LiP) is someone who represents themselves in legal proceedings without a solicitor
                  or barrister. While you have the right to self-represent, it comes with significant challenges and risks.
                </p>
              </div>
            </div>
          </div>

          {/* Claim Track Assessment */}
          <div className={`border-2 rounded-xl p-5 ${
            isMultiTrack
              ? 'bg-red-50 border-red-300'
              : isFastTrack
              ? 'bg-amber-50 border-amber-300'
              : 'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-start gap-3 mb-3">
              <DollarSign className={`w-6 h-6 shrink-0 mt-0.5 ${
                isMultiTrack ? 'text-red-600' : isFastTrack ? 'text-amber-600' : 'text-green-600'
              }`} />
              <div>
                <h3 className={`font-bold text-lg ${
                  isMultiTrack ? 'text-red-900' : isFastTrack ? 'text-amber-900' : 'text-green-900'
                }`}>
                  Your Claim: £{claimValue.toFixed(2)} - {
                    isMultiTrack ? 'Multi-Track (Complex)' : isFastTrack ? 'Fast Track (Moderate Complexity)' : 'Small Claims Track (Simplified)'
                  }
                </h3>
                <p className={`text-sm mt-1 ${
                  isMultiTrack ? 'text-red-800' : isFastTrack ? 'text-amber-800' : 'text-green-800'
                }`}>
                  {isMultiTrack
                    ? 'Claims over £25,000 are allocated to Multi-Track with full CPR compliance requirements. Legal representation is STRONGLY RECOMMENDED.'
                    : isFastTrack
                    ? 'Claims £10,000-£25,000 are allocated to Fast Track with intermediate procedure. Legal advice is HIGHLY RECOMMENDED.'
                    : 'Claims under £10,000 are allocated to Small Claims Track with simplified procedure. Self-representation is more manageable, but still challenging.'}
                </p>
              </div>
            </div>
          </div>

          {/* Key Risks */}
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
            <h3 className="font-bold text-red-900 text-lg mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Key Risks of Self-Representation
            </h3>
            <ul className="space-y-3 text-sm text-red-900">
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">Procedural Errors:</span> The Civil Procedure Rules (CPR) are complex.
                  Missing a deadline or filing incorrectly can result in your claim being struck out - even if you're
                  owed the money.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">Defendant's Solicitors:</span> If the defendant instructs solicitors
                  (common for companies), you'll face experienced legal professionals who know how to exploit procedural
                  mistakes.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">No Cost Recovery for Your Time:</span> Even if you win, you can only
                  recover court fees and disbursements - NOT your time spent preparing, attending hearings, etc.
                  A solicitor's fees would be recoverable.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">Defence and Counterclaims:</span> If the defendant files a defence
                  or counterclaim, the case becomes more complex. You may need to prepare witness statements,
                  disclosure bundles, and attend case management conferences.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold shrink-0">⚠️</span>
                <div>
                  <span className="font-bold">Costs Sanctions:</span> If you make serious procedural errors or
                  behave unreasonably, the court can order you to pay the defendant's legal costs - potentially
                  tens of thousands of pounds.
                </div>
              </li>
            </ul>
          </div>

          {/* What Happens After You File N1 */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 text-lg mb-3">What Happens After You File Form N1:</h3>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <span className="font-bold shrink-0">1.</span>
                <div>
                  <span className="font-bold">Defendant Receives Claim:</span> They have 14 days to acknowledge
                  (33 days total to file defence). Many will instruct solicitors immediately.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold shrink-0">2.</span>
                <div>
                  <span className="font-bold">If Defendant Files Defence:</span> Case proceeds to allocation.
                  You'll need to complete Directions Questionnaire (N180), propose witness evidence, and prepare
                  disclosure.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold shrink-0">3.</span>
                <div>
                  <span className="font-bold">Case Management:</span> Judge allocates to track (Small Claims, Fast Track, Multi-Track)
                  and gives directions (deadlines for disclosure, witness statements, expert evidence if needed).
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold shrink-0">4.</span>
                <div>
                  <span className="font-bold">Trial Preparation:</span> You must comply with ALL directions.
                  Failure = strike out. You need to prepare trial bundle, skeleton argument (Fast/Multi-Track),
                  and attend trial to present your case.
                </div>
              </div>
            </div>
          </div>

          {/* When to Seriously Consider a Solicitor */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
            <h3 className="font-bold text-amber-900 text-lg mb-3">You Should SERIOUSLY Consider a Solicitor If:</h3>
            <ul className="space-y-2 text-sm text-amber-900">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Your claim exceeds £10,000 (Fast Track or Multi-Track)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>The defendant is a company (likely to instruct solicitors)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>The claim involves disputed facts or complex legal issues</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>The defendant has already filed a defence or counterclaim</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>You're not comfortable with court procedures and legal terminology</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>You don't have time to manage the case (it can take 20-100+ hours)</span>
              </li>
            </ul>
          </div>

          {/* Cost-Benefit Analysis */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <h3 className="font-bold text-blue-900 text-lg mb-3">Cost-Benefit Analysis:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <p className="font-bold text-blue-900 mb-2">💼 With Solicitor:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Upfront cost: £1,500-£5,000+</li>
                  <li>• Recoverable if you win</li>
                  <li>• Professional handling</li>
                  <li>• Higher success rate</li>
                  <li>• Minimal time commitment</li>
                </ul>
              </div>
              <div className="bg-white border border-blue-200 rounded-lg p-4">
                <p className="font-bold text-blue-900 mb-2">🙋 Self-Represented:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• No upfront solicitor fees</li>
                  <li>• Your time NOT recoverable</li>
                  <li>• Risk of procedural errors</li>
                  <li>• Power imbalance vs solicitors</li>
                  <li>• 20-100+ hours of your time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* This Software's Limitations */}
          <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-5">
            <h3 className="font-bold text-purple-900 text-lg mb-3">Important: This Software's Limitations</h3>
            <p className="text-sm text-purple-900 mb-2">
              ClaimCraft UK assists with <span className="font-bold">initial document generation ONLY</span>:
            </p>
            <ul className="space-y-1.5 text-sm text-purple-900 ml-4 list-disc">
              <li>✅ We can help you draft and file Form N1</li>
              <li>✅ We can generate pre-action letters</li>
              <li>❌ We CANNOT represent you if defendant files a defence</li>
              <li>❌ We CANNOT prepare you for hearings or trial</li>
              <li>❌ We CANNOT provide legal advice on complex procedural issues</li>
              <li>❌ We are NOT a substitute for a solicitor in contested cases</li>
            </ul>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="space-y-4 bg-white border-2 border-slate-300 rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acknowledgesRisks}
                onChange={(e) => setAcknowledgesRisks(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-900 group-hover:text-slate-700">
                <span className="font-bold">I understand the risks of self-representation</span> including
                potential strike-out, costs sanctions, and inability to recover my time if I win.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={understandsCosts}
                onChange={(e) => setUnderstandsCosts(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-900 group-hover:text-slate-700">
                <span className="font-bold">I understand</span> that if this case becomes contested, I may need
                to instruct a solicitor at additional cost, and that this software only assists with initial
                document generation.
              </span>
            </label>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="sticky bottom-0 bg-slate-50 border-t-2 border-slate-200 p-6 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Cancel - Seek Legal Advice
          </button>
          <button
            onClick={handleProceed}
            disabled={!acknowledgesRisks || !understandsCosts}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-md disabled:shadow-none"
          >
            {acknowledgesRisks && understandsCosts ? 'Proceed as Litigant in Person' : 'Complete Acknowledgments Above'}
          </button>
        </div>
      </div>
    </div>
  );
};
