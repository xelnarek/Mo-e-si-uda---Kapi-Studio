/**
 * FrameAccurateSeekCache.ts
 * 
 * High-performance LRU Frame-Accurate Seeking & Scrubbing Buffer.
 * Caches extracted video frames as ImageBitmap / Canvas objects around the playhead (+/- 3 seconds)
 * to provide 0ms instant, flicker-free feedback during scrubbing on timeline (PC & Mobile).
 */

export interface CachedFrame {
  bitmap: ImageBitmap | HTMLCanvasElement;
  timeSec: number;
  width: number;
  height: number;
  timestamp: number; // Date.now() for LRU
}

class FrameAccurateSeekCache {
  private cache = new Map<string, CachedFrame[]>(); // Key: clipId -> sorted array of frames
  private lastValidFrameMap = new Map<string, HTMLCanvasElement>(); // Key: clipId -> canvas of last valid frame
  private maxFramesPerClip = 60; // Max ~60 frames per clip in active buffer
  private activePreloadControllers = new Map<string, AbortController>();
  private globalFrameCount = 0;
  private maxGlobalFrames = 250; // Memory budget safeguard (~40-80MB RAM)

  /**
   * Generates a key for a given clip time bucketed by 100ms precision
   */
  private getTimeKey(timeSec: number): number {
    return Math.round(timeSec * 10) / 10; // 0.1s precision
  }

  /**
   * Stores a frame bitmap or canvas for a specific clip and timestamp
   */
  public storeFrame(clipId: string, timeSec: number, source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): boolean {
    if (!clipId || !source) return false;

    try {
      let canvasOrBitmap: HTMLCanvasElement | ImageBitmap;

      if (source instanceof HTMLVideoElement) {
        if (source.videoWidth === 0 || source.videoHeight === 0 || source.readyState < 2) return false;
        
        // Render video frame to scratch canvas or create ImageBitmap if supported
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1280, source.videoWidth); // High-performance 720p/1080p proxy size
        canvas.height = Math.round((canvas.width / source.videoWidth) * source.videoHeight);
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
        if (!ctx) return false;
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvasOrBitmap = canvas;

        // Also update lastValidFrame canvas
        this.updateLastValidFrame(clipId, canvas);
      } else if (source instanceof HTMLCanvasElement) {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) ctx.drawImage(source, 0, 0);
        canvasOrBitmap = canvas;
        this.updateLastValidFrame(clipId, canvas);
      } else {
        canvasOrBitmap = source;
      }

      const bucketTime = this.getTimeKey(timeSec);
      let clipFrames = this.cache.get(clipId);
      if (!clipFrames) {
        clipFrames = [];
        this.cache.set(clipId, clipFrames);
      }

      // Check if frame already exists at this timestamp bucket
      const existingIdx = clipFrames.findIndex(f => Math.abs(f.timeSec - bucketTime) < 0.08);
      if (existingIdx !== -1) {
        // Replace old frame
        const old = clipFrames[existingIdx];
        if ('close' in old.bitmap && typeof old.bitmap.close === 'function') {
          try { old.bitmap.close(); } catch {}
        }
        clipFrames[existingIdx] = {
          bitmap: canvasOrBitmap,
          timeSec: bucketTime,
          width: canvasOrBitmap.width,
          height: canvasOrBitmap.height,
          timestamp: Date.now()
        };
      } else {
        // Enforce max frames per clip budget
        if (clipFrames.length >= this.maxFramesPerClip) {
          const evicted = clipFrames.shift();
          if (evicted && 'close' in evicted.bitmap && typeof evicted.bitmap.close === 'function') {
            try { evicted.bitmap.close(); } catch {}
          }
          this.globalFrameCount--;
        }

        clipFrames.push({
          bitmap: canvasOrBitmap,
          timeSec: bucketTime,
          width: canvasOrBitmap.width,
          height: canvasOrBitmap.height,
          timestamp: Date.now()
        });
        clipFrames.sort((a, b) => a.timeSec - b.timeSec);
        this.globalFrameCount++;
      }

      // Evict global LRU if exceeding memory bounds
      this.evictGlobalLRU();
      return true;
    } catch (err) {
      console.warn('[FrameAccurateSeekCache] Error storing frame:', err);
      return false;
    }
  }

  /**
   * Retrieves the closest cached frame within maxToleranceSec (default 0.25s)
   */
  public getClosestFrame(clipId: string, timeSec: number, maxToleranceSec = 0.35): CachedFrame | null {
    const clipFrames = this.cache.get(clipId);
    if (!clipFrames || clipFrames.length === 0) return null;

    let closest: CachedFrame | null = null;
    let minDiff = Infinity;

    for (const frame of clipFrames) {
      const diff = Math.abs(frame.timeSec - timeSec);
      if (diff < minDiff && diff <= maxToleranceSec) {
        minDiff = diff;
        closest = frame;
      }
    }

    if (closest) {
      closest.timestamp = Date.now(); // Touch LRU
    }

    return closest;
  }

  /**
   * Updates last valid frame canvas for seamless fallback
   */
  public updateLastValidFrame(clipId: string, canvas: HTMLCanvasElement): void {
    let lastCanvas = this.lastValidFrameMap.get(clipId);
    if (!lastCanvas) {
      lastCanvas = document.createElement('canvas');
      this.lastValidFrameMap.set(clipId, lastCanvas);
    }
    if (lastCanvas.width !== canvas.width || lastCanvas.height !== canvas.height) {
      lastCanvas.width = canvas.width;
      lastCanvas.height = canvas.height;
    }
    const ctx = lastCanvas.getContext('2d', { alpha: false });
    if (ctx) {
      try { ctx.drawImage(canvas, 0, 0); } catch {}
    }
  }

  /**
   * Returns last valid frame canvas for fallback when no frame is seeking
   */
  public getLastValidFrame(clipId: string): HTMLCanvasElement | null {
    return this.lastValidFrameMap.get(clipId) || null;
  }

  /**
   * Draw cached frame or last valid frame onto target context
   */
  public drawFrameToContext(
    ctx: CanvasRenderingContext2D,
    clipId: string,
    timeSec: number,
    targetWidth: number,
    targetHeight: number,
    fitMode: 'fit' | 'fill' = 'fit'
  ): boolean {
    const cached = this.getClosestFrame(clipId, timeSec, 0.4);
    let drawable: ImageBitmap | HTMLCanvasElement | null = cached ? cached.bitmap : null;

    if (!drawable) {
      drawable = this.getLastValidFrame(clipId);
    }

    if (!drawable) return false;

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const srcW = drawable.width;
    const srcH = drawable.height;

    let drawW = targetWidth;
    let drawH = targetHeight;
    let drawX = 0;
    let drawY = 0;

    const targetRatio = targetWidth / targetHeight;
    const srcRatio = srcW / srcH;

    if (fitMode === 'fit') {
      if (srcRatio > targetRatio) {
        drawW = targetWidth;
        drawH = targetWidth / srcRatio;
        drawY = (targetHeight - drawH) / 2;
      } else {
        drawH = targetHeight;
        drawW = targetHeight * srcRatio;
        drawX = (targetWidth - drawW) / 2;
      }
    } else {
      if (srcRatio > targetRatio) {
        drawH = targetHeight;
        drawW = targetHeight * srcRatio;
        drawX = (targetWidth - drawW) / 2;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / srcRatio;
        drawY = (targetHeight - drawH) / 2;
      }
    }

    try {
      ctx.drawImage(drawable, drawX, drawY, drawW, drawH);
      ctx.restore();
      return true;
    } catch {
      ctx.restore();
      return false;
    }
  }

  /**
   * Evicts global LRU frames if global count exceeds maxGlobalFrames
   */
  private evictGlobalLRU(): void {
    if (this.globalFrameCount <= this.maxGlobalFrames) return;

    let allFrames: { clipId: string; frame: CachedFrame }[] = [];
    this.cache.forEach((frames, clipId) => {
      frames.forEach(frame => allFrames.push({ clipId, frame }));
    });

    allFrames.sort((a, b) => a.frame.timestamp - b.frame.timestamp); // Oldest first

    const toRemove = this.globalFrameCount - this.maxGlobalFrames;
    for (let i = 0; i < toRemove && i < allFrames.length; i++) {
      const item = allFrames[i];
      const clipFrames = this.cache.get(item.clipId);
      if (clipFrames) {
        const idx = clipFrames.indexOf(item.frame);
        if (idx !== -1) {
          const removed = clipFrames.splice(idx, 1)[0];
          if (removed && 'close' in removed.bitmap && typeof removed.bitmap.close === 'function') {
            try { removed.bitmap.close(); } catch {}
          }
          this.globalFrameCount--;
        }
      }
    }
  }

  /**
   * Clears all cached frames and frees memory
   */
  public clear(): void {
    this.activePreloadControllers.forEach(ctl => ctl.abort());
    this.activePreloadControllers.clear();

    this.cache.forEach(frames => {
      frames.forEach(f => {
        if ('close' in f.bitmap && typeof f.bitmap.close === 'function') {
          try { f.bitmap.close(); } catch {}
        }
      });
    });

    this.cache.clear();
    this.lastValidFrameMap.clear();
    this.globalFrameCount = 0;
  }
}

export const frameAccurateSeekCache = new FrameAccurateSeekCache();
