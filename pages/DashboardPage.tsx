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
import { ClaimState, Step, INITIAL_PARTY } from '../types';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { 
    dashboardClaims, 
    setDashboardClaims, 
    setClaimData, 
    createNewClaim,
    setStep,
    userProfile
  } = useClaimStore();

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [showXeroImporter, setShowXeroImporter] = useState(false);
  const [accountingConnection, setAccountingConnection] = useState<any>(null); 

  const handleStartNewClaim = () => {
      createNewClaim();
      navigate('/conversation');
  };

  const handleResumeClaim = (claim: ClaimState) => {
      setClaimData(claim);
      // Determine resume step logic (simplified)
      let resumeStep: Step = Step.EVIDENCE;

      // If it has a generated document, resume at Draft unless it's already finalized/sent
      if (claim.status === 'sent' || claim.status === 'court' || claim.status === 'judgment') {
        resumeStep = Step.REVIEW;
      } else if (claim.generated) {
        resumeStep = Step.DRAFT;
      } else if (claim.selectedDocType) {
        resumeStep = Step.STRATEGY;
      } else if (claim.assessment) {
        resumeStep = Step.VERIFY;
      } else {
        resumeStep = Step.EVIDENCE;
      }
      
      setStep(resumeStep); 
      navigate('/wizard');
  };

  const handleDeleteClaim = async (id: string) => {
      await deleteDeadlinesForClaim(id);
      await deleteClaimFromStorage(id);
      const claims = await getStoredClaims();
      setDashboardClaims(claims);
  };

  const handleExportAllData = async () => {
      try {
        const blob = await exportAllUserData();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `claimcraft-backup-${new Date().toISOString().split('T')[0]}.json`;
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
          navigate('/');
      }
  };

  return (
    <>
      <Dashboard
        claims={dashboardClaims}
        onCreateNew={handleStartNewClaim}
        onResume={handleResumeClaim}
        onDelete={handleDeleteClaim}
        onImportCsv={() => setShowCsvModal(true)}
        accountingConnection={accountingConnection}
        onConnectAccounting={() => setShowAccountingModal(true)}
        onExportAllData={handleExportAllData}
        onDeleteAllData={handleDeleteAllData}
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
      />
      
      <AccountingIntegration
        isOpen={showAccountingModal}
        onClose={() => setShowAccountingModal(false)}
        onImportClick={() => {
          setShowAccountingModal(false);
          setShowXeroImporter(true);
        }}
        onConnectionChange={setAccountingConnection}
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

