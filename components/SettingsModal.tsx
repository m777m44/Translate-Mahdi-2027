import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  Palette, 
  Wifi, 
  WifiOff, 
  Sliders, 
  Search, 
  Check, 
  ZoomIn, 
  Volume2, 
  Sparkles,
  Wand2,
  Layers,
  SlidersHorizontal,
  Sun,
  Moon,
  Flame,
  Droplets,
  Activity,
  Maximize2
} from 'lucide-react';
import { ThemeConfig, TtsSettings, TranslationHistoryItem, ZoomLevel, CustomThemeSettings } from '../types.ts';
import { THEMES_LIST, THEME_CATEGORIES, createCustomTheme } from '../themeRegistry.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onSelectTheme: (theme: ThemeConfig) => void;
  history: TranslationHistoryItem[];
  onClearHistory: () => void;
  onRestoreLastTranslation: () => void;
  lastItem: TranslationHistoryItem | null;
  forceOffline: boolean;
  onToggleForceOffline: (val: boolean) => void;
  zoom: ZoomLevel;
  onChangeZoom: (zoom: ZoomLevel) => void;
  ttsSettings: TtsSettings;
  onChangeTtsSettings: (settings: TtsSettings) => void;
  availableVoices: string[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  history,
  onClearHistory,
  onRestoreLastTranslation,
  lastItem,
  forceOffline,
  onToggleForceOffline,
  zoom,
  onChangeZoom,
  ttsSettings,
  onChangeTtsSettings,
  availableVoices,
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'customizer' | 'general' | 'audio'>('themes');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [themeSearch, setThemeSearch] = useState<string>('');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // Custom Theme Builder state
  const [customSettings, setCustomSettings] = useState<CustomThemeSettings>({
    accentColor: '#f59e0b',
    cardOpacity: 12,
    glassBlur: 20,
    borderRadius: 24,
    bgStyle: 'aurora',
    glowAnimation: true,
  });

  if (!isOpen) return null;

  const filteredThemes = THEMES_LIST.filter(t => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch = !themeSearch.trim() || 
      t.name.toLowerCase().includes(themeSearch.toLowerCase()) || 
      t.nameAr.includes(themeSearch);
    return matchesCat && matchesSearch;
  });

  const handleApplyCustomTheme = () => {
    const newTheme = createCustomTheme(customSettings);
    onSelectTheme(newTheme);
  };

  const navItems = [
    {
      id: 'themes' as const,
      icon: Palette,
      title: 'محرك الثيمات',
      desc: '125+ تصميماً راقياً',
    },
    {
      id: 'customizer' as const,
      icon: Wand2,
      title: 'تخصيص الثيم',
      desc: 'ثيم زجاجي ومتحرك',
    },
    {
      id: 'general' as const,
      icon: RotateCcw,
      title: 'السجل والتحجيم',
      desc: 'الذاكرة وحجم العرض',
    },
    {
      id: 'audio' as const,
      icon: Volume2,
      title: 'الصوت والنطق',
      desc: 'الأصوات والسرعة',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border ${currentTheme.border} ${currentTheme.card} ${currentTheme.text} shadow-2xl overflow-hidden transition-all duration-300`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit bg-black/[0.04] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${currentTheme.primary} shadow-md`}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">إعدادات Mahdi Translate Pro</h2>
              <p className="text-xs opacity-60">محرك الثيمات (125+ تصميم) • تخصيص متقدم • السجل والترجمة دون إنترنت</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
            title="إغلاق الإعدادات"
          >
            <X size={20} />
          </button>
        </div>

        {/* Horizontal Smooth Nav Bar with Icons on Top and Small Labels Below */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-inherit bg-black/[0.02] dark:bg-white/[0.01]">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 snap-x">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center min-w-[125px] sm:min-w-[145px] py-2.5 px-3 rounded-2xl transition-all duration-200 snap-start select-none border ${
                    isActive
                      ? `${currentTheme.primary} border-transparent shadow-lg shadow-amber-500/20 scale-[1.02]`
                      : 'bg-black/5 dark:bg-white/5 border-transparent opacity-65 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  <Icon size={18} className="mb-1" />
                  <span className="text-xs font-black leading-tight text-center">{item.title}</span>
                  <span className="text-[10px] opacity-75 leading-none mt-0.5 text-center truncate max-w-[120px]">
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body with Custom Smooth Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: THEMES REGISTRY (125+ Themes) */}
          {activeTab === 'themes' && (
            <div className="space-y-6">
              {/* Category selector & Search */}
              <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                <div className="relative flex-1">
                  <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                  <input
                    type="text"
                    value={themeSearch}
                    onChange={(e) => setThemeSearch(e.target.value)}
                    placeholder="ابحث عن اسم الثيم، اللون، أو النوع (عربي / English)..."
                    className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  {themeSearch && (
                    <button 
                      onClick={() => setThemeSearch('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Switch to Customizer CTA */}
                <button
                  onClick={() => setActiveTab('customizer')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
                >
                  <Wand2 size={16} />
                  <span>تخصيص ثيمك الخاص ✨</span>
                </button>
              </div>

              {/* Horizontal Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {THEME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? `${currentTheme.primary} shadow-md`
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {cat.nameAr}
                  </button>
                ))}
              </div>

              {/* Themes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredThemes.map((theme) => {
                  const isCurrent = currentTheme.id === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group flex items-center justify-between ${
                        isCurrent
                          ? `border-amber-500 ring-2 ring-amber-500/40 bg-black/10 dark:bg-white/10 shadow-lg scale-[1.01]`
                          : 'border-inherit hover:border-amber-500/50 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-xl shadow-inner border border-white/20 flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: theme.previewColor }}
                        >
                          {isCurrent && <Check size={16} className="text-zinc-950 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{theme.nameAr}</span>
                            {theme.isGlass && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                                زجاجي
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-50 block font-mono">{theme.name}</span>
                        </div>
                      </div>

                      {/* Small preview swatch */}
                      <div className="flex items-center gap-1 opacity-80">
                        <div className={`w-3 h-3 rounded-full ${theme.bg}`} />
                        <div className={`w-3 h-3 rounded-full ${theme.primary}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM THEME BUILDER (Wand2) */}
          {activeTab === 'customizer' && (
            <div className="space-y-6">
              <div className="p-4 rounded-3xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500 text-zinc-950">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">استوديو تخصيص الثيمات الشفافة والمتحركة</h3>
                    <p className="text-xs opacity-70">
                      صمم ثيمك الزجاجي الشفاف الخاص، واختر الألوان ونسبة الزجاج والانحناء فورياً
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleApplyCustomTheme}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold ${currentTheme.primary} shadow-lg hover:brightness-110 active:scale-95 transition-all`}
                >
                  تطبيق الثيم المخصص ✓
                </button>
              </div>

              {/* Theme Live Preview Card */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.03] dark:bg-white/[0.03] space-y-3">
                <span className="text-xs font-bold opacity-60 block">معاينة حية فورية للثيم:</span>
                <div 
                  className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-3 shadow-xl`}
                  style={{
                    borderRadius: `${customSettings.borderRadius}px`,
                    borderColor: `${customSettings.accentColor}50`,
                    backgroundColor: `rgba(255, 255, 255, ${customSettings.cardOpacity / 100})`,
                    backdropFilter: `blur(${customSettings.glassBlur}px)`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: customSettings.accentColor }} />
                      بطاقة ترجمة زجاجية تجريبية
                    </span>
                    <span className="text-[10px] font-mono opacity-60">Glass Luxury v2</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-90">
                    هذا نموذج حي لكيفية ظهور النصوص والبطاقات الزجاجية الشفافة ذات الانحناء السلس.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-black"
                      style={{ backgroundColor: customSettings.accentColor }}
                    >
                      زر رئيسي مخصص
                    </button>
                    <button className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/10 border border-white/20">
                      زر ثانوي
                    </button>
                  </div>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                <label className="text-xs font-bold opacity-75 block">اختر لون التمييز الأساسي (Accent Color):</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {[
                    { color: '#f59e0b', name: 'ذهب إمبراطوري' },
                    { color: '#06b6d4', name: 'أورورا سماوي' },
                    { color: '#10b981', name: 'زمردي نقي' },
                    { color: '#3b82f6', name: 'ياقوت أزرق' },
                    { color: '#a855f7', name: 'أميثيست بنفسجي' },
                    { color: '#f43f5e', name: 'كوارتز وردي' },
                    { color: '#fb923c', name: 'غروب برتقالي' },
                    { color: '#ffffff', name: 'بلور ناصع' },
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => setCustomSettings(prev => ({ ...prev, accentColor: item.color }))}
                      className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        customSettings.accentColor === item.color
                          ? 'border-amber-500 ring-2 ring-amber-500/50 scale-105 bg-black/10 dark:bg-white/10'
                          : 'border-inherit hover:scale-102 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-xl shadow-md" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-bold text-center leading-tight truncate w-full">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Atmosphere Styles */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
                <label className="text-xs font-bold opacity-75 block">اختر نمط الخلفية والأجواء:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'aurora', name: 'أورورا القطبية المتحركة', desc: 'سماوي ونيلي عميق' },
                    { id: 'obsidian', name: 'الزجاج الليلي الداكن', desc: 'أسود وفضي فخم' },
                    { id: 'emerald', name: 'الغابة الزمردية', desc: 'أخضر ملكي داكن' },
                    { id: 'crystal', name: 'البلور الصافي', desc: 'رمادي زجاجي ناصع' },
                    { id: 'sunset', name: 'الغروب الشفقي', desc: 'بنفسجي وقرمزي' },
                    { id: 'royal-dark', name: 'الملكي الأسود', desc: 'فخامة عميقة' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setCustomSettings(prev => ({ ...prev, bgStyle: style.id as any }))}
                      className={`p-3 rounded-2xl border text-right transition-all ${
                        customSettings.bgStyle === style.id
                          ? `${currentTheme.primary} shadow-md`
                          : 'border-inherit bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="font-bold text-xs">{style.name}</div>
                      <div className="text-[10px] opacity-75">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Opacity, Blur, Radius */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Opacity */}
                <div className="p-4 rounded-2xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">شفافية البطاقات:</span>
                    <span className="font-mono text-amber-500 font-bold">{customSettings.cardOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="50"
                    value={customSettings.cardOpacity}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, cardOpacity: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                  />
                </div>

                {/* Blur */}
                <div className="p-4 rounded-2xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">قوة الضبابية الزجاجية:</span>
                    <span className="font-mono text-amber-500 font-bold">{customSettings.glassBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={customSettings.glassBlur}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, glassBlur: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                  />
                </div>

                {/* Border Radius */}
                <div className="p-4 rounded-2xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">انحناء الزوايا:</span>
                    <span className="font-mono text-amber-500 font-bold">{customSettings.borderRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="36"
                    value={customSettings.borderRadius}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, borderRadius: parseInt(e.target.value, 10) }))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL & HISTORY & ZOOM CONTROL */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* PRECISION NUMERIC ZOOM CONTROL */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <ZoomIn size={18} className="text-amber-500" />
                      <span>التحكم المباشر في التكبير والتصغير (إدخال الرقم)</span>
                    </h3>
                    <p className="text-xs opacity-60">
                      يمكنك كتابة أي رقم تريده بحرية تامة من 50% إلى 250% للتحكم الكامل في حجم الواجهة
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="50"
                      max="250"
                      value={zoom}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) onChangeZoom(Math.max(50, Math.min(250, val)));
                      }}
                      className="w-20 text-center py-1.5 px-2 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit font-black text-amber-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <span className="text-xs font-bold opacity-60">%</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="50"
                  max="250"
                  value={zoom}
                  onChange={(e) => onChangeZoom(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                />

                {/* Quick Presets */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {[75, 85, 100, 115, 130, 150].map((val) => (
                    <button
                      key={val}
                      onClick={() => onChangeZoom(val)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        zoom === val
                          ? `${currentTheme.primary} shadow-md`
                          : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Restore last translation */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2 mb-1">
                      <RotateCcw size={18} className="text-amber-500" />
                      <span>استدعاء آخر ترجمة</span>
                    </h3>
                    <p className="text-xs opacity-60 mb-3">
                      استرجاع النص والترجمة الأخيرة مباشرة إلى حقل الإدخال بنقرة واحدة
                    </p>
                    {lastItem ? (
                      <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit text-xs space-y-1 max-w-md">
                        <div className="font-semibold truncate">الأصل: "{lastItem.sourceText}"</div>
                        <div className="opacity-75 truncate text-amber-500">الترجمة: "{lastItem.translatedText}"</div>
                      </div>
                    ) : (
                      <span className="text-xs opacity-40 italic">لا توجد ترجمة سابقة في الذاكرة حالياً.</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onRestoreLastTranslation();
                      onClose();
                    }}
                    disabled={!lastItem}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-30 disabled:pointer-events-none ${currentTheme.primary}`}
                  >
                    استدعاء الآن
                  </button>
                </div>
              </div>

              {/* Offline mode toggle */}
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${forceOffline ? 'bg-orange-500 text-white' : 'bg-green-500/20 text-green-500'}`}>
                      {forceOffline ? <WifiOff size={22} /> : <Wifi size={22} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-base">وضع الترجمة المحلية (بدون إنترنت)</h3>
                      <p className="text-xs opacity-60">
                        {forceOffline 
                          ? 'الوضع المحلي مفعّل: يعتمد التطبيق كلياً على القاموس الداخلي فائق السرعة دون استهلاك بيانات أو اتصال شبكي.'
                          : 'الوضع التلقائي: يتم استخدام نموذج Gemini المتطور وعند انقطاع الإنترنت يتحول التطبيق تلقائياً للترجمة المحلية.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleForceOffline(!forceOffline)}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      forceOffline 
                        ? 'bg-orange-500 text-white' 
                        : `${currentTheme.secondary}`
                    }`}
                  >
                    {forceOffline ? 'مفعّل محلياً ✓' : 'تفعيل الإلزام المحلي'}
                  </button>
                </div>
              </div>

              {/* Clear History */}
              <div className="p-5 rounded-3xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base text-red-500 flex items-center gap-2">
                      <Trash2 size={18} />
                      <span>مسح سجل الترجمات بالكامل</span>
                    </h3>
                    <p className="text-xs opacity-70">
                      يوجد لديك حالياً <strong className="text-red-500">{history.length}</strong> عنصر في السجل المحفوظ محلياً.
                    </p>
                  </div>
                  {confirmClear ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onClearHistory();
                          setConfirmClear(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
                      >
                        نعم، امسح الكل
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 text-xs font-bold hover:bg-zinc-700"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      disabled={history.length === 0}
                      className="px-5 py-2.5 rounded-2xl border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold text-xs transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      مسح السجل الآن
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIO & SPEECH */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              <div className="p-5 rounded-3xl border border-inherit bg-black/[0.02] dark:bg-white/[0.02] space-y-4">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Volume2 size={18} className="text-amber-500" />
                  <span>محرك تحويل النص إلى كلام (TTS)</span>
                </h3>
                <p className="text-xs opacity-60">
                  يعتمد التطبيق على نطق ذكي وسلس يدعم جميع اللغات واللهجات مع إمكانية تعديل سرعة الصوت والنبرة.
                </p>

                {/* Voice Selection */}
                {availableVoices.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-75">اختر الصوت المفضل:</label>
                    <select
                      value={ttsSettings.voiceName}
                      onChange={(e) => onChangeTtsSettings({ ...ttsSettings, voiceName: e.target.value })}
                      className="w-full p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit text-xs font-bold focus:outline-none"
                    >
                      <option value="">الصوت الافتراضي الذكي</option>
                      {availableVoices.map((v) => (
                        <option key={v} value={v} className="bg-zinc-900 text-white">
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Speed / Rate */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">سرعة النطق:</span>
                    <span className="font-mono text-amber-500 font-bold">{ttsSettings.rate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsSettings.rate}
                    onChange={(e) => onChangeTtsSettings({ ...ttsSettings, rate: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                  />
                </div>

                {/* Pitch */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">نبرة الصوت:</span>
                    <span className="font-mono text-amber-500 font-bold">{ttsSettings.pitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsSettings.pitch}
                    onChange={(e) => onChangeTtsSettings({ ...ttsSettings, pitch: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-inherit bg-black/[0.04] dark:bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] opacity-50 font-medium">
            Mahdi Translate Pro • جميع التغييرات تُحفظ تلقائياً في ذاكرة المتصفح
          </span>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-2xl text-xs font-bold ${currentTheme.primary} shadow-md hover:brightness-110 active:scale-95 transition-all`}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
