'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Loader2, Play, ImagePlus, X, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, getUserProfile } from '@/lib/firebase';
import { generateDailyBossChallenge, evaluateBossChallengeAnswer } from '@/lib/gemini';
import { awardXp } from '@/lib/exp';
import { useToast } from '@/components/Toast';

interface BossBattlePanelProps {
  userUid: string;
  battleDifficulty?: 'easy' | 'medium' | 'hard' | 'legendary';
}

export default function BossBattlePanel({ 
  userUid,
  battleDifficulty = 'medium' 
}: BossBattlePanelProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summoning, setSummoning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [setupMode, setSetupMode] = useState(true);
  const [topic, setTopic] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userClass, setUserClass] = useState('');

  // Encounter state
  const [challenge, setChallenge] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');

  const todayKey = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayChallenge();
    loadUserProfile();
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

      // Append difficulty level
      const fullTopic = `${topicString} [Difficulty: ${battleDifficulty.toUpperCase()}]`;

      const newChallenge = await generateDailyBossChallenge(userUid, fullTopic, userClass, imageBase64);
      
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
      toast.success('⚔️ VAYU AI Boss summoned! Engage combat now.');
    } catch (e) {
      console.error(e);
      toast.error('Summon failed: ' + (e as Error).message);
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
        // XP scaling by difficulty
        const xpMap = { easy: 10, medium: 25, hard: 50, legendary: 100 };
        const award = xpMap[battleDifficulty] || 25;
        await awardXp(userUid, award);
        toast.success(`🏆 VICTORY! Boss defeated. +${award} XP Awarded!`);
      } else {
        toast.error('❌ STRIKE DEFLECTED! Boss shields held. Review feedback and retry.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Shield evaluation aborted: ' + (e as Error).message);
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

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden p-6">
      {loading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-2" />
          <p className="text-xs font-mono text-zinc-500 uppercase">SYNCING COMBAT NODE...</p>
        </div>
      ) : setupMode ? (
        /* Setup Combat Screen */
        <div className="max-w-md w-full text-center p-6 border border-sys-groove bg-zinc-950/20 rounded-[4px] relative">
          <div className="w-12 h-12 bg-rose-950/20 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 rounded">
            <Swords className="w-6 h-6 text-rose-500 animate-pulse" />
          </div>

          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">Daily Study Boss Battle</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-normal">
            Input a concept or provide schematic pages. VAYU will forge an exam-level tactical study encounter.
          </p>

          <div className="mt-4 flex flex-col gap-3 text-left">
            <div>
              <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1">Combat Subject / Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Krebs Cycle, Photosynthesis, Electromagnetic Induction..."
                className="w-full bg-zinc-900/60 border border-sys-groove p-2 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1">Visual Reference Schematic</label>
              {attachedImage ? (
                <div className="relative rounded border border-sys-groove overflow-hidden bg-black/40">
                  <img src={attachedImage} alt="Reference" className="w-full max-h-[120px] object-contain" />
                  <button
                    onClick={() => { setAttachedImage(null); setAttachedFileName(''); }}
                    className="absolute top-2 right-2 p-1 bg-zinc-950 border border-sys-groove text-rose-500 rounded"
                  >
                    <X size={10} />
                  </button>
                  <p className="text-[9px] font-mono text-zinc-500 p-1.5 truncate">{attachedFileName}</p>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-sys-groove hover:border-zinc-800 rounded flex flex-col items-center gap-1.5 bg-zinc-900/10 cursor-pointer spring-transition"
                >
                  <ImagePlus size={18} className="text-zinc-500" />
                  <span className="text-[10px] text-zinc-500">Attach diagrams or reference pages</span>
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
          </div>

          <button
            onClick={handleSummonBoss}
            disabled={summoning || (!topic.trim() && !attachedImage)}
            className="w-full mt-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-mono font-bold uppercase text-white rounded-[4px] cursor-pointer spring-transition mechanical-press flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {summoning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                SUMMONING ENCOUNTER PROTOCOLS...
              </>
            ) : (
              <>
                <Swords size={12} />
                INITIATE DAILY ENCOUNTER
              </>
            )}
          </button>
        </div>
      ) : passed ? (
        /* Win screen */
        <div className="max-w-md w-full text-center p-6 border border-emerald-500/20 bg-emerald-950/5 rounded-[4px] relative">
          <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 rounded shadow-[0_0_8px_rgba(16,185,129,0.1)]">
            <Trophy className="w-6 h-6 text-emerald-400" />
          </div>

          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-emerald-400">VICTORY SECURED</h2>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-normal">
            The study encounter has been completely resolved. VAYU shields depleted.
          </p>

          {feedback && (
            <div className="mt-4 p-4 rounded bg-emerald-950/10 border border-emerald-500/20 text-xs text-emerald-400 leading-relaxed italic select-text">
              &ldquo;{feedback}&rdquo;
            </div>
          )}

          <div className="mt-5 inline-block bg-emerald-950 border border-emerald-500/20 px-4 py-1.5 rounded font-mono text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
            {battleDifficulty.toUpperCase()} DEFOCUSED: +50 XP
          </div>

          <button
            onClick={handleNewBattle}
            className="block w-full mt-6 text-[10px] font-mono font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider bg-transparent border-none cursor-pointer"
          >
            ⚔️ Request New Combat Node
          </button>
        </div>
      ) : (
        /* Active quiz screen */
        <div className="max-w-xl w-full p-5 border border-sys-groove bg-zinc-950/20 rounded-[4px] relative flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-sys-groove/40 pb-2.5">
            <h3 className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
              <Swords className="text-rose-500 animate-pulse" size={14} />
              ENCOUNTER IN PROGRESS
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-purple-500/20 bg-purple-950/20 text-purple-400 uppercase">
                DIFF: {battleDifficulty}
              </span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-rose-500/20 bg-rose-950/20 text-rose-400 uppercase">
                STRIKE #{attempts + 1}
              </span>
            </div>
          </div>

          <div className="p-4 rounded bg-rose-950/5 border border-rose-500/10 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans select-text">
            {challenge}
          </div>

          {feedback && (
            <div className="p-3 rounded bg-rose-950/10 border border-rose-500/20 text-[11px] text-rose-400 italic leading-relaxed select-text">
              <strong>VAYU FEEDBACK:</strong> &ldquo;{feedback}&rdquo;
            </div>
          )}

          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <div>
              <label className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">Write Your Explanation</label>
              <textarea
                required
                rows={4}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Compose a rigorous conceptual formulation to strike..."
                className="w-full bg-zinc-900/60 border border-sys-groove p-3 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 resize-none custom-scrollbar font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-xs font-mono font-bold uppercase text-white rounded-[4px] cursor-pointer spring-transition mechanical-press flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  EVALUATING SCHEMATICS STRIKE...
                </>
              ) : (
                <>
                  <Swords size={12} />
                  STRIKE COMBAT TARGET
                </>
              )}
            </button>
          </form>

          <button
            onClick={handleNewBattle}
            className="text-[9px] font-mono font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest text-center mt-2 bg-transparent border-none cursor-pointer"
          >
            ← Abort Battle & Reset
          </button>
        </div>
      )}
    </div>
  );
}
