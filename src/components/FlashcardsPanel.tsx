'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Sparkles, Plus, Trash2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { getFlashcards, addFlashcard, updateFlashcardBox, deleteFlashcard, type Flashcard } from '@/lib/flashcards';
import { generateFlashcardsFromContext } from '@/lib/gemini';
import { awardXp } from '@/lib/exp';

interface FlashcardsPanelProps {
  userUid: string;
}

export default function FlashcardsPanel({ userUid }: FlashcardsPanelProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [forging, setForging] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Active study state
  const [studying, setStudying] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionsStats, setSessionsStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userUid]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const allCards = await getFlashcards(userUid);
      setCards(allCards);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Generate cards with VAYU
  const handleForgeWithVayu = async () => {
    setForging(true);
    try {
      // Fetch cards from Gemini using vault and history
      const generated = await generateFlashcardsFromContext(userUid, "Latest study session analysis request.");
      
      // Save all to Firestore
      for (const card of generated) {
        await addFlashcard(userUid, card.question, card.answer);
      }

      // Award 20 XP for forging!
      await awardXp(userUid, 20);

      alert("✨ VAYU has forged 6 new flashcards based on your memory vault! +20 XP Awarded!");
      await loadCards();
    } catch (e) {
      console.error(e);
      alert("Failed to forge cards: " + (e as Error).message);
    } finally {
      setForging(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    try {
      await addFlashcard(userUid, newQuestion.trim(), newAnswer.trim());
      setNewQuestion('');
      setNewAnswer('');
      setShowAddModal(false);
      await loadCards();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (confirm("Delete this card forever?")) {
      await deleteFlashcard(userUid, id);
      await loadCards();
    }
  };

  const handleStudyAnswer = async (gotRight: boolean) => {
    const card = cards[currentCardIndex];
    if (card.id) {
      await updateFlashcardBox(userUid, card.id, gotRight, card.box || 1);
    }

    if (gotRight) {
      setSessionsStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      await awardXp(userUid, 5); // +5 XP for correct answer!
    } else {
      setSessionsStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // finished session!
        alert(`🎓 Session Complete! Correct: ${sessionsStats.correct + (gotRight ? 1 : 0)} | Incorrect: ${sessionsStats.wrong + (!gotRight ? 1 : 0)}`);
        setStudying(false);
        setCurrentCardIndex(0);
        setSessionsStats({ correct: 0, wrong: 0 });
        loadCards();
      }
    }, 200);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="text-[var(--primary)]" />
            Flash-Forge Vault
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Spaced Repetition Flashcards powered by VAYU. Master concepts with Leitner System.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-ghost text-xs flex items-center gap-1.5 py-2"
          >
            <Plus size={14} /> Add Card
          </button>
          
          <button
            onClick={handleForgeWithVayu}
            disabled={forging}
            className="btn-primary text-xs flex items-center gap-1.5 py-2"
            style={{
              background: 'linear-gradient(135deg, #6c63ff, #00f0ff)'
            }}
          >
            {forging ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Forging...
              </>
            ) : (
              <>
                <Sparkles size={14} className="animate-pulse" />
                Forge with VAYU
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin mb-2" />
          <p className="text-xs text-[var(--muted)]">Retrieving flashcards...</p>
        </div>
      ) : studying ? (
        /* STUDY INTERFACE */
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
          <div className="w-full mb-4 flex justify-between items-center text-xs text-[var(--muted)] font-semibold">
            <span>Card {currentCardIndex + 1} of {cards.length}</span>
            <span className="px-2.5 py-0.5 bg-[var(--surface)] border border-[var(--border-color)] rounded-full text-[var(--primary)] font-bold">
              Box {cards[currentCardIndex].box || 1}
            </span>
          </div>

          {/* Flashcard Component */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full aspect-[1.6] rounded-3xl cursor-pointer perspective-1000 relative select-none"
          >
            <motion.div
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full preserve-3d relative rounded-3xl"
              style={{
                boxShadow: '0 8px 32px rgba(108, 99, 255, 0.08)'
              }}
            >
              {/* Front side */}
              <div 
                className="absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col justify-between border border-[var(--border-color)]"
                style={{ background: 'rgba(255, 255, 255, 0.02)' }}
              >
                <div className="text-[var(--primary)] font-bold text-xs uppercase tracking-wider">Question</div>
                <div className="text-lg md:text-xl font-bold text-center text-[var(--foreground)] my-auto max-h-[80%] overflow-y-auto custom-scrollbar">
                  {cards[currentCardIndex].question}
                </div>
                <div className="text-center text-[10px] text-[var(--muted)] uppercase tracking-widest font-semibold animate-pulse">
                  Click to reveal answer
                </div>
              </div>

              {/* Back side */}
              <div 
                className="absolute inset-0 backface-hidden rounded-3xl p-8 flex flex-col justify-between border border-[var(--primary)] rotate-y-180"
                style={{ background: 'rgba(108, 99, 255, 0.03)' }}
              >
                <div className="text-[#34d399] font-bold text-xs uppercase tracking-wider">VAYU&apos;s Answer Key</div>
                <div className="text-sm md:text-base leading-relaxed text-center text-[var(--foreground)] my-auto max-h-[85%] overflow-y-auto custom-scrollbar">
                  {cards[currentCardIndex].answer}
                </div>
                <div className="text-center text-[10px] text-[var(--muted)] uppercase tracking-widest font-semibold">
                  Click to see question
                </div>
              </div>
            </motion.div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex gap-4 w-full">
            <button
              onClick={() => handleStudyAnswer(false)}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-sm hover:bg-red-500/20 transition-all"
            >
              <XCircle size={16} /> Got it Wrong
            </button>
            <button
              onClick={() => handleStudyAnswer(true)}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-green-500/10 text-green-500 border border-green-500/20 font-bold text-sm hover:bg-green-500/20 transition-all"
            >
              <CheckCircle2 size={16} /> Got it Right (+5 XP)
            </button>
          </div>

          <button
            onClick={() => setStudying(false)}
            className="mt-6 text-xs text-[var(--muted)] hover:text-[var(--foreground)] font-bold uppercase tracking-wider"
          >
            Quit Studying
          </button>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
          <Layers size={48} className="text-[var(--muted)] mb-3 opacity-30 animate-pulse" />
          <h3 className="font-bold text-[var(--foreground)]">Your vault is empty</h3>
          <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
            Upload document snapshots in Flash-Forge or chat with VAYU, then click <strong>Forge with VAYU</strong> to construct custom spaced repetition cards automatically!
          </p>
        </div>
      ) : (
        /* CARD MANAGEMENT / START DECK OVERVIEW */
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Deck Summary Widget */}
          <div 
            className="p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-[var(--border-color)]"
            style={{ background: 'rgba(255, 255, 255, 0.01)' }}
          >
            <div>
              <h3 className="font-bold text-base text-[var(--foreground)] flex items-center gap-1.5">
                📦 Study Deck
              </h3>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                You have {cards.length} cards in active rotation.
              </p>
            </div>

            <button
              onClick={() => setStudying(true)}
              className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2"
            >
              🚀 Start Study Session
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Grid Layout of Cards */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="p-5 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between relative group hover:border-[var(--primary)]/40 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.01)' }}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded-full font-bold uppercase">
                        Box {card.box || 1}
                      </span>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="text-[var(--muted)] hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-[var(--foreground)] line-clamp-2">{card.question}</h4>
                    <p className="text-xs text-[var(--muted)] mt-2 line-clamp-3 leading-relaxed">{card.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD CARD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.form
            onSubmit={handleManualAdd}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full p-6 rounded-2xl glass-card border border-[var(--border-color)]"
            style={{ background: 'var(--background)' }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="text-[var(--primary)]" />
              Add Manual Flashcard
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. What is the capital of France?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="input-glass w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--muted)] block mb-1">Answer</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Paris"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="input-glass w-full text-sm resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs px-4 py-2"
              >
                Create Card
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
