// Browser Notifications & PWA Web Push utility for VidyaVerse
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

const REMINDER_KEY = 'vidyaverse-reminder-enabled';
const LAST_VISIT_KEY = 'vidyaverse-last-visit';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BInSifW54p8hA_tY3zQ378d3s04849n2h8g116_626_2893816n';

/** Update the last-visit timestamp. Call on every dashboard mount. */
export function updateLastVisit() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
  }
}

/** Request permission and store preference. Returns granted/denied. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    localStorage.setItem(REMINDER_KEY, 'true');
    return true;
  }
  const result = await Notification.requestPermission();
  const granted = result === 'granted';
  localStorage.setItem(REMINDER_KEY, granted ? 'true' : 'false');
  return granted;
}

/** Returns whether the user has enabled reminders */
export function isReminderEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMINDER_KEY) === 'true' &&
    Notification.permission === 'granted';
}

/** Disable reminders */
export function disableReminder() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REMINDER_KEY, 'false');
  }
}

/** Registers the background service worker on client startup */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[PWA] Service Worker registered scope:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[PWA] Service Worker registration failed:', err);
    return null;
  }
}

/** Converts base64 VAPID public key string to Uint8Array required by subscribe API */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Generates standard push subscription and saves it to Firestore users doc */
export async function subscribeToPushNotifications(uid: string) {
  if (
    typeof window === 'undefined' || 
    !('serviceWorker' in navigator) || 
    !('PushManager' in window) || 
    !uid
  ) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if permission is already granted, if not request it
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    
    if (permission !== 'granted') {
      console.warn('[PWA] Notification permissions were denied.');
      return null;
    }

    // Subscribe to browser push server
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('[PWA] Push Subscription generated successfully:', subscription);

    // Save/Sync subscription to user's Firestore document
    const userRef = doc(db, 'users', uid);
    const subJson = JSON.parse(JSON.stringify(subscription));
    
    await updateDoc(userRef, {
      pushSubscriptions: arrayUnion(subJson)
    });

    console.log('[PWA] Push Subscription saved to user Firestore profile.');
    return subscription;
  } catch (error) {
    console.warn('[PWA] Web Push manager setup skipped (this is normal in developmental setups without configured keys):', error);
    return null;
  }
}

/** Send active-session instant WhatsApp-style browser notification if permission is allowed */
export function sendBrowserNotification(title: string, body: string, tag: string, clickUrl: string = '/') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const n = new Notification(title, {
    body,
    icon: '/logo.webp',
    badge: '/icon.webp',
    tag, // prevents duplicate notifications for the same room/thread
  });

  n.onclick = () => {
    window.focus();
    n.close();
    // Dispatch navigate message in the browser window
    window.dispatchEvent(new CustomEvent('vidyaverse-navigate', { detail: clickUrl }));
  };
}

/** Schedule a 8pm local-time nudge if the user hasn't visited today. */
let _scheduled = false;

export function scheduleStreakReminder(userName: string) {
  if (_scheduled) return;
  if (typeof window === 'undefined') return;
  if (!isReminderEnabled()) return;

  _scheduled = true;
  updateLastVisit();

  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0); // 8pm local

  // If 8pm already passed, don't reschedule until tomorrow
  if (now >= target) return;

  const delay = target.getTime() - now.getTime();

  setTimeout(() => {
    // Check if user visited recently (within last 15 minutes)
    const lastVisit = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0', 10);
    const sinceVisit = Date.now() - lastVisit;
    if (sinceVisit < 15 * 60 * 1000) return; // they're still here, skip

    if (Notification.permission === 'granted') {
      const n = new Notification('VidyaVerse 🔥', {
        body: `Hey ${userName}! Don't break your streak today. VAYU is waiting.`,
        icon: '/logo.webp',
        badge: '/icon.webp',
        tag: 'streak-reminder',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, delay);
}

