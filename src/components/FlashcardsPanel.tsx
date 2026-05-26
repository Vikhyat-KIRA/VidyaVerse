'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Sparkles, Plus, Trash2, ArrowRight, CheckCircle2, XCircle, BookOpen, Zap, MoveRight, HelpCircle } from 'lucide-react';
import { getFlashcards, addFlashcard, updateFlashcardBox, deleteFlashcard, type Flashcard } from '@/lib/flashcards';
import { generateFlashcardsFromContext } from '@/lib/gemini';
import { awardXp } from '@/lib/exp';
import { useToast } from '@/components/Toast';

interface FlashcardsPanelProps {
  userUid: string;
}

export default function FlashcardsPanel({ userUid }: FlashcardsPanelProps) {
  const toast = useToast();
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
      const generated = await generateFlashcardsFromContext(userUid, "Latest study session analysis request.");
      
      for (const card of generated) {
        await addFlashcard(userUid, card.question, card.answer);
      }

      await awardXp(userUid, 20);
      toast.success(`✨ VAYU forged ${generated.length} new flashcards from your memory vault! +20 XP`);
      await loadCards();
    } catch (e) {
      console.error(e);
      toast.error('Failed to forge cards: ' + (e as Error).message);
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
      toast.success('Flashcard created successfully!');
      await loadCards();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm('Delete this card forever?')) {
      await deleteFlashcard(userUid, id);
      toast.success('Card removed from rotation');
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
      await awardXp(userUid, 5);
    } else {
      setSessionsStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        const correct = sessionsStats.correct + (gotRight ? 1 : 0);
        const wrong = sessionsStats.wrong + (!gotRight ? 1 : 0);
        toast.success(`🎓 Leitner run complete! ✅ ${correct} correct, ❌ ${wrong} wrong`);
        setStudying(false);
        setCurrentCardIndex(0);
        setSessionsStats({ correct: 0, wrong: 0 });
        loadCards();
      }
    }, 200);
  };

  // Drag simulation / button controls to shift boxes
  const handleShiftBox = async (cardId: string, currentBox: number, direction: 'up' | 'down') => {
    let nextBox = currentBox;
    if (direction === 'up' && currentBox < 5) nextBox = currentBox + 1;
    if (direction === 'down' && currentBox > 1) nextBox = currentBox - 1;
    
    if (nextBox === currentBox) return;

    try {
      await updateFlashcardBox(userUid, cardId, direction === 'up', currentBox);
      toast.success(`Card shifted to Box ${nextBox}`);
      await loadCards();
    } catch (e) {
      console.error(e);
    }
  };

  // Group cards by box
  const getCardsInBox = (boxNum: number) => {
    return cards.filter(c => (c.box || 1) === boxNum);
  };

  const boxLabels = [
    { num: 1, title: 'BOX 1', subtitle: 'Everyday' },
    { num: 2, title: 'BOX 2', subtitle: '3 Days' },
    { num: 3, title: 'BOX 3', subtitle: 'Weekly' },
    { num: 4, title: 'BOX 4', subtitle: '2 Weeks' },
    { num: 5, title: 'BOX 5', subtitle: 'Monthly' }
  ];

  return (
    <div className="h-full flex flex-col relative overflow-hidden p-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-sys-groove pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="text-purple-400" />
            Leitner System Spaced Repetition Vault
          </h2>
          <p className="text-xs text-zinc-500">
            Tactical Kanban. Promote cards by answering correctly; mistakes demote them to Box 1.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-zinc-900 border border-sys-groove hover:bg-zinc-800/40 text-xs font-bold text-zinc-300 rounded-[4px] flex items-center gap-1.5 cursor-pointer spring-transition mechanical-press"
          >
            <Plus size={14} /> Add Card
          </button>
          
          <button
            onClick={handleForgeWithVayu}
            disabled={forging}
            className="px-3 py-1.5 bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 text-xs font-bold text-purple-400 rounded-[4px] flex items-center gap-1.5 cursor-pointer spring-transition mechanical-press"
          >
            {forging ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                Forging...
              </>
            ) : (
              <>
                <Sparkles size={14} className="animate-pulse" />
                Forge with VAYU
              </>
            )}
          </button>

          {cards.length > 0 && !studying && (
            <button
              onClick={() => setStudying(true)}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-[4px] flex items-center gap-1.5 cursor-pointer spring-transition mechanical-press"
            >
              🚀 Start Session
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-2" />
          <p className="text-xs text-zinc-500">Securing deck cards...</p>
        </div>
      ) : studying ? (
        /* STUDY INTERFACE */
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
          <div className="w-full mb-4 flex justify-between items-center text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <span>Card {currentCardIndex + 1} of {cards.length}</span>
            <span className="px-2 py-0.5 bg-purple-950/30 border border-purple-500/20 rounded text-purple-400 font-bold">
              Box {cards[currentCardIndex].box || 1}
            </span>
          </div>

          {/* Flashcard Component */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full aspect-[1.7] rounded-[4px] cursor-pointer relative select-none bg-zinc-900 border border-sys-groove p-6 flex flex-col justify-between chamfered-edge"
          >
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-sys-groove/40 pb-2 flex justify-between">
              <span>{isFlipped ? "VAYU's Answer Key" : 'Question'}</span>
              <span>TAP TO FLIP</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center py-4">
              <p className="text-sm md:text-base font-bold text-center text-zinc-100 max-h-36 overflow-y-auto leading-relaxed select-text">
                {isFlipped ? cards[currentCardIndex].answer : cards[currentCardIndex].question}
              </p>
            </div>

            <div className="text-center text-[9px] font-mono text-zinc-600 tracking-wider">
              {isFlipped ? 'COMPARE WITH YOUR MENTAL RECALL' : 'RECALL THE CONCEPT BEFORE FLIPPING'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3 w-full">
            <button
              onClick={() => handleStudyAnswer(false)}
              className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-[4px] bg-rose-950/10 text-rose-400 border border-rose-500/20 font-mono font-bold text-xs uppercase hover:bg-rose-950/20 cursor-pointer spring-transition mechanical-press"
            >
              <XCircle size={14} /> Got it Wrong
            </button>
            <button
              onClick={() => handleStudyAnswer(true)}
              className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-[4px] bg-emerald-950/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold text-xs uppercase hover:bg-emerald-950/20 cursor-pointer spring-transition mechanical-press"
            >
              <CheckCircle2 size={14} /> Got it Right (+5 XP)
            </button>
          </div>

          <button
            onClick={() => setStudying(false)}
            className="mt-6 text-[10px] font-mono font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-widest border-none bg-transparent cursor-pointer"
          >
            Quit Studying
          </button>
        </div>
      ) : cards.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 bg-zinc-900 border border-sys-groove rounded flex items-center justify-center mb-4">
            <Layers size={24} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-zinc-200">Flashcard Vault Empty</h3>
          <p className="text-xs text-zinc-500 max-w-xs mt-1.5 mb-6">
            Forge spaced repetition decks automatically via VAYU Chat, or use textbook uploads in Flash-Forge.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleForgeWithVayu}
              disabled={forging}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-[4px] flex items-center gap-1.5 cursor-pointer spring-transition mechanical-press"
            >
              <Sparkles size={13} /> Forge with VAYU
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-zinc-900 border border-sys-groove hover:bg-zinc-800 text-xs font-bold text-zinc-300 rounded-[4px] flex items-center gap-1.5 cursor-pointer spring-transition mechanical-press"
            >
              <Plus size={13} /> Add Manually
            </button>
          </div>
        </div>
      ) : (
        /* LEITNER KANBAN GRID */
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-3 h-full pb-2 select-none no-scrollbar">
          {boxLabels.map((box) => {
            const boxCards = getCardsInBox(box.num);
            return (
              <div 
                key={box.num} 
                className="w-64 bg-zinc-950/20 border border-sys-groove rounded-[4px] flex flex-col h-full shrink-0 overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3 bg-zinc-950/40 border-b border-sys-groove flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 uppercase">{box.title}</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5">{box.subtitle}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-sys-groove">
                    {boxCards.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2 overflow-y-auto space-y-2 custom-scrollbar bg-black/10">
                  {boxCards.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center opacity-30 p-4 border border-dashed border-sys-groove/40 rounded-[2px]">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">COLUMN EMPTY</span>
                    </div>
                  ) : (
                    boxCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-3 bg-zinc-900 border border-sys-groove rounded-[4px] flex flex-col justify-between hover:border-zinc-700 spring-transition hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] group relative"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="text-xs font-bold text-zinc-200 line-clamp-2 pr-4">{card.question}</p>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5 absolute top-2.5 right-2.5 border-none bg-transparent cursor-pointer spring-transition"
                            title="Delete Card"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2 leading-normal">{card.answer}</p>
                        
                        {/* Shifter utility arrows */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-sys-groove/40">
                          <span className="text-[9px] font-mono text-zinc-600">ID: {card.id?.substring(0, 4)}</span>
                          <div className="flex gap-1">
                            {box.num > 1 && (
                              <button 
                                onClick={() => handleShiftBox(card.id!, box.num, 'down')}
                                className="px-1 py-0.5 rounded bg-zinc-950 border border-sys-groove text-zinc-500 hover:text-zinc-300 text-[8px] font-mono cursor-pointer"
                                title="Demote Box"
                              >
                                ◀
                              </button>
                            )}
                            {box.num < 5 && (
                              <button 
                                onClick={() => handleShiftBox(card.id!, box.num, 'up')}
                                className="px-1 py-0.5 rounded bg-zinc-950 border border-sys-groove text-zinc-500 hover:text-zinc-300 text-[8px] font-mono cursor-pointer"
                                title="Promote Box"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD CARD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.form
            onSubmit={handleManualAdd}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md w-full p-5 rounded-[4px] border border-sys-groove bg-zinc-950/95 shadow-2xl relative"
          >
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white mb-4 pb-2 border-b border-sys-groove flex items-center gap-1.5">
              <Plus className="text-purple-400" size={14} />
              Add Manual Flashcard
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., What is cellular mitochondria?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-sys-groove p-2 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase block mb-1">Answer Key</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Powerhouse of the cell..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-sys-groove p-2 text-xs rounded text-zinc-200 outline-none focus:border-zinc-700 resize-none custom-scrollbar"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 bg-zinc-900 border border-sys-groove text-xs font-bold text-zinc-400 rounded-[4px] hover:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white rounded-[4px] cursor-pointer spring-transition mechanical-press"
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
