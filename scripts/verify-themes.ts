/**
 * Theme engine verification.
 *
 * Runs the real `themeEngine.ts` module (no re-implementation) and asserts the
 * guarantees the theme gallery and the theming system depend on:
 *   • at least 1000 themes, all with unique ids
 *   • every colour token is a valid hex value
 *   • body text keeps a readable contrast ratio against its card surface
 *   • every category in the picker resolves to at least one theme
 *   • the CSS variable map is complete for arbitrary theme/appearance pairs
 *
 * Run with:  npm run verify:themes
 */
import {
  ALL_THEMES,
  THEME_CATEGORIES,
  THEME_COUNT,
  applyTheme,
  countByCategory,
  createCustomTheme,
  filterThemes,
  getThemeById,
  getRandomTheme,
  themeCssVars,
  contrastRatio,
  DEFAULT_APPEARANCE,
} from '../themeEngine.ts';

let failures = 0;
const ok = (label: string, value: unknown) => console.log(`  ✓ ${label}: ${value}`);
const fail = (label: string, detail: string) => {
  failures++;
  console.error(`  ✗ ${label}: ${detail}`);
};
const assert = (cond: boolean, label: string, detail = '') => (cond ? ok(label, detail || 'pass') : fail(label, detail || 'false'));

console.log('\n=== Mahdi Translate Pro — theme engine verification ===\n');

// 1. Volume ---------------------------------------------------------------
assert(THEME_COUNT >= 1000, 'theme count >= 1000', String(THEME_COUNT));
assert(THEME_COUNT === ALL_THEMES.length, 'count matches registry', String(ALL_THEMES.length));

// 2. Unique ids -----------------------------------------------------------
const ids = new Set(ALL_THEMES.map(t => t.id));
assert(ids.size === ALL_THEMES.length, 'all theme ids are unique', `${ids.size}/${ALL_THEMES.length}`);

// 3. Token sanity ---------------------------------------------------------
const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const badTokens: string[] = [];
const requiredColorKeys = [
  'bg', 'bgAlt', 'bgDeep', 'card', 'surface', 'elevated', 'text', 'subtext',
  'primary', 'primaryHover', 'onPrimary', 'secondary', 'secondaryHover',
  'onSecondary', 'accent', 'border', 'borderStrong', 'danger', 'success', 'warning', 'glow',
] as const;

for (const t of ALL_THEMES) {
  for (const key of requiredColorKeys) {
    const value = (t.colors as unknown as Record<string, string>)[key];
    if (typeof value !== 'string' || !HEX.test(value)) badTokens.push(`${t.id}.${key}=${value}`);
  }
  if (!t.backgroundImage.includes('gradient')) badTokens.push(`${t.id}.backgroundImage`);
  if (!t.shape || typeof t.shape.radius !== 'number') badTokens.push(`${t.id}.shape`);
  if (!t.bg || !t.card || !t.primary || !t.border) badTokens.push(`${t.id}.tailwind`);
}
assert(badTokens.length === 0, 'every theme has valid colour + geometry tokens', badTokens.slice(0, 5).join(', ') || `${THEME_COUNT * 21} tokens ok`);

// 4. Legibility -----------------------------------------------------------
const illegible = ALL_THEMES.filter(t => {
  // Compare the text colour against the solid version of the card surface.
  const solid = t.colors.card.slice(0, 7);
  return contrastRatio(t.colors.text, solid) < 4.5;
});
assert(illegible.length === 0, 'body text contrast >= 4.5 on every theme', illegible.length ? illegible.slice(0, 3).map(t => t.id).join(', ') : 'all readable');

const weakPrimary = ALL_THEMES.filter(t => contrastRatio(t.colors.onPrimary, t.colors.primary) < 3);
assert(weakPrimary.length === 0, 'button label contrast >= 3 on every theme', weakPrimary.length ? weakPrimary.slice(0, 3).map(t => t.id).join(', ') : 'all readable');

// 5. Category coverage ----------------------------------------------------
const counts = countByCategory();
const emptyCats = THEME_CATEGORIES.filter(c => c.id !== 'all' && c.id !== 'favorites' && c.id !== 'custom' && !counts[c.id]);
assert(emptyCats.length === 0, 'every picker category has themes', emptyCats.map(c => c.id).join(',') || Object.keys(counts).length + ' categories filled');

// 6. Search & filters -----------------------------------------------------
const arabicSearch = filterThemes({ query: 'زجاجي', limit: 5 });
assert(arabicSearch.length > 0, 'Arabic search works', `${arabicSearch.length} hits`);
const englishSearch = filterThemes({ query: 'glass', limit: 5 });
assert(englishSearch.length > 0, 'English search works', `${englishSearch.length} hits`);
const catFilter = filterThemes({ category: 'royal' });
assert(catFilter.length > 0 && catFilter.every(t => t.category === 'royal'), 'category filter is exact', String(catFilter.length));
const favFilter = filterThemes({ category: 'favorites', favorites: ['sig-mahdi-gold'] });
assert(favFilter.length === 1 && favFilter[0].id === 'sig-mahdi-gold', 'favourites filter works', String(favFilter.length));
assert(getThemeById('does-not-exist').signature === true, 'unknown id falls back to a signature theme', getThemeById('does-not-exist').id);
assert(getRandomTheme().id.length > 0, 'random theme works', getRandomTheme().nameAr);

// 7. CSS variables --------------------------------------------------------
const sample = [ALL_THEMES[0], ALL_THEMES[Math.floor(ALL_THEMES.length / 2)], ALL_THEMES[ALL_THEMES.length - 1]];
const EXPECTED_VARS = ['--mt-bg', '--mt-card', '--mt-text', '--mt-primary', '--mt-on-primary', '--mt-accent', '--mt-border', '--mt-radius', '--mt-blur', '--mt-bg-image', '--mt-pattern-image'];
let varIssues = 0;
for (const theme of sample) {
  const vars = themeCssVars(theme, { ...DEFAULT_APPEARANCE, cardOpacity: 0 });
  for (const v of EXPECTED_VARS) if (!vars[v]) varIssues++;
}
assert(varIssues === 0, 'CSS variable map is complete', `${sample.length * EXPECTED_VARS.length} variables checked`);

const glassVars = themeCssVars(ALL_THEMES[0], { cardOpacity: 0 });
const solidVars = themeCssVars(ALL_THEMES[0], { cardOpacity: 100 });
assert(glassVars['--mt-card'] !== solidVars['--mt-card'], 'card opacity slider changes the surface', `${glassVars['--mt-card']} → ${solidVars['--mt-card']}`);

// 8. Custom studio --------------------------------------------------------
const custom = createCustomTheme({
  accentColor: '#12b886',
  cardOpacity: 18,
  glassBlur: 22,
  borderRadius: 26,
  bgStyle: 'aurora',
  glowAnimation: true,
});
assert(custom.id === 'user-custom-theme' && HEX.test(custom.colors.primary), 'custom theme builder produces a valid theme', custom.nameAr);

// 9. Determinism (persistence safety) -------------------------------------
const first = getThemeById('mt-imperial-gold-glass');
const second = getThemeById('mt-imperial-gold-glass');
assert(first && second && first.colors.primary === second.colors.primary, 'theme lookup is deterministic', first ? first.colors.primary : 'n/a');

// 10. applyTheme must not throw without a DOM ----------------------------
try {
  applyTheme(ALL_THEMES[3], DEFAULT_APPEARANCE);
  ok('applyTheme without DOM', 'no-op safe');
} catch (e: any) {
  fail('applyTheme without DOM', String(e?.message || e));
}

console.log(`\n${failures === 0 ? '✅ ALL THEME CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`} — ${THEME_COUNT} themes available\n`);
process.exit(failures === 0 ? 0 : 1);
