import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  Search,
  ChevronDown,
  Sparkles,
  Loader2,
  HardDrive,
  X,
  ArrowRight,
  MoreVertical,
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

const RECENT_LIMIT = 5;

const recentStorageKey = (label: string) =>
  label === 'من' ? 'mahdi_recent_langs_source' : 'mahdi_recent_langs_target';

function readRecents(label: string): string[] {
  try {
    const raw = localStorage.getItem(recentStorageKey(label));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const valid = new Set(['auto', ...LANGUAGES.map((l) => l.code)]);
    return parsed.filter((c): c is string => typeof c === 'string' && valid.has(c));
  } catch {
    return [];
  }
}

function pushRecent(label: string, code: string): string[] {
  const next = [code, ...readRecents(label).filter((c) => c !== code)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(recentStorageKey(label), JSON.stringify(next));
  } catch {
    /* storage unavailable — recents simply won't persist */
  }
  return next;
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
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setIsOpen(false), []);
  const exitSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery('');
  }, []);

  // Load the recent-languages list every time the sheet opens.
  useEffect(() => {
    if (isOpen) setRecents(readRecents(label));
  }, [isOpen, label]);

  // Hardware / browser back: exit search first, then close the sheet.
  useEffect(() => {
    if (!isOpen) return;
    const unregister = pushBackHandler(() => {
      if (searchMode) {
        exitSearch();
      } else {
        close();
      }
      return true;
    });
    return unregister;
  }, [isOpen, searchMode, close, exitSearch]);

  // Lock background scrolling while the sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Focus the search input when entering search mode; reset state on close.
  useEffect(() => {
    if (isOpen && searchMode) {
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    if (!isOpen) {
      setSearchMode(false);
      setSearchQuery('');
      setMenuOpen(false);
    }
  }, [isOpen, searchMode]);

  // Escape closes the sheet (or exits search first).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchMode) exitSearch();
        else close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, searchMode, close, exitSearch]);

  const selectedLang = LANGUAGES.find((l) => l.code === value);

  const getTriggerLabel = () => {
    if (value === 'auto') return 'كشف تلقائي عن اللغة';
    if (value === 'ar') return 'العربية';
    if (selectedLang) return selectedLang.nativeName;
    return value;
  };

  const isCurrentDownloaded = value !== 'auto' && isLanguageDownloaded(value);

  // All languages, alphabetically ordered by English name (matches the
  // Google Translate "All languages" A–Z list).
  const allLanguages = useMemo(
    () => [...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return allLanguages;
    const q = searchQuery.toLowerCase().trim();
    return allLanguages.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [searchQuery, allLanguages]);

  // Recent entries that still resolve (auto + real languages).
  const recentLanguages = useMemo(
    () =>
      recents
        .map((code) => (code === 'auto' ? { code, name: 'Detect Language', nativeName: 'كشف تلقائي عن اللغة' } : LANGUAGES.find((l) => l.code === code)))
        .filter((l): l is Language | { code: string; name: string; nativeName: string } => Boolean(l)),
    [recents],
  );

  const getPackStatus = (langCode: string) => {
    const pack = offlinePacks.find((p: any) => p.langCode === langCode);
    return pack ? pack.status : isLanguageDownloaded(langCode) ? 'downloaded' : 'available';
  };

  const pick = (code: string) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setRecents(pushRecent(label, code));
    onChange(code);
    close();
  };

  const isSearching = searchMode && searchQuery.trim().length > 0;

  const renderTrailing = (langCode: string) => {
    if (langCode === 'auto') return null;
    const status = getPackStatus(langCode);
    if (status === 'downloaded' || isLanguageDownloaded(langCode)) {
      return (
        <CheckCircle2
          className="mt-lang-row-icon mt-success-text shrink-0"
          size={22}
          aria-label="حزمة اللغة محملة"
        />
      );
    }
    if (status === 'downloading') {
      return <Loader2 className="mt-lang-row-icon mt-accent-text shrink-0 animate-spin" size={22} />;
    }
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDownloadLanguage(langCode);
        }}
        className="mt-lang-download"
        title="تنزيل حزمة اللغة للعمل بدون إنترنت"
        aria-label={`تنزيل حزمة ${langCode}`}
      >
        <Download size={22} />
      </button>
    );
  };

  const renderRow = (
    langCode: string,
    rowLabel: string,
    options: { detect?: boolean } = {},
  ) => {
    const isSelected = value === langCode;
    // div[role=button], not a <button>: the trailing download control is itself
    // a real button, and nested buttons are invalid HTML.
    return (
      <div
        key={langCode}
        role="button"
        tabIndex={0}
        onClick={() => pick(langCode)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick(langCode);
          }
        }}
        className={`mt-lang-row${isSelected ? ' mt-lang-row--selected' : ''}`}
        aria-current={isSelected ? 'true' : undefined}
      >
        <span className="mt-lang-row-check">
          {isSelected && <Check size={24} strokeWidth={3} />}
        </span>
        <span className="mt-lang-row-label">
          {options.detect && <Sparkles className="mt-lang-row-sparkle" size={20} />}
          <span className="truncate">{rowLabel}</span>
        </span>
        {!isSelected && renderTrailing(langCode)}
      </div>
    );
  };

  return (
    <div className="relative inline-flex flex-col items-center w-full">
      {/* Compact trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-9 w-full max-w-[170px] px-3 rounded-full border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 select-none mt-hairline mt-surface-soft hover:border-[var(--mt-border-strong)] hover:bg-[var(--mt-surface)]"
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
        <ChevronDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
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

      {/* Full-screen opaque Google-Translate-style language page.
          Structural positioning lives in plain CSS (.mt-backdrop etc.) so the
          sheet can never collapse if the Tailwind runtime CDN lags. */}
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
            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="mt-lang-topbar">
              {searchMode ? (
                <>
                  <button
                    type="button"
                    className="mt-lang-iconbtn"
                    onClick={exitSearch}
                    aria-label="رجوع"
                  >
                    <ArrowRight size={23} />
                  </button>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن لغة"
                    className="mt-lang-search"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="mt-lang-iconbtn"
                      onClick={() => setSearchQuery('')}
                      aria-label="مسح البحث"
                    >
                      <X size={22} />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="mt-lang-iconbtn"
                    onClick={close}
                    aria-label="رجوع"
                  >
                    <ArrowRight size={23} />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="mt-lang-iconbtn"
                      onClick={() => setSearchMode(true)}
                      aria-label="بحث"
                    >
                      <Search size={22} />
                    </button>
                    {onOpenOfflinePacks && (
                      <div className="relative">
                        <button
                          type="button"
                          className="mt-lang-iconbtn"
                          onClick={() => setMenuOpen((p) => !p)}
                          aria-label="خيارات إضافية"
                          aria-haspopup="menu"
                          aria-expanded={menuOpen}
                        >
                          <MoreVertical size={22} />
                        </button>
                        {menuOpen && (
                          <>
                            <div className="mt-lang-menu-scrim" onClick={() => setMenuOpen(false)} />
                            <div className="mt-pop-solid mt-lang-menu" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setMenuOpen(false);
                                  close();
                                  onOpenOfflinePacks();
                                }}
                                className="mt-lang-menu-item"
                              >
                                <HardDrive size={18} />
                                <span>إدارة الحزم الأوفلاين</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Title (hidden while searching) ──────────────────── */}
            {!searchMode && (
              <h2 className="mt-lang-title">
                {label === 'من' ? 'الترجمة من' : 'الترجمة إلى'}
              </h2>
            )}

            {/* ── Language list ───────────────────────────────────── */}
            <div className="mt-lang-list mt-scroll">
              {isSearching ? (
                filteredLanguages.length === 0 ? (
                  <div className="mt-lang-empty">لا توجد لغة مطابقة للبحث</div>
                ) : (
                  filteredLanguages.map((lang: Language) =>
                    renderRow(lang.code, lang.code === 'ar' ? 'العربية' : lang.nativeName),
                  )
                )
              ) : (
                <>
                  {/* Detect language (source picker only) */}
                  {allowAutoDetect &&
                    renderRow('auto', 'كشف تلقائي عن اللغة', { detect: true })}

                  {/* Recent languages */}
                  {recentLanguages.length > 0 && (
                    <div className="mt-lang-section">
                      <div className="mt-lang-section-label">اللغات الأخيرة</div>
                      {recentLanguages.map((lang) =>
                        renderRow(
                          lang.code,
                          lang.code === 'auto'
                            ? 'كشف تلقائي عن اللغة'
                            : lang.code === 'ar'
                              ? 'العربية'
                              : (lang as Language).nativeName,
                          { detect: lang.code === 'auto' },
                        ),
                      )}
                    </div>
                  )}

                  {/* All languages A–Z */}
                  <div className="mt-lang-section">
                    <div className="mt-lang-section-label">كل اللغات</div>
                    {allLanguages.map((lang: Language) =>
                      renderRow(lang.code, lang.code === 'ar' ? 'العربية' : lang.nativeName),
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
