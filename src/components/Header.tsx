import React from 'react';
import { LogOut, RefreshCw, KeyRound } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  user: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onQuickLogin?: (username: string) => void;
  isSyncing: boolean;
  onRefreshAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenLogin,
  onLogout,
  isSyncing,
  onRefreshAll
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner Notice */}
      <div className="bg-linear-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white text-xs py-1 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-emerald-700/80 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase">
              SIGAP-OPT
            </span>
            <span>Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-emerald-100">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              WhatsApp Gateway: Fonnte API Aktif
            </span>
            <span className="opacity-40">|</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Auto-Sync Sheets: Siap
            </span>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Logo Resmi SIGAP-OPT Tanggamus"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                SIGAP<span className="text-emerald-600">-OPT</span>
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                v2.6 Realtime
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Sistem Gerak Cepat Deteksi Dini dan Pengendalian Organisme Pengganggu Tumbuhan
            </p>
          </div>
        </div>

        {/* Right Action & User Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onRefreshAll}
            disabled={isSyncing}
            title="Muat ulang data terkini"
            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-indigo-500' : user.role === 'petugas_popt' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                  <span className="capitalize font-medium">
                    {user.role === 'admin' ? 'Administrator' : user.role === 'petugas_popt' ? 'Petugas POPT' : 'Pengamat PPL'}
                  </span>
                </div>
              </div>

              <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-sm shadow-xs">
                {user.name.charAt(0)}
              </div>

              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-300 transition-all shadow-xs cursor-pointer"
                title="Keluar / Logout dari Sesi Akun"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-sm transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Masuk Petugas</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
