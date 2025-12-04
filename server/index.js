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
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

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

// Increase request body size limit for document generation (templates can be large)
app.use(express.json({ limit: '1mb' }));

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
║  Companies House: ${companiesHouseApiKey ? 'Connected' : 'Not Configured'}                                ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                 ║
║  • GET  /api/health                - Health check           ║
║  • POST /api/nango/session         - Create session token   ║
║  • POST /api/nango/proxy           - Proxy API calls        ║
║  • GET  /api/nango/connections     - List connections       ║
║  • DELETE /api/nango/connections   - Delete connection      ║
║  • POST /api/anthropic/messages    - Claude AI proxy        ║
║  • GET  /api/companies-house/search - Company search        ║
║  • GET  /api/companies-house/company/:num - Company profile ║
╚════════════════════════════════════════════════════════════╝
  `);
});
