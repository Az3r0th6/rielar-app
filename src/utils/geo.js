// Geo-Location and Distance Utilities

/**
 * Calculates distance between two coordinates in meters using the Haversine formula
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance into human-friendly representation ("350 m" or "2.4 km")
 */
export function formatDistance(meters) {
  if (meters === null || meters === undefined) return '';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calculates estimated walking time based on standard 80 m/min pace
 */
export function getWalkingMinutes(meters) {
  if (!meters) return 1;
  const minutes = Math.round(meters / 80);
  return Math.max(1, minutes);
}

/**
 * Sorts stations by proximity to given coordinates and attaches distance metrics
 */
export function getNearestStations(userLat, userLng, stationsList, limit = 6) {
  if (!userLat || !userLng || !Array.isArray(stationsList)) {
    return [];
  }

  const withDistances = stationsList.map((st) => {
    const lat = parseFloat(st.lat || st.latitud);
    const lng = parseFloat(st.lng || st.longitud);

    if (isNaN(lat) || isNaN(lng)) {
      return { ...st, distanceMeters: 9999999, walkingMinutes: 999 };
    }

    const dist = getDistanceMeters(userLat, userLng, lat, lng);
    return {
      ...st,
      distanceMeters: dist,
      formattedDistance: formatDistance(dist),
      walkingMinutes: getWalkingMinutes(dist),
    };
  });

  withDistances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return withDistances.slice(0, limit);
}
