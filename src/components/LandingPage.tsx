'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, MessageCircle, Users, Zap, Timer, Image, Trophy,
  Sword, ChevronRight, Palette, ArrowRight, Star, Heart
} from 'lucide-react';
import NextImage from 'next/image';
import VayuOrb from './VayuOrb';
import CustomizerPanel from './CustomizerPanel';

interface LandingPageProps {
  onEnterApp: () => void;
}

// ─── Feature Data ───────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: MessageCircle,
    title: 'VAYU — AI Study Mentor',
    desc: 'Context-aware AI that tracks your learning path, goals, and weaknesses in real-time.',
    color: '#6c63ff',
  },
  {
    icon: Users,
    title: 'Private 1-on-1 DMs',
    desc: 'End-to-end private chat rooms with invite codes. Auto-lock after your friend joins.',
    color: '#00f0ff',
  },
  {
    icon: Zap,
    title: 'Flash-Forge Vault',
    desc: 'Leitner-system spaced repetition with AI-forged flashcard decks from any topic.',
    color: '#34d399',
  },
  {
    icon: Timer,
    title: 'Pomodoro Audio Coach',
    desc: 'Glassmorphic countdown timer with voice alerts to keep you accountable.',
    color: '#f59e0b',
  },
  {
    icon: Image,
    title: 'Flash-Forge Vision',
    desc: 'Upload textbook images or PDFs. AI parses content visually and generates study briefs.',
    color: '#a855f7',
  },
  {
    icon: Trophy,
    title: 'Leaderboards & XP',
    desc: 'Earn XP, climb ranks from Academic Rookie to Omniscient Scholar. Daily streaks keep you sharp.',
    color: '#f43f5e',
  },
];

// ─── Stat Counter Data ──────────────────────────────────────────────────────
const STATS = [
  { value: '6+', label: 'Core Modules' },
  { value: 'AI', label: 'Powered by Gemini' },
  { value: '∞', label: 'Knowledge Vault' },
  { value: '🔥', label: 'Daily Streaks' },
];

// ─── Animated Counter ───────────────────────────────────────────────────────
function AnimatedStat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="text-center"
    >
      <p className="text-2xl md:text-3xl font-bold gradient-text">{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{label}</p>
    </motion.div>
  );
}

// ─── Landing Page Component ─────────────────────────────────────────────────
export default function LandingPage({ onEnterApp }: LandingPageProps) {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [heroHovered, setHeroHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-grain" style={{ background: 'var(--background)', overflow: 'auto' }}>

      {/* ── Persistent logo watermark (fixed behind entire landing page) ── */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.035 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
        >
          <NextImage
            src="/logo.webp"
            alt=""
            width={900}
            height={700}
            className="select-none logo-invert"
            style={{ objectFit: 'contain' }}
            priority
          />
        </motion.div>
      </div>

      {/* ══════════════ NAV BAR ══════════════ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-[100] px-4 md:px-8 py-3"
        style={{
          background: scrollY > 40 ? 'rgba(8, 9, 13, 0.85)' : 'transparent',
          backdropFilter: scrollY > 40 ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrollY > 40 ? 'blur(20px) saturate(180%)' : 'none',
          borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', padding: '5px' }}
            >
              <NextImage
                src="/icon.webp"
                alt="VidyaVerse"
                width={20}
                height={20}
                style={{ filter: 'invert(1)' }}
              />
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>VidyaVerse</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomizerOpen(true)}
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                color: 'var(--accent)',
              }}
              aria-label="Customize theme"
            >
              <Palette size={16} />
            </button>
            <button
              onClick={onEnterApp}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              Launch App
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ══════════════ HERO SECTION ══════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 overflow-hidden"
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
      >
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Huly Dramatic Light Cone */}
          <div className="waterfall-beam">
            <div className="waterfall-halo" />
            <div className="waterfall-cone" />
            <div className="waterfall-shimmer" />
          </div>

          <motion.div
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
            style={{ background: 'radial-gradient(circle, var(--primary), transparent)' }}
          />
          <motion.div
            animate={{ x: [0, -30, 20, 0], y: [0, 20, -30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
            style={{ background: 'radial-gradient(circle, var(--accent), transparent)' }}
          />
        </div>

        {/* ── Animated horizontal scrolling slogan ── */}
        <div className="absolute bottom-20 left-0 right-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="flex whitespace-nowrap gap-10 text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: 'rgba(255,255,255,0.07)' }}
          >
            {Array.from({ length: 2 }).map((_, gi) => (
              <span key={gi} className="flex gap-10">
                {[
                  'Become an Academic Weapon',
                  '·',
                  'AI-Powered Study',
                  '·',
                  'Defeat the Boss',
                  '·',
                  'Level Up Every Day',
                  '·',
                  'VAYU Knows You',
                  '·',
                  'Spaced Repetition',
                  '·',
                  'Deep Focus Mode',
                  '·',
                  'Flash-Forge Vision',
                  '·',
                ].map((word, i) => (
                  <span key={i}>{word}</span>
                ))}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-3xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-xs font-medium"
            style={{
              background: 'rgba(108, 99, 255, 0.1)',
              border: '1px solid rgba(108, 99, 255, 0.2)',
              color: 'var(--primary)',
            }}
          >
            <Star size={12} />
            The Gamified AI Study Universe
          </motion.div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            <span style={{ color: 'var(--foreground)' }}>Become an</span>
            <br />
            <span className="gradient-text">Academic Weapon.</span>
          </h1>

          {/* Sub-heading */}
          <p className="text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8" style={{ color: 'var(--muted)' }}>
            Meet <strong style={{ color: 'var(--accent)' }}>VAYU</strong> — your mystical AI study mentor.
            Conquer exams with spaced repetition, boss battles, voice coaching, and real-time collaboration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onEnterApp}
              onMouseMove={handleMouseMove}
              className="btn-radiant-glow text-sm py-3 px-8 flex items-center gap-2"
            >
              <Sparkles size={15} />
              Start Your Journey
              <ChevronRight size={15} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCustomizerOpen(true)}
              className="btn-ghost text-sm py-3 px-6 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/35 text-zinc-300 font-semibold"
            >
              <Palette size={15} />
              Customize Look
            </motion.button>
          </div>
        </motion.div>

        {/* Floating Orb */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 1, type: 'spring' }}
          className="relative z-10 mt-10 md:mt-14"
        >
          <VayuOrb size="lg" />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-5 h-8 rounded-full flex items-start justify-center pt-1.5"
            style={{ border: '2px solid rgba(255,255,255,0.15)' }}
          >
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-2 rounded-full"
              style={{ background: 'var(--primary)' }}
            />
          </motion.div>
        </motion.div>

        {/* ── Floating Hero Sneak Peeks (lowkey, ambient) ── */}

        {/* Left: VAYU chat bubble */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={heroHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute left-4 top-1/3 hidden lg:block pointer-events-none z-10"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-52 rounded-xl p-3 space-y-2"
            style={{
              background: 'rgba(12,12,15,0.72)',
              border: '1px solid rgba(99,102,241,0.18)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              opacity: 0.82,
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <VayuOrb size="sm" />
              <span className="text-[9px] font-bold text-white">VAYU</span>
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="bg-zinc-900/70 rounded-lg px-2 py-1.5 text-[8px] text-zinc-300 leading-relaxed">
              📊 Chapter 4 quiz forged.<br />
              <span className="text-violet-400 font-bold">+120 XP</span> — defeat the Boss!
            </div>
            <div className="flex items-center gap-1.5 bg-violet-950/30 border border-violet-500/15 rounded-lg px-2 py-1 text-[8px] text-violet-300">
              <span>Yes! Start the quiz</span>
              <span className="w-1 h-2.5 bg-violet-400 animate-blink ml-auto" />
            </div>
          </motion.div>
        </motion.div>

        {/* Left-lower: XP Streak chip */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={heroHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 }}
          className="absolute left-6 bottom-1/3 hidden lg:block pointer-events-none z-10"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="rounded-xl px-3 py-2 flex items-center gap-3"
            style={{
              background: 'rgba(12,12,15,0.7)',
              border: '1px solid rgba(249,115,22,0.18)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
              opacity: 0.78,
            }}
          >
            <span className="text-base">🔥</span>
            <div>
              <p className="text-[9px] font-extrabold text-orange-400">15-Day Streak</p>
              <p className="text-[7px] text-zinc-500">9,800 XP · Rank #1</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Trophy size={10} style={{ color: '#f43f5e' }} />
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Pomodoro mini-timer */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={heroHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.03 }}
          className="absolute right-4 top-1/3 hidden lg:block pointer-events-none z-10"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="w-44 rounded-xl p-3"
            style={{
              background: 'rgba(12,12,15,0.72)',
              border: '1px solid rgba(245,158,11,0.18)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              opacity: 0.80,
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ring inline-block" />
                Focus Mode
              </span>
              <span className="text-[8px] font-mono text-zinc-500">1 of 4</span>
            </div>
            {/* Mini SVG ring */}
            <div className="flex items-center justify-center relative">
              <svg className="w-14 h-14" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="3" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="url(#pg)" strokeWidth="3"
                  strokeDasharray="138" strokeDashoffset="20" strokeLinecap="round"
                  style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }} />
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <p className="text-[11px] font-mono font-bold text-white leading-none">24:12</p>
                <p className="text-[6px] text-amber-400 uppercase tracking-wider">studying</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right-lower: Flashcard flip chip */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={heroHovered ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.09 }}
          className="absolute right-6 bottom-1/3 hidden lg:block pointer-events-none z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="w-48 rounded-xl p-3 space-y-1.5"
            style={{
              background: 'rgba(12,12,15,0.70)',
              border: '1px solid rgba(52,211,153,0.18)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
              opacity: 0.78,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Flash·Forge</span>
              <span className="text-[7px] text-zinc-500 font-mono">Box 2 → 3</span>
            </div>
            <div className="bg-zinc-900/60 rounded-lg p-2 text-center border border-zinc-800/40">
              <p className="text-[8px] text-zinc-400 mb-0.5">What is mitochondria?</p>
              <p className="text-[7px] text-emerald-400 font-semibold">Powerhouse of the cell ⚡</p>
            </div>
            <div className="flex gap-1 pt-0.5">
              <div className="flex-1 bg-red-950/20 border border-red-500/15 rounded text-center py-0.5 text-[7px] text-red-400">Forgot</div>
              <div className="flex-1 bg-emerald-950/20 border border-emerald-500/15 rounded text-center py-0.5 text-[7px] text-emerald-400">Got it ✓</div>
            </div>
          </motion.div>
        </motion.div>

      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <section className="relative z-10 py-10 px-4">
        <div className="max-w-4xl mx-auto glass-card p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES BENTO GRID ══════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
              Your Complete <span className="gradient-text">Study Arsenal</span>
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--muted)' }}>
              Six powerful modules engineered to supercharge your academic performance.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: VAYU AI Mentor (spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 md:col-span-2 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none">
                  <VayuOrb size="md" />
                </div>
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#6c63ff15', border: '1px solid #6c63ff30' }}>
                    <MessageCircle size={18} style={{ color: '#6c63ff' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">VAYU — AI Study Mentor</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md">
                    Context-aware intelligence that understands your unique academic background. VAYU reads connected study records in real-time, tailoring custom revision routes and quizzes specifically for you.
                  </p>
                </div>
                <div className="mt-6 p-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 font-mono text-[9px] text-zinc-400 space-y-1 relative z-10 max-w-md">
                  <div className="flex items-center gap-1.5 text-zinc-500"><span>&gt;</span><span>vayu --analyze current-learning-curve</span></div>
                  <div className="text-violet-400 flex items-center gap-0.5">
                    <span>Analysis: Leitner Box 2 needs review. Generating custom flashcards...</span>
                    <span className="w-1 h-3 bg-violet-400 animate-blink" />
                  </div>
                </div>
              </div>

              {/* Hover Sneak Peek (actual app chat window) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <VayuOrb size="sm" />
                    <div>
                      <p className="text-xs font-bold text-white leading-none">🤖 VAYU Mentor</p>
                      <span className="text-[8px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Session
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded">Mock Panel</span>
                </div>
                <div className="flex-1 py-3 flex flex-col gap-2 overflow-y-auto no-scrollbar justify-end text-[9px] font-medium leading-relaxed">
                  <div className="bg-zinc-900/60 border border-zinc-800/30 p-2 rounded-lg max-w-[85%] self-start text-zinc-300">
                    Conquering chemistry today? I've loaded your Google Sheets exam goals.
                  </div>
                  <div className="bg-violet-950/20 border border-violet-500/20 p-2 rounded-lg max-w-[85%] self-end text-violet-300">
                    Yes! Forge a spaced repetition quiz for Chapter 4.
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-800/30 p-2 rounded-lg max-w-[85%] self-start text-zinc-300 text-violet-400 font-bold flex items-center gap-1">
                    Active quiz forged! Defeat the Boss to earn 200 XP. ⚡
                  </div>
                </div>
                <div className="border-t border-zinc-800/50 pt-2 flex items-center justify-between text-[9px] text-zinc-500">
                  <span>Message Vayu...</span>
                  <span className="text-[8px] font-mono opacity-50">⚡ Forge</span>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Private DMs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#00f0ff15', border: '1px solid #00f0ff30' }}>
                    <Users size={18} style={{ color: '#00f0ff' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">Private DMs</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    End-to-end invite room codes that automatically self-destruct from discovery index once your peer joins. Auto-locking.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 rounded border border-zinc-800/40 bg-zinc-900/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-zinc-400 flex-1">Room: #7X829B (Locked)</span>
                    <span className="text-xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">🔒</span>
                  </div>
                </div>
              </div>

              {/* Hover Sneak Peek (actual app split guilds/DM thread) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-[8px] font-bold text-white">7X</div>
                    <div>
                      <p className="text-xs font-bold text-white leading-none">Emily &amp; Jane</p>
                      <span className="text-[7px] text-zinc-400 mt-0.5">Invite Code Active</span>
                    </div>
                  </div>
                  <span className="text-[7px] font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded">Auto-Locked 🔒</span>
                </div>
                <div className="flex-1 py-3 flex flex-col gap-1.5 overflow-y-auto no-scrollbar justify-end text-[9px] font-medium leading-relaxed">
                  <div className="flex gap-1.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-cyan-700 flex items-center justify-center text-[7px] font-bold text-white">E</div>
                    <div className="bg-zinc-900/80 p-2 rounded-lg flex-1 text-zinc-300">
                      <p className="text-[7px] font-black text-cyan-400 mb-0.5">Emily</p>
                      Hey! Let's study chemistry math together.
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-start">
                    <div className="w-4 h-4 rounded-full bg-violet-700 flex items-center justify-center text-[7px] font-bold text-white">J</div>
                    <div className="bg-zinc-900/80 p-2 rounded-lg flex-1 text-zinc-300">
                      <p className="text-[7px] font-black text-violet-400 mb-0.5">Jane</p>
                      Sending they key notes via Forge Vision.
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-800/50 pt-2 flex items-center justify-between text-[9px] text-zinc-500">
                  <span>Type message...</span>
                  <span className="w-2.5 h-2.5 bg-zinc-800 rounded flex items-center justify-center">➔</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Spaced Repetition */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#34d39915', border: '1px solid #34d39930' }}>
                    <Zap size={18} style={{ color: '#34d399' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">Spaced Repetition</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Conquer the forgetting curve using our optimized Leitner-system spaced repetition engine.
                  </p>
                </div>
                <div className="mt-6 flex items-end gap-1.5 font-mono text-[9px] pl-1">
                  <div className="w-8 h-8 rounded border border-zinc-800/50 bg-zinc-900/30 flex flex-col items-center justify-center text-zinc-500 transition-all duration-300 group-hover:translate-y-[-2px]">Box 1</div>
                  <div className="w-8 h-10 rounded border border-zinc-700/50 bg-zinc-900/60 flex flex-col items-center justify-center text-zinc-400 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:border-zinc-500">Box 2</div>
                  <div className="w-8 h-12 rounded border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center text-emerald-400 transition-all duration-300 group-hover:translate-y-[-6px] group-hover:border-emerald-500/40 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]">Box 3</div>
                </div>
              </div>

              {/* Hover Sneak Peek (actual 3D Flipping flashcard) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <p className="text-xs font-bold text-white">Interactive Card Flip</p>
                  <span className="text-[7px] text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded">Box 2</span>
                </div>
                <div className="flex-1 py-4 flex items-center justify-center perspective-1000">
                  {/* 3D Card Object */}
                  <div className="w-full h-[110px] relative preserve-3d transition-transform duration-700 group-hover:rotate-y-180">
                    {/* Front Side */}
                    <div className="absolute inset-0 rounded-lg border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center text-center p-3 backface-hidden">
                      <p className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold mb-1">Concept</p>
                      <p className="text-[10px] font-bold text-zinc-200">Mitochondria</p>
                      <p className="text-[7px] text-zinc-500 mt-2">Hover card to reveal answer</p>
                    </div>
                    {/* Back Side */}
                    <div className="absolute inset-0 rounded-lg border border-emerald-500/20 bg-emerald-950/15 flex flex-col items-center justify-center text-center p-3 backface-hidden rotate-y-180">
                      <p className="text-[8px] uppercase tracking-wider text-emerald-400 font-bold mb-1">Definition</p>
                      <p className="text-[9px] text-zinc-300 font-medium leading-normal px-1">
                        Powerhouse of the cell, synthesizes ATP molecules.
                      </p>
                      <span className="text-[7px] text-emerald-400 font-mono mt-1.5">Box 2 ➔ Box 3 ⚡</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center gap-2 text-[8px] font-bold">
                  <span className="text-red-400 bg-red-950/10 px-2 py-1 rounded border border-red-500/20">Forgot</span>
                  <span className="text-emerald-400 bg-emerald-950/10 px-2 py-1 rounded border border-emerald-500/20">Remembered</span>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Pomodoro Audio Coach */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#f59e0b15', border: '1px solid #f59e0b30' }}>
                    <Timer size={18} style={{ color: '#f59e0b' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">Pomodoro Coach</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Glassmorphic timer with smart interactive voice interruptions to bring you back to deep focus intervals.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between font-mono text-[10px] text-zinc-400 px-1 relative">
                  <span className="text-amber-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ring" />
                    ● Focus Mode
                  </span>
                  <span className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors duration-300">25:00</span>
                </div>
              </div>

              {/* Hover Sneak Peek (actual concentric active timer circle) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <p className="text-xs font-bold text-white">Active Focus Circle</p>
                  <span className="text-[7px] text-amber-400 uppercase tracking-widest bg-amber-950/10 px-2 py-0.5 rounded border border-amber-500/20">Coach Active</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center relative py-2">
                  {/* Concentric Progress Ring */}
                  <svg className="w-[85px] h-[85px]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="4" />
                    <circle cx="50" cy="50" r="44" fill="none" stroke="url(#amber-gradient)" strokeWidth="4" strokeDasharray="276" strokeDashoffset="24" className="transition-all duration-1000" />
                    <defs>
                      <linearGradient id="amber-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Center Time */}
                  <div className="absolute flex flex-col items-center justify-center">
                    <p className="text-[12px] font-mono font-bold text-white">24:59</p>
                    <span className="text-[6px] uppercase tracking-wider text-amber-500">Studying</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono">
                  <span>🔊 Voice Feedback: Enabled</span>
                  <span>Interval 1/4</span>
                </div>
              </div>
            </motion.div>

            {/* Card 5: Leaderboards & XP */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#f43f5e15', border: '1px solid #f43f5e30' }}>
                    <Trophy size={18} style={{ color: '#f43f5e' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">Leaderboards & XP</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    Earn XP, maintain daily study streaks, and climb ranks globally. Climb from Rookie to Scholar.
                  </p>
                </div>
                <div className="mt-6 space-y-1 font-mono text-[9px] text-zinc-400 w-full">
                  <div className="flex justify-between items-center bg-zinc-900/30 p-1 px-2 rounded border border-zinc-800/20 transition-all duration-300 group-hover:bg-rose-950/5 group-hover:border-rose-500/20 group-hover:translate-x-1">
                    <span className="flex items-center gap-1">🥇 Vikhyat</span>
                    <span className="text-rose-400 font-bold transition-all duration-300 group-hover:scale-105">9,500 XP</span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-900/10 p-1 px-2 rounded transition-all duration-300 group-hover:translate-x-0.5">
                    <span>🥈 Emily</span>
                    <span className="text-zinc-500">8,200 XP</span>
                  </div>
                </div>
              </div>

              {/* Hover Sneak Peek (actual live scoreboard table) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <p className="text-xs font-bold text-white">Omniscient Scholar Board</p>
                  <span className="text-[7px] text-rose-400 bg-rose-950/10 border border-rose-500/20 px-2 py-0.5 rounded">Ranchi Guild</span>
                </div>
                <div className="flex-1 py-3 flex flex-col gap-1.5 justify-center text-[9px] font-mono">
                  <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg text-zinc-200">
                    <span className="flex items-center gap-1.5"><span className="text-rose-400">1st</span> Vikhyat</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-orange-400">🔥 15 Days</span>
                      <span className="font-bold text-rose-400">9,800 XP</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800/40 p-1.5 rounded-lg text-zinc-300">
                    <span className="flex items-center gap-1.5"><span className="text-zinc-400">2nd</span> Emily</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-orange-400">🔥 10 Days</span>
                      <span className="font-bold text-zinc-400">8,500 XP</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800/20 p-1.5 rounded-lg text-zinc-400">
                    <span className="flex items-center gap-1.5"><span className="text-zinc-500">3rd</span> Jane</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-zinc-500">🔥 5 Days</span>
                      <span className="font-bold text-zinc-400">7,800 XP</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[8px] text-zinc-500">
                  <span>Academic Rank: Rookie ➔ Scholar</span>
                  <span className="text-rose-400 font-bold">1st Place</span>
                </div>
              </div>
            </motion.div>

            {/* Card 6: Flash-Forge Vision (spans 2 columns) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              onMouseMove={handleMouseMove}
              className="glass-card huly-card-glow p-6 md:col-span-2 flex flex-col justify-between overflow-hidden relative group cursor-default min-h-[240px]"
            >
              {/* Default Mockup View */}
              <div className="flex flex-col justify-between h-full w-full transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:scale-[0.97] group-hover:pointer-events-none">
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105" style={{ background: '#a855f715', border: '1px solid #a855f730' }}>
                    <Image size={18} style={{ color: '#a855f7' }} />
                  </div>
                  <h3 className="text-base font-bold mb-2 text-white">Flash-Forge Vision</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed max-w-md">
                    Upload PDF screenshots, study slides, or textbook photos. Our multimodal visual engine parses them instantly, delivering step-by-step mathematical explanations, core concepts, and auto-forging flashcards.
                  </p>
                </div>
                <div className="mt-6 p-3 rounded-lg border border-zinc-800/40 bg-zinc-900/30 flex items-center justify-between text-[9px] font-mono text-zinc-400 relative z-10 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-laser" />
                  </div>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="text-purple-400">📊 textbook_chapter4.png</span>
                    <span className="text-zinc-600">|</span>
                    <span>1.2 MB</span>
                  </div>
                  <span className="text-emerald-400 font-medium relative z-10 transition-all duration-300 group-hover:scale-105">OCR Parsed & Deck Forged ⚡</span>
                </div>
              </div>

              {/* Hover Sneak Peek (actual OCR visual bounding boxes + scans) */}
              <div className="absolute inset-0 p-6 opacity-0 scale-105 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-500 ease-in-out flex flex-col justify-between bg-zinc-950/90 backdrop-blur-xl z-20">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <p className="text-xs font-bold text-white">Multimodal Vision Parsing</p>
                  <span className="text-[7px] text-purple-400 bg-purple-950/10 border border-purple-500/20 px-2 py-0.5 rounded">OCR Canvas</span>
                </div>
                <div className="flex-1 py-3 flex gap-3 relative overflow-hidden">
                  {/* Active Laser Scanning Beam */}
                  <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_10px_rgba(168,85,247,0.6)] animate-laser pointer-events-none" />

                  {/* Simulated Textbook Canvas with bounding box highlights */}
                  <div className="flex-1 border border-zinc-800 rounded-lg bg-zinc-900/60 p-3 font-mono text-[8px] text-zinc-400 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#09090b_90%)] pointer-events-none" />
                    <div className="space-y-2 relative z-10">
                      <div className="border border-purple-500/30 bg-purple-500/5 p-1.5 rounded flex items-center justify-between">
                        <span>[Formula Detected]</span>
                        <span className="text-[7px] text-purple-400 font-bold">E = mc²</span>
                      </div>
                      <div className="border border-cyan-500/20 bg-cyan-500/5 p-1.5 rounded flex flex-col gap-1">
                        <span>[Section: Energy Equivalence]</span>
                        <p className="text-[7px] text-zinc-500 leading-normal">Energy equals mass times the speed of light squared.</p>
                      </div>
                    </div>
                    <span className="text-[7px] text-zinc-500 uppercase tracking-wider relative z-10">Textbook Page 144 Scanning...</span>
                  </div>

                  {/* Simulated Auto-Forged Deck Preview on the right */}
                  <div className="w-[120px] border border-emerald-500/20 rounded-lg bg-emerald-500/5 p-3 flex flex-col justify-between text-[8px] font-mono relative z-10">
                    <div>
                      <p className="text-[7px] text-emerald-400 font-bold mb-1">Forging Output</p>
                      <ul className="space-y-1 text-zinc-300 text-[6.5px]">
                        <li>✓ 5 Cards Generated</li>
                        <li>✓ Math Equations Parsed</li>
                        <li>✓ Added to Leitner Box 1</li>
                      </ul>
                    </div>
                    <span className="text-emerald-400 font-bold text-right text-[7px]">Deck Active ⚡</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[8px] text-zinc-500">
                  <span>Input: PDF / textbook screenshots</span>
                  <span className="text-emerald-400">100% OCR Accuracy</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════ BOSS BATTLE SHOWCASE ══════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 md:p-10 text-center overflow-hidden relative"
          >
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-[80px]"
                style={{ background: 'var(--primary)' }} />
              <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-10 blur-[80px]"
                style={{ background: 'var(--accent)' }} />
            </div>

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f43f5e20, #f59e0b20)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <Sword size={24} style={{ color: '#f43f5e' }} />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                Daily <span className="gradient-text">Boss Battles</span>
              </h2>
              <p className="text-sm max-w-lg mx-auto mb-6" style={{ color: 'var(--muted)' }}>
                Face timed, AI-generated academic challenges daily. Defeat the boss, earn massive XP,
                and prove your mastery. Can you reach Omniscient Scholar?
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {['Academic Rookie', 'Rising Scholar', 'Omniscient Scholar'].map((rank, i) => (
                  <span
                    key={rank}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      background: `rgba(${[108, 52, 244][i]}, ${[99, 211, 63][i]}, ${[255, 153, 94][i]}, 0.1)`,
                      border: `1px solid rgba(${[108, 52, 244][i]}, ${[99, 211, 63][i]}, ${[255, 153, 94][i]}, 0.2)`,
                      color: ['#6c63ff', '#34d399', '#f43f5e'][i],
                    }}
                  >
                    {rank}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section className="relative z-10 py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-center md:text-left">
          
          {/* Left Column: Premium Circular Clock Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex justify-center md:justify-end"
          >
            <div className="huly-clock-dial scale-[1.1] md:mr-8 select-none">
              {/* Watch Crown on the right side */}
              <div className="absolute right-[-7px] top-[calc(50%-10px)] w-[8px] h-[20px] bg-zinc-700 rounded-[2px] border border-zinc-950 shadow-md" />
              
              {/* Subtle watch dial texture grid */}
              <div className="absolute inset-[15px] rounded-full opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.85)_1px,transparent_0)] bg-[size:10px_10px] pointer-events-none" />
              
              {/* Subtle cross / shield brand watermark in center */}
              <div className="absolute w-[60px] h-[60px] opacity-[0.12] flex items-center justify-center pointer-events-none">
                <div className="w-[32px] h-[32px] border-[6px] border-white rounded-[6px] rotate-45" />
              </div>

              {/* Luminous high-tech markers */}
              <span className="absolute top-[18px] text-[8px] text-zinc-500 font-extrabold tracking-wider">12</span>
              <span className="absolute right-[44px] top-[26px] text-[8px] text-zinc-600 font-extrabold tracking-wider">1</span>
              <span className="absolute right-[24px] top-[48px] text-[8px] text-zinc-600 font-extrabold tracking-wider">2</span>
              <span className="absolute right-[18px] top-[calc(50%-5px)] text-[8px] text-zinc-600 font-extrabold tracking-wider">3</span>
              <span className="absolute right-[24px] bottom-[48px] text-[8px] text-zinc-600 font-extrabold tracking-wider">4</span>
              <span className="absolute left-[24px] bottom-[48px] text-[8px] text-zinc-600 font-extrabold tracking-wider">8</span>
              <span className="absolute left-[18px] top-[calc(50%-5px)] text-[8px] text-zinc-600 font-extrabold tracking-wider">9</span>
              <span className="absolute left-[24px] top-[48px] text-[8px] text-zinc-600 font-extrabold tracking-wider">10</span>

              {/* Glow Arc Layer */}
              <div className="huly-clock-glow-arc" />
              
              {/* Hands and Center Pin */}
              <div className="huly-clock-center-pin" />
              <div className="huly-clock-hand huly-clock-hand-hour" />
              <div className="huly-clock-hand huly-clock-hand-minute" />
              <div className="huly-clock-hand huly-clock-hand-second" />
            </div>
          </motion.div>

          {/* Right Column: Title text & Start actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center md:items-start max-w-md mx-auto md:mx-0"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              Ready to <span className="gradient-text">Level Up</span>?
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
              Join the study revolution. Your AI-powered academic universe awaits.
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onEnterApp}
              onMouseMove={handleMouseMove}
              className="btn-radiant-glow text-sm py-3.5 px-10 inline-flex items-center gap-2"
            >
              <Sparkles size={15} />
              Launch VidyaVerse
              <ArrowRight size={15} />
            </motion.button>
          </motion.div>

        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="relative z-10 py-14 md:py-20 px-4 text-center" style={{ borderTop: '1px solid var(--border-color)' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 max-w-md mx-auto"
        >
          {/* Full logo — proper readable size */}
          <NextImage
            src="/logo.webp"
            alt="VidyaVerse Logo"
            width={160}
            height={120}
            className="opacity-50 hover:opacity-80 transition-opacity duration-500 logo-invert"
            style={{ objectFit: 'contain' }}
          />

          {/* Made with love - primary credit */}
          <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--foreground)' }}>
            Made with{' '}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart size={14} style={{ color: '#f43f5e', fill: '#f43f5e' }} />
            </motion.span>
            {' '}by <span className="gradient-text font-bold ml-0.5">Vikhyat</span>
          </p>

          {/* Divider */}
          <div className="w-12 h-px" style={{ background: 'var(--border-color)' }} />

          {/* Sub-footer */}
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Built for students in Ranchi &amp; beyond 🇮🇳
            <br />
            © {new Date().getFullYear()} VidyaVerse · All rights reserved
          </p>
        </motion.div>
      </footer>

      {/* ══════════════ CUSTOMIZER PANEL ══════════════ */}
      <CustomizerPanel isOpen={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  );
}
