import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

interface AutoLogoutModalProps {
  isOpen: boolean;
  secondsLeft: number;
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

export const AutoLogoutModal: React.FC<AutoLogoutModalProps> = ({
  isOpen,
  secondsLeft,
  onExtendSession,
  onLogoutNow
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Animated Icon & Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 relative shadow-inner">
          <Clock className="w-8 h-8 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-slate-900 mb-1.5 flex items-center justify-center gap-2">
          <span>Peringatan Sesi Berakhir</span>
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 leading-relaxed mb-5 max-w-sm mx-auto">
          Tidak ada aktivitas terdeteksi pada layar Anda. Demi melindungi kerahasiaan dan keamanan data resmi sistem <strong>SIGAP-OPT</strong>, akun Anda akan otomatis logout dalam:
        </p>

        {/* Countdown Timer Display */}
        <div className="bg-slate-900 rounded-2xl p-4 mb-6 text-white flex items-center justify-center gap-4 shadow-lg shadow-slate-900/10">
          <div className="text-center">
            <div className="text-4xl font-extrabold tracking-tight text-amber-400 font-mono">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
              Menit : Detik Tersisa
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onExtendSession}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Lanjutkan Sesi (Tetap Masuk)</span>
          </button>

          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Keluar Sekarang</span>
          </button>
        </div>

        {/* Security Subtext */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protokol Keamanan Otomatis Pemkab Tanggamus</span>
        </div>
      </div>
    </div>
  );
};
