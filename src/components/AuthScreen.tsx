'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, School, Target, BookOpen, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import VayuOrb from './VayuOrb';
import { signUpWithEmailAndProfile, signInWithEmail, signInWithGoogle, checkRedirectResult, getUserProfile, updateFullProfile } from '@/lib/firebase';
import { syncProfileToSheet } from '@/actions/sheets';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'signup' | 'onboarding';

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState(0); // For signup wizard
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingUid, setOnboardingUid] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [board, setBoard] = useState('');
  const [school, setSchool] = useState('');
  const [aim, setAim] = useState('');

  // Check for Google redirect result on mount
  useEffect(() => {
    checkRedirectResult().then(async user => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (!profile?.class || !profile?.aim) {
          setName(profile?.name || user.displayName || '');
          setEmail(profile?.email || user.email || '');
          setOnboardingUid(user.uid);
          setMode('onboarding');
          setStep(1); // Skip the credential step
        } else {
          onAuthSuccess();
        }
      }
    }).catch((err) => {
      console.error('[VidyaVerse] Redirect sign-in error:', err);
    });
  }, [onAuthSuccess]);

  // Helper to extract a friendly Firebase error message
  const getFirebaseErrorMessage = (err: unknown): string => {
    const error = err as { code?: string; message?: string };
    const code = error?.code || '';
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email. Sign up first!';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Try logging in.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed. Please try again.';
      case 'auth/popup-blocked':
        return 'Popup was blocked by your browser. Trying redirect...';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase. Add localhost to Authorized Domains in Firebase Console > Authentication > Settings.';
      case 'auth/network-request-failed':
        return 'Network error. Check your internet connection.';
      case 'auth/configuration-not-found':
        return 'Firebase Auth is not configured. Enable Email/Password and Google sign-in in Firebase Console.';
      default:
        return error?.message || `Authentication failed (${code || 'unknown error'})`;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { setError('Fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      await signInWithEmail(email, password);
      onAuthSuccess();
    } catch (err) {
      console.error('[VidyaVerse] Login error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await signInWithGoogle();
      const profile = await getUserProfile(user.uid);
      if (!profile?.class || !profile?.aim) {
        setName(profile?.name || user.displayName || '');
        setEmail(profile?.email || user.email || '');
        setOnboardingUid(user.uid);
        setMode('onboarding');
        setStep(1); // Jump to Academic Profile step
      } else {
        onAuthSuccess();
      }
    } catch (err) {
      console.error('[VidyaVerse] Google sign-in error:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-blocked') {
        setError('Redirecting to Google sign-in...');
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if ((mode === 'signup' && (!name || !email || !password)) || !studentClass || !board || !school || !aim) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'onboarding' && onboardingUid) {
        // Just update the existing Google Auth profile
        await updateFullProfile(onboardingUid, {
          name, class: studentClass, board, school, aim
        });
        syncProfileToSheet({ uid: onboardingUid, name, email, class: studentClass, board, school, aim })
          .catch(sheetErr => console.warn('[VidyaVerse] Sheet sync failed:', sheetErr));
        onAuthSuccess();
      } else {
        // Create entirely new Email/Password user
        const user = await signUpWithEmailAndProfile(email, password, {
          name, class: studentClass, board, school, aim, xp: 0, streak: 0
        });
        syncProfileToSheet({ uid: user.uid, name, email, class: studentClass, board, school, aim })
          .catch(sheetErr => console.warn('[VidyaVerse] Sheet sync failed:', sheetErr));
        onAuthSuccess();
      }
    } catch (err) {
      console.error('[VidyaVerse] Signup error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const signupSteps = [
    {
      title: 'Who are you?',
      subtitle: 'Let VAYU know your identity',
      fields: (
        <div className="space-y-3">
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" type="password" placeholder="Create password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </div>
      ),
      valid: name && email && password,
    },
    {
      title: 'Your Academic Profile',
      subtitle: 'Help VAYU personalize your journey',
      fields: (
        <div className="space-y-3">
          <div className="relative">
            <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <select className="input-glass !pl-10 appearance-none" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
              <option value="">Select your class</option>
              {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                <option key={c} value={c}>{c} Class</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <select className="input-glass !pl-10 appearance-none" value={board} onChange={e => setBoard(e.target.value)}>
              <option value="">Select your board</option>
              {['CBSE', 'ICSE', 'State Board', 'IB', 'Other'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <School size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" placeholder="School name" value={school} onChange={e => setSchool(e.target.value)} />
          </div>
        </div>
      ),
      valid: studentClass && board && school,
    },
    {
      title: 'What\'s your dream?',
      subtitle: 'VAYU will keep you accountable to this',
      fields: (
        <div className="space-y-3">
          <div className="relative">
            <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input
              className="input-glass !pl-10"
              placeholder="e.g., IIT Engineer, Doctor, Game Developer..."
              value={aim}
              onChange={e => setAim(e.target.value)}
            />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            💡 VAYU will reference your aim in every interaction to keep you motivated and focused on what truly matters.
          </p>
        </div>
      ),
      valid: aim,
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grain" style={{ background: 'var(--background)' }}>
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #6c63ff, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #00f0ff, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} /* Premium easing */
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="huly-waterfall-wrap rounded-2xl p-8 bg-[#09090b]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <VayuOrb size="md" />
            <h1 className="text-3xl font-extrabold mt-5 tracking-tight text-white drop-shadow-md">VidyaVerse</h1>
            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--muted)' }}>
              Enter your study universe
            </p>
          </div>

          {/* Mode Toggle */}
          {mode !== 'onboarding' && (
            <div className="flex rounded-xl p-1 mb-8" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              {(['signup', 'login'] as AuthMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStep(0); setError(''); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === m ? 'var(--primary)' : 'transparent',
                    color: mode === m ? 'white' : 'var(--muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {m === 'signup' ? 'Sign Up' : 'Login'}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-center mb-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,77,106,0.1)', color: '#ff4d6a' }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {mode === 'login' ? (
            /* LOGIN FORM */
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input className="input-glass !pl-10" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input className="input-glass !pl-10" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight size={16} />
              </motion.button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: '1px solid var(--border-color)' }} />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs" style={{ background: 'var(--background)', color: 'var(--muted)' }}>or</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles size={16} />
                Continue with Google
              </button>
            </motion.div>
          ) : (
            /* SIGNUP & ONBOARDING WIZARD */
            <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              
              {mode === 'onboarding' && (
                <div className="text-center mb-6">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Welcome via Google! 🎉</h3>
                  <p className="text-xs text-[var(--muted)]">Please complete your profile to continue.</p>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {signupSteps.slice(mode === 'onboarding' ? 1 : 0).map((_, idx) => {
                  const actualStep = mode === 'onboarding' ? idx + 1 : idx;
                  return (
                    <motion.div
                      key={actualStep}
                      className="h-1.5 rounded-full"
                      animate={{
                        width: actualStep === step ? 24 : 8,
                        background: actualStep <= step ? '#6c63ff' : 'var(--border-color)',
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                    {signupSteps[step].title}
                  </h3>
                  <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                    {signupSteps[step].subtitle}
                  </p>
                  {signupSteps[step].fields}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-3 mt-6">
                {step > (mode === 'onboarding' ? 1 : 0) && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="btn-ghost flex-1"
                  >
                    Back
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (step < signupSteps.length - 1) {
                      if (signupSteps[step].valid) setStep(s => s + 1);
                      else setError('Please fill all fields');
                    } else {
                      handleSignup();
                    }
                  }}
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading 
                    ? 'Saving...'
                    : step < signupSteps.length - 1 
                      ? 'Next' 
                      : 'Launch VidyaVerse'
                  }
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs mt-4" style={{ color: 'var(--muted)' }}>
          Built for students in Ranchi &amp; beyond 🇮🇳
        </p>
      </motion.div>
    </div>
  );
}
