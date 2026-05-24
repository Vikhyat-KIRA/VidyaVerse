import { 
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion,
  addDoc
} from 'firebase/firestore';
import { db, UserProfile } from './firebase';

export interface Room {
  id: string;
  name: string;
  type: 'auto' | 'custom' | 'dm';
  inviteCode: string | null;
  members: string[]; // for custom rooms and DMs
  createdAt?: unknown;
  dmUserNames?: { [uid: string]: string };
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: unknown;
  // Thread reply fields (optional)
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Generate a random 6-character alphanumeric code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ensure auto rooms exist for a user
export async function ensureAutoRooms(profile: UserProfile): Promise<Room[]> {
  const roomsToReturn: Room[] = [];

  const autoRoomDefs = [
    { id: `board_${profile.board.replace(/\s+/g, '').toLowerCase()}`, name: `#${profile.board} Warriors` },
    { id: `class_${profile.class.replace(/\s+/g, '').toLowerCase()}`, name: `#Class ${profile.class} Squad` },
  ];

  for (const def of autoRoomDefs) {
    if (!profile.board && def.id.startsWith('board_')) continue;
    if (!profile.class && def.id.startsWith('class_')) continue;

    const roomRef = doc(db, 'rooms', def.id);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      const roomData: Room = {
        id: def.id,
        name: def.name,
        type: 'auto',
        inviteCode: null,
        members: [], // Auto rooms don't need explicit members, access is based on profile
        createdAt: serverTimestamp(),
      };
      await setDoc(roomRef, roomData);
      roomsToReturn.push(roomData);
    } else {
      roomsToReturn.push(roomSnap.data() as Room);
    }
  }

  return roomsToReturn;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Fetch all rooms a user has access to (Auto + Custom)
 */
export async function getUserRooms(uid: string, profile: UserProfile | null): Promise<Room[]> {
  let allRooms: Room[] = [];

  // 1. Get Auto Rooms (Implicit access based on profile)
  if (profile) {
    const autoRooms = await ensureAutoRooms(profile);
    allRooms = [...allRooms, ...autoRooms];
  }

  // 2. Get Custom Rooms (Explicit access via members array)
  const q = query(collection(db, 'rooms'), where('members', 'array-contains', uid));
  const customRoomsSnap = await getDocs(q);
  customRoomsSnap.forEach((doc) => {
    allRooms.push(doc.data() as Room);
  });

  return allRooms;
}

/**
 * Create a new custom room and generate an invite code
 */
export async function createCustomRoom(name: string, creatorUid: string): Promise<Room> {
  const inviteCode = generateInviteCode();
  
  // 1. Create the room
  const roomRef = doc(collection(db, 'rooms')); // Auto-ID
  const roomData: Room = {
    id: roomRef.id,
    name,
    type: 'custom',
    inviteCode,
    members: [creatorUid],
    createdAt: serverTimestamp(),
  };
  await setDoc(roomRef, roomData);

  // 2. Create the mapping document for fast code lookup
  await setDoc(doc(db, 'room_codes', inviteCode), {
    roomId: roomRef.id,
  });

  return roomData;
}

/**
 * Join a custom room using a 6-character code
 */
export async function joinRoomByCode(code: string, uid: string): Promise<Room> {
  const normalizedCode = code.trim().toUpperCase();
  
  // 1. Look up the room ID by code
  const codeDoc = await getDoc(doc(db, 'room_codes', normalizedCode));
  if (!codeDoc.exists()) {
    throw new Error('Invalid invite code');
  }

  const roomId = codeDoc.data().roomId;

  // 2. Add the user to the room's members array
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }

  await updateDoc(roomRef, {
    members: arrayUnion(uid)
  });

  return roomSnap.data() as Room;
}

/**
 * Send a message to a room
 */
export async function sendMessage(
  roomId: string,
  text: string,
  senderId: string,
  senderName: string,
  reply?: { replyToId: string; replyToText: string; replyToSenderName: string }
): Promise<void> {
  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const payload: Record<string, unknown> = {
    text,
    senderId,
    senderName,
    timestamp: serverTimestamp(),
  };
  if (reply) {
    payload.replyToId = reply.replyToId;
    payload.replyToText = reply.replyToText;
    payload.replyToSenderName = reply.replyToSenderName;
  }
  await addDoc(messagesRef, payload);
}

/**
 * Subscribe to messages in a room
 */
export function subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        senderId: data.senderId,
        senderName: data.senderName,
        timestamp: data.timestamp,
        replyToId: data.replyToId,
        replyToText: data.replyToText,
        replyToSenderName: data.replyToSenderName,
      });
    });
    callback(messages);
  });
}

/**
 * Start or retrieve a Direct Message room between two users by friend email lookup
 */
export async function startDirectMessage(
  myUid: string,
  myName: string,
  friendEmail: string
): Promise<Room> {
  const emailLower = friendEmail.toLowerCase().trim();
  
  // 1. Find the friend by email in Firestore 'users' collection
  const usersRef = collection(db, 'users');
  const userQuery = query(usersRef, where('email', '==', emailLower));
  const querySnap = await getDocs(userQuery);
  
  if (querySnap.empty) {
    throw new Error('No student found with that email address');
  }
  
  let friendUid = '';
  let friendName = '';
  querySnap.forEach((doc) => {
    const data = doc.data();
    friendUid = data.uid;
    friendName = data.name || 'Student';
  });
  
  if (friendUid === myUid) {
    throw new Error('You cannot start a DM with yourself!');
  }
  
  // 2. Check if a DM room already exists between these two users
  const roomsRef = collection(db, 'rooms');
  const dmQuery = query(
    roomsRef,
    where('type', '==', 'dm'),
    where('members', 'array-contains', myUid)
  );
  
  const dmSnap = await getDocs(dmQuery);
  let existingRoom: Room | null = null;
  
  dmSnap.forEach((doc) => {
    const room = doc.data() as Room;
    if (room.members.includes(friendUid)) {
      existingRoom = room;
    }
  });
  
  if (existingRoom) {
    return existingRoom;
  }
  
  // 3. Create a brand new DM room
  const newRoomRef = doc(collection(db, 'rooms'));
  const newRoomData: Room = {
    id: newRoomRef.id,
    name: 'Direct Message', // Fallback, resolved dynamically in UI
    type: 'dm',
    inviteCode: null,
    members: [myUid, friendUid],
    createdAt: serverTimestamp(),
    dmUserNames: {
      [myUid]: myName,
      [friendUid]: friendName
    }
  };
  
  await setDoc(newRoomRef, newRoomData);
  return newRoomData;
}

/**
 * Create a new pending private DM room and generate a code
 */
export async function createPrivateDmRoom(creatorUid: string, creatorName: string): Promise<Room> {
  const inviteCode = generateInviteCode();
  const roomRef = doc(collection(db, 'rooms'));
  
  const roomData: Room = {
    id: roomRef.id,
    name: 'Private Chat',
    type: 'dm',
    inviteCode,
    members: [creatorUid],
    createdAt: serverTimestamp(),
    dmUserNames: {
      [creatorUid]: creatorName
    }
  };
  
  await setDoc(roomRef, roomData);
  
  // Create mapping for lookup
  await setDoc(doc(db, 'room_codes', inviteCode), {
    roomId: roomRef.id
  });
  
  return roomData;
}

/**
 * Join a pending private DM room using the code, lock it, and close the invite code
 */
export async function joinPrivateDmRoom(code: string, joinerUid: string, joinerName: string): Promise<Room> {
  const normalizedCode = code.trim().toUpperCase();
  
  // 1. Find room ID by code
  const codeDocRef = doc(db, 'room_codes', normalizedCode);
  const codeDoc = await getDoc(codeDocRef);
  if (!codeDoc.exists()) {
    throw new Error('Invalid invite code');
  }
  
  const roomId = codeDoc.data().roomId;
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  
  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }
  
  const roomData = roomSnap.data() as Room;
  
  if (roomData.type !== 'dm') {
    throw new Error('This code is not for a private 1-on-1 chat');
  }
  
  if (roomData.members.includes(joinerUid)) {
    return roomData; // Already a member
  }
  
  if (roomData.members.length >= 2) {
    throw new Error('This private chat is already full with two participants!');
  }
  
  // 2. Add joiner, update usernames map
  const updatedNames = {
    ...(roomData.dmUserNames || {}),
    [joinerUid]: joinerName
  };
  
  await updateDoc(roomRef, {
    members: arrayUnion(joinerUid),
    inviteCode: null, // Clear inviteCode inside the room doc
    dmUserNames: updatedNames
  });
  
  // 3. Delete the invite code lookup so it can never be used again
  await deleteDoc(codeDocRef);
  
  // Return updated object
  return {
    ...roomData,
    members: [...roomData.members, joinerUid],
    inviteCode: null,
    dmUserNames: updatedNames
  };
}
