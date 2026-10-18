import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Bug,
  Sprout,
  User as UserIcon,
  Phone,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Camera,
  UploadCloud,
  X,
  Image
} from 'lucide-react';
import { Subdistrict, OPTReport, SeverityLevel, PestType } from '../types';
import { api } from '../lib/api';
import { compressImageToTarget, CompressionResult } from '../lib/imageCompressor';

interface ReportFormViewProps {
  subdistricts: Subdistrict[];
  onSubmitSuccess: (report: OPTReport) => void;
  onCancel: () => void;
}

const COMMON_PESTS: { [commodity: string]: { name: string; type: PestType }[] } = {
  'Padi Sawah': [
    { name: 'Wereng Batang Coklat (Nilaparvata lugens)', type: 'Hama' },
    { name: 'Penggerek Batang Padi / Sundep & Beluk (Scirpophaga spp.)', type: 'Hama' },
    { name: 'Tikus Sawah (Rattus argentiventer)', type: 'Hama' },
    { name: 'Penyakit Blas Daun & Leher (Pyricularia oryzae)', type: 'Penyakit' },
    { name: 'Hawar Daun Bakteri / Kresek (Xanthomonas oryzae)', type: 'Penyakit' },
    { name: 'Walang Sangit (Leptocorisa acuta)', type: 'Hama' },
    { name: 'Ulat Grayak (Spodoptera litura)', type: 'Hama' }
  ],
  'Jagung Hibrida': [
    { name: 'Ulat Grayak Jagung / FAW (Spodoptera frugiperda)', type: 'Hama' },
    { name: 'Penyakit Bulai (Peronosclerospora maydis)', type: 'Penyakit' },
    { name: 'Penggerek Tongkol Jagung (Helicoverpa armigera)', type: 'Hama' },
    { name: 'Hawar Daun Jagung (Helminthosporium turcicum)', type: 'Penyakit' }
  ],
  'Cabai Merah': [
    { name: 'Antraknosa / Patek (Colletotrichum capsici)', type: 'Penyakit' },
    { name: 'Kutu Daun / Thrips (Thrips parvispinus)', type: 'Hama' },
    { name: 'Lalat Buah (Bactrocera dorsalis)', type: 'Hama' },
    { name: 'Virus Kuning / Gemini Virus', type: 'Penyakit' },
    { name: 'Layu Bakteri (Ralstonia solanacearum)', type: 'Penyakit' }
  ],
  'Bawang Merah': [
    { name: 'Ulat Grayak Bawang (Spodoptera exigua)', type: 'Hama' },
    { name: 'Penyakit Moler / Layu Fusarium (Fusarium oxysporum)', type: 'Penyakit' },
    { name: 'Bercak Ungu / Alternaria porri', type: 'Penyakit' }
  ],
  'Kedelai': [
    { name: 'Ulat Penggulung Daun (Lamprosema indicata)', type: 'Hama' },
    { name: 'Karat Daun Kedelai (Phakopsora pachyrhizi)', type: 'Penyakit' },
    { name: 'Penggerek Polong (Etiella zinckenella)', type: 'Hama' }
  ]
};

export const ReportFormView: React.FC<ReportFormViewProps> = ({
  subdistricts,
  onSubmitSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    reporterName: '',
    reporterPhone: '',
    reporterAddress: '',
    farmerGroup: '',
    village: '',
    subdistrict: subdistricts[0]?.name || 'Kecamatan Wonosobo',
    district: 'Kabupaten Tanggamus',
    commodity: 'Padi Sawah',
    pestName: 'Wereng Batang Coklat (Nilaparvata lugens)',
    pestType: 'Hama' as PestType,
    areaAffectedHa: 1.0,
    areaThreatenedHa: 3.0,
    severity: 'Sedang' as SeverityLevel,
    plantAgeWeeks: 5,
    symptoms: '',
    photoUrl: '',
    latitude: -5.4988,
    longitude: 104.6225
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrorMessage('');

    try {
      // Automatically compress to <= 300 KB target
      const result = await compressImageToTarget(file, 300, 1440);
      setPhotoPreview(result.dataUrl);
      setCompressionInfo(result);
      setFormData(prev => ({ ...prev, photoUrl: result.dataUrl }));
    } catch (err: any) {
      setErrorMessage('Gagal mengompresi foto: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setCompressionInfo(null);
    setFormData(prev => ({ ...prev, photoUrl: '' }));
  };

  const handleCommodityChange = (comm: string) => {
    const defaultPest = COMMON_PESTS[comm]?.[0];
    setFormData(prev => ({
      ...prev,
      commodity: comm,
      pestName: defaultPest ? defaultPest.name : prev.pestName,
      pestType: defaultPest ? defaultPest.type : prev.pestType
    }));
  };

  const handlePestSelect = (pestName: string) => {
    const pestList = COMMON_PESTS[formData.commodity] || [];
    const found = pestList.find(p => p.name === pestName);
    setFormData(prev => ({
      ...prev,
      pestName,
      pestType: found ? found.type : prev.pestType
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung geolokasi');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFormData(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5))
        }));
        setIsDetectingLocation(false);
      },
      err => {
        alert('Gagal mengambil koordinat GPS: ' + err.message);
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.reporterName.trim()) {
      setErrorMessage('Nama pelapor wajib diisi');
      return;
    }
    if (!formData.village.trim()) {
      setErrorMessage('Nama desa / pekon wajib diisi');
      return;
    }
    if (!formData.subdistrict.trim()) {
      setErrorMessage('Kecamatan wajib dipilih');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.reports.create({
        ...formData,
        evidencePhotos: formData.photoUrl ? [formData.photoUrl] : [],
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude
        }
      });

      if (!res.success) {
        throw new Error(res.message || 'Gagal menyimpan laporan pengaduan');
      }

      onSubmitSuccess(res.report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses laporan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* Title & Info Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1.5">
            <Sprout className="w-3.5 h-3.5" />
            <span>Formulir Pengaduan Cepat & Resmi</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Input Laporan Serangan OPT Lapangan
          </h2>
          <p className="text-xs text-slate-500">
            Laporan otomatis diteruskan ke Petugas POPT wilayah, dicatat di Google Spreadsheets, dan dikonfirmasi via WhatsApp.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 self-start md:self-auto"
        >
          Kembali ke Dashboard
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identitas Pelapor & Kontak */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="w-4 h-4 text-emerald-600" />
            <span>1. Identitas Pelapor & Kelompok Tani</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Pelapor / Petani <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.reporterName}
                onChange={e => setFormData({ ...formData, reporterName: e.target.value })}
                placeholder="Contoh: Bpk. Supardi"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp / HP Aktif
              </label>
              <input
                type="tel"
                value={formData.reporterPhone}
                onChange={e => setFormData({ ...formData, reporterPhone: e.target.value })}
                placeholder="Contoh: 081298765432"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Petani akan menerima pesan konfirmasi & update status via Fonnte Bot.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelompok Tani (Poktan) / Gapoktan
              </label>
              <input
                type="text"
                value={formData.farmerGroup}
                onChange={e => setFormData({ ...formData, farmerGroup: e.target.value })}
                placeholder="Contoh: Poktan Sri Rejeki"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap / Dusun / RT
              </label>
              <input
                type="text"
                value={formData.reporterAddress}
                onChange={e => setFormData({ ...formData, reporterAddress: e.target.value })}
                placeholder="Contoh: Dusun 2 RT 04, Blok Sawah Barat"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Lokasi Serangan Lapangan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>2. Lokasi Wilayah Pertanaman</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kecamatan <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.subdistrict}
                onChange={e => setFormData({ ...formData, subdistrict: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {subdistricts.map(s => (
                  <option key={s.id} value={s.name}>
                    Kecamatan {s.name} ({s.coordinator})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Desa / Kelurahan / Pekon <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={e => setFormData({ ...formData, village: e.target.value })}
                placeholder="Contoh: Pekon Sinar Banten"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kabupaten / Kota
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* GPS Coordinates & Detection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600">Koordinat GPS:</span>
              <span className="font-mono text-emerald-700 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                {formData.latitude}, {formData.longitude}
              </span>
            </div>

            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetectingLocation}
              className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <MapPin className={`w-3.5 h-3.5 ${isDetectingLocation ? 'animate-bounce text-emerald-600' : 'text-slate-500'}`} />
              <span>{isDetectingLocation ? 'Mendeteksi GPS...' : 'Ambil Lokasi Saat Ini'}</span>
            </button>
          </div>
        </div>

        {/* Section 3: Data Serangan & OPT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bug className="w-4 h-4 text-emerald-600" />
            <span>3. Komoditas & Organisme Pengganggu Tanaman (OPT)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Commodity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Komoditas Tanaman <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.commodity}
                onChange={e => handleCommodityChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {Object.keys(COMMON_PESTS).map(comm => (
                  <option key={comm} value={comm}>
                    {comm}
                  </option>
                ))}
                <option value="Hortikultura Lainnya">Hortikultura Lainnya</option>
              </select>
            </div>

            {/* Pest selection or input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis OPT (Hama / Penyakit) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.pestName}
                onChange={e => handlePestSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {(COMMON_PESTS[formData.commodity] || []).map(p => (
                  <option key={p.name} value={p.name}>
                    [{p.type}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Area & Severity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Luas Terserang (Ha) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                required
                value={formData.areaAffectedHa}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormData({
                    ...formData,
                    areaAffectedHa: val,
                    areaThreatenedHa: Number((val * 3).toFixed(1))
                  });
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Luas Terancam (Ha)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.areaThreatenedHa}
                onChange={e => setFormData({ ...formData, areaThreatenedHa: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Kerusakan
              </label>
              <select
                value={formData.severity}
                onChange={e => setFormData({ ...formData, severity: e.target.value as SeverityLevel })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="Ringan">Ringan (&lt; 25%)</option>
                <option value="Sedang">Sedang (25-50%)</option>
                <option value="Berat">Berat (51-85%)</option>
                <option value="Puso">Puso (&gt; 85%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Umur Tanaman (Minggu)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.plantAgeWeeks}
                onChange={e => setFormData({ ...formData, plantAgeWeeks: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
          </div>

          {/* Upload Foto Bukti Serangan (Kamera / Galeri) */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Upload Foto Bukti Serangan (Opsional):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Format JPG, PNG (Maks. 10MB)</span>
            </label>

            {isCompressing ? (
              <div className="p-6 bg-slate-50 border-2 border-emerald-300 rounded-2xl flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-slate-800">
                  Mengompresi foto menjadi ukuran ≤ 300 KB...
                </span>
                <span className="text-[11px] text-slate-500">
                  Mengoptimalkan resolusi dan detail visual tanaman agar hemat memori database
                </span>
              </div>
            ) : photoPreview ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={photoPreview}
                    alt="Preview Bukti"
                    className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500 shadow-xs shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        Foto Berhasil Dikompresi
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                        {compressionInfo?.compressedSizeKB || 280} KB (≤ 300 KB)
                      </span>
                    </div>
                    {compressionInfo && (
                      <p className="text-[11px] text-emerald-800">
                        Hemat ruang <strong>{compressionInfo.compressionRatio}%</strong> (Asli: {compressionInfo.originalSizeKB} KB &rarr; {compressionInfo.compressedSizeKB} KB, Dimensi: {compressionInfo.width}x{compressionInfo.height}px)
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 block">
                      Foto siap disimpan ke database Firestore & Google Sheets
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
                >
                  <X className="w-4 h-4" />
                  <span>Ganti / Hapus</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl cursor-pointer transition-colors group">
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:scale-110 transition-all">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    Klik untuk Unggah Foto atau Ambil dari Kamera HP
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Foto daun menguning, batang busuk, koloni hama, atau hamparan puso
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Field Symptoms */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gejala Kerusakan di Lapangan:
            </label>
            <textarea
              rows={3}
              value={formData.symptoms}
              onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="Deskripsikan penampakan tanaman, warna daun, keberadaan hama, atau pola kerusakan hamparan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Action Button Banner */}
        <div className="p-5 bg-linear-to-r from-emerald-800 to-teal-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="text-xs">
              <div className="font-bold">Laporan Sah & Terverifikasi</div>
              <div className="text-emerald-200 text-[11px]">
                Data langsung tercatat ke Google Spreadsheets dan nomor WhatsApp petani akan dikirimi nomor tiket pengaduan.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Laporan Pengaduan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
