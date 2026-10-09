import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Activity, 
  Cpu, 
  HardDrive, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Trash2, 
  Eye, 
  Zap, 
  Sparkles, 
  Mic, 
  Camera,
  Sliders,
  Film,
  Smartphone,
  Cloud,
  Check,
  ChevronRight,
  Volume2,
  VolumeX,
  Layers,
  Monitor
} from 'lucide-react';
import type { ProjectState, FitMode, ColorGradingPreset } from '../../types/project';
import { videoExportService } from '../../core/export/videoExportService';
import { performanceMonitor, HardwareDiagnostics, LivePerformanceMetrics } from '../../core/diagnostics/performanceMonitor';
import { useStudioToast } from '../common/ToastContext';
import { checkMediaPermissionsStatus, requestAndSaveMediaPermissions, MediaPermissionStatus } from '../../lib/mediaPermissions';
import { isFirestoreConnected } from '../../lib/firebase/config';
import { ModernToggle } from '../common/ModernToggle';

interface SettingsDiagnosticsViewProps {
  project: ProjectState;
  onUpdateProject?: (project: ProjectState) => void;
  onClearCache: () => void;
  onResetProject: () => void;
}

type SettingsTab = 'performance' | 'preferences' | 'audio_permissions' | 'engine' | 'maintenance';

export const SettingsDiagnosticsView: React.FC<SettingsDiagnosticsViewProps> = ({
  project,
  onUpdateProject,
  onClearCache,
  onResetProject
}) => {
  const toast = useStudioToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('performance');
  const [hw, setHw] = useState<HardwareDiagnostics | null>(null);
  const [metrics, setMetrics] = useState<LivePerformanceMetrics>(performanceMonitor.getCurrentMetrics());
  const [isDebugEnabled, setIsDebugEnabled] = useState(performanceMonitor.isDebugEnabled());

  const [isTestingEngine, setIsTestingEngine] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; durationMs: number; details: string } | null>(null);
  const [mediaPerms, setMediaPerms] = useState<MediaPermissionStatus | null>(null);
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);

  useEffect(() => {
    performanceMonitor.getHardwareDiagnostics().then(setHw);
    checkMediaPermissionsStatus().then(setMediaPerms);
    const unsubMetrics = performanceMonitor.subscribe(setMetrics);
    const unsubDebug = performanceMonitor.subscribeDebugOverlay(setIsDebugEnabled);
    return () => {
      unsubMetrics();
      unsubDebug();
    };
  }, []);

  const handleGrantMediaPermissions = async () => {
    setIsRequestingPerms(true);
    try {
      const res = await requestAndSaveMediaPermissions({ audio: true, video: true });
      if (res.stream) {
        res.stream.getTracks().forEach(track => track.stop());
      }
      const updated = await checkMediaPermissionsStatus();
      setMediaPerms(updated);
      if (res.error) {
        toast.showError(res.error);
      } else {
        toast.showSuccess('Zezwolenia dla kamery i mikrofonu zostały pomyślnie zapamiętane na stałe!');
      }
    } catch (e: any) {
      toast.showError(`Nie udało się zarejestrować zezwoleń: ${e?.message || e}`);
    } finally {
      setIsRequestingPerms(false);
    }
  };

  const handleToggleDebug = (nextVal: boolean) => {
    setIsDebugEnabled(nextVal);
    performanceMonitor.setDebugEnabled(nextVal);
    toast.showInfo(nextVal ? 'Tryb diagnostyczny (DEBUG HUD) został włączony.' : 'Tryb diagnostyczny wyłączony.');
  };

  const handleRunEngineTest = async () => {
    setIsTestingEngine(true);
    setTestResult(null);
    try {
      const res = await videoExportService.runEngineTest();
      setTestResult(res);
      if (res.success) {
        toast.showSuccess(`Test silnika MP4 zaliczony pomyślnie (${res.durationMs}ms)!`);
      } else {
        toast.showError(`Test nie powiódł się: ${res.details}`);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        durationMs: 0,
        details: e.message || String(e)
      });
      toast.showError(`Błąd testu: ${e.message}`);
    } finally {
      setIsTestingEngine(false);
      performanceMonitor.getHardwareDiagnostics().then(setHw);
    }
  };

  const defaultSettings: NonNullable<ProjectState['settings']> = {
    targetResolution: '1080p',
    targetFps: 30,
    aspectRatio: '16:9',
    fitMode: 'fit',
    useProxyMode: false,
    audioDucking: true,
    letterbox: 'none',
    audioBalance: {
      musicVolume: 0.8,
      clipVolume: 1.0,
      duckingEnabled: true,
      duckingAmount: 18
    }
  };

  const currentSettings = project.settings || defaultSettings;

  const updateSetting = <K extends keyof NonNullable<ProjectState['settings']>>(
    key: K,
    val: NonNullable<ProjectState['settings']>[K]
  ) => {
    if (!onUpdateProject) return;
    const current = project.settings || defaultSettings;
    onUpdateProject({
      ...project,
      settings: {
        ...current,
        [key]: val
      }
    });
    toast.showSuccess('Zaktualizowano preferencje projektu.');
  };

  const updateAudioBalance = (field: 'duckingEnabled' | 'duckingAmount' | 'musicVolume' | 'clipVolume', value: any) => {
    if (!onUpdateProject) return;
    const current = project.settings || defaultSettings;
    const existingBalance = current.audioBalance || {
      musicVolume: 0.8,
      clipVolume: 1.0,
      duckingEnabled: true,
      duckingAmount: 18
    };

    onUpdateProject({
      ...project,
      settings: {
        ...current,
        audioBalance: {
          ...existingBalance,
          [field]: value
        }
      }
    });
    toast.showSuccess('Zaktualizowano mikser audio.');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-5 sm:gap-6 select-none font-sans text-zinc-100">
      
      {/* Top Header Glass Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-30 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-wider text-amber-400 mb-1.5 font-semibold">
            <span className="p-1 rounded-md bg-amber-400/10 border border-amber-400/25">
              <Settings className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span>Centrum Sterowania & Architektura Silnika</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Ustawienia & Diagnostyka Silnika
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Zarządzaj akceleracją sprzętową WebCodecs, buforem proxy 720p, parametrami kadrów oraz audio ducking.
          </p>
        </div>

        {/* Quick Header Toggles / Status */}
        <div className="flex items-center flex-wrap gap-2.5 relative z-10 shrink-0">
          {/* GPU Hardware Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-700/80 flex items-center gap-2 text-xs font-mono shadow-inner">
            <span className={`w-2 h-2 rounded-full ${hw?.gpuAvailable ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400'}`} />
            <span className="text-zinc-300 font-semibold">GPU:</span>
            <span className={hw?.gpuAvailable ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
              {hw?.gpuAvailable ? 'AKTYWNE' : 'CPU'}
            </span>
          </div>

          {/* Quick Debug HUD Toggle */}
          <div className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-700/80 flex items-center gap-2.5 text-xs shadow-inner">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-zinc-300">Debug HUD:</span>
            <ModernToggle
              checked={isDebugEnabled}
              onChange={handleToggleDebug}
              size="sm"
              activeColor="amber"
            />
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 glass-panel rounded-xl overflow-x-auto custom-scrollbar shrink-0">
        {[
          { id: 'performance' as SettingsTab, label: 'Wydajność & GPU', icon: Activity },
          { id: 'preferences' as SettingsTab, label: 'Oś Czasu & Kompozycja', icon: Sliders },
          { id: 'audio_permissions' as SettingsTab, label: 'Dźwięk & Zezwolenia', icon: Mic },
          { id: 'engine' as SettingsTab, label: 'Autotest Silnika', icon: Zap },
          { id: 'maintenance' as SettingsTab, label: 'Konserwacja & Chmura', icon: HardDrive }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-md font-semibold border border-amber-400/40 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: WYDAJNOŚĆ & GPU */}
      {activeTab === 'performance' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Live Performance Telemetry Cards */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Wskaźniki Wydajności w Czasie Rzeczywistym</span>
              </h2>
              <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Częstotliwość odświeżania: 3 Hz
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between shadow-inner">
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Płynność UI:</span>
                <span className={`text-2xl font-black mt-1 block ${
                  metrics.uiFps >= 50 ? 'text-emerald-400' : (metrics.uiFps >= 30 ? 'text-amber-400' : 'text-rose-400')
                }`}>
                  {metrics.uiFps} FPS
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block">Śr. czas klatki: {metrics.averageFrameTimeMs} ms</span>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between shadow-inner">
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Pominięte klatki:</span>
                <span className={`text-2xl font-black mt-1 block ${
                  metrics.droppedFramesCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {metrics.droppedFramesCount}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block">z {metrics.totalFramesSampled} zbadanych</span>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between shadow-inner">
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Pamięć RAM (Heap):</span>
                <span className="text-2xl font-black mt-1 block text-white">
                  {hw?.memoryMb ? `${hw.memoryMb.used} MB` : 'Dostępna'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {hw?.memoryMb ? `Limit: ${hw.memoryMb.limit} MB` : 'Standardowa'}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between shadow-inner">
                <span className="text-zinc-400 block text-[10px] uppercase font-sans">Akceleracja GPU:</span>
                <span className={`text-2xl font-black mt-1 block ${hw?.gpuAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {hw?.gpuAvailable ? 'DOSTĘPNA' : 'BRAK'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block truncate" title={hw?.gpuRenderer}>
                  {hw?.webgl2Supported ? 'WebGL 2.0 GPU' : 'WebGL 1.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Modern Toggles Glass Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono border-b border-zinc-800/80 pb-3">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>Przełączniki Akceleracji i Architektury Silnika</span>
            </h2>

            <div className="space-y-4 divide-y divide-zinc-800/60">
              
              {/* Toggle 1: Proxy Editing */}
              <div className="pt-2">
                <ModernToggle
                  checked={!!currentSettings.useProxyMode}
                  onChange={(val) => updateSetting('useProxyMode', val)}
                  label="Tryb Edycji Proxy (720p Robocze)"
                  description="Generuje lekkie klatki robocze 720p dla płynnego podglądu osi czasu bez zacięć. Finalny eksport wideo zawsze zachowuje 100% oryginalnej jakości 4K."
                  activeColor="emerald"
                  badge={currentSettings.useProxyMode ? 'PROXY AKTYWNE' : 'ORYGINAŁ'}
                />
              </div>

              {/* Toggle 2: Floating Debug HUD */}
              <div className="pt-4">
                <ModernToggle
                  checked={isDebugEnabled}
                  onChange={handleToggleDebug}
                  label="Pływający Panel Telemetrii (Debug HUD)"
                  description="Wyświetla w prawym górnym rogu ekranu aktualny stan klatek, częstotliwość renderowania Canvas oraz obciążenie pamięci."
                  activeColor="amber"
                  badge={isDebugEnabled ? 'HUD ON' : 'UKRYTY'}
                />
              </div>

              {/* Information Row: Hardware Codecs */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-400 block text-[10px] font-mono uppercase">Koder wideo (VideoEncoder):</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 block">
                    {hw?.videoEncoderType === 'HARDWARE' ? 'NVENC / QuickSync / Apple' : (hw?.videoEncoderType || 'SOFTWARE CPU')}
                  </span>
                  <p className="text-[11px] text-zinc-400">Sprzętowe kodowanie H.264 z zerowym narzutem pamięci RAM.</p>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-400 block text-[10px] font-mono uppercase">Dekoder wideo (VideoDecoder):</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 block">
                    {hw?.videoDecoderType === 'HARDWARE' ? 'Sprzętowy WebCodecs GPU' : (hw?.videoDecoderType || 'Software CPU')}
                  </span>
                  <p className="text-[11px] text-zinc-400">Bezpośrednie dekodowanie klatek 4K na karcie graficznej.</p>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-400 block text-[10px] font-mono uppercase">OffscreenCanvas / Worker:</span>
                  <span className={`text-xs font-bold font-mono block ${hw?.offscreenCanvasSupported ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hw?.offscreenCanvasSupported ? 'OBSŁUGIWANY ✓' : 'BRAK ✗'}
                  </span>
                  <p className="text-[11px] text-zinc-400">Rysowanie miniatur i osi czasu w osobnym wątku roboczym.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: PREFERENCJE OSI CZASU & KOMPOZYCJA */}
      {activeTab === 'preferences' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="border-b border-zinc-800/80 pb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Format Kadru & Domyślne Parametry Montażu</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Zdefiniuj proporcje ekranu roboczego, klatkarz FPS oraz dopasowanie klipów o mieszanych proporcjach.
              </p>
            </div>

            {/* Aspect Ratio Selector Cards */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 block mb-2 font-mono uppercase tracking-wider">
                Proporcje Ekranu Projektu (Aspect Ratio):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: '16:9' as const, label: '16:9 Horyzontalny (YouTube / TV)', desc: 'Standardowy panoramiczny kadr dla komputerów i telewizorów.', icon: Film },
                  { id: '9:16' as const, label: '9:16 Pionowy (Reels / TikTok / Shorts)', desc: 'Pionowy kadr wypełniający cały ekran smartfona.', icon: Smartphone },
                  { id: '1:1' as const, label: '1:1 Kwadrat (Instagram Feed)', desc: 'Równomierna kompozycja dla siatki postów społecznościowych.', icon: Film }
                ].map(ar => {
                  const isSelected = currentSettings.aspectRatio === ar.id;
                  const Icon = ar.icon;
                  return (
                    <button
                      key={ar.id}
                      onClick={() => updateSetting('aspectRatio', ar.id)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[90px] ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400/60 text-white shadow-md'
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {ar.label}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {ar.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Selects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80">
              <div>
                <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Docelowa Rozdzielczość Robocza</label>
                <select
                  value={currentSettings.targetResolution}
                  onChange={(e) => updateSetting('targetResolution', e.target.value as any)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px]"
                >
                  <option value="1080p">1080p Full HD (Zalecana)</option>
                  <option value="4k">4K Ultra HD (Studyjna)</option>
                  <option value="720p">720p HD Ready (Szybka)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Domyślny Klatkarz (FPS)</label>
                <select
                  value={currentSettings.targetFps}
                  onChange={(e) => updateSetting('targetFps', Number(e.target.value) as any)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px]"
                >
                  <option value={24}>24 FPS (Hollywood Kinowy)</option>
                  <option value={25}>25 FPS (Europejski PAL)</option>
                  <option value={30}>30 FPS (Standard Internetowy)</option>
                  <option value={60}>60 FPS (Ultra Płynny 60p)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Dopasowanie Proporcji Klipów</label>
                <select
                  value={currentSettings.fitMode || 'fit'}
                  onChange={(e) => updateSetting('fitMode', e.target.value as FitMode)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white min-h-[44px]"
                >
                  <option value="fit">FIT (Dopasuj + rozmyte tło dla kadrów mieszanych)</option>
                  <option value="fill">FILL (Wypełnij kadr bez czarnych pasów)</option>
                  <option value="original">ORIGINAL (Oryginalna geometria klipu)</option>
                </select>
              </div>
            </div>

            {/* Modern Toggles for Composition */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-4">
              <ModernToggle
                checked={currentSettings.letterbox === 'cinemascope'}
                onChange={(val) => updateSetting('letterbox', val ? 'cinemascope' : 'none')}
                label="Pasy Kinowe Cinemascope (Letterbox 2.39:1)"
                description="Dodaje eleganckie kinowe czarne pasy na górze i dole kadru, nadając ujęciom hollywoodzki charakter."
                activeColor="amber"
                badge={currentSettings.letterbox === 'cinemascope' ? '2.39:1 AKTYWNE' : 'BRAK'}
              />
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: DŹWIĘK & ZEZWOLENIA SPRZĘTOWE */}
      {activeTab === 'audio_permissions' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Audio Engine & Ducking Glass Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono border-b border-zinc-800/80 pb-3">
              <Volume2 className="w-4 h-4 text-teal-400" />
              <span>Silnik Dźwięku & Automatyczny Mikser Audio</span>
            </h2>

            <div className="space-y-4">
              {/* Audio Ducking Toggle */}
              <ModernToggle
                checked={currentSettings.audioBalance?.duckingEnabled ?? true}
                onChange={(val) => updateAudioBalance('duckingEnabled', val)}
                label="Inteligentne Wyciszanie Muzyki (Audio Ducking)"
                description="Automatycznie ścisza ścieżkę muzyczną w tle, gdy na osi czasu pojawia się mowa lub narracja lektora."
                activeColor="teal"
                badge={currentSettings.audioBalance?.duckingEnabled ? 'DUCKING WŁ.' : 'WYŁĄCZONY'}
              />

              {/* Sliders for Volume Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/60 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-300 font-medium">Głośność Muzyki w Tle:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round((currentSettings.audioBalance?.musicVolume ?? 0.8) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentSettings.audioBalance?.musicVolume ?? 0.8}
                    onChange={(e) => updateAudioBalance('musicVolume', parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-zinc-300 font-medium">Głośność Dźwięku z Klipów Wideo:</span>
                    <span className="font-mono text-teal-400 font-bold">
                      {Math.round((currentSettings.audioBalance?.clipVolume ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={currentSettings.audioBalance?.clipVolume ?? 1.0}
                    onChange={(e) => updateAudioBalance('clipVolume', parseFloat(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hardware Permissions Glass Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trwałe Zezwolenia na Mikrofon i Kamerę</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Zapamiętuje zgody przeglądarki, dzięki czemu nagrywanie lektora lub rejestrowanie wideo nie wywołuje powtarzających się zapytań o dostęp.
                </p>
              </div>

              <button
                onClick={handleGrantMediaPermissions}
                disabled={isRequestingPerms}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 self-start sm:self-auto uppercase tracking-wider shrink-0 min-h-[44px]"
              >
                {isRequestingPerms ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Rejestrowanie...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 fill-black" />
                    <span>ZAPAMIĘTAJ ZEZWOLENIA NA STAŁE</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold block text-xs font-sans">Mikrofon (Nagrywanie Lektora)</span>
                    <span className="text-[10px] text-zinc-400">
                      Stan: {mediaPerms?.micGranted ? 'Zezwolono i Zapamiętano' : 'Oczekuje na aktywację'}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  mediaPerms?.micGranted 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {mediaPerms?.micGranted ? 'AKTYWNY ✓' : 'GOTOWY'}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-white font-bold block text-xs font-sans">Kamera (Rejestracja Wideo)</span>
                    <span className="text-[10px] text-zinc-400">
                      Stan: {mediaPerms?.cameraGranted ? 'Zezwolono i Zapamiętano' : 'Oczekuje na aktywację'}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  mediaPerms?.cameraGranted 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {mediaPerms?.cameraGranted ? 'AKTYWNA ✓' : 'GOTOWA'}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: AUTOTEST SILNIKA */}
      {activeTab === 'engine' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Sprzętowy Test Kodowania Wideo MP4</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Generuje 1-sekundowy strumień testowy 1080p, weryfikując koder H.264, próbkowanie PCM oraz muxer ISO MP4.
                </p>
              </div>

              <button
                onClick={handleRunEngineTest}
                disabled={isTestingEngine}
                className="flex items-center gap-2 px-6 py-2.5 btn-primary text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 self-start sm:self-auto uppercase tracking-wider min-h-[44px]"
              >
                {isTestingEngine ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Testowanie...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black" />
                    <span>URUCHOM TEST (1s)</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-xl border text-xs font-mono ${
                testResult.success 
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
                  : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{testResult.success ? 'TEST SILNIKA ZALICZONY POMYŚLNIE' : 'TEST SILNIKA NIEPOWIODŁY'}</span>
                  <span className="text-zinc-400 font-normal">({testResult.durationMs} ms)</span>
                </div>
                <p className="text-[11px] opacity-90">{testResult.details}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: KONSERWACJA & PAMIĘĆ & CHMURA */}
      {activeTab === 'maintenance' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="border-b border-zinc-800/80 pb-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Konserwacja Pamięci Podręcznej & Synchronizacja Chmury</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Zarządzaj autozapisem w bazie danych Firestore, zwalniaj pamięć URL obiektów wideo oraz kontroluj aktualizacje PWA.
              </p>
            </div>

            {/* Cloud Auto-Sync Glass Info */}
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-white font-bold block text-xs">Autozapis w Chmurze Firestore</span>
                  <span className="text-[11px] text-zinc-400">
                    {isFirestoreConnected 
                      ? 'Połączono z bazą — migawki strukturalne zapisywane automatycznie (bufor debouncingu 500ms).' 
                      : 'Tryb lokalny IndexedDB — stan zapisywany w pamięci przeglądarki.'}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${
                isFirestoreConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {isFirestoreConnected ? 'ONLINE ✓' : 'LOKALNIE'}
              </span>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between gap-3 shadow-inner">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Aktualizacje Aplikacji</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Sprawdza obecność nowej wersji Service Workera PWA i odświeża manifest.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (typeof (window as any).checkForAppUpdate === 'function') {
                      await (window as any).checkForAppUpdate();
                      toast.showSuccess('Sprawdzono dostępność nowej wersji Kapi-Studio');
                    } else {
                      toast.showInfo('Aplikacja działa w najnowszej wersji.');
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sprawdź aktualizacje
                </button>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-zinc-800/80 flex flex-col justify-between gap-3 shadow-inner">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pamięć Podręczna</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Czyści lokalne registry URL i zwalnia zajętą pamięć podręczną podglądu.
                  </p>
                </div>
                <button
                  onClick={onClearCache}
                  className="w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-800 text-white border border-zinc-700/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Wyczyść pamięć cache
                </button>
              </div>

              <div className="bg-zinc-900/70 p-4 rounded-xl border border-rose-900/40 flex flex-col justify-between gap-3 shadow-inner">
                <div>
                  <h3 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Projektu</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Czyści oś czasu i bibliotekę mediów, przywracając czysty stan projektu.
                  </p>
                </div>
                <button
                  onClick={onResetProject}
                  className="w-full py-2.5 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800/50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Zresetuj projekt
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
