
import React, { useState, useEffect } from 'react';
import { X, Lock, Check, Search, FileText, LogOut, Loader2, Zap } from 'lucide-react';
import { getStoredAuth, storeAuth, clearAuth, fetchXeroInvoices, mapXeroToClaim, XeroAuth } from '../services/xeroService';
import { ClaimState } from '../types';

interface XeroConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: Partial<ClaimState>) => void;
}

export const XeroConnectModal: React.FC<XeroConnectModalProps> = ({ isOpen, onClose, onImport }) => {
  const [auth, setAuth] = useState<XeroAuth | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  // Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAuth();
      setAuth(stored);
      if (stored) {
        loadInvoices();
      }
    }
  }, [isOpen]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await fetchXeroInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth handshake
    setTimeout(() => {
      storeAuth(clientId, clientSecret, tenantId || 'demo-tenant');
      setAuth(getStoredAuth());
      loadInvoices();
      setLoading(false);
    }, 1500);
  };

  const handleDemoConnect = () => {
      setLoading(true);
      // Simulate a fast demo connection
      setTimeout(() => {
        storeAuth('demo-client-id', 'demo-secret', 'demo-tenant');
        setAuth(getStoredAuth());
        loadInvoices();
        setLoading(false);
      }, 800);
  };

  const handleDisconnect = () => {
    clearAuth();
    setAuth(null);
    setInvoices([]);
    setClientId('');
    setClientSecret('');
  };

  const handleSelectInvoice = (inv: any) => {
    if (importing) return;
    setImporting(true);
    
    // Simulate processing delay for better UX
    setTimeout(() => {
        const mappedData = mapXeroToClaim(inv, auth?.orgName || 'My Company');
        onImport(mappedData);
        setImporting(false);
        onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#13b5ea] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-lg">
               <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-bold text-lg">Connect to Xero</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow relative">
          {/* Importing Overlay */}
          {importing && (
             <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                <Loader2 className="w-10 h-10 text-[#13b5ea] animate-spin mb-3" />
                <p className="font-bold text-slate-700">Importing Invoice Data...</p>
             </div>
          )}

          {!auth ? (
            /* Connection Form */
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-sm">
                   <Lock className="w-8 h-8 text-[#13b5ea]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Secure Connection</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  Connect your Xero account to instantly import unpaid invoices and draft claims.
                </p>
              </div>

              <form onSubmit={handleConnect} className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client ID</label>
                  <input 
                    type="text" 
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#13b5ea] focus:outline-none transition-all"
                    placeholder="Enter Xero Client ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Secret</label>
                  <input 
                    type="password" 
                    required
                    value={clientSecret}
                    onChange={e => setClientSecret(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#13b5ea] focus:outline-none transition-all"
                    placeholder="••••••••••••••••"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#13b5ea] hover:bg-[#0fa0cf] text-white font-bold py-3 rounded-lg shadow transition-all flex justify-center items-center gap-2 mt-4"
                >
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Connect & Fetch Invoices"}
                </button>
              </form>

              <div className="relative my-6">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                 <div className="relative flex justify-center"><span className="px-2 bg-white text-xs text-slate-400 uppercase">Or try demo</span></div>
              </div>

              <div className="max-w-md mx-auto">
                 <button 
                    onClick={handleDemoConnect}
                    disabled={loading}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2 border border-slate-200"
                 >
                    <Zap className="w-4 h-4 text-amber-500" /> Use Demo Account
                 </button>
              </div>
            </div>
          ) : (
            /* Invoice List */
            <div>
              <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Connected Organization</h3>
                  <p className="text-xs text-green-600 flex items-center gap-1 font-medium mt-0.5">
                    <Check className="w-3 h-3" /> {auth.orgName}
                  </p>
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-3 h-3" /> Disconnect
                </button>
              </div>

              <h3 className="font-bold text-slate-900 mb-4 px-1">Select an Unpaid Invoice</h3>

              {loading ? (
                 <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#13b5ea]" />
                    <p className="text-sm text-slate-500">Fetching invoices...</p>
                 </div>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {invoices.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 italic">No unpaid invoices found.</div>
                  ) : (
                      invoices.map((inv) => (
                        <div 
                          key={inv.InvoiceID}
                          onClick={() => handleSelectInvoice(inv)}
                          className="border border-slate-200 rounded-xl p-4 hover:border-[#13b5ea] hover:shadow-md hover:bg-blue-50/50 cursor-pointer transition-all group bg-white relative overflow-hidden"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-bold text-slate-900 group-hover:text-[#13b5ea] transition-colors">{inv.Contact.Name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{inv.InvoiceNumber}</span>
                                 <span className="text-[10px] text-slate-400">{inv.DateString}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block font-bold text-lg font-mono">£{inv.Total.toFixed(2)}</span>
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  new Date(inv.DueDateString) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                              }`}>
                                {new Date(inv.DueDateString) < new Date() ? 'Overdue' : 'Due Soon'}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-end mt-2">
                             <p className="text-xs text-slate-500 truncate max-w-[70%]">{inv.LineItems[0]?.Description}</p>
                             <p className="text-[10px] text-slate-400">Due: {inv.DueDateString}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
