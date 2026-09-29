import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- SOFSE Authentication & API Engine ---
const SOFSE_BASE_URL = 'https://api-servicios.sofse.gob.ar/v1';
const FALLBACK_BASE_URL = 'https://ariedro.dev/api-trenes';

const cipherConfig = [
  { in: /a/g, out: ['#t', '#j'] },
  { in: /e/g, out: ['#x', '#p'] },
  { in: /i/g, out: ['#f', '#w'] },
  { in: /o/g, out: ['#l', '#8'] },
  { in: /u/g, out: ['#7', '#0'] },
  { in: /=/g, out: ['#g', '#v'] },
];

class Encoder {
  constructor(str = '') {
    this.str = str;
  }
  base64() {
    this.str = Buffer.from(this.str).toString('base64');
    return this;
  }
  cipher(step) {
    this.str = cipherConfig.reduce((acc, curr) => acc.replace(curr.in, curr.out[step]), this.str);
    return this;
  }
  reverse() {
    this.str = this.str.split('').reverse().join('');
    return this;
  }
  timestamp() {
    const date = new Date().toISOString().split(/-|T|:/);
    this.str = `${date[0]}${date[1]}${date[2]}sofse`;
    return this;
  }
  toString() {
    return this.str;
  }
  url() {
    this.str = encodeURIComponent(this.str);
    return this;
  }
}

let cachedToken = null;
let tokenExpiresAt = 0;

function generateCredentials() {
  const username = new Encoder().timestamp().base64().toString();
  const password = new Encoder(username)
    .base64()
    .cipher(0)
    .reverse()
    .base64()
    .cipher(1)
    .reverse()
    .url()
    .toString();
  return { username, password };
}

async function getValidToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  try {
    const credentials = generateCredentials();
    const authController = new AbortController();
    const authTimeout = setTimeout(() => authController.abort(), 3500);
    const res = await fetch(`${SOFSE_BASE_URL}/auth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      signal: authController.signal,
    });
    clearTimeout(authTimeout);

    if (!res.ok) {
      throw new Error(`Auth failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error('No token returned from SOFSE auth');
    }

    cachedToken = data.token;
    try {
      const payloadBase64 = cachedToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      tokenExpiresAt = (payload.exp || 0) * 1000;
    } catch {
      tokenExpiresAt = now + 12 * 60 * 60 * 1000; // fallback 12h
    }

    console.log('[SOFSE] New token generated successfully');
    return cachedToken;
  } catch (err) {
    console.warn('[SOFSE Auth Warning]', err.message);
    return null;
  }
}

async function fetchFromSofse(path, query = {}) {
  const token = await getValidToken();

  // If token is available, query direct SOFSE API first with strict 3.5s timeout
  if (token) {
    const directController = new AbortController();
    const directTimeout = setTimeout(() => directController.abort(), 3500);
    try {
      const url = new URL(`${SOFSE_BASE_URL}${path}`);
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });

      const response = await fetch(url.toString(), {
        signal: directController.signal,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        },
      });
      clearTimeout(directTimeout);

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[SOFSE] Direct API returned ${response.status} for ${path}, trying fallback mirror...`);
    } catch (directErr) {
      clearTimeout(directTimeout);
      console.warn(`[SOFSE] Direct fetch failed/timeout for ${path}:`, directErr.message);
    }
  }

  // Fallback to fast proxy mirror with 4s timeout
  const fallbackController = new AbortController();
  const fallbackTimeout = setTimeout(() => fallbackController.abort(), 4000);
  try {
    const fallbackUrl = new URL(`${FALLBACK_BASE_URL}${path}`);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        fallbackUrl.searchParams.append(k, String(v));
      }
    });

    const fallbackRes = await fetch(fallbackUrl.toString(), {
      signal: fallbackController.signal,
    });
    clearTimeout(fallbackTimeout);

    if (!fallbackRes.ok) {
      throw new Error(`Fallback returned ${fallbackRes.status}`);
    }
    return await fallbackRes.json();
  } catch (fallbackErr) {
    clearTimeout(fallbackTimeout);
    throw fallbackErr;
  }
}

// In-memory cache for static catalog
let linesCache = null;
let linesCacheTime = 0;
let stationsCache = new Map(); // key: ramalId -> stations

// --- API Routes ---

// 1. Lines / Gerencias
app.get('/api/lines', async (req, res) => {
  try {
    const now = Date.now();
    if (linesCache && now - linesCacheTime < 60000) {
      return res.json(linesCache);
    }
    const data = await fetchFromSofse('/infraestructura/gerencias', { idEmpresa: 1 });
    linesCache = data;
    linesCacheTime = now;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lines', details: err.message });
  }
});

// 1.b Complete Network Status (Lines + All Ramales + Critical Alerts Summary)
let networkStatusCache = null;
let networkStatusCacheTime = 0;

app.get('/api/network-status', async (req, res) => {
  try {
    const now = Date.now();
    if (networkStatusCache && now - networkStatusCacheTime < 25000) {
      return res.json(networkStatusCache);
    }

    const lines = await fetchFromSofse('/infraestructura/gerencias', { idEmpresa: 1 });
    if (!Array.isArray(lines)) {
      return res.status(500).json({ error: 'Could not retrieve lines' });
    }

    // Filter out 501 (Regionales) to only monitor operational AMBA lines
    const ambaLines = lines.filter((l) => l.id !== 501);

    let totalBranches = 0;
    let operationalAlerts = [];

    const enrichedLines = await Promise.all(
      ambaLines.map(async (line) => {
        try {
          const branches = await fetchFromSofse('/infraestructura/ramales', { idGerencia: line.id });
          const safeBranches = Array.isArray(branches) ? branches : [];
          totalBranches += safeBranches.length;

          // Extract and categorize alerts
          safeBranches.forEach((b) => {
            if (b.alerta && Array.isArray(b.alerta)) {
              b.alerta.forEach((al) => {
                const text = (al.contenido || '').trim();
                if (!text) return;
                const lower = text.toLowerCase();
                let type = 'AVISO';
                let severity = 'info';

                if (lower.includes('cancelado') || lower.includes('interrumpido')) {
                  type = 'CANCELACIÓN';
                  severity = 'critical';
                } else if (lower.includes('reducido') || lower.includes('descalce') || lower.includes('limitado')) {
                  type = 'RECORRIDO REDUCIDO';
                  severity = 'warning';
                } else if (lower.includes('demora') || lower.includes('demorado')) {
                  type = 'DEMORA';
                  severity = 'warning';
                } else if (lower.includes('obra')) {
                  type = 'OBRAS EN VÍA';
                  severity = 'warning';
                }

                const alertObj = {
                  id: al.id || `${line.id}_${b.id}_${Math.random()}`,
                  lineId: line.id,
                  lineName: line.nombre,
                  ramalId: b.id,
                  ramalName: b.nombre,
                  type,
                  severity,
                  content: text,
                  since: al.vigencia_desde,
                  until: al.vigencia_hasta,
                  colorBg: al.criticidad_color_fondo,
                  colorText: al.criticidad_color_texto,
                };

                operationalAlerts.push(alertObj);
              });
            }
          });

          return {
            ...line,
            branches: safeBranches,
          };
        } catch (branchErr) {
          console.warn(`Error fetching branches for line ${line.id}:`, branchErr.message);
          return {
            ...line,
            branches: [],
          };
        }
      })
    );

    const payload = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLines: ambaLines.length,
        totalBranches,
        activeAlertsCount: operationalAlerts.length,
        criticalCount: operationalAlerts.length,
        criticalIncidents: operationalAlerts,
      },
      lines: enrichedLines,
      allAlerts: operationalAlerts,
    };

    networkStatusCache = payload;
    networkStatusCacheTime = now;
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to build network status', details: err.message });
  }
});

// 2. Branches / Ramales
app.get('/api/branches', async (req, res) => {
  try {
    const { idGerencia } = req.query;
    if (!idGerencia) {
      return res.status(400).json({ error: 'idGerencia parameter is required' });
    }
    const data = await fetchFromSofse('/infraestructura/ramales', { idGerencia });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch branches', details: err.message });
  }
});

// 3. Stations by Branch or Search
app.get('/api/stations', async (req, res) => {
  try {
    const { idRamal, nombre } = req.query;
    if (idRamal && stationsCache.has(idRamal)) {
      return res.json(stationsCache.get(idRamal));
    }
    const data = await fetchFromSofse('/infraestructura/estaciones', { idRamal, nombre });
    if (idRamal && Array.isArray(data)) {
      stationsCache.set(idRamal, data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stations', details: err.message });
  }
});

// 4. Live Arrivals for Station (High-performance with In-flight Deduplication & Micro-cache)
const arrivalsMemoryCache = new Map(); // cacheKey -> { timestamp, data }
const inFlightArrivals = new Map();   // cacheKey -> Promise

app.get('/api/arrivals/:stationId', async (req, res) => {
  const { stationId } = req.params;
  const { hasta, fecha, hora, cantidad, ramal, sentido, _t } = req.query;
  const cacheKey = `${stationId}_${sentido || ''}_${ramal || ''}`;
  const now = Date.now();

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  // Short TTL: 5s for background queries, 1.5s for forced user refresh
  const isForced = Boolean(_t);
  const maxCacheAge = isForced ? 1500 : 5000;
  const cachedEntry = arrivalsMemoryCache.get(cacheKey);

  if (cachedEntry && (now - cachedEntry.timestamp < maxCacheAge)) {
    return res.json(cachedEntry.data);
  }

  // If another request for this exact station is already fetching upstream, share the Promise
  if (inFlightArrivals.has(cacheKey)) {
    try {
      const sharedData = await inFlightArrivals.get(cacheKey);
      return res.json(sharedData);
    } catch {
      // Fall through if in-flight failed
    }
  }

  const query = { hasta, fecha, hora, cantidad, ramal, sentido, _t: _t || now };
  const fetchPromise = fetchFromSofse(`/arribos/estacion/${stationId}`, query)
    .then((data) => {
      arrivalsMemoryCache.set(cacheKey, { timestamp: Date.now(), data });
      return data;
    })
    .finally(() => {
      inFlightArrivals.delete(cacheKey);
    });

  inFlightArrivals.set(cacheKey, fetchPromise);

  try {
    const data = await fetchPromise;
    res.json(data);
  } catch (err) {
    // If upstream timed out or failed, but we have prior cache for this station, serve it gracefully
    if (cachedEntry) {
      console.warn(`[RielAR] Serving cached arrivals for station ${stationId} due to temporary network lag`);
      return res.json(cachedEntry.data);
    }
    res.status(500).json({ error: 'Failed to fetch arrivals', details: err.message });
  }
});

// 4b. Live Circulating Network Trains (Aggregated from key line hubs with 25s TTL cache)
let networkTrainsCache = null;
let networkTrainsCacheTime = 0;

app.get('/api/network-trains', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    const now = Date.now();
    if (networkTrainsCache && now - networkTrainsCacheTime < 25000) {
      return res.json(networkTrainsCache);
    }

    // Comprehensive transit hubs and terminals spanning Mitre, Sarmiento, Roca, San Martín, Belgrano Sur and TDC
    const hubs = [
      // San Martín (31): Retiro, Palermo, Caseros, Hurlingham, José C. Paz, Pilar
      463, 297, 67, 177, 194, 306,
      // Mitre (5): Retiro, Tigre, Victoria, San Isidro, J.L. Suárez, Villa Ballester, Bmé. Mitre, Belgrano R
      332, 389, 409, 357, 190, 412, 273, 35,
      // Sarmiento (1): Once, Liniers, Morón, Castelar, Merlo, Moreno, Luján, Mercedes
      293, 234, 279, 70, 269, 278, 247, 268,
      // Roca (11): Constitución, Santillán y Kosteki, Temperley, Quilmes, Berazategui, La Plata, Ezeiza, Alejandro Korn, Bosques
      93, 368, 386, 322, 38, 217, 132, 13, 43,
      // Belgrano Sur (21): Dr. Sáenz, Tapiales, González Catán, Marinos C. G Belgrano
      525, 385, 154, 259,
      // Tren de la Costa (41): Maipú, Delta
      248, 104,
    ];
    const trainMap = new Map();

    await Promise.all(
      hubs.map(async (stId) => {
        try {
          const data = await fetchFromSofse(`/arribos/estacion/${stId}`, { _t: now });
          const list = Array.isArray(data) ? data : data?.results || [];
          for (const item of list) {
            const num = item.servicio?.numero;
            const lineId = item.servicio?.gerencia?.id || item.servicio?.lineId;
            if (lineId === 501) continue; // Exclude Line 501 Regionales
            if (item.servicio?.cancelacion) continue; // Skip cancelled services
            if (num) {
              const strNum = String(num);
              const existing = trainMap.get(strNum);
              // Retain or update to the instance that contains richer station progress data
              if (!existing || (item.servicio?.estaciones?.length || 0) > (existing.servicio?.estaciones?.length || 0)) {
                trainMap.set(strNum, item);
              }
            }
          }
        } catch (e) {
          // Individual hub failure fallback
        }
      })
    );

    const trains = Array.from(trainMap.values());
    networkTrainsCache = trains;
    networkTrainsCacheTime = now;
    res.json(trains);
  } catch (err) {
    if (networkTrainsCache) {
      return res.json(networkTrainsCache);
    }
    res.status(500).json({ error: 'Failed to aggregate network trains', details: err.message });
  }
});

// 5. Preloaded AMBA Stations Directory (All Lines)
let allStationsCatalog = null;
app.get('/api/all-stations', async (req, res) => {
  try {
    if (allStationsCatalog) {
      return res.json(allStationsCatalog);
    }
    // Fetch key branches to assemble master stations catalog
    const ramalesIds = [5, 7, 9, 31, 1, 11, 141, 151]; // Key Mitre, San Martin, Sarmiento, Roca
    const stationMap = new Map();

    for (const ramalId of ramalesIds) {
      try {
        const stations = await fetchFromSofse('/infraestructura/estaciones', { idRamal: ramalId });
        if (Array.isArray(stations)) {
          stations.forEach(st => {
            if (!stationMap.has(st.id_estacion)) {
              stationMap.set(st.id_estacion, st);
            }
          });
        }
      } catch (e) {
        console.warn(`Could not preload ramal ${ramalId}:`, e.message);
      }
    }

    allStationsCatalog = Array.from(stationMap.values());
    res.json(allStationsCatalog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assemble stations catalog', details: err.message });
  }
});

// 6. User Bug & Incident Reports Engine
const inMemoryReports = [];

app.post('/api/reports', (req, res) => {
  try {
    const { category, lineName, stationName, description, deviceDetails } = req.body || {};
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'La descripción del reporte es obligatoria.' });
    }
    const reportId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      category: category || 'General',
      lineName: lineName || 'No especificada',
      stationName: stationName || 'No especificada',
      description: description.trim(),
      deviceDetails: deviceDetails || {},
      status: 'Recibido',
    };
    inMemoryReports.unshift(newReport);
    if (inMemoryReports.length > 200) inMemoryReports.pop();
    console.log(`[RielAR Reportes] Nuevo reporte recibido #${reportId}: ${newReport.category} - ${newReport.lineName}`);
    res.json({ success: true, report: newReport });
  } catch (err) {
    res.status(500).json({ error: 'Error procesando el reporte', details: err.message });
  }
});

app.get('/api/reports', (req, res) => {
  res.json({ count: inMemoryReports.length, reports: inMemoryReports.slice(0, 50) });
});

// Health check & keep-alive target
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RielAR Backend Engine',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    hasToken: !!cachedToken,
  });
});

// Serve frontend build static files with optimized cache headers:
// - index.html, sw.js, manifest.json must NEVER be cached so updates apply immediately!
// - Hashed assets (/assets/*) are cached safely with content hashes
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.endsWith('/index.html') || normalized.endsWith('/sw.js') || normalized.endsWith('/manifest.json')) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    } else if (normalized.includes('/assets/')) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// SPA fallback for all web routes (guarantees fresh index.html on every navigation)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[RielAR Production Server] Running on port ${PORT}`);

  // Render Free-Tier Keep-Alive Engine
  // Free tier instances sleep after 15 min of zero requests.
  // Pinging /api/health every 10 minutes prevents cold starts 24/7.
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || 'https://rielar-app.onrender.com';
  if (keepAliveUrl) {
    console.log(`[RielAR Keep-Alive] Active for host: ${keepAliveUrl}`);
    setInterval(async () => {
      try {
        const pingTarget = `${keepAliveUrl.replace(/\/$/, '')}/api/health`;
        const r = await fetch(pingTarget);
        console.log(`[RielAR Keep-Alive] Heartbeat pinged ${pingTarget} -> ${r.status}`);
      } catch (err) {
        console.warn(`[RielAR Keep-Alive] Ping error:`, err.message);
      }
    }, 10 * 60 * 1000);
  }
});
