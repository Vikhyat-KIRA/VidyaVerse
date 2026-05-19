'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX, CheckCircle2, Flame, ShieldOff, Info } from 'lucide-react';
import { generatePomodoroRoast } from '@/lib/gemini';
import { startFocusSession, endFocusSession } from '@/lib/focus';
import { awardXp } from '@/lib/exp';

interface PomodoroCoachProps {
  userUid: string;
  userName: string;
  userAim: string;
}

type TimerMode = 'focus' | 'break';
type TimerState = 'idle' | 'running' | 'paused';

const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes
const IDLE_THRESHOLD = 2 * 60 * 1000; // 2 minutes in ms

const LOFI_STATIONS = [
  { id: 'lofi', name: '🎧 Lofi Study Beats', url: 'https://streaming.hotmixradio.com/hotmix-lofi-en-mp3' },
  { id: 'synthwave', name: '🌌 Synthwave Focus', url: 'https://stream.nightride.fm/nightride.mp3' },
  { id: 'classical', name: '🎻 Classical Masterpieces', url: 'https://wrti-live.streamguys1.com/classical-mp3' },
  { id: 'rain', name: '🌧️ Deep Ambient & Drone', url: 'https://ice1.somafm.com/deepspaceone-128-mp3' }
];

export default function PomodoroCoach({ userUid, userName, userAim }: PomodoroCoachProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [state, setState] = useState<TimerState>('idle');
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [sessions, setSessions] = useState(0);
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastText, setRoastText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isStrictMode, setIsStrictMode] = useState(true);
  
  const [selectedStation, setSelectedStation] = useState(LOFI_STATIONS[0]);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const idleCheckRef = useRef<NodeJS.Timeout | null>(null);
  const tabAwayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  const totalTime = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // Track user activity
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    // Add visibility change detection with a 30-second grace period
    const handleVisibilityChange = () => {
      if (isStrictMode && document.visibilityState === 'hidden' && state === 'running' && mode === 'focus' && !isRoasting) {
        // Give them 30 seconds to return (e.g. looking up a wiki or quick search)
        tabAwayTimeoutRef.current = setTimeout(() => {
          if (!isRoasting) {
            triggerRoast();
            import('@/lib/focus').then(({ shameSlacker }) => {
              shameSlacker(userUid, userName, userAim);
            });
          }
        }, 30000);
      } else if (document.visibilityState === 'visible') {
        // They came back! Cancel the roast timeout
        if (tabAwayTimeoutRef.current) {
          clearTimeout(tabAwayTimeoutRef.current);
          tabAwayTimeoutRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (tabAwayTimeoutRef.current) clearTimeout(tabAwayTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetActivity, state, mode, isRoasting, isStrictMode, userUid, userName, userAim]);

  // Timer countdown
  useEffect(() => {
    if (state === 'running') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer complete
            if (mode === 'focus') {
              setSessions(s => s + 1);
              setMode('break');
              setState('idle');
              awardXp(userUid, 50);
              endFocusSession(userUid);
              return BREAK_DURATION;
            } else {
              setMode('focus');
              setState('idle');
              endFocusSession(userUid);
              return FOCUS_DURATION;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, mode, userUid]);

  // Sync focus session with database
  useEffect(() => {
    const syncFocus = async () => {
      if (state === 'running') {
        await startFocusSession(userUid, userName, userAim, mode === 'focus' ? 'focusing' : 'break');
      }
    };
    syncFocus();
  }, [state, mode, userUid, userName, userAim]);

  // Clean up focus session on unmount
  useEffect(() => {
    return () => {
      endFocusSession(userUid);
    };
  }, [userUid]);

  // Sync music playback with station selection and music toggle
  useEffect(() => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(err => console.log('Audio playback blocked/failed:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isMusicPlaying, selectedStation]);

  // Idle detection & roast trigger
  useEffect(() => {
    if (isStrictMode && state === 'running' && mode === 'focus') {
      idleCheckRef.current = setInterval(async () => {
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime > IDLE_THRESHOLD && !isRoasting) {
          triggerRoast();
        }
      }, 10000); // Check every 10 seconds
    }
    return () => {
      if (idleCheckRef.current) clearInterval(idleCheckRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, mode, isRoasting, isStrictMode]);

  const playAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = ctx;

      const playBeep = (frequency: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        osc.type = 'square';
        gain.gain.value = 0.15;
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
        oscillatorRef.current = osc;
      };

      // Aggressive alarm pattern
      for (let i = 0; i < 8; i++) {
        playBeep(880, ctx.currentTime + i * 0.25, 0.15);
        playBeep(660, ctx.currentTime + i * 0.25 + 0.125, 0.1);
      }
    } catch {
      // Web Audio not available
    }
  };

  const speakRoast = (text: string) => {
    if (!soundEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      // Strip actual unicode emojis so speech synthesis doesn't say "emoji" or read their descriptions out loud
      const spokenText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '');
      
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      utterance.volume = 1;
      // Try to get a dramatic voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('en') && v.name.includes('Male')
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerRoast = async () => {
    setIsRoasting(true);
    playAlarmSound();

    // Check if the server action is defined and can be called
    try {
      if (!generatePomodoroRoast) throw new Error("Server action missing");
      const roast = await generatePomodoroRoast(userName, userAim);
      setRoastText(roast);
      speakRoast(roast);
    } catch (e) {
      console.error("Roast error:", e);
      const fallback = `${userName}! Focus! Your ${userAim} dream needs your attention RIGHT NOW! Stop slacking!`;
      setRoastText(fallback);
      speakRoast(fallback);
    }
  };

  const confirmTask = () => {
    setIsRoasting(false);
    setRoastText('');
    resetActivity();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const toggleTimer = () => {
    if (state === 'idle' || state === 'paused') {
      setState('running');
      resetActivity();
    } else {
      setState('paused');
      if (mode === 'focus' && isStrictMode) {
        import('@/lib/focus').then(({ shameSlacker }) => {
          shameSlacker(userUid, userName, userAim);
        });
      } else {
        import('@/lib/focus').then(({ endFocusSession }) => {
          endFocusSession(userUid);
        });
      }
    }
  };

  const resetTimer = () => {
    const wasRunning = state === 'running';
    setState('idle');
    setMode('focus');
    setTimeLeft(FOCUS_DURATION);
    setIsRoasting(false);
    setRoastText('');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (audioContextRef.current) audioContextRef.current.close();

    if (wasRunning && mode === 'focus' && isStrictMode) {
      import('@/lib/focus').then(({ shameSlacker }) => {
        shameSlacker(userUid, userName, userAim);
      });
    } else {
      import('@/lib/focus').then(({ endFocusSession }) => {
        endFocusSession(userUid);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{
            background: mode === 'focus' ? 'rgba(108, 99, 255, 0.1)' : 'rgba(52, 211, 153, 0.1)'
          }}>
            {mode === 'focus' ? (
              <Brain size={20} style={{ color: '#6c63ff' }} />
            ) : (
              <Coffee size={20} style={{ color: '#34d399' }} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              Pomodoro Coach
            </h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {mode === 'focus' ? 'Deep Focus Mode' : 'Break Time'} • {sessions} sessions done
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStrictMode(!isStrictMode)}
            className="p-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: isStrictMode ? 'rgba(255, 77, 106, 0.1)' : 'var(--surface)',
              color: isStrictMode ? '#ff4d6a' : 'var(--muted)',
              border: `1px solid ${isStrictMode ? 'rgba(255, 77, 106, 0.3)' : 'var(--border-color)'}`
            }}
            title={isStrictMode ? "Disable to browse other tabs freely" : "Enable to get roasted when slacking"}
          >
            {isStrictMode ? <Flame size={16} /> : <ShieldOff size={16} />}
            <span className="text-xs font-bold hidden sm:inline">{isStrictMode ? 'Strict' : 'Normal'}</span>
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: 'var(--surface)',
              color: 'var(--muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Circular Progress */}
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="90" cy="90" r="78"
              fill="none"
              stroke="var(--border-color)"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <motion.circle
              cx="90" cy="90" r="78"
              fill="none"
              stroke={mode === 'focus' ? '#6c63ff' : '#34d399'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 78}
              strokeDashoffset={2 * Math.PI * 78 * (1 - progress / 100)}
              style={{
                filter: `drop-shadow(0 0 8px ${mode === 'focus' ? 'rgba(108,99,255,0.4)' : 'rgba(52,211,153,0.4)'})`,
              }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={timeLeft}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="text-4xl font-mono font-bold tabular-nums"
              style={{
                color: 'var(--foreground)',
                letterSpacing: '2px',
              }}
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className="text-xs mt-1 font-medium uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {mode === 'focus' ? '🎯 Focus' : '☕ Break'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetTimer}
            className="p-3 rounded-xl"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTimer}
            className="px-8 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
            style={{
              background: state === 'running'
                ? 'rgba(255, 77, 106, 0.2)'
                : mode === 'focus'
                  ? 'linear-gradient(135deg, #6c63ff, #8b5cf6)'
                  : 'linear-gradient(135deg, #34d399, #22c55e)',
              color: state === 'running' ? '#ff4d6a' : 'white',
              border: state === 'running' ? '1px solid rgba(255,77,106,0.3)' : 'none',
              cursor: 'pointer',
            }}
          >
            {state === 'running' ? (
              <><Pause size={16} /> Pause</>
            ) : (
              <><Play size={16} /> {state === 'paused' ? 'Resume' : 'Start'}</>
            )}
          </motion.button>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.max(4, sessions + 1) }, (_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: i < sessions
                  ? '#6c63ff'
                  : i === sessions && state === 'running'
                    ? 'rgba(108, 99, 255, 0.4)'
                    : 'var(--border-color)',
                boxShadow: i < sessions ? '0 0 8px rgba(108, 99, 255, 0.3)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Hidden HTML5 Audio element */}
      <audio 
        ref={audioRef} 
        src={selectedStation.url} 
        preload="none" 
      />

      {/* Music Control Panel */}
      <div className="mt-4 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--muted)]">Focus Beats:</span>
          <select
            value={selectedStation.id}
            onChange={(e) => {
              const station = LOFI_STATIONS.find(s => s.id === e.target.value);
              if (station) {
                setSelectedStation(station);
                // Trigger auto-play on station change if music is active
                if (isMusicPlaying && audioRef.current) {
                  setTimeout(() => {
                    audioRef.current?.play().catch(e => console.log(e));
                  }, 100);
                }
              }
            }}
            className="bg-[var(--background)] border border-[var(--border-color)] text-xs rounded-lg px-2 py-1 text-[var(--foreground)] outline-none cursor-pointer"
          >
            {LOFI_STATIONS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => setIsMusicPlaying(!isMusicPlaying)}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${isMusicPlaying ? 'bg-green-500/20 text-green-500 border border-green-500/30 font-semibold' : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border-color)] font-normal'}`}
        >
          {isMusicPlaying ? '🟢 Music ON' : '🔴 Music OFF'}
        </button>
      </div>

      {/* Strict Mode Info Box */}
      <div className="mt-4 p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-color)', background: 'var(--surface)' }}>
        <div className="flex items-start gap-3">
          <Info size={18} className="text-[var(--primary)] shrink-0 mt-0.5" />
          <div className="text-xs space-y-2 text-[var(--muted)]">
            <p><strong className="text-[var(--foreground)]">🔥 Strict Mode (Recommended):</strong> VAYU will brutally roast you if you are completely idle for 2 minutes or if you switch tabs for more than 30 seconds.</p>
            <p><strong className="text-[var(--foreground)]">💡 Research Hack:</strong> Need to read Wikipedia without getting roasted? Use <strong>Split-Screen!</strong> Put Wikipedia on one half of your screen and VidyaVerse on the other. As long as this tab is visible, you&apos;re safe.</p>
            <p><strong className="text-[var(--foreground)]">🛡️ Normal Mode:</strong> Turn Strict Mode OFF using the toggle above if you need to browse freely without getting yelled at.</p>
          </div>
        </div>
      </div>

      {/* ROAST OVERLAY */}
      <AnimatePresence>
        {isRoasting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="max-w-md w-full p-6 rounded-2xl text-center"
              style={{
                background: 'rgba(255, 77, 106, 0.1)',
                border: '2px solid rgba(255, 77, 106, 0.3)',
                backdropFilter: 'blur(40px)',
              }}
            >
              {/* Pulsing warning icon */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  boxShadow: [
                    '0 0 20px rgba(255,77,106,0.3)',
                    '0 0 40px rgba(255,77,106,0.6)',
                    '0 0 20px rgba(255,77,106,0.3)',
                  ],
                }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255, 77, 106, 0.2)' }}
              >
                <span className="text-3xl">🔥</span>
              </motion.div>

              <h3 className="text-xl font-bold mb-2" style={{ color: '#ff4d6a' }}>
                VAYU IS NOT HAPPY!
              </h3>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm leading-relaxed mb-6"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {roastText || 'Get back to work!'}
              </motion.p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={confirmTask}
                className="px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto"
                style={{
                  background: 'linear-gradient(135deg, #34d399, #22c55e)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={18} />
                Task Confirmed — I&apos;m Back!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
