# Data Retention Policy
**ClaimCraft UK**

**Effective Date:** 23 November 2025
**Last Updated:** 23 November 2025
**Policy Owner:** Data Protection Lead
**Review Cycle:** Annually

---

## 1. Purpose and Scope

### 1.1 Purpose

This Data Retention Policy defines how long ClaimCraft UK retains personal data and establishes procedures for the secure deletion of data that is no longer needed. This policy ensures compliance with:

- UK General Data Protection Regulation (UK GDPR)
- Data Protection Act 2018
- Pre-Action Protocol for Debt Claims
- Legal and regulatory requirements

### 1.2 Scope

This policy applies to:
- All personal data collected and processed by ClaimCraft UK
- Data stored in user browsers (local storage, IndexedDB)
- Data transmitted to third-party AI services
- Compliance and anonymized usage logs

### 1.3 Principles

We retain personal data only for as long as necessary to:
1. Provide our debt recovery document generation service
2. Comply with legal obligations
3. Resolve disputes or enforce agreements
4. Improve service quality (anonymized data only)

---

## 2. Data Categories and Retention Periods

### 2.1 User Claim Data

| Data Type | Examples | Retention Period | Legal Basis | Deletion Method |
|-----------|----------|------------------|-------------|-----------------|
| **Claimant Information** | Name, address, company number | User-controlled (indefinite) | Contract | Manual deletion by user |
| **Defendant Information** | Name, address, company details | User-controlled (indefinite) | Contract | Manual deletion by user |
| **Debt Details** | Amount owed, invoice dates, payment terms | User-controlled (indefinite) | Contract | Manual deletion by user |
| **Timeline Events** | Chaser emails, LBA sent date, court filing dates | User-controlled (indefinite) | Contract | Manual deletion by user |
| **Evidence Files** | Invoices, contracts, correspondence | User-controlled (indefinite) | Contract | Manual deletion by user |
| **Generated Documents** | Draft LBAs, Form N1 claims | User-controlled (indefinite) | Contract | Manual deletion by user |
| **AI Chat Transcripts** | Questions and answers with AI assistant | User-controlled (indefinite) | Contract | Manual deletion by user |

**Justification:**
- Users need access to claim drafts for the duration of their legal case (potentially years)
- UK Limitation Act 1980 allows 6 years for debt recovery claims
- Users must retain their own records for audit and legal purposes
- Data is stored locally in the user's browser, not on ClaimCraft servers

**User Control:**
- Users can delete individual claims at any time via Dashboard
- Users can clear all data by clearing browser storage
- **TODO:** Implement "Delete All Claims" button in Settings (see Section 5)

---

### 2.2 Application Preferences

| Data Type | Examples | Retention Period | Deletion Method |
|-----------|----------|------------------|-----------------|
| **UI Settings** | Theme, wizard progress, sidebar state | User-controlled (indefinite) | Clear browser data |
| **Disclaimer Acceptance** | Timestamp of disclaimer acceptance | User-controlled (indefinite) | Clear browser data |

**Justification:**
- Necessary for app functionality and user experience
- No personal data—only application state
- Minimal privacy impact

---

### 2.3 Accounting Integration Data

| Data Type | Examples | Retention Period | Deletion Method |
|-----------|----------|------------------|-----------------|
| **OAuth Access Tokens** | Xero access token, refresh token | Until user disconnects | "Disconnect Xero" button |
| **Connection Metadata** | Connection ID, provider name | Until user disconnects | "Disconnect Xero" button |
| **Imported Invoice Data** | Invoice amounts, debtor names, dates | User-controlled (after import) | Delete claim in Dashboard |

**Justification:**
- OAuth tokens required for ongoing Xero integration
- Imported data becomes part of claim (user-controlled retention)
- Users can revoke access at any time

**Security:**
- Tokens stored in browser localStorage (not accessible to other sites)
- Refresh tokens allow re-authentication without password
- **Recommendation:** Tokens should expire after 90 days of inactivity (TODO)

---

### 2.4 Compliance and Usage Logs

| Data Type | Examples | Retention Period | Deletion Method |
|-----------|----------|------------------|-----------------|
| **Anonymized Usage Logs** | Feature usage, error rates, performance metrics | **12 months** | Automatic deletion |
| **Compliance Logs** | GDPR data access requests, deletion timestamps | **12 months** | Automatic deletion |

**Implementation:**
```typescript
// App.tsx:143-163
const lastCleanup = localStorage.getItem('lastLogCleanup');
const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

if (!lastCleanup || parseInt(lastCleanup) < monthAgo) {
    clearOldComplianceLogs(12); // Delete logs older than 12 months
    localStorage.setItem('lastLogCleanup', Date.now().toString());
}
```

**Justification:**
- 12 months aligns with UK ICO guidance for operational logs
- Logs are anonymized (no PII) and used solely for service improvement
- Automated deletion prevents indefinite retention

**Data Minimization:**
- ✅ No IP addresses logged
- ✅ No user identifiers stored
- ✅ No tracking cookies used
- ✅ Logs contain only aggregated, anonymized metrics

---

### 2.5 Third-Party AI Provider Data

| Provider | Data Sent | Retention Period | DPA Status |
|----------|-----------|------------------|------------|
| **Anthropic (Claude AI)** | Claim details for document generation | 30 days (API logs) | ✅ DPA available |
| **Google (Gemini AI)** | Evidence files for AI analysis | 30 days (API logs) | ✅ DPA available |

**Anthropic Retention Policy:**
- API request/response logs: **30 days** (for debugging, then auto-deleted)
- Training data: **NOT used** (by default, unless user opts in)
- Source: [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

**Google Gemini Retention Policy:**
- API request/response logs: **30 days** (standard tier)
- Training data: **Depends on API tier** (verify zero retention for production)
- Source: [Google Cloud Data Processing](https://cloud.google.com/terms/data-processing-addendum)

**User Control:**
- Users can see what data is sent to AI in the UI
- **TODO:** Add "Do not send to AI" option for sensitive claims

**Audit Trail:**
- Log all AI API calls with timestamps (anonymized)
- Retain audit log for 12 months, then delete

---

## 3. Legal Retention Requirements

### 3.1 UK Legal Obligations

| Law/Regulation | Data Type | Minimum Retention | ClaimCraft Policy |
|----------------|-----------|-------------------|-------------------|
| **Limitation Act 1980** | Debt claim records | 6 years (from claim accrual) | User-controlled (indefinite) |
| **HMRC Tax Records** | Financial transactions | 6 years | N/A (we don't process payments) |
| **Data Protection Act 2018** | Consent records | Duration of processing + 1 year | User-controlled |
| **Pre-Action Protocol** | Timeline, evidence, correspondence | Until case concluded + 6 years | User-controlled |

**Justification for User-Controlled Retention:**
- Users are the data controllers for their own legal claims
- ClaimCraft is a tool, not a records manager
- Users must comply with their own legal retention obligations
- We provide the capability to retain indefinitely; users decide when to delete

**Recommendation:**
- Display notice in UI: *"Keep this claim until 6 years after the debt is resolved, as required by UK law"*
- **TODO:** Add retention guidance tooltip in Dashboard

---

### 3.2 Litigation Hold

In the event ClaimCraft UK is involved in legal proceedings:
- All relevant data will be placed on "litigation hold" (suspension of deletion)
- Automated deletion scripts will be disabled for affected data
- Legal team will determine when hold can be lifted
- Users will be notified if their data is subject to litigation hold

**Current Status:** No active litigation holds.

---

## 4. Deletion Procedures

### 4.1 Automated Deletion

**Compliance Logs (12 Months):**
```typescript
// services/complianceLogger.ts
export async function clearOldComplianceLogs(monthsToKeep: number): Promise<number> {
    const cutoffDate = Date.now() - (monthsToKeep * 30 * 24 * 60 * 60 * 1000);
    const allLogs = await getAllComplianceLogs();
    const logsToDelete = allLogs.filter(log => log.timestamp < cutoffDate);

    // Delete logs older than retention period
    for (const log of logsToDelete) {
        await deleteComplianceLog(log.id);
    }

    return logsToDelete.length;
}
```

**Execution:**
- Runs monthly on application startup (see `App.tsx:143-163`)
- Logs deletion count to console (for audit)
- Non-critical operation (failures don't block app)

---

### 4.2 User-Initiated Deletion

**Single Claim Deletion:**
```typescript
// Dashboard.tsx
const handleDeleteClaim = async (claimId: string) => {
    await deleteClaimFromStorage(claimId);
    setDashboardClaims(dashboardClaims.filter(c => c.id !== claimId));
};
```

**Deletion Scope:**
- Claim details (claimant, defendant, debt amount)
- Timeline events
- Evidence file references (files themselves are not uploaded to servers)
- Generated documents
- AI chat history

**Confirmation:**
- User must confirm deletion (prevents accidental loss)
- Deletion is immediate and irreversible
- No "recycle bin" or recovery mechanism (privacy-first design)

---

### 4.3 Account/Data Erasure ("Right to be Forgotten")

**Current Process:**
1. User clears browser data (localStorage, IndexedDB)
2. All ClaimCraft data is permanently deleted

**TODO - Improved Process:**
1. Add "Delete All Data" button in Settings
2. Confirm with modal: *"This will permanently delete all your claims, settings, and connections. This cannot be undone."*
3. Clear all browser storage
4. Log erasure in compliance log (before deleting log itself)
5. Redirect user to landing page

**Code Example (TODO):**
```typescript
// services/storageService.ts
export const deleteAllUserData = async () => {
    // 1. Log erasure request
    await logComplianceEvent('USER_DATA_ERASURE', { timestamp: Date.now() });

    // 2. Delete all claims
    const allClaims = await getStoredClaims();
    for (const claim of allClaims) {
        await deleteClaimFromStorage(claim.id);
    }

    // 3. Delete OAuth tokens
    localStorage.removeItem('xeroAuth');
    localStorage.removeItem('nangoConnection');

    // 4. Delete preferences
    localStorage.removeItem('appSettings');

    // 5. Delete compliance logs (after logging erasure)
    setTimeout(() => {
        localStorage.removeItem('complianceLogs');
    }, 5000); // 5-second delay to log erasure first

    // 6. Confirm deletion
    return true;
};
```

---

### 4.4 Third-Party Data Deletion

**AI Provider Data:**
- Anthropic: 30-day auto-delete (no manual deletion API)
- Google: 30-day auto-delete (no manual deletion API)
- **Recommendation:** Request deletion APIs from providers (enterprise tier)

**Accounting Integration:**
- Xero: User revokes access via "Disconnect" button
- Nango: Connection deleted via API
- **TODO:** Verify Nango deletes OAuth tokens server-side

---

## 5. Data Portability (Export)

### 5.1 Current Status

⚠️ **NOT YET IMPLEMENTED**

**GDPR Requirement:** Article 20 (Right to Data Portability)
- Users must be able to export their data in machine-readable format (e.g., JSON)

---

### 5.2 Implementation Plan

**Feature:** "Export All Data as JSON" button in Dashboard/Settings

**Code Example (TODO):**
```typescript
// services/storageService.ts
export const exportAllUserData = async (): Promise<Blob> => {
    const allClaims = await getStoredClaims();
    const settings = localStorage.getItem('appSettings');
    const connections = localStorage.getItem('nangoConnection');

    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        claims: allClaims,
        settings: settings ? JSON.parse(settings) : null,
        connections: connections ? JSON.parse(connections) : null,
        // Do NOT export OAuth tokens (sensitive)
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
};

// Usage in Dashboard
const handleExportData = async () => {
    const blob = await exportAllUserData();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `claimcraft-backup-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
};
```

**Export Contents:**
- ✅ All claim data (JSON format)
- ✅ Application settings
- ✅ Connection metadata (not tokens)
- ❌ OAuth tokens (security risk—users should reconnect)
- ❌ Compliance logs (anonymized, not personal data)

**Timeline:** ❌ **MUST IMPLEMENT BEFORE PUBLIC LAUNCH** (GDPR requirement)

---

## 6. Data Breach Response

### 6.1 Breach Notification Timeline

**UK GDPR Article 33:** Report breaches to ICO within **72 hours**

**ClaimCraft Procedure:**
1. **Detection:** Identify data breach (e.g., API key leak, unauthorized access)
2. **Assessment (0-24 hours):**
   - Determine scope (how many users affected)
   - Classify severity (low, medium, high, critical)
   - Identify root cause
3. **Containment (24-48 hours):**
   - Stop the breach (revoke API keys, patch vulnerability)
   - Preserve evidence (logs, screenshots)
4. **Notification (48-72 hours):**
   - ICO notification via online portal
   - User notification (if high risk to their rights)
5. **Remediation (72+ hours):**
   - Fix root cause
   - Implement preventive measures
   - Update security audit log

---

### 6.2 Breach Scenarios

| Scenario | Severity | Notification Required? | Response |
|----------|----------|----------------------|----------|
| **API keys exposed** | 🔴 CRITICAL | Yes (ICO + users) | Immediate key rotation, backend migration |
| **XSS vulnerability** | 🟠 HIGH | Yes (ICO) | Patch vulnerability, audit logs for exploitation |
| **Browser localStorage accessed** | 🟡 MEDIUM | Depends on user impact | User education (clear browser data) |
| **Third-party provider breach** | 🟠 HIGH | Yes (if affects our users) | Coordinate with provider, notify users |
| **Anonymized log leak** | 🟢 LOW | No (not personal data) | Fix leak, review anonymization |

---

### 6.3 Contact for Breach Reporting

**Internal:**
- Email: security@claimcraft.uk
- Response Time: Immediate (24/7 monitoring)

**External (ICO):**
- Report Portal: [https://ico.org.uk/for-organisations/report-a-breach/](https://ico.org.uk/for-organisations/report-a-breach/)
- Phone: 0303 123 1113

---

## 7. Review and Updates

### 7.1 Annual Review

This policy will be reviewed annually (every November) to ensure:
- Compliance with evolving GDPR/DPA regulations
- Alignment with business practices
- Effectiveness of deletion procedures

**Next Review Date:** November 2026

---

### 7.2 Policy Change Log

| Version | Date | Changes | Approver |
|---------|------|---------|----------|
| 1.0 | 2025-11-23 | Initial policy created | Project Owner |

---

### 7.3 Related Policies

- Privacy Policy (`pages/PrivacyPolicy.tsx`)
- Terms of Service (`pages/TermsOfService.tsx`)
- GDPR Compliance Audit (`GDPR_COMPLIANCE_AUDIT.md`)
- Security Policy (**TODO:** Create separate document)

---

## 8. Responsibilities

### 8.1 Data Protection Lead
- Ensure compliance with retention policy
- Approve exceptions to retention periods
- Coordinate with ICO on data protection matters

### 8.2 Development Team
- Implement automated deletion scripts
- Add data export functionality
- Monitor compliance log cleanup

### 8.3 Users (Data Subjects)
- Manage their own claim data (delete when no longer needed)
- Comply with legal retention requirements for their claims
- Request data export or erasure via privacy@claimcraft.uk

---

## 9. Exceptions and Overrides

### 9.1 Legal Hold

If ClaimCraft UK is subject to legal proceedings, data retention may be suspended for affected records. This overrides automated deletion.

**Process:**
1. Legal team identifies affected data
2. Automated deletion scripts disabled for those records
3. Data retained until legal hold lifted
4. Users notified if their data is affected

---

### 9.2 Regulatory Requests

If a regulator (ICO, HMRC, etc.) requests data:
- Retain data until request fulfilled
- Comply with legal timelines
- Document request in compliance log

---

## 10. Accountability

### 10.1 Audit Trail

All data deletion activities are logged:
- Timestamp
- Data category deleted
- Deletion method (auto, user-initiated, admin)
- Anonymized identifier (no PII)

**Log Retention:** 12 months (then auto-deleted)

---

### 10.2 Compliance Reporting

Quarterly reports to Data Protection Lead:
- Number of deletions (auto vs. manual)
- Compliance log cleanup statistics
- Data export requests
- Breach incidents (if any)

**Current Status:** Reporting not yet implemented (solo project)

---

## Contact Information

**Data Protection Queries:**
- Email: privacy@claimcraft.uk
- Response Time: 48 hours

**Data Breach Reporting:**
- Email: security@claimcraft.uk
- Response Time: Immediate (24/7)

**ICO Registration:**
- Not yet required (< 250 employees, no high-risk processing)
- To be registered before scaling beyond beta

---

**Policy Version:** 1.0
**Effective Date:** 23 November 2025
**Next Review:** November 2026
**Approved By:** Project Owner
