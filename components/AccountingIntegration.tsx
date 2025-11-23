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

const PROVIDERS: ProviderConfig[] = [
  { id: 'xero', name: 'Xero', color: 'bg-blue-600', icon: 'X' },
  { id: 'quickbooks', name: 'QuickBooks', color: 'bg-green-600', icon: 'Q' },
  { id: 'freeagent', name: 'FreeAgent', color: 'bg-purple-600', icon: 'F' },
  { id: 'sage', name: 'Sage', color: 'bg-teal-600', icon: 'S' }
];

interface AccountingIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onImportClick: () => void; // Opens XeroInvoiceImporter (to be refactored for all providers)
  onConnectionChange?: (connection: AccountingConnection | null) => void;
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

  // Load all connections on mount
  useEffect(() => {
    if (isOpen) {
      loadAllConnections();
    }
  }, [isOpen]);

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
      setSuccess(`✅ Disconnected from ${providerName}`);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-serif">Accounting Integration</h2>
            <p className="text-sm text-slate-500 mt-1">Connect your accounting system to import overdue invoices</p>
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="font-medium text-green-900">{success}</p>
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
                    isConnected ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Provider Logo */}
                      <div className={`w-12 h-12 ${provider.color} rounded-lg flex items-center justify-center text-white font-bold text-xl shrink-0`}>
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
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-slate-400'
                      }`} />
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </div>
                  </div>

                  {/* Connection Details (if connected) */}
                  {connection && (
                    <div className="mb-3 p-3 bg-white rounded-lg border border-green-200 space-y-1.5">
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
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          Import
                        </button>
                        <button
                          onClick={() => handleDisconnect(provider.id, provider.name)}
                          disabled={isDisconnecting}
                          className="px-4 py-2 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isDisconnecting ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlink className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(provider.id)}
                        disabled={isConnecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-blue-900 mb-2">⚙️ Setup Requirements</h4>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• Nango account required (free at <a href="https://app.nango.dev/" target="_blank" rel="noopener noreferrer" className="underline">app.nango.dev</a>)</li>
              <li>• Configure each provider in your Nango dashboard with integration IDs: xero, quickbooks, freeagent, sage</li>
              <li>• Add VITE_NANGO_PUBLIC_KEY to your .env file</li>
              <li>• QuickBooks, FreeAgent, and Sage connections are ready - invoice importers coming soon</li>
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
            className="w-full px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
