/**
 * Theme registry — public facade over the theme engine.
 *
 * Every screen imports from here, so this file stays the single entry point
 * while `themeEngine.ts` owns the actual generation logic.
 *
 *   THEMES_LIST      → all 1500+ themes (signature themes first)
 *   THEME_CATEGORIES → picker categories with Arabic labels
 *   createCustomTheme→ the custom-theme studio builder
 */

import {
  ALL_THEMES,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID as ENGINE_DEFAULT_THEME_ID,
  THEME_CATEGORIES as ENGINE_CATEGORIES,
  applyTheme,
  countByCategory,
  createCustomTheme as engineCreateCustomTheme,
  describeTheme,
  filterThemes,
  getThemeById,
  getRandomTheme,
  themeCssVars,
} from './themeEngine.ts';
import { AppearanceOptions, CustomThemeSettings, ThemeConfig } from './types.ts';

/** Backwards-compatible alias used across the app. */
export const THEMES_LIST: ThemeConfig[] = ALL_THEMES;
export const SIGNATURE_THEMES: ThemeConfig[] = ALL_THEMES.filter(t => t.signature);
export const THEME_CATEGORIES = ENGINE_CATEGORIES;
export const DEFAULT_THEME_ID = ENGINE_DEFAULT_THEME_ID;
export const THEME_TOTAL = ALL_THEMES.length;

export {
  applyTheme,
  countByCategory,
  describeTheme,
  filterThemes,
  getThemeById,
  getRandomTheme,
  themeCssVars,
  DEFAULT_APPEARANCE,
};

export function createCustomTheme(settings: CustomThemeSettings): ThemeConfig {
  return engineCreateCustomTheme({
    accentColor: settings.accentColor,
    secondaryColor: settings.secondaryColor,
    cardOpacity: settings.cardOpacity,
    glassBlur: settings.glassBlur,
    borderRadius: settings.borderRadius,
    bgStyle: settings.bgStyle,
    glowAnimation: settings.glowAnimation,
    pattern: settings.pattern,
    shape: settings.shape,
  });
}

/** Restores a persisted theme id + appearance, always returning a valid theme. */
export function restoreTheme(themeId?: string | null): ThemeConfig {
  return getThemeById(themeId);
}

export type { AppearanceOptions };
