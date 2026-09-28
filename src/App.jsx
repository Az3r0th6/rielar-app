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
import { PRELOADED_STATIONS } from './data/linesData';
import { triggerHaptic, playChimeSound, sendAppNotification } from './utils/notifications';
import {
  getUnreadAlertsCount,
  markAlertsAsRead,
  ALERTS_CHANGED_EVENT,
} from './utils/alertManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('nearby');
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

  const updateAlertsCount = () => {
    fetch('/api/network-status')
      .then((r) => r.json())
      .then((d) => {
        const incidents = d.summary?.criticalIncidents || [];
        const unread = getUnreadAlertsCount(incidents);
        setNetworkAlertsCount(unread);
      })
      .catch(() => setNetworkAlertsCount(0));
  };

  useEffect(() => {
    updateAlertsCount();
    const handleSync = () => {
      updateAlertsCount();
    };
    window.addEventListener(ALERTS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handleSync);
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
      const saved = localStorage.getItem('rielar_last_coords');
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
      const saved = localStorage.getItem('rielar_last_coords');
      if (saved) return 'GPS';
    } catch {}
    return 'Retiro';
  });

  // Global Theme (Dark / Light) with persistent storage
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('rielar_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('rielar_theme', theme);
    } catch {}
  }, [theme]);

  // App Version & Update Notification for Installed PWA / Mobile users
  const [updateNotice, setUpdateNotice] = useState(null);

  useEffect(() => {
    const CURRENT_VERSION = '1.5.0';
    try {
      const savedVersion = localStorage.getItem('rielar_app_version');
      if (savedVersion !== CURRENT_VERSION) {
        localStorage.setItem('rielar_app_version', CURRENT_VERSION);
        // If user already used or installed the app previously, alert them
        if (savedVersion) {
          setUpdateNotice({
            version: CURRENT_VERSION,
            title: '🎉 ¡RielAR se actualizó a la versión 1.5!',
            body: 'Se incorporó la Grilla Completa de Horarios de todos los ramales, mapa en vivo optimizado y gestión limpia de alertas.',
          });
          sendAppNotification(
            '🎉 ¡RielAR Actualizado a v1.5!',
            'Nueva Grilla de Horarios Oficiales y mejoras en el mapa en vivo.',
            { type: 'updated' }
          );
        }
      }
    } catch {}

    const handleAppUpdated = () => {
      setUpdateNotice({
        version: CURRENT_VERSION,
        title: '🎉 ¡Nueva actualización disponible!',
        body: 'Nueva Grilla de Horarios y mejoras de rendimiento listas para usar.',
      });
      sendAppNotification(
        '🎉 ¡Actualización instalada en RielAR!',
        'Disfrutá de la nueva Grilla de Horarios Oficiales.',
        { type: 'updated' }
      );
    };

    window.addEventListener('rielar-app-updated', handleAppUpdated);
    return () => window.removeEventListener('rielar-app-updated', handleAppUpdated);
  }, []);

  const handleToggleTheme = () => {
    triggerHaptic('light');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Favorites in localStorage (defaults to empty array)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('trenes_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it was the legacy default with only Retiro and Tigre, reset to clean empty list
        if (
          Array.isArray(parsed) &&
          parsed.length === 2 &&
          parsed.some((s) => s?.name === 'Retiro' || s?.id === 332) &&
          parsed.some((s) => s?.name === 'Tigre' || s?.id === 389)
        ) {
          localStorage.removeItem('trenes_favorites');
          return [];
        }
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn('Error reading favorites:', e);
    }
    return [];
  });

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('trenes_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
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
          localStorage.setItem('rielar_last_coords', JSON.stringify(newCoords));
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
                    localStorage.setItem('rielar_last_coords', JSON.stringify(newCoords));
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
        localStorage.setItem('rielar_last_coords', JSON.stringify(presets[presetName]));
      } catch {}
    }
  };

  // Toggle favorite station
  const handleToggleFavorite = (station) => {
    const exists = favorites.some((f) => f.id === station.id);
    if (exists) {
      setFavorites(favorites.filter((f) => f.id !== station.id));
    } else {
      setFavorites([...favorites, station]);
    }
  };

  const handleRemoveFavorite = (stationId) => {
    setFavorites(favorites.filter((f) => f.id !== stationId));
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
      modals={
        <>
          {/* Update Notification Pill for Mobile & Web Users */}
          {updateNotice && (
            <div
              style={{
                position: 'fixed',
                top: '56px',
                left: '12px',
                right: '12px',
                zIndex: 99999,
                background: 'rgba(28, 28, 30, 0.95)',
                backdropFilter: 'blur(25px)',
                WebkitBackdropFilter: 'blur(25px)',
                border: '1px solid rgba(48, 209, 88, 0.4)',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(48, 209, 88, 0.25)',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(48, 209, 88, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                🎉
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                  {updateNotice.title}
                </div>
                <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px', lineHeight: 1.35 }}>
                  {updateNotice.body}
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setUpdateNotice(null);
                }}
                style={{
                  background: '#30d158',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Entendido
              </button>
            </div>
          )}

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
            isFavorite={Boolean(selectedStationForInfo && favorites.some((f) => f.id === selectedStationForInfo.id))}
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
          />
        )}
      </ErrorBoundary>
    </IPhoneFrame>
  );
}
