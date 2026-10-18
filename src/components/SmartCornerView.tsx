import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Sprout,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Clock,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  Atom,
  Bug,
  Sun,
  Droplets,
  Globe,
  Bookmark
} from 'lucide-react';
import { api } from '../lib/api';

export interface WebReference {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  model?: string;
  webReferences?: WebReference[];
}

interface AphItem {
  id: string;
  name: string;
  latinName: string;
  category: 'Cendawan Entomopatogen' | 'Jamur Antagonis' | 'Bakteri Protektor' | 'Predator Alami';
  targetOpt: string[];
  crops: string[];
  dosage: string;
  bestTime: string;
  mechanism: string;
  prepNotes: string;
  iconBg: string;
  badgeColor: string;
}

const APH_CATALOG: AphItem[] = [
  {
    id: 'aph-1',
    name: 'Beauveria bassiana',
    latinName: 'Beauveria bassiana (Bals.) Vuill.',
    category: 'Cendawan Entomopatogen',
    targetOpt: [
      'Wereng Batang Coklat (Nilaparvata lugens)',
      'Penggerek Batang Padi (Scirpophaga spp.)',
      'Walang Sangit (Leptocorisa acuta)',
      'Kepik Hijau (Nezara viridula)',
      'Thrips dan Kutu Kebul'
    ],
    crops: ['Padi Sawah', 'Jagung', 'Cabai Merah', 'Kedelai'],
    dosage: '5 gram biakan / liter air (atau 80-100 gram per tangki semprot 16 Liter).',
    bestTime: 'Sore hari (15.30 - 17.30 WIB) saat sinar ultraviolet matahari mereda dan kelembaban meningkat.',
    mechanism: 'Konidia menempel dan berkecambah menembus kutikula serangga. Miselium tumbuh di hemolimfa dan menghasilkan racun beauvericin hingga serangga mati mengeras seperti mumi putih (white muscardine).',
    prepNotes: 'Saring larutan suspensi agar nozel tangki semprot tidak tersumbat. Tambahkan sedikit perekat nabati / air kelapa untuk meningkatkan daya lekat spora.',
    iconBg: 'bg-emerald-500/20 text-emerald-700',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  {
    id: 'aph-2',
    name: 'Trichoderma spp.',
    latinName: 'Trichoderma harzianum / Trichoderma viride',
    category: 'Jamur Antagonis',
    targetOpt: [
      'Penyakit Blas Daun & Leher (Pyricularia oryzae)',
      'Layu Fusarium (Fusarium oxysporum)',
      'Antraknosa / Patek (Colletotrichum capsici)',
      'Hawar Pelepah (Rhizoctonia solani)',
      'Busuk Batang & Akar'
    ],
    crops: ['Padi Sawah', 'Cabai Merah', 'Bawang Merah', 'Tomat', 'Jagung'],
    dosage: '5-10 gr / Liter air untuk semprot kanopi; atau 1-2 kg dicampur 100 kg pupuk kandang matang saat olah tanah.',
    bestTime: 'Aplikasi awal saat olah tanah bedengan, dan semprot rutin pada fase vegetatif awal serta menjelang pembungaan.',
    mechanism: 'Hiperparasitisme melilit dan mencerna hifa jamur patogen melalui enzim kitinase dan glukanase, antibiosis, serta memicu respon pertahanan sistemik (ISR) tanaman.',
    prepNotes: 'Sangat baik diintegrasikan dengan kompos matang untuk memperbanyak koloni di zona perakaran (rizosfer).',
    iconBg: 'bg-teal-500/20 text-teal-700',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  {
    id: 'aph-3',
    name: 'Metarhizium anisopliae',
    latinName: 'Metarhizium anisopliae (Metsch.) Sorokin',
    category: 'Cendawan Entomopatogen',
    targetOpt: [
      'Ulat Tanah (Agrotis ipsilon)',
      'Kumbang Tanduk Kelapa (Oryctes rhinoceros)',
      'Uret / Lundi Tanah (Lepidiota stigma)',
      'Rayap Tanah'
    ],
    crops: ['Padi Ladang', 'Jagung', 'Tebu', 'Kelapa / Sawit', 'Hortikultura'],
    dosage: '5-8 gram biakan padat / liter air disiramkan di sekitar perakaran atau sarang uret.',
    bestTime: 'Sore hari atau saat tanah dalam kondisi lembab setelah hujan.',
    mechanism: 'Menginfeksi serangga melalui kutikula dan memproduksi toksin destruksin. Bangkai serangga terselimuti spora jamur berwarna hijau zaitun khas (green muscardine).',
    prepNotes: 'Dapat diaplikasikan bersama pupuk organik pada lubang tanam untuk proteksi ulat tanah.',
    iconBg: 'bg-lime-500/20 text-lime-700',
    badgeColor: 'bg-lime-50 text-lime-800 border-lime-200'
  },
  {
    id: 'aph-4',
    name: 'Bacillus thuringiensis (Bt)',
    latinName: 'Bacillus thuringiensis Berliner',
    category: 'Bakteri Protektor',
    targetOpt: [
      'Ulat Grayak Jagung / FAW (Spodoptera frugiperda)',
      'Ulat Grayak (Spodoptera litura)',
      'Penggulung Daun Padi (Cnaphalocrocis medinalis)',
      'Ulat Buah Tomat / Cabai (Helicoverpa armigera)',
      'Ulat Daun Kubis (Plutella xylostella)'
    ],
    crops: ['Jagung', 'Padi Sawah', 'Cabai', 'Bawang Merah', 'Sayuran'],
    dosage: '2 - 3 gr atau ml / liter air disemprotkan ke titik tumbuh tanaman.',
    bestTime: 'Sore hari menjelang petang saat larva keluar dari tempat persembunyian untuk makan.',
    mechanism: 'Bakteri menghasilkan kristal protein endotoksin Cry. Saat termakan oleh larva, racun larut di usus tengah ulat beralkalis tinggi, melubangi dinding usus hingga ulat berhenti makan dan mati kelaparan dalam 2-3 hari.',
    prepNotes: 'Sangat aman bagi musuh alami predator dan lebah madu karena toksisitasnya sangat spesifik terhadap ordo Lepidoptera.',
    iconBg: 'bg-indigo-500/20 text-indigo-700',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  {
    id: 'aph-5',
    name: 'Pseudomonas fluorescens (Pf)',
    latinName: 'Pseudomonas fluorescens Migula',
    category: 'Bakteri Protektor',
    targetOpt: [
      'Layu Bakteri (Ralstonia solanacearum)',
      'Hawar Daun Bakteri / Kresek (Xanthomonas oryzae)',
      'Bercak Daun Bakteri',
      'Penyakit Rebah Batang'
    ],
    crops: ['Padi Sawah', 'Cabai Merah', 'Tomat', 'Terung', 'Kentang'],
    dosage: '5 ml biakan cair / liter air untuk perendaman benih selama 12 jam, dan semprot berkala 10 hari sekali.',
    bestTime: 'Aplikasi pagi sebelum terik atau sore hari.',
    mechanism: 'Kolonisasi cepat di rizosfer, memproduksi antibiotik 2,4-diacetylphloroglucinol (DAPG), siderofor pengikat zat besi, serta hormon auksin perangsang akar (PGPR).',
    prepNotes: 'Dapat dicampur bersamaan dengan aplikasi biakan Trichoderma pada media persemaian.',
    iconBg: 'bg-sky-500/20 text-sky-700',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200'
  },
  {
    id: 'aph-6',
    name: 'Burung Hantu (Tyto alba)',
    latinName: 'Tyto alba javanica (Gmelin)',
    category: 'Predator Alami',
    targetOpt: [
      'Tikus Sawah (Rattus argentiventer)',
      'Tikus Pohon / Belukar'
    ],
    crops: ['Padi Sawah Irigasi & Tadah Hujan', 'Sentra Jagung'],
    dosage: '1 unit Rumah Burung Hantu (Rubuha) per 5-10 Hektar hamparan sawah terbuka.',
    bestTime: 'Aktif berburu di malam hari (nokturnal).',
    mechanism: 'Predasi alami aktif. Sepasang burung hantu mampu membunuh 3-5 ekor tikus setiap malam tanpa meninggalkan residu racun antikoagulan.',
    prepNotes: 'Dirikan Rubuha setinggi minimal 4-5 meter di atas pematang sawah utama, hindari kebisingan berlebih dan larang penggunaan racun tikus keras yang dapat menyebabkan keracunan sekunder pada burung hantu.',
    iconBg: 'bg-amber-500/20 text-amber-700',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
  }
];

export const SmartCornerView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'diagnose' | 'aph-catalog' | 'sop'>('chat');
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'model',
      text: `👋 **Selamat Datang di Pojok Pintar SIGAP-OPT!**\n\nSaya adalah **Konsultan Pertanian & Pengendalian Hama Terpadu (PHT) berbasis Gemini AI** untuk Dinas Pertanian.\n\nSaya siap membantu Anda seputar:\n- 🐛 **Diagnosa Cepat Hama & Penyakit** tanaman pangan & hortikultura\n- 🌿 **Panduan Agens Pengendali Hayati (APH)** (Beauveria, Trichoderma, Metarhizium, Bt, Pf)\n- 📏 **Takaran Dosis & Waktu Aplikasi** penyemprotan ramah lingkungan\n- 🌾 **Strategi PHT & Manajemen Budidaya Sehat**\n\nSilakan pilih topik cepat di bawah atau ketik pertanyaan langsung di kolom chat!`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('Semua Komoditas');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Diagnostic form state
  const [diagCrop, setDiagCrop] = useState('Padi Sawah');
  const [diagPlantPart, setDiagPlantPart] = useState('Daun');
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagResult, setDiagResult] = useState<string | null>(null);
  const [isDiagLoading, setIsDiagLoading] = useState(false);

  // APH Catalog state
  const [aphFilter, setAphFilter] = useState<string>('Semua');
  const [aphSearch, setAphSearch] = useState<string>('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSubTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Filter out welcome message and ensure history starts with user role
      const validHistory = messages
        .filter(m => m.id !== 'msg-welcome' && m.text && m.text.trim())
        .slice(-6)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      const res = await api.gemini.chat({
        message: text,
        commodity: selectedCommodity !== 'Semua Komoditas' ? selectedCommodity : undefined,
        history: validHistory
      });

      const modelMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        model: res.model,
        webReferences: res.webReferences
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch {
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: 'Maaf, terjadi kendala saat menghubungkan ke mesin Gemini AI. Silakan coba kembali sesaat lagi.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setActiveSubTab('chat');
    handleSendMessage(question);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagSymptoms.trim() || isDiagLoading) return;

    setIsDiagLoading(true);
    setDiagResult(null);

    const prompt = `Analisa Diagnosa Gejala Lapangan:
Komoditas: ${diagCrop}
Bagian Tanaman yang Terkena: ${diagPlantPart}
Deskripsi Gejala Kerusakan: "${diagSymptoms}"

Berikan diagnosa komprehensif:
1. Kemungkinan Organisme Pengganggu Tanaman (Hama / Penyakit) yang Menyerang
2. Tingkat Kegawatan & Potensi Dampak
3. Rekomendasi Pengendalian dengan Agens Pengendali Hayati (APH) & Dosis Tepat
4. Tindakan Sanitasi / Budidaya Pendukung Segera`;

    try {
      const res = await api.gemini.chat({
        message: prompt,
        commodity: diagCrop,
        context: `Diagnosa gejala tanaman bagian ${diagPlantPart}`
      });
      setDiagResult(res.reply);
    } catch {
      setDiagResult('Gagal memproses diagnosa AI. Silakan ulangi kembali.');
    } finally {
      setIsDiagLoading(false);
    }
  };

  const filteredAphList = APH_CATALOG.filter(item => {
    const matchesCategory = aphFilter === 'Semua' || item.category === aphFilter;
    const matchesSearch = !aphSearch ||
      item.name.toLowerCase().includes(aphSearch.toLowerCase()) ||
      item.latinName.toLowerCase().includes(aphSearch.toLowerCase()) ||
      item.targetOpt.some(t => t.toLowerCase().includes(aphSearch.toLowerCase())) ||
      item.crops.some(c => c.toLowerCase().includes(aphSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner Pojok Pintar */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-purple-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
              <span>Ditenagai Gemini 3.8 Flash Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-300">Pakar PHT Lapangan</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Pojok Pintar Pertanian</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                AI + APH
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed">
              Konsultan cerdas berbasis <strong>Gemini AI</strong> seputar dunia pertanian, diagnosa cepat gejala serangan hama & penyakit, serta katalog resmi <strong>Panduan Teknis & Agens Pengendali Hayati (APH)</strong> Dinas Pertanian.
            </p>
          </div>

          {/* Quick Stats or Engine Badge */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-200">
                <Atom className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white">Konsultasi Interaktif 24/7</div>
                <div className="text-[11px] text-purple-200">Ramah Lingkungan & PHT</div>
              </div>
            </div>
            <div className="text-[11px] text-emerald-300/90 font-medium flex items-center gap-1.5 pt-2 border-t border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standar Rekomendasi POPT Kementan</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'chat', label: '💬 Tanya Jawab AI Pertanian', desc: 'Chat Interaktif' },
            { id: 'diagnose', label: '🔬 Diagnosa Cepat Gejala', desc: 'Analisa Hama' },
            { id: 'aph-catalog', label: '🌿 Katalog Agens Hayati (APH)', desc: 'Beauveria, Trichoderma, dll' },
            { id: 'sop', label: '📋 SOP Waktu & Aplikasi', desc: 'Standar PHT' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: TANYA JAWAB AI PERTANIAN (CHAT)                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Quick Prompts & Commodity Filter */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filter Komoditas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span>Konteks Komoditas Tanaman:</span>
              </label>
              <select
                value={selectedCommodity}
                onChange={e => setSelectedCommodity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium text-slate-800"
              >
                <option value="Semua Komoditas">Semua Komoditas Tanaman</option>
                <option value="Padi Sawah">Padi Sawah (Ciherang, Inpari, dll)</option>
                <option value="Jagung Hibrida">Jagung Hibrida (BISI, NK, Pioneer)</option>
                <option value="Cabai Merah Keriting">Cabai Merah Keriting / Rawit</option>
                <option value="Bawang Merah">Bawang Merah (Bima, Tajuk)</option>
                <option value="Tomat">Tomat (Servo, Tymoti)</option>
                <option value="Kedelai">Kedelai & Kacang-kacangan</option>
                <option value="Kopi Robusta">Kopi Robusta & Kakao</option>
                <option value="Pisang">Pisang Mas Tanggamus / Cavendish</option>
              </select>
              <p className="text-[11px] text-slate-400 leading-normal">
                Pilih komoditas agar respon AI secara spesifik disesuaikan dengan fase tumbuh dan karakter hama tanaman tersebut.
              </p>
            </div>

            {/* Quick Questions Chips */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Pertanyaan Populer:</span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    q: 'Bagaimana cara dan dosis aplikasi Beauveria bassiana untuk wereng batang coklat?',
                    tag: 'Wereng Padi'
                  },
                  {
                    q: 'Kapan waktu terbaik menyemprot Trichoderma untuk penyakit blas daun padi?',
                    tag: 'Blas / Jamur'
                  },
                  {
                    q: 'Bagaimana mengendalikan ulat grayak jagung (FAW) dengan Bacillus thuringiensis?',
                    tag: 'Ulat Jagung'
                  },
                  {
                    q: 'Apa solusi alami penyakit patek antraknosa pada cabai merah di musim hujan?',
                    tag: 'Antraknosa Cabai'
                  },
                  {
                    q: 'Bagaimana cara mendirikan Rubuha burung hantu Tyto alba untuk hama tikus sawah?',
                    tag: 'Tikus Sawah'
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(item.q)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 border border-slate-200/80 hover:border-purple-200 transition-all text-xs group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 font-semibold group-hover:bg-purple-200/70 group-hover:text-purple-800">
                        {item.tag}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span className="line-clamp-2 leading-relaxed">{item.q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Chat History & Input */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Asisten Ahli PHT & Pertanian</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Konteks: <strong className="text-purple-700">{selectedCommodity}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span>Penelusuran Internet & Kementan Aktif</span>
                </span>
                <button
                  onClick={() => setMessages([messages[0]])}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors flex items-center gap-1"
                  title="Bersihkan riwayat percakapan"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Chat</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map(m => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isUser
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs relative group ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {m.text}
                      </div>

                      {/* Web References Cards */}
                      {!isUser && m.webReferences && m.webReferences.length > 0 && (
                        <div className="mt-3.5 pt-3 border-t border-slate-200 space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                            <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Rujukan Terverifikasi dari Internet & Riset Pertanian:</span>
                          </div>
                          <div className="space-y-1.5">
                            {m.webReferences.map((ref, idx) => (
                              <a
                                key={idx}
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-[11px] group/ref shadow-2xs"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-semibold text-slate-900 group-hover/ref:text-indigo-600 line-clamp-1">
                                    {ref.title}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover/ref:text-indigo-600 shrink-0 mt-0.5" />
                                </div>
                                {ref.snippet && (
                                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                    {ref.snippet}
                                  </p>
                                )}
                                <div className="mt-1 flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    {ref.source || 'internet'}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        className={`flex items-center justify-between mt-2 pt-1 border-t text-[10px] ${
                          isUser ? 'border-emerald-500/40 text-emerald-100' : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{m.timestamp}</span>
                          {m.model && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 font-mono">
                              {m.model}
                            </span>
                          )}
                        </div>

                        {!isUser && (
                          <button
                            onClick={() => handleCopyText(m.text, m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-700 flex items-center gap-1 font-medium"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl rounded-tl-xs p-4 text-xs flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    <span className="text-[11px] text-slate-600 font-medium ml-1">
                      Menelusuri referensi internet & merumuskan rekomendasi PHT terpercaya...
                    </span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Ketik pertanyaan seputar hama, dosis Beauveria, Trichoderma, atau masalah tanaman..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-slate-900 placeholder:text-slate-400"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kirim</span>
                </button>
              </form>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                <span>Tips: Masukkan nama komoditas dan gejala untuk diagnosa yang lebih presisi.</span>
                <span className="font-mono">Model: gemini-3.8-flash</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DIAGNOSA CEPAT GEJALA TANAMAN                                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'diagnose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input Gejala */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-600" />
                <span>Form Diagnosa Gejala Lapangan</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Masukkan ciri fisik kerusakan tanaman Anda untuk dianalisa langsung oleh Gemini AI.
              </p>
            </div>

            <form onSubmit={handleDiagnose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Komoditas Tanaman:
                </label>
                <select
                  value={diagCrop}
                  onChange={e => setDiagCrop(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
                >
                  <option value="Padi Sawah">Padi Sawah</option>
                  <option value="Padi Ladang / Gogo">Padi Ladang / Gogo</option>
                  <option value="Jagung Hibrida">Jagung Hibrida</option>
                  <option value="Cabai Merah Keriting">Cabai Merah Keriting</option>
                  <option value="Cabai Rawit">Cabai Rawit</option>
                  <option value="Bawang Merah">Bawang Merah</option>
                  <option value="Tomat">Tomat</option>
                  <option value="Kedelai">Kedelai</option>
                  <option value="Pisang">Pisang</option>
                  <option value="Kopi Robusta">Kopi Robusta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bagian Tanaman yang Terkena:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Daun', 'Batang / Rumpun', 'Buah / Malai / Bulir', 'Akar / Pangkal'].map(part => (
                    <button
                      type="button"
                      key={part}
                      onClick={() => setDiagPlantPart(part)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                        diagPlantPart === part
                          ? 'bg-purple-50 text-purple-900 border-purple-300 font-bold shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {part}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Ciri & Gejala Serangan:
                </label>
                <textarea
                  rows={4}
                  required
                  value={diagSymptoms}
                  onChange={e => setDiagSymptoms(e.target.value)}
                  placeholder="Contoh: Daun bagian bawah menguning kecoklatan seperti terbakar melingkar, rumpun padi basah di pangkalnya, terlihat bintik coklat bergerombol..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              {/* Sample presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                  Contoh Gejala Cepat:
                </label>
                <div className="space-y-1.5">
                  {[
                    { text: 'Daun menguning tepi, pangkal batang basah, hopperburn melingkar', crop: 'Padi Sawah', part: 'Batang / Rumpun' },
                    { text: 'Pucuk daun muda jagung berlubang robek, ada tumpukan kotoran gergaji', crop: 'Jagung Hibrida', part: 'Daun' },
                    { text: 'Bercak belah ketupat abu-abu kecoklatan pada helaian daun bagian atas', crop: 'Padi Sawah', part: 'Daun' },
                    { text: 'Buah cabai membusuk dengan bercak melingkar cekung warna hitam konsentris', crop: 'Cabai Merah Keriting', part: 'Buah / Malai / Bulir' }
                  ].map((s, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setDiagCrop(s.crop);
                        setDiagPlantPart(s.part);
                        setDiagSymptoms(s.text);
                      }}
                      className="w-full text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 truncate border border-slate-200/70"
                    >
                      &bull; {s.text}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!diagSymptoms.trim() || isDiagLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isDiagLoading ? (
                  <>
                    <Bot className="w-4 h-4 animate-spin" />
                    <span>Menganalisa dengan Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analisa Gejala dengan Gemini AI</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Hasil Diagnosa Card */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Laporan Hasil Diagnosa Cerdas</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Rekomendasi tindakan terpadu dan Agens Pengendali Hayati (APH)
                  </p>
                </div>

                {diagResult && (
                  <button
                    onClick={() => handleCopyText(diagResult, 'diag')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-900 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedId === 'diag' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'diag' ? 'Tersalin' : 'Salin Diagnosa'}</span>
                  </button>
                )}
              </div>

              {isDiagLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center animate-bounce">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">
                    Memproses Analisis Gejala Tanaman...
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Gemini AI sedang mencocokkan ciri kerusakan fisik dengan database patogen dan hama PHT untuk menghasilkan takaran Agens Hayati yang tepat.
                  </p>
                </div>
              ) : diagResult ? (
                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                  {diagResult}
                </div>
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <div className="w-14 h-14 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Search className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-700">
                    Belum Ada Analisa yang Dijalankan
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Pilih komoditas, bagian tanaman, dan deskripsikan gejala di formulir sebelah kiri untuk mendapatkan diagnosa instan dari Gemini AI.
                  </p>
                </div>
              )}
            </div>

            {diagResult && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                  Ingin bertanya lebih lanjut seputar diagnosa ini?
                </span>
                <button
                  onClick={() => {
                    setActiveSubTab('chat');
                    handleSendMessage(`Tindak lanjut dari diagnosa gejala ${diagCrop} (${diagSymptoms}): Bagaimana langkah pencegahannya untuk musim tanam berikutnya?`);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold border border-purple-200 transition-colors flex items-center gap-1.5"
                >
                  <span>Lanjutkan Tanya Jawab di AI Chat &rarr;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: KATALOG ENSIKLOPEDIA AGENS PENGENDALI HAYATI (APH)              */}
      {/* ========================================================================= */}
      {activeSubTab === 'aph-catalog' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                'Semua',
                'Cendawan Entomopatogen',
                'Jamur Antagonis',
                'Bakteri Protektor',
                'Predator Alami'
              ].map(cat => (
                <button
                  key={cat}
                  onClick={() => setAphFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    aphFilter === cat
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={aphSearch}
                onChange={e => setAphSearch(e.target.value)}
                placeholder="Cari agens, hama sasaran, tanaman..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* APH Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAphList.map(aph => (
              <div
                key={aph.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${aph.badgeColor}`}>
                        {aph.category}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-purple-700 transition-colors">
                        {aph.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 italic font-serif">
                        {aph.latinName}
                      </div>
                    </div>

                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${aph.iconBg}`}>
                      <Bug className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Target OPT Tags */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Target Hama & Penyakit Sasaran:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aph.targetOpt.map((opt, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                        >
                          &bull; {opt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dosis & Waktu Aplikasi */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Dosis Rekomendasi:</span>
                      <span className="text-slate-900 font-bold">{aph.dosage}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Waktu Semprot Terbaik:</span>
                      <span className="text-emerald-700 font-medium">{aph.bestTime}</span>
                    </div>
                  </div>

                  {/* Mechanism */}
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800">Cara Kerja: </span>
                    {aph.mechanism}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {aph.crops.slice(0, 2).join(', ')}
                  </span>

                  <button
                    onClick={() => {
                      setActiveSubTab('chat');
                      handleSendMessage(`Jelaskan secara mendalam tentang ${aph.name} (${aph.latinName}), cara perbanyakan sendiri dengan media beras/jagung, dan takaran aplikasi di lapangan.`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs border border-purple-200 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tanya AI tentang APH Ini</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: SOP STANDAR PHT & WAKTU APLIKASI                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'sop' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Waktu & Syarat Lingkungan Aplikasi APH</h3>
                <p className="text-[11px] text-slate-500">Kunci efektivitas spora dan bakteri hayati di hamparan</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">1. Mengapa Wajib Sore Hari (&gt; 15.30 WIB)?</span>
                <p>
                  Konidia cendawan (*Beauveria*, *Trichoderma*, *Metarhizium*) dan kristal protein *Bacillus thuringiensis* sangat rentan terhadap radiasi ultraviolet (UV) sinar matahari langsung. Radiasi UV dapat merusak DNA dan mematikan spora sebelum sempat berkecambah.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">2. Kelembaban Relatif (RH &gt; 70%)</span>
                <p>
                  Spora cendawan entomopatogen membutuhkan mikroklimat lembab pada malam hari untuk membentuk tabung kecambah (*germ tube*) dan menembus lapisan kitin kulit serangga.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">3. Arah Semprotan yang Tepat</span>
                <p>
                  Untuk hama Wereng Batang Coklat (WBC), semprotan harus diarahkan ke <strong>pangkal rumpun padi</strong>, bukan di atas kanopi daun. Untuk ulat grayak jagung (FAW), semprotan diarahkan tepat ke <strong>dalam titik tumbuh / pupus muda</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Pantangan & Keselamatan Aplikasi APH</h3>
                <p className="text-[11px] text-slate-500">Hal penting agar agens hayati tidak mati sia-sia</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1 text-rose-950">
                <span className="font-bold text-rose-900 block text-xs">1. Dilarang Mencampur dengan Fungisida / Bakterisida Kimia</span>
                <p>
                  Pencampuran Agens Pengendali Hayati dengan fungisida sintetis (seperti mankozeb, tebukonazol) atau bakterisida kimia akan membunuh langsung spora mikroorganisme yang Anda semprotkan.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">2. Cuci Bersih Tangki Sprayer</span>
                <p>
                  Jika tangki semprot sebelumnya digunakan untuk herbisida atau fungisida kimia, bilas tangki dengan sabun/deterjen dan bilas air bersih minimal 3 kali sebelum digunakan untuk agens hayati.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-900 block text-xs">3. Kualitas Air Pelarut</span>
                <p>
                  Gunakan air sumur atau air sungai yang jernih dan tidak mengandung kaporit tinggi. Endapan lumpur pekat dapat menyumbat nozel dan menurunkan efikasi spora.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
