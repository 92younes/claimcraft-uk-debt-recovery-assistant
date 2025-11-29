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

    res.json({
      sessionToken: result.data.token,
      expiresAt: result.data.expires_at
    });

  } catch (error) {
    console.error('❌ Failed to create Nango session:', error);

    res.status(500).json({
      error: 'Failed to create session',
      message: error.message || 'Unknown error occurred'
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
 *   data?: object          // Request body (for POST/PUT)
 * }
 */
app.post('/api/nango/proxy', async (req, res) => {
  try {
    const { provider, connectionId, endpoint, method = 'GET', params, data } = req.body;

    if (!provider || !connectionId || !endpoint) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'provider, connectionId, and endpoint are required'
      });
    }

    console.log(`📡 Proxy request: ${method} ${provider}${endpoint}`);

    // Use Nango's proxy to make authenticated API call
    const response = await nango.proxy({
      method,
      endpoint,
      providerConfigKey: provider,
      connectionId,
      params,
      data
    });

    console.log(`✅ Proxy request successful: ${provider}${endpoint}`);

    res.json(response.data);

  } catch (error) {
    console.error('❌ Proxy request failed:', error);

    // Extract status code if available
    const statusCode = error.response?.status || 500;

    res.status(statusCode).json({
      error: 'Proxy request failed',
      message: error.message || 'Unknown error',
      status: statusCode
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
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                 ║
║  • GET  /api/health              - Health check             ║
║  • POST /api/nango/session       - Create session token     ║
║  • POST /api/nango/proxy         - Proxy API calls          ║
║  • GET  /api/nango/connections   - List connections         ║
║  • DELETE /api/nango/connections - Delete connection        ║
╚════════════════════════════════════════════════════════════╝
  `);
});
