import React, { useState } from 'react';
import {
  Coffee,
  Heart,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Sparkles,
  Server,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { MONETIZATION_CONFIG } from '../config/monetizationConfig';
import { triggerHaptic } from '../utils/notifications';

export default function SupportProjectSection() {
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [activeTab, setActiveTab] = useState('cafecito'); // 'cafecito' | 'mercadopago'
  const { cafecitoUrl, mercadoPago, tiers, benefitsText } = MONETIZATION_CONFIG.donations;

  const handleCopyAlias = () => {
    triggerHaptic('medium');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(mercadoPago.alias)
        .then(() => {
          setCopiedAlias(true);
          setTimeout(() => setCopiedAlias(false), 2200);
        })
        .catch(() => fallbackCopy(mercadoPago.alias));
    } else {
      fallbackCopy(mercadoPago.alias);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2200);
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
    document.body.removeChild(textArea);
  };

  const handleShareApp = () => {
    triggerHaptic('light');
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rielar-app.onrender.com';
    const text = 'Te comparto RielAR, la app en tiempo real de trenes de Buenos Aires (rápida, precisa y sin publicidad molesta): ' + shareUrl;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'RielAR • Trenes en Vivo',
        text,
        url: shareUrl,
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div>
      {/* Subheader */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color: '#8e8e93',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
          paddingLeft: '4px',
        }}
      >
        Comunidad & Sostenimiento
      </div>

      {/* Main Hero Card */}
      <div
        className="ios-card"
        style={{
          padding: '22px 20px',
          background: 'linear-gradient(145deg, rgba(255, 149, 0, 0.15) 0%, rgba(28, 28, 35, 0.98) 100%)',
          border: '1px solid rgba(255, 149, 0, 0.35)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ff9500, #ff5e3a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 18px rgba(255, 149, 0, 0.45)',
              flexShrink: 0,
              fontSize: '26px',
            }}
          >
            ☕
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800, fontSize: '18px', color: '#ffffff' }}>
                Apoyá el proyecto RielAR
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: 'rgba(255, 149, 0, 0.2)',
                  color: '#ff9f0a',
                  border: '1px solid rgba(255, 149, 0, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  letterSpacing: '0.04em',
                }}
              >
                100% INDEPENDIENTE
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px', lineHeight: 1.45 }}>
              RielAR fue desarrollada para que los pasajeros viajen mejor, sin publicidad invasiva ni trabas.
              Tu aporte voluntario mantiene los servidores y la API en vivo activos todos los días.
            </div>
          </div>
        </div>

        {/* Benefits list */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {benefitsText.map((benefit, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#d1d1d6' }}>
              <Check size={14} style={{ color: '#30d158', flexShrink: 0 }} />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        {/* Payment Method Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '3px',
            marginBottom: '14px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('cafecito');
            }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'cafecito' ? '#ff9500' : 'transparent',
              color: activeTab === 'cafecito' ? '#000000' : '#ffffff',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>☕ Cafecito</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('mercadopago');
            }}
            style={{
              flex: 1,
              padding: '9px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'mercadopago' ? '#009fe3' : 'transparent',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💙 Mercado Pago</span>
          </button>
        </div>

        {/* TAB: CAFECITO */}
        {activeTab === 'cafecito' && (
          <div>
            {/* Quick suggested tiers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {tiers.map((t, idx) => (
                <a
                  key={idx}
                  href={cafecitoUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHaptic('light')}
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(255, 149, 0, 0.12)',
                    border: '1px solid rgba(255, 149, 0, 0.3)',
                    borderRadius: '12px',
                    padding: '10px 6px',
                    textAlign: 'center',
                    display: 'block',
                    transition: 'transform 0.15s',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '2px' }}>{t.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5f5f7' }}>{t.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#ff9f0a', marginTop: '2px' }}>
                    ${t.amount.toLocaleString('es-AR')}
                  </div>
                </a>
              ))}
            </div>

            {/* Direct Cafecito CTA Button */}
            <a
              href={cafecitoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic('medium')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #ff9500, #e08500)',
                color: '#000000',
                fontWeight: 800,
                fontSize: '14.5px',
                textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(255, 149, 0, 0.4)',
                cursor: 'pointer',
              }}
            >
              <span>Invitar un Cafecito en cafecito.app</span>
              <ExternalLink size={16} />
            </a>
          </div>
        )}

        {/* TAB: MERCADO PAGO */}
        {activeTab === 'mercadopago' && (
          <div>
            <div
              style={{
                background: 'rgba(0, 159, 227, 0.12)',
                border: '1px solid rgba(0, 159, 227, 0.3)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '12px',
              }}
            >
              <div style={{ fontSize: '11.5px', color: '#8e8e93', fontWeight: 600, marginBottom: '4px' }}>
                Transferencia directa por Alias o CVU
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 800,
                    color: '#009fe3',
                    letterSpacing: '0.02em',
                  }}
                >
                  {mercadoPago.alias}
                </span>

                <button
                  onClick={handleCopyAlias}
                  style={{
                    background: copiedAlias ? '#30d158' : 'rgba(0, 159, 227, 0.25)',
                    color: copiedAlias ? '#000000' : '#ffffff',
                    border: '1px solid rgba(0, 159, 227, 0.5)',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copiedAlias ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedAlias ? 'Copiado' : 'Copiar Alias'}</span>
                </button>
              </div>

              <div style={{ fontSize: '11.5px', color: '#a1a1aa', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                Titular: <strong style={{ color: '#ffffff' }}>{mercadoPago.holder}</strong> ({mercadoPago.entity})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Free alternative to help: Share the app */}
      <div
        className="ios-card"
        style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(48, 209, 88, 0.15)',
              color: '#30d158',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Share2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
              ¿No podés aportar dinero?
            </div>
            <div style={{ fontSize: '11.5px', color: '#8e8e93' }}>
              Compartí RielAR con amigos o en grupos de trenes
            </div>
          </div>
        </div>

        <button
          onClick={handleShareApp}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f5f5f7',
            padding: '8px 12px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Share2 size={13} />
          <span>Difundir</span>
        </button>
      </div>
    </div>
  );
}
