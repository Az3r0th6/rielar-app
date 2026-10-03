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
  Shield,
  Lock,
  Trash2,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Bell,
} from 'lucide-react';
import { LINES_DATA, PRELOADED_STATIONS } from '../data/linesData';
import {
  sendBugReport,
  updateBugReport,
  deleteBugReport,
  broadcastPushNotification,
  getPushSubscribersCount,
} from '../api/sofseClient';
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
  
  // History tab toggle & Admin Panel
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'history' | 'admin'
  const [savedReports, setSavedReports] = useState(() => {
    try {
      const raw =
        localStorage.getItem('rielar_user_reports') ||
        localStorage.getItem('rielar_user_reports_backup');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Secret Owner Mode State (Completely hidden from regular passengers)
  const [isOwnerMode, setIsOwnerMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isRemembered = localStorage.getItem('rielar_owner_device') === 'true';
    const hasHash = window.location.hash.toLowerCase().includes('admin');
    const urlParams = new URLSearchParams(window.location.search);
    const hasParam =
      urlParams.get('admin') === '1' ||
      urlParams.get('admin') === 'true' ||
      urlParams.get('owner') === '1';
    return isRemembered || hasHash || hasParam;
  });

  const secretTapRef = React.useRef({ count: 0, lastTime: 0 });

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - secretTapRef.current.lastTime > 2000) {
      secretTapRef.current.count = 1;
    } else {
      secretTapRef.current.count += 1;
      if (secretTapRef.current.count >= 5) {
        setIsOwnerMode(true);
        setActiveTab('admin');
        triggerHaptic('success');
        secretTapRef.current.count = 0;
        return;
      } else {
        triggerHaptic('light');
      }
    }
    secretTapRef.current.lastTime = now;
  };

  // Admin Management State
  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return (
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('rielar_admin_auth') === 'true'
    );
  });
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [allServerReports, setAllServerReports] = useState([]);
  const [adminFilter, setAdminFilter] = useState('ALL'); // 'ALL' | 'Recibido' | 'Trabajando en solución' | 'Resuelto'
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('Resuelto');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);
  const [adminActionMsg, setAdminActionMsg] = useState('');

  // Push Broadcast State
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [broadcastTitle, setBroadcastTitle] = useState('🚆 RielAR • ¡Nueva versión disponible!');
  const [broadcastBody, setBroadcastBody] = useState('Hay mejoras en horarios de trenes y nuevas funciones listas para usar.');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState('');

  const fetchSubscribersCount = async () => {
    try {
      const data = await getPushSubscribersCount();
      if (typeof data.count === 'number') {
        setSubscribersCount(data.count);
      }
    } catch {}
  };

  // Sync reports with backend API and notify passenger if any ticket changed status!
  const fetchServerReports = async () => {
    fetchSubscribersCount();
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        const serverList = Array.isArray(data) ? data : data?.reports || [];
        setAllServerReports(serverList);

        if (serverList.length > 0) {
          setSavedReports((prev) => {
            const map = new Map();
            serverList.forEach((r) => map.set(r.id, r));

            // Notify passenger if one of their reports was updated by admin!
            prev.forEach((oldRep) => {
              const serverRep = map.get(oldRep.id);
              if (serverRep) {
                const statusChanged = serverRep.status && serverRep.status !== oldRep.status;
                const noteChanged = serverRep.adminNote && serverRep.adminNote !== oldRep.adminNote;
                if (statusChanged || noteChanged) {
                  const isResolved = serverRep.status === 'Resuelto' || serverRep.status === 'Cerrado';
                  sendAppNotification(
                    isResolved
                      ? `🎉 ¡Tu reporte #${serverRep.id} fue resuelto!`
                      : `🔔 Actualización en ticket #${serverRep.id} (${serverRep.status})`,
                    serverRep.adminNote
                      ? `RielAR: "${serverRep.adminNote}"`
                      : `El estado de tu aviso sobre ${serverRep.stationName || serverRep.lineName} ahora es: ${serverRep.status}.`,
                    { type: isResolved ? 'arrival' : 'alert' }
                  );
                }
                map.set(oldRep.id, { ...oldRep, ...serverRep });
              } else {
                map.set(oldRep.id, oldRep);
              }
            });

            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            try {
              const serialized = JSON.stringify(merged);
              localStorage.setItem('rielar_user_reports', serialized);
              localStorage.setItem('rielar_user_reports_backup', serialized);
            } catch {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.debug('Failed to sync reports with server:', err);
    }
  };

  useEffect(() => {
    fetchServerReports();
  }, []);

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
      const updated = [createdReport, ...savedReports.filter((r) => r.id !== createdReport.id)].slice(0, 50);
      setSavedReports(updated);
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem('rielar_user_reports', serialized);
        localStorage.setItem('rielar_user_reports_backup', serialized);
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
      const updated = [fallbackReport, ...savedReports.filter((r) => r.id !== fallbackReport.id)].slice(0, 50);
      setSavedReports(updated);
      try {
        const serialized = JSON.stringify(updated);
        localStorage.setItem('rielar_user_reports', serialized);
        localStorage.setItem('rielar_user_reports_backup', serialized);
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

  const handleAdminLogin = (e) => {
    e?.preventDefault();
    if (adminPinInput.trim() === 'rielar2026') {
      try {
        sessionStorage.setItem('rielar_admin_auth', 'true');
        localStorage.setItem('rielar_owner_device', 'true');
      } catch {}
      setIsAdminAuth(true);
      setIsOwnerMode(true);
      setAdminPinError('');
      fetchServerReports();
      triggerHaptic('medium');
    } else {
      setAdminPinError('PIN incorrecto. Reintenta con el PIN de administrador.');
      triggerHaptic('heavy');
    }
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('rielar_admin_auth');
    } catch {}
    setIsAdminAuth(false);
    setAdminPinInput('');
    setEditingId(null);
    triggerHaptic('light');
  };

  const handleHideAdminPanel = () => {
    try {
      localStorage.removeItem('rielar_owner_device');
      sessionStorage.removeItem('rielar_admin_auth');
    } catch {}
    setIsAdminAuth(false);
    setIsOwnerMode(false);
    setActiveTab('form');
    triggerHaptic('medium');
  };

  const handleStartEdit = (report) => {
    setEditingId(report.id);
    setEditStatus(report.status || 'Resuelto');
    setEditAdminNote(report.adminNote || '');
    setAdminActionMsg('');
    triggerHaptic('light');
  };

  const handleSaveTicketUpdate = async (reportId) => {
    setIsUpdatingAdmin(true);
    setAdminActionMsg('');
    try {
      await updateBugReport(reportId, {
        status: editStatus,
        adminNote: editAdminNote,
        adminKey: 'rielar2026',
      });
      setAdminActionMsg(`¡Ticket #${reportId} actualizado con éxito!`);
      triggerHaptic('medium');
      playChimeSound('arrival');
      setEditingId(null);
      await fetchServerReports();
    } catch (err) {
      setAdminActionMsg(`Error al actualizar: ${err.message}`);
      triggerHaptic('heavy');
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const handleDeleteTicket = async (reportId) => {
    if (!window.confirm(`¿Eliminar definitivamente el reporte #${reportId}?`)) {
      return;
    }
    try {
      await deleteBugReport(reportId, 'rielar2026');
      triggerHaptic('medium');
      setAdminActionMsg(`Ticket #${reportId} eliminado.`);
      await fetchServerReports();
    } catch (err) {
      setAdminActionMsg(`Error al eliminar: ${err.message}`);
      triggerHaptic('heavy');
    }
  };

  const handleSendBroadcast = async (e) => {
    e?.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setBroadcastFeedback('⚠️ Ingresa título y mensaje para enviar.');
      triggerHaptic('heavy');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastFeedback('');
    triggerHaptic('medium');

    try {
      const res = await broadcastPushNotification({
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        url: '/',
        adminKey: 'rielar2026',
      });
      playChimeSound('arrival');
      triggerHaptic('success');
      setBroadcastFeedback(
        `🎉 ¡Notificación enviada a ${res.sent} teléfono(s)! (${res.total} registrados)`
      );
      fetchSubscribersCount();
    } catch (err) {
      setBroadcastFeedback(`❌ Error al enviar: ${err.message}`);
      triggerHaptic('heavy');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resuelto':
      case 'Cerrado':
        return { bg: 'rgba(48, 209, 88, 0.15)', color: '#30d158', label: 'Resuelto' };
      case 'Trabajando en solución':
        return { bg: 'rgba(255, 159, 10, 0.15)', color: '#ff9f0a', label: 'En Progreso' };
      case 'Recibido':
      default:
        return { bg: 'rgba(10, 132, 255, 0.15)', color: '#0a84ff', label: status || 'Recibido' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sub-selector: Nuevo Reporte vs Mis Reportes Anteriores vs Panel Admin */}
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
            fetchServerReports();
            handleSecretTap();
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

        {/* Pestaña Admin: 100% invisible para pasajeros comunes, solo visible si el propietario la activa */}
        {isOwnerMode && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('admin');
              fetchServerReports();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'admin' ? '#bf5af2' : 'transparent',
              color: activeTab === 'admin' ? '#ffffff' : '#8e8e93',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s',
            }}
          >
            <Shield size={13} />
            <span>Admin</span>
          </button>
        )}
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
                    {(() => {
                      const badge = getStatusBadge(rep.status);
                      return (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
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

                  {/* Respuesta oficial del administrador visible para el usuario */}
                  {rep.adminNote && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        background: 'rgba(48, 209, 88, 0.1)',
                        border: '1px solid rgba(48, 209, 88, 0.25)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#f5f5f7',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: '#30d158',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                        }}
                      >
                        <CheckCircle2 size={13} /> Respuesta del equipo de RielAR
                      </div>
                      <div style={{ lineHeight: 1.45 }}>{rep.adminNote}</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================
          VISTA 3: PANEL ADMINISTRADOR DE GESTIÓN Y RESOLUCIÓN
          ======================================================== */}
      {activeTab === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isAdminAuth ? (
            /* Pantalla de Desbloqueo PIN Admin */
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(191, 90, 242, 0.15)',
                  color: '#bf5af2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Lock size={26} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#f5f5f7', marginBottom: '6px' }}>
                Panel de Administración RielAR
              </h3>
              <p
                style={{
                  fontSize: '12.5px',
                  color: '#8e8e93',
                  margin: '0 auto 18px',
                  maxWidth: '320px',
                  lineHeight: 1.4,
                }}
              >
                Acceso para resolver tickets de usuarios, responder notas y notificar a los pasajeros en sus dispositivos.
              </p>

              <form
                onSubmit={handleAdminLogin}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxWidth: '280px',
                  margin: '0 auto',
                }}
              >
                <input
                  type="password"
                  placeholder="PIN de administrador"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: adminPinError ? '1px solid #ff453a' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f5f5f7',
                    fontSize: '14px',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                {adminPinError && (
                  <div style={{ color: '#ff453a', fontSize: '11.5px', fontWeight: 600 }}>
                    {adminPinError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #bf5af2, #5e5ce6)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Shield size={15} />
                  <span>Ingresar como Administrador</span>
                </button>

                <button
                  type="button"
                  onClick={handleHideAdminPanel}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8e8e93',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  Cancelar y ocultar
                </button>
              </form>
            </div>
          ) : (
            /* Panel de Administración Desbloqueado */
            <>
              {/* Barra Superior con Controles */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={16} color="#bf5af2" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#f5f5f7' }}>
                    Panel Soporte ({allServerReports.length || savedReports.length})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={fetchServerReports}
                    title="Refrescar lista"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: '#f5f5f7',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} />
                    <span>Recargar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleHideAdminPanel}
                    title="Ocultar panel admin de esta pantalla"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#8e8e93',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    🔒 Ocultar
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminLogout}
                    style={{
                      background: 'rgba(255, 69, 58, 0.15)',
                      border: '1px solid rgba(255, 69, 58, 0.3)',
                      color: '#ff453a',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    Salir
                  </button>
                </div>
              </div>

              {/* Mensaje de acción de admin */}
              {adminActionMsg && (
                <div
                  style={{
                    background: 'rgba(48, 209, 88, 0.15)',
                    border: '1px solid rgba(48, 209, 88, 0.3)',
                    color: '#30d158',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{adminActionMsg}</span>
                </div>
              )}

              {/* Card de Transmisión Masiva Push a Teléfonos */}
              <div
                style={{
                  background:
                    'linear-gradient(135deg, rgba(10, 132, 255, 0.12), rgba(191, 90, 242, 0.08))',
                  border: '1px solid rgba(10, 132, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(10, 132, 255, 0.25)',
                        color: '#0a84ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Bell size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#f5f5f7' }}>
                        Notificar a Teléfonos (Push)
                      </div>
                      <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                        Llega al celular aunque la app esté cerrada
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background:
                        subscribersCount > 0
                          ? 'rgba(48, 209, 88, 0.15)'
                          : 'rgba(255, 255, 255, 0.08)',
                      color: subscribersCount > 0 ? '#30d158' : '#8e8e93',
                      padding: '4px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    📱 {subscribersCount} {subscribersCount === 1 ? 'teléfono' : 'teléfonos'}
                  </span>
                </div>

                <form
                  onSubmit={handleSendBroadcast}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0a84ff',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        display: 'block',
                      }}
                    >
                      Título de la Notificación:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 🚆 ¡Nueva versión de RielAR disponible!"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f5f5f7',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0a84ff',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                        display: 'block',
                      }}
                    >
                      Mensaje / Novedades:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej: Se actualizaron los horarios de todas las líneas y hay mejoras en vivo..."
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#f5f5f7',
                        fontSize: '12px',
                        outline: 'none',
                        resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {broadcastFeedback && (
                    <div
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: broadcastFeedback.startsWith('🎉') ? '#30d158' : '#ff453a',
                      }}
                    >
                      {broadcastFeedback}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: isBroadcasting
                        ? '#555'
                        : 'linear-gradient(135deg, #0a84ff, #0056b3)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      cursor: isBroadcasting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(10, 132, 255, 0.35)',
                    }}
                  >
                    <Send size={13} />
                    <span>
                      {isBroadcasting
                        ? 'Transmitiendo a teléfonos...'
                        : 'Enviar Alerta a Todos los Teléfonos'}
                    </span>
                  </button>
                </form>
              </div>

              {/* Filtros de estado */}
              {(() => {
                const list = allServerReports.length > 0 ? allServerReports : savedReports;
                const countAll = list.length;
                const countRecibido = list.filter((r) => (r.status || 'Recibido') === 'Recibido').length;
                const countProgreso = list.filter((r) => r.status === 'Trabajando en solución').length;
                const countResuelto = list.filter((r) => r.status === 'Resuelto' || r.status === 'Cerrado').length;

                const filters = [
                  { id: 'ALL', label: `Todos (${countAll})` },
                  { id: 'Recibido', label: `Recibidos (${countRecibido})` },
                  { id: 'Trabajando en solución', label: `En Progreso (${countProgreso})` },
                  { id: 'Resuelto', label: `Resueltos (${countResuelto})` },
                ];

                return (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setAdminFilter(f.id);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          background: adminFilter === f.id ? '#bf5af2' : 'rgba(255, 255, 255, 0.06)',
                          color: adminFilter === f.id ? '#ffffff' : '#8e8e93',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Lista de Tickets en Admin */}
              {(() => {
                const list = allServerReports.length > 0 ? allServerReports : savedReports;
                const filtered = list.filter((r) => {
                  if (adminFilter === 'ALL') return true;
                  if (adminFilter === 'Recibido') return (r.status || 'Recibido') === 'Recibido';
                  if (adminFilter === 'Trabajando en solución') return r.status === 'Trabajando en solución';
                  if (adminFilter === 'Resuelto') return r.status === 'Resuelto' || r.status === 'Cerrado';
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        color: '#8e8e93',
                        fontSize: '12.5px',
                      }}
                    >
                      No hay reportes en esta categoría.
                    </div>
                  );
                }

                return filtered.map((rep) => {
                  const isEditing = editingId === rep.id;
                  const badge = getStatusBadge(rep.status);
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
                        background: isEditing ? 'rgba(191, 90, 242, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isEditing
                          ? '1px solid rgba(191, 90, 242, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Cabecera del ticket */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#bf5af2' }}>
                            #{rep.id}
                          </span>
                          <span style={{ fontSize: '11px', color: '#8e8e93' }}>• {dateStr}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Detalles: Tipo, Línea, Estación */}
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f5f5f7' }}>
                        {rep.category} • {rep.lineName}
                      </div>

                      {rep.stationName && rep.stationName !== 'No especificada' && (
                        <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                          📍 Estación: {rep.stationName}
                        </div>
                      )}

                      {/* Email de contacto si lo dejó */}
                      {rep.contactEmail && (
                        <div style={{ fontSize: '11px', color: '#64d2ff' }}>
                          ✉️ Contacto: {rep.contactEmail}
                        </div>
                      )}

                      {/* Dispositivo */}
                      {rep.deviceDetails?.platform && (
                        <div style={{ fontSize: '10.5px', color: '#8e8e93' }}>
                          📱 Dispositivo: {rep.deviceDetails.platform}
                        </div>
                      )}

                      {/* Descripción del usuario */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#d1d1d6',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          lineHeight: 1.4,
                        }}
                      >
                        "{rep.description}"
                      </div>

                      {/* Nota de admin guardada previamente */}
                      {rep.adminNote && !isEditing && (
                        <div
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(48, 209, 88, 0.08)',
                            borderLeft: '3px solid #30d158',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            color: '#f5f5f7',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#30d158' }}>Respuesta actual: </span>
                          {rep.adminNote}
                        </div>
                      )}

                      {/* Editor de ticket (si está en modo edición) */}
                      {isEditing ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginTop: '6px',
                            paddingTop: '8px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#bf5af2',
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Estado del Ticket:
                            </label>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {['Recibido', 'Trabajando en solución', 'Resuelto', 'Cerrado'].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setEditStatus(st)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: editStatus === st ? '#0a84ff' : 'rgba(255,255,255,0.08)',
                                    color: editStatus === st ? '#ffffff' : '#8e8e93',
                                  }}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#bf5af2',
                                textTransform: 'uppercase',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Respuesta para el pasajero (notificación):
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Ej: Se verificó con SOFSE y se actualizó el horario en el feed..."
                              value={editAdminNote}
                              onChange={(e) => setEditAdminNote(e.target.value)}
                              style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                color: '#f5f5f7',
                                fontSize: '12px',
                                outline: 'none',
                                resize: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              disabled={isUpdatingAdmin}
                              onClick={() => handleSaveTicketUpdate(rep.id)}
                              style={{
                                flex: 1,
                                padding: '9px 12px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #30d158, #28a745)',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: isUpdatingAdmin ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                              }}
                            >
                              <Check size={14} />
                              <span>{isUpdatingAdmin ? 'Guardando...' : 'Guardar y Notificar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              style={{
                                padding: '9px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#8e8e93',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Botones de acción normales */
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'flex-end',
                            marginTop: '4px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleStartEdit(rep)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(10, 132, 255, 0.15)',
                              color: '#0a84ff',
                              border: '1px solid rgba(10, 132, 255, 0.3)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MessageSquare size={12} />
                            <span>Responder / Estado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(rep.id)}
                            title="Eliminar ticket"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 69, 58, 0.12)',
                              color: '#ff453a',
                              border: '1px solid rgba(255, 69, 58, 0.25)',
                              fontSize: '11.5px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
