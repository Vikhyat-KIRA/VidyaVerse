'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

import Sidebar, { type ActivePanel } from '@/components/Sidebar';
import AuthScreen from '@/components/AuthScreen';
import LandingPage from '@/components/LandingPage';
import { ToastProvider } from '@/components/Toast';

// Loading fallback spinner component
const PanelLoading = () => (
  <div className="h-full flex items-center justify-center">
    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
  </div>
);

// Dynamically imported panels for code-splitting
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: PanelLoading
});
const CommunityPanel = dynamic(() => import('@/components/CommunityPanel'), {
  ssr: false,
  loading: PanelLoading
});
const FlashForge = dynamic(() => import('@/components/FlashForge'), {
  ssr: false,
  loading: PanelLoading
});
const PomodoroCoach = dynamic(() => import('@/components/PomodoroCoach'), {
  ssr: false,
  loading: PanelLoading
});
const SettingsPanel = dynamic(() => import('@/components/SettingsPanel'), {
  ssr: false,
  loading: PanelLoading
});
const FlashcardsPanel = dynamic(() => import('@/components/FlashcardsPanel'), {
  ssr: false,
  loading: PanelLoading
});
const BossBattlePanel = dynamic(() => import('@/components/BossBattlePanel'), {
  ssr: false,
  loading: PanelLoading
});
const ScoreCard = dynamic(() => import('@/components/ScoreCard'), {
  ssr: false
});

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
      <div className="h-screen flex text-white selection:bg-indigo-500/30 overflow-hidden relative font-sans" style={{ background: '#08080a' }}>
        {/* Cinematic Ambient Lighting & Noise */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 mix-blend-screen">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}></div>
          <motion.div
            animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-64 -right-32 w-[900px] h-[900px] rounded-full blur-[120px]"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09), transparent 70%)' }}
          />
          <motion.div
            animate={{ x: [0, -70, 50, 0], y: [0, 50, -30, 0] }}
            transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-64 -left-32 w-[800px] h-[800px] rounded-full blur-[100px]"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06), transparent 70%)' }}
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
        <main className="flex-1 relative z-10 p-3 md:py-6 md:pr-6 md:pl-[100px] flex flex-col h-full overflow-hidden">
             
             {/* Shell Header Container (If we want breadcrumbs or extra layout header) - For minimal huly style, we skip and go right to waterfall */}
              
             <div className="flex-1 relative w-full h-full object-cover">
               {/* Huly Waterfall Wrapper Ring */}
               <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl huly-waterfall-wrap opacity-60 mix-blend-screen scale-[1.002]"></div>
               
               {/* Content Inner Border constraints matching huly wraps */}
               <div className="absolute inset-[1px] md:inset-[1.5px] rounded-3xl overflow-hidden grid shadow-2xl backdrop-blur-[64px]" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', background: 'rgba(12, 12, 14, 0.75)'}}>
                <AnimatePresence>
                {activePanel === 'chat' && (
                  <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                    <ChatPanel userUid={user!.uid} userName={userName} onResponseComplete={handleVayuResponseComplete} />
                  </motion.div>
                )}
                {activePanel === 'community' && (
                  <motion.div key="community" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
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
                  <motion.div key="flashforge" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                    <FlashForge userUid={user!.uid} />
                  </motion.div>
                )}
                {activePanel === 'pomodoro' && (
                  <motion.div key="pomodoro" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                    <PomodoroCoach userUid={user!.uid} userName={userName} userAim={userAim} />
                  </motion.div>
                )}
                {activePanel === 'flashcards' && (
                  <motion.div key="flashcards" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                    <FlashcardsPanel userUid={user!.uid} />
                  </motion.div>
                )}
                {activePanel === 'bossbattle' && (
                  <motion.div key="bossbattle" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                    <BossBattlePanel userUid={user!.uid} />
                  </motion.div>
                )}
                {activePanel === 'settings' && (
                  <motion.div key="settings" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} style={{ willChange: 'transform, opacity', gridArea: '1/1' }} className="h-full border-none p-3 md:p-6 z-10 w-full overflow-hidden">
                      <SettingsPanel userUid={user!.uid} onChangeName={(n)=>setUserName(n)} onChangeAim={setUserAim} currentName={userName} currentAim={userAim} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
              onClick={() => setShowCommandPalette(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                className="w-full max-w-sm rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-color)', background: 'rgba(18, 18, 20, 0.98)', backdropFilter: 'blur(32px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="px-4 pt-4 pb-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--sidebar-separator)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Command Menu</p>
                  <span className="text-[9px] font-mono opacity-50 px-1 py-0.5 rounded border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>⌘K</span>
                </div>
                <div className="py-2">
                  {PANEL_LIST.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePanel(p.id); setShowCommandPalette(false); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 transition-all text-left border-none"
                      style={{
                        background: activePanel === p.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                        color: activePanel === p.id ? 'var(--foreground)' : 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <span className="text-xs font-semibold">{p.label}</span>
                      <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.05)' }}>{p.shortcut}</kbd>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--sidebar-separator)' }}>
                  <span className="text-[9px]" style={{ color: 'var(--muted)' }}>Select or press number keys to jump</span>
                  <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid rgba(255,255,255,0.05)' }}>Esc</kbd>
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
              className="relative p-2.5 rounded-lg border transition-all duration-300 cursor-pointer hover:scale-102 active:scale-98 flex items-center justify-center"
              style={{
                background: 'rgba(18, 18, 20, 0.7)',
                borderColor: 'var(--border-color)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
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
                className={`w-4 h-4 ${totalUnreadNotifications > 0 ? 'animate-bounce text-[var(--primary)]' : 'text-[var(--muted)]'}`}
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
                  className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full text-[8px] font-extrabold flex items-center justify-center text-white"
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
                  className="mt-3 w-80 rounded-xl overflow-hidden shadow-2xl flex flex-col"
                  style={{
                    background: 'rgba(18, 18, 20, 0.98)',
                    border: '1px solid var(--border-color)',
                    backdropFilter: 'blur(32px)',
                    maxHeight: '400px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* Dropdown Header */}
                  <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--sidebar-separator)' }}>
                    <h4 className="text-[10px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                      Inbox
                      {totalUnreadNotifications > 0 && (
                        <span 
                          className="text-[8px] font-black px-2 py-0.5 rounded-full text-white"
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
                        className="text-[9px] font-extrabold text-[var(--primary)] hover:underline border-none bg-transparent cursor-pointer"
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
