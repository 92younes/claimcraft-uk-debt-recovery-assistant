import React, { useState } from 'react';
import { ClaimState, DocumentType } from '../types';
import { Printer, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle, Lock, XCircle, PenTool, Send, Loader2, FileDown, RefreshCw, ExternalLink, CreditCard, Settings, Mail } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { SegmentedControl } from './ui/SegmentedControl';
import { SignaturePad } from './SignaturePad';
import { FinalReviewModal } from './FinalReviewModal';
import { ConfirmModal } from './ConfirmModal';
import { PaymentModal } from './PaymentModal';
import { generateN1PDF, generateN225PDF, generateN225APDF, generateN180PDF, generateLetterPDF } from '../services/pdfGenerator';

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
}

// A4 Page Wrapper with optional Watermark and Overflow Handling
// Mobile responsive: full width on small screens, A4 width on larger screens
const Page = ({ children, className = "", watermark = false, id }: { children?: React.ReactNode; className?: string; watermark?: boolean; id?: string }) => (
  <div id={id} className={`bg-white shadow-xl w-full max-w-full md:w-[210mm] md:max-w-none min-h-[297mm] mx-auto p-4 md:p-[10mm] mb-8 relative text-black text-sm border border-slate-200 print:shadow-none print:border-none print:w-full print:p-0 print:m-0 print:mb-[20mm] break-after-page overflow-x-auto flex-shrink-0 ${className}`}>
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
  onMarkAsFiled
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

  // Content editing state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // N1 Particulars editing modal state
  const [showParticularsModal, setShowParticularsModal] = useState(false);
  const [editedParticulars, setEditedParticulars] = useState('');

  const review = data.generated?.review;

  // Forms that require final review checklist (all court forms with Statement of Truth)
  const formsRequiringReview = [
    DocumentType.FORM_N1,
    DocumentType.DEFAULT_JUDGMENT,
    DocumentType.ADMISSION,
    DocumentType.DIRECTIONS_QUESTIONNAIRE
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Payment gate: show modal if unpaid
    if (!data.hasPaid) {
      setPendingPaymentAction('download');
      setShowPaymentModal(true);
      return;
    }

    // Show Final Review Modal for all court forms before download
    if (formsRequiringReview.includes(data.selectedDocType)) {
      setShowFinalReview(true);
      return;
    }

    // For other documents (letters), proceed directly
    await performDownload();
  };

  const performDownload = async () => {
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
    // Payment gate: show modal if unpaid
    if (!data.hasPaid) {
      setPendingPaymentAction('send');
      setShowPaymentModal(true);
      return;
    }

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
          await performDownload();
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

    // Generate mailto link
    const subject = encodeURIComponent(`Letter Before Action - Invoice ${data.invoice.invoiceNumber}`);
    const body = encodeURIComponent(`Dear ${data.defendant.name},

Please find attached a Letter Before Action regarding the outstanding balance of £${data.invoice.totalAmount.toFixed(2)}.

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
     return (
       <div className="max-w-lg mx-auto mt-20 text-center animate-fade-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            {emailOpenedSuccess ? 'Email Draft Opened' : 'Sent Successfully!'}
          </h2>
          <p className="text-slate-600 mb-8">
             {emailOpenedSuccess
               ? 'We opened an email draft in your email client. Review the message, attach your PDF, and send when ready.'
               : 'Your Letter Before Action has been dispatched.'}
          </p>
          <div className="flex justify-center">
            <Button onClick={onBack} className="px-8">
              Return to Dashboard
            </Button>
          </div>
       </div>
     );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* Validation Warnings Panel */}
      {data.generated?.validation?.warnings && data.generated.validation.warnings.length > 0 && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden animate-fade-in no-print mx-4 md:mx-0 shadow-lg">
          <div className="p-4 bg-amber-100 border-b border-amber-200 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">Quality Recommendations</h3>
              <p className="text-sm text-amber-700">These suggestions may strengthen your claim, but are not required.</p>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-2">
              {data.generated.validation.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-amber-900 bg-white p-3 rounded-lg border border-amber-200">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* AI Review Panel - Always shows until approved */}
      {!isFinalized && review && (
        <div className="mb-8 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in no-print ring-4 ring-slate-50 mx-4 md:mx-0">
           <div className={`p-4 flex items-center justify-between ${review.isPass ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-full ${review.isPass ? 'bg-green-100' : 'bg-red-100'}`}>
                    {review.isPass ? <ShieldCheck className="w-6 h-6 text-green-700" /> : <AlertTriangle className="w-6 h-6 text-red-700" />}
                 </div>
                 <div>
                    <h3 className={`font-bold text-lg ${review.isPass ? 'text-green-900' : 'text-red-900'}`}>
                       {review.isPass ? "Compliance Check: Passed" : "Compliance Check: Hallucinations Detected"}
                    </h3>
                    <p className="text-sm text-slate-600">Automated audit against invoice data & timeline to prevent hallucinations.</p>
                 </div>
              </div>
           </div>
           <div className="p-6">
              <div className="flex gap-4 mb-6">
                 <div className="w-1 bg-slate-200 rounded-full self-stretch"></div>
                 <div>
                    <p className="font-bold text-slate-900 mb-1 text-sm uppercase tracking-wider">Legal Assistant Critique</p>
                    <p className="text-slate-700 italic text-lg font-serif leading-relaxed">"{review.critique}"</p>
                 </div>
              </div>

              {review.improvements && review.improvements.length > 0 && (
                 <div className="mb-8 pl-5">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Required Corrections</p>
                    <ul className="space-y-3">
                       {review.improvements.map((imp, i) => (
                         <li key={i} className="flex items-start gap-3 text-sm font-medium text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            {imp}
                         </li>
                       ))}
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
                    onClick={() => {
                      // If review failed, show confirmation dialog before approving
                      if (!review.isPass) {
                        setShowOverrideConfirm(true);
                      } else {
                        onConfirm();
                      }
                    }}
                    variant={review.isPass ? 'primary' : 'danger'}
                    icon={<CheckCircle className="w-4 h-4" />}
                 >
                    {review.isPass ? "Approve & Finalize" : "Override & Approve"}
                 </Button>
              </div>
           </div>
        </div>
      )}

      {!data.hasPaid && (
        <div className="mt-6 mb-2 px-4 md:px-0 no-print">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Preview is free</p>
              <p className="text-amber-800">
                To download PDFs or send by post/email, you’ll be prompted to unlock this document.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 mt-8 no-print gap-4 px-4 md:px-0">
        <Button 
          variant="secondary"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="w-full md:w-auto"
        >
          Back to Editor
        </Button>
        <div className="flex flex-wrap gap-2 items-center justify-center">
           {isLetter && (
             <SegmentedControl
               value={viewMode}
               onChange={setViewMode}
               options={[
                 { value: 'letter', label: 'Letter' },
                 { value: 'info-sheet', label: 'Info Sheet' },
                 { value: 'reply-form', label: 'Reply Form' },
               ]}
             />
           )}

          {isFinalized ? (
              <div className="flex gap-2">
                {/* MCOL Sidecar Button (for N1 forms) */}
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

                {/* Mark as Filed Button (Issue 7: Unlocks post-filing documents) */}
                {onMarkAsFiled && data.selectedDocType === DocumentType.FORM_N1 && data.claimLifecycle !== 'filed' && (
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

                {/* Download PDF Button for Letters */}
                {isLetter && (
                  <Button
                    variant={data.hasPaid ? 'secondary' : 'primary'}
                    onClick={handleDownloadPDF}
                    isLoading={isGeneratingPdf}
                    className={data.hasPaid ? 'border-slate-200' : 'border-teal-600'}
                    icon={!isGeneratingPdf && (data.hasPaid ? <FileDown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />)}
                    aria-label="Download PDF"
                  >
                    <span className="hidden md:inline">
                      {data.hasPaid ? 'Download PDF' : 'Download PDF (£2.50)'}
                    </span>
                    <span className="md:hidden">
                      {data.hasPaid ? 'PDF' : '£2.50'}
                    </span>
                  </Button>
                )}

                {/* Email Button */}
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

                {/* Mailroom Button (for Letters) - only show if mail service available */}
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
              <Button 
                disabled
                variant="secondary"
                className="bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                icon={<Lock className="w-4 h-4" />}
              >
                Approve to Send
              </Button>
           )}
        </div>
      </div>

      {/* Signature Modal */}
      <Modal
        isOpen={isSigning}
        onClose={() => setIsSigning(false)}
        title="Add Signature"
        description="Sign once and we’ll apply it to the document."
        maxWidthClassName="max-w-lg"
      >
        <SignaturePad
          onSave={(sig) => {
            onUpdateSignature(sig);
            setIsSigning(false);
          }}
        />
      </Modal>

      {/* Document Container - Mobile Responsive */}
      <div className="print-container font-sans text-black bg-slate-100/50 p-2 md:p-8 rounded-xl md:rounded-2xl border border-slate-200/50 mx-2 md:mx-0">
        <div className="w-full md:min-w-[210mm] mx-auto bg-white shadow-xl md:shadow-2xl">
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
                    <div className="font-serif max-w-[90%] mx-auto pt-10">
                      <div className="text-right mb-12 leading-relaxed">
                        <p className="font-bold text-lg">{data.claimant.name}</p>
                        <p>{data.claimant.address}</p>
                        <p>{data.claimant.city}</p>
                        <p>{data.claimant.postcode}</p>
                        <p className="mt-6 font-medium">{today}</p>
                      </div>

                      <div className="mb-12 leading-relaxed">
                        <p className="font-bold">{data.defendant.name}</p>
                        <p>{data.defendant.address}</p>
                        <p>{data.defendant.city}</p>
                        <p>{data.defendant.postcode}</p>
                      </div>

                      <div className="mb-8">
                        <p className="font-bold uppercase underline tracking-wide">LETTER BEFORE ACTION</p>
                        <p className="font-bold mt-2">Re: Outstanding Balance of £{(data.invoice.totalAmount + data.interest.totalInterest + data.compensation).toFixed(2)}</p>
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
                        <p>Yours sincerely,</p>
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
                        <p className="text-xs mt-1">{data.claimant.type === 'Business' ? 'Authorised Signatory' : ''}</p>
                      </div>
                      
                      <div className="mt-20 pt-8 border-t border-slate-300 text-xs text-slate-500">
                        <p className="font-bold mb-2">Enc:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Information Sheet (Pre-Action Protocol Annex 1)</li>
                          <li>Reply Form (Pre-Action Protocol Annex 2)</li>
                          <li>Invoice Copy ({data.invoice.invoiceNumber})</li>
                        </ul>
                      </div>
                    </div>
                  </Page>
               )}
               
               {viewMode === 'info-sheet' && (
                  <Page watermark={!isFinalized || !data.hasPaid} className="!shadow-none !m-0 !mb-0">
                     <div className="max-w-[90%] mx-auto pt-6 text-sm">
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
                  <Page watermark={!isFinalized || !data.hasPaid} className="!shadow-none !m-0 !mb-0">
                     <div className="max-w-[95%] mx-auto pt-4 text-sm">
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
                  <div className="w-full min-h-[800px] flex flex-col items-center justify-center bg-slate-100 rounded-lg p-8">
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
                      src={pdfPreviewUrl}
                      className="w-full h-[1200px] border-2 border-slate-300 rounded-lg shadow-xl bg-white"
                      title="N1 Claim Form Preview"
                    />
                  </div>
               ) : (
                  <div className="w-full min-h-[800px] flex flex-col items-center justify-center bg-red-50 rounded-lg border-2 border-red-200 p-8">
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

      {/* Final Review Modal for all court forms */}
      <FinalReviewModal
        isOpen={showFinalReview}
        onClose={() => setShowFinalReview(false)}
        onConfirm={async () => {
          setShowFinalReview(false);
          await performDownload();
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
    </div>
  );
};
