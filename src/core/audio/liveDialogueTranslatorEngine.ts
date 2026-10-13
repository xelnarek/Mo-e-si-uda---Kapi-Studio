/**
 * Kapi-Studio By Piotr - Live AI Dialogue Analyzer & Real-Time Translator Engine
 * 
 * Zaawansowany silnik analizy dialogów wideo i tłumaczenia mowy w czasie rzeczywistym.
 * 1. Synchronizuje i wyświetla napisy na żywo podczas odtwarzania wideo.
 * 2. Automatycznie analizuje autentyczną ścieżkę dźwiękową filmu za pomocą Gemini Multimodal AI.
 * 3. Tłumaczy obcojęzyczne dialogi (angielski, niemiecki, hiszpański itp.) na naturalny język polski w locie.
 * 4. Obsługuje bezpośrednie dopasowanie playheada oraz opcjonalne dyktowanie głosu.
 */

import type { ProjectState, TextLayer, SubtitleStyle } from '../../types/project';
import { SmartPolishSubtitlesEngine, type SubtitleSyncProgress } from './smartPolishSubtitlesEngine';

export interface LiveDialogueCue {
  id: string;
  originalText: string;
  translatedText: string;
  timelineStart: number;
  duration: number;
  isFinal: boolean;
  speaker: string;
  detectedLanguage?: string;
}

export type LiveDialogueState = 'idle' | 'analyzing' | 'active_cue' | 'no_speech';

export interface LiveDialogueStatus {
  state: LiveDialogueState;
  message?: string;
  progress?: number;
}

export type LiveDialogueListener = (cue: LiveDialogueCue | null) => void;
export type LiveCommitListener = (layer: TextLayer) => void;
export type LiveStatusListener = (status: LiveDialogueStatus) => void;

export class LiveDialogueTranslatorEngine {
  private static instance: LiveDialogueTranslatorEngine | null = null;

  private recognition: any = null;
  private isListening: boolean = false;
  private isEnabled: boolean = true;
  private isAnalyzing: boolean = false;
  private activeCue: LiveDialogueCue | null = null;
  private currentPlayheadTime: number = 0;

  private listeners: Set<LiveDialogueListener> = new Set();
  private commitListeners: Set<LiveCommitListener> = new Set();
  private statusListeners: Set<LiveStatusListener> = new Set();

  private translationCache: Map<string, string> = new Map();
  private lastSpokenPhrase: string = '';
  private lastSpokenTime: number = 0;
  private currentStatus: LiveDialogueStatus = { state: 'idle' };

  public static getInstance(): LiveDialogueTranslatorEngine {
    if (!LiveDialogueTranslatorEngine.instance) {
      LiveDialogueTranslatorEngine.instance = new LiveDialogueTranslatorEngine();
    }
    return LiveDialogueTranslatorEngine.instance;
  }

  private constructor() {
    this.initSpeechRecognition();
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;

    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        this.recognition = new SpeechClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'pl-PL';

        this.recognition.onresult = (event: any) => {
          this.handleSpeechResult(event);
        };

        this.recognition.onerror = (event: any) => {
          // Ciche ignorowanie typowych zdarzeń mikrofonowych (brak mowy, brak zgody)
          if (event?.error !== 'no-speech' && event?.error !== 'not-allowed') {
            console.debug('[LiveDialogueTranslator] Recognition info:', event?.error);
          }
        };

        this.recognition.onend = () => {
          if (this.isListening && this.isEnabled) {
            try {
              this.recognition.start();
            } catch {}
          }
        };
      }
    } catch (e) {
      console.debug('[LiveDialogueTranslator] SpeechRecognition initialization note:', e);
    }
  }

  public isSupported(): boolean {
    return Boolean(this.recognition);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
      this.clearActiveCue();
      this.updateStatus({ state: 'idle' });
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public subscribe(listener: LiveDialogueListener): () => void {
    this.listeners.add(listener);
    listener(this.activeCue);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onCommitSubtitle(listener: LiveCommitListener): () => void {
    this.commitListeners.add(listener);
    return () => {
      this.commitListeners.delete(listener);
    };
  }

  public subscribeStatus(listener: LiveStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public getStatus(): LiveDialogueStatus {
    return this.currentStatus;
  }

  private updateStatus(status: LiveDialogueStatus): void {
    this.currentStatus = status;
    this.statusListeners.forEach(listener => {
      try { listener(status); } catch {}
    });
  }

  /**
   * Wywoływane podczas startu odtwarzania filmu (Play)
   */
  public start(currentPlayheadSec: number = 0): void {
    if (!this.isEnabled) return;
    this.currentPlayheadTime = currentPlayheadSec;

    // Próba aktywacji nasłuchiwania mikrofonu w tle jeśli jest dostępne
    if (this.recognition && !this.isListening) {
      try {
        this.isListening = true;
        this.recognition.start();
      } catch {
        // Może być już aktywny
      }
    }
  }

  /**
   * Wywoływane podczas zatrzymania odtwarzania (Pause / Stop)
   */
  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  /**
   * Aktualizuje bieżącą pozycję głowicy podczas odtwarzania
   * oraz natychmiast synchronizuje napisy z warstwami projektu
   */
  public updatePlayheadTime(currentTimeSec: number, projectTextLayers?: TextLayer[]): void {
    this.currentPlayheadTime = currentTimeSec;

    // Jeśli przekazano warstwy tekstowe projektu, zsynchronizuj z nimi aktywny dialog
    if (projectTextLayers && projectTextLayers.length > 0) {
      const activeCaption = projectTextLayers.find(layer => {
        if (layer.type !== 'caption' && layer.type !== 'subtitle') return false;
        const start = layer.timelineStart;
        const end = start + (layer.duration || 3);
        return currentTimeSec >= start && currentTimeSec <= end;
      });

      if (activeCaption) {
        const cue: LiveDialogueCue = {
          id: activeCaption.id,
          originalText: activeCaption.text,
          translatedText: activeCaption.text,
          timelineStart: activeCaption.timelineStart,
          duration: activeCaption.duration || 3,
          isFinal: true,
          speaker: activeCaption.subtitleSpeaker || 'Dialog',
          detectedLanguage: 'pl'
        };

        if (!this.activeCue || this.activeCue.id !== cue.id) {
          this.activeCue = cue;
          this.notifyListeners(cue);
          this.updateStatus({ state: 'active_cue', message: cue.translatedText });
        }
        return;
      }
    }

    // Jeśli brak warstwy w tym punkcie czasowym, a mieliśmy aktywną kwestię na żywo
    if (this.activeCue) {
      const cueEnd = this.activeCue.timelineStart + this.activeCue.duration;
      if (currentTimeSec > cueEnd + 0.8 || currentTimeSec < this.activeCue.timelineStart - 0.3) {
        this.clearActiveCue();
        this.updateStatus({ state: 'idle' });
      }
    }
  }

  public clearActiveCue(): void {
    this.activeCue = null;
    this.notifyListeners(null);
  }

  public getActiveCue(): LiveDialogueCue | null {
    return this.activeCue;
  }

  /**
   * Automatyczna analiza ścieżki dźwiękowej filmu w tle
   * Wyodrębnia dialogi, tłumaczy na język polski i dodaje napisy do projektu.
   */
  public async autoAnalyzeProjectAudio(
    project: ProjectState,
    onProgress?: (progress: SubtitleSyncProgress) => void
  ): Promise<{ textLayers: TextLayer[]; totalSegments: number; details: string }> {
    if (this.isAnalyzing) {
      return {
        textLayers: project.textLayers || [],
        totalSegments: 0,
        details: 'Analiza jest już w toku.'
      };
    }

    this.isAnalyzing = true;
    this.updateStatus({ state: 'analyzing', message: 'Analiza dialogów i tłumaczenie mowy AI...', progress: 10 });

    try {
      const res = await SmartPolishSubtitlesEngine.generatePolishSubtitlesFromProject(
        project,
        (p) => {
          this.updateStatus({
            state: 'analyzing',
            message: p.message,
            progress: p.percent
          });
          onProgress?.(p);
        }
      );

      this.isAnalyzing = false;
      this.updateStatus({
        state: res.totalSegments > 0 ? 'idle' : 'no_speech',
        message: res.details,
        progress: 100
      });

      return res;
    } catch (err: any) {
      this.isAnalyzing = false;
      this.updateStatus({ state: 'idle', message: 'Błąd analizy dźwięku' });
      throw err;
    }
  }

  /**
   * Przetwarza wyniki mowy w czasie rzeczywistym z mikrofonu
   */
  private async handleSpeechResult(event: any): Promise<void> {
    if (!this.isEnabled) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const transcript = res[0]?.transcript?.trim();
      const isFinal = Boolean(res.isFinal);

      if (!transcript || transcript.length < 2) continue;

      const now = Date.now();
      if (transcript === this.lastSpokenPhrase && now - this.lastSpokenTime < 1500 && isFinal) {
        continue;
      }

      const cueId = `live_dialogue_${now}_${i}`;
      const estimatedDuration = Math.max(1.8, Math.min(6.0, transcript.length * 0.085 + 0.8));
      const startTime = Math.max(0, this.currentPlayheadTime - 0.3);

      let translated = transcript;
      const needsTranslation = this.checkIfMightBeForeign(transcript);

      if (needsTranslation) {
        translated = await this.translateToPolish(transcript);
      }

      const cue: LiveDialogueCue = {
        id: cueId,
        originalText: transcript,
        translatedText: translated,
        timelineStart: Number(startTime.toFixed(2)),
        duration: Number(estimatedDuration.toFixed(2)),
        isFinal,
        speaker: 'AI Dialog',
        detectedLanguage: needsTranslation ? 'Auto (Przetłumaczono)' : 'pl'
      };

      this.activeCue = cue;
      this.notifyListeners(cue);
      this.updateStatus({ state: 'active_cue', message: translated });

      if (isFinal) {
        this.lastSpokenPhrase = transcript;
        this.lastSpokenTime = now;

        const textLayer: TextLayer = {
          id: `caption_ai_${now}`,
          text: translated,
          timelineStart: cue.timelineStart,
          duration: cue.duration,
          style: 'karaoke_glow',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          fontSize: 22,
          position: { x: 0.5, y: 0.85 },
          type: 'caption',
          subtitleSpeaker: 'Dialog'
        };

        this.commitListeners.forEach(listener => {
          try { listener(textLayer); } catch {}
        });
      }
    }
  }

  /**
   * Tłumaczy obcy tekst kwestii na język polski w locie
   */
  public async translateToPolish(text: string): Promise<string> {
    if (this.translationCache.has(text)) {
      return this.translationCache.get(text)!;
    }

    try {
      const resp = await fetch('/api/translate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: 'pl' })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.translatedText) {
          this.translationCache.set(text, data.translatedText);
          return data.translatedText;
        }
      }
    } catch {
      // W razie problemu z siecią zwróć oryginalny tekst
    }

    return text;
  }

  private checkIfMightBeForeign(text: string): boolean {
    const lower = text.toLowerCase();
    const foreignIndicators = [
      'the', 'is', 'are', 'you', 'this', 'that', 'with', 'have', 'from',
      'hello', 'welcome', 'today', 'video', 'movie', 'show', 'let\'s', 'what',
      'good', 'morning', 'night', 'thank', 'thanks', 'yeah', 'okay', 'right',
      'der', 'die', 'das', 'und', 'ich', 'nicht', 'bonjour', 'merci', 'oui'
    ];
    const words = lower.split(/\s+/);
    return words.some(w => foreignIndicators.includes(w.replace(/[^a-z]/g, '')));
  }

  private notifyListeners(cue: LiveDialogueCue | null): void {
    this.listeners.forEach(listener => {
      try { listener(cue); } catch {}
    });
  }
}

export const liveDialogueTranslator = LiveDialogueTranslatorEngine.getInstance();
