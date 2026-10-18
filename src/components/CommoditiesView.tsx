import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  Bug,
  Info,
  Layers,
  X,
  CheckCircle2,
  AlertTriangle,
  Wheat,
  Apple,
  FolderPlus,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { CommodityItem, CommodityCategory } from '../types';

interface CommoditiesViewProps {
  commodities: CommodityItem[];
  categories?: CommodityCategory[];
  onCreateCommodity: (data: Partial<CommodityItem>) => Promise<void>;
  onUpdateCommodity: (id: string, data: Partial<CommodityItem>) => Promise<void>;
  onDeleteCommodity: (id: string) => Promise<void>;
  onCreateCategory?: (data: Partial<CommodityCategory>) => Promise<void>;
  onUpdateCategory?: (id: string, data: Partial<CommodityCategory>) => Promise<void>;
  onDeleteCategory?: (id: string) => Promise<void>;
}

const DEFAULT_CATEGORIES: CommodityCategory[] = [
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
];

const PRESET_ICONS = ['🌾', '🌶️', '☕', '🌿', '🌽', '🍎', '🌸', '🥑', '🌱', '🥕', '🥔', '🥥', '🥦', '🍈'];

export const CommoditiesView: React.FC<CommoditiesViewProps> = ({
  commodities,
  categories = [],
  onCreateCommodity,
  onUpdateCommodity,
  onDeleteCommodity,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CommodityItem | null>(null);

  // Active categories list
  const activeCategories = useMemo(() => {
    return categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  }, [categories]);

  // Commodity Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(activeCategories[0]?.name || 'Tanaman Pangan');
  const [formLatinName, setFormLatinName] = useState('');
  const [formVarieties, setFormVarieties] = useState('');
  const [formPestsText, setFormPestsText] = useState('');
  const [formTargetAreaHa, setFormTargetAreaHa] = useState<number>(1000);
  const [formDescription, setFormDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Category Form states (Add & Edit)
  const [editingCategory, setEditingCategory] = useState<CommodityCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🌱');
  const [catDescription, setCatDescription] = useState('');
  const [catColor, setCatColor] = useState('emerald');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null);
  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  // Filtered list
  const filteredCommodities = useMemo(() => {
    return commodities.filter(item => {
      const matchCat =
        selectedCategory === 'all' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase() ||
        item.category.toLowerCase().includes(selectedCategory.toLowerCase());

      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.latinName && item.latinName.toLowerCase().includes(query)) ||
        (item.varieties && item.varieties.toLowerCase().includes(query)) ||
        (item.commonPests &&
          item.commonPests.some(p => p.toLowerCase().includes(query))) ||
        (item.description && item.description.toLowerCase().includes(query));

      return matchCat && matchSearch;
    });
  }, [commodities, searchTerm, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const total = commodities.length;
    const totalTargetArea = commodities.reduce(
      (sum, c) => sum + (Number(c.targetAreaHa) || 0),
      0
    );

    // Distribution by top categories
    const categoryCounts: Record<string, number> = {};
    commodities.forEach(c => {
      const cat = c.category || 'Lainnya';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return { total, totalTargetArea, categoryCounts };
  }, [commodities]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory(activeCategories[0]?.name || 'Tanaman Pangan');
    setFormLatinName('');
    setFormVarieties('');
    setFormPestsText('');
    setFormTargetAreaHa(1000);
    setFormDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CommodityItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category || activeCategories[0]?.name || 'Tanaman Pangan');
    setFormLatinName(item.latinName || '');
    setFormVarieties(item.varieties || '');
    setFormPestsText(item.commonPests ? item.commonPests.join('\n') : '');
    setFormTargetAreaHa(item.targetAreaHa || 1000);
    setFormDescription(item.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsProcessing(true);
    try {
      const parsedPests = formPestsText
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean);

      const payload: Partial<CommodityItem> = {
        name: formName.trim(),
        category: formCategory.trim(),
        latinName: formLatinName.trim(),
        varieties: formVarieties.trim(),
        commonPests: parsedPests,
        targetAreaHa: Number(formTargetAreaHa) || 0,
        description: formDescription.trim()
      };

      if (editingItem) {
        await onUpdateCommodity(editingItem.id, payload);
      } else {
        await onCreateCommodity(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving commodity:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsProcessing(true);
    try {
      await onDeleteCommodity(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Error deleting commodity:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Category Modal Handlers
  const handleOpenCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('🌱');
    setCatDescription('');
    setCatColor('emerald');
    setCategoryError(null);
    setCategorySuccess(null);
    setIsCategoryModalOpen(true);
  };

  const handleStartEditCategory = (cat: CommodityCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon || '🌱');
    setCatDescription(cat.description || '');
    setCatColor(cat.color || 'emerald');
    setCategoryError(null);
    setCategorySuccess(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIcon('🌱');
    setCatDescription('');
    setCatColor('emerald');
    setCategoryError(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCategoryError('Nama kategori wajib diisi.');
      return;
    }

    setCategoryError(null);
    setCategorySuccess(null);
    setIsProcessing(true);

    try {
      const payload: Partial<CommodityCategory> = {
        name: catName.trim(),
        icon: catIcon.trim() || '🌱',
        description: catDescription.trim(),
        color: catColor
      };

      if (editingCategory) {
        if (onUpdateCategory) {
          await onUpdateCategory(editingCategory.id, payload);
          setCategorySuccess(`Kategori "${payload.name}" berhasil diperbarui.`);
        }
      } else {
        if (onCreateCategory) {
          await onCreateCategory(payload);
          setCategorySuccess(`Kategori "${payload.name}" berhasil ditambahkan.`);
        }
      }

      // Reset form
      setEditingCategory(null);
      setCatName('');
      setCatIcon('🌱');
      setCatDescription('');
    } catch (err: any) {
      setCategoryError(err?.message || 'Gagal menyimpan kategori komoditas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setCategoryError(null);
    setCategorySuccess(null);

    // Check if category is currently used by any commodity
    const count = commodities.filter(c => c.category.toLowerCase() === name.toLowerCase()).length;
    if (count > 0) {
      setCategoryError(`Kategori "${name}" tidak dapat dihapus karena masih digunakan oleh ${count} komoditas. Harap ubah kategori komoditas tersebut terlebih dahulu.`);
      return;
    }

    setIsProcessing(true);
    try {
      if (onDeleteCategory) {
        await onDeleteCategory(id);
        setCategorySuccess(`Kategori "${name}" berhasil dihapus.`);
        setDeleteCategoryConfirmId(null);
      }
    } catch (err: any) {
      setCategoryError(err?.message || 'Gagal menghapus kategori.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryBadge = (catNameString: string) => {
    const c = catNameString.toLowerCase();
    if (c.includes('pangan')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (c.includes('horti') || c.includes('sayur') || c.includes('buah')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (c.includes('kebun') || c.includes('kopi') || c.includes('kakao')) {
      return 'bg-amber-900/10 text-amber-900 border-amber-900/20';
    }
    if (c.includes('obat') || c.includes('biofarmaka') || c.includes('herbal')) {
      return 'bg-teal-100 text-teal-800 border-teal-300';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <Sprout className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold mb-3">
            <Sprout className="w-3.5 h-3.5" />
            <span>Master Data Pertanian & Hortikultura Tanggamus</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Master Data Komoditas Tanaman
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Kelola daftar jenis tanaman pangan, sayuran, perkebunan, dan hortikultura unggulan beserta varietas anjuran, kategori komoditas, serta daftar Organisme Pengganggu Tumbuhan (OPT) sasaran untuk referensi pelaporan lapangan.
          </p>
        </div>

        {/* Action Buttons: Tambah Komoditas Baru & Tambah Kategori Komoditas */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Komoditas Baru</span>
          </button>

          <button
            onClick={handleOpenCategoryModal}
            className="bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 hover:text-white border border-emerald-500/40 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 backdrop-blur-xs"
          >
            <FolderPlus className="w-4 h-4 text-emerald-300" />
            <span>+ Tambah Kategori Komoditas</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Komoditas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-500 mt-1">Jenis tanaman aktif</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kategori Terdaftar
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">{activeCategories.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Klasifikasi komoditas</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pangan & Hortikultura
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Apple className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-700">
            {(stats.categoryCounts['Tanaman Pangan'] || 0) + (stats.categoryCounts['Hortikultura'] || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tanaman pangan utama & buah</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Target Luas Tanam
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalTargetArea.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-slate-500 ml-1">Ha</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Akumulasi musim tanam</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Dynamic Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua ({commodities.length})
          </button>

          {activeCategories.map(cat => {
            const count = commodities.filter(
              c => c.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{cat.icon || '🌱'}</span>
                <span>{cat.name}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}

          {/* Quick link button to open category manager from filter row */}
          <button
            onClick={handleOpenCategoryModal}
            title="Kelola & Tambah Kategori"
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Kategori</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari komoditas, latin, varietas, hama..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-emerald-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Commodities List Cards */}
      {filteredCommodities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Sprout className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">Tidak ada komoditas ditemukan</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `Tidak ada hasil yang sesuai dengan kata kunci "${searchTerm}"`
              : 'Belum ada data komoditas pada kategori ini'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
            >
              Reset pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommodities.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Card: Category & Actions */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadge(
                      c.category
                    )}`}
                  >
                    {c.category}
                  </span>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      title="Edit Komoditas"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(c.id)}
                      title="Hapus Komoditas"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Latin Name */}
                <div className="mb-3">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {c.name}
                  </h3>
                  {c.latinName && (
                    <p className="text-xs italic text-slate-500 font-serif mt-0.5">
                      {c.latinName}
                    </p>
                  )}
                </div>

                {/* Description */}
                {c.description && (
                  <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                    {c.description}
                  </p>
                )}

                {/* Varieties */}
                {c.varieties && (
                  <div className="mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      Varietas Anjuran:
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {c.varieties}
                    </p>
                  </div>
                )}

                {/* Common Pests / OPT */}
                {c.commonPests && c.commonPests.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      <Bug className="w-3 h-3 text-rose-500" />
                      OPT / Hama Utama ({c.commonPests.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.commonPests.map((pest, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium"
                        >
                          {pest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Target Area */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">Target Luas:</span>
                <span className="font-bold text-slate-800">
                  {c.targetAreaHa ? c.targetAreaHa.toLocaleString('id-ID') : 0} Ha
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Commodity */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <Sprout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingItem ? 'Edit Data Komoditas Tanaman' : 'Tambah Komoditas Tanaman Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Master data untuk form pelaporan & panduan PHT
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Komoditas Tanaman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Padi Sawah, Cabai Merah Keriting, Pisang Mas"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Kategori Komoditas <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[10px] text-emerald-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>+ Kategori</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setIsCategoryModalOpen(true);
                      } else {
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                  >
                    {activeCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon || '🌱'} {cat.name}
                      </option>
                    ))}
                    <option value="__NEW__">+ Tambah Kategori Baru...</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Luas Tanam (Ha)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder="1000"
                    value={formTargetAreaHa}
                    onChange={e => setFormTargetAreaHa(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Latin / Ilmiah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Oryza sativa L., Capsicum annuum L."
                  value={formLatinName}
                  onChange={e => setFormLatinName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500 italic"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Varietas Anjuran / Unggulan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Inpari 32, Ciherang, Sintanur, Inpari 42"
                  value={formVarieties}
                  onChange={e => setFormVarieties(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Pisahkan beberapa varietas dengan tanda koma.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Daftar Hama & Penyakit Utama (OPT Sasaran)
                </label>
                <textarea
                  rows={4}
                  placeholder={`Wereng Batang Coklat (Nilaparvata lugens)\nPenggerek Batang Padi (Scirpophaga spp.)\nTikus Sawah (Rattus argentiventer)\nPenyakit Blas Daun (Pyricularia oryzae)`}
                  value={formPestsText}
                  onChange={e => setFormPestsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Tulis satu jenis hama/penyakit per baris baru.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deskripsi / Keterangan Wilayah Sentra
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sentra sawah irigasi teknis di Kec. Cimanuk dan Parungkuda"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Menyimpan...' : editingItem ? 'Perbarui Data' : 'Simpan Komoditas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MANAJEMEN & TAMBAH KATEGORI KOMODITAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Master Kategori Komoditas Tanaman
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tambah dan kelola kelompok tanaman budidaya pertanian & hortikultura
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Alert Feedback */}
              {categoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-snug">{categoryError}</span>
                </div>
              )}

              {categorySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-snug">{categorySuccess}</span>
                </div>
              )}

              {/* Form Tambah / Edit Kategori */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {editingCategory ? 'Edit Kategori Komoditas' : 'Tambah Kategori Komoditas Baru'}
                  </span>
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Icon Selection */}
                    <div className="sm:col-span-1">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Icon Emoji
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={3}
                          value={catIcon}
                          onChange={e => setCatIcon(e.target.value)}
                          className="w-full text-center text-lg py-1.5 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Category Name */}
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Kategori <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Florikultura / Tanaman Hias, Biofarmaka"
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Preset Quick Icons */}
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-medium">
                      Pilih Icon Cepat:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ICONS.map(ico => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setCatIcon(ico)}
                          className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border transition-all cursor-pointer ${
                            catIcon === ico
                              ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400/40'
                              : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {ico}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Description */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Deskripsi Kategori (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Tanaman obat keluarga, rimpang temu-temuan & rempah herbal"
                      value={catDescription}
                      onChange={e => setCatDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-emerald-500 text-xs"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isProcessing || !catName.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Menyimpan...' : editingCategory ? 'Perbarui Kategori' : 'Simpan Kategori Baru'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Daftar Kategori Terdaftar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Daftar Kategori Saat Ini ({activeCategories.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Jumlah komoditas terkait terdata di sebelah kanan
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {activeCategories.map(cat => {
                    const count = commodities.filter(
                      c => c.category.toLowerCase() === cat.name.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            {cat.icon || '🌱'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-800 text-xs">
                                {cat.name}
                              </h5>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                {count} Komoditas
                              </span>
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {cat.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEditCategory(cat)}
                            title="Edit Kategori"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteCategoryConfirmId(cat.id)}
                            title="Hapus Kategori"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deleteCategoryConfirmId && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Hapus Kategori Komoditas?</h4>
            {(() => {
              const catToDelete = activeCategories.find(c => c.id === deleteCategoryConfirmId);
              const count = catToDelete
                ? commodities.filter(c => c.category.toLowerCase() === catToDelete.name.toLowerCase()).length
                : 0;

              return (
                <>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    {count > 0 ? (
                      <span className="text-rose-600 font-semibold">
                        Perhatian: Kategori ini masih digunakan oleh {count} komoditas. Harap ubah kategori komoditas tersebut terlebih dahulu sebelum menghapus.
                      </span>
                    ) : (
                      `Apakah Anda yakin ingin menghapus kategori "${catToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`
                    )}
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setDeleteCategoryConfirmId(null)}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                    {count === 0 && (
                      <button
                        onClick={() => catToDelete && handleDeleteCategory(catToDelete.id, catToDelete.name)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Commodity Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Hapus Komoditas Tanaman?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Apakah Anda yakin ingin menghapus komoditas ini dari master data? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
