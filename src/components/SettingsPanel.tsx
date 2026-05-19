'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, School, Target, BookOpen, GraduationCap, Save, Check, Palette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserProfile, updateFullProfile } from '@/lib/firebase';
import { syncProfileToSheet } from '@/actions/sheets';

interface SettingsPanelProps {
  userUid: string;
}

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

export default function SettingsPanel({ userUid }: SettingsPanelProps) {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [board, setBoard] = useState('');
  const [school, setSchool] = useState('');
  const [aim, setAim] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme customizer state
  const [themeOpen, setThemeOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('Cyberpunk Neon');
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [blur, setBlur] = useState(DEFAULT_BLUR);
  const [customPrimary, setCustomPrimary] = useState('#6c63ff');
  const [customAccent, setCustomAccent] = useState('#00f0ff');
  const [customBg, setCustomBg] = useState('#08090d');

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  // Load saved theme on mount
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

  const loadProfile = async () => {
    setLoading(true);
    const user = await getUserProfile(userUid);
    if (user) {
      setName(user.name);
      setStudentClass(user.class);
      setBoard(user.board);
      setSchool(user.school);
      setAim(user.aim);
      setEmail(user.email);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Update Firestore
    await updateFullProfile(userUid, {
      name,
      class: studentClass,
      board,
      school,
      aim,
    });
    // Sync to Google Sheets
    await syncProfileToSheet({
      uid: userUid,
      name,
      email,
      class: studentClass,
      board,
      school,
      aim,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ─── Theme functions ───────────────────────────────────────────────────────
  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESETS[presetName];
    if (!preset) return;
    setActivePreset(presetName);
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
      const savedTheme = localStorage.getItem('vidyaverse-theme');
      const obj = savedTheme ? JSON.parse(savedTheme) : {};
      obj['--radius'] = `${val}px`;
      localStorage.setItem('vidyaverse-theme', JSON.stringify(obj));
    } catch { /* ignore */ }
  }, []);

  const handleBlurChange = useCallback((val: number) => {
    setBlur(val);
    document.documentElement.style.setProperty('--glass-blur', `${val}px`);
    try {
      const savedTheme = localStorage.getItem('vidyaverse-theme');
      const obj = savedTheme ? JSON.parse(savedTheme) : {};
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
    const root = document.documentElement;
    const keysToRemove = ['--background', '--foreground', '--primary', '--primary-glow', '--accent', '--accent-glow',
      '--surface', '--surface-hover', '--border-color', '--muted', '--radius', '--glass-blur', '--glass-opacity'];
    keysToRemove.forEach(k => root.style.removeProperty(k));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin-slow w-8 h-8 rounded-full" style={{ border: '2px solid var(--border-color)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(108, 99, 255, 0.1)' }}>
          <User size={20} style={{ color: '#6c63ff' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Profile Settings</h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Update your info — VAYU adapts to changes</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Email</label>
          <input className="input-glass opacity-60" value={email} disabled />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Class</label>
            <div className="relative">
              <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <select className="input-glass !pl-10 appearance-none" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
                {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Board</label>
            <div className="relative">
              <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <select className="input-glass !pl-10 appearance-none" value={board} onChange={e => setBoard(e.target.value)}>
                {['CBSE', 'ICSE', 'State Board', 'IB', 'Other'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>School</label>
          <div className="relative">
            <School size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={school} onChange={e => setSchool(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Life Aim / Goal</label>
          <div className="relative">
            <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={aim} onChange={e => setAim(e.target.value)} placeholder="e.g., IIT Engineer, Doctor..." />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            💡 VAYU uses this to personalize every interaction
          </p>
        </div>

        {/* Save Profile Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{
            background: saved
              ? 'linear-gradient(135deg, #34d399, #22c55e)'
              : 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {saved ? (
            <><Check size={16} /> Saved!</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </motion.button>

        {/* ── Theme Customizer Accordion ─────────────────────────────────────── */}
        <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setThemeOpen(!themeOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
            style={{
              background: 'rgba(108, 99, 255, 0.08)',
              border: '1px solid rgba(108, 99, 255, 0.15)',
              color: 'var(--foreground)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Palette size={18} style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-bold">Customize Theme</span>
            </div>
            {themeOpen ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
          </button>

          {themeOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 space-y-6"
            >
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: 'var(--muted)' }}>
                  Theme Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PRESETS).map(([presetName, preset]) => (
                    <button
                      key={presetName}
                      onClick={() => applyPreset(presetName)}
                      className="relative p-3 rounded-xl text-left transition-all text-xs font-medium"
                      style={{
                        background: activePreset === presetName ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                        border: activePreset === presetName ? `1px solid ${preset['--primary']}` : '1px solid rgba(255,255,255,0.06)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: preset['--primary'], boxShadow: `0 0 8px ${preset['--primary-glow']}` }} />
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: preset['--accent'] }} />
                      </div>
                      <span className="leading-tight">{presetName}</span>
                      {activePreset === presetName && (
                        <Check size={12} className="absolute top-2 right-2" style={{ color: preset['--primary'] }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
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

              {/* Sliders */}
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

              {/* Reset */}
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
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
