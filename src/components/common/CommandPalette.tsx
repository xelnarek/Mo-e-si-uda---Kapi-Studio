import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Scissors, 
  Play, 
  Pause, 
  Sparkles, 
  Wand2, 
  Film, 
  Zap, 
  Download, 
  Mic, 
  Type, 
  Activity, 
  FolderPlus, 
  Plus, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  HelpCircle,
  Eye,
  Sliders,
  Maximize2,
  HardDrive
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'Montaż' | 'Audio & Automatyzacja' | 'Media & Dysk' | 'Eksport & Jakość' | 'Projekt & Narzędzia';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  });

  // Group commands by category
  const groupedCategories = Array.from(new Set(filteredCommands.map(c => c.category)));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredCommands.length - 1)));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = document.getElementById(`cmd-item-${selectedIndex}`);
    if (el && listRef.current) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndexCounter = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-[#18181c] border border-[#26262b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#26262b] bg-[#141416]">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Wpisz polecenie lub wyszukaj akcję... (np. cięcie, transkrypcja, napisy, eksport, proxy)"
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-[#22222a] border border-[#2e2e36] rounded text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-4">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-1">
              <p className="text-xs">Nie znaleziono poleceń dla "{query}"</p>
              <p className="text-[11px] text-zinc-600">Spróbuj wyszukać inną frazę lub skrót</p>
            </div>
          ) : (
            groupedCategories.map((category) => {
              const categoryCommands = filteredCommands.filter(c => c.category === category);
              return (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {categoryCommands.map((cmd) => {
                      const itemIndex = flatIndexCounter++;
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = cmd.icon;

                      return (
                        <div
                          key={cmd.id}
                          id={`cmd-item-${itemIndex}`}
                          onClick={() => {
                            cmd.action();
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#282830] text-white border border-[#363642] shadow-sm'
                              : 'text-zinc-300 hover:bg-[#202026] hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                              isSelected 
                                ? 'bg-[#22222a] border-[#3a3a48] text-white' 
                                : 'bg-[#1e1e24] border-[#282830] text-zinc-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate flex items-center gap-2">
                                <span>{cmd.title}</span>
                              </div>
                              {cmd.subtitle && (
                                <div className="text-[11px] text-zinc-400 truncate">
                                  {cmd.subtitle}
                                </div>
                              )}
                            </div>
                          </div>

                          {cmd.shortcut && (
                            <kbd className={`px-2 py-0.5 text-[10px] font-mono rounded border shrink-0 ${
                              isSelected
                                ? 'bg-[#1e1e24] border-[#363642] text-amber-400'
                                : 'bg-[#141416] border-[#26262b] text-zinc-400'
                            }`}>
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-[#141416] border-t border-[#26262b] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-3">
            <span><strong className="text-zinc-300">↑↓</strong> Nawiguj</span>
            <span><strong className="text-zinc-300">↵</strong> Wybierz</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-zinc-400">Centrum Szybkich Poleceń</span>
          </div>
        </div>
      </div>
    </div>
  );
}
