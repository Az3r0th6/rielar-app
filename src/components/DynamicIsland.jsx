import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Bell, X, Navigation } from 'lucide-react';
import { formatArrivalSeconds } from '../utils/time';
import LineBadge from './LineBadge';

export default function DynamicIsland({ trackingTrain, onClearTracking, onOpenDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!trackingTrain) {
    // Idle / camera sensor pill
    return (
      <div className="dynamic-island-container">
        <div className="dynamic-island compact" style={{ width: '120px', height: '32px' }}>
          <div className="pill-left">
            <span style={{ fontSize: '12px' }}>🚆</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#8e8e93' }}>SOFSE Live</span>
          </div>
          <div className="pill-right">
            <div className="live-pulse-dot" style={{ width: '5px', height: '5px' }} />
          </div>
        </div>
      </div>
    );
  }

  const { servicio, arribo, stationName } = trackingTrain;
  const destination =
    servicio?.hasta?.estacion?.nombre ||
    servicio?.estaciones?.[servicio.estaciones.length - 1]?.nombre ||
    servicio?.ramal?.cabeceraFinal?.nombre ||
    'Destino';
  const seconds = arribo?.segundos ?? 180;
  const platform = arribo?.anden?.nombre || '1';

  return (
    <div className="dynamic-island-container">
      <div
        className={`dynamic-island ${isExpanded ? 'expanded' : 'compact'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {!isExpanded ? (
          <>
            <div className="pill-left">
              <span style={{ fontSize: '13px' }}>🚆</span>
              <span style={{ fontSize: '11.5px', fontWeight: 700, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {destination}
              </span>
            </div>
            <div className="pill-right">
              <span>{formatArrivalSeconds(seconds)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="expanded-header">
              <div className="expanded-train-info">
                <LineBadge lineName={servicio?.gerencia?.nombre} size="small" />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>{destination}</div>
                  <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                    Estación {stationName} • Andén {platform}
                  </div>
                </div>
              </div>
              <button
                className="close-round-btn"
                style={{ width: '24px', height: '24px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClearTracking();
                }}
              >
                <X size={13} />
              </button>
            </div>

            <div className="expanded-progress-bar">
              <div
                className="expanded-progress-fill"
                style={{
                  width: `${Math.max(10, Math.min(100, 100 - (seconds / 900) * 100))}%`,
                }}
              />
            </div>

            <div className="expanded-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span className="live-pulse-dot" />
                <span style={{ fontWeight: 700, color: '#30d158' }}>
                  Llega en {formatArrivalSeconds(seconds)}
                </span>
              </div>
              <button
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenDetails) onOpenDetails(trackingTrain);
                }}
              >
                Ver paradas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
