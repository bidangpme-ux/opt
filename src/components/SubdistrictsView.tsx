import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  X,
  UserCheck
} from 'lucide-react';
import { Subdistrict } from '../types';

interface SubdistrictsViewProps {
  subdistricts: Subdistrict[];
  subdistrictCounts: Record<string, number>;
  onCreateSubdistrict: (data: Partial<Subdistrict>) => Promise<void>;
  onUpdateSubdistrict: (id: string, data: Partial<Subdistrict>) => Promise<void>;
  onDeleteSubdistrict: (id: string) => Promise<void>;
}

export const SubdistrictsView: React.FC<SubdistrictsViewProps> = ({
  subdistricts,
  subdistrictCounts,
  onCreateSubdistrict,
  onUpdateSubdistrict,
  onDeleteSubdistrict
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subdistrict | null>(null);

  const [name, setName] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [targetAreaHa, setTargetAreaHa] = useState(1000);
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenAdd = () => {
    setEditingSub(null);
    setName('');
    setCoordinator('');
    setTargetAreaHa(1000);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Subdistrict) => {
    setEditingSub(s);
    setName(s.name);
    setCoordinator(s.coordinator);
    setTargetAreaHa(s.targetAreaHa);
    setDescription(s.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsProcessing(true);
    try {
      if (editingSub) {
        await onUpdateSubdistrict(editingSub.id, {
          name,
          coordinator,
          targetAreaHa,
          description
        });
      } else {
        await onCreateSubdistrict({
          name,
          coordinator,
          targetAreaHa,
          description
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(`Gagal menyimpan data kecamatan: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, subName: string) => {
    if (confirm(`Hapus data kecamatan ${subName}? Laporan terkait tetap tersimpan.`)) {
      await onDeleteSubdistrict(id);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Master Data Wilayah Pertanian - Kabupaten Tanggamus</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Data Master Kecamatan & Koordinator POPT Kab. Tanggamus
          </h2>
          <p className="text-xs text-slate-500">
            Daftar wilayah binaan kecamatan di Kabupaten Tanggamus, target luasan hamparan (Ha), dan petugas koordinator penanggung jawab.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Kecamatan</span>
        </button>
      </div>

      {/* Grid of Subdistricts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subdistricts.map(sub => {
          const attacksCount = subdistrictCounts[sub.name] || 0;
          return (
            <div
              key={sub.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Kec. {sub.name}</h3>
                      <span className="text-[11px] text-slate-500 block">
                        Target Hamparan: <strong>{sub.targetAreaHa} Ha</strong>
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                    {attacksCount} Kasus
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Koordinator: {sub.coordinator}</span>
                  </div>
                  {sub.description && (
                    <p className="text-[11px] text-slate-500 italic mt-1">{sub.description}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(sub)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(sub.id, sub.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Hapus Kecamatan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSub ? `Edit Kecamatan: ${editingSub.name}` : 'Tambah Kecamatan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kecamatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Cimanuk"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Koordinator POPT:
                </label>
                <input
                  type="text"
                  value={coordinator}
                  onChange={e => setCoordinator(e.target.value)}
                  placeholder="Contoh: Budi Santoso, S.P"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Luas Lahan Pertanaman (Ha):
                </label>
                <input
                  type="number"
                  value={targetAreaHa}
                  onChange={e => setTargetAreaHa(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Karakteristik & Keterangan Sentra:
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Contoh: Sentra padi sawah irigasi teknis dan tanaman jagung"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan Kecamatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
