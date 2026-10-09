import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ALL_THEMES,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID,
  applyTheme,
  getThemeById,
  getRandomTheme,
} from './themeEngine.ts';
import { AppearanceOptions, ThemeConfig } from './types.ts';

const THEME_KEY = 'mahdi_theme_id';
const APPEARANCE_KEY = 'mahdi_appearance';

interface ThemeContextValue {
  /** Active theme. */
  theme: ThemeConfig;
  /** Runtime appearance sliders / accessibility flags. */
  appearance: AppearanceOptions;
  /** Full registry (1500+ themes). */
  themes: ThemeConfig[];
  total: number;
  setTheme: (theme: ThemeConfig) => void;
  setThemeById: (id: string) => void;
  updateAppearance: (patch: Partial<AppearanceOptions>) => void;
  resetAppearance: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  pickRandomTheme: () => ThemeConfig;
  /** Live CSS variable map for the active theme (handy for inline styles). */
  cssVars: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredThemeId(): string {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

function readStoredAppearance(): AppearanceOptions {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APPEARANCE,
      ...parsed,
      recentThemeIds: Array.isArray(parsed?.recentThemeIds) ? parsed.recentThemeIds.slice(0, 12) : [],
      favoriteThemeIds: Array.isArray(parsed?.favoriteThemeIds) ? parsed.favoriteThemeIds : [],
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => getThemeById(readStoredThemeId()));
  const [appearance, setAppearance] = useState<AppearanceOptions>(readStoredAppearance);
  const saveTimer = useRef<number | null>(null);

  // Paint the theme onto :root whenever it (or the appearance) changes.
  useEffect(() => {
    applyTheme(theme, appearance);
  }, [theme, appearance]);

  // Persist (debounced so dragging a slider does not hammer localStorage).
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(THEME_KEY, theme.id);
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
      } catch {
        /* storage disabled — the app still works, it just won't remember */
      }
    }, 180);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [theme, appearance]);

  const setTheme = useCallback((next: ThemeConfig) => {
    setThemeState(next);
    setAppearance(prev => {
      const recent = [next.id, ...prev.recentThemeIds.filter(id => id !== next.id)].slice(0, 12);
      return { ...prev, recentThemeIds: recent };
    });
  }, []);

  const setThemeById = useCallback((id: string) => setTheme(getThemeById(id)), [setTheme]);

  const updateAppearance = useCallback((patch: Partial<AppearanceOptions>) => {
    setAppearance(prev => ({ ...prev, ...patch }));
  }, []);

  const resetAppearance = useCallback(() => {
    setAppearance(prev => ({ ...DEFAULT_APPEARANCE, recentThemeIds: prev.recentThemeIds, favoriteThemeIds: prev.favoriteThemeIds }));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setAppearance(prev => {
      const has = prev.favoriteThemeIds.includes(id);
      return {
        ...prev,
        favoriteThemeIds: has ? prev.favoriteThemeIds.filter(f => f !== id) : [...prev.favoriteThemeIds, id],
      };
    });
  }, []);

  const isFavorite = useCallback((id: string) => appearance.favoriteThemeIds.includes(id), [appearance.favoriteThemeIds]);

  const pickRandomTheme = useCallback(() => {
    const next = getRandomTheme(theme.id);
    setTheme(next);
    return next;
  }, [theme.id, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      appearance,
      themes: ALL_THEMES,
      total: ALL_THEMES.length,
      setTheme,
      setThemeById,
      updateAppearance,
      resetAppearance,
      toggleFavorite,
      isFavorite,
      pickRandomTheme,
      cssVars: {},
    }),
    [theme, appearance, setTheme, setThemeById, updateAppearance, resetAppearance, toggleFavorite, isFavorite, pickRandomTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Safe hook: works even if a component renders outside the provider. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  const fallbackTheme = getThemeById(DEFAULT_THEME_ID);
  return {
    theme: fallbackTheme,
    appearance: DEFAULT_APPEARANCE,
    themes: ALL_THEMES,
    total: ALL_THEMES.length,
    setTheme: () => {},
    setThemeById: () => {},
    updateAppearance: () => {},
    resetAppearance: () => {},
    toggleFavorite: () => {},
    isFavorite: () => false,
    pickRandomTheme: () => fallbackTheme,
    cssVars: {},
  };
}
