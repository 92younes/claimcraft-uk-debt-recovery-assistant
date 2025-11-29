/**
 * Nango Client - OAuth and API Management for Accounting Integrations
 *
 * Handles secure OAuth flows and API calls to accounting systems via Nango.
 * Supports: Xero, QuickBooks, FreeAgent, Sage
 *
 * This implementation uses session tokens from a backend server.
 * The backend server runs on port 3001 and handles token generation.
 *
 * IMPORTANT: The backend server is REQUIRED. There is no fallback.
 *
 * Setup:
 * 1. Add NANGO_SECRET_KEY to your .env file
 * 2. Run both frontend and backend: npm run dev:full
 *    (Or separately: npm run server + npm run dev)
 */

import Nango from '@nangohq/frontend';
import { AccountingConnection } from '../types';

type AccountingProvider = 'xero' | 'quickbooks' | 'freeagent' | 'sage';

// Backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Integration IDs as configured in Nango dashboard
const INTEGRATION_IDS: Record<AccountingProvider, string> = {
  xero: 'xero',
  quickbooks: 'quickbooks',
  freeagent: 'freeagent',
  sage: 'sage'
};

// Storage keys per provider
const getStorageKeys = (provider: AccountingProvider) => ({
  connectionId: `claimcraft_${provider}_connection_id`,
  metadata: `claimcraft_${provider}_metadata`
});

// Generate a unique user ID for this browser session
const getUserId = (): string => {
  let userId = localStorage.getItem('claimcraft_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('claimcraft_user_id', userId);
  }
  return userId;
};

export class NangoClient {
  private static nango: Nango | null = null;
  private static sessionToken: string | null = null;
  private static sessionExpiresAt: Date | null = null;
  private static initPromise: Promise<void> | null = null;

  /**
   * Fetch a session token from the backend
   */
  private static async fetchSessionToken(): Promise<{ token: string; expiresAt: string }> {
    const userId = getUserId();

    console.log('📡 Fetching session token from backend...');

    const response = await fetch(`${API_BASE_URL}/api/nango/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        allowedIntegrations: ['xero', 'quickbooks', 'freeagent', 'sage']
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Backend error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return { token: data.sessionToken, expiresAt: data.expiresAt };
  }

  /**
   * Check if current session token is still valid
   */
  private static isSessionValid(): boolean {
    if (!this.sessionToken || !this.sessionExpiresAt) {
      return false;
    }

    // Add 1 minute buffer before expiry
    const bufferMs = 60 * 1000;
    return new Date().getTime() < this.sessionExpiresAt.getTime() - bufferMs;
  }

  /**
   * Initialize Nango with a session token from the backend
   * This is the recommended approach.
   */
  static async initialize(): Promise<void> {
    // If already initializing, wait for that to complete
    if (this.initPromise) {
      return this.initPromise;
    }

    // If already initialized and session is valid, skip
    if (this.nango && this.isSessionValid()) {
      console.log('✅ Nango already initialized with valid session');
      return;
    }

    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private static async _doInitialize(): Promise<void> {
    // First, check if backend is available
    const healthCheck = await fetch(`${API_BASE_URL}/api/health`).catch(() => null);

    if (!healthCheck || !healthCheck.ok) {
      console.error('❌ Backend server not available.');
      console.error('Please run the backend server: npm run server');
      console.error('Or run both frontend and backend together: npm run dev:full');
      throw new Error(
        'Backend server not available. Please run: npm run dev:full'
      );
    }

    try {
      // Fetch session token from backend
      const { token, expiresAt } = await this.fetchSessionToken();

      // Initialize Nango with session token
      this.nango = new Nango({ connectSessionToken: token });
      this.sessionToken = token;
      this.sessionExpiresAt = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 60 * 1000);

      console.log('✅ Nango client initialized with session token');

    } catch (error) {
      console.error('❌ Failed to initialize Nango:', error);
      throw new Error(
        `Failed to initialize Nango: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get Nango instance (ensures initialized)
   */
  private static async getNango(): Promise<Nango> {
    if (!this.nango || !this.isSessionValid()) {
      await this.initialize();
    }

    if (!this.nango) {
      throw new Error('Nango not initialized. Please check backend server is running.');
    }

    return this.nango;
  }

  /**
   * Connect to an accounting provider via OAuth
   * Opens popup window for user to authorize
   *
   * @param provider - The accounting provider to connect to
   * @returns Connection ID for future API calls
   */
  static async connect(provider: AccountingProvider): Promise<string> {
    const nango = await this.getNango();
    const integrationId = INTEGRATION_IDS[provider];
    const { connectionId: connIdKey, metadata: metadataKey } = getStorageKeys(provider);

    try {
      // Generate unique connection ID for this user
      const userId = getUserId();
      const connectionId = `${userId}_${provider}_${Date.now()}`;

      console.log(`🔗 Initiating OAuth flow for ${provider}...`);

      // Trigger OAuth flow
      const result = await nango.auth(integrationId, connectionId);

      if (!result) {
        throw new Error('OAuth flow cancelled or failed');
      }

      // Store connection ID locally
      localStorage.setItem(connIdKey, connectionId);

      // Fetch organization details
      const orgDetails = await this.fetchOrganizationDetails(provider, connectionId);

      // Store connection metadata
      const connection: AccountingConnection = {
        provider,
        connectionId,
        organizationName: orgDetails.name || `Unknown ${provider} Organization`,
        connectedAt: new Date().toISOString(),
        lastSyncAt: null
      };

      localStorage.setItem(metadataKey, JSON.stringify(connection));

      console.log(`✅ Connected to ${provider}:`, connection.organizationName);

      return connectionId;
    } catch (error) {
      console.error(`❌ ${provider} connection failed:`, error);
      throw new Error(`Failed to connect to ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use connect('xero') instead
   */
  static async connectXero(): Promise<string> {
    return this.connect('xero');
  }

  /**
   * Check if a provider is currently connected
   */
  static async isConnected(provider: AccountingProvider): Promise<boolean> {
    const { connectionId: connIdKey } = getStorageKeys(provider);
    const connectionId = localStorage.getItem(connIdKey);

    if (!connectionId) {
      return false;
    }

    // For now, just check if we have the connection stored
    // A more robust check would verify with Nango API
    const connection = this.getConnection(provider);
    return connection !== null;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use isConnected('xero') instead
   */
  static async isXeroConnected(): Promise<boolean> {
    return this.isConnected('xero');
  }

  /**
   * Get connection metadata for a provider
   */
  static getConnection(provider: AccountingProvider): AccountingConnection | null {
    const { metadata: metadataKey } = getStorageKeys(provider);
    const metadataStr = localStorage.getItem(metadataKey);

    if (!metadataStr) {
      return null;
    }

    try {
      return JSON.parse(metadataStr) as AccountingConnection;
    } catch (error) {
      console.error('Failed to parse connection metadata:', error);
      return null;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getConnection('xero') instead
   */
  static getXeroConnection(): AccountingConnection | null {
    return this.getConnection('xero');
  }

  /**
   * Get all active connections
   */
  static getAllConnections(): AccountingConnection[] {
    const providers: AccountingProvider[] = ['xero', 'quickbooks', 'freeagent', 'sage'];
    return providers
      .map(provider => this.getConnection(provider))
      .filter((conn): conn is AccountingConnection => conn !== null);
  }

  /**
   * Disconnect from a provider (revoke tokens and clear local data)
   */
  static async disconnect(provider: AccountingProvider): Promise<void> {
    const { connectionId: connIdKey, metadata: metadataKey } = getStorageKeys(provider);
    const connectionId = localStorage.getItem(connIdKey);

    if (connectionId) {
      try {
        // Call backend to revoke the connection
        await fetch(`${API_BASE_URL}/api/nango/connections/${provider}/${connectionId}`, {
          method: 'DELETE'
        });
        console.log(`✅ Connection revoked on server: ${provider}`);
      } catch (error) {
        console.warn(`⚠️ Failed to revoke ${provider} connection on server:`, error);
      }
    }

    // Clear local storage
    localStorage.removeItem(connIdKey);
    localStorage.removeItem(metadataKey);

    console.log(`✅ ${provider} disconnected locally`);
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use disconnect('xero') instead
   */
  static async disconnectXero(): Promise<void> {
    return this.disconnect('xero');
  }

  /**
   * Update last sync time for a provider
   */
  static updateLastSync(provider: AccountingProvider): void {
    const { metadata: metadataKey } = getStorageKeys(provider);
    const connection = this.getConnection(provider);

    if (connection) {
      connection.lastSyncAt = new Date().toISOString();
      localStorage.setItem(metadataKey, JSON.stringify(connection));
    }
  }

  /**
   * Generic API call via Nango proxy
   *
   * @param provider - Accounting provider
   * @param endpoint - API endpoint (e.g., '/Invoices')
   * @param connectionId - Nango connection ID (optional, uses stored if not provided)
   * @param params - Query parameters (optional)
   * @returns API response data
   */
  static async callApi<T = unknown>(
    provider: AccountingProvider,
    endpoint: string,
    connectionId?: string,
    params?: Record<string, string>
  ): Promise<T> {
    const nango = await this.getNango() as any; // Type assertion for proxy method
    const { connectionId: connIdKey } = getStorageKeys(provider);
    const connId = connectionId || localStorage.getItem(connIdKey);

    if (!connId) {
      throw new Error(`No ${provider} connection found. Please connect first.`);
    }

    try {
      // Nango proxy endpoint format
      const response = await nango.proxy({
        method: 'GET',
        endpoint: endpoint,
        providerConfigKey: INTEGRATION_IDS[provider],
        connectionId: connId,
        params: params
      });

      return response.data as T;
    } catch (error: any) {
      console.error(`❌ ${provider} API call failed:`, error);

      // Handle token expiration
      if (error?.response?.status === 401) {
        console.warn(`⚠️ ${provider} token expired, disconnecting...`);
        await this.disconnect(provider);
        throw new Error(`${provider} connection expired. Please reconnect.`);
      }

      throw new Error(`${provider} API error: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use callApi('xero', endpoint, connectionId, params) instead
   */
  static async callXeroApi<T = unknown>(
    endpoint: string,
    connectionId?: string,
    params?: Record<string, string>
  ): Promise<T> {
    return this.callApi<T>('xero', endpoint, connectionId, params);
  }

  /**
   * Fetch organization details from provider
   * Each provider has different API structure
   */
  private static async fetchOrganizationDetails(
    provider: AccountingProvider,
    connectionId: string
  ): Promise<{ name: string }> {
    try {
      switch (provider) {
        case 'xero': {
          const response = await this.callApi<{ Organisations: any[] }>(
            provider,
            '/Organisation',
            connectionId
          );
          if (response.Organisations && response.Organisations.length > 0) {
            return { name: response.Organisations[0].Name || 'Unknown Organization' };
          }
          break;
        }
        case 'quickbooks': {
          const response = await this.callApi<{ CompanyInfo: any }>(
            provider,
            '/company',
            connectionId
          );
          return { name: response.CompanyInfo?.CompanyName || 'Unknown Organization' };
        }
        case 'freeagent': {
          const response = await this.callApi<{ company: any }>(
            provider,
            '/company',
            connectionId
          );
          return { name: response.company?.name || 'Unknown Organization' };
        }
        case 'sage': {
          const response = await this.callApi<{ name: string }>(
            provider,
            '/company',
            connectionId
          );
          return { name: response.name || 'Unknown Organization' };
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch ${provider} organization details:`, error);
    }

    return { name: `Unknown ${provider} Organization` };
  }

  /**
   * Test connection for a provider (useful for debugging)
   */
  static async testConnection(provider: AccountingProvider = 'xero'): Promise<boolean> {
    try {
      const { connectionId: connIdKey } = getStorageKeys(provider);
      const connectionId = localStorage.getItem(connIdKey);

      if (!connectionId) {
        console.error(`❌ No ${provider} connection ID found`);
        return false;
      }

      const endpoint = provider === 'xero' ? '/Organisation' : '/company';
      const orgData = await this.callApi(provider, endpoint, connectionId);
      console.log(`✅ ${provider} connection test successful:`, orgData);
      return true;
    } catch (error) {
      console.error(`❌ ${provider} connection test failed:`, error);
      return false;
    }
  }
}
