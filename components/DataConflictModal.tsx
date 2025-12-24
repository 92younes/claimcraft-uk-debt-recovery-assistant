/**
 * DataConflictModal Component
 *
 * Shown when chat-extracted claimant data differs from user profile data.
 * Allows user to choose which data to use.
 */

import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Party } from '../types';
import { AlertTriangle, User, MessageSquare, Building2, MapPin, Mail, Phone, CheckCircle2 } from 'lucide-react';

interface DataConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: Party;
  chatData: Partial<Party>;
  onSelectProfile: () => void;
  onSelectChat: () => void;
}

// Helper to check if two values differ meaningfully
const valuesDiffer = (a?: string, b?: string): boolean => {
  if (!a && !b) return false;
  if (!a || !b) return true;
  return a.trim().toLowerCase() !== b.trim().toLowerCase();
};

// Helper to format address for display
const formatAddress = (party: Partial<Party>): string => {
  const parts = [
    party.address,
    party.city,
    party.county,
    party.postcode
  ].filter(Boolean);
  return parts.join(', ') || 'Not provided';
};

export const DataConflictModal: React.FC<DataConflictModalProps> = ({
  isOpen,
  onClose,
  profileData,
  chatData,
  onSelectProfile,
  onSelectChat
}) => {
  // Determine which fields differ
  const nameDiffers = valuesDiffer(profileData.name, chatData.name);
  const addressDiffers = valuesDiffer(profileData.address, chatData.address) ||
    valuesDiffer(profileData.city, chatData.city) ||
    valuesDiffer(profileData.postcode, chatData.postcode);
  const emailDiffers = valuesDiffer(profileData.email, chatData.email);
  const phoneDiffers = valuesDiffer(profileData.phone, chatData.phone);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Different Claimant Details Detected"
      description="The details you provided in the chat differ from your saved profile. Which should we use?"
      titleIcon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
      maxWidthClassName="max-w-lg"
      closeOnOverlayClick={false}
    >
      <div className="space-y-4">
        {/* Comparison Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Profile Data Card */}
          <div
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 cursor-pointer transition-all group"
            onClick={onSelectProfile}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Your Profile</p>
                <p className="text-xs text-slate-500">Saved during setup</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className={`flex items-start gap-2 ${nameDiffers ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{profileData.name || 'Not set'}</span>
              </div>

              <div className={`flex items-start gap-2 ${addressDiffers ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{formatAddress(profileData)}</span>
              </div>

              {profileData.email && (
                <div className={`flex items-start gap-2 ${emailDiffers ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{profileData.email}</span>
                </div>
              )}

              {profileData.phone && (
                <div className={`flex items-start gap-2 ${phoneDiffers ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{profileData.phone}</span>
                </div>
              )}
            </div>

            <Button
              onClick={(e) => { e.stopPropagation(); onSelectProfile(); }}
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Use Profile
            </Button>
          </div>

          {/* Chat Data Card */}
          <div
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 cursor-pointer transition-all group"
            onClick={onSelectChat}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">From Chat</p>
                <p className="text-xs text-slate-500">Extracted from conversation</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className={`flex items-start gap-2 ${nameDiffers ? 'bg-teal-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{chatData.name || 'Not provided'}</span>
              </div>

              <div className={`flex items-start gap-2 ${addressDiffers ? 'bg-teal-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">{formatAddress(chatData)}</span>
              </div>

              {chatData.email && (
                <div className={`flex items-start gap-2 ${emailDiffers ? 'bg-teal-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{chatData.email}</span>
                </div>
              )}

              {chatData.phone && (
                <div className={`flex items-start gap-2 ${phoneDiffers ? 'bg-teal-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{chatData.phone}</span>
                </div>
              )}
            </div>

            <Button
              onClick={(e) => { e.stopPropagation(); onSelectChat(); }}
              variant="primary"
              size="sm"
              className="w-full mt-4"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Use Chat Data
            </Button>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          <p>
            <strong>Note:</strong> You can always edit these details in the verification step.
            The selected data will be used as the starting point for your claim.
          </p>
        </div>
      </div>
    </Modal>
  );
};
