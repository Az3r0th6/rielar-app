import React, { useState } from 'react';
import {
  X,
  Sparkles,
  GitBranch,
  Calendar,
  Sun,
  BellRing,
  MapPin,
  Bus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic, playChimeSound } from '../utils/notifications';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';

export default function ChangelogModal({ isOpen, onClose, onNavigateToPlanner }) {
  if (!isOpen) return null;

  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleDismiss = () => {
    triggerHaptic('light');
    try {
      safeSessionStorage.setItem('rielar_changelog_dismissed_session', 'true');
      if (dontShowAgain) {
        safeLocalStorage.setItem('rielar_changelog_v20_never_show', 'true');
      }
    } catch {}
    onClose();
  };

  const handleGoToPlanner = () => {
    triggerHaptic('medium');
    playChimeSound('arrival');
    try {
      safeSessionStorage.setItem('rielar_changelog_dismissed_session', 'true');
      if (dontShowAgain) {
        safeLocalStorage.setItem('rielar_changelog_v20_never_show', 'true');
      }
    } catch {}
    onClose();
    if (onNavigateToPlanner) {
      onNavigateToPlanner();
    }
  };

  const updates = [
    {
      icon: <GitBranch size={20} color="#30d158" />,
      badge: 'NUEVO',
      badgeColor: '#30d158',
      badgeBg: 'rgba(48, 209, 88, 0.15)',
      title: 'Horarios organizados por Línea y Ramal',
      description:
        'Ahora la selección de estaciones de partida y llegada está organizada y subdividida por ramal oficial (ej. Once ⇄ Moreno, Tigre, La Plata). Con filtros rápidos por línea y autocompletado inteligente de cabeceras.',
    },
    {
      icon: <Calendar size={20} color="#0a84ff" />,
      badge: 'INCORPORADO',
      badgeColor: '#0a84ff',
      badgeBg: 'rgba(10, 132, 255, 0.15)',
      title: 'Grilla Completa de Horarios Oficiales',
      description:
        'Consultá la grilla cronológica de todos los servicios diarios de punta a punta, con horarios detallados para días hábiles, sábados, domingos y feriados.',
    },
    {
      icon: <Sun size={20} color="#ffd60a" />,
      badge: 'DISEÑO',
      badgeColor: '#ffd60a',
      badgeBg: 'rgba(255, 214, 10, 0.15)',
      title: 'Modo Claro de Alto Contraste',
      description:
        'Diseño renovado para exteriores y días soleados, con fondos blancos nítidos, tipografía con contraste marcado y sentidos de viaje destacados para no perder ningún tren.',
    },
    {
      icon: <BellRing size={20} color="#ff9f0a" />,
      badge: 'OPTIMIZADO',
      badgeColor: '#ff9f0a',
      badgeBg: 'rgba(255, 159, 10, 0.15)',
      title: 'Alertas Limpias y Deslizables',
      description:
        'El contador de alertas de la barra inferior ahora se pone en cero al ser leído, y podés descartar cualquier aviso de la vía deslizando la tarjeta hacia la derecha.',
    },
    {
      icon: <MapPin size={20} color="#bf5af2" />,
      badge: 'EN VIVO',
      badgeColor: '#bf5af2',
      badgeBg: 'rgba(191, 90, 242, 0.15)',
      title: 'Monitoreo en Vivo de Todas las Líneas',
      description:
        'Seguimiento en tiempo real corregido para todas las formaciones activas (Mitre, Sarmiento, Roca, San Martín, Belgrano Sur y Tren de la Costa).',
    },
    {
      icon: <Bus size={20} color="#64d2ff" />,
      badge: 'CONEXIONES',
      badgeColor: '#64d2ff',
      badgeBg: 'rgba(100, 210, 255, 0.15)',
      title: 'Transbordos y Colectivos Verificados',
      description:
        'Revisión y actualización de todas las líneas de colectivos y opciones de combinación en cada estación de la red.',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          background: 'var(--ios-card-solid)',
          color: 'var(--ios-text-primary)',
          border: '1px solid var(--ios-card-border)',
          borderRadius: '28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 14px',
            borderBottom: '1px solid var(--ios-separator, rgba(120, 120, 128, 0.15))',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(48, 209, 88, 0.15)',
                border: '1px solid rgba(48, 209, 88, 0.35)',
                color: '#30d158',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={13} />
              <span>Versión 2.0 • Actualización</span>
            </div>

            <button
              onClick={handleDismiss}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--ios-surface, rgba(120, 120, 128, 0.14))',
                border: 'none',
                color: 'var(--ios-text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            style={{
              margin: '0 0 6px',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--ios-text-primary)',
            }}
          >
            🎉 ¡Nuevas funciones en RielAR!
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '13.5px',
              color: 'var(--ios-text-secondary)',
              lineHeight: 1.45,
            }}
          >
            Actualizamos la aplicación con las mejoras que pediste para organizar mejor tus viajes en tren.
          </p>
        </div>

        {/* Scrollable Updates Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {updates.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: 'var(--ios-surface, rgba(120, 120, 128, 0.08))',
                border: '1px solid var(--ios-separator, rgba(120, 120, 128, 0.16))',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: item.badgeBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 800,
                      color: 'var(--ios-text-primary)',
                    }}
                  >
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: item.badgeBg,
                      color: item.badgeColor,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--ios-text-secondary)',
                    lineHeight: 1.5,
                    fontWeight: 400,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px 20px',
            borderTop: '1px solid var(--ios-separator, rgba(120, 120, 128, 0.15))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'var(--ios-card-solid)',
          }}
        >
          <button
            onClick={handleGoToPlanner}
            style={{
              width: '100%',
              padding: '13px 18px',
              borderRadius: '16px',
              border: 'none',
              background: '#0a84ff',
              color: '#ffffff',
              fontSize: '14.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(10, 132, 255, 0.35)',
              transition: 'transform 0.15s ease',
            }}
          >
            <span>Ver Horarios por Línea y Ramal</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid var(--ios-separator, rgba(120, 120, 128, 0.28))',
              background: 'var(--ios-surface, rgba(120, 120, 128, 0.08))',
              color: 'var(--ios-text-primary)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} color="#30d158" />
            <span>¡Entendido! Continuar a la app</span>
          </button>

          {/* Don't show again checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: '12px',
              color: 'var(--ios-text-secondary)',
              fontWeight: 500,
              paddingTop: '2px',
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{
                width: '15px',
                height: '15px',
                accentColor: '#30d158',
                cursor: 'pointer',
              }}
            />
            <span>No volver a mostrar automáticamente al iniciar</span>
          </label>
        </div>
      </div>
    </div>
  );
}
