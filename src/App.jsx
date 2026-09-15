import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoginScreen from './components/Auth/LoginScreen';
import CalendarView from './components/Calendar/CalendarView';
import DateDetailModal from './components/Calendar/DateDetailModal';
import EntryWizardModal from './components/EntryWizard/EntryWizardModal';
import BulkUploadModal from './components/Common/BulkUploadModal';
import RemittanceView from './components/Remittance/RemittanceView';
import { dataService } from './services/dataService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Navigation Tab: 'calendar' | 'remittance'
  const [activeTab, setActiveTab] = useState('calendar');

  // Data Store state
  const [knownAgents, setKnownAgents] = useState([]);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [remittanceEntries, setRemittanceEntries] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal / Interaction states
  const [selectedDateDetail, setSelectedDateDetail] = useState(null);
  const [entryModalState, setEntryModalState] = useState({
    isOpen: false,
    date: new Date().toISOString().split('T')[0],
    entryToEdit: null,
  });

  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [remittanceTargetDate, setRemittanceTargetDate] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 1. Initial auth check
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await dataService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch all required data
  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const [fetchedKnownAgents, fetchedEntries, fetchedRemittances] = await Promise.all([
        dataService.getKnownAgents(),
        dataService.getDailyEntries(),
        dataService.getRemittanceEntries(),
      ]);
      setKnownAgents(fetchedKnownAgents);
      setDailyEntries(fetchedEntries);
      setRemittanceEntries(fetchedRemittances);
    } catch (err) {
      console.error('Failed to load hub data:', err);
      addToast('Failed to sync latest hub data', 'error');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Auth actions
  const handleLogin = async (username, password) => {
    const loggedInUser = await dataService.login(username, password);
    setUser(loggedInUser);
    addToast(`Welcome, ${loggedInUser.name || 'Hub Manager'}!`);
  };

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
    addToast('Signed out of Varanasi Hub');
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all Varanasi Hub data back to original seed data?')) {
      dataService.resetToMockData();
      loadData();
      addToast('Data successfully reset to initial Varanasi Hub seed');
    }
  };

  // Entry Modal actions (Open new or Edit existing)
  const handleOpenEntryModal = (date, entryToEdit = null) => {
    setEntryModalState({
      isOpen: true,
      date: date || new Date().toISOString().split('T')[0],
      entryToEdit,
    });
  };

  const handleCloseEntryModal = () => {
    setEntryModalState({ isOpen: false, date: null, entryToEdit: null });
  };

  const handleSaveDailyEntry = async (entryData) => {
    const isEdit = Boolean(entryData.id);
    await dataService.saveDailyEntry(entryData);
    await loadData();
    addToast(isEdit ? `Shift entry for ${entryData.agent_name} updated!` : `Shift entry for ${entryData.agent_name} saved!`);
  };

  const handleDeleteDailyEntry = async (entryId) => {
    if (window.confirm('Are you sure you want to delete this shift reconciliation entry?')) {
      await dataService.deleteDailyEntry(entryId);
      await loadData();
      addToast('Entry removed from shift records');
    }
  };

  // Bulk Import
  const handleBulkImport = async (entriesList) => {
    const imported = await dataService.bulkImportDailyEntries(entriesList);
    await loadData();
    addToast(`Successfully imported ${imported.length} shift entries!`);
  };

  // Remittance actions
  const handleSaveRemittance = async (remittanceData) => {
    await dataService.saveRemittanceEntry(remittanceData);
    await loadData();
    addToast('Bank remittance entry recorded successfully');
  };

  // Handle navigate from Date Detail to Remittance
  const handleGoToRemittance = (dateStr) => {
    setRemittanceTargetDate(dateStr);
    setActiveTab('remittance');
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Loading Varanasi Hub Console...</p>
        </div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  const activeDateEntries = selectedDateDetail 
    ? dailyEntries.filter(e => e.entry_date === selectedDateDetail)
    : [];

  return (
    <div className="app-container">
      {/* Dark Navy Header */}
      <Header
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onResetDemoData={handleResetDemoData}
        onOpenBulkUpload={() => setShowBulkUpload(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {activeTab === 'calendar' && (
          <CalendarView
            dailyEntries={dailyEntries}
            currentDate={selectedDateDetail}
            onSelectDate={dateStr => setSelectedDateDetail(dateStr)}
            onOpenWizard={dateStr => handleOpenEntryModal(dateStr)}
          />
        )}

        {activeTab === 'remittance' && (
          <RemittanceView
            dailyEntries={dailyEntries}
            remittanceEntries={remittanceEntries}
            initialSelectedDate={remittanceTargetDate}
            onSaveRemittance={handleSaveRemittance}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Date Detail Modal */}
      {selectedDateDetail && (
        <DateDetailModal
          dateStr={selectedDateDetail}
          entries={activeDateEntries}
          onClose={() => setSelectedDateDetail(null)}
          onAddAgentEntry={dateStr => {
            handleOpenEntryModal(dateStr);
          }}
          onEditEntry={entry => {
            handleOpenEntryModal(entry.entry_date, entry);
          }}
          onDeleteEntry={handleDeleteDailyEntry}
          onGoToRemittance={handleGoToRemittance}
        />
      )}

      {/* Single-Flow Shift Entry & Edit Modal */}
      {entryModalState.isOpen && (
        <EntryWizardModal
          initialDate={entryModalState.date}
          entryToEdit={entryModalState.entryToEdit}
          knownAgents={knownAgents}
          onClose={handleCloseEntryModal}
          onSave={handleSaveDailyEntry}
        />
      )}

      {/* Bulk Upload CSV Modal */}
      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onImportSuccess={handleBulkImport}
        />
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
