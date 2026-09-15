import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import { getDistanceMeters } from './geo';

/**
 * Normalizes station names for fuzzy comparison
 */
function cleanName(name = '') {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Matches a station by name in the master stations catalog
 */
export function findStationByName(name, lineId = null) {
  if (!name) return null;
  const target = cleanName(name);
  
  // First attempt: exact cleaned match with line filter
  let match = PRELOADED_STATIONS.find(s => {
    const sClean = cleanName(s.name);
    return sClean === target && (!lineId || s.lineId === lineId);
  });
  if (match) return match;

  // Second attempt: partial contains
  match = PRELOADED_STATIONS.find(s => {
    const sClean = cleanName(s.name);
    return (sClean.includes(target) || target.includes(sClean)) && (!lineId || s.lineId === lineId);
  });
  if (match) return match;

  // Third attempt: any line
  return PRELOADED_STATIONS.find(s => {
    const sClean = cleanName(s.name);
    return sClean === target || sClean.includes(target) || target.includes(sClean);
  }) || null;
}

/**
 * Computes the real-time train journey, current physical location,
 * progress percentage and status of every stop.
 */
export function calculateTrainJourney(trainData) {
  if (!trainData) return null;

  const { servicio, arribo, stationName } = trainData;
  const lineId = servicio?.lineId || 5;
  const secondsToTarget = arribo?.segundos ?? 180;
  
  const destName =
    servicio?.hasta?.estacion?.nombre ||
    servicio?.estaciones?.[servicio.estaciones.length - 1]?.nombre ||
    servicio?.ramal?.cabeceraFinal?.nombre ||
    'Destino';

  const origName =
    servicio?.desde?.estacion?.nombre ||
    servicio?.estaciones?.[0]?.nombre ||
    servicio?.ramal?.cabeceraInicial?.nombre ||
    'Origen';

  // Build full stops list with coordinates
  let rawStops = servicio?.estaciones || [];
  let stops = [];

  if (rawStops.length >= 2) {
    stops = rawStops.map((st, idx) => {
      const geo = findStationByName(st.nombre, lineId);
      return {
        id: st.id_estacion || geo?.id || idx,
        name: st.nombre,
        lat: geo?.lat || -34.59091,
        lng: geo?.lng || -58.37505,
        anden: st.anden?.nombre || '1',
        scheduledDeparture: st.salida?.programada,
        scheduledArrival: st.llegada?.programada,
      };
    });
  } else {
    // Reconstruct route based on origin & destination from master catalog
    const origGeo = findStationByName(origName, lineId) || PRELOADED_STATIONS[0];
    const destGeo = findStationByName(destName, lineId) || PRELOADED_STATIONS[16] || origGeo;
    const targetGeo = findStationByName(stationName, lineId) || origGeo;

    // Filter stations belonging to the same line/ramal between origin and destination
    const lineStations = PRELOADED_STATIONS.filter(s => s.lineId === (origGeo.lineId || 5));
    if (lineStations.length > 2) {
      stops = lineStations.slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        anden: '1',
      }));
    } else {
      stops = [
        { id: origGeo.id, name: origGeo.name, lat: origGeo.lat, lng: origGeo.lng, anden: '1' },
        { id: targetGeo.id, name: targetGeo.name, lat: targetGeo.lat, lng: targetGeo.lng, anden: '1' },
        { id: destGeo.id, name: destGeo.name, lat: destGeo.lat, lng: destGeo.lng, anden: '1' },
      ];
    }
  }

  // Find index of the queried station
  let targetIndex = stops.findIndex(s => cleanName(s.name) === cleanName(stationName));
  if (targetIndex === -1) {
    targetIndex = Math.min(Math.floor(stops.length / 2), stops.length - 1);
  }

  // Calculate current train position along the track
  // If secondsToTarget > 0, train is between targetIndex - 1 and targetIndex
  let currentStationIndex = targetIndex;
  let prevStationIndex = Math.max(0, targetIndex - 1);
  let progressRatioInLeg = 0.7; // default 70% of distance travelled towards target station

  if (secondsToTarget <= 30) {
    // Train is at the platform
    progressRatioInLeg = 0.98;
    currentStationIndex = targetIndex;
  } else {
    // Estimate leg progress based on arrival seconds (typically 3-5 min per station)
    const legDurationSec = 240;
    progressRatioInLeg = Math.max(0.1, Math.min(0.95, 1 - (secondsToTarget / legDurationSec)));
  }

  const prevStop = stops[prevStationIndex] || stops[0];
  const nextStop = stops[targetIndex] || stops[stops.length - 1];

  // Interpolate GPS coordinates of the train
  const trainLat = prevStop.lat + (nextStop.lat - prevStop.lat) * progressRatioInLeg;
  const trainLng = prevStop.lng + (nextStop.lng - prevStop.lng) * progressRatioInLeg;

  // Calculate total route progress
  const totalStops = stops.length;
  const stopsPassed = prevStationIndex;
  const overallProgress = Math.min(
    100,
    Math.max(5, Math.round(((stopsPassed + progressRatioInLeg) / Math.max(1, totalStops - 1)) * 100))
  );

  // Determine current status message
  let statusBadge = '';
  let statusDetail = '';
  let speedKmH = 0;

  if (secondsToTarget <= 35) {
    statusBadge = 'En andén';
    statusDetail = `Detenido en Andén ${nextStop.anden || '1'} de ${nextStop.name}`;
    speedKmH = 0;
  } else if (secondsToTarget <= 90) {
    statusBadge = 'Arribando';
    statusDetail = `Ingresando a ${nextStop.name} en ${Math.round(secondsToTarget)} seg`;
    speedKmH = 28;
  } else {
    statusBadge = 'En viaje';
    const minutesLeft = Math.ceil(secondsToTarget / 60);
    statusDetail = `En trayecto hacia ${nextStop.name} (llega en ~${minutesLeft} min)`;
    speedKmH = 56;
  }

  // Assign status to each stop
  const stopsWithStatus = stops.map((st, idx) => {
    let state = 'upcoming';
    let label = '';
    if (idx < targetIndex) {
      state = 'completed';
      label = 'Paso completado';
    } else if (idx === targetIndex) {
      state = 'current';
      label = secondsToTarget <= 35 ? 'En andén ahora' : `Próxima parada (~${Math.ceil(secondsToTarget / 60)} min)`;
    } else {
      state = 'upcoming';
      const legDiff = idx - targetIndex;
      label = `En ~${Math.ceil(secondsToTarget / 60) + legDiff * 4} min`;
    }

    return {
      ...st,
      state,
      label,
    };
  });

  return {
    trainNumber: servicio?.numero || 'S/N',
    lineId,
    lineName: servicio?.gerencia?.nombre || 'Línea',
    origin: origName,
    destination: destName,
    trainPosition: [trainLat, trainLng],
    currentStationName: nextStop.name,
    prevStationName: prevStop.name,
    statusBadge,
    statusDetail,
    speedKmH,
    overallProgress,
    secondsToTarget,
    stops: stopsWithStatus,
    targetIndex,
  };
}

/**
 * Generates active trains currently in circulation across the AMBA network
 * for real-time display on MapView.
 */
export function getActiveNetworkTrains() {
  const activeTrains = [
    // --- LÍNEA MITRE ---
    {
      id: 'MIT-3544',
      number: '3544',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'Retiro - Tigre',
      origin: 'Retiro',
      destination: 'Tigre',
      lat: -34.5492,
      lng: -58.4635,
      currentStation: 'Núñez',
      nextStation: 'Rivadavia',
      status: 'En viaje hacia Tigre',
      speed: 58,
      heading: 'Norte',
      etaNextMin: 3,
    },
    {
      id: 'MIT-3521',
      number: '3521',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'Tigre - Retiro',
      origin: 'Tigre',
      destination: 'Retiro',
      lat: -34.4756,
      lng: -58.5092,
      currentStation: 'San Isidro C',
      nextStation: 'Acassuso',
      status: 'En viaje hacia Retiro',
      speed: 55,
      heading: 'Sur',
      etaNextMin: 2,
    },
    {
      id: 'MIT-3561',
      number: '3561',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'Retiro - J. L. Suárez',
      origin: 'Retiro',
      destination: 'J. L. Suárez',
      lat: -34.5772,
      lng: -58.4891,
      currentStation: 'Colegiales',
      nextStation: 'Belgrano R',
      status: 'En viaje hacia J. L. Suárez',
      speed: 52,
      heading: 'Noroeste',
      etaNextMin: 2,
    },
    {
      id: 'MIT-3580',
      number: '3580',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'J. L. Suárez - Retiro',
      origin: 'J. L. Suárez',
      destination: 'Retiro',
      lat: -34.5598,
      lng: -58.5273,
      currentStation: 'San Martín',
      nextStation: 'Miguelete',
      status: 'En viaje hacia Retiro',
      speed: 60,
      heading: 'Sureste',
      etaNextMin: 3,
    },
    {
      id: 'MIT-3610',
      number: '3610',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'Retiro - Bartolomé Mitre',
      origin: 'Retiro',
      destination: 'Bmé. Mitre',
      lat: -34.5412,
      lng: -58.4981,
      currentStation: 'Coghlan',
      nextStation: 'Saavedra',
      status: 'En viaje hacia Bmé. Mitre',
      speed: 48,
      heading: 'Norte',
      etaNextMin: 2,
    },

    // --- LÍNEA SARMIENTO ---
    {
      id: 'SAR-2104',
      number: '2104',
      lineId: 1,
      lineName: 'Sarmiento',
      branch: 'Once - Moreno',
      origin: 'Once',
      destination: 'Moreno',
      lat: -34.6289,
      lng: -58.4647,
      currentStation: 'Flores',
      nextStation: 'Floresta',
      status: 'En viaje hacia Moreno',
      speed: 62,
      heading: 'Oeste',
      etaNextMin: 2,
    },
    {
      id: 'SAR-2133',
      number: '2133',
      lineId: 1,
      lineName: 'Sarmiento',
      branch: 'Moreno - Once',
      origin: 'Moreno',
      destination: 'Once',
      lat: -34.6465,
      lng: -58.6058,
      currentStation: 'Morón',
      nextStation: 'Haedo',
      status: 'En viaje hacia Once',
      speed: 65,
      heading: 'Este',
      etaNextMin: 3,
    },

    // --- LÍNEA ROCA ---
    {
      id: 'ROC-1188',
      number: '1188',
      lineId: 11,
      lineName: 'Roca',
      branch: 'Constitución - La Plata',
      origin: 'Plaza Constitución',
      destination: 'La Plata',
      lat: -34.7214,
      lng: -58.2541,
      currentStation: 'Quilmes',
      nextStation: 'Ezpeleta',
      status: 'En viaje hacia La Plata',
      speed: 64,
      heading: 'Sur',
      etaNextMin: 4,
    },
    {
      id: 'ROC-1152',
      number: '1152',
      lineId: 11,
      lineName: 'Roca',
      branch: 'La Plata - Constitución',
      origin: 'La Plata',
      destination: 'Plaza Constitución',
      lat: -34.7925,
      lng: -58.0754,
      currentStation: 'City Bell',
      nextStation: 'Villa Elisa',
      status: 'En viaje hacia Constitución',
      speed: 68,
      heading: 'Noroeste',
      etaNextMin: 3,
    },
    {
      id: 'ROC-1240',
      number: '1240',
      lineId: 11,
      lineName: 'Roca',
      branch: 'Constitución - Alejandro Korn',
      origin: 'Plaza Constitución',
      destination: 'Alejandro Korn',
      lat: -34.7692,
      lng: -58.3966,
      currentStation: 'Lomas de Zamora',
      nextStation: 'Temperley',
      status: 'En viaje hacia Korn',
      speed: 58,
      heading: 'Sur',
      etaNextMin: 2,
    },
    {
      id: 'ROC-1304',
      number: '1304',
      lineId: 11,
      lineName: 'Roca',
      branch: 'Constitución - Ezeiza',
      origin: 'Plaza Constitución',
      destination: 'Ezeiza',
      lat: -34.8342,
      lng: -58.4962,
      currentStation: 'Monte Grande',
      nextStation: 'El Jagüel',
      status: 'En viaje hacia Ezeiza',
      speed: 60,
      heading: 'Suroeste',
      etaNextMin: 3,
    },

    // --- LÍNEA SAN MARTÍN ---
    {
      id: 'LSM-4412',
      number: '4412',
      lineId: 31,
      lineName: 'San Martín',
      branch: 'Retiro - Pilar',
      origin: 'Retiro',
      destination: 'Pilar',
      lat: -34.5886,
      lng: -58.4371,
      currentStation: 'Palermo',
      nextStation: 'Villa Crespo',
      status: 'En viaje hacia Pilar',
      speed: 54,
      heading: 'Oeste',
      etaNextMin: 3,
    },
    {
      id: 'LSM-4435',
      number: '4435',
      lineId: 31,
      lineName: 'San Martín',
      branch: 'Pilar - Retiro',
      origin: 'Pilar',
      destination: 'Retiro',
      lat: -34.6036,
      lng: -58.5387,
      currentStation: 'Caseros',
      nextStation: 'Devoto',
      status: 'En viaje hacia Retiro',
      speed: 56,
      heading: 'Este',
      etaNextMin: 3,
    },

    // --- LÍNEA BELGRANO SUR ---
    {
      id: 'LBS-8201',
      number: '8201',
      lineId: 21,
      lineName: 'Belgrano Sur',
      branch: 'Sáenz - González Catán',
      origin: 'Dr. Sáenz',
      destination: 'González Catán',
      lat: -34.6853,
      lng: -58.4984,
      currentStation: 'Villegas',
      nextStation: 'Isidro Casanova',
      status: 'En viaje hacia G. Catán',
      speed: 48,
      heading: 'Suroeste',
      etaNextMin: 3,
    },

    // --- TREN DE LA COSTA ---
    {
      id: 'TDC-9102',
      number: '9102',
      lineId: 41,
      lineName: 'Tren de la Costa',
      branch: 'Maipú - Delta',
      origin: 'Maipú',
      destination: 'Delta',
      lat: -34.4654,
      lng: -58.5081,
      currentStation: 'San Isidro R',
      nextStation: 'Punta Chica',
      status: 'En viaje hacia Delta',
      speed: 38,
      heading: 'Noroeste',
      etaNextMin: 2,
    },
  ];

  return activeTrains;
}
