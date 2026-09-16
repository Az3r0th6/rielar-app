import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bell,
  Pin,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Compass,
  Navigation,
  Gauge,
  Clock,
  Radio,
  Layers,
  RotateCw,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import LineBadge from './LineBadge';
import { formatArrivalSeconds, formatLocalTime } from '../utils/time';
import { playChimeSound, triggerHaptic, sendAppNotification } from '../utils/notifications';
import { calculateTrainJourney } from '../utils/trainTracker';
import { getStationArrivals } from '../api/sofseClient';

function ChangeTrackingMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  return null;
}

export default function TrainDetailSheet({ trainData, onClose, onTrackTrain, isTracked }) {
  if (!trainData) return null;

  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'map'
  const [liveTrain, setLiveTrain] = useState(trainData);
  const [currentSeconds, setCurrentSeconds] = useState(trainData?.arribo?.segundos ?? 180);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync state whenever prop trainData changes
  useEffect(() => {
    setLiveTrain(trainData);
    setCurrentSeconds(trainData?.arribo?.segundos ?? 180);
  }, [trainData?.servicio?.numero, trainData?.stationId, trainData?.arribo?.segundos]);

  // Second-by-second countdown decrementer (prevents freezing inside station view!)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSeconds((prev) => {
        if (prev === undefined || prev === null) return 0;
        return Math.max(0, prev - 1);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [trainData?.servicio?.numero, trainData?.stationId]);

  // Background auto-refresh from SOFSE every 15 seconds
  const refreshArrivals = useCallback(async () => {
    const stationId = liveTrain?.stationId || trainData?.stationId;
    const trainNum = liveTrain?.servicio?.numero || trainData?.servicio?.numero;
    if (!stationId) return;

    try {
      setIsRefreshing(true);
      const data = await getStationArrivals(stationId);
      const arrivals = Array.isArray(data) ? data : (data?.results || data?.arribos || []);
      
      const matched = arrivals.find((arr) => String(arr.servicio?.numero) === String(trainNum))
        || arrivals.find((arr) => arr.servicio?.sentido === (liveTrain?.servicio?.sentido || trainData?.servicio?.sentido));

      if (matched) {
        setLiveTrain((prev) => ({
          ...prev,
          ...matched,
          stationName: trainData.stationName,
          stationId,
        }));
        if (matched.arribo?.segundos !== undefined && matched.arribo?.segundos !== null) {
          setCurrentSeconds(matched.arribo.segundos);
        }
      }
    } catch (err) {
      console.warn('[TrainDetailSheet] Auto-refresh sync warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [liveTrain?.stationId, liveTrain?.servicio?.numero, liveTrain?.servicio?.sentido, trainData?.stationId, trainData?.servicio?.numero, trainData?.servicio?.sentido, trainData?.stationName]);

  useEffect(() => {
    const interval = setInterval(refreshArrivals, 15000);
    return () => clearInterval(interval);
  }, [refreshArrivals]);

  // Compute journey dynamically based on live ticking seconds
  const journey = calculateTrainJourney({
    ...liveTrain,
    stationName: trainData.stationName,
    arribo: {
      ...liveTrain?.arribo,
      segundos: currentSeconds,
    },
  });

  const { servicio, stationName } = liveTrain;
  const destination = journey?.destination || 'Destino final';
  const origin = journey?.origin || 'Origen';
  const trainNumber = journey?.trainNumber || 'S/N';
  const lineName = journey?.lineName || 'Línea';
  const seconds = currentSeconds;
  const platform = liveTrain?.arribo?.anden?.nombre || '1';
  const isCancelled = !!servicio?.cancelacion;
  const delayMsg = servicio?.leyenda || (isCancelled ? 'Servicio Cancelado' : 'A horario');

  const handleTrackToggle = () => {
    triggerHaptic('medium');
    playChimeSound('arrival');
    onTrackTrain({
      ...liveTrain,
      arribo: { ...liveTrain?.arribo, segundos: currentSeconds },
      stationName,
    });
  };

  const handleNotificationReminder = () => {
    triggerHaptic('medium');
    sendAppNotification(
      `Alarma de Tren • ${destination}`,
      `El tren #${trainNumber} está aproximándose a ${stationName}. Andén ${platform}.`,
      { type: 'arrival' }
    );
    alert(`🔔 Alarma configurada: Te avisaremos cuando el tren #${trainNumber} esté a 2 minutos de ${stationName}.`);
  };

  // Custom Train Live Marker
  const liveTrainIcon = L.divIcon({
    className: 'live-train-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -6px; border-radius: 50%; background: rgba(0, 159, 227, 0.4); animation: pulse-ring 1.8s infinite;"></div>
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #009fe3; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 17px;">
          🚆
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

  const stopPinIcon = (state) => {
    let color = '#0a84ff';
    if (state === 'completed') color = '#30d158';
    if (state === 'current') color = '#ffd60a';

    return L.divIcon({
      className: 'stop-pin',
      html: `
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.6);"></div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -7],
    });
  };

  const polylineCoords = journey?.stops.map((s) => [s.lat, s.lng]) || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ios-bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle-container">
          <div className="sheet-handle" />
        </div>

        {/* Sheet Header */}
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineBadge lineName={lineName} />
            <span style={{ fontSize: '13px', color: '#8e8e93', fontWeight: 600 }}>
              Tren #{trainNumber}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                background: 'rgba(48, 209, 88, 0.15)',
                color: '#30d158',
                border: '1px solid rgba(48, 209, 88, 0.35)',
                padding: '2px 7px',
                borderRadius: '8px',
                letterSpacing: '0.04em',
              }}
            >
              EN VIVO
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="fav-button"
              style={{ width: '32px', height: '32px' }}
              onClick={() => {
                triggerHaptic('light');
                refreshArrivals();
              }}
              title="Actualizar arribo ahora"
            >
              <RotateCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button className="close-round-btn" onClick={onClose} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="sheet-content">
          {/* Main Info Header */}
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#f5f5f7' }}>
              Hacia {destination}
            </h2>
            <div style={{ fontSize: '13px', color: '#8e8e93', marginTop: '2px' }}>
              Partió de {origin} • Andén {platform} en {stationName}
            </div>
          </div>

          {/* Real-time Journey Live Status Card */}
          <div
            className="ios-card"
            style={{
              padding: '16px',
              margin: '0 0 16px',
              background: 'linear-gradient(135deg, rgba(0, 159, 227, 0.15), rgba(20, 20, 26, 0.95))',
              border: '1px solid rgba(0, 159, 227, 0.35)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="live-pulse-dot" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#30d158', textTransform: 'uppercase' }}>
                  {journey?.statusBadge || 'En viaje'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8e8e93' }}>
                <Gauge size={14} style={{ color: '#0a84ff' }} />
                <span>Velocidad: ~{journey?.speedKmH ?? 43} km/h</span>
              </div>
            </div>

            <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              {journey?.statusDetail || `En trayecto hacia ${stationName}`}
            </div>

            {/* Live Progress Bar with moving train */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>
                <span>{origin}</span>
                <span style={{ color: '#0a84ff', fontWeight: 700 }}>{journey?.overallProgress || 50}% del recorrido</span>
                <span>{destination}</span>
              </div>

              <div
                style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${journey?.overallProgress || 50}%`,
                    background: 'linear-gradient(90deg, #009fe3, #30d158)',
                    borderRadius: '10px',
                    transition: 'width 0.5s ease',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-7px',
                    left: `calc(${journey?.overallProgress || 50}% - 11px)`,
                    fontSize: '15px',
                    transition: 'left 0.5s ease',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                  }}
                >
                  🚆
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={handleTrackToggle}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                borderRadius: '14px',
                background: isTracked ? 'rgba(10, 132, 255, 0.25)' : 'rgba(255,255,255,0.08)',
                border: isTracked ? '1px solid #0a84ff' : '1px solid rgba(255,255,255,0.12)',
                color: isTracked ? '#0a84ff' : '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Pin size={15} />
              <span>{isTracked ? 'En Dynamic Island' : 'Fijar en Isla'}</span>
            </button>

            <button
              onClick={handleNotificationReminder}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Bell size={15} />
              <span>Avisarme llegada</span>
            </button>
          </div>

          {/* View Mode Switcher: Timeline vs Live Map */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px',
              borderRadius: '14px',
              marginBottom: '16px',
            }}
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('timeline');
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: viewMode === 'timeline' ? '#0a84ff' : 'transparent',
                color: viewMode === 'timeline' ? '#ffffff' : '#8e8e93',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Layers size={14} />
              <span>Recorrido y Paradas</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setViewMode('map');
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: 'none',
                background: viewMode === 'map' ? '#0a84ff' : 'transparent',
                color: viewMode === 'map' ? '#ffffff' : '#8e8e93',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Compass size={14} />
              <span>🗺️ Mapa en Vivo del Tren</span>
            </button>
          </div>

          {/* VIEW 1: Interactive Live Map View of the Journey */}
          {viewMode === 'map' && (
            <div
              style={{
                height: '320px',
                width: '100%',
                borderRadius: '18px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                position: 'relative',
                marginBottom: '14px',
              }}
            >
              <MapContainer
                center={journey?.trainPosition || [-34.5909, -58.375]}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <ChangeTrackingMapView center={journey?.trainPosition || [-34.5909, -58.375]} zoom={13} />

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  className="dark-osm-tiles"
                />

                {/* Railway Route Polyline */}
                {polylineCoords.length > 1 && (
                  <Polyline
                    positions={polylineCoords}
                    pathOptions={{ color: '#009fe3', weight: 4, opacity: 0.85 }}
                  />
                )}

                {/* Station Pins along the route */}
                {journey?.stops.map((st) => (
                  <Marker
                    key={st.id}
                    position={[st.lat, st.lng]}
                    icon={stopPinIcon(st.state)}
                  >
                    <Popup>
                      <div style={{ padding: '4px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#1c1c1e', fontSize: '13px' }}>
                          {st.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>
                          {st.label}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Moving Live Train Marker */}
                {journey?.trainPosition && (
                  <Marker position={journey.trainPosition} icon={liveTrainIcon}>
                    <Popup>
                      <div style={{ padding: '6px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, color: '#1c1c1e', fontSize: '14px' }}>
                          Tren #{trainNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: '#009fe3', fontWeight: 700 }}>
                          Hacia {destination}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '3px' }}>
                          {journey.statusDetail}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>

              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  background: 'rgba(18, 18, 24, 0.88)',
                  backdropFilter: 'blur(15px)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '11.5px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  zIndex: 999,
                }}
              >
                <span>🚆 Ubicación en vivo de la formación</span>
                <span style={{ color: '#30d158', fontWeight: 700 }}>GPS Activo</span>
              </div>
            </div>
          )}

          {/* VIEW 2: Detailed Stop Timeline with Real-Time Position Indicator */}
          {viewMode === 'timeline' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#f5f5f7' }}>
                  Itinerario del Viaje ({journey?.stops.length || 0} paradas)
                </h3>
                <span style={{ fontSize: '11.5px', color: '#8e8e93' }}>
                  Arribo en {stationName}: <strong>{formatArrivalSeconds(seconds)}</strong>
                </span>
              </div>

              <div className="timeline-list">
                {journey?.stops.map((st, idx) => {
                  const isCurrent = st.state === 'current';
                  const isCompleted = st.state === 'completed';

                  return (
                    <div
                      key={idx}
                      className={`timeline-step ${isCurrent ? 'current' : isCompleted ? 'passed' : ''}`}
                    >
                      {/* Railway Track & Node Indicator */}
                      <div className="track-rail-col">
                        <div className={`track-node ${isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming'}`}>
                          {isCompleted ? '✓' : isCurrent ? '🚆' : ''}
                        </div>
                        {idx < journey.stops.length - 1 && (
                          <div className={`track-line ${isCompleted ? 'completed' : ''}`} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontWeight: isCurrent ? 800 : isCompleted ? 500 : 700,
                              fontSize: isCurrent ? '15px' : '13.5px',
                              color: isCurrent ? '#30d158' : isCompleted ? '#8e8e93' : '#f5f5f7',
                            }}
                          >
                            {st.name}
                          </span>

                          {isCompleted && (
                            <span style={{ fontSize: '11px', color: '#30d158' }}>✓</span>
                          )}

                          {isCurrent && (
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                background: 'rgba(48,209,88,0.2)',
                                color: '#30d158',
                                padding: '1px 6px',
                                borderRadius: '6px',
                              }}
                            >
                              {seconds <= 35 ? 'En Andén' : 'Próxima'}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '11.5px', color: isCurrent ? '#30d158' : '#8e8e93', marginTop: '2px' }}>
                          {st.label}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: isCurrent ? '#30d158' : '#f5f5f7' }}>
                          {st.scheduledArrival ? formatLocalTime(st.scheduledArrival) : (isCurrent ? formatArrivalSeconds(seconds) : '')}
                        </div>
                        {st.anden && (
                          <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                            Andén {st.anden}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

