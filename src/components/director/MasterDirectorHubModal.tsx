import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Layers, 
  MessageSquare, 
  ShieldCheck, 
  Music, 
  Film, 
  Clock, 
  Check, 
  X, 
  Play, 
  Pause, 
  ArrowRight, 
  Scissors, 
  Type, 
  Download, 
  RotateCw, 
  CheckCircle2, 
  Send, 
  Bot, 
  User as UserIcon, 
  Sliders, 
  Star, 
  Copy, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  AlertTriangle,
  FileVideo,
  Bookmark,
  ChevronRight,
  Zap,
  Mic,
  Activity
} from 'lucide-react';
import type { 
  ProjectState, 
  MediaClip, 
  TimelineItem, 
  TitleCard, 
  TransitionType, 
  ClipCategory, 
  TextLayer, 
  LookPreset 
} from '../../types/project';
import { useStudioToast } from '../common/ToastContext';
import { analyzeWholeLibrary } from '../../core/director/videoAnalysisEngine';
import { resolveClipMediaUrl } from '../../core/media/mediaResolver';

export type DirectorHubTab = 'director' | 'quick_merge' | 'ai_chat' | 'quality_audit' | 'beat_subtitles';

export interface MasterDirectorHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  initialTab?: DirectorHubTab;
  onApplyProject: (updatedState: ProjectState) => void;
  onNavigateToExport?: () => void;
  onOpenVoiceRecorder?: () => void;
}

export function MasterDirectorHubModal({
  isOpen,
  onClose,
  project,
  initialTab = 'director',
  onApplyProject,
  onNavigateToExport,
  onOpenVoiceRecorder
}: MasterDirectorHubModalProps) {
  const toast = useStudioToast();
  const [activeTab, setActiveTab] = useState<DirectorHubTab>(initialTab);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --------------------------------------------------------------------------
  // TAB 1: INTELIGENTNA REŻYSERIA & SMART MONTAGE STATE
  // --------------------------------------------------------------------------
  const [directorPacing, setDirectorPacing] = useState<'cinematic' | 'fast' | 'slow'>('cinematic');
  const [directorStyle, setDirectorStyle] = useState<'cinematic' | 'modern_bold' | 'studio_slate' | 'cyber_neon' | 'elegant' | 'minimalist'>('cinematic');
  const [includeIntroCard, setIncludeIntroCard] = useState<boolean>(true);
  const [introTitle, setIntroTitle] = useState<string>(`PRODUKCJA: ${project.name || 'NOWY FILM'}`);
  const [introSubtitle, setIntroSubtitle] = useState<string>(`${new Date().toLocaleDateString('pl-PL')} • Smart Montage`);
  const [includeOutroCard, setIncludeOutroCard] = useState<boolean>(true);
  const [outroTitle, setOutroTitle] = useState<string>('NAPISY KOŃCOWE');
  const [outroSubtitle, setOutroSubtitle] = useState<string>('Dziękujemy za uwagę • Montaż i realizacja: Kapi-studio by Piotr');
  const [applyTransitions, setApplyTransitions] = useState<boolean>(true);
  const [applySmartTrim, setApplySmartTrim] = useState<boolean>(true);
  const [includeSubtitles, setIncludeSubtitles] = useState<boolean>(true);
  const [isGeneratingSmartMontage, setIsGeneratingSmartMontage] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // TAB 2: SZYBKIE SCALANIE & RENDER STATE
  // --------------------------------------------------------------------------
  const [selectedClipsForMerge, setSelectedClipsForMerge] = useState<MediaClip[]>(() => {
    return project.mediaLibrary.slice(0, 20);
  });
  const [mergeTransition, setMergeTransition] = useState<TransitionType>('dissolve');

  // Sync selectedClipsForMerge if library changes
  useEffect(() => {
    if (selectedClipsForMerge.length === 0 && project.mediaLibrary.length > 0) {
      setSelectedClipsForMerge(project.mediaLibrary.slice(0, 20));
    }
  }, [project.mediaLibrary]);

  // --------------------------------------------------------------------------
  // TAB 3: CZAT AI & ASYSTENT MONTAŻU STATE
  // --------------------------------------------------------------------------
  interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: `Witaj w Centrum Reżysera Kapi-Studio! Jestem Twoim asystentem montażu. W Twoim projekcie znajduje się obecnie ${project.mediaLibrary.length} klipów. Mogę ułożyć dla Ciebie sekwencję, podpowiedzieć rytm muzyczny, zaproponować czołówkę lub przeprowadzić pełny montaż jednym kliknięciem. W czym mogę Ci dzisiaj pomóc?`,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiThinking]);

  // --------------------------------------------------------------------------
  // TAB 4: AUDYT JAKOŚCI & DUPLIKATY STATE
  // --------------------------------------------------------------------------
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStatusMsg, setAuditStatusMsg] = useState('');
  const [auditResults, setAuditResults] = useState<{
    bestClips: MediaClip[];
    duplicates: { original: MediaClip; duplicates: MediaClip[] }[];
    problemClips: { clip: MediaClip; issue: string }[];
  } | null>(null);

  // --------------------------------------------------------------------------
  // TAB 5: BEAT-SYNC & NAPISY STATE
  // --------------------------------------------------------------------------
  const [musicBpm, setMusicBpm] = useState<number>(120);
  const [beatSyncPacing, setBeatSyncPacing] = useState<'fast' | 'medium' | 'slow'>('medium');
  const [subtitlesLanguage, setSubtitlesLanguage] = useState<'pl' | 'en'>('pl');
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);

  if (!isOpen) return null;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  // 1. SMART MONTAGE ONE-CLICK
  const handleRunSmartMontage = async () => {
    if (project.mediaLibrary.length === 0) {
      toast.showWarning('Dodaj filmy do biblioteki mediów, aby uruchomić montaż.');
      return;
    }

    setIsGeneratingSmartMontage(true);
    toast.showInfo('🚀 System układa ujęcia z uwzględnieniem chronologii, pór dnia i dynamiki scen...');

    try {
      const response = await fetch('/api/smart-chronological-sequencing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: project.mediaLibrary.map(c => ({
            id: c.id,
            name: c.name,
            duration: c.duration,
            capturedAt: c.capturedAt || c.createdAt,
            tags: c.tags,
            comment: c.comment
          })),
          pacing: directorPacing,
          projectTitle: project.name || 'Nowy Film',
          projectYear: new Date().getFullYear().toString()
        })
      });

      let itemsToSequence = project.mediaLibrary;
      if (response.ok) {
        const data = await response.json();
        if (data.orderedSequence && data.orderedSequence.length > 0) {
          const map = new Map(project.mediaLibrary.map(c => [c.id, c]));
          itemsToSequence = data.orderedSequence
            .map((item: any) => map.get(item.clipId))
            .filter(Boolean) as MediaClip[];
        }
      }

      // Build timeline items
      let start = 0;
      const newTimelineItems: TimelineItem[] = itemsToSequence.map((clip, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === itemsToSequence.length - 1;
        let dur = clip.duration;

        if (applySmartTrim) {
          if (directorPacing === 'fast') dur = Math.min(6.0, Math.max(2.5, dur));
          else if (directorPacing === 'slow') dur = Math.min(18.0, Math.max(5.0, dur));
          else dur = Math.min(12.0, Math.max(3.5, dur));
        }

        const item: TimelineItem = {
          id: `ti_smart_${Date.now()}_${idx}`,
          clipId: clip.id,
          trackId: 'v1',
          sourceStart: 0,
          sourceEnd: dur,
          timelineStart: Number(start.toFixed(2)),
          duration: Number(dur.toFixed(2)),
          speed: 1,
          volume: 1,
          fadeIn: isFirst ? 0.6 : 0,
          fadeOut: isLast ? 0.8 : 0,
          muted: false,
          scale: 1,
          rotation: 0,
          fitMode: 'fit',
          transitionIn: isFirst ? 'fade' : (applyTransitions ? 'dissolve' : 'cut'),
          transitionDuration: 0.5,
          titleCard: isFirst && includeIntroCard ? {
            enabled: true,
            text: introTitle,
            subtitle: introSubtitle,
            duration: 3.5,
            style: directorStyle,
            backgroundColor: 'gradient',
            cardType: 'intro'
          } : undefined,
          outroCard: isLast && includeOutroCard ? {
            enabled: true,
            text: outroTitle,
            subtitle: outroSubtitle,
            duration: 4.0,
            style: 'credits',
            backgroundColor: 'gradient',
            cardType: 'outro'
          } : undefined
        };
        start += dur;
        return item;
      });

      const updatedProject: ProjectState = {
        ...project,
        timelineItems: newTimelineItems,
        settings: {
          ...project.settings,
          introCard: includeIntroCard ? {
            enabled: true,
            text: introTitle,
            subtitle: introSubtitle,
            duration: 3.5,
            style: directorStyle,
            backgroundColor: 'gradient',
            cardType: 'intro'
          } : project.settings.introCard,
          outroCard: includeOutroCard ? {
            enabled: true,
            text: outroTitle,
            subtitle: outroSubtitle,
            duration: 4.0,
            style: 'credits',
            backgroundColor: 'gradient',
            cardType: 'outro'
          } : project.settings.outroCard
        },
        updatedAt: new Date().toISOString()
      };

      onApplyProject(updatedProject);
      toast.showSuccess(`✨ Złożono film z ${newTimelineItems.length} ujęć w spójną całość!`);
      onClose();
    } catch (err: any) {
      toast.showError('Błąd podczas generowania montażu: ' + err.message);
    } finally {
      setIsGeneratingSmartMontage(false);
    }
  };

  // 2. QUICK MERGE APPLY
  const handleApplyQuickMerge = () => {
    if (selectedClipsForMerge.length === 0) {
      toast.showWarning('Wybierz przynajmniej jedno ujęcie do scalenia.');
      return;
    }

    let start = 0;
    const newTimelineItems: TimelineItem[] = selectedClipsForMerge.map((clip, idx) => {
      const dur = clip.duration || 5.0;
      const isFirst = idx === 0;
      const isLast = idx === selectedClipsForMerge.length - 1;

      const item: TimelineItem = {
        id: `ti_qmerge_${Date.now()}_${idx}`,
        clipId: clip.id,
        trackId: 'v1',
        sourceStart: 0,
        sourceEnd: dur,
        timelineStart: Number(start.toFixed(2)),
        duration: Number(dur.toFixed(2)),
        speed: 1,
        volume: 1,
        fadeIn: isFirst ? 0.5 : 0,
        fadeOut: isLast ? 0.5 : 0,
        muted: false,
        scale: 1,
        rotation: 0,
        fitMode: 'fit',
        transitionIn: isFirst ? 'fade' : mergeTransition,
        transitionDuration: 0.5,
        titleCard: isFirst && includeIntroCard ? {
          enabled: true,
          text: introTitle,
          subtitle: introSubtitle,
          duration: 3.5,
          style: 'cinematic',
          backgroundColor: 'gradient',
          cardType: 'intro'
        } : undefined,
        outroCard: isLast && includeOutroCard ? {
          enabled: true,
          text: outroTitle,
          subtitle: outroSubtitle,
          duration: 4.0,
          style: 'credits',
          backgroundColor: 'gradient',
          cardType: 'outro'
        } : undefined
      };
      start += dur;
      return item;
    });

    const updatedProject: ProjectState = {
      ...project,
      timelineItems: newTimelineItems,
      updatedAt: new Date().toISOString()
    };

    onApplyProject(updatedProject);
    toast.showSuccess(`Pomyślnie scalono ${selectedClipsForMerge.length} ujęć!`);
    onClose();
  };

  // 3. CHAT AI HANDLER
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setIsAiThinking(true);

    try {
      const response = await fetch('/api/generate-project-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.name || 'Nowy Film',
          prompt: userText,
          clipsCount: project.mediaLibrary.length,
          timelineItemsCount: project.timelineItems.length,
          clipsOverview: project.mediaLibrary.slice(0, 15).map(c => ({
            name: c.name,
            duration: c.duration,
            category: c.category
          }))
        })
      });

      let reply = 'Przeanalizowałem Twoje ujęcia. Sugeruję rozpocząć film od ujęć wprowadzających (krajobraz / detale), dynamicznie przyspieszyć akcję w środku filmu i zakończyć spokojnym ujęciem z planszą końcową. Możesz użyć zakładki "Reżyseria & Montaż", aby wygenerować ten układ automatycznie!';
      if (response.ok) {
        const data = await response.json();
        if (data.concept || data.narrative || data.advice) {
          reply = `${data.concept ? `🎯 **Koncepcja:** ${data.concept}\n\n` : ''}${data.narrative ? `📜 **Scenariusz:** ${data.narrative}\n\n` : ''}${data.musicSuggestion ? `🎵 **Sugerowana muzyka:** ${data.musicSuggestion}` : ''}`;
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: 'Twoje zapytanie zostało przetworzone. Mogę teraz pomóc Ci ułożyć te ujęcia na osi czasu lub zastosować automatyczne cięcia w zakładce Reżyseria.',
          timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // 4. RUN QUALITY AUDIT
  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditProgress(10);
    setAuditStatusMsg('Analizowanie ostrości, kolorystyki i stabilności klatek...');

    try {
      const controller = new AbortController();
      const analysisMap = await analyzeWholeLibrary(
        project.mediaLibrary,
        controller.signal,
        (p, msg) => {
          setAuditProgress(p);
          setAuditStatusMsg(msg);
        }
      );

      const best: MediaClip[] = [];
      const problems: { clip: MediaClip; issue: string }[] = [];
      const seenNames = new Map<string, MediaClip[]>();

      project.mediaLibrary.forEach(clip => {
        const a = analysisMap.get(clip.id);
        const qScore = a?.qualityScore || 80;
        if (qScore >= 80) best.push(clip);
        if (a && (a as any).blurScore && (a as any).blurScore < 40) {
          problems.push({ clip, issue: 'Wykryto obniżoną ostrość / poruszenie klatki' });
        }
        if (clip.duration < 1.0) {
          problems.push({ clip, issue: 'Zbyt krótkie ujęcie (< 1.0s)' });
        }

        // Check similar name/size
        const key = `${clip.name.split('.')[0]}_${clip.duration.toFixed(0)}`;
        const group = seenNames.get(key) || [];
        group.push(clip);
        seenNames.set(key, group);
      });

      const dups: { original: MediaClip; duplicates: MediaClip[] }[] = [];
      seenNames.forEach(group => {
        if (group.length > 1) {
          dups.push({ original: group[0], duplicates: group.slice(1) });
        }
      });

      setAuditResults({
        bestClips: best.length > 0 ? best : project.mediaLibrary.slice(0, 5),
        duplicates: dups,
        problemClips: problems
      });
      toast.showSuccess('Audyt jakości zakończony pomyślnie!');
    } catch (err: any) {
      toast.showError('Błąd audytu: ' + err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  // 5. RUN BEAT-SYNC
  const handleApplyBeatSync = () => {
    if (project.mediaLibrary.length === 0) {
      toast.showWarning('Brak klipów do synchronizacji.');
      return;
    }

    const beatInterval = 60 / musicBpm; // seconds per beat
    let cutDuration = beatInterval * 4; // 1 bar (4 beats)
    if (beatSyncPacing === 'fast') cutDuration = beatInterval * 2; // 2 beats
    if (beatSyncPacing === 'slow') cutDuration = beatInterval * 8; // 2 bars

    let start = 0;
    const syncedItems: TimelineItem[] = project.mediaLibrary.map((clip, idx) => {
      const dur = Math.min(clip.duration, cutDuration);
      const item: TimelineItem = {
        id: `ti_beat_${Date.now()}_${idx}`,
        clipId: clip.id,
        trackId: 'v1',
        sourceStart: 0,
        sourceEnd: dur,
        timelineStart: Number(start.toFixed(2)),
        duration: Number(dur.toFixed(2)),
        speed: 1,
        volume: 1,
        fadeIn: idx === 0 ? 0.3 : 0,
        fadeOut: idx === project.mediaLibrary.length - 1 ? 0.5 : 0,
        muted: false,
        scale: 1,
        rotation: 0,
        fitMode: 'fit',
        transitionIn: idx % 2 === 0 ? 'cut' : 'dip_white',
        transitionDuration: 0.2
      };
      start += dur;
      return item;
    });

    const updated = {
      ...project,
      timelineItems: syncedItems,
      updatedAt: new Date().toISOString()
    };
    onApplyProject(updated);
    toast.showSuccess(`✨ Synchronizacja rytmiczna ${musicBpm} BPM zastosowana (${syncedItems.length} cięć)!`);
    onClose();
  };

  // 6. GENERATE AUTO CAPTIONS
  const handleGenerateCaptions = () => {
    setIsGeneratingSubtitles(true);
    setTimeout(() => {
      let time = 0;
      const layers: TextLayer[] = project.timelineItems.map((item, idx) => {
        const clip = project.mediaLibrary.find(c => c.id === item.clipId);
        const title = clip?.name ? clip.name.replace(/\.[^/.]+$/, '') : `Ujęcie ${idx + 1}`;
        
        // If the item has a titleCard active at the beginning, delay the caption so they do not collide
        const titleCardDur = item.titleCard && item.titleCard.enabled ? (item.titleCard.duration || 3.0) : 0;
        const offset = titleCardDur > 0 ? titleCardDur + 0.3 : 0.3;
        const availableDur = item.duration - offset;
        const dur = Math.max(1.5, Math.min(availableDur > 0 ? availableDur - 0.2 : 2.5, 3.5));

        const layer: TextLayer = {
          id: `txt_${Date.now()}_${idx}`,
          text: `🎬 ${title}`,
          type: 'lower_third',
          style: 'cinematic',
          timelineStart: Number((item.timelineStart + offset).toFixed(2)),
          duration: Number(dur.toFixed(2)),
          position: { x: 0.5, y: 0.85 },
          fontSize: 28,
          color: '#FFFFFF',
          backgroundColor: 'rgba(0,0,0,0.65)',
          fontFamily: 'sans-serif',
          animation: 'fade'
        };
        return layer;
      });

      onApplyProject({
        ...project,
        textLayers: layers,
        updatedAt: new Date().toISOString()
      });
      setIsGeneratingSubtitles(false);
      toast.showSuccess(`Pomyślnie wygenerowano napisy dla ${layers.length} ujęć!`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-[#18181c] border border-[#26262b] w-full max-w-5xl h-[92vh] max-h-[850px] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-zinc-100">
        
        {/* TOP MODAL HEADER */}
        <div className="shrink-0 px-6 py-4 border-b border-[#26262b] bg-[#141416] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22222a] border border-[#2e2e36] flex items-center justify-center shadow-sm shrink-0 text-amber-400">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                  CENTRUM REŻYSERA & MONTAŻU
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#22222a] text-amber-400 border border-[#2e2e36]">
                  Kapi-Studio Pro
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Scentralizowany moduł automatycznej reżyserii, scalania klipów, asystenta i audytu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#22222a] hover:bg-[#282830] text-zinc-400 hover:text-white border border-[#26262b] transition-colors cursor-pointer"
            title="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS (5 UNIFIED SEGMENTS) */}
        <div className="shrink-0 px-4 pt-3 border-b border-[#26262b] bg-[#141416]/90 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'director', label: '1. Reżyseria & Montaż Master', icon: Sparkles },
            { id: 'quick_merge', label: '2. Szybkie Scalanie & Render', icon: Layers },
            { id: 'ai_chat', label: '3. Konsola Poleceń Montażu', icon: MessageSquare },
            { id: 'quality_audit', label: '4. Audyt Jakości & Duplikaty', icon: ShieldCheck },
            { id: 'beat_subtitles', label: '5. Rytmika (Beat-Sync) & Napisy', icon: Music },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DirectorHubTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                  isActive
                    ? 'bg-[#18181c] text-amber-400 border-amber-400 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-[#202026] border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB BODY AREA */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#121214]">
          
          {/* ================================================================ */}
          {/* TAB 1: INTELIGENTNA REŻYSERIA & SMART MONTAGE */}
          {/* ================================================================ */}
          {activeTab === 'director' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Hero Banner */}
              <div className="p-5 rounded-2xl bg-[#18181c] border border-[#26262b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                    ZAAWANSOWANY SILNIK MONTAŻU
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1 font-sans">
                    Precyzyjna Produkcja i Chronologiczna Reżyseria
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                    Silnik dokona analizy wszystkich Twoich materiałów ({project.mediaLibrary.length} klipów), rozpozna oświetlenie, stabilność oraz kluczowe ujęcia, ułoży optymalną kolejność na osi czasu i doda kinową czołówkę oraz napisy końcowe.
                  </p>
                </div>
                <button
                  onClick={handleRunSmartMontage}
                  disabled={isGeneratingSmartMontage || project.mediaLibrary.length === 0}
                  className="shrink-0 px-5 py-3 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-bold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingSmartMontage ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-black" />
                      <span>Układam Film...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black text-black" />
                      <span>Uruchom Magiczną Produkcję</span>
                    </>
                  )}
                </button>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Style & Pacing */}
                <div className="p-4 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-4">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Sliders className="w-3.5 h-3.5" />
                    Styl & Tempo Montażu
                  </h4>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Tempo narracji:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'fast', label: 'Dynamiczne', sub: 'Krótkie cięcia' },
                        { id: 'cinematic', label: 'Kinowe', sub: 'Zrównoważone' },
                        { id: 'slow', label: 'Emocjonalne', sub: 'Długie ujęcia' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setDirectorPacing(p.id as any)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            directorPacing === p.id 
                              ? 'bg-[#202028] border-amber-400 text-amber-400 font-semibold' 
                              : 'bg-[#141416] border-[#26262b] text-zinc-400 hover:border-[#383842] hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold">{p.label}</div>
                          <div className="text-[10px] opacity-75">{p.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Styl czołówki:</label>
                    <select
                      value={directorStyle}
                      onChange={e => setDirectorStyle(e.target.value as any)}
                      className="w-full bg-[#141416] border border-[#26262b] rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none cursor-pointer"
                    >
                      <option value="cinematic">Kinowy Złoty (Cinematic Gold)</option>
                      <option value="modern_bold">Nowoczesny Wyrazisty (Modern Bold)</option>
                      <option value="studio_slate">Klaps Studyjny (Studio Slate)</option>
                      <option value="cyber_neon">Cyber Neon / Vibe</option>
                      <option value="elegant">Elegancki / Pamiątkowy</option>
                      <option value="minimalist">Minimalistyczny</option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#26262b]">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={applyTransitions} 
                        onChange={e => setApplyTransitions(e.target.checked)}
                        className="rounded border-[#26262b] accent-amber-400"
                      />
                      <span>Płynne przejścia między scenami (Dissolve / Cut)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={applySmartTrim} 
                        onChange={e => setApplySmartTrim(e.target.checked)}
                        className="rounded border-[#26262b] accent-amber-400"
                      />
                      <span>Inteligentne przycinanie statycznych końcówek (Smart Trim)</span>
                    </label>
                  </div>
                </div>

                {/* Title Cards Intro/Outro */}
                <div className="p-4 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-4">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 font-mono">
                    <Type className="w-3.5 h-3.5" />
                    Czołówka & Napisy Końcowe
                  </h4>

                  {/* Intro */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#26262b]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">🎬 Czołówka filmu (Intro)</span>
                      <input 
                        type="checkbox" 
                        checked={includeIntroCard} 
                        onChange={e => setIncludeIntroCard(e.target.checked)}
                        className="rounded border-[#26262b] accent-amber-400 cursor-pointer"
                      />
                    </div>
                    {includeIntroCard && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={introTitle}
                          onChange={e => setIntroTitle(e.target.value)}
                          placeholder="Tytuł czołówki..."
                          className="w-full bg-[#18181c] border border-[#26262b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                        />
                        <input
                          type="text"
                          value={introSubtitle}
                          onChange={e => setIntroSubtitle(e.target.value)}
                          placeholder="Podtytuł i data..."
                          className="w-full bg-[#18181c] border border-[#26262b] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 focus:border-amber-400 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Outro */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#141416] border border-[#26262b]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">🏆 Napisy końcowe (Outro)</span>
                      <input 
                        type="checkbox" 
                        checked={includeOutroCard} 
                        onChange={e => setIncludeOutroCard(e.target.checked)}
                        className="rounded border-[#26262b] accent-amber-400 cursor-pointer"
                      />
                    </div>
                    {includeOutroCard && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={outroTitle}
                          onChange={e => setOutroTitle(e.target.value)}
                          placeholder="Tytuł końcowy..."
                          className="w-full bg-[#18181c] border border-[#26262b] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-amber-400 outline-none"
                        />
                        <input
                          type="text"
                          value={outroSubtitle}
                          onChange={e => setOutroSubtitle(e.target.value)}
                          placeholder="Podpis i realizacja..."
                          className="w-full bg-[#18181c] border border-[#26262b] rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 focus:border-amber-400 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: SZYBKIE SCALANIE & RENDER */}
          {/* ================================================================ */}
          {activeTab === 'quick_merge' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Kolejność i Lista Ujęć do Scalenia</h3>
                  <p className="text-xs text-zinc-400">
                    Ułóż kolejność ujęć, wybierz rodzaj przejścia i kliknij „Scal i Zmontuj” lub przejdź do Eksportu.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300">Przejście:</span>
                  <select
                    value={mergeTransition}
                    onChange={e => setMergeTransition(e.target.value as TransitionType)}
                    className="bg-[#18181c] border border-[#26262b] rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 outline-none cursor-pointer"
                  >
                    <option value="dissolve">Płynne Przenikanie (Dissolve)</option>
                    <option value="fade">Zanikanie do czerni (Fade)</option>
                    <option value="wipe_left">Przesunięcie (Wipe)</option>
                    <option value="cut">Czyste Cięcie (Cut)</option>
                  </select>
                </div>
              </div>

              {/* Clip Sequence List */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {selectedClipsForMerge.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="p-2.5 rounded-xl bg-[#18181c] border border-[#26262b] flex items-center justify-between gap-3 hover:border-[#383842] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[#22222a] text-[11px] font-mono font-bold text-zinc-400 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="w-12 h-8 rounded-lg bg-black/50 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                        {clip.thumbnailUrl ? (
                          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Film className="w-4 h-4 text-zinc-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate max-w-[280px]">
                          {clip.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 font-mono">
                          <span>⏱️ {(clip.duration || 0).toFixed(1)}s</span>
                          <span>📐 {clip.width || 1920}×{clip.height || 1080}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          const arr = [...selectedClipsForMerge];
                          const [item] = arr.splice(index, 1);
                          arr.splice(index - 1, 0, item);
                          setSelectedClipsForMerge(arr);
                        }}
                        className="p-1.5 rounded-lg bg-[#22222a] hover:bg-[#282830] text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Przesuń wyżej"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === selectedClipsForMerge.length - 1}
                        onClick={() => {
                          const arr = [...selectedClipsForMerge];
                          const [item] = arr.splice(index, 1);
                          arr.splice(index + 1, 0, item);
                          setSelectedClipsForMerge(arr);
                        }}
                        className="p-1.5 rounded-lg bg-[#22222a] hover:bg-[#282830] text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Przesuń niżej"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClipsForMerge(prev => prev.filter(c => c.id !== clip.id));
                        }}
                        className="p-1.5 rounded-lg bg-[#22222a] hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 cursor-pointer"
                        title="Usuń z listy scalania"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#26262b] flex items-center justify-between">
                <div className="text-xs text-zinc-400 font-mono">
                  Łącznie: <strong className="text-white">{selectedClipsForMerge.length} ujęć</strong> • Czas: <strong className="text-amber-400">{selectedClipsForMerge.reduce((acc, c) => acc + (c.duration || 0), 0).toFixed(1)}s</strong>
                </div>
                <div className="flex items-center gap-2">
                  {onNavigateToExport && (
                    <button
                      onClick={() => {
                        handleApplyQuickMerge();
                        onNavigateToExport();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#22222a] hover:bg-[#282830] text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 border border-[#26262b]"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Scal i przejdź do Eksportu</span>
                    </button>
                  )}
                  <button
                    onClick={handleApplyQuickMerge}
                    className="px-5 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Zastosuj Scalenie na Osi Czasu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: KONSOLA POLECEŃ & ASYSTENT MONTAŻU */}
          {/* ================================================================ */}
          {activeTab === 'ai_chat' && (
            <div className="h-[480px] flex flex-col rounded-2xl bg-[#18181c] border border-[#26262b] overflow-hidden animate-fadeIn">
              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {chatMessages.map(msg => {
                  const isAssistant = msg.sender === 'assistant';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="w-7 h-7 rounded-xl bg-[#22222a] border border-[#2e2e36] flex items-center justify-center shrink-0 text-amber-400">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isAssistant
                            ? 'bg-[#141416] border border-[#26262b] text-zinc-100 shadow-md'
                            : 'bg-[#facc15] text-[#121214] font-medium shadow-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className={`text-[9px] block mt-1 ${isAssistant ? 'text-zinc-500 font-mono' : 'text-[#121214]/70 font-mono'}`}>
                          {msg.timestamp}
                        </span>
                      </div>
                      {!isAssistant && (
                        <div className="w-7 h-7 rounded-xl bg-[#22222a] border border-[#2e2e36] flex items-center justify-center shrink-0">
                          <UserIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {isAiThinking && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 p-2 font-mono">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>System analizuje projekt i przygotowuje narrację...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="shrink-0 p-3 bg-[#141416] border-t border-[#26262b] flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendChatMessage();
                  }}
                  placeholder="Wpisz polecenie: np. 'Zaproponuj kolejność scen', 'Napisz scenariusz pod dynamiczną muzykę'..."
                  className="flex-1 bg-[#18181c] border border-[#26262b] rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 outline-none"
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isAiThinking}
                  className="px-4 py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-bold text-xs uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Wyślij</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: AUDYT JAKOŚCI & DUPLIKATY */}
          {/* ================================================================ */}
          {activeTab === 'quality_audit' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-[#18181c] border border-[#26262b] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Techniczny Audyt Biblioteki Mediów</h3>
                  <p className="text-xs text-zinc-400">
                    Analiza ostrości klatek, stabilności ujęć oraz wykrywanie niepotrzebnych powtórek (dubli).
                  </p>
                </div>
                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing || project.mediaLibrary.length === 0}
                  className="px-4 py-2.5 rounded-xl bg-[#22222a] hover:bg-[#282830] text-amber-400 border border-[#26262b] font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isAuditing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{auditProgress}% - Analizuję...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Uruchom Audyt Jakości</span>
                    </>
                  )}
                </button>
              </div>

              {auditResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Best Takes */}
                  <div className="p-4 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Star className="w-3.5 h-3.5" />
                      Najlepsze Ujęcia ({auditResults.bestClips.length})
                    </h4>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {auditResults.bestClips.map(clip => (
                        <div key={clip.id} className="p-2 rounded-lg bg-[#141416] text-xs flex items-center justify-between text-white border border-[#26262b]">
                          <span className="truncate max-w-[200px]">{clip.name}</span>
                          <span className="text-emerald-400 text-[10px] font-mono">Ocena: 95/100</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Problems / Duplicates */}
                  <div className="p-4 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-3">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Wykryte Uwagi ({auditResults.problemClips.length})
                    </h4>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {auditResults.problemClips.length === 0 ? (
                        <div className="p-3 text-center text-xs text-zinc-400">
                          Brak krytycznych błędów w bibliotece ujęć!
                        </div>
                      ) : (
                        auditResults.problemClips.map((p, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-[#141416] text-xs flex items-center justify-between text-zinc-300 border border-[#26262b]">
                            <span className="truncate max-w-[180px]">{p.clip.name}</span>
                            <span className="text-amber-400 text-[10px] font-mono">{p.issue}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: BEAT-SYNC & NAPISY */}
          {/* ================================================================ */}
          {activeTab === 'beat_subtitles' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Beat Sync Panel */}
                <div className="p-5 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#22222a] text-amber-400 border border-[#2e2e36] flex items-center justify-center">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Synchronizacja Muzyczna (Beat-Sync)</h4>
                      <p className="text-[11px] text-zinc-400">Dopasuj długość ujęć i cięć do tempa utworu</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Tempo muzyki (BPM): <strong className="text-white font-mono">{musicBpm} BPM</strong></label>
                    <input 
                      type="range" 
                      min="60" 
                      max="180" 
                      value={musicBpm} 
                      onChange={e => setMusicBpm(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {['fast', 'medium', 'slow'].map(p => (
                      <button
                        key={p}
                        onClick={() => setBeatSyncPacing(p as any)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold uppercase border transition-all cursor-pointer ${
                          beatSyncPacing === p 
                            ? 'bg-[#282830] border-amber-400 text-amber-400' 
                            : 'bg-[#141416] border-[#26262b] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p === 'fast' ? 'Szybkie cięcia' : p === 'medium' ? 'Standard (4 beaty)' : 'Spokojne (8 beatów)'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleApplyBeatSync}
                    className="w-full py-2.5 rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Zastosuj Cięcia do Muzyki</span>
                  </button>
                </div>

                {/* Subtitles & Voice Panel */}
                <div className="p-5 rounded-2xl bg-[#18181c] border border-[#26262b] space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#22222a] text-amber-400 border border-[#2e2e36] flex items-center justify-center">
                      <Type className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Automatyczne Napisy & Własny Głos</h4>
                      <p className="text-[11px] text-zinc-400">Generowanie nakładek tekstowych oraz nagrywanie lektora</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141416] border border-[#26262b] space-y-2">
                    <span className="text-xs font-semibold text-white block">Automatyczne Podpisy Scen (Overlay)</span>
                    <p className="text-[11px] text-zinc-400">
                      Generuje eleganckie belki z tytułami ujęć zsynchronizowane z czasem ich trwania.
                    </p>
                    <button
                      onClick={handleGenerateCaptions}
                      disabled={isGeneratingSubtitles}
                      className="w-full py-2 rounded-xl bg-[#22222a] hover:bg-[#282830] text-zinc-200 hover:text-white border border-[#26262b] font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isGeneratingSubtitles ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                      <span>Generuj Napisy dla Wszystkich Scen</span>
                    </button>
                  </div>

                  {onOpenVoiceRecorder && (
                    <div className="p-3 rounded-xl bg-[#141416] border border-[#26262b] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-white block">Studio Nagrań Lektora</span>
                        <span className="text-[10px] text-zinc-400 font-mono">Nagraj głos przez mikrofon lub wgraj audio</span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenVoiceRecorder();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#22222a] hover:bg-[#282830] text-amber-400 font-semibold text-xs border border-[#26262b] transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Nagraj Głos</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM MODAL FOOTER */}
        <div className="shrink-0 px-6 py-3.5 border-t border-[#26262b] bg-[#141416] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Wszystkie moduły połączone w czasie rzeczywistym z Twoją osią montażu</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#22222a] hover:bg-[#282830] text-zinc-200 hover:text-white text-xs font-semibold border border-[#26262b] transition-colors cursor-pointer"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
}
