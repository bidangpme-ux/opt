import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Send,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  Check,
  ExternalLink,
  Info,
  Radio,
  HelpCircle,
  Layers,
  ArrowRight,
  PhoneCall,
  Flame
} from 'lucide-react';
import { BaileysStatus, BaileysLog } from '../types';
import { api } from '../lib/api';

interface BaileysBotViewProps {
  onRefreshAllData?: () => void;
}

export const BaileysBotView: React.FC<BaileysBotViewProps> = ({ onRefreshAllData }) => {
  const [status, setStatus] = useState<BaileysStatus>({
    status: 'connecting',
    qrCodeUrl: null,
    userPhone: null,
    userName: null,
    mode: 'baileys_open_source'
  });
  const [logs, setLogs] = useState<BaileysLog[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test sender state
  const [targetPhone, setTargetPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Halo! Ini adalah pesan uji coba dari SIPOPT Tanggamus menggunakan Library Mandiri Baileys (Tanpa Fonnte).');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Simulator state
  const [simMessage, setSimMessage] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: '🌾 *SELAMAT DATANG DI SIPOPT WHATSAPP BOT (BAILEYS MANDIRI)* 🌾\n_Sistem Tanggap Pengaduan Hama & Penyakit Tanaman Kabupaten Tanggamus_\n\nKetik *LAPOR* untuk memulai alur pelaporan 6 langkah.',
      time: '08:00'
    }
  ]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await api.baileys.getStatus();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.baileys.getLogs();
      setLogs(res);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    // Auto-poll status every 4 seconds when in scan_needed or connecting
    const interval = setInterval(() => {
      api.baileys.getStatus().then(res => {
        setStatus(res);
        if (res.status === 'connected') {
          fetchLogs();
        }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handlePing = async () => {
    setIsActionLoading(true);
    try {
      const res = await api.baileys.ping();
      if (res.connected) {
        showFeedback('success', `⚡ WhatsApp Aktif & Responsif! Nomor +${res.userPhone || status.userPhone} tersambung normal (Keep-Alive 24 Jam Aktif).`);
      } else {
        showFeedback('error', 'Socket WhatsApp sedang memulihkan koneksi atau belum terhubung.');
      }
      fetchStatus();
    } catch (err: any) {
      showFeedback('error', 'Gagal cek sinyal bot: ' + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConnect = async (reset = false) => {
    setIsActionLoading(true);
    try {
      const res = await api.baileys.connect(reset);
      showFeedback('success', res.message || 'Permintaan menghubungkan socket dikirim');
      setTimeout(fetchStatus, 1500);
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal menghubungkan socket');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan (logout) akun WhatsApp dari server? Anda perlu scan QR ulang untuk menghubungkan kembali.')) {
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await api.baileys.disconnect();
      showFeedback('success', res.message || 'WhatsApp berhasil diputuskan');
      fetchStatus();
      fetchLogs();
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal memutuskan WhatsApp');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone.trim()) {
      showFeedback('error', 'Nomor WhatsApp tujuan wajib diisi');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await api.baileys.testSend(targetPhone.trim(), testMessage.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Pesan WhatsApp berhasil dikirim via Baileys!');
        fetchLogs();
      } else {
        showFeedback('error', res.message || 'Gagal mengirim pesan');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Koneksi error saat mengirim pesan');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendSimulation = async (textToSend?: string) => {
    const msg = (textToSend || simMessage).trim();
    if (!msg || isSimulating) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: msg, time: timeStr }]);
    setSimMessage('');
    setIsSimulating(true);

    try {
      const res = await api.baileys.simulate({
        senderPhone: '081298765432',
        senderName: 'Pak Supardi (Petani)',
        message: msg
      });

      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: res.reply || 'Pesan diterima oleh bot.',
          time: timeStr
        }
      ]);

      if (res.reply.includes('OPT-2026-') || res.reply.includes('TIKET')) {
        if (onRefreshAllData) onRefreshAllData();
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Terjadi kendala teknis simulasi bot.',
          time: timeStr
        }
      ]);
    } finally {
      setIsSimulating(false);
      fetchLogs();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Open-Source Gateway (@whiskeysockets/baileys)</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white border border-white/10">
                100% Gratis & Mandiri (Tanpa Fonnte)
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Chatbot WhatsApp Mandiri SIPOPT Tanggamus
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Bot WhatsApp kini berjalan langsung di dalam server SIPOPT menggunakan protokol socket resmi WhatsApp Web. 
              <strong> Tanpa perlu berlangganan pihak ketiga (Fonnte/Wablas)</strong>. Cukup scan QR Code sekali dari aplikasi WhatsApp di HP Anda untuk menghubungkan nomor bot dinas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePing}
              disabled={isActionLoading || status.status !== 'connected'}
              className="px-3.5 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors border border-emerald-500/40 flex items-center gap-2 shadow-xs disabled:opacity-50"
              title="Cek respon socket WhatsApp real-time"
            >
              <Zap className={`w-4 h-4 ${isActionLoading ? 'animate-bounce text-amber-300' : 'text-emerald-400'}`} />
              <span>Uji Sinyal Bot</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchStatus();
                fetchLogs();
              }}
              disabled={isLoadingStatus}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/10 flex items-center gap-2 shadow-xs"
              title="Perbarui Status Koneksi"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh Status</span>
            </button>

            {status.status === 'connected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isActionLoading}
                className="px-4 py-3 rounded-2xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs"
                title="Keluarkan akun WhatsApp secara manual dari server"
              >
                <LogOut className="w-4 h-4" />
                <span>Putuskan Sesi</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`mt-5 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
            }`}
          >
            {actionFeedback.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{actionFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Main Connection Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: QR Code Scanner & Device Status (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md ${
                  status.status === 'connected' ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-600 shadow-amber-500/30'
                }`}>
                  {status.status === 'connected' ? <Smartphone className="w-6 h-6" /> : <QrCode className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Status Koneksi WhatsApp Baileys
                  </h3>
                  <p className="text-xs text-slate-500">
                    Protokol Multi-Device Web Socket v2 (Mandiri & Anti-Hilang)
                  </p>
                </div>
              </div>

              <div>
                {status.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Terhubung (Aktif 24 Jam)</span>
                  </span>
                ) : status.status === 'scan_needed' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Menunggu Scan QR</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Menghubungkan...</span>
                  </span>
                )}
              </div>
            </div>

            {/* If Connected */}
            {status.status === 'connected' ? (
              <div className="space-y-5">
                {/* Permanent Session Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Sesi Tersimpan Permanen & Terus Aktif Selamanya</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Setelah di-scan, akun WhatsApp Anda telah dikunci dan <strong>disimpan secara permanen</strong> di server dengan 3 lapis perlindungan (Storage Lokal, Database Backup, dan Cloud Firestore). 
                    WhatsApp <strong>TIDAK AKAN HILANG</strong> saat browser ditutup, internet laptop terputus, atau server direstart. Sesi akan terus aktif melayani petani 24 jam nonstop sampai Anda secara sadar menekan tombol <em>"Putuskan Sesi"</em>.
                  </p>
                </div>

                <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-emerald-700">Nomor WhatsApp Bot Terhubung:</span>
                    <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                      +{status.userPhone || '6285846046927'}
                    </div>
                    <div className="text-xs text-emerald-800 font-medium flex items-center gap-2">
                      <span>Perangkat: <strong>{status.userName || 'SIPOPT Bot Tanggamus'}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-700 font-bold">● Sinyal Keep-Alive Aktif</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePing}
                      disabled={isActionLoading}
                      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tes Respon Bot</span>
                    </button>
                    <a
                      href={`https://wa.me/${status.userPhone}?text=LAPOR`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
                    >
                      <span>Buka Chat WA</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 font-medium block text-[11px] mb-0.5">Ketahanan Sesi</span>
                    <span className="font-bold text-emerald-700">Permanen (Anti-Hilang)</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 font-medium block text-[11px] mb-0.5">Keep-Alive Presence</span>
                    <span className="font-bold text-emerald-700">Tiap 15 Detik</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 font-medium block text-[11px] mb-0.5">Auto-Reconnect</span>
                    <span className="font-bold text-emerald-700">Otomatis Aktif</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-500 font-medium block text-[11px] mb-0.5">Biaya Bulanan</span>
                    <span className="font-bold text-slate-800">Rp 0 (Gratis)</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Layanan Otomatis yang Sedang Berjalan:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                    <li>Merespons pesan masuk petani secara otomatis (24/7)</li>
                    <li>Menjalankan tanya-jawab 6 langkah pengaduan serangan OPT</li>
                    <li>Menerbitkan tiket pengaduan resmi dan menyimpan ke database Firestore</li>
                    <li>Menyinkronkan data pengaduan ke Google Spreadsheets Dinas</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* If Scan Needed or Disconnected */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  {/* QR Code Container */}
                  <div className="w-56 h-56 bg-white p-3 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center shrink-0">
                    {status.qrCodeUrl ? (
                      <img
                        src={status.qrCodeUrl}
                        alt="WhatsApp QR Code"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Menyiapkan QR Code WhatsApp...</span>
                      </div>
                    )}
                  </div>

                  {/* Scan Instructions */}
                  <div className="space-y-3 text-xs text-slate-700">
                    <div className="font-bold text-sm text-slate-900">
                      Cara Menautkan WhatsApp Bot (Cukup Scan 1x):
                    </div>
                    <ol className="list-decimal list-inside space-y-2 font-medium leading-relaxed">
                      <li>Buka aplikasi <strong>WhatsApp</strong> di HP Anda.</li>
                      <li>Ketuk ikon titik tiga (Android) atau menu <strong>Pengaturan</strong> (iPhone).</li>
                      <li>Pilih menu <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                      <li>Ketuk tombol <strong>Tautkan Perangkat</strong>.</li>
                      <li>Arahkan kamera HP ke <strong>QR Code</strong> di samping.</li>
                    </ol>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-medium text-[11px] leading-relaxed">
                      🔒 <strong>Garansi Anti-Hilang:</strong> Setelah berhasil di-scan, sesi akan terkunci permanen di server dan terus aktif 24 jam. Anda tidak perlu scan ulang lagi di masa mendatang.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleConnect(true)}
                    disabled={isActionLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                    <span>Generate Ulang QR Code Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConnect(false)}
                    disabled={isActionLoading}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    <span>Sambungkan Sesi Tersimpan (Tanpa Scan)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Gateway: <strong>@whiskeysockets/baileys (Always-On)</strong></span>
            <span>Status Auth: <strong className={status.status === 'connected' ? 'text-emerald-700 font-bold' : ''}>{status.status}</strong></span>
          </div>
        </div>

        {/* Right: Real WhatsApp Test Sender Form (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center font-bold">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Uji Coba Kirim Pesan Riil
                </h3>
                <p className="text-xs text-slate-500">
                  Kirim pesan WhatsApp langsung via Baileys socket
                </p>
              </div>
            </div>

            <form onSubmit={handleSendTestMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor WhatsApp Tujuan (Pelapor / Petugas):
                </label>
                <input
                  type="text"
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Isi Pesan Uji Coba:
                </label>
                <textarea
                  rows={4}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingTest || status.status !== 'connected'}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim via Baileys...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Pesan WhatsApp Langsung</span>
                  </>
                )}
              </button>

              {status.status !== 'connected' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>Fitur kirim pesan riil aktif setelah Anda scan QR Code WhatsApp di sebelah kiri.</span>
                </div>
              )}
            </form>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 text-[11px] text-slate-500">
            Pesan terkirim riil melalui nomor HP WhatsApp yang tertaut pada server Baileys.
          </div>
        </div>
      </div>

      {/* Simulator Percakapan Interaktif (Web-to-Baileys Engine) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Simulator Alur Tanya-Jawab Chatbot
              </h3>
              <p className="text-xs text-slate-500">
                Uji coba respons logika 6 langkah bot secara langsung tanpa perlu membuka HP
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleSendSimulation('LAPOR')}
              className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold transition-colors"
            >
              🌾 Ketik LAPOR
            </button>
            <button
              type="button"
              onClick={() => handleSendSimulation('STATUS#OPT-2026-001')}
              className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold transition-colors"
            >
              🔍 Cek Status
            </button>
            <button
              type="button"
              onClick={() => handleSendSimulation('PANDUAN')}
              className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold transition-colors"
            >
              📚 Panduan Hama
            </button>
            <button
              type="button"
              onClick={() => handleSendSimulation('Bagaimana cara membasmi hama tikus sawah?')}
              className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold transition-colors"
            >
              ❓ Konsultasi AI
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <div className="h-80 bg-slate-950 rounded-2xl p-4 overflow-y-auto space-y-3 text-xs border border-slate-800">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-slate-900 text-slate-100 border border-white/10 rounded-bl-xs'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
          {isSimulating && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-2xl px-3 py-2 w-20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendSimulation();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={simMessage}
            onChange={e => setSimMessage(e.target.value)}
            placeholder="Ketik pesan balasan (misal: nama Anda, alamat, luas lahan, atau 'LAPOR')..."
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
          <button
            type="submit"
            disabled={!simMessage.trim() || isSimulating}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Kirim</span>
          </button>
        </form>
      </div>

      {/* Log Riwayat Pesan WhatsApp Baileys */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Aktivitas Pesan WhatsApp (Baileys)</span>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Log</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada riwayat pesan WhatsApp masuk atau keluar. Pesan akan otomatis tercatat saat bot menerima interaksi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {logs.slice(0, 30).map((log, i) => (
              <div key={log.id || i} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.direction === 'incoming'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {log.direction === 'incoming' ? 'MASUK' : 'KELUAR'}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">{log.phone}</span>
                    {log.senderName && <span className="text-slate-500">({log.senderName})</span>}
                  </div>
                  <div className="text-slate-700 line-clamp-2">{log.message}</div>
                </div>

                <div className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
