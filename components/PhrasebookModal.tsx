import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Volume2, BookOpen, Layers, BookmarkPlus, Trash2, Plus, Brain, Check, XCircle,
  Search, GraduationCap, RotateCcw,
} from 'lucide-react';
import { ThemeConfig, Language } from '../types.ts';
import { LANGUAGES } from '../constants.ts';
import {
  BUILTIN_PHRASES, PHRASE_CATEGORIES, PhraseCategory, phraseInLanguage,
  getUserPhrases, addUserPhrase, removeUserPhrase, UserPhrase,
  getFlashcards, addFlashcard, removeFlashcard, getDueFlashcards, rateFlashcard, Flashcard,
} from '../phrasebook.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  languages?: Language[];
  onSpeak: (text: string, lang: string) => void;
  translateFn: (text: string, from: string, to: string) => Promise<string>;
  onToast?: (msg: string) => void;
}

type Tab = 'phrases' | 'cards' | 'review' | 'mine';

export const PhrasebookModal: React.FC<Props> = ({
  isOpen, onClose, theme, languages = LANGUAGES, onSpeak, translateFn, onToast,
}) => {
  const [tab, setTab] = useState<Tab>('phrases');
  const [category, setCategory] = useState<PhraseCategory>('greetings');
  const [displayLang, setDisplayLang] = useState('ar');
  const [query, setQuery] = useState('');
  const [userPhrases, setUserPhrases] = useState<UserPhrase[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [due, setDue] = useState<Flashcard[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewDone, setReviewDone] = useState(0);

  // Add-phrase form
  const [srcText, setSrcText] = useState('');
  const [srcLang, setSrcLang] = useState('ar');
  const [tgtLang, setTgtLang] = useState('en');
  const [tgtText, setTgtText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUserPhrases(getUserPhrases());
      setCards(getFlashcards());
      setDue(getDueFlashcards());
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    return BUILTIN_PHRASES.filter((p) => {
      if (p.category !== category) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return Object.values(p.translations).some((t) => t.toLowerCase().includes(q));
    });
  }, [category, query]);

  if (!isOpen) return null;

  const refreshCards = () => {
    setCards(getFlashcards());
    setDue(getDueFlashcards());
  };

  const current = due[0];

  const grade = (remembered: boolean) => {
    if (!current) return;
    rateFlashcard(current.id, remembered);
    setRevealed(false);
    setReviewDone((n) => n + 1);
    refreshCards();
  };

  const saveNewPhrase = async () => {
    if (!srcText.trim()) return;
    setSaving(true);
    let translation = tgtText.trim();
    if (!translation) {
      try {
        translation = await translateFn(srcText, srcLang, tgtLang);
      } catch {
        translation = '';
      }
    }
    const entry = addUserPhrase({ sourceText: srcText.trim(), translatedText: translation, sourceLang: srcLang, targetLang: tgtLang });
    addFlashcard({ front: entry.sourceText, back: entry.translatedText, frontLang: srcLang, backLang: tgtLang });
    setUserPhrases(getUserPhrases());
    refreshCards();
    setSrcText(''); setTgtText('');
    setSaving(false);
    onToast?.('حُفظت العبارة وأُضيفت لبطاقات المراجعة ✓');
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'phrases', label: 'دليل العبارات', icon: <BookOpen size={14} /> },
    { id: 'review', label: `مراجعة ${due.length ? `(${due.length})` : ''}`, icon: <GraduationCap size={14} /> },
    { id: 'cards', label: 'البطاقات', icon: <Layers size={14} /> },
    { id: 'mine', label: 'عباراتي', icon: <BookmarkPlus size={14} /> },
  ];

  return (
    <div className="mt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="دليل العبارات والبطاقات">
      <div className="mt-modal w-full max-w-3xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
              <Brain size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold mt-heading">العبارات والبطاقات الذكية</h2>
              <p className="text-[11px] mt-subtext">بنك جمل يعمل أوفلاين بنظام تكرار متباعد (Leitner) مستوحى من Tatoeba</p>
            </div>
          </div>
          <button onClick={onClose} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto mt-no-scrollbar border-b" style={{ borderColor: 'var(--mt-border)' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setRevealed(false); setReviewDone(0); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[11px] font-extrabold whitespace-nowrap border-b-2"
              style={{
                borderColor: tab === t.id ? 'var(--mt-accent)' : 'transparent',
                color: tab === t.id ? 'var(--mt-accent)' : 'var(--mt-subtext)',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5" style={{ maxHeight: '58vh' }}>
          {/* Phrase bank */}
          {tab === 'phrases' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <select value={displayLang} onChange={(e) => setDisplayLang(e.target.value)} className="mt-input rounded-xl px-2.5 py-2 text-xs font-bold bg-transparent">
                  {languages.map((l) => <option key={l.code} value={l.code}>اعرض بـ: {l.flag} {l.nativeName}</option>)}
                </select>
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 mt-subtext pointer-events-none" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في العبارات..." className="mt-input w-full rounded-xl pr-9 pl-3 py-2 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto mt-no-scrollbar pb-1">
                {PHRASE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className="mt-chip px-3 py-1.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                    style={{
                      borderColor: category === c.id ? 'var(--mt-accent)' : 'var(--mt-border)',
                      background: category === c.id ? 'var(--mt-accent-soft)' : 'transparent',
                      color: category === c.id ? 'var(--mt-accent)' : 'var(--mt-subtext)',
                    }}
                  >
                    {c.nameAr}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {filtered.map((p) => {
                  const text = phraseInLanguage(p, displayLang);
                  return (
                    <div key={p.id} className="mt-surface rounded-2xl border p-3 flex items-start gap-2" style={{ borderColor: 'var(--mt-border)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-relaxed" dir={languages.find((l) => l.code === displayLang)?.rtl ? 'rtl' : 'ltr'}>{text}</p>
                        {displayLang !== 'en' && p.translations.en && (
                          <p className="text-[10px] mt-subtext mt-1" dir="ltr">{p.translations.en}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => onSpeak(text, displayLang)} className="mt-icon-btn p-1.5" title="نطق"><Volume2 size={14} /></button>
                        <button
                          onClick={() => {
                            addFlashcard({ front: phraseInLanguage(p, 'ar'), back: p.translations.en || text, frontLang: 'ar', backLang: 'en' });
                            refreshCards();
                            onToast?.('أُضيفت إلى بطاقات المراجعة ✓');
                          }}
                          className="mt-icon-btn p-1.5" title="بطاقة مراجعة"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review */}
          {tab === 'review' && (
            <div className="space-y-4">
              {current ? (
                <div className="max-w-md mx-auto text-center space-y-4">
                  <div className="text-[11px] font-bold mt-subtext">بطاقة {reviewDone + 1} من {due.length + reviewDone}</div>
                  <div className="mt-modal-shell rounded-3xl p-8">
                    <p className="text-lg font-extrabold leading-relaxed" dir={languages.find((l) => l.code === current.frontLang)?.rtl ? 'rtl' : 'ltr'}>
                      {current.front}
                    </p>
                    {revealed && (
                      <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--mt-border)' }}>
                        <p className="text-base font-bold mt-accent-text" dir={languages.find((l) => l.code === current.backLang)?.rtl ? 'rtl' : 'ltr'}>
                          {current.back}
                        </p>
                        <button onClick={() => onSpeak(current.back, current.backLang)} className="mt-icon-btn p-2 mt-3" title="نطق الترجمة">
                          <Volume2 size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                  {!revealed ? (
                    <button onClick={() => setRevealed(true)} className="mt-btn mt-btn-primary w-full rounded-2xl py-3 text-sm font-extrabold">
                      إظهار الترجمة
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => grade(false)} className="mt-btn mt-btn-danger rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
                        <XCircle size={17} /> لم أتذكر
                      </button>
                      <button onClick={() => grade(true)} className="mt-btn mt-btn-primary rounded-2xl py-3 text-sm font-extrabold flex items-center justify-center gap-2">
                        <Check size={17} /> تذكرت
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--mt-success) 16%, transparent)', color: 'var(--mt-success)' }}>
                    <Brain size={28} />
                  </div>
                  <p className="text-sm font-extrabold">لا مراجعات مستحقة الآن 🎉</p>
                  <p className="text-[11px] mt-subtext">أنجزت {reviewDone} بطاقة في هذه الجلسة. أضف عبارات جديدة من دليل العبارات أو عباراتك.</p>
                  <button onClick={() => setTab('phrases')} className="mt-btn mt-btn-outline rounded-xl px-5 py-2.5 text-xs font-bold">تصفح دليل العبارات</button>
                </div>
              )}
            </div>
          )}

          {/* All cards */}
          {tab === 'cards' && (
            <div className="space-y-2.5">
              {cards.length === 0 && <p className="text-center py-10 text-sm mt-subtext">لا بطاقات بعد — أضف عبارات من دليل العبارات.</p>}
              {cards.map((c) => (
                <div key={c.id} className="mt-surface rounded-2xl border p-3 flex items-center gap-3" style={{ borderColor: 'var(--mt-border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{c.front}</p>
                    <p className="text-[11px] mt-accent-text truncate">{c.back}</p>
                  </div>
                  <span className="mt-badge text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: 'var(--mt-accent-soft)', color: 'var(--mt-accent)' }}>
                    صندوق {c.box}/5
                  </span>
                  <button onClick={() => { removeFlashcard(c.id); refreshCards(); }} className="mt-icon-btn p-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* My phrases */}
          {tab === 'mine' && (
            <div className="space-y-4">
              <div className="mt-modal-shell rounded-2xl p-3.5 space-y-2.5">
                <p className="text-xs font-extrabold flex items-center gap-1.5"><Plus size={14} className="mt-accent-text" /> إضافة عبارة جديدة</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <select value={srcLang} onChange={(e) => setSrcLang(e.target.value)} className="mt-input rounded-xl px-2 py-2 text-xs bg-transparent">
                    {languages.map((l) => <option key={l.code} value={l.code}>من: {l.nativeName}</option>)}
                  </select>
                  <select value={tgtLang} onChange={(e) => setTgtLang(e.target.value)} className="mt-input rounded-xl px-2 py-2 text-xs bg-transparent">
                    {languages.map((l) => <option key={l.code} value={l.code}>إلى: {l.nativeName}</option>)}
                  </select>
                </div>
                <input value={srcText} onChange={(e) => setSrcText(e.target.value)} placeholder="النص الأصلي..." className="mt-input w-full rounded-xl px-3 py-2 text-xs" />
                <div className="flex gap-2">
                  <input value={tgtText} onChange={(e) => setTgtText(e.target.value)} placeholder="الترجمة (تُملأ تلقائياً إن تُركت فارغة)" className="mt-input flex-1 rounded-xl px-3 py-2 text-xs" />
                  <button onClick={saveNewPhrase} disabled={!srcText.trim() || saving} className="mt-btn mt-btn-primary rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5">
                    {saving ? <RotateCcw size={13} className="animate-spin" /> : <BookmarkPlus size={14} />} حفظ
                  </button>
                </div>
              </div>
              {userPhrases.length === 0 && <p className="text-center py-8 text-sm mt-subtext">لم تحفظ أي عبارة خاصة بعد.</p>}
              {userPhrases.map((p) => (
                <div key={p.id} className="mt-surface rounded-2xl border p-3 flex items-center gap-3" style={{ borderColor: 'var(--mt-border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.sourceText}</p>
                    <p className="text-[11px] mt-accent-text truncate">{p.translatedText}</p>
                  </div>
                  <button onClick={() => onSpeak(p.sourceText, p.sourceLang)} className="mt-icon-btn p-1.5"><Volume2 size={14} /></button>
                  <button onClick={() => { removeUserPhrase(p.id); setUserPhrases(getUserPhrases()); }} className="mt-icon-btn p-1.5"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
