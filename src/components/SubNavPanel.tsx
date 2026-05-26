'use client';

import { 
  Users, Hash, Key, Plus, Activity, Trophy, ShieldCheck, MessageSquare, 
  Settings, Flame, Timer, Sparkles, Inbox, Zap, AlertTriangle, Play, HelpCircle
} from 'lucide-react';
import { Room } from '@/lib/chat';
import { FocusSession } from '@/lib/focus';
import { UserProfile } from '@/lib/firebase';
import { ActivePanel } from './UtilityDock';
import { audioEngine } from '@/lib/audio';

interface SubNavPanelProps {
  activePanel: ActivePanel;
  width?: number;
  
  // Community props lifted
  rooms: Room[];
  activeRoom: Room | null;
  setActiveRoom: (room: Room | null) => void;
  activeTab: 'guilds' | 'dms' | 'focus' | 'leaderboards';
  setActiveTab: (tab: 'guilds' | 'dms' | 'focus' | 'leaderboards') => void;
  guildsUnreadCount: number;
  dmsUnreadCount: number;
  roomUnreadCounts: Record<string, number>;
  focusSessions: FocusSession[];
  leaderboard: UserProfile[];
  userUid: string;
  userName: string;
  onMarkRoomRead: (roomId: string) => void;
  
  // Modals / Actions
  onShowJoinModal: () => void;
  onShowCreateModal: () => void;
  onShowJoinDmModal: () => void;
  onCreateDmRoom: () => void;

  // Flashcards props
  activeLeitnerBox: number | null; // null = all/due reviews
  setActiveLeitnerBox: (box: number | null) => void;
  leitnerCounts: Record<number, number>;
  totalDueCount: number;

  // Pomodoro presets
  onSelectPomodoroPreset: (minutes: number) => void;
  pomodoroTimerActive: boolean;

  // Boss Battle props
  battleDifficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  setBattleDifficulty: (diff: 'easy' | 'medium' | 'hard' | 'legendary') => void;
}

export default function SubNavPanel({
  activePanel,
  width = 240,
  rooms,
  activeRoom,
  setActiveRoom,
  activeTab,
  setActiveTab,
  guildsUnreadCount,
  dmsUnreadCount,
  roomUnreadCounts,
  focusSessions,
  leaderboard,
  userUid,
  userName,
  onMarkRoomRead,
  onShowJoinModal,
  onShowCreateModal,
  onShowJoinDmModal,
  onCreateDmRoom,
  activeLeitnerBox,
  setActiveLeitnerBox,
  leitnerCounts,
  totalDueCount,
  onSelectPomodoroPreset,
  pomodoroTimerActive,
  battleDifficulty,
  setBattleDifficulty,
}: SubNavPanelProps) {
  const getRoomDisplayName = (room: Room) => {
    if (room.type === 'dm') {
      if (room.members.length === 1) {
        return `Pending DM (${room.inviteCode || 'Created'})`;
      }
      if (room.dmUserNames) {
        const otherUid = room.members.find(uid => uid !== userUid);
        if (otherUid && room.dmUserNames[otherUid]) {
          return room.dmUserNames[otherUid];
        }
      }
    }
    return room.name;
  };

  return (
    <aside 
      style={{ width: `${width}px` }}
      className="hidden md:flex flex-col h-full bg-base-obsidian border-r border-sys-groove select-none flex-shrink-0 z-40 overflow-hidden"
    >
      {/* High-density tactical header with chamfered edge */}
      <div className="h-14 border-b border-sys-groove px-4 flex items-center justify-between chamfered-edge bg-zinc-950/20">
        <span className="mono-meta text-zinc-400">
          {activePanel === 'chat' && 'VAYU Core'}
          {activePanel === 'community' && 'Tactical Net'}
          {activePanel === 'flashcards' && 'Leitner Deck'}
          {activePanel === 'flashforge' && 'Forge Terminal'}
          {activePanel === 'pomodoro' && 'Focus Control'}
          {activePanel === 'bossbattle' && 'Combat Log'}
          {activePanel === 'settings' && 'Systems Config'}
        </span>
        <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-zinc-900 border border-sys-groove text-zinc-500">
          SYS_v3.2
        </span>
      </div>

      {/* Main scrolling sub-navigation content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
        {/* ========================================================
            1. CHAT PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'chat' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">AI Directives</p>
            <div className="flex flex-col gap-1">
              <div className="p-3 bg-zinc-900/30 border border-sys-groove rounded-[4px] relative overflow-hidden chamfered-edge">
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot m-2" />
                <p className="text-xs font-bold text-zinc-200">VAYU Mentor</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Online & tracking. Ready to roast, review, or resolve questions.</p>
              </div>
            </div>

            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1 mt-2">Study Modes</p>
            <div className="flex flex-col gap-1">
              {[
                { label: 'General Q&A', desc: 'Ask any academic question' },
                { label: 'Document Review', desc: 'Summarize or search PDFs' },
                { label: 'Socratic Roast', desc: 'Interactive slacker filter' }
              ].map((preset, idx) => (
                <div 
                  key={idx} 
                  className="p-2.5 rounded-[4px] border border-sys-groove bg-zinc-900/10 hover:bg-zinc-800/20 cursor-pointer spring-transition"
                >
                  <p className="text-xs font-bold text-zinc-300">{preset.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{preset.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            2. COMMUNITY PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'community' && (
          <div className="flex flex-col gap-3 h-full">
            {/* Tactical Grid Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-zinc-950/40 p-1 border border-sys-groove rounded-[4px]">
              <button 
                onClick={() => {
                  audioEngine.playClick();
                  setActiveTab('guilds');
                }}
                className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-[3px] spring-transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'guilds' ? 'bg-purple-950/30 text-purple-400 border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Users size={10} /> Guilds
              </button>
              <button 
                onClick={() => {
                  audioEngine.playClick();
                  setActiveTab('dms');
                }}
                className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-[3px] spring-transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'dms' ? 'bg-purple-950/30 text-purple-400 border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <MessageSquare size={10} /> DMs
              </button>
              <button 
                onClick={() => {
                  audioEngine.playClick();
                  setActiveTab('focus');
                }}
                className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-[3px] spring-transition flex items-center justify-center gap-1 cursor-pointer col-span-1 ${
                  activeTab === 'focus' ? 'bg-purple-950/30 text-purple-400 border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Activity size={10} /> Focus
              </button>
              <button 
                onClick={() => {
                  audioEngine.playClick();
                  setActiveTab('leaderboards');
                }}
                className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-[3px] spring-transition flex items-center justify-center gap-1 cursor-pointer col-span-1 ${
                  activeTab === 'leaderboards' ? 'bg-purple-950/30 text-purple-400 border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Trophy size={10} /> Rank
              </button>
            </div>

            {/* Context Content based on tab */}
            {activeTab === 'guilds' && (
              <div className="flex flex-col gap-2">
                {/* Actions */}
                <div className="flex gap-1.5">
                  <button 
                    onClick={onShowJoinModal}
                    className="flex-1 bg-zinc-900 border border-sys-groove hover:bg-zinc-800/50 text-[10px] font-bold text-zinc-300 py-1.5 rounded-[4px] flex items-center justify-center gap-1 cursor-pointer mechanical-press spring-transition"
                  >
                    <Key size={10} /> Join
                  </button>
                  <button 
                    onClick={onShowCreateModal}
                    className="flex-1 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 text-[10px] font-bold text-purple-400 py-1.5 rounded-[4px] flex items-center justify-center gap-1 cursor-pointer mechanical-press spring-transition"
                  >
                    <Plus size={10} /> Create
                  </button>
                </div>

                {/* Rooms List */}
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Channels</p>
                  {rooms.filter(r => r.type !== 'dm').length === 0 ? (
                    <p className="text-[10px] text-zinc-500 px-1 py-4 text-center">No channels joined.</p>
                  ) : (
                    rooms.filter(r => r.type !== 'dm').map(room => {
                      const isActive = activeRoom?.id === room.id;
                      const unread = roomUnreadCounts[room.id] || 0;
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            setActiveRoom(room);
                            onMarkRoomRead(room.id);
                          }}
                          className={`w-full text-left p-2 rounded-[4px] border spring-transition flex items-center gap-2 relative cursor-pointer ${
                            isActive 
                              ? 'bg-zinc-900 border-zinc-700 text-white' 
                              : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center text-zinc-400">
                            {room.type === 'auto' ? <ShieldCheck size={11} className="text-purple-400" /> : <Hash size={11} />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs truncate font-bold">{room.name}</p>
                          </div>
                          {unread > 0 && (
                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_6px_#8b5cf6]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dms' && (
              <div className="flex flex-col gap-2">
                {/* Actions */}
                <div className="flex gap-1.5">
                  <button 
                    onClick={onShowJoinDmModal}
                    className="flex-1 bg-zinc-900 border border-sys-groove hover:bg-zinc-800/50 text-[10px] font-bold text-zinc-300 py-1.5 rounded-[4px] flex items-center justify-center gap-1 cursor-pointer mechanical-press spring-transition"
                  >
                    <Key size={10} /> Join Dm
                  </button>
                  <button 
                    onClick={onCreateDmRoom}
                    className="flex-1 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 text-[10px] font-bold text-purple-400 py-1.5 rounded-[4px] flex items-center justify-center gap-1 cursor-pointer mechanical-press spring-transition"
                  >
                    <Plus size={10} /> Invite
                  </button>
                </div>

                {/* DM list */}
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Direct Feeds</p>
                  {rooms.filter(r => r.type === 'dm').length === 0 ? (
                    <p className="text-[10px] text-zinc-500 px-1 py-4 text-center">No private DMs.</p>
                  ) : (
                    rooms.filter(r => r.type === 'dm').map(room => {
                      const isActive = activeRoom?.id === room.id;
                      const unread = roomUnreadCounts[room.id] || 0;
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            setActiveRoom(room);
                            onMarkRoomRead(room.id);
                          }}
                          className={`w-full text-left p-2 rounded-[4px] border spring-transition flex items-center gap-2 relative cursor-pointer ${
                            isActive 
                              ? 'bg-zinc-900 border-zinc-700 text-white' 
                              : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-purple-950 flex items-center justify-center text-[10px] font-bold text-purple-300">
                            {getRoomDisplayName(room).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs truncate font-bold">{getRoomDisplayName(room)}</p>
                          </div>
                          {unread > 0 && (
                            <span className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_6px_#8b5cf6]" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'focus' && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Study Deck</p>
                <div className="flex flex-col gap-1.5">
                  {focusSessions.length === 0 ? (
                    <p className="text-[10px] text-zinc-500 px-1 py-4 text-center">No one is focusing.</p>
                  ) : (
                    focusSessions.map(session => (
                      <div key={session.uid} className="p-2 bg-zinc-950/40 border border-sys-groove rounded-[4px] flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-200 truncate max-w-[120px]">{session.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'focusing' ? 'bg-red-500 animate-pulse-dot' : 'bg-emerald-500'}`} />
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide truncate">{session.status === 'focusing' ? '🔥 GRINDING' : '☕ BREAK'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'leaderboards' && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Rankings</p>
                <div className="flex flex-col gap-1">
                  {leaderboard.slice(0, 10).map((u, i) => (
                    <div key={u.uid} className="flex items-center justify-between p-1.5 rounded-[4px] hover:bg-zinc-900/20 text-xs">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] font-mono text-zinc-500 w-4">#{i+1}</span>
                        <span className="font-bold text-zinc-300 truncate max-w-[110px]">{u.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">{u.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            3. FLASHCARDS PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'flashcards' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Leitner Deck</p>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => setActiveLeitnerBox(null)}
                className={`w-full text-left p-2.5 rounded-[4px] border spring-transition flex items-center justify-between cursor-pointer ${
                  activeLeitnerBox === null 
                    ? 'bg-zinc-900 border-zinc-700 text-white' 
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Inbox size={12} className="text-purple-400" />
                  Due Reviews
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-500/20">
                  {totalDueCount}
                </span>
              </button>
            </div>

            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1 mt-2">Leitner Boxes</p>
            <div className="flex flex-col gap-1">
              {[1, 2, 3, 4, 5].map((box) => {
                const isActive = activeLeitnerBox === box;
                const count = leitnerCounts[box] || 0;
                const boxLabels = ['Box 1 (Daily)', 'Box 2 (3 Days)', 'Box 3 (Weekly)', 'Box 4 (2 Weeks)', 'Box 5 (Monthly)'];

                return (
                  <button
                    key={box}
                    onClick={() => setActiveLeitnerBox(box)}
                    className={`w-full text-left p-2 rounded-[4px] border spring-transition flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? 'bg-zinc-900 border-zinc-700 text-white' 
                        : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                    }`}
                  >
                    <span className="text-xs font-bold truncate flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      {boxLabels[box - 1]}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-sys-groove">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            4. FLASHFORGE PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'flashforge' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Forge Queue</p>
            <div className="flex flex-col gap-1.5">
              <div className="p-3 bg-zinc-900/30 border border-sys-groove rounded-[4px] flex flex-col gap-2 relative overflow-hidden chamfered-edge">
                <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                  <AlertTriangle size={12} /> Limit Notice
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug">Attach textbook pages, lecture slides, or complex diagrams. VAYU will forge Leitner study cards instantly.</p>
              </div>
            </div>

            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1 mt-2">Capabilities</p>
            <div className="flex flex-col gap-1.5 text-[10px] font-mono text-zinc-500 p-1">
              <div className="flex items-center gap-2"><span className="w-1 h-1 bg-purple-500 rounded-full" /> PDF Document Parsing</div>
              <div className="flex items-center gap-2"><span className="w-1 h-1 bg-purple-500 rounded-full" /> Visual Diagram Extraction</div>
              <div className="flex items-center gap-2"><span className="w-1 h-1 bg-purple-500 rounded-full" /> AI Study Material Forge</div>
            </div>
          </div>
        )}

        {/* ========================================================
            5. POMODORO PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'pomodoro' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Sessions Presets</p>
            <div className="flex flex-col gap-1">
              {[
                { minutes: 25, label: 'Standard Focus', desc: '25m focus · 5m rest' },
                { minutes: 45, label: 'Hyperfocus Sprint', desc: '45m focus · 10m rest' },
                { minutes: 5, label: 'Short Coffee Break', desc: '5m session pause' },
                { minutes: 15, label: 'Long Recovery Break', desc: '15m session recovery' }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  disabled={pomodoroTimerActive}
                  onClick={() => onSelectPomodoroPreset(preset.minutes)}
                  className="w-full text-left p-2.5 rounded-[4px] border border-sys-groove bg-zinc-900/10 hover:bg-zinc-800/20 disabled:opacity-40 disabled:pointer-events-none spring-transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Play size={10} className="text-purple-400" />
                    {preset.label}
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{preset.desc}</p>
                </button>
              ))}
            </div>

            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1 mt-2">VAYU Co-op Policy</p>
            <div className="p-2.5 bg-zinc-950/40 border border-sys-groove rounded-[4px] text-[10px] text-zinc-500 leading-snug">
              Leaving the dashboard or pausing without permission is logged as a <span className="text-rose-500 font-bold">Focus Failure</span> and broadcasted to your guild. Grind hard! 💀
            </div>
          </div>
        )}

        {/* ========================================================
            6. BOSS BATTLE PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'bossbattle' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Select Difficulty</p>
            <div className="flex flex-col gap-1">
              {(['easy', 'medium', 'hard', 'legendary'] as const).map((diff) => {
                const isActive = battleDifficulty === diff;
                const colorMap = {
                  easy: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10',
                  medium: 'border-amber-500/20 text-amber-400 bg-amber-950/10',
                  hard: 'border-rose-500/20 text-rose-400 bg-rose-950/10',
                  legendary: 'border-purple-500/30 text-purple-400 bg-purple-950/20 shadow-[0_0_8px_rgba(139,92,246,0.15)]'
                };
                return (
                  <button
                    key={diff}
                    onClick={() => setBattleDifficulty(diff)}
                    className={`w-full text-left p-2.5 rounded-[4px] border spring-transition cursor-pointer uppercase font-mono font-bold text-[10px] tracking-wide flex items-center justify-between ${
                      isActive 
                        ? `${colorMap[diff]} border` 
                        : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                    }`}
                  >
                    <span>{diff} Difficulty</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1 mt-2">XP Potentials</p>
            <div className="p-2.5 bg-zinc-950/40 border border-sys-groove rounded-[4px] text-[10px] text-zinc-500 font-mono flex flex-col gap-1">
              <div className="flex justify-between"><span>EASY:</span> <span className="text-emerald-400">+10 XP</span></div>
              <div className="flex justify-between"><span>MEDIUM:</span> <span className="text-amber-400">+25 XP</span></div>
              <div className="flex justify-between"><span>HARD:</span> <span className="text-rose-400">+50 XP</span></div>
              <div className="flex justify-between"><span>LEGENDARY:</span> <span className="text-purple-400 font-extrabold">+100 XP</span></div>
            </div>
          </div>
        )}

        {/* ========================================================
            7. SETTINGS PANEL SUB-NAV
            ======================================================== */}
        {activePanel === 'settings' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase px-1">Settings Menu</p>
            <div className="flex flex-col gap-1">
              {[
                { label: 'Profile Settings', desc: 'Sync names & objectives' },
                { label: 'Push Notifications', desc: 'Manage system alarms' },
                { label: 'Tactical Customizer', desc: 'Adjust color channels' }
              ].map((menu, idx) => (
                <div 
                  key={idx} 
                  className="p-2.5 rounded-[4px] border border-sys-groove bg-zinc-900/10 hover:bg-zinc-800/20 cursor-pointer spring-transition"
                >
                  <p className="text-xs font-bold text-zinc-300">{menu.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{menu.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
