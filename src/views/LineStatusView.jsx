import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCw,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
  XCircle,
  AlertCircle,
  Construction,
  ArrowRight,
  ExternalLink,
  Trash2,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  GitBranch,
  MapPin,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { getNetworkStatus } from '../api/sofseClient';
import LineBadge from '../components/LineBadge';
import { SofseLivePill } from '../components/DynamicIsland';
import LastTrainsSection from '../components/LastTrainsSection';
import RideAffiliateCard from '../components/RideAffiliateCard';
import SwipeableAlertCard from '../components/SwipeableAlertCard';
import { triggerHaptic, playChimeSound, sendAppNotification, requestNotificationPermission } from '../utils/notifications';
import { safeLocalStorage } from '../utils/safeStorage';
import {
  getAlertKey,
  dismissAlert,
  dismissAllAlerts,
  markAlertsAsRead,
  restoreDismissedAlerts,
  getDismissedAlertKeys,
  ALERTS_CHANGED_EVENT,
} from '../utils/alertManager';
import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';

// Mapeo oficial de terminales para cada ramal del AMBA
const RAMAL_TERMINALS = {
  // Mitre
  'Retiro - Tigre': { originId: 332, destId: 389, terminals: 'Retiro • Tigre' },
  'Retiro - J.L. Suárez': { originId: 332, destId: 385, terminals: 'Retiro • San Martín • Suárez' },
  'Retiro - Bartolomé Mitre': { originId: 332, destId: 395, terminals: 'Retiro • Belgrano • Mitre' },
  'Victoria - Capilla del Señor': { originId: 391, destId: 407, terminals: 'Victoria • Matheu • Capilla del Señor' },
  'Villa Ballester - Zárate': { originId: 384, destId: 418, terminals: 'Ballester • Escobar • Zárate' },

  // Sarmiento
  'Once - Moreno': { originId: 1, destId: 16, terminals: 'Once • Morón • Moreno' },
  'Moreno - Mercedes': { originId: 16, destId: 29, terminals: 'Moreno • Luján • Mercedes' },
  'Merlo - Lobos': { originId: 12, destId: 32, terminals: 'Merlo • Marcos Paz • Lobos' },
  'Once - Bragado': { originId: 1, destId: 29, terminals: 'Once • Mercedes • Chivilcoy • Bragado' },

  // Roca
  'Plaza Constitución - La Plata': { originId: 45, destId: 63, terminals: 'Constitución • Quilmes • La Plata' },
  'Plaza Constitución - Ezeiza': { originId: 45, destId: 104, terminals: 'Constitución • Temperley • Ezeiza' },
  'Plaza Constitución - Alejandro Korn': { originId: 45, destId: 80, terminals: 'Constitución • Burzaco • A. Korn' },
  'Plaza Constitución - Bosques (vía Quilmes)': { originId: 45, destId: 147, terminals: 'Constitución • Quilmes • Bosques' },
  'Plaza Constitución - Bosques (vía Temperley)': { originId: 45, destId: 147, terminals: 'Constitución • Temperley • Bosques' },
  'Ezeiza - Cañuelas': { originId: 104, destId: 114, terminals: 'Ezeiza • Spegazzini • Cañuelas' },
  'Temperley - Haedo': { originId: 75, destId: 8, terminals: 'Temperley • San Justo • Haedo' },

  // San Martín
  'Retiro - Pilar': { originId: 236, destId: 254, terminals: 'Retiro • Caseros • San Miguel • Pilar' },
  'Retiro - Dr. Cabred': { originId: 236, destId: 256, terminals: 'Retiro • Pilar • Dr. Cabred' },
  'Retiro - Junín': { originId: 236, destId: 256, terminals: 'Retiro • Mercedes • Junín' },

  // Belgrano Sur
  'Dr. A. Sáenz - González Catán': { originId: 198, destId: 219, terminals: 'Sáenz • Tapiales • G. Catán' },
  'Dr. A. Sáenz - Marinos del Crucero General Belgrano': { originId: 198, destId: 234, terminals: 'Sáenz • Tapiales • Marinos' },
  'González Catán - Marcos Paz': { originId: 219, destId: 270, terminals: 'G. Catán • 20 de Junio • Marcos Paz' },
  'González Catán - Navarro': { originId: 219, destId: 270, terminals: 'G. Catán • Marcos Paz • Navarro' },

  // Tren de la Costa
  'Maipú - Delta': { originId: 421, destId: 431, terminals: 'Maipú (Olivos) • San Isidro • Delta (Tigre)' },
};

function formatRamalLabel(raw) {
  if (!raw) return 'Ramal Principal';
  return raw
    .replace(' - ', ' ⇄ ')
    .replace('Plaza Constitución', 'Constitución')
    .replace('Dr. A. Sáenz', 'Sáenz')
    .replace('Marinos del Crucero General Belgrano', 'Marinos C. G. Belgrano');
}

export default function LineStatusView({ onNavigateToPlanner }) {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'incidents' | 'last_trains'

  // Filtros de organización por Ramales y Línea
  const [selectedLineFilter, setSelectedLineFilter] = useState('ALL'); // 'ALL' | 'Mitre' | 'Sarmiento' | 'Roca' | 'San Martín' | 'Belgrano Sur' | 'Tren de la Costa'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ALERTS' | 'NORMAL'
  const [searchFilter, setSearchFilter] = useState('');

  // Control de desglose interactivo de tarjetas de ramales
  const [expandedRamalIds, setExpandedRamalIds] = useState(new Set());

  const [dismissedKeys, setDismissedKeys] = useState(() => getDismissedAlertKeys());
  const [subscribedLines, setSubscribedLines] = useState(() => {
    try {
      return JSON.parse(safeLocalStorage.getItem('subscribed_lines') || '[]');
    } catch {
      return [];
    }
  });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getNetworkStatus();
      setNetworkData(data);
    } catch (err) {
      console.error('Error fetching network status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  // Sincronizar alertas descartadas
  useEffect(() => {
    const handleSync = () => {
      setDismissedKeys(getDismissedAlertKeys());
    };
    window.addEventListener(ALERTS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handleSync);
  }, []);

  const handleToggleSubscribe = async (lineId, lineName) => {
    triggerHaptic('medium');
    const isSubscribed = subscribedLines.includes(lineId);
    let updated;
    if (isSubscribed) {
      updated = subscribedLines.filter((id) => id !== lineId);
    } else {
      updated = [...subscribedLines, lineId];
      // Explicitly request notification permission during this user tap
      await requestNotificationPermission();
      sendAppNotification(
        `Alertas activadas • Línea ${lineName}`,
        `Recibirás avisos inmediatos ante demoras, obras o cancelaciones en la línea ${lineName}.`,
        { type: 'alert' }
      );
    }
    setSubscribedLines(updated);
    try {
      safeLocalStorage.setItem('subscribed_lines', JSON.stringify(updated));
    } catch {}
  };

  const toggleExpandRamal = (ramalKey) => {
    triggerHaptic('light');
    setExpandedRamalIds((prev) => {
      const next = new Set(prev);
      if (next.has(ramalKey)) {
        next.delete(ramalKey);
      } else {
        next.add(ramalKey);
      }
      return next;
    });
  };

  const toggleExpandAll = (ramalKeys) => {
    triggerHaptic('medium');
    setExpandedRamalIds((prev) => {
      if (prev.size >= ramalKeys.length) {
        return new Set();
      }
      return new Set(ramalKeys);
    });
  };

  const summary = networkData?.summary || {
    totalLines: 6,
    totalBranches: 27,
    activeAlertsCount: 0,
    criticalCount: 0,
    criticalIncidents: [],
  };

  // Líneas operativas de AMBA
  const lines = (networkData?.lines || []).filter((l) => l.id !== 501);
  const allCriticalIncidents = summary.criticalIncidents || [];
  const activeIncidents = allCriticalIncidents.filter((inc) => !dismissedKeys.has(getAlertKey(inc)));

  // Marcar alertas como leídas al verlas
  useEffect(() => {
    if (activeIncidents.length > 0) {
      markAlertsAsRead(activeIncidents);
    }
  }, [networkData]);

  const handleDismissIncident = (incident) => {
    dismissAlert(incident);
  };

  const handleDismissAll = () => {
    triggerHaptic('success');
    playChimeSound('success');
    dismissAllAlerts(activeIncidents);
  };

  const handleRestoreDismissed = () => {
    triggerHaptic('medium');
    playChimeSound('click');
    restoreDismissedAlerts();
  };

  const getAlertBadge = (type) => {
    switch (type) {
      case 'CANCELACIÓN':
        return { bg: 'rgba(255, 69, 58, 0.15)', border: '#ff453a', color: '#ff453a', icon: XCircle, label: 'Cancelación' };
      case 'RECORRIDO REDUCIDO':
        return { bg: 'rgba(255, 159, 10, 0.15)', border: '#ff9f0a', color: '#ff9f0a', icon: AlertTriangle, label: 'Recorrido Reducido' };
      case 'DEMORA':
        return { bg: 'rgba(255, 214, 10, 0.15)', border: '#ffd60a', color: '#ffd60a', icon: Clock, label: 'Demora' };
      case 'OBRAS EN VÍA':
        return { bg: 'rgba(10, 132, 255, 0.15)', border: '#0a84ff', color: '#0a84ff', icon: Construction, label: 'Obras' };
      default:
        return { bg: 'rgba(142, 142, 147, 0.15)', border: '#8e8e93', color: '#8e8e93', icon: Info, label: 'Aviso' };
    }
  };

  // LISTADO CONSOLIDADO Y SUBDIVIDIDO POR RAMALES
  const allRamales = useMemo(() => {
    const list = [];
    lines.forEach((line) => {
      const branches = line.branches || [];
      branches.forEach((b, bIdx) => {
        const rawAlerts = b.alerta || [];
        const activeBranchAlerts = rawAlerts.filter((a) => !dismissedKeys.has(getAlertKey(a)));

        let status = {
          code: 'NORMAL',
          text: 'Servicio Normal',
          color: '#30d158',
          bg: 'rgba(48, 209, 88, 0.14)',
          border: 'rgba(48, 209, 88, 0.35)',
          icon: CheckCircle,
        };

        if (activeBranchAlerts.length > 0) {
          const hasCancel = activeBranchAlerts.some((a) =>
            (a.contenido || '').toLowerCase().includes('cancel') || (a.contenido || '').toLowerCase().includes('interrump')
          );
          const hasReduced = activeBranchAlerts.some((a) =>
            (a.contenido || '').toLowerCase().includes('reducido') || (a.contenido || '').toLowerCase().includes('limitado')
          );
          const hasDelay = activeBranchAlerts.some((a) =>
            (a.contenido || '').toLowerCase().includes('demor')
          );
          const hasWorks = activeBranchAlerts.some((a) =>
            (a.contenido || '').toLowerCase().includes('obra')
          );

          if (hasCancel) {
            status = {
              code: 'CANCEL',
              text: 'Interrumpido / Cancelado',
              color: '#ff453a',
              bg: 'rgba(255, 69, 58, 0.15)',
              border: '#ff453a',
              icon: XCircle,
            };
          } else if (hasReduced) {
            status = {
              code: 'REDUCED',
              text: 'Recorrido Reducido',
              color: '#ff9f0a',
              bg: 'rgba(255, 159, 10, 0.15)',
              border: '#ff9f0a',
              icon: AlertTriangle,
            };
          } else if (hasDelay) {
            status = {
              code: 'DELAY',
              text: 'Con Demoras',
              color: '#ffd60a',
              bg: 'rgba(255, 214, 10, 0.15)',
              border: '#ffd60a',
              icon: Clock,
            };
          } else if (hasWorks) {
            status = {
              code: 'WORKS',
              text: 'Obras en Vía',
              color: '#0a84ff',
              bg: 'rgba(10, 132, 255, 0.15)',
              border: '#0a84ff',
              icon: Construction,
            };
          } else {
            status = {
              code: 'ALERT',
              text: 'Aviso en Vía',
              color: '#ff9f0a',
              bg: 'rgba(255, 159, 10, 0.15)',
              border: '#ff9f0a',
              icon: AlertTriangle,
            };
          }
        }

        const ramalKey = `${line.id}_${b.id || bIdx}_${b.nombre}`;
        const terminalsInfo = RAMAL_TERMINALS[b.nombre] || {};

        list.push({
          key: ramalKey,
          id: b.id || bIdx,
          nombre: b.nombre,
          formattedName: formatRamalLabel(b.nombre),
          lineId: line.id,
          lineName: line.nombre,
          es_electrico: b.es_electrico,
          estacionesCount: b.estaciones || 15,
          status,
          activeAlerts: activeBranchAlerts,
          rawAlerts,
          terminalsInfo,
        });
      });
    });

    return list;
  }, [lines, dismissedKeys]);

  // Filtrado de ramales por Línea, Estado y Búsqueda
  const filteredRamales = useMemo(() => {
    return allRamales.filter((ramal) => {
      // 1. Filtro por Línea
      if (selectedLineFilter !== 'ALL' && !ramal.lineName?.toLowerCase().includes(selectedLineFilter.toLowerCase())) {
        return false;
      }

      // 2. Filtro por Estado
      if (statusFilter === 'ALERTS' && ramal.status.code === 'NORMAL') {
        return false;
      }
      if (statusFilter === 'NORMAL' && ramal.status.code !== 'NORMAL') {
        return false;
      }

      // 3. Filtro por Búsqueda
      if (searchFilter) {
        const q = searchFilter.toLowerCase().trim();
        const matchName = ramal.nombre?.toLowerCase().includes(q);
        const matchFormatted = ramal.formattedName?.toLowerCase().includes(q);
        const matchLine = ramal.lineName?.toLowerCase().includes(q);
        const matchAlert = ramal.activeAlerts.some((a) => (a.contenido || '').toLowerCase().includes(q));
        const matchTerminals = (ramal.terminalsInfo.terminals || '').toLowerCase().includes(q);
        if (!matchName && !matchFormatted && !matchLine && !matchAlert && !matchTerminals) {
          return false;
        }
      }

      return true;
    });
  }, [allRamales, selectedLineFilter, statusFilter, searchFilter]);

  // Contadores para resumen
  const alertRamalesCount = useMemo(() => {
    return allRamales.filter((r) => r.status.code !== 'NORMAL').length;
  }, [allRamales]);

  const normalRamalesCount = allRamales.length - alertRamalesCount;

  // Obtener estaciones que pertenecen a un ramal
  const getStationsListForRamal = (ramalName, lineName) => {
    if (!ramalName) return [];
    const norm = ramalName.toLowerCase();
    const list = PRELOADED_STATIONS.filter((s) => {
      if (lineName && s.lineName?.toLowerCase() !== lineName.toLowerCase()) return false;
      if (s.ramal && (norm.includes(s.ramal.toLowerCase()) || s.ramal.toLowerCase().includes(norm))) {
        return true;
      }
      return false;
    });

    if (list.length > 0) return list;

    // Fallback: estaciones de la línea
    if (lineName) {
      return PRELOADED_STATIONS.filter((s) => s.lineName?.toLowerCase() === lineName.toLowerCase()).slice(0, 10);
    }
    return [];
  };

  const handleGoToPlanner = (ramal) => {
    triggerHaptic('medium');
    playChimeSound('click');
    if (!onNavigateToPlanner) return;

    const term = ramal.terminalsInfo;
    if (term?.originId && term?.destId) {
      onNavigateToPlanner(term.originId, term.destId, 'departures');
    } else {
      // Buscar estaciones asociadas
      const stations = getStationsListForRamal(ramal.nombre, ramal.lineName);
      if (stations.length >= 2) {
        onNavigateToPlanner(stations[0].id, stations[stations.length - 1].id, 'departures');
      } else {
        onNavigateToPlanner(null, null, 'departures');
      }
    }
  };

  const handleGoToGrid = (ramal) => {
    triggerHaptic('medium');
    playChimeSound('click');
    if (!onNavigateToPlanner) return;

    const term = ramal.terminalsInfo;
    if (term?.originId && term?.destId) {
      onNavigateToPlanner(term.originId, term.destId, 'grid');
    } else {
      onNavigateToPlanner(null, null, 'grid');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div className="ios-header-text">
          <h1 className="ios-large-title">Estado de Red</h1>
          <div className="ios-subtitle">
            <span className="ios-live-indicator">
              <span className="live-pulse-dot" />
              <span>SOFSE Oficial</span>
            </span>
            <span>• Reporte operativo por ramales</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <SofseLivePill />
          <button
            className="fav-button"
            onClick={() => {
              triggerHaptic('light');
              fetchStatus();
            }}
            title="Actualizar estado completo"
            aria-label="Actualizar estado completo"
          >
            <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px 36px' }}>
        {/* Floating Status Summary Chips with direct access */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '10px',
            marginBottom: '6px',
            scrollbarWidth: 'none',
          }}
        >
          {alertRamalesCount > 0 ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                setStatusFilter('ALERTS');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '16px',
                background: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid #ff453a',
                color: '#ff453a',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <AlertCircle size={14} />
              <span>{alertRamalesCount} {alertRamalesCount === 1 ? 'ramal con aviso' : 'ramales con aviso'}</span>
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '16px',
                background: 'rgba(48, 209, 88, 0.14)',
                border: '1px solid rgba(48, 209, 88, 0.35)',
                color: '#30d158',
                fontSize: '12px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              <CheckCircle size={14} />
              <span>Red operando normalmente</span>
            </div>
          )}

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '16px',
              background: 'rgba(10, 132, 255, 0.12)',
              border: '1px solid rgba(10, 132, 255, 0.3)',
              color: '#0a84ff',
              fontSize: '12px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            <span>🚆 {allRamales.length} Ramales activos</span>
          </div>
        </div>

        {/* View Segmented Tabs */}
        <div className="ios-segmented-control" style={{ margin: '0 0 14px' }}>
          <button
            className={`segmented-option ${activeTab === 'lines' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('lines');
            }}
          >
            🚆 Ramales ({allRamales.length})
          </button>
          <button
            className={`segmented-option ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('incidents');
            }}
          >
            🚨 Alertas Activas ({activeIncidents.length})
          </button>
          <button
            className={`segmented-option ${activeTab === 'last_trains' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('last_trains');
            }}
          >
            🌙 Primer / Último Tren
          </button>
        </div>

        {/* TAB 1: SERVICIOS Y ESTADO ORGANIZADOS POR RAMAL EN TARJETAS */}
        {activeTab === 'lines' && (
          <div>
            {/* 1. Selector Superior de Líneas (Pills horizontales) */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} style={{ color: 'var(--ios-blue)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Filtrar por Línea:
                  </span>
                </div>

                {selectedLineFilter !== 'ALL' && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedLineFilter('ALL');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ios-blue)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  scrollbarWidth: 'none',
                }}
              >
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedLineFilter('ALL');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: selectedLineFilter === 'ALL' ? '1.5px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
                    background: selectedLineFilter === 'ALL' ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.12)',
                    color: selectedLineFilter === 'ALL' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🌐 Todas ({allRamales.length})
                </button>

                {LINES_DATA.filter((l) => l.id !== 501).map((line) => {
                  const isSel = selectedLineFilter.toLowerCase().includes(line.name.toLowerCase());
                  const lineRamales = allRamales.filter((r) => r.lineName?.toLowerCase().includes(line.name.toLowerCase()));
                  const lineHasAlert = lineRamales.some((r) => r.status.code !== 'NORMAL');

                  return (
                    <button
                      key={line.id}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedLineFilter(isSel ? 'ALL' : line.name);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: isSel ? `1.5px solid ${line.color}` : '1px solid var(--ios-separator)',
                        background: isSel ? `${line.color}22` : 'rgba(118, 118, 128, 0.12)',
                        color: isSel ? (line.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>{line.icon}</span>
                      <span>{line.name}</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          opacity: 0.8,
                          background: isSel ? `${line.color}33` : 'rgba(255,255,255,0.08)',
                          padding: '1px 5px',
                          borderRadius: '6px',
                        }}
                      >
                        {lineRamales.length}
                      </span>
                      {lineHasAlert && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff453a' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Filtro por Estado Operativo (Píldoras secundarias) */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('ALL');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: statusFilter === 'ALL' ? '1px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
                  background: statusFilter === 'ALL' ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: statusFilter === 'ALL' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Todos los estados ({allRamales.length})
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('ALERTS');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: statusFilter === 'ALERTS' ? '1px solid #ff9f0a' : '1px solid var(--ios-separator)',
                  background: statusFilter === 'ALERTS' ? 'rgba(255, 159, 10, 0.18)' : 'transparent',
                  color: statusFilter === 'ALERTS' ? '#ff9f0a' : 'var(--ios-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertTriangle size={12} />
                <span>Con demoras o alertas ({alertRamalesCount})</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setStatusFilter('NORMAL');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: statusFilter === 'NORMAL' ? '1px solid #30d158' : '1px solid var(--ios-separator)',
                  background: statusFilter === 'NORMAL' ? 'rgba(48, 209, 88, 0.18)' : 'transparent',
                  color: statusFilter === 'NORMAL' ? '#30d158' : 'var(--ios-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle size={12} />
                <span>Normales ({normalRamalesCount})</span>
              </button>
            </div>

            {/* 3. Buscador y Acción de Desglosar Todos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(118, 118, 128, 0.18)',
                  padding: '8px 12px',
                  borderRadius: '14px',
                }}
              >
                <Search size={15} style={{ color: 'var(--ios-text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Buscar ramal (ej. Tigre, Moreno, Ezeiza, Suárez...)"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ios-text-primary)',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {filteredRamales.length > 0 && (
                <button
                  onClick={() => toggleExpandAll(filteredRamales.map((r) => r.key))}
                  style={{
                    background: 'var(--ios-card-solid)',
                    border: '1px solid var(--ios-card-border)',
                    color: 'var(--ios-text-secondary)',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                  title={expandedRamalIds.size >= filteredRamales.length ? 'Colapsar todos los desgloses' : 'Desglosar todas las tarjetas'}
                >
                  {expandedRamalIds.size >= filteredRamales.length ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{expandedRamalIds.size >= filteredRamales.length ? 'Colapsar' : 'Desglosar'}</span>
                </button>
              )}
            </div>

            {/* 4. LISTADO DE TARJETAS DE RAMALES */}
            {filteredRamales.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: 'var(--ios-card)',
                  borderRadius: '20px',
                  border: '1px solid var(--ios-card-border)',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  No se encontraron ramales
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                  Probá ajustando la búsqueda o cambiando el filtro de línea.
                </div>
                <button
                  onClick={() => {
                    setSearchFilter('');
                    setSelectedLineFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: 'var(--ios-blue)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRamales.map((ramal) => {
                  const isExpanded = expandedRamalIds.has(ramal.key);
                  const StatusIcon = ramal.status.icon;
                  const hasAlerts = ramal.activeAlerts.length > 0;
                  const stations = getStationsListForRamal(ramal.nombre, ramal.lineName);

                  return (
                    <div
                      key={ramal.key}
                      className="ios-card"
                      style={{
                        margin: 0,
                        padding: '16px',
                        border: hasAlerts ? `1.5px solid ${ramal.status.border}` : '1px solid var(--ios-card-border)',
                        background: 'var(--ios-card)',
                        boxShadow: hasAlerts ? '0 4px 16px rgba(255, 69, 58, 0.15)' : 'var(--shadow-sm)',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {/* Encabezado Principal de la Tarjeta */}
                      <div
                        onClick={() => toggleExpandRamal(ramal.key)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <LineBadge lineId={ramal.lineId} lineName={ramal.lineName} size="small" />
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: 'var(--ios-text-secondary)',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                              }}
                            >
                              {ramal.es_electrico ? '⚡ Eléctrico' : '🚂 Diésel'}
                            </span>
                            {ramal.estacionesCount && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  color: 'var(--ios-text-secondary)',
                                }}
                              >
                                • {ramal.estacionesCount} estac.
                              </span>
                            )}
                          </div>

                          <h3
                            style={{
                              margin: '0 0 4px',
                              fontSize: '16px',
                              fontWeight: 800,
                              color: 'var(--ios-text-primary)',
                              letterSpacing: '-0.01em',
                              wordBreak: 'break-word',
                            }}
                          >
                            Ramal {ramal.formattedName}
                          </h3>

                          {/* Recorrido / Cabeceras */}
                          {ramal.terminalsInfo.terminals && (
                            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                              📍 {ramal.terminalsInfo.terminals}
                            </div>
                          )}
                        </div>

                        {/* Status Badge flotante */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: '12px',
                              background: ramal.status.bg,
                              border: `1px solid ${ramal.status.border}`,
                              color: ramal.status.color,
                              fontSize: '11.5px',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                            }}
                          >
                            <StatusIcon size={13} />
                            <span>{ramal.status.text}</span>
                          </span>

                          <button
                            className="fav-button"
                            style={{
                              width: '28px',
                              height: '28px',
                              color: subscribedLines.includes(ramal.lineId) ? '#0a84ff' : 'var(--ios-text-secondary)',
                              background: subscribedLines.includes(ramal.lineId) ? 'rgba(10,132,255,0.15)' : 'rgba(118, 118, 128, 0.1)',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSubscribe(ramal.lineId, ramal.lineName);
                            }}
                            title={subscribedLines.includes(ramal.lineId) ? 'Alertas activas para esta línea' : 'Suscribirse a alertas de esta línea'}
                          >
                            {subscribedLines.includes(ramal.lineId) ? <Bell size={13} /> : <BellOff size={13} />}
                          </button>
                        </div>
                      </div>

                      {/* Alerta Destacada en la Tarjeta (Preview si tiene alertas) */}
                      {hasAlerts && (
                        <div
                          style={{
                            marginTop: '12px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: 'rgba(255, 69, 58, 0.12)',
                            borderLeft: '4px solid #ff453a',
                            fontSize: '12.5px',
                            lineHeight: 1.45,
                            color: 'var(--ios-text-primary)',
                          }}
                        >
                          <div style={{ fontWeight: 800, color: '#ff453a', marginBottom: '3px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <AlertTriangle size={13} />
                            <span>Afectación oficial en el ramal</span>
                          </div>
                          <div>{ramal.activeAlerts[0]?.contenido}</div>
                        </div>
                      )}

                      {/* Barra de Toque para Desglosar / Ver Toda la Información */}
                      <button
                        onClick={() => toggleExpandRamal(ramal.key)}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '8px 10px',
                          borderRadius: '10px',
                          background: isExpanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--ios-separator)',
                          color: isExpanded ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>{isExpanded ? 'Ocultar información detallada' : 'Acceder y desglosar información completa'}</span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {/* SECCIÓN DESGLOSADA (ACCEDER Y DESGLOSAR) */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '14px',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--ios-separator)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                            animation: 'fadeIn 0.2s ease-out',
                          }}
                        >
                          {/* 1. Detalle Operacional y Alertas */}
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                              📋 Estado Operacional Detallado
                            </div>

                            {hasAlerts ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {ramal.activeAlerts.map((alt, aIdx) => (
                                  <div
                                    key={aIdx}
                                    style={{
                                      padding: '10px 12px',
                                      borderRadius: '10px',
                                      background: 'rgba(255, 69, 58, 0.1)',
                                      border: '1px solid rgba(255, 69, 58, 0.25)',
                                    }}
                                  >
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#ff453a', marginBottom: '4px' }}>
                                      {alt.titulo || 'Comunicado Oficial de Trenes Argentinos'}
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: 'var(--ios-text-primary)', lineHeight: 1.45 }}>
                                      {alt.contenido}
                                    </div>
                                    {(alt.vigencia_desde || alt.vigencia_hasta) && (
                                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                                        🕒 Vigencia: {alt.vigencia_desde ? `Desde ${alt.vigencia_desde}` : ''} {alt.vigencia_hasta ? `hasta ${alt.vigencia_hasta}` : ''}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  background: 'rgba(48, 209, 88, 0.08)',
                                  border: '1px solid rgba(48, 209, 88, 0.25)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <CheckCircle size={16} color="#30d158" style={{ flexShrink: 0 }} />
                                <div style={{ fontSize: '12.5px', color: 'var(--ios-text-primary)', lineHeight: 1.4 }}>
                                  El ramal circula de acuerdo con su cronograma habitual sin demoras ni interrupciones registradas por SOFSE.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2. Estaciones y Recorrido del Ramal */}
                          {stations.length > 0 && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                  🚉 Estaciones del Ramal ({stations.length})
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  gap: '6px',
                                  overflowX: 'auto',
                                  paddingBottom: '4px',
                                  scrollbarWidth: 'none',
                                }}
                              >
                                {stations.map((st, sIdx) => (
                                  <div
                                    key={st.id || sIdx}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      background: sIdx === 0 || sIdx === stations.length - 1 ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255,255,255,0.06)',
                                      border: sIdx === 0 || sIdx === stations.length - 1 ? '1px solid rgba(10, 132, 255, 0.35)' : '1px solid var(--ios-separator)',
                                      color: 'var(--ios-text-primary)',
                                      fontSize: '11.5px',
                                      fontWeight: sIdx === 0 || sIdx === stations.length - 1 ? 800 : 600,
                                      whiteSpace: 'nowrap',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    {(sIdx === 0 || sIdx === stations.length - 1) && <span>📍</span>}
                                    <span>{st.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Botones de Acción Directa para este Ramal */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                            <button
                              onClick={() => handleGoToPlanner(ramal)}
                              style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: '#0a84ff',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 3px 10px rgba(10, 132, 255, 0.3)',
                              }}
                            >
                              <Search size={14} />
                              <span>Ver Próximos Trenes</span>
                            </button>

                            <button
                              onClick={() => handleGoToGrid(ramal)}
                              style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--ios-separator)',
                                background: 'rgba(255,255,255,0.08)',
                                color: 'var(--ios-text-primary)',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              <Calendar size={14} />
                              <span>Grilla de Horarios</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FLOATING CRITICAL ALERTS */}
        {activeTab === 'incidents' && (
          <div>
            {/* Top Toolbar for Incidents: Clear all and restore options */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                {activeIncidents.length > 0
                  ? `${activeIncidents.length} aviso(s) operativo(s)`
                  : 'Sin avisos pendientes'}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {activeIncidents.length > 0 && (
                  <button
                    onClick={handleDismissAll}
                    style={{
                      background: 'rgba(255, 69, 58, 0.12)',
                      border: '1px solid rgba(255, 69, 58, 0.3)',
                      color: '#ff453a',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Descartar y limpiar todos los avisos"
                  >
                    <Trash2 size={13} />
                    <span>Limpiar avisos</span>
                  </button>
                )}

                {dismissedKeys.size > 0 && (
                  <button
                    onClick={handleRestoreDismissed}
                    style={{
                      background: 'rgba(118, 118, 128, 0.12)',
                      border: '1px solid var(--ios-separator)',
                      color: 'var(--ios-text-secondary)',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Restablecer los avisos que fueron descartados previamente"
                  >
                    <RotateCcw size={13} />
                    <span>Restablecer ({dismissedKeys.size})</span>
                  </button>
                )}
              </div>
            </div>

            {activeIncidents.length > 0 && (
              <RideAffiliateCard reason="Servicios con demoras o cancelaciones en la red" />
            )}

            {activeIncidents.length === 0 ? (
              allCriticalIncidents.length > 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: 'var(--ios-card)',
                    borderRadius: '20px',
                    border: '1px solid rgba(48, 209, 88, 0.35)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <CheckCircle size={44} style={{ color: '#30d158', margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 800, fontSize: '18px', color: '#30d158' }}>
                    ✨ ¡Sistema de alertas limpio!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '6px', maxWidth: '340px', margin: '6px auto 14px', lineHeight: 1.45 }}>
                    Has descartado todos los avisos operativos. El contador permanecerá en cero y solo te avisaremos cuando surja una nueva novedad o demora en los servicios.
                  </div>
                  <button
                    onClick={handleRestoreDismissed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '12px',
                      background: 'rgba(118, 118, 128, 0.12)',
                      border: '1px solid var(--ios-separator)',
                      color: 'var(--ios-text-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Restablecer avisos descartados ({dismissedKeys.size})</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 20px',
                    background: 'var(--ios-card)',
                    borderRadius: '20px',
                    border: '1px solid rgba(48, 209, 88, 0.3)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <CheckCircle size={40} style={{ color: '#30d158', margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 800, fontSize: '17px', color: '#30d158' }}>
                    ¡Toda la red operando con normalidad!
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                    No se registran interrupciones, demoras graves ni cancelaciones activas.
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activeIncidents
                  .filter((inc) => {
                    if (!searchFilter) return true;
                    const q = searchFilter.toLowerCase();
                    return (
                      inc.lineName?.toLowerCase().includes(q) ||
                      inc.ramalName?.toLowerCase().includes(q) ||
                      inc.content?.toLowerCase().includes(q)
                    );
                  })
                  .map((incident, idx) => {
                    const badge = getAlertBadge(incident.type);
                    return (
                      <SwipeableAlertCard
                        key={`${getAlertKey(incident)}_${idx}`}
                        incident={incident}
                        badge={badge}
                        onDismiss={handleDismissIncident}
                        onNavigateToPlanner={onNavigateToPlanner}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PRIMER Y ÚLTIMO TREN POR CABECERA */}
        {activeTab === 'last_trains' && (
          <LastTrainsSection
            onSelectRoute={(origId, destId) => {
              if (onNavigateToPlanner) {
                onNavigateToPlanner(origId, destId);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
