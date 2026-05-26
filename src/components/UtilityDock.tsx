'use client';

import { motion } from 'framer-motion';
import { 
  MessageSquare, Users, Layers, Zap, Timer, Swords, Settings, LogOut, Command
} from 'lucide-react';
import VayuOrb from './VayuOrb';
import { audioEngine } from '@/lib/audio';
export type ActivePanel = 'chat' | 'community' | 'flashcards' | 'flashforge' | 'pomodoro' | 'bossbattle' | 'settings';

interface UtilityDockProps {
  activePanel: ActivePanel;
  onPanelChange: (panel: ActivePanel) => void;
  userName: string;
  userXp: number;
  userStreak: number;
  onSignOut: () => void;
  onOpenCommandPalette?: () => void;
  onShareScore?: () => void;
  unreadVayu?: boolean;
  unreadCommunity?: number;
  vayuThinking?: boolean;
  vayuSpeaking?: boolean;
}

const navItems: { id: ActivePanel; label: string; icon: React.ComponentType<any>; shortcut: string }[] = [
  { id: 'chat', label: 'VAYU Chat', icon: MessageSquare, shortcut: '1' },
  { id: 'community', label: 'Guilds', icon: Users, shortcut: '2' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, shortcut: '3' },
  { id: 'flashforge', label: 'Flash-Forge', icon: Zap, shortcut: '4' },
  { id: 'pomodoro', label: 'Pomodoro', icon: Timer, shortcut: '5' },
  { id: 'bossbattle', label: 'Boss Battle', icon: Swords, shortcut: '6' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '7' },
];

export default function UtilityDock({
  activePanel,
  onPanelChange,
  userName,
  userXp,
  userStreak,
  onSignOut,
  onOpenCommandPalette,
  onShareScore,
  unreadVayu = false,
  unreadCommunity = 0,
  vayuThinking = false,
  vayuSpeaking = false,
}: UtilityDockProps) {
  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-16 h-full bg-base-obsidian border-r border-sys-groove py-4 flex-shrink-0 z-50 relative select-none">
      {/* Top Section: VayuOrb AI Brand Mark */}
      <div className="flex flex-col items-center gap-4 w-full">
        <div 
          onClick={onShareScore}
          className="relative flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-150 rounded-xl bg-black/30 border border-sys-groove p-1"
          title="View XP & Streak (Scorecard)"
        >
          <VayuOrb size="sm" isThinking={vayuThinking} isSpeaking={vayuSpeaking} />
        </div>
        
        <div className="w-10 h-px bg-sys-groove" />
      </div>

      {/* Mid Section: Utility Rails */}
      <nav className="flex flex-col items-center gap-3 w-full py-4">
        {navItems.map((item) => {
          const isActive = activePanel === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              {/* Emissive Pipe Active Indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-purple-500 rounded-r shadow-[0_0_8px_#8b5cf6,0_0_16px_#8b5cf6]" />
              )}

              <button
                onClick={() => {
                  audioEngine.playClick();
                  onPanelChange(item.id);
                }}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 border cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-purple-950/20 border-purple-500/30 text-purple-400'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                }`}
              >
                <Icon size={18} className="spring-transition" />

                {/* Unread Alerts inside the Dock buttons */}
                {item.id === 'chat' && unreadVayu && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                )}

                {item.id === 'community' && unreadCommunity > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-[8px] font-bold px-1 rounded-full text-white min-w-[14px] text-center border border-base-obsidian shadow-[0_0_6px_rgba(139,92,246,0.6)]">
                    {unreadCommunity > 99 ? '99+' : unreadCommunity}
                  </span>
                )}
              </button>

              {/* Skeuomorphic Monospace Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 bg-zinc-950/95 border border-sys-groove px-2 py-1 rounded shadow-xl text-[9px] font-mono font-bold tracking-wider uppercase text-zinc-300 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                {item.label} <span className="opacity-40 ml-1.5">[{item.shortcut}]</span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section: Command Menu + User Stats + Signout */}
      <div className="flex flex-col items-center gap-4 w-full">
        {onOpenCommandPalette && (
          <button
            onClick={() => {
              audioEngine.playClick();
              onOpenCommandPalette();
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30 border border-transparent active:scale-95 transition-all"
            title="Command Menu [Ctrl+K]"
          >
            <Command size={16} />
          </button>
        )}

        <div className="w-10 h-px bg-sys-groove" />

        {/* User Stats Display */}
        <div 
          onClick={() => {
            audioEngine.playClick();
            onShareScore?.();
          }}
          className="relative group cursor-pointer active:scale-95 transition-all duration-150 flex flex-col items-center gap-0.5"
        >
          {/* Avatar box */}
          <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-sys-groove flex items-center justify-center font-bold text-xs text-purple-400 select-none">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          {/* Flame streak count */}
          {userStreak > 0 && (
            <div className="absolute -bottom-1.5 -right-1 bg-amber-600 border border-base-obsidian text-[7px] font-extrabold px-1 rounded-full text-white flex items-center gap-0.5">
              🔥 {userStreak}
            </div>
          )}

          {/* User details on hover */}
          <div className="absolute left-14 bottom-0 bg-zinc-950/95 border border-sys-groove p-2.5 rounded shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 w-44 z-50">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">XP Portfolio</p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">{userName}</p>
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mt-1.5 border-t border-sys-groove/40 pt-1.5">
              <span>XP: <b className="text-purple-400">{userXp}</b></span>
              <span>STREAK: <b className="text-amber-500">{userStreak}d</b></span>
            </div>
          </div>
        </div>

        {/* Exit Button */}
        <button
          onClick={() => {
            audioEngine.playClick();
            onSignOut();
          }}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-950/10 border border-transparent active:scale-95 transition-all duration-150 cursor-pointer"
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
