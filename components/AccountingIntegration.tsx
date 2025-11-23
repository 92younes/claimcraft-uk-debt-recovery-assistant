/**
 * Accounting Integration Modal
 *
 * Allows users to connect/disconnect accounting systems and import invoices.
 * Currently supports: Xero (more platforms coming soon)
 */

import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Unlink, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { NangoClient } from '../services/nangoClient';
import { AccountingConnection } from '../types';

interface AccountingIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onImportClick: () => void; // Opens XeroInvoiceImporter
  onConnectionChange?: (connection: AccountingConnection | null) => void;
}

export const AccountingIntegration: React.FC<AccountingIntegrationProps> = ({
  isOpen,
  onClose,
  onImportClick,
  onConnectionChange
}) => {
  const [connection, setConnection] = useState<AccountingConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load connection on mount
  useEffect(() => {
    if (isOpen) {
      loadConnection();
    }
  }, [isOpen]);

  const loadConnection = async () => {
    const isConnected = await NangoClient.isXeroConnected();

    if (isConnected) {
      const conn = NangoClient.getXeroConnection();
      setConnection(conn);
    } else {
      setConnection(null);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const connectionId = await NangoClient.connectXero();
      const newConnection = NangoClient.getXeroConnection();

      setConnection(newConnection);
      setSuccess(`✅ Successfully connected to ${newConnection?.organizationName || 'Xero'}!`);

      // Notify parent
      if (onConnectionChange && newConnection) {
        onConnectionChange(newConnection);
      }

      // Auto-close success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Xero');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Xero? Existing imported invoices will remain, but you won\'t be able to import new ones.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);

    try {
      await NangoClient.disconnectXero();
      setConnection(null);
      setSuccess('✅ Disconnected from Xero');

      // Notify parent
      if (onConnectionChange) {
        onConnectionChange(null);
      }

      // Auto-close success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleImport = () => {
    if (!connection) {
      setError('Please connect to Xero first');
      return;
    }

    onImportClick();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-serif">Accounting Integration</h2>
            <p className="text-sm text-slate-500 mt-1">Connect your accounting system to import overdue invoices</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
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

          {/* Xero Integration Card */}
          <div className={`border-2 rounded-xl p-6 transition-all ${
            connection ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Xero Logo */}
                <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                  X
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Xero</h3>
                  <p className="text-sm text-slate-600">Accounting software</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                connection
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connection ? 'bg-green-500' : 'bg-slate-400'
                }`} />
                {connection ? 'Connected' : 'Not Connected'}
              </div>
            </div>

            {/* Connection Details (if connected) */}
            {connection && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-green-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Organization:</span>
                  <span className="font-medium text-slate-900">{connection.organizationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Connected:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(connection.connectedAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
                {connection.lastSyncAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Last sync:</span>
                    <span className="font-medium text-slate-900">
                      {new Date(connection.lastSyncAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {connection ? (
                <>
                  <button
                    onClick={handleImport}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Import Invoices
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDisconnecting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Connecting to Xero...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Connect Xero
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Help Text */}
            {!connection && (
              <p className="mt-4 text-xs text-slate-500 text-center">
                A popup window will open for you to authorize ClaimCraft to read your Xero invoices
              </p>
            )}
          </div>

          {/* Coming Soon */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Coming Soon</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'QuickBooks', color: 'bg-green-600' },
                { name: 'FreeAgent', color: 'bg-purple-600' },
                { name: 'Sage', color: 'bg-teal-600' }
              ].map(platform => (
                <div
                  key={platform.name}
                  className="border border-slate-200 rounded-lg p-4 text-center opacity-60 cursor-not-allowed"
                >
                  <div className={`w-10 h-10 ${platform.color} rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold`}>
                    {platform.name[0]}
                  </div>
                  <p className="text-xs font-medium text-slate-600">{platform.name}</p>
                </div>
              ))}
            </div>
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
            className="w-full px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
