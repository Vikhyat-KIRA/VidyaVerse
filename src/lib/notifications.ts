// Browser Notifications API utility for VidyaVerse streak reminders

const REMINDER_KEY = 'vidyaverse-reminder-enabled';
const LAST_VISIT_KEY = 'vidyaverse-last-visit';

/** Update the last-visit timestamp. Call on every dashboard mount. */
export function updateLastVisit() {
  localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
}

/** Request permission and store preference. Returns granted/denied. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
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
  return localStorage.getItem(REMINDER_KEY) === 'true' &&
    Notification.permission === 'granted';
}

/** Disable reminders */
export function disableReminder() {
  localStorage.setItem(REMINDER_KEY, 'false');
}

/**
 * Schedule a 8pm local-time nudge if the user hasn't visited today.
 * Safe to call on every dashboard mount — uses a module-level guard to avoid duplicate timers.
 */
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
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'streak-reminder', // prevents duplicate notifications
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }, delay);
}
