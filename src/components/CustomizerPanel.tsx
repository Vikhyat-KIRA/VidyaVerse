'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, RotateCcw, Check } from 'lucide-react';

// ─── Theme Presets ──────────────────────────────────────────────────────────
const PRESETS: Record<string, Record<string, string>> = {
  'Cyberpunk Neon': {
    '--background': '#08090d',
    '--foreground': '#e8eaed',
    '--primary': '#6c63ff',
    '--primary-glow': 'rgba(108, 99, 255, 0.35)',
    '--accent': '#00f0ff',
    '--accent-glow': 'rgba(0, 240, 255, 0.3)',
    '--surface': 'rgba(255, 255, 255, 0.04)',
    '--surface-hover': 'rgba(255, 255, 255, 0.08)',
    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--muted': '#7a7f8a',
  },
  'Aurora Emerald': {
    '--background': '#050d09',
    '--foreground': '#e0f2e9',
    '--primary': '#34d399',
    '--primary-glow': 'rgba(52, 211, 153, 0.35)',
    '--accent': '#06b6d4',
    '--accent-glow': 'rgba(6, 182, 212, 0.3)',
    '--surface': 'rgba(255, 255, 255, 0.04)',
    '--surface-hover': 'rgba(255, 255, 255, 0.08)',
    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--muted': '#6b8f80',
  },
  'Sunset Rose': {
    '--background': '#0d0508',
    '--foreground': '#f2e0e8',
    '--primary': '#f43f5e',
    '--primary-glow': 'rgba(244, 63, 94, 0.35)',
    '--accent': '#f59e0b',
    '--accent-glow': 'rgba(245, 158, 11, 0.3)',
    '--surface': 'rgba(255, 255, 255, 0.04)',
    '--surface-hover': 'rgba(255, 255, 255, 0.08)',
    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--muted': '#8f6b7a',
  },
  'Cyber Amber': {
    '--background': '#0d0b05',
    '--foreground': '#f2efe0',
    '--primary': '#f59e0b',
    '--primary-glow': 'rgba(245, 158, 11, 0.35)',
    '--accent': '#a855f7',
    '--accent-glow': 'rgba(168, 85, 247, 0.3)',
    '--surface': 'rgba(255, 255, 255, 0.04)',
    '--surface-hover': 'rgba(255, 255, 255, 0.08)',
    '--border-color': 'rgba(255, 255, 255, 0.08)',
    '--muted': '#8f876b',
  },
  'Slate Minimal': {
    '--background': '#0f1117',
    '--foreground': '#c9cdd5',
    '--primary': '#64748b',
    '--primary-glow': 'rgba(100, 116, 139, 0.3)',
    '--accent': '#94a3b8',
    '--accent-glow': 'rgba(148, 163, 184, 0.25)',
    '--surface': 'rgba(255, 255, 255, 0.03)',
    '--surface-hover': 'rgba(255, 255, 255, 0.06)',
    '--border-color': 'rgba(255, 255, 255, 0.06)',
    '--muted': '#64748b',
  },
};

const DEFAULT_RADIUS = 16;
const DEFAULT_BLUR = 20;

// ─── Helper: Apply theme object to document ─────────────────────────────────
function applyTheme(vars: Record<string, string>) {
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
}

function saveTheme(vars: Record<string, string>) {
  try {
    localStorage.setItem('vidyaverse-theme', JSON.stringify(vars));
  } catch {
    // quota exceeded – silently ignore
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
interface CustomizerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomizerPanel({ isOpen, onClose }: CustomizerPanelProps) {
  const [activePreset, setActivePreset] = useState('Cyberpunk Neon');
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [blur, setBlur] = useState(DEFAULT_BLUR);
  const [customPrimary, setCustomPrimary] = useState('#6c63ff');
  const [customAccent, setCustomAccent] = useState('#00f0ff');
  const [customBg, setCustomBg] = useState('#08090d');

  // On mount: read existing saved theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vidyaverse-theme');
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        if (parsed['--radius']) setRadius(parseInt(parsed['--radius']));
        if (parsed['--glass-blur']) setBlur(parseInt(parsed['--glass-blur']));
        if (parsed['--primary']) setCustomPrimary(parsed['--primary']);
        if (parsed['--accent']) setCustomAccent(parsed['--accent']);
        if (parsed['--background']) setCustomBg(parsed['--background']);
      }
    } catch {
      // no saved theme
    }
  }, []);

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (!preset) return;
    setActivePreset(name);
    setCustomPrimary(preset['--primary']);
    setCustomAccent(preset['--accent']);
    setCustomBg(preset['--background']);
    const full: Record<string, string> = {
      ...preset,
      '--radius': `${radius}px`,
      '--glass-blur': `${blur}px`,
    };
    applyTheme(full);
    saveTheme(full);
  }, [radius, blur]);

  const applyCustomColors = useCallback(() => {
    // Derive glow from hex
    const hexToRgba = (hex: string, a: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };
    const vars: Record<string, string> = {
      '--primary': customPrimary,
      '--primary-glow': hexToRgba(customPrimary, 0.35),
      '--accent': customAccent,
      '--accent-glow': hexToRgba(customAccent, 0.3),
      '--background': customBg,
      '--radius': `${radius}px`,
      '--glass-blur': `${blur}px`,
    };
    applyTheme(vars);
    saveTheme(vars);
    setActivePreset('');
  }, [customPrimary, customAccent, customBg, radius, blur]);

  const handleRadiusChange = useCallback((val: number) => {
    setRadius(val);
    document.documentElement.style.setProperty('--radius', `${val}px`);
    try {
      const saved = localStorage.getItem('vidyaverse-theme');
      const obj = saved ? JSON.parse(saved) : {};
      obj['--radius'] = `${val}px`;
      localStorage.setItem('vidyaverse-theme', JSON.stringify(obj));
    } catch { /* ignore */ }
  }, []);

  const handleBlurChange = useCallback((val: number) => {
    setBlur(val);
    document.documentElement.style.setProperty('--glass-blur', `${val}px`);
    try {
      const saved = localStorage.getItem('vidyaverse-theme');
      const obj = saved ? JSON.parse(saved) : {};
      obj['--glass-blur'] = `${val}px`;
      localStorage.setItem('vidyaverse-theme', JSON.stringify(obj));
    } catch { /* ignore */ }
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem('vidyaverse-theme');
    setActivePreset('Cyberpunk Neon');
    setRadius(DEFAULT_RADIUS);
    setBlur(DEFAULT_BLUR);
    setCustomPrimary('#6c63ff');
    setCustomAccent('#00f0ff');
    setCustomBg('#08090d');
    // Remove all inline custom properties
    const root = document.documentElement;
    const keysToRemove = ['--background', '--foreground', '--primary', '--primary-glow', '--accent', '--accent-glow',
      '--surface', '--surface-hover', '--border-color', '--muted', '--radius', '--glass-blur', '--glass-opacity'];
    keysToRemove.forEach(k => root.style.removeProperty(k));
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full z-[1000] w-[320px] max-w-[90vw] overflow-y-auto no-scrollbar"
            style={{
              background: 'rgba(12, 13, 18, 0.92)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <Palette size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Customize Theme</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={16} style={{ color: 'var(--muted)' }} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* ── Presets ────────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Theme Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className="relative p-3 rounded-xl text-left transition-all text-xs font-medium"
                      style={{
                        background: activePreset === name ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                        border: activePreset === name ? `1px solid ${preset['--primary']}` : '1px solid rgba(255,255,255,0.06)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: preset['--primary'], boxShadow: `0 0 8px ${preset['--primary-glow']}` }} />
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: preset['--accent'] }} />
                      </div>
                      <span className="leading-tight">{name}</span>
                      {activePreset === name && (
                        <Check size={12} className="absolute top-2 right-2" style={{ color: preset['--primary'] }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Custom Colors ──────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Custom Colors
                </label>
                <div className="space-y-3">
                  {[
                    { label: 'Primary', value: customPrimary, setter: setCustomPrimary },
                    { label: 'Accent', value: customAccent, setter: setCustomAccent },
                    { label: 'Background', value: customBg, setter: setCustomBg },
                  ].map(({ label, value, setter }) => (
                    <div key={label} className="flex items-center gap-3">
                      <label className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer flex-shrink-0" style={{ border: '2px solid rgba(255,255,255,0.12)' }}>
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          style={{ width: '100%', height: '100%' }}
                        />
                        <div className="w-full h-full" style={{ background: value }} />
                      </label>
                      <div className="flex-1">
                        <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{label}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{value}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={applyCustomColors}
                    className="btn-primary w-full text-xs py-2.5"
                  >
                    Apply Custom Colors
                  </button>
                </div>
              </div>

              {/* ── Sliders ───────────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Border Radius
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={28}
                    value={radius}
                    onChange={(e) => handleRadiusChange(Number(e.target.value))}
                    className="flex-1 accent-[var(--primary)]"
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--muted)' }}>{radius}px</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Glass Blur
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={blur}
                    onChange={(e) => handleBlurChange(Number(e.target.value))}
                    className="flex-1 accent-[var(--primary)]"
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--muted)' }}>{blur}px</span>
                </div>
              </div>

              {/* ── Live Preview ──────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Live Preview
                </label>
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>VAYU</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>AI Study Mentor</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg text-xs" style={{ background: 'var(--surface-hover)', color: 'var(--foreground)' }}>
                    Ready to help you conquer today&apos;s study goals! 🚀
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-primary text-[10px] py-1.5 px-3">Send</button>
                    <button className="btn-ghost text-[10px] py-1.5 px-3">Cancel</button>
                  </div>
                </div>
              </div>

              {/* ── Reset ─────────────────────────────────────── */}
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'rgba(255, 77, 106, 0.08)',
                  border: '1px solid rgba(255, 77, 106, 0.2)',
                  color: '#ff4d6a',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                Reset to Default
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
