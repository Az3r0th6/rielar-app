// Notifications, Haptics, and Audio Feedback System

let audioCtx = null;

export function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  return audioCtx;
}

/**
 * Unlocks the Web Audio context immediately inside a user gesture (tap/click).
 * Essential for mobile Safari (iOS) and Android Chrome so async callbacks can play sounds.
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
}

/**
 * Plays modern iOS-styled UI and arrival chimes using Web Audio API
 */
export function playChimeSound(type = 'arrival') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'refresh') {
      // Crisp rising whoosh/chirp indicating refresh started
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'success' || type === 'updated') {
      // Pleasant dual Apple-style confirmation chime (F5 -> A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(698.46, now); // F5
      osc.frequency.setValueAtTime(880.00, now + 0.11); // A5
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
      gain.gain.setValueAtTime(0.20, now + 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'arrival') {
      // Ascending major chord (Do - Mi - Sol)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'alert') {
      // Subtle two-tone warning
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(370, now + 0.15); // F#4
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'click') {
      // Crisp subtle mechanical tap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    console.debug('Audio error:', e);
  }
}

/**
 * Triggers modern haptic feedback patterns (calibrated for mobile hardware)
 */
export function triggerHaptic(style = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (style === 'light') navigator.vibrate(25);
      else if (style === 'medium') navigator.vibrate(45);
      else if (style === 'refresh') navigator.vibrate([25, 35, 25]);
      else if (style === 'success') navigator.vibrate([35, 50, 40]);
      else if (style === 'warning' || style === 'error') navigator.vibrate([60, 40, 60]);
      else navigator.vibrate(25);
    } catch {
      // Haptics not allowed or unsupported
    }
  }
}

/**
 * Requests Notification permission
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

/**
 * Dispatches a native or simulated push notification
 */
export function sendAppNotification(title, body, options = {}) {
  playChimeSound(options.type || 'arrival');
  triggerHaptic(options.type === 'alert' ? 'warning' : 'medium');

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '🚆',
        badge: '🚆',
        ...options,
      });
      return true;
    } catch {
      // Notification fallback to in-app toast
    }
  }
  return false;
}
