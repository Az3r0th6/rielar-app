// Catálogo Oficial de Cuadros Horarios y Grillas de Servicios del AMBA
// Trenes Argentinos (SOFSE) • Días Hábiles, Sábados y Domingos/Feriados

/**
 * Utility to generate sequential service timetable based on service pattern
 */
function generateTimetable({
  servicePrefix,
  firstTime,
  lastTime,
  frequencyMinutes, // can be a function (hour => minutes) or fixed number
  travelMinutes,
  origin,
  destination,
  type = 'Común',
  intermediateStops = [],
}) {
  const [startH, startM] = firstTime.split(':').map(Number);
  const [endH, endM] = lastTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const services = [];
  let serviceNumber = 1;

  while (currentMinutes <= endMinutes) {
    const depH = Math.floor(currentMinutes / 60);
    const depM = currentMinutes % 60;
    const depTimeStr = `${String(depH).padStart(2, '0')}:${String(depM).padStart(2, '0')}`;

    const arrTotalMinutes = currentMinutes + travelMinutes;
    const arrH = Math.floor(arrTotalMinutes / 60) % 24;
    const arrM = arrTotalMinutes % 60;
    const arrTimeStr = `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;

    // Intermediate stops estimated times
    const stopsWithTimes = intermediateStops.map((stop) => {
      const stopMinutes = currentMinutes + Math.round(travelMinutes * stop.ratio);
      const sH = Math.floor(stopMinutes / 60) % 24;
      const sM = stopMinutes % 60;
      return {
        name: stop.name,
        time: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
      };
    });

    services.push({
      number: `${servicePrefix}-${1000 + serviceNumber * 2}`,
      departure: depTimeStr,
      arrival: arrTimeStr,
      origin,
      destination,
      durationMinutes: travelMinutes,
      type,
      intermediateStops: stopsWithTimes,
    });

    // Calculate next interval based on time of day
    let freq = typeof frequencyMinutes === 'function' ? frequencyMinutes(depH) : frequencyMinutes;
    currentMinutes += freq;
    serviceNumber++;
  }

  return services;
}

// Frequency helpers
const mitrePeakFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 13 : (h >= 20 ? 20 : 15);
const sarmientoPeakFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 9 : (h >= 21 ? 18 : 12);
const rocaKornFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 12 : (h >= 21 ? 20 : 15);
const rocaPlataFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 18 : (h >= 21 ? 28 : 24);
const sanMartinFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 14 : (h >= 21 ? 22 : 16);
const belgranoCatanFreq = (h) => (h >= 6 && h < 9) || (h >= 16 && h < 20) ? 16 : (h >= 21 ? 25 : 20);

export const SCHEDULES_BRANCHES = [
  // ========================================================
  // LÍNEA MITRE (id: 5)
  // ========================================================
  {
    id: 'mitre-tigre',
    lineId: 5,
    lineName: 'Mitre',
    name: 'Retiro ⇄ Tigre',
    description: 'Ramal Tigre (Vía Belgrano C - Olivos - San Isidro)',
    color: '#009fe3',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-mitre',
    directions: {
      outbound: {
        name: 'Retiro ➔ Tigre',
        origin: 'Retiro',
        destination: 'Tigre',
        travelMinutes: 52,
        intermediateStops: [
          { name: 'Belgrano C', ratio: 0.22 },
          { name: 'Vicente López', ratio: 0.38 },
          { name: 'San Isidro C', ratio: 0.58 },
          { name: 'Victoria', ratio: 0.76 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '04:30',
            lastTime: '23:00',
            frequencyMinutes: mitrePeakFreq,
            travelMinutes: 52,
            origin: 'Retiro',
            destination: 'Tigre',
            intermediateStops: [
              { name: 'Belgrano C', ratio: 0.22 },
              { name: 'Vicente López', ratio: 0.38 },
              { name: 'San Isidro C', ratio: 0.58 },
              { name: 'Victoria', ratio: 0.76 },
            ],
          }),
          saturdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:00',
            lastTime: '23:00',
            frequencyMinutes: (h) => (h >= 9 && h <= 18 ? 16 : 20),
            travelMinutes: 52,
            origin: 'Retiro',
            destination: 'Tigre',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:33',
            lastTime: '22:30',
            frequencyMinutes: 20,
            travelMinutes: 52,
            origin: 'Retiro',
            destination: 'Tigre',
          }),
        },
      },
      inbound: {
        name: 'Tigre ➔ Retiro',
        origin: 'Tigre',
        destination: 'Retiro',
        travelMinutes: 52,
        intermediateStops: [
          { name: 'Victoria', ratio: 0.24 },
          { name: 'San Isidro C', ratio: 0.42 },
          { name: 'Vicente López', ratio: 0.62 },
          { name: 'Belgrano C', ratio: 0.78 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '03:50',
            lastTime: '22:20',
            frequencyMinutes: mitrePeakFreq,
            travelMinutes: 52,
            origin: 'Tigre',
            destination: 'Retiro',
          }),
          saturdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '04:48',
            lastTime: '22:20',
            frequencyMinutes: (h) => (h >= 9 && h <= 18 ? 16 : 20),
            travelMinutes: 52,
            origin: 'Tigre',
            destination: 'Retiro',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:15',
            lastTime: '21:50',
            frequencyMinutes: 20,
            travelMinutes: 52,
            origin: 'Tigre',
            destination: 'Retiro',
          }),
        },
      },
    },
  },
  {
    id: 'mitre-suarez',
    lineId: 5,
    lineName: 'Mitre',
    name: 'Retiro ⇄ J.L. Suárez',
    description: 'Ramal J.L. Suárez (Vía Colegiales - San Martín - Ballester)',
    color: '#009fe3',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-mitre',
    directions: {
      outbound: {
        name: 'Retiro ➔ J.L. Suárez',
        origin: 'Retiro',
        destination: 'J.L. Suárez',
        travelMinutes: 48,
        intermediateStops: [
          { name: 'Colegiales', ratio: 0.23 },
          { name: 'Belgrano R', ratio: 0.32 },
          { name: 'San Martín', ratio: 0.58 },
          { name: 'Villa Ballester', ratio: 0.81 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '35',
            firstTime: '04:45',
            lastTime: '22:45',
            frequencyMinutes: mitrePeakFreq,
            travelMinutes: 48,
            origin: 'Retiro',
            destination: 'J.L. Suárez',
          }),
          saturdays: generateTimetable({
            servicePrefix: '35',
            firstTime: '05:10',
            lastTime: '22:45',
            frequencyMinutes: 18,
            travelMinutes: 48,
            origin: 'Retiro',
            destination: 'J.L. Suárez',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '35',
            firstTime: '06:00',
            lastTime: '22:15',
            frequencyMinutes: 22,
            travelMinutes: 48,
            origin: 'Retiro',
            destination: 'J.L. Suárez',
          }),
        },
      },
      inbound: {
        name: 'J.L. Suárez ➔ Retiro',
        origin: 'J.L. Suárez',
        destination: 'Retiro',
        travelMinutes: 48,
        intermediateStops: [
          { name: 'Villa Ballester', ratio: 0.19 },
          { name: 'San Martín', ratio: 0.42 },
          { name: 'Belgrano R', ratio: 0.68 },
          { name: 'Colegiales', ratio: 0.77 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '35',
            firstTime: '04:00',
            lastTime: '22:00',
            frequencyMinutes: mitrePeakFreq,
            travelMinutes: 48,
            origin: 'J.L. Suárez',
            destination: 'Retiro',
          }),
          saturdays: generateTimetable({
            servicePrefix: '35',
            firstTime: '04:30',
            lastTime: '22:00',
            frequencyMinutes: 18,
            travelMinutes: 48,
            origin: 'J.L. Suárez',
            destination: 'Retiro',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '35',
            firstTime: '05:15',
            lastTime: '21:30',
            frequencyMinutes: 22,
            travelMinutes: 48,
            origin: 'J.L. Suárez',
            destination: 'Retiro',
          }),
        },
      },
    },
  },
  {
    id: 'mitre-mitre',
    lineId: 5,
    lineName: 'Mitre',
    name: 'Retiro ⇄ Bmé. Mitre',
    description: 'Ramal Bmé. Mitre (Vía Coghlan - Saavedra - Florida)',
    color: '#009fe3',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-mitre',
    directions: {
      outbound: {
        name: 'Retiro ➔ Bmé. Mitre',
        origin: 'Retiro',
        destination: 'Bmé. Mitre',
        travelMinutes: 38,
        intermediateStops: [
          { name: 'Belgrano R', ratio: 0.35 },
          { name: 'Coghlan', ratio: 0.48 },
          { name: 'Saavedra', ratio: 0.64 },
          { name: 'Florida', ratio: 0.82 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:10',
            lastTime: '21:40',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 25 : 35),
            travelMinutes: 38,
            origin: 'Retiro',
            destination: 'Bmé. Mitre',
          }),
          saturdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:30',
            lastTime: '21:40',
            frequencyMinutes: 30,
            travelMinutes: 38,
            origin: 'Retiro',
            destination: 'Bmé. Mitre',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '33',
            firstTime: '06:30',
            lastTime: '21:00',
            frequencyMinutes: 35,
            travelMinutes: 38,
            origin: 'Retiro',
            destination: 'Bmé. Mitre',
          }),
        },
      },
      inbound: {
        name: 'Bmé. Mitre ➔ Retiro',
        origin: 'Bmé. Mitre',
        destination: 'Retiro',
        travelMinutes: 38,
        intermediateStops: [
          { name: 'Florida', ratio: 0.18 },
          { name: 'Saavedra', ratio: 0.36 },
          { name: 'Coghlan', ratio: 0.52 },
          { name: 'Belgrano R', ratio: 0.65 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '04:30',
            lastTime: '21:00',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 25 : 35),
            travelMinutes: 38,
            origin: 'Bmé. Mitre',
            destination: 'Retiro',
          }),
          saturdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:00',
            lastTime: '21:00',
            frequencyMinutes: 30,
            travelMinutes: 38,
            origin: 'Bmé. Mitre',
            destination: 'Retiro',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:45',
            lastTime: '20:20',
            frequencyMinutes: 35,
            travelMinutes: 38,
            origin: 'Bmé. Mitre',
            destination: 'Retiro',
          }),
        },
      },
    },
  },

  // ========================================================
  // LÍNEA SARMIENTO (id: 1)
  // ========================================================
  {
    id: 'sarmiento-once-moreno',
    lineId: 1,
    lineName: 'Sarmiento',
    name: 'Once ⇄ Moreno',
    description: 'Troncal Eléctrico (Vía Flores - Liniers - Morón - Castelar - Merlo)',
    color: '#008b47',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-sarmiento',
    directions: {
      outbound: {
        name: 'Once ➔ Moreno',
        origin: 'Once',
        destination: 'Moreno',
        travelMinutes: 65,
        intermediateStops: [
          { name: 'Flores', ratio: 0.18 },
          { name: 'Liniers', ratio: 0.32 },
          { name: 'Morón', ratio: 0.48 },
          { name: 'Castelar', ratio: 0.55 },
          { name: 'Merlo', ratio: 0.77 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '32',
            firstTime: '04:05',
            lastTime: '23:55',
            frequencyMinutes: sarmientoPeakFreq,
            travelMinutes: 65,
            origin: 'Once',
            destination: 'Moreno',
          }),
          saturdays: generateTimetable({
            servicePrefix: '32',
            firstTime: '04:05',
            lastTime: '23:55',
            frequencyMinutes: (h) => (h >= 9 && h <= 19 ? 12 : 16),
            travelMinutes: 65,
            origin: 'Once',
            destination: 'Moreno',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '32',
            firstTime: '05:00',
            lastTime: '23:50',
            frequencyMinutes: 16,
            travelMinutes: 65,
            origin: 'Once',
            destination: 'Moreno',
          }),
        },
      },
      inbound: {
        name: 'Moreno ➔ Once',
        origin: 'Moreno',
        destination: 'Once',
        travelMinutes: 65,
        intermediateStops: [
          { name: 'Merlo', ratio: 0.23 },
          { name: 'Castelar', ratio: 0.45 },
          { name: 'Morón', ratio: 0.52 },
          { name: 'Liniers', ratio: 0.68 },
          { name: 'Flores', ratio: 0.82 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '32',
            firstTime: '03:10',
            lastTime: '22:30',
            frequencyMinutes: sarmientoPeakFreq,
            travelMinutes: 65,
            origin: 'Moreno',
            destination: 'Once',
          }),
          saturdays: generateTimetable({
            servicePrefix: '32',
            firstTime: '03:10',
            lastTime: '22:30',
            frequencyMinutes: (h) => (h >= 9 && h <= 19 ? 12 : 16),
            travelMinutes: 65,
            origin: 'Moreno',
            destination: 'Once',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '32',
            firstTime: '04:05',
            lastTime: '22:30',
            frequencyMinutes: 16,
            travelMinutes: 65,
            origin: 'Moreno',
            destination: 'Once',
          }),
        },
      },
    },
  },
  {
    id: 'sarmiento-moreno-mercedes',
    lineId: 1,
    lineName: 'Sarmiento',
    name: 'Moreno ⇄ Mercedes',
    description: 'Ramal Diésel (Vía Gral. Rodríguez - Luján - Jáuregui)',
    color: '#008b47',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-sarmiento',
    directions: {
      outbound: {
        name: 'Moreno ➔ Mercedes',
        origin: 'Moreno',
        destination: 'Mercedes',
        travelMinutes: 98,
        intermediateStops: [
          { name: 'Gral. Rodríguez', ratio: 0.35 },
          { name: 'Luján', ratio: 0.65 },
          { name: 'Jáuregui', ratio: 0.78 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '27',
            firstTime: '06:50',
            lastTime: '18:30',
            frequencyMinutes: 115,
            travelMinutes: 98,
            origin: 'Moreno',
            destination: 'Mercedes',
          }),
          saturdays: generateTimetable({
            servicePrefix: '27',
            firstTime: '06:50',
            lastTime: '18:30',
            frequencyMinutes: 115,
            travelMinutes: 98,
            origin: 'Moreno',
            destination: 'Mercedes',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '27',
            firstTime: '07:30',
            lastTime: '18:30',
            frequencyMinutes: 130,
            travelMinutes: 98,
            origin: 'Moreno',
            destination: 'Mercedes',
          }),
        },
      },
      inbound: {
        name: 'Mercedes ➔ Moreno',
        origin: 'Mercedes',
        destination: 'Moreno',
        travelMinutes: 98,
        intermediateStops: [
          { name: 'Jáuregui', ratio: 0.22 },
          { name: 'Luján', ratio: 0.35 },
          { name: 'Gral. Rodríguez', ratio: 0.65 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '27',
            firstTime: '09:20',
            lastTime: '21:10',
            frequencyMinutes: 115,
            travelMinutes: 98,
            origin: 'Mercedes',
            destination: 'Moreno',
          }),
          saturdays: generateTimetable({
            servicePrefix: '27',
            firstTime: '09:20',
            lastTime: '21:10',
            frequencyMinutes: 115,
            travelMinutes: 98,
            origin: 'Mercedes',
            destination: 'Moreno',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '27',
            firstTime: '10:00',
            lastTime: '21:10',
            frequencyMinutes: 130,
            travelMinutes: 98,
            origin: 'Mercedes',
            destination: 'Moreno',
          }),
        },
      },
    },
  },

  // ========================================================
  // LÍNEA ROCA (id: 11)
  // ========================================================
  {
    id: 'roca-constitucion-laplata',
    lineId: 11,
    lineName: 'Roca',
    name: 'Constitución ⇄ La Plata',
    description: 'Ramal La Plata (Vía Bernal - Quilmes - Berazategui - City Bell)',
    color: '#004f9e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-roca',
    directions: {
      outbound: {
        name: 'Constitución ➔ La Plata',
        origin: 'Constitución',
        destination: 'La Plata',
        travelMinutes: 70,
        intermediateStops: [
          { name: 'Bernal', ratio: 0.24 },
          { name: 'Quilmes', ratio: 0.31 },
          { name: 'Berazategui', ratio: 0.44 },
          { name: 'City Bell', ratio: 0.76 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '41',
            firstTime: '04:38',
            lastTime: '22:42',
            frequencyMinutes: rocaPlataFreq,
            travelMinutes: 70,
            origin: 'Constitución',
            destination: 'La Plata',
          }),
          saturdays: generateTimetable({
            servicePrefix: '41',
            firstTime: '04:38',
            lastTime: '22:42',
            frequencyMinutes: 24,
            travelMinutes: 70,
            origin: 'Constitución',
            destination: 'La Plata',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '41',
            firstTime: '05:30',
            lastTime: '22:00',
            frequencyMinutes: 30,
            travelMinutes: 70,
            origin: 'Constitución',
            destination: 'La Plata',
          }),
        },
      },
      inbound: {
        name: 'La Plata ➔ Constitución',
        origin: 'La Plata',
        destination: 'Constitución',
        travelMinutes: 70,
        intermediateStops: [
          { name: 'City Bell', ratio: 0.24 },
          { name: 'Berazategui', ratio: 0.56 },
          { name: 'Quilmes', ratio: 0.69 },
          { name: 'Bernal', ratio: 0.76 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '41',
            firstTime: '04:12',
            lastTime: '22:17',
            frequencyMinutes: rocaPlataFreq,
            travelMinutes: 70,
            origin: 'La Plata',
            destination: 'Constitución',
          }),
          saturdays: generateTimetable({
            servicePrefix: '41',
            firstTime: '04:12',
            lastTime: '22:17',
            frequencyMinutes: 24,
            travelMinutes: 70,
            origin: 'La Plata',
            destination: 'Constitución',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '41',
            firstTime: '05:00',
            lastTime: '21:30',
            frequencyMinutes: 30,
            travelMinutes: 70,
            origin: 'La Plata',
            destination: 'Constitución',
          }),
        },
      },
    },
  },
  {
    id: 'roca-constitucion-ezeiza',
    lineId: 11,
    lineName: 'Roca',
    name: 'Constitución ⇄ Ezeiza',
    description: 'Ramal Ezeiza (Vía Lanús - Lomas de Zamora - Temperley - Monte Grande)',
    color: '#004f9e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-roca',
    directions: {
      outbound: {
        name: 'Constitución ➔ Ezeiza',
        origin: 'Constitución',
        destination: 'Ezeiza',
        travelMinutes: 54,
        intermediateStops: [
          { name: 'Lanús', ratio: 0.22 },
          { name: 'Lomas de Zamora', ratio: 0.38 },
          { name: 'Temperley', ratio: 0.46 },
          { name: 'Monte Grande', ratio: 0.78 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '31',
            firstTime: '04:18',
            lastTime: '23:05',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 15 : 22),
            travelMinutes: 54,
            origin: 'Constitución',
            destination: 'Ezeiza',
          }),
          saturdays: generateTimetable({
            servicePrefix: '31',
            firstTime: '04:18',
            lastTime: '23:05',
            frequencyMinutes: 20,
            travelMinutes: 54,
            origin: 'Constitución',
            destination: 'Ezeiza',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '31',
            firstTime: '05:05',
            lastTime: '22:15',
            frequencyMinutes: 25,
            travelMinutes: 54,
            origin: 'Constitución',
            destination: 'Ezeiza',
          }),
        },
      },
      inbound: {
        name: 'Ezeiza ➔ Constitución',
        origin: 'Ezeiza',
        destination: 'Constitución',
        travelMinutes: 54,
        intermediateStops: [
          { name: 'Monte Grande', ratio: 0.22 },
          { name: 'Temperley', ratio: 0.54 },
          { name: 'Lomas de Zamora', ratio: 0.62 },
          { name: 'Lanús', ratio: 0.78 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '31',
            firstTime: '04:02',
            lastTime: '22:48',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 15 : 22),
            travelMinutes: 54,
            origin: 'Ezeiza',
            destination: 'Constitución',
          }),
          saturdays: generateTimetable({
            servicePrefix: '31',
            firstTime: '04:02',
            lastTime: '22:48',
            frequencyMinutes: 20,
            travelMinutes: 54,
            origin: 'Ezeiza',
            destination: 'Constitución',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '31',
            firstTime: '04:50',
            lastTime: '21:55',
            frequencyMinutes: 25,
            travelMinutes: 54,
            origin: 'Ezeiza',
            destination: 'Constitución',
          }),
        },
      },
    },
  },
  {
    id: 'roca-constitucion-korn',
    lineId: 11,
    lineName: 'Roca',
    name: 'Constitución ⇄ Alejandro Korn',
    description: 'Ramal A. Korn (Vía Lanús - Lomas - Temperley - Burzaco - Glew)',
    color: '#004f9e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-roca',
    directions: {
      outbound: {
        name: 'Constitución ➔ A. Korn',
        origin: 'Constitución',
        destination: 'Alejandro Korn',
        travelMinutes: 58,
        intermediateStops: [
          { name: 'Lanús', ratio: 0.21 },
          { name: 'Temperley', ratio: 0.43 },
          { name: 'Burzaco', ratio: 0.60 },
          { name: 'Glew', ratio: 0.76 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '54',
            firstTime: '04:05',
            lastTime: '22:58',
            frequencyMinutes: rocaKornFreq,
            travelMinutes: 58,
            origin: 'Constitución',
            destination: 'Alejandro Korn',
          }),
          saturdays: generateTimetable({
            servicePrefix: '54',
            firstTime: '04:05',
            lastTime: '22:58',
            frequencyMinutes: 18,
            travelMinutes: 58,
            origin: 'Constitución',
            destination: 'Alejandro Korn',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '54',
            firstTime: '05:00',
            lastTime: '22:10',
            frequencyMinutes: 24,
            travelMinutes: 58,
            origin: 'Constitución',
            destination: 'Alejandro Korn',
          }),
        },
      },
      inbound: {
        name: 'A. Korn ➔ Constitución',
        origin: 'Alejandro Korn',
        destination: 'Constitución',
        travelMinutes: 58,
        intermediateStops: [
          { name: 'Glew', ratio: 0.24 },
          { name: 'Burzaco', ratio: 0.40 },
          { name: 'Temperley', ratio: 0.57 },
          { name: 'Lanús', ratio: 0.79 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '54',
            firstTime: '04:00',
            lastTime: '22:40',
            frequencyMinutes: rocaKornFreq,
            travelMinutes: 58,
            origin: 'Alejandro Korn',
            destination: 'Constitución',
          }),
          saturdays: generateTimetable({
            servicePrefix: '54',
            firstTime: '04:00',
            lastTime: '22:40',
            frequencyMinutes: 18,
            travelMinutes: 58,
            origin: 'Alejandro Korn',
            destination: 'Constitución',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '54',
            firstTime: '04:55',
            lastTime: '21:50',
            frequencyMinutes: 24,
            travelMinutes: 58,
            origin: 'Alejandro Korn',
            destination: 'Constitución',
          }),
        },
      },
    },
  },
  {
    id: 'roca-constitucion-bosques-q',
    lineId: 11,
    lineName: 'Roca',
    name: 'Constitución ⇄ Bosques (Vía Quilmes)',
    description: 'Circuito Bosques Vía Quilmes (Vía Sarandí - Quilmes - Berazategui)',
    color: '#004f9e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-roca',
    directions: {
      outbound: {
        name: 'Constitución ➔ Bosques (Vía Q)',
        origin: 'Constitución',
        destination: 'Bosques',
        travelMinutes: 55,
        intermediateStops: [
          { name: 'Sarandí', ratio: 0.16 },
          { name: 'Quilmes', ratio: 0.36 },
          { name: 'Berazategui', ratio: 0.52 },
          { name: 'Ranelagh', ratio: 0.74 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '21',
            firstTime: '04:44',
            lastTime: '22:45',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 18 : 26),
            travelMinutes: 55,
            origin: 'Constitución',
            destination: 'Bosques',
          }),
          saturdays: generateTimetable({
            servicePrefix: '21',
            firstTime: '04:44',
            lastTime: '22:45',
            frequencyMinutes: 24,
            travelMinutes: 55,
            origin: 'Constitución',
            destination: 'Bosques',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '21',
            firstTime: '05:35',
            lastTime: '22:05',
            frequencyMinutes: 30,
            travelMinutes: 55,
            origin: 'Constitución',
            destination: 'Bosques',
          }),
        },
      },
      inbound: {
        name: 'Bosques ➔ Constitución (Vía Q)',
        origin: 'Bosques',
        destination: 'Constitución',
        travelMinutes: 55,
        intermediateStops: [
          { name: 'Ranelagh', ratio: 0.26 },
          { name: 'Berazategui', ratio: 0.48 },
          { name: 'Quilmes', ratio: 0.64 },
          { name: 'Sarandí', ratio: 0.84 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '21',
            firstTime: '04:18',
            lastTime: '22:20',
            frequencyMinutes: (h) => (h >= 6 && h <= 20 ? 18 : 26),
            travelMinutes: 55,
            origin: 'Bosques',
            destination: 'Constitución',
          }),
          saturdays: generateTimetable({
            servicePrefix: '21',
            firstTime: '04:18',
            lastTime: '22:20',
            frequencyMinutes: 24,
            travelMinutes: 55,
            origin: 'Bosques',
            destination: 'Constitución',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '21',
            firstTime: '05:10',
            lastTime: '21:40',
            frequencyMinutes: 30,
            travelMinutes: 55,
            origin: 'Bosques',
            destination: 'Constitución',
          }),
        },
      },
    },
  },

  // ========================================================
  // LÍNEA SAN MARTÍN (id: 31)
  // ========================================================
  {
    id: 'sanmartin-retiro-pilar',
    lineId: 31,
    lineName: 'San Martín',
    name: 'Retiro ⇄ Pilar / Cabred',
    description: 'Troncal Retiro - Caseros - San Miguel - José C. Paz - Pilar - Dr. Cabred',
    color: '#3182ce',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-san-martin',
    directions: {
      outbound: {
        name: 'Retiro ➔ Pilar',
        origin: 'Retiro',
        destination: 'Pilar',
        travelMinutes: 78,
        intermediateStops: [
          { name: 'Palermo', ratio: 0.12 },
          { name: 'Caseros', ratio: 0.32 },
          { name: 'Hurlingham', ratio: 0.44 },
          { name: 'San Miguel', ratio: 0.58 },
          { name: 'José C. Paz', ratio: 0.69 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '04:30',
            lastTime: '23:45',
            frequencyMinutes: sanMartinFreq,
            travelMinutes: 78,
            origin: 'Retiro',
            destination: 'Pilar',
          }),
          saturdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:00',
            lastTime: '23:45',
            frequencyMinutes: 18,
            travelMinutes: 78,
            origin: 'Retiro',
            destination: 'Pilar',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '33',
            firstTime: '05:30',
            lastTime: '23:00',
            frequencyMinutes: 22,
            travelMinutes: 78,
            origin: 'Retiro',
            destination: 'Pilar',
          }),
        },
      },
      inbound: {
        name: 'Pilar ➔ Retiro',
        origin: 'Pilar',
        destination: 'Retiro',
        travelMinutes: 78,
        intermediateStops: [
          { name: 'José C. Paz', ratio: 0.31 },
          { name: 'San Miguel', ratio: 0.42 },
          { name: 'Hurlingham', ratio: 0.56 },
          { name: 'Caseros', ratio: 0.68 },
          { name: 'Palermo', ratio: 0.88 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '03:30',
            lastTime: '22:50',
            frequencyMinutes: sanMartinFreq,
            travelMinutes: 78,
            origin: 'Pilar',
            destination: 'Retiro',
          }),
          saturdays: generateTimetable({
            servicePrefix: '33',
            firstTime: '04:00',
            lastTime: '22:50',
            frequencyMinutes: 18,
            travelMinutes: 78,
            origin: 'Pilar',
            destination: 'Retiro',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '33',
            firstTime: '04:45',
            lastTime: '22:00',
            frequencyMinutes: 22,
            travelMinutes: 78,
            origin: 'Pilar',
            destination: 'Retiro',
          }),
        },
      },
    },
  },

  // ========================================================
  // LÍNEA BELGRANO SUR (id: 21)
  // ========================================================
  {
    id: 'belgrano-saenz-catan',
    lineId: 21,
    lineName: 'Belgrano Sur',
    name: 'Dr. Sáenz ⇄ González Catán',
    description: 'Ramal Catán (Vía Soldati - Lugano - Tapiales - Laferrere)',
    color: '#e53e3e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-belgrano-sur',
    directions: {
      outbound: {
        name: 'Dr. Sáenz ➔ G. Catán',
        origin: 'Dr. Sáenz',
        destination: 'González Catán',
        travelMinutes: 52,
        intermediateStops: [
          { name: 'Villa Lugano', ratio: 0.25 },
          { name: 'Tapiales', ratio: 0.45 },
          { name: 'Laferrere', ratio: 0.72 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:00',
            lastTime: '22:30',
            frequencyMinutes: belgranoCatanFreq,
            travelMinutes: 52,
            origin: 'Dr. Sáenz',
            destination: 'González Catán',
          }),
          saturdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:30',
            lastTime: '22:30',
            frequencyMinutes: 24,
            travelMinutes: 52,
            origin: 'Dr. Sáenz',
            destination: 'González Catán',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '30',
            firstTime: '06:00',
            lastTime: '21:45',
            frequencyMinutes: 30,
            travelMinutes: 52,
            origin: 'Dr. Sáenz',
            destination: 'González Catán',
          }),
        },
      },
      inbound: {
        name: 'G. Catán ➔ Dr. Sáenz',
        origin: 'González Catán',
        destination: 'Dr. Sáenz',
        travelMinutes: 52,
        intermediateStops: [
          { name: 'Laferrere', ratio: 0.28 },
          { name: 'Tapiales', ratio: 0.55 },
          { name: 'Villa Lugano', ratio: 0.75 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '04:00',
            lastTime: '21:30',
            frequencyMinutes: belgranoCatanFreq,
            travelMinutes: 52,
            origin: 'González Catán',
            destination: 'Dr. Sáenz',
          }),
          saturdays: generateTimetable({
            servicePrefix: '30',
            firstTime: '04:30',
            lastTime: '21:30',
            frequencyMinutes: 24,
            travelMinutes: 52,
            origin: 'González Catán',
            destination: 'Dr. Sáenz',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '30',
            firstTime: '05:00',
            lastTime: '20:45',
            frequencyMinutes: 30,
            travelMinutes: 52,
            origin: 'González Catán',
            destination: 'Dr. Sáenz',
          }),
        },
      },
    },
  },
  {
    id: 'belgrano-saenz-marinos',
    lineId: 21,
    lineName: 'Belgrano Sur',
    name: 'Dr. Sáenz / Tapiales ⇄ Marinos',
    description: 'Ramal Marinos del Crucero Gral. Belgrano (Vía Aldo Bonzi - Libertad)',
    color: '#e53e3e',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/linea-belgrano-sur',
    directions: {
      outbound: {
        name: 'Dr. Sáenz ➔ Marinos',
        origin: 'Dr. Sáenz',
        destination: 'Marinos C. G. Belgrano',
        travelMinutes: 56,
        intermediateStops: [
          { name: 'Tapiales', ratio: 0.40 },
          { name: 'Aldo Bonzi', ratio: 0.52 },
          { name: 'Libertad', ratio: 0.82 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '42',
            firstTime: '05:15',
            lastTime: '21:50',
            frequencyMinutes: 28,
            travelMinutes: 56,
            origin: 'Dr. Sáenz',
            destination: 'Marinos C. G. Belgrano',
          }),
          saturdays: generateTimetable({
            servicePrefix: '42',
            firstTime: '05:40',
            lastTime: '21:50',
            frequencyMinutes: 32,
            travelMinutes: 56,
            origin: 'Dr. Sáenz',
            destination: 'Marinos C. G. Belgrano',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '42',
            firstTime: '06:15',
            lastTime: '21:10',
            frequencyMinutes: 40,
            travelMinutes: 56,
            origin: 'Dr. Sáenz',
            destination: 'Marinos C. G. Belgrano',
          }),
        },
      },
      inbound: {
        name: 'Marinos ➔ Dr. Sáenz',
        origin: 'Marinos C. G. Belgrano',
        destination: 'Dr. Sáenz',
        travelMinutes: 56,
        intermediateStops: [
          { name: 'Libertad', ratio: 0.18 },
          { name: 'Aldo Bonzi', ratio: 0.48 },
          { name: 'Tapiales', ratio: 0.60 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '42',
            firstTime: '04:30',
            lastTime: '21:10',
            frequencyMinutes: 28,
            travelMinutes: 56,
            origin: 'Marinos C. G. Belgrano',
            destination: 'Dr. Sáenz',
          }),
          saturdays: generateTimetable({
            servicePrefix: '42',
            firstTime: '04:55',
            lastTime: '21:10',
            frequencyMinutes: 32,
            travelMinutes: 56,
            origin: 'Marinos C. G. Belgrano',
            destination: 'Dr. Sáenz',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '42',
            firstTime: '05:20',
            lastTime: '20:30',
            frequencyMinutes: 40,
            travelMinutes: 56,
            origin: 'Marinos C. G. Belgrano',
            destination: 'Dr. Sáenz',
          }),
        },
      },
    },
  },

  // ========================================================
  // TREN DE LA COSTA (id: 41)
  // ========================================================
  {
    id: 'tdc-maipu-delta',
    lineId: 41,
    lineName: 'Tren de la Costa',
    name: 'Maipú ⇄ Delta',
    description: 'Corredor Ribereño Norte (Olivos - San Isidro R - San Fernando - Tigre)',
    color: '#8ac53f',
    pdfUrl: 'https://www.argentina.gob.ar/transporte/trenes-argentinos/horarios-tarifas-y-recorridos/tren-de-la-costa',
    directions: {
      outbound: {
        name: 'Maipú ➔ Delta',
        origin: 'Maipú',
        destination: 'Delta',
        travelMinutes: 28,
        intermediateStops: [
          { name: 'Libertador', ratio: 0.28 },
          { name: 'San Isidro R', ratio: 0.52 },
          { name: 'Punta Chica', ratio: 0.72 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '12',
            firstTime: '06:20',
            lastTime: '21:00',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Maipú',
            destination: 'Delta',
          }),
          saturdays: generateTimetable({
            servicePrefix: '12',
            firstTime: '06:50',
            lastTime: '21:20',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Maipú',
            destination: 'Delta',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '12',
            firstTime: '07:20',
            lastTime: '21:20',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Maipú',
            destination: 'Delta',
          }),
        },
      },
      inbound: {
        name: 'Delta ➔ Maipú',
        origin: 'Delta',
        destination: 'Maipú',
        travelMinutes: 28,
        intermediateStops: [
          { name: 'Punta Chica', ratio: 0.28 },
          { name: 'San Isidro R', ratio: 0.48 },
          { name: 'Libertador', ratio: 0.72 },
        ],
        schedules: {
          weekdays: generateTimetable({
            servicePrefix: '12',
            firstTime: '06:50',
            lastTime: '21:30',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Delta',
            destination: 'Maipú',
          }),
          saturdays: generateTimetable({
            servicePrefix: '12',
            firstTime: '07:20',
            lastTime: '21:50',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Delta',
            destination: 'Maipú',
          }),
          sundays_holidays: generateTimetable({
            servicePrefix: '12',
            firstTime: '07:50',
            lastTime: '21:50',
            frequencyMinutes: 30,
            travelMinutes: 28,
            origin: 'Delta',
            destination: 'Maipú',
          }),
        },
      },
    },
  },
];

/**
 * Gets the current day category: 'weekdays' | 'saturdays' | 'sundays_holidays'
 */
export function getCurrentDayType() {
  const day = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0) return 'sundays_holidays';
  if (day === 6) return 'saturdays';
  return 'weekdays';
}

/**
 * Finds next train to depart based on given services list and current time
 */
export function findNextScheduledService(services = []) {
  if (!services || services.length === 0) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const s of services) {
    const [h, m] = s.departure.split(':').map(Number);
    const depMinutes = h * 60 + m;
    if (depMinutes >= currentMinutes) {
      return {
        ...s,
        minutesUntilDeparture: depMinutes - currentMinutes,
      };
    }
  }

  // If passed all, return first of tomorrow morning
  return {
    ...services[0],
    isTomorrow: true,
    minutesUntilDeparture: (24 * 60 - currentMinutes) + (parseInt(services[0].departure.split(':')[0]) * 60 + parseInt(services[0].departure.split(':')[1])),
  };
}
