import React, { useState } from 'react';
import { ClaimState, DocumentType } from '../types';
import { Printer, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle, Lock, XCircle, PenTool, Send, Loader2, FileDown } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { FinalReviewModal } from './FinalReviewModal';
import { generateN1PDF, generateN225PDF, generateN225APDF, generateN180PDF } from '../services/pdfGenerator';

interface DocumentPreviewProps {
  data: ClaimState;
  onBack: () => void;
  isFinalized: boolean;
  onConfirm: () => void;
  onUpdateSignature: (sig: string) => void;
}

// A4 Page Wrapper with optional Watermark and Overflow Handling
const Page = ({ children, className = "", watermark = false }: { children?: React.ReactNode; className?: string; watermark?: boolean }) => (
  <div className={`bg-white shadow-xl w-[210mm] min-h-[297mm] mx-auto p-[10mm] mb-8 relative text-black text-sm border border-slate-200 print:shadow-none print:border-none print:w-full print:p-0 print:m-0 print:mb-[20mm] break-after-page overflow-hidden flex-shrink-0 ${className}`}>
    {watermark && (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 opacity-15 select-none overflow-hidden">
        <div className="transform -rotate-45 text-6xl md:text-8xl font-bold text-slate-900 whitespace-nowrap border-[10px] border-slate-900 p-10 rounded-2xl mix-blend-multiply">
           DRAFT - REVIEW PENDING
        </div>
      </div>
    )}
    {children}
  </div>
);

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ data, onBack, isFinalized, onConfirm, onUpdateSignature }) => {
  const [viewMode, setViewMode] = useState<'letter' | 'reply-form' | 'info-sheet' | 'n1-form'>('letter');
  const [isSigning, setIsSigning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const review = data.generated?.review;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Show Final Review Modal for Form N1 before download
    if (data.selectedDocType === DocumentType.FORM_N1) {
      setShowFinalReview(true);
      return;
    }

    // For other documents, proceed directly
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
      try {
        let pdfBytes: Uint8Array;
        let filename: string;

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

        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to generate PDF", error);
        alert(`Unable to generate the official PDF file. Ensure the template PDF is in the public folder, or use the 'Print' button to save as PDF.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsGeneratingPdf(false);
      }
    } else {
      // For non-PDF forms (letters, etc.), use print dialog
      window.print();
    }
  };

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
    }, 2000);
  };

  const today = new Date().toLocaleDateString('en-GB');
  const claimAmount = data.invoice.totalAmount;
  const totalInterest = data.interest.totalInterest;
  const compensation = data.compensation;
  const courtFee = data.courtFee;
  const legalCosts = 0; // Standard assumption for small claims
  const totalAmount = (claimAmount + totalInterest + compensation + courtFee + legalCosts).toFixed(2);

  const isLetter = data.generated?.documentType === DocumentType.LBA;

  // Initial load effect to set correct mode
  React.useEffect(() => {
     if(!isLetter) setViewMode('n1-form');
  }, [isLetter]);

  // Generate PDF preview for N1 forms (regenerates when data changes)
  React.useEffect(() => {
    if (data.selectedDocType !== DocumentType.FORM_N1) {
      return;
    }

    let cancelled = false;
    setIsLoadingPreview(true);

    generateN1PDF(data)
      .then(pdfBytes => {
        if (cancelled) return;
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Failed to generate PDF preview:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      });

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

  // Reset preview URL when switching away from N1
  React.useEffect(() => {
    if (data.selectedDocType !== DocumentType.FORM_N1 && pdfPreviewUrl) {
      setPdfPreviewUrl(null);
    }
  }, [data.selectedDocType, pdfPreviewUrl]);

  if (sendSuccess) {
     return (
       <div className="max-w-lg mx-auto mt-20 text-center animate-fade-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Sent Successfully!</h2>
          <p className="text-slate-600 mb-8">
             Your Letter Before Action has been dispatched via Registered Post and Email. 
             Tracking number: <span className="font-mono font-bold text-slate-800">GB-2938-4421</span>
          </p>
          <button onClick={onBack} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">
             Return to Dashboard
          </button>
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
                 <button onClick={onBack} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors duration-200 border border-slate-200 hover:border-slate-300 text-center">
                    Back & Edit Data
                 </button>
                 <button
                    onClick={onConfirm}
                    className={`px-8 py-2.5 rounded-lg shadow-md font-bold flex items-center justify-center gap-2 transition-all duration-200 transform hover:-translate-y-0.5 ${review.isPass ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                 >
                    <CheckCircle className="w-4 h-4" /> {review.isPass ? "Approve & Finalize" : "Override & Approve"}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 mt-8 no-print gap-4 px-4 md:px-0">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 transition-colors duration-200 w-full md:w-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Editor
        </button>
        <div className="flex flex-wrap gap-2 items-center justify-center">
           {isLetter && (
             <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm overflow-x-auto max-w-full">
                <button 
                  onClick={() => setViewMode('letter')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${viewMode === 'letter' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Letter
                </button>
                <button 
                  onClick={() => setViewMode('info-sheet')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${viewMode === 'info-sheet' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Info Sheet
                </button>
                <button 
                  onClick={() => setViewMode('reply-form')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${viewMode === 'reply-form' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Reply Form
                </button>
             </div>
           )}

          {isFinalized ? (
              <div className="flex gap-2">
                {!isLetter && (
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 px-5 py-2.5 rounded-lg transition-colors duration-200 shadow-sm border border-slate-200 font-bold"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                        <span className="hidden md:inline">Download PDF</span>
                        <span className="md:hidden">PDF</span>
                    </button>
                )}
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-900 px-5 py-2.5 rounded-lg transition-colors duration-200 shadow-sm border border-slate-200 font-bold"
                >
                  <Printer className="w-4 h-4" /> 
                  <span className="hidden md:inline">Print</span>
                </button>
                <button 
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-colors duration-200 shadow-lg font-bold animate-fade-in"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send (£2.50)</>}
                </button>
              </div>
           ) : (
              <button 
                disabled
                className="flex items-center gap-2 bg-slate-100 text-slate-400 px-6 py-2.5 rounded-lg font-bold cursor-not-allowed border border-slate-200"
              >
                <Lock className="w-4 h-4" /> Approve to Send
              </button>
           )}
        </div>
      </div>

      {/* Signature Modal */}
      {isSigning && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white p-6 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg">Add Signature</h3>
                 <button onClick={() => setIsSigning(false)}><XCircle className="w-6 h-6 text-slate-400" /></button>
              </div>
              <SignaturePad onSave={(sig) => { onUpdateSignature(sig); setIsSigning(false); }} />
           </div>
        </div>
      )}

      {/* Document Container - Responsive Scroll */}
      <div className="print-container font-sans text-black overflow-x-auto bg-slate-100/50 p-4 md:p-8 rounded-2xl border border-slate-200/50 mx-4 md:mx-0">
        <div className="min-w-[210mm] mx-auto bg-white shadow-xl md:shadow-2xl">
          {isLetter ? (
            <>
               {viewMode === 'letter' && (
                  <Page watermark={!isFinalized} className="!shadow-none !m-0 !mb-0">
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
                        className="whitespace-pre-wrap text-justify leading-relaxed mb-12 text-[11pt]"
                        contentEditable={!isFinalized}
                        suppressContentEditableWarning
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
                               <PenTool className="w-4 h-4 group-hover:text-blue-500" /> 
                               <span className="group-hover:text-blue-600 font-medium">Click to Sign Document</span>
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
                  <Page watermark={!isFinalized} className="!shadow-none !m-0 !mb-0">
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
                  <Page watermark={!isFinalized} className="!shadow-none !m-0 !mb-0">
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
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-blue-900 text-sm">Official HMCTS Form N1 Preview</p>
                          <p className="text-blue-700 text-xs mt-1">
                            This is the actual court form (N1_1224, Dec 2024) with your data filled in.
                            What you see here is exactly what you'll download and submit to court.
                          </p>
                        </div>
                      </div>
                    </div>
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
                    <p className="text-red-600 text-sm mb-4">Please ensure N1.pdf template is in the public/ directory</p>
                    <p className="text-red-500 text-xs max-w-lg text-center">
                      You can still download the form using the "Download PDF" button above.
                    </p>
                  </div>
               )}
               {/* REMOVED: HTML recreation of N1 form - now showing actual PDF */}
               <div className="hidden">
               <Page watermark={false} className="!p-[10mm] !shadow-none !m-0 !mb-0 border-b border-slate-200">
                  <div className="flex flex-col h-full text-xs leading-tight font-sans">
                     {/* Header Area */}
                     <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-4 pt-2 pl-2">
                             <div className="w-20 h-20 border border-slate-300 flex flex-col items-center justify-center text-center text-[8px] text-slate-400 bg-slate-50">
                               <span className="font-serif text-2xl mb-1">♕</span>
                               <span className="font-serif italic">Royal Arms</span>
                             </div>
                             <h1 className="text-4xl font-bold font-sans tracking-tight">Claim Form</h1>
                         </div>
                         {/* Grid Table */}
                         <div className="w-[340px] border border-black grid grid-cols-[110px_1fr]">
                             <div className="border-b border-black p-1 bg-blue-50 font-bold">In the</div>
                             <div className="border-b border-black p-1 font-bold text-sm uppercase flex items-center">County Court Business Centre</div>
                             <div className="border-b border-black p-1 bg-blue-50 font-bold">Claim no.</div>
                             <div className="border-b border-black p-1"></div>
                             <div className="border-b border-black p-1 bg-blue-50 font-bold">Fee Account no.</div>
                             <div className="border-b border-black p-1"></div>
                         </div>
                     </div>

                     <div className="grid grid-cols-[1fr_340px] gap-4 flex-grow h-full">
                         {/* Left Column */}
                         <div className="flex flex-col gap-2">
                             <div className="border border-black p-2 min-h-[120px]">
                                 <p className="font-bold uppercase mb-1 bg-blue-50 inline-block px-1 text-[10px]">Claimant(s) name(s) and address(es)</p>
                                 <p className="font-bold text-sm">{data.claimant.name}</p>
                                 <p>{data.claimant.address}</p>
                                 <p>{data.claimant.postcode}</p>
                             </div>
                             <div className="border border-black p-2 min-h-[120px]">
                                 <p className="font-bold uppercase mb-1 bg-blue-50 inline-block px-1 text-[10px]">Defendant(s) name(s) and address(es)</p>
                                 <p className="font-bold text-sm">{data.defendant.name}</p>
                                 <p>{data.defendant.address}</p>
                                 <p>{data.defendant.postcode}</p>
                             </div>
                             <div className="border border-black p-2 flex-grow">
                                 <p className="font-bold uppercase mb-1 bg-blue-50 inline-block px-1 text-[10px]">Brief details of claim</p>
                                 <p className="italic mb-2 min-h-[40px] p-2 bg-yellow-50 border border-yellow-100 rounded text-sm">{data.generated?.briefDetails}</p>
                                 <div className="mt-4 text-xs font-mono text-slate-600 space-y-1 pl-2 border-l-2 border-slate-200">
                                   <p>Principal Debt: £{claimAmount.toFixed(2)}</p>
                                   <p>Statutory Interest: £{totalInterest.toFixed(2)}</p>
                                 </div>
                             </div>
                             <div className="border border-black p-2">
                                 <p className="font-bold uppercase mb-1 bg-blue-50 inline-block px-1 text-[10px]">Value</p>
                                 <p>The Claimant expects to recover <span className="font-bold">£{totalAmount}</span></p>
                             </div>
                             <div className="border border-black p-2 min-h-[80px]">
                                 <p className="font-bold uppercase mb-1 bg-blue-50 inline-block px-1 text-[10px]">Defendant's name and address for service</p>
                                 <p className="font-bold">{data.defendant.name}</p>
                             </div>
                         </div>

                         {/* Right Column */}
                         <div className="flex flex-col gap-2 h-full">
                             <div className="border border-black bg-blue-50 p-1 text-center font-bold uppercase text-[10px]">For court use only</div>
                             <div className="border border-black p-2 flex-grow bg-slate-50 flex flex-col gap-2"></div>
                             <div className="border border-black">
                                 <div className="grid grid-cols-[1fr_90px] text-sm">
                                     <div className="p-1 border-r border-black font-bold bg-blue-50">Total amount</div>
                                     <div className="p-1 font-bold text-right bg-blue-50">{ totalAmount }</div>
                                 </div>
                             </div>
                         </div>
                     </div>
                     <div className="mt-2 flex justify-between text-[9px]"><span>N1 Claim form (CPR Part 7) (10.20)</span><span>© Crown copyright 2023</span></div>
                  </div>
               </Page>

               {/* Page 2: Particulars & Signature */}
               <Page watermark={!isFinalized} className="!p-[15mm] !shadow-none !m-0 !mb-0">
                  <h2 className="font-bold text-lg mb-4 uppercase border-b border-black pb-2">Particulars of Claim</h2>
                  <div 
                      className="whitespace-pre-wrap text-justify leading-relaxed mb-12 text-sm min-h-[400px]"
                      contentEditable={!isFinalized}
                      suppressContentEditableWarning
                  >
                      {data.generated?.content}
                  </div>

                  <div className="border-t-2 border-black pt-6 mt-8">
                      <h2 className="font-bold text-lg mb-4 uppercase">Statement of Truth</h2>
                      <p className="italic mb-4 text-sm">
                          I believe that the facts stated in these particulars of claim are true. 
                          {data.claimant.type === 'Business' && " I am duly authorised by the claimant to sign this statement."}
                      </p>

                      <div className="grid grid-cols-2 gap-10 mt-10">
                          <div>
                              <div className="border-b border-black h-16 flex items-end pb-1">
                                  {data.signature ? (
                                    <img src={data.signature} alt="Signed" className="h-14 object-contain" />
                                  ) : (
                                    <button 
                                       onClick={() => setIsSigning(true)} 
                                       className="w-full h-full text-slate-400 flex items-center gap-2 text-xs hover:bg-slate-50 no-print"
                                    >
                                       <PenTool className="w-3 h-3" /> Click to Sign
                                    </button>
                                  )}
                              </div>
                              <p className="text-xs mt-1">Signature of Claimant</p>
                          </div>
                          <div>
                              <div className="border-b border-black h-16 flex items-end pb-1 font-mono">{today}</div>
                              <p className="text-xs mt-1">Date</p>
                          </div>
                      </div>

                      <div className="mt-6 text-sm">
                          <p className="mb-1"><span className="font-bold">Full name:</span> {data.claimant.name}</p>
                          <p><span className="font-bold">Role:</span> {data.claimant.type === 'Business' ? 'Director / Authorised Signatory' : 'Claimant in Person'}</p>
                      </div>
                  </div>
               </Page>
               </div>{/* End hidden HTML N1 recreation */}
            </>
          )}
        </div>
      </div>

      {/* Final Review Modal for N1 */}
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
          courtFee: data.courtFee,
          totalClaim: data.invoice.totalAmount + data.interest.totalInterest + data.compensation + data.courtFee
        }}
      />
    </div>
  );
}