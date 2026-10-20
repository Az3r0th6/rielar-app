import React, { useMemo } from 'react';
import {
  Clock,
  Bell,
  BellOff,
  Trash2,
  Calendar,
  Navigation,
  Sparkles,
  ArrowRight,
  Radio,
} from 'lucide-react';
import LineBadge from './LineBadge';
import {
  getCommuteTimeStatus,
  toggleCommuteReminder,
} from '../utils/commuteStorage';
import { formatArrivalSeconds, formatLocalTime } from '../utils/time';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function FavoriteCommuteCard({
  commute,
  liveArrivals = [],
  onRemove,
  onSelectStation,
  onOpenStationInfo,
}) {
  const status = useMemo(() => {
    return getCommuteTimeStatus(commute, new Date());
  }, [commute]);

  // Correlate with real-time live trains from SOFSE
  const matchedLiveTrain = useMemo(() => {
    if (!liveArrivals || !Array.isArray(liveArrivals) || liveArrivals.length === 0) {
      return null;
    }
    // Look for matching destination or close arrival time
    const targetDest = (commute.destination || '').toLowerCase();
    return liveArrivals.find((t) => {
      const dest = (
        t.servicio?.hasta?.estacion?.nombre ||
        t.servicio?.estaciones?.[t.servicio.estaciones.length - 1]?.nombre ||
        t.servicio?.ramal?.cabeceraFinal?.nombre ||
        ''
      ).toLowerCase();

      return dest.includes(targetDest) || targetDest.includes(dest);
    }) || liveArrivals[0];
  }, [liveArrivals, commute.destination]);

  const handleToggleBell = (e) => {
    e.stopPropagation();
    playChimeSound('click');
    toggleCommuteReminder(commute.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    triggerHaptic('medium');
    if (onRemove) onRemove(commute.id);
  };

  return (
    <div
      className="ios-card"
      style={{
        marginBottom: '12px',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        border: status.isSoon
          ? '1.5px solid rgba(48, 209, 88, 0.45)'
          : '1px solid var(--ios-separator)',
        background: status.isSoon
          ? 'linear-gradient(135deg, rgba(48, 209, 88, 0.08), var(--ios-card-solid))'
          : 'var(--ios-card-solid)',
        cursor: onSelectStation ? 'pointer' : 'default',
        transition: 'transform 0.15s, border-color 0.2s',
      }}
      onClick={() => {
        if (onSelectStation) {
          triggerHaptic('light');
          onSelectStation({
            id: commute.stationId,
            name: commute.stationName,
            lineId: commute.lineId,
            lineName: commute.lineName,
            ramal: commute.ramal,
          });
        }
      }}
    >
      {/* Top Bar: Line Badge, Label & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <LineBadge lineId={commute.lineId} size="small" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(118, 118, 128, 0.12)',
              color: 'var(--ios-text-secondary)',
            }}
          >
            {commute.label || 'Viaje habitual'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>
            {status.dayDescription}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Bell Toggle */}
          <button
            onClick={handleToggleBell}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: commute.reminderEnabled ? 'rgba(10, 132, 255, 0.14)' : 'rgba(118, 118, 128, 0.12)',
              border: commute.reminderEnabled ? '1px solid rgba(10, 132, 255, 0.35)' : '1px solid var(--ios-separator)',
              color: commute.reminderEnabled ? 'var(--ios-blue)' : 'var(--ios-text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={
              commute.reminderEnabled
                ? `Alarma activa: aviso ${commute.reminderMinutes || 10} min antes`
                : 'Activar recordatorio diario'
            }
          >
            {commute.reminderEnabled ? <Bell size={15} /> : <BellOff size={15} />}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="close-round-btn"
            title="Eliminar de horarios favoritos"
          >
            <Trash2 size={14} style={{ color: '#ff453a' }} />
          </button>
        </div>
      </div>

      {/* Origin & Destination Route */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)' }}>
          Estación habitual:
        </div>
        <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{commute.stationName}</span>
          <span style={{ color: 'var(--ios-text-tertiary)', fontSize: '14px' }}>➔</span>
          <span style={{ color: 'var(--ios-blue)' }}>{commute.destination}</span>
        </div>
      </div>

      {/* Time & Countdown Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '12px',
          background: 'rgba(118, 118, 128, 0.08)',
          marginBottom: matchedLiveTrain ? '10px' : '0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <Clock size={16} style={{ color: 'var(--ios-blue)', alignSelf: 'center', marginRight: '4px' }} />
          <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--ios-text-primary)', letterSpacing: '0.5px' }}>
            {commute.scheduledTime}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-tertiary)' }}>
            hs
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '8px',
              background: status.isSoon ? 'rgba(48, 209, 88, 0.18)' : 'rgba(118, 118, 128, 0.14)',
              color: status.isSoon ? 'var(--ios-green)' : 'var(--ios-text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {status.isSoon && (
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ios-green)', animation: 'pulse-ring 1.4s infinite' }} />
            )}
            {status.statusLabel}
          </span>
        </div>
      </div>

      {/* Live Train Real-Time Pill (if SOFSE reports live arrival nearby) */}
      {matchedLiveTrain && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'rgba(10, 132, 255, 0.09)',
            border: '1px solid rgba(10, 132, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} style={{ color: 'var(--ios-blue)', animation: 'pulse-ring 1.8s infinite' }} />
            <span style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
              Próximo en vivo:
            </span>
            <span style={{ color: 'var(--ios-text-secondary)' }}>
              {matchedLiveTrain.servicio?.leyenda || 'A horario'}
            </span>
          </div>

          <div style={{ fontWeight: 800, color: 'var(--ios-green)' }}>
            {formatArrivalSeconds(matchedLiveTrain.arribo?.segundos)}
          </div>
        </div>
      )}
    </div>
  );
}
