import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Map,
  Smartphone,
  Sparkles,
  Send,
  CheckCircle2,
  ChevronDown,
  History,
  Info,
  RotateCcw,
  Check,
} from 'lucide-react';
import { LINES_DATA, PRELOADED_STATIONS } from '../data/linesData';
import { sendBugReport } from '../api/sofseClient';
import { triggerHaptic, playChimeSound, sendAppNotification } from '../utils/notifications';

export default function BugReportSection() {
  const [selectedCategory, setSelectedCategory] = useState('arrival');
  const [selectedLine, setSelectedLine] = useState('5'); // default Mitre
  const [stationQuery, setStationQuery] = useState('');
  const [filteredStationHints, setFilteredStationHints] = useState([]);
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // History tab toggle
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history'
  const [savedReports, setSavedReports] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rielar_user_reports') || '[]');
    } catch {
      return [];
    }
  });

  // Autocomplete hints for station name
  useEffect(() => {
    if (stationQuery.trim().length >= 2) {
      const q = stationQuery.toLowerCase();
      const matches = PRELOADED_STATIONS.filter(
        (s) => s.name.toLowerCase().includes(q) || s.ramal?.toLowerCase().includes(q)
      ).slice(0, 4);
      setFilteredStationHints(matches);
    } else {
      setFilteredStationHints([]);
    }
  }, [stationQuery]);

  const categories = [
    {
      id: 'arrival',
      name: 'Horario o Arribo',
      icon: Clock,
      color: '#0a84ff',
      desc: 'El tren no pasó o el tiempo estimado difería mucho del real',
    },
    {
      id: 'station_location',
      name: 'Ubicación / Estación',
      icon: MapPin,
      color: '#ff9f0a',
      desc: 'Datos de la estación, andén o coordenadas inexactas',
    },
    {
      id: 'alerts_status',
      name: 'Alerta o Estado',
      icon: AlertTriangle,
      color: '#ff453a',
      desc: 'El estado de la línea o ramal no refleja la situación real',
    },
    {
      id: 'map_glitch',
      name: 'Mapa Interactivo',
      icon: Map,
      color: '#bf5af2',
      desc: 'Problema visual, pines o trazado del mapa',
    },
    {
      id: 'app_bug',
      name: 'Error de la App',
      icon: Smartphone,
      color: '#30d158',
      desc: 'Cierre inesperado, fallas visuales o botones que no responden',
    },
    {
      id: 'suggestion',
      name: 'Sugerencia / Mejora',
      icon: Sparkles,
      color: '#64d2ff',
      desc: 'Ideas o funciones que te gustaría ver en RielAR',
    },
  ];

  // Device context detection
  const getDeviceInfo = () => {
    if (typeof window === 'undefined') return { device: 'Desconocido' };
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    return {
      platform: isIOS ? 'iPhone (iOS)' : isAndroid ? 'Android' : 'Navegador Web',
      isInstalledPWA: !!isPWA,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      appVersion: 'RielAR v1.2',
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Por favor ingresa una breve descripción del problema.');
      triggerHaptic('heavy');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    triggerHaptic('medium');

    const catObj = categories.find((c) => c.id === selectedCategory);
    const lineObj = LINES_DATA.find((l) => String(l.id) === String(selectedLine));
    const deviceDetails = getDeviceInfo();

    const payload = {
      category: catObj?.name || 'General',
      categoryId: selectedCategory,
      lineName: lineObj?.name || 'General / Red',
      lineId: selectedLine,
      stationName: stationQuery.trim() || 'No especificada',
      description: description.trim(),
      contactEmail: contactEmail.trim(),
      deviceDetails,
    };

    try {
      const response = await sendBugReport(payload);
      const createdReport = response?.report || {
        id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        ...payload,
        status: 'Recibido',
      };

      // Save to local storage history
      const updated = [createdReport, ...savedReports].slice(0, 30);
      setSavedReports(updated);
      try {
        localStorage.setItem('rielar_user_reports', JSON.stringify(updated));
      } catch (err) {
        console.warn('Storage save failed:', err);
      }

      playChimeSound('arrival');
      sendAppNotification(
        '¡Reporte Recibido!',
        `Gracias por reportar. Código de seguimiento: #${createdReport.id}`,
        { type: 'arrival' }
      );

      setSubmittedReport(createdReport);
      // Reset form fields
      setDescription('');
      setStationQuery('');
    } catch (err) {
      console.warn('Report API failed, saving locally:', err);
      // Fallback: save locally even if offline
      const fallbackReport = {
        id: `LOC-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        ...payload,
        status: 'Guardado localmente',
      };
      const updated = [fallbackReport, ...savedReports].slice(0, 30);
      setSavedReports(updated);
      try {
        localStorage.setItem('rielar_user_reports', JSON.stringify(updated));
      } catch {}
      setSubmittedReport(fallbackReport);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    triggerHaptic('light');
    setSubmittedReport(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-selector: Nuevo Reporte vs Mis Reportes Anteriores */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('form');
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'form' ? '#0a84ff' : 'transparent',
            color: activeTab === 'form' ? '#ffffff' : '#8e8e93',
            transition: 'all 0.2s',
          }}
        >
          ✍️ Crear Reporte
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('history');
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '9px',
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTab === 'history' ? '#0a84ff' : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : '#8e8e93',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <History size={14} />
          <span>Mis Reportes ({savedReports.length})</span>
        </button>
      </div>

      {/* ========================================================
          VISTA 1: FORMULARIO DE NUEVO REPORTE
          ======================================================== */}
      {activeTab === 'form' && (
        <>
          {submittedReport ? (
            /* Card de Éxito */
            <div
              style={{
                background: 'rgba(48, 209, 88, 0.12)',
                border: '1px solid rgba(48, 209, 88, 0.3)',
                borderRadius: '20px',
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(48, 209, 88, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  color: '#30d158',
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f5f5f7', marginBottom: '6px' }}>
                ¡Reporte Enviado con Éxito!
              </h3>
              <p style={{ fontSize: '13px', color: '#8e8e93', lineHeight: 1.5, margin: '0 auto 16px', maxWidth: '320px' }}>
                Tu aviso fue registrado con el ticket{' '}
                <strong style={{ color: '#30d158' }}>#{submittedReport.id}</strong>.
                Gracias por ayudarnos a que RielAR sea cada vez más precisa.
              </p>

              <div
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#f5f5f7',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#8e8e93' }}>Tipo:</span>
                  <span style={{ fontWeight: 700 }}>{submittedReport.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#8e8e93' }}>Línea / Ramal:</span>
                  <span style={{ fontWeight: 700 }}>{submittedReport.lineName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8e8e93' }}>Estado:</span>
                  <span style={{ color: '#30d158', fontWeight: 700 }}>● {submittedReport.status}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetForm}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#0a84ff',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={16} />
                <span>Enviar otro reporte</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Banner informativo */}
              <div
                style={{
                  background: 'rgba(10, 132, 255, 0.12)',
                  border: '1px solid rgba(10, 132, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={18} style={{ color: '#0a84ff', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#f5f5f7', lineHeight: 1.4 }}>
                  <strong>Centro de Reportes de la Comunidad:</strong> Si detectaste un horario desfasado, un
                  tren cancelado no avisado o un error en la app, infórmalo aquí para corregirlo.
                </div>
              </div>

              {/* Selector de Categoría */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                  1. Tipo de Problema
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedCategory(cat.id);
                        }}
                        style={{
                          background: isSelected ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: isSelected ? '1.5px solid #0a84ff' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '14px',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon size={16} style={{ color: cat.color }} />
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f5f5f7' }}>
                            {cat.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#8e8e93', lineHeight: 1.3 }}>
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Línea de Tren */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                  2. Línea Afectada
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedLine('ALL');
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: selectedLine === 'ALL' ? '#0a84ff' : 'rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    General / Toda la Red
                  </button>
                  {LINES_DATA.map((line) => (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedLine(String(line.id));
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: selectedLine === String(line.id) ? `1.5px solid ${line.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        background: selectedLine === String(line.id) ? `${line.color}33` : 'rgba(255, 255, 255, 0.06)',
                        color: selectedLine === String(line.id) ? '#ffffff' : '#8e8e93',
                        flexShrink: 0,
                      }}
                    >
                      {line.icon} {line.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estación o Ramal Afectado */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  3. Estación o Ramal (Opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Ej: Retiro, Morón, Tigre, Constitución..."
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#f5f5f7',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {filteredStationHints.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#1c1c24',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        marginTop: '4px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                      }}
                    >
                      {filteredStationHints.map((st) => (
                        <div
                          key={st.id}
                          onClick={() => {
                            setStationQuery(st.name);
                            setFilteredStationHints([]);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            color: '#f5f5f7',
                          }}
                        >
                          <span>{st.name}</span>
                          <span style={{ fontSize: '11px', color: '#8e8e93' }}>{st.lineName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción Detallada */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  4. ¿Qué sucedió? *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe qué fallo encontraste (ej: 'El tren de las 14:15 a Tigre no salió en el horario indicado y en la pantalla figuraba a horario', etc.)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#f5f5f7',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.4,
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>
                  {description.length} caracteres
                </div>
              </div>

              {/* Email opcional para contacto */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  5. Tu Correo (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com (para avisarte cuando se solucione)"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#f5f5f7',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Mensaje de Error si falta la descripción */}
              {errorMessage && (
                <div style={{ color: '#ff453a', fontSize: '12.5px', fontWeight: 600 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Dispositivo Detectado Automático */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#8e8e93',
                }}
              >
                <span>Diagnóstico automático:</span>
                <span style={{ color: '#f5f5f7', fontWeight: 600 }}>
                  {getDeviceInfo().platform} • RielAR v1.2
                </span>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: isSubmitting ? '#555' : 'linear-gradient(135deg, #0a84ff, #0056b3)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(10, 132, 255, 0.4)',
                  transition: 'transform 0.1s',
                }}
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Enviando reporte...' : 'Enviar Reporte a Soporte'}</span>
              </button>
            </form>
          )}
        </>
      )}

      {/* ========================================================
          VISTA 2: HISTORIAL DE REPORTES DEL USUARIO
          ======================================================== */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {savedReports.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
              }}
            >
              <History size={32} style={{ color: '#8e8e93', marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#f5f5f7', marginBottom: '4px' }}>
                No tienes reportes previos
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e93' }}>
                Cualquier fallo o sugerencia que envíes aparecerá aquí para que puedas seguir su estado.
              </div>
            </div>
          ) : (
            savedReports.map((rep) => {
              const dateStr = rep.timestamp
                ? new Date(rep.timestamp).toLocaleString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Reciente';

              return (
                <div
                  key={rep.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0a84ff' }}>
                        #{rep.id}
                      </span>
                      <span style={{ fontSize: '11px', color: '#8e8e93' }}>• {dateStr}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: 'rgba(48, 209, 88, 0.15)',
                        color: '#30d158',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {rep.status || 'Recibido'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5f5f7', marginBottom: '4px' }}>
                    {rep.category} • {rep.lineName}
                  </div>

                  {rep.stationName && rep.stationName !== 'No especificada' && (
                    <div style={{ fontSize: '11.5px', color: '#8e8e93', marginBottom: '4px' }}>
                      📍 Estación: {rep.stationName}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#d1d1d6',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      lineHeight: 1.4,
                      marginTop: '6px',
                    }}
                  >
                    "{rep.description}"
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
