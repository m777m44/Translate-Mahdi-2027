/**
 * updater.ts — one entry point for the in-app updater on every platform.
 *
 * Android (inside the Capacitor shell): delegates to the native `AppUpdater`
 * plugin (Kotlin) which talks to the GitHub API, downloads the APK with
 * progress events and opens the system installer through FileProvider.
 *
 * Web / PWA: the same check runs in the browser, and "update" simply opens the
 * permanent download link (the PWA updates itself through the service worker).
 */

export const REPO = 'm777m44/Translate-Mahdi-2027';
export const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
/** Frozen asset name: this URL always serves the newest full-featured build. */
export const STABLE_DOWNLOAD_URL = `https://github.com/${REPO}/releases/latest/download/mahdi-translate-v4.apk`;

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  versionName?: string;
  changelog?: string;
  downloadUrl: string;
  sizeBytes?: number;
  canInstall?: boolean;
}

interface NativeUpdater {
  getVersion(): Promise<{ versionName: string; versionCode: number; canInstall: boolean }>;
  check(): Promise<UpdateInfo>;
  download(options: { url: string }): Promise<{ path: string; sizeBytes: number }>;
  install(options: { path?: string }): Promise<void>;
  canInstall(): Promise<{ canInstall: boolean }>;
  openPermission(): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    cb: (data: { progress: number; percent: number }) => void,
  ): Promise<{ remove: () => void }> | { remove: () => void };
}

let nativePlugin: NativeUpdater | null = null;
let nativeChecked = false;

/** Loads the Capacitor plugin lazily; resolves null on the web. */
async function getNative(): Promise<NativeUpdater | null> {
  if (nativeChecked) return nativePlugin;
  nativeChecked = true;
  try {
    const cap = (window as any)?.Capacitor;
    if (!cap?.isNativePlatform?.()) return null;
    const { registerPlugin } = await import('@capacitor/core');
    nativePlugin = registerPlugin<NativeUpdater>('AppUpdater');
  } catch {
    nativePlugin = null;
  }
  return nativePlugin;
}

/** Semver-ish comparison that ignores any "-beta" suffix. */
export function isNewerVersion(remote: string, local: string): boolean {
  const parse = (value: string) =>
    value
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10) || 0);
  const a = parse(remote);
  const b = parse(local);
  const size = Math.max(a.length, b.length);
  for (let i = 0; i < size; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** The version compiled into this build (kept in sync with package.json). */
export const APP_VERSION = '5.4.0';

/** Checks GitHub for a newer release. Never throws — returns null on failure. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const native = await getNative();
  if (native) {
    try {
      return await native.check();
    } catch {
      return null;
    }
  }

  // Web/PWA path: hit the public GitHub API directly.
  try {
    const res = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const data = await res.json();
    const tag: string = data?.tag_name || '';
    const remote = tag.replace(/^v/i, '').trim();
    if (!remote) return null;
    const assets: Array<{ name: string; browser_download_url: string; size: number }> =
      data?.assets || [];
    const stable = assets.find((a) => a.name === 'mahdi-translate-v4.apk');
    return {
      available: isNewerVersion(remote, APP_VERSION),
      currentVersion: APP_VERSION,
      versionName: remote,
      changelog: (data?.body || '').trim(),
      downloadUrl: stable?.browser_download_url || STABLE_DOWNLOAD_URL,
      sizeBytes: stable?.size,
      canInstall: false,
    };
  } catch {
    return null;
  }
}

export interface DownloadHandle {
  /** Resolves with the cached APK path, or null on the web. */
  promise: Promise<string | null>;
  /** Removes the progress listener. */
  dispose: () => void;
}

/**
 * Downloads the update.
 * - native: real APK download with progress callbacks
 * - web: opens the permanent download URL and resolves null
 */
export async function downloadUpdate(
  info: UpdateInfo,
  onProgress?: (percent: number) => void,
): Promise<DownloadHandle> {
  const native = await getNative();
  if (!native) {
    window.open(info.downloadUrl || STABLE_DOWNLOAD_URL, '_blank', 'noopener');
    return { promise: Promise.resolve(null), dispose: () => {} };
  }

  let handle: { remove: () => void } | null = null;
  try {
    const listener = await native.addListener('downloadProgress', (data) => {
      onProgress?.(Math.max(0, Math.min(100, Math.round(data.percent ?? data.progress * 100))));
    });
    handle = listener as { remove: () => void };
  } catch {
    handle = null;
  }

  const promise = native
    .download({ url: info.downloadUrl || STABLE_DOWNLOAD_URL })
    .then((res) => res?.path ?? null);

  return {
    promise,
    dispose: () => handle?.remove?.(),
  };
}

/** Opens the system installer for a downloaded APK (native only). */
export async function installUpdate(path: string | null): Promise<boolean> {
  const native = await getNative();
  if (!native) return false;
  try {
    await native.install(path ? { path } : {});
    return true;
  } catch {
    return false;
  }
}

/** Current installed version (native) or the bundled one (web). */
export async function getInstalledVersion(): Promise<string> {
  const native = await getNative();
  if (!native) return APP_VERSION;
  try {
    const info = await native.getVersion();
    return info?.versionName || APP_VERSION;
  } catch {
    return APP_VERSION;
  }
}

/** Opens the "install unknown apps" screen when Android blocks the installer. */
export async function openInstallPermission(): Promise<void> {
  const native = await getNative();
  try {
    await native?.openPermission();
  } catch {
    /* ignore */
  }
}

/** Formats a byte count for the dialog ("11.9 MB"). */
export function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} م.ب`;
}
