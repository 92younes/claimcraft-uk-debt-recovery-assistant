import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useClaimStore } from '../store/claimStore';
import { EvidenceUpload } from '../components/EvidenceUpload';
import { PartyForm } from '../components/PartyForm';
import { Input } from '../components/ui/Input';
import { DateInput } from '../components/ui/DateInput';
import { TimelineBuilder } from '../components/TimelineBuilder';
import { DocumentPreview } from '../components/DocumentPreview';
import { Button } from '../components/ui/Button';
import { ProgressStepsCompact } from '../components/ui/ProgressSteps';
import { ConfirmModal } from '../components/ConfirmModal';
import { HorizontalTabs, Tab } from '../components/ui/HorizontalTabs';
import { InterestPreview } from '../components/InterestPreview';
import { Shimmer } from '../components/ui/Shimmer';
import { Header, BreadcrumbItem } from '../components/Header';
import { Step, DocumentType, EvidenceFile } from '../types';
import { ArrowRight, ArrowLeft, FileText, Save, Calendar, Mail, MessageSquareText, Scale, X, CheckCircle, Check, Clock, User, Building2, Receipt, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import { DocumentBuilder } from '../services/documentBuilder';
import { generateDeadlinesForDocument } from '../services/deadlineService';
import { getTodayISO } from '../utils/formatters';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { PAYMENT_TERMS_OPTIONS, AGREEMENT_TYPE_OPTIONS } from '../constants';
import { recommendFromClaimState } from '../services/documentRecommendation';

// Wizard step definitions for progress indicator
const WIZARD_STEPS = [
  { number: Step.EVIDENCE, label: 'Evidence', description: 'Upload documents' },
  { number: Step.VERIFY, label: 'Verify', description: 'Review details' },
  { number: Step.STRATEGY, label: 'Document', description: 'Select type' },
  { number: Step.DRAFT, label: 'Draft', description: 'Edit content' },
  { number: Step.REVIEW, label: 'Review', description: 'Final check' }
];

// Helper to format relative time for autosave indicator
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const WizardPage = () => {
  const navigate = useNavigate();
  const { setHeaderConfig } = useOutletContext<{
    setHeaderConfig?: (config: { breadcrumbs?: BreadcrumbItem[]; rightContent?: React.ReactNode }) => void;
  }>();
  const {
    claimData, setClaimData, step, setStep, createNewClaim,
    isProcessing, processingText, showSaveIndicator,
    updateInvoiceDetails, analyzeEvidenceFiles, saveClaim,
    userProfile, addDeadline, deadlines
  } = useClaimStore();

  const [docError, setDocError] = useState<string | null>(null);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(claimData));
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [activeVerifyTab, setActiveVerifyTab] = useState<string>('claimant');
  const [newFilesCount, setNewFilesCount] = useState(0);

  // Claimant section auto-collapse: collapsed if profile exists and claimant data is complete
  const [claimantCollapsed, setClaimantCollapsed] = useState(() => {
    return !!(userProfile && claimData.claimant.name && claimData.claimant.address && claimData.claimant.postcode);
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isGeneratingRef = useRef(false);
  const deadlinesGeneratedForDocRef = useRef<string | null>(null); // Track deadlines generated for which doc type
  const claimDataRef = useRef(claimData); // Stable ref for auto-save to prevent infinite loop
  const recommendationAppliedRef = useRef<string | null>(null); // Track if recommendation was already applied

  // Keep ref in sync with state (outside of effects to avoid stale closures)
  claimDataRef.current = claimData;

  // Handler for adding evidence files (tracks new file count for analysis prompt)
  const handleAddEvidenceFiles = (newFiles: EvidenceFile[]) => {
    setClaimData(prev => ({...prev, evidence: [...prev.evidence, ...newFiles]}));
    setNewFilesCount(prev => prev + newFiles.length);
  };

  const handleAnalyzeNewFiles = async () => {
    await analyzeEvidenceFiles();
    setNewFilesCount(0); // Reset after analysis
  };

  // Debug logging to trace data received from conversation
  useEffect(() => {
    console.log('[WizardPage] claimData updated:', {
      defendant: claimData.defendant?.name,
      invoice: claimData.invoice?.totalAmount,
      source: claimData.source,
      step
    });
  }, [claimData, step]);

  // Helper to auto-suggest agreement type based on description
  const suggestAgreementType = useCallback((description: string): 'goods' | 'services' | 'ongoing_contract' | 'one_time_purchase' | null => {
    if (!description) return null;
    const lower = description.toLowerCase();
    if (/consult|advice|design|develop|build|support|maint|software|web|app|creative|market|legal|account/i.test(lower)) return 'services';
    if (/product|goods|deliver|ship|supplie|material|equipment|hardware|stock|item|purchase/i.test(lower)) return 'goods';
    if (/month|annual|subscription|retain|ongoing|contract|agreement|term|recurring/i.test(lower)) return 'ongoing_contract';
    if (/one-off|single|project|job|task|once|commission/i.test(lower)) return 'one_time_purchase';
    return null;
  }, []);

  // Auto-suggest agreement type when description is available
  useEffect(() => {
    if (claimData.invoice.description && !claimData.invoice.agreementType) {
      const suggested = suggestAgreementType(claimData.invoice.description);
      if (suggested) {
        updateInvoiceDetails('agreementType', suggested);
      }
    }
  }, [claimData.invoice.description, claimData.invoice.agreementType, suggestAgreementType, updateInvoiceDetails]);

  // Computed checks
  const hasExistingData = claimData.source !== 'manual' || claimData.invoice.totalAmount > 0 || !!claimData.defendant.name;
  const timelineHasLBA = claimData.timeline.some(e => e.type === 'lba_sent');
  const hasLBA = timelineHasLBA || claimData.lbaAlreadySent;
  const isFinalized = claimData.status === 'review' || claimData.status === 'sent' || claimData.status === 'court' || claimData.status === 'judgment';

  // Check if form has been modified (dirty state)
  const hasUnsavedChanges = useMemo(() => {
    // Compare against last saved snapshot (excludes lastModified to avoid false positives)
    const compareData = { ...claimData, lastModified: undefined };
    const compareSaved = JSON.parse(lastSavedSnapshot);
    compareSaved.lastModified = undefined;
    return JSON.stringify(compareData) !== JSON.stringify(compareSaved);
  }, [claimData, lastSavedSnapshot]);

  // Set up unsaved changes protection
  useUnsavedChanges({
    when: hasUnsavedChanges && !isFinalized,
    message: 'You have unsaved changes in your claim. Are you sure you want to leave?'
  });

  // Get step name for breadcrumb
  const getStepName = (stepNum: Step): string => {
    const stepDef = WIZARD_STEPS.find(s => s.number === stepNum);
    return stepDef ? stepDef.label : '';
  };

  // Get claim title (defendant name or "New Claim")
  const claimTitle = claimData.defendant?.name || 'New Claim';

  // Build breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    return [
      {
        label: 'Dashboard',
        onClick: () => {
          if (hasUnsavedChanges) {
            setShowExitConfirm(true);
          } else {
            navigate('/dashboard');
          }
        }
      },
      {
        label: claimTitle.length > 20 ? `${claimTitle.slice(0, 20)}...` : claimTitle,
        fullLabel: claimTitle.length > 20 ? claimTitle : undefined,
        onClick: step !== Step.EVIDENCE ? () => setStep(Step.EVIDENCE) : undefined
      },
      {
        label: getStepName(step),
        isCurrentPage: true
      }
    ];
  }, [step, hasUnsavedChanges, navigate, claimTitle]);

  // AI recommendation for Strategy step - must be at top level to satisfy Rules of Hooks
  const recommendation = useMemo(() => {
    return recommendFromClaimState(claimData);
  }, [claimData]);

  // Auto-select recommended document when entering Strategy step (if user hasn't manually selected)
  // Uses ref to prevent re-applying recommendation when claimData changes
  useEffect(() => {
    if (step !== Step.STRATEGY || !recommendation?.primaryDocument || claimData.userSelectedDocType) {
      return;
    }

    // Create a unique key for this recommendation application
    const recommendationKey = `${claimData.id}-${recommendation.primaryDocument}`;

    // Skip if we've already applied this recommendation
    if (recommendationAppliedRef.current === recommendationKey) {
      return;
    }

    // Only auto-select if current selection differs from recommendation
    if (claimData.selectedDocType !== recommendation.primaryDocument) {
      recommendationAppliedRef.current = recommendationKey;
      setClaimData(prev => ({
        ...prev,
        selectedDocType: recommendation.primaryDocument,
        // Don't set userSelectedDocType - this is an auto-selection
        // Clear any previously generated document for the old type
        generated: undefined
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, recommendation?.primaryDocument, claimData.userSelectedDocType, claimData.id, setClaimData]);

  // Guard: ensure wizard always has an active claim id (needed for save/payment flows)
  useEffect(() => {
    if (!claimData.id) {
      createNewClaim();
    }
  }, [claimData.id, createNewClaim]);

  // Auto-save when data changes (debounced)
  // IMPORTANT: Uses claimDataRef to prevent infinite loop - claimData is NOT in deps
  useEffect(() => {
    if (!hasUnsavedChanges || !claimDataRef.current.id) return;

    const saveTimer = setTimeout(async () => {
      try {
        await saveClaim();
        // Update the saved snapshot to match current data (excluding lastModified)
        const newSnapshot = { ...claimDataRef.current, lastModified: undefined };
        setLastSavedSnapshot(JSON.stringify(newSnapshot));
        setLastSaveTime(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast.error('Failed to save claim. Please try again.');
      }
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(saveTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, saveClaim]); // Intentionally excludes claimData to prevent infinite loop

  // Auto-generate document when entering Draft/Review (best-effort)
  // IMPORTANT: deadlines is intentionally excluded from deps to prevent infinite loop
  // when addDeadline modifies the deadlines array during generation
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

    // Prevent concurrent generation calls
    if (isGeneratingRef.current) return;

    let cancelled = false;
    isGeneratingRef.current = true;
    setIsGeneratingDocument(true);
    setDocError(null);

    (async () => {
      try {
        const generated = await DocumentBuilder.generateDocument(claimData, userProfile ?? undefined);
        if (cancelled) return;
        setClaimData(prev => ({ ...prev, generated }));
        toast.success('Document generated successfully');

        // Auto-generate deadlines based on document type (only if not already generated for this doc type)
        // Using ref to prevent re-generation when deadlines array changes
        const docTypeKey = `${claimData.id}-${claimData.selectedDocType}`;
        if (deadlinesGeneratedForDocRef.current !== docTypeKey) {
          deadlinesGeneratedForDocRef.current = docTypeKey;

          const newDeadlines = generateDeadlinesForDocument(
            claimData.selectedDocType,
            claimData,
            deadlines,
            claimData.lbaSentDate || undefined
          );

          // Add each deadline to the store
          for (const deadline of newDeadlines) {
            await addDeadline(deadline);
          }

          if (newDeadlines.length > 0) {
            toast.success(`${newDeadlines.length} deadline(s) added to calendar`, {
              icon: '📅',
              duration: 4000
            });
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        setDocError(e?.message || 'Failed to generate document.');
        toast.error('Failed to generate document. Please try again.');
      } finally {
        if (!cancelled) {
          setIsGeneratingDocument(false);
          isGeneratingRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      isGeneratingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    claimData.selectedDocType,
    claimData.id,
    // Note: claimData.generated?.documentType intentionally excluded to prevent re-triggering when doc is generated
    // Note: deadlines intentionally excluded to prevent infinite loop when addDeadline is called
    claimData.claimant.name,
    claimData.defendant.name,
    claimData.invoice.totalAmount,
    claimData.lbaSentDate,
    userProfile,
    setClaimData,
    addDeadline
  ]);

  // --- Handlers ---

  const handleExitWizard = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    navigate('/dashboard');
  };

  const handleCancelWizard = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCancelConfirm(true);
    } else {
      navigate('/dashboard');
    }
  }, [hasUnsavedChanges, navigate]);

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    // Don't save changes, just navigate away
    navigate('/dashboard');
  };

  const handleNextStep = (nextStep: Step) => {
    // Reset stuck generation ref if transitioning to Draft/Review and not actively generating
    // This fixes the issue where the button doesn't respond after a failed/cancelled generation
    if ((nextStep === Step.DRAFT || nextStep === Step.REVIEW) && isGeneratingRef.current && !isGeneratingDocument) {
      console.warn('[WizardPage] Resetting stuck isGeneratingRef');
      isGeneratingRef.current = false;
    }
    // Show brief loading state for visual feedback during step transitions
    setIsTransitioning(true);
    // Use requestAnimationFrame to ensure smooth transition
    requestAnimationFrame(() => {
      setStep(nextStep);
      // Clear transition state after a brief moment
      setTimeout(() => setIsTransitioning(false), 150);
    });
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

  const handleLbaAlreadySentChange = async (isChecked: boolean) => {
    if (!isChecked) {
      setClaimData(prev => ({ ...prev, lbaAlreadySent: false, lbaSentDate: '' }));
      return;
    }

    const today = getTodayISO();
    // Try to get LBA date from timeline events first, then fall back to existing value or today
    const lbaTimelineEvent = claimData.timeline.find(e => e.type === 'lba_sent');
    const lbaSentDate = lbaTimelineEvent?.date || claimData.lbaSentDate || today;

    setClaimData(prev => ({
      ...prev,
      lbaAlreadySent: true,
      lbaSentDate
    }));

    // Auto-generate deadlines for LBA sent
    const updatedClaim = { ...claimData, lbaAlreadySent: true, lbaSentDate };
    const newDeadlines = generateDeadlinesForDocument(
      DocumentType.LBA,
      updatedClaim,
      deadlines,
      lbaSentDate
    );

    for (const deadline of newDeadlines) {
      await addDeadline(deadline);
    }

    if (newDeadlines.length > 0) {
      toast.success(`LBA deadlines added to calendar`, { icon: '📅' });
    }
  };

  // --- Render Steps ---

  const renderEvidenceStep = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in py-4">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">
            Evidence & Documents
          </h2>
          <p className="text-slate-500">
            Upload supporting documents for your claim - invoices, contracts, emails, or any other evidence.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Evidence Locker</h3>
              <p className="text-slate-500 text-sm">
                Drag and drop or click to upload files
              </p>
            </div>
            {claimData.evidence.length > 0 && (
              <span className="text-sm text-teal-600 font-medium">
                {claimData.evidence.length} file{claimData.evidence.length !== 1 ? 's' : ''} uploaded
              </span>
            )}
          </div>

          <EvidenceUpload
            files={claimData.evidence}
            onAddFiles={handleAddEvidenceFiles}
            onRemoveFile={(idx) => {
              setClaimData(prev => ({...prev, evidence: prev.evidence.filter((_, i) => i !== idx)}));
              // Reduce new files count if removing a new file
              if (newFilesCount > 0) setNewFilesCount(prev => Math.max(0, prev - 1));
            }}
            onAnalyze={claimData.evidence.length > 0 ? handleAnalyzeNewFiles : undefined}
            isProcessing={isProcessing}
          />

          {/* Show info about new files that can be analyzed */}
          {hasExistingData && newFilesCount > 0 && !isProcessing && (
            <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-teal-800">
                  <strong>{newFilesCount} new file{newFilesCount !== 1 ? 's' : ''}</strong> ready to analyze.
                  Click "Analyze Documents" to extract additional data.
                </p>
              </div>
            </div>
          )}

          {/* Helpful tips */}
          <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Tips for strong evidence:</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• <strong>Invoices:</strong> Show amounts, dates, and terms clearly</li>
              <li>• <strong>Contracts:</strong> Signed agreements proving the debt</li>
              <li>• <strong>Emails/Letters:</strong> Communications about payment</li>
              <li>• <strong>Proof of delivery:</strong> Shows goods/services were provided</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => handleNextStep(Step.VERIFY)}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Continue to Verify
          </Button>
        </div>
    </div>
  );

  const renderVerifyStep = () => {
    // Validation helper functions for each tab
    const validateClaimant = () => {
      const errors: string[] = [];
      if (!claimData.claimant.name?.trim()) errors.push('name');
      if (!claimData.claimant.address?.trim()) errors.push('address');
      if (!claimData.claimant.city?.trim()) errors.push('city');
      if (!claimData.claimant.county?.trim()) errors.push('county');
      if (!claimData.claimant.postcode?.trim()) errors.push('postcode');
      return errors;
    };

    const validateDefendant = () => {
      const errors: string[] = [];
      if (!claimData.defendant.name?.trim()) errors.push('name');
      if (!claimData.defendant.address?.trim()) errors.push('address');
      if (!claimData.defendant.city?.trim()) errors.push('city');
      if (!claimData.defendant.county?.trim()) errors.push('county');
      if (!claimData.defendant.postcode?.trim()) errors.push('postcode');
      return errors;
    };

    const validateInvoice = () => {
      const errors: string[] = [];
      // Invoice number is optional - not all debts have formal invoices
      if (!claimData.invoice.totalAmount || claimData.invoice.totalAmount <= 0) errors.push('amount');
      if (!claimData.invoice.dateIssued) errors.push('date');
      return errors;
    };

    const validateTimeline = () => {
      // Timeline is optional, but warn if completely empty
      return claimData.timeline.length === 0 ? ['no events'] : [];
    };

    const claimantErrors = validateClaimant();
    const defendantErrors = validateDefendant();
    const invoiceErrors = validateInvoice();
    const timelineErrors = validateTimeline();

    // Tab validation status
    const getTabStatus = (tabId: string): 'complete' | 'incomplete' | 'warning' => {
      switch(tabId) {
        case 'claimant':
          return claimantErrors.length === 0 ? 'complete' : 'incomplete';
        case 'debtor':
          return defendantErrors.length === 0 ? 'complete' : 'incomplete';
        case 'invoice':
          return invoiceErrors.length === 0 ? 'complete' : 'incomplete';
        case 'timeline':
          return timelineErrors.length === 0 ? 'complete' : 'warning';
        case 'preaction':
          return 'complete'; // Pre-action is optional
        default:
          return 'incomplete';
      }
    };

    // Define tabs for the verify step with status indicators
    const verifyTabs: Tab[] = [
      {
        id: 'claimant',
        label: 'Claimant',
        icon: <User className="w-4 h-4" />,
        badge: getTabStatus('claimant') === 'complete' ?
          <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span> :
          claimantErrors.length > 0 ?
            <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-white" />
            </span> :
            undefined
      },
      {
        id: 'debtor',
        label: 'Debtor',
        icon: <Building2 className="w-4 h-4" />,
        badge: getTabStatus('debtor') === 'complete' ?
          <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span> :
          defendantErrors.length > 0 ?
            <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-white" />
            </span> :
            undefined
      },
      {
        id: 'invoice',
        label: 'Invoice',
        icon: <Receipt className="w-4 h-4" />,
        badge: getTabStatus('invoice') === 'complete' ?
          <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span> :
          invoiceErrors.length > 0 ?
            <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-white" />
            </span> :
            undefined
      },
      {
        id: 'timeline',
        label: 'Timeline',
        icon: <Calendar className="w-4 h-4" />,
        badge: timelineErrors.length === 0 ?
          <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span> :
          <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
            <Clock className="w-3 h-3 text-white" />
          </span>
      },
      {
        id: 'preaction',
        label: 'Pre-Action',
        icon: <Mail className="w-4 h-4" />,
        badge: <span className="w-5 h-5 bg-slate-300 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      },
    ];

    // Overall validation
    const validationErrors: string[] = [];
    if (claimantErrors.length > 0) validationErrors.push(...claimantErrors.map(e => `claimant ${e}`));
    if (defendantErrors.length > 0) validationErrors.push(...defendantErrors.map(e => `defendant ${e}`));
    if (invoiceErrors.length > 0) validationErrors.push(...invoiceErrors.map(e => `invoice ${e}`));
    const canProceed = claimantErrors.length === 0 && defendantErrors.length === 0 && invoiceErrors.length === 0;

    // Helper to calculate due date from payment terms
    const handlePaymentTermsChange = (terms: string) => {
      updateInvoiceDetails('paymentTerms', terms);
      if (terms !== 'custom' && claimData.invoice.dateIssued) {
        const termOption = PAYMENT_TERMS_OPTIONS.find(o => o.value === terms);
        if (termOption?.days) {
          const invoiceDate = new Date(claimData.invoice.dateIssued);
          invoiceDate.setDate(invoiceDate.getDate() + termOption.days);
          updateInvoiceDetails('dueDate', invoiceDate.toISOString().split('T')[0]);
        }
      }
    };

    // Helper to infer payment terms from dates (reverse calculation)
    const inferPaymentTermsFromDates = (dateIssued: string, dueDate: string): string | null => {
      if (!dateIssued || !dueDate) return null;
      const issue = new Date(dateIssued);
      const due = new Date(dueDate);
      const daysDiff = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 7) return 'net_7';
      if (daysDiff <= 14) return 'net_14';
      if (daysDiff <= 30) return 'net_30';
      if (daysDiff <= 60) return 'net_60';
      if (daysDiff <= 90) return 'net_90';
      return 'custom';
    };

    // Handler for due date changes with auto-fill
    const handleDueDateChange = (dueDate: string) => {
      updateInvoiceDetails('dueDate', dueDate);
      // Auto-fill payment terms if not already set
      if (!claimData.invoice.paymentTerms && claimData.invoice.dateIssued) {
        const inferredTerms = inferPaymentTermsFromDates(claimData.invoice.dateIssued, dueDate);
        if (inferredTerms) {
          updateInvoiceDetails('paymentTerms', inferredTerms);
        }
      }
    };

    return (
      <div className="space-y-6 animate-fade-in py-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => handleNextStep(Step.EVIDENCE)}
          className="w-fit"
        >
          Back to Evidence
        </Button>

        <div className="text-center mb-5">
          <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">Review Your Claim Details</h2>
          <p className="text-slate-500">Complete each section to proceed with your claim.</p>
        </div>

        {/* Validation Summary - Show all missing fields at a glance */}
        {!canProceed && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-2">Required fields missing</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  {claimantErrors.length > 0 && (
                    <button
                      onClick={() => setActiveVerifyTab('claimant')}
                      className="text-left px-3 py-2 bg-white rounded-lg border border-red-200 hover:border-red-400 transition-colors"
                    >
                      <span className="font-medium text-red-700">Claimant:</span>
                      <span className="text-red-600 ml-1">{claimantErrors.join(', ')}</span>
                    </button>
                  )}
                  {defendantErrors.length > 0 && (
                    <button
                      onClick={() => setActiveVerifyTab('debtor')}
                      className="text-left px-3 py-2 bg-white rounded-lg border border-red-200 hover:border-red-400 transition-colors"
                    >
                      <span className="font-medium text-red-700">Debtor:</span>
                      <span className="text-red-600 ml-1">{defendantErrors.join(', ')}</span>
                    </button>
                  )}
                  {invoiceErrors.length > 0 && (
                    <button
                      onClick={() => setActiveVerifyTab('invoice')}
                      className="text-left px-3 py-2 bg-white rounded-lg border border-red-200 hover:border-red-400 transition-colors"
                    >
                      <span className="font-medium text-red-700">Invoice:</span>
                      <span className="text-red-600 ml-1">{invoiceErrors.join(', ')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Tabs */}
        <HorizontalTabs
          tabs={verifyTabs}
          activeTab={activeVerifyTab}
          onTabChange={setActiveVerifyTab}
          className="bg-white rounded-t-xl"
        />

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-6 shadow-sm min-h-[400px]">
          {/* Claimant Tab */}
          {activeVerifyTab === 'claimant' && (
            <div className="animate-fade-in">
              {claimantCollapsed && userProfile ? (
                /* Collapsed read-only view when profile exists */
                <div className="bg-gradient-to-r from-slate-50 to-teal-50/30 rounded-xl p-5 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-slate-900">Your Details (from profile)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">Name/Business</p>
                          <p className="font-medium text-slate-800">{claimData.claimant.name}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">Type</p>
                          <p className="font-medium text-slate-800">{claimData.claimant.type}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-slate-500 text-xs mb-0.5">Address</p>
                          <p className="font-medium text-slate-800">
                            {claimData.claimant.address}, {claimData.claimant.city}, {claimData.claimant.postcode}
                          </p>
                        </div>
                        {claimData.claimant.email && (
                          <div>
                            <p className="text-slate-500 text-xs mb-0.5">Email</p>
                            <p className="font-medium text-slate-800">{claimData.claimant.email}</p>
                          </div>
                        )}
                        {claimData.claimant.phone && (
                          <div>
                            <p className="text-slate-500 text-xs mb-0.5">Phone</p>
                            <p className="font-medium text-slate-800">{claimData.claimant.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClaimantCollapsed(false)}
                      className="flex-shrink-0 ml-4"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                /* Expanded editable view */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-sm font-semibold text-teal-700 uppercase tracking-wide">Your Details</span>
                    </div>
                    {userProfile && claimData.claimant.name && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setClaimantCollapsed(true)}
                      >
                        Collapse
                      </Button>
                    )}
                  </div>
                  <PartyForm party={claimData.claimant} onChange={handleClaimantChange} title="Claimant" />
                </>
              )}
            </div>
          )}

          {/* Debtor Tab */}
          {activeVerifyTab === 'debtor' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Debtor Details</span>
              </div>
              <PartyForm party={claimData.defendant} onChange={handleDefendantChange} title="Defendant" />
            </div>
          )}

          {/* Invoice Tab */}
          {activeVerifyTab === 'invoice' && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-bold text-slate-900">Invoice Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Invoice/Reference Number"
                  value={claimData.invoice.invoiceNumber}
                  onChange={(e) => updateInvoiceDetails('invoiceNumber', e.target.value)}
                  helperText="Optional - add if you have one"
                  placeholder="e.g. INV-001 or reference"
                />
                <Input
                  label="Amount (£)"
                  type="number"
                  value={claimData.invoice.totalAmount || ''}
                  onChange={(e) => updateInvoiceDetails('totalAmount', e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  error={!claimData.invoice.totalAmount || claimData.invoice.totalAmount <= 0 ? 'Enter a valid amount' : undefined}
                  helpText="Total invoice amount in pounds"
                />
                <DateInput
                  label="Invoice Date"
                  value={claimData.invoice.dateIssued}
                  onChange={(value) => updateInvoiceDetails('dateIssued', value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                  error={!claimData.invoice.dateIssued ? 'Invoice date is required' : undefined}
                  helpText="Date the invoice was issued"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Payment Terms
                  </label>
                  <select
                    value={claimData.invoice.paymentTerms || ''}
                    onChange={(e) => handlePaymentTermsChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white"
                  >
                    <option value="">Select payment terms...</option>
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Standard payment period from invoice</p>
                </div>

                {/* Due Date */}
                <DateInput
                  label="Due Date"
                  value={claimData.invoice.dueDate || ''}
                  onChange={handleDueDateChange}
                  min={claimData.invoice.dateIssued}
                  helpText="When payment was due"
                />

                {/* Service/Delivery Date */}
                <DateInput
                  label="Service/Delivery Date"
                  value={claimData.invoice.serviceDeliveryDate || ''}
                  onChange={(value) => updateInvoiceDetails('serviceDeliveryDate', value)}
                  max={new Date().toISOString().split('T')[0]}
                  helpText="When goods/services were delivered (optional)"
                />

                {/* Agreement Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contract/Agreement Type
                  </label>
                  <select
                    value={claimData.invoice.agreementType || ''}
                    onChange={(e) => updateInvoiceDetails('agreementType', e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white"
                  >
                    <option value="">Select type...</option>
                    {AGREEMENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Nature of the underlying agreement</p>
                </div>
              </div>

              {/* Interest Calculator Preview */}
              {claimData.invoice.totalAmount > 0 && claimData.invoice.dateIssued && (
                <InterestPreview
                  amount={claimData.invoice.totalAmount}
                  dateIssued={claimData.invoice.dateIssued}
                  dueDate={claimData.invoice.dueDate}
                  claimantType={claimData.claimant.type}
                  defendantType={claimData.defendant.type}
                  className="mt-6"
                />
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeVerifyTab === 'timeline' && (
            <div id="timeline-section" className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-teal-600" />
                <span className="font-bold text-slate-900">Claim Timeline</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Add key events in your claim journey. This helps establish a clear history for legal purposes.
              </p>
              <TimelineBuilder
                events={claimData.timeline}
                onChange={(events) => setClaimData(prev => ({ ...prev, timeline: events }))}
                invoiceDate={claimData.invoice.dateIssued}
                claimData={claimData}
                onAddDeadline={addDeadline}
                existingDeadlines={deadlines.filter(d => d.claimId === claimData.id)}
                onGoToInvoice={() => setActiveVerifyTab('invoice')}
              />
            </div>
          )}

          {/* Pre-Action Tab */}
          {activeVerifyTab === 'preaction' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Pre-Action Protocol Status</h3>
                  <p className="text-xs text-slate-500">Letter Before Action (LBA) check</p>
                </div>
              </div>

              <div className="bg-amber-50/30 border border-slate-200 border-l-4 border-l-amber-500 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Under the Pre-Action Protocol for Debt Claims, you must send a Letter Before Action
                  and wait for a response period (14 days for businesses, 30 days for individuals) before issuing court proceedings.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={claimData.lbaAlreadySent || false}
                  onChange={(e) => handleLbaAlreadySentChange(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <span className="font-semibold text-slate-900">I have already sent a Letter Before Action</span>
                  <p className="text-sm text-slate-500 mt-1">Check this if you have previously sent an LBA to the debtor</p>
                  {claimData.lbaAlreadySent && (
                    <div className="mt-4 max-w-xs">
                      <DateInput
                        label="Date Sent"
                        value={claimData.lbaSentDate || ''}
                        onChange={(value) => setClaimData(prev => ({...prev, lbaSentDate: value}))}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Validation & Footer */}
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex-1">
              {!canProceed && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>Please complete all required fields</span>
                  </div>
                  <div className="text-xs text-red-500">
                    {claimantErrors.length > 0 && <span className="mr-2">• Claimant tab: {claimantErrors.join(', ')}</span>}
                    {defendantErrors.length > 0 && <span className="mr-2">• Debtor tab: {defendantErrors.join(', ')}</span>}
                    {invoiceErrors.length > 0 && <span className="mr-2">• Invoice tab: {invoiceErrors.join(', ')}</span>}
                  </div>
                </div>
              )}
              {canProceed && timelineErrors.length > 0 && (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Timeline is empty - consider adding key events</span>
                  <button
                    onClick={() => {
                      setActiveVerifyTab('timeline');
                      setTimeout(() => {
                        document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="ml-2 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    + Add Event
                  </button>
                </div>
              )}
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
      </div>
    );
  };

  const renderStrategyStep = () => {
    // recommendation is now computed at the top level of the component

    const docCards = [
      {
        type: DocumentType.POLITE_CHASER,
        title: 'Polite Reminder',
        desc: 'Soft reminder for good relationships.',
        useCase: 'Best when: First contact, want to preserve business relationship.',
        icon: MessageSquareText
      },
      {
        type: DocumentType.LBA,
        title: 'Letter Before Action',
        desc: 'Formal warning giving 14-30 days to pay.',
        useCase: 'Required before court. Gives debtor final formal notice.',
        icon: Mail
      },
      {
        type: DocumentType.FORM_N1,
        title: 'Form N1 (Court Claim)',
        desc: 'Official court claim form.',
        useCase: 'Use when: LBA period expired without payment.',
        icon: Scale
      }
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-12">
        <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4"/>} onClick={() => handleNextStep(Step.VERIFY)} className="mb-4">
          Back to Verify
        </Button>
        <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">Select Document Type</h2>
        <p className="text-slate-500 mb-6">Choose the best legal document based on your situation.</p>

        {/* AI Recommendation Banner */}
        {recommendation && (
          <div className="bg-gradient-to-r from-teal-50 to-slate-50 border-l-4 border-teal-500 p-5 rounded-r-xl mb-8 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-slate-900">AI Recommendation</h4>
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                    Stage: {recommendation.stage.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-2">
                  <strong className="text-teal-700">{recommendation.primaryDocument}</strong> - {recommendation.reason}
                </p>
                {recommendation.warnings.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {recommendation.warnings.map((warning, idx) => {
                      // Determine action based on warning content
                      const getWarningAction = (w: string): (() => void) | null => {
                        const lowerWarning = w.toLowerCase();
                        if (lowerWarning.includes('14-day') || lowerWarning.includes('timeline')) {
                          return () => { handleNextStep(Step.VERIFY); setTimeout(() => setActiveVerifyTab('timeline'), 100); };
                        }
                        if (lowerWarning.includes('claim strength') || lowerWarning.includes('invoice')) {
                          return () => { handleNextStep(Step.VERIFY); setTimeout(() => setActiveVerifyTab('invoice'), 100); };
                        }
                        if (lowerWarning.includes('claimant') || lowerWarning.includes('your details')) {
                          return () => { handleNextStep(Step.VERIFY); setTimeout(() => setActiveVerifyTab('claimant'), 100); };
                        }
                        if (lowerWarning.includes('debtor') || lowerWarning.includes('defendant')) {
                          return () => { handleNextStep(Step.VERIFY); setTimeout(() => setActiveVerifyTab('debtor'), 100); };
                        }
                        return null; // Info-only warnings (e.g., "small claims limit")
                      };
                      const action = getWarningAction(warning);

                      return action ? (
                        <button
                          key={idx}
                          onClick={action}
                          className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1.5 w-full text-left transition-colors cursor-pointer"
                        >
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1">{warning}</span>
                          <ChevronRight className="w-3 h-3 flex-shrink-0 text-amber-500" />
                        </button>
                      ) : (
                        <p key={idx} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {warning}
                        </p>
                      );
                    })}
                  </div>
                )}
                {recommendation.alternatives.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 font-medium mb-1">Alternatives to consider:</p>
                    {recommendation.alternatives.slice(0, 2).map((alt, idx) => (
                      <p key={idx} className="text-xs text-slate-600">
                        <strong>{alt.document}</strong>: {alt.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docCards.map(doc => {
            const isRecommended = recommendation?.primaryDocument === doc.type;
            const isSelected = claimData.selectedDocType === doc.type;
            const isAlternative = recommendation?.alternatives.some(a => a.document === doc.type);

            return (
              <div
                key={doc.type}
                onClick={() => setClaimData(prev => ({
                  ...prev,
                  selectedDocType: doc.type,
                  userSelectedDocType: true,
                  // CRITICAL: Clear cached document when changing type to force regeneration
                  generated: prev.generated?.documentType !== doc.type ? undefined : prev.generated
                }))}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-teal-600 bg-teal-600 text-white shadow-lg ring-4 ring-teal-200'
                    : isRecommended
                    ? 'border-teal-300 bg-teal-50/50 hover:border-teal-400 hover:shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Selected Badge - Always visible when selected */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border-2 border-white">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Selected
                  </div>
                )}

                {/* Recommended Badge - Only show when not selected */}
                {isRecommended && !isSelected && (
                  <div className="absolute -top-3 -right-3 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border border-slate-200">
                    <Sparkles className="w-3 h-3" />
                    Suggested
                  </div>
                )}

                <doc.icon className={`w-8 h-8 mb-4 ${
                  isSelected ? 'text-teal-400' :
                  isRecommended ? 'text-teal-600' :
                  'text-teal-600'
                }`} />
                <h3 className="font-bold text-lg mb-2">{doc.title}</h3>
                <p className={`text-sm mb-3 ${
                  isSelected ? 'text-slate-300' : 'text-slate-500'
                }`}>{doc.desc}</p>

                {/* Use Case Description */}
                <div className={`pt-3 border-t ${
                  isSelected ? 'border-slate-700' : 'border-slate-200'
                }`}>
                  <p className={`text-xs ${
                    isSelected ? 'text-slate-400' : 'text-slate-500'
                  }`}>{doc.useCase}</p>
                </div>

                {/* Alternative recommendation reason */}
                {isAlternative && !isSelected && (
                  <div className="mt-3 pt-2 border-t border-amber-200 bg-amber-50 -mx-6 -mb-6 px-6 pb-4 rounded-b-xl">
                    <p className="text-xs text-amber-700">
                      {recommendation?.alternatives.find(a => a.document === doc.type)?.reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Interest toggle for Polite Reminder */}
        {claimData.selectedDocType === DocumentType.POLITE_CHASER && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={claimData.includeInterestInReminder || false}
                onChange={(e) => setClaimData(prev => ({
                  ...prev,
                  includeInterestInReminder: e.target.checked,
                  // Clear cached document to force regeneration with new setting
                  generated: undefined
                }))}
                className="mt-1 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <div>
                <span className="font-medium text-slate-900">Include accrued interest in reminder</span>
                <p className="text-sm text-slate-500 mt-0.5">
                  {claimData.includeInterestInReminder
                    ? `Amount shown: £${(claimData.invoice.totalAmount + claimData.interest.totalInterest + claimData.compensation).toFixed(2)} (principal + interest)`
                    : `Amount shown: £${claimData.invoice.totalAmount.toFixed(2)} (principal only)`
                  }
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button onClick={() => handleNextStep(Step.DRAFT)} rightIcon={<ArrowRight className="w-5 h-5"/>}>
            Continue to Draft
          </Button>
        </div>
      </div>
    );
  };

  const renderDraftStep = () => (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-12 h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" icon={<ArrowLeft className="w-4 h-4"/>} onClick={() => handleNextStep(Step.STRATEGY)}>Back to Strategy</Button>
            <h2 className="text-2xl font-bold text-slate-900">Draft Your Document</h2>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[360px] md:min-h-[480px]">
             {/* Only show spinner when generating AND no document exists yet */}
             {isGeneratingDocument && !claimData.generated && !docError && (
               <div className="p-6 text-sm text-slate-600 flex items-center gap-3">
                 <div className="w-5 h-5 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                 Generating your document…
               </div>
             )}
             {docError && !claimData.generated && (
               <div className="p-6">
                 <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                   <p className="font-semibold mb-1">Document generation failed</p>
                   <p>{docError}</p>
                   <Button
                     variant="secondary"
                     className="mt-3"
                     onClick={() => {
                       setDocError(null);
                       setClaimData(prev => ({ ...prev, generated: undefined }));
                     }}
                   >
                     Retry
                   </Button>
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
                 onFinish={() => navigate('/dashboard')}
               />
             )}
          </div>

          {/* Deadline Summary Panel - shows after document generation */}
          {claimData.generated && deadlines.filter(d => d.claimId === claimData.id).length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-teal-800">Upcoming Deadlines</span>
                </div>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-xs text-teal-600 hover:text-teal-800 underline"
                >
                  View Calendar
                </button>
              </div>
              <div className="space-y-2">
                {deadlines
                  .filter(d => d.claimId === claimData.id && d.status === 'pending')
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 3)
                  .map((deadline) => (
                    <div
                      key={deadline.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-teal-100"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{deadline.title}</p>
                        <p className="text-xs text-slate-500">{deadline.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-700">
                          {new Date(deadline.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Fallback navigation to Review step */}
          {claimData.generated && !isFinalized && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  setClaimData(prev => ({ ...prev, status: 'review' }));
                  toast.success('Document finalized! Ready for review and sending.', {
                    duration: 4000,
                    icon: '✅'
                  });
                  handleNextStep(Step.REVIEW);
                }}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Continue to Review
              </Button>
            </div>
          )}
      </div>
  );

  const renderReviewStep = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-12 h-full flex flex-col">
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

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[360px] md:min-h-[480px]">
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
            onFinish={() => navigate('/dashboard')}
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

  // Format last save time
  const formatLastSaveTime = () => {
    if (!lastSaveTime) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastSaveTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Build right content for header (rendered by WizardLayout's Header)
  const headerRightContent = useMemo(() => (
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        <div className="hidden sm:flex items-center">
          {hasUnsavedChanges ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Saving...</span>
            </div>
          ) : lastSaveTime ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200" title={`Last saved: ${lastSaveTime.toLocaleTimeString('en-GB')}`}>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Saved {formatRelativeTime(lastSaveTime)}</span>
            </div>
          ) : null}
        </div>

        {/* Save Draft Button */}
        <Button
          variant="outline"
          onClick={async () => {
            await saveClaim();
            toast.success('Draft saved successfully', { icon: '💾' });
          }}
          icon={<Save className="w-4 h-4" />}
          className="text-teal-700 border-teal-200 hover:bg-teal-50"
          title="Save draft"
          size="sm"
        >
          <span className="hidden sm:inline">Save Draft</span>
        </Button>

        {/* Cancel Button */}
        <Button
          variant="ghost"
          onClick={handleCancelWizard}
          icon={<X className="w-4 h-4" />}
          className="text-slate-600 hover:text-red-600"
          title="Cancel and discard changes"
          size="sm"
        >
          <span className="hidden sm:inline">Cancel</span>
        </Button>
      </div>
  ), [hasUnsavedChanges, lastSaveTime, handleCancelWizard, saveClaim]);

  // Configure the layout header from this page to avoid double-stacked headers
  useEffect(() => {
    if (!setHeaderConfig) return;
    setHeaderConfig({ breadcrumbs: breadcrumbItems, rightContent: headerRightContent });
    return () => setHeaderConfig({});
  }, [setHeaderConfig, breadcrumbItems, headerRightContent]);

  return (
    <div className="flex flex-col min-h-full">
        {/* Mobile Progress - shown at top of content on mobile */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 mb-4">
          <ProgressStepsCompact steps={WIZARD_STEPS} currentStep={step} />
        </div>

        {/* Legacy Save Indicator (for compatibility) */}
        <div className={`fixed top-16 right-4 z-50 bg-white/80 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-teal-700 flex items-center gap-1.5 transition-opacity duration-300 ${showSaveIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <Save className="w-3 h-3" /> Saved
        </div>

        {/* Confirmation Modals */}
        <ConfirmModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onConfirm={handleConfirmExit}
          title="Leave Without Saving?"
          message="You have unsaved changes. Your progress has been auto-saved, but you may want to review before leaving. Are you sure you want to go back to the dashboard?"
          confirmText="Yes, Leave"
          cancelText="Stay Here"
          variant="warning"
        />

        <ConfirmModal
          isOpen={showCancelConfirm}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel Claim?"
          message="Are you sure you want to cancel and discard all changes? This will take you back to the dashboard."
          confirmText="Yes, Cancel Claim"
          cancelText="Continue Editing"
          variant="danger"
        />

        {/* Step content with transition effect */}
        <div className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
          {isTransitioning ? (
            <div className="py-8">
              <Shimmer variant="card" />
            </div>
          ) : (
            <>
              {step === Step.EVIDENCE && renderEvidenceStep()}
              {step === Step.VERIFY && renderVerifyStep()}
              {step === Step.STRATEGY && renderStrategyStep()}
              {step === Step.DRAFT && renderDraftStep()}
              {step === Step.REVIEW && renderReviewStep()}
            </>
          )}</div>
    </div>
  );
};


