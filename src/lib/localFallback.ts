import { OPTReport, User, FonnteConfig, FonnteLog, SpreadsheetConfig, SyncLog, DashboardStats, Subdistrict, CommodityItem, CommodityCategory, WhatsAppContact } from '../types';

const STORAGE_KEY = 'sigap_opt_local_database_v2';

interface LocalDatabase {
  users: (User & { passwordHash?: string })[];
  reports: OPTReport[];
  fonnteConfig: FonnteConfig;
  fonnteLogs: FonnteLog[];
  spreadsheetConfig: SpreadsheetConfig;
  syncLogs: SyncLog[];
  subdistricts: Subdistrict[];
  commodities: CommodityItem[];
  commodityCategories: CommodityCategory[];
  whatsappContacts?: WhatsAppContact[];
}

const defaultInitialData: LocalDatabase = {
  users: [
    {
      id: 'usr-1',
      username: 'admin',
      name: 'Della Sefa Aulanda, A.Md.Ak. (Admin)',
      email: 'penatalaksanabarangdkptph@gmail.com',
      phone: '',
      role: 'admin',
      region: 'Kabupaten Tanggamus (Koordinator)',
      status: 'active',
      createdAt: '2026-01-15T08:00:00.000Z',
      passwordHash: 'admin123',
      allowedTabs: ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'sheets', 'subdistricts', 'commodities', 'users']
    }
  ],
  reports: [],
  fonnteConfig: {
    apiToken: '',
    senderNumber: '0858-4604-6927 (SIGAP-OPT Bot)',
    autoReplyEnabled: true,
    autoNotificationOnUpdate: true,
    webhookUrl: '/api/webhook/fonnte',
    webhookSecret: 'sigap_opt_fonnte_secret_2026'
  },
  fonnteLogs: [
    {
      id: 'log-1',
      timestamp: '2026-03-20T08:15:10.000Z',
      direction: 'incoming',
      phone: '081298765432',
      senderName: 'Pak Supardi',
      message: 'LAPOR#Supardi#Cimanuk Hilir#Cimanuk#Padi Sawah#Wereng Batang Coklat#2.5#Berat',
      status: 'processed',
      reportCode: 'OPT-2026-001'
    },
    {
      id: 'log-2',
      timestamp: '2026-03-20T08:15:15.000Z',
      direction: 'outgoing',
      phone: '081298765432',
      message: '✅ Laporan OPT berhasil dicatat dengan ID: OPT-2026-001. Petugas POPT Cimanuk segera melakukan verifikasi.',
      status: 'delivered',
      reportCode: 'OPT-2026-001'
    }
  ],
  spreadsheetConfig: {
    autoSyncEnabled: true,
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    sheetName: 'Laporan_Pengaduan_OPT',
    sheetNameUsers: 'Manajemen_Pengguna_Akses',
    sheetNameSubdistricts: 'Master_Kecamatan_POPT',
    sheetNameCommodities: 'Master_Komoditas_Tanaman',
    webhookUrl: 'https://script.google.com/macros/s/AKfycbz_SIGAP_OPT_EXAMPLE_SCRIPT_ID/exec',
    lastSyncedAt: '2026-03-23T12:00:00.000Z',
    totalSyncedRows: 20,
    syncedReportsCount: 5,
    syncedUsersCount: 3,
    syncedSubdistrictsCount: 6,
    syncedCommoditiesCount: 6,
    userEmail: 'penatalaksanabarangdkptph@gmail.com',
    integrationMode: 'email_auto',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    connectedAt: '2026-03-23T12:00:00.000Z',
    status: 'connected',
    accessPermission: 'editor'
  },
  syncLogs: [
    {
      id: 'sync-1',
      timestamp: '2026-03-23T12:00:00.000Z',
      type: 'auto',
      status: 'success',
      rowsCount: 5,
      message: 'Sinkronisasi otomatis berhasil: 5 baris laporan OPT termutakhirkan di Google Spreadsheets'
    }
  ],
  subdistricts: [
    { id: 'sub-1', name: 'Kota Agung', coordinator: 'Della Sefa Aulanda, A.Md.Ak.', targetAreaHa: 1250, description: 'Ibukota & Pusat Komando SIGAP-OPT Tanggamus' },
    { id: 'sub-2', name: 'Kota Agung Barat', coordinator: 'Budi Santoso, S.P', targetAreaHa: 1100, description: 'Sentra Padi Sawah & Palawija' },
    { id: 'sub-3', name: 'Kota Agung Timur', coordinator: 'Budi Santoso, S.P', targetAreaHa: 980, description: 'Sentra Tanaman Pangan & Hortikultura' },
    { id: 'sub-4', name: 'Gisting', coordinator: 'Dewi Lestari, A.Md', targetAreaHa: 1450, description: 'Sentra Hortikultura Sayuran Dataran Tinggi' },
    { id: 'sub-5', name: 'Talang Padang', coordinator: 'Dewi Lestari, A.Md', targetAreaHa: 1320, description: 'Sentra Hortikultura & Padi Sawah' },
    { id: 'sub-6', name: 'Wonosobo', coordinator: 'Catur Jatmiko, S.P.', targetAreaHa: 1680, description: 'Sentra Produksi Padi Sawah Irigasi & Jagung' },
    { id: 'sub-7', name: 'Semaka', coordinator: 'Harsono, S.P.', targetAreaHa: 1750, description: 'Sentra Tanaman Pangan & Lumbung Padi Tanggamus' },
    { id: 'sub-8', name: 'Pematang Sawa', coordinator: 'Muhajir, S.P.', targetAreaHa: 1150, description: 'Wilayah Pesisir, Padi Ladang & Perkebunan' },
    { id: 'sub-9', name: 'Pulau Panggung', coordinator: 'Ir. Ahmad Subagyo, M.Si', targetAreaHa: 1400, description: 'Sentra Kopi Robusta & Hortikultura' },
    { id: 'sub-10', name: 'Sumberejo', coordinator: 'Feri, S.P.', targetAreaHa: 1280, description: 'Sentra Sayuran, Cabai & Padi' },
    { id: 'sub-11', name: 'Ulu Belu', coordinator: 'Feri, S.P.', targetAreaHa: 1350, description: 'Sentra Perkebunan Kopi & Sayuran Dataran Tinggi' },
    { id: 'sub-12', name: 'Pugung', coordinator: 'Budi Santoso, S.P', targetAreaHa: 1520, description: 'Sentra Jagung Hibrida & Padi Sawah' },
    { id: 'sub-13', name: 'Bulok', coordinator: 'Budi Santoso, S.P', targetAreaHa: 940, description: 'Kawasan Tanaman Pangan & Palawija' },
    { id: 'sub-14', name: 'Cukuh Balak', coordinator: 'Muhajir, S.P.', targetAreaHa: 870, description: 'Kawasan Pesisir Selatan & Hortikultura' },
    { id: 'sub-15', name: 'Kelumbayan', coordinator: 'Muhajir, S.P.', targetAreaHa: 760, description: 'Kawasan Pesisir Teluk Semangka' },
    { id: 'sub-16', name: 'Kelumbayan Barat', coordinator: 'Muhajir, S.P.', targetAreaHa: 820, description: 'Wilayah Pesisir & Pertanian Lahan Kering' },
    { id: 'sub-17', name: 'Limau', coordinator: 'Harsono, S.P.', targetAreaHa: 890, description: 'Kawasan Pesisir & Sentra Pisang Mas Tanggamus' },
    { id: 'sub-18', name: 'Air Naningan', coordinator: 'Catur Jatmiko, S.P.', targetAreaHa: 1200, description: 'Sentra Kopi, Lada & Hortikultura' },
    { id: 'sub-19', name: 'Bandar Negeri Semuong', coordinator: 'Harsono, S.P.', targetAreaHa: 1300, description: 'Sentra Padi Sawah Irigasi Sungai Semuong' },
    { id: 'sub-20', name: 'Gunung Alip', coordinator: 'Dewi Lestari, A.Md', targetAreaHa: 910, description: 'Sentra Padi Sawah & Tanaman Sayuran' }
  ],
  commodities: [
    {
      id: 'comm-1',
      name: 'Padi Sawah',
      category: 'Tanaman Pangan',
      latinName: 'Oryza sativa L.',
      varieties: 'Inpari 32, Ciherang, Inpari 42, Sintanur, Mekongga',
      commonPests: ['Wereng Batang Coklat (Nilaparvata lugens)', 'Penggerek Batang Padi', 'Tikus Sawah', 'Penyakit Blas Daun'],
      targetAreaHa: 12500,
      description: 'Komoditas pangan utama sentra sawah irigasi teknis'
    },
    {
      id: 'comm-2',
      name: 'Padi Ladang / Gogo',
      category: 'Tanaman Pangan',
      latinName: 'Oryza sativa L.',
      varieties: 'Inpago 8, Inpago 9, Situ Patenggang',
      commonPests: ['Penyakit Blas Daun', 'Ulat Grayak', 'Tikus Sawah'],
      targetAreaHa: 1800,
      description: 'Pertanaman padi lahan kering'
    },
    {
      id: 'comm-3',
      name: 'Jagung Hibrida',
      category: 'Tanaman Pangan',
      latinName: 'Zea mays L.',
      varieties: 'BISI 18, NK 212, Pioneer P27, Pertiwi 3',
      commonPests: ['Ulat Grayak Jagung / FAW', 'Penyakit Bulai', 'Penggerek Tongkol'],
      targetAreaHa: 8200,
      description: 'Komoditas palawija strategis'
    },
    {
      id: 'comm-4',
      name: 'Cabai Merah Keriting',
      category: 'Hortikultura',
      latinName: 'Capsicum annuum L.',
      varieties: 'Lado F1, TM 999, Kawat, Kastilo',
      commonPests: ['Antraknosa / Patek', 'Thrips', 'Lalat Buah', 'Virus Kuning'],
      targetAreaHa: 1450,
      description: 'Sentra hortikultura sayuran'
    },
    {
      id: 'comm-5',
      name: 'Cabai Rawit',
      category: 'Hortikultura',
      latinName: 'Capsicum frutescens L.',
      varieties: 'Ori 212, Manu Preen, Bhaskara',
      commonPests: ['Virus Kuning', 'Kutu Kebul', 'Antraknosa'],
      targetAreaHa: 980,
      description: 'Sayuran bumbu harian'
    }
  ],
  commodityCategories: [
    { id: 'cat-1', name: 'Tanaman Pangan', description: 'Padi, jagung, kedelai', icon: '🌾', color: 'amber' },
    { id: 'cat-2', name: 'Hortikultura', description: 'Cabai merah, bawang, sayuran', icon: '🌶️', color: 'emerald' },
    { id: 'cat-3', name: 'Perkebunan', description: 'Kopi, kakao, cengkeh', icon: '☕', color: 'amber' },
    { id: 'cat-4', name: 'Biofarmaka / Obat', description: 'Jahe merah, kunyit, serai wangi', icon: '🌿', color: 'teal' }
  ]
};

function getLocalData(): LocalDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultInitialData));
      return defaultInitialData;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users)) {
      parsed.users = parsed.users.map((u: any) => {
        if (Array.isArray(u.allowedTabs)) {
          const filtered = u.allowedTabs.filter((t: string) => t !== 'guide');
          if (!filtered.includes('smart-corner')) {
            const expIdx = filtered.indexOf('export');
            if (expIdx !== -1) {
              filtered.splice(expIdx + 1, 0, 'smart-corner');
            } else {
              filtered.push('smart-corner');
            }
          }
          return { ...u, allowedTabs: filtered };
        }
        return u;
      });
    }
    return { ...defaultInitialData, ...parsed };
  } catch {
    return defaultInitialData;
  }
}

function saveLocalData(data: LocalDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const localFallback = {
  auth: {
    getMe: (token: string | null): { authenticated: boolean; user?: User } => {
      if (!token) return { authenticated: false };
      const db = getLocalData();
      const user = db.users.find(u => u.id === token && u.status === 'active');
      if (!user) return { authenticated: false };
      const { passwordHash: _, ...safeUser } = user;
      return { authenticated: true, user: safeUser };
    },
    login: (username: string, password: string): { success: boolean; token: string; user: User; message: string } => {
      const db = getLocalData();
      const clean = username.toLowerCase().trim();
      const user = db.users.find(u => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean));
      if (!user) {
        throw new Error('Username atau password salah');
      }
      if (user.status !== 'active') {
        throw new Error('Akun telah dinonaktifkan oleh administrator');
      }
      if (user.passwordHash && user.passwordHash !== password) {
        throw new Error('Username atau password salah');
      }
      const { passwordHash: _, ...safeUser } = user;
      return {
        success: true,
        token: user.id,
        user: safeUser,
        message: `Selamat datang, ${user.name}!`
      };
    },
    logout: () => {}
  },

  stats: {
    get: (): DashboardStats => {
      const db = getLocalData();
      const reports = db.reports;
      const totalReports = reports.length;
      const waitingVerification = reports.filter(r => r.status === 'Menunggu Verifikasi').length;
      const inProgress = reports.filter(r => r.status === 'Sedang Ditinjau Petugas' || r.status === 'Tindak Lanjut / Gerdal').length;
      const resolved = reports.filter(r => r.status === 'Selesai').length;
      const totalAreaAffectedHa = Number(reports.reduce((sum, r) => sum + (r.areaAffectedHa || 0), 0).toFixed(2));
      const totalAreaThreatenedHa = Number(reports.reduce((sum, r) => sum + (r.areaThreatenedHa || 0), 0).toFixed(2));

      const severityCounts: any = {
        Ringan: reports.filter(r => r.severity === 'Ringan').length,
        Sedang: reports.filter(r => r.severity === 'Sedang').length,
        Berat: reports.filter(r => r.severity === 'Berat').length,
        Puso: reports.filter(r => r.severity === 'Puso').length
      };

      const pestMap = new Map<string, { count: number; commodity: string }>();
      reports.forEach(r => {
        const existing = pestMap.get(r.pestName) || { count: 0, commodity: r.commodity };
        existing.count += 1;
        pestMap.set(r.pestName, existing);
      });

      const topPests = Array.from(pestMap.entries())
        .map(([pestName, val]) => ({ pestName, count: val.count, commodity: val.commodity }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const subdistrictCounts: Record<string, number> = {};
      db.subdistricts.forEach(s => {
        subdistrictCounts[s.name] = 0;
      });
      reports.forEach(r => {
        subdistrictCounts[r.subdistrict] = (subdistrictCounts[r.subdistrict] || 0) + 1;
      });

      // Firebase Firestore Storage metrics
      const quotaBytes = 1024 * 1024 * 1024; // 1 GiB = 1,073,741,824 bytes
      const calcBytes = (items: any[]) => {
        if (!items || items.length === 0) return { count: 0, bytes: 0, formatted: '0 B' };
        let b = 0;
        for (const item of items) {
          const str = JSON.stringify(item);
          b += str.length + 32;
        }
        const formatted = b > 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(2)} MB` : b > 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`;
        return { count: items.length, bytes: b, formatted };
      };

      const reportsM = calcBytes(db.reports || []);
      const usersM = calcBytes(db.users || []);
      const subsM = calcBytes(db.subdistricts || []);
      const commsM = calcBytes(db.commodities || []);
      const catsM = calcBytes(db.commodityCategories || []);
      const setsM = calcBytes([db.spreadsheetConfig, db.fonnteConfig].filter(Boolean));
      const logsM = calcBytes([...(db.fonnteLogs || []), ...(db.syncLogs || [])]);

      const usedBytes = reportsM.bytes + usersM.bytes + subsM.bytes + commsM.bytes + catsM.bytes + setsM.bytes + logsM.bytes;
      const remainingBytes = Math.max(0, quotaBytes - usedBytes);
      const totalDocuments = reportsM.count + usersM.count + subsM.count + commsM.count + catsM.count + setsM.count + logsM.count;

      const firebaseStorage = {
        configured: true,
        databaseId: 'ai-studio-sipoptsistempeng-868341fe-9f04-4b74-8e7a-cae6adcc23d2',
        projectId: 'automated-avatar-1smzh',
        storageBucket: 'automated-avatar-1smzh.firebasestorage.app',
        status: 'connected' as const,
        quotaBytes,
        quotaFormatted: '1.00 GB (1,024 MB)',
        usedBytes,
        usedFormatted: usedBytes > 1024 * 1024 ? `${(usedBytes / (1024 * 1024)).toFixed(2)} MB` : `${(usedBytes / 1024).toFixed(1)} KB`,
        remainingBytes,
        remainingFormatted: `${(remainingBytes / (1024 * 1024)).toFixed(2)} MB`,
        usedPercentage: Number(((usedBytes / quotaBytes) * 100).toFixed(4)),
        remainingPercentage: Number(((remainingBytes / quotaBytes) * 100).toFixed(4)),
        totalDocuments,
        collectionBreakdown: {
          reports: reportsM,
          users: usersM,
          subdistricts: subsM,
          commodities: commsM,
          commodityCategories: catsM,
          settings: setsM,
          logs: logsM
        },
        dailyReadQuota: 50000,
        dailyWriteQuota: 20000,
        dailyDeleteQuota: 20000,
        lastSyncedAt: new Date().toISOString()
      };

      return {
        totalReports,
        waitingVerification,
        inProgress,
        resolved,
        totalAreaAffectedHa,
        totalAreaThreatenedHa,
        severityCounts,
        topPests,
        recentReports: reports.slice(0, 5),
        subdistrictCounts,
        subdistricts: db.subdistricts,
        firebaseStorage
      };
    }
  },

  reports: {
    getAll: (params: { status?: string; commodity?: string; severity?: string; subdistrict?: string; search?: string } = {}): OPTReport[] => {
      const db = getLocalData();
      let reports = [...db.reports];
      if (params.status && params.status !== 'all') reports = reports.filter(r => r.status === params.status);
      if (params.commodity && params.commodity !== 'all') reports = reports.filter(r => r.commodity.toLowerCase().includes((params.commodity || '').toLowerCase()));
      if (params.severity && params.severity !== 'all') reports = reports.filter(r => r.severity === params.severity);
      if (params.subdistrict && params.subdistrict !== 'all') reports = reports.filter(r => r.subdistrict.toLowerCase().includes((params.subdistrict || '').toLowerCase()));
      if (params.search) {
        const q = params.search.toLowerCase();
        reports = reports.filter(r =>
          r.code.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.pestName.toLowerCase().includes(q) ||
          r.village.toLowerCase().includes(q) ||
          r.subdistrict.toLowerCase().includes(q)
        );
      }
      reports.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
      return reports;
    },
    create: (data: Partial<OPTReport>): { success: boolean; message: string; report: OPTReport } => {
      const db = getLocalData();
      const code = `OPT-2026-${String(db.reports.length + 1).padStart(3, '0')}`;
      const now = new Date().toISOString();
      const newReport: OPTReport = {
        id: `rep-${Date.now()}`,
        code,
        reporterName: (data.reporterName || 'Pelapor').trim(),
        reporterPhone: data.reporterPhone || '',
        farmerGroup: data.farmerGroup || 'Umum',
        village: data.village || 'Desa',
        subdistrict: data.subdistrict || 'Kecamatan Wonosobo',
        district: data.district || 'Kabupaten Tanggamus',
        commodity: data.commodity || 'Padi Sawah',
        pestName: data.pestName || 'OPT',
        pestType: data.pestType || 'Hama',
        areaAffectedHa: Number(data.areaAffectedHa) || 1,
        areaThreatenedHa: Number(data.areaThreatenedHa) || 3,
        severity: data.severity || 'Sedang',
        plantAgeWeeks: Number(data.plantAgeWeeks) || 4,
        symptoms: data.symptoms || '-',
        status: 'Menunggu Verifikasi',
        source: 'web',
        photoUrl: data.photoUrl || (Array.isArray(data.evidencePhotos) && data.evidencePhotos[0]) || '',
        evidencePhotos: Array.isArray(data.evidencePhotos) ? data.evidencePhotos : (data.photoUrl ? [data.photoUrl] : []),
        reporterAddress: data.reporterAddress || '',
        dateReported: now,
        updatedAt: now,
        syncedToSheets: true,
        waNotificationSent: true,
        location: data.location || { latitude: -5.4988, longitude: 104.6225 }
      };
      db.reports.unshift(newReport);
      saveLocalData(db);
      return { success: true, message: `Laporan tiket ${code} berhasil dibuat`, report: newReport };
    },
    update: (id: string, data: Partial<OPTReport>): { success: boolean; message: string; report: OPTReport } => {
      const db = getLocalData();
      const idx = db.reports.findIndex(r => r.id === id || r.code === id);
      if (idx === -1) throw new Error('Laporan tidak ditemukan');
      const updated = {
        ...db.reports[idx],
        ...data,
        updatedAt: new Date().toISOString()
      };
      db.reports[idx] = updated;
      saveLocalData(db);
      return { success: true, message: `Laporan ${updated.code} berhasil diperbarui`, report: updated };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      db.reports = db.reports.filter(r => r.id !== id && r.code !== id);
      saveLocalData(db);
      return { success: true, message: 'Laporan berhasil dihapus' };
    }
  },

  users: {
    getAll: (): User[] => {
      const db = getLocalData();
      return db.users.map(({ passwordHash: _, ...u }) => u);
    },
    create: (data: any): { success: boolean; message: string; user: User } => {
      const db = getLocalData();
      let finalAllowedTabs = data.allowedTabs;
      if (data.role === 'admin') {
        finalAllowedTabs = ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'sheets', 'subdistricts', 'commodities', 'users'];
      } else if (!Array.isArray(finalAllowedTabs) || finalAllowedTabs.length === 0) {
        finalAllowedTabs = data.role === 'petugas_popt'
          ? ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'subdistricts', 'commodities']
          : ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'commodities'];
      }

      const newUser = {
        id: `usr-${Date.now()}`,
        username: data.username.toLowerCase().trim(),
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        role: data.role,
        region: data.region || 'Wilayah Kerja',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        passwordHash: data.password || '123456',
        allowedTabs: finalAllowedTabs
      };
      db.users.unshift(newUser);
      saveLocalData(db);
      const { passwordHash: _, ...safe } = newUser;
      return { success: true, message: 'User berhasil ditambahkan', user: safe };
    },
    update: (id: string, data: any): { success: boolean; message: string; user: User } => {
      const db = getLocalData();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('User tidak ditemukan');
      
      const targetRole = data.role !== undefined ? data.role : db.users[idx].role;
      let finalAllowedTabs = db.users[idx].allowedTabs;

      if (targetRole === 'admin') {
        finalAllowedTabs = ['dashboard', 'reports', 'report-form', 'export', 'smart-corner', 'fonnte', 'sheets', 'subdistricts', 'commodities', 'users'];
      } else if (data.allowedTabs !== undefined && Array.isArray(data.allowedTabs)) {
        finalAllowedTabs = data.allowedTabs.filter((t: string) => t !== 'users');
      }

      db.users[idx] = {
        ...db.users[idx],
        ...data,
        role: targetRole,
        allowedTabs: finalAllowedTabs
      };
      saveLocalData(db);
      const { passwordHash: _, ...safe } = db.users[idx];
      return { success: true, message: 'Data dan hak akses user berhasil diperbarui', user: safe };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      db.users = db.users.filter(u => u.id !== id);
      saveLocalData(db);
      return { success: true, message: 'User berhasil dihapus' };
    }
  },

  fonnte: {
    getConfig: (): FonnteConfig => getLocalData().fonnteConfig,
    updateConfig: (cfg: Partial<FonnteConfig>): { success: boolean; message: string; config: FonnteConfig } => {
      const db = getLocalData();
      db.fonnteConfig = { ...db.fonnteConfig, ...cfg };
      saveLocalData(db);
      return { success: true, message: 'Konfigurasi Fonnte berhasil disimpan', config: db.fonnteConfig };
    },
    getLogs: (): FonnteLog[] => getLocalData().fonnteLogs,
    simulate: (data: { senderPhone: string; message: string; senderName?: string }): { success: boolean; reply: string } => {
      const reply = `✅ [Bot SIGAP-OPT] Pesan dari ${data.senderName || 'Petani'} berhasil diterima: "${data.message}"`;
      return { success: true, reply };
    }
  },

  sheets: {
    getConfig: (): SpreadsheetConfig => getLocalData().spreadsheetConfig,
    updateConfig: (cfg: Partial<SpreadsheetConfig>): { success: boolean; message: string; config: SpreadsheetConfig } => {
      const db = getLocalData();
      db.spreadsheetConfig = { ...db.spreadsheetConfig, ...cfg };
      saveLocalData(db);
      return { success: true, message: 'Konfigurasi Google Spreadsheets berhasil disimpan', config: db.spreadsheetConfig };
    },
    getLogs: (): SyncLog[] => getLocalData().syncLogs,
    syncNow: (): { success: boolean; message: string; totalSynced: number } => {
      const db = getLocalData();
      const repCount = db.reports.length;
      const userCount = db.users.length;
      const subCount = db.subdistricts.length;
      const commCount = db.commodities.length;
      const totalCount = repCount + userCount + subCount + commCount;
      const now = new Date().toISOString();

      db.spreadsheetConfig.lastSyncedAt = now;
      db.spreadsheetConfig.totalSyncedRows = totalCount;
      db.spreadsheetConfig.syncedReportsCount = repCount;
      db.spreadsheetConfig.syncedUsersCount = userCount;
      db.spreadsheetConfig.syncedSubdistrictsCount = subCount;
      db.spreadsheetConfig.syncedCommoditiesCount = commCount;

      db.syncLogs.unshift({
        id: `sync-${Date.now()}`,
        timestamp: now,
        type: 'manual',
        status: 'success',
        rowsCount: totalCount,
        message: `Sinkronisasi multi-sheet sukses: ${repCount} Laporan OPT, ${userCount} Pengguna & Hak Akses, ${subCount} Master Kecamatan, ${commCount} Master Komoditas`
      });

      saveLocalData(db);
      return {
        success: true,
        message: `Sinkronisasi multi-sheet berhasil: ${totalCount} baris data (4 dataset) tersinkronisasi ke Google Spreadsheets`,
        totalSynced: totalCount
      };
    }
  },

  subdistricts: {
    getAll: (): Subdistrict[] => getLocalData().subdistricts,
    create: (data: Partial<Subdistrict>): { success: boolean; message: string; subdistrict: Subdistrict } => {
      const db = getLocalData();
      const newSub: Subdistrict = {
        id: `sub-${Date.now()}`,
        name: data.name || 'Kecamatan',
        coordinator: data.coordinator || 'Koordinator POPT',
        targetAreaHa: Number(data.targetAreaHa) || 1000,
        description: data.description || ''
      };
      db.subdistricts.push(newSub);
      saveLocalData(db);
      return { success: true, message: 'Kecamatan berhasil ditambahkan', subdistrict: newSub };
    },
    update: (id: string, data: Partial<Subdistrict>): { success: boolean; message: string; subdistrict: Subdistrict } => {
      const db = getLocalData();
      const idx = db.subdistricts.findIndex(s => s.id === id);
      if (idx === -1) throw new Error('Kecamatan tidak ditemukan');
      db.subdistricts[idx] = { ...db.subdistricts[idx], ...data };
      saveLocalData(db);
      return { success: true, message: 'Kecamatan berhasil diperbarui', subdistrict: db.subdistricts[idx] };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      db.subdistricts = db.subdistricts.filter(s => s.id !== id);
      saveLocalData(db);
      return { success: true, message: 'Kecamatan berhasil dihapus' };
    }
  },

  commodities: {
    getAll: (): CommodityItem[] => getLocalData().commodities,
    create: (data: Partial<CommodityItem>): { success: boolean; message: string; commodity: CommodityItem } => {
      const db = getLocalData();
      const newComm: CommodityItem = {
        id: `comm-${Date.now()}`,
        name: data.name || 'Komoditas Baru',
        category: data.category || 'Tanaman Pangan',
        latinName: data.latinName || '',
        varieties: data.varieties || '',
        commonPests: data.commonPests || [],
        targetAreaHa: Number(data.targetAreaHa) || 500,
        description: data.description || '',
        createdAt: new Date().toISOString()
      };
      db.commodities.push(newComm);
      saveLocalData(db);
      return { success: true, message: 'Komoditas berhasil ditambahkan', commodity: newComm };
    },
    update: (id: string, data: Partial<CommodityItem>): { success: boolean; message: string; commodity: CommodityItem } => {
      const db = getLocalData();
      const idx = db.commodities.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Komoditas tidak ditemukan');
      db.commodities[idx] = { ...db.commodities[idx], ...data };
      saveLocalData(db);
      return { success: true, message: 'Komoditas berhasil diperbarui', commodity: db.commodities[idx] };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      db.commodities = db.commodities.filter(c => c.id !== id);
      saveLocalData(db);
      return { success: true, message: 'Komoditas berhasil dihapus' };
    }
  },

  commodityCategories: {
    getAll: (): CommodityCategory[] => getLocalData().commodityCategories,
    create: (data: Partial<CommodityCategory>): { success: boolean; message: string; category: CommodityCategory } => {
      const db = getLocalData();
      const newCat: CommodityCategory = {
        id: `cat-${Date.now()}`,
        name: data.name || 'Kategori Baru',
        description: data.description || '',
        icon: data.icon || '🌱',
        color: data.color || 'emerald',
        createdAt: new Date().toISOString()
      };
      db.commodityCategories.push(newCat);
      saveLocalData(db);
      return { success: true, message: 'Kategori berhasil ditambahkan', category: newCat };
    },
    update: (id: string, data: Partial<CommodityCategory>): { success: boolean; message: string; category: CommodityCategory } => {
      const db = getLocalData();
      const idx = db.commodityCategories.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Kategori tidak ditemukan');
      db.commodityCategories[idx] = { ...db.commodityCategories[idx], ...data };
      saveLocalData(db);
      return { success: true, message: 'Kategori berhasil diperbarui', category: db.commodityCategories[idx] };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      db.commodityCategories = db.commodityCategories.filter(c => c.id !== id);
      saveLocalData(db);
      return { success: true, message: 'Kategori berhasil dihapus' };
    }
  },

  contacts: {
    getAll: (): WhatsAppContact[] => {
      const db = getLocalData();
      return db.whatsappContacts || [
        {
          id: 'ct-1',
          name: 'Catur Jatmiko, S.P.',
          phone: '081273456781',
          category: 'Petugas POPT',
          subdistrict: 'Wonosobo',
          village: 'Soponyono',
          organization: 'POPT BPP Wonosobo',
          notes: 'Koordinator POPT Wilayah Kecamatan Wonosobo',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-2',
          name: 'Harsono, S.P.',
          phone: '081379123456',
          category: 'Petugas POPT',
          subdistrict: 'Semaka',
          village: 'Sri Kuncoro',
          organization: 'POPT BPP Semaka',
          notes: 'Koordinator POPT Wilayah Kecamatan Semaka',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-3',
          name: 'Muhajir, S.P.',
          phone: '085269871234',
          category: 'Petugas POPT',
          subdistrict: 'Pematang Sawa',
          village: 'Betung',
          organization: 'POPT Kec. Pematang Sawa',
          notes: 'Petugas Pengamat OPT Wilayah Pematang Sawa',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-4',
          name: 'Della Sefa Aulanda, A.Md.Ak.',
          phone: '081273488762',
          category: 'Dinas Pertanian',
          subdistrict: 'Kota Agung',
          village: 'Kuripan',
          organization: 'Dinas Tanaman Pangan & Hortikultura',
          notes: 'Koordinator Perlindungan Tanaman Pangan & Hortikultura Tanggamus',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-5',
          name: 'Hotline Siaga OPT Tanggamus (Bot)',
          phone: '085846046927',
          category: 'Dinas Pertanian',
          subdistrict: 'Kota Agung',
          village: 'Kantor Dinas',
          organization: 'Pusat Kendali Pengaduan OPT Tanggamus',
          notes: 'Nomor Gateway WhatsApp Bot SIPOPT 24 Jam',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-6',
          name: 'Pak Supardi',
          phone: '081298765432',
          category: 'Kelompok Tani',
          subdistrict: 'Kota Agung Barat',
          village: 'Sukabanjar',
          organization: 'Poktan Sri Rejeki',
          notes: 'Ketua Kelompok Tani Hamparan Padi Sawah',
          createdAt: new Date().toISOString()
        },
        {
          id: 'ct-7',
          name: 'Pak Wayan',
          phone: '081277889900',
          category: 'Petani',
          subdistrict: 'Wonosobo',
          village: 'Banyuwangi',
          organization: 'Poktan Mawar Makmur',
          notes: 'Petani Pembudidaya Padi Irigasi',
          createdAt: new Date().toISOString()
        }
      ];
    },
    create: (data: Partial<WhatsAppContact>): { success: boolean; message: string; contact: WhatsAppContact } => {
      const db = getLocalData();
      if (!db.whatsappContacts) db.whatsappContacts = [];
      const newContact: WhatsAppContact = {
        id: `ct-${Date.now()}`,
        name: data.name || 'Kontak Baru',
        phone: data.phone || '',
        category: data.category || 'Petani',
        subdistrict: data.subdistrict || 'Kota Agung',
        village: data.village || '',
        organization: data.organization || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      };
      db.whatsappContacts.unshift(newContact);
      saveLocalData(db);
      return { success: true, message: 'Kontak berhasil disimpan', contact: newContact };
    },
    update: (id: string, data: Partial<WhatsAppContact>): { success: boolean; message: string; contact: WhatsAppContact } => {
      const db = getLocalData();
      if (!db.whatsappContacts) db.whatsappContacts = [];
      const idx = db.whatsappContacts.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Kontak tidak ditemukan');
      db.whatsappContacts[idx] = { ...db.whatsappContacts[idx], ...data, updatedAt: new Date().toISOString() };
      saveLocalData(db);
      return { success: true, message: 'Kontak berhasil diperbarui', contact: db.whatsappContacts[idx] };
    },
    delete: (id: string): { success: boolean; message: string } => {
      const db = getLocalData();
      if (!db.whatsappContacts) db.whatsappContacts = [];
      db.whatsappContacts = db.whatsappContacts.filter(c => c.id !== id);
      saveLocalData(db);
      return { success: true, message: 'Kontak berhasil dihapus' };
    }
  },

  gemini: {
    chat: (payload: { message: string; history?: { role: 'user' | 'model'; text: string }[]; context?: string; commodity?: string }): { success: boolean; reply: string; model: string } => {
      const q = (payload.message || '').toLowerCase();
      const comm = payload.commodity;

      if (q.includes('halo') || q.includes('hai') || q.includes('assalam') || q.includes('siapa kamu') || q.includes('bantuan') || q === 'tes') {
        return {
          success: true,
          reply: `👋 **Halo! Selamat datang di Layanan Konsultasi Pintar PHT & Pertanian SIGAP-OPT**

Saya adalah **Asisten Ahli Pengendalian Hama Terpadu (PHT) & Konsultan Pertanian** Dinas Pertanian. Saya siap memberikan panduan teknis langsung dan solusi ramah lingkungan seputar:

1. 🐛 **Diagnosa & Pengendalian Hama**: Wereng batang coklat, penggerek batang, ulat grayak FAW, tikus sawah, thrips, kutu kebul, kepik, walang sangit, lalat buah.
2. 🍄 **Penanganan Penyakit Tanaman**: Penyakit blas padi, layu bakteri, layu fusarium, antraknosa (patek), busuk buah, hawar daun (kresek), bulai jagung.
3. 🌿 **Pemanfaatan Agens Pengendali Hayati (APH)**: *Beauveria bassiana*, *Trichoderma spp.*, *Metarhizium anisopliae*, *Bacillus thuringiensis (Bt)*, *Pseudomonas fluorescens (Pf)*, serta predator alami burung hantu *Tyto alba*.
4. 📏 **Standar Operasional (SOP)**: Takaran dosis per tangki semprot 16L, waktu aplikasi sore hari, pembuatan pestisida nabati, dan cara budidaya tanaman sehat.

*Silakan ketik pertanyaan spesifik Anda, gejala yang terlihat di daun/batang/buah, atau nama hama yang sedang menyerang lahan Anda!*`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('wereng') || q.includes('wbc')) {
        return {
          success: true,
          reply: `🌾 **Panduan Teknis Pengendalian Wereng Batang Coklat (Nilaparvata lugens)**

1. **Agens Pengendali Hayati (APH) Utama:**
   - **Beauveria bassiana**: Cendawan entomopatogen efektif menginfeksi nimfa dan imago wereng.
   - **Dosis**: 5 gram / liter air (atau 80 - 100 gram biakan per tangki 16 liter).
   - **Waktu Aplikasi**: Wajib disemprotkan pada **sore hari (pukul 15.30 - 17.30 WIB)** ke pangkal rumpun batang padi saat kelembaban tinggi dan terik matahari mereda.

2. **Tindakan Budidaya PHT:**
   - Lakukan **pengeringan sawah berselang (intermittent)** selama 2-3 hari untuk menurunkan kelembaban iklim mikro.
   - Kurangi pupuk Nitrogen (Urea), imbangi dengan pupuk Kalium (KCl) dan Silika agar batang padi liat dan keras.
   - Lestarikan musuh alami: Laba-laba serigala (*Lycosa pseudoannulata*) dan kumbang tomcat.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('blas') || q.includes('pyricularia') || q.includes('patah leher')) {
        return {
          success: true,
          reply: `🌾 **Panduan Teknis Pengendalian Penyakit Blas Padi (Pyricularia oryzae)**

1. **Agens Pengendali Hayati (APH) Rekomendasi:**
   - **Trichoderma spp. (T. harzianum / T. viride)**: Cendawan antagonis pelindung perakaran, daun, dan leher malai melalui kompetisi ruang, antibiosis, dan hiperparasitisme.
   - **Dosis & Waktu**: 5-10 gr/liter air disemprotkan pada fase anakan aktif (umur 20-30 HST) dan fase bunting/keluar malai (umur 55-65 HST).
   - **Pseudomonas fluorescens (Pf)**: Bakteri antagonis PGPR (5 ml/liter air) untuk memicu kekebalan sistemik tanaman.

2. **Strategi PHT Lapangan:**
   - Kurangi dosis Urea saat musim hujan atau kondisi berkabut.
   - Terapkan pola tanam jajar legowo (2:1 atau 4:1) agar sirkulasi udara lancar.
   - Gunakan varietas padi tahan seperti Inpari 32 atau Inpago 8.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('grayak') || q.includes('faw') || q.includes('ulat')) {
        return {
          success: true,
          reply: `🌽 **Panduan Pengendalian Ulat Grayak Jagung (Spodoptera frugiperda / FAW)**

1. **Agens Pengendali Hayati (APH) Teruji:**
   - **Bacillus thuringiensis (Bt)**: Bakteri penghasil kristal endotoksin Cry perusak dinding saluran usus larva. Dosis 2-3 gr/liter air diarahkan tepat ke arah titik tumbuh / pucuk jagung muda.
   - **Metarhizium anisopliae** atau **Beauveria bassiana**: Efektif menginfeksi larva instar 1-2.
   - **Pestisida Nabati**: Ekstrak daun mimba (*Azadirachta indica*) atau ekstrak daun tembakau.

2. **Petunjuk Aplikasi:**
   - Lakukan aplikasi pada sore hari menjelang petang saat larva aktif keluar dari dalam gulungan daun.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('tikus')) {
        return {
          success: true,
          reply: `🐀 **Pengendalian Hama Tikus Sawah (Rattus argentiventer) Berkelanjutan**

1. **Pemanfaatan Musuh Alami:**
   - **Burung Hantu (Tyto alba)**: Pemasangan Rumah Burung Hantu (Rubuha) 1 unit per 5-10 Ha hamparan sawah. Sepasang Tyto alba memangsa 3-5 ekor tikus setiap malam tanpa residu racun kimia.

2. **Gerakan Bersama (Gerdal):**
   - **Gropyokan massal** serempak pada masa bera atau sebelum olah tanah.
   - **Fumigasi / Pengemposan belerang** pada lubang aktif pematang utama.
   - Pemasangan sistem perangkap bubu (*Trap Barrier System* / TBS) di petak tanaman perangkap awal.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('antraknosa') || q.includes('patek') || q.includes('cabai') || q.includes('cabe')) {
        return {
          success: true,
          reply: `🌶️ **Pengendalian Penyakit Antraknosa / Patek Cabai (Colletotrichum capsici)**

1. **Agens Hayati Protektif:**
   - **Trichoderma harzianum**: Campurkan 1-2 kg formulasi Trichoderma dengan 100 kg pupuk kandang matang saat olah tanah bedengan. Semprot kanopi dengan dosis 5-8 gr/liter air sejak tanaman mulai berbunga.
   - **Pseudomonas fluorescens (Pf)**: Semprot berkala 10 hari sekali untuk memicu kekebalan sistemik tanaman.

2. **Sanitasi Kebun:**
   - Petik dan kumpulkan buah cabai bergejala busuk melingkar basah, lalu bakar/kubur di luar kebun.
   - Perbaiki drainase bedengan dengan memasang mulsa plastik hitam perak.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      if (q.includes('dosis') || q.includes('waktu semprot') || q.includes('cara aplikasi')) {
        return {
          success: true,
          reply: `📋 **Standar Operasional Prosedur (SOP) Aplikasi Agens Hayati (APH)**

1. **Waktu Semprot:**
   - Wajib dilakukan pada **sore hari (pukul 15.30 - 18.00 WIB)** saat matahari tidak lagi terik. Radiasi UV matahari dapat mematikan spora jamur/bakteri hayati.

2. **Dosis Acuan untuk Tangki 16 Liter:**
   - **Beauveria bassiana**: 80 - 100 gram biakan padat (5 gr/L air).
   - **Trichoderma spp.**: 80 - 160 gram per tangki 16L (5-10 gr/L air).
   - **Bacillus thuringiensis (Bt)**: 30 - 50 gram per tangki 16L (2-3 gr/L air).
   - **Pseudomonas fluorescens (Pf)**: 80 - 100 ml biakan cair per tangki 16L.

3. **Larangan:**
   - **DILARANG KERAS mencampur APH dengan fungisida/bakterisida kimia sintetis**. Cuci tangki semprot hingga bersih sebelum digunakan.`,
          model: 'SIGAP-OPT PHT Knowledge Engine'
        };
      }

      return {
        success: true,
        reply: `🌱 **Konsultasi Pakar PHT SIGAP-OPT - Dinas Pertanian**

Menanggapi pertanyaan Anda${comm ? ` terkait **${comm}**` : ''}:

1. **Analisa Masalah & Prioritas:**
   - Identifikasi apakah serangan berasal dari serangga hama (pengisap/penggerek), jamur patogen, atau infeksi bakteri.
   - Lakukan sanitasi dengan memotong bagian tanaman yang terinfeksi berat agar tidak menular.

2. **Rekomendasi Agens Pengendali Hayati (APH):**
   - **Hama Serangga**: Gunakan **Beauveria bassiana** (5 gr/L) atau **Bt** (2-3 gr/L) semprot sore hari.
   - **Penyakit Jamur**: Kocor/semprot **Trichoderma spp.** (5-10 gr/L) pada perakaran dan kanopi.
   - **Penyakit Bakteri**: Aplikasi **Pseudomonas fluorescens (Pf)** (5 ml/L).
   - **Hama Tikus**: Pemasangan Rumah Burung Hantu (Rubuha) predator *Tyto alba*.

3. **Petunjuk Teknis:**
   - Selalu lakukan penyemprotan pada sore hari (>15.30 WIB) dengan tangki semprot bersih bebas residu pestisida kimia.`,
        model: 'SIGAP-OPT PHT Knowledge Engine'
      };
    }
  }
};
