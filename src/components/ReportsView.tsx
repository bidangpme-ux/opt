import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Trash2,
  ExternalLink,
  Edit3,
  X,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  Sheet,
  Image,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Camera,
  UploadCloud,
  RefreshCw,
  MessageCircle,
  Check,
  Copy,
  Share2,
  Building2,
  Users,
  UserCheck,
  Sprout,
  BookUser
} from 'lucide-react';
import { OPTReport, ReportStatus, SeverityLevel, User, Subdistrict, WhatsAppContact } from '../types';
import { api } from '../lib/api';
import { compressImageToTarget, getBase64SizeKB, CompressionResult } from '../lib/imageCompressor';

interface ReportsViewProps {
  reports: OPTReport[];
  subdistricts: Subdistrict[];
  user: User | null;
  selectedReport: OPTReport | null;
  onSelectReport: (report: OPTReport | null) => void;
  onUpdateReport: (id: string, data: Partial<OPTReport>) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onNavigateToForm: () => void;
  initialStatusFilter?: string;
  contacts?: WhatsAppContact[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  reports,
  subdistricts,
  user,
  selectedReport,
  onSelectReport,
  onUpdateReport,
  onDeleteReport,
  onNavigateToForm,
  initialStatusFilter,
  contacts = []
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [subdistrictFilter, setSubdistrictFilter] = useState('all');

  // Edit / Action modal state
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState<ReportStatus>('Menunggu Verifikasi');
  const [editRecommendation, setEditRecommendation] = useState('');
  const [editActionTaken, setEditActionTaken] = useState('');
  const [editVerifiedBy, setEditVerifiedBy] = useState('');
  const [notifyFarmer, setNotifyFarmer] = useState(true);

  // Photo Lightbox state
  const [photoLightbox, setPhotoLightbox] = useState<{
    url: string;
    title: string;
    report?: OPTReport;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const openPhotoLightbox = (url: string, title: string, report?: OPTReport) => {
    setPhotoLightbox({ url, title, report });
    setZoomLevel(1);
  };

  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  const handleUploadModalPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReport) return;

    setIsCompressingPhoto(true);
    try {
      // Automatically compress to <= 300 KB target
      const res = await compressImageToTarget(file, 300, 1440);
      await onUpdateReport(selectedReport.id, {
        photoUrl: res.dataUrl,
        evidencePhotos: [res.dataUrl]
      });
    } catch (err: any) {
      alert('Gagal mengompresi foto: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  // WhatsApp Notification Modal State
  const [waModalReport, setWaModalReport] = useState<OPTReport | null>(null);
  const [waTargetType, setWaTargetType] = useState<'farmer' | 'popt_officer' | 'coordinator' | 'custom'>('farmer');
  const [waCustomPhone, setWaCustomPhone] = useState('');
  const [waCustomName, setWaCustomName] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const filteredContacts = useMemo(() => {
    if (!contacts || contacts.length === 0) return [];
    if (!contactSearchQuery.trim()) return contacts;
    const q = contactSearchQuery.toLowerCase().trim();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.subdistrict && c.subdistrict.toLowerCase().includes(q)) ||
      (c.village && c.village.toLowerCase().includes(q)) ||
      (c.organization && c.organization.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  }, [contacts, contactSearchQuery]);

  const [waTemplate, setWaTemplate] = useState<
    'report_occurred' | 'confirmation' | 'recommendation' | 'visit' | 'alert' | 'custom'
  >('report_occurred');
  const [waMessageText, setWaMessageText] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendResult, setWaSendResult] = useState<{ success: boolean; message: string; waWebUrl?: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const getSubdistrictCoordinator = (subdistrictName: string) => {
    const sub = subdistricts.find(s => s.name.toLowerCase() === subdistrictName.toLowerCase());
    return sub ? sub.coordinator : 'Koordinator POPT Kec. ' + subdistrictName;
  };

  const generateWhatsAppMessage = (
    template: 'report_occurred' | 'confirmation' | 'recommendation' | 'visit' | 'alert' | 'custom',
    report: OPTReport,
    target: 'farmer' | 'popt_officer' | 'coordinator' | 'custom',
    customName?: string
  ) => {
    const formattedDate = new Date(report.dateReported).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const coordinatorName = getSubdistrictCoordinator(report.subdistrict);

    let recipientSalutation = report.reporterName;
    if (target === 'popt_officer') {
      recipientSalutation = `${coordinatorName} (Petugas POPT Kec. ${report.subdistrict})`;
    } else if (target === 'coordinator') {
      recipientSalutation = 'Bpk/Ibu Koordinator Perlindungan Tanaman Pangan & Hortikultura Kab. Tanggamus';
    } else if (target === 'custom') {
      recipientSalutation = customName || 'Rekan Petani / Poktan';
    }

    if (template === 'report_occurred') {
      return `📢 *PEMBERITAHUAN: TELAH TERJADI LAPORAN PENGADUAN SERANGAN OPT*
_Sistem Informasi Pengendalian OPT (SIPOPT) Dinas Tanaman Pangan & Hortikultura Kab. Tanggamus_

Yth. *${recipientSalutation}*,

Diberitahukan bahwa *TELAH TERJADI LAPORAN PENGADUAN SERANGAN OPT* di wilayah lapangan dengan rincian data sebagai berikut:

📋 *RINCIAN DATA LAPORAN PENGADUAN OPT:*
• *Nomor Tiket:* ${report.code}
• *Tanggal & Waktu Lapor:* ${formattedDate}
• *Nama Pelapor:* ${report.reporterName} (${report.reporterPhone || 'Nomor HP belum diisi'})
• *Kelompok Tani:* ${report.farmerGroup || 'Mandiri / Umum'}
• *Lokasi Serangan:* Pekon/Desa ${report.village}, Dusun ${report.reporterAddress || '-'}, Kec. ${report.subdistrict}
• *Komoditas Tanaman:* ${report.commodity} (Umur: ${report.plantAgeWeeks} Minggu)
• *Jenis OPT / Sasaran:* ${report.pestName} (${report.pestType})
• *Tingkat Keparahan:* ${report.severity}
• *Luasan Lahan Terserang:* ${report.areaAffectedHa} Ha
• *Luasan Lahan Terancam:* ${report.areaThreatenedHa} Ha
• *Gejala di Lapangan:* ${report.symptoms ? report.symptoms.replace(/\n/g, ' ') : '-'}

📊 *Status Penanganan Saat Ini:* ${report.status}
${report.photoUrl ? `📸 *Foto Bukti Serangan:* ${report.photoUrl}` : '📸 *Foto Bukti Serangan:* Belum dilampirkan'}

Diharapkan kepada Petugas POPT Wilayah Kecamatan ${report.subdistrict}, Penyuluh Pertanian (PPL), dan Koordinator Lapangan untuk segera melakukan verifikasi lapang, penetapan ambang kendali ekonomi, dan koordinasi langkah Gerakan Pengendalian (Gerdal).

_Dinas Tanaman Pangan dan Hortikultura Kabupaten Tanggamus_`;
    }

    if (template === 'confirmation') {
      return `📢 *KONFIRMASI PENERIMAAN LAPORAN OPT - SIPOPT TANGGAMUS*

Halo Yth. *${recipientSalutation}*,
Laporan pengaduan serangan Organisme Pengganggu Tanaman (OPT) telah resmi terdaftar dalam sistem informasi Dinas Tanaman Pangan dan Hortikultura Kabupaten Tanggamus.

📋 *Rincian Laporan Pengaduan:*
• *Nomor Tiket:* ${report.code}
• *Tanggal Lapor:* ${formattedDate}
• *Komoditas:* ${report.commodity}
• *OPT Sasaran:* ${report.pestName} (${report.pestType})
• *Tingkat Serangan:* ${report.severity}
• *Luas Terserang:* ${report.areaAffectedHa} Ha (Terancam: ${report.areaThreatenedHa} Ha)
• *Lokasi Hamparan:* Desa ${report.village}, Dusun ${report.reporterAddress || '-'}, Kec. ${report.subdistrict}
• *Kelompok Tani:* ${report.farmerGroup || 'Mandiri / Umum'}
• *Status Saat Ini:* ${report.status}

🔍 *Tindak Lanjut:*
Laporan ini telah masuk antrean penanganan Petugas POPT Wilayah Kecamatan ${report.subdistrict}. Petugas akan segera memverifikasi dan memberikan rekomendasi teknis pengendalian (PHT).

Simpan pesan ini sebagai bukti nomor tiket pengaduan resmi Anda.
_Dinas Tanaman Pangan dan Hortikultura Kabupaten Tanggamus_`;
    }

    if (template === 'recommendation') {
      return `📢 *REKOMENDASI PENGENDALIAN OPT (PHT) - TIKET [${report.code}]*

Yth. *${recipientSalutation}*,
Berikut adalah rekomendasi teknis Pengendalian Hama Terpadu (PHT) untuk serangan *${report.pestName}* pada komoditas *${report.commodity}* di Desa ${report.village}, Kec. ${report.subdistrict}:

📊 *Status Penanganan:* ${report.status}
🌾 *Komoditas & Umur:* ${report.commodity} (${report.plantAgeWeeks} Minggu)
⚠️ *Intensitas Serangan:* ${report.severity} (${report.areaAffectedHa} Ha Terserang / ${report.areaThreatenedHa} Ha Terancam)

💡 *Rekomendasi Petugas (PHT):*
${report.recommendation || '1. Lakukan sanitasi lingkungan dan pembersihan gulma di sekitar pematang.\n2. Lakukan pengamatan rutin 2 kali seminggu.\n3. Utamakan penggunaan agens hayati / musuh alami / pestisida nabati sesuai anjuran Petugas POPT.'}

🛠 *Tindakan Lapangan / Gerdal:*
${report.actionTaken || 'Penjadwalan Gerakan Pengendalian (Gerdal) bersama Kelompok Tani setempat.'}

👨‍🌾 *Petugas Penanggung Jawab:* ${report.verifiedBy || coordinatorName}

Mari bersama mengendalikan OPT secara bijaksana dan ramah lingkungan demi keberlanjutan hasil panen.
_SIPOPT Tanggamus - Bidang Tanaman Pangan & Hortikultura_`;
    }

    if (template === 'visit') {
      return `📢 *PEMBERITAHUAN JADWAL KUNJUNGAN VERIFIKASI POPT [${report.code}]*

Yth. *${recipientSalutation}*
(Kelompok Tani: ${report.farmerGroup || 'Mandiri'}, Desa ${report.village}),

Diberitahukan bahwa Petugas Pengamat Organisme Pengganggu Tanaman (POPT) Wilayah Kecamatan *${report.subdistrict}* (*${coordinatorName}*) akan melakukan kunjungan dan pengamatan langsung ke lokasi lahan Anda terkait laporan serangan *${report.pestName}*.

📍 *Lokasi:* Desa ${report.village}, Dusun ${report.reporterAddress || '-'}, Kec. ${report.subdistrict}
🌱 *Komoditas:* ${report.commodity} (No. Tiket: ${report.code})

Mohon kesediaan pemilik lahan / perwakilan Poktan untuk dapat mendampingi petugas di lapangan agar penentuan batas serangan dan rekomendasi Gerdal dapat segera diputuskan.

_Tim POPT Dinas Tanaman Pangan dan Hortikultura Kab. Tanggamus_`;
    }

    if (template === 'alert') {
      return `⚠️ *PERINGATAN DINI POTENSI SERANGAN OPT - KEC. ${report.subdistrict.toUpperCase()}*

Perhatian kepada Petugas POPT, Korluh BPP, dan Kelompok Tani se-Kecamatan ${report.subdistrict}!

Terdeteksi adanya serangan *${report.pestName}* dengan intensitas *${report.severity}* pada tanaman *${report.commodity}* di:
📍 *Desa:* ${report.village}
📏 *Luas Terserang:* ${report.areaAffectedHa} Ha
🚨 *Luas Terancam:* ${report.areaThreatenedHa} Ha
🎫 *Nomor Tiket:* ${report.code}

Dihimbau kepada seluruh petani dan pengurus Poktan di wilayah sekitar untuk meningkatkan frekuensi pengamatan petak hamparan dan segera melapor bila ditemukan gejala serangan meluas.

_SIPOPT Tanggamus - Sistem Deteksi Dini & Perlindungan Tanaman_`;
    }

    return `Laporan Serangan OPT Tiket: ${report.code}
Yth. ${recipientSalutation},
Laporan pengaduan OPT untuk komoditas ${report.commodity} (Serangan: ${report.pestName}) di Desa ${report.village}, Kec. ${report.subdistrict} saat ini berstatus: ${report.status}.
Rekomendasi: ${report.recommendation || 'Dalam peninjauan petugas lapangan.'}

_SIPOPT Dinas Pertanian Kab. Tanggamus_`;
  };

  const handleOpenWaModal = (report: OPTReport) => {
    setWaModalReport(report);
    setWaTargetType('farmer');
    setWaCustomPhone('');
    setWaCustomName('');
    setContactSearchQuery('');
    const defaultTpl = 'report_occurred';
    setWaTemplate(defaultTpl);
    setWaMessageText(generateWhatsAppMessage(defaultTpl, report, 'farmer'));
    setWaSendResult(null);
    setCopiedText(false);
  };

  const handleSelectWaTarget = (target: 'farmer' | 'popt_officer' | 'coordinator' | 'custom') => {
    setWaTargetType(target);
    if (waModalReport) {
      setWaMessageText(generateWhatsAppMessage(waTemplate, waModalReport, target, waCustomName));
    }
  };

  const handleSelectWaTemplate = (
    template: 'report_occurred' | 'confirmation' | 'recommendation' | 'visit' | 'alert' | 'custom'
  ) => {
    setWaTemplate(template);
    if (waModalReport) {
      setWaMessageText(generateWhatsAppMessage(template, waModalReport, waTargetType, waCustomName));
    }
  };

  const getActiveTargetDetails = () => {
    if (!waModalReport) return { name: '', phone: '', label: '' };
    const coordinator = getSubdistrictCoordinator(waModalReport.subdistrict);

    switch (waTargetType) {
      case 'farmer':
        return {
          name: waModalReport.reporterName,
          phone: waModalReport.reporterPhone || '',
          label: `Petani / Pelapor (Desa ${waModalReport.village})`
        };
      case 'popt_officer':
        return {
          name: coordinator,
          phone: '085846046927',
          label: `Petugas POPT Kec. ${waModalReport.subdistrict}`
        };
      case 'coordinator':
        return {
          name: 'Della Sefa Aulanda, A.Md.Ak. (Koordinator Kabupaten)',
          phone: '081273488762',
          label: 'Dinas Pertanian Kab. Tanggamus'
        };
      case 'custom':
        return {
          name: waCustomName || 'Kontak Kustom',
          phone: waCustomPhone,
          label: 'Kontak Manual'
        };
    }
  };

  const handleSendWaNotification = async (openDirectWeb: boolean = false) => {
    if (!waModalReport) return;
    const target = getActiveTargetDetails();

    if (!target.phone || !target.phone.trim()) {
      alert('Nomor WhatsApp tujuan belum diisi.');
      return;
    }

    let cleanPhone = target.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    const waWebUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessageText)}`;

    if (openDirectWeb) {
      window.open(waWebUrl, '_blank');
      try {
        await api.reports.notifyWhatsApp(waModalReport.id, {
          targetPhone: cleanPhone,
          targetName: target.name,
          targetRole: waTargetType,
          message: waMessageText,
          sendViaBaileys: false
        });
        await onUpdateReport(waModalReport.id, { waNotificationSent: true });
      } catch {}
      setWaSendResult({
        success: true,
        message: `Pesan terbuka di WhatsApp untuk nomor +${cleanPhone}`,
        waWebUrl
      });
      return;
    }

    setIsSendingWa(true);
    try {
      const res = await api.reports.notifyWhatsApp(waModalReport.id, {
        targetPhone: cleanPhone,
        targetName: target.name,
        targetRole: waTargetType,
        message: waMessageText,
        sendViaBaileys: true
      });
      setWaSendResult(res);
      if (res.success) {
        await onUpdateReport(waModalReport.id, { waNotificationSent: true });
      }
    } catch (err: any) {
      setWaSendResult({
        success: false,
        message: err.message || 'Gagal mengirim pesan otomatis via bot.',
        waWebUrl
      });
    } finally {
      setIsSendingWa(false);
    }
  };

  // Sync state modal when selectedReport changes
  React.useEffect(() => {
    if (selectedReport) {
      setEditStatus(selectedReport.status);
      setEditRecommendation(selectedReport.recommendation || '');
      setEditActionTaken(selectedReport.actionTaken || '');
      setEditVerifiedBy(selectedReport.verifiedBy || (user ? user.name : 'Petugas POPT Lapangan'));
    }
  }, [selectedReport, user]);

  const filteredReports = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (subdistrictFilter !== 'all' && r.subdistrict !== subdistrictFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        r.code.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q) ||
        r.pestName.toLowerCase().includes(q) ||
        r.commodity.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q) ||
        r.subdistrict.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSaveAction = async () => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await onUpdateReport(selectedReport.id, {
        status: editStatus,
        recommendation: editRecommendation,
        actionTaken: editActionTaken,
        verifiedBy: editVerifiedBy
      });
      onSelectReport(null);
    } catch (err: any) {
      alert(`Gagal memperbarui status: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data laporan pengaduan ${code}? Data akan dihapus secara permanen.`)) {
      await onDeleteReport(id);
      if (selectedReport && selectedReport.id === id) {
        onSelectReport(null);
      }
    }
  };

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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar & Penanganan Pengaduan OPT
          </h2>
          <p className="text-xs text-slate-500">
            Kelola verifikasi lapangan, penugasan Gerdal, dan rekomendasi PHT bagi petani
          </p>
        </div>

        <button
          onClick={onNavigateToForm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Pengaduan Baru</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari no tiket, nama pelapor, hama, komoditas..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="all">Semua Status Penanganan</option>
              <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
              <option value="Sedang Ditinjau Petugas">Sedang Ditinjau Petugas</option>
              <option value="Tindak Lanjut / Gerdal">Tindak Lanjut / Gerdal</option>
              <option value="Selesai">Selesai / Terkendali</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="all">Semua Tingkat Kerusakan</option>
              <option value="Ringan">Ringan (&lt; 25%)</option>
              <option value="Sedang">Sedang (25 - 50%)</option>
              <option value="Berat">Berat (51 - 85%)</option>
              <option value="Puso">Puso / Fuso (&gt; 85%)</option>
            </select>
          </div>

          {/* Subdistrict Filter */}
          <div>
            <select
              value={subdistrictFilter}
              onChange={e => setSubdistrictFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="all">Semua Wilayah Kecamatan</option>
              {subdistricts.map(s => (
                <option key={s.id} value={s.name}>
                  Kecamatan {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick filter indicators */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Menampilkan <strong>{filteredReports.length}</strong> dari total <strong>{reports.length}</strong> pengaduan OPT
          </div>
          {(statusFilter !== 'all' || severityFilter !== 'all' || subdistrictFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSeverityFilter('all');
                setSubdistrictFilter('all');
                setSearch('');
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">No. Tiket</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4 text-center">Foto Bukti</th>
                <th className="py-3 px-4">Pelapor & Poktan</th>
                <th className="py-3 px-4">Lokasi Lapangan</th>
                <th className="py-3 px-4">Komoditas & Hama/OPT</th>
                <th className="py-3 px-4">Luas (Ha)</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Status & Tindakan</th>
                <th className="py-3 px-4 text-center">Sheets</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Tidak ada laporan yang sesuai kriteria filter.</p>
                    <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onSelectReport(report)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{report.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-sans font-normal">
                        {report.source === 'baileys_whatsapp' ? 'WhatsApp Baileys' : report.source === 'fonnte_whatsapp' ? 'WhatsApp Fonnte' : 'Portal Web'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {new Date(report.dateReported).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Foto Bukti Serangan Column */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      {report.photoUrl || (report.evidencePhotos && report.evidencePhotos.length > 0) ? (
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPhotoLightbox(report.photoUrl || report.evidencePhotos![0], `Foto Bukti Serangan - Tiket ${report.code}`, report)}
                            className="group/thumb relative w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs hover:shadow-md transition-all hover:scale-105 bg-slate-100 flex items-center justify-center cursor-pointer"
                            title="Klik untuk melihat foto ukuran penuh"
                          >
                            <img
                              src={report.photoUrl || report.evidencePhotos![0]}
                              alt={`Bukti ${report.code}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye className="w-5 h-5 drop-shadow-xs" />
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => openPhotoLightbox(report.photoUrl || report.evidencePhotos![0], `Foto Bukti Serangan - Tiket ${report.code}`, report)}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat Foto</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 text-slate-400">
                          <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Image className="w-4 h-4 text-slate-300" />
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Tidak ada</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-[160px]">
                      <div className="font-bold text-slate-900 truncate">{report.reporterName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{report.farmerGroup}</div>
                      {report.reporterPhone && (
                        <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{report.reporterPhone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-[160px]">
                      <div className="font-semibold text-slate-800 truncate">Kec. {report.subdistrict}</div>
                      <div className="text-[11px] text-slate-500 truncate">Desa {report.village}</div>
                      {report.reporterAddress && (
                        <div className="text-[10px] text-slate-400 truncate" title={report.reporterAddress}>
                          {report.reporterAddress}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-bold text-slate-900 truncate">{report.pestName}</div>
                      <div className="text-[11px] text-slate-600 truncate">{report.commodity}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                          {report.pestType}
                        </span>
                        {(report.photoUrl || (report.evidencePhotos && report.evidencePhotos.length > 0)) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5" title="Ada Foto Lokasi Terserang">
                            📸 Foto
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-rose-700">{report.areaAffectedHa} Ha</div>
                      <div className="text-[10px] text-slate-400">Terancam: {report.areaThreatenedHa} Ha</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${severityColor(report.severity)}`}>
                        {report.severity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge(report.status)}`}>
                        {report.status}
                      </span>
                      {report.verifiedBy && (
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[140px]">
                          PJ: {report.verifiedBy}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {report.syncedToSheets ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>Tersinkron</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Antrean</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWaModal(report)}
                          className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg border border-green-300 transition-colors flex items-center gap-1 text-[11px] shadow-2xs cursor-pointer"
                          title="Kirim Notifikasi WhatsApp (Pilih Tujuan Pengiriman)"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>Kirim WA</span>
                        </button>
                        <button
                          onClick={() => onSelectReport(report)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                          title="Tindak Lanjut & Rekomendasi"
                        >
                          Verifikasi
                        </button>
                        <button
                          onClick={() => handleDelete(report.id, report.code)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail & Tindak Lanjut Verifikasi Lapangan */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded font-mono">
                    {selectedReport.code}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${severityColor(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </span>
                  <span className="text-xs text-emerald-200">
                    {new Date(selectedReport.dateReported).toLocaleString('id-ID')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {selectedReport.pestName} ({selectedReport.pestType})
                </h3>
                <p className="text-xs text-emerald-100">
                  Tanaman: {selectedReport.commodity} &bull; Umur: {selectedReport.plantAgeWeeks} Minggu
                </p>
              </div>
              <button
                onClick={() => onSelectReport(null)}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Field Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Pelapor</span>
                  <span className="font-bold text-slate-800">{selectedReport.reporterName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Alamat / Dusun / RT</span>
                  <span className="font-bold text-slate-800">{selectedReport.reporterAddress || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Kelompok Tani</span>
                  <span className="font-bold text-slate-800">{selectedReport.farmerGroup || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">No. WhatsApp / HP</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-bold text-slate-800">{selectedReport.reporterPhone || '-'}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenWaModal(selectedReport)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                      title="Kirim Pesan WhatsApp (Pilih Tujuan Pengiriman)"
                    >
                      <MessageCircle className="w-3 h-3 text-green-700" />
                      <span>Kirim WA</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Wilayah Desa</span>
                  <span className="font-bold text-slate-800">Desa {selectedReport.village}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Kecamatan</span>
                  <span className="font-bold text-slate-800">Kec. {selectedReport.subdistrict}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Luas Serangan</span>
                  <span className="font-bold text-rose-700">{selectedReport.areaAffectedHa} Ha (Terancam: {selectedReport.areaThreatenedHa} Ha)</span>
                </div>
              </div>

              {/* Foto Lokasi Serangan (Upload WhatsApp / Lapangan) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-4 h-4 text-emerald-600" />
                    <span>Foto Bukti Kerusakan Tanaman & Gejala OPT:</span>
                  </span>
                  {(selectedReport.photoUrl || (selectedReport.evidencePhotos && selectedReport.evidencePhotos.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => openPhotoLightbox(selectedReport.photoUrl || selectedReport.evidencePhotos![0], `Foto Bukti Serangan - Tiket ${selectedReport.code}`, selectedReport)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 underline"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Buka Layar Penuh</span>
                    </button>
                  )}
                </label>
                {(selectedReport.photoUrl || (selectedReport.evidencePhotos && selectedReport.evidencePhotos.length > 0)) ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div 
                      onClick={() => openPhotoLightbox(selectedReport.photoUrl || selectedReport.evidencePhotos![0], `Foto Bukti Serangan - Tiket ${selectedReport.code}`, selectedReport)}
                      className="group/img relative w-full sm:w-48 h-36 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs cursor-pointer shrink-0 bg-slate-900"
                      title="Klik untuk memperbesar foto"
                    >
                      <img
                        src={selectedReport.photoUrl || selectedReport.evidencePhotos![0]}
                        alt="Foto Bukti Kerusakan Tanaman"
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs">
                        <Eye className="w-4 h-4" />
                        <span>Perbesar</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">Bukti Foto Kerusakan Tanaman</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Tersimpan di Database (≤ 300 KB)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-mono">
                          ~{getBase64SizeKB(selectedReport.photoUrl || selectedReport.evidencePhotos![0])} KB
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Foto otomatis terkompresi ke target ≤ 300 KB guna menjaga efisiensi penyimpanan database Firestore & kecepatan akses.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openPhotoLightbox(selectedReport.photoUrl || selectedReport.evidencePhotos![0], `Foto Bukti Serangan - Tiket ${selectedReport.code}`, selectedReport)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau Foto Penuh</span>
                        </button>
                        <a
                          href={selectedReport.photoUrl || selectedReport.evidencePhotos![0]}
                          download={`Bukti_OPT_${selectedReport.code}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh</span>
                        </a>

                        {/* Upload / Ganti Foto Lapangan */}
                        <label className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200">
                          {isCompressingPhoto ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              <span>Mengompresi (≤ 300 KB)...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ganti Foto (Kompresi 300KB)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            disabled={isCompressingPhoto}
                            onChange={handleUploadModalPhoto}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                    <Image className="w-8 h-8 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-xs text-slate-600 font-semibold">
                        Pelapor belum melampirkan foto bukti serangan untuk laporan ini.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Petugas POPT dapat mengunggah foto hasil pemeriksaan lapangan (otomatis terkompresi ke ukuran ≤ 300 KB).
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs">
                      {isCompressingPhoto ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mengompresi Foto (≤ 300 KB)...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Unggah Foto Bukti Lapangan</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={isCompressingPhoto}
                        onChange={handleUploadModalPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Symptoms reported */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gejala & Kerusakan di Lapangan:
                </label>
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900 leading-relaxed">
                  {selectedReport.symptoms || 'Tidak ada deskripsi rinci gejala.'}
                </div>
              </div>

              {/* Form Update Penanganan Petugas */}
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4 text-emerald-600" />
                    <span>Lembar Verifikasi & Penanganan Petugas POPT</span>
                  </h4>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                    Otomatis Notifikasi WA Petani
                  </span>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ubah Status Penanganan:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: 'Menunggu Verifikasi', label: 'Menunggu', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                      { val: 'Sedang Ditinjau Petugas', label: 'Ditinjau POPT', color: 'border-blue-400 bg-blue-50 text-blue-900' },
                      { val: 'Tindak Lanjut / Gerdal', label: 'Gerdal Massal', color: 'border-purple-400 bg-purple-50 text-purple-900' },
                      { val: 'Selesai', label: 'Selesai/Terkendali', color: 'border-emerald-400 bg-emerald-50 text-emerald-900' },
                    ].map(s => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setEditStatus(s.val as ReportStatus)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                          editStatus === s.val
                            ? `${s.color} ring-2 ring-emerald-500 shadow-xs`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified By */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Petugas Verifikator (POPT / PPL):
                  </label>
                  <input
                    type="text"
                    value={editVerifiedBy}
                    onChange={e => setEditVerifiedBy(e.target.value)}
                    placeholder="Nama lengkap dan gelar petugas penanggung jawab"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Official Recommendation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rekomendasi Teknis Pengendalian Hama Terpadu (PHT):
                  </label>
                  <textarea
                    rows={3}
                    value={editRecommendation}
                    onChange={e => setEditRecommendation(e.target.value)}
                    placeholder="Contoh: Aplikasi agens hayati Beauveria bassiana 5 gr/liter air, pengaturan air macak-macak, kurangi urea..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Gerdal Action Taken */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tindakan Lapangan / Gerakan Pengendalian (Gerdal):
                  </label>
                  <textarea
                    rows={2}
                    value={editActionTaken}
                    onChange={e => setEditActionTaken(e.target.value)}
                    placeholder="Contoh: Telah dilakukan Gerdal massal serentak bersama kelompok tani Sri Rejeki..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Auto Sync Notice */}
                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-100/70 p-2.5 rounded-xl">
                  <Sheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Menyimpan perubahan ini akan otomatis memperbarui database <strong>Google Spreadsheets</strong> dan mengirimkan pemberitahuan WhatsApp ke petani.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onSelectReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenWaModal(selectedReport)}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Kirim Notifikasi WhatsApp (Pilih Tujuan Pengiriman)"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Notifikasi WhatsApp</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveAction}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Menyimpan & Menyinkronkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan & Kirim Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Modal Pratinjau Foto Penuh */}
      {photoLightbox && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPhotoLightbox(null)}
        >
          {/* Top Bar Controls */}
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2 border-b border-white/10 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-0.5 max-w-[65%]">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded font-mono">
                  {photoLightbox.report?.code || 'FOTO OPT'}
                </span>
                <span className="bg-white/10 text-emerald-300 border border-white/10 text-[10px] font-bold px-2 py-0.5 rounded">
                  Ukuran: ~{getBase64SizeKB(photoLightbox.url)} KB (≤ 300 KB)
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {photoLightbox.title}
                </span>
              </div>
              {photoLightbox.report && (
                <p className="text-xs text-slate-300 truncate">
                  Pelapor: <strong>{photoLightbox.report.reporterName}</strong> &bull; Desa {photoLightbox.report.village}, Kec. {photoLightbox.report.subdistrict} &bull; {photoLightbox.report.commodity} ({photoLightbox.report.pestName})
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Perbesar (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Perkecil (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <a
                href={photoLightbox.url}
                download={`Foto_Bukti_${photoLightbox.report?.code || 'OPT'}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Unduh / Download Foto Asli"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Unduh</span>
              </a>
              <button
                type="button"
                onClick={() => setPhotoLightbox(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors ml-1 sm:ml-2"
                title="Tutup Pratinjau (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Photo Container */}
          <div 
            className="flex-1 w-full max-w-4xl flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative max-h-[78vh] max-w-full overflow-auto rounded-2xl shadow-2xl border border-white/10 bg-slate-900/60 flex items-center justify-center p-2">
              <img
                src={photoLightbox.url}
                alt={photoLightbox.title}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-h-[72vh] max-w-full object-contain rounded-xl transition-transform duration-200 shadow-2xl"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pb-1 text-center">
            Klik di luar gambar atau ketuk tombol X untuk menutup
          </div>
        </div>
      )}

      {/* Modal Kirim Notifikasi WhatsApp (Pilih Tujuan Pengiriman) */}
      {waModalReport && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 flex items-start justify-between shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded font-mono">
                    {waModalReport.code}
                  </span>
                  <span className="bg-green-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 fill-current" />
                    <span>WhatsApp Notification</span>
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Kirim Notifikasi WhatsApp</span>
                </h3>
                <p className="text-xs text-emerald-100">
                  Laporan: {waModalReport.commodity} ({waModalReport.pestName}) &bull; Desa {waModalReport.village}, Kec. {waModalReport.subdistrict}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWaModalReport(null)}
                className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Notifikasi Hasil Kirim (Jika Ada) */}
              {waSendResult && (
                <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in ${
                  waSendResult.success 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <div className="space-y-1 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      {waSendResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Status Pengiriman Berhasil</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Catatan Pengiriman</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed">{waSendResult.message}</p>
                    {waSendResult.waWebUrl && (
                      <a
                        href={waSendResult.waWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Chat di WhatsApp Web / Aplikasi &rarr;</span>
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setWaSendResult(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* 1. Pilih Tujuan Pengiriman (Kirim Ke Mana?) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Pilih Tujuan Pengiriman (Kirim Ke Mana?):</span>
                  <span className="text-[11px] font-normal text-slate-500">Klik salah satu opsi</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opsi A: Pelapor / Petani */}
                  <div
                    onClick={() => handleSelectWaTarget('farmer')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      waTargetType === 'farmer'
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      waTargetType === 'farmer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Sprout className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">Pelapor / Petani</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 uppercase">Petani</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                        {waModalReport.reporterName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {waModalReport.reporterPhone || '(Nomor belum diisi)'}
                      </div>
                    </div>
                  </div>

                  {/* Opsi B: Petugas POPT Wilayah */}
                  <div
                    onClick={() => handleSelectWaTarget('popt_officer')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      waTargetType === 'popt_officer'
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      waTargetType === 'popt_officer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">Petugas POPT Wilayah</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 uppercase">Wilayah</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                        {getSubdistrictCoordinator(waModalReport.subdistrict)}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Kecamatan {waModalReport.subdistrict}
                      </div>
                    </div>
                  </div>

                  {/* Opsi C: Koordinator Kabupaten / Dinas Pertanian */}
                  <div
                    onClick={() => handleSelectWaTarget('coordinator')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      waTargetType === 'coordinator'
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      waTargetType === 'coordinator' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">Dinas / Koordinator Kab.</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">Kabupaten</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                        Della Sefa Aulanda, A.Md.Ak.
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        0812-7348-8762
                      </div>
                    </div>
                  </div>

                  {/* Opsi D: Nomor Kustom Lainnya */}
                  <div
                    onClick={() => handleSelectWaTarget('custom')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      waTargetType === 'custom'
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      waTargetType === 'custom' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">Nomor WhatsApp Bebas</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 uppercase">Kustom</span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        {waCustomName || 'Ketua Poktan / Babinsa / PPL'}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        Input nomor manual &rarr;
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Khusus Opsi Kustom */}
                {waTargetType === 'custom' && (
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs animate-in fade-in">
                    {contacts && contacts.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                            <BookUser className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Pilih Cepat dari Buku Kontak WhatsApp ({contacts.length} Tersimpan):</span>
                          </label>
                          {contactSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setContactSearchQuery('')}
                              className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={contactSearchQuery}
                            onChange={e => setContactSearchQuery(e.target.value)}
                            placeholder="Cari nama, peran (Camat/POPT), kecamatan, atau no HP..."
                            className="w-full pl-8 pr-7 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                          />
                          {contactSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setContactSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                              title="Hapus pencarian"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Filtered Dropdown */}
                        <select
                          value=""
                          onChange={e => {
                            const found = contacts.find(c => c.id === e.target.value);
                            if (found) {
                              setWaCustomName(found.name + (found.organization ? ` (${found.organization})` : ''));
                              setWaCustomPhone(found.phone);
                              if (waModalReport) {
                                setWaMessageText(
                                  generateWhatsAppMessage(
                                    waTemplate,
                                    waModalReport,
                                    'custom',
                                    found.name + (found.organization ? ` (${found.organization})` : '')
                                  )
                                );
                              }
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="" disabled>
                            {filteredContacts.length > 0
                              ? `-- Pilih dari ${filteredContacts.length} kontak ${contactSearchQuery ? 'yang cocok' : 'tersimpan'} --`
                              : '-- Tidak ada kontak yang sesuai pencarian --'}
                          </option>
                          {filteredContacts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.category} - Kec. {c.subdistrict}) - {c.phone}
                            </option>
                          ))}
                        </select>

                        {/* Quick Match Selection Cards when searching */}
                        {contactSearchQuery.trim() && filteredContacts.length > 0 && (
                          <div className="max-h-36 overflow-y-auto space-y-1 pt-1 scrollbar-thin">
                            {filteredContacts.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setWaCustomName(c.name + (c.organization ? ` (${c.organization})` : ''));
                                  setWaCustomPhone(c.phone);
                                  if (waModalReport) {
                                    setWaMessageText(
                                      generateWhatsAppMessage(
                                        waTemplate,
                                        waModalReport,
                                        'custom',
                                        c.name + (c.organization ? ` (${c.organization})` : '')
                                      )
                                    );
                                  }
                                }}
                                className="w-full text-left p-1.5 px-2 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 flex items-center justify-between text-[11px] transition-colors cursor-pointer group shadow-2xs"
                              >
                                <div className="truncate mr-2">
                                  <span className="font-bold text-slate-800 group-hover:text-emerald-900">{c.name}</span>
                                  <span className="text-[10px] text-emerald-800 ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 font-semibold">{c.category}</span>
                                  <span className="text-slate-500 block text-[10px]">
                                    Kec. {c.subdistrict} {c.village ? `• Desa ${c.village}` : ''} {c.organization ? `• ${c.organization}` : ''}
                                  </span>
                                </div>
                                <span className="font-mono text-emerald-700 font-bold text-[11px] shrink-0 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {c.phone}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {contactSearchQuery.trim() && filteredContacts.length === 0 && (
                          <p className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-lg border border-amber-200">
                            🔍 Tidak ditemukan kontak dengan kata kunci "{contactSearchQuery}". Coba ketik nama lain, peran (Camat/POPT), atau kecamatan.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nama Penerima:
                        </label>
                        <input
                          type="text"
                          value={waCustomName}
                          onChange={e => {
                            setWaCustomName(e.target.value);
                            if (waModalReport) {
                              setWaMessageText(generateWhatsAppMessage(waTemplate, waModalReport, 'custom', e.target.value));
                            }
                          }}
                          placeholder="Contoh: Bpk. Joko (Ketua Poktan)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Nomor WhatsApp Tujuan:
                        </label>
                        <input
                          type="tel"
                          value={waCustomPhone}
                          onChange={e => setWaCustomPhone(e.target.value)}
                          placeholder="Contoh: 081298765432"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Pilih Template Pesan */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>2. Pilih Format / Template Pesan:</span>
                  <span className="text-[11px] font-normal text-slate-500">Otomatis terisi rincian tiket</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('report_occurred')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'report_occurred'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-500/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📢 Telah Terjadi Laporan OPT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('confirmation')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'confirmation'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>📋 Konfirmasi Bukti Tiket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('recommendation')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'recommendation'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>💊 Rekomendasi Gerdal (PHT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('visit')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'visit'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>🚗 Jadwal Kunjungan Lapangan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('alert')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'alert'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚠️ Peringatan Dini Hamparan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectWaTemplate('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      waTemplate === 'custom'
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>✏️ Tulis Bebas</span>
                  </button>
                </div>
              </div>

              {/* 3. Kotak Isi Pesan WhatsApp (Bisa Diedit) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>3. Isi Pesan WhatsApp (Dapat Diedit):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(waMessageText);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2000);
                      }}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Pesan</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {waMessageText.length} karakter
                    </span>
                  </div>
                </div>
                <textarea
                  rows={9}
                  value={waMessageText}
                  onChange={e => setWaMessageText(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {/* Target Confirmation Bar */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                  <div className="truncate">
                    <span className="text-slate-600">Penerima Terpilih: </span>
                    <strong className="text-slate-900">{getActiveTargetDetails().name || 'Kontak'}</strong>
                    <span className="text-slate-500 font-mono text-[11px] ml-1">
                      ({getActiveTargetDetails().phone || 'Nomor belum ada'})
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-800 font-bold shrink-0">
                  {getActiveTargetDetails().label}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setWaModalReport(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tombol Buka di WhatsApp Web / HP */}
                <button
                  type="button"
                  onClick={() => handleSendWaNotification(true)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Buka langsung aplikasi WhatsApp atau WhatsApp Web"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Buka di WhatsApp (Web / HP)</span>
                </button>

                {/* Tombol Kirim Otomatis via Bot Server */}
                <button
                  type="button"
                  disabled={isSendingWa}
                  onClick={() => handleSendWaNotification(false)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  title="Kirim pesan langsung melalui Bot WhatsApp Server"
                >
                  {isSendingWa ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mengirim Notifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Otomatis (Bot Server)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
