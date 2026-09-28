import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Layers, MapPin, Eye, Info } from 'lucide-react';
import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import LineBadge from '../components/LineBadge';
import { getDistanceMeters, formatDistance } from '../utils/geo';
import { triggerHaptic } from '../utils/notifications';
import { getActiveNetworkTrains, findStationByName, processRawNetworkTrains } from '../utils/trainTracker';
import { getNetworkTrains } from '../api/sofseClient';

// Helper component to smoothly center map and invalidate size
function ChangeMapView({ center, zoom }) {
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

export default function MapView({ userCoords, onSelectStation, onSelectTrain, onOpenStationInfo }) {
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [mapCenter, setMapCenter] = useState([userCoords.lat, userCoords.lng]);
  const [mapZoom, setMapZoom] = useState(13);
  const [liveNetworkTrains, setLiveNetworkTrains] = useState([]);

  // Auto-center map when GPS user coordinates are detected
  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      setMapCenter([userCoords.lat, userCoords.lng]);
    }
  }, [userCoords?.lat, userCoords?.lng]);

  // Fetch real-time circulating trains across the network every 20 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchLiveTrains = async () => {
      try {
        const rawList = await getNetworkTrains();
        if (isMounted && Array.isArray(rawList) && rawList.length > 0) {
          const processed = processRawNetworkTrains(rawList);
          if (processed.length > 0) {
            setLiveNetworkTrains(processed);
          }
        }
      } catch (e) {
        console.debug('Live network trains fetch error:', e);
      }
    };

    fetchLiveTrains();
    const interval = setInterval(fetchLiveTrains, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Custom User Location Pin Icon
  const userIcon = L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div style="position: relative; width: 22px; height: 22px;">
        <div style="position: absolute; inset: -6px; border-radius: 50%; background: rgba(10, 132, 255, 0.35); animation: pulse-ring 2s infinite;"></div>
        <div style="width: 22px; height: 22px; border-radius: 50%; background: #0a84ff; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  // Function to create precision station pin pointing directly at the platform/track coordinates
  const createStationIcon = (lineId) => {
    const line = LINES_DATA.find((l) => l.id === lineId) || { color: '#009fe3' };
    return L.divIcon({
      className: `station-pin-wrap-${lineId}`,
      html: `
        <div class="ios-station-pin" style="--pin-color: ${line.color};">
          <div class="ios-station-pin-head">
            <span>🚆</span>
          </div>
          <div class="ios-station-pin-needle"></div>
        </div>
      `,
      iconSize: [28, 34],
      iconAnchor: [14, 34],
      popupAnchor: [0, -34],
    });
  };

  const createNetworkTrainIcon = (lineColor) => {
    return L.divIcon({
      className: 'active-train-pin',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${lineColor || '#009fe3'}55; animation: pulse-ring 1.8s infinite;"></div>
          <div style="width: 32px; height: 32px; border-radius: 50%; background: #1c1c24; border: 2.5px solid ${lineColor || '#009fe3'}; box-shadow: 0 4px 12px rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-size: 16px;">
            🚆
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -17],
    });
  };

  const fallbackTrains = getActiveNetworkTrains();
  // For each line, if live SOFSE trains are present, use live data.
  // If any line temporarily has 0 trains (e.g. late night or temporary API gap), supplement with fallback trains so the map is never empty
  const activeTrains = React.useMemo(() => {
    if (!liveNetworkTrains || liveNetworkTrains.length === 0) {
      return fallbackTrains;
    }
    const lineCounts = {};
    liveNetworkTrains.forEach((t) => {
      lineCounts[t.lineId] = (lineCounts[t.lineId] || 0) + 1;
    });
    const supplemental = fallbackTrains.filter((t) => !lineCounts[t.lineId]);
    return [...liveNetworkTrains, ...supplemental];
  }, [liveNetworkTrains, fallbackTrains]);
  const filteredTrains = activeTrains.filter((t) => selectedLine === 'ALL' || t.lineId === Number(selectedLine));

  const filteredStations = PRELOADED_STATIONS.filter((st) => {
    return selectedLine === 'ALL' || st.lineId === Number(selectedLine);
  });

  const handleRecenter = () => {
    triggerHaptic('light');
    setMapCenter([userCoords.lat, userCoords.lng]);
    setMapZoom(14);
  };

  const activeMapLines = LINES_DATA.filter(
    (l) => l.id !== 501 && PRELOADED_STATIONS.some((st) => st.lineId === l.id)
  );

  return (
    <div className="map-view-wrapper">
      {/* Map Filter Control Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 999,
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          padding: '6px',
          background: 'rgba(18, 18, 24, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        <button
          className={`segmented-option ${selectedLine === 'ALL' ? 'active' : ''}`}
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => {
            triggerHaptic('light');
            setSelectedLine('ALL');
          }}
        >
          Todas ({filteredStations.length})
        </button>
        {activeMapLines.map((l) => (
          <button
            key={l.id}
            className={`segmented-option ${selectedLine === String(l.id) ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => {
              triggerHaptic('light');
              setSelectedLine(String(l.id));
            }}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Live Trains Indicator Pill */}
      <div
        style={{
          position: 'absolute',
          top: '64px',
          left: '14px',
          zIndex: 999,
          background: 'rgba(18, 18, 24, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(48, 209, 88, 0.3)',
          borderRadius: '20px',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          fontSize: '11px',
          fontWeight: 700,
          color: '#ffffff',
        }}
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#30d158', animation: 'pulse-ring 1.6s infinite' }}></div>
        <span>{filteredTrains.length} trenes circulando en vivo</span>
      </div>

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '16px',
          zIndex: 999,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(18, 18, 24, 0.9)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#0a84ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          cursor: 'pointer',
        }}
        title="Centrar en mi ubicación"
      >
        <Navigation size={20} />
      </button>

      {/* Leaflet Dark Theme Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <ChangeMapView center={mapCenter} zoom={mapZoom} />

        {/* High-definition OpenStreetMap tiles with Apple Dark Mode styling */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-osm-tiles"
        />

        {/* User Location Pin */}
        <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
          <Popup className="ios-popup">
            <div style={{ padding: '4px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--ios-text-primary, #ffffff)' }}>Estás aquí</div>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                {userCoords.name || 'Ubicación actual'}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Active Circulating Trains on the Network */}
        {filteredTrains.map((train) => {
          const line = LINES_DATA.find((l) => l.id === train.lineId);
          return (
            <Marker
              key={train.id}
              position={[train.lat, train.lng]}
              icon={createNetworkTrainIcon(line?.color)}
            >
              <Popup className="ios-popup">
                <div style={{ padding: '6px', minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ios-text-primary, #ffffff)' }}>
                      Tren #{train.number}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: 'rgba(48, 209, 88, 0.15)',
                      color: '#30d158',
                      padding: '2px 7px',
                      borderRadius: '8px',
                      border: '1px solid rgba(48, 209, 88, 0.3)'
                    }}>
                      ⚡ {train.speed} km/h
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <LineBadge lineId={train.lineId} size="small" />
                    <span style={{ fontSize: '12px', color: 'var(--ios-text-primary, #ffffff)', fontWeight: 700 }}>
                      Desde {train.origin} ➔ {train.destination}
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary, #8e8e93)', margin: '4px 0 8px', background: 'rgba(255,255,255,0.06)', padding: '5px 8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px' }}>📍</span>
                      <span>Próxima: <strong>{train.nextStation}</strong></span>
                    </div>
                    <div style={{ color: '#0a84ff', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                      Llega en ~{train.etaNextMin} min
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectTrain) {
                        const targetStation = findStationByName(train.nextStation, train.lineId);
                        onSelectTrain({
                          ...train,
                          stationName: train.nextStation,
                          stationId: targetStation?.id || train.stationId,
                          lineId: train.lineId,
                          servicio: train.servicio || {
                            numero: train.number,
                            lineId: train.lineId,
                            gerencia: { nombre: train.lineName },
                            desde: { estacion: { nombre: train.origin } },
                            hasta: { estacion: { nombre: train.destination } },
                            leyenda: train.status,
                          },
                          arribo: train.arribo || {
                            segundos: train.etaNextMin * 60,
                            anden: { nombre: '1' },
                          },
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(10, 132, 255, 0.4)',
                    }}
                  >
                    <span>🛰️ Seguimiento en Vivo</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Stations Pins */}
        {filteredStations.map((st) => {
          // Detect transfer stations sharing identical coordinates (e.g. Haedo, Empalme Lobos)
          // and offset them slightly (~25m) so both pins are distinctly visible and clickable
          const isTransferOverlap = filteredStations.some(
            (other) => other !== st && other.id === st.id && Math.abs(other.lat - st.lat) < 0.0001
          );
          const stLat = isTransferOverlap && st.lineId === 11 ? st.lat - 0.00025 : st.lat;
          const stLng = isTransferOverlap && st.lineId === 11 ? st.lng + 0.00025 : st.lng;
          const dist = getDistanceMeters(userCoords.lat, userCoords.lng, stLat, stLng);

          return (
            <Marker
              key={`st-${st.lineId}-${st.id}-${st.ramal || ''}`}
              position={[stLat, stLng]}
              icon={createStationIcon(st.lineId)}
            >
              <Popup>
                <div style={{ padding: '4px 2px', minWidth: '185px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--ios-text-primary, #ffffff)', marginBottom: '3px' }}>
                    {st.name}
                  </div>
                  {st.ramal && (
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '6px' }}>
                      Ramal {st.ramal}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 10px' }}>
                    <LineBadge lineId={st.lineId} size="small" />
                    <span style={{ fontSize: '11.5px', color: '#8e8e93', fontWeight: 600 }}>
                      A {formatDistance(dist)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      if (onOpenStationInfo) onOpenStationInfo(st);
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(10, 132, 255, 0.3)',
                    }}
                  >
                    <Info size={14} />
                    <span>Ver Arribos, Colectivos e Info</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      if (onSelectStation) onSelectStation(st);
                    }}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      background: 'rgba(10, 132, 255, 0.12)',
                      color: '#0a84ff',
                      border: '1px solid rgba(10, 132, 255, 0.25)',
                      borderRadius: '10px',
                      padding: '7px 12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Eye size={14} />
                    <span>Minimizar mapa y ver en Lista</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
