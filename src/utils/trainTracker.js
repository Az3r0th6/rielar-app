import { PRELOADED_STATIONS, LINES_DATA } from '../data/linesData';
import { getDistanceMeters } from './geo';
import { formatLocalTime } from './time';

/**
 * Normalizes station names for fuzzy comparison and acronym resolution
 */
export function normalizeStationName(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bv\.\s*/g, 'villa ')
    .replace(/\bvilla\s+/g, 'villa ')
    .replace(/\bgral\.\s*/g, 'general ')
    .replace(/\bgeneral\s+/g, 'general ')
    .replace(/\bj\.\s*l\.\s*/g, 'j l ')
    .replace(/\bl\.\s*m\.\s*/g, 'l m ')
    .replace(/\bdr\.\s*/g, 'dr ')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * High-precision station resolver supporting ID, object or name
 */
export function findStation(stObjOrNameOrId, lineId = null) {
  if (!stObjOrNameOrId) return null;

  // 1. If passed an object containing station identifiers
  if (typeof stObjOrNameOrId === 'object') {
    const rawId = stObjOrNameOrId.idElemento || stObjOrNameOrId.id_estacion || stObjOrNameOrId.id;
    if (rawId) {
      const match = PRELOADED_STATIONS.find(s => s.id === Number(rawId));
      if (match) return match;
    }
    const name = stObjOrNameOrId.nombre || stObjOrNameOrId.name;
    return findStation(name, lineId || stObjOrNameOrId.lineId);
  }

  // 2. If passed a number or numeric string (station ID)
  if (typeof stObjOrNameOrId === 'number' || /^\d+$/.test(String(stObjOrNameOrId).trim())) {
    const match = PRELOADED_STATIONS.find(s => s.id === Number(stObjOrNameOrId));
    if (match) return match;
  }

  // 3. Match by name
  const target = normalizeStationName(stObjOrNameOrId);
  if (!target) return null;

  // Attempt A: Exact normalized match with line filter
  let match = PRELOADED_STATIONS.find(s => {
    return normalizeStationName(s.name) === target && (!lineId || s.lineId === lineId);
  });
  if (match) return match;

  // Attempt B: Partial contains match with line filter
  match = PRELOADED_STATIONS.find(s => {
    const sNorm = normalizeStationName(s.name);
    return (sNorm.includes(target) || target.includes(sNorm)) && (!lineId || s.lineId === lineId);
  });
  if (match) return match;

  // Attempt C: Exact normalized match across any line
  match = PRELOADED_STATIONS.find(s => normalizeStationName(s.name) === target);
  if (match) return match;

  // Attempt D: Partial contains match across any line
  return PRELOADED_STATIONS.find(s => {
    const sNorm = normalizeStationName(s.name);
    return sNorm.includes(target) || target.includes(sNorm);
  }) || null;
}

export const findStationByName = findStation;

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
      const geo = findStation(st, lineId);
      // In Argentine commuter rail (SOFSE), intermediate and departure stations display
      // the official departure time (salida.programada), while the final terminal displays llegada.programada
      const scheduledTime = (idx === rawStops.length - 1)
        ? (st.llegada?.programada || st.salida?.programada)
        : (st.salida?.programada || st.llegada?.programada);

      const estimatedTime = st.llegada?.estimada || st.salida?.estimada || (st.segundos !== undefined ? new Date(Date.now() + st.segundos * 1000).toISOString() : null);
      const realTime = st.salida?.real || st.llegada?.real;

      return {
        id: st.idElemento || st.id_estacion || geo?.id || idx,
        name: geo?.name || st.nombre,
        lat: geo?.lat || -34.59091,
        lng: geo?.lng || -58.37505,
        anden: st.anden?.nombre || '1',
        scheduledDeparture: st.salida?.programada,
        scheduledArrival: scheduledTime,
        scheduledTime,
        estimatedTime,
        realTime,
        secondsToStop: st.segundos,
      };
    });
  } else {
    // Reconstruct route based on origin & destination from master catalog
    const origGeo = findStation(origName, lineId) || PRELOADED_STATIONS[0];
    const destGeo = findStation(destName, lineId) || PRELOADED_STATIONS[16] || origGeo;
    const targetGeo = findStation(stationName, lineId) || origGeo;

    // Filter stations belonging to the specific branch between origin and destination
    const lineStations = PRELOADED_STATIONS.filter(s => s.lineId === (origGeo.lineId || lineId || 5));
    const targetRamal = origGeo.ramal || destGeo.ramal;
    let branchStations = targetRamal ? lineStations.filter(s => s.ramal === targetRamal) : lineStations;

    const origIdx = branchStations.findIndex(s => normalizeStationName(s.name) === normalizeStationName(origGeo.name));
    const destIdx = branchStations.findIndex(s => normalizeStationName(s.name) === normalizeStationName(destGeo.name));

    if (origIdx !== -1 && destIdx !== -1) {
      if (origIdx > destIdx) {
        branchStations = branchStations.slice(destIdx, origIdx + 1).reverse();
      } else {
        branchStations = branchStations.slice(origIdx, destIdx + 1);
      }
    }

    if (branchStations.length >= 2) {
      stops = branchStations.map(s => ({
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

  // Target index for the station the user clicked or is currently observing
  const targetStationId = trainData?.stationId;
  let targetIndex = -1;

  if (targetStationId) {
    targetIndex = stops.findIndex(s => Number(s.id) === Number(targetStationId));
  }

  if (targetIndex === -1 && stationName) {
    const targetNorm = normalizeStationName(stationName);
    targetIndex = stops.findIndex(s => {
      const sNorm = normalizeStationName(s.name);
      return sNorm === targetNorm || sNorm.includes(targetNorm) || targetNorm.includes(sNorm);
    });
  }

  if (targetIndex === -1) {
    targetIndex = Math.min(Math.floor(stops.length / 2), stops.length - 1);
  }

  const targetStop = stops[targetIndex] || stops[0];

  // Check if we have individual station ETA seconds from SOFSE (servicio.estaciones)
  const hasStopsSeconds = stops.some(s => s.secondsToStop !== undefined && s.secondsToStop !== null);

  let trainLat = targetStop.lat;
  let trainLng = targetStop.lng;
  let currentStationIndex = targetIndex;
  let prevStationIndex = Math.max(0, targetIndex - 1);
  let statusBadge = 'En viaje';
  let statusDetail = '';
  let speedKmH = 43;
  let isAtPlatform = false;

  // PRIORITY A: Direct synchronization with the observed station countdown (secondsToTarget)
  // When secondsToTarget <= 25 (e.g. 0 to 25 segs), the train is AT THE PLATFORM of stationName!
  if (secondsToTarget <= 25) {
    trainLat = targetStop.lat;
    trainLng = targetStop.lng;
    currentStationIndex = targetIndex;
    prevStationIndex = Math.max(0, targetIndex - 1);
    isAtPlatform = true;
    statusBadge = 'En andén';
    statusDetail = `Detenido en Andén ${targetStop.anden || '1'} de ${targetStop.name}`;
    speedKmH = 0;
  } else if (secondsToTarget <= 65) {
    // Train is decelerating and entering the platform of stationName
    const prevStop = stops[Math.max(0, targetIndex - 1)] || targetStop;
    const progress = Math.max(0.65, Math.min(0.99, 1 - ((secondsToTarget - 25) / 40)));
    trainLat = prevStop.lat + (targetStop.lat - prevStop.lat) * progress;
    trainLng = prevStop.lng + (targetStop.lng - prevStop.lng) * progress;
    currentStationIndex = targetIndex;
    prevStationIndex = Math.max(0, targetIndex - 1);
    statusBadge = 'Ingresando a andén';
    statusDetail = `Ingresando a ${targetStop.name} en ${Math.round(secondsToTarget)} seg`;
    speedKmH = Math.round(12 + ((secondsToTarget - 25) / 40) * 14); // 12-26 km/h
  } else if (hasStopsSeconds) {
    // PRIORITY B: Calculate real physical position across the entire route from SOFSE station-by-station seconds!
    const platformStopIdx = stops.findIndex(
      s => s.secondsToStop !== undefined && s.secondsToStop <= 25 && s.secondsToStop >= -35
    );

    if (platformStopIdx !== -1) {
      const pStop = stops[platformStopIdx];
      trainLat = pStop.lat;
      trainLng = pStop.lng;
      currentStationIndex = platformStopIdx;
      prevStationIndex = Math.max(0, platformStopIdx - 1);
      isAtPlatform = true;
      statusBadge = 'En andén';
      statusDetail = `Detenido en Andén ${pStop.anden || '1'} de ${pStop.name}`;
      speedKmH = 0;
    } else {
      let nextIdx = stops.findIndex(s => s.secondsToStop !== undefined && s.secondsToStop > 25);
      if (nextIdx === -1) {
        // All stops passed: train is at final destination
        const lastStop = stops[stops.length - 1];
        trainLat = lastStop.lat;
        trainLng = lastStop.lng;
        currentStationIndex = stops.length - 1;
        prevStationIndex = Math.max(0, stops.length - 2);
        statusBadge = 'Servicio finalizado';
        statusDetail = `Arribó a destino final: ${lastStop.name}`;
        speedKmH = 0;
      } else if (nextIdx === 0) {
        // Departing origin
        const firstStop = stops[0];
        trainLat = firstStop.lat;
        trainLng = firstStop.lng;
        currentStationIndex = 0;
        prevStationIndex = 0;
        statusBadge = 'En andén';
        statusDetail = `Saliendo de cabecera: ${firstStop.name}`;
        speedKmH = 15;
      } else {
        const prevStop = stops[nextIdx - 1];
        const nextStop = stops[nextIdx];
        currentStationIndex = nextIdx;
        prevStationIndex = nextIdx - 1;

        const legDurationSec = Math.max(60, nextStop.secondsToStop - (prevStop.secondsToStop || -180));
        const elapsedSec = Math.max(0, -(prevStop.secondsToStop || 0));
        const progress = Math.max(0.05, Math.min(0.95, elapsedSec / legDurationSec));

        trainLat = prevStop.lat + (nextStop.lat - prevStop.lat) * progress;
        trainLng = prevStop.lng + (nextStop.lng - prevStop.lng) * progress;

        const minToNext = Math.ceil(nextStop.secondsToStop / 60);
        statusBadge = 'En viaje';
        statusDetail = `En trayecto hacia ${nextStop.name} (llega en ~${minToNext} min)`;
        speedKmH = 43;
      }
    }
  } else {
    // PRIORITY C: Fallback when individual station seconds are not provided
    const legDiff = Math.max(0, Math.round(secondsToTarget / 150));
    const activeIdx = Math.max(0, targetIndex - legDiff);
    const pStop = stops[Math.max(0, activeIdx - 1)] || stops[0];
    const nStop = stops[activeIdx] || stops[stops.length - 1];

    currentStationIndex = activeIdx;
    prevStationIndex = Math.max(0, activeIdx - 1);
    const progress = Math.max(0.1, Math.min(0.9, 1 - ((secondsToTarget % 150) / 150)));

    trainLat = pStop.lat + (nStop.lat - pStop.lat) * progress;
    trainLng = pStop.lng + (nStop.lng - pStop.lng) * progress;
    statusBadge = 'En viaje';
    statusDetail = `En trayecto hacia ${nStop.name} (llega en ~${Math.ceil(secondsToTarget / 60)} min)`;
    speedKmH = 43;
  }

  // Calculate total route progress
  const totalStops = stops.length;
  const overallProgress = Math.min(
    100,
    Math.max(5, Math.round((currentStationIndex / Math.max(1, totalStops - 1)) * 100))
  );

  // Assign status to each stop
  const stopsWithStatus = stops.map((st, idx) => {
    let state = 'upcoming';
    let label = '';
    const stopSec = st.secondsToStop;

    if (idx < currentStationIndex) {
      state = 'completed';
      label = st.realTime ? `Salió ${formatLocalTime(st.realTime)}` : 'Paso completado';
    } else if (idx === currentStationIndex) {
      state = 'current';
      if (isAtPlatform) {
        label = 'En andén ahora';
      } else {
        const secDisplay = stopSec ?? secondsToTarget;
        label = `Próxima parada (~${Math.max(1, Math.round(secDisplay / 60))} min)`;
      }
    } else {
      state = 'upcoming';
      if (stopSec !== undefined && stopSec !== null && stopSec > 0) {
        label = `En ~${Math.max(1, Math.round(stopSec / 60))} min`;
      } else {
        const legDiff = idx - currentStationIndex;
        label = `En ~${Math.max(1, Math.round((secondsToTarget || 180) / 60) + legDiff * 3)} min`;
      }
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
    scheduledTime: targetStop?.scheduledTime || null,
    estimatedTime: targetStop?.estimatedTime || null,
    trainPosition: [trainLat, trainLng],
    currentStationName: stops[currentStationIndex]?.name || destName,
    prevStationName: stops[prevStationIndex]?.name || origName,
    statusBadge,
    statusDetail,
    speedKmH,
    overallProgress,
    secondsToTarget,
    stops: stopsWithStatus,
    targetIndex,
    isAtPlatform,
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
      lat: -34.54263,
      lng: -58.46529,
      currentStation: 'Nuñez',
      nextStation: 'Rivadavia',
      progressRatio: 0.5,
      status: 'En viaje hacia Tigre',
      speed: 43,
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
      lat: -34.47587,
      lng: -58.50890,
      currentStation: 'San Isidro C',
      nextStation: 'Acassuso',
      progressRatio: 0.5,
      status: 'En viaje hacia Retiro',
      speed: 42,
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
      destination: 'J.L. Suárez',
      lat: -34.57040,
      lng: -58.45533,
      currentStation: 'Colegiales',
      nextStation: 'Belgrano R',
      progressRatio: 0.5,
      status: 'En viaje hacia J. L. Suárez',
      speed: 41,
      heading: 'Noroeste',
      etaNextMin: 2,
    },
    {
      id: 'MIT-3580',
      number: '3580',
      lineId: 5,
      lineName: 'Mitre',
      branch: 'J. L. Suárez - Retiro',
      origin: 'J.L. Suárez',
      destination: 'Retiro',
      lat: -34.57753,
      lng: -58.52399,
      currentStation: 'San Martín',
      nextStation: 'Miguelete',
      progressRatio: 0.5,
      status: 'En viaje hacia Retiro',
      speed: 44,
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
      lat: -34.55998,
      lng: -58.48085,
      currentStation: 'Coghlan',
      nextStation: 'Saavedra',
      progressRatio: 0.5,
      status: 'En viaje hacia Bmé. Mitre',
      speed: 39,
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
      lat: -34.63005,
      lng: -58.47333,
      currentStation: 'Flores',
      nextStation: 'Floresta',
      progressRatio: 0.5,
      status: 'En viaje hacia Moreno',
      speed: 45,
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
      lat: -34.64660,
      lng: -58.60591,
      currentStation: 'Morón',
      nextStation: 'Haedo',
      progressRatio: 0.5,
      status: 'En viaje hacia Once',
      speed: 46,
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
      origin: 'Constitución',
      destination: 'La Plata',
      lat: -34.73810,
      lng: -58.24754,
      currentStation: 'Quilmes',
      nextStation: 'Ezpeleta',
      progressRatio: 0.5,
      status: 'En viaje hacia La Plata',
      speed: 44,
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
      destination: 'Constitución',
      lat: -34.85775,
      lng: -58.05843,
      currentStation: 'City Bell',
      nextStation: 'Villa Elisa',
      progressRatio: 0.5,
      status: 'En viaje hacia Constitución',
      speed: 45,
      heading: 'Noroeste',
      etaNextMin: 3,
    },
    {
      id: 'ROC-1240',
      number: '1240',
      lineId: 11,
      lineName: 'Roca',
      branch: 'Constitución - Alejandro Korn',
      origin: 'Constitución',
      destination: 'Alejandro Korn',
      lat: -34.76921,
      lng: -58.39661,
      currentStation: 'Lomas de Zamora',
      nextStation: 'Temperley',
      progressRatio: 0.5,
      status: 'En viaje hacia Korn',
      speed: 43,
      heading: 'Sur',
      etaNextMin: 2,
    },
    {
      id: 'ROC-1304',
      number: '1304',
      lineId: 11,
      lineName: 'Roca',
      branch: 'Constitución - Ezeiza',
      origin: 'Constitución',
      destination: 'Ezeiza',
      lat: -34.82383,
      lng: -58.48293,
      currentStation: 'Monte Grande',
      nextStation: 'El Jagüel',
      progressRatio: 0.5,
      status: 'En viaje hacia Ezeiza',
      speed: 44,
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
      lat: -34.58620,
      lng: -58.43768,
      currentStation: 'Palermo',
      nextStation: 'Villa Crespo',
      progressRatio: 0.5,
      status: 'En viaje hacia Pilar',
      speed: 43,
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
      lat: -34.60366,
      lng: -58.53874,
      currentStation: 'Caseros',
      nextStation: 'Devoto',
      progressRatio: 0.5,
      status: 'En viaje hacia Retiro',
      speed: 44,
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
      lat: -34.70676,
      lng: -58.56964,
      currentStation: 'Justo Villegas',
      nextStation: 'Isidro Casanova',
      progressRatio: 0.5,
      status: 'En viaje hacia G. Catán',
      speed: 40,
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
      lat: -34.45805,
      lng: -58.51591,
      currentStation: 'San Isidro R',
      nextStation: 'Punta Chica',
      progressRatio: 0.5,
      status: 'En viaje hacia Delta',
      speed: 34,
      heading: 'Noroeste',
      etaNextMin: 2,
    },
  ];

  // Dynamically lock each circulating train directly to its railway corridor between stations
  return activeTrains.map((train) => {
    const curr = findStationByName(train.currentStation, train.lineId);
    const next = findStationByName(train.nextStation, train.lineId);
    if (curr && next) {
      const ratio = train.progressRatio || 0.5;
      return {
        ...train,
        lat: Number((curr.lat + (next.lat - curr.lat) * ratio).toFixed(5)),
        lng: Number((curr.lng + (next.lng - curr.lng) * ratio).toFixed(5)),
      };
    }
    return train;
  });
}

/**
 * Transforms raw SOFSE live network arrivals into active circulating trains for MapView
 */
export function processRawNetworkTrains(rawList = []) {
  if (!Array.isArray(rawList)) return [];
  const processed = [];

  for (const item of rawList) {
    const num = item.servicio?.numero;
    if (!num) continue;

    const lineId = item.servicio?.lineId || item.servicio?.gerencia?.id || 5;
    const lineName = item.servicio?.gerencia?.nombre || 'Mitre';
    const estaciones = item.servicio?.estaciones || [];

    let trainLat = null;
    let trainLng = null;
    let currentStationName = 'En viaje';
    let nextStationName = item.servicio?.hasta?.estacion?.nombre || 'Destino';
    let speedKmH = 43;
    let statusDetail = 'En viaje';
    let etaNextMin = 3;

    if (estaciones.length >= 2) {
      // 1. Check if train is stopped at any platform (seconds between -35 and 25)
      const platformStop = estaciones.find(s => s.segundos !== undefined && s.segundos <= 25 && s.segundos >= -35);
      if (platformStop) {
        const geo = findStation(platformStop, lineId);
        if (geo) {
          trainLat = geo.lat;
          trainLng = geo.lng;
          currentStationName = geo.name;
          const currentIdx = estaciones.indexOf(platformStop);
          const nextIdx = currentIdx + 1;
          const nextGeo = nextIdx < estaciones.length ? findStation(estaciones[nextIdx], lineId) : null;
          nextStationName = nextGeo?.name || geo.name;
          speedKmH = 0;
          statusDetail = `Detenido en Andén ${platformStop.anden?.nombre || '1'} de ${geo.name}`;
          etaNextMin = 0;
        }
      } else {
        // 2. Train is in transit between two stations
        const lastPassed = estaciones.filter(s => s.segundos !== undefined && s.segundos < -25).pop();
        const nextUpcoming = estaciones.find(s => s.segundos !== undefined && s.segundos > 25);

        if (lastPassed && nextUpcoming) {
          const pGeo = findStation(lastPassed, lineId);
          const nGeo = findStation(nextUpcoming, lineId);
          if (pGeo && nGeo) {
            const legDuration = Math.max(60, nextUpcoming.segundos - lastPassed.segundos);
            const elapsed = Math.max(0, -lastPassed.segundos);
            const progress = Math.max(0.05, Math.min(0.95, elapsed / legDuration));

            trainLat = pGeo.lat + (nGeo.lat - pGeo.lat) * progress;
            trainLng = pGeo.lng + (nGeo.lng - pGeo.lng) * progress;
            currentStationName = pGeo.name;
            nextStationName = nGeo.name;
            speedKmH = 43;
            etaNextMin = Math.max(1, Math.ceil(nextUpcoming.segundos / 60));
            statusDetail = `En viaje hacia ${nGeo.name} (llega en ~${etaNextMin} min)`;
          }
        } else if (!lastPassed && nextUpcoming) {
          // At origin platform awaiting departure
          const firstGeo = findStation(estaciones[0], lineId);
          if (firstGeo) {
            trainLat = firstGeo.lat;
            trainLng = firstGeo.lng;
            currentStationName = firstGeo.name;
            nextStationName = findStation(nextUpcoming, lineId)?.name || firstGeo.name;
            speedKmH = 0;
            statusDetail = `En cabecera: ${firstGeo.name}`;
            etaNextMin = Math.max(1, Math.ceil(nextUpcoming.segundos / 60));
          }
        } else if (lastPassed && !nextUpcoming) {
          // Completed route at destination
          const lastGeo = findStation(estaciones[estaciones.length - 1], lineId);
          if (lastGeo) {
            trainLat = lastGeo.lat;
            trainLng = lastGeo.lng;
            currentStationName = lastGeo.name;
            nextStationName = lastGeo.name;
            speedKmH = 0;
            statusDetail = `Arribó a ${lastGeo.name}`;
            etaNextMin = 0;
          }
        }
      }
    }

    // Fallback to journey calculation if physical interpolation couldn't resolve
    if (!trainLat || !trainLng) {
      const journey = calculateTrainJourney({
        ...item,
        stationName: item.stationName || item.servicio?.hasta?.estacion?.nombre,
      });
      if (journey && journey.trainPosition) {
        trainLat = journey.trainPosition[0];
        trainLng = journey.trainPosition[1];
        currentStationName = journey.currentStationName;
        nextStationName = journey.stops.find(s => s.state === 'upcoming')?.name || journey.destination;
        speedKmH = journey.speedKmH;
        statusDetail = journey.statusDetail;
        etaNextMin = Math.max(1, Math.ceil(journey.secondsToTarget / 60));
      }
    }

    if (trainLat && trainLng) {
      const origName = item.servicio?.desde?.estacion?.nombre || item.servicio?.estaciones?.[0]?.nombre || 'Origen';
      const destName = item.servicio?.hasta?.estacion?.nombre || item.servicio?.estaciones?.[item.servicio.estaciones.length - 1]?.nombre || 'Destino';

      processed.push({
        id: `NET-${num}`,
        number: String(num),
        lineId,
        lineName,
        branch: `${origName} - ${destName}`,
        origin: origName,
        destination: destName,
        currentStation: currentStationName,
        nextStation: nextStationName,
        lat: Number(trainLat.toFixed(5)),
        lng: Number(trainLng.toFixed(5)),
        speed: speedKmH,
        status: statusDetail,
        etaNextMin,
        servicio: item.servicio,
        arribo: item.arribo,
        stationName: currentStationName,
        stationId: item.arribo?.id_estacion || null,
      });
    }
  }

  return processed;
}
