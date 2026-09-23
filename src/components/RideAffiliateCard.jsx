import React, { useState } from 'react';
import { Car, ExternalLink, Tag, X, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { MONETIZATION_CONFIG } from '../config/monetizationConfig';
import { triggerHaptic } from '../utils/notifications';

export default function RideAffiliateCard({
  reason = 'Demoras o servicio interrumpido en la red',
  lineName = '',
  compact = false,
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (dismissed) return null;

  const { cabify, uber, didi } = MONETIZATION_CONFIG.affiliates;

  const handleCopyCode = (code) => {
    triggerHaptic('light');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    triggerHaptic('light');
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      className="ios-card"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 25, 45, 0.95) 0%, rgba(20, 20, 26, 0.98) 100%)',
        border: '1px solid rgba(113, 82, 248, 0.4)',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
        padding: compact ? '12px 14px' : '16px 18px',
        marginBottom: '14px',
        position: 'relative',
        borderRadius: '16px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        title="Ocultar sugerencia"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: 'none',
          color: '#8e8e93',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <X size={13} />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', paddingRight: '24px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7152f8, #5031d6)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 10px rgba(113, 82, 248, 0.4)',
          }}
        >
          <Car size={17} />
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>¿Necesitás llegar a tiempo?</span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                background: 'rgba(255, 214, 10, 0.18)',
                color: '#ffd60a',
                border: '1px solid rgba(255, 214, 10, 0.35)',
                padding: '1px 6px',
                borderRadius: '6px',
              }}
            >
              PLAN B
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#ff9f0a', fontWeight: 600 }}>
            {lineName ? `Afectación en Línea ${lineName} • ` : ''}
            {reason}
          </div>
        </div>
      </div>

      {!compact && (
        <div style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '12px', lineHeight: 1.4 }}>
          Ante demoras o cancelaciones en las vías, podés pedir un auto y continuar tu trayecto sin perder tiempo:
        </div>
      )}

      {/* Ride apps actions grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          marginTop: '6px',
        }}
      >
        {/* Cabify Button */}
        <a
          href={cabify.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => triggerHaptic('medium')}
          style={{
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #7152f8, #5833e6)',
            color: '#ffffff',
            padding: '10px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 3px 12px rgba(113, 82, 248, 0.35)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>{cabify.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.9 }}>{cabify.discount}</div>
          </div>
          <ExternalLink size={14} style={{ opacity: 0.8 }} />
        </a>

        {/* Uber Button */}
        <a
          href={uber.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => triggerHaptic('medium')}
          style={{
            textDecoration: 'none',
            background: '#000000',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '10px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.5)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>{uber.name}</div>
            <div style={{ fontSize: '10px', color: '#a1a1aa' }}>Pedir viaje ahora</div>
          </div>
          <ExternalLink size={14} style={{ opacity: 0.8 }} />
        </a>

        {/* DiDi Button */}
        <a
          href={didi.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => triggerHaptic('medium')}
          style={{
            textDecoration: 'none',
            background: 'linear-gradient(135deg, #ff7700, #e65c00)',
            color: '#ffffff',
            padding: '10px 12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 3px 12px rgba(255, 119, 0, 0.35)',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>{didi.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.9 }}>Tarifas económicas</div>
          </div>
          <ExternalLink size={14} style={{ opacity: 0.8 }} />
        </a>
      </div>

      {/* Promo Code Info Footer */}
      <div
        style={{
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#8e8e93',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Tag size={12} style={{ color: '#ffd60a' }} />
          <span>Cupón sugerido de bienvenida:</span>
          <strong style={{ color: '#ffffff' }}>{cabify.promoCode}</strong>
        </span>

        <button
          onClick={() => handleCopyCode(cabify.promoCode)}
          style={{
            background: 'transparent',
            border: 'none',
            color: copiedCode ? '#30d158' : '#0a84ff',
            fontWeight: 700,
            fontSize: '10.5px',
            cursor: 'pointer',
            padding: '2px 4px',
          }}
        >
          {copiedCode ? '¡Copiado!' : 'Copiar código'}
        </button>
      </div>
    </div>
  );
}
