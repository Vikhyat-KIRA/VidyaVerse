'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Zap, Timer, Settings, LogOut, Sun, Moon,
  Users, Flame, Star, Layers, Swords, Share2, Command,
  ChevronRight
} from 'lucide-react';
import VayuOrb from './VayuOrb';

export type ActivePanel = 'chat' | 'community' | 'flashforge' | 'pomodoro' | 'flashcards' | 'bossbattle' | 'settings';

interface SidebarProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  userName: string;
  userXp: number;
  userStreak: number;
  onSignOut: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenCommandPalette?: () => void;
  onShareScore?: () => void;
  unreadVayu?: boolean;
  unreadCommunity?: number;
}

const navItems: { id: ActivePanel; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { id: 'chat', label: 'VAYU Chat', icon: <MessageSquare size={16} />, shortcut: '1' },
  { id: 'community', label: 'Guilds', icon: <Users size={16} />, shortcut: '2' },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers size={16} />, shortcut: '3' },
  { id: 'flashforge', label: 'Flash-Forge', icon: <Zap size={16} />, shortcut: '4' },
  { id: 'pomodoro', label: 'Pomodoro', icon: <Timer size={16} />, shortcut: '5' },
  { id: 'bossbattle', label: 'Boss Battle', icon: <Swords size={16} />, shortcut: '6' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, shortcut: '7' },
];

export default function Sidebar({
  activePanel,
  onPanelChange,
  userName,
  userXp,
  userStreak,
  onSignOut,
  isDark,
  onToggleTheme,
  onOpenCommandPalette,
  onShareScore,
  unreadVayu = false,
  unreadCommunity = 0,
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="hidden md:flex fixed left-5 top-5 bottom-5 flex-col items-stretch py-5 z-50 transition-all duration-300 ease-in-out rounded-[24px] overflow-hidden glass-strong huly-waterfall-wrap"
        style={{
          width: isHovered ? '240px' : '72px',
        }}
      >
        {/* Top Header / Orb Section */}
        <div className="flex items-center px-4 mb-4 select-none">
          <div className="flex-shrink-0">
            <VayuOrb size="sm" />
          </div>
          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="ml-3 text-sm font-bold tracking-tight text-glow-primary"
                style={{ color: 'var(--foreground)' }}
              >
                VidyaVerse
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Thin separator */}
        <div className="px-4 mb-4">
          <div className="h-px w-full bg-white/5" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPanelChange(item.id)}
                className="relative w-full flex items-center p-2.5 rounded-lg transition-all duration-200 group border-none cursor-pointer"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--muted)',
                }}
              >
                {/* Icon Container */}
                <div 
                  className="flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{
                    width: '20px',
                    color: isActive ? 'var(--primary)' : 'inherit'
                  }}
                >
                  {item.icon}
                </div>

                {/* Text Label (Expanded) */}
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-3 text-xs font-medium tracking-wide flex-1 text-left"
                    style={{
                      color: isActive ? 'var(--foreground)' : 'var(--muted)',
                    }}
                  >
                    {item.label}
                  </motion.span>
                )}

                {/* Keyboard Shortcut Hint (Expanded) */}
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    {item.shortcut}
                  </motion.span>
                )}

                {/* Collapsed Tooltip */}
                {!isHovered && (
                  <div
                    className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 translate-x-1 group-hover:translate-x-0"
                    style={{
                      background: 'var(--tooltip-bg)',
                      color: 'var(--foreground)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--sidebar-border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      zIndex: 100,
                    }}
                  >
                    {item.label}
                  </div>
                )}

                {/* Active Indicator Pill */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}

                {/* Notifications badge */}
                {item.id === 'chat' && unreadVayu && (
                  <span 
                    className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                    style={{
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent-glow)',
                    }}
                  />
                )}
                {item.id === 'community' && unreadCommunity > 0 && (
                  <span 
                    className="absolute top-2 right-2 min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                    style={{
                      background: 'var(--primary)',
                      boxShadow: '0 0 8px var(--primary-glow)',
                    }}
                  >
                    {unreadCommunity > 99 ? '99+' : unreadCommunity}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 px-3 pb-2 select-none">
          {/* Thin separator */}
          <div className="h-px w-full mb-1 bg-white/5" />

          {/* XP & Streak (Row when expanded, stacked icons when collapsed) */}
          <div className={`flex ${isHovered ? 'flex-row gap-2' : 'flex-col gap-1.5'} items-center justify-between w-full`}>
            <div
              className={`flex items-center justify-center p-2 rounded-lg cursor-default transition-all duration-200 ${isHovered ? 'flex-1 pl-3' : 'w-full'}`}
              style={{ background: 'rgba(251, 146, 60, 0.05)' }}
              title={`🔥 ${userStreak} Day Streak`}
            >
              <Flame size={14} style={{ color: '#fb923c' }} />
              {isHovered && (
                <span className="text-[10px] font-semibold ml-2 flex-1 text-left" style={{ color: '#fb923c' }}>
                  {userStreak} Day Streak
                </span>
              )}
            </div>
            
            <div
              className={`flex items-center justify-center p-2 rounded-lg cursor-default transition-all duration-200 ${isHovered ? 'flex-1 pl-3' : 'w-full'}`}
              style={{ background: 'rgba(6, 182, 212, 0.05)' }}
              title={`⭐ ${userXp} XP`}
            >
              <Star size={14} style={{ color: '#22d3ee' }} />
              {isHovered && (
                <span className="text-[10px] font-semibold ml-2 flex-1 text-left" style={{ color: '#22d3ee' }}>
                  {userXp} XP
                </span>
              )}
            </div>
          </div>

          {/* Share, Cmd+K, Theme buttons container */}
          <div className={`flex ${isHovered ? 'flex-row justify-between' : 'flex-col'} items-center gap-1 mt-1`}>
            {onShareScore && (
              <button
                onClick={onShareScore}
                className="p-2 rounded-lg transition-all duration-200 border-none cursor-pointer"
                style={{
                  background: 'transparent',
                  color: 'var(--muted)',
                  width: isHovered ? 'auto' : '100%',
                }}
                title="Share Scorecard"
              >
                <Share2 size={14} />
              </button>
            )}

            {onOpenCommandPalette && (
              <button
                onClick={onOpenCommandPalette}
                className="p-2 rounded-lg transition-all duration-200 flex items-center justify-center border border-transparent cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  width: isHovered ? 'auto' : '100%',
                }}
                title="Command Palette (Cmd+K)"
              >
                <span className="text-[9px] font-bold font-mono" style={{ color: 'var(--muted)' }}>⌘K</span>
              </button>
            )}

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg transition-all duration-200 border-none cursor-pointer"
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                width: isHovered ? 'auto' : '100%',
              }}
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* User Account / Sign Out Block */}
          <div className="flex items-center mt-2 p-1.5 rounded-xl transition-all duration-200" style={{ background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-default flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: 'white',
                boxShadow: '0 0 0 1.5px rgba(99, 102, 241, 0.15)',
              }}
              title={userName}
            >
              {userName.charAt(0).toUpperCase()}
            </div>

            {isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-3 flex-1 overflow-hidden"
              >
                <p className="text-[10px] font-bold truncate text-left" style={{ color: 'var(--foreground)' }}>
                  {userName}
                </p>
                <p className="text-[8px] truncate text-left" style={{ color: 'var(--muted)' }}>
                  Active Student
                </p>
              </motion.div>
            )}

            {isHovered && (
              <button
                onClick={onSignOut}
                className="p-1 rounded transition-colors hover:bg-white/10 border-none cursor-pointer ml-1"
                title="Sign Out"
              >
                <LogOut size={12} style={{ color: 'var(--danger)' }} />
              </button>
            )}
          </div>

          {!isHovered && (
            <button
              onClick={onSignOut}
              className="p-2 rounded-lg transition-colors border-none cursor-pointer w-full flex justify-center mt-1"
              title="Sign Out"
            >
              <LogOut size={14} style={{ color: 'var(--danger)' }} />
            </button>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-1.5 glass-strong border-t border-white/5">
        <div className="flex items-center justify-around overflow-x-auto no-scrollbar w-full py-0.5">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => onPanelChange(item.id)}
                className="relative flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl flex-shrink-0 transition-colors"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '52px',
                }}
              >
                <div className="relative">
                  {item.icon}

                  {/* Notification Badges (Mobile) */}
                  {item.id === 'chat' && unreadVayu && (
                    <span 
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                      style={{
                        background: 'var(--accent)',
                        boxShadow: '0 0 8px var(--accent-glow)',
                        border: '1.5px solid var(--mobile-nav-bg)'
                      }}
                    />
                  )}
                  {item.id === 'community' && unreadCommunity > 0 && (
                    <span 
                      className="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] px-0.5 rounded-full text-[7px] font-bold flex items-center justify-center text-white"
                      style={{
                        background: 'var(--primary)',
                        boxShadow: '0 0 8px var(--primary-glow)',
                        border: '1px solid var(--mobile-nav-bg)'
                      }}
                    >
                      {unreadCommunity > 99 ? '99+' : unreadCommunity}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-semibold">{item.label}</span>
              </motion.button>
            );
          })}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onSignOut}
            className="flex flex-col items-center gap-0.5 py-1.5 px-2 flex-shrink-0 transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
              minWidth: '52px',
            }}
          >
            <LogOut size={18} />
            <span className="text-[9px] font-semibold">Exit</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
}

