import React, { useState } from 'react';
import {
  ShieldAlert,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sheet,
  ShieldCheck,
  Info,
  HelpCircle,
  PhoneCall
} from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onQuickLogin?: (username: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'login' | 'info'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Silakan masukkan username/email dan password.');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden antialiased font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar Header */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-700/80 shadow-lg shadow-emerald-900/40 flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Logo Resmi SIGAP-OPT Tanggamus"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">
                  SIGAP<span className="text-emerald-400">-OPT</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sistem Terproteksi
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus &bull; Pengaduan & Pemantauan Hama Tanaman
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Autentikasi Petugas Resmi</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content: Hero & Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: System Introduction & Integration Highlights */}
          <div className="lg:col-span-6 space-y-6 text-slate-200">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Portal Masuk Petugas & Administrator Dinas</span>
            </div>

            <h1
              className="font-extrabold text-white tracking-tight leading-tight"
              style={{ height: '174px', fontSize: '40px' }}
            >
              Sistem Gerak Cepat Deteksi Dini & Pengendalian <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-300">OPT Lapangan</span>
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
              Untuk menjaga integritas data pengamatan, rekomendasi Pengendalian Hama Terpadu (PHT), dan validasi laporan lapangan, Anda diwajibkan masuk menggunakan akun terdaftar sebelum mengakses sistem.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Chatbot WhatsApp Fonnte Terkoneksi</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Petani melapor via WhatsApp format <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300">LAPOR#...</code> dan notifikasi otomatis dikirim ke nomor pelapor saat verifikasi.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/60">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sinkronisasi Otomatis Google Spreadsheets</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Data pengaduan tersinkron secara realtime ke Google Spreadsheets Dinas Pertanian untuk koordinasi Gerdal.
                  </p>
                </div>
              </div>
            </div>

            {/* Farmer notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-3">
              <PhoneCall className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Petani / Masyarakat:</strong> Kirim WhatsApp ke <strong className="text-white">0858-4604-6927</strong> dengan format <code>LAPOR#Nama#Desa#Kecamatan#Komoditas#Hama#Luas#Tingkat</code> untuk melapor tanpa login.
              </span>
            </div>
          </div>

          {/* Right Side: The Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Card Header */}
              <div className="bg-linear-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 text-white text-center relative">
                <div
                  className="bg-white p-2 shadow-xl flex items-center justify-center mb-3 border-2 border-emerald-400/40"
                  style={{
                    width: '84px',
                    height: '80px',
                    marginLeft: '155.667px',
                    borderRadius: '40px'
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Logo Resmi SIGAP-OPT Tanggamus"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-xl font-black text-white">Masuk ke SIGAP-OPT</h2>
                <p className="text-xs text-emerald-200 mt-1">
                  Sistem Gerak Cepat Deteksi Dini & Pengendalian OPT Tanggamus
                </p>
              </div>

              {/* Card Form */}
              <div className="p-6 sm:p-8 space-y-5">
                {error && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Username atau Alamat Email:
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="admin atau email@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Password:</span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                      >
                        {showPassword ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Sembunyikan</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat</span>
                          </>
                        )}
                      </button>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Ingat sesi di perangkat ini</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Memverifikasi Akun...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Sistem SIGAP-OPT</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-slate-800 bg-slate-900/90 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Logo Tanggamus"
              className="w-5 h-5 object-contain"
              referrerPolicy="no-referrer"
            />
            <span>&copy; {new Date().getFullYear()} SIGAP-OPT &bull; Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Designed and Developed by Bertigajaya
          </span>
        </div>
      </footer>
    </div>
  );
};
