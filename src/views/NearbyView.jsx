import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Search,
  RotateCw,
  Star,
  MapPin,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  Compass,
  SlidersHorizontal,
  X,
  Check,
  Info,
  Sun,
  Moon,
} from 'lucide-react';
import LineBadge from '../components/LineBadge';
import { LINES_DATA, PRELOADED_STATIONS } from '../data/linesData';
import { getNearestStations } from '../utils/geo';
import { getStationArrivals, getAllStationsCatalog } from '../api/sofseClient';
import { formatArrivalSeconds, formatLocalTime, getCountdownBadgeClass } from '../utils/time';
import { triggerHaptic, playChimeSound, unlockAudio } from '../utils/notifications';

export default function NearbyView({
  userCoords,
  favorites,
  onToggleFavorite,
  onSelectTrain,
  onOpenStationInfo,
  locationPreset = 'Retiro',
  gpsState = 'idle',
  gpsErrorMsg = '',
  onRequestGps,
  onSetLocationPreset,
  selectedCustomStation: externalStation,
  onClearCustomStation,
  theme,
  onToggleTheme,
}) {
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL'); // 'ALL', '1' (Provincia), '2' (CABA/Retiro)
  const [browseMode, setBrowseMode] = useState('nearby'); // 'nearby' or 'all'
  const [selectedCustomStation, setSelectedCustomStation] = useState(externalStation || null);

  useEffect(() => {
    if (externalStation) {
      setSelectedCustomStation(externalStation);
    }
  }, [externalStation]);
  const [showZonePicker, setShowZonePicker] = useState(false);

  // Compute nearest stations
  const nearestStations = getNearestStations(
    userCoords.lat,
    userCoords.lng,
    PRELOADED_STATIONS,
    8
  );

  // Pre-fill initial state with nearest stations and any cached arrivals from sessionStorage
  const [stationsWithArrivals, setStationsWithArrivals] = useState(() => {
    try {
      const initial = nearestStations.slice(0, 4);
      return initial.map((st) => {
        const cached = sessionStorage.getItem(`arr_${st.id}`);
        const arrivals = cached ? JSON.parse(cached) : [];
        return {
          ...st,
          arrivals: Array.isArray(arrivals) ? arrivals : (arrivals?.results || arrivals?.arribos || []),
        };
      });
    } catch {
      return [];
    }
  });

  // When userCoords changes, immediately reorder stationsWithArrivals
  // with the new nearest stations so the UI reflects the real location instantaneously
  useEffect(() => {
    if (browseMode === 'nearby' && !selectedCustomStation && searchQuery.trim().length < 2) {
      const freshNearest = getNearestStations(userCoords.lat, userCoords.lng, PRELOADED_STATIONS, 8).slice(0, 4);
      setStationsWithArrivals((prev) => {
        return freshNearest.map((st) => {
          const existing = prev.find((p) => p.id === st.id);
          return {
            ...st,
            arrivals: existing?.arrivals || [],
          };
        });
      });
    }
  }, [userCoords.lat, userCoords.lng, browseMode, selectedCustomStation, searchQuery]);

  const [loading, setLoading] = useState(() => stationsWithArrivals.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const abortControllerRef = useRef(null);

  // Determine active stations to query
  const getActiveStationsToQuery = () => {
    if (selectedCustomStation) {
      return [selectedCustomStation];
    }
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const matches = PRELOADED_STATIONS.filter(
        (s) => s.name.toLowerCase().includes(q) || s.ramal?.toLowerCase().includes(q)
      );
      return matches.slice(0, 4);
    }
    if (browseMode === 'all') {
      const filteredByLine = selectedLine === 'ALL'
        ? PRELOADED_STATIONS
        : PRELOADED_STATIONS.filter((s) => s.lineId === Number(selectedLine));
      return filteredByLine.slice(0, 4);
    }
    return nearestStations.slice(0, 4);
  };

  // Fetch arrivals for active stations with high precision & non-blocking cancelation
  const fetchArrivals = async (isManual = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isManual) {
      unlockAudio();
      triggerHaptic('light');
      playChimeSound('click');
    }
    setRefreshing(true);
    try {
      const targets = getActiveStationsToQuery();
      const results = await Promise.all(
        targets.map(async (station) => {
          try {
            const data = await getStationArrivals(station.id, {}, isManual, controller.signal);
            const arrivals = Array.isArray(data)
              ? data
              : data?.results || data?.arribos || [];
            return {
              ...station,
              arrivals: Array.isArray(arrivals) ? arrivals : [],
            };
          } catch (e) {
            // Keep existing arrivals for this station if a single request hiccups or aborts
            const existing = stationsWithArrivals.find((st) => st.id === station.id);
            return {
              ...station,
              arrivals: existing?.arrivals || [],
            };
          }
        })
      );

      if (!controller.signal.aborted) {
        setStationsWithArrivals(results);
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastUpdatedAt(timeStr);

        if (isManual) {
          triggerHaptic('success');
          playChimeSound('success');
          setJustRefreshed(true);
          setTimeout(() => setJustRefreshed(false), 2000);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching arrivals:', err);
        if (isManual) {
          triggerHaptic('warning');
          playChimeSound('alert');
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchArrivals(false);
    const interval = setInterval(() => fetchArrivals(false), 20000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userCoords.lat, userCoords.lng, selectedLine, searchQuery, browseMode, selectedCustomStation]);

  // Second-by-second countdown decrementer
  useEffect(() => {
    const timer = setInterval(() => {
      setStationsWithArrivals((prev) =>
        prev.map((st) => ({
          ...st,
          arrivals: (st.arrivals || []).map((arr) => {
            const curr = arr.arribo?.segundos;
            if (curr !== undefined && curr > 0) {
              return {
                ...arr,
                arribo: { ...arr.arribo, segundos: curr - 1 },
              };
            }
            return arr;
          }),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      {/* iOS Navigation Header */}
      <div className="ios-nav-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="ios-large-title">RielAR</h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '8px',
                letterSpacing: '0.04em',
              }}
            >
              EN VIVO
            </span>
          </div>
          <div className="ios-subtitle">
            <span className="ios-live-indicator">
              <span className="live-pulse-dot" />
              <span>Tiempo Real</span>
            </span>
            <span style={{ color: justRefreshed ? 'var(--ios-green)' : 'var(--ios-text-secondary)', transition: 'color 0.3s' }}>
              • {justRefreshed ? '✓ Arribos al día' : lastUpdatedAt ? `Actualizado ${lastUpdatedAt}` : (browseMode === 'nearby' ? 'Cercanas a tu ubicación' : 'Toda la red AMBA')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleTheme && (
            <button
              className="fav-button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}

          <button
            className="fav-button"
            onClick={() => {
              fetchArrivals(true);
            }}
            style={{
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              borderColor: justRefreshed ? 'rgba(48, 209, 88, 0.6)' : undefined,
              background: justRefreshed ? 'rgba(48, 209, 88, 0.15)' : undefined,
              color: justRefreshed ? '#30d158' : undefined,
              transform: justRefreshed ? 'scale(1.06)' : 'scale(1)',
            }}
            title="Actualizar arribos ahora"
            aria-label="Actualizar arribos ahora"
          >
            {justRefreshed ? (
              <Check size={17} style={{ strokeWidth: 2.8 }} />
            ) : (
              <RotateCw size={17} className={refreshing ? 'animate-spin' : ''} />
            )}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Cercanía vs Explorar Red */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            triggerHaptic('light');
            setBrowseMode('nearby');
            setSelectedCustomStation(null);
            if (onRequestGps) onRequestGps();
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12.5px',
            fontWeight: 700,
            border: browseMode === 'nearby' ? 'none' : '1px solid var(--ios-card-border)',
            cursor: 'pointer',
            background: browseMode === 'nearby' ? 'var(--ios-blue)' : 'rgba(118, 118, 128, 0.14)',
            color: browseMode === 'nearby' ? '#ffffff' : 'var(--ios-text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          <Navigation size={13} />
          <span>Por Cercanía (GPS)</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setBrowseMode('all');
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12.5px',
            fontWeight: 700,
            border: browseMode === 'all' ? 'none' : '1px solid var(--ios-card-border)',
            cursor: 'pointer',
            background: browseMode === 'all' ? 'var(--ios-blue)' : 'rgba(118, 118, 128, 0.14)',
            color: browseMode === 'all' ? '#ffffff' : 'var(--ios-text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          <Compass size={13} />
          <span>Explorar Red Completa</span>
        </button>
      </div>

      {/* Selected Station Banner (when arriving from Map or Favorites) */}
      {selectedCustomStation && (
        <div style={{ padding: '6px 16px 2px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(10, 132, 255, 0.12)',
              border: '1px solid rgba(10, 132, 255, 0.3)',
              borderRadius: '12px',
              padding: '8px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <MapPin size={16} style={{ color: '#0a84ff', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  Estación: {selectedCustomStation.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                  Mostrando arribos seleccionados
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                setSelectedCustomStation(null);
                if (onClearCustomStation) onClearCustomStation();
              }}
              style={{
                background: 'rgba(10, 132, 255, 0.2)',
                border: 'none',
                color: '#0a84ff',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Volver a GPS
            </button>
          </div>
        </div>
      )}

      {/* GPS Status & Location Controls for Android & Brave */}
      {browseMode === 'nearby' && !selectedCustomStation && (
        <div style={{ padding: '4px 16px 6px' }}>
          {gpsState === 'active' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(10, 132, 255, 0.12)',
                border: '1px solid rgba(10, 132, 255, 0.3)',
                borderRadius: '12px',
                padding: '7px 12px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0a84ff', fontWeight: 600 }}>
                <Navigation size={13} style={{ fill: '#0a84ff' }} />
                <span>
                  GPS Activo: Más cercana <strong>{nearestStations[0]?.name || 'Detectada'}</strong> ({nearestStations[0]?.formattedDistance})
                </span>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  if (onRequestGps) onRequestGps();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0a84ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Actualizar GPS"
              >
                <RotateCw size={13} />
              </button>
            </div>
          ) : gpsState === 'requesting' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 214, 10, 0.12)',
                border: '1px solid rgba(255, 214, 10, 0.3)',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#ffd60a',
                fontWeight: 600,
              }}
            >
              <RotateCw size={14} className="animate-spin" />
              <span>Buscando tu ubicación en Brave / Android...</span>
            </div>
          ) : (
            <div
              className="ios-card"
              style={{
                padding: '12px 14px',
                background: 'linear-gradient(135deg, rgba(28, 28, 35, 0.95), rgba(20, 20, 25, 0.98))',
                border: '1px solid rgba(255, 159, 10, 0.3)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={17} style={{ color: '#ff9f0a', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    Zona seleccionada: {locationPreset || 'Retiro'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                    {gpsState === 'denied'
                      ? 'Ubicación desactivada. Podés activar tu GPS o elegir una zona.'
                      : 'Activá el GPS para detectar tu estación más cercana automáticamente.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  onClick={() => {
                    if (onRequestGps) onRequestGps();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0a84ff',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Navigation size={13} />
                  <span>{gpsState === 'denied' ? 'Reintentar GPS' : 'Activar mi GPS'}</span>
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowZonePicker(!showZonePicker);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--ios-separator)',
                    background: 'rgba(118, 118, 128, 0.14)',
                    color: 'var(--ios-text-primary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  📍 Elegir zona
                </button>
              </div>

              {showZonePicker && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {['Retiro', 'Once', 'Constitución', 'Morón', 'San Isidro', 'Quilmes', 'La Plata'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => {
                        triggerHaptic('light');
                        if (onSetLocationPreset) onSetLocationPreset(zone);
                        setShowZonePicker(false);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: locationPreset === zone ? 'none' : '1px solid var(--ios-card-border)',
                        background: locationPreset === zone ? 'var(--ios-blue)' : 'rgba(118, 118, 128, 0.14)',
                        color: locationPreset === zone ? '#ffffff' : 'var(--ios-text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Universal Search Bar */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(118, 118, 128, 0.16)',
            border: '1px solid var(--ios-card-border)',
            padding: '8px 12px',
            borderRadius: '12px',
          }}
        >
          <Search size={16} style={{ color: 'var(--ios-text-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar cualquier estación (ej: Tigre, Once, Quilmes, San Isidro)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedCustomStation) setSelectedCustomStation(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ios-text-primary)',
              fontSize: '13.5px',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--ios-text-secondary)', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Line Filter Segmented Pills */}
      <div className="ios-segmented-control" style={{ margin: '8px 16px 10px' }}>
        <button
          className={`segmented-option ${selectedLine === 'ALL' ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic('light');
            setSelectedLine('ALL');
          }}
        >
          Todas
        </button>
        {LINES_DATA.map((line) => (
          <button
            key={line.id}
            className={`segmented-option ${selectedLine === String(line.id) ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setSelectedLine(String(line.id));
            }}
          >
            {line.name}
          </button>
        ))}
      </div>

      {/* Direction Filter Pills (Sentido: Ambos, Hacia CABA/Retiro, Hacia Provincia) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 16px 12px',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
          Sentido:
        </span>
        <button
          onClick={() => {
            triggerHaptic('light');
            setDirectionFilter('ALL');
          }}
          style={{
            padding: '5px 12px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: directionFilter === 'ALL' ? '1px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
            background: directionFilter === 'ALL' ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.12)',
            color: directionFilter === 'ALL' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
            boxShadow: directionFilter === 'ALL' ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          Ambos sentidos ⇄
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setDirectionFilter('2');
          }}
          style={{
            padding: '5px 12px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: directionFilter === '2' ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-separator)',
            background: directionFilter === '2' ? 'rgba(10, 132, 255, 0.18)' : 'rgba(118, 118, 128, 0.12)',
            color: directionFilter === '2' ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
            boxShadow: directionFilter === '2' ? '0 2px 8px rgba(10, 132, 255, 0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          ➔ Hacia Retiro / CABA
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setDirectionFilter('1');
          }}
          style={{
            padding: '5px 12px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: directionFilter === '1' ? '1.5px solid var(--ios-green)' : '1px solid var(--ios-separator)',
            background: directionFilter === '1' ? 'rgba(48, 209, 88, 0.18)' : 'rgba(118, 118, 128, 0.12)',
            color: directionFilter === '1' ? 'var(--ios-green)' : 'var(--ios-text-secondary)',
            boxShadow: directionFilter === '1' ? '0 2px 8px rgba(48, 209, 88, 0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          ➔ Hacia Provincia
        </button>
      </div>

      {/* Station Cards List */}
      <div style={{ paddingBottom: '20px' }}>
        {loading && stationsWithArrivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ios-text-secondary)' }}>
            <RotateCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--ios-blue)' }} />
            <div style={{ fontWeight: 600 }}>Consultando arribos en tiempo real a SOFSE...</div>
          </div>
        ) : stationsWithArrivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ios-text-secondary)' }}>
            <MapPin size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No se encontraron estaciones coincidentes.</div>
          </div>
        ) : (
          stationsWithArrivals.map((station) => {
            const isFav = favorites.some((f) => Number(f.id) === Number(station.id));

            // Filter arrivals by Direction (Sentido 1 = Provincia, Sentido 2 = CABA/Retiro)
            const arrivals = (station.arrivals || []).filter((arr) => {
              if (directionFilter === 'ALL') return true;
              return String(arr.servicio?.sentido) === String(directionFilter);
            });

            return (
              <div key={station.id} className="ios-card">
                {/* Station Card Header */}
                <div className="station-header">
                  <div
                    className="station-title-group"
                    onClick={() => {
                      triggerHaptic('light');
                      if (onOpenStationInfo) onOpenStationInfo(station);
                    }}
                    style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}
                    title="Ver horarios de boletería, colectivos y servicios"
                  >
                    <div className="station-name">
                      <span style={{ textDecoration: 'none', wordBreak: 'break-word' }}>{station.name}</span>
                      <LineBadge lineId={station.lineId} size="small" />
                    </div>
                    <div className="station-distance">
                      <Navigation size={12} />
                      <span>
                        {station.formattedDistance
                          ? `A ${station.formattedDistance} • ${station.walkingMinutes || 4} min a pie`
                          : station.ramal || 'Línea de trenes'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        if (onOpenStationInfo) onOpenStationInfo(station);
                      }}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '9px',
                        background: 'rgba(10, 132, 255, 0.12)',
                        border: '1px solid rgba(10, 132, 255, 0.25)',
                        color: '#0a84ff',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Ver información de boletería, colectivos y servicios"
                    >
                      <Info size={13} />
                      <span>Info</span>
                    </button>

                    <button
                      className={`fav-button ${isFav ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('medium');
                        onToggleFavorite(station);
                      }}
                      title={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                    >
                      <Star size={17} fill={isFav ? '#ffd60a' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* Arrivals List */}
                <div style={{ marginTop: '8px' }}>
                  {arrivals.length > 0 ? (
                    arrivals.map((train, idx) => {
                      // Correctly resolve destination and origin based on actual train direction!
                      const dest =
                        train.servicio?.hasta?.estacion?.nombre ||
                        train.servicio?.estaciones?.[train.servicio.estaciones.length - 1]?.nombre ||
                        train.servicio?.ramal?.cabeceraFinal?.nombre ||
                        'Destino';

                      const origin =
                        train.servicio?.desde?.estacion?.nombre ||
                        train.servicio?.estaciones?.[0]?.nombre ||
                        train.servicio?.ramal?.cabeceraInicial?.nombre ||
                        'Origen';

                      const isTowardsCABA = train.servicio?.sentido === 2;
                      const seconds = train.arribo?.segundos;
                      const platform = train.arribo?.anden?.nombre || '1';
                      const badgeClass = getCountdownBadgeClass(seconds);
                      const isCancelled = !!train.servicio?.cancelacion;
                      const schedTime = train.arribo?.salida?.programada || train.arribo?.llegada?.programada;

                      return (
                        <div
                          key={idx}
                          className="arrival-row"
                          onClick={() => {
                            triggerHaptic('light');
                            onSelectTrain({
                              ...train,
                              stationName: station.name,
                              stationId: station.id,
                            });
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px' }}>
                                {isTowardsCABA ? '🏙️' : '🌲'}
                              </span>
                              <span className="arrival-dest" style={{ wordBreak: 'break-word', fontSize: '15.5px' }}>
                                <span style={{ color: '#0a84ff', fontWeight: 800 }}>Desde {origin}</span> ➔ {dest}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  background: isTowardsCABA
                                    ? 'rgba(10, 132, 255, 0.15)'
                                    : 'rgba(48, 209, 88, 0.15)',
                                  color: isTowardsCABA ? '#0a84ff' : '#30d158',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isTowardsCABA ? 'Hacia Retiro/CABA' : 'Hacia Provincia'}
                              </span>
                            </div>

                            <div className="arrival-meta" style={{ flexWrap: 'wrap', fontSize: '12.5px' }}>
                              <span className="platform-badge">Andén {platform}</span>
                              {train.servicio?.numero && (
                                <span>Tren #{train.servicio.numero}</span>
                              )}
                              <span>Cabecera final: {dest}</span>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#30d158',
                                  fontWeight: 700,
                                  fontSize: '10.5px',
                                  background: 'rgba(48, 209, 88, 0.12)',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: '#30d158',
                                    animation: 'pulse-ring 1.5s infinite',
                                  }}
                                ></span>
                                En vivo
                              </span>
                              {train.servicio?.leyenda && (
                                <span style={{ color: '#ff9f0a' }}>
                                  {train.servicio.leyenda}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={`arrival-countdown ${badgeClass}`} style={{ flexShrink: 0 }}>
                            {isCancelled ? (
                              <span style={{ color: '#ff453a', fontWeight: 800, fontSize: '14px' }}>
                                CANCELADO
                              </span>
                            ) : (
                              <>
                                <span className="countdown-number">
                                  {formatArrivalSeconds(seconds)}
                                </span>
                                {schedTime && (
                                  <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>
                                    {formatLocalTime(schedTime)} hs
                                  </span>
                                )}
                              </>
                            )}
                            <span
                              className="countdown-scheduled"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                justifyContent: 'flex-end',
                                color: 'var(--ios-blue)',
                                fontWeight: 700,
                              }}
                            >
                              <span>Seguimiento 🚆 ›</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        padding: '14px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: 'var(--ios-text-secondary)',
                        background: 'rgba(118, 118, 128, 0.08)',
                        borderRadius: '12px',
                      }}
                    >
                      {directionFilter !== 'ALL'
                        ? 'No hay trenes en este sentido en los próximos minutos.'
                        : 'Sin próximos arribos programados en este momento.'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
