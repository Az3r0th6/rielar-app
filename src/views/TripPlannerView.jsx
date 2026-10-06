import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpDown,
  Search,
  Clock,
  Navigation,
  ArrowRight,
  RotateCw,
  Sparkles,
  Moon,
  Info,
  Layers,
  GitBranch,
} from 'lucide-react';
import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import { getStationArrivals } from '../api/sofseClient';
import LineBadge from '../components/LineBadge';
import { SofseLivePill } from '../components/DynamicIsland';
import LastTrainsSection from '../components/LastTrainsSection';
import ServiceTimetableGrid from '../components/ServiceTimetableGrid';
import RideAffiliateCard from '../components/RideAffiliateCard';
import { formatArrivalSeconds, formatLocalTime } from '../utils/time';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

// Cabeceras predeterminadas por línea para selección inmediata
const LINE_DEFAULTS = {
  Mitre: { originId: '332', destId: '389', ramal: 'Retiro-Tigre' },
  Sarmiento: { originId: '293', destId: '278', ramal: 'Once-Moreno' },
  Roca: { originId: '93', destId: '217', ramal: 'Constitución-La Plata' },
  'San Martín': { originId: '463', destId: '306', ramal: 'Retiro-Cabred' },
  'Belgrano Sur': { originId: '525', destId: '154', ramal: 'Buenos Aires-Gonzalez Catán' },
  'Tren de la Costa': { originId: '248', destId: '104', ramal: 'Maipú-Delta' },
};

function formatRamalLabel(ramal) {
  if (!ramal) return 'General';
  const customNames = {
    'Constitución-Bosques-Q': 'Constitución ⇄ Bosques (vía Quilmes)',
    'Constitución-Bosques-T': 'Constitución ⇄ Bosques (vía Temperley)',
    'La Plata - Htal. San Juan de Dios': 'Tren Univ. La Plata',
    'Buenos Aires-Gonzalez Catán': 'Sáenz ⇄ G. Catán',
    'Buenos Aires-M.C.G. Belgrano': 'Sáenz ⇄ M.C.G. Belgrano',
    'González Catan -Navarro': 'G. Catán ⇄ Navarro',
    'Maipú-Delta': 'Maipú ⇄ Delta',
    'Retiro-J.L. Suárez': 'Retiro ⇄ J.L. Suárez',
    'Retiro-Mitre': 'Retiro ⇄ Bmé. Mitre',
    'Retiro-Tigre': 'Retiro ⇄ Tigre',
    'Once-Moreno': 'Once ⇄ Moreno',
    'Moreno-Mercedes': 'Moreno ⇄ Mercedes',
    'Merlo-Lobos': 'Merlo ⇄ Lobos',
    'Once-Bragado': 'Once ⇄ Bragado',
    'Constitución-La Plata': 'Constitución ⇄ La Plata',
    'Constitución-Alejandro Korn': 'Constitución ⇄ Alejandro Korn',
    'Constitución-Ezeiza': 'Constitución ⇄ Ezeiza',
    'Retiro-Cabred': 'Retiro ⇄ Dr. Cabred (Pilar)',
    'Retiro - Junín': 'Retiro ⇄ Junín',
    'Temperley-Haedo': 'Temperley ⇄ Haedo',
    'Ezeiza-Cañuelas': 'Ezeiza ⇄ Cañuelas',
    'Victoria-Capilla del Señor': 'Victoria ⇄ Capilla del Señor',
    'Villa Ballester-Zárate': 'Ballester ⇄ Zárate',
  };
  return customNames[ramal] || ramal.replace(/\s*-\s*/g, ' ⇄ ');
}

export default function TripPlannerView({
  onSelectTrain,
  onOpenStationInfo,
  onNavigateToMap,
  initialOriginId,
  initialDestId,
  initialTab = 'departures',
}) {
  const [activePlannerTab, setActivePlannerTab] = useState(initialTab); // 'departures' | 'grid' | 'last_trains'
  const [originId, setOriginId] = useState(initialOriginId || '332'); // Default Retiro (Mitre)
  const [destId, setDestId] = useState(initialDestId || '389'); // Default Tigre
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Filtros activos de organización por Línea y Ramal
  const [selectedLine, setSelectedLine] = useState('ALL'); // 'ALL' | 'Mitre' | 'Sarmiento' | 'Roca' | 'San Martín' | 'Belgrano Sur' | 'Tren de la Costa'
  const [selectedRamal, setSelectedRamal] = useState('ALL');

  useEffect(() => {
    if (initialOriginId) {
      setOriginId(String(initialOriginId));
      const st = PRELOADED_STATIONS.find((s) => String(s.id) === String(initialOriginId));
      if (st?.lineName) setSelectedLine(st.lineName);
      if (st?.ramal) setSelectedRamal(st.ramal);
    }
    if (initialDestId) setDestId(String(initialDestId));
    if (initialTab) setActivePlannerTab(initialTab);
  }, [initialOriginId, initialDestId, initialTab]);

  const originStation = PRELOADED_STATIONS.find((s) => String(s.id) === String(originId));
  const destStation = PRELOADED_STATIONS.find((s) => String(s.id) === String(destId));

  // Ramales disponibles para la línea seleccionada
  const availableRamales = useMemo(() => {
    if (selectedLine === 'ALL') return [];
    const stations = PRELOADED_STATIONS.filter((s) => s.lineName === selectedLine);
    const ramalSet = new Set(stations.map((s) => s.ramal).filter(Boolean));
    return Array.from(ramalSet);
  }, [selectedLine]);

  // Estaciones agrupadas jerárquicamente por Línea y Ramal
  const groupedStations = useMemo(() => {
    const linesToInclude =
      selectedLine === 'ALL'
        ? ['Mitre', 'Sarmiento', 'Roca', 'San Martín', 'Belgrano Sur', 'Tren de la Costa']
        : [selectedLine];

    const groups = [];

    linesToInclude.forEach((lName) => {
      const lineObj = LINES_DATA.find((l) => l.name === lName);
      const lineStations = PRELOADED_STATIONS.filter((s) => s.lineName === lName);

      const ramalMap = new Map();
      lineStations.forEach((st) => {
        const r = st.ramal || 'General';
        if (!ramalMap.has(r)) ramalMap.set(r, []);
        ramalMap.get(r).push(st);
      });

      ramalMap.forEach((stations, rName) => {
        if (selectedRamal === 'ALL' || selectedRamal === rName) {
          groups.push({
            lineName: lName,
            lineColor: lineObj?.color || '#0a84ff',
            lineIcon: lineObj?.icon || '🚆',
            ramal: rName,
            label: `Línea ${lName} • ${formatRamalLabel(rName)}`,
            stations,
          });
        }
      });
    });

    return groups;
  }, [selectedLine, selectedRamal]);

  const handleSelectLine = (lineName) => {
    triggerHaptic('light');
    setSelectedLine(lineName);
    setSelectedRamal('ALL');

    if (lineName !== 'ALL' && LINE_DEFAULTS[lineName]) {
      const def = LINE_DEFAULTS[lineName];
      setOriginId(def.originId);
      setDestId(def.destId);
    }
  };

  const handleSelectRamal = (ramal) => {
    triggerHaptic('light');
    setSelectedRamal(ramal);

    if (ramal !== 'ALL') {
      const ramalStations = PRELOADED_STATIONS.filter(
        (s) => (selectedLine === 'ALL' || s.lineName === selectedLine) && s.ramal === ramal
      );
      if (ramalStations.length >= 2) {
        setOriginId(String(ramalStations[0].id));
        setDestId(String(ramalStations[ramalStations.length - 1].id));
      }
    }
  };

  const handleSwap = () => {
    triggerHaptic('medium');
    const temp = originId;
    setOriginId(destId);
    setDestId(temp);
  };

  const handleSearch = async (forcedOriginId = originId, forcedDestId = destId) => {
    triggerHaptic('medium');
    playChimeSound('click');
    setLoading(true);
    setHasSearched(true);
    try {
      // Query SOFSE arrivals with hasta parameter
      const data = await getStationArrivals(forcedOriginId, {
        hasta: forcedDestId,
        cantidad: 6,
      });
      const arrivals = Array.isArray(data)
        ? data
        : data?.results || data?.arribos || [];
      setResults(Array.isArray(arrivals) ? arrivals : []);
    } catch (err) {
      console.error('Error planning trip:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRouteFromTerminals = (origId, dstId) => {
    setOriginId(String(origId));
    setDestId(String(dstId));
    setActivePlannerTab('departures');
    handleSearch(String(origId), String(dstId));
  };

  // Second-by-second countdown decrementer for Trip Planner results
  useEffect(() => {
    if (!results.length) return;
    const timer = setInterval(() => {
      setResults((prev) =>
        prev.map((t) => {
          const sec = t?.arribo?.segundos;
          if (sec !== undefined && sec > 0) {
            return {
              ...t,
              arribo: { ...t.arribo, segundos: sec - 1 },
            };
          }
          return t;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [results.length]);

  const quickRoutes = [
    { fromId: '332', toId: '389', label: 'Retiro ➔ Tigre', lineName: 'Mitre', ramal: 'Retiro-Tigre' },
    { fromId: '332', toId: '357', label: 'Retiro ➔ San Isidro', lineName: 'Mitre', ramal: 'Retiro-Tigre' },
    { fromId: '293', toId: '278', label: 'Once ➔ Moreno', lineName: 'Sarmiento', ramal: 'Once-Moreno' },
    { fromId: '93', toId: '217', label: 'Const. ➔ La Plata', lineName: 'Roca', ramal: 'Constitución-La Plata' },
  ];

  // Comprobar si las estaciones seleccionadas son de la misma línea o ramal
  const isSameLine = originStation && destStation && originStation.lineName === destStation.lineName;
  const isSameRamal = isSameLine && originStation.ramal === destStation.ramal;

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div className="ios-header-text">
          <h1 className="ios-large-title">Horarios</h1>
          <div className="ios-subtitle">
            <span className="ios-live-indicator">
              <span className="live-pulse-dot" />
              <span>Cronograma</span>
            </span>
            <span>
              {activePlannerTab === 'departures'
                ? '• Origen y Destino'
                : activePlannerTab === 'grid'
                ? '• Grilla de Horarios Oficiales'
                : '• Primer y Último Tren por Cabecera'}
            </span>
          </div>
        </div>
        <SofseLivePill />
      </div>

      {/* Main Sub-Navigation Switcher */}
      <div style={{ padding: '0 16px', marginTop: '6px' }}>
        <div
          className="ios-segmented-control"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '4px' }}
        >
          <button
            className={`segmented-option ${activePlannerTab === 'departures' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActivePlannerTab('departures');
            }}
            style={{ fontSize: '12px', padding: '8px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            🔍 Próximos
          </button>
          <button
            className={`segmented-option ${activePlannerTab === 'grid' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActivePlannerTab('grid');
            }}
            style={{ fontSize: '12px', padding: '8px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            📅 Grilla Horarios
          </button>
          <button
            className={`segmented-option ${activePlannerTab === 'last_trains' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('light');
              setActivePlannerTab('last_trains');
            }}
            style={{ fontSize: '12px', padding: '8px 4px', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            🌙 Cabeceras
          </button>
        </div>
      </div>

      <div style={{ padding: '16px', paddingTop: '12px' }}>
        {/* VIEW 1: PRÓXIMAS SALIDAS (ORIGEN Y DESTINO) */}
        {activePlannerTab === 'departures' ? (
          <>
            {/* Origin & Destination Card con organización por Línea y Ramal */}
            <div className="ios-card" style={{ padding: '16px' }}>

              {/* 1. SECCIÓN DE ORGANIZACIÓN: FILTRO POR LÍNEA */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--ios-blue)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Subdividir por Línea:
                    </span>
                  </div>
                  {selectedLine !== 'ALL' && (
                    <button
                      onClick={() => handleSelectLine('ALL')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--ios-blue)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 2px',
                      }}
                    >
                      Ver toda la red
                    </button>
                  )}
                </div>

                {/* Píldoras Horizontales de Línea */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    scrollbarWidth: 'none',
                  }}
                >
                  <button
                    onClick={() => handleSelectLine('ALL')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      border: selectedLine === 'ALL' ? '1.5px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
                      background: selectedLine === 'ALL' ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.12)',
                      color: selectedLine === 'ALL' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                      boxShadow: selectedLine === 'ALL' ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    🌐 Todas
                  </button>

                  {LINES_DATA.filter((l) => l.id !== 501).map((line) => {
                    const isSel = selectedLine === line.name;
                    return (
                      <button
                        key={line.id}
                        onClick={() => handleSelectLine(line.name)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: isSel ? `1.5px solid ${line.color}` : '1px solid var(--ios-separator)',
                          background: isSel ? `${line.color}22` : 'rgba(118, 118, 128, 0.12)',
                          color: isSel ? (line.color || 'var(--ios-blue)') : 'var(--ios-text-secondary)',
                          boxShadow: isSel ? `0 2px 8px ${line.color}35` : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>{line.icon}</span>
                        <span>{line.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. SUBDIVISIÓN POR RAMAL (cuando hay una línea seleccionada) */}
                {selectedLine !== 'ALL' && availableRamales.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--ios-separator)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <GitBranch size={13} style={{ color: 'var(--ios-text-secondary)' }} />
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Ramales de Línea {selectedLine}:
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
                      <button
                        onClick={() => handleSelectRamal('ALL')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          border: selectedRamal === 'ALL' ? '1.5px solid var(--ios-card-border-active)' : '1px solid var(--ios-separator)',
                          background: selectedRamal === 'ALL' ? 'var(--ios-card-solid)' : 'rgba(118, 118, 128, 0.08)',
                          color: selectedRamal === 'ALL' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Todos ({availableRamales.length})
                      </button>

                      {availableRamales.map((ramal) => {
                        const isR = selectedRamal === ramal;
                        return (
                          <button
                            key={ramal}
                            onClick={() => handleSelectRamal(ramal)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              border: isR ? '1.5px solid var(--ios-blue)' : '1px solid var(--ios-separator)',
                              background: isR ? 'rgba(10, 132, 255, 0.16)' : 'rgba(118, 118, 128, 0.08)',
                              color: isR ? 'var(--ios-blue)' : 'var(--ios-text-secondary)',
                              cursor: 'pointer',
                            }}
                          >
                            {formatRamalLabel(ramal)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. PUNTO DE PARTIDA */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a84ff' }} />
                    <label style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Punto de Partida
                    </label>
                  </div>

                  {originStation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                        {originStation.lineName} • {formatRamalLabel(originStation.ramal)}
                      </span>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          if (onOpenStationInfo) onOpenStationInfo(originStation);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--ios-blue)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                        }}
                        title="Ver boleterías, colectivos y accesibilidad de esta estación"
                      >
                        <Info size={12} />
                        <span>Info</span>
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <select
                    value={originId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setOriginId(newId);
                      const st = PRELOADED_STATIONS.find((s) => String(s.id) === String(newId));
                      if (st?.lineName && selectedLine !== 'ALL' && selectedLine !== st.lineName) {
                        setSelectedLine(st.lineName);
                        setSelectedRamal('ALL');
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--ios-card-solid)',
                      border: '1.5px solid var(--ios-separator)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      color: 'var(--ios-text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Opción de respaldo si la estación actual no está en el grupo filtrado */}
                    {originStation && !groupedStations.some((g) => g.stations.some((s) => String(s.id) === String(originId))) && (
                      <optgroup label={`📍 Estación actual (${originStation.lineName})`}>
                        <option value={originStation.id}>
                          {originStation.name} ({originStation.ramal || 'General'})
                        </option>
                      </optgroup>
                    )}

                    {groupedStations.map((group) => (
                      <optgroup key={`orig-${group.lineName}-${group.ramal}`} label={`🚆 ${group.label}`}>
                        {group.stations.map((st, sIdx) => (
                          <option key={`orig-st-${st.id}-${group.ramal}-${sIdx}`} value={st.id} style={{ background: 'var(--ios-card)', color: 'var(--ios-text-primary)' }}>
                            {st.name} {selectedLine === 'ALL' && group.ramal ? `(${formatRamalLabel(group.ramal)})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. BOTÓN INVERTIR SENTIDO (SWAP) */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0', position: 'relative' }}>
                <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'var(--ios-separator)', zIndex: 0 }} />
                <button
                  onClick={handleSwap}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'var(--ios-card-solid)',
                    border: '1px solid var(--ios-separator)',
                    color: 'var(--ios-blue)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                  }}
                  title="Invertir origen y destino"
                >
                  <ArrowUpDown size={16} />
                </button>
              </div>

              {/* 5. ESTACIÓN DE LLEGADA */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#30d158' }} />
                    <label style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Estación de Llegada
                    </label>
                  </div>

                  {destStation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                        {destStation.lineName} • {formatRamalLabel(destStation.ramal)}
                      </span>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          if (onOpenStationInfo) onOpenStationInfo(destStation);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--ios-green)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                        }}
                        title="Ver boleterías, colectivos y accesibilidad de esta estación"
                      >
                        <Info size={12} />
                        <span>Info</span>
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <select
                    value={destId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setDestId(newId);
                      const st = PRELOADED_STATIONS.find((s) => String(s.id) === String(newId));
                      if (st?.lineName && selectedLine !== 'ALL' && selectedLine !== st.lineName) {
                        setSelectedLine(st.lineName);
                        setSelectedRamal('ALL');
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'var(--ios-card-solid)',
                      border: '1.5px solid var(--ios-separator)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      color: 'var(--ios-text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Opción de respaldo si la estación actual no está en el grupo filtrado */}
                    {destStation && !groupedStations.some((g) => g.stations.some((s) => String(s.id) === String(destId))) && (
                      <optgroup label={`📍 Estación actual (${destStation.lineName})`}>
                        <option value={destStation.id}>
                          {destStation.name} ({destStation.ramal || 'General'})
                        </option>
                      </optgroup>
                    )}

                    {groupedStations.map((group) => (
                      <optgroup key={`dst-${group.lineName}-${group.ramal}`} label={`🚆 ${group.label}`}>
                        {group.stations.map((st, sIdx) => (
                          <option key={`dst-st-${st.id}-${group.ramal}-${sIdx}`} value={st.id} style={{ background: 'var(--ios-card)', color: 'var(--ios-text-primary)' }}>
                            {st.name} {selectedLine === 'ALL' && group.ramal ? `(${formatRamalLabel(group.ramal)})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. INDICADOR DE ESTADO DEL TRAYECTO (Mismo ramal o transbordo) */}
              <div
                style={{
                  fontSize: '11.5px',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  background: isSameRamal
                    ? 'rgba(48, 209, 88, 0.12)'
                    : isSameLine
                    ? 'rgba(10, 132, 255, 0.12)'
                    : 'rgba(255, 159, 10, 0.12)',
                  border: isSameRamal
                    ? '1px solid rgba(48, 209, 88, 0.25)'
                    : isSameLine
                    ? '1px solid rgba(10, 132, 255, 0.25)'
                    : '1px solid rgba(255, 159, 10, 0.25)',
                  color: isSameRamal
                    ? 'var(--ios-green)'
                    : isSameLine
                    ? 'var(--ios-blue)'
                    : '#ff9f0a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{isSameRamal ? '✓' : isSameLine ? 'ℹ️' : '⚠️'}</span>
                <span>
                  {isSameRamal
                    ? `Corredor directo: Línea ${originStation?.lineName} (${formatRamalLabel(originStation?.ramal)})`
                    : isSameLine
                    ? `Misma Línea ${originStation?.lineName} con combinación entre ramales`
                    : `Estaciones de líneas distintas (${originStation?.lineName || 'Origen'} ➔ ${destStation?.lineName || 'Destino'}). Requiere transbordo.`}
                </span>
              </div>

              {/* 7. BOTÓN CONSULTAR SERVICIOS */}
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(10,132,255,0.4)',
                }}
              >
                {loading ? (
                  <RotateCw size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
                <span>Consultar Servicios</span>
              </button>
            </div>

            {/* Quick Route Pills */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Rutas Frecuentes
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {quickRoutes.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      triggerHaptic('light');
                      setOriginId(r.fromId);
                      setDestId(r.toId);
                      if (r.lineName) setSelectedLine(r.lineName);
                      if (r.ramal) setSelectedRamal(r.ramal);
                    }}
                    style={{
                      background: 'rgba(118, 118, 128, 0.12)',
                      border: '1px solid var(--ios-separator)',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      color: 'var(--ios-text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div>
              {hasSearched && (
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginBottom: '10px' }}>
                  Próximas salidas directas: {results.length}
                </div>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--ios-text-secondary)' }}>
                  <RotateCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0a84ff' }} />
                  <div>Buscando conexiones y horarios...</div>
                </div>
              ) : hasSearched && results.length === 0 ? (
                <div>
                  <div className="ios-card" style={{ textAlign: 'center', padding: '24px 18px', color: 'var(--ios-text-secondary)', marginBottom: '14px' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ios-text-primary)', marginBottom: '6px' }}>
                      Sin trenes directos en este horario
                    </div>
                    <div style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
                      No se encontraron salidas programadas entre <strong>{originStation?.name || 'Origen'}</strong> y <strong>{destStation?.name || 'Destino'}</strong> en los próximos minutos.
                    </div>
                  </div>

                  <RideAffiliateCard
                    reason={`Sin trenes directos entre ${originStation?.name || 'origen'} y ${destStation?.name || 'destino'}`}
                  />
                </div>
              ) : (
                results.map((train, idx) => {
                  if (!train) return null;
                  const seconds = train.arribo?.segundos;
                  const platform = train.arribo?.anden?.nombre || '1';
                  const departureTime = formatLocalTime(train.arribo?.salida?.programada);
                  const trainNum = train.servicio?.numero;

                  return (
                    <div
                      key={idx}
                      className="ios-card"
                      style={{ cursor: 'pointer', marginBottom: '10px' }}
                      onClick={() => {
                        triggerHaptic('light');
                        if (onSelectTrain) {
                          onSelectTrain({
                            ...train,
                            stationName: originStation?.name || 'Origen',
                            stationId: originId,
                          });
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                              Salida {departureTime}
                            </span>
                            <span className="platform-badge">Andén {platform}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '3px' }}>
                            <span style={{ color: '#0a84ff', fontWeight: 700 }}>
                              Desde {train.servicio?.desde?.estacion?.nombre || train.servicio?.estaciones?.[0]?.nombre || originStation?.name || 'Origen'}
                            </span>
                            {' ➔ '}
                            {train.servicio?.hasta?.estacion?.nombre ||
                              train.servicio?.estaciones?.[train.servicio.estaciones.length - 1]?.nombre ||
                              train.servicio?.ramal?.cabeceraFinal?.nombre ||
                              'Destino'} • Tren #{trainNum}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#30d158' }}>
                            {formatArrivalSeconds(seconds)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                            Ver detalles ›
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : activePlannerTab === 'grid' ? (
          /* VIEW 2: GRILLA COMPLETA DE HORARIOS OFICIALES */
          <ServiceTimetableGrid
            onSelectTrain={onSelectTrain}
            initialLineId={originStation?.lineId || 5}
            onNavigateToMap={onNavigateToMap}
          />
        ) : (
          /* VIEW 3: PRIMER Y ÚLTIMO TREN POR CABECERA */
          <LastTrainsSection onSelectRoute={handleSelectRouteFromTerminals} />
        )}
      </div>
    </div>
  );
}
