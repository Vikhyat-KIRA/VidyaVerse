import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, UserProfile } from './firebase';

/**
 * Award XP to a user and handle leveling up
 */
export async function awardXp(uid: string, amount: number): Promise<number> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  
  let currentXp = 0;
  if (snap.exists()) {
    currentXp = snap.data().xp || 0;
  }

  const newXp = currentXp + amount;
  await setDoc(userRef, {
    xp: newXp
  }, { merge: true });

  return newXp;
}

/**
 * Determine a title rank based on cumulative XP
 */
export function getUserTitle(xp: number): string {
  if (xp < 100) return 'Novice Scholar 🎯';
  if (xp < 500) return 'Grindset Master 🔥';
  if (xp < 1000) return 'Academic Weapon ⚔️';
  return 'VidyaVerse Legend 🏆';
}

/**
 * Retrieve the top users globally by XP
 */
export async function getLeaderboard(topN: number = 50): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('xp', 'desc'), limit(topN));
  const snap = await getDocs(q);
  
  const leaderboard: UserProfile[] = [];
  snap.forEach(doc => {
    leaderboard.push({ uid: doc.id, ...doc.data() } as UserProfile);
  });
  
  return leaderboard;
}
