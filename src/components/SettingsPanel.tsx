'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, School, Target, BookOpen, GraduationCap, Save, Check } from 'lucide-react';
import { getUserProfile, updateFullProfile } from '@/lib/firebase';
import { syncProfileToSheet } from '@/actions/sheets';

interface SettingsPanelProps {
  userUid: string;
}

export default function SettingsPanel({ userUid }: SettingsPanelProps) {
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [board, setBoard] = useState('');
  const [school, setSchool] = useState('');
  const [aim, setAim] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  const loadProfile = async () => {
    setLoading(true);
    const user = await getUserProfile(userUid);
    if (user) {
      setName(user.name);
      setStudentClass(user.class);
      setBoard(user.board);
      setSchool(user.school);
      setAim(user.aim);
      setEmail(user.email);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Update Firestore
    await updateFullProfile(userUid, {
      name,
      class: studentClass,
      board,
      school,
      aim,
    });
    // Sync to Google Sheets
    await syncProfileToSheet({
      uid: userUid,
      name,
      email,
      class: studentClass,
      board,
      school,
      aim,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin-slow w-8 h-8 rounded-full" style={{ border: '2px solid var(--border-color)', borderTopColor: 'var(--primary)' }} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(108, 99, 255, 0.1)' }}>
          <User size={20} style={{ color: '#6c63ff' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Profile Settings</h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Update your info — VAYU adapts to changes</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Email</label>
          <input className="input-glass opacity-60" value={email} disabled />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Class</label>
            <div className="relative">
              <GraduationCap size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <select className="input-glass !pl-10 appearance-none" value={studentClass} onChange={e => setStudentClass(e.target.value)}>
                {['6th', '7th', '8th', '9th', '10th', '11th', '12th'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Board</label>
            <div className="relative">
              <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <select className="input-glass !pl-10 appearance-none" value={board} onChange={e => setBoard(e.target.value)}>
                {['CBSE', 'ICSE', 'State Board', 'IB', 'Other'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>School</label>
          <div className="relative">
            <School size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={school} onChange={e => setSchool(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--muted)' }}>Life Aim / Goal</label>
          <div className="relative">
            <Target size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input className="input-glass !pl-10" value={aim} onChange={e => setAim(e.target.value)} placeholder="e.g., IIT Engineer, Doctor..." />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            💡 VAYU uses this to personalize every interaction
          </p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        className="mt-4 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        style={{
          background: saved
            ? 'linear-gradient(135deg, #34d399, #22c55e)'
            : 'linear-gradient(135deg, #6c63ff, #8b5cf6)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {saved ? (
          <><Check size={16} /> Saved!</>
        ) : (
          <><Save size={16} /> Save Changes</>
        )}
      </motion.button>
    </div>
  );
}
