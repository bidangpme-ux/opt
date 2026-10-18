import { OPTReport, User, FonnteConfig, FonnteLog, SpreadsheetConfig, SyncLog, DashboardStats, Subdistrict, CommodityItem, CommodityCategory, FirebaseStorageStats, BaileysStatus, BaileysLog, WhatsAppContact, DatabaseSystemStatus } from '../types';
import { localFallback } from './localFallback';

const TOKEN_STORAGE_KEY = 'sigap_opt_user_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    // Non-JSON response (e.g., HTML from Vercel rewrite or static server)
    throw new Error('SERVER_NOT_AVAILABLE');
  }

  const text = await response.text();
  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('SERVER_NOT_AVAILABLE');
    }
  } else {
    data = {};
  }

  if (!response.ok) {
    const errorMsg = data && typeof data === 'object' && data.message ? data.message : `HTTP error ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  auth: {
    getMe: async (): Promise<{ authenticated: boolean; user?: User }> => {
      try {
        return await request<{ authenticated: boolean; user: User }>('/api/auth/me');
      } catch {
        return localFallback.auth.getMe(getStoredToken());
      }
    },
    login: async (username: string, password: string): Promise<{ success: boolean; token: string; user: User; message: string }> => {
      try {
        const res = await request<{ success: boolean; token: string; user: User; message: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        if (res.token) {
          setStoredToken(res.token);
        }
        return res;
      } catch (err: any) {
        if (err.message === 'SERVER_NOT_AVAILABLE' || err.message.includes('Failed to fetch')) {
          const res = localFallback.auth.login(username, password);
          if (res.token) setStoredToken(res.token);
          return res;
        }
        throw err;
      }
    },
    logout: async (): Promise<void> => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        localFallback.auth.logout();
      } finally {
        setStoredToken(null);
      }
    }
  },

  stats: {
    get: async (): Promise<DashboardStats> => {
      try {
        const res = await request<{ success: boolean; stats: DashboardStats }>('/api/stats');
        return res.stats;
      } catch {
        return localFallback.stats.get();
      }
    }
  },

  reports: {
    getAll: async (params: { status?: string; commodity?: string; severity?: string; subdistrict?: string; search?: string } = {}): Promise<OPTReport[]> => {
      try {
        const query = new URLSearchParams();
        if (params.status && params.status !== 'all') query.append('status', params.status);
        if (params.commodity && params.commodity !== 'all') query.append('commodity', params.commodity);
        if (params.severity && params.severity !== 'all') query.append('severity', params.severity);
        if (params.subdistrict && params.subdistrict !== 'all') query.append('subdistrict', params.subdistrict);
        if (params.search) query.append('search', params.search);

        const res = await request<{ success: boolean; reports: OPTReport[] }>(`/api/reports?${query.toString()}`);
        return res.reports;
      } catch {
        return localFallback.reports.getAll(params);
      }
    },
    create: async (data: Partial<OPTReport>): Promise<{ success: boolean; message: string; report: OPTReport }> => {
      try {
        return await request('/api/reports', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.reports.create(data);
      }
    },
    update: async (id: string, data: Partial<OPTReport>): Promise<{ success: boolean; message: string; report: OPTReport }> => {
      try {
        return await request(`/api/reports/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.reports.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/reports/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.reports.delete(id);
      }
    },
    notifyWhatsApp: async (id: string, data: {
      targetPhone: string;
      targetName?: string;
      targetRole?: string;
      message: string;
      sendViaBaileys?: boolean;
    }): Promise<{ success: boolean; sentViaBot: boolean; cleanPhone: string; waWebUrl: string; message: string; botError?: string }> => {
      try {
        return await request(`/api/reports/${id}/notify-whatsapp`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch (err: any) {
        let cleanPhone = data.targetPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        const waWebUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(data.message)}`;
        return {
          success: true,
          sentViaBot: false,
          cleanPhone,
          waWebUrl,
          message: 'Tautan WhatsApp telah disiapkan.'
        };
      }
    },
    getExportExcelUrl: (params: { month?: string; year?: string; status?: string; commodity?: string; subdistrict?: string } = {}): string => {
      const query = new URLSearchParams();
      if (params.month) query.append('month', params.month);
      if (params.year) query.append('year', params.year);
      if (params.status) query.append('status', params.status);
      if (params.commodity) query.append('commodity', params.commodity);
      if (params.subdistrict) query.append('subdistrict', params.subdistrict);
      return `/api/reports/export-excel?${query.toString()}`;
    }
  },

  users: {
    getAll: async (): Promise<User[]> => {
      try {
        const res = await request<{ success: boolean; users: User[] }>('/api/users');
        return res.users;
      } catch {
        return localFallback.users.getAll();
      }
    },
    create: async (data: any): Promise<{ success: boolean; message: string; user: User }> => {
      try {
        return await request('/api/users', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.users.create(data);
      }
    },
    update: async (id: string, data: any): Promise<{ success: boolean; message: string; user: User }> => {
      try {
        return await request(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.users.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/users/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.users.delete(id);
      }
    }
  },

  fonnte: {
    getConfig: async (): Promise<FonnteConfig> => {
      try {
        const res = await request<{ success: boolean; config: FonnteConfig }>('/api/fonnte/config');
        return res.config;
      } catch {
        return localFallback.fonnte.getConfig();
      }
    },
    updateConfig: async (config: Partial<FonnteConfig>): Promise<{ success: boolean; message: string; config: FonnteConfig }> => {
      try {
        return await request('/api/fonnte/config', {
          method: 'POST',
          body: JSON.stringify(config)
        });
      } catch {
        return localFallback.fonnte.updateConfig(config);
      }
    },
    getLogs: async (): Promise<FonnteLog[]> => {
      try {
        const res = await request<{ success: boolean; logs: FonnteLog[] }>('/api/fonnte/logs');
        return res.logs;
      } catch {
        return localFallback.fonnte.getLogs();
      }
    },
    simulate: async (data: { senderPhone: string; message: string; senderName?: string }): Promise<{ success: boolean; reply: string }> => {
      try {
        return await request('/api/fonnte/simulate', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.fonnte.simulate(data);
      }
    }
  },

  baileys: {
    getStatus: async (): Promise<BaileysStatus> => {
      try {
        const res = await request<{ success: boolean } & BaileysStatus>('/api/baileys/status');
        return res;
      } catch {
        return {
          status: 'disconnected',
          qrCodeUrl: null,
          userPhone: null,
          userName: null,
          mode: 'baileys_open_source'
        };
      }
    },
    ping: async (): Promise<{ success: boolean; connected: boolean; status: string; userPhone?: string }> => {
      try {
        return await request('/api/baileys/ping');
      } catch (err: any) {
        return { success: false, connected: false, status: 'disconnected' };
      }
    },
    connect: async (reset = false): Promise<{ success: boolean; message: string }> => {
      try {
        return await request('/api/baileys/connect', {
          method: 'POST',
          body: JSON.stringify({ reset })
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Gagal menghubungkan Baileys' };
      }
    },
    disconnect: async (): Promise<{ success: boolean; message: string }> => {
      try {
        return await request('/api/baileys/disconnect', { method: 'POST' });
      } catch (err: any) {
        return { success: false, message: err.message || 'Gagal memutuskan Baileys' };
      }
    },
    testSend: async (targetPhone: string, message: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request('/api/baileys/test-send', {
          method: 'POST',
          body: JSON.stringify({ targetPhone, message })
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Gagal mengirim pesan WhatsApp' };
      }
    },
    getLogs: async (): Promise<BaileysLog[]> => {
      try {
        const res = await request<{ success: boolean; logs: BaileysLog[] }>('/api/baileys/logs');
        return res.logs || [];
      } catch {
        return [];
      }
    },
    simulate: async (data: { senderPhone: string; message: string; senderName?: string }): Promise<{ success: boolean; reply: string }> => {
      try {
        return await request('/api/baileys/simulate', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.fonnte.simulate(data);
      }
    }
  },

  sheets: {
    getConfig: async (): Promise<SpreadsheetConfig> => {
      try {
        const res = await request<{ success: boolean; config: SpreadsheetConfig }>('/api/sheets/config');
        return res.config;
      } catch {
        return localFallback.sheets.getConfig();
      }
    },
    updateConfig: async (config: Partial<SpreadsheetConfig>): Promise<{ success: boolean; message: string; config: SpreadsheetConfig }> => {
      try {
        return await request('/api/sheets/config', {
          method: 'POST',
          body: JSON.stringify(config)
        });
      } catch {
        return localFallback.sheets.updateConfig(config);
      }
    },
    getLogs: async (): Promise<SyncLog[]> => {
      try {
        const res = await request<{ success: boolean; logs: SyncLog[] }>('/api/sheets/logs');
        return res.logs;
      } catch {
        return localFallback.sheets.getLogs();
      }
    },
    syncNow: async (): Promise<{ success: boolean; message: string; totalSynced: number }> => {
      try {
        return await request('/api/sheets/sync', {
          method: 'POST'
        });
      } catch {
        return localFallback.sheets.syncNow();
      }
    },
    getExportCsvUrl: (table?: string): string => {
      return table ? `/api/sheets/export-csv?table=${table}` : '/api/sheets/export-csv';
    },
    getExportAllXlsxUrl: (): string => {
      return '/api/sheets/export-all-xlsx';
    }
  },

  subdistricts: {
    getAll: async (): Promise<Subdistrict[]> => {
      try {
        const res = await request<{ success: boolean; subdistricts: Subdistrict[] }>('/api/subdistricts');
        return res.subdistricts;
      } catch {
        return localFallback.subdistricts.getAll();
      }
    },
    create: async (data: Partial<Subdistrict>): Promise<{ success: boolean; message: string; subdistrict: Subdistrict }> => {
      try {
        return await request('/api/subdistricts', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.subdistricts.create(data);
      }
    },
    update: async (id: string, data: Partial<Subdistrict>): Promise<{ success: boolean; message: string; subdistrict: Subdistrict }> => {
      try {
        return await request(`/api/subdistricts/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.subdistricts.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/subdistricts/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.subdistricts.delete(id);
      }
    }
  },

  commodities: {
    getAll: async (): Promise<CommodityItem[]> => {
      try {
        const res = await request<{ success: boolean; commodities: CommodityItem[] }>('/api/commodities');
        return res.commodities;
      } catch {
        return localFallback.commodities.getAll();
      }
    },
    create: async (data: Partial<CommodityItem>): Promise<{ success: boolean; message: string; commodity: CommodityItem }> => {
      try {
        return await request('/api/commodities', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.commodities.create(data);
      }
    },
    update: async (id: string, data: Partial<CommodityItem>): Promise<{ success: boolean; message: string; commodity: CommodityItem }> => {
      try {
        return await request(`/api/commodities/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.commodities.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/commodities/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.commodities.delete(id);
      }
    }
  },

  commodityCategories: {
    getAll: async (): Promise<CommodityCategory[]> => {
      try {
        const res = await request<{ success: boolean; categories: CommodityCategory[] }>('/api/commodity-categories');
        return res.categories;
      } catch {
        return localFallback.commodityCategories.getAll();
      }
    },
    create: async (data: Partial<CommodityCategory>): Promise<{ success: boolean; message: string; category: CommodityCategory }> => {
      try {
        return await request('/api/commodity-categories', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.commodityCategories.create(data);
      }
    },
    update: async (id: string, data: Partial<CommodityCategory>): Promise<{ success: boolean; message: string; category: CommodityCategory }> => {
      try {
        return await request(`/api/commodity-categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.commodityCategories.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/commodity-categories/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.commodityCategories.delete(id);
      }
    }
  },

  gemini: {
    chat: async (payload: { message: string; history?: { role: 'user' | 'model'; text: string }[]; context?: string; commodity?: string }): Promise<{ success: boolean; reply: string; model: string; webReferences?: { title: string; url: string; snippet?: string; source?: string }[] }> => {
      try {
        return await request<{ success: boolean; reply: string; model: string; webReferences?: { title: string; url: string; snippet?: string; source?: string }[] }>('/api/gemini/agri-chat', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch {
        return localFallback.gemini.chat(payload);
      }
    }
  },

  contacts: {
    getAll: async (): Promise<WhatsAppContact[]> => {
      try {
        const res = await request<{ success: boolean; contacts: WhatsAppContact[] }>('/api/contacts');
        return res.contacts;
      } catch {
        return localFallback.contacts.getAll();
      }
    },
    create: async (data: Partial<WhatsAppContact>): Promise<{ success: boolean; message: string; contact: WhatsAppContact }> => {
      try {
        return await request('/api/contacts', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.contacts.create(data);
      }
    },
    update: async (id: string, data: Partial<WhatsAppContact>): Promise<{ success: boolean; message: string; contact: WhatsAppContact }> => {
      try {
        return await request(`/api/contacts/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } catch {
        return localFallback.contacts.update(id, data);
      }
    },
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        return await request(`/api/contacts/${id}`, {
          method: 'DELETE'
        });
      } catch {
        return localFallback.contacts.delete(id);
      }
    }
  },

  firebase: {
    getStorageStats: async (): Promise<FirebaseStorageStats | null> => {
      try {
        const res = await request<{ success: boolean; stats: FirebaseStorageStats }>('/api/firebase/storage-stats');
        return res.stats;
      } catch {
        const fallbackStats = localFallback.stats.get();
        return fallbackStats.firebaseStorage || null;
      }
    },
    sync: async (): Promise<{ success: boolean; message: string; stats?: FirebaseStorageStats }> => {
      try {
        return await request<{ success: boolean; message: string; stats?: FirebaseStorageStats }>('/api/firebase/sync', {
          method: 'POST'
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Gagal menyinkronkan database' };
      }
    }
  },

  system: {
    getDatabaseStatus: async (): Promise<DatabaseSystemStatus> => {
      try {
        return await request<DatabaseSystemStatus>('/api/system/database-status');
      } catch {
        return {
          mode: 'local_json_firestore',
          postgresConnected: false,
          serverPort: 3000,
          autoPortAdjusted: false,
          totalReportsInDb: 0,
          totalUsersInDb: 0,
          casaOsReady: true,
          autoMigrationStatus: 'Offline Fallback'
        };
      }
    }
  }
};
