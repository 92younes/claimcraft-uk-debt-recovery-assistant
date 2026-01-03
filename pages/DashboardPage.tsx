import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';
import { useClaimStore } from '../store/claimStore';
import { CsvImportModal } from '../components/CsvImportModal';
import { AccountingIntegration } from '../components/AccountingIntegration';
import { XeroInvoiceImporter } from '../components/XeroInvoiceImporter';
import { profileToClaimantParty } from '../services/userProfileService';
import {
  exportAllUserData,
  deleteAllUserData,
  saveClaimToStorage,
  getStoredClaims,
  deleteDeadlinesForClaim,
  deleteClaimFromStorage
} from '../services/storageService';
import { ClaimState, Step, INITIAL_PARTY, AccountingConnection } from '../types';
import { getTodayISO } from '../utils/formatters';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const {
    dashboardClaims,
    setDashboardClaims,
    setClaimData,
    createNewClaim,
    setStep,
    userProfile,
    setUserProfile,
    deadlines,
    accountingConnection,
    setAccountingConnection,
    completeDeadline,
    isLoading
  } = useClaimStore();

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showXeroImporter, setShowXeroImporter] = useState(false); 

  const handleStartNewClaim = () => {
      createNewClaim();
      navigate('/conversation');
  };

  const handleResumeClaim = (claim: ClaimState) => {
      setClaimData(claim);
      // Navigate to claim overview page instead of directly to wizard
      navigate('/claim-overview');
  };

  const handleDeleteClaim = async (id: string) => {
      await deleteDeadlinesForClaim(id);
      await deleteClaimFromStorage(id);
      const claims = await getStoredClaims();
      setDashboardClaims(claims);
  };

  const handleUpdateClaim = async (claim: ClaimState) => {
      await saveClaimToStorage(claim);
      const claims = await getStoredClaims();
      setDashboardClaims(claims);
  };

  const handleExportAllData = async () => {
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

  const handleDeleteAllData = async () => {
      if (window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
          await deleteAllUserData();
          setDashboardClaims([]);
          setUserProfile(null);  // Clear user profile from store
          navigate('/');
      }
  };

  const handleDeadlineClick = (deadline: import('../types').Deadline) => {
    const claim = dashboardClaims.find(c => c.id === deadline.claimId);
    if (claim) {
      setClaimData(claim);
      // Navigate to claim overview page
      navigate('/claim-overview');
    }
  };

  return (
    <>
      <Dashboard
        claims={dashboardClaims}
        isLoading={isLoading}
        onCreateNew={handleStartNewClaim}
        onResume={handleResumeClaim}
        onDelete={handleDeleteClaim}
        onUpdateClaim={handleUpdateClaim}
        onImportCsv={() => setShowCsvModal(true)}
        accountingConnection={accountingConnection}
        onConnectAccounting={() => setShowAccountingModal(true)}
        onExportAllData={handleExportAllData}
        onDeleteAllData={handleDeleteAllData}
        deadlines={deadlines}
        onDeadlineClick={handleDeadlineClick}
        onCompleteDeadline={completeDeadline}
        onViewAllDeadlines={() => navigate('/calendar')}
      />
      
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onImport={async (claims) => {
            for (const claim of claims) {
                await saveClaimToStorage(claim);
            }
            const stored = await getStoredClaims();
            setDashboardClaims(stored);
            setShowCsvModal(false);
        }}
        defaultClaimant={
          userProfile
            ? profileToClaimantParty(userProfile)
            : undefined
        }
      />
      
      <AccountingIntegration
        isOpen={showAccountingModal}
        onClose={() => setShowAccountingModal(false)}
        onImportClick={() => {
          setShowAccountingModal(false);
          setShowXeroImporter(true);
        }}
        onConnectionChange={(connection) => setAccountingConnection(connection)}
      />

      <XeroInvoiceImporter
        isOpen={showXeroImporter}
        onClose={() => setShowXeroImporter(false)}
        existingClaims={dashboardClaims} // Prevent duplicate imports
        onImport={async (claims) => {
             for (const claim of claims) {
                await saveClaimToStorage(claim);
            }
            const stored = await getStoredClaims();
            setDashboardClaims(stored);
            setShowXeroImporter(false);
            
            // Show success feedback
            // Ideally use a Toast component here, but alert is better than nothing for now
            setTimeout(() => {
                alert(`Successfully imported ${claims.length} invoices as new claims!`);
            }, 300);
        }}
        claimant={
          userProfile
            ? profileToClaimantParty(userProfile)
            : (dashboardClaims[0]?.claimant || { ...INITIAL_PARTY })
        }
      />
    </>
  );
};

