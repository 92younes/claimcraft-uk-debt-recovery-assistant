import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClaimStore } from '../store/claimStore';
import { EvidenceUpload } from '../components/EvidenceUpload';
import { PartyForm } from '../components/PartyForm';
import { Input } from '../components/ui/Input';
import { TimelineBuilder } from '../components/TimelineBuilder';
import { AssessmentReport } from '../components/AssessmentReport';
import { DocumentPreview } from '../components/DocumentPreview';
import { FinalReviewModal } from '../components/FinalReviewModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Button } from '../components/ui/Button';
import { ProgressStepsCompact } from '../components/ui/ProgressSteps';
import { Step, DocumentType, PartyType, TimelineEvent } from '../types';
import { 
  ArrowRight, ArrowLeft, FileText, Keyboard, CheckCircle, 
  AlertTriangle, AlertCircle, Save, User, Calendar, Mail, 
  Sparkles, ChevronUp, ChevronDown, MessageSquareText, Scale, Percent
} from 'lucide-react';
import { getLbaResponsePeriodDays } from '../services/legalRules';
import { DocumentBuilder } from '../services/documentBuilder';

// Wizard step definitions for progress indicator
const WIZARD_STEPS = [
  { number: Step.EVIDENCE, label: 'Evidence', description: 'Upload or import' },
  { number: Step.VERIFY, label: 'Verify & Assess', description: 'Review & legal check' },
  { number: Step.STRATEGY, label: 'Strategy', description: 'Document type' },
  { number: Step.DRAFT, label: 'Draft', description: 'Edit content' },
  { number: Step.REVIEW, label: 'Review', description: 'Final check' }
];

export const WizardPage = () => {
  const navigate = useNavigate();
  const { 
    claimData, setClaimData, step, setStep, createNewClaim,
    isProcessing, processingText, showSaveIndicator,
    updateInvoiceDetails, analyzeEvidenceFiles
  } = useClaimStore();

  const [error, setError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  
  // UI State
  const [showAdvancedDocs, setShowAdvancedDocs] = useState(false);
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(false);
  const [hasAcknowledgedLbaWarning, setHasAcknowledgedLbaWarning] = useState(false);

  // Computed checks
  const hasExistingData = claimData.source !== 'manual' || claimData.invoice.totalAmount > 0 || !!claimData.defendant.name;
  const timelineHasLBA = claimData.timeline.some(e => e.type === 'lba_sent');
  const hasLBA = timelineHasLBA || claimData.lbaAlreadySent;
  const isFinalized = claimData.status === 'review' || claimData.status === 'sent' || claimData.status === 'court' || claimData.status === 'judgment';

  // Guard: ensure wizard always has an active claim id (needed for save/payment flows)
  useEffect(() => {
    if (!claimData.id) {
      createNewClaim();
    }
  }, [claimData.id, createNewClaim]);

  // Auto-generate document when entering Draft/Review (best-effort)
  useEffect(() => {
    const isDocStep = step === Step.DRAFT || step === Step.REVIEW;
    if (!isDocStep) return;

    // Avoid regenerating if we already have a generated doc for this type
    const hasDoc = !!claimData.generated && claimData.generated.documentType === claimData.selectedDocType;
    if (hasDoc) return;

    // Basic prerequisites
    if (!claimData.selectedDocType) return;
    if (!claimData.claimant.name?.trim() || !claimData.defendant.name?.trim()) return;
    if (!claimData.invoice.totalAmount || claimData.invoice.totalAmount <= 0) return;

    let cancelled = false;
    setIsGeneratingDocument(true);
    setDocError(null);

    (async () => {
      try {
        const generated = await DocumentBuilder.generateDocument(claimData);
        if (cancelled) return;
        setClaimData(prev => ({ ...prev, generated }));
      } catch (e: any) {
        if (cancelled) return;
        setDocError(e?.message || 'Failed to generate document.');
      } finally {
        if (!cancelled) setIsGeneratingDocument(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    step,
    claimData.selectedDocType,
    claimData.generated?.documentType,
    claimData.claimant.name,
    claimData.defendant.name,
    claimData.invoice.totalAmount
  ]);

  // --- Handlers ---

  const handleExitWizard = () => {
      navigate('/dashboard');
  };

  const handleNextStep = (nextStep: Step) => {
      setStep(nextStep);
  };

  const handleManualEntry = () => {
      setClaimData(prev => ({ ...prev, source: 'manual' }));
      handleNextStep(Step.VERIFY);
  };

  const handleClaimantChange = (newParty: any) => {
    setClaimData(prev => ({
      ...prev,
      claimant: newParty,
      assessment: null, // Reset assessment
      hasVerifiedInterest: prev.claimant.type !== newParty.type ? false : prev.hasVerifiedInterest
    }));
  };

  const handleDefendantChange = (newParty: any) => {
    setClaimData(prev => ({
      ...prev,
      defendant: newParty,
      assessment: null,
      hasVerifiedInterest: prev.defendant.type !== newParty.type ? false : prev.hasVerifiedInterest
    }));
  };

  // --- Render Steps ---

  const renderEvidenceStep = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in py-8">
        <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">
            {hasExistingData ? 'Evidence & Documents' : 'New Claim'}
        </h2>
        <p className="text-slate-500">
            {hasExistingData
            ? 'Upload supporting evidence for your claim.'
            : 'Import your claim data or enter manually.'}
        </p>
        </div>

        {!hasExistingData && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button disabled className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center gap-3 opacity-50 cursor-not-allowed">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400"/>
                </div>
                <div className="text-center">
                    <span className="block font-semibold text-slate-900">Connect Accounting</span>
                    <span className="text-sm text-slate-500 mt-1 block">Use Dashboard to connect</span>
                </div>
            </button>

            <button
            onClick={handleManualEntry}
            className="p-6 bg-white border border-slate-200 hover:border-teal-300 rounded-xl transition-all flex flex-col items-center gap-3 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-slate-600"/>
                </div>
                <div className="text-center">
                    <span className="block font-semibold text-slate-900">Manual Entry</span>
                    <span className="text-sm text-slate-500 mt-1 block">Type in claim details</span>
                </div>
            </button>
        </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Evidence Locker</h3>
        <p className="text-slate-500 text-center text-sm mb-6">
            Upload invoices, contracts, and emails.
        </p>

        <EvidenceUpload
            files={claimData.evidence}
            onAddFiles={(newFiles) => setClaimData(prev => ({...prev, evidence: [...prev.evidence, ...newFiles]}))}
            onRemoveFile={(idx) => setClaimData(prev => ({...prev, evidence: prev.evidence.filter((_, i) => i !== idx)}))}
            onAnalyze={hasExistingData ? undefined : analyzeEvidenceFiles}
            isProcessing={isProcessing}
        />
        </div>

        {hasExistingData && (
        <div className="mt-6 flex justify-end">
            <Button
            onClick={() => handleNextStep(Step.VERIFY)}
            rightIcon={<ArrowRight className="w-5 h-5" />}
            >
            Continue to Verify
            </Button>
        </div>
        )}
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6 animate-fade-in py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Button
            variant="ghost"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => handleNextStep(Step.EVIDENCE)}
            className="w-fit"
        >
            Back to Evidence
        </Button>

        <div className="text-center mb-5">
            <h2 className="text-3xl font-bold text-slate-900 font-display mb-4">Review Your Claim Details</h2>
            <p className="text-slate-500">Please review and correct your information before proceeding.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PartyForm party={claimData.claimant} onChange={handleClaimantChange} title="Claimant" />
            <PartyForm party={claimData.defendant} onChange={handleDefendantChange} title="Defendant" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" /> Invoice Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    label="Invoice Number"
                    value={claimData.invoice.invoiceNumber}
                    onChange={(e) => updateInvoiceDetails('invoiceNumber', e.target.value)}
                />
                <Input
                    label="Amount (£)"
                    type="number"
                    value={claimData.invoice.totalAmount || ''}
                    onChange={(e) => updateInvoiceDetails('totalAmount', e.target.value)}
                />
                <Input
                    label="Invoice Date"
                    type="date"
                    value={claimData.invoice.dateIssued}
                    onChange={(e) => updateInvoiceDetails('dateIssued', e.target.value)}
                />
            </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" /> Timeline
            </h3>
            <TimelineBuilder
                events={claimData.timeline}
                onChange={(events) => setClaimData(prev => ({ ...prev, timeline: events }))}
            />
        </div>

        {/* LBA Status */}
        <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5">
            <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-amber-600" />
                <div>
                    <h3 className="font-bold text-slate-900">Pre-Action Protocol Status</h3>
                    <p className="text-xs text-slate-500">Letter Before Action (LBA) check</p>
                </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={claimData.lbaAlreadySent || false}
                    onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (!isChecked) {
                            setClaimData(prev => ({ ...prev, lbaAlreadySent: false, lbaSentDate: '' }));
                        } else {
                            const today = new Date().toISOString().split('T')[0];
                            setClaimData(prev => ({ ...prev, lbaAlreadySent: true, lbaSentDate: prev.lbaSentDate || today }));
                        }
                    }}
                    className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                    <span className="font-semibold text-slate-900">I have already sent a Letter Before Action</span>
                    {claimData.lbaAlreadySent && (
                        <div className="mt-2">
                            <Input 
                                label="Date Sent" 
                                type="date" 
                                value={claimData.lbaSentDate || ''} 
                                onChange={(e) => setClaimData(prev => ({...prev, lbaSentDate: e.target.value}))}
                                noMargin
                            />
                        </div>
                    )}
                </div>
            </label>
        </div>

        {/* Validation & Footer */}
        {(() => {
            const validationErrors: string[] = [];
            if (!claimData.claimant.name?.trim()) validationErrors.push('Claimant name required');
            if (!claimData.defendant.name?.trim()) validationErrors.push('Defendant name required');
            if (!claimData.invoice.totalAmount || claimData.invoice.totalAmount <= 0) validationErrors.push('Invoice amount > 0 required');
            
            const canProceed = validationErrors.length === 0;

            return (
                <div className="sticky bottom-0 z-30 mt-6 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div>
                            {!canProceed && <span className="text-red-600 text-sm font-medium">Please fill in missing fields</span>}
                        </div>
                        <Button
                            disabled={!canProceed}
                            onClick={() => handleNextStep(Step.STRATEGY)}
                            rightIcon={<ArrowRight className="w-5 h-5" />}
                        >
                            Continue to Strategy
                        </Button>
                    </div>
                </div>
            );
        })()}
    </div>
  );

  const renderStrategyStep = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4"/>} onClick={() => handleNextStep(Step.VERIFY)} className="mb-4">Back</Button>
          <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">Select Your Document</h2>
          <p className="text-slate-500 mb-8">Choose the best legal action based on your situation.</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                  { type: DocumentType.LBA, title: 'Letter Before Action', desc: 'Formal warning giving 30 days to pay.', icon: Mail },
                  { type: DocumentType.FORM_N1, title: 'Form N1 (Court Claim)', desc: 'Official court claim form.', icon: Scale },
                  { type: DocumentType.POLITE_CHASER, title: 'Polite Reminder', desc: 'Soft reminder for good relationships.', icon: MessageSquareText }
              ].map(doc => (
                  <div 
                    key={doc.type}
                    onClick={() => setClaimData(prev => ({ ...prev, selectedDocType: doc.type, userSelectedDocType: true }))}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        claimData.selectedDocType === doc.type 
                        ? 'border-slate-900 bg-slate-900 text-white' 
                        : 'border-slate-200 bg-white hover:border-teal-300'
                    }`}
                  >
                      <doc.icon className={`w-8 h-8 mb-4 ${claimData.selectedDocType === doc.type ? 'text-teal-400' : 'text-teal-600'}`} />
                      <h3 className="font-bold text-lg mb-2">{doc.title}</h3>
                      <p className={`text-sm ${claimData.selectedDocType === doc.type ? 'text-slate-300' : 'text-slate-500'}`}>{doc.desc}</p>
                  </div>
              ))}
          </div>

          <div className="mt-8 flex justify-end">
              <Button onClick={() => handleNextStep(Step.DRAFT)} rightIcon={<ArrowRight className="w-5 h-5"/>}>
                  Continue to Draft
              </Button>
          </div>
      </div>
  );

  const renderDraftStep = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4"/>} onClick={() => handleNextStep(Step.STRATEGY)}>Back</Button>
            <h2 className="text-2xl font-bold text-slate-900">Drafting: {claimData.selectedDocType}</h2>
          </div>
          
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
             {isGeneratingDocument && (
               <div className="p-6 text-sm text-slate-600">
                 Generating your document…
               </div>
             )}
             {docError && (
               <div className="p-6">
                 <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                   <p className="font-semibold mb-1">Document generation failed</p>
                   <p>{docError}</p>
                 </div>
               </div>
             )}
             {claimData.generated && (
               <DocumentPreview
                 data={claimData}
                 onBack={() => handleNextStep(Step.STRATEGY)}
                 isFinalized={isFinalized}
                 onConfirm={() => {
                   setClaimData(prev => ({ ...prev, status: 'review' }));
                   handleNextStep(Step.REVIEW);
                 }}
                 onUpdateSignature={(sig) => setClaimData(prev => ({ ...prev, signature: sig }))}
                 onUpdateContent={(content) =>
                   setClaimData(prev => ({
                     ...prev,
                     generated: prev.generated ? { ...prev.generated, content } : prev.generated
                   }))
                 }
                 onPaymentComplete={(paymentIntentId) =>
                   setClaimData(prev => ({
                     ...prev,
                     hasPaid: true,
                     paymentId: paymentIntentId,
                     paidAt: new Date().toISOString()
                   }))
                 }
               />
             )}
          </div>
      </div>
  );

  const renderReviewStep = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => {
            // Allow editing again
            setClaimData(prev => ({ ...prev, status: 'draft' }));
            handleNextStep(Step.DRAFT);
          }}
        >
          Back to Draft
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">Review & Send</h2>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {claimData.generated ? (
          <DocumentPreview
            data={claimData}
            onBack={() => {
              setClaimData(prev => ({ ...prev, status: 'draft' }));
              handleNextStep(Step.DRAFT);
            }}
            isFinalized={true}
            onConfirm={() => {}}
            onUpdateSignature={(sig) => setClaimData(prev => ({ ...prev, signature: sig }))}
            onUpdateContent={() => {}}
            onPaymentComplete={(paymentIntentId) =>
              setClaimData(prev => ({
                ...prev,
                hasPaid: true,
                paymentId: paymentIntentId,
                paidAt: new Date().toISOString()
              }))
            }
          />
        ) : (
          <div className="p-6 text-sm text-slate-600">
            No generated document found yet. Go back to Draft to generate one.
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
        {/* Progress for Mobile */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200">
            <ProgressStepsCompact steps={WIZARD_STEPS} currentStep={step} />
        </div>

        {/* Save Indicator */}
        <div className={`fixed top-20 right-4 z-50 bg-white/80 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-teal-700 flex items-center gap-1.5 transition-opacity duration-300 ${showSaveIndicator ? 'opacity-100' : 'opacity-0'}`}>
            <Save className="w-3 h-3" /> Saved
        </div>

        {step === Step.EVIDENCE && renderEvidenceStep()}
        {step === Step.VERIFY && renderVerifyStep()}
        {step === Step.STRATEGY && renderStrategyStep()}
        {step === Step.DRAFT && renderDraftStep()}
        {step === Step.REVIEW && renderReviewStep()}
    </div>
  );
};


