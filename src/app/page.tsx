'use client';

import { useState, useEffect } from 'react';
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
import { onAuthStateChanged, signOut, getUserProfile, type AppUser } from '@/lib/firebase';
import { getUserFromSheet } from '@/actions/sheets';

type AppView = 'landing' | 'auth' | 'dashboard';

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [isDark, setIsDark] = useState(true);
  const [userName, setUserName] = useState('Student');
  const [userAim, setUserAim] = useState('Become the best version of yourself');
  const [userXp, setUserXp] = useState(0);
  const [userStreak, setUserStreak] = useState(0);
  const [appView, setAppView] = useState<AppView>('landing');

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);

      if (firebaseUser) {
        setAppView('dashboard');
        // Load user profile data from Firestore
        getUserProfile(firebaseUser.uid).then(profile => {
          if (profile) {
            setUserName(profile.name);
            setUserAim(profile.aim);
            setUserXp(profile.xp || 0);
            setUserStreak(profile.streak || 0);
          }
        });
        // Also check Google Sheets for the latest context
        getUserFromSheet(firebaseUser.uid).then(sheetData => {
          if (sheetData) {
            setUserName(sheetData.name);
            setUserAim(sheetData.aim);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Theme management
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #6c63ff, #00f0ff)' }}
          />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading VidyaVerse...</p>
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
  return (
    <div className="h-screen flex bg-grain" style={{ background: 'var(--background)' }}>
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #6c63ff, transparent)' }}
        />
        <motion.div
          animate={{
            x: [0, -40, 30, 0],
            y: [0, 30, -20, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #00f0ff, transparent)' }}
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
      />

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-[72px] pb-20 md:pb-0 relative z-10">
        <div className="h-full p-0 md:p-6">
          <AnimatePresence mode="wait">
            {activePanel === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <ChatPanel userUid={user!.uid} userName={userName} />
              </motion.div>
            )}

            {activePanel === 'community' && (
              <motion.div
                key="community"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <CommunityPanel userUid={user!.uid} userName={userName} />
              </motion.div>
            )}

            {activePanel === 'flashforge' && (
              <motion.div
                key="flashforge"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <FlashForge userUid={user!.uid} />
              </motion.div>
            )}

            {activePanel === 'pomodoro' && (
              <motion.div
                key="pomodoro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <PomodoroCoach userUid={user!.uid} userName={userName} userAim={userAim} />
              </motion.div>
            )}

            {activePanel === 'flashcards' && (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <FlashcardsPanel userUid={user!.uid} />
              </motion.div>
            )}

            {activePanel === 'bossbattle' && (
              <motion.div
                key="bossbattle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <BossBattlePanel userUid={user!.uid} />
              </motion.div>
            )}

            {activePanel === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full glass-card rounded-none md:rounded-[24px] border-x-0 md:border-x border-t-0 md:border-t p-3.5 md:p-6"
              >
                <SettingsPanel userUid={user!.uid} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}

