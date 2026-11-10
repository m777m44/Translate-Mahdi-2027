import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  ArrowLeftRight,
  Download,
  Loader2,
  Mic,
  Radio,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { LANGUAGES } from '../constants.ts';
import { createSpeechSession, SpeechSession, pushBackHandler } from '../platform.ts';
import { tts } from '../tts.ts';
import { translateText } from '../geminiService.ts';
import { translateOffline } from '../offlineEngine.ts';
import { ensureTargetScript, beautifyArabic } from '../transliterate.ts';
import {
  cleanTranscript,
  describeEngine,
  detectBetween,
  exportTranscript,
  otherLanguage,
  splitSentences,
  WalkieTurn,
} from '../walkieTalkie.ts';

interface TtsSettings {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
}

interface WalkieTalkieModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: string;
  ttsSettings: TtsSettings;
  forceOffline: boolean;
  initialLangA?: string;
  initialLangB?: string;
}

type Phase = 'idle' | 'listening' | 'translating' | 'speaking';

const nativeName = (code: string) => {
  if (code === 'ar') return 'العربية';
  return LANGUAGES.find((l) => l.code === code)?.nativeName || code.toUpperCase();
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * الوضع الفوري (Walkie-Talkie) — the RTranslator feature, rebuilt for this app.
 *
 * One phone, two languages: the microphone listens continuously, the spoken
 * language is decided between the two selected ones, the sentence is translated
 * into the other language, spoken aloud, and listening resumes automatically.
 * The mic is muted while the app talks so it never transcribes its own voice.
 */
export const WalkieTalkieModal: React.FC<WalkieTalkieModalProps> = ({
  isOpen,
  onClose,
  ttsSettings,
  forceOffline,
  initialLangA = 'ar',
  initialLangB = 'en',
}) => {
  const [langA, setLangA] = useState(initialLangA);
  const [langB, setLangB] = useState(initialLangB);
  const [phase, setPhase] = useState<Phase>('idle');
  const [running, setRunning] = useState(false);
  const [turns, setTurns] = useState<WalkieTurn[]>([]);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [handsFree, setHandsFree] = useState(true);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sessionRef = useRef<SpeechSession | null>(null);
  const startingRef = useRef(false);       // guards double session creation
  const runningRef = useRef(false);        // loop should keep going
  const uttRef = useRef<(text: string) => void>(() => {});
  const phaseRef = useRef<Phase>('idle');
  const langARef = useRef(langA);
  const langBRef = useRef(langB);
  const autoSpeakRef = useRef(autoSpeak);
  const handsFreeRef = useRef(handsFree);
  const bufferRef = useRef('');            // unfinished sentence parts
  const lastFinalRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const recentOriginalRef = useRef<string>('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => { langARef.current = langA; }, [langA]);
  useEffect(() => { langBRef.current = langB; }, [langB]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);
  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Pre-load voices so the very first answer is spoken without delay.
  useEffect(() => {
    if (!isOpen || !autoSpeak) return;
    void tts.warmUp();
  }, [isOpen, autoSpeak]);

  const offlineActive = forceOffline || !online;

  /* ─────────────────────────── translation core ─────────────────────────── */

  const finalize = useCallback((text: string, lang: string) => {
    return beautifyArabic(ensureTargetScript(text, lang), lang);
  }, []);

  const translate = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    const useOffline = forceOffline || !navigator.onLine;
    if (!useOffline) {
      try {
        const res = await translateText(text, from, to);
        if (res?.translation?.trim()) return finalize(res.translation, to);
      } catch {
        /* fall through to the local engine */
      }
    }
    const local = translateOffline(text, from, to, {});
    return finalize(local.translation || text, to);
  }, [forceOffline, finalize]);

  const speak = useCallback(async (text: string, lang: string) => {
    if (!autoSpeakRef.current || !text.trim()) return;
    setPhase('speaking');
    try {
      await tts.speak(text, lang, ttsSettings.rate || 1, ttsSettings.pitch || 1);
    } catch {
      // No installed voice / engine hiccup: the conversation must keep going.
    }
    if (!mountedRef.current) return;
  }, [ttsSettings]);

  /* ──────────────────────────── the listen loop ─────────────────────────── */

  const startSession = useCallback(async () => {
    if (!runningRef.current) return;
    if (sessionRef.current || startingRef.current) return;
    startingRef.current = true;

    const a = langARef.current;
    const b = langBRef.current;
    // Listen with the primary language; the detector decides between the two.
    const session = await createSpeechSession({
      onPartial: (text) => {
        if (!runningRef.current) return;
        setPartial(text);
      },
      onFinal: (raw) => {
        if (!runningRef.current) return;
        const text = cleanTranscript(raw);
        setPartial('');
        if (text) uttRef.current(text);
      },
      onError: (message) => {
        setError(message);
        runningRef.current = false;
        setRunning(false);
        setPhase('idle');
        sessionRef.current = null;
      },
      onEnd: () => {
        // The engine stopped (permission, silence limit, or user cancel).
        sessionRef.current = null;
        if (runningRef.current) {
          window.setTimeout(() => { void startSession(); }, 220);
        } else {
          setPhase((p) => (p === 'speaking' ? p : 'idle'));
        }
      },
      onStart: () => {
        if (runningRef.current) setPhase('listening');
      },
    });

    if (!session) {
      startingRef.current = false;
      setError('التعرف الصوتي غير مدعوم على هذا الجهاز أو المتصفح.');
      runningRef.current = false;
      setRunning(false);
      setPhase('idle');
      return;
    }
    if (!runningRef.current) { session.cancel(); startingRef.current = false; return; }
    sessionRef.current = session;
    try {
      await session.start(a);
      startingRef.current = false;
      if (mountedRef.current) {
        setError(null);
        setPhase('listening');
      }
    } catch {
      startingRef.current = false;
      sessionRef.current = null;
      setError('تعذّر تشغيل الميكروفون. تحقق من الإذن.');
      runningRef.current = false;
      setRunning(false);
      setPhase('idle');
    }
    void b;
  }, []);

  /** Mutes the mic without committing text (used while TTS speaks). */
  const pauseMic = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.cancel();
  }, []);

  const handleUtterance = useCallback(async (text: string) => {
    // Ignore the recogniser re-delivering the same phrase.
    const now = Date.now();
    if (lastFinalRef.current.text === text && now - lastFinalRef.current.at < 1500) return;
    lastFinalRef.current = { text, at: now };

    const a = langARef.current;
    const b = langBRef.current;

    // 1) which language was spoken?
    const spoken = detectBetween(text, a, b, a);
    const target = otherLanguage(spoken, a, b);
    const speaker: 'A' | 'B' = spoken === a ? 'A' : 'B';

    // 2) build complete sentences (a half phrase is held for the next segment)
    const merged = `${bufferRef.current} ${text}`.trim();
    const { sentences, rest } = splitSentences(merged);
    // Whole sentences are translated now; the unfinished tail waits for the
    // next segment (unless nothing was complete, then we translate live).
    const payload = sentences.length ? sentences.join(' ').trim() : rest;
    bufferRef.current = sentences.length ? rest : '';
    if (!payload) return;

    recentOriginalRef.current = payload;
    setPhase('translating');
    setError(null);

    let translation = '';
    try {
      translation = await translate(payload, spoken, target);
    } catch {
      translation = payload;
    }
    if (!mountedRef.current) return;

    const turn: WalkieTurn = {
      id: uid(),
      speaker,
      sourceLang: spoken,
      targetLang: target,
      original: payload,
      translation,
      at: Date.now(),
    };
    setTurns((prev) => [...prev, turn]);

    // 3) speak it aloud, then keep listening (mic muted meanwhile -> no echo)
    if (autoSpeakRef.current) {
      pauseMic();
      await speak(translation, target);
    }
    if (!mountedRef.current) return;
    if (runningRef.current && handsFreeRef.current) {
      window.setTimeout(() => { void startSession(); }, 260);
    } else if (runningRef.current) {
      setPhase('idle');
    }
  }, [translate, speak, pauseMic, startSession]);

  useEffect(() => {
    uttRef.current = (text: string) => { void handleUtterance(text); };
  }, [handleUtterance]);

  /* ─────────────────────────── start / stop control ─────────────────────── */

  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    bufferRef.current = '';
    setRunning(true);
    setError(null);
    setPhase('listening');
    await startSession();
  }, [startSession]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    bufferRef.current = '';
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.stop();
    tts.stop();
    setPartial('');
    setPhase('idle');
  }, []);

  const toggle = useCallback(() => {
    if (runningRef.current) stop();
    else void start();
  }, [start, stop]);

  // Tidy up whenever the sheet closes.
  useEffect(() => {
    if (!isOpen) {
      runningRef.current = false;
      sessionRef.current?.stop();
      sessionRef.current = null;
      tts.stop();
      setRunning(false);
      setPhase('idle');
      setPartial('');
    }
  }, [isOpen]);

  useEffect(() => () => {
    runningRef.current = false;
    sessionRef.current?.cancel();
    sessionRef.current = null;
    tts.stop();
  }, []);

  // Restart the recogniser when either language changes mid-session.
  useEffect(() => {
    if (!runningRef.current) return;
    pauseMic();
    window.setTimeout(() => { void startSession(); }, 120);
  }, [langA, langB, pauseMic, startSession]);

  // Android back button closes the sheet (after stopping the mic).
  useEffect(() => {
    if (!isOpen) return;
    return pushBackHandler(() => { stop(); onClose(); return true; });
  }, [isOpen, onClose, stop]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { stop(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, stop]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns.length, partial]);

  const pickLang = (side: 'A' | 'B') => (code: string) => {
    if (side === 'A') setLangA(code); else setLangB(code);
  };

  const swap = () => { setLangA(langB); setLangB(langA); };

  const copyTurn = async (turn: WalkieTurn) => {
    try {
      await navigator.clipboard.writeText(`${turn.original}\n${turn.translation}`);
      setCopiedId(turn.id);
      window.setTimeout(() => setCopiedId(null), 1200);
    } catch { /* clipboard blocked */ }
  };

  const saveTranscript = () => {
    const text = exportTranscript(turns, nativeName(langA), nativeName(langB));
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mahdi-walkie-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const orbLabel = useMemo(() => {
    switch (phase) {
      case 'listening': return 'أستمع الآن…';
      case 'translating': return 'أترجم…';
      case 'speaking': return 'أتحدث…';
      default: return 'اضغط للبدء';
    }
  }, [phase]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="mt-backdrop" dir="rtl" role="dialog" aria-modal="true" aria-label="الوضع الفوري">
      <div className="mt-sheet-solid mt-wk-page" onClick={(e) => e.stopPropagation()}>
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="mt-wk-topbar">
          <button type="button" className="mt-lang-iconbtn" onClick={() => { stop(); onClose(); }} aria-label="رجوع">
            <ArrowRight size={23} />
          </button>
          <div className="mt-wk-title">
            <Zap size={18} className="mt-accent-text" />
            <span>الوضع الفوري</span>
          </div>
          <span className={`mt-wk-badge ${offlineActive ? 'mt-wk-badge--offline' : ''}`}>
            {offlineActive ? <WifiOff size={13} /> : <Wifi size={13} />}
            {describeEngine(!offlineActive, false)}
          </span>
        </div>

        {/* ── Language pair ───────────────────────────────────────── */}
        <div className="mt-wk-langs">
          <select
            className="mt-wk-select"
            value={langA}
            onChange={(e) => pickLang('A')(e.target.value)}
            aria-label="اللغة الأولى"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.nativeName}</option>
            ))}
          </select>
          <button type="button" className="mt-lang-iconbtn" onClick={swap} aria-label="تبديل اللغتين">
            <ArrowLeftRight size={20} />
          </button>
          <select
            className="mt-wk-select"
            value={langB}
            onChange={(e) => pickLang('B')(e.target.value)}
            aria-label="اللغة الثانية"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.nativeName}</option>
            ))}
          </select>
        </div>

        {/* ── Live orb ────────────────────────────────────────────── */}
        <div className="mt-wk-stage">
          <button
            type="button"
            onClick={toggle}
            className={`mt-wk-orb mt-wk-orb--${phase}`}
            aria-label={running ? 'إيقاف الوضع الفوري' : 'بدء الوضع الفوري'}
          >
            {phase === 'idle' && <Mic size={40} />}
            {phase === 'listening' && <Radio size={40} />}
            {phase === 'translating' && <Loader2 size={40} className="animate-spin" />}
            {phase === 'speaking' && <Volume2 size={40} />}
            <span className="mt-wk-orb-ring" aria-hidden="true" />
          </button>
          <div className="mt-wk-phase">{orbLabel}</div>
          <div className="mt-wk-partial" aria-live="polite">
            {partial || (turns.length ? '' : 'قل أي شيء بالعربية أو الإنجليزية وسأترجمه فوراً')}
          </div>
          {running && (
            <button type="button" className="mt-wk-stop" onClick={stop}>
              <Square size={14} /> إيقاف
            </button>
          )}
        </div>

        {/* ── Transcript ──────────────────────────────────────────── */}
        <div className="mt-wk-log mt-scroll">
          {turns.length === 0 && (
            <div className="mt-wk-empty">
              <Zap size={18} />
              <span>محادثة فورية بين {nativeName(langA)} و{nativeName(langB)} — بدون لمس الشاشة.</span>
            </div>
          )}
          {turns.map((turn) => (
            <div key={turn.id} className={`mt-wk-turn mt-wk-turn--${turn.speaker}`}>
              <div className="mt-wk-turn-head">
                <span className="mt-wk-turn-who">
                  {turn.speaker === 'A' ? nativeName(langA) : nativeName(langB)}
                </span>
                <span className="mt-wk-turn-route">
                  {turn.sourceLang.toUpperCase()} → {turn.targetLang.toUpperCase()}
                </span>
              </div>
              <p className="mt-wk-turn-original" dir="auto">{turn.original}</p>
              <p className="mt-wk-turn-translation" dir="auto">{turn.translation}</p>
              <div className="mt-wk-turn-actions">
                <button type="button" onClick={() => void tts.speak(turn.translation, turn.targetLang, ttsSettings.rate || 1, ttsSettings.pitch || 1)} aria-label="استماع">
                  <Volume2 size={15} />
                </button>
                <button type="button" onClick={() => void copyTurn(turn)} aria-label="نسخ">
                  {copiedId === turn.id ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {error && <div className="mt-wk-error">{error}</div>}

        {/* ── Controls ────────────────────────────────────────────── */}
        <div className="mt-wk-controls">
          <button
            type="button"
            className={`mt-wk-toggle ${handsFree ? 'is-on' : ''}`}
            onClick={() => setHandsFree((v) => !v)}
            title="استماع تلقائي متواصل"
          >
            <Radio size={16} /> تحويل تلقائي
          </button>
          <button
            type="button"
            className={`mt-wk-toggle ${autoSpeak ? 'is-on' : ''}`}
            onClick={() => { setAutoSpeak((v) => !v); if (autoSpeak) tts.stop(); }}
            title="نطق الترجمة تلقائياً"
          >
            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />} نطق تلقائي
          </button>
          <button type="button" className="mt-wk-toggle" onClick={saveTranscript} disabled={!turns.length} title="حفظ المحادثة">
            <Download size={16} /> حفظ
          </button>
          <button type="button" className="mt-wk-toggle mt-wk-toggle--danger" onClick={() => { stop(); setTurns([]); }} disabled={!turns.length} title="مسح المحادثة">
            <Trash2 size={16} /> مسح
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
