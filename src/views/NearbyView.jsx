import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import LineBadge from '../components/LineBadge';
import { LINES_DATA, PRELOADED_STATIONS } from '../data/linesData';
import { getNearestStations } from '../utils/geo';
import { getStationArrivals, getAllStationsCatalog } from '../api/sofseClient';
import { formatArrivalSeconds, getCountdownBadgeClass } from '../utils/time';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function NearbyView({
  userCoords,
  favorites,
  onToggleFavorite,
  onSelectTrain,
}) {
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL'); // 'ALL', '1' (Provincia), '2' (CABA/Retiro)
  const [browseMode, setBrowseMode] = useState('nearby'); // 'nearby' or 'all'
  const [selectedCustomStation, setSelectedCustomStation] = useState(null);

  const [stationsWithArrivals, setStationsWithArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Compute nearest stations
  const nearestStations = getNearestStations(
    userCoords.lat,
    userCoords.lng,
    PRELOADED_STATIONS,
    8
  );

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
      return matches.slice(0, 5);
    }
    if (browseMode === 'all') {
      const filteredByLine = selectedLine === 'ALL'
        ? PRELOADED_STATIONS
        : PRELOADED_STATIONS.filter((s) => s.lineId === Number(selectedLine));
      return filteredByLine.slice(0, 6);
    }
    return nearestStations.slice(0, 4);
  };

  // Fetch arrivals for active stations
  const fetchArrivals = async () => {
    setRefreshing(true);
    try {
      const targets = getActiveStationsToQuery();
      const results = await Promise.all(
        targets.map(async (station) => {
          try {
            const data = await getStationArrivals(station.id);
            const arrivals = Array.isArray(data)
              ? data
              : data?.results || data?.arribos || [];
            return {
              ...station,
              arrivals: Array.isArray(arrivals) ? arrivals : [],
            };
          } catch (e) {
            return { ...station, arrivals: [] };
          }
        })
      );
      setStationsWithArrivals(results);
    } catch (err) {
      console.error('Error fetching arrivals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArrivals();
    const interval = setInterval(fetchArrivals, 20000);
    return () => clearInterval(interval);
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
            <span>
              • {browseMode === 'nearby' ? 'Cercanas a tu ubicación' : 'Toda la red AMBA'}
            </span>
          </div>
        </div>

        <button
          className="fav-button"
          onClick={() => {
            triggerHaptic('light');
            fetchArrivals();
          }}
          title="Actualizar arribos"
        >
          <RotateCw size={17} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Mode Switcher: Cercanía vs Explorar Red */}
      <div style={{ padding: '8px 16px 4px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => {
            triggerHaptic('light');
            setBrowseMode('nearby');
            setSelectedCustomStation(null);
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
            border: 'none',
            cursor: 'pointer',
            background: browseMode === 'nearby' ? '#0a84ff' : 'rgba(255,255,255,0.08)',
            color: browseMode === 'nearby' ? '#ffffff' : '#8e8e93',
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
            border: 'none',
            cursor: 'pointer',
            background: browseMode === 'all' ? '#0a84ff' : 'rgba(255,255,255,0.08)',
            color: browseMode === 'all' ? '#ffffff' : '#8e8e93',
            transition: 'all 0.2s',
          }}
        >
          <Compass size={13} />
          <span>Explorar Red Completa</span>
        </button>
      </div>

      {/* Universal Search Bar */}
      <div style={{ padding: '8px 16px 4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(118, 118, 128, 0.2)',
            padding: '8px 12px',
            borderRadius: '12px',
          }}
        >
          <Search size={16} style={{ color: '#8e8e93' }} />
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
              color: '#f5f5f7',
              fontSize: '13.5px',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#8e8e93', cursor: 'pointer' }}
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
        {LINES_DATA.slice(0, 5).map((line) => (
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
          gap: '6px',
          padding: '0 16px 12px',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase' }}>
          Sentido:
        </span>
        <button
          onClick={() => {
            triggerHaptic('light');
            setDirectionFilter('ALL');
          }}
          style={{
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: directionFilter === 'ALL' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
            color: '#f5f5f7',
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
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: directionFilter === '2' ? 'rgba(10, 132, 255, 0.3)' : 'rgba(255,255,255,0.06)',
            color: directionFilter === '2' ? '#0a84ff' : '#f5f5f7',
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
            padding: '4px 10px',
            borderRadius: '14px',
            fontSize: '11.5px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            background: directionFilter === '1' ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255,255,255,0.06)',
            color: directionFilter === '1' ? '#30d158' : '#f5f5f7',
          }}
        >
          ➔ Hacia Provincia
        </button>
      </div>

      {/* Station Cards List */}
      <div style={{ paddingBottom: '20px' }}>
        {loading && stationsWithArrivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8e8e93' }}>
            <RotateCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0a84ff' }} />
            <div style={{ fontWeight: 600 }}>Consultando arribos en tiempo real a SOFSE...</div>
          </div>
        ) : stationsWithArrivals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8e8e93' }}>
            <MapPin size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No se encontraron estaciones coincidentes.</div>
          </div>
        ) : (
          stationsWithArrivals.map((station) => {
            const isFav = favorites.some((f) => f.id === station.id);

            // Filter arrivals by Direction (Sentido 1 = Provincia, Sentido 2 = CABA/Retiro)
            const arrivals = (station.arrivals || []).filter((arr) => {
              if (directionFilter === 'ALL') return true;
              return String(arr.servicio?.sentido) === String(directionFilter);
            });

            return (
              <div key={station.id} className="ios-card">
                {/* Station Card Header */}
                <div className="station-header">
                  <div className="station-title-group">
                    <div className="station-name">
                      <span>{station.name}</span>
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
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px' }}>
                                {isTowardsCABA ? '🏙️' : '🌲'}
                              </span>
                              <span className="arrival-dest">{dest}</span>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  background: isTowardsCABA
                                    ? 'rgba(10, 132, 255, 0.15)'
                                    : 'rgba(48, 209, 88, 0.15)',
                                  color: isTowardsCABA ? '#0a84ff' : '#30d158',
                                }}
                              >
                                {isTowardsCABA ? 'A Retiro/CABA' : 'A Provincia'}
                              </span>
                            </div>

                            <div className="arrival-meta">
                              <span className="platform-badge">Andén {platform}</span>
                              {train.servicio?.numero && (
                                <span>Tren #{train.servicio.numero}</span>
                              )}
                              <span style={{ color: '#8e8e93' }}>Desde {origin}</span>
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

                          <div className={`arrival-countdown ${badgeClass}`}>
                            {isCancelled ? (
                              <span style={{ color: '#ff453a', fontWeight: 800, fontSize: '14px' }}>
                                CANCELADO
                              </span>
                            ) : (
                              <span className="countdown-number">
                                {formatArrivalSeconds(seconds)}
                              </span>
                            )}
                            <span
                              className="countdown-scheduled"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                justifyContent: 'flex-end',
                                color: '#0a84ff',
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
                        color: '#8e8e93',
                        background: 'rgba(255,255,255,0.02)',
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
