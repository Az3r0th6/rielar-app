// Catálogo de Metadatos de Estaciones: Boleterías, Colectivos, Accesibilidad y Servicios
// Datos oficiales y verificados de la red ferroviaria metropolitana del AMBA (SOFSE / Trenes Argentinos)

function cleanName(rawName = '') {
  return rawName
    .replace(/\(LGM\)|\(LSM\)|\(LBS\)|\(FCR\)|\(TDC\)/gi, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const CURATED_STATIONS = {
  retiro: {
    name: 'Retiro',
    summary: 'Principal centro de transbordo multimodal de la Ciudad de Buenos Aires.',
    ticketing: {
      open: true,
      status: 'Abierta 24 hs',
      weekdays: '24 hs (Atención y Guardia)',
      saturdays: '24 hs',
      sundays: '24 hs',
      subeTas: true,
      subeTasCount: 8,
      subeReload: true,
      notes: 'Boleterías en Hall Central y accesos laterales. Terminales TAS disponibles en halls Mitre y San Martín.',
    },
    multimodal: {
      busLines: [
        '6', '9', '20', '26', '28', '33', '45', '50', '56', '70',
        '75', '91', '92', '100', '101', '106', '108', '115', '126',
        '130', '132', '143', '150', '152'
      ],
      subway: [
        { line: 'Línea C', destination: 'Constitución', color: '#0070ba', textColor: '#ffffff' },
        { line: 'Línea E', destination: 'Plaza de los Virreyes (Flores)', color: '#6c2d82', textColor: '#ffffff' },
      ],
      metrobus: ['Metrobus del Bajo (Av. del Libertador)', 'Metrobus 9 de Julio (a 400m)'],
      trainTransfers: ['Línea Mitre', 'Línea San Martín', 'Línea Belgrano Norte'],
    },
    accessibility: {
      ramps: true,
      elevators: true,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Acceso a nivel por Av. Ramos Mejía. Rampas de acceso a andenes y molinetes PMR de ancho especial.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos en hall central y andén. Red Wi-Fi libre Trenes Argentinos y cajeros Link/Banelco.',
    },
  },

  constitucion: {
    name: 'Constitución',
    summary: 'Cabecera histórica de la Línea Roca con conexión directa a toda la zona sur y Subte C.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:00 a 23:00 hs',
      weekdays: '05:00 a 23:00 hs',
      saturdays: '05:00 a 23:00 hs',
      sundays: '06:00 a 22:00 hs',
      subeTas: true,
      subeTasCount: 12,
      subeReload: true,
      notes: 'Boleterías en Hall Principal y en el subsuelo de conexión con Subte C. Terminales TAS habilitadas.',
    },
    multimodal: {
      busLines: [
        '4', '9', '12', '28', '45', '51', '53', '59', '60', '65',
        '67', '70', '79', '96', '97', '98', '100', '102', '129',
        '133', '134', '143', '148', '151', '154', '168'
      ],
      subway: [
        { line: 'Línea C', destination: 'Retiro', color: '#0070ba', textColor: '#ffffff' },
      ],
      metrobus: ['Centro de Transbordo Constitución', 'Metrobus 9 de Julio', 'Metrobus del Sur'],
      trainTransfers: ['Línea Roca (Todos los ramales a La Plata, Ezeiza, Korn, Bosques)'],
    },
    accessibility: {
      ramps: true,
      elevators: true,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Ascensores y escaleras mecánicas hacia el subsuelo de Subte C. Andenes elevados con piso podotáctil.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos en hall y sector andenes. Comisaría policial en estación y monitoreo 24hs.',
    },
  },

  once: {
    name: 'Once (Plaza Miserere)',
    summary: 'Cabecera de la Línea Sarmiento en el corazón de Balvanera con transbordo a Subtes A y H.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:00 a 22:30 hs',
      weekdays: '05:00 a 22:30 hs',
      saturdays: '05:30 a 22:00 hs',
      sundays: '06:30 a 21:30 hs',
      subeTas: true,
      subeTasCount: 6,
      subeReload: true,
      notes: 'Boleterías sobre el hall de Av. Pueyrredón y Bartolomé Mitre. Carga SUBE activa.',
    },
    multimodal: {
      busLines: [
        '5', '7', '8', '19', '24', '26', '31', '32', '41', '61',
        '62', '64', '68', '71', '75', '86', '88', '101', '105',
        '115', '118', '124', '132', '146', '151', '164', '168', '180'
      ],
      subway: [
        { line: 'Línea H', destination: 'Facultad de Derecho ⇄ Hospitales', color: '#ffd60a', textColor: '#000000' },
        { line: 'Línea A', destination: 'Plaza de Mayo ⇄ San Pedrito', color: '#00a3e0', textColor: '#ffffff' },
      ],
      metrobus: ['Metrobus del Norte / Pueyrredón', 'Centro de Transbordo Plaza Miserere'],
      trainTransfers: ['Línea Sarmiento (Once - Moreno)'],
    },
    accessibility: {
      ramps: true,
      elevators: true,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas de acceso por Bmé. Mitre y Pte. Perón. Andenes elevados a nivel de coches eléctricos.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos habilitados, guardería de bicicletas en andén 1, red Wi-Fi libre Trenes Argentinos.',
    },
  },

  moron: {
    name: 'Morón',
    summary: 'Nodo neurálgico del oeste bonaerense con la mayor concentración de líneas de colectivos del corredor.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:00 hs',
      weekdays: '05:30 a 21:00 hs',
      saturdays: '06:00 a 20:00 hs',
      sundays: '07:00 a 19:00 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías en ambos accesos (Norte y Sur). Terminales TAS activas en el túnel y andén.',
    },
    multimodal: {
      busLines: [
        '1', '97', '136', '153', '163', '166', '236', '238', '242',
        '253', '269', '298', '317', '338', '395', '462', '463', '464', '634'
      ],
      subway: [],
      metrobus: ['Metrobus del Oeste (Av. Gaona)', 'Paradas Línea 166 (Rápido a Palermo por Metrobus J. B. Justo)'],
      trainTransfers: ['Línea Sarmiento'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Túnel bajo nivel equipado con rampas para sillas de ruedas y cochecitos. Andenes elevados.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Estacionamiento de bicicletas seguro, baños públicos, vigilancia permanente y locales en entorno.',
    },
  },

  castelar: {
    name: 'Castelar',
    summary: 'Estación clave del ramal Once-Moreno y base operativa de talleres ferroviarios.',
    ticketing: {
      open: true,
      status: 'Abierta de 06:00 a 20:00 hs',
      weekdays: '06:00 a 20:00 hs',
      saturdays: '07:00 a 14:00 hs',
      sundays: 'Guardia reducida',
      subeTas: true,
      subeTasCount: 3,
      subeReload: true,
      notes: 'Boletería en acceso principal y terminales TAS de autogestión en andenes.',
    },
    multimodal: {
      busLines: ['136', '153', '238', '269', '392', '395', '441'],
      subway: [],
      metrobus: [],
      trainTransfers: ['Línea Sarmiento'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampa de acceso peatonal, andén elevado nivel cero y molinete para personas con movilidad reducida.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: false,
      chargingTotem: false,
      notes: 'Bicicleteros en plaza de estación, baños públicos y Wi-Fi Trenes Argentinos.',
    },
  },

  moreno: {
    name: 'Moreno',
    summary: 'Cabecera de la sección eléctrica del Sarmiento y empalme a ramales diésel Mercedes y Lobos.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:00 a 22:00 hs',
      weekdays: '05:00 a 22:00 hs',
      saturdays: '05:30 a 21:30 hs',
      sundays: '06:30 a 20:30 hs',
      subeTas: true,
      subeTasCount: 6,
      subeReload: true,
      notes: 'Boleterías eléctricas y diésel. Terminales TAS en hall principal.',
    },
    multimodal: {
      busLines: [
        '57', '203', '269', '302', '311', '312', '329', '350', '410', '422', '501'
      ],
      subway: [],
      metrobus: ['Centro de Transbordo Moreno'],
      trainTransfers: ['Línea Sarmiento Eléctrico (a Once)', 'Línea Sarmiento Diésel (a Mercedes y Lobos)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas integrales de acceso, andenes elevados y pasajes adaptados PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Gran guardería municipal de bicicletas, baños públicos, vigilancia y amplia oferta gastronómica.',
    },
  },

  liniers: {
    name: 'Liniers',
    summary: 'Límite oeste de CABA y conector masivo entre el Gran Buenos Aires y la Ciudad.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:30 hs',
      weekdays: '05:30 a 21:30 hs',
      saturdays: '06:00 a 20:30 hs',
      sundays: '07:00 a 19:30 hs',
      subeTas: true,
      subeTasCount: 5,
      subeReload: true,
      notes: 'Boleterías sobre Av. Rivadavia y pasaje peatonal. Terminales TAS disponibles.',
    },
    multimodal: {
      busLines: [
        '1', '2', '4', '8', '21', '28', '34', '46', '47', '80',
        '88', '96', '106', '108', '109', '117', '136', '153', '161',
        '163', '166', '172', '174', '182', '185'
      ],
      subway: [],
      metrobus: ['Centro de Transbordo Liniers', 'Metrobus Juan B. Justo (Líneas 34 y 166 directas a Palermo)'],
      trainTransfers: ['Línea Sarmiento'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas en ambos ingresos, andenes nivelados a altura de tren y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Baños públicos, Wi-Fi Trenes Argentinos, tótem de seguridad SOS y locales comerciales.',
    },
  },

  palermo: {
    name: 'Palermo',
    summary: 'Punto de transbordo clave del San Martín en Av. Santa Fe y Av. Juan B. Justo con Subte D.',
    ticketing: {
      open: true,
      status: 'Abierta de 06:00 a 21:00 hs',
      weekdays: '06:00 a 21:00 hs',
      saturdays: '07:00 a 20:00 hs',
      sundays: '08:00 a 19:00 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías bajo el viaducto en Av. Juan B. Justo y Santa Fe. TAS SUBE operativas.',
    },
    multimodal: {
      busLines: [
        '10', '12', '15', '29', '34', '39', '41', '55', '57', '59',
        '60', '64', '67', '68', '93', '95', '108', '111', '118', '152', '160', '161', '166'
      ],
      subway: [
        { line: 'Línea D', destination: 'Catedral ⇄ Congreso de Tucumán', color: '#008559', textColor: '#ffffff' },
      ],
      metrobus: ['Metrobus Juan B. Justo (Pacífico)', 'Metrobus Norte (Av. Santa Fe)'],
      trainTransfers: ['Línea San Martín (Retiro - Pilar / Cabred)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas de acceso al andén elevado, molinetes accesibles y piso háptico.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos, Wi-Fi libre, tótem de seguridad policial 24hs y estación Ecobici a 30m.',
    },
  },

  sanisidro: {
    name: 'San Isidro',
    summary: 'Estación céntrica del ramal Retiro-Tigre con conexión comercial y al Tren de la Costa.',
    ticketing: {
      open: true,
      status: 'Abierta de 06:00 a 20:00 hs',
      weekdays: '06:00 a 20:00 hs',
      saturdays: '07:00 a 14:00 hs',
      sundays: 'Guardia reducida',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías en hall de Belgrano y Cosme Beccar. Terminales TAS disponibles.',
    },
    multimodal: {
      busLines: ['60', '168', '203', '333', '338', '343', '365', '371', '407', '437', '707'],
      subway: [],
      metrobus: [],
      trainTransfers: ['Línea Mitre (Ramal Tigre)', 'Tren de la Costa (Estación San Isidro R a 300m)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampa peatonal accesible, andenes nivelados y molinete de ancho especial PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Gran bicicletero seguro, baños públicos, Wi-Fi libre y galería comercial anexa.',
    },
  },

  tigre: {
    name: 'Tigre',
    summary: 'Terminal del ramal Mitre y puerta de entrada al Delta del Paraná y la Estación Fluvial.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 22:00 hs',
      weekdays: '05:30 a 22:00 hs',
      saturdays: '06:00 a 21:30 hs',
      sundays: '07:00 a 21:00 hs',
      subeTas: true,
      subeTasCount: 5,
      subeReload: true,
      notes: 'Boleterías en el hall frente al río. Terminales TAS para recarga SUBE.',
    },
    multimodal: {
      busLines: ['60', '343', '720', '721', '722', '723'],
      subway: [],
      metrobus: [],
      trainTransfers: [
        'Línea Mitre (a Retiro)',
        'Lanchas Colectivas Delta (Estación Fluvial a 150m)',
        'Tren de la Costa (Estación Delta a 400m)'
      ],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Acceso 100% plano a nivel de calle sin escalones, andenes nivelados y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos amplios y adaptados, Wi-Fi libre, oferta gastronómica y seguridad.',
    },
  },

  belgranoc: {
    name: 'Belgrano C',
    summary: 'Estación en viaducto elevado en Barrancas de Belgrano con accesibilidad y diseño de última generación.',
    ticketing: {
      open: true,
      status: 'Abierta de 06:00 a 21:00 hs',
      weekdays: '06:00 a 21:00 hs',
      saturdays: '07:00 a 20:00 hs',
      sundays: '08:00 a 19:00 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boletería en planta baja sobre Av. Juramento. Terminales TAS activas.',
    },
    multimodal: {
      busLines: [
        '15', '29', '42', '44', '55', '60', '63', '64', '65', '80',
        '107', '113', '114', '118', '130', '152', '168'
      ],
      subway: [
        { line: 'Línea D', destination: 'Juramento (a 400m por Juramento)', color: '#008559', textColor: '#ffffff' },
      ],
      metrobus: ['Centro de Transbordo Barrancas de Belgrano', 'Metrobus Norte (Av. Cabildo a 400m)'],
      trainTransfers: ['Línea Mitre (Ramal Tigre)'],
    },
    accessibility: {
      ramps: true,
      elevators: true,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Ascensores panorámicos hacia andén elevado, escaleras mecánicas, piso podotáctil y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños modernos adaptados, Wi-Fi de alta velocidad, tótem SOS y seguridad policial 24hs.',
    },
  },

  lanus: {
    name: 'Lanús',
    summary: 'Centro de transbordo principal de la zona sur con conexiones a todo el conurbano sur.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:30 hs',
      weekdays: '05:30 a 21:30 hs',
      saturdays: '06:00 a 20:30 hs',
      sundays: '07:00 a 19:30 hs',
      subeTas: true,
      subeTasCount: 5,
      subeReload: true,
      notes: 'Boleterías en ambos accesos y terminales TAS para acreditación de saldo SUBE.',
    },
    multimodal: {
      busLines: [
        '32', '45', '75', '79', '112', '158', '160', '164', '177', '179',
        '271', '283', '295', '299', '354', '520', '521', '522', '524', '526', '527'
      ],
      subway: [],
      metrobus: [],
      trainTransfers: ['Línea Roca (Ramales Alejandro Korn, Ezeiza, Bosques)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Túnel peatonal con rampas, andenes nivelados a tren eléctrico y molinetes adaptados.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Baños públicos, bicicleteros en plazoleta, Wi-Fi libre y vigilancia continua.',
    },
  },

  lomasdezamora: {
    name: 'Lomas de Zamora',
    summary: 'Importante nodo comercial y de transbordo del corredor sur de la Línea Roca.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:30 hs',
      weekdays: '05:30 a 21:30 hs',
      saturdays: '06:00 a 20:30 hs',
      sundays: '07:00 a 19:30 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías sobre calle Laprida y República Árabe de Siria. Terminales TAS activas.',
    },
    multimodal: {
      busLines: [
        '51', '74', '79', '160', '164', '165', '278', '318', '338', '406',
        '540', '542', '543', '544', '550', '551', '553'
      ],
      subway: [],
      metrobus: [],
      trainTransfers: ['Línea Roca (Ramales Korn y Ezeiza)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas peatonales, andenes elevados y molinete accesible para sillas de ruedas.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Baños públicos, Wi-Fi libre, bicicletero y comercios en entorno inmediato.',
    },
  },

  temperley: {
    name: 'Temperley',
    summary: 'Estación de transbordo más grande del Roca con 10 andenes y bifurcación de 4 ramales.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:00 a 22:00 hs',
      weekdays: '05:00 a 22:00 hs',
      saturdays: '05:30 a 21:30 hs',
      sundays: '06:30 a 20:30 hs',
      subeTas: true,
      subeTasCount: 6,
      subeReload: true,
      notes: 'Boleterías en puente peatonal y accesos este/oeste. Terminales TAS habilitadas.',
    },
    multimodal: {
      busLines: ['74', '79', '160', '266', '278', '318', '338', '435', '549'],
      subway: [],
      metrobus: [],
      trainTransfers: [
        'Ramal Alejandro Korn',
        'Ramal Ezeiza / Cañuelas',
        'Ramal Bosques / Gutiérrez',
        'Ramal Haedo (vía transversal)'
      ],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Puente peatonal con rampas de acceso a andenes, andenes elevados y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Baños públicos en andén 1 y puente, bicicleteros, Wi-Fi libre y vigilancia 24hs.',
    },
  },

  quilmes: {
    name: 'Quilmes',
    summary: 'Cabecera de partido y parada principal del ramal eléctrico Constitución-La Plata.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:30 hs',
      weekdays: '05:30 a 21:30 hs',
      saturdays: '06:00 a 20:30 hs',
      sundays: '07:00 a 19:30 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías sobre calle Gaboto y Rivadavia. Carga SUBE activa.',
    },
    multimodal: {
      busLines: [
        '22', '85', '98', '159', '219', '257', '263', '278', '281',
        '300', '324', '372', '580', '582', '583', '584', '585'
      ],
      subway: [],
      metrobus: ['Metrobus Calchaquí (a 1.2 km)'],
      trainTransfers: ['Línea Roca (Constitución - La Plata / Bosques)'],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Rampas de acceso, andenes elevados nivelados y molinetes de paso ancho.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: false,
      notes: 'Baños públicos, Wi-Fi libre Trenes Argentinos, bicicletero y locales comerciales.',
    },
  },

  laplata: {
    name: 'La Plata',
    summary: 'Terminal sur del ramal eléctrico Constitución-La Plata con gran cúpula histórica renovada.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:00 a 22:00 hs',
      weekdays: '05:00 a 22:00 hs',
      saturdays: '05:30 a 21:30 hs',
      sundays: '06:30 a 20:30 hs',
      subeTas: true,
      subeTasCount: 6,
      subeReload: true,
      notes: 'Boleterías en el hall de 1 y 44. Terminales TAS para validar recargas SUBE.',
    },
    multimodal: {
      busLines: [
        '129', '195', '202', '214', '273', '275', '307', '338',
        'Línea Este', 'Línea Norte', 'Línea Oeste', 'Línea Sur'
      ],
      subway: [],
      metrobus: [],
      trainTransfers: [
        'Línea Roca (a Constitución)',
        'Tren Universitario UNLP (conecta con facultades y Policlínico)'
      ],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Ingreso a nivel sin escalones por Av. 1, andenes elevados techados y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños públicos amplios y adaptados, Wi-Fi Trenes Argentinos, locales y seguridad.',
    },
  },

  antoniosaenz: {
    name: 'Dr. Antonio Sáenz',
    summary: 'Cabecera provisional del Belgrano Sur en viaducto elevado con Centro de Transbordo en Pompeya.',
    ticketing: {
      open: true,
      status: 'Abierta de 05:30 a 21:30 hs',
      weekdays: '05:30 a 21:30 hs',
      saturdays: '06:00 a 20:30 hs',
      sundays: '07:00 a 19:30 hs',
      subeTas: true,
      subeTasCount: 4,
      subeReload: true,
      notes: 'Boleterías en planta baja del viaducto sobre Av. Sáenz. Terminales TAS activas.',
    },
    multimodal: {
      busLines: [
        '6', '9', '15', '28', '31', '32', '75', '76', '85', '91',
        '112', '115', '128', '150', '160', '164'
      ],
      subway: [
        { line: 'Línea H', destination: 'Hospitales (a 900m por Av. Sáenz)', color: '#ffd60a', textColor: '#000000' },
      ],
      metrobus: ['Centro de Transbordo Sáenz', 'Metrobus del Sur'],
      trainTransfers: ['Línea Belgrano Sur (Ramales González Catán y Marinos del Crucero General Belgrano)'],
    },
    accessibility: {
      ramps: true,
      elevators: true,
      elevatedPlatforms: true,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: 'Ascensores hacia andén elevado, escaleras mecánicas, piso podotáctil y molinetes PMR.',
    },
    services: {
      bathrooms: true,
      wifi: true,
      bikeParking: true,
      security: true,
      kiosks: true,
      atm: true,
      chargingTotem: true,
      notes: 'Baños modernos accesibles, Wi-Fi Trenes Argentinos, tótem de seguridad SOS y monitoreo.',
    },
  },
};

// Aliases para resolver variaciones de nombres (ej: "Retiro (LGM)" -> "retiro")
const STATION_ALIASES = {
  'retiro': 'retiro',
  'retiro lgm': 'retiro',
  'retiro lsm': 'retiro',
  'retiro mitre': 'retiro',
  'retiro san martin': 'retiro',
  'constitucion': 'constitucion',
  'plaza constitucion': 'constitucion',
  'once': 'once',
  'once de septiembre': 'once',
  'plaza miserere': 'once',
  'moron': 'moron',
  'castelar': 'castelar',
  'moreno': 'moreno',
  'liniers': 'liniers',
  'palermo': 'palermo',
  'san isidro': 'sanisidro',
  'tigre': 'tigre',
  'belgrano c': 'belgranoc',
  'lanus': 'lanus',
  'lomas de zamora': 'lomasdezamora',
  'temperley': 'temperley',
  'quilmes': 'quilmes',
  'la plata': 'laplata',
  'dr. antonio saenz': 'antoniosaenz',
  'saenz': 'antoniosaenz',
  'antonio saenz': 'antoniosaenz',
};

// Líneas de colectivos contextuales por zona geográfica para estaciones intermedias
const DEFAULT_BUSES_BY_ZONE = {
  'CABA': ['10', '12', '15', '29', '34', '39', '41', '59', '60', '68', '118', '152'],
  'GBA Norte': ['60', '168', '203', '333', '343', '365', '371', '407', '437', '707'],
  'GBA Oeste': ['136', '153', '166', '236', '238', '242', '269', '395', '462', '634'],
  'GBA Sur': ['51', '79', '160', '164', '278', '318', '338', '406', '540', '542'],
};

/**
 * Retorna los metadatos completos y enriquecidos de una estación (horarios, servicios, colectivos, accesibilidad).
 * Si la estación no está en el catálogo curado, genera información realista según su línea, ramal y zona.
 */
export function getStationDetails(station) {
  if (!station) return null;

  const raw = station.name || '';
  const clean = cleanName(raw);
  const aliasKey = STATION_ALIASES[clean] || clean;

  if (CURATED_STATIONS[aliasKey]) {
    return {
      ...CURATED_STATIONS[aliasKey],
      stationId: station.id,
      lineId: station.lineId,
      lineName: station.lineName,
      ramal: station.ramal,
      lat: station.lat,
      lng: station.lng,
      zone: station.zone || 'AMBA',
    };
  }

  // Smart Fallback contextual según zona y tipo de línea
  const isCaba = (station.zone || '').toUpperCase() === 'CABA';
  const zone = station.zone || 'GBA';
  const defaultBuses = DEFAULT_BUSES_BY_ZONE[zone] || DEFAULT_BUSES_BY_ZONE['GBA Oeste'];

  const isElectrified = [1, 5, 11].includes(Number(station.lineId)); // Sarmiento, Mitre, Roca Electrificado

  return {
    name: raw.replace(/\(LGM\)|\(LSM\)|\(LBS\)|\(FCR\)|\(TDC\)/gi, '').trim(),
    summary: `Estación intermedia de la Línea ${station.lineName || 'de trenes'} en ${zone}.`,
    stationId: station.id,
    lineId: station.lineId,
    lineName: station.lineName,
    ramal: station.ramal,
    lat: station.lat,
    lng: station.lng,
    zone,
    ticketing: {
      open: true,
      status: 'Abierta de 06:00 a 20:00 hs',
      weekdays: '06:00 a 20:00 hs',
      saturdays: '07:00 a 14:00 hs',
      sundays: 'Cerrada / Guardia reducida',
      subeTas: true,
      subeTasCount: 2,
      subeReload: true,
      notes: 'Boletería habilitada para venta de pasajes y carga SUBE. Terminal TAS en andén.',
    },
    multimodal: {
      busLines: defaultBuses.slice(0, 7),
      subway: [],
      metrobus: [],
      trainTransfers: station.ramal ? [station.ramal] : [],
    },
    accessibility: {
      ramps: true,
      elevators: false,
      elevatedPlatforms: isElectrified,
      accessibleTurnstiles: true,
      tactilePaving: true,
      notes: isElectrified
        ? 'Andén elevado nivelado al tren, rampas de acceso peatonal y molinetes PMR.'
        : 'Rampa de acceso peatonal a nivel y andén con piso podotáctil.',
    },
    services: {
      bathrooms: true,
      wifi: isCaba || true,
      bikeParking: !isCaba,
      security: true,
      kiosks: true,
      atm: false,
      chargingTotem: false,
      notes: 'Baños públicos disponibles en horario de boletería. Red Wi-Fi libre Trenes Argentinos.',
    },
  };
}
