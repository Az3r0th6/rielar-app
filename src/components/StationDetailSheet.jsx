import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Star,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Shield,
  Bike,
  Compass,
  CreditCard,
  Building2,
  Bus,
  Train,
  ArrowRight,
  ExternalLink,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import LineBadge from './LineBadge';
import { getStationDetails } from '../data/stationDetailsData';
import { getStationArrivals } from '../api/sofseClient';
import { formatArrivalSeconds, getCountdownBadgeClass } from '../utils/time';
import { triggerHaptic } from '../utils/notifications';

export default function StationDetailSheet({
  station,
  onClose,
  onSelectTrain,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [activeTab, setActiveTab] = useState('services'); // 'services', 'multimodal', 'arrivals'
  const [arrivals, setArrivals] = useState([]);
  const [loadingArrivals, setLoadingArrivals] = useState(false);
  const [arrivalsError, setArrivalsError] = useState(false);
  const refreshIntervalRef = useRef(null);

  // Enriquecer la estación con los metadatos de servicios y colectivos
  const details = station ? getStationDetails(station) : null;

  // Consultar arribos en vivo si el usuario abre la pestaña o para mostrar preview
  useEffect(() => {
    if (!station?.id) return;

    let isMounted = true;

    const fetchArrivals = async () => {
      try {
        setLoadingArrivals(true);
        const data = await getStationArrivals(station.id, {}, true);
        if (isMounted) {
          const list = Array.isArray(data) ? data : (data?.results || data?.arribos || []);
          setArrivals(list);
          setArrivalsError(false);
        }
      } catch (err) {
        if (isMounted) {
          console.debug('Error fetching station arrivals:', err);
          setArrivalsError(true);
        }
      } finally {
        if (isMounted) setLoadingArrivals(false);
      }
    };

    fetchArrivals();
    refreshIntervalRef.current = setInterval(fetchArrivals, 15000);

    return () => {
      isMounted = false;
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [station?.id]);

  if (!station || !details) return null;

  const lat = station.lat || details.lat;
  const lng = station.lng || details.lng;
  const mapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '90%',
          background: 'linear-gradient(180deg, #1c1c24 0%, #121218 100%)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderBottom: 'none',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Pill Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '6px' }}>
          <div
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.3)',
            }}
          />
        </div>

        {/* Station Sheet Header */}
        <div
          style={{
            padding: '8px 18px 14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.3px',
                  wordBreak: 'break-word',
                }}
              >
                {details.name}
              </h2>
              <LineBadge lineId={station.lineId} size="small" />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#8e8e93',
                  whiteSpace: 'nowrap',
                }}
              >
                {details.zone || 'AMBA'}
              </span>
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#8e8e93',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap',
              }}
            >
              <span>{details.ramal || `Línea ${details.lineName}`}</span>
              <span>•</span>
              <span style={{ color: '#30d158', fontWeight: 600 }}>Operativa en tiempo real</span>
            </div>
          </div>

          {/* Action buttons (Favorite & Close) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onToggleFavorite && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onToggleFavorite(station);
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isFavorite ? 'rgba(255, 214, 10, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                  border: isFavorite ? '1px solid rgba(255, 214, 10, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: isFavorite ? '#ffd60a' : '#8e8e93',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              >
                <Star size={18} fill={isFavorite ? '#ffd60a' : 'none'} />
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#8e8e93',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            overflowX: 'auto',
          }}
        >
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => triggerHaptic('light')}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '9px 12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(10, 132, 255, 0.08))',
                border: '1px solid rgba(10, 132, 255, 0.35)',
                color: '#0a84ff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Navigation size={14} />
              <span>Cómo llegar (GPS)</span>
              <ExternalLink size={12} style={{ opacity: 0.7 }} />
            </a>
          )}

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('arrivals');
            }}
            style={{
              padding: '9px 14px',
              borderRadius: '12px',
              background: activeTab === 'arrivals' ? 'rgba(48, 209, 88, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: activeTab === 'arrivals' ? '1px solid rgba(48, 209, 88, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: activeTab === 'arrivals' ? '#30d158' : '#f5f5f7',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <Train size={14} />
            <span>Arribos en vivo ({arrivals.length})</span>
          </button>
        </div>

        {/* iOS Segmented Tabs */}
        <div style={{ padding: '10px 16px 6px' }}>
          <div
            className="ios-segmented-control"
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '3px',
              gap: '3px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('services');
              }}
              style={{
                flex: 1,
                minWidth: '96px',
                padding: '8px 8px',
                border: 'none',
                borderRadius: '9px',
                background: activeTab === 'services' ? '#ffffff' : 'transparent',
                color: activeTab === 'services' ? '#000000' : '#8e8e93',
                fontWeight: activeTab === 'services' ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              🎟️ Servicios
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('multimodal');
              }}
              style={{
                flex: 1,
                minWidth: '96px',
                padding: '8px 8px',
                border: 'none',
                borderRadius: '9px',
                background: activeTab === 'multimodal' ? '#ffffff' : 'transparent',
                color: activeTab === 'multimodal' ? '#000000' : '#8e8e93',
                fontWeight: activeTab === 'multimodal' ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              🚌 Colectivos
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('arrivals');
              }}
              style={{
                flex: 1,
                minWidth: '96px',
                padding: '8px 8px',
                border: 'none',
                borderRadius: '9px',
                background: activeTab === 'arrivals' ? '#ffffff' : 'transparent',
                color: activeTab === 'arrivals' ? '#000000' : '#8e8e93',
                fontWeight: activeTab === 'arrivals' ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              ⚡ En Vivo
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px calc(36px + env(safe-area-inset-bottom, 20px))',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* TAB 1: BOLETERÍA, SUBE, ACCESIBILIDAD Y SERVICIOS */}
          {activeTab === 'services' && (
            <>
              {/* Boletería y Carga SUBE */}
              <div
                className="ios-card"
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(10, 132, 255, 0.15)',
                        color: '#0a84ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                        Boletería y Carga SUBE
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                        {details.ticketing?.status || 'Atención habilitada'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: 'rgba(48, 209, 88, 0.15)',
                      color: '#30d158',
                      border: '1px solid rgba(48, 209, 88, 0.3)',
                    }}
                  >
                    Activa
                  </span>
                </div>

                {/* Horarios discriminados */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#8e8e93', flexShrink: 0 }}>Lunes a Viernes</span>
                    <strong style={{ color: '#ffffff', textAlign: 'right', wordBreak: 'break-word' }}>{details.ticketing?.weekdays}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#8e8e93', flexShrink: 0 }}>Sábados</span>
                    <strong style={{ color: '#ffffff', textAlign: 'right', wordBreak: 'break-word' }}>{details.ticketing?.saturdays}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: '#8e8e93', flexShrink: 0 }}>Domingos y Feriados</span>
                    <strong style={{ color: '#ffffff', textAlign: 'right', wordBreak: 'break-word' }}>{details.ticketing?.sundays}</strong>
                  </div>
                </div>

                {/* SUBE TAS feature */}
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(10, 132, 255, 0.08)',
                    border: '1px solid rgba(10, 132, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <CreditCard size={18} style={{ color: '#0a84ff', flexShrink: 0 }} />
                  <div style={{ fontSize: '11.5px', color: '#c7c7cc', lineHeight: 1.35 }}>
                    <strong style={{ color: '#ffffff' }}>Terminal Automática SUBE (TAS):</strong>{' '}
                    {details.ticketing?.subeTas
                      ? `Disponible (${details.ticketing.subeTasCount || 2} terminales) para acreditar recargas electrónicas y consultar saldo.`
                      : 'Consultar en ventanilla de boletería.'}
                  </div>
                </div>

                {details.ticketing?.notes && (
                  <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '8px', fontStyle: 'italic' }}>
                    ℹ️ {details.ticketing.notes}
                  </div>
                )}
              </div>

              {/* Pase Libre CUD & Beneficios Sociales */}
              <div
                className="ios-card"
                style={{
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.12) 0%, rgba(20, 20, 26, 0.95) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(48, 209, 88, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>♿</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                      Pase Libre con CUD & Beneficios
                    </div>
                    <div style={{ fontSize: '11px', color: '#30d158', fontWeight: 600 }}>
                      Viajes 100% gratuitos por Ley 22.431
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#c7c7cc', lineHeight: 1.4 }}>
                  Las personas con <strong>CUD</strong> (formato papel o digital en <strong>Mi Argentina</strong>) y su acompañante (si lo indica) viajan <strong>gratis</strong> presentando DNI en molinetes. También podés tramitar el Pase Libre en tu tarjeta SUBE.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#ffd60a', fontWeight: 600 }}>
                  <span>👵 Jubilados: 55% de descuento en SUBE (Tarifa Social)</span>
                </div>
              </div>

              {/* Accesibilidad PMR */}
              <div
                className="ios-card"
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'rgba(48, 209, 88, 0.15)',
                      color: '#30d158',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>♿</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                      Accesibilidad para Movilidad Reducida
                    </div>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                      Ingresos adaptados, andenes y señalética
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.accessibility?.ramps ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: details.accessibility?.ramps ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: details.accessibility?.ramps ? '#30d158' : '#8e8e93',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Rampas PMR</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.accessibility?.elevatedPlatforms ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: details.accessibility?.elevatedPlatforms ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: details.accessibility?.elevatedPlatforms ? '#30d158' : '#8e8e93',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Andén elevado</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.accessibility?.accessibleTurnstiles ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: details.accessibility?.accessibleTurnstiles ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: details.accessibility?.accessibleTurnstiles ? '#30d158' : '#8e8e93',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Molinete ancho</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.accessibility?.elevators ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: details.accessibility?.elevators ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: details.accessibility?.elevators ? '#30d158' : '#8e8e93',
                      fontWeight: 600,
                    }}
                  >
                    {details.accessibility?.elevators ? <CheckCircle2 size={14} /> : <span>–</span>}
                    <span>{details.accessibility?.elevators ? 'Ascensores' : 'En nivel plano'}</span>
                  </div>
                </div>

                {details.accessibility?.notes && (
                  <div style={{ fontSize: '11px', color: '#8e8e93', lineHeight: 1.4 }}>
                    {details.accessibility.notes}
                  </div>
                )}
              </div>

              {/* Servicios e Infraestructura */}
              <div
                className="ios-card"
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'rgba(255, 159, 10, 0.15)',
                      color: '#ff9f0a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                      Servicios y Equipamiento
                    </div>
                    <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                      Comodidades en estación
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.services?.bathrooms ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#ffffff',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>🚻</span>
                    <span>Baños públicos</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.services?.wifi ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#ffffff',
                    }}
                  >
                    <Wifi size={14} style={{ color: '#0a84ff' }} />
                    <span>Wi-Fi gratuito</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.services?.bikeParking ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#ffffff',
                    }}
                  >
                    <Bike size={14} style={{ color: '#30d158' }} />
                    <span>Bicicleteros</span>
                  </div>

                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: details.services?.security ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#ffffff',
                    }}
                  >
                    <Shield size={14} style={{ color: '#ffd60a' }} />
                    <span>Seguridad / SOS</span>
                  </div>
                </div>

                {details.services?.notes && (
                  <div style={{ fontSize: '11px', color: '#8e8e93', lineHeight: 1.4 }}>
                    {details.services.notes}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: COLECTIVOS Y COMBINACIONES MULTIMODALES */}
          {activeTab === 'multimodal' && (
            <>
              {/* Combinaciones con Subte y Premetro si existen */}
              {details.multimodal?.subway && details.multimodal.subway.length > 0 && (
                <div
                  className="ios-card"
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                    🚇 Combinación con Subte y Premetro
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {details.multimodal.subway.map((sub, idx) => {
                      const isPremetro = (sub.line || '').toLowerCase().includes('premetro');
                      const badgeLabel = isPremetro ? 'P' : (sub.line || '').replace('Línea ', '');
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: isPremetro ? '8px' : '50%',
                                background: sub.color || '#0070ba',
                                color: sub.textColor || '#ffffff',
                                fontWeight: 900,
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                              }}
                            >
                              {badgeLabel}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                                {sub.line}
                              </div>
                              <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                                Hacia {sub.destination}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#30d158' }}>
                            Conectado
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metrobus y Centros de Transbordo */}
              {details.multimodal?.metrobus && details.multimodal.metrobus.length > 0 && (
                <div
                  className="ios-card"
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                    🚏 Metrobus y Centro de Transbordo
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {details.multimodal.metrobus.map((mb, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '10px',
                          background: 'rgba(255, 159, 10, 0.15)',
                          color: '#ff9f0a',
                          border: '1px solid rgba(255, 159, 10, 0.3)',
                        }}
                      >
                        {mb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conexiones con otros trenes y ramales */}
              {details.multimodal?.trainTransfers && details.multimodal.trainTransfers.length > 0 && (
                <div
                  className="ios-card"
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#ffffff',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Train size={17} style={{ color: '#8ac53f' }} />
                    <span>Conexión con otros trenes y ramales</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {details.multimodal.trainTransfers.map((transfer, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '9px 12px',
                          borderRadius: '12px',
                          background: 'rgba(138, 197, 63, 0.08)',
                          border: '1px solid rgba(138, 197, 63, 0.25)',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px' }}>🚆</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f5f5f7', lineHeight: 1.3 }}>
                            {transfer}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: '#8ac53f',
                            background: 'rgba(138, 197, 63, 0.16)',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            flexShrink: 0,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Transbordo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Líneas de Colectivos Cercanas */}
              <div
                className="ios-card"
                style={{
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bus size={18} style={{ color: '#0a84ff' }} />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>
                      Líneas de Colectivos
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600 }}>
                    {details.multimodal?.busLines?.length || 0} líneas cercanas
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {details.multimodal?.busLines?.map((lineNum) => (
                    <div
                      key={lineNum}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '40px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {lineNum}
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '6px' }}>
                  Paradas ubicadas en el perímetro de la estación y calles adyacentes.
                </div>
              </div>
            </>
          )}

          {/* TAB 3: PRÓXIMOS TRENES EN VIVO */}
          {activeTab === 'arrivals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 4px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93' }}>
                  Trenes en tiempo real hacia andén:
                </span>
                {loadingArrivals && (
                  <span style={{ fontSize: '11px', color: '#0a84ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RotateCw size={11} className="animate-spin" /> Actualizando...
                  </span>
                )}
              </div>

              {arrivals.length === 0 ? (
                <div
                  style={{
                    padding: '30px 16px',
                    textAlign: 'center',
                    color: '#8e8e93',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <Train size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {loadingArrivals
                      ? 'Consultando trenes en circulación...'
                      : 'No hay arribos reportados en este momento.'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                    Revisá el cronograma habitual o consultá nuevamente en unos minutos.
                  </div>
                </div>
              ) : (
                arrivals.map((train, idx) => {
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

                  return (
                    <div
                      key={idx}
                      className="arrival-row"
                      onClick={() => {
                        triggerHaptic('light');
                        if (onSelectTrain) {
                          onSelectTrain({
                            ...train,
                            stationName: station.name,
                            stationId: station.id,
                          });
                          onClose();
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px' }}>{isTowardsCABA ? '🏙️' : '🌲'}</span>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: '#ffffff', wordBreak: 'break-word' }}>
                            {dest}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              background: isTowardsCABA ? 'rgba(10, 132, 255, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                              color: isTowardsCABA ? '#0a84ff' : '#30d158',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isTowardsCABA ? 'A Retiro/CABA' : 'A Provincia'}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>Andén {platform}</span>
                          {train.servicio?.numero && <span>• Tren #{train.servicio.numero}</span>}
                          <span>• Desde {origin}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <div className={`countdown-badge ${badgeClass}`} style={{ fontSize: '13px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                          {formatArrivalSeconds(seconds)}
                        </div>
                        <span style={{ fontSize: '10px', color: '#0a84ff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Rastrear ➔
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
