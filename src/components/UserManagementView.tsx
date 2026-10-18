import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Key,
  MapPin,
  Phone,
  Mail,
  X,
  Lock,
  Unlock,
  Check,
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  Download,
  BookOpen,
  MessageSquare,
  Sheet,
  Sprout,
  Info,
  Sparkles
} from 'lucide-react';
import { User, UserRole, TabType, ALL_MENU_TABS, DEFAULT_ROLE_TABS, Subdistrict } from '../types';

interface UserManagementViewProps {
  users: User[];
  currentUser: User | null;
  subdistricts?: Subdistrict[];
  onCreateUser: (data: any) => Promise<void>;
  onUpdateUser: (id: string, data: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

// Icon helper for menu items
const getTabIcon = (tabId: TabType) => {
  switch (tabId) {
    case 'dashboard':
      return LayoutDashboard;
    case 'reports':
      return FileSpreadsheet;
    case 'report-form':
      return PlusCircle;
    case 'export':
      return Download;
    case 'smart-corner':
      return Sparkles;
    case 'guide':
      return BookOpen;
    case 'fonnte':
      return MessageSquare;
    case 'sheets':
      return Sheet;
    case 'subdistricts':
      return MapPin;
    case 'commodities':
      return Sprout;
    case 'users':
      return Users;
    default:
      return Shield;
  }
};

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  subdistricts = [],
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Dedicated Permission Modal state
  const [permissionModalUser, setPermissionModalUser] = useState<User | null>(null);
  const [permissionTabs, setPermissionTabs] = useState<TabType[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const getDefaultRegion = () => {
    if (subdistricts && subdistricts.length > 0) {
      return subdistricts[0].name.startsWith('Kecamatan')
        ? subdistricts[0].name
        : `Kecamatan ${subdistricts[0].name}`;
    }
    return 'Kecamatan Wonosobo';
  };

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'petugas_popt' as UserRole,
    region: getDefaultRegion(),
    password: '',
    status: 'active' as 'active' | 'inactive',
    allowedTabs: DEFAULT_ROLE_TABS['petugas_popt']
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Menus that can be granted to non-admin users (all except 'users' which is strictly admin-only)
  const configurableTabs = ALL_MENU_TABS.filter(t => !t.adminOnly);

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      phone: '',
      role: 'petugas_popt',
      region: getDefaultRegion(),
      password: '',
      status: 'active',
      allowedTabs: DEFAULT_ROLE_TABS['petugas_popt']
    });
    setErrorMessage('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingUser(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    const existingTabs = u.role === 'admin'
      ? DEFAULT_ROLE_TABS['admin']
      : (Array.isArray(u.allowedTabs) ? u.allowedTabs : DEFAULT_ROLE_TABS[u.role]);

    setFormData({
      username: u.username,
      name: u.name,
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      region: u.region,
      password: '',
      status: u.status,
      allowedTabs: existingTabs
    });
    setErrorMessage('');
    setIsAddModalOpen(true);
  };

  // Open Permission Modal
  const handleOpenPermissions = (u: User) => {
    setPermissionModalUser(u);
    if (u.role === 'admin') {
      setPermissionTabs(DEFAULT_ROLE_TABS['admin']);
    } else {
      const tabs = Array.isArray(u.allowedTabs) ? [...u.allowedTabs] : (DEFAULT_ROLE_TABS[u.role] || []);
      setPermissionTabs(tabs);
    }
  };

  const handleTogglePermissionTab = (tabId: TabType) => {
    if (permissionModalUser?.role === 'admin') return; // Admin always has all tabs

    setPermissionTabs(prev => {
      if (prev.includes(tabId)) {
        return prev.filter(t => t !== tabId);
      } else {
        return [...prev, tabId];
      }
    });
  };

  const handleApplyPreset = (preset: 'all' | 'popt' | 'pengamat' | 'minimal') => {
    if (permissionModalUser?.role === 'admin') return;

    switch (preset) {
      case 'all':
        setPermissionTabs(configurableTabs.map(t => t.id));
        break;
      case 'popt':
        setPermissionTabs(DEFAULT_ROLE_TABS['petugas_popt']);
        break;
      case 'pengamat':
        setPermissionTabs(DEFAULT_ROLE_TABS['pengamat']);
        break;
      case 'minimal':
        setPermissionTabs(['dashboard', 'report-form', 'export', 'smart-corner']);
        break;
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionModalUser) return;
    setIsSavingPermissions(true);
    try {
      const finalTabs = permissionModalUser.role === 'admin'
        ? DEFAULT_ROLE_TABS['admin']
        : permissionTabs.filter(t => t !== 'users');

      await onUpdateUser(permissionModalUser.id, { allowedTabs: finalTabs });
      setPermissionModalUser(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan hak akses user');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.username.trim()) {
      setErrorMessage('Nama lengkap dan username wajib diisi');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setErrorMessage('Password awal wajib ditentukan untuk akun baru');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, formData);
      } else {
        await onCreateUser(formData);
      }
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses data user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus user "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await onDeleteUser(id);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus user');
      }
    }
  };

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'petugas_popt':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pengamat':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Helper to count permitted menus for a user
  const getUserPermittedCount = (u: User) => {
    if (u.role === 'admin') return { count: 10, total: 10, isAll: true };
    const tabs = Array.isArray(u.allowedTabs) ? u.allowedTabs : (DEFAULT_ROLE_TABS[u.role] || []);
    return {
      count: tabs.length,
      total: 9,
      isAll: tabs.length >= 9
    };
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200 mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Hak Akses Menu & Role-Based Access Control (RBAC)</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Manajemen Pengguna & Pengaturan Hak Akses
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Administrator dapat mengakses <strong>seluruh menu sistem (10/10)</strong> secara mutlak, serta mengatur izin menu apa saja yang dapat dibuka oleh masing-masing petugas lapangan, penyuluh, maupun pengguna lainnya.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Akun Petugas Baru</span>
        </button>
      </div>

      {/* Access Control Notice Bar */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 p-4 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-700">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900">Aturan Hak Akses Menu Aktif</div>
            <div className="text-slate-500 text-[11px]">
              Klik tombol <strong>"Atur Izin Menu"</strong> pada baris petugas di tabel bawah untuk memilih menu mana saja yang boleh mereka akses.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-bold text-purple-700 shadow-2xs">
            <Shield className="w-3 h-3 text-purple-600" />
            Admin: Akses Semua Menu
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Nama Lengkap & Akun</th>
                <th className="py-3 px-4">Peran / Role</th>
                <th className="py-3 px-4">Hak Akses Menu</th>
                <th className="py-3 px-4">Wilayah Kerja Binaan</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => {
                const access = getUserPermittedCount(u);
                const isUserAdmin = u.role === 'admin';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs border ${
                          isUserAdmin
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isUserAdmin && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${roleBadge(u.role)}`}>
                        {u.role === 'admin' ? 'Administrator' : u.role === 'petugas_popt' ? 'Petugas POPT' : 'Pengamat PPL'}
                      </span>
                    </td>

                    {/* Hak Akses Menu Column */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isUserAdmin ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold text-[11px] border border-purple-200 shadow-2xs">
                          <Shield className="w-3.5 h-3.5 text-purple-600" />
                          <span>Semua Menu (10/10)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            access.count >= 8
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : access.count >= 5
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <Unlock className="w-3 h-3" />
                            <span>{access.count} dari 9 Menu</span>
                          </span>
                          <button
                            onClick={() => handleOpenPermissions(u)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 font-bold text-[10px] border border-slate-200 hover:border-purple-300 transition-colors flex items-center gap-1 shadow-2xs"
                            title="Atur Hak Akses Menu untuk user ini"
                          >
                            <Key className="w-3 h-3 text-purple-600" />
                            <span>Atur Izin</span>
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-[200px] truncate">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.region || '-'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-700">{u.phone || '-'}</div>
                      <div className="text-[10px] text-slate-400">{u.email || '-'}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPermissions(u)}
                          className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200/60"
                          title="Atur Hak Akses Menu"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEDICATED PERMISSION MODAL (Atur Hak Akses Menu User) */}
      {permissionModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-purple-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
                  <Key className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Atur Hak Akses Menu: {permissionModalUser.name}
                  </h3>
                  <p className="text-[11px] text-purple-200 mt-0.5">
                    Role: <strong className="capitalize">{permissionModalUser.role}</strong> &bull; @{permissionModalUser.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPermissionModalUser(null)}
                className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {permissionModalUser.role === 'admin' ? (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-900">
                    <div className="font-bold text-sm mb-1">Administrator Memiliki Hak Akses Penuh</div>
                    <p className="leading-relaxed text-purple-800 text-xs">
                      Sebagai Administrator Dinas, akun ini secara mutlak dapat mengakses seluruh 10 menu sistem (termasuk Manajemen Pengguna & Hak Akses). Hak akses Administrator tidak dapat dibatasi.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Preset Quick Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Pilihan Cepat (Preset Hak Akses):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('all')}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 transition-colors"
                      >
                        Beri Semua Akses (9 Menu)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('popt')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors"
                      >
                        Standar Petugas POPT (8 Menu)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('pengamat')}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 transition-colors"
                      >
                        Standar Pengamat PPL (6 Menu)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('minimal')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
                      >
                        Hanya Pelapor (3 Menu)
                      </button>
                    </div>
                  </div>

                  {/* Checklist of Configurable Menu Tabs */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Daftar Menu Sistem yang Diizinkan:
                        </span>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {permissionTabs.length} dari 9 Menu Dipilih
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
                        {configurableTabs.map(tab => {
                          const Icon = getTabIcon(tab.id);
                          const isChecked = permissionTabs.includes(tab.id);

                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleTogglePermissionTab(tab.id)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isChecked
                                  ? 'bg-purple-50/60 border-purple-300 shadow-2xs'
                                  : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isChecked ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900">{tab.label}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600 font-medium">
                                      {tab.category}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                    {tab.desc}
                                  </p>
                                </div>
                              </div>

                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-purple-600 border-purple-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPermissionModalUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                {permissionModalUser.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingPermissions ? 'Menyimpan...' : 'Simpan Hak Akses Menu'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingUser ? `Edit Akun: ${editingUser.name}` : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso, S.P"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="budi_popt"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password {editingUser ? '(Kosongkan bila tidak diubah)' : <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Password rahasia'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peran / Role:
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      setFormData({
                        ...formData,
                        role: newRole,
                        allowedTabs: newRole === 'admin'
                          ? DEFAULT_ROLE_TABS['admin']
                          : DEFAULT_ROLE_TABS[newRole]
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="admin">Administrator Dinas (Akses Semua Menu)</option>
                    <option value="petugas_popt">Petugas POPT</option>
                    <option value="pengamat">Pengamat PPL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Akun:
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Wilayah Kerja Binaan / Pos Pengamatan <span className="text-emerald-600 font-semibold">(Master Data Kecamatan)</span>:
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Pilih dari Master Data Kecamatan
                    </span>
                  </div>

                  {/* Dropdown Selector from Master Data */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value=""
                      onChange={e => {
                        const selectedVal = e.target.value;
                        if (!selectedVal) return;
                        if (selectedVal === '__ALL__') {
                          setFormData({ ...formData, region: 'Seluruh Wilayah Kab. Tanggamus (Semua Kecamatan)' });
                          return;
                        }
                        const formatted = selectedVal.startsWith('Kecamatan') ? selectedVal : `Kecamatan ${selectedVal}`;
                        const currentList = formData.region
                          ? formData.region.split(',').map(s => s.trim()).filter(Boolean)
                          : [];
                        if (!currentList.includes(formatted)) {
                          const updated = [...currentList, formatted].join(', ');
                          setFormData({ ...formData, region: updated });
                        }
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-emerald-50/70 border border-emerald-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    >
                      <option value="">➕ Klik di sini untuk memilih Kecamatan Binaan...</option>
                      <option value="__ALL__">🌐 Seluruh Wilayah Kab. Tanggamus (Semua Kecamatan)</option>
                      {subdistricts.map(sub => (
                        <option key={sub.id} value={sub.name}>
                          Kecamatan {sub.name.replace(/^Kecamatan\s+/i, '')} {sub.coordinator ? `(Koordinator: ${sub.coordinator})` : ''}
                        </option>
                      ))}
                    </select>

                    {formData.region && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, region: '' })}
                        className="px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-medium transition-colors shrink-0"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>

                  {/* Interactive Quick-Pick Badges from Master Data */}
                  {subdistricts.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="text-[10px] text-slate-600 font-semibold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Pilihan Cepat Master Kecamatan Tanggamus (Klik untuk memilih/membatalkan):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {subdistricts.map(sub => {
                          const subNameClean = sub.name.replace(/^Kecamatan\s+/i, '');
                          const isSelected = formData.region
                            ? formData.region.toLowerCase().includes(subNameClean.toLowerCase())
                            : false;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                const formatted = `Kecamatan ${subNameClean}`;
                                const currentList = formData.region
                                  ? formData.region.split(',').map(s => s.trim()).filter(Boolean)
                                  : [];
                                const exists = currentList.some(item =>
                                  item.toLowerCase().includes(subNameClean.toLowerCase())
                                );
                                let updated: string[];
                                if (exists) {
                                  updated = currentList.filter(
                                    item => !item.toLowerCase().includes(subNameClean.toLowerCase())
                                  );
                                } else {
                                  const filtered = currentList.filter(
                                    item => !item.toLowerCase().includes('lapangan popt')
                                  );
                                  updated = [...filtered, formatted];
                                }
                                setFormData({ ...formData, region: updated.join(', ') });
                              }}
                              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40'
                              }`}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-300'}`}
                              />
                              <span>{subNameClean}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary / Selected Input */}
                  <div>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={e => setFormData({ ...formData, region: e.target.value })}
                      placeholder="Pilih kecamatan di atas..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Wilayah kerja ini menentukan laporan kecamatan binaan yang dipantau petugas.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp / HP:
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0813xxxxxxxx"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Dinas:
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="nama.popt@pertanian.go.id"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Menu Permissions inside Add/Edit Form */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-600" />
                    <span>Hak Akses Menu Sistem</span>
                  </label>
                  {formData.role !== 'admin' && (
                    <span className="text-[11px] font-semibold text-purple-700">
                      {formData.allowedTabs?.length || 0} Menu Diizinkan
                    </span>
                  )}
                </div>

                {formData.role === 'admin' ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Administrator otomatis dapat mengakses <strong>seluruh menu sistem (10/10)</strong>.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {configurableTabs.map(tab => {
                      const isChecked = formData.allowedTabs?.includes(tab.id);
                      return (
                        <label
                          key={tab.id}
                          className={`flex items-center gap-2 p-2 rounded-xl text-[11px] cursor-pointer border transition-colors ${
                            isChecked
                              ? 'bg-purple-50/80 border-purple-300 text-purple-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = formData.allowedTabs || [];
                              const updated = current.includes(tab.id)
                                ? current.filter(t => t !== tab.id)
                                : [...current, tab.id];
                              setFormData({ ...formData, allowedTabs: updated });
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span className="truncate">{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {isProcessing ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
