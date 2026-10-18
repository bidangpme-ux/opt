import pg from 'pg';
const { Pool } = pg;
import type { OPTReport, User, Subdistrict, WhatsAppContact } from '../types/index.ts';

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export interface PostgresStatus {
  connected: boolean;
  mode: 'postgresql' | 'local_json_firestore';
  host?: string;
  database?: string;
  port?: number;
  user?: string;
  tablesCount?: number;
  autoMigrated?: boolean;
  message: string;
  error?: string;
}

let pool: pg.Pool | null = null;
let isConnected = false;
let hasAutoMigrated = false;
let currentConfigSummary: { host?: string; database?: string; port?: number; user?: string } = {};

/**
 * Resolves PostgreSQL configuration from environment variables or parameters
 */
export function resolvePostgresConfig(customConfig?: PostgresConfig): PostgresConfig | null {
  const connStr = customConfig?.connectionString || 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.PG_URL;

  if (connStr && connStr.trim().length > 0) {
    return { connectionString: connStr.trim() };
  }

  const host = customConfig?.host || process.env.PGHOST || process.env.POSTGRES_HOST;
  const database = customConfig?.database || process.env.PGDATABASE || process.env.POSTGRES_DB;
  const user = customConfig?.user || process.env.PGUSER || process.env.POSTGRES_USER;
  const password = customConfig?.password || process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const port = customConfig?.port || (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : (process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432));

  if (host && database && user) {
    return {
      host,
      port,
      user,
      password: password || '',
      database
    };
  }

  return null;
}

/**
 * Creates and initializes PostgreSQL tables automatically (Zero-Setup Auto-DDL)
 */
async function initializePostgresSchema(client: pg.PoolClient): Promise<void> {
  const ddlStatements = `
    -- 1. App Users (Admin, Petugas POPT, PPL, etc.)
    CREATE TABLE IF NOT EXISTS app_users (
      id VARCHAR(100) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      role VARCHAR(50) NOT NULL DEFAULT 'petugas_popt',
      region VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      password_hash VARCHAR(255),
      allowed_tabs JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. OPT Reports (Laporan Pengaduan Serangan Hama & Penyakit)
    CREATE TABLE IF NOT EXISTS opt_reports (
      id VARCHAR(100) PRIMARY KEY,
      code VARCHAR(100) UNIQUE NOT NULL,
      reporter_name VARCHAR(255) NOT NULL,
      reporter_phone VARCHAR(50),
      farmer_group VARCHAR(255),
      village VARCHAR(255),
      subdistrict VARCHAR(255),
      district VARCHAR(255) DEFAULT 'Kabupaten Tanggamus',
      commodity VARCHAR(255) NOT NULL,
      pest_name VARCHAR(255) NOT NULL,
      pest_type VARCHAR(100) DEFAULT 'Hama',
      severity VARCHAR(50) NOT NULL,
      area_affected_ha NUMERIC(10, 2) DEFAULT 0,
      area_threatened_ha NUMERIC(10, 2) DEFAULT 0,
      plant_age_weeks INT DEFAULT 0,
      symptoms TEXT,
      photo_url TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Verifikasi',
      date_reported TIMESTAMPTZ DEFAULT NOW(),
      verified_by VARCHAR(255),
      verification_notes TEXT,
      recommendation TEXT,
      action_taken TEXT,
      latitude NUMERIC(12, 8),
      longitude NUMERIC(12, 8),
      wa_notification_sent BOOLEAN DEFAULT FALSE,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Master Subdistricts (20 Kecamatan Kab. Tanggamus)
    CREATE TABLE IF NOT EXISTS master_subdistricts (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) UNIQUE NOT NULL,
      coordinator VARCHAR(255),
      target_area_ha NUMERIC(10, 2) DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. Master Commodities (Padi, Jagung, Cabai, dsb.)
    CREATE TABLE IF NOT EXISTS master_commodities (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL,
      latin_name VARCHAR(255),
      varieties TEXT,
      common_pests JSONB DEFAULT '[]'::jsonb,
      target_area_ha NUMERIC(10, 2) DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. Master Commodity Categories
    CREATE TABLE IF NOT EXISTS master_commodity_categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) UNIQUE NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      color VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. WhatsApp Contacts Directory
    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      category VARCHAR(100) NOT NULL,
      subdistrict VARCHAR(150),
      village VARCHAR(150),
      organization VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. App Settings (Fonnte, Google Sheets, WhatsApp Baileys Backup)
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(100) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 8. Activity Logs
    CREATE TABLE IF NOT EXISTS app_logs (
      id VARCHAR(100) PRIMARY KEY,
      log_type VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for fast querying
    CREATE INDEX IF NOT EXISTS idx_opt_reports_status ON opt_reports(status);
    CREATE INDEX IF NOT EXISTS idx_opt_reports_subdistrict ON opt_reports(subdistrict);
    CREATE INDEX IF NOT EXISTS idx_opt_reports_commodity ON opt_reports(commodity);
    CREATE INDEX IF NOT EXISTS idx_opt_reports_date ON opt_reports(date_reported DESC);
  `;

  await client.query(ddlStatements);
}

/**
 * Automatically migrates existing local data into PostgreSQL if PostgreSQL tables are fresh
 */
async function autoMigrateExistingData(client: pg.PoolClient, initialData: any): Promise<void> {
  if (!initialData) return;

  try {
    // 1. Check if users table already has data
    const userCheck = await client.query('SELECT COUNT(*) FROM app_users');
    const userCount = parseInt(userCheck.rows[0].count, 10);

    if (userCount === 0 && Array.isArray(initialData.users) && initialData.users.length > 0) {
      console.log(`[PostgreSQL] Migrating ${initialData.users.length} users into PostgreSQL...`);
      for (const u of initialData.users) {
        await client.query(`
          INSERT INTO app_users (id, username, name, email, phone, role, region, status, password_hash, allowed_tabs, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            allowed_tabs = EXCLUDED.allowed_tabs;
        `, [
          u.id,
          u.username,
          u.name,
          u.email || '',
          u.phone || '',
          u.role || 'petugas_popt',
          u.region || '',
          u.status || 'active',
          u.passwordHash || 'admin123',
          JSON.stringify(u.allowedTabs || []),
          u.createdAt || new Date().toISOString()
        ]);
      }
    }

    // 2. Check if reports table has data
    const reportCheck = await client.query('SELECT COUNT(*) FROM opt_reports');
    const reportCount = parseInt(reportCheck.rows[0].count, 10);

    if (reportCount === 0 && Array.isArray(initialData.reports) && initialData.reports.length > 0) {
      console.log(`[PostgreSQL] Migrating ${initialData.reports.length} reports into PostgreSQL...`);
      for (const r of initialData.reports) {
        await client.query(`
          INSERT INTO opt_reports (
            id, code, reporter_name, reporter_phone, farmer_group, village, subdistrict, district,
            commodity, pest_name, pest_type, severity, area_affected_ha, area_threatened_ha,
            plant_age_weeks, symptoms, photo_url, status, date_reported, verified_by,
            verification_notes, recommendation, action_taken, latitude, longitude,
            wa_notification_sent, raw_data, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
          ) ON CONFLICT (id) DO NOTHING;
        `, [
          r.id,
          r.code,
          r.reporterName || '',
          r.reporterPhone || '',
          r.farmerGroup || '',
          r.village || '',
          r.subdistrict || '',
          r.district || 'Kabupaten Tanggamus',
          r.commodity || '',
          r.pestName || '',
          r.pestType || 'Hama',
          r.severity || 'Sedang',
          r.areaAffectedHa || 0,
          r.areaThreatenedHa || 0,
          r.plantAgeWeeks || 0,
          r.symptoms || '',
          r.photoUrl || '',
          r.status || 'Menunggu Verifikasi',
          r.dateReported || new Date().toISOString(),
          r.verifiedBy || '',
          r.verificationNotes || '',
          r.recommendation || '',
          r.actionTaken || '',
          r.latitude || null,
          r.longitude || null,
          Boolean(r.waNotificationSent),
          JSON.stringify(r),
          r.createdAt || new Date().toISOString(),
          r.updatedAt || new Date().toISOString()
        ]);
      }
    }

    // 3. Check Subdistricts
    const subCheck = await client.query('SELECT COUNT(*) FROM master_subdistricts');
    if (parseInt(subCheck.rows[0].count, 10) === 0 && Array.isArray(initialData.subdistricts)) {
      console.log(`[PostgreSQL] Migrating ${initialData.subdistricts.length} Tanggamus subdistricts...`);
      for (const s of initialData.subdistricts) {
        await client.query(`
          INSERT INTO master_subdistricts (id, name, coordinator, target_area_ha, description)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET coordinator = EXCLUDED.coordinator, target_area_ha = EXCLUDED.target_area_ha;
        `, [s.id, s.name, s.coordinator || '', s.targetAreaHa || 0, s.description || '']);
      }
    }

    // 4. Check Commodities
    const commCheck = await client.query('SELECT COUNT(*) FROM master_commodities');
    if (parseInt(commCheck.rows[0].count, 10) === 0 && Array.isArray(initialData.commodities)) {
      console.log(`[PostgreSQL] Migrating ${initialData.commodities.length} commodities...`);
      for (const c of initialData.commodities) {
        await client.query(`
          INSERT INTO master_commodities (id, name, category, latin_name, varieties, common_pests, target_area_ha, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (name) DO NOTHING;
        `, [c.id, c.name, c.category || '', c.latinName || '', c.varieties || '', JSON.stringify(c.commonPests || []), c.targetAreaHa || 0, c.description || '']);
      }
    }

    // 5. Check WhatsApp Contacts
    const contactCheck = await client.query('SELECT COUNT(*) FROM whatsapp_contacts');
    if (parseInt(contactCheck.rows[0].count, 10) === 0 && Array.isArray(initialData.whatsappContacts)) {
      console.log(`[PostgreSQL] Migrating ${initialData.whatsappContacts.length} WhatsApp contacts...`);
      for (const ct of initialData.whatsappContacts) {
        await client.query(`
          INSERT INTO whatsapp_contacts (id, name, phone, category, subdistrict, village, organization, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING;
        `, [ct.id, ct.name, ct.phone, ct.category || '', ct.subdistrict || '', ct.village || '', ct.organization || '', ct.notes || '']);
      }
    }

    // 6. Settings (Spreadsheets & Fonnte)
    if (initialData.spreadsheetConfig) {
      await client.query(`
        INSERT INTO app_settings (key, data, updated_at)
        VALUES ('spreadsheetConfig', $1, NOW())
        ON CONFLICT (key) DO NOTHING;
      `, [JSON.stringify(initialData.spreadsheetConfig)]);
    }
    if (initialData.fonnteConfig) {
      await client.query(`
        INSERT INTO app_settings (key, data, updated_at)
        VALUES ('fonnteConfig', $1, NOW())
        ON CONFLICT (key) DO NOTHING;
      `, [JSON.stringify(initialData.fonnteConfig)]);
    }

    hasAutoMigrated = true;
    console.log('[PostgreSQL] Auto-Migration complete! All database records successfully synchronized into PostgreSQL.');
  } catch (err: any) {
    console.warn('[PostgreSQL] Auto-migration non-fatal warning:', err.message);
  }
}

/**
 * Initializes PostgreSQL connection pool with auto-discovery and table setup
 */
export async function initPostgres(initialData?: any): Promise<boolean> {
  const config = resolvePostgresConfig();

  if (!config) {
    isConnected = false;
    console.log('[PostgreSQL] No PostgreSQL connection string or host specified (DATABASE_URL/PGHOST).');
    console.log('[PostgreSQL] Running smoothly on persistent Local JSON + Cloud Firestore hybrid engine.');
    console.log('[PostgreSQL] To enable PostgreSQL (e.g. on CasaOS), set DATABASE_URL or POSTGRES_HOST in your environment.');
    return false;
  }

  try {
    const poolConfig: pg.PoolConfig = config.connectionString 
      ? { 
          connectionString: config.connectionString,
          connectionTimeoutMillis: 4000,
          idleTimeoutMillis: 10000,
          max: 15
        }
      : {
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          connectionTimeoutMillis: 4000,
          idleTimeoutMillis: 10000,
          max: 15
        };

    pool = new Pool(poolConfig);

    // Test connection with timeout
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port();');
      const dbInfo = res.rows[0];

      currentConfigSummary = {
        database: dbInfo.current_database,
        user: dbInfo.current_user,
        host: dbInfo.inet_server_addr || config.host || 'localhost',
        port: dbInfo.inet_server_port ? parseInt(dbInfo.inet_server_port, 10) : config.port || 5432
      };

      console.log(`[PostgreSQL] Successfully connected to PostgreSQL database "${dbInfo.current_database}" as user "${dbInfo.current_user}"!`);

      // Initialize DDL tables
      await initializePostgresSchema(client);
      console.log('[PostgreSQL] Database schemas and tables verified (app_users, opt_reports, master_subdistricts, master_commodities, whatsapp_contacts).');

      // Auto-migrate if first-time setup
      if (initialData) {
        await autoMigrateExistingData(client, initialData);
      }

      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    isConnected = false;
    console.warn(`[PostgreSQL] Could not connect to PostgreSQL (${err.message}).`);
    console.warn('[PostgreSQL] Gracefully falling back to persistent Local JSON & Cloud Firestore engine.');
    return false;
  }
}

/**
 * Returns current PostgreSQL connection status
 */
export function getPostgresStatus(): PostgresStatus {
  if (isConnected && pool) {
    return {
      connected: true,
      mode: 'postgresql',
      host: currentConfigSummary.host,
      database: currentConfigSummary.database,
      port: currentConfigSummary.port,
      user: currentConfigSummary.user,
      autoMigrated: hasAutoMigrated,
      message: `Terhubung aktif ke PostgreSQL [${currentConfigSummary.database}@${currentConfigSummary.host}:${currentConfigSummary.port}]`
    };
  }

  return {
    connected: false,
    mode: 'local_json_firestore',
    message: 'PostgreSQL tidak terkonfigurasi. Menggunakan penyimpanan persisten lokal & Cloud Firestore.',
    error: 'DATABASE_URL belum diatur'
  };
}

export function isPostgresActive(): boolean {
  return isConnected && pool !== null;
}

export function getPostgresPool(): pg.Pool | null {
  return pool;
}

// -------------------------------------------------------------
// Live CRUD operations for PostgreSQL
// -------------------------------------------------------------

export async function pgGetReports(): Promise<OPTReport[]> {
  if (!pool || !isConnected) return [];
  const res = await pool.query('SELECT * FROM opt_reports ORDER BY date_reported DESC;');
  return res.rows.map(row => ({
    id: row.id,
    code: row.code,
    reporterName: row.reporter_name,
    reporterPhone: row.reporter_phone,
    farmerGroup: row.farmer_group,
    village: row.village,
    subdistrict: row.subdistrict,
    district: row.district || 'Kabupaten Tanggamus',
    commodity: row.commodity,
    pestName: row.pest_name,
    pestType: (row.pest_type as any) || 'Hama',
    severity: (row.severity as any) || 'Sedang',
    areaAffectedHa: parseFloat(row.area_affected_ha) || 0,
    areaThreatenedHa: parseFloat(row.area_threatened_ha) || 0,
    plantAgeWeeks: parseInt(row.plant_age_weeks, 10) || 0,
    symptoms: row.symptoms,
    photoUrl: row.photo_url,
    status: (row.status as any) || 'Menunggu Verifikasi',
    source: (row.raw_data?.source as any) || 'web',
    dateReported: row.date_reported ? new Date(row.date_reported).toISOString() : new Date().toISOString(),
    verifiedBy: row.verified_by,
    recommendation: row.recommendation,
    actionTaken: row.action_taken,
    syncedToSheets: Boolean(row.raw_data?.syncedToSheets),
    waNotificationSent: Boolean(row.wa_notification_sent),
    location: row.latitude && row.longitude ? { latitude: parseFloat(row.latitude), longitude: parseFloat(row.longitude) } : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  }));
}

export async function pgSaveReport(r: OPTReport): Promise<void> {
  if (!pool || !isConnected) return;
  await pool.query(`
    INSERT INTO opt_reports (
      id, code, reporter_name, reporter_phone, farmer_group, village, subdistrict, district,
      commodity, pest_name, pest_type, severity, area_affected_ha, area_threatened_ha,
      plant_age_weeks, symptoms, photo_url, status, date_reported, verified_by,
      verification_notes, recommendation, action_taken, latitude, longitude,
      wa_notification_sent, raw_data, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
    )
    ON CONFLICT (id) DO UPDATE SET
      reporter_name = EXCLUDED.reporter_name,
      reporter_phone = EXCLUDED.reporter_phone,
      farmer_group = EXCLUDED.farmer_group,
      village = EXCLUDED.village,
      subdistrict = EXCLUDED.subdistrict,
      commodity = EXCLUDED.commodity,
      pest_name = EXCLUDED.pest_name,
      pest_type = EXCLUDED.pest_type,
      severity = EXCLUDED.severity,
      area_affected_ha = EXCLUDED.area_affected_ha,
      area_threatened_ha = EXCLUDED.area_threatened_ha,
      plant_age_weeks = EXCLUDED.plant_age_weeks,
      symptoms = EXCLUDED.symptoms,
      photo_url = EXCLUDED.photo_url,
      status = EXCLUDED.status,
      verified_by = EXCLUDED.verified_by,
      verification_notes = EXCLUDED.verification_notes,
      recommendation = EXCLUDED.recommendation,
      action_taken = EXCLUDED.action_taken,
      wa_notification_sent = EXCLUDED.wa_notification_sent,
      raw_data = EXCLUDED.raw_data,
      updated_at = NOW();
  `, [
    r.id,
    r.code,
    r.reporterName || '',
    r.reporterPhone || '',
    r.farmerGroup || '',
    r.village || '',
    r.subdistrict || '',
    r.district || 'Kabupaten Tanggamus',
    r.commodity || '',
    r.pestName || '',
    r.pestType || 'Hama',
    r.severity || 'Sedang',
    r.areaAffectedHa || 0,
    r.areaThreatenedHa || 0,
    r.plantAgeWeeks || 0,
    r.symptoms || '',
    r.photoUrl || '',
    r.status || 'Menunggu Verifikasi',
    r.dateReported || new Date().toISOString(),
    r.verifiedBy || '',
    '',
    r.recommendation || '',
    r.actionTaken || '',
    r.location?.latitude || null,
    r.location?.longitude || null,
    Boolean(r.waNotificationSent),
    JSON.stringify(r),
    r.dateReported || new Date().toISOString(),
    r.updatedAt || new Date().toISOString()
  ]);
}

export async function pgDeleteReport(id: string): Promise<void> {
  if (!pool || !isConnected) return;
  await pool.query('DELETE FROM opt_reports WHERE id = $1;', [id]);
}

export async function pgGetUsers(): Promise<(User & { passwordHash?: string })[]> {
  if (!pool || !isConnected) return [];
  const res = await pool.query('SELECT * FROM app_users ORDER BY created_at ASC;');
  return res.rows.map(row => ({
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    region: row.region,
    status: row.status,
    passwordHash: row.password_hash,
    allowedTabs: row.allowed_tabs || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  }));
}

export async function pgSaveUser(u: User & { passwordHash?: string }): Promise<void> {
  if (!pool || !isConnected) return;
  await pool.query(`
    INSERT INTO app_users (id, username, name, email, phone, role, region, status, password_hash, allowed_tabs, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      region = EXCLUDED.region,
      status = EXCLUDED.status,
      password_hash = COALESCE(EXCLUDED.password_hash, app_users.password_hash),
      allowed_tabs = EXCLUDED.allowed_tabs,
      updated_at = NOW();
  `, [
    u.id,
    u.username,
    u.name,
    u.email || '',
    u.phone || '',
    u.role,
    u.region || '',
    u.status || 'active',
    u.passwordHash || 'admin123',
    JSON.stringify(u.allowedTabs || []),
    u.createdAt || new Date().toISOString()
  ]);
}

export async function pgDeleteUser(id: string): Promise<void> {
  if (!pool || !isConnected) return;
  await pool.query('DELETE FROM app_users WHERE id = $1;', [id]);
}

export async function pgSaveSetting(key: string, data: any): Promise<void> {
  if (!pool || !isConnected) return;
  await pool.query(`
    INSERT INTO app_settings (key, data, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
  `, [key, JSON.stringify(data)]);
}

export async function pgGetSetting<T = any>(key: string): Promise<T | null> {
  if (!pool || !isConnected) return null;
  const res = await pool.query('SELECT data FROM app_settings WHERE key = $1;', [key]);
  if (res.rows.length === 0) return null;
  return res.rows[0].data as T;
}
