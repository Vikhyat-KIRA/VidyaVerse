'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, ShieldCheck, Hash, MessageSquare, Key, Plus, FileText, Trash2, Paperclip, ChevronLeft, Activity, Trophy, Users } from 'lucide-react';
import {
  Room, ChatMessage, subscribeToMessages, sendMessage
} from '@/lib/chat';
import { FocusSession } from '@/lib/focus';
import { UserProfile } from '@/lib/firebase';
import { awardXp } from '@/lib/exp';
import { useToast } from '@/components/Toast';

interface CommunityPanelProps {
  userUid: string;
  userName: string;
  activeRoom: Room | null;
  activeTab: 'guilds' | 'dms' | 'focus' | 'leaderboards';
  focusSessions: FocusSession[];
  leaderboard: UserProfile[];
  mobileView?: 'list' | 'content';
  onBackToMobileList?: () => void;
}

function formatMsgTime(timestamp: unknown): string {
  if (!timestamp) return '';
  let date: Date;
  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
    date = (timestamp as { toDate: () => Date }).toDate();
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return '';
  }
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
}

export default function CommunityPanel({ 
  userUid, 
  userName,
  activeRoom,
  activeTab,
  focusSessions,
  leaderboard,
  mobileView = 'content',
  onBackToMobileList,
}: CommunityPanelProps) {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(30);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to messages in the active room
  useEffect(() => {
    if (!activeRoom) return;

    const unsubscribe = subscribeToMessages(activeRoom.id, messageLimit, (newMsgs) => {
      setMessages(newMsgs);
      setTimeout(() => scrollToBottom(), 50);
    });

    return () => unsubscribe();
  }, [activeRoom, messageLimit]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || !activeRoom) return;
    setIsLoading(true);
    
    try {
      await sendMessage(activeRoom.id, input.trim(), userUid, userName);
      setInput('');
      await awardXp(userUid, 2); // +2 XP for participating in study guilds!
    } catch (e) {
      console.error(e);
      toast.error('Failed to transmit message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoomDisplayName = (room: Room) => {
    if (room.type === 'dm') {
      if (room.members.length === 1) {
        return `Pending DM invite`;
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
    <div className="h-full flex flex-col w-full relative bg-transparent overflow-hidden">
      {activeTab === 'guilds' || activeTab === 'dms' ? (
        activeRoom ? (
          <>
            {/* 1. Header Bar */}
            <div className="flex items-center justify-between p-3 border-b border-sys-groove bg-zinc-950/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile back trigger */}
                {onBackToMobileList && (
                  <button 
                    onClick={onBackToMobileList}
                    className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded bg-zinc-900 border border-sys-groove cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-sys-groove flex items-center justify-center text-zinc-300 font-mono font-bold text-xs">
                  {activeRoom.type === 'auto' ? <ShieldCheck size={14} className="text-purple-400" /> : <Hash size={14} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white leading-tight truncate flex items-center gap-1.5">
                    {getRoomDisplayName(activeRoom)}
                    {activeRoom.type === 'auto' && <Sparkles size={11} className="text-purple-400" />}
                  </h3>
                  <p className="text-[10px] text-zinc-500 truncate leading-snug">
                    {activeRoom.type === 'auto'
                      ? 'System Allocated Guild Chamber'
                      : activeRoom.type === 'dm'
                      ? 'Encrypted Private Feed'
                      : `Custom Study Cell · Code: ${activeRoom.inviteCode}`}
                  </p>
                </div>
              </div>

              {activeRoom.type === 'custom' && (
                <div className="px-2 py-0.5 bg-zinc-900 border border-sys-groove rounded font-mono text-[9px] font-bold text-zinc-400 uppercase">
                  Code: {activeRoom.inviteCode}
                </div>
              )}
            </div>

            {/* 2. Messages List (Flat Block Layout) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/10">
              {activeRoom.type === 'dm' && activeRoom.members.length === 1 && (
                <div className="p-4 rounded-[4px] border border-dashed border-purple-500/30 bg-purple-950/5 text-center max-w-md mx-auto my-4 space-y-2">
                  <Key className="mx-auto text-purple-400 animate-bounce" size={20} />
                  <p className="text-xs font-bold text-zinc-200">DM Channel Allocated!</p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Provide your study peer with this invite code. When they join, this channel locks into your private DM list!
                  </p>
                  <div className="inline-block bg-zinc-900 border border-sys-groove px-3 py-1 rounded font-mono text-xs font-bold text-purple-400 tracking-wider">
                    {activeRoom.inviteCode}
                  </div>
                </div>
              )}

              {messages.length > 0 && messages.length >= messageLimit && (
                <div className="flex justify-center py-2">
                  <button
                    onClick={() => setMessageLimit(prev => prev + 20)}
                    className="text-[10px] font-mono font-bold text-purple-400 hover:underline uppercase"
                  >
                    Load legacy buffer entries
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                activeRoom.type === 'dm' && activeRoom.members.length === 1 ? null : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <MessageSquare size={36} className="mb-2 text-zinc-600" />
                    <p className="text-[11px] text-zinc-500 font-mono uppercase">TRANSMISSION LOGS EMPTY</p>
                  </div>
                )
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === userUid;
                  const timeStr = formatMsgTime(msg.timestamp);

                  return (
                    <div 
                      key={msg.id || idx}
                      className="flex gap-3.5 items-start py-2 border-b border-sys-groove/20 hover:bg-zinc-900/10 px-2 rounded-[2px]"
                    >
                      {/* Square Avatar */}
                      <div className="w-8 h-8 rounded-[4px] bg-zinc-900 border border-sys-groove flex-shrink-0 flex items-center justify-center font-mono font-bold text-xs text-zinc-300">
                        {msg.senderName.substring(0, 2).toUpperCase()}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold ${isMe ? 'text-purple-400' : 'text-zinc-300'}`}>
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">{timeStr}</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-wrap select-text">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 3. Input Dock */}
            <div className="w-full min-h-[56px] bg-zinc-950/40 border-t border-sys-groove px-4 py-2 flex flex-col justify-center shrink-0">
              <div className="flex items-end gap-2.5">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="TRANSMIT MESSAGE TO CHANNELS..."
                    rows={1}
                    className="w-full bg-zinc-900/40 border border-sys-groove p-2.5 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 resize-none custom-scrollbar font-sans"
                    style={{ minHeight: '40px', maxHeight: '100px', paddingTop: '10px' }}
                  />
                </div>

                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="h-10 w-10 rounded-[4px] bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center cursor-pointer disabled:opacity-30 spring-transition active:scale-95 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <Users size={48} className="mb-3 text-zinc-600" />
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">SELECT STUDY CHANNEL OR DM FEED</p>
          </div>
        )
      ) : activeTab === 'focus' ? (
        /* Focus Room visual display */
        <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto no-scrollbar bg-black/10">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="text-rose-500 animate-pulse" size={16} />
              TACTICAL FOCUS ROOM
            </h3>
            <p className="text-[10px] text-zinc-500">Study status of users in your allocated nodes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {focusSessions.map(session => (
              <div 
                key={session.uid} 
                className="p-3.5 bg-zinc-900 border border-sys-groove rounded-[4px] flex flex-col justify-between chamfered-edge relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                      session.status === 'focusing' 
                        ? 'bg-rose-950/20 text-rose-400 border-rose-500/20' 
                        : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {session.status === 'focusing' ? '🔥 Focus' : '☕ Break'}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'focusing' ? 'bg-rose-500 animate-pulse-dot' : 'bg-emerald-500'}`} />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-200 truncate">{session.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 italic">&ldquo;{session.aim}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Global rankings */
        <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto no-scrollbar bg-black/10">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="text-amber-500" size={16} />
              ACADEMIC WEAPON LEADERBOARD
            </h3>
            <p className="text-[10px] text-zinc-500">Cumulative rankings across all VidyaVerse servers.</p>
          </div>

          <div className="space-y-1.5">
            {leaderboard.map((u, idx) => (
              <div 
                key={u.uid}
                className="p-2.5 bg-zinc-900 border border-sys-groove rounded-[4px] flex items-center justify-between hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 w-5">#{idx + 1}</span>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">{u.name}</h4>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wide">STUDENT PROFILE</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-purple-400">{u.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
