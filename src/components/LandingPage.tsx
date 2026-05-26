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
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onEnterApp}
              className="btn-primary text-sm py-3 px-8 flex items-center gap-2"
            >
              <Sparkles size={16} />
              Start Your Journey
              <ChevronRight size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setCustomizerOpen(true)}
              className="btn-ghost text-sm py-3 px-6 flex items-center gap-2"
            >
              <Palette size={16} />
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

      {/* ══════════════ FEATURES GRID ══════════════ */}
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

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="glass-card p-5 md:p-6 group cursor-default"
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{
                      background: `${f.color}15`,
                      border: `1px solid ${f.color}30`,
                    }}
                  >
                    <Icon size={18} style={{ color: f.color }} />
                  </div>

                  <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--foreground)' }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Ready to <span className="gradient-text">Level Up</span>?
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
            Join the study revolution. Your AI-powered academic universe awaits.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnterApp}
            className="btn-primary text-sm py-3.5 px-10 inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            Launch VidyaVerse
            <ArrowRight size={16} />
          </motion.button>
        </motion.div>
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
