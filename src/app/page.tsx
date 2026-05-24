'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar, { type ActivePanel } from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import CommunityPanel from '@/components/CommunityPanel';
import FlashForge from '@/components/FlashForge';
import PomodoroCoach from '@/components/PomodoroCoach';
import SettingsPanel from '@/components/SettingsPanel';
import AuthScreen from '@/components/AuthScreen';
import FlashcardsPanel from '@/components/FlashcardsPanel';
import BossBattlePanel from '@/components/BossBattlePanel';
import LandingPage from '@/components/LandingPage';
import { ToastProvider } from '@/components/Toast';
import ScoreCard from '@/components/ScoreCard';
import { onAuthStateChanged, signOut, getUserProfile, type AppUser } from '@/lib/firebase';
import { getUserFromSheet } from '@/actions/sheets';
import { 
  scheduleStreakReminder, 
  updateLastVisit, 
  registerServiceWorker, 
  subscribeToPushNotifications, 
  sendBrowserNotification 
} from '@/lib/notifications';
import { Room, ensureAutoRooms } from '@/lib/chat';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AppView = 'landing' | 'auth' | 'dashboard';

export interface AppNotification {
  id: string;
  type: 'guild' | 'dm' | 'vayu';
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  roomId?: string; // for guilds/dms
}

function formatTimeAgo(timestamp: number): string {
  if (typeof window === 'undefined') return '';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [isDark, setIsDark] = useState(true); // SSR-safe default; corrected by useEffect
  const [userName, setUserName] = useState('Student');
  const [userAim, setUserAim] = useState('Become the best version of yourself');
  const [userXp, setUserXp] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [appView, setAppView] = useState<AppView>('landing');
  const [showScoreCard, setShowScoreCard] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [roomUnreadCounts, setRoomUnreadCounts] = useState<Record<string, number>>({});
  const [unreadVayu, setUnreadVayu] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  const totalUnreadNotifications = notifications.filter(n => !n.read).length;
  const unreadCommunity = Object.values(roomUnreadCounts).reduce((sum, count) => sum + count, 0);

  const handleMarkRoomRead = useCallback((roomId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`vidyaverse-room-read-${roomId}`, Date.now().toString());
    }
    setRoomUnreadCounts(prev => ({
      ...prev,
      [roomId]: 0
    }));
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleNotificationItemClick = useCallback((notif: AppNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setShowNotificationsDropdown(false);

    if (notif.type === 'vayu') {
      setActivePanel('chat');
      setUnreadVayu(false);
    } else if (notif.type === 'guild' || notif.type === 'dm') {
      setActivePanel('community');
      if (notif.roomId) {
        setActiveRoomId(notif.roomId);
        handleMarkRoomRead(notif.roomId);
      }
    }
  }, [handleMarkRoomRead]);

  const handleVayuResponseComplete = useCallback((text: string) => {
    if (activePanel !== 'chat') {
      setUnreadVayu(true);
      const timestamp = Date.now();
      const notifId = `vayu-${timestamp}`;
      const newNotif: AppNotification = {
        id: notifId,
        type: 'vayu',
        title: '🤖 VAYU Mentor',
        body: text.length > 60 ? `${text.slice(0, 60)}...` : text,
        timestamp,
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      sendBrowserNotification('🤖 VAYU Mentor', text, 'vayu', '/chat');
    }
  }, [activePanel]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        setAppView('dashboard');
        getUserProfile(firebaseUser.uid).then(profile => {
          if (profile) {
            setUserName(profile.name);
            setUserAim(profile.aim);
            setUserXp(profile.xp || 0);
            setUserStreak(profile.streak || 0);
            // Schedule streak reminder after we have the name
            scheduleStreakReminder(profile.name || 'Student');
          }
        });
        getUserFromSheet(firebaseUser.uid).then(sheetData => {
          if (sheetData) {
            setUserName(sheetData.name);
            setUserAim(sheetData.aim);
          }
        }).catch(() => {
          // Sheets unavailable — fall back to Firestore profile
        });
        updateLastVisit();
      }
    });

    return () => unsubscribe();
  }, []);

  // Cmd/Ctrl+K and number-key shortcuts
  useEffect(() => {
    if (appView !== 'dashboard') return;
    const panels: ActivePanel[] = ['chat', 'community', 'flashcards', 'flashforge', 'pomodoro', 'bossbattle', 'settings'];
    const handleKey = (e: KeyboardEvent) => {
      // Don't fire when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(p => !p);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        return;
      }
      // Number keys 1-7: switch panel
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= panels.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setActivePanel(panels[idx - 1]);
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appView]);

  // Theme management — read from localStorage on mount, persist on change
  useEffect(() => {
    // On first mount: read saved preference (pre-hydration script already
    // applied the class, so no flash; this just syncs React state)
    const saved = localStorage.getItem('vidyaverse-is-dark');
    if (saved === 'false') setIsDark(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // CSS variables that the theme customizer may have set inline
    const themeVars = [
      '--background', '--foreground', '--primary', '--primary-glow',
      '--accent', '--accent-glow', '--surface', '--surface-hover',
      '--border-color', '--muted', '--radius', '--glass-blur', '--glass-opacity',
      '--sidebar-bg', '--sidebar-border', '--sidebar-separator',
      '--mobile-nav-bg', '--tooltip-bg',
    ];

    if (isDark) {
      root.classList.remove('light');
      // Re-apply saved customizer theme (dark-mode overrides) if any
      try {
        const savedTheme = localStorage.getItem('vidyaverse-theme');
        if (savedTheme) {
          const vars = JSON.parse(savedTheme) as Record<string, string>;
          Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
        }
      } catch { /* ignore */ }
    } else {
      // Clear ALL inline CSS variable overrides so the .light class takes effect
      themeVars.forEach(k => root.style.removeProperty(k));
      root.classList.add('light');
    }
    localStorage.setItem('vidyaverse-is-dark', isDark ? 'true' : 'false');
  }, [isDark]);

  // Setup PWA Service Worker and Push Subscription
  useEffect(() => {
    if (!user) return;
    
    const initPwa = async () => {
      await registerServiceWorker();
      await subscribeToPushNotifications(user.uid);
    };

    initPwa();
  }, [user]);

  // Load rooms and listen to last messages in real-time
  useEffect(() => {
    if (!user) return;

    let unsubscribes: (() => void)[] = [];
    let isMounted = true;

    const setupRoomsAndListeners = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (!isMounted) return;

        // 1. Get Auto Rooms
        let autoRooms: Room[] = [];
        if (profile) {
          autoRooms = await ensureAutoRooms(profile);
        }

        // 2. Set up real-time listener for Custom/DM rooms the user is in
        const qCustom = query(collection(db, 'rooms'), where('members', 'array-contains', user.uid));
        
        const unsubCustom = onSnapshot(qCustom, (snapshot) => {
          if (!isMounted) return;
          
          const customRooms: Room[] = [];
          snapshot.forEach(doc => {
            customRooms.push(doc.data() as Room);
          });

          const allRooms = [...autoRooms, ...customRooms];
          setRooms(allRooms);

          // For each room, register a listener for the last message
          // Clean up previous message listeners
          unsubscribes.forEach(unsub => {
            if (unsub !== unsubCustom) unsub();
          });
          unsubscribes = [unsubCustom];

          allRooms.forEach(room => {
            const qMsg = query(
              collection(db, 'rooms', room.id, 'messages'),
              orderBy('timestamp', 'desc'),
              limit(1)
            );

            const unsubMsg = onSnapshot(qMsg, (msgSnap) => {
              if (msgSnap.empty) return;
              const lastMsgDoc = msgSnap.docs[0];
              const lastMsg = lastMsgDoc.data();
              
              // Skip if sent by current user
              if (lastMsg.senderId === user.uid) return;

              // Check if we should notify
              const lastReadStr = localStorage.getItem(`vidyaverse-room-read-${room.id}`);
              const lastReadTime = lastReadStr ? parseInt(lastReadStr, 10) : 0;
              const msgTime = lastMsg.timestamp?.seconds 
                ? lastMsg.timestamp.seconds * 1000 
                : lastMsg.timestamp?.toMillis?.() || Date.now();

              // If the message timestamp is newer than our last read time AND we are not currently viewing this room
              if (msgTime > lastReadTime && activeRoomId !== room.id) {
                // Increment unread count for this room
                setRoomUnreadCounts(prev => ({
                  ...prev,
                  [room.id]: (prev[room.id] || 0) + 1
                }));

                // Add to notification history in page.tsx state
                const notifId = lastMsgDoc.id || `${room.id}-${msgTime}`;
                
                setNotifications(prev => {
                  if (prev.some(n => n.id === notifId)) return prev;

                  const newNotif: AppNotification = {
                    id: notifId,
                    type: room.type === 'dm' ? 'dm' : 'guild',
                    title: room.type === 'dm' ? `DM from ${lastMsg.senderName}` : `${room.name}`,
                    body: `${lastMsg.senderName}: ${lastMsg.text}`,
                    timestamp: msgTime,
                    read: false,
                    roomId: room.id
                  };

                  return [newNotif, ...prev];
                });

                // Trigger desktop system alert
                sendBrowserNotification(
                  room.type === 'dm' ? `💬 DM from ${lastMsg.senderName}` : `👥 ${room.name}`,
                  lastMsg.text,
                  room.id,
                  `/community?room=${room.id}`
                );
              }
            });

            unsubscribes.push(unsubMsg);
          });
        });

        unsubscribes.push(unsubCustom);
      } catch (err) {
        console.error('Error setting up room listeners:', err);
      }
    };

    setupRoomsAndListeners();

    return () => {
      isMounted = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, activeRoomId]);

  // Synchronize activePanel notification states
  useEffect(() => {
    if (activePanel === 'chat') {
      setUnreadVayu(false);
    }
    if (activePanel !== 'community') {
      setActiveRoomId(null);
    }
  }, [activePanel]);

  // Handle click-navigation from browser notifications
  useEffect(() => {
    const handleNavigate = (url: string) => {
      if (url.startsWith('/community')) {
        setActivePanel('community');
        const match = url.match(/[?&]room=([^&]+)/);
        if (match && match[1]) {
          const roomId = match[1];
          setActiveRoomId(roomId);
          handleMarkRoomRead(roomId);
        }
      } else if (url.startsWith('/chat')) {
        setActivePanel('chat');
        setUnreadVayu(false);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        handleNavigate(customEvent.detail);
      }
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'navigate') {
        handleNavigate(event.data.url);
      }
    };

    window.addEventListener('vidyaverse-navigate', handleCustomEvent);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('vidyaverse-navigate', handleCustomEvent);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [handleMarkRoomRead]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setActivePanel('chat');
    setAppView('landing');
  };

  // Loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          className="flex flex-col items-center gap-5"
        >
          {/* Premium logo mark */}
          <div className="relative">
            <motion.div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(99,102,241,0.3)',
              }}
              animate={{ boxShadow: ['0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(99,102,241,0.3)', '0 0 0 1px rgba(255,255,255,0.1), 0 8px 48px rgba(99,102,241,0.5)', '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(99,102,241,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: 'inherit', letterSpacing: '-0.02em' }}>V</span>
            </motion.div>
            {/* Spinning ring */}
            <svg className="absolute -inset-2 animate-spin-slow" viewBox="0 0 64 64" style={{ width: 72, height: 72 }}>
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5" strokeDasharray="8 4" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>VidyaVerse</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Preparing your study universe…</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Landing page (unauthenticated, initial view)
  if (appView === 'landing' && !user) {
    return <LandingPage onEnterApp={() => setAppView('auth')} />;
  }

  // Auth screen (user clicked "Launch App" from landing)
  if (appView === 'auth' && !user) {
    return (
      <div className="relative">
        {/* Back to landing button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setAppView('landing')}
          className="fixed top-4 left-4 z-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </motion.button>
        <AuthScreen onAuthSuccess={() => { }} />
      </div>
    );
  }

  // Dashboard (authenticated)
  const PANEL_LIST: { id: ActivePanel; label: string; shortcut: string }[] = [
    { id: 'chat', label: 'VAYU Chat', shortcut: '1' },
    { id: 'community', label: 'Guilds', shortcut: '2' },
    { id: 'flashcards', label: 'Flashcards', shortcut: '3' },
    { id: 'flashforge', label: 'Flash-Forge', shortcut: '4' },
    { id: 'pomodoro', label: 'Pomodoro', shortcut: '5' },
    { id: 'bossbattle', label: 'Boss Battle', shortcut: '6' },
    { id: 'settings', label: 'Settings', shortcut: '7' },
  ];

  return (
    <ToastProvider>
      <div className="h-screen flex bg-grain" style={{ background: 'var(--background)' }}>
        {/* Ambient background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div
            animate={{ x: [0, 60, -30, 0], y: [0, -40, 25, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-32 right-0 w-[700px] h-[700px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 65%)' }}
          />
          <motion.div
            animate={{ x: [0, -50, 30, 0], y: [0, 35, -25, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-32 left-16 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.05), transparent 65%)' }}
          />
        </div>

        {/* Sidebar */}
        <Sidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          userName={userName}
          userXp={userXp}
          userStreak={userStreak}
          onSignOut={handleSignOut}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onShareScore={() => setShowScoreCard(true)}
          unreadVayu={unreadVayu}
          unreadCommunity={unreadCommunity}
        />

        {/* Main Content */}
        <main className="flex-1 ml-0 md:ml-[68px] pb-20 md:pb-0 relative z-10">
          <div className="h-full p-0 md:p-5">
            <AnimatePresence mode="wait">
              {activePanel === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <ChatPanel userUid={user!.uid} userName={userName} onResponseComplete={handleVayuResponseComplete} />
                </motion.div>
              )}
              {activePanel === 'community' && (
                <motion.div key="community" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <CommunityPanel 
                    userUid={user!.uid} 
                    userName={userName} 
                    roomUnreadCounts={roomUnreadCounts}
                    onMarkRoomRead={handleMarkRoomRead}
                    activeRoomId={activeRoomId}
                  />
                </motion.div>
              )}
              {activePanel === 'flashforge' && (
                <motion.div key="flashforge" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <FlashForge userUid={user!.uid} />
                </motion.div>
              )}
              {activePanel === 'pomodoro' && (
                <motion.div key="pomodoro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <PomodoroCoach userUid={user!.uid} userName={userName} userAim={userAim} />
                </motion.div>
              )}
              {activePanel === 'flashcards' && (
                <motion.div key="flashcards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <FlashcardsPanel userUid={user!.uid} />
                </motion.div>
              )}
              {activePanel === 'bossbattle' && (
                <motion.div key="bossbattle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <BossBattlePanel userUid={user!.uid} />
                </motion.div>
              )}
              {activePanel === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="h-full glass-card rounded-none md:rounded-[20px] border-x-0 md:border-x border-t-0 md:border-t p-3 md:p-5">
                  <SettingsPanel userUid={user!.uid} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ── Command Palette (Cmd+K) ──────────────────── */}
        <AnimatePresence>
          {showCommandPalette && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowCommandPalette(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="w-full max-w-sm rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(9,10,15,0.96)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Switch Panel</p>
                </div>
                <div className="py-2">
                  {PANEL_LIST.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePanel(p.id); setShowCommandPalette(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left"
                      style={{
                        background: activePanel === p.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                        color: activePanel === p.id ? '#818cf8' : 'var(--foreground)',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <span className="text-sm font-medium">{p.label}</span>
                      <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.06)' }}>{p.shortcut}</kbd>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Press number key to jump</span>
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.06)' }}>Esc</kbd>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bell Notification Center */}
        {user && (
          <div className="fixed top-4 right-4 z-[999] flex flex-col items-end">
            <button
              onClick={() => setShowNotificationsDropdown(p => !p)}
              className="relative p-2.5 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-color)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                color: 'var(--foreground)'
              }}
            >
              {/* Bell SVG */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`w-5 h-5 ${totalUnreadNotifications > 0 ? 'animate-bounce text-[var(--primary)]' : 'text-[var(--muted)]'}`}
                style={{
                  filter: totalUnreadNotifications > 0 ? 'drop-shadow(0 0 8px var(--primary-glow))' : 'none'
                }}
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>

              {/* Pulsing Badge */}
              {totalUnreadNotifications > 0 && (
                <span 
                  className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full text-[8px] font-extrabold flex items-center justify-center text-white"
                  style={{
                    background: 'var(--primary)',
                    boxShadow: '0 0 8px var(--primary-glow)',
                  }}
                >
                  {totalUnreadNotifications > 99 ? '99+' : totalUnreadNotifications}
                </span>
              )}
            </button>

            {/* Dropdown Container */}
            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="mt-3 w-80 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                  style={{
                    background: 'rgba(9, 10, 15, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(40px)',
                    maxHeight: '400px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Dropdown Header */}
                  <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      Inbox
                      {totalUnreadNotifications > 0 && (
                        <span 
                          className="text-[9px] font-black px-2 py-0.5 rounded-full text-white"
                          style={{
                            background: 'var(--primary)',
                            boxShadow: '0 0 6px var(--primary-glow)'
                          }}
                        >
                          {totalUnreadNotifications} NEW
                        </span>
                      )}
                    </h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-extrabold text-[var(--primary)] hover:underline border-none bg-transparent cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Dropdown Scroll Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-12 px-4 flex flex-col items-center justify-center text-center opacity-65">
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="1.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="w-10 h-10 text-[var(--muted)] mb-2"
                        >
                          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                        <p className="text-xs font-bold text-white">All caught up!</p>
                        <p className="text-[10px] text-[var(--muted)] mt-1">No recent notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {notifications.map((notif) => (
                          <button 
                            key={notif.id}
                            onClick={() => handleNotificationItemClick(notif)}
                            className="w-full p-4 transition-colors cursor-pointer hover:bg-white/5 flex gap-3 text-left relative border-none bg-transparent"
                            style={{
                              background: notif.read ? 'transparent' : 'rgba(99, 102, 241, 0.04)'
                            }}
                          >
                            {/* Unread Pill */}
                            {!notif.read && (
                              <span 
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                                style={{
                                  background: 'var(--primary)',
                                  boxShadow: '0 0 6px var(--primary-glow)'
                                }}
                              />
                            )}
                            
                            {/* Graphic Icon */}
                            <div 
                              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                              style={{
                                background: 
                                  notif.type === 'vayu' 
                                    ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' 
                                    : notif.type === 'dm'
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                                marginLeft: notif.read ? '0' : '4px'
                              }}
                            >
                              {notif.type === 'vayu' ? '🤖' : notif.type === 'dm' ? '💬' : '👥'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-xs truncate pr-2 ${notif.read ? 'text-[var(--muted)] font-medium' : 'text-white font-bold'}`}>{notif.title}</p>
                                <span className="text-[8px] text-[var(--muted)] whitespace-nowrap">
                                  {formatTimeAgo(notif.timestamp)}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">{notif.body}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Share Scorecard Modal ─────────────────────── */}
        <AnimatePresence>
          {showScoreCard && (
            <ScoreCard
              userName={userName}
              userXp={userXp}
              userStreak={userStreak}
              onClose={() => setShowScoreCard(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}
