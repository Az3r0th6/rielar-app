import React, { useState, useEffect } from 'react';
import { Star, Trash2 } from 'lucide-react';
import LineBadge from '../components/LineBadge';
import { getStationArrivals } from '../api/sofseClient';
import { formatArrivalSeconds } from '../utils/time';
import { triggerHaptic } from '../utils/notifications';

export default function FavoritesView({
  favorites,
  onRemoveFavorite,
  onSelectStation,
}) {
  const [favoriteArrivals, setFavoriteArrivals] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchAllFavorites = async () => {
    if (!favorites.length) return;
    setLoading(true);
    const arrivalsMap = {};
    for (const fav of favorites) {
      try {
        const data = await getStationArrivals(fav.id);
        const list = Array.isArray(data)
          ? data
          : data?.results || data?.arribos || [];
        arrivalsMap[fav.id] = Array.isArray(list) ? list.slice(0, 3) : [];
      } catch (e) {
        arrivalsMap[fav.id] = [];
      }
    }
    setFavoriteArrivals(arrivalsMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllFavorites();
    const interval = setInterval(fetchAllFavorites, 20000);
    return () => clearInterval(interval);
  }, [favorites]);

  return (
    <div>
      {/* Header */}
      <div className="ios-nav-header">
        <div>
          <h1 className="ios-large-title">Favoritos</h1>
          <div className="ios-subtitle">
            <span>Estaciones guardadas y próximos arribos</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#8e8e93',
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
            style={{ textAlign: 'center', padding: '40px 20px', color: '#8e8e93' }}
          >
            <Star size={44} style={{ color: '#ffd60a', margin: '0 auto 14px', opacity: 0.85 }} />
            <div style={{ fontWeight: 800, fontSize: '17px', color: '#f5f5f7' }}>
              Aún no tienes estaciones favoritas
            </div>
            <div style={{ fontSize: '13.5px', marginTop: '8px', lineHeight: 1.5 }}>
              Toca la estrella ⭐ en cualquier estación de las pestañas <strong>"Cerca"</strong> o <strong>"Mapa"</strong> para tener sus horarios y trenes siempre a mano.
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800 }}>{station.name}</span>
                      <LineBadge lineId={station.lineId} size="small" />
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                      {station.ramal || 'Ramal urbano'}
                    </div>
                  </div>

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

                {/* Next Arrival Quick Capsule */}
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {nextTrains.length > 0 ? (
                    nextTrains.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '13px',
                          padding: '4px 0',
                        }}
                      >
                        <span style={{ color: '#f5f5f7', fontWeight: 600 }}>
                          ➔{' '}
                          {t.servicio?.hasta?.estacion?.nombre ||
                            t.servicio?.estaciones?.[t.servicio.estaciones.length - 1]?.nombre ||
                            t.servicio?.ramal?.cabeceraFinal?.nombre ||
                            'Destino'}
                        </span>
                        <span style={{ color: '#30d158', fontWeight: 800 }}>
                          {formatArrivalSeconds(t.arribo?.segundos)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '12px', color: '#8e8e93' }}>
                      {loading ? 'Consultando arribos en vivo...' : 'Toca para ver próximos arribos ›'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
