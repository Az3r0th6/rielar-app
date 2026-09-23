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
  ShieldAlert,
  Search,
  Zap,
  Flame,
  Construction,
  XCircle,
  AlertCircle,
  Train,
} from 'lucide-react';
import { getNetworkStatus } from '../api/sofseClient';
import { LINES_DATA } from '../data/linesData';
import LineBadge from '../components/LineBadge';
import LastTrainsSection from '../components/LastTrainsSection';
import { triggerHaptic, playChimeSound, sendAppNotification } from '../utils/notifications';

export default function LineStatusView({ onNavigateToPlanner }) {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents', 'lines', 'all_alerts', 'last_trains'
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedLineIds, setExpandedLineIds] = useState(new Set([11, 1, 5, 31, 21, 41, 501])); // All lines expanded by default
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
    localStorage.setItem('subscribed_lines', JSON.stringify(updated));
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
    totalLines: 7,
    totalBranches: 27,
    activeAlertsCount: 0,
    criticalCount: 0,
    criticalIncidents: [],
  };

  const lines = networkData?.lines || [];
  const allAlerts = networkData?.allAlerts || [];
  const criticalIncidents = summary.criticalIncidents || [];

  const getAlertBadge = (type) => {
    switch (type) {
      case 'CANCELACIÓN':
        return { bg: 'rgba(255, 69, 58, 0.2)', border: '#ff453a', color: '#ff453a', icon: XCircle };
      case 'RECORRIDO REDUCIDO':
        return { bg: 'rgba(255, 159, 10, 0.2)', border: '#ff9f0a', color: '#ff9f0a', icon: AlertTriangle };
      case 'DEMORA':
        return { bg: 'rgba(255, 214, 10, 0.2)', border: '#ffd60a', color: '#ffd60a', icon: Clock };
      case 'OBRAS EN VÍA':
        return { bg: 'rgba(10, 132, 255, 0.2)', border: '#0a84ff', color: '#0a84ff', icon: Construction };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255,255,255,0.2)', color: '#f5f5f7', icon: Info };
    }
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
            <span>• Reporte operativo integral</span>
          </div>
        </div>

        <button
          className="fav-button"
          onClick={() => {
            triggerHaptic('light');
            fetchStatus();
          }}
          title="Actualizar estado completo"
        >
          <RotateCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ padding: '14px 16px', paddingBottom: '30px' }}>
        {/* KPI Command Center Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 69, 58, 0.12)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ff453a' }}>
              {summary.criticalCount}
            </div>
            <div style={{ fontSize: '10px', color: '#ff453a', fontWeight: 700, textTransform: 'uppercase' }}>
              Afectadas
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 159, 10, 0.12)',
              border: '1px solid rgba(255, 159, 10, 0.3)',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ff9f0a' }}>
              {summary.activeAlertsCount}
            </div>
            <div style={{ fontSize: '10px', color: '#ff9f0a', fontWeight: 700, textTransform: 'uppercase' }}>
              Alertas
            </div>
          </div>

          <div
            style={{
              background: 'rgba(10, 132, 255, 0.12)',
              border: '1px solid rgba(10, 132, 255, 0.3)',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0a84ff' }}>
              {summary.totalBranches}
            </div>
            <div style={{ fontSize: '10px', color: '#0a84ff', fontWeight: 700, textTransform: 'uppercase' }}>
              Ramales
            </div>
          </div>

          <div
            style={{
              background: 'rgba(48, 209, 88, 0.12)',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              borderRadius: '14px',
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#30d158' }}>
              {summary.totalLines}
            </div>
            <div style={{ fontSize: '10px', color: '#30d158', fontWeight: 700, textTransform: 'uppercase' }}>
              Líneas
            </div>
          </div>
        </div>

        {/* View Segmented Tabs */}
        <div
          className="ios-segmented-control"
          style={{
            margin: '0 0 14px',
            display: 'flex',
            overflowX: 'auto',
            gap: '4px',
            padding: '4px',
          }}
        >
          <button
            className={`segmented-option ${activeTab === 'incidents' ? 'active' : ''}`}
            style={{ flexShrink: 0, fontSize: '11.5px', padding: '8px 10px' }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('incidents');
            }}
          >
            🚨 Afectaciones ({summary.criticalCount})
          </button>
          <button
            className={`segmented-option ${activeTab === 'lines' ? 'active' : ''}`}
            style={{ flexShrink: 0, fontSize: '11.5px', padding: '8px 10px' }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('lines');
            }}
          >
            🚆 Líneas (7)
          </button>
          <button
            className={`segmented-option ${activeTab === 'all_alerts' ? 'active' : ''}`}
            style={{ flexShrink: 0, fontSize: '11.5px', padding: '8px 10px' }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('all_alerts');
            }}
          >
            📋 Avisos ({summary.activeAlertsCount})
          </button>
          <button
            className={`segmented-option ${activeTab === 'last_trains' ? 'active' : ''}`}
            style={{ flexShrink: 0, fontSize: '11.5px', padding: '8px 10px' }}
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('last_trains');
            }}
          >
            🌙 Últimos Trenes
          </button>
        </div>

        {/* Search Bar for Ramales & Alerts (hidden in last_trains tab) */}
        {activeTab !== 'last_trains' && (
          <div style={{ marginBottom: '14px' }}>
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
              <Search size={15} style={{ color: '#8e8e93' }} />
              <input
                type="text"
                placeholder="Filtrar por ramal, estación o motivo (ej: Retiro, Zárate, Obras)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f5f5f7',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 1: CRITICAL INCIDENTS & DISRUPTIONS */}
        {activeTab === 'incidents' && (
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
              Afectaciones Operativas Activas en Vía
            </div>

            {criticalIncidents.length === 0 ? (
              <div className="ios-card" style={{ textAlign: 'center', padding: '30px', color: '#30d158' }}>
                <CheckCircle size={36} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 800, fontSize: '16px' }}>¡Red Operando Normalmente!</div>
                <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '4px' }}>
                  No se registran demoras graves, cancelaciones ni cortes en este momento.
                </div>
              </div>
            ) : (
              criticalIncidents
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
                  const Icon = badge.icon;
                  return (
                    <div
                      key={idx}
                      className="ios-card"
                      style={{
                        marginBottom: '12px',
                        borderLeft: `4px solid ${badge.border}`,
                        padding: '14px',
                        background: 'rgba(26, 26, 32, 0.85)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LineBadge lineId={incident.lineId} lineName={incident.lineName} size="small" />
                          <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#f5f5f7' }}>
                            {incident.ramalName}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Icon size={12} />
                          <span>{incident.type}</span>
                        </span>
                      </div>

                      <div style={{ fontSize: '13.5px', color: '#e5e5ea', lineHeight: '1.45', fontWeight: 500 }}>
                        {incident.content}
                      </div>

                      {incident.since && (
                        <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} />
                          <span>Registrado: {incident.since}</span>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* TAB 2: ALL LINES WITH ALL RAMALES EXPANDED */}
        {activeTab === 'lines' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase' }}>
                Desglose Completo por Línea ({lines.length} Líneas • {summary.totalBranches} Ramales)
              </span>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  if (expandedLineIds.size === lines.length) {
                    setExpandedLineIds(new Set());
                  } else {
                    setExpandedLineIds(new Set(lines.map((l) => l.id)));
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#0a84ff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {expandedLineIds.size === lines.length ? 'Colapsar todos' : 'Expandir todos'}
              </button>
            </div>
            {lines.map((line) => {
              const isSubscribed = subscribedLines.includes(line.id);
              const isExpanded = expandedLineIds.has(line.id);
              const branches = line.branches || [];
              const alerts = line.alerta || [];
              const hasAlerts = branches.some((b) => b.alerta && b.alerta.length > 0);

              // Filter branches if search query active
              const filteredBranches = branches.filter((b) => {
                if (!searchFilter) return true;
                const q = searchFilter.toLowerCase();
                const matchesBranch = b.nombre?.toLowerCase().includes(q);
                const matchesAlert = b.alerta?.some((a) => a.contenido?.toLowerCase().includes(q));
                return matchesBranch || matchesAlert;
              });

              if (searchFilter && filteredBranches.length === 0 && !line.nombre.toLowerCase().includes(searchFilter.toLowerCase())) {
                return null;
              }

              return (
                <div key={line.id} className="ios-card" style={{ padding: '16px', marginBottom: '14px' }}>
                  {/* Line Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LineBadge lineId={line.id} lineName={line.nombre} />
                      <div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: '#f5f5f7' }}>
                          Línea {line.nombre}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#8e8e93' }}>
                          {branches.length} ramales monitoreados
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="fav-button"
                        style={{
                          color: isSubscribed ? '#0a84ff' : '#8e8e93',
                          background: isSubscribed ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.06)',
                        }}
                        onClick={() => handleToggleSubscribe(line.id, line.nombre)}
                        title={isSubscribed ? 'Desactivar notificaciones' : 'Notificarme demoras'}
                      >
                        {isSubscribed ? <Bell size={16} /> : <BellOff size={16} />}
                      </button>

                      <button
                        className="close-round-btn"
                        onClick={() => toggleExpand(line.id)}
                        title={isExpanded ? 'Colapsar ramales' : 'Expandir ramales'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* General Line Status Notice */}
                  <div
                    style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: hasAlerts ? 'rgba(255, 159, 10, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                      border: `1px solid ${hasAlerts ? 'rgba(255, 159, 10, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {hasAlerts ? (
                        <AlertTriangle size={15} style={{ color: '#ff9f0a' }} />
                      ) : (
                        <CheckCircle size={15} style={{ color: '#30d158' }} />
                      )}
                      <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#f5f5f7' }}>
                        {hasAlerts ? 'Alertas activas en ramales' : 'Todos los ramales operando normalmente'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 600 }}>
                      {branches.length} ramales
                    </span>
                  </div>

                  {/* Complete List of Ramales for this Line */}
                  {isExpanded && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredBranches.map((branch) => {
                        const branchAlerts = branch.alerta || [];
                        const hasBranchAlert = branchAlerts.length > 0;
                        return (
                          <div
                            key={branch.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: hasBranchAlert
                                ? '1px solid rgba(255, 159, 10, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '12px',
                              padding: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#f5f5f7' }}>
                                  Ramal {branch.nombre}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(255,255,255,0.08)',
                                      color: '#8e8e93',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {branch.es_electrico ? '⚡ Eléctrico' : '🚂 Diésel'}
                                  </span>
                                  {branch.estaciones && (
                                    <span style={{ fontSize: '11px', color: '#8e8e93' }}>
                                      • {branch.estaciones} estaciones
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  background: hasBranchAlert
                                    ? 'rgba(255, 69, 58, 0.15)'
                                    : 'rgba(48, 209, 88, 0.15)',
                                  color: hasBranchAlert ? '#ff453a' : '#30d158',
                                }}
                              >
                                {hasBranchAlert ? 'Con Alertas' : 'Normal'}
                              </span>
                            </div>

                            {/* Branch Alerts Details */}
                            {branchAlerts.map((ba, baIdx) => {
                              const alertBadge = getAlertBadge(
                                ba.contenido.toLowerCase().includes('cancelado')
                                  ? 'CANCELACIÓN'
                                  : ba.contenido.toLowerCase().includes('reducido')
                                  ? 'RECORRIDO REDUCIDO'
                                  : ba.contenido.toLowerCase().includes('demora')
                                  ? 'DEMORA'
                                  : 'OBRAS EN VÍA'
                              );
                              return (
                                <div
                                  key={baIdx}
                                  style={{
                                    marginTop: '8px',
                                    padding: '10px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    borderLeft: `3px solid ${alertBadge.border}`,
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    lineHeight: '1.4',
                                  }}
                                >
                                  <div style={{ color: alertBadge.color, fontWeight: 700, marginBottom: '2px' }}>
                                    ⚠️ {alertBadge.type || 'Aviso Operativo'}
                                  </div>
                                  <div style={{ color: '#f5f5f7' }}>{ba.contenido}</div>
                                </div>
                              );
                            })}
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

        {/* TAB 3: ALL BULLETINS & ANNOUNCEMENTS (13) */}
        {activeTab === 'all_alerts' && (
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
              Todos los Avisos Oficiales SOFSE en Vigencia ({allAlerts.length})
            </div>

            {allAlerts.map((al, idx) => {
              const badge = getAlertBadge(al.type);
              return (
                <div
                  key={idx}
                  className="ios-card"
                  style={{
                    marginBottom: '10px',
                    padding: '12px 14px',
                    borderLeft: `3px solid ${badge.border}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LineBadge lineId={al.lineId} lineName={al.lineName} size="small" />
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{al.ramalName}</span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: badge.color, fontWeight: 700 }}>
                      {al.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#e5e5ea', lineHeight: '1.45' }}>
                    {al.content}
                  </div>
                  {al.since && (
                    <div style={{ fontSize: '10.5px', color: '#8e8e93', marginTop: '6px' }}>
                      Desde: {al.since}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: PRIMER Y ÚLTIMO TREN POR CABECERA */}
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
