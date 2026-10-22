import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Scissors, 
  Volume2, 
  VolumeX, 
  RotateCw, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Layers, 
  Clock, 
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Sliders,
  Sparkles,
  ArrowRight,
  Monitor,
  Smartphone,
  Eye,
  ImageIcon,
  Gauge,
  Wand2,
  Type,
  Mic,
  Music,
  Upload,
  Activity,
  FileText,
  Flame,
  ZapOff,
  Zap,
  Plus,
  Copy,
  Split,
  Palette,
  Sun,
  Contrast,
  SlidersHorizontal,
  Scaling,
  Check,
  Search,
  Smile,
  Folder,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  MoreHorizontal,
  Bookmark,
  MessageSquare
} from 'lucide-react';
import type { ProjectState, TimelineItem, MediaClip, FitMode, TransitionType, TitleCard, AudioTrackItem } from '../../types/project';
import { SmartPolishSubtitlesEngine } from '../../core/audio/smartPolishSubtitlesEngine';
import { liveDialogueTranslator, type LiveDialogueCue } from '../../core/audio/liveDialogueTranslatorEngine';
import { urlRegistry } from '../../core/media/urlRegistry';
import { thumbnailCache } from '../../core/media/thumbnailCache';
import { resolveClipMediaUrl, resolveAudioTrackUrl } from '../../core/media/mediaResolver';
import { localIndexedDB } from '../../core/storage/indexedDBProvider';
import { useStudioToast } from '../common/ToastContext';
import { proxyEngine } from '../../core/proxy/proxyEngine';
import { adaptiveResourceManager, SystemMetrics } from '../../core/performance/adaptiveResourceManager';
import { SequenceManager } from '../../core/sequence/sequenceManager';
import { liveAudioEngine } from '../../core/audio/liveAudioEngine';
import { AudioVuMeter } from '../player/AudioVuMeter';
import { CapCutResourceBrowser } from './CapCutResourceBrowser';
import { CapCutInspectorPanel } from './CapCutInspectorPanel';

export type BeautyPreset = 
  | 'none' 
  | 'beauty_glow' 
  | 'hollywood_warm' 
  | 'teal_orange' 
  | 'glamour_soft' 
  | 'nordic_frost' 
  | 'vintage_35mm' 
  | 'moody_noir' 
  | 'vibrant_pop';

export interface BeautyGradeSettings {
  enabled: boolean;
  preset: BeautyPreset;
  skinGlow: number; // 0 - 100
  brightness: number; // 80 - 140 (%)
  contrast: number; // 80 - 150 (%)
  saturation: number; // 0 - 200 (%)
  warmth: number; // -50 to +50
  vignette: number; // 0 - 100
  sharpness: number; // 0 - 100
}

export const BEAUTY_PRESETS: Record<BeautyPreset, { name: string; icon: string; desc: string; settings: Omit<BeautyGradeSettings, 'preset'> }> = {
  none: {
    name: 'Oryginał',
    icon: '⭕',
    desc: 'Bez efektów kolorystycznych',
    settings: { enabled: false, skinGlow: 0, brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0, sharpness: 0 }
  },
  beauty_glow: {
    name: 'Efekt Piękna Pro',
    icon: '✨',
    desc: 'Wygładzenie cery, naturalny blask, świeże oświetlenie',
    settings: { enabled: true, skinGlow: 45, brightness: 105, contrast: 104, saturation: 112, warmth: 8, vignette: 18, sharpness: 20 }
  },
  hollywood_warm: {
    name: 'Złoty Hollywood',
    icon: '🎬',
    desc: 'Ciepłe złociste tony kinowe i miękkie przejścia tonalne',
    settings: { enabled: true, skinGlow: 35, brightness: 104, contrast: 110, saturation: 118, warmth: 24, vignette: 25, sharpness: 15 }
  },
  teal_orange: {
    name: 'Teal & Orange',
    icon: '🎥',
    desc: 'Nowoczesna kinowa gradacja barwna z głębokim błękitem',
    settings: { enabled: true, skinGlow: 25, brightness: 102, contrast: 116, saturation: 125, warmth: -4, vignette: 30, sharpness: 25 }
  },
  glamour_soft: {
    name: 'Glamour Dream',
    icon: '💎',
    desc: 'Miękkie rozświetlenie, eteryczna poświata i redukcja szumu',
    settings: { enabled: true, skinGlow: 65, brightness: 108, contrast: 98, saturation: 105, warmth: 12, vignette: 22, sharpness: 5 }
  },
  nordic_frost: {
    name: 'Nordic Frost',
    icon: '❄️',
    desc: 'Chłodny, elegancki błękit i krystaliczna przejrzystość',
    settings: { enabled: true, skinGlow: 20, brightness: 102, contrast: 108, saturation: 92, warmth: -25, vignette: 20, sharpness: 20 }
  },
  vintage_35mm: {
    name: 'Vintage 35mm',
    icon: '🎞️',
    desc: 'Ciepły analogowy film, styl klasycznej taśmy filmowej',
    settings: { enabled: true, skinGlow: 30, brightness: 98, contrast: 112, saturation: 88, warmth: 18, vignette: 35, sharpness: 10 }
  },
  moody_noir: {
    name: 'Moody Noir',
    icon: '🖤',
    desc: 'Artystyczny czarno-biały kontrast z głęboką czernią',
    settings: { enabled: true, skinGlow: 0, brightness: 96, contrast: 135, saturation: 0, warmth: 0, vignette: 45, sharpness: 30 }
  },
  vibrant_pop: {
    name: 'Vibrant Pop',
    icon: '🌈',
    desc: 'Soczyste nasycenie kolorów, dynamika i żywy kontrast',
    settings: { enabled: true, skinGlow: 30, brightness: 103, contrast: 108, saturation: 140, warmth: 6, vignette: 12, sharpness: 25 }
  }
};

export const CAPCUT_FILTER_CATEGORIES = [
  { id: 'featured', label: 'Featured' },
  { id: 'pro', label: 'Pro' },
  { id: 'texture', label: 'Texture' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'movies', label: 'Movies' },
  { id: 'mono', label: 'Mono' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'retro', label: 'Retro' },
  { id: 'night', label: 'Night scene' },
  { id: 'stylize', label: 'Stylize' },
  { id: 'food', label: 'Food' }
];

export const CAPCUT_FILTER_ITEMS = [
  { id: 'holiday', name: 'Hollywood Warm', category: 'featured', gradient: 'bg-gradient-to-br from-amber-600 via-orange-500 to-indigo-900', preset: 'hollywood_warm' as BeautyPreset },
  { id: 'anime_bw', name: 'Moody Noir', category: 'featured', gradient: 'bg-gradient-to-br from-zinc-950 via-zinc-800 to-zinc-900', preset: 'moody_noir' as BeautyPreset },
  { id: '4k_cinema', name: 'Teal & Orange', category: 'featured', gradient: 'bg-gradient-to-br from-cyan-600 via-teal-700 to-amber-600', preset: 'teal_orange' as BeautyPreset },
  { id: 'enhance', name: 'Beauty Glow', category: 'featured', gradient: 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300', preset: 'beauty_glow' as BeautyPreset },
  { id: '8k_crystal', name: 'Vibrant Pop', category: 'featured', gradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400', preset: 'vibrant_pop' as BeautyPreset },
  { id: 'low_key', name: 'Low-Key Dark', category: 'featured', gradient: 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950', preset: 'moody_noir' as BeautyPreset },
  { id: 'clear_ii', name: 'Nordic Frost', category: 'featured', gradient: 'bg-gradient-to-br from-sky-700 via-cyan-600 to-slate-900', preset: 'nordic_frost' as BeautyPreset },
  { id: 'peach_glow', name: 'Glamour Soft', category: 'featured', gradient: 'bg-gradient-to-br from-orange-400 via-amber-300 to-rose-400', preset: 'glamour_soft' as BeautyPreset },
  { id: 'humble', name: 'Vintage 35mm', category: 'featured', gradient: 'bg-gradient-to-br from-amber-800 via-yellow-700 to-zinc-900', preset: 'vintage_35mm' as BeautyPreset }
];

interface MontageViewProps {
  project: ProjectState;
  onUpdateTimelineItem: (id: string, updates: Partial<TimelineItem>) => void;
  onDeleteTimelineItem: (id: string) => void;
  onMoveTimelineItemOrder: (fromIndex: number, toIndex: number) => void;
  onNavigateTab: (tab: string) => void;
  onAddAudioTrack?: (track: AudioTrackItem) => void;
  onUpdateAudioTrack?: (id: string, updates: Partial<AudioTrackItem>) => void;
  onDeleteAudioTrack?: (id: string) => void;
  onUpdateTimelineItems?: (items: TimelineItem[]) => void;
  onOpenVoiceRecorder?: () => void;
  onOpenBeatSync?: () => void;
  onOpenAutoCaptions?: () => void;
  onSplitTimelineItem?: (id: string, splitAtSourceTime: number) => void;
  onCreateSequence?: (name: string, aspectRatio?: any) => void;
  onSwitchSequence?: (sequenceId: string) => void;
  onDuplicateSequence?: (sequenceId: string, newName?: string, targetAspectRatio?: any) => void;
  onDeleteSequence?: (sequenceId: string) => void;
  onUpdateProject?: (updater: ProjectState | ((prev: ProjectState) => ProjectState)) => void;
}

type AspectRatioMode = '16:9' | '9:16' | '4:3' | '1:1';

const formatTimeSimple = (sec: number) => {
  const mins = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}`;
};

const formatTimePrecise = (sec: number) => {
  const mins = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

/**
 * Highly optimized, memoized TimelineItemCard
 * Features:
 * - Asynchronous, lazy thumbnail and filmstrip loading via IntersectionObserver
 * - Cached thumbnail reuse from memory-bounded ThumbnailCache
 * - Isolated from 60fps playhead ticks: does not re-render on currentTime updates
 * - Multi-frame filmstrip tiles when zoomed in or on longer items
 */
interface TimelineItemCardProps {
  item: TimelineItem;
  clip: MediaClip | undefined;
  idx: number;
  isSelected: boolean;
  isDraggingThis: boolean;
  isTargetingThis: boolean;
  widthPct: number;
  timelineZoom: number;
  onSelect: (id: string, start: number) => void;
  onDragStart: (idx: number, e: React.DragEvent) => void;
  onDragOver: (idx: number, e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (idx: number, e: React.DragEvent) => void;
  onResolveClipUrl: (clip: MediaClip) => Promise<string | null>;
}

const TimelineItemCard = memo(function TimelineItemCard({
  item,
  clip,
  idx,
  isSelected,
  isDraggingThis,
  isTargetingThis,
  widthPct,
  timelineZoom,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onResolveClipUrl
}: TimelineItemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [cachedThumbnails, setCachedThumbnails] = useState<string[]>(() => {
    if (!clip) return [];
    const directKey = thumbnailCache.getCachedThumbnail(clip.id, item.sourceStart);
    if (directKey) return [directKey];
    if (clip.thumbnailUrl) return [clip.thumbnailUrl];
    return [];
  });
  const [isVisible, setIsVisible] = useState(false);

  // Lazy-load thumbnails only when card enters the viewport or buffer
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch or generate thumbnails when visible
  useEffect(() => {
    if (!isVisible || !clip) return;

    let isCancelled = false;

    const loadThumbnails = async () => {
      // If image, use thumbnail or image source directly
      if (clip.type === 'image') {
        const url = clip.thumbnailUrl || clip.objectUrl;
        if (url && !isCancelled) {
          setCachedThumbnails([url]);
        }
        return;
      }

      const getUrl = async () => onResolveClipUrl(clip);

      // Determine strip frame count based on zoom and duration
      const effectivePixelWidth = (widthPct / 100) * 1200 * (timelineZoom / 100);
      const targetFrames = effectivePixelWidth > 220 && item.duration > 3 ? 3 : (effectivePixelWidth > 110 ? 2 : 1);

      if (targetFrames > 1) {
        try {
          const strip = await thumbnailCache.getOrRequestTimelineStrip(
            clip.id,
            item.sourceStart,
            item.duration,
            getUrl,
            targetFrames
          );
          if (!isCancelled && strip.length > 0) {
            setCachedThumbnails(strip);
            return;
          }
        } catch (e) {
          // fallback to single thumbnail
        }
      }

      // Single frame at sourceStart
      try {
        const thumb = await thumbnailCache.getOrRequestThumbnail(
          clip.id,
          item.sourceStart,
          getUrl,
          { width: 140, height: 80, quality: 0.65 }
        );
        if (!isCancelled && thumb) {
          setCachedThumbnails([thumb]);
        } else if (!isCancelled && clip.thumbnailUrl) {
          setCachedThumbnails([clip.thumbnailUrl]);
        }
      } catch (e) {
        if (!isCancelled && clip.thumbnailUrl) {
          setCachedThumbnails([clip.thumbnailUrl]);
        }
      }
    };

    loadThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [isVisible, clip, item.sourceStart, item.duration, widthPct, timelineZoom, onResolveClipUrl]);

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={(e) => onDragStart(idx, e)}
      onDragOver={(e) => onDragOver(idx, e)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(idx, e)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id, item.timelineStart);
      }}
      style={{ width: `${widthPct}%` }}
      className={`h-full border-r border-zinc-800/80 p-2 flex flex-col justify-between overflow-hidden transition-all relative cursor-grab active:cursor-grabbing select-none ${
        isDraggingThis ? 'opacity-40 scale-95 shadow-inner' : ''
      } ${
        isTargetingThis ? 'border-l-4 border-l-indigo-500' : ''
      } ${
        isSelected 
          ? 'bg-zinc-800/90 border-t-2 border-t-indigo-500 shadow-xl shadow-indigo-950/40 z-10' 
          : 'bg-zinc-900/90 hover:bg-zinc-850'
      }`}
    >
      {/* Background Filmstrip / Cached Thumbnail Preview with smooth gradient overlay */}
      {cachedThumbnails.length > 0 ? (
        <div className="absolute inset-0 flex pointer-events-none overflow-hidden opacity-30 select-none">
          {cachedThumbnails.map((tUrl, tIdx) => (
            <div 
              key={tIdx}
              className="flex-1 h-full relative overflow-hidden border-r border-black/40 last:border-r-0"
            >
              <img
                src={tUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300"
              />
            </div>
          ))}
          {/* Subtle gradient vignette for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <Film className="w-8 h-8 text-white" />
        </div>
      )}

      {/* Header in Clip */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-mono drop-shadow-sm">
        <span className="font-bold text-zinc-100 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10">
          #{idx + 1}
        </span>
        <span className="text-[10px] text-indigo-300 font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md border border-indigo-500/20">
          {item.duration.toFixed(1)}s
        </span>
      </div>

      {/* Clip Name */}
      <div className="relative z-10 text-[11px] text-zinc-200 truncate font-semibold drop-shadow-sm px-0.5">
        {clip?.name || 'Ujęcie'}
      </div>

      {/* Timeline In/Out boundaries */}
      <div className="relative z-10 text-[9px] text-zinc-400 font-mono flex justify-between drop-shadow-sm px-0.5">
        <span className="bg-black/50 px-1 rounded border border-white/5">{formatTimeSimple(item.timelineStart)}</span>
        <span className="bg-black/50 px-1 rounded border border-white/5">{formatTimeSimple(item.timelineStart + item.duration)}</span>
      </div>
    </div>
  );
});

export function MontageView({
  project,
  onUpdateTimelineItem,
  onDeleteTimelineItem,
  onMoveTimelineItemOrder,
  onNavigateTab,
  onAddAudioTrack,
  onUpdateAudioTrack,
  onDeleteAudioTrack,
  onUpdateTimelineItems,
  onOpenVoiceRecorder,
  onOpenBeatSync,
  onOpenAutoCaptions,
  onSplitTimelineItem,
  onCreateSequence,
  onSwitchSequence,
  onDuplicateSequence,
  onDeleteSequence,
  onUpdateProject
}: MontageViewProps) {
  const toast = useStudioToast();
  const fileAudioInputRef = useRef<HTMLInputElement>(null);

  // Polish Subtitles State, Live AI Dialogue Analyzer & Auto-Audio Sync
  const [isSubtitlesSyncing, setIsSubtitlesSyncing] = useState(false);
  const [liveCue, setLiveCue] = useState<LiveDialogueCue | null>(null);
  const isSubtitlesEnabled = project.settings?.subtitlesSettings?.enabled ?? true;
  const subtitlesCount = useMemo(() => {
    return (project.textLayers || []).filter(t => t.type === 'caption' || t.type === 'subtitle').length;
  }, [project.textLayers]);

  // Subscribe to Live AI Dialogue Translator stream
  useEffect(() => {
    liveDialogueTranslator.setEnabled(isSubtitlesEnabled);
    const unsub = liveDialogueTranslator.subscribe((cue) => {
      setLiveCue(cue);
    });

    const unsubCommit = liveDialogueTranslator.onCommitSubtitle((newLayer) => {
      if (onUpdateProject) {
        onUpdateProject(prev => {
          const existing = prev.textLayers || [];
          const isDup = existing.some(l => 
            Math.abs(l.timelineStart - newLayer.timelineStart) < 1.2 &&
            l.text.toLowerCase().trim() === newLayer.text.toLowerCase().trim()
          );
          if (isDup) return prev;
          return {
            ...prev,
            textLayers: [...existing, newLayer]
          };
        });
      }
    });

    return () => {
      unsub();
      unsubCommit();
    };
  }, [isSubtitlesEnabled, onUpdateProject]);

  const handleTogglePolishSubtitles = useCallback(() => {
    // Jeśli brak napisów w projekcie, kliknięcie od razu inicjuje automatyczną analizę dialogów AI z filmu
    if (subtitlesCount === 0) {
      const hasClipsOnTimeline = (project.timelineItems || []).length > 0;
      if (!hasClipsOnTimeline) {
        toast.showInfo('Dodaj ujęcie wideo na oś czasu, aby AI wykryło i przetłumaczyło dialogi.');
        return;
      }
      liveDialogueTranslator.setEnabled(true);
      if (onUpdateProject) {
        onUpdateProject(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            subtitlesSettings: {
              ...prev.settings?.subtitlesSettings,
              enabled: true,
              language: 'pl',
              autoGeneratedFromAudio: true,
              presetStyle: prev.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow',
              burnInOnExport: true
            }
          }
        }));
      }
      handleAutoSyncSubtitles(false);
      return;
    }

    // Jeśli napisy już istnieją, przełącz ich widoczność na podglądzie
    const nextState = !isSubtitlesEnabled;
    liveDialogueTranslator.setEnabled(nextState);

    if (onUpdateProject) {
      onUpdateProject(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          subtitlesSettings: {
            ...prev.settings?.subtitlesSettings,
            enabled: nextState,
            language: 'pl',
            autoGeneratedFromAudio: true,
            presetStyle: prev.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow',
            burnInOnExport: nextState
          }
        }
      }));
    }

    if (nextState) {
      toast.showSuccess(`💬 Włączono wyświetlanie ${subtitlesCount} polskich napisów dialogowych.`);
    } else {
      liveDialogueTranslator.clearActiveCue();
      toast.showInfo('Polskie napisy zostały ukryte na podglądzie.');
    }
  }, [isSubtitlesEnabled, subtitlesCount, project.timelineItems, onUpdateProject, toast]);

  const handleAutoSyncSubtitles = useCallback(async (isBackground: boolean = false) => {
    const hasClips = (project.timelineItems || []).length > 0;
    if (!hasClips) {
      if (!isBackground) {
        toast.showInfo('Dodaj ujęcie wideo lub audio na oś czasu, aby AI dopasowało napisy.');
      }
      return;
    }

    if (isSubtitlesSyncing) return;

    setIsSubtitlesSyncing(true);
    if (!isBackground) {
      toast.showInfo('🎙️ AI analizuje ścieżkę dźwiękową filmu i tłumaczy dialogi na język polski...');
    }
    try {
      const res = await liveDialogueTranslator.autoAnalyzeProjectAudio(project);
      if (onUpdateProject) {
        onUpdateProject(prev => ({
          ...prev,
          textLayers: res.textLayers,
          settings: {
            ...prev.settings,
            subtitlesSettings: {
              enabled: true,
              language: 'pl',
              autoGeneratedFromAudio: true,
              presetStyle: prev.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow',
              burnInOnExport: true
            }
          }
        }));
      }
      if (res.totalSegments > 0) {
        toast.showSuccess(`✨ AI przetłumaczyło i zsynchronizowało ${res.totalSegments} kwestii dialogowych PL!`);
      } else {
        if (!isBackground) {
          toast.showInfo('W ścieżce dźwiękowej filmu nie wykryto mowy ludzkiej (tylko muzyka lub cisza).');
        }
      }
    } catch (err: any) {
      if (!isBackground) {
        toast.showError('Błąd dopasowywania napisów: ' + (err?.message || 'Błąd audio'));
      }
    } finally {
      setIsSubtitlesSyncing(false);
    }
  }, [isSubtitlesSyncing, project, onUpdateProject, toast]);

  const clips = project.mediaLibrary || [];
  const clipMap = useMemo(() => new Map<string, MediaClip>(clips.map(c => [c.id, c])), [clips]);

  const sortedItems = useMemo(() => {
    return [...(project.timelineItems || [])].sort((a, b) => a.timelineStart - b.timelineStart);
  }, [project.timelineItems]);

  const totalDuration = useMemo(() => {
    return sortedItems.reduce((acc, item) => Math.max(acc, item.timelineStart + item.duration), 0);
  }, [sortedItems]);

  // Selected Clip
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    sortedItems.length > 0 ? sortedItems[0].id : null
  );

  // Playback & Timing
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  // Display & Framing Options
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('16:9');
  const [fitStyle, setFitStyle] = useState<'fit' | 'fill' | 'blur'>('fit');
  const [timelineZoom, setTimelineZoom] = useState<number>(100); // 50% to 300%
  const [timelineHeightMode, setTimelineHeightMode] = useState<'compact' | 'standard' | 'tall' | 'collapsed'>('standard');
  const [mobileActiveView, setMobileActiveView] = useState<'montage' | 'resources' | 'inspector'>('montage');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Responsive Viewport Monitor Size Tracking
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const el = viewportContainerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportDims({ width: rect.width, height: rect.height });
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLeftPanelOpen, isRightPanelOpen, isFullscreen]);

  const viewportAspectStyle = useMemo((): React.CSSProperties => {
    let targetRatio = 16 / 9;
    if (aspectMode === '9:16') targetRatio = 9 / 16;
    else if (aspectMode === '1:1') targetRatio = 1.0;

    const containerW = viewportDims.width;
    const containerH = viewportDims.height;

    if (containerW > 0 && containerH > 0) {
      const pad = 16;
      const availW = Math.max(120, containerW - pad);
      const availH = Math.max(120, containerH - pad);

      let stageW = availW;
      let stageH = availW / targetRatio;

      if (stageH > availH) {
        stageH = availH;
        stageW = availH * targetRatio;
      }

      return {
        width: `${Math.floor(stageW)}px`,
        height: `${Math.floor(stageH)}px`,
        aspectRatio: aspectMode === '9:16' ? '9/16' : (aspectMode === '1:1' ? '1/1' : '16/9'),
        maxWidth: '100%',
        maxHeight: '100%'
      };
    }

    return {
      aspectRatio: aspectMode === '9:16' ? '9/16' : (aspectMode === '1:1' ? '1/1' : '16/9'),
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%'
    };
  }, [aspectMode, viewportDims]);

  // Proxy Playback & Adaptive Resource Engine (ETAP 2) - Bazowo WYŁĄCZONY
  const [useProxyPreview, setUseProxyPreview] = useState<boolean>(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>(adaptiveResourceManager.getMetrics());
  const [isGeneratingAllProxies, setIsGeneratingAllProxies] = useState<boolean>(false);

  // CapCut Pro Resource Tabs and Filter State
  const [resourceTab, setResourceTab] = useState<'media' | 'audio' | 'text' | 'stickers' | 'effects' | 'transitions' | 'filters' | 'adjustment'>('filters');
  const [filterCategory, setFilterCategory] = useState<string>('featured');
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [inspectorMainTab, setInspectorMainTab] = useState<'video' | 'speed' | 'animation' | 'adjust' | 'ai_stylize'>('video');
  const [inspectorSubTab, setInspectorSubTab] = useState<'basic' | 'remove_bg' | 'mask' | 'retouch'>('basic');
  const [enhanceImage, setEnhanceImage] = useState<boolean>(true);
  const [enhanceLevel, setEnhanceLevel] = useState<string>('UHD');
  const [reduceNoise, setReduceNoise] = useState<boolean>(true);
  const [reduceNoiseLevel, setReduceNoiseLevel] = useState<string>('Weak');
  const [opticalFlow, setOpticalFlow] = useState<boolean>(false);
  const [aiExpand, setAiExpand] = useState<boolean>(false);
  const [aiRemove, setAiRemove] = useState<boolean>(false);

  // Studio Efektów Piękna & Color Grading (Beauty Polish, Skin Glow, Cinematic LUTs) - Domyślnie czysty obraz bez przekłamań
  const [beautyGrade, setBeautyGrade] = useState<BeautyGradeSettings>({
    enabled: false,
    preset: 'beauty_glow',
    skinGlow: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    vignette: 0,
    sharpness: 0
  });
  const [isBeautyStudioOpen, setIsBeautyStudioOpen] = useState<boolean>(false);
  const [inspectorTab, setInspectorTab] = useState<'trim' | 'transform' | 'speed' | 'color' | 'audio' | 'title'>('trim');

  const beautyFilterStyle = useMemo(() => {
    if (!beautyGrade.enabled) return 'none';
    const b = beautyGrade.brightness / 100;
    const c = beautyGrade.contrast / 100;
    const s = beautyGrade.saturation / 100;
    const warmth = beautyGrade.warmth;
    const sepia = warmth > 0 ? (warmth / 100) * 0.28 : 0;
    const hue = warmth < 0 ? (warmth / 50) * 14 : (warmth / 50) * 6;
    
    return `brightness(${b}) contrast(${c}) saturate(${s}) sepia(${sepia}) hue-rotate(${hue}deg)`;
  }, [beautyGrade]);

  const handleApplyBeautyPreset = useCallback((presetKey: BeautyPreset) => {
    const preset = BEAUTY_PRESETS[presetKey];
    if (!preset) return;
    setBeautyGrade({
      preset: presetKey,
      ...preset.settings
    });
    if (presetKey === 'none') {
      toast.showInfo('Wyłączono filtry barwne (Oryginalny obraz).');
    } else {
      toast.showSuccess(`✨ Zastosowano styl: ${preset.name}`);
    }
  }, [toast]);

  // Sequences Management Modal / Quick Creator
  const [isNewSeqModalOpen, setIsNewSeqModalOpen] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqAspect, setNewSeqAspect] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  // Drag & drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Hover Scrub Tooltip
  const [hoverPosition, setHoverPosition] = useState<{ xPct: number; timeSec: number } | null>(null);

  // DOM Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const offscreenAudioHostRef = useRef<HTMLDivElement>(null);
  const lastActiveClipIdRef = useRef<string | null>(null);

  // Target FPS
  const targetFps = project.settings?.targetFps || 30;
  const currentFrameIndex = Math.floor(currentTime * targetFps);

  // Subscribe to real-time adaptive resource load
  useEffect(() => {
    const unsub = adaptiveResourceManager.subscribe(setSystemMetrics);
    return unsub;
  }, []);

  // Sync selected item
  useEffect(() => {
    if (sortedItems.length > 0 && (!selectedItemId || !sortedItems.some(i => i.id === selectedItemId))) {
      setSelectedItemId(sortedItems[0].id);
    }
  }, [sortedItems, selectedItemId]);

  const selectedItem = sortedItems.find(i => i.id === selectedItemId);
  const selectedClip = selectedItem ? clipMap.get(selectedItem.clipId) : null;

  // Selected Clip thumbnail state for Inspector
  const [inspectorThumbnail, setInspectorThumbnail] = useState<string | null>(null);

  // Find active item at currentTime
  const activeTimelineItem = useMemo(() => {
    return sortedItems.find(item => 
      currentTime >= item.timelineStart && currentTime < (item.timelineStart + item.duration)
    ) || (currentTime >= totalDuration && sortedItems.length > 0 ? sortedItems[sortedItems.length - 1] : sortedItems[0]);
  }, [sortedItems, currentTime, totalDuration]);

  const activeClip = activeTimelineItem ? clipMap.get(activeTimelineItem.clipId) : null;

  const isPlayingProxy = useMemo(() => {
    if (!useProxyPreview || !activeClip || activeClip.type !== 'video') return false;
    return Boolean(activeClip.isProxyReady || activeClip.proxyUrl || activeClip.proxyStatus === 'PROXY_READY');
  }, [useProxyPreview, activeClip]);

  const activeDedication = useMemo(() => {
    if (!activeTimelineItem?.dedication?.enabled || !activeTimelineItem.dedication.text) return null;
    const itemOffset = currentTime - activeTimelineItem.timelineStart;
    const maxDur = activeTimelineItem.dedication.displayDuration || activeTimelineItem.duration;
    if (itemOffset >= 0 && itemOffset <= maxDur) {
      return activeTimelineItem.dedication;
    }
    return null;
  }, [currentTime, activeTimelineItem]);

  // Asynchronously resolve active clip URL if missing or dead
  const [resolvedClipUrls, setResolvedClipUrls] = useState<Record<string, string>>({});

  const resolveClipUrl = useCallback(async (clip: MediaClip): Promise<string | null> => {
    if (!clip) return null;
    // If proxy requested and ready, prioritize proxy URL
    if (useProxyPreview && clip.type === 'video' && clip.proxyUrl && urlRegistry.isAlive(clip.proxyUrl)) {
      return clip.proxyUrl;
    }
    const fresh = await resolveClipMediaUrl(clip, useProxyPreview);
    if (fresh) {
      setResolvedClipUrls(prev => ({ ...prev, [clip.id]: fresh }));
      return fresh;
    }
    if (clip.objectUrl && (clip.objectUrl.startsWith('http') || clip.objectUrl.startsWith('data:') || urlRegistry.isAlive(clip.objectUrl))) {
      return clip.objectUrl;
    }
    if (clip.thumbnailUrl) {
      return clip.thumbnailUrl;
    }
    return null;
  }, [useProxyPreview]);

  // Split at current playhead frame
  const handleSplitAtPlayhead = useCallback(() => {
    if (!onSplitTimelineItem || totalDuration === 0) return;
    const itemAtPlayhead = sortedItems.find(
      i => currentTime >= i.timelineStart && currentTime < (i.timelineStart + i.duration)
    );
    if (!itemAtPlayhead) {
      toast.showWarning('Ustaw suwak czasu na ujęciu, które chcesz rozciąć.');
      return;
    }

    const localTimeSec = currentTime - itemAtPlayhead.timelineStart;
    const speed = itemAtPlayhead.speed || 1;
    const sourceSplitTime = itemAtPlayhead.sourceStart + (localTimeSec * speed);

    if (sourceSplitTime <= itemAtPlayhead.sourceStart + 0.1 || sourceSplitTime >= itemAtPlayhead.sourceEnd - 0.1) {
      toast.showWarning('Suwak czasu znajduje się zbyt blisko krawędzi ujęcia (margines min. 0.1s).');
      return;
    }

    onSplitTimelineItem(itemAtPlayhead.id, sourceSplitTime);
    toast.showSuccess(`✂️ Rozcięto ujęcie w czasie ${formatTimePrecise(currentTime)}.`);
  }, [onSplitTimelineItem, sortedItems, currentTime, totalDuration, toast]);

  // 1-Click batch generate proxies for all clips currently in timeline
  const handleBatchGenerateTimelineProxies = useCallback(() => {
    const videoItems = sortedItems.map(i => clipMap.get(i.clipId)).filter((c): c is MediaClip => Boolean(c && c.type === 'video'));
    const unproxied = videoItems.filter(c => !c.isProxyReady && c.proxyStatus !== 'PROXY_READY');
    if (unproxied.length === 0) {
      toast.showInfo('Wszystkie ujęcia na osi czasu posiadają już gotowe pliki robocze Proxy.');
      return;
    }

    setIsGeneratingAllProxies(true);
    unproxied.forEach(c => {
      proxyEngine.enqueueClip(c, 'medium_720p');
    });
    toast.showSuccess(`⚡ Dodano ${unproxied.length} ujęć z osi czasu do kolejki generowania Proxy 720p.`);
    setTimeout(() => setIsGeneratingAllProxies(false), 2500);
  }, [sortedItems, clipMap, toast]);

  // Pre-resolve all clips in timeline so switching between them has zero black frames
  useEffect(() => {
    if (sortedItems.length === 0) return;
    let isCancelled = false;
    sortedItems.forEach(item => {
      const clip = clipMap.get(item.clipId);
      if (clip && !resolvedClipUrls[clip.id]) {
        resolveClipUrl(clip).then(url => {
          if (!isCancelled && url) {
            setResolvedClipUrls(prev => ({ ...prev, [clip.id]: url }));
          }
        });
      }
    });
    return () => { isCancelled = true; };
  }, [sortedItems, clipMap, resolveClipUrl]);

  // Non-blocking background thumbnail preheating with ImageBitmap & OffscreenCanvas:
  // Pre-generates thumbnails during browser idle periods during project loading so that
  // scrolling and timeline scrubbing never experience main-thread hitches or frame drops.
  useEffect(() => {
    if (sortedItems.length === 0) return;
    const cancelPreheat = thumbnailCache.preheatTimelineThumbnails(
      sortedItems,
      async (clipId) => {
        const clip = clipMap.get(clipId);
        if (!clip) return null;
        return resolveClipUrl(clip);
      }
    );
    return () => {
      cancelPreheat();
    };
  }, [sortedItems, clipMap, resolveClipUrl]);

  useEffect(() => {
    if (!activeClip) return;
    if (activeClip.objectUrl && (activeClip.objectUrl.startsWith('http') || activeClip.objectUrl.startsWith('data:') || urlRegistry.isAlive(activeClip.objectUrl))) {
      return;
    }
    let isCancelled = false;
    resolveClipUrl(activeClip).then(fresh => {
      if (!isCancelled && fresh) {
        setResolvedClipUrls(prev => ({ ...prev, [activeClip.id]: fresh }));
      }
    });
    return () => { isCancelled = true; };
  }, [activeClip, resolveClipUrl]);

  // Update Inspector thumbnail when selected item or trim changes
  useEffect(() => {
    if (!selectedClip || !selectedItem) {
      setInspectorThumbnail(null);
      return;
    }
    let isCancelled = false;
    const direct = thumbnailCache.getCachedThumbnail(selectedClip.id, selectedItem.sourceStart);
    if (direct) {
      setInspectorThumbnail(direct);
      return;
    }
    if (selectedClip.thumbnailUrl) {
      setInspectorThumbnail(selectedClip.thumbnailUrl);
    }
    thumbnailCache.getOrRequestThumbnail(
      selectedClip.id,
      selectedItem.sourceStart,
      () => resolveClipUrl(selectedClip),
      { width: 240, height: 135, quality: 0.72 }
    ).then((thumb) => {
      if (!isCancelled && thumb) {
        setInspectorThumbnail(thumb);
      }
    });

    return () => { isCancelled = true; };
  }, [selectedClip, selectedItem?.sourceStart, resolveClipUrl]);

  const activeMediaSourceUrl = useMemo(() => {
    if (!activeClip) return '';
    // Prefer Proxy URL when Proxy Mode is active
    if (useProxyPreview && activeClip.type === 'video' && activeClip.proxyUrl && urlRegistry.isAlive(activeClip.proxyUrl)) {
      return activeClip.proxyUrl;
    }
    if (activeClip.objectUrl && (activeClip.objectUrl.startsWith('http') || activeClip.objectUrl.startsWith('data:') || urlRegistry.isAlive(activeClip.objectUrl))) {
      return activeClip.objectUrl;
    }
    if (activeClip.file) {
      try {
        const u = urlRegistry.create(activeClip.file);
        activeClip.objectUrl = u;
        return u;
      } catch (e) {}
    }
    if (resolvedClipUrls[activeClip.id]) {
      return resolvedClipUrls[activeClip.id];
    }
    if (activeClip.type === 'image') {
      return activeClip.thumbnailUrl || '';
    }
    return '';
  }, [activeClip, resolvedClipUrls, useProxyPreview]);

  const activeTitleCard = useMemo(() => {
    if (!activeTimelineItem?.titleCard?.enabled) return null;
    const itemOffset = currentTime - activeTimelineItem.timelineStart;
    const cardDuration = Math.min(Math.max(0.8, activeTimelineItem.duration * 0.35), activeTimelineItem.titleCard.duration || 2.5);
    if (itemOffset < cardDuration) {
      return activeTimelineItem.titleCard;
    }
    return null;
  }, [currentTime, activeTimelineItem]);

  const activeOutroCard = useMemo(() => {
    if (!activeTimelineItem?.outroCard?.enabled) return null;
    const itemOffset = currentTime - activeTimelineItem.timelineStart;
    const cardDuration = Math.min(Math.max(1.0, activeTimelineItem.duration * 0.5), activeTimelineItem.outroCard.duration || 3.5);
    const outroStart = Math.max(0, activeTimelineItem.duration - cardDuration);
    if (itemOffset >= outroStart) {
      return activeTimelineItem.outroCard;
    }
    return null;
  }, [currentTime, activeTimelineItem]);

  // Last UI state update timestamp for throttling top-level React re-renders during 60fps playback
  const lastStateTickRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;

  // Playback Loop via rAF (High Performance - Throttled React state updates to 25fps)
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      audioPoolRef.current.forEach(a => { try { a.pause(); } catch(e) {} });
      return;
    }

    lastTickTimeRef.current = performance.now();
    lastStateTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      const vid = videoRef.current;
      let calculatedTime = currentTimeRef.current;

      if (vid && !vid.paused && vid.readyState >= 2 && activeTimelineItem && activeClip?.type === 'video') {
        const speed = activeTimelineItem.speed || 1;
        const vidElapsed = Math.max(0, (vid.currentTime - activeTimelineItem.sourceStart) / speed);
        calculatedTime = activeTimelineItem.timelineStart + vidElapsed;
      } else {
        calculatedTime = currentTimeRef.current + delta;
      }

      if (calculatedTime >= totalDuration) {
        setIsPlaying(false);
        setCurrentTime(0);
        currentTimeRef.current = 0;
        lastActiveClipIdRef.current = null;
        return;
      }

      currentTimeRef.current = calculatedTime;
      liveDialogueTranslator.updatePlayheadTime(calculatedTime, project.textLayers);

      // Throttle React state updates to ~25fps (every 40ms) to prevent main-thread locks
      if (now - lastStateTickRef.current >= 40) {
        lastStateTickRef.current = now;
        setCurrentTime(calculatedTime);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, totalDuration, activeTimelineItem?.id, activeClip?.id, activeClip?.type, project.textLayers]);

  // Sync HTML5 video element with active item and source (Decoupled from high-frequency currentTime)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !activeTimelineItem || !activeClip || activeClip.type === 'image') {
      lastActiveClipIdRef.current = null;
      return;
    }

    if (activeMediaSourceUrl && vid.src !== activeMediaSourceUrl) {
      vid.src = activeMediaSourceUrl;
    }

    const timeInItem = Math.max(0, currentTime - activeTimelineItem.timelineStart);
    const speed = activeTimelineItem.speed || 1;
    const targetSourceTime = activeTimelineItem.sourceStart + (timeInItem * speed);

    const isNewClip = lastActiveClipIdRef.current !== activeClip.id;
    if (isNewClip) {
      lastActiveClipIdRef.current = activeClip.id;
      if (Number.isFinite(targetSourceTime)) {
        try { vid.currentTime = targetSourceTime; } catch (e) {}
      }
    } else if (!isPlaying || Math.abs(vid.currentTime - targetSourceTime) > 1.2) {
      if (Number.isFinite(targetSourceTime)) {
        try { vid.currentTime = targetSourceTime; } catch (e) {}
      }
    }

    const finalMuted = isMuted || Boolean(activeTimelineItem.muted);
    const finalVolume = finalMuted ? 0 : Math.min(1, Math.max(0, volume * (activeTimelineItem.volume ?? 1)));
    if (vid.muted !== finalMuted) {
      vid.muted = finalMuted;
    }
    vid.volume = finalVolume;
    vid.playbackRate = speed;

    if (isPlaying && vid.paused && !(vid as any)._isPlayPending) {
      (vid as any)._isPlayPending = true;
      const p = vid.play();
      if (p !== undefined) {
        p.then(() => {
          (vid as any)._isPlayPending = false;
        }).catch(err => {
          (vid as any)._isPlayPending = false;
          if (!vid.muted) {
            vid.muted = true;
            vid.play().catch(() => {});
          }
        });
      }
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [activeTimelineItem?.id, activeClip?.id, isPlaying, volume, isMuted, activeMediaSourceUrl]);

  // Sync background audio tracks in MontageView smoothly
  useEffect(() => {
    liveAudioEngine.setMasterVolume(volume, isMuted);
    liveAudioEngine.syncAudioTracks(
      project.audioTracks || [],
      currentTime,
      isPlaying,
      project.settings?.audioBalance?.musicVolume ?? 0.85
    );
  }, [isPlaying, isMuted, volume, project.audioTracks, project.settings?.audioBalance]);

  const handlePlayToggle = () => {
    if (totalDuration === 0) return;
    const next = !isPlaying;
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
      lastActiveClipIdRef.current = null;
    }

    // Unlock browser AudioContext immediately on user interaction
    liveAudioEngine.resume();
    liveAudioEngine.setMasterVolume(volume, isMuted);

    setIsPlaying(next);
    if (next) {
      if (isSubtitlesEnabled) {
        liveDialogueTranslator.start(currentTime);
        // Automatyczna analiza dialogów AI jeśli w filmie brak jeszcze wygenerowanych napisów
        const hasClips = (project.timelineItems || []).length > 0;
        if (hasClips && subtitlesCount === 0 && !isSubtitlesSyncing) {
          handleAutoSyncSubtitles(true);
        }
      }
      if (videoRef.current && activeClip?.type === 'video') {
        videoRef.current.muted = isMuted || Boolean(activeTimelineItem?.muted);
        liveAudioEngine.connectVideoElement(videoRef.current);
        videoRef.current.play().catch(() => {});
      }
      liveAudioEngine.syncAudioTracks(
        project.audioTracks || [],
        currentTime,
        true,
        project.settings?.audioBalance?.musicVolume ?? 0.85
      );
    } else {
      liveDialogueTranslator.stop();
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      liveAudioEngine.pauseAll();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    liveDialogueTranslator.stop();
    liveDialogueTranslator.clearActiveCue();
    if (videoRef.current) videoRef.current.currentTime = 0;
    liveAudioEngine.pauseAll();
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(time, totalDuration));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    liveDialogueTranslator.updatePlayheadTime(clamped, project.textLayers);
    if (!isPlaying) {
      liveDialogueTranslator.clearActiveCue();
    }

    // Immediately seek HTML5 video element on manual scrubbing
    const vid = videoRef.current;
    if (vid && activeTimelineItem && activeClip?.type === 'video') {
      const timeInItem = Math.max(0, clamped - activeTimelineItem.timelineStart);
      const speed = activeTimelineItem.speed || 1;
      const targetSourceTime = activeTimelineItem.sourceStart + (timeInItem * speed);
      if (Number.isFinite(targetSourceTime)) {
        try { vid.currentTime = targetSourceTime; } catch (e) {}
      }
    }

    // Sync audio tracks position immediately
    liveAudioEngine.syncAudioTracks(
      project.audioTracks || [],
      clamped,
      isPlaying,
      project.settings?.audioBalance?.musicVolume ?? 0.85
    );
  };

  // Skip ±5 seconds
  const handleSkip = (seconds: number) => {
    handleSeek(currentTime + seconds);
  };

  // Step exact frames
  const handleStepFrames = (frames: number) => {
    const frameInterval = 1 / targetFps;
    handleSeek(currentTime + (frames * frameInterval));
  };

  // Trim Handler for Start and End handles
  const handleTrimChange = (type: 'start' | 'end', value: number) => {
    if (!selectedItem || !selectedClip) return;
    const sourceDuration = selectedClip.duration || 10;

    if (type === 'start') {
      const clampedStart = Math.max(0, Math.min(value, selectedItem.sourceEnd - 0.2));
      const newDur = selectedItem.sourceEnd - clampedStart;
      onUpdateTimelineItem(selectedItem.id, {
        sourceStart: clampedStart,
        duration: newDur
      });
      handleSeek(selectedItem.timelineStart);
    } else {
      const clampedEnd = Math.min(sourceDuration, Math.max(value, selectedItem.sourceStart + 0.2));
      const newDur = clampedEnd - selectedItem.sourceStart;
      onUpdateTimelineItem(selectedItem.id, {
        sourceEnd: clampedEnd,
        duration: newDur
      });
      handleSeek(selectedItem.timelineStart + newDur);
    }
  };

  // Upload custom MP3 / audio soundtrack file
  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddAudioTrack) return;

    const trackId = `music_${Date.now()}`;
    const url = urlRegistry.create(file);

    try {
      await localIndexedDB.saveMediaBlob(trackId, file);
    } catch (err) {
      console.warn('Could not save audio file to IndexedDB:', err);
    }

    // Probe duration accurately
    let duration = 30;
    try {
      const probeAudio = new Audio(url);
      await new Promise<void>((resolve) => {
        probeAudio.onloadedmetadata = () => {
          if (probeAudio.duration && Number.isFinite(probeAudio.duration) && probeAudio.duration > 0) {
            duration = Math.round(probeAudio.duration * 10) / 10;
          }
          resolve();
        };
        probeAudio.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    } catch {}

    const newTrack: AudioTrackItem = {
      id: trackId,
      name: file.name,
      file,
      objectUrl: url,
      duration,
      trackType: 'music',
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: 0,
      volume: 0.85,
      fadeIn: 1.0,
      fadeOut: 1.5
    };

    onAddAudioTrack(newTrack);
    toast.showSuccess(`Dodano własny podkład muzyczny MP3: ${file.name} (${duration.toFixed(1)}s)! Muzyka będzie grać w trybie ciągłym.`);
    if (fileAudioInputRef.current) fileAudioInputRef.current.value = '';
  };

  // Photo duration changer
  const handlePhotoDurationChange = (newDur: number) => {
    if (!selectedItem) return;
    const dur = Math.max(0.5, Math.min(60, Number(newDur.toFixed(1))));
    
    // Update item duration
    onUpdateTimelineItem(selectedItem.id, {
      duration: dur,
      sourceEnd: selectedItem.sourceStart + dur
    });
  };

  // Apply duration to all image items on timeline
  const handleApplyDurationToAllImages = (dur: number) => {
    const duration = Math.max(0.5, Math.min(60, Number(dur.toFixed(1))));
    const imageClipIds = new Set(project.mediaLibrary.filter(m => m.type === 'image').map(m => m.id));
    
    let t = 0;
    const resequenced = sortedItems.map(item => {
      const isImg = imageClipIds.has(item.clipId);
      const itemDur = isImg ? duration : item.duration;
      const updated = {
        ...item,
        timelineStart: t,
        duration: itemDur,
        sourceEnd: isImg ? (item.sourceStart + duration) : item.sourceEnd
      };
      t += itemDur;
      return updated;
    });

    if (onUpdateTimelineItems) {
      onUpdateTimelineItems(resequenced);
    } else {
      resequenced.forEach(i => onUpdateTimelineItem(i.id, i));
    }
    toast.showSuccess(`Ustawiono ${duration.toFixed(1)}s dla wszystkich zdjęć w filmie!`);
  };
  const handleStepTrim = (type: 'start' | 'end', frames: number) => {
    if (!selectedItem) return;
    const frameInterval = 1 / targetFps;
    const curVal = type === 'start' ? selectedItem.sourceStart : selectedItem.sourceEnd;
    handleTrimChange(type, curVal + (frames * frameInterval));
  };

  // Move Order
  const handleMoveOrder = (direction: 'prev' | 'next') => {
    if (!selectedItem) return;
    const currentIndex = sortedItems.findIndex(i => i.id === selectedItem.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < sortedItems.length) {
      onMoveTimelineItemOrder(currentIndex, targetIndex);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement && !isFullscreen) {
      playerContainerRef.current.requestFullscreen().catch(() => {
        // Fallback to in-window cinema mode if iframe restricts fullscreen API
        setIsFullscreen(true);
      });
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Keyboard Shortcuts (Space for Play/Pause, J/K/L Shuttle, S for Split, Delete/Backspace, Left/Right)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.key === 'j' || e.key === 'J') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleSkip(-2);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (isPlaying) handlePlayToggle();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (!isPlaying) handlePlayToggle();
          else handleSkip(2);
        }
      } else if (e.key === 's' || e.key === 'S' || e.key === 'b' || e.key === 'B') {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleSplitAtPlayhead();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!e.ctrlKey && !e.metaKey && selectedItemId) {
          e.preventDefault();
          onDeleteTimelineItem(selectedItemId);
          setSelectedItemId(null);
          toast.showInfo('Usunięto ujęcie z osi czasu.');
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrames(e.shiftKey ? -5 : -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepFrames(e.shiftKey ? 5 : 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, totalDuration, currentTime, selectedItemId, handlePlayToggle, handleStepFrames, handleSplitAtPlayhead, handleSkip, onDeleteTimelineItem, toast]);

  // Handle timeline track click
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(pct * totalDuration);
  }, [totalDuration]);

  // Handle timeline track touch for mobile scrubbing (Poco F6 / Android / iOS)
  const handleTrackTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(1, touchX / rect.width));
    liveAudioEngine.resume();
    handleSeek(pct * totalDuration);
  }, [totalDuration]);

  const handleTrackTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const xPct = Math.max(0, Math.min(100, (touchX / rect.width) * 100));
    const timeSec = (xPct / 100) * totalDuration;
    handleSeek(timeSec);
  }, [totalDuration]);

  // Handle hover scrub move
  const handleTrackMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const timeSec = (xPct / 100) * totalDuration;
    setHoverPosition({ xPct, timeSec });
  }, [totalDuration]);

  const handleTrackMouseLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  // Drag handlers
  const handleCardDragStart = useCallback((idx: number, e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedIdx(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCardDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }, [dragOverIdx]);

  const handleCardDragLeave = useCallback(() => {
    setDragOverIdx(null);
  }, []);

  const handleCardDrop = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = Number(e.dataTransfer.getData('text/plain'));
    setDraggedIdx(null);
    setDragOverIdx(null);
    if (!isNaN(fromIdx) && fromIdx !== idx) {
      onMoveTimelineItemOrder(fromIdx, idx);
      toast.showSuccess(`Przestawiono ujęcie na pozycję #${idx + 1}`);
    }
  }, [onMoveTimelineItemOrder, toast]);

  const handleCardSelect = useCallback((id: string, start: number) => {
    setSelectedItemId(id);
    handleSeek(start);
  }, []);

  return (
    <div className="h-full w-full flex flex-col md:grid md:grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-[#121214] text-zinc-100 select-none p-1 sm:p-1.5 gap-1.5 min-h-0 min-w-0">
      {/* UPPER WORKSPACE ROW: On Desktop: 3-column Grid. On Mobile: Dedicated Top Player Monitor */}
      <div className="shrink-0 h-[35dvh] min-h-[185px] max-h-[38vh] md:h-full md:max-h-none md:shrink md:flex-1 min-h-0 min-w-0 md:grid md:grid-cols-[auto_1fr_auto] gap-1.5 overflow-hidden w-full items-stretch flex flex-col">
        {/* Column 1: Left Resource Browser (Media, Filtry, Audio, Napisy - Desktop Only Here) */}
        {isLeftPanelOpen && (
          <div className="hidden md:flex w-full md:w-[320px] lg:w-[360px] xl:w-[380px] shrink-0 h-full overflow-hidden transition-all duration-200 bg-[#18181c] border border-[#27272a] rounded-xl min-h-0 flex-col">
            <CapCutResourceBrowser
              project={project}
              activePreset={beautyGrade.preset}
              onSelectFilter={handleApplyBeautyPreset}
              onAddMediaClick={() => onNavigateTab('media')}
              onOpenVoiceRecorder={onOpenVoiceRecorder}
              onOpenBeatSync={onOpenBeatSync}
              onOpenAutoCaptions={onOpenAutoCaptions}
              onAddClipToTimeline={(clip) => {
                if (onUpdateTimelineItems) {
                  const newItem: TimelineItem = {
                    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    clipId: clip.id,
                    trackId: 'v1',
                    sourceStart: 0,
                    sourceEnd: clip.duration,
                    timelineStart: totalDuration,
                    duration: clip.duration,
                    speed: 1.0,
                    volume: 1.0,
                    fadeIn: 0,
                    fadeOut: 0,
                    muted: false,
                    scale: 1.0,
                    rotation: 0
                  };
                  onUpdateTimelineItems([...sortedItems, newItem]);
                  toast.showSuccess(`Dodano "${clip.name}" do osi czasu.`);
                }
              }}
            />
          </div>
        )}

        {/* Column 2: Center Player Monitor & Controls (Always Visible on Mobile & Desktop) */}
        <div 
          ref={playerContainerRef}
          className={`flex-1 min-w-0 min-h-0 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden relative shadow-lg h-full ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none justify-center p-2 bg-black' : ''
          }`}
        >
          {/* Pro Player Header Bar with Layout Controls (Desktop only to maximize mobile viewport) */}
          <div className="hidden md:flex h-8 px-3 border-b border-[#26262b] bg-[#141416] items-center justify-between shrink-0 text-xs font-semibold text-zinc-300 select-none">
            {/* Left: Panel Visibility Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsLeftPanelOpen(prev => !prev)}
                className={`p-1 rounded-md border text-xs flex items-center gap-1 cursor-pointer transition ${
                  isLeftPanelOpen
                    ? 'bg-[#22222a] border-[#363642] text-amber-400'
                    : 'bg-[#18181c] border-transparent text-zinc-500 hover:text-white'
                }`}
                title={isLeftPanelOpen ? 'Ukryj lewy panel zasobów' : 'Pokaż lewy panel zasobów'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px] font-mono">Zasoby</span>
              </button>
            </div>

            {/* Center: Active Clip Name & Status & Prominent Polish Subtitles Switch */}
            <div className="flex items-center gap-2 max-w-md font-mono text-[11px] text-zinc-400">
              {activeClip ? (
                <span className="truncate text-zinc-200 font-medium max-w-[120px] sm:max-w-[180px]">
                  {activeClip.name}
                </span>
              ) : (
                <span className="text-zinc-600 italic">Podgląd wideo</span>
              )}

              {/* POLISH SUBTITLES (AUTO FROM FILM AUDIO & LIVE TRANSLATOR) PROMINENT TOGGLE */}
              <div className="flex items-center gap-1 bg-[#121215] border border-zinc-800 rounded-lg p-0.5 px-1 shadow-inner">
                <button
                  type="button"
                  onClick={handleTogglePolishSubtitles}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    subtitlesCount > 0
                      ? isSubtitlesEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/60 border border-zinc-800'
                      : isSubtitlesSyncing
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/40 shadow-xs'
                  }`}
                  title={
                    subtitlesCount > 0
                      ? isSubtitlesEnabled
                        ? `Napisy PL włączone (${subtitlesCount} kwestii) - kliknij aby ukryć`
                        : `Napisy PL ukryte (${subtitlesCount} kwestii) - kliknij aby włączyć`
                      : 'Kliknij, aby AI automatycznie przeanalizowało dźwięk filmu i wygenerowało napisy PL'
                  }
                >
                  <MessageSquare className={`w-3 h-3 ${subtitlesCount > 0 ? (isSubtitlesEnabled ? 'text-emerald-400' : 'text-zinc-500') : 'text-amber-400'}`} />
                  <span>
                    {subtitlesCount > 0
                      ? `Napisy PL: ${isSubtitlesEnabled ? 'ON' : 'OFF'} (${subtitlesCount})`
                      : isSubtitlesSyncing
                        ? 'AI Analizuje Dialogi...'
                        : '✦ Napisy AI: Generuj'}
                  </span>
                  {isSubtitlesEnabled && subtitlesCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Live Speech Recognition Activity Pulse */}
                {isSubtitlesEnabled && (isPlaying || liveCue) && (
                  <div 
                    className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-[9px] text-[#00e5cc] font-mono animate-pulse"
                    title="Analizator dialogów i tłumacz AI nasłuchuje mowy podczas odtwarzania"
                  >
                    <Mic className="w-2.5 h-2.5 text-[#00e5cc]" />
                    <span className="truncate max-w-[110px]">
                      {liveCue ? (liveCue.translatedText || liveCue.originalText).slice(0, 16) + '...' : 'AI Słucha...'}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleAutoSyncSubtitles(false)}
                  disabled={isSubtitlesSyncing}
                  className="px-2 py-0.5 bg-[#1f1f26] hover:bg-[#282834] text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded text-[10px] font-mono flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  title="Wymuś ponowne przeskanowanie i przetłumaczenie dźwięku filmu na napisy PL przez AI"
                >
                  <Sparkles className={`w-3 h-3 text-amber-400 ${isSubtitlesSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSubtitlesSyncing ? 'Analiza...' : 'Skanuj Audio'}</span>
                </button>
              </div>
            </div>

            {/* Right: Inspector Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsRightPanelOpen(prev => !prev)}
                className={`p-1 rounded-md border text-xs flex items-center gap-1 cursor-pointer transition ${
                  isRightPanelOpen
                    ? 'bg-[#22222a] border-[#363642] text-amber-400'
                    : 'bg-[#18181c] border-transparent text-zinc-500 hover:text-white'
                }`}
                title={isRightPanelOpen ? 'Ukryj panel parametrów' : 'Pokaż panel parametrów'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px] font-mono">Parametry</span>
              </button>
            </div>
          </div>

          {/* Viewport with Aspect Ratio constraint */}
          <div 
            ref={viewportContainerRef}
            className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden bg-[#09090b] relative select-none p-2 sm:p-3"
          >
            {/* Aspect Ratio Canvas Stage */}
            <div 
              style={viewportAspectStyle}
              className="relative max-w-full max-h-full flex items-center justify-center bg-black rounded-xl shadow-2xl overflow-hidden border border-[#27272a]/80 ring-1 ring-white/10 shrink-0"
            >
              {/* Empty State when no active clip on playhead */}
              {!activeClip && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-zinc-500 bg-[#0c0c0e] select-none pointer-events-none z-0">
                  <Film className="w-10 h-10 text-zinc-600 mb-2 opacity-50 stroke-[1.5]" />
                  <div className="text-xs font-semibold text-zinc-400">Brak materiału na pozycji głowicy</div>
                  <div className="text-[11px] text-zinc-600 mt-1 max-w-xs">Przeciągnij wideo lub zdjęcie z biblioteki na oś czasu poniżej</div>
                </div>
              )}

              {/* Cinematic Ambient Blur Background for mixed horizontal/vertical clips */}
              {fitStyle === 'blur' && (activeMediaSourceUrl || activeClip?.thumbnailUrl) && (
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
                  {activeClip?.type === 'image' ? (
                    <img
                      src={activeMediaSourceUrl || activeClip.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover filter blur-3xl opacity-45 scale-125"
                    />
                  ) : (
                    <video
                      src={activeMediaSourceUrl}
                      muted
                      playsInline
                      className="w-full h-full object-cover filter blur-3xl opacity-45 scale-125"
                    />
                  )}
                </div>
              )}

              {/* Video Element with Real-Time GPU Color Grading & Beauty Filters */}
              <video
                ref={videoRef}
                src={activeClip?.type === 'video' && activeMediaSourceUrl ? activeMediaSourceUrl : undefined}
                playsInline
                style={{ filter: beautyFilterStyle }}
                className={`relative z-10 w-full h-full pointer-events-none transition-opacity duration-150 ${
                  activeClip?.type === 'video' && activeMediaSourceUrl ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
                } ${
                  fitStyle === 'fill' ? 'object-cover' : 'object-contain'
                }`}
                onLoadedMetadata={() => {
                  if (videoRef.current && activeTimelineItem) {
                    const timeInItem = Math.max(0, currentTime - activeTimelineItem.timelineStart);
                    const target = activeTimelineItem.sourceStart + (timeInItem * (activeTimelineItem.speed || 1));
                    if (Number.isFinite(target) && videoRef.current.readyState >= 1) {
                      try { videoRef.current.currentTime = target; } catch (e) {}
                    }
                  }
                }}
                onError={() => {
                  if (activeClip) {
                    console.warn('[MontageView] Video element error, resolving fresh media URL for clip:', activeClip.name);
                    resolveClipUrl(activeClip);
                  }
                }}
              />

              {/* Photo Element with Color Grading & Beauty Filters */}
              <img
                src={activeClip?.type === 'image' ? (activeMediaSourceUrl || activeClip?.thumbnailUrl || undefined) : undefined}
                alt={activeClip?.name || 'Zdjęcie'}
                style={{ filter: beautyFilterStyle }}
                className={`relative z-10 w-full h-full pointer-events-none transition-opacity duration-150 ${
                  activeClip?.type === 'image' && (activeMediaSourceUrl || activeClip?.thumbnailUrl) ? 'block opacity-100' : 'hidden opacity-0 pointer-events-none'
                } ${
                  fitStyle === 'fill' ? 'object-cover' : 'object-contain'
                }`}
              />

              {/* Cinematic Vignette Overlay Layer */}
              {beautyGrade.enabled && beautyGrade.vignette > 0 && (
                <div 
                  className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, transparent ${Math.max(20, 100 - beautyGrade.vignette * 0.7)}%, rgba(0, 0, 0, ${(beautyGrade.vignette / 100) * 0.85}) 100%)`
                  }}
                />
              )}

              {/* Studio Beauty Skin Glow & Soft Diffuse Overlay Layer */}
              {beautyGrade.enabled && beautyGrade.skinGlow > 0 && (
                <div 
                  className="absolute inset-0 z-20 pointer-events-none mix-blend-screen transition-opacity duration-300"
                  style={{
                    opacity: (beautyGrade.skinGlow / 100) * 0.35,
                    background: 'radial-gradient(ellipse at 50% 40%, rgba(255, 237, 213, 0.5) 0%, rgba(254, 215, 170, 0.2) 40%, transparent 75%)'
                  }}
                />
              )}

              {/* Offscreen Audio Pool Host */}
              <div
                ref={offscreenAudioHostRef}
                style={{ position: 'fixed', bottom: 0, right: 0, width: 16, height: 16, opacity: 0.001, pointerEvents: 'none', zIndex: -9999 }}
                aria-hidden="true"
              />

              {/* Dedication Overlay Preview */}
              {activeDedication && (
                <div className="absolute inset-x-4 bottom-14 z-30 flex justify-center pointer-events-none animate-in fade-in duration-300">
                  <div className="bg-black/85 backdrop-blur-xl border border-indigo-500/40 rounded-2xl px-6 py-4 max-w-xl text-center shadow-2xl space-y-1">
                    {activeDedication.title && (
                      <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase block">
                        ✦ {activeDedication.title} ✦
                      </span>
                    )}
                    <p className="text-white text-xs sm:text-sm font-sans italic tracking-wide leading-relaxed">
                      „{activeDedication.text}”
                    </p>
                    {activeDedication.author && (
                      <div className="text-indigo-400 text-[10px] font-mono font-medium tracking-wider pt-0.5">
                        — {activeDedication.author} —
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTitleCard && (
                <div 
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: activeTitleCard.backgroundColor === 'gradient'
                      ? 'linear-gradient(135deg, #111827 0%, #030712 100%)'
                      : activeTitleCard.backgroundColor || 'rgba(0, 0, 0, 0.85)'
                  }}
                >
                  <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-widest uppercase text-center mb-2 font-sans">
                    {activeTitleCard.text}
                  </h3>
                  {activeTitleCard.subtitle && (
                    <p className="text-xs sm:text-sm font-sans tracking-wide text-indigo-300 text-center">
                      {activeTitleCard.subtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Dynamic Subtitles & Text Layers Overlay Preview */}
              {(project.textLayers || [])
                .filter(t => {
                  if (!isSubtitlesEnabled && (t.type === 'caption' || t.type === 'subtitle')) {
                    return false;
                  }
                  return currentTime >= t.timelineStart && currentTime < t.timelineStart + t.duration;
                })
                .map(layer => (
                  <div 
                    key={layer.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none transition-all duration-200 px-4 py-2 rounded-2xl z-20 font-sans font-bold select-none"
                    style={{ 
                      left: `${(layer.position?.x ?? 0.5) * 100}%`, 
                      top: `${(layer.position?.y ?? 0.85) * 100}%`,
                      color: layer.color || '#ffffff',
                      backgroundColor: layer.backgroundColor || 'rgba(0, 0, 0, 0.82)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(251, 191, 36, 0.35)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), 0 0 16px rgba(251, 191, 36, 0.2)',
                      fontSize: `clamp(14px, ${Math.min(26, Math.max(14, (layer.fontSize && layer.fontSize > 10 ? layer.fontSize * 0.72 : (layer.fontSize || 18))))}px, 24px)`,
                      textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 10px rgba(251, 191, 36, 0.35)',
                      maxWidth: '90%',
                      lineHeight: 1.35
                    }}
                  >
                    {layer.subtitleSpeaker && (
                      <span className="block text-[9px] font-mono uppercase tracking-widest text-amber-300/90 mb-0.5">
                        {layer.subtitleSpeaker}
                      </span>
                    )}
                    {layer.text}
                  </div>
                ))}

              {/* Live AI Dialogue & Translation Banner (When speech is detected during playback) */}
              {isSubtitlesEnabled && liveCue && !(project.textLayers || []).some(t => 
                (t.type === 'caption' || t.type === 'subtitle') &&
                currentTime >= t.timelineStart && currentTime < t.timelineStart + t.duration
              ) && (
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none transition-all duration-150 px-4 py-2 rounded-2xl z-30 font-sans select-none animate-in fade-in zoom-in-95"
                  style={{ 
                    left: '50%', 
                    top: '84%',
                    background: 'rgba(9, 9, 13, 0.88)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 229, 204, 0.45)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 229, 204, 0.25)',
                    maxWidth: '88%'
                  }}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1 text-[9px] font-mono text-[#00e5cc] tracking-wider uppercase font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e5cc] animate-pulse" />
                    <span>AI DIALOG & TŁUMACZ PL</span>
                  </div>
                  <span 
                    className="text-white font-extrabold tracking-wide"
                    style={{
                      fontSize: 'clamp(14px, 2.2vw, 22px)',
                      textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 8px rgba(0,229,204,0.35)'
                    }}
                  >
                    {liveCue.translatedText || liveCue.originalText}
                  </span>
                </div>
              )}

              {/* AI Dialogue Scanning Active Indicator */}
              {isSubtitlesSyncing && (
                <div 
                  className="absolute transform -translate-x-1/2 text-center pointer-events-none transition-all duration-200 px-3.5 py-1.5 rounded-full z-30 font-sans select-none animate-in fade-in"
                  style={{ 
                    left: '50%', 
                    top: '85%',
                    background: 'rgba(10, 15, 25, 0.92)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 229, 204, 0.5)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 229, 204, 0.3)'
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-cyan-300 font-bold tracking-wide">
                    <span className="w-2 h-2 rounded-full bg-[#00e5cc] animate-ping" />
                    <span>🎙️ AI Analizuje dialogi filmu i tłumaczy na język polski...</span>
                  </div>
                </div>
              )}

              {/* Subtle Timecode Indicator on Desktop Stage */}
              <div className="hidden sm:flex absolute bottom-2.5 right-2.5 z-20 items-center gap-1.5 pointer-events-none">
                <div className="bg-[#121214]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#26262b] text-[10px] font-mono text-zinc-300 shadow-sm">
                  {formatTimePrecise(currentTime)}
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE TRANSPORT CONTROL BAR (< 768px): Single line, zero wrapping, ergonomic 40px touch targets */}
          <div className="flex md:hidden w-full bg-[#18181c] border-t border-[#26262b] px-2 py-1 items-center justify-between shrink-0 select-none gap-1">
            {/* Playback Shuttle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSkip(-5)}
                className="px-3 py-1.5 rounded-xl bg-[#22222a] text-zinc-300 active:bg-zinc-700 text-xs font-mono border border-[#2e2e36] min-h-[40px] cursor-pointer touch-manipulation"
                title="Cofnij 5s"
              >
                -5s
              </button>

              <button
                onClick={handlePlayToggle}
                className="px-4 py-1.5 rounded-xl bg-[#facc15] active:bg-[#eab308] text-[#121214] font-bold flex items-center gap-1.5 min-h-[40px] shadow-sm cursor-pointer touch-manipulation"
                title={isPlaying ? 'Pauza' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-[#121214]" /> : <Play className="w-4 h-4 fill-[#121214]" />}
                <span className="text-xs font-mono font-bold">{isPlaying ? 'PAUZA' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => handleSkip(5)}
                className="px-3 py-1.5 rounded-xl bg-[#22222a] text-zinc-300 active:bg-zinc-700 text-xs font-mono border border-[#2e2e36] min-h-[40px] cursor-pointer touch-manipulation"
                title="Przewiń 5s"
              >
                +5s
              </button>
            </div>

            {/* Compact Timecode Counter & Polish Subtitles Toggle */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleTogglePolishSubtitles}
                className={`px-1.5 py-1 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 transition-all min-h-[32px] cursor-pointer ${
                  isSubtitlesEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs'
                    : 'text-zinc-500 bg-zinc-900/60 border border-zinc-800'
                }`}
                title={isSubtitlesEnabled ? 'Polskie napisy włączone (kliknij aby wyłączyć)' : 'Włącz polskie napisy'}
              >
                <MessageSquare className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>PL:{isSubtitlesEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <div className="font-mono text-[10px] text-amber-400 bg-[#121214] px-1.5 py-1 rounded-md border border-[#26262b] shrink-0">
                {formatTimeSimple(currentTime)} / {formatTimeSimple(totalDuration)}
              </div>
            </div>

            {/* Quick Format & Fullscreen */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAspectMode(aspectMode === '16:9' ? '9:16' : (aspectMode === '9:16' ? '1:1' : '16:9'))}
                className="px-2 py-1.5 bg-[#22222a] border border-[#26262b] text-amber-400 rounded-xl text-[10px] font-mono font-bold min-h-[36px] flex items-center cursor-pointer"
                title="Przełącz format kadru"
              >
                {aspectMode}
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-xl bg-[#22222a] text-zinc-300 border border-[#26262b] min-h-[36px] flex items-center justify-center cursor-pointer"
                title="Pełny ekran"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* DESKTOP TRANSPORT CONTROL BAR (>= 768px): Pro Studio Non-Wrapping Toolbar */}
          <div className="hidden md:flex w-full bg-[#18181c] border-t border-[#26262b] px-3 py-2 items-center justify-between gap-2 shrink-0 select-none">
            {/* Transport Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSkip(-5)}
                className="px-2.5 py-1.5 rounded-lg bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs font-mono border border-[#26262b]"
                title="Cofnij o 5 sekund"
              >
                -5s
              </button>

              {/* CapCut Yellow Play Button */}
              <button
                onClick={handlePlayToggle}
                className="px-4 py-1.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={isPlaying ? 'Pauza (Spacja)' : 'Odtwórz (Spacja)'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-[#121214]" /> : <Play className="w-4 h-4 fill-[#121214]" />}
                <span className="text-xs uppercase font-mono tracking-wider font-bold">{isPlaying ? 'PAUZA' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => handleSkip(5)}
                className="px-2.5 py-1.5 rounded-lg bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs font-mono border border-[#26262b]"
                title="Przewiń o 5 sekund"
              >
                +5s
              </button>

              {/* Split at Playhead Button */}
              {onSplitTimelineItem && (
                <button
                  onClick={handleSplitAtPlayhead}
                  className="px-3 py-1.5 bg-[#22222a] hover:bg-[#282830] border border-[#26262b] text-zinc-200 hover:text-white rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer"
                  title="Rozetnij ujęcie w pozycji suwaka czasu [Skrót: B]"
                >
                  <Scissors className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Rozetnij (B)</span>
                </button>
              )}
            </div>

            {/* Timecode Display with Monospace Amber Counter */}
            <div className="font-mono text-xs text-amber-400 flex items-center gap-1.5 bg-[#121214] px-3 py-1 rounded-lg border border-[#26262b] shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">{formatTimePrecise(currentTime)}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{formatTimeSimple(totalDuration)}</span>
            </div>

            {/* Aspect Ratio, Fit Mode, Color & Volume Controls */}
            <div className="flex items-center gap-2">
              {/* Aspect Switcher */}
              <div className="flex items-center gap-0.5 bg-[#141416] p-0.5 rounded-lg border border-[#26262b] text-xs font-mono">
                {(['16:9', '9:16', '1:1'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setAspectMode(mode)}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                      aspectMode === mode ? 'bg-[#282830] text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Color Studio Button */}
              <button
                onClick={() => setIsBeautyStudioOpen(!isBeautyStudioOpen)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition ${
                  beautyGrade.enabled
                    ? 'bg-[#22222a] border-[#363642] text-amber-400 font-semibold'
                    : 'bg-[#22222a] border-[#26262b] text-zinc-400 hover:text-white'
                }`}
                title="Otwórz Studio Kolorów i Kinowych LUTów"
              >
                <Sparkles className={`w-3.5 h-3.5 ${beautyGrade.enabled ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>KOLOR</span>
              </button>

              {/* Framing Fit Mode */}
              <button
                onClick={() => {
                  const next = fitStyle === 'fit' ? 'blur' : (fitStyle === 'blur' ? 'fill' : 'fit');
                  setFitStyle(next);
                }}
                className="px-2 py-1 bg-[#22222a] border border-[#26262b] rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-1 hover:bg-[#282830] cursor-pointer"
                title="Przełącz styl kadrowania: Dopasuj, Kinowe Rozmycie tła lub Wypełnij"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] hidden sm:inline">
                  {fitStyle === 'fit' ? 'Dopasuj' : fitStyle === 'blur' ? 'Rozmycie' : 'Wypełnij'}
                </span>
              </button>

              {/* Volume & Mute with Real-Time VU Meter */}
              <div className="flex items-center gap-1.5 bg-[#22222a] px-2 py-1 rounded-lg border border-[#26262b]">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                  title={isMuted ? 'Wyłącz wyciszenie' : 'Wycisz dźwięk'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-300" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-12 sm:w-14 accent-amber-400 cursor-pointer"
                />
                <AudioVuMeter isPlaying={isPlaying} isMuted={isMuted} className="hidden xs:flex border-none !p-0 !bg-transparent" />
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-[#141416] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-colors cursor-pointer"
                title="Pełny ekran"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Right Inspector / Parameters Panel (Desktop Only Here) */}
        {isRightPanelOpen && (
          <div className="hidden md:flex w-full md:w-[300px] lg:w-[330px] xl:w-[360px] shrink-0 h-full overflow-hidden transition-all duration-200 bg-[#18181c] border border-[#27272a] rounded-xl min-h-0 flex-col">
            <CapCutInspectorPanel
              selectedItem={selectedItem || null}
              selectedClip={selectedClip || null}
              project={project}
              onUpdateTimelineItem={onUpdateTimelineItem}
              onDeleteTimelineItem={onDeleteTimelineItem}
            />
          </div>
        )}
      </div>

        {/* Studio Kolorów i Efektów Piękna (Floating Modal Drawer - Never pushes timeline down) */}
        {isBeautyStudioOpen && (
          <div 
            onClick={() => setIsBeautyStudioOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fadeIn"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#141418] border border-amber-500/30 rounded-2xl p-4 text-xs space-y-3 shadow-2xl max-h-[85dvh] overflow-y-auto custom-scrollbar"
            >
              {/* Drawer Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs tracking-tight flex items-center gap-1.5 font-sans">
                      Studio Kolorów & Kinowych Efektów
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        GPU 4K
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      const next = !beautyGrade.enabled;
                      setBeautyGrade(prev => ({ ...prev, enabled: next }));
                      toast.showInfo(next ? '✨ Włączono efekty kolorystyczne.' : 'Wyłączono efekty.');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs cursor-pointer transition flex items-center gap-1 border ${
                      beautyGrade.enabled
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{beautyGrade.enabled ? 'WŁ' : 'WYŁ'}</span>
                  </button>

                  <button
                    onClick={() => handleApplyBeautyPreset('beauty_glow')}
                    className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-black cursor-pointer transition flex items-center gap-1"
                    title="Auto Piękno"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto Piękno</span>
                  </button>

                  <button
                    onClick={() => handleApplyBeautyPreset('none')}
                    className="px-2 py-1 rounded-lg font-mono text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => setIsBeautyStudioOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition"
                    title="Zamknij studio kolorów"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Preset Cards Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {(Object.keys(BEAUTY_PRESETS) as BeautyPreset[]).map((key) => {
                  const p = BEAUTY_PRESETS[key];
                  const isSelected = beautyGrade.enabled && beautyGrade.preset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleApplyBeautyPreset(key)}
                      className={`p-2 rounded-xl border flex flex-col items-center text-center gap-1 transition-all cursor-pointer min-w-[90px] shrink-0 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                          : 'bg-zinc-900/80 hover:bg-zinc-800 border-white/[0.06] text-zinc-300'
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <span className="font-bold text-[10px] leading-tight truncate w-full">{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 border-t border-white/[0.06]">
                {/* Skin Glow */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Blask Cery</span>
                    <span className="font-bold text-amber-400">{beautyGrade.skinGlow}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={beautyGrade.skinGlow}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, skinGlow: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Jasność</span>
                    <span className="font-bold text-yellow-400">{beautyGrade.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={140}
                    value={beautyGrade.brightness}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, brightness: parseInt(e.target.value, 10) }))}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Kontrast</span>
                    <span className="font-bold text-indigo-400">{beautyGrade.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={150}
                    value={beautyGrade.contrast}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, contrast: parseInt(e.target.value, 10) }))}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Nasycenie</span>
                    <span className="font-bold text-pink-400">{beautyGrade.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={beautyGrade.saturation}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, saturation: parseInt(e.target.value, 10) }))}
                    className="w-full accent-pink-400 cursor-pointer"
                  />
                </div>

                {/* Warmth */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Ciepło</span>
                    <span className="font-bold text-orange-400">{beautyGrade.warmth > 0 ? `+${beautyGrade.warmth}` : beautyGrade.warmth}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={beautyGrade.warmth}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, warmth: parseInt(e.target.value, 10) }))}
                    className="w-full accent-orange-400 cursor-pointer"
                  />
                </div>

                {/* Vignette */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Winieta</span>
                    <span className="font-bold text-cyan-400">{beautyGrade.vignette}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={beautyGrade.vignette}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, vignette: parseInt(e.target.value, 10) }))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Sharpness */}
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-white/[0.06] space-y-1">
                  <div className="flex justify-between text-zinc-300 font-mono text-[10px]">
                    <span>Ostrość</span>
                    <span className="font-bold text-emerald-400">{beautyGrade.sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={beautyGrade.sharpness}
                    onChange={(e) => setBeautyGrade(prev => ({ ...prev, enabled: true, sharpness: parseInt(e.target.value, 10) }))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Segmented Workspace Switcher (Positioned between Player and Lower Workspace on Mobile) */}
        <div className="flex md:hidden items-center justify-between bg-[#18181c] border border-zinc-800/90 rounded-xl p-1 shrink-0 gap-1 z-20">
          <button
            type="button"
            onClick={() => setMobileActiveView('montage')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              mobileActiveView === 'montage' 
                ? 'bg-amber-400 text-zinc-950 shadow-sm font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Oś Montażu</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('resources')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              mobileActiveView === 'resources' 
                ? 'bg-amber-400 text-zinc-950 shadow-sm font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zasoby & Filtry</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveView('inspector')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[36px] ${
              mobileActiveView === 'inspector' 
                ? 'bg-amber-400 text-zinc-950 shadow-sm font-bold' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Parametry {selectedItem ? '• 1' : ''}</span>
          </button>
        </div>

        {/* LOWER WORKSPACE CONTAINER:
            On Desktop: Grid Row 2 Timeline Multi-Track Editor
            On Mobile: Flex-1 dynamic area switching between Timeline, ResourceBrowser, and InspectorPanel */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col md:flex-none">
          {/* Mobile: Resource Browser View */}
          {mobileActiveView === 'resources' && (
            <div className="flex md:hidden flex-1 h-full min-h-0 overflow-hidden bg-[#18181c] border border-[#27272a] rounded-xl flex-col">
              <CapCutResourceBrowser
                project={project}
                activePreset={beautyGrade.preset}
                onSelectFilter={handleApplyBeautyPreset}
                onAddMediaClick={() => onNavigateTab('media')}
                onOpenVoiceRecorder={onOpenVoiceRecorder}
                onOpenBeatSync={onOpenBeatSync}
                onOpenAutoCaptions={onOpenAutoCaptions}
                onAddClipToTimeline={(clip) => {
                  if (onUpdateTimelineItems) {
                    const newItem: TimelineItem = {
                      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      clipId: clip.id,
                      trackId: 'v1',
                      sourceStart: 0,
                      sourceEnd: clip.duration,
                      timelineStart: totalDuration,
                      duration: clip.duration,
                      speed: 1.0,
                      volume: 1.0,
                      fadeIn: 0,
                      fadeOut: 0,
                      muted: false,
                      scale: 1.0,
                      rotation: 0
                    };
                    onUpdateTimelineItems([...sortedItems, newItem]);
                    toast.showSuccess(`Dodano "${clip.name}" do osi montażu.`);
                    setMobileActiveView('montage');
                  }
                }}
              />
            </div>
          )}

          {/* Mobile: Inspector Panel View */}
          {mobileActiveView === 'inspector' && (
            <div className="flex md:hidden flex-1 h-full min-h-0 overflow-hidden bg-[#18181c] border border-[#27272a] rounded-xl flex-col">
              <CapCutInspectorPanel
                selectedItem={selectedItem || null}
                selectedClip={selectedClip || null}
                project={project}
                onUpdateTimelineItem={onUpdateTimelineItem}
                onDeleteTimelineItem={onDeleteTimelineItem}
              />
            </div>
          )}

          {/* Timeline Multi-Track Editor Section */}
          <div className={`bg-[#18181c] border border-zinc-800/80 rounded-xl p-1.5 sm:p-2.5 shadow-xl flex flex-col transition-all duration-200 overflow-hidden min-h-0 w-full ${
            mobileActiveView === 'montage' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'
          } ${
            timelineHeightMode === 'collapsed' 
              ? 'md:h-10' 
              : timelineHeightMode === 'compact' 
                ? 'md:h-44' 
                : timelineHeightMode === 'tall' 
                  ? 'md:h-80 lg:md:h-96' 
                  : 'md:h-60 lg:md:h-68'
          }`}>
          {/* MOBILE TIMELINE ACTION BAR (< 768px): Single clean row, zero line wraps, touch-friendly min 36px targets */}
          <div className="flex md:hidden items-center justify-between gap-1 pb-1.5 border-b border-[#26262b] text-xs select-none">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSplitAtPlayhead}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#22222a] active:bg-amber-400 active:text-black border border-[#2e2e36] rounded-xl text-xs font-semibold cursor-pointer transition min-h-[40px] touch-manipulation"
                title="Rozetnij ujęcie w pozycji suwaka czasu"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Rozetnij</span>
              </button>

              <button
                onClick={() => {
                  if (!selectedItem) {
                    toast.showWarning('Zaznacz ujęcie, które chcesz usunąć.');
                    return;
                  }
                  onDeleteTimelineItem(selectedItem.id);
                  toast.showInfo('Usunięto ujęcie z osi.');
                }}
                disabled={!selectedItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#22222a] active:bg-rose-600 active:text-white border border-[#2e2e36] rounded-xl text-xs font-semibold cursor-pointer transition min-h-[40px] disabled:opacity-30 disabled:pointer-events-none text-rose-300 touch-manipulation"
                title="Usuń wybrane ujęcie"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Usuń</span>
              </button>

              <button
                onClick={() => {
                  if (!selectedItem || !onUpdateTimelineItems) return;
                  const currentIndex = sortedItems.findIndex(i => i.id === selectedItem.id);
                  const cloned: TimelineItem = {
                    ...selectedItem,
                    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
                  };
                  const updated = [...sortedItems];
                  updated.splice(currentIndex + 1, 0, cloned);
                  let runningTime = 0;
                  const normalized = updated.map(item => {
                    const recalculated = { ...item, timelineStart: runningTime };
                    runningTime += item.duration;
                    return recalculated;
                  });
                  onUpdateTimelineItems(normalized);
                  toast.showSuccess('Zduplikowano ujęcie.');
                }}
                disabled={!selectedItem || !onUpdateTimelineItems}
                className="p-2 bg-[#22222a] active:bg-zinc-700 text-cyan-300 border border-[#2e2e36] rounded-xl text-xs cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none touch-manipulation"
                title="Zduplikuj ujęcie"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (!selectedItem) return;
                  const nextRot = (((selectedItem.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
                  onUpdateTimelineItem(selectedItem.id, { rotation: nextRot });
                  toast.showSuccess(`↻ Obrócono do ${nextRot}°.`);
                }}
                disabled={!selectedItem}
                className="p-2 bg-[#22222a] active:bg-zinc-700 text-amber-400 border border-[#2e2e36] rounded-xl text-xs cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none touch-manipulation"
                title="Obróć o 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#121214] p-0.5 rounded-xl border border-[#26262b]">
              <button
                onClick={() => setTimelineZoom(prev => Math.max(50, prev - 25))}
                className="p-1.5 text-zinc-400 active:text-white rounded-lg cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Pomniejsz oś"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[10px] font-mono font-bold text-amber-400">{timelineZoom}%</span>
              <button
                onClick={() => setTimelineZoom(prev => Math.min(300, prev + 25))}
                className="p-1.5 text-zinc-400 active:text-white rounded-lg cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Powiększ oś"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DESKTOP TIMELINE TOOLBAR (>= 768px): Unified Non-Wrapping Pro Studio Toolbar */}
          <div className="hidden md:flex items-center justify-between gap-2 text-xs font-mono pb-2 border-b border-[#26262b] select-none">
            {/* Left: Sequence Selector, Chevron & Essential Clip Tools */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTimelineHeightMode(prev => prev === 'collapsed' ? 'standard' : 'collapsed')}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded hover:bg-[#22222a]"
                title={timelineHeightMode === 'collapsed' ? 'Rozwiń oś czasu' : 'Zwiń oś czasu'}
              >
                {timelineHeightMode === 'collapsed' ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Sequence Switcher Badge */}
              <div className="flex items-center gap-1 bg-[#121214] border border-[#26262b] rounded-lg px-2 py-1 text-xs">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={project.activeSequenceId || (project.sequences && project.sequences[0]?.id) || 'default'}
                  onChange={(e) => onSwitchSequence?.(e.target.value)}
                  className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                >
                  {(project.sequences && project.sequences.length > 0 ? project.sequences : [
                    { id: 'default', name: 'Master 16:9', aspectRatio: '16:9' }
                  ]).map(seq => (
                    <option key={seq.id} value={seq.id} className="bg-zinc-900 text-white">
                      {seq.name} [{seq.aspectRatio}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Smart Reflow 9:16 */}
              {onDuplicateSequence && (
                <button
                  onClick={() => {
                    const currentSeq = (project.sequences || []).find(s => s.id === project.activeSequenceId) || {
                      id: 'default',
                      name: 'Master 16:9',
                      aspectRatio: '16:9',
                      tracks: project.tracks,
                      timelineItems: project.timelineItems,
                      audioTracks: project.audioTracks,
                      textLayers: project.textLayers,
                      markers: project.markers,
                      createdAt: project.createdAt,
                      updatedAt: project.updatedAt
                    };
                    const reflowed = SequenceManager.smartReflow(currentSeq as any, '9:16', `${currentSeq.name} (Reels 9:16)`);
                    if (onCreateSequence) {
                      onCreateSequence(reflowed.name, '9:16');
                      if (onUpdateTimelineItems) onUpdateTimelineItems(reflowed.timelineItems);
                    } else {
                      onDuplicateSequence(currentSeq.id, reflowed.name, '9:16');
                    }
                    setAspectMode('9:16');
                    toast.showSuccess('⚡ Smart Reflow: utworzono sekwencję pionową 9:16!');
                  }}
                  className="px-2 py-1 bg-[#22222a] hover:bg-[#282830] border border-[#26262b] text-zinc-300 hover:text-white rounded-lg text-[11px] font-sans flex items-center gap-1 cursor-pointer transition"
                  title="Smart Reflow 9:16 (TikTok / Reels)"
                >
                  <Smartphone className="w-3 h-3 text-amber-400" />
                  <span className="hidden lg:inline">Reflow 9:16</span>
                </button>
              )}

              <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

              {/* Split Tool (B) */}
              <button
                onClick={handleSplitAtPlayhead}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#22222a] hover:bg-amber-400 hover:text-black border border-[#26262b] rounded-lg text-xs font-medium cursor-pointer transition shadow-xs"
                title="Rozetnij ujęcie w pozycji suwaka czasu [Skrót: B]"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span className="font-semibold">Rozetnij</span>
                <span className="text-[10px] text-zinc-500 font-mono hidden xl:inline">[B]</span>
              </button>

              {/* Delete Selected Item */}
              <button
                onClick={() => {
                  if (!selectedItem) {
                    toast.showWarning('Zaznacz ujęcie, które chcesz usunąć.');
                    return;
                  }
                  onDeleteTimelineItem(selectedItem.id);
                  toast.showInfo('Usunięto ujęcie z osi.');
                }}
                disabled={!selectedItem}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#22222a] hover:bg-rose-600 hover:text-white border border-[#26262b] rounded-lg text-xs font-medium cursor-pointer transition shadow-xs disabled:opacity-30 disabled:pointer-events-none text-rose-300"
                title="Usuń ujęcie [Delete]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="font-semibold">Usuń</span>
              </button>

              {/* Duplicate */}
              <button
                onClick={() => {
                  if (!selectedItem || !onUpdateTimelineItems) return;
                  const currentIndex = sortedItems.findIndex(i => i.id === selectedItem.id);
                  const cloned: TimelineItem = {
                    ...selectedItem,
                    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
                  };
                  const updated = [...sortedItems];
                  updated.splice(currentIndex + 1, 0, cloned);
                  let runningTime = 0;
                  const normalized = updated.map(item => {
                    const recalculated = { ...item, timelineStart: runningTime };
                    runningTime += item.duration;
                    return recalculated;
                  });
                  onUpdateTimelineItems(normalized);
                  toast.showSuccess('Zduplikowano ujęcie.');
                }}
                disabled={!selectedItem || !onUpdateTimelineItems}
                className="flex items-center gap-1 px-2 py-1 bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white border border-[#26262b] rounded-lg text-xs cursor-pointer transition disabled:opacity-30 disabled:pointer-events-none"
                title="Klonuj wybrane ujęcie"
              >
                <Copy className="w-3 h-3 text-cyan-400" />
                <span className="hidden xl:inline">Klonuj</span>
              </button>

              {/* Rotate 90 */}
              <button
                onClick={() => {
                  if (!selectedItem) return;
                  const nextRot = (((selectedItem.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
                  onUpdateTimelineItem(selectedItem.id, { rotation: nextRot });
                  toast.showSuccess(`↻ Obrócono do ${nextRot}°.`);
                }}
                disabled={!selectedItem}
                className="p-1 bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white border border-[#26262b] rounded-lg text-xs cursor-pointer transition disabled:opacity-30 disabled:pointer-events-none"
                title="Obróć o 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* Center: Precise Timecode Display */}
            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-[#121214] px-2.5 py-1 rounded-lg border border-[#26262b]">
              <span className="text-emerald-400 font-bold">{formatTimePrecise(currentTime)}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{formatTimePrecise(totalDuration)}</span>
            </div>

            {/* Right: Height Selector & Zoom */}
            <div className="flex items-center gap-2">
              {/* Quick Audio Triggers */}
              <input 
                type="file" 
                ref={fileAudioInputRef} 
                accept="audio/*" 
                className="hidden" 
                onChange={handleUploadAudioFile} 
              />

              {onAddAudioTrack && (
                <button
                  onClick={() => fileAudioInputRef.current?.click()}
                  className="px-2 py-1 bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white border border-[#26262b] rounded-lg text-[11px] font-sans flex items-center gap-1 cursor-pointer transition"
                  title="Wgraj plik MP3 jako muzykę w tle"
                >
                  <Music className="w-3 h-3 text-amber-400" />
                  <span className="hidden xl:inline">+ MP3</span>
                </button>
              )}

              {onOpenBeatSync && (
                <button
                  onClick={onOpenBeatSync}
                  className="px-2 py-1 bg-[#22222a] hover:bg-[#282830] text-zinc-300 hover:text-white border border-[#26262b] rounded-lg text-[11px] font-sans flex items-center gap-1 cursor-pointer transition"
                  title="Dopasuj cięcia do rytmu muzyki"
                >
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span className="hidden xl:inline">Beat-Sync</span>
                </button>
              )}

              <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

              {/* Height Switcher */}
              <div className="flex items-center gap-0.5 bg-[#121214] p-0.5 rounded-lg border border-[#26262b] text-[10px] font-sans">
                <button
                  onClick={() => setTimelineHeightMode('compact')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition ${timelineHeightMode === 'compact' ? 'bg-amber-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Kompakt
                </button>
                <button
                  onClick={() => setTimelineHeightMode('standard')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition ${timelineHeightMode === 'standard' ? 'bg-amber-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Średnia
                </button>
                <button
                  onClick={() => setTimelineHeightMode('tall')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition ${timelineHeightMode === 'tall' ? 'bg-amber-400 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  Duża
                </button>
              </div>

              {/* Timeline Zoom */}
              <div className="flex items-center gap-1 bg-[#121214] p-0.5 rounded-lg border border-[#26262b]">
                <button
                  onClick={() => setTimelineZoom(prev => Math.max(50, prev - 25))}
                  className="p-1 hover:text-white rounded cursor-pointer"
                  title="Pomniejsz oś"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="px-1 text-[10px] font-bold text-white">{timelineZoom}%</span>
                <button
                  onClick={() => setTimelineZoom(prev => Math.min(300, prev + 25))}
                  className="p-1 hover:text-white rounded cursor-pointer"
                  title="Powiększ oś"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Multi-Track Container */}
          <div 
            ref={timelineTrackRef}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 15 : -15;
                setTimelineZoom(prev => Math.max(50, Math.min(300, prev + delta)));
                return;
              }
              if (timelineTrackRef.current && (e.shiftKey || Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0)) {
                if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  timelineTrackRef.current.scrollLeft += e.deltaY;
                }
              }
            }}
            className="flex-1 w-full overflow-x-auto overflow-y-auto custom-scrollbar pt-2 pb-1 select-none space-y-2"
          >
            {/* TRACK 1: MAIN VIDEO & PHOTO CLIPS */}
            <div 
              style={{ width: `${timelineZoom}%`, minWidth: '100%' }}
              onClick={handleTrackClick}
              onTouchStart={handleTrackTouchStart}
              onTouchMove={handleTrackTouchMove}
              onMouseMove={handleTrackMouseMove}
              onMouseLeave={handleTrackMouseLeave}
              className="relative h-20 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex cursor-pointer transition-[width] duration-150 shadow-inner"
            >
              {/* Render Memoized Timeline Item Blocks */}
              {sortedItems.map((item, idx) => {
                const clip = clipMap.get(item.clipId);
                const widthPct = Math.max(3, (item.duration / Math.max(0.1, totalDuration)) * 100);
                const isSelected = item.id === selectedItemId;
                const isDraggingThis = draggedIdx === idx;
                const isTargetingThis = dragOverIdx === idx;

                return (
                  <TimelineItemCard
                    key={item.id}
                    item={item}
                    clip={clip}
                    idx={idx}
                    isSelected={isSelected}
                    isDraggingThis={isDraggingThis}
                    isTargetingThis={isTargetingThis}
                    widthPct={widthPct}
                    timelineZoom={timelineZoom}
                    onSelect={handleCardSelect}
                    onDragStart={handleCardDragStart}
                    onDragOver={handleCardDragOver}
                    onDragLeave={handleCardDragLeave}
                    onDrop={handleCardDrop}
                    onResolveClipUrl={resolveClipUrl}
                  />
                );
              })}

              {/* Hover Scrubbing Playhead & Time Preview */}
              {hoverPosition && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/50 pointer-events-none z-15 flex flex-col items-center"
                  style={{ left: `${hoverPosition.xPct}%` }}
                >
                  <div className="absolute -top-1 bg-black/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded border border-white/20 whitespace-nowrap shadow-md">
                    {formatTimeSimple(hoverPosition.timeSec)}
                  </div>
                </div>
              )}

              {/* Smooth Real-Time Playhead Marker */}
              {totalDuration > 0 && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20 shadow-[0_0_10px_rgba(251,191,36,0.9)] transition-[left] duration-75"
                  style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                >
                  <div className="w-3 h-3 -ml-1.5 -top-1.5 bg-amber-400 rotate-45 rounded-xs shadow-md" />
                </div>
              )}
            </div>

            {/* TRACK 2: CONTINUOUS AUDIO & MUSIC TRACKS */}
            <div 
              style={{ width: `${timelineZoom}%`, minWidth: '100%' }}
              className="relative min-h-[44px] bg-zinc-950 rounded-xl border border-[#26262b] p-1.5 flex flex-col gap-1 overflow-hidden"
            >
              <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                  <Music className="w-3 h-3 text-amber-400" />
                  ŚCIEŻKA AUDIO & GŁOS
                </span>
              </div>

              <div className="relative h-9 w-full bg-black/60 rounded-lg border border-[#26262b] overflow-hidden flex items-center px-1">
                {/* Beat Markers Overlay on Audio Track */}
                {totalDuration > 0 && (project.markers || []).filter(m => m.type === 'music').map(marker => {
                  const posPct = (marker.time / totalDuration) * 100;
                  const isDownbeat = marker.label === 'DOWNBEAT';
                  return (
                    <div
                      key={marker.id}
                      className={`absolute top-0 bottom-0 pointer-events-none z-10 transition-opacity ${
                        isDownbeat ? 'w-0.5 bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'w-px bg-amber-400/40'
                      }`}
                      style={{ left: `${posPct}%` }}
                      title={`Beat ${marker.time.toFixed(2)}s`}
                    />
                  );
                })}

                {(project.audioTracks || []).length === 0 ? (
                  <div className="w-full text-center text-[10px] font-mono text-zinc-500 py-1 italic flex items-center justify-center gap-1">
                    <span>Brak podkładu audio. Kliknij "+ MP3" lub "+ Głos" na pasku narzędzi.</span>
                  </div>
                ) : (
                  (project.audioTracks || []).map(track => {
                    const trackLeftPct = totalDuration > 0 ? (track.timelineStart / totalDuration) * 100 : 0;
                    const trackWidthPct = totalDuration > 0 ? Math.min(100, (track.duration / totalDuration) * 100) : 100;
                    const isVoice = track.trackType === 'voiceover';

                    return (
                      <div
                        key={track.id}
                        className={`absolute top-0.5 bottom-0.5 rounded-md px-2 flex items-center justify-between gap-1.5 border text-[10px] font-mono shadow transition-all ${
                          isVoice 
                            ? 'bg-[#25252e] border-[#383842] text-zinc-100 shadow-sm' 
                            : 'bg-[#1e1e24] border-[#2e2e36] text-zinc-100 shadow-sm'
                        }`}
                        style={{
                          left: `${trackLeftPct}%`,
                          width: `${Math.max(5, trackWidthPct)}%`,
                          minWidth: '130px'
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isVoice ? <Mic className="w-3 h-3 text-amber-400 shrink-0" /> : <Music className="w-3 h-3 text-zinc-300 shrink-0" />}
                          <span className="truncate font-bold">{track.name}</span>
                          {track.bpm && (
                            <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded text-amber-300 font-bold border border-amber-500/30">
                              {track.bpm} BPM
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onUpdateAudioTrack && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAudioTrack(track.id, { muted: !track.muted });
                              }}
                              className={`p-1 rounded cursor-pointer ${track.muted ? 'text-rose-400 bg-rose-950/50' : 'text-zinc-300 hover:bg-white/10'}`}
                              title={track.muted ? 'Włącz dźwięk' : 'Wycisz tę ścieżkę'}
                            >
                              {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                            </button>
                          )}

                          {onDeleteAudioTrack && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAudioTrack(track.id);
                                toast.showInfo(`Usunięto ścieżkę "${track.name}".`);
                              }}
                              className="p-1 rounded text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                              title="Usuń ścieżkę"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* TRACK 3: SUBTITLES & DYNAMIC TEXT LAYERS TRACK */}
            <div 
              style={{ width: `${timelineZoom}%`, minWidth: '100%' }}
              className="relative min-h-[38px] bg-zinc-950 rounded-xl border border-[#26262b] p-1.5 flex flex-col gap-1 overflow-hidden"
            >
              <div className="flex items-center justify-between px-1 text-[10px] font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                    <Type className="w-3 h-3 text-purple-400" />
                    ŚCIEŻKA NAPISÓW ({subtitlesCount})
                  </span>
                  <button
                    type="button"
                    onClick={handleTogglePolishSubtitles}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                      subtitlesCount > 0
                        ? isSubtitlesEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                        : isSubtitlesSyncing
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                    title={
                      subtitlesCount > 0
                        ? isSubtitlesEnabled ? 'Napisy włączone' : 'Napisy wyłączone'
                        : 'Wygeneruj napisy z filmu przez AI'
                    }
                  >
                    {subtitlesCount > 0
                      ? `PL: ${isSubtitlesEnabled ? 'ON' : 'OFF'}`
                      : isSubtitlesSyncing
                        ? 'AI Analiza...'
                        : '+ Generuj AI'}
                  </button>
                </div>
                {onOpenAutoCaptions && (
                  <button
                    onClick={onOpenAutoCaptions}
                    className="px-2 py-0.5 bg-[#1f1f24] hover:bg-[#282830] border border-[#26262b] text-zinc-300 rounded text-[9px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>Konfiguruj Napisy</span>
                  </button>
                )}
              </div>

              <div className="relative h-6 w-full bg-black/60 rounded-lg border border-purple-950/80 overflow-hidden flex items-center px-1">
                {((project.textLayers || []).filter(t => t.type === 'caption' || t.type === 'subtitle')).length === 0 ? (
                  <div className="w-full text-center text-[9px] font-mono text-purple-400/60 py-0.5 italic">
                    Brak napisów. Kliknij "Konfiguruj Napisy" aby dodać automatyczną transkrypcję.
                  </div>
                ) : (
                  ((project.textLayers || []).filter(t => t.type === 'caption' || t.type === 'subtitle')).map(tl => {
                    const tlLeftPct = totalDuration > 0 ? (tl.timelineStart / totalDuration) * 100 : 0;
                    const tlWidthPct = totalDuration > 0 ? Math.min(100, (tl.duration / totalDuration) * 100) : 100;
                    return (
                      <div
                        key={tl.id}
                        className="absolute top-0.5 bottom-0.5 rounded px-1.5 flex items-center border border-purple-500/60 bg-purple-950/80 text-purple-100 text-[9px] font-mono truncate shadow-xs cursor-pointer hover:bg-purple-900"
                        style={{
                          left: `${tlLeftPct}%`,
                          width: `${Math.max(3, tlWidthPct)}%`,
                          minWidth: '50px'
                        }}
                        onClick={() => onOpenAutoCaptions?.()}
                        title={`"${tl.text}" (${tl.timelineStart.toFixed(1)}s)`}
                      >
                        <span className="truncate">{tl.text}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
