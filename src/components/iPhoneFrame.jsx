import React, { useState } from 'react';
import {
  Copy,
  Check,
  X,
  Share2,
  ShieldCheck,
  Download,
  FileArchive,
} from 'lucide-react';
import DynamicIsland from './DynamicIsland';
import { playChimeSound, triggerHaptic } from '../utils/notifications';

export default function iPhoneFrame({
  children,
  tabBar,
  modals,
  overlayModals,
  onContentScroll,
  isHeaderHidden,
  showDownloadModal,
  onCloseDownloadModal,
  onInstallApp,
  trackingTrain,
  onClearTracking,
  onOpenDetails,
}) {
  const [copied, setCopied] = useState(false);

  const OFFICIAL_URL = 'https://rielar-app.onrender.com';
  const mobileUrl = typeof window !== 'undefined' && window.location.protocol === 'https:' ? window.location.origin : OFFICIAL_URL;

  const handleCopyLink = () => {
    triggerHaptic('light');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mobileUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy(mobileUrl));
    } else {
      fallbackCopy(mobileUrl);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy fallback failed:', e);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="app-viewport-container">
      {/* Main Screen Viewport */}
      <div className="iphone-frame">
        {/* Dynamic Island (Floating widget for live countdowns) */}
        <DynamicIsland
          trackingTrain={trackingTrain}
          onClearTracking={onClearTracking}
          onOpenDetails={onOpenDetails}
        />

        {/* Screen View */}
        <div
          className={`app-screen-content ${isHeaderHidden ? 'header-hidden' : ''}`}
          onScroll={onContentScroll}
        >
          {children}
        </div>

        {/* Fixed Tab Bar at Bottom */}
        {tabBar}

        {/* Full-screen bottom sheet modals (Placed AFTER tabBar so they always layer ABOVE tabBar!) */}
        {modals}
      </div>

      {/* Full-screen Application Overlay Modals */}
      {overlayModals}

      {/* Modal: Download & Install App on iOS / Android (Zero Install) */}
      {(showDownloadModal) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => {
            if (onCloseDownloadModal) onCloseDownloadModal();
          }}
        >
          <div
            className="ios-card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              background: 'rgba(28, 28, 32, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                if (onCloseDownloadModal) onCloseDownloadModal();
              }}
              className="close-round-btn"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>📲</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f5f5f7' }}>
                Descargar RielAR en tu Celular
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(48, 209, 88, 0.15)', border: '1px solid rgba(48, 209, 88, 0.3)', padding: '4px 10px', borderRadius: '12px', marginTop: '6px' }}>
                <ShieldCheck size={14} style={{ color: '#30d158' }} />
                <span style={{ color: '#30d158', fontSize: '11.5px', fontWeight: 700 }}>Conexión 100% Segura HTTPS • Creado por Martin Calvo Ruiz</span>
              </div>
              <p style={{ fontSize: '13px', color: '#8e8e93', marginTop: '8px', lineHeight: '1.4' }}>
                Instalación directa para <strong>Android (Chrome)</strong> e <strong>iPhone (Safari)</strong> sin tiendas de aplicaciones.
              </p>
            </div>

            {/* QR Code */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px',
                borderRadius: '16px',
                width: '160px',
                height: '160px',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mobileUrl)}`}
                onError={(e) => { e.target.src = '/qr-mobile.png'; }}
                alt="Escanear con celular"
                style={{ width: '100%', height: '100%', borderRadius: '8px' }}
              />
            </div>

            {/* Direct Download Action Button */}
            <button
              onClick={() => {
                triggerHaptic('medium');
                if (onInstallApp) onInstallApp();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: '#0a84ff',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '10px',
                boxShadow: '0 4px 16px rgba(10, 132, 255, 0.4)',
              }}
            >
              <Download size={16} />
              <span>⚡ Descargar / Instalar en este Dispositivo</span>
            </button>

            {/* Direct Link */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '12px',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0a84ff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {`${mobileUrl}/?descargar=true`}
              </span>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  fallbackCopy(`${mobileUrl}/?descargar=true`);
                }}
                style={{
                  background: copied ? '#30d158' : 'rgba(10, 132, 255, 0.2)',
                  border: 'none',
                  color: copied ? '#000000' : '#0a84ff',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Actions: WhatsApp & Zip Download */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Descargá RielAR: App de movilidad de trenes en tiempo real creada por Martin Calvo Ruiz: ' + mobileUrl + '/?descargar=true')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: 'none',
                  background: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.35)',
                  color: '#25d366',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </a>

              <a
                href="/RielAR-App.zip"
                download="RielAR-App.zip"
                style={{
                  textDecoration: 'none',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f5f5f7',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <FileArchive size={13} />
                <span>Bajar .ZIP</span>
              </a>
            </div>

            {/* Instructions per OS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#f5f5f7', marginBottom: '4px' }}>
                  🍎 En iPhone (iOS)
                </div>
                <div style={{ fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>
                  1. Abrí el enlace en Safari.<br />
                  2. Tocá el botón <strong>Compartir</strong>.<br />
                  3. Elegí <strong>«Agregar a Inicio»</strong> para usarla a pantalla completa.
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '12px', color: '#f5f5f7', marginBottom: '4px' }}>
                  🤖 En Android
                </div>
                <div style={{ fontSize: '11px', color: '#8e8e93', lineHeight: '1.4' }}>
                  1. Abrí el enlace en Chrome.<br />
                  2. Tocá <strong>«Instalar»</strong> en el aviso o en el menú de 3 puntos.<br />
                  3. Queda lista en tu pantalla de inicio.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

