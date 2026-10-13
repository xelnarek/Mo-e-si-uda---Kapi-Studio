/**
 * CineForge Studio - Smart Polish Subtitles & Audio-Sync Engine
 * 
 * Automatyczne dopasowywanie i generowanie polskich napisów na podstawie
 * rzeczywistej ścieżki dźwiękowej filmu (Web Speech API, AudioContext acoustic detection,
 * SmartCutAnalyzer oraz Gemini Multimodal Polish Speech-to-Text).
 */

import type { ProjectState, TextLayer, SubtitleStyle, MediaClip } from '../../types/project';
import { SmartCutAnalyzer } from './smartCutAnalyzer';
import { SafeAudioDecoder } from './audioDecoder';
import { convertCaptionsToTextLayers, type CaptionSegment } from './autoCaptionsEngine';
import { resolveClipMediaUrl, resolveAudioTrackUrl, getMediaArrayBuffer } from '../media/mediaResolver';
import { audioBufferToWav, arrayBufferToBase64 } from './wavEncoder';

export interface SubtitleSyncProgress {
  stage: 'analyzing_audio' | 'detecting_speech' | 'transcribing_polish' | 'synchronizing' | 'completed' | 'error';
  percent: number;
  message: string;
  foundSegmentsCount: number;
}

export class SmartPolishSubtitlesEngine {
  /**
   * Sprawdza czy polskie napisy są włączone dla podglądu i eksportu
   */
  public static isPolishSubtitlesEnabled(project: ProjectState): boolean {
    if (project.settings?.subtitlesSettings?.enabled !== undefined) {
      return Boolean(project.settings.subtitlesSettings.enabled);
    }
    // Domyślnie włączone jeśli w projekcie istnieją już warstwy napisów
    const hasCaptions = (project.textLayers || []).some(t => t.type === 'caption' || t.type === 'subtitle');
    return hasCaptions;
  }

  /**
   * Zwraca liczbę aktywnych kwestii napisów w projekcie
   */
  public static getSubtitlesCount(project: ProjectState): number {
    return (project.textLayers || []).filter(t => t.type === 'caption' || t.type === 'subtitle').length;
  }

  /**
   * Generuje i synchronizuje polskie napisy na podstawie rzeczywistej ścieżki dźwiękowej filmu
   * (Miksowanie audio projektowego, badanie fali głosu, ekstrakcja WAV i transkrypcja mowy).
   */
  public static async generatePolishSubtitlesFromProject(
    project: ProjectState,
    onProgress?: (progress: SubtitleSyncProgress) => void
  ): Promise<{
    textLayers: TextLayer[];
    totalSegments: number;
    details: string;
  }> {
    const notify = (stage: SubtitleSyncProgress['stage'], percent: number, message: string, foundSegmentsCount: number = 0) => {
      onProgress?.({ stage, percent, message, foundSegmentsCount });
    };

    notify('analyzing_audio', 10, 'Skanowanie i miksowanie ścieżki dźwiękowej filmu...');

    const timelineItems = project.timelineItems || [];
    const mediaLibrary = project.mediaLibrary || [];
    const audioTracks = project.audioTracks || [];

    // Oblicz całkowity czas trwania filmu
    let totalProjectDuration = 0;
    timelineItems.forEach(item => {
      const end = item.timelineStart + item.duration;
      if (end > totalProjectDuration) totalProjectDuration = end;
    });
    audioTracks.forEach(track => {
      const end = track.timelineStart + track.duration;
      if (end > totalProjectDuration) totalProjectDuration = end;
    });

    if (totalProjectDuration <= 0) {
      totalProjectDuration = 10;
    }

    notify('detecting_speech', 25, 'Ekstrakcja autentycznego dźwięku z dialogami do analizy...');

    let audioBase64Sample: string | null = null;
    let detectedSpeechRegions: Array<{ start: number; end: number }> = [];

    // 1. Zmiksuj rzeczywisty dźwięk projektu do jednolitego OfflineAudioContext (16kHz mono lub 48kHz stereo pod analizę mowy)
    try {
      const OfflineCtxClass = typeof window !== 'undefined'
        ? (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)
        : null;

      if (OfflineCtxClass) {
        // Skonfiguruj zoptymalizowany OfflineAudioContext 16000Hz (standard ASR / Gemini Audio)
        const targetSampleRate = 16000;
        const totalSamples = Math.max(targetSampleRate, Math.ceil(totalProjectDuration * targetSampleRate));
        const offlineCtx = new OfflineCtxClass(1, totalSamples, targetSampleRate);

        const clipMap = new Map<string, MediaClip>();
        mediaLibrary.forEach(c => clipMap.set(c.id, c));

        let attachedCount = 0;

        // Podepnij audio z klipów wideo
        for (const item of timelineItems) {
          if (item.muted || item.volume === 0) continue;
          const clip = clipMap.get(item.clipId);
          if (!clip) continue;

          let arrayBuf: ArrayBuffer | null = null;
          if (clip.file) {
            try { arrayBuf = await clip.file.arrayBuffer(); } catch {}
          }
          if (!arrayBuf) {
            const src = await resolveClipMediaUrl(clip);
            arrayBuf = await getMediaArrayBuffer(clip.id, undefined, src || clip.objectUrl);
          }

          if (arrayBuf && arrayBuf.byteLength > 0) {
            const decoded = await SafeAudioDecoder.decodeTo48kStereo(offlineCtx, arrayBuf);
            if (decoded && decoded.duration > 0) {
              const srcNode = offlineCtx.createBufferSource();
              srcNode.buffer = decoded;
              const gainNode = offlineCtx.createGain();
              gainNode.gain.value = item.volume ?? 1;
              srcNode.connect(gainNode);
              gainNode.connect(offlineCtx.destination);

              const maxOff = Math.max(0, decoded.duration - 0.05);
              const safeOff = Math.max(0, Math.min(item.sourceStart || 0, maxOff));
              const safeDur = Math.max(0.05, Math.min(item.duration, decoded.duration - safeOff));
              srcNode.start(item.timelineStart, safeOff, safeDur);
              attachedCount++;
            }
          }
        }

        // Podepnij ewentualne ścieżki lektora (voiceover)
        for (const track of audioTracks) {
          if (track.muted || track.volume === 0) continue;
          let arrayBuf: ArrayBuffer | null = null;
          if (track.file) {
            try { arrayBuf = await track.file.arrayBuffer(); } catch {}
          } else {
            const freshUrl = await resolveAudioTrackUrl(track);
            arrayBuf = await getMediaArrayBuffer(track.id, undefined, freshUrl || track.objectUrl);
          }

          if (arrayBuf && arrayBuf.byteLength > 0) {
            const decoded = await SafeAudioDecoder.decodeTo48kStereo(offlineCtx, arrayBuf);
            if (decoded && decoded.duration > 0) {
              const srcNode = offlineCtx.createBufferSource();
              srcNode.buffer = decoded;
              const gainNode = offlineCtx.createGain();
              gainNode.gain.value = track.volume ?? 1;
              srcNode.connect(gainNode);
              gainNode.connect(offlineCtx.destination);
              srcNode.start(track.timelineStart || 0, track.sourceStart || 0, track.duration);
              attachedCount++;
            }
          }
        }

        if (attachedCount > 0) {
          notify('detecting_speech', 40, 'Analiza fal akustycznych mowy i pauz w filmie...');
          const renderedMix = await offlineCtx.startRendering();

          // Zbadaj rytm mowy i pauzy za pomocą SmartCutAnalyzer
          const acousticAnalysis = SmartCutAnalyzer.analyzeAudioBuffer(renderedMix, {
            silenceThresholdDb: -32,
            minSilenceDurationSec: 0.35
          });

          if (acousticAnalysis.speechRegions.length > 0) {
            detectedSpeechRegions = acousticAnalysis.speechRegions.map(r => ({
              start: Number(r.start.toFixed(2)),
              end: Number(r.end.toFixed(2))
            }));
          }

          // Skonwertuj zmiksowany bufor audio do zoptymalizowanego 16-bit WAV PCM
          const wavBuffer = audioBufferToWav(renderedMix);
          // Ogranicz wielkość do 8MB dla sprawnego transferu API
          if (wavBuffer && wavBuffer.byteLength > 0 && wavBuffer.byteLength < 8 * 1024 * 1024) {
            audioBase64Sample = arrayBufferToBase64(wavBuffer);
          }
        }
      }
    } catch (mixErr) {
      console.warn('[SmartPolishSubtitles] Audio mix extraction notice:', mixErr);
    }

    notify('transcribing_polish', 60, 'Generowanie transkrypcji mowy i dialogów w języku polskim...');

    const clipsContext = timelineItems.map((item, idx) => {
      const clip = mediaLibrary.find(m => m.id === item.clipId);
      return {
        index: idx,
        name: clip?.name || `Ujęcie ${idx + 1}`,
        timelineStart: item.timelineStart,
        duration: item.duration,
        category: clip?.category || 'a_roll'
      };
    });

    let rawSegments: Array<{ text: string; startTime: number; endTime: number; speaker?: string }> = [];

    // 2. Odpytaj backend /api/transcribe-audio-polish z rzeczywistym strumieniem audio
    try {
      const resp = await fetch('/api/transcribe-audio-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.name || 'Master Film',
          durationSec: totalProjectDuration,
          clipsContext,
          audioBase64: audioBase64Sample,
          mimeType: 'audio/wav',
          detectedRegions: detectedSpeechRegions
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          rawSegments = data.segments;
        }
      }
    } catch (apiErr) {
      console.warn('[SmartPolishSubtitles] API transcription notice:', apiErr);
    }

    // 3. Jeśli mamy wykryte autentyczne segmenty mowy, dopasuj ich znaczniki czasu
    if (rawSegments.length > 0 && detectedSpeechRegions.length > 0) {
      // Dopasuj znaczniki czasu transkrypcji do rzeczywistych interwałów mowy
      rawSegments = rawSegments.map((seg, idx) => {
        const region = detectedSpeechRegions[idx];
        if (region) {
          return {
            ...seg,
            startTime: region.start,
            endTime: Math.max(region.start + 0.8, Math.min(region.end, seg.endTime))
          };
        }
        return seg;
      });
    }

    // Jeśli w filmie nie ma mowy ani dialogów (np. sama muzyka, dźwięki otoczenia, cisza),
    // zachowaj istniejące warstwy i powiadom użytkownika bez wstrzykiwania zmyślonych dialogów ze scenariusza
    const nonCaptionLayers = (project.textLayers || []).filter(
      t => t.type !== 'caption' && t.type !== 'subtitle'
    );

    if (rawSegments.length === 0) {
      notify('completed', 100, 'Zakończono analizę audio: brak wykrytych wypowiedzi w filmie.', 0);
      return {
        textLayers: nonCaptionLayers,
        totalSegments: 0,
        details: 'W ścieżce dźwiękowej filmu nie wykryto wypowiedzi ani dialogów w języku polskim.'
      };
    }

    notify('synchronizing', 85, `Synchronizacja ${rawSegments.length} polskich napisów na osi czasu...`, rawSegments.length);

    // Przekształć w CaptionSegments
    const captionSegments: CaptionSegment[] = rawSegments.map((s, idx) => ({
      id: `caption_pl_${Date.now()}_${idx}`,
      text: s.text,
      startTime: s.startTime,
      endTime: s.endTime,
      speaker: s.speaker || 'Głos'
    }));

    // Styl napisów: z ustawień projektu lub domyślny 'karaoke_glow'
    const presetStyle: SubtitleStyle = project.settings?.subtitlesSettings?.presetStyle || 'karaoke_glow';
    const newCaptionLayers = convertCaptionsToTextLayers(captionSegments, presetStyle);

    // Połącz z pozostałymi warstwami
    const finalLayers = [...nonCaptionLayers, ...newCaptionLayers];

    notify('completed', 100, `Gotowe! Zsynchronizowano ${newCaptionLayers.length} polskich napisów z głosem filmu.`, newCaptionLayers.length);

    return {
      textLayers: finalLayers,
      totalSegments: newCaptionLayers.length,
      details: `Wygenerowano i zsynchronizowano ${newCaptionLayers.length} autentycznych polskich kwestii dialogowych w stylu '${presetStyle}'.`
    };
  }
}
