/**
 * Backend Server for ClaimCraft
 *
 * Handles Nango session token generation for accounting integrations.
 * This is required because Nango deprecated public key authentication.
 *
 * Run with: node server/index.js
 * Or use: npm run server
 */

import express from 'express';
import cors from 'cors';
import { Nango } from '@nangohq/node';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { Resend } from 'resend';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables (load .env.local first, then .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // Load .env as fallback for any missing variables

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
// Increase body size limit for multimodal requests with base64 file data
app.use(express.json({ limit: '50mb' }));

// Initialize Nango with secret key
const nangoSecretKey = process.env.NANGO_SECRET_KEY;

if (!nangoSecretKey) {
  console.error('❌ NANGO_SECRET_KEY not set in environment variables');
  console.error('Please add NANGO_SECRET_KEY to your .env file');
  console.error('Get your secret key from: https://app.nango.dev/');
  process.exit(1);
}

const nango = new Nango({ secretKey: nangoSecretKey });

// Initialize Anthropic client (optional - for document generation)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
let anthropic = null;

if (anthropicApiKey) {
  anthropic = new Anthropic({ apiKey: anthropicApiKey });
  console.log('✅ Anthropic API configured');
} else {
  console.warn('⚠️ ANTHROPIC_API_KEY not set - document generation will be limited');
}

// Initialize Google Gemini client (for AI chat and evidence analysis)
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let gemini = null;

if (geminiApiKey) {
  gemini = new GoogleGenAI({ apiKey: geminiApiKey });
  console.log('✅ Gemini API configured');
} else {
  console.warn('⚠️ GEMINI_API_KEY not set - AI chat will be limited');
}

// Initialize Resend for email notifications
const resendApiKey = process.env.RESEND_API_KEY;
let resend = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
  console.log('✅ Resend API configured');
} else {
  console.warn('⚠️ RESEND_API_KEY not set - email notifications will be disabled');
}

// Initialize Stripe for payment processing
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;

if (stripeSecretKey && stripeSecretKey.trim().length > 0) {
  stripe = new Stripe(stripeSecretKey);
  console.log('✅ Stripe API configured');
} else {
  console.warn('⚠️ STRIPE_SECRET_KEY not set - payment processing will be disabled');
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Create a Nango connect session token
 * POST /api/nango/session
 *
 * Body: {
 *   userId: string,      // Unique user identifier
 *   userEmail?: string,  // Optional user email
 *   allowedIntegrations?: string[]  // Optional list of allowed integrations
 * }
 */
app.post('/api/nango/session', async (req, res) => {
  try {
    const { userId, userEmail, allowedIntegrations } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
        message: 'Please provide a userId in the request body'
      });
    }

    console.log(`📝 Creating Nango session for user: ${userId}`);

    const sessionConfig = {
      end_user: {
        id: userId,
        email: userEmail || undefined,
        display_name: userEmail?.split('@')[0] || userId
      }
    };

    // Only add allowed_integrations if specified
    if (allowedIntegrations && allowedIntegrations.length > 0) {
      sessionConfig.allowed_integrations = allowedIntegrations;
    }

    const result = await nango.createConnectSession(sessionConfig);

    console.log(`✅ Session created successfully for user: ${userId}`);
    console.log('Session result:', JSON.stringify(result, null, 2));

    // Handle both old and new SDK response formats
    const token = result.data?.token || result.token;
    const expiresAt = result.data?.expires_at || result.expires_at;

    if (!token) {
      throw new Error('No session token returned from Nango');
    }

    res.json({
      sessionToken: token,
      expiresAt: expiresAt
    });

  } catch (error) {
    console.error('❌ Failed to create Nango session:', error.message);
    console.error('Error details:', JSON.stringify(error.response?.data, null, 2));

    res.status(500).json({
      error: 'Failed to create session',
      message: error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error occurred',
      details: error.response?.data?.error?.errors || null
    });
  }
});

/**
 * Get connection status for a user
 * GET /api/nango/connections/:userId
 */
app.get('/api/nango/connections/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // List connections for this user
    const connections = await nango.listConnections();

    // Filter by connection_id prefix (our connection IDs start with user_{provider}_{timestamp})
    const userConnections = connections.connections.filter(conn =>
      conn.connection_id.startsWith(`user_`)
    );

    res.json({ connections: userConnections });

  } catch (error) {
    console.error('❌ Failed to list connections:', error);
    res.status(500).json({
      error: 'Failed to list connections',
      message: error.message
    });
  }
});

/**
 * Find an existing connection by tenant ID
 * GET /api/nango/connections/find-by-tenant/:provider/:tenantId
 *
 * This allows multiple users to share the same Xero connection
 * by looking up existing connections for the same organization.
 */
app.get('/api/nango/connections/find-by-tenant/:provider/:tenantId', async (req, res) => {
  try {
    const { provider, tenantId } = req.params;

    console.log(`🔍 Looking for existing connection: ${provider} tenant ${tenantId}`);

    // List all connections for this provider
    const result = await nango.listConnections();
    const connections = result.connections || [];

    // Find a connection that matches this provider and tenant
    for (const conn of connections) {
      if (conn.provider_config_key === provider) {
        try {
          // Get full connection details including tenant_id
          const details = await nango.getConnection(provider, conn.connection_id);
          const connTenantId = details.connection_config?.tenant_id;

          if (connTenantId === tenantId) {
            console.log(`✅ Found existing connection for tenant ${tenantId}: ${conn.connection_id}`);
            return res.json({
              found: true,
              connectionId: conn.connection_id,
              tenantId: connTenantId,
              organizationName: details.metadata?.organization_name || 'Unknown'
            });
          }
        } catch (detailError) {
          // Connection might be invalid, continue searching
          console.warn(`⚠️ Could not get details for connection ${conn.connection_id}:`, detailError.message);
        }
      }
    }

    console.log(`ℹ️ No existing connection found for tenant ${tenantId}`);
    res.json({ found: false });

  } catch (error) {
    console.error('❌ Failed to find connection by tenant:', error);
    res.status(500).json({
      error: 'Failed to find connection',
      message: error.message
    });
  }
});

/**
 * List all connections for a provider (for sharing purposes)
 * GET /api/nango/connections/provider/:provider
 */
app.get('/api/nango/connections/provider/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    console.log(`📋 Listing all connections for provider: ${provider}`);

    const result = await nango.listConnections();
    const connections = result.connections || [];

    // Filter by provider
    const providerConnections = connections.filter(
      conn => conn.provider_config_key === provider
    );

    // Get details for each connection
    const detailedConnections = await Promise.all(
      providerConnections.map(async (conn) => {
        try {
          const details = await nango.getConnection(provider, conn.connection_id);
          return {
            connectionId: conn.connection_id,
            tenantId: details.connection_config?.tenant_id,
            organizationName: details.metadata?.organization_name || 'Unknown',
            createdAt: conn.created_at
          };
        } catch (error) {
          return null;
        }
      })
    );

    res.json({
      connections: detailedConnections.filter(c => c !== null)
    });

  } catch (error) {
    console.error('❌ Failed to list provider connections:', error);
    res.status(500).json({
      error: 'Failed to list connections',
      message: error.message
    });
  }
});

/**
 * Get connection details including metadata (tenant_id for Xero)
 * GET /api/nango/connections/:provider/:connectionId
 */
app.get('/api/nango/connections/:provider/:connectionId', async (req, res) => {
  try {
    const { provider, connectionId } = req.params;

    console.log(`📡 Getting connection details: ${provider}/${connectionId}`);

    const connection = await nango.getConnection(provider, connectionId);

    console.log(`✅ Connection details retrieved for: ${provider}/${connectionId}`);
    console.log('Connection config:', JSON.stringify(connection.connection_config, null, 2));

    res.json({
      connectionId: connection.connection_id,
      provider: connection.provider_config_key,
      metadata: connection.metadata || {},
      connectionConfig: connection.connection_config || {}
    });

  } catch (error) {
    console.error('❌ Failed to get connection:', error.message);
    console.error('Error response:', error.response?.data);
    res.status(error.response?.status || 500).json({
      error: 'Failed to get connection',
      message: error.response?.data?.message || error.message
    });
  }
});

/**
 * Delete a connection
 * DELETE /api/nango/connections/:provider/:connectionId
 */
app.delete('/api/nango/connections/:provider/:connectionId', async (req, res) => {
  try {
    const { provider, connectionId } = req.params;

    await nango.deleteConnection(provider, connectionId);

    console.log(`✅ Connection deleted: ${provider}/${connectionId}`);

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Failed to delete connection:', error);
    res.status(500).json({
      error: 'Failed to delete connection',
      message: error.message
    });
  }
});

/**
 * Proxy API calls to accounting providers via Nango
 * POST /api/nango/proxy
 *
 * Body: {
 *   provider: string,      // e.g., 'xero', 'quickbooks'
 *   connectionId: string,  // Nango connection ID
 *   endpoint: string,      // API endpoint (e.g., '/Invoices')
 *   method?: string,       // HTTP method (default: 'GET')
 *   params?: object,       // Query parameters
 *   headers?: object,      // Custom headers (e.g., Xero-Tenant-Id)
 *   data?: object          // Request body (for POST/PUT)
 * }
 */
app.post('/api/nango/proxy', async (req, res) => {
  try {
    const { provider, connectionId, endpoint, method = 'GET', params, headers, data } = req.body;

    if (!provider || !connectionId || !endpoint) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'provider, connectionId, and endpoint are required'
      });
    }

    console.log(`📡 Proxy request: ${method} ${provider}${endpoint}`);

    // Build proxy config
    const proxyConfig = {
      method,
      endpoint,
      providerConfigKey: provider,
      connectionId,
      params,
      data
    };

    // Add custom headers if provided (required for Xero-Tenant-Id)
    if (headers) {
      proxyConfig.headers = headers;
    }

    // Use Nango's proxy to make authenticated API call
    const response = await nango.proxy(proxyConfig);

    console.log(`✅ Proxy request successful: ${provider}${endpoint}`);

    res.json(response.data);

  } catch (error) {
    console.error('❌ Proxy request failed:', error);
    console.error('Error details:', error.response?.data || error.message);

    // Extract status code if available
    const statusCode = error.response?.status || 500;

    res.status(statusCode).json({
      error: 'Proxy request failed',
      message: error.response?.data?.message || error.message || 'Unknown error',
      status: statusCode
    });
  }
});

/**
 * Proxy Claude/Anthropic API calls
 * POST /api/anthropic/messages
 *
 * This keeps the API key secure on the server side.
 *
 * Body: {
 *   model: string,       // e.g., 'claude-3-5-sonnet-20241022'
 *   max_tokens: number,  // Maximum tokens in response
 *   temperature?: number, // Optional temperature (0-1)
 *   messages: array      // Message array for Claude
 * }
 */
app.post('/api/anthropic/messages', async (req, res) => {
  try {
    if (!anthropic) {
      return res.status(503).json({
        error: 'Anthropic API not configured',
        message: 'Please set ANTHROPIC_API_KEY in your .env file'
      });
    }

    const { model, max_tokens, temperature, messages, system } = req.body;

    if (!model || !messages || !max_tokens) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'model, max_tokens, and messages are required'
      });
    }

    console.log(`📝 Anthropic request: ${model}, ${messages.length} messages`);

    const requestParams = {
      model,
      max_tokens,
      messages
    };

    // Add optional parameters if provided
    if (temperature !== undefined) {
      requestParams.temperature = temperature;
    }
    if (system) {
      requestParams.system = system;
    }

    const message = await anthropic.messages.create(requestParams);

    console.log(`✅ Anthropic response received: ${message.content.length} content blocks`);

    res.json(message);

  } catch (error) {
    console.error('❌ Anthropic request failed:', error);

    const statusCode = error.status || 500;

    res.status(statusCode).json({
      error: 'Anthropic request failed',
      message: error.message || 'Unknown error',
      status: statusCode
    });
  }
});

/**
 * Proxy Google Gemini API calls
 * POST /api/gemini/generate
 *
 * This keeps the API key secure on the server side.
 * Supports both text-only and multimodal (with files) requests.
 *
 * Body: {
 *   model: string,           // e.g., 'gemini-2.5-flash'
 *   contents: string | { parts: array },  // Text prompt or multimodal parts
 *   config?: {
 *     responseMimeType?: string,  // e.g., 'application/json'
 *     responseSchema?: object     // JSON schema for structured output
 *   }
 * }
 */
app.post('/api/gemini/generate', async (req, res) => {
  try {
    if (!gemini) {
      return res.status(503).json({
        error: 'Gemini API not configured',
        message: 'Please set GEMINI_API_KEY in your .env file'
      });
    }

    const { model, contents, config } = req.body;

    if (!model || !contents) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'model and contents are required'
      });
    }

    console.log(`📝 Gemini request: ${model}, contents type: ${typeof contents === 'string' ? 'text' : 'multimodal'}`);

    // Build the request parameters
    const requestParams = {
      model,
      contents
    };

    // Add config if provided (for JSON mode with schema)
    if (config) {
      requestParams.config = config;
    }

    const response = await gemini.models.generateContent(requestParams);

    console.log(`✅ Gemini response received`);

    // Return the response text
    res.json({
      text: response.text || '',
      // Include candidates if needed for debugging
      candidates: response.candidates || []
    });

  } catch (error) {
    console.error('❌ Gemini request failed:', error);

    const statusCode = error.status || error.code === 'INVALID_ARGUMENT' ? 400 : 500;

    res.status(statusCode).json({
      error: 'Gemini request failed',
      message: error.message || 'Unknown error',
      status: statusCode
    });
  }
});

/**
 * Proxy Companies House API calls
 * GET /api/companies-house/search?q=query
 * GET /api/companies-house/company/:companyNumber
 *
 * This keeps the API key secure and avoids CORS issues.
 */
const companiesHouseApiKey = process.env.COMPANIES_HOUSE_API_KEY || process.env.VITE_COMPANIES_HOUSE_API_KEY;

if (companiesHouseApiKey) {
  console.log('✅ Companies House API configured');
} else {
  console.warn('⚠️ COMPANIES_HOUSE_API_KEY not set - company lookup will use mock data');
}

app.get('/api/companies-house/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Missing query parameter',
        message: 'Please provide a search query with ?q=company_name'
      });
    }

    if (!companiesHouseApiKey) {
      return res.status(503).json({
        error: 'Companies House API not configured',
        message: 'Please set COMPANIES_HOUSE_API_KEY in your .env file'
      });
    }

    console.log(`🔍 Companies House search: ${q}`);

    const searchUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}&items_per_page=5`;

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(companiesHouseApiKey + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Companies House API error: ${response.status}`);
      return res.status(response.status).json({
        error: 'Companies House API error',
        message: `API returned status ${response.status}`
      });
    }

    const data = await response.json();
    console.log(`✅ Companies House search returned ${data.items?.length || 0} results`);

    res.json(data);

  } catch (error) {
    console.error('❌ Companies House search failed:', error);
    res.status(500).json({
      error: 'Companies House search failed',
      message: error.message
    });
  }
});

app.get('/api/companies-house/company/:companyNumber', async (req, res) => {
  try {
    const { companyNumber } = req.params;

    if (!companiesHouseApiKey) {
      return res.status(503).json({
        error: 'Companies House API not configured',
        message: 'Please set COMPANIES_HOUSE_API_KEY in your .env file'
      });
    }

    console.log(`📋 Companies House profile: ${companyNumber}`);

    const profileUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}`;

    const response = await fetch(profileUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(companiesHouseApiKey + ':').toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error(`❌ Companies House API error: ${response.status}`);
      return res.status(response.status).json({
        error: 'Companies House API error',
        message: `API returned status ${response.status}`
      });
    }

    const data = await response.json();
    console.log(`✅ Companies House profile retrieved: ${data.company_name}`);

    res.json(data);

  } catch (error) {
    console.error('❌ Companies House profile failed:', error);
    res.status(500).json({
      error: 'Companies House profile failed',
      message: error.message
    });
  }
});

// ==========================================
// Email Notification Endpoints (Resend)
// ==========================================

/**
 * Check notification service status
 * GET /api/notifications/status
 */
app.get('/api/notifications/status', (req, res) => {
  res.json({
    configured: !!resend,
    provider: 'resend'
  });
});

/**
 * Send deadline reminder email
 * POST /api/notifications/send-reminder
 */
app.post('/api/notifications/send-reminder', async (req, res) => {
  try {
    if (!resend) {
      return res.status(503).json({
        error: 'Email service not configured',
        message: 'Please set RESEND_API_KEY in your .env file'
      });
    }

    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'to, subject, and html/text are required'
      });
    }

    console.log(`📧 Sending reminder email to: ${to}`);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ClaimCraft <notifications@claimcraft.uk>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    console.log('✅ Email sent successfully:', data);
    res.json({ success: true, messageId: data.id });

  } catch (error) {
    console.error('❌ Failed to send reminder email:', error);
    res.status(500).json({
      error: 'Failed to send email',
      message: error.message
    });
  }
});

/**
 * Send test email to verify configuration
 * POST /api/notifications/test
 */
app.post('/api/notifications/test', async (req, res) => {
  try {
    if (!resend) {
      return res.status(503).json({
        error: 'Email service not configured',
        message: 'Please set RESEND_API_KEY in your .env file'
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    console.log(`📧 Sending test email to: ${email}`);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'ClaimCraft <notifications@claimcraft.uk>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'ClaimCraft - Test Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f0fdfa; padding: 24px; border-radius: 12px; border-left: 4px solid #0d9488;">
            <h2 style="color: #0d9488; margin: 0 0 8px 0;">Test Notification</h2>
            <p style="font-size: 16px; margin: 0; color: #111827;">Your email notifications are configured correctly!</p>
          </div>
          <div style="padding: 20px 0;">
            <p style="color: #374151;">This is a test email from ClaimCraft UK - Debt Recovery Assistant.</p>
            <p style="color: #374151;">You will receive deadline reminders at this email address when enabled.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            ClaimCraft UK - Debt Recovery Assistant
          </p>
        </div>
      `,
      text: 'Test Notification - Your email notifications are configured correctly! This is a test email from ClaimCraft UK - Debt Recovery Assistant.'
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return res.status(500).json({ error: 'Failed to send test email', details: error });
    }

    console.log('✅ Test email sent successfully:', data);
    res.json({ success: true, messageId: data.id });

  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

/**
 * ============================================
 * STRIPE PAYMENT ENDPOINTS
 * ============================================
 */

/**
 * Get payment service status
 * GET /api/payments/status
 */
app.get('/api/payments/status', (req, res) => {
  res.json({
    configured: Boolean(stripe),
    provider: 'stripe'
  });
});

/**
 * Create a PaymentIntent for document download
 * POST /api/payments/create-intent
 *
 * Body: {
 *   claimId: string,
 *   documentType: string
 * }
 */
app.post('/api/payments/create-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment service not configured',
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file'
      });
    }

    const { claimId, documentType } = req.body;

    if (!claimId || !documentType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'claimId and documentType are required'
      });
    }

    console.log(`💳 Creating payment intent for claim ${claimId}, document: ${documentType}`);

    // Create PaymentIntent with £2.50 amount (250 pence)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 250, // £2.50 in pence
      currency: 'gbp',
      metadata: {
        claimId,
        documentType,
        timestamp: new Date().toISOString()
      },
      description: `ClaimCraft - ${documentType} document download`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('❌ Failed to create payment intent:', error);
    res.status(500).json({
      error: 'Failed to create payment',
      message: error.message
    });
  }
});

/**
 * Verify payment status
 * GET /api/payments/verify/:paymentIntentId
 */
app.get('/api/payments/verify/:paymentIntentId', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment service not configured',
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file'
      });
    }

    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Missing payment intent ID'
      });
    }

    console.log(`🔍 Verifying payment: ${paymentIntentId}`);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const isPaid = paymentIntent.status === 'succeeded';

    console.log(`${isPaid ? '✅' : '⏳'} Payment status: ${paymentIntent.status}`);

    res.json({
      status: paymentIntent.status,
      paid: isPaid,
      claimId: paymentIntent.metadata.claimId || '',
      documentType: paymentIntent.metadata.documentType || '',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('❌ Failed to verify payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  ClaimCraft Backend Server                                  ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                            ║
║  Port: ${PORT}                                                 ║
║  Nango: Connected                                           ║
║  Anthropic: ${anthropic ? 'Connected' : 'Not Configured'}                                    ║
║  Gemini: ${gemini ? 'Connected' : 'Not Configured'}                                      ║
║  Resend: ${resend ? 'Connected' : 'Not Configured'}                                       ║
║  Stripe: ${stripe ? 'Connected' : 'Not Configured'}                                        ║
║  Companies House: ${companiesHouseApiKey ? 'Connected' : 'Not Configured'}                                ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                 ║
║  • GET  /api/health                - Health check           ║
║  • POST /api/nango/session         - Create session token   ║
║  • POST /api/nango/proxy           - Proxy API calls        ║
║  • GET  /api/nango/connections     - List connections       ║
║  • DELETE /api/nango/connections   - Delete connection      ║
║  • POST /api/anthropic/messages    - Claude AI proxy        ║
║  • POST /api/gemini/generate       - Gemini AI proxy        ║
║  • GET  /api/companies-house/search - Company search        ║
║  • GET  /api/companies-house/company/:num - Company profile ║
║  • GET  /api/notifications/status  - Email service status   ║
║  • POST /api/notifications/send-reminder - Send reminder    ║
║  • POST /api/notifications/test    - Test email             ║
║  • GET  /api/payments/status       - Payment service status ║
║  • POST /api/payments/create-intent - Create payment intent ║
║  • GET  /api/payments/verify/:id   - Verify payment status  ║
╚════════════════════════════════════════════════════════════╝
  `);
});
