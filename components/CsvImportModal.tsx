
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { ClaimState, INITIAL_STATE, PartyType, INITIAL_PARTY, INITIAL_INVOICE } from '../types';
import { getCountyFromPostcode } from '../constants';
import { validateImportedClaim, ImportValidationResult } from '../utils/validation';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (claims: ClaimState[]) => void;
}

interface ParsedClaimWithValidation {
  claim: ClaimState;
  validation: ImportValidationResult;
  rowNumber: number;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedClaims, setParsedClaims] = useState<ParsedClaimWithValidation[]>([]);
  const [skippedRows, setSkippedRows] = useState<{ row: number; reason: string }[]>([]);
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
        const claims: ParsedClaimWithValidation[] = [];

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

        const skipped: { row: number; reason: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (row.length < headers.length / 2) {
              skipped.push({ row: i + 1, reason: 'Row appears empty or malformed' });
              continue;
            }

            const amount = parseFloat(row[idxAmount]?.replace(/[^0-9.]/g, '') || '0');
            if (isNaN(amount) || amount === 0) {
              skipped.push({ row: i + 1, reason: 'Invalid or missing amount' });
              continue;
            }

            const name = row[idxName] || '';

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

            // Calculate overdue status
            const dueDate = idxDue !== -1 ? row[idxDue] : '';
            let status: 'draft' | 'overdue' = 'draft';
            if (dueDate) {
                const today = new Date().toISOString().split('T')[0];
                if (dueDate < today) {
                    status = 'overdue';
                }
            } else if (idxDate !== -1) {
                // If no due date, assume 30 day terms
                const issueDate = new Date(row[idxDate]);
                const impliedDueDate = new Date(issueDate);
                impliedDueDate.setDate(issueDate.getDate() + 30);
                if (impliedDueDate.toISOString().split('T')[0] < new Date().toISOString().split('T')[0]) {
                    status = 'overdue';
                }
            }

            const newClaim: ClaimState = {
                ...INITIAL_STATE,
                id: Math.random().toString(36).substr(2, 9),
                status: status,
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

            // Validate the claim
            const validation = validateImportedClaim({
              defendant: newClaim.defendant,
              claimant: newClaim.claimant,
              invoice: newClaim.invoice
            });

            // If has critical errors, skip the row
            if (!validation.isValid) {
              skipped.push({ row: i + 1, reason: validation.errors.join('; ') });
              continue;
            }

            claims.push({ claim: newClaim, validation, rowNumber: i + 1 });
        }

        setSkippedRows(skipped);
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
    // Extract just the claims from the validation wrapper
    const claimsToImport = parsedClaims.map(p => p.claim);
    onImport(claimsToImport);
    setParsedClaims([]);
    setSkippedRows([]);
    setError(null);
    onClose();
  };

  const totalWarnings = parsedClaims.reduce((acc, p) => acc + p.validation.warnings.length, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Claims (CSV)"
      description="Bulk create drafts from a spreadsheet."
      maxWidthClassName="max-w-2xl"
      bodyClassName="p-0"
      titleIcon={(
        <div className="bg-teal-50 p-2 rounded-xl">
          <FileSpreadsheet className="w-6 h-6 text-teal-600" />
        </div>
      )}
    >
      <div className="p-6 md:p-8">
            {!parsedClaims.length ? (
                <>
                    <div
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 mb-6 ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-teal-500">
                            {parsing ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                        </div>
                        <p className="text-lg font-bold text-slate-900 mb-1">
                            {parsing ? "Parsing CSV..." : "Drag & Drop CSV file here"}
                        </p>
                        <p className="text-sm text-slate-500 mb-6">or click to browse your computer</p>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            disabled={parsing}
                        />
                        <div className="flex justify-center">
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={parsing}
                          >
                            Select File
                          </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                            <Download className="w-4 h-4 text-teal-500" /> Need a template?
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">Download our standard CSV template to ensure your columns are mapped correctly.</p>
                        <Button variant="link" onClick={downloadTemplate}>
                          Download Template.csv
                        </Button>
                    </div>
                </>
            ) : (
                <div className="text-center">
                    <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-teal-500">
                        <Check className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Import</h3>
                    <p className="text-slate-500 mb-4">
                        We successfully parsed <strong className="text-slate-900">{parsedClaims.length}</strong> claims from your file.
                    </p>

                    {/* Skipped rows warning */}
                    {skippedRows.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <h4 className="font-bold text-red-900 text-sm">
                            {skippedRows.length} row(s) skipped due to errors
                          </h4>
                        </div>
                        <div className="max-h-[80px] overflow-y-auto">
                          <ul className="text-xs text-red-800 space-y-1">
                            {skippedRows.slice(0, 5).map((s, i) => (
                              <li key={i}>Row {s.row}: {s.reason}</li>
                            ))}
                            {skippedRows.length > 5 && (
                              <li className="text-red-600 font-medium">
                                ...and {skippedRows.length - 5} more
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Warnings summary */}
                    {totalWarnings > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <h4 className="font-bold text-amber-900 text-sm">
                            {totalWarnings} validation warning(s) detected
                          </h4>
                        </div>
                        <p className="text-xs text-amber-800">
                          Some claims have minor issues (e.g., missing postcodes, no invoice number).
                          You can still import them but should review and complete the data.
                        </p>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-8 max-h-[200px] overflow-y-auto text-left">
                        <table className="w-full text-xs text-slate-600">
                            <thead className="border-b border-slate-200 font-bold text-slate-900">
                                <tr>
                                    <th className="pb-2 pl-2">Invoice</th>
                                    <th className="pb-2">Debtor</th>
                                    <th className="pb-2 text-right pr-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedClaims.map((p, i) => (
                                    <tr key={i} className={`border-b border-slate-100 last:border-0 ${p.validation.warnings.length > 0 ? 'bg-amber-50/50' : ''}`}>
                                        <td className="py-2 pl-2 font-mono">{p.claim.invoice.invoiceNumber}</td>
                                        <td className="py-2">
                                          {p.claim.defendant.name}
                                          {p.validation.warnings.length > 0 && (
                                            <span className="ml-1 text-amber-600" title={p.validation.warnings.join(', ')}>
                                              <AlertTriangle className="w-3 h-3 inline" />
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 text-right pr-2 font-bold text-teal-600 font-mono">£{p.claim.invoice.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={() => { setParsedClaims([]); setSkippedRows([]); setError(null); }}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFinalize}
                            disabled={parsedClaims.length === 0}
                            className="flex-1"
                        >
                            Import {parsedClaims.length} Claim{parsedClaims.length !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
            )}
      </div>
    </Modal>
  );
};
