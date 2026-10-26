/**
 * floatingWindow.ts — bridge to the native SYSTEM_ALERT_WINDOW overlay.
 *
 * On Android (Capacitor shell) the calls reach FloatingWindowPlugin.java,
 * which starts FloatingWindowService: a draggable bubble + WebView panel that
 * stays above every other app. On the web/PWA build every method resolves
 * safely with `granted: false` so callers can fall back to the in-page
 * FloatingTranslateWindow component instead.
 */
import { registerPlugin, Capacitor } from '@capacitor/core';

export interface FloatingWindowOptions {
  width?: number;  // dp
  height?: number; // dp
  x?: number;      // dp
  y?: number;      // dp
}

export interface PermissionResult {
  granted: boolean;
  available?: boolean;
  openedSettings?: boolean;
}

interface FloatingWindowPluginShape {
  checkPermission(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionResult>;
  openSettings(): Promise<void>;
  show(options?: FloatingWindowOptions): Promise<void>;
  hide(): Promise<void>;
}

const FloatingWindowPlugin = registerPlugin<FloatingWindowPluginShape>('FloatingWindow', {
  web: {
    async checkPermission(): Promise<PermissionResult> {
      return { granted: false, available: false };
    },
    async requestPermission(): Promise<PermissionResult> {
      return { granted: false, available: false, openedSettings: false };
    },
    async openSettings(): Promise<void> { /* web has no overlay settings */ },
    async show(): Promise<void> {
      throw new Error('النافذة العائمة الأصلية متاحة داخل تطبيق أندرويد فقط');
    },
    async hide(): Promise<void> { /* noop */ },
  },
});

export function isNativeOverlaySupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkOverlayPermission(): Promise<PermissionResult> {
  try {
    return await FloatingWindowPlugin.checkPermission();
  } catch {
    return { granted: false, available: false };
  }
}

export async function requestOverlayPermission(): Promise<PermissionResult> {
  try {
    return await FloatingWindowPlugin.requestPermission();
  } catch {
    return { granted: false, available: false, openedSettings: false };
  }
}

export async function openOverlaySettings(): Promise<void> {
  try {
    await FloatingWindowPlugin.openSettings();
  } catch { /* noop */ }
}

export async function showNativeOverlay(options: FloatingWindowOptions = {}): Promise<void> {
  await FloatingWindowPlugin.show(options);
}

export async function hideNativeOverlay(): Promise<void> {
  try {
    await FloatingWindowPlugin.hide();
  } catch { /* noop */ }
}
