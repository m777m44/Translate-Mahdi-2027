/**
 * Resolves the backend API origin.
 *
 * - In a normal browser the app and the Express API share the same origin, so
 *   the base is '' (relative URLs).
 * - Inside the Capacitor/Android WebView there is no same-origin backend, so
 *   requests are pointed at the deployed website. The URL is read (in order)
 *   from `localStorage['mahdi_api_base']`, then `window.__MAHDI_API_BASE__`,
 *   then the compile-time DEFAULT_REMOTE_API below.
 *
 * To ship an APK that uses your live backend, either set DEFAULT_REMOTE_API to
 * your deployed site (e.g. 'https://mahdi-translate.example.com') before
 * building, or set it at runtime from the browser console / a settings screen:
 *   localStorage.setItem('mahdi_api_base', 'https://your-site.com')
 */

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function') return Boolean(cap.isNativePlatform());
  } catch {}
  return Boolean(cap.platform && cap.platform !== 'web');
}

/** Fallback backend URL baked into the APK at build time. */
export const DEFAULT_REMOTE_API: string = ((globalThis as any).__MAHDI_API_BASE__ as string) || '';

export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  // Browser → same origin.
  if (!isCapacitorNative()) return '';
  try {
    const stored = window.localStorage.getItem('mahdi_api_base');
    if (stored && stored.trim()) return stored.trim().replace(/\/+$/, '');
  } catch {}
  const injected = (window as any).__MAHDI_API_BASE__ as string | undefined;
  if (injected && injected.trim()) return injected.trim().replace(/\/+$/, '');
  return DEFAULT_REMOTE_API.replace(/\/+$/, '');
}

/** Builds a full API URL from a root-relative path like '/api/translate'. */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
