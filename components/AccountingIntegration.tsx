/**
 * Accounting Integration Modal
 *
 * Allows users to connect/disconnect accounting systems and import invoices.
 * Supports: Xero, QuickBooks, FreeAgent, Sage
 */

import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Unlink, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { NangoClient } from '../services/nangoClient';
import { AccountingConnection } from '../types';

type AccountingProvider = 'xero' | 'quickbooks' | 'freeagent' | 'sage';

interface ProviderConfig {
  id: AccountingProvider;
  name: string;
  color: string;
  icon: string;
}

// Only include integrations that are configured in your Nango dashboard
const PROVIDERS: ProviderConfig[] = [
  { id: 'xero', name: 'Xero', color: 'bg-blue-600', icon: 'X' }
  // Add more providers here once configured in Nango:
  // { id: 'quickbooks', name: 'QuickBooks', color: 'bg-green-600', icon: 'Q' },
  // { id: 'freeagent', name: 'FreeAgent', color: 'bg-purple-600', icon: 'F' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Accounting Integration</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Connect your accounting system to import overdue invoices</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
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
                        <button
                          onClick={() => handleImport(provider.id)}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          Import
                        </button>
                        <button
                          onClick={() => handleDisconnect(provider.id, provider.name)}
                          disabled={isDisconnecting}
                          className="px-4 py-2 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDisconnecting ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlink className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2 w-full">
                        <button
                          onClick={() => handleConnect(provider.id)}
                          disabled={isConnecting}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isConnecting ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <LinkIcon className="w-4 h-4" />
                              Connect New Account
                            </>
                          )}
                        </button>

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
                                    className="w-full p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left text-xs transition-colors"
                                  >
                                    <span className="font-medium text-blue-900">{shared.organizationName}</span>
                                    <span className="text-blue-600 ml-2">(Use shared)</span>
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

          {/* Setup Instructions */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-teal-900 mb-2">⚙️ Setup Instructions</h4>
            <ul className="space-y-1 text-xs text-teal-800">
              <li>• <strong>Step 1:</strong> Get your Nango secret key from <a href="https://app.nango.dev/" target="_blank" rel="noopener noreferrer" className="underline">app.nango.dev</a></li>
              <li>• <strong>Step 2:</strong> Add <code className="bg-teal-100 px-1 rounded">NANGO_SECRET_KEY=your_key</code> to your .env file</li>
              <li>• <strong>Step 3:</strong> Run <code className="bg-teal-100 px-1 rounded">npm run dev:full</code> (starts backend + frontend)</li>
              <li>• Configure the Xero integration in Nango dashboard with ID: <code className="bg-teal-100 px-1 rounded">xero</code></li>
            </ul>
          </div>

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

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
