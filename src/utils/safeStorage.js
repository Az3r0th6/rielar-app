// Bulletproof Multi-Tier Storage Utility with Cookie & IndexedDB Persistence
// Prevents storage loss in Android WebViews, iOS Safari private browsing, PWAs, TWAs, and iframe sandboxes.

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
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}
}

function deleteCookie(name) {
  try {
    if (typeof document === 'undefined') return;
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {}
}

// --- IndexedDB Durable Storage (Asynchronous permanent backup) ---
const IDB_NAME = 'rielar_storage_db';
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
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
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
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
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

      // 2. Multi-tier persistence for localStorage: mirror to Cookies and IndexedDB
      if (storageType === 'localStorage') {
        setCookie(key, strVal);
        idbSet(key, strVal).catch(() => {});
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
