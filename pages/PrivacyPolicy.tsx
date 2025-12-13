import React from 'react';
import { ArrowLeft, Shield, Lock, Database, Eye, UserCheck, FileText, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Application
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-100 p-3 rounded-xl">
                <Shield className="w-6 h-6 text-teal-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 font-display">Privacy Policy</h1>
            </div>
            <p className="text-slate-600 text-lg">
              Last updated: <strong>23 November 2025</strong>
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-10">
            <p className="text-slate-700 leading-relaxed mb-4">
              ClaimCraft UK ("we", "our", or "us") is committed to protecting your privacy and personal data.
              This Privacy Policy explains how we collect, use, store, and protect your information when you
              use our AI-powered debt recovery document generation service.
            </p>
            <p className="text-slate-700 leading-relaxed">
              We are compliant with the UK General Data Protection Regulation (UK GDPR) and the Data Protection
              Act 2018. By using ClaimCraft UK, you consent to the practices described in this policy.
            </p>
          </section>

          {/* Section 1: Information We Collect */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">1. Information We Collect</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">1.1 Information You Provide</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Claim Details:</strong> Debtor names, addresses, company numbers, debt amounts, payment dates, and other case information</li>
                  <li><strong>Timeline Events:</strong> Dates and descriptions of interactions with debtors</li>
                  <li><strong>Evidence Files:</strong> Uploaded documents, invoices, contracts, and correspondence</li>
                  <li><strong>Accounting Data:</strong> If you connect Xero or other accounting platforms, we receive invoice data and customer information</li>
                  <li><strong>Generated Content:</strong> AI-generated legal documents and chat transcripts</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">1.2 Automatically Collected Information</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Technical Data:</strong> Browser type, operating system, device information</li>
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent in the application</li>
                  <li><strong>Local Storage:</strong> Claim drafts and application preferences stored in your browser</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">1.3 Third-Party Data</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Companies House:</strong> Public company registration data when you search for company details</li>
                  <li><strong>Xero/Accounting Software:</strong> Invoice and customer data if you grant us access</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">2. How We Use Your Information</h2>
            </div>

            <div className="ml-8 space-y-4">
              <p className="text-slate-700">We process your personal data for the following lawful purposes:</p>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.1 Service Provision (Contractual Necessity)</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Generate AI-powered legal documents (Letters Before Action, Form N1)</li>
                  <li>Calculate statutory interest, court fees, and compensation</li>
                  <li>Provide legal guidance and claim assessment</li>
                  <li>Store your claim drafts for later retrieval</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.2 Improving Our Service (Legitimate Interest)</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Fix bugs and improve application performance</li>
                  <li>Train and refine AI models (anonymized data only)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">2.3 Legal Compliance</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li>Comply with court orders, legal processes, or regulatory requirements</li>
                  <li>Maintain compliance logs for audit purposes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Data Storage and Security */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">3. Data Storage and Security</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.1 Where We Store Data</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Browser Storage:</strong> Claim drafts, preferences, and OAuth tokens are stored locally in your browser using IndexedDB and localStorage</li>
                  <li><strong>No Server Storage (Current Version):</strong> We do not currently upload your claim data to our servers. All processing happens in your browser.</li>
                  <li><strong>Future Cloud Storage:</strong> We may offer optional cloud backup in the future with explicit consent</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.2 Third-Party Processors</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Anthropic (Claude AI):</strong> Your claim details are sent to Anthropic's API to generate legal documents. See Anthropic's privacy policy at anthropic.com/privacy</li>
                  <li><strong>Google (Gemini AI):</strong> Evidence files may be analyzed by Google's Gemini API. See Google's privacy policy at google.com/policies/privacy</li>
                  <li><strong>Nango (OAuth):</strong> Handles secure authentication for accounting integrations</li>
                </ul>
                <p className="text-slate-700 mt-2">
                  <strong>Data Processing Agreements:</strong> We have data processing agreements in place with all third-party AI providers
                  to ensure they do not use your data to train their models without consent.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.3 Security Measures</h3>
                <ul className="list-disc ml-6 space-y-2 text-slate-700">
                  <li><strong>Encryption in Transit:</strong> All data sent to AI providers is encrypted using TLS 1.3</li>
                  <li><strong>No Plain-Text API Keys:</strong> We do not expose API keys in the browser (production version uses backend proxy)</li>
                  <li><strong>Local-First Architecture:</strong> Your data stays on your device unless explicitly sent to AI services</li>
                  <li><strong>Regular Security Audits:</strong> We conduct quarterly security reviews and penetration testing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">3.4 Data Retention</h3>
                <p className="text-slate-700">
                  <strong>Browser Storage:</strong> Data persists in your browser until you manually clear it or delete claims.<br />
                  <strong>Compliance Logs:</strong> Anonymized usage logs are retained for 12 months, then automatically deleted.<br />
                  <strong>AI Provider Data:</strong> Anthropic and Google retain API request data according to their policies (typically 30 days for debugging).
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Your Rights */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">4. Your Rights Under UK GDPR</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">You have the following rights regarding your personal data:</p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li><strong>Right to Access:</strong> Request a copy of all data we hold about you</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format (JSON)</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Right to Withdraw Consent:</strong> Stop us from processing your data at any time</li>
              </ul>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mt-4">
                <p className="text-slate-800 font-semibold mb-2">How to Exercise Your Rights:</p>
                <ul className="list-disc ml-6 space-y-1 text-slate-700 text-sm">
                  <li><strong>Delete All Data:</strong> Clear your browser's local storage or use the "Delete All Claims" feature in the Dashboard</li>
                  <li><strong>Export Data:</strong> Use the "Export All Data" button in Settings to download your claims as JSON</li>
                  <li><strong>Contact Us:</strong> Email <a href="mailto:privacy@claimcraft.uk" className="text-teal-700 underline">privacy@claimcraft.uk</a> for data requests or questions</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Sharing Your Data */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">5. Data Sharing and Disclosure</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700"><strong>We do NOT sell your personal data to third parties.</strong></p>

              <p className="text-slate-700">We may share your data in the following limited circumstances:</p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li><strong>AI Service Providers:</strong> Anthropic and Google receive claim details to generate documents (as described above)</li>
                <li><strong>Legal Requirements:</strong> If required by law, court order, or government investigation</li>
                <li><strong>Business Transfers:</strong> If ClaimCraft UK is acquired, your data may transfer to the new owner (you will be notified)</li>
                <li><strong>With Your Consent:</strong> Any other sharing requires your explicit permission</li>
              </ul>
            </div>
          </section>

          {/* Section 6: Cookies and Tracking */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">6. Cookies and Local Storage</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                ClaimCraft UK uses <strong>local storage</strong> and <strong>IndexedDB</strong> (not traditional cookies) to store:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li>Claim drafts and case information</li>
                <li>Application preferences (theme, settings)</li>
                <li>OAuth tokens for accounting integrations</li>
                <li>Compliance logs (anonymized, retained for 12 months)</li>
              </ul>

              <p className="text-slate-700 mt-3">
                <strong>We do not use third-party tracking cookies or advertising cookies.</strong>
              </p>

              <p className="text-slate-700 mt-3">
                <strong>Analytics (if enabled):</strong> We may use privacy-friendly analytics (e.g., Plausible Analytics)
                which does not use cookies or track personal data. This is GDPR-compliant by default.
              </p>
            </div>
          </section>

          {/* Section 7: International Transfers */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">7. International Data Transfers</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                Your data may be processed outside the UK when using AI services:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-slate-700">
                <li><strong>Anthropic (USA):</strong> Operates under US-UK data transfer agreements and UK adequacy decisions</li>
                <li><strong>Google (USA/EU):</strong> Uses Standard Contractual Clauses (SCCs) approved by the UK ICO</li>
              </ul>

              <p className="text-slate-700 mt-3">
                We ensure all international transfers comply with UK GDPR Article 46 requirements.
              </p>
            </div>
          </section>

          {/* Section 8: Children's Privacy */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">8. Children's Privacy</h2>
            </div>

            <div className="ml-8">
              <p className="text-slate-700">
                ClaimCraft UK is not intended for users under 18 years of age. We do not knowingly collect
                data from children. If you believe a child has provided us with personal data, please contact
                us immediately at <a href="mailto:privacy@claimcraft.uk" className="text-teal-700 underline">privacy@claimcraft.uk</a>.
              </p>
            </div>
          </section>

          {/* Section 9: Changes to This Policy */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">9. Changes to This Privacy Policy</h2>
            </div>

            <div className="ml-8">
              <p className="text-slate-700">
                We may update this Privacy Policy from time to time. Changes will be posted on this page
                with an updated "Last updated" date. Continued use of ClaimCraft UK after changes constitutes
                acceptance of the new policy.
              </p>
              <p className="text-slate-700 mt-3">
                <strong>Material changes</strong> (e.g., new data processing activities) will be communicated
                via email if we have your contact details, or via a prominent banner in the application.
              </p>
            </div>
          </section>

          {/* Section 10: Contact Us */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-teal-600" />
              <h2 className="text-2xl font-bold text-slate-900">10. Contact Information</h2>
            </div>

            <div className="ml-8 space-y-3">
              <p className="text-slate-700">
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal data:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-slate-700 font-semibold mb-2">Data Protection Contact:</p>
                <p className="text-slate-700">
                  <strong>Email:</strong> <a href="mailto:privacy@claimcraft.uk" className="text-teal-700 underline">privacy@claimcraft.uk</a><br />
                  <strong>Response Time:</strong> We aim to respond within 48 hours
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <p className="text-slate-700 font-semibold mb-2">Complaints to the ICO:</p>
                <p className="text-slate-700">
                  If you believe we have not handled your data correctly, you have the right to lodge a complaint
                  with the UK Information Commissioner's Office (ICO):
                </p>
                <p className="text-slate-700 mt-2">
                  <strong>Website:</strong> <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">ico.org.uk</a><br />
                  <strong>Phone:</strong> 0303 123 1113
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-6 mt-10">
            <p className="text-sm text-slate-500 text-center">
              This Privacy Policy was last updated on 23 November 2025 and is effective immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
