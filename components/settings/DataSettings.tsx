import React from 'react';
import { Button } from '../ui/Button';
import { Download, Trash2 } from 'lucide-react';

interface DataSettingsProps {
  onExportAllData: () => void | Promise<void>;
  onDeleteAllData: () => void | Promise<void>;
}

export const DataSettings: React.FC<DataSettingsProps> = ({ onExportAllData, onDeleteAllData }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="p-6 lg:p-8 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Data</h2>
        <p className="text-sm text-slate-500 mt-1">Export or delete your locally stored ClaimCraft data.</p>
      </div>

      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Export all data</h3>
            <p className="text-sm text-slate-500 mt-1">Download a JSON backup of claims and settings.</p>
          </div>
          <Button variant="secondary" onClick={onExportAllData} icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-red-50/40 border border-red-200">
          <div>
            <h3 className="font-semibold text-slate-900">Delete all data</h3>
            <p className="text-sm text-slate-600 mt-1">
              Permanently removes all claims and settings from this browser.
            </p>
          </div>
          <Button variant="danger" onClick={onDeleteAllData} icon={<Trash2 className="w-4 h-4" />}>
            Delete all
          </Button>
        </div>
      </div>
    </div>
  );
};







