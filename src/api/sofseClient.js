// SOFSE API Client for Frontend

const API_BASE = '/api';

export async function getLines() {
  const res = await fetch(`${API_BASE}/lines`);
  if (!res.ok) throw new Error(`Error fetching lines: ${res.status}`);
  return await res.json();
}

export async function getNetworkStatus() {
  const res = await fetch(`${API_BASE}/network-status`);
  if (!res.ok) throw new Error(`Error fetching network status: ${res.status}`);
  return await res.json();
}

export async function getBranches(idGerencia) {
  const res = await fetch(`${API_BASE}/branches?idGerencia=${idGerencia}`);
  if (!res.ok) throw new Error(`Error fetching branches: ${res.status}`);
  return await res.json();
}

export async function getStationsByRamal(idRamal) {
  const res = await fetch(`${API_BASE}/stations?idRamal=${idRamal}`);
  if (!res.ok) throw new Error(`Error fetching stations: ${res.status}`);
  return await res.json();
}

export async function searchStations(query) {
  const res = await fetch(`${API_BASE}/stations?nombre=${encodeURIComponent(query)}`);
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

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Error fetching arrivals for station ${stationId}: ${res.status}`);
  return await res.json();
}

export async function getAllStationsCatalog() {
  const res = await fetch(`${API_BASE}/all-stations`);
  if (!res.ok) throw new Error(`Error fetching all stations: ${res.status}`);
  return await res.json();
}
