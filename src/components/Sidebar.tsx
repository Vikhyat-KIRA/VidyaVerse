'use client';

import { motion } from 'framer-motion';
import { 
  MessageSquare, Zap, Timer, Settings, LogOut, Sun, Moon,
  Users, Flame, Star, Layers, Swords
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
}

const navItems: { id: ActivePanel; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'VAYU Chat', icon: <MessageSquare size={18} /> },
  { id: 'community', label: 'Guilds', icon: <Users size={18} /> },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers size={18} /> },
  { id: 'flashforge', label: 'Flash-Forge', icon: <Zap size={18} /> },
  { id: 'pomodoro', label: 'Pomodoro', icon: <Timer size={18} /> },
  { id: 'bossbattle', label: 'Boss Battle', icon: <Swords size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
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
}: SidebarProps) {
  return (
    <>
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside
        className="sidebar-desktop fixed left-0 top-0 bottom-0 w-[68px] flex flex-col items-center py-3 z-50"
        style={{
          background: 'rgba(9, 10, 15, 0.88)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.055)',
          boxShadow: '1px 0 0 0 rgba(255,255,255,0.03)',
        }}
      >
        {/* Logo / Orb */}
        <div className="mb-5 mt-1">
          <VayuOrb size="sm" />
        </div>

        {/* Thin separator */}
        <div className="w-8 h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onPanelChange(item.id)}
                className="relative w-full flex items-center justify-center p-2.5 rounded-xl transition-all group"
                style={{
                  background: isActive
                    ? 'rgba(99, 102, 241, 0.14)'
                    : 'transparent',
                  color: isActive
                    ? '#818cf8'
                    : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title={item.label}
                aria-label={item.label}
              >
                {item.icon}

                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #6366f1, #818cf8)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Tooltip */}
                <div
                  className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 translate-x-1 group-hover:translate-x-0"
                  style={{
                    background: 'rgba(15, 17, 25, 0.92)',
                    color: 'rgba(241, 245, 249, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 100,
                  }}
                >
                  {item.label}
                </div>
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-2 pb-1 w-full px-2">
          {/* Thin separator */}
          <div className="w-8 h-px mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* XP & Streak */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center justify-center p-2 rounded-xl w-full cursor-default"
              style={{ background: 'rgba(251, 146, 60, 0.08)' }}
              title={`🔥 ${userStreak} Day Streak`}
            >
              <Flame size={14} style={{ color: '#fb923c' }} />
              <span className="text-[9px] font-bold mt-0.5" style={{ color: '#fb923c' }}>{userStreak}</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center justify-center p-2 rounded-xl w-full cursor-default"
              style={{ background: 'rgba(6, 182, 212, 0.08)' }}
              title={`⭐ ${userXp} XP`}
            >
              <Star size={14} style={{ color: '#22d3ee' }} />
              <span className="text-[9px] font-bold mt-0.5" style={{ color: '#22d3ee' }}>
                {userXp > 9999 ? '9k+' : userXp > 999 ? `${(userXp / 1000).toFixed(1)}k` : userXp}
              </span>
            </motion.div>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold cursor-default"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              color: 'white',
              boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.25)',
            }}
            title={userName}
          >
            {userName.charAt(0).toUpperCase()}
          </div>

          {/* Sign Out */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSignOut}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Sign Out"
          >
            <LogOut size={14} />
          </motion.button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav
        className="mobile-nav fixed bottom-0 left-0 right-0 z-50 px-2 py-1.5"
        style={{
          background: 'rgba(9, 10, 15, 0.93)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.055)',
        }}
      >
        <div className="flex items-center justify-around overflow-x-auto no-scrollbar w-full py-0.5">
          {navItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.88 }}
                onClick={() => onPanelChange(item.id)}
                className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl flex-shrink-0 transition-colors"
                style={{
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  color: isActive ? '#818cf8' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                  minWidth: '52px',
                }}
              >
                {item.icon}
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
