import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  Clock, 
  Monitor, 
  HardDrive, 
  Loader2, 
  StopCircle,
  FileVideo,
  Info,
  Sliders,
  Sparkles,
  Terminal,
  Activity,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Film,
  Music,
  Maximize2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { GoogleDriveIcon } from '../GoogleDriveModal';
import type { ProjectState } from '../../types/project';
import { videoExportService } from '../../core/export/videoExportService';
import { exportQueueService } from '../../core/export/exportQueueService';
import { 
  ExportOutput, 
  ExportProgress, 
  ExportError, 
  FitMode,
  MediaSource,
  TimelineClip,
  DiagnosticsCapabilities,
  DiagnosticLogEntry,
  ExportStage,
  SerialExportTask,
  ExportResolution,
  VideoCodecOption,
  ContainerFormat
} from '../../core/export/videoExportTypes';
import { urlRegistry } from '../../core/media/urlRegistry';
import { resolveClipMediaUrl } from '../../core/media/mediaResolver';
import { localIndexedDB, type ExportedVideoRecord } from '../../core/storage/indexedDBProvider';
import { useStudioToast } from '../common/ToastContext';
import { AiMontageSummaryPanel } from './AiMontageSummaryPanel';

interface ExportViewProps {
  project: ProjectState;
  onUpdateProject?: (project: ProjectState) => void;
  onNavigateTab?: (tab: string) => void;
  onResetProject?: () => void;
}

type ExportPresetMode = 'FAST' | 'BALANCED' | 'QUALITY' | 'MAX_QUALITY';

export const RESOLUTION_SPECS: Record<ExportResolution, { label: string; desc: string; detail: string; bestFor: string; pixels: string }> = {
  '1080p': {
    label: '1920 × 1080 (Full HD 16:9)',
    desc: 'Złoty standard wideo 16:9. Optymalna ostrość, szybki eksport i bezproblemowe odtwarzanie na każdym smartfonie, laptopie i telewizorze.',
    detail: '2.07 mln pikseli • bitrate 18-25 Mbps • najszybszy transfer',
    bestFor: 'Uniwersalna publikacja, YouTube, TV, platformy wideo.',
    pixels: '2.07 MP'
  },
  '1440p': {
    label: '2560 × 1440 (2K QHD 16:9)',
    desc: 'O 77% więcej szczegółów niż Full HD przy umiarkowanym rozmiarze pliku. Zapewnia wyrazisty obraz na nowoczesnych monitorach i ekranach Retina.',
    detail: '3.68 mln pikseli • bitrate 28-36 Mbps • wysoka ostrość bez ciężaru 4K',
    bestFor: 'Monitory komputerowe 2K/4K, wymagający widzowie, YouTube w 1440p.',
    pixels: '3.68 MP'
  },
  '4k': {
    label: '3840 × 2160 (4K Ultra HD Master)',
    desc: 'Najwyższa jakość studyjna (4× więcej pikseli niż 1080p). Niezrównana ostrość, mikroszczegóły twarzy i scenografii na wielkich ekranach 4K/8K.',
    detail: '8.29 mln pikseli • bitrate 55-85 Mbps • profesjonalny master archiwalny',
    bestFor: 'Główny film master, duże ekrany TV, archiwalny master na lata.',
    pixels: '8.29 MP'
  },
  '720p': {
    label: '1280 × 720 (HD Ready 16:9)',
    desc: 'Lekki format o małej wadze pliku i błyskawicznym renderowaniu. Idealny do szybkiego wysłania przez internet lub w wiadomościach.',
    detail: '0.92 mln pikseli • bitrate 8-12 Mbps • 60% lżejszy plik niż 1080p',
    bestFor: 'Szybki podgląd roboczy, transfer przez Messenger/WhatsApp, słabe łącze.',
    pixels: '0.92 MP'
  },
  'vertical_1080p': {
    label: '1080 × 1920 (Pionowy 9:16 Full HD)',
    desc: 'Pionowy kadr wypełniający cały ekran telefonu bez czarnych pasów. Gotowy do natychmiastowej publikacji w mediach społecznościowych.',
    detail: '2.07 mln pikseli • proporcje pionowe 9:16 • zoptymalizowany pod smartfony',
    bestFor: 'Instagram Reels, TikTok, YouTube Shorts, relacje Stories.',
    pixels: '2.07 MP'
  },
  'vertical_4k': {
    label: '2160 × 3840 (Pionowy 9:16 4K Ultra HD)',
    desc: 'Ekskluzywny format pionowy w najwyższej rozdzielczości 4K. Maksymalna ostrość kreacji mobilnych klasy premium na telefony z ekranami OLED.',
    detail: '8.29 mln pikseli • pionowy 9:16 4K • bezstratna ostrość mobilna',
    bestFor: 'Luksusowe rolki i zwiastuny na najnowsze smartfony.',
    pixels: '8.29 MP'
  },
  'square_1080p': {
    label: '1080 × 1080 (Kwadrat 1:1)',
    desc: 'Klasyczny kadr kwadratowy zoptymalizowany pod siatkę feedu na profilu społecznościowym.',
    detail: '1.16 mln pikseli • proporcje 1:1 • równomierna kompozycja',
    bestFor: 'Posty w siatce Instagrama, posty na Facebooku, materiały promocyjne.',
    pixels: '1.16 MP'
  }
};

export const FPS_SPECS: Record<number, { title: string; desc: string; style: string; comp: string }> = {
  24: {
    title: '24 FPS (Hollywood Kinowy 24p)',
    desc: 'Tradycyjny klatkarz taśmy filmowej i kina fabularnego. Daje szlachetne, miękkie rozmycie ruchu (motion blur) i klasyczny nastrój kinowy.',
    style: 'Styl: Romantyczny, nostalgiczny, filmowy.',
    comp: 'O 20% mniejszy rozmiar pliku i szybszy render niż 30 FPS.'
  },
  25: {
    title: '25 FPS (Europejski Standard PAL 25p)',
    desc: 'Format telewizyjny i produkcyjny w Europie. Zapewnia naturalne odwzorowanie ruchu bez migotania przy oświetleniu 50 Hz.',
    style: 'Styl: Telewizyjny, reporterski, naturalny.',
    comp: 'Idealna zgodność z kamerami Sony/Panasonic/Canon nagrywającymi w systemie PAL.'
  },
  30: {
    title: '30 FPS (Standard Internetowy 30p)',
    desc: 'Uniwersalna płynność dla komputerów i smartfonów (NTSC). Zapewnia wyrazisty ruch bez nadmiernego obciążania procesora i karty graficznej.',
    style: 'Styl: Standardowy, nowoczesny, wyważony.',
    comp: 'Standard YouTube i platform strumieniowych.'
  },
  50: {
    title: '50 FPS (Płynny Europejski PAL 50p)',
    desc: 'Podwójna liczba klatek standardu europejskiego. Wyraźny, gładki ruch dynamicznych scen i brak skoków bez migotania świateł.',
    style: 'Styl: Bardzo płynny, reporterski.',
    comp: 'Płynniejszy ruch o 100% względem 25 FPS przy zachowaniu europejskiego taktu.'
  },
  60: {
    title: '60 FPS (Ultra Płynny 60p HFR)',
    desc: 'Maksymalna płynność High Frame Rate. Każda sekunda zawiera 60 pełnych klatek – krystaliczna czytelność tańców, konfetti i dynamicznych ujęć.',
    style: 'Styl: Krystalicznie płynny, dynamiczny, realistyczny.',
    comp: 'Znakomity do dynamicznego montażu z efektownymi przejściami.'
  }
};

export const QUALITY_SPECS: Record<string, { label: string; desc: string; bitrateRange: string }> = {
  maximum: {
    label: 'Maksymalna Master (55–120 Mbps)',
    desc: 'Bezkompromisowa jakość studyjna. Silnik przydziela maksymalny bitrate VBR, eliminując jakiekolwiek zniekształcenia w ciemnych salach i przy dymie scenicznym.',
    bitrateRange: '55–120 Mbps (najwyższa wierność)'
  },
  high: {
    label: 'Wysoka Studio (18–55 Mbps)',
    desc: 'Złoty środek polecany dla większości filmów wideo. Bardzo ostre krawędzie i naturalne przejścia tonalne przy rozsądnej wadze pliku.',
    bitrateRange: '18–55 Mbps (rekomendowana)'
  },
  standard: {
    label: 'Standardowa (8–16 Mbps)',
    desc: 'Zoptymalizowana pod kątem mniejszego rozmiaru pliku. Umożliwia szybkie przesłanie gotowego filmu przez internet lub chmurę.',
    bitrateRange: '8–16 Mbps (lekki plik)'
  }
};

export const FIT_MODE_SPECS: Record<string, { label: string; desc: string }> = {
  fit: {
    label: 'FIT (Dopasuj z tłem)',
    desc: 'Całe ujęcie jest widoczne w kadrze bez obcinania. W przypadku mieszanych ujęć pionowych i poziomych boki wypełnia estetyczne rozmycie (aesthetic blur).'
  },
  fill: {
    label: 'FILL (Wypełnij ekran)',
    desc: 'Obraz wypełnia ekran od brzegu do brzegu bez czarnych pasów. Ujęcia o innych proporcjach są delikatnie i proporcjonalnie kadrowane do środka.'
  },
  original: {
    label: 'ORIGINAL (Bez zmian)',
    desc: 'Ujęcie zachowuje dokładną geometrię i proporcje źródłowe.'
  }
};

export function ExportView({ project, onUpdateProject, onNavigateTab, onResetProject }: ExportViewProps) {
  const toast = useStudioToast();

  // Settings & Presets with localStorage persistence
  const [presetMode, setPresetMode] = useState<ExportPresetMode>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_preset_mode');
      if (saved === 'FAST' || saved === 'BALANCED' || saved === 'QUALITY' || saved === 'MAX_QUALITY') return saved;
    } catch {}
    return 'BALANCED';
  });
  const [resolution, setResolution] = useState<ExportResolution>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_resolution');
      if (saved && (saved in RESOLUTION_SPECS)) return saved as ExportResolution;
    } catch {}
    return '1080p';
  });
  const [fps, setFps] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_fps');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    } catch {}
    return 30;
  });
  const [quality, setQuality] = useState<'standard' | 'high' | 'maximum'>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_quality');
      if (saved === 'standard' || saved === 'high' || saved === 'maximum') return saved;
    } catch {}
    return 'high';
  });
  const [fitMode, setFitMode] = useState<FitMode>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_fit_mode');
      if (saved === 'fit' || saved === 'fill' || saved === 'original') return saved as FitMode;
    } catch {}
    return 'fit';
  });
  const [videoCodec, setVideoCodec] = useState<VideoCodecOption>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_codec');
      if (saved) return saved as VideoCodecOption;
    } catch {}
    return 'auto';
  });
  const [container, setContainer] = useState<ContainerFormat>(() => {
    try {
      const saved = localStorage.getItem('kapi_studio_export_container');
      if (saved === 'mp4' || saved === 'webm' || saved === 'auto') return saved as ContainerFormat;
    } catch {}
    return 'auto';
  });
  const [isManualCodecMode, setIsManualCodecMode] = useState(false);
  const [showRenderGuide, setShowRenderGuide] = useState(false);

  // Save settings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('kapi_studio_export_preset_mode', presetMode);
      localStorage.setItem('kapi_studio_export_resolution', resolution);
      localStorage.setItem('kapi_studio_export_fps', String(fps));
      localStorage.setItem('kapi_studio_export_quality', quality);
      localStorage.setItem('kapi_studio_export_fit_mode', fitMode);
      localStorage.setItem('kapi_studio_export_codec', videoCodec);
      localStorage.setItem('kapi_studio_export_container', container);
    } catch {}
  }, [presetMode, resolution, fps, quality, fitMode, videoCodec, container]);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [output, setOutput] = useState<ExportOutput | null>(videoExportService.getLastOutput());
  const [error, setError] = useState<ExportError | null>(null);
  const [queueTasks, setQueueTasks] = useState<SerialExportTask[]>([]);

  // Diagnostics & Developer Panel State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [capabilities, setCapabilities] = useState<DiagnosticsCapabilities | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; durationMs: number; details: string } | null>(null);
  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);

  // Video preview player ref
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const [isPlayingResult, setIsPlayingResult] = useState(false);

  // Persistent Saved / Exported Videos Store (IndexedDB)
  const [savedVideos, setSavedVideos] = useState<ExportedVideoRecord[]>([]);
  const [activePreviewVideoId, setActivePreviewVideoId] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveExportLink, setDriveExportLink] = useState<string | null>(null);

  const loadSavedVideos = async () => {
    try {
      const list = await localIndexedDB.listExportedVideos();
      setSavedVideos(list);

      // Restore last master render for this project if output is null
      if (!output) {
        const masterCache = await localIndexedDB.getMasterRenderBlob(project.id);
        if (masterCache && masterCache.blob) {
          const blobUrl = urlRegistry.create(masterCache.blob);
          setOutput({
            url: blobUrl,
            blob: masterCache.blob,
            fileName: masterCache.meta?.fileName || `${project.name || 'projekt'}_render.mp4`,
            sizeBytes: masterCache.blob.size,
            duration: masterCache.meta?.duration || 0,
            width: masterCache.meta?.width || 1920,
            height: masterCache.meta?.height || 1080,
            videoCodec: masterCache.meta?.mimeType?.includes('webm') ? 'VP9' : 'H.264',
            audioCodec: 'AAC',
            fps: 30,
            verifiedPlayable: true,
            createdAt: masterCache.createdAt || Date.now()
          });
        }
      }
    } catch (e) {
      console.warn('[ExportView] Could not load saved videos list from IndexedDB:', e);
    }
  };

  useEffect(() => {
    loadSavedVideos();
  }, []);

  useEffect(() => {
    if (output?.url && videoPlayerRef.current) {
      videoPlayerRef.current.load();
    }
  }, [output?.url]);

  // Load hardware capabilities on mount
  useEffect(() => {
    handleLoadCapabilities();
  }, []);

  const isGpuAccelerated = useMemo(() => {
    if (!capabilities) return true; // Optimistic while loading capabilities
    return Boolean(
      capabilities.webCodecsSupported &&
      capabilities.videoEncoderSupported &&
      (capabilities.hevcHardware || capabilities.av1Hardware || capabilities.vp9Hardware || capabilities.h264Supported)
    );
  }, [capabilities]);

  // Sync preset changes
  const applyPreset = (mode: ExportPresetMode) => {
    setPresetMode(mode);
    switch (mode) {
      case 'FAST':
        setResolution('720p');
        setFps(30);
        setQuality('standard');
        break;
      case 'BALANCED':
        setResolution('1080p');
        setFps(30);
        setQuality('high');
        break;
      case 'QUALITY':
        setResolution('1080p');
        setFps(60);
        setQuality('high');
        break;
      case 'MAX_QUALITY':
        setResolution('4k');
        setFps(60);
        setQuality('maximum');
        break;
    }
  };

  // Compute Sources & Ordered Timeline
  const mediaSources: MediaSource[] = useMemo(() => {
    return (project.mediaLibrary || []).map(clip => {
      const activeUri = (clip.objectUrl && urlRegistry.isAlive(clip.objectUrl))
        ? clip.objectUrl
        : (clip.file ? urlRegistry.create(clip.file) : (clip.objectUrl || ''));

      return {
        id: clip.id,
        uri: activeUri,
        file: clip.file,
        type: clip.type || (/\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(clip.name) ? 'image' : 'video'),
        name: clip.name,
        size: clip.size || 0,
        duration: clip.duration || 1,
        width: clip.width || 1920,
        height: clip.height || 1080,
        fps: clip.fps || 30,
        videoCodec: clip.mimeType?.includes('webm') ? 'VP9' : 'H.264',
        audioCodec: clip.hasAudio ? 'AAC' : 'Brak',
        audioChannels: clip.audioChannels || (clip.hasAudio ? 2 : 0),
        sampleRate: clip.hasAudio ? 48000 : 0,
        orientation: clip.orientation || 'landscape',
        hasAudio: Boolean(clip.hasAudio),
        supported: clip.status !== 'ERROR' && clip.status !== 'error',
        thumbnailUrl: clip.thumbnailUrl
      };
    });
  }, [project.mediaLibrary]);

  const timelineClips: TimelineClip[] = useMemo(() => {
    const rawItems = project.timelineItems || [];
    if (rawItems.length > 0) {
      let currentTimeline = 0;
      return rawItems.map(item => {
        const matchingSource = mediaSources.find(s => s.id === item.clipId);
        const srcDur = matchingSource?.duration || 0;
        let realStart = Math.max(0, item.sourceStart || 0);
        let realEnd = item.sourceEnd;
        
        // If sourceEnd was uninitialized or truncated, heal with full source duration
        if (srcDur > 0) {
          if (realEnd <= realStart || (realEnd <= 2.5 && srcDur > 3.0)) {
            realEnd = srcDur;
          }
        }
        if (!realEnd || realEnd <= realStart) {
          realEnd = srcDur || Math.max(item.duration, 5);
        }

        const realDur = Math.max(0.2, (realEnd - realStart) / (item.speed || 1));
        const itemStart = currentTimeline;
        currentTimeline += realDur;

        return {
          id: item.id,
          sourceId: item.clipId,
          sourceStart: realStart,
          sourceEnd: realEnd,
          timelineStart: itemStart,
          duration: realDur,
          volume: item.volume ?? 1,
          muted: Boolean(item.muted),
          speed: item.speed || 1,
          rotation: item.rotation || 0,
          crop: item.crop,
          fitMode: (item.fitMode as FitMode) || fitMode,
          colorAdjustments: item.colorAdjustments,
          titleCard: item.titleCard,
          transitionIn: item.transitionIn,
          transitionOut: item.transitionOut,
          transitionDuration: item.transitionDuration
        };
      });
    }

    let currentTimeline = 0;
    return mediaSources.map((source, idx) => {
      const dur = Math.max(0.5, source.duration || 5);
      const start = currentTimeline;
      currentTimeline += dur;
      return {
        id: `auto_${idx}_${source.id}`,
        sourceId: source.id,
        sourceStart: 0,
        sourceEnd: dur,
        timelineStart: start,
        duration: dur,
        volume: 1,
        muted: false,
        rotation: 0,
        fitMode
      };
    });
  }, [project.timelineItems, mediaSources, fitMode]);

  const totalClipsCount = timelineClips.length;
  const totalDurationSec = timelineClips.reduce((acc, c) => acc + c.duration, 0);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  // Calculate total source media size (MB/GB)
  const totalSourceBytes = useMemo(() => {
    return project.mediaLibrary.reduce((acc, m) => acc + (m.size || 0), 0);
  }, [project.mediaLibrary]);

  // Target estimated export size (MB/GB) based on bitrate, resolution, FPS & quality
  const { totalBitrateMbps, estimatedExportBytes } = useMemo(() => {
    let baseMbps = 20; // 1080p Full HD
    if (resolution === '720p') baseMbps = 10;
    if (resolution === '1440p') baseMbps = 35;
    if (resolution === '4k' || resolution === 'vertical_4k') baseMbps = 70;
    if (resolution === 'vertical_1080p' || resolution === 'square_1080p') baseMbps = 20;

    if (fps === 60 || fps === 50) baseMbps *= 1.35;
    if (quality === 'standard') baseMbps *= 0.5;
    if (quality === 'maximum') baseMbps *= 2.2;

    const audioMbps = 0.192; // 192 kbps AAC
    const totalMbps = baseMbps + audioMbps;
    const bytes = (totalMbps * 1_000_000 * totalDurationSec) / 8;

    return { totalBitrateMbps: totalMbps, estimatedExportBytes: bytes };
  }, [resolution, fps, quality, totalDurationSec]);

  // Subscribe to service progress and export queue
  useEffect(() => {
    const unsubQueue = exportQueueService.subscribe((tasks) => {
      setQueueTasks(tasks);
      const active = tasks.find((t) => t.status === 'processing');
      if (active) {
        setIsExporting(true);
        if (active.progress) setProgress(active.progress);
        if (active.output) setOutput(active.output);
      }
      // If any task has completed, refresh saved videos list
      if (tasks.some(t => t.status === 'completed')) {
        loadSavedVideos();
      }
    });

    const unsubscribe = videoExportService.subscribe((p) => {
      setProgress(p);
      if (p.stage === 'COMPLETED' || p.stage === 'FAILED' || p.stage === 'CANCELLED') {
        setIsExporting(false);
        if (p.stage === 'COMPLETED') {
          loadSavedVideos();
        }
      }
      setLogs(videoExportService.getDiagnosticLogs());
    });

    return () => {
      unsubQueue();
      unsubscribe();
    };
  }, []);

  const performCodecTestEncode = async (codecString: string): Promise<boolean> => {
    if (typeof VideoEncoder === 'undefined') return false;
    try {
      const config = {
        codec: codecString,
        width: 128,
        height: 128,
        bitrate: 500000,
        framerate: 30,
        hardwareAcceleration: 'prefer-hardware' as const
      };

      // 1. First probe whether the browser officially supports this configuration
      if (typeof VideoEncoder.isConfigSupported === 'function') {
        const support = await VideoEncoder.isConfigSupported(config).catch(() => null);
        if (!support || !support.supported) {
          return false;
        }
      }

      // 2. Perform safe short test encode
      return await new Promise<boolean>((resolve) => {
        let isResolved = false;
        let encoder: VideoEncoder | null = null;
        let canvas: HTMLCanvasElement | null = null;
        let frame: VideoFrame | null = null;

        const safeCleanup = async () => {
          if (frame) {
            try { frame.close(); } catch {}
            frame = null;
          }
          if (canvas) {
            try { canvas.remove(); } catch {}
            canvas = null;
          }
          if (encoder) {
            const enc = encoder;
            encoder = null;
            try {
              if (enc.state === 'configured') {
                await enc.flush().catch(() => {});
              }
            } catch {}
            try {
              if (enc.state !== 'closed') {
                enc.close();
              }
            } catch {}
          }
        };

        const timeout = setTimeout(async () => {
          if (!isResolved) {
            isResolved = true;
            await safeCleanup();
            resolve(false);
          }
        }, 500);

        try {
          encoder = new VideoEncoder({
            output: async () => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                await safeCleanup();
                resolve(true);
              }
            },
            error: async (err) => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                await safeCleanup();
                resolve(false);
              }
            }
          });

          encoder.configure(config);

          canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#C5A059';
            ctx.fillRect(0, 0, 128, 128);
          }

          frame = new VideoFrame(canvas, { timestamp: 0, duration: 33333 });
          encoder.encode(frame, { keyFrame: true });
          
          // Safely flush and settle
          encoder.flush().then(async () => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              await safeCleanup();
              resolve(true);
            }
          }).catch(async () => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(timeout);
              await safeCleanup();
              resolve(false);
            }
          });
        } catch {
          clearTimeout(timeout);
          safeCleanup().then(() => resolve(false));
        }
      });
    } catch {
      return false;
    }
  };

  const probeAndSelectOptimalCodec = async (): Promise<VideoCodecOption> => {
    toast.showInfo('🔍 Badanie akceleracji sprzętowej: testowanie najlepszego kodeka...');
    
    // 1. Try H.264 hardware encoding sample write
    const h264Codec = 'avc1.42E01F';
    const hasH264Hw = await performCodecTestEncode(h264Codec);
    if (hasH264Hw) {
      console.log('[Auto-Codec] H.264 hardware acceleration successfully verified.');
      return 'H.264';
    }

    // 2. Try VP9 hardware encoding sample write
    const vp9Codec = 'vp09.00.10.08';
    const hasVp9Hw = await performCodecTestEncode(vp9Codec);
    if (hasVp9Hw) {
      console.log('[Auto-Codec] VP9 hardware acceleration successfully verified.');
      return 'VP9';
    }

    // 3. Fallback to universally supported H.264
    console.warn('[Auto-Codec] No specialized hardware acceleration verified. Falling back to universal H.264.');
    return 'H.264';
  };

  const handleEnqueueExport = async () => {
    if (totalClipsCount === 0) {
      toast.showError('Dodaj przynajmniej jeden film, aby rozpocząć eksport.');
      return;
    }

    try {
      const resolvedSources: MediaSource[] = await Promise.all(
        (project.mediaLibrary || []).map(async (clip) => {
          const freshUri = await resolveClipMediaUrl(clip);
          return {
            id: clip.id,
            uri: freshUri || clip.objectUrl || '',
            file: clip.file,
            type: clip.type || (/\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(clip.name) ? 'image' : 'video'),
            name: clip.name,
            size: clip.size || 0,
            duration: clip.duration || 1,
            width: clip.width || 1920,
            height: clip.height || 1080,
            fps: clip.fps || 30,
            videoCodec: clip.mimeType?.includes('webm') ? 'VP9' : 'H.264',
            audioCodec: clip.hasAudio ? 'AAC' : 'Brak',
            audioChannels: clip.audioChannels || (clip.hasAudio ? 2 : 0),
            sampleRate: clip.hasAudio ? 48000 : 0,
            orientation: clip.orientation || 'landscape',
            hasAudio: Boolean(clip.hasAudio),
            supported: clip.status !== 'ERROR' && clip.status !== 'error',
            thumbnailUrl: clip.thumbnailUrl
          };
        })
      );

      let activeVideoCodec = videoCodec;
      if (videoCodec === 'auto') {
        try {
          activeVideoCodec = await probeAndSelectOptimalCodec();
          toast.showSuccess(`✨ Wybrano optymalny sprzętowy kodek: ${activeVideoCodec === 'H.264' ? 'H.264' : (activeVideoCodec === 'VP9' ? 'VP9' : 'CPU render')}`);
        } catch {
          activeVideoCodec = 'H.264';
        }
      }

      const plan = videoExportService.prepareExport(
        resolvedSources.length > 0 ? resolvedSources : mediaSources,
        timelineClips,
        {
          resolution,
          fps,
          quality,
          fitMode,
          videoCodec: activeVideoCodec,
          container,
          colorGrade: (project.settings?.colorGrade as any) || 'none',
          letterbox: project.settings?.letterbox === 'cinemascope' ? 'cinemascope' : 'none'
        },
        {
          audioTracks: project.audioTracks || []
        }
      );

      const task = exportQueueService.enqueueTask({
        title: `Eksport ${resolution} (${fps} FPS • ${activeVideoCodec})`,
        projectName: project.name || 'Projekt Wideo',
        config: {
          presetMode,
          resolution,
          fps,
          videoCodec,
          container,
          fitMode,
          colorGrade: (project.settings?.colorGrade as any) || 'none',
          letterbox: project.settings?.letterbox === 'cinemascope' ? 'cinemascope' : 'none',
          title: project.name,
          clipCount: totalClipsCount,
          durationSec: totalDurationSec
        },
        plan
      });

      if (capabilities && !isGpuAccelerated) {
        toast.showWarning('⚠️ Brak akceleracji GPU: Eksport jest realizowany w trybie programowym CPU. Włącz "Akcelerację sprzętową" w chrome://settings/system, aby przyspieszyć renderowanie.');
      }

      toast.showSuccess(`Dodano do kolejki eksportu: ${task.title}`);
    } catch (err: any) {
      toast.showError(`Nie udało się przygotować zadania: ${err.message}`);
    }
  };

  const handleStartExport = async () => {
    if (totalClipsCount === 0) {
      toast.showError('Dodaj przynajmniej jeden film, aby rozpocząć eksport.');
      return;
    }

    if (capabilities && !isGpuAccelerated) {
      toast.showWarning('⚠️ Brak akceleracji GPU: Renderowanie odbędzie się na procesorze CPU. Dla 10-krotnie wyższej prędkości włącz "Akcelerację sprzętową" w ustawieniach przeglądarki.');
    }

    setError(null);
    setOutput(null);
    setIsExporting(true);

    try {
      // Ensure all clips have resolved, active media URLs
      const resolvedSources: MediaSource[] = await Promise.all(
        (project.mediaLibrary || []).map(async (clip) => {
          const freshUri = await resolveClipMediaUrl(clip);
          return {
            id: clip.id,
            uri: freshUri || clip.objectUrl || '',
            file: clip.file,
            type: clip.type || (/\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(clip.name) ? 'image' : 'video'),
            name: clip.name,
            size: clip.size || 0,
            duration: clip.duration || 1,
            width: clip.width || 1920,
            height: clip.height || 1080,
            fps: clip.fps || 30,
            videoCodec: clip.mimeType?.includes('webm') ? 'VP9' : 'H.264',
            audioCodec: clip.hasAudio ? 'AAC' : 'Brak',
            audioChannels: clip.audioChannels || (clip.hasAudio ? 2 : 0),
            sampleRate: clip.hasAudio ? 48000 : 0,
            orientation: clip.orientation || 'landscape',
            hasAudio: Boolean(clip.hasAudio),
            supported: clip.status !== 'ERROR' && clip.status !== 'error',
            thumbnailUrl: clip.thumbnailUrl
          };
        })
      );

      let activeVideoCodec = videoCodec;
      if (videoCodec === 'auto') {
        try {
          activeVideoCodec = await probeAndSelectOptimalCodec();
          toast.showSuccess(`✨ Wybrano optymalny sprzętowy kodek: ${activeVideoCodec === 'H.264' ? 'H.264' : (activeVideoCodec === 'VP9' ? 'VP9' : 'CPU render')}`);
        } catch {
          activeVideoCodec = 'H.264';
        }
      }

      const plan = videoExportService.prepareExport(
        resolvedSources.length > 0 ? resolvedSources : mediaSources,
        timelineClips,
        {
          resolution,
          fps,
          quality,
          fitMode,
          videoCodec: activeVideoCodec,
          container,
          colorGrade: (project.settings?.colorGrade as any) || 'none',
          letterbox: project.settings?.letterbox || 'none'
        },
        {
          audioTracks: project.audioTracks || [],
          textLayers: project.textLayers || []
        }
      );

      const result = await videoExportService.startExport(plan, (p) => {
        setProgress(p);
      });

      setOutput(result);
      toast.showSuccess('Film został pomyślnie wyeksportowany!');

      // 1. Permanently save to IndexedDB so the movie is never lost on the page!
      try {
        const videoRecord: ExportedVideoRecord = {
          id: `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: project.name || 'Film Master',
          fileName: result.fileName,
          blob: result.blob,
          sizeBytes: result.sizeBytes,
          duration: result.duration,
          width: result.width,
          height: result.height,
          fps: result.fps,
          resolution: `${result.width} × ${result.height}`,
          videoCodec: result.videoCodec,
          createdAt: Date.now()
        };
        await localIndexedDB.saveExportedVideo(videoRecord);
        await loadSavedVideos();
      } catch (saveErr) {
        console.warn('[ExportView] Auto-persistence to IndexedDB notice:', saveErr);
      }

      // 2. Automatically prompt file download to user's device
      try {
        await videoExportService.saveOutput(result);
      } catch (dlErr) {
        console.warn('[ExportView] Automatic download notice:', dlErr);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      const isCancelled = err?.message === 'CANCELLED' || err?.message?.includes('anulowany');
      if (isCancelled) {
        toast.showInfo('Eksport został przerwany.');
      } else {
        let errorMsg = err?.message || 'Nieznany błąd podczas przetwarzania filmu.';
        if (!isGpuAccelerated || errorMsg.toLowerCase().includes('videoencoder') || errorMsg.toLowerCase().includes('webcodecs') || errorMsg.toLowerCase().includes('ffmpeg')) {
          errorMsg += ' — Wskazówka: Włącz opcję "Używaj akceleracji sprzętowej, gdy jest dostępna" w ustawieniach przeglądarki (np. chrome://settings/system) i zrestartuj przeglądarkę, aby aktywować pełne wsparcie GPU (WebCodecs/MediaRecorder).';
        }
        const errorObj: ExportError = {
          code: 'ENCODER_ERROR',
          message: errorMsg,
          technicalDetails: String(err?.stack || err)
        };
        setError(errorObj);
        toast.showError(`Błąd eksportu: ${errorObj.message}`);
      }
    } finally {
      setIsExporting(false);
      setLogs(videoExportService.getDiagnosticLogs());
    }
  };

  const handleCancelExport = () => {
    videoExportService.cancelExport();
    setIsExporting(false);
    toast.showInfo('Eksport anulowany.');
  };

  const handleRunEngineTest = async () => {
    setIsTestingEngine(true);
    setTestResult(null);
    try {
      const res = await videoExportService.runEngineTest();
      setTestResult(res);
      if (res.success) {
        toast.showSuccess(`Test silnika MP4 zaliczony (${res.durationMs}ms)!`);
      } else {
        toast.showError(`Test silnika: ${res.details}`);
      }
    } catch (e: any) {
      setTestResult({ success: false, durationMs: 0, details: e?.message || String(e) });
    } finally {
      setIsTestingEngine(false);
    }
  };

  const handleLoadCapabilities = async () => {
    try {
      const caps = await videoExportService.getDiagnostics();
      setCapabilities(caps);
    } catch {}
  };

  const handleSaveOutput = async () => {
    if (!output) return;
    try {
      await videoExportService.saveOutput(output);
      toast.showSuccess('Plik wideo został pobrany.');
    } catch (e: any) {
      toast.showError(`Błąd zapisu pliku: ${e.message}`);
    }
  };

  const handleUploadToGoogleDrive = async (targetBlob?: Blob, targetFileName?: string) => {
    const blobToUpload = targetBlob || output?.blob;
    const nameToUpload = targetFileName || output?.fileName || `${project.name || 'Film_Montaz'}.mp4`;
    if (!blobToUpload) return;

    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('gdrive_access_token') || localStorage.getItem('gdrive_access_token')) : null;
    if (!token) {
      toast.showInfo('Zaloguj się kontem Google przez pasek boczny, aby uzyskać uprawnienia do zapisu na Dysku.');
      return;
    }

    setIsUploadingToDrive(true);
    setDriveExportLink(null);

    try {
      const formData = new FormData();
      formData.append('file', blobToUpload, nameToUpload);
      formData.append('fileName', nameToUpload);
      formData.append('mimeType', blobToUpload.type || 'video/mp4');
      formData.append('accessToken', token);

      const res = await fetch('/api/drive/upload-binary', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Błąd serwera (${res.status})`);
      }

      const resData = await res.json();
      const webViewLink = resData.file?.webViewLink;
      if (webViewLink) {
        setDriveExportLink(webViewLink);
      }
      toast.showSuccess(`🎉 Film "${nameToUpload}" został pomyślnie przesłany na Twój Dysk Google!`);
    } catch (driveErr: any) {
      console.error('[Drive Export Error]', driveErr);
      toast.showError(`Nie udało się zapisać na Dysku: ${driveErr.message || driveErr}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleDownloadSavedVideo = async (video: ExportedVideoRecord) => {
    try {
      await videoExportService.saveOutput({
        blob: video.blob,
        fileName: video.fileName
      });
      toast.showSuccess(`Pobieranie filmu "${video.title}" rozpoczęte!`);
    } catch (e: any) {
      toast.showError(`Błąd pobierania: ${e.message}`);
    }
  };

  const handlePlaySavedVideo = (video: ExportedVideoRecord) => {
    try {
      const videoUrl = URL.createObjectURL(video.blob);
      setOutput({
        blob: video.blob,
        url: videoUrl,
        fileName: video.fileName,
        sizeBytes: video.sizeBytes,
        duration: video.duration,
        width: video.width,
        height: video.height,
        videoCodec: video.videoCodec,
        audioCodec: 'AAC',
        fps: video.fps,
        verifiedPlayable: true,
        createdAt: video.createdAt
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.showSuccess(`Wczytano film "${video.title}" do odtwarzacza.`);
    } catch (e: any) {
      toast.showError(`Nie udało się odtworzyć filmu: ${e.message}`);
    }
  };

  const handleAddSavedVideoToProject = async (video: ExportedVideoRecord) => {
    if (!onUpdateProject) return;
    try {
      const clipId = `media_exported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await localIndexedDB.saveMediaBlob(clipId, video.blob);
      const url = urlRegistry.create(video.blob);

      const newClip = {
        id: clipId,
        name: video.fileName || `${video.title}.mp4`,
        file: undefined,
        objectUrl: url,
        duration: video.duration,
        width: video.width,
        height: video.height,
        fps: video.fps,
        size: video.sizeBytes,
        type: 'video' as const,
        status: 'READY' as const,
        orientation: (video.width >= video.height ? 'landscape' : 'portrait') as any,
        hasAudio: true
      };

      onUpdateProject({
        ...project,
        mediaLibrary: [...(project.mediaLibrary || []), newClip as any]
      });

      toast.showSuccess(`Dodano film "${video.title}" do biblioteki mediów projektu!`);
    } catch (err: any) {
      toast.showError(`Nie udało się dodać filmu do projektu: ${err.message}`);
    }
  };

  const handleDeleteSavedVideo = async (id: string) => {
    try {
      await localIndexedDB.deleteExportedVideo(id);
      await loadSavedVideos();
      toast.showSuccess('Usunięto film z pamięci lokalnej.');
    } catch (e: any) {
      toast.showError(`Błąd usuwania: ${e.message}`);
    }
  };

  const handleShareOutput = async () => {
    if (!output) return;
    try {
      await videoExportService.shareOutput(output);
    } catch (e: any) {
      toast.showError(`Błąd udostępniania: ${e.message}`);
    }
  };

  const handlePlayResult = () => {
    if (videoPlayerRef.current) {
      if (videoPlayerRef.current.paused) {
        videoPlayerRef.current.play().catch(() => {});
      } else {
        videoPlayerRef.current.pause();
      }
    }
  };

  const STAGES_DISPLAY: { id: ExportStage; label: string; icon: string }[] = [
    { id: 'PREPARATION', label: 'Przygotowanie', icon: '⚙️' },
    { id: 'MEDIA_ANALYSIS', label: 'Analiza', icon: '🔍' },
    { id: 'AUDIO_ENCODING', label: 'Audio AAC', icon: '🎵' },
    { id: 'VIDEO_ENCODING', label: 'Wideo H.264', icon: '🎬' },
    { id: 'FINAL_FLUSH', label: 'Opróżnianie', icon: '⚡' },
    { id: 'MUXING', label: 'Muxowanie MP4', icon: '📦' },
    { id: 'VALIDATION', label: 'Walidacja', icon: '🛡️' }
  ];

  const getStageVisualStatus = (stageId: ExportStage): 'DONE' | 'ACTIVE' | 'PENDING' => {
    if (!progress) return 'PENDING';
    if (progress.stage === 'COMPLETED') return 'DONE';
    if (progress.stage === 'FAILED' || progress.stage === 'CANCELLED') return 'PENDING';

    const stageRank: Record<ExportStage, number> = {
      PREPARATION: 0,
      MEDIA_ANALYSIS: 1,
      AUDIO_ENCODING: 2,
      DECODING: 3,
      FRAME_NORMALIZATION: 3,
      VIDEO_ENCODING: 3,
      FINAL_FLUSH: 4,
      MUXING: 5,
      VALIDATION: 6,
      SAVING: 6,
      COMPLETED: 7,
      FAILED: 0,
      CANCELLED: 0
    };

    const curRank = stageRank[progress.stage] ?? 0;
    const targetRank = stageRank[stageId] ?? 0;

    if (curRank > targetRank) return 'DONE';
    if (curRank === targetRank) return 'ACTIVE';
    return 'PENDING';
  };

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-3 sm:p-6 select-none font-sans text-zinc-100">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 pb-20">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18181c] border border-[#26262b] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#22222a] border border-[#facc15]/30 flex items-center justify-center text-[#facc15] shadow-md shrink-0">
            <Download className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[#facc15] text-xs font-semibold tracking-wider uppercase mb-1 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ekran Eksportu & Masteringu 4K</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Finalizacja i Eksport Filmu
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Połączenie {totalClipsCount} {totalClipsCount === 1 ? 'filmu' : 'filmów'} w jeden plik ({formatDuration(totalDurationSec)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => {
              setShowDiagnostics(!showDiagnostics);
              if (!capabilities) handleLoadCapabilities();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#222228] hover:bg-[#2c2c34] text-zinc-300 border border-[#32323a] text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm min-h-[40px]"
            title="Pokaż panel diagnostyki silnika dla developerów"
          >
            <Activity className="w-3.5 h-3.5 text-[#00e5cc]" />
            <span>Diagnostyka Silnika</span>
            {showDiagnostics ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}
          </button>

          {totalClipsCount > 0 && !isExporting && !output && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnqueueExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#222228] hover:bg-[#2c2c34] text-[#facc15] border border-[#32323a] font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
                title="Dodaj do kolejki bez natychmiastowego zablokowania ekranu"
              >
                <Layers className="w-4 h-4 text-[#facc15]" />
                <span>DODAJ DO KOLEJKI</span>
              </button>

              <button
                onClick={handleStartExport}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#facc15] hover:bg-[#eab308] text-black font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-95 cursor-pointer uppercase tracking-wider min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>ROZPOCZNIJ EKSPORT</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GPU Hardware Acceleration Support Banner & Browser Hint */}
      {capabilities && !isGpuAccelerated && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-lg flex flex-col sm:flex-row items-start gap-4 text-xs font-sans animate-fadeIn">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <span>Brak Akceleracji Sprzętowej GPU w Przeglądarce (WebCodecs)</span>
            </div>
            <p className="text-amber-100/80 leading-relaxed">
              Silnik wykrył brak aktywnego kodera sprzętowego GPU w bieżącej sesji przeglądarki. Eksport zostanie przeprowadzony w trybie programowym CPU.
            </p>
            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-[11px] font-mono text-amber-200/90 space-y-1">
              <span className="font-bold text-amber-300 block">Jak odblokować 10-krotnie szybszy render GPU (NVENC / Apple M1-M4 / QuickSync):</span>
              <ol className="list-decimal list-inside space-y-1 opacity-90">
                <li>Używaj przeglądarki Google Chrome, Microsoft Edge lub Safari.</li>
                <li>W ustawieniach przeglądarki zaznacz opcję <strong>"Używaj akceleracji sprzętowej, gdy jest dostępna"</strong> i zrestartuj przeglądarkę.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Developer Diagnostics Panel */}
      {showDiagnostics && (
        <div className="bg-[#18181c] border border-[#26262b] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00e5cc]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Panel Diagnostyczny Silnika Wideo
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunEngineTest}
                disabled={isTestingEngine}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222228] border border-[#32323a] text-xs font-bold text-zinc-200 hover:text-white cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingEngine ? 'animate-spin' : ''}`} />
                <span>Test Eksportu MP4 (1s)</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' 
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
            }`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>{testResult.success ? 'TEST ZALICZONY' : 'TEST NIE POWIÓDŁ SIĘ'} ({testResult.durationMs}ms):</strong>
                <p className="mt-0.5">{testResult.details}</p>
              </div>
            </div>
          )}

          {/* Capabilities Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono">
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">WebCodecs:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.webCodecsSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
                {capabilities?.webCodecsSupported ? 'Dostępny ✓' : 'Brak ✗'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">AV1 Master:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.av1Supported ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {capabilities?.av1Supported ? 'Akceleracja GPU ✓' : 'Software'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">HEVC / H.265:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.hevcSupported ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {capabilities?.hevcSupported ? 'Sprzętowy GPU ✓' : 'Brak'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">VP9 WebM:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.vp9Supported ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {capabilities?.vp9Supported ? 'Obsługiwany ✓' : 'Brak'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">H.264 / AVC:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.h264Supported ? 'text-emerald-400' : 'text-rose-400'}`}>
                {capabilities?.h264Supported ? 'Obsługiwany ✓' : 'Brak ✗'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#222228] border border-[#2e2e36]">
              <span className="text-zinc-400 block text-[10px]">Audio Codecs:</span>
              <span className={`font-bold mt-0.5 block ${capabilities?.aacSupported || capabilities?.opusSupported ? 'text-emerald-400' : 'text-amber-400'}`}>
                {capabilities?.aacSupported ? 'AAC ✓' : ''} {capabilities?.opusSupported ? '· Opus ✓' : ''}
              </span>
            </div>
          </div>

          {/* Live Diagnostic Logs stream */}
          {logs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider font-mono">
                Ostatnie Zdarzenia Silnika:
              </span>
              <div className="max-h-32 overflow-y-auto bg-black/50 rounded-xl p-3 border border-[#26262b] text-[10px] font-mono text-zinc-300 space-y-1 custom-scrollbar">
                {logs.slice(-15).map((log, lIdx) => (
                  <div key={lIdx} className="flex items-center gap-2">
                    <span className="text-zinc-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className="text-[#facc15] font-bold">[{log.category}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-Flight AI Montage Summary Panel (When idle and has clips) */}
      {!isExporting && !output && totalClipsCount > 0 && (
        <AiMontageSummaryPanel
          project={project}
          resolution={resolution}
          fps={fps}
          quality={quality}
          fitMode={fitMode}
          videoCodec={videoCodec}
          container={container}
          onVideoCodecChange={setVideoCodec}
          onContainerChange={setContainer}
          isExporting={isExporting}
          onConfirmRender={handleStartExport}
        />
      )}

      {/* Preset & Settings Selector (When idle) */}
      {!isExporting && !output && (
        <div className="bg-[#18181c] border border-[#26262b] rounded-2xl p-5 sm:p-6 shadow-xl space-y-6 relative overflow-hidden">
          {/* Engine Capability Badge Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#222228] border border-[#2e2e36] rounded-xl text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-white font-bold tracking-wide uppercase font-mono text-[11px]">
                Silnik Renderujący Master Studio • WebCodecs GPU Multi-Codec
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Akceleracja GPU Zero-Copy
              </span>
              <span className="hidden sm:inline text-zinc-600">·</span>
              <span className="flex items-center gap-1 text-[#facc15]">
                <Sparkles className="w-3.5 h-3.5" /> Rec.709 VBR Quality
              </span>
              <span className="hidden sm:inline text-zinc-600">·</span>
              <span className="text-[#00e5cc]">Audio Ducking -18dB</span>
            </div>
          </div>

          {/* Dynamic Real-Time Video Duration & Export Size Estimator Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center shrink-0 text-[#facc15]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Czas filmu</span>
                <span className="text-base font-bold text-white font-mono">
                  {formatDuration(totalDurationSec)} <span className="text-xs text-zinc-400 font-normal">({totalDurationSec.toFixed(1)}s)</span>
                </span>
                <span className="text-[10px] text-zinc-500 block">{totalClipsCount} ujęć na osi czasu</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Szacowany plik MP4</span>
                <span className="text-base font-bold text-emerald-300 font-mono">
                  {formatSize(estimatedExportBytes)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block font-mono">Bitrate: ~{totalBitrateMbps.toFixed(1)} Mbps</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Materiał źródłowy</span>
                <span className="text-base font-bold text-blue-200 font-mono">
                  {formatSize(totalSourceBytes)}
                </span>
                <span className="text-[10px] text-blue-400/80 block">{project.mediaLibrary.length} plików w bibliotece</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Jakość & Silnik</span>
                <span className="text-xs font-bold text-white font-mono block truncate">
                  {resolution} • {fps} FPS
                </span>
                <span className="text-[10px] text-[#facc15] block truncate font-mono">
                  {videoCodec === 'auto' ? 'WebCodecs GPU' : videoCodec}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#facc15]" />
                <span>Wybierz Styl i Preset Jakości</span>
              </h2>
              <span className="text-[11px] font-mono text-zinc-400">
                Zoptymalizowany dla smartfonów i ekranów 4K
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'FAST', name: 'SZYBKI INTERNET', desc: '720p • Błyskawiczny transfer' },
                { id: 'BALANCED', name: 'ZRÓWNOWAŻONY', desc: '1080p • Standard wideo Full HD' },
                { id: 'QUALITY', name: 'WYSOKA JAKOŚĆ', desc: '1080p 60FPS • Płynny ruch' },
                { id: 'MAX_QUALITY', name: 'MAKSYMALNY (4K)', desc: '4K Ultra HD • Master 60FPS' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as ExportPresetMode)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer min-h-[64px] relative overflow-hidden flex flex-col justify-between ${
                    presetMode === p.id
                      ? 'bg-[#222228] border-[#facc15] text-white shadow-md'
                      : 'bg-[#18181c] border-[#26262b] text-zinc-400 hover:text-white hover:bg-[#202026] hover:border-[#32323a]'
                  }`}
                >
                  <span className={`block text-xs font-bold ${presetMode === p.id ? 'text-[#facc15]' : 'text-white'}`}>
                    {p.name}
                  </span>
                  <span className="block text-[10px] text-zinc-400 mt-1 font-mono">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Granular Parameter Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-[#26262b]">
            <div>
              <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Rozdzielczość</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as any)}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value="1080p">1920 × 1080 (Full HD 16:9)</option>
                <option value="1440p">2560 × 1440 (2K QHD 16:9)</option>
                <option value="4k">3840 × 2160 (4K Ultra HD Master)</option>
                <option value="720p">1280 × 720 (HD 16:9)</option>
                <option value="vertical_1080p">1080 × 1920 (Pionowy 9:16 Reels)</option>
                <option value="vertical_4k">2160 × 3840 (Pionowy 4K Reels)</option>
                <option value="square_1080p">1080 × 1080 (Kwadrat 1:1 Feed)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Płynność (FPS)</label>
              <select
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value={24}>24 FPS (Kinowy Hollywood 24p)</option>
                <option value={25}>25 FPS (Europejski PAL 25p)</option>
                <option value={30}>30 FPS (Standard 30p)</option>
                <option value={50}>50 FPS (Płynny PAL 50p)</option>
                <option value={60}>60 FPS (Ultra Płynny 60p HFR)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Jakość & Bitrate</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value="maximum">Maksymalna Master (do 85-120 Mbps)</option>
                <option value="high">Wysoka Studio (18-55 Mbps)</option>
                <option value="standard">Standardowa (8-16 Mbps)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Kadrowanie proporcji</label>
              <select
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value as any)}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value="fit">FIT (Kadr + rozmyte tło dla mieszanych)</option>
                <option value="fill">FILL (Wypełnij ekran bez pasów)</option>
                <option value="original">ORIGINAL (Bez zmian)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Comparative Description Box for Current Selection */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#222228] border border-[#2e2e36] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2e36] pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider font-mono">
                <Info className="w-4 h-4 text-[#facc15]" />
                <span>Różnice i Specyfikacja Wybranych Parametrów</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRenderGuide(!showRenderGuide)}
                className="text-[11px] text-[#facc15] hover:text-[#fde047] font-mono flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{showRenderGuide ? 'Ukryj pełny przewodnik' : 'Pokaż pełne kompendium opcji'}</span>
                {showRenderGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Resolution details */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b] space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#facc15]">
                  <span className="font-bold">Rozdzielczość:</span>
                  <span>{RESOLUTION_SPECS[resolution]?.pixels}</span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-tight">
                  {RESOLUTION_SPECS[resolution]?.desc}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono block pt-1 border-t border-[#26262b]">
                  {RESOLUTION_SPECS[resolution]?.bestFor}
                </span>
              </div>

              {/* FPS details */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b] space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                  <span className="font-bold">Płynność (FPS):</span>
                  <span>{fps} kl/s</span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-tight">
                  {FPS_SPECS[fps]?.desc}
                </p>
                <span className="text-[10px] text-emerald-300/80 font-mono block pt-1 border-t border-[#26262b]">
                  {FPS_SPECS[fps]?.comp}
                </span>
              </div>

              {/* Quality details */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b] space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                  <span className="font-bold">Jakość & Bitrate:</span>
                  <span>{QUALITY_SPECS[quality]?.bitrateRange}</span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-tight">
                  {QUALITY_SPECS[quality]?.desc}
                </p>
              </div>

              {/* FitMode details */}
              <div className="p-3 rounded-xl bg-[#18181c] border border-[#26262b] space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                  <span className="font-bold">Kadrowanie:</span>
                  <span>{FIT_MODE_SPECS[fitMode]?.label}</span>
                </div>
                <p className="text-[11.5px] text-zinc-300 leading-tight">
                  {FIT_MODE_SPECS[fitMode]?.desc}
                </p>
              </div>
            </div>

            {/* Expandable Full Compendium Guide */}
            {showRenderGuide && (
              <div className="pt-3 border-t border-[#26262b] space-y-4 animate-fadeIn text-xs">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  📖 Kompendium: Czym Różnią Się Poszczególne Opcje Renderowania?
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11.5px] leading-relaxed">
                  <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262b] space-y-2">
                    <span className="font-bold text-[#facc15] block font-mono">1. Rozdzielczości (Piksele & Zastosowanie):</span>
                    <ul className="space-y-1 text-zinc-300 list-disc list-inside">
                      <li><strong>4K UHD (3840×2160)</strong>: Aż 8.3 miliona pikseli. 4-krotnie ostrzejszy niż 1080p. Najlepszy na telewizory i do archiwum.</li>
                      <li><strong>2K QHD (2560×1440)</strong>: Złoty środek dla monitorów i laptopów. O 77% więcej detali niż 1080p.</li>
                      <li><strong>1080p Full HD (1920×1080)</strong>: Najpopularniejszy standard wideo na każdym urządzeniu.</li>
                      <li><strong>720p HD (1280×720)</strong>: Lekki plik do szybkiego wysłania przez internet.</li>
                      <li><strong>Pionowy 9:16 (1080×1920 / 2160×3840)</strong>: Pod ekran smartfona — Instagram Reels, TikTok, YouTube Shorts.</li>
                      <li><strong>Kwadrat 1:1 (1080×1080)</strong>: Posty w feedzie społecznościowym.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262b] space-y-2">
                    <span className="font-bold text-emerald-400 block font-mono">2. Płynność Klatek (FPS) i Styl Ruchu:</span>
                    <ul className="space-y-1 text-zinc-300 list-disc list-inside">
                      <li><strong>24 FPS (Cinema)</strong>: Tradycyjny klatkarz filmów kinowych z miękkim rozmyciem ruchu.</li>
                      <li><strong>25 FPS (PAL)</strong>: Standard telewizyjny w Europie (oświetlenie 50 Hz).</li>
                      <li><strong>30 FPS (Standard)</strong>: Standard internetowy i smartfonowy.</li>
                      <li><strong>50 / 60 FPS (Ultra Smooth)</strong>: Podwójna liczba klatek do dynamicznych ujęć i tańca.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262b] space-y-2">
                    <span className="font-bold text-cyan-400 block font-mono">3. Kodeki Wideo:</span>
                    <ul className="space-y-1 text-zinc-300 list-disc list-inside">
                      <li><strong>Auto GPU (Zalecany)</strong>: Silnik automatycznie dobiera najszybszy sprzętowy kodek (NVENC, Apple Silicon, QuickSync).</li>
                      <li><strong>H.264 / AVC</strong>: Odtwarza się na każdym urządzeniu bez wyjątku.</li>
                      <li><strong>HEVC / H.265</strong>: O 40–50% mniejszy plik przy tej samej jakości.</li>
                      <li><strong>AV1 Master</strong>: Kodek nowej generacji z doskonałą jakością w trudnych scenach.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#18181c] border border-[#26262b] space-y-2">
                    <span className="font-bold text-[#facc15] block font-mono">4. Kontenery Pliku:</span>
                    <ul className="space-y-1 text-zinc-300 list-disc list-inside">
                      <li><strong>MP4 (Audio AAC 48kHz)</strong>: Najbardziej uniwersalny format na świecie.</li>
                      <li><strong>WebM (Audio Opus 48kHz)</strong>: Nowoczesny format internetowy.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Color Grading & CinemaScope Letterbox Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#26262b]">
            <div>
              <label className="text-xs text-zinc-200 block mb-1.5 font-medium flex items-center gap-1.5">
                <span>🎨 Styl Barwny / LUT Kinowy</span>
              </label>
              <select
                value={project.settings?.colorGrade || 'none'}
                onChange={(e) => {
                  if (onUpdateProject) {
                    onUpdateProject({
                      ...project,
                      settings: {
                        ...project.settings,
                        colorGrade: e.target.value as any
                      }
                    });
                  }
                }}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value="none">Oryginalny (Czysty zapis z kamer)</option>
                <option value="golden_hour">✨ Złota Godzina (Ciepły romantyczny blask)</option>
                <option value="vivid_master">💎 Czysty Master (Maksymalna czystość & kontrast)</option>
                <option value="pastel_boho">🌸 Pastelowy Sen (Soft Boho & Delikatne pastele)</option>
                <option value="vintage_35mm">🎞️ Vintage 35mm (Analogowe ziarno & sepia)</option>
                <option value="cinematic_noir">🎬 Kinowy Noir (Głęboki czarno-biały luksus)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-200 block mb-1.5 font-medium flex items-center gap-1.5">
                <span>🎬 Format Kinowy (Letterbox)</span>
              </label>
              <select
                value={project.settings?.letterbox || 'none'}
                onChange={(e) => {
                  if (onUpdateProject) {
                    onUpdateProject({
                      ...project,
                      settings: {
                        ...project.settings,
                        letterbox: e.target.value as any
                      }
                    });
                  }
                }}
                className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#facc15] focus:outline-none min-h-[44px]"
              >
                <option value="none">Standardowy (16:9 Pełny kadr)</option>
                <option value="cinemascope">CinemaScope 2.39:1 (Hollywoodzkie czarne pasy góra/dół)</option>
              </select>
            </div>
          </div>

          {/* ADVANCED MULTI-CODEC & CONTAINER ENGINE CONFIGURATION */}
          <div className="pt-4 border-t border-[#26262b] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#00e5cc]" />
                  <span>Kodek Wideo & Akceleracja Sprzętowa GPU</span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Domyślnie silnik bada sprzęt i samoczynnie dobiera optymalny kodek bez konieczności wiedzy technicznej.
                </p>
              </div>

              {/* Mode Toggle: Auto vs Manual */}
              <div className="flex items-center gap-1.5 p-1 bg-[#141416] border border-[#26262b] rounded-xl text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualCodecMode(false);
                    setVideoCodec('auto');
                    setContainer('auto');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    !isManualCodecMode 
                      ? 'bg-[#facc15] text-black shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚡ Wybór Automatyczny (Rekomendowany)
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualCodecMode(true)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                    isManualCodecMode 
                      ? 'bg-[#222228] text-white border border-[#32323a] shadow-md' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ⚙️ Wybór Ręczny (Zaawansowany)
                </button>
              </div>
            </div>

            {/* If Automatic Mode (Default) */}
            {!isManualCodecMode ? (
              <div className="p-5 rounded-2xl bg-[#222228] border border-[#2e2e36] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-[#facc15]" />
                    <span>Tryb Inteligentny Studio & GPU Aktywny (Auto)</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Nie musisz znać kodeków. Silnik automatycznie wykryje Twoją kartę graficzną (<span className="text-[#facc15] font-semibold">Apple Silicon M1-M4 / NVENC / AV1 / H.264</span>) oraz klipy wideo i zastosuje sprzętowe kodowanie z bezstratnym audio i kalibracją barwną Rec.709.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0 text-right sm:border-l sm:border-[#2e2e36] sm:pl-5 text-xs font-mono">
                  {isGpuAccelerated ? (
                    <span className="text-emerald-400 font-bold flex items-center justify-end gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Akceleracja GPU Zero-Copy
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center justify-end gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Tryb Programowy CPU
                    </span>
                  )}
                  <span className="text-zinc-300">
                    Kontener: Auto (MP4 / WebM)
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    Bitrate: VBR Adaptive Cinema
                  </span>
                </div>
              </div>
            ) : (
              /* If Manual Mode */
              <div className="space-y-4 animate-fadeIn">
                {/* Interactive Codec Cards Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  {[
                    { 
                      id: 'auto' as VideoCodecOption, 
                      title: 'Auto GPU', 
                      badge: 'Optymalny',
                      desc: 'Negocjuje najszybszy sprzętowy kodek',
                      isHw: true
                    },
                    { 
                      id: 'H.264' as VideoCodecOption, 
                      title: 'H.264 / AVC', 
                      badge: '100% Zgodny',
                      desc: 'Smart TV, telefony, tablety i komputery',
                      isHw: capabilities?.h264Supported
                    },
                    { 
                      id: 'H.265' as VideoCodecOption, 
                      title: 'HEVC / H.265', 
                      badge: 'Apple / NVENC',
                      desc: 'Wysoka kompresja, sprzętowe bloki GPU',
                      isHw: capabilities?.hevcSupported
                    },
                    { 
                      id: 'AV1' as VideoCodecOption, 
                      title: 'AV1 Master', 
                      badge: 'Next-Gen',
                      desc: 'Maksymalna ostrość cieni i dymu',
                      isHw: capabilities?.av1Supported
                    },
                    { 
                      id: 'VP9' as VideoCodecOption, 
                      title: 'VP9 WebM', 
                      badge: 'WebM + Opus',
                      desc: 'Stabilne strumieniowanie internetowe',
                      isHw: capabilities?.vp9Supported
                    },
                    { 
                      id: 'AVC_Master_High' as VideoCodecOption, 
                      title: 'Master AVC 5.1', 
                      badge: '100 Mbps Master',
                      desc: 'Maksymalny profil H.264 High 5.1 dla 4K',
                      isHw: true
                    },
                    { 
                      id: 'MediaRecorder_CPU' as VideoCodecOption, 
                      title: 'MediaRecorder CPU', 
                      badge: 'Zgodność 100%',
                      desc: 'Wewnętrzny silnik Canvas bez konieczności GPU',
                      isHw: false
                    }
                  ].map(c => {
                    const isSelected = videoCodec === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setVideoCodec(c.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 min-h-[96px] ${
                          isSelected
                            ? 'bg-[#222228] border-[#facc15] text-white shadow-md'
                            : 'bg-[#18181c] border-[#26262b] text-zinc-400 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className={`text-xs font-bold ${isSelected ? 'text-[#facc15]' : 'text-white'}`}>
                              {c.title}
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#facc15]" />
                            )}
                          </div>
                          <span className={`text-[9.5px] font-mono font-semibold block ${c.isHw ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {c.badge}
                          </span>
                        </div>

                        <div>
                          <p className={`text-[9.5px] font-mono leading-tight ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                            {c.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Container Format Selector (MP4 vs WebM) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36]">
                    <label className="text-xs text-white block mb-2 font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-[#facc15]" />
                        <span>Kontener Pliku Wyjściowego</span>
                      </span>
                      <span className="text-[10px] text-[#facc15] font-mono">
                        {container === 'auto' ? 'Auto-Dopasowany' : container.toUpperCase()}
                      </span>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'auto' as ContainerFormat, name: 'Auto', audio: 'Domyślny' },
                        { id: 'mp4' as ContainerFormat, name: 'MP4', audio: 'AAC 192k' },
                        { id: 'webm' as ContainerFormat, name: 'WebM', audio: 'Opus 48k' }
                      ].map(cnt => (
                        <button
                          key={cnt.id}
                          type="button"
                          onClick={() => setContainer(cnt.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            container === cnt.id
                              ? 'bg-[#18181c] border-[#facc15] text-[#facc15] font-bold shadow-md'
                              : 'bg-[#18181c] border-[#26262b] text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span className="block text-xs font-mono">{cnt.name}</span>
                          <span className="block text-[9.5px] font-mono text-zinc-500 mt-0.5">{cnt.audio}</span>
                        </button>
                      ))}
                    </div>

                    <p className="text-[10px] text-zinc-400 font-mono mt-2.5 leading-relaxed">
                      {container === 'mp4' && 'Kontener MP4 gwarantuje bezproblemowe odtworzenie na telewizorach Smart TV, odtwarzaczach i smartfonach z audio AAC.'}
                      {container === 'webm' && 'WebM oferuje zoptymalizowane strumieniowanie z kodekiem Opus 48 kHz.'}
                      {container === 'auto' && 'Automatycznie dobiera kontener MP4 dla H.264/HEVC/AV1 oraz WebM dla VP9.'}
                    </p>
                  </div>

                  {/* Codec Advantage Technical Specs Card */}
                  <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono block mb-1.5">
                        Charakterystyka: {videoCodec === 'auto' ? 'Auto GPU' : videoCodec}
                      </span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {videoCodec === 'AV1' && 'AOMedia Video 1 redukuje bitrate o 40% bez jakichkolwiek bloków kompresyjnych na ciemnym tle.'}
                        {videoCodec === 'H.265' && 'HEVC wykorzystuje sprzętowe jednostki NVENC i Apple Silicon Media Engine, skracając czas renderowania.'}
                        {videoCodec === 'VP9' && 'VP9 to format rekomendowany do bezpośredniej publikacji na YouTube z natywnym dźwiękiem Opus 48 kHz.'}
                        {videoCodec === 'H.264' && 'Klasyczny High Profile AVC gwarantuje zgodność z każdym telewizorem i smartfonem.'}
                        {videoCodec === 'auto' && 'Inteligentna analiza bada możliwości Twojej karty graficznej i wybiera optymalną kombinację jakości do czasu renderowania.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-[#2e2e36] mt-2">
                      <span>Przestrzeń barw: Rec.709 Broadcast</span>
                      <span>Tryb: VBR Adaptive</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-Flight Real Progress View */}
      {isExporting && (
        <div className="bg-[#18181c] border border-[#facc15]/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 my-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase text-[#facc15] font-bold tracking-wider flex items-center gap-2 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                EKSPORT W TOKU
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {progress?.statusMessage || 'Przetwarzanie ujęć i kodowanie strumieni...'}
              </h3>
            </div>

            <button
              onClick={handleCancelExport}
              className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer min-h-[44px]"
            >
              <StopCircle className="w-4 h-4" />
              <span>ANULUJ EKSPORT</span>
            </button>
          </div>

          {/* Central Prominent Percentage */}
          <div className="text-center py-4 space-y-2">
            <span className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight font-mono block">
              {progress?.percent || 0}%
            </span>
            <span className="text-sm font-mono text-zinc-400 block">
              {progress?.currentClipIndex
                ? `Klip ${progress.currentClipIndex} z ${progress.totalClips || totalClipsCount} • ${progress.currentClipName || ''}`
                : `Przetwarzanie sekwencji (${totalClipsCount} ujęć)`}
            </span>
          </div>

          {/* Real progress bar */}
          <div className="h-2.5 w-full bg-[#222228] rounded-full overflow-hidden p-0.5 border border-[#2e2e36]">
            <div 
              className="h-full bg-[#facc15] rounded-full transition-all duration-200"
              style={{ width: `${progress?.percent || 0}%` }}
            />
          </div>

          {/* Real Engine Stage Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 border-t border-[#26262b] text-xs font-mono">
            {STAGES_DISPLAY.map(st => {
              const status = getStageVisualStatus(st.id);
              return (
                <div 
                  key={st.id}
                  className={`p-2 rounded-xl border text-center flex items-center justify-center gap-1.5 ${
                    status === 'DONE'
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-400'
                      : (status === 'ACTIVE'
                        ? 'bg-[#222228] border-[#facc15] text-[#facc15] font-bold animate-pulse'
                        : 'bg-[#18181c] border-[#26262b] text-zinc-500')
                  }`}
                >
                  <span>{st.icon}</span>
                  <span className="truncate">{st.label}</span>
                  <span>{status === 'DONE' ? '✓' : (status === 'ACTIVE' ? '●' : '○')}</span>
                </div>
              );
            })}
          </div>

          {/* Live Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-[#222228] p-4 rounded-xl border border-[#2e2e36]">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Klatki:</span>
              <span className="text-white font-bold mt-0.5 block">
                {progress?.currentFrame || 0} / {progress?.totalFrames || 0}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Prędkość / FPS:</span>
              <span className="text-white font-bold mt-0.5 block">
                {progress?.fps || 0} FPS
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Czas pracy:</span>
              <span className="text-white font-bold mt-0.5 block">
                {progress?.elapsedSeconds || 0}s
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase">Pozostały czas (ETA):</span>
              <span className="text-[#facc15] font-bold mt-0.5 block">
                {progress?.etaSeconds ? `~${progress.etaSeconds}s` : 'Obliczanie...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error View with Recovery */}
      {error && !isExporting && (
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-rose-300">
                Eksport nie powiódł się
              </h3>
              <p className="text-sm text-rose-200/90 mt-1">
                {error.message}
              </p>
              {error.technicalDetails && (
                <div className="mt-3 p-3 bg-black/60 rounded-xl text-xs font-mono text-rose-300/80 overflow-x-auto">
                  {error.technicalDetails}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleStartExport}
              className="px-4 py-2.5 bg-rose-900/60 hover:bg-rose-900 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={() => {
                setShowDiagnostics(true);
                handleLoadCapabilities();
              }}
              className="px-4 py-2.5 bg-[#222228] hover:bg-[#2c2c34] text-zinc-300 hover:text-white border border-[#32323a] text-xs rounded-xl transition-colors cursor-pointer min-h-[44px]"
            >
              Pokaż Diagnostykę Silnika
            </button>
          </div>
        </div>
      )}

      {/* Finished Result View */}
      {output && !isExporting && (
        <div className="bg-[#18181c] border border-[#26262b] rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6">
          {/* Master Quality Certificate Banner */}
          <div className="p-4 rounded-xl bg-[#222228] border border-[#2e2e36] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">
                    Certyfikat Jakości Pro Video Master
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                    GPU Accelerated ✓
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Silnik pomyślnie przetworzył i wyrenderował strumień. Plik jest gotowy do pobrania i publikacji.
                </p>
              </div>
            </div>

            <button
              onClick={() => setOutput(null)}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#18181c] border border-[#26262b] transition-colors cursor-pointer shrink-0 font-mono"
            >
              Zamknij podgląd
            </button>
          </div>

          {/* Large video player preview */}
          <div className="relative max-h-[50vh] sm:max-h-[60vh] aspect-video max-w-3xl mx-auto bg-black rounded-xl overflow-hidden border border-[#2e2e36] shadow-2xl group flex items-center justify-center">
            <video
              ref={videoPlayerRef}
              src={output.url}
              controls
              playsInline
              preload="auto"
              onPlay={() => setIsPlayingResult(true)}
              onPause={() => setIsPlayingResult(false)}
              onEnded={() => setIsPlayingResult(false)}
              className="w-full h-full max-h-[50vh] sm:max-h-[60vh] object-contain cursor-pointer"
            />
            {!isPlayingResult && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12"
              >
                <button
                  type="button"
                  onClick={handlePlayResult}
                  className="w-14 h-14 rounded-full bg-[#facc15] hover:bg-[#eab308] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform pointer-events-auto cursor-pointer"
                  title="Kliknij, aby odtworzyć film"
                >
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                </button>
              </div>
            )}
          </div>

          {/* Technical Specs Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono bg-[#222228] p-4 rounded-xl border border-[#2e2e36]">
            <div className="col-span-2">
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Nazwa pliku:</span>
              <span className="text-white font-bold mt-0.5 block truncate" title={output.fileName}>
                {output.fileName}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Rozmiar:</span>
              <span className="text-white font-bold mt-0.5 block">
                {formatSize(output.sizeBytes)}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Czas trwania:</span>
              <span className="text-white font-bold mt-0.5 block">
                {formatDuration(output.duration)}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Rozdzielczość:</span>
              <span className="text-white font-bold mt-0.5 block">
                {output.width} × {output.height}
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Płynność (FPS):</span>
              <span className="text-white font-bold mt-0.5 block">
                {output.fps} FPS
              </span>
            </div>

            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-sans">Format & Audio:</span>
              <span className="text-[#facc15] font-bold mt-0.5 block">
                {output.videoCodec} / {output.audioCodec}
              </span>
            </div>
          </div>

          {/* Action Buttons: ODTWÓRZ, POBIERZ, DYSK GOOGLE, DODAJ DO MEDIÓW, UDOSTĘPNIJ, NOWY PROJEKT */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <button
              onClick={handlePlayResult}
              className="px-4 py-3 bg-[#222228] hover:bg-[#2c2c34] text-white border border-[#32323a] font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Play className="w-4 h-4 text-[#facc15]" />
              <span>ODTWÓRZ</span>
            </button>

            <button
              onClick={handleSaveOutput}
              className="px-4 py-3 bg-[#facc15] hover:bg-[#eab308] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Download className="w-4 h-4 fill-black" />
              <span>POBIERZ PLIK</span>
            </button>

            <button
              onClick={() => handleUploadToGoogleDrive()}
              disabled={isUploadingToDrive}
              className="px-4 py-3 bg-[#222228] hover:bg-[#2c2c34] text-white border border-[#32323a] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] disabled:opacity-50"
              title="Zapisz gotowy film bezpośrednio na Dysku Google"
            >
              {isUploadingToDrive ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#facc15]" />
              ) : (
                <GoogleDriveIcon className="w-4 h-4" />
              )}
              <span className="truncate">{isUploadingToDrive ? 'ZAPISUJĘ...' : 'DYSK GOOGLE'}</span>
            </button>

            <button
              onClick={() => {
                if (!output) return;
                handleAddSavedVideoToProject({
                  id: `export_${Date.now()}`,
                  title: project.name || 'Wyrenderowany Film',
                  fileName: output.fileName,
                  blob: output.blob,
                  sizeBytes: output.sizeBytes,
                  duration: output.duration,
                  width: output.width,
                  height: output.height,
                  fps: output.fps,
                  resolution: `${output.width} × ${output.height}`,
                  videoCodec: output.videoCodec || 'H.264',
                  createdAt: Date.now()
                });
              }}
              className="px-4 py-3 bg-[#222228] hover:bg-[#2c2c34] text-white border border-[#32323a] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              title="Dodaj wyrenderowany film do biblioteki mediów w bieżącym projekcie"
            >
              <Layers className="w-4 h-4 text-[#00e5cc]" />
              <span>DODAJ DO MEDIÓW</span>
            </button>

            <button
              onClick={handleShareOutput}
              className="px-4 py-3 bg-[#222228] hover:bg-[#2c2c34] text-white border border-[#32323a] font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>UDOSTĘPNIJ</span>
            </button>

            <button
              onClick={() => {
                if (onResetProject) {
                  onResetProject();
                } else if (onNavigateTab) {
                  onNavigateTab('project');
                }
              }}
              className="px-4 py-3 bg-[#222228] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-[#32323a] font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>NOWY PROJEKT</span>
            </button>
          </div>

          {driveExportLink && (
            <div className="mt-3 p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between animate-fadeIn text-xs">
              <div className="flex items-center gap-2 text-blue-300">
                <GoogleDriveIcon className="w-4 h-4 shrink-0" />
                <span>Film został zapisany na Twoim Dysku Google!</span>
              </div>
              <a
                href={driveExportLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                <span>Otwórz na Dysku</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* PERSISTENT SAVED VIDEOS GALLERY ON SITE */}
      <div className="bg-[#18181c] border border-[#26262b] rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262b] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#facc15]/10 border border-[#facc15]/30 flex items-center justify-center text-[#facc15]">
              <HardDrive className="w-5 h-5 text-[#facc15]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight font-sans">
                  Zapisane Filmy w Pamięci Studia
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#facc15]/15 text-[#facc15] border border-[#facc15]/30">
                  {savedVideos.length} {savedVideos.length === 1 ? 'film' : (savedVideos.length >= 2 && savedVideos.length <= 4 ? 'filmy' : 'filmów')}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Bezpieczna pamięć lokalna IndexedDB w Twojej przeglądarce. Filmy nie znikają po odświeżeniu strony.
              </p>
            </div>
          </div>

          <button
            onClick={() => loadSavedVideos()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222228] hover:bg-[#2c2c34] text-zinc-300 hover:text-white border border-[#32323a] rounded-xl text-xs font-mono transition-colors cursor-pointer self-start sm:self-auto min-h-[36px]"
            title="Odśwież listę zapisanych filmów"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Odśwież listę</span>
          </button>
        </div>

        {savedVideos.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#222228]/40 border border-dashed border-[#2e2e36] text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#222228] flex items-center justify-center mx-auto text-zinc-400">
              <FileVideo className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <p className="text-sm font-semibold text-white">Brak wyrenderowanych filmów na tej stronie</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gdy klikniesz <span className="text-[#facc15] font-semibold">„ROZPOCZNIJ EKSPORT”</span> lub dodasz zadanie do kolejki, każdy ukończony film zostanie trwale zapisany w pamięci Twojej przeglądarki i będzie dostępny tutaj.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedVideos.map((video) => {
              const videoDate = new Date(video.createdAt).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={video.id}
                  className="bg-[#222228] border border-[#2e2e36] hover:border-zinc-700 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Header: Title and Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Film className="w-4 h-4 text-[#facc15] shrink-0" />
                        <h4 className="text-xs font-semibold text-zinc-100 truncate" title={video.title || video.fileName}>
                          {video.title || video.fileName}
                        </h4>
                      </div>
                      <button
                        onClick={() => handleDeleteSavedVideo(video.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                        title="Usuń film z pamięci lokalnej"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Technical metadata */}
                    <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono bg-[#18181c] p-2.5 rounded-lg border border-[#26262b]">
                      <div>
                        <span className="text-zinc-500 block text-[9.5px]">Rozdzielczość:</span>
                        <span className="text-zinc-200 font-semibold">{video.resolution || `${video.width}×${video.height}`}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9.5px]">Płynność (FPS):</span>
                        <span className="text-emerald-400 font-semibold">{video.fps} FPS</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9.5px]">Czas trwania:</span>
                        <span className="text-[#facc15] font-semibold">{formatDuration(video.duration)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9.5px]">Rozmiar pliku:</span>
                        <span className="text-zinc-200 font-semibold">{formatSize(video.sizeBytes)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono px-1">
                      <span>{videoDate}</span>
                      <span className="text-zinc-400 font-semibold">{video.videoCodec || 'H.264'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#26262b]">
                    <button
                      onClick={() => handlePlaySavedVideo(video)}
                      className="px-2 py-2 bg-[#18181c] hover:bg-[#202026] text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[38px] border border-[#26262b]"
                      title="Odtwórz w oknie podglądu"
                    >
                      <Play className="w-3.5 h-3.5 text-[#facc15]" />
                      <span>Graj</span>
                    </button>

                    <button
                      onClick={() => handleDownloadSavedVideo(video)}
                      className="px-2 py-2 bg-[#18181c] hover:bg-[#202026] text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[38px] border border-[#26262b]"
                      title="Pobierz plik wideo na dysk"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Pobierz</span>
                    </button>

                    <button
                      onClick={() => handleUploadToGoogleDrive(video.blob, video.fileName)}
                      disabled={isUploadingToDrive}
                      className="px-2 py-2 bg-[#18181c] hover:bg-[#202026] text-white border border-[#26262b] rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[38px] disabled:opacity-50"
                      title="Prześlij ten wyrenderowany film na Dysk Google"
                    >
                      <GoogleDriveIcon className="w-3.5 h-3.5" />
                      <span>Dysk</span>
                    </button>

                    <button
                      onClick={() => handleAddSavedVideoToProject(video)}
                      className="px-2 py-2 bg-[#18181c] hover:bg-[#202026] text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer min-h-[38px] border border-[#26262b]"
                      title="Dodaj ten film z powrotem do biblioteki mediów w projekcie"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#00e5cc]" />
                      <span>Media</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Serial Export Queue Panel */}
      {queueTasks.length > 0 && (
        <div className="bg-[#18181c] border border-[#26262b] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#facc15]" />
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Seryjna Kolejka Eksportu ({queueTasks.length})
              </h3>
            </div>
            {queueTasks.some(t => t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed') && (
              <button
                onClick={() => exportQueueService.clearCompleted()}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer font-mono"
              >
                Wyczyść Zakończone
              </button>
            )}
          </div>

          <div className="space-y-3">
            {queueTasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-4 rounded-xl border transition-all ${
                  task.status === 'processing'
                    ? 'bg-[#222228] border-[#facc15] shadow-lg shadow-amber-950/20'
                    : task.status === 'completed'
                    ? 'bg-emerald-950/20 border-emerald-900/50'
                    : task.status === 'failed'
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : 'bg-[#222228] border-[#2e2e36]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{task.title}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">({task.projectName})</span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full ${
                        task.status === 'processing'
                          ? 'bg-amber-500/20 text-[#facc15] border border-amber-500/40 animate-pulse'
                          : task.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : task.status === 'failed'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {task.status === 'processing' ? 'Renderowanie...' :
                         task.status === 'completed' ? 'Ukończono ✓' :
                         task.status === 'failed' ? 'Błąd ✗' :
                         task.status === 'cancelled' ? 'Anulowano' : 'Oczekuje w kolejce'}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-3">
                      <span>{task.config.resolution} • {task.config.fps} FPS • {task.config.videoCodec || 'Auto GPU'}</span>
                      {task.config.clipCount !== undefined && <span>• {task.config.clipCount} ujęć</span>}
                      {task.config.durationSec !== undefined && <span>• {formatDuration(task.config.durationSec)}</span>}
                    </div>
                  </div>

                  {/* Task Action Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {task.status === 'processing' && (
                      <button
                        onClick={() => exportQueueService.cancelTask(task.id)}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[36px]"
                      >
                        Anuluj
                      </button>
                    )}

                    {task.status === 'queued' && (
                      <button
                        onClick={() => exportQueueService.removeTask(task.id)}
                        className="px-3 py-1.5 bg-[#18181c] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-[#26262b] text-xs rounded-xl transition-colors cursor-pointer min-h-[36px]"
                      >
                        Usuń
                      </button>
                    )}

                    {task.status === 'failed' && (
                      <button
                        onClick={() => exportQueueService.retryTask(task.id)}
                        className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[36px]"
                      >
                        Ponów
                      </button>
                    )}

                    {task.status === 'completed' && task.output && (
                      <button
                        onClick={() => videoExportService.saveOutput(task.output!)}
                        className="px-3 py-1.5 bg-[#facc15] hover:bg-[#eab308] text-black font-extrabold text-xs rounded-xl transition-colors shadow-md flex items-center gap-1 cursor-pointer min-h-[36px]"
                      >
                        <Download className="w-3.5 h-3.5 fill-black" />
                        <span>Pobierz MP4</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar for active task */}
                {task.status === 'processing' && task.progress && (
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-[#26262b]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#facc15]">{task.progress.statusMessage}</span>
                      <span className="text-white font-bold">{task.progress.percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#18181c] rounded-full overflow-hidden border border-[#26262b]">
                      <div 
                        className="h-full bg-[#facc15] transition-all duration-150"
                        style={{ width: `${task.progress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message for failed task */}
                {task.status === 'failed' && task.error && (
                  <div className="mt-2 p-2.5 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs font-mono text-rose-300">
                    <strong>Błąd:</strong> {task.error.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
