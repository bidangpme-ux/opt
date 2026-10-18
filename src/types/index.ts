export type SeverityLevel = 'Ringan' | 'Sedang' | 'Berat' | 'Puso';
export type PestType = 'Hama' | 'Penyakit';
export type ReportStatus = 'Menunggu Verifikasi' | 'Sedang Ditinjau Petugas' | 'Tindak Lanjut / Gerdal' | 'Selesai';
export type ReportSource = 'fonnte_whatsapp' | 'baileys_whatsapp' | 'web';
export type UserRole = 'admin' | 'petugas_popt' | 'pengamat' | 'petani';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface OPTReport {
  id: string;
  code: string;
  reporterName: string;
  reporterPhone: string;
  reporterAddress?: string;
  farmerGroup: string;
  village: string;
  subdistrict: string;
  district: string;
  commodity: string;
  pestName: string;
  pestType: PestType;
  areaAffectedHa: number;
  areaThreatenedHa: number;
  severity: SeverityLevel;
  plantAgeWeeks: number;
  symptoms: string;
  recommendation?: string;
  status: ReportStatus;
  source: ReportSource;
  dateReported: string;
  updatedAt: string;
  verifiedBy?: string;
  actionTaken?: string;
  syncedToSheets: boolean;
  sheetsRowId?: number;
  waNotificationSent: boolean;
  location?: LocationCoordinates;
  photoUrl?: string;
  evidencePhotos?: string[];
}

export type WaSessionStep = 'IDLE' | 'NAME' | 'ADDRESS' | 'VILLAGE' | 'SUBDISTRICT' | 'AREA' | 'PHOTO';

export interface WaReportSession {
  phone: string;
  step: WaSessionStep;
  data: {
    reporterName?: string;
    reporterAddress?: string;
    village?: string;
    subdistrict?: string;
    commodity?: string;
    pestName?: string;
    areaAffectedHa?: number;
    photoUrl?: string;
    evidencePhotos?: string[];
  };
  lastActive: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  region: string;
  status: 'active' | 'inactive';
  createdAt: string;
  passwordHash?: string;
  allowedTabs?: TabType[];
}

export type Report = OPTReport;
export type Commodity = CommodityItem;

export interface FonnteLog {
  id: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  phone: string;
  senderName?: string;
  message: string;
  status: 'delivered' | 'processed' | 'simulated' | 'failed';
  reportCode?: string;
  photoUrl?: string;
}

export interface FonnteConfig {
  apiToken: string;
  senderNumber: string;
  autoReplyEnabled: boolean;
  autoNotificationOnUpdate: boolean;
  webhookUrl: string;
  webhookSecret: string;
}

export interface BaileysStatus {
  status: 'disconnected' | 'connecting' | 'scan_needed' | 'connected';
  qrCodeUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  connectedAt?: string;
  uptimeSeconds?: number;
  lastError?: string | null;
  mode: 'baileys_open_source';
  sessionSavedInCloud?: boolean;
  hasSavedSession?: boolean;
  autoReconnectEnabled?: boolean;
  keepAliveActive?: boolean;
  storageLayers?: string[];
}

export interface BaileysLog {
  id: string;
  direction: 'incoming' | 'outgoing';
  phone: string;
  senderName?: string;
  message: string;
  status: 'sent' | 'received' | 'failed';
  timestamp: string;
  source: 'baileys_whatsapp';
}

export interface SpreadsheetConfig {
  autoSyncEnabled: boolean;
  spreadsheetId: string;
  sheetName: string; // Sheet 1: Data Pengaduan OPT
  sheetNameUsers?: string; // Sheet 2: Manajemen Pengguna & Pengaturan Hak Akses
  sheetNameSubdistricts?: string; // Sheet 3: Master Kecamatan & Koordinator POPT
  sheetNameCommodities?: string; // Sheet 4: Master Data Komoditas Tanaman
  sheetGidReports?: string; // GID tab lembar OPT
  sheetGidUsers?: string; // GID tab lembar Pengguna
  sheetGidSubdistricts?: string; // GID tab lembar Kecamatan
  sheetGidCommodities?: string; // GID tab lembar Komoditas
  webhookUrl: string;
  lastSyncedAt: string;
  totalSyncedRows: number;
  syncedReportsCount?: number;
  syncedUsersCount?: number;
  syncedSubdistrictsCount?: number;
  syncedCommoditiesCount?: number;
  userEmail?: string;
  integrationMode?: 'email_auto' | 'advanced_script';
  spreadsheetUrl?: string;
  connectedAt?: string;
  status?: 'connected' | 'disconnected' | 'pending';
  accessPermission?: 'editor' | 'viewer';
}

export interface SyncLog {
  id: string;
  timestamp: string;
  type: 'auto' | 'manual';
  status: 'success' | 'failed';
  rowsCount: number;
  message: string;
}

export type TabType =
  | 'dashboard'
  | 'reports'
  | 'report-form'
  | 'smart-corner'
  | 'fonnte'
  | 'sheets'
  | 'export'
  | 'users'
  | 'subdistricts'
  | 'commodities'
  | 'contacts'
  | 'guide';

export type ContactCategory =
  | 'Petani'
  | 'Petugas POPT'
  | 'Koordinator Wilayah'
  | 'Dinas Pertanian'
  | 'Camat'
  | 'Koordinator Penyuluh'
  | 'PPL / Penyuluh'
  | 'Kelompok Tani'
  | 'Mitra / Babinsa'
  | 'Lainnya';

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  category: ContactCategory;
  subdistrict: string;
  village?: string;
  organization?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MenuTabInfo {
  id: TabType;
  label: string;
  desc: string;
  category: 'Menu Utama' | 'Integrasi & Master Data';
  adminOnly?: boolean;
}

export const ALL_MENU_TABS: MenuTabInfo[] = [
  { id: 'dashboard', label: 'Dashboard & Pantau', desc: 'Statistik, luas serangan, kalkulasi ancaman & sebaran wilayah', category: 'Menu Utama' },
  { id: 'reports', label: 'Daftar Pengaduan OPT', desc: 'Daftar tiket pengaduan, verifikasi status & rekomendasi pengendalian PHT', category: 'Menu Utama' },
  { id: 'report-form', label: '+ Input Laporan OPT', desc: 'Formulir pelaporan pengaduan serangan hama & penyakit tanaman', category: 'Menu Utama' },
  { id: 'export', label: 'Ekspor Excel (.xlsx)', desc: 'Unduh rekapitulasi data pengaduan OPT ke dokumen spreadsheet Excel', category: 'Menu Utama' },
  { id: 'smart-corner', label: 'Pojok Pintar (Gemini AI)', desc: 'Konsultan AI Pertanian cerdas, diagnosa gejala hama & katalog Agens Pengendali Hayati', category: 'Menu Utama' },
  { id: 'contacts', label: 'Buku Kontak WhatsApp', desc: 'Simpan & kelola kontak WhatsApp petani, kelompok tani, POPT, dan dinas', category: 'Integrasi & Master Data' },
  { id: 'fonnte', label: 'WhatsApp Chatbot Fonnte', desc: 'Pengaturan API Fonnte, webhook & simulasi pengaduan WhatsApp petani', category: 'Integrasi & Master Data' },
  { id: 'sheets', label: 'Google Spreadsheets', desc: 'Sinkronisasi cloud otomatis ke akun Google Spreadsheets Dinas', category: 'Integrasi & Master Data' },
  { id: 'subdistricts', label: 'Master Data Kecamatan', desc: 'Pengelolaan daftar kecamatan binaan, luas target & koordinator POPT', category: 'Integrasi & Master Data' },
  { id: 'commodities', label: 'Master Komoditas Tanaman', desc: 'Kelola varietas tanaman pangan, hortikultura & daftar hama sasaran', category: 'Integrasi & Master Data' },
  { id: 'users', label: 'Manajemen Pengguna & Akses', desc: 'Kelola akun petugas dan konfigurasi hak akses menu sistem (Khusus Admin)', category: 'Integrasi & Master Data', adminOnly: true }
];

export const DEFAULT_ROLE_TABS: Record<UserRole, TabType[]> = {
  admin: ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'sheets', 'contacts', 'subdistricts', 'commodities', 'users'],
  petugas_popt: ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'contacts', 'subdistricts', 'commodities'],
  pengamat: ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'contacts', 'commodities'],
  petani: ['dashboard', 'report-form', 'export', 'smart-corner', 'contacts']
};

export interface CommodityItem {
  id: string;
  name: string;
  category: 'Tanaman Pangan' | 'Hortikultura' | 'Perkebunan' | string;
  latinName?: string;
  varieties?: string;
  commonPests?: string[];
  targetAreaHa?: number;
  description?: string;
  createdAt?: string;
}

export interface CommodityCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt?: string;
}

export interface Subdistrict {
  id: string;
  name: string;
  coordinator: string;
  targetAreaHa: number;
  description?: string;
  createdAt?: string;
}

export interface CollectionStorageMetric {
  count: number;
  bytes: number;
  formatted: string;
}

export interface FirebaseStorageStats {
  configured: boolean;
  databaseId: string;
  projectId: string;
  storageBucket?: string;
  status: 'connected' | 'disconnected' | 'local_mode';
  quotaBytes: number;
  quotaFormatted: string;
  usedBytes: number;
  usedFormatted: string;
  remainingBytes: number;
  remainingFormatted: string;
  usedPercentage: number;
  remainingPercentage: number;
  totalDocuments: number;
  collectionBreakdown: {
    reports: CollectionStorageMetric;
    users: CollectionStorageMetric;
    subdistricts: CollectionStorageMetric;
    commodities: CollectionStorageMetric;
    commodityCategories: CollectionStorageMetric;
    settings: CollectionStorageMetric;
    logs: CollectionStorageMetric;
  };
  dailyReadQuota: number;
  dailyWriteQuota: number;
  dailyDeleteQuota: number;
  lastSyncedAt?: string;
}

export interface DashboardStats {
  totalReports: number;
  waitingVerification: number;
  inProgress: number;
  resolved: number;
  totalAreaAffectedHa: number;
  totalAreaThreatenedHa: number;
  severityCounts: {
    Ringan: number;
    Sedang: number;
    Berat: number;
    Puso: number;
  };
  topPests: {
    pestName: string;
    count: number;
    commodity: string;
  }[];
  recentReports: OPTReport[];
  subdistrictCounts: Record<string, number>;
  subdistricts: Subdistrict[];
  firebaseStorage?: FirebaseStorageStats;
}

export interface DatabaseSystemStatus {
  mode: 'postgresql' | 'local_json_firestore';
  postgresConnected: boolean;
  host?: string;
  database?: string;
  port?: number;
  user?: string;
  serverPort: number;
  autoPortAdjusted: boolean;
  totalReportsInDb: number;
  totalUsersInDb: number;
  casaOsReady: boolean;
  autoMigrationStatus?: string;
  tables?: string[];
}
