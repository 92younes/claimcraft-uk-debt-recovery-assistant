/**
 * Accounting Integration Modal
 *
 * Allows users to connect/disconnect accounting systems and import invoices.
 * Supports: Xero, QuickBooks, FreeAgent, Sage
 */

import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Unlink, Download, CheckCircle, AlertCircle, Loader, Link } from 'lucide-react';
import { NangoClient } from '../services/nangoClient';
import { AccountingConnection } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

type AccountingProvider = 'xero' | 'quickbooks' | 'freeagent' | 'sage';

interface ProviderConfig {
  id: AccountingProvider;
  name: string;
  color: string;
  icon: string;
}

// Only include integrations that are configured in your Nango dashboard
const PROVIDERS: ProviderConfig[] = [
  { id: 'xero', name: 'Xero', color: 'bg-teal-600', icon: 'X' }
  // Add more providers here once configured in Nango:
  // { id: 'quickbooks', name: 'QuickBooks', color: 'bg-green-600', icon: 'Q' },
  // { id: 'freeagent', name: 'FreeAgent', color: 'bg-teal-600', icon: 'F' },
  // { id: 'sage', name: 'Sage', color: 'bg-teal-600', icon: 'S' }
];

interface AccountingIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onImportClick: () => void; // Opens XeroInvoiceImporter (to be refactored for all providers)
  onConnectionChange?: (connection: AccountingConnection | null) => void;
}

interface SharedConnection {
  connectionId: string;
  tenantId: string;
  organizationName: string;
}

export const AccountingIntegration: React.FC<AccountingIntegrationProps> = ({
  isOpen,
  onClose,
  onImportClick,
  onConnectionChange
}) => {
  const [connections, setConnections] = useState<Map<AccountingProvider, AccountingConnection | null>>(new Map());
  const [connectingProvider, setConnectingProvider] = useState<AccountingProvider | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<AccountingProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sharedConnections, setSharedConnections] = useState<SharedConnection[]>([]);
  const [showSharedOptions, setShowSharedOptions] = useState(false);

  // Sanitize error messages for end users
  const sanitizeErrorMessage = (error: unknown): string => {
    if (!(error instanceof Error)) {
      return 'Something went wrong. Please try again.';
    }

    const message = error.message;

    // Replace technical/developer messages with user-friendly ones
    if (message.includes('Backend server') || message.includes('npm run') || message.includes('Nango not initialized')) {
      return 'Unable to connect at the moment. Please check your internet connection and try again.';
    }

    if (message.includes('OAuth flow cancelled')) {
      return 'Connection cancelled. Click "Connect" to try again.';
    }

    if (message.includes('connection expired')) {
      return 'Your connection has expired. Please reconnect to continue.';
    }

    // Return the error message if it's already user-friendly
    return message;
  };

  // Load all connections on mount
  useEffect(() => {
    if (isOpen) {
      loadAllConnections();
      loadSharedConnections();
    }
  }, [isOpen]);

  const loadSharedConnections = async () => {
    try {
      const available = await NangoClient.getAvailableConnections('xero');
      setSharedConnections(available);
    } catch (err) {
      console.warn('Could not load shared connections:', err);
    }
  };

  const loadAllConnections = async () => {
    const newConnections = new Map<AccountingProvider, AccountingConnection | null>();

    for (const provider of PROVIDERS) {
      const isConnected = await NangoClient.isConnected(provider.id);
      if (isConnected) {
        const conn = NangoClient.getConnection(provider.id);
        newConnections.set(provider.id, conn);
      } else {
        newConnections.set(provider.id, null);
      }
    }

    setConnections(newConnections);
  };

  const handleConnect = async (provider: AccountingProvider) => {
    setConnectingProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      await NangoClient.connect(provider);
      const newConnection = NangoClient.getConnection(provider);

      setConnections(prev => new Map(prev).set(provider, newConnection));
      setSuccess(`Successfully connected to ${newConnection?.organizationName || provider}!`);

      // Notify parent (backward compatibility - only for Xero)
      if (onConnectionChange && newConnection && provider === 'xero') {
        onConnectionChange(newConnection);
      }

      // Auto-close success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
      console.error('Connection error:', err);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (provider: AccountingProvider, providerName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${providerName}? Existing imported invoices will remain, but you won't be able to import new ones.`)) {
      return;
    }

    setDisconnectingProvider(provider);
    setError(null);

    try {
      await NangoClient.disconnect(provider);
      setConnections(prev => new Map(prev).set(provider, null));
      setSuccess(`Disconnected from ${providerName}`);

      // Notify parent (backward compatibility - only for Xero)
      if (onConnectionChange && provider === 'xero') {
        onConnectionChange(null);
      }

      // Auto-close success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleUseSharedConnection = async (shared: SharedConnection) => {
    setConnectingProvider('xero');
    setError(null);
    setShowSharedOptions(false);

    try {
      await NangoClient.useSharedConnection('xero', shared.connectionId, shared.tenantId, shared.organizationName);
      const newConnection = NangoClient.getConnection('xero');

      setConnections(prev => new Map(prev).set('xero', newConnection));
      setSuccess(`Connected to ${shared.organizationName}!`);

      if (onConnectionChange && newConnection) {
        onConnectionChange(newConnection);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(sanitizeErrorMessage(err));
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleImport = (provider: AccountingProvider) => {
    const connection = connections.get(provider);

    if (!connection) {
      setError(`Please connect to ${provider} first`);
      return;
    }

    // Currently only Xero importer exists
    // TODO: Create generic invoice importer for all providers
    if (provider === 'xero') {
      onImportClick();
    } else {
      setError(`Import functionality for ${provider} is coming soon. The connection is ready, but the invoice importer needs to be implemented.`);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Your Accounting Software"
      description="Quickly import overdue invoices from your accounting system to start recovering payments."
      maxWidthClassName="max-w-md"
      bodyClassName="p-0"
      titleIcon={(
        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
          <Link className="w-6 h-6 text-teal-600" />
        </div>
      )}
      footer={(
        <Button variant="secondary" onClick={onClose} fullWidth>
          Close
        </Button>
      )}
    >
      <div className="p-5 space-y-5">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50/30 border border-slate-200 border-l-4 border-l-red-500 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Connection Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-teal-50/30 border border-slate-200 border-l-4 border-l-teal-500 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <p className="font-medium text-teal-900">{success}</p>
            </div>
          )}

          {/* Provider Cards */}
          <div className={`grid gap-4 ${PROVIDERS.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {PROVIDERS.map(provider => {
              const connection = connections.get(provider.id);
              const isConnected = !!connection;
              const isConnecting = connectingProvider === provider.id;
              const isDisconnecting = disconnectingProvider === provider.id;

              return (
                <div
                  key={provider.id}
                  className={`border-2 rounded-xl p-5 transition-all duration-200 ${
                    isConnected ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Provider Logo */}
                      <div className={`w-12 h-12 ${provider.color} rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0`}>
                        {provider.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
                        <p className="text-xs text-slate-600">Accounting software</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      isConnected
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        isConnected ? 'bg-teal-500' : 'bg-slate-400'
                      }`} />
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </div>
                  </div>

                  {/* Connection Details (if connected) */}
                  {connection && (
                    <div className="mb-3 p-3 bg-white rounded-xl border border-teal-200 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Organization:</span>
                        <span className="font-medium text-slate-900">{connection.organizationName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Connected:</span>
                        <span className="font-medium text-slate-900">
                          {new Date(connection.connectedAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      {connection.lastSyncAt && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Last sync:</span>
                          <span className="font-medium text-slate-900">
                            {new Date(connection.lastSyncAt).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {isConnected ? (
                      <>
                        <Button
                          onClick={() => handleImport(provider.id)}
                          icon={<Download className="w-4 h-4" />}
                          className="flex-1"
                        >
                          Import
                        </Button>
                        <Button
                          onClick={() => handleDisconnect(provider.id, provider.name)}
                          disabled={isDisconnecting}
                          isLoading={isDisconnecting}
                          variant="danger"
                          icon={!isDisconnecting && <Unlink className="w-4 h-4" />}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-2 w-full">
                        <Button
                          onClick={() => handleConnect(provider.id)}
                          disabled={isConnecting}
                          isLoading={isConnecting}
                          icon={!isConnecting && <LinkIcon className="w-4 h-4" />}
                          fullWidth
                        >
                          {isConnecting ? 'Connecting...' : 'Connect New Account'}
                        </Button>

                        {/* Show shared connection options for Xero */}
                        {provider.id === 'xero' && sharedConnections.length > 0 && (
                          <>
                            <button
                              onClick={() => setShowSharedOptions(!showSharedOptions)}
                              className="w-full text-teal-600 hover:text-teal-700 text-xs font-medium py-1"
                            >
                              {showSharedOptions ? 'Hide organizations' : 'Or select an organization'} ({sharedConnections.length} available)
                            </button>

                            {showSharedOptions && (
                              <div className="space-y-1 animate-fade-in">
                                {sharedConnections.map(shared => (
                                  <button
                                    key={shared.connectionId}
                                    onClick={() => handleUseSharedConnection(shared)}
                                    className="w-full p-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg text-left text-xs transition-colors"
                                  >
                                    <span className="font-medium text-teal-900">{shared.organizationName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Help Text */}
                  {!isConnected && (
                    <p className="mt-2 text-xs text-slate-500 text-center">
                      Connect to import your invoices
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security & Privacy */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1.5">Your data is secure</h4>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 shrink-0">✓</span>
                    <span>Bank-level encryption protects your connection</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 shrink-0">✓</span>
                    <span>We only read invoices and customer details</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 shrink-0">✓</span>
                    <span>We never modify or delete your accounting data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-teal-600 shrink-0">✓</span>
                    <span>Disconnect anytime without affecting your accounts</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
      </div>
    </Modal>
  );
};
