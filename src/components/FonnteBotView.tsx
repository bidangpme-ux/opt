import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  Shield,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Sparkles,
  Wifi,
  ExternalLink,
  Radio,
  HelpCircle,
  Layers
} from 'lucide-react';
import { FonnteConfig, FonnteLog } from '../types';

interface FonnteBotViewProps {
  config: FonnteConfig | null;
  logs: FonnteLog[];
  onSaveConfig: (config: Partial<FonnteConfig>) => Promise<void>;
  onSimulateMessage: (phone: string, message: string, name: string) => Promise<string>;
  onRefreshLogs: () => void;
}

export const FonnteBotView: React.FC<FonnteBotViewProps> = ({
  config,
  logs,
  onSaveConfig,
  onSimulateMessage,
  onRefreshLogs
}) => {
  // Simulator state
  const [simSenderName, setSimSenderName] = useState('Pak Supardi (Petani)');
  const [simSenderPhone, setSimSenderPhone] = useState('081298765432');
  const [simMessage, setSimMessage] = useState('');
  const [isSendingSim, setIsSendingSim] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: '🌾 SELAMAT DATANG DI SIGAP-OPT BOT 🌾\nSistem Tanggap & Pengaduan Organisme Pengganggu Tanaman Dinas Pertanian.\n\nKetik format LAPOR atau STATUS untuk layanan.',
      time: '08:00'
    }
  ]);

  // Config form state
  const [apiToken, setApiToken] = useState(config?.apiToken || 'Bye1QhoUjiZ7k4SXDcwn');
  const [senderNumber, setSenderNumber] = useState(config?.senderNumber || '0858-4604-6927 (SIGAP-OPT Bot)');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(config?.autoReplyEnabled ?? true);
  const [autoNotifyUpdate, setAutoNotifyUpdate] = useState(config?.autoNotificationOnUpdate ?? true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Copied helper
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Live Device Diagnostic state
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectResult, setReconnectResult] = useState<{ success: boolean; message: string } | null>(null);

  // Real WhatsApp test sender state
  const [testTargetPhone, setTestTargetPhone] = useState('');
  const [testCustomMessage, setTestCustomMessage] = useState('Halo! Ini adalah pesan uji coba bot SIGAP-OPT Tanggamus via WhatsApp.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fullWebhookUrl = `${window.location.origin}/api/webhook/fonnte`;

  const fetchDeviceStatus = async () => {
    setIsCheckingDevice(true);
    setDeviceError(null);
    try {
      const res = await fetch('/api/fonnte/device-status');
      const data = await res.json();
      if (data.success) {
        setDeviceInfo(data);
      } else {
        setDeviceError(data.message || 'Gagal mengecek status perangkat Fonnte');
      }
    } catch (err: any) {
      setDeviceError(err.message || 'Koneksi ke backend gagal');
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleReconnectFonnte = async () => {
    setIsReconnecting(true);
    setReconnectResult(null);
    try {
      const res = await fetch('/api/fonnte/reconnect', { method: 'POST' });
      const data = await res.json();
      setReconnectResult({
        success: data.success,
        message: data.message || (data.success ? 'Sesi berhasil disambungkan ulang ke server Fonnte!' : 'Gagal menyambungkan')
      });
      fetchDeviceStatus();
    } catch (err: any) {
      setReconnectResult({
        success: false,
        message: `Error reconnect: ${err.message}`
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  useEffect(() => {
    fetchDeviceStatus();
  }, []);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(fullWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTargetPhone.trim()) {
      alert('Masukkan nomor WhatsApp tujuan terlebih dahulu.');
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/fonnte/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhone: testTargetPhone,
          message: testCustomMessage
        })
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Pesan berhasil dikirim!' : 'Pengiriman gagal')
      });
      onRefreshLogs();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error: ${err.message}`
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendSimulation = async (msgToSend?: string) => {
    const text = msgToSend || simMessage;
    if (!text.trim()) return;

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Add user message to local chat
    setChatMessages(prev => [...prev, { sender: 'user', text, time: timeStr }]);
    if (!msgToSend) setSimMessage('');
    setIsSendingSim(true);

    try {
      const reply = await onSimulateMessage(simSenderPhone, text, simSenderName);
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      onRefreshLogs();
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `❌ Error: ${err.message || 'Gagal memproses pesan bot'}`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSendingSim(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await onSaveConfig({
        apiToken,
        senderNumber,
        autoReplyEnabled,
        autoNotificationOnUpdate: autoNotifyUpdate
      });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan konfigurasi Fonnte: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold mb-3 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            WhatsApp Gateway Fonnte & Webhook Engine
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Integrasi Otomatis Chatbot WhatsApp (Fonnte)
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Petani dapat melapor cukup via WhatsApp tanpa instal aplikasi rumit. Format pesan langsung diparsing, dicatat ke database, otomatis disinkronkan ke <strong>Google Spreadsheets</strong>, dan petani menerima nomor tiket secara instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
            Status: Gateway Siap
          </span>
        </div>
      </div>

      {/* Main Grid: Simulator & Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live WhatsApp Interactive Simulator (Phone Mockup) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Simulator Live Chatbot WhatsApp Fonnte</span>
              </h3>
              <p className="text-xs text-slate-500">Uji coba kirim pesan layaknya petani dari HP mereka</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Interactive Test
            </span>
          </div>

          {/* Simulated Farmer Profile Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block">Nama Simulasi Pelapor</label>
              <input
                type="text"
                value={simSenderName}
                onChange={e => setSimSenderName(e.target.value)}
                className="w-full bg-white px-2 py-1 text-xs border border-slate-200 rounded font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block">No. HP Petani</label>
              <input
                type="text"
                value={simSenderPhone}
                onChange={e => setSimSenderPhone(e.target.value)}
                className="w-full bg-white px-2 py-1 text-xs border border-slate-200 rounded font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Chat Window Mockup */}
          <div className="rounded-2xl bg-[#0b141a] border border-slate-800 shadow-inner p-4 h-[380px] flex flex-col justify-between overflow-hidden relative">
            {/* WhatsApp Header bar */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 text-white text-xs">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                🌾
              </div>
              <div>
                <div className="font-bold flex items-center gap-1">
                  <span>SIGAP-OPT Bot Fonnte</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="text-[10px] text-emerald-400">Online & Auto-Reply Aktif</div>
              </div>
            </div>

            {/* Chat Bubble List */}
            <div className="space-y-3 overflow-y-auto pr-1 py-3 flex-1 scrollbar-none">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                        : 'bg-[#202c33] text-[#d1d7db] rounded-tl-none border border-slate-700/50'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                      {msg.time} {msg.sender === 'user' ? '✓✓' : ''}
                    </div>
                  </div>
                </div>
              ))}
              {isSendingSim && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-emerald-400 text-xs px-3 py-2 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></div>
                    <span className="text-[11px] ml-1">Bot sedang memproses...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={simMessage}
                onChange={e => setSimMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSimulation();
                  }
                }}
                placeholder="Ketik pesan atau klik template..."
                className="flex-1 bg-[#2a3942] text-white placeholder-slate-400 px-3 py-2 text-xs rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSendSimulation()}
                disabled={isSendingSim || !simMessage.trim()}
                className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Template Test Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1.5 uppercase tracking-wider">
              Uji Cepat Chatbot WhatsApp:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSendSimulation('LAPOR')}
                className="text-left p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs transition-colors shadow-xs"
              >
                <span className="font-bold block">1. Tanya Jawab</span>
                <span className="text-[10px] text-emerald-100 truncate block">Ketik: LAPOR</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSendSimulation(
                    'LAPOR#Supardi#Cimanuk Hilir#Cimanuk#Padi Sawah#Wereng Batang Coklat#2.0#Berat'
                  )
                }
                className="text-left p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs transition-colors"
              >
                <span className="font-bold text-emerald-800 block">2. Format Tagar</span>
                <span className="text-[10px] text-emerald-600 truncate block">LAPOR#Supardi#...</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendSimulation('STATUS#OPT-2026-001')}
                className="text-left p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs transition-colors"
              >
                <span className="font-bold text-blue-800 block">3. Cek Status</span>
                <span className="text-[10px] text-blue-600 truncate block">STATUS#OPT-2026-001</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendSimulation('PANDUAN')}
                className="text-left p-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs transition-colors"
              >
                <span className="font-bold text-purple-800 block">4. Panduan PHT</span>
                <span className="text-[10px] text-purple-600 truncate block">Ketik: PANDUAN</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Webhook & Fonnte Settings */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Live Fonnte Device Status & Diagnostic Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Status Koneksi Perangkat Fonnte (Live)</h3>
              </div>
              <button
                type="button"
                onClick={fetchDeviceStatus}
                disabled={isCheckingDevice}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingDevice ? 'animate-spin' : ''}`} />
                <span>{isCheckingDevice ? 'Memeriksa...' : 'Cek Status'}</span>
              </button>
            </div>

            {deviceInfo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950 text-sm">{deviceInfo.name || 'SIGAP-OPT'}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                          {deviceInfo.deviceStatus}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-800 font-mono mt-0.5">
                        No. HP: <strong>{deviceInfo.device || '0858-4604-6927'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sisa Kuota</span>
                    <span className="text-sm font-black text-emerald-700">{deviceInfo.quota || '1000'} pesan</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Paket Layanan:</span>
                    <span className="font-bold text-slate-800">{deviceInfo.package || 'Free'}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Masa Aktif:</span>
                    <span className="font-bold text-slate-800">{deviceInfo.expired || 'Aktif'}</span>
                  </div>
                </div>

                {/* Reconnect Action & 24/7 Status */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Keep-Alive 24/7 Aktif (Auto-cek tiap 3 mnt)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleReconnectFonnte}
                      disabled={isReconnecting}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
                      <span>{isReconnecting ? 'Menyambungkan...' : 'Bangunkan / Reconnect'}</span>
                    </button>
                  </div>

                  {reconnectResult && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${reconnectResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                      {reconnectResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      <span className="text-[11px] font-medium">{reconnectResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : deviceError ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Pemeriksaan Perangkat Fonnte:</div>
                    <div className="text-[11px] mt-0.5">{deviceError}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReconnectFonnte}
                  disabled={isReconnecting}
                  className="w-full py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>{isReconnecting ? 'Menghubungkan...' : 'Coba Sambungkan Ulang (Reconnect)'}</span>
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Memeriksa status perangkat ke Fonnte...
              </div>
            )}
          </div>

          {/* 24/7 Universal Report Capture Feature Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 text-white rounded-3xl p-5 border border-emerald-500/30 space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Sistem Tanya Jawab Interaktif 24 Jam Nonstop</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Saat petani mengetik <strong>LAPOR</strong> di WhatsApp, bot akan memandu secara ramah melalui 6 pertanyaan bertahap satu per satu:
            </p>
            <div className="space-y-1.5 text-[10px] bg-white/5 p-3 rounded-2xl border border-white/10 font-mono">
              <div className="text-emerald-300">1. Siapa nama Anda?</div>
              <div className="text-teal-300">2. Di mana alamat Anda? (Dusun/Jalan/RT)</div>
              <div className="text-emerald-300">3. Di mana desa Anda? (Pekon/Desa)</div>
              <div className="text-teal-300">4. Di mana kecamatan Anda?</div>
              <div className="text-emerald-300">5. Berapa luasan lahan terserang?</div>
              <div className="text-teal-300">6. Upload foto lokasi terserang / bukti serangan</div>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 pt-0.5">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Setiap jawaban langsung dicatat, dibuatkan nomor tiket, dan disinkronkan ke Database & Spreadsheets.</span>
            </div>
          </div>

          {/* 2. Direct WhatsApp Message Sender Tool */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Kirim Pesan WhatsApp Langsung (Direct Message / Notifikasi)</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Fonnte Gateway Aktif 24 Jam
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Kirim pesan WhatsApp langsung dari aplikasi ini ke siapa pun (petani, petugas POPT wilayah, kelompok tani, atau nomor pribadi Anda). Pesan dikirim otomatis dari server Bot Fonnte Dinas tanpa perlu Anda membuka HP.
            </p>

            <form onSubmit={handleSendTestWhatsApp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp Penerima (Contoh: 08123456789 atau 628123456789):
                </label>
                <input
                  type="text"
                  value={testTargetPhone}
                  onChange={e => setTestTargetPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Isi Pesan WhatsApp:
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">{testCustomMessage.length} karakter</span>
                </div>
                <textarea
                  rows={3}
                  value={testCustomMessage}
                  onChange={e => setTestCustomMessage(e.target.value)}
                  placeholder="Ketik isi pesan WhatsApp di sini..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
                />
                
                {/* Template Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-slate-400">Pilih Template:</span>
                  <button
                    type="button"
                    onClick={() => setTestCustomMessage('Pemberitahuan SIGAP-OPT: Petugas POPT wilayah Anda telah ditugaskan untuk meninjau lokasi hamparan serangan OPT hari ini. Mohon dipersiapkan akses ke petak sawah.')}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                  >
                    🚜 Peninjauan Lapangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestCustomMessage('Peringatan Dini PHT Tanggamus: Waspada cuaca lembab memicu peningkatan populasi hama/penyakit. Segera lakukan pengamatan berkala dan semprotkan Beauveria / Trichoderma pada sore hari.')}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                  >
                    ⚠️ Peringatan Dini
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestCustomMessage('Kabar Baik SIGAP-OPT: Pengaduan serangan OPT yang Anda laporkan telah selesai ditindaklanjuti melalui Gerakan Pengendalian (Gerdal). Terima kasih atas partisipasi Anda.')}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors"
                  >
                    ✅ Gerdal Selesai
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-semibold">{testResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingTest || !testTargetPhone.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Mengirim pesan ke WhatsApp...' : 'Kirim Pesan WhatsApp Sekarang'}</span>
              </button>
            </form>
          </div>

          {/* 3. Panduan Setting Auto Reply di Fonnte */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 relative overflow-hidden space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Cara Setting Auto Reply di Dashboard Fonnte</h4>
                <p className="text-xs text-indigo-200/90 leading-relaxed mt-0.5">
                  Tersedia 2 cara setting balas otomatis di Fonnte: <strong>Otomatis via Webhook (Tanya-Jawab Cerdas)</strong> atau <strong>Menu Auto Reply Statis Fonnte</strong>.
                </p>
              </div>
            </div>

            {/* Metode A: Webhook (Tanya Jawab 6 Langkah) */}
            <div className="p-3.5 bg-emerald-950/60 rounded-2xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Metode 1: Webhook Auto Reply (Tanya-Jawab Interaktif & Database)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300">
                  Direkomendasikan
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Dengan metode ini, bot otomatis memandu petani bertanya <strong>Nama &rarr; Alamat &rarr; Desa &rarr; Kecamatan &rarr; Luas &rarr; Foto</strong>, lalu otomatis menyimpan laporan ke Database & Google Spreadsheets:
              </p>
              <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 pl-1">
                <li>Buka dashboard Fonnte: <a href="https://md.fonnte.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">md.fonnte.com</a> &rarr; Masuk ke menu <strong>Device</strong>.</li>
                <li>Klik tombol <strong>Edit / Pengaturan Perangkat</strong> pada nomor HP Anda.</li>
                <li>Pada kolom <strong>Webhook URL</strong>, masukkan URL berikut:</li>
              </ol>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-emerald-300">
                <span className="truncate flex-1">{fullWebhookUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[10px] shrink-0 transition-colors"
                >
                  {copiedWebhook ? 'Tersalin!' : 'Salin URL'}
                </button>
              </div>
              <p className="text-[10px] text-emerald-400">
                &bull; Pastikan opsi <strong>Auto Reply via Webhook</strong> dalam posisi <strong>Centang / Aktif</strong>.
              </p>
            </div>

            {/* Metode B: Menu Auto Reply Manual Fonnte */}
            <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2.5">
              <div className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Metode 2: Menu "Auto Reply" di Dashboard Fonnte (Keyword Statis)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Jika Anda ingin menambahkan respon pesan cepat khusus di Fonnte (misal kata kunci <em>MENU</em> atau <em>PANDUAN</em>):
              </p>
              <div className="text-[11px] text-slate-300 space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                <p>1. Buka menu <strong>Auto Reply</strong> di sidebar kiri Fonnte.</p>
                <p>2. Klik tombol <strong>+ Add Auto Reply</strong> (Tambah).</p>
                <p>3. Pilih <strong>Device</strong>: Nomor WhatsApp Anda.</p>
                <p>4. Pilih <strong>Type</strong>: <em>Contains</em> (mengandung) atau <em>Equal</em> (sama persis).</p>
                <p>5. Isi <strong>Keyword</strong> &amp; <strong>Message</strong> dengan template di bawah ini:</p>
              </div>

              {/* Template Copy Box: LAPOR */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">1. Keyword: LAPOR (Pemicu Tanya-Jawab)</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `🌾 *PENGADUAN SERANGAN HAMA/PENYAKIT (OPT) TANAMAN* 🌾\n_Dinas Ketahanan Pangan, Tanaman Pangan dan Hortikultura Kab. Tanggamus_\n\nSilakan jawab pertanyaan berikut secara bertahap:\n\n1️⃣ *Siapa nama Anda?*\n_(Ketik nama lengkap Anda, atau ketik *BATAL* untuk membatalkan)_`,
                        'lapor'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'lapor' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'lapor' ? 'Tersalin!' : 'Salin Pesan'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  🌾 PENGADUAN SERANGAN HAMA/PENYAKIT... Siapa nama Anda?
                </div>
              </div>

              {/* Template Copy Box: PANDUAN */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">2. Keyword: PANDUAN</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `📚 *PANDUAN CEPAT PENGENDALIAN HAMA (PHT) TANGGAMUS*\n\n1. *Wereng Coklat (Padi):*\nKeringkan sawah berkala. Aplikasikan agens hayati Beauveria bassiana. Hindari pestisida piretroid sintetis yang memicu resurjensi.\n\n2. *Ulat Grayak FAW (Jagung):*\nAplikasi ekstrak daun mimba atau insektisida ke pucuk tanaman saat sore hari.\n\n3. *Tikus Sawah:*\nGropyokan massal awal tanam dan fumigasi belerang di liang aktif.\n\n4. *Antraknosa / Patek (Cabai):*\nPetik dan musnahkan buah busuk, atur drainase, semprot fungisida tembaga terdaftar.`,
                        'panduan'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'panduan' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'panduan' ? 'Tersalin!' : 'Salin Pesan'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  📚 PANDUAN CEPAT PENGENDALIAN HAMA (PHT)...
                </div>
              </div>

              {/* Template Copy Box: Menu Utama (*) */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">3. Keyword Default: MENU / HALO / *</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `🌾 *SELAMAT DATANG DI SIGAP-OPT BOT* 🌾\n_Sistem Tanggap & Pengaduan OPT Dinas Pertanian Kab. Tanggamus (24 Jam)_\n\nSilakan pilih menu layanan:\n1️⃣ *LAPOR SERANGAN HAMA/PENYAKIT (TANYA JAWAB)*\nKetik: *LAPOR*\n_Sistem akan menanyakan nama, alamat, desa, kecamatan, luasan lahan, dan upload foto secara bertahap._\n\n2️⃣ *CEK STATUS PENGADUAN*\nKetik: *STATUS#KODE_TIKET*\n_Contoh:_ *STATUS#OPT-2026-001*\n\n3️⃣ *PANDUAN PENGENDALIAN HAMA*\nKetik: *PANDUAN*`,
                        'default'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
                  >
                    {copiedKey === 'default' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'default' ? 'Tersalin!' : 'Salin Pesan'}</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  🌾 SELAMAT DATANG DI SIGAP-OPT BOT... Ketik: LAPOR
                </div>
              </div>
            </div>
          </div>

          {/* 4. Step-by-Step Connection Guide */}
          <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10 mb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                🔌
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Panduan Cara Menghubungkan Fonnte ke Web SIGAP-OPT</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 font-semibold">
                    Resmi & Aktif
                  </span>
                </h3>
                <p className="text-xs text-slate-300">Bot WhatsApp di nomor <strong>0858-4604-6927</strong></p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-emerald-300">Buka Akun Fonnte</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Kunjungi website <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold hover:text-emerald-300">fonnte.com</a>, daftar atau login ke akun dashboard Anda.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-emerald-300">Hubungkan WhatsApp (Scan QR)</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Masuk ke menu <strong>Device</strong> di Fonnte. Klik tombol <strong>Scan / Connect</strong> lalu buka aplikasi WhatsApp di HP nomor <strong className="text-white bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-600/50">0858-4604-6927</strong>, pilih <em>Perangkat Tertaut</em> &amp; scan QR yang muncul hingga status berubah menjadi <span className="text-emerald-400 font-bold">Connect</span>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-1 w-full">
                  <div className="font-bold text-emerald-300">Pasang Webhook URL di Fonnte</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Di dashboard Fonnte, buka menu <strong>Device Settings &gt; Webhook</strong>, tempelkan link Webhook di bawah ini, dan pastikan opsi <strong>Webhook Aktif (ON)</strong>:
                  </p>
                  <div className="mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-emerald-300 truncate selection:bg-emerald-600">
                      {fullWebhookUrl}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-white" />
                          <span>Salin URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-emerald-300">Masukkan API Token ke Web Ini</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Salin <strong>API Token</strong> perangkat Anda dari Fonnte (menu <em>Account</em> atau <em>Device</em>), lalu tempelkan ke kolom form <em>API Token Fonnte</em> di bawah dan klik <strong>Simpan Konfigurasi</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Webhook Configuration Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan Webhook &amp; Token Fonnte</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">Endpoint Webhook</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Salin URL Webhook di bawah ini ke dashboard Fonnte Anda pada menu <strong>Device Settings &gt; Webhook URL</strong>.
            </p>

            {/* Webhook URL Copy box */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Webhook URL:</span>
                <span className="font-mono text-xs text-slate-800 font-semibold truncate block">
                  {fullWebhookUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {/* Fonnte Configuration Form */}
            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Token Fonnte (Untuk Kirim WA Riil):
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="Masukkan API Token dari akun fonnte.com..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  *Token dari menu Device/Account di Fonnte.com untuk pengiriman pesan WhatsApp riil.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Nomor Pengirim Bot WhatsApp:
                </label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                  placeholder="Contoh: 0858-4604-6927 (SIGAP-OPT Bot)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReplyEnabled}
                    onChange={e => setAutoReplyEnabled(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="font-medium">
                    Balas otomatis pesan masuk petani (Auto-reply panduan & tiket)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoNotifyUpdate}
                    onChange={e => setAutoNotifyUpdate(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="font-medium">
                    Kirim update WA otomatis ke petani saat status laporan diubah petugas
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-between">
                {configSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Konfigurasi Fonnte tersimpan!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  {isSavingConfig ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </button>
              </div>
            </form>
          </div>

          {/* Webhook Integration Schema Guide */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Format Perintah Pesan WhatsApp Resmi</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px]">
                <strong className="text-emerald-700">1. LAPOR#Nama#Desa#Kecamatan#Komoditas#Hama#Luas#Tingkat</strong>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Mencatat pengaduan baru, memetakan koordinat, dan sinkron ke Sheets.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px]">
                <strong className="text-blue-700">2. STATUS#KodeTiket (Contoh: STATUS#OPT-2026-001)</strong>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Cek status verifikasi, rekomendasi obat/agens hayati, dan jadwal Gerdal.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px]">
                <strong className="text-purple-700">3. PANDUAN</strong>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Rangkuman pedoman pengendalian hama terpadu (PHT) untuk padi, jagung, cabai, dll.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Log Pesan Masuk & Keluar WhatsApp Fonnte</span>
            </h3>
            <p className="text-xs text-slate-500">Audit trail komunikasi chatbot dan notifikasi otomatis</p>
          </div>
          <button
            onClick={onRefreshLogs}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Segarkan Log"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Arah</th>
                <th className="py-3 px-4">Pengirim / Penerima</th>
                <th className="py-3 px-4">Isi Pesan WhatsApp</th>
                <th className="py-3 px-4">Status Pengiriman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada riwayat pesan WhatsApp Fonnte.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.direction === 'incoming' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                          <span>Masuk</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          <span>Keluar</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{log.senderName || log.phone}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.phone}</div>
                    </td>

                    <td className="py-3 px-4 max-w-md">
                      <div className="text-slate-700 truncate font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        {log.message}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          log.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'processed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
