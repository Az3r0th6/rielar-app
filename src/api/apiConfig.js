import { Capacitor } from '@capacitor/core';

export const PROD_API_ORIGIN = 'https://rielar-app.onrender.com';

/**
 * Returns the full base API url.
 * On native Android/iOS Capacitor apps, it resolves to https://rielar-app.onrender.com/api
 * On web/browser, it resolves to /api
 */
export function getApiBase() {
  if (Capacitor.isNativePlatform()) {
    return `${PROD_API_ORIGIN}/api`;
  }
  return '/api';
}

/**
 * Resolves any relative API or version endpoint properly.
 */
export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (Capacitor.isNativePlatform()) {
    return `${PROD_API_ORIGIN}${cleanPath}`;
  }
  return cleanPath;
}
