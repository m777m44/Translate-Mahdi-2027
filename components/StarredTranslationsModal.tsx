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
        className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">الترجمات المحفوظة (المفضلة)</h2>
              <p className="text-[11px] text-zinc-400">قائمة الكلمات والعبارات المميزة بنجمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="relative">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في العبارات المحفوظة..."
              className="w-full bg-zinc-800/80 text-white placeholder:text-zinc-500 text-xs py-2 pr-9 pl-3 rounded-xl border border-zinc-700/60 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 custom-scrollbar flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
              <Star size={32} className="mx-auto opacity-30 text-amber-500" />
              <p className="font-bold">لا توجد ترجمات محفوظة بنجمة حتى الآن</p>
              <p className="text-[11px] opacity-70">
                انقر على أيقونة النجمة ⭐ بجانب أي ترجمة لحفظها هنا والرجوع إليها في أي وقت.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 hover:border-amber-500/50 transition-all flex items-start justify-between gap-3 group"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    onSelectTranslation(item);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5 text-[10px] text-zinc-400">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">
                      {item.sourceLang} → {item.targetLang}
                    </span>
                    <span>
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-0.5">{item.sourceText}</div>
                  <div className="text-sm font-medium text-amber-400/90">{item.translatedText}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSpeak(item.translatedText, item.targetLang)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors"
                    title="استماع"
                  >
                    <Volume2 size={15} />
                  </button>
                  <button
                    onClick={() => onCopy(item.translatedText)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors"
                    title="نسخ"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-1.5 rounded-lg text-amber-400 hover:text-red-400 hover:bg-zinc-700/60 transition-colors"
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
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-xs text-zinc-400">
          <span>إجمالي المحفوظات: {favorites.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
