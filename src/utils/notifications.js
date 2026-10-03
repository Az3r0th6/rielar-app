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

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribes the current mobile/desktop device to WebPush notifications on Render.
 */
export async function subscribeToPushNotifications() {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg) return null;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch('/api/push-public-key');
      if (!res.ok) return null;
      const { publicKey } = await res.json();
      if (!publicKey) return null;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }

    if (sub) {
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
      console.log('[WebPush] Dispositivo suscrito con éxito a notificaciones push.');
      return sub;
    }
  } catch (err) {
    console.debug('[WebPush] Nota de suscripción:', err.message);
  }
  return null;
}

/**
 * Requests Notification permission safely across mobile browsers & PWAs
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    subscribeToPushNotifications().catch(() => {});
    return 'granted';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeToPushNotifications().catch(() => {});
    }
    return permission;
  } catch (err) {
    console.debug('Notification permission request error:', err);
    return 'denied';
  }
}

/**
 * Dispatches a native push notification (using Android-compatible PNG icons)
 * and dispatches an in-app toast event for instant visual feedback on mobile/tablet.
 */
export async function sendAppNotification(title, body, options = {}) {
  // Sound & Haptics
  playChimeSound(options.type || 'arrival');
  triggerHaptic(options.type === 'alert' ? 'warning' : 'medium');

  // 1. Dispatch in-app visual notification event (works 100% on iOS, Android & tablets)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('rielar:in-app-notification', {
          detail: {
            title,
            body,
            type: options.type || 'arrival',
            tag: options.tag || `toast-${Date.now()}`,
          },
        })
      );
    } catch {}
  }

  // 2. Mobile OS & Desktop System Notification
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      // NOTE: Android OS / Chrome requires raster PNG icons (SVG is unsupported by Android NotificationManager)
      const iconUrl = '/icon-192.png';
      const badgeUrl = '/icon-192.png';

      // Use Service Worker registration (essential for Android Chrome, Android TWA and installed PWA)
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: iconUrl,
              badge: badgeUrl,
              vibrate: [100, 50, 100, 50, 100],
              tag: options.tag || `rielar-alert-${Date.now()}`,
              renotify: true,
              data: options.data || { url: '/' },
              ...options,
            });
            return true;
          }
        } catch (e) {
          console.debug('ServiceWorker showNotification note:', e);
        }
      }

      // Fallback for desktop window notifications
      try {
        new Notification(title, {
          body,
          icon: iconUrl,
          badge: badgeUrl,
          ...options,
        });
        return true;
      } catch (e) {
        console.debug('Window Notification fallback note:', e);
      }
    }
  }
  return false;
}
