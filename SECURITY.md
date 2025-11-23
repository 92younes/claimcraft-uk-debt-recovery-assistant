# Security Considerations

## ⚠️ CRITICAL: Client-Side API Key Exposure

### Current Architecture Limitation

This application currently runs **entirely client-side** (browser-based) and uses API keys for:
- **Anthropic Claude API** (`VITE_ANTHROPIC_API_KEY`)
- **Google Gemini API** (`VITE_GEMINI_API_KEY`)

**SECURITY RISK:** These API keys are embedded in the JavaScript bundle and **can be extracted** by anyone who views the source code or network traffic.

### Why This Matters

1. **Key Abuse:** Anyone can extract your API key and use it for their own purposes
2. **Cost Liability:** You will be charged for unauthorized API usage
3. **Rate Limiting:** Abusers can exhaust your API quotas
4. **Data Exposure:** API logs may contain sensitive claim data

### Current Status

🔴 **This is a prototype/development application** - **NOT production-ready** for public deployment

### Production-Ready Solution

For production deployment, you **MUST** implement a backend API proxy:

#### Option 1: Serverless Functions (Recommended)

Use edge functions to proxy API calls:

**Netlify Functions:**
```javascript
// netlify/functions/claude-api.js
export async function handler(event) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY; // Server-side only
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: event.body
  });
  return {
    statusCode: 200,
    body: await response.text()
  };
}
```

**Vercel Edge Functions:**
```typescript
// api/claude.ts
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY; // Server-side only
  const body = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return new Response(await response.text(), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
```

#### Option 2: Express/Node.js Backend

Create a dedicated backend server:

```javascript
// server.js
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Server-side only
});

app.post('/api/claude', async (req, res) => {
  try {
    const message = await anthropic.messages.create(req.body);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001);
```

#### Option 3: API Gateway (AWS/Azure/GCP)

Use cloud API gateways to proxy requests with:
- Rate limiting
- Authentication
- Usage monitoring
- Cost controls

### Immediate Mitigation (Development Only)

For local development and testing:

1. **Use API Key Restrictions:**
   - Anthropic: Configure IP allowlisting if available
   - Gemini: Set HTTP referrer restrictions in Google Cloud Console

2. **Set Usage Limits:**
   - Configure daily spending limits in API consoles
   - Set up billing alerts

3. **Monitor Usage:**
   - Check API usage dashboards daily
   - Review logs for suspicious activity

4. **.env.local (Never Commit):**
   ```bash
   # NEVER commit this file to version control
   VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
   VITE_GEMINI_API_KEY=your-gemini-key-here
   ```

5. **Add to .gitignore:**
   ```
   .env.local
   .env.*.local
   ```

### Architecture Changes Required for Production

1. **Backend Service:**
   - Create `/api/*` endpoints
   - Move all Anthropic SDK calls to backend
   - Move all Gemini SDK calls to backend

2. **Frontend Changes:**
   - Replace `getAnthropicClient()` with `fetch('/api/claude')`
   - Replace `getClient()` (Gemini) with `fetch('/api/gemini')`
   - Remove API key environment variables

3. **Authentication:**
   - Implement user authentication
   - Add request validation
   - Rate limit per user/IP

4. **Monitoring:**
   - Log all API requests
   - Track costs per user
   - Alert on anomalies

### Affected Files

Files that currently use client-side API keys:

- `services/documentBuilder.ts` - Lines 26-32 (Anthropic)
- `services/geminiService.ts` - Line 9-15 (Gemini)

### Official SDK Recommendations

**Anthropic SDK Documentation:**
> "Never expose your API key in client-side code (JavaScript, mobile apps). Always use a backend proxy to make API calls."

**Google Gemini SDK Documentation:**
> "API keys should only be used from a secure server-side context. Never include API keys in client-side JavaScript."

### Developer Checklist

Before deploying to production:

- [ ] Implement backend API proxy (serverless functions or dedicated server)
- [ ] Move API keys to server-side environment variables
- [ ] Update frontend to call backend API instead of SDK directly
- [ ] Remove `VITE_*` API key variables from .env
- [ ] Add authentication and rate limiting
- [ ] Configure API usage limits and alerts
- [ ] Test with restricted API keys (IP/referrer limits)
- [ ] Document deployment process for team

### Questions?

If you're unsure how to implement a backend proxy for your deployment platform, consult:
- Netlify: https://docs.netlify.com/functions/overview/
- Vercel: https://vercel.com/docs/functions/edge-functions
- AWS Lambda: https://aws.amazon.com/lambda/
- Google Cloud Functions: https://cloud.google.com/functions

---

## Other Security Considerations

### Data Privacy (GDPR/UK Data Protection Act)

- **Local Storage:** All claim data is stored in browser localStorage
- **Compliance Logging:** User actions are logged for legal audit trail
- **Data Export:** Users can export all data (GDPR Right of Access)
- **Data Deletion:** Users can delete all data (GDPR Right to Erasure)

### XSS Protection

- React's built-in XSS protection via JSX escaping
- User input is sanitized before rendering
- No `dangerouslySetInnerHTML` usage in user-facing components

### File Upload Security

- `utils/validation.ts` validates file types (PDF, JPG, PNG, DOCX only)
- File size limits enforced
- No executable files accepted

### Court Document Integrity

- PDF generation uses official HMCTS templates
- Template-first approach prevents AI hallucinations
- Validation checks catch factual errors

---

**Last Updated:** 2025-11-23
**Severity:** HIGH
**Status:** Documented limitation - requires backend implementation for production
