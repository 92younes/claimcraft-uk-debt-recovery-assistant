import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EligibilityModal } from './components/EligibilityModal';
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
import { FloatingChatWidget } from './components/FloatingChatWidget';
import { OnboardingModal } from './components/OnboardingModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { StatementOfTruthModal } from './components/StatementOfTruthModal';
import { InterestRateConfirmModal } from './components/InterestRateConfirmModal';
import { LitigantInPersonModal } from './components/LitigantInPersonModal';
import { AccountingIntegration } from './components/AccountingIntegration';
import { XeroInvoiceImporter } from './components/XeroInvoiceImporter';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { analyzeEvidence, startClarificationChat, sendChatMessage, getClaimStrengthAssessment } from './services/geminiService';
import { DocumentBuilder } from './services/documentBuilder';
import { NangoClient } from './services/nangoClient';
import { searchCompaniesHouse } from './services/companiesHouse';
import { assessClaimViability, calculateCourtFee, calculateCompensation } from './services/legalRules';
import { getStoredClaims, saveClaimToStorage, deleteClaimFromStorage, exportAllUserData, deleteAllUserData } from './services/storageService';
import { ClaimState, INITIAL_STATE, Party, InvoiceData, InterestData, DocumentType, PartyType, TimelineEvent, EvidenceFile, ChatMessage, AccountingConnection } from './types';
import { LATE_PAYMENT_ACT_RATE, DAILY_INTEREST_DIVISOR, DEFAULT_PAYMENT_TERMS_DAYS } from './constants';
import { ArrowRight, Wand2, Loader2, CheckCircle, FileText, Mail, Scale, ArrowLeft, Sparkles, Upload, Zap, ShieldCheck, ChevronRight, ChevronUp, ChevronDown, Lock, Check, Play, Globe, LogIn, Keyboard, Pencil, MessageSquareText, ThumbsUp, Command, AlertTriangle, AlertCircle, HelpCircle, Calendar, PoundSterling, User, Gavel, FileCheck, FolderOpen, Percent } from 'lucide-react';

// New view state
type ViewState = 'landing' | 'dashboard' | 'wizard' | 'privacy' | 'terms';

enum Step {
  SOURCE = 1,
  DETAILS = 2,
  ASSESSMENT = 3,
  TIMELINE = 4,    // Moved before Questions so AI has context
  QUESTIONS = 5,   // Chat / Consultation
  FINAL = 6,       // Final Review & Doc Selection
  DRAFT = 7,
  PREVIEW = 8
}

// Wizard step definitions for progress indicator
const WIZARD_STEPS = [
  { number: Step.SOURCE, label: 'Data Source', description: 'Import or enter' },
  { number: Step.DETAILS, label: 'Claim Details', description: 'Parties & amounts' },
  { number: Step.TIMELINE, label: 'Timeline', description: 'Event history' },
  { number: Step.QUESTIONS, label: 'Consultation', description: 'AI questions' },
  { number: Step.FINAL, label: 'Strategy', description: 'Document type' },
  { number: Step.DRAFT, label: 'Draft', description: 'Edit content' },
  { number: Step.PREVIEW, label: 'Review', description: 'Final check' }
];

const App: React.FC = () => {
  // High Level State
  const [view, setView] = useState<ViewState>('landing');
  const [dashboardClaims, setDashboardClaims] = useState<ClaimState[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false); // Combined disclaimer + eligibility
  const [showEligibility, setShowEligibility] = useState(false); // Deprecated - kept for compatibility
  const [showDisclaimer, setShowDisclaimer] = useState(false); // Deprecated - kept for compatibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Wizard State
  const [step, setStep] = useState<Step>(Step.SOURCE);
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
  const [isChatOpen, setIsChatOpen] = useState(false); // Floating chat widget toggle

  // Accounting Integration State
  const [accountingConnection, setAccountingConnection] = useState<AccountingConnection | null>(null);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showXeroImporter, setShowXeroImporter] = useState(false);

  // Compliance Modal State
  const [showSoTModal, setShowSoTModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showLiPModal, setShowLiPModal] = useState(false);
  const [showAdvancedDocs, setShowAdvancedDocs] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Phase 2: Inline interest verification (replaces InterestRateConfirmModal)
  const [hasVerifiedInterest, setHasVerifiedInterest] = useState(false);

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
    // Load local claims async
    const loadClaims = async () => {
        const storedClaims = await getStoredClaims();
        setDashboardClaims(storedClaims);

        // If we have claims, auto-direct to dashboard for better UX
        if (storedClaims.length > 0) {
            setView('dashboard');
        }
    };
    loadClaims();
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

  // --- Navigation Handlers ---
  const handleStartNewClaim = () => {
    // Phase 2: Show combined onboarding modal (disclaimer + eligibility)
    setShowOnboarding(true);
  };

  // Phase 2: Combined onboarding handlers (replaces disclaimer + eligibility flow)
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Reset Wizard and Enter
    setClaimData({ ...INITIAL_STATE, id: Math.random().toString(36).substr(2, 9) });
    setStep(Step.SOURCE);
    setIsEditingAnalysis(false);
    setView('wizard');
  };

  const handleOnboardingDecline = () => {
    setShowOnboarding(false);
    // User declined, stay on landing/dashboard
  };

  // Deprecated handlers (kept for backward compatibility with old modals)
  const handleDisclaimerAccepted = () => {
    setShowDisclaimer(false);
    setShowEligibility(true);
  };

  const handleDisclaimerDeclined = () => {
    setShowDisclaimer(false);
  };

  const handleEligibilityPassed = () => {
    setShowEligibility(false);
    setClaimData({ ...INITIAL_STATE, id: Math.random().toString(36).substr(2, 9) });
    setStep(Step.SOURCE);
    setIsEditingAnalysis(false);
    setView('wizard');
  };

  const handleResumeClaim = (claim: ClaimState) => {
    setClaimData(claim);
    // Heuristic to jump to correct step
    if (claim.status === 'sent') {
      setStep(Step.PREVIEW);
      setIsFinalized(true);
    } else if (claim.generated) {
      setStep(Step.DRAFT);
    } else {
      setStep(Step.FINAL);
    }
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
    const interest = calculateInterest(
      claimData.invoice.totalAmount,
      claimData.invoice.dateIssued,
      claimData.invoice.dueDate,
      claimData.claimant.type,
      claimData.defendant.type
    );
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

        let newState = {
          ...claimData,
          evidence: updatedEvidence,
          source: 'upload' as const,
          claimant: { ...claimData.claimant, ...result.claimant },
          defendant: { ...claimData.defendant, ...result.defendant },
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
        setStep(Step.DETAILS);
        setIsEditingAnalysis(false);
    } catch (err) {
        setError("Failed to analyze documents. Please ensure they are legible.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleManualEntry = () => {
    setClaimData(prev => ({ ...prev, source: 'manual' }));
    setStep(Step.DETAILS);
  };

  const handleLegacyXeroImport = async (importedData: Partial<ClaimState>) => {
    const mergedClaimant = (claimData.claimant.name && claimData.claimant.name.length > 0)
      ? claimData.claimant
      : { ...claimData.claimant, ...importedData.claimant };
    const mergedTimeline = [...(claimData.timeline || []), ...(importedData.timeline || [])];
    let newState = {
      ...claimData,
      ...importedData,
      claimant: mergedClaimant,
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
    setStep(Step.DETAILS);
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
            courtFee
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
    
    // 2. AI Strength Assessment
    try {
       const aiStrength = await getClaimStrengthAssessment(claimData);
       assessment.strength = aiStrength.strength; // HIGH/MEDIUM/LOW
       assessment.strengthAnalysis = aiStrength.analysis;
       assessment.weaknesses = aiStrength.weaknesses;
    } catch (e) {
       console.error("AI Assessment failed", e);
    }

    setClaimData(prev => ({ ...prev, assessment }));
    setIsProcessing(false);
    // Assessment now shown inline in DETAILS step, no longer a separate step
  };

  const handleStartChat = async () => {
    setIsProcessing(true);
    setProcessingText("Initializing Legal Assistant...");
    setStep(Step.QUESTIONS);
    
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

  const handleSendMessage = async (text: string) => {
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
      const updatedHistory = [...claimData.chatHistory, userMsg];
      setClaimData(prev => ({ ...prev, chatHistory: updatedHistory }));
      
      setIsProcessing(true);
      try {
         const aiResponse = await sendChatMessage(updatedHistory, text, claimData);
         const aiMsg: ChatMessage = {
             id: (Date.now() + 1).toString(),
             role: 'ai',
             content: aiResponse,
             timestamp: Date.now()
         };
         setClaimData(prev => ({ ...prev, chatHistory: [...updatedHistory, aiMsg] }));
      } catch (e) {
         console.error(e);
      } finally {
         setIsProcessing(false);
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
        setStep(Step.DRAFT);

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
    setStep(Step.PREVIEW);
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
      case Step.SOURCE:
        return (
          <div className="max-w-4xl mx-auto animate-fade-in py-10">
             <div className="mb-10">
                <h2 className="text-4xl font-bold text-slate-900 font-serif mb-4">New Claim</h2>
                <p className="text-slate-600 text-lg">Import your claim data or enter manually.</p>
             </div>
             <div className="grid md:grid-cols-3 gap-6 mb-12">
                <button onClick={handleOpenAccountingModal} className={`p-6 border-2 rounded-2xl transition-all flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 ${accountingConnection ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                    <div className="w-14 h-14 bg-[#13b5ea]/10 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#13b5ea]"/>
                    </div>
                    <div className="text-center">
                       <span className="block font-bold text-slate-900 text-lg">{accountingConnection ? "Import from " + accountingConnection.provider : "Connect Accounting"}</span>
                       <span className="text-xs text-slate-500 mt-1 block">{accountingConnection ? `${accountingConnection.organizationName}` : "Xero, QuickBooks & more"}</span>
                    </div>
                </button>

                <button onClick={handleManualEntry} className="p-6 border-2 border-slate-100 hover:border-slate-300 bg-white rounded-2xl transition-all flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
                        <Keyboard className="w-6 h-6 text-slate-600"/>
                    </div>
                    <div className="text-center">
                       <span className="block font-bold text-slate-900 text-lg">Manual Entry</span>
                       <span className="text-xs text-slate-500 mt-1 block">Type in claim details</span>
                    </div>
                </button>

                <div className="md:col-span-3 md:mt-6">
                   <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
                      <EvidenceUpload files={claimData.evidence} onAddFiles={(newFiles) => setClaimData(prev => ({...prev, evidence: [...prev.evidence, ...newFiles]}))} onRemoveFile={(idx) => setClaimData(prev => ({...prev, evidence: prev.evidence.filter((_, i) => i !== idx)}))} onAnalyze={handleEvidenceAnalysis} isProcessing={isProcessing} />
                   </div>
                </div>
             </div>
          </div>
        );
      
      case Step.DETAILS:
        // Logic: If Source is Manual OR User has clicked "Edit Analysis", show full form.
        // Otherwise show Analysis Summary.
        if (claimData.source === 'manual' || isEditingAnalysis) {
            return (
                <div className="space-y-8 animate-fade-in py-10 max-w-5xl mx-auto">
                    <button
                      onClick={() => setStep(Step.SOURCE)}
                      className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Data Source
                    </button>
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 font-serif mb-4">Claim Details</h2>
                        <p className="text-slate-500">Please ensure all details are correct before legal assessment.</p>
                    </div>
                    <div className="grid xl:grid-cols-2 gap-8">
                        <PartyForm title="Claimant (You)" party={claimData.claimant} onChange={updateClaimant} />
                        <PartyForm title="Defendant (Debtor)" party={claimData.defendant} onChange={updateDefendant} />
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 font-serif">Claim Financials</h2>
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
                              helpText="The original unpaid invoice amount"
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
                              onChange={(e) => updateInvoice('dateIssued', e.target.value)}
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
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={runAssessment} disabled={!claimData.invoice.totalAmount || !claimData.claimant.name} className="bg-slate-900 text-white px-12 py-4 rounded-xl shadow-lg font-bold text-lg flex items-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <>Analyze & Assess Claim <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </div>

                    {/* Inline Assessment Report */}
                    {claimData.assessment && (
                        <div className="mt-12 pt-8 border-t-2 border-slate-200">
                            <AssessmentReport
                                assessment={claimData.assessment}
                                onContinue={() => setStep(Step.TIMELINE)}
                            />
                        </div>
                    )}
                </div>
            );
        } else {
            // AI/Xero Analysis Summary View
            return (
                <div className="max-w-3xl mx-auto animate-fade-in py-10">
                    <button
                      onClick={() => setStep(Step.SOURCE)}
                      className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Data Source
                    </button>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                        <div><h2 className="text-3xl font-bold text-slate-900 font-serif">Analysis Complete</h2><p className="text-slate-600">We've extracted the key facts. Please verify.</p></div>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-left mb-8 relative overflow-hidden">
                        <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Creditor</span><p className="font-bold text-lg text-slate-900">{claimData.claimant.name || "Unknown"}</p><p className="text-sm text-slate-500">{claimData.claimant.city}</p></div>
                            <div className="text-right p-4 bg-slate-50 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 block">Debtor</span><p className="font-bold text-lg text-slate-900">{claimData.defendant.name || "Unknown"}</p></div>
                        </div>
                        <div className="border-t border-slate-100 pt-6 flex justify-between items-center relative z-10">
                            <div><span className="text-xs font-bold text-slate-400 uppercase block tracking-wide">Claim Value</span><span className="text-3xl font-bold text-slate-900 font-serif">£{claimData.invoice.totalAmount.toFixed(2)}</span></div>
                            <button onClick={() => setIsEditingAnalysis(true)} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"><Pencil className="w-3 h-3" /> Edit Details</button>
                        </div>
                    </div>
                    <div className="flex justify-end"><button onClick={runAssessment} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 transition-all transform hover:-translate-y-0.5">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <>Run Legal Viability Check <ArrowRight className="w-5 h-5"/></>}
                    </button></div>

                    {/* Inline Assessment Report */}
                    {claimData.assessment && (
                        <div className="mt-12 pt-8 border-t-2 border-slate-200">
                            <AssessmentReport
                                assessment={claimData.assessment}
                                onContinue={() => setStep(Step.TIMELINE)}
                            />
                        </div>
                    )}
                </div>
            );
        }

      // Step.ASSESSMENT has been eliminated - assessment now shown inline in Step.DETAILS
      // This improves UX by reducing wizard steps from 8 to 7 and eliminating a passive step

      case Step.TIMELINE:
        return (
            <div className="space-y-8 py-10">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => setStep(Step.DETAILS)}
                        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Details
                    </button>
                </div>
                <TimelineBuilder
                    events={claimData.timeline}
                    onChange={updateTimeline}
                    invoiceDate={claimData.invoice.dateIssued}
                />
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <button
                        onClick={() => handleStartChat()}
                        className="text-slate-600 hover:text-slate-900 border-2 border-slate-200 hover:border-slate-300 px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-medium shadow-sm"
                    >
                        <MessageSquareText className="w-4 h-4"/>
                        AI Case Consultation
                    </button>
                    <button
                        onClick={() => setStep(Step.FINAL)}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-medium shadow-lg"
                    >
                        Continue to Strategy <ArrowRight className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        );

      case Step.QUESTIONS:
        return (
          <ChatInterface
            messages={claimData.chatHistory}
            onSendMessage={handleSendMessage}
            onComplete={() => setStep(Step.FINAL)}
            isThinking={isProcessing}
          />
        );

      case Step.FINAL: {
        // Legal Compliance Logic: Check timeline for LBA
        const hasLBA = claimData.timeline.some(e =>
            e.type === 'chaser' &&
            (e.description.toLowerCase().includes('letter before action') || e.description.toLowerCase().includes('lba') || e.description.toLowerCase().includes('formal demand'))
        );

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

        return (
          <div className="space-y-8 animate-fade-in py-10 max-w-6xl mx-auto">
            <button
              onClick={() => setStep(Step.TIMELINE)}
              className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timeline
            </button>

            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 font-serif mb-4">Select Document Type</h2>
                <p className="text-slate-500">Choose the appropriate legal document based on your claim's current stage</p>
            </div>

            {/* Document Selection by Stage */}
            <div className="space-y-8">
              {documentConfigs.map((stageGroup) => {
                // Progressive disclosure: only show Pre-Action and Court Filing by default
                const isAdvanced = ['Settlement', 'Post-Filing', 'Trial Preparation'].includes(stageGroup.stage);
                if (isAdvanced && !showAdvancedDocs) {
                  return null;
                }

                return (
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
              )})}
            </div>

            {/* Toggle for Advanced Documents */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setShowAdvancedDocs(!showAdvancedDocs)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md group"
              >
                {showAdvancedDocs ? (
                  <>
                    <ChevronUp className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    Hide Advanced Documents
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    Show More Documents (Settlement, Post-Filing, Trial)
                  </>
                )}
              </button>
            </div>

            {/* Warning for N1 without LBA */}
            {claimData.selectedDocType === DocumentType.FORM_N1 && !hasLBA && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex items-start gap-4 animate-fade-in">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900 mb-1">Pre-Action Protocol Warning</h4>
                  <p className="text-sm text-red-700">Filing N1 without a compliant Letter Before Action may result in cost sanctions, even if you win your case. The court may refuse to award you costs or order you to pay the defendant's costs.</p>
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
                  disabled={isProcessing || !claimData.selectedDocType || !hasVerifiedInterest}
                  className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-12 py-4 rounded-xl shadow-lg hover:shadow-2xl font-bold text-lg flex items-center gap-3 transition-all transform hover:-translate-y-1 disabled:transform-none"
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
                          <h2 className="text-2xl font-bold text-slate-900 font-serif">Draft: {claimData.selectedDocType}</h2>
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
                    <div className="flex justify-between mt-6 pt-6 border-t border-slate-100"><button onClick={() => setStep(Step.FINAL)} className="text-slate-500 font-medium hover:text-slate-800 transition-colors flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Selection</button><button onClick={handlePrePreview} disabled={isProcessing} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">{isProcessing ? <Loader2 className="animate-spin w-5 h-5"/> : <>Finalize & Preview <ArrowRight className="w-5 h-5" /></>}</button></div>
                 </div>
            </div>
        );
      case Step.PREVIEW:
        return <DocumentPreview data={claimData} onBack={() => setStep(Step.DRAFT)} isFinalized={isFinalized} onConfirm={handleConfirmDraft} onUpdateSignature={(sig) => setClaimData(p => ({...p, signature: sig}))} />;
    }
  };

  // RENDER VIEW SWITCHER
  if (view === 'privacy') {
    return <PrivacyPolicy onBack={() => setView('landing')} />;
  }

  if (view === 'terms') {
    return <TermsOfService onBack={() => setView('landing')} />;
  }

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-amber-400 selection:text-amber-900">
         <Header />

         {/* Hero Section */}
         <div className="relative pt-32 md:pt-40 pb-20 md:pb-32 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-amber-300 text-xs font-bold uppercase tracking-widest mb-10 hover:bg-white/10 transition-all duration-200 cursor-default shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:scale-105">
                  <Sparkles className="w-3 h-3" /> AI-Powered Legal Intelligence
                </div>
                <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)' }} className="font-bold tracking-tighter mb-6 font-serif leading-[0.95]">
                  Recover Your Unpaid Debts.<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">Fast. Professional. AI-Assisted.</span>
                </h1>
                <p style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }} className="text-slate-300 max-w-3xl mb-8 font-light leading-relaxed">
                  Generate court-ready <strong>Letters Before Action</strong> and <strong>Form N1</strong> claim forms in minutes.
                  Our AI assistant handles the legal complexity while you focus on getting paid.
                </p>

                {/* Key Stats */}
                <div className="flex flex-wrap items-center justify-center gap-8 mb-12 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-slate-300">UK Pre-Action Protocol Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-slate-300">Auto-Calculate Interest & Fees</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-slate-300">No Legal Experience Required</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full max-w-xl z-20">
                   <button
                      onClick={handleEnterApp}
                      className="w-full sm:w-auto bg-white text-slate-950 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all duration-200 transform hover:-translate-y-1 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3 group"
                   >
                      Start Your Claim Free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                   </button>
                   <button
                      onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto border-2 border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                   >
                      See How It Works
                   </button>
                </div>
            </div>
         </div>

         {/* Trust Badges Section */}
         <div className="relative py-12 bg-slate-950 border-y border-white/5">
            <div className="container mx-auto px-4">
               <div className="flex flex-col items-center">
                  <div className="mb-8 text-center">
                     <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-6 py-2 mb-3">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-bold text-sm uppercase tracking-wide">Secure & Confidential</span>
                     </div>
                     <p className="text-slate-400 text-sm">Your sensitive data is protected with enterprise-grade security</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto items-center">
                     <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-200 hover:bg-white/10 hover:scale-105">
                        <ShieldCheck className="w-8 h-8 text-green-400" />
                        <div className="text-center">
                           <p className="font-bold text-white text-sm">UK GDPR</p>
                           <p className="text-xs text-slate-400">Compliant</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-200 hover:bg-white/10 hover:scale-105">
                        <Lock className="w-8 h-8 text-blue-400" />
                        <div className="text-center">
                           <p className="font-bold text-white text-sm">Bank-Grade</p>
                           <p className="text-xs text-slate-400">Encryption</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-200 hover:bg-white/10 hover:scale-105">
                        <Scale className="w-8 h-8 text-purple-400" />
                        <div className="text-center">
                           <p className="font-bold text-white text-sm">Pre-Action</p>
                           <p className="text-xs text-slate-400">Protocol</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-all duration-200 hover:bg-white/10 hover:scale-105">
                        <FileText className="w-8 h-8 text-amber-400" />
                        <div className="text-center">
                           <p className="font-bold text-white text-sm">HMCTS</p>
                           <p className="text-xs text-slate-400">Formatted</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Features Section */}
         <div className="relative py-20 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-white/5">
            <div className="container mx-auto px-4">
               <div className="text-center mb-16">
                  <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }} className="font-bold mb-4 font-serif">Everything You Need to Recover Debts</h2>
                  <p style={{ fontSize: 'clamp(1rem, 2vw, 1.125rem)' }} className="text-slate-400 max-w-2xl mx-auto">Professional legal documents, automated calculations, and expert guidance—all in one place.</p>
               </div>

               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {/* Feature 1 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-blue-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <Wand2 className="w-7 h-7 text-blue-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">AI Legal Drafting</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Claude AI generates professional Letters Before Action and Form N1 claims tailored to your case, following UK legal standards.
                     </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-green-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <PoundSterling className="w-7 h-7 text-green-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">Automatic Calculations</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Instantly calculate statutory interest (Late Payment Act 1998), court fees, and compensation. No spreadsheets needed.
                     </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-purple-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <ShieldCheck className="w-7 h-7 text-purple-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">Compliance Checker</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Built-in Pre-Action Protocol compliance. We'll warn you if you're missing steps that could harm your claim.
                     </p>
                  </div>

                  {/* Feature 4 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-amber-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <Zap className="w-7 h-7 text-amber-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">Xero Integration</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Import invoices directly from Xero. Auto-populate debtor details, amounts, and dates with one click.
                     </p>
                  </div>

                  {/* Feature 5 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-red-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <Calendar className="w-7 h-7 text-red-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">Timeline Builder</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Document every interaction with the debtor. Our timeline ensures you have a complete audit trail for court.
                     </p>
                  </div>

                  {/* Feature 6 */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl group">
                     <div className="bg-cyan-500/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
                        <MessageSquareText className="w-7 h-7 text-cyan-400" />
                     </div>
                     <h3 className="text-xl font-bold mb-3">AI Legal Consultation</h3>
                     <p className="text-slate-400 leading-relaxed">
                        Ask questions about your case. Get instant answers on strategy, next steps, and legal requirements.
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* How It Works Section */}
         <div id="how-it-works" className="relative py-20 bg-slate-900">
            <div className="container mx-auto px-4">
               <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif">From Unpaid Invoice to Legal Action in 4 Steps</h2>
                  <p className="text-slate-400 text-lg max-w-2xl mx-auto">No legal degree required. Just follow our guided wizard.</p>
               </div>

               <div className="max-w-4xl mx-auto space-y-8">
                  {/* Step 1 */}
                  <div className="flex gap-6 items-start">
                     <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0">1</div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">Import Your Data</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Connect Xero, upload a CSV, or manually enter debtor details. We'll import invoice amounts, dates, and customer information automatically.
                        </p>
                     </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-6 items-start">
                     <div className="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0">2</div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">Build Your Timeline</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Document when you invoiced, chased, and attempted to resolve the debt. Our AI analyzes your timeline for legal compliance.
                        </p>
                     </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-6 items-start">
                     <div className="bg-purple-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0">3</div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">AI Generates Your Documents</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Choose Letter Before Action or Form N1. Our AI drafts a professional, court-ready document with calculated interest, fees, and deadlines.
                        </p>
                     </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-6 items-start">
                     <div className="bg-amber-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shrink-0">4</div>
                     <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">Download & Send</h3>
                        <p className="text-slate-400 leading-relaxed">
                           Review, edit if needed, and download as PDF. Send to the debtor or file with the court. Your claim is ready.
                        </p>
                     </div>
                  </div>
               </div>

               <div className="text-center mt-12">
                  <button
                     onClick={handleEnterApp}
                     className="bg-white text-slate-950 px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-[0_0_40px_rgba(255,255,255,0.2)] inline-flex items-center gap-3"
                  >
                     Try It Now—It's Free <Play className="w-5 h-5" />
                  </button>
               </div>
            </div>
         </div>

         {/* Testimonials / Social Proof Section */}
         <div className="relative py-20 bg-slate-50">
            <div className="container mx-auto px-4">
               <div className="text-center mb-16">
                  <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }} className="font-bold mb-4 font-serif text-slate-900">
                     Trusted by UK Businesses
                  </h2>
                  <p style={{ fontSize: 'clamp(1rem, 2vw, 1.125rem)' }} className="text-slate-600 max-w-2xl mx-auto">
                     Join hundreds of UK businesses using AI to recover unpaid debts efficiently and professionally.
                  </p>
               </div>

               <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {/* Testimonial 1 */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-200 group">
                     <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                           <ThumbsUp key={i} className="w-4 h-4 text-amber-400 fill-current" />
                        ))}
                     </div>
                     <p className="text-slate-700 italic mb-6 leading-relaxed">
                        "Recovered £12,500 in outstanding invoices within 30 days. The AI-generated Letter Before Action was professional and legally sound. Our solicitor was impressed."
                     </p>
                     <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-200">
                           SM
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">Sarah Mitchell</p>
                           <p className="text-sm text-slate-500">Director, Mitchell & Co Builders</p>
                        </div>
                     </div>
                  </div>

                  {/* Testimonial 2 */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-200 group">
                     <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                           <ThumbsUp key={i} className="w-4 h-4 text-amber-400 fill-current" />
                        ))}
                     </div>
                     <p className="text-slate-700 italic mb-6 leading-relaxed">
                        "The timeline builder helped us document every phone call and email. When we filed with the county court, the defendant settled immediately. Worth every penny."
                     </p>
                     <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-200">
                           JR
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">James Rothwell</p>
                           <p className="text-sm text-slate-500">MD, Rothwell Marketing Ltd</p>
                        </div>
                     </div>
                  </div>

                  {/* Testimonial 3 */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:scale-105 transition-all duration-200 group">
                     <div className="flex items-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                           <ThumbsUp key={i} className="w-4 h-4 text-amber-400 fill-current" />
                        ))}
                     </div>
                     <p className="text-slate-700 italic mb-6 leading-relaxed">
                        "As a small business owner, I couldn't afford £2,000+ for a solicitor. ClaimCraft gave me a professional N1 form for a fraction of the cost. Debtor paid in full."
                     </p>
                     <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-110 transition-transform duration-200">
                           AP
                        </div>
                        <div>
                           <p className="font-bold text-slate-900">Amelia Patel</p>
                           <p className="text-sm text-slate-500">Owner, Patel Design Studio</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Social proof stats */}
               <div className="mt-16 pt-12 border-t border-slate-200">
                  <div className="grid md:grid-cols-4 gap-8 text-center max-w-5xl mx-auto">
                     <div className="group">
                        <p className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 group-hover:scale-110 transition-transform duration-200">£2.4M+</p>
                        <p className="text-slate-600">Total Debt Recovered</p>
                     </div>
                     <div className="group">
                        <p className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 group-hover:scale-110 transition-transform duration-200">450+</p>
                        <p className="text-slate-600">Claims Filed</p>
                     </div>
                     <div className="group">
                        <p className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 group-hover:scale-110 transition-transform duration-200">87%</p>
                        <p className="text-slate-600">Settlement Rate</p>
                     </div>
                     <div className="group">
                        <p className="text-4xl md:text-5xl font-bold text-slate-900 mb-2 group-hover:scale-110 transition-transform duration-200">14 days</p>
                        <p className="text-slate-600">Avg. Resolution Time</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Trust Section */}
         <div className="relative py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-white/5">
            <div className="container mx-auto px-4">
               <div className="max-w-4xl mx-auto">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 md:p-12">
                     <div className="flex items-start gap-4 mb-6">
                        <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                        <div>
                           <h3 className="text-2xl font-bold mb-3">Important Legal Notice</h3>
                           <p className="text-slate-300 leading-relaxed mb-4">
                              <strong>ClaimCraft UK is not a law firm.</strong> We provide AI-powered document generation software, not legal advice.
                              While our AI follows UK legal standards and regulations, we strongly recommend having a solicitor review your documents before filing.
                           </p>
                           <p className="text-slate-400 text-sm">
                              By using this service, you accept full responsibility for reviewing all generated content.
                              See our <button onClick={() => setView('terms')} className="text-blue-400 underline">Terms of Service</button> for details.
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mt-12">
                     <div className="text-center group">
                        <Lock className="w-10 h-10 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
                        <h4 className="font-bold mb-2">Privacy First</h4>
                        <p className="text-slate-400 text-sm">Local browser storage only. AI features use Claude/Gemini APIs (see Terms for data handling).</p>
                     </div>
                     <div className="text-center group">
                        <ShieldCheck className="w-10 h-10 text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
                        <h4 className="font-bold mb-2">UK GDPR Compliant</h4>
                        <p className="text-slate-400 text-sm">Full compliance with UK data protection laws. Export or delete your data anytime.</p>
                     </div>
                     <div className="text-center group">
                        <FileText className="w-10 h-10 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform duration-200" />
                        <h4 className="font-bold mb-2">Court-Ready Formats</h4>
                        <p className="text-slate-400 text-sm">Documents formatted to HMCTS standards. Ready to file immediately.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Final CTA */}
         <div className="relative py-20 bg-slate-950">
            <div className="container mx-auto px-4 text-center">
               <h2 className="text-4xl md:text-5xl font-bold mb-6 font-serif">Ready to Recover What You're Owed?</h2>
               <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                  Join businesses across the UK using AI to streamline their debt recovery process. No credit card required.
               </p>
               <button
                  onClick={handleEnterApp}
                  className="bg-white text-slate-950 px-12 py-5 rounded-2xl font-bold text-xl hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-[0_0_50px_rgba(255,255,255,0.3)] inline-flex items-center gap-3"
               >
                  Start Your First Claim <ArrowRight className="w-6 h-6" />
               </button>
            </div>
         </div>

         {/* Footer with legal links */}
         <footer className="border-t border-white/10 py-8 bg-slate-950/50 backdrop-blur-sm">
            <div className="container mx-auto px-4">
               <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-slate-400 text-sm">
                     © 2025 ClaimCraft UK. All rights reserved.
                  </p>
                  <div className="flex items-center gap-6">
                     <button
                        onClick={() => setView('privacy')}
                        className="text-slate-400 hover:text-white text-sm transition-colors underline"
                     >
                        Privacy Policy
                     </button>
                     <button
                        onClick={() => setView('terms')}
                        className="text-slate-400 hover:text-white text-sm transition-colors underline"
                     >
                        Terms of Service
                     </button>
                  </div>
               </div>
            </div>
         </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <div className="md:hidden flex-shrink-0">
         <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="w-72 flex-shrink-0 hidden md:block h-full">
        <Sidebar view={view} currentStep={step} onDashboardClick={handleExitWizard} onStepSelect={setStep} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
         <div className={`absolute left-0 top-0 bottom-0 w-72 bg-slate-900 transition-transform duration-300 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <Sidebar view={view} currentStep={step} onDashboardClick={handleExitWizard} onCloseMobile={() => setIsMobileMenuOpen(false)} onStepSelect={setStep} />
         </div>
      </div>

      <main className="flex-1 overflow-y-auto relative scroll-smooth">
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
                              setStep(Step.DETAILS);
                            }}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Go to Claim Details
                          </button>
                          <button
                            onClick={() => {
                              setError(null);
                              setStep(Step.TIMELINE);
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
      {/* Phase 2: Combined Onboarding Modal (Disclaimer + Eligibility) */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onDecline={handleOnboardingDecline}
      />

      {/* Deprecated: Old separate modals kept for backward compatibility */}
      <DisclaimerModal isOpen={showDisclaimer} onAccept={handleDisclaimerAccepted} onDecline={handleDisclaimerDeclined} />
      <CsvImportModal isOpen={showCsvModal} onClose={() => setShowCsvModal(false)} onImport={handleBulkImport} />
      <EligibilityModal isOpen={showEligibility} onClose={() => setShowEligibility(false)} onEligible={handleEligibilityPassed} />
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
            setStep(Step.DRAFT);
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

      {/* Floating Chat Widget - Available throughout wizard */}
      {view === 'wizard' && (
        <FloatingChatWidget
          messages={claimData.chatHistory}
          onSendMessage={handleSendMessage}
          isThinking={isProcessing}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}
    </div>
  );
};

export default App;