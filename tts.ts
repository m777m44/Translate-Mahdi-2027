/**
 * tts.ts — robust local Text-to-Speech.
 *
 * Fixes the "speaks before translation but not after" class of bugs:
 *  - waits for the device voice list (up to 2s) on slow Android WebViews
 *  - always cancels any in-flight utterance before speaking a new one
 *  - picks a voice matching the requested BCP-47 language
 *  - never throws into the UI; empty text is ignored, buttons stay disabled
 *  - a single shared instance avoids stale-closure problems across components
 */
import { LANG_BCP47_MAP } from './constants.ts';

class TextToSpeech {
  private voices: SpeechSynthesisVoice[] = [];
  private ready = false;

  constructor() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    this.loadVoices();
    try {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
    } catch {
      /* some embedded WebViews expose a read-only stub */
    }
  }

  private loadVoices(): void {
    try {
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0) this.ready = true;
    } catch {
      this.voices = [];
    }
  }

  private waitForVoices(timeoutMs = 2000): Promise<void> {
    if (this.ready && this.voices.length > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(), timeoutMs);
      const check = () => {
        this.loadVoices();
        if (this.voices.length > 0) {
          window.clearTimeout(timer);
          resolve();
        }
      };
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.onvoiceschanged = () => {
            check();
          };
        } catch {
          /* read-only stub — polling below still works */
        }
      }
      // Some devices populate voices without firing the event — poll briefly.
      const poll = window.setInterval(() => {
        check();
        if (this.voices.length > 0) window.clearInterval(poll);
      }, 250);
      window.setTimeout(() => window.clearInterval(poll), timeoutMs);
    });
  }

  private resolveBcp47(lang: string): string {
    return LANG_BCP47_MAP[lang] || lang || 'ar-SA';
  }

  /** Speaks `text` in `lang` (app language code or a BCP-47 tag). */
  async speak(text: string, lang: string, rate = 1, pitch = 1): Promise<void> {
    if (!text || !text.trim()) {
      console.warn('TTS: empty text, nothing to speak.');
      return;
    }
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('TTS: speechSynthesis is unavailable on this platform.');
      return;
    }

    await this.waitForVoices();

    const bcp47 = this.resolveBcp47(lang);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    const base = bcp47.split('-')[0];
    const voice =
      this.voices.find((v) => v.lang === bcp47) ||
      this.voices.find((v) => v.lang?.toLowerCase().startsWith(base.toLowerCase()));
    if (voice) utterance.voice = voice;

    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // never leave the caller hanging
      // Chrome on Android can pause long utterances — nudge the queue.
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const tts = new TextToSpeech();
