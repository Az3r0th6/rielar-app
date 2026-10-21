// Alert and Incident State Manager: Dismissal, Read Tracking & Unread Counter
// Persists read & dismissed state in safeLocalStorage so the user is never repeatedly nagged.
import { safeLocalStorage } from './safeStorage';

const DISMISSED_STORAGE_KEY = 'rielar_dismissed_alerts';
const READ_STORAGE_KEY = 'rielar_read_alerts';
const ALERTS_CHANGED_EVENT = 'rielar:alerts-changed';

/**
 * Generates a stable unique hash/key for any SOFSE alert or incident
 */
export function getAlertKey(alert) {
  if (!alert) return '';
  if (typeof alert === 'string') return alert;
  if (alert.id) return `id_${alert.id}`;
  const line = alert.lineId || alert.linea_id || alert.lineName || '';
  const ramal = alert.ramalId || alert.ramal_id || alert.ramalName || alert.nombre || '';
  const content = (alert.content || alert.contenido || '').trim().toLowerCase();
  return `${line}_${ramal}_${content}`.replace(/\s+/g, '_');
}

/**
 * Checks whether an alert has been dismissed by the user
 */
export function isAlertDismissed(alert, customDismissedSet = null) {
  if (!alert) return false;
  const dismissed = customDismissedSet || getDismissedAlertKeys();
  if (!dismissed || dismissed.size === 0) return false;

  if (typeof alert === 'string') {
    return dismissed.has(alert);
  }

  // 1. Direct ID match (SOFSE official alert ID)
  if (alert.id && (dismissed.has(String(alert.id)) || dismissed.has(`id_${alert.id}`))) {
    return true;
  }

  // 2. Canonical key match
  const key = getAlertKey(alert);
  if (key && dismissed.has(key)) return true;

  // 3. Fallback content match
  const content = (alert.content || alert.contenido || '').trim().toLowerCase();
  if (content) {
    const fallbackKey = `__${content}`.replace(/\s+/g, '_');
    if (dismissed.has(fallbackKey)) return true;
  }

  return false;
}

/**
 * Returns the set of dismissed alert keys
 */
export function getDismissedAlertKeys() {
  try {
    const raw = safeLocalStorage.getItem(DISMISSED_STORAGE_KEY);
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
    const raw = safeLocalStorage.getItem(READ_STORAGE_KEY);
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
  if (!alert) return;
  const key = typeof alert === 'string' ? alert : getAlertKey(alert);

  const dismissed = getDismissedAlertKeys();
  if (key) dismissed.add(key);

  if (typeof alert === 'object') {
    if (alert.id) {
      dismissed.add(String(alert.id));
      dismissed.add(`id_${alert.id}`);
    }
    const line = alert.lineId || alert.linea_id || alert.lineName || '';
    const ramal = alert.ramalId || alert.ramal_id || alert.ramalName || alert.nombre || '';
    const content = (alert.content || alert.contenido || '').trim().toLowerCase();
    if (content) {
      dismissed.add(`__${content}`.replace(/\s+/g, '_'));
      if (line || ramal) {
        dismissed.add(`${line}_${ramal}_${content}`.replace(/\s+/g, '_'));
      }
    }
  }

  try {
    safeLocalStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
  } catch (e) {
    console.warn('Error saving dismissed alerts:', e);
  }

  // Also add to rielar_notified_alerts in safeLocalStorage so notification loops never re-fire
  try {
    const rawNotified = safeLocalStorage.getItem('rielar_notified_alerts') || '[]';
    const notified = new Set(JSON.parse(rawNotified));
    if (key) notified.add(key);
    if (typeof alert === 'object' && alert.id) {
      notified.add(String(alert.id));
      notified.add(`id_${alert.id}`);
    }
    safeLocalStorage.setItem('rielar_notified_alerts', JSON.stringify(Array.from(notified)));
  } catch {}

  notifyAlertsChanged();
}

/**
 * Dismisses multiple alerts at once
 */
export function dismissAllAlerts(alertsList = []) {
  const dismissed = getDismissedAlertKeys();
  let notified = new Set();
  try {
    const rawNotified = safeLocalStorage.getItem('rielar_notified_alerts') || '[]';
    notified = new Set(JSON.parse(rawNotified));
  } catch {}

  alertsList.forEach((a) => {
    if (!a) return;
    const key = typeof a === 'string' ? a : getAlertKey(a);
    if (key) {
      dismissed.add(key);
      notified.add(key);
    }
    if (typeof a === 'object') {
      if (a.id) {
        dismissed.add(String(a.id));
        dismissed.add(`id_${a.id}`);
        notified.add(String(a.id));
        notified.add(`id_${a.id}`);
      }
      const content = (a.content || a.contenido || '').trim().toLowerCase();
      if (content) {
        dismissed.add(`__${content}`.replace(/\s+/g, '_'));
      }
    }
  });

  try {
    safeLocalStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissed)));
    safeLocalStorage.setItem('rielar_notified_alerts', JSON.stringify(Array.from(notified)));
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
      safeLocalStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(read)));
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
    safeLocalStorage.removeItem(DISMISSED_STORAGE_KEY);
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
    const content = (a?.content || a?.contenido || '').trim().toLowerCase();
    const fallbackKey = content ? `__${content}`.replace(/\s+/g, '_') : '';
    const isDismissed = dismissed.has(key) || (fallbackKey && dismissed.has(fallbackKey));

    if (key && !isDismissed && !read.has(key)) {
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
    const content = (a?.content || a?.contenido || '').trim().toLowerCase();
    const fallbackKey = content ? `__${content}`.replace(/\s+/g, '_') : '';
    return !dismissed.has(key) && (!fallbackKey || !dismissed.has(fallbackKey));
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
