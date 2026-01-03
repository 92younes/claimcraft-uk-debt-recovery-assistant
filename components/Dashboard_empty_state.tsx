import React from 'react';
import {
  Scale,
  Plus,
  Sparkles,
  AlertTriangle,
  FileText,
  CheckCircle2,
  MessageSquareText,
  ArrowRight,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Premium Dashboard Empty State
 *
 * World-class empty state with:
 * - Engaging visual hierarchy
 * - Animated elements
 * - Clear value proposition
 * - Strong call to action
 */

interface DashboardEmptyStateProps {
  onCreateNew: () => void;
}

export const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({ onCreateNew }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft animate-fade-in">
      {/* Welcome Header with animated gradient */}
      <div className="relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative px-8 py-12 text-center border-b border-teal-100/50">
          {/* Logo icon with glow */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-teal-500/30 rounded-2xl blur-xl animate-pulse-soft" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-teal-lg transform hover:scale-105 transition-transform duration-300">
              <Scale className="w-10 h-10 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Welcome to ClaimCraft
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Your AI-powered assistant for UK debt recovery.
            <br />
            <span className="text-teal-600 font-medium">Generate court-ready documents in minutes.</span>
          </p>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4 text-teal-500" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>5-Minute Setup</span>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="px-8 py-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full mb-3">
            <Sparkles className="w-3 h-3" />
            HOW IT WORKS
          </span>
          <h3 className="text-xl font-bold text-slate-900">Three simple steps to recover what you're owed</h3>
        </div>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Connecting line (hidden on mobile) */}
          <div className="absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-blue-200 to-emerald-200 hidden md:block" style={{ left: 'calc(16.67% + 24px)', right: 'calc(16.67% + 24px)' }} />

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="group text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-teal-100 to-teal-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <MessageSquareText className="w-7 h-7 text-teal-600" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-teal-sm">
                  1
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-2 mt-4">Describe Your Claim</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Upload evidence or chat with our AI to extract claim details automatically
              </p>
            </div>

            {/* Step 2 */}
            <div className="group text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <CheckCircle2 className="w-7 h-7 text-blue-600" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  2
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-2 mt-4">Verify & Assess</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Review extracted data and get AI-powered legal strength assessment
              </p>
            </div>

            {/* Step 3 */}
            <div className="group text-center">
              <div className="relative mb-4">
                <div className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-soft">
                  <FileText className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  3
                </div>
              </div>
              <h4 className="font-bold text-slate-900 mb-2 mt-4">Generate Documents</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Get court-ready Letters Before Action or Form N1 claims with interest calculations
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action - Premium gradient card */}
        <div className="mt-10 relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjMCAwLTIgMi0yIDRzMiA0IDIgNCAyLTIgNC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

          <div className="relative px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h4 className="text-xl font-bold text-white mb-2">Ready to get started?</h4>
              <p className="text-teal-100">Create your first claim and recover what you're owed</p>
            </div>
            <Button
              variant="secondary"
              onClick={onCreateNew}
              icon={<Plus className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              size="lg"
              className="shadow-soft-lg hover:shadow-soft-xl whitespace-nowrap"
            >
              Create First Claim
            </Button>
          </div>
        </div>

        {/* Helpful Tips - Premium cards */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="group relative overflow-hidden rounded-xl border border-slate-200 hover:border-blue-200 transition-colors duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="relative flex items-start gap-4 p-5">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h5 className="font-semibold text-slate-900 mb-1">Pro Tip: Upload Evidence</h5>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload invoices, contracts, or emails and our AI will extract details automatically
                </p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-slate-200 hover:border-amber-200 transition-colors duration-200">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="relative flex items-start gap-4 p-5">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h5 className="font-semibold text-slate-900 mb-1">Important: Pre-Action Protocol</h5>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You must send a Letter Before Action 30 days before filing a court claim
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
