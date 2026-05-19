import { collection, addDoc, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface Flashcard {
  id?: string;
  question: string;
  answer: string;
  box: number; // For Leitner System Spaced Repetition (1 to 5)
  nextReview: unknown;
}

/**
 * Save a newly generated flashcard to the user's Firestore account
 */
export async function addFlashcard(uid: string, question: string, answer: string): Promise<void> {
  const cardRef = collection(db, 'users', uid, 'flashcards');
  await addDoc(cardRef, {
    question,
    answer,
    box: 1,
    nextReview: new Date() // ready immediately
  });
}

/**
 * Get all user flashcards
 */
export async function getFlashcards(uid: string): Promise<Flashcard[]> {
  const cardRef = collection(db, 'users', uid, 'flashcards');
  const snap = await getDocs(cardRef);
  const cards: Flashcard[] = [];
  snap.forEach(doc => {
    cards.push({ id: doc.id, ...doc.data() } as Flashcard);
  });
  return cards;
}

/**
 * Update Leitner Box status (Spaced Repetition logic)
 * If they got it right, move to next box (box + 1)
 * If they got it wrong, send back to box 1
 */
export async function updateFlashcardBox(uid: string, cardId: string, gotRight: boolean, currentBox: number): Promise<void> {
  const cardRef = doc(db, 'users', uid, 'flashcards', cardId);
  const newBox = gotRight ? Math.min(5, currentBox + 1) : 1;
  
  // Calculate next review date based on Leitner Box
  // Box 1: 1 day, Box 2: 3 days, Box 3: 7 days, Box 4: 14 days, Box 5: 30 days
  const daysToAdd = newBox === 1 ? 1 : newBox === 2 ? 3 : newBox === 3 ? 7 : newBox === 4 ? 14 : 30;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + daysToAdd);

  await setDoc(cardRef, {
    box: newBox,
    nextReview
  }, { merge: true });
}

/**
 * Delete a flashcard
 */
export async function deleteFlashcard(uid: string, cardId: string): Promise<void> {
  const cardRef = doc(db, 'users', uid, 'flashcards', cardId);
  await deleteDoc(cardRef);
}
