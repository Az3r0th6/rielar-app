// Time and Arrival Countdown Utilities

/**
 * Formats seconds remaining into countdown display
 * e.g. 180s -> "3 min", 45s -> "45 seg", 0s -> "En andén"
 */
export function formatArrivalSeconds(seconds) {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '--';
  }

  if (seconds <= 30) {
    return 'En andén';
  }
  if (seconds <= 60) {
    return `${Math.max(1, Math.round(seconds))} seg`;
  }
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Formats an ISO date string or timestamp to HH:mm in Argentina timezone
 */
export function formatLocalTime(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

/**
 * Returns color category for countdown
 */
export function getCountdownBadgeClass(seconds) {
  if (seconds <= 120) return 'badge-imminent';
  if (seconds <= 360) return 'badge-soon';
  return 'badge-normal';
}
