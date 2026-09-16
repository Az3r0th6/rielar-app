// SOFSE API Client for Frontend with Cold-Start Resilience

const API_BASE = '/api';

/**
 * Resilient fetcher that handles Render cold starts, 502/503 statuses,
 * and temporary network hiccups gracefully.
 */
async function fetchWithRetry(url, options = {}, retries = 2, delay = 1200) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    // If server is returning gateway errors (Render waking up), retry automatically
    if ((res.status === 502 || res.status === 503 || res.status === 504) && retries > 0) {
      console.warn(`[RielAR API] Servidor despertando (${res.status}), reintentando en ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    return res;
  } catch (err) {
    if (retries > 0 && err.name !== 'AbortError') {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

export async function getLines() {
  const res = await fetchWithRetry(`${API_BASE}/lines`);
  if (!res.ok) throw new Error(`Error fetching lines: ${res.status}`);
  return await res.json();
}

export async function getNetworkStatus() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/network-status`);
    if (!res.ok) throw new Error(`Error fetching network status: ${res.status}`);
    const data = await res.json();
    try {
      sessionStorage.setItem('cached_network_status', JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    try {
      const saved = sessionStorage.getItem('cached_network_status');
      if (saved) return JSON.parse(saved);
    } catch {}
    throw err;
  }
}

export async function getBranches(idGerencia) {
  const res = await fetchWithRetry(`${API_BASE}/branches?idGerencia=${idGerencia}`);
  if (!res.ok) throw new Error(`Error fetching branches: ${res.status}`);
  return await res.json();
}

export async function getStationsByRamal(idRamal) {
  const res = await fetchWithRetry(`${API_BASE}/stations?idRamal=${idRamal}`);
  if (!res.ok) throw new Error(`Error fetching stations: ${res.status}`);
  return await res.json();
}

export async function searchStations(query) {
  const res = await fetchWithRetry(`${API_BASE}/stations?nombre=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Error searching stations: ${res.status}`);
  return await res.json();
}

export async function getStationArrivals(stationId, params = {}) {
  const url = new URL(`${API_BASE}/arrivals/${stationId}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, String(v));
    }
  });

  try {
    const res = await fetchWithRetry(url.toString(), {}, 2, 1000);
    if (!res.ok) throw new Error(`Error fetching arrivals for station ${stationId}: ${res.status}`);
    const data = await res.json();
    try {
      sessionStorage.setItem(`arr_${stationId}`, JSON.stringify(data));
    } catch {}
    return data;
  } catch (err) {
    try {
      const saved = sessionStorage.getItem(`arr_${stationId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    throw err;
  }
}

export async function getAllStationsCatalog() {
  const res = await fetchWithRetry(`${API_BASE}/all-stations`);
  if (!res.ok) throw new Error(`Error fetching all stations: ${res.status}`);
  return await res.json();
}

export async function sendBugReport(reportData) {
  const res = await fetchWithRetry(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!res.ok) throw new Error(`Error al enviar el reporte: ${res.status}`);
  return await res.json();
}
