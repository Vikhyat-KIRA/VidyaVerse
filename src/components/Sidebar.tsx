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
  { id: 'chat', label: 'VAYU Chat', icon: <MessageSquare size={20} /> },
  { id: 'community', label: 'Guilds', icon: <Users size={20} /> },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers size={20} /> },
  { id: 'flashforge', label: 'Flash-Forge', icon: <Zap size={20} /> },
  { id: 'pomodoro', label: 'Pomodoro', icon: <Timer size={20} /> },
  { id: 'bossbattle', label: 'Boss Battle', icon: <Swords size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
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
      {/* Desktop Sidebar */}
      <aside
        className="sidebar-desktop fixed left-0 top-0 bottom-0 w-[72px] flex flex-col items-center py-4 z-50"
        style={{
          background: 'rgba(8, 9, 13, 0.8)',
          backdropFilter: 'blur(30px)',
          borderRight: '1px solid var(--border-color)',
        }}
      >
        {/* Logo / Orb */}
        <div className="mb-6">
          <VayuOrb size="sm" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPanelChange(item.id)}
              className="relative p-3 rounded-xl transition-all group"
              style={{
                background: activePanel === item.id 
                  ? 'rgba(108, 99, 255, 0.15)' 
                  : 'transparent',
                color: activePanel === item.id 
                  ? '#6c63ff' 
                  : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
              }}
              title={item.label}
            >
              {item.icon}
              {activePanel === item.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: '#6c63ff' }}
                />
              )}
              {/* Tooltip */}
              <div
                className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                style={{
                  background: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {item.label}
              </div>
            </motion.button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-4">
          {/* XP & Streak */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl" style={{ background: 'rgba(255, 153, 0, 0.1)', color: '#ff9900' }} title={`Streak: ${userStreak} Days`}>
              <Flame size={18} />
              <span className="text-[10px] font-bold mt-1">{userStreak}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-xl" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff' }} title={`XP: ${userXp}`}>
              <Star size={18} />
              <span className="text-[10px] font-bold mt-1">{userXp > 999 ? '999+' : userXp}</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleTheme}
            className="p-3 rounded-xl"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            title={isDark ? 'Light Mode' : 'Dark Mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, #6c63ff, #00f0ff)',
              color: 'white',
            }}
            title={userName}
          >
            {userName.charAt(0).toUpperCase()}
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSignOut}
            className="p-2 rounded-lg"
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </motion.button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav
        className="mobile-nav fixed bottom-0 left-0 right-0 z-50 px-2 py-2"
        style={{
          background: 'rgba(8, 9, 13, 0.9)',
          backdropFilter: 'blur(30px)',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full py-1 px-2 scroll-smooth">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onPanelChange(item.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl flex-shrink-0"
              style={{
                background: activePanel === item.id ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                color: activePanel === item.id ? '#6c63ff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                minWidth: '64px',
              }}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          ))}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSignOut}
            className="flex flex-col items-center gap-1 p-2 flex-shrink-0"
            style={{ 
              background: 'transparent', 
              color: 'var(--muted)', 
              border: 'none',
              cursor: 'pointer',
              minWidth: '64px',
            }}
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Exit</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
}
