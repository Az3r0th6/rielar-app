import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  ArrowUpDown,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Calendar,
  AlertCircle,
  FileText,
  Navigation,
  Compass,
} from 'lucide-react';
import {
  SCHEDULES_BRANCHES,
  getCurrentDayType,
  findNextScheduledService,
} from '../data/schedulesData';
import { LINES_DATA } from '../data/linesData';
import LineBadge from './LineBadge';
import { triggerHaptic } from '../utils/notifications';

export default function ServiceTimetableGrid({ onSelectTrain, initialLineId = null, onNavigateToMap }) {
  const [selectedLineId, setSelectedLineId] = useState(initialLineId || 5); // Default Mitre
  const [selectedBranchId, setSelectedBranchId] = useState('mitre-tigre');
  const [direction, setDirection] = useState('outbound'); // 'outbound' | 'inbound'
  const [dayType, setDayType] = useState(getCurrentDayType()); // 'weekdays' | 'saturdays' | 'sundays_holidays'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all' | 'morning' | 'afternoon' | 'night'
  const [searchQuery, setSearchQuery] = useState('');

  // Available lines with schedule data
  const availableLines = useMemo(() => {
    const ids = Array.from(new Set(SCHEDULES_BRANCHES.map((b) => b.lineId)));
    return LINES_DATA.filter((l) => ids.includes(l.id));
  }, []);

  // Branches belonging to selected line
  const lineBranches = useMemo(() => {
    return SCHEDULES_BRANCHES.filter((b) => b.lineId === selectedLineId);
  }, [selectedLineId]);

  // Keep branch selection valid when changing line
  useEffect(() => {
    if (lineBranches.length > 0) {
      const currentValid = lineBranches.some((b) => b.id === selectedBranchId);
      if (!currentValid) {
        setSelectedBranchId(lineBranches[0].id);
      }
    }
  }, [selectedLineId, lineBranches, selectedBranchId]);

  // Current branch definition
  const currentBranch = useMemo(() => {
    return (
      SCHEDULES_BRANCHES.find((b) => b.id === selectedBranchId) ||
      SCHEDULES_BRANCHES[0]
    );
  }, [selectedBranchId]);

  // Direction object
  const activeDirection = currentBranch?.directions?.[direction] || currentBranch?.directions?.outbound;

  // Raw services for the selected day
  const servicesList = useMemo(() => {
    return activeDirection?.schedules?.[dayType] || [];
  }, [activeDirection, dayType]);

  // Next upcoming service
  const nextService = useMemo(() => {
    return findNextScheduledService(servicesList);
  }, [servicesList]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return servicesList.filter((s) => {
      const depHour = parseInt(s.departure.split(':')[0], 10);

      // Time range filter
      if (timeFilter === 'morning' && (depHour < 4 || depHour >= 12)) return false;
      if (timeFilter === 'afternoon' && (depHour < 12 || depHour >= 19)) return false;
      if (timeFilter === 'night' && (depHour < 19 && depHour >= 4)) return false;

      // Search query filter (matches departure time or service number)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesTime = s.departure.includes(query) || s.arrival.includes(query);
        const matchesNum = s.number.toLowerCase().includes(query);
        return matchesTime || matchesNum;
      }

      return true;
    });
  }, [servicesList, timeFilter, searchQuery]);

  const handleSwapDirection = () => {
    triggerHaptic('medium');
    setDirection((prev) => (prev === 'outbound' ? 'inbound' : 'outbound'));
  };

  const handleLineChange = (id) => {
    triggerHaptic('light');
    setSelectedLineId(id);
  };

  const isTodayDayType = dayType === getCurrentDayType();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Line Picker Horizontal Segmented Bar */}
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
          {availableLines.map((line) => {
            const isSelected = selectedLineId === line.id;
            return (
              <button
                key={line.id}
                onClick={() => handleLineChange(line.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${line.color}` : '1px solid var(--ios-separator)',
                  background: isSelected ? `${line.color}25` : 'rgba(118, 118, 128, 0.12)',
                  color: isSelected ? (line.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 4px 12px ${line.color}35` : 'none',
                }}
              >
                <span>{line.icon}</span>
                <span>{line.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Branch & Direction Control Card */}
      <div className="ios-card" style={{ padding: '14px' }}>
        {/* Branch Selector Dropdown */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
            Ramal
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {lineBranches.map((b) => {
              const active = b.id === selectedBranchId;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedBranchId(b.id);
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: active ? `1.5px solid ${b.color}` : '1px solid var(--ios-separator)',
                    background: active ? `${b.color}20` : 'rgba(118, 118, 128, 0.12)',
                    color: active ? (b.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direction Switcher Button (⇄ Invertir Sentido) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--ios-card-solid)',
            border: '1px solid var(--ios-card-border)',
            borderRadius: '12px',
            padding: '8px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Sentido:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
              {activeDirection?.name}
            </span>
          </div>

          <button
            onClick={handleSwapDirection}
            style={{
              background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(10, 132, 255, 0.35)',
            }}
          >
            <ArrowUpDown size={13} />
            <span>Invertir</span>
          </button>
        </div>

        {/* Day Type Selector: Hábiles | Sábados | Domingos */}
        <div style={{ marginTop: '12px' }}>
          <div
            className="ios-segmented-control"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', padding: '3px' }}
          >
            <button
              className={`segmented-option ${dayType === 'weekdays' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setDayType('weekdays');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              Lunes a Viernes
            </button>
            <button
              className={`segmented-option ${dayType === 'saturdays' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setDayType('saturdays');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              Sábados
            </button>
            <button
              className={`segmented-option ${dayType === 'sundays_holidays' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setDayType('sundays_holidays');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              Dom y Feriados
            </button>
          </div>
        </div>
      </div>

      {/* 3. Next Train Glowing Highlight Banner */}
      {isTodayDayType && nextService && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(48, 209, 88, 0.16), var(--ios-card-solid))',
            border: '1.5px solid rgba(48, 209, 88, 0.4)',
            borderRadius: '16px',
            padding: '12px 14px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158', animation: 'pulse-ring 1.6s infinite' }}></div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PRÓXIMO TREN PROGRAMADO
              </span>
            </div>
            {nextService.minutesUntilDeparture !== undefined && !nextService.isTomorrow && (
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ios-green)', background: 'rgba(48, 209, 88, 0.15)', padding: '2px 8px', borderRadius: '8px' }}>
                Sale en ~{nextService.minutesUntilDeparture} min
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ios-text-primary)' }}>
                {nextService.departure} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-secondary)' }}>➔ llega {nextService.arrival}</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                Servicio {nextService.number} • Duración: ~{nextService.durationMinutes} min
              </div>
            </div>

            {onNavigateToMap && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onNavigateToMap();
                }}
                style={{
                  background: 'rgba(118, 118, 128, 0.14)',
                  color: 'var(--ios-text-primary)',
                  border: '1px solid var(--ios-separator)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Compass size={13} />
                <span>Ver Mapa</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Filters & Search Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Quick Search Input */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--ios-text-secondary)' }} />
            <input
              type="text"
              placeholder="Buscar hora (ej: 08:30 o 17)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
                background: 'rgba(118, 118, 128, 0.12)',
                border: '1px solid var(--ios-separator)',
                borderRadius: '10px',
                color: 'var(--ios-text-primary)',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Official PDF Link Button */}
          {currentBranch?.pdfUrl && (
            <a
              href={currentBranch.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '7px 10px',
                background: 'rgba(118, 118, 128, 0.12)',
                border: '1px solid var(--ios-separator)',
                borderRadius: '10px',
                color: 'var(--ios-text-secondary)',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              title="Ver PDF Oficial de Trenes Argentinos"
            >
              <FileText size={13} />
              <span>PDF Oficial</span>
            </a>
          )}
        </div>

        {/* Time of Day Tabs */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: `Todos (${servicesList.length})` },
            { id: 'morning', label: '🌅 Mañana (04 - 12h)' },
            { id: 'afternoon', label: '☀️ Tarde (12 - 19h)' },
            { id: 'night', label: '🌙 Noche (19 - 00h)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                triggerHaptic('light');
                setTimeFilter(t.id);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                border: timeFilter === t.id ? '1.5px solid var(--ios-card-border-active)' : '1px solid transparent',
                background: timeFilter === t.id ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.12)',
                color: timeFilter === t.id ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: timeFilter === t.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Complete Service Timetable Grid Table */}
      <div className="ios-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '70px 75px 85px 1fr',
            padding: '10px 14px',
            background: 'var(--ios-card-solid)',
            borderBottom: '1px solid var(--ios-separator)',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--ios-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          <div>Partida</div>
          <div>Llegada</div>
          <div>Servicio</div>
          <div style={{ textAlign: 'right' }}>Paradas / Estado</div>
        </div>

        {/* Rows */}
        <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
          {filteredServices.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ios-text-secondary)', fontSize: '13px' }}>
              No se encontraron servicios en la franja horaria seleccionada.
            </div>
          ) : (
            filteredServices.map((service, index) => {
              const isNext = isTodayDayType && nextService?.number === service.number && nextService?.departure === service.departure;
              const [h, m] = service.departure.split(':').map(Number);
              const now = new Date();
              const hasDeparted = isTodayDayType && h * 60 + m < now.getHours() * 60 + now.getMinutes();

              return (
                <div
                  key={`${service.number}-${index}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 75px 85px 1fr',
                    alignItems: 'center',
                    padding: '11px 14px',
                    borderBottom: '1px solid var(--ios-separator)',
                    background: isNext
                      ? 'rgba(48, 209, 88, 0.12)'
                      : index % 2 === 0
                      ? 'transparent'
                      : 'rgba(118, 118, 128, 0.04)',
                    opacity: hasDeparted ? 0.6 : 1,
                    transition: 'background 0.2s',
                  }}
                >
                  {/* Departure Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isNext && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ios-green)', animation: 'pulse-ring 1.4s infinite' }} />
                    )}
                    <span
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 900,
                        color: isNext ? 'var(--ios-green)' : hasDeparted ? 'var(--ios-text-tertiary)' : 'var(--ios-text-primary)',
                      }}
                    >
                      {service.departure}
                    </span>
                  </div>

                  {/* Arrival Time */}
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: hasDeparted ? 'var(--ios-text-tertiary)' : 'var(--ios-text-primary)' }}>
                      {service.arrival}
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)' }}>
                      {service.durationMinutes} min
                    </div>
                  </div>

                  {/* Service Number & Type */}
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: currentBranch.color || 'var(--ios-blue)' }}>
                      #{service.number.split('-')[1]}
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)' }}>
                      {service.type}
                    </div>
                  </div>

                  {/* Intermediate Stops or Status */}
                  <div style={{ textAlign: 'right' }}>
                    {isNext ? (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          background: 'var(--ios-green)',
                          color: '#000000',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                        }}
                      >
                        PRÓXIMO
                      </span>
                    ) : hasDeparted ? (
                      <span style={{ fontSize: '10.5px', color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>
                        Completado
                      </span>
                    ) : service.intermediateStops && service.intermediateStops.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                          Pasa por {service.intermediateStops[0].name} ({service.intermediateStops[0].time})
                        </span>
                        {service.intermediateStops[1] && (
                          <span style={{ fontSize: '9.5px', color: 'var(--ios-text-tertiary)' }}>
                            {service.intermediateStops[1].name} ({service.intermediateStops[1].time})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>Programado</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Footer Notes & Frequency Summary */}
      <div style={{ padding: '0 4px', fontSize: '11.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
        <p>
          💡 <strong>Frecuencias habituales:</strong> Días hábiles en hora pico cada 12 a 15 min, fuera de hora pico cada 15 a 20 min. Los horarios corresponden a los cronogramas vigentes de Trenes Argentinos (SOFSE).
        </p>
      </div>
    </div>
  );
}
