import React, { useState } from 'react';
import { TranslationHistoryItem, ThemeConfig } from '../types.ts';
import { Star, X, Search, Volume2, Copy, Trash2, Globe } from 'lucide-react';

interface StarredTranslationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: TranslationHistoryItem[];
  onToggleFavorite: (id: string) => void;
  onSelectTranslation: (item: TranslationHistoryItem) => void;
  onSpeak: (text: string, lang: string) => void;
  onCopy: (text: string) => void;
  theme: ThemeConfig;
}

export const StarredTranslationsModal: React.FC<StarredTranslationsModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onToggleFavorite,
  onSelectTranslation,
  onSpeak,
  onCopy,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = favorites.filter(
    (item) =>
      item.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl mt-surface-soft border mt-hairline shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b mt-hairline mt-surface-soft">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full mt-accent-soft mt-accent-text flex items-center justify-center">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-base font-bold">الترجمات المحفوظة (المفضلة)</h2>
              <p className="text-[11px] mt-subtext">قائمة الكلمات والعبارات المميزة بنجمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl mt-subtext hover:text-[var(--mt-text)] hover:bg-[var(--mt-surface)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b mt-hairline mt-sheet-header">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 mt-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في العبارات المحفوظة..."
              className="w-full mt-surface-soft placeholder:mt-subtext text-xs py-2 pr-9 pl-3 rounded-xl border mt-hairline focus:outline-none focus:border-[var(--mt-accent)]"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 custom-scrollbar flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center mt-subtext text-xs space-y-2">
              <Star size={32} className="mx-auto opacity-30 mt-accent-text" />
              <p className="font-bold">لا توجد ترجمات محفوظة بنجمة حتى الآن</p>
              <p className="text-[11px] opacity-70">
                انقر على أيقونة النجمة ⭐ بجانب أي ترجمة لحفظها هنا والرجوع إليها في أي وقت.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl mt-surface-soft border mt-hairline hover:border-[var(--mt-border-strong)] transition-all flex items-start justify-between gap-3 group"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onSelectTranslation(item);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-[10px] mt-subtext">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 mt-accent-text font-mono">
                      {item.sourceLang} → {item.targetLang}
                    </span>
                    <span>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold mb-0.5">{item.sourceText}</div>
                  <div className="text-sm font-medium mt-accent-text/90">{item.translatedText}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSpeak(item.translatedText, item.targetLang)}
                    className="p-1.5 rounded-lg mt-subtext hover:text-[var(--mt-text)] hover:bg-zinc-700/60 transition-colors"
                    title="استماع"
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    onClick={() => onCopy(item.translatedText)}
                    className="p-1.5 rounded-lg mt-subtext hover:text-[var(--mt-text)] hover:bg-zinc-700/60 transition-colors"
                    title="نسخ"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-1.5 rounded-lg mt-accent-text hover:text-[var(--mt-danger)] hover:bg-zinc-700/60 transition-colors"
                    title="إلغاء الحفظ"
                  >
                    <Star size={15} fill="currentColor" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t mt-hairline mt-surface-soft flex items-center justify-between text-xs mt-subtext">
          <span>إجمالي المحفوظات: {favorites.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl mt-surface-soft hover:bg-[var(--mt-surface)] font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
