/**
 * SIGAP-OPT Tanggamus - Anti-Inspect & Client Protection Module
 * 
 * Modul keamanan untuk membatasi aksi inspeksi elemen (Inspect Element),
 * penonaktifan tombol pintas devtools (F12, Ctrl+Shift+I, dll.), klik kanan,
 * dan view source pada aplikasi web SIGAP-OPT.
 */

export function initAntiInspect(): void {
  if (typeof window === 'undefined') return;

  // 1. Nonaktifkan Klik Kanan (Context Menu)
  window.addEventListener(
    'contextmenu',
    (e: MouseEvent) => {
      // Izinkan klik kanan hanya jika pengguna sedang berada di input/textarea jika perlu,
      // tetapi untuk keamanan inspect penuh, kita blokir context menu umum
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      
      // Jika bukan input teks biasa atau jika inspect dicegah total:
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Klik kanan dinonaktifkan untuk keamanan sistem.');
        return false;
      }
    },
    { capture: true }
  );

  // 2. Nonaktifkan Tombol Pintas Pengembang (Keyboard Shortcuts)
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const key = e.key;
      const keyCode = e.keyCode || e.which;
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // F12 (Developer Tools)
      if (key === 'F12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Tombol F12 (DevTools) dinonaktifkan.');
        return false;
      }

      // Ctrl + Shift + I atau Cmd + Option + I (Inspect Element)
      if (ctrlOrCmd && (shift || alt) && (key === 'I' || key === 'i' || keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Inspect Element dinonaktifkan.');
        return false;
      }

      // Ctrl + Shift + J atau Cmd + Option + J (Console)
      if (ctrlOrCmd && (shift || alt) && (key === 'J' || key === 'j' || keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Konsol pengembang dinonaktifkan.');
        return false;
      }

      // Ctrl + Shift + C atau Cmd + Option + C (Element Selector)
      if (ctrlOrCmd && (shift || alt) && (key === 'C' || key === 'c' || keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Pemeriksa elemen dinonaktifkan.');
        return false;
      }

      // Ctrl + Shift + K (Firefox Web Console)
      if (ctrlOrCmd && shift && (key === 'K' || key === 'k' || keyCode === 75)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U atau Cmd + Option + U (View Source)
      if (ctrlOrCmd && !shift && (key === 'U' || key === 'u' || keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        showAntiInspectToast('Lihat sumber halaman (View Source) dinonaktifkan.');
        return false;
      }

      // Ctrl + S atau Cmd + S (Save Page Source)
      if (ctrlOrCmd && !shift && (key === 'S' || key === 's' || keyCode === 83)) {
        // Jangan blokir jika pengguna sedang di form dan tidak sengaja tekan Ctrl+S
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 3. Cegah Drag Gambar dan Elemen Penting
  window.addEventListener(
    'dragstart',
    (e: DragEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'IMG' || target?.tagName === 'A') {
        e.preventDefault();
        return false;
      }
    },
    { capture: true }
  );

  // 4. Trap Debugger Berkala (Menghentikan eksekusi jika DevTools dipaksa dibuka)
  const runAntiDebug = () => {
    try {
      const start = performance.now();
      // Menggunakan eval/Function dinamis agar debugger terpicu hanya bila devtools dibuka
      const debugFn = Function('debugger');
      debugFn();
      const end = performance.now();
      if (end - start > 100) {
        // Devtools aktif dan berhenti di breakpoint debugger
        console.clear();
      }
    } catch (_) {
      // Abaikan jika lingkungan menonaktifkan eval
    }
  };

  // Jalankan trap debugger hanya pada lingkungan produksi non-preview
  const isPreviewOrDev = 
    typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname.includes('run.app') || 
     window.location.hostname.includes('aistudio'));

  if (!isPreviewOrDev) {
    setInterval(runAntiDebug, 2000);
  }

  // 5. Pesan Peringatan Resmi pada Konsol
  try {
    const printSecurityBanner = () => {
      console.clear();
      console.log(
        '%c⛔ PERINGATAN KEAMANAN SISTEM SIGAP-OPT',
        'color: #dc2626; font-size: 22px; font-weight: 800; text-shadow: 1px 1px 2px #000; padding: 4px;'
      );
      console.log(
        '%cAplikasi Pengaduan & Pemantauan OPT Kabupaten Tanggamus dilindungi sistem proteksi integritas data.',
        'color: #059669; font-size: 13px; font-weight: bold;'
      );
      console.log(
        '%cSegala bentuk inspeksi kode, modifikasi DOM, atau manipulasi sesi tanpa izin diawasi oleh protokol keamanan.',
        'color: #64748b; font-size: 12px; font-style: italic;'
      );
    };

    printSecurityBanner();
    // Cetak ulang berkala jika konsol dibersihkan
    setInterval(printSecurityBanner, 10000);
  } catch (_) {}
}

/**
 * Toast notifikasi ringkas anti-inspect yang tidak mengganggu UI utama
 */
let toastTimeout: any = null;
function showAntiInspectToast(message: string): void {
  let toastEl = document.getElementById('sigap-anti-inspect-badge');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'sigap-anti-inspect-badge';
    toastEl.style.position = 'fixed';
    toastEl.style.bottom = '24px';
    toastEl.style.left = '50%';
    toastEl.style.transform = 'translateX(-50%)';
    toastEl.style.zIndex = '999999';
    toastEl.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    toastEl.style.color = '#f8fafc';
    toastEl.style.padding = '8px 16px';
    toastEl.style.borderRadius = '9999px';
    toastEl.style.fontSize = '12px';
    toastEl.style.fontWeight = '600';
    toastEl.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.4)';
    toastEl.style.pointerEvents = 'none';
    toastEl.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    toastEl.style.opacity = '0';
    toastEl.style.display = 'flex';
    toastEl.style.alignItems = 'center';
    toastEl.style.gap = '8px';
    toastEl.style.border = '1px solid rgba(239, 68, 68, 0.5)';
    document.body.appendChild(toastEl);
  }

  toastEl.innerHTML = `
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#ef4444;"></span>
    <span>${message}</span>
  `;
  toastEl.style.opacity = '1';
  toastEl.style.transform = 'translateX(-50%) translateY(0)';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (toastEl) {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(-50%) translateY(10px)';
    }
  }, 2500);
}
