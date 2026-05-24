'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Loader2, Play, ImagePlus, X, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { doc, getDoc, setDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, getUserProfile } from '@/lib/firebase';
import { generateDailyBossChallenge, evaluateBossChallengeAnswer } from '@/lib/gemini';
import { awardXp } from '@/lib/exp';
import { useToast } from '@/components/Toast';

interface BossBattlePanelProps {
  userUid: string;
}

interface BattleRecord {
  date: string;
  topic: string;
  passed: boolean;
  attempts: number;
}

export default function BossBattlePanel({ userUid }: BossBattlePanelProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summoning, setSummoning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<BattleRecord[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  
  // Setup state (topic + optional image)
  const [setupMode, setSetupMode] = useState(true);
  const [topic, setTopic] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User profile info
  const [userClass, setUserClass] = useState('');

  // Today's Battle state
  const [challenge, setChallenge] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');

  const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  useEffect(() => {
    loadTodayChallenge();
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(userUid);
      if (profile) {
        setUserClass(profile.class || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTodayChallenge = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', userUid, 'boss_battle', todayKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setChallenge(data.challenge || null);
        setPassed(data.passed || false);
        setFeedback(data.feedback || null);
        setAttempts(data.attempts || 0);
        setCurrentTopic(data.topic || '');
        if (data.challenge) {
          setSetupMode(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage(ev.target?.result as string);
      setAttachedFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSummonBoss = async () => {
    if (!topic.trim() && !attachedImage) return;
    
    setSummoning(true);
    try {
      const topicString = topic.trim() || 'Analyze the attached image and generate a challenging question from it';
      const imageBase64 = attachedImage ? attachedImage.split(',')[1] : undefined;

      const newChallenge = await generateDailyBossChallenge(userUid, topicString, userClass, imageBase64);
      
      // Save challenge to Firestore
      const docRef = doc(db, 'users', userUid, 'boss_battle', todayKey);
      await setDoc(docRef, {
        challenge: newChallenge,
        passed: false,
        attempts: 0,
        topic: topic.trim() || 'Image-based challenge',
        createdAt: new Date()
      }, { merge: true });

      setChallenge(newChallenge);
      setCurrentTopic(topic.trim() || 'Image-based challenge');
      setPassed(false);
      setFeedback(null);
      setSetupMode(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to summon Boss: ' + (e as Error).message);
    } finally {
      setSummoning(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !challenge) return;

    setSubmitting(true);
    try {
      const res = await evaluateBossChallengeAnswer(userUid, challenge, userAnswer.trim());
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Save results
      const docRef = doc(db, 'users', userUid, 'boss_battle', todayKey);
      await setDoc(docRef, {
        passed: res.passed,
        feedback: res.feedback,
        attempts: newAttempts,
        userAnswer: userAnswer.trim()
      }, { merge: true });

      setPassed(res.passed);
      setFeedback(res.feedback);

      if (res.passed) {
        await awardXp(userUid, 50);
        toast.success('🏆 VICTORY! You defeated VAYU’s Boss Battle! +50 XP Awarded!');
      }
    } catch (e) {
      console.error(e);
      toast.error('Evaluation failed: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBattle = () => {
    setSetupMode(true);
    setChallenge(null);
    setPassed(false);
    setFeedback(null);
    setUserAnswer('');
    setAttempts(0);
    setTopic('');
    setAttachedImage(null);
    setAttachedFileName('');
  };

  const loadHistory = async () => {
    if (historyLoaded) return;
    try {
      const colRef = collection(db, 'users', userUid, 'boss_battle');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const records: BattleRecord[] = snap.docs
        .filter(d => d.id !== todayKey) // exclude today
        .map(d => ({
          date: d.id,
          topic: d.data().topic || 'Unknown',
          passed: d.data().passed || false,
          attempts: d.data().attempts || 0,
        }));
      setHistory(records);
      setHistoryLoaded(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHistory = () => {
    if (!historyLoaded) loadHistory();
    setShowHistory(p => !p);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* RPG Glow in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[var(--primary)]/5 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {loading ? (
        <div className="flex flex-col items-center z-10">
          <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mb-2" />
          <p className="text-xs text-[var(--muted)]">Syncing today&apos;s encounter...</p>
        </div>
      ) : setupMode ? (
        /* SETUP SCREEN — Choose Topic or Upload Image */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center p-8 rounded-3xl border border-[var(--border-color)] bg-black/30 backdrop-blur-md relative z-10"
        >
          <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-center justify-center mx-auto mb-6">
            <Swords className="w-8 h-8 text-[var(--primary)] animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Daily Boss Battle</h2>
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed max-w-xs mx-auto">
            Choose a topic or upload a reference image. VAYU will craft a tough challenge for you! ⚔️
          </p>

          {userClass && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              <BookOpen size={12} />
              Class {userClass}
            </div>
          )}

          {/* Topic Input */}
          <div className="mt-6 text-left">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block">Topic / Subject</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Quadratic Equations, Photosynthesis, Newton's Laws..."
              className="input-glass w-full text-sm"
            />
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 block text-left">Or Upload Reference Image</label>
            
            {attachedImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)]">
                <img src={attachedImage} alt="Reference" className="w-full max-h-[150px] object-contain bg-black/20" />
                <button
                  onClick={() => { setAttachedImage(null); setAttachedFileName(''); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 text-white"
                  style={{ border: 'none', cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
                <p className="text-[10px] text-[var(--muted)] p-2 truncate">{attachedFileName}</p>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-[var(--border-color)] hover:border-[var(--primary)]/40 transition-all flex flex-col items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}
              >
                <ImagePlus size={24} className="text-[var(--muted)]" />
                <span className="text-xs text-[var(--muted)]">Click to upload a textbook page, diagram, or notes</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileAttach}
            />
          </div>

          <button
            onClick={handleSummonBoss}
            disabled={summoning || (!topic.trim() && !attachedImage)}
            className="w-full mt-6 btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #6c63ff, #ff4d6a)',
              boxShadow: '0 8px 30px rgba(108, 99, 255, 0.2)'
            }}
          >
            {summoning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Summoning VAYU...
              </>
            ) : (
              <>
                <Play size={16} fill="white" />
                Summon VAYU Challenge
              </>
            )}
          </button>

          {/* Past Battles History */}
          <div className="mt-5 w-full">
            <button
              onClick={handleToggleHistory}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--muted)', cursor: 'pointer' }}
            >
              <span className="flex items-center gap-1.5"><Clock size={12} /> Past Battles</span>
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {!historyLoaded ? (
                      <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-[var(--muted)]" /></div>
                    ) : history.length === 0 ? (
                      <p className="text-center text-xs py-3" style={{ color: 'var(--muted)' }}>No past battles yet</p>
                    ) : history.map(rec => (
                      <div key={rec.date} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="text-left min-w-0">
                          <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>{rec.topic}</p>
                          <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{rec.date} · {rec.attempts} attempt{rec.attempts !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="ml-2 text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{
                          background: rec.passed ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                          color: rec.passed ? '#10b981' : '#f43f5e',
                          border: `1px solid ${rec.passed ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)'}`,
                        }}>
                          {rec.passed ? '✓ Win' : '✗ Loss'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : passed ? (
        /* VICTORY SCREEN */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center p-8 rounded-3xl border border-green-500/30 bg-green-500/5 backdrop-blur-md relative z-10"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-8 h-8 text-green-500" />
          </div>

          <h2 className="text-2xl font-bold text-green-400">VICTORY achieved!</h2>
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
            VAYU stands defeated today. You answered perfectly and gained high respect!
          </p>

          {currentTopic && (
            <div className="mt-2 text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">
              Topic: {currentTopic}
            </div>
          )}

          {feedback && (
            <div className="mt-4 p-4 rounded-2xl bg-green-500/10 text-green-400 text-xs italic border border-green-500/20 leading-relaxed">
              &ldquo;{feedback}&rdquo;
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4 text-xs font-bold text-green-500 uppercase tracking-widest bg-green-500/10 border border-green-500/20 py-2.5 px-4 rounded-xl">
            🎉 +50 XP Awarded
          </div>

          <button
            onClick={handleNewBattle}
            className="mt-4 text-xs text-[var(--muted)] hover:text-[var(--foreground)] font-bold uppercase tracking-wider transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ⚔️ Start New Battle
          </button>
        </motion.div>
      ) : (
        /* CHALLENGE SCREEN */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full p-6 rounded-3xl border border-[var(--border-color)] bg-black/30 backdrop-blur-md relative z-10 flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2 uppercase tracking-wider">
              <Swords className="text-red-500 animate-pulse" size={16} />
              Encountering VAYU
            </h3>
            <div className="flex items-center gap-2">
              {currentTopic && (
                <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full font-bold uppercase border border-[var(--primary)]/20 max-w-[120px] truncate">
                  {currentTopic}
                </span>
              )}
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase border border-red-500/20">
                Attempt #{attempts + 1}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 text-xs leading-relaxed text-[var(--foreground)] font-semibold whitespace-pre-wrap">
            {challenge}
          </div>

          {feedback && !passed && (
            <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 text-xs italic border border-red-500/20 leading-relaxed">
              <strong>VAYU says:</strong> &ldquo;{feedback}&rdquo;
            </div>
          )}

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1 block">Your Solution</label>
              <textarea
                required
                rows={4}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Write a clear, conceptual answer to defeat VAYU..."
                className="w-full input-glass text-xs p-4 resize-none custom-scrollbar"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #ff4d6a, #6c63ff)'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing response...
                </>
              ) : (
                <>
                  <Swords size={16} />
                  Strike Boss!
                </>
              )}
            </button>
          </form>

          <button
            onClick={handleNewBattle}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] font-bold uppercase tracking-wider text-center transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Choose Different Topic
          </button>
        </motion.div>
      )}
    </div>
  );
}
