/**
 * platform.ts — single entry point for capabilities that differ between the
 * installed Android app (Capacitor native shell) and the plain web/PWA build.
 *
 * Everything here is safe to import in either environment: native plugins are
 * loaded lazily and no-op gracefully when running in an ordinary browser.
 */
import { LANG_BCP47_MAP } from './constants.ts';

/* ───────────────────────────── environment ─────────────────────────────── */

export function isNativeApp(): boolean {
  try {
    // Capacitor injects this global only inside the native WebView shell.
    return Boolean((window as any).Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/* ─────────────────────────── speech recognition ────────────────────────── */

export interface SpeechHandlers {
  /** Live interim transcript while the user is speaking. */
  onPartial: (text: string) => void;
  /** A finished utterance, safe to commit as final text. */
  onFinal: (text: string) => void;
  /** Human-readable Arabic error message. */
  onError: (message: string) => void;
  /** Listening stopped for any reason. */
  onEnd: () => void;
}

export interface SpeechSession {
  start: (langCode: string) => Promise<void>;
  stop: () => void;
  readonly kind: 'native' | 'web';
}

/**
 * Creates the best speech recogniser available on this device:
 *  - native Android: @capacitor-community/speech-recognition (works inside the
 *    Capacitor WebView where the Web Speech API does not exist)
 *  - browser/PWA: webkitSpeechRecognition / SpeechRecognition
 * Returns null when speech input is unsupported.
 */
export async function createSpeechSession(handlers: SpeechHandlers): Promise<SpeechSession | null> {
  if (isNativeApp()) {
    try {
      const capCore = await import('@capacitor/core');
      if (capCore.Capacitor.isNativePlatform()) {
        const mod = await import('@capacitor-community/speech-recognition');
        const Speech = mod.SpeechRecognition;
        const avail = await Speech.available().catch(() => ({ available: false }));
        if (!avail.available) return null;
        const perm = await Speech.requestPermissions().catch(() => ({ speechRecognition: 'denied' }));
        if (perm.speechRecognition === 'denied') {
          handlers.onError('تم رفض إذن الميكروفون. امنح الإذن من إعدادات التطبيق.');
          return null;
        }

        const handles: Array<{ remove: () => void }> = [];
        handles.push(
          await Speech.addListener('partialResults', (data: { matches?: string[] }) => {
            const text = data.matches?.[0]?.trim();
            if (text) handlers.onPartial(text);
          }),
        );
        handles.push(
          await Speech.addListener('listeningState', (data: { status: string }) => {
            if (data.status === 'ended' || data.status === 'stopped') handlers.onEnd();
          }),
        );

        return {
          kind: 'native',
          async start(langCode: string) {
            await Speech.start({
              language: LANG_BCP47_MAP[langCode] || langCode || 'ar',
              partialResults: true,
              popup: false,
              maxResults: 1,
            });
          },
          stop() {
            Speech.stop().catch(() => undefined);
            handles.forEach((h) => h.remove());
          },
        };
      }
    } catch (err) {
      console.warn('Native speech unavailable, falling back to web:', err);
    }
  }

  // ── Web Speech API (desktop browsers / mobile Chrome / installed PWA) ──
  const W = window as any;
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  let finalTranscript = '';

  recognition.onresult = (event: any) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += `${finalTranscript ? ' ' : ''}${chunk.trim()}`;
        handlers.onFinal(chunk.trim());
      } else {
        interim += chunk;
      }
    }
    if (interim.trim()) handlers.onPartial(interim.trim());
  };
  recognition.onerror = (event: any) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      handlers.onError('تم رفض إذن الوصول للميكروفون. يرجى السماح بالوصول في المتصفح.');
    } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('Speech recognition error:', event.error);
    }
  };
  recognition.onend = () => handlers.onEnd();

  return {
    kind: 'web',
    async start(langCode: string) {
      finalTranscript = '';
      recognition.lang = LANG_BCP47_MAP[langCode] || langCode || 'ar';
      recognition.start();
    },
    stop() {
      try { recognition.stop(); } catch { /* already stopped */ }
    },
  };
}

/* ─────────────────────── hardware back / exit control ──────────────────── */

type BackHandler = () => boolean; // returning true means "event handled"
const backStack: BackHandler[] = [];

export function pushBackHandler(fn: BackHandler): () => void {
  backStack.push(fn);
  return () => {
    const idx = backStack.indexOf(fn);
    if (idx >= 0) backStack.splice(idx, 1);
  };
}

let backInitialised = false;

/**
 * Wires the Android hardware back button once.
 * - Open modals/sheets get the first chance to close themselves.
 * - Otherwise `onExitRequest` runs (the app implements double-press-to-exit).
 */
export function initHardwareBack(onExitRequest: () => void): void {
  if (backInitialised) return;
  backInitialised = true;

  if (isNativeApp()) {
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', () => {
          for (let i = backStack.length - 1; i >= 0; i--) {
            if (backStack[i]()) return;
          }
          onExitRequest();
        });
      } catch (err) {
        console.warn('Hardware back button unavailable:', err);
      }
    })();
  } else {
    // Progressive enhancement for browser/PWA testing.
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      for (let i = backStack.length - 1; i >= 0; i--) {
        if (backStack[i]()) return;
      }
    });
  }
}

/** Minimises the native app (Android) after the double-press confirmation. */
export async function exitNativeApp(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { App } = await import('@capacitor/app');
    await App.exitApp();
  } catch { /* web: nothing to exit */ }
}

/* ─────────────────────────── native camera ─────────────────────────────── */

export interface CapturedPhoto {
  dataUrl: string;
}

/**
 * Opens the native camera (Capacitor) with automatic permission handling.
 * Returns null when cancelled or when not running natively (the caller then
 * uses the browser getUserMedia path).
 */
export async function captureNativePhoto(): Promise<CapturedPhoto | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 88,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      allowEditing: false,
      promptLabelHeader: 'ترجمة بالكاميرا',
      promptLabelPhoto: 'من المعرض',
      promptLabelPicture: 'التقاط صورة',
    } as any);
    return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
  } catch (err: any) {
    if (String(err?.message || err).includes('cancel')) return null;
    console.warn('Native camera failed:', err);
    return null;
  }
}

/** Native photo-library picker; null when cancelled / not native. */
export async function pickNativePhoto(): Promise<CapturedPhoto | null> {
  if (!isNativeApp()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 88,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    } as any);
    return photo.dataUrl ? { dataUrl: photo.dataUrl } : null;
  } catch (err: any) {
    if (String(err?.message || err).includes('cancel')) return null;
    console.warn('Native photo pick failed:', err);
    return null;
  }
}
