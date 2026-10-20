import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Trash2,
  Info,
  Search,
  Plus,
  Check,
  X,
  Clock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import LineBadge from '../components/LineBadge';
import { SofseLivePill } from '../components/DynamicIsland';
import { getStationArrivals } from '../api/sofseClient';
import { formatArrivalSeconds, formatLocalTime } from '../utils/time';
import { triggerHaptic } from '../utils/notifications';
import { PRELOADED_STATIONS } from '../data/linesData';
import {
  getFavoriteCommutes,
  removeFavoriteCommute,
  COMMUTES_CHANGED_EVENT,
} from '../utils/commuteStorage';
import FavoriteCommuteCard from '../components/FavoriteCommuteCard';
import AddFavoriteCommuteModal from '../components/AddFavoriteCommuteModal';

export default function FavoritesView({
  favorites = [],
  onRemoveFavorite,
  onToggleFavorite,
  onSelectStation,
  onOpenStationInfo,
}) {
  const [favoriteArrivals, setFavoriteArrivals] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [favoriteCommutes, setFavoriteCommutes] = useState(() => getFavoriteCommutes());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterView, setFilterView] = useState('all'); // 'all' | 'commutes' | 'stations'

  // Sync commutes when updated across app or tabs
  useEffect(() => {
    const handleCommutesChanged = (e) => {
      setFavoriteCommutes(e.detail || getFavoriteCommutes());
    };
    window.addEventListener(COMMUTES_CHANGED_EVENT, handleCommutesChanged);
    return () => window.removeEventListener(COMMUTES_CHANGED_EVENT, handleCommutesChanged);
  }, []);

  // Search through PRELOADED_STATIONS to easily add favorites
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const matches = PRELOADED_STATIONS.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        (st.ramal && st.ramal.toLowerCase().includes(q)) ||
        (st.lineName && st.lineName.toLowerCase().includes(q))
    ).slice(0, 5);
    setSearchResults(matches);
  }, [searchQuery]);

  // Fetch real-time arrivals for all saved stations AND stations with saved commutes
  const fetchAllFavorites = async () => {
    const allStationIds = Array.from(
      new Set([
        ...favorites.map((f) => Number(f.id)),
        ...favoriteCommutes.map((c) => Number(c.stationId)).filter(Boolean),
      ])
    );

    if (!allStationIds.length) return;
    setLoading(true);
    const arrivalsMap = {};
    for (const stationId of allStationIds) {
      try {
        const data = await getStationArrivals(stationId);
        const list = Array.isArray(data)
          ? data
          : data?.results || data?.arribos || [];
        arrivalsMap[stationId] = Array.isArray(list) ? list.slice(0, 4) : [];
      } catch (e) {
        arrivalsMap[stationId] = [];
      }
    }
    setFavoriteArrivals(arrivalsMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllFavorites();
    const interval = setInterval(fetchAllFavorites, 20000);
    return () => clearInterval(interval);
  }, [favorites, favoriteCommutes]);

  // Second-by-second countdown decrementer for Favorites
  useEffect(() => {
    const timer = setInterval(() => {
      setFavoriteArrivals((prev) => {
        const next = {};
        Object.entries(prev).forEach(([k, list]) => {
          next[k] = (list || []).map((t) => {
            const sec = t.arribo?.segundos;
            if (sec !== undefined && sec > 0) {
              return {
                ...t,
                arribo: { ...t.arribo, segundos: sec - 1 },
              };
            }
            return t;
          });
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalItemsCount = favorites.length + favoriteCommutes.length;

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div className="ios-header-text">
          <h1 className="ios-large-title">Favoritos</h1>
          <div className="ios-subtitle">
            <span>Estaciones y trenes habituales guardados</span>
          </div>
        </div>
        <SofseLivePill />
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        {/* Quick Add Action & Segmented Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {/* Top Button to Add Routine Commute */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              setIsAddModalOpen(true);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #0a84ff, #0056b3)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(10, 132, 255, 0.35)',
              cursor: 'pointer',
            }}
          >
            <Clock size={16} />
            <span>+ Guardar Tren Habitual (Horario fijo)</span>
          </button>

          {/* Segmented Filter Control */}
          <div
            className="ios-segmented-control"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', padding: '3px' }}
          >
            <button
              className={`segmented-option ${filterView === 'all' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterView('all');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              Todos ({totalItemsCount})
            </button>
            <button
              className={`segmented-option ${filterView === 'commutes' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterView('commutes');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              ⏰ Trenes ({favoriteCommutes.length})
            </button>
            <button
              className={`segmented-option ${filterView === 'stations' ? 'active' : ''}`}
              onClick={() => {
                triggerHaptic('light');
                setFilterView('stations');
              }}
              style={{ fontSize: '11.5px', padding: '6px 4px', fontWeight: 700 }}
            >
              🚉 Estaciones ({favorites.length})
            </button>
          </div>
        </div>

        {/* =================================================== */}
        {/* SECTION 1: MIS HORARIOS HABITUALES (TRENES DIARIOS) */}
        {/* =================================================== */}
        {(filterView === 'all' || filterView === 'commutes') && (
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 800,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              <span>Mis Trenes Habituales ({favoriteCommutes.length})</span>
              {favoriteCommutes.length > 0 && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ios-blue)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Agregar
                </button>
              )}
            </div>

            {favoriteCommutes.length === 0 ? (
              <div
                className="ios-card"
                style={{
                  padding: '24px 18px',
                  textAlign: 'center',
                  background: 'rgba(118, 118, 128, 0.06)',
                  border: '1.5px dashed var(--ios-separator)',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(10, 132, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--ios-blue)',
                  }}
                >
                  <Clock size={22} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                  ¿Te tomás siempre el mismo tren?
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--ios-text-secondary)', marginTop: '6px', lineHeight: 1.45 }}>
                  Fijá el horario de tu rutina diaria para saber cuánto falta para salir, si viene a horario y recibir un aviso previo.
                </div>
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setIsAddModalOpen(true);
                  }}
                  style={{
                    marginTop: '14px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(10, 132, 255, 0.4)',
                    background: 'rgba(10, 132, 255, 0.12)',
                    color: 'var(--ios-blue)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Configurar mi tren diario
                </button>
              </div>
            ) : (
              favoriteCommutes.map((commute) => (
                <FavoriteCommuteCard
                  key={commute.id}
                  commute={commute}
                  liveArrivals={favoriteArrivals[commute.stationId] || []}
                  onRemove={(id) => {
                    removeFavoriteCommute(id);
                    setFavoriteCommutes(getFavoriteCommutes());
                  }}
                  onSelectStation={(st) => {
                    if (onSelectStation) onSelectStation(st);
                  }}
                  onOpenStationInfo={(st) => {
                    if (onOpenStationInfo) onOpenStationInfo(st);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* =================================================== */}
        {/* SECTION 2: MIS ESTACIONES FAVORITAS                */}
        {/* =================================================== */}
        {(filterView === 'all' || filterView === 'stations') && (
          <div>
            {/* Quick Add Station Search Bar */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <div
                className="ios-search-bar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(118, 118, 128, 0.16)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  gap: '8px',
                }}
              >
                <Search size={16} color="var(--ios-text-secondary)" />
                <input
                  type="text"
                  placeholder="Buscar estación para agregar a favoritos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ios-text-primary)',
                    fontSize: '13.5px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--ios-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px',
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Autocomplete Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: 'var(--ios-card-solid)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '14px',
                    border: '1px solid var(--ios-card-border)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {searchResults.map((st) => {
                    const isFav = favorites.some((f) => Number(f.id) === Number(st.id));
                    return (
                      <div
                        key={`${st.lineId}-${st.id}`}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid var(--ios-separator, rgba(120, 120, 128, 0.15))',
                          gap: '8px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ios-text-primary)' }}>
                              {st.name}
                            </span>
                            <LineBadge lineId={st.lineId} size="small" />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                            {st.lineName} • {st.ramal || 'Ramal urbano'}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            if (isFav) {
                              onRemoveFavorite(st.id);
                            } else if (onToggleFavorite) {
                              onToggleFavorite(st);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            border: isFav ? '1px solid rgba(255, 214, 10, 0.5)' : '1px solid rgba(10, 132, 255, 0.4)',
                            background: isFav ? 'rgba(255, 214, 10, 0.18)' : 'rgba(10, 132, 255, 0.15)',
                            color: isFav ? '#ffd60a' : '#0a84ff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Star size={13} fill={isFav ? '#ffd60a' : 'none'} />
                          <span>{isFav ? 'Guardada' : 'Guardar'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--ios-text-secondary)',
                textTransform: 'uppercase',
                marginBottom: '10px',
                paddingLeft: '4px',
              }}
            >
              Mis Estaciones ({favorites.length})
            </div>

            {favorites.length === 0 ? (
              <div
                className="ios-card"
                style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ios-text-secondary)' }}
              >
                <Star size={44} style={{ color: '#ffd60a', margin: '0 auto 14px', opacity: 0.85 }} />
                <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--ios-text-primary)' }}>
                  Aún no tienes estaciones favoritas
                </div>
                <div style={{ fontSize: '13.5px', marginTop: '8px', lineHeight: 1.5 }}>
                  Usa el buscador de arriba o toca la estrella ⭐ en cualquier estación de las pestañas <strong>"Cerca"</strong> o <strong>"Mapa"</strong> para tener sus horarios siempre a mano.
                </div>
              </div>
            ) : (
              favorites.map((station) => {
                const nextTrains = favoriteArrivals[station.id] || [];
                return (
                  <div
                    key={station.id}
                    className="ios-card"
                    style={{ marginBottom: '12px', cursor: 'pointer' }}
                    onClick={() => {
                      if (onSelectStation) onSelectStation(station);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '17px', fontWeight: 800, wordBreak: 'break-word', color: 'var(--ios-text-primary)' }}>{station.name}</span>
                          <LineBadge lineId={station.lineId} size="small" />
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>
                          {station.ramal || 'Ramal urbano'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            if (onOpenStationInfo) onOpenStationInfo(station);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(10, 132, 255, 0.12)',
                            border: '1px solid rgba(10, 132, 255, 0.25)',
                            color: '#0a84ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="Ver información de boletería, colectivos y servicios"
                        >
                          <Info size={15} />
                        </button>

                        <button
                          className="close-round-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('medium');
                            onRemoveFavorite(station.id);
                          }}
                          title="Eliminar de favoritos"
                        >
                          <Trash2 size={15} style={{ color: '#ff453a' }} />
                        </button>
                      </div>
                    </div>

                    {/* Next Arrival Quick Capsule */}
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--ios-separator)',
                      }}
                    >
                      {nextTrains.length > 0 ? (
                        nextTrains.map((t, idx) => {
                          const origin =
                            t.servicio?.desde?.estacion?.nombre ||
                            t.servicio?.estaciones?.[0]?.nombre ||
                            t.servicio?.ramal?.cabeceraInicial?.nombre ||
                            'Origen';
                          const dest =
                            t.servicio?.hasta?.estacion?.nombre ||
                            t.servicio?.estaciones?.[t.servicio.estaciones.length - 1]?.nombre ||
                            t.servicio?.ramal?.cabeceraFinal?.nombre ||
                            'Destino';

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '13px',
                                padding: '5px 0',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--ios-text-primary)' }}>
                                <span style={{ color: 'var(--ios-blue)', fontWeight: 700 }}>Desde {origin}</span> ➔ {dest}
                              </span>
                              <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                                <span style={{ color: 'var(--ios-green)', fontWeight: 800 }}>
                                  {formatArrivalSeconds(t.arribo?.segundos)}
                                </span>
                                {(t.arribo?.salida?.programada || t.arribo?.llegada?.programada) && (
                                  <div style={{ fontSize: '11px', color: 'var(--ios-text-tertiary)', fontWeight: 600 }}>
                                    {formatLocalTime(t.arribo?.salida?.programada || t.arribo?.llegada?.programada)} hs
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                          {loading ? 'Consultando arribos en vivo...' : 'Toca para ver próximos arribos ›'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Routine Commute Modal */}
      <AddFavoriteCommuteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCommuteAdded={() => {
          setFavoriteCommutes(getFavoriteCommutes());
        }}
      />
    </div>
  );
}
