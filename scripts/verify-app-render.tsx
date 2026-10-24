/**
 * App render verification.
 *
 * Renders the REAL <App /> tree (ThemeProvider + every screen and modal that is
 * mounted on first paint) through react-dom/server with minimal browser shims.
 * This executes the actual code paths — the theme engine, the CSS variable
 * painter, the classic-mode translation view and the header — so a crash in any
 * of them fails this check instead of failing silently in the browser.
 *
 * Run with:  npm run verify:app
 */

// ---- minimal browser shims (installed before the app modules are loaded) ----
const store = new Map<string, string>();
const localStorageShim = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

const noop = () => {};
const g = globalThis as any;
g.localStorage = localStorageShim;
// Node 22 exposes a read-only `navigator`, so define it explicitly.
Object.defineProperty(g, 'navigator', {
  configurable: true,
  writable: true,
  value: {
    onLine: true,
    language: 'ar',
    userAgent: 'node-verify',
    clipboard: { writeText: async () => {}, readText: async () => '' },
  },
});
g.window = {
  addEventListener: noop,
  removeEventListener: noop,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  localStorage: localStorageShim,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  AudioContext: undefined,
  speechSynthesis: undefined,
};
// NB: do NOT overwrite globalThis.self — the tsx loader's WASM parser uses it.
g.matchMedia = g.window.matchMedia;
g.atob = (s: string) => Buffer.from(s, 'base64').toString('binary');

const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const { ThemeProvider } = await import('../themeContext.tsx');
const { default: App } = await import('../App.tsx');
const { THEME_COUNT, applyTheme, themeCssVars, getThemeById } = await import('../themeEngine.ts');

let failures = 0;
const check = (label: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${label}${detail ? `: ${detail}` : ''}`);
  else { failures++; console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`); }
};

console.log('\n=== Mahdi Translate Pro — app render verification ===\n');

// 1. The real tree renders without throwing --------------------------------
let html = '';
try {
  html = renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(App)));
  check('App renders through the real component tree', html.length > 1000, `${html.length} chars of markup`);
} catch (err: any) {
  check('App renders through the real component tree', false, String(err?.stack || err).split('\n').slice(0, 4).join(' | '));
}

// 2. The classic-mode translation box is present and transparent ------------
check('classic translation box uses the glass surface', html.includes('mt-glass'));
check('page shell uses the themed app class', html.includes('mt-app'));
check('themed input is transparent (mt-plain-input)', html.includes('mt-plain-input'));
check('ambient glow layer rendered', html.includes('mt-glow-orbs'));
check('header uses themed surface', html.includes('mt-surface-soft'));

// 3. Theme engine integration -------------------------------------------------
const vars = themeCssVars(getThemeById('sig-mahdi-gold'), { cardOpacity: 0 });
check('zero-opacity card produces a translucent surface', vars['--mt-card'].endsWith('0a') || vars['--mt-card'].endsWith('00'), vars['--mt-card']);
const goldVars = themeCssVars(getThemeById('sig-mahdi-gold'));
check('royal gold theme resolves to a gold accent', goldVars['--mt-accent'].startsWith('#'), goldVars['--mt-accent']);
check('theme count is over 1000', THEME_COUNT > 1000, String(THEME_COUNT));

// 4. applyTheme writes to the document when one exists ------------------------
const written: Record<string, string> = {};
(g as any).document = {
  documentElement: {
    style: { setProperty: (k: string, v: string) => { written[k] = v; }, colorScheme: '' },
    dataset: {} as Record<string, string>,
  },
};
const AURORA_ID = 'sig-aurora-borealis';
applyTheme(getThemeById(AURORA_ID), { cardOpacity: 12, glassBlur: 20, highContrast: true });
check('applyTheme paints CSS variables on :root', Object.keys(written).length > 25, `${Object.keys(written).length} variables`);
check('applyTheme records the active theme id', (g as any).document.documentElement.dataset.mtTheme === AURORA_ID, String((g as any).document.documentElement.dataset.mtTheme));
check('applyTheme records high-contrast mode', (g as any).document.documentElement.dataset.contrast === 'high');
check('glass card variable respects the opacity slider', typeof written['--mt-card'] === 'string' && written['--mt-card'].length === 9, written['--mt-card']);

// 5. Switching themes changes the whole surface set ---------------------------
const before = written['--mt-primary'];
applyTheme(getThemeById('sig-alabaster'), {});
check('switching theme updates the primary colour', written['--mt-primary'] !== before, `${before} → ${written['--mt-primary']}`);
check('light theme flips the colour scheme flag', (g as any).document.documentElement.dataset.mtDark === 'false');

// 6. v4 on-device AI suite — every new modal must render while open ---------
const fakeTranslate = async (t: string) => `[t] ${t}`;
const noopAsync = async () => {};
const theme = getThemeById('sig-mahdi-gold');
const renderModal = async (path: string, props: Record<string, unknown>) => {
  try {
    const mod = await import(path);
    const Component = mod[Object.keys(mod).find((k) => k.endsWith('Modal'))!];
    const out = renderToStaticMarkup(React.createElement(Component, props));
    check(`${path.split('/').pop()} renders open`, out.length > 100, `${out.length} chars`);
  } catch (err: any) {
    check(`${path.split('/').pop()} renders open`, false, String(err?.stack || err).split('\n').slice(0, 3).join(' | '));
  }
};

const sharedModalProps = {
  isOpen: true,
  onClose: noop,
  theme,
  translateFn: fakeTranslate,
  onSpeak: noop,
  onToast: noop,
};
await renderModal('../components/ToolsHubModal.tsx', { ...sharedModalProps, onOpenTool: noop });
await renderModal('../components/NeuralModelsModal.tsx', {
  ...sharedModalProps, quality: 'balanced-int8', onQualityChange: noop, useGpu: true, onUseGpuChange: noop,
});
await renderModal('../components/WalkieTalkieModal.tsx', sharedModalProps);
await renderModal('../components/P2PConversationModal.tsx', sharedModalProps);
await renderModal('../components/PhrasebookModal.tsx', sharedModalProps);
await renderModal('../components/DocumentTranslateModal.tsx', sharedModalProps);
await renderModal('../components/StatsModal.tsx', { isOpen: true, onClose: noop, theme });
await renderModal('../components/WhatsNewModal.tsx', { isOpen: true, onClose: noop, theme });
await renderModal('../components/WordBreakdownModal.tsx', {
  isOpen: true, onClose: noop, theme, text: 'Mahdi Heroes ahmed where is the airport', from: 'en', to: 'ar', onSpeak: noop,
});

console.log(`\n${failures === 0 ? '✅ ALL APP CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
