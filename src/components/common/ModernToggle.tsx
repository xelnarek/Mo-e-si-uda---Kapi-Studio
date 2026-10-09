import React from 'react';

interface ModernToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: 'amber' | 'emerald' | 'cyan' | 'indigo' | 'teal';
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
  badge?: string;
  className?: string;
}

export const ModernToggle: React.FC<ModernToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  size = 'md',
  activeColor = 'amber',
  iconOn,
  iconOff,
  badge,
  className = ''
}) => {
  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
  };

  // Color mapping
  const activeColorClasses = {
    amber: 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_14px_rgba(250,204,21,0.4)] border-amber-300/40',
    emerald: 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_14px_rgba(52,211,153,0.4)] border-emerald-300/40',
    cyan: 'bg-gradient-to-r from-cyan-400 to-teal-400 shadow-[0_0_14px_rgba(34,211,238,0.4)] border-cyan-300/40',
    indigo: 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_14px_rgba(99,102,241,0.4)] border-indigo-300/40',
    teal: 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_14px_rgba(20,184,166,0.4)] border-teal-300/40'
  }[activeColor];

  // Size mapping
  const trackSizes = {
    sm: 'w-9 h-5',
    md: 'w-12 h-6.5',
    lg: 'w-14 h-7.5'
  }[size];

  const thumbSizes = {
    sm: 'w-4 h-4',
    md: 'w-5.5 h-5.5',
    lg: 'w-6.5 h-6.5'
  }[size];

  const thumbTranslate = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-5.5' : 'translate-x-0.5',
    lg: checked ? 'translate-x-6.5' : 'translate-x-0.5'
  }[size];

  return (
    <div 
      className={`group flex items-start justify-between gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={handleClick}
    >
      {(label || description) && (
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            {typeof label === 'string' ? (
              <span className="text-xs sm:text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                {label}
              </span>
            ) : (
              label
            )}
            {badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] sm:text-xs text-zinc-400 group-hover:text-zinc-300 leading-relaxed mt-0.5 transition-colors">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Switch Track */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative inline-flex shrink-0 items-center rounded-full border transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${trackSizes} ${
          checked 
            ? activeColorClasses 
            : 'bg-[#18181e] border-zinc-700/80 hover:border-zinc-600'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {/* Sliding Thumb */}
        <span
          className={`inline-block transform rounded-full bg-white shadow-md transition-all duration-300 ease-out flex items-center justify-center ${thumbSizes} ${thumbTranslate}`}
        >
          {checked && iconOn && (
            <span className="text-[9px] text-zinc-900 flex items-center justify-center font-bold">
              {iconOn}
            </span>
          )}
          {!checked && iconOff && (
            <span className="text-[9px] text-zinc-500 flex items-center justify-center">
              {iconOff}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};
