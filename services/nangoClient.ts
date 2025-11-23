/**
 * Nango Client - OAuth and API Management for Accounting Integrations
 *
 * Handles secure OAuth flows and API calls to accounting systems via Nango.
 * Supports: Xero, QuickBooks, FreeAgent, Sage
 *
 * Setup:
 * 1. Create account at https://app.nango.dev/
 * 2. Configure integrations in Nango dashboard:
 *    - Xero: Integration ID 'xero'
 *    - QuickBooks: Integration ID 'quickbooks'
 *    - FreeAgent: Integration ID 'freeagent'
 *    - Sage: Integration ID 'sage'
 * 3. Add VITE_NANGO_PUBLIC_KEY to .env
 */

import Nango from '@nangohq/frontend';
import { AccountingConnection } from '../types';

type AccountingProvider = 'xero' | 'quickbooks' | 'freeagent' | 'sage';

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

export class NangoClient {
  private static nango: Nango | null = null;

  /**
   * Initialize Nango with public key
   * Call this once on app startup
   */
  static initialize(): void {
    const publicKey = import.meta.env.VITE_NANGO_PUBLIC_KEY;

    if (!publicKey) {
      console.warn('⚠️ VITE_NANGO_PUBLIC_KEY not set. Xero integration will not work.');
      return;
    }

    if (this.nango) {
      return; // Already initialized
    }

    try {
      this.nango = new Nango({ publicKey });
      console.log('✅ Nango client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Nango:', error);
      throw new Error('Nango initialization failed. Check your public key.');
    }
  }

  /**
   * Get Nango instance (ensures initialized)
   */
  private static getNango(): Nango {
    if (!this.nango) {
      this.initialize();
    }

    if (!this.nango) {
      throw new Error('Nango not initialized. Check VITE_NANGO_PUBLIC_KEY in .env');
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
    const nango = this.getNango();
    const integrationId = INTEGRATION_IDS[provider];
    const { connectionId: connIdKey, metadata: metadataKey } = getStorageKeys(provider);

    try {
      // Generate unique connection ID for this user
      // In production, use authenticated user ID
      const connectionId = `user_${provider}_${Date.now()}`;

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

    // Verify connection is still valid by attempting a simple API call
    try {
      const endpoint = provider === 'xero' ? '/Organisation' : '/company';
      await this.callApi(provider, endpoint, connectionId);
      return true;
    } catch (error) {
      // Connection invalid (expired token or revoked)
      console.warn(`⚠️ ${provider} connection invalid, clearing local data`);
      await this.disconnect(provider);
      return false;
    }
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
        // Note: Nango SDK doesn't expose delete method in frontend
        // Token revocation should be done server-side in production
        // For now, just clear local storage
        console.log('⚠️ Connection revocation should be done server-side');
      } catch (error) {
        console.warn(`⚠️ Failed to revoke ${provider} connection:`, error);
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
  static async callApi<T = any>(
    provider: AccountingProvider,
    endpoint: string,
    connectionId?: string,
    params?: Record<string, string>
  ): Promise<T> {
    const nango = this.getNango() as any; // Type assertion for proxy method
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
  static async callXeroApi<T = any>(
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
          // QuickBooks API structure: /company/{companyId}/companyinfo/{companyId}
          const response = await this.callApi<{ CompanyInfo: any }>(
            provider,
            '/company',
            connectionId
          );
          return { name: response.CompanyInfo?.CompanyName || 'Unknown Organization' };
        }
        case 'freeagent': {
          // FreeAgent API structure: /company
          const response = await this.callApi<{ company: any }>(
            provider,
            '/company',
            connectionId
          );
          return { name: response.company?.name || 'Unknown Organization' };
        }
        case 'sage': {
          // Sage API structure: /company
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
