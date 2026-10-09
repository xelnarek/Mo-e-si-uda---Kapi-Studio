import React, { useEffect, useState, useRef } from 'react';
import { 
  Sparkles, 
  Trophy, 
  Heart, 
  Film, 
  Clapperboard, 
  RefreshCw, 
  X, 
  Award,
  Volume2,
  VolumeX,
  Coffee,
  Sliders,
  Play,
  RotateCcw
} from 'lucide-react';

interface EasterEggModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FloatingFruit {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export const EasterEggModal: React.FC<EasterEggModalProps> = ({ isOpen, onClose }) => {
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [funMessageIndex, setFunMessageIndex] = useState(0);
  const [chillLevel, setChillLevel] = useState(100);
  const [fruitsFed, setFruitsFed] = useState(0);
  const [floatingFruits, setFloatingFruits] = useState<FloatingFruit[]>([]);
  const [isPlayingLofi, setIsPlayingLofi] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lofiIntervalRef = useRef<number | null>(null);

  const funQuotes = [
    "„Spokojnie, kapibary zmontują to w 4K bez straty ani jednej klatki!”",
    "„Renderowanie na pełnym chillu: zero stresu, 60 klatek na sekundę i yuzu na głowie.”",
    "„Główny reżyser Kapibara Janusz zatwierdził cięcia na osi czasu. Dał ocenę 10/10.”",
    "„Zasada numer 1 w Kapi Studio: jeśli klatka gubi rytm, dodaj 12 klatek cross-fade i napij się herbaty.”",
    "„Akceleracja kapibaryczna GPU: 0 wycieków pamięci, 100% harmonii z czasem trwania projektu.”",
    "„Reżyser montażu Kapibara Piotr uważa, że ten klip zasługuje na Złotą Palmę w Cannes!”"
  ];

  // Play a soft cute chime when feeding fruit
  const playCuteChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.38);
      });
    } catch {
      // Audio might be blocked by browser policy, ignore gracefully
    }
  };

  // Toggle Lo-Fi chill beat synth
  const toggleLofiBeat = () => {
    if (isPlayingLofi) {
      if (lofiIntervalRef.current) {
        clearInterval(lofiIntervalRef.current);
        lofiIntervalRef.current = null;
      }
      setIsPlayingLofi(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      setIsPlayingLofi(true);
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23]  // G7
      ];
      let step = 0;

      const playChord = () => {
        const chord = chords[step % chords.length];
        step++;
        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 1.25);
        });
      };

      playChord();
      lofiIntervalRef.current = window.setInterval(playChord, 1300);
    } catch {
      setIsPlayingLofi(false);
    }
  };

  const feedCapybara = () => {
    playCuteChime();
    setFruitsFed(prev => prev + 1);
    setChillLevel(prev => Math.min(prev + 100, 9999));
    setSecondsRemaining(prev => Math.min(prev + 3, 30));

    // Add floating fruit
    const fruits = ['🍊', '🍉', '✨', '🍋', '🍵', '🦫', '🍿'];
    const randomFruit = fruits[Math.floor(Math.random() * fruits.length)];
    const newFruit: FloatingFruit = {
      id: Date.now() + Math.random(),
      x: 30 + Math.random() * 40,
      y: 60 + Math.random() * 20,
      emoji: randomFruit
    };
    setFloatingFruits(prev => [...prev.slice(-12), newFruit]);
  };

  useEffect(() => {
    if (!isOpen) {
      if (lofiIntervalRef.current) {
        clearInterval(lofiIntervalRef.current);
        lofiIntervalRef.current = null;
      }
      setIsPlayingLofi(false);
      return;
    }

    setSecondsRemaining(10);
    setFunMessageIndex(Math.floor(Math.random() * funQuotes.length));
    setChillLevel(100);
    setFruitsFed(0);
    setFloatingFruits([]);

    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (lofiIntervalRef.current) {
        clearInterval(lofiIntervalRef.current);
        lofiIntervalRef.current = null;
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-fadeIn select-none overflow-y-auto">
      {/* Dynamic Ambient Glow Behind Modal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Floating animated ambient icons */}
        <div className="absolute top-12 left-10 text-3xl opacity-60 animate-bounce" style={{ animationDuration: '3.2s' }}>
          🦫✨
        </div>
        <div className="absolute bottom-16 right-12 text-4xl opacity-60 animate-bounce" style={{ animationDuration: '2.8s' }}>
          🎬🦫
        </div>
        <div className="absolute top-20 right-20 text-3xl opacity-50 animate-pulse">
          🍊🍵
        </div>
      </div>

      {/* Main Glass Dialog */}
      <div className="relative w-full max-w-xl glass-panel border border-amber-400/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(250,204,21,0.22)] text-center overflow-hidden my-auto">
        {/* Top gold aura light beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5 hover:border-white/15"
          title="Zamknij (lub poczekaj na samoczynne zamknięcie)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>7-Krotny Klik: Studio Kapibar Odblokowane!</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2 font-sans">
          <span>Kapi Studio By Piotr</span>
          <span className="text-amber-400">★</span>
          <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-teal-300 bg-clip-text text-transparent">
            Ekipa Kapibar
          </span>
        </h2>

        <p className="text-xs text-zinc-300 mt-1.5 max-w-md mx-auto leading-relaxed">
          Odkryłeś tajny poziom! W tym momencie zespół kapibar-montażystów kalibruje kolory LUT, czyści bufor VRAM i serwuje yuzu w 4K.
        </p>

        {/* Capybara Studio Control Room Stage */}
        <div className="my-4 p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 relative overflow-hidden flex flex-col items-center justify-center gap-3 shadow-inner">
          
          {/* Animated Studio Characters */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full py-2">
            
            {/* 1. Kapibara Dźwiękowiec */}
            <div className="flex flex-col items-center p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 transition-transform hover:scale-105">
              <div className="relative text-4xl sm:text-5xl animate-bounce" style={{ animationDuration: '1.9s' }}>
                <span>🦫</span>
                <span className="absolute -top-1 -right-1 text-base">🎧</span>
              </div>
              <span className="text-[11px] font-bold text-teal-400 mt-2 font-mono">Dźwiękowiec</span>
              <span className="text-[9px] text-zinc-400">Mastering 48kHz</span>
              
              {/* Mini animated VU meter */}
              <div className="flex items-end gap-0.5 h-3 mt-1.5">
                {[60, 90, 40, 100, 75].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-teal-400 rounded-full animate-pulse"
                    style={{ height: `${h}%`, animationDuration: `${0.4 + i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>

            {/* 2. Główny Reżyser (Z pomarańczą i beretem) */}
            <div className="flex flex-col items-center p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 transition-transform hover:scale-105 relative">
              <div className="absolute -top-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-zinc-950 text-[8px] font-extrabold uppercase font-mono">
                CHIEF PRO
              </div>
              <div className="relative text-4xl sm:text-5xl animate-bounce" style={{ animationDuration: '2.3s' }}>
                <span>🦫</span>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-sm">🍊</span>
              </div>
              <span className="text-[11px] font-bold text-amber-300 mt-2 font-mono">Reżyser Piotr</span>
              <span className="text-[9px] text-zinc-400">Cięcia & Wizja</span>
              
              {/* Clapperboard icon */}
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono mt-1.5">
                <Clapperboard className="w-3 h-3" />
                <span>Akcja!</span>
              </div>
            </div>

            {/* 3. Kapibara Render GPU */}
            <div className="flex flex-col items-center p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 transition-transform hover:scale-105">
              <div className="relative text-4xl sm:text-5xl animate-bounce" style={{ animationDuration: '2.1s' }}>
                <span>🦫</span>
                <span className="absolute -bottom-1 -right-1 text-base">💻</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 mt-2 font-mono">Silnik WebCodecs</span>
              <span className="text-[9px] text-zinc-400">Zero drop frames</span>
              
              {/* Status badge */}
              <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono mt-1.5 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span>60.0 FPS</span>
              </div>
            </div>

          </div>

          {/* Random Capybara Joke Quote */}
          <div className="p-3 rounded-xl bg-black/60 border border-zinc-800/70 w-full">
            <p className="text-xs sm:text-sm font-medium text-amber-200/95 italic">
              {funQuotes[funMessageIndex]}
            </p>
          </div>

          {/* Interactive Easter Egg Fun Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full">
            
            {/* Feed Fruit Button */}
            <button
              onClick={feedCapybara}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <span>🍊 Nakarm Yuzu ({fruitsFed})</span>
            </button>

            {/* Play Lo-Fi beat */}
            <button
              onClick={toggleLofiBeat}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95 border ${
                isPlayingLofi 
                  ? 'bg-teal-500/25 text-teal-300 border-teal-500/50 shadow-[0_0_12px_rgba(20,184,166,0.3)]' 
                  : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/80 hover:bg-zinc-800'
              }`}
            >
              {isPlayingLofi ? <Volume2 className="w-3.5 h-3.5 text-teal-300 animate-pulse" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingLofi ? 'Graj Lo-Fi Chill' : 'Włącz Chill Beat'}</span>
            </button>

            {/* Chill level metric */}
            <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Chillout: <b className="text-emerald-400">{chillLevel}%</b></span>
            </div>

          </div>

          {/* Floating fruits on feed */}
          {floatingFruits.map(fruit => (
            <div
              key={fruit.id}
              className="absolute pointer-events-none text-2xl animate-bounce"
              style={{
                left: `${fruit.x}%`,
                top: `${fruit.y}%`,
                animationDuration: '1s'
              }}
            >
              {fruit.emoji}
            </div>
          ))}

        </div>

        {/* Auto-Dismiss Countdown Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
            <span>Powrót do montażu za:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSecondsRemaining(prev => prev + 10)}
                className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                +10s chillu
              </button>
              <span className="font-bold text-amber-400 text-xs">{secondsRemaining}s</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-teal-400 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${Math.min((secondsRemaining / 10) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl btn-primary text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Dzięki, wracam montować film! 🎬🦫</span>
          </button>
        </div>

      </div>
    </div>
  );
};
