import React, { useMemo, useState } from 'react';
import {
  X, BookOpenText, ArrowRight, Hash, Volume2, Languages, Sparkles, RefreshCw,
} from 'lucide-react';
import { ThemeConfig } from '../types.ts';
import { translateWordByWord, WordToken } from '../offlineEngine.ts';
import { LANGUAGES } from '../constants.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  text: string;
  from: string;
  to: string;
  dialect?: string;
  onSpeak?: (text: string, lang: string) => void;
}

const KIND_META: Record<WordToken['kind'], { label: string; color: string; bg: string }> = {
  dictionary: { label: 'معجم', color: 'var(--mt-success)', bg: 'color-mix(in srgb, var(--mt-success) 15%, transparent)' },
  transliterated: { label: 'نقحرة', color: 'var(--mt-warning)', bg: 'color-mix(in srgb, var(--mt-warning) 15%, transparent)' },
  number: { label: 'رقم', color: 'var(--mt-accent)', bg: 'var(--mt-accent-soft)' },
  punct: { label: 'علامة', color: 'var(--mt-subtext)', bg: 'var(--mt-surface)' },
  space: { label: 'مسافة', color: 'var(--mt-subtext)', bg: 'transparent' },
};

export const WordBreakdownModal: React.FC<Props> = ({
  isOpen, onClose, text, from, to, dialect, onSpeak,
}) => {
  const [version, setVersion] = useState(0);
  const tokens = useMemo<WordToken[]>(() => {
    if (!isOpen || !text.trim()) return [];
    return translateWordByWord(text, from, to, { dialect });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, text, from, to, dialect, version]);

  if (!isOpen) return null;

  const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.nativeName || code;
  const rtlTarget = LANGUAGES.find((l) => l.code === to)?.rtl;
  const meaningful = tokens.filter((t) => t.kind !== 'space' && t.kind !== 'punct');
  const dictCount = meaningful.filter((t) => t.kind === 'dictionary').length;
  const coverage = meaningful.length ? Math.round((dictCount / meaningful.length) * 100) : 0;
  const joined = tokens.map((t) => t.target).join('').replace(/\s+/g, ' ').trim();

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="تحليل الكلمات">
      <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <BookOpenText size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">تحليل الكلمات وترجمتها</h2>
              <p className="text-[11px] mt-subtext flex items-center gap-1">
                {langName(from)} <ArrowRight size={10} /> {langName(to)} · نسبة التغطية المعجمية {coverage}%
              </p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        {/* Coverage bar */}
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="mt-progress-track">
            <div className="mt-progress-bar" style={{ width: `${coverage}%` }} />
          </div>
          <p className="text-[10px] mt-subtext mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--mt-success)' }} /> كلمة مترجمة من المعجم</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--mt-warning)' }} /> كلمة محوّلة لنفس كتابة الهدف (نقحرة)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--mt-accent)' }} /> رقم</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5" style={{ maxHeight: '56vh' }}>
          {meaningful.length === 0 ? (
            <div className="text-center py-12 mt-subtext text-sm">
              <Languages size={28} className="mx-auto mb-3 opacity-60" />
              اكتب نصاً في الشاشة الرئيسية ثم افتح التحليل لرؤية ترجمة كل كلمة على حدة.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tokens.map((t, idx) => {
                if (t.kind === 'space') return <span key={idx} className="w-2" />;
                const meta = KIND_META[t.kind];
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border px-3 py-2 max-w-full"
                    style={{ borderColor: 'var(--mt-border)', background: 'var(--mt-surface)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                      {t.kind === 'number' && <Hash size={10} className="mt-subtext" />}
                    </div>
                    <div className="text-[11px] mt-subtext truncate max-w-[180px]" dir="auto">{t.source}</div>
                    <div className="text-sm font-extrabold flex items-center gap-1.5" dir={rtlTarget ? 'rtl' : 'ltr'}>
                      <span className="truncate max-w-[180px]">{t.target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {joined && (
            <div className="mt-5 mt-modal-shell rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold mt-subtext flex items-center gap-1.5">
                  <Sparkles size={12} className="mt-accent-text" /> النص الناتج الكامل
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setVersion((v) => v + 1)} className="mt-icon-btn p-1.5" title="إعادة التحليل">
                    <RefreshCw size={13} />
                  </button>
                  {onSpeak && (
                    <button onClick={() => onSpeak(joined, to)} className="mt-icon-btn p-1.5" title="نطق">
                      <Volume2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm font-bold leading-relaxed" dir={rtlTarget ? 'rtl' : 'ltr'}>{joined}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
