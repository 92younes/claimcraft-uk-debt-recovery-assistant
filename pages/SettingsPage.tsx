/**
 * SettingsPage Component
 *
 * Allows users to view and edit their profile after initial onboarding.
 * This is a real settings hub. The OnboardingFlow is reserved for pre-acceptance onboarding.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { Settings, User, Database, AlertTriangle } from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ProfileSettingsForm } from '../components/settings/ProfileSettingsForm';
import { DataSettings } from '../components/settings/DataSettings';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useClaimStore } from '../store/claimStore';
import { exportAllUserData, deleteAllUserData } from '../services/storageService';
import { getTodayISO } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, saveUserProfile, setDashboardClaims } = useClaimStore();
  const [tab, setTab] = useState<'profile' | 'data'>('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Redirect if no profile (guard handled by DashboardLayout, but defensive)
  if (!userProfile) {
    return null;
  }

  const profile = userProfile;

  const onSave = async (updatedProfile: UserProfile) => {
    await saveUserProfile(updatedProfile);
  };

  const onExportAllData = async () => {
    try {
      const blob = await exportAllUserData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `claimcraft-backup-${getTodayISO()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data.');
    }
  };

  const onDeleteAllData = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    await deleteAllUserData();
    setDashboardClaims([]);
    setShowDeleteModal(false);
    navigate('/');
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        </div>
        <p className="text-slate-500 mt-1">Manage your profile and data preferences</p>
      </div>

      {/* Content */}
      <div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left navigation */}
          <aside className="lg:w-64 flex-shrink-0">
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

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <div className="text-center p-2">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Delete All Data?</h3>
          <p className="text-slate-600 mb-6">
            This will permanently remove all claims, settings, and deadlines from this browser. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete All
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
