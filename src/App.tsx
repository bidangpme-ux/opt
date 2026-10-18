import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { ReportsView } from './components/ReportsView';
import { ReportFormView } from './components/ReportFormView';
import { FonnteBotView } from './components/FonnteBotView';
import { BaileysBotView } from './components/BaileysBotView';
import { SpreadsheetsView } from './components/SpreadsheetsView';
import { ExportExcelView } from './components/ExportExcelView';
import { UserManagementView } from './components/UserManagementView';
import { SubdistrictsView } from './components/SubdistrictsView';
import { CommoditiesView } from './components/CommoditiesView';
import { ContactsView } from './components/ContactsView';
import { SmartCornerView } from './components/SmartCornerView';
import { WhatsAppFloatingBot } from './components/WhatsAppFloatingBot';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { AutoLogoutModal } from './components/AutoLogoutModal';
import { useAutoLogout } from './hooks/useAutoLogout';
import { api } from './lib/api';
import { testFirestoreConnection } from './lib/firebase';
import {
  User,
  DashboardStats,
  OPTReport,
  Subdistrict,
  CommodityItem,
  CommodityCategory,
  WhatsAppContact,
  FonnteConfig,
  FonnteLog,
  SpreadsheetConfig,
  SyncLog,
  DEFAULT_ROLE_TABS
} from './types';
import { CheckCircle2, AlertCircle, ShieldAlert, Lock } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Core data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<OPTReport[]>([]);
  const [subdistricts, setSubdistricts] = useState<Subdistrict[]>([]);
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [commodityCategories, setCommodityCategories] = useState<CommodityCategory[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [fonnteConfig, setFonnteConfig] = useState<FonnteConfig | null>(null);
  const [fonnteLogs, setFonnteLogs] = useState<FonnteLog[]>([]);
  const [spreadsheetConfig, setSpreadsheetConfig] = useState<SpreadsheetConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Selected report for modal details
  const [selectedReport, setSelectedReport] = useState<OPTReport | null>(null);
  const [reportStatusFilter, setReportStatusFilter] = useState<string | undefined>(undefined);

  // Syncing state & Toast Notification
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial load
  useEffect(() => {
    // Check Firestore connection as per firebase guidelines
    testFirestoreConnection();

    // Check user auth
    api.auth.getMe()
      .then(res => {
        if (res.authenticated && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsAuthChecking(false);
      });

    // Load initial data
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    setIsSyncing(true);
    try {
      const [
        statsData,
        reportsData,
        subdistrictsData,
        commoditiesData,
        categoriesData,
        contactsData,
        fonnteConf,
        fLogs,
        sheetConf,
        sLogs
      ] = await Promise.all([
        api.stats.get().catch(() => null),
        api.reports.getAll().catch(() => []),
        api.subdistricts.getAll().catch(() => []),
        api.commodities.getAll().catch(() => []),
        api.commodityCategories.getAll().catch(() => []),
        api.contacts.getAll().catch(() => []),
        api.fonnte.getConfig().catch(() => null),
        api.fonnte.getLogs().catch(() => []),
        api.sheets.getConfig().catch(() => null),
        api.sheets.getLogs().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setReports(reportsData);
      setSubdistricts(subdistrictsData);
      setCommodities(commoditiesData);
      setCommodityCategories(categoriesData);
      setContacts(contactsData);
      if (fonnteConf) setFonnteConfig(fonnteConf);
      setFonnteLogs(fLogs);
      if (sheetConf) setSpreadsheetConfig(sheetConf);
      setSyncLogs(sLogs);

      // If user is admin, fetch user list
      api.users.getAll().then(setUsers).catch(() => {});
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Login handlers
  const handleLogin = async (u: string, p: string) => {
    const res = await api.auth.login(u, p);
    setUser(res.user);
    showToast(res.message || `Selamat datang, ${res.user.name}!`);
    refreshAllData();
  };

  const handleLogout = async (isAutoLogout: boolean = false) => {
    try {
      await api.auth.logout();
    } catch (err: any) {
      console.warn('Logout error:', err);
    }
    setUser(null);
    if (isAutoLogout) {
      showToast('Sesi Anda berakhir otomatis karena tidak ada aktivitas selama 15 menit.', 'error');
    } else {
      showToast('Anda telah berhasil logout dari sistem SIGAP-OPT.');
    }
  };

  // Inactivity Auto Logout: Timeout 15 menit tanpa aktivitas dengan peringatan 60 detik
  const {
    showWarning: isAutoLogoutWarningOpen,
    secondsLeft: autoLogoutSecondsLeft,
    extendSession: handleExtendSession,
    logoutNow: handleAutoLogoutNow
  } = useAutoLogout({
    enabled: !!user,
    timeoutMs: 15 * 60 * 1000,
    warningDurationMs: 60 * 1000,
    onLogout: (isAuto) => handleLogout(isAuto)
  });

  const handleQuickLogin = async (username: string) => {
    const passwords: Record<string, string> = {
      admin: 'admin123',
      budi_popt: 'popt123',
      dewi_ppl: 'ppl123'
    };
    try {
      await handleLogin(username, passwords[username] || 'admin123');
    } catch (err: any) {
      showToast(err.message || 'Login demo gagal', 'error');
    }
  };

  // Report Actions
  const handleUpdateReport = async (id: string, data: Partial<OPTReport>) => {
    const res = await api.reports.update(id, data);
    showToast(`Laporan ${res.report.code} berhasil diperbarui & disinkronkan!`);
    await refreshAllData();
  };

  const handleDeleteReport = async (id: string) => {
    const res = await api.reports.delete(id);
    showToast(res.message);
    await refreshAllData();
  };

  const handleCreateReportSuccess = (newReport: OPTReport) => {
    showToast(`Pengaduan baru ${newReport.code} berhasil dicatat & disinkronkan ke Google Sheets!`);
    refreshAllData();
    setActiveTab('reports');
  };

  // Fonnte actions
  const handleSaveFonnteConfig = async (conf: Partial<FonnteConfig>) => {
    const res = await api.fonnte.updateConfig(conf);
    setFonnteConfig(res.config);
    showToast('Konfigurasi Fonnte berhasil disimpan');
  };

  const handleSimulateFonnte = async (phone: string, message: string, name: string) => {
    const res = await api.fonnte.simulate({
      senderPhone: phone,
      message,
      senderName: name
    });
    // Refresh background data as new report or sync could have occurred
    refreshAllData();
    return res.reply;
  };

  // Sheets actions
  const handleSaveSheetsConfig = async (conf: Partial<SpreadsheetConfig>) => {
    const res = await api.sheets.updateConfig(conf);
    setSpreadsheetConfig(res.config);
    showToast('Konfigurasi Google Spreadsheets disimpan');
  };

  const handleSyncNow = async () => {
    const res = await api.sheets.syncNow();
    showToast(res.message);
    await refreshAllData();
  };

  // User Management
  const handleCreateUser = async (data: any) => {
    const res = await api.users.create(data);
    showToast(res.message);
    api.users.getAll().then(setUsers);
  };

  const handleUpdateUser = async (id: string, data: any) => {
    const res = await api.users.update(id, data);
    showToast(res.message);
    if (res.user && user && res.user.id === user.id) {
      setUser(res.user);
    }
    api.users.getAll().then(setUsers);
  };

  const handleDeleteUser = async (id: string) => {
    const res = await api.users.delete(id);
    showToast(res.message);
    api.users.getAll().then(setUsers);
  };

  // Subdistricts Management
  const handleCreateSubdistrict = async (data: Partial<Subdistrict>) => {
    const res = await api.subdistricts.create(data);
    showToast(res.message);
    refreshAllData();
  };

  const handleUpdateSubdistrict = async (id: string, data: Partial<Subdistrict>) => {
    const res = await api.subdistricts.update(id, data);
    showToast(res.message);
    refreshAllData();
  };

  const handleDeleteSubdistrict = async (id: string) => {
    const res = await api.subdistricts.delete(id);
    showToast(res.message);
    refreshAllData();
  };

  // Commodities Management
  const handleCreateCommodity = async (data: Partial<CommodityItem>) => {
    const res = await api.commodities.create(data);
    showToast(res.message);
    refreshAllData();
  };

  const handleUpdateCommodity = async (id: string, data: Partial<CommodityItem>) => {
    const res = await api.commodities.update(id, data);
    showToast(res.message);
    refreshAllData();
  };

  const handleDeleteCommodity = async (id: string) => {
    const res = await api.commodities.delete(id);
    showToast(res.message);
    refreshAllData();
  };

  // Commodity Categories Management
  const handleCreateCommodityCategory = async (data: Partial<CommodityCategory>) => {
    const res = await api.commodityCategories.create(data);
    showToast(res.message);
    refreshAllData();
  };

  const handleUpdateCommodityCategory = async (id: string, data: Partial<CommodityCategory>) => {
    const res = await api.commodityCategories.update(id, data);
    showToast(res.message);
    refreshAllData();
  };

  const handleDeleteCommodityCategory = async (id: string) => {
    const res = await api.commodityCategories.delete(id);
    showToast(res.message);
    refreshAllData();
  };

  // WhatsApp Contacts Management
  const handleCreateContact = async (data: Partial<WhatsAppContact>) => {
    const res = await api.contacts.create(data);
    showToast(res.message);
    refreshAllData();
  };

  const handleUpdateContact = async (id: string, data: Partial<WhatsAppContact>) => {
    const res = await api.contacts.update(id, data);
    showToast(res.message);
    refreshAllData();
  };

  const handleDeleteContact = async (id: string) => {
    const res = await api.contacts.delete(id);
    showToast(res.message);
    refreshAllData();
  };

  // Loading state while checking authentication
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-xl shadow-emerald-950/40 mb-4 animate-pulse">
          <img
            src="/logo.png"
            alt="Logo Resmi SIGAP-OPT Tanggamus"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="text-base font-bold tracking-tight">Memuat SIGAP-OPT...</div>
        <p className="text-xs text-slate-400 mt-1">Memverifikasi status keamanan dan sesi pengguna</p>
      </div>
    );
  }

  // Auth gate: User MUST login first before accessing any dashboard or features
  if (!user) {
    return (
      <div className="relative">
        <LoginPage
          onLogin={handleLogin}
          onQuickLogin={handleQuickLogin}
        />

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div
              className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
                toast.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-rose-900 text-white border-rose-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Permission check for menu tabs
  const isTabAccessible = (tab: TabType): boolean => {
    if (!user) {
      return ['dashboard', 'reports', 'report-form', 'export', 'smart-corner'].includes(tab);
    }
    // Admin has full access to ALL menus
    if (user.role === 'admin') return true;
    // Users management is strictly admin-only
    if (tab === 'users') return false;
    // If admin configured custom allowedTabs for this user
    if (Array.isArray(user.allowedTabs)) {
      return user.allowedTabs.includes(tab);
    }
    const defaults = DEFAULT_ROLE_TABS[user.role] || ['dashboard', 'reports', 'report-form', 'export', 'smart-corner'];
    return defaults.includes(tab);
  };

  // Main Workspace Content
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-emerald-200">
      {/* App Header with Prominent Logout Button */}
      <Header
        user={user}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onQuickLogin={handleQuickLogin}
        isSyncing={isSyncing}
        onRefreshAll={refreshAllData}
      />

      {/* Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onChangeTab={tab => {
          setActiveTab(tab);
          if (tab === 'reports') setReportStatusFilter(undefined);
        }}
        waitingVerificationCount={stats?.waitingVerification || 0}
        user={user}
      />

      {/* Main Workspace Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {!isTabAccessible(activeTab) ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-10 text-center max-w-lg mx-auto my-12 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-200 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Akses Menu Dibatasi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Akun Anda ({user ? `${user.name} - ${user.role}` : 'Tamu'}) belum diberikan izin akses untuk membuka menu ini oleh Administrator Sistem.
            </p>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Kembali ke Dashboard Utama
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                onNavigateToReports={status => {
                  setReportStatusFilter(status);
                  setActiveTab('reports');
                }}
                onNavigateToForm={() => setActiveTab('report-form')}
                onSelectReport={report => {
                  setSelectedReport(report);
                  setActiveTab('reports');
                }}
                onRefreshStats={refreshAllData}
                isSyncing={isSyncing}
                onNavigateToFonnte={() => setActiveTab('fonnte')}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                reports={reports}
                subdistricts={subdistricts}
                user={user}
                selectedReport={selectedReport}
                onSelectReport={setSelectedReport}
                onUpdateReport={handleUpdateReport}
                onDeleteReport={handleDeleteReport}
                onNavigateToForm={() => setActiveTab('report-form')}
                initialStatusFilter={reportStatusFilter}
                contacts={contacts}
              />
            )}

            {activeTab === 'report-form' && (
              <ReportFormView
                subdistricts={subdistricts}
                onSubmitSuccess={handleCreateReportSuccess}
                onCancel={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'export' && (
              <ExportExcelView
                subdistricts={subdistricts}
                reports={reports}
              />
            )}

            {(activeTab === 'smart-corner' || (activeTab as string) === 'guide') && <SmartCornerView />}

            {activeTab === 'fonnte' && (
              <FonnteBotView
                config={fonnteConfig}
                logs={fonnteLogs}
                onSaveConfig={handleSaveFonnteConfig}
                onSimulateMessage={handleSimulateFonnte}
                onRefreshLogs={() => api.fonnte.getLogs().then(setFonnteLogs)}
              />
            )}

            {activeTab === 'sheets' && (
              <SpreadsheetsView
                config={spreadsheetConfig}
                logs={syncLogs}
                reports={reports}
                users={users}
                subdistricts={subdistricts}
                commodities={commodities}
                reportsCount={reports.length}
                usersCount={users.length}
                subdistrictsCount={subdistricts.length}
                commoditiesCount={commodities.length}
                onSaveConfig={handleSaveSheetsConfig}
                onSyncNow={handleSyncNow}
                onRefreshLogs={() => api.sheets.getLogs().then(setSyncLogs)}
              />
            )}

            {activeTab === 'users' && (
              <UserManagementView
                users={users}
                currentUser={user}
                subdistricts={subdistricts}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === 'subdistricts' && (
              <SubdistrictsView
                subdistricts={subdistricts}
                subdistrictCounts={stats?.subdistrictCounts || {}}
                onCreateSubdistrict={handleCreateSubdistrict}
                onUpdateSubdistrict={handleUpdateSubdistrict}
                onDeleteSubdistrict={handleDeleteSubdistrict}
              />
            )}

            {activeTab === 'commodities' && (
              <CommoditiesView
                commodities={commodities}
                categories={commodityCategories}
                onCreateCommodity={handleCreateCommodity}
                onUpdateCommodity={handleUpdateCommodity}
                onDeleteCommodity={handleDeleteCommodity}
                onCreateCategory={handleCreateCommodityCategory}
                onUpdateCategory={handleUpdateCommodityCategory}
                onDeleteCategory={handleDeleteCommodityCategory}
              />
            )}

            {activeTab === 'contacts' && (
              <ContactsView
                contacts={contacts}
                subdistricts={subdistricts}
                currentUser={user}
                onCreateContact={handleCreateContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onRefreshContacts={refreshAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-900 text-white border-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      {/* Auto Logout Countdown Warning Modal */}
      <AutoLogoutModal
        isOpen={isAutoLogoutWarningOpen}
        secondsLeft={autoLogoutSecondsLeft}
        onExtendSession={handleExtendSession}
        onLogoutNow={handleAutoLogoutNow}
      />

      {/* WhatsApp Connected Floating Chatbot */}
      <WhatsAppFloatingBot
        onReportCreated={refreshAllData}
        onOpenFullBotPage={() => setActiveTab('fonnte')}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Logo Tanggamus"
              className="w-5 h-5 object-contain"
              referrerPolicy="no-referrer"
            />
            <span>
              &copy; {new Date().getFullYear()} SIGAP-OPT &bull; Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Designed and Developed by Bertigajaya
          </span>
        </div>
      </footer>
    </div>
  );
};
