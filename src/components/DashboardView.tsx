import React from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Bug,
  Shield,
  Layers,
  Activity,
  ArrowRight,
  ExternalLink,
  Calendar,
  Phone,
  Database,
  RefreshCw,
  Info,
  X,
  Check,
  ShieldCheck,
  HardDrive,
  MessageSquare,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { DashboardStats, OPTReport, SeverityLevel } from '../types';
import { api } from '../lib/api';

interface DashboardViewProps {
  stats: DashboardStats | null;
  onNavigateToReports: (filterStatus?: string) => void;
  onNavigateToForm: () => void;
  onSelectReport: (report: OPTReport) => void;
  onRefreshStats?: () => void;
  isSyncing?: boolean;
  onNavigateToFonnte?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigateToReports,
  onNavigateToForm,
  onSelectReport,
  onRefreshStats,
  isSyncing = false,
  onNavigateToFonnte
}) => {
  const [showStorageModal, setShowStorageModal] = React.useState(false);
  const [isSyncingStorage, setIsSyncingStorage] = React.useState(false);
  const [syncFeedback, setSyncFeedback] = React.useState<string | null>(null);

  const handleSyncStorage = async () => {
    setIsSyncingStorage(true);
    setSyncFeedback(null);
    try {
      const res = await api.firebase.sync();
      if (onRefreshStats) {
        await onRefreshStats();
      }
      setSyncFeedback(res.message || 'Sinkronisasi database Firestore berhasil!');
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback('Gagal sinkronisasi: ' + (err.message || 'Koneksi error'));
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncingStorage(false);
    }
  };
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Memuat data analitik SIGAP-OPT...</p>
        </div>
      </div>
    );
  }

  const severityColor = (sev: SeverityLevel) => {
    switch (sev) {
      case 'Ringan':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Sedang':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Berat':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Puso':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu Verifikasi':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Sedang Ditinjau Petugas':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Tindak Lanjut / Gerdal':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Alert / Action */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <Bug className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold mb-3 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Pantauan Lapangan Real-Time 2026
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Pusat Komando & Penanggulangan OPT Pertanian
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Terhubung langsung dengan laporan petani via <strong className="text-emerald-300 font-semibold">WhatsApp Chatbot Fonnte</strong> dan otomatis tersinkronisasi ke <strong className="text-teal-300 font-semibold">Google Spreadsheets Dinas</strong> untuk koordinasi Gerakan Pengendalian (Gerdal).
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={onNavigateToForm}
            className="flex-1 md:flex-initial bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
          >
            <span>+ Catat Laporan Baru</span>
          </button>
          <button
            onClick={() => onNavigateToReports()}
            className="flex-1 md:flex-initial bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-3 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Buka Tabel Pengaduan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WhatsApp Chatbot Connected Card */}
      <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Chatbot WhatsApp Aktif (Baileys Open-Source)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 text-white border border-white/10">
                📱 Scan QR WA Langsung
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold hidden sm:inline">
                • 100% Gratis & Mandiri Tanpa Fonnte
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Layanan Pengaduan Cepat via WhatsApp 24 Jam Nonstop
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Bot WhatsApp kini berjalan mandiri langsung di server menggunakan library open-source <strong className="text-emerald-300 font-mono">@whiskeysockets/baileys</strong>. Anda cukup melakukan scan QR Code sekali dari WhatsApp di HP. Bot cerdas akan memandu 6 langkah tanya-jawab interaktif (Nama, Alamat, Desa, Kecamatan, Luas Lahan, Foto) dan langsung menyinkronkan laporan ke Database SIGAP-OPT & Google Spreadsheets Dinas.
            </p>

            {/* Quick Keyword Tips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400">Pemicu Cepat:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                LAPOR
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/30">
                STATUS#OPT-...
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold border border-purple-500/30">
                PANDUAN
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                MENU
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <a
              href="https://wa.me/6285846046927?text=LAPOR"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-slate-950" />
              <span>Chat WhatsApp Riil (wa.me)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {onNavigateToFonnte && (
              <button
                type="button"
                onClick={onNavigateToFonnte}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Buka WhatsApp Bot Fonnte & Simulator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Parameter Sisa Memori Penyimpanan Database Firebase */}
      {stats.firebaseStorage && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 lg:p-6 relative overflow-hidden transition-all hover:border-emerald-300">
          {/* Top subtle accent gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-amber-500"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 via-orange-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Parameter Kapasitas & Sisa Memori Database
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Data base Terhubung
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Spark Free Tier
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSyncStorage}
                disabled={isSyncingStorage || isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors shadow-2xs"
                title="Sinkronkan database Firestore dan perbarui metrik sisa memori"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStorage || isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isSyncingStorage ? 'Menyinkronkan...' : 'Refresh Memori'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStorageModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Rincian Koleksi</span>
              </button>
            </div>
          </div>

          {/* Sync notification feedback */}
          {syncFeedback && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
              >
                &times;
              </button>
            </div>
          )}

          {/* Storage Parameters Grid: Sisa Memori Tersedia & Memori Terpakai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Card 1: SISA MEMORI TERSEDIA */}
            <div className="p-5 rounded-xl bg-linear-to-br from-emerald-50 via-emerald-50/60 to-teal-50 border border-emerald-200 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-700" />
                  Sisa Memori Tersedia
                </span>
                <span className="font-extrabold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
                  {stats.firebaseStorage.remainingPercentage}% Bebas
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-emerald-900 mt-2 tracking-tight">
                {stats.firebaseStorage.remainingFormatted}
              </div>
              <p className="text-xs text-emerald-800 mt-1 font-medium">
                Dari total kuota <strong className="font-bold">{stats.firebaseStorage.quotaFormatted}</strong>
              </p>
              {/* Visual Gauge Bar */}
              <div className="w-full h-2.5 bg-emerald-200/80 rounded-full overflow-hidden mt-3.5 shadow-inner">
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(stats.firebaseStorage.remainingPercentage, 1)}%` }}
                ></div>
              </div>
            </div>

            {/* Card 2: MEMORI TERPAKAI */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-600" />
                  Memori Terpakai
                </span>
                <span className="font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px]">
                  {stats.firebaseStorage.usedPercentage}% Kuota
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-black text-slate-900 mt-2 tracking-tight">
                {stats.firebaseStorage.usedFormatted}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ukuran dokumen JSON & indeks NoSQL 
              </p>
              {/* Visual Used Bar */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mt-3.5 shadow-inner">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(stats.firebaseStorage.usedPercentage, 0.5)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Reports */}
        <div
          onClick={() => onNavigateToReports()}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pengaduan OPT</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.totalReports}</span>
            <span className="text-xs text-slate-500 font-medium">Tiket Terdaftar</span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
            <span>Lihat semua laporan &rarr;</span>
          </p>
        </div>

        {/* Card 2: Menunggu Verifikasi */}
        <div
          onClick={() => onNavigateToReports('Menunggu Verifikasi')}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
        >
          {stats.waitingVerification > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Menunggu Verifikasi</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">{stats.waitingVerification}</span>
            <span className="text-xs text-amber-700/80 font-medium">Butuh Respon Petugas</span>
          </div>
          <p className="mt-2 text-xs text-amber-700 flex items-center gap-1 font-medium">
            <span>Tinjau dan verifikasi segera &rarr;</span>
          </p>
        </div>

        {/* Card 3: Sedang Gerdal / Ditinjau */}
        <div
          onClick={() => onNavigateToReports('Tindak Lanjut / Gerdal')}
          className="bg-white p-5 rounded-2xl border border-purple-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Tindak Lanjut / Gerdal</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-700">{stats.inProgress}</span>
            <span className="text-xs text-purple-700/80 font-medium">Dalam Penanganan</span>
          </div>
          <p className="mt-2 text-xs text-purple-700 flex items-center gap-1 font-medium">
            <span>Pantau aksi gerakan pengendalian &rarr;</span>
          </p>
        </div>

        {/* Card 4: Selesai / Terkendali */}
        <div
          onClick={() => onNavigateToReports('Selesai')}
          className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Selesai & Terkendali</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{stats.resolved}</span>
            <span className="text-xs text-emerald-700/80 font-medium">Serangan Tuntas</span>
          </div>
          <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-medium">
            <span>Evaluasi hasil PHT &rarr;</span>
          </p>
        </div>
      </div>

      {/* Second Row: Affected Area Stats & Severity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Luas Hamparan Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Kalkulasi Luas Serangan</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Satuan Hektar (Ha)</span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                <span className="text-xs font-semibold text-rose-700 block mb-1">Luas Terserang</span>
                <div className="text-2xl font-black text-rose-900">
                  {stats.totalAreaAffectedHa} <span className="text-xs font-normal">Ha</span>
                </div>
                <span className="text-[11px] text-rose-600 mt-1 block">Telah muncul gejala kerusakan fisik</span>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <span className="text-xs font-semibold text-amber-700 block mb-1">Luas Terancam</span>
                <div className="text-2xl font-black text-amber-900">
                  {stats.totalAreaThreatenedHa} <span className="text-xs font-normal">Ha</span>
                </div>
                <span className="text-[11px] text-amber-600 mt-1 block">Hamparan satu blok/petakan rentan</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 leading-relaxed">
              *Rasio ancaman dihitung otomatis berdasarkan topografi hamparan dan sifat persebaran migrasi hama (vektor/spora).
            </p>
          </div>
        </div>

        {/* Tingkat Keparahan Serangan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Intensitas Serangan OPT</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Standar POPT</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Ringan', count: stats.severityCounts.Ringan, color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', desc: '< 25% kerusakan daun/rumpun' },
              { label: 'Sedang', count: stats.severityCounts.Sedang, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', desc: '25% - 50% kerusakan' },
              { label: 'Berat', count: stats.severityCounts.Berat, color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', desc: '51% - 85% kerusakan masif' },
              { label: 'Puso (Fuso)', count: stats.severityCounts.Puso, color: 'bg-rose-600', bg: 'bg-rose-50', text: 'text-rose-700', desc: '> 85% puso / gagal panen' },
            ].map(item => {
              const pct = stats.totalReports > 0 ? Math.round((item.count / stats.totalReports) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-800">
                      {item.count} Laporan ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Hama / Penyakit Terbanyak */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-500" />
              <span>Hama & Penyakit Dominan</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Paling Sering</span>
          </div>

          <div className="space-y-3">
            {stats.topPests && stats.topPests.length > 0 ? (
              stats.topPests.map((pest, idx) => (
                <div
                  key={pest.pestName}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded-full bg-white font-bold text-slate-500 text-[11px] flex items-center justify-center border border-slate-200 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-slate-800 truncate">{pest.pestName}</div>
                      <div className="text-[10px] text-slate-500">{pest.commodity}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
                    {pest.count}x
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data OPT tercatat</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Sebaran per Wilayah Kecamatan & Peta Interaktif Ringkas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sebaran Wilayah Kecamatan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Sebaran Kasus per Kecamatan</span>
              </h3>
              <p className="text-xs text-slate-500">Jumlah pengaduan dan koordinator POPT lapangan</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {stats.subdistricts.length} Kecamatan
            </span>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {stats.subdistricts.map(sub => {
              const count = stats.subdistrictCounts[sub.name] || 0;
              const maxCount = Math.max(...Object.values(stats.subdistrictCounts), 1);
              const barWidth = Math.min(100, Math.round((count / maxCount) * 100));

              return (
                <div
                  key={sub.id}
                  onClick={() => onNavigateToReports(undefined)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800">Kec. {sub.name}</span>
                    <span className="font-extrabold text-emerald-800">
                      {count} Kasus Dilaporkan
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full ${count > 0 ? 'bg-emerald-600' : 'bg-slate-300'} rounded-full`}
                      style={{ width: `${Math.max(barWidth, 4)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Koordinator: {sub.coordinator}</span>
                    <span>Target: {sub.targetAreaHa} Ha</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peta Sebaran Serangan Lapangan & Titik Koordinat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Peta Sebaran Koordinat GPS Serangan</span>
                </h3>
                <p className="text-xs text-slate-500">Geolokasi pengaduan dari poktan & chatbot WA</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">Live GPS Plot</span>
            </div>

            {/* Simulated Map View Canvas */}
            <div className="w-full h-[220px] rounded-xl bg-linear-to-br from-slate-800 to-slate-900 relative overflow-hidden border border-slate-700 shadow-inner flex flex-col justify-between p-4">
              {/* Grid Background Pattern */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              ></div>

              {/* Coordinates Overlay */}
              <div className="relative z-10 flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                <span>RADAR PEMANTAUAN OPT TANGGAMUS</span>
                <span>LAT: -5.4988, LNG: 104.6225</span>
              </div>

              {/* Simulated Map Pins */}
              {stats.recentReports.length > 0 ? (
                <div className="relative z-10 my-auto grid grid-cols-3 gap-2">
                  {stats.recentReports.slice(0, 3).map((r, i) => (
                    <div
                      key={r.id}
                      onClick={() => onSelectReport(r)}
                      className="bg-slate-900/90 border border-slate-700 hover:border-emerald-500 rounded-lg p-2 text-white cursor-pointer transition-all hover:scale-105 shadow-lg backdrop-blur-xs"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>{r.code}</span>
                      </div>
                      <div className="text-[11px] font-semibold truncate text-slate-200">{r.subdistrict}</div>
                      <div className="text-[10px] text-slate-400 truncate">{r.pestName}</div>
                      <div className="mt-1 text-[9px] text-amber-400 font-mono">
                        {r.location ? `${r.location.latitude.toFixed(3)}, ${r.location.longitude.toFixed(3)}` : 'GPS Aktif'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative z-10 my-auto text-center py-6">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Radar GPS Siaga Aktif &bull; Menunggu koordinat laporan lapangan baru</span>
                  </div>
                </div>
              )}

              <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Satelit & Sensor POPT Aktif
                </span>
                <button
                  onClick={() => onNavigateToReports()}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <span>Lihat Seluruh Titik Lapangan &rarr;</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Sinkronisasi otomatis dengan Google Sheets & WhatsApp Bot</span>
            <span className="font-semibold text-emerald-700">100% Terintegrasi</span>
          </div>
        </div>
      </div>

      {/* Row 4: Laporan Terbaru Masuk (Quick Action List) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Pengaduan OPT Terbaru yang Masuk</span>
            </h3>
            <p className="text-xs text-slate-500">Periksa detail dan berikan rekomendasi pengendalian segera</p>
          </div>
          <button
            onClick={() => onNavigateToReports()}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Buka Semua Laporan ({stats.totalReports})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats.recentReports.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {stats.recentReports.map(report => (
              <div
                key={report.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {report.code}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${severityColor(report.severity)}`}>
                      {report.severity}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${statusBadge(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(report.dateReported).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-slate-800">
                    {report.pestName} <span className="font-normal text-slate-500">pada tanaman</span> {report.commodity}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Desa {report.village}, Kec. {report.subdistrict}
                    </span>
                    <span>Pelapor: <strong>{report.reporterName}</strong></span>
                    <span>Luas: <strong>{report.areaAffectedHa} Ha</strong></span>
                    {report.source === 'fonnte_whatsapp' && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3" /> via WhatsApp Bot Fonnte
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectReport(report)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-colors"
                  >
                    Detail & Tindak Lanjut
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm mb-1">
              Belum Ada Pengaduan OPT Terbaru yang Masuk
            </h4>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Database pengaduan saat ini kosong dan siap menerima data riil. Laporan baru yang dikirim petani melalui portal web maupun WhatsApp Bot Fonnte akan otomatis tercatat di sini secara realtime.
            </p>
          </div>
        )}
      </div>

      {/* Modal Detail Rincian Alokasi Memori Firebase Firestore */}
      {showStorageModal && stats.firebaseStorage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Rincian Alokasi Memori Firebase Firestore
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kapasitas detail penyimpanan NoSQL Cloud Database SIGAP-OPT
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              {/* Highlight summary banner */}
              <div className="p-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100">Sisa Memori Tersedia</div>
                  <div className="text-2xl font-black mt-0.5">{stats.firebaseStorage.remainingFormatted}</div>
                  <div className="text-xs text-emerald-100 mt-1">
                    {stats.firebaseStorage.remainingPercentage}% ruang kosong dari kuota 1,024 MB
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100">Memori Terpakai</div>
                  <div className="text-xl font-bold mt-0.5">{stats.firebaseStorage.usedFormatted}</div>
                  <div className="text-xs text-emerald-100 mt-1">
                    {stats.firebaseStorage.totalDocuments} total dokumen NoSQL
                  </div>
                </div>
              </div>

              {/* Table Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Koleksi Firestore</th>
                      <th className="p-3 text-center">Jumlah Dokumen</th>
                      <th className="p-3 text-right">Ukuran Memori</th>
                      <th className="p-3">Fungsi Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/reports</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.reports.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.reports.formatted}</td>
                      <td className="p-3 text-slate-500">Laporan pengaduan serangan OPT dari petani & petugas</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/users</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.users.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.users.formatted}</td>
                      <td className="p-3 text-slate-500">Data akun administrator & petugas POPT wilayah</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/subdistricts</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.subdistricts.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.subdistricts.formatted}</td>
                      <td className="p-3 text-slate-500">Master 20 kecamatan binaan Kabupaten Tanggamus</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/commodities</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.commodities.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.commodities.formatted}</td>
                      <td className="p-3 text-slate-500">Daftar komoditas tanaman pangan & hortikultura</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/commodityCategories</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.commodityCategories.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.commodityCategories.formatted}</td>
                      <td className="p-3 text-slate-500">Kategori komoditas (Pangan, Sayuran, Buah, dll)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/settings</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.settings.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.settings.formatted}</td>
                      <td className="p-3 text-slate-500">Konfigurasi Google Sheets & WhatsApp Fonnte</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono font-semibold text-slate-900">/logs</td>
                      <td className="p-3 text-center font-bold text-slate-800">{stats.firebaseStorage.collectionBreakdown.logs.count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{stats.firebaseStorage.collectionBreakdown.logs.formatted}</td>
                      <td className="p-3 text-slate-500">Riwayat pesan WhatsApp dan sinkronisasi</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explanatory notes */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  Kapasitas Firebase Firestore Spark Free Plan:
                </div>
                <p>
                  &bull; <strong>Kuota Penyimpanan Gratis:</strong> 1 GiB (1,024 MB). Dengan rata-rata ukuran laporan 1-2 KB, database ini dapat menampung hingga <strong>500.000+ laporan pengaduan</strong> tanpa biaya tambahan.
                </p>
                <p>
                  &bull; <strong>Batas Akses Harian:</strong> 50.000 pembacaan dokumen dan 20.000 penulisan per hari dari Google Cloud Firestore.
                </p>
                <p>
                  &bull; <strong>Database ID Terhubung:</strong> <code className="font-mono text-emerald-700 font-semibold">{stats.firebaseStorage.databaseId}</code>
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
