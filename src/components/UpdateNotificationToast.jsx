import React from 'react';
import { Sparkles, RefreshCw, X, Rocket } from 'lucide-react';
import { triggerHaptic } from '../utils/notifications';

export default function UpdateNotificationToast({ onUpdate, onDismiss, isTabBarHidden = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: isTabBarHidden
          ? 'calc(env(safe-area-inset-bottom, 16px) + 16px)'
          : 'calc(env(safe-area-inset-bottom, 16px) + 76px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: '430px',
        zIndex: 99990,
        background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.22), rgba(24, 24, 30, 0.96))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(10, 132, 255, 0.45)',
        borderRadius: '18px',
        padding: '12px 14px',
        boxShadow: '0 12px 36px rgba(10, 132, 255, 0.3), 0 4px 14px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        color: '#ffffff',
      }}
    >
      {/* Icon & Message */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.35), rgba(0, 122, 255, 0.15))',
            border: '1px solid rgba(10, 132, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}
        >
          🚀
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: '13px',
              color: '#ffffff',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            ¡Nueva versión de RielAR!
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#a1a1a6',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Mejoras listas para usar al instante
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            if (onUpdate) onUpdate();
          }}
          style={{
            background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '7px 12px',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 10px rgba(10, 132, 255, 0.4)',
            transition: 'transform 0.1s',
          }}
        >
          <RefreshCw size={12} />
          <span>Actualizar</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            if (onDismiss) onDismiss();
          }}
          title="Descartar"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#8e8e93',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
