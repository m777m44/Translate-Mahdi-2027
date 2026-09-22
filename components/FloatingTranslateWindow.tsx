import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Minus,
  X,
  ArrowRightLeft,
  Volume2,
  Copy,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { ThemeConfig, Language } from '../types.ts';
import { detectLanguageFromText } from '../constants.ts';

interface FloatingTranslateWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  languages: Language[];
  onTranslate: (text: string, from: string, to: string) => Promise<string>;
  onSpeak: (text: string, lang: string) => void;
  onCopy: (text: string) => void;
  onShowToast?: (msg: string) => void;
}

/** The eight resize anchors available on every edge and corner. */
type Anchor = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const ANCHORS: { id: Anchor; className: string; cursor: string }[] = [
  { id: 'n', className: 'top-0 left-4 right-4 h-2', cursor: 'ns-resize' },
  { id: 's', className: 'bottom-0 left-4 right-4 h-2', cursor: 'ns-resize' },
  { id: 'w', className: 'left-0 top-4 bottom-4 w-2', cursor: 'ew-resize' },
  { id: 'e', className: 'right-0 top-4 bottom-4 w-2', cursor: 'ew-resize' },
  { id: 'nw', className: 'top-0 left-0 w-4 h-4', cursor: 'nwse-resize' },
  { id: 'ne', className: 'top-0 right-0 w-4 h-4', cursor: 'nesw-resize' },
  { id: 'sw', className: 'bottom-0 left-0 w-4 h-4', cursor: 'nesw-resize' },
  { id: 'se', className: 'bottom-0 right-0 w-4 h-4', cursor: 'nwse-resize' },
];

const MIN_W = 300;
const MIN_H = 190;
const STORE_KEY = 'mahdi_floating_window';

interface WindowState {
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
}

/** Starts docked at the top-centre of the screen. */
function initialState(): WindowState {
  const w = typeof window !== 'undefined' ? Math.min(430, Math.max(MIN_W, window.innerWidth - 48)) : 430;
  const h = 320;
  const x = typeof window !== 'undefined' ? Math.max(12, Math.round((window.innerWidth - w) / 2)) : 24;
  return { x, y: 12, w, h, minimized: false, maximized: false };
}

function loadState(): WindowState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    const maxX = Math.max(12, window.innerWidth - 120);
    const maxY = Math.max(12, window.innerHeight - 80);
    return {
      x: Math.min(Math.max(8, Number(parsed.x) || base.x), maxX),
      y: Math.min(Math.max(4, Number(parsed.y) ?? base.y), maxY),
      w: Math.min(Math.max(MIN_W, Number(parsed.w) || base.w), window.innerWidth - 16),
      h: Math.min(Math.max(MIN_H, Number(parsed.h) || base.h), window.innerHeight - 16),
      minimized: Boolean(parsed.minimized),
      maximized: Boolean(parsed.maximized),
    };
  } catch {
    return base;
  }
}

export const FloatingTranslateWindow: React.FC<FloatingTranslateWindowProps> = ({
  isOpen,
  onClose,
  currentTheme,
  languages,
  onTranslate,
  onSpeak,
  onCopy,
  onShowToast,
}) => {
  const [state, setState] = useState<WindowState>(loadState);
  const [isDragging, setIsDragging] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<Anchor | null>(null);
  const [copied, setCopied] = useState(false);

  const [fromLang, setFromLang] = useState('auto');
  const [toLang, setToLang] = useState('ar');
  const [inputText, setInputText] = useState('');
  const [resultText, setResultText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedLangCode, setDetectedLangCode] = useState('');

  /** Snapshot taken when a drag/resize gesture begins. */
  const gesture = useRef({ startX: 0, startY: 0, x: 0, y: 0, w: 0, h: 0, anchor: null as Anchor | 'move' | null });
  const translateTimer = useRef<number | null>(null);
  const seq = useRef(0);

  // Persist geometry so the window reopens exactly where the user left it.
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Keep the window inside the viewport when the screen size changes.
  useEffect(() => {
    const onResize = () => {
      setState(prev => {
        const w = Math.min(prev.w, window.innerWidth - 16);
        const h = Math.min(prev.h, window.innerHeight - 16);
        return {
          ...prev,
          w,
          h,
          x: Math.min(Math.max(8, prev.x), Math.max(8, window.innerWidth - w - 8)),
          y: Math.min(Math.max(4, prev.y), Math.max(4, window.innerHeight - 60)),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auto language detection + live translation while typing.
  useEffect(() => {
    if (fromLang === 'auto' && inputText.trim()) setDetectedLangCode(detectLanguageFromText(inputText));
    else setDetectedLangCode('');
  }, [inputText, fromLang]);

  const runTranslate = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setResultText('');
        return;
      }
      const mySeq = ++seq.current;
      setIsLoading(true);
      try {
        const res = await onTranslate(trimmed, fromLang, toLang);
        if (mySeq !== seq.current) return; // a newer request won
        setResultText(res);
      } catch {
        if (mySeq === seq.current) setResultText('تعذر إكمال الترجمة.');
      } finally {
        if (mySeq === seq.current) setIsLoading(false);
      }
    },
    [onTranslate, fromLang, toLang]
  );

  // Debounced live translation (300 ms) — the window translates as you type.
  useEffect(() => {
    if (translateTimer.current) window.clearTimeout(translateTimer.current);
    if (!inputText.trim()) {
      setResultText('');
      setIsLoading(false);
      return;
    }
    translateTimer.current = window.setTimeout(() => runTranslate(inputText), 300);
    return () => {
      if (translateTimer.current) window.clearTimeout(translateTimer.current);
    };
  }, [inputText, runTranslate]);

  /* ------------------------- drag & resize gesture ------------------------ */

  const beginGesture = (clientX: number, clientY: number, anchor: Anchor | 'move') => {
    gesture.current = { startX: clientX, startY: clientY, x: state.x, y: state.y, w: state.w, h: state.h, anchor };
    if (anchor === 'move') setIsDragging(true);
    else setActiveAnchor(anchor);
  };

  useEffect(() => {
    const anchor = gesture.current.anchor;
    if (!isDragging && !activeAnchor) return;

    const apply = (clientX: number, clientY: number) => {
      const g = gesture.current;
      const dx = clientX - g.startX;
      const dy = clientY - g.startY;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (g.anchor === 'move') {
        setState(prev => ({
          ...prev,
          x: Math.min(Math.max(8, g.x + dx), Math.max(8, vw - 90)),
          y: Math.min(Math.max(4, g.y + dy), Math.max(4, vh - 56)),
        }));
        return;
      }

      setState(prev => {
        let { x, y, w, h } = { x: g.x, y: g.y, w: g.w, h: g.h };
        const a = g.anchor as Anchor;
        if (a.includes('e')) w = Math.min(Math.max(MIN_W, g.w + dx), vw - x - 8);
        if (a.includes('s')) h = Math.min(Math.max(MIN_H, g.h + dy), vh - y - 8);
        if (a.includes('w')) {
          const nw = Math.min(Math.max(MIN_W, g.w - dx), g.x + g.w - 8);
          x = g.x + g.w - nw;
          w = nw;
        }
        if (a.includes('n')) {
          const nh = Math.min(Math.max(MIN_H, g.h - dy), g.y + g.h - 8);
          y = g.y + g.h - nh;
          h = nh;
        }
        return { ...prev, x, y, w, h, maximized: false };
      });
    };

    const onMove = (e: MouseEvent) => apply(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        apply(e.touches[0].clientX, e.touches[0].clientY);
        if (e.cancelable) e.preventDefault();
      }
    };
    const stop = () => {
      setIsDragging(false);
      setActiveAnchor(null);
      gesture.current.anchor = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', onTouch, { passive: false });
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, activeAnchor]);

  /* ------------------------------- actions -------------------------------- */

  const handleSwap = () => {
    const actualFrom = fromLang === 'auto' ? detectedLangCode || 'en' : fromLang;
    setFromLang(toLang);
    setToLang(actualFrom);
    setInputText(resultText);
    setResultText(inputText);
  };

  const handleCopy = () => {
    onCopy(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const snapTop = () => setState(prev => ({ ...prev, y: 8, x: Math.max(8, Math.round((window.innerWidth - prev.w) / 2)), maximized: false }));

  const toggleMaximize = () =>
    setState(prev =>
      prev.maximized
        ? { ...prev, maximized: false }
        : { ...prev, maximized: true, x: 8, y: 8, w: window.innerWidth - 16, h: window.innerHeight - 16 }
    );

  const detectedName = detectedLangCode ? languages.find(l => l.code === detectedLangCode)?.nativeName : '';
  const busy = isDragging || Boolean(activeAnchor);

  const dragProps = useMemo(
    () => ({
      onMouseDown: (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, select, input, textarea, a')) return;
        e.preventDefault();
        beginGesture(e.clientX, e.clientY, 'move');
      },
      onTouchStart: (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button, select, input, textarea, a')) return;
        if (e.touches.length === 1) beginGesture(e.touches[0].clientX, e.touches[0].clientY, 'move');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  if (!isOpen) return null;

  /* --------------------------- minimized pill ---------------------------- */
  if (state.minimized) {
    return (
      <div
        style={{ left: `${state.x}px`, top: `${state.y}px` }}
        className="fixed z-[95] mt-slide-up"
        {...dragProps}
      >
        <div
          onClick={() => setState(prev => ({ ...prev, minimized: false }))}
          className="mt-glass flex items-center gap-2 px-3.5 py-2 rounded-full cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform select-none"
          style={{ borderRadius: 999 }}
        >
          <div className="p-1.5 rounded-full" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold">الترجمة العائمة</span>
          <button
            onClick={e => {
              e.stopPropagation();
              onClose();
            }}
            className="mt-icon-btn p-1"
            aria-label="إغلاق النافذة العائمة"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ full window ---------------------------- */
  return (
    <section
      aria-label="نافذة الترجمة العائمة"
      style={{
        left: `${state.x}px`,
        top: `${state.y}px`,
        width: `${state.w}px`,
        height: `${state.h}px`,
        transition: busy ? 'none' : 'left .22s cubic-bezier(.16,1,.3,1), top .22s cubic-bezier(.16,1,.3,1), width .22s cubic-bezier(.16,1,.3,1), height .22s cubic-bezier(.16,1,.3,1)',
      }}
      className="mt-glass mt-fade-in fixed z-[95] overflow-hidden flex flex-col select-none"
      dir="rtl"
    >
      {/* Edge / corner resize anchors — every side is draggable */}
      {ANCHORS.map(a => (
        <div
          key={a.id}
          role="separator"
          aria-label={`تغيير الحجم من ${a.id}`}
          className={`absolute z-20 ${a.className} ${activeAnchor === a.id ? 'bg-[var(--mt-accent)]/25' : 'hover:bg-[var(--mt-accent)]/15'} transition-colors`}
          style={{ cursor: a.cursor, touchAction: 'none' }}
          onMouseDown={e => {
            e.preventDefault();
            e.stopPropagation();
            beginGesture(e.clientX, e.clientY, a.id);
          }}
          onTouchStart={e => {
            e.stopPropagation();
            if (e.touches.length === 1) beginGesture(e.touches[0].clientX, e.touches[0].clientY, a.id);
          }}
        />
      ))}

      {/* Header — the whole bar drags the window (no grip icon needed) */}
      <header
        {...dragProps}
        className="mt-sheet-header flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing"
        style={{ borderColor: 'var(--mt-border)', touchAction: 'none' }}
        onDoubleClick={snapTop}
        title="اسحب من أي مكان · انقر مرتين للتوسيط في الأعلى"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="mt-accent-text shrink-0" />
          <span className="text-xs font-bold truncate">نافذة الترجمة العائمة</span>
          {detectedName && <span className="mt-badge shrink-0">{detectedName}</span>}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={snapTop} className="mt-icon-btn p-1.5" title="توسيط في الأعلى" aria-label="توسيط في الأعلى">
            <ArrowRightLeft size={13} className="rotate-90" />
          </button>
          <button onClick={toggleMaximize} className="mt-icon-btn p-1.5" title={state.maximized ? 'استعادة الحجم' : 'تكبير'} aria-label="تكبير">
            {state.maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button onClick={() => setState(prev => ({ ...prev, minimized: true }))} className="mt-icon-btn p-1.5" title="تصغير" aria-label="تصغير">
            <Minus size={14} />
          </button>
          <button onClick={onClose} className="mt-icon-btn p-1.5 hover:!text-[var(--mt-danger)]" title="إغلاق" aria-label="إغلاق">
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Language bar */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
        <select
          value={fromLang}
          onChange={e => setFromLang(e.target.value)}
          className="mt-select !w-auto text-xs font-bold py-1 px-1.5 max-w-[42%]"
          aria-label="لغة المصدر"
        >
          <option value="auto">✨ كشف تلقائي</option>
          {languages.map(l => (
            <option key={l.code} value={l.code}>
              {l.nativeName}
            </option>
          ))}
        </select>

        <button onClick={handleSwap} className="mt-icon-btn p-1.5 active:rotate-180 shrink-0" title="تبديل اللغات" aria-label="تبديل اللغات">
          <ArrowRightLeft size={13} />
        </button>

        <select
          value={toLang}
          onChange={e => setToLang(e.target.value)}
          className="mt-select !w-auto text-xs font-bold py-1 px-1.5 max-w-[42%]"
          aria-label="لغة الهدف"
        >
          {languages.map(l => (
            <option key={l.code} value={l.code}>
              {l.nativeName}
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 p-2.5">
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              runTranslate(inputText);
            }
            if (e.key === 'Escape') setState(prev => ({ ...prev, minimized: true }));
          }}
          placeholder="اكتب أو الصق… وتُترجم فوراً (Enter للترجمة، Esc للتصغير)"
          className="mt-textarea p-2.5 text-[13px] leading-relaxed resize-none flex-1 min-h-[52px]"
          aria-label="النص المراد ترجمته"
        />

        <div className="mt-surface-soft border p-2.5 flex-1 min-h-[58px] flex flex-col justify-between overflow-y-auto mt-scroll" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words font-medium select-text">
            {resultText ? (
              resultText
            ) : isLoading ? (
              <span className="flex items-center gap-2 opacity-60 text-xs">
                <span className="mt-spinner w-3 h-3" /> جاري الترجمة…
              </span>
            ) : (
              <span className="opacity-35 italic text-xs">ستظهر الترجمة هنا مباشرة…</span>
            )}
          </div>

          {resultText && (
            <div className="flex items-center justify-end gap-1 pt-1.5 mt-1.5 border-t" style={{ borderColor: 'var(--mt-border)' }}>
              <button onClick={() => onSpeak(resultText, toLang)} className="mt-icon-btn p-1.5" title="استماع للترجمة" aria-label="استماع">
                <Volume2 size={13} />
              </button>
              <button onClick={handleCopy} className={`mt-icon-btn p-1.5 ${copied ? 'mt-success-text' : ''}`} title="نسخ الترجمة" aria-label="نسخ">
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <button onClick={() => runTranslate(inputText)} className="mt-icon-btn p-1.5" title="إعادة الترجمة" aria-label="إعادة الترجمة">
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Size read-out while resizing */}
      {activeAnchor && (
        <div className="absolute bottom-2 left-2 mt-badge font-mono pointer-events-none">
          {Math.round(state.w)} × {Math.round(state.h)}
        </div>
      )}
    </section>
  );
};
