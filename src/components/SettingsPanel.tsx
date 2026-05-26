'use client';

import { useState, useEffect } from 'react';
import { User, School, Target, BookOpen, GraduationCap, Save, Check, Volume2, VolumeX } from 'lucide-react';
import { getUserProfile, updateFullProfile } from '@/lib/firebase';
import { syncProfileToSheet } from '@/actions/sheets';
import { useToast } from '@/components/Toast';

interface SettingsPanelProps {
  userUid: string;
  onChangeName?: (name: string) => void;
  onChangeAim?: (aim: string) => void;
  currentName?: string;
  currentAim?: string;
}

export default function SettingsPanel({
  userUid,
  onChangeName,
  onChangeAim,
  currentName = '',
  currentAim = '',
}: SettingsPanelProps) {
  const toast = useToast();
  const [name, setName] = useState(currentName);
  const [studentClass, setStudentClass] = useState('10th');
  const [board, setBoard] = useState('CBSE');
  const [school, setSchool] = useState('');
  const [aim, setAim] = useState(currentAim);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  useEffect(() => {
    import('@/lib/audio').then(({ audioEngine }) => {
      setAudioEnabled(audioEngine.isEnabled());
    });
  }, []);

  const handleToggleAudio = () => {
    import('@/lib/audio').then(({ audioEngine }) => {
      const newVal = !audioEnabled;
      audioEngine.setEnabled(newVal);
      setAudioEnabled(newVal);
      if (newVal) {
        audioEngine.playClick();
      }
      toast.success(newVal ? 'Tactile mechanical feedback active.' : 'Tactile sound feedback muted.');
    });
  };

  useEffect(() => {
    loadProfile();
  }, [userUid]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const user = await getUserProfile(userUid);
      if (user) {
        setName(user.name);
        setStudentClass(user.class || '10th');
        setBoard(user.board || 'CBSE');
        setSchool(user.school || '');
        setAim(user.aim || '');
        setEmail(user.email || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateFullProfile(userUid, {
        name,
        class: studentClass,
        board,
        school,
        aim,
      });

      await syncProfileToSheet({
        uid: userUid,
        name,
        email,
        class: studentClass,
        board,
        school,
        aim,
      });
      
      if (onChangeName) onChangeName(name);
      if (onChangeAim) onChangeAim(aim);
      
      setSaved(true);
      toast.success('System preferences securely committed.');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      toast.error('Failed to commit profile updates.');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-2" />
        <span className="text-xs font-mono text-zinc-500 uppercase">AUDITING PROFILE CONFIG...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto no-scrollbar">
      {/* 1. Header */}
      <div className="flex justify-between items-center border-b border-sys-groove pb-3 mb-6 bg-zinc-950/10 p-3 rounded-[4px]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 border border-sys-groove text-purple-400 rounded-[4px]">
            <User size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">System Settings</h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">MANAGE USER METADATA & CONFIG</p>
          </div>
        </div>
      </div>

      {/* 2. Form Content */}
      <div className="flex-1 space-y-4 max-w-md">
        <div>
          <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">User Full Name</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              className="w-full bg-zinc-900/60 border border-sys-groove p-2 pl-9 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">Encrypted Account Identifier</label>
          <input 
            className="w-full bg-zinc-900/20 border border-sys-groove/40 p-2 text-xs rounded text-zinc-500 outline-none font-mono cursor-not-allowed select-all" 
            value={email} 
            disabled 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">Academic Grade</label>
            <div className="relative">
              <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <select 
                className="w-full bg-zinc-900/60 border border-sys-groove p-2 pl-9 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans appearance-none cursor-pointer" 
                value={studentClass} 
                onChange={e => setStudentClass(e.target.value)}
              >
                {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                  <option key={c} value={c} className="bg-zinc-900">{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">School Board</label>
            <div className="relative">
              <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <select 
                className="w-full bg-zinc-900/60 border border-sys-groove p-2 pl-9 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans appearance-none cursor-pointer" 
                value={board} 
                onChange={e => setBoard(e.target.value)}
              >
                {['CBSE', 'ICSE', 'State Board', 'IB', 'Other'].map(b => (
                  <option key={b} value={b} className="bg-zinc-900">{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">School / Academy</label>
          <div className="relative">
            <School size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              className="w-full bg-zinc-900/60 border border-sys-groove p-2 pl-9 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans" 
              value={school} 
              onChange={e => setSchool(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1.5">Life Objective / Purpose</label>
          <div className="relative">
            <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              className="w-full bg-zinc-900/60 border border-sys-groove p-2 pl-9 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 font-sans" 
              value={aim} 
              onChange={e => setAim(e.target.value)} 
              placeholder="e.g. Become a Principal Aerospace Architect..."
            />
          </div>
          <p className="text-[9px] font-mono text-zinc-600 mt-1">
            💡 VAYU uses this objective to structure custom flashcards, quiz difficulties, and roasts.
          </p>
        </div>

        {/* Tactile Sound Feedback System Toggle */}
        <div className="p-3.5 bg-zinc-950/40 border border-sys-groove rounded-[4px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 border border-sys-groove text-amber-500 rounded-[4px]">
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-300">Tactile Audio Feedback</p>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">SKEUOMORPHIC SWITCH SOUNDS</p>
            </div>
          </div>
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded-[3px] border cursor-pointer spring-transition ${
              audioEnabled 
                ? 'bg-purple-950/20 border-purple-500/30 text-purple-400' 
                : 'bg-zinc-900 border-sys-groove text-zinc-500'
            }`}
          >
            {audioEnabled ? 'ACTIVE' : 'MUTED'}
          </button>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-mono font-bold uppercase text-white rounded-[4px] cursor-pointer spring-transition mechanical-press flex items-center justify-center gap-1.5"
        >
          {saved ? (
            <><Check size={14} /> CHANGES SECURED</>
          ) : (
            <><Save size={14} /> COMMIT PREFERENCES</>
          )}
        </button>
      </div>
    </div>
  );
}

// Inline Loader2 fallback since it might not be imported
function Loader2(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

