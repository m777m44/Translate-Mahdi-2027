import React, { useState, useRef } from 'react';
import { 
  Volume2, 
  Copy, 
  Star, 
  Share2, 
  Maximize2, 
  Sparkles, 
  Check, 
  X, 
  Pen, 
  Mic, 
  MicOff, 
  Clipboard, 
  SlidersHorizontal, 
  BrainCircuit, 
  Scale, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Edit3 
} from 'lucide-react';
import { 
  ThemeConfig, 
  MoreTranslation, 
  WordDefinition, 
  DomainCode, 
  ToneCode, 
  DialectCode 
} from '../types.ts';
import { DOMAINS, TONES, DIALECTS } from '../constants.ts';

interface AdvancedTwoBoxLayoutProps {
  inputText: string;
  resultText: string;
  sourceLang: string;
  targetLang: string;
  sourceLangName: string;
  targetLangName: string;
  detectedLangBanner?: string;
  transliteration?: string;
  moreTranslations?: MoreTranslation[];
  definitions?: WordDefinition[];
  isLoading?: boolean;
  isFavorite?: boolean;
  isListening?: boolean;
  selectedDomain: DomainCode;
  selectedTone: ToneCode;
  selectedDialect: DialectCode;
  sourceBoxFontSize: number;
  isSourceRTL?: boolean;
  isTargetRTL?: boolean;
  theme: ThemeConfig;
  onSourceTextChange: (newText: string) => void;
  onClear: () => void;
  onPaste: () => void;
  onToggleListening: () => void;
  onOpenHandwriting: () => void;
  onSpeakSource: () => void;
  onSpeakTarget: () => void;
  onCopySource: () => void;
  onCopyTarget: () => void;
  onToggleFavorite: () => void;
  onOpenZoom: () => void;
  onShare: () => void;
  onOpenAIAnalysis: () => void;
  onOpenCompareEngines: () => void;
  onChangeDomain: (domain: DomainCode) => void;
  onChangeTone: (tone: ToneCode) => void;
  onChangeDialect: (dialect: DialectCode) => void;
  onSelectAlternative?: (alt: string) => void;
  onSelectSynonym?: (syn: string) => void;
  onShowToast: (msg: string) => void;
}

export const AdvancedTwoBoxLayout: React.FC<AdvancedTwoBoxLayoutProps> = ({
  inputText,
  resultText,
  sourceLang,
  targetLang,
  sourceLangName,
  targetLangName,
  detectedLangBanner,
  transliteration,
  moreTranslations = [],
  definitions = [],
  isLoading = false,
  isFavorite = false,
  isListening = false,
  selectedDomain,
  selectedTone,
  selectedDialect,
  sourceBoxFontSize,
  isSourceRTL = true,
  isTargetRTL = true,
  theme,
  onSourceTextChange,
  onClear,
  onPaste,
  onToggleListening,
  onOpenHandwriting,
  onSpeakSource,
  onSpeakTarget,
  onCopySource,
  onCopyTarget,
  onToggleFavorite,
  onOpenZoom,
  onShare,
  onOpenAIAnalysis,
  onOpenCompareEngines,
  onChangeDomain,
  onChangeTone,
  onChangeDialect,
  onSelectAlternative,
  onSelectSynonym,
  onShowToast,
}) => {
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [customTargetText, setCustomTargetText] = useState('');
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [showOptionsBar, setShowOptionsBar] = useState(false);
  const [expandMore, setExpandMore] = useState(true);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const handleCopySourceClick = () => {
    onCopySource();
    setCopiedSource(true);
    setTimeout(() => setCopiedSource(false), 1800);
  };

  const handleCopyTargetClick = () => {
    onCopyTarget();
    setCopiedTarget(true);
    setTimeout(() => setCopiedTarget(false), 1800);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Quick Domain & Style Bar Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full mt-accent-soft mt-accent-text border mt-hairline flex items-center gap-1">
            <Sparkles size={12} />
            <span>الوضع المتقدم (شاشتان متزامنتان)</span>
          </span>
          {detectedLangBanner && (
            <span className="text-[11px] font-semibold opacity-70 px-2 py-0.5 rounded-full mt-accent-soft mt-accent-text border border-blue-500/20">
              {detectedLangBanner}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowOptionsBar(!showOptionsBar)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
            showOptionsBar 
              ? 'mt-btn-primary border-amber-400 shadow-sm' 
              : 'mt-surface-soft  mt-hairline  hover:border-[var(--mt-border-strong)]'
          }`}
          title="خيارات المجال والنبرة واللهجة"
        >
          <SlidersHorizontal size={13} />
          <span>المجال والنبرة</span>
          {showOptionsBar ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Domain, Tone & Dialect Collapsible Bar */}
      {showOptionsBar && (
        <div className="p-3 rounded-2xl mt-surface-soft border mt-hairline animate-in fade-in slide-in-from-top-2 duration-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-bold opacity-60 mb-1">مجال الترجمة:</label>
            <select
              value={selectedDomain}
              onChange={(e) => onChangeDomain(e.target.value as DomainCode)}
              className="w-full px-2.5 py-1.5 rounded-xl mt-surface-soft border mt-hairline text-xs font-semibold focus:outline-none focus:border-[var(--mt-accent)]"
            >
              {DOMAINS.map(d => (
                <option key={d.code} value={d.code}>
                  {d.icon ? `${d.icon} — ` : ''}{d.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold opacity-60 mb-1">نبرة الأسلوب:</label>
            <select
              value={selectedTone}
              onChange={(e) => onChangeTone(e.target.value as ToneCode)}
              className="w-full px-2.5 py-1.5 rounded-xl mt-surface-soft border mt-hairline text-xs font-semibold focus:outline-none focus:border-[var(--mt-accent)]"
            >
              {TONES.map(t => (
                <option key={t.code} value={t.code}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold opacity-60 mb-1">اللهجة المخصصة:</label>
            <select
              value={selectedDialect}
              onChange={(e) => onChangeDialect(e.target.value as DialectCode)}
              className="w-full px-2.5 py-1.5 rounded-xl mt-surface-soft border mt-hairline text-xs font-semibold focus:outline-none focus:border-[var(--mt-accent)]"
            >
              {DIALECTS.map(dial => (
                <option key={dial.code} value={dial.code} className="mt-surface-soft">
                  {dial.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* DUAL PANELS CONTAINER (Side by side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 flex-1">
        
        {/* BOX 1: SOURCE TEXT INPUT BOX */}
        <div className={`rounded-3xl p-4 sm:p-5 border shadow-xl flex flex-col justify-between transition-all min-h-[260px] md:min-h-[340px] ${theme.card} ${theme.border}`}>
          {/* Box 1 Header */}
          <div className="flex items-center justify-between pb-2 border-b mt-hairline">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold mt-accent-text">
                {sourceLangName}
              </span>
              <span className="text-[10px] opacity-50 font-mono">
                {charCount} حرف / {wordCount} كلمة
              </span>
            </div>

            {/* Box 1 Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onPaste}
                className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] transition-all"
                title="لصق النص"
              >
                <Clipboard size={15} />
              </button>
              <button
                onClick={onOpenHandwriting}
                className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] transition-all"
                title="الكتابة بخط اليد"
              >
                <Pen size={15} />
              </button>
              <button
                onClick={onToggleListening}
                className={`p-1.5 rounded-full transition-all ${
                  isListening ? 'bg-[var(--mt-danger)]  animate-pulse' : 'hover:bg-[var(--mt-surface)]  '
                }`}
                title="إملاء صوتي"
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              {inputText && (
                <button
                  onClick={onClear}
                  className="p-1.5 rounded-full hover:bg-red-500/20 mt-subtext hover:text-[var(--mt-danger)] transition-all"
                  title="مسح النص بالكامل"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Continuous Textarea (Never unmounts, unlimited fluid typing) */}
          <div className="relative flex-1 my-2">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => onSourceTextChange(e.target.value)}
              placeholder="اكتب هنا بحرية تامة... الترجمة فورية ودقيقة..."
              style={{
                fontSize: `${sourceBoxFontSize}px`,
                direction: isSourceRTL ? 'rtl' : 'ltr',
              }}
              className="w-full h-full min-h-[160px] bg-transparent resize-none focus:outline-none placeholder:opacity-30 leading-relaxed custom-scrollbar font-medium"
            />
          </div>

          {/* Box 1 Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t mt-hairline text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopySourceClick}
                disabled={!inputText.trim()}
                className={`p-1.5 rounded-xl transition-all disabled:opacity-30 ${
                  copiedSource ? 'mt-accent-soft mt-accent-text' : 'hover:bg-[var(--mt-surface)]  '
                }`}
                title="نسخ النص الأصلي"
              >
                {copiedSource ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={onSpeakSource}
                disabled={!inputText.trim()}
                className="p-1.5 rounded-xl hover:bg-[var(--mt-surface)] transition-all disabled:opacity-30"
                title="استماع للنص الأصلي"
              >
                <Volume2 size={14} />
              </button>
            </div>

            <span className="text-[10px] opacity-40">Mahdi Translate Pro</span>
          </div>
        </div>

        {/* BOX 2: TARGET TRANSLATION OUTPUT BOX */}
        <div className={`rounded-3xl p-4 sm:p-5 border shadow-xl flex flex-col justify-between transition-all min-h-[260px] md:min-h-[340px] ${theme.card} ${theme.border}`}>
          {/* Box 2 Header */}
          <div className="flex items-center justify-between pb-2 border-b mt-hairline">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold mt-accent-text">
                {targetLangName}
              </span>
              {isLoading ? (
                <span className="text-[10px] mt-accent-text flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>يترجم الآن...</span>
                </span>
              ) : (
                <span className="text-[10px] opacity-50">جاهز</span>
              )}
            </div>

            {/* Box 2 Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenCompareEngines}
                className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] transition-all"
                title="مقارنة المحركات (Google vs Gemini vs DeepL)"
              >
                <Scale size={15} />
              </button>
              <button
                onClick={onOpenAIAnalysis}
                className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] transition-all"
                title="التحليل اللغوي الذكي وتصحيح القواعد"
              >
                <BrainCircuit size={15} />
              </button>
              <button
                onClick={onOpenZoom}
                disabled={!resultText}
                className="p-1.5 rounded-full hover:bg-[var(--mt-surface)] transition-all disabled:opacity-30"
                title="تكبير ملء الشاشة"
              >
                <Maximize2 size={15} />
              </button>
              <button
                onClick={onToggleFavorite}
                disabled={!resultText}
                className={`p-1.5 rounded-full transition-all disabled:opacity-30 ${
                  isFavorite ? 'mt-accent-text fill-[var(--mt-accent)] mt-accent-soft' : 'hover:bg-[var(--mt-surface)]  '
                }`}
                title={isFavorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              >
                <Star size={15} className={isFavorite ? 'fill-[var(--mt-accent)]' : ''} />
              </button>
            </div>
          </div>

          {/* Box 2 Translation Result Display */}
          <div className="relative flex-1 my-2 flex flex-col justify-start">
            {isEditingTarget ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={customTargetText || resultText}
                  onChange={(e) => setCustomTargetText(e.target.value)}
                  className="w-full p-2.5 rounded-2xl mt-surface-soft text-base font-bold border mt-hairline focus:outline-none focus:border-[var(--mt-accent)]"
                  rows={4}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="px-2.5 py-1 rounded-xl mt-surface-soft text-xs font-bold mt-subtext hover:bg-[var(--mt-surface)]"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTarget(false);
                      onShowToast('تم حفظ التعديل اليدوي للترجمة');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 text-xs font-bold hover:bg-amber-400"
                  >
                    تطبيق
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div 
                  onClick={() => resultText && setIsEditingTarget(true)}
                  style={{
                    fontSize: `${sourceBoxFontSize}px`,
                    direction: isTargetRTL ? 'rtl' : 'ltr',
                  }}
                  className={`leading-relaxed font-bold break-words select-text ${
                    resultText ? ' cursor-pointer hover:opacity-90' : 'opacity-30 select-none'
                  }`}
                  title={resultText ? 'انقر لتعديل الترجمة يدوياً' : ''}
                >
                  {resultText || (isLoading ? 'جاري تحضير الترجمة الفورية...' : 'ستظهر الترجمة هنا فورياً...')}
                </div>

                {/* Transliteration */}
                {transliteration && (
                  <div className="text-xs font-normal mt-subtext tracking-wider mt-1">
                    {transliteration}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Box 2 Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t mt-hairline text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyTargetClick}
                disabled={!resultText}
                className={`p-1.5 rounded-xl transition-all disabled:opacity-30 ${
                  copiedTarget ? 'mt-accent-soft mt-accent-text' : 'hover:bg-[var(--mt-surface)]  '
                }`}
                title="نسخ الترجمة"
              >
                {copiedTarget ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={onSpeakTarget}
                disabled={!resultText}
                className="p-1.5 rounded-xl hover:bg-[var(--mt-surface)] transition-all disabled:opacity-30"
                title="استماع إلى الترجمة"
              >
                <Volume2 size={14} />
              </button>
              <button
                onClick={onShare}
                disabled={!resultText}
                className="p-1.5 rounded-xl hover:bg-[var(--mt-surface)] transition-all disabled:opacity-30"
                title="مشاركة الترجمة"
              >
                <Share2 size={14} />
              </button>
            </div>

            <button
              onClick={() => setIsEditingTarget(!isEditingTarget)}
              disabled={!resultText}
              className="text-[11px] opacity-60 hover:opacity-100 flex items-center gap-1 disabled:opacity-30"
            >
              <Edit3 size={12} />
              <span>تعديل يدوي</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECONDARY DICTIONARY & ALTERNATIVES SECTION (If available) */}
      {(moreTranslations.length > 0 || definitions.length > 0) && (
        <div className={`p-4 rounded-3xl border ${theme.card} ${theme.border} shadow-lg text-xs space-y-3`}>
          <div className="flex items-center justify-between border-b mt-hairline pb-2">
            <span className="font-bold flex items-center gap-1.5 mt-accent-text">
              <BookOpen size={15} />
              <span>قاموس الكلمات والترجمات البديلة</span>
            </span>
            <button
              onClick={() => setExpandMore(!expandMore)}
              className="p-1 mt-subtext hover:text-[var(--mt-text)]"
            >
              {expandMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {expandMore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* More Translations Table */}
              {moreTranslations.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[11px] opacity-70">ترجمات أخرى محتملة:</span>
                  <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {moreTranslations.map((alt, idx) => (
                      <div 
                        key={idx}
                        onClick={() => onSelectAlternative && onSelectAlternative(alt.text)}
                        className="p-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-accent-soft)] cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <span className="font-semibold">{alt.text}</span>
                        <span className="text-[10px] opacity-50">{alt.meaning || alt.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Definitions and Synonyms */}
              {definitions.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-[11px] opacity-70">تعريفات ومرادفات الكلمة:</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {definitions.map((def, idx) => (
                      <div key={idx} className="p-2 rounded-xl mt-surface-soft border mt-hairline space-y-1">
                        <div className="text-[11px] font-medium">{def.definition}</div>
                        {def.synonyms && def.synonyms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {def.synonyms.map((syn, sIdx) => (
                              <span 
                                key={sIdx}
                                onClick={() => onSelectSynonym && onSelectSynonym(syn)}
                                className="px-2 py-0.5 rounded-full mt-accent-soft mt-accent-text hover:bg-[var(--mt-primary)] hover:text-[var(--mt-on-primary)] cursor-pointer text-[10px] font-medium transition-colors"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
