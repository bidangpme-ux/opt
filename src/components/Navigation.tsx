import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  MessageSquare,
  Sheet,
  Download,
  Users,
  MapPin,
  Sprout,
  BookOpen,
  Settings,
  ChevronDown,
  Check,
  Sparkles,
  BookUser
} from 'lucide-react';
import { User, TabType, DEFAULT_ROLE_TABS } from '../types';

export type { TabType };

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  waitingVerificationCount: number;
  user: User | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  waitingVerificationCount,
  user
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Check if a tab is allowed for current user/role
  const isTabAllowed = (tabId: TabType): boolean => {
    if (!user) {
      return ['dashboard', 'reports', 'report-form', 'fonnte', 'export', 'smart-corner'].includes(tabId);
    }
    // Admin has access to ALL menus
    if (user.role === 'admin') {
      return true;
    }
    // Non-admin can NEVER access users management
    if (tabId === 'users') {
      return false;
    }
    // If admin configured custom allowedTabs
    if (Array.isArray(user.allowedTabs)) {
      return user.allowedTabs.includes(tabId);
    }
    // Role default fallback
    const defaults = DEFAULT_ROLE_TABS[user.role] || ['dashboard', 'reports', 'report-form', 'fonnte', 'export', 'smart-corner'];
    return defaults.includes(tabId);
  };

  // Primary navigation tabs
  const mainTabs = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard & Pantau',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'reports' as TabType,
      label: 'Daftar Pengaduan OPT',
      icon: FileSpreadsheet,
      badge: waitingVerificationCount > 0 ? waitingVerificationCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'export' as TabType,
      label: 'Ekspor Excel (.xlsx)',
      icon: Download,
      badge: null
    },
    {
      id: 'smart-corner' as TabType,
      label: 'Pojok Pintar',
      icon: Sparkles,
      badge: 'Gemini AI',
      badgeColor: 'bg-purple-600 text-white font-bold'
    }
  ];

  // Settings dropdown items
  const settingsItems = [
    {
      id: 'fonnte' as TabType,
      label: 'WhatsApp Bot (Fonnte API)',
      desc: 'Gateway WhatsApp API resmi Fonnte: auto-reply 24 jam, webhook pengaduan, dan notifikasi update status laporan',
      icon: MessageSquare,
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      badge: 'Fonnte API',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'sheets' as TabType,
      label: 'Google Spreadsheets',
      desc: 'Sinkronisasi cloud otomatis ke akun Google Spreadsheets Dinas',
      icon: Sheet,
      iconBg: 'bg-teal-500/20 text-teal-400',
      badge: 'Auto Email',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    },
    {
      id: 'contacts' as TabType,
      label: 'Buku Kontak WhatsApp',
      desc: 'Simpan nomor WhatsApp petani, Poktan, petugas POPT & dinas dengan fitur tambah kontak',
      icon: BookUser,
      iconBg: 'bg-green-500/20 text-green-400',
      badge: 'Kontak WA',
      badgeColor: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    {
      id: 'subdistricts' as TabType,
      label: 'Master Data Kecamatan',
      desc: 'Kelola data kecamatan binaan & wilayah administratif Tanggamus',
      icon: MapPin,
      iconBg: 'bg-blue-500/20 text-blue-400',
      badge: null
    },
    {
      id: 'commodities' as TabType,
      label: 'Master Data Komoditas Tanaman',
      desc: 'Kelola jenis tanaman pangan & hortikultura (padi, jagung, cabai, pisang, dll.)',
      icon: Sprout,
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      badge: 'Pangan & Horti',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 'users' as TabType,
      label: 'Manajemen Pengguna & Hak Akses',
      desc: 'Kelola akun petugas POPT, PPL pengamat & atur izin menu sistem (Admin)',
      icon: Users,
      iconBg: 'bg-purple-500/20 text-purple-400',
      badge: 'Admin',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      adminOnly: true
    }
  ];

  // Filter main tabs and settings items based on current permissions
  const visibleMainTabs = mainTabs.filter(tab => isTabAllowed(tab.id));
  const visibleSettingsItems = settingsItems.filter(item => isTabAllowed(item.id));

  const isSettingsActive = visibleSettingsItems.some(item => item.id === activeTab);
  const activeSettingItem = visibleSettingsItems.find(item => item.id === activeTab);

  return (
    <nav className="bg-slate-900 text-slate-300 shadow-inner border-b border-slate-800 relative z-30">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-2 py-1.5">
        
        {/* Main Navigation Bar Items */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
          {visibleMainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>

                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-tight ${
                      tab.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dropdown Menu "Pengaturan & Master Data" (hanya jika ada item yang diizinkan) */}
        {visibleSettingsItems.length > 0 && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                isSettingsActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : isDropdownOpen
                  ? 'bg-slate-800 text-white border-slate-700 shadow-inner'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
              }`}
            >
              <Settings
                className={`w-4 h-4 ${
                  isSettingsActive ? 'text-white' : 'text-emerald-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isSettingsActive && activeSettingItem ? activeSettingItem.label : 'Pengaturan & Master'}
              </span>
              <span className="sm:hidden">Menu</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-md">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between mb-1">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-emerald-400" />
                    Pengaturan Sistem
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Konfigurasi integrasi gateway & master data
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                  SIGAP-OPT
                </span>
              </div>

              <div className="space-y-1">
                {visibleSettingsItems.map(item => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onChangeTab(item.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 group ${
                        isItemActive
                          ? 'bg-emerald-950/70 border border-emerald-600/50 text-white'
                          : 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isItemActive
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : item.iconBg
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate ${
                              isItemActive
                                ? 'text-emerald-300'
                                : 'text-white group-hover:text-emerald-300'
                            }`}
                          >
                            {item.label}
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                                  item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {isItemActive && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer info in dropdown */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 px-3 py-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>Tekan <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700">ESC</kbd> untuk menutup</span>
                <span className="text-emerald-400 font-medium">Kab. Tanggamus</span>
              </div>
            </div>
          )}
        </div>
      )}

      </div>
    </nav>
  );
};
