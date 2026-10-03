import React from 'react';
import { Bell, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { triggerHaptic } from '../utils/notifications';

export default function InAppNotificationToast({ toast, onClose, onAction }) {
  if (!toast) return null;

  const isAlert = toast.type === 'alert';
  const isSuccess = toast.type === 'arrival' || toast.type === 'success';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 16px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: '430px',
        zIndex: 99999,
        background: isAlert
          ? 'linear-gradient(135deg, rgba(40, 20, 20, 0.96), rgba(28, 28, 34, 0.98))'
          : 'linear-gradient(135deg, rgba(20, 32, 48, 0.96), rgba(28, 28, 34, 0.98))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isAlert ? '1px solid rgba(255, 69, 58, 0.5)' : '1px solid rgba(10, 132, 255, 0.4)',
        borderRadius: '18px',
        padding: '12px 14px',
        boxShadow: isAlert
          ? '0 12px 36px rgba(255, 69, 58, 0.25), 0 4px 14px rgba(0,0,0,0.6)'
          : '0 12px 36px rgba(10, 132, 255, 0.25), 0 4px 14px rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
        animation: 'slideInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        color: '#ffffff',
      }}
      onClick={() => {
        triggerHaptic('medium');
        if (onAction) onAction();
        onClose();
      }}
    >
      {/* Icon Capsule */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: isAlert ? 'rgba(255, 69, 58, 0.2)' : 'rgba(10, 132, 255, 0.2)',
          color: isAlert ? '#ff453a' : '#0a84ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '1px',
        }}
      >
        {isAlert ? <AlertTriangle size={20} /> : isSuccess ? <CheckCircle2 size={20} /> : <Bell size={20} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.3,
            marginBottom: '3px',
            letterSpacing: '-0.2px',
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            fontSize: '12.5px',
            color: 'rgba(255, 255, 255, 0.82)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {toast.body}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          triggerHaptic('light');
          onClose();
        }}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
        title="Cerrar notificación"
        aria-label="Cerrar notificación"
      >
        <X size={15} />
      </button>
    </div>
  );
}
