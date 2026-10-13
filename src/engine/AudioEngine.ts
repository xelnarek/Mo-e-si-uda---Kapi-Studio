/**
 * Kapi-Studio By Piotr - Master Audio Engine
 * Centralized AudioContext management, AudioBufferSourceNode live scheduling,
 * user gesture autoplay unlock (.resume()), and OfflineAudioContext 48kHz stereo mixing.
 */

export interface AudioPlaybackItem {
  id: string;
  buffer: AudioBuffer;
  timelineStartMicroseconds: number;
  sourceStartMicroseconds: number;
  durationMicroseconds: number;
  volume: number; // 0.0 - 1.0
  muted?: boolean;
}

export interface AudioEngineLevels {
  left: number;
  right: number;
  peak: number;
  isClipping: boolean;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserData: Uint8Array | null = null;

  // Active buffer source nodes currently scheduled or playing
  private activeSources: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();

  // Cached decoded AudioBuffers for zero-latency seeking
  private decodedBufferCache: Map<string, AudioBuffer> = new Map();

  private isMuted: boolean = false;
  private masterVolume: number = 1.0;

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  private constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass({ sampleRate: 48000, latencyHint: 'interactive' });
        } catch {
          this.audioCtx = new AudioCtxClass();
        }

        this.masterGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.8;
        this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount);

        this.masterGainNode.connect(this.analyserNode);
        this.analyserNode.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('[AudioEngine] Context initialization note:', e);
    }
  }

  /**
   * Resumes the central AudioContext on user action (Play / Space key) to unblock suspended state
   */
  public async resume(): Promise<void> {
    if (!this.audioCtx) {
      this.initAudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('[AudioEngine] AudioContext resume note:', err);
      }
    }
  }

  public getContext(): AudioContext | null {
    return this.audioCtx;
  }

  /**
   * Sets the global master volume and mute state
   */
  public setMasterVolume(vol: number, muted: boolean = false): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.isMuted = muted;

    if (this.masterGainNode && this.audioCtx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGainNode.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.02);
    }
  }

  /**
   * Stop and destroy all currently active AudioBufferSourceNodes immediately (Pause / Seek)
   */
  public stopAllSources(): void {
    for (const [id, active] of this.activeSources.entries()) {
      try {
        active.source.stop();
        active.source.disconnect();
        active.gain.disconnect();
      } catch {
        // Source might have already stopped
      }
    }
    this.activeSources.clear();
  }

  /**
   * Schedules and connects AudioBufferSourceNodes for active audio items at current playhead position
   */
  public playItemsAtPosition(
    items: AudioPlaybackItem[],
    currentPositionMicroseconds: number
  ): void {
    if (!this.audioCtx || this.isMuted || this.masterVolume === 0) return;

    // First stop all previous sources to avoid duplicate audio playback
    this.stopAllSources();

    const now = this.audioCtx.currentTime;

    for (const item of items) {
      if (item.muted || item.volume === 0 || !item.buffer) continue;

      const itemStart = item.timelineStartMicroseconds;
      const itemDuration = item.durationMicroseconds;
      const itemEnd = itemStart + itemDuration;

      // Check if item overlaps with current playhead
      if (currentPositionMicroseconds >= itemStart && currentPositionMicroseconds < itemEnd) {
        const offsetMicroseconds = currentPositionMicroseconds - itemStart;
        const sourceOffsetSeconds = Math.max(0, (item.sourceStartMicroseconds + offsetMicroseconds) / 1_000_000);
        const remainingDurationSeconds = Math.max(0.02, (itemDuration - offsetMicroseconds) / 1_000_000);

        if (sourceOffsetSeconds >= item.buffer.duration) continue;

        try {
          const sourceNode = this.audioCtx.createBufferSource();
          sourceNode.buffer = item.buffer;

          const gainNode = this.audioCtx.createGain();
          const targetVol = Math.max(0, Math.min(1, item.volume * this.masterVolume));
          gainNode.gain.setValueAtTime(targetVol, now);

          sourceNode.connect(gainNode);
          if (this.masterGainNode) {
            gainNode.connect(this.masterGainNode);
          } else {
            gainNode.connect(this.audioCtx.destination);
          }

          const safeDur = Math.min(remainingDurationSeconds, item.buffer.duration - sourceOffsetSeconds);
          sourceNode.start(now, sourceOffsetSeconds, safeDur);

          this.activeSources.set(item.id, { source: sourceNode, gain: gainNode });

          sourceNode.onended = () => {
            this.activeSources.delete(item.id);
            try {
              sourceNode.disconnect();
              gainNode.disconnect();
            } catch {}
          };
        } catch (err) {
          console.warn('[AudioEngine] Playback scheduling error:', err);
        }
      }
    }
  }

  /**
   * Decodes an ArrayBuffer to a 48kHz stereo AudioBuffer with caching
   */
  public async decodeAudioBuffer(key: string, arrayBuffer: ArrayBuffer): Promise<AudioBuffer | null> {
    if (this.decodedBufferCache.has(key)) {
      return this.decodedBufferCache.get(key)!;
    }

    if (!this.audioCtx) {
      this.initAudioContext();
    }

    if (!this.audioCtx) return null;

    try {
      const decoded = await this.audioCtx.decodeAudioData(arrayBuffer.slice(0));
      this.decodedBufferCache.set(key, decoded);
      return decoded;
    } catch (err) {
      console.warn('[AudioEngine] decodeAudioData note:', err);
      return null;
    }
  }

  /**
   * Real-time stereo metering data from AnalyserNode
   */
  public getLevels(): AudioEngineLevels {
    if (!this.analyserNode || !this.analyserData || this.isMuted) {
      return { left: 0, right: 0, peak: 0, isClipping: false };
    }

    this.analyserNode.getByteTimeDomainData(this.analyserData as any);
    let sum = 0;
    let peak = 0;

    for (let i = 0; i < this.analyserData.length; i++) {
      const val = (this.analyserData[i] - 128) / 128;
      const absVal = Math.abs(val);
      sum += val * val;
      if (absVal > peak) peak = absVal;
    }

    const rms = Math.sqrt(sum / this.analyserData.length);
    const normalizedRms = Math.min(1.0, rms * 2.8);
    const normalizedPeak = Math.min(1.0, peak * 1.5);

    return {
      left: normalizedRms,
      right: normalizedRms * 0.95,
      peak: normalizedPeak,
      isClipping: peak >= 0.98
    };
  }

  /**
   * Offline Audio Mix: Renders the entire project audio timeline to a single 48kHz stereo AudioBuffer
   */
  public static async renderOfflineMix(
    items: AudioPlaybackItem[],
    totalDurationMicroseconds: number
  ): Promise<AudioBuffer | null> {
    const OfflineCtx = typeof window !== 'undefined'
      ? (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)
      : null;

    if (!OfflineCtx) return null;

    const sampleRate = 48000;
    const durationSeconds = Math.max(0.5, totalDurationMicroseconds / 1_000_000);
    const totalFrames = Math.ceil(durationSeconds * sampleRate);

    const offlineCtx = new OfflineCtx(2, totalFrames, sampleRate);

    for (const item of items) {
      if (item.muted || item.volume === 0 || !item.buffer) continue;

      const startSeconds = item.timelineStartMicroseconds / 1_000_000;
      const sourceOffset = item.sourceStartMicroseconds / 1_000_000;
      const duration = item.durationMicroseconds / 1_000_000;

      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = item.buffer;

      const gainNode = offlineCtx.createGain();
      gainNode.gain.setValueAtTime(item.volume, 0);

      sourceNode.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      const safeDur = Math.min(duration, item.buffer.duration - sourceOffset);
      if (safeDur > 0) {
        sourceNode.start(startSeconds, sourceOffset, safeDur);
      }
    }

    return await offlineCtx.startRendering();
  }
}

export const audioEngine = AudioEngine.getInstance();
