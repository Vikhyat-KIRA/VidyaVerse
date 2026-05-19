'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Loader2, Play } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateDailyBossChallenge, evaluateBossChallengeAnswer } from '@/lib/gemini';
import { awardXp } from '@/lib/exp';

interface BossBattlePanelProps {
  userUid: string;
}

export default function BossBattlePanel({ userUid }: BossBattlePanelProps) {
  const [loading, setLoading] = useState(true);
  const [summoning, setSummoning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Today's Battle state
  const [challenge, setChallenge] = useState<string | null>(null);
  const [passed, setPassed] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);

  const todayKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  useEffect(() => {
    loadTodayChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSummonBoss = async () => {
    setSummoning(true);
    try {
      const newChallenge = await generateDailyBossChallenge(userUid);
      
      // Save challenge to Firestore
      const docRef = doc(db, 'users', userUid, 'boss_battle', todayKey);
      await setDoc(docRef, {
        challenge: newChallenge,
        passed: false,
        attempts: 0,
        createdAt: new Date()
      }, { merge: true });

      setChallenge(newChallenge);
      setPassed(false);
      setFeedback(null);
    } catch (e) {
      console.error(e);
      alert("Failed to summon Boss: " + (e as Error).message);
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
        // Award XP! Big +50 XP reward!
        await awardXp(userUid, 50);
        alert("🏆 VICTORY! You defeated VAYU in today's Boss Battle! +50 XP Awarded!");
      }
    } catch (e) {
      console.error(e);
      alert("Evaluation failed: " + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
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
      ) : !challenge ? (
        /* SUMMON SCREEN */
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
            VAYU challenges you to a conceptual academic dual. Win to claim massive XP and show off on the leaderboards! ⚔️
          </p>

          <button
            onClick={handleSummonBoss}
            disabled={summoning}
            className="w-full mt-6 btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
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

          {feedback && (
            <div className="mt-4 p-4 rounded-2xl bg-green-500/10 text-green-400 text-xs italic border border-green-500/20 leading-relaxed">
              &ldquo;{feedback}&rdquo;
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4 text-xs font-bold text-green-500 uppercase tracking-widest bg-green-500/10 border border-green-500/20 py-2.5 px-4 rounded-xl">
            🎉 +50 XP Awarded
          </div>
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
            <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold uppercase border border-red-500/20">
              Attempt #{attempts + 1}
            </span>
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
        </motion.div>
      )}
    </div>
  );
}
