# Priority Action Plan
**ClaimCraft UK - Next Steps**

**Date:** 2025-11-23
**Status:** ⚠️ Pre-Production (Not Ready for Public Launch)

---

## 🚨 CRITICAL ISSUES (Must Fix Before Launch)

### 1. API Keys Exposed in Frontend (**SECURITY CRITICAL**)
**Risk:** Anyone can extract your API keys and rack up thousands in bills

**Current State:**
```typescript
// ❌ DANGEROUS - Keys bundled into JavaScript
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
```

**Solution Required:**
Create a backend API that proxies requests to AI services.

**Options:**

#### Option A: Next.js API Routes (Recommended - Easiest)
```bash
# 1. Install Next.js
npx create-next-app@latest claimcraft-backend --typescript

# 2. Move React app to Next.js /app directory
# 3. Create API routes

# pages/api/generate-document.ts
export default async function handler(req, res) {
  const apiKey = process.env.ANTHROPIC_API_KEY; // Server-only
  // ... call Anthropic API
  res.json(result);
}
```
**Effort:** 1 week
**Cost:** Free (Vercel hosting)

#### Option B: Separate Express Backend
```bash
# 1. Create Express server
npm create vite@latest claimcraft-api --template node

# 2. Set up API proxy
app.post('/api/generate', authenticateUser, async (req, res) => {
  const result = await callAnthropicAPI(req.body);
  res.json(result);
});

# 3. Deploy to Railway/Render
```
**Effort:** 1-2 weeks
**Cost:** $5-10/month

#### Option C: Supabase Edge Functions
```bash
# 1. Create Supabase project
npx supabase init

# 2. Create edge function
supabase functions new generate-document

# 3. Deploy
supabase functions deploy
```
**Effort:** 3-5 days
**Cost:** Free tier available

**Deadline:** BEFORE PUBLIC LAUNCH

---

### 2. Zero Test Coverage (**QUALITY CRITICAL**)
**Risk:** Legal calculations could be wrong, users lose money

**Current State:** 0 test files, 0% coverage

**Quick Win - Test Legal Calculations:**
```bash
# Install testing tools
npm install --save-dev vitest @testing-library/react

# Create first test file
```

```typescript
// services/legalRules.test.ts
import { describe, it, expect } from 'vitest';
import { calculateCourtFee, calculateCompensation } from './legalRules';

describe('Legal Calculations', () => {
  it('should cap court fee at £10,000 for £500k claim', () => {
    expect(calculateCourtFee(500000)).toBe(10000);
  });

  it('should calculate £100 compensation for £15k B2B debt', () => {
    expect(calculateCompensation(15000, 'Business', 'Business')).toBe(100);
  });

  it('should return £0 compensation for B2C debt', () => {
    expect(calculateCompensation(5000, 'Business', 'Individual')).toBe(0);
  });
});
```

```bash
# Run tests
npm run test
```

**Effort:** 2-3 days for core tests
**Deadline:** Before public launch

---

### 3. No Error Boundaries (**USER EXPERIENCE CRITICAL**)
**Risk:** App crashes to white screen, users lose work

**Quick Fix:**
```typescript
// components/ErrorBoundary.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error:', error, info);
    // TODO: Send to Sentry when ready
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-600 mb-6">
              Don't worry - your claim data is safe. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// main.tsx - Wrap App
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

**Effort:** 1 hour
**Deadline:** This week

---

## 🟠 HIGH PRIORITY (Fix Within 2 Weeks)

### 4. Add Error Tracking (Sentry)
**Why:** You can't fix bugs you don't know about

```bash
npm install @sentry/react
```

```typescript
// main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://YOUR_DSN@sentry.io/PROJECT_ID",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});
```

**Cost:** Free for 5k errors/month
**Effort:** 2 hours

---

### 5. Optimize Bundle Size (850KB → 300KB)
**Why:** Slow loading kills conversions

**Quick Wins:**
```typescript
// 1. Code split wizard steps (saves ~400KB)
const TimelineBuilder = lazy(() => import('./components/TimelineBuilder'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const DocumentPreview = lazy(() => import('./components/DocumentPreview'));

// 2. Wrap in Suspense
<Suspense fallback={<div>Loading...</div>}>
  {step === Step.TIMELINE && <TimelineBuilder {...props} />}
</Suspense>

// 3. Dynamic import AI SDKs
const generateDocument = async () => {
  const { Anthropic } = await import('@anthropic-ai/sdk');
  // ... use it
};
```

**Effort:** 1 day
**Impact:** 50% smaller bundle

---

### 6. Add Content Security Policy
**Why:** Prevents XSS attacks

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://plausible.io;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com;
  img-src 'self' data: https:;
">
```

**Effort:** 30 minutes

---

## 🟡 MEDIUM PRIORITY (Nice to Have)

### 7. Add Analytics (Privacy-Friendly)
**Why:** Understand how users are using the app

```html
<!-- Plausible Analytics (GDPR compliant) -->
<script defer data-domain="claimcraft.uk" src="https://plausible.io/js/script.js"></script>
```

**Cost:** Free for 10k pageviews/month
**Effort:** 5 minutes

---

### 8. Implement Backup/Export
**Why:** Users need to download their data

```typescript
// features/export.ts
export const exportAllClaims = async () => {
  const claims = await getStoredClaims();
  const json = JSON.stringify(claims, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `claimcraft-backup-${new Date().toISOString()}.json`;
  link.click();

  URL.revokeObjectURL(url);
};
```

**Effort:** 2-3 hours

---

### 9. Add Keyboard Shortcuts
**Why:** Power users love keyboard shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'k') {
          e.preventDefault();
          // Open search
        }
        if (e.key === 'n') {
          e.preventDefault();
          // New claim
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
};
```

**Effort:** 3-4 hours

---

## 📋 DECISION TREE

### **Are you launching in the next 2 weeks?**

#### ❌ NO → Follow Full Roadmap
1. Build proper backend (2-3 weeks)
2. Add comprehensive testing (1 week)
3. Security audit (1 week)
4. Beta testing (2 weeks)
5. Public launch (Week 8-10)

**Timeline:** 8-10 weeks to production-ready

---

#### ✅ YES → Emergency Soft Launch Plan

**Week 1 (Critical):**
1. ⏰ Add Error Boundary (1 hour) ← DO THIS TODAY
2. ⏰ Add Sentry error tracking (2 hours) ← DO THIS TODAY
3. ⏰ Write 10 unit tests for legal calculations (2 days)
4. ⏰ Add rate limiting to prevent API abuse (4 hours)

**Week 2 (High Priority):**
5. ⏰ Backend proxy for API keys (3-5 days) - Use Next.js API routes
6. ⏰ Code splitting for bundle size (1 day)
7. ⏰ Add CSP headers (30 mins)

**Launch as BETA:**
- Add "BETA" badge to header
- Limit to 100-500 users
- Require email signup for waitlist
- Set up Discord/Slack for beta feedback
- Build full production system in parallel

**Risk:** Acceptable for beta, NOT for public launch

---

## 🎯 THIS WEEK'S TASKS (Priority Order)

### Monday (Today):
1. ✅ Add Error Boundary (1 hour)
2. ✅ Set up Sentry account (30 mins)
3. ✅ Install testing libraries (15 mins)

### Tuesday:
4. ✅ Write 5 legal calculation tests (4 hours)
5. ✅ Add CSP headers (30 mins)
6. ✅ Add offline detection (2 hours)

### Wednesday-Thursday:
7. ✅ Implement code splitting (1 day)
8. ✅ Create backend plan (decide Next.js vs Express)

### Friday:
9. ✅ Start backend implementation
10. ✅ Write 5 more tests

---

## 💰 COST BREAKDOWN

### Option A: Soft Launch (Beta)
- Sentry (Free tier): £0
- Vercel hosting (Next.js): £0
- Plausible Analytics: £0
- **Total:** £0/month

### Option B: Full Production
- Backend hosting (Railway/Render): £10/month
- Sentry Pro: £26/month
- Plausible Analytics: £9/month
- Database (Supabase): £25/month
- CDN (Cloudflare): £0
- **Total:** £70/month

### Option C: Enterprise Scale
- AWS/GCP infrastructure: £200+/month
- Sentry Team: £80/month
- Database (managed): £100/month
- Monitoring suite: £50/month
- **Total:** £430+/month

**Recommendation for MVP:** Start with Option A (£0), upgrade to Option B when you have 100+ active users.

---

## 📞 NEED HELP?

### Technical Questions:
- Backend architecture: Consult a senior full-stack developer
- Security audit: Hire penetration tester before public launch
- Scaling: Talk to DevOps engineer when you hit 1000+ users

### Legal Questions:
- Terms of Service: Consult lawyer (£1-2k one-time)
- GDPR compliance: Data protection officer
- SRA regulation: Legal tech compliance specialist

### Business Questions:
- Pricing strategy: Talk to legal tech investors/advisors
- Go-to-market: LegalTech community, law firm partnerships
- Fundraising: Show working MVP + 100 beta users

---

## ✅ SUCCESS METRICS

### Pre-Launch:
- [ ] 0 critical security vulnerabilities
- [ ] 80%+ test coverage on legal calculations
- [ ] Error tracking configured
- [ ] Backend protecting API keys
- [ ] 10+ beta testers using successfully

### Post-Launch (Month 1):
- [ ] <1% error rate
- [ ] <2s average page load
- [ ] >50% wizard completion rate
- [ ] >70% user satisfaction (NPS)

### Long-term (3-6 months):
- [ ] 500+ active users
- [ ] <0.1% critical bugs
- [ ] >£50k+ in debt recovered
- [ ] Positive ROI

---

**Next Review:** After Week 2 (check progress on critical items)
**Questions?** Create GitHub issues for each task to track progress
