import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Table,
  Layers,
  Building,
  Printer
} from 'lucide-react';
import { Subdistrict, OPTReport } from '../types';

interface ExportExcelViewProps {
  subdistricts: Subdistrict[];
  reports: OPTReport[];
}

export const ExportExcelView: React.FC<ExportExcelViewProps> = ({
  subdistricts,
  reports
}) => {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('all');

  const months = [
    { value: 'all', label: 'Semua Bulan (Setahun Penuh)' },
    { value: '1', label: 'Januari' },
    { value: '2', label: 'Februari' },
    { value: '3', label: 'Maret' },
    { value: '4', label: 'April' },
    { value: '5', label: 'Mei' },
    { value: '6', label: 'Juni' },
    { value: '7', label: 'Juli' },
    { value: '8', label: 'Agustus' },
    { value: '9', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  // Calculate preview data based on selections
  const previewReports = reports.filter(r => {
    const d = new Date(r.dateReported);
    if (selectedYear !== 'all' && d.getFullYear().toString() !== selectedYear) return false;
    if (selectedMonth !== 'all' && (d.getMonth() + 1).toString() !== selectedMonth) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (selectedSubdistrict !== 'all' && r.subdistrict !== selectedSubdistrict) return false;
    return true;
  });

  const totalLuasTerserang = previewReports.reduce((acc, curr) => acc + (Number(curr.areaAffectedHa) || 0), 0);
  const totalLuasTerancam = previewReports.reduce((acc, curr) => acc + (Number(curr.areaThreatenedHa) || 0), 0);

  const downloadUrl = `/api/reports/export-excel?year=${selectedYear}&month=${selectedMonth}&status=${selectedStatus}&subdistrict=${selectedSubdistrict}`;

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-950 via-teal-900 to-emerald-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold mb-3 border border-emerald-500/30">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Format Resmi Microsoft Excel (.xlsx) & CSV</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Pusat Ekspor Laporan Bulanan & Tahunan OPT
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Hasilkan dokumen rekapan resmi Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kabupaten Tanggamus yang terbagi menjadi 2 sheet: <strong>Sheet Ringkasan Eksekutif</strong> untuk pimpinan/kepala dinas dan <strong>Sheet Rincian Laporan Lapangan</strong> lengkap dengan rekomendasi PHT & Gerdal.
          </p>
        </div>

        <a
          href={downloadUrl}
          className="px-6 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs shadow-xl transition-all flex items-center gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Download File Excel (.xlsx)</span>
        </a>
      </div>

      {/* Filter Parameters Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Kriteria Periode & Filter Cetak Laporan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Anggaran / Musim:
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
            >
              <option value="2026">Tahun 2026 (Aktif)</option>
              <option value="2025">Tahun 2025</option>
              <option value="all">Semua Tahun</option>
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bulan Laporan:
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status Penanganan:
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">Semua Status</option>
              <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
              <option value="Sedang Ditinjau Petugas">Sedang Ditinjau Petugas</option>
              <option value="Tindak Lanjut / Gerdal">Tindak Lanjut / Gerdal</option>
              <option value="Selesai">Selesai / Terkendali</option>
            </select>
          </div>

          {/* Subdistrict */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wilayah Kecamatan:
            </label>
            <select
              value={selectedSubdistrict}
              onChange={e => setSelectedSubdistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="all">Semua Kecamatan</option>
              {subdistricts.map(s => (
                <option key={s.id} value={s.name}>
                  Kec. {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Stats Summary for Selected Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-medium block">Total Kasus Terfilter:</span>
            <span className="text-xl font-bold text-slate-900">{previewReports.length} Laporan</span>
          </div>

          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
            <span className="text-[11px] text-rose-600 font-medium block">Luas Terserang:</span>
            <span className="text-xl font-bold text-rose-800">{totalLuasTerserang.toFixed(2)} Ha</span>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <span className="text-[11px] text-amber-600 font-medium block">Luas Terancam:</span>
            <span className="text-xl font-bold text-amber-800">{totalLuasTerancam.toFixed(2)} Ha</span>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <span className="text-[11px] text-emerald-600 font-medium block">Status Selesai:</span>
            <span className="text-xl font-bold text-emerald-800">
              {previewReports.filter(r => r.status === 'Selesai').length} Laporan
            </span>
          </div>
        </div>
      </div>

      {/* Excel Sheet Structure Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              S1
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Sheet 1: Rekapitulasi Eksekutif</h4>
              <p className="text-xs text-slate-500">Ringkasan statistik untuk pimpinan dinas</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Berisi tabel parameter resmi: Periode Laporan, Total Laporan Terdaftar, Total Luas Terserang (Ha), Total Luas Terancam (Ha), Persentase Gerdal Selesai, dan Tanda Tangan Digital Verifikasi.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
              S2
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Sheet 2: Rincian Lengkap Serangan OPT</h4>
              <p className="text-xs text-slate-500">21 kolom data audit trail menyeluruh</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Memuat Nomor Tiket, Tanggal, Petani, No. WA, Kelompok Tani, Desa, Kecamatan, Komoditas, Nama OPT Latin, Luas, Gejala Lapangan, Rekomendasi PHT, Tindakan Gerdal, dan Petugas Verifikator.
          </p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Pratinjau Data yang Akan Masuk File Excel</span>
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {previewReports.length} baris yang siap diunduh
            </p>
          </div>
          <a
            href={downloadUrl}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Sekarang</span>
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">No. Tiket</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Pelapor</th>
                <th className="py-3 px-4">Kecamatan</th>
                <th className="py-3 px-4">Komoditas & OPT</th>
                <th className="py-3 px-4">Terserang</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewReports.slice(0, 10).map(report => (
                <tr key={report.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {report.code}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {new Date(report.dateReported).toLocaleDateString('id-ID')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {report.reporterName}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {report.subdistrict}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{report.pestName}</div>
                    <div className="text-[10px] text-slate-500">{report.commodity}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-rose-700 whitespace-nowrap">
                    {report.areaAffectedHa} Ha
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {report.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                    {report.status}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {report.verifiedBy || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
