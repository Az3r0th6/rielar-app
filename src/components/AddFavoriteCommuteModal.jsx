import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Clock,
  Bell,
  BellOff,
  Calendar,
  Tag,
  Star,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import { SCHEDULES_BRANCHES } from '../data/schedulesData';
import LineBadge from './LineBadge';
import {
  addFavoriteCommute,
  isCommuteSaved,
} from '../utils/commuteStorage';
import { requestNotificationPermission } from '../utils/notifications';
import { triggerHaptic } from '../utils/notifications';

const COMMON_COMMUTE_HOURS = [
  '06:45',
  '07:15',
  '07:45',
  '08:00',
  '08:15',
  '08:30',
  '09:00',
  '17:15',
  '17:45',
  '18:00',
  '18:15',
  '18:45',
  '19:15',
];

const PRESET_LABELS = [
  { id: 'Trabajo', label: '💼 Trabajo' },
  { id: 'Facultad', label: '🎓 Facultad' },
  { id: 'Regreso a casa', label: '🏠 A casa' },
  { id: 'Mi Tren Diario', label: '⭐ Mi Tren' },
];

export default function AddFavoriteCommuteModal({
  isOpen,
  onClose,
  onCommuteAdded,
  initialStation = null,
  initialTime = '',
}) {
  const [stationSearch, setStationSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState(initialStation || null);
  const [destination, setDestination] = useState('');
  const [scheduledTime, setScheduledTime] = useState(initialTime || '08:15');
  const [days, setDays] = useState('weekdays'); // 'weekdays' | 'all' | 'saturdays' | 'sundays_holidays'
  const [label, setLabel] = useState('Trabajo');
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Sync initial props
  useEffect(() => {
    if (initialStation) {
      setSelectedStation(initialStation);
      setStationSearch(initialStation.name || '');
    }
    if (initialTime) {
      setScheduledTime(initialTime);
    }
  }, [initialStation, initialTime]);

  // Autocomplete stations
  const searchResults = useMemo(() => {
    if (!stationSearch.trim() || stationSearch.length < 2) return [];
    const q = stationSearch.toLowerCase().trim();
    return PRELOADED_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.lineName && s.lineName.toLowerCase().includes(q)) ||
        (s.ramal && s.ramal.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [stationSearch]);

  // Possible destinations based on selected station
  const suggestedDestinations = useMemo(() => {
    if (!selectedStation) return ['Retiro', 'Constitución', 'Once'];
    const ramal = selectedStation.ramal || '';
    if (ramal.includes('-')) {
      const parts = ramal.split('-').map((p) => p.trim());
      return parts;
    }
    const lineObj = LINES_DATA.find((l) => l.name === selectedStation.lineName);
    if (lineObj?.terminals) {
      return lineObj.terminals.split('•').map((t) => t.trim());
    }
    return ['Retiro', 'Constitución', 'Once'];
  }, [selectedStation]);

  // Set default destination when station changes
  useEffect(() => {
    if (suggestedDestinations.length > 0 && !destination) {
      // Pick terminal that isn't the current station
      const target = suggestedDestinations.find(
        (d) => d.toLowerCase() !== selectedStation?.name?.toLowerCase()
      ) || suggestedDestinations[0];
      setDestination(target);
    }
  }, [suggestedDestinations, destination, selectedStation]);

  // Real scheduled branch departures if available
  const availableScheduledDepartures = useMemo(() => {
    if (!selectedStation) return [];
    const branch = SCHEDULES_BRANCHES.find(
      (b) =>
        b.lineId === selectedStation.lineId ||
        (selectedStation.ramal && b.name.includes(selectedStation.ramal))
    );
    if (!branch) return [];
    const timetable = branch.directions?.outbound?.schedules?.[days] || [];
    return timetable.map((s) => s.departure).slice(0, 16);
  }, [selectedStation, days]);

  if (!isOpen) return null;

  const handleSelectStation = (st) => {
    triggerHaptic('light');
    setSelectedStation(st);
    setStationSearch(st.name);
    // Find matching destination opposite to current station
    const ramal = st.ramal || '';
    if (ramal.includes('-')) {
      const parts = ramal.split('-').map((p) => p.trim());
      const other = parts.find((p) => !st.name.toLowerCase().includes(p.toLowerCase()));
      if (other) setDestination(other);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStation) {
      alert('Por favor selecciona una estación de partida.');
      return;
    }
    if (!scheduledTime) {
      alert('Por favor indica el horario habitual.');
      return;
    }

    if (reminderEnabled) {
      await requestNotificationPermission();
    }

    const newCommute = {
      stationId: selectedStation.id,
      stationName: selectedStation.name,
      lineId: selectedStation.lineId || 5,
      lineName: selectedStation.lineName || 'Mitre',
      ramal: selectedStation.ramal || '',
      destination: destination || 'Destino',
      scheduledTime,
      days,
      label,
      reminderMinutes: reminderEnabled ? reminderMinutes : 0,
      reminderEnabled,
    };

    const saved = addFavoriteCommute(newCommute);
    if (onCommuteAdded) onCommuteAdded(saved);
    onClose();
  };

  const alreadySaved = isCommuteSaved({
    stationId: selectedStation?.id,
    destination,
    scheduledTime,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="ios-modal-sheet"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          background: 'var(--ios-card-solid)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          border: '1px solid var(--ios-separator)',
          borderBottom: 'none',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--ios-separator)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #ffd60a, #ff9f0a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000',
                boxShadow: '0 2px 8px rgba(255, 214, 10, 0.35)',
              }}
            >
              <Clock size={17} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                Guardar Tren Habitual
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                Fija el tren y horario que te tomás todos los días
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="close-round-btn"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSave}
          style={{
            padding: '18px 20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* 1. Station Selector */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              1. Estación de Origen
            </label>

            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ios-text-secondary)',
                }}
              />
              <input
                type="text"
                placeholder="Buscar estación (ej: Vicente López, Morón, Quilmes)..."
                value={stationSearch}
                onChange={(e) => {
                  setStationSearch(e.target.value);
                  if (selectedStation && e.target.value !== selectedStation.name) {
                    setSelectedStation(null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 36px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--ios-separator)',
                  background: 'rgba(118, 118, 128, 0.1)',
                  color: 'var(--ios-text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Station Autocomplete Dropdown */}
            {searchResults.length > 0 && !selectedStation && (
              <div
                style={{
                  marginTop: '6px',
                  background: 'var(--ios-card-solid)',
                  border: '1px solid var(--ios-separator)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                }}
              >
                {searchResults.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleSelectStation(st)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--ios-separator)',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                        {st.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                        {st.ramal || st.lineName}
                      </div>
                    </div>
                    <LineBadge lineId={st.lineId} size="small" />
                  </div>
                ))}
              </div>
            )}

            {/* Selected Station Pill */}
            {selectedStation && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(10, 132, 255, 0.12)',
                  border: '1px solid rgba(10, 132, 255, 0.3)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LineBadge lineId={selectedStation.lineId} size="small" />
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                    {selectedStation.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStation(null);
                    setStationSearch('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ios-text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* 2. Destination / Direction */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              2. Sentido / Destino habitual
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {suggestedDestinations.map((dest) => (
                <button
                  type="button"
                  key={dest}
                  onClick={() => {
                    triggerHaptic('light');
                    setDestination(dest);
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '9px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    border: destination === dest ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-separator)',
                    background: destination === dest ? 'rgba(10, 132, 255, 0.15)' : 'rgba(118, 118, 128, 0.08)',
                    color: destination === dest ? 'var(--ios-blue)' : 'var(--ios-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Hacia {dest}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Scheduled Time & Quick Chips */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--ios-text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                3. Horario habitual de salida
              </label>
              <span style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)' }}>Hora local (24hs)</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(118, 118, 128, 0.1)',
                  border: '1.5px solid var(--ios-separator)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  width: 'fit-content',
                }}
              >
                <Clock size={18} style={{ color: 'var(--ios-blue)' }} />
                <input
                  type="time"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ios-text-primary)',
                    fontSize: '20px',
                    fontWeight: 900,
                    outline: 'none',
                    letterSpacing: '1px',
                  }}
                />
              </div>
            </div>

            {/* Quick Time Selector Chips */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)', marginBottom: '5px' }}>
                Horarios frecuentes:
              </div>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
                {(availableScheduledDepartures.length > 0 ? availableScheduledDepartures : COMMON_COMMUTE_HOURS).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setScheduledTime(t);
                      }}
                      style={{
                        padding: '5px 9px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: scheduledTime === t ? '1.5px solid var(--ios-green)' : '1px solid var(--ios-separator)',
                        background: scheduledTime === t ? 'rgba(48, 209, 88, 0.16)' : 'rgba(118, 118, 128, 0.08)',
                        color: scheduledTime === t ? 'var(--ios-green)' : 'var(--ios-text-primary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* 4. Days of Commute */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              4. Días de viaje
            </label>
            <div
              className="ios-segmented-control"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', padding: '3px' }}
            >
              <button
                type="button"
                className={`segmented-option ${days === 'weekdays' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setDays('weekdays');
                }}
                style={{ fontSize: '11.5px', padding: '7px 4px', fontWeight: 700 }}
              >
                Lun a Vie
              </button>
              <button
                type="button"
                className={`segmented-option ${days === 'all' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setDays('all');
                }}
                style={{ fontSize: '11.5px', padding: '7px 4px', fontWeight: 700 }}
              >
                Todos los días
              </button>
              <button
                type="button"
                className={`segmented-option ${days === 'saturdays' || days === 'sundays_holidays' ? 'active' : ''}`}
                onClick={() => {
                  triggerHaptic('light');
                  setDays('saturdays');
                }}
                style={{ fontSize: '11.5px', padding: '7px 4px', fontWeight: 700 }}
              >
                Fines de sem.
              </button>
            </div>
          </div>

          {/* 5. Commute Nickname / Label */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              5. Etiqueta / Nombre
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {PRESET_LABELS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setLabel(p.id);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: label === p.id ? '1.5px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
                    background: label === p.id ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.08)',
                    color: label === p.id ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Daily Reminder Notification Settings */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(118, 118, 128, 0.08)',
              border: '1px solid var(--ios-separator)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {reminderEnabled ? (
                  <Bell size={17} style={{ color: 'var(--ios-blue)' }} />
                ) : (
                  <BellOff size={17} style={{ color: 'var(--ios-text-tertiary)' }} />
                )}
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Aviso previo diario
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                    Notificación sonora antes de que salga tu tren
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => {
                  triggerHaptic('light');
                  setReminderEnabled(e.target.checked);
                }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--ios-blue)', cursor: 'pointer' }}
              />
            </div>

            {reminderEnabled && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {[5, 10, 15, 20].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setReminderMinutes(m);
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 4px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: reminderMinutes === m ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-separator)',
                      background: reminderMinutes === m ? 'rgba(10, 132, 255, 0.16)' : 'transparent',
                      color: reminderMinutes === m ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {m} min antes
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--ios-separator)',
                background: 'rgba(118, 118, 128, 0.12)',
                color: 'var(--ios-text-primary)',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)',
              }}
            >
              <Star size={16} style={{ fill: '#ffd60a', color: '#ffd60a' }} />
              <span>{alreadySaved ? 'Actualizar Horario' : 'Guardar en Favoritos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
