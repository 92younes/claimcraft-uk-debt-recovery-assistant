/**
 * Nango Client - OAuth and API Management for Accounting Integrations
 *
 * Handles secure OAuth flows and API calls to accounting systems via Nango.
 * Supports: Xero, QuickBooks, FreeAgent, Sage (extensible)
 *
 * Setup:
 * 1. Create account at https://app.nango.dev/
 * 2. Configure Xero integration in Nango dashboard
 * 3. Add VITE_NANGO_PUBLIC_KEY to .env
 */

import Nango from '@nangohq/frontend';
import { AccountingConnection } from '../types';

const XERO_INTEGRATION_ID = 'xero'; // As configured in Nango dashboard
const CONNECTION_ID_KEY = 'claimcraft_xero_connection_id';
const CONNECTION_METADATA_KEY = 'claimcraft_xero_metadata';

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
   * Trigger Xero OAuth flow
   * Opens popup window for user to authorize
   *
   * @returns Connection ID for future API calls
   */
  static async connectXero(): Promise<string> {
    const nango = this.getNango();

    try {
      // Generate unique connection ID for this user
      // In production, use authenticated user ID
      const connectionId = `user_${Date.now()}`;

      // Trigger OAuth flow
      const result = await nango.auth(XERO_INTEGRATION_ID, connectionId);

      if (!result) {
        throw new Error('OAuth flow cancelled or failed');
      }

      // Store connection ID locally
      localStorage.setItem(CONNECTION_ID_KEY, connectionId);

      // Fetch organization details from Xero
      const orgDetails = await this.fetchXeroOrganization(connectionId);

      // Store connection metadata
      const connection: AccountingConnection = {
        provider: 'xero',
        connectionId,
        organizationName: orgDetails.Name || 'Unknown Organization',
        connectedAt: new Date().toISOString(),
        lastSyncAt: null
      };

      localStorage.setItem(CONNECTION_METADATA_KEY, JSON.stringify(connection));

      console.log('✅ Connected to Xero:', connection.organizationName);

      return connectionId;
    } catch (error) {
      console.error('❌ Xero connection failed:', error);
      throw new Error(`Failed to connect to Xero: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Xero is currently connected
   */
  static async isXeroConnected(): Promise<boolean> {
    const connectionId = localStorage.getItem(CONNECTION_ID_KEY);

    if (!connectionId) {
      return false;
    }

    // Verify connection is still valid by attempting a simple API call
    try {
      await this.callXeroApi('/Organisation', connectionId);
      return true;
    } catch (error) {
      // Connection invalid (expired token or revoked)
      console.warn('⚠️ Xero connection invalid, clearing local data');
      this.disconnectXero();
      return false;
    }
  }

  /**
   * Get current Xero connection metadata
   */
  static getXeroConnection(): AccountingConnection | null {
    const metadataStr = localStorage.getItem(CONNECTION_METADATA_KEY);

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
   * Disconnect Xero (revoke tokens and clear local data)
   */
  static async disconnectXero(): Promise<void> {
    const connectionId = localStorage.getItem(CONNECTION_ID_KEY);

    if (connectionId) {
      try {
        // Note: Nango SDK doesn't expose delete method in frontend
        // Token revocation should be done server-side in production
        // For now, just clear local storage
        console.log('⚠️ Connection revocation should be done server-side');
      } catch (error) {
        console.warn('⚠️ Failed to revoke Nango connection:', error);
      }
    }

    // Clear local storage
    localStorage.removeItem(CONNECTION_ID_KEY);
    localStorage.removeItem(CONNECTION_METADATA_KEY);

    console.log('✅ Xero disconnected locally');
  }

  /**
   * Update last sync time
   */
  static updateLastSync(): void {
    const connection = this.getXeroConnection();

    if (connection) {
      connection.lastSyncAt = new Date().toISOString();
      localStorage.setItem(CONNECTION_METADATA_KEY, JSON.stringify(connection));
    }
  }

  /**
   * Generic Xero API call via Nango proxy
   *
   * @param endpoint - Xero API endpoint (e.g., '/Invoices')
   * @param connectionId - Nango connection ID
   * @param params - Query parameters (optional)
   * @returns API response data
   */
  static async callXeroApi<T = any>(
    endpoint: string,
    connectionId?: string,
    params?: Record<string, string>
  ): Promise<T> {
    const nango = this.getNango() as any; // Type assertion for proxy method
    const connId = connectionId || localStorage.getItem(CONNECTION_ID_KEY);

    if (!connId) {
      throw new Error('No Xero connection found. Please connect first.');
    }

    try {
      // Nango proxy endpoint format
      const response = await nango.proxy({
        method: 'GET',
        endpoint: endpoint,
        providerConfigKey: XERO_INTEGRATION_ID,
        connectionId: connId,
        params: params
      });

      return response.data as T;
    } catch (error: any) {
      console.error('❌ Xero API call failed:', error);

      // Handle token expiration
      if (error?.response?.status === 401) {
        console.warn('⚠️ Xero token expired, disconnecting...');
        this.disconnectXero();
        throw new Error('Xero connection expired. Please reconnect.');
      }

      throw new Error(`Xero API error: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Fetch Xero organization details
   */
  private static async fetchXeroOrganization(connectionId: string): Promise<any> {
    const response = await this.callXeroApi<{ Organisations: any[] }>(
      '/Organisation',
      connectionId
    );

    if (response.Organisations && response.Organisations.length > 0) {
      return response.Organisations[0];
    }

    return { Name: 'Unknown Organization' };
  }

  /**
   * Test connection (useful for debugging)
   */
  static async testConnection(): Promise<boolean> {
    try {
      const connectionId = localStorage.getItem(CONNECTION_ID_KEY);

      if (!connectionId) {
        console.error('❌ No connection ID found');
        return false;
      }

      const orgData = await this.callXeroApi('/Organisation', connectionId);
      console.log('✅ Xero connection test successful:', orgData);
      return true;
    } catch (error) {
      console.error('❌ Xero connection test failed:', error);
      return false;
    }
  }
}
