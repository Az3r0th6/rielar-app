import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getNetworkStatus } from '../api/sofseClient';
import LineBadge from '../components/LineBadge';
import LastTrainsSection from '../components/LastTrainsSection';
import RideAffiliateCard from '../components/RideAffiliateCard';
import SwipeableAlertCard from '../components/SwipeableAlertCard';
import { triggerHaptic, playChimeSound, sendAppNotification } from '../utils/notifications';
import {
  getAlertKey,
  dismissAlert,
  dismissAllAlerts,
  markAlertsAsRead,
  restoreDismissedAlerts,
  getDismissedAlertKeys,
  ALERTS_CHANGED_EVENT,
} from '../utils/alertManager';

export default function LineStatusView({ onNavigateToPlanner }) {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'incidents' | 'last_trains'
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedLineForModal, setSelectedLineForModal] = useState(null);
  const [expandedLineIds, setExpandedLineIds] = useState(new Set([5, 1, 11, 31, 21, 41]));
  const [dismissedKeys, setDismissedKeys] = useState(() => getDismissedAlertKeys());
  const [subscribedLines, setSubscribedLines] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('subscribed_lines') || '[]');
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

  // Synchronize dismissed alerts when changed anywhere
  useEffect(() => {
    const handleSync = () => {
      setDismissedKeys(getDismissedAlertKeys());
    };
    window.addEventListener(ALERTS_CHANGED_EVENT, handleSync);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, handleSync);
  }, []);

  const handleToggleSubscribe = (lineId, lineName) => {
    triggerHaptic('medium');
    const isSubscribed = subscribedLines.includes(lineId);
    let updated;
    if (isSubscribed) {
      updated = subscribedLines.filter((id) => id !== lineId);
    } else {
      updated = [...subscribedLines, lineId];
      sendAppNotification(
        `Alertas activadas • Línea ${lineName}`,
        `Recibirás avisos inmediatos ante demoras, obras o cancelaciones en la línea ${lineName}.`,
        { type: 'alert' }
      );
    }
    setSubscribedLines(updated);
    try {
      localStorage.setItem('subscribed_lines', JSON.stringify(updated));
    } catch {}
  };

  const toggleExpand = (lineId) => {
    triggerHaptic('light');
    setExpandedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const summary = networkData?.summary || {
    totalLines: 6,
    totalBranches: 27,
    activeAlertsCount: 0,
    criticalCount: 0,
    criticalIncidents: [],
  };

  // Only active operational SOFSE lines in AMBA (filter out 501 / Regionales)
  const lines = (networkData?.lines || []).filter((l) => l.id !== 501);
  const allCriticalIncidents = summary.criticalIncidents || [];
  const activeIncidents = allCriticalIncidents.filter((inc) => !dismissedKeys.has(getAlertKey(inc)));

  // Automatically mark active incidents as read when viewed so the badge counter drops to 0
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

  const getLineStatusPill = (line) => {
    const branches = line.branches || [];
    const allAlerts = branches
      .flatMap((b) => (b.alerta || []).map((a) => ({ ...a, ramalName: b.nombre, lineId: line.id })))
      .filter((a) => !dismissedKeys.has(getAlertKey(a)));

    if (allAlerts.length === 0) {
      return {
        text: 'Normal',
        color: '#30d158',
        bg: 'rgba(48, 209, 88, 0.14)',
        border: 'rgba(48, 209, 88, 0.35)',
        icon: CheckCircle,
      };
    }
    const hasCancel = allAlerts.some((a) => a.contenido?.toLowerCase().includes('cancel'));
    if (hasCancel) {
      return {
        text: 'Cancelación',
        color: '#ff453a',
        bg: 'rgba(255, 69, 58, 0.15)',
        border: '#ff453a',
        icon: XCircle,
      };
    }
    const hasReduced = allAlerts.some((a) => a.contenido?.toLowerCase().includes('reducido'));
    if (hasReduced) {
      return {
        text: 'Reducido',
        color: '#ff9f0a',
        bg: 'rgba(255, 159, 10, 0.15)',
        border: '#ff9f0a',
        icon: AlertTriangle,
      };
    }
    return {
      text: 'Demora',
      color: '#ffd60a',
      bg: 'rgba(255, 214, 10, 0.15)',
      border: '#ffd60a',
      icon: Clock,
    };
  };

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div>
          <h1 className="ios-large-title">Estado de Red</h1>
          <div className="ios-subtitle">
            <span className="ios-live-indicator">
              <span className="live-pulse-dot" />
              <span>SOFSE Oficial</span>
            </span>
            <span>• Reporte operativo en vivo</span>
          </div>
        </div>

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
          }}
        >
          {activeIncidents.length > 0 ? (
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('incidents');
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
              <span>
                {activeIncidents.length} {activeIncidents.length === 1 ? 'aviso en vía' : 'avisos en vía'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('lines');
              }}
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
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
            >
              <CheckCircle size={14} />
              <span>{allCriticalIncidents.length > 0 ? 'Alertas al día (descartadas)' : 'Red operando normalmente'}</span>
            </button>
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
            <span>🚆 {lines.length} Líneas activas</span>
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
            🚆 Líneas y Ramales
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

        {/* Search Bar for Ramales & Alerts */}
        {activeTab !== 'last_trains' && (
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(118, 118, 128, 0.18)',
                padding: '9px 12px',
                borderRadius: '14px',
              }}
            >
              <Search size={16} style={{ color: '#8e8e93' }} />
              <input
                type="text"
                placeholder="Filtrar línea, ramal o estación..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
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
            </div>
          </div>
        )}

        {/* TAB 1: FLOATING LINE PILLS (Píldoras flotantes con colores y acceso directo) */}
        {activeTab === 'lines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lines.map((line) => {
              const statusPill = getLineStatusPill(line);
              const StatusIcon = statusPill.icon;
              const isSubscribed = subscribedLines.includes(line.id);
              const isExpanded = expandedLineIds.has(line.id);
              const branches = line.branches || [];

              const filteredBranches = branches.filter((b) => {
                if (!searchFilter) return true;
                const q = searchFilter.toLowerCase();
                return b.nombre?.toLowerCase().includes(q) || b.alerta?.some((a) => a.contenido?.toLowerCase().includes(q));
              });

              if (searchFilter && filteredBranches.length === 0 && !line.nombre.toLowerCase().includes(searchFilter.toLowerCase())) {
                return null;
              }

              return (
                <div
                  key={line.id}
                  style={{
                    background: 'var(--ios-card)',
                    border: `1px solid ${statusPill.border}`,
                    borderRadius: '18px',
                    padding: '12px 14px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Floating Header Pill Row */}
                  <div
                    onClick={() => toggleExpand(line.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <LineBadge lineId={line.id} lineName={line.nombre} />
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--ios-text-secondary)',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {branches.length} ramales
                      </span>
                    </div>

                    {/* Floating Color Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 9px',
                          borderRadius: '12px',
                          background: statusPill.bg,
                          border: `1px solid ${statusPill.border}`,
                          color: statusPill.color,
                          fontSize: '11.5px',
                          fontWeight: 800,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <StatusIcon size={12} />
                        <span>{statusPill.text}</span>
                      </span>

                      <button
                        className="fav-button"
                        style={{
                          width: '30px',
                          height: '30px',
                          color: isSubscribed ? '#0a84ff' : 'var(--ios-text-secondary)',
                          background: isSubscribed ? 'rgba(10,132,255,0.15)' : 'rgba(118, 118, 128, 0.1)',
                          flexShrink: 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSubscribe(line.id, line.nombre);
                        }}
                        title={isSubscribed ? 'Alertas activas' : 'Activar alertas push'}
                      >
                        {isSubscribed ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>

                      <div style={{ color: 'var(--ios-text-secondary)', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Branches List (Clean, floating pills without bulky nested cards) */}
                  {isExpanded && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--ios-separator)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredBranches.map((branch) => {
                        const branchAlerts = branch.alerta || [];
                        const hasAlert = branchAlerts.length > 0;
                        return (
                          <div
                            key={branch.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '12px',
                              background: hasAlert ? 'rgba(255, 159, 10, 0.08)' : 'rgba(118, 118, 128, 0.08)',
                              border: hasAlert ? '1px solid rgba(255, 159, 10, 0.35)' : '1px solid transparent',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: 'var(--ios-text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={`Ramal ${branch.nombre}`}
                                >
                                  Ramal {branch.nombre}
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                                  {branch.es_electrico ? '⚡ Eléctrico' : '🚂 Diésel'}
                                  {branch.estaciones && ` • ${branch.estaciones} estaciones`}
                                </div>
                              </div>

                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  background: hasAlert ? 'rgba(255, 69, 58, 0.15)' : 'rgba(48, 209, 88, 0.15)',
                                  color: hasAlert ? '#ff453a' : '#30d158',
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {hasAlert ? 'Con Alerta' : 'Normal'}
                              </span>
                            </div>

                            {/* Branch Alert Detail Pills */}
                            {branchAlerts.map((ba, bIdx) => (
                              <div
                                key={bIdx}
                                style={{
                                  marginTop: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(255, 69, 58, 0.1)',
                                  borderLeft: '3px solid #ff453a',
                                  fontSize: '12.5px',
                                  lineHeight: '1.4',
                                  color: 'var(--ios-text-primary)',
                                }}
                              >
                                <div style={{ fontWeight: 800, color: '#ff453a', marginBottom: '2px', fontSize: '11.5px' }}>
                                  ⚠️ Afectación en el servicio
                                </div>
                                <div>{ba.contenido}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
