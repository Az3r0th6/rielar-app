import React, { useState, useEffect, useRef } from 'react';
import IPhoneFrame from './components/iPhoneFrame';
import TabBar from './components/TabBar';
import TrainDetailSheet from './components/TrainDetailSheet';
import NearbyView from './views/NearbyView';
import MapView from './views/MapView';
import LineStatusView from './views/LineStatusView';
import TripPlannerView from './views/TripPlannerView';
import FavoritesView from './views/FavoritesView';
import MoreView from './views/MoreView';
import { PRELOADED_STATIONS } from './data/linesData';
import { triggerHaptic, playChimeSound, sendAppNotification } from './utils/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState('nearby');
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [trackingTrain, setTrackingTrain] = useState(null);
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

  useEffect(() => {
    fetch('/api/network-status')
      .then((r) => r.json())
      .then((d) => {
        const count = Number(d.summary?.criticalCount || 0);
        setNetworkAlertsCount(count);
      })
      .catch(() => setNetworkAlertsCount(0));
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
      // User reviewed the line status, clear the notification badge
      setNetworkAlertsCount(0);
    }
  };

  // User Geolocation Coordinates
  const [userCoords, setUserCoords] = useState({
    lat: -34.59091,
    lng: -58.37505,
    name: 'Retiro',
  });
  const [locationPreset, setLocationPreset] = useState('Retiro');

  // Favorites in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('trenes_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading favorites:', e);
    }
    // Default favorites
    return [
      PRELOADED_STATIONS[0], // Retiro
      PRELOADED_STATIONS[16], // Tigre
    ];
  });

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('trenes_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn('Error saving favorites:', e);
    }
  }, [favorites]);

  // Attempt real HTML5 Geolocation on mount (safe for any browser)
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (pos?.coords) {
              setUserCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                name: 'GPS Real',
              });
              setLocationPreset('GPS');
            }
          },
          (err) => {
            console.log('GPS not granted or unavailable, using default preset:', err.message);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    } catch (geoErr) {
      console.warn('Geolocation check bypassed:', geoErr);
    }
  }, []);

  // Handle location simulation switcher
  const handleSimulateLocation = (presetName) => {
    setLocationPreset(presetName);
    if (presetName === 'GPS') {
      try {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition((pos) => {
            if (pos?.coords) {
              setUserCoords({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                name: 'GPS Real',
              });
            }
          });
        }
      } catch (err) {
        console.warn('GPS query error:', err);
      }
      return;
    }

    const presets = {
      Retiro: { lat: -34.59091, lng: -58.37505, name: 'Retiro' },
      Palermo: { lat: -34.58028, lng: -58.42861, name: 'Palermo' },
      Once: { lat: -34.60861, lng: -58.40694, name: 'Once' },
      'San Isidro': { lat: -34.47179, lng: -58.51379, name: 'San Isidro' },
      Constitución: { lat: -34.62778, lng: -58.38139, name: 'Constitución' },
    };

    if (presets[presetName]) {
      setUserCoords(presets[presetName]);
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
      tabBar={
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          alertsCount={networkAlertsCount}
          isHidden={isTabBarHidden}
        />
      }
    >
      {/* Active Tab View */}
      {activeTab === 'nearby' && (
        <NearbyView
          userCoords={userCoords}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectTrain={(train) => setSelectedTrain(train)}
        />
      )}

      {activeTab === 'map' && (
        <MapView
          userCoords={userCoords}
          onSelectStation={(st) => {
            setActiveTab('nearby');
          }}
          onSelectTrain={(train) => setSelectedTrain(train)}
        />
      )}

      {activeTab === 'lines' && <LineStatusView />}

      {activeTab === 'planner' && (
        <TripPlannerView onSelectTrain={(train) => setSelectedTrain(train)} />
      )}

      {activeTab === 'favorites' && (
        <FavoritesView
          favorites={favorites}
          onRemoveFavorite={handleRemoveFavorite}
          onSelectStation={(st) => setActiveTab('nearby')}
        />
      )}

      {activeTab === 'more' && (
        <MoreView onInstallApp={handleInstallApp} />
      )}

      {/* Train Detail Modal Bottom Sheet */}
      <TrainDetailSheet
        trainData={selectedTrain}
        onClose={() => setSelectedTrain(null)}
        onTrackTrain={handleTrackTrain}
        isTracked={trackingTrain?.servicio?.numero === selectedTrain?.servicio?.numero}
      />
    </IPhoneFrame>
  );
}
