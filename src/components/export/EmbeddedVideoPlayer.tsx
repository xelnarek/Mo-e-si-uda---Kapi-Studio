import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Film, 
  Sparkles,
  Settings,
  Check
} from 'lucide-react';

export interface EmbeddedVideoPlayerProps {
  url: string;
  fileName?: string;
  aspectRatio?: string;
  resolutionLabel?: string;
  fpsLabel?: string;
  durationSec?: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const EmbeddedVideoPlayer: React.FC<EmbeddedVideoPlayerProps> = ({
  url,
  fileName,
  aspectRatio = '16/9',
  resolutionLabel,
  fpsLabel,
  durationSec,
  onPlayStateChange,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const hideTimeoutRef = useRef<number | null>(null);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = useCallback((timeInSec: number) => {
    if (!Number.isFinite(timeInSec) || timeInSec < 0) return '00:00';
    const totalSeconds = Math.floor(timeInSec);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    if (isPlaying) {
      hideTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
        setShowRateMenu(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Sync isPlaying with parent
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying);
    }
  }, [isPlaying, onPlayStateChange]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('[EmbeddedVideoPlayer] Playback was prevented:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || isSeeking) return;
    setCurrentTime(videoRef.current.currentTime);
  }, [isSeeking]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const vidDuration = videoRef.current.duration;
    if (Number.isFinite(vidDuration) && vidDuration > 0) {
      setDuration(vidDuration);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  }, []);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsSeeking(false);
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowRateMenu(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('[EmbeddedVideoPlayer] Fullscreen toggle error:', err);
    }
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setShowRateMenu(false);
      }}
      className={`glass-card rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950/80 shadow-2xl relative group select-none flex flex-col ${className}`}
    >
      {/* Top Header Bar inside the Player Card */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950/70 border-b border-zinc-800/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <Film className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
          <span className="text-xs font-semibold text-zinc-200 truncate font-sans" title={fileName}>
            {fileName || 'Gotowy film zmontowany'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 shrink-0">
          {resolutionLabel && <span>{resolutionLabel}</span>}
          {resolutionLabel && fpsLabel && <span>·</span>}
          {fpsLabel && <span>{fpsLabel}</span>}
          <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 font-semibold ml-1">
            <Sparkles className="w-3 h-3 text-[#facc15]" />
            Master Pro
          </span>
        </div>
      </div>

      {/* Video Viewport Stage */}
      <div 
        onClick={togglePlay}
        className="relative w-full aspect-video bg-black flex items-center justify-center cursor-pointer overflow-hidden group"
      >
        <video
          ref={videoRef}
          src={url}
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
        />

        {/* Center Big Play Button (shows ONLY when video is paused) */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 opacity-100 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-16 h-16 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/25 text-[#facc15] hover:text-white hover:bg-zinc-900 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all pointer-events-auto cursor-pointer"
              aria-label="Odtwórz film (Spacja)"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Embedded HUD Controls Bar */}
      <div 
        className={`bg-zinc-950/90 border-t border-zinc-800/60 backdrop-blur-xl p-3 sm:p-4 flex flex-col gap-2.5 transition-opacity duration-200 z-20 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber / Progress Bar */}
        <div className="relative w-full flex items-center group/scrub py-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekEnd}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer focus:outline-none accent-[#facc15] hover:h-2 transition-all relative z-10"
            style={{
              background: `linear-gradient(to right, #facc15 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`
            }}
          />
        </div>

        {/* Lower Controls Row */}
        <div className="flex items-center justify-between gap-3 text-zinc-300">
          {/* Left: Play/Pause, Rewind, Timecode */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isPlaying ? 'Pauza' : 'Graj'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Przewiń do początku"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Timecode in Inter Font (tabular-nums) */}
            <div className="font-mono text-xs text-zinc-300 font-semibold tabular-nums tracking-tight">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1">/</span>
              <span className="text-zinc-400">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume, Playback Speed, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Volume control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isMuted ? 'Wyłącz wyciszenie' : 'Wycisz'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#facc15] hidden sm:block"
              />
            </div>

            {/* Playback speed menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRateMenu(!showRateMenu)}
                className="px-2 py-1 rounded-lg hover:bg-zinc-800/80 text-xs font-mono font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Prędkość odtwarzania"
              >
                <span>{playbackRate}x</span>
              </button>

              {showRateMenu && (
                <div className="absolute bottom-full right-0 mb-2 py-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-30 min-w-[80px]">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changePlaybackRate(rate)}
                      className={`w-full px-3 py-1 text-left text-xs font-mono flex items-center justify-between hover:bg-zinc-800 cursor-pointer ${
                        playbackRate === rate ? 'text-[#facc15] font-bold' : 'text-zinc-300'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3 h-3 ml-2 text-[#facc15]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg hover:bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
