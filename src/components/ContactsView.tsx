import React, { useState, useMemo } from 'react';
import {
  BookUser,
  Plus,
  Search,
  Phone,
  Building2,
  MapPin,
  Edit2,
  Trash2,
  MessageCircle,
  Copy,
  Check,
  UserCheck,
  Sprout,
  Users,
  ShieldCheck,
  X,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { WhatsAppContact, ContactCategory, Subdistrict, User } from '../types';

interface ContactsViewProps {
  contacts: WhatsAppContact[];
  subdistricts: Subdistrict[];
  currentUser: User | null;
  onCreateContact: (data: Partial<WhatsAppContact>) => Promise<void>;
  onUpdateContact: (id: string, data: Partial<WhatsAppContact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onRefreshContacts?: () => Promise<void>;
}

const CATEGORY_STYLES: Record<
  ContactCategory,
  { bg: string; border: string; icon: any }
> = {
  'Petani': {
    bg: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
    icon: Sprout
  },
  'Petugas POPT': {
    bg: 'bg-blue-50 text-blue-700',
    border: 'border-blue-200',
    icon: ShieldCheck
  },
  'Koordinator Wilayah': {
    bg: 'bg-indigo-50 text-indigo-700',
    border: 'border-indigo-200',
    icon: UserCheck
  },
  'Camat': {
    bg: 'bg-rose-50 text-rose-700',
    border: 'border-rose-200',
    icon: Building2
  },
  'Koordinator Penyuluh': {
    bg: 'bg-cyan-50 text-cyan-700',
    border: 'border-cyan-200',
    icon: UserCheck
  },
  'Dinas Pertanian': {
    bg: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    icon: Building2
  },
  'PPL / Penyuluh': {
    bg: 'bg-teal-50 text-teal-700',
    border: 'border-teal-200',
    icon: Users
  },
  'Kelompok Tani': {
    bg: 'bg-purple-50 text-purple-700',
    border: 'border-purple-200',
    icon: Users
  },
  'Mitra / Babinsa': {
    bg: 'bg-slate-100 text-slate-700',
    border: 'border-slate-300',
    icon: Building2
  },
  'Lainnya': {
    bg: 'bg-gray-100 text-gray-700',
    border: 'border-gray-200',
    icon: BookUser
  }
};

const ALL_CATEGORIES: ContactCategory[] = [
  'Petani',
  'Petugas POPT',
  'Koordinator Wilayah',
  'Camat',
  'Koordinator Penyuluh',
  'Dinas Pertanian',
  'PPL / Penyuluh',
  'Kelompok Tani',
  'Mitra / Babinsa',
  'Lainnya'
];

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  subdistricts,
  currentUser,
  onCreateContact,
  onUpdateContact,
  onDeleteContact
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WhatsAppContact | null>(null);
  const [deleteTargetContact, setDeleteTargetContact] = useState<WhatsAppContact | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    category: 'Petani' as ContactCategory,
    subdistrict: subdistricts[0]?.name || 'Kota Agung',
    village: '',
    organization: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      category: 'Petani',
      subdistrict: subdistricts[0]?.name || 'Kota Agung',
      village: '',
      organization: '',
      notes: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (contact: WhatsAppContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      category: contact.category,
      subdistrict: contact.subdistrict,
      village: contact.village || '',
      organization: contact.organization || '',
      notes: contact.notes || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nama lengkap wajib diisi');
      return;
    }

    if (!formData.phone.trim()) {
      setFormError('Nomor WhatsApp wajib diisi');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setFormError('Nomor WhatsApp tidak valid (minimal 9 digit angka)');
      return;
    }

    try {
      setIsSaving(true);
      if (editingContact) {
        await onUpdateContact(editingContact.id, formData);
      } else {
        await onCreateContact(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan kontak');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTargetContact) return;
    try {
      setIsSaving(true);
      await onDeleteContact(deleteTargetContact.id);
      setDeleteTargetContact(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Copy Phone Number
  const handleCopyPhone = (contact: WhatsAppContact) => {
    navigator.clipboard.writeText(contact.phone);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format WhatsApp Link
  const getWhatsAppWebUrl = (phone: string, name: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const defaultMsg = encodeURIComponent(
      `Halo ${name}, salam dari SIPOPT Dinas Tanaman Pangan & Hortikultura Kabupaten Tanggamus.`
    );
    return `https://wa.me/${clean}?text=${defaultMsg}`;
  };

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.village && c.village.toLowerCase().includes(q)) ||
        (c.subdistrict && c.subdistrict.toLowerCase().includes(q)) ||
        (c.organization && c.organization.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q));

      // Category match
      const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;

      // Subdistrict match
      const matchSubdistrict = selectedSubdistrict === 'all' || c.subdistrict === selectedSubdistrict;

      return matchQuery && matchCategory && matchSubdistrict;
    });
  }, [contacts, searchQuery, selectedCategory, selectedSubdistrict]);

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const poptCount = contacts.filter(c => c.category === 'Petugas POPT' || c.category === 'Koordinator Wilayah').length;
    const farmerCount = contacts.filter(c => c.category === 'Petani' || c.category === 'Kelompok Tani').length;
    const subdistrictsCovered = new Set(contacts.map(c => c.subdistrict).filter(Boolean)).size;

    return { total, poptCount, farmerCount, subdistrictsCovered };
  }, [contacts]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <BookUser className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Buku Kontak WhatsApp SIPOPT
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Buku Kontak WhatsApp & Direktori Lapangan
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Kelola nomor WhatsApp kontak resmi petugas POPT, koordinator lapangan, kelompok tani (Poktan),
              penyuluh pertanian (PPL), serta petani di 20 kecamatan Kabupaten Tanggamus. Kontak ini otomatis tersedia saat mengirim notifikasi pengaduan OPT.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Kontak WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Kontak</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tersimpan di sistem</div>
          </div>
          <div className="bg-blue-50/50 rounded-2xl p-3.5 border border-blue-100/60">
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">POPT & Koordinator</div>
            <div className="text-2xl font-black text-blue-900 mt-0.5">{stats.poptCount}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Petugas lapangan</div>
          </div>
          <div className="bg-emerald-50/50 rounded-2xl p-3.5 border border-emerald-100/60">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Petani & Poktan</div>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">{stats.farmerCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Masyarakat tani</div>
          </div>
          <div className="bg-purple-50/50 rounded-2xl p-3.5 border border-purple-100/60">
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Kecamatan Tercover</div>
            <div className="text-2xl font-black text-purple-900 mt-0.5">{stats.subdistrictsCovered} / 20</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Wilayah Tanggamus</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp, desa, organisasi, atau catatan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Kategori</option>
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Subdistrict Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubdistrict}
              onChange={e => setSelectedSubdistrict(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Semua Kecamatan</option>
              {subdistricts.map(sd => (
                <option key={sd.id} value={sd.name}>
                  Kec. {sd.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact List View */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
            <BookUser className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tidak ada kontak ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            {searchQuery || selectedCategory !== 'all' || selectedSubdistrict !== 'all'
              ? 'Coba sesuaikan kata kunci pencarian atau reset filter untuk menemukan kontak.'
              : 'Belum ada kontak WhatsApp yang tersimpan. Klik tombol di bawah untuk menambah kontak pertama.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kontak Baru</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Lengkap & Organisasi</th>
                  <th className="py-3.5 px-4">Nomor WhatsApp</th>
                  <th className="py-3.5 px-4">Kategori Peran</th>
                  <th className="py-3.5 px-4">Wilayah Tugas / Domisili</th>
                  <th className="py-3.5 px-4">Catatan / Deskripsi</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredContacts.map(contact => {
                  const catStyle = CATEGORY_STYLES[contact.category] || CATEGORY_STYLES['Lainnya'];
                  const Icon = catStyle.icon;

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Org */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {contact.name}
                        </div>
                        {contact.organization ? (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{contact.organization}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">Perorangan</div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                            {contact.phone}
                          </span>
                          <button
                            onClick={() => handleCopyPhone(contact)}
                            title="Salin Nomor WhatsApp"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            {copiedId === contact.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${catStyle.bg} ${catStyle.border}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{contact.category}</span>
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>Kec. {contact.subdistrict}</span>
                        </div>
                        {contact.village && (
                          <div className="text-[11px] text-slate-500 pl-4">
                            Pekon/Desa {contact.village}
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-xs">
                          {contact.notes || <span className="text-slate-400 italic">-</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat WA Direct */}
                          <a
                            href={getWhatsAppWebUrl(contact.phone, contact.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 shadow-2xs transition-colors"
                            title="Buka Chat WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                            <span className="hidden sm:inline">Chat WA</span>
                          </a>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(contact)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Data Kontak"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTargetContact(contact)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Hapus Kontak"
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

          <div className="bg-slate-50/60 px-4 py-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan <strong>{filteredContacts.length}</strong> dari total <strong>{contacts.length}</strong> kontak WhatsApp
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Tersinkronisasi otomatis dengan Cloud Firestore
            </span>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Kontak */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <BookUser className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingContact ? 'Perbarui Kontak WhatsApp' : 'Tambah Kontak WhatsApp Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingContact
                    ? 'Ubah informasi nomor atau rincian wilayah kontak'
                    : 'Simpan nomor WhatsApp untuk kemudahan notifikasi & monitoring'}
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Catur Jatmiko, S.P. / Pak Supardi"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081273456781 / 62812..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan format diawali 08... atau 628...
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Peran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ContactCategory })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {ALL_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wilayah Kecamatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subdistrict}
                    onChange={e => setFormData({ ...formData, subdistrict: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    {subdistricts.map(sd => (
                      <option key={sd.id} value={sd.name}>
                        {sd.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pekon / Desa
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Soponyono, Sri Kuncoro"
                    value={formData.village}
                    onChange={e => setFormData({ ...formData, village: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organisasi / Instansi / Poktan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Poktan Mawar Makmur, BPP Semaka"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Peran
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Koordinator POPT Kecamatan Wonosobo, siap dihubungi untuk koordinasi Gerdal"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : editingContact ? 'Perbarui Kontak' : 'Simpan Kontak Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTargetContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Hapus Kontak WhatsApp?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Apakah Anda yakin ingin menghapus kontak <strong>{deleteTargetContact.name}</strong> ({deleteTargetContact.phone})?
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetContact(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
