import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Bike,
  HeartHandshake,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { triggerHaptic } from '../utils/notifications';

export default function PassengerGuideSection() {
  const [expandedCard, setExpandedCard] = useState('cud'); // 'cud' is expanded by default

  const toggleCard = (id) => {
    triggerHaptic('light');
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Intro Header Card */}
      <div
        className="ios-card"
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.15) 0%, rgba(20, 20, 26, 0.95) 100%)',
          border: '1px solid rgba(10, 132, 255, 0.3)',
          borderRadius: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(10, 132, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a84ff',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
              Guía Oficial de Derechos y Beneficios
            </div>
            <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
              Información legal y operativa para viajar en toda la red ferroviaria
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: CUD Y PERSONAS CON DISCAPACIDAD */}
      <div
        className="ios-card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid rgba(48, 209, 88, 0.3)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <div
          onClick={() => toggleCard('cud')}
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: expandedCard === 'cud' ? 'rgba(48, 209, 88, 0.08)' : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(48, 209, 88, 0.18)',
                color: '#30d158',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              ♿
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                Pase Libre con CUD (Discapacidad)
              </div>
              <div style={{ fontSize: '11.5px', color: '#30d158', fontWeight: 600 }}>
                100% Gratuito • Ley Nacional 22.431
              </div>
            </div>
          </div>
          {expandedCard === 'cud' ? (
            <ChevronUp size={20} style={{ color: '#8e8e93' }} />
          ) : (
            <ChevronDown size={20} style={{ color: '#8e8e93' }} />
          )}
        </div>

        {expandedCard === 'cud' && (
          <div style={{ padding: '0 16px 16px', fontSize: '12.5px', color: '#c7c7cc', lineHeight: 1.5 }}>
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {/* How to travel */}
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} style={{ color: '#30d158' }} /> ¿Cómo viajar en trenes metropolitanos?
                </strong>
                <p style={{ margin: '4px 0 0 21px' }}>
                  Presentá tu <strong>DNI</strong> y el <strong>CUD original</strong> ante el personal de molinetes o boletería. El CUD es 100% válido tanto en <strong>formato papel</strong> como en <strong>formato digital desde la app oficial Mi Argentina</strong>. El personal ferroviario debe franquear el molinete accesible de inmediato.
                </p>
              </div>

              {/* Companion */}
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} style={{ color: '#30d158' }} /> Acompañante sin costo:
                </strong>
                <p style={{ margin: '4px 0 0 21px' }}>
                  Si tu certificado indica la leyenda <strong>"CON ACOMPAÑANTE"</strong>, la persona que viaja con vos también tiene derecho a viajar <strong>completamente gratis</strong>.
                </p>
              </div>

              {/* SUBE Pass */}
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} style={{ color: '#0a84ff' }} /> Pase Libre en Tarjeta SUBE:
                </strong>
                <p style={{ margin: '4px 0 0 21px' }}>
                  Para no depender de pedir apertura manual en cada viaje, podés tramitar el <strong>Pase Libre en tu tarjeta SUBE</strong> en los Centros de Atención de las cabeceras (Retiro, Constitución, Once, etc.) presentando CUD y DNI. Tu SUBE abrirá automáticamente los molinetes sin cobrar saldo.
                </p>
              </div>

              {/* Service Dogs */}
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🐕 Perros de Asistencia y Lazarillos:
                </strong>
                <p style={{ margin: '4px 0 0 21px' }}>
                  Por la Ley Nacional 26.858, los perros guía tienen <strong>libre acceso permanente</strong> a todas las formaciones y andenes junto a su titular.
                </p>
              </div>

              {/* Long Distance Reservation */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(10, 132, 255, 0.08)',
                  border: '1px solid rgba(10, 132, 255, 0.25)',
                  marginTop: '10px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0a84ff', marginBottom: '4px' }}>
                  🚄 Trenes de Larga Distancia y Regionales
                </div>
                <div>
                  Para viajar a Mar del Plata, Rosario, Córdoba, Tucumán, etc., los pasajes gratuitos deben reservarse por sistema web ante la CNRT con al menos <strong>48 horas de anticipación</strong>.
                </div>
                <a
                  href="https://reservapasajes.cnrt.gob.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => triggerHaptic('light')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    color: '#0a84ff',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '12px',
                  }}
                >
                  <span>Reservar pasaje gratuito en CNRT</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: JUBILADOS Y PENSIONADOS */}
      <div
        className="ios-card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 214, 10, 0.25)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <div
          onClick={() => toggleCard('jubilados')}
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: expandedCard === 'jubilados' ? 'rgba(255, 214, 10, 0.08)' : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 214, 10, 0.18)',
                color: '#ffd60a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              👵
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                Jubilados y Pensionados
              </div>
              <div style={{ fontSize: '11.5px', color: '#ffd60a', fontWeight: 600 }}>
                55% de descuento en SUBE • 40% en Larga Distancia
              </div>
            </div>
          </div>
          {expandedCard === 'jubilados' ? (
            <ChevronUp size={20} style={{ color: '#8e8e93' }} />
          ) : (
            <ChevronDown size={20} style={{ color: '#8e8e93' }} />
          )}
        </div>

        {expandedCard === 'jubilados' && (
          <div style={{ padding: '0 16px 16px', fontSize: '12.5px', color: '#c7c7cc', lineHeight: 1.5 }}>
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Trenes del AMBA (Tarifa Social Federal):</strong>
                <p style={{ margin: '4px 0 0' }}>
                  55% de bonificación directa en cada pasaje de tren, subte y colectivo. Se activa registrando la tarjeta SUBE a nombre del titular en ANSES o mediante la app SUBE, y apoyándola en cualquier Terminal Automática (TAS).
                </p>
              </div>

              <div>
                <strong style={{ color: '#ffffff' }}>Trenes de Larga Distancia:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  40% de descuento en pasajes interurbanos comprando online o presencialmente en boleterías habilitadas, presentando DNI y carnet de jubilado o último recibo de haberes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: BOLETO ESTUDIANTIL */}
      <div
        className="ios-card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid rgba(10, 132, 255, 0.25)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <div
          onClick={() => toggleCard('estudiantes')}
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: expandedCard === 'estudiantes' ? 'rgba(10, 132, 255, 0.08)' : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(10, 132, 255, 0.18)',
                color: '#0a84ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                Boleto Estudiantil (BUE)
              </div>
              <div style={{ fontSize: '11.5px', color: '#0a84ff', fontWeight: 600 }}>
                Inicial, Primaria, Secundaria y Universidad
              </div>
            </div>
          </div>
          {expandedCard === 'estudiantes' ? (
            <ChevronUp size={20} style={{ color: '#8e8e93' }} />
          ) : (
            <ChevronDown size={20} style={{ color: '#8e8e93' }} />
          )}
        </div>

        {expandedCard === 'estudiantes' && (
          <div style={{ padding: '0 16px 16px', fontSize: '12.5px', color: '#c7c7cc', lineHeight: 1.5 }}>
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Nivel Inicial, Primario y Secundario:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Viajan <strong>100% gratis</strong> (hasta 50 viajes por mes en días hábiles escolares) en alumnos de escuelas públicas y privadas con aporte estatal del AMBA.
                </p>
              </div>

              <div>
                <strong style={{ color: '#ffffff' }}>Nivel Terciario y Universitario:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Tarifa bonificada a través de las universidades públicas nacionales y provinciales de CABA y Buenos Aires, acreditando saldo escolar mensual en la tarjeta SUBE.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: BICICLETAS, MONOPATINES Y MENORES */}
      <div
        className="ios-card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(255, 255, 255, 0.04)',
        }}
      >
        <div
          onClick={() => toggleCard('bicis')}
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: expandedCard === 'bicis' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(138, 197, 63, 0.18)',
                color: '#8ac53f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bike size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#ffffff' }}>
                Bicicletas, Monopatines y Menores
              </div>
              <div style={{ fontSize: '11.5px', color: '#8e8e93', fontWeight: 600 }}>
                Furgones habilitados y normas de viaje
              </div>
            </div>
          </div>
          {expandedCard === 'bicis' ? (
            <ChevronUp size={20} style={{ color: '#8e8e93' }} />
          ) : (
            <ChevronDown size={20} style={{ color: '#8e8e93' }} />
          )}
        </div>

        {expandedCard === 'bicis' && (
          <div style={{ padding: '0 16px 16px', fontSize: '12.5px', color: '#c7c7cc', lineHeight: 1.5 }}>
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#ffffff' }}>Bicicletas y Monopatines:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  El transporte es <strong>gratuito</strong>. Se debe viajar exclusivamente en los coches furgón señalizados de cada formación. Está prohibido ubicar bicicletas en pasillos o salones de pasajeros para resguardar la seguridad de evacuación.
                </p>
              </div>

              <div>
                <strong style={{ color: '#ffffff' }}>Menores de edad:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Los menores de <strong>3 años cumplidos no pagan boleto</strong> (deben viajar acompañados por un adulto y no ocupar asiento propio).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5: CONTACTOS Y RECLAMOS OFICIALES */}
      <div
        className="ios-card"
        style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
          📞 Canales Oficiales y Denuncias de Accesibilidad
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 0800 Trenes */}
          <a
            href="tel:08002228736"
            onClick={() => triggerHaptic('light')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(10, 132, 255, 0.1)',
              border: '1px solid rgba(10, 132, 255, 0.25)',
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={17} style={{ color: '#0a84ff' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>0800-222-TREN (8736)</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>Atención al Pasajero SOFSE</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0a84ff' }}>Llamar ›</span>
          </a>

          {/* WhatsApp Trenes */}
          <a
            href="https://wa.me/5491137008736?text=Hola,%20quisiera%20hacer%20una%20consulta%20sobre%20el%20servicio%20de%20trenes"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => triggerHaptic('light')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(48, 209, 88, 0.1)',
              border: '1px solid rgba(48, 209, 88, 0.25)',
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageCircle size={17} style={{ color: '#30d158' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px' }}>WhatsApp Oficial Trenes</div>
                <div style={{ fontSize: '11px', color: '#8e8e93' }}>+54 9 11 3700-8736</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#30d158' }}>Abrir chat ›</span>
          </a>

          {/* CNRT Reclamos Accesibilidad */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              fontSize: '11.5px',
              color: '#8e8e93',
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#ffffff' }}>Denuncias CNRT (Falta de rampa o pase denegado):</strong>
            <div>
              Si una estación o personal ferroviario no respeta el pase libre con CUD o no cuenta con rampa habilitada, podés denunciarlo ante la Comisión Nacional de Regulación del Transporte al <strong>0800-333-0300</strong> o en <strong>control.cnrt.gob.ar</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
