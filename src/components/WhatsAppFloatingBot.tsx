import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  ExternalLink,
  Bot,
  Sparkles,
  Phone,
  RefreshCw,
  Check,
  CheckCheck,
  ChevronDown,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { api } from '../lib/api';

interface WhatsAppFloatingBotProps {
  onReportCreated?: () => void;
  onOpenFullBotPage?: () => void;
}

interface MessageItem {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
}

export const WhatsAppFloatingBot: React.FC<WhatsAppFloatingBotProps> = ({
  onReportCreated,
  onOpenFullBotPage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [senderName, setSenderName] = useState('Petani Tanggamus');
  const [senderPhone, setSenderPhone] = useState('0812' + Math.floor(10000000 + Math.random() * 90000000));
  
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: '🌾 *SELAMAT DATANG DI CHATBOT WHATSAPP SIGAP-OPT TANGGAMUS* 🌾\n_Sistem Tanggap Pengaduan Hama & Penyakit Tanaman 24 Jam Nonstop_\n\nNomor Resmi Bot WA: *0858-4604-6927*\n\nSilakan pilih layanan cepat:\n1️⃣ Ketik *LAPOR* untuk panduan pengaduan bertahap (Nama, Alamat, Luas, Foto)\n2️⃣ Ketik *STATUS#KODE_TIKET* untuk cek progres tindak lanjut\n3️⃣ Ketik *PANDUAN* untuk rangkuman pengendalian hama terpadu\n4️⃣ Atau tanyakan hama/penyakit tanaman secara bebas!',
      time: '08:00'
    }
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || isTyping) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMsg: MessageItem = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: message,
      time: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Send to backend Fonnte simulation logic
      const res = await api.fonnte.simulate({
        senderPhone: senderPhone,
        message: message,
        senderName: senderName
      });

      const botReply = res.reply || 'Pesan Anda telah diterima oleh sistem SIGAP-OPT.';

      setMessages(prev => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'bot',
          text: botReply,
          time: timeStr
        }
      ]);

      // If report was created (detected by ticket code in reply)
      if (botReply.includes('OPT-2026-') || botReply.includes('TIKET')) {
        if (onReportCreated) {
          onReportCreated();
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'bot',
          text: '⚠️ Maaf, server sedang sibuk. Silakan coba kembali atau ketik *LAPOR* secara langsung.',
          time: timeStr
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (keyword: string) => {
    handleSendMessage(keyword);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        sender: 'bot',
        text: '🌾 Sesi chat diperbarui. Ketik *LAPOR* untuk mulai mengisi laporan baru, atau tanyakan gejala hama tanaman Anda.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-2 rounded-2xl shadow-xl border border-emerald-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Chatbot WA Terhubung (0858-4604-6927)</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-3.5 sm:p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isOpen
              ? 'bg-slate-900 text-white hover:bg-slate-800 rotate-90 border border-slate-700'
              : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white hover:scale-105 hover:shadow-emerald-500/40 ring-4 ring-emerald-500/20'
          }`}
          title="Buka Chatbot WhatsApp SIGAP-OPT"
          aria-label="Buka Chatbot WhatsApp SIGAP-OPT"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Floating WhatsApp Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[420px] max-w-[440px] h-[580px] max-h-[82vh] bg-slate-950 rounded-3xl shadow-2xl border border-emerald-500/30 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header WhatsApp Style */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-4 flex items-center justify-between border-b border-emerald-500/20 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 border-2 border-emerald-300 flex items-center justify-center font-bold text-white shadow-inner">
                  🌾
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-sm leading-tight text-white">
                  <span>SIGAP-OPT Bot Tanggamus</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/90 font-mono mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>0858-4604-6927 • Online 24 Jam</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Percakapan"
                className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              {onOpenFullBotPage && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullBotPage();
                  }}
                  title="Buka Halaman Penuh Pengaturan Bot"
                  className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup Chat"
                className="p-1.5 text-emerald-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Direct Link to Official WhatsApp */}
          <div className="bg-emerald-950/90 px-3.5 py-2 border-b border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200">
            <span className="text-[11px] truncate">Nomor HP Riil: <strong>0858-4604-6927</strong></span>
            <a
              href="https://wa.me/6285846046927?text=LAPOR"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-xs"
            >
              <span>Buka WA Resmi</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
            <button
              type="button"
              onClick={() => handleQuickAction('LAPOR')}
              className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 whitespace-nowrap font-medium transition-colors"
            >
              🌾 Lapor Hama (LAPOR)
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('STATUS#OPT-2026-001')}
              className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 whitespace-nowrap font-medium transition-colors"
            >
              🔍 Cek Status
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('PANDUAN')}
              className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 whitespace-nowrap font-medium transition-colors"
            >
              📚 Panduan PHT
            </button>
            <button
              type="button"
              onClick={() => handleQuickAction('Bagaimana cara membasmi hama wereng coklat pada padi?')}
              className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 whitespace-nowrap font-medium transition-colors"
            >
              ❓ Konsultasi AI
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md whitespace-pre-line font-sans ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-xs'
                      : 'bg-slate-900 text-slate-100 border border-white/10 rounded-bl-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-500">
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-2xl px-3 py-2 w-20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-white/10 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="Ketik pesan / 'LAPOR'..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-950 border border-slate-800 text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-colors shadow-md flex items-center justify-center"
              title="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
