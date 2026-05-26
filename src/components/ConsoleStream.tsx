'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Flame } from 'lucide-react';
import { subscribeToFocusSessions, FocusSession } from '@/lib/focus';
import { getUserTitle } from '@/lib/exp';
import { AppNotification } from '../app/page';
import { audioEngine } from '@/lib/audio';

interface ConsoleStreamProps {
  userUid: string;
  userName: string;
  userXp: number;
  userStreak: number;
  notifications: AppNotification[];
  onMarkNotificationRead: (notif: AppNotification) => void;
  onClearNotifications: () => void;
  width?: number;
  onCommandExecute?: (commandType: string, value: string) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  tag: 'SYS' | 'VAYU' | 'GUILD' | 'ALERT' | 'XP';
  message: string;
  flag: 'red' | 'amber' | 'emerald' | 'cyan' | 'purple';
}

export default function ConsoleStream({
  userUid,
  userName,
  userXp,
  userStreak,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  width = 380,
  onCommandExecute,
}: ConsoleStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeSessions, setActiveSessions] = useState<FocusSession[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper for safe time fetching
  const timeStr = () => new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Initialize terminal stream with boot logs
  useEffect(() => {
    const bootLogs: LogEntry[] = [
      { id: 'b1', timestamp: timeStr(), tag: 'SYS', message: 'Initializing VidyaVerse Tactical Kernel...', flag: 'cyan' },
      { id: 'b2', timestamp: timeStr(), tag: 'SYS', message: `Kernel v3.3.0 loaded. User profile: ${userName}`, flag: 'cyan' },
      { id: 'b3', timestamp: timeStr(), tag: 'SYS', message: 'Obsidian design tokens synchronized.', flag: 'cyan' },
      { id: 'b4', timestamp: timeStr(), tag: 'VAYU', message: 'VAYU study mentor fully engaged. Type /help for controls.', flag: 'purple' },
    ];
    setLogs(bootLogs);

    // Random telemetry feed simulation
    const interval = setInterval(() => {
      const msgs = [
        'VAYU memory bounds clean.',
        'Chromatic leak corner flow optimized.',
        'Skeuomorphic spring constants synchronized.',
        'No slacker activities detected.',
        'Guild server synchronization heartbeat: OK',
        'Database connections secured via SSL.',
        'Leitner scheduler box queues: READY',
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      
      setLogs(prev => [
        ...prev.slice(-40),
        {
          id: String(Math.random()),
          timestamp: timeStr(),
          tag: 'SYS',
          message: randomMsg,
          flag: 'cyan',
        }
      ]);
    }, 20000);

    return () => clearInterval(interval);
  }, [userName]);

  // Sync with Firestore Focus Sessions to log study activities
  useEffect(() => {
    const unsubscribe = subscribeToFocusSessions((sessions) => {
      setActiveSessions(sessions);
      
      sessions.forEach(session => {
        setLogs(prev => {
          const logExists = prev.some(l => l.message.includes(session.name) && l.message.includes(session.status));
          if (logExists) return prev;

          const action = session.status === 'focusing' ? 'entered focus mode' : 'paused for break';
          const flag = session.status === 'focusing' ? 'emerald' : 'amber';
          
          return [
            ...prev.slice(-40),
            {
              id: String(Math.random()),
              timestamp: timeStr(),
              tag: 'GUILD',
              message: `${session.name} ${action} [Aim: ${session.aim}]`,
              flag,
            }
          ];
        });
      });
    });

    return () => unsubscribe();
  }, []);

  // Sync real-time page notifications into the console stream
  useEffect(() => {
    if (notifications.length === 0) return;
    const latestNotif = notifications[0];
    const time = new Date(latestNotif.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    setLogs(prev => {
      const exists = prev.some(l => l.id === latestNotif.id);
      if (exists) return prev;

      const tagMap = { vayu: 'VAYU', dm: 'ALERT', guild: 'GUILD' } as const;
      const flagMap = { vayu: 'purple', dm: 'red', guild: 'amber' } as const;

      return [
        ...prev.slice(-40),
        {
          id: latestNotif.id,
          timestamp: time,
          tag: tagMap[latestNotif.type] || 'SYS',
          message: `NEW ALERT: [${latestNotif.title}] ${latestNotif.body}`,
          flag: flagMap[latestNotif.type] || 'cyan',
        }
      ];
    });
  }, [notifications]);

  // Scroll to bottom on new log entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Command processing submission handler
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCmd = commandInput.trim();
    if (!cleanCmd) return;
    
    audioEngine.playClick();
    
    // Add command to logs
    setLogs(prev => [
      ...prev.slice(-40),
      {
        id: String(Math.random()),
        timestamp: timeStr(),
        tag: 'SYS',
        message: `> ${cleanCmd}`,
        flag: 'purple',
      }
    ]);
    
    setCommandInput('');
    
    if (cleanCmd.startsWith('/')) {
      const parts = cleanCmd.slice(1).split(' ');
      const action = parts[0].toLowerCase();
      const value = parts.slice(1).join(' ');
      
      switch (action) {
        case 'help':
          setLogs(prev => [
            ...prev,
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '=== TACTICAL SHELL PROTOCOLS ===', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /panel [chat|community|flashcards|flashforge|pomodoro|bossbattle|settings] - Switch active workspace', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /focus [minutes] - Launch target study focus timer (e.g. /focus 25)', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /xp [amount] - Synthesize virtual experience portfolio points', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /streak [days] - Synthesize active learning streak', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /clear - Flush this logs terminal', flag: 'cyan' },
            { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: '  /vayu [message] - Direct mentor telepathic query', flag: 'cyan' },
          ]);
          break;
          
        case 'clear':
        case 'flush':
          setLogs([]);
          break;
          
        case 'panel':
          const target = value.toLowerCase();
          const validPanels = ['chat', 'community', 'flashcards', 'flashforge', 'pomodoro', 'bossbattle', 'settings'];
          if (validPanels.includes(target)) {
            onCommandExecute?.('panel', target);
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: `Panel redirected to [${target.toUpperCase()}]`, flag: 'emerald' }
            ]);
          } else {
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: `ERR: Unknown panel [${value}]. Choose from: ${validPanels.join(', ')}`, flag: 'red' }
            ]);
          }
          break;
          
        case 'focus':
          const mins = parseInt(value, 10);
          if (!isNaN(mins) && mins > 0) {
            onCommandExecute?.('focus', mins.toString());
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: `Triggering focus session: ${mins} minutes. STRICT mode active.`, flag: 'emerald' }
            ]);
          } else {
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: 'ERR: Focus minutes must be a positive integer (e.g. /focus 25)', flag: 'red' }
            ]);
          }
          break;
          
        case 'xp':
          const xpAmt = parseInt(value, 10);
          if (!isNaN(xpAmt)) {
            onCommandExecute?.('xp', xpAmt.toString());
            audioEngine.playSuccessPing();
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'XP', message: `Telemetry updated: +${xpAmt} XP injected.`, flag: 'emerald' }
            ]);
          } else {
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: 'ERR: XP amount must be an integer.', flag: 'red' }
            ]);
          }
          break;
          
        case 'streak':
          const streakAmt = parseInt(value, 10);
          if (!isNaN(streakAmt) && streakAmt >= 0) {
            onCommandExecute?.('streak', streakAmt.toString());
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: `Streak synchronized to: ${streakAmt} Days.`, flag: 'emerald' }
            ]);
          } else {
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: 'ERR: Streak must be a non-negative integer.', flag: 'red' }
            ]);
          }
          break;
          
        case 'vayu':
          if (value.trim()) {
            onCommandExecute?.('vayu', value);
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'VAYU', message: `Query sent to VAYU. Processing telepathic callback...`, flag: 'purple' }
            ]);
          } else {
            setLogs(prev => [
              ...prev,
              { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: 'ERR: Query query cannot be empty (e.g. /vayu how to learn next.js)', flag: 'red' }
            ]);
          }
          break;
          
        default:
          setLogs(prev => [
            ...prev,
            { id: String(Math.random()), timestamp: timeStr(), tag: 'ALERT', message: `ERR: Unknown tactical protocol [/${action}]. Type /help for database index.`, flag: 'red' }
          ]);
      }
    } else {
      setLogs(prev => [
        ...prev,
        { id: String(Math.random()), timestamp: timeStr(), tag: 'SYS', message: `ECHO: "${cleanCmd}". (Type /help for system protocols)`, flag: 'cyan' }
      ]);
    }
  };

  return (
    <aside 
      style={{ width: `${width}px` }}
      className="hidden lg:flex flex-col h-full bg-base-obsidian border-l border-sys-groove flex-shrink-0 z-40 select-none overflow-hidden"
    >
      {/* 1. Terminal Telemetry Header */}
      <div className="h-14 border-b border-sys-groove px-4 flex items-center justify-between chamfered-edge bg-zinc-950/20 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-purple-400" />
          <span className="mono-meta text-zinc-300">Console Stream</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase">STREAMING</span>
        </div>
      </div>

      {/* 2. User XP & Title Portfolio Widget */}
      <div className="p-4 border-b border-sys-groove bg-zinc-950/40 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase">Title Rank</span>
            <span className="text-sm font-bold text-white tracking-tight mt-0.5">{getUserTitle(userXp)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase">Active Streak</span>
            <span className="text-sm font-bold text-amber-500 flex items-center gap-1 mt-0.5 animate-pulse">
              <Flame size={14} className="fill-amber-500/20" /> {userStreak} Days
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>Portfolio XP</span>
            <span className="text-purple-400 font-bold">{userXp} XP</span>
          </div>
          <div className="h-1.5 bg-zinc-900 border border-sys-groove rounded-full overflow-hidden p-[1px]">
            <div 
              className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_#8b5cf6]" 
              style={{ width: `${Math.min((userXp % 1000) / 10, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Real-Time Terminal Log Feed */}
      <div className="flex-1 p-3 font-mono text-[10px] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center text-zinc-500 border-b border-sys-groove/40 pb-2 mb-2 shrink-0">
          <span>CONSOLE LOGS</span>
          <button 
            onClick={onClearNotifications} 
            className="text-[9px] hover:text-zinc-300 font-bold uppercase cursor-pointer border-none bg-transparent"
          >
            Flush Buffer
          </button>
        </div>

        {/* Scrolling Log stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {logs.map((log) => {
            const flagColors = {
              red: 'text-rose-500',
              amber: 'text-amber-500',
              emerald: 'text-emerald-400',
              cyan: 'text-cyan-400',
              purple: 'text-purple-400',
            };

            return (
              <div key={log.id} className="flex items-start gap-2 py-0.5 leading-relaxed tracking-tight hover:bg-zinc-900/20 px-1 rounded transition-colors duration-100">
                <span className="text-zinc-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`font-bold shrink-0 select-none ${flagColors[log.flag]}`}>[{log.tag}]</span>
                <span className="text-zinc-300 break-all">{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Real-time Interactive Tactical Shell Command Input (CLI) */}
      <form onSubmit={handleCommandSubmit} className="border-t border-sys-groove bg-zinc-950 p-2.5 flex items-center gap-1.5 font-mono text-[10px] shrink-0 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
        <span className="text-purple-400 font-bold shrink-0 select-none">VV_SHELL&gt;</span>
        <input 
          type="text" 
          value={commandInput} 
          onChange={(e) => setCommandInput(e.target.value)} 
          placeholder="Type /help for tactical protocols..."
          className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700 uppercase leading-none py-0.5 tracking-wide font-semibold text-[10px]"
        />
        <button type="submit" className="hidden" />
      </form>

      {/* 5. Active Inbox Alerts */}
      <div className="h-[150px] border-t border-sys-groove p-3 flex flex-col bg-zinc-950/25 overflow-hidden shrink-0">
        <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase border-b border-sys-groove/40 pb-2 flex justify-between shrink-0">
          <span>ALERTS INBOX</span>
          <span className="text-[8px] px-1 bg-red-950/50 text-red-500 border border-red-500/20 rounded">
            {notifications.filter(n => !n.read).length} PENDING
          </span>
        </span>

        <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <span className="text-[10px] text-zinc-500">All alerts clear. No warnings.</span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    audioEngine.playClick();
                    onMarkNotificationRead(notif);
                  }}
                  className={`p-2.5 rounded-[4px] border cursor-pointer spring-transition flex items-start gap-2 relative ${
                    notif.read
                      ? 'bg-zinc-900/10 border-sys-groove text-zinc-500'
                      : 'bg-red-950/10 border-red-500/20 text-zinc-200 shadow-[0_2px_8px_rgba(244,63,94,0.05)]'
                  }`}
                >
                  <div className="mt-0.5 text-xs">
                    {notif.type === 'vayu' ? '🤖' : notif.type === 'dm' ? '💬' : '👥'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate leading-tight">{notif.title}</p>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5 leading-snug">{notif.body}</p>
                  </div>
                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 self-center animate-pulse" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </aside>
  );
}
