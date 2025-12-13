/**
 * SettingsPage Component
 *
 * Allows users to view and edit their profile after initial onboarding.
 * This is a real settings hub. The OnboardingFlow is reserved for pre-acceptance onboarding.
 */

import React from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, Settings, User, Database } from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ProfileSettingsForm } from '../components/settings/ProfileSettingsForm';
import { DataSettings } from '../components/settings/DataSettings';

interface SettingsPageProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => Promise<void>;
  onBack: () => void;
  onExportAllData: () => void | Promise<void>;
  onDeleteAllData: () => void | Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  onSave,
  onBack,
  onExportAllData,
  onDeleteAllData,
}) => {
  const [tab, setTab] = React.useState<'profile' | 'data'>('profile');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-600" />
              <h1 className="text-lg font-bold text-slate-900">Account Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left navigation */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{profile.businessName || 'Your account'}</div>
                  <div className="text-xs text-slate-500 truncate">{profile.email || 'Local profile'}</div>
                </div>
              </div>

              <div className="mt-5">
                <SegmentedControl
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'profile', label: 'Profile' },
                    { value: 'data', label: 'Data' },
                  ]}
                />
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Storage
                  </span>
                  <span className="text-slate-700 font-medium">Local</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main panel */}
          <section className="flex-1 min-w-0">
            {tab === 'profile' && <ProfileSettingsForm profile={profile} onSave={onSave} />}
            {tab === 'data' && (
              <DataSettings
                onExportAllData={onExportAllData}
                onDeleteAllData={onDeleteAllData}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
