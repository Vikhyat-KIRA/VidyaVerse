import { doc, setDoc, deleteDoc, collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { sendMessage } from './chat';
import { getUserProfile } from './firebase';

export interface FocusSession {
  uid: string;
  name: string;
  aim: string;
  startedAt: unknown;
  status: 'focusing' | 'break';
}

/**
 * Start a focus session in Firestore
 */
export async function startFocusSession(uid: string, name: string, aim: string, status: 'focusing' | 'break' = 'focusing'): Promise<void> {
  const sessionRef = doc(db, 'focus_sessions', uid);
  await setDoc(sessionRef, {
    uid,
    name,
    aim,
    startedAt: serverTimestamp(),
    status
  });
}

/**
 * End/Stop a focus session in Firestore
 */
export async function endFocusSession(uid: string): Promise<void> {
  const sessionRef = doc(db, 'focus_sessions', uid);
  await deleteDoc(sessionRef);
}

/**
 * Subscribe to all active focus sessions
 */
export function subscribeToFocusSessions(callback: (sessions: FocusSession[]) => void) {
  const q = query(collection(db, 'focus_sessions'));
  return onSnapshot(q, (snapshot) => {
    const sessions: FocusSession[] = [];
    snapshot.forEach((doc) => {
      sessions.push(doc.data() as FocusSession);
    });
    callback(sessions);
  });
}

/**
 * Publicly shame a slacker in their auto guilds!
 */
export async function shameSlacker(uid: string, name: string, aim: string): Promise<void> {
  try {
    const profile = await getUserProfile(uid);
    if (!profile) return;

    // Remove focus session
    await endFocusSession(uid);

    const roomIds: string[] = [];
    if (profile.board) {
      roomIds.push(`board_${profile.board.replace(/\s+/g, '').toLowerCase()}`);
    }
    if (profile.class) {
      roomIds.push(`class_${profile.class.replace(/\s+/g, '').toLowerCase()}`);
    }

    const shamingMessages = [
      `🚨 ALERT: ${name} just slacked off from their focus session! Their dream of "${aim}" is crying in the corner right now. 💀 Go shame them!`,
      `⚠️ RED ALERT: ${name} has strayed from the path of the Grind! They quit their Pomodoro early. Let's help them get back to work! 💢`,
      `🔥 VAYU IS ANGRY! ${name} has paused/closed their focus session. Do they really want to become a ${profile.aim || 'successful student'}? Let's check in! ⚡`
    ];

    const randomMessage = shamingMessages[Math.floor(Math.random() * shamingMessages.length)];

    // Send shaming message to all auto guilds
    for (const roomId of roomIds) {
      await sendMessage(roomId, randomMessage, 'vayu_system', '🔥 VAYU SYSTEM');
    }
  } catch (error) {
    console.error('Error shaming slacker:', error);
  }
}
