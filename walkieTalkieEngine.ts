/**
 * walkieTalkieEngine.ts — RTranslator-style WalkieTalkie mode on the web.
 *
 * A single phone listens to TWO languages simultaneously (emulated by quickly
 * alternating Web Speech recognition sessions between the two locales),
 * auto-detects which language the interlocutor used (see langId.ts), lets the
 * UI translate + speak the result, then automatically resumes listening once
 * the TTS finishes — exactly the RTranslator loop:
 *
 *   listen → detect language → translate → speak → resume listening.
 *
 * Also supports a manual push-to-talk side selection (like RTranslator 2.1's
 * manual mic controls).
 */

import { identifyLanguage } from './langId.ts';
import { LANG_BCP47_MAP } from './constants.ts';

export type WalkieSide = 'A' | 'B';

export interface WalkieSessionConfig {
  langA: string;
  langB: string;
  /** 'auto' alternates both languages; 'manual' listens only to the active side. */
  mode: 'auto' | 'manual';
  onInterim?: (text: string, lang: string) => void;
  onFinal?: (text: string, detectedLang: string) => void;
  onStateChange?: (listening: boolean, activeLang: string) => void;
  onError?: (message: string) => void;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export class WalkieTalkieEngine {
  private recognition: any = null;
  private running = false;
  private paused = false;
  private config: WalkieSessionConfig | null = null;
  private activeSide: WalkieSide = 'A';
  private restartTimer: number | null = null;
  private manualRestart = false;

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  private bcp47(lang: string): string {
    return LANG_BCP47_MAP[lang] || lang;
  }

  private currentLang(): string {
    if (!this.config) return 'en';
    return this.activeSide === 'A' ? this.config.langA : this.config.langB;
  }

  start(config: WalkieSessionConfig): void {
    if (!isSpeechRecognitionSupported()) {
      config.onError?.('متصفحك لا يدعم التعرّف الصوتي المباشر (Web Speech API). استخدم Chrome أو تطبيق أندرويد.');
      return;
    }
    this.config = config;
    this.running = true;
    this.paused = false;
    this.activeSide = 'A';
    this.beginSession();
  }

  private beginSession(): void {
    if (!this.running || !this.config) return;

    const Ctor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = this.bcp47(this.currentLang());
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (!this.config || this.paused) return;
      let interim = '';
      const finals: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finals.push(result[0].transcript);
        else interim += result[0].transcript;
      }
      if (interim) this.config.onInterim?.(interim, this.currentLang());
      for (const text of finals) {
        const clean = text.trim();
        if (!clean) continue;
        // Confirm/override the session language with the offline trigram model.
        const candidates = identifyLanguage(clean, 2);
        const pair = [this.config.langA, this.config.langB];
        const detected =
          candidates.find((c) => pair.includes(c.lang))?.lang || this.currentLang();
        this.config.onFinal?.(clean, detected);
      }
    };

    recognition.onerror = (event: any) => {
      if (!this.running) return;
      if (event.error === 'no-speech' || event.error === 'aborted') return; // auto-restart handles these
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.running = false;
        this.config?.onError?.('تم رفض إذن الميكروفون. امنح الإذن من إعدادات المتصفح/التطبيق.');
        return;
      }
      this.config?.onError?.(`خطأ صوتي: ${event.error}`);
    };

    recognition.onend = () => {
      this.config?.onStateChange?.(false, this.currentLang());
      if (!this.running || this.paused) return;
      // In auto mode swap the recognition locale for the next session so both
      // interlocutor languages are covered in rapid alternation.
      if (this.config?.mode === 'auto') {
        this.activeSide = this.activeSide === 'A' ? 'B' : 'A';
      }
      this.scheduleRestart();
    };

    this.recognition = recognition;
    try {
      recognition.start();
      this.config?.onStateChange?.(true, this.currentLang());
    } catch {
      this.scheduleRestart();
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimer) window.clearTimeout(this.restartTimer);
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (this.running && !this.paused) this.beginSession();
    }, 220);
  }

  /** Push-to-talk: force listening to one speaker side (manual mode). */
  setManualSide(side: WalkieSide): void {
    if (!this.config || this.config.mode !== 'manual') return;
    if (this.activeSide === side && this.running && !this.paused) return;
    this.activeSide = side;
    this.restartRecognition();
  }

  /** Temporarily stop the mic (e.g. while TTS is speaking to avoid feedback). */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.manualRestart = true;
    try { this.recognition?.stop(); } catch { /* already stopped */ }
    this.config?.onStateChange?.(false, this.currentLang());
  }

  /** Resume the listen → translate → speak loop. */
  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.manualRestart = false;
    this.beginSession();
  }

  private restartRecognition(): void {
    try { this.recognition?.stop(); } catch { /* ignore */ }
    // onend handler will re-create a session with the new side.
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    if (this.restartTimer) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    try { this.recognition?.stop(); } catch { /* ignore */ }
    this.recognition = null;
    this.config?.onStateChange?.(false, this.currentLang());
  }
}
