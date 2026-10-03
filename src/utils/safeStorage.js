// Bulletproof Storage Utility with In-Memory Fallback
// Prevents "DOMException: Failed to read the 'localStorage' property from 'Window': Access is denied for this document"
// which occurs in Android WebViews, iframes, private browsing, or when cookies/storage are restricted.

const memoryStorage = new Map();
const sessionMemoryStorage = new Map();

function createStorageWrapper(storageType) {
  return {
    getItem(key) {
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          return window[storageType].getItem(key);
        }
      } catch {
        // Access is denied or restricted by browser
      }
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      return map.has(key) ? map.get(key) : null;
    },

    setItem(key, value) {
      const strVal = String(value);
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].setItem(key, strVal);
          return;
        }
      } catch {
        // Access is denied or restricted by browser
      }
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.set(key, strVal);
    },

    removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].removeItem(key);
          return;
        }
      } catch {
        // Access is denied or restricted by browser
      }
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.delete(key);
    },

    clear() {
      try {
        if (typeof window !== 'undefined' && window[storageType]) {
          window[storageType].clear();
          return;
        }
      } catch {
        // Access is denied or restricted by browser
      }
      const map = storageType === 'localStorage' ? memoryStorage : sessionMemoryStorage;
      map.clear();
    },
  };
}

export const safeLocalStorage = createStorageWrapper('localStorage');
export const safeSessionStorage = createStorageWrapper('sessionStorage');
export default safeLocalStorage;
