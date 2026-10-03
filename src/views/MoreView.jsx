import React, { useState, useRef } from 'react';
import {
  Download,
  Copy,
  Check,
  Share2,
  FileArchive,
  Bell,
  Volume2,
  Code2,
  Sparkles,
  ShieldCheck,
  Info,
  Smartphone,
  Laptop,
  AlertCircle,
  Sun,
  Moon,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  triggerHaptic,
  playChimeSound,
  sendAppNotification,
  requestNotificationPermission,
} from '../utils/notifications';
import BugReportSection from '../components/BugReportSection';
import SupportProjectSection from '../components/SupportProjectSection';
import PassengerGuideSection from '../components/PassengerGuideSection';
import { safeLocalStorage } from '../utils/safeStorage';

export default function MoreView({
  onInstallApp,
  theme = 'dark',
  onToggleTheme,
  onOpenChangelog,
}) {
  const [activeSection, setActiveSection] = useState('download'); // 'download' | 'guide' | 'notifications' | 'support' | 'reports' | 'credits'
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedDownload, setCopiedDownload] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  const handleCheckUpdate = async () => {
    triggerHaptic('light');
    setCheckingUpdate(true);
    setUpdateStatusMsg('');
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            window.dispatchEvent(new CustomEvent('rielar:sw-update', { detail: { registration: reg } }));
            setUpdateStatusMsg('¡Nueva actualización lista!');
            triggerHaptic('success');
          } else {
            setUpdateStatusMsg('¡RielAR ya está actualizado!');
            triggerHaptic('light');
          }
        } else {
          setUpdateStatusMsg('Versión web al día');
        }
      } else {
        setUpdateStatusMsg('Versión al día');
      }
    } catch {
      setUpdateStatusMsg('Al día con el servidor');
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => setUpdateStatusMsg(''), 4500);
    }
  };

  const ownerCreditsTapRef = useRef({ count: 0, lastTime: 0 });

  const handleOwnerCreditsTap = () => {
    const now = Date.now();
    if (now - ownerCreditsTapRef.current.lastTime > 2000) {
      ownerCreditsTapRef.current.count = 1;
    } else {
      ownerCreditsTapRef.current.count += 1;
      if (ownerCreditsTapRef.current.count >= 5) {
        try {
          safeLocalStorage.setItem('rielar_owner_device', 'true');
        } catch {}
        triggerHaptic('success');
        setActiveSection('reports');
        ownerCreditsTapRef.current.count = 0;
        return;
      } else {
        triggerHaptic('light');
      }
    }
    ownerCreditsTapRef.current.lastTime = now;
  };

  const OFFICIAL_URL = 'https://rielar-app.onrender.com';
  const directDownloadUrl =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? `${window.location.origin}/?descargar=true`
      : `${OFFICIAL_URL}/?descargar=true`;

  const handleCopyDownloadLink = () => {
    triggerHaptic('light');
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(directDownloadUrl)
        .then(() => {
          setCopiedDownload(true);
          setTimeout(() => setCopiedDownload(false), 2000);
        })
        .catch(() => fallbackCopy(directDownloadUrl));
    } else {
      fallbackCopy(directDownloadUrl);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedDownload(true);
      setTimeout(() => setCopiedDownload(false), 2000);
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
    document.body.removeChild(textArea);
  };

  const handleTestNotification = async () => {
    triggerHaptic('medium');
    await requestNotificationPermission();
    sendAppNotification(
      '🚆 RielAR • Notificación de Prueba',
      'Tu tren a Tigre llega en 3 minutos al Andén 1 de Retiro. ¡Que tengas buen viaje!',
      { type: 'arrival' }
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div>
          <h1 className="ios-large-title">Otros</h1>
          <div className="ios-subtitle">
            <span>
              {activeSection === 'download' && 'Descarga e instalación directa en tu dispositivo'}
              {activeSection === 'guide' && 'Pases libres CUD, tarifas sociales, estudiantes y normativa oficial'}
              {activeSection === 'notifications' && 'Preferencias de alertas sonoras y push'}
              {activeSection === 'support' && 'Aporte voluntario por Mercado Pago para mantener la app activa y sin publicidad'}
              {activeSection === 'reports' && 'Reportes de fallos en horarios, estaciones o la app'}
              {activeSection === 'credits' && 'Desarrollo oficial por Martin Calvo Ruiz'}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Control Bar */}
      <div
        className="ios-segmented-control"
        style={{
          margin: '0 16px 14px',
          display: 'flex',
          gap: '4px',
          padding: '4px',
          overflowX: 'auto',
        }}
      >
        <button
          className={`segmented-option ${activeSection === 'download' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('download');
          }}
        >
          📲 Descarga
        </button>

        <button
          className={`segmented-option ${activeSection === 'guide' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('guide');
          }}
        >
          ♿ Guía & CUD
        </button>

        <button
          className={`segmented-option ${activeSection === 'notifications' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('notifications');
          }}
        >
          🔔 Alertas
        </button>

        <button
          className={`segmented-option ${activeSection === 'support' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('support');
          }}
        >
          💙 Apoyar
        </button>

        <button
          className={`segmented-option ${activeSection === 'reports' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('reports');
          }}
        >
          🚨 Reportes
        </button>

        <button
          className={`segmented-option ${activeSection === 'credits' ? 'active' : ''}`}
          style={{ padding: '8px 10px', fontSize: '12px', flexShrink: 0 }}
          onClick={() => {
            triggerHaptic('light');
            setActiveSection('credits');
          }}
        >
          👨‍💻 Créditos
        </button>
      </div>

      <div style={{ padding: '0 16px 28px' }}>
        {/* Appearance / Theme Switcher Card (Modo Claro / Modo Oscuro) */}
        <div
          className="ios-card"
          style={{
            margin: '0 0 16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: theme === 'dark' ? 'rgba(10, 132, 255, 0.15)' : 'rgba(255, 149, 0, 0.15)',
                color: theme === 'dark' ? '#0a84ff' : '#ff9500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                {theme === 'dark' ? 'Tema oscuro de alto contraste' : 'Tema claro para luz de día'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              if (onToggleTheme) onToggleTheme();
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: 'none',
              background: theme === 'dark' ? '#0a84ff' : '#ff9500',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'Activar Claro' : 'Activar Oscuro'}</span>
          </button>
        </div>

        {/* Version & Update Detector Card */}
        <div
          className="ios-card"
          style={{
            margin: '0 0 16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(48, 209, 88, 0.15)',
                color: '#30d158',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🚀
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                Versión v1.0.5{' '}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#30d158',
                    background: 'rgba(48, 209, 88, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                  }}
                >
                  Build 25
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                {updateStatusMsg || 'Servidor sincronizado con Render'}
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--ios-text-primary)',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: checkingUpdate ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }} />
            <span>{checkingUpdate ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </div>
        {/* ========================================================
            SECCIÓN: DESCARGA DIRECTA DE LA APP
            ======================================================== */}
        {activeSection === 'download' && (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              Apartado de Descarga Directa
            </div>

            <div
              className="ios-card"
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.14), var(--ios-card-solid))',
                border: '1px solid rgba(10, 132, 255, 0.35)',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(10, 132, 255, 0.45)',
                    flexShrink: 0,
                  }}
                >
                  <Download size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--ios-text-primary)' }}>
                    Descargar RielAR en tu Celular
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                    Instalación directa para iOS, Android y PC
                  </div>
                </div>
              </div>

              {/* Direct Download Action Button */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  if (onInstallApp) onInstallApp();
                }}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0a84ff, #0066cc)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(10, 132, 255, 0.4)',
                  marginBottom: '12px',
                }}
              >
                <Download size={17} />
                <span>Instalar / Descargar Ahora</span>
              </button>

              {/* Link Copy Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '11.5px',
                    color: '#0a84ff',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '210px',
                  }}
                >
                  {directDownloadUrl}
                </span>
                <button
                  onClick={handleCopyDownloadLink}
                  style={{
                    background: copiedDownload ? '#30d158' : 'rgba(255, 255, 255, 0.14)',
                    color: copiedDownload ? '#000000' : '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {copiedDownload ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedDownload ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              {/* Actions: WhatsApp & Zip Download */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Descargá RielAR: App de movilidad de trenes en tiempo real creada por Martin Calvo Ruiz: ' + directDownloadUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    color: '#25d366',
                    borderRadius: '12px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Share2 size={14} />
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
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FileArchive size={14} />
                  <span>Bajar .ZIP</span>
                </a>
              </div>
            </div>

            {/* Step-by-Step Installation Guides */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              Guía de Instalación por Dispositivo
            </div>

            <div className="ios-card" style={{ padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>🍏</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--ios-text-primary)' }}>iPhone (Safari)</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>Sin pasar por App Store</div>
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.5, paddingLeft: '30px' }}>
                1. Abrí el enlace en el navegador <strong>Safari</strong>.<br />
                2. Tocá el botón central <strong>Compartir</strong> (icono de cuadrado con flecha arriba).<br />
                3. Elegí <strong>"Agregar al inicio"</strong> y confirmá con "Agregar".
              </div>
            </div>

            <div className="ios-card" style={{ padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--ios-text-primary)' }}>Android (Chrome)</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>Acceso PWA nativo</div>
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.5, paddingLeft: '30px' }}>
                1. Abrí el enlace en <strong>Google Chrome</strong>.<br />
                2. Tocá el menú de tres puntos (<strong>⋮</strong>) arriba a la derecha.<br />
                3. Seleccioná <strong>"Instalar aplicación"</strong> o "Agregar a la pantalla principal".
              </div>
            </div>

            <div className="ios-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>💻</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--ios-text-primary)' }}>PC / Mac</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>Chrome, Edge o Brave</div>
                </div>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.5, paddingLeft: '30px' }}>
                Tocá el icono de pantalla con flecha en la barra de direcciones superior para instalar como app de escritorio.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SECCIÓN: GUÍA DEL PASAJERO, CUD Y BENEFICIOS SOCIALES
            ======================================================== */}
        {activeSection === 'guide' && (
          <PassengerGuideSection />
        )}

        {/* ========================================================
            SECCIÓN: CONFIGURACIÓN DE NOTIFICACIONES
            ======================================================== */}
        {activeSection === 'notifications' && (
          <div>
            {/* Notifications settings */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              Configuración de Notificaciones
            </div>

            <div className="ios-card" style={{ padding: '0 16px', marginBottom: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid var(--ios-separator)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={22} style={{ color: 'var(--ios-blue)' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ios-text-primary)' }}>Notificaciones Push</div>
                    <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Alertas ante demoras y cancelaciones</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifEnabled}
                  onChange={(e) => {
                    triggerHaptic('light');
                    setNotifEnabled(e.target.checked);
                  }}
                  style={{ width: '22px', height: '22px', accentColor: '#30d158', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Volume2 size={22} style={{ color: 'var(--ios-green)' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ios-text-primary)' }}>Sonido de Arribo (Chime)</div>
                    <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Campana armónica cuando el tren se aproxima</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => {
                    triggerHaptic('light');
                    setSoundEnabled(e.target.checked);
                    if (e.target.checked) playChimeSound('arrival');
                  }}
                  style={{ width: '22px', height: '22px', accentColor: '#30d158', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Test Push Button */}
            <button
              onClick={handleTestNotification}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '16px',
                color: '#0a84ff',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '18px',
              }}
            >
              <Bell size={16} />
              <span>Probar Sonido y Notificación de Arribo</span>
            </button>

            {/* How alerts work informative card */}
            <div
              className="ios-card"
              style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Info size={16} style={{ color: '#0a84ff' }} />
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#f5f5f7' }}>
                  ¿Cómo funcionan los avisos?
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e93', lineHeight: 1.5 }}>
                • <strong>Aviso a 2 minutos:</strong> Te notificamos cuando la formación esté ingresando al andén correspondiente.<br />
                • <strong>Dynamic Island:</strong> Si fijás un tren en la isla dinámica, verás la cuenta regresiva en vivo en la parte superior.<br />
                • <strong>Sonido armónico:</strong> Reproduce un chime relajante sintetizado para no perturbar.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SECCIÓN: APOYAR AL PROYECTO (CAFECITO / MERCADO PAGO)
            ======================================================== */}
        {activeSection === 'support' && <SupportProjectSection />}

        {/* ========================================================
            SECCIÓN: REPORTAR FALLOS O PROBLEMAS
            ======================================================== */}
        {activeSection === 'reports' && <BugReportSection />}

        {/* ========================================================
            SECCIÓN: CRÉDITOS Y DESARROLLO OFICIAL
            ======================================================== */}
        {activeSection === 'credits' && (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              Créditos y Desarrollo Oficial
            </div>

            <div
              className="ios-card"
              style={{
                padding: '22px',
                background: 'linear-gradient(135deg, rgba(0, 159, 227, 0.12), var(--ios-card-solid))',
                border: '1px solid rgba(0, 159, 227, 0.3)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '16px',
              }}
            >
              <div
                onClick={handleOwnerCreditsTap}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #009fe3, #0077b6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    boxShadow: '0 4px 18px rgba(0, 159, 227, 0.4)',
                    flexShrink: 0,
                  }}
                >
                  👨‍💻
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--ios-text-primary)' }}>
                      Martin Calvo Ruiz
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        background: 'rgba(48, 209, 88, 0.18)',
                        color: 'var(--ios-green)',
                        border: '1px solid rgba(48, 209, 88, 0.35)',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      CREADOR & DESARROLLADOR
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '3px' }}>
                    Diseño, arquitectura de software y desarrollo de RielAR
                  </div>
                </div>
              </div>

              <div
                style={{
                  paddingTop: '14px',
                  borderTop: '1px solid var(--ios-separator)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12.5px',
                  color: 'var(--ios-text-secondary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={14} style={{ color: 'var(--ios-blue)' }} />
                    <span>Programación & Código</span>
                  </span>
                  <span style={{ color: 'var(--ios-text-primary)', fontWeight: 700 }}>Martin Calvo Ruiz</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} style={{ color: '#ffd60a' }} />
                    <span>Aplicación</span>
                  </span>
                  <span style={{ color: 'var(--ios-text-primary)', fontWeight: 600 }}>RielAR v2.0 • PWA</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} style={{ color: 'var(--ios-green)' }} />
                    <span>Seguridad SSL</span>
                  </span>
                  <span style={{ color: 'var(--ios-green)', fontWeight: 600 }}>HTTPS Cifrado</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Datos en Tiempo Real</span>
                  <span style={{ color: 'var(--ios-blue)', fontWeight: 600 }}>Datos Públicos Abiertos (SOFSE)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Origen</span>
                  <span style={{ color: 'var(--ios-text-primary)', fontWeight: 600 }}>Buenos Aires, Argentina 🇦🇷</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Privacidad</span>
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ios-blue)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Ver Política de Privacidad ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Government Disclaimer & Official Sources Card (Google Play Compliance) */}
            <div
              className="ios-card"
              style={{
                padding: '16px',
                border: '1px solid rgba(255, 214, 10, 0.25)',
                background: 'rgba(255, 214, 10, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: '#ffd60a',
                    textTransform: 'uppercase',
                  }}
                >
                  Exención de Responsabilidad Gubernamental
                </span>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                <strong>RielAR es una aplicación de desarrollo independiente</strong> y no representa, ni está afiliada, autorizada o respaldada oficialmente por Trenes Argentinos (SOFSE), el Ministerio de Transporte, ni por el Gobierno de la República Argentina ni ninguna otra entidad gubernamental.
              </p>

              <div
                style={{
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                  Fuentes oficiales de información consultadas:
                </div>
                <a
                  href="https://www.argentina.gob.ar/transporte/trenes-argentinos"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ios-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>• Trenes Argentinos en argentina.gob.ar</span>
                  <span style={{ fontSize: '10px' }}>↗</span>
                </a>
                <a
                  href="https://trenesargentinos.gob.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ios-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>• Portal oficial trenesargentinos.gob.ar</span>
                  <span style={{ fontSize: '10px' }}>↗</span>
                </a>
              </div>
            </div>

            {/* Privacy Policy Card for Google Play */}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="ios-card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid rgba(0, 159, 227, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(0, 159, 227, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  🛡️
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ios-text-primary)' }}>
                    Política de Privacidad
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                    Cumplimiento para Google Play Store, permisos de ubicación y datos
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--ios-text-tertiary)' }} />
            </a>

            {/* Quick Support Callout in Credits */}
            <div
              className="ios-card"
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(0, 159, 227, 0.12), var(--ios-card-solid))',
                border: '1px solid rgba(0, 159, 227, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>💙</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ios-text-primary)' }}>
                    ¿Te resulta útil RielAR?
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ios-text-secondary)' }}>
                    Hacé un aporte voluntario por Mercado Pago para los servidores
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setActiveSection('support');
                }}
                style={{
                  background: 'linear-gradient(135deg, #009fe3, #0077b6)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Apoyar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
