import React, { useState } from 'react';
import {
  BookOpen,
  Bug,
  ShieldCheck,
  Search,
  Sparkles,
  Droplets,
  AlertCircle,
  Leaf
} from 'lucide-react';

export const PhtGuideView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const guides = [
    {
      id: 'wbc',
      commodity: 'Padi Sawah',
      name: 'Wereng Batang Coklat (Nilaparvata lugens)',
      type: 'Hama Utama',
      symptoms: 'Daun menguning mulai dari bagian tepi dan pucuk, pangkal batang kecoklatan berair, terjadi hopperburn (tanaman kering terbakar melingkar) di tengah hamparan.',
      threshold: '1 ekor per rumpun pada tanaman muda (< 40 HST) atau 5 ekor per rumpun pada tanaman fase generatif.',
      biologicalControl: 'Agens hayati jamur entomopatogen Beauveria bassiana atau Metarhizium anisopliae konsentrasi 5 gram/liter air saat sore hari, lestarikan musuh alami laba-laba serigala (Lycosa pseudoannulata).',
      culturalControl: 'Pengeringan sawah berkala (intermittent irrigation) untuk menekan kelembaban mikro hamparan, tanam varietas tahan (Inpari 32, Inpari 42), jangan gunakan pupuk nitrogen (Urea) berlebih.'
    },
    {
      id: 'faw',
      commodity: 'Jagung Hibrida',
      name: 'Ulat Grayak Jagung / Fall Armyworm (Spodoptera frugiperda)',
      type: 'Hama Invasif',
      symptoms: 'Pupus dan titik tumbuh daun jagung robek-robek parah berlubang, terdapat gumpalan kotoran serbuk gergaji (frass) menumpuk tebal di pucuk.',
      threshold: 'Kerusakan pucuk tanaman > 20% pada fase vegetatif.',
      biologicalControl: 'Aplikasi bakteri Bacillus thuringiensis (Bt) atau jamur entomopatogen Beauveria bassiana, pemanfaatan parasitoid telur Trichogramma spp.',
      culturalControl: 'Aplikasi serbuk ekstrak daun mimba atau abu dapur ke dalam titik tumbuh, sanitasi gulma inang, tumpang sari dengan tanaman repelen.'
    },
    {
      id: 'tikus',
      commodity: 'Padi & Palawija',
      name: 'Tikus Sawah (Rattus argentiventer)',
      type: 'Hama Vertebrata',
      symptoms: 'Batang terpotong menyudut 45 derajat berserakan di hamparan, liang aktif banyak ditemukan di pematang primer dan tanggul saluran irigasi.',
      threshold: 'Ada jejak jejak liang aktif sebelum tanam (0 tolerance).',
      biologicalControl: 'Pemanfaatan musuh alami burung hantu (Tyto alba) dengan mendirikan Rubuha (Rumah Burung Hantu) 1 unit per 25-30 Ha.',
      culturalControl: 'Gropyokan massal dan fumigasi/pengemposan belerang saat olah tanah awal musim tanam serempak, pemasangan TBS (Linear Trap Barrier System).'
    },
    {
      id: 'blas',
      commodity: 'Padi Sawah & Gogo',
      name: 'Penyakit Blas Daun & Leher (Pyricularia oryzae)',
      type: 'Penyakit Jamur',
      symptoms: 'Bercak khas berbentuk belah ketupat warna abu-abu di tengah dan tepi coklat keunguan. Pada fase generatif leher malai membusuk patah (blas leher) menyebabkan bulir hampa.',
      threshold: 'Bercak daun muncul pada > 5% rumpun saat pembentukan anakan.',
      biologicalControl: 'Perlakuan benih (seed treatment) dan penyemprotan agens hayati Trichoderma spp. atau Paenibacillus polymyxa.',
      culturalControl: 'Kurangi dosis pupuk Urea saat cuaca basah berkabut, tingkatkan pupuk Kalium (KCl) dan Silika untuk menebalkan dinding sel epidermis daun.'
    },
    {
      id: 'patek',
      commodity: 'Cabai Merah & Rawit',
      name: 'Antraknosa / Patek (Colletotrichum capsici)',
      type: 'Penyakit Jamur',
      symptoms: 'Bercak cekung melingkar kehitaman pada buah cabai tua maupun muda, buah busuk basah dan rontok cepat saat musim hujan.',
      threshold: 'Munculnya buah busuk pertama kali di petakan lahan.',
      biologicalControl: 'Aplikasi bakteri antagonis Pseudomonas fluorescens dan jamur Trichoderma harzianum secara berkala.',
      culturalControl: 'Sanitasi segera petik dan bakar buah yang terserang di luar areal lahan, perbaiki parit bedengan agar tidak tergenang air, tutup bedengan dengan mulsa plastik perak hitam.'
    }
  ];

  const filteredGuides = guides.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.symptoms.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pedoman Pengendalian Hama Terpadu (PHT)</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mb-1">
            Panduan Teknis & Agens Pengendali Hayati (APH)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Rujukan resmi POPT untuk memberikan rekomendasi yang ramah lingkungan, hemat biaya, dan menjaga musuh alami di hamparan sawah/ladang.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari hama, komoditas..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:bg-white focus:text-slate-900 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGuides.map(guide => (
          <div
            key={guide.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {guide.commodity}
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {guide.type}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-2">
                {guide.name}
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <strong className="text-amber-900 block mb-0.5 font-semibold">Gejala Serangan:</strong>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{guide.symptoms}</p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <strong className="text-emerald-900 block mb-0.5 font-semibold flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rekomendasi Agens Hayati (APH):</span>
                  </strong>
                  <p className="text-emerald-950 leading-relaxed text-[11px]">{guide.biologicalControl}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <strong className="text-slate-800 block mb-0.5 font-semibold">Kultur Teknis & Sanitasi:</strong>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{guide.culturalControl}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Ambang Pengendalian (EAP):</span>
              <span className="font-bold text-slate-800">{guide.threshold}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
