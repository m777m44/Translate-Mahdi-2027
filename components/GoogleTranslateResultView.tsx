import React, { useState, useRef, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { MoreTranslation, WordDefinition, ThemeConfig } from '../types.ts';

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
  theme: ThemeConfig;
}

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
  theme,
}) => {
  const [expandAllMore, setExpandAllMore] = useState(true);
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [activeSynonymIndex, setActiveSynonymIndex] = useState<number | null>(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState(false);
  const [copiedSource, setCopiedSource] = useState(false);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [customTargetText, setCustomTargetText] = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const toggleIndex = (idx: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [idx]: prev[idx] !== undefined ? !prev[idx] : false
    }));
  };

  const toggleSynonyms = (defIdx: number) => {
    setActiveSynonymIndex(prev => prev === defIdx ? null : defIdx);
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
    setFeedbackSubmitted(true);
    onShowToast('شكراً لملاحظتك! سنعمل على تحسين دقة الترجمة.');
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ترجمة',
          text: `${sourceText}\n\n${translatedText}`
        });
      } catch {
        // Cancelled
      }
    } else {
      onCopyTarget();
      onShowToast('تم نسخ نص الترجمة للمشاركة ✓');
    }
    setShowOptionsMenu(false);
  };

  // Focus input automatically when requested
  const focusInput = () => {
    setIsEditingSource(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  const displaySourceLangTag = detectedLangName || `${sourceLangName}، تم رصدها`;

  return (
    <div className="w-full flex flex-col gap-4 text-right select-text" dir="rtl">
      
      {/* 1. TOP EDITABLE INPUT CARD (Matches the video at 00:03 - 00:15) */}
      <div className="rounded-3xl bg-zinc-900/95 border border-white/10 shadow-2xl overflow-hidden p-4 sm:p-5 flex flex-col gap-2">
        {/* Top Controls: Pencil, Clear X, Forward Arrow */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1">
            <button
              onClick={focusInput}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="تعديل النص مباشرة"
            >
              <Pen size={18} />
            </button>
            <button
              onClick={onClear}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
              title="مسح النص والبدء من جديد"
            >
              <X size={20} />
            </button>
          </div>

          <button
            onClick={focusInput}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-amber-400 transition-colors rotate-180"
            title="متابعة الإدخال"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        {/* The Live Editable Textarea (User can click on any word, move cursor, type and translate instantly) */}
        <div className="relative w-full">
          <textarea
            ref={inputRef}
            value={sourceText}
            onChange={(e) => onSourceTextChange(e.target.value)}
            placeholder="اكتب هنا..."
            rows={Math.min(5, Math.max(1, sourceText.split('\n').length))}
            className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white tracking-wide resize-none focus:outline-none placeholder:opacity-30 leading-snug"
            style={{ direction: /[\u0600-\u06FF]/.test(sourceText) ? 'rtl' : 'ltr' }}
          />
        </div>

        {/* Animated Blue Progress Line (Matches Google Translate in video 00:04) */}
        <div className="relative w-full h-[2.5px] bg-zinc-800 rounded-full overflow-hidden my-1">
          <div 
            className={`absolute top-0 bottom-0 bg-blue-500 rounded-full transition-all duration-300 ${
              isLoading ? 'w-full animate-pulse' : 'w-full'
            }`} 
          />
        </div>

        {/* Source Language Tag & Source Audio/Copy Bar */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-3 py-1 rounded-full border border-white/5">
            {displaySourceLangTag}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopySourceClick}
              className={`p-2 rounded-full transition-colors ${copiedSource ? 'text-emerald-400 bg-emerald-500/15' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
              title="نسخ النص الأصلي"
            >
              {copiedSource ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button
              onClick={onSpeakSource}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="استماع إلى النص الأصلي"
            >
              <Volume2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. TARGET TRANSLATION CARD (Appears seamlessly when sourceText or translatedText is present) */}
      {Boolean(sourceText.trim() || translatedText.trim()) && (
      <div className="rounded-3xl bg-zinc-900/90 border border-white/10 shadow-xl overflow-hidden p-4 sm:p-5 flex flex-col gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-400">
            {targetLangName}
          </span>
          <button
            onClick={() => setIsEditingTarget(!isEditingTarget)}
            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
            title="تعديل الترجمة يدوياً"
          >
            <Edit3 size={13} />
            <span>تعديل</span>
          </button>
        </div>

        {/* Primary Translation Big Text (Interactive: click to edit or copy) */}
        {isEditingTarget ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={customTargetText || translatedText}
              onChange={(e) => setCustomTargetText(e.target.value)}
              className="w-full p-2.5 rounded-2xl bg-zinc-800 text-xl font-bold text-white border border-white/20 focus:outline-none focus:border-amber-400"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingTarget(false)}
                className="px-3 py-1 rounded-xl bg-white/10 text-xs font-bold text-zinc-300 hover:bg-white/20"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setIsEditingTarget(false);
                  onShowToast('تم حفظ التعديل اليدوي للترجمة');
                }}
                className="px-3 py-1 rounded-xl bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-400"
              >
                تطبيق
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditingTarget(true)}
            className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide leading-relaxed break-words cursor-pointer hover:opacity-90 transition-opacity"
            title="انقر لتعديل الترجمة أو تحديد كلمات"
          >
            {customTargetText || translatedText || (isLoading ? 'جاري الترجمة...' : '')}
          </div>
        )}

        {/* Transliteration Romanization (e.g. 'abtal, 'ahmad, lawn) */}
        {transliteration && (
          <div className="text-sm font-normal text-zinc-400 tracking-wider">
            {transliteration}
          </div>
        )}

        {/* Google Translate Action Buttons Row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/80">
          {/* Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="مزيد من الخيارات"
            >
              <MoreVertical size={19} />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-2xl p-1.5 z-30 text-xs space-y-1">
                <button
                  onClick={handleShareClick}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-700/70 transition-colors"
                >
                  <Share2 size={15} />
                  <span>مشاركة الترجمة</span>
                </button>
                <button
                  onClick={handleFeedbackClick}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200 hover:bg-zinc-700/70 transition-colors"
                >
                  <ThumbsDown size={15} />
                  <span>إرسال تعليقات</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons: Fullscreen, Star/Save, Copy, Speaker */}
          <div className="flex items-center gap-1 sm:gap-2">
            {onOpenZoom && (
              <button
                onClick={onOpenZoom}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="عرض في وضع ملء الشاشة المكبر"
              >
                <Maximize2 size={19} />
              </button>
            )}

            <button
              onClick={onToggleFavorite}
              className={`p-2 rounded-full transition-colors ${
                isFavorite 
                  ? 'text-amber-400 bg-amber-500/20 fill-amber-400' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={isFavorite ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            >
              <Star size={19} className={isFavorite ? 'fill-amber-400 text-amber-400' : ''} />
            </button>

            <button
              onClick={handleCopyTargetClick}
              className={`p-2 rounded-full transition-colors ${
                copiedTarget 
                  ? 'text-emerald-400 bg-emerald-500/20' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="نسخ الترجمة"
            >
              {copiedTarget ? <Check size={19} /> : <Copy size={19} />}
            </button>

            <button
              onClick={onSpeakTarget}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="استماع إلى الترجمة"
            >
              <Volume2 size={20} />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 3. ترجمات أكثر (More Translations Card) matching Video Screenshot 3 */}
      {moreTranslations && moreTranslations.length > 0 && (
        <div className="rounded-3xl bg-zinc-900/85 border border-white/10 shadow-lg overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <BookOpen size={16} className="text-sky-400" />
              <span>ترجمات أكثر</span>
            </div>
            <button
              onClick={() => setExpandAllMore(!expandAllMore)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              {expandAllMore ? 'طي الكل' : 'توسيع الكل'}
            </button>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {moreTranslations.map((item, idx) => {
              const isExpanded = expandedIndices[idx] !== undefined ? expandedIndices[idx] : expandAllMore;
              return (
                <div key={idx} className="p-3.5 hover:bg-white/[0.02] transition-colors">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleIndex(idx)}
                  >
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
                        className="text-base font-bold text-zinc-100 hover:text-sky-400 transition-colors text-right"
                        title="انقر لاعتماد هذه الكلمة"
                      >
                        {item.phrase}
                      </button>
                      {item.partOfSpeech && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 font-medium border border-white/5">
                          {item.partOfSpeech}
                        </span>
                      )}
                    </div>
                    <button className="text-zinc-500 hover:text-zinc-300 p-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  {isExpanded && item.reverseTranslations && item.reverseTranslations.length > 0 && (
                    <div className="mt-2 text-xs text-zinc-400 font-mono tracking-wide flex flex-wrap gap-1.5 pr-1">
                      {item.reverseTranslations.map((rev, rIdx) => (
                        <button 
                          key={rIdx} 
                          onClick={() => {
                            if (onSelectSynonym) onSelectSynonym(rev);
                          }}
                          className="hover:text-amber-400 hover:underline cursor-pointer"
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
        </div>
      )}

      {/* 4. تعريفات الكلمة والمرادفات (Definitions & Synonyms Chips) matching Video at 00:08 & 00:41 */}
      {definitions && definitions.length > 0 && (
        <div className="rounded-3xl bg-zinc-900/85 border border-white/10 shadow-lg overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles size={16} className="text-amber-400" />
              <span>تعريفات {sourceText}</span>
            </div>
          </div>

          <div className="p-4 space-y-5">
            {definitions.map((def, idx) => (
              <div key={idx} className="space-y-2 border-b border-zinc-800/50 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">
                      {def.partOfSpeech}
                    </span>
                    {def.number && (
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[11px] flex items-center justify-center font-bold border border-blue-500/30">
                        {def.number}
                      </span>
                    )}
                  </div>

                  {/* The Synonyms Button "المرادفات" */}
                  {def.synonyms && def.synonyms.length > 0 && (
                    <button
                      onClick={() => toggleSynonyms(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 border ${
                        activeSynonymIndex === idx
                          ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                      }`}
                    >
                      <span>المرادفات</span>
                      <ChevronDown 
                        size={13} 
                        className={`transition-transform duration-200 ${activeSynonymIndex === idx ? 'rotate-180' : ''}`} 
                      />
                    </button>
                  )}
                </div>

                {/* Definition Text in English / Arabic */}
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pr-1" style={{ direction: 'ltr' }}>
                  {def.definition}
                </p>

                {/* Usage Example */}
                {def.example && (
                  <div className="text-xs italic text-zinc-400 border-l-2 border-zinc-700 pl-2 my-1" style={{ direction: 'ltr' }}>
                    {def.example}
                  </div>
                )}

                {/* Interactive Synonym Chips (Tapping any synonym instantly updates input and translates!) */}
                {def.synonyms && def.synonyms.length > 0 && activeSynonymIndex === idx && (
                  <div className="mt-3 pt-2">
                    <div className="flex flex-wrap gap-2 justify-start" style={{ direction: 'ltr' }}>
                      {def.synonyms.map((syn, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => {
                            if (onSelectSynonym) {
                              onSelectSynonym(syn);
                            } else {
                              onSourceTextChange(syn);
                            }
                            onShowToast(`تم اختيار المرادف: ${syn}`);
                          }}
                          className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-200 text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-sm"
                          title={`انقر لترجمة: ${syn}`}
                        >
                          {syn}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
