import React, { useState, useMemo } from 'react';
import {
  Moon,
  Sun,
  Search,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';
import { LAST_TRAINS_DATA, getCurrentDayType, calculateScheduleStatus } from '../data/lastTrainsData';
import { LINES_DATA } from '../data/linesData';
import LineBadge from './LineBadge';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function LastTrainsSection({ onSelectRoute }) {
  const [selectedLineId, setSelectedLineId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayType, setDayType] = useState(() => getCurrentDayType());

  const currentTodayType = useMemo(() => getCurrentDayType(), []);

  // Filtered terminal list
  const filteredData = useMemo(() => {
    return LAST_TRAINS_DATA.filter((item) => {
      // Filter by line
      if (selectedLineId !== 'ALL' && item.lineId !== Number(selectedLineId)) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrigin = item.origin.toLowerCase().includes(q);
        const matchesDest = item.destination.toLowerCase().includes(q);
        const matchesRamal = item.ramalName.toLowerCase().includes(q);
        const matchesLine = item.lineName.toLowerCase().includes(q);
        return matchesOrigin || matchesDest || matchesRamal || matchesLine;
      }
      return true;
    });
  }, [selectedLineId, searchQuery]);

  const handleDayChange = (newDay) => {
    triggerHaptic('light');
    setDayType(newDay);
  };

  const handleLineChange = (lineId) => {
    triggerHaptic('light');
    setSelectedLineId(lineId);
  };

  const dayLabels = {
    weekdays: 'Hábiles (Lun a Vie)',
    saturdays: 'Sábados',
    sundays_holidays: 'Domingos y Feriados',
  };

  return (
    <div style={{ marginTop: '4px' }}>
      {/* Informative Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(88,86,214,0.15) 100%)',
          border: '1px solid rgba(10,132,255,0.25)',
          borderRadius: '16px',
          padding: '14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(10,132,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a84ff',
            flexShrink: 0,
          }}
        >
          <Moon size={22} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#f5f5f7' }}>
            Cronograma Oficial de Cabeceras
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px', lineHeight: '1.35' }}>
            Consulta el primer y último tren del día para no quedarte sin viaje nocturno.
          </div>
        </div>
      </div>

      {/* Day Selector Segmented Control */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>
          Tipo de Día
        </div>
        <div
          className="ios-segmented-control"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '4px' }}
        >
          <button
            className={`segmented-option ${dayType === 'weekdays' ? 'active' : ''}`}
            onClick={() => handleDayChange('weekdays')}
            style={{ fontSize: '11.5px', padding: '8px 4px', textAlign: 'center' }}
          >
            Lunes a Viernes
            {currentTodayType === 'weekdays' && (
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8, color: '#30d158', fontWeight: 700 }}>
                • Hoy
              </span>
            )}
          </button>
          <button
            className={`segmented-option ${dayType === 'saturdays' ? 'active' : ''}`}
            onClick={() => handleDayChange('saturdays')}
            style={{ fontSize: '11.5px', padding: '8px 4px', textAlign: 'center' }}
          >
            Sábados
            {currentTodayType === 'saturdays' && (
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8, color: '#30d158', fontWeight: 700 }}>
                • Hoy
              </span>
            )}
          </button>
          <button
            className={`segmented-option ${dayType === 'sundays_holidays' ? 'active' : ''}`}
            onClick={() => handleDayChange('sundays_holidays')}
            style={{ fontSize: '11.5px', padding: '8px 4px', textAlign: 'center' }}
          >
            Dom / Feriados
            {currentTodayType === 'sundays_holidays' && (
              <span style={{ display: 'block', fontSize: '9px', opacity: 0.8, color: '#30d158', fontWeight: 700 }}>
                • Hoy
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Line Filter Horizontal Pills */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '2px' }}>
          Filtrar por Línea
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => handleLineChange('ALL')}
            style={{
              background: selectedLineId === 'ALL' ? '#0a84ff' : 'rgba(255,255,255,0.06)',
              color: selectedLineId === 'ALL' ? '#fff' : '#f5f5f7',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            Todas ({LAST_TRAINS_DATA.length})
          </button>
          {LINES_DATA.filter(l => l.id !== 501).map((line) => {
            const isSelected = selectedLineId === String(line.id);
            return (
              <button
                key={line.id}
                onClick={() => handleLineChange(String(line.id))}
                style={{
                  background: isSelected ? line.color : 'rgba(255,255,255,0.06)',
                  color: isSelected ? (line.textColor || '#fff') : '#f5f5f7',
                  border: isSelected ? `1px solid ${line.color}` : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                }}
              >
                <span>{line.icon}</span>
                <span>{line.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(118, 118, 128, 0.2)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Search size={15} style={{ color: '#8e8e93' }} />
          <input
            type="text"
            placeholder="Buscar por cabecera (ej: Retiro, Tigre, Once, La Plata)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8e8e93',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '10px', paddingLeft: '2px' }}>
        Cabeceras Encontradas ({filteredData.length}) • {dayLabels[dayType]}
      </div>

      {/* List of Cabeceras Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredData.length === 0 ? (
          <div className="ios-card" style={{ textAlign: 'center', padding: '24px', color: '#8e8e93' }}>
            <AlertTriangle size={28} style={{ margin: '0 auto 8px', color: '#ff9f0a' }} />
            <div>No se encontraron cabeceras para la búsqueda indicada.</div>
          </div>
        ) : (
          filteredData.map((item) => {
            const sched = item.schedule[dayType] || item.schedule.weekdays;
            const isToday = dayType === currentTodayType;
            const statusInfo = isToday ? calculateScheduleStatus(sched.first, sched.last) : null;

            return (
              <div
                key={item.id}
                className="ios-card"
                style={{
                  padding: '14px',
                  background: 'rgba(26, 26, 32, 0.85)',
                  border: statusInfo?.status === 'last_imminent'
                    ? '1px solid rgba(255, 159, 10, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header: Line + Ramal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LineBadge lineId={item.lineId} lineName={item.lineName} size="small" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93' }}>
                      {item.ramalName}
                    </span>
                  </div>

                  {/* Real-time Status Badge (only for today) */}
                  {isToday && statusInfo && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background:
                          statusInfo.status === 'last_imminent'
                            ? 'rgba(255, 159, 10, 0.2)'
                            : statusInfo.status === 'ended'
                            ? 'rgba(142, 142, 147, 0.2)'
                            : statusInfo.status === 'not_started'
                            ? 'rgba(10, 132, 255, 0.2)'
                            : 'rgba(48, 209, 88, 0.15)',
                        color:
                          statusInfo.status === 'last_imminent'
                            ? '#ff9f0a'
                            : statusInfo.status === 'ended'
                            ? '#a1a1aa'
                            : statusInfo.status === 'not_started'
                            ? '#0a84ff'
                            : '#30d158',
                        border: `1px solid ${
                          statusInfo.status === 'last_imminent'
                            ? 'rgba(255, 159, 10, 0.4)'
                            : statusInfo.status === 'ended'
                            ? 'rgba(142, 142, 147, 0.3)'
                            : statusInfo.status === 'not_started'
                            ? 'rgba(10, 132, 255, 0.3)'
                            : 'rgba(48, 209, 88, 0.3)'
                        }`,
                      }}
                    >
                      {statusInfo.status === 'last_imminent' && '⚠️ Último en breve'}
                      {statusInfo.status === 'ended' && '🌙 Finalizado hoy'}
                      {statusInfo.status === 'not_started' && '⏳ Próximo inicio'}
                      {statusInfo.status === 'operating' && '🟢 En servicio'}
                    </span>
                  )}
                </div>

                {/* Main Route Header: Origin -> Destination */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#f5f5f7' }}>
                    {item.origin}
                  </span>
                  <ArrowRight size={16} style={{ color: '#0a84ff' }} />
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#f5f5f7' }}>
                    {item.destination}
                  </span>
                </div>

                {/* Schedules Grid (Primer y Último Tren) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '10px',
                  }}
                >
                  {/* Primer Tren */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sun size={14} style={{ color: '#ff9f0a' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase' }}>
                        Primer Tren
                      </span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f7' }}>
                      {sched.first} <span style={{ fontSize: '12px', fontWeight: 500, color: '#8e8e93' }}>hs</span>
                    </div>
                  </div>

                  {/* Último Tren */}
                  <div
                    style={{
                      background: statusInfo?.status === 'last_imminent'
                        ? 'rgba(255, 159, 10, 0.12)'
                        : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      border: statusInfo?.status === 'last_imminent'
                        ? '1px solid rgba(255, 159, 10, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Moon size={14} style={{ color: '#0a84ff' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase' }}>
                        Último Tren
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: statusInfo?.status === 'last_imminent' ? '#ff9f0a' : '#f5f5f7',
                      }}
                    >
                      {sched.last} <span style={{ fontSize: '12px', fontWeight: 500, color: '#8e8e93' }}>hs</span>
                    </div>
                  </div>
                </div>

                {/* Status Message Text (e.g. "Servicio finalizado por hoy" or "En servicio regular hasta las 23:00") */}
                {isToday && statusInfo?.message && (
                  <div
                    style={{
                      fontSize: '11.5px',
                      color:
                        statusInfo.status === 'last_imminent'
                          ? '#ff9f0a'
                          : statusInfo.status === 'ended'
                          ? '#8e8e93'
                          : statusInfo.status === 'not_started'
                          ? '#0a84ff'
                          : '#30d158',
                      fontWeight: 600,
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Clock size={12} />
                    <span>{statusInfo.message}</span>
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <div style={{ fontSize: '11px', color: '#636366', marginBottom: '10px', lineHeight: '1.3' }}>
                    {item.notes}
                  </div>
                )}

                {/* Action: Consultar Salidas en Vivo */}
                {onSelectRoute && item.originId && item.destId && (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      playChimeSound('click');
                      onSelectRoute(item.originId, item.destId);
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '8px',
                      color: '#0a84ff',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span>Ver próximas salidas en vivo de esta cabecera</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
