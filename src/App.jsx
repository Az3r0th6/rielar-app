import React, { useState, useEffect, useRef } from 'react';
import IPhoneFrame from './components/iPhoneFrame';
import TabBar from './components/TabBar';
import TrainDetailSheet from './components/TrainDetailSheet';
import StationDetailSheet from './components/StationDetailSheet';
import ErrorBoundary from './components/ErrorBoundary';
import NearbyView from './views/NearbyView';
import MapView from './views/MapView';
import LineStatusView from './views/LineStatusView';
import TripPlannerView from './views/TripPlannerView';
import FavoritesView from './views/FavoritesView';
import MoreView from './views/MoreView';
import ChangelogModal from './components/ChangelogModal';
import InAppNotificationToast from './components/InAppNotificationToast';
import UpdateNotificationToast from './components/UpdateNotificationToast';
import { APP_BUILD, APP_VERSION, CACHE_NAME } from './version';
import { PRELOADED_STATIONS } from './data/linesData';
import {
  triggerHaptic,
  playChimeSound,
  sendAppNotification,
  subscribeToPushNotifications,
} from './utils/notifications';
import {
  getUnreadAlertsCount,
  markAlertsAsRead,
  ALERTS_CHANGED_EVENT,
} from './utils/alertManager';
import {
  safeLocalStorage,
  safeSessionStorage,
  idbGet,
  idbSet,
  cacheGet,
  cacheSet,
  requestStoragePersistence,
  syncFavoritesToServer,
  fetchFavoritesFromServer,
} from './utils/safeStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const shortcut = params.get('shortcut');
      
      // Clear URL params so pull-to-refresh doesn't get stuck on the shortcut tab forever
      if (tab || shortcut) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // 1. Android Native TWA App Shortcuts Override
      if (shortcut === 'cercanos') return 'nearby';
      if (shortcut === 'mapa') return 'map';
      
      // 2. Standard URL Tab Parameters
      if (tab && ['nearby', 'favorites', 'lines', 'planner', 'map', 'more'].includes(tab)) {
        return tab;
      }
      
      try {
        const savedTab = safeLocalStorage.getItem('rielar_active_tab');
        if (savedTab && ['nearby', 'favorites', 'lines', 'planner', 'map', 'more'].includes(savedTab)) {
          return savedTab;
        }
      } catch {}
    }
    return 'nearby';
  });
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [trackingTrain, setTrackingTrain] = useState(null);
  const [selectedStationForInfo, setSelectedStationForInfo] = useState(null);
  const [networkAlertsCount, setNetworkAlertsCount] = useState(0);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('descargar') ||
      window.location.search.includes('download') ||
      window.location.search.includes('install')
    );
  });
  const lastScrollY = useRef(0);
  const scrollLockRef = useRef(true);

  // Prevent scroll restoration / page load jitter from hiding TabBar on refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollLockRef.current = false;
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    triggerHaptic('medium');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowDownloadModal(true);
    }
  };

  const [inAppToast, setInAppToast] = useState(null);
  const toastTimerRef = useRef(null);

  // In-app visual notification listener (displays floating banner on mobile / tablet)
  useEffect(() => {
    const handleInAppNotif = (e) => {
      const { title, body, type } = e.detail || {};
      if (!title) return;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setInAppToast({ title, body, type });
      toastTimerRef.current = setTimeout(() => {
        setInAppToast(null);
      }, 5000);
    };
    window.addEventListener('rielar:in-app-notification', handleInAppNotif);
    return () => {
      window.removeEventListener('rielar:in-app-notification', handleInAppNotif);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Auto-subscribe to WebPush on launch if notification permission was granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      subscribeToPushNotifications().catch(() => {});
    }
  }, []);

  // Dual-Engine Update Detection System
  const CURRENT_APP_BUILD = APP_BUILD;
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const waitingWorkerRef = useRef(null);

  // Engine 1: Instant Server Version Probe (works 100% reliably on Android WebViews, TWAs & iframes)
  useEffect(() => {
    const checkServerVersion = async () => {
      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.build && data.build > CURRENT_APP_BUILD) {
            const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rielar_update_dismissed') === String(data.build);
            if (!isDismissed) {
              setShowUpdateToast(true);
            }
            return;
          }
        }
      } catch (err) {
        // Fallback to static version.json
        try {
          const res2 = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
          if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && data2.build && data2.build > CURRENT_APP_BUILD) {
              const isDismissed2 = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rielar_update_dismissed') === String(data2.build);
              if (!isDismissed2) {
                setShowUpdateToast(true);
              }
              return;
            }
          }
        } catch {}
      }
    };

    checkServerVersion();
    const timer = setInterval(checkServerVersion, 90 * 1000); // Check every 90 seconds
    return () => clearInterval(timer);
  }, []);

  // Engine 2: Service Worker Lifecycle Listener (detects new sw.js waiting state)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onUpdateFound = (registration) => {
      if (!registration) return;
      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = registration.waiting;
        const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rielar_update_dismissed');
        if (!isDismissed) {
          setShowUpdateToast(true);
        }
        return;
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if ((newWorker.state === 'installed' || newWorker.state === 'activating') && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = newWorker;
            const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rielar_update_dismissed');
            if (!isDismissed) {
              setShowUpdateToast(true);
            }
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) onUpdateFound(reg);
    });

    const handleCustomUpdateEvent = (e) => {
      if (e.detail?.registration) {
        onUpdateFound(e.detail.registration);
      } else {
        const isDismissed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('rielar_update_dismissed');
        if (!isDismissed) {
          setShowUpdateToast(true);
        }
      }
    };

    window.addEventListener('rielar:sw-update', handleCustomUpdateEvent);
    return () => window.removeEventListener('rielar:sw-update', handleCustomUpdateEvent);
  }, []);

  const handleApplyUpdate = async () => {
    triggerHaptic('medium');
    setShowUpdateToast(false);

    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        // 1. Send SKIP_WAITING to all possible worker instances
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.installing) {
            reg.installing.postMessage({ type: 'SKIP_WAITING' });
          }
        }
        if (waitingWorkerRef.current) {
          waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
        }

        // 2. Clear old caches directly from window (preserving durable user cache)
        if (typeof window !== 'undefined' && 'caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys.map((k) => {
              if (k.startsWith('rielar-v') && k !== CACHE_NAME) {
                return caches.delete(k);
              }
            })
          );
        }
      }
    } catch (err) {
      console.warn('Error applying update:', err);
    }

    // 3. Force hard reload with timestamp parameter so WebView and browser bypass any disk cache
    const targetUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now();
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 250);
  };

  // Alert Monitoring Loop: periodically checks network status and alerts user for subscribed lines
  const checkSubscribedAlerts = async () => {
    try {
      const res = await fetch('/api/network-status');
      if (!res.ok) return;
      const data = await res.json();
      const incidents = data.summary?.criticalIncidents || [];

      // Update badge count
      const unread = getUnreadAlertsCount(incidents);
      setNetworkAlertsCount(unread);

      // Check if any incident belongs to user's subscribed lines
      const rawSubscribed = safeLocalStorage.getItem('subscribed_lines');
      if (!rawSubscribed) return;
      const subscribed = JSON.parse(rawSubscribed);
      if (!Array.isArray(subscribed) || subscribed.length === 0) return;

      const notifiedRaw = safeSessionStorage.getItem('rielar_notified_alerts') || '[]';
      const notifiedSet = new Set(JSON.parse(notifiedRaw));

      for (const inc of incidents) {
        const incLineId = Number(inc.lineId);
        if (subscribed.some((id) => Number(id) === incLineId)) {
          const alertKey = `${incLineId}_${inc.ramalName || ''}_${(inc.content || inc.title || '').slice(0, 30)}`;
          if (!notifiedSet.has(alertKey)) {
            notifiedSet.add(alertKey);
            try {
              safeSessionStorage.setItem('rielar_notified_alerts', JSON.stringify(Array.from(notifiedSet)));
            } catch {}

            sendAppNotification(
              `⚠️ Alerta en Línea ${inc.lineName || 'de Trenes'}`,
              inc.content || inc.title || `Incidente reportado en ramal ${inc.ramalName || 'urbano'}.`,
              { type: 'alert', tag: alertKey }
            );
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    checkSubscribedAlerts();
    const interval = setInterval(checkSubscribedAlerts, 25000);
    const handleSync = () => {
      checkSubscribedAlerts();
    };
    window.addEventListener(ALERTS_CHANGED_EVENT, handleSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSubscribedAlerts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener(ALERTS_CHANGED_EVENT, handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleContentScroll = (e) => {
    const currentScrollY = e.target.scrollTop;
    const scrollHeight = e.target.scrollHeight;
    const clientHeight = e.target.clientHeight;
    const diff = currentScrollY - lastScrollY.current;

    // Never hide during page load / refresh lock or on initial scroll restoration
    if (scrollLockRef.current || lastScrollY.current === 0) {
      lastScrollY.current = currentScrollY;
      setIsTabBarHidden(false);
      setIsHeaderHidden(false);
      return;
    }

    // Ignore tiny jitter movements
    if (Math.abs(diff) < 5) return;

    // If near the top (<= 60px): keep both header and bottom panel visible
    if (currentScrollY <= 60) {
      setIsHeaderHidden(false);
      setIsTabBarHidden(false);
    }
    // Reached bottom of page: reveal bottom tab bar so user is never stuck
    else if (scrollHeight - (currentScrollY + clientHeight) < 60) {
      setIsTabBarHidden(false);
    }
    // Scrolling down deliberately: smoothly hide both header and bottom panel
    else if (diff > 14 && currentScrollY > 120) {
      // Only hide if the content is long enough to easily scroll back up
      if (e.target.scrollHeight > e.target.clientHeight + 250) {
        setIsHeaderHidden(true);
        setIsTabBarHidden(true);
      }
    }
    // Scrolling up: smoothly reveal both header and bottom panel
    else if (diff < -5) {
      setIsHeaderHidden(false);
      setIsTabBarHidden(false);
    }

    lastScrollY.current = currentScrollY;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    try {
      safeLocalStorage.setItem('rielar_active_tab', tabId);
    } catch {}
    setIsTabBarHidden(false);
    setIsHeaderHidden(false);
    lastScrollY.current = 0;
    if (tabId === 'lines') {
      // User reviewed the line status, mark all currently existing alerts as read
      // so badge counter stays in ZERO and doesn't nag the user again!
      fetch('/api/network-status')
        .then((r) => r.json())
        .then((d) => {
          const incidents = d.summary?.criticalIncidents || [];
          markAlertsAsRead(incidents);
          setNetworkAlertsCount(0);
        })
        .catch(() => setNetworkAlertsCount(0));
    }
  };

  const [plannerPreset, setPlannerPreset] = useState(null);

  const handleNavigateToPlanner = (origId, destId, initialTab = 'departures') => {
    if (origId && destId) {
      setPlannerPreset({ originId: String(origId), destId: String(destId), initialTab });
    } else if (initialTab) {
      setPlannerPreset((prev) => ({ ...(prev || {}), initialTab }));
    }
    handleTabChange('planner');
  };

  // User Geolocation Coordinates (reads last known coordinates from localStorage for instant launch)
  const [userCoords, setUserCoords] = useState(() => {
    try {
      const saved = safeLocalStorage.getItem('rielar_last_coords');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      lat: -34.59091,
      lng: -58.37505,
      name: 'Retiro',
    };
  });
  const [locationPreset, setLocationPreset] = useState(() => {
    try {
      const saved = safeLocalStorage.getItem('rielar_last_coords');
      if (saved) return 'GPS';
    } catch {}
    return 'Retiro';
  });

  // Global Theme (Dark / Light) with persistent storage
  const [theme, setTheme] = useState(() => {
    try {
      return safeLocalStorage.getItem('rielar_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      safeLocalStorage.setItem('rielar_theme', theme);
    } catch {}
  }, [theme]);

  // Version / Changelog Modal (Closed by default; updates are delivered via Google Play Store)
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  const handleToggleTheme = () => {
    triggerHaptic('light');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Favorites multi-layer persistence (localStorage + cookies + IndexedDB + CacheStorage + backup keys)
  const isHydratedRef = useRef(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      let saved = null;
      // 1. Check direct native localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          saved =
            window.localStorage.getItem('trenes_favorites') ||
            window.localStorage.getItem('rielar_favorites_backup') ||
            window.localStorage.getItem('rielar_favorites') ||
            window.localStorage.getItem('favorites');
        } catch {}
      }
      // 2. Fallback to safeLocalStorage wrapper / cookies
      if (!saved) {
        saved =
          safeLocalStorage.getItem('trenes_favorites') ||
          safeLocalStorage.getItem('rielar_favorites_backup') ||
          safeLocalStorage.getItem('rielar_favorites') ||
          safeLocalStorage.getItem('favorites');
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validStations = parsed
            .map((st) => ({
              id: Number(st.id),
              name: st.name || st.nombre || 'Estación',
              lineId: st.lineId !== undefined ? Number(st.lineId) : 5,
              lineName: st.lineName || '',
              ramal: st.ramal || '',
              lat: Number(st.lat || st.latitud) || 0,
              lng: Number(st.lng || st.longitud) || 0,
            }))
            .filter((st) => st.id && !isNaN(st.id));

          if (validStations.length > 0) {
            isHydratedRef.current = true;
            return validStations;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading synchronous favorites:', e);
    }
    return [];
  });

  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  // Helper to safely write clean favorites to multiple storage targets synchronously & asynchronously
  const saveFavoritesToStorage = (favList, isInternalSync = false) => {
    try {
      const cleanList = (favList || [])
        .map((st) => ({
          id: Number(st.id),
          name: st.name || st.nombre || 'Estación',
          lineId: st.lineId !== undefined ? Number(st.lineId) : 5,
          lineName: st.lineName || '',
          ramal: st.ramal || '',
          lat: Number(st.lat || st.latitud) || 0,
          lng: Number(st.lng || st.longitud) || 0,
        }))
        .filter((st) => st.id && !isNaN(st.id));

      // CRITICAL GUARD: Never write empty array to storage if async hydration has not completed!
      if (cleanList.length === 0 && !isHydratedRef.current) {
        console.warn('Skipping storage overwrite with empty list before hydration completes');
        return;
      }

      const serialized = JSON.stringify(cleanList);

      // 1. Direct native Web Storage (synchronous disk write)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('trenes_favorites', serialized);
          window.localStorage.setItem('rielar_favorites_backup', serialized);
        }
      } catch {}

      // 2. SafeStorage wrapper (sync memory + cookies)
      safeLocalStorage.setItem('trenes_favorites', serialized);
      safeLocalStorage.setItem('rielar_favorites_backup', serialized);

      // 3. Asynchronously mirror to IndexedDB (durable against task kill)
      idbSet('trenes_favorites', serialized).catch(() => {});
      idbSet('rielar_favorites_backup', serialized).catch(() => {});

      // 4. Asynchronously mirror to CacheStorage (durable mobile HTTP storage)
      cacheSet('trenes_favorites', serialized).catch(() => {});

      // 5. Asynchronously mirror to Server fallback (bulletproof against WebView task kill)
      syncFavoritesToServer(cleanList).catch(() => {});

      if (typeof window !== 'undefined' && !isInternalSync) {
        window.dispatchEvent(new CustomEvent('rielar:favorites-changed', { detail: cleanList }));
      }
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
  };

  // Asynchronous durable recovery from IndexedDB, CacheStorage and Server on initial mount
  useEffect(() => {
    requestStoragePersistence();

    (async () => {
      try {
        let restoredData = null;

        // Fetch from all local durable sources concurrently to merge them
        const [idbSaved, idbBackup, cacheSaved] = await Promise.all([
          idbGet('trenes_favorites'),
          idbGet('rielar_favorites_backup'),
          cacheGet('trenes_favorites')
        ]);
        
        let mergedList = [];
        const tryParse = (str) => {
          try {
            const p = JSON.parse(str);
            if (Array.isArray(p)) mergedList.push(...p);
          } catch {}
        };

        if (idbSaved) tryParse(idbSaved);
        if (idbBackup) tryParse(idbBackup);
        if (cacheSaved) tryParse(cacheSaved);

        if (mergedList.length > 0) {
          // Remove duplicates by ID, giving preference to the most recently added or keeping all unique
          const uniqueLocalMap = new Map();
          mergedList.forEach(st => {
            if (st && st.id) uniqueLocalMap.set(Number(st.id), st);
          });
          restoredData = Array.from(uniqueLocalMap.values());
        }

        // 4. Check Server Fallback if local stores were evicted or unavailable
        if (!restoredData) {
          const serverFavs = await fetchFavoritesFromServer();
          if (Array.isArray(serverFavs) && serverFavs.length > 0) {
            restoredData = serverFavs;
          }
        }

        if (Array.isArray(restoredData) && restoredData.length > 0) {
          const cleanRestored = restoredData
            .map((st) => ({
              id: Number(st.id),
              name: st.name || st.nombre || 'Estación',
              lineId: st.lineId !== undefined ? Number(st.lineId) : 5,
              lineName: st.lineName || '',
              ramal: st.ramal || '',
              lat: Number(st.lat || st.latitud) || 0,
              lng: Number(st.lng || st.longitud) || 0,
            }))
            .filter((st) => st.id && !isNaN(st.id));

          if (cleanRestored.length > 0) {
            setFavorites((currentFavs) => {
              const currentIds = new Set((currentFavs || []).map((p) => Number(p.id)));
              const merged = [...(currentFavs || [])];
              for (const r of cleanRestored) {
                if (!currentIds.has(r.id)) {
                  merged.push(r);
                  currentIds.add(r.id);
                }
              }
              const finalFavs = merged.length > 0 ? merged : cleanRestored;
              saveFavoritesToStorage(finalFavs, true);
              return finalFavs;
            });
          }
        }
      } catch (err) {
        console.warn('Error hydrating favorites from durable storage:', err);
      } finally {
        isHydratedRef.current = true;
      }
    })();
  }, []);

  // Sync to storage on state changes (only once hydrated)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  // Flush favorites when app is put into background, tab is closed or navigated away
  useEffect(() => {
    const handleFlush = () => {
      if (isHydratedRef.current && favoritesRef.current && favoritesRef.current.length > 0) {
        saveFavoritesToStorage(favoritesRef.current);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('beforeunload', handleFlush);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('beforeunload', handleFlush);
    };
  }, []);

  const [gpsState, setGpsState] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'denied' | 'timeout'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');

  // Robust Geolocation Engine for Mobile Android & Brave
  const requestGpsLocation = (isUserClick = false) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsState('denied');
      setGpsErrorMsg('Este navegador no soporta geolocalización.');
      return;
    }

    if (isUserClick) {
      triggerHaptic('medium');
    }
    setGpsState('requesting');
    setGpsErrorMsg('');

    const applyCoords = (pos) => {
      if (pos?.coords) {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          name: 'GPS Real',
        };
        setUserCoords(newCoords);
        setLocationPreset('GPS');
        setGpsState('active');
        setGpsErrorMsg('');
        try {
          safeLocalStorage.setItem('rielar_last_coords', JSON.stringify(newCoords));
        } catch {}
      }
    };

    const handleGpsError = (err) => {
      console.warn('Geolocation error:', err.code, err.message);
      if (err.code === 1) {
        // PERMISSION_DENIED
        setGpsState('denied');
        setGpsErrorMsg('Permiso de ubicación denegado en Brave / Android.');
      } else if (err.code === 3) {
        // TIMEOUT: Try fallback with cached / network location
        navigator.geolocation.getCurrentPosition(
          (pos) => applyCoords(pos),
          (fallbackErr) => {
            setGpsState('timeout');
            setGpsErrorMsg('Tiempo de espera agotado buscando señal GPS.');
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
        );
      } else {
        setGpsState('denied');
        setGpsErrorMsg('Ubicación no disponible en este dispositivo.');
      }
    };

    // Phase 1: Fast cached / network position (maximumAge: 5 mins, timeout: 8s, low accuracy)
    // On Android Brave, this resolves instantly from cell towers / WiFi without freezing on GPS satellites
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos);
        // Phase 2: Refine with High Accuracy GPS once coarse position is already loaded
        navigator.geolocation.getCurrentPosition(
          (precisePos) => applyCoords(precisePos),
          () => {}, // Non-blocking if fine fix fails, coarse is already active
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
        );
      },
      (fastErr) => {
        // Fallback to high accuracy with generous timeout (20s instead of 5s)
        navigator.geolocation.getCurrentPosition(
          (pos) => applyCoords(pos),
          handleGpsError,
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  // Attempt real Geolocation on mount & register continuous watcher
  useEffect(() => {
    requestGpsLocation(false);

    let watchId = null;
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (pos?.coords) {
              const newCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                name: 'GPS Real',
              };
              setUserCoords((prev) => {
                const distLat = Math.abs(prev.lat - newCoords.lat);
                const distLng = Math.abs(prev.lng - newCoords.lng);
                if (distLat > 0.0003 || distLng > 0.0003) {
                  try {
                    safeLocalStorage.setItem('rielar_last_coords', JSON.stringify(newCoords));
                  } catch {}
                  return newCoords;
                }
                return prev;
              });
              setGpsState('active');
            }
          },
          (err) => {
            console.debug('watchPosition info:', err.message);
          },
          { enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 }
        );
      }
    } catch (e) {
      console.warn('watchPosition setup error:', e);
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Handle location simulation switcher
  const handleSimulateLocation = (presetName) => {
    setLocationPreset(presetName);
    if (presetName === 'GPS') {
      requestGpsLocation(true);
      return;
    }

    const presets = {
      Retiro: { lat: -34.59091, lng: -58.37505, name: 'Retiro' },
      Palermo: { lat: -34.58028, lng: -58.42861, name: 'Palermo' },
      Once: { lat: -34.60861, lng: -58.40694, name: 'Once' },
      'San Isidro': { lat: -34.47179, lng: -58.51379, name: 'San Isidro' },
      Constitución: { lat: -34.62778, lng: -58.38139, name: 'Constitución' },
      Morón: { lat: -34.6517, lng: -58.6206, name: 'Morón' },
      Quilmes: { lat: -34.7239, lng: -58.2589, name: 'Quilmes' },
      'La Plata': { lat: -34.9044, lng: -57.9497, name: 'La Plata' },
    };

    if (presets[presetName]) {
      setUserCoords(presets[presetName]);
      setGpsState('idle');
      try {
        safeLocalStorage.setItem('rielar_last_coords', JSON.stringify(presets[presetName]));
      } catch {}
    }
  };

  // Toggle favorite station with deep sanitization and synchronous multi-layer save
  const handleToggleFavorite = (station) => {
    if (!station || !station.id) return;
    const cleanStation = {
      id: Number(station.id),
      name: station.name || station.nombre || 'Estación',
      lineId: station.lineId !== undefined ? Number(station.lineId) : 5,
      lineName: station.lineName || '',
      ramal: station.ramal || '',
      lat: Number(station.lat || station.latitud) || 0,
      lng: Number(station.lng || station.longitud) || 0,
    };
    const exists = favorites.some((f) => Number(f.id) === Number(station.id));
    const nextFavorites = exists
      ? favorites.filter((f) => Number(f.id) !== Number(station.id))
      : [...favorites, cleanStation];

    isHydratedRef.current = true;
    setFavorites(nextFavorites);
    saveFavoritesToStorage(nextFavorites);
  };

  const handleRemoveFavorite = (stationId) => {
    isHydratedRef.current = true;
    const nextFavorites = favorites.filter((f) => Number(f.id) !== Number(stationId));
    setFavorites(nextFavorites);
    saveFavoritesToStorage(nextFavorites);
  };

  // Tracking Train in Dynamic Island Live Activity
  const handleTrackTrain = (train) => {
    if (trackingTrain?.servicio?.numero === train?.servicio?.numero) {
      setTrackingTrain(null);
    } else {
      setTrackingTrain(train);
      sendAppNotification(
        'Dynamic Island Activada',
        `Siguiendo tren hacia ${train.servicio?.ramal?.cabeceraFinal?.nombre || 'destino'}.`,
        { type: 'arrival' }
      );
    }
  };

  // Second-by-second decrementer for Dynamic Island countdown
  useEffect(() => {
    if (!trackingTrain) return;
    const interval = setInterval(() => {
      setTrackingTrain((prev) => {
        if (!prev) return null;
        const currentSec = prev.arribo?.segundos;
        if (currentSec !== undefined && currentSec > 0) {
          return {
            ...prev,
            arribo: {
              ...prev.arribo,
              segundos: currentSec - 1,
            },
          };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [trackingTrain]);

  const [selectedCustomStation, setSelectedCustomStation] = useState(() => {
    try {
      const saved = safeLocalStorage.getItem('rielar_custom_station');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const handleSetCustomStation = (st) => {
    setSelectedCustomStation(st);
    try {
      if (st) {
        safeLocalStorage.setItem('rielar_custom_station', JSON.stringify(st));
      } else {
        safeLocalStorage.removeItem('rielar_custom_station');
      }
    } catch {}
  };

  return (
    <IPhoneFrame
      trackingTrain={trackingTrain}
      onClearTracking={() => setTrackingTrain(null)}
      onOpenDetails={(train) => setSelectedTrain(train)}
      onContentScroll={handleContentScroll}
      isHeaderHidden={isHeaderHidden}
      showDownloadModal={showDownloadModal}
      onCloseDownloadModal={() => setShowDownloadModal(false)}
      onInstallApp={handleInstallApp}
      tabBar={
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          alertsCount={networkAlertsCount}
          isHidden={isTabBarHidden || !!selectedStationForInfo || !!selectedTrain}
        />
      }
      overlayModals={
        <>
          <InAppNotificationToast
            toast={inAppToast}
            onClose={() => setInAppToast(null)}
            onAction={() => handleTabChange('lines')}
          />
          {showUpdateToast && (
            <UpdateNotificationToast
              onUpdate={handleApplyUpdate}
              onDismiss={() => {
                setShowUpdateToast(false);
                try {
                  sessionStorage.setItem('rielar_update_dismissed', String(APP_BUILD));
                } catch {}
              }}
              isTabBarHidden={isTabBarHidden || !!selectedStationForInfo || !!selectedTrain}
            />
          )}
          <ChangelogModal
            isOpen={showChangelogModal}
            onClose={() => setShowChangelogModal(false)}
            onNavigateToPlanner={() => {
              handleNavigateToPlanner(null, null, 'departures');
            }}
          />
        </>
      }
      modals={
        <>
          {/* Train Detail Modal Bottom Sheet */}
          <TrainDetailSheet
            trainData={selectedTrain}
            onClose={() => setSelectedTrain(null)}
            onTrackTrain={handleTrackTrain}
            isTracked={trackingTrain?.servicio?.numero === selectedTrain?.servicio?.numero}
          />

          {/* Station Information & Amenities Bottom Sheet */}
          <StationDetailSheet
            station={selectedStationForInfo}
            onClose={() => setSelectedStationForInfo(null)}
            onSelectTrain={(train) => setSelectedTrain(train)}
            isFavorite={Boolean(selectedStationForInfo && favorites.some((f) => Number(f.id) === Number(selectedStationForInfo.id)))}
            onToggleFavorite={handleToggleFavorite}
            onSelectStation={(st) => {
              handleSetCustomStation(st);
              setActiveTab('nearby');
              setSelectedStationForInfo(null);
            }}
          />
        </>
      }
    >
      {/* Active Tab View with Error Boundary protection */}
      <ErrorBoundary key={activeTab} onNavigateHome={() => handleTabChange('nearby')}>
        {activeTab === 'nearby' && (
          <NearbyView
            userCoords={userCoords}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectTrain={(train) => setSelectedTrain(train)}
            onOpenStationInfo={(st) => setSelectedStationForInfo(st)}
            locationPreset={locationPreset}
            gpsState={gpsState}
            gpsErrorMsg={gpsErrorMsg}
            onRequestGps={() => requestGpsLocation(true)}
            onSetLocationPreset={handleSimulateLocation}
            selectedCustomStation={selectedCustomStation}
            onClearCustomStation={() => handleSetCustomStation(null)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenDownloadModal={() => setShowDownloadModal(true)}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onToggleFavorite={handleToggleFavorite}
            onSelectStation={(st) => {
              handleSetCustomStation(st);
              setActiveTab('nearby');
            }}
            onOpenStationInfo={(st) => setSelectedStationForInfo(st)}
          />
        )}

        {activeTab === 'lines' && (
          <LineStatusView onNavigateToPlanner={handleNavigateToPlanner} />
        )}

        {activeTab === 'planner' && (
          <TripPlannerView
            onSelectTrain={(train) => setSelectedTrain(train)}
            onOpenStationInfo={(st) => setSelectedStationForInfo(st)}
            onNavigateToMap={() => handleTabChange('map')}
            initialOriginId={plannerPreset?.originId}
            initialDestId={plannerPreset?.destId}
            initialTab={plannerPreset?.initialTab || 'departures'}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            userCoords={userCoords}
            onSelectStation={(st) => {
              handleSetCustomStation(st);
              setActiveTab('nearby');
            }}
            onSelectTrain={(train) => setSelectedTrain(train)}
            onOpenStationInfo={(st) => setSelectedStationForInfo(st)}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            onInstallApp={handleInstallApp}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenChangelog={() => setShowChangelogModal(true)}
          />
        )}
      </ErrorBoundary>
    </IPhoneFrame>
  );
}
