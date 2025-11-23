import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EligibilityModal } from './components/EligibilityModal';
import { PartyForm } from './components/PartyForm';
import { Input, TextArea } from './components/ui/Input';
import { DocumentPreview } from './components/DocumentPreview';
import { XeroConnectModal } from './components/XeroConnectModal';
import { CsvImportModal } from './components/CsvImportModal';
import { AssessmentReport } from './components/AssessmentReport';
import { TimelineBuilder } from './components/TimelineBuilder';
import { EvidenceUpload } from './components/EvidenceUpload';
import { ChatInterface } from './components/ChatInterface';
import { DisclaimerModal } from './components/DisclaimerModal';
import { AccountingIntegration } from './components/AccountingIntegration';
import { XeroInvoiceImporter } from './components/XeroInvoiceImporter';
import { analyzeEvidence, startClarificationChat, sendChatMessage, getClaimStrengthAssessment } from './services/geminiService';
import { DocumentBuilder } from './services/documentBuilder';
import { NangoClient } from './services/nangoClient';
import { getStoredAuth } from './services/xeroService';
import { searchCompaniesHouse } from './services/companiesHouse';
import { assessClaimViability, calculateCourtFee, calculateCompensation } from './services/legalRules';
import { getStoredClaims, saveClaimToStorage, deleteClaimFromStorage } from './services/storageService';
import { ClaimState, INITIAL_STATE, Party, InvoiceData, InterestData, DocumentType, PartyType, TimelineEvent, EvidenceFile, ChatMessage, AccountingConnection } from './types';
import { STATUTORY_INTEREST_RATE, DAILY_INTEREST_DIVISOR } from './constants';
import { ArrowRight, Wand2, Loader2, CheckCircle, FileText, Mail, Scale, ArrowLeft, Sparkles, Upload, Zap, ShieldCheck, ChevronRight, Lock, Check, Play, Globe, LogIn, Keyboard, Pencil, MessageSquareText, ThumbsUp, Command, AlertTriangle } from 'lucide-react';

// New view state
type ViewState = 'landing' | 'dashboard' | 'wizard';

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

const App: React.FC = () => {
  // High Level State
  const [view, setView] = useState<ViewState>('landing');
  const [dashboardClaims, setDashboardClaims] = useState<ClaimState[]>([]);
  const [showEligibility, setShowEligibility] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
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
  
  const [showXeroModal, setShowXeroModal] = useState(false);
  const [isXeroConnected, setIsXeroConnected] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false); // For AI flow in Step 2

  // Accounting Integration State
  const [accountingConnection, setAccountingConnection] = useState<AccountingConnection | null>(null);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showXeroImporter, setShowXeroImporter] = useState(false);

  // Initialize Nango on mount
  useEffect(() => {
    NangoClient.initialize();

    // Check if Xero is connected
    const checkXeroConnection = async () => {
      const connected = await NangoClient.isXeroConnected();
      if (connected) {
        const connection = NangoClient.getXeroConnection();
        setAccountingConnection(connection);
      }
    };
    checkXeroConnection();
  }, []);

  // Load data on mount
  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) setIsXeroConnected(true);

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
    // 1. Show disclaimer FIRST
    setShowDisclaimer(true);
  };

  const handleDisclaimerAccepted = () => {
    setShowDisclaimer(false);
    // 2. Then show eligibility check
    setShowEligibility(true);
  };

  const handleDisclaimerDeclined = () => {
    setShowDisclaimer(false);
    // User declined, stay on dashboard
  };

  const handleEligibilityPassed = () => {
    setShowEligibility(false);
    // 3. Reset Wizard and Enter
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
    await deleteClaimFromStorage(id);
    setDashboardClaims(prev => prev.filter(c => c.id !== id));
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
    const interest = calculateInterest(claimData.invoice.totalAmount, claimData.invoice.dateIssued);
    const compensation = calculateCompensation(
        claimData.invoice.totalAmount, 
        claimData.claimant.type, 
        claimData.defendant.type
    );
    const courtFee = calculateCourtFee(claimData.invoice.totalAmount + interest.totalInterest);
    setClaimData(prev => ({ ...prev, interest, courtFee, compensation }));
  }, [
      claimData.invoice.totalAmount, 
      claimData.invoice.dateIssued, 
      claimData.claimant.type, 
      claimData.defendant.type,
      view
  ]);

  const calculateInterest = (amount: number, dateIssued: string): InterestData => {
    if (!dateIssued || !amount) return claimData.interest;
    
    const start = new Date(dateIssued);
    start.setDate(start.getDate() + 30); 
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const dailyRate = (amount * STATUTORY_INTEREST_RATE) / DAILY_INTEREST_DIVISOR;
    const totalInterest = dailyRate * daysOverdue;

    return {
      daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
      dailyRate,
      totalInterest: daysOverdue > 0 ? totalInterest : 0
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
    setIsXeroConnected(true);
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
        const interest = calculateInterest(processed.invoice.totalAmount, processed.invoice.dateIssued);
        const compensation = calculateCompensation(processed.invoice.totalAmount, processed.claimant.type, processed.defendant.type);
        const courtFee = calculateCourtFee(processed.invoice.totalAmount + interest.totalInterest);
        
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
       assessment.strengthScore = aiStrength.score;
       assessment.strengthAnalysis = aiStrength.analysis;
       assessment.weaknesses = aiStrength.weaknesses;
    } catch (e) {
       console.error("AI Assessment failed", e);
    }

    setClaimData(prev => ({ ...prev, assessment }));
    setIsProcessing(false);
    setStep(Step.ASSESSMENT);
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

  const handleDraftClaim = async () => {
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
                <button onClick={() => setShowXeroModal(true)} className={`p-6 border-2 rounded-2xl transition-all flex flex-col items-center gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 ${isXeroConnected ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                    <div className="w-14 h-14 bg-[#13b5ea]/10 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#13b5ea]"/>
                    </div>
                    <div className="text-center">
                       <span className="block font-bold text-slate-900 text-lg">{isXeroConnected ? "Connected" : "Connect Xero"}</span>
                       <span className="text-xs text-slate-500 mt-1 block">Import unpaid invoices</span>
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
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 font-serif mb-4">Claim Details</h2>
                        <p className="text-slate-500">Please ensure all details are correct before legal assessment.</p>
                    </div>
                    <div className="grid xl:grid-cols-2 gap-8">
                        <PartyForm title="Claimant (You)" party={claimData.claimant} onChange={updateClaimant} />
                        <PartyForm title="Defendant (Debtor)" party={claimData.defendant} onChange={updateDefendant} />
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 font-serif">Claim Financials</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Input label="Principal (£)" type="number" value={claimData.invoice.totalAmount} onChange={(e) => updateInvoice('totalAmount', parseFloat(e.target.value))} />
                            <Input label="Invoice Date" type="date" value={claimData.invoice.dateIssued} onChange={(e) => updateInvoice('dateIssued', e.target.value)} />
                            <Input label="Invoice Ref" type="text" value={claimData.invoice.invoiceNumber} onChange={(e) => updateInvoice('invoiceNumber', e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={runAssessment} disabled={!claimData.invoice.totalAmount || !claimData.claimant.name} className="bg-slate-900 text-white px-12 py-4 rounded-xl shadow-lg font-bold text-lg flex items-center gap-3 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {isProcessing ? <Loader2 className="animate-spin" /> : <>Analyze & Assess Claim <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </div>
                </div>
            );
        } else {
            // AI/Xero Analysis Summary View
            return (
                <div className="max-w-3xl mx-auto animate-fade-in py-10">
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
                </div>
            );
        }

      case Step.ASSESSMENT:
        return (
            <div className="py-10">
                <AssessmentReport 
                    assessment={claimData.assessment} 
                    onContinue={() => setStep(Step.TIMELINE)} 
                />
            </div>
        );
      
      case Step.TIMELINE:
        return (
            <div className="space-y-8 py-10">
                <TimelineBuilder 
                    events={claimData.timeline} 
                    onChange={updateTimeline} 
                    invoiceDate={claimData.invoice.dateIssued} 
                />
                <div className="flex justify-end max-w-4xl mx-auto">
                    <button 
                        onClick={handleStartChat} 
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-medium shadow-lg"
                    >
                        Proceed to AI Consultation <MessageSquareText className="w-4 h-4"/>
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
      
      case Step.FINAL:
        // Legal Compliance Logic: Check timeline for LBA
        const hasLBA = claimData.timeline.some(e => 
            e.type === 'chaser' && 
            (e.description.toLowerCase().includes('letter before action') || e.description.toLowerCase().includes('lba') || e.description.toLowerCase().includes('formal demand'))
        );
        
        const recommendedDoc = hasLBA ? DocumentType.FORM_N1 : DocumentType.LBA;

        return (
          <div className="space-y-8 animate-fade-in py-10 max-w-5xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 font-serif mb-4">Legal Strategy</h2>
                <p className="text-slate-500">Based on your timeline, we recommend the following next step to remain compliant.</p>
            </div>

            {/* Strategy Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* OPTION 1: LBA */}
                <div 
                    onClick={() => setClaimData(p => ({...p, selectedDocType: DocumentType.LBA}))}
                    className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer group overflow-hidden ${claimData.selectedDocType === DocumentType.LBA ? 'border-slate-900 bg-slate-900 text-white shadow-2xl scale-105 z-10' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                    {recommendedDoc === DocumentType.LBA && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1 z-20">
                            <Check className="w-3 h-3" /> REQUIRED FIRST STEP
                        </div>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${claimData.selectedDocType === DocumentType.LBA ? 'bg-white/10' : 'bg-blue-50 text-blue-600'}`}>
                            <Mail className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-xl font-serif">Letter Before Action</h3>
                    </div>
                    <p className={`text-sm leading-relaxed mb-6 ${claimData.selectedDocType === DocumentType.LBA ? 'text-slate-300' : 'text-slate-500'}`}>
                        Mandatory under the Pre-Action Protocol for Debt Claims. You must give the debtor 30 days to respond before filing in court.
                    </p>
                    {!hasLBA && (
                        <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${claimData.selectedDocType === DocumentType.LBA ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-700'}`}>
                             <AlertTriangle className="w-4 h-4 shrink-0" />
                             <span>You have not sent a compliant LBA yet. Starting here is strongly advised to avoid court sanctions.</span>
                        </div>
                    )}
                </div>

                {/* OPTION 2: N1 FORM */}
                <div 
                    onClick={() => setClaimData(p => ({...p, selectedDocType: DocumentType.FORM_N1}))}
                    className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer group ${claimData.selectedDocType === DocumentType.FORM_N1 ? 'border-slate-900 bg-slate-900 text-white shadow-2xl scale-105 z-10' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                >
                    {recommendedDoc === DocumentType.FORM_N1 && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm flex items-center gap-1 z-20">
                            <Check className="w-3 h-3" /> NEXT LOGICAL STEP
                        </div>
                    )}
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${claimData.selectedDocType === DocumentType.FORM_N1 ? 'bg-white/10' : 'bg-blue-50 text-blue-600'}`}>
                            <Scale className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-xl font-serif">Form N1 (Claim Form)</h3>
                    </div>
                    <p className={`text-sm leading-relaxed mb-6 ${claimData.selectedDocType === DocumentType.FORM_N1 ? 'text-slate-300' : 'text-slate-500'}`}>
                        The official document to commence legal proceedings in the County Court. Requires a court fee of £{claimData.courtFee}.
                    </p>
                    {!hasLBA && claimData.selectedDocType === DocumentType.FORM_N1 && (
                        <div className="text-xs p-3 rounded-lg flex items-start gap-2 bg-red-500/20 text-red-200">
                             <AlertTriangle className="w-4 h-4 shrink-0" />
                             <span>Warning: Filing N1 without an LBA puts you at risk of costs, even if you win.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Read Only Review Data */}
            <div className="border-t border-slate-200 pt-8 mt-8">
                <div className="flex items-center gap-2 mb-6">
                    <div className="bg-slate-100 p-2 rounded-full"><FileText className="w-5 h-5 text-slate-600" /></div>
                    <h3 className="text-lg font-bold text-slate-700">Case File Summary</h3>
                </div>
                <div className="opacity-80 hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="grid xl:grid-cols-2 gap-8 mb-8">
                        <PartyForm title="Claimant" party={claimData.claimant} onChange={() => {}} readOnly={true} />
                        <PartyForm title="Defendant" party={claimData.defendant} onChange={() => {}} readOnly={true} />
                    </div>
                </div>
                <div className="text-center mt-4 text-xs text-slate-400">
                    Need to change details? <button onClick={() => setStep(Step.DETAILS)} className="text-blue-600 underline hover:text-blue-800">Go back to Step 2</button>
                </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button onClick={handleDraftClaim} disabled={isProcessing} className="bg-slate-900 hover:bg-slate-800 text-white px-12 py-4 rounded-xl shadow-lg hover:shadow-2xl font-bold text-lg flex items-center gap-3 transition-all transform hover:-translate-y-1">
                    {isProcessing ? <Loader2 className="animate-spin"/> : <><Wand2 className="w-5 h-5" /> Generate Document</>}
                </button>
            </div>
          </div>
        );
      case Step.DRAFT:
        return (
            <div className="max-w-5xl mx-auto animate-fade-in py-10">
                 <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col h-[calc(100vh-140px)] relative">
                    <div className="flex justify-between items-center mb-6">
                        <div><h2 className="text-2xl font-bold text-slate-900 font-serif">Draft: {claimData.selectedDocType}</h2><p className="text-sm text-slate-500">Review and edit the generated content below.</p></div>
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
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-amber-400 selection:text-amber-900">
         <Header />
         <div className="relative pt-40 pb-32 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-amber-300 text-xs font-bold uppercase tracking-widest mb-10 hover:bg-white/10 transition-all cursor-default shadow-[0_0_20px_rgba(251,191,36,0.2)]"><Sparkles className="w-3 h-3" /> AI-Powered Legal Intelligence</div>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-8 font-serif leading-[0.95]">Justice. <br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">Simplified.</span></h1>
                <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-14 font-light leading-relaxed">Draft court-perfect <strong>Small Claims</strong> filings in minutes. Our AI Legal Assistant verifies facts, eliminates hallucinations, and formats your <strong>Form N1</strong> instantly.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full max-w-md z-20">
                   <button onClick={handleEnterApp} className="w-full bg-white text-slate-950 h-16 rounded-2xl font-bold text-xl hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 group">Get Started <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></button>
                </div>
            </div>
         </div>
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
            />}
            {view === 'wizard' && renderWizardStep()}
         </div>
      </main>
      <DisclaimerModal isOpen={showDisclaimer} onAccept={handleDisclaimerAccepted} onDecline={handleDisclaimerDeclined} />
      <XeroConnectModal isOpen={showXeroModal} onClose={() => setShowXeroModal(false)} onImport={handleLegacyXeroImport} />
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
    </div>
  );
};

export default App;