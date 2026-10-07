// Bulletproof Multi-Tier Storage Utility with Cookie, IndexedDB & CacheStorage Persistence
// Prevents storage loss in Android WebViews, iOS Safari private browsing, PWAs, TWAs, Brave Shields, and mobile task kills.

const memoryStorage = new Map();
const sessionMemoryStorage = new Map();

// --- Cookie Persistence Helper (Synchronous backup for mobile WebViews) ---
function getCookie(name) {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + encodeURIComponent(name) + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name, value, days = 365) {
  try {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`;
  } catch {}
}

function deleteCookie(name) {
  try {
    if (typeof document === 'undefined') return;
    const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${secureFlag}`;
  } catch {}
}

// --- IndexedDB Durable Storage (Asynchronous permanent backup) ---
const IDB_NAME = 'rielar_storage_v3';
const IDB_STORE = 'app_keyval';

function openIDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB unavailable'));
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function idbDelete(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// --- CacheStorage Durable Storage (Survives Android WebView / Brave task kills) ---
const CACHE_STORE_NAME = 'rielar_durable_cache_v3';
const CACHE_BASE_URL = 'https://rielar-local-cache';

export async function cacheSet(key, value) {
  try {
    if (typeof window === 'undefined' || !window.caches) return false;
    const cache = await window.caches.open(CACHE_STORE_NAME);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const response = new Response(serialized, {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(new Request(`${CACHE_BASE_URL}/${encodeURIComponent(key)}`), response);
    return true;
  } catch {
    return false;
  }
}

export async function cacheGet(key) {
  try {
    if (typeof window === 'undefined' || !window.caches) return null;
    const cache = await window.caches.open(CACHE_STORE_NAME);
    const match = await cache.match(new Request(`${CACHE_BASE_URL}/${encodeURIComponent(key)}`));
    if (match) {
      return await match.text();
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheDelete(key) {
  try {
    if (typeof window === 'undefined' || !window.caches) return false;
    const cache = await window.caches.open(CACHE_STORE_NAME);
    return await cache.delete(new Request(`${CACHE_BASE_URL}/${encodeURIComponent(key)}`));
  } catch {
    return false;
  }
}

// --- Client UID Helper for Server-Assisted Sync ---
export function getClientUid() {
  try {
    let uid = safeLocalStorage.getItem('rielar_device_uid');
    if (!uid) {
      uid = 'c_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      safeLocalStorage.setItem('rielar_device_uid', uid);
      setCookie('rielar_device_uid', uid, 3650);
    }
    return uid;
  } catch {
    return 'default_client';
  }
}

export async function syncFavoritesToServer(favorites) {
  try {
    const uid = getClientUid();
    await fetch('/api/favorites/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, favorites }),
    });
  } catch {}
}

export async function fetchFavoritesFromServer() {
  try {
    const uid = getClientUid();
    const res = await fetch(`/api/favorites/sync?uid=${encodeURIComponent(uid)}&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.favorites)) {
        return data.favorites;
      }
    }
  } catch {}
  return null;
}

// --- Request Persistent Storage (Prevents Android Chrome / Brave background eviction) ---
export async function requestStoragePersistence() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persisted();
      if (!persisted) {
        await navigator.storage.persist();
      }
    }
  } catch {}
}

function createStorageWrapper(storageType) {
  return {
    getItem(key) {
      // 1. Try native Web Storage (localStorage or sessionStorage)
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          const val = window[storageType].getItem(key);
          if (val !== null && val !== undefined) {
            return val;
          }
        }
      } catch {
        // Access restricted by browser
      }

      // 2. Try cookie storage for localStorage keys (durable mobile fallback)
      if (storageType === 'localStorage') {
        const cookieVal = getCookie(key);
        if (cookieVal !== null && cookieVal !== undefined) {
          // Attempt to restore back to localStorage if access recovered
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(key, cookieVal);
            }
          } catch {}
          return cookieVal;
        }
      }

      // 3. Fallback to in-memory storage
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      return map.has(key) ? map.get(key) : null;
    },

    setItem(key, value) {
      const strVal = String(value);

      // Keep in-memory cache up to date
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.set(key, strVal);

      // 1. Save to native Web Storage
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].setItem(key, strVal);
        }
      } catch {
        // Access denied in restricted WebView/iframe
      }

      // 2. Multi-tier persistence for localStorage: mirror to Cookies, IndexedDB and CacheStorage
      if (storageType === 'localStorage') {
        setCookie(key, strVal);
        idbSet(key, strVal).catch(() => {});
        cacheSet(key, strVal).catch(() => {});
        
        // 3. Service Worker durable cache sync (runs out-of-process to survive task kills)
        if (key === 'trenes_favorites' || key === 'rielar_favorites_backup') {
          try {
            if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SYNC_FAVORITES',
                favorites: JSON.parse(strVal)
              });
            }
          } catch {}
        }
      }
    },

    removeItem(key) {
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.delete(key);

      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].removeItem(key);
        }
      } catch {}

      if (storageType === 'localStorage') {
        deleteCookie(key);
        idbDelete(key).catch(() => {});
        cacheDelete(key).catch(() => {});
      }
    },

    clear() {
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.clear();

      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].clear();
        }
      } catch {}
    },
  };
}

export const safeLocalStorage = createStorageWrapper('localStorage');
export const safeSessionStorage = createStorageWrapper('sessionStorage');
export default safeLocalStorage;
