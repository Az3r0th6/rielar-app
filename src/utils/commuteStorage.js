import { safeLocalStorage, idbGet, idbSet } from './safeStorage';
import { sendAppNotification, playChimeSound, triggerHaptic } from './notifications';

export const COMMUTE_STORAGE_KEY = 'rielar_favorite_commutes';
export const COMMUTES_CHANGED_EVENT = 'rielar:favorite-commutes-changed';

/**
 * Validate and clean a commute object
 */
export function sanitizeCommute(raw) {
  if (!raw) return null;
  const time = String(raw.scheduledTime || raw.time || '').trim();
  if (!time || !time.includes(':')) return null;

  return {
    id: String(raw.id || `commute_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    stationId: Number(raw.stationId) || 0,
    stationName: String(raw.stationName || raw.nombre || 'Estación').trim(),
    lineId: Number(raw.lineId) || 5,
    lineName: String(raw.lineName || 'Mitre').trim(),
    ramal: String(raw.ramal || '').trim(),
    destination: String(raw.destination || raw.destName || 'Destino').trim(),
    scheduledTime: time,
    days: raw.days || 'weekdays', // 'weekdays' | 'saturdays' | 'sundays_holidays' | 'all'
    label: String(raw.label || 'Viaje habitual').trim(),
    reminderMinutes: Number(raw.reminderMinutes !== undefined ? raw.reminderMinutes : 10),
    reminderEnabled: raw.reminderEnabled !== undefined ? Boolean(raw.reminderEnabled) : true,
    serviceNumber: raw.serviceNumber ? String(raw.serviceNumber) : null,
    createdAt: Number(raw.createdAt) || Date.now(),
  };
}

/**
 * Synchronously retrieves stored favorite commutes
 */
export function getFavoriteCommutes() {
  try {
    let raw = safeLocalStorage.getItem(COMMUTE_STORAGE_KEY);
    if (!raw && typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(COMMUTE_STORAGE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(sanitizeCommute).filter(Boolean);
      }
    }
  } catch (err) {
    console.debug('Error reading favorite commutes:', err);
  }
  return [];
}

/**
 * Synchronously and asynchronously persists favorite commutes
 */
export function saveFavoriteCommutes(commutesList) {
  try {
    const cleanList = (commutesList || []).map(sanitizeCommute).filter(Boolean);
    const serialized = JSON.stringify(cleanList);

    // Synchronous memory + local storage
    safeLocalStorage.setItem(COMMUTE_STORAGE_KEY, serialized);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(COMMUTE_STORAGE_KEY, serialized);
      } catch {}
    }

    // Durable IndexedDB backup
    idbSet(COMMUTE_STORAGE_KEY, serialized).catch(() => {});

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(COMMUTES_CHANGED_EVENT, { detail: cleanList })
      );
    }
    return cleanList;
  } catch (err) {
    console.warn('Error saving favorite commutes:', err);
    return [];
  }
}

/**
 * Hydrates favorite commutes from IndexedDB if local storage was cleared
 */
export async function hydrateCommutesFromIDB() {
  try {
    const existing = getFavoriteCommutes();
    if (existing && existing.length > 0) return existing;

    const fromIdb = await idbGet(COMMUTE_STORAGE_KEY);
    if (fromIdb) {
      const parsed = JSON.parse(fromIdb);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return saveFavoriteCommutes(parsed);
      }
    }
  } catch {}
  return [];
}

/**
 * Adds or updates a favorite commute
 */
export function addFavoriteCommute(commute) {
  const clean = sanitizeCommute(commute);
  if (!clean) return null;

  const current = getFavoriteCommutes();
  // Check if already exists (same station, line, destination and time)
  const existingIdx = current.findIndex(
    (c) =>
      Number(c.stationId) === Number(clean.stationId) &&
      c.destination.toLowerCase() === clean.destination.toLowerCase() &&
      c.scheduledTime === clean.scheduledTime
  );

  let nextList;
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = { ...nextList[existingIdx], ...clean };
  } else {
    nextList = [clean, ...current];
  }

  saveFavoriteCommutes(nextList);
  playChimeSound('success');
  triggerHaptic('success');
  return clean;
}

/**
 * Removes a favorite commute by ID
 */
export function removeFavoriteCommute(id) {
  const current = getFavoriteCommutes();
  const nextList = current.filter((c) => String(c.id) !== String(id));
  saveFavoriteCommutes(nextList);
  triggerHaptic('medium');
  return nextList;
}

/**
 * Toggles or updates reminder for a commute
 */
export function toggleCommuteReminder(id, enabled, minutes = 10) {
  const current = getFavoriteCommutes();
  const nextList = current.map((c) => {
    if (String(c.id) === String(id)) {
      const isEnabled = enabled !== undefined ? enabled : !c.reminderEnabled;
      return {
        ...c,
        reminderEnabled: isEnabled,
        reminderMinutes: minutes || c.reminderMinutes || 10,
      };
    }
    return c;
  });
  saveFavoriteCommutes(nextList);
  triggerHaptic('light');
  return nextList;
}

/**
 * Checks if a specific train/schedule is already saved
 */
export function isCommuteSaved({ stationId, destination, scheduledTime }) {
  if (!scheduledTime) return false;
  const current = getFavoriteCommutes();
  return current.some((c) => {
    const sameStation = !stationId || Number(c.stationId) === Number(stationId);
    const sameDest = !destination || c.destination.toLowerCase() === destination.toLowerCase();
    const sameTime = c.scheduledTime === scheduledTime;
    return sameStation && sameDest && sameTime;
  });
}

/**
 * Calculates current status and countdown for a favorite commute
 */
export function getCommuteTimeStatus(commute, now = new Date()) {
  if (!commute || !commute.scheduledTime) {
    return {
      isActiveToday: false,
      diffMinutes: null,
      statusType: 'unknown',
      statusLabel: 'Horario no configurado',
      badgeColor: 'var(--ios-text-tertiary)',
    };
  }

  const day = now.getDay(); // 0 is Sunday, 6 is Saturday, 1-5 Weekdays
  const isWeekday = day >= 1 && day <= 5;
  const isSaturday = day === 6;
  const isSundayOrHoliday = day === 0;

  let isActiveToday = false;
  let dayDescription = 'Lunes a Viernes';

  if (commute.days === 'all' || commute.days === 'daily') {
    isActiveToday = true;
    dayDescription = 'Todos los días';
  } else if (commute.days === 'weekdays') {
    isActiveToday = isWeekday;
    dayDescription = 'Lunes a Viernes';
  } else if (commute.days === 'saturdays') {
    isActiveToday = isSaturday;
    dayDescription = 'Sábados';
  } else if (commute.days === 'sundays_holidays') {
    isActiveToday = isSundayOrHoliday;
    dayDescription = 'Dom y Feriados';
  } else {
    isActiveToday = isWeekday;
  }

  const [targetH, targetM] = commute.scheduledTime.split(':').map(Number);
  const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const targetTotalMinutes = targetH * 60 + targetM;
  const diffMinutes = targetTotalMinutes - nowTotalMinutes;

  if (!isActiveToday) {
    return {
      isActiveToday: false,
      diffMinutes: null,
      dayDescription,
      statusType: 'inactive_today',
      statusLabel: `No circula hoy • Programado para ${dayDescription}`,
      badgeColor: 'var(--ios-text-tertiary)',
    };
  }

  if (diffMinutes > 60) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const timeText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return {
      isActiveToday: true,
      diffMinutes,
      dayDescription,
      statusType: 'upcoming',
      statusLabel: `Sale en ${timeText}`,
      badgeColor: 'var(--ios-blue)',
      isSoon: false,
    };
  }

  if (diffMinutes > 0 && diffMinutes <= 60) {
    return {
      isActiveToday: true,
      diffMinutes,
      dayDescription,
      statusType: 'soon',
      statusLabel: diffMinutes === 1 ? 'Sale en 1 minuto' : `Sale en ${diffMinutes} min`,
      badgeColor: 'var(--ios-green)',
      isSoon: true,
    };
  }

  if (diffMinutes <= 0 && diffMinutes >= -6) {
    return {
      isActiveToday: true,
      diffMinutes,
      dayDescription,
      statusType: 'departing',
      statusLabel: 'En andén / Saliendo ahora',
      badgeColor: '#ff9500',
      isSoon: true,
    };
  }

  // Train has already departed today
  return {
    isActiveToday: true,
    diffMinutes,
    dayDescription,
    statusType: 'departed_today',
    statusLabel: `Partió hoy a las ${commute.scheduledTime} hs • Próxima salida mañana`,
    badgeColor: 'var(--ios-text-tertiary)',
    isSoon: false,
  };
}

/**
 * Checks for upcoming commute reminders and triggers notifications if due
 */
export async function checkCommuteReminders(now = new Date()) {
  const commutes = getFavoriteCommutes();
  if (!commutes.length) return;

  const todayDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  for (const commute of commutes) {
    if (!commute.reminderEnabled || !commute.reminderMinutes) continue;

    const status = getCommuteTimeStatus(commute, now);
    if (!status.isActiveToday) continue;

    // Check if the difference matches the reminder window (e.g., within 0 to reminderMinutes)
    if (status.diffMinutes !== null && status.diffMinutes === commute.reminderMinutes) {
      const alarmKey = `rielar_alarm_fired_${commute.id}_${todayDateStr}_${commute.scheduledTime}`;
      if (!safeLocalStorage.getItem(alarmKey)) {
        safeLocalStorage.setItem(alarmKey, 'true');

        await sendAppNotification(
          `⏰ Recordatorio: Tren ${commute.scheduledTime} hs`,
          `Tu tren habitual desde ${commute.stationName} hacia ${commute.destination} sale en ${commute.reminderMinutes} minutos.`,
          {
            type: 'arrival',
            tag: `commute-reminder-${commute.id}`,
            data: { url: '/?tab=favorites' },
          }
        );
      }
    }
  }
}
