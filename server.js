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
    const res = await fetch(`${SOFSE_BASE_URL}/auth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

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

  // If token is available, query direct SOFSE API first
  if (token) {
    try {
      const url = new URL(`${SOFSE_BASE_URL}${path}`);
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          url.searchParams.append(k, String(v));
        }
      });

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      console.warn(`[SOFSE] Direct API returned ${response.status} for ${path}, trying fallback...`);
    } catch (directErr) {
      console.warn(`[SOFSE] Direct fetch failed for ${path}:`, directErr.message);
    }
  }

  // Fallback to proxy mirror
  const fallbackUrl = new URL(`${FALLBACK_BASE_URL}${path}`);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      fallbackUrl.searchParams.append(k, String(v));
    }
  });

  const fallbackRes = await fetch(fallbackUrl.toString());
  if (!fallbackRes.ok) {
    throw new Error(`Fallback returned ${fallbackRes.status}`);
  }
  return await fallbackRes.json();
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

    let totalBranches = 0;
    let operationalAlerts = [];
    let criticalIncidents = [];

    const enrichedLines = await Promise.all(
      lines.map(async (line) => {
        try {
          const branches = await fetchFromSofse('/infraestructura/ramales', { idGerencia: line.id });
          const safeBranches = Array.isArray(branches) ? branches : [];
          totalBranches += safeBranches.length;

          // Extract and categorize alerts
          safeBranches.forEach((b) => {
            if (b.alerta && Array.isArray(b.alerta)) {
              b.alerta.forEach((al) => {
                const text = al.contenido || '';
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
                  severity = 'info';
                }

                const alertObj = {
                  id: al.id,
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
                if (severity === 'critical' || severity === 'warning') {
                  criticalIncidents.push(alertObj);
                }
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
        totalLines: lines.length,
        totalBranches,
        activeAlertsCount: operationalAlerts.length,
        criticalCount: criticalIncidents.length,
        criticalIncidents,
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

// 4. Live Arrivals for Station (Strictly Real-time, No Cache)
app.get('/api/arrivals/:stationId', async (req, res) => {
  try {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    const { stationId } = req.params;
    const { hasta, fecha, hora, cantidad, ramal, sentido, _t } = req.query;
    const query = { hasta, fecha, hora, cantidad, ramal, sentido, _t: _t || Date.now() };
    const data = await fetchFromSofse(`/arribos/estacion/${stationId}`, query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch arrivals', details: err.message });
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
  // Pinging /api/health every 12 minutes prevents cold starts 24/7.
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
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
    }, 12 * 60 * 1000);
  }
});
