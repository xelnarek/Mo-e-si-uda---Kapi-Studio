/**
 * CineForge Pro Studio - Dedicated Polish AI Subtitles & Playback Engine
 * 
 * Dedykowany, zaawansowany silnik AI do automatycznego generowania i wyświetlania
 * polskich napisów podczas odtwarzania filmu.
 * 
 * Funkcje:
 * 1. Język polski jako nadrzędny i domyślny (ortografia, interpunkcja, znaki diakrytyczne).
 * 2. Automatyczne wykrywanie mowy i dialogów z autentycznego dźwięku ujęć wideo.
 * 3. Wyświetlanie napisów w formie pisemnej w czasie rzeczywistym podczas odtwarzania.
 * 4. Analiza akustyczna (VAD - Voice Activity Detection) w czasie rzeczywistym przez AnalyserNode.
 * 5. Hybrydowa transkrypcja AI (Gemini 3.8 Flash / transcribe-audio-polish) z natychmiastowym cache'owaniem.
 * 6. Bezpośrednia synchronizacja z osią czasu, podglądem wideo i eksportem ISO MP4.
 */

import type { ProjectState, TextLayer, SubtitleStyle, MediaClip, TimelineItem } from '../../types/project';
import { SmartCutAnalyzer } from './smartCutAnalyzer';
import { SafeAudioDecoder } from './audioDecoder';
import { resolveClipMediaUrl, resolveAudioTrackUrl, getMediaArrayBuffer } from '../media/mediaResolver';
import { audioBufferToWav, arrayBufferToBase64 } from './wavEncoder';

export interface PolishSubtitleCue {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence?: number;
  isLive?: boolean;
}

export interface VoiceActivityState {
  isSpeaking: boolean;
  energyLevel: number; // 0.0 - 1.0
  frequencyPeakHz: number;
}

export type SubtitleEngineState = 'idle' | 'listening' | 'transcribing' | 'active_dialogue' | 'no_speech';

export interface SubtitleEngineStatus {
  state: SubtitleEngineState;
  message: string;
  progressPercent?: number;
  activeLanguage: string;
  totalCues: number;
}

export class DedicatedPolishAiSubtitlesEngine {
  private static instance: DedicatedPolishAiSubtitlesEngine | null = null;

  private isEnabled: boolean = true;
  private currentPlayheadSec: number = 0;
  private activeCue: PolishSubtitleCue | null = null;
  private isProcessingChunk: boolean = false;
  private currentStatus: SubtitleEngineStatus = {
    state: 'idle',
    message: 'Silnik napisów AI (PL) gotowy',
    activeLanguage: 'pl-PL',
    totalCues: 0
  };

  // Caching: clipId -> PolishSubtitleCue[]
  private clipCaptionsCache: Map<string, PolishSubtitleCue[]> = new Map();
  private transcribingClips: Set<string> = new Set();

  // Audio Context & Voice Activity Analyser
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaElementAudioSourceNode | null = null;
  private vadState: VoiceActivityState = { isSpeaking: false, energyLevel: 0, frequencyPeakHz: 0 };

  // Browser Web Speech Recognition (pl-PL) fallback
  private speechRecognition: any = null;
  private isLiveListening: boolean = false;

  // Listeners
  private cueListeners: Set<(cue: PolishSubtitleCue | null) => void> = new Set();
  private vadListeners: Set<(vad: VoiceActivityState) => void> = new Set();
  private statusListeners: Set<(status: SubtitleEngineStatus) => void> = new Set();

  public static getInstance(): DedicatedPolishAiSubtitlesEngine {
    if (!DedicatedPolishAiSubtitlesEngine.instance) {
      DedicatedPolishAiSubtitlesEngine.instance = new DedicatedPolishAiSubtitlesEngine();
    }
    return DedicatedPolishAiSubtitlesEngine.instance;
  }

  private constructor() {
    this.initBrowserSpeechRecognition();
  }

  /**
   * Inicjalizacja wbudowanego mechanizmu rozpoznawania mowy w języku polskim
   */
  private initBrowserSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        this.speechRecognition = new SpeechClass();
        this.speechRecognition.continuous = true;
        this.speechRecognition.interimResults = true;
        this.speechRecognition.lang = 'pl-PL';
        this.speechRecognition.maxAlternatives = 1;

        this.speechRecognition.onresult = (event: any) => {
          this.handleBrowserSpeechResult(event);
        };

        this.speechRecognition.onerror = (event: any) => {
          if (event?.error !== 'no-speech' && event?.error !== 'not-allowed') {
            console.debug('[DedicatedPolishSubtitles] Speech Recognition info:', event?.error);
          }
        };

        this.speechRecognition.onend = () => {
          if (this.isLiveListening && this.isEnabled) {
            try { this.speechRecognition.start(); } catch {}
          }
        };
      }
    } catch (e) {
      console.debug('[DedicatedPolishSubtitles] SpeechRecognition init:', e);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.clearActiveCue();
      this.stopLiveSpeech();
      this.updateStatus({ state: 'idle', message: 'Napisy PL wyłączone' });
    } else {
      this.updateStatus({ state: 'idle', message: 'Napisy AI (PL) aktywne' });
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getActiveCue(): PolishSubtitleCue | null {
    return this.activeCue;
  }

  public getVadState(): VoiceActivityState {
    return this.vadState;
  }

  public getStatus(): SubtitleEngineStatus {
    return this.currentStatus;
  }

  public subscribeCue(listener: (cue: PolishSubtitleCue | null) => void): () => void {
    this.cueListeners.add(listener);
    listener(this.activeCue);
    return () => { this.cueListeners.delete(listener); };
  }

  public subscribeVad(listener: (vad: VoiceActivityState) => void): () => void {
    this.vadListeners.add(listener);
    listener(this.vadState);
    return () => { this.vadListeners.delete(listener); };
  }

  public subscribeStatus(listener: (status: SubtitleEngineStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => { this.statusListeners.delete(listener); };
  }

  private updateStatus(partial: Partial<SubtitleEngineStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...partial };
    this.statusListeners.forEach(l => {
      try { l(this.currentStatus); } catch {}
    });
  }

  private notifyCue(cue: PolishSubtitleCue | null): void {
    this.activeCue = cue;
    this.cueListeners.forEach(l => {
      try { l(cue); } catch {}
    });
  }

  public clearActiveCue(): void {
    this.notifyCue(null);
  }

  /**
   * Podłącza element wideo pod analizator akustyczny mowy w czasie rzeczywistym
   */
  public attachVideoElement(video: HTMLVideoElement): void {
    if (typeof window === 'undefined' || !video) return;

    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.8;
      }

      if (!this.mediaStreamSource && !(video as any)._audioSourceAttached) {
        try {
          this.mediaStreamSource = this.audioCtx.createMediaElementSource(video);
          this.mediaStreamSource.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
          (video as any)._audioSourceAttached = true;
        } catch (e) {
          // Element already attached or security constraint
        }
      }
    } catch (e) {
      console.debug('[DedicatedPolishSubtitles] Analyser attach note:', e);
    }
  }

  /**
   * Bada bieżące pasmo dźwięku i sprawdza obecność ludzkiej mowy (VAD)
   */
  public sampleAudioEnergy(): VoiceActivityState {
    if (!this.analyser) {
      return { isSpeaking: false, energyLevel: 0, frequencyPeakHz: 0 };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    let maxVal = 0;
    let maxBin = 0;

    // Human speech fundamental & formants range: 100Hz - 3500Hz
    const sampleRate = this.audioCtx?.sampleRate || 48000;
    const binWidth = sampleRate / (this.analyser.fftSize);
    const speechMinBin = Math.floor(100 / binWidth);
    const speechMaxBin = Math.min(bufferLength - 1, Math.ceil(3500 / binWidth));

    for (let i = speechMinBin; i <= speechMaxBin; i++) {
      const val = dataArray[i];
      sum += val;
      if (val > maxVal) {
        maxVal = val;
        maxBin = i;
      }
    }

    const binsCount = speechMaxBin - speechMinBin + 1;
    const avgEnergy = binsCount > 0 ? (sum / binsCount) / 255 : 0;
    const isSpeaking = avgEnergy > 0.08 && maxVal > 45;
    const frequencyPeakHz = Math.round(maxBin * binWidth);

    this.vadState = {
      isSpeaking,
      energyLevel: Number(avgEnergy.toFixed(3)),
      frequencyPeakHz
    };

    this.vadListeners.forEach(l => {
      try { l(this.vadState); } catch {}
    });

    return this.vadState;
  }

  /**
   * Główna pętla wywoływana podczas każdego ticku odtwarzania wideo.
   * Wyszukuje lub generuje polskie napisy dopasowane do bieżącej sekundy.
   */
  public updatePlaybackTime(
    currentTimeSec: number,
    project: ProjectState,
    onAutoCommitLayer?: (layer: TextLayer) => void
  ): PolishSubtitleCue | null {
    this.currentPlayheadSec = currentTimeSec;
    if (!this.isEnabled) {
      return null;
    }

    // 1. Zbadaj aktywność głosu w dźwięku
    this.sampleAudioEnergy();

    // 2. Najpierw sprawdź istniejące warstwy tekstowe projektu (napisy / dialogi)
    const existingLayers = project.textLayers || [];
    const activeLayer = existingLayers.find(layer => {
      if (layer.type !== 'caption' && layer.type !== 'subtitle') return false;
      const start = layer.timelineStart;
      const end = start + (layer.duration || 3);
      return currentTimeSec >= start && currentTimeSec <= end;
    });

    if (activeLayer) {
      const cue: PolishSubtitleCue = {
        id: activeLayer.id,
        text: activeLayer.text,
        startTime: activeLayer.timelineStart,
        endTime: activeLayer.timelineStart + activeLayer.duration,
        speaker: activeLayer.subtitleSpeaker || 'Dialog PL'
      };

      if (!this.activeCue || this.activeCue.id !== cue.id) {
        this.notifyCue(cue);
        this.updateStatus({ state: 'active_dialogue', message: cue.text });
      }
      return cue;
    }

    // 3. Sprawdź wewnętrzną pamięć podręczną ujęć
    for (const [, cues] of this.clipCaptionsCache.entries()) {
      const matchingCue = cues.find(c => currentTimeSec >= c.startTime && currentTimeSec <= c.endTime);
      if (matchingCue) {
        if (!this.activeCue || this.activeCue.id !== matchingCue.id) {
          this.notifyCue(matchingCue);
          this.updateStatus({ state: 'active_dialogue', message: matchingCue.text });

          // Jeśli nie było tej warstwy w projekcie, dodaj ją
          if (onAutoCommitLayer) {
            onAutoCommitLayer({
              id: matchingCue.id,
              text: matchingCue.text,
              type: 'caption',
              style: project.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow',
              timelineStart: matchingCue.startTime,
              duration: Math.max(1.2, matchingCue.endTime - matchingCue.startTime),
              position: { x: 0.5, y: 0.86 },
              fontSize: 18,
              color: '#FFFFFF',
              backgroundColor: 'rgba(0,0,0,0.85)',
              animation: 'fade',
              fontWeight: 'bold',
              subtitleSpeaker: matchingCue.speaker || 'Głos PL'
            });
          }
        }
        return matchingCue;
      }
    }

    // 4. Jeśli w bieżącym momencie brak napisu, a mieliśmy aktywny, wyczyść go po upływie czasu
    if (this.activeCue) {
      if (currentTimeSec > this.activeCue.endTime + 0.3 || currentTimeSec < this.activeCue.startTime - 0.2) {
        this.clearActiveCue();
        this.updateStatus({ state: 'idle', message: 'Odtwarzanie...' });
      }
    }

    return null;
  }

  /**
   * Automatyczna transkrypcja mowy na język polski dla konkretnego ujęcia
   */
  public async transcribeClipPolish(
    clip: MediaClip,
    item: TimelineItem,
    project: ProjectState
  ): Promise<PolishSubtitleCue[]> {
    if (this.clipCaptionsCache.has(clip.id)) {
      return this.clipCaptionsCache.get(clip.id) || [];
    }

    if (this.transcribingClips.has(clip.id)) {
      return [];
    }

    this.transcribingClips.add(clip.id);
    this.updateStatus({ state: 'transcribing', message: `Analiza mowy PL dla "${clip.name}"...` });

    try {
      const OfflineCtxClass = typeof window !== 'undefined'
        ? (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)
        : null;

      if (!OfflineCtxClass) {
        this.transcribingClips.delete(clip.id);
        return [];
      }

      // 1. Ekstrakcja audio
      let arrayBuf: ArrayBuffer | null = null;
      if (clip.file) {
        try { arrayBuf = await clip.file.arrayBuffer(); } catch {}
      }
      if (!arrayBuf) {
        const src = await resolveClipMediaUrl(clip);
        arrayBuf = await getMediaArrayBuffer(clip.id, undefined, src || clip.objectUrl);
      }

      if (!arrayBuf || arrayBuf.byteLength === 0) {
        this.transcribingClips.delete(clip.id);
        return [];
      }

      const sampleRate = 16000;
      const targetDuration = Math.max(1, Math.min(60, item.duration || clip.duration));
      const totalSamples = Math.ceil(targetDuration * sampleRate);
      const offlineCtx = new OfflineCtxClass(1, totalSamples, sampleRate);

      const decoded = await SafeAudioDecoder.decodeTo48kStereo(offlineCtx, arrayBuf);
      if (!decoded || decoded.duration <= 0) {
        this.transcribingClips.delete(clip.id);
        return [];
      }

      const srcNode = offlineCtx.createBufferSource();
      srcNode.buffer = decoded;
      srcNode.connect(offlineCtx.destination);
      const safeOffset = Math.max(0, Math.min(item.sourceStart || 0, decoded.duration - 0.1));
      srcNode.start(0, safeOffset, targetDuration);

      const renderedMix = await offlineCtx.startRendering();
      const wavBuffer = audioBufferToWav(renderedMix);
      if (!wavBuffer || wavBuffer.byteLength === 0 || wavBuffer.byteLength > 10 * 1024 * 1024) {
        this.transcribingClips.delete(clip.id);
        return [];
      }

      const audioBase64 = arrayBufferToBase64(wavBuffer);

      // 2. Zapytaj Gemini AI o transkrypcję z wymuszeniem języka polskiego
      const resp = await fetch('/api/transcribe-audio-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.name || 'Film',
          durationSec: targetDuration,
          audioBase64,
          mimeType: 'audio/wav',
          clipsContext: [{ name: clip.name, duration: targetDuration }]
        })
      });

      if (!resp.ok) {
        this.transcribingClips.delete(clip.id);
        return [];
      }

      const data = await resp.json();
      const raw = Array.isArray(data.segments) ? data.segments : [];

      const cues: PolishSubtitleCue[] = raw.map((s: any, idx: number) => ({
        id: `cue_${clip.id}_${idx}_${Date.now()}`,
        text: s.text,
        startTime: Number((item.timelineStart + s.startTime).toFixed(2)),
        endTime: Number((item.timelineStart + s.endTime).toFixed(2)),
        speaker: s.speaker || 'Głos PL'
      }));

      this.clipCaptionsCache.set(clip.id, cues);
      this.transcribingClips.delete(clip.id);
      this.updateStatus({ state: 'idle', message: `Rozpoznano ${cues.length} kwestii PL w "${clip.name}"` });

      return cues;
    } catch (err: any) {
      console.warn('[DedicatedPolishSubtitles] Clip transcribe note:', err);
      this.transcribingClips.delete(clip.id);
      this.updateStatus({ state: 'idle', message: 'Gotowy' });
      return [];
    }
  }

  /**
   * Generuje i synchronizuje polskie napisy dla całego filmu
   */
  public async generateFullProjectSubtitles(
    project: ProjectState,
    onProgress?: (percent: number, message: string) => void
  ): Promise<{ textLayers: TextLayer[]; totalCount: number; message: string }> {
    const timelineItems = project.timelineItems || [];
    if (timelineItems.length === 0) {
      return { textLayers: project.textLayers || [], totalCount: 0, message: 'Brak ujęć na osi czasu.' };
    }

    onProgress?.(15, 'Skanowanie ścieżki dźwiękowej filmu i analiza mowy PL...');

    const clipMap = new Map<string, MediaClip>((project.mediaLibrary || []).map(c => [c.id, c]));
    const allCues: PolishSubtitleCue[] = [];

    let processed = 0;
    for (const item of timelineItems) {
      const clip = clipMap.get(item.clipId);
      if (!clip || clip.type !== 'video' || !clip.hasAudio) continue;

      onProgress?.(
        Math.round(20 + (processed / timelineItems.length) * 60),
        `Analiza mowy w języku polskim: ${clip.name}...`
      );

      const cues = await this.transcribeClipPolish(clip, item, project);
      allCues.push(...cues);
      processed++;
    }

    // Jeśli brak mowy, zachowaj pozostałe warstwy
    const nonCaptions = (project.textLayers || []).filter(t => t.type !== 'caption' && t.type !== 'subtitle');

    if (allCues.length === 0) {
      onProgress?.(100, 'Zakończono: brak wykrytej mowy w ścieżce dźwiękowej.');
      return {
        textLayers: nonCaptions,
        totalCount: 0,
        message: 'W ścieżce dźwiękowej filmu nie wykryto mowy ludzkiej (np. tylko muzyka lub cisza).'
      };
    }

    const style: SubtitleStyle = project.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow';

    const newLayers: TextLayer[] = allCues.map((c, idx) => ({
      id: `tl_pl_${Date.now()}_${idx}`,
      text: c.text,
      type: 'caption',
      style,
      timelineStart: c.startTime,
      duration: Math.max(1.2, c.endTime - c.startTime),
      position: { x: 0.5, y: 0.86 },
      fontSize: 18,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      animation: 'fade',
      fontWeight: 'bold',
      subtitleSpeaker: c.speaker || 'Głos PL'
    }));

    onProgress?.(100, `Gotowe! Zsynchronizowano ${newLayers.length} polskich napisów.`);
    return {
      textLayers: [...nonCaptions, ...newLayers],
      totalCount: newLayers.length,
      message: `Wygenerowano i zsynchronizowano ${newLayers.length} polskich napisów dialogowych.`
    };
  }

  /**
   * Obsługa wyników SpeechRecognition z mikrofonu podczas odtwarzania
   */
  private handleBrowserSpeechResult(event: any): void {
    if (!this.isEnabled) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const text = res[0]?.transcript?.trim();
      const isFinal = Boolean(res.isFinal);

      if (!text || text.length < 2) continue;

      const cue: PolishSubtitleCue = {
        id: `live_pl_${Date.now()}`,
        text,
        startTime: this.currentPlayheadSec,
        endTime: this.currentPlayheadSec + Math.max(2.5, text.length * 0.08),
        speaker: 'Mowa na żywo PL',
        isLive: true
      };

      this.notifyCue(cue);
      this.updateStatus({ state: 'active_dialogue', message: text });
    }
  }

  public startLiveSpeech(): void {
    if (!this.speechRecognition || this.isLiveListening) return;
    try {
      this.isLiveListening = true;
      this.speechRecognition.start();
      this.updateStatus({ state: 'listening', message: 'AI słucha mowy PL...' });
    } catch {}
  }

  public stopLiveSpeech(): void {
    if (!this.speechRecognition || !this.isLiveListening) return;
    try {
      this.speechRecognition.stop();
    } catch {}
    this.isLiveListening = false;
  }
}

export const dedicatedPolishAiSubtitles = DedicatedPolishAiSubtitlesEngine.getInstance();
