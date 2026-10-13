import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Globe, 
  Send, 
  Download, 
  Smartphone, 
  Laptop, 
  Sparkles,
  ExternalLink,
  HardDrive,
  CheckCircle2,
  Monitor
} from 'lucide-react';
import { ProjectState } from '../../types/project';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectState;
  onExportProjectJson?: () => void;
}

export function ShareModal({
  isOpen,
  onClose,
  project,
  onExportProjectJson
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'link' | 'install' | 'qr' | 'project'>('link');
  const { isInstallable, isInstalled, isIOS, install: installPWA } = usePWAInstall();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Convert ais-dev to ais-pre so public share and QR code work on any device/phone
      const cleanUrl = origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
      setAppUrl(cleanUrl);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && appUrl) {
        await navigator.clipboard.writeText(appUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Fallback copy
      const input = document.createElement('input');
      input.value = appUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: project?.name ? `${project.name} • Kapi Spielberg Studio` : 'Kapi Spielberg by Piotr Studio',
          text: 'Sprawdź projekt montażu wideo w zaawansowanym studiu wideo 4K Kapi Spielberg!',
          url: appUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyProjectSummary = async () => {
    if (!project) return;
    const totalDuration = project.timelineItems.reduce((acc, it) => Math.max(acc, it.timelineStart + it.duration), 0);
    const summary = `🎬 PROJEKT KAPI-STUDIO: ${project.name}
🎞️ Liczba ujęć: ${project.mediaLibrary.length}
⏱️ Długość: ${totalDuration.toFixed(1)}s
📐 Format: ${project.settings?.aspectRatio || '16:9'}
✨ Zmontowano w Kapi Spielberg by Piotr 4K`;
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(summary);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2500);
      }
    } catch {}
  };

  // Generate simple QR Code SVG URL
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(appUrl || 'https://google.com')}&bgcolor=18-18-20&color=250-204-21&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#18181c] border border-[#2e2e36] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideUp text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#26262b] flex items-center justify-between bg-[#141416]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-sans">Udostępnij & Pobierz Aplikację</h2>
              <p className="text-[10px] text-zinc-400 font-mono">Dostęp przez przeglądarkę, instalator PWA, smartfon i chmurę</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#22222a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#26262b] bg-[#141416]/50 p-1.5 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-[#282830] text-amber-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="truncate">Link Publiczny</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'bg-[#282830] text-[#00e5cc] font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="truncate">Pobierz Aplikację</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#282830] text-amber-400 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="truncate">Kod QR</span>
          </button>

          {project && (
            <button
              onClick={() => setActiveTab('project')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'project'
                  ? 'bg-[#282830] text-amber-400 font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="truncate">Projekt</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'link' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Adres URL Apletu Kapi-Studio:
                </label>
                <div className="flex items-center gap-2 p-1.5 bg-[#121214] border border-[#2e2e36] rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={appUrl}
                    className="bg-transparent border-none text-xs text-zinc-200 font-mono flex-1 px-2 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-400 hover:bg-amber-300 text-black font-semibold'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Skopiowano</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopiuj</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#22222a] hover:bg-[#2c2c36] border border-[#2e2e36] text-xs text-white font-medium transition-all cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Udostępnij Systemowo</span>
                </button>

                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#22222a] hover:bg-[#2c2c36] border border-[#2e2e36] text-xs text-white font-medium transition-all cursor-pointer shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Otwórz w nowej karcie</span>
                </a>
              </div>

              {/* Capabilities badge */}
              <div className="p-2.5 rounded-xl bg-[#121214] border border-[#26262b] text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Działa na każdym urządzeniu (PWA / WebCodecs)</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Każdy z tym linkiem może od razu uruchomić studio montażu, wczytać klipy 4K lub synchronizować projekty z Firebase.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-3">
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Aplikacja PWA jest już zainstalowana!</p>
                    <p className="text-[11px] text-zinc-400">Pracujesz w natywnym trybie standalone z pełną akceleracją sprzętową GPU.</p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 to-indigo-950/50 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">Zainstaluj Kapi-Studio 1-kliknięciem</p>
                    <p className="text-[11px] text-zinc-300">Natywna aplikacja bez ramek przeglądarki i praca offline.</p>
                  </div>
                  <button
                    onClick={() => installPWA()}
                    className="w-full sm:w-auto px-4 py-2 bg-[#00e5cc] hover:bg-[#14f3db] text-black font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Zainstaluj teraz</span>
                  </button>
                </div>
              ) : null}

              {/* Device Guidelines */}
              <div className="space-y-2.5 text-xs">
                {/* Android / Poco F6 */}
                <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-emerald-400 text-xs">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>Xiaomi Poco F6 / Smartfony Android (Chrome)</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    W Google Chrome dotknij menu <strong>trzech kropek (⋮)</strong> i wybierz <strong>„Zainstaluj aplikację”</strong> lub <strong>„Dodaj do ekranu głównego”</strong>.
                  </p>
                </div>

                {/* PC / Desktop */}
                <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-cyan-400 text-xs">
                    <Monitor className="w-4 h-4 shrink-0" />
                    <span>Komputer PC / Laptop (Chrome, Edge, Brave)</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    Kliknij ikonę <strong>instalacji (ekran ze strzałką)</strong> po prawej stronie paska adresu URL w Chrome/Edge.
                  </p>
                </div>

                {/* iOS */}
                {isIOS && (
                  <div className="p-3 rounded-xl bg-[#141416] border border-[#27272a] space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-purple-400 text-xs">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>iPhone / iPad (Apple Safari)</span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      Dotknij <strong>Udostępnij</strong> (kwadrat ze strzałką w górę), a następnie <strong>„Do ekranu początkowego”</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#26262b]">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#22222a] hover:bg-[#2c2c36] border border-[#2e2e36] text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedLink ? 'Skopiowano link!' : 'Kopiuj link instalacji'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="p-3 bg-[#121214] border border-[#2e2e36] rounded-2xl shadow-inner flex items-center justify-center">
                <img
                  src={qrApiUrl}
                  alt="QR Code Kapi Studio"
                  className="w-48 h-48 rounded-xl object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="text-center space-y-1 max-w-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Zeskanuj aparatem telefonu</span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Otwórz Kapi-Studio na telefonie z pełną obsługą gestów dotykowych i kamery.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'project' && project && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#121214] border border-[#26262b] text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Nazwa:</span>
                  <span className="font-semibold text-white">{project.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Klipy w bibliotece:</span>
                  <span className="font-mono text-amber-400">{project.mediaLibrary.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Ścieżki audio:</span>
                  <span className="font-mono text-emerald-400">{project.audioTracks?.length || 0}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyProjectSummary}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-[#22222a] hover:bg-[#2c2c36] border border-[#2e2e36] text-xs font-medium text-white transition-all cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copiedCode ? 'Skopiowano opis' : 'Kopiuj podsumowanie'}</span>
                </button>

                {onExportProjectJson && (
                  <button
                    onClick={onExportProjectJson}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pobierz plik .JSON</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#26262b] bg-[#141416] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#22222a] hover:bg-[#282830] text-xs text-zinc-300 hover:text-white border border-[#2e2e36] transition-colors cursor-pointer font-medium"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
