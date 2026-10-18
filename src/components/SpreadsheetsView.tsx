import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Settings,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Clock,
  Database,
  Layers,
  ShieldCheck,
  Users,
  MapPin,
  Sprout,
  FileText,
  ChevronDown,
  Search,
  Table as TableIcon,
  Eye,
  Filter
} from 'lucide-react';
import { SpreadsheetConfig, SyncLog, Report, User, Subdistrict, Commodity } from '../types';

interface SpreadsheetsViewProps {
  config: SpreadsheetConfig | null;
  logs: SyncLog[];
  reports?: Report[];
  users?: User[];
  subdistricts?: Subdistrict[];
  commodities?: Commodity[];
  reportsCount?: number;
  usersCount?: number;
  subdistrictsCount?: number;
  commoditiesCount?: number;
  onSaveConfig: (config: Partial<SpreadsheetConfig>) => Promise<void>;
  onSyncNow: () => Promise<void>;
  onRefreshLogs: () => void;
}

type SheetKey = 'reports' | 'users' | 'subdistricts' | 'commodities';

export const SpreadsheetsView: React.FC<SpreadsheetsViewProps> = ({
  config,
  logs,
  reports = [],
  users = [],
  subdistricts = [],
  commodities = [],
  reportsCount = 0,
  usersCount = 0,
  subdistrictsCount = 0,
  commoditiesCount = 0,
  onSaveConfig,
  onSyncNow,
  onRefreshLogs
}) => {
  // Configuration State for all 4 sheets
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(config?.autoSyncEnabled ?? true);
  const [spreadsheetId, setSpreadsheetId] = useState(config?.spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  const [sheetName, setSheetName] = useState(config?.sheetName || 'Laporan_Pengaduan_OPT');
  const [sheetNameUsers, setSheetNameUsers] = useState(config?.sheetNameUsers || 'Manajemen_Pengguna_Akses');
  const [sheetNameSubdistricts, setSheetNameSubdistricts] = useState(config?.sheetNameSubdistricts || 'Master_Kecamatan_POPT');
  const [sheetNameCommodities, setSheetNameCommodities] = useState(config?.sheetNameCommodities || 'Master_Komoditas_Tanaman');
  const [sheetGidReports, setSheetGidReports] = useState(config?.sheetGidReports || '0');
  const [sheetGidUsers, setSheetGidUsers] = useState(config?.sheetGidUsers || '');
  const [sheetGidSubdistricts, setSheetGidSubdistricts] = useState(config?.sheetGidSubdistricts || '');
  const [sheetGidCommodities, setSheetGidCommodities] = useState(config?.sheetGidCommodities || '');
  const [webhookUrl, setWebhookUrl] = useState(config?.webhookUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Active sheet table state
  const [activeTableSheet, setActiveTableSheet] = useState<SheetKey>('reports');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const tableSectionRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with prop changes if any
  useEffect(() => {
    if (config) {
      if (config.autoSyncEnabled !== undefined) setAutoSyncEnabled(config.autoSyncEnabled);
      if (config.spreadsheetId) setSpreadsheetId(config.spreadsheetId);
      if (config.sheetName) setSheetName(config.sheetName);
      if (config.sheetNameUsers) setSheetNameUsers(config.sheetNameUsers);
      if (config.sheetNameSubdistricts) setSheetNameSubdistricts(config.sheetNameSubdistricts);
      if (config.sheetNameCommodities) setSheetNameCommodities(config.sheetNameCommodities);
      if (config.sheetGidReports !== undefined) setSheetGidReports(config.sheetGidReports);
      if (config.sheetGidUsers !== undefined) setSheetGidUsers(config.sheetGidUsers);
      if (config.sheetGidSubdistricts !== undefined) setSheetGidSubdistricts(config.sheetGidSubdistricts);
      if (config.sheetGidCommodities !== undefined) setSheetGidCommodities(config.sheetGidCommodities);
      if (config.webhookUrl !== undefined) setWebhookUrl(config.webhookUrl);
    }
  }, [config]);

  const spreadsheetBaseUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'}/edit`;
  const spreadsheetLink = config?.spreadsheetUrl || `${spreadsheetBaseUrl}?usp=sharing`;

  // Function to build Google Sheets URL with specific tab GID if configured
  const getSheetExternalUrl = (sheetKey: SheetKey): string => {
    let gid = '';
    if (sheetKey === 'reports' && sheetGidReports) gid = sheetGidReports;
    if (sheetKey === 'users' && sheetGidUsers) gid = sheetGidUsers;
    if (sheetKey === 'subdistricts' && sheetGidSubdistricts) gid = sheetGidSubdistricts;
    if (sheetKey === 'commodities' && sheetGidCommodities) gid = sheetGidCommodities;

    if (gid) {
      return `${spreadsheetBaseUrl}#gid=${gid}`;
    }
    return spreadsheetLink;
  };

  const getSheetName = (sheetKey: SheetKey): string => {
    switch (sheetKey) {
      case 'reports':
        return sheetName;
      case 'users':
        return sheetNameUsers;
      case 'subdistricts':
        return sheetNameSubdistricts;
      case 'commodities':
        return sheetNameCommodities;
    }
  };

  const actualReports = reports.length > 0 ? reports : [];
  const actualUsers = users.length > 0 ? users : [];
  const actualSubs = subdistricts.length > 0 ? subdistricts : [];
  const actualComms = commodities.length > 0 ? commodities : [];

  const totalAllRows = (reportsCount || actualReports.length) +
    (usersCount || actualUsers.length) +
    (subdistrictsCount || actualSubs.length) +
    (commoditiesCount || actualComms.length);

  // Handler to open table according to configured sheet
  const handleOpenSheetTable = (sheetKey: SheetKey, openExternal: boolean = false) => {
    setActiveTableSheet(sheetKey);
    setSearchQuery('');
    setMenuOpen(false);

    if (openExternal) {
      const url = getSheetExternalUrl(sheetKey);
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Scroll smoothly to table section
    setTimeout(() => {
      if (tableSectionRef.current) {
        tableSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await onSaveConfig({
        autoSyncEnabled,
        spreadsheetId: spreadsheetId.trim(),
        sheetName: sheetName.trim(),
        sheetNameUsers: sheetNameUsers.trim(),
        sheetNameSubdistricts: sheetNameSubdistricts.trim(),
        sheetNameCommodities: sheetNameCommodities.trim(),
        sheetGidReports: sheetGidReports.trim(),
        sheetGidUsers: sheetGidUsers.trim(),
        sheetGidSubdistricts: sheetGidSubdistricts.trim(),
        sheetGidCommodities: sheetGidCommodities.trim(),
        webhookUrl: webhookUrl.trim()
      });
      setSavedSuccess(true);
      setFeedbackMsg({
        text: 'Konfigurasi 4 lembar Google Spreadsheets & GID berhasil diperbarui!',
        type: 'success'
      });
      setTimeout(() => {
        setSavedSuccess(false);
        setFeedbackMsg(null);
      }, 4000);
    } catch (err: any) {
      setFeedbackMsg({ text: `Gagal menyimpan konfigurasi: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      await onSyncNow();
      setFeedbackMsg({
        text: 'Sinkronisasi menyeluruh ke Google Spreadsheets sukses! Seluruh 4 master data (Laporan OPT, Pengguna & Akses, Master Kecamatan, Master Komoditas) telah diperbarui.',
        type: 'success'
      });
      onRefreshLogs();
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err: any) {
      setFeedbackMsg({ text: `Gagal menyinkronkan: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const googleAppsScriptSnippet = `/**
 * SKRIP GOOGLE APPS SCRIPT MULTI-SHEET RESMI (SIGAP-OPT)
 * Menyimpan 4 Master Dataset ke Lembar Terpisah:
 * 1. Data Pengaduan OPT
 * 2. Manajemen Pengguna & Pengaturan Hak Akses
 * 3. Master Kecamatan & Koordinator POPT
 * 4. Master Data Komoditas Tanaman
 */
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action || 'sync_all';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sheet Laporan Pengaduan OPT
    if (action === 'sync_all' || action === 'sync_reports' || action === 'append_or_update') {
      var sRepName = contents.sheetNameReports || contents.sheetName || 'Laporan_Pengaduan_OPT';
      var sRep = ss.getSheetByName(sRepName) || ss.insertSheet(sRepName);

      if (contents.reports && Array.isArray(contents.reports)) {
        sRep.clear();
        sRep.appendRow([
          'Kode Tiket', 'Tanggal Lapor', 'Nama Pelapor', 'No. WhatsApp', 'Kelompok Tani',
          'Desa', 'Kecamatan', 'Kabupaten', 'Komoditas', 'Nama OPT', 'Tipe OPT',
          'Luas Terserang (Ha)', 'Luas Terancam (Ha)', 'Tingkat Serangan',
          'Status Verifikasi', 'Petugas POPT', 'Rekomendasi Gerdal', 'Update Terakhir'
        ]);
        sRep.getRange(1, 1, 1, 18).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
        contents.reports.forEach(function(d) {
          sRep.appendRow([
            d.code, d.dateReported, d.reporterName, d.reporterPhone, d.farmerGroup,
            d.village, d.subdistrict, d.district, d.commodity, d.pestName, d.pestType,
            d.areaAffectedHa, d.areaThreatenedHa, d.severity,
            d.status, d.verifiedBy || '-', d.recommendation || '-', d.updatedAt
          ]);
        });
      } else if (contents.data) {
        var d = contents.data;
        if (sRep.getLastRow() === 0) {
          sRep.appendRow([
            'Kode Tiket', 'Tanggal Lapor', 'Nama Pelapor', 'No. WhatsApp', 'Kelompok Tani',
            'Desa', 'Kecamatan', 'Kabupaten', 'Komoditas', 'Nama OPT', 'Tipe OPT',
            'Luas Terserang (Ha)', 'Luas Terancam (Ha)', 'Tingkat Serangan',
            'Status Verifikasi', 'Petugas POPT', 'Rekomendasi Gerdal', 'Update Terakhir'
          ]);
          sRep.getRange(1, 1, 1, 18).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
        }
        sRep.appendRow([
          d.code, d.dateReported, d.reporterName, d.reporterPhone, d.farmerGroup || '-',
          d.village, d.subdistrict, d.district || '-', d.commodity, d.pestName, d.pestType,
          d.areaAffectedHa, d.areaThreatenedHa, d.severity,
          d.status, d.verifiedBy || '-', d.recommendation || '-', d.updatedAt
        ]);
      }
    }

    // 2. Sheet Manajemen Pengguna & Pengaturan Hak Akses
    if ((action === 'sync_all' || action === 'sync_users') && contents.users) {
      var sUsersName = contents.sheetNameUsers || 'Manajemen_Pengguna_Akses';
      var sUsers = ss.getSheetByName(sUsersName) || ss.insertSheet(sUsersName);
      sUsers.clear();
      sUsers.appendRow([
        'ID Pengguna', 'Username', 'Nama Lengkap', 'Email', 'No. WhatsApp',
        'Peran / Jabatan', 'Wilayah Tugas', 'Status Akun', 'Hak Akses Menu', 'Tanggal Dibuat'
      ]);
      sUsers.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
      contents.users.forEach(function(u) {
        sUsers.appendRow([
          u.id, u.username, u.name, u.email, u.phone,
          u.role, u.region, u.status === 'active' ? 'Aktif' : 'Nonaktif',
          Array.isArray(u.allowedTabs) ? u.allowedTabs.join(', ') : 'Semua Akses',
          u.createdAt
        ]);
      });
    }

    // 3. Sheet Master Kecamatan & Koordinator POPT
    if ((action === 'sync_all' || action === 'sync_subdistricts') && contents.subdistricts) {
      var sSubName = contents.sheetNameSubdistricts || 'Master_Kecamatan_POPT';
      var sSub = ss.getSheetByName(sSubName) || ss.insertSheet(sSubName);
      sSub.clear();
      sSub.appendRow([
        'ID Kecamatan', 'Nama Kecamatan', 'Koordinator POPT', 'Target Luas Lahan (Ha)', 'Keterangan Wilayah'
      ]);
      sSub.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
      contents.subdistricts.forEach(function(s) {
        sSub.appendRow([
          s.id, s.name, s.coordinator, s.targetAreaHa, s.description || '-'
        ]);
      });
    }

    // 4. Sheet Master Data Komoditas Tanaman
    if ((action === 'sync_all' || action === 'sync_commodities') && contents.commodities) {
      var sCommName = contents.sheetNameCommodities || 'Master_Komoditas_Tanaman';
      var sComm = ss.getSheetByName(sCommName) || ss.insertSheet(sCommName);
      sComm.clear();
      sComm.appendRow([
        'ID Komoditas', 'Nama Komoditas', 'Kategori', 'Nama Latin', 'Varietas Unggulan',
        'Hama & Penyakit Sasaran', 'Target Luas Tanam (Ha)', 'Deskripsi'
      ]);
      sComm.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#b45309').setFontColor('#ffffff');
      contents.commodities.forEach(function(c) {
        sComm.appendRow([
          c.id, c.name, c.category, c.latinName || '-', c.varieties || '-',
          Array.isArray(c.commonPests) ? c.commonPests.join('; ') : '-',
          c.targetAreaHa || 0, c.description || '-'
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Seluruh 4 sheet berhasil disinkronkan ke Google Spreadsheets!'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(googleAppsScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Filtered dataset for active table
  const filteredReports = actualReports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q ||
      r.code.toLowerCase().includes(q) ||
      r.reporterName.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      r.subdistrict.toLowerCase().includes(q) ||
      r.commodity.toLowerCase().includes(q) ||
      r.pestName.toLowerCase().includes(q);
    const matchSev = filterSeverity === 'all' || (r.severity && r.severity.toLowerCase() === filterSeverity.toLowerCase());
    return matchQ && matchSev;
  });

  const filteredUsers = actualUsers.filter(u => {
    const q = searchQuery.toLowerCase();
    return !q ||
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.region && u.region.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q);
  });

  const filteredSubs = actualSubs.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q ||
      s.name.toLowerCase().includes(q) ||
      s.coordinator.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q));
  });

  const filteredComms = actualComms.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.latinName && c.latinName.toLowerCase().includes(q)) ||
      (c.varieties && c.varieties.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-teal-900 via-emerald-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 text-xs px-3 py-1 rounded-full font-semibold mb-3 border border-teal-500/30">
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" />
            <span>Integrasi Cloud Google Spreadsheets (Multi-Sheet)</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Sinkronisasi & Database Google Spreadsheets
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Menyimpan seluruh data operasional ke lembar kerja terpisah di satu buku Google Spreadsheet: <strong>Data Pengaduan OPT</strong>, <strong>Manajemen Pengguna & Hak Akses</strong>, <strong>Master Kecamatan & Koordinator POPT</strong>, dan <strong>Master Data Komoditas Tanaman</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-teal-950 font-black text-xs shadow-lg transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan 4 Dataset...' : 'Sinkronkan 4 Dataset'}</span>
          </button>

          <a
            href="/api/sheets/export-all-xlsx"
            download
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2"
            title="Download seluruh 4 sheet dalam satu file Excel multi-tab"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel Multi-Sheet (.xlsx)</span>
          </a>

          {/* Interactive Menu Buka Google Sheets with Dropdown Selection */}
          <div className="relative" ref={menuDropdownRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xs shadow-lg border border-white/80 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <span>Buka Google Sheets</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Pilih Lembar Google Spreadsheet:
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Buka tabel sesuai lembar yang telah dikonfigurasi:
                  </p>
                </div>

                <div className="py-1">
                  {/* Sheet 1 */}
                  <button
                    type="button"
                    onClick={() => handleOpenSheetTable('reports')}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-teal-50 transition-colors ${
                      activeTableSheet === 'reports' ? 'bg-teal-50/80 font-bold text-teal-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">1. {sheetName}</div>
                        <div className="text-[10px] text-slate-500">Data Pengaduan OPT ({actualReports.length} Baris)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">
                      Buka Tabel
                    </span>
                  </button>

                  {/* Sheet 2 */}
                  <button
                    type="button"
                    onClick={() => handleOpenSheetTable('users')}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      activeTableSheet === 'users' ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">2. {sheetNameUsers}</div>
                        <div className="text-[10px] text-slate-500">Pengguna & Akses ({actualUsers.length} Baris)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                      Buka Tabel
                    </span>
                  </button>

                  {/* Sheet 3 */}
                  <button
                    type="button"
                    onClick={() => handleOpenSheetTable('subdistricts')}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${
                      activeTableSheet === 'subdistricts' ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">3. {sheetNameSubdistricts}</div>
                        <div className="text-[10px] text-slate-500">Master Kecamatan ({actualSubs.length} Baris)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      Buka Tabel
                    </span>
                  </button>

                  {/* Sheet 4 */}
                  <button
                    type="button"
                    onClick={() => handleOpenSheetTable('commodities')}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-amber-50 transition-colors ${
                      activeTableSheet === 'commodities' ? 'bg-amber-50/80 font-bold text-amber-900' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Sprout className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">4. {sheetNameCommodities}</div>
                        <div className="text-[10px] text-slate-500">Master Komoditas ({actualComms.length} Baris)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                      Buka Tabel
                    </span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-2 px-3 pb-1 space-y-1">
                  <a
                    href={getSheetExternalUrl(activeTableSheet)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Sheets di Tab Baru</span>
                  </a>
                  <a
                    href={spreadsheetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-[11px] text-center block transition-colors font-medium"
                  >
                    Buka Dokumen Utama Spreadsheet
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 4 Datasets Cards Grid with direct "Buka Tabel" action */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            4 Master Data yang Disimpan di Google Spreadsheets
          </h3>
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
            Total {totalAllRows} Data Tersimpan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pengaduan OPT */}
          <div className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-all ${
            activeTableSheet === 'reports' ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-teal-300'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/sheets/export-csv?table=reports"
                  download
                  className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-colors"
                  title="Download CSV Pengaduan OPT"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </a>
                <a
                  href={getSheetExternalUrl('reports')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-teal-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Buka Lembar di Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sheet 1</span>
              <h4 className="font-black text-slate-900 text-sm">Data Pengaduan OPT</h4>
              <p className="font-mono text-xs text-teal-700 font-bold mt-1">
                {actualReports.length} Laporan Tiket
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 block">Tab Lembar:</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 truncate block">
                  {sheetName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenSheetTable('reports')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  activeTableSheet === 'reports'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Buka Tabel</span>
              </button>
            </div>
          </div>

          {/* Card 2: Pengguna & Hak Akses */}
          <div className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-all ${
            activeTableSheet === 'users' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/sheets/export-csv?table=users"
                  download
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                  title="Download CSV Pengguna & Akses"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </a>
                <a
                  href={getSheetExternalUrl('users')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-blue-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Buka Lembar di Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sheet 2</span>
              <h4 className="font-black text-slate-900 text-sm">Manajemen Pengguna & Akses</h4>
              <p className="font-mono text-xs text-blue-700 font-bold mt-1">
                {actualUsers.length} Akun Petugas & Role
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 block">Tab Lembar:</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 truncate block">
                  {sheetNameUsers}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenSheetTable('users')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  activeTableSheet === 'users'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Buka Tabel</span>
              </button>
            </div>
          </div>

          {/* Card 3: Master Kecamatan */}
          <div className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-all ${
            activeTableSheet === 'subdistricts' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/sheets/export-csv?table=subdistricts"
                  download
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors"
                  title="Download CSV Master Kecamatan"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </a>
                <a
                  href={getSheetExternalUrl('subdistricts')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Buka Lembar di Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sheet 3</span>
              <h4 className="font-black text-slate-900 text-sm">Master Kecamatan & POPT</h4>
              <p className="font-mono text-xs text-emerald-700 font-bold mt-1">
                {actualSubs.length} Kecamatan Binaan
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 block">Tab Lembar:</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 truncate block">
                  {sheetNameSubdistricts}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenSheetTable('subdistricts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  activeTableSheet === 'subdistricts'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Buka Tabel</span>
              </button>
            </div>
          </div>

          {/* Card 4: Master Komoditas */}
          <div className={`bg-white p-5 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-all ${
            activeTableSheet === 'commodities' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'
          }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                <Sprout className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href="/api/sheets/export-csv?table=commodities"
                  download
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1 transition-colors"
                  title="Download CSV Master Komoditas"
                >
                  <Download className="w-3 h-3" />
                  <span>CSV</span>
                </a>
                <a
                  href={getSheetExternalUrl('commodities')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-amber-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Buka Lembar di Google Sheets"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sheet 4</span>
              <h4 className="font-black text-slate-900 text-sm">Master Komoditas Tanaman</h4>
              <p className="font-mono text-xs text-amber-700 font-bold mt-1">
                {actualComms.length} Komoditas Terdaftar
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-slate-400 block">Tab Lembar:</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 truncate block">
                  {sheetNameCommodities}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleOpenSheetTable('commodities')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                  activeTableSheet === 'commodities'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                <span>Buka Tabel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Tinjauan Tabel Lembar Google Spreadsheets (Interactive Live Viewer) */}
      <div ref={tableSectionRef} className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden scroll-mt-6">
        {/* Table Header & Sheet Tabs */}
        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 text-xs px-3 py-1 rounded-full font-semibold border border-teal-500/30">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tinjauan Tabel Lembar Google Spreadsheets</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <span>Lembar:</span>
              <span className="text-teal-300 font-mono underline decoration-teal-500 underline-offset-4">
                {getSheetName(activeTableSheet)}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Menampilkan data langsung sesuai format dan susunan baris lembar Google Spreadsheets yang dikonfigurasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={getSheetExternalUrl(activeTableSheet)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-2"
              title="Buka langsung lembar ini di Google Sheets online"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Google Sheets Online</span>
            </a>

            <a
              href={`/api/sheets/export-csv?table=${activeTableSheet}`}
              download
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center gap-2"
              title="Unduh baris tabel ini sebagai CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* 4 Tabs Selector */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenSheetTable('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTableSheet === 'reports'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. {sheetName}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTableSheet === 'reports' ? 'bg-teal-900 text-teal-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {actualReports.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSheetTable('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTableSheet === 'users'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. {sheetNameUsers}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTableSheet === 'users' ? 'bg-blue-900 text-blue-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {actualUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSheetTable('subdistricts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTableSheet === 'subdistricts'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>3. {sheetNameSubdistricts}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTableSheet === 'subdistricts' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {actualSubs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenSheetTable('commodities')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTableSheet === 'commodities'
                ? 'bg-amber-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>4. {sheetNameCommodities}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTableSheet === 'commodities' ? 'bg-amber-900 text-amber-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {actualComms.length}
            </span>
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Cari data pada lembar ${getSheetName(activeTableSheet)}...`}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            {activeTableSheet === 'reports' && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px]">Tingkat:</span>
                <select
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">Semua</option>
                  <option value="ringan">Ringan</option>
                  <option value="sedang">Sedang</option>
                  <option value="berat">Berat</option>
                  <option value="puso">Puso</option>
                </select>
              </div>
            )}

            <span className="text-slate-400">|</span>
            <span className="font-semibold text-slate-700">
              Menampilkan {
                activeTableSheet === 'reports' ? filteredReports.length :
                activeTableSheet === 'users' ? filteredUsers.length :
                activeTableSheet === 'subdistricts' ? filteredSubs.length :
                filteredComms.length
              } Baris
            </span>
          </div>
        </div>

        {/* Dynamic Table Content matching configured Sheet */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {/* TABEL 1: DATA PENGADUAN OPT */}
          {activeTableSheet === 'reports' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-teal-700 text-white font-semibold uppercase tracking-wider text-[11px] shadow-xs">
                  <th className="py-3 px-3.5">No</th>
                  <th className="py-3 px-3.5">Kode Tiket</th>
                  <th className="py-3 px-3.5">Tanggal Lapor</th>
                  <th className="py-3 px-3.5">Pelapor & WA</th>
                  <th className="py-3 px-3.5">Kelompok Tani</th>
                  <th className="py-3 px-3.5">Desa / Kec.</th>
                  <th className="py-3 px-3.5">Komoditas</th>
                  <th className="py-3 px-3.5">Nama OPT</th>
                  <th className="py-3 px-3.5">Luas (Ha)</th>
                  <th className="py-3 px-3.5">Tingkat Serangan</th>
                  <th className="py-3 px-3.5">Status Penanganan</th>
                  <th className="py-3 px-3.5">Petugas POPT</th>
                  <th className="py-3 px-3.5">Rekomendasi Gerdal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      Tidak ada data pengaduan OPT yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r, idx) => (
                    <tr key={r.id || idx} className="hover:bg-teal-50/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono font-bold text-teal-800 whitespace-nowrap">{r.code}</td>
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(r.dateReported).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.reporterName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.reporterPhone || '-'}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">{r.farmerGroup || '-'}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{r.village}</div>
                        <div className="text-[10px] text-slate-500">Kec. {r.subdistrict}</div>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">{r.commodity}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-rose-700">{r.pestName}</span>
                        <span className="text-[10px] text-slate-400 block">{r.pestType}</span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                        <span className="font-bold text-rose-600">{r.areaAffectedHa}</span> / <span className="text-amber-600">{r.areaThreatenedHa}</span> Ha
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const sevLower = (r.severity || '').toLowerCase();
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              sevLower === 'berat' || sevLower === 'puso'
                                ? 'bg-rose-100 text-rose-800'
                                : sevLower === 'sedang'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {r.severity}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {(() => {
                          const statLower = (r.status || '').toLowerCase();
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              statLower.includes('selesai')
                                ? 'bg-emerald-100 text-emerald-800'
                                : statLower.includes('tindak') || statLower.includes('gerdal')
                                ? 'bg-blue-100 text-blue-800'
                                : statLower.includes('tinjau') || statLower.includes('verifikasi')
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 font-medium whitespace-nowrap">{r.verifiedBy || '-'}</td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={r.recommendation}>
                        {r.recommendation || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABEL 2: MANAJEMEN PENGGUNA & HAK AKSES */}
          {activeTableSheet === 'users' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-800 text-white font-semibold uppercase tracking-wider text-[11px] shadow-xs">
                  <th className="py-3 px-3.5">No</th>
                  <th className="py-3 px-3.5">ID Pengguna</th>
                  <th className="py-3 px-3.5">Username</th>
                  <th className="py-3 px-3.5">Nama Lengkap</th>
                  <th className="py-3 px-3.5">Email Akun</th>
                  <th className="py-3 px-3.5">No. Telepon / WA</th>
                  <th className="py-3 px-3.5">Peran / Jabatan</th>
                  <th className="py-3 px-3.5">Wilayah Tugas</th>
                  <th className="py-3 px-3.5">Status Akun</th>
                  <th className="py-3 px-3.5">Hak Akses Menu</th>
                  <th className="py-3 px-3.5">Tanggal Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Tidak ada data pengguna yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id || idx} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">{u.id}</td>
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-900 whitespace-nowrap">{u.username}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">{u.name}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">{u.email || '-'}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">{u.phone || '-'}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'petugas_popt'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'pengamat'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role === 'admin' ? 'Administrator' : u.role === 'petugas_popt' ? 'Petugas POPT' : u.role === 'pengamat' ? 'Pengamat OPT' : 'Petani'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">{u.region || 'Semua Wilayah'}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          <span>{u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={Array.isArray(u.allowedTabs) ? u.allowedTabs.join(', ') : 'Semua'}>
                        {Array.isArray(u.allowedTabs) && u.allowedTabs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.allowedTabs.slice(0, 3).map(tab => (
                              <span key={tab} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                {tab}
                              </span>
                            ))}
                            {u.allowedTabs.length > 3 && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-bold">
                                +{u.allowedTabs.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Semua Menu</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABEL 3: MASTER KECAMATAN & KOORDINATOR POPT */}
          {activeTableSheet === 'subdistricts' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-emerald-800 text-white font-semibold uppercase tracking-wider text-[11px] shadow-xs">
                  <th className="py-3 px-3.5">No</th>
                  <th className="py-3 px-3.5">ID Kecamatan</th>
                  <th className="py-3 px-3.5">Nama Kecamatan</th>
                  <th className="py-3 px-3.5">Koordinator POPT</th>
                  <th className="py-3 px-3.5">Target Luas Lahan (Ha)</th>
                  <th className="py-3 px-3.5">Keterangan Wilayah Sentra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data kecamatan yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">{s.id}</td>
                      <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">{s.name}</td>
                      <td className="py-3 px-3.5 font-semibold text-emerald-800 whitespace-nowrap">{s.coordinator}</td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {s.targetAreaHa.toLocaleString('id-ID')} Ha
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {s.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TABEL 4: MASTER DATA KOMODITAS TANAMAN */}
          {activeTableSheet === 'commodities' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-amber-700 text-white font-semibold uppercase tracking-wider text-[11px] shadow-xs">
                  <th className="py-3 px-3.5">No</th>
                  <th className="py-3 px-3.5">ID Komoditas</th>
                  <th className="py-3 px-3.5">Nama Komoditas</th>
                  <th className="py-3 px-3.5">Kategori</th>
                  <th className="py-3 px-3.5">Nama Latin</th>
                  <th className="py-3 px-3.5">Varietas Unggulan</th>
                  <th className="py-3 px-3.5">Hama & Penyakit Sasaran</th>
                  <th className="py-3 px-3.5">Target Tanam (Ha)</th>
                  <th className="py-3 px-3.5">Deskripsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Tidak ada data komoditas yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredComms.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-500 whitespace-nowrap">{c.id}</td>
                      <td className="py-3 px-3.5 font-black text-slate-900 whitespace-nowrap">{c.name}</td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 italic text-slate-600 whitespace-nowrap">{c.latinName || '-'}</td>
                      <td className="py-3 px-3.5 text-slate-700 whitespace-nowrap">{c.varieties || '-'}</td>
                      <td className="py-3 px-3.5 text-rose-700 font-medium">
                        {Array.isArray(c.commonPests) ? c.commonPests.join('; ') : '-'}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {(c.targetAreaHa || 0).toLocaleString('id-ID')} Ha
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate" title={c.description}>
                        {c.description || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tersinkronisasi dengan lembar: <strong>{getSheetName(activeTableSheet)}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenSheetTable(activeTableSheet, true)}
              className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Langsung Lembar Ini di Google Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Status Sinkronisasi Otomatis</span>
            <span className="font-bold text-emerald-700 text-sm flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{autoSyncEnabled ? 'Aktif (Realtime Auto-Sync)' : 'Manual'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Baris Tersinkron</span>
            <span className="font-bold text-slate-900 text-sm block mt-0.5">
              {config?.totalSyncedRows || totalAllRows} Baris di 4 Lembar Sheet
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sinkronisasi Terakhir</span>
            <span className="font-mono text-xs font-semibold text-slate-700 block mt-0.5 truncate">
              {config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString('id-ID') : 'Belum sinkron'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Configuration Form & Apps Script Guide */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">Konfigurasi Lembar Google Spreadsheets & GID</h3>
            <p className="text-xs text-slate-500">Atur ID Dokumen Spreadsheet, penamaan 4 lembar tab data, GID tab untuk tautan langsung, dan endpoint Webhook</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Configuration Form */}
          <div className="lg:col-span-6 space-y-4">
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Auto-Sync Otomatis (4 Dataset)</span>
                  <span className="text-[11px] text-slate-500">
                    Sinkronkan otomatis setiap ada perubahan Laporan OPT, Pengguna, Kecamatan, maupun Komoditas
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={e => setAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ID Google Spreadsheet:
                </label>
                <input
                  type="text"
                  required
                  value={spreadsheetId}
                  onChange={e => setSpreadsheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Dapat disalin dari URL Google Sheets: <code>https://docs.google.com/spreadsheets/d/[ID_SPREADSHEET]/edit</code>
                </span>
              </div>

              {/* 4 Tab Names & GIDs */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3.5">
                <span className="text-xs font-black text-slate-800 block flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  <span>Penamaan 4 Lembar Sheet & GID (Google Tab ID):</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sheet 1 */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      1. Nama Tab Laporan OPT:
                    </label>
                    <input
                      type="text"
                      required
                      value={sheetName}
                      onChange={e => setSheetName(e.target.value)}
                      placeholder="Laporan_Pengaduan_OPT"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={sheetGidReports}
                      onChange={e => setSheetGidReports(e.target.value)}
                      placeholder="GID Tab (cth: 0)"
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded text-slate-600 font-mono placeholder:text-slate-400"
                      title="Nomor GID dari URL #gid=..."
                    />
                  </div>

                  {/* Sheet 2 */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      2. Nama Tab Pengguna & Akses:
                    </label>
                    <input
                      type="text"
                      required
                      value={sheetNameUsers}
                      onChange={e => setSheetNameUsers(e.target.value)}
                      placeholder="Manajemen_Pengguna_Akses"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={sheetGidUsers}
                      onChange={e => setSheetGidUsers(e.target.value)}
                      placeholder="GID Tab (cth: 123456789)"
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded text-slate-600 font-mono placeholder:text-slate-400"
                      title="Nomor GID dari URL #gid=..."
                    />
                  </div>

                  {/* Sheet 3 */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      3. Nama Tab Master Kecamatan:
                    </label>
                    <input
                      type="text"
                      required
                      value={sheetNameSubdistricts}
                      onChange={e => setSheetNameSubdistricts(e.target.value)}
                      placeholder="Master_Kecamatan_POPT"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={sheetGidSubdistricts}
                      onChange={e => setSheetGidSubdistricts(e.target.value)}
                      placeholder="GID Tab (cth: 987654321)"
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded text-slate-600 font-mono placeholder:text-slate-400"
                      title="Nomor GID dari URL #gid=..."
                    />
                  </div>

                  {/* Sheet 4 */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      4. Nama Tab Master Komoditas:
                    </label>
                    <input
                      type="text"
                      required
                      value={sheetNameCommodities}
                      onChange={e => setSheetNameCommodities(e.target.value)}
                      placeholder="Master_Komoditas_Tanaman"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                    />
                    <input
                      type="text"
                      value={sheetGidCommodities}
                      onChange={e => setSheetGidCommodities(e.target.value)}
                      placeholder="GID Tab (cth: 555666777)"
                      className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded text-slate-600 font-mono placeholder:text-slate-400"
                      title="Nomor GID dari URL #gid=..."
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  * GID tab opsional dapat dilihat di URL browser Google Sheets saat Anda mengklik tab sheet terkait (contoh: <code>#gid=123456</code>).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  URL Webhook Google Apps Script (Multi-Sheet):
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Jika diisi, server akan mem-POST seluruh 4 dataset secara otomatis ke Google Apps Script Spreadsheet Anda.
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between">
                {savedSuccess && (
                  <span className="text-xs text-teal-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Konfigurasi berhasil disimpan!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Simpan Konfigurasi 4 Sheet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Code snippet & deployment guide */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-teal-600" />
                <span>Kode Google Apps Script (Multi-Sheet doPost)</span>
              </span>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 flex items-center gap-1.5 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Script'}</span>
              </button>
            </div>

            <div className="rounded-2xl bg-slate-900 p-4 font-mono text-[11px] text-teal-300 max-h-[300px] overflow-y-auto border border-slate-800">
              <pre className="whitespace-pre-wrap">{googleAppsScriptSnippet}</pre>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Cara Pasang Script Multi-Sheet di Google Spreadsheet:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                <li>Buka Google Spreadsheet &rarr; menu <strong>Extensions (Ekstensi)</strong> &rarr; <strong>Apps Script</strong>.</li>
                <li>Hapus kode bawaan, tempelkan skrip di atas, lalu klik icon simpan (Save).</li>
                <li>Klik tombol biru <strong>Deploy &rarr; New Deployment</strong>.</li>
                <li>Pilih jenis <strong>Web App</strong>, ubah <i>Who has access</i> ke <strong>Anyone (Siapa saja)</strong>.</li>
                <li>Salin <strong>Web App URL</strong> yang dihasilkan dan tempelkan ke kolom URL Webhook di sebelah kiri.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Riwayat Sinkronisasi 4 Sheet Google Spreadsheets</span>
            </h3>
            <p className="text-xs text-slate-500">Log audit sinkronisasi data OPT, Akun Pengguna & Akses, Master Kecamatan, dan Master Komoditas</p>
          </div>
          <button
            onClick={onRefreshLogs}
            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Segarkan Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4">Jumlah Baris</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Keterangan Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada riwayat sinkronisasi spreadsheet.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {log.type === 'auto' ? 'Otomatis' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {log.rowsCount} Baris
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Sukses</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
