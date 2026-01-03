import React, { useState, useEffect } from 'react';
import { ClaimState, DocumentType, PartyType } from '../types';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Printer, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle, Lock, XCircle, PenTool, Send, Loader2, FileDown, RefreshCw, ExternalLink, CreditCard, Settings, Mail, ZoomIn, ZoomOut, Maximize2, FileText, Info, MessageSquare, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getCurrencySymbol } from '../utils/calculations';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { Modal } from './ui/Modal';
import { SegmentedControl } from './ui/SegmentedControl';
import { SignaturePad } from './SignaturePad';
import { FinalReviewModal } from './FinalReviewModal';
import { ConfirmModal } from './ConfirmModal';
import { PaymentModal } from './PaymentModal';
import { SendConfirmationModal } from './SendConfirmationModal';
import { generateN1PDF, generateN225PDF, generateN225APDF, generateN180PDF, generateLetterPDF, captureElementAsCanvas, generateBundledPDFFromCanvases } from '../services/pdfGenerator';

interface DocumentPreviewProps {
  data: ClaimState;
  onBack: () => void;
  isFinalized: boolean;
  onConfirm: () => void;
  onUpdateSignature: (sig: string) => void;
  onUpdateContent: (content: string) => void;
  onSendPhysicalMail?: () => Promise<void>;
  onOpenMcol?: () => void;
  mailSuccess?: boolean;
  onPaymentComplete?: (paymentIntentId: string) => void;
  onMarkAsFiled?: () => void; // Issue 7: Mark N1 as filed to unlock post-filing docs
  onFinish?: () => void; // Navigate to dashboard after completion
}

// Legal context explanations for document validation issues
// Helps users understand WHY each issue matters legally
const ISSUE_LEGAL_CONTEXT: { pattern: RegExp; context: string }[] = [
  {
    pattern: /amount|£\d+|principal|total/i,
    context: 'Pre-Action Protocol requires accurate statement of claim value including all elements (principal, interest, and fees).'
  },
  {
    pattern: /interest|late payment|1998|citation/i,
    context: 'The Late Payment of Commercial Debts (Interest) Act 1998 must be cited for B2B statutory interest claims.'
  },
  {
    pattern: /days?\s*(overdue|calculation)|period/i,
    context: 'Interest calculation must use the correct number of days for accurate claim value.'
  },
  {
    pattern: /party|claimant|defendant|name/i,
    context: 'CPR requires clear identification of all parties to proceedings.'
  },
  {
    pattern: /case\s*law|citation|fabricat|hallucinat/i,
    context: 'SRA rules require accurate legal citations - fabricated case law is professional misconduct.'
  }
];

// Match an issue to its legal context explanation
const getLegalContext = (issue: string): string | null => {
  for (const { pattern, context } of ISSUE_LEGAL_CONTEXT) {
    if (pattern.test(issue)) {
      return context;
    }
  }
  return null;
};

// A4 Page Wrapper with optional Watermark and Overflow Handling
// Mobile responsive: full width on small screens, A4 width on larger screens
// Tablet: scales to fit viewport without horizontal scroll
const Page = ({ children, className = "", watermark = false, id }: { children?: React.ReactNode; className?: string; watermark?: boolean; id?: string }) => (
  <div id={id} className={`bg-white shadow-xl w-full max-w-full md:w-[210mm] md:max-w-none min-h-[297mm] mx-auto p-4 md:p-[10mm] mb-8 relative text-black text-sm border border-slate-200 print:shadow-none print:border-none print:w-full print:p-0 print:m-0 print:mb-[20mm] break-after-page overflow-visible flex-shrink-0 ${className}`}>
    {watermark && (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-15 select-none overflow-hidden">
        <div className="transform -rotate-45 text-3xl sm:text-5xl md:text-8xl font-bold text-slate-900 whitespace-nowrap border-4 md:border-[10px] border-slate-900 p-4 md:p-10 rounded-2xl mix-blend-multiply">
           DRAFT - REVIEW PENDING
        </div>
      </div>
    )}
    {children}
  </div>
);

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  data,
  onBack,
  isFinalized,
  onConfirm,
  onUpdateSignature,
  onUpdateContent,
  onSendPhysicalMail,
  onOpenMcol,
  mailSuccess = false,
  onPaymentComplete,
  onMarkAsFiled,
  onFinish
}) => {
  const [viewMode, setViewMode] = useState<'letter' | 'reply-form' | 'info-sheet' | 'n1-form'>('letter');
  const [isSigning, setIsSigning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [emailOpenedSuccess, setEmailOpenedSuccess] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [cachedPdfBlob, setCachedPdfBlob] = useState<Blob | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<'download' | 'send' | null>(null);

  // Send confirmation modal state
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false);
  const [pendingSendMethod, setPendingSendMethod] = useState<'email' | 'post'>('email');

  // Download dropdown state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = React.useRef<HTMLDivElement>(null);

  // Fullscreen preview state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Post-download guidance state
  const [showPostDownloadGuidance, setShowPostDownloadGuidance] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu]);

  // Content editing state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // N1 Particulars editing modal state
  const [showParticularsModal, setShowParticularsModal] = useState(false);
  const [editedParticulars, setEditedParticulars] = useState('');

  // Zoom controls state
  const [zoom, setZoom] = useState(100);
  const zoomLevels = [50, 75, 100, 125, 150];
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoom(100);

  // Collapsible correction details state
  const [showCorrectionDetails, setShowCorrectionDetails] = useState(false);

  // Tablet responsive scaling - uses CSS-based scaling to avoid state updates
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');

  // For tablet, use a fixed scale that fits most tablets (avoid state updates)
  // 85% scale fits 210mm (794px) into ~900px viewport with padding
  const effectiveZoom = isTablet ? 85 : zoom;

  const review = data.generated?.review;

  // Forms that require final review checklist (all court forms with Statement of Truth)
  const formsRequiringReview = [
    DocumentType.FORM_N1,
    DocumentType.DEFAULT_JUDGMENT,
    DocumentType.ADMISSION,
    DocumentType.DIRECTIONS_QUESTIONNAIRE
  ];

  const handlePrint = () => {
    // For court forms (PDF-based), open PDF in new tab for printing
    if (!isLetter && pdfPreviewUrl) {
      window.open(pdfPreviewUrl, '_blank');
      return;
    }

    // For letter documents, print the HTML content
    const containerIds: Record<string, string> = {
      'letter': 'letter-preview-container',
      'info-sheet': 'info-sheet-container',
      'reply-form': 'reply-form-container'
    };

    const containerId = containerIds[viewMode] || 'letter-preview-container';
    let container = document.getElementById(containerId);

    if (!container) {
      console.error(`Print container '${containerId}' not found`);
      // Try fallback to letter container
      container = document.getElementById('letter-preview-container');
      if (!container) {
        alert('Unable to find document content to print. Please try downloading as PDF instead.');
        return;
      }
    }

    const printContent = container.innerHTML;

    if (!printContent) {
      alert('No document content to print. Please ensure a document is generated.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print the document, or use the Download PDF option instead.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Document</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 20mm;
              margin: 0;
              line-height: 1.6;
              color: #000;
              font-size: 11pt;
              background: #fff;
            }
            @page {
              margin: 15mm;
              size: A4;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
            /* Hide elements marked as no-print */
            .no-print, [class*="no-print"], .absolute { display: none !important; }
            /* Typography */
            h1, h2, h3, h4 { font-family: Arial, sans-serif; margin-bottom: 0.5em; }
            h1 { font-size: 18pt; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; }
            p { margin-bottom: 0.8em; }
            .font-bold, strong, b { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }
            .text-xs { font-size: 10pt; }
            .text-sm { font-size: 11pt; }
            .text-lg { font-size: 14pt; }
            .text-xl { font-size: 16pt; }
            .uppercase { text-transform: uppercase; }
            .leading-relaxed { line-height: 1.625; }
            .break-words { word-wrap: break-word; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            /* Layout */
            .max-w-\\[90\\%\\], .max-w-\\[95\\%\\] { max-width: 100%; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-12 { margin-bottom: 3rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-16 { margin-top: 4rem; }
            .mt-20 { margin-top: 5rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pt-8 { padding-top: 2rem; }
            .pt-10 { padding-top: 2.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .pl-4 { padding-left: 1rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            /* Borders */
            .border { border: 1px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-b { border-bottom: 1px solid #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-black { border-color: #000; }
            .border-slate-300 { border-color: #cbd5e1; }
            /* Background */
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            /* Tables */
            table { border-collapse: collapse; width: 100%; }
            td, th { padding: 8px; vertical-align: top; }
            /* Lists */
            ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
            li { margin-bottom: 0.25rem; }
            .list-disc { list-style-type: disc; }
            .list-inside { list-style-position: inside; }
            /* Grid for 2-column layouts */
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .gap-2 { gap: 0.5rem; }
            .gap-4 { gap: 1rem; }
            /* Flex */
            .flex { display: flex; }
            .items-center { align-items: center; }
            /* Signature area */
            img { max-height: 60px; object-fit: contain; }
            .h-20 { height: 5rem; }
            .h-16 { height: 4rem; }
            /* Inline-block for signature line */
            .inline-block { display: inline-block; }
            .min-w-\\[200px\\] { min-width: 200px; }
            /* Checkbox boxes for forms */
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            /* Hide dashed signature placeholder button */
            button { display: none; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Small delay to ensure content is fully rendered before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  // Download type for dropdown options
  type DownloadType = 'main' | 'bundle' | 'info-sheet' | 'reply-form';
  const [pendingDownloadType, setPendingDownloadType] = useState<DownloadType>('main');

  const handleDownloadPDF = async (downloadType: DownloadType = 'main') => {
    setShowDownloadMenu(false);
    setPendingDownloadType(downloadType);

    // Show Final Review Modal for all court forms before download
    if (formsRequiringReview.includes(data.selectedDocType)) {
      setShowFinalReview(true);
      return;
    }

    // For other documents (letters), proceed directly
    await performDownload(downloadType);
  };

  const performDownload = async (downloadType: DownloadType = 'main') => {
    // Handle specific attachment downloads for letters
    if (isLetter && (downloadType === 'info-sheet' || downloadType === 'reply-form')) {
      setIsGeneratingPdf(true);
      try {
        const containerId = downloadType === 'info-sheet' ? 'info-sheet-container' : 'reply-form-container';
        // Temporarily switch view mode to render the attachment
        const previousMode = viewMode;
        setViewMode(downloadType);
        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));

        const blob = await generateLetterPDF(containerId);
        const filename = downloadType === 'info-sheet'
          ? `Pre_Action_Protocol_Info_Sheet.pdf`
          : `Reply_Form_${data.invoice.invoiceNumber}.pdf`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Restore view mode
        setViewMode(previousMode);
      } catch (error) {
        console.error(`Failed to generate ${downloadType} PDF`, error);
        setPdfError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsGeneratingPdf(false);
      }
      return;
    }

    // Handle bundle download (main + attachments)
    if (isLetter && downloadType === 'bundle') {
      setIsGeneratingPdf(true);
      const previousMode = viewMode;
      const capturedCanvases: HTMLCanvasElement[] = [];

      try {
        // For LBA, include: Main Letter + Info Sheet + Reply Form
        // For other letters (Polite Chaser), just the main document

        // Capture main letter first
        setViewMode('letter');
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for render
        const letterCanvas = await captureElementAsCanvas('letter-preview-container');
        if (letterCanvas) capturedCanvases.push(letterCanvas);

        // For LBA, also capture annexes
        if (showAnnexes) {
          // Capture Info Sheet
          setViewMode('info-sheet');
          await new Promise(resolve => setTimeout(resolve, 200));
          const infoCanvas = await captureElementAsCanvas('info-sheet-container');
          if (infoCanvas) capturedCanvases.push(infoCanvas);

          // Capture Reply Form
          setViewMode('reply-form');
          await new Promise(resolve => setTimeout(resolve, 200));
          const replyCanvas = await captureElementAsCanvas('reply-form-container');
          if (replyCanvas) capturedCanvases.push(replyCanvas);
        }

        if (capturedCanvases.length === 0) {
          throw new Error('No documents could be captured for the bundle');
        }

        // Generate the bundled PDF from captured canvases
        const blob = await generateBundledPDFFromCanvases(capturedCanvases);
        const docTypeSlug = data.selectedDocType.replace(/\s+/g, '_');
        const filename = `${docTypeSlug}_Complete_Bundle_${data.invoice.invoiceNumber || 'document'}.pdf`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to generate bundle PDF", error);
        setPdfError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        // Restore original view mode
        setViewMode(previousMode);
        setIsGeneratingPdf(false);
      }
      return;
    }

    // Check if this document type has an official PDF form
    const pdfFormTypes = [
      DocumentType.FORM_N1,
      DocumentType.DEFAULT_JUDGMENT,
      DocumentType.ADMISSION,
      DocumentType.DIRECTIONS_QUESTIONNAIRE
    ];

    if (pdfFormTypes.includes(data.selectedDocType)) {
      setIsGeneratingPdf(true);
      setPdfError(null);
      try {
        let blob: Blob;
        let filename: string;

        // Use cached blob for N1 if available, otherwise generate
        if (data.selectedDocType === DocumentType.FORM_N1 && cachedPdfBlob) {
          blob = cachedPdfBlob;
          filename = `N1_Claim_Form_${data.invoice.invoiceNumber}.pdf`;
        } else {
          let pdfBytes: Uint8Array;

          switch (data.selectedDocType) {
            case DocumentType.FORM_N1:
              pdfBytes = await generateN1PDF(data);
              filename = `N1_Claim_Form_${data.invoice.invoiceNumber}.pdf`;
              break;
            case DocumentType.DEFAULT_JUDGMENT:
              pdfBytes = await generateN225PDF(data);
              filename = `N225_Default_Judgment_${data.invoice.invoiceNumber}.pdf`;
              break;
            case DocumentType.ADMISSION:
              pdfBytes = await generateN225APDF(data);
              filename = `N225A_Admission_${data.invoice.invoiceNumber}.pdf`;
              break;
            case DocumentType.DIRECTIONS_QUESTIONNAIRE:
              pdfBytes = await generateN180PDF(data);
              filename = `N180_Directions_Questionnaire_${data.invoice.invoiceNumber}.pdf`;
              break;
            default:
              throw new Error('Unsupported PDF form type');
          }

          // TS-safe: copy into a new Uint8Array backed by an ArrayBuffer
          const bytes = new Uint8Array(pdfBytes);
          blob = new Blob([bytes.buffer], { type: 'application/pdf' });
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename!;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show post-download guidance for court forms
        setShowPostDownloadGuidance(true);
      } catch (error) {
        console.error("Failed to generate PDF", error);
        setPdfError(error instanceof Error ? error.message : 'Unknown error');
        throw error; // Re-throw so FinalReviewModal knows it failed
      } finally {
        setIsGeneratingPdf(false);
      }
    } else if (isLetter) {
      // For letter documents (LBA, Polite Chaser, etc.), use html2canvas + jsPDF
      setIsGeneratingPdf(true);
      setPdfError(null);
      try {
        const blob = await generateLetterPDF('letter-preview-container');
        const docTypeSlug = data.selectedDocType.replace(/\s+/g, '_');
        const filename = `${docTypeSlug}_${data.invoice.invoiceNumber || 'document'}.pdf`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to generate letter PDF", error);
        setPdfError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      // Fallback for any other document types
      window.print();
    }
  };

  const handleSend = async () => {
    // Show confirmation modal before sending
    setPendingSendMethod('post');
    setShowSendConfirmModal(true);
  };

  const performPostalSend = async () => {
    setShowSendConfirmModal(false);

    if (onSendPhysicalMail) {
      setIsSending(true);
      try {
        await onSendPhysicalMail();
        // Success state handled by parent via mailSuccess prop or we can set it here if parent doesn't re-mount
      } catch (e) {
        console.error("Failed to send", e);
      } finally {
        setIsSending(false);
      }
    } else {
      // Fallback mock
      setIsSending(true);
      setTimeout(() => {
        setIsSending(false);
        setSendSuccess(true);
      }, 2000);
    }
  };

  // Handle payment success - continue with pending action
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentModal(false);

    // Call parent to update payment state
    if (onPaymentComplete) {
      onPaymentComplete(paymentIntentId);
    }

    // Continue with the pending action after a brief delay for state update
    setTimeout(async () => {
      if (pendingPaymentAction === 'download') {
        // For court forms, show final review; otherwise download directly
        if (formsRequiringReview.includes(data.selectedDocType)) {
          setShowFinalReview(true);
        } else {
          await performDownload(pendingDownloadType);
        }
      } else if (pendingPaymentAction === 'send') {
        // Trigger send
        if (onSendPhysicalMail) {
          setIsSending(true);
          try {
            await onSendPhysicalMail();
          } catch (e) {
            console.error("Failed to send", e);
          } finally {
            setIsSending(false);
          }
        }
      }
      setPendingPaymentAction(null);
    }, 100);
  };

  const today = new Date().toLocaleDateString('en-GB');
  const claimAmount = data.invoice.totalAmount;
  const totalInterest = data.interest.totalInterest;
  const compensation = data.compensation;
  const courtFee = data.courtFee;
  const legalCosts = 0; // Standard assumption for small claims
  const totalAmount = (claimAmount + totalInterest + compensation + courtFee + legalCosts).toFixed(2);

  const isLetter = data.generated?.documentType === DocumentType.LBA ||
                   data.generated?.documentType === DocumentType.POLITE_CHASER ||
                   data.generated?.documentType === DocumentType.INSTALLMENT_AGREEMENT;

  // Check if this is a Polite Reminder (no annexes needed)
  const isPoliteReminder = data.generated?.documentType === DocumentType.POLITE_CHASER;
  // Only show Pre-Action Protocol annexes for LBA, not for Polite Reminders
  const showAnnexes = isLetter && !isPoliteReminder;

  // Initial load effect to set correct mode
  React.useEffect(() => {
     if(!isLetter) setViewMode('n1-form');
  }, [isLetter]);

  // Generate PDF preview for N1 forms (regenerates when data changes)
  React.useEffect(() => {
    const pdfFormTypes = [
      DocumentType.FORM_N1,
      DocumentType.DEFAULT_JUDGMENT,
      DocumentType.ADMISSION,
      DocumentType.DIRECTIONS_QUESTIONNAIRE
    ];

    if (!pdfFormTypes.includes(data.selectedDocType)) {
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);
    setPdfError(null);

    const generatePdf = async () => {
      try {
        let pdfBytes: Uint8Array;
        switch (data.selectedDocType) {
          case DocumentType.FORM_N1:
            pdfBytes = await generateN1PDF(data);
            break;
          case DocumentType.DEFAULT_JUDGMENT:
            pdfBytes = await generateN225PDF(data);
            break;
          case DocumentType.ADMISSION:
            pdfBytes = await generateN225APDF(data);
            break;
          case DocumentType.DIRECTIONS_QUESTIONNAIRE:
            pdfBytes = await generateN180PDF(data);
            break;
          default:
            return;
        }

        if (cancelled) return;
        const bytes = new Uint8Array(pdfBytes);
        const blob = new Blob([bytes.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to generate PDF preview:', error);
          setPdfError(error instanceof Error ? error.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      }
    };

    generatePdf();

    return () => {
      cancelled = true;
    };
  }, [data]);

  // Cleanup: revoke URL when it changes or component unmounts
  React.useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleEmailLba = () => {
    // Payment gate: show modal if unpaid
    if (!data.hasPaid) {
        setPendingPaymentAction('send'); // Use 'send' context for payment modal text
        setShowPaymentModal(true);
        return;
    }

    // Show confirmation modal before sending
    setPendingSendMethod('email');
    setShowSendConfirmModal(true);
  };

  const performEmailLba = () => {
    // Generate mailto link
    const subject = encodeURIComponent(`Letter Before Action - Invoice ${data.invoice.invoiceNumber}`);
    const body = encodeURIComponent(`Dear ${data.defendant.name},

Please find attached a Letter Before Action regarding the outstanding balance of ${getCurrencySymbol(data.invoice.currency)}${data.invoice.totalAmount.toFixed(2)}.

${data.generated?.content?.substring(0, 200)}...

Please treat this matter with urgency.

Sincerely,
${data.claimant.name}`);

    // If debtor has email, pre-fill it
    const recipient = data.defendant.email || '';

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;

    // UX: mailto opens the user's email client; we should not claim it was "sent".
    setEmailOpenedSuccess(true);
    setTimeout(() => setEmailOpenedSuccess(false), 5000);
    setShowSendConfirmModal(false);
  };

  // Reset preview URL when switching away from N1
  React.useEffect(() => {
    if (data.selectedDocType !== DocumentType.FORM_N1 && 
        data.selectedDocType !== DocumentType.DEFAULT_JUDGMENT &&
        data.selectedDocType !== DocumentType.ADMISSION &&
        data.selectedDocType !== DocumentType.DIRECTIONS_QUESTIONNAIRE && 
        pdfPreviewUrl) {
      setPdfPreviewUrl(null);
    }
  }, [data.selectedDocType, pdfPreviewUrl]);

  if (mailSuccess || sendSuccess || emailOpenedSuccess) {
     const isLBA = data.selectedDocType === DocumentType.LBA;
     return (
       <div className="max-w-lg mx-auto mt-12 text-center animate-fade-in">
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
             <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {emailOpenedSuccess ? 'Email Draft Ready!' : 'Successfully Sent!'}
          </h2>
          <p className="text-lg text-teal-600 font-medium mb-6">
            Your {isLBA ? 'Letter Before Action' : 'document'} is on its way
          </p>

          {/* What happens next */}
          <div className="bg-slate-50 rounded-xl p-6 text-left mb-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">What happens next:</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              {isLBA ? (
                <>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</span>
                    <span>The debtor has <strong>30 days</strong> to respond to your letter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</span>
                    <span>If no response, you can proceed to court using <strong>Form N1</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</span>
                    <span>We'll remind you before the deadline expires</span>
                  </li>
                </>
              ) : (
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Your document has been sent. Track its status in your dashboard.</span>
                </li>
              )}
            </ul>
          </div>

          {emailOpenedSuccess && (
            <p className="text-sm text-slate-500 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <strong>Tip:</strong> Attach your downloaded PDF to the email before sending.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onFinish || onBack} className="px-8">
              View in Dashboard
            </Button>
          </div>
       </div>
     );
  }

  // Render warning panels - extracted for split-pane layout
  const renderWarningPanels = () => (
    <>
      {/* CRITICAL: Compliance Check Panel */}
      {!isFinalized && review && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in no-print ring-4 ring-slate-50">
           {review.isPass ? (
             /* GREEN "Verified" panel - shows when document passed or was auto-corrected */
             <>
               <div className="p-4 bg-green-50 border-b border-green-100">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-full bg-green-100">
                       <ShieldCheck className="w-6 h-6 text-green-700" />
                     </div>
                     <div>
                       <h3 className="font-bold text-lg text-green-900">Document Verified</h3>
                       <p className="text-sm text-green-700">
                         {review.wasAutoCorrected
                           ? 'Compliance check completed. Minor issues were automatically corrected.'
                           : 'Automated compliance check passed.'}
                       </p>
                     </div>
                   </div>
                   {/* Collapsible toggle - only show if auto-corrected */}
                   {review.wasAutoCorrected && review.originalImprovements && review.originalImprovements.length > 0 && (
                     <button
                       onClick={() => setShowCorrectionDetails(!showCorrectionDetails)}
                       className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-green-100"
                     >
                       {showCorrectionDetails ? 'Hide' : 'View'} corrections
                       {showCorrectionDetails
                         ? <ChevronUp className="w-4 h-4" />
                         : <ChevronDown className="w-4 h-4" />
                       }
                     </button>
                   )}
                 </div>
               </div>

               {/* Collapsible details section - shows what was auto-corrected */}
               {review.wasAutoCorrected && showCorrectionDetails && review.originalImprovements && (
                 <div className="p-4 bg-slate-50 border-t border-slate-100 animate-fade-in">
                   <p className="text-xs font-bold text-slate-500 uppercase mb-3">Auto-Corrections Applied</p>
                   <ul className="space-y-2">
                     {review.originalImprovements.map((imp, i) => (
                       <li key={i} className="flex items-start gap-3 text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                         <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                         <span className="line-through opacity-60 flex-1">{imp}</span>
                         <span className="text-green-600 font-medium text-xs uppercase">Fixed</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               {/* Action buttons for verified state */}
               <div className="p-4 flex justify-end border-t border-slate-100">
                 <Button
                   onClick={onConfirm}
                   variant="primary"
                   icon={<CheckCircle className="w-4 h-4" />}
                 >
                   Approve & Finalize
                 </Button>
               </div>
             </>
           ) : (
             /* RED warning panel - shows when auto-correction failed or wasn't possible */
             <>
               {(() => {
                 const critique = (review.critique || '').toLowerCase();
                 const isUnavailable =
                   critique.includes('unavailable') || critique.includes('failed') || critique.includes('could not');

                 return (
                   <div className="p-4 flex items-center justify-between bg-red-50 border-b border-red-100">
                     <div className="flex items-center gap-3">
                       <div className="p-2 rounded-full bg-red-100">
                         <AlertTriangle className="w-6 h-6 text-red-700" />
                       </div>
                       <div>
                         <h3 className="font-bold text-lg text-red-900">
                           {isUnavailable ? "Review Required" : "Issues Detected"}
                         </h3>
                         <p className="text-sm text-slate-600">
                           {isUnavailable
                             ? 'Automated review unavailable. Please verify the document manually.'
                             : 'Some issues could not be auto-corrected. Please review and edit.'}
                         </p>
                       </div>
                     </div>
                   </div>
                 );
               })()}
               <div className="p-4">
                 <div className="flex gap-4 mb-6">
                   <div className="w-1 bg-slate-200 rounded-full self-stretch"></div>
                   <div>
                     <p className="font-bold text-slate-900 mb-1 text-sm uppercase tracking-wider">Review Summary</p>
                     <p className="text-slate-700 italic text-lg font-serif leading-relaxed">"{review.critique}"</p>
                   </div>
                 </div>

                 {review.improvements && review.improvements.length > 0 && (
                   <div className="mb-8 pl-5">
                     <p className="text-xs font-bold text-slate-500 uppercase mb-3">Items to Address</p>
                     <ul className="space-y-3">
                       {review.improvements.map((imp, i) => {
                         const legalContext = getLegalContext(imp);
                         return (
                           <li key={i} className="bg-red-50 rounded-lg border border-red-100 overflow-hidden">
                             <div className="flex items-start gap-3 text-sm font-medium text-red-700 p-2.5">
                               <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                               <span className="flex-1">{imp}</span>
                             </div>
                             {legalContext && (
                               <div className="flex items-start gap-2 px-2.5 pb-2.5 pt-0 ml-8">
                                 <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                 <p className="text-xs text-slate-500 leading-relaxed">{legalContext}</p>
                               </div>
                             )}
                           </li>
                         );
                       })}
                     </ul>
                   </div>
                 )}

                 <div className="flex flex-col md:flex-row justify-end gap-4 pt-6 border-t border-slate-100">
                   <Button
                     variant="secondary"
                     onClick={onBack}
                     className="px-6"
                   >
                     Back & Edit Data
                   </Button>
                   <Button
                     onClick={() => setShowOverrideConfirm(true)}
                     variant="danger"
                     icon={<CheckCircle className="w-4 h-4" />}
                   >
                     Override & Approve
                   </Button>
                 </div>
               </div>
             </>
           )}
        </div>
      )}

      {/* Quality Recommendations Panel - Shows SECOND (amber suggestions) */}
      {!isFinalized && (
        <div className="mb-4 bg-white rounded-xl border border-amber-200 shadow-lg overflow-hidden animate-fade-in no-print">
          <div className="p-4 flex items-center gap-3 bg-amber-50 border-b border-amber-100">
            <div className="p-2 rounded-full bg-amber-100">
              <Info className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Quality Recommendations</h3>
              <p className="text-sm text-amber-700">Best practice suggestions for a stronger claim</p>
            </div>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {isLetter && !data.signature && (
                <li className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <PenTool className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Add your signature</strong> – Signed letters carry more weight and show genuine intent.</span>
                </li>
              )}
              {data.timeline.length < 2 && (
                <li className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Consider adding more timeline events</strong> – A detailed timeline strengthens your narrative.</span>
                </li>
              )}
              {!data.invoice.dueDate && (
                <li className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Specify the due date</strong> – A clear due date is important for calculating interest accurately.</span>
                </li>
              )}
              {isLetter && data.evidence.length === 0 && (
                <li className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Attach supporting evidence</strong> – Consider including the original invoice or contract.</span>
                </li>
              )}
              {(data.signature || !isLetter) && data.timeline.length >= 2 && data.invoice.dueDate && (data.evidence.length > 0 || !isLetter) && (
                <li className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span><strong>Looking good!</strong> – Review the document carefully before finalizing.</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Payment Warning */}
      {!data.hasPaid && (
        <div className="mb-4 no-print">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Preview is free</p>
              <p className="text-amber-800">
                To download PDFs or send by post/email, you'll be prompted to unlock this document.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto pb-10">

      {/* Actions Bar - Always at top, full width */}
      <div className="flex flex-col md:flex-row justify-end items-center mb-6 no-print gap-4 px-4 md:px-0">
        <div className="flex flex-wrap gap-2 items-center justify-center">
           {isLetter && (
             <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
               <button
                 onClick={() => setViewMode('letter')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                   viewMode === 'letter'
                     ? 'bg-white text-teal-700 shadow-sm'
                     : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                 }`}
               >
                 <FileText className="w-4 h-4" />
                 <span>Letter</span>
               </button>
               {showAnnexes && (
                 <button
                   onClick={() => setViewMode('info-sheet')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                     viewMode === 'info-sheet'
                       ? 'bg-white text-teal-700 shadow-sm'
                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                   }`}
                 >
                   <Info className="w-4 h-4" />
                   <span>Info Sheet</span>
                 </button>
               )}
               {showAnnexes && (
                 <button
                   onClick={() => setViewMode('reply-form')}
                   className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                     viewMode === 'reply-form'
                       ? 'bg-white text-teal-700 shadow-sm'
                       : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                   }`}
                 >
                   <MessageSquare className="w-4 h-4" />
                   <span>Reply Form</span>
                 </button>
               )}
             </div>
           )}

          {isFinalized ? (
              <div className="flex gap-2">
                {onOpenMcol && !isLetter && (
                  <Button
                    onClick={onOpenMcol}
                    className="bg-slate-800 hover:bg-slate-900"
                    icon={<ExternalLink className="w-4 h-4" />}
                  >
                    <span className="hidden md:inline">File on MCOL</span>
                    <span className="md:hidden">MCOL</span>
                  </Button>
                )}

                {onMarkAsFiled && data.selectedDocType === DocumentType.FORM_N1 && data.status !== 'court' && data.status !== 'judgment' && (
                  <Button
                    onClick={onMarkAsFiled}
                    variant="secondary"
                    className="border-teal-500 text-teal-700 hover:bg-teal-50"
                    icon={<CheckCircle className="w-4 h-4" />}
                  >
                    <span className="hidden md:inline">Mark as Filed</span>
                    <span className="md:hidden">Filed</span>
                  </Button>
                )}

                {!isLetter && (
                    <Button
                        variant={data.hasPaid ? 'secondary' : 'primary'}
                        onClick={handleDownloadPDF}
                        isLoading={isGeneratingPdf}
                        className={data.hasPaid ? 'border-slate-200' : 'border-teal-600'}
                        icon={!isGeneratingPdf && (data.hasPaid ? <FileDown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />)}
                    >
                        <span className="hidden md:inline">
                          {data.hasPaid ? 'Download PDF' : 'Download PDF (£2.50)'}
                        </span>
                        <span className="md:hidden">
                          {data.hasPaid ? 'PDF' : '£2.50'}
                        </span>
                    </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  icon={<Printer className="w-4 h-4" />}
                  aria-label="Print document"
                >
                  <span className="hidden md:inline">Print</span>
                </Button>

                {/* Download Dropdown for Letters */}
                {isLetter && (
                  <div className="relative" ref={downloadMenuRef}>
                    <Button
                      variant={data.hasPaid ? 'secondary' : 'primary'}
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      isLoading={isGeneratingPdf}
                      className={data.hasPaid ? 'border-slate-200' : 'border-teal-600'}
                      icon={!isGeneratingPdf && (data.hasPaid ? <FileDown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />)}
                      aria-label="Download PDF"
                    >
                      <span className="hidden md:inline">
                        {data.hasPaid ? 'Download' : 'Download (£2.50)'}
                      </span>
                      <span className="md:hidden">
                        {data.hasPaid ? 'PDF' : '£2.50'}
                      </span>
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                    </Button>

                    {/* Download Dropdown Menu */}
                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1">
                        <button
                          onClick={() => handleDownloadPDF('main')}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-slate-400" />
                          Main Document Only
                        </button>
                        <button
                          onClick={() => handleDownloadPDF('bundle')}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <FileDown className="w-4 h-4 text-teal-500" />
                          Complete Bundle (All)
                        </button>
                        {showAnnexes && (
                          <>
                            <div className="border-t border-slate-100 my-1" />
                            <p className="px-4 py-1 text-xs text-slate-400 font-medium">Individual Attachments</p>
                            <button
                              onClick={() => handleDownloadPDF('info-sheet')}
                              className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Info className="w-4 h-4 text-slate-400" />
                              Info Sheet (Annex 1)
                            </button>
                            <button
                              onClick={() => handleDownloadPDF('reply-form')}
                              className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4 text-slate-400" />
                              Reply Form (Annex 2)
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isLetter && (
                  <Button
                    variant={data.hasPaid ? 'secondary' : 'primary'}
                    onClick={handleEmailLba}
                    className={data.hasPaid ? 'border-slate-200' : 'border-teal-600'}
                    icon={<Mail className="w-4 h-4" />}
                  >
                    <span className="hidden md:inline">
                      {data.hasPaid ? 'Email LBA' : 'Unlock & Email'}
                    </span>
                  </Button>
                )}

                {isLetter && onSendPhysicalMail && (
                  <Button
                    onClick={handleSend}
                    disabled={isSending}
                    isLoading={isSending}
                    icon={!isSending && (data.hasPaid ? <Send className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />)}
                    className={data.hasPaid ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' : ''}
                  >
                    {data.hasPaid ? 'Send via Post (£2.00)' : 'Unlock & Send (£2.50)'}
                  </Button>
                )}
              </div>
           ) : (
              <Tooltip content="Complete document review to unlock sending options" position="top">
                <Button
                  disabled
                  variant="secondary"
                  className="bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  icon={<Lock className="w-4 h-4" />}
                >
                  Sending Options Locked
                </Button>
              </Tooltip>
           )}
        </div>
      </div>

      {/* Stacked Layout: Document first, then Quality Recommendations below */}
      <div className="flex flex-col gap-6 px-4 md:px-0">

        {/* Document Preview - Full width */}
        <div className="w-full">
          {/* Zoom Controls - Enhanced with labels and better visibility */}
          <div className="flex items-center justify-center gap-3 mb-4 print:hidden bg-slate-100 rounded-xl p-3">
            {isTablet ? (
              /* Tablet: Show auto-fit indicator */
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Maximize2 className="w-4 h-4" />
                <span>Auto-fit ({Math.round(effectiveZoom)}%)</span>
              </div>
            ) : (
              /* Desktop/Mobile: Show enhanced manual zoom controls */
              <>
                <span className="text-sm font-medium text-slate-600">Zoom:</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="px-3 gap-1"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span className="hidden sm:inline">-</span>
                </Button>
                <div className="flex items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 min-w-[60px] justify-center">
                  <span className="text-sm font-bold text-slate-700">{zoom}%</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 150}
                  className="px-3 gap-1"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">+</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomReset}
                  className="ml-2 gap-1"
                  aria-label="Reset zoom"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Reset</span>
                </Button>
                <div className="w-px h-6 bg-slate-300 mx-2" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsFullscreen(true)}
                  className="gap-1"
                  aria-label="Full screen preview"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Full Screen</span>
                </Button>
              </>
            )}
          </div>

          {/* Document Container */}
          <div className="print-container font-sans text-black bg-slate-100/50 p-2 md:p-8 rounded-xl md:rounded-2xl border border-slate-200/50 overflow-auto max-h-[75vh]">
            <div
              className="w-full md:min-w-[210mm] mx-auto bg-white shadow-xl md:shadow-2xl transition-transform origin-top"
              style={{ transform: `scale(${effectiveZoom / 100})` }}
            >
              {isLetter ? (
                <>
                   {viewMode === 'letter' && (
                      <Page watermark={!isFinalized || !data.hasPaid} className="!shadow-none !m-0 !mb-0" id="letter-preview-container">
                    {/* Saved/Unsaved indicator */}
                    {!isFinalized && (
                      <div className="absolute top-2 right-2 no-print z-10">
                        {showSavedFeedback ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 animate-fade-in">
                            <CheckCircle className="w-3 h-3" /> Saved
                          </span>
                        ) : hasUnsavedChanges ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Unsaved
                          </span>
                        ) : null}
                      </div>
                    )}
                    <div className="font-serif max-w-[90%] mx-auto pt-10 break-words">
                      <div className="text-right mb-12 leading-relaxed">
                        <p className="font-bold text-lg break-words">{data.claimant.name}</p>
                        <p className="break-words">{data.claimant.address}</p>
                        <p className="break-words">{data.claimant.city}</p>
                        <p>{data.claimant.postcode}</p>
                        <p className="mt-6 font-medium">{today}</p>
                      </div>

                      <div className="mb-12 leading-relaxed">
                        <p className="font-bold break-words">{data.defendant.name}</p>
                        <p className="break-words">{data.defendant.address}</p>
                        <p className="break-words">{data.defendant.city}</p>
                        <p>{data.defendant.postcode}</p>
                      </div>

                      <div className="mb-8">
                        <p className="font-bold uppercase underline tracking-wide">
                          {data.selectedDocType === DocumentType.POLITE_CHASER
                            ? 'PAYMENT REMINDER'
                            : data.selectedDocType === DocumentType.LBA
                            ? 'LETTER BEFORE ACTION'
                            : data.selectedDocType === DocumentType.INSTALLMENT_AGREEMENT
                            ? 'INSTALLMENT PAYMENT AGREEMENT'
                            : 'LETTER BEFORE ACTION'}
                        </p>
                        <p className="font-bold mt-2">
                          Re: Outstanding Balance of {getCurrencySymbol(data.invoice.currency)}
                          {data.selectedDocType === DocumentType.POLITE_CHASER
                            ? data.invoice.totalAmount.toFixed(2)
                            : (data.invoice.totalAmount + data.interest.totalInterest + data.compensation).toFixed(2)}
                        </p>
                      </div>

                      <div
                        className={`whitespace-pre-wrap text-justify leading-relaxed mb-12 text-[11pt] transition-all duration-200 ${
                          !isFinalized
                            ? 'hover:outline-2 hover:outline-dashed hover:outline-slate-300 hover:outline-offset-4 focus:outline-2 focus:outline-solid focus:outline-teal-500 focus:outline-offset-4 cursor-text rounded'
                            : ''
                        }`}
                        contentEditable={!isFinalized}
                        suppressContentEditableWarning
                        title={!isFinalized ? 'Click to edit this content' : undefined}
                        onInput={() => setHasUnsavedChanges(true)}
                        onBlur={(e) => {
                          if (!isFinalized) {
                            const newText = e.currentTarget.innerText;
                            if (newText !== data.generated?.content) {
                              onUpdateContent(newText);
                              setHasUnsavedChanges(false);
                              setShowSavedFeedback(true);
                              setTimeout(() => setShowSavedFeedback(false), 2000);
                            }
                          }
                        }}
                      >
                        {data.generated?.content}
                      </div>

                      <div className="mt-16">
                        <p>{isPoliteReminder ? 'Kind regards,' : 'Yours sincerely,'}</p>
                        <div className="h-20 mt-2 mb-2">
                          {data.signature ? (
                            <img src={data.signature} alt="Signed" className="h-16 object-contain" />
                          ) : (
                            <button 
                               onClick={() => setIsSigning(true)} 
                               className="h-full w-64 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-slate-400 gap-2 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 no-print group"
                            >
                               <PenTool className="w-4 h-4 group-hover:text-teal-600" /> 
                               <span className="group-hover:text-teal-700 font-medium">Click to Sign Document</span>
                            </button>
                          )}
                        </div>
                        <p className="font-bold border-t border-black inline-block min-w-[200px] pt-2">{data.claimant.name}</p>
                        <p className="text-xs mt-1">{data.claimant.type === PartyType.BUSINESS || data.claimant.type === PartyType.SOLE_TRADER ? 'Authorised Signatory' : ''}</p>
                      </div>
                      
                      {showAnnexes && (
                        <div className="mt-20 pt-8 border-t border-slate-300 text-xs text-slate-500">
                          <p className="font-bold mb-2">Enc:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Information Sheet (Pre-Action Protocol Annex 1)</li>
                            <li>Reply Form (Pre-Action Protocol Annex 2)</li>
                            <li>Invoice Copy ({data.invoice.invoiceNumber})</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </Page>
               )}
               
               {viewMode === 'info-sheet' && (
                  <Page watermark={!isFinalized || !data.hasPaid} className="!shadow-none !m-0 !mb-0" id="info-sheet-container">
                     <div className="max-w-[90%] mx-auto pt-6 text-sm break-words">
                        <h1 className="text-xl font-bold mb-6 text-center uppercase border-b-2 border-black pb-4">Annex 1: Information Sheet</h1>
                        <p className="font-bold text-justify mb-4">
                          You have received this information sheet because a claim for debt is being made against you. 
                          This information sheet is intended to help you understand what you should do next.
                        </p>
                        
                        <div className="bg-slate-100 p-4 border border-slate-300 mb-6">
                           <p className="font-bold text-slate-900 mb-2">⚠️ DO NOT IGNORE THE LETTER</p>
                           <p>If you do not reply, the creditor may start court proceedings against you.</p>
                        </div>

                        <div className="space-y-4 text-justify leading-relaxed mb-8">
                          <p>
                             You should reply to the letter within <strong>30 days</strong>. The 'Reply Form' is enclosed for you to use.
                             By replying, you can:
                          </p>
                          <ul className="list-disc list-inside pl-4 space-y-1">
                             <li>Admit the debt and offer to pay.</li>
                             <li>Dispute the debt (explain why).</li>
                             <li>Request more information.</li>
                          </ul>
                        </div>

                        <div className="border-t border-black pt-4 mt-8">
                           <p className="font-bold mb-2">Where can you get help?</p>
                           <p className="mb-4">If you need advice, you can contact the following organisations for free:</p>
                           <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="border p-2">
                                 <p className="font-bold">Citizens Advice</p>
                                 <p>www.citizensadvice.org.uk</p>
                                 <p>03444 111 444</p>
                              </div>
                              <div className="border p-2">
                                 <p className="font-bold">National Debtline</p>
                                 <p>www.nationaldebtline.org</p>
                                 <p>0808 808 4000</p>
                              </div>
                              <div className="border p-2">
                                 <p className="font-bold">StepChange Debt Charity</p>
                                 <p>www.stepchange.org</p>
                                 <p>0800 138 1111</p>
                              </div>
                              <div className="border p-2">
                                 <p className="font-bold">Civil Legal Advice</p>
                                 <p>www.gov.uk/civil-legal-advice</p>
                                 <p>0345 345 4 345</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </Page>
               )}

               {viewMode === 'reply-form' && (
                  <Page watermark={!isFinalized || !data.hasPaid} className="!shadow-none !m-0 !mb-0" id="reply-form-container">
                     <div className="max-w-[95%] mx-auto pt-4 text-sm break-words">
                        <h1 className="text-xl font-bold mb-4 text-center uppercase">Annex 2: Reply Form</h1>
                        <div className="bg-slate-50 border border-slate-300 p-3 mb-4 text-xs">
                           <strong>To the Debtor:</strong> Use this form to reply to the Letter Before Action. Return it to the Creditor within 30 days.
                        </div>

                        <div className="border border-black mb-4">
                           <div className="bg-slate-100 p-2 font-bold border-b border-black">SECTION 1: The Debt</div>
                           <div className="p-2 space-y-2">
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I agree I owe the debt.</span>
                              </div>
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I owe some of the debt, but not all of it.</span>
                              </div>
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I do not owe the debt.</span>
                              </div>
                           </div>
                        </div>

                        <div className="border border-black mb-4">
                           <div className="bg-slate-100 p-2 font-bold border-b border-black">SECTION 2: How will you pay?</div>
                           <div className="p-2 space-y-2">
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I will pay what I owe now.</span>
                              </div>
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I will pay, but I need time (Payment Plan).</span>
                              </div>
                              <div className="pl-6 text-xs italic text-slate-500">
                                 (Please enclose a Financial Statement if asking for time to pay)
                              </div>
                           </div>
                        </div>

                        <div className="border border-black mb-4">
                           <div className="bg-slate-100 p-2 font-bold border-b border-black">SECTION 3: Documents</div>
                           <div className="p-2 space-y-2">
                              <div className="flex gap-2">
                                 <div className="w-4 h-4 border border-black"></div>
                                 <span>I need more documents/information to decide.</span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-black grid grid-cols-2 gap-8">
                           <div>
                              <div className="border-b border-black h-8"></div>
                              <p className="text-xs mt-1">Signature</p>
                           </div>
                           <div>
                              <div className="border-b border-black h-8"></div>
                              <p className="text-xs mt-1">Date</p>
                           </div>
                           <div>
                              <div className="border-b border-black h-8"></div>
                              <p className="text-xs mt-1">Print Name</p>
                           </div>
                        </div>

                     </div>
                  </Page>
               )}
            </>
          ) : (
            /* N1 FORM - ACTUAL PDF PREVIEW */
            <>
               {/* Show actual PDF instead of HTML recreation */}
               {isLoadingPreview ? (
                  <div className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-slate-100 rounded-lg p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-slate-400 mb-4" />
                    <p className="text-slate-600 font-medium">Generating official N1 form preview...</p>
                    <p className="text-slate-400 text-sm mt-2">Using HMCTS template (N1_1224, Dec 2024)</p>
                  </div>
               ) : pdfPreviewUrl ? (
                  <div className="w-full px-4">
                    <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4 rounded">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-teal-900 text-sm">Official HMCTS Form N1 Preview</p>
                          <p className="text-teal-800 text-xs mt-1">
                            This is the actual court form (N1_1224, Dec 2024) with your data filled in.
                            What you see here is exactly what you'll download and submit to court.
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Edit Particulars button for N1 forms */}
                    {!isFinalized && (
                      <Button
                        onClick={() => {
                          setEditedParticulars(data.generated?.content || '');
                          setShowParticularsModal(true);
                        }}
                        variant="warning"
                        icon={<PenTool className="w-4 h-4" />}
                        className="mb-4 no-print"
                      >
                        Edit Particulars of Claim
                      </Button>
                    )}
                    <iframe
                      src={`${pdfPreviewUrl}#page=1`}
                      className="w-full h-[70vh] md:h-[80vh] border-2 border-slate-300 rounded-lg shadow-xl bg-white"
                      title="N1 Claim Form Preview"
                    />
                  </div>
               ) : (
                  <div className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-red-50 rounded-lg border-2 border-red-200 p-8">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-700 font-bold mb-2">Failed to generate PDF preview</p>
                    {pdfError && (
                      <p className="text-red-600 text-sm mb-2 font-mono bg-red-100 px-3 py-1 rounded">{pdfError}</p>
                    )}
                    <p className="text-red-600 text-sm mb-4">Please ensure the PDF template is in the public/ directory</p>
                    <button
                      onClick={() => {
                        setPdfError(null);
                        setIsLoadingPreview(true);
                        generateN1PDF(data)
                          .then(pdfBytes => {
                            const bytes = new Uint8Array(pdfBytes);
                            const blob = new Blob([bytes.buffer], { type: 'application/pdf' });
                            setCachedPdfBlob(blob);
                            const url = URL.createObjectURL(blob);
                            setPdfPreviewUrl(prev => {
                              if (prev) URL.revokeObjectURL(prev);
                              return url;
                            });
                          })
                          .catch(error => {
                            console.error('Retry failed:', error);
                            setPdfError(error instanceof Error ? error.message : 'Unknown error');
                          })
                          .finally(() => setIsLoadingPreview(false));
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 mb-4"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                    <p className="text-red-500 text-xs max-w-lg text-center">
                      You can also use the "Print" button above to save as PDF.
                    </p>
                  </div>
               )}
            </>
          )}
            </div>
          </div>
        </div>

        {/* Quality Recommendations - Below document */}
        <div className="w-full">
          {renderWarningPanels()}
        </div>

        {/* Post-download Guidance Panel */}
        {showPostDownloadGuidance && (
          <div className="w-full mt-6 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-teal-900 text-lg mb-3">Document Downloaded - Next Steps</h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <div>
                      <strong>Review the document</strong> - Check all details are correct before filing
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <div>
                      <strong>File via Money Claim Online (MCOL)</strong>
                      <a href="https://www.moneyclaim.gov.uk" target="_blank" rel="noopener noreferrer"
                         className="ml-1 text-teal-600 hover:underline inline-flex items-center gap-1">
                        www.moneyclaim.gov.uk <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <div>
                      <strong>Pay the court fee</strong> - £{data.courtFee.toFixed(2)} for your claim value
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-slate-300 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <div>
                      <strong>Wait for defendant response</strong> - 14 days to acknowledge, 28 days to defend
                    </div>
                  </li>
                </ol>
                <div className="mt-4 pt-4 border-t border-teal-200 flex items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={() => setShowPostDownloadGuidance(false)}>
                    Dismiss
                  </Button>
                  {onFinish && (
                    <Button variant="primary" size="sm" onClick={onFinish}>
                      Return to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Bar - Shows when document is finalized */}
      {isFinalized && !showPostDownloadGuidance && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg z-30 print:hidden">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Document ready for action</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownloadPDF('main')}
                icon={<FileDown className="w-4 h-4" />}
              >
                Download PDF
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setPendingSendMethod('email');
                  setShowSendConfirmModal(true);
                }}
                icon={<Send className="w-4 h-4" />}
              >
                Send Document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <Modal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Document Preview"
        maxWidthClassName="max-w-[95vw]"
        bodyClassName="p-0 overflow-auto max-h-[85vh]"
      >
        <div className="p-4 bg-slate-100 min-h-[80vh]">
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-[80vh] border-0 rounded-lg bg-white"
              title="PDF Preview"
            />
          ) : (
            <div
              className="bg-white rounded-xl p-8 shadow-xl mx-auto"
              style={{ width: '210mm', minHeight: '297mm' }}
            >
              <div className="font-serif max-w-[90%] mx-auto whitespace-pre-wrap text-justify leading-relaxed">
                {data.generated?.content}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Signature Modal */}
      <Modal
        isOpen={isSigning}
        onClose={() => setIsSigning(false)}
        title="Add Signature"
        description="Sign once and we'll apply it to the document."
        maxWidthClassName="max-w-lg"
        bodyClassName="p-0"
      >
        <SignaturePad
          onSave={(sig) => {
            onUpdateSignature(sig);
            setIsSigning(false);
          }}
        />
      </Modal>

      {/* Final Review Modal for all court forms */}
      <FinalReviewModal
        isOpen={showFinalReview}
        onClose={() => setShowFinalReview(false)}
        onConfirm={async () => {
          setShowFinalReview(false);
          await performDownload(pendingDownloadType);
        }}
        claimData={{
          claimantName: data.claimant.name,
          debtorName: data.defendant.name,
          invoiceNumber: data.invoice.invoiceNumber,
          invoiceAmount: data.invoice.totalAmount,
          interest: data.interest.totalInterest,
          compensation: data.compensation,
          courtFee: data.courtFee,
          totalClaim: data.invoice.totalAmount + data.interest.totalInterest + data.compensation + data.courtFee
        }}
      />

      {/* Override Confirmation Dialog */}
      <ConfirmModal
        isOpen={showOverrideConfirm}
        onClose={() => setShowOverrideConfirm(false)}
        onConfirm={() => {
          setShowOverrideConfirm(false);
          onConfirm();
        }}
        title="Override Compliance Check?"
        message="The compliance check found potential issues with your document. Proceeding despite these warnings could result in errors that may affect your legal claim. Are you sure you want to continue?"
        confirmText="Yes, Override & Approve"
        variant="danger"
      />

      {/* Edit Particulars Modal for N1 forms */}
      <Modal
        isOpen={showParticularsModal}
        onClose={() => setShowParticularsModal(false)}
        title="Edit Particulars of Claim"
        description="Make corrections to the text that will appear on your N1 form."
        maxWidthClassName="max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowParticularsModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onUpdateContent(editedParticulars);
                setShowParticularsModal(false);
              }}
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <textarea
          value={editedParticulars}
          onChange={(e) => setEditedParticulars(e.target.value)}
          className="w-full h-80 p-4 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
          placeholder="Enter the particulars of claim..."
        />
        <p className="text-xs text-slate-500 mt-2">
          This text will be used in the "Particulars of Claim" section of your N1 form. The PDF will regenerate automatically after saving.
        </p>
      </Modal>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingPaymentAction(null);
        }}
        onPaymentSuccess={handlePaymentSuccess}
        claimId={data.id}
        documentType={data.generated?.documentType || data.selectedDocType}
      />

      {/* Send Confirmation Modal */}
      <SendConfirmationModal
        isOpen={showSendConfirmModal}
        onClose={() => setShowSendConfirmModal(false)}
        onConfirm={() => {
          if (pendingSendMethod === 'email') {
            performEmailLba();
          } else {
            performPostalSend();
          }
        }}
        claim={data}
        sendMethod={pendingSendMethod}
        isLoading={isSending}
      />
    </div>
  );
};
