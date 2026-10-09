import React, { useState } from 'react';
import { 
  Check, 
  RotateCw, 
  Trash2, 
  Sliders, 
  Gauge, 
  Sparkles, 
  Palette, 
  Volume2, 
  VolumeX, 
  ChevronDown,
  Scaling,
  Scissors,
  Wand2,
  Layers,
  Zap,
  Eye,
  SlidersHorizontal,
  Sun,
  Contrast,
  Smile,
  ShieldAlert,
  Type,
  Clock,
  Flame
} from 'lucide-react';
import type { TimelineItem, MediaClip, ProjectState, ClipColorAdjustments, TransitionType, TitleCard } from '../../types/project';

interface StudioInspectorPanelProps {
  selectedItem: TimelineItem | null;
  selectedClip: MediaClip | null;
  project: ProjectState;
  onUpdateTimelineItem: (id: string, updates: Partial<TimelineItem>) => void;
  onDeleteTimelineItem: (id: string) => void;
}

export function StudioInspectorPanel({
  selectedItem,
  selectedClip,
  project,
  onUpdateTimelineItem,
  onDeleteTimelineItem
}: StudioInspectorPanelProps) {
  const [mainTab, setMainTab] = useState<'video' | 'audio' | 'speed' | 'animation' | 'adjust' | 'title'>('video');

  // If no item is selected, render Project Details View
  if (!selectedItem || !selectedClip) {
    return (
      <div className="w-full h-full flex flex-col bg-[#141416] border border-zinc-800/80 rounded-xl p-3.5 select-none overflow-y-auto custom-scrollbar">
        <h3 className="text-xs font-bold text-white mb-3.5 flex items-center justify-between border-b border-zinc-800 pb-2.5 font-mono">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Szczegóły Projektu
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
            PRO
          </span>
        </h3>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Nazwa Projektu:</span>
            <span className="text-zinc-200 font-mono font-medium truncate max-w-[160px]">{project.name || 'Nowy Projekt'}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Pamięć Cache:</span>
            <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[160px]">IndexedDB + Chmura</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Format Klatki:</span>
            <span className="text-amber-400 font-mono font-bold">
              {project.sequences?.find(s => s.id === project.activeSequenceId)?.aspectRatio || '16:9'}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Jakość Master:</span>
            <span className="text-zinc-200 font-mono">4K UHD (3840×2160)</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Płynność Klatek:</span>
            <span className="text-zinc-200 font-mono">{project.settings?.targetFps || 30} FPS</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Liczba Mediów:</span>
            <span className="text-amber-400 font-mono font-bold">{project.mediaLibrary?.length || 0}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-zinc-800/40">
            <span>Silnik GPU:</span>
            <span className="text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WebGL2 + WebCodecs
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs space-y-1.5">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Wskazówka Montażu:
          </p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Kliknij dowolne ujęcie na osi czasu, aby edytować skalę, obrót, kadrowanie, przejścia, głośność, prędkość oraz korekcję barwną GPU.
          </p>
        </div>
      </div>
    );
  }

  // Get current color adjustments or defaults
  const colorAdj: ClipColorAdjustments = selectedItem.colorAdjustments || {
    exposure: 0,
    contrast: 0,
    brightness: 0,
    saturation: 0,
    temperature: 0,
    tint: 0,
    sharpness: 0,
    highlights: 0,
    shadows: 0,
    vignette: 0
  };

  const handleColorChange = (key: keyof ClipColorAdjustments, value: number) => {
    onUpdateTimelineItem(selectedItem.id, {
      colorAdjustments: {
        ...colorAdj,
        [key]: value
      }
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#141416] border border-zinc-800/80 rounded-xl overflow-hidden select-none">
      {/* Top Header & Clip Info */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-[#18181c] flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1 mr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">{selectedClip.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
              {selectedClip.type === 'image' ? 'IMG' : 'VID'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 block truncate">
            Długość: {selectedItem.duration?.toFixed(2)}s • {selectedClip.width}×{selectedClip.height}
          </span>
        </div>

        <button
          onClick={() => onDeleteTimelineItem(selectedItem.id)}
          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors cursor-pointer shrink-0"
          title="Usuń ujęcie z osi czasu"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Main Tabs - 3 Column Grid (No horizontal scroll) */}
      <div className="grid grid-cols-3 gap-1 p-1.5 border-b border-zinc-800 bg-[#121214] shrink-0">
        {[
          { id: 'video', label: 'Wideo', icon: Scaling },
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'adjust', label: 'Kolory', icon: Palette },
          { id: 'speed', label: 'Prędkość', icon: Gauge },
          { id: 'animation', label: 'Przejścia', icon: Layers },
          { id: 'title', label: 'Napis', icon: Type }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id as any)}
              className={`flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer w-full text-center truncate ${
                isActive
                  ? 'text-zinc-950 bg-amber-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inspector Body Content - Fully scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-xs">
        {/* VIDEO TAB */}
        {mainTab === 'video' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono flex items-center justify-between">
              <span>Transformacja & Skala</span>
              <span className="text-amber-400">{Math.round((selectedItem.scale || 1.0) * 100)}%</span>
            </div>
            
            {/* Scale */}
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Skala (Zoom):</span>
                <span className="text-amber-400 font-mono font-bold">{Math.round((selectedItem.scale || 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={selectedItem.scale || 1.0}
                onChange={(e) => onUpdateTimelineItem(selectedItem.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>50%</span>
                <span>100%</span>
                <span>250%</span>
              </div>
            </div>

            {/* Rotation */}
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Obrót Kadru:</span>
                <span className="text-white font-mono font-bold">{selectedItem.rotation || 0}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => onUpdateTimelineItem(selectedItem.id, { rotation: deg })}
                    className={`py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                      (selectedItem.rotation || 0) === deg
                        ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Fit Mode */}
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
              <span className="text-[11px] text-zinc-400 block font-medium">Dopasowanie do ekranu:</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'fit', label: 'Dopasuj' },
                  { id: 'fill', label: 'Wypełnij' },
                  { id: 'original', label: 'Oryginał' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => onUpdateTimelineItem(selectedItem.id, { fitMode: mode.id as any })}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      (selectedItem.fitMode || 'fit') === mode.id
                        ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                        : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIO TAB */}
        {mainTab === 'audio' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono">Dźwięk i Głośność Ujęcia</div>
            
            {/* Volume */}
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Poziom Głośności:</span>
                <span className="text-amber-400 font-mono font-bold">{Math.round((selectedItem.volume ?? 1.0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={selectedItem.volume ?? 1.0}
                onChange={(e) => onUpdateTimelineItem(selectedItem.id, { volume: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>0%</span>
                <span>100% (Standard)</span>
                <span>200% (+6dB)</span>
              </div>
            </div>

            {/* Fade In / Fade Out */}
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
              <span className="text-[11px] text-zinc-400 block font-medium">Płynne Wejście / Wyjście Dźwięku:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-1">Fade In (sekundy):</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={selectedItem.fadeIn || 0}
                    onChange={(e) => onUpdateTimelineItem(selectedItem.id, { fadeIn: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-1">Fade Out (sekundy):</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={selectedItem.fadeOut || 0}
                    onChange={(e) => onUpdateTimelineItem(selectedItem.id, { fadeOut: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Mute Button */}
            <button
              onClick={() => onUpdateTimelineItem(selectedItem.id, { muted: !selectedItem.muted })}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                selectedItem.muted 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border-zinc-700'
              }`}
            >
              {selectedItem.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{selectedItem.muted ? 'Ujęcie Wyciszone (Włącz Dźwięk)' : 'Wycisz Dźwięk tego Ujęcia'}</span>
            </button>
          </div>
        )}

        {/* SPEED TAB */}
        {mainTab === 'speed' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono">Mnożnik Prędkości Odtwarzania</div>
            <div className="grid grid-cols-3 gap-2">
              {[0.25, 0.5, 1.0, 1.5, 2.0, 4.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    const newDur = (selectedItem.sourceEnd - selectedItem.sourceStart) / spd;
                    onUpdateTimelineItem(selectedItem.id, { speed: spd, duration: newDur });
                  }}
                  className={`py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                    (selectedItem.speed || 1.0) === spd
                      ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
            <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-400 font-mono space-y-1">
              <div className="flex justify-between">
                <span>Długość źródłowa:</span>
                <span className="text-zinc-200">{(selectedItem.sourceEnd - selectedItem.sourceStart).toFixed(2)}s</span>
              </div>
              <div className="flex justify-between font-bold text-amber-400">
                <span>Długość na osi:</span>
                <span>{selectedItem.duration?.toFixed(2)}s</span>
              </div>
            </div>
          </div>
        )}

        {/* ANIMATION / TRANSITION TAB */}
        {mainTab === 'animation' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono">Przejście na Wejściu (Transition In)</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cut', label: 'Brak (Cięcie)' },
                { id: 'fade', label: 'Ściemnienie (Fade)' },
                { id: 'dissolve', label: 'Przenikanie' },
                { id: 'dip_black', label: 'Czerń (Black)' },
                { id: 'dip_white', label: 'Biel (White)' },
                { id: 'zoom', label: 'Dynamiczny Zoom' }
              ].map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => onUpdateTimelineItem(selectedItem.id, { transitionIn: tr.id as TransitionType })}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium cursor-pointer transition-all ${
                    (selectedItem.transitionIn || 'cut') === tr.id
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                      : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* COLOR ADJUST / GRADUATION TAB */}
        {mainTab === 'adjust' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono flex items-center justify-between">
              <span>Korekcja Barwna GPU WebGL</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            
            {/* Exposure */}
            <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-yellow-400" /> Ekspozycja:</span>
                <span className="text-white font-mono">{colorAdj.exposure}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdj.exposure}
                onChange={(e) => handleColorChange('exposure', parseInt(e.target.value, 10))}
                className="w-full accent-yellow-400 cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Contrast className="w-3 h-3 text-indigo-400" /> Kontrast:</span>
                <span className="text-white font-mono">{colorAdj.contrast}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdj.contrast}
                onChange={(e) => handleColorChange('contrast', parseInt(e.target.value, 10))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* Brightness */}
            <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-400" /> Jasność:</span>
                <span className="text-white font-mono">{colorAdj.brightness}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdj.brightness}
                onChange={(e) => handleColorChange('brightness', parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Saturation */}
            <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Palette className="w-3 h-3 text-pink-400" /> Saturacja:</span>
                <span className="text-white font-mono">{colorAdj.saturation}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdj.saturation}
                onChange={(e) => handleColorChange('saturation', parseInt(e.target.value, 10))}
                className="w-full accent-pink-400 cursor-pointer"
              />
            </div>

            {/* Temperature */}
            <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Temperatura:</span>
                <span className="text-white font-mono">{colorAdj.temperature}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorAdj.temperature}
                onChange={(e) => handleColorChange('temperature', parseInt(e.target.value, 10))}
                className="w-full accent-orange-400 cursor-pointer"
              />
            </div>

            {/* Reset Color */}
            <button
              onClick={() => onUpdateTimelineItem(selectedItem.id, {
                colorAdjustments: {
                  exposure: 0,
                  contrast: 0,
                  brightness: 0,
                  saturation: 0,
                  temperature: 0,
                  tint: 0,
                  sharpness: 0,
                  highlights: 0,
                  shadows: 0,
                  vignette: 0
                }
              })}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              Zresetuj korekcję barwną
            </button>
          </div>
        )}

        {/* TITLE CARD TAB */}
        {mainTab === 'title' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="text-[11px] font-bold text-zinc-300 uppercase font-mono flex items-center justify-between">
              <span>Plansza Tytułowa Sceny</span>
              <button
                onClick={() => {
                  const enabled = !selectedItem.titleCard?.enabled;
                  onUpdateTimelineItem(selectedItem.id, {
                    titleCard: {
                      enabled,
                      text: selectedItem.titleCard?.text || selectedClip.name.replace(/\.[^/.]+$/, ""),
                      subtitle: selectedItem.titleCard?.subtitle || 'Master Cut',
                      duration: selectedItem.titleCard?.duration || 3.0,
                      style: selectedItem.titleCard?.style || 'modern_bold',
                      backgroundColor: selectedItem.titleCard?.backgroundColor || '#09090B'
                    }
                  });
                }}
                className={`px-2.5 py-1 text-xs rounded-lg font-mono font-bold transition-all cursor-pointer ${
                  selectedItem.titleCard?.enabled
                    ? 'bg-amber-400 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {selectedItem.titleCard?.enabled ? 'WŁĄCZONA' : 'WYŁĄCZONA'}
              </button>
            </div>

            {selectedItem.titleCard?.enabled && (
              <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/60 space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-semibold">Tytuł Główny</label>
                  <input
                    type="text"
                    value={selectedItem.titleCard.text}
                    onChange={(e) => onUpdateTimelineItem(selectedItem.id, {
                      titleCard: { ...selectedItem.titleCard!, text: e.target.value }
                    })}
                    placeholder="np. Tytuł Sceny / Master Cut"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-semibold">Podtytuł / Opis</label>
                  <input
                    type="text"
                    value={selectedItem.titleCard.subtitle || ''}
                    onChange={(e) => onUpdateTimelineItem(selectedItem.id, {
                      titleCard: { ...selectedItem.titleCard!, subtitle: e.target.value }
                    })}
                    placeholder="np. 2026 • Reżyseria i Montaż"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1 font-semibold">Styl Planszy</label>
                  <select
                    value={selectedItem.titleCard.style}
                    onChange={(e) => onUpdateTimelineItem(selectedItem.id, {
                      titleCard: { ...selectedItem.titleCard!, style: e.target.value as any }
                    })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="modern_bold">⚡ Nowoczesny Bold</option>
                    <option value="cinematic">✦ Kinowy Noir</option>
                    <option value="studio_slate">🎬 Studio Slate (Klaps)</option>
                    <option value="minimalist">◻ Minimalistyczny Clean</option>
                    <option value="classic">◈ Klasyczny Szeryfowy</option>
                    <option value="cyber_neon">❇ Cyber Neon</option>
                    <option value="credits">🏁 Napisy Końcowe</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Backwards-compatible export alias
export const CapCutInspectorPanel = StudioInspectorPanel;
