import { useState, useEffect, useRef, useCallback } from 'react';

const LAST_ACTIVE_KEY = 'sigap_last_active_time';
const DEFAULT_INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 menit
const DEFAULT_WARNING_DURATION = 60 * 1000; // 60 detik sebelum logout

interface UseAutoLogoutOptions {
  enabled: boolean;
  timeoutMs?: number;
  warningDurationMs?: number;
  onLogout: (isAuto: boolean) => void;
}

export function useAutoLogout({
  enabled,
  timeoutMs = DEFAULT_INACTIVITY_LIMIT,
  warningDurationMs = DEFAULT_WARNING_DURATION,
  onLogout
}: UseAutoLogoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(warningDurationMs / 1000));
  const lastActiveRef = useRef<number>(Date.now());
  const logoutTriggeredRef = useRef(false);

  // Update aktivitas lokal dan storage
  const recordActivity = useCallback(() => {
    if (!enabled || logoutTriggeredRef.current) return;
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    } catch (_) {}

    // Jika peringatan sedang muncul dan ada aktivitas jelas, reset
    setShowWarning(prev => {
      if (prev) {
        setSecondsLeft(Math.round(warningDurationMs / 1000));
        return false;
      }
      return false;
    });
  }, [enabled, warningDurationMs]);

  // Tombol 'Tetap Masuk / Lanjutkan Sesi'
  const extendSession = useCallback(() => {
    logoutTriggeredRef.current = false;
    recordActivity();
    setShowWarning(false);
  }, [recordActivity]);

  // Tombol 'Logout Sekarang'
  const logoutNow = useCallback(() => {
    logoutTriggeredRef.current = true;
    setShowWarning(false);
    onLogout(false);
  }, [onLogout]);

  // 1. Pasang event listener aktivitas pengguna
  useEffect(() => {
    if (!enabled) {
      setShowWarning(false);
      logoutTriggeredRef.current = false;
      return;
    }

    // Set waktu awal saat login aktif
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    } catch (_) {}
    logoutTriggeredRef.current = false;

    let throttleTimer: any = null;
    const handleUserActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        recordActivity();
      }, 1000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    events.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Sinkronisasi antar-tab via localStorage storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVE_KEY && e.newValue) {
        const remoteTimestamp = parseInt(e.newValue, 10);
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastActiveRef.current) {
          lastActiveRef.current = remoteTimestamp;
          setShowWarning(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Cek saat tab kembali aktif (misal setelah layar mati atau pindah window)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const stored = localStorage.getItem(LAST_ACTIVE_KEY);
        const lastTime = stored ? parseInt(stored, 10) : lastActiveRef.current;
        const elapsed = Date.now() - (isNaN(lastTime) ? lastActiveRef.current : lastTime);
        if (elapsed >= timeoutMs && !logoutTriggeredRef.current) {
          logoutTriggeredRef.current = true;
          setShowWarning(false);
          onLogout(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      events.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, timeoutMs, recordActivity, onLogout]);

  // 2. Interval pengecekan berkala (setiap 1 detik)
  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      if (logoutTriggeredRef.current) return;

      const stored = localStorage.getItem(LAST_ACTIVE_KEY);
      const lastTime = stored ? parseInt(stored, 10) : lastActiveRef.current;
      const effectiveLastTime = isNaN(lastTime) ? lastActiveRef.current : lastTime;
      const elapsed = Date.now() - effectiveLastTime;
      const remainingMs = timeoutMs - elapsed;

      if (remainingMs <= 0) {
        // Waktu habis -> Auto Logout
        logoutTriggeredRef.current = true;
        setShowWarning(false);
        try {
          localStorage.removeItem(LAST_ACTIVE_KEY);
        } catch (_) {}
        onLogout(true);
      } else if (remainingMs <= warningDurationMs) {
        // Masuk fase peringatan (misal 60 detik terakhir)
        setShowWarning(true);
        setSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [enabled, timeoutMs, warningDurationMs, onLogout]);

  return {
    showWarning,
    secondsLeft,
    extendSession,
    logoutNow
  };
}
