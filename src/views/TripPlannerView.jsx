import React, { useState, useEffect } from 'react';
import {
  ArrowUpDown,
  Search,
  Clock,
  Navigation,
  ArrowRight,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import { getStationArrivals } from '../api/sofseClient';
import LineBadge from '../components/LineBadge';
import { formatArrivalSeconds, formatLocalTime } from '../utils/time';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function TripPlannerView({ onSelectTrain }) {
  const [originId, setOriginId] = useState('332'); // Default Retiro (Mitre)
  const [destId, setDestId] = useState('389'); // Default Tigre
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSwap = () => {
    triggerHaptic('medium');
    const temp = originId;
    setOriginId(destId);
    setDestId(temp);
  };

  const handleSearch = async () => {
    triggerHaptic('medium');
    playChimeSound('click');
    setLoading(true);
    setHasSearched(true);
    try {
      // Query SOFSE arrivals with hasta parameter
      const data = await getStationArrivals(originId, {
        hasta: destId,
        cantidad: 6,
      });
      const arrivals = Array.isArray(data)
        ? data
        : data?.results || data?.arribos || [];
      setResults(Array.isArray(arrivals) ? arrivals : []);
    } catch (err) {
      console.error('Error planning trip:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Second-by-second countdown decrementer for Trip Planner results
  useEffect(() => {
    if (!results.length) return;
    const timer = setInterval(() => {
      setResults((prev) =>
        prev.map((t) => {
          const sec = t?.arribo?.segundos;
          if (sec !== undefined && sec > 0) {
            return {
              ...t,
              arribo: { ...t.arribo, segundos: sec - 1 },
            };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [results.length]);

  const originStation = PRELOADED_STATIONS.find((s) => String(s.id) === String(originId));
  const destStation = PRELOADED_STATIONS.find((s) => String(s.id) === String(destId));

  const quickRoutes = [
    { fromId: '332', toId: '389', label: 'Retiro ➔ Tigre' },
    { fromId: '332', toId: '357', label: 'Retiro ➔ San Isidro' },
    { fromId: '293', toId: '278', label: 'Once ➔ Moreno' },
    { fromId: '93', toId: '217', label: 'Const. ➔ La Plata' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div>
          <h1 className="ios-large-title">Horarios</h1>
          <div className="ios-subtitle">
            <span className="ios-live-indicator">
              <span className="live-pulse-dot" />
              <span>Cronograma</span>
            </span>
            <span>• Origen y Destino</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Origin & Destination Card */}
        <div className="ios-card" style={{ padding: '16px' }}>
          {/* Origin Picker */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase' }}>
              Punto de Partida
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0a84ff' }} />
              <select
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#f5f5f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {PRELOADED_STATIONS.map((st, idx) => (
                  <option key={`${st.id}-${st.ramal || ''}-${idx}`} value={st.id} style={{ background: '#1c1c20' }}>
                    {st.name} {st.ramal ? `(${st.ramal})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
            <button
              onClick={handleSwap}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#0a84ff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Invertir origen y destino"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Destination Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase' }}>
              Estación de Llegada
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#30d158' }} />
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#f5f5f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {PRELOADED_STATIONS.map((st, idx) => (
                  <option key={`${st.id}-${st.ramal || ''}-${idx}`} value={st.id} style={{ background: '#1c1c20' }}>
                    {st.name} {st.ramal ? `(${st.ramal})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Action Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            style={{
              width: '100%',
              background: '#0a84ff',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(10,132,255,0.4)',
            }}
          >
            {loading ? (
              <RotateCw size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            <span>Consultar Servicios</span>
          </button>
        </div>

        {/* Quick Route Pills */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '8px' }}>
            Rutas Frecuentes
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {quickRoutes.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  triggerHaptic('light');
                  setOriginId(r.fromId);
                  setDestId(r.toId);
                }}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  color: '#f5f5f7',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div>
          {hasSearched && (
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#8e8e93', marginBottom: '10px' }}>
              Próximas salidas directas: {results.length}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#8e8e93' }}>
              <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0a84ff' }} />
              <div>Buscando conexiones y horarios...</div>
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="ios-card" style={{ textAlign: 'center', padding: '24px', color: '#8e8e93' }}>
              <div>No hay servicios directos programados entre estas dos estaciones en este momento.</div>
            </div>
          ) : (
            results.map((train, idx) => {
              if (!train) return null;
              const seconds = train.arribo?.segundos;
              const platform = train.arribo?.anden?.nombre || '1';
              const departureTime = formatLocalTime(train.arribo?.salida?.programada);
              const trainNum = train.servicio?.numero;

              return (
                <div
                  key={idx}
                  className="ios-card"
                  style={{ cursor: 'pointer', marginBottom: '10px' }}
                  onClick={() => {
                    triggerHaptic('light');
                    if (onSelectTrain) {
                      onSelectTrain({
                        ...train,
                        stationName: originStation?.name || 'Origen',
                        stationId: originId,
                      });
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#f5f5f7' }}>
                          Salida {departureTime}
                        </span>
                        <span className="platform-badge">Andén {platform}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '3px' }}>
                        Hacia {train.servicio?.hasta?.estacion?.nombre ||
                          train.servicio?.estaciones?.[train.servicio.estaciones.length - 1]?.nombre ||
                          train.servicio?.ramal?.cabeceraFinal?.nombre ||
                          'Destino'} • Tren #{trainNum}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#30d158' }}>
                        {formatArrivalSeconds(seconds)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                        Ver detalles ›
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
