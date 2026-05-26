'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

import UtilityDock from '@/components/UtilityDock';
import SubNavPanel from '@/components/SubNavPanel';
import WorkspaceCanvas from '@/components/WorkspaceCanvas';
import ConsoleStream from '@/components/ConsoleStream';

import AuthScreen from '@/components/AuthScreen';
import LandingPage from '@/components/LandingPage';
import { ToastProvider, useToast } from '@/components/Toast';
import { audioEngine } from '@/lib/audio';

// Loading fallback spinner component
const PanelLoading = () => (
  <div className="h-full flex items-center justify-center bg-panel-graphite border border-sys-groove">
    <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
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
import { db, UserProfile } from '@/lib/firebase';
import { FocusSession, subscribeToFocusSessions } from '@/lib/focus';
import { getLeaderboard } from '@/lib/exp';
import { getFlashcards, type Flashcard } from '@/lib/flashcards';

export type ActivePanel = 'chat' | 'community' | 'flashcards' | 'flashforge' | 'pomodoro' | 'bossbattle' | 'settings';
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

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [userName, setUserName] = useState('Student');
  const [userAim, setUserAim] = useState('Become the best version of yourself');
  const [userXp, setUserXp] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [appView, setAppView] = useState<AppView>('landing');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Dynamic skeuomorphic panel column widths (resizable)
  const [subNavWidth, setSubNavWidth] = useState(240);
  const [consoleWidth, setConsoleWidth] = useState(380);

  // Vayu AI brand status states for ambient chromatic leak glows & top brand orb animation
  const [vayuThinking, setVayuThinking] = useState(false);
  const [vayuSpeaking, setVayuSpeaking] = useState(false);

  // Responsive Mobile Fallback states
  // 'list' = showing SubNavPanel lists, 'content' = showing active WorkspaceCanvas
  const [mobileView, setMobileView] = useState<'list' | 'content'>('list');

  // Multi-panel lift states: Community
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeTab, setActiveTab] = useState<'guilds' | 'dms' | 'focus' | 'leaderboards'>('guilds');
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);

  // Multi-panel lift states: Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeLeitnerBox, setActiveLeitnerBox] = useState<number | null>(null);

  // Multi-panel lift states: Pomodoro Presets
  const [pomodoroPresetMinutes, setPomodoroPresetMinutes] = useState<number | null>(null);
  const [pomodoroTimerActive, setPomodoroTimerActive] = useState<boolean>(false);

  // Multi-panel lift states: Boss Battle
  const [battleDifficulty, setBattleDifficulty] = useState<'easy' | 'medium' | 'hard' | 'legendary'>('medium');

  // Modals inside sub-nav
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showJoinDmModal, setShowJoinDmModal] = useState(false);
  const [dmJoinCode, setDmJoinCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [roomUnreadCounts, setRoomUnreadCounts] = useState<Record<string, number>>({});
  const [unreadVayu, setUnreadVayu] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const totalUnreadNotifications = notifications.filter(n => !n.read).length;
  const unreadCommunity = Object.values(roomUnreadCounts).reduce((sum, count) => sum + count, 0);

  // Drag-to-resize pointer move event listener: Zone 2 SubNav Divider
  const handleSubNavResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Offset by the UtilityDock width (64px)
      const newWidth = Math.max(180, Math.min(360, moveEvent.clientX - 64));
      setSubNavWidth(newWidth);
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Drag-to-resize pointer move event listener: Zone 3B ConsoleStream Divider
  const handleConsoleResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const newWidth = Math.max(280, Math.min(500, window.innerWidth - moveEvent.clientX));
      setConsoleWidth(newWidth);
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

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

  const handleCommandExecute = useCallback((type: string, value: string) => {
    if (type === 'panel') {
      setActivePanel(value as ActivePanel);
    } else if (type === 'focus') {
      const minutes = parseInt(value, 10);
      setPomodoroPresetMinutes(minutes);
      setActivePanel('pomodoro');
      audioEngine.playAlert();
    } else if (type === 'xp') {
      const amt = parseInt(value, 10);
      setUserXp(prev => Math.max(0, prev + amt));
    } else if (type === 'streak') {
      const amt = parseInt(value, 10);
      setUserStreak(amt);
    } else if (type === 'vayu') {
      setVayuThinking(true);
      setTimeout(() => {
        setVayuThinking(false);
        setVayuSpeaking(true);
        audioEngine.playAlert();
        
        const responses = [
          `ATTENTION STUDENT: ${userName.toUpperCase()}. XP PORTFOLIO STATUS IS CURRENTLY AT ${userXp} XP. FOCUS RATIO MUST BE OPTIMIZED. TYPE /focus 25 IMMEDIATELY TO ENGAGE STUDY FOCUS.`,
          `VAYU COGNITIVE UNIT ONLINE: DETECTING AIM DIRECTIVE -> "${userAim.toUpperCase()}". REINFORCE STRATEGY BY FLUSHING LEITNER DECK PROMPT CARDS IMMEDIATELY.`,
          `TACTICAL Mentorship Heartbeat active. User Streak: ${userStreak} Days. Keep pushing the boundaries of spatial discipline. No slacker habits tolerated.`
        ];
        const chosen = responses[Math.floor(Math.random() * responses.length)];
        
        handleVayuResponseComplete(chosen);
        
        setTimeout(() => {
          setVayuSpeaking(false);
        }, 5000);
      }, 2500);
    }
  }, [userName, userXp, userAim, userStreak, handleVayuResponseComplete]);

  const handleMarkRoomRead = useCallback((roomId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`vidyaverse-room-read-${roomId}`, Date.now().toString());
    }
    setRoomUnreadCounts(prev => ({
      ...prev,
      [roomId]: 0
    }));
  }, []);

  const handleMarkNotificationRead = useCallback((notif: AppNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));

    if (notif.type === 'vayu') {
      setActivePanel('chat');
      setUnreadVayu(false);
      setMobileView('content');
    } else if (notif.type === 'guild' || notif.type === 'dm') {
      setActivePanel('community');
      if (notif.roomId) {
        setActiveRoomId(notif.roomId);
        handleMarkRoomRead(notif.roomId);
        const room = rooms.find(r => r.id === notif.roomId);
        if (room) setActiveRoom(room);
      }
      setMobileView('content');
    }
  }, [rooms, handleMarkRoomRead]);

  const handleClearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

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
            scheduleStreakReminder(profile.name || 'Student');
          }
        });
        getUserFromSheet(firebaseUser.uid).then(sheetData => {
          if (sheetData) {
            setUserName(sheetData.name);
            setUserAim(sheetData.aim);
          }
        }).catch(() => {
          // Sheets unavailable fallback
        });
        updateLastVisit();
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync rooms and real-time listeners
  useEffect(() => {
    if (!user) return;

    let unsubscribes: (() => void)[] = [];
    let isMounted = true;

    const setupRoomsAndListeners = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (!isMounted) return;

        let autoRooms: Room[] = [];
        if (profile) {
          autoRooms = await ensureAutoRooms(profile);
        }

        const qCustom = query(collection(db, 'rooms'), where('members', 'array-contains', user.uid));
        
        const unsubCustom = onSnapshot(qCustom, (snapshot) => {
          if (!isMounted) return;
          
          const customRooms: Room[] = [];
          snapshot.forEach(doc => {
            customRooms.push(doc.data() as Room);
          });

          const allRooms = [...autoRooms, ...customRooms];
          setRooms(allRooms);
          
          if (allRooms.length > 0 && !activeRoom) {
            setActiveRoom(allRooms[0]);
          }

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
              
              if (lastMsg.senderId === user.uid) return;

              const lastReadStr = localStorage.getItem(`vidyaverse-room-read-${room.id}`);
              const lastReadTime = lastReadStr ? parseInt(lastReadStr, 10) : 0;
              const msgTime = lastMsg.timestamp?.seconds 
                ? lastMsg.timestamp.seconds * 1000 
                : lastMsg.timestamp?.toMillis?.() || Date.now();

              if (msgTime > lastReadTime && activeRoomId !== room.id) {
                setRoomUnreadCounts(prev => ({
                  ...prev,
                  [room.id]: (prev[room.id] || 0) + 1
                }));

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

  // Sync Focus Sessions list
  useEffect(() => {
    if (activePanel !== 'community') return;
    const unsubscribe = subscribeToFocusSessions((sessions) => {
      setFocusSessions(sessions);
    });
    return () => unsubscribe();
  }, [activePanel]);

  // Sync Leaderboard rankings list
  useEffect(() => {
    if (activePanel !== 'community') return;
    getLeaderboard(20).then((users) => {
      setLeaderboard(users);
    });
  }, [activePanel]);

  // Sync Leitner box count metrics
  useEffect(() => {
    if (!user || activePanel !== 'flashcards') return;
    getFlashcards(user.uid).then((cards) => {
      setFlashcards(cards);
    });
  }, [user, activePanel]);

  // Synchronize activePanel states
  useEffect(() => {
    if (activePanel === 'chat') {
      setUnreadVayu(false);
    }
    if (activePanel !== 'community') {
      setActiveRoomId(null);
    }
    // Set view back to 'list' context when toggling panel on mobile
    setMobileView('list');
    setPomodoroPresetMinutes(null); // Clear presets
  }, [activePanel]);

  // Handle click-navigation from browser notifications
  useEffect(() => {
    const handleNavigate = (url: string) => {
      if (url.startsWith('/community')) {
        setActivePanel('community');
        setMobileView('content');
        const match = url.match(/[?&]room=([^&]+)/);
        if (match && match[1]) {
          const roomId = match[1];
          setActiveRoomId(roomId);
          handleMarkRoomRead(roomId);
          const room = rooms.find(r => r.id === roomId);
          if (room) setActiveRoom(room);
        }
      } else if (url.startsWith('/chat')) {
        setActivePanel('chat');
        setUnreadVayu(false);
        setMobileView('content');
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
  }, [rooms, handleMarkRoomRead]);

  // Keyboard Shortcuts (1-7) & Command palette
  useEffect(() => {
    if (appView !== 'dashboard') return;
    const panels: ActivePanel[] = ['chat', 'community', 'flashcards', 'flashforge', 'pomodoro', 'bossbattle', 'settings'];
    const handleKey = (e: KeyboardEvent) => {
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
      
      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= panels.length && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setActivePanel(panels[idx - 1]);
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appView]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setActivePanel('chat');
    setAppView('landing');
  };

  // Leitner metrics calculator
  const getLeitnerBoxCounts = () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    flashcards.forEach(card => {
      const b = card.box || 1;
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  };

  // Auth/Prepare screens
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-obsidian select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-purple-950/20 border border-purple-500/20 rounded flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.15)] animate-pulse">
            <span className="font-mono font-bold text-white text-lg">V</span>
          </div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Waking tactical study core...</p>
        </motion.div>
      </div>
    );
  }

  if (appView === 'landing' && !user) {
    return <LandingPage onEnterApp={() => setAppView('auth')} />;
  }

  if (appView === 'auth' && !user) {
    return (
      <div className="relative">
        <button
          onClick={() => setAppView('landing')}
          className="fixed top-4 left-4 z-50 px-3 py-1 bg-zinc-900 border border-sys-groove rounded font-mono text-[10px] text-zinc-400 cursor-pointer"
        >
          ← EXIT_BOOT
        </button>
        <AuthScreen onAuthSuccess={() => { }} />
      </div>
    );
  }

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
      <div className="h-screen w-screen overflow-hidden select-none flex bg-base-obsidian font-sans relative text-zinc-200">
        
        {/* Dynamic Chromatic Leak corner glow synchronized with AI state & Timer */}
        <div 
          className="chromatic-leak transition-all duration-[2000ms] ease-out" 
          style={{
            background: vayuThinking 
              ? 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, rgba(139, 92, 246, 0.03) 60%, transparent 100%)' // Thinking: Amber leak
              : vayuSpeaking 
              ? 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.04) 60%, transparent 100%)' // Speaking: Cyan leak
              : pomodoroTimerActive 
              ? 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(139, 92, 246, 0.02) 60%, transparent 100%)' // Strict timer: Rose leak
              : 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(16, 185, 129, 0.02) 60%, transparent 100%)', // Default: Obsidian Purple/Green leak
            width: vayuThinking || vayuSpeaking || pomodoroTimerActive ? '750px' : '500px',
            height: vayuThinking || vayuSpeaking || pomodoroTimerActive ? '750px' : '500px',
            opacity: vayuThinking || vayuSpeaking ? 0.9 : 0.6
          }}
        />

        {/* ========================================================
            ZONE 1: Primary Utility Dock (64px)
            ======================================================== */}
        <UtilityDock
          activePanel={activePanel}
          onPanelChange={(panel) => {
            setActivePanel(panel);
            setMobileView('list'); // reset view context on change
          }}
          userName={userName}
          userXp={userXp}
          userStreak={userStreak}
          onSignOut={handleSignOut}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onShareScore={() => {
            const title = getUserXpTitle(userXp);
            alert(`🏆 ACADEMIC PROFILE Telemetry:\nName: ${userName}\nXP: ${userXp} (${title})\nStreak: ${userStreak} Days 🔥`);
          }}
          unreadVayu={unreadVayu}
          unreadCommunity={unreadCommunity}
          vayuThinking={vayuThinking}
          vayuSpeaking={vayuSpeaking}
        />

        {/* ========================================================
            ZONE 2: Contextual Navigation Tree Panel (resizable)
            ======================================================== */}
        {/* Desktop or Mobile 'list' view */}
        <div 
          className={`h-full flex flex-col shrink-0 ${mobileView === 'list' ? 'flex flex-1 md:flex-none' : 'hidden md:flex'}`}
          style={{ width: mobileView === 'list' ? '100%' : `${subNavWidth}px` }}
        >
          <SubNavPanel
            activePanel={activePanel}
            width={mobileView === 'list' ? undefined : subNavWidth}
            rooms={rooms}
            activeRoom={activeRoom}
            setActiveRoom={(room) => {
              setActiveRoom(room);
              setMobileView('content'); // switch to content stream on click on mobile!
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            guildsUnreadCount={rooms.filter(r => r.type !== 'dm').reduce((sum, r) => sum + (roomUnreadCounts[r.id] || 0), 0)}
            dmsUnreadCount={rooms.filter(r => r.type === 'dm').reduce((sum, r) => sum + (roomUnreadCounts[r.id] || 0), 0)}
            roomUnreadCounts={roomUnreadCounts}
            focusSessions={focusSessions}
            leaderboard={leaderboard}
            userUid={user!.uid}
            userName={userName}
            onMarkRoomRead={handleMarkRoomRead}
            
            // Actions
            onShowJoinModal={() => setShowJoinModal(true)}
            onShowCreateModal={() => setShowCreateModal(true)}
            onShowJoinDmModal={() => setShowJoinDmModal(true)}
            onCreateDmRoom={async () => {
              setModalLoading(true);
              try {
                const { createPrivateDmRoom } = await import('@/lib/chat');
                const room = await createPrivateDmRoom(user!.uid, userName);
                setRooms(prev => [...prev, room]);
                setActiveRoom(room);
                setMobileView('content');
              } catch (e) {
                console.error(e);
              } finally {
                setModalLoading(false);
              }
            }}

            // Flashcards
            activeLeitnerBox={activeLeitnerBox}
            setActiveLeitnerBox={(box) => {
              setActiveLeitnerBox(box);
              setMobileView('content');
            }}
            leitnerCounts={getLeitnerBoxCounts()}
            totalDueCount={flashcards.length}

            // Pomodoro presets
            onSelectPomodoroPreset={(mins) => {
              setPomodoroPresetMinutes(mins);
              setMobileView('content');
            }}
            pomodoroTimerActive={pomodoroTimerActive}

            // Boss battle
            battleDifficulty={battleDifficulty}
            setBattleDifficulty={setBattleDifficulty}
          />
        </div>

        {/* Custom Skeuomorphic Drag-to-Resize vertical divider (Zone 2 SubNav -> Zone 3 Canvas) */}
        <div 
          className="hidden md:block w-1 h-full bg-transparent hover:bg-purple-500/20 active:bg-purple-500 cursor-col-resize z-50 shrink-0 transition-all border-r border-sys-groove/40"
          onPointerDown={handleSubNavResizeStart}
        />

        {/* ========================================================
            ZONE 3: Core Workspace Split Canvas (flex)
            ======================================================== */}
        {/* Desktop or Mobile 'content' view */}
        <div className={`flex-1 h-full flex overflow-hidden z-10 ${mobileView === 'content' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* ZONE 3A: Workspace Canvas (~65%) */}
          <WorkspaceCanvas
            activePanel={activePanel}
            activeRoomName={activeRoom ? activeRoom.name : undefined}
            activeLeitnerBox={activeLeitnerBox}
          >
            <AnimatePresence mode="wait">
              {activePanel === 'chat' && (
                <motion.div key="chat" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ChatPanel userUid={user!.uid} userName={userName} onResponseComplete={handleVayuResponseComplete} />
                </motion.div>
              )}
              {activePanel === 'community' && (
                <motion.div key="community" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CommunityPanel 
                    userUid={user!.uid} 
                    userName={userName} 
                    activeRoom={activeRoom}
                    activeTab={activeTab}
                    focusSessions={focusSessions}
                    leaderboard={leaderboard}
                    onBackToMobileList={() => setMobileView('list')}
                  />
                </motion.div>
              )}
              {activePanel === 'flashcards' && (
                <motion.div key="flashcards" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <FlashcardsPanel userUid={user!.uid} />
                </motion.div>
              )}
              {activePanel === 'flashforge' && (
                <motion.div key="flashforge" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <FlashForge userUid={user!.uid} />
                </motion.div>
              )}
              {activePanel === 'pomodoro' && (
                <motion.div key="pomodoro" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PomodoroCoach 
                    userUid={user!.uid} 
                    userName={userName} 
                    userAim={userAim}
                    presetMinutes={pomodoroPresetMinutes}
                    onTimerActiveChange={setPomodoroTimerActive}
                  />
                </motion.div>
              )}
              {activePanel === 'bossbattle' && (
                <motion.div key="bossbattle" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <BossBattlePanel userUid={user!.uid} battleDifficulty={battleDifficulty} />
                </motion.div>
              )}
              {activePanel === 'settings' && (
                <motion.div key="settings" className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SettingsPanel 
                    userUid={user!.uid} 
                    onChangeName={setUserName} 
                    onChangeAim={setUserAim} 
                    currentName={userName} 
                    currentAim={userAim} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </WorkspaceCanvas>

          {/* Custom Skeuomorphic Drag-to-Resize vertical divider (Zone 3A Canvas -> Zone 3B ConsoleStream) */}
          <div 
            className="hidden lg:block w-1 h-full bg-transparent hover:bg-purple-500/20 active:bg-purple-500 cursor-col-resize z-50 shrink-0 transition-all border-l border-sys-groove/40"
            onPointerDown={handleConsoleResizeStart}
          />

          {/* ZONE 3B: Permanent Right Console Stream (resizable) */}
          <ConsoleStream
            userUid={user!.uid}
            userName={userName}
            userXp={userXp}
            userStreak={userStreak}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onClearNotifications={handleClearNotifications}
            width={consoleWidth}
            onCommandExecute={handleCommandExecute}
          />
        </div>

        {/* ========================================================
            ── Responsive Mobile Navigation Bar (Bottom fallback) ──
            ======================================================== */}
        <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-14 bg-zinc-950/90 backdrop-blur-md border-t border-sys-groove px-2 py-1 justify-around items-center z-50">
          {PANEL_LIST.map((item) => {
            const isActive = activePanel === item.id;
            
            // Map simple visual labels for mobile buttons
            const labelMap = { chat: 'Chat', community: 'Guilds', flashcards: 'Decks', flashforge: 'Forge', pomodoro: 'Timer', bossbattle: 'Quiz', settings: 'Config' };

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePanel(item.id);
                  setMobileView('list'); // set to category selection lists first
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors cursor-pointer border-none bg-transparent ${
                  isActive ? 'text-purple-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="text-[10px] font-bold">{labelMap[item.id] || item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ========================================================
            ── Modals & Dialog blocks (Skeuomorphic) ────────────────
            ======================================================== */}
        <AnimatePresence>
          {showJoinModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="max-w-xs w-full p-5 bg-zinc-950 border border-sys-groove rounded-[4px]">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-3">Join Group Cell</h3>
                {modalError && <p className="text-rose-400 text-[10px] mb-2">{modalError}</p>}
                <input
                  type="text"
                  placeholder="ENTER 6-CHAR CODE"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full bg-zinc-900 border border-sys-groove p-2 text-center text-sm font-mono uppercase tracking-widest text-zinc-200 outline-none rounded mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowJoinModal(false)} className="flex-1 py-1.5 bg-zinc-900 border border-sys-groove text-[10px] font-bold text-zinc-400 rounded">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (joinCode.length < 6) return;
                      setModalLoading(true);
                      setModalError('');
                      try {
                        const { joinRoomByCode } = await import('@/lib/chat');
                        const room = await joinRoomByCode(joinCode, user!.uid);
                        if (!rooms.find(r => r.id === room.id)) {
                          setRooms(prev => [...prev, room]);
                        }
                        setActiveRoom(room);
                        setShowJoinModal(false);
                        setJoinCode('');
                        setMobileView('content');
                      } catch (err) {
                        setModalError((err as Error).message || 'Invalid invite code');
                      } finally {
                        setModalLoading(false);
                      }
                    }} 
                    disabled={modalLoading} 
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white rounded"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="max-w-xs w-full p-5 bg-zinc-950 border border-sys-groove rounded-[4px]">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-3">Create Study Group</h3>
                {modalError && <p className="text-rose-400 text-[10px] mb-2">{modalError}</p>}
                <input
                  type="text"
                  placeholder="e.g. Physics Night Exam"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full bg-zinc-900 border border-sys-groove p-2 text-xs text-zinc-200 outline-none rounded mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 py-1.5 bg-zinc-900 border border-sys-groove text-[10px] font-bold text-zinc-400 rounded">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (!newRoomName.trim()) return;
                      setModalLoading(true);
                      setModalError('');
                      try {
                        const { createCustomRoom } = await import('@/lib/chat');
                        const newRoom = await createCustomRoom(newRoomName, user!.uid);
                        setRooms(prev => [...prev, newRoom]);
                        setActiveRoom(newRoom);
                        setShowCreateModal(false);
                        setNewRoomName('');
                        setMobileView('content');
                      } catch (err) {
                        setModalError('Failed to create group');
                      } finally {
                        setModalLoading(false);
                      }
                    }} 
                    disabled={modalLoading} 
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white rounded"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {showJoinDmModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="max-w-xs w-full p-5 bg-zinc-950 border border-sys-groove rounded-[4px]">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-1">Join Direct Session</h3>
                <p className="text-[10px] text-zinc-500 mb-3">Provide peer code to lock direct secure connection.</p>
                {modalError && <p className="text-rose-400 text-[10px] mb-2">{modalError}</p>}
                <input
                  type="text"
                  placeholder="PEER CHAT CODE"
                  value={dmJoinCode}
                  onChange={e => setDmJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-sys-groove p-2 text-center text-sm font-mono uppercase tracking-widest text-zinc-200 outline-none rounded mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowJoinDmModal(false)} className="flex-1 py-1.5 bg-zinc-900 border border-sys-groove text-[10px] font-bold text-zinc-400 rounded">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (!dmJoinCode.trim()) return;
                      setModalLoading(true);
                      setModalError('');
                      try {
                        const { joinPrivateDmRoom } = await import('@/lib/chat');
                        const room = await joinPrivateDmRoom(dmJoinCode, user!.uid, userName);
                        setRooms(prev => {
                          const filtered = prev.filter(r => r.id !== room.id);
                          return [...filtered, room];
                        });
                        setActiveRoom(room);
                        setShowJoinDmModal(false);
                        setDmJoinCode('');
                        setMobileView('content');
                      } catch (err) {
                        setModalError('Failed to join private DM');
                      } finally {
                        setModalLoading(false);
                      }
                    }} 
                    disabled={modalLoading} 
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold text-white rounded"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Command Palette Modal (⌘K / Ctrl+K) ── */}
          {showCommandPalette && (
            <div 
              className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] bg-black/80 backdrop-blur-md"
              onClick={() => setShowCommandPalette(false)}
            >
              <div 
                className="w-full max-w-sm rounded border border-sys-groove bg-zinc-950 p-1 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3 pt-3 pb-2 border-b border-sys-groove flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">Command Palette</span>
                  <span className="text-[9px] font-mono text-zinc-600 px-1 py-0.5 border border-sys-groove rounded">CTRL+K</span>
                </div>
                <div className="py-2 space-y-0.5">
                  {PANEL_LIST.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePanel(p.id);
                        setShowCommandPalette(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs text-zinc-300 hover:bg-purple-950/20 hover:text-purple-400 rounded cursor-pointer border-none bg-transparent"
                    >
                      <span className="font-bold">{p.label}</span>
                      <span className="text-[9px] font-mono px-1 bg-zinc-900 border border-sys-groove text-zinc-500 rounded">{p.shortcut}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ToastProvider>
  );
}

function getUserXpTitle(xp: number): string {
  if (xp < 100) return 'Novice Scholar';
  if (xp < 500) return 'Grindset Master';
  if (xp < 1000) return 'Academic Weapon';
  return 'VidyaVerse Legend';
}
