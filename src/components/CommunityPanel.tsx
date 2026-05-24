'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Hash, Plus, Key, Send, Loader2, Sparkles, ShieldCheck, MessageSquare, Trophy, Activity, ChevronLeft, Mail, User, CornerUpLeft, X } from 'lucide-react';
import { getUserProfile, UserProfile } from '@/lib/firebase';
import {
  Room, ChatMessage, getUserRooms, createCustomRoom,
  joinRoomByCode, subscribeToMessages, sendMessage, startDirectMessage,
  createPrivateDmRoom, joinPrivateDmRoom
} from '@/lib/chat';
import { getUserTitle, getLeaderboard } from '@/lib/exp';
import { FocusSession, subscribeToFocusSessions } from '@/lib/focus';

interface CommunityPanelProps {
  userUid: string;
  userName: string;
  roomUnreadCounts?: Record<string, number>;
  onMarkRoomRead?: (roomId: string) => void;
  activeRoomId?: string | null;
}

// ─── Timestamp Helper ─────────────────────────────────────────────────────────
function formatMsgTime(timestamp: unknown): string {
  if (!timestamp) return '';
  let date: Date;
  // Firestore Timestamp object
  if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
    date = (timestamp as { toDate: () => Date }).toDate();
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CommunityPanel({ 
  userUid, 
  userName,
  roomUnreadCounts = {},
  onMarkRoomRead,
  activeRoomId
}: CommunityPanelProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Synchronize internal active room with external activeRoomId prop (for notification navigation)
  useEffect(() => {
    if (activeRoomId && rooms.length > 0) {
      const found = rooms.find(r => r.id === activeRoomId);
      if (found) {
        setActiveRoom(found);
        // Switch tab and show mobile view if applicable
        if (found.type === 'dm') {
          setActiveTab('dms');
        } else {
          setActiveTab('guilds');
        }
        setShowMobileChat(true);
      }
    }
  }, [activeRoomId, rooms]);

  const [messageInput, setMessageInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    text: string;
    senderName: string;
  } | null>(null);
  // Track which message is "active" for reply button — supports both hover (desktop) and tap (mobile)
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

  const handleMsgActivate = (msgKey: string) => setActiveMsgId(prev => prev === msgKey ? null : msgKey);
  const handleMsgDeactivate = () => setActiveMsgId(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showJoinDmModal, setShowJoinDmModal] = useState(false);
  const [dmJoinCode, setDmJoinCode] = useState('');

  const [activeTab, setActiveTab] = useState<'guilds' | 'dms' | 'focus' | 'leaderboards'>('guilds');
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sum unread counts for tab badges
  const guildsUnreadCount = rooms
    .filter(r => r.type !== 'dm')
    .reduce((sum, r) => sum + (roomUnreadCounts[r.id] || 0), 0);

  const dmsUnreadCount = rooms
    .filter(r => r.type === 'dm')
    .reduce((sum, r) => sum + (roomUnreadCounts[r.id] || 0), 0);

  // Sync Focus Room subscription
  useEffect(() => {
    if (activeTab !== 'focus') return;
    const unsubscribe = subscribeToFocusSessions((sessions) => {
      setFocusSessions(sessions);
    });
    return () => unsubscribe();
  }, [activeTab]);

  // Fetch global leaderboard
  useEffect(() => {
    if (activeTab !== 'leaderboards') return;
    getLeaderboard(50).then((users) => {
      setLeaderboard(users);
    });
  }, [activeTab]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  const loadData = async () => {
    setLoading(true);
    const p = await getUserProfile(userUid);

    if (p) {
      const userRooms = await getUserRooms(userUid, p);
      setRooms(userRooms);
      if (userRooms.length > 0 && !activeRoom) {
        setActiveRoom(userRooms[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!activeRoom) return;

    // Mark as read immediately when a room is opened
    if (onMarkRoomRead) {
      onMarkRoomRead(activeRoom.id);
    }

    const unsubscribe = subscribeToMessages(activeRoom.id, (newMsgs) => {
      setMessages(newMsgs);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [activeRoom, onMarkRoomRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoom) return;

    const text = messageInput.trim();
    const replySnapshot = replyingTo ? { ...replyingTo } : null;
    setMessageInput('');
    setReplyingTo(null);
    await sendMessage(
      activeRoom.id,
      text,
      userUid,
      userName,
      replySnapshot
        ? {
            replyToId: replySnapshot.id,
            replyToText: replySnapshot.text,
            replyToSenderName: replySnapshot.senderName,
          }
        : undefined
    );
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setModalLoading(true);
    setModalError('');
    try {
      const newRoom = await createCustomRoom(newRoomName, userUid);
      setRooms([...rooms, newRoom]);
      setActiveRoom(newRoom);
      setShowCreateModal(false);
      setNewRoomName('');
    } catch (err) {
      const error = err as { message?: string };
      setModalError(error.message || 'Failed to create room');
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    setModalLoading(true);
    setModalError('');
    try {
      const room = await joinRoomByCode(joinCode, userUid);
      // Check if already in room list to prevent duplicates
      if (!rooms.find(r => r.id === room.id)) {
        setRooms([...rooms, room]);
      }
      setActiveRoom(room);
      setShowJoinModal(false);
      setJoinCode('');
    } catch (err) {
      const error = err as { message?: string };
      setModalError(error.message || 'Invalid invite code');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateDmRoom = async () => {
    setModalLoading(true);
    try {
      const room = await createPrivateDmRoom(userUid, userName);
      setRooms(prev => [...prev, room]);
      setActiveRoom(room);
      setShowMobileChat(true);
    } catch (err) {
      console.error('Failed to create private DM:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleJoinDmRoom = async () => {
    if (!dmJoinCode.trim()) return;
    setModalLoading(true);
    setModalError('');
    try {
      const room = await joinPrivateDmRoom(dmJoinCode, userUid, userName);
      // Remove any pending room with the same id and add the fully-joined room
      setRooms(prev => {
        const filtered = prev.filter(r => r.id !== room.id);
        return [...filtered, room];
      });
      setActiveRoom(room);
      setShowJoinDmModal(false);
      setDmJoinCode('');
      setShowMobileChat(true);
    } catch (err) {
      const error = err as { message?: string };
      setModalError(error.message || 'Failed to join private DM');
    } finally {
      setModalLoading(false);
    }
  };

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

  const isMainActiveOnMobile = showMobileChat || (activeTab !== 'guilds' && activeTab !== 'dms');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 relative overflow-hidden">
      {/* Sidebar: Navigation & Lists */}
      <div className={`w-full md:w-64 flex-shrink-0 flex flex-col gap-4 h-full ${isMainActiveOnMobile ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-[var(--primary)]" />
            Community
          </h2>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border-color)] overflow-x-auto no-scrollbar scroll-smooth">
          <button 
            onClick={() => setActiveTab('guilds')}
            className={`flex-1 text-[10px] font-bold py-2 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 flex-shrink-0 min-w-[55px] ${activeTab === 'guilds' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            <Users size={11} />
            Guilds
            {guildsUnreadCount > 0 && (
              <span 
                className="min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-extrabold flex items-center justify-center ml-1 animate-pulse"
                style={{
                  background: activeTab === 'guilds' ? 'white' : 'var(--primary)',
                  color: activeTab === 'guilds' ? 'var(--primary)' : 'white',
                  boxShadow: activeTab === 'guilds' ? 'none' : '0 0 6px var(--primary-glow)',
                }}
              >
                {guildsUnreadCount > 99 ? '99+' : guildsUnreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('dms')}
            className={`flex-1 text-[10px] font-bold py-2 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 flex-shrink-0 min-w-[55px] ${activeTab === 'dms' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            <MessageSquare size={11} />
            DMs
            {dmsUnreadCount > 0 && (
              <span 
                className="min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-extrabold flex items-center justify-center ml-1 animate-pulse"
                style={{
                  background: activeTab === 'dms' ? 'white' : 'var(--primary)',
                  color: activeTab === 'dms' ? 'var(--primary)' : 'white',
                  boxShadow: activeTab === 'dms' ? 'none' : '0 0 6px var(--primary-glow)',
                }}
              >
                {dmsUnreadCount > 99 ? '99+' : dmsUnreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('focus')}
            className={`flex-1 text-[10px] font-bold py-2 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 flex-shrink-0 min-w-[55px] ${activeTab === 'focus' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            <Activity size={11} className={focusSessions.length > 0 ? "animate-pulse text-red-500" : ""} />
            Focus
          </button>
          <button 
            onClick={() => setActiveTab('leaderboards')}
            className={`flex-1 text-[10px] font-bold py-2 px-1 rounded-lg transition-colors flex items-center justify-center gap-1 flex-shrink-0 min-w-[55px] ${activeTab === 'leaderboards' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            <Trophy size={11} />
            Rank
          </button>
        </div>

        {activeTab === 'guilds' && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-ghost flex-1 text-xs flex items-center justify-center gap-1 py-2 px-0"
              >
                <Key size={14} /> Join
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex-1 text-xs flex items-center justify-center gap-1 py-2 px-0"
              >
                <Plus size={14} /> Create
              </button>
            </div>

            {/* Rooms List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {rooms.filter(r => r.type !== 'dm').map(room => {
                const unreadCount = roomUnreadCounts[room.id] || 0;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveRoom(room);
                      setShowMobileChat(true);
                      if (onMarkRoomRead) onMarkRoomRead(room.id);
                    }}
                    className="w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group relative"
                    style={{
                      background: activeRoom?.id === room.id ? 'rgba(108, 99, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${activeRoom?.id === room.id ? 'var(--primary)' : 'var(--border-color)'}`
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: room.type === 'auto' ? 'rgba(108, 99, 255, 0.2)' : 'rgba(0, 240, 255, 0.2)',
                        boxShadow: unreadCount > 0 ? (room.type === 'auto' ? '0 0 8px rgba(108, 99, 255, 0.4)' : '0 0 8px rgba(0, 240, 255, 0.4)') : 'none'
                      }}
                    >
                      {room.type === 'auto' ? <ShieldCheck size={16} color="#6c63ff" /> : <Hash size={16} color="#00f0ff" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-white' : 'font-semibold text-[var(--foreground)]'}`}>{room.name}</p>
                      <p className="text-[10px] text-[var(--muted)]">
                        {room.type === 'auto' ? 'Global Room' : `Code: ${room.inviteCode}`}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span 
                        className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center text-white flex-shrink-0 animate-pulse"
                        style={{
                          background: 'var(--primary)',
                          boxShadow: '0 0 8px var(--primary-glow)',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'dms' && (
          <>
            {/* DM Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleCreateDmRoom}
                className="btn-primary flex-1 text-[10px] py-2 flex items-center justify-center gap-1 border-none cursor-pointer"
                title="Create a new private chat room code"
              >
                <Plus size={11} /> Create Chat
              </button>
              <button
                onClick={() => {
                  setModalError('');
                  setShowJoinDmModal(true);
                }}
                className="btn-ghost flex-1 text-[10px] py-2 flex items-center justify-center gap-1 border border-[var(--border-color)] cursor-pointer"
                title="Enter your friend's private code to join"
              >
                <Key size={11} /> Enter Code
              </button>
            </div>

            {/* DMs List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {rooms.filter(r => r.type === 'dm').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-[var(--border-color)] rounded-2xl opacity-60">
                  <User size={28} className="text-[var(--primary)] mb-2" />
                  <h4 className="text-xs font-bold text-[var(--foreground)]">Direct Messages</h4>
                  <p className="text-[9px] text-[var(--muted)] mt-1">
                    No private chats yet. Tap 'Create Chat' to generate a special code, or 'Enter Code' to join a friend's private chat! 🔒
                  </p>
                </div>
              ) : (
                rooms.filter(r => r.type === 'dm').map(room => {
                  const unreadCount = roomUnreadCounts[room.id] || 0;
                  return (
                    <button
                      key={room.id}
                      onClick={() => {
                        setActiveRoom(room);
                        setShowMobileChat(true);
                        if (onMarkRoomRead) onMarkRoomRead(room.id);
                      }}
                      className="w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group relative"
                      style={{
                        background: activeRoom?.id === room.id ? 'rgba(108, 99, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${activeRoom?.id === room.id ? 'var(--primary)' : 'var(--border-color)'}`
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-[var(--primary)]/10 text-[var(--primary)]"
                        style={{
                          boxShadow: unreadCount > 0 ? '0 0 8px rgba(108, 99, 255, 0.4)' : 'none'
                        }}
                      >
                        {getRoomDisplayName(room).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-white' : 'font-semibold text-[var(--foreground)]'}`}>{getRoomDisplayName(room)}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {room.members.length === 1 ? 'Waiting for Friend...' : 'Private Chat'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span 
                          className="min-w-[16px] h-4 px-1 rounded-full text-[9px] font-extrabold flex items-center justify-center text-white flex-shrink-0 animate-pulse"
                          style={{
                            background: 'var(--primary)',
                            boxShadow: '0 0 8px var(--primary-glow)',
                          }}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {activeTab === 'focus' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border border-dashed border-[var(--border-color)] rounded-2xl opacity-60">
            <Activity size={32} className="text-[var(--primary)] mb-2 animate-pulse" />
            <h4 className="text-xs font-bold text-[var(--foreground)]">Multiplayer Focus Room</h4>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Active study status of users in your community. Quit early and VAYU shames you publicly! 💀
            </p>
          </div>
        )}

        {activeTab === 'leaderboards' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4 border border-dashed border-[var(--border-color)] rounded-2xl opacity-60">
            <Trophy size={32} className="text-[#ffb300] mb-2" />
            <h4 className="text-xs font-bold text-[var(--foreground)]">Global Rankings</h4>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Top Academic Weapons of VidyaVerse. Grind harder to climb the board! 🏆
            </p>
          </div>
        )}
      </div>

      {/* Main Panel Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 h-full ${!isMainActiveOnMobile ? 'hidden md:flex' : 'flex'}`} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        {activeTab === 'guilds' || activeTab === 'dms' ? (
          activeRoom ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 -ml-2 text-[var(--primary)] hover:bg-white/5 rounded-xl transition-colors cursor-pointer border-none bg-transparent flex-shrink-0"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h3 className="font-bold flex items-center gap-2 truncate">
                      {getRoomDisplayName(activeRoom)}
                      {activeRoom.type === 'auto' && <Sparkles size={14} className="text-[var(--primary)]" />}
                    </h3>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {activeRoom.type === 'auto'
                        ? 'Everyone with your profile is here automatically.'
                        : activeRoom.type === 'dm'
                        ? 'Private 1-on-1 direct message space.'
                        : `Invite your friends with code: ${activeRoom.inviteCode}`}
                    </p>
                  </div>
                </div>
                {activeRoom.type === 'custom' && (
                  <div className="px-3 py-1 rounded-lg text-xs font-mono font-bold" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff' }}>
                    {activeRoom.inviteCode}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {activeRoom.type === 'dm' && activeRoom.members.length === 1 && (
                  <div className="p-4 rounded-xl border border-dashed border-[var(--primary)] bg-[var(--primary)]/5 text-center space-y-2 mb-4 flex-shrink-0">
                    <Key className="mx-auto text-[var(--primary)] animate-bounce" size={24} />
                    <h4 className="text-sm font-bold text-[var(--foreground)]">Private 1-on-1 Chat Created!</h4>
                    <p className="text-xs text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
                      Give this special invite code to your friend. Once they enter it, they will instantly join and this room will lock into your private DM!
                    </p>
                    <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border-color)] px-4 py-1.5 rounded-lg font-mono text-base font-bold text-[var(--primary)] tracking-wider">
                      {activeRoom.inviteCode}
                    </div>
                  </div>
                )}
                {messages.length === 0 ? (
                  activeRoom.type === 'dm' && activeRoom.members.length === 1 ? null : (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--muted)] opacity-50">
                      <MessageSquare size={48} className="mb-2" />
                      <p className="text-sm">No messages yet. Be the first to say hi!</p>
                    </div>
                  )
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === userUid;
                    const timeStr = formatMsgTime(msg.timestamp);
                    const msgKey = msg.id || String(idx);
                    const isActive = activeMsgId === msgKey;
                    const replyBtn = (
                      <motion.button
                        initial={false}
                        animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 0.75 }}
                        transition={{ duration: 0.12 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo({ id: msgKey, text: msg.text, senderName: msg.senderName });
                          setActiveMsgId(null);
                        }}
                        className="self-center flex-shrink-0 p-2 rounded-full"
                        style={{
                          background: 'rgba(99,102,241,0.14)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          pointerEvents: isActive ? 'auto' : 'none',
                          // Always occupy space so layout doesn't shift; just invisible
                        }}
                        title="Reply"
                        aria-label="Reply to message"
                      >
                        <CornerUpLeft size={13} />
                      </motion.button>
                    );
                    return (
                      <div
                        key={msgKey}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-1`}
                        style={{ marginBottom: '2px' }}
                        onMouseEnter={() => setActiveMsgId(msgKey)}
                        onMouseLeave={handleMsgDeactivate}
                        onClick={() => handleMsgActivate(msgKey)}
                      >
                        {/* Reply btn left (others' msgs) */}
                        {!isMe && <span className="mb-1">{replyBtn}</span>}

                        <div className={`max-w-[78%] sm:max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && <span className="text-[10px] text-[var(--muted)] ml-1 mb-0.5 font-medium">{msg.senderName}</span>}
                          <div
                            className="px-3.5 py-2.5 rounded-2xl text-sm break-words leading-relaxed"
                            style={{
                              background: isMe ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'var(--surface)',
                              color: isMe ? 'white' : 'var(--foreground)',
                              border: isMe ? 'none' : '1px solid var(--border-color)',
                              boxShadow: isMe
                                ? '0 2px 10px rgba(99,102,241,0.25)'
                                : '0 1px 3px rgba(0,0,0,0.1)',
                              borderBottomRightRadius: isMe ? '4px' : '18px',
                              borderBottomLeftRadius: !isMe ? '4px' : '18px',
                            }}
                          >
                            {/* Quoted reply preview */}
                            {msg.replyToId && msg.replyToText && (
                              <div
                                className="mb-2 px-2 py-1.5 rounded-lg"
                                style={{
                                  background: isMe ? 'rgba(255,255,255,0.13)' : 'rgba(99,102,241,0.08)',
                                  borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.55)' : 'var(--primary)'}`,
                                }}
                              >
                                <p
                                  className="text-[10px] font-bold mb-0.5 truncate"
                                  style={{ color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--primary)' }}
                                >
                                  {msg.replyToSenderName}
                                </p>
                                <p
                                  className="text-[11px] leading-snug"
                                  style={{
                                    color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--muted)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {msg.replyToText}
                                </p>
                              </div>
                            )}
                            {msg.text}
                          </div>
                          {/* Timestamp */}
                          {timeStr && (
                            <span
                              className="text-[9px] mt-0.5 select-none px-1"
                              style={{ color: 'var(--muted)', opacity: 0.6 }}
                            >
                              {timeStr}
                            </span>
                          )}
                        </div>

                        {/* Reply btn right (own msgs) */}
                        {isMe && <span className="mb-1">{replyBtn}</span>}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                {/* Reply bar */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl"
                      style={{
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderLeft: '3px solid var(--primary)',
                      }}
                    >
                      <CornerUpLeft size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>
                          Replying to {replyingTo.senderName}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>
                          {replyingTo.text}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="p-1 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                        aria-label="Cancel reply"
                      >
                        <X size={13} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={replyingTo ? `Replying to ${replyingTo.senderName}…` : `Message ${getRoomDisplayName(activeRoom)}...`}
                    className="input-glass w-full pr-12"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="absolute right-2 p-2 rounded-lg transition-colors"
                    style={{
                      color: messageInput.trim() ? 'white' : 'var(--muted)',
                      background: messageInput.trim() ? 'var(--primary)' : 'transparent'
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--muted)]">
              <Users size={64} className="mb-4 opacity-20" />
              <p>{activeTab === 'dms' ? 'Select a DM or start a new private chat.' : 'Select a guild or create a custom room to start chatting.'}</p>
            </div>
          )
        ) : activeTab === 'focus' ? (
          <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-red-500 animate-pulse" />
                  Live Focus Room
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  Co-op studying session. Watch your friends focus in real-time!
                </p>
              </div>
              <span className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full border border-red-500/20">
                🔴 {focusSessions.length} Studying
              </span>
            </div>

            {focusSessions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--border-color)] rounded-2xl">
                <Activity size={48} className="text-[var(--muted)] mb-3 opacity-30" />
                <p className="text-sm font-semibold text-[var(--foreground)]">No active study sessions</p>
                <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">
                  Start your Pomodoro focus timer to join the room and show your community you&apos;re grinding!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {focusSessions.map((session) => (
                  <motion.div
                    key={session.uid}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl glass-card border border-[var(--border-color)] flex flex-col justify-between relative overflow-hidden"
                    style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                  >
                    {/* Glowing highlight */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full filter blur-xl" />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'focusing' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                          {session.status === 'focusing' ? '🔥 FOCUSING' : '☕ BREAK'}
                        </span>
                        <span className="flex h-2 w-2 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${session.status === 'focusing' ? 'bg-red-400' : 'bg-green-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${session.status === 'focusing' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-[var(--foreground)] truncate">{session.name}</h4>
                      <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2 italic">
                        &ldquo;{session.aim || 'Becoming the best version of myself'}&rdquo;
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--muted)]">Status: {session.status === 'focusing' ? 'Grinding' : 'Chilling'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="text-[#ffb300]" />
                Global Leaderboard
              </h3>
              <p className="text-xs text-[var(--muted)]">
                The top study weapons of the entire VidyaVerse educational universe.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {leaderboard.map((user, idx) => {
                const isTop3 = idx < 3;
                const trophyColor = idx === 0 ? '#ffb300' : idx === 1 ? '#cccccc' : '#b57a55';
                const isMe = user.uid === userUid;

                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="p-4 rounded-2xl flex items-center justify-between transition-all"
                    style={{
                      background: isMe ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isMe ? 'var(--primary)' : 'var(--border-color)'}`
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {isTop3 ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white/5 border border-white/10" style={{ color: trophyColor }}>
                          <Trophy size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-bold text-[var(--muted)]">
                          #{idx + 1}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                          {user.name}
                          {isMe && <span className="text-[10px] bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded-full font-bold">YOU</span>}
                        </h4>
                        <p className="text-[10px] text-[var(--muted)] font-semibold uppercase mt-0.5">
                          {getUserTitle(user.xp || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-[var(--primary)]">{user.xp || 0} XP</span>
                        <p className="text-[9px] text-[var(--muted)] mt-0.5">🚀 Title Rank</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* Join Modal */}
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
          >
            <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">Join Custom Room</h3>
              {modalError && <p className="text-red-400 text-xs mb-3">{modalError}</p>}
              <input
                type="text"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="input-glass w-full mb-4 font-mono uppercase tracking-widest text-center text-lg"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowJoinModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleJoinRoom} disabled={modalLoading || joinCode.length < 6} className="btn-primary flex-1">
                  {modalLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
          >
            <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-4">Create Study Group</h3>
              {modalError && <p className="text-red-400 text-xs mb-3">{modalError}</p>}
              <input
                type="text"
                placeholder="e.g. Physics Night before Exam"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                className="input-glass w-full mb-4"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCreateModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleCreateRoom} disabled={modalLoading || !newRoomName} className="btn-primary flex-1">
                  {modalLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Start DM Modal */}
        {showJoinDmModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}
          >
            <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold mb-1">Join Private DM</h3>
              <p className="text-xs text-[var(--muted)] mb-4">Enter your friend's 6-character private chat code to join. 🔒</p>
              {modalError && <p className="text-red-400 text-xs mb-3">{modalError}</p>}
              <input
                type="text"
                placeholder="Enter 6-character code"
                value={dmJoinCode}
                onChange={e => setDmJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="input-glass w-full mb-4 font-mono uppercase tracking-widest text-center text-lg"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowJoinDmModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleJoinDmRoom} disabled={modalLoading || dmJoinCode.length < 6} className="btn-primary flex-1">
                  {modalLoading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
