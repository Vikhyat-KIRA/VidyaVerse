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
  presetMinutes?: number | null;
  onTimerActiveChange?: (active: boolean) => void;
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

export default function PomodoroCoach({ 
  userUid, 
  userName, 
  userAim,
  presetMinutes = null,
  onTimerActiveChange
}: PomodoroCoachProps) {
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

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Monitor external preset select from Zone 2
  useEffect(() => {
    if (presetMinutes !== null) {
      setState('idle');
      setMode(presetMinutes >= 25 ? 'focus' : 'break');
      setTimeLeft(presetMinutes * 60);
    }
  }, [presetMinutes]);

  // Report timer active state to parent
  useEffect(() => {
    if (onTimerActiveChange) {
      onTimerActiveChange(state === 'running');
    }
  }, [state, onTimerActiveChange]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetActivity));

    const handleVisibilityChange = () => {
      if (isStrictMode && document.visibilityState === 'hidden' && state === 'running' && mode === 'focus' && !isRoasting) {
        tabAwayTimeoutRef.current = setTimeout(() => {
          if (!isRoasting) {
            triggerRoast();
            import('@/lib/focus').then(({ shameSlacker }) => {
              shameSlacker(userUid, userName, userAim);
            });
          }
        }, 30000);
      } else if (document.visibilityState === 'visible') {
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
  }, [resetActivity, state, mode, isRoasting, isStrictMode, userUid, userName, userAim]);

  // Timer countdown
  useEffect(() => {
    if (state === 'running') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
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

  useEffect(() => {
    return () => {
      endFocusSession(userUid);
    };
  }, [userUid]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(err => console.log('Audio blocked:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isMusicPlaying, selectedStation]);

  useEffect(() => {
    if (isStrictMode && state === 'running' && mode === 'focus') {
      idleCheckRef.current = setInterval(async () => {
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime > IDLE_THRESHOLD && !isRoasting) {
          triggerRoast();
        }
      }, 10000);
    }
    return () => {
      if (idleCheckRef.current) clearInterval(idleCheckRef.current);
    };
  }, [state, mode, isRoasting, isStrictMode]);

  const playAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

      for (let i = 0; i < 8; i++) {
        playBeep(880, ctx.currentTime + i * 0.25, 0.15);
        playBeep(660, ctx.currentTime + i * 0.25 + 0.125, 0.1);
      }
    } catch {
      // AudioContext fallback
    }
  };

  const speakRoast = (text: string) => {
    if (!soundEnabled) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const spokenText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '');
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = 1.1;
      utterance.pitch = 0.9;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Male')) || voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const triggerRoast = async () => {
    setIsRoasting(true);
    playAlarmSound();

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
    <div className="h-full flex flex-col p-4 select-none">
      {/* 1. Header Toolbar */}
      <div className="flex justify-between items-center border-b border-sys-groove pb-3 mb-6 bg-zinc-950/10 p-3 rounded-[4px]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-[4px] border ${
            mode === 'focus' ? 'bg-purple-950/20 border-purple-500/20 text-purple-400' : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
          }`}>
            {mode === 'focus' ? <Brain size={18} /> : <Coffee size={18} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">Focus Control Console</h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase">
              {mode === 'focus' ? '🎯 FOCUS SPRINT' : '☕ SYSTEM BREAK'} · {sessions} RUNS COMPLETED
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Strict mode trigger */}
          <button
            onClick={() => setIsStrictMode(!isStrictMode)}
            className={`px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-all duration-150 border cursor-pointer ${
              isStrictMode 
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-400' 
                : 'bg-zinc-900 border-sys-groove text-zinc-500 hover:text-zinc-300'
            }`}
            title="Enable slacker shaming protocols"
          >
            {isStrictMode ? 'STRICT_MODE_ON' : 'STRICT_MODE_OFF'}
          </button>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-zinc-900 border border-sys-groove text-zinc-500 hover:text-zinc-300 rounded-[4px] cursor-pointer"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Oversized Digital Countdown Console Readout */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center select-text">
          <div 
            className="font-mono text-8xl font-extralight tracking-tighter text-zinc-100 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.12)] tabular-nums"
          >
            {formatTime(timeLeft)}
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-500 mt-2">
            {mode === 'focus' ? '🎯 SPRINTING ACTIVE' : '☕ CHILL MODE ENGAGED'}
          </span>
        </div>

        {/* 3. Segmented Controls Grid */}
        <div className="flex border border-sys-groove bg-black/20 rounded-[4px] p-1.5 gap-2">
          <button
            onClick={resetTimer}
            className="p-2 bg-zinc-900 border border-sys-groove hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 rounded-[4px] cursor-pointer spring-transition mechanical-press"
            title="Abort current run"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={toggleTimer}
            className={`px-8 py-2 text-xs font-mono font-bold uppercase rounded-[4px] cursor-pointer spring-transition mechanical-press ${
              state === 'running'
                ? 'bg-rose-900/20 border border-rose-500/30 text-rose-400'
                : mode === 'focus'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {state === 'running' ? 'HALT TIMER' : state === 'paused' ? 'RESUME RUN' : 'INITIATE FOCUS'}
          </button>
        </div>

        {/* Run tally dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.max(4, sessions + 1) }, (_, i) => (
            <div
              key={i}
              className={`w-2.5 h-1.5 rounded-sm transition-all duration-300 ${
                i < sessions
                  ? 'bg-purple-500 shadow-[0_0_6px_#8b5cf6]'
                  : i === sessions && state === 'running'
                    ? 'bg-purple-950 border border-purple-500/40 animate-pulse'
                    : 'bg-zinc-800 border border-sys-groove'
              }`}
            />
          ))}
        </div>
      </div>

      <audio ref={audioRef} src={selectedStation.url} preload="none" />

      {/* 4. Focus Beats Telemetry Widget */}
      <div className="mt-4 p-3 rounded-[4px] border border-sys-groove bg-zinc-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">Focus Telemetry:</span>
          <select
            value={selectedStation.id}
            onChange={(e) => {
              const station = LOFI_STATIONS.find(s => s.id === e.target.value);
              if (station) {
                setSelectedStation(station);
                if (isMusicPlaying && audioRef.current) {
                  setTimeout(() => {
                    audioRef.current?.play().catch(e => console.log(e));
                  }, 100);
                }
              }
            }}
            className="bg-zinc-900 border border-sys-groove text-xs rounded px-2 py-1 text-zinc-300 outline-none cursor-pointer"
          >
            {LOFI_STATIONS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => setIsMusicPlaying(!isMusicPlaying)}
          className={`px-3 py-1 text-[10px] font-mono font-bold rounded-[3px] transition-all cursor-pointer ${
            isMusicPlaying 
              ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' 
              : 'bg-zinc-900 text-zinc-500 border border-sys-groove'
          }`}
        >
          {isMusicPlaying ? 'SIGNAL_PLAYING' : 'SIGNAL_MUTED'}
        </button>
      </div>

      {/* Info Notice */}
      <div className="mt-4 p-3 bg-zinc-950/40 border border-sys-groove rounded-[4px] text-[10px] text-zinc-500 leading-normal flex gap-2">
        <Info size={14} className="text-purple-400 shrink-0" />
        <div className="space-y-1">
          <p><b className="text-zinc-400">Strict Telemetry Rules:</b> Navigation away from this screen or closing the workspace during active focus sessions logs a focus failure, and shames you publicly to your guilds. split screen is supported.</p>
        </div>
      </div>

      {/* ROAST OVERLAY */}
      <AnimatePresence>
        {isRoasting && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="max-w-md w-full p-6 rounded-[4px] text-center border-2 border-rose-500/40 bg-zinc-950 relative chamfered-edge shadow-2xl">
              <div className="w-12 h-12 rounded bg-rose-950/30 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                <span className="text-2xl animate-pulse">🚨</span>
              </div>

              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-rose-500 mb-2">
                SLACKER ALERT ACTIVATED
              </h3>

              <p className="text-xs text-zinc-400 leading-relaxed mb-6 select-text">
                {roastText || 'Get back to work!'}
              </p>

              <button
                onClick={confirmTask}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold uppercase text-white rounded-[4px] flex items-center gap-1.5 mx-auto cursor-pointer spring-transition mechanical-press"
              >
                <CheckCircle2 size={14} /> Resume focus task
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
