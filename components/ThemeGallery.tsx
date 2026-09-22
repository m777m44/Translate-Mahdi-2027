import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Dice5,
  Heart,
  History,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Sun,
  Moon,
  Glasses,
  SlidersHorizontal,
  Wand2,
  X,
} from 'lucide-react';
import { useTheme } from '../themeContext.tsx';
import {
  BG_STYLES,
  SHAPES,
  createCustomTheme,
  filterThemes,
  themeCssVars,
} from '../themeEngine.ts';
import { PATTERN_IDS, patternLabel } from '../themePatterns.ts';
import { ThemeCategoryId, ThemeConfig, ThemePattern, ThemeShapeId } from '../types.ts';
import { THEME_CATEGORIES } from '../themeRegistry.ts';

interface ThemeGalleryProps {
  /** 'full' shows the appearance studio + customiser, 'compact' is just the picker. */
  variant?: 'full' | 'compact';
  /** Called after a theme is applied (the gallery already applied it itself). */
  onApplied?: (theme: ThemeConfig) => void;
  maxHeightClass?: string;
}

const PAGE_SIZE = 60;

/** A tiny, cheap preview tile: it uses the theme's own tokens, no extra CSS. */
const ThemeTile: React.FC<{
  theme: ThemeConfig;
  active: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}> = ({ theme, active, favorite, onSelect, onToggleFavorite }) => {
  const c = theme.colors;
  return (
    <button
      onClick={onSelect}
      className="relative group text-right rounded-2xl p-2 border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: c.bg,
        borderColor: active ? c.accent : c.border,
        boxShadow: active ? `0 0 0 2px ${c.accent}55, ${theme.shape.shadow}` : theme.shape.shadow,
        borderRadius: `${Math.min(theme.shape.radius, 22)}px`,
      }}
      title={theme.nameAr}
    >
      {/* Mini app mockup rendered with the theme's own colours */}
      <span
        className="block w-full h-10 mb-1.5 border overflow-hidden flex flex-col justify-center gap-1 p-1.5"
        style={{
          background: c.card,
          borderColor: c.border,
          borderRadius: `${Math.min(theme.shape.radius * 0.6, 14)}px`,
          backdropFilter: theme.shape.blur ? `blur(${theme.shape.blur}px)` : undefined,
        }}
      >
        <span className="block h-1.5 w-3/4 rounded-full" style={{ background: c.text, opacity: 0.85 }} />
        <span className="block h-1.5 w-1/2 rounded-full" style={{ background: c.subtext, opacity: 0.8 }} />
        <span className="mt-0.5 block h-2 w-2/5 rounded-full" style={{ background: theme.shape.gradientPrimary ? `linear-gradient(90deg, ${c.primary}, ${c.secondary})` : c.primary }} />
      </span>

      <span className="block text-[10px] font-bold leading-tight truncate" style={{ color: c.text }}>
        {theme.nameAr}
      </span>
      <span className="flex items-center gap-1 mt-0.5">
        <span className="w-2 h-2 rounded-full" style={{ background: c.primary }} />
        <span className="w-2 h-2 rounded-full" style={{ background: c.accent }} />
        <span className="w-2 h-2 rounded-full" style={{ background: c.secondary }} />
        {theme.isGlass && <span className="text-[8px] font-bold opacity-70" style={{ color: c.subtext }}>زجاجي</span>}
      </span>

      {active && (
        <span
          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: c.accent, color: c.bg }}
        >
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      <span
        role="button"
        tabIndex={0}
        aria-label={favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }
        }}
        className="absolute bottom-1.5 left-1.5 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: favorite ? `${c.accent}33` : `${c.text}14`, color: favorite ? c.accent : c.subtext }}
      >
        <Heart size={11} className={favorite ? 'fill-current' : ''} />
      </span>
    </button>
  );
};

export const ThemeGallery: React.FC<ThemeGalleryProps> = ({ variant = 'full', onApplied, maxHeightClass = 'max-h-[46vh]' }) => {
  const { theme, appearance, setTheme, updateAppearance, resetAppearance, toggleFavorite, isFavorite, pickRandomTheme, total } = useTheme();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ThemeCategoryId | 'all'>('all');
  const [darkOnly, setDarkOnly] = useState(false);
  const [lightOnly, setLightOnly] = useState(false);
  const [glassOnly, setGlassOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [studioOpen, setStudioOpen] = useState(false);

  // Custom studio state
  const [customAccent, setCustomAccent] = useState(theme.colors.primary);
  const [customBg, setCustomBg] = useState<string>(BG_STYLES[0].id);
  const [customShape, setCustomShape] = useState<ThemeShapeId>(theme.shape.id);
  const [customPattern, setCustomPattern] = useState<ThemePattern>(theme.shape.pattern);
  const [customOpacity, setCustomOpacity] = useState(appearance.cardOpacity);
  const [customBlur, setCustomBlur] = useState(appearance.glassBlur);
  const [customRadius, setCustomRadius] = useState(theme.shape.radius);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      filterThemes({
        query,
        category,
        favorites: appearance.favoriteThemeIds,
        darkOnly: darkOnly && !lightOnly ? true : false,
        glassOnly,
      }).filter(t => (lightOnly && !darkOnly ? !t.isDark : true)),
    [query, category, appearance.favoriteThemeIds, darkOnly, lightOnly, glassOnly]
  );

  // Reset paging whenever the result set changes.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, category, darkOnly, lightOnly, glassOnly]);

  // Infinite scroll inside the gallery grid.
  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const onScroll = () => {
      if (node.scrollTop + node.clientHeight >= node.scrollHeight - 240) {
        setVisible(v => (v < filtered.length ? v + PAGE_SIZE : v));
      }
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [filtered.length]);

  const applyCustom = () => {
    const built = createCustomTheme({
      accentColor: customAccent,
      cardOpacity: customOpacity,
      glassBlur: customBlur,
      borderRadius: customRadius,
      bgStyle: customBg,
      glowAnimation: true,
      pattern: customPattern,
      shape: customShape,
    });
    setTheme(built);
    updateAppearance({ cardOpacity: customOpacity, glassBlur: customBlur });
    onApplied?.(built);
  };

  const customPreview = useMemo(() => {
    const built = createCustomTheme({
      accentColor: customAccent,
      cardOpacity: customOpacity,
      glassBlur: customBlur,
      borderRadius: customRadius,
      bgStyle: customBg,
      glowAnimation: true,
      pattern: customPattern,
      shape: customShape,
    });
    return { theme: built, vars: themeCssVars(built, { ...appearance, cardOpacity: customOpacity, glassBlur: customBlur }) };
  }, [customAccent, customOpacity, customBlur, customRadius, customBg, customPattern, customShape, appearance]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ---------- Toolbar ---------- */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`ابحث في ${total} ثيم… (لون، شكل، عربي / English)`}
              className="mt-input pr-9 pl-8 py-2 text-xs"
              aria-label="البحث في الثيمات"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100" aria-label="مسح البحث">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              const next = pickRandomTheme();
              onApplied?.(next);
            }}
            className="mt-btn px-3 py-2 text-xs"
            title="ثيم عشوائي مميز"
          >
            <Dice5 size={15} />
            <span className="hidden sm:inline">عشوائي</span>
          </button>

          {variant === 'full' && (
            <button onClick={() => setStudioOpen(v => !v)} className="mt-btn mt-btn-primary px-3 py-2 text-xs">
              <Wand2 size={15} />
              <span className="hidden sm:inline">الاستوديو</span>
            </button>
          )}
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button className="mt-chip" data-active={category === 'favorites'} onClick={() => setCategory('favorites')}>
            <Star size={12} /> المفضلة ({appearance.favoriteThemeIds.length})
          </button>
          <button className="mt-chip" data-active={darkOnly} onClick={() => { setDarkOnly(v => !v); setLightOnly(false); }}>
            <Moon size={12} /> داكن
          </button>
          <button className="mt-chip" data-active={lightOnly} onClick={() => { setLightOnly(v => !v); setDarkOnly(false); }}>
            <Sun size={12} /> فاتح
          </button>
          <button className="mt-chip" data-active={glassOnly} onClick={() => setGlassOnly(v => !v)}>
            <Glasses size={12} /> زجاجي
          </button>
          <button
            className="mt-chip"
            onClick={() => {
              const recent = appearance.recentThemeIds[1] || appearance.recentThemeIds[0];
              if (recent) {
                const t = filtered.find(x => x.id === recent);
                if (t) {
                  setTheme(t);
                  onApplied?.(t);
                }
              }
            }}
            title="رجوع للثيم السابق"
          >
            <History size={12} /> السابق
          </button>
          <span className="mt-chip opacity-70">{filtered.length} ثيم</span>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-no-scrollbar">
          {THEME_CATEGORIES.map(cat => (
            <button key={cat.id} className="mt-chip" data-active={category === cat.id} onClick={() => setCategory(cat.id)}>
              <span aria-hidden>{cat.icon}</span>
              {cat.nameAr}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Grid ---------- */}
      <div ref={gridRef} className={`${maxHeightClass} overflow-y-auto mt-scroll rounded-2xl p-1`}>
        {shown.length === 0 ? (
          <div className="py-10 text-center text-xs opacity-60">لا توجد ثيمات مطابقة لبحثك.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {shown.map(t => (
              <ThemeTile
                key={t.id}
                theme={t}
                active={theme.id === t.id}
                favorite={isFavorite(t.id)}
                onSelect={() => {
                  setTheme(t);
                  onApplied?.(t);
                }}
                onToggleFavorite={() => toggleFavorite(t.id)}
              />
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-2" />
        {visible < filtered.length && (
          <button onClick={() => setVisible(v => v + PAGE_SIZE)} className="mt-btn w-full mt-2 py-2 text-xs">
            عرض {Math.min(PAGE_SIZE, filtered.length - visible)} ثيم إضافي ({filtered.length - visible} متبقٍ)
          </button>
        )}
      </div>

      {/* ---------- Appearance studio ---------- */}
      {variant === 'full' && (
        <div className="mt-surface-soft p-4 flex flex-col gap-4 border" style={{ borderColor: 'var(--mt-border)', borderRadius: 'var(--mt-radius)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              <SlidersHorizontal size={16} className="mt-accent-text" />
              <span>ضبط المظهر — يُطبّق على التطبيق بالكامل</span>
            </div>
            <button onClick={resetAppearance} className="mt-chip">
              <RotateCcw size={12} /> إعادة الضبط
            </button>
          </div>

          <Slider label="شفافية خانة الترجمة" value={appearance.cardOpacity} min={0} max={100} step={2} unit="%" onChange={v => updateAppearance({ cardOpacity: v })} hint={`${appearance.cardOpacity}% — صفر = زجاج شفاف بالكامل`} />
          <Slider label="درجة الضبابية (Blur)" value={appearance.glassBlur} min={0} max={40} step={1} unit="px" onChange={v => updateAppearance({ glassBlur: v })} />
          <Slider label="انحناء الحواف" value={appearance.radiusScale} min={50} max={150} step={5} unit="%" onChange={v => updateAppearance({ radiusScale: v })} />
          <Slider label="حجم الخط" value={appearance.textScale} min={80} max={140} step={5} unit="%" onChange={v => updateAppearance({ textScale: v })} />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Toggle label="خلفية متحركة" active={appearance.animateBackground} onClick={() => updateAppearance({ animateBackground: !appearance.animateBackground })} />
            <Toggle label="توهج محيطي" active={appearance.showGlow} onClick={() => updateAppearance({ showGlow: !appearance.showGlow })} />
            <Toggle label="تباين عالٍ" active={appearance.highContrast} onClick={() => updateAppearance({ highContrast: !appearance.highContrast })} />
            <Toggle label="تقليل الحركة" active={appearance.reduceMotion} onClick={() => updateAppearance({ reduceMotion: !appearance.reduceMotion })} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold opacity-70">نقشة الخلفية</span>
            <div className="flex flex-wrap gap-1.5">
              <button className="mt-chip" data-active={appearance.pattern === 'theme'} onClick={() => updateAppearance({ pattern: 'theme' })}>
                حسب الثيم
              </button>
              {PATTERN_IDS.map(p => (
                <button key={p} className="mt-chip" data-active={appearance.pattern === p} onClick={() => updateAppearance({ pattern: p })}>
                  {patternLabel(p)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Custom studio ---------- */}
      {variant === 'full' && studioOpen && (
        <div className="mt-surface-soft p-4 flex flex-col gap-4 border" style={{ borderColor: 'var(--mt-border)', borderRadius: 'var(--mt-radius)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Palette size={16} className="mt-accent-text" />
              <span>استوديو الثيمات — اصنع ثيمك الخاص</span>
            </div>
            <button onClick={applyCustom} className="mt-btn mt-btn-primary px-4 py-2 text-xs">
              <Sparkles size={14} /> تطبيق الثيم
            </button>
          </div>

          {/* Live preview */}
          <div
            className="p-4 flex flex-col gap-2 border"
            style={{
              background: customPreview.vars['--mt-bg'],
              backgroundImage: customPreview.vars['--mt-bg-image'],
              borderRadius: 'var(--mt-radius)',
              borderColor: customPreview.vars['--mt-border'],
            }}
          >
            <div
              className="p-3 border"
              style={{
                background: customPreview.vars['--mt-card'],
                backdropFilter: `blur(${customBlur}px)`,
                borderRadius: `${customRadius}px`,
                borderColor: customPreview.vars['--mt-border'],
              }}
            >
              <div className="text-sm font-bold" style={{ color: customPreview.vars['--mt-text'] }}>معاينة حية للثيم</div>
              <div className="text-xs mt-1" style={{ color: customPreview.vars['--mt-subtext'] }}>هكذا ستظهر خانات الترجمة والقوائم.</div>
              <div
                className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold inline-block"
                style={{ background: customPreview.vars['--mt-primary'], color: customPreview.vars['--mt-on-primary'] }}
              >
                زر رئيسي
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold opacity-70">اللون الأساسي</span>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="color"
                value={customAccent}
                onChange={(e) => setCustomAccent(e.target.value)}
                className="w-12 h-9 rounded-xl border cursor-pointer"
                style={{ borderColor: 'var(--mt-border)', background: 'transparent' }}
                aria-label="اختر اللون الأساسي"
              />
              {['#f5b544', '#22d3ee', '#10b981', '#3b82f6', '#a855f7', '#fb7185', '#ff5a1f', '#ffffff', '#111827'].map(c => (
                <button
                  key={c}
                  onClick={() => setCustomAccent(c)}
                  className="w-7 h-7 rounded-full border transition-transform hover:scale-110"
                  style={{ background: c, borderColor: customAccent.toLowerCase() === c ? 'var(--mt-accent)' : 'var(--mt-border)' }}
                  aria-label={`لون ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold opacity-70">قاعدة الخلفية</span>
            <div className="flex flex-wrap gap-1.5">
              {BG_STYLES.map(b => (
                <button key={b.id} className="mt-chip" data-active={customBg === b.id} onClick={() => setCustomBg(b.id)}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: b.accent }} />
                  {b.nameAr}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold opacity-70">الشكل والتصميم</span>
            <div className="flex flex-wrap gap-1.5">
              {SHAPES.map(s => (
                <button key={s.id} className="mt-chip" data-active={customShape === s.id} onClick={() => setCustomShape(s.id)}>
                  {s.nameAr}
                </button>
              ))}
            </div>
          </div>

          <Slider label="شفافية البطاقات" value={customOpacity} min={0} max={100} step={2} unit="%" onChange={setCustomOpacity} />
          <Slider label="الضبابية" value={customBlur} min={0} max={40} step={1} unit="px" onChange={setCustomBlur} />
          <Slider label="انحناء الحواف" value={customRadius} min={0} max={44} step={1} unit="px" onChange={setCustomRadius} />
        </div>
      )}
    </div>
  );
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', hint, onChange }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-bold opacity-80">{label}</span>
      <span className="font-mono font-bold mt-accent-text">{value}{unit}</span>
    </div>
    <input
      type="range"
      className="mt-range w-full"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
    />
    {hint && <span className="text-[10px] opacity-55">{hint}</span>}
  </div>
);

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} className="mt-chip justify-between w-full py-2" data-active={active}>
    <span>{label}</span>
    <span className="w-2 h-2 rounded-full" style={{ background: active ? 'var(--mt-on-primary)' : 'var(--mt-border-strong)' }} />
  </button>
);
