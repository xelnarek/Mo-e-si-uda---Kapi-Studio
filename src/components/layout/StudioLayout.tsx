import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, 
  Layout, 
  Download, 
  Save, 
  User as UserIcon, 
  LogOut, 
  Loader2, 
  Cloud,
  Undo2,
  Redo2,
  Sparkles,
  Mic,
  Bookmark,
  BookOpen,
  Keyboard,
  Activity,
  Wand2,
  Check,
  RotateCcw,
  Settings,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit2,
  CheckCircle2,
  Clock,
  Play,
  Menu,
  X,
  Truck,
  Share2,
  Video
} from 'lucide-react';
import { useAuth } from '../../lib/firebase/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { ConfirmModal } from '../common/ConfirmModal';
import { EasterEggModal } from '../common/EasterEggModal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { GoogleDriveIcon } from '../GoogleDriveModal';
import { Cpu, Zap } from 'lucide-react';

function GoogleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function ModernAuthStatus({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const { user, loading, isLoggingIn, login, logout, hasDriveAccess } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
  }
  
  if (!user) {
    return (
      <button 
        onClick={() => login()} 
        disabled={isLoggingIn}
        className={`w-full text-xs font-medium text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-500 rounded-xl px-3 py-2 transition-all flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-start gap-2.5'} cursor-pointer ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
        title="Zaloguj się przez Google (synchronizacja Firestore & Dysk Google)"
      >
        <GoogleIcon className="w-4 h-4 shrink-0" />
        {!isCollapsed && (
          <span className="truncate">{isLoggingIn ? 'Logowanie...' : 'Zaloguj przez Google'}</span>
        )}
      </button>
    );
  }

  return (
    <div className="relative w-full">
      <button 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`w-full flex items-center ${isCollapsed ? 'justify-center p-1.5' : 'justify-between p-2'} rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition-all cursor-pointer text-left`}
        title={`${user.displayName || user.email} • Synchronizacja aktywna`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 relative shrink-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
            {hasDriveAccess && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" title="Dysk Google połączony" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-zinc-200 truncate">{user.displayName || 'Użytkownik'}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          )}
        </div>
      </button>

      {isMenuOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col backdrop-blur-xl animate-fadeIn">
          <div className="px-2 py-2 border-b border-zinc-800/80 mb-1.5">
            <p className="text-xs text-white truncate font-medium">{user.displayName || 'Użytkownik'}</p>
            <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-[10px] text-emerald-400">
              <Cloud className="w-3 h-3 text-amber-400" />
              <span>Dysk Google: {hasDriveAccess ? 'Aktywny' : 'Brak uprawnień'}</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setIsMenuOpen(false);
              login();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors w-full text-left cursor-pointer"
          >
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Odśwież token Dysku</span>
          </button>

          <button 
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }} 
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full text-left mt-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Wyloguj się</span>
          </button>
        </div>
      )}
    </div>
  );
}

interface StudioLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectName: string;
  onProjectNameChange?: (name: string) => void;
  isSaving: boolean;
  onSave: () => void;
  hasUnsavedChanges?: boolean;
  autoSaveStatus?: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string | null;
  secondsUntilAutoSave?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  recoveryAvailable?: boolean;
  onRestoreRecovery?: () => void;
  onDismissRecovery?: () => void;
  onResetProject?: () => void;
  onOpenAiAssistant?: () => void;
  onOpenDirector?: () => void;
  onOpenChronologicalModal?: () => void;
  onOpenNarrativeDirector?: () => void;
  onToggleHealthPanel?: () => void;
  isHealthPanelOpen?: boolean;
  onOpenVoiceRecorder?: () => void;
  onOpenTemplateGallery?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShare?: () => void;
  isDbConnected?: boolean;
}

export function StudioLayout({ 
  children, 
  activeTab, 
  onTabChange, 
  projectName, 
  onProjectNameChange, 
  isSaving, 
  onSave, 
  hasUnsavedChanges = false, 
  autoSaveStatus = 'idle',
  lastSavedAt = null,
  secondsUntilAutoSave = 30,
  canUndo = false, 
  canRedo = false, 
  onUndo, 
  onRedo, 
  recoveryAvailable = false, 
  onRestoreRecovery, 
  onDismissRecovery, 
  onResetProject,
  onOpenAiAssistant, 
  onOpenDirector,
  onOpenChronologicalModal,
  onOpenNarrativeDirector,
  onToggleHealthPanel,
  isHealthPanelOpen = false,
  onOpenVoiceRecorder, 
  onOpenTemplateGallery,
  onOpenCommandPalette,
  onOpenShare,
  isDbConnected = true 
}: StudioLayoutProps) {
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(activeTab === 'montage');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isEasterEggOpen, setIsEasterEggOpen] = useState(false);
  const easterEggClickCountRef = useRef(0);
  const easterEggTimerRef = useRef<any>(null);
  const { isOnline } = useOnlineStatus();
  const { hasDriveAccess, login } = useAuth();

  const handleLogoEasterEggClick = () => {
    easterEggClickCountRef.current += 1;
    if (easterEggTimerRef.current) {
      clearTimeout(easterEggTimerRef.current);
    }
    easterEggTimerRef.current = setTimeout(() => {
      easterEggClickCountRef.current = 0;
    }, 2800);

    if (easterEggClickCountRef.current >= 7) {
      easterEggClickCountRef.current = 0;
      setIsEasterEggOpen(true);
    }
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to collapse/expand sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSidebarCollapsed(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFinishNameEdit = () => {
    setIsEditingName(false);
    if (tempName.trim() && onProjectNameChange) {
      onProjectNameChange(tempName.trim());
    }
  };

  const navItems = [
    { id: 'project', label: 'Projekt', icon: Layout, desc: 'Przegląd i parametry' },
    { id: 'media', label: 'Media', icon: Film, desc: 'Biblioteka 4K i Dysk' },
    { id: 'montage', label: 'Montaż', icon: Film, desc: 'Wielościeżkowa oś czasu' },
    { id: 'export', label: 'Eksport', icon: Download, desc: 'GPU WebCodecs 4K' },
    { id: 'settings', label: 'Ustawienia', icon: Settings, desc: 'Silnik, cache i chmura' },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-screen flex flex-col md:flex-row bg-[#121214] text-[#f4f4f5] relative selection:bg-amber-400 selection:text-black overflow-hidden select-none">
      {/* Desktop Collapsible Sidebar (Hidden on Mobile < 768px - Single source of truth on mobile is Bottom Nav Bar) */}
      <aside 
        className={`hidden md:flex relative z-30 shrink-0 h-screen sticky top-0 flex-col justify-between bg-[#18181c] border-r border-[#26262b] transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header: Logo & Branding */}
        <div className="p-3 border-b border-[#26262b]">
          <div className="flex items-center justify-between">
            <div 
              onClick={handleLogoEasterEggClick}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none group"
              title="Kapi Studio By Piotr (Kliknij 7x aby obudzić kapibary!)"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4 stroke-[2.2]" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-tight text-white font-sans truncate group-hover:text-amber-300 transition-colors">Kapi Studio By Piotr</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#22222a] text-amber-400 border border-[#2e2e36]">PRO</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate font-mono">Studio Postprodukcji 4K</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#22222a] border border-transparent hover:border-[#26262b] transition-colors cursor-pointer"
              title={isSidebarCollapsed ? 'Rozwiń pasek boczny (Ctrl+B)' : 'Zwiń pasek boczny (Ctrl+B)'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          {/* Main workspace section */}
          <div>
            {!isSidebarCollapsed && (
              <span className="px-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Obszar Roboczy
              </span>
            )}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2.5'} rounded-xl transition-all cursor-pointer font-medium text-xs ${
                      isActive 
                        ? 'bg-[#282830] text-white border border-[#363642] shadow-sm font-semibold' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#202026]'
                    }`}
                    title={isSidebarCollapsed ? `${item.label} (${item.desc})` : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Director Tools - Clean unified non-duplicated menu */}
          <div>
            {!isSidebarCollapsed && (
              <span className="px-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 font-mono">
                Narzędzia Montażowe
              </span>
            )}
            <div className="space-y-1">
              {onOpenDirector && (
                <button
                  onClick={onOpenDirector}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer group`}
                  title="Centrum Reżysera & Automatycznego Montażu (Reżyseria, Scalanie, Konsola, Audyt)"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Wand2 className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
                    {!isSidebarCollapsed && <span className="truncate font-medium">Centrum Reżysera</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#22222a] text-amber-400 border border-[#2e2e36]">
                      HUB
                    </span>
                  )}
                </button>
              )}

              {onOpenChronologicalModal && (
                <button
                  onClick={onOpenChronologicalModal}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2'} rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer group`}
                  title="Scalanie Chronologiczne & Podpisy Ujęć"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
                  {!isSidebarCollapsed && <span className="truncate font-medium">Scalanie & Podpisy</span>}
                </button>
              )}

              {onOpenNarrativeDirector && (
                <button
                  onClick={onOpenNarrativeDirector}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2'} rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer group`}
                  title="Struktura Narracyjna & Scenariusz Aktów"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform" />
                  {!isSidebarCollapsed && <span className="truncate font-medium">Narracja & Scenariusz</span>}
                </button>
              )}

              {onOpenTemplateGallery && (
                <button
                  onClick={onOpenTemplateGallery}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2'} rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer group`}
                  title="Galeria Szablonów Projektów (Chmura Firebase)"
                >
                  <Bookmark className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-105 transition-transform" />
                  {!isSidebarCollapsed && <span className="truncate font-medium">Galeria Szablonów</span>}
                </button>
              )}

              {onOpenVoiceRecorder && (
                <button
                  onClick={onOpenVoiceRecorder}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2'} rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-[#202026] transition-colors cursor-pointer group`}
                  title="Nagraj Lektora lub Podkład Audio"
                >
                  <Mic className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform" />
                  {!isSidebarCollapsed && <span className="truncate font-medium">Dyktafon & Lektor</span>}
                </button>
              )}
            </div>
          </div>

          {/* Cloud & Integrations */}
          <div>
            {!isSidebarCollapsed && (
              <span className="px-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5 font-mono">
                Integracje
              </span>
            )}
            <div className="space-y-1">
              <button
                onClick={() => onTabChange('media')}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-2.5 px-3 py-2'} rounded-xl text-xs transition-colors cursor-pointer ${
                  hasDriveAccess 
                    ? 'text-emerald-400 hover:bg-[#202026]' 
                    : 'text-zinc-400 hover:text-white hover:bg-[#202026]'
                }`}
                title="Google Drive: import i eksport wideo"
              >
                <GoogleDriveIcon className="w-4 h-4 shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">Dysk Google</span>
                    <span className={`w-2 h-2 rounded-full ${hasDriveAccess ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`} />
                  </div>
                )}
              </button>

              <button
                onClick={() => onTabChange('settings')}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-start gap-2.5 px-3 py-2'} rounded-xl text-xs transition-colors cursor-pointer text-zinc-400 hover:text-white hover:bg-[#202026]`}
                title="Status bazy Firestore"
              >
                <Cloud className={`w-4 h-4 shrink-0 ${isDbConnected ? 'text-amber-400' : 'text-zinc-600'}`} />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate">Chmura Firestore</span>
                    <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                  </div>
                )}
              </button>
            </div>
          </div>
          {/* Pro WebGL2 GPU Engine Status Badge */}
          {!isSidebarCollapsed ? (
            <div className="p-3 rounded-2xl bg-[#141416] border border-[#26262b] shadow-sm flex items-center gap-3 relative overflow-hidden group">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#22222a] border border-[#2e2e36] flex items-center justify-center text-amber-400">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-zinc-200 truncate font-mono">Pro Video Engine</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                </div>
                <span className="text-[10px] text-zinc-400 block truncate font-mono mt-0.5">WebGL2 • GPU 4K Ready</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Pro Video Engine • GPU 4K Accelerated">
              <div className="w-8 h-8 rounded-xl bg-[#141416] border border-[#26262b] flex items-center justify-center text-amber-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer: User & PWA */}
        <div className="p-3 border-t border-[#26262b] space-y-2">
          <PWAInstallButton isCompact={isSidebarCollapsed} />
          <ModernAuthStatus isCollapsed={isSidebarCollapsed} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-12 min-h-[48px] w-full border-b border-[#26262b] bg-[#18181c] px-2.5 sm:px-4 flex items-center justify-between shrink-0 z-40 gap-1.5 sm:gap-4 select-none pt-safe">
          {/* Left: Kapi Studio By Piotr Logo + Auto-Save Status */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink-0">
            {/* Branding Logo & Title (Responsive: 'Kapi Studio' on mobile < 640px, full name on desktop) */}
            <div 
              onClick={handleLogoEasterEggClick}
              className="flex items-center gap-2 shrink-0 cursor-pointer select-none group"
              title="Kapi Studio By Piotr (Kliknij 7x aby obudzić kapibary!)"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                <Video className="w-4 h-4 text-amber-400 stroke-[2.2]" />
              </div>
              <span className="hidden sm:inline font-bold text-xs tracking-tight text-white font-sans whitespace-nowrap group-hover:text-amber-300 transition-colors">
                Kapi Studio By Piotr
              </span>
              <span className="inline sm:hidden font-bold text-xs tracking-tight text-white font-sans whitespace-nowrap group-hover:text-amber-300 transition-colors">
                Kapi Studio
              </span>
            </div>

            {/* Auto-Saved Status */}
            <div 
              className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 font-mono"
              title={autoSaveStatus === 'saved' ? 'Wszystkie zmiany zapisane w chmurze' : 'Zapisywanie...'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400 text-xs">
                {autoSaveStatus === 'saving' ? 'Zapisywanie...' : 'Zapisano w chmurze'}
              </span>
            </div>

            {/* Desktop Quick Nav Segmented Bar (Linear / Raycast Pro) */}
            <div className="hidden xl:flex items-center bg-[#141416] border border-[#27272a] rounded-lg p-0.5 gap-0.5 ml-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#272730] text-amber-400 font-bold border border-[#363640] shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1a20]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Project Title (Editable with smart max-width constraint) */}
          <div className="flex items-center justify-center min-w-0 flex-1 max-w-[130px] xs:max-w-[170px] sm:max-w-xs md:max-w-md mx-1">
            {isEditingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleFinishNameEdit}
                onKeyDown={(e) => e.key === 'Enter' && handleFinishNameEdit()}
                autoFocus
                className="bg-[#141416] border border-amber-400/60 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none w-full text-center font-medium font-sans"
              />
            ) : (
              <div 
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md hover:bg-[#22222a] cursor-pointer transition-colors max-w-full group"
                title="Kliknij, aby zmienić nazwę projektu"
              >
                <h1 className="text-xs font-medium text-zinc-200 truncate group-hover:text-white transition-colors font-sans">
                  {projectName || 'Nowy Projekt'}
                </h1>
                <Edit2 className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0" />
              </div>
            )}
          </div>

          {/* Right: PWA Install, Shortcut [Cmd+K], Undo/Redo, Export Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct PWA Install / Download App Button */}
            <PWAInstallButton variant="header" />

            {/* Share Applet / Project Button */}
            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#22222a] hover:bg-[#282830] border border-[#2e2e36] hover:border-amber-400/40 rounded-md text-zinc-200 hover:text-white text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                title="Udostępnij aplet lub wyślij projekt (Link, QR, System Share)"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-medium">Udostępnij</span>
              </button>
            )}

            {/* Shortcut Trigger (Cmd+K) */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#22222a] hover:bg-[#282830] border border-[#26262b] rounded-md text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              title="Skróty i paleta poleceń (Cmd+K / Ctrl+K)"
            >
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              <span>⌘K</span>
            </button>

            {/* Undo / Redo */}
            <div className="hidden xs:flex items-center bg-[#22222a] border border-[#26262b] rounded-md p-0.5 gap-0.5">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#282830] disabled:opacity-30 cursor-pointer transition-colors"
                title="Cofnij (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#282830] disabled:opacity-30 cursor-pointer transition-colors"
                title="Ponów (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CapCut Yellow Export Button */}
            <button
              onClick={() => onTabChange('export')}
              className="bg-[#facc15] hover:bg-[#eab308] text-[#121214] font-bold text-xs px-2.5 sm:px-3 py-1 rounded-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 min-h-[30px]"
              title="Wyrenderuj i pobierz plik MP4 (GPU 4K WebCodecs)"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="tracking-tight">Eksport</span>
            </button>
          </div>
        </header>

        {/* Offline notification banner */}
        {!isOnline && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Jesteś offline. Zmiany są bezpiecznie zapisywane w pamięci lokalnej przeglądarki.</span>
            </div>
            <span className="font-mono text-[10px] opacity-80">IndexedDB Cache ON</span>
          </div>
        )}

        {/* Recovery available banner */}
        {recoveryAvailable && onRestoreRecovery && (
          <div className="bg-amber-950/30 border-b border-amber-800/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Wykryto niezapisaną wersję projektu. Czy chcesz ją przywrócić?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRestoreRecovery}
                className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Przywróć
              </button>
              {onDismissRecovery && (
                <button
                  onClick={onDismissRecovery}
                  className="px-2 py-0.5 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
                >
                  Odrzuć
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Work Area - Fluid flex item occupying exact remaining space without collision */}
        <main className="flex-1 min-h-0 w-full overflow-hidden p-0 relative flex flex-col">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Fluid flex bottom bar for Xiaomi Poco F6 & Smartphones with 48px+ touch targets - Zero overlap) */}
        <nav className="md:hidden shrink-0 w-full bg-[#141416]/98 border-t border-[#26262b] backdrop-blur-2xl px-2 py-1 flex items-center justify-around pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.8)] z-40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer min-w-[54px] min-h-[46px] touch-manipulation active:scale-95 ${
                  isActive
                    ? 'text-amber-400 font-bold scale-105'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#282830] text-amber-400 border border-[#383842] shadow-sm' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && onResetProject && (
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          title="Reset Projektu"
          message="Czy na pewno chcesz zresetować bieżący projekt do stanu początkowego? Wszystkie niescalone zmiany zostaną usunięte."
          confirmText="Zresetuj Projekt"
          confirmVariant="danger"
          onConfirm={() => {
            setIsResetConfirmOpen(false);
            onResetProject();
          }}
          onCancel={() => setIsResetConfirmOpen(false)}
        />
      )}

      {/* Secret Capybara Easter Egg Modal (7 clicks on app logo) */}
      <EasterEggModal
        isOpen={isEasterEggOpen}
        onClose={() => setIsEasterEggOpen(false)}
      />
    </div>
  );
}
