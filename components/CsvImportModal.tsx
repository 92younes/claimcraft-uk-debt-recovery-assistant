
import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { ClaimState, INITIAL_STATE, PartyType, INITIAL_PARTY, INITIAL_INVOICE } from '../types';
import { getCountyFromPostcode } from '../constants';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (claims: ClaimState[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedClaims, setParsedClaims] = useState<ClaimState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'InvoiceNumber',
      'DateIssued (YYYY-MM-DD)',
      'DueDate (YYYY-MM-DD)',
      'TotalAmount',
      'DebtorName',
      'DebtorEmail',
      'DebtorAddress',
      'DebtorCity',
      'DebtorPostcode',
      'DebtorType (Business/Individual)'
    ];
    const example = [
      'INV-001',
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      '1500.00',
      'Acme Corp Ltd',
      'accounts@acme.com',
      '123 Business Park',
      'London',
      'SW1A 1AA',
      'Business'
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + example.join(",");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "claimcraft_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Robust CSV Line Splitter that handles quoted values
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let startValueIndex = 0;
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        let val = line.substring(startValueIndex, i);
        // Remove surrounding quotes
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        result.push(val.trim());
        startValueIndex = i + 1;
      }
    }
    
    // Push last value
    let lastVal = line.substring(startValueIndex);
    if (lastVal.startsWith('"') && lastVal.endsWith('"')) lastVal = lastVal.slice(1, -1);
    result.push(lastVal.trim());
    
    return result;
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }

    setParsing(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        
        if (lines.length < 2) {
            throw new Error("CSV file appears empty or missing headers.");
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const claims: ClaimState[] = [];

        // Helper to find index of column
        const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        
        const idxInvNum = getIdx(['invoicenumber', 'ref', 'inv']);
        const idxDate = getIdx(['dateissued', 'issue', 'date']);
        const idxDue = getIdx(['duedate', 'due']);
        const idxAmount = getIdx(['total', 'amount', 'price']);
        const idxName = getIdx(['debtorname', 'name', 'customer', 'client']);
        const idxEmail = getIdx(['debtoremail', 'email']);
        const idxAddress = getIdx(['debtoraddress', 'address']);
        const idxCity = getIdx(['debtorcity', 'city', 'town']);
        const idxPostcode = getIdx(['debtorpostcode', 'postcode', 'zip']);
        const idxType = getIdx(['debtortype', 'type']);

        if (idxAmount === -1 || idxName === -1) {
            throw new Error("Could not detect required columns: Total Amount or Debtor Name.");
        }

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (row.length < headers.length / 2) continue; // Skip empty-ish rows

            const amount = parseFloat(row[idxAmount]?.replace(/[^0-9.]/g, '') || '0');
            if (isNaN(amount) || amount === 0) continue;

            const name = row[idxName] || 'Unknown Debtor';
            
            // Infer type if missing
            let pType = PartyType.BUSINESS;
            if (idxType !== -1) {
               const val = row[idxType]?.toLowerCase();
               if (val && (val.includes('ind') || val.includes('sole'))) pType = PartyType.INDIVIDUAL;
            } else {
               // Simple heuristic
               if (!name.toLowerCase().includes('ltd') && !name.toLowerCase().includes('plc') && !name.toLowerCase().includes('limited')) {
                  pType = PartyType.INDIVIDUAL;
               }
            }

            // Get postcode and infer county if not provided
            const postcode = idxPostcode !== -1 ? row[idxPostcode] : '';
            const county = postcode ? getCountyFromPostcode(postcode) : '';

            const newClaim: ClaimState = {
                ...INITIAL_STATE,
                id: Math.random().toString(36).substr(2, 9),
                source: 'csv',
                lastModified: Date.now(),
                claimant: { ...INITIAL_PARTY, name: 'Your Company (Edit Later)' }, // Placeholder
                defendant: {
                    ...INITIAL_PARTY,
                    type: pType,
                    name: name,
                    email: idxEmail !== -1 ? row[idxEmail] : '',
                    address: idxAddress !== -1 ? row[idxAddress] : '',
                    city: idxCity !== -1 ? row[idxCity] : '',
                    postcode: postcode,
                    county: county,
                },
                invoice: {
                    ...INITIAL_INVOICE,
                    invoiceNumber: idxInvNum !== -1 ? row[idxInvNum] : `INV-${Math.floor(Math.random()*1000)}`,
                    dateIssued: idxDate !== -1 ? row[idxDate] : new Date().toISOString().split('T')[0],
                    dueDate: idxDue !== -1 ? row[idxDue] : '',
                    totalAmount: amount,
                    description: 'Imported via CSV'
                },
                timeline: [{
                    date: idxDate !== -1 ? row[idxDate] : new Date().toISOString().split('T')[0],
                    description: `Invoice ${idxInvNum !== -1 ? row[idxInvNum] : ''} issued to ${name}`,
                    type: 'invoice'
                }]
            };
            claims.push(newClaim);
        }

        setParsedClaims(claims);
      } catch (err: any) {
        setError(err.message || "Failed to parse CSV");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleFinalize = () => {
    onImport(parsedClaims);
    setParsedClaims([]);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-dark-700 rounded-2xl shadow-dark-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-dark-600">

        <div className="bg-gradient-to-r from-green-600 to-green-700 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="font-bold text-xl">Import Claims (CSV)</h2>
                    <p className="text-xs text-green-100">Bulk create drafts from spreadsheet</p>
                </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-8 overflow-y-auto">
            {!parsedClaims.length ? (
                <>
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 mb-6 ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-dark-500 hover:border-violet-500/50 hover:bg-dark-600'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-400">
                            {parsing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                        </div>
                        <p className="text-lg font-bold text-white mb-1">
                            {parsing ? "Parsing CSV..." : "Drag & Drop CSV file here"}
                        </p>
                        <p className="text-sm text-slate-400 mb-6">or click to browse your computer</p>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            disabled={parsing}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={parsing}
                            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-lg font-bold text-sm hover:from-violet-500 hover:to-violet-400 transition-all duration-200 shadow-glow-sm"
                        >
                            Select File
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/30 mb-6">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="bg-dark-600 rounded-xl p-4 border border-dark-500">
                        <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4 text-violet-400" /> Need a template?
                        </h3>
                        <p className="text-xs text-slate-400 mb-3">Download our standard CSV template to ensure your columns are mapped correctly.</p>
                        <button onClick={downloadTemplate} className="text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
                            Download Template.csv
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Import</h3>
                    <p className="text-slate-400 mb-8">
                        We successfully parsed <strong className="text-white">{parsedClaims.length}</strong> claims from your file.
                    </p>

                    <div className="bg-dark-600 rounded-lg p-4 border border-dark-500 mb-8 max-h-[200px] overflow-y-auto text-left">
                        <table className="w-full text-xs text-slate-300">
                            <thead className="border-b border-dark-500 font-bold text-white">
                                <tr>
                                    <th className="pb-2 pl-2">Invoice</th>
                                    <th className="pb-2">Debtor</th>
                                    <th className="pb-2 text-right pr-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedClaims.map((c, i) => (
                                    <tr key={i} className="border-b border-dark-500 last:border-0">
                                        <td className="py-2 pl-2 font-mono">{c.invoice.invoiceNumber}</td>
                                        <td className="py-2">{c.defendant.name}</td>
                                        <td className="py-2 text-right pr-2 font-bold text-violet-400">£{c.invoice.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setParsedClaims([]); setError(null); }}
                            className="flex-1 py-3 bg-dark-600 border border-dark-500 text-slate-300 font-bold rounded-xl hover:bg-dark-500 transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFinalize}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-violet-500 text-white font-bold rounded-xl hover:from-violet-500 hover:to-violet-400 transition-all duration-200 shadow-glow"
                        >
                            Import All
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
