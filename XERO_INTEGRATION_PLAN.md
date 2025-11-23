# Xero Integration with Nango - Implementation Plan

## 🎯 Objective

Enable users to connect their Xero accounting system and automatically import overdue invoices into ClaimCraft for debt recovery.

---

## 📋 Overview

**Integration Partner:** Nango (https://nango.dev)
**Accounting System:** Xero
**Auth Method:** OAuth 2.0 (managed by Nango)
**Frontend SDK:** `@nangohq/frontend`

**Why Nango?**
- Handles OAuth flow complexity
- Manages token refresh automatically
- Provides unified API across accounting systems
- Securely stores credentials server-side
- Easy to extend to QuickBooks, FreeAgent, Sage later

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────┐
│   User      │
│  Dashboard  │
└──────┬──────┘
       │ Clicks "Connect Xero"
       ↓
┌──────────────────────┐
│  Nango OAuth Popup   │
│  (xero.com login)    │
└──────┬───────────────┘
       │ User authorizes ClaimCraft
       ↓
┌──────────────────────┐
│  Nango Backend       │
│  Stores tokens       │
└──────┬───────────────┘
       │ Returns connection ID
       ↓
┌──────────────────────┐
│  ClaimCraft          │
│  Fetches invoices    │
└──────┬───────────────┘
       │ GET /invoices via Nango
       ↓
┌──────────────────────┐
│  Filter Overdue      │
│  (status AUTHORISED) │
│  (DueDate < today)   │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Display Selection   │
│  UI (table)          │
└──────┬───────────────┘
       │ User selects invoices
       ↓
┌──────────────────────┐
│  Convert to          │
│  ClaimState format   │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  Add to Dashboard    │
└────────────────────────┘
```

---

## 📁 New Files to Create

### 1. `services/nangoClient.ts`
**Purpose:** Wrapper around Nango SDK for ClaimCraft

**Key Methods:**
```typescript
class NangoClient {
  // Initialize with public key
  static initialize(publicKey: string): void

  // Trigger Xero OAuth flow
  static connectXero(): Promise<string> // returns connectionId

  // Check if Xero is connected
  static isXeroConnected(): Promise<boolean>

  // Get Xero connection metadata
  static getXeroConnection(): Promise<Connection | null>

  // Disconnect Xero
  static disconnectXero(): Promise<void>

  // Generic method to call Nango API
  static callApi<T>(endpoint: string, params?: any): Promise<T>
}
```

**Dependencies:**
- `@nangohq/frontend`

---

### 2. `services/xeroPuller.ts`
**Purpose:** Fetch and transform Xero invoices to ClaimState format

**Key Methods:**
```typescript
class XeroPuller {
  // Fetch all invoices from Xero
  static async fetchInvoices(connectionId: string): Promise<XeroInvoice[]>

  // Filter for overdue invoices only
  static filterOverdueInvoices(invoices: XeroInvoice[]): XeroInvoice[]

  // Transform Xero invoice to ClaimState
  static transformToClaim(invoice: XeroInvoice, claimant: Party): ClaimState

  // Calculate interest based on Late Payment Act
  static calculateInterest(amount: number, dueDate: string): InterestData

  // Get contact details from Xero
  static async fetchContactDetails(contactId: string, connectionId: string): Promise<XeroContact>
}
```

**Xero Invoice Structure (from Nango API):**
```typescript
interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: 'ACCREC'; // Accounts Receivable (sales invoice)
  Contact: {
    ContactID: string;
    Name: string;
  };
  Date: string; // ISO date
  DueDate: string;
  Status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED' | 'PAID' | 'VOIDED';
  LineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax';
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  CurrencyCode: string;
  Reference?: string;
}
```

---

### 3. `components/AccountingIntegration.tsx`
**Purpose:** Modal for managing accounting connections

**UI Structure:**
```
┌─────────────────────────────────────────┐
│  ⚙️  Accounting Integration              │
├─────────────────────────────────────────┤
│                                         │
│  Connect your accounting system to      │
│  automatically import overdue invoices. │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  XERO                             │ │
│  │  [Logo]                           │ │
│  │                                   │ │
│  │  Status: ⚪ Not Connected         │ │
│  │                                   │ │
│  │  [Connect Xero] button            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  OR (if connected):                     │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  XERO                             │ │
│  │  [Logo]                           │ │
│  │                                   │ │
│  │  Status: ✅ Connected              │ │
│  │  Account: ABC Ltd                 │ │
│  │  Connected: 2 days ago            │ │
│  │                                   │ │
│  │  [Import Invoices]  [Disconnect]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Coming Soon:                           │
│  - QuickBooks                           │
│  - FreeAgent                            │
│  - Sage                                 │
│                                         │
│              [Close]                    │
└─────────────────────────────────────────┘
```

**Props:**
```typescript
interface AccountingIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onImportClick: () => void; // Opens XeroInvoiceImporter
}
```

---

### 4. `components/XeroInvoiceImporter.tsx`
**Purpose:** Modal for selecting and importing Xero invoices

**UI Structure:**
```
┌──────────────────────────────────────────────────────────┐
│  📥 Import Overdue Invoices from Xero                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Found 12 overdue invoices in your Xero account          │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ☐  INV-001  │  Acme Corp      │  £5,000  │  15d ⚠️ │ │
│  │ ☐  INV-002  │  Widget Ltd     │  £2,500  │  42d ⚠️ │ │
│  │ ☐  INV-003  │  Tech Solutions │  £8,200  │  7d     │ │
│  │ ☐  INV-004  │  Global Traders │  £1,800  │  90d 🚨 │ │
│  │ ...                                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  Filters: [All] [>30 days] [>60 days] [>90 days]        │
│                                                           │
│  ☑️ Select All  |  Selected: 3 invoices (£15,700)        │
│                                                           │
│              [Cancel]  [Import Selected]                 │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Checkbox selection (individual + select all)
- Filter by days overdue
- Sort by amount, days overdue, customer
- Shows total value of selected invoices
- Progress indicator during import
- Success message with count imported

**Props:**
```typescript
interface XeroInvoiceImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (claims: ClaimState[]) => void; // Adds to dashboard
  claimant: Party; // Current user's business details
}
```

---

## 🔧 File Modifications

### 1. `types.ts`

**Add new interfaces:**
```typescript
// Accounting connection metadata
export interface AccountingConnection {
  provider: 'xero' | 'quickbooks' | 'freeagent' | 'sage';
  connectionId: string; // Nango connection ID
  organizationName: string;
  connectedAt: string; // ISO timestamp
  lastSyncAt: string | null;
}

// Xero-specific types
export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: 'ACCREC';
  Contact: {
    ContactID: string;
    Name: string;
  };
  Date: string;
  DueDate: string;
  Status: 'AUTHORISED' | 'PAID' | 'VOIDED';
  Total: number;
  AmountDue: number;
  CurrencyCode: string;
  Reference?: string;
}

export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  Addresses?: {
    AddressType: 'POBOX' | 'STREET';
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    Region?: string;
    PostalCode?: string;
    Country?: string;
  }[];
  Phones?: {
    PhoneType: 'DEFAULT' | 'MOBILE' | 'FAX';
    PhoneNumber?: string;
  }[];
}
```

**Extend ClaimState:**
```typescript
export interface ClaimState {
  // ... existing fields ...

  // NEW: Track if imported from accounting system
  importSource?: {
    provider: 'xero' | 'quickbooks';
    invoiceId: string;
    importedAt: string;
  };
}
```

---

### 2. `App.tsx`

**Add state:**
```typescript
const [accountingConnection, setAccountingConnection] = useState<AccountingConnection | null>(null);
const [showAccountingModal, setShowAccountingModal] = useState(false);
const [showXeroImporter, setShowXeroImporter] = useState(false);
```

**Add useEffect to check connection on mount:**
```typescript
useEffect(() => {
  const checkXeroConnection = async () => {
    const connected = await NangoClient.isXeroConnected();
    if (connected) {
      const connection = await NangoClient.getXeroConnection();
      setAccountingConnection(connection);
    }
  };
  checkXeroConnection();
}, []);
```

**Add handlers:**
```typescript
const handleXeroImport = (importedClaims: ClaimState[]) => {
  setClaims(prev => [...prev, ...importedClaims]);
  setShowXeroImporter(false);
  // Show success toast
};
```

**Add modals:**
```tsx
<AccountingIntegration
  isOpen={showAccountingModal}
  onClose={() => setShowAccountingModal(false)}
  onImportClick={() => {
    setShowAccountingModal(false);
    setShowXeroImporter(true);
  }}
/>

<XeroInvoiceImporter
  isOpen={showXeroImporter}
  onClose={() => setShowXeroImporter(false)}
  onImport={handleXeroImport}
  claimant={currentClaim?.claimant || INITIAL_PARTY}
/>
```

---

### 3. `components/Dashboard.tsx`

**Add Xero connection indicator:**

In the header section, add:
```tsx
<div className="flex gap-3 w-full md:w-auto">
  {accountingConnection && (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-sm font-medium text-green-700">Xero Connected</span>
    </div>
  )}

  <button onClick={onConnectAccounting} className="...">
    <Link className="w-4 h-4" /> {accountingConnection ? 'Manage' : 'Connect'} Accounting
  </button>

  {/* Existing buttons */}
</div>
```

**Update Import button:**
```tsx
<button onClick={onImportCsv} className="...">
  <Upload className="w-4 h-4" />
  {accountingConnection ? 'Import CSV/Xero' : 'Import'}
</button>
```

Add dropdown menu if connected:
- Import from Xero
- Import CSV
- Manage Connections

---

### 4. `.env.example`

**Add Nango credentials:**
```bash
# Nango Integration (for Xero and other accounting systems)
# Get your public key at: https://app.nango.dev/
# IMPORTANT: Only the PUBLIC key goes here (secret key stays in Nango dashboard)
VITE_NANGO_PUBLIC_KEY=your_nango_public_key_here

# Xero OAuth (handled by Nango - no direct credentials needed)
# Setup: https://nango.dev/docs/integrations/all/xero
```

---

### 5. `vite-env.d.ts`

**Add Nango env var:**
```typescript
interface ImportMetaEnv {
  readonly VITE_ANTHROPIC_API_KEY: string
  readonly VITE_API_KEY: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_NANGO_PUBLIC_KEY?: string // NEW
}
```

---

## 📦 Dependencies

### Install Nango SDK

```bash
npm install @nangohq/frontend
```

**Package versions:**
- `@nangohq/frontend`: `^0.40.0` (latest stable)

---

## 🔐 Environment Setup

### 1. Create Nango Account

1. Sign up at https://app.nango.dev/
2. Create new project: "ClaimCraft UK"
3. Note your **Public Key** (starts with `pk_...`)

### 2. Configure Xero Integration in Nango

1. In Nango dashboard, go to **Integrations**
2. Click **Add Integration** → **Xero**
3. You'll need Xero OAuth credentials:

#### Get Xero OAuth Credentials

1. Go to https://developer.xero.com/
2. Create new app: "ClaimCraft UK Debt Recovery"
3. OAuth 2.0 credentials:
   - **Redirect URI**: `https://api.nango.dev/oauth/callback` (Nango's endpoint)
   - **Scopes**:
     - `accounting.transactions.read`
     - `accounting.contacts.read`
4. Copy **Client ID** and **Client Secret**
5. Paste into Nango's Xero integration config

### 3. Test Connection

1. In Nango dashboard, use **Test Connection** button
2. Authorize with your Xero account
3. Verify invoices can be fetched
4. Copy **Public Key** to `.env`

---

## 🧪 Testing Plan

### Unit Tests (Future)
- `xeroPuller.transformToClaim()` - Ensure correct ClaimState format
- `xeroPuller.calculateInterest()` - Verify Late Payment Act calculations
- `xeroPuller.filterOverdueInvoices()` - Correct filtering logic

### Integration Tests
1. **Connect Flow:**
   - Click "Connect Xero"
   - Complete OAuth (use Xero demo company)
   - Verify connection saved

2. **Import Flow:**
   - Open invoice importer
   - Verify overdue invoices displayed
   - Select 2 invoices
   - Import
   - Verify 2 new claims on dashboard
   - Check data accuracy (amounts, dates, parties)

3. **Disconnect Flow:**
   - Disconnect Xero
   - Verify connection removed
   - Existing imported claims remain

4. **Edge Cases:**
   - No overdue invoices → Show empty state
   - Xero API error → Show error message
   - Token expired → Prompt re-authentication
   - Import duplicate invoice → Detect and warn

---

## 🎨 UI/UX Considerations

### Loading States
- "Connecting to Xero..." (OAuth popup)
- "Fetching invoices..." (spinner in importer)
- "Importing 3 invoices..." (progress bar)

### Error States
- "Failed to connect to Xero. Please try again."
- "No overdue invoices found in your Xero account."
- "Xero API error. Please check your connection."

### Success States
- "✅ Connected to Xero successfully!"
- "✅ Imported 3 invoices (£15,700 total)"

### Empty States
- "No overdue invoices found. All caught up! 🎉"

---

## 🚀 Future Enhancements (Phase 2)

### 1. Auto-Sync
- Check Xero daily for new overdue invoices
- Notification: "3 new overdue invoices in Xero"
- Auto-create claims or prompt user

### 2. Two-Way Sync
- Mark invoice as "In Recovery" in Xero when LBA sent
- Update Xero notes with claim progress
- Sync payment status back to Xero

### 3. Bulk Actions
- "Send LBA to all Xero invoices >30 days"
- "Export payment plan to Xero"

### 4. Multi-Platform
- QuickBooks integration
- FreeAgent integration
- Sage integration
- All use same Nango infrastructure

### 5. Advanced Filters
- Import by customer (all invoices for one debtor)
- Import by amount range (£1000-£10000)
- Import by age (>60 days only)

---

## 📊 Data Transformation Example

### Xero Invoice → ClaimState

**Input (Xero):**
```json
{
  "InvoiceID": "abc-123",
  "InvoiceNumber": "INV-001",
  "Contact": {
    "ContactID": "def-456",
    "Name": "Acme Corporation Ltd"
  },
  "Date": "2024-10-01",
  "DueDate": "2024-11-01",
  "Total": 5000.00,
  "AmountDue": 5000.00,
  "Status": "AUTHORISED",
  "CurrencyCode": "GBP"
}
```

**Output (ClaimState):**
```typescript
{
  id: 'claim_abc123',
  status: 'draft',
  source: 'xero',
  claimant: { /* User's business details */ },
  defendant: {
    type: PartyType.BUSINESS,
    name: 'Acme Corporation Ltd',
    address: '123 High Street', // from XeroContact
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    solvencyStatus: 'Unknown' // Check Companies House separately
  },
  invoice: {
    invoiceNumber: 'INV-001',
    dateIssued: '2024-10-01',
    dueDate: '2024-11-01',
    totalAmount: 5000.00,
    currency: 'GBP',
    description: 'Imported from Xero (INV-001)'
  },
  interest: {
    daysOverdue: 53, // Today - DueDate
    dailyRate: 0.30, // £5000 * 8% / 365
    totalInterest: 15.90 // 53 * 0.30
  },
  compensation: 70.00, // Late Payment Act fixed fee
  courtFee: 205.00, // Court fee for £5000 claim
  timeline: [
    { date: '2024-10-01', type: 'invoice', description: 'Invoice INV-001 issued' },
    { date: '2024-11-01', type: 'payment_due', description: 'Payment due date' }
  ],
  importSource: {
    provider: 'xero',
    invoiceId: 'abc-123',
    importedAt: '2024-12-24T10:30:00Z'
  }
}
```

---

## ⚠️ Known Limitations

### 1. Frontend-Only Implementation
- **Issue:** Nango tokens stored in browser (less secure than backend)
- **Mitigation:** Use Nango's secure storage, encourage HTTPS
- **Future:** Move to backend API in production

### 2. Xero Contact Data
- **Issue:** Xero contacts may have incomplete addresses
- **Mitigation:** Require user to fill missing fields before generating LBA
- **UX:** Show validation warning in wizard

### 3. Multi-Currency
- **Issue:** Xero supports multiple currencies, we assume GBP
- **Mitigation:** Filter to GBP invoices only, warn if foreign currency detected
- **Future:** Support EUR, USD with exchange rates

### 4. VAT Handling
- **Issue:** UK invoices may include VAT, claim amount should be total
- **Current:** Use `Total` field (includes VAT)
- **Note:** Some users may want to claim VAT separately (accountant advice)

---

## 📖 Documentation for Users

### Setup Guide (Add to README.md)

```markdown
## 🔗 Connecting Xero

ClaimCraft can automatically import overdue invoices from your Xero accounting system.

### Prerequisites
1. Active Xero account (UK region)
2. At least one unpaid invoice past due date

### Setup Steps
1. Click **Connect Accounting** in the dashboard
2. Select **Xero** and click **Connect**
3. Log in to your Xero account (popup window)
4. Authorize ClaimCraft to read invoices and contacts
5. Return to ClaimCraft - you're now connected!

### Importing Invoices
1. Click **Import** → **Import from Xero**
2. Select invoices you want to pursue for debt recovery
3. Click **Import Selected**
4. Review and complete claim details in the wizard

### Security
- ClaimCraft uses Nango for secure OAuth authentication
- We only request READ access to invoices and contacts
- We NEVER modify your Xero data
- You can disconnect at any time

### Troubleshooting
- **No invoices showing?** Ensure invoices are marked as AUTHORISED and past due date
- **Connection failed?** Check your Xero login credentials
- **Can't see customer address?** Add contact details in Xero first
```

---

## ✅ Acceptance Criteria

Before considering this feature complete:

- [ ] User can connect Xero account via OAuth
- [ ] User can see connection status in Dashboard
- [ ] User can import overdue invoices from Xero
- [ ] Imported invoices create valid ClaimState objects
- [ ] Interest calculated correctly (Late Payment Act)
- [ ] User can disconnect Xero
- [ ] Error handling for API failures
- [ ] Loading states for all async operations
- [ ] Success confirmations for all actions
- [ ] Documentation updated in README.md
- [ ] Environment variables documented in .env.example
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] Manual testing with Xero demo company
- [ ] No regressions in existing CSV import flow

---

## 📝 Implementation Order

1. **Phase 1: Foundation** (1-2 hours)
   - Install Nango SDK
   - Create nangoClient.ts
   - Create xeroPuller.ts
   - Update types.ts

2. **Phase 2: UI Components** (2-3 hours)
   - Create AccountingIntegration.tsx
   - Create XeroInvoiceImporter.tsx
   - Update App.tsx for modals

3. **Phase 3: Dashboard Integration** (1 hour)
   - Update Dashboard.tsx
   - Add connection indicator
   - Update import button

4. **Phase 4: Testing & Polish** (1-2 hours)
   - Manual testing with Xero demo
   - Error handling improvements
   - Loading state polish
   - Documentation

**Total Estimated Time:** 5-8 hours

---

## 🎯 Success Metrics

After implementation, measure:
- % of users who connect Xero
- Average # of invoices imported per session
- Time saved vs manual entry (estimate: 90% faster)
- User satisfaction (survey)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-23
**Status:** Ready for Implementation
