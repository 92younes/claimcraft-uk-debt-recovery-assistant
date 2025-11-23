# Technical Architecture Review

**Application:** ClaimCraft UK - Debt Recovery Assistant
**Review Date:** 2025-01-23
**Reviewer:** AI Technical Architect
**Lines of Code:** ~4,500 (42 source files)
**Build Size:** 850KB (minified)

---

## Executive Summary

**Overall Grade: B- (Good foundation, needs optimization)**

ClaimCraft demonstrates **solid architectural fundamentals** with clear separation of concerns, strong type safety, and well-organized service layers. However, the frontend-only architecture introduces **security limitations**, and the **850KB bundle size** impacts performance. The application would benefit from **code splitting**, **state management**, and **backend migration** for production readiness.

**Key Strengths:** Type safety, service layer design, business logic separation
**Key Weaknesses:** Bundle size, API key exposure, no state management, prop drilling
**Critical Risks:** Frontend API keys, no error boundaries, missing tests

---

## Architecture Analysis

### 1. Overall Architecture Pattern

**Pattern:** Frontend-Only SPA (Single Page Application)

```
┌─────────────────────────────────────────────────┐
│           Browser (React SPA)                   │
├─────────────────────────────────────────────────┤
│  App.tsx (State Container)                      │
│    └─ 27 useState hooks                         │
│    └─ All business logic orchestration          │
├─────────────────────────────────────────────────┤
│  Components (16 files)                          │
│    └─ Presentational + some logic               │
├─────────────────────────────────────────────────┤
│  Services (13 files)                            │
│    └─ Static classes (stateless)                │
│    └─ API clients (Anthropic, Gemini, Nango)    │
│    └─ Business logic (legalRules, workflow)     │
├─────────────────────────────────────────────────┤
│  Storage Layer                                  │
│    └─ IndexedDB (claims)                        │
│    └─ localStorage (Xero tokens, connection)    │
└─────────────────────────────────────────────────┘
          │           │            │
          ▼           ▼            ▼
    Claude API   Gemini API   Nango Proxy
```

**Assessment:** ✅ Good for MVP, ⚠️ Needs backend for production

---

## 2. Detailed Component Analysis

### 2.1 State Management

**Current Approach:** React useState in App.tsx

**Analysis:**
```typescript
// App.tsx - 27 hooks in single component!
const [view, setView] = useState<ViewState>('landing');
const [dashboardClaims, setDashboardClaims] = useState<ClaimState[]>([]);
const [step, setStep] = useState<Step>(Step.SOURCE);
const [claimData, setClaimData] = useState<ClaimState>(INITIAL_STATE);
const [isProcessing, setIsProcessing] = useState(false);
const [accountingConnection, setAccountingConnection] = useState(...);
// ... 21 more useState calls
```

**Issues:**
- ❌ **God component** - App.tsx does too much
- ❌ **Prop drilling** - Data passed through 3-4 component levels
- ❌ **Re-render performance** - Every state change re-renders entire app
- ❌ **Maintainability** - Hard to track state dependencies

**Recommendations:**
```typescript
// Option 1: Context API (lightweight)
const ClaimContext = createContext<ClaimContextType>(null);
const WorkflowContext = createContext<WorkflowContextType>(null);

// Option 2: Zustand (recommended)
const useClaimStore = create<ClaimStore>((set) => ({
  claims: [],
  currentClaim: null,
  addClaim: (claim) => set((state) => ({
    claims: [...state.claims, claim]
  }))
}));

// Option 3: Redux Toolkit (if scaling significantly)
```

**Priority:** 🔴 High - Critical for maintainability

---

### 2.2 Service Layer Architecture

**Pattern:** Static Classes (Stateless Services)

**Examples:**
```typescript
// ✅ GOOD: Stateless service classes
export class WorkflowEngine {
  static calculateWorkflowState(claim: ClaimState): WorkflowState { }
  static determineStage(claim: ClaimState): ClaimStage { }
}

export class XeroPuller {
  static fetchInvoices(connectionId?: string): Promise<XeroInvoice[]> { }
  static calculateInterest(amount: number, dueDate: string): InterestData { }
}
```

**Strengths:**
- ✅ Clear separation of concerns
- ✅ Pure functions (testable)
- ✅ No shared state
- ✅ Easy to mock for testing
- ✅ Tree-shakeable

**Weaknesses:**
- ⚠️ No dependency injection
- ⚠️ Hard to swap implementations
- ⚠️ Some services have side effects (API calls)

**Grade:** A- (Excellent pattern for current scale)

---

### 2.3 Type System

**TypeScript Usage:** ✅ Comprehensive

**Analysis:**
```typescript
// types.ts - Well-defined domain model
export interface ClaimState { /* 20+ fields */ }
export interface Party { /* 9 fields */ }
export interface WorkflowState { /* 7 fields */ }
export enum ClaimStage { /* 10 values */ }
export enum PartyType { INDIVIDUAL, BUSINESS }

// ✅ Strong typing throughout
// ✅ Enums for fixed values
// ✅ Interfaces over types (good for extensibility)
// ✅ Discriminated unions (DocumentType)
```

**Strengths:**
- ✅ All props typed
- ✅ No 'any' abuse
- ✅ Type guards where needed
- ✅ Consistent naming conventions

**Minor Issues:**
- ⚠️ Some type assertions in Nango client (`as any`)
- ⚠️ Could use branded types for IDs

**Grade:** A (Excellent type safety)

---

### 2.4 Data Flow & State Persistence

**Storage Strategy:** Dual persistence (IndexedDB + localStorage)

**IndexedDB (Primary):**
```typescript
// ✅ GOOD: Structured data in IndexedDB
const DB_NAME = 'claimcraft_db';
const STORE_NAME = 'claims';

export const getStoredClaims = async (): Promise<ClaimState[]> => {
  const db = await openDB();
  // Transaction-based reads
};
```

**localStorage (Secondary):**
```typescript
// ⚠️ RISKY: Sensitive data in localStorage
localStorage.setItem(CONNECTION_ID_KEY, connectionId);
localStorage.setItem(XERO_CONNECTION_KEY, JSON.stringify(metadata));
```

**Issues:**
- ❌ **Security:** OAuth tokens in localStorage (XSS vulnerable)
- ❌ **No encryption:** Sensitive data stored in plain text
- ❌ **No sync:** IndexedDB and localStorage can diverge
- ❌ **No backup:** All data lost if browser cache cleared

**Recommendations:**
```typescript
// Use IndexedDB for all data
const DB_STORES = {
  claims: 'claims',
  connections: 'connections',  // Move from localStorage
  settings: 'settings'
};

// Add encryption for sensitive fields
import { encrypt, decrypt } from './crypto';
const encryptedToken = await encrypt(oauthToken);
```

**Priority:** 🟡 Medium - Works for MVP, risky for production

---

### 2.5 API Integration & Security

**Current Approach:** Direct API calls from frontend

```typescript
// ❌ SECURITY RISK: API keys in frontend bundle
const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
const geminiKey = import.meta.env.VITE_API_KEY;

// Frontend code:
const anthropic = new Anthropic({ apiKey }); // Exposed in bundle!
```

**Why This Is Dangerous:**
1. API keys visible in network tab
2. Anyone can extract from JS bundle: `grep -r "VITE_" dist/`
3. Users can make unlimited API calls on your account
4. Rate limits shared across all users
5. Cannot revoke access to specific users

**Impact Analysis:**
```
Current Architecture (Frontend-only):
┌─────────────┐
│   Browser   │────┐
└─────────────┘    │
                   ├──> Claude API (your key exposed)
                   ├──> Gemini API (your key exposed)
                   └──> Nango API (public key ok)

💰 Cost: Unlimited (anyone can use your keys)
🔒 Security: None
🎯 Rate Limiting: Shared globally
```

**Recommended Architecture:**
```
Recommended (Backend Proxy):
┌─────────────┐        ┌──────────────┐
│   Browser   │───────>│ Your Backend │────┐
└─────────────┘        └──────────────┘    │
      ↑                      ↑              ├──> Claude API
   JWT Auth            Rate Limiting       ├──> Gemini API
   No Keys             Per-user quotas     └──> Nango API

💰 Cost: Controlled (per-user limits)
🔒 Security: Keys safe on server
🎯 Rate Limiting: Per user
```

**Priority:** 🔴 **CRITICAL** - Must fix before public launch

---

### 2.6 Error Handling

**Current State:** Inconsistent error handling

**Analysis:**
```typescript
// ❌ Services: Missing try/catch
grep -r "try.*catch" services/*.ts
# Result: 0 matches (NO ERROR HANDLING!)

// Services use .catch() on promises
xeroPuller.ts: .catch(error => console.error(...))
// But this doesn't bubble to UI

// ❌ No error boundaries in React
// If any component crashes, entire app crashes

// ❌ No global error handler
window.addEventListener('error', ...) // Missing
```

**Critical Gaps:**
1. **API failures** - User sees nothing, app freezes
2. **Network errors** - No retry logic
3. **Validation errors** - Silent failures
4. **React errors** - White screen of death

**Recommendations:**
```typescript
// 1. Add React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo);
    this.setState({ hasError: true });
  }
}

// 2. Service layer error handling
export class ApiService {
  static async callWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && isRetryable(error)) {
        await delay(1000);
        return this.callWithRetry(fn, retries - 1);
      }
      throw new ApiError(error);
    }
  }
}

// 3. User-friendly error messages
const ErrorToast = ({ error }) => (
  <div className="toast error">
    {getHumanReadableError(error)}
    <button onClick={reportError}>Report</button>
  </div>
);
```

**Priority:** 🔴 High - Poor user experience without this

---

### 2.7 Performance Optimization

**Bundle Size:** ⚠️ 850KB (Too Large)

**Analysis:**
```bash
dist/assets/index-DNtE8Vio.js  850KB

Breakdown (estimated):
- React + React DOM: ~140KB
- Anthropic SDK: ~150KB
- Google GenAI: ~100KB
- pdf-lib: ~200KB
- Application code: ~150KB
- Lucide icons: ~50KB
- Other dependencies: ~60KB
```

**Performance Issues:**
1. **No code splitting** - All code loads on initial page
2. **No lazy loading** - Dashboard loads even on landing page
3. **No route-based splitting** - Wizard loads with dashboard
4. **Large dependencies** - PDF library loads for all users

**Mobile Impact:**
```
3G Connection (750 Kbps):
- 850KB ÷ 750Kbps = 9.1 seconds to download
- + Parse JS: ~2-3 seconds
- Total Time to Interactive: ~12 seconds ❌

Target (Good UX):
- < 200KB initial bundle
- < 3 seconds on 3G
```

**Optimization Strategy:**
```typescript
// 1. Route-based code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const DocumentPreview = lazy(() => import('./components/DocumentPreview'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>

// 2. Dynamic imports for heavy features
const handleGeneratePDF = async () => {
  const { generateN1PDF } = await import('./services/pdfGenerator');
  await generateN1PDF(data);
};

// 3. Icon tree-shaking (if using many icons)
import { ArrowRight } from 'lucide-react/dist/esm/icons/arrow-right';
```

**Expected Results:**
```
After Optimization:
- Landing page: ~150KB (dashboard not loaded)
- Dashboard: +200KB (loaded on navigation)
- PDF generation: +200KB (loaded when needed)

Initial load: 150KB (82% reduction!)
Time to Interactive (3G): ~3 seconds ✅
```

**React Performance:**

**Current:**
```typescript
// ✅ GOOD: Some optimization present
const claimsWithWorkflow = useMemo(() => {
  return claims.map(claim => ({
    claim,
    workflow: WorkflowEngine.calculateWorkflowState(claim)
  }));
}, [claims]); // Dashboard.tsx
```

**Missing Optimizations:**
```typescript
// ❌ App.tsx re-renders on every state change
// All 27 state changes cause full re-render

// ⚠️ Not using React.memo for expensive components
export const Dashboard = React.memo(({ claims, ... }) => { ... });

// ⚠️ Inline function definitions in renders
<button onClick={() => handleClick(id)}>  // Creates new function every render
// Should be:
const handleClickCallback = useCallback(
  () => handleClick(id),
  [id]
);
```

**Priority:** 🟡 Medium - Works but could be much faster

---

### 2.8 Testing Infrastructure

**Current State:** ❌ **NO TESTS**

**Missing:**
- ✗ Unit tests (0 files)
- ✗ Integration tests (0 files)
- ✗ E2E tests (0 files)
- ✗ Test framework not installed
- ✗ No CI/CD pipeline

**Risk Level:** 🔴 **CRITICAL**

**What Should Be Tested:**
```typescript
// 1. Business Logic (legalRules.ts)
describe('calculateCourtFee', () => {
  it('caps fee at £10,000 for large claims', () => {
    expect(calculateCourtFee(500000)).toBe(10000);
  });

  it('charges 5% between £10k-£200k', () => {
    expect(calculateCourtFee(50000)).toBe(2500);
  });
});

// 2. Interest Calculations
describe('calculateInterest', () => {
  it('uses 12.75% rate for B2B claims', () => {
    const result = calculateInterest(10000, '2024-01-01', '2024-01-31');
    expect(result.dailyRate).toBeCloseTo(3.49, 2);
  });
});

// 3. Workflow Engine
describe('WorkflowEngine', () => {
  it('determines OVERDUE stage for past due invoices', () => {
    const claim = createMockClaim({ daysOverdue: 15 });
    const workflow = WorkflowEngine.calculateWorkflowState(claim);
    expect(workflow.currentStage).toBe(ClaimStage.OVERDUE);
  });
});

// 4. Component Integration
describe('Dashboard', () => {
  it('displays total recoverable including compensation', () => {
    render(<Dashboard claims={mockClaims} />);
    expect(screen.getByText('£8,215')).toBeInTheDocument();
  });
});
```

**Recommended Stack:**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",           // Fast unit tests
    "@testing-library/react": "^14.0.0",  // Component tests
    "@testing-library/user-event": "^14.0.0",
    "playwright": "^1.40.0"       // E2E tests (optional)
  }
}
```

**Priority:** 🔴 High - Essential for maintenance

---

## 3. Strengths

### ✅ What's Working Well

1. **Type Safety (A+)**
   - Comprehensive TypeScript coverage
   - Well-defined domain models
   - Strong typing reduces runtime errors

2. **Service Layer Design (A)**
   - Clear separation between services and UI
   - Stateless static classes
   - Testable pure functions
   - Single responsibility principle

3. **Business Logic Centralization (A)**
   - `legalRules.ts` - Clear UK legal rules
   - `workflowEngine.ts` - Workflow logic isolated
   - `documentBuilder.ts` - Template logic separate
   - Easy to audit and update

4. **IndexedDB for Persistence (B+)**
   - Proper structured storage
   - Transaction-based operations
   - Handles large datasets
   - Survives page refreshes

5. **Dual AI Strategy (A-)**
   - Claude for document generation (temperature 0.1)
   - Gemini for analysis and chat
   - Smart separation of concerns
   - Reduces hallucination risk

6. **Integration Architecture (B+)**
   - Dedicated clients for each service
   - Nango for OAuth (good choice)
   - Companies House integration
   - Xero integration well-designed

---

## 4. Weaknesses

### ⚠️ Areas Needing Improvement

1. **Bundle Size (D)**
   - 850KB is 4x recommended size
   - No code splitting
   - Impacts mobile users severely

2. **State Management (C)**
   - 27 useState in one component
   - Prop drilling 3-4 levels deep
   - No centralized state
   - Performance issues at scale

3. **Error Handling (D)**
   - No try/catch in services
   - No error boundaries
   - No retry logic
   - Silent failures

4. **Security (F for Production)**
   - API keys in frontend bundle
   - OAuth tokens in localStorage
   - No encryption
   - XSS vulnerable

5. **Testing (F)**
   - Zero tests
   - No test infrastructure
   - No CI/CD
   - Manual verification only

6. **Performance (C+)**
   - Works but not optimized
   - Missing React.memo
   - No lazy loading
   - Re-renders entire app

---

## 5. Critical Risks

### 🔴 High-Priority Issues

| Risk | Severity | Likelihood | Impact | Mitigation |
|------|----------|------------|--------|------------|
| **API Key Exposure** | 🔴 Critical | High | Financial loss, abuse | **Move to backend** |
| **No Error Handling** | 🔴 High | High | Poor UX, lost data | Add error boundaries |
| **OAuth in localStorage** | 🔴 High | Medium | Security breach | Encrypt or use backend |
| **850KB Bundle** | 🟡 Medium | High | Slow mobile UX | Code splitting |
| **No Tests** | 🟡 Medium | Medium | Bugs in production | Add test suite |
| **Single Point of Failure** | 🟡 Medium | Low | App crashes easily | Error boundaries |

---

## 6. Architecture Recommendations

### 6.1 Immediate Fixes (This Week)

**Priority 1: Security**
```typescript
// Option A: Backend Proxy (Recommended)
// Create simple Express/Fastify backend
POST /api/claude/generate
POST /api/gemini/analyze
GET /api/xero/invoices

// Option B: Serverless Functions (Quick Win)
// Vercel/Netlify Functions
export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY; // Server-side only
  const result = await callClaude(apiKey, req.body);
  res.json(result);
}
```

**Priority 2: Error Boundaries**
```typescript
// Wrap app in error boundary
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Add to services
try {
  return await anthropic.messages.create(...);
} catch (error) {
  logger.error('Claude API failed', error);
  throw new AppError('Document generation failed', error);
}
```

**Priority 3: Code Splitting**
```typescript
// Split by route
const routes = [
  { path: '/', component: lazy(() => import('./Landing')) },
  { path: '/dashboard', component: lazy(() => import('./Dashboard')) },
  { path: '/wizard', component: lazy(() => import('./Wizard')) }
];
```

### 6.2 Short-Term Improvements (This Month)

**1. State Management**
```bash
npm install zustand
```

```typescript
// stores/claimStore.ts
export const useClaimStore = create<ClaimStore>((set, get) => ({
  claims: [],
  currentClaim: null,

  addClaim: (claim) => set((state) => ({
    claims: [...state.claims, claim]
  })),

  updateClaim: (id, updates) => set((state) => ({
    claims: state.claims.map(c =>
      c.id === id ? { ...c, ...updates } : c
    )
  }))
}));

// In components:
const { claims, addClaim } = useClaimStore();
// No more prop drilling!
```

**2. Testing Infrastructure**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/']
    }
  }
});

// Target: 80% coverage
```

**3. Performance Monitoring**
```typescript
// Add performance tracking
import { onCLS, onFID, onLCP } from 'web-vitals';

onCLS(console.log);  // Cumulative Layout Shift
onFID(console.log);  // First Input Delay
onLCP(console.log);  // Largest Contentful Paint

// Target metrics:
// LCP < 2.5s
// FID < 100ms
// CLS < 0.1
```

### 6.3 Long-Term Vision (Next Quarter)

**Recommended Target Architecture:**

```
┌──────────────────────────────────────────────────┐
│  Frontend (React SPA) - Thin Client             │
│  - 150KB initial bundle                          │
│  - Zustand for state                             │
│  - Error boundaries                              │
│  - Lazy loaded routes                            │
└────────────────┬─────────────────────────────────┘
                 │ JWT Auth
                 ▼
┌──────────────────────────────────────────────────┐
│  Backend API (Node.js/Express)                   │
│  - /api/auth (JWT)                               │
│  - /api/claims (CRUD)                            │
│  - /api/ai/generate (Claude proxy)               │
│  - /api/ai/analyze (Gemini proxy)                │
│  - /api/integrations/xero (OAuth)                │
│  - Rate limiting per user                        │
│  - Request validation                            │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│  Database (PostgreSQL/Supabase)                  │
│  - users                                         │
│  - claims                                        │
│  - documents                                     │
│  - audit_logs                                    │
│  - integrations                                  │
└──────────────────────────────────────────────────┘
```

**Migration Path:**
1. **Week 1-2:** Backend API + Auth
2. **Week 3-4:** Migrate AI calls to backend
3. **Week 5-6:** Database setup + migration
4. **Week 7-8:** Testing + monitoring

---

## 7. Comparison to Industry Standards

### vs. Modern SaaS Applications

| Feature | ClaimCraft | Industry Standard | Gap |
|---------|------------|-------------------|-----|
| **Type Safety** | ✅ TypeScript | TypeScript | ✅ Match |
| **State Management** | ❌ useState only | Redux/Zustand/Jotai | ⚠️ Behind |
| **API Security** | ❌ Frontend keys | Backend proxy | 🔴 Critical |
| **Bundle Size** | ❌ 850KB | < 200KB initial | 🔴 4x too large |
| **Error Handling** | ❌ Minimal | Sentry/Boundaries | ⚠️ Behind |
| **Testing** | ❌ None | 80%+ coverage | 🔴 Critical |
| **Performance** | ⚠️ Works | Core Web Vitals | ⚠️ Behind |
| **Offline Support** | ❌ None | Service Workers | ⚠️ Behind |
| **Accessibility** | ⚠️ Unknown | WCAG 2.1 AA | ❓ Untested |

---

## 8. Final Recommendations

### Must-Have (Before Production)
1. ✅ **Backend API for AI calls** - Security critical
2. ✅ **Error boundaries** - Prevent crashes
3. ✅ **Code splitting** - Performance critical
4. ✅ **Basic test coverage** - Catch regressions
5. ✅ **Secure token storage** - Remove from localStorage

### Should-Have (Next Sprint)
1. ⚠️ **State management library** - Maintainability
2. ⚠️ **Monitoring/logging** - Debugging
3. ⚠️ **Performance optimization** - Mobile UX
4. ⚠️ **CI/CD pipeline** - Deployment safety

### Nice-to-Have (Future)
1. 💡 Offline support (Service Workers)
2. 💡 Real-time collaboration
3. 💡 Advanced analytics
4. 💡 Mobile app (React Native)

---

## Conclusion

**Overall Assessment:** B- (Good MVP, needs productionization)

ClaimCraft demonstrates **strong technical fundamentals** with excellent type safety, clear separation of concerns, and well-architected business logic. The service layer design is exemplary, and the dual AI strategy shows thoughtful engineering.

However, the **frontend-only architecture** introduces significant security and scalability concerns that must be addressed before public launch. The **850KB bundle** impacts user experience, especially on mobile devices.

**Recommendation:** ✅ **Ship MVP as-is for private beta**, but **implement backend migration** before public launch.

**Estimated Effort to Production-Ready:**
- Backend migration: 2-3 weeks
- Security hardening: 1 week
- Performance optimization: 1-2 weeks
- Testing infrastructure: 1 week
- **Total:** 5-7 weeks with one developer

**Next Steps:**
1. Implement serverless functions for AI calls (Quick win)
2. Add error boundaries to prevent crashes
3. Set up basic test infrastructure
4. Plan backend migration roadmap
5. Monitor bundle size in CI/CD

---

**Technical Debt Score:** 6/10 (Moderate)
- Well-architected foundation
- Clear improvement path
- Manageable debt for current scale
- Needs investment before scaling

