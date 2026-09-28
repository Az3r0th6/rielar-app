// Alert and Incident State Manager: Dismissal, Read Tracking & Unread Counter
// Persists read & dismissed state in localStorage so the user is never repeatedly nagged.

const DISMISSED_STORAGE_KEY = 'rielar_dismissed_alerts';
const READ_STORAGE_KEY = 'rielar_read_alerts';
const ALERTS_CHANGED_EVENT = 'rielar:alerts-changed';

/**
 * Generates a stable unique hash/key for any SOFSE alert or incident
 */
export function getAlertKey(alert) {
  if (!alert) return '';
  const line = alert.lineId || alert.lineName || '';
  const ramal = alert.ramalName || alert.nombre || '';
  const content = (alert.content || alert.contenido || '').trim().toLowerCase();
  return `${line}_${ramal}_${content}`.replace(/\s+/g, '_');
}

/**
 * Returns the set of dismissed alert keys
 */
export function getDismissedAlertKeys() {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Returns the set of read alert keys
 */
export function getReadAlertKeys() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Dismisses a single alert permanently (or until restored)
 */
export function dismissAlert(alert) {
  const key = typeof alert === 'string' ? alert : getAlertKey(alert);
  if (!key) return;

  const dismissed = getDismissedAlertKeys();
  dismissed.add(key);

  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
  } catch (e) {
    console.warn('Error saving dismissed alerts:', e);
  }

  notifyAlertsChanged();
}

/**
 * Dismisses multiple alerts at once
 */
export function dismissAllAlerts(alertsList = []) {
  const dismissed = getDismissedAlertKeys();
  alertsList.forEach((a) => {
    const key = typeof a === 'string' ? a : getAlertKey(a);
    if (key) dismissed.add(key);
  });

  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
  } catch (e) {
    console.warn('Error saving dismissed alerts:', e);
  }

  notifyAlertsChanged();
}

/**
 * Marks all given alerts as read (clears badge counter without hiding them)
 */
export function markAlertsAsRead(alertsList = []) {
  const read = getReadAlertKeys();
  let changed = false;

  alertsList.forEach((a) => {
    const key = typeof a === 'string' ? a : getAlertKey(a);
    if (key && !read.has(key)) {
      read.add(key);
      changed = true;
    }
  });

  if (changed) {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(read)));
    } catch (e) {
      console.warn('Error saving read alerts:', e);
    }
    notifyAlertsChanged();
  }
}

/**
 * Restores all dismissed alerts so the user can review them again
 */
export function restoreDismissedAlerts() {
  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY);
  } catch {}
  notifyAlertsChanged();
}

/**
 * Calculates unread alerts count (alerts that have NOT been read and NOT been dismissed)
 */
export function getUnreadAlertsCount(alertsList = []) {
  const dismissed = getDismissedAlertKeys();
  const read = getReadAlertKeys();

  let unreadCount = 0;
  alertsList.forEach((a) => {
    const key = typeof a === 'string' ? a : getAlertKey(a);
    if (key && !dismissed.has(key) && !read.has(key)) {
      unreadCount++;
    }
  });

  return unreadCount;
}

/**
 * Filters out dismissed alerts from a list of incidents/alerts
 */
export function filterNonDismissedAlerts(alertsList = []) {
  const dismissed = getDismissedAlertKeys();
  return alertsList.filter((a) => {
    const key = typeof a === 'string' ? a : getAlertKey(a);
    return !dismissed.has(key);
  });
}

/**
 * Broadcasts an event when alerts state changes
 */
export function notifyAlertsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTS_CHANGED_EVENT));
  }
}

export { ALERTS_CHANGED_EVENT };
