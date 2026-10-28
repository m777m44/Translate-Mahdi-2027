import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Check,
  Download,
  Search,
  ChevronDown,
  Sparkles,
  WifiOff,
  Loader2,
  HardDrive,
  X,
} from 'lucide-react';
import { LANGUAGES } from '../constants.ts';
import { Language } from '../types.ts';
import { pushBackHandler } from '../platform.ts';

interface LanguageSelectDropdownProps {
  label: string; // 'من' or 'إلى'
  value: string; // langCode or 'auto'
  onChange: (langCode: string) => void;
  allowAutoDetect?: boolean;
  isLanguageDownloaded: (code: string) => boolean;
  onDownloadLanguage: (code: string) => void;
  onOpenOfflinePacks?: () => void;
  offlinePacks?: any[];
  autoDetectedName?: string;
  autoDetectedCode?: string;
  onAcceptAutoDetect?: () => void;
}

export const LanguageSelectDropdown: React.FC<LanguageSelectDropdownProps> = ({
  label,
  value,
  onChange,
  allowAutoDetect = false,
  isLanguageDownloaded,
  onDownloadLanguage,
  onOpenOfflinePacks,
  offlinePacks = [],
  autoDetectedName,
  onAcceptAutoDetect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const close = () => setIsOpen(false);

  // Hardware / browser back closes the sheet first (one step, never the app).
  useEffect(() => {
    if (!isOpen) return;
    const unregister = pushBackHandler(() => {
      close();
      return true;
    });
    return unregister;
  }, [isOpen]);

  // Lock background scrolling while the sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Focus the search field and reset the query on every open.
  useEffect(() => {
    if (isOpen) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    setSearchQuery('');
  }, [isOpen]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const selectedLang = LANGUAGES.find((l) => l.code === value);

  const getTriggerLabel = () => {
    if (value === 'auto') return 'كشف تلقائي عن اللغة';
    if (value === 'ar') return 'العربية';
    if (selectedLang) return selectedLang.nativeName;
    return value;
  };

  const isCurrentDownloaded = value !== 'auto' && isLanguageDownloaded(value);

  const sortedLanguages = useMemo(() => {
    const arabic = LANGUAGES.find((l) => l.code === 'ar');
    const english = LANGUAGES.find((l) => l.code === 'en');
    const others = LANGUAGES.filter((l) => l.code !== 'ar' && l.code !== 'en');
    return [...(arabic ? [arabic] : []), ...(english ? [english] : []), ...others];
  }, []);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return sortedLanguages;
    const q = searchQuery.toLowerCase().trim();
    return sortedLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [searchQuery, sortedLanguages]);

  const getPackStatus = (langCode: string) => {
    const pack = offlinePacks.find((p: any) => p.langCode === langCode);
    return pack ? pack.status : isLanguageDownloaded(langCode) ? 'downloaded' : 'available';
  };

  const pick = (code: string) => {
    // Dismiss the on-screen keyboard, apply the choice, then close the panel
    // so the translation card is immediately visible again.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onChange(code);
    close();
  };

  return (
    <div className="relative inline-flex flex-col items-center w-full">
      {/* Compact trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className={`h-9 w-full max-w-[170px] px-3 rounded-full border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 select-none ${
          isOpen
            ? 'mt-hairline bg-amber-500/15 mt-accent-text ring-2 ring-[var(--mt-accent)]/25'
            : 'mt-hairline mt-surface-soft hover:border-[var(--mt-border-strong)] hover:bg-[var(--mt-surface)]'
        }`}
        title={`اختيار لغة ${label}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {value === 'auto' ? (
          <Sparkles className="w-3.5 h-3.5 mt-accent-text shrink-0" />
        ) : (
          <span className="text-sm shrink-0">{selectedLang?.flag || '🌐'}</span>
        )}
        <span className="truncate text-[12px]">{getTriggerLabel()}</span>
        {isCurrentDownloaded && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
            title="حزمة اللغة محملة وتعمل بدون إنترنت"
          />
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 mt-accent-text' : ''}`}
        />
      </button>

      {/* Auto-detection accept pill */}
      {allowAutoDetect && value === 'auto' && autoDetectedName && (
        <button
          type="button"
          onClick={onAcceptAutoDetect}
          className="mt-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 hover:bg-blue-500/25 mt-accent-text border border-blue-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          title="انقر لتثبيت هذه اللغة المصدر"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>{autoDetectedName}، تم رصدها</span>
          {onAcceptAutoDetect && <Check className="w-2.5 h-2.5" />}
        </button>
      )}

      {/* Full-screen opaque language page (pure-CSS structure so it can never
          collapse into a translucent strip if the Tailwind CDN lags). */}
      {isOpen && (
        <div
          className="mt-backdrop"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label={`اختيار اللغة ${label === 'من' ? 'المصدر' : 'الهدف'}`}
          onClick={close}
        >
          <div
            className="mt-sheet-solid mt-lang-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (tablets/desktop dialog only) */}
            <div className="mt-lang-handle sm:hidden flex justify-center pt-2.5 pb-1">
              <span className="w-10 h-1 rounded-full opacity-40" style={{ background: 'var(--mt-subtext)' }} />
            </div>

            {/* Header */}
            <div className="mt-lang-head px-4 pt-3 pb-3 border-b" style={{ borderColor: 'var(--mt-border)' }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold mt-heading flex items-center gap-2">
                  <span>اختيار اللغة {label === 'من' ? 'المصدر' : 'الهدف'}</span>
                </h3>
                <div className="flex items-center gap-1">
                  {onOpenOfflinePacks && (
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onOpenOfflinePacks();
                      }}
                      className="text-[10.5px] mt-accent-text font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-[var(--mt-surface)] transition-colors"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>إدارة الحزم</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    className="mt-icon-btn p-2"
                    aria-label="إغلاق"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative mt-2.5">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 mt-subtext pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن لغة..."
                  className="w-full pr-10 pl-3 py-2.5 text-xs font-semibold rounded-xl bg-[var(--mt-surface)] border outline-none focus:border-[var(--mt-accent)] transition-colors"
                  style={{ borderColor: 'var(--mt-border)' }}
                />
              </div>
            </div>

            {/* Language list */}
            <div className="mt-lang-list mt-scroll space-y-0.5">
              {allowAutoDetect && !searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => pick('auto')}
                  className={`w-full text-right p-3 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                    value === 'auto'
                      ? 'mt-accent-soft mt-accent-text font-extrabold border'
                      : 'hover:bg-[var(--mt-surface)]'
                  }`}
                  style={value === 'auto' ? { borderColor: 'var(--mt-border)' } : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 mt-accent-text shrink-0" />
                    <span className="font-bold text-xs">كشف تلقائي عن اللغة</span>
                  </div>
                  {value === 'auto' && <Check className="w-4 h-4 mt-accent-text shrink-0" />}
                </button>
              )}

              {filteredLanguages.length === 0 ? (
                <div className="py-10 text-center text-xs mt-subtext">لا توجد لغة مطابقة للبحث</div>
              ) : (
                filteredLanguages.map((lang: Language) => {
                  const isSelected = value === lang.code;
                  const downloaded = isLanguageDownloaded(lang.code);
                  const packStatus = getPackStatus(lang.code);
                  const isDownloading = packStatus === 'downloading';

                  return (
                    <div
                      key={lang.code}
                      onClick={() => pick(lang.code)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') pick(lang.code);
                      }}
                      className={`w-full text-right p-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 mt-accent-text font-extrabold border'
                          : 'hover:bg-[var(--mt-surface)]'
                      }`}
                      style={isSelected ? { borderColor: 'var(--mt-border)' } : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{lang.flag}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs truncate">
                            {lang.code === 'ar' ? 'العربية' : lang.nativeName}
                          </span>
                          {lang.code !== 'ar' && (
                            <span className="text-[10px] mt-subtext truncate">{lang.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {downloaded ? (
                          <span
                            className="px-2 py-1 rounded-lg text-[10px] font-bold mt-accent-soft mt-success-text border border-emerald-500/30 flex items-center gap-1"
                            title="هذه اللغة محملة وتعمل بدون إنترنت"
                          >
                            <Check className="w-3 h-3 mt-accent-text" />
                            <span className="hidden xs:inline">محملة</span>
                          </span>
                        ) : isDownloading ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-500/20 mt-accent-text border border-sky-500/30 flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin mt-accent-text" />
                            <span className="hidden xs:inline">جاري التنزيل</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDownloadLanguage(lang.code)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--mt-surface)] hover:bg-amber-500/20 mt-subtext hover:text-[var(--mt-accent)] border transition-all active:scale-95 flex items-center gap-1"
                            style={{ borderColor: 'var(--mt-border)' }}
                            title="تنزيل حزمة اللغة للعمل عند انقطاع الإنترنت"
                          >
                            <Download className="w-3 h-3" />
                            <span>أوفلاين</span>
                          </button>
                        )}
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="mt-lang-foot px-4 py-2.5 border-t text-[10px] mt-subtext flex items-center justify-between"
              style={{ borderColor: 'var(--mt-border)' }}
            >
              <div className="flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 mt-accent-text shrink-0" />
                <span>الحزم المحملة تعمل فوراً بدون إنترنت</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
