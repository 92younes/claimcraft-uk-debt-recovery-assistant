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
      setSuccess(`✅ Successfully connected to ${newConnection?.organizationName || provider}!`);

      // Notify parent (backward compatibility - only for Xero)
      if (onConnectionChange && newConnection && provider === 'xero') {
        onConnectionChange(newConnection);
      }

      // Auto-close success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to connect to ${provider}`);
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
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
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
      setError(err instanceof Error ? err.message : 'Failed to use shared connection');
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
      title="Accounting Integration"
      description="Connect your accounting system to import overdue invoices."
      maxWidthClassName="max-w-4xl"
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
      <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Connection Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <p className="font-medium text-teal-900">{success}</p>
            </div>
          )}

          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              {showSharedOptions ? 'Hide' : 'Or use existing connection'} ({sharedConnections.length} available)
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
                                    <span className="text-teal-700 ml-2">(Use shared)</span>
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
                      OAuth authorization required
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Setup Instructions - Developer Only (Hidden in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 opacity-60 hover:opacity-100 transition-opacity">
              <h4 className="text-sm font-bold text-teal-900 mb-2 flex items-center gap-2">
                <span>⚙️</span>
                Setup Instructions
                <span className="text-[10px] bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded uppercase tracking-wider">Dev Only</span>
              </h4>
              <ul className="space-y-1 text-xs text-teal-800">
                <li>• <strong>Step 1:</strong> Get your Nango secret key from <a href="https://app.nango.dev/" target="_blank" rel="noopener noreferrer" className="underline">app.nango.dev</a></li>
                <li>• <strong>Step 2:</strong> Add <code className="bg-teal-100 px-1 rounded">NANGO_SECRET_KEY=your_key</code> to your .env file</li>
                <li>• <strong>Step 3:</strong> Run <code className="bg-teal-100 px-1 rounded">npm run dev:full</code> (starts backend + frontend)</li>
                <li>• Configure the Xero integration in Nango dashboard with ID: <code className="bg-teal-100 px-1 rounded">xero</code></li>
              </ul>
            </div>
          )}

          {/* Security Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-900 mb-2">🔒 Security & Privacy</h4>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>• We use Nango for secure OAuth authentication</li>
              <li>• We only request READ access to invoices and contacts</li>
              <li>• We NEVER modify your accounting data</li>
              <li>• You can disconnect at any time</li>
              <li>• Imported data is stored locally in your browser</li>
            </ul>
          </div>
      </div>
    </Modal>
  );
};
