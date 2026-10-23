import React, { useRef, useState, useMemo } from 'react';
import { 
  Plus, 
  Play, 
  Trash2, 
  Clock, 
  Volume2, 
  VolumeX,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Film,
  Layers,
  ArrowRight,
  Download,
  Sliders,
  CheckCircle2,
  HardDrive,
  Cpu,
  Sparkles,
  Smartphone
} from 'lucide-react';
import type { ProjectState } from '../../types/project';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface ProjectOverviewViewProps {
  project: ProjectState;
  onNavigateTab: (tab: string) => void;
  onAddFiles: (files: FileList | File[]) => Promise<void>;
  onResetProject: () => void;
  onClearCache: () => void;
  isProcessing?: boolean;
}

export const ProjectOverviewView: React.FC<ProjectOverviewViewProps> = ({
  project,
  onNavigateTab,
  onAddFiles,
  onResetProject,
  onClearCache,
  isProcessing = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clips = project.mediaLibrary || [];
  const timelineItems = project.timelineItems || [];
  const totalClips = clips.length;

  const totalDurationSec = timelineItems.length > 0
    ? timelineItems.reduce((acc, it) => acc + (it.duration || 0), 0)
    : clips.reduce((acc, c) => acc + (c.duration || 0), 0);

  const totalSourceSizeBytes = clips.reduce((acc, c) => acc + (c.size || 0), 0);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const estimatedExportMb = useMemo(() => {
    if (totalDurationSec <= 0) return 0;
    const bitrateBps = 24_000_000;
    return Number(((totalDurationSec * (bitrateBps / 8)) / (1024 * 1024)).toFixed(1));
  }, [totalDurationSec]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 animate-fadeIn pb-12 sm:pb-8">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="video/*,.mp4,.mov,.webm,.m4v"
        className="hidden"
      />

      {/* Modern SaaS Hero Card (CapCut Pro aesthetic) */}
      <div className="relative rounded-2xl overflow-hidden glass-panel p-6 sm:p-8 border border-zinc-800/90 shadow-2xl bg-[#18181c]/90">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <span>KAPI-STUDIO • System Montażu Nowej Generacji</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-heading">
              <span className="text-white block">
                {project.name || project.title || 'Nowy Projekt Montażowy'}
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1 font-mono">
              <span className="text-zinc-200 font-semibold">
                {totalClips} {totalClips === 1 ? 'ujęcie' : (totalClips < 5 ? 'ujęcia' : 'ujęć')}
              </span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDuration(totalDurationSec)} ({Math.round(totalDurationSec)}s)</span>
              </span>
              {totalSourceSizeBytes > 0 && (
                <>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Źródła: {formatFileSize(totalSourceSizeBytes)}</span>
                  </span>
                </>
              )}
              {estimatedExportMb > 0 && (
                <>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" />
                    <span>MP4: ~{estimatedExportMb >= 1000 ? `${(estimatedExportMb / 1024).toFixed(2)} GB` : `${estimatedExportMb} MB`}</span>
                  </span>
                </>
              )}
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="text-amber-400 font-semibold">GPU WebCodecs 4K</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isProcessing ? 'Importowanie...' : 'Dodaj Materiały Wideo'}</span>
            </button>

            {totalClips > 0 && (
              <>
                <button
                  onClick={() => onNavigateTab('montage')}
                  className="px-4 py-2.5 rounded-xl btn-secondary text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Oś Czasu</span>
                </button>

                <button
                  onClick={() => onNavigateTab('export')}
                  className="px-4 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#121214] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Eksport</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {totalClips === 0 ? (
        <div className="glass-card rounded-2xl p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-5 border border-zinc-800/80 shadow-xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
            <Film className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Brak klipów w projekcie
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Przeciągnij i upuść nagrania wideo z dysku lub zaimportuj je bezpośrednio z Dysku Google. Silnik automatycznie rozpozna klatkaż, rozdzielczość i kodek.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-amber-400 hover:bg-amber-300 text-zinc-950 px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Wgraj Pliki Wideo i Audio</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 pt-3 border-t border-zinc-800/80">
            <span>Obsługuje: MP4, MOV, WebM, 4K 60FPS</span>
            <span>·</span>
            <span>Bezpieczne przetwarzanie lokalne</span>
            <span>·</span>
            <span>Dysk Google Ready</span>
          </div>
        </div>
      ) : (
        <>
          {/* Clips Grid Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold uppercase tracking-wider text-zinc-200 text-xs font-mono">
                  Biblioteka Ujęć ({totalClips})
                </h3>
              </div>

              <button
                onClick={() => onNavigateTab('montage')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
              >
                <span>Otwórz oś czasu montażu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Clips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {clips.map((clip, index) => {
                const isPortrait = clip.orientation === 'portrait';
                return (
                  <div
                    key={clip.id}
                    onClick={() => onNavigateTab('montage')}
                    className="group relative bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden shadow-md transition-all flex flex-col cursor-pointer hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                      {clip.thumbnailUrl ? (
                        <>
                          {isPortrait && (
                            <img
                              src={clip.thumbnailUrl}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover filter blur-lg opacity-40 scale-125 pointer-events-none"
                              aria-hidden="true"
                            />
                          )}
                          <img
                            src={clip.thumbnailUrl}
                            alt={clip.name}
                            className={`relative z-10 w-full h-full transition-transform duration-300 group-hover:scale-105 ${
                              isPortrait ? 'object-contain' : 'object-cover'
                            }`}
                          />
                        </>
                      ) : (
                        <div className="text-zinc-600 flex flex-col items-center gap-1">
                          <Film className="w-6 h-6 text-zinc-600" />
                          <span className="text-[10px] font-mono">Miniatura...</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-semibold text-white border border-white/10 z-20">
                        #{index + 1}
                      </div>

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-md text-[10.5px] font-mono font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1 z-20">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{formatDuration(clip.duration)}</span>
                      </div>

                      <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md backdrop-blur-md text-[10px] font-mono font-bold z-20 ${
                        isPortrait ? 'bg-amber-400 text-black shadow' : 'bg-black/80 text-zinc-300 border border-white/10'
                      }`}>
                        {isPortrait ? '9:16' : '16:9'}
                      </div>

                      <div className="absolute bottom-2 left-2 p-1 rounded-md bg-black/80 backdrop-blur-md text-white border border-white/10 z-20">
                        {clip.hasAudio ? (
                          <Volume2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <VolumeX className="w-3 h-3 text-zinc-500" />
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex flex-col justify-between flex-1 gap-1.5 bg-zinc-950/80">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-amber-300 transition-colors">
                          {clip.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                          {clip.width}×{clip.height} · {clip.fps || 30} FPS
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Quick Action Bar */}
          <div className="sticky bottom-4 z-20 glass-panel rounded-2xl p-4 border border-zinc-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <div>
                <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-emerald-400 block">
                  Projekt Gotowy do Edycji i Renderowania
                </span>
                <p className="text-xs font-semibold text-white mt-0.5">
                  {totalClips} {totalClips === 1 ? 'ujęcie' : (totalClips < 5 ? 'ujęcia' : 'ujęć')} w projekcie ({formatDuration(totalDurationSec)})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => onNavigateTab('montage')}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl btn-secondary font-medium text-xs transition-all cursor-pointer"
              >
                Otwórz Oś Czasu
              </button>

              <button
                onClick={() => onNavigateTab('export')}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Przejdź do Eksportu</span>
              </button>
            </div>
          </div>

          {/* Collapsible System & Cache Drawer */}
          <div className="border border-zinc-850 rounded-xl bg-zinc-950/60 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <span className="font-medium font-mono text-[11px]">
                Zarządzanie Pamięcią & Silnik Eksportu
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-zinc-400 font-mono text-[11px]">
                  Pamięć IndexedDB + Strumienie WebCodecs GPU 4K
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={onClearCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Wyczyść pamięć podręczną</span>
                  </button>

                  <button
                    onClick={onResetProject}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 border border-rose-900/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Resetuj projekt</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
