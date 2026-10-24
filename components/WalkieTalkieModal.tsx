import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Mic, MicOff, Volume2, Radio, Hand, Bot, Trash2, Loader2, AlertCircle, Languages,
} from 'lucide-react';
import { ThemeConfig, Language, ConversationMessage } from '../types.ts';
import { LANGUAGES } from '../constants.ts';
import { WalkieTalkieEngine, WalkieSide, isSpeechRecognitionSupported } from '../walkieTalkieEngine.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  languages?: Language[];
  translateFn: (text: string, from: string, to: string) => Promise<string>;
  onSpeak: (text: string, lang: string) => void;
}

let msgSeq = 0;

export const WalkieTalkieModal: React.FC<Props> = ({
  isOpen, onClose, theme, languages = LANGUAGES, translateFn, onSpeak,
}) => {
  const [langA, setLangA] = useState('ar');
  const [langB, setLangB] = useState('en');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [running, setRunning] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeLang, setActiveLang] = useState('ar');
  const [interim, setInterim] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const engineRef = useRef<WalkieTalkieEngine | null>(null);
  const configRef = useRef({ langA, langB, mode });
  const translateRef = useRef(translateFn);
  const speakRef = useRef(onSpeak);
  const resumeTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  configRef.current = { langA, langB, mode };
  translateRef.current = translateFn;
  speakRef.current = onSpeak;

  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interim]);

  const otherLang = useCallback((detected: string) => {
    const { langA: a, langB: b } = configRef.current;
    if (detected === a) return b;
    if (detected === b) return a;
    // Unknown detected language: assume it belongs to the currently active side.
    return detected === a ? b : a;
  }, []);

  const handleFinal = useCallback(async (text: string, detectedLang: string) => {
    setInterim('');
    const target = otherLang(detectedLang);
    const speaker: WalkieSide = detectedLang === configRef.current.langB ? 'B' : 'A';
    setTranslating(true);
    let translation = '';
    try {
      translation = await translateRef.current(text, detectedLang, target);
    } catch {
      translation = '⚠️ تعذّرت الترجمة';
    } finally {
      setTranslating(false);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `wt-${Date.now()}-${msgSeq++}`,
        speaker,
        speakerName: speaker === 'A' ? 'المتحدث A' : 'المتحدث B',
        lang: detectedLang,
        sourceText: text,
        translatedText: translation,
        timestamp: Date.now(),
      },
    ]);

    // RTranslator loop: pause mic while TTS speaks (no feedback), then resume.
    const engine = engineRef.current;
    engine?.pause();
    try {
      speakRef.current(translation, target);
    } catch { /* ignore */ }
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => engine?.resume(), Math.max(1600, translation.length * 65));
  }, [otherLang]);

  const start = () => {
    setError(null);
    const engine = new WalkieTalkieEngine();
    engineRef.current = engine;
    engine.start({
      langA,
      langB,
      mode,
      onInterim: (t) => setInterim(t),
      onFinal: handleFinal,
      onStateChange: (isListening, lang) => {
        setListening(isListening);
        setActiveLang(lang);
      },
      onError: (msg) => setError(msg),
    });
    setRunning(true);
  };

  const stop = useCallback(() => {
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    engineRef.current?.stop();
    engineRef.current = null;
    setRunning(false);
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => () => stop(), [stop]);

  const close = () => {
    stop();
    onClose();
  };

  if (!isOpen) return null;

  const langName = (code: string) => languages.find((l) => l.code === code)?.nativeName || code;
  const rtlLang = (code: string) => languages.find((l) => l.code === code)?.rtl;

  return (
    <div className="mt-modal-backdrop" onClick={close} role="dialog" aria-modal="true" aria-label="وضع اللاسلكي">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Radio size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">وضع اللاسلكي WalkieTalkie</h2>
              <p className="text-[11px] mt-subtext">هاتف واحد يستمع للغتين — استمع، ترجم، نطق، ثم استمع مجدداً تلقائياً</p>
            </div>
          </div>
          <button onClick={close} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        {/* Language pickers */}
        <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          {(['A', 'B'] as const).map((side) => {
            const value = side === 'A' ? langA : langB;
            const setter = side === 'A' ? setLangA : setLangB;
            return (
              <label key={side} className="mt-surface rounded-2xl p-2.5 block">
                <span className="text-[10px] font-bold mt-subtext flex items-center gap-1 mb-1">
                  <Languages size={11} /> لغة المتحدث {side}
                </span>
                <select
                  value={value}
                  disabled={running}
                  onChange={(e) => setter(e.target.value)}
                  className="mt-input w-full rounded-xl px-2 py-1.5 text-xs font-bold bg-transparent"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.nativeName}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>

        {/* Mode + status */}
        <div className="px-5 py-3 flex items-center gap-2 border-b flex-wrap" style={{ borderColor: 'var(--mt-border)' }}>
          <button
            onClick={() => !running && setMode('auto')}
            disabled={running}
            className="mt-chip px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5"
            style={{
              borderColor: mode === 'auto' ? 'var(--mt-accent)' : 'var(--mt-border)',
              background: mode === 'auto' ? 'var(--mt-accent-soft)' : 'transparent',
              color: mode === 'auto' ? 'var(--mt-accent)' : 'var(--mt-subtext)',
            }}
          >
            <Bot size={13} /> تلقائي (لغتان معاً)
          </button>
          <button
            onClick={() => !running && setMode('manual')}
            disabled={running}
            className="mt-chip px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5"
            style={{
              borderColor: mode === 'manual' ? 'var(--mt-accent)' : 'var(--mt-border)',
              background: mode === 'manual' ? 'var(--mt-accent-soft)' : 'transparent',
              color: mode === 'manual' ? 'var(--mt-accent)' : 'var(--mt-subtext)',
            }}
          >
            <Hand size={13} /> يدوي (اضغط للتحدث)
          </button>
          {running && (
            <span className="text-[10px] font-bold mr-auto flex items-center gap-1.5" style={{ color: listening ? 'var(--mt-success)' : 'var(--mt-warning)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'currentColor' }} />
              {listening ? `يستمع: ${langName(activeLang)}` : 'يتحدث / يترجم...'}
            </span>
          )}
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto mt-scroll p-4 space-y-3" style={{ maxHeight: '38vh' }}>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-2xl text-[11px]" style={{ background: 'color-mix(in srgb, var(--mt-danger) 14%, transparent)', color: 'var(--mt-danger)' }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {!supported && (
            <div className="flex items-start gap-2 p-3 rounded-2xl text-[11px]" style={{ background: 'color-mix(in srgb, var(--mt-warning) 14%, transparent)', color: 'var(--mt-warning)' }}>
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              المتصفح الحالي لا يدعم Web Speech. داخل تطبيق أندرويد (APK) أو متصفح Chrome يعمل الوضع بكامل ميزاته.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 border"
                style={{
                  background: m.speaker === 'A' ? 'var(--mt-accent-soft)' : 'var(--mt-surface)',
                  borderColor: 'var(--mt-border)',
                }}
              >
                <div className="text-[9px] font-bold mt-subtext mb-1">{m.speakerName} · {langName(m.lang)}</div>
                <div className="text-xs font-semibold" dir={rtlLang(m.lang) ? 'rtl' : 'ltr'}>{m.sourceText}</div>
                <div className="mt-1.5 pt-1.5 border-t text-sm font-extrabold mt-accent-text" style={{ borderColor: 'var(--mt-border)' }}>
                  {m.translatedText}
                </div>
              </div>
            </div>
          ))}
          {interim && (
            <div className="text-[11px] mt-subtext italic px-2 flex items-center gap-1.5">
              <Mic size={12} className="animate-pulse" /> {interim}
            </div>
          )}
          {translating && (
            <div className="text-[11px] mt-accent-text flex items-center gap-1.5 px-2">
              <Loader2 size={12} className="animate-spin" /> يترجم الآن...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Controls */}
        <div className="border-t px-5 py-4" style={{ borderColor: 'var(--mt-border)' }}>
          {mode === 'manual' && running ? (
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(['A', 'B'] as WalkieSide[]).map((side) => (
                <button
                  key={side}
                  onPointerDown={() => engineRef.current?.setManualSide(side)}
                  className="mt-btn mt-btn-outline rounded-2xl py-3 text-xs font-extrabold flex items-center justify-center gap-2"
                >
                  <Mic size={16} /> تحدث كمتحدث {side} ({langName(side === 'A' ? langA : langB)})
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            {!running ? (
              <button onClick={start} disabled={!supported} className="mt-btn mt-btn-primary flex-1 rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
                <Mic size={18} /> ابدأ الاستماع المزدوج
              </button>
            ) : (
              <button onClick={stop} className="mt-btn mt-btn-danger flex-1 rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
                <MicOff size={18} /> إيقاف الاستماع
              </button>
            )}
            <button
              onClick={() => setMessages([])}
              className="mt-icon-btn p-3 rounded-2xl"
              title="مسح المحادثة"
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={() => messages.length && onSpeak(messages[messages.length - 1].translatedText, otherLang(messages[messages.length - 1].lang))}
              className="mt-icon-btn p-3 rounded-2xl"
              title="إعادة نطق آخر ترجمة"
            >
              <Volume2 size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
