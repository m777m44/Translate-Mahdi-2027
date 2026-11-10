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
  /** Listening stopped for any reason (only when the user session is over). */
  onEnd: () => void;
  /** A recognition segment (re)started and audio is flowing again. */
  onStart?: () => void;
}

export interface SpeechSession {
  start: (langCode: string) => Promise<void>;
  stop: () => void;
  readonly kind: 'native' | 'web';
  /** Locale the recogniser is currently decoding (e.g. 'ar', 'en'). */
  readonly langCode: string;
}

/**
 * Continuous dictation engine.
 *
 * Both Android's SpeechRecognizer and Chrome's Web Speech API stop on their own
 * after a short silence — which is why a single tap used to capture one phrase
 * and then throw the rest away. This module keeps a "user still wants to talk"
 * flag and transparently restarts the recogniser at every segment boundary, so
 * speech keeps flowing and nothing said is dropped:
 *
 *  - the newest partial is always surfaced immediately (zero perceived lag);
 *  - a segment that ends is committed through onFinal() instead of vanishing;
 *  - restart is quick (~140ms) and guarded against storms / dead microphones.
 */

const RESTART_DELAY_MS = 140;
const MAX_SILENT_RESTARTS = 12;

/** Collapses whitespace so committed text never doubles up on restart. */
function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

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
        let desired = false;          // user wants to keep dictating
        let lastPartial = '';         // newest transcript of the current segment
        let restartTimer: number | null = null;
        let silentRestarts = 0;
        let stopped = false;

        const clearRestart = () => {
          if (restartTimer !== null) {
            window.clearTimeout(restartTimer);
            restartTimer = null;
          }
        };

        const commitSegment = () => {
          const text = tidy(lastPartial);
          lastPartial = '';
          if (text) handlers.onFinal(text);
        };

        const doStart = async (lang: string) => {
          if (!desired || stopped) return;
          try {
            await Speech.start({
              language: LANG_BCP47_MAP[lang] || lang || 'ar',
              partialResults: true,
              popup: false,
              maxResults: 1,
            });
            handlers.onStart?.();
          } catch (err) {
            // A session that is still shutting down rejects the next start —
            // retry once after the normal gap instead of giving up.
            console.warn('speech restart failed:', err);
            if (desired && !stopped) scheduleRestart(260);
          }
        };

        const scheduleRestart = (delay = RESTART_DELAY_MS) => {
          clearRestart();
          restartTimer = window.setTimeout(() => {
            restartTimer = null;
            void doStart(currentLang);
          }, delay);
        };

        let currentLang = 'ar';

        handles.push(
          await Speech.addListener('partialResults', (data: { matches?: string[] }) => {
            const text = tidy(data.matches?.[0] || '');
            if (!text) return;
            // A longer/rewritten partial replaces the previous one; the engine
            // only reports what the current segment contains, so no dupes.
            if (text === lastPartial) return;
            lastPartial = text;
            silentRestarts = 0;
            handlers.onPartial(text);
          }),
        );

        handles.push(
          await Speech.addListener('listeningState', (data: { status?: string }) => {
            const status = data.status;
            if (status === 'started') {
              handlers.onStart?.();
              return;
            }
            if (status !== 'stopped' && status !== 'ended') return;

            // Segment finished: keep every word, then immediately keep the mic
            // open again if the user is still in dictation mode.
            const hadSpeech = Boolean(tidy(lastPartial));
            commitSegment();
            if (!desired || stopped) {
              handlers.onEnd();
              return;
            }
            silentRestarts = hadSpeech ? 0 : silentRestarts + 1;
            if (silentRestarts > MAX_SILENT_RESTARTS) {
              // Nothing has been heard for a long time: stop instead of
              // draining the battery with an endless restart loop.
              desired = false;
              handlers.onEnd();
              return;
            }
            scheduleRestart(silentRestarts > 3 ? 320 : RESTART_DELAY_MS);
          }),
        );

        return {
          kind: 'native',
          get langCode() {
            return currentLang;
          },
          async start(langCode: string) {
            currentLang = langCode;
            desired = true;
            stopped = false;
            lastPartial = '';
            silentRestarts = 0;
            await doStart(langCode);
          },
          stop() {
            desired = false;
            stopped = true;
            clearRestart();
            commitSegment();
            Speech.stop().catch(() => undefined);
            handles.forEach((h) => h.remove());
            handles.length = 0;
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

  let desired = false;
  let stopped = false;
  let lang = 'ar';
  let pendingInterim = '';
  let restartTimer: number | null = null;
  let silentRestarts = 0;

  const clearRestart = () => {
    if (restartTimer !== null) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const commitInterim = () => {
    const text = tidy(pendingInterim);
    pendingInterim = '';
    if (text) handlers.onFinal(text);
  };

  const scheduleRestart = (delay = RESTART_DELAY_MS) => {
    clearRestart();
    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      if (!desired || stopped) return;
      try {
        recognition.lang = LANG_BCP47_MAP[lang] || lang || 'ar';
        recognition.start();
        handlers.onStart?.();
      } catch {
        // "already started" / transient invalid-state: try once more later.
        if (desired && !stopped) scheduleRestart(300);
      }
    }, delay);
  };

  recognition.onresult = (event: any) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const chunk = tidy(result?.[0]?.transcript || '');
      if (!chunk) continue;
      if (result.isFinal) {
        // Commit immediately: this is the moment the engine is most accurate.
        pendingInterim = '';
        silentRestarts = 0;
        handlers.onFinal(chunk);
      } else {
        interimText = interimText ? `${interimText} ${chunk}` : chunk;
      }
    }
    if (interimText) {
      pendingInterim = interimText;
      silentRestarts = 0;
      handlers.onPartial(interimText);
    }
  };

  recognition.onerror = (event: any) => {
    const err = event?.error;
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      desired = false;
      handlers.onError('تم رفض إذن الوصول للميكروفون. يرجى السماح بالوصول في المتصفح.');
      return;
    }
    if (err === 'audio-capture') {
      desired = false;
      handlers.onError('لم يتم العثور على ميكروفون متاح على هذا الجهاز.');
      return;
    }
    // 'no-speech' / 'aborted' / network blips are normal between phrases: the
    // onend restart below handles them without bothering the user.
    if (err !== 'no-speech' && err !== 'aborted') {
      console.warn('Speech recognition error:', err);
    }
  };

  recognition.onend = () => {
    // Never lose the tail of a phrase: commit whatever is still interim.
    commitInterim();
    if (desired && !stopped) {
      silentRestarts += 1;
      if (silentRestarts > MAX_SILENT_RESTARTS) {
        desired = false;
        handlers.onEnd();
        return;
      }
      scheduleRestart(silentRestarts > 3 ? 320 : RESTART_DELAY_MS);
      return;
    }
    handlers.onEnd();
  };

  return {
    kind: 'web',
    get langCode() {
      return lang;
    },
    async start(langCode: string) {
      lang = langCode;
      desired = true;
      stopped = false;
      pendingInterim = '';
      silentRestarts = 0;
      clearRestart();
      recognition.lang = LANG_BCP47_MAP[langCode] || langCode || 'ar';
      recognition.start();
    },
    stop() {
      desired = false;
      stopped = true;
      clearRestart();
      commitInterim();
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
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
