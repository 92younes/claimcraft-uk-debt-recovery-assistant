import React from 'react';
import { Scale, Plus, Sparkles, AlertTriangle, FileText, CheckCircle2, MessageSquareText } from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardEmptyStateProps {
  onCreateNew: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({ onCreateNew }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border-b border-teal-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-4 shadow-lg shadow-teal-500/30">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to ClaimCraft</h2>
        <p className="text-slate-600 max-w-lg mx-auto">
          Your AI-powered assistant for UK debt recovery. Generate court-ready documents in minutes.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-6 text-center">How it works</h3>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <MessageSquareText className="w-6 h-6 text-teal-600" />
            </div>
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-sm font-bold">1</div>
            <h4 className="font-semibold text-slate-900 mb-2">Describe Your Claim</h4>
            <p className="text-sm text-slate-600">Upload evidence or chat with our AI to extract claim details automatically</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-sm font-bold">2</div>
            <h4 className="font-semibold text-slate-900 mb-2">Verify & Assess</h4>
            <p className="text-sm text-slate-600">Review extracted data and get AI-powered legal strength assessment</p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-sm font-bold">3</div>
            <h4 className="font-semibold text-slate-900 mb-2">Generate Documents</h4>
            <p className="text-sm text-slate-600">Get court-ready Letters Before Action or Form N1 claims with interest calculations</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h4 className="font-semibold text-slate-900 mb-1">Ready to get started?</h4>
              <p className="text-sm text-slate-600">Create your first claim and recover what you're owed</p>
            </div>
            <Button
              variant="primary"
              onClick={onCreateNew}
              icon={<Plus className="w-4 h-4" />}
              size="lg"
            >
              Create First Claim
            </Button>
          </div>
        </div>

        {/* Helpful Tips */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50/30 rounded-lg border border-slate-200 border-l-4 border-l-blue-500">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-slate-900 text-sm mb-1">Pro Tip: Upload Evidence</h5>
              <p className="text-xs text-slate-600">Upload invoices, contracts, or emails and our AI will extract details automatically</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-50/30 rounded-lg border border-slate-200 border-l-4 border-l-amber-500">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-slate-900 text-sm mb-1">Important: Pre-Action Protocol</h5>
              <p className="text-xs text-slate-600">You must send a Letter Before Action 30 days before filing a court claim</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
