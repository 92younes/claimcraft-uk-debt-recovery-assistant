import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PartyForm } from './components/PartyForm';
import { Input, TextArea } from './components/ui/Input';
import { Tooltip } from './components/ui/Tooltip';
import { ProgressStepsCompact } from './components/ui/ProgressSteps';
import { DocumentPreview } from './components/DocumentPreview';
import { CsvImportModal } from './components/CsvImportModal';
import { AssessmentReport } from './components/AssessmentReport';
import { TimelineBuilder } from './components/TimelineBuilder';
import { EvidenceUpload } from './components/EvidenceUpload';
import { ChatInterface } from './components/ChatInterface';
import { OnboardingModal } from './components/OnboardingModal';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { StatementOfTruthModal } from './components/StatementOfTruthModal';
import { InterestRateConfirmModal } from './components/InterestRateConfirmModal';
import { LitigantInPersonModal } from './components/LitigantInPersonModal';
import { ViabilityBlockModal } from './components/ViabilityBlockModal';
import { AccountingIntegration } from './components/AccountingIntegration';
import { XeroInvoiceImporter } from './components/XeroInvoiceImporter';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { analyzeEvidence, startClarificationChat, sendChatMessage, getClaimStrengthAssessment, extractDataFromChat } from './services/geminiService';
import { DocumentBuilder } from './services/documentBuilder';
import { NangoClient } from './services/nangoClient';
import { searchCompaniesHouse } from './services/companiesHouse';
import { assessClaimViability, calculateCourtFee, calculateCompensation } from './services/legalRules';
import { getStoredClaims, saveClaimToStorage, deleteClaimFromStorage, exportAllUserData, deleteAllUserData, getUserProfile, saveUserProfile } from './services/storageService';
import { profileToClaimantParty } from './services/userProfileService';
import { ClaimState, INITIAL_STATE, Party, InvoiceData, InterestData, DocumentType, PartyType, TimelineEvent, EvidenceFile, ChatMessage, AccountingConnection, ExtractedClaimData, UserProfile } from './types';
import { LATE_PAYMENT_ACT_RATE, DAILY_INTEREST_DIVISOR, DEFAULT_PAYMENT_TERMS_DAYS, getCountyFromPostcode } from './constants';
import { validateDateRelationship, validateInterestCalculation, validateUniqueInvoice } from './utils/validation';
import { ArrowRight, Wand2, Loader2, CheckCircle, FileText, Mail, Scale, ArrowLeft, Sparkles, Upload, Zap, ShieldCheck, ChevronRight, ChevronUp, ChevronDown, Lock, Check, Play, Globe, LogIn, Keyboard, Pencil, MessageSquareText, ThumbsUp, Command, AlertTriangle, AlertCircle, HelpCircle, Calendar, PoundSterling, User, Gavel, FileCheck, FolderOpen, Percent } from 'lucide-react';

// New view state
type ViewState = 'landing' | 'onboarding' | 'dashboard' | 'wizard' | 'privacy' | 'terms';

enum Step {
  SOURCE = 1,
  DETAILS = 2,
  VIABILITY = 3,   // Legal Viability Check (Gatekeeper)
  TIMELINE = 4,    // Moved before Questions so AI has context
  QUESTIONS = 5,   // Chat / Consultation
  DATA_REVIEW = 6, // Review AI-extracted data
  RECOMMENDATION = 7, // Strategy & Doc Selection
  DRAFT = 8,
  PREVIEW = 9
}

// Wizard step definitions for progress indicator
const WIZARD_STEPS = [
  { number: Step.SOURCE, label: 'Data Source', description: 'Import or enter' },
  { number: Step.DETAILS, label: 'Claim Details', description: 'Parties & amounts' },
  { number: Step.VIABILITY, label: 'Assessment', description: 'Legal check' },
  { number: Step.TIMELINE, label: 'Timeline', description: 'Event history' },
  { number: Step.QUESTIONS, label: 'Consultation', description: 'AI questions' },
  { number: Step.DATA_REVIEW, label: 'Review Data', description: 'Verify details' },
  { number: Step.RECOMMENDATION, label: 'Strategy', description: 'Document type' },
  { number: Step.DRAFT, label: 'Draft', description: 'Edit content' },
  { number: Step.PREVIEW, label: 'Review', description: 'Final check' }
];

const App: React.FC = () => {
  // High Level State
  const [view, setView] = useState<ViewState>('landing');
  const [dashboardClaims, setDashboardClaims] = useState<ClaimState[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false); // Combined disclaimer + eligibility (legacy)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Wizard State
  const [step, setStep] = useState<Step>(Step.SOURCE);
  const [maxStepReached, setMaxStepReached] = useState<Step>(Step.SOURCE);
  const [claimData, setClaimData] = useState<ClaimState>(INITIAL_STATE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  
  // Refine State (Step 7)
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false); // For AI flow in Step 2

  // Accounting Integration State
  const [accountingConnection, setAccountingConnection] = useState<AccountingConnection | null>(null);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showXeroImporter, setShowXeroImporter] = useState(false);

  // Compliance Modal State
  const [showSoTModal, setShowSoTModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showLiPModal, setShowLiPModal] = useState(false);
  const [showAdvancedDocs, setShowAdvancedDocs] = useState(false);

  // Chat readiness state (AI determines when enough info is collected)
  const [canProceed, setCanProceed] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Phase 2: Inline interest verification (replaces InterestRateConfirmModal)
  const [hasVerifiedInterest, setHasVerifiedInterest] = useState(false);

  // AI Data Extraction State (for DATA_REVIEW step)
  const [extractedData, setExtractedData] = useState<ExtractedClaimData | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>('');
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(false);

  // Validation State
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [duplicateInvoiceWarning, setDuplicateInvoiceWarning] = useState<string | null>(null);
  const [showViabilityWarning, setShowViabilityWarning] = useState(false);
  const [viabilityIssues, setViabilityIssues] = useState<string[]>([]);
  const [hasAcknowledgedViability, setHasAcknowledgedViability] = useState(false);
  const [hasAcknowledgedLbaWarning, setHasAcknowledgedLbaWarning] = useState(false);
  const [lbaAlreadySent, setLbaAlreadySent] = useState(false); // Manual override: user confirms they already sent an LBA
  const [lbaSentDate, setLbaSentDate] = useState<string>(''); // Date when LBA was sent (for 30-day warning)
  const [chatError, setChatError] = useState<string | null>(null);

  // Helper to reset all wizard-specific state when starting/resuming a claim
  const resetWizardState = () => {
    setCanProceed(false);
    setHasVerifiedInterest(false);
    setExtractedData(null);
    setRecommendationReason('');
    setExtractedFields([]);
    setChatHistoryExpanded(false);
    setDateValidationError(null);
    setDuplicateInvoiceWarning(null);
    setShowViabilityWarning(false);
    setViabilityIssues([]);
    setHasAcknowledgedViability(false);
    setHasAcknowledgedLbaWarning(false);
    setLbaAlreadySent(false);
    setLbaSentDate('');
    setChatError(null);
    setIsEditingAnalysis(false);
    setIsFinalized(false);
  };

  // Initialize Nango on mount
  useEffect(() => {
    NangoClient.initialize();

    // Check if Xero is connected
    const checkXeroConnection = async () => {
      try {
        const connected = await NangoClient.isXeroConnected();
        if (connected) {
          const connection = NangoClient.getXeroConnection();
          setAccountingConnection(connection);
        }
      } catch (error) {
        console.warn('Failed to check Xero connection status:', error);
        // Connection check failed, user can reconnect via UI if needed
      }
    };
    checkXeroConnection();
  }, []);

  // Load data on mount
  useEffect(() => {
    // Load local claims and user profile async
    const loadData = async () => {
        const storedClaims = await getStoredClaims();
        setDashboardClaims(storedClaims);

        // Load user profile
        const profile = await getUserProfile();
        setUserProfile(profile);

        // If we have claims, auto-direct to dashboard for better UX
        if (storedClaims.length > 0) {
            setView('dashboard');
        }
    };
    loadData();
  }, []);

  // Validate API keys on mount
  useEffect(() => {
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const geminiKey = import.meta.env.VITE_API_KEY;

    if (!anthropicKey) {
      console.error('❌ ANTHROPIC_API_KEY not set. Document generation will fail.');
      console.log('📖 See .env.example for setup instructions');
      console.log('💡 Create a .env file with: VITE_ANTHROPIC_API_KEY=your_key_here');
    }

    if (!geminiKey) {
      console.error('❌ API_KEY (Gemini) not set. Evidence analysis will fail.');
      console.log('📖 See .env.example for setup instructions');
      console.log('💡 Create a .env file with: VITE_API_KEY=your_key_here');
    }

    if (anthropicKey && geminiKey) {
      console.log('✅ All API keys configured correctly');
    }
  }, []);

  // Cleanup old compliance logs monthly (GDPR compliance)
  useEffect(() => {
    const lastCleanup = localStorage.getItem('lastLogCleanup');
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    if (!lastCleanup || parseInt(lastCleanup) < monthAgo) {
      import('./services/complianceLogger').then(({ clearOldComplianceLogs }) => {
        clearOldComplianceLogs(12).then(count => {
          if (count > 0) {
            console.log(`🧹 Cleaned up ${count} compliance logs older than 12 months`);
          }
          localStorage.setItem('lastLogCleanup', Date.now().toString());
        }).catch(err => {
          console.warn('Compliance log cleanup failed (non-critical):', err);
        });
      });
    }
  }, []);

  // Listen for navigation events from CookieConsent and other components
  useEffect(() => {
    const handleNavigatePrivacy = () => setView('privacy');
    const handleNavigateTerms = () => setView('terms');

    window.addEventListener('navigate-privacy', handleNavigatePrivacy);
    window.addEventListener('navigate-terms', handleNavigateTerms);

    return () => {
      window.removeEventListener('navigate-privacy', handleNavigatePrivacy);
      window.removeEventListener('navigate-terms', handleNavigateTerms);
    };
  }, []);

  // Auto-save effect: Persist data whenever claimData changes while in wizard
  useEffect(() => {
    if (claimData.id && view === 'wizard') {
       const timer = setTimeout(async () => {
         await saveClaimToStorage({ ...claimData, lastModified: Date.now() });
         // Quietly update dashboard state to reflect changes
         const stored = await getStoredClaims();
         setDashboardClaims(stored);
       }, 1000);
       return () => clearTimeout(timer);
    }
  }, [claimData, view]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (view === 'wizard' && claimData.id) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [view, claimData.id]);

  // Helper to save claim immediately (used for critical transitions)
  const saveClaimImmediately = async () => {
    if (claimData.id) {
      await saveClaimToStorage({ ...claimData, lastModified: Date.now() });
      const stored = await getStoredClaims();
      setDashboardClaims(stored);
    }
  };

  // Check for duplicate invoice numbers
  useEffect(() => {
    if (claimData.invoice.invoiceNumber && dashboardClaims.length > 0) {
      const isUnique = validateUniqueInvoice(
        claimData.invoice.invoiceNumber,
        claimData.id,
        dashboardClaims
      );
      if (!isUnique) {
        setDuplicateInvoiceWarning(
          `Invoice "${claimData.invoice.invoiceNumber}" may already exist in another claim. Please verify this is not a duplicate.`
        );
      } else {
        setDuplicateInvoiceWarning(null);
      }
    } else {
      setDuplicateInvoiceWarning(null);
    }
  }, [claimData.invoice.invoiceNumber, claimData.id, dashboardClaims]);

  // Auto-populate timeline when entering Timeline step if empty but invoice data exists
  useEffect(() => {
    if (step === Step.TIMELINE && claimData.timeline.length === 0 && claimData.invoice.dateIssued) {
      const invoiceEvent: TimelineEvent = {
        date: claimData.invoice.dateIssued,
        description: `Invoice #${claimData.invoice.invoiceNumber || 'N/A'} sent for £${claimData.invoice.totalAmount?.toFixed(2) || '0.00'}`,
        type: 'invoice'
      };

      const events: TimelineEvent[] = [invoiceEvent];

      // Also add payment due date if we can calculate it
      if (claimData.invoice.paymentTermsDays) {
        const invoiceDate = new Date(claimData.invoice.dateIssued);
        invoiceDate.setDate(invoiceDate.getDate() + claimData.invoice.paymentTermsDays);
        const dueDateEvent: TimelineEvent = {
          date: invoiceDate.toISOString().split('T')[0],
          description: `Payment due (${claimData.invoice.paymentTermsDays} day terms)`,
          type: 'payment_due'
        };
        events.push(dueDateEvent);
      }

      setClaimData(prev => ({ ...prev, timeline: events }));
    }
  }, [step, claimData.timeline.length, claimData.invoice.dateIssued]);

  // --- Step Navigation Wrapper ---
  // Updates step and tracks the highest step reached for forward navigation after going back
  const handleStepChange = (newStep: Step) => {
    setStep(newStep);
    if (newStep > maxStepReached) {
      setMaxStepReached(newStep);
    }
  };

  // --- Navigation Handlers ---
  const handleStartNewClaim = async () => {
    // Check if user has completed onboarding
    const profile = userProfile || await getUserProfile();

    if (!profile) {
      // First-time user: show full onboarding flow
      setView('onboarding');
    } else {
      // Reset all wizard state for fresh claim
      resetWizardState();
      // Returning user: pre-fill claimant from profile and go to wizard
      const claimantFromProfile = profileToClaimantParty(profile);
      setClaimData({
        ...INITIAL_STATE,
        id: Math.random().toString(36).substr(2, 9),
        claimant: claimantFromProfile
      });
      setStep(Step.SOURCE);
      setMaxStepReached(Step.SOURCE);
      setView('wizard');
    }
  };

  // New onboarding flow complete handler
  const handleOnboardingFlowComplete = async (profile: UserProfile) => {
    await saveUserProfile(profile);
    setUserProfile(profile);

    // Reset all wizard state for fresh claim
    resetWizardState();
    // Start claim with pre-filled claimant
    const claimantFromProfile = profileToClaimantParty(profile);
    setClaimData({
      ...INITIAL_STATE,
      id: Math.random().toString(36).substr(2, 9),
      claimant: claimantFromProfile
    });
    setStep(Step.SOURCE);
    setMaxStepReached(Step.SOURCE);
    setView('wizard');
  };

  // Phase 2: Combined onboarding handlers (replaces disclaimer + eligibility flow) - LEGACY
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Reset all wizard state for fresh claim
    resetWizardState();
    setClaimData({ ...INITIAL_STATE, id: Math.random().toString(36).substr(2, 9) });
    setStep(Step.SOURCE);
    setMaxStepReached(Step.SOURCE);
    setView('wizard');
  };

  const handleOnboardingDecline = () => {
    setShowOnboarding(false);
    // User declined, stay on landing/dashboard
  };

  const handleResumeClaim = (claim: ClaimState) => {
    // Reset wizard state to avoid stale data from previous claim
    resetWizardState();
    setClaimData(claim);

    // Smart heuristic to jump to the correct step based on claim completeness
    let resumeStep: Step;
    if (claim.status === 'sent') {
      resumeStep = Step.PREVIEW;
      setIsFinalized(true);
    } else if (claim.generated) {
      resumeStep = Step.DRAFT;
    } else if (!claim.claimant.name || !claim.defendant.name || !claim.invoice.totalAmount) {
      // Missing essential party/invoice details
      resumeStep = Step.DETAILS;
    } else if (!claim.assessment) {
      // Ensure assessment is run before proceeding
      resumeStep = Step.DETAILS;
    } else if (claim.timeline.length < 1) {
      // Need at least the invoice event
      resumeStep = Step.TIMELINE;
    } else if (!claim.selectedDocType) {
       // No document selected yet - check if they are in consultation or need to start
       if (claim.chatHistory.length > 0) {
         resumeStep = Step.QUESTIONS;
       } else {
         resumeStep = Step.TIMELINE;
       }
    } else {
      // Has selected document type (from AI or manual skip)
      // Go to Data Review to verify details before Strategy
      resumeStep = Step.DATA_REVIEW;
    }
    setStep(resumeStep);
    setMaxStepReached(resumeStep);
    setView('wizard');
  };

  const handleDeleteClaim = async (id: string) => {
    try {
      await deleteClaimFromStorage(id);
      setDashboardClaims(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete claim:', error);
      setError('Failed to delete claim. Please try again.');
    }
  };

  // GDPR Data Management Handlers
  const handleExportAllData = async () => {
    try {
      const blob = await exportAllUserData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claimcraft-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      console.log('✅ Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleDeleteAllData = async () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will PERMANENTLY delete all your claims, settings, and connections.\n\n' +
      'This action CANNOT be undone.\n\n' +
      'Are you absolutely sure you want to delete all your data?'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(
      '🔴 FINAL CONFIRMATION\n\n' +
      'This is your last chance. All your claim data will be lost forever.\n\n' +
      'Click OK to permanently delete everything, or Cancel to go back.'
    );

    if (!doubleConfirm) return;

    try {
      await deleteAllUserData();
      setDashboardClaims([]);
      setAccountingConnection(null);
      setUserProfile(null); // Reset user profile
      setView('landing');
      alert('✅ All data has been permanently deleted. You will be redirected to the landing page.');
    } catch (error) {
      console.error('Failed to delete all data:', error);
      alert('Failed to delete data. Please try clearing your browser data manually.');
    }
  };

  // Xero Import Handlers
  const handleOpenAccountingModal = () => {
    setShowAccountingModal(true);
  };

  const handleAccountingConnectionChange = (connection: AccountingConnection | null) => {
    setAccountingConnection(connection);
  };

  const handleXeroImport = async (importedClaims: ClaimState[]) => {
    // Save all imported claims to storage
    for (const claim of importedClaims) {
      await saveClaimToStorage(claim);
    }

    // Reload claims from storage
    const storedClaims = await getStoredClaims();
    setDashboardClaims(storedClaims);

    // Close importer
    setShowXeroImporter(false);

    // Show success message (you could add a toast notification here)
    console.log(`✅ Successfully imported ${importedClaims.length} invoice(s) from Xero`);
  };

  const handleExitWizard = async () => {
    const timestampedClaim = { ...claimData, lastModified: Date.now() };

    // 1. Save to Storage
    await saveClaimToStorage(timestampedClaim);

    // 2. Update UI State
    const storedClaims = await getStoredClaims();
    setDashboardClaims(storedClaims);
    
    setView('dashboard');
  };

  const handleEnterApp = () => {
      setView('dashboard');
  };

  // --- Wizard Logic (Existing) ---
  useEffect(() => {
    if (view !== 'wizard') return;

    // Validate date relationship
    if (claimData.invoice.dateIssued && claimData.invoice.dueDate) {
      const dateValidation = validateDateRelationship(
        claimData.invoice.dateIssued,
        claimData.invoice.dueDate
      );
      if (!dateValidation.isValid) {
        setDateValidationError(dateValidation.error || 'Invalid date relationship');
      } else {
        setDateValidationError(null);
      }
    } else {
      setDateValidationError(null);
    }

    const interest = calculateInterest(
      claimData.invoice.totalAmount,
      claimData.invoice.dateIssued,
      claimData.invoice.dueDate,
      claimData.claimant.type,
      claimData.defendant.type
    );

    // Verify interest calculation
    if (interest.totalInterest > 0 && interest.daysOverdue > 0) {
      const isB2B = claimData.claimant.type === PartyType.BUSINESS && claimData.defendant.type === PartyType.BUSINESS;
      const rate = isB2B ? LATE_PAYMENT_ACT_RATE : 8.0;
      const interestValidation = validateInterestCalculation(
        claimData.invoice.totalAmount,
        rate,
        interest.daysOverdue,
        interest.totalInterest
      );
      if (!interestValidation.isValid) {
        console.warn('Interest calculation discrepancy:', interestValidation.error);
      }
    }

    const compensation = calculateCompensation(
        claimData.invoice.totalAmount,
        claimData.claimant.type,
        claimData.defendant.type
    );
    // Court fee should be based on total claim value (principal + interest + compensation)
    const totalClaim = claimData.invoice.totalAmount + interest.totalInterest + compensation;
    const courtFee = calculateCourtFee(totalClaim);
    setClaimData(prev => ({ ...prev, interest, courtFee, compensation }));
  }, [
      claimData.invoice.totalAmount,
      claimData.invoice.dateIssued,
      claimData.invoice.dueDate,
      claimData.claimant.type,
      claimData.defendant.type,
      view
  ]);

  // Reset viability acknowledgment when key claim data changes
  // This ensures users must re-acknowledge viability issues if they modify critical fields
  useEffect(() => {
    if (hasAcknowledgedViability) {
      setHasAcknowledgedViability(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    claimData.invoice.totalAmount,
    claimData.claimant.type,
    claimData.claimant.name,
    claimData.defendant.type,
    claimData.defendant.name,
    claimData.defendant.solvencyStatus
  ]);

  const calculateInterest = (
    amount: number,
    dateIssued: string,
    dueDate: string | undefined,
    claimantType: PartyType,
    defendantType: PartyType
  ): InterestData => {
    if (!dateIssued || !amount) {
      return {
        daysOverdue: 0,
        dailyRate: 0,
        totalInterest: 0
      };
    }

    // Determine the payment due date
    // If dueDate is provided, use it. Otherwise, assume default payment terms.
    let paymentDue: Date;
    if (dueDate) {
      paymentDue = new Date(dueDate);
    } else {
      // Fallback: invoice date + default payment terms
      paymentDue = new Date(dateIssued);
      paymentDue.setDate(paymentDue.getDate() + DEFAULT_PAYMENT_TERMS_DAYS);
    }

    const now = new Date();
    const diffTime = now.getTime() - paymentDue.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    // CRITICAL FIX: Use correct interest rate based on party types
    // B2B = Late Payment of Commercial Debts (Interest) Act 1998 (BoE + 8% = 12.75%)
    // B2C = County Courts Act 1984 s.69 (8% per annum)
    const isB2B = claimantType === PartyType.BUSINESS && defendantType === PartyType.BUSINESS;
    const interestRate = isB2B ? LATE_PAYMENT_ACT_RATE : 8.0; // 12.75% for B2B, 8% for B2C

    const annualRate = interestRate / 100;
    const dailyRate = (amount * annualRate) / DAILY_INTEREST_DIVISOR;
    const totalInterest = dailyRate * daysOverdue;

    return {
      daysOverdue,
      dailyRate: parseFloat(dailyRate.toFixed(4)),
      totalInterest: parseFloat(totalInterest.toFixed(2))
    };
  };

  const updateClaimant = (p: Party) => setClaimData(prev => ({ ...prev, claimant: p }));
  const updateDefendant = (d: Party) => setClaimData(prev => ({ ...prev, defendant: d }));
  const updateInvoice = (field: string, val: string | number) => 
    setClaimData(prev => ({ ...prev, invoice: { ...prev.invoice, [field]: val } }));
  const updateTimeline = (events: TimelineEvent[]) => 
    setClaimData(prev => ({ ...prev, timeline: events }));

  const handleEvidenceAnalysis = async () => {
    if (claimData.evidence.length === 0) return;
    setIsProcessing(true);
    setProcessingText("Classifying & Analyzing Documents...");
    try {
        const result = await analyzeEvidence(claimData.evidence);
        
        // Update evidence with classifications
        const updatedEvidence = claimData.evidence.map((file, idx) => {
           // Simple match by index if names don't match, or try name matching
           // The AI returns a list. We try to map by name or fall back to order.
           const match = result.classifications?.find(c => c.fileName === file.name) 
                      || result.classifications?.[idx];
           
           return match ? { ...file, classification: match.type } : { ...file, classification: "Unclassified" };
        });

        // Merge AI results with existing data
        const mergedClaimant = { ...claimData.claimant, ...result.claimant };
        const mergedDefendant = { ...claimData.defendant, ...result.defendant };

        // Infer county from postcode if AI didn't return it
        if (!mergedClaimant.county && mergedClaimant.postcode) {
          mergedClaimant.county = getCountyFromPostcode(mergedClaimant.postcode);
        }
        if (!mergedDefendant.county && mergedDefendant.postcode) {
          mergedDefendant.county = getCountyFromPostcode(mergedDefendant.postcode);
        }

        let newState = {
          ...claimData,
          evidence: updatedEvidence,
          source: 'upload' as const,
          claimant: mergedClaimant,
          defendant: mergedDefendant,
          invoice: { ...claimData.invoice, ...result.invoice },
          timeline: result.timelineEvents || []
        };
        if(newState.timeline.length === 0 && newState.invoice.dateIssued) {
           newState.timeline.push({
             date: newState.invoice.dateIssued,
             description: `Invoice ${newState.invoice.invoiceNumber} sent`,
             type: 'invoice'
           });
        }
        if (newState.defendant.type === PartyType.BUSINESS && newState.defendant.name) {
            const companyDetails = await searchCompaniesHouse(newState.defendant.name);
            if (companyDetails) newState.defendant = { ...newState.defendant, ...companyDetails };
        }
        setClaimData(newState);
        handleStepChange(Step.DETAILS);
        setIsEditingAnalysis(false);
    } catch (err) {
        setError("Failed to analyze documents. Please ensure they are legible.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    setClaimData(prev => ({ ...prev, source: 'manual' }));
    handleStepChange(Step.DETAILS);
  };

  const handleLegacyXeroImport = async (importedData: Partial<ClaimState>) => {
    const mergedClaimant = (claimData.claimant.name && claimData.claimant.name.length > 0)
      ? claimData.claimant
      : { ...claimData.claimant, ...importedData.claimant };
    const mergedDefendant = { ...claimData.defendant, ...importedData.defendant };
    const mergedTimeline = [...(claimData.timeline || []), ...(importedData.timeline || [])];

    // Infer county from postcode if not set (Xero often doesn't have UK county data)
    if (!mergedClaimant.county && mergedClaimant.postcode) {
      mergedClaimant.county = getCountyFromPostcode(mergedClaimant.postcode);
    }
    if (!mergedDefendant.county && mergedDefendant.postcode) {
      mergedDefendant.county = getCountyFromPostcode(mergedDefendant.postcode);
    }

    let newState = {
      ...claimData,
      ...importedData,
      claimant: mergedClaimant,
      defendant: mergedDefendant,
      timeline: mergedTimeline
    };
    setIsProcessing(true);
    setProcessingText("Enriching Xero Data...");
    try {
       if (newState.defendant.type === PartyType.BUSINESS && newState.defendant.name) {
          const companyDetails = await searchCompaniesHouse(newState.defendant.name);
          if (companyDetails) newState.defendant = { ...newState.defendant, ...companyDetails };
       }
    } finally {
       setIsProcessing(false);
    }
    setClaimData(newState as ClaimState);
    handleStepChange(Step.DETAILS);
    setIsEditingAnalysis(false);
  };

  const handleBulkImport = async (claims: ClaimState[]) => {
    setIsProcessing(true);
    setProcessingText(`Importing ${claims.length} claims...`);
    
    // Enrich with Companies House if possible
    const enrichedClaims: ClaimState[] = [];
    
    // Process in chunks or parallel if needed, for now sequential for safety
    for (const claim of claims) {
        let processed = { ...claim };
        if (processed.defendant.type === PartyType.BUSINESS && processed.defendant.name) {
             try {
                const details = await searchCompaniesHouse(processed.defendant.name);
                if (details) {
                    processed.defendant = { ...processed.defendant, ...details };
                }
             } catch (e) {
                 // fail silently for bulk import enrichment
             }
        }
        
        // Calculate fees
        const interest = calculateInterest(processed.invoice.totalAmount, processed.invoice.dateIssued, processed.invoice.dueDate, processed.claimant.type, processed.defendant.type);
        const compensation = calculateCompensation(processed.invoice.totalAmount, processed.claimant.type, processed.defendant.type);
        const totalClaim = processed.invoice.totalAmount + interest.totalInterest + compensation;
        const courtFee = calculateCourtFee(totalClaim);
        
        processed = {
            ...processed,
            interest,
            compensation,
            courtFee,
            // If overdue, update status (unless it was already something advanced like 'court')
            status: (interest.daysOverdue > 0 && ['draft', 'overdue'].includes(processed.status)) ? 'overdue' : processed.status
        };

        await saveClaimToStorage(processed);
        enrichedClaims.push(processed);
    }

    const stored = await getStoredClaims();
    setDashboardClaims(stored);
    setIsProcessing(false);
    setShowCsvModal(false);
    
    // If only 1 imported, open it directly
    if (claims.length === 1) {
        handleResumeClaim(enrichedClaims[0]);
    } else {
        setView('dashboard');
    }
  };

  const runAssessment = async () => {
    setIsProcessing(true);
    setProcessingText("Running Legal Judgment Agent...");

    // 1. Basic Rules Assessment
    const assessment = assessClaimViability(claimData);

    // AI Assessment removed from here - moved to post-chat (handleContinueFromChat)
    // We only init the structure here so the UI doesn't break
    assessment.strengthAnalysis = "Pending AI consultation..."; 

    setClaimData(prev => ({ ...prev, assessment }));
    setIsProcessing(false);

    // Check for viability issues and show blocking modal if needed
    if (!assessment.isViable && !hasAcknowledgedViability) {
      const issues: Array<{ type: 'statute_barred' | 'defendant_dissolved' | 'exceeds_track' | 'other'; message: string }> = [];

      // Check for specific viability issues
      if (assessment.checks) {
        const limitationCheck = assessment.checks.find((c: any) => c.name === 'Limitation Act 1980');
        if (limitationCheck && !limitationCheck.passed) {
          issues.push({
            type: 'statute_barred',
            message: 'This claim may be statute-barred under the Limitation Act 1980. Claims for breach of contract must generally be brought within 6 years of the cause of action.'
          });
        }

        const solvencyCheck = assessment.checks.find((c: any) => c.name === 'Solvency Check');
        if (solvencyCheck && !solvencyCheck.passed) {
          issues.push({
            type: 'defendant_dissolved',
            message: 'The defendant company appears to be dissolved, in liquidation, or insolvent. Recovery may be impossible or severely limited.'
          });
        }

        const valueCheck = assessment.checks.find((c: any) => c.name === 'Claim Value Check');
        if (valueCheck && !valueCheck.passed) {
          issues.push({
            type: 'exceeds_track',
            message: 'This claim exceeds the Small Claims Track limit of £10,000. You may need legal representation and costs will be significantly higher.'
          });
        }
      }

      // Generic issue if no specific ones found
      if (issues.length === 0) {
        issues.push({
          type: 'other',
          message: 'The claim has failed viability checks. Please review the assessment details for more information.'
        });
      }

      setViabilityIssues(issues);
      setShowViabilityWarning(true);
    } else {
      // If viable (or no critical issues), proceed to Assessment Report step
      handleStepChange(Step.VIABILITY);
    }
  };

  const handleStartChat = async () => {
    setIsProcessing(true);
    setProcessingText("Initializing Legal Assistant...");
    setCanProceed(false); // Reset proceed state when starting new chat
    setChatError(null);
    handleStepChange(Step.QUESTIONS);

    // If chat is empty, seed it with the initial analysis
    if (claimData.chatHistory.length === 0) {
        try {
            const initialMsg = await startClarificationChat(claimData);
            const newMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'ai',
                content: initialMsg,
                timestamp: Date.now()
            };
            setClaimData(prev => ({ ...prev, chatHistory: [newMsg] }));
        } catch (e) {
            setError("Failed to start chat.");
        }
    }
    setIsProcessing(false);
  };

  // Skip AI consultation and go directly to Data Review with manual defaults
  const handleSkipAIConsultation = () => {
    // Defensive check: require at least one timeline entry
    if (claimData.timeline.length < 1) {
      setError('Please add at least one timeline event before proceeding.');
      return;
    }

    // Set defaults for data that AI would have extracted
    setExtractedData(null);
    setRecommendationReason('Manual entry - AI consultation skipped');
    setExtractedFields([]);

    // Determine document type based on LBA status
    const timelineHasLBA = claimData.timeline.some(e =>
      e.type === 'lba_sent' ||
      (e.type === 'chaser' &&
        (e.description.toLowerCase().includes('letter before action') ||
         e.description.toLowerCase().includes('lba') ||
         e.description.toLowerCase().includes('formal demand')))
    );
    const hasLBA = timelineHasLBA || lbaAlreadySent;

    // Set default document type based on LBA status
    setClaimData(prev => ({
      ...prev,
      selectedDocType: hasLBA ? DocumentType.FORM_N1 : DocumentType.LBA
    }));

    // Skip to Data Review
    handleStepChange(Step.DATA_REVIEW);
  };

  const handleSendMessage = async (text: string) => {
      setChatError(null);
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
      const updatedHistory = [...claimData.chatHistory, userMsg];
      setClaimData(prev => ({ ...prev, chatHistory: updatedHistory }));

      setIsProcessing(true);
      try {
         const response = await sendChatMessage(updatedHistory, text, claimData);
         const aiMsg: ChatMessage = {
             id: (Date.now() + 1).toString(),
             role: 'ai',
             content: response.message,
             timestamp: Date.now(),
             readyToProceed: response.readyToProceed,
             collected: response.collected
         };
         setClaimData(prev => ({ ...prev, chatHistory: [...updatedHistory, aiMsg] }));

         // Update canProceed based on AI's signal
         if (response.readyToProceed) {
           setCanProceed(true);
         }
      } catch (e) {
         console.error(e);
         setChatError("Failed to get a response. Please check your connection and try again.");
      } finally {
         setIsProcessing(false);
      }
  };

  // Handle transition from chat to data review
  const handleContinueFromChat = async () => {
    setIsProcessing(true);
    setProcessingText("Analyzing conversation...");

    try {
      // Extract structured data from chat
      const extracted = await extractDataFromChat(claimData.chatHistory, claimData);

      // Store extraction results
      setExtractedData(extracted);
      setRecommendationReason(extracted.documentReason);
      setExtractedFields(extracted.extractedFields);

      // Merge extracted data with existing data (don't overwrite user-entered data)
      setClaimData(prev => {
        const merged = { ...prev };

        // Merge claimant data (only fill empty fields)
        if (extracted.claimant) {
          merged.claimant = {
            ...prev.claimant,
            county: prev.claimant.county || extracted.claimant.county || prev.claimant.county,
            address: prev.claimant.address || extracted.claimant.address || prev.claimant.address,
            city: prev.claimant.city || extracted.claimant.city || prev.claimant.city,
            postcode: prev.claimant.postcode || extracted.claimant.postcode || prev.claimant.postcode,
            name: prev.claimant.name || extracted.claimant.name || prev.claimant.name,
          };
        }

        // Merge defendant data (only fill empty fields)
        if (extracted.defendant) {
          merged.defendant = {
            ...prev.defendant,
            county: prev.defendant.county || extracted.defendant.county || prev.defendant.county,
            address: prev.defendant.address || extracted.defendant.address || prev.defendant.address,
            city: prev.defendant.city || extracted.defendant.city || prev.defendant.city,
            postcode: prev.defendant.postcode || extracted.defendant.postcode || prev.defendant.postcode,
            name: prev.defendant.name || extracted.defendant.name || prev.defendant.name,
          };
        }

        // Merge invoice data (only fill empty fields)
        if (extracted.invoice) {
          merged.invoice = {
            ...prev.invoice,
            invoiceNumber: prev.invoice.invoiceNumber || extracted.invoice.invoiceNumber || '',
            totalAmount: prev.invoice.totalAmount || extracted.invoice.totalAmount || 0,
            dateIssued: prev.invoice.dateIssued || extracted.invoice.dateIssued || '',
            dueDate: prev.invoice.dueDate || extracted.invoice.dueDate || '',
            description: prev.invoice.description || extracted.invoice.description || '',
          };
        }

        // Merge timeline events (add new ones)
        if (extracted.timeline && extracted.timeline.length > 0) {
          const existingDates = prev.timeline.map(e => e.date);
          const newEvents = extracted.timeline.filter(e => !existingDates.includes(e.date));
          merged.timeline = [...prev.timeline, ...newEvents];
        }

        // Set recommended document type
        merged.selectedDocType = extracted.recommendedDocument;

        return merged;
      });

      // 2. AI Strength Assessment (MOVED HERE from before chat)
      try {
         const aiStrength = await getClaimStrengthAssessment(claimData);
         setClaimData(prev => ({
            ...prev,
            assessment: {
                ...prev.assessment!, // Keep existing rules-based checks
                strength: aiStrength.strength, // Update AI opinion
                strengthAnalysis: aiStrength.analysis,
                weaknesses: aiStrength.weaknesses
            }
         }));
      } catch (e) {
         console.error("AI Assessment failed", e);
      }

      handleStepChange(Step.DATA_REVIEW);
    } catch (error) {
      console.error('Extraction failed:', error);
      // Fallback: go to data review anyway with existing data
      handleStepChange(Step.DATA_REVIEW);
    } finally {
      setIsProcessing(false);
      setProcessingText("");
    }
  };

  // Pre-validation before document generation
  const validateClaimData = (data: ClaimState): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validate Claimant
    if (!data.claimant.name.trim()) {
      errors.push("Claimant name is required");
    }
    if (!data.claimant.address.trim()) {
      errors.push("Claimant address is required");
    }
    if (!data.claimant.city.trim()) {
      errors.push("Claimant town/city is required");
    }
    if (!data.claimant.postcode.trim()) {
      errors.push("Claimant postcode is required");
    }
    if (!data.claimant.county.trim()) {
      errors.push("Claimant county is required");
    }

    // Validate Defendant
    if (!data.defendant.name.trim()) {
      errors.push("Defendant name is required");
    }
    if (!data.defendant.address.trim()) {
      errors.push("Defendant address is required");
    }
    if (!data.defendant.city.trim()) {
      errors.push("Defendant town/city is required");
    }
    if (!data.defendant.postcode.trim()) {
      errors.push("Defendant postcode is required");
    }
    if (!data.defendant.county.trim()) {
      errors.push("Defendant county is required");
    }

    // Validate Invoice
    if (!data.invoice.invoiceNumber.trim()) {
      errors.push("Invoice number is required");
    }
    if (!data.invoice.dateIssued) {
      errors.push("Invoice date is required");
    }
    if (data.invoice.totalAmount <= 0) {
      errors.push("Invoice amount must be greater than £0");
    }

    // Validate Timeline
    if (!data.timeline || data.timeline.length === 0) {
      errors.push("At least one timeline event is required");
    }

    // Check for LBA requirement on court documents (Pre-Action Protocol compliance)
    const courtDocuments = [
      DocumentType.FORM_N1,
      DocumentType.DEFAULT_JUDGMENT,
      DocumentType.DIRECTIONS_QUESTIONNAIRE,
      DocumentType.DEFENCE_RESPONSE,
      DocumentType.TRIAL_BUNDLE,
      DocumentType.SKELETON_ARGUMENT
    ];

    if (courtDocuments.includes(data.selectedDocType)) {
      const hasLBA = data.timeline?.some(event => event.type === 'lba_sent');
      if (!hasLBA) {
        errors.push("Letter Before Action (LBA) required before court proceedings - add an LBA event to your timeline or generate an LBA document first");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleDraftClaim = async () => {
    // Pre-validate claim data
    const validation = validateClaimData(claimData);
    if (!validation.isValid) {
      const errorMessage = `Cannot generate document. Please fix the following:\n\n${validation.errors.map(e => `• ${e}`).join('\n')}`;
      setError(errorMessage);
      return;
    }

    // Define the actual generation function
    const proceedWithGeneration = async () => {
      setIsProcessing(true);
      setProcessingText(`Generating ${claimData.selectedDocType}...`);
      try {
        // Use new DocumentBuilder with template + AI hybrid approach
        const result = await DocumentBuilder.generateDocument(claimData);
        setClaimData(prev => ({ ...prev, generated: result }));
        handleStepChange(Step.DRAFT);

        // Show validation warnings to user if any
        if (result.validation?.warnings && result.validation.warnings.length > 0) {
          console.warn('Document warnings:', result.validation.warnings);
        }
      } catch (e: any) {
        setError(e.message || "Document generation failed. Please check your data and try again.");
        console.error('Draft generation error:', e);
      } finally {
        setIsProcessing(false);
      }
    };

    // Phase 2: Check inline interest verification (replaces modal)
    if (!hasVerifiedInterest) {
      setError("Please verify the interest rate calculation before generating documents.");
      return;
    }

    // COMPLIANCE MODAL FLOW:
    // 1. Interest Rate Confirmation - NOW INLINE (Phase 2 UX improvement)
    // 2. Litigant in Person Warning (N1 only) - Still modal
    // 3. Statement of Truth Warning (N1, N225, N225A - shown later in signature step)

    // If N1, show LiP modal before generation
    if (claimData.selectedDocType === DocumentType.FORM_N1) {
      setPendingAction(() => proceedWithGeneration);
      setShowLiPModal(true);
    } else {
      // Otherwise, proceed directly
      await proceedWithGeneration();
    }
  };
  
  const handleRefineDraft = async () => {
     if (!refineInstruction || !claimData.generated) return;

     setIsProcessing(true);
     try {
        // Use new DocumentBuilder.refineDocument with validation
        const refined = await DocumentBuilder.refineDocument(
          claimData.generated.content,
          refineInstruction,
          claimData
        );
        setClaimData(prev => ({
            ...prev,
            generated: { ...prev.generated!, content: refined }
        }));
        setRefineInstruction('');
        setShowRefineInput(false);
     } catch (e) {
        console.error("Refinement failed:", e);
        setError("Failed to refine document. Please try again.");
     } finally {
        setIsProcessing(false);
     }
  };

  const handlePrePreview = async () => {
    // Validation is now built into DocumentBuilder.generateDocument()
    // So we can go straight to preview
    setIsFinalized(false);
    handleStepChange(Step.PREVIEW);
  };

  const handleConfirmDraft = async () => {
      const updatedClaim = { ...claimData, status: 'review' as const };
      setClaimData(updatedClaim);
      setIsFinalized(true);
      // Auto save on confirm
      await saveClaimToStorage(updatedClaim);
      
      // Update dashboard state immediately so it's reflected if they exit
      const stored = await getStoredClaims();
      setDashboardClaims(stored);
  };

  const renderWizardStep = () => {
      switch (step) {
      case Step.SOURCE: {
        // Check if claim already has data (source is set, or has invoice data)
        const hasExistingData = claimData.source !== 'none' || claimData.invoice.totalAmount > 0 || claimData.defendant.name;

        return (
          <div className="max-w-3xl mx-auto animate-fade-in py-8">
             {/* Header */}
             <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">
                  {hasExistingData ? 'Evidence & Documents' : 'New Claim'}
                </h2>
                <p className="text-slate-500">
                  {hasExistingData
                    ? 'Upload supporting evidence for your claim.'
                    : 'Import your claim data or enter manually.'}
                </p>
             </div>

             {/* Option Cards - only show if no existing data */}
             {!hasExistingData && (
               <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={handleOpenAccountingModal}
                    className={`p-6 rounded-xl transition-all flex flex-col items-center gap-3 border hover:shadow-md hover:border-teal-300 ${
                      accountingConnection ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'
                    }`}
                  >
                      <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-teal-500"/>
                      </div>
                      <div className="text-center">
                         <span className="block font-semibold text-slate-900">{accountingConnection ? "Import from " + accountingConnection.provider : "Connect Accounting"}</span>
                         <span className="text-sm text-slate-500 mt-1 block">{accountingConnection ? `${accountingConnection.organizationName}` : "Xero, QuickBooks & more"}</span>
                      </div>
                  </button>

                  <button
                    onClick={handleManualEntry}
                    className="p-6 bg-white border border-slate-200 hover:border-teal-300 rounded-xl transition-all flex flex-col items-center gap-3 hover:shadow-md"
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

             {/* Evidence Locker Section */}
             <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Evidence Locker</h3>
                <p className="text-slate-500 text-center text-sm mb-6">
                  {hasExistingData
                    ? 'Add contracts, emails, or other documents to strengthen your claim.'
                    : 'Upload your Invoices, Contracts, and Emails (PDFs or Images). Gemini will analyze the entire bundle.'}
                </p>

                <EvidenceUpload
                  files={claimData.evidence}
                  onAddFiles={(newFiles) => setClaimData(prev => ({...prev, evidence: [...prev.evidence, ...newFiles]}))}
                  onRemoveFile={(idx) => setClaimData(prev => ({...prev, evidence: prev.evidence.filter((_, i) => i !== idx)}))}
                  onAnalyze={hasExistingData ? undefined : handleEvidenceAnalysis}
                  isProcessing={isProcessing}
                />
             </div>

             {/* Continue button when claim already has data */}
             {hasExistingData && (
               <div className="mt-6 flex justify-end">
                 <button
                   onClick={() => handleStepChange(Step.DETAILS)}
                   className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-1"
                 >
                   Continue to Claim Details
                   <ArrowRight className="w-5 h-5" />
                 </button>
               </div>
             )}
          </div>
        );
      }
      
      case Step.DETAILS:
        // Logic: If Source is Manual OR User has clicked "Edit Analysis", show full form.
        // Otherwise show Analysis Summary.
        if (claimData.source === 'manual' || isEditingAnalysis) {
            return (
                <div className="space-y-8 animate-fade-in py-10 max-w-5xl mx-auto pb-32">
                    <button
                      onClick={() => handleStepChange(Step.SOURCE)}
                      className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Data Source
                    </button>
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 font-display mb-4">Claim Details</h2>
                        <p className="text-slate-500">Please ensure all details are correct before legal assessment.</p>
                    </div>
                    <div className="grid xl:grid-cols-2 gap-8">
                        <PartyForm title="Claimant (You)" party={claimData.claimant} onChange={updateClaimant} />
                        <PartyForm title="Defendant (Debtor)" party={claimData.defendant} onChange={updateDefendant} />
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 font-display">Claim Financials</h2>
                            <Tooltip content="Enter the invoice amount and dates to calculate statutory interest and court fees automatically">
                              <div className="cursor-help">
                                <HelpCircle className="w-4 h-4 text-slate-400 hover:text-blue-600" />
                              </div>
                            </Tooltip>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <Input
                              label="Principal Amount (£)"
                              type="number"
                              icon={<PoundSterling className="w-4 h-4" />}
                              value={claimData.invoice.totalAmount}
                              onChange={(e) => updateInvoice('totalAmount', parseFloat(e.target.value))}
                              required
                              helpText="The original unpaid invoice amount (excluding interest/compensation)"
                              placeholder="e.g. 5000.00"
                            />
                            <Input
                              label="Invoice Reference"
                              type="text"
                              icon={<FileText className="w-4 h-4" />}
                              value={claimData.invoice.invoiceNumber}
                              onChange={(e) => updateInvoice('invoiceNumber', e.target.value)}
                              required
                              helpText="Your invoice number for reference"
                              placeholder="e.g. INV-2024-001"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                              label="Invoice Date"
                              type="date"
                              icon={<Calendar className="w-4 h-4" />}
                              value={claimData.invoice.dateIssued}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                updateInvoice('dateIssued', newDate);
                                // Auto-fill due date (+30 days) if empty
                                if (!claimData.invoice.dueDate && newDate) {
                                  const d = new Date(newDate);
                                  d.setDate(d.getDate() + 30);
                                  updateInvoice('dueDate', d.toISOString().split('T')[0]);
                                }
                              }}
                              required
                              helpText="When you issued the invoice"
                            />
                            <Input
                              label="Payment Due Date"
                              type="date"
                              icon={<Calendar className="w-4 h-4" />}
                              value={claimData.invoice.dueDate}
                              onChange={(e) => updateInvoice('dueDate', e.target.value)}
                              helpText={`Leave blank to use ${DEFAULT_PAYMENT_TERMS_DAYS}-day payment terms`}
                            />
                        </div>
                        {/* Date validation error */}
                        {dateValidationError && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-red-900 text-sm">Date Validation Issue</h4>
                              <p className="text-red-800 text-sm mt-1">{dateValidationError}</p>
                            </div>
                          </div>
                        )}
                        {/* Duplicate invoice warning */}
                        {duplicateInvoiceWarning && (
                          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-bold text-amber-900 text-sm">Possible Duplicate</h4>
                              <p className="text-amber-800 text-sm mt-1">{duplicateInvoiceWarning}</p>
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Sticky Footer for Actions */}
                    <div className="fixed bottom-0 right-0 left-0 md:left-72 bg-dark-800/95 backdrop-blur-md border-t border-dark-700 p-4 z-30 flex justify-end pr-8 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                        <button onClick={runAssessment} disabled={!claimData.invoice.totalAmount || !claimData.claimant.name || !claimData.defendant.name || !claimData.invoice.dateIssued} className="bg-teal-600 hover:bg-teal-500 text-white px-12 py-4 rounded-xl shadow-lg font-bold text-lg flex items-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 hover:shadow-teal-500/25 hover:shadow-xl">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <>Assess Claim Strength <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </div>
                </div>
            );
        } else {
            // AI/Xero Analysis Summary View
            return (
                <div className="max-w-3xl mx-auto animate-fade-in py-10">
                    <button
                      onClick={() => handleStepChange(Step.SOURCE)}
                      className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Data Source
                    </button>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                        <div><h2 className="text-3xl font-bold text-slate-900 font-display">Analysis Complete</h2><p className="text-slate-600">We've extracted the key facts. Please verify.</p></div>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-left mb-8 relative overflow-hidden">
                        <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Creditor</span><p className="font-bold text-lg text-slate-900">{claimData.claimant.name || "Unknown"}</p><p className="text-sm text-slate-500">{claimData.claimant.city}</p></div>
                            <div className="text-right p-4 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Debtor</span><p className="font-bold text-lg text-slate-900">{claimData.defendant.name || "Unknown"}</p></div>
                        </div>
                        <div className="border-t border-slate-100 pt-6 flex justify-between items-center relative z-10">
                            <div><span className="text-xs font-bold text-slate-400 uppercase block tracking-wide">Claim Value</span><span className="text-3xl font-bold text-slate-900 font-display">£{claimData.invoice.totalAmount.toFixed(2)}</span></div>
                            <button onClick={() => setIsEditingAnalysis(true)} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"><Pencil className="w-3 h-3" /> Edit Details</button>
                        </div>
                    </div>
                    <div className="flex justify-end"><button onClick={runAssessment} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 transition-all transform hover:-translate-y-0.5">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <>Run Legal Viability Check <ArrowRight className="w-5 h-5"/></>}
                    </button></div>
                </div>
            );
        }

      case Step.VIABILITY:
        return (
            <div className="py-10 pb-32">
                <div className="max-w-4xl mx-auto mb-6">
                    <button
                        onClick={() => handleStepChange(Step.DETAILS)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Details
                    </button>
                </div>
                {claimData.assessment && (
                    <AssessmentReport
                        assessment={claimData.assessment}
                        onContinue={() => handleStepChange(Step.TIMELINE)}
                    />
                )}
            </div>
        );

      case Step.TIMELINE:
        return (
            <div className="space-y-8 py-10 pb-32">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => handleStepChange(Step.VIABILITY)}
                        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Assessment
                    </button>
                </div>
                <TimelineBuilder
                    events={claimData.timeline}
                    onChange={(newEvents) => {
                      updateTimeline(newEvents);
                      
                      // Auto-detect LBA sent from timeline events
                      const lbaEvent = newEvents.find(e => 
                        e.type === 'lba_sent' || 
                        (e.type === 'chaser' && e.description.toLowerCase().includes('letter before action'))
                      );
                      
                      if (lbaEvent) {
                        setLbaAlreadySent(true);
                        setLbaSentDate(lbaEvent.date);
                      }
                    }}
                    invoiceDate={claimData.invoice.dateIssued}
                />

                {/* Timeline validation warning */}
                {claimData.timeline.length === 0 && (
                  <div className="max-w-4xl mx-auto bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-sm">Timeline Empty</h4>
                      <p className="text-amber-800 text-sm mt-1">
                        Add at least the invoice date to proceed. Additional events (chaser emails, phone calls) strengthen your claim.
                      </p>
                    </div>
                  </div>
                )}

                {/* LBA Status Check - Moved here for earlier capture */}
                <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={lbaAlreadySent}
                      onChange={(e) => {
                        setLbaAlreadySent(e.target.checked);
                        if (!e.target.checked) setLbaSentDate('');
                        
                        // If unchecked, should we remove LBA event? 
                        // For now, let's just sync the state. Users can delete the event manually if needed.
                        if (e.target.checked && !lbaSentDate) {
                           // If checked manually without a date, default to today or let them pick
                           setLbaSentDate(new Date().toISOString().split('T')[0]);
                        }
                      }}
                      className="mt-1 w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                        I have already sent a Letter Before Action (LBA)
                      </span>
                      <p className="text-sm text-slate-500 mt-1">
                        An LBA is a formal demand letter giving the debtor typically 30 days to pay before court action.
                        If you've already sent one, check this box.
                      </p>
                    </div>
                  </label>

                  {lbaAlreadySent && (
                    <div className="mt-4 pl-8 space-y-3 animate-fade-in">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Date LBA was sent
                        </label>
                        <input
                          type="date"
                          value={lbaSentDate}
                          onChange={(e) => setLbaSentDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full max-w-xs px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                      {lbaSentDate && (() => {
                        const daysSince = Math.floor((Date.now() - new Date(lbaSentDate).getTime()) / (1000 * 60 * 60 * 24));
                        const isReady = daysSince >= 30;
                        return (
                          <div className={`flex items-center gap-2 text-sm ${isReady ? 'text-teal-600' : 'text-amber-600'}`}>
                            {isReady ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>{daysSince} days since LBA - you can proceed with court action</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4" />
                                <span>{daysSince} days since LBA - wait {30 - daysSince} more days for compliance</span>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Sticky Footer for Actions */}
                <div className="fixed bottom-0 right-0 left-0 md:left-72 bg-dark-800/95 backdrop-blur-md border-t border-dark-700 p-4 z-30 flex justify-end pr-8 gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                    {/* Optional: Skip AI for power users */}
                    <button
                        onClick={handleSkipAIConsultation}
                        disabled={claimData.timeline.length < 1}
                        className="text-slate-400 hover:text-white text-sm font-medium flex items-center justify-center gap-2 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Skip AI Consultation
                        <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => handleStartChat()}
                        disabled={claimData.timeline.length < 1}
                        className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl disabled:bg-slate-600 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 font-medium shadow-lg transform hover:-translate-y-1 hover:shadow-teal-500/25 hover:shadow-xl"
                    >
                        <MessageSquareText className="w-5 h-5"/>
                        Start AI Case Consultation
                        <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        );

      case Step.QUESTIONS:
        return (
          <ChatInterface
            messages={claimData.chatHistory}
            onSendMessage={handleSendMessage}
            onComplete={handleContinueFromChat}
            isThinking={isProcessing}
            canProceed={canProceed}
            error={chatError}
          />
        );

      case Step.DATA_REVIEW: {
        // Show extracted data for review before proceeding to document selection
        const showChatHistory = claimData.chatHistory.length > 0;
        const aiWasSkipped = !showChatHistory || extractedFields.length === 0;

        return (
          <div className="space-y-6 animate-fade-in py-10 max-w-5xl mx-auto pb-32">
            <button
              onClick={() => handleStepChange(aiWasSkipped ? Step.TIMELINE : Step.QUESTIONS)}
              className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {aiWasSkipped ? 'Back to Timeline' : 'Back to Consultation'}
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 font-display mb-4">Review Your Claim Details</h2>
              <p className="text-slate-500">
                {aiWasSkipped
                  ? 'Please review your manually entered information before proceeding.'
                  : "We've extracted the following from your consultation. Please review and correct if needed."
                }
              </p>
              {extractedData && extractedData.confidenceScore < 70 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Some fields could not be confidently extracted. Please verify all information.
                </div>
              )}
            </div>

            {/* Party Details Side by Side - Removed outer card wrapper to reduce padding */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Claimant */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Claimant (You)</h3>
                  {extractedFields.some(f => f.startsWith('claimant')) ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">AI Extracted</span>
                  ) : aiWasSkipped ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Manually Entered</span>
                  ) : null}
                </div>
                <PartyForm
                  party={claimData.claimant}
                  onChange={(p) => setClaimData(prev => ({ ...prev, claimant: p }))}
                  title="Claimant"
                />
              </div>

              {/* Defendant */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <User className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-slate-900">Defendant (Debtor)</h3>
                  {extractedFields.some(f => f.startsWith('defendant')) ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">AI Extracted</span>
                  ) : aiWasSkipped ? (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Manually Entered</span>
                  ) : null}
                </div>
                <PartyForm
                  party={claimData.defendant}
                  onChange={(p) => setClaimData(prev => ({ ...prev, defendant: p }))}
                  title="Defendant"
                />
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-slate-900">Invoice Details</h3>
                {extractedFields.some(f => f.startsWith('invoice')) ? (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">AI Extracted</span>
                ) : aiWasSkipped ? (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Manually Entered</span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Invoice Number"
                  value={claimData.invoice.invoiceNumber}
                  onChange={(e) => setClaimData(prev => ({ ...prev, invoice: { ...prev.invoice, invoiceNumber: e.target.value } }))}
                />
                <Input
                  label="Amount (£)"
                  type="number"
                  value={claimData.invoice.totalAmount || ''}
                  onChange={(e) => setClaimData(prev => ({ ...prev, invoice: { ...prev.invoice, totalAmount: parseFloat(e.target.value) || 0 } }))}
                />
                <Input
                  label="Invoice Date"
                  type="date"
                  value={claimData.invoice.dateIssued}
                  onChange={(e) => setClaimData(prev => ({ ...prev, invoice: { ...prev.invoice, dateIssued: e.target.value } }))}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900">Timeline Events</h3>
                {extractedFields.some(f => f.startsWith('timeline')) ? (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">AI Extracted</span>
                ) : aiWasSkipped ? (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Manually Entered</span>
                ) : null}
              </div>
              <TimelineBuilder
                events={claimData.timeline}
                onChange={(events) => setClaimData(prev => ({ ...prev, timeline: events }))}
              />
            </div>

            {/* Chat History (Collapsible) */}
            {showChatHistory && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setChatHistoryExpanded(!chatHistoryExpanded)}
                  className="w-full px-6 py-4 flex items-center justify-between text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span className="font-medium flex items-center gap-2">
                    <MessageSquareText className="w-4 h-4" />
                    View Consultation Transcript ({claimData.chatHistory.length} messages)
                  </span>
                  {chatHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {chatHistoryExpanded && (
                  <div className="px-6 pb-4 max-h-64 overflow-y-auto">
                    {claimData.chatHistory.map((msg, i) => (
                      <div key={i} className={`py-2 ${msg.role === 'user' ? 'text-blue-700' : 'text-slate-700'}`}>
                        <span className="font-medium">{msg.role === 'user' ? 'You: ' : 'AI: '}</span>
                        <span className="text-sm">{msg.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sticky Footer for Actions */}
            <div className="fixed bottom-0 right-0 left-0 md:left-72 bg-dark-800/95 backdrop-blur-md border-t border-dark-700 p-4 z-30 flex justify-end pr-8 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
              <button
                onClick={() => handleStepChange(Step.RECOMMENDATION)}
                className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform hover:-translate-y-1 hover:shadow-teal-500/25 hover:shadow-xl"
              >
                Continue to Document Selection
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      }

      case Step.RECOMMENDATION: {
        // Legal Compliance Logic: Check timeline for LBA or manual override
        const timelineHasLBA = claimData.timeline.some(e =>
            e.type === 'lba_sent' ||
            (e.type === 'chaser' &&
              (e.description.toLowerCase().includes('letter before action') ||
               e.description.toLowerCase().includes('lba') ||
               e.description.toLowerCase().includes('formal demand')))
        );
        const hasLBA = timelineHasLBA || lbaAlreadySent;

        const recommendedDoc = hasLBA ? DocumentType.FORM_N1 : DocumentType.LBA;

        // Document configurations with metadata
        const documentConfigs = [
          // PRE-ACTION STAGE
          {
            stage: 'Pre-Action',
            docs: [
              {
                type: DocumentType.POLITE_CHASER,
                icon: Mail,
                title: 'Polite Payment Reminder',
                description: 'Friendly pre-LBA reminder to maintain business relationship while requesting payment.',
                when: 'Before formal legal action',
                badge: null
              },
              {
                type: DocumentType.LBA,
                icon: Mail,
                title: 'Letter Before Action',
                description: 'Mandatory under Pre-Action Protocol. Must give debtor 30 days to respond before court filing.',
                when: 'Required before N1',
                badge: !hasLBA ? { text: 'REQUIRED FIRST', color: 'bg-green-500' } : null
              }
            ]
          },
          // FILING STAGE
          {
            stage: 'Court Filing',
            docs: [
              {
                type: DocumentType.FORM_N1,
                icon: Scale,
                title: 'Form N1 (Claim Form)',
                description: `Official court claim form. Commences legal proceedings. Court fee: £${claimData.courtFee}.`,
                when: 'After 30-day LBA period',
                badge: hasLBA ? { text: 'NEXT STEP', color: 'bg-blue-500' } : null
              }
            ]
          },
          // SETTLEMENT OPTIONS
          {
            stage: 'Settlement',
            docs: [
              {
                type: DocumentType.PART_36_OFFER,
                icon: FileText,
                title: 'Part 36 Settlement Offer',
                description: 'Formal settlement offer with cost consequences if not accepted. CPR Part 36 compliant.',
                when: 'Any time before trial',
                badge: null
              },
              {
                type: DocumentType.INSTALLMENT_AGREEMENT,
                icon: FileText,
                title: 'Installment Payment Agreement',
                description: 'Legally binding agreement for payment by installments. Default: 6 monthly payments.',
                when: 'When debtor cannot pay in full',
                badge: null
              }
            ]
          },
          // POST-FILING STAGE
          {
            stage: 'Post-Filing',
            docs: [
              {
                type: DocumentType.DEFAULT_JUDGMENT,
                icon: Gavel,
                title: 'Default Judgment (N225)',
                description: 'Application when defendant fails to respond within 14/28 days. Must file within 6 months.',
                when: 'No defence filed',
                badge: null
              },
              {
                type: DocumentType.ADMISSION,
                icon: Gavel,
                title: 'Judgment on Admission (N225A)',
                description: 'Application when defendant admits but disputes payment terms.',
                when: 'Defendant admits claim',
                badge: null
              },
              {
                type: DocumentType.DEFENCE_RESPONSE,
                icon: FileText,
                title: 'Response to Defence',
                description: 'Claimant\'s rebuttal to defendant\'s defence. Sets out why defence should be rejected.',
                when: 'Defence filed by defendant',
                badge: null
              }
            ]
          },
          // TRIAL PREPARATION
          {
            stage: 'Trial Preparation',
            docs: [
              {
                type: DocumentType.DIRECTIONS_QUESTIONNAIRE,
                icon: FileCheck,
                title: 'Directions Questionnaire (N180)',
                description: 'Required for small claims track allocation. Must complete for trial directions.',
                when: 'After defence filed',
                badge: null
              },
              {
                type: DocumentType.TRIAL_BUNDLE,
                icon: FolderOpen,
                title: 'Trial Bundle',
                description: 'Organized bundle of all documents for trial. Must comply with Practice Direction 39A.',
                when: 'Before trial hearing',
                badge: null
              },
              {
                type: DocumentType.SKELETON_ARGUMENT,
                icon: FileText,
                title: 'Skeleton Argument',
                description: 'Summary of legal arguments for trial. Outlines your case and legal basis.',
                when: 'Before trial hearing',
                badge: null
              }
            ]
          }
        ];

        // Get the recommended document details (config object with icon, title, description)
        const recommendedDocConfig = documentConfigs
          .flatMap(stage => stage.docs)
          .find(doc => doc.type === claimData.selectedDocType);

        return (
          <div className="space-y-8 animate-fade-in py-10 max-w-6xl mx-auto">
            <button
              onClick={() => handleStepChange(Step.DATA_REVIEW)}
              className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Data Review
            </button>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 font-display mb-4">Recommended Document</h2>
                <p className="text-slate-500">Based on your case details, we recommend the following document</p>
            </div>

            {/* Prominent Recommended Document Card */}
            {recommendedDocConfig && (
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-2xl mb-8">
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-white/10 rounded-xl">
                    <recommendedDocConfig.icon className="w-10 h-10" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold">{recommendedDocConfig.title}</h3>
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI RECOMMENDED
                      </span>
                    </div>
                    <p className="text-slate-300 mb-4">{recommendedDocConfig.description}</p>

                    {/* AI Recommendation Reason */}
                    {recommendationReason && (
                      <div className="bg-white/10 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                          <Wand2 className="w-4 h-4" /> Why This Document?
                        </h4>
                        <p className="text-sm text-slate-200">{recommendationReason}</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setHasVerifiedInterest(true);
                        handleStepChange(Step.DRAFT);
                      }}
                      className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all shadow-lg"
                    >
                      Generate {recommendedDocConfig.title}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other Options (Collapsed by Default) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowAdvancedDocs(!showAdvancedDocs)}
                className="w-full px-6 py-4 flex items-center justify-between text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Other Document Options
                </span>
                {showAdvancedDocs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvancedDocs && (
                <div className="p-6 space-y-8">
                  {documentConfigs.map((stageGroup) => (
                    <div key={stageGroup.stage} className="space-y-4">
                      {/* Stage Header */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-4">{stageGroup.stage}</h3>
                        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent"></div>
                      </div>

                      {/* Documents Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stageGroup.docs.map((doc) => {
                          const Icon = doc.icon;
                          const isSelected = claimData.selectedDocType === doc.type;

                          return (
                            <div
                              key={doc.type}
                              onClick={() => setClaimData(p => ({...p, selectedDocType: doc.type}))}
                              className={`relative p-6 rounded-xl border-2 transition-all cursor-pointer group ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white shadow-xl scale-105'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-md'
                              }`}
                            >
                              {/* Badge */}
                              {doc.badge && (
                                <div className={`absolute top-0 right-0 ${doc.badge.color} text-white text-xs font-bold px-2 py-1 rounded-bl-lg shadow-sm flex items-center gap-1`}>
                                  <Check className="w-3 h-3" /> {doc.badge.text}
                                </div>
                              )}

                              {/* Icon & Title */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/10' : 'bg-blue-50 text-blue-600'}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <h4 className="font-bold text-sm">{doc.title}</h4>
                              </div>

                              {/* Description */}
                              <p className={`text-xs leading-relaxed mb-3 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                                {doc.description}
                              </p>

                              {/* When to use */}
                              <div className={`text-xs font-medium flex items-center gap-1 ${isSelected ? 'text-amber-300' : 'text-blue-600'}`}>
                                <Calendar className="w-3 h-3" /> {doc.when}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LBA Override Toggle - shown when timeline doesn't have LBA but user may have sent one externally */}
            {!timelineHasLBA && (() => {
              const daysSinceLba = lbaSentDate
                ? Math.floor((Date.now() - new Date(lbaSentDate).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              return (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={lbaAlreadySent}
                        onChange={(e) => {
                          setLbaAlreadySent(e.target.checked);
                          if (!e.target.checked) setLbaSentDate('');
                        }}
                        className="mt-1 w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-blue-900">I have already sent a Letter Before Action</span>
                        <p className="text-sm text-blue-700 mt-1">
                          Check this if you sent an LBA outside of this system. This will enable Form N1 as an option.
                          You should keep evidence of your LBA for court.
                        </p>
                      </div>
                    </label>

                    {/* Date input when checkbox is checked */}
                    {lbaAlreadySent && (
                      <div className="mt-4 ml-8">
                        <label className="block text-sm font-medium text-blue-900 mb-1">
                          Date LBA was sent:
                        </label>
                        <input
                          type="date"
                          value={lbaSentDate}
                          onChange={(e) => setLbaSentDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="block w-48 rounded-lg border-blue-300 bg-white px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />

                        {/* 30-day warning */}
                        {lbaSentDate && daysSinceLba < 30 && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                              <strong>Only {daysSinceLba} day{daysSinceLba !== 1 ? 's' : ''} since LBA.</strong>{' '}
                              Pre-Action Protocol requires 30 days before filing Form N1.
                              You may proceed, but the court may impose cost sanctions for premature filing.
                            </p>
                          </div>
                        )}

                        {lbaSentDate && daysSinceLba >= 30 && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">
                              <strong>{daysSinceLba} days since LBA.</strong>{' '}
                              30-day response period has elapsed. You may proceed to file Form N1.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Soft-Block Warning for N1 without LBA */}
            {claimData.selectedDocType === DocumentType.FORM_N1 && !hasLBA && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 animate-fade-in">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-900 text-lg mb-2">Pre-Action Protocol Warning</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Filing Form N1 without a compliant Letter Before Action (LBA) violates the Pre-Action Protocol for Debt Claims.
                      The court may impose cost sanctions, even if you win your case.
                    </p>
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-4">
                      <h4 className="font-bold text-red-900 text-sm mb-2">Potential Consequences:</h4>
                      <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                        <li>Court may refuse to award you costs</li>
                        <li>Court may order you to pay defendant's costs</li>
                        <li>Court may stay proceedings until LBA requirements are met</li>
                        <li>Claim may be struck out in severe cases</li>
                      </ul>
                    </div>
                    <div className="bg-white border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-700">
                        <strong>Recommended:</strong> Add an LBA to your timeline first, or{' '}
                        <button
                          onClick={() => setClaimData(prev => ({ ...prev, selectedDocType: DocumentType.LBA }))}
                          className="text-red-600 underline hover:text-red-700 font-medium"
                        >
                          generate an LBA document
                        </button>
                        {' '}instead.
                      </p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={hasAcknowledgedLbaWarning}
                        onChange={(e) => setHasAcknowledgedLbaWarning(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
                      />
                      <span className="text-sm text-red-900">
                        <span className="font-bold">I understand and accept the risks:</span>{' '}
                        I am proceeding without an LBA and accept that I may face cost sanctions or other adverse consequences.
                        I take full responsibility for this decision.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for selecting LBA when one has already been sent */}
            {claimData.selectedDocType === DocumentType.LBA && hasLBA && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 text-lg mb-2">You've Already Sent an LBA</h3>
                    <p className="text-sm text-amber-800 mb-3">
                      {timelineHasLBA
                        ? "Your timeline shows a Letter Before Action has already been sent."
                        : "You indicated you've already sent a Letter Before Action."}
                      {' '}Sending another LBA may unnecessarily delay your claim.
                    </p>
                    <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mb-4">
                      <h4 className="font-bold text-amber-900 text-sm mb-2">Consider Instead:</h4>
                      <ul className="text-sm text-amber-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <Scale className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span><strong>Form N1 (Claim Form)</strong> – If 30 days have passed since your LBA, you can proceed to file a court claim.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span><strong>Part 36 Offer</strong> – Make a formal settlement offer with cost protection.</span>
                        </li>
                      </ul>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setClaimData(prev => ({ ...prev, selectedDocType: DocumentType.FORM_N1 }))}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                      >
                        Switch to Form N1
                      </button>
                      <button
                        onClick={() => setClaimData(prev => ({ ...prev, selectedDocType: DocumentType.PART_36_OFFER }))}
                        className="px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
                      >
                        Make Part 36 Offer
                      </button>
                    </div>
                    <p className="text-xs text-amber-700 mt-3">
                      You can still proceed with generating another LBA if needed (e.g., to a different party or with updated terms).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 2: Inline Interest Rate Verification (replaces modal) */}
            {claimData.selectedDocType && (
              <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Percent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900 text-lg mb-2">Interest Rate Verification Required</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Claimant (You)</p>
                        <p className="font-bold text-slate-900 capitalize">{claimData.claimant.type}</p>
                      </div>
                      <div className="bg-white border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Defendant (Debtor)</p>
                        <p className="font-bold text-slate-900 capitalize">{claimData.defendant.type}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Invoice Amount:</span>
                        <span className="font-bold text-slate-900">£{claimData.invoice.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Interest Rate:</span>
                        <span className="font-bold text-blue-600">
                          {claimData.claimant.type === PartyType.BUSINESS && claimData.defendant.type === PartyType.BUSINESS ? '12.75%' : '8%'} p.a.
                        </span>
                      </div>
                      <div className="h-px bg-slate-200 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-700">Total Interest:</span>
                        <span className="font-bold text-lg text-slate-900">£{claimData.interest.totalInterest.toFixed(2)}</span>
                      </div>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={hasVerifiedInterest}
                        onChange={(e) => setHasVerifiedInterest(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-blue-900">
                        <span className="font-bold">I verify that:</span> The party types are correct, and I understand the interest rate is based on{' '}
                        {claimData.claimant.type === PartyType.BUSINESS && claimData.defendant.type === PartyType.BUSINESS
                          ? 'Late Payment of Commercial Debts Act 1998 (B2B)'
                          : 'County Courts Act 1984 s.69 (B2C/Mixed)'}
                        . Incorrect classification can lead to claim rejection or cost sanctions.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={handleDraftClaim}
                  disabled={isProcessing || !claimData.selectedDocType || !hasVerifiedInterest || (claimData.selectedDocType === DocumentType.FORM_N1 && !hasLBA && !hasAcknowledgedLbaWarning)}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-12 py-4 rounded-xl shadow-lg hover:shadow-2xl font-bold text-lg flex items-center gap-3 transition-all transform hover:-translate-y-1 disabled:transform-none"
                >
                    {isProcessing ? <Loader2 className="animate-spin"/> : <><Wand2 className="w-5 h-5" /> Generate Document</>}
                </button>
            </div>
          </div>
        );
      }
      case Step.DRAFT:
        return (
            <div className="max-w-5xl mx-auto animate-fade-in py-10">
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col h-[calc(100vh-140px)] relative">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900 font-display">Draft: {claimData.selectedDocType}</h2>
                          <p className="text-sm text-slate-500">Review and edit the generated content below.</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                            <Sparkles className="w-3 h-3" />
                            <span>Generated by Claude AI (Anthropic)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                               onClick={() => setShowRefineInput(!showRefineInput)}
                               className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg border transition-all shadow-sm ${showRefineInput ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-700 bg-white border-slate-200 hover:border-slate-300'}`}
                             >
                                <Sparkles className={`w-3 h-3 ${showRefineInput ? 'text-amber-400' : 'text-blue-600'}`} /> 
                                {showRefineInput ? 'Close Director Mode' : 'Refine with AI'}
                             </button>
                        </div>
                    </div>

                    {/* Refine AI Input Box - Director Mode Overlay */}
                    {showRefineInput && (
                        <div className="absolute top-24 left-8 right-8 z-20 bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-800 animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <Command className="w-4 h-4 text-amber-400" />
                                <h4 className="text-sm font-bold text-white">Director Mode: Give instructions to the Associate</h4>
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    className="flex-grow px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-white placeholder-slate-500 outline-none font-mono text-sm"
                                    placeholder="e.g. 'Make the tone more aggressive', 'Emphasize the overdue interest', 'Shorten the conclusion'"
                                    value={refineInstruction}
                                    onChange={(e) => setRefineInstruction(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRefineDraft()}
                                    autoFocus
                                />
                                <button 
                                    onClick={handleRefineDraft}
                                    disabled={isProcessing || !refineInstruction}
                                    className="bg-amber-500 text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4"/> : "Execute"}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* N1 Brief Details Editor */}
                    {claimData.selectedDocType === DocumentType.FORM_N1 && claimData.generated && (
                       <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <label className="block text-sm font-bold text-slate-800 mb-2">N1 Form Summary (Max 30 words)</label>
                          <p className="text-xs text-slate-500 mb-2">This text appears in the "Brief details of claim" box on the front page.</p>
                          <input 
                            type="text"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-sans text-sm"
                            value={claimData.generated.briefDetails || ''}
                            onChange={(e) => setClaimData(prev => prev.generated ? ({...prev, generated: {...prev.generated!, briefDetails: e.target.value}}) : prev)}
                            maxLength={200}
                          />
                       </div>
                    )}

                    {claimData.generated && (
                        <textarea 
                            className="w-full flex-grow p-8 border border-slate-200 bg-slate-50/50 rounded-lg font-serif text-base leading-relaxed text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-none shadow-inner" 
                            value={claimData.generated.content} 
                            onChange={(e) => setClaimData(prev => prev.generated ? ({...prev, generated: {...prev.generated!, content: e.target.value}}) : prev)}
                        />
                    )}
                    <div className="flex justify-between mt-6 pt-6 border-t border-slate-100"><button onClick={() => handleStepChange(Step.RECOMMENDATION)} className="text-slate-500 font-medium hover:text-slate-800 transition-colors flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Selection</button><button onClick={handlePrePreview} disabled={isProcessing} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">{isProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : <>Finalize & Preview <ArrowRight className="w-5 h-5" /></>}</button></div>
                 </div>
            </div>
        );
      case Step.PREVIEW:
        return <DocumentPreview
          data={claimData}
          onBack={() => handleStepChange(Step.DRAFT)}
          isFinalized={isFinalized}
          onConfirm={handleConfirmDraft}
          onUpdateSignature={(sig) => setClaimData(p => ({...p, signature: sig}))}
          onUpdateContent={(content) => setClaimData(p => ({
            ...p,
            generated: p.generated ? { ...p.generated, content } : null
          }))}
        />;
    }
  };

  // RENDER VIEW SWITCHER
  if (view === 'privacy') {
    return <PrivacyPolicy onBack={() => setView('landing')} />;
  }

  if (view === 'terms') {
    return <TermsOfService onBack={() => setView('landing')} />;
  }

  if (view === 'onboarding') {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingFlowComplete}
        onCancel={() => setView('landing')}
        existingProfile={userProfile}
      />
    );
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-teal-100 selection:text-teal-900">
         {/* Navigation */}
         <div className="absolute top-0 left-0 right-0 z-50 py-6">
            <div className="container mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-gradient-to-tr from-teal-600 to-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-slate-900">ClaimCraft</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-teal-600 transition-colors">Features</button>
                    <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-teal-600 transition-colors">How it Works</button>
                    <button onClick={() => setView('terms')} className="hover:text-teal-600 transition-colors">Legal</button>
                </div>
                <button
                    onClick={handleEnterApp}
                    className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-all text-sm font-semibold shadow-sm"
                >
                    Sign In
                </button>
            </div>
         </div>

         {/* Hero Section */}
         <div className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-50">
            {/* Abstract Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-teal-100/40 blur-[130px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-100/40 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-widest mb-8 hover:border-teal-200 transition-all cursor-default shadow-sm animate-fade-in">
                  <Sparkles className="w-3.5 h-3.5" /> AI-Powered Debt Recovery
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-8 leading-[1.1] md:leading-[1.1] text-slate-900 animate-fade-in-up animation-delay-100">
                  Recover Unpaid Debts <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">Without the Lawyers</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-12 font-light leading-relaxed animate-fade-in-up animation-delay-200">
                  Generate court-ready <strong className="text-slate-900 font-medium">Letters Before Action</strong> and <strong className="text-slate-900 font-medium">Form N1 claims</strong> in minutes. 
                  Our AI handles the legal complexity, statutory interest, and compliance checks for you.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg z-20 animate-fade-in-up animation-delay-300">
                   <button
                      onClick={handleEnterApp}
                      className="w-full sm:w-auto bg-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-teal-700 transition-all transform hover:-translate-y-1 shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 group"
                   >
                      Start Your Claim Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                   </button>
                   <button
                      onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-sm hover:shadow-md"
                   >
                      See How It Works
                   </button>
                </div>
                
                {/* Social Proof Mini */}
                <div className="mt-12 flex items-center gap-8 animate-fade-in-up animation-delay-400">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> No Win, No Fee (Optional)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> UK GDPR Compliant
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> HMCTS Approved Formats
                    </div>
                </div>
            </div>
         </div>

         {/* Trust/Stats Banner */}
         <div className="border-y border-slate-200 bg-white">
            <div className="container mx-auto px-4 py-12">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="text-center">
                     <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">£2.4M+</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Recovered</p>
                  </div>
                  <div className="text-center">
                     <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">450+</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Active Claims</p>
                  </div>
                  <div className="text-center">
                     <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">14 Days</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Avg. Settlement</p>
                  </div>
                  <div className="text-center">
                     <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">£0</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Upfront Legal Fees</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Features Grid */}
         <div id="features" className="py-24 bg-slate-50 relative">
            <div className="container mx-auto px-4">
               <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-slate-900">Everything you need to get paid</h2>
                  <p className="text-slate-600 text-lg">We've codified the entire UK small claims process into a simple, intelligent workflow.</p>
               </div>

               <div className="grid md:grid-cols-3 gap-6">
                  {[
                     { 
                        icon: Wand2, 
                        color: "text-teal-600", 
                        bg: "bg-teal-50",
                        title: "AI Legal Drafting",
                        desc: "Claude AI drafts professional Letters Before Action and N1 forms tailored to your specific case details."
                     },
                     { 
                        icon: PoundSterling, 
                        color: "text-blue-600", 
                        bg: "bg-blue-50",
                        title: "Smart Calculations",
                        desc: "Automatically calculate statutory interest (8% + Base), compensation fees (£40-£100), and court fees."
                     },
                     { 
                        icon: ShieldCheck, 
                        color: "text-teal-600", 
                        bg: "bg-teal-50",
                        title: "Protocol Compliance",
                        desc: "Built-in checks ensure you follow the Pre-Action Protocol, protecting your right to claim costs."
                     },
                     { 
                        icon: Zap, 
                        color: "text-amber-600", 
                        bg: "bg-amber-50",
                        title: "Instant Integration",
                        desc: "Connect Xero or upload CSVs to import invoices instantly. No manual data entry required."
                     },
                     { 
                        icon: Calendar, 
                        color: "text-red-600", 
                        bg: "bg-red-50",
                        title: "Evidence Timeline",
                        desc: "Build a rock-solid audit trail of every email, call, and invoice to prove your case in court."
                     },
                     { 
                        icon: MessageSquareText, 
                        color: "text-blue-600", 
                        bg: "bg-blue-50",
                        title: "AI Consultation",
                        desc: "Not sure about next steps? Chat with our legal AI to get instant guidance on strategy."
                     }
                  ].map((feature, i) => (
                     <div key={i} className="group p-8 rounded-2xl bg-white border border-slate-200 hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                           <feature.icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
         
         {/* How It Works */}
         <div id="how-it-works" className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-slate-900">How it works</h2>
                    <p className="text-slate-600 text-lg">From unpaid invoice to court claim in 4 simple steps.</p>
                </div>
                
                <div className="grid md:grid-cols-4 gap-8">
                    {[
                        { step: "01", title: "Import Data", desc: "Connect Xero or upload your invoice details." },
                        { step: "02", title: "Build Case", desc: "Our AI helps you organize evidence and timeline." },
                        { step: "03", title: "Generate", desc: "Create compliant Letters Before Action or N1 Forms." },
                        { step: "04", title: "Recover", desc: "Send to debtor or file with HMCTS to get paid." }
                    ].map((item, i) => (
                        <div key={i} className="relative p-6 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-5xl font-display font-bold text-teal-100 mb-4 select-none absolute top-4 right-4">{item.step}</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{item.title}</h3>
                            <p className="text-slate-500 text-sm relative z-10">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
         </div>

         {/* CTA Section */}
         <div className="py-24 relative overflow-hidden bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 to-slate-900 z-0"></div>
            <div className="container mx-auto px-4 relative z-10 text-center">
               <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 text-white">Stop chasing. Start recovering.</h2>
               <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                  Join hundreds of UK businesses using ClaimCraft to recover unpaid invoices faster and cheaper than solicitors.
               </p>
               <button
                  onClick={handleEnterApp}
                  className="bg-white text-slate-900 px-10 py-4 rounded-xl font-bold text-lg hover:bg-teal-50 transition-all transform hover:-translate-y-1 shadow-lg inline-flex items-center gap-2"
               >
                  Create Your First Claim <ArrowRight className="w-5 h-5" />
               </button>
            </div>
         </div>
         
         {/* Footer */}
         <footer className="border-t border-slate-200 py-12 bg-white text-slate-500 text-sm">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>&copy; 2025 ClaimCraft UK. All rights reserved.</div>
                <div className="flex gap-6">
                    <button onClick={() => setView('privacy')} className="hover:text-teal-600 transition-colors">Privacy Policy</button>
                    <button onClick={() => setView('terms')} className="hover:text-teal-600 transition-colors">Terms of Service</button>
                </div>
            </div>
         </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-900 selection:bg-violet-200 selection:text-violet-900 overflow-hidden">
      <div className="md:hidden flex-shrink-0">
         <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>

      {/* Desktop Sidebar */}
      <div className="w-72 flex-shrink-0 hidden md:block h-full">
        <Sidebar view={view} currentStep={step} maxStepReached={maxStepReached} onDashboardClick={handleExitWizard} onStepSelect={setStep} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
         <div className={`absolute left-0 top-0 bottom-0 w-72 bg-dark-900 transition-transform duration-300 shadow-dark-xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <Sidebar view={view} currentStep={step} maxStepReached={maxStepReached} onDashboardClick={handleExitWizard} onCloseMobile={() => setIsMobileMenuOpen(false)} onStepSelect={setStep} />
         </div>
      </div>

      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50">
         <div className="md:pl-8 md:pr-8 md:pt-8 pb-20 min-h-full">
            {view === 'dashboard' && <Dashboard
              claims={dashboardClaims}
              onCreateNew={handleStartNewClaim}
              onResume={handleResumeClaim}
              onDelete={handleDeleteClaim}
              onImportCsv={() => setShowCsvModal(true)}
              accountingConnection={accountingConnection}
              onConnectAccounting={handleOpenAccountingModal}
              onExportAllData={handleExportAllData}
              onDeleteAllData={handleDeleteAllData}
            />}
            {view === 'wizard' && (
              <div>
                {/* Error Banner */}
                {error && (
                  <div className="max-w-4xl mx-auto px-4 md:px-0 mb-6 animate-fade-in">
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 mb-2">Missing Information</h4>
                        <div className="text-red-800 text-sm whitespace-pre-line mb-4">{error}</div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setError(null);
                              handleStepChange(Step.DETAILS);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Go to Claim Details
                          </button>
                          <button
                            onClick={() => {
                              setError(null);
                              handleStepChange(Step.TIMELINE);
                            }}
                            className="bg-white text-red-700 border border-red-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                          >
                            Go to Timeline
                          </button>
                          <button
                            onClick={() => setError(null)}
                            className="text-red-600 hover:text-red-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Indicator - Mobile & Desktop */}
                <div className="max-w-5xl mx-auto px-4 md:px-0 mb-6">
                  <div className="hidden md:block">
                    {/* Desktop - Hidden on mobile as sidebar shows progress */}
                  </div>
                  <div className="block md:hidden">
                    {/* Mobile - Compact progress bar */}
                    <ProgressStepsCompact
                      steps={WIZARD_STEPS}
                      currentStep={step}
                    />
                  </div>
                </div>
                {renderWizardStep()}
              </div>
            )}
          </div>
      </main>

      {/* Legacy Onboarding Modal (Disclaimer + Eligibility) - kept for backwards compatibility */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onDecline={handleOnboardingDecline}
      />

      <CsvImportModal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} onImport={handleBulkImport} />
      <AccountingIntegration
        isOpen={showAccountingModal}
        onClose={() => setShowAccountingModal(false)}
        onImportClick={() => {
          setShowAccountingModal(false);
          setShowXeroImporter(true);
        }}
        onConnectionChange={handleAccountingConnectionChange}
      />
      <XeroInvoiceImporter
        isOpen={showXeroImporter}
        onClose={() => setShowXeroImporter(false)}
        onImport={handleXeroImport}
        claimant={claimData.claimant}
      />

      {/* Compliance Modals */}
      <InterestRateConfirmModal
        isOpen={showInterestModal}
        onClose={() => {
          setShowInterestModal(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          setShowInterestModal(false);
          if (pendingAction) {
            pendingAction();
          }
        }}
        claimantType={claimData.claimant.type}
        debtorType={claimData.defendant.type}
        interestRate={claimData.claimant.type === PartyType.BUSINESS && claimData.defendant.type === PartyType.BUSINESS ? LATE_PAYMENT_ACT_RATE : 8.0}
        totalInterest={claimData.interest.totalInterest}
        invoiceAmount={claimData.invoice.totalAmount}
      />

      <LitigantInPersonModal
        isOpen={showLiPModal}
        onClose={() => {
          setShowLiPModal(false);
          setPendingAction(null);
        }}
        onProceed={async () => {
          setShowLiPModal(false);
          // Proceed with document generation
          setIsProcessing(true);
          setProcessingText(`Generating ${claimData.selectedDocType}...`);
          try {
            const result = await DocumentBuilder.generateDocument(claimData);
            setClaimData(prev => ({ ...prev, generated: result }));
            handleStepChange(Step.DRAFT);
            if (result.validation?.warnings && result.validation.warnings.length > 0) {
              console.warn('Document warnings:', result.validation.warnings);
            }
          } catch (e: any) {
            setError(e.message || "Document generation failed. Please check your data and try again.");
            console.error('Draft generation error:', e);
          } finally {
            setIsProcessing(false);
          }
        }}
        claimValue={claimData.invoice.totalAmount + claimData.interest.totalInterest + claimData.compensation + claimData.courtFee}
      />

      <StatementOfTruthModal
        isOpen={showSoTModal}
        onClose={() => {
          setShowSoTModal(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          setShowSoTModal(false);
          if (pendingAction) {
            pendingAction();
          }
        }}
        documentType={
          claimData.selectedDocType === DocumentType.FORM_N1 ? 'Form N1 (Claim Form)' :
          claimData.selectedDocType === DocumentType.DEFAULT_JUDGMENT ? 'Default Judgment (N225)' :
          claimData.selectedDocType === DocumentType.ADMISSION ? 'Admission (N225A)' :
          'Court Document'
        }
      />

      {/* Viability Warning Modal */}
      <ViabilityBlockModal
        isOpen={showViabilityWarning}
        onClose={() => setShowViabilityWarning(false)}
        onProceed={() => {
          setHasAcknowledgedViability(true);
          setShowViabilityWarning(false);
        }}
        issues={viabilityIssues}
      />
    </div>
  );
};

export default App;