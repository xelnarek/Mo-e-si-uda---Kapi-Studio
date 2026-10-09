import React, { useState } from 'react';
import { 
  Film, 
  Music, 
  Type, 
  Palette, 
  SlidersHorizontal,
  Search,
  Plus,
  Mic,
  Activity,
  Check,
  Zap,
  Volume2,
  Sparkles,
  FolderOpen
} from 'lucide-react';
import type { ProjectState, MediaClip } from '../../types/project';
import { BEAUTY_PRESETS, type BeautyPreset } from './MontageView';

export const STUDIO_FILTERS_LIST = [
  { id: 'hollywood_warm', name: 'Hollywood Warm', preset: 'hollywood_warm' as BeautyPreset, gradient: 'bg-gradient-to-br from-amber-600 via-orange-500 to-indigo-900' },
  { id: 'teal_orange', name: 'Teal & Orange', preset: 'teal_orange' as BeautyPreset, gradient: 'bg-gradient-to-br from-cyan-600 via-teal-700 to-amber-600' },
  { id: 'beauty_glow', name: 'Beauty Glow', preset: 'beauty_glow' as BeautyPreset, gradient: 'bg-gradient-to-br from-pink-500 via-rose-400 to-amber-300' },
  { id: 'vibrant_pop', name: 'Vibrant Pop', preset: 'vibrant_pop' as BeautyPreset, gradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400' },
  { id: 'glamour_soft', name: 'Glamour Soft', preset: 'glamour_soft' as BeautyPreset, gradient: 'bg-gradient-to-br from-orange-400 via-amber-300 to-rose-400' },
  { id: 'vintage_35mm', name: 'Vintage 35mm', preset: 'vintage_35mm' as BeautyPreset, gradient: 'bg-gradient-to-br from-amber-800 via-yellow-700 to-zinc-900' },
  { id: 'nordic_frost', name: 'Nordic Frost', preset: 'nordic_frost' as BeautyPreset, gradient: 'bg-gradient-to-br from-sky-700 via-cyan-600 to-slate-900' },
  { id: 'moody_noir', name: 'Moody Noir (B&W)', preset: 'moody_noir' as BeautyPreset, gradient: 'bg-gradient-to-br from-zinc-950 via-zinc-800 to-zinc-900' }
];

interface StudioResourceBrowserProps {
  project: ProjectState;
  activePreset: BeautyPreset;
  onSelectFilter: (preset: BeautyPreset) => void;
  onAddMediaClick?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenBeatSync?: () => void;
  onOpenAutoCaptions?: () => void;
  onAddClipToTimeline?: (clip: MediaClip) => void;
}

export function StudioResourceBrowser({
  project,
  activePreset,
  onSelectFilter,
  onAddMediaClick,
  onOpenVoiceRecorder,
  onOpenBeatSync,
  onOpenAutoCaptions,
  onAddClipToTimeline
}: StudioResourceBrowserProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'media' | 'audio' | 'text'>('filters');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const tabs = [
    { id: 'filters', label: 'Filtry 4K', icon: Palette },
    { id: 'media', label: 'Media', icon: Film },
    { id: 'audio', label: 'Audio & Głos', icon: Music },
    { id: 'text', label: 'Napisy', icon: Type }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#141416] border border-zinc-800/80 rounded-xl overflow-hidden select-none">
      {/* Top Grid Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1.5 border-b border-zinc-800 bg-[#121214] shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-lg transition-all cursor-pointer w-full text-center truncate ${
                isActive
                  ? 'text-zinc-950 bg-amber-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-semibold leading-none truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-3 overflow-y-auto custom-scrollbar bg-[#18181c]">
        {/* Filters View */}
        {activeTab === 'filters' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Szukaj filtrów GPU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 font-mono">
              <span>Kinowe Style WebGL2</span>
              <span className="text-amber-400 font-bold">GPU Active</span>
            </div>

            {/* Grid of Filter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                onClick={() => onSelectFilter('none')}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#22222a] p-2 flex flex-col items-center justify-center text-center ${
                  activePreset === 'none'
                    ? 'border-amber-400 bg-amber-400/10 shadow-sm'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className="text-xl mb-1">⭕</span>
                <span className={`text-xs font-medium block truncate ${activePreset === 'none' ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                  Oryginał
                </span>
              </div>

              {STUDIO_FILTERS_LIST.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((filter) => {
                const isActive = activePreset === filter.preset;
                return (
                  <div
                    key={filter.id}
                    onClick={() => onSelectFilter(filter.preset)}
                    className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-[#22222a] ${
                      isActive
                        ? 'border-amber-400 shadow-md shadow-amber-950/40 ring-1 ring-amber-400'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className={`aspect-video w-full relative overflow-hidden ${filter.gradient} flex items-center justify-center p-2`}>
                      <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
                        <Palette className="w-3.5 h-3.5 text-white" />
                      </div>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold shadow-sm">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 text-center bg-[#1f1f26]">
                      <span className={`text-[10.5px] font-medium block truncate ${isActive ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                        {filter.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Media View */}
        {activeTab === 'media' && (
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                Klipów w projekcie: {project.mediaLibrary.length}
              </span>
              <button
                onClick={onAddMediaClick}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Importuj</span>
              </button>
            </div>

            {project.mediaLibrary.length === 0 ? (
              <div 
                onClick={onAddMediaClick}
                className="flex-1 border-2 border-dashed border-zinc-800 hover:border-amber-400/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group bg-[#121214]"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white mb-1">Brak plików w bibliotece</span>
                <span className="text-[11px] text-zinc-500">Kliknij tutaj, aby dodać wideo, audio lub zdjęcia</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {project.mediaLibrary.map(clip => (
                  <div 
                    key={clip.id} 
                    className="group relative rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-600 bg-[#1e1e24] cursor-pointer transition-all flex flex-col"
                    onClick={() => onAddClipToTimeline?.(clip)}
                  >
                    <div className="aspect-video w-full bg-black relative">
                      {clip.thumbnailUrl ? (
                        <img src={clip.thumbnailUrl} alt={clip.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Film className="w-6 h-6" />
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-mono text-zinc-300 px-1.5 py-0.2 rounded border border-white/10">
                        {clip.duration.toFixed(1)}s
                      </span>
                      <div className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-amber-400 text-zinc-950 font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                    <div className="p-1.5 bg-[#18181e]">
                      <span className="text-[10.5px] text-zinc-300 font-medium block truncate">{clip.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audio Tab */}
        {activeTab === 'audio' && (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-[#1e1e24] border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  Dyktafon & Lektor
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Nagrywanie narracji mikrofonem w jakości HD</div>
              </div>
              <button
                onClick={() => onOpenVoiceRecorder?.()}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Nagraj</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1e1e24] border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Beat-Sync Rytm
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Automatyczne dopasowanie cięć wideo do tempa muzyki</div>
              </div>
              <button
                onClick={() => onOpenBeatSync?.()}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>Otwórz</span>
              </button>
            </div>
          </div>
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-[#1e1e24] border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Automatyczne Napisy & Transkrypcje
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Rozpoznawanie mowy AI i generowanie dynamicznych podpisów</div>
              </div>
              <button
                onClick={() => onOpenAutoCaptions?.()}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <span>Konfiguruj</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Backwards-compatible export alias
export const CapCutResourceBrowser = StudioResourceBrowser;
