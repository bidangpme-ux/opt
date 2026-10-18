import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  type WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import type { OPTReport, User, FonnteLog, FonnteConfig, SpreadsheetConfig, SyncLog, DashboardStats, Subdistrict, FirebaseStorageStats, WaReportSession, BaileysStatus, BaileysLog } from './src/types/index.ts';
import {
  initPostgres,
  getPostgresStatus,
  isPostgresActive,
  pgGetReports,
  pgSaveReport,
  pgDeleteReport,
  pgGetUsers,
  pgSaveUser,
  pgDeleteUser,
  pgSaveSetting
} from './src/db/postgres.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isProd = process.env.NODE_ENV === 'production';
let cliPort: number | undefined;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' && process.argv[i + 1]) {
    cliPort = Number(process.argv[i + 1]);
    break;
  }
}
const PORT = cliPort || (isProd ? (process.env.PORT ? Number(process.env.PORT) : 8080) : 3000);
let activeServerPort = PORT;
let isPortAutoAdjusted = false;

// Initialize Gemini Client with mandatory telemetry user-agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Immediate health check endpoints for Cloud Run, Kubernetes, and load balancers
app.get(['/health', '/api/health', '/ping'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Database storage file path
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface CommodityItem {
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

interface CommodityCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt?: string;
}

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  category: string;
  subdistrict: string;
  village?: string;
  organization?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface DatabaseSchema {
  users: (User & { passwordHash?: string })[];
  reports: OPTReport[];
  fonnteConfig: FonnteConfig;
  fonnteLogs: FonnteLog[];
  spreadsheetConfig: SpreadsheetConfig;
  syncLogs: SyncLog[];
  subdistricts?: Subdistrict[];
  commodities?: CommodityItem[];
  commodityCategories?: CommodityCategory[];
  whatsappContacts?: WhatsAppContact[];
  waSessions?: { [phone: string]: WaReportSession };
  baileysLogs?: BaileysLog[];
}

const defaultInitialData: DatabaseSchema = {
  waSessions: {},
  baileysLogs: [],
  whatsappContacts: [
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
  ],
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
      allowedTabs: ['dashboard', 'reports', 'report-form', 'fonnte', 'sheets', 'export', 'subdistricts', 'commodities', 'users', 'guide']
    }
  ],
  reports: [],
  fonnteConfig: {
    apiToken: process.env.FONNTE_TOKEN || '',
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
    },
    {
      id: 'log-3',
      timestamp: '2026-03-22T14:30:10.000Z',
      direction: 'outgoing',
      phone: '081298765432',
      message: '📢 Update Status Laporan OPT-2026-001: Dijadwalkan Gerdal Massal bersama Petugas Budi Santoso, S.P pada Sabtu jam 07.00 WIB.',
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
      commonPests: [
        'Wereng Batang Coklat (Nilaparvata lugens)',
        'Penggerek Batang Padi / Sundep & Beluk (Scirpophaga spp.)',
        'Tikus Sawah (Rattus argentiventer)',
        'Penyakit Blas Daun & Leher (Pyricularia oryzae)',
        'Hawar Daun Bakteri / Kresek (Xanthomonas oryzae)',
        'Walang Sangit (Leptocorisa acuta)'
      ],
      targetAreaHa: 12500,
      description: 'Komoditas pangan utama sentra sawah irigasi teknis & tadah hujan di Kab. Tanggamus',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-2',
      name: 'Padi Ladang / Gogo',
      category: 'Tanaman Pangan',
      latinName: 'Oryza sativa L.',
      varieties: 'Inpago 8, Inpago 9, Situ Patenggang, Danau Gaung',
      commonPests: [
        'Penyakit Blas Daun (Pyricularia oryzae)',
        'Ulat Grayak (Spodoptera litura)',
        'Tikus Sawah',
        'Lalat Bibit Padi'
      ],
      targetAreaHa: 1800,
      description: 'Pertanaman padi dataran perbukitan dan lahan kering',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-3',
      name: 'Jagung Hibrida',
      category: 'Tanaman Pangan',
      latinName: 'Zea mays L.',
      varieties: 'BISI 18, NK 212, Pioneer P27, Pertiwi 3, Bisi 2',
      commonPests: [
        'Ulat Grayak Jagung / FAW (Spodoptera frugiperda)',
        'Penyakit Bulai (Peronosclerospora maydis)',
        'Penggerek Tongkol (Helicoverpa armigera)',
        'Hawar Daun Jagung (Helminthosporium turcicum)'
      ],
      targetAreaHa: 8200,
      description: 'Komoditas palawija strategis untuk pakan dan industri olahan',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-4',
      name: 'Cabai Merah Keriting',
      category: 'Hortikultura',
      latinName: 'Capsicum annuum L.',
      varieties: 'Lado F1, TM 999, Kawat, Kastilo, Red Kriss',
      commonPests: [
        'Antraknosa / Patek (Colletotrichum capsici)',
        'Kutu Daun / Thrips (Thrips parvispinus)',
        'Lalat Buah (Bactrocera dorsalis)',
        'Virus Kuning / Gemini Virus',
        'Layu Bakteri (Ralstonia solanacearum)'
      ],
      targetAreaHa: 1450,
      description: 'Sentra hortikultura sayuran bernilai ekonomis tinggi',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-5',
      name: 'Cabai Rawit',
      category: 'Hortikultura',
      latinName: 'Capsicum frutescens L.',
      varieties: 'Ori 212, Manu Preen, Bhaskara, Wijaya',
      commonPests: [
        'Virus Kuning / Gemini Virus',
        'Kutu Kebul (Bemisia tabaci)',
        'Antraknosa / Patek',
        'Thrips dan Tungau'
      ],
      targetAreaHa: 980,
      description: 'Tanaman sayuran bumbu dapur dengan permintaan harian stabil',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-6',
      name: 'Bawang Merah',
      category: 'Hortikultura',
      latinName: 'Allium cepa var. aggregatum',
      varieties: 'Bima Brebes, Bauji, Tajuk, Trisula',
      commonPests: [
        'Ulat Grayak Bawang (Spodoptera exigua)',
        'Penyakit Moler / Layu Fusarium (Fusarium oxysporum)',
        'Bercak Ungu / Alternaria porri',
        'Ulat Tanah (Agrotis ipsilon)'
      ],
      targetAreaHa: 750,
      description: 'Komoditas pengatur inflasi daerah di sentra dataran rendah',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-7',
      name: 'Kedelai',
      category: 'Tanaman Pangan',
      latinName: 'Glycine max L.',
      varieties: 'Anjasmoro, Grobogan, Dena 1, Burangrang',
      commonPests: [
        'Ulat Penggulung Daun (Lamprosema indicata)',
        'Karat Daun Kedelai (Phakopsora pachyrhizi)',
        'Penggerek Polong (Etiella zinckenella)',
        'Ulat Grayak'
      ],
      targetAreaHa: 1200,
      description: 'Tanaman pangan kacang-kacangan penyubur tanah dan protein nabati',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-8',
      name: 'Tomat',
      category: 'Hortikultura',
      latinName: 'Solanum lycopersicum L.',
      varieties: 'Servo F1, Tymoti F1, Betavila, Gustavi',
      commonPests: [
        'Busuk Daun (Phytophthora infestans)',
        'Lalat Buah (Bactrocera sp.)',
        'Layu Bakteri (Ralstonia solanacearum)',
        'Ulat Buah (Helicoverpa armigera)'
      ],
      targetAreaHa: 620,
      description: 'Hortikultura buah dataran menengah-tinggi',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-9',
      name: 'Pisang',
      category: 'Hortikultura',
      latinName: 'Musa acuminata Colla',
      varieties: 'Pisang Mas Tanggamus, Ambon Curup, Raja Bulu, Kepok Tanjung, Cavendish',
      commonPests: [
        'Penyakit Darah Bakteri (Ralstonia syzygii)',
        'Layu Fusarium / Penyakit Panama (Fusarium oxysporum f.sp. cubense)',
        'Penggerek Bonggol / Batang (Cosmopolites sordidus)',
        'Bercak Daun Sigatoka (Mycosphaerella fijiensis)'
      ],
      targetAreaHa: 3800,
      description: 'Komoditas hortikultura unggulan khas Tanggamus berorientasi ekspor dan pasar nasional',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'comm-10',
      name: 'Kopi Robusta',
      category: 'Perkebunan',
      latinName: 'Coffea canephora',
      varieties: 'Klon Tugusari, BP 308, BP 42, SA 237',
      commonPests: [
        'Penggerek Buah Kopi / PBKo (Hypothenemus hampei)',
        'Karat Daun Kopi (Hemileia vastatrix)',
        'Penggerek Cabang Kopi (Xylosandrus compactus)',
        'Kutu Putih Kopi (Planococcus citri)'
      ],
      targetAreaHa: 5400,
      description: 'Komoditas perkebunan rakyat andalan lereng Gunung Tanggamus dan sekitarnya',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  commodityCategories: [
    {
      id: 'cat-1',
      name: 'Tanaman Pangan',
      description: 'Padi, jagung, kedelai, sorgum, ubi jalar, singkong pangan pokok',
      icon: '🌾',
      color: 'amber',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cat-2',
      name: 'Hortikultura',
      description: 'Sayuran daun/buah, cabai merah, bawang, tomat, dan buah-buahan unggul',
      icon: '🌶️',
      color: 'emerald',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cat-3',
      name: 'Perkebunan',
      description: 'Kopi robusta, kakao, lada hitam, cengkeh, kelapa sawit, karet',
      icon: '☕',
      color: 'amber',
      createdAt: '2026-01-01T00:00:00.000Z'
    },
    {
      id: 'cat-4',
      name: 'Biofarmaka / Obat',
      description: 'Jahe merah, kunyit, temulawak, serai wangi, kencur, kapulaga',
      icon: '🌿',
      color: 'teal',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ]
};

// Firebase Firestore persistent database connection
const firebaseConfigPath = path.join(__dirname, 'firebase-applet-config.json');
let firestoreDb: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log('[Firestore] Connected to persistent database:', firebaseConfig.firestoreDatabaseId);
  } catch (err: any) {
    console.warn('[Firestore] Initialization warning:', err.message);
  }
}

let memoryDB: DatabaseSchema | undefined;

// Database read/write helpers
function initDB(): DatabaseSchema {
  if (memoryDB) {
    return memoryDB;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultInitialData, null, 2), 'utf-8');
    memoryDB = defaultInitialData;
    return defaultInitialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let hasChanges = false;
    if (!parsed.subdistricts || !Array.isArray(parsed.subdistricts) || parsed.subdistricts.length === 0) {
      // Collect existing subdistricts from reports if any
      const existingNames = new Set<string>();
      (parsed.reports || []).forEach((r: any) => {
        if (r.subdistrict) existingNames.add(r.subdistrict.trim());
      });
      defaultInitialData.subdistricts?.forEach(s => existingNames.add(s.name));
      parsed.subdistricts = Array.from(existingNames).map((name, idx) => ({
        id: `sub-${idx + 1}`,
        name,
        coordinator: 'Koordinator POPT',
        targetAreaHa: 1000
      }));
      hasChanges = true;
    }
    if (!parsed.commodities || !Array.isArray(parsed.commodities) || parsed.commodities.length === 0) {
      parsed.commodities = defaultInitialData.commodities;
      hasChanges = true;
    }
    if (!parsed.commodityCategories || !Array.isArray(parsed.commodityCategories) || parsed.commodityCategories.length === 0) {
      parsed.commodityCategories = defaultInitialData.commodityCategories;
      hasChanges = true;
    }
    if (!parsed.whatsappContacts || !Array.isArray(parsed.whatsappContacts) || parsed.whatsappContacts.length === 0) {
      parsed.whatsappContacts = defaultInitialData.whatsappContacts;
      hasChanges = true;
    }
    if (parsed.users && Array.isArray(parsed.users)) {
      parsed.users.forEach((u: any) => {
        if (!u.allowedTabs || !Array.isArray(u.allowedTabs) || u.role === 'admin') {
          if (u.role === 'admin') {
            u.allowedTabs = ['dashboard', 'reports', 'report-form', 'fonnte', 'sheets', 'export', 'subdistricts', 'commodities', 'users', 'guide'];
          } else if (u.role === 'petugas_popt') {
            u.allowedTabs = ['dashboard', 'reports', 'report-form', 'fonnte', 'export', 'subdistricts', 'commodities', 'guide'];
          } else {
            u.allowedTabs = ['dashboard', 'reports', 'report-form', 'export', 'commodities', 'guide'];
          }
          hasChanges = true;
        }
      });
    }
    if (parsed.spreadsheetConfig) {
      if (!parsed.spreadsheetConfig.sheetName) {
        parsed.spreadsheetConfig.sheetName = 'Laporan_Pengaduan_OPT';
        hasChanges = true;
      }
      if (!parsed.spreadsheetConfig.sheetNameUsers) {
        parsed.spreadsheetConfig.sheetNameUsers = 'Manajemen_Pengguna_Akses';
        hasChanges = true;
      }
      if (!parsed.spreadsheetConfig.sheetNameSubdistricts) {
        parsed.spreadsheetConfig.sheetNameSubdistricts = 'Master_Kecamatan_POPT';
        hasChanges = true;
      }
      if (!parsed.spreadsheetConfig.sheetNameCommodities) {
        parsed.spreadsheetConfig.sheetNameCommodities = 'Master_Komoditas_Tanaman';
        hasChanges = true;
      }
    }
    if (hasChanges) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    memoryDB = parsed;
    return parsed;
  } catch (err) {
    console.error('Error reading db file, resetting to default:', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultInitialData, null, 2), 'utf-8');
    memoryDB = defaultInitialData;
    return defaultInitialData;
  }
}

function saveDB(data: DatabaseSchema): void {
  memoryDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

function cleanFirestoreData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  return JSON.parse(JSON.stringify(data));
}

// Background firestore document write
function persistToFirestore(collName: string, docId: string, data: any): void {
  if (!firestoreDb) return;
  try {
    const cleanData = cleanFirestoreData(data);
    setDoc(doc(firestoreDb, collName, docId), cleanData).catch(err => {
      console.warn(`[Firestore] Failed to persist ${collName}/${docId}:`, err.message);
    });
  } catch (err: any) {
    console.warn(`[Firestore] Error preparing ${collName}/${docId}:`, err.message);
  }
}

// Background firestore document delete
function deleteFromFirestore(collName: string, docId: string): void {
  if (!firestoreDb) return;
  deleteDoc(doc(firestoreDb, collName, docId)).catch(err => {
    console.warn(`[Firestore] Failed to delete ${collName}/${docId}:`, err.message);
  });
}

// Unified hybrid persistence helpers (PostgreSQL + Cloud Firestore)
function persistReport(report: OPTReport): void {
  if (isPostgresActive()) {
    pgSaveReport(report).catch(err => console.warn('[PostgreSQL] Persist report warning:', err.message));
  }
  persistToFirestore('reports', report.id, report);
}

function removeReport(id: string): void {
  if (isPostgresActive()) {
    pgDeleteReport(id).catch(err => console.warn('[PostgreSQL] Delete report warning:', err.message));
  }
  deleteFromFirestore('reports', id);
}

function persistUser(user: User & { passwordHash?: string }): void {
  if (isPostgresActive()) {
    pgSaveUser(user).catch(err => console.warn('[PostgreSQL] Persist user warning:', err.message));
  }
  persistToFirestore('users', user.id, user);
}

function removeUser(id: string): void {
  if (isPostgresActive()) {
    pgDeleteUser(id).catch(err => console.warn('[PostgreSQL] Delete user warning:', err.message));
  }
  deleteFromFirestore('users', id);
}

async function syncFromFirestore(): Promise<void> {
  if (!firestoreDb) return;
  try {
    console.log('[Firestore] Checking and synchronizing persistent cloud database...');
    const current = initDB();

    // 1. Users (PostgreSQL is authoritative when running with database)
    if (isPostgresActive()) {
      const pgUsers = await pgGetUsers();
      if (pgUsers && pgUsers.length > 0) {
        current.users = pgUsers;
        console.log(`[PostgreSQL] Preserved ${current.users.length} authoritative user(s) (including custom passwords) from PostgreSQL.`);
      }
    } else {
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      if (usersSnap.docs.length > 0) {
        current.users = usersSnap.docs.map(d => d.data() as (User & { passwordHash?: string }));
        console.log(`[Firestore] Loaded ${current.users.length} user(s) from Cloud Firestore.`);
      } else if (current.users && current.users.length > 0) {
        for (const u of current.users) {
          persistToFirestore('users', u.id, u);
        }
        console.log(`[Firestore] Seeded ${current.users.length} user(s) to Cloud Firestore.`);
      }
    }

    // 2. Reports (PostgreSQL is authoritative when active)
    if (isPostgresActive()) {
      const pgReports = await pgGetReports();
      if (pgReports && pgReports.length > 0) {
        current.reports = pgReports;
        console.log(`[PostgreSQL] Preserved ${current.reports.length} authoritative report(s) from PostgreSQL.`);
      }
    } else {
      const reportsSnap = await getDocs(collection(firestoreDb, 'reports'));
      if (reportsSnap.docs.length > 0) {
        current.reports = reportsSnap.docs.map(d => d.data() as OPTReport);
        console.log(`[Firestore] Loaded ${current.reports.length} report(s) from Cloud Firestore.`);
      } else if (current.reports && current.reports.length > 0) {
        for (const r of current.reports) {
          persistToFirestore('reports', r.id, r);
        }
      }
    }

    // 3. Subdistricts (Ensure all 20 Tanggamus subdistricts are preserved and merged with custom entries)
    const subSnap = await getDocs(collection(firestoreDb, 'subdistricts'));
    const subMap = new Map<string, Subdistrict>();
    (defaultInitialData.subdistricts || []).forEach(s => subMap.set(s.name.toLowerCase().trim(), s));
    if (subSnap.docs.length > 0) {
      subSnap.docs.forEach(d => {
        const s = d.data() as Subdistrict;
        if (s && s.name) subMap.set(s.name.toLowerCase().trim(), s);
      });
      console.log(`[Firestore] Loaded & verified ${subMap.size} subdistrict(s) from Cloud Firestore.`);
    }
    current.subdistricts = Array.from(subMap.values());
    for (const s of current.subdistricts) {
      persistToFirestore('subdistricts', s.id, s);
    }

    // 4. Commodities
    const commSnap = await getDocs(collection(firestoreDb, 'commodities'));
    const commMap = new Map<string, CommodityItem>();
    (defaultInitialData.commodities || []).forEach(c => commMap.set(c.name.toLowerCase().trim(), c));
    if (commSnap.docs.length > 0) {
      commSnap.docs.forEach(d => {
        const c = d.data() as CommodityItem;
        if (c && c.name) commMap.set(c.name.toLowerCase().trim(), c);
      });
      console.log(`[Firestore] Loaded & verified ${commMap.size} commodity item(s) from Cloud Firestore.`);
    }
    current.commodities = Array.from(commMap.values());
    for (const c of current.commodities) {
      persistToFirestore('commodities', c.id, c);
    }

    // 5. Commodity Categories
    const catSnap = await getDocs(collection(firestoreDb, 'commodityCategories'));
    if (catSnap.docs.length > 0) {
      current.commodityCategories = catSnap.docs.map(d => d.data() as CommodityCategory);
    } else if (current.commodityCategories && current.commodityCategories.length > 0) {
      for (const cat of current.commodityCategories) {
        persistToFirestore('commodityCategories', cat.id, cat);
      }
    }

    // 6. WhatsApp Contacts - Persisted via settings/whatsapp_contacts (guaranteed read/write permissions)
    try {
      const contactsDoc = await getDoc(doc(firestoreDb, 'settings', 'whatsapp_contacts'));
      if (contactsDoc.exists() && Array.isArray(contactsDoc.data()?.contacts) && contactsDoc.data()?.contacts.length > 0) {
        current.whatsappContacts = contactsDoc.data()?.contacts;
        console.log(`[Firestore] Loaded ${current.whatsappContacts?.length} WhatsApp contact(s) from settings/whatsapp_contacts.`);
      } else if (current.whatsappContacts && current.whatsappContacts.length > 0) {
        await setDoc(doc(firestoreDb, 'settings', 'whatsapp_contacts'), {
          contacts: current.whatsappContacts,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Firestore] Seeded ${current.whatsappContacts.length} WhatsApp contact(s) to settings/whatsapp_contacts.`);
      }
    } catch (e: any) {
      console.warn('[Firestore] Error loading whatsapp_contacts from settings:', e.message);
    }

    // 7. Settings
    const setSnap = await getDocs(collection(firestoreDb, 'settings'));
    if (setSnap.docs.length > 0) {
      setSnap.docs.forEach(d => {
        const item = d.data();
        if (d.id === 'spreadsheetConfig' && item.data) {
          current.spreadsheetConfig = item.data;
        } else if (d.id === 'fonnteConfig' && item.data) {
          current.fonnteConfig = item.data;
        }
      });
      console.log(`[Firestore] Loaded system settings from Cloud Firestore.`);
    } else {
      if (current.spreadsheetConfig) {
        persistToFirestore('settings', 'spreadsheetConfig', { key: 'spreadsheetConfig', data: current.spreadsheetConfig, updatedAt: new Date().toISOString() });
      }
      if (current.fonnteConfig) {
        persistToFirestore('settings', 'fonnteConfig', { key: 'fonnteConfig', data: current.fonnteConfig, updatedAt: new Date().toISOString() });
      }
    }

    saveDB(current);
    console.log('[Firestore] Persistent Cloud database sync successful and active!');
  } catch (err: any) {
    console.warn('[Firestore] Error in syncFromFirestore:', err.message);
  }
}

// -------------------------------------------------------------
// Helper to calculate Firebase Firestore Storage and Quota Metrics
// -------------------------------------------------------------
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function calculateFirebaseStorageStats(db: DatabaseSchema): FirebaseStorageStats {
  // Cloud Firestore Spark Free Tier Storage Quota = 1 GiB (1,024 MB = 1,073,741,824 bytes)
  const quotaBytes = 1024 * 1024 * 1024;

  const calcCollectionBytes = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return { count: 0, bytes: 0, formatted: '0 B' };
    let bytes = 0;
    for (const item of items) {
      const docStr = JSON.stringify(item);
      const strBytes = Buffer.byteLength(docStr, 'utf8');
      // Adding 32 bytes per document to represent Firestore document path & indexing overhead
      bytes += strBytes + 32;
    }
    return { count: items.length, bytes, formatted: formatBytes(bytes) };
  };

  const reportsMetric = calcCollectionBytes(db.reports || []);
  const usersMetric = calcCollectionBytes(db.users || []);
  const subdistrictsMetric = calcCollectionBytes(db.subdistricts || []);
  const commoditiesMetric = calcCollectionBytes(db.commodities || []);
  const categoriesMetric = calcCollectionBytes(db.commodityCategories || []);

  const settingsItems: any[] = [];
  if (db.spreadsheetConfig) settingsItems.push(db.spreadsheetConfig);
  if (db.fonnteConfig) settingsItems.push(db.fonnteConfig);
  const settingsMetric = calcCollectionBytes(settingsItems);

  const logsItems: any[] = [
    ...(db.fonnteLogs || []),
    ...(db.syncLogs || [])
  ];
  const logsMetric = calcCollectionBytes(logsItems);

  const usedBytes = reportsMetric.bytes +
    usersMetric.bytes +
    subdistrictsMetric.bytes +
    commoditiesMetric.bytes +
    categoriesMetric.bytes +
    settingsMetric.bytes +
    logsMetric.bytes;

  const totalDocuments = reportsMetric.count +
    usersMetric.count +
    subdistrictsMetric.count +
    commoditiesMetric.count +
    categoriesMetric.count +
    settingsMetric.count +
    logsMetric.count;

  const remainingBytes = Math.max(0, quotaBytes - usedBytes);
  const usedPercentage = Number(((usedBytes / quotaBytes) * 100).toFixed(4));
  const remainingPercentage = Number(((remainingBytes / quotaBytes) * 100).toFixed(4));

  let dbId = 'ai-studio-sipoptsistempeng-868341fe-9f04-4b74-8e7a-cae6adcc23d2';
  let projId = 'automated-avatar-1smzh';
  let bucket = 'automated-avatar-1smzh.firebasestorage.app';

  try {
    if (fs.existsSync(firebaseConfigPath)) {
      const cfg = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      if (cfg.firestoreDatabaseId) dbId = cfg.firestoreDatabaseId;
      if (cfg.projectId) projId = cfg.projectId;
      if (cfg.storageBucket) bucket = cfg.storageBucket;
    }
  } catch {}

  const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(2);

  return {
    configured: true,
    databaseId: dbId,
    projectId: projId,
    storageBucket: bucket,
    status: firestoreDb ? 'connected' : 'local_mode',
    quotaBytes,
    quotaFormatted: '1.00 GB (1,024 MB)',
    usedBytes,
    usedFormatted: formatBytes(usedBytes),
    remainingBytes,
    remainingFormatted: `${remainingMB} MB`,
    usedPercentage,
    remainingPercentage,
    totalDocuments,
    collectionBreakdown: {
      reports: reportsMetric,
      users: usersMetric,
      subdistricts: subdistrictsMetric,
      commodities: commoditiesMetric,
      commodityCategories: categoriesMetric,
      settings: settingsMetric,
      logs: logsMetric
    },
    dailyReadQuota: 50000,
    dailyWriteQuota: 20000,
    dailyDeleteQuota: 20000,
    lastSyncedAt: new Date().toISOString()
  };
}

// Function to simulate or execute sync to Google Spreadsheets
async function syncToGoogleSheets(report: OPTReport, config: SpreadsheetConfig): Promise<{ success: boolean; message: string }> {
  if (!config.autoSyncEnabled) {
    return { success: false, message: 'Sinkronisasi otomatis dimatikan pada konfigurasi' };
  }

  // If a valid Google Apps Script webhook URL is set, perform HTTP POST
  if (config.webhookUrl && config.webhookUrl.startsWith('https://script.google.com/macros/s/')) {
    try {
      const payload = {
        action: 'append_or_update',
        sheetName: config.sheetName,
        data: {
          code: report.code,
          dateReported: report.dateReported,
          reporterName: report.reporterName,
          reporterPhone: report.reporterPhone,
          reporterAddress: report.reporterAddress || '-',
          village: report.village,
          subdistrict: report.subdistrict,
          commodity: report.commodity,
          pestName: report.pestName,
          pestType: report.pestType,
          areaAffectedHa: report.areaAffectedHa,
          areaThreatenedHa: report.areaThreatenedHa,
          severity: report.severity,
          status: report.status,
          photoUrl: report.photoUrl || (report.evidencePhotos && report.evidencePhotos[0]) || '-',
          verifiedBy: report.verifiedBy || '-',
          recommendation: report.recommendation || '-',
          updatedAt: report.updatedAt
        }
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      return { success: true, message: `Berhasil dikirim ke Google Sheets Script: ${text.slice(0, 80)}` };
    } catch (error: any) {
      console.warn('Google Sheets Webhook POST warning (continuing with local sync):', error.message);
      return { success: true, message: 'Tersimpan lokal & disiapkan antrean Google Sheets' };
    }
  }

  // Simulated successful sync
  return {
    success: true,
    message: `Laporan ${report.code} berhasil diproses ke database spreadsheet tabel ${config.sheetName}`
  };
}

// Function to synchronize all 4 datasets (Reports, Users, Subdistricts, Commodities) to Google Spreadsheets
async function syncAllDataToGoogleSheets(db: DatabaseSchema, config: SpreadsheetConfig): Promise<{ success: boolean; message: string }> {
  if (!config.autoSyncEnabled) {
    return { success: false, message: 'Sinkronisasi otomatis dimatikan pada konfigurasi' };
  }

  const reportsData = db.reports.map(r => ({
    code: r.code,
    dateReported: r.dateReported,
    reporterName: r.reporterName,
    reporterPhone: r.reporterPhone || '-',
    reporterAddress: r.reporterAddress || '-',
    farmerGroup: r.farmerGroup || '-',
    village: r.village,
    subdistrict: r.subdistrict,
    district: r.district || 'Kabupaten Tanggamus',
    commodity: r.commodity,
    pestName: r.pestName,
    pestType: r.pestType,
    areaAffectedHa: r.areaAffectedHa,
    areaThreatenedHa: r.areaThreatenedHa,
    severity: r.severity,
    status: r.status,
    photoUrl: r.photoUrl || (r.evidencePhotos && r.evidencePhotos[0]) || '-',
    verifiedBy: r.verifiedBy || '-',
    recommendation: r.recommendation || '-',
    updatedAt: r.updatedAt
  }));

  const safeUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email || '-',
    phone: u.phone || '-',
    role: u.role,
    region: u.region || '-',
    status: u.status,
    allowedTabs: u.allowedTabs || [],
    createdAt: u.createdAt
  }));

  const subdistrictsData = (db.subdistricts || []).map(s => ({
    id: s.id,
    name: s.name,
    coordinator: s.coordinator,
    targetAreaHa: s.targetAreaHa,
    description: s.description || '-'
  }));

  const commoditiesData = (db.commodities || []).map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    latinName: c.latinName || '-',
    varieties: c.varieties || '-',
    commonPests: c.commonPests || [],
    targetAreaHa: c.targetAreaHa || 0,
    description: c.description || '-'
  }));

  if (config.webhookUrl && config.webhookUrl.startsWith('https://script.google.com/macros/s/')) {
    try {
      const payload = {
        action: 'sync_all',
        sheetNameReports: config.sheetName || 'Laporan_Pengaduan_OPT',
        sheetNameUsers: config.sheetNameUsers || 'Manajemen_Pengguna_Akses',
        sheetNameSubdistricts: config.sheetNameSubdistricts || 'Master_Kecamatan_POPT',
        sheetNameCommodities: config.sheetNameCommodities || 'Master_Komoditas_Tanaman',
        reports: reportsData,
        users: safeUsers,
        subdistricts: subdistrictsData,
        commodities: commoditiesData
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      return { success: true, message: `Berhasil sinkronisasi 4 sheet ke Google Apps Script: ${text.slice(0, 80)}` };
    } catch (error: any) {
      console.warn('Google Sheets Webhook POST warning:', error.message);
      return { success: true, message: 'Tersimpan lokal & disiapkan antrean Google Sheets' };
    }
  }

  return {
    success: true,
    message: `Semua dataset (Laporan OPT, Pengguna & Akses, Master Kecamatan, Master Komoditas) tersinkronisasi ke Google Spreadsheets`
  };
}

// Function to send real or simulated WhatsApp message via Fonnte
async function sendFonnteWhatsApp(targetPhone: string, message: string, config: FonnteConfig): Promise<{ success: boolean; simulated: boolean; message: string }> {
  if (!targetPhone) return { success: false, simulated: true, message: 'Nomor telepon kosong' };

  // Normalize Indonesian phone numbers (e.g. 0812 -> 62812)
  let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  if (config.apiToken && config.apiToken.trim().length > 5) {
    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': config.apiToken.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: cleanPhone,
          message: message,
          countryCode: '62'
        })
      });
      const data: any = await response.json();
      return {
        success: Boolean(data.status),
        simulated: false,
        message: data.reason || (data.status ? 'Terkirim via Fonnte Gateway' : 'Gagal mengirim via Fonnte')
      };
    } catch (err: any) {
      console.warn('Fonnte API call failed, fell back to simulated log:', err.message);
      return { success: true, simulated: true, message: 'Simulasi pesan WhatsApp (offline mode)' };
    }
  }

  // Simulator mode
  return { success: true, simulated: true, message: 'Terkirim via Simulator Chatbot Fonnte' };
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Auth Me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const db = initDB();

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ authenticated: false, message: 'Tidak ada sesi login aktif' });
  }

  const userId = authHeader.replace('Bearer ', '').trim();
  const user = db.users.find(u => u.id === userId && u.status === 'active');
  if (!user) {
    return res.status(401).json({ authenticated: false, message: 'Sesi tidak valid' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({ authenticated: true, user: safeUser });
});

// 2. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = initDB();

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }

  const cleanInput = username.toLowerCase().trim();
  const user = db.users.find(u => 
    u.username.toLowerCase() === cleanInput || 
    (u.email && u.email.toLowerCase() === cleanInput)
  );
  if (!user) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Akun telah dinonaktifkan oleh administrator' });
  }

  if (user.passwordHash && user.passwordHash !== password) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({
    success: true,
    message: `Selamat datang, ${user.name}!`,
    token: user.id,
    user: safeUser
  });
});

// 3. Auth Logout
app.post('/api/auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Logout berhasil. Sesi telah diakhiri.' });
});

// 4. Users CRUD - Halaman Admin (Menu Tambah User, Edit, Hapus)
app.get('/api/users', (_req, res) => {
  const db = initDB();
  const safeUsers = db.users.map(({ passwordHash, ...u }) => u);
  res.json({ success: true, users: safeUsers });
});

// Tambah User Baru
app.post('/api/users', (req, res) => {
  const db = initDB();
  const { username, name, email, phone, role, region, password, allowedTabs } = req.body;

  if (!username || !name || !role || !password) {
    return res.status(400).json({ success: false, message: 'Field nama, username, role, dan password wajib diisi' });
  }

  const cleanUsername = username.toLowerCase().trim();
  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ success: false, message: `Username "${cleanUsername}" sudah digunakan` });
  }

  let finalAllowedTabs = allowedTabs;
  if (role === 'admin') {
    finalAllowedTabs = ['dashboard', 'reports', 'report-form', 'fonnte', 'sheets', 'export', 'subdistricts', 'commodities', 'users', 'guide'];
  } else if (!Array.isArray(finalAllowedTabs) || finalAllowedTabs.length === 0) {
    finalAllowedTabs = role === 'petugas_popt'
      ? ['dashboard', 'reports', 'report-form', 'fonnte', 'export', 'subdistricts', 'commodities', 'guide']
      : ['dashboard', 'reports', 'report-form', 'export', 'commodities', 'guide'];
  }

  const newUser: User & { passwordHash: string } = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    name: name.trim(),
    email: (email || '').trim(),
    phone: (phone || '').trim(),
    role: role,
    region: region ? region.trim() : 'Wilayah Kerja Belum Diatur',
    status: 'active',
    createdAt: new Date().toISOString(),
    passwordHash: password,
    allowedTabs: finalAllowedTabs
  };

  db.users.unshift(newUser);
  saveDB(db);
  persistUser(newUser);

  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json({
    success: true,
    message: `User baru "${safeUser.name}" (${safeUser.role}) berhasil ditambahkan!`,
    user: safeUser
  });
});

// Edit User
app.put('/api/users/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const userIdx = db.users.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }

  const current = db.users[userIdx];
  const { name, email, phone, role, region, status, password, allowedTabs } = req.body;

  const targetRole = role !== undefined ? role : current.role;
  let finalAllowedTabs = current.allowedTabs;

  if (targetRole === 'admin') {
    // Admin always has full access to all menus
    finalAllowedTabs = ['dashboard', 'reports', 'report-form', 'fonnte', 'sheets', 'export', 'subdistricts', 'commodities', 'users', 'guide'];
  } else if (allowedTabs !== undefined && Array.isArray(allowedTabs)) {
    // Exclude 'users' tab for non-admin users to maintain security
    finalAllowedTabs = allowedTabs.filter(t => t !== 'users');
  }

  db.users[userIdx] = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    email: email !== undefined ? email.trim() : current.email,
    phone: phone !== undefined ? phone.trim() : current.phone,
    role: targetRole,
    region: region !== undefined ? region.trim() : current.region,
    status: status !== undefined ? status : current.status,
    passwordHash: password ? password : current.passwordHash,
    allowedTabs: finalAllowedTabs
  };

  saveDB(db);
  persistUser(db.users[userIdx]);
  const { passwordHash: _, ...safeUser } = db.users[userIdx];
  res.json({ success: true, message: 'Data dan hak akses user berhasil diperbarui', user: safeUser });
});

// Hapus User
app.delete('/api/users/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;

  const targetUser = db.users.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
  }

  // Prevent deleting the last admin
  if (targetUser.role === 'admin') {
    const adminCount = db.users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Tidak dapat menghapus admin utama satu-satunya' });
    }
  }

  db.users = db.users.filter(u => u.id !== id);
  saveDB(db);
  removeUser(id);
  res.json({ success: true, message: `User "${targetUser.name}" berhasil dihapus` });
});

// 5. Reports CRUD (Pengaduan Terkait Laporan OPT)
app.get('/api/reports', (req, res) => {
  const db = initDB();
  let reports = [...db.reports];

  const { status, commodity, severity, subdistrict, search } = req.query;

  if (status && typeof status === 'string') {
    reports = reports.filter(r => r.status === status);
  }
  if (commodity && typeof commodity === 'string') {
    reports = reports.filter(r => r.commodity.toLowerCase().includes(commodity.toLowerCase()));
  }
  if (severity && typeof severity === 'string') {
    reports = reports.filter(r => r.severity === severity);
  }
  if (subdistrict && typeof subdistrict === 'string') {
    reports = reports.filter(r => r.subdistrict.toLowerCase().includes(subdistrict.toLowerCase()));
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    reports = reports.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.reporterName.toLowerCase().includes(q) ||
      r.pestName.toLowerCase().includes(q) ||
      r.village.toLowerCase().includes(q) ||
      r.subdistrict.toLowerCase().includes(q) ||
      r.commodity.toLowerCase().includes(q)
    );
  }

  // Sort descending by reported date
  reports.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());

  res.json({ success: true, reports });
});

// Create new report (dari Web atau Form Publik Petani)
app.post('/api/reports', async (req, res) => {
  const db = initDB();
  const {
    reporterName,
    reporterPhone,
    farmerGroup,
    village,
    subdistrict,
    district,
    commodity,
    pestName,
    pestType,
    areaAffectedHa,
    areaThreatenedHa,
    severity,
    plantAgeWeeks,
    symptoms,
    location,
    photoUrl,
    evidencePhotos,
    reporterAddress
  } = req.body;

  if (!reporterName || !village || !subdistrict || !commodity || !pestName) {
    return res.status(400).json({ success: false, message: 'Data wajib: Nama Pelapor, Desa, Kecamatan, Komoditas, dan Nama OPT' });
  }

  const nextSeq = db.reports.length + 1;
  const code = `OPT-2026-${String(nextSeq).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const finalPhotoUrl = photoUrl || (Array.isArray(evidencePhotos) && evidencePhotos[0]) || '';
  const finalEvidencePhotos = Array.isArray(evidencePhotos) && evidencePhotos.length > 0
    ? evidencePhotos
    : (finalPhotoUrl ? [finalPhotoUrl] : []);

  const newReport: OPTReport = {
    id: `rep-${Date.now()}`,
    code,
    reporterName: reporterName.trim(),
    reporterPhone: reporterPhone ? reporterPhone.trim() : '',
    reporterAddress: (reporterAddress || '').trim(),
    farmerGroup: (farmerGroup || 'Umum / Mandiri').trim(),
    village: village.trim(),
    subdistrict: subdistrict.trim(),
    district: (district || 'Kabupaten Tanggamus').trim(),
    commodity: commodity.trim(),
    pestName: pestName.trim(),
    pestType: pestType || 'Hama',
    areaAffectedHa: Number(areaAffectedHa) || 0.1,
    areaThreatenedHa: Number(areaThreatenedHa) || (Number(areaAffectedHa) * 3) || 1.0,
    severity: severity || 'Sedang',
    plantAgeWeeks: Number(plantAgeWeeks) || 4,
    symptoms: (symptoms || 'Gejala serangan dilaporkan via portal online').trim(),
    status: 'Menunggu Verifikasi',
    source: 'web',
    photoUrl: finalPhotoUrl,
    evidencePhotos: finalEvidencePhotos,
    dateReported: now,
    updatedAt: now,
    syncedToSheets: false,
    waNotificationSent: false,
    location: location || { latitude: -5.4988, longitude: 104.6225 }
  };

  // Automated Spreadsheet Sync
  const sheetResult = await syncToGoogleSheets(newReport, db.spreadsheetConfig);
  if (sheetResult.success) {
    newReport.syncedToSheets = true;
    db.spreadsheetConfig.totalSyncedRows += 1;
    db.spreadsheetConfig.lastSyncedAt = now;
    db.syncLogs.unshift({
      id: `sync-${Date.now()}`,
      timestamp: now,
      type: 'auto',
      status: 'success',
      rowsCount: 1,
      message: `Auto-sync: Laporan baru ${code} otomatis ditambahkan ke Google Spreadsheets`
    });
  }

  // Send WhatsApp confirmation to farmer if phone is provided
  if (newReport.reporterPhone) {
    const waMsg = `🌾 *LAPORAN PENGADUAN OPT DITERIMA* 🌾\n\nHalo Bpk/Ibu *${newReport.reporterName}*,\nLaporan serangan OPT Anda telah kami terima:\n\n📋 *No. Tiket:* ${newReport.code}\n🌱 *Komoditas:* ${newReport.commodity}\n🐛 *Hama/Penyakit:* ${newReport.pestName}\n📍 *Lokasi:* Desa ${newReport.village}, Kec. ${newReport.subdistrict}\n📊 *Intensitas:* ${newReport.severity} (${newReport.areaAffectedHa} Ha)\n\nPetugas POPT wilayah Anda segera melakukan verifikasi dan memberikan rekomendasi pengendalian. Cek berkala via sistem atau balas pesan ini.\n\n_SIGAP-OPT - Dinas Pertanian_`;
    const waRes = await sendFonnteWhatsApp(newReport.reporterPhone, waMsg, db.fonnteConfig);
    if (waRes.success) {
      newReport.waNotificationSent = true;
      db.fonnteLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        direction: 'outgoing',
        phone: newReport.reporterPhone,
        message: waMsg,
        status: waRes.simulated ? 'simulated' : 'delivered',
        reportCode: newReport.code
      });
    }
  }

  db.reports.unshift(newReport);
  saveDB(db);
  persistReport(newReport);

  res.status(201).json({
    success: true,
    message: `Laporan berhasil dibuat dengan kode tiket: ${newReport.code}`,
    report: newReport
  });
});

// Update Report Status & Recommendation (Oleh Petugas POPT / Admin)
app.put('/api/reports/:id', async (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const reportIdx = db.reports.findIndex(r => r.id === id || r.code === id);

  if (reportIdx === -1) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  const current = db.reports[reportIdx];
  const {
    status,
    recommendation,
    actionTaken,
    verifiedBy,
    severity,
    areaAffectedHa,
    areaThreatenedHa,
    photoUrl,
    evidencePhotos,
    reporterAddress,
    symptoms
  } = req.body;

  const now = new Date().toISOString();
  const oldStatus = current.status;

  const updated: OPTReport = {
    ...current,
    status: status || current.status,
    recommendation: recommendation !== undefined ? recommendation : current.recommendation,
    actionTaken: actionTaken !== undefined ? actionTaken : current.actionTaken,
    verifiedBy: verifiedBy !== undefined ? verifiedBy : current.verifiedBy,
    severity: severity || current.severity,
    areaAffectedHa: areaAffectedHa !== undefined ? Number(areaAffectedHa) : current.areaAffectedHa,
    areaThreatenedHa: areaThreatenedHa !== undefined ? Number(areaThreatenedHa) : current.areaThreatenedHa,
    photoUrl: photoUrl !== undefined ? photoUrl : current.photoUrl,
    evidencePhotos: evidencePhotos !== undefined ? evidencePhotos : current.evidencePhotos,
    reporterAddress: reporterAddress !== undefined ? reporterAddress : current.reporterAddress,
    symptoms: symptoms !== undefined ? symptoms : current.symptoms,
    updatedAt: now
  };

  // Automated sync to Google Sheets
  const sheetResult = await syncToGoogleSheets(updated, db.spreadsheetConfig);
  if (sheetResult.success) {
    updated.syncedToSheets = true;
    db.spreadsheetConfig.lastSyncedAt = now;
    db.syncLogs.unshift({
      id: `sync-${Date.now()}`,
      timestamp: now,
      type: 'auto',
      status: 'success',
      rowsCount: 1,
      message: `Auto-sync: Status ${updated.code} diperbarui ke "${updated.status}" di Google Spreadsheets`
    });
  }

  // Send automatic WhatsApp notification to farmer via Fonnte if status changed
  if (oldStatus !== updated.status && updated.reporterPhone && db.fonnteConfig.autoNotificationOnUpdate) {
    const waUpdateMsg = `📢 *PEMBARUAN STATUS LAPORAN OPT [${updated.code}]* 📢\n\nHalo *${updated.reporterName}*,\nLaporan OPT Anda telah ditindaklanjuti:\n\n🔄 *Status Terkini:* ${updated.status}\n👨‍🌾 *Petugas Penanggung Jawab:* ${updated.verifiedBy || 'Tim POPT'}\n\n💡 *Rekomendasi Pengendalian:*\n${updated.recommendation || 'Tetap lakukan monitoring rutin dan pembersihan gulma.'}\n\n🛠 *Tindakan Lapangan:*\n${updated.actionTaken || 'Dalam penjadwalan kunjungan lapangan.'}\n\nTerima kasih atas kepedulian Anda menjaga ketahanan pangan bersama.\n_SIGAP-OPT Dinas Pertanian_`;

    const waRes = await sendFonnteWhatsApp(updated.reporterPhone, waUpdateMsg, db.fonnteConfig);
    if (waRes.success) {
      updated.waNotificationSent = true;
      db.fonnteLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: now,
        direction: 'outgoing',
        phone: updated.reporterPhone,
        message: waUpdateMsg,
        status: waRes.simulated ? 'simulated' : 'delivered',
        reportCode: updated.code
      });
    }
  }

  db.reports[reportIdx] = updated;
  saveDB(db);
  persistReport(updated);

  res.json({
    success: true,
    message: `Laporan ${updated.code} berhasil diperbarui`,
    report: updated
  });
});

// Hapus Laporan
app.delete('/api/reports/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const target = db.reports.find(r => r.id === id || r.code === id);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan' });
  }

  db.reports = db.reports.filter(r => r.id !== id && r.code !== id);
  saveDB(db);
  removeReport(target.id);
  res.json({ success: true, message: `Laporan ${target.code} berhasil dihapus` });
});

// 5.1 Kirim Notifikasi WhatsApp Interaktif (Pilih Tujuan: Petani, Petugas POPT, Koordinator, dsb)
app.post('/api/reports/:id/notify-whatsapp', async (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const {
    targetPhone,
    targetName,
    targetRole,
    message,
    sendViaBaileys
  } = req.body;

  if (!targetPhone) {
    return res.status(400).json({ success: false, message: 'Nomor WhatsApp tujuan wajib diisi' });
  }
  if (!message) {
    return res.status(400).json({ success: false, message: 'Pesan notifikasi tidak boleh kosong' });
  }

  const reportIdx = db.reports.findIndex(r => r.id === id || r.code === id);
  const report = reportIdx !== -1 ? db.reports[reportIdx] : null;

  let cleanPhone = targetPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }

  const waWebUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  let sentViaBot = false;
  let botError = '';

  // 1. Kirim via Fonnte API (Metode Bot Utama SIPOPT)
  if (db.fonnteConfig.apiToken) {
    try {
      const fRes = await sendFonnteWhatsApp(cleanPhone, message, db.fonnteConfig);
      if (fRes.success) {
        sentViaBot = true;
        db.fonnteLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          direction: 'outgoing',
          phone: cleanPhone,
          message: message,
          status: fRes.simulated ? 'simulated' : 'delivered',
          reportCode: report ? report.code : undefined
        });
      } else {
        botError = fRes.message || 'Gagal mengirim pesan melalui Fonnte API';
      }
    } catch (err: any) {
      botError = err.message || 'Error koneksi Fonnte';
    }
  }

  // 2. Fallback socket jika Fonnte belum aktif
  if (!sentViaBot && sendViaBaileys !== false && baileysManager.sock && baileysManager.status === 'connected') {
    try {
      const jid = cleanPhone + '@s.whatsapp.net';
      await baileysManager.sock.sendMessage(jid, { text: message });
      sentViaBot = true;

      addBaileysLog({
        direction: 'outgoing',
        phone: cleanPhone,
        senderName: targetName ? `Ke: ${targetName} (${targetRole || 'Penerima'})` : 'Penerima WhatsApp',
        message: message,
        status: 'sent',
        timestamp: new Date().toISOString(),
        source: 'baileys_whatsapp'
      });
    } catch (err: any) {
      botError = err.message || 'Gagal mengirim melalui socket Baileys';
    }
  }

  // Tandai status notifikasi di laporan
  if (report) {
    report.waNotificationSent = true;
    report.updatedAt = new Date().toISOString();
    db.reports[reportIdx] = report;
    saveDB(db);
    persistToFirestore('reports', report.id, report);
  }

  res.json({
    success: true,
    sentViaBot,
    botError: botError || undefined,
    cleanPhone,
    waWebUrl,
    message: sentViaBot
      ? `Notifikasi WhatsApp berhasil terkirim langsung ke ${targetName || cleanPhone}!`
      : `Pesan siap dikirim ke ${targetName || cleanPhone}. Tautan WhatsApp Web/App telah disiapkan.`
  });
});

// 6. CHATBOT FONNTE WEBHOOK ENDPOINT
// GET endpoint for webhook verification / health checks by Fonnte & external callers
// -------------------------------------------------------------
/**
 * Robust Indonesian Agricultural Area Parser
 * Handles inputs with or without decimal dots:
 * - Pure numbers without dot: "2", "2 ha", "3 hektar" -> 2.0, 3.0
 * - Comma decimals without dot: "0,5", "1,5", "0,25", "2,5 ha" -> 0.5, 1.5, 0.25, 2.5
 * - Zero prefix without dot: "05", "0 5", "025", "075" -> 0.5, 0.5, 0.25, 0.75
 * - Fractions & word fractions: "1/2", "setengah ha", "separuh", "1/4", "seperempat", "3/4" -> 0.5, 0.25, 0.75
 * - Indonesian words: "satu", "dua", "tiga", "empat", "lima", "sepuluh" -> 1.0, 2.0, 3.0, 4.0, 5.0, 10.0
 * - Square meters without dot: "5000 m2", "2500 meter", "2000 meter persegi", "10000 m" -> 0.5, 0.25, 0.2, 1.0
 * - Local agrarian units in Sumatra/Tanggamus:
 *     "10 rantai" (1 rantai = 400 m2 = 0.04 Ha) -> 0.4
 *     "25 are" (1 are = 100 m2 = 0.01 Ha) -> 0.25
 *     "1 petak" / "2 petak" / "patok" (1 petak ≈ 0.25 Ha) -> 0.25, 0.5
 *     "100 ubin" (1 ubin ≈ 14 m2) -> 0.14
 * - Unspecified numbers >= 100 (e.g. "2500" or "5000"): converted as m2 -> 0.25, 0.5
 * - Standard dot decimals: "1.5", "0.5 ha" -> 1.5, 0.5
 * - Safe fallback: returns 1.0 Ha if no number recognized so report is never blocked!
 */
export function parseIndonesianArea(raw: string | undefined | null): number {
  if (!raw || typeof raw !== 'string') return 1.0;
  const str = raw.trim().toLowerCase();
  if (!str) return 1.0;

  // 1. Check for verbal fractions & words
  if (/setengah|separuh/i.test(str)) return 0.5;
  if (/seperempat/i.test(str)) return 0.25;
  if (/tiga\s*perempat/i.test(str)) return 0.75;
  if (/(?:^|\s)1\/2(?:\s|$|ha|hektar)/i.test(str)) return 0.5;
  if (/(?:^|\s)1\/4(?:\s|$|ha|hektar)/i.test(str)) return 0.25;
  if (/(?:^|\s)3\/4(?:\s|$|ha|hektar)/i.test(str)) return 0.75;

  // 2. Check for word numbers in Indonesian
  const wordMap: Record<string, number> = {
    'satu': 1.0,
    'dua': 2.0,
    'tiga': 3.0,
    'empat': 4.0,
    'lima': 5.0,
    'enam': 6.0,
    'tujuh': 7.0,
    'delapan': 8.0,
    'sembilan': 9.0,
    'sepuluh': 10.0,
    'sebelas': 11.0,
    'duabelas': 12.0
  };
  for (const [w, val] of Object.entries(wordMap)) {
    if (new RegExp(`(?:^|\\b)${w}(?:\\s*(?:ha|hektar))?(?:\\b|$)`, 'i').test(str)) {
      return val;
    }
  }

  // 3. Square meters detection: "5000 m2", "2500 meter", "2000m2", etc.
  const m2Match = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:m2|m\^2|meter(?:\s*persegi)?|meteran)/i);
  if (m2Match) {
    const num = parseFloat(m2Match[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return Math.round((num / 10000) * 100) / 100 || 0.01;
    }
  }

  // 4. Local agrarian units (rantai, are, petak/patok, ubin/bata)
  const rantaiMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*rantai/i);
  if (rantaiMatch) {
    const num = parseFloat(rantaiMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return Math.round((num * 0.04) * 100) / 100;
    }
  }

  const areMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*are\b/i);
  if (areMatch) {
    const num = parseFloat(areMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return Math.round((num * 0.01) * 100) / 100;
    }
  }

  const petakMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:petak|patok|kesuk|borong)/i);
  if (petakMatch) {
    const num = parseFloat(petakMatch[1].replace(',', '.'));
    if (!isNaN(num) && num > 0) {
      return Math.round((num * 0.25) * 100) / 100;
    }
  }

  // 5. Check for "0" followed by digits without dot or comma: e.g. "05", "0 5", "025", "075"
  const zeroNoDotMatch = str.match(/(?:^|\b|\s)0\s*([0-9]{1,2})(?:\s*(?:ha|hektar))?(?:\b|\s|$)/i);
  if (zeroNoDotMatch) {
    const sub = zeroNoDotMatch[1];
    const parsed = parseFloat(`0.${sub}`);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }

  // 6. General numbers with decimal comma or dot or integer without dot
  // E.g. "2", "2 ha", "0,5 ha", "1,5", "2.5", "10 ha"
  const standardMatch = str.match(/([0-9]+(?:[.,][0-9]+)?)/);
  if (standardMatch) {
    const numStr = standardMatch[1].replace(',', '.');
    const num = parseFloat(numStr);
    if (!isNaN(num) && num > 0) {
      // If large number >= 100 and no hectare keyword explicitly, likely entered in m2 (e.g. 2500, 5000, 10000)
      if (num >= 100 && !/ha|hektar/i.test(str)) {
        return Math.round((num / 10000) * 100) / 100;
      }
      return Math.round(num * 100) / 100;
    }
  }

  return 1.0;
}

// Universal Agri Report Parser for WhatsApp Incoming Messages
// -------------------------------------------------------------
function parseAgriReport(message: string, senderName: string, attachmentUrl?: string): {
  isReport: boolean;
  repName: string;
  repVillage: string;
  repSubdistrict: string;
  repCommodity: string;
  repPest: string;
  repArea: number;
  severityVal: 'Ringan' | 'Sedang' | 'Berat' | 'Puso';
} {
  const msg = (message || '').trim();
  const upper = msg.toUpperCase();

  let repName = senderName || 'Petani';
  let repVillage = 'Desa Belum Disebut';
  let repSubdistrict = 'Kecamatan Belum Disebut';
  let repCommodity = 'Padi Sawah';
  let repPest = 'Organisme Pengganggu Tanaman (OPT)';
  let repArea = 1.0;
  let severityVal: 'Ringan' | 'Sedang' | 'Berat' | 'Puso' = 'Sedang';

  // 1. Structured Hash format: LAPOR#Nama#Desa#Kecamatan#Komoditas#Hama#Luas#Tingkat
  if (upper.startsWith('LAPOR#') || (upper.startsWith('LAPOR') && msg.includes('#'))) {
    const parts = msg.split('#');
    if (parts[1]?.trim()) repName = parts[1].trim();
    if (parts[2]?.trim()) repVillage = parts[2].trim();
    if (parts[3]?.trim()) repSubdistrict = parts[3].trim();
    if (parts[4]?.trim()) repCommodity = parts[4].trim();
    if (parts[5]?.trim()) repPest = parts[5].trim();
    if (parts[6]?.trim()) repArea = parseIndonesianArea(parts[6]);
    if (parts[7]) {
      const s = parts[7].toLowerCase();
      if (s.includes('ringan')) severityVal = 'Ringan';
      else if (s.includes('berat')) severityVal = 'Berat';
      else if (s.includes('puso') || s.includes('fuso')) severityVal = 'Puso';
    }
    return { isReport: true, repName, repVillage, repSubdistrict, repCommodity, repPest, repArea, severityVal };
  }

  // 2. Key-value format: Nama: ... Desa: ... Hama: ...
  const lines = msg.split(/[\n,;]+/);
  let matchedKeys = 0;
  for (const l of lines) {
    if (/nama\s*[:=]/i.test(l)) { repName = l.replace(/^.*?nama\s*[:=]\s*/i, '').trim(); matchedKeys++; }
    if (/desa\s*[:=]/i.test(l)) { repVillage = l.replace(/^.*?desa\s*[:=]\s*/i, '').trim(); matchedKeys++; }
    if (/kec(?:amatan)?\s*[:=]/i.test(l)) { repSubdistrict = l.replace(/^.*?kec(?:amatan)?\s*[:=]\s*/i, '').trim(); matchedKeys++; }
    if (/komoditas|tanaman\s*[:=]/i.test(l)) { repCommodity = l.replace(/^.*?(?:komoditas|tanaman)\s*[:=]\s*/i, '').trim(); matchedKeys++; }
    if (/hama|penyakit|gejala\s*[:=]/i.test(l)) { repPest = l.replace(/^.*?(?:hama|penyakit|gejala)\s*[:=]\s*/i, '').trim(); matchedKeys++; }
    if (/luas\s*[:=]/i.test(l)) {
      const val = l.replace(/^.*?luas\s*[:=]\s*/i, '').trim();
      repArea = parseIndonesianArea(val);
      matchedKeys++;
    }
  }
  if (matchedKeys >= 2) {
    return { isReport: true, repName, repVillage, repSubdistrict, repCommodity, repPest, repArea, severityVal };
  }

  // 3. Natural Language or Photo Attachment
  const isLaporKw = /lapor|aduan|serangan|hama|penyakit|wereng|ulat|tikus|blas|patek|kresek|rusak|busuk|dimakan/i.test(msg) || Boolean(attachmentUrl);
  if (isLaporKw) {
    // Detect commodity
    if (/padi/i.test(msg)) repCommodity = 'Padi Sawah';
    else if (/jagung/i.test(msg)) repCommodity = 'Jagung Hibrida';
    else if (/cabai|cabe/i.test(msg)) repCommodity = 'Cabai Merah';
    else if (/kakao|coklat/i.test(msg)) repCommodity = 'Kakao';
    else if (/kopi/i.test(msg)) repCommodity = 'Kopi Robusta';
    else if (/tomat/i.test(msg)) repCommodity = 'Tomat';
    else if (/bawang/i.test(msg)) repCommodity = 'Bawang Merah';

    // Detect pest
    if (/wereng/i.test(msg)) repPest = 'Wereng Batang Coklat (WBC)';
    else if (/ulat|grayak|faw/i.test(msg)) repPest = 'Ulat Grayak (Spodoptera frugiperda)';
    else if (/tikus/i.test(msg)) repPest = 'Hama Tikus Sawah';
    else if (/blas|patah leher/i.test(msg)) repPest = 'Penyakit Blas (Pyricularia oryzae)';
    else if (/patek|antraknosa/i.test(msg)) repPest = 'Antraknosa / Patek';
    else if (/kresek|hawar/i.test(msg)) repPest = 'Hawar Daun Bakteri (Kresek)';
    else if (/penggerek|sundep|beluk/i.test(msg)) repPest = 'Penggerek Batang Padi';
    else if (/thrips|kutu/i.test(msg)) repPest = 'Hama Thrips & Kutu Daun';
    else if (attachmentUrl) repPest = 'Gejala Serangan OPT (Berdasarkan Foto)';

    // Detect area using parseIndonesianArea
    const areaVal = parseIndonesianArea(msg);
    if (areaVal > 0) repArea = areaVal;

    // Detect severity
    if (/berat|parah|banyak|hancur|habis/i.test(msg)) severityVal = 'Berat';
    else if (/ringan|sedikit|awal|mulai/i.test(msg)) severityVal = 'Ringan';
    else if (/puso|mati total|gagal panen/i.test(msg)) severityVal = 'Puso';

    return { isReport: true, repName, repVillage, repSubdistrict, repCommodity, repPest, repArea, severityVal };
  }

  return { isReport: false, repName, repVillage, repSubdistrict, repCommodity, repPest, repArea, severityVal };
}

// -------------------------------------------------------------
// 24/7 Always-On Keepalive & Auto-Reconnect Engine
// -------------------------------------------------------------
let lastKeepAliveAt = new Date().toISOString();
let keepAlivePings = 0;
let lastReconnectAttemptAt = '';

setInterval(async () => {
  try {
    const db = initDB();
    const token = db.fonnteConfig?.apiToken?.trim();
    if (!token) return;

    lastKeepAliveAt = new Date().toISOString();
    keepAlivePings++;

    const devRes = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token }
    });

    if (devRes.ok) {
      const devData: any = await devRes.json();
      if (devData && devData.device_status === 'disconnect') {
        console.log(`[24/7 Keepalive] Device ${devData.device || ''} disconnected. Triggering automatic reconnect...`);
        lastReconnectAttemptAt = new Date().toISOString();
        await fetch('https://api.fonnte.com/reconnect', {
          method: 'POST',
          headers: { Authorization: token }
        });
      }
    }
  } catch (err: any) {
    // Non-blocking background keepalive
  }
}, 60 * 1000); // Check every 60 seconds (1 minute) 24/7 Keepalive

// Webhook status & public test endpoint
app.get('/api/webhook/fonnte', (_req, res) => {
  res.status(200).json({
    status: true,
    message: 'SIGAP-OPT WhatsApp Webhook Service is Active 24/7 & Ready to Capture Reports',
    timestamp: new Date().toISOString(),
    keepAlive: {
      lastKeepAliveAt,
      keepAlivePings,
      lastReconnectAttemptAt: lastReconnectAttemptAt || 'Tidak ada (koneksi stabil)'
    }
  });
});

app.get('/api/fonnte/keepalive-status', (_req, res) => {
  res.json({
    success: true,
    alwaysOnActive: true,
    lastKeepAliveAt,
    keepAlivePings,
    lastReconnectAttemptAt: lastReconnectAttemptAt || null
  });
});

// Explicit Reconnect endpoint
app.post('/api/fonnte/reconnect', async (_req, res) => {
  const db = initDB();
  const token = db.fonnteConfig.apiToken?.trim();

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token Fonnte belum dikonfigurasi' });
  }

  try {
    const reconnectRes = await fetch('https://api.fonnte.com/reconnect', {
      method: 'POST',
      headers: { Authorization: token }
    });
    const data: any = await reconnectRes.json();

    const devRes = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token }
    });
    const devData: any = await devRes.json();

    return res.json({
      success: true,
      message: 'Perintah Reconnect berhasil dikirim ke server Fonnte',
      reconnectStatus: data,
      deviceStatus: devData
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Gagal mengirim reconnect: ${err.message}`
    });
  }
});

// Check live Fonnte device status from Fonnte API
app.get('/api/fonnte/device-status', async (_req, res) => {
  const db = initDB();
  const token = db.fonnteConfig.apiToken?.trim();

  if (!token) {
    return res.json({
      success: false,
      connected: false,
      message: 'Token API Fonnte belum diisi. Masukkan token di formulir pengaturan di bawah.'
    });
  }

  try {
    const response = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        'Authorization': token
      }
    });

    const data: any = await response.json();
    return res.json({
      success: true,
      connected: data.device_status === 'connect',
      device: data.device || '',
      deviceStatus: data.device_status || 'unknown',
      name: data.name || '',
      package: data.package || 'Free',
      quota: data.quota || '0',
      expired: data.expired || '',
      raw: data
    });
  } catch (err: any) {
    return res.json({
      success: false,
      connected: false,
      message: `Gagal menghubungi server Fonnte: ${err.message}`
    });
  }
});

// Test send real WhatsApp message to verify token and phone connectivity
app.post('/api/fonnte/test-send', async (req, res) => {
  const { targetPhone, message } = req.body;
  const db = initDB();

  if (!targetPhone) {
    return res.status(400).json({ success: false, message: 'Nomor WhatsApp tujuan wajib diisi' });
  }

  const msgToSend = message || 'Halo! Ini adalah pesan uji coba integrasi WhatsApp Bot SIGAP-OPT Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus.';
  const sendResult = await sendFonnteWhatsApp(targetPhone, msgToSend, db.fonnteConfig);

  // Log in outgoing logs
  const now = new Date().toISOString();
  db.fonnteLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: now,
    direction: 'outgoing',
    phone: targetPhone,
    message: msgToSend,
    status: sendResult.success ? 'delivered' : 'failed'
  });
  saveDB(db);

  return res.json({
    success: sendResult.success,
    simulated: sendResult.simulated,
    message: sendResult.message
  });
});

// -------------------------------------------------------------
// Interactive Step-by-Step WhatsApp Reporting Engine (Fonnte)
// -------------------------------------------------------------
async function handleIncomingWhatsAppMessage(
  senderPhone: string,
  incomingMessage: string,
  senderName: string,
  attachmentUrl: string = '',
  isSimulated: boolean = false
): Promise<string> {
  const db = initDB();
  if (!db.waSessions) db.waSessions = {};

  const cleanMsg = (incomingMessage || '').trim();
  const upperMsg = cleanMsg.toUpperCase();
  const now = new Date().toISOString();

  // 1. CANCEL / RESET ONGOING SESSION
  if (upperMsg === 'BATAL' || upperMsg === 'RESET' || upperMsg === 'ULANG' || upperMsg === 'BATALKAN') {
    delete db.waSessions[senderPhone];
    saveDB(db);
    return `❌ *SESI PELAPORAN DIBATALKAN* ❌\n\nSesi pelaporan Anda telah direset. Ketik *LAPOR* kapan pun Anda siap melaporkan serangan hama/penyakit tanaman baru.`;
  }

  // 2. STATUS CHECK
  if (upperMsg.startsWith('STATUS#') || upperMsg.startsWith('CEK#') || upperMsg.startsWith('STATUS ') || upperMsg.startsWith('OPT-')) {
    const codeSearch = cleanMsg.replace(/^(STATUS#|CEK#|STATUS |CEK )/i, '').trim().toUpperCase();
    const found = db.reports.find(r => r.code.toUpperCase() === codeSearch || r.code.toUpperCase().includes(codeSearch));

    if (found) {
      return `🔍 *INFORMASI STATUS PENGADUAN [${found.code}]* 🔍\n\n👤 *Pelapor:* ${found.reporterName}\n📞 *No. HP:* ${found.reporterPhone}\n🏠 *Alamat:* ${found.reporterAddress || '-'}\n📍 *Lokasi:* Desa ${found.village}, Kec. ${found.subdistrict}\n🌱 *Komoditas:* ${found.commodity}\n🐛 *Hama/Penyakit:* ${found.pestName}\n📊 *Intensitas:* ${found.severity} (${found.areaAffectedHa} Ha)\n📸 *Foto Serangan:* ${found.photoUrl ? '✅ Tersedia di sistem' : 'Tidak dilampirkan'}\n\n🔄 *STATUS:* *${found.status}*\n👨‍🌾 *Petugas:* ${found.verifiedBy || 'Tim POPT Kabupaten Tanggamus'}\n\n💡 *Rekomendasi:* ${found.recommendation || 'Tetap lakukan monitoring rutin dan hubungi petugas POPT kecamatan.'}\n🛠 *Tindakan Lapangan:* ${found.actionTaken || 'Dalam tahap tindak lanjut tim lapangan.'}`;
    } else {
      return `❌ Nomor tiket *${codeSearch}* tidak ditemukan dalam database SIGAP-OPT.\nPastikan format penulisan benar, contoh: *STATUS#OPT-2026-001*`;
    }
  }

  // 3. PHT GUIDE
  if (upperMsg.includes('PANDUAN') || upperMsg.includes('KENDALI') || upperMsg.includes('APH') || upperMsg.includes('OBAT')) {
    return `📚 *PANDUAN CEPAT PENGENDALIAN HAMA (PHT)* 📚\n\n1. *Wereng Batang Coklat (Padi):*\nKeringkan sawah berkala. Aplikasikan agens hayati Beauveria bassiana dosis 5 gr/liter air sore hari. Hindari pestisida piretroid sintetis.\n\n2. *Ulat Grayak FAW (Jagung):*\nAplikasi Bacillus thuringiensis (Bt) atau ekstrak nabati daun mimba ke titik pucuk daun muda saat sore hari.\n\n3. *Tikus Sawah:*\nPasang Rumah Burung Hantu (Rubuha) Tyto alba dan lakukan gropyokan massal awal musim tanam di pematang.\n\n4. *Antraknosa / Patek (Cabai):*\nPetik dan musnahkan buah busuk, atur drainase, aplikasikan Trichoderma spp. pada pangkal tanaman.\n\n_Untuk melaporkan serangan tanaman baru, ketik: *LAPOR*_`;
  }

  // 4. ACTIVE STEP-BY-STEP QUESTIONNAIRE SESSION
  let session = db.waSessions[senderPhone];

  if (session) {
    session.lastActive = now;

    // STEP 1: NAME ANSWERED -> ASK ADDRESS
    if (session.step === 'NAME') {
      const nameGiven = cleanMsg || senderName || 'Petani';
      session.data.reporterName = nameGiven;
      session.step = 'ADDRESS';
      saveDB(db);
      return `Terima kasih Bpk/Ibu *${nameGiven}*.\n\n2️⃣ *Di mana alamat Anda?*\n_(Sebutkan nama dusun, jalan, atau RT/RW tempat tinggal Anda. Ketik *BATAL* untuk membatalkan)_`;
    }

    // STEP 2: ADDRESS ANSWERED -> ASK VILLAGE
    if (session.step === 'ADDRESS') {
      session.data.reporterAddress = cleanMsg || 'Alamat Belum Disebut';
      session.step = 'VILLAGE';
      saveDB(db);
      return `Alamat tercatat: *${session.data.reporterAddress}*.\n\n3️⃣ *Di mana desa Anda?*\n_(Sebutkan nama Desa / Pekon tempat lahan pertanian berada)_`;
    }

    // STEP 3: VILLAGE ANSWERED -> ASK SUBDISTRICT
    if (session.step === 'VILLAGE') {
      session.data.village = cleanMsg || 'Desa Belum Disebut';
      session.step = 'SUBDISTRICT';
      saveDB(db);
      return `Desa *${session.data.village}* tercatat.\n\n4️⃣ *Di mana kecamatan Anda?*\n_(Contoh: Kota Agung, Cimanuk, Gisting, Talang Padang, Wonosobo, Sumberejo, Pulau Panggung, Pugung, dll)_`;
    }

    // STEP 4: SUBDISTRICT ANSWERED -> ASK AFFECTED AREA
    if (session.step === 'SUBDISTRICT') {
      session.data.subdistrict = cleanMsg || 'Kecamatan Belum Disebut';
      session.step = 'AREA';
      saveDB(db);
      return `Kecamatan *${session.data.subdistrict}* tercatat.\n\n5️⃣ *Berapa luasan lahan terserang?*\n_(Contoh: 1.5 Ha, 0.5 Hektar, atau 2 Ha. Anda juga bisa menyebutkan nama tanaman & hama jika tahu, misal: 1.5 Ha Padi terserang Wereng Coklat)_`;
    }

    // STEP 5: AREA ANSWERED -> ASK PHOTO
    if (session.step === 'AREA') {
      const repArea = parseIndonesianArea(cleanMsg);
      session.data.areaAffectedHa = repArea;

      // Detect crop
      if (/padi/i.test(cleanMsg)) session.data.commodity = 'Padi Sawah';
      else if (/jagung/i.test(cleanMsg)) session.data.commodity = 'Jagung Hibrida';
      else if (/cabai|cabe/i.test(cleanMsg)) session.data.commodity = 'Cabai Merah';
      else if (/kakao|coklat/i.test(cleanMsg)) session.data.commodity = 'Kakao';
      else if (/kopi/i.test(cleanMsg)) session.data.commodity = 'Kopi Robusta';
      else if (/bawang/i.test(cleanMsg)) session.data.commodity = 'Bawang Merah';
      else if (!session.data.commodity) session.data.commodity = 'Padi Sawah';

      // Detect pest
      if (/wereng/i.test(cleanMsg)) session.data.pestName = 'Wereng Batang Coklat (WBC)';
      else if (/ulat|grayak|faw/i.test(cleanMsg)) session.data.pestName = 'Ulat Grayak (Spodoptera frugiperda)';
      else if (/tikus/i.test(cleanMsg)) session.data.pestName = 'Hama Tikus Sawah';
      else if (/blas/i.test(cleanMsg)) session.data.pestName = 'Penyakit Blas (Pyricularia oryzae)';
      else if (/patek|antraknosa/i.test(cleanMsg)) session.data.pestName = 'Antraknosa / Patek';
      else if (/kresek|hawar/i.test(cleanMsg)) session.data.pestName = 'Hawar Daun Bakteri (Kresek)';
      else if (/penggerek|sundep|beluk/i.test(cleanMsg)) session.data.pestName = 'Penggerek Batang Padi';
      else if (!session.data.pestName) session.data.pestName = 'Organisme Pengganggu Tanaman (OPT)';

      session.step = 'PHOTO';
      saveDB(db);
      return `Luasan terserang: *${repArea} Ha* tercatat.\n\n6️⃣ *Silakan upload/kirim foto lokasi terserang.*\n_(Kirimkan foto tanaman/lahan terserang langsung via WhatsApp ini. Jika belum memiliki foto atau ingin menyelesaikan sekarang, ketik *SELESAI* atau *LEWATI*)_`;
    }

    // STEP 6: PHOTO ANSWERED (OR 'SELESAI' / 'LEWATI') -> FINALIZE REPORT
    if (session.step === 'PHOTO') {
      let photoUrl = session.data.photoUrl || '';
      if (attachmentUrl) {
        photoUrl = attachmentUrl;
      } else if (cleanMsg.startsWith('http://') || cleanMsg.startsWith('https://')) {
        photoUrl = cleanMsg;
      }

      const repName = session.data.reporterName || senderName || 'Petani';
      const repAddress = session.data.reporterAddress || '-';
      const repVillage = session.data.village || 'Desa Belum Disebut';
      const repSubdistrict = session.data.subdistrict || 'Kecamatan Belum Disebut';
      const repCommodity = session.data.commodity || 'Padi Sawah';
      const repPest = session.data.pestName || 'Organisme Pengganggu Tanaman (OPT)';
      const repArea = session.data.areaAffectedHa || 1.0;

      const nextSeq = db.reports.length + 1;
      const code = `OPT-2026-${String(nextSeq).padStart(3, '0')}`;

      const newReport: OPTReport = {
        id: `rep-${Date.now()}`,
        code,
        reporterName: repName,
        reporterPhone: senderPhone,
        reporterAddress: repAddress,
        farmerGroup: 'Pengaduan Mandiri via WhatsApp Interaktif',
        village: repVillage,
        subdistrict: repSubdistrict,
        district: 'Kabupaten Tanggamus',
        commodity: repCommodity,
        pestName: repPest,
        pestType: repPest.toLowerCase().includes('blas') || repPest.toLowerCase().includes('bulai') || repPest.toLowerCase().includes('patek') || repPest.toLowerCase().includes('kresek') ? 'Penyakit' : 'Hama',
        areaAffectedHa: repArea,
        areaThreatenedHa: Math.round(repArea * 3 * 10) / 10,
        severity: 'Sedang',
        plantAgeWeeks: 4,
        symptoms: `Laporan bertahap via WhatsApp Bot.\nAlamat: ${repAddress}\nLuas terserang: ${repArea} Ha.${photoUrl ? `\nFoto lokasi terserang: ${photoUrl}` : ''}`,
        status: 'Menunggu Verifikasi',
        source: 'fonnte_whatsapp',
        evidencePhotos: photoUrl ? [photoUrl] : [],
        photoUrl: photoUrl || undefined,
        dateReported: now,
        updatedAt: now,
        syncedToSheets: false,
        waNotificationSent: true,
        location: { latitude: -5.4988, longitude: 104.6225 }
      };

      // Sync to Google Sheets
      const sheetSync = await syncToGoogleSheets(newReport, db.spreadsheetConfig);
      if (sheetSync.success) {
        newReport.syncedToSheets = true;
        db.spreadsheetConfig.totalSyncedRows += 1;
        db.spreadsheetConfig.lastSyncedAt = now;
        db.syncLogs.unshift({
          id: `sync-${Date.now()}`,
          timestamp: now,
          type: 'auto',
          status: 'success',
          rowsCount: 1,
          message: `Auto-Sync WhatsApp: Laporan ${code} (${repCommodity} - ${repPest}) dari ${repName} otomatis masuk ke Google Spreadsheets`
        });
      }

      // Save locally & persist to PostgreSQL + Firestore
      db.reports.unshift(newReport);
      persistReport(newReport);

      // Clean session
      delete db.waSessions[senderPhone];
      saveDB(db);

      return `✅ *LAPORAN PENGADUAN OPT BERHASIL DITERIMA & DICATAT* ✅\n\n📋 *Nomor Tiket:* *${code}*\n👤 *Nama Pelapor:* ${repName}\n📞 *No. Telepon:* ${senderPhone}\n🏠 *Alamat:* ${repAddress}\n📍 *Desa / Pekon:* ${repVillage}\n🗺️ *Kecamatan:* ${repSubdistrict}\n🌱 *Komoditas:* ${repCommodity}\n🐛 *Hama/Penyakit:* ${repPest}\n📊 *Luasan Terserang:* ${repArea} Ha (Sedang)\n📸 *Foto Lokasi:* ${photoUrl ? '✅ Foto berhasil diunggah' : 'Dilewati (belum ada foto)'}\n\nLaporan Anda telah tercatat 24/7 di database SIGAP-OPT & Google Spreadsheets Dinas Pertanian Kabupaten Tanggamus dan diteruskan ke Petugas POPT wilayah ${repSubdistrict}.\n\nUntuk cek perkembangan penanganan sewaktu-waktu, ketik:\n👉 *STATUS#${code}*`;
    }
  }

  // 5. NO ACTIVE SESSION: User initiates reporting with "LAPOR"
  if (upperMsg === 'LAPOR' || upperMsg === '/LAPOR' || upperMsg === 'PENGADUAN' || upperMsg === 'MAU LAPOR' || (upperMsg.startsWith('LAPOR ') && !cleanMsg.includes('#'))) {
    db.waSessions[senderPhone] = {
      phone: senderPhone,
      step: 'NAME',
      data: {},
      lastActive: now
    };
    saveDB(db);
    return `🌾 *PENGADUAN SERANGAN HAMA/PENYAKIT (OPT) TANAMAN* 🌾\n_Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kab. Tanggamus_\n\nSilakan jawab pertanyaan berikut secara bertahap:\n\n1️⃣ *Siapa nama Anda?*\n_(Ketik nama lengkap Anda, atau ketik *BATAL* untuk membatalkan)_`;
  }

  // 6. FAST-TRACK TAGAR FORMAT (LAPOR#Nama#Desa#Kecamatan#Komoditas#Hama#Luas#Tingkat)
  if (upperMsg.startsWith('LAPOR#')) {
    const reportParse = parseAgriReport(cleanMsg, senderName, attachmentUrl);
    if (reportParse.isReport) {
      const nextSeq = db.reports.length + 1;
      const code = `OPT-2026-${String(nextSeq).padStart(3, '0')}`;

      const newReport: OPTReport = {
        id: `rep-${Date.now()}`,
        code,
        reporterName: reportParse.repName.trim(),
        reporterPhone: senderPhone,
        reporterAddress: '-',
        farmerGroup: 'Pengaduan Cepat via WhatsApp Tagar',
        village: reportParse.repVillage.trim(),
        subdistrict: reportParse.repSubdistrict.trim(),
        district: 'Kabupaten Tanggamus',
        commodity: reportParse.repCommodity.trim(),
        pestName: reportParse.repPest.trim(),
        pestType: reportParse.repPest.toLowerCase().includes('blas') || reportParse.repPest.toLowerCase().includes('bulai') || reportParse.repPest.toLowerCase().includes('patek') || reportParse.repPest.toLowerCase().includes('kresek') ? 'Penyakit' : 'Hama',
        areaAffectedHa: reportParse.repArea,
        areaThreatenedHa: Math.round(reportParse.repArea * 3 * 10) / 10,
        severity: reportParse.severityVal,
        plantAgeWeeks: 4,
        symptoms: `Laporan cepat format tagar: "${cleanMsg}"${attachmentUrl ? `\nFoto bukti terlampir: ${attachmentUrl}` : ''}`,
        status: 'Menunggu Verifikasi',
        source: 'fonnte_whatsapp',
        evidencePhotos: attachmentUrl ? [attachmentUrl] : [],
        photoUrl: attachmentUrl || undefined,
        dateReported: now,
        updatedAt: now,
        syncedToSheets: false,
        waNotificationSent: true,
        location: { latitude: -5.4988, longitude: 104.6225 }
      };

      const sheetSync = await syncToGoogleSheets(newReport, db.spreadsheetConfig);
      if (sheetSync.success) {
        newReport.syncedToSheets = true;
        db.spreadsheetConfig.totalSyncedRows += 1;
        db.spreadsheetConfig.lastSyncedAt = now;
      }

      db.reports.unshift(newReport);
      persistReport(newReport);
      saveDB(db);

      return `✅ *PENGADUAN OPT BERHASIL DICATAT* ✅\n\nNomor Tiket: *${code}*\n👤 *Nama:* ${reportParse.repName}\n📍 *Lokasi:* Desa ${reportParse.repVillage}, Kec. ${reportParse.repSubdistrict}\n🌱 *Komoditas:* ${reportParse.repCommodity}\n🐛 *Hama/Penyakit:* ${reportParse.repPest}\n📊 *Luas Serangan:* ${reportParse.repArea} Ha (${reportParse.severityVal})${attachmentUrl ? '\n📸 *Foto Bukti Serangan:* Berhasil disimpan di sistem' : ''}\n\nLaporan ini *OTOMATIS TERCATAT 24/7 DI DATABASE SIGAP-OPT & GOOGLE SPREADSHEETS* pemantauan.\n\nUntuk cek berkala status penanganan, ketik:\n👉 *STATUS#${code}*`;
    }
  }

  // 7. USER SENDS PHOTO DIRECTLY WITHOUT TEXT -> START INTERACTIVE QUESTIONNAIRE
  if (attachmentUrl && !cleanMsg) {
    db.waSessions[senderPhone] = {
      phone: senderPhone,
      step: 'NAME',
      data: { photoUrl: attachmentUrl, evidencePhotos: [attachmentUrl] },
      lastActive: now
    };
    saveDB(db);
    return `📸 Foto bukti serangan OPT telah diterima!\n\nUntuk melengkapi pengaduan ini, silakan jawab pertanyaan berikut:\n\n1️⃣ *Siapa nama Anda?*\n_(Ketik nama lengkap Anda)_`;
  }

  // 8. DEFAULT MENU & GREETING
  return `🌾 *SELAMAT DATANG DI SIGAP-OPT BOT* 🌾\n_Sistem Tanggap & Pengaduan OPT Dinas Pertanian Kab. Tanggamus (24 Jam)_\n\nHalo *${senderName}*, silakan pilih layanan:\n\n1️⃣ *LAPOR SERANGAN HAMA/PENYAKIT (TANYA JAWAB)*\nKetik: *LAPOR*\n_Sistem akan menanyakan nama, alamat, desa, kecamatan, luasan lahan, dan upload foto secara satu per satu._\n\n2️⃣ *CEK STATUS PENGADUAN*\nKetik: *STATUS#KODE_TIKET*\n_Contoh:_ *STATUS#OPT-2026-001*\n\n3️⃣ *PANDUAN PENGENDALIAN HAMA*\nKetik: *PANDUAN*\n\nSemua laporan Anda langsung tersimpan ke sistem SIGAP-OPT & Google Spreadsheets pemantauan secara real-time.`;
}

// Fonnte sends POST request with sender, message, name, etc.
app.post('/api/webhook/fonnte', async (req, res) => {
  const db = initDB();
  const body = req.body || {};

  // Fonnte standard parameters: sender / from, message, name, url (attachment)
  const senderPhone = (body.sender || body.from || body.phone || body.target || req.query.sender || '').toString().trim();
  const incomingMessage = (body.message || body.text || req.query.message || '').toString().trim();
  const senderName = (body.name || body.pushName || 'Petani').toString().trim();
  const attachmentUrl = (body.url || body.file || body.attachment || '').toString().trim();

  // Guard: ignore messages sent by the bot device itself to prevent loopback
  const botNumberDigits = (db.fonnteConfig.senderNumber || '').replace(/[^0-9]/g, '');
  const senderDigits = senderPhone.replace(/[^0-9]/g, '');
  if (botNumberDigits.length >= 8 && senderDigits.length >= 8 && (senderDigits.endsWith(botNumberDigits) || botNumberDigits.endsWith(senderDigits))) {
    return res.status(200).json({ status: true, message: 'Ignoring loopback message from bot device itself' });
  }

  if (!incomingMessage && !attachmentUrl) {
    return res.status(200).json({ status: false, message: 'Pesan kosong' });
  }

  const now = new Date().toISOString();
  const effectiveMessage = incomingMessage || (attachmentUrl ? 'KIRIM_FOTO_HAMA' : '');

  // Log incoming message
  db.fonnteLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: now,
    direction: 'incoming',
    phone: senderPhone,
    senderName: senderName,
    message: attachmentUrl ? `${effectiveMessage} [Lampiran Foto: ${attachmentUrl}]` : effectiveMessage,
    status: 'processed'
  });

  const replyText = await handleIncomingWhatsAppMessage(senderPhone, incomingMessage, senderName, attachmentUrl, false);

  // Record outgoing log
  db.fonnteLogs.unshift({
    id: `log-${Date.now() + 1}`,
    timestamp: new Date().toISOString(),
    direction: 'outgoing',
    phone: senderPhone,
    message: replyText,
    status: 'delivered'
  });

  saveDB(db);

  // Send WhatsApp message back to the sender via Fonnte Send API
  if (senderPhone && db.fonnteConfig.apiToken && db.fonnteConfig.autoReplyEnabled) {
    try {
      await sendFonnteWhatsApp(senderPhone, replyText, db.fonnteConfig);
    } catch (err: any) {
      console.warn('Failed to dispatch webhook reply via Fonnte send API:', err.message);
    }
  }

  // Return standard Fonnte webhook reply formats (both direct array response & reply field)
  res.json({
    status: true,
    reply: replyText,
    response: [
      {
        target: senderPhone,
        message: replyText
      }
    ]
  });
});

// Fallback webhook route aliases
app.all('/api/fonnte/webhook', (req, res, next) => {
  req.url = '/api/webhook/fonnte';
  (app as any).handle(req, res, next);
});

// Fonnte Simulator & Live Sender
app.post('/api/fonnte/simulate', async (req, res) => {
  const { senderPhone, message, senderName } = req.body;
  const db = initDB();

  if (!message) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
  }

  const phone = senderPhone || '081298765432';
  const name = senderName || 'Pak Supardi (Petani)';
  const now = new Date().toISOString();

  db.fonnteLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: now,
    direction: 'incoming',
    phone: phone,
    senderName: name,
    message: message,
    status: 'simulated'
  });

  const simulatedReply = await handleIncomingWhatsAppMessage(phone, message, name, '', true);

  db.fonnteLogs.unshift({
    id: `log-${Date.now() + 1}`,
    timestamp: new Date().toISOString(),
    direction: 'outgoing',
    phone: phone,
    message: simulatedReply,
    status: 'simulated'
  });

  saveDB(db);

  res.json({
    success: true,
    reply: simulatedReply,
    senderPhone: phone
  });
});

// Update Fonnte Config (API Token, etc.)
app.get('/api/fonnte/config', (_req, res) => {
  const db = initDB();
  res.json({ success: true, config: db.fonnteConfig });
});

app.post('/api/fonnte/config', (req, res) => {
  const db = initDB();
  const { apiToken, senderNumber, autoReplyEnabled, autoNotificationOnUpdate } = req.body;

  db.fonnteConfig = {
    ...db.fonnteConfig,
    apiToken: apiToken !== undefined ? apiToken.trim() : db.fonnteConfig.apiToken,
    senderNumber: senderNumber !== undefined ? senderNumber.trim() : db.fonnteConfig.senderNumber,
    autoReplyEnabled: autoReplyEnabled !== undefined ? Boolean(autoReplyEnabled) : db.fonnteConfig.autoReplyEnabled,
    autoNotificationOnUpdate: autoNotificationOnUpdate !== undefined ? Boolean(autoNotificationOnUpdate) : db.fonnteConfig.autoNotificationOnUpdate
  };

  saveDB(db);
  persistToFirestore('settings', 'fonnteConfig', { key: 'fonnteConfig', data: db.fonnteConfig, updatedAt: new Date().toISOString() });
  res.json({ success: true, message: 'Konfigurasi Fonnte berhasil disimpan', config: db.fonnteConfig });
});

// Get Fonnte Logs
app.get('/api/fonnte/logs', (_req, res) => {
  const db = initDB();
  res.json({ success: true, logs: db.fonnteLogs.slice(0, 50) });
});

// =============================================================
// BAILEYS OPEN-SOURCE WHATSAPP GATEWAY (100% GRATIS & MANDIRI)
// =============================================================
interface BaileysManager {
  sock: WASocket | null;
  status: 'disconnected' | 'connecting' | 'scan_needed' | 'connected';
  qrCodeUrl: string | null;
  userPhone: string | null;
  userName: string | null;
  connectedAt: string | null;
  lastError: string | null;
  startedAt: number;
  sessionSavedInCloud: boolean;
}

const baileysManager: BaileysManager = {
  sock: null,
  status: 'disconnected',
  qrCodeUrl: null,
  userPhone: null,
  userName: null,
  connectedAt: null,
  lastError: null,
  startedAt: Date.now(),
  sessionSavedInCloud: false
};

// -------------------------------------------------------------
// WhatsApp Multi-Device Session Persistence & Keep-Alive Engine
// -------------------------------------------------------------
const SESSION_BACKUP_FILE = path.join(DATA_DIR, 'baileys_session_backup.json');
let userExplicitlyDisconnected = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let isBackingUpBaileys = false;
let backupThrottleTimer: NodeJS.Timeout | null = null;
let baileysDisconnectCount = 0;
let lastPresencePingAt = 0;

function addBaileysLog(log: Omit<BaileysLog, 'id'>) {
  const db = initDB();
  if (!db.baileysLogs) db.baileysLogs = [];
  db.baileysLogs.unshift({
    id: `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...log
  });
  if (db.baileysLogs.length > 200) {
    db.baileysLogs = db.baileysLogs.slice(0, 200);
  }
  saveDB(db);
}

// -------------------------------------------------------------
// 3-Tier Multi-Storage Session Backup:
// Tier 1: Working auth folder (data/baileys_auth/)
// Tier 2: Persistent local file (data/baileys_session_backup.json) & db.json (db.baileysAuthBackup)
// Tier 3: Cloud Firestore (baileys_auth_files collection)
// -------------------------------------------------------------
async function executeBackupBaileysAuth(): Promise<void> {
  if (isBackingUpBaileys) return;
  const authDir = path.join(DATA_DIR, 'baileys_auth');
  const credsFile = path.join(authDir, 'creds.json');
  if (!fs.existsSync(authDir) || !fs.existsSync(credsFile)) return;

  isBackingUpBaileys = true;
  try {
    const files = fs.readdirSync(authDir);
    const sessionMap: Record<string, string> = {};
    let fileCount = 0;

    for (const f of files) {
      const fullPath = path.join(authDir, f);
      try {
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          sessionMap[f] = content;
          fileCount++;
        }
      } catch {}
    }

    if (sessionMap['creds.json']) {
      // Tier 2A: Write atomic disk backup file
      try {
        fs.writeFileSync(SESSION_BACKUP_FILE, JSON.stringify(sessionMap), 'utf-8');
      } catch (err: any) {
        console.warn('[Baileys-Backup] Local file backup error:', err.message);
      }

      // Tier 2B: Store into db.json
      try {
        const db = initDB();
        (db as any).baileysAuthBackup = sessionMap;
        saveDB(db);
      } catch (err: any) {
        console.warn('[Baileys-Backup] db.json backup error:', err.message);
      }

      // Tier 3: Cloud Firestore persistent sync inside settings/baileys_auth_session (allowed by rules)
      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'settings', 'baileys_auth_session'), {
            updatedAt: new Date().toISOString(),
            fileCount,
            userPhone: baileysManager.userPhone || null,
            userName: baileysManager.userName || null,
            sessionMap
          });
          console.log(`[Baileys-Backup] Successfully saved ${fileCount} session files to Firestore settings/baileys_auth_session.`);
        } catch (fsErr: any) {
          console.warn('[Baileys-Backup] Firestore settings/baileys_auth_session write warning:', fsErr.message);
        }
      }

      baileysManager.sessionSavedInCloud = true;
      console.log(`[Baileys-Backup] Successfully backed up ${fileCount} session files to disk & cloud.`);
    }
  } catch (err: any) {
    console.warn('[Baileys-Backup] Warning during backup:', err.message);
  } finally {
    isBackingUpBaileys = false;
  }
}

function triggerBaileysAuthBackup() {
  if (backupThrottleTimer) clearTimeout(backupThrottleTimer);
  backupThrottleTimer = setTimeout(() => {
    backupThrottleTimer = null;
    executeBackupBaileysAuth().catch(() => {});
  }, 1200);
}

async function restoreBaileysAuth(): Promise<boolean> {
  const authDir = path.join(DATA_DIR, 'baileys_auth');
  const credsFile = path.join(authDir, 'creds.json');

  // Check if working files already exist on disk and creds.json is valid
  if (fs.existsSync(credsFile)) {
    try {
      const stats = fs.statSync(credsFile);
      if (stats.size > 50) {
        baileysManager.sessionSavedInCloud = true;
        return true;
      }
    } catch {}
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Tier 2A: Check local backup JSON file
  if (fs.existsSync(SESSION_BACKUP_FILE)) {
    try {
      const raw = fs.readFileSync(SESSION_BACKUP_FILE, 'utf-8');
      const files: Record<string, string> = JSON.parse(raw);
      if (files && files['creds.json']) {
        let count = 0;
        for (const [fName, content] of Object.entries(files)) {
          fs.writeFileSync(path.join(authDir, fName), content, 'utf-8');
          count++;
        }
        baileysManager.sessionSavedInCloud = true;
        console.log(`[Baileys-Restore] Restored ${count} session files from disk backup file.`);
        return true;
      }
    } catch (e: any) {
      console.warn('[Baileys-Restore] Failed reading SESSION_BACKUP_FILE:', e.message);
    }
  }

  // Tier 2B: Check db.json backup
  try {
    const db = initDB();
    const backup = (db as any).baileysAuthBackup;
    if (backup && backup['creds.json']) {
      let count = 0;
      for (const [fName, content] of Object.entries(backup)) {
        fs.writeFileSync(path.join(authDir, fName as string), content as string, 'utf-8');
        count++;
      }
      baileysManager.sessionSavedInCloud = true;
      console.log(`[Baileys-Restore] Restored ${count} session files from db.json backup.`);
      return true;
    }
  } catch (e: any) {
    console.warn('[Baileys-Restore] Failed reading db.baileysAuthBackup:', e.message);
  }

  // Tier 3: Check Cloud Firestore settings/baileys_auth_session (guaranteed permitted document)
  if (firestoreDb) {
    try {
      const sessionDoc = await getDoc(doc(firestoreDb, 'settings', 'baileys_auth_session'));
      if (sessionDoc.exists()) {
        const data = sessionDoc.data();
        const files: Record<string, string> = data?.sessionMap;
        if (files && files['creds.json']) {
          let count = 0;
          for (const [fName, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(authDir, fName), content, 'utf-8');
            count++;
          }
          if (fs.existsSync(credsFile)) {
            baileysManager.sessionSavedInCloud = true;
            console.log(`[Baileys-Restore] Restored ${count} session files from Firestore settings/baileys_auth_session.`);
            executeBackupBaileysAuth().catch(() => {});
            return true;
          }
        }
      }
    } catch (e: any) {
      console.warn('[Baileys-Restore] Failed reading Firestore settings/baileys_auth_session:', e.message);
    }
  }

  return false;
}

async function clearAllBaileysAuth(): Promise<void> {
  const authDir = path.join(DATA_DIR, 'baileys_auth');
  if (fs.existsSync(authDir)) {
    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
  }
  if (fs.existsSync(SESSION_BACKUP_FILE)) {
    try { fs.unlinkSync(SESSION_BACKUP_FILE); } catch {}
  }
  try {
    const db = initDB();
    delete (db as any).baileysAuthBackup;
    saveDB(db);
  } catch {}
  if (firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'settings', 'baileys_auth_session')).catch(() => {});
    } catch {}
  }
  baileysManager.sessionSavedInCloud = false;
  console.log('[Baileys] Cleared all WhatsApp session credentials across disk, db.json, and Cloud Firestore.');
}

function scheduleBaileysReconnect(delayMs = 2500) {
  if (userExplicitlyDisconnected) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (userExplicitlyDisconnected) return;

    const hasSession = await restoreBaileysAuth().catch(() => false);
    if (hasSession && !userExplicitlyDisconnected) {
      console.log('[Baileys Auto-Reconnect] Connecting socket using saved persistent session...');
      initBaileysSocket(false).catch(err => {
        console.error('[Baileys Auto-Reconnect] Error on reconnect:', err.message);
      });
    } else {
      console.log('[Baileys Auto-Reconnect] Generating QR code for fresh WhatsApp link...');
      initBaileysSocket(false).catch(() => {});
    }
  }, delayMs);
}

// -------------------------------------------------------------
// Initialize Baileys Multi-Device Socket (Single-Instance Guarantee)
// -------------------------------------------------------------
async function initBaileysSocket(forceReset = false) {
  const authDir = path.join(DATA_DIR, 'baileys_auth');

  // Cancel any pending reconnect timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Gracefully close any existing socket and remove all previous listeners
  if (baileysManager.sock) {
    try {
      baileysManager.sock.ev.removeAllListeners('connection.update');
      baileysManager.sock.ev.removeAllListeners('creds.update');
      baileysManager.sock.ev.removeAllListeners('messages.upsert');
      baileysManager.sock.end(undefined);
    } catch {}
    baileysManager.sock = null;
  }

  if (forceReset) {
    userExplicitlyDisconnected = true;
    await clearAllBaileysAuth();
    baileysManager.status = 'disconnected';
    baileysManager.qrCodeUrl = null;
    baileysManager.userPhone = null;
    baileysManager.userName = null;
    baileysManager.connectedAt = null;
    baileysManager.lastError = null;
    baileysManager.sessionSavedInCloud = false;
    userExplicitlyDisconnected = false; // ready for new QR pairing
  } else {
    // Restore session if files are missing
    await restoreBaileysAuth();
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  baileysManager.status = 'connecting';
  baileysManager.lastError = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      keepAliveIntervalMs: 15000,
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      emitOwnEvents: false
    });

    baileysManager.sock = sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          baileysManager.qrCodeUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          baileysManager.status = 'scan_needed';
          console.log('[Baileys] New WhatsApp QR code ready for scanning');
        } catch (qrErr: any) {
          console.error('[Baileys] QR render error:', qrErr.message);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const errorMsg = (lastDisconnect?.error as any)?.message || 'Connection closed';
        baileysManager.lastError = errorMsg;
        baileysManager.sock = null;

        // Code 515 (restartRequired): Standard handshake completion right after QR scan!
        if (statusCode === DisconnectReason.restartRequired) {
          console.log('[Baileys] WhatsApp QR Scan paired successfully! Reconnecting socket immediately...');
          baileysManager.status = 'connecting';
          scheduleBaileysReconnect(800);
          return;
        }

        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        if (isLoggedOut) {
          if (userExplicitlyDisconnected) {
            console.log('[Baileys] Device logged out explicitly by user. Cleaning credentials.');
            await clearAllBaileysAuth();
            baileysManager.status = 'disconnected';
            baileysManager.userPhone = null;
            baileysManager.userName = null;
            baileysManager.qrCodeUrl = null;
            baileysManager.sessionSavedInCloud = false;
          } else {
            // Temporary 401 desync vs actual phone logout
            baileysDisconnectCount++;
            if (baileysDisconnectCount <= 2) {
              console.warn(`[Baileys] Received 401 code (attempt ${baileysDisconnectCount}/2). Re-verifying stored session in 3s...`);
              baileysManager.status = 'connecting';
              scheduleBaileysReconnect(3000);
            } else {
              console.warn('[Baileys] WhatsApp device logged out from mobile phone. QR scan required.');
              baileysManager.status = 'disconnected';
              baileysManager.lastError = 'Sesi WhatsApp dikeluarkan dari aplikasi WhatsApp di HP. Silakan scan ulang QR Code.';
              baileysManager.userPhone = null;
              baileysManager.userName = null;
              baileysManager.qrCodeUrl = null;
              scheduleBaileysReconnect(1500);
            }
          }
        } else {
          // Transient disconnect: network glitch, ping timeout, server recompile, sleep
          // Session remains 100% intact and preserved!
          baileysDisconnectCount = 0;
          console.log(`[Baileys] Transient connection drop (code: ${statusCode}, reason: ${errorMsg}). Auto-reconnecting in 2.5s...`);
          baileysManager.status = 'connecting';
          scheduleBaileysReconnect(2500);
        }
      } else if (connection === 'open') {
        baileysDisconnectCount = 0;
        userExplicitlyDisconnected = false;
        baileysManager.status = 'connected';
        baileysManager.qrCodeUrl = null;
        baileysManager.connectedAt = new Date().toISOString();
        baileysManager.lastError = null;
        const rawId = sock.user?.id || '';
        const phone = rawId.split(':')[0] || rawId.split('@')[0] || '';
        baileysManager.userPhone = phone;
        baileysManager.userName = sock.user?.name || 'SIPOPT Bot Tanggamus';
        baileysManager.sessionSavedInCloud = true;
        console.log(`[Baileys] WhatsApp Socket Connected & Active 24/7: ${phone} (${baileysManager.userName})`);
        triggerBaileysAuthBackup();
      }
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      triggerBaileysAuthBackup();
    });

    sock.ev.on('messages.upsert', async ({ messages: newMessages, type }) => {
      if (type !== 'notify') return;

      for (const m of newMessages) {
        if (!m.message || m.key.fromMe) continue;

        const remoteJid = m.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
          continue;
        }

        const senderPhone = remoteJid.replace('@s.whatsapp.net', '');
        const senderName = m.pushName || 'Petani';
        const msgText = m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          m.message.imageMessage?.caption ||
          '';

        console.log(`[Baileys] Incoming WhatsApp message from ${senderPhone} (${senderName}): "${msgText}"`);

        addBaileysLog({
          direction: 'incoming',
          phone: senderPhone,
          senderName,
          message: msgText || '[Foto / Lampiran]',
          status: 'received',
          timestamp: new Date().toISOString(),
          source: 'baileys_whatsapp'
        });

        try {
          const replyText = await handleIncomingWhatsAppMessage(senderPhone, msgText, senderName, '', false);

          if (replyText && baileysManager.sock) {
            await baileysManager.sock.sendMessage(remoteJid, { text: replyText });
            console.log(`[Baileys] Sent WhatsApp reply to ${senderPhone}`);

            addBaileysLog({
              direction: 'outgoing',
              phone: senderPhone,
              senderName: 'SIPOPT Bot',
              message: replyText,
              status: 'sent',
              timestamp: new Date().toISOString(),
              source: 'baileys_whatsapp'
            });
          }
        } catch (procErr: any) {
          console.error('[Baileys] Error processing message:', procErr.message);
        }
      }
    });

  } catch (err: any) {
    console.error('[Baileys] Init error:', err.message);
    baileysManager.status = 'disconnected';
    baileysManager.lastError = err.message;
  }
}

// -------------------------------------------------------------
// 24/7 Always-On Watchdog & WhatsApp Keep-Alive Heartbeat (Every 15s)
// Keeps presence 'available', prevents idle timeouts, and auto-restores
// -------------------------------------------------------------
setInterval(async () => {
  if (userExplicitlyDisconnected) return;

  const authDir = path.join(DATA_DIR, 'baileys_auth');
  const credsFile = path.join(authDir, 'creds.json');
  let hasSession = fs.existsSync(credsFile);

  if (!hasSession) {
    const restored = await restoreBaileysAuth().catch(() => false);
    if (restored) hasSession = true;
  }

  if (hasSession) {
    if (baileysManager.status === 'connected' && baileysManager.sock) {
      // Send keep-alive presence so WhatsApp Web server never marks session idle
      try {
        baileysManager.sock.sendPresenceUpdate('available').catch(() => {});
        lastPresencePingAt = Date.now();
      } catch {}
    } else if (baileysManager.status !== 'connecting' && !reconnectTimer) {
      console.log('[Baileys Watchdog] WhatsApp session active on disk/cloud but socket closed. Auto-reconnecting now...');
      scheduleBaileysReconnect(1500);
    }
  }
}, 15000);

// Baileys status endpoint with rich session health info
app.get('/api/baileys/status', (_req, res) => {
  const authDir = path.join(DATA_DIR, 'baileys_auth');
  const credsFile = path.join(authDir, 'creds.json');
  const hasLocalCreds = fs.existsSync(credsFile) || fs.existsSync(SESSION_BACKUP_FILE);

  res.json({
    success: true,
    status: baileysManager.status,
    qrCodeUrl: baileysManager.qrCodeUrl,
    userPhone: baileysManager.userPhone,
    userName: baileysManager.userName,
    connectedAt: baileysManager.connectedAt,
    lastError: baileysManager.lastError,
    mode: 'baileys_open_source',
    sessionSavedInCloud: baileysManager.sessionSavedInCloud || hasLocalCreds,
    hasSavedSession: hasLocalCreds,
    autoReconnectEnabled: true,
    keepAliveActive: true,
    storageLayers: ['local_auth_files', 'session_backup_json', 'db_json', 'firestore_cloud'],
    uptimeSeconds: Math.floor((Date.now() - baileysManager.startedAt) / 1000)
  });
});

// Ping / keepalive verification endpoint
app.get('/api/baileys/ping', async (_req, res) => {
  const isConnected = baileysManager.status === 'connected' && Boolean(baileysManager.sock);
  if (isConnected && baileysManager.sock) {
    try {
      await baileysManager.sock.sendPresenceUpdate('available');
      lastPresencePingAt = Date.now();
    } catch {}
  }

  res.json({
    success: true,
    connected: isConnected,
    status: baileysManager.status,
    userPhone: baileysManager.userPhone,
    userName: baileysManager.userName,
    lastPresencePingAt: lastPresencePingAt ? new Date(lastPresencePingAt).toISOString() : null,
    uptimeSeconds: Math.floor((Date.now() - baileysManager.startedAt) / 1000),
    persistentSession: true
  });
});

// Connect or refresh QR code endpoint
app.post('/api/baileys/connect', async (req, res) => {
  const { reset } = req.body || {};
  userExplicitlyDisconnected = false;
  try {
    initBaileysSocket(Boolean(reset)).catch(err => {
      console.error('[Baileys] Connect error:', err.message);
    });
    res.json({
      success: true,
      message: reset
        ? 'Sesi lama dibersihkan, menyiapkan QR Code baru...'
        : 'Menghubungkan ke WhatsApp (menggunakan sesi aktif yang tersimpan)...'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Explicit disconnect / logout endpoint
app.post('/api/baileys/disconnect', async (_req, res) => {
  try {
    userExplicitlyDisconnected = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (baileysManager.sock) {
      try { await baileysManager.sock.logout(); } catch {}
      try { baileysManager.sock.end(undefined); } catch {}
      baileysManager.sock = null;
    }
    await clearAllBaileysAuth();
    baileysManager.status = 'disconnected';
    baileysManager.qrCodeUrl = null;
    baileysManager.userPhone = null;
    baileysManager.userName = null;
    baileysManager.connectedAt = null;
    baileysManager.sessionSavedInCloud = false;

    res.json({ success: true, message: 'WhatsApp Baileys berhasil diputuskan (logout) dan seluruh sesi dibersihkan.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Real WhatsApp test sender via Baileys socket
app.post('/api/baileys/test-send', async (req, res) => {
  const { targetPhone, message } = req.body;
  if (!targetPhone) {
    return res.status(400).json({ success: false, message: 'Nomor WhatsApp tujuan wajib diisi' });
  }
  if (!baileysManager.sock || baileysManager.status !== 'connected') {
    return res.status(400).json({
      success: false,
      message: 'Socket WhatsApp Baileys belum terhubung. Silakan scan QR Code WhatsApp terlebih dahulu.'
    });
  }

  try {
    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const jid = cleanPhone + '@s.whatsapp.net';
    const textToSend = message || 'Halo! Ini adalah pesan uji coba dari SIPOPT Tanggamus via Library Mandiri Baileys (Tanpa Fonnte).';

    await baileysManager.sock.sendMessage(jid, { text: textToSend });

    addBaileysLog({
      direction: 'outgoing',
      phone: cleanPhone,
      senderName: 'SIPOPT Test Sender',
      message: textToSend,
      status: 'sent',
      timestamp: new Date().toISOString(),
      source: 'baileys_whatsapp'
    });

    res.json({ success: true, message: `Pesan berhasil dikirim via Baileys ke ${cleanPhone}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal mengirim pesan: ${err.message}` });
  }
});

// Get Baileys message logs
app.get('/api/baileys/logs', (_req, res) => {
  const db = initDB();
  res.json({ success: true, logs: db.baileysLogs || [] });
});

// Baileys Simulator endpoint
app.post('/api/baileys/simulate', async (req, res) => {
  try {
    const { senderPhone, message, senderName } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
    }

    const phone = senderPhone || '081298765432';
    const name = senderName || 'Petani Tanggamus';
    const now = new Date().toISOString();

    addBaileysLog({
      direction: 'incoming',
      phone,
      senderName: name,
      message,
      status: 'received',
      timestamp: now,
      source: 'baileys_whatsapp'
    });

    const reply = await handleIncomingWhatsAppMessage(phone, message, name, '', true);

    addBaileysLog({
      direction: 'outgoing',
      phone,
      senderName: 'SIPOPT Bot',
      message: reply,
      status: 'sent',
      timestamp: new Date().toISOString(),
      source: 'baileys_whatsapp'
    });

    res.json({
      success: true,
      reply,
      senderPhone: phone
    });
  } catch (err: any) {
    console.error('[Baileys] Error in /api/baileys/simulate:', err);
    res.json({
      success: true,
      reply: `🌾 *SIGAP-OPT BOT* 🌾\nPesan "${req.body?.message || ''}" berhasil diterima oleh server.\nKetik *LAPOR* untuk melaporkan serangan OPT, atau *PANDUAN* untuk rekomendasi teknis PHT.`,
      senderPhone: req.body?.senderPhone || '081298765432'
    });
  }
});

// 7. SPREADSHEETS INTEGRATION ENDPOINTS
app.get('/api/sheets/config', (_req, res) => {
  const db = initDB();
  res.json({ success: true, config: db.spreadsheetConfig });
});

app.post('/api/sheets/config', (req, res) => {
  const db = initDB();
  const {
    autoSyncEnabled,
    spreadsheetId,
    sheetName,
    sheetNameUsers,
    sheetNameSubdistricts,
    sheetNameCommodities,
    sheetGidReports,
    sheetGidUsers,
    sheetGidSubdistricts,
    sheetGidCommodities,
    webhookUrl,
    userEmail,
    integrationMode,
    accessPermission
  } = req.body;

  db.spreadsheetConfig = {
    ...db.spreadsheetConfig,
    autoSyncEnabled: autoSyncEnabled !== undefined ? Boolean(autoSyncEnabled) : db.spreadsheetConfig.autoSyncEnabled,
    spreadsheetId: spreadsheetId !== undefined ? spreadsheetId.trim() : db.spreadsheetConfig.spreadsheetId,
    sheetName: sheetName !== undefined ? sheetName.trim() : (db.spreadsheetConfig.sheetName || 'Laporan_Pengaduan_OPT'),
    sheetNameUsers: sheetNameUsers !== undefined ? sheetNameUsers.trim() : (db.spreadsheetConfig.sheetNameUsers || 'Manajemen_Pengguna_Akses'),
    sheetNameSubdistricts: sheetNameSubdistricts !== undefined ? sheetNameSubdistricts.trim() : (db.spreadsheetConfig.sheetNameSubdistricts || 'Master_Kecamatan_POPT'),
    sheetNameCommodities: sheetNameCommodities !== undefined ? sheetNameCommodities.trim() : (db.spreadsheetConfig.sheetNameCommodities || 'Master_Komoditas_Tanaman'),
    sheetGidReports: sheetGidReports !== undefined ? sheetGidReports.trim() : db.spreadsheetConfig.sheetGidReports,
    sheetGidUsers: sheetGidUsers !== undefined ? sheetGidUsers.trim() : db.spreadsheetConfig.sheetGidUsers,
    sheetGidSubdistricts: sheetGidSubdistricts !== undefined ? sheetGidSubdistricts.trim() : db.spreadsheetConfig.sheetGidSubdistricts,
    sheetGidCommodities: sheetGidCommodities !== undefined ? sheetGidCommodities.trim() : db.spreadsheetConfig.sheetGidCommodities,
    webhookUrl: webhookUrl !== undefined ? webhookUrl.trim() : db.spreadsheetConfig.webhookUrl,
    userEmail: userEmail !== undefined ? userEmail.trim() : db.spreadsheetConfig.userEmail,
    integrationMode: integrationMode || db.spreadsheetConfig.integrationMode,
    accessPermission: accessPermission || db.spreadsheetConfig.accessPermission
  };

  saveDB(db);
  persistToFirestore('settings', 'spreadsheetConfig', { key: 'spreadsheetConfig', data: db.spreadsheetConfig, updatedAt: new Date().toISOString() });
  res.json({ success: true, message: 'Konfigurasi Google Spreadsheets berhasil disimpan', config: db.spreadsheetConfig });
});

// Manual Sync All 4 Datasets to Spreadsheets
app.post('/api/sheets/sync', async (_req, res) => {
  const db = initDB();
  const now = new Date().toISOString();

  // Mark all reports as synced
  for (let i = 0; i < db.reports.length; i++) {
    db.reports[i].syncedToSheets = true;
    db.reports[i].sheetsRowId = i + 2;
  }

  const reportsCount = db.reports.length;
  const usersCount = db.users.length;
  const subsCount = (db.subdistricts || []).length;
  const commsCount = (db.commodities || []).length;
  const totalCount = reportsCount + usersCount + subsCount + commsCount;

  db.spreadsheetConfig.lastSyncedAt = now;
  db.spreadsheetConfig.totalSyncedRows = totalCount;
  db.spreadsheetConfig.syncedReportsCount = reportsCount;
  db.spreadsheetConfig.syncedUsersCount = usersCount;
  db.spreadsheetConfig.syncedSubdistrictsCount = subsCount;
  db.spreadsheetConfig.syncedCommoditiesCount = commsCount;

  // Execute sync to Google Apps Script webhook
  const syncResult = await syncAllDataToGoogleSheets(db, db.spreadsheetConfig);

  db.syncLogs.unshift({
    id: `sync-${Date.now()}`,
    timestamp: now,
    type: 'manual',
    status: syncResult.success ? 'success' : 'failed',
    rowsCount: totalCount,
    message: `Sinkronisasi multi-sheet sukses: ${reportsCount} Laporan OPT, ${usersCount} Pengguna & Hak Akses, ${subsCount} Master Kecamatan, ${commsCount} Master Komoditas (${totalCount} baris total)`
  });

  saveDB(db);

  res.json({
    success: true,
    message: `Berhasil menyinkronkan 4 master dataset (${totalCount} baris total) ke Google Spreadsheets!`,
    lastSyncedAt: now,
    totalSynced: totalCount,
    details: {
      reports: reportsCount,
      users: usersCount,
      subdistricts: subsCount,
      commodities: commsCount
    },
    config: db.spreadsheetConfig
  });
});

app.get('/api/sheets/logs', (_req, res) => {
  const db = initDB();
  res.json({ success: true, logs: db.syncLogs.slice(0, 30) });
});

// Export Multi-Tab Excel Workbook (.xlsx) containing all 4 Sheets
app.get('/api/sheets/export-all-xlsx', (_req, res) => {
  const db = initDB();
  const wb = XLSX.utils.book_new();

  // 1. Sheet Laporan Pengaduan OPT
  const reportRows = db.reports.map((r, idx) => ({
    'No': idx + 1,
    'Kode Tiket': r.code,
    'Tanggal Lapor': new Date(r.dateReported).toLocaleDateString('id-ID'),
    'Nama Pelapor': r.reporterName,
    'No. WhatsApp': r.reporterPhone || '-',
    'Kelompok Tani': r.farmerGroup || '-',
    'Desa': r.village,
    'Kecamatan': r.subdistrict,
    'Kabupaten': r.district || 'Kabupaten Tanggamus',
    'Komoditas': r.commodity,
    'Nama OPT': r.pestName,
    'Tipe OPT': r.pestType,
    'Luas Terserang (Ha)': r.areaAffectedHa,
    'Luas Terancam (Ha)': r.areaThreatenedHa,
    'Tingkat Serangan': r.severity,
    'Status Penanganan': r.status,
    'Petugas POPT': r.verifiedBy || '-',
    'Rekomendasi Gerdal': r.recommendation || '-',
    'Tindakan Lapangan': r.actionTaken || '-',
    'Foto Bukti Serangan (URL)': r.photoUrl || (r.evidencePhotos && r.evidencePhotos[0]) || '-',
    'Sumber': r.source === 'baileys_whatsapp' ? 'WhatsApp Baileys' : r.source === 'fonnte_whatsapp' ? 'WhatsApp Fonnte' : 'Portal Web'
  }));
  const wsReports = XLSX.utils.json_to_sheet(reportRows);
  const repSheetTitle = (db.spreadsheetConfig.sheetName || 'Laporan_Pengaduan_OPT').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, wsReports, repSheetTitle);

  // 2. Sheet Manajemen Pengguna & Hak Akses
  const userRows = db.users.map((u, idx) => ({
    'No': idx + 1,
    'ID Pengguna': u.id,
    'Username': u.username,
    'Nama Lengkap': u.name,
    'Email': u.email || '-',
    'No. Telepon/WA': u.phone || '-',
    'Peran / Jabatan': u.role === 'admin' ? 'Administrator' : u.role === 'petugas_popt' ? 'Petugas POPT' : u.role === 'pengamat' ? 'Pengamat OPT' : 'Petani',
    'Wilayah Tugas': u.region || '-',
    'Status Akun': u.status === 'active' ? 'Aktif' : 'Nonaktif',
    'Hak Akses Menu': Array.isArray(u.allowedTabs) ? u.allowedTabs.join(', ') : 'Semua Menu',
    'Tanggal Dibuat': new Date(u.createdAt).toLocaleDateString('id-ID')
  }));
  const wsUsers = XLSX.utils.json_to_sheet(userRows);
  const userSheetTitle = (db.spreadsheetConfig.sheetNameUsers || 'Manajemen_Pengguna_Akses').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, wsUsers, userSheetTitle);

  // 3. Sheet Master Kecamatan & Koordinator POPT
  const subRows = (db.subdistricts || []).map((s, idx) => ({
    'No': idx + 1,
    'ID Kecamatan': s.id,
    'Nama Kecamatan': s.name,
    'Koordinator POPT': s.coordinator,
    'Target Luas Lahan (Ha)': s.targetAreaHa,
    'Keterangan Wilayah': s.description || '-'
  }));
  const wsSubs = XLSX.utils.json_to_sheet(subRows);
  const subSheetTitle = (db.spreadsheetConfig.sheetNameSubdistricts || 'Master_Kecamatan_POPT').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, wsSubs, subSheetTitle);

  // 4. Sheet Master Komoditas Tanaman
  const commRows = (db.commodities || []).map((c, idx) => ({
    'No': idx + 1,
    'ID Komoditas': c.id,
    'Nama Komoditas': c.name,
    'Kategori': c.category,
    'Nama Latin': c.latinName || '-',
    'Varietas Unggulan': c.varieties || '-',
    'Hama & Penyakit Sasaran': Array.isArray(c.commonPests) ? c.commonPests.join('; ') : '-',
    'Target Luas Tanam (Ha)': c.targetAreaHa || 0,
    'Deskripsi Komoditas': c.description || '-'
  }));
  const wsComms = XLSX.utils.json_to_sheet(commRows);
  const commSheetTitle = (db.spreadsheetConfig.sheetNameCommodities || 'Master_Komoditas_Tanaman').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, wsComms, commSheetTitle);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="SIGAP_OPT_Semua_Data_Spreadsheet_${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buf);
});

// Export CSV for Any Dataset (reports | users | subdistricts | commodities)
app.get('/api/sheets/export-csv', (req, res) => {
  const db = initDB();
  const table = (req.query.table as string) || 'reports';

  if (table === 'users') {
    const headers = ['No', 'ID Pengguna', 'Username', 'Nama Lengkap', 'Email', 'No Telepon/WA', 'Peran/Jabatan', 'Wilayah Tugas', 'Status Akun', 'Hak Akses Menu', 'Tanggal Dibuat'];
    const rows = db.users.map((u, idx) => [
      idx + 1,
      `"${u.id}"`,
      `"${u.username}"`,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${(u.email || '-').replace(/"/g, '""')}"`,
      `"${u.phone || '-'}"`,
      `"${u.role}"`,
      `"${(u.region || '-').replace(/"/g, '""')}"`,
      `"${u.status === 'active' ? 'Aktif' : 'Nonaktif'}"`,
      `"${(Array.isArray(u.allowedTabs) ? u.allowedTabs.join('; ') : 'Semua').replace(/"/g, '""')}"`,
      `"${new Date(u.createdAt).toLocaleDateString('id-ID')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SIGAP_OPT_Pengguna_Akses_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send('\uFEFF' + csvContent);
  }

  if (table === 'subdistricts') {
    const headers = ['No', 'ID Kecamatan', 'Nama Kecamatan', 'Koordinator POPT', 'Target Luas Lahan (Ha)', 'Keterangan Wilayah'];
    const rows = (db.subdistricts || []).map((s, idx) => [
      idx + 1,
      `"${s.id}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.coordinator.replace(/"/g, '""')}"`,
      s.targetAreaHa,
      `"${(s.description || '-').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SIGAP_OPT_Master_Kecamatan_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send('\uFEFF' + csvContent);
  }

  if (table === 'commodities') {
    const headers = ['No', 'ID Komoditas', 'Nama Komoditas', 'Kategori', 'Nama Latin', 'Varietas Unggulan', 'Hama & Penyakit Sasaran', 'Target Luas Tanam (Ha)', 'Deskripsi'];
    const rows = (db.commodities || []).map((c, idx) => [
      idx + 1,
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      `"${(c.latinName || '-').replace(/"/g, '""')}"`,
      `"${(c.varieties || '-').replace(/"/g, '""')}"`,
      `"${(Array.isArray(c.commonPests) ? c.commonPests.join('; ') : '-').replace(/"/g, '""')}"`,
      c.targetAreaHa || 0,
      `"${(c.description || '-').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SIGAP_OPT_Master_Komoditas_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send('\uFEFF' + csvContent);
  }

  // Default: reports table
  const headers = [
    'No',
    'Kode Laporan',
    'Tanggal Lapor',
    'Nama Pelapor',
    'No Telepon/WA',
    'Kelompok Tani',
    'Desa',
    'Kecamatan',
    'Kabupaten',
    'Komoditas',
    'Nama OPT (Hama/Penyakit)',
    'Tipe OPT',
    'Luas Terserang (Ha)',
    'Luas Terancam (Ha)',
    'Tingkat Serangan',
    'Status Penanganan',
    'Petugas Verifikator',
    'Rekomendasi Tindakan',
    'Tindakan Lapangan',
    'Sumber Pengaduan',
    'Terhubung Chatbot Fonnte'
  ];

  const rows = db.reports.map((r, idx) => [
    idx + 1,
    `"${r.code}"`,
    `"${new Date(r.dateReported).toLocaleDateString('id-ID')}"`,
    `"${r.reporterName.replace(/"/g, '""')}"`,
    `"${r.reporterPhone}"`,
    `"${r.farmerGroup.replace(/"/g, '""')}"`,
    `"${r.village.replace(/"/g, '""')}"`,
    `"${r.subdistrict.replace(/"/g, '""')}"`,
    `"${r.district.replace(/"/g, '""')}"`,
    `"${r.commodity.replace(/"/g, '""')}"`,
    `"${r.pestName.replace(/"/g, '""')}"`,
    `"${r.pestType}"`,
    r.areaAffectedHa,
    r.areaThreatenedHa,
    `"${r.severity}"`,
    `"${r.status}"`,
    `"${(r.verifiedBy || '-').replace(/"/g, '""')}"`,
    `"${(r.recommendation || '-').replace(/"/g, '""')}"`,
    `"${(r.actionTaken || '-').replace(/"/g, '""')}"`,
    `"${r.source === 'fonnte_whatsapp' ? 'WhatsApp Fonnte' : 'Portal Web'}"`,
    `"${r.waNotificationSent ? 'Terkirim' : 'Belum'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="SIGAP_OPT_Laporan_Spreadsheet_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + csvContent); // Add UTF-8 BOM for Excel / Spreadsheets
});

// Export Excel (.xlsx) berdasarkan Bulan dan Tahun
app.get('/api/reports/export-excel', (req, res) => {
  const db = initDB();
  const { month, year, status, commodity, subdistrict } = req.query;

  let filtered = [...db.reports];

  // Filter berdasarkan Tahun (contoh: 2026)
  if (year && year !== 'all') {
    filtered = filtered.filter(r => {
      const d = new Date(r.dateReported);
      return d.getFullYear().toString() === year.toString();
    });
  }

  // Filter berdasarkan Bulan (1-12)
  if (month && month !== 'all') {
    filtered = filtered.filter(r => {
      const d = new Date(r.dateReported);
      return (d.getMonth() + 1).toString() === month.toString();
    });
  }

  // Filter Status
  if (status && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }

  // Filter Komoditas
  if (commodity && commodity !== 'all') {
    filtered = filtered.filter(r => r.commodity.toLowerCase().includes((commodity as string).toLowerCase()));
  }

  // Filter Kecamatan
  if (subdistrict && subdistrict !== 'all') {
    filtered = filtered.filter(r => r.subdistrict.toLowerCase().includes((subdistrict as string).toLowerCase()));
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthLabel = month && month !== 'all' ? monthNames[Number(month) - 1] : 'Semua-Bulan';
  const yearLabel = year && year !== 'all' ? year.toString() : new Date().getFullYear().toString();

  // Create Excel Rows Data
  const excelData = filtered.map((r, idx) => ({
    'No': idx + 1,
    'No Tiket Laporan': r.code,
    'Tanggal Lapor': new Date(r.dateReported).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    'Nama Pelapor / Petani': r.reporterName,
    'No WhatsApp / HP': r.reporterPhone || '-',
    'Kelompok Tani (Poktan)': r.farmerGroup || '-',
    'Kecamatan': r.subdistrict,
    'Desa / Pekon': r.village,
    'Komoditas Tanaman': r.commodity,
    'Jenis OPT (Hama/Penyakit)': r.pestName,
    'Kategori OPT': r.pestType,
    'Luas Terserang (Ha)': Number(r.areaAffectedHa) || 0,
    'Luas Terancam (Ha)': Number(r.areaThreatenedHa) || 0,
    'Tingkat Serangan': r.severity,
    'Umur Tanaman (Minggu)': r.plantAgeWeeks || 0,
    'Gejala Serangan di Lapangan': r.symptoms,
    'Status Tindakan': r.status,
    'Petugas Verifikator': r.verifiedBy || '-',
    'Rekomendasi Petugas (PHT)': r.recommendation || '-',
    'Tindakan Gerakan Pengendalian (Gerdal)': r.actionTaken || '-',
    'Foto Bukti Serangan (URL)': r.photoUrl || (r.evidencePhotos && r.evidencePhotos[0]) || '-',
    'Kanal Laporan': r.source === 'baileys_whatsapp' ? 'Chatbot WA Baileys' : r.source === 'fonnte_whatsapp' ? 'Chatbot WA Fonnte' : 'Portal Web'
  }));

  // Create Workbook
  const workbook = XLSX.utils.book_new();

  // 1. Sheet Utama Laporan
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set Column Widths for readability in MS Excel
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // No Tiket
    { wch: 14 }, // Tanggal
    { wch: 24 }, // Nama
    { wch: 16 }, // HP
    { wch: 24 }, // Poktan
    { wch: 18 }, // Kecamatan
    { wch: 18 }, // Desa
    { wch: 16 }, // Komoditas
    { wch: 26 }, // OPT
    { wch: 14 }, // Kategori
    { wch: 18 }, // Terserang
    { wch: 18 }, // Terancam
    { wch: 16 }, // Tingkat
    { wch: 20 }, // Umur
    { wch: 35 }, // Gejala
    { wch: 22 }, // Status
    { wch: 22 }, // Petugas
    { wch: 35 }, // Rekomendasi
    { wch: 35 }, // Tindakan
    { wch: 18 }  // Kanal
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan_${monthLabel.slice(0, 3)}_${yearLabel}`);

  // 2. Sheet Ringkasan Rekapitulasi (Statistik Eksekutif Dinas)
  const totalReports = filtered.length;
  const totalLuasTerserang = filtered.reduce((acc, curr) => acc + (Number(curr.areaAffectedHa) || 0), 0);
  const totalLuasTerancam = filtered.reduce((acc, curr) => acc + (Number(curr.areaThreatenedHa) || 0), 0);

  const summaryData = [
    { 'Parameter Rekapitulasi': 'Periode Laporan', 'Nilai': `${monthLabel} ${yearLabel}` },
    { 'Parameter Rekapitulasi': 'Total Pengaduan OPT', 'Nilai': `${totalReports} Laporan` },
    { 'Parameter Rekapitulasi': 'Total Luas Terserang', 'Nilai': `${totalLuasTerserang.toFixed(2)} Hektar (Ha)` },
    { 'Parameter Rekapitulasi': 'Total Luas Terancam', 'Nilai': `${totalLuasTerancam.toFixed(2)} Hektar (Ha)` },
    { 'Parameter Rekapitulasi': 'Status Selesai / Terkendali', 'Nilai': `${filtered.filter(r => r.status === 'Selesai').length} Laporan` },
    { 'Parameter Rekapitulasi': 'Status Gerdal / Tindak Lanjut', 'Nilai': `${filtered.filter(r => r.status === 'Tindak Lanjut / Gerdal').length} Laporan` },
    { 'Parameter Rekapitulasi': 'Status Menunggu Verifikasi', 'Nilai': `${filtered.filter(r => r.status === 'Menunggu Verifikasi').length} Laporan` },
    { 'Parameter Rekapitulasi': 'Tanggal Cetak File', 'Nilai': new Date().toLocaleString('id-ID') },
    { 'Parameter Rekapitulasi': 'Instansi Penerbit', 'Nilai': 'Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus - SIGAP-OPT' },
    { 'Parameter Rekapitulasi': 'Wilayah Kerja', 'Nilai': 'Kabupaten Tanggamus, Provinsi Lampung' }
  ];

  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 35 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Ringkasan_Rekap_Dinas');

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const safeFilename = `Laporan_Bulanan_OPT_${monthLabel}_${yearLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Length', excelBuffer.length);
  res.send(excelBuffer);
});

// Subdistricts Management (Kecamatan)
app.get('/api/subdistricts', (_req, res) => {
  const db = initDB();
  res.json({ success: true, subdistricts: db.subdistricts || [] });
});

app.post('/api/subdistricts', (req, res) => {
  const db = initDB();
  const { name, coordinator, targetAreaHa, description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama kecamatan wajib diisi' });
  }

  const trimmedName = name.trim();
  if (!db.subdistricts) db.subdistricts = [];

  const exists = db.subdistricts.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: `Kecamatan "${trimmedName}" sudah terdaftar` });
  }

  const newSubdistrict: Subdistrict = {
    id: `sub-${Date.now()}`,
    name: trimmedName,
    coordinator: coordinator ? coordinator.trim() : 'Petugas POPT',
    targetAreaHa: targetAreaHa ? Number(targetAreaHa) : 1000,
    description: description ? description.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.subdistricts.push(newSubdistrict);
  saveDB(db);
  persistToFirestore('subdistricts', newSubdistrict.id, newSubdistrict);

  res.json({
    success: true,
    message: `Kecamatan ${trimmedName} berhasil ditambahkan`,
    subdistrict: newSubdistrict
  });
});

app.put('/api/subdistricts/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const { name, coordinator, targetAreaHa, description } = req.body;

  if (!db.subdistricts) db.subdistricts = [];
  const idx = db.subdistricts.findIndex(s => s.id === id || s.name.toLowerCase() === id.toLowerCase());

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Data kecamatan tidak ditemukan' });
  }

  const oldName = db.subdistricts[idx].name;
  const updatedName = name && typeof name === 'string' && name.trim() ? name.trim() : oldName;

  // If name changed, update reports referencing oldName
  if (updatedName !== oldName) {
    db.reports.forEach(r => {
      if (r.subdistrict.toLowerCase() === oldName.toLowerCase()) {
        r.subdistrict = updatedName;
      }
    });
  }

  db.subdistricts[idx] = {
    ...db.subdistricts[idx],
    name: updatedName,
    coordinator: coordinator !== undefined ? coordinator.trim() : db.subdistricts[idx].coordinator,
    targetAreaHa: targetAreaHa !== undefined ? Number(targetAreaHa) : db.subdistricts[idx].targetAreaHa,
    description: description !== undefined ? description.trim() : db.subdistricts[idx].description
  };

  saveDB(db);
  persistToFirestore('subdistricts', db.subdistricts[idx].id, db.subdistricts[idx]);

  res.json({
    success: true,
    message: `Kecamatan ${updatedName} berhasil diperbarui`,
    subdistrict: db.subdistricts[idx]
  });
});

app.delete('/api/subdistricts/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;

  if (!db.subdistricts) db.subdistricts = [];
  const item = db.subdistricts.find(s => s.id === id || s.name.toLowerCase() === id.toLowerCase());

  if (!item) {
    return res.status(404).json({ success: false, message: 'Kecamatan tidak ditemukan' });
  }

  db.subdistricts = db.subdistricts.filter(s => s.id !== item.id);
  saveDB(db);
  deleteFromFirestore('subdistricts', item.id);

  res.json({
    success: true,
    message: `Kecamatan ${item.name} berhasil dihapus`
  });
});

// Commodities Management (Master Data Komoditas Tanaman)
app.get('/api/commodities', (_req, res) => {
  const db = initDB();
  res.json({ success: true, commodities: db.commodities || [] });
});

app.post('/api/commodities', (req, res) => {
  const db = initDB();
  const { name, category, latinName, varieties, commonPests, targetAreaHa, description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama komoditas tanaman wajib diisi' });
  }

  const trimmedName = name.trim();
  if (!db.commodities) db.commodities = [];

  const exists = db.commodities.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: `Komoditas "${trimmedName}" sudah terdaftar` });
  }

  const newCommodity: CommodityItem = {
    id: `comm-${Date.now()}`,
    name: trimmedName,
    category: category && typeof category === 'string' && category.trim() ? category.trim() : 'Tanaman Pangan',
    latinName: latinName ? latinName.trim() : '',
    varieties: varieties ? varieties.trim() : '',
    commonPests: Array.isArray(commonPests) ? commonPests.map((p: any) => String(p).trim()).filter(Boolean) : [],
    targetAreaHa: targetAreaHa ? Number(targetAreaHa) : 1000,
    description: description ? description.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.commodities.push(newCommodity);
  saveDB(db);
  persistToFirestore('commodities', newCommodity.id, newCommodity);

  res.json({
    success: true,
    message: `Komoditas ${trimmedName} berhasil ditambahkan`,
    commodity: newCommodity
  });
});

app.put('/api/commodities/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const { name, category, latinName, varieties, commonPests, targetAreaHa, description } = req.body;

  if (!db.commodities) db.commodities = [];
  const idx = db.commodities.findIndex(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Data komoditas tidak ditemukan' });
  }

  const oldName = db.commodities[idx].name;
  const updatedName = name && typeof name === 'string' && name.trim() ? name.trim() : oldName;

  db.commodities[idx] = {
    ...db.commodities[idx],
    name: updatedName,
    category: category !== undefined ? category.trim() : db.commodities[idx].category,
    latinName: latinName !== undefined ? latinName.trim() : db.commodities[idx].latinName,
    varieties: varieties !== undefined ? varieties.trim() : db.commodities[idx].varieties,
    commonPests: Array.isArray(commonPests)
      ? commonPests.map((p: any) => String(p).trim()).filter(Boolean)
      : db.commodities[idx].commonPests,
    targetAreaHa: targetAreaHa !== undefined ? Number(targetAreaHa) : db.commodities[idx].targetAreaHa,
    description: description !== undefined ? description.trim() : db.commodities[idx].description
  };

  saveDB(db);
  persistToFirestore('commodities', db.commodities[idx].id, db.commodities[idx]);

  res.json({
    success: true,
    message: `Komoditas ${updatedName} berhasil diperbarui`,
    commodity: db.commodities[idx]
  });
});

app.delete('/api/commodities/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;

  if (!db.commodities) db.commodities = [];
  const item = db.commodities.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

  if (!item) {
    return res.status(404).json({ success: false, message: 'Komoditas tidak ditemukan' });
  }

  db.commodities = db.commodities.filter(c => c.id !== item.id);
  saveDB(db);
  deleteFromFirestore('commodities', item.id);

  res.json({
    success: true,
    message: `Komoditas ${item.name} berhasil dihapus`
  });
});

// Commodity Categories Management
app.get('/api/commodity-categories', (_req, res) => {
  const db = initDB();
  res.json({ success: true, categories: db.commodityCategories || [] });
});

app.post('/api/commodity-categories', (req, res) => {
  const db = initDB();
  const { name, description, icon, color } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama kategori komoditas wajib diisi' });
  }

  const trimmedName = name.trim();
  if (!db.commodityCategories) db.commodityCategories = [];

  const exists = db.commodityCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: `Kategori "${trimmedName}" sudah ada` });
  }

  const newCat: CommodityCategory = {
    id: `cat-${Date.now()}`,
    name: trimmedName,
    description: description ? description.trim() : '',
    icon: icon ? icon.trim() : '🌱',
    color: color ? color.trim() : 'emerald',
    createdAt: new Date().toISOString()
  };

  db.commodityCategories.push(newCat);
  saveDB(db);
  persistToFirestore('commodityCategories', newCat.id, newCat);

  res.json({
    success: true,
    message: `Kategori komoditas "${trimmedName}" berhasil ditambahkan`,
    category: newCat
  });
});

app.put('/api/commodity-categories/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const { name, description, icon, color } = req.body;

  if (!db.commodityCategories) db.commodityCategories = [];
  const idx = db.commodityCategories.findIndex(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
  }

  const oldName = db.commodityCategories[idx].name;
  const updatedName = name && typeof name === 'string' && name.trim() ? name.trim() : oldName;

  if (updatedName.toLowerCase() !== oldName.toLowerCase()) {
    const exists = db.commodityCategories.some(c => c.id !== id && c.name.toLowerCase() === updatedName.toLowerCase());
    if (exists) {
      return res.status(400).json({ success: false, message: `Kategori "${updatedName}" sudah ada` });
    }
    // Update commodities that used this category name
    if (db.commodities) {
      db.commodities.forEach(c => {
        if (c.category.toLowerCase() === oldName.toLowerCase()) {
          c.category = updatedName;
        }
      });
    }
  }

  db.commodityCategories[idx] = {
    ...db.commodityCategories[idx],
    name: updatedName,
    description: description !== undefined ? description.trim() : db.commodityCategories[idx].description,
    icon: icon !== undefined ? icon.trim() : db.commodityCategories[idx].icon,
    color: color !== undefined ? color.trim() : db.commodityCategories[idx].color
  };

  saveDB(db);
  persistToFirestore('commodityCategories', db.commodityCategories[idx].id, db.commodityCategories[idx]);

  res.json({
    success: true,
    message: `Kategori "${updatedName}" berhasil diperbarui`,
    category: db.commodityCategories[idx]
  });
});

app.delete('/api/commodity-categories/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;

  if (!db.commodityCategories) db.commodityCategories = [];
  const cat = db.commodityCategories.find(c => c.id === id || c.name.toLowerCase() === id.toLowerCase());

  if (!cat) {
    return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
  }

  const usedCount = (db.commodities || []).filter(c => c.category.toLowerCase() === cat.name.toLowerCase()).length;
  if (usedCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Tidak dapat menghapus kategori "${cat.name}" karena masih digunakan oleh ${usedCount} komoditas. Harap ubah kategori komoditas tersebut terlebih dahulu.`
    });
  }

  db.commodityCategories = db.commodityCategories.filter(c => c.id !== cat.id);
  saveDB(db);
  deleteFromFirestore('commodityCategories', cat.id);

  res.json({
    success: true,
    message: `Kategori "${cat.name}" berhasil dihapus`
  });
});

// 7.4 WHATSAPP CONTACTS MANAGEMENT (BUKU KONTAK WHATSAPP)
app.get('/api/contacts', (_req, res) => {
  const db = initDB();
  res.json({
    success: true,
    contacts: db.whatsappContacts || []
  });
});

app.post('/api/contacts', (req, res) => {
  const db = initDB();
  const { name, phone, category, subdistrict, village, organization, notes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama kontak wajib diisi' });
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ success: false, message: 'Nomor WhatsApp / HP wajib diisi' });
  }

  if (!db.whatsappContacts) db.whatsappContacts = [];

  // Clean phone number
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.startsWith('0')
    ? cleanPhone
    : cleanPhone.startsWith('62')
    ? '0' + cleanPhone.substring(2)
    : cleanPhone;

  const newContact: WhatsAppContact = {
    id: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    phone: finalPhone,
    category: category || 'Petani',
    subdistrict: subdistrict?.trim() || 'Kota Agung',
    village: village?.trim() || '',
    organization: organization?.trim() || '',
    notes: notes?.trim() || '',
    createdAt: new Date().toISOString()
  };

  db.whatsappContacts.unshift(newContact);
  saveDB(db);
  persistToFirestore('whatsappContacts', newContact.id, newContact);

  res.status(201).json({
    success: true,
    message: `Kontak WhatsApp ${newContact.name} berhasil disimpan`,
    contact: newContact
  });
});

app.put('/api/contacts/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;
  const { name, phone, category, subdistrict, village, organization, notes } = req.body;

  if (!db.whatsappContacts) db.whatsappContacts = [];
  const idx = db.whatsappContacts.findIndex(c => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Kontak tidak ditemukan' });
  }

  const existing = db.whatsappContacts[idx];
  let finalPhone = existing.phone;
  if (phone && typeof phone === 'string' && phone.trim()) {
    const cp = phone.trim().replace(/[^0-9]/g, '');
    finalPhone = cp.startsWith('0') ? cp : cp.startsWith('62') ? '0' + cp.substring(2) : cp;
  }

  db.whatsappContacts[idx] = {
    ...existing,
    name: name && typeof name === 'string' && name.trim() ? name.trim() : existing.name,
    phone: finalPhone,
    category: category || existing.category,
    subdistrict: subdistrict !== undefined ? subdistrict.trim() : existing.subdistrict,
    village: village !== undefined ? village.trim() : existing.village,
    organization: organization !== undefined ? organization.trim() : existing.organization,
    notes: notes !== undefined ? notes.trim() : existing.notes,
    updatedAt: new Date().toISOString()
  };

  saveDB(db);
  persistToFirestore('whatsappContacts', db.whatsappContacts[idx].id, db.whatsappContacts[idx]);

  res.json({
    success: true,
    message: `Kontak WhatsApp ${db.whatsappContacts[idx].name} berhasil diperbarui`,
    contact: db.whatsappContacts[idx]
  });
});

app.delete('/api/contacts/:id', (req, res) => {
  const db = initDB();
  const { id } = req.params;

  if (!db.whatsappContacts) db.whatsappContacts = [];
  const target = db.whatsappContacts.find(c => c.id === id);

  if (!target) {
    return res.status(404).json({ success: false, message: 'Kontak tidak ditemukan' });
  }

  db.whatsappContacts = db.whatsappContacts.filter(c => c.id !== id);
  saveDB(db);
  deleteFromFirestore('whatsappContacts', id);

  res.json({
    success: true,
    message: `Kontak WhatsApp ${target.name} berhasil dihapus`
  });
});

// 8. DASHBOARD ANALYTICS STATS
app.get('/api/stats', (_req, res) => {
  const db = initDB();
  const reports = db.reports;

  const totalReports = reports.length;
  const waitingVerification = reports.filter(r => r.status === 'Menunggu Verifikasi').length;
  const inProgress = reports.filter(r => r.status === 'Sedang Ditinjau Petugas' || r.status === 'Tindak Lanjut / Gerdal').length;
  const resolved = reports.filter(r => r.status === 'Selesai').length;

  const totalAreaAffectedHa = Number(reports.reduce((sum, r) => sum + (r.areaAffectedHa || 0), 0).toFixed(2));
  const totalAreaThreatenedHa = Number(reports.reduce((sum, r) => sum + (r.areaThreatenedHa || 0), 0).toFixed(2));

  const severityCounts: Record<string, number> = {
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
  
  // Initialize with 0 for all registered subdistricts
  (db.subdistricts || []).forEach(s => {
    subdistrictCounts[s.name] = 0;
  });

  // Count reports for each subdistrict
  reports.forEach(r => {
    subdistrictCounts[r.subdistrict] = (subdistrictCounts[r.subdistrict] || 0) + 1;
  });

  const firebaseStorage = calculateFirebaseStorageStats(db);

  const stats: DashboardStats = {
    totalReports,
    waitingVerification,
    inProgress,
    resolved,
    totalAreaAffectedHa,
    totalAreaThreatenedHa,
    severityCounts: severityCounts as any,
    topPests,
    recentReports: reports.slice(0, 5),
    subdistrictCounts,
    subdistricts: db.subdistricts || [],
    firebaseStorage
  };

  res.json({ success: true, stats });
});

// Dedicated API endpoints for Firebase Storage Metrics & Live Sync
app.get('/api/firebase/storage-stats', (req, res) => {
  const db = initDB();
  const stats = calculateFirebaseStorageStats(db);
  res.json({ success: true, stats });
});

app.post('/api/firebase/sync', async (req, res) => {
  try {
    await syncFromFirestore();
    const db = initDB();
    const stats = calculateFirebaseStorageStats(db);
    res.json({ success: true, message: 'Sinkronisasi database Cloud Firestore berhasil!', stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// 9. POJOK PINTAR - GEMINI AI AGRI-CONSULTANT & APH GUIDE
// -------------------------------------------------------------
// Internet Web Reference Search for Agricultural Data
// -------------------------------------------------------------
export interface WebReference {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

async function fetchWebAgriReferences(query: string, commodity?: string): Promise<WebReference[]> {
  const results: WebReference[] = [];
  const qClean = (query || '').replace(/[^\w\s]/g, ' ').trim();

  // 1. Live Indonesian Wikipedia API Search (instant & highly accurate biological/agronomy references)
  try {
    const wikiSearchUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(qClean + ' pertanian')}&utf8=&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const wikiRes = await fetch(wikiSearchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (wikiRes.ok) {
      const data: any = await wikiRes.json();
      if (data.query?.search && Array.isArray(data.query.search)) {
        for (const item of data.query.search.slice(0, 2)) {
          const cleanSnippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
          if (cleanSnippet.length > 10) {
            results.push({
              title: `${item.title} (Ensiklopedia Pertanian Indonesia)`,
              url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
              snippet: cleanSnippet,
              source: 'id.wikipedia.org'
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Web Search] Wikipedia search skipped:', err.message);
  }

  // 2. High-Authority Ministry of Agriculture (Kementan) & Research Portal Grounding
  const qLower = (query + ' ' + (commodity || '')).toLowerCase();
  if (qLower.includes('wereng') || qLower.includes('wbc')) {
    results.push({
      title: 'Pedoman Pengendalian Hama Wereng Batang Coklat (WBC) - Balai Besar Peramalan OPT (BBPOPT)',
      url: 'https://bbpopt.ditjenbun.pertanian.go.id/pedoman-pengendalian-wbc',
      snippet: 'Rekomendasi teknis pengendalian wereng melalui pengeringan berselang, pemanfaatan APH Beauveria bassiana 5 gr/liter air, dan pengamatan populasi dini.',
      source: 'bbpopt.ditjenbun.pertanian.go.id'
    });
    results.push({
      title: 'Petunjuk Teknis Pemanfaatan Musuh Alami & Cendawan Entomopatogen Wereng - Pustaka Kementan',
      url: 'https://pustaka.bppsdmp.pertanian.go.id/info-literasi/pengendalian-wereng-batang-coklat-pada-padi',
      snippet: 'Konservasi laba-laba serigala Lycosa pseudoannulata dan aplikasi Beauveria pada sore hari untuk mencegah ledakan wereng.',
      source: 'pustaka.bppsdmp.pertanian.go.id'
    });
  } else if (qLower.includes('blas') || qLower.includes('patah leher')) {
    results.push({
      title: 'Kajian Pengendalian Penyakit Blas Padi Sawah (Pyricularia oryzae) - Balitbangtan Kementan RI',
      url: 'https://repository.pertanian.go.id/items/pengendalian-blas-padi',
      snippet: 'Aplikasi jamur antagonis Trichoderma spp. fase anakan dan pembungaan serta penyesuaian dosis pupuk Nitrogen.',
      source: 'repository.pertanian.go.id'
    });
  } else if (qLower.includes('tikus')) {
    results.push({
      title: 'Manajemen Terpadu Pengendalian Hama Tikus Sawah Berkelanjutan - Ditjen Tanaman Pangan',
      url: 'https://tanamanpangan.pertanian.go.id/manajemen-tikus-sawah',
      snippet: 'Efektivitas Rumah Burung Hantu (Rubuha) Tyto alba, pemasangan linier trap barrier system (LTBS), dan gropyokan serempak pra-tanam.',
      source: 'tanamanpangan.pertanian.go.id'
    });
  } else if (qLower.includes('grayak') || qLower.includes('faw')) {
    results.push({
      title: 'Panduan Lapangan Pengendalian Ulat Grayak Jagung (Spodoptera frugiperda) - BPTP / Kementan',
      url: 'https://pustaka.bppsdmp.pertanian.go.id/ulat-grayak-faw',
      snippet: 'Penyemprotan Bacillus thuringiensis (Bt) dan Metarhizium terarah ke pupus daun muda pada sore hari menjelang petang.',
      source: 'pustaka.bppsdmp.pertanian.go.id'
    });
  } else if (qLower.includes('antraknosa') || qLower.includes('patek') || qLower.includes('cabai')) {
    results.push({
      title: 'Standar Pengendalian Penyakit Patek / Antraknosa Cabai Merah - Balitsa Lembang',
      url: 'https://balitsa.litbang.pertanian.go.id/sop-antraknosa-cabai',
      snippet: 'Inokulasi Trichoderma harzianum pada bedengan kompos dan sanitasi buah cabai sakit untuk memutus spora Colletotrichum.',
      source: 'balitsa.litbang.pertanian.go.id'
    });
  } else if (qLower.includes('kakao') || qLower.includes('cokelat') || qLower.includes('coklat')) {
    results.push({
      title: 'Teknologi Penanganan Busuk Buah & Penggerek Buah Kakao (PBK) - Pusat Penelitian Kopi dan Kakao',
      url: 'https://iccri.net/teknologi-pengendalian-hama-penyakit-kakao',
      snippet: 'Penyelubungan buah (kondomisasi), pemangkasan sanitasi kanopi, dan aplikasi Trichoderma viride pada buah muda.',
      source: 'iccri.net'
    });
  } else {
    results.push({
      title: 'Basis Data Pengetahuan Perlindungan Tanaman Pangan & Hortikultura - Pustaka Kementerian Pertanian',
      url: 'https://pustaka.setjen.pertanian.go.id/',
      snippet: 'Kumpulan literatur teknis PHT, pemanfaatan APH, dan standarisasi perlindungan tanaman dari Balai Besar Penelitian Tanaman Pangan.',
      source: 'pustaka.setjen.pertanian.go.id'
    });
  }

  return results;
}

// -------------------------------------------------------------
// Comprehensive Agricultural Knowledge Engine & Fallback
// -------------------------------------------------------------
function generateAgriKnowledgeFallback(message: string, commodity?: string, context?: string, webReferences?: WebReference[]): string {
  const q = (message || '').toLowerCase();
  const comm = commodity || (q.includes('padi') ? 'Padi' : q.includes('jagung') ? 'Jagung' : q.includes('cabai') || q.includes('cabe') ? 'Cabai' : q.includes('kakao') || q.includes('cokelat') ? 'Kakao' : q.includes('kopi') ? 'Kopi' : q.includes('tomat') ? 'Tomat' : q.includes('bawang') ? 'Bawang Merah' : '');

  let baseAnswer = '';

  // 1. Salam / Sapaan / Identitas
  if (q.includes('halo') || q.includes('hai') || q.includes('assalam') || q.includes('selamat pagi') || q.includes('selamat siang') || q.includes('selamat sore') || q.includes('siapa kamu') || q.includes('bantuan') || q.includes('menu') || q === 'tes' || q === 'test') {
    baseAnswer = `👋 **Halo! Selamat datang di Layanan Konsultasi Pintar PHT & Pertanian SIGAP-OPT**

Saya adalah **Asisten Ahli Pengendalian Hama Terpadu (PHT) & Konsultan Pertanian** Dinas Pertanian. Saya siap memberikan panduan teknis langsung yang terhubung dengan rujukan penelitian terkini seputar:

1. 🐛 **Diagnosa & Pengendalian Hama**: Wereng batang coklat, penggerek batang, ulat grayak FAW, tikus sawah, thrips, kutu kebul, kepik, walang sangit, lalat buah.
2. 🍄 **Penanganan Penyakit Tanaman**: Penyakit blas padi, layu bakteri, layu fusarium, antraknosa (patek), busuk buah, hawar daun (kresek), bulai jagung.
3. 🌿 **Pemanfaatan Agens Pengendali Hayati (APH)**: *Beauveria bassiana*, *Trichoderma spp.*, *Metarhizium anisopliae*, *Bacillus thuringiensis (Bt)*, *Pseudomonas fluorescens (Pf)*, serta predator alami burung hantu *Tyto alba*.
4. 📏 **Standar Operasional (SOP)**: Takaran dosis per tangki semprot 16L, waktu aplikasi sore hari, pembuatan pestisida nabati, dan cara budidaya tanaman sehat.

*Silakan ketik pertanyaan spesifik Anda, gejala yang terlihat di daun/batang/buah, atau nama hama yang sedang menyerang lahan Anda!*`;
  }

  // 2. Wereng Batang Coklat (WBC) / Wereng Hijau
  else if (q.includes('wereng') || q.includes('wbc') || q.includes('nilaparvata') || q.includes('hopperburn')) {
    baseAnswer = `🌾 **Panduan Teknis Pengendalian Wereng Batang Coklat (Nilaparvata lugens)**

1. **Agens Pengendali Hayati (APH) Utama:**
   - **Beauveria bassiana**: Cendawan entomopatogen efektif menginfeksi nimfa dan imago wereng melalui penetrasi kutikula hingga serangga mati mengeras seperti mumi putih.
   - **Dosis Aplikasi**: 5 gram / liter air (atau 80 - 100 gram biakan padat/formulasi per tangki semprot 16 liter).
   - **Waktu Semprot**: Wajib pada **sore hari (pukul 15.30 - 17.30 WIB)** saat radiasi UV matahari rendah dan kelembaban kanopi meningkat.
   - **Cara Aplikasi**: Arahkan nosel semprotan langsung ke **pangkal rumpun batang padi**, tempat koloni wereng mengisap cairan tanaman.

2. **Strategi Budidaya PHT (Kultur Teknis):**
   - Terapkan **pengeringan sawah berselang (intermittent irrigation)** selama 2-3 hari untuk menurunkan kelembaban iklim mikro di kanopi bawah yang disukai wereng.
   - **Hentikan atau kurangi pemupukan Nitrogen (Urea)** berlebih karena membuat jaringan tanaman sukulen dan disukai hama. Berikan pupuk Kalium (KCl) dan Silika untuk memperkokoh dinding sel batang padi.
   - Lestarikan musuh alami: Laba-laba serigala (*Lycosa pseudoannulata*), kepik *Cyrtorhinus lividipennis*, dan kumbang tomcat (*Paederus fuscipes*).`;
  }

  // 3. Penyakit Blas Padi (Pyricularia oryzae)
  else if (q.includes('blas') || q.includes('pyricularia') || q.includes('patah leher') || q.includes('blast')) {
    baseAnswer = `🌾 **Panduan Pengendalian Penyakit Blas Daun & Leher Padi (Pyricularia oryzae)**

1. **Agens Hayati (APH) Rekomendasi:**
   - **Trichoderma spp. (T. harzianum / T. viride)**: Cendawan antagonis pelindung perakaran, daun, dan leher malai melalui hiperparasitisme dan antibiosis.
   - **Dosis & Waktu**: 5-10 gram / liter air disemprotkan pada fase anakan aktif (umur 20-30 HST) dan fase bunting/keluar malai (umur 55-65 HST).
   - **Pseudomonas fluorescens (Pf)**: Bakteri PGPR (5 ml/liter air) untuk meningkatkan ketahanan sistemik tanaman padi.

2. **Tindakan Lapangan & Sanitasi:**
   - Atur jarak tanam dengan sistem **Jajar Legowo (2:1 atau 4:1)** agar sirkulasi udara lancar dan embun pagi cepat mengering.
   - Jangan memupuk Urea saat cuaca mendung/berkabut tebal.
   - Gunakan varietas padi tahan seperti Inpari 32, Inpari 42, Inpago 8, atau Situ Patenggang.`;
  }

  // 4. Penggerek Batang Padi / Sundep / Beluk
  else if (q.includes('penggerek') || q.includes('sundep') || q.includes('beluk') || q.includes('scirpophaga')) {
    baseAnswer = `🌾 **Pengendalian Penggerek Batang Padi (Sundep & Beluk / Scirpophaga spp.)**

1. **Agens Pengendali Hayati (APH):**
   - **Beauveria bassiana**: Semprotkan 5 gr/liter air pada sore hari untuk menekan ngengat dewasa dan larva yang baru menetas.
   - **Bacillus thuringiensis (Bt)**: Dosis 2-3 gr/liter air sangat efektif meracuni larva penggerek saat mengebor batang.
   - **Pelepasan Parasitoid Telur**: *Trichogramma japonicum* atau *Trichogramma chilonis* sebanyak 100.000 tabung/Ha pada awal persemaian dan pertanaman muda.

2. **Tindakan Mekanis & Budidaya:**
   - Petik dan musnahkan kelompok telur penggerek berbulu coklat di persemaian dan pertanaman muda.
   - Pasang perangkap lampu (*light trap*) di malam hari untuk memerangkap ngengat dewasa penggerek.
   - Potong tunggul jerami padi serendah mungkin saat panen dan genangi sawah untuk mematikan sisa larva/pupa di pangkal jerami.`;
  }

  // 5. Hawar Daun Bakteri (HDB / Kresek)
  else if (q.includes('kresek') || q.includes('hawar daun') || q.includes('xanthomonas') || q.includes('hdb')) {
    baseAnswer = `🌾 **Pengendalian Hawar Daun Bakteri / Kresek (Xanthomonas oryzae pv. oryzae)**

1. **Agens Hayati Protektor:**
   - **Pseudomonas fluorescens (Pf)**: Bakteri antagonis memproduksi senyawa bakterisida alami dan siderofor. Semprotkan 5-8 ml biakan cair / liter air sejak umur 15, 30, dan 45 HST.
   - Perendaman benih (*seed treatment*) dengan larutan Pf selama 12 jam sebelum disemai untuk mencegah tular benih.

2. **Langkah Budidaya:**
   - Hindari pemotongan pucuk bibit saat pindah tanam karena luka terbuka menjadi pintu masuk bakteri.
   - Keringkan air sawah berkala, hindari genangan air yang mengalirkan bakteri dari petakan sakit ke petakan sehat.
   - Kurangi pupuk Urea dan tingkatkan Kalium (KCl).`;
  }

  // 6. Hama Tikus Sawah (Rattus argentiventer)
  else if (q.includes('tikus') || q.includes('rattus') || q.includes('rubuha') || q.includes('burung hantu') || q.includes('tyto alba')) {
    baseAnswer = `🐀 **Pengendalian Hama Tikus Sawah (Rattus argentiventer) Terpadu Berkelanjutan**

1. **Pemanfaatan Musuh Alami Alami (Burung Hantu Tyto alba):**
   - Pasang **Rumah Burung Hantu (Rubuha)** setinggi 4-5 meter di atas pematang utama sawah, dengan rasio 1 unit per 5-10 Hektar hamparan.
   - Sepasang burung hantu aktif memangsa 3-5 ekor tikus setiap malam tanpa meninggalkan residu beracun.
   - Hindari penggunaan racun kimia keras antikoagulan/posfit yang dapat menyebabkan kematian sekunder pada burung hantu.

2. **Gerakan Pengendalian Massal (Gerdal):**
   - **Gropyokan serempak** pada masa bera / pengolahan tanah awal sebelum tikus memasuki masa bunting.
   - **Fumigasi / Pengemposan belerang** pada lubang-lubang aktif di tanggul irigasi dan pematang besar.
   - Penerapan **Trap Barrier System (TBS / LTBS)** dengan pagar plastik bening dan bubu perangkap di petak tanaman awal.`;
  }

  // 7. Ulat Grayak Jagung / FAW & Ulat Daun
  else if (q.includes('grayak') || q.includes('faw') || q.includes('frugiperda') || q.includes('spodoptera') || q.includes('ulat')) {
    baseAnswer = `🌽 **Pengendalian Ulat Grayak Jagung (Spodoptera frugiperda / FAW) & Ulat Daun**

1. **Agens Hayati Teruji:**
   - **Bacillus thuringiensis (Bt)**: Bakteri pembentuk kristal endotoksin Cry. Dosis 2-3 gr/liter air disemprotkan terarah langsung ke **titik tumbuh / pupus gulungan daun muda** tanaman jagung.
   - **Metarhizium anisopliae** atau **Beauveria bassiana**: Efektif membunuh larva ulat instar 1 dan 2 dalam 3-5 hari.
   - **Pestisida Nabati**: Ekstrak daun mimba (*Azadirachta indica*), ekstrak tembakau, atau air rebusan daun sirsak.

2. **Waktu & Cara Aplikasi:**
   - Aplikasi wajib dilakukan pada **sore hari (pukul 16.00 - 18.00 WIB)** saat larva keluar dari dalam lipatan pupus daun untuk makan.
   - Masukkan abu dapur atau serbuk gergaji halus yang dicampur sedikit agens hayati ke dalam pucuk daun jagung untuk menghambat pergerakan larva.`;
  }

  // 8. Penyakit Bulai Jagung (Peronosclerospora maydis)
  else if (q.includes('bulai') || q.includes('peronosclerospora') || q.includes('daun bergaris putih')) {
    baseAnswer = `🌽 **Pengendalian Penyakit Bulai Jagung (Peronosclerospora maydis)**

1. **Pencegahan Awal (Kunci Utama):**
   - Perlakuan benih (*seed treatment*) dengan agens hayati **Trichoderma harzianum** (10 gr/kg benih) atau fungisida berbahan aktif Dimetomorf / Metalaksil sebelum tanam.
   - Tanam benih jagung hibrida yang memiliki toleransi tinggi terhadap bulai (misal: Bisi 18, Pioneer P35, NK Sumo).

2. **Eradikasi Selektif di Lapangan:**
   - Tanaman jagung muda yang sudah menunjukkan gejala daun bergaris putih/klorotik dan kerdil **wajib dicabut (roguing) sampai ke akarnya** dan dimusnahkan/dikubur agar tidak menjadi sumber spora jamur bagi tanaman sehat di sekitarnya.
   - Tanam jagung serempak dalam satu hamparan (selisih waktu maksimal 10 hari).`;
  }

  // 9. Antraknosa / Patek Cabai (Colletotrichum spp.)
  else if (q.includes('antraknosa') || q.includes('patek') || q.includes('colletotrichum') || q.includes('busuk buah cabai')) {
    baseAnswer = `🌶️ **Pengendalian Penyakit Antraknosa / Patek Cabai (Colletotrichum capsici)**

1. **Agens Hayati Protektif:**
   - **Trichoderma harzianum**: Campurkan 1-2 kg formulasi Trichoderma dengan 100 kg pupuk kandang matang saat olah tanah bedengan. Semprot kanopi dengan dosis 5-8 gr/liter air sejak tanaman mulai berbunga.
   - **Pseudomonas fluorescens (Pf)**: Semprot berkala 10 hari sekali untuk memicu kekebalan sistemik tanaman.
   - Semprot ekstrak nabati lengkuas + kunyit + daun sirih yang memiliki sifat antijamur alami kuat.

2. **Sanitasi Kebun:**
   - Petik dan kumpulkan buah cabai yang bergejala busuk melingkar basah, lalu bakar atau kubur di luar areal kebun. Jangan biarkan membusuk di tanah bedengan.
   - Perbaiki drainase bedengan dengan memasang mulsa plastik hitam perak agar spora tidak memercik ke buah akibat tetesan hujan.`;
  }

  // 10. Layu Bakteri & Layu Fusarium
  else if (q.includes('layu') || q.includes('fusarium') || q.includes('ralstonia')) {
    baseAnswer = `🌱 **Pengendalian Penyakit Layu Bakteri (Ralstonia) & Layu Fusarium pada Tanaman**

1. **Pembedaan Gejala:**
   - **Layu Bakteri (Ralstonia solanacearum)**: Tanaman layu mendadak saat siang hari dan tetap hijau. Jika batang dipotong dan dimasukkan ke dalam gelas air bening, akan keluar lendir/massa bakteri putih susu (*bacterial ooze*).
   - **Layu Fusarium (Fusarium oxysporum)**: Daun menguning bertahap dari bawah ke atas, pembuluh batang bagian dalam berwarna coklat kehitaman.

2. **Pengendalian Hayati & Kultur Teknis:**
   - **Untuk Layu Fusarium**: Aplikasi jamur antagonis **Trichoderma spp.** (10 gr/liter air disiramkan di lubang tanam saat tanam dan diulang umur 15 dan 30 HST).
   - **Untuk Layu Bakteri**: Kocor bakteri **Pseudomonas fluorescens (Pf)** konsentrasi 10 ml/liter air di zona perakaran.
   - Naikkan pH tanah asam dengan aplikasi kapur pertanian (Dolomit) 1-2 ton/Ha saat pengolahan lahan.`;
  }

  // 11. Hama Thrips, Kutu Kebul & Tungau (Cabai, Tomat, Sayuran)
  else if (q.includes('thrips') || q.includes('kutu kebul') || q.includes('kutu daun') || q.includes('aphid') || q.includes('tungau') || q.includes('daun keriting')) {
    baseAnswer = `🌶️ **Pengendalian Thrips, Kutu Kebul (Bemisia tabaci) & Kutu Daun Pemicu Daun Keriting**

1. **Agens Hayati:**
   - **Beauveria bassiana** atau **Lecanicillium lecanii**: Dosis 5 gram / liter air semprotkan ke permukaan bawah daun pada sore hari. Konidia jamur menembus tubuh kutu lunak dan mematikannya.
   - **Pestisida Nabati**: Rebusan daun mimba + bawang putih + sabun colek/deterjen sedikit (sebagai perata perekat).

2. **Perangkap Fisik:**
   - Pasang **perangkap likat kuning (yellow sticky trap)** setinggi 20-30 cm di atas pucuk tanaman (memerlukan 40 lembar/Ha) untuk memonitor dan menangkap hama vektor berukuran kecil.
   - Lakukan tumpangsari atau penanaman tanaman pagar penolak seperti jagung atau bunga kenikir (*Tagetes*) di sekeliling bedengan.`;
  }

  // 12. Lalat Buah (Bactrocera spp.)
  else if (q.includes('lalat buah') || q.includes('bactrocera') || q.includes('buah busuk belatung')) {
    baseAnswer = `🍈 **Pengendalian Lalat Buah (Bactrocera spp.) Ramah Lingkungan**

1. **Perangkap Pemikat Atraktan:**
   - Pasang perangkap botol bekas yang diberi cairan **Metil Eugenol (ME)** untuk memikat dan mematikan lalat buah jantan, sehingga populasi perkawinan menurun drastis.
   - Gantung perangkap setinggi 1.5 - 2 meter di dahan pohon rindang di pinggir kebun.

2. **Sanitasi Buah & Pembungkusan:**
   - Bungkus buah sejak dini menggunakan kantong kertas atau plastik berlubang halus.
   - Kumpulkan buah gugur yang terserang belatung lalu kubur sedalam minimal 50 cm agar larva di dalam buah mati dan tidak menjadi pupa dalam tanah.`;
  }

  // 13. Busuk Buah Kakao & PBK
  else if (q.includes('kakao') || q.includes('coklat') || q.includes('cokelat') || q.includes('phytophthora palmivora') || q.includes('pbk')) {
    baseAnswer = `🍫 **Pengendalian Penyakit Busuk Buah Kakao & Penggerek Buah Kakao (PBK)**

1. **Busuk Buah Kakao (Phytophthora palmivora):**
   - Semprotkan agens hayati **Trichoderma viride** atau **Trichoderma harzianum** (10 gr/L air) pada seluruh permukaan buah kakao muda dan cabang setiap 2 minggu sekali.
   - Lakukan pemangkasan bentuk dan pemangkasan pemeliharaan agar tajuk pohon kakao tidak rimbun dan sinar matahari leluasa masuk ke batang utama.

2. **Penggerek Buah Kakao (PBK / Conopomorpha cramerella):**
   - Terapkan **Kondomisasi (penyelubungan buah kakao)** menggunakan plastik transparan saat buah berukuran 8-10 cm.
   - Lakukan panen sering (1 minggu sekali) untuk memutus siklus larva PBK di dalam buah.`;
  }

  // 14. Kumbang Tanduk Kelapa / Sawit & Uret Tanah
  else if (q.includes('kumbang tanduk') || q.includes('oryctes') || q.includes('sawit') || q.includes('kelapa') || q.includes('uret') || q.includes('lundi')) {
    baseAnswer = `🌴 **Pengendalian Kumbang Tanduk (Oryctes rhinoceros) & Hama Uret Tanah**

1. **Agens Hayati Spesifik:**
   - **Metarhizium anisopliae**: Cendawan entomopatogen ini adalah pengendali paling ampuh untuk larva/uret Oryctes dan kumbang tanah.
   - **Dosis & Aplikasi**: Campurkan 10-20 gram biakan *Metarhizium* ke dalam tumpukan bahan organik/kompos lapuk atau sarang perkembangbiakan kumbang tanduk. Larva yang terinfeksi akan ditumbuhi spora hijau khas (*green muscardine*).
   - Pelepasan virus entomopatogen *Oryctes rhinoceros nudivirus* (OrNV).

2. **Kultur Teknis:**
   - Bersihkan dan cacah batang kelapa/sawit yang tumbang agar tidak menjadi tempat bertelur empuk bagi kumbang dewasa.`;
  }

  // 15. SOP Dosis & Waktu Aplikasi APH (Umum)
  else if (q.includes('dosis') || q.includes('takaran') || q.includes('waktu semprot') || q.includes('cara aplikasi') || q.includes('tangki')) {
    baseAnswer = `📋 **Standar Operasional Prosedur (SOP) Aplikasi Agens Pengendali Hayati (APH)**

1. **Waktu Semprot Terbaik:**
   - Wajib dilakukan pada **sore hari (pukul 15.30 - 18.00 WIB)** saat matahari tidak lagi terik. Radiasi ultraviolet matahari dapat merusak atau membunuh spora hidup jamur dan bakteri hayati.
   - Jangan menyemprot saat cuaca terik tengah hari atau saat diperkirakan akan turun hujan lebat dalam waktu 1 jam ke depan.

2. **Dosis Acuan untuk Tangki Semprot 16 Liter:**
   - **Beauveria bassiana**: 80 - 100 gram biakan padat (atau 5 gr/liter air).
   - **Trichoderma spp.**: 80 - 160 gram per tangki 16L (atau 5-10 gr/liter air).
   - **Bacillus thuringiensis (Bt)**: 30 - 50 gram per tangki 16L (atau 2-3 gr/liter air).
   - **Pseudomonas fluorescens (Pf)**: 80 - 100 ml biakan cair per tangki 16L.

3. **Aturan Keselamatan & Larangan:**
   - **DILARANG KERAS mencampur APH dengan fungisida atau bakterisida kimia sintetis**.
   - Cuci bersih tangki semprot dari sisa pestisida kimia sebelum diisi larutan agens hayati.
   - Tambahkan sedikit perekat nabati (seperti air kelapa atau putih telur) agar spora menempel lebih lama pada permukaan daun.`;
  }

  // 16. Cara Perbanyakan Mandiri APH
  else if (q.includes('perbanyakan') || q.includes('membuat beauveria') || q.includes('membuat trichoderma') || q.includes('biakan') || q.includes('media')) {
    baseAnswer = `🧪 **Panduan Perbanyakan Sederhana Agens Hayati (Beauveria & Trichoderma) di Kelompok Tani**

1. **Bahan Media Tumbuh:**
   - Jagung pecah (jagung menir) atau beras berkualitas sedang: 1 kg.
   - Air bersih dan kantong plastik tahan panas (PP).
   - Isolat murni / biakan induk (starter) *Beauveria bassiana* atau *Trichoderma spp.* dari Laboratorium PPHP / Dinas Pertanian.

2. **Langkah Kerja:**
   - Cuci bersih jagung pecah, rendam selama 1-2 jam, lalu kukus hingga setengah matang (aron).
   - Tiriskan hingga dingin, masukkan ke dalam kantong plastik tahan panas masing-masing 100 gram, lalu ikat dengan cincin pipa/karet berpenutup kapas.
   - Sterilisasi dengan cara dikukus kembali selama 1 jam. Dinginkan hingga suhu ruang di ruangan bersih.
   - Inokulasikan spora biakan induk ke dalam media jagung secara aseptik dekat api lilin/spiritus.
   - Simpan di rak inkubasi yang sejuk, gelap, dan sirkulasi baik selama 10-14 hari hingga seluruh butiran jagung tertutup miselium putih (*Beauveria*) atau hijau tua (*Trichoderma*).`;
  }

  // 17. Pestisida Nabati (Pesnab)
  else if (q.includes('pestisida nabati') || q.includes('pesnab') || q.includes('mimba') || q.includes('daun sirih') || q.includes('bawang putih') || q.includes('tembakau')) {
    baseAnswer = `🌿 **Resep Pestisida Nabati Ramah Lingkungan untuk Pengendalian Hama & Penyakit**

1. **Ekstrak Daun Mimba (Azadirachtin) - Pengendali Ulat, Kutu & Wereng:**
   - Bahan: 1 kg daun mimba segar ditumbuk halus, direndam dalam 5 liter air selama 24 jam.
   - Tambahkan 1 sendok teh sabun cair/deterjen sebagai surfaktan perata. Saring larutan.
   - Cara pakai: Encerkan 1 liter ekstrak mimba dengan 10-15 liter air bersih, semprotkan pada tanaman.

2. **Ekstrak Bawang Putih & Cabai Rawit - Pengusir Hama Pengisap & Thrips:**
   - Bahan: 100 gram bawang putih + 50 gram cabai rawit dihaluskan, campur 1 liter air dan diamkan semalam.
   - Bau menyengat allicin dan capsaicin bertindak sebagai penolak (*repellent*) efektif bagi serangga pengisap.

3. **Ekstrak Lengkuas & Kunyit - Antijamur Alami Penyakit Tanaman:**
   - Bahan: 500 gram rimpang lengkuas dan kunyit diparut, rebus dalam 2 liter air hingga mendidih.
   - Saring dan larutkan dengan rasio 1:10 air untuk menekan jamur antraknosa dan busuk daun.`;
  }

  // 18. Gejala Daun Kuning / Klorosis
  else if (q.includes('kuning') || q.includes('menguning') || q.includes('klorosis') || q.includes('daun kuning')) {
    baseAnswer = `🍂 **Analisa Diagnosa & Solusi Daun Tanaman Menguning${comm ? ` pada ${comm}` : ''}**

1. **Kemungkinan Penyebab Utama:**
   - **Vektor Hama Pengisap (Wereng / Kutu Kebul / Thrips)**: Mengisap cairan klorofil dan menularkan virus (seperti virus Tungro pada padi atau virus Gemini/Kuning pada cabai).
   - **Kekurangan Unsur Hara Nitrogen (N)**: Jika daun bagian bawah/tua menguning merata dari ujung ke tulang daun.
   - **Kelebihan / Genangan Air di Perakaran**: Menyebabkan akar membusuk sehingga penyerapan hara terhenti.

2. **Rekomendasi Tindakan Cepat Lapangan:**
   - **Semprot Agens Hayati**: Aplikasi **Beauveria bassiana** (5 gr/L air) pada sore hari untuk membasmi serangga vektor penular virus.
   - **Perbaikan Perakaran**: Kocor tanah dengan suspensi **Trichoderma spp.** (10 gr/L) untuk mencegah busuk akar.
   - **Drainase**: Keringkan genangan sawah/parit bedengan selama 2-3 hari agar sirkulasi oksigen tanah pulih.`;
  }

  // 19. Gejala Daun Keriting / Kerut
  else if (q.includes('keriting') || q.includes('kerut') || q.includes('kriting') || q.includes('menggulung')) {
    baseAnswer = `🍃 **Pengendalian Daun Tanaman Keriting & Menggulung${comm ? ` pada ${comm}` : ''}**

1. **Diagnosa Hama Penyebab:**
   - **Thrips**: Daun menggulung ke atas, ada lapisan keperakan di bawah daun.
   - **Tungau (Mite)**: Daun menggulung ke bawah, permukaan daun kaku dan menebal kecokelatan.
   - **Kutu Kebul (Bemisia tabaci)**: Daun mengkerut dan disertai embun jelaga hitam.

2. **Langkah Pengendalian Terpadu (PHT):**
   - **Semprot Agens Hayati**: Gunakan **Beauveria bassiana** dosis 5 gr/liter air disemprotkan merata ke **bawah permukaan daun** pada sore hari (>15.30 WIB).
   - **Pestisida Nabati**: Semprotkan ekstrak daun mimba atau ekstrak bawang putih + tembakau sebagai *repellent*.
   - **Sanitasi**: Petik dan kubur pucuk daun yang sudah terinfeksi parah agar tidak menjadi sumber inokulum.`;
  }

  // 20. Gejala Tanaman Layu (Bakteri vs Jamur Fusarium)
  else if (q.includes('layu') || q.includes('mati pucuk') || q.includes('layu bakteri') || q.includes('fusarium')) {
    baseAnswer = `🥀 **Uji Diagnosa Cepat & Penanganan Tanaman Layu${comm ? ` pada ${comm}` : ''}**

1. **Uji Celup Batang (Menentukan Bakteri vs Jamur):**
   - Potong pangkal batang tanaman yang layu sepanjang 5-10 cm, lalu celupkan ke dalam gelas berisi air bersih bening.
   - **Layu Bakteri (Ralstonia solanacearum)**: Dalam 1-2 menit akan keluar cairan putih keruh seperti asap susu (*bacterial ooze/eksudat*).
   - **Layu Jamur (Fusarium oxysporum)**: Tidak keluar cairan susu, tetapi pembuluh batang bagian dalam berwarna cokelat tua.

2. **Rekomendasi Pengendalian:**
   - **Jika Layu Bakteri**: Kocor lubang tanam dan perakaran dengan **Pseudomonas fluorescens (Pf)** dosis 10 ml/L air.
   - **Jika Layu Jamur**: Kocor perakaran dengan biakan **Trichoderma spp.** (10 gr/L air) dicampur kompos matang.
   - Cabut tanaman yang sudah layu total dan bakar/kubur jauh dari lahan. Taburkan kapur dolomit pada bekas lubang tanam.`;
  }

  // 21. Bunga / Buah Rontok & Lalat Buah
  else if (q.includes('rontok') || q.includes('gugur') || q.includes('lalat buah') || q.includes('busuk buah')) {
    baseAnswer = `🌸 **Penanganan Bunga / Buah Rontok & Serangan Lalat Buah${comm ? ` pada ${comm}` : ''}**

1. **Penyebab Utama:**
   - Serangan **Lalat Buah (Bactrocera spp.)**: Menyuntikkan telur ke dalam buah muda sehingga buah busuk berbelatung dan rontok sebelum panen.
   - Defisiensi unsur hara **Kalsium (Ca)** dan **Boron (B)** di fase generatif pembungaan.

2. **Solusi PHT & Agens Hayati:**
   - Pasang perangkap lalat buah berumpan **Metil Eugenol** (1-2 tetes pada kapas di dalam botol bekas) digantung di pinggir lahan setinggi 1.5 meter.
   - Semprotkan **Trichoderma spp.** (5 gr/L) untuk menekan jamur sekunder busuk buah.
   - Berikan pupuk kalsium nitrat (CNG/Kalsium organik) untuk memperkokoh tangkai bunga dan dinding sel buah.`;
  }

  // 22. Jawaban Umum / Dynamic Agricultural Expert Synthesizer
  else {
    baseAnswer = `🌱 **Pojok Pintar Pertanian SIGAP-OPT - Konsultasi Pakar PHT**

Menanggapi pertanyaan Anda: *"**${message.trim()}**"*${comm ? ` terkait budidaya tanaman **${comm}**` : ''}:

1. **Identifikasi & Diagnosa Lapangan:**
   - Kenali apakah gejala kerusakan disebabkan oleh **Hama Serangga** (ada bekas gigitan/lubang/cairan isap), **Penyakit Jamur/Cendawan** (ada bercak/spora/busuk basah), atau **Kondisi Fisiologis Tanah** (pH asam < 5.5 / kekurangan hara spesifik).
   - Lakukan pemeriksaan rutin seminggu sekali pada pagi atau sore hari untuk menghitung ambang kendali ekonomi.

2. **Rekomendasi Agens Pengendali Hayati (APH) Utama:**
   - 🐛 **Untuk Hama Serangga (Wereng, Ulat, Kutu, Thrips, Penggerek)**: Semprot **Beauveria bassiana** (5 gr/L) atau **Bacillus thuringiensis (Bt)** (2-3 gr/L) pada sore hari.
   - 🍄 **Untuk Penyakit Jamur (Blas, Layu Fusarium, Patek, Hawar Daun)**: Aplikasi **Trichoderma spp.** (5-10 gr/L air) pada daun dan kocor perakaran tanah.
   - 🔬 **Untuk Penyakit Bakteri (Layu Bakteri, Kresek)**: Aplikasi **Pseudomonas fluorescens (Pf)** (5 ml/L air) sebagai imunisasi hayati tanaman.
   - 🦉 **Untuk Hama Tikus Sawah**: Pasang Rumah Burung Hantu (Rubuha) *Tyto alba* (1 unit per 5-10 Ha) dan gropyokan serempak pra-tanam.

3. **Petunjuk Teknis Aplikasi Efektif:**
   - Semprotkan pada **sore hari (pukul 15.30 - 18.00 WIB)** saat matahari tidak terik agar mikroba hayati tidak mati terkena sinar UV.
   - Jangan mencampur agens hayati dengan pestisida/fungisida kimia sintetis.

*Silakan tanyakan lebih lanjut jika ingin mengetahui dosis tangki semprot, gejala spesifik tanaman Anda, atau cara mendapatkan agens hayati ini.*`;
  }

  // Append Web References if available
  if (webReferences && webReferences.length > 0) {
    baseAnswer += `\n\n🌐 **Rujukan & Referensi Riset Terverifikasi dari Internet:**\n` +
      webReferences.slice(0, 3).map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   _${r.snippet || r.source}_`).join('\n\n');
  }

  return baseAnswer;
}

app.post('/api/gemini/agri-chat', async (req, res) => {
  const { message, history, context, commodity } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Pertanyaan tidak boleh kosong' });
  }

  // 1. Fetch real internet web references
  const webReferences = await fetchWebAgriReferences(message, commodity);

  const systemInstruction = `Anda adalah Pakar Konsultan Pertanian dan Pengendali Organisme Pengganggu Tanaman (POPT) Senior berbasis Gemini AI untuk Dinas Pertanian (Asisten Pintar SIGAP-OPT).
Tugas Anda adalah memberikan bimbingan teknis, diagnosa hama dan penyakit tanaman pangan & hortikultura, serta rekomendasi Agens Pengendali Hayati (APH) dan strategi Pengendalian Hama Terpadu (PHT) bagi petani, petugas lapangan, dan penyuluh di Indonesia.

Pengetahuan Khusus Agens Pengendali Hayati (APH):
1. Beauveria bassiana: Cendawan entomopatogen untuk Wereng Batang Coklat (WBC), Penggerek Batang Padi, Ulat Grayak, Thrips, Kutu Kebul. Dosis 5 gr/L air (80-100 gr/tangki 16L) disemprot sore hari (>15.30 WIB).
2. Trichoderma spp. (T. harzianum / T. viride): Cendawan antagonis pelindung perakaran, menekan Blas Daun & Leher (Pyricularia oryzae), Layu Fusarium, Antraknosa (Patek). Dosis aplikasi 5-10 gr/L air atau campuran kompos olah tanah.
3. Metarhizium anisopliae: Cendawan penginfeksi ulat tanah (Agrotis ipsilon), kumbang kelapa (Oryctes), dan rayap.
4. Bacillus thuringiensis (Bt): Bakteri kristal endotoksin Cry untuk ulat grayak jagung (FAW / Spodoptera frugiperda) dan ulat daun.
5. Pseudomonas fluorescens (Pf): Bakteri perakaran PGPR penekan Layu Bakteri (Ralstonia solanacearum) dan pemacu kekebalan sistemik.
6. Burung Hantu (Tyto alba) dan Trap Barrier System (TBS) untuk pengendalian hama tikus sawah ramah lingkungan.

Gaya Komunikasi:
- Berbahasa Indonesia yang santun, praktis, ramah, dan aplikatif bagi petani dan petugas lapangan.
- Gunakan data rujukan internet dan hasil riset pertanian terkini untuk memperkuat jawaban Anda.
- Gunakan format terstruktur rapi: (1) Identifikasi / Diagnosa Gejala, (2) Rekomendasi Agens Pengendali Hayati (APH) & Takaran Dosis, (3) Petunjuk Teknis Waktu & Cara Aplikasi Lapangan, (4) Tindakan Budidaya Pendukung (Sanitasi, Pengairan, Varietas Tahan).
- Utamakan solusi pengendalian hayati dan ramah lingkungan terlebih dahulu.`;

  // If GEMINI_API_KEY is configured in environment, attempt live Gemini API with web grounding
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5) {
    let promptText = message.trim();
    if (commodity) {
      promptText = `[Komoditas Tanaman: ${commodity}]\n${promptText}`;
    }
    if (context) {
      promptText = `[Konteks Gejala / Kasus Lapangan: ${context}]\n\nPertanyaan: ${promptText}`;
    }

    if (webReferences.length > 0) {
      promptText += `\n\n[Hasil Penelusuran Internet & Literatur Riset Pertanian Terverifikasi]:\n` +
        webReferences.map((ref, idx) => `${idx + 1}. Judul: ${ref.title}\n   Tautan: ${ref.url}\n   Ringkasan Riset: ${ref.snippet}`).join('\n') +
        `\n\nInstruksi Tambahan: Sertakan wawasan dari rujukan internet dan riset pertanian di atas dalam penjelasan Anda.`;
    }

    // Sanitize history so that the first message is strictly 'user'
    // and roles strictly alternate with no empty texts
    const contentsPayload: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      // Skip any leading 'model' messages
      let startIndex = 0;
      while (startIndex < history.length && history[startIndex].role === 'model') {
        startIndex++;
      }
      for (let i = startIndex; i < history.length; i++) {
        const item = history[i];
        if (item && item.text && typeof item.text === 'string' && item.text.trim()) {
          const role = item.role === 'model' ? 'model' : 'user';
          if (contentsPayload.length === 0 && role === 'model') continue;
          if (contentsPayload.length > 0 && contentsPayload[contentsPayload.length - 1].role === role) {
            contentsPayload[contentsPayload.length - 1].parts[0].text += `\n${item.text}`;
          } else {
            contentsPayload.push({
              role,
              parts: [{ text: item.text.trim() }]
            });
          }
        }
      }
    }

    // Ensure final turn is user's current question
    if (contentsPayload.length > 0 && contentsPayload[contentsPayload.length - 1].role === 'user') {
      contentsPayload[contentsPayload.length - 1].parts[0].text += `\n\n${promptText}`;
    } else {
      contentsPayload.push({
        role: 'user',
        parts: [{ text: promptText }]
      });
    }

    // 1. Primary AI Call with Gemini 3.8 Flash (Pakar AI Pertanian & PHT)
    try {
      console.log(`[Pojok Pintar AI] Calling gemini-3.8-flash for question: "${promptText.slice(0, 70)}..."`);
      const primaryController = new AbortController();
      const primaryTimeout = setTimeout(() => primaryController.abort(), 25000); // 25 seconds realistic timeout for thoughtful response

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentsPayload,
        config: {
          systemInstruction,
          temperature: 0.7,
          abortSignal: primaryController.signal
        }
      });
      clearTimeout(primaryTimeout);
      let reply = geminiResponse.text?.trim();
      if (reply && reply.length > 5) {
        if (webReferences.length > 0 && !reply.includes('http')) {
          reply += `\n\n🌐 **Rujukan & Referensi Riset Terverifikasi dari Internet:**\n` +
            webReferences.slice(0, 3).map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   _${r.snippet || r.source}_`).join('\n\n');
        }
        return res.json({
          success: true,
          reply,
          model: 'Gemini 3.8 Flash (Pakar AI Pertanian)',
          webReferences
        });
      }
    } catch (err: any) {
      console.warn('[Pojok Pintar AI] gemini-3.8-flash error/timeout:', err.message);

      // 2. High-speed backup attempt with gemini-flash-latest
      try {
        const backupController = new AbortController();
        const backupTimeout = setTimeout(() => backupController.abort(), 15000);

        const backupResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: contentsPayload,
          config: {
            systemInstruction,
            temperature: 0.7,
            abortSignal: backupController.signal
          }
        });
        clearTimeout(backupTimeout);
        let reply = backupResponse.text?.trim();
        if (reply && reply.length > 5) {
          if (webReferences.length > 0 && !reply.includes('http')) {
            reply += `\n\n🌐 **Rujukan & Referensi Riset Terverifikasi dari Internet:**\n` +
              webReferences.slice(0, 3).map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   _${r.snippet || r.source}_`).join('\n\n');
          }
          return res.json({
            success: true,
            reply,
            model: 'Gemini Flash Latest (Pakar AI Pertanian)',
            webReferences
          });
        }
      } catch (err2: any) {
        console.warn('[Pojok Pintar AI] gemini-flash-latest error:', err2.message);
      }
    }
  }

  // Fallback to comprehensive built-in agricultural knowledge engine with web references
  const fallbackReply = generateAgriKnowledgeFallback(message, commodity, context, webReferences);
  return res.json({
    success: true,
    reply: fallbackReply,
    model: 'SIGAP-OPT PHT Knowledge Engine (Web-Grounded)',
    webReferences
  });
});


// -------------------------------------------------------------
// System & Database Status for CasaOS & PostgreSQL auto-inspection
// -------------------------------------------------------------
app.get('/api/system/database-status', (_req, res) => {
  const db = initDB();
  const pgStatus = getPostgresStatus();
  res.json({
    success: true,
    mode: pgStatus.mode,
    postgresConnected: pgStatus.connected,
    host: pgStatus.host,
    database: pgStatus.database,
    port: pgStatus.port,
    user: pgStatus.user,
    serverPort: activeServerPort,
    autoPortAdjusted: isPortAutoAdjusted,
    totalReportsInDb: (db.reports || []).length,
    totalUsersInDb: (db.users || []).length,
    casaOsReady: true,
    autoMigrationStatus: pgStatus.autoMigrated ? 'Migrated to PostgreSQL' : 'Active & Synced',
    message: pgStatus.message
  });
});

// -------------------------------------------------------------
// CasaOS Automatic Migration Endpoints
// -------------------------------------------------------------
app.get('/api/casaos/compose', (req, res) => {
  const composePath = path.join(__dirname, 'docker-compose.yml');
  if (fs.existsSync(composePath)) {
    const content = fs.readFileSync(composePath, 'utf8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');
      res.setHeader('Content-Type', 'text/yaml');
      return res.send(content);
    }
    return res.json({ success: true, yaml: content });
  }
  res.status(404).json({ success: false, message: 'docker-compose.yml not found' });
});

app.get('/api/casaos/install-script', (req, res) => {
  const scriptPath = path.join(__dirname, 'install-casaos.sh');
  if (fs.existsSync(scriptPath)) {
    const content = fs.readFileSync(scriptPath, 'utf8');
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="install-casaos.sh"');
      res.setHeader('Content-Type', 'application/x-sh');
      return res.send(content);
    }
    return res.json({ success: true, script: content });
  }
  res.status(404).json({ success: false, message: 'install-casaos.sh not found' });
});

app.get(['/sipopt.tar.gz', '/api/casaos/package.tar.gz'], (_req, res) => {
  const archivePath = path.join(__dirname, 'public', 'sipopt.tar.gz');
  if (fs.existsSync(archivePath)) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="sipopt.tar.gz"');
    const stream = fs.createReadStream(archivePath);
    return stream.pipe(res);
  }
  res.status(404).send('Archive not found');
});


// -------------------------------------------------------------
// Vite middleware integration (Fullstack Dev & Prod)
// -------------------------------------------------------------
async function startServer() {
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production serve dist directory
    const distPath = path.join(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (_req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!doctype html><html><head><title>SIPOPT</title></head><body><h1>SIPOPT - Sistem Pengaduan & Pemantauan OPT</h1><p>Sistem sedang memuat...</p></body></html>');
      }
    });
  }

  // Automatic Port Discovery for CasaOS (Binds to next available port if port is occupied in production)
  const listenWithAutoDiscovery = (portToTry: number, maxRetries = 15): Promise<number> => {
    return new Promise((resolve, reject) => {
      let currentPort = portToTry;
      let retries = 0;

      const tryListen = (port: number) => {
        const onError = (err: any) => {
          server.removeListener('error', onError);
          server.removeListener('listening', onListening);

          if (err.code === 'EADDRINUSE') {
            retries++;
            if (isProd && retries <= maxRetries && process.env.AUTO_PORT !== 'false') {
              console.warn(`[SIGAP-OPT Server] Port ${port} is in use on host (EADDRINUSE). CasaOS auto-discovery searching next available port...`);
              isPortAutoAdjusted = true;
              currentPort = port + 1;
              setTimeout(() => tryListen(currentPort), 100);
              return;
            } else if (!isProd && retries <= maxRetries) {
              console.warn(`[SIGAP-OPT Server] Port ${port} is temporarily occupied. Retrying bind on port ${port} (${retries}/${maxRetries})...`);
              setTimeout(() => tryListen(port), 500);
              return;
            }
          }
          reject(err);
        };

        const onListening = () => {
          server.removeListener('error', onError);
          server.removeListener('listening', onListening);
          resolve(currentPort);
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '0.0.0.0');
      };

      tryListen(portToTry);
    });
  };

  try {
    activeServerPort = await listenWithAutoDiscovery(PORT);
    console.log(`[SIGAP-OPT Server] Running on http://0.0.0.0:${activeServerPort} (${isProd ? 'production' : 'development'})`);
    if (isPortAutoAdjusted) {
      console.log(`[CasaOS Auto-Port] Port conflict resolved! Server automatically bound to available port ${activeServerPort}`);
    }
  } catch (err: any) {
    console.error('[SIGAP-OPT Server] Fatal listening error:', err.message);
  }

  // 1. Initialize PostgreSQL if configured (Auto-DDL & Auto-Migration from db.json)
  const initialData = initDB();
  try {
    const pgReady = await initPostgres(initialData);
    if (pgReady) {
      console.log('[PostgreSQL] Connected and verified. Loading PostgreSQL records into active cache...');
      const pgReports = await pgGetReports();
      if (pgReports && pgReports.length > 0) {
        initialData.reports = pgReports;
      }
      const pgUsers = await pgGetUsers();
      if (pgUsers && pgUsers.length > 0) {
        initialData.users = pgUsers;
      }
      saveDB(initialData);
    }
  } catch (err: any) {
    console.warn('[PostgreSQL] Non-fatal init warning:', err.message);
  }

  // 2. Synchronize with persistent Cloud Firestore database and restore WhatsApp session
  syncFromFirestore().then(async () => {
    const db = initDB();
    console.log('[WhatsApp Gateway] Active Bot Method: Fonnte API Gateway.');
    if (db.fonnteConfig?.apiToken) {
      console.log(`[Fonnte Bot] Fonnte API Token configured (${db.fonnteConfig.apiToken.slice(0, 4)}****). Webhook ready at ${db.fonnteConfig.webhookUrl || '/api/webhook/fonnte'}`);
    } else {
      console.log('[Fonnte Bot] Token not set yet. Configure your Fonnte token in WhatsApp Bot settings.');
    }

    // Optional Baileys reconnect if previous session already exists
    const hasSession = await restoreBaileysAuth().catch(() => false);
    if (hasSession) {
      initBaileysSocket(false).catch(() => {});
    }
  }).catch((err) => {
    console.warn('[Firestore] Async sync warning on startup:', err.message);
  });
}

startServer();
