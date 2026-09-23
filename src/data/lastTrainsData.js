// Catálogo Oficial de Primeros y Últimos Trenes de Cabeceras del AMBA (Trenes Argentinos - SOFSE)
// Horarios programados vigentes por cabecera y sentido para Días Hábiles, Sábados, y Domingos/Feriados.

export const LAST_TRAINS_DATA = [
  // ==========================================
  // LÍNEA MITRE (id: 5)
  // ==========================================
  {
    id: 'mitre-retiro-tigre',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal Tigre',
    origin: 'Retiro',
    originId: 332,
    destination: 'Tigre',
    destId: 389,
    schedule: {
      weekdays: { first: '04:30', last: '23:00' },
      saturdays: { first: '05:00', last: '23:00' },
      sundays_holidays: { first: '05:33', last: '22:30' },
    },
    notes: 'Servicio directo Retiro - Tigre sin transbordos.',
  },
  {
    id: 'mitre-tigre-retiro',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal Tigre',
    origin: 'Tigre',
    originId: 389,
    destination: 'Retiro',
    destId: 332,
    schedule: {
      weekdays: { first: '03:50', last: '22:20' },
      saturdays: { first: '04:48', last: '22:20' },
      sundays_holidays: { first: '05:15', last: '21:50' },
    },
    notes: 'Último tren hacia CABA parte 22:20 (hábiles y sábados).',
  },
  {
    id: 'mitre-retiro-suarez',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal J. L. Suárez',
    origin: 'Retiro',
    originId: 332,
    destination: 'J. L. Suárez',
    destId: 190,
    schedule: {
      weekdays: { first: '04:45', last: '22:45' },
      saturdays: { first: '05:10', last: '22:45' },
      sundays_holidays: { first: '06:00', last: '22:15' },
    },
    notes: 'Pasa por Colegiales, Belgrano R, Urquiza y San Martín.',
  },
  {
    id: 'mitre-suarez-retiro',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal J. L. Suárez',
    origin: 'J. L. Suárez',
    originId: 190,
    destination: 'Retiro',
    destId: 332,
    schedule: {
      weekdays: { first: '04:00', last: '22:00' },
      saturdays: { first: '04:30', last: '22:00' },
      sundays_holidays: { first: '05:15', last: '21:30' },
    },
    notes: 'Última salida desde J. L. Suárez a las 22:00 en días hábiles.',
  },
  {
    id: 'mitre-retiro-mitre',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal Bmé. Mitre',
    origin: 'Retiro',
    originId: 332,
    destination: 'Bmé. Mitre',
    destId: 273,
    schedule: {
      weekdays: { first: '05:10', last: '21:40' },
      saturdays: { first: '05:30', last: '21:40' },
      sundays_holidays: { first: '06:30', last: '21:00' },
    },
    notes: 'Conecta con Tren de la Costa en estación Maipú / Mitre.',
  },
  {
    id: 'mitre-mitre-retiro',
    lineId: 5,
    lineName: 'Mitre',
    ramalName: 'Ramal Bmé. Mitre',
    origin: 'Bmé. Mitre',
    originId: 273,
    destination: 'Retiro',
    destId: 332,
    schedule: {
      weekdays: { first: '04:30', last: '21:00' },
      saturdays: { first: '05:00', last: '21:00' },
      sundays_holidays: { first: '05:45', last: '20:20' },
    },
    notes: 'Último tren desde Olivos/Florida hacia Retiro: 21:00.',
  },

  // ==========================================
  // LÍNEA SARMIENTO (id: 1)
  // ==========================================
  {
    id: 'sarmiento-once-moreno',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Once - Moreno',
    origin: 'Once',
    originId: 293,
    destination: 'Moreno',
    destId: 278,
    schedule: {
      weekdays: { first: '04:05', last: '23:55' },
      saturdays: { first: '04:05', last: '23:55' },
      sundays_holidays: { first: '05:00', last: '23:50' },
    },
    notes: 'Servicio nocturno extendido casi hasta la medianoche (23:55).',
  },
  {
    id: 'sarmiento-moreno-once',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Once - Moreno',
    origin: 'Moreno',
    originId: 278,
    destination: 'Once',
    destId: 293,
    schedule: {
      weekdays: { first: '03:10', last: '22:30' },
      saturdays: { first: '03:10', last: '22:30' },
      sundays_holidays: { first: '04:05', last: '22:30' },
    },
    notes: 'Primer tren de la madrugada a Once parte 03:10.',
  },
  {
    id: 'sarmiento-moreno-mercedes',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Moreno - Mercedes (Diésel)',
    origin: 'Moreno',
    originId: 278,
    destination: 'Mercedes',
    destId: 268,
    schedule: {
      weekdays: { first: '06:50', last: '18:30' },
      saturdays: { first: '06:50', last: '18:30' },
      sundays_holidays: { first: '07:30', last: '18:30' },
    },
    notes: 'Servicio diésel interurbano de frecuencia reducida.',
  },
  {
    id: 'sarmiento-mercedes-moreno',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Moreno - Mercedes (Diésel)',
    origin: 'Mercedes',
    originId: 268,
    destination: 'Moreno',
    destId: 278,
    schedule: {
      weekdays: { first: '09:20', last: '21:10' },
      saturdays: { first: '09:20', last: '21:10' },
      sundays_holidays: { first: '10:00', last: '21:10' },
    },
    notes: 'Última salida desde Mercedes hacia Moreno a las 21:10.',
  },
  {
    id: 'sarmiento-merlo-lobos',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Merlo - Lobos (Diésel)',
    origin: 'Merlo',
    originId: 269,
    destination: 'Lobos',
    destId: 237,
    schedule: {
      weekdays: { first: '06:15', last: '20:30' },
      saturdays: { first: '06:15', last: '20:30' },
      sundays_holidays: { first: '07:00', last: '19:45' },
    },
    notes: 'Transbordo en estación Merlo con el servicio eléctrico Once-Moreno.',
  },
  {
    id: 'sarmiento-lobos-merlo',
    lineId: 1,
    lineName: 'Sarmiento',
    ramalName: 'Merlo - Lobos (Diésel)',
    origin: 'Lobos',
    originId: 237,
    destination: 'Merlo',
    destId: 269,
    schedule: {
      weekdays: { first: '08:30', last: '22:45' },
      saturdays: { first: '08:30', last: '22:45' },
      sundays_holidays: { first: '09:15', last: '22:00' },
    },
    notes: 'Último tren desde Lobos a Merlo a las 22:45.',
  },

  // ==========================================
  // LÍNEA ROCA (id: 11)
  // ==========================================
  {
    id: 'roca-constitucion-laplata',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - La Plata',
    origin: 'Constitución',
    originId: 93,
    destination: 'La Plata',
    destId: 217,
    schedule: {
      weekdays: { first: '04:38', last: '20:55' },
      saturdays: { first: '04:38', last: '20:55' },
      sundays_holidays: { first: '06:05', last: '20:55' },
    },
    notes: 'Última salida desde Constitución a La Plata a las 20:55.',
  },
  {
    id: 'roca-laplata-constitucion',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - La Plata',
    origin: 'La Plata',
    originId: 217,
    destination: 'Constitución',
    destId: 93,
    schedule: {
      weekdays: { first: '04:37', last: '20:55' },
      saturdays: { first: '04:37', last: '20:55' },
      sundays_holidays: { first: '06:05', last: '20:55' },
    },
    notes: 'Última salida desde La Plata hacia Constitución a las 20:55.',
  },
  {
    id: 'roca-constitucion-ezeiza',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - Ezeiza',
    origin: 'Constitución',
    originId: 93,
    destination: 'Ezeiza',
    destId: 132,
    schedule: {
      weekdays: { first: '04:18', last: '22:42' },
      saturdays: { first: '04:18', last: '22:42' },
      sundays_holidays: { first: '05:40', last: '22:05' },
    },
    notes: 'Conecta en Ezeiza con el servicio diésel a Cañuelas.',
  },
  {
    id: 'roca-ezeiza-constitucion',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - Ezeiza',
    origin: 'Ezeiza',
    originId: 132,
    destination: 'Constitución',
    destId: 93,
    schedule: {
      weekdays: { first: '03:52', last: '22:20' },
      saturdays: { first: '03:52', last: '22:20' },
      sundays_holidays: { first: '05:15', last: '21:40' },
    },
    notes: 'Primer tren sale de madrugada (03:52) a Constitución.',
  },
  {
    id: 'roca-constitucion-korn',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - Alejandro Korn',
    origin: 'Constitución',
    originId: 93,
    destination: 'Alejandro Korn',
    destId: 13,
    schedule: {
      weekdays: { first: '04:20', last: '22:28' },
      saturdays: { first: '04:20', last: '22:28' },
      sundays_holidays: { first: '05:30', last: '21:50' },
    },
    notes: 'Vía Temperley, Adrogué, Burzaco y Glew.',
  },
  {
    id: 'roca-korn-constitucion',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - Alejandro Korn',
    origin: 'Alejandro Korn',
    originId: 13,
    destination: 'Constitución',
    destId: 93,
    schedule: {
      weekdays: { first: '04:18', last: '22:18' },
      saturdays: { first: '04:18', last: '22:18' },
      sundays_holidays: { first: '05:25', last: '21:45' },
    },
    notes: 'Último tren desde Korn a Constitución a las 22:18.',
  },
  {
    id: 'roca-constitucion-bosques-quilmes',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Constitución - Bosques (Vía Quilmes)',
    origin: 'Constitución',
    originId: 93,
    destination: 'Bosques',
    destId: 43,
    schedule: {
      weekdays: { first: '04:49', last: '21:28' },
      saturdays: { first: '05:40', last: '20:40' },
      sundays_holidays: { first: '05:40', last: '20:40' },
    },
    notes: 'Circula por Avellaneda, Quilmes y Berazategui.',
  },
  {
    id: 'roca-bosques-quilmes-constitucion',
    lineId: 11,
    lineName: 'Roca',
    ramalName: 'Bosques - Constitución (Vía Quilmes)',
    origin: 'Bosques',
    originId: 43,
    destination: 'Constitución',
    destId: 93,
    schedule: {
      weekdays: { first: '05:07', last: '21:37' },
      saturdays: { first: '05:55', last: '20:50' },
      sundays_holidays: { first: '05:55', last: '20:50' },
    },
    notes: 'Última salida desde Bosques hacia Plaza Constitución a las 21:37.',
  },

  // ==========================================
  // LÍNEA SAN MARTÍN (id: 31)
  // ==========================================
  {
    id: 'sanmartin-retiro-pilar',
    lineId: 31,
    lineName: 'San Martín',
    ramalName: 'Retiro - Pilar / Dr. Cabred',
    origin: 'Retiro (LSM)',
    originId: 463,
    destination: 'Pilar',
    destId: 306,
    schedule: {
      weekdays: { first: '01:30', last: '23:45' },
      saturdays: { first: '01:30', last: '23:45' },
      sundays_holidays: { first: '05:00', last: '23:00' },
    },
    notes: 'Posee salida especial de madrugada a la 01:30 y reanuda a las 04:00.',
  },
  {
    id: 'sanmartin-pilar-retiro',
    lineId: 31,
    lineName: 'San Martín',
    ramalName: 'Retiro - Pilar / Dr. Cabred',
    origin: 'Pilar',
    originId: 306,
    destination: 'Retiro (LSM)',
    destId: 463,
    schedule: {
      weekdays: { first: '03:10', last: '22:40' },
      saturdays: { first: '03:30', last: '22:40' },
      sundays_holidays: { first: '04:15', last: '22:00' },
    },
    notes: 'Último tren hacia Retiro sale 22:40 (hábiles y sábados).',
  },
  {
    id: 'sanmartin-retiro-cabred',
    lineId: 31,
    lineName: 'San Martín',
    ramalName: 'Retiro - Dr. Cabred',
    origin: 'Retiro (LSM)',
    originId: 463,
    destination: 'Dr. Cabred',
    destId: 51,
    schedule: {
      weekdays: { first: '04:00', last: '21:00' },
      saturdays: { first: '04:30', last: '21:00' },
      sundays_holidays: { first: '05:00', last: '20:30' },
    },
    notes: 'Servicios que continúan más allá de Pilar hasta Open Door / Cabred.',
  },

  // ==========================================
  // LÍNEA BELGRANO SUR (id: 21)
  // ==========================================
  {
    id: 'belgrano-saenz-catan',
    lineId: 21,
    lineName: 'Belgrano Sur',
    ramalName: 'Dr. Sáenz - González Catán',
    origin: 'Dr. Sáenz',
    originId: 525,
    destination: 'González Catán',
    destId: 154,
    schedule: {
      weekdays: { first: '05:00', last: '21:40' },
      saturdays: { first: '05:30', last: '21:30' },
      sundays_holidays: { first: '06:15', last: '21:00' },
    },
    notes: 'Cabecera provisional Sáenz en Nueva Pompeya.',
  },
  {
    id: 'belgrano-catan-saenz',
    lineId: 21,
    lineName: 'Belgrano Sur',
    ramalName: 'Dr. Sáenz - González Catán',
    origin: 'González Catán',
    originId: 154,
    destination: 'Dr. Sáenz',
    destId: 525,
    schedule: {
      weekdays: { first: '03:30', last: '20:10' },
      saturdays: { first: '04:00', last: '20:00' },
      sundays_holidays: { first: '05:00', last: '19:40' },
    },
    notes: 'Última salida desde G. Catán a las 20:10 en días hábiles.',
  },
  {
    id: 'belgrano-saenz-marinos',
    lineId: 21,
    lineName: 'Belgrano Sur',
    ramalName: 'Dr. Sáenz - Marinos del C. Gral. Belgrano',
    origin: 'Dr. Sáenz',
    originId: 525,
    destination: 'Marinos C. G. Belgrano',
    destId: 259,
    schedule: {
      weekdays: { first: '05:40', last: '20:30' },
      saturdays: { first: '06:00', last: '20:30' },
      sundays_holidays: { first: '07:00', last: '19:30' },
    },
    notes: 'Ramal M a Merlo / Pontevedra.',
  },
  {
    id: 'belgrano-marinos-saenz',
    lineId: 21,
    lineName: 'Belgrano Sur',
    ramalName: 'Dr. Sáenz - Marinos del C. Gral. Belgrano',
    origin: 'Marinos C. G. Belgrano',
    originId: 259,
    destination: 'Dr. Sáenz',
    destId: 525,
    schedule: {
      weekdays: { first: '04:30', last: '19:20' },
      saturdays: { first: '04:50', last: '19:20' },
      sundays_holidays: { first: '05:45', last: '18:20' },
    },
    notes: 'Cierre anticipado: último servicio hacia CABA a las 19:20.',
  },

  // ==========================================
  // TREN DE LA COSTA (id: 41)
  // ==========================================
  {
    id: 'tdc-maipu-delta',
    lineId: 41,
    lineName: 'Tren de la Costa',
    ramalName: 'Maipú (Olivos) - Delta (Tigre)',
    origin: 'Maipú',
    originId: 248,
    destination: 'Delta',
    destId: 104,
    schedule: {
      weekdays: { first: '06:40', last: '20:20' },
      saturdays: { first: '07:30', last: '20:50' },
      sundays_holidays: { first: '07:30', last: '20:50' },
    },
    notes: 'Recorrido ribereño San Isidro, San Fernando y Tigre.',
  },
  {
    id: 'tdc-delta-maipu',
    lineId: 41,
    lineName: 'Tren de la Costa',
    ramalName: 'Maipú (Olivos) - Delta (Tigre)',
    origin: 'Delta',
    originId: 104,
    destination: 'Maipú',
    destId: 248,
    schedule: {
      weekdays: { first: '06:20', last: '20:00' },
      saturdays: { first: '07:00', last: '20:30' },
      sundays_holidays: { first: '07:00', last: '20:30' },
    },
    notes: 'Último tren desde Delta a las 20:00 (hábiles) y 20:30 (fines de semana).',
  },
];

/**
 * Devuelve el tipo de día actual según el horario local del usuario ('weekdays', 'saturdays', 'sundays_holidays')
 */
export function getCurrentDayType() {
  const day = new Date().getDay();
  if (day === 0) return 'sundays_holidays';
  if (day === 6) return 'saturdays';
  return 'weekdays';
}

/**
 * Calcula el estado en vivo de un cronograma respecto a la hora local actual (HH:MM).
 * Retorna { status: 'operating' | 'last_imminent' | 'ended' | 'not_started', message: string, minutesToLast: number }
 */
export function calculateScheduleStatus(firstTimeStr, lastTimeStr) {
  if (!firstTimeStr || !lastTimeStr) return { status: 'unknown', message: 'Horario regular' };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [fH, fM] = firstTimeStr.split(':').map(Number);
  const firstMinutes = fH * 60 + fM;

  const [lH, lM] = lastTimeStr.split(':').map(Number);
  const lastMinutes = lH * 60 + lM;

  // Si aún no inició el servicio
  if (currentMinutes < firstMinutes) {
    const diff = firstMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    const timeText = hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;
    return {
      status: 'not_started',
      message: `Inicia hoy a las ${firstTimeStr} (en ${timeText})`,
      minutesToFirst: diff,
    };
  }

  // Si ya pasó el último tren de hoy
  if (currentMinutes > lastMinutes) {
    return {
      status: 'ended',
      message: `Servicio finalizado por hoy. Próximo tren mañana a las ${firstTimeStr}`,
      minutesToLast: -1,
    };
  }

  // Falta menos de 90 minutos para el último tren
  const diffToLast = lastMinutes - currentMinutes;
  if (diffToLast <= 90) {
    const hours = Math.floor(diffToLast / 60);
    const mins = diffToLast % 60;
    const timeText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    return {
      status: 'last_imminent',
      message: `⚠️ ¡Último tren del día en ${timeText}! (${lastTimeStr})`,
      minutesToLast: diffToLast,
    };
  }

  // Servicio en curso normal
  return {
    status: 'operating',
    message: `En servicio regular hasta las ${lastTimeStr}`,
    minutesToLast: diffToLast,
  };
}
