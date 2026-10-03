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
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['nearby', 'favorites', 'lines', 'planner', 'map', 'more'].includes(tab)) {
        return tab;
      }
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

  // Service Worker Background Update Detector
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const waitingWorkerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onUpdateFound = (registration) => {
      if (!registration) return;
      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = registration.waiting;
        setShowUpdateToast(true);
        return;
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingWorkerRef.current = newWorker;
            setShowUpdateToast(true);
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
        setShowUpdateToast(true);
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

        // 2. Clear old caches directly from window
        if (typeof window !== 'undefined' && 'caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys.map((k) => {
              if (k !== 'rielar-v26') {
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
    if (currentScrollY <= 20) {
      setIsTabBarHidden(false);
      setIsHeaderHidden(false);
    } else if (currentScrollY > lastScrollY.current + 8 && currentScrollY > 60) {
      setIsTabBarHidden(true);
      setIsHeaderHidden(true);
    } else if (currentScrollY < lastScrollY.current - 6) {
      setIsTabBarHidden(false);
      setIsHeaderHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsTabBarHidden(false);
    setIsHeaderHidden(false);
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

  // Favorites multi-layer persistence (localStorage + backup key)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved =
        safeLocalStorage.getItem('trenes_favorites') ||
        safeLocalStorage.getItem('rielar_favorites_backup');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .map((st) => ({
              id: Number(st.id),
              name: st.name || '',
              lineId: Number(st.lineId) || 5,
              lineName: st.lineName || '',
              ramal: st.ramal || '',
              lat: Number(st.lat || st.latitud) || 0,
              lng: Number(st.lng || st.longitud) || 0,
            }))
            .filter((st) => st.id && !isNaN(st.id));
        }
      }
    } catch (e) {
      console.warn('Error reading favorites:', e);
    }
    return [];
  });

  // Helper to safely write clean favorites to multiple storage targets synchronously
  const saveFavoritesToStorage = (favList) => {
    try {
      const cleanList = favList
        .map((st) => ({
          id: Number(st.id),
          name: st.name || '',
          lineId: Number(st.lineId) || 5,
          lineName: st.lineName || '',
          ramal: st.ramal || '',
          lat: Number(st.lat || st.latitud) || 0,
          lng: Number(st.lng || st.longitud) || 0,
        }))
        .filter((st) => st.id && !isNaN(st.id));

      const serialized = JSON.stringify(cleanList);
      safeLocalStorage.setItem('trenes_favorites', serialized);
      safeLocalStorage.setItem('rielar_favorites_backup', serialized);
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
  };

  // Sync to storage on state changes
  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

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
      name: station.name || 'Estación',
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

    setFavorites(nextFavorites);
    saveFavoritesToStorage(nextFavorites);
  };

  const handleRemoveFavorite = (stationId) => {
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

  const [selectedCustomStation, setSelectedCustomStation] = useState(null);

  return (
    <IPhoneFrame
      trackingTrain={trackingTrain}
      onClearTracking={() => setTrackingTrain(null)}
      onOpenDetails={(train) => setSelectedTrain(train)}
      onSimulateLocation={handleSimulateLocation}
      currentLocationName={locationPreset}
      onContentScroll={handleContentScroll}
      isHeaderHidden={isHeaderHidden}
      showDownloadModal={showDownloadModal}
      onCloseDownloadModal={() => setShowDownloadModal(false)}
      onOpenDownloadModal={() => setShowDownloadModal(true)}
      onInstallApp={handleInstallApp}
      theme={theme}
      onToggleTheme={handleToggleTheme}
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
              onDismiss={() => setShowUpdateToast(false)}
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
              setSelectedCustomStation(st);
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
            onClearCustomStation={() => setSelectedCustomStation(null)}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onToggleFavorite={handleToggleFavorite}
            onSelectStation={(st) => {
              setSelectedCustomStation(st);
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
              setSelectedCustomStation(st);
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
