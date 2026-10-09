import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Volume2,
  Copy,
  Star,
  Share2,
  Maximize2,
  MoreVertical,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  Check,
  X,
  Pen,
  ArrowRight,
  Edit3,
  ClipboardPaste,
  Undo2,
} from 'lucide-react';
import { MoreTranslation, WordDefinition, ThemeConfig } from '../types.ts';
import { useTheme } from '../themeContext.tsx';

interface GoogleTranslateResultViewProps {
  sourceText: string;
  sourceLangName: string;
  targetLangName: string;
  translatedText: string;
  transliteration?: string;
  detectedLangName?: string;
  moreTranslations?: MoreTranslation[];
  definitions?: WordDefinition[];
  isFavorite: boolean;
  isLoading?: boolean;
  onSourceTextChange: (newText: string) => void;
  onToggleFavorite: () => void;
  onSpeakSource: () => void;
  onSpeakTarget: () => void;
  onCopySource: () => void;
  onCopyTarget: () => void;
  onClear: () => void;
  onSelectAlternative?: (text: string) => void;
  onSelectSynonym?: (synonym: string) => void;
  onOpenZoom?: () => void;
  onShowToast: (msg: string) => void;
  theme?: ThemeConfig;
  /** Saves a manual edit of the translation back into the app state. */
  onCommitTranslation?: (text: string) => void;
  onPaste?: () => void;
  onSpeakTransliteration?: () => void;
}

/** Arabic (and other RTL scripts) detection used for automatic text direction. */
const RTL_PATTERN = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const detectDir = (text: string): 'rtl' | 'ltr' => (RTL_PATTERN.test(text) ? 'rtl' : 'ltr');

export const GoogleTranslateResultView: React.FC<GoogleTranslateResultViewProps> = ({
  sourceText,
  sourceLangName,
  targetLangName,
  translatedText,
  transliteration,
  detectedLangName,
  moreTranslations = [],
  definitions = [],
  isFavorite,
  isLoading = false,
  onSourceTextChange,
  onToggleFavorite,
  onSpeakSource,
  onSpeakTarget,
  onCopySource,
  onCopyTarget,
  onClear,
  onSelectAlternative,
  onSelectSynonym,
  onOpenZoom,
  onShowToast,
  onCommitTranslation,
  onPaste,
}) => {
  const { theme } = useTheme();
  const [expandAllMore, setExpandAllMore] = useState(true);
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [activeSynonymIndex, setActiveSynonymIndex] = useState<number | null>(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [customTargetText, setCustomTargetText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const shownTranslation = customTargetText || translatedText;
  const sourceDir = useMemo(() => detectDir(sourceText), [sourceText]);
  const targetDir = useMemo(() => detectDir(shownTranslation), [shownTranslation]);

  // Auto-grow the source textarea so nothing is ever hidden behind a scrollbar.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(64, Math.min(el.scrollHeight, 420))}px`;
  }, [sourceText]);

  // Close the floating options menu on outside click / Escape.
  useEffect(() => {
    if (!showOptionsMenu) return;
    const onDown = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) setShowOptionsMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOptionsMenu(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showOptionsMenu]);

  // Reset a manual edit whenever a brand new translation arrives.
  useEffect(() => {
    setCustomTargetText('');
  }, [translatedText]);

  const toggleIndex = (idx: number) => {
    setExpandedIndices(prev => ({ ...prev, [idx]: prev[idx] !== undefined ? !prev[idx] : false }));
  };

  const toggleSynonyms = (defIdx: number) => {
    setActiveSynonymIndex(prev => (prev === defIdx ? null : defIdx));
  };

  const handleCopyTargetClick = () => {
    onCopyTarget();
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 2000);
  };

  const handleCopySourceClick = () => {
    onCopySource();
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 2000);
  };

  const handleFeedbackClick = () => {
    setShowOptionsMenu(false);
    onShowToast('شكراً لملاحظتك! تم إرسالها لتحسين دقة الترجمة.');
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ترجمة مهدي', text: `${sourceText}\n\n${shownTranslation}` });
      } catch {
        /* user cancelled */
      }
    } else {
      onCopyTarget();
      onShowToast('تم نسخ نص الترجمة للمشاركة ✓');
    }
    setShowOptionsMenu(false);
  };

  const focusInput = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 30);
  };

  const commitEdit = () => {
    const next = customTargetText.trim();
    setIsEditingTarget(false);
    if (!next) {
      setCustomTargetText('');
      return;
    }
    if (onCommitTranslation) onCommitTranslation(next);
    onShowToast('تم حفظ التعديل اليدوي للترجمة ✓');
  };

  const displaySourceLangTag = detectedLangName ? `${detectedLangName} — تم رصدها` : sourceLangName;
  const hasResult = Boolean(shownTranslation.trim());

  return (
    <div className="w-full flex flex-col gap-4 text-right select-text" dir="rtl">
      {/* ============ 1. SOURCE — transparent glass box ============ */}
      <section
        className="mt-glass overflow-hidden p-4 sm:p-5 flex flex-col gap-2"
        style={isFocused ? { borderColor: 'var(--mt-border-strong)' } : undefined}
        aria-label="مربع النص الأصلي"
      >
        {/* Top controls */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1">
            <button onClick={focusInput} className="mt-icon-btn p-2" title="تعديل النص مباشرة" aria-label="تعديل النص">
              <Pen size={18} />
            </button>
            {onPaste && (
              <button onClick={onPaste} className="mt-icon-btn p-2" title="لصق من الحافظة" aria-label="لصق">
                <ClipboardPaste size={18} />
              </button>
            )}
            <button
              onClick={onClear}
              className="mt-icon-btn p-2 hover:!text-[var(--mt-danger)]"
              title="مسح النص والبدء من جديد"
              aria-label="مسح النص"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="mt-subtext text-[10px] font-mono tabular-nums opacity-70">
              {sourceText.length > 0
                ? `${sourceText.trim().split(/\s+/).filter(Boolean).length} كلمة · ${sourceText.length} حرف`
                : ''}
            </span>
            <button onClick={focusInput} className="mt-icon-btn p-2 rotate-180" title="متابعة الإدخال" aria-label="متابعة الإدخال">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Live editable textarea */}
        <textarea
          ref={inputRef}
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="اكتب أو الصق أي نص… وستُترجم فوراً"
          rows={1}
          className="mt-plain-input text-2xl sm:text-3xl font-bold tracking-wide leading-snug mt-heading"
          style={{ direction: sourceDir }}
          aria-label="النص الأصلي"
        />

        {/* Themed live progress line */}
        <div className="mt-progress-track my-1" style={{ height: '3px' }}>
          <div
            className="mt-progress-bar"
            style={{ width: isLoading ? '100%' : hasResult ? '100%' : '18%', opacity: isLoading ? 0.85 : hasResult ? 1 : 0.4 }}
          />
        </div>

        {/* Language tag + source actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="mt-chip">{displaySourceLangTag}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopySourceClick}
              className={`mt-icon-btn p-2 ${copiedSource ? 'mt-success-text' : ''}`}
              title="نسخ النص الأصلي"
              aria-label="نسخ النص الأصلي"
            >
              {copiedSource ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button onClick={onSpeakSource} className="mt-icon-btn p-2" title="استماع إلى النص الأصلي" aria-label="استماع للنص الأصلي">
              <Volume2 size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ============ 2. TARGET — transparent glass box ============ */}
      {Boolean(sourceText.trim() || translatedText.trim()) && (
        <section className="mt-glass mt-slide-up overflow-hidden p-4 sm:p-5 flex flex-col gap-2" aria-label="مربع الترجمة">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="mt-badge">{targetLangName}</span>
              {isLoading && <span className="mt-spinner w-3.5 h-3.5" aria-label="جاري الترجمة" />}
            </div>
            <button
              onClick={() => {
                setCustomTargetText(shownTranslation);
                setIsEditingTarget(!isEditingTarget);
              }}
              className="mt-icon-btn px-2 py-1 gap-1 text-[11px]"
              title="تعديل الترجمة يدوياً"
            >
              <Edit3 size={13} />
              <span>تعديل</span>
            </button>
          </div>

          {isEditingTarget ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={customTargetText}
                onChange={(e) => setCustomTargetText(e.target.value)}
                className="mt-textarea p-3 text-xl font-bold leading-relaxed"
                style={{ direction: targetDir }}
                rows={3}
                autoFocus
                aria-label="تعديل الترجمة"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditingTarget(false);
                    setCustomTargetText('');
                  }}
                  className="mt-btn px-3 py-1.5 text-xs"
                >
                  <Undo2 size={13} />
                  إلغاء
                </button>
                <button onClick={commitEdit} className="mt-btn mt-btn-primary px-4 py-1.5 text-xs">
                  <Check size={14} />
                  تطبيق
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setCustomTargetText(shownTranslation);
                setIsEditingTarget(true);
              }}
              className="text-2xl sm:text-4xl font-extrabold tracking-wide leading-relaxed break-words cursor-text hover:opacity-90 transition-opacity mt-heading"
              style={{ direction: targetDir, color: 'var(--mt-text)' }}
              title="انقر لتعديل الترجمة أو تحديد كلمات"
            >
              {shownTranslation || (isLoading ? 'جاري الترجمة…' : '')}
            </div>
          )}

          {transliteration && (
            <div className="text-sm font-normal tracking-wider mt-subtext" style={{ direction: 'ltr', textAlign: 'left' }}>
              {transliteration}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--mt-border)' }}>
            <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="mt-icon-btn p-2"
                data-active={showOptionsMenu}
                title="مزيد من الخيارات"
                aria-label="مزيد من الخيارات"
              >
                <MoreVertical size={19} />
              </button>

              {showOptionsMenu && (
                <div className="mt-elevated absolute right-0 bottom-full mb-2 w-52 p-1.5 z-30 text-xs space-y-1 mt-slide-up">
                  <button onClick={handleShareClick} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--mt-surface)] transition-colors">
                    <Share2 size={15} />
                    <span>مشاركة الترجمة</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      handleCopyTargetClick();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--mt-surface)] transition-colors"
                  >
                    <Copy size={15} />
                    <span>نسخ الترجمة</span>
                  </button>
                  <button onClick={handleFeedbackClick} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--mt-surface)] transition-colors">
                    <ThumbsDown size={15} />
                    <span>إرسال ملاحظة</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {onOpenZoom && (
                <button onClick={onOpenZoom} className="mt-icon-btn p-2" title="عرض مكبّر بملء الشاشة" aria-label="تكبير">
                  <Maximize2 size={19} />
                </button>
              )}

              <button
                onClick={onToggleFavorite}
                className="mt-icon-btn p-2"
                data-active={isFavorite}
                title={isFavorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                aria-label="المفضلة"
              >
                <Star size={19} className={isFavorite ? 'fill-[var(--mt-accent)]' : ''} />
              </button>

              <button
                onClick={handleCopyTargetClick}
                className={`mt-icon-btn p-2 ${copiedTarget ? 'mt-success-text' : ''}`}
                title="نسخ الترجمة"
                aria-label="نسخ الترجمة"
              >
                {copiedTarget ? <Check size={19} /> : <Copy size={19} />}
              </button>

              <button onClick={onSpeakTarget} className="mt-icon-btn p-2" title="استماع إلى الترجمة" aria-label="استماع للترجمة">
                <Volume2 size={20} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============ 3. More translations ============ */}
      {moreTranslations.length > 0 && (
        <section className="mt-glass overflow-hidden" style={{ borderRadius: 'var(--mt-radius)' }} aria-label="ترجمات أكثر">
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--mt-border)' }}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <BookOpen size={16} className="mt-accent-text" />
              <span>ترجمات أكثر</span>
            </div>
            <button onClick={() => setExpandAllMore(!expandAllMore)} className="mt-chip" data-active={!expandAllMore}>
              {expandAllMore ? 'طي الكل' : 'توسيع الكل'}
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--mt-border)' }}>
            {moreTranslations.map((item, idx) => {
              const isExpanded = expandedIndices[idx] !== undefined ? expandedIndices[idx] : expandAllMore;
              return (
                <div key={idx} className="p-3.5 hover:bg-[var(--mt-surface)] transition-colors" style={{ borderColor: 'var(--mt-border)' }}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleIndex(idx)}>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectAlternative) {
                            onSelectAlternative(item.phrase);
                          } else {
                            setCustomTargetText(item.phrase);
                            onShowToast(`تم اختيار الترجمة: ${item.phrase}`);
                          }
                        }}
                        className="text-base font-bold hover:text-[var(--mt-accent)] transition-colors text-right"
                        title="انقر لاعتماد هذه الترجمة"
                      >
                        {item.phrase}
                      </button>
                      {item.partOfSpeech && <span className="mt-badge">{item.partOfSpeech}</span>}
                    </div>
                    <button className="mt-icon-btn p-1" aria-label={isExpanded ? 'طي' : 'توسيع'}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && item.reverseTranslations?.length > 0 && (
                    <div className="mt-2 text-xs font-mono tracking-wide flex flex-wrap gap-1.5 pr-1 mt-subtext">
                      {item.reverseTranslations.map((rev, rIdx) => (
                        <button
                          key={rIdx}
                          onClick={() => onSelectSynonym?.(rev)}
                          className="hover:text-[var(--mt-accent)] hover:underline cursor-pointer"
                          title="انقر لترجمة هذه الكلمة العكسية"
                        >
                          {rev}{rIdx < item.reverseTranslations.length - 1 ? '،' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ 4. Definitions & synonyms ============ */}
      {definitions.length > 0 && (
        <section className="mt-glass overflow-hidden" style={{ borderRadius: 'var(--mt-radius)' }} aria-label="التعريفات والمرادفات">
          <div className="p-4 border-b" style={{ borderColor: 'var(--mt-border)' }}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Sparkles size={16} className="mt-accent-text" />
              <span>تعريفات «{sourceText.slice(0, 40)}{sourceText.length > 40 ? '…' : ''}»</span>
            </div>
          </div>

          <div className="p-4 space-y-5">
            {definitions.map((def, idx) => (
              <div key={idx} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold mt-accent-text">{def.partOfSpeech}</span>
                    {def.number > 0 && <span className="mt-badge">{def.number}</span>}
                  </div>

                  {def.synonyms && def.synonyms.length > 0 && (
                    <button onClick={() => toggleSynonyms(idx)} className="mt-chip" data-active={activeSynonymIndex === idx}>
                      <span>المرادفات ({def.synonyms.length})</span>
                      <ChevronDown size={13} className={`transition-transform duration-200 ${activeSynonymIndex === idx ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm leading-relaxed pr-1 mt-subtext" style={{ direction: detectDir(def.definition) }}>
                  {def.definition}
                </p>

                {def.example && (
                  <div className="text-xs italic border-r-2 pr-2 my-1 mt-subtext" style={{ borderColor: 'var(--mt-border-strong)', direction: detectDir(def.example) }}>
                    {def.example}
                  </div>
                )}

                {def.synonyms && def.synonyms.length > 0 && activeSynonymIndex === idx && (
                  <div className="mt-3 pt-2 flex flex-wrap gap-2 justify-start" style={{ direction: 'ltr' }}>
                    {def.synonyms.map((syn, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => {
                          if (onSelectSynonym) onSelectSynonym(syn);
                          else onSourceTextChange(syn);
                          onShowToast(`تم اختيار المرادف: ${syn}`);
                        }}
                        className="mt-chip hover:scale-105 active:scale-95 transition-transform"
                        title={`انقر لترجمة: ${syn}`}
                      >
                        {syn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signature line — subtle, themed */}
      {hasResult && (
        <div className="flex items-center justify-center gap-2 text-[10px] opacity-45 select-none">
          <Sparkles size={11} className="mt-accent-text" />
          <span>{theme.nameAr}</span>
        </div>
      )}
    </div>
  );
};
