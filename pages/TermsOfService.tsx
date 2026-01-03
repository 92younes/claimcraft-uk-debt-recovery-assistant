import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, AlertTriangle, FileText, Shield, CheckCircle, XCircle } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) return onBack();
    // Prefer going back to where the user came from (dashboard/landing),
    // but fall back to landing if there is no history.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Application
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-100 p-3 rounded-xl">
                <Scale className="w-6 h-6 text-teal-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 font-display">Terms of Service</h1>
            </div>
            <p className="text-slate-600 text-lg">
              Last updated: <strong>23 November 2025</strong>
            </p>
          </div>

          {/* Critical Notice */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-10 rounded-r-lg">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2 text-lg">IMPORTANT LEGAL NOTICE</h3>
                <p className="text-amber-800 leading-relaxed text-sm">
                  <strong>ClaimCraft UK is NOT a law firm and does not provide legal advice.</strong> This is
                  an AI-powered document generation tool. We strongly recommend consulting a qualified solicitor
                  before filing any legal claim. By using this service, you accept full responsibility for
                  reviewing and verifying all generated documents.
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <section className="mb-10">
            <p className="text-slate-700 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your access to and use of ClaimCraft UK ("Service", "Platform",
              "we", "our", or "us"), an AI-powered legal document generation tool for UK debt recovery claims.
            </p>
            <p className="text-slate-700 leading-relaxed">
              By accessing or using ClaimCraft UK, you agree to be bound by these Terms and our Privacy Policy.
              If you do not agree, you must not use the Service.
            </p>
          </section>

          {/* Section 1: Acceptance of Terms */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                By clicking "Accept", "Get Started", or by using the Service, you confirm that:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li>You are at least 18 years of age</li>
                <li>You have the legal capacity to enter into a binding contract</li>
                <li>You have read and understood these Terms and our Privacy Policy</li>
                <li>You will use the Service in compliance with all applicable UK laws and regulations</li>
              </ul>
            </div>
          </section>

          {/* Section 2: Nature of the Service */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">2. Nature of the Service</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.1 What We Provide</h3>
                <p className="text-slate-700 mb-2">ClaimCraft UK is a self-service software tool that:</p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Generates draft legal documents (Letters Before Action, Form N1) using AI</li>
                  <li>Calculates statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998</li>
                  <li>Estimates court fees based on claim value</li>
                  <li>Provides guidance on UK debt recovery procedures</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.2 What We Do NOT Provide</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ul className="list-disc ml-6 space-y-2 text-slate-800">
                    <li><strong>Legal Advice:</strong> We do not assess the merits of your claim or advise on legal strategy</li>
                    <li><strong>Solicitor Services:</strong> We are not regulated by the Solicitors Regulation Authority (SRA)</li>
                    <li><strong>Court Representation:</strong> We do not represent you in court or file documents on your behalf</li>
                    <li><strong>Guarantee of Success:</strong> We do not guarantee that your claim will succeed or that you will recover debts</li>
                    <li><strong>Document Review:</strong> We do not review or verify the accuracy of generated documents</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.3 AI-Generated Content Disclaimer</h3>
                <p className="text-slate-700">
                  All documents are generated by artificial intelligence (Anthropic Claude, Google Gemini).
                  While we strive for accuracy, <strong>AI may produce errors, omissions, or "hallucinations"</strong>.
                  You MUST carefully review all generated content before use.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: User Responsibilities */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">3. User Responsibilities</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.1 Accuracy of Information</h3>
                <p className="text-slate-700">You are solely responsible for:</p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Ensuring all information you provide (debtor details, amounts, dates) is accurate and truthful</li>
                  <li>Verifying that you have a valid legal claim before using the Service</li>
                  <li>Checking that the generated documents are correct and appropriate for your case</li>
                  <li>Complying with the Pre-Action Protocol for Debt Claims (Practice Direction Pre-Action Conduct)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.2 Professional Review Required</h3>
                <p className="text-slate-700">
                  <strong>We strongly recommend that you:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Have a solicitor review all documents before sending them</li>
                  <li>Seek legal advice if you are unsure about any aspect of your claim</li>
                  <li>Verify all legal calculations (interest, fees, compensation) independently</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.3 Prohibited Uses</h3>
                <p className="text-slate-700 mb-2">You agree NOT to use ClaimCraft UK to:</p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Make fraudulent, vexatious, or unfounded claims</li>
                  <li>Harass, threaten, or intimidate debtors unlawfully</li>
                  <li>Generate documents for illegal purposes</li>
                  <li>Claim debts that are statute-barred (over 6 years old in most cases)</li>
                  <li>Violate the Consumer Credit Act 1974 or other debt collection regulations</li>
                  <li>Reverse-engineer, copy, or resell the Service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Limitation of Liability */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">4. Limitation of Liability</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">4.1 No Warranty</h3>
                <p className="text-slate-700">
                  ClaimCraft UK is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without
                  warranties of any kind, either express or implied, including but not limited to:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Accuracy, completeness, or reliability of generated documents</li>
                  <li>Fitness for a particular purpose</li>
                  <li>Non-infringement of third-party rights</li>
                  <li>Uninterrupted or error-free operation</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">4.2 Exclusion of Liability</h3>
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
                  <p className="text-slate-800 font-semibold mb-2">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR:
                  </p>
                  <ul className="list-disc ml-6 space-y-2 text-slate-700">
                    <li>Loss or damage resulting from AI errors, omissions, or inaccuracies in generated documents</li>
                    <li>Legal costs, court fees, or damages if your claim fails</li>
                    <li>Claims being struck out due to non-compliance with court rules or protocols</li>
                    <li>Loss of business, revenue, or profits</li>
                    <li>Data loss or corruption</li>
                    <li>Indirect, consequential, or punitive damages</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">4.3 Maximum Liability Cap</h3>
                <p className="text-slate-700">
                  Our total liability to you for all claims arising from your use of the Service shall not exceed
                  <strong> £100 (one hundred pounds sterling)</strong> or the amount you paid for the Service
                  (if any), whichever is greater.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">4.4 Legal Exceptions</h3>
                <p className="text-slate-700">
                  Nothing in these Terms excludes or limits our liability for:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Death or personal injury caused by our negligence</li>
                  <li>Fraud or fraudulent misrepresentation</li>
                  <li>Any liability that cannot be excluded under UK law</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Intellectual Property */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">5. Intellectual Property</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">5.1 Ownership of Platform</h3>
                <p className="text-slate-700">
                  ClaimCraft UK, including all software, design, text, graphics, and logos, is owned by us and
                  protected by UK copyright, trademark, and intellectual property laws. You may not copy,
                  reproduce, or redistribute any part of the Platform without written permission.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">5.2 Generated Documents</h3>
                <p className="text-slate-700">
                  <strong>You own the documents generated by the Service.</strong> Once created, you may use,
                  edit, and file them as you see fit. However, you may not resell or redistribute the ClaimCraft
                  UK software or templates.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">5.3 License to Use</h3>
                <p className="text-slate-700">
                  We grant you a limited, non-exclusive, non-transferable, revocable license to access and use
                  ClaimCraft UK for your personal or business debt recovery purposes. This license terminates
                  if you breach these Terms.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Data and Privacy */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">6. Data and Privacy</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                Your use of ClaimCraft UK is subject to our <strong>Privacy Policy</strong>, which explains
                how we collect, use, and protect your personal data in compliance with UK GDPR.
              </p>

              <p className="text-slate-700">
                <strong>Key points:</strong>
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li>Your claim data is stored locally in your browser (not on our servers)</li>
                <li>AI providers (Anthropic, Google) process your data to generate documents</li>
                <li>You can export or delete your data at any time</li>
              </ul>

              <p className="text-slate-700 mt-3">
                <strong>Your Responsibilities:</strong> If you include personal data about debtors (e.g., names,
                addresses), you must comply with UK GDPR when processing and storing that data.
              </p>
            </div>
          </section>

          {/* Section 7: Service Availability */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">7. Service Availability</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                We strive to keep ClaimCraft UK available 24/7, but we do not guarantee uninterrupted access.
                The Service may be unavailable due to:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li>Scheduled maintenance</li>
                <li>Third-party service outages (AI providers, hosting, etc.)</li>
                <li>Technical failures or security incidents</li>
              </ul>

              <p className="text-slate-700 mt-3">
                We reserve the right to suspend, modify, or discontinue the Service at any time without notice.
              </p>
            </div>
          </section>

          {/* Section 8: Pricing and Payments */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">8. Pricing and Payments</h2>
            </div>

            <div className="ml-8 space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">8.1 Current Pricing</h3>
                <p className="text-slate-700">
                  ClaimCraft UK is currently <strong>free to use</strong> during the beta phase. We reserve
                  the right to introduce paid plans in the future with at least 30 days' notice.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">8.2 Future Paid Plans</h3>
                <p className="text-slate-700">
                  If we introduce paid subscriptions, existing users will be notified via email and given the
                  option to continue on a grandfathered plan or upgrade to a paid tier.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">8.3 Court Fees (Separate)</h3>
                <p className="text-slate-700">
                  ClaimCraft UK calculates court fees, but you are responsible for paying these fees directly
                  to HM Courts & Tribunals Service when filing Form N1. Court fees are NOT included in any
                  subscription price.
                </p>
              </div>
            </div>
          </section>

          {/* Section 9: Termination */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">9. Termination</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                <strong>You may stop using the Service at any time</strong> by clearing your browser data.
              </p>

              <p className="text-slate-700">
                <strong>We may suspend or terminate your access</strong> if you:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li>Violate these Terms</li>
                <li>Use the Service for illegal or fraudulent purposes</li>
                <li>Abuse or misuse the Platform (e.g., excessive API usage, reverse engineering)</li>
              </ul>

              <p className="text-slate-700 mt-3">
                Upon termination, all licenses granted to you will cease immediately. Sections 4 (Limitation
                of Liability), 5 (Intellectual Property), and 10 (Governing Law) survive termination.
              </p>
            </div>
          </section>

          {/* Section 10: Governing Law */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">10. Governing Law and Disputes</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                These Terms are governed by the laws of <strong>England and Wales</strong>.
              </p>

              <p className="text-slate-700">
                Any disputes arising from these Terms or your use of the Service will be subject to the
                exclusive jurisdiction of the courts of England and Wales.
              </p>

              <p className="text-slate-700 mt-3">
                <strong>Informal Resolution:</strong> Before filing a legal claim, we encourage you to contact
                us at <a href="mailto:support@claimcraft.uk" className="text-teal-700 underline">support@claimcraft.uk</a> to
                resolve the issue amicably.
              </p>
            </div>
          </section>

          {/* Section 11: Changes to Terms */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">11. Changes to These Terms</h2>
            </div>

            <div className="ml-8">
              <p className="text-slate-700">
                We may update these Terms from time to time. Changes will be posted on this page with an
                updated "Last updated" date. Material changes will be communicated via email (if we have your
                contact details) or a prominent notice in the application.
              </p>
              <p className="text-slate-700 mt-3">
                Continued use of ClaimCraft UK after changes constitutes acceptance of the new Terms.
              </p>
            </div>
          </section>

          {/* Section 12: Miscellaneous */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">12. Miscellaneous</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute
                the entire agreement between you and ClaimCraft UK.
              </p>

              <p className="text-slate-700">
                <strong>Severability:</strong> If any provision of these Terms is found to be invalid or
                unenforceable, the remaining provisions will remain in full force.
              </p>

              <p className="text-slate-700">
                <strong>No Waiver:</strong> Our failure to enforce any right or provision does not constitute
                a waiver of that right.
              </p>

              <p className="text-slate-700">
                <strong>Assignment:</strong> You may not transfer or assign your rights under these Terms. We
                may assign our rights to any successor or affiliate.
              </p>
            </div>
          </section>

          {/* Section 13: Contact Information */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">13. Contact Us</h2>
            </div>

            <div className="ml-8">
              <p className="text-slate-700 mb-4">
                If you have questions about these Terms or the Service:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700">
                  <strong>Email:</strong> <a href="mailto:support@claimcraft.uk" className="text-teal-700 underline">support@claimcraft.uk</a><br />
                  <strong>Response Time:</strong> We aim to respond within 48 hours
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-6 mt-10">
            <p className="text-sm text-slate-500 text-center">
              These Terms of Service were last updated on 23 November 2025 and are effective immediately.
            </p>
            <p className="text-sm text-slate-500 text-center mt-2">
              By using ClaimCraft UK, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
