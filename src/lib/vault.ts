import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface VaultItem {
  id?: string;
  content: string;
  timestamp?: unknown;
}

/**
 * Save an analyzed document or image text to the user's Memory Vault
 */
export async function saveToVault(uid: string, content: string): Promise<void> {
  const vaultRef = collection(db, 'users', uid, 'vault');
  await addDoc(vaultRef, {
    content,
    timestamp: serverTimestamp(),
  });
}

/**
 * Retrieve the most recent items from the Vault to inject into VAYU's context
 */
export async function getVaultContext(uid: string): Promise<string> {
  try {
    const vaultRef = collection(db, 'users', uid, 'vault');
    const q = query(vaultRef, orderBy('timestamp', 'desc'), limit(5));
    const snap = await getDocs(q);
    
    if (snap.empty) return '';

    let contextString = 'PREVIOUSLY SAVED NOTES IN THE FLASH-FORGE VAULT:\n';
    snap.forEach(doc => {
      contextString += `--- SAVED MATERIAL ---\n${doc.data().content}\n\n`;
    });

    return contextString;
  } catch (error) {
    console.warn('Failed to load Vault Context:', error);
    return '';
  }
}
