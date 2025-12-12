/**
 * EvidenceLibrary Component
 *
 * Centralized view of all evidence files across all claims.
 * Provides search and filter capabilities.
 */

import React, { useState, useMemo } from 'react';
import { ClaimState, EvidenceFile } from '../types';
import { FileText, Search, Filter, Image, File, X } from 'lucide-react';
import { Input, Select } from './ui/Input';
import { Button } from './ui/Button';

interface EvidenceWithClaim extends EvidenceFile {
  claimId: string;
  debtorName: string;
  invoiceNumber: string;
}

interface EvidenceLibraryProps {
  claims: ClaimState[];
  onViewClaim: (claimId: string) => void;
}

export const EvidenceLibrary: React.FC<EvidenceLibraryProps> = ({ claims, onViewClaim }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Aggregate all evidence from all claims
  const allEvidence = useMemo(() => {
    const evidence: EvidenceWithClaim[] = [];
    claims.forEach(claim => {
      if (claim.evidence && claim.evidence.length > 0) {
        claim.evidence.forEach(file => {
          evidence.push({
            ...file,
            claimId: claim.id,
            debtorName: claim.defendant?.name || 'Unknown Debtor',
            invoiceNumber: claim.invoice?.invoiceNumber || claim.id
          });
        });
      }
    });
    return evidence;
  }, [claims]);

  // Filter evidence
  const filteredEvidence = useMemo(() => {
    return allEvidence.filter(file => {
      const matchesSearch = search === '' ||
        file.name.toLowerCase().includes(search.toLowerCase()) ||
        file.debtorName.toLowerCase().includes(search.toLowerCase()) ||
        (file.classification && file.classification.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === 'all' ||
        file.classification === filterType ||
        (filterType === 'pdf' && file.type.includes('pdf')) ||
        (filterType === 'image' && file.type.includes('image'));
      return matchesSearch && matchesType;
    });
  }, [allEvidence, search, filterType]);

  // Get unique classifications for filter
  const classifications = useMemo(() => {
    const types = new Set<string>();
    allEvidence.forEach(f => {
      if (f.classification) types.add(f.classification);
    });
    return Array.from(types);
  }, [allEvidence]);

  // Get file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (mimeType.includes('image')) {
      return <Image className="w-8 h-8 text-teal-600" />;
    }
    return <File className="w-8 h-8 text-slate-500" />;
  };

  if (allEvidence.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Evidence Files</h3>
        <p className="text-slate-500 text-sm">
          Evidence uploaded to your claims will appear here for easy access across all your cases.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Evidence Library</h2>
          <p className="text-sm text-slate-500 mt-1">All documents across your claims</p>
        </div>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {filteredEvidence.length} file{filteredEvidence.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            label="Search evidence"
            hideLabel
            noMargin
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename, debtor, or type..."
            icon={<Search className="w-4 h-4" />}
            className="py-2.5"
          />
        </div>
        <div className="relative">
          <Select
            label="Filter by type"
            hideLabel
            noMargin
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={[
              { value: 'all', label: 'All Types' },
              ...classifications.map((c) => ({ value: c, label: c })),
              { value: 'pdf', label: 'PDF Files' },
              { value: 'image', label: 'Images' },
            ]}
            className="pl-10 pr-10 py-2.5 appearance-none cursor-pointer min-w-[170px] rounded-xl"
          />
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEvidence.map((file, idx) => (
          <div
            key={`${file.claimId}-${idx}`}
            className="border border-slate-200 rounded-xl p-4 hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => onViewClaim(file.claimId)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getFileIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate group-hover:text-teal-700 transition-colors">
                  {file.name}
                </p>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {file.debtorName}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {file.classification && (
                    <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">
                      {file.classification}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    #{file.invoiceNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvidence.length === 0 && allEvidence.length > 0 && (
        <div className="text-center py-12 text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No files match your search criteria</p>
          <div className="mt-3 flex justify-center">
            <Button
              variant="link"
              onClick={() => { setSearch(''); setFilterType('all'); }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
