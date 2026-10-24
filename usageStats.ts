/**
 * usageStats.ts — local-only usage analytics for the stats dashboard.
 * Nothing leaves the device; aggregates are derived from a compact daily
 * counter structure in localStorage.
 */

export interface UsageStats {
  totalTranslations: number;
  totalCharacters: number;
  /** Per language pair counts, key `${from}→${to}`. */
  pairs: Record<string, number>;
  /** Per engine counts. */
  engines: Record<string, number>;
  /** Day stamp (YYYY-MM-DD) → translations count, last 90 days. */
  daily: Record<string, number>;
  /** Day stamp → characters, for word-of-day style metrics. */
  dailyChars: Record<string, number>;
  voiceTranslations: number;
  imageTranslations: number;
  neuralTranslations: number;
  lastActiveDay: string;
  streak: number;
}

const KEY = 'mahdi_usage_stats_v1';
const MAX_DAYS = 90;

export function emptyStats(): UsageStats {
  return {
    totalTranslations: 0,
    totalCharacters: 0,
    pairs: {},
    engines: {},
    daily: {},
    dailyChars: {},
    voiceTranslations: 0,
    imageTranslations: 0,
    neuralTranslations: 0,
    lastActiveDay: '',
    streak: 0,
  };
}

export function getUsageStats(): UsageStats {
  try {
    return { ...emptyStats(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return emptyStats();
  }
}

function dayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function pruneDays(record: Record<string, number>): Record<string, number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_DAYS);
  const cut = dayStamp(cutoff);
  return Object.fromEntries(Object.entries(record).filter(([day]) => day >= cut));
}

export interface RecordTranslationInput {
  chars: number;
  from: string;
  to: string;
  engine: string;
  kind?: 'text' | 'voice' | 'image' | 'neural';
}

export function recordTranslation(input: RecordTranslationInput): void {
  const stats = getUsageStats();
  const today = dayStamp();

  stats.totalTranslations += 1;
  stats.totalCharacters += Math.max(0, input.chars);
  const pairKey = `${input.from}→${input.to}`;
  stats.pairs[pairKey] = (stats.pairs[pairKey] || 0) + 1;
  stats.engines[input.engine] = (stats.engines[input.engine] || 0) + 1;
  stats.daily[today] = (stats.daily[today] || 0) + 1;
  stats.dailyChars[today] = (stats.dailyChars[today] || 0) + Math.max(0, input.chars);

  if (input.kind === 'voice') stats.voiceTranslations += 1;
  if (input.kind === 'image') stats.imageTranslations += 1;
  if (input.kind === 'neural' || input.engine.includes('neural')) stats.neuralTranslations += 1;

  // Streak: consecutive active days.
  if (stats.lastActiveDay !== today) {
    const yesterday = dayStamp(new Date(Date.now() - 86400000));
    stats.streak = stats.lastActiveDay === yesterday ? stats.streak + 1 : 1;
    stats.lastActiveDay = today;
  }

  stats.daily = pruneDays(stats.daily);
  stats.dailyChars = pruneDays(stats.dailyChars);
  localStorage.setItem(KEY, JSON.stringify(stats));
}

export function resetUsageStats(): void {
  localStorage.setItem(KEY, JSON.stringify(emptyStats()));
}

export interface StatsSummary {
  total: number;
  chars: number;
  streak: number;
  neural: number;
  voice: number;
  image: number;
  topPairs: Array<{ pair: string; count: number }>;
  topEngines: Array<{ engine: string; count: number }>;
  last14Days: Array<{ day: string; count: number }>;
  avgPerDay: number;
  activeDays: number;
}

const ENGINE_LABELS: Record<string, string> = {
  online: 'سحابي عصبي',
  offline: 'محرك محلي',
  neural: 'ذكاء على الجهاز',
  'ondevice-llm': 'ذكاء على الجهاز',
};

export function engineLabel(engine: string): string {
  return ENGINE_LABELS[engine] || engine;
}

export function summarizeStats(): StatsSummary {
  const s = getUsageStats();
  const topPairs = Object.entries(s.pairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([pair, count]) => ({ pair, count }));
  const topEngines = Object.entries(s.engines)
    .sort((a, b) => b[1] - a[1])
    .map(([engine, count]) => ({ engine, count }));

  const days: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const stamp = dayStamp(d);
    days.push({ day: stamp.slice(5), count: s.daily[stamp] || 0 });
  }
  const activeDays = Object.keys(s.daily).length;

  return {
    total: s.totalTranslations,
    chars: s.totalCharacters,
    streak: s.streak,
    neural: s.neuralTranslations,
    voice: s.voiceTranslations,
    image: s.imageTranslations,
    topPairs,
    topEngines,
    last14Days: days,
    avgPerDay: activeDays ? Math.round(s.totalTranslations / activeDays) : 0,
    activeDays,
  };
}
