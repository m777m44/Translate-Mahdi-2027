/**
 * ============================================================================
 *  Mahdi Translate Pro — Theme Engine (محرك الثيمات)
 * ----------------------------------------------------------------------------
 *  A deterministic, dependency-free design system that produces 1000+ fully
 *  resolved themes. Every theme is token-based (real hex colours), which means
 *  it can be applied to *any* surface of the app through CSS custom properties
 *  — not only to the handful of Tailwind utility strings the old registry had.
 *
 *  Architecture:
 *    palette family (colour identity)  ×  shape preset (geometry & texture)
 *      → ThemeConfig { colors, shape, backgroundImage, tailwind classes }
 *
 *  Everything is deterministic: the same id always produces the same theme, so
 *  a theme saved to localStorage is restored pixel-perfectly.
 * ============================================================================
 */

import {
  AppearanceOptions,
  ThemeCategoryId,
  ThemeColors,
  ThemeConfig,
  ThemePattern,
  ThemeShape,
  ThemeShapeId,
} from './types.ts';

/* ============================================================================
 * 1. COLOUR MATH
 * ==========================================================================*/

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number) => Math.round(v);

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3 || h.length === 4) {
    h = h.split('').map(c => c + c).join('');
  }
  const int = parseInt(h.slice(0, 6) || '000000', 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (n: number) => clamp(round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h: round(h) % 360, s: round(s * 100), l: round(l * 100) };
}

function hue2rgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  return {
    r: hue2rgb(p, q, hn + 1 / 3) * 255,
    g: hue2rgb(p, q, hn) * 255,
    b: hue2rgb(p, q, hn - 1 / 3) * 255,
  };
}

export const hslToHex = (h: number, s: number, l: number) => rgbToHex(hslToRgb({ h, s, l }));
export const hexToHsl = (hex: string): HSL => rgbToHsl(hexToRgb(hex));

/** Relative luminance (WCAG). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite `fg` (with alpha 0..1) over `bg`. */
export function mixHex(fg: string, bg: string, alpha: number): string {
  const f = hexToRgb(fg), b = hexToRgb(bg);
  return rgbToHex({
    r: f.r * alpha + b.r * (1 - alpha),
    g: f.g * alpha + b.g * (1 - alpha),
    b: f.b * alpha + b.b * (1 - alpha),
  });
}

export const lighten = (hex: string, amount: number) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l + amount, 0, 100));
};
export const darken = (hex: string, amount: number) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l - amount, 0, 100));
};
export const saturate = (hex: string, amount: number) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s + amount, 0, 100), l);
};
export const rotateHue = (hex: string, deg: number) => {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + deg, s, l);
};

/** 6-digit hex + 2-digit alpha (browsers + Tailwind arbitrary values both accept it). */
export function withAlpha(hex: string, alpha: number): string {
  const a = clamp(round(alpha * 255), 0, 255).toString(16).padStart(2, '0');
  return `${rgbToHex(hexToRgb(hex))}${a}`;
}

export function rgbaString(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${round(r)}, ${round(g)}, ${round(b)}, ${alpha})`;
}

/** Best readable text colour (near-white or near-black) for a given background. */
export function readableOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#0b0b0f', bg) ? '#ffffff' : '#0b0b0f';
}

/**
 * Nudges the lightness of `fg` until it reaches `minRatio` against `bg`.
 * This is what keeps 1200+ generated themes legible instead of muddy.
 */
export function ensureContrast(fg: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  const bgIsDark = luminance(bg) < 0.4;
  let { h, s, l } = hexToHsl(fg);
  const step = bgIsDark ? 3 : -3;
  for (let i = 0; i < 40; i++) {
    l = clamp(l + step, 0, 100);
    const candidate = hslToHex(h, s, l);
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
    if (l <= 0 || l >= 100) break;
  }
  return bgIsDark ? '#f8fafc' : '#0b0b0f';
}

/* ============================================================================
 * 2. BACKGROUND PATTERNS
 * ==========================================================================*/

export const PATTERN_CSS: Record<ThemePattern, (accent: string, text: string) => string> = {
  none: () => 'none',
  dots: (a) => `radial-gradient(${withAlpha(a, 0.16)} 1px, transparent 1.4px)`,
  grid: (a) =>
    `linear-gradient(${withAlpha(a, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(a, 0.1)} 1px, transparent 1px)`,
  waves: (a) =>
    `repeating-radial-gradient(circle at 10% 0%, ${withAlpha(a, 0.09)} 0 1px, transparent 1px 26px)`,
  arabesque: (a) =>
    `repeating-conic-gradient(from 45deg at 50% 50%, ${withAlpha(a, 0.09)} 0deg 22deg, transparent 22deg 90deg)`,
  mesh: (a) =>
    `radial-gradient(at 12% 18%, ${withAlpha(a, 0.28)} 0px, transparent 55%), radial-gradient(at 88% 8%, ${withAlpha(rotateHue(a, 40), 0.24)} 0px, transparent 50%), radial-gradient(at 70% 92%, ${withAlpha(rotateHue(a, -35), 0.22)} 0px, transparent 55%)`,
  aurora: (a) =>
    `radial-gradient(60% 45% at 20% 10%, ${withAlpha(a, 0.32)} 0px, transparent 70%), radial-gradient(55% 40% at 85% 20%, ${withAlpha(rotateHue(a, 60), 0.28)} 0px, transparent 70%), radial-gradient(70% 50% at 50% 100%, ${withAlpha(rotateHue(a, -55), 0.26)} 0px, transparent 70%)`,
  rays: (a) =>
    `repeating-linear-gradient(115deg, ${withAlpha(a, 0.08)} 0 2px, transparent 2px 16px)`,
  noise: (t) =>
    `repeating-conic-gradient(${withAlpha(t, 0.035)} 0% 25%, transparent 0% 50%)`,
  hex: (a) =>
    `radial-gradient(circle at 50% 50%, ${withAlpha(a, 0.14)} 2px, transparent 2.6px), radial-gradient(circle at 0% 50%, ${withAlpha(a, 0.1)} 2px, transparent 2.6px)`,
  diamonds: (a) =>
    `repeating-linear-gradient(45deg, ${withAlpha(a, 0.08)} 0 1px, transparent 1px 20px), repeating-linear-gradient(-45deg, ${withAlpha(a, 0.08)} 0 1px, transparent 1px 20px)`,
  stars: (a) =>
    `radial-gradient(${withAlpha(a, 0.5)} 0.8px, transparent 1.2px), radial-gradient(${withAlpha(a, 0.25)} 0.6px, transparent 1px)`,
  topography: (a) =>
    `repeating-radial-gradient(circle at 30% 30%, ${withAlpha(a, 0.08)} 0 1px, transparent 1px 14px), repeating-radial-gradient(circle at 75% 70%, ${withAlpha(a, 0.06)} 0 1px, transparent 1px 18px)`,
  circuit: (a) =>
    `linear-gradient(${withAlpha(a, 0.12)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(a, 0.12)} 1px, transparent 1px), radial-gradient(${withAlpha(a, 0.3)} 1.6px, transparent 2px)`,
  silk: (a) =>
    `repeating-linear-gradient(100deg, ${withAlpha(a, 0.07)} 0 3px, transparent 3px 9px)`,
};

/** background-size companion for each pattern. */
export const PATTERN_SIZE: Record<ThemePattern, string> = {
  none: 'auto',
  dots: '22px 22px',
  grid: '34px 34px, 34px 34px',
  waves: 'auto',
  arabesque: '64px 64px',
  mesh: 'auto',
  aurora: 'auto',
  rays: 'auto',
  noise: '8px 8px',
  hex: '30px 52px',
  diamonds: 'auto',
  stars: '60px 60px, 26px 26px',
  topography: 'auto',
  circuit: '38px 38px, 38px 38px, 38px 38px',
  silk: 'auto',
};

/* ============================================================================
 * 3. SHAPE PRESETS — the "form" of a theme
 * ==========================================================================*/

const F = {
  cairo: "'Cairo', 'Inter', system-ui, sans-serif",
  tajawal: "'Tajawal', 'Cairo', system-ui, sans-serif",
  reem: "'Reem Kufi', 'Cairo', serif",
  amiri: "'Amiri', 'Cairo', serif",
  inter: "'Inter', 'Cairo', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Cairo', ui-monospace, monospace",
  orbitron: "'Orbitron', 'Cairo', system-ui, sans-serif",
};

interface ShapePreset extends ThemeShape {
  /** Small hue rotation so every family×shape pair is visually distinct. */
  hueShift: number;
  /** Hue rotation for the secondary colour. */
  secondaryShift: number;
  /** Lightness shift applied to the page background. */
  bgShift: number;
  /** Extra saturation applied to the accent. */
  saturationBoost: number;
  /** Forces a light or dark base regardless of the family mood. */
  forceMood?: 'dark' | 'light';
}

const SHAPE_PRESETS: ShapePreset[] = [
  {
    id: 'rounded', nameAr: 'منحني ناعم', radius: 24, radiusSm: 14, blur: 0, glassOpacity: 100,
    borderWidth: 1, shadow: '0 18px 40px -22px rgba(0,0,0,.65)', pattern: 'none',
    gradientPrimary: false, fontHeading: F.cairo, fontBody: F.cairo, glow: false,
    tracking: 'normal', hueShift: 0, secondaryShift: 28, bgShift: 0, saturationBoost: 0,
  },
  {
    id: 'squircle', nameAr: 'مربع منحني', radius: 32, radiusSm: 18, blur: 6, glassOpacity: 94,
    borderWidth: 1, shadow: '0 22px 48px -26px rgba(0,0,0,.7)', pattern: 'dots',
    gradientPrimary: false, fontHeading: F.tajawal, fontBody: F.tajawal, glow: false,
    tracking: 'normal', hueShift: 6, secondaryShift: -32, bgShift: 2, saturationBoost: 4,
  },
  {
    id: 'pill', nameAr: 'كبسولي', radius: 999, radiusSm: 999, blur: 8, glassOpacity: 96,
    borderWidth: 1, shadow: '0 16px 34px -20px rgba(0,0,0,.6)', pattern: 'none',
    gradientPrimary: true, fontHeading: F.tajawal, fontBody: F.inter, glow: false,
    tracking: 'normal', hueShift: -8, secondaryShift: 45, bgShift: -1, saturationBoost: 6,
  },
  {
    id: 'sharp', nameAr: 'حاد هندسي', radius: 6, radiusSm: 4, blur: 0, glassOpacity: 100,
    borderWidth: 1, shadow: '0 10px 26px -18px rgba(0,0,0,.75)', pattern: 'grid',
    gradientPrimary: false, fontHeading: F.inter, fontBody: F.inter, glow: false,
    tracking: '0.01em', hueShift: 12, secondaryShift: -50, bgShift: 1, saturationBoost: -4,
  },
  {
    id: 'glass', nameAr: 'زجاجي شفاف', radius: 28, radiusSm: 16, blur: 22, glassOpacity: 22,
    borderWidth: 1, shadow: '0 26px 60px -30px rgba(0,0,0,.8)', pattern: 'mesh',
    gradientPrimary: true, fontHeading: F.cairo, fontBody: F.cairo, glow: true,
    tracking: 'normal', hueShift: 0, secondaryShift: 60, bgShift: -2, saturationBoost: 10,
  },
  {
    id: 'silk', nameAr: 'حريري متدرج', radius: 30, radiusSm: 18, blur: 14, glassOpacity: 56,
    borderWidth: 1, shadow: '0 24px 54px -30px rgba(0,0,0,.7)', pattern: 'silk',
    gradientPrimary: true, fontHeading: F.tajawal, fontBody: F.tajawal, glow: true,
    tracking: 'normal', hueShift: -14, secondaryShift: 22, bgShift: 0, saturationBoost: 8,
  },
  {
    id: 'metal', nameAr: 'معدني مصقول', radius: 18, radiusSm: 10, blur: 4, glassOpacity: 90,
    borderWidth: 1, shadow: '0 14px 30px -18px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.06)',
    pattern: 'rays', gradientPrimary: true, fontHeading: F.inter, fontBody: F.inter, glow: false,
    tracking: '0.02em', hueShift: 18, secondaryShift: -18, bgShift: 1, saturationBoost: -8,
  },
  {
    id: 'neumorph', nameAr: 'نيمورفيك بارز', radius: 22, radiusSm: 14, blur: 0, glassOpacity: 100,
    borderWidth: 0, shadow: '10px 10px 24px rgba(0,0,0,.45), -8px -8px 20px rgba(255,255,255,.05)',
    pattern: 'none', gradientPrimary: false, fontHeading: F.cairo, fontBody: F.cairo, glow: false,
    tracking: 'normal', hueShift: 4, secondaryShift: 35, bgShift: 3, saturationBoost: -12,
  },
  {
    id: 'brutalist', nameAr: 'بروتاليست صريح', radius: 0, radiusSm: 0, blur: 0, glassOpacity: 100,
    borderWidth: 2, shadow: '6px 6px 0 rgba(0,0,0,.55)', pattern: 'dots',
    gradientPrimary: false, fontHeading: F.mono, fontBody: F.inter, glow: false,
    tracking: '0.04em', hueShift: -22, secondaryShift: 90, bgShift: 2, saturationBoost: 14,
  },
  {
    id: 'terminal', nameAr: 'طرفية تقنية', radius: 8, radiusSm: 6, blur: 2, glassOpacity: 92,
    borderWidth: 1, shadow: '0 0 0 1px rgba(255,255,255,.04), 0 12px 30px -20px rgba(0,0,0,.9)',
    pattern: 'circuit', gradientPrimary: false, fontHeading: F.mono, fontBody: F.mono, glow: true,
    tracking: '0.06em', hueShift: 26, secondaryShift: -70, bgShift: -3, saturationBoost: 16, forceMood: 'dark',
  },
  {
    id: 'royal', nameAr: 'ملكي مذهّب', radius: 20, radiusSm: 12, blur: 8, glassOpacity: 88,
    borderWidth: 2, shadow: '0 22px 50px -26px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.08)',
    pattern: 'arabesque', gradientPrimary: true, fontHeading: F.reem, fontBody: F.cairo, glow: true,
    tracking: '0.01em', hueShift: -6, secondaryShift: 12, bgShift: -1, saturationBoost: 6,
  },
  {
    id: 'aurora', nameAr: 'شفق قطبي', radius: 34, radiusSm: 20, blur: 26, glassOpacity: 18,
    borderWidth: 1, shadow: '0 30px 70px -34px rgba(0,0,0,.85)', pattern: 'aurora',
    gradientPrimary: true, fontHeading: F.tajawal, fontBody: F.tajawal, glow: true,
    tracking: 'normal', hueShift: 10, secondaryShift: 120, bgShift: -3, saturationBoost: 18,
  },
  {
    id: 'desert', nameAr: 'صحراوي دافئ', radius: 22, radiusSm: 14, blur: 6, glassOpacity: 84,
    borderWidth: 1, shadow: '0 20px 44px -26px rgba(0,0,0,.7)', pattern: 'topography',
    gradientPrimary: true, fontHeading: F.amiri, fontBody: F.tajawal, glow: false,
    tracking: 'normal', hueShift: 20, secondaryShift: -40, bgShift: 2, saturationBoost: -2,
  },
  {
    id: 'heritage', nameAr: 'تراثي أندلسي', radius: 16, radiusSm: 10, blur: 6, glassOpacity: 90,
    borderWidth: 2, shadow: '0 18px 40px -24px rgba(0,0,0,.8)', pattern: 'arabesque',
    gradientPrimary: true, fontHeading: F.amiri, fontBody: F.amiri, glow: false,
    tracking: 'normal', hueShift: -18, secondaryShift: 30, bgShift: 0, saturationBoost: 4,
  },
  {
    id: 'cyber', nameAr: 'سايبر نيوني', radius: 12, radiusSm: 8, blur: 12, glassOpacity: 40,
    borderWidth: 1, shadow: '0 0 26px -6px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)',
    pattern: 'circuit', gradientPrimary: true, fontHeading: F.orbitron, fontBody: F.inter, glow: true,
    tracking: '0.08em', hueShift: 34, secondaryShift: 150, bgShift: -4, saturationBoost: 26, forceMood: 'dark',
  },
  {
    id: 'pastel', nameAr: 'باستيل هادئ', radius: 26, radiusSm: 16, blur: 10, glassOpacity: 72,
    borderWidth: 1, shadow: '0 16px 34px -22px rgba(0,0,0,.35)', pattern: 'dots',
    gradientPrimary: false, fontHeading: F.tajawal, fontBody: F.tajawal, glow: false,
    tracking: 'normal', hueShift: -4, secondaryShift: 40, bgShift: 8, saturationBoost: -26, forceMood: 'light',
  },
  {
    id: 'neon', nameAr: 'نيون ليلي', radius: 20, radiusSm: 12, blur: 14, glassOpacity: 34,
    borderWidth: 1, shadow: '0 0 34px -10px rgba(0,0,0,.95)', pattern: 'rays',
    gradientPrimary: true, fontHeading: F.orbitron, fontBody: F.cairo, glow: true,
    tracking: '0.05em', hueShift: -30, secondaryShift: 170, bgShift: -5, saturationBoost: 30, forceMood: 'dark',
  },
  {
    id: 'minimal', nameAr: 'تبسيطي صافٍ', radius: 14, radiusSm: 10, blur: 0, glassOpacity: 100,
    borderWidth: 1, shadow: '0 8px 20px -16px rgba(0,0,0,.6)', pattern: 'none',
    gradientPrimary: false, fontHeading: F.inter, fontBody: F.inter, glow: false,
    tracking: 'normal', hueShift: 0, secondaryShift: 0, bgShift: 6, saturationBoost: -30,
  },
  {
    id: 'crystal', nameAr: 'بلوري نقي', radius: 36, radiusSm: 22, blur: 30, glassOpacity: 14,
    borderWidth: 1, shadow: '0 34px 80px -38px rgba(0,0,0,.85)', pattern: 'diamonds',
    gradientPrimary: true, fontHeading: F.cairo, fontBody: F.cairo, glow: true,
    tracking: 'normal', hueShift: 8, secondaryShift: -60, bgShift: -2, saturationBoost: 12,
  },
  {
    id: 'velvet', nameAr: 'مخملي عميق', radius: 24, radiusSm: 14, blur: 8, glassOpacity: 78,
    borderWidth: 1, shadow: '0 24px 54px -30px rgba(0,0,0,.9)', pattern: 'noise',
    gradientPrimary: false, fontHeading: F.amiri, fontBody: F.cairo, glow: true,
    tracking: 'normal', hueShift: -12, secondaryShift: 18, bgShift: -2, saturationBoost: 2,
  },
];

export const SHAPES: ThemeShape[] = SHAPE_PRESETS.map(({ hueShift, secondaryShift, bgShift, saturationBoost, forceMood, ...rest }) => rest);

export function getShape(id: ThemeShapeId): ThemeShape {
  return SHAPES.find(s => s.id === id) || SHAPES[0];
}

/* ============================================================================
 * 4. PALETTE FAMILIES — the "colour identity"
 * ==========================================================================*/

interface PaletteFamily {
  id: string;
  name: string;
  nameAr: string;
  /** Arabic + English colour words used by the theme search box. */
  colorWordAr: string;
  colorWordEn: string;
  hue: number;
  sat: number;
  /** Base lightness of the dark background. */
  darkL: number;
  /** Base lightness of the light background. */
  lightL: number;
  /** Accent lightness for dark themes. */
  accentL: number;
  /** Accent lightness for light themes. */
  accentLightL: number;
  /** Preferred mood when the shape does not force one. */
  mood: 'dark' | 'light' | 'both';
  category: Exclude<ThemeCategoryId, 'all' | 'favorites' | 'custom'>;
}

const FAMILIES: PaletteFamily[] = [
  { id: 'gold', name: 'Imperial Gold', nameAr: 'الذهبي الملكي', colorWordAr: 'ذهبي', colorWordEn: 'gold', hue: 43, sat: 88, darkL: 6, lightL: 97, accentL: 58, accentLightL: 44, mood: 'dark', category: 'royal' },
  { id: 'amber', name: 'Amber Flame', nameAr: 'العنبري المتوهج', colorWordAr: 'عنبري', colorWordEn: 'amber', hue: 33, sat: 90, darkL: 7, lightL: 97, accentL: 56, accentLightL: 42, mood: 'both', category: 'sunset' },
  { id: 'bronze', name: 'Bronze Antique', nameAr: 'البرونزي العتيق', colorWordAr: 'برونزي', colorWordEn: 'bronze', hue: 26, sat: 62, darkL: 7, lightL: 96, accentL: 52, accentLightL: 38, mood: 'dark', category: 'heritage' },
  { id: 'copper', name: 'Copper Rose', nameAr: 'النحاسي الوردي', colorWordAr: 'نحاسي', colorWordEn: 'copper', hue: 18, sat: 70, darkL: 7, lightL: 97, accentL: 58, accentLightL: 42, mood: 'both', category: 'sunset' },
  { id: 'rose', name: 'Rose Quartz', nameAr: 'الكوارتز الوردي', colorWordAr: 'وردي', colorWordEn: 'rose', hue: 350, sat: 78, darkL: 7, lightL: 98, accentL: 64, accentLightL: 46, mood: 'both', category: 'pastel' },
  { id: 'pink', name: 'Blossom Pink', nameAr: 'الزهري المتفتح', colorWordAr: 'زهري', colorWordEn: 'pink', hue: 330, sat: 74, darkL: 8, lightL: 98, accentL: 66, accentLightL: 48, mood: 'both', category: 'pastel' },
  { id: 'magenta', name: 'Magenta Pulse', nameAr: 'الماجنتا النابض', colorWordAr: 'أرجواني وردي', colorWordEn: 'magenta', hue: 315, sat: 80, darkL: 7, lightL: 98, accentL: 62, accentLightL: 44, mood: 'dark', category: 'vivid' },
  { id: 'fuchsia', name: 'Fuchsia Neon', nameAr: 'الفوشيا النيوني', colorWordAr: 'فوشيا', colorWordEn: 'fuchsia', hue: 292, sat: 82, darkL: 7, lightL: 98, accentL: 64, accentLightL: 44, mood: 'dark', category: 'neon' },
  { id: 'purple', name: 'Amethyst Velvet', nameAr: 'الأميثيست البنفسجي', colorWordAr: 'بنفسجي', colorWordEn: 'purple', hue: 268, sat: 70, darkL: 7, lightL: 98, accentL: 64, accentLightL: 44, mood: 'both', category: 'dark' },
  { id: 'violet', name: 'Violet Dusk', nameAr: 'البنفسج الغسقي', colorWordAr: 'بنفسجي داكن', colorWordEn: 'violet', hue: 255, sat: 72, darkL: 7, lightL: 98, accentL: 66, accentLightL: 46, mood: 'dark', category: 'aurora' },
  { id: 'indigo', name: 'Indigo Depth', nameAr: 'النيلي العميق', colorWordAr: 'نيلي', colorWordEn: 'indigo', hue: 240, sat: 68, darkL: 8, lightL: 98, accentL: 66, accentLightL: 44, mood: 'dark', category: 'dark' },
  { id: 'blue', name: 'Sapphire Blue', nameAr: 'الياقوت الأزرق', colorWordAr: 'أزرق', colorWordEn: 'blue', hue: 218, sat: 82, darkL: 7, lightL: 98, accentL: 60, accentLightL: 44, mood: 'both', category: 'ocean' },
  { id: 'azure', name: 'Azure Sky', nameAr: 'الأزرق السماوي', colorWordAr: 'سماوي', colorWordEn: 'azure', hue: 205, sat: 84, darkL: 7, lightL: 98, accentL: 60, accentLightL: 42, mood: 'both', category: 'ocean' },
  { id: 'sky', name: 'Sky Breeze', nameAr: 'نسيم السماء', colorWordAr: 'أزرق فاتح', colorWordEn: 'sky', hue: 197, sat: 80, darkL: 8, lightL: 98, accentL: 60, accentLightL: 40, mood: 'both', category: 'ocean' },
  { id: 'cyan', name: 'Cyan Electric', nameAr: 'السماوي الكهربائي', colorWordAr: 'سماوي كهربائي', colorWordEn: 'cyan', hue: 187, sat: 86, darkL: 6, lightL: 98, accentL: 58, accentLightL: 36, mood: 'dark', category: 'neon' },
  { id: 'teal', name: 'Teal Lagoon', nameAr: 'الفيروزي البحيري', colorWordAr: 'فيروزي', colorWordEn: 'teal', hue: 173, sat: 70, darkL: 6, lightL: 98, accentL: 54, accentLightL: 34, mood: 'both', category: 'ocean' },
  { id: 'aqua', name: 'Aqua Marine', nameAr: 'الأكوا البحري', colorWordAr: 'أكوا', colorWordEn: 'aqua', hue: 165, sat: 74, darkL: 6, lightL: 98, accentL: 56, accentLightL: 34, mood: 'both', category: 'ocean' },
  { id: 'emerald', name: 'Emerald Crown', nameAr: 'الزمردي المتوج', colorWordAr: 'زمردي', colorWordEn: 'emerald', hue: 158, sat: 72, darkL: 6, lightL: 98, accentL: 54, accentLightL: 32, mood: 'both', category: 'nature' },
  { id: 'green', name: 'Forest Green', nameAr: 'أخضر الغابات', colorWordAr: 'أخضر', colorWordEn: 'green', hue: 142, sat: 64, darkL: 6, lightL: 98, accentL: 52, accentLightL: 30, mood: 'both', category: 'nature' },
  { id: 'lime', name: 'Lime Circuit', nameAr: 'الليموني الكهربائي', colorWordAr: 'ليموني', colorWordEn: 'lime', hue: 84, sat: 78, darkL: 6, lightL: 98, accentL: 62, accentLightL: 32, mood: 'dark', category: 'neon' },
  { id: 'olive', name: 'Olive Heritage', nameAr: 'الزيتوني التراثي', colorWordAr: 'زيتوني', colorWordEn: 'olive', hue: 72, sat: 46, darkL: 7, lightL: 97, accentL: 52, accentLightL: 32, mood: 'both', category: 'nature' },
  { id: 'moss', name: 'Moss Stone', nameAr: 'الطحلبي الحجري', colorWordAr: 'طحلبي', colorWordEn: 'moss', hue: 96, sat: 40, darkL: 7, lightL: 97, accentL: 50, accentLightL: 30, mood: 'dark', category: 'nature' },
  { id: 'mint', name: 'Mint Sorbet', nameAr: 'النعناعي المنعش', colorWordAr: 'نعناعي', colorWordEn: 'mint', hue: 152, sat: 56, darkL: 8, lightL: 98, accentL: 58, accentLightL: 36, mood: 'light', category: 'pastel' },
  { id: 'sand', name: 'Desert Sand', nameAr: 'رمال الصحراء', colorWordAr: 'رملي', colorWordEn: 'sand', hue: 38, sat: 52, darkL: 8, lightL: 97, accentL: 56, accentLightL: 38, mood: 'both', category: 'desert' },
  { id: 'camel', name: 'Camel Dune', nameAr: 'كثبان الجمال', colorWordAr: 'جملي', colorWordEn: 'camel', hue: 30, sat: 46, darkL: 8, lightL: 97, accentL: 54, accentLightL: 36, mood: 'both', category: 'desert' },
  { id: 'terracotta', name: 'Terracotta Clay', nameAr: 'الطيني المحروق', colorWordAr: 'طيني', colorWordEn: 'terracotta', hue: 12, sat: 64, darkL: 7, lightL: 97, accentL: 56, accentLightL: 40, mood: 'both', category: 'desert' },
  { id: 'coral', name: 'Coral Reef', nameAr: 'المرجاني البحري', colorWordAr: 'مرجاني', colorWordEn: 'coral', hue: 8, sat: 84, darkL: 7, lightL: 98, accentL: 62, accentLightL: 44, mood: 'both', category: 'sunset' },
  { id: 'red', name: 'Crimson Royal', nameAr: 'القرمزي الملكي', colorWordAr: 'أحمر', colorWordEn: 'red', hue: 356, sat: 80, darkL: 7, lightL: 98, accentL: 58, accentLightL: 42, mood: 'dark', category: 'royal' },
  { id: 'wine', name: 'Wine Velvet', nameAr: 'الخمري المخملي', colorWordAr: 'خمري', colorWordEn: 'wine', hue: 348, sat: 62, darkL: 6, lightL: 98, accentL: 52, accentLightL: 38, mood: 'dark', category: 'royal' },
  { id: 'orange', name: 'Sunset Orange', nameAr: 'البرتقالي الغروبي', colorWordAr: 'برتقالي', colorWordEn: 'orange', hue: 24, sat: 92, darkL: 7, lightL: 98, accentL: 58, accentLightL: 42, mood: 'both', category: 'sunset' },
  { id: 'tangerine', name: 'Tangerine Zest', nameAr: 'اليوسفي المنعش', colorWordAr: 'يوسفي', colorWordEn: 'tangerine', hue: 30, sat: 88, darkL: 7, lightL: 98, accentL: 58, accentLightL: 42, mood: 'light', category: 'vivid' },
  { id: 'yellow', name: 'Solar Yellow', nameAr: 'الأصفر الشمسي', colorWordAr: 'أصفر', colorWordEn: 'yellow', hue: 50, sat: 90, darkL: 6, lightL: 98, accentL: 62, accentLightL: 38, mood: 'both', category: 'vivid' },
  { id: 'chartreuse', name: 'Chartreuse Glow', nameAr: 'الأخضر المصفر', colorWordAr: 'أخضر مصفر', colorWordEn: 'chartreuse', hue: 66, sat: 80, darkL: 6, lightL: 98, accentL: 64, accentLightL: 32, mood: 'dark', category: 'vivid' },
  { id: 'turquoise', name: 'Turquoise Silk', nameAr: 'الفيروزي الحريري', colorWordAr: 'فيروزي حريري', colorWordEn: 'turquoise', hue: 178, sat: 66, darkL: 7, lightL: 98, accentL: 56, accentLightL: 34, mood: 'both', category: 'glass' },
  { id: 'steel', name: 'Steel Blue', nameAr: 'الأزرق الفولاذي', colorWordAr: 'فولاذي', colorWordEn: 'steel', hue: 210, sat: 24, darkL: 8, lightL: 97, accentL: 58, accentLightL: 38, mood: 'both', category: 'minimal' },
  { id: 'slate', name: 'Slate Stone', nameAr: 'الحجري الأردوازي', colorWordAr: 'حجري', colorWordEn: 'slate', hue: 215, sat: 16, darkL: 8, lightL: 97, accentL: 60, accentLightL: 36, mood: 'both', category: 'minimal' },
  { id: 'graphite', name: 'Graphite Mono', nameAr: 'الجرافيت الأحادي', colorWordAr: 'جرافيت', colorWordEn: 'graphite', hue: 220, sat: 8, darkL: 7, lightL: 97, accentL: 64, accentLightL: 30, mood: 'both', category: 'mono' },
  { id: 'carbon', name: 'Carbon Black', nameAr: 'الكربوني الأسود', colorWordAr: 'كربوني', colorWordEn: 'carbon', hue: 0, sat: 0, darkL: 4, lightL: 97, accentL: 62, accentLightL: 26, mood: 'dark', category: 'mono' },
  { id: 'ivory', name: 'Ivory Alabaster', nameAr: 'العاجي المرمرى', colorWordAr: 'عاجي', colorWordEn: 'ivory', hue: 40, sat: 30, darkL: 10, lightL: 98, accentL: 40, accentLightL: 30, mood: 'light', category: 'light' },
  { id: 'pearl', name: 'Pearl White', nameAr: 'اللؤلؤي الأبيض', colorWordAr: 'لؤلؤي', colorWordEn: 'pearl', hue: 210, sat: 20, darkL: 10, lightL: 99, accentL: 46, accentLightL: 34, mood: 'light', category: 'light' },
  { id: 'linen', name: 'Linen Natural', nameAr: 'الكتاني الطبيعي', colorWordAr: 'كتاني', colorWordEn: 'linen', hue: 36, sat: 34, darkL: 9, lightL: 98, accentL: 44, accentLightL: 32, mood: 'light', category: 'light' },
  { id: 'lavender', name: 'Lavender Dream', nameAr: 'اللافندر الحالم', colorWordAr: 'لافندر', colorWordEn: 'lavender', hue: 265, sat: 60, darkL: 8, lightL: 98, accentL: 62, accentLightL: 44, mood: 'both', category: 'pastel' },
  { id: 'lilac', name: 'Lilac Mist', nameAr: 'الأرجواني الضبابي', colorWordAr: 'أرجواني فاتح', colorWordEn: 'lilac', hue: 280, sat: 52, darkL: 8, lightL: 98, accentL: 64, accentLightL: 44, mood: 'light', category: 'pastel' },
  { id: 'peach', name: 'Peach Glow', nameAr: 'الخوخي المتوهج', colorWordAr: 'خوخي', colorWordEn: 'peach', hue: 20, sat: 84, darkL: 8, lightL: 98, accentL: 62, accentLightL: 44, mood: 'light', category: 'pastel' },
  { id: 'apricot', name: 'Apricot Silk', nameAr: 'المشمشي الحريري', colorWordAr: 'مشمشي', colorWordEn: 'apricot', hue: 34, sat: 82, darkL: 8, lightL: 98, accentL: 60, accentLightL: 42, mood: 'light', category: 'pastel' },
  { id: 'neon-green', name: 'Matrix Green', nameAr: 'الأخضر المصفوفي', colorWordAr: 'أخضر نيون', colorWordEn: 'neon green', hue: 120, sat: 92, darkL: 4, lightL: 98, accentL: 56, accentLightL: 30, mood: 'dark', category: 'cyber' },
  { id: 'neon-cyan', name: 'Cyber Cyan', nameAr: 'السايبر السماوي', colorWordAr: 'سماوي نيون', colorWordEn: 'neon cyan', hue: 185, sat: 96, darkL: 4, lightL: 98, accentL: 58, accentLightL: 32, mood: 'dark', category: 'cyber' },
  { id: 'neon-magenta', name: 'Neon Magenta', nameAr: 'الماجنتا النيوني', colorWordAr: 'ماجنتا نيون', colorWordEn: 'neon magenta', hue: 320, sat: 96, darkL: 4, lightL: 98, accentL: 62, accentLightL: 38, mood: 'dark', category: 'cyber' },
  { id: 'neon-purple', name: 'Ultraviolet', nameAr: 'فوق البنفسجي', colorWordAr: 'بنفسجي نيون', colorWordEn: 'neon purple', hue: 275, sat: 94, darkL: 4, lightL: 98, accentL: 64, accentLightL: 40, mood: 'dark', category: 'cyber' },
  { id: 'neon-orange', name: 'Plasma Orange', nameAr: 'البرتقالي البلازمي', colorWordAr: 'برتقالي نيون', colorWordEn: 'neon orange', hue: 16, sat: 96, darkL: 4, lightL: 98, accentL: 58, accentLightL: 36, mood: 'dark', category: 'cyber' },
  { id: 'aurora-1', name: 'Aurora Emerald', nameAr: 'شفق الزمرد', colorWordAr: 'شفق أخضر', colorWordEn: 'aurora green', hue: 160, sat: 76, darkL: 5, lightL: 98, accentL: 56, accentLightL: 34, mood: 'dark', category: 'aurora' },
  { id: 'aurora-2', name: 'Aurora Violet', nameAr: 'شفق البنفسج', colorWordAr: 'شفق بنفسجي', colorWordEn: 'aurora violet', hue: 262, sat: 80, darkL: 5, lightL: 98, accentL: 64, accentLightL: 42, mood: 'dark', category: 'aurora' },
  { id: 'aurora-3', name: 'Aurora Ice', nameAr: 'شفق الجليد', colorWordAr: 'شفق جليدي', colorWordEn: 'aurora ice', hue: 195, sat: 78, darkL: 5, lightL: 98, accentL: 60, accentLightL: 38, mood: 'dark', category: 'aurora' },
  { id: 'aurora-4', name: 'Aurora Rose', nameAr: 'شفق الورد', colorWordAr: 'شفق وردي', colorWordEn: 'aurora rose', hue: 330, sat: 80, darkL: 5, lightL: 98, accentL: 64, accentLightL: 44, mood: 'dark', category: 'aurora' },
  { id: 'sea', name: 'Deep Sea', nameAr: 'أعماق البحر', colorWordAr: 'بحري', colorWordEn: 'sea', hue: 200, sat: 72, darkL: 6, lightL: 98, accentL: 56, accentLightL: 34, mood: 'dark', category: 'ocean' },
  { id: 'navy', name: 'Royal Navy', nameAr: 'الكحلي الملكي', colorWordAr: 'كحلي', colorWordEn: 'navy', hue: 224, sat: 60, darkL: 6, lightL: 97, accentL: 60, accentLightL: 38, mood: 'dark', category: 'royal' },
  { id: 'cobalt', name: 'Cobalt Glass', nameAr: 'الكوبالت الزجاجي', colorWordAr: 'كوبالت', colorWordEn: 'cobalt', hue: 228, sat: 78, darkL: 6, lightL: 98, accentL: 62, accentLightL: 40, mood: 'dark', category: 'glass' },
  { id: 'jade', name: 'Jade Palace', nameAr: 'اليشم القصرى', colorWordAr: 'يشمي', colorWordEn: 'jade', hue: 150, sat: 58, darkL: 6, lightL: 98, accentL: 52, accentLightL: 32, mood: 'both', category: 'heritage' },
  { id: 'saffron', name: 'Saffron Spice', nameAr: 'الزعفراني', colorWordAr: 'زعفراني', colorWordEn: 'saffron', hue: 46, sat: 92, darkL: 6, lightL: 98, accentL: 58, accentLightL: 38, mood: 'both', category: 'heritage' },
  { id: 'andalus', name: 'Andalusia Tile', nameAr: 'بلاط الأندلس', colorWordAr: 'أندلسي', colorWordEn: 'andalusia', hue: 190, sat: 64, darkL: 6, lightL: 98, accentL: 54, accentLightL: 32, mood: 'both', category: 'heritage' },
  { id: 'baghdad', name: 'Baghdad Night', nameAr: 'ليل بغداد', colorWordAr: 'بغدادي', colorWordEn: 'baghdad', hue: 210, sat: 44, darkL: 5, lightL: 97, accentL: 56, accentLightL: 34, mood: 'dark', category: 'heritage' },
  { id: 'petra', name: 'Petra Rose', nameAr: 'وردي البتراء', colorWordAr: 'بتراء', colorWordEn: 'petra', hue: 6, sat: 58, darkL: 7, lightL: 98, accentL: 56, accentLightL: 38, mood: 'both', category: 'heritage' },
  { id: 'monochrome-warm', name: 'Warm Monochrome', nameAr: 'أحادي دافئ', colorWordAr: 'أحادي دافئ', colorWordEn: 'warm mono', hue: 30, sat: 10, darkL: 7, lightL: 97, accentL: 60, accentLightL: 32, mood: 'both', category: 'mono' },
  { id: 'monochrome-cool', name: 'Cool Monochrome', nameAr: 'أحادي بارد', colorWordAr: 'أحادي بارد', colorWordEn: 'cool mono', hue: 210, sat: 10, darkL: 7, lightL: 97, accentL: 62, accentLightL: 34, mood: 'both', category: 'mono' },
  { id: 'silver', name: 'Silver Frost', nameAr: 'الفضي المتجمد', colorWordAr: 'فضي', colorWordEn: 'silver', hue: 210, sat: 12, darkL: 9, lightL: 98, accentL: 56, accentLightL: 34, mood: 'both', category: 'minimal' },
  { id: 'platinum', name: 'Platinum Light', nameAr: 'البلاتيني الفاتح', colorWordAr: 'بلاتيني', colorWordEn: 'platinum', hue: 220, sat: 14, darkL: 10, lightL: 99, accentL: 48, accentLightL: 34, mood: 'light', category: 'light' },
  { id: 'candy', name: 'Candy Pop', nameAr: 'الحلوى الملونة', colorWordAr: 'حلوى', colorWordEn: 'candy', hue: 300, sat: 76, darkL: 8, lightL: 99, accentL: 62, accentLightL: 46, mood: 'light', category: 'vivid' },
  { id: 'bubblegum', name: 'Bubblegum', nameAr: 'العلكة الوردية', colorWordAr: 'علكة', colorWordEn: 'bubblegum', hue: 340, sat: 80, darkL: 8, lightL: 99, accentL: 64, accentLightL: 46, mood: 'light', category: 'vivid' },
  { id: 'ocean-mist', name: 'Ocean Mist', nameAr: 'ضباب المحيط', colorWordAr: 'ضباب بحري', colorWordEn: 'ocean mist', hue: 190, sat: 40, darkL: 8, lightL: 98, accentL: 54, accentLightL: 34, mood: 'both', category: 'ocean' },
  { id: 'forest-night', name: 'Forest Night', nameAr: 'ليل الغابة', colorWordAr: 'غابة ليلية', colorWordEn: 'forest night', hue: 140, sat: 46, darkL: 5, lightL: 97, accentL: 52, accentLightL: 30, mood: 'dark', category: 'nature' },
  { id: 'savanna', name: 'Savanna Sun', nameAr: 'شمس السافانا', colorWordAr: 'سافانا', colorWordEn: 'savanna', hue: 42, sat: 76, darkL: 7, lightL: 98, accentL: 56, accentLightL: 38, mood: 'both', category: 'desert' },
  { id: 'glacier', name: 'Glacier Ice', nameAr: 'الجليد القطبي', colorWordAr: 'جليدي', colorWordEn: 'glacier', hue: 200, sat: 60, darkL: 7, lightL: 99, accentL: 58, accentLightL: 36, mood: 'light', category: 'glass' },
  { id: 'volcano', name: 'Volcano Magma', nameAr: 'حمم البركان', colorWordAr: 'بركاني', colorWordEn: 'volcano', hue: 10, sat: 88, darkL: 5, lightL: 98, accentL: 56, accentLightL: 38, mood: 'dark', category: 'sunset' },
  { id: 'midnight', name: 'Midnight Blue', nameAr: 'أزرق منتصف الليل', colorWordAr: 'منتصف الليل', colorWordEn: 'midnight', hue: 230, sat: 52, darkL: 4, lightL: 97, accentL: 62, accentLightL: 38, mood: 'dark', category: 'dark' },
  { id: 'obsidian', name: 'Obsidian Night', nameAr: 'الأسود الزجاجي', colorWordAr: 'أوبسيديان', colorWordEn: 'obsidian', hue: 260, sat: 14, darkL: 4, lightL: 97, accentL: 64, accentLightL: 34, mood: 'dark', category: 'dark' },
];

/* ============================================================================
 * 5. THEME CONSTRUCTION
 * ==========================================================================*/

function shapeMeta(id: ThemeShapeId): ShapePreset {
  return SHAPE_PRESETS.find(s => s.id === id) || SHAPE_PRESETS[0];
}

/** Builds the CSS gradient painted behind everything. */
function buildBackgroundImage(bg: string, bgAlt: string, bgDeep: string, accent: string, shape: ShapePreset, isDark: boolean): string {
  const angle = 135 + (SHAPE_PRESETS.indexOf(shape) % 4) * 15;
  const a1 = isDark ? 0.55 : 0.35;
  const a2 = isDark ? 0.4 : 0.28;
  return [
    `linear-gradient(${angle}deg, ${withAlpha(bgAlt, a1)} 0%, ${withAlpha(bgDeep, a2)} 48%, ${withAlpha(bg, 0.001)} 100%)`,
    `radial-gradient(120% 90% at 88% -10%, ${withAlpha(accent, isDark ? 0.2 : 0.14)} 0%, transparent 62%)`,
    `radial-gradient(90% 70% at 4% 104%, ${withAlpha(rotateHue(accent, 40), isDark ? 0.16 : 0.1)} 0%, transparent 60%)`,
  ].join(', ');
}

interface BuildArgs {
  id: string;
  name: string;
  nameAr: string;
  category: ThemeCategoryId;
  accent: string;
  bg: string;
  isDark: boolean;
  shape: ShapePreset;
  tags: string[];
  signature?: boolean;
}

function buildTheme(args: BuildArgs): ThemeConfig {
  const { id, name, nameAr, category, shape, isDark, tags, signature } = args;

  const accent = args.accent;
  const bg = args.bg;

  // Text / surfaces
  const text = isDark ? ensureContrast(lighten(bg, 92), bg, 12) : ensureContrast(darken(bg, 88), bg, 12);
  const subtextBase = isDark ? lighten(bg, 62) : darken(bg, 52);

  // Card surface: glass themes stay translucent, solid themes stay opaque.
  const glassAlpha = clamp(shape.glassOpacity / 100, 0.06, 1);
  const tint = isDark ? lighten(bg, 12) : darken(bg, 6);
  const cardBase = mixHex(mixHex(accent, tint, isDark ? 0.16 : 0.1), tint, 0.65);
  const card = withAlpha(cardBase, glassAlpha);
  const cardSolid = cardBase;

  const surface = withAlpha(mixHex(accent, isDark ? lighten(bg, 16) : darken(bg, 9), 0.12), isDark ? 0.75 : 0.7);
  const elevated = withAlpha(isDark ? lighten(bg, 18) : '#ffffff', isDark ? 0.92 : 0.96);

  const border = isDark ? withAlpha(lighten(accent, 22), 0.2) : withAlpha(darken(bg, 30), 0.16);
  const borderStrong = isDark ? withAlpha(lighten(accent, 26), 0.42) : withAlpha(darken(bg, 40), 0.3);

  // Primary: gradient-aware but always resolvable to a hex for CSS variables.
  const primary = isDark
    ? ensureContrast(accent, cardSolid, 3)
    : ensureContrast(accent, cardSolid, 3);
  const primaryHover = isDark ? lighten(primary, 8) : darken(primary, 7);
  const onPrimary = readableOn(primary);

  const secondary = rotateHue(primary, shape.secondaryShift);
  const secondaryHover = isDark ? lighten(secondary, 8) : darken(secondary, 7);
  const onSecondary = readableOn(secondary);

  const glow = withAlpha(accent, isDark ? 0.45 : 0.3);

  const colors: ThemeColors = {
    bg,
    bgAlt: isDark ? lighten(rotateHue(bg, 8), 6) : darken(rotateHue(bg, -8), 4),
    bgDeep: isDark ? darken(rotateHue(bg, -10), 3) : lighten(rotateHue(bg, 10), 2),
    card,
    surface,
    elevated,
    text,
    subtext: ensureContrast(subtextBase, cardSolid, 3.6),
    primary,
    primaryHover,
    onPrimary,
    secondary,
    secondaryHover,
    onSecondary,
    accent: ensureContrast(lighten(accent, isDark ? 12 : 0), cardSolid, 3.4),
    border,
    borderStrong,
    danger: isDark ? '#ff6b6b' : '#d92d20',
    success: isDark ? '#4ade80' : '#067647',
    warning: isDark ? '#fbbf24' : '#b54708',
    glow,
  };

  const shapeOut: ThemeShape = {
    id: shape.id,
    nameAr: shape.nameAr,
    radius: shape.radius,
    radiusSm: shape.radiusSm,
    blur: shape.blur,
    glassOpacity: shape.glassOpacity,
    borderWidth: shape.borderWidth,
    shadow: shape.shadow,
    pattern: shape.pattern,
    gradientPrimary: shape.gradientPrimary,
    fontHeading: shape.fontHeading,
    fontBody: shape.fontBody,
    glow: shape.glow,
    tracking: shape.tracking,
  };

  const radiusClass = shape.radius >= 999 ? 'rounded-full' : `rounded-[${shape.radius}px]`;
  const blurClass = shape.blur > 0 ? `backdrop-blur-[${shape.blur}px]` : '';
  const bgAltHex = colors.bgAlt;
  const bgDeepHex = colors.bgDeep;
  const secondaryText = ensureContrast(secondary, cardSolid, 3.2);

  return {
    id,
    name,
    nameAr,
    category,
    bg: `bg-[${bg}] bg-[linear-gradient(135deg,${bgAltHex},${bgDeepHex})]`,
    card: `${radiusClass} ${blurClass} bg-[${card}] border border-[${border}]`.trim(),
    text: `text-[${text}]`,
    subtext: `text-[${colors.subtext}]`,
    primary: `${shape.gradientPrimary ? `bg-[linear-gradient(120deg,${primary},${secondary})]` : `bg-[${primary}]`} text-[${onPrimary}] font-bold`,
    primaryHover: `hover:brightness-110`,
    secondary: `bg-[${withAlpha(secondary, 0.16)}] text-[${secondaryText}] border border-[${withAlpha(secondary, 0.34)}]`,
    secondaryHover: `hover:bg-[${withAlpha(secondary, 0.26)}]`,
    border: `border-[${border}]`,
    accent: `text-[${colors.accent}]`,
    headerBg: `${blurClass} bg-[${withAlpha(bg, isDark ? 0.6 : 0.72)}] border-b border-[${border}]`.trim(),
    previewColor: accent,
    isGlass: shape.glassOpacity < 70,
    isDark,
    colors,
    shape: shapeOut,
    backgroundImage: buildBackgroundImage(bg, colors.bgAlt, colors.bgDeep, accent, shape, isDark),
    tags,
    signature,
  };
}

function resolveMood(family: PaletteFamily, shape: ShapePreset): 'dark' | 'light' {
  if (shape.forceMood) return shape.forceMood;
  if (family.mood === 'dark') return 'dark';
  if (family.mood === 'light') return 'light';
  // 'both' → alternate deterministically so we get dark AND light variants.
  const fi = FAMILIES.indexOf(family);
  const si = SHAPE_PRESETS.indexOf(shape);
  return (fi + si) % 3 === 0 ? 'light' : 'dark';
}

function familyBaseColors(family: PaletteFamily, shape: ShapePreset, mood: 'dark' | 'light') {
  const hue = (family.hue + shape.hueShift + 360) % 360;
  const sat = clamp(family.sat + shape.saturationBoost, 0, 100);
  const isDark = mood === 'dark';
  const bgL = isDark ? clamp(family.darkL + shape.bgShift, 2, 16) : clamp(family.lightL + shape.bgShift, 90, 99.5);
  const bgSat = isDark ? clamp(sat * 0.55, 0, 60) : clamp(sat * 0.42, 0, 46);
  const bg = hslToHex(hue, bgSat, bgL);
  const accentL = isDark ? family.accentL : family.accentLightL;
  const accent = hslToHex(hue, clamp(sat, 30, 100), clamp(accentL + shape.bgShift * 0.4, 20, 82));
  return { bg, accent, isDark };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** All 1000+ generated themes (family × shape). */
function generateThemes(): ThemeConfig[] {
  const out: ThemeConfig[] = [];
  for (const family of FAMILIES) {
    for (const shape of SHAPE_PRESETS) {
      const mood = resolveMood(family, shape);
      const { bg, accent, isDark } = familyBaseColors(family, shape, mood);
      const moodTagAr = isDark ? 'داكن' : 'فاتح';
      out.push(
        buildTheme({
          id: `mt-${slugify(family.name)}-${shape.id}${isDark ? '' : '-light'}`,
          name: `${family.name} ${capFirst(shape.id)}`,
          nameAr: `${family.nameAr} · ${shape.nameAr}${isDark ? '' : ' الفاتح'}`,
          category: family.category,
          accent,
          bg,
          isDark,
          shape,
          tags: [
            family.colorWordAr, family.colorWordEn, family.name, family.nameAr,
            shape.nameAr, shape.id, moodTagAr, isDark ? 'dark' : 'light',
            family.category, shape.glassOpacity < 70 ? 'زجاجي' : '', shape.glassOpacity < 70 ? 'glass' : '',
          ].filter(Boolean),
        })
      );
    }
  }
  return out;
}

function capFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ============================================================================
 * 6. SIGNATURE THEMES — hand-tuned, one of a kind
 * ==========================================================================*/

interface SignatureSpec {
  id: string;
  name: string;
  nameAr: string;
  category: Exclude<ThemeCategoryId, 'all' | 'favorites' | 'custom'>;
  accent: string;
  bg: string;
  isDark: boolean;
  shape: ThemeShapeId;
  tags?: string[];
}

const SIGNATURES: SignatureSpec[] = [
  { id: 'sig-mahdi-gold', name: 'Mahdi Imperial Gold', nameAr: 'ذهبي مهدي الملكي', category: 'royal', accent: '#f5b544', bg: '#0a0805', isDark: true, shape: 'royal', tags: ['ذهبي', 'ملكي', 'gold', 'royal'] },
  { id: 'sig-aurora-borealis', name: 'Aurora Borealis Glass', nameAr: 'أورورا الشفق الزجاجي', category: 'aurora', accent: '#22d3ee', bg: '#04121a', isDark: true, shape: 'aurora', tags: ['شفق', 'زجاجي', 'aurora'] },
  { id: 'sig-crystal-frost', name: 'Pure Crystal Frost', nameAr: 'البلور المتجمد', category: 'glass', accent: '#e6f1ff', bg: '#0a1018', isDark: true, shape: 'crystal', tags: ['بلوري', 'crystal'] },
  { id: 'sig-emerald-crown', name: 'Emerald Crown', nameAr: 'تاج الزمرد', category: 'nature', accent: '#10b981', bg: '#04120c', isDark: true, shape: 'royal', tags: ['زمردي', 'emerald'] },
  { id: 'sig-sapphire-night', name: 'Sapphire Midnight', nameAr: 'ياقوت منتصف الليل', category: 'ocean', accent: '#3b82f6', bg: '#050b1c', isDark: true, shape: 'velvet', tags: ['ياقوت', 'sapphire'] },
  { id: 'sig-amethyst-velvet', name: 'Amethyst Velvet', nameAr: 'أميثيست مخملي', category: 'dark', accent: '#a855f7', bg: '#100618', isDark: true, shape: 'velvet', tags: ['بنفسجي', 'amethyst'] },
  { id: 'sig-rose-quartz', name: 'Rose Quartz Frost', nameAr: 'كوارتز وردي متجمد', category: 'pastel', accent: '#fb7185', bg: '#170711', isDark: true, shape: 'crystal', tags: ['وردي', 'rose'] },
  { id: 'sig-cyber-spectrum', name: 'Cyber Spectrum', nameAr: 'طيف السايبر', category: 'cyber', accent: '#00f2fe', bg: '#04060f', isDark: true, shape: 'cyber', tags: ['سايبر', 'نيون', 'cyber'] },
  { id: 'sig-obsidian-glass', name: 'Obsidian Glass', nameAr: 'الزجاج الأوبسيدياني', category: 'dark', accent: '#d4d4d8', bg: '#08080a', isDark: true, shape: 'glass', tags: ['أوبسيديان', 'زجاجي', 'obsidian'] },
  { id: 'sig-solar-sunset', name: 'Solar Sunset', nameAr: 'غروب الشمس', category: 'sunset', accent: '#fb923c', bg: '#180a04', isDark: true, shape: 'silk', tags: ['غروب', 'sunset'] },
  { id: 'sig-andalusia', name: 'Andalusia Palace', nameAr: 'قصر الأندلس', category: 'heritage', accent: '#2dd4bf', bg: '#04120f', isDark: true, shape: 'heritage', tags: ['أندلس', 'تراث', 'andalusia'] },
  { id: 'sig-baghdad-night', name: 'Baghdad Night', nameAr: 'ليل بغداد', category: 'heritage', accent: '#f0c674', bg: '#0a0f16', isDark: true, shape: 'heritage', tags: ['بغداد', 'تراث'] },
  { id: 'sig-petra-rose', name: 'Petra Rose Stone', nameAr: 'حجر البتراء الوردي', category: 'heritage', accent: '#e07a5f', bg: '#170a08', isDark: true, shape: 'desert', tags: ['بتراء', 'petra'] },
  { id: 'sig-desert-dune', name: 'Desert Dune Gold', nameAr: 'كثبان الصحراء الذهبية', category: 'desert', accent: '#e0b356', bg: '#14100a', isDark: true, shape: 'desert', tags: ['صحراء', 'desert'] },
  { id: 'sig-alabaster', name: 'Pure Alabaster', nameAr: 'المرمر الأبيض الخالص', category: 'light', accent: '#1f2937', bg: '#fcfbf9', isDark: false, shape: 'minimal', tags: ['أبيض', 'فاتح', 'light'] },
  { id: 'sig-ivory-linen', name: 'Ivory Linen', nameAr: 'العاجي الكتاني', category: 'light', accent: '#8a6a3b', bg: '#faf7f0', isDark: false, shape: 'rounded', tags: ['عاجي', 'فاتح', 'ivory'] },
  { id: 'sig-pearl-mist', name: 'Pearl Mist', nameAr: 'ضباب اللؤلؤ', category: 'light', accent: '#3b6ea5', bg: '#f7f9fc', isDark: false, shape: 'glass', tags: ['لؤلؤي', 'pearl'] },
  { id: 'sig-sakura-light', name: 'Sakura Light', nameAr: 'أزهار الساكورا', category: 'pastel', accent: '#e2638f', bg: '#fff7fa', isDark: false, shape: 'pastel', tags: ['ساكورا', 'وردي', 'sakura'] },
  { id: 'sig-mint-light', name: 'Mint Sorbet Light', nameAr: 'النعناع الفاتح', category: 'light', accent: '#12a37a', bg: '#f4fbf8', isDark: false, shape: 'rounded', tags: ['نعناعي', 'mint'] },
  { id: 'sig-lavender-day', name: 'Lavender Day', nameAr: 'نهار اللافندر', category: 'pastel', accent: '#7c5cd6', bg: '#f8f6ff', isDark: false, shape: 'pastel', tags: ['لافندر', 'lavender'] },
  { id: 'sig-neon-matrix', name: 'Matrix Terminal', nameAr: 'طرفية الماتريكس', category: 'cyber', accent: '#39ff88', bg: '#020604', isDark: true, shape: 'terminal', tags: ['ماتريكس', 'طرفية', 'terminal'] },
  { id: 'sig-amber-crt', name: 'Retro Amber CRT', nameAr: 'شاشة العنبر الكلاسيكية', category: 'mono', accent: '#ffb000', bg: '#100c02', isDark: true, shape: 'terminal', tags: ['عنبري', 'كلاسيكي', 'retro'] },
  { id: 'sig-tron-blue', name: 'Tron Grid', nameAr: 'شبكة الترون', category: 'cyber', accent: '#00d5ff', bg: '#02060e', isDark: true, shape: 'cyber', tags: ['ترون', 'tron'] },
  { id: 'sig-vaporwave', name: 'Vaporwave Dusk', nameAr: 'غروب الفيبور ويف', category: 'vivid', accent: '#ff71ce', bg: '#1b0722', isDark: true, shape: 'neon', tags: ['فيبور', 'vaporwave'] },
  { id: 'sig-midnight-sapphire', name: 'Midnight Sapphire', nameAr: 'ياقوت منتصف الليل الداكن', category: 'dark', accent: '#60a5fa', bg: '#030614', isDark: true, shape: 'velvet', tags: ['كحلي', 'midnight'] },
  { id: 'sig-deep-forest', name: 'Deep Forest', nameAr: 'الغابة العميقة', category: 'nature', accent: '#4ade80', bg: '#04100a', isDark: true, shape: 'rounded', tags: ['غابة', 'forest'] },
  { id: 'sig-ocean-depth', name: 'Ocean Depth', nameAr: 'أعماق المحيط', category: 'ocean', accent: '#38bdf8', bg: '#03101c', isDark: true, shape: 'glass', tags: ['محيط', 'ocean'] },
  { id: 'sig-glacier-light', name: 'Glacier Light', nameAr: 'الجليد الفاتح', category: 'glass', accent: '#0ea5e9', bg: '#f2f9ff', isDark: false, shape: 'crystal', tags: ['جليد', 'glacier'] },
  { id: 'sig-copper-dusk', name: 'Copper Dusk', nameAr: 'شفق النحاس', category: 'sunset', accent: '#e08a4e', bg: '#150b06', isDark: true, shape: 'silk', tags: ['نحاسي', 'copper'] },
  { id: 'sig-crimson-royal', name: 'Crimson Royal', nameAr: 'القرمزي الملكي', category: 'royal', accent: '#ef4444', bg: '#150406', isDark: true, shape: 'royal', tags: ['قرمزي', 'crimson'] },
  { id: 'sig-saffron-spice', name: 'Saffron Spice', nameAr: 'الزعفران الشرقي', category: 'heritage', accent: '#f4b942', bg: '#140e04', isDark: true, shape: 'heritage', tags: ['زعفران', 'saffron'] },
  { id: 'sig-jade-palace', name: 'Jade Palace', nameAr: 'قصر اليشم', category: 'heritage', accent: '#34d399', bg: '#04120e', isDark: true, shape: 'heritage', tags: ['يشم', 'jade'] },
  { id: 'sig-brutalist-ink', name: 'Brutalist Ink', nameAr: 'الحبر البروتالي', category: 'mono', accent: '#facc15', bg: '#0d0d0d', isDark: true, shape: 'brutalist', tags: ['بروتالي', 'brutalist'] },
  { id: 'sig-neumorph-graphite', name: 'Graphite Neumorph', nameAr: 'الجرافيت البارز', category: 'minimal', accent: '#94a3b8', bg: '#16181d', isDark: true, shape: 'neumorph', tags: ['نيمورفيك', 'neumorph'] },
  { id: 'sig-neumorph-light', name: 'Cloud Neumorph', nameAr: 'السحابة البارزة', category: 'light', accent: '#4f6df5', bg: '#eef1f7', isDark: false, shape: 'neumorph', tags: ['نيمورفيك فاتح', 'neumorph light'] },
  { id: 'sig-titanium-pro', name: 'Titanium Pro', nameAr: 'التيتانيوم الاحترافي', category: 'minimal', accent: '#cbd5e1', bg: '#0e1116', isDark: true, shape: 'metal', tags: ['تيتانيوم', 'titanium'] },
  { id: 'sig-silver-frost', name: 'Silver Frost', nameAr: 'الفضي المتجمد', category: 'minimal', accent: '#9fb3c8', bg: '#f5f7fa', isDark: false, shape: 'metal', tags: ['فضي', 'silver'] },
  { id: 'sig-volcano-magma', name: 'Volcano Magma', nameAr: 'حمم البركان', category: 'sunset', accent: '#ff5a1f', bg: '#140402', isDark: true, shape: 'neon', tags: ['بركان', 'volcano'] },
  { id: 'sig-bubblegum', name: 'Bubblegum Pop', nameAr: 'فقاعات العلكة', category: 'vivid', accent: '#ff5fa2', bg: '#fff5f9', isDark: false, shape: 'pill', tags: ['علكة', 'bubblegum'] },
  { id: 'sig-candy-shop', name: 'Candy Shop', nameAr: 'متجر الحلوى', category: 'vivid', accent: '#c026d3', bg: '#fff8ff', isDark: false, shape: 'squircle', tags: ['حلوى', 'candy'] },
  { id: 'sig-olive-heritage', name: 'Olive Heritage', nameAr: 'الزيتون التراثي', category: 'nature', accent: '#a3b358', bg: '#0f1207', isDark: true, shape: 'desert', tags: ['زيتون', 'olive'] },
  { id: 'sig-carbon-stealth', name: 'Carbon Stealth', nameAr: 'الكربون الخفي', category: 'mono', accent: '#8b8b8b', bg: '#070708', isDark: true, shape: 'sharp', tags: ['كربون', 'carbon'] },
  { id: 'sig-midnight-emerald-glass', name: 'Emerald Glass', nameAr: 'الزجاج الزمردي', category: 'glass', accent: '#34d399', bg: '#04120d', isDark: true, shape: 'glass', tags: ['زمردي زجاجي', 'emerald glass'] },
  { id: 'sig-royal-amethyst-light', name: 'Royal Amethyst Light', nameAr: 'الأميثيست الملكي الفاتح', category: 'light', accent: '#7c3aed', bg: '#faf8ff', isDark: false, shape: 'royal', tags: ['بنفسجي فاتح', 'amethyst light'] },
];

function buildSignatures(): ThemeConfig[] {
  return SIGNATURES.map(spec => {
    const shape = shapeMeta(spec.shape);
    return buildTheme({
      id: spec.id,
      name: spec.name,
      nameAr: spec.nameAr,
      category: spec.category,
      accent: spec.accent,
      bg: spec.bg,
      isDark: spec.isDark,
      shape,
      tags: [...(spec.tags || []), 'signature', 'مميز'],
      signature: true,
    });
  });
}

/* ============================================================================
 * 7. REGISTRY
 * ==========================================================================*/

const SIGNATURE_THEMES = buildSignatures();
const GENERATED_THEMES = generateThemes();

/** Every theme available in the app (signatures first, then the generated set). */
export const ALL_THEMES: ThemeConfig[] = [...SIGNATURE_THEMES, ...GENERATED_THEMES];

export const THEME_COUNT = ALL_THEMES.length;

export const DEFAULT_THEME_ID = 'sig-aurora-borealis';

export function getThemeById(id: string | null | undefined): ThemeConfig {
  if (!id) return getDefaultTheme();
  const found = ALL_THEMES.find(t => t.id === id);
  return found || getDefaultTheme();
}

export function getDefaultTheme(): ThemeConfig {
  return ALL_THEMES.find(t => t.id === DEFAULT_THEME_ID) || ALL_THEMES[0];
}

export interface ThemeCategoryMeta {
  id: ThemeCategoryId;
  name: string;
  nameAr: string;
  icon: string;
}

export const THEME_CATEGORIES: ThemeCategoryMeta[] = [
  { id: 'all', name: 'All Themes', nameAr: 'كل الثيمات', icon: '🎨' },
  { id: 'favorites', name: 'Favourites', nameAr: 'المفضلة', icon: '⭐' },
  { id: 'glass', name: 'Glass & Transparent', nameAr: 'الزجاجي الشفاف', icon: '🫧' },
  { id: 'royal', name: 'Royal & Gold', nameAr: 'الملكي والذهبي', icon: '👑' },
  { id: 'dark', name: 'Dark & Midnight', nameAr: 'الداكن والفخم', icon: '🌙' },
  { id: 'light', name: 'Light & Airy', nameAr: 'الفاتح المنعش', icon: '☀️' },
  { id: 'aurora', name: 'Aurora', nameAr: 'الشفق القطبي', icon: '🌌' },
  { id: 'neon', name: 'Neon', nameAr: 'النيون', icon: '💡' },
  { id: 'cyber', name: 'Cyberpunk', nameAr: 'السايبر', icon: '🤖' },
  { id: 'heritage', name: 'Heritage & Arabic', nameAr: 'التراثي العربي', icon: '🕌' },
  { id: 'desert', name: 'Desert', nameAr: 'الصحراوي', icon: '🏜️' },
  { id: 'ocean', name: 'Ocean & Sky', nameAr: 'المحيط والسماء', icon: '🌊' },
  { id: 'nature', name: 'Nature & Forest', nameAr: 'الطبيعة والغابات', icon: '🌿' },
  { id: 'sunset', name: 'Sunset & Flame', nameAr: 'الغروب والنار', icon: '🌇' },
  { id: 'pastel', name: 'Pastel & Dream', nameAr: 'الباستيل الهادئ', icon: '🍬' },
  { id: 'vivid', name: 'Vivid & Bold', nameAr: 'الألوان الصارخة', icon: '🔥' },
  { id: 'minimal', name: 'Minimal', nameAr: 'التبسيطي', icon: '◻️' },
  { id: 'mono', name: 'Monochrome', nameAr: 'الأحادي', icon: '⬛' },
  { id: 'custom', name: 'Custom Studio', nameAr: 'استوديو التخصيص', icon: '✨' },
];

/** Fast search + category filtering over the whole registry. */
export function filterThemes(opts: {
  query?: string;
  category?: ThemeCategoryId | 'all';
  favorites?: string[];
  darkOnly?: boolean;
  glassOnly?: boolean;
  limit?: number;
}): ThemeConfig[] {
  const q = (opts.query || '').trim().toLowerCase();
  const category = opts.category || 'all';
  const favs = new Set(opts.favorites || []);
  const out: ThemeConfig[] = [];
  const limit = opts.limit ?? Infinity;

  for (const t of ALL_THEMES) {
    if (category === 'favorites' && !favs.has(t.id)) continue;
    if (category !== 'all' && category !== 'favorites' && t.category !== category) continue;
    if (opts.darkOnly && !t.isDark) continue;
    if (opts.glassOnly && !t.isGlass) continue;
    if (q) {
      const haystack = `${t.id} ${t.name} ${t.nameAr} ${(t.tags || []).join(' ')} ${t.category} ${t.shape.nameAr} ${t.shape.id}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/** Deterministic pseudo-random theme (stable for a given seed). */
export function getThemeByIndex(index: number): ThemeConfig {
  const i = ((index % ALL_THEMES.length) + ALL_THEMES.length) % ALL_THEMES.length;
  return ALL_THEMES[i];
}

export function getRandomTheme(excludeId?: string): ThemeConfig {
  const pool = excludeId ? ALL_THEMES.filter(t => t.id !== excludeId) : ALL_THEMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function countByCategory(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of ALL_THEMES) map[t.category] = (map[t.category] || 0) + 1;
  return map;
}

/* ============================================================================
 * 8. CUSTOM THEME STUDIO
 * ==========================================================================*/

export const BG_STYLES = [
  { id: 'obsidian', nameAr: 'أوبسيديان داكن', bg: '#08080a', accent: '#f5b544', isDark: true },
  { id: 'midnight', nameAr: 'أزرق منتصف الليل', bg: '#050a1c', accent: '#60a5fa', isDark: true },
  { id: 'aurora', nameAr: 'شفق قطبي', bg: '#04121a', accent: '#22d3ee', isDark: true },
  { id: 'emerald', nameAr: 'زمردي عميق', bg: '#04120c', accent: '#10b981', isDark: true },
  { id: 'ocean', nameAr: 'محيط أزرق', bg: '#03101c', accent: '#38bdf8', isDark: true },
  { id: 'royal-dark', nameAr: 'ملكي داكن', bg: '#0a0805', accent: '#f0c674', isDark: true },
  { id: 'neon', nameAr: 'نيون ليلي', bg: '#07030f', accent: '#ff2fd0', isDark: true },
  { id: 'sunset', nameAr: 'غروب ناري', bg: '#180a04', accent: '#fb923c', isDark: true },
  { id: 'rose', nameAr: 'وردي مخملي', bg: '#170711', accent: '#fb7185', isDark: true },
  { id: 'desert', nameAr: 'صحراوي دافئ', bg: '#14100a', accent: '#e0b356', isDark: true },
  { id: 'crystal', nameAr: 'بلوري رمادي', bg: '#0f1216', accent: '#cbd5e1', isDark: true },
  { id: 'light', nameAr: 'أبيض ناصع', bg: '#fbfbfd', accent: '#4f46e5', isDark: false },
] as const;

export function createCustomTheme(settings: {
  accentColor: string;
  secondaryColor?: string;
  cardOpacity: number;
  glassBlur: number;
  borderRadius: number;
  bgStyle: string;
  glowAnimation: boolean;
  pattern?: ThemePattern;
  shape?: ThemeShapeId;
}): ThemeConfig {
  const bgStyle = BG_STYLES.find(b => b.id === settings.bgStyle) || BG_STYLES[0];
  const baseShape = shapeMeta(settings.shape || 'glass');
  const accent = settings.accentColor || bgStyle.accent;

  const shape: ShapePreset = {
    ...baseShape,
    radius: settings.borderRadius ?? baseShape.radius,
    blur: settings.glassBlur ?? baseShape.blur,
    glassOpacity: clamp(settings.cardOpacity ?? baseShape.glassOpacity, 4, 100),
    pattern: settings.pattern ?? baseShape.pattern,
    glow: settings.glowAnimation,
    gradientPrimary: true,
  };

  return buildTheme({
    id: 'user-custom-theme',
    name: 'Custom Studio Theme',
    nameAr: 'ثيمك المخصص الفاخر',
    category: 'custom',
    accent,
    bg: bgStyle.bg,
    isDark: bgStyle.isDark,
    shape,
    tags: ['مخصص', 'custom'],
  });
}

/* ============================================================================
 * 9. RUNTIME APPLICATION (CSS custom properties)
 * ==========================================================================*/

export const DEFAULT_APPEARANCE: AppearanceOptions = {
  cardOpacity: 26,
  glassBlur: 18,
  radiusScale: 100,
  pattern: 'theme',
  animateBackground: true,
  reduceMotion: false,
  highContrast: false,
  showGlow: true,
  textScale: 100,
  recentThemeIds: [],
  favoriteThemeIds: [],
};

/** Effective radius (px) after the user radius scale. */
export function scaledRadius(px: number, scale: number) {
  if (px >= 999) return 999;
  return Math.round((px * clamp(scale, 50, 150)) / 100);
}

/**
 * Computes every CSS custom property for a theme + appearance pair.
 * Components consume these through the `mt-*` utility classes in styles/app.css,
 * so a single theme change restyles the entire application at once.
 */
export function themeCssVars(theme: ThemeConfig, appearance: Partial<AppearanceOptions> = {}): Record<string, string> {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  const c = theme.colors;
  const sh = theme.shape;
  const opacity = clamp(a.cardOpacity, 0, 100) / 100;
  const blur = clamp(a.glassBlur, 0, 40);
  const scale = clamp(a.radiusScale, 50, 150);

  const glassTint = theme.isDark ? lighten(c.bg, 14) : '#ffffff';
  const glassBg = withAlpha(mixHex(c.accent, glassTint, theme.isDark ? 0.14 : 0.06), Math.max(opacity, 0.04));
  const pattern = a.pattern === 'theme' ? sh.pattern : a.pattern;

  return {
    '--mt-bg': c.bg,
    '--mt-bg-alt': c.bgAlt,
    '--mt-bg-deep': c.bgDeep,
    '--mt-bg-image': theme.backgroundImage,
    '--mt-card': glassBg,
    '--mt-card-solid': mixHex(c.accent, theme.isDark ? lighten(c.bg, 12) : darken(c.bg, 6), theme.isDark ? 0.16 : 0.1),
    '--mt-surface': c.surface,
    '--mt-elevated': c.elevated,
    '--mt-text': c.text,
    '--mt-subtext': c.subtext,
    '--mt-primary': c.primary,
    '--mt-primary-hover': c.primaryHover,
    '--mt-on-primary': c.onPrimary,
    '--mt-primary-gradient': `linear-gradient(120deg, ${c.primary} 0%, ${c.secondary} 100%)`,
    '--mt-secondary': c.secondary,
    '--mt-secondary-soft': withAlpha(c.secondary, 0.16),
    '--mt-on-secondary': c.onSecondary,
    '--mt-accent': c.accent,
    '--mt-accent-soft': withAlpha(c.accent, 0.14),
    '--mt-border': c.border,
    '--mt-border-strong': c.borderStrong,
    '--mt-danger': c.danger,
    '--mt-success': c.success,
    '--mt-warning': c.warning,
    '--mt-glow': c.glow,
    '--mt-shadow': sh.shadow,
    '--mt-blur': `${blur}px`,
    '--mt-card-opacity': String(opacity),
    '--mt-radius': `${scaledRadius(sh.radius, scale)}px`,
    '--mt-radius-sm': `${scaledRadius(sh.radiusSm, scale)}px`,
    '--mt-radius-lg': `${scaledRadius(Math.round(sh.radius * 1.35), scale)}px`,
    '--mt-border-width': `${sh.borderWidth}px`,
    '--mt-font-heading': sh.fontHeading,
    '--mt-font-body': sh.fontBody,
    '--mt-tracking': sh.tracking,
    '--mt-pattern-image': PATTERN_CSS[pattern](c.accent, c.text),
    '--mt-pattern-size': PATTERN_SIZE[pattern],
    '--mt-text-scale': `${clamp(a.textScale, 70, 160) / 100}`,
    '--mt-contrast': a.highContrast ? '1.25' : '1',
    '--mt-saturation': a.highContrast ? '1.35' : '1',
  };
}

/** Paints a theme onto the document root. Returns the variables that were applied. */
export function applyTheme(theme: ThemeConfig, appearance: Partial<AppearanceOptions> = {}): Record<string, string> {
  const vars = themeCssVars(theme, appearance);
  if (typeof document === 'undefined') return vars;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  root.dataset.mtTheme = theme.id;
  root.dataset.mtDark = theme.isDark ? 'true' : 'false';
  root.dataset.mtGlass = theme.isGlass ? 'true' : 'false';
  root.dataset.mtGradient = theme.shape.gradientPrimary ? 'true' : 'false';
  root.dataset.contrast = appearance.highContrast ? 'high' : 'normal';
  root.dataset.motion = appearance.reduceMotion ? 'reduced' : 'full';
  root.dataset.glow = appearance.showGlow === false ? 'off' : theme.shape.glow ? 'on' : 'off';
  root.dataset.animate = appearance.animateBackground === false ? 'off' : 'on';
  root.style.colorScheme = theme.isDark ? 'dark' : 'light';
  root.style.setProperty('color-scheme', theme.isDark ? 'dark' : 'light');
  return vars;
}

/** Convenience: a readable summary shown in the theme gallery. */
export function describeTheme(theme: ThemeConfig): string {
  return `${theme.nameAr} — ${theme.shape.nameAr} · ${theme.isDark ? 'داكن' : 'فاتح'}${theme.isGlass ? ' · زجاجي' : ''}`;
}
