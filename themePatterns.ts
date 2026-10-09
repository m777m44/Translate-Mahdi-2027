import { ThemePattern } from './types.ts';

/** Ordered list of every background pattern the theme engine can paint. */
export const PATTERN_IDS: ThemePattern[] = [
  'none',
  'dots',
  'grid',
  'waves',
  'arabesque',
  'mesh',
  'aurora',
  'rays',
  'noise',
  'hex',
  'diamonds',
  'stars',
  'topography',
  'circuit',
  'silk',
];

export const PATTERN_LABELS_AR: Record<ThemePattern, string> = {
  none: 'بدون نقشة',
  dots: 'نقاط',
  grid: 'شبكة',
  waves: 'موجات',
  arabesque: 'أرابيسك',
  mesh: 'تدرج شبكي',
  aurora: 'شفق',
  rays: 'أشعة',
  noise: 'حبيبات',
  hex: 'سداسي',
  diamonds: 'معينات',
  stars: 'نجوم',
  topography: 'تضاريس',
  circuit: 'دوائر إلكترونية',
  silk: 'حرير',
};

export const patternLabel = (id: ThemePattern): string => PATTERN_LABELS_AR[id] || id;
