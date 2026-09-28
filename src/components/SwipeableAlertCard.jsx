import React, { useState, useRef } from 'react';
import { Trash2, X, Clock, ArrowRight } from 'lucide-react';
import LineBadge from './LineBadge';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function SwipeableAlertCard({
  incident,
  badge,
  onDismiss,
  onNavigateToPlanner,
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(null);

  const Icon = badge.icon;
  const DISMISS_THRESHOLD = 90;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Detect if the user is swiping horizontally or scrolling vertically
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current) {
      // Allow swiping left (negative diffX) or swiping right
      // Slightly resist beyond threshold
      const resistance = Math.abs(diffX) > DISMISS_THRESHOLD ? 0.6 : 1;
      setTranslateX(diffX * resistance);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (Math.abs(translateX) > DISMISS_THRESHOLD) {
      triggerDismiss(translateX < 0 ? -1 : 1);
    } else {
      setTranslateX(0);
    }
  };

  const triggerDismiss = (direction = -1) => {
    triggerHaptic('medium');
    playChimeSound('click');
    setIsRemoving(true);
    setTranslateX(direction * 400);

    setTimeout(() => {
      if (onDismiss) onDismiss(incident);
    }, 240);
  };

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        marginBottom: isRemoving ? '0' : '10px',
        maxHeight: isRemoving ? '0' : '300px',
        opacity: isRemoving ? 0 : 1,
        transition: isRemoving
          ? 'max-height 0.25s ease-out, opacity 0.2s ease-out, margin 0.25s ease-out'
          : 'none',
      }}
    >
      {/* Background Revealed on Swipe (Red Dismiss Action) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #ff453a 0%, #d70015 100%)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: translateX < 0 ? 'flex-end' : 'flex-start',
          padding: '0 24px',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '13px',
          gap: '8px',
        }}
      >
        <Trash2 size={20} />
        <span>Descartar aviso</span>
      </div>

      {/* Swipeable Card Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          background: 'var(--ios-card)',
          borderRadius: '16px',
          border: `1px solid ${badge.border}`,
          borderLeft: `5px solid ${badge.border}`,
          padding: '14px',
          boxShadow: 'var(--shadow-sm)',
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'pan-y',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineBadge lineId={incident.lineId} lineName={incident.lineName} size="small" />
            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ios-text-primary)' }}>
              {incident.ramalName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Status Pill */}
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon size={12} />
              <span>{badge.label}</span>
            </span>

            {/* Quick Dismiss / Delete Button (for tap or desktop) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerDismiss(-1);
              }}
              style={{
                background: 'rgba(118, 118, 128, 0.12)',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ios-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Descartar y eliminar este aviso"
              aria-label="Descartar y eliminar este aviso"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div
          style={{
            fontSize: '14px',
            color: 'var(--ios-text-primary)',
            lineHeight: '1.45',
            fontWeight: 500,
          }}
        >
          {incident.content}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {incident.since ? (
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--ios-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={12} />
              <span>Vigente desde: {incident.since}</span>
            </div>
          ) : (
            <div />
          )}

          {/* Swipe indicator tip */}
          <span
            style={{
              fontSize: '10.5px',
              color: 'var(--ios-text-tertiary)',
              opacity: 0.8,
            }}
          >
            ← Deslizá para eliminar
          </span>
        </div>

        {/* Direct action to planner */}
        {onNavigateToPlanner && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateToPlanner();
            }}
            style={{
              marginTop: '10px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(10, 132, 255, 0.1)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
              color: '#0a84ff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <span>Ver alternativas en Planificador</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
