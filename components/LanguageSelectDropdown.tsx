import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, 
  Download, 
  Search, 
  ChevronDown, 
  Sparkles, 
  WifiOff, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { LANGUAGES } from '../constants.ts';
import { Language } from '../types.ts';

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
  autoDetectedCode,
  onAcceptAutoDetect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Selected language object
  const selectedLang = LANGUAGES.find(l => l.code === value);

  // Label to display on trigger button
  const getTriggerLabel = () => {
    if (value === 'auto') {
      return 'كشف تلقائي عن اللغة';
    }
    if (value === 'ar') {
      return 'العربية';
    }
    if (selectedLang) {
      return selectedLang.nativeName;
    }
    return value;
  };

  const isCurrentDownloaded = value !== 'auto' && isLanguageDownloaded(value);

  // Reorder languages to place Arabic first, then English, then the rest
  const sortedLanguages = React.useMemo(() => {
    const arabic = LANGUAGES.find(l => l.code === 'ar');
    const english = LANGUAGES.find(l => l.code === 'en');
    const others = LANGUAGES.filter(l => l.code !== 'ar' && l.code !== 'en');
    return [
      ...(arabic ? [arabic] : []),
      ...(english ? [english] : []),
      ...others
    ];
  }, []);

  // Filter languages by search query
  const filteredLanguages = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedLanguages;
    const q = searchQuery.toLowerCase().trim();
    return sortedLanguages.filter(l => 
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [searchQuery, sortedLanguages]);

  // Check if a language pack is currently downloading
  const getPackStatus = (langCode: string) => {
    const pack = offlinePacks.find((p: any) => p.langCode === langCode);
    return pack ? pack.status : (isLanguageDownloaded(langCode) ? 'downloaded' : 'available');
  };

  return (
    <div className="relative inline-flex flex-col items-center" ref={dropdownRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-7 sm:h-7.5 px-2.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 select-none ${
          isOpen
            ? 'mt-hairline bg-amber-500/15 mt-accent-text ring-2 ring-[var(--mt-accent)]/20'
            : 'mt-hairline mt-surface-soft  hover:border-[var(--mt-border-strong)] hover:bg-[var(--mt-surface)]  '
        }`}
        title={`اختيار لغة ${label}`}
      >
        {value === 'auto' ? (
          <Sparkles className="w-3 h-3 mt-accent-text shrink-0" />
        ) : (
          <span className="text-xs shrink-0">{selectedLang?.flag || '🌐'}</span>
        )}

        <span className="truncate max-w-[110px] sm:max-w-[140px] text-[11px] sm:text-xs">
          {getTriggerLabel()}
        </span>

        {isCurrentDownloaded && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="حزمة اللغة محملة وتعمل بدون إنترنت" />
        )}

        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 mt-accent-text' : ''}`} />
      </button>

      {/* Auto Detection Badge Pill positioned neatly UNDER the button as requested */}
      {allowAutoDetect && value === 'auto' && autoDetectedName && (
        <button
          type="button"
          onClick={onAcceptAutoDetect}
          className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 hover:bg-blue-500 mt-accent-text hover:text-[var(--mt-text)] border border-blue-500/30 transition-all flex items-center gap-1 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200"
          title="انقر لتثبيت هذه اللغة المصدر"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span>{autoDetectedName}، تم رصدها</span>
          {onAcceptAutoDetect && <Check className="w-2.5 h-2.5 ml-0.5" />}
        </button>
      )}

      {/* Popover Dropdown with In-line Language Download Buttons */}
      {isOpen && (
        <div 
          className={`absolute top-full mt-1.5 z-50 w-72 sm:w-84 rounded-2xl mt-elevated border mt-hairline shadow-2xl overflow-hidden flex flex-col text-right animate-in fade-in zoom-in-95 duration-150 ${
            label === 'إلى' ? 'left-0' : 'right-0'
          }`}
          dir="rtl"
        >
          {/* Header & Quick Search */}
          <div className="p-2.5 border-b mt-hairline mt-sheet-header space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold flex items-center gap-1.5">
                <span>اختيار اللغة {label === 'من' ? 'المصدر' : 'الهدف'}</span>
              </span>
              {onOpenOfflinePacks && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenOfflinePacks();
                  }}
                  className="text-[10px] mt-accent-text hover:underline flex items-center gap-1"
                >
                  <HardDrive className="w-3 h-3" />
                  <span>إدارة الحزم أوفلاين</span>
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 mt-subtext" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن لغة..."
                className="w-full pr-8 pl-3 py-1.5 text-xs mt-surface-soft border mt-hairline rounded-xl placeholder:mt-subtext focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {/* Auto Detect Option (Source only) */}
            {allowAutoDetect && !searchQuery.trim() && (
              <div
                onClick={() => {
                  onChange('auto');
                  setIsOpen(false);
                }}
                className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                  value === 'auto'
                    ? 'mt-accent-soft mt-accent-text font-bold border mt-hairline'
                    : 'hover:bg-[var(--mt-surface)]/70 '
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 mt-accent-text" />
                  <span className="font-bold text-xs">كشف تلقائي عن اللغة</span>
                </div>
                {value === 'auto' && <Check className="w-3.5 h-3.5 mt-accent-text" />}
              </div>
            )}

            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs mt-subtext">
                لا توجد لغة مطابقة للبحث
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = value === lang.code;
                const downloaded = isLanguageDownloaded(lang.code);
                const packStatus = getPackStatus(lang.code);
                const isDownloading = packStatus === 'downloading';

                return (
                  <div
                    key={lang.code}
                    onClick={() => {
                      onChange(lang.code);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 mt-accent-text font-bold border mt-hairline'
                        : 'hover:bg-[var(--mt-surface)]/70 '
                    }`}
                  >
                    {/* Language Name & Flag */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate">
                          {lang.code === 'ar' ? 'العربية' : lang.nativeName}
                        </span>
                        {lang.code !== 'ar' && (
                          <span className="text-[10px] mt-subtext truncate">
                            {lang.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Integrated Offline Download Button / Status */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {downloaded ? (
                        <div 
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold mt-accent-soft mt-success-text border border-emerald-500/30 flex items-center gap-1 shadow-sm"
                          title="هذه اللغة محملة وتعمل بدون إنترنت"
                        >
                          <Check className="w-3 h-3 mt-accent-text" />
                          <span>محملة أوفلاين</span>
                        </div>
                      ) : isDownloading ? (
                        <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-500/20 mt-accent-text border border-sky-500/30 flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin mt-accent-text" />
                          <span>جاري التنزيل...</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDownloadLanguage(lang.code)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold mt-surface-soft hover:bg-amber-500 mt-subtext hover:text-black border mt-hairline hover:border-amber-400 flex items-center gap-1 transition-all shadow-sm active:scale-95"
                          title="تنزيل حزمة اللغة للعمل عند انقطاع الإنترنت"
                        >
                          <Download className="w-3 h-3" />
                          <span>تنزيل أوفلاين</span>
                        </button>
                      )}

                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Informational Footer */}
          <div className="p-2 border-t mt-hairline mt-sheet-header text-[10px] mt-subtext flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3 h-3 mt-accent-text shrink-0" />
              <span>الحزم المحملة تعمل فوراً بدون إنترنت</span>
            </div>
            <span className="mt-subtext text-[9px]">أوفلاين v3</span>
          </div>
        </div>
      )}
    </div>
  );
};
