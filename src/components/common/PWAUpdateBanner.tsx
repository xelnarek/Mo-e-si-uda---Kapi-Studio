import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X, Zap, Download } from 'lucide-react';

export const PWAUpdateBanner: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateFn, setUpdateFn] = useState<(() => void) | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (e: Event) => {
      const customEvent = e as CustomEvent<{ updateSW: () => void }>;
      if (customEvent.detail && typeof customEvent.detail.updateSW === 'function') {
        setUpdateFn(() => customEvent.detail.updateSW);
        setUpdateAvailable(true);
      }
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    // Also check if a waiting service worker exists on mount
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          setUpdateAvailable(true);
          setUpdateFn(() => () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          });
        }
      });
    }

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    if (updateFn) {
      updateFn();
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div 
      id="pwa-update-notification-banner"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100%-2rem)] max-w-lg bg-[#18181c] border border-amber-400/60 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 text-zinc-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-[#22222a] border border-[#2e2e36] flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white tracking-tight font-sans">
              Nowa wersja Kapi-Studio jest dostępna!
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#22222a] text-amber-400 border border-[#2e2e36]">
              v4K
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
            Zaktualizuj aplikację, aby załadować najnowsze funkcje i zoptymalizowany silnik renderujący.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
        <button
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Aktualizowanie...' : 'Odśwież teraz'}</span>
        </button>

        <button
          onClick={() => setUpdateAvailable(false)}
          className="p-1.5 rounded-lg bg-[#22222a] hover:bg-[#282830] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-[#26262b]"
          title="Zamknij (zaktualizuj później)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
