import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ThemeConfig,
  TranslationHistoryItem,
  TtsSettings,
  ZoomLevel,
  MoreTranslation,
  WordDefinition,
} from './types.ts';
import {
  LANGUAGES,
  detectLanguageFromText,
} from './constants.ts';
import { useTheme } from './themeContext.tsx';
import { ThemeGallery } from './components/ThemeGallery.tsx';
import { translateText, translateImage } from './geminiService.ts';
import { translateOffline } from './offlineEngine.ts';
import {
  getOfflinePacks,
  subscribeToPacks,
  isLanguageDownloaded,
  downloadPackForLanguage,
} from './offlinePacksManager.ts';
import { SettingsModal } from './components/SettingsModal.tsx';
import { OfflinePacksModal } from './components/OfflinePacksModal.tsx';
import { DualConversationModal } from './components/DualConversationModal.tsx';
import { FloatingTranslateWindow } from './components/FloatingTranslateWindow.tsx';
import { ImageTranslateModal } from './components/ImageTranslateModal.tsx';
import { ZoomModal } from './components/ZoomModal.tsx';
import { LanguageSelectDropdown } from './components/LanguageSelectDropdown.tsx';
import { StarredTranslationsModal } from './components/StarredTranslationsModal.tsx';
import { GoogleTranslateResultView } from './components/GoogleTranslateResultView.tsx';
import { InstallAppButton } from './components/InstallAppButton.tsx';
import { OverlayPermissionGuide } from './components/OverlayPermissionGuide.tsx';
import { ensureTargetScript, beautifyArabic } from './transliterate.ts';
import { recognizeImageText } from './ocr.ts';
import { tts } from './tts.ts';
import {
  isNativeOverlaySupported,
  checkOverlayPermission,
  showNativeOverlay,
} from './floatingWindow.ts';
import {
  createSpeechSession,
  initHardwareBack,
  exitNativeApp,
  pushBackHandler,
  SpeechSession,
} from './platform.ts';
import {
  History, Volume2, Copy, Camera, Mic, MicOff, ArrowRightLeft,
  Trash2, X, Wifi, WifiOff, Sparkles, Star, CornerDownLeft,
  Palette, Settings as SettingsIcon, SquareStack, Share2, MessageSquareText,
} from 'lucide-react';

const AVAILABLE_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
const HISTORY_LIMIT = 60;

export const App: React.FC = () => {
  const { theme: currentTheme } = useTheme();

  // ── Core translation state ──────────────────────────────────────────────
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('ar');
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [translationEngine, setTranslationEngine] = useState<'online' | 'offline'>('online');
  const [transliteration, setTransliteration] = useState<string>('');
  const [detectedLangBanner, setDetectedLangBanner] = useState<string>('');
  const [moreTranslations, setMoreTranslations] = useState<MoreTranslation[]>([]);
  const [definitions, setDefinitions] = useState<WordDefinition[]>([]);

  // ── Preferences ─────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    try { return Number(localStorage.getItem('mahdi_zoom')) || 100; } catch { return 100; }
  });
  const [forceOffline, setForceOffline] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_force_offline') === 'true' || !navigator.onLine; } catch { return !navigator.onLine; }
  });
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [instantTranslate, setInstantTranslate] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_instant_translate') !== 'false'; } catch { return true; }
  });
  const [keepScreenOn, setKeepScreenOn] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_keep_screen_on') === 'true'; } catch { return false; }
  });
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>(() => {
    try {
      const saved = localStorage.getItem('mahdi_tts_settings');
      return saved ? JSON.parse(saved) : { voiceName: 'Kore', rate: 1.0, pitch: 1.0 };
    } catch { return { voiceName: 'Kore', rate: 1.0, pitch: 1.0 }; }
  });

  // ── History ─────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // ── Modals / sheets ─────────────────────────────────────────────────────
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeGalleryOpen, setIsThemeGalleryOpen] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isPacksOpen, setIsPacksOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isOverlayGuideOpen, setIsOverlayGuideOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isDualOpen, setIsDualOpen] = useState(false);

  // ── Voice input ─────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [speechInterim, setSpeechInterim] = useState('');
  const speechSessionRef = useRef<SpeechSession | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const translationCache = useRef<Map<string, string>>(new Map());
  const lastTranslatedText = useRef<string>('');
  const requestSeq = useRef(0);
  const wakeLockRef = useRef<any>(null);
  const lastBackPress = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(() => { try { localStorage.setItem('mahdi_zoom', String(zoom)); } catch { /* noop */ } }, [zoom]);
  useEffect(() => { try { localStorage.setItem('mahdi_force_offline', String(forceOffline)); } catch { /* noop */ } }, [forceOffline]);
  useEffect(() => { try { localStorage.setItem('mahdi_instant_translate', String(instantTranslate)); } catch { /* noop */ } }, [instantTranslate]);
  useEffect(() => { try { localStorage.setItem('mahdi_keep_screen_on', String(keepScreenOn)); } catch { /* noop */ } }, [keepScreenOn]);
  useEffect(() => { try { localStorage.setItem('mahdi_tts_settings', JSON.stringify(ttsSettings)); } catch { /* noop */ } }, [ttsSettings]);
  useEffect(() => { try { localStorage.setItem('mahdi_translate_history', JSON.stringify(history)); } catch { /* noop */ } }, [history]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mahdi_translate_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* noop */ }
    // PWA shortcut: /?action=floating opens the floating window directly.
    try {
      if (new URLSearchParams(window.location.search).get('action') === 'floating') {
        setIsFloatingOpen(true);
      }
    } catch { /* noop */ }
  }, []);

  // ── Connectivity ────────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => { setIsOffline(false); setForceOffline(false); showToast('تمت استعادة الاتصال بالإنترنت 🌐'); };
    const goOffline = () => { setIsOffline(true); setForceOffline(true); showToast('وضع بدون إنترنت — الترجمة المحلية تعمل 📴'); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [showToast]);

  // ── Wake lock: keep the screen lit while the user translates ────────────
  useEffect(() => {
    let cancelled = false;
    const requestLock = async () => {
      if (!keepScreenOn || !('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch { /* permission/visibility issues are non-fatal */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible' && keepScreenOn) void requestLock(); };
    if (keepScreenOn) {
      void requestLock();
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release?.().catch(() => undefined);
      wakeLockRef.current = null;
      if (cancelled) { /* cleanup only */ }
    };
  }, [keepScreenOn]);

  // ── Hardware back: close sheets first, then double-press to exit ────────
  const handleExitRequest = useCallback(() => {
    const now = Date.now();
    if (now - lastBackPress.current < 2000) {
      void exitNativeApp();
      return;
    }
    lastBackPress.current = now;
    showToast('اضغط زر الرجوع مرة أخرى للخروج');
  }, [showToast]);

  const modalCloserRef = useRef<() => boolean>(() => false);
  modalCloserRef.current = () => {
    const closers: Array<[boolean, () => void]> = [
      [isDualOpen, () => setIsDualOpen(false)],
      [isImageModalOpen, () => setIsImageModalOpen(false)],
      [isFloatingOpen, () => setIsFloatingOpen(false)],
      [isThemeGalleryOpen, () => setIsThemeGalleryOpen(false)],
      [isPacksOpen, () => setIsPacksOpen(false)],
      [isStarredOpen, () => setIsStarredOpen(false)],
      [isOverlayGuideOpen, () => setIsOverlayGuideOpen(false)],
      [isZoomOpen, () => setIsZoomOpen(false)],
      [isSettingsOpen, () => setIsSettingsOpen(false)],
      [showHistory, () => setShowHistory(false)],
    ];
    for (const [open, close] of closers) {
      if (open) { close(); return true; }
    }
    return false;
  };

  useEffect(() => {
    initHardwareBack(handleExitRequest);
    const unregister = pushBackHandler(() => modalCloserRef.current());
    return unregister;
  }, [handleExitRequest]);

  // ── Derived language metadata ───────────────────────────────────────────
  useEffect(() => {
    if (sourceLang === 'auto' && inputText.trim()) {
      setDetectedLangCode(detectLanguageFromText(inputText));
    } else {
      setDetectedLangCode('');
    }
  }, [inputText, sourceLang]);

  const sourceLangObj = LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangObj = LANGUAGES.find((l) => l.code === targetLang);
  const sourceLangName = sourceLangObj?.name || (sourceLang === 'auto' ? 'التعرف التلقائي' : '');
  const targetLangName = targetLangObj?.name || '';
  const detectedLanguageName = detectedLangCode
    ? LANGUAGES.find((l) => l.code === detectedLangCode)?.nativeName || ''
    : '';
  const favorites = history.filter((i) => i.isFavorite);
  const isCurrentFavorite = Boolean(history.find((i) => i.sourceText === inputText.trim() && i.isFavorite));

  /** Every output, from every engine, is forced into the target script. */
  const finalizeTarget = useCallback((t: string, to: string): string => {
    if (!t) return t;
    return beautifyArabic(ensureTargetScript(t, to), to);
  }, []);

  const cachePut = useCallback((key: string, value: string) => {
    const map = translationCache.current;
    map.set(key, value);
    if (map.size > 400) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
  }, []);

  // ── Translation pipeline ────────────────────────────────────────────────
  const handleTranslate = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setResultText(''); return; }
    if (trimmed === lastTranslatedText.current) return;

    const seq = ++requestSeq.current;
    const isStale = () => seq !== requestSeq.current;
    const cacheKey = `${trimmed}__${sourceLang}__${targetLang}`;
    if (translationCache.current.has(cacheKey)) {
      setResultText(translationCache.current.get(cacheKey)!);
      lastTranslatedText.current = trimmed;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const activeFrom = sourceLang === 'auto' ? (detectLanguageFromText(trimmed) || 'en') : sourceLang;
    const offlineMode = forceOffline || !navigator.onLine;

    const remember = (translated: string, mode: 'online' | 'offline') => {
      setHistory((prev) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sourceText: trimmed,
        translatedText: translated,
        sourceLang: activeFrom,
        targetLang,
        timestamp: Date.now(),
        mode,
      }, ...prev.filter((i) => i.sourceText !== trimmed)].slice(0, HISTORY_LIMIT));
    };

    if (offlineMode) {
      try {
        const local = translateOffline(trimmed, sourceLang, targetLang, {});
        if (isStale()) return;
        const safe = finalizeTarget(local.translation, targetLang);
        setResultText(safe);
        setTransliteration(local.transliteration || '');
        setDetectedLangBanner(local.detectedLanguageName || '');
        setMoreTranslations(local.moreTranslations || []);
        setDefinitions(local.definitions || []);
        setTranslationEngine('offline');
        cachePut(cacheKey, safe);
        lastTranslatedText.current = trimmed;
        remember(safe, 'offline');
      } catch {
        if (!isStale()) setError('تعذّرت الترجمة المحلية.');
      } finally {
        if (!isStale()) setIsLoading(false);
      }
      return;
    }

    try {
      const result = await translateText(trimmed, activeFrom, targetLang);
      if (isStale()) return;
      const safe = finalizeTarget(result.translation, targetLang);
      setResultText(safe);
      setTransliteration(result.transliteration || '');
      setDetectedLangBanner(result.detectedLanguageName || '');
      setMoreTranslations(result.moreTranslations || []);
      setDefinitions(result.definitions || []);
      setTranslationEngine('online');
      setError(null);
      cachePut(cacheKey, safe);
      lastTranslatedText.current = trimmed;
      remember(safe, 'online');
    } catch (err) {
      // Network / server failure → instant bundled dictionary, never a dead end.
      console.warn('Online translation failed, using offline engine:', err);
      try {
        const local = translateOffline(trimmed, sourceLang, targetLang, {});
        if (isStale()) return;
        const safe = finalizeTarget(local.translation, targetLang);
        setResultText(safe);
        setTransliteration(local.transliteration || '');
        setDetectedLangBanner(local.detectedLanguageName || '');
        setMoreTranslations(local.moreTranslations || []);
        setDefinitions(local.definitions || []);
        setTranslationEngine('offline');
        cachePut(cacheKey, safe);
        lastTranslatedText.current = trimmed;
        remember(safe, 'offline');
        showToast('تعذّر الاتصال — تمت الترجمة بالمحرك المحلي ⚡');
      } catch {
        if (!isStale()) setError('تعذّر إتمام الترجمة. تحقق من الاتصال وحاول مجدداً.');
      }
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [sourceLang, targetLang, forceOffline, finalizeTarget, cachePut, showToast]);

  // Instant Google-style debounced translation while typing.
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (!instantTranslate) return;
    const delay = forceOffline || !navigator.onLine ? 140 : 300;
    const t = window.setTimeout(() => { void handleTranslate(inputText); }, delay);
    return () => window.clearTimeout(t);
  }, [inputText, instantTranslate, forceOffline, handleTranslate]);

  const handleSourceTextChange = (newText: string) => {
    setSpeechInterim('');
    setInputText(newText);
    if (!newText.trim()) {
      setResultText('');
      setTransliteration('');
      setDetectedLangBanner('');
      setMoreTranslations([]);
      setDefinitions([]);
      lastTranslatedText.current = '';
      return;
    }
    // Zero-latency local dictionary preview while the online call is in flight.
    const instant = translateOffline(newText.trim(), sourceLang, targetLang, {});
    if (instant && instant.confidence !== 'fallback' && instant.translation) {
      setResultText(finalizeTarget(instant.translation, targetLang));
      setTransliteration(instant.transliteration || '');
      setDetectedLangBanner(instant.detectedLanguageName || '');
      setMoreTranslations(instant.moreTranslations || []);
      setDefinitions(instant.definitions || []);
      if (forceOffline || !navigator.onLine) lastTranslatedText.current = newText.trim();
    }
  };

  // ── Voice input (native plugin on Android, Web Speech API in browsers) ──
  const toggleListening = useCallback(async () => {
    if (isListening) {
      speechSessionRef.current?.stop();
      setIsListening(false);
      if (speechInterim) {
        setInputText((prev) => (prev ? `${prev.trim()} ${speechInterim}` : speechInterim));
        setSpeechInterim('');
      }
      return;
    }

    const lang = sourceLang === 'auto' ? (detectedLangCode || 'ar') : sourceLang;
    const session = await createSpeechSession({
      onPartial: (t) => setSpeechInterim(t),
      onFinal: (t) => {
        setSpeechInterim('');
        setInputText((prev) => (prev ? `${prev.trim()} ${t}` : t));
      },
      onError: (m) => { setError(m); setIsListening(false); },
      onEnd: () => setIsListening(false),
    });

    if (!session) {
      setError('التعرف الصوتي غير مدعوم على هذا الجهاز أو المتصفح.');
      return;
    }
    try {
      await session.start(lang);
      speechSessionRef.current = session;
      setIsListening(true);
      setError(null);
      showToast('جاري الاستماع لصوتك الآن...');
    } catch {
      setIsListening(false);
      setError('تعذّر بدء التعرف الصوتي. تحقق من إذن الميكروفون.');
    }
  }, [isListening, speechInterim, sourceLang, detectedLangCode, showToast]);

  // ── Small shared actions ────────────────────────────────────────────────
  // Robust local TTS: cancels previous speech, waits for device voices, and
  // always uses the freshest text (no stale closures) — works before and
  // after translation, online and offline.
  const handleSpeak = useCallback((text: string, lang: string) => {
    if (!text?.trim()) return;
    const actualLang = lang === 'auto' ? (detectedLangCode || 'ar') : lang;
    void tts.speak(text, actualLang, ttsSettings.rate || 1, ttsSettings.pitch || 1);
  }, [detectedLangCode, ttsSettings]);

  const copyToClipboard = useCallback((text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    showToast('تم النسخ إلى الحافظة ✓');
  }, [showToast]);

  const shareTranslation = useCallback(async (source: string, translated: string) => {
    if (!translated) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'مهدي للترجمة', text: `${source}\n${translated}` });
      } catch { /* user cancelled */ }
    } else {
      copyToClipboard(translated);
    }
  }, [copyToClipboard]);

  const swapLanguages = useCallback(() => {
    const actualSource = sourceLang === 'auto' ? (detectedLangCode || 'en') : sourceLang;
    setSourceLang(targetLang);
    setTargetLang(actualSource);
    lastTranslatedText.current = '';
    const prevInput = inputText;
    setInputText(resultText);
    setResultText(prevInput);
  }, [sourceLang, targetLang, detectedLangCode, inputText, resultText]);

  const handleClearAll = useCallback(() => {
    setInputText('');
    setResultText('');
    setTransliteration('');
    setDetectedLangBanner('');
    setMoreTranslations([]);
    setDefinitions([]);
    setSpeechInterim('');
    lastTranslatedText.current = '';
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) { handleSourceTextChange(text.trim()); showToast('تم لصق النص 📋'); }
      else showToast('الحافظة فارغة حالياً');
    } catch { showToast('يرجى السماح بالوصول إلى الحافظة'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast, sourceLang, targetLang, forceOffline]);

  const toggleFavorite = useCallback((idOrItem?: string) => {
    if (typeof idOrItem === 'string') {
      setHistory((prev) => prev.map((it) => (it.id === idOrItem ? { ...it, isFavorite: !it.isFavorite } : it)));
      showToast('تم تحديث المفضلة ⭐');
      return;
    }
    const trimmed = inputText.trim();
    if (!trimmed || !resultText) return;
    setHistory((prev) => {
      const idx = prev.findIndex((it) => it.sourceText === trimmed);
      if (idx >= 0) {
        const nowFav = !prev[idx].isFavorite;
        showToast(nowFav ? 'تم الحفظ في المفضلة ⭐' : 'تمت الإزالة من المفضلة');
        return prev.map((it, i) => (i === idx ? { ...it, isFavorite: nowFav } : it));
      }
      showToast('تم الحفظ في المفضلة ⭐');
      return [{
        id: Date.now().toString(), sourceText: trimmed, translatedText: resultText,
        sourceLang, targetLang, timestamp: Date.now(), isFavorite: true, mode: translationEngine,
      }, ...prev];
    });
  }, [inputText, resultText, sourceLang, targetLang, translationEngine, showToast]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast('تم مسح السجل بالكامل ✓');
  }, [showToast]);

  const restoreItem = useCallback((item: TranslationHistoryItem) => {
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setInputText(item.sourceText);
    setResultText(item.translatedText);
    lastTranslatedText.current = item.sourceText;
    setError(null);
    setShowHistory(false);
  }, []);

  const handleQuickDownloadLanguage = useCallback((langCode: string) => {
    const langObj = LANGUAGES.find((l) => l.code === langCode);
    const langName = langObj ? langObj.nativeName : langCode;
    if (isLanguageDownloaded(langCode)) {
      showToast(`حزمة ${langName} محملة وجاهزة أوفلاين ✓`);
      setIsPacksOpen(true);
      return;
    }
    const triggered = downloadPackForLanguage(langCode);
    if (triggered) showToast(`جاري تنزيل حزمة ${langName} للاستخدام بدون إنترنت 📥...`);
    else setIsPacksOpen(true);
  }, [showToast]);

  // ── Image translation: server vision first, on-device OCR guaranteed ────
  const handleImageTranslate = useCallback(async (rawBase64: string, lang: string): Promise<string> => {
    try {
      const out = await translateImage(rawBase64, lang);
      if (out && !/^\[No text detected/i.test(out)) return out;
      throw new Error('empty');
    } catch (serverErr) {
      console.warn('Server vision unavailable, falling back to on-device OCR:', serverErr);
      const dataUrl = rawBase64.startsWith('data:') ? rawBase64 : `data:image/jpeg;base64,${rawBase64}`;
      const ocrText = await recognizeImageText(dataUrl, lang, sourceLang);
      if (!ocrText) throw new Error('لم يتم العثور على نص قابل للقراءة في الصورة.');
      const from = sourceLang === 'auto' ? (detectLanguageFromText(ocrText) || 'en') : sourceLang;
      try {
        const r = await translateText(ocrText, from, lang);
        return finalizeTarget(r.translation, lang);
      } catch {
        const off = translateOffline(ocrText, from, lang, {});
        return finalizeTarget(off.translation, lang);
      }
    }
  }, [sourceLang, finalizeTarget]);

  // Floating window uses the same online→offline pipeline.
  const floatingTranslate = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    try {
      const r = await translateText(text, from === 'auto' ? (detectLanguageFromText(text) || 'en') : from, to);
      return finalizeTarget(r.translation, to);
    } catch {
      const off = translateOffline(text, from, to, {});
      return finalizeTarget(off.translation, to);
    }
  }, [finalizeTarget]);

  // Floating entry point: native SYSTEM_ALERT_WINDOW overlay on Android, with
  // the permission guide when needed; in-page floating window on web/PWA.
  const openFloating = useCallback(async () => {
    if (!isNativeOverlaySupported()) {
      setIsFloatingOpen(true);
      return;
    }
    const perm = await checkOverlayPermission();
    if (perm.granted) {
      try {
        await showNativeOverlay({ width: 320, height: 380, x: 24, y: 120 });
        showToast('النافذة العائمة تعمل الآن فوق كل التطبيقات 🪟');
      } catch {
        setIsOverlayGuideOpen(true);
      }
    } else {
      setIsOverlayGuideOpen(true);
    }
  }, [showToast]);

  const composedSource = speechInterim ? `${inputText}${inputText ? ' ' : ''}${speechInterim}` : inputText;
  const offlineActive = forceOffline || isOffline;

  return (
    <div className="mt-app w-full min-h-screen flex flex-col" dir="rtl">
      <div className="mt-glow-orbs" aria-hidden="true"><span /><span /><span /></div>

      {toastMessage && (
        <div className="mt-toast mt-fade-in fixed top-5 left-1/2 -translate-x-1/2 z-[115] px-5 py-2 text-xs font-bold flex items-center gap-2" role="status" aria-live="polite">
          <Sparkles size={14} className="mt-accent-text" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full flex-1 flex flex-col p-3 sm:p-5 md:p-6 max-w-3xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header
          className="mt-surface-soft w-full flex items-center justify-between gap-2 mb-3 px-3 py-2 border"
          style={{ borderColor: 'var(--mt-border)', borderRadius: 'var(--mt-radius)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/icons/icon-192.png" alt="Translate Mahdi 2027" className="w-9 h-9 rounded-xl shadow shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold mt-heading truncate leading-tight">مهدي للترجمة 2027</h1>
              <p className="text-[9.5px] mt-subtext font-semibold truncate flex items-center gap-1">
                {offlineActive ? <WifiOff size={10} /> : <Wifi size={10} />}
                {offlineActive ? 'وضع بدون إنترنت' : 'ترجمة فورية'}
              </p>
            </div>
          </div>

          {/* Ordered horizontal top bar: icon + label, labels hide on phones */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button onClick={openFloating} className="mt-topbar-btn" title="النافذة العائمة فوق التطبيقات" aria-label="النافذة العائمة">
              <SquareStack size={17} />
              <span className="mt-topbar-label">عائمة</span>
            </button>
            <button onClick={() => setIsThemeGalleryOpen(true)} className="mt-topbar-btn" title="مكتبة الثيمات" aria-label="مكتبة الثيمات">
              <Palette size={17} />
              <span className="mt-topbar-label">ثيمات</span>
            </button>
            <InstallAppButton />
            <button onClick={() => setIsSettingsOpen(true)} className="mt-topbar-btn" title="الإعدادات" aria-label="الإعدادات">
              <SettingsIcon size={17} />
              <span className="mt-topbar-label">إعدادات</span>
            </button>
          </div>
        </header>

        <main className="w-full flex flex-col gap-3 flex-1">
          {/* ── Language selector pill ──────────────────────────────── */}
          <div className="mt-glass rounded-full px-2 py-1.5 flex items-center justify-between gap-1">
            <div className="flex-1 flex items-center justify-center min-w-0">
              <LanguageSelectDropdown
                label="من"
                value={sourceLang}
                onChange={(c) => { setSourceLang(c); lastTranslatedText.current = ''; }}
                allowAutoDetect
                isLanguageDownloaded={isLanguageDownloaded}
                onDownloadLanguage={handleQuickDownloadLanguage}
                onOpenOfflinePacks={() => setIsPacksOpen(true)}
              />
            </div>
            <button
              onClick={swapLanguages}
              className="mt-touch-btn mt-icon-btn rounded-full shrink-0"
              title="عكس اللغتين"
              aria-label="عكس اللغتين"
            >
              <ArrowRightLeft size={17} />
            </button>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <LanguageSelectDropdown
                label="إلى"
                value={targetLang}
                onChange={(c) => { setTargetLang(c); lastTranslatedText.current = ''; }}
                isLanguageDownloaded={isLanguageDownloaded}
                onDownloadLanguage={handleQuickDownloadLanguage}
                onOpenOfflinePacks={() => setIsPacksOpen(true)}
              />
            </div>
          </div>

          {/* ── Main Google-style translation surface ───────────────── */}
          <GoogleTranslateResultView
            sourceText={composedSource}
            sourceLangName={sourceLangName}
            targetLangName={targetLangName}
            translatedText={resultText}
            transliteration={transliteration}
            detectedLangName={detectedLangBanner || detectedLanguageName}
            moreTranslations={moreTranslations}
            definitions={definitions}
            isFavorite={isCurrentFavorite}
            isLoading={isLoading}
            onSourceTextChange={handleSourceTextChange}
            onToggleFavorite={() => toggleFavorite()}
            onSpeakSource={() => handleSpeak(inputText, sourceLang)}
            onSpeakTarget={() => handleSpeak(resultText, targetLang)}
            onCopySource={() => copyToClipboard(inputText)}
            onCopyTarget={() => copyToClipboard(resultText)}
            onClear={handleClearAll}
            onOpenZoom={() => setIsZoomOpen(true)}
            onShowToast={showToast}
            onPaste={handlePaste}
          />

          {error && (
            <div className="mt-surface rounded-2xl border px-4 py-2.5 text-[11px] font-bold flex items-center gap-2"
              style={{ borderColor: 'var(--mt-danger)', color: 'var(--mt-danger)' }}>
              {error}
            </div>
          )}

          {/* Quick tool row: history / favourites / share */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={() => setShowHistory((v) => !v)} className="mt-btn mt-btn-ghost rounded-full px-3 py-2 text-[11px] font-bold flex items-center gap-1.5" data-active={showHistory}>
              <History size={14} /> السجل
            </button>
            <button onClick={() => setIsStarredOpen(true)} className="mt-btn mt-btn-ghost rounded-full px-3 py-2 text-[11px] font-bold flex items-center gap-1.5 relative">
              <Star size={14} /> المفضلة
              {favorites.length > 0 && (
                <span className="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: 'var(--mt-primary)', color: 'var(--mt-on-primary)' }}>
                  {favorites.length}
                </span>
              )}
            </button>
            <button onClick={() => shareTranslation(inputText, resultText)} className="mt-btn mt-btn-ghost rounded-full px-3 py-2 text-[11px] font-bold flex items-center gap-1.5">
              <Share2 size={14} /> مشاركة
            </button>
            {!instantTranslate && (
              <button onClick={() => void handleTranslate(inputText)} disabled={!inputText.trim() || isLoading}
                className="mt-btn mt-btn-primary rounded-full px-4 py-2 text-[11px] font-extrabold flex items-center gap-1.5">
                <CornerDownLeft size={14} /> ترجم
              </button>
            )}
          </div>

          {/* ── History sheet ───────────────────────────────────────── */}
          {showHistory && (
            <section className="mt-surface rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--mt-border)' }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="flex items-center gap-2 text-xs font-extrabold"><History size={15} /> سجل الترجمة</div>
                <div className="flex items-center gap-1">
                  <button onClick={clearHistory} className="mt-icon-btn p-1.5" title="مسح السجل"><Trash2 size={15} /></button>
                  <button onClick={() => setShowHistory(false)} className="mt-icon-btn p-1.5" title="إغلاق"><X size={15} /></button>
                </div>
              </div>
              <div className="max-h-[38vh] overflow-y-auto mt-scroll">
                {history.length === 0 ? (
                  <p className="text-[11px] mt-subtext text-center py-6">لا توجد ترجمات محفوظة بعد.</p>
                ) : history.map((item) => (
                  <button key={item.id} onClick={() => restoreItem(item)}
                    className="w-full text-start px-4 py-2.5 border-b last:border-0 hover:bg-black/5 transition-colors"
                    style={{ borderColor: 'var(--mt-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold truncate flex-1" dir="auto">{item.sourceText}</span>
                      <span className="text-[9px] mt-subtext shrink-0">{item.mode === 'offline' ? 'أوفلاين' : 'أونلاين'}</span>
                    </div>
                    <div className="text-[11px] mt-accent-text font-extrabold truncate mt-0.5" dir="auto">{item.translatedText}</div>
                    <div className="flex items-center gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleSpeak(item.translatedText, item.targetLang)} className="mt-icon-btn p-1" title="نطق"><Volume2 size={13} /></button>
                      <button onClick={() => copyToClipboard(item.translatedText)} className="mt-icon-btn p-1" title="نسخ"><Copy size={13} /></button>
                      <button onClick={() => toggleFavorite(item.id)} className="mt-icon-btn p-1" title="مفضلة">
                        <Star size={13} className={item.isFavorite ? 'fill-[var(--mt-accent)] mt-accent-text' : ''} />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Bottom action dock: camera · mic · conversation ─────── */}
          <div className="mt-auto pt-3 mt-safe-bottom-pad flex flex-col items-center gap-2.5 w-full">
            <div className="flex items-center justify-center gap-8 sm:gap-14 w-full">
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={() => setIsImageModalOpen(true)}
                  className="mt-glass mt-icon-btn w-12 h-12 sm:w-14 sm:h-14 hover:scale-105 active:scale-95"
                  title="ترجمة الصور والكاميرا">
                  <Camera size={22} />
                </button>
                <span className="text-[10px] sm:text-[11px] font-semibold opacity-80 whitespace-nowrap">الكاميرا</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button onClick={toggleListening}
                  className={`mt-icon-btn rounded-full hover:scale-105 active:scale-95 border ${isListening ? 'mt-listening' : 'mt-glass'}`}
                  style={{
                    width: 'clamp(3.75rem, 17vw, 4.5rem)',
                    height: 'clamp(3.75rem, 17vw, 4.5rem)',
                    background: isListening ? 'var(--mt-danger)' : undefined,
                    color: isListening ? '#fff' : 'var(--mt-accent)',
                    borderColor: isListening ? 'var(--mt-danger)' : undefined,
                  }}
                  title={isListening ? 'إيقاف الاستماع' : 'التحدث بالصوت'}>
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <span className="text-[10px] sm:text-[11px] font-bold opacity-80 whitespace-nowrap">
                  {isListening ? 'جاري الاستماع...' : 'صوت'}
                </span>
              </div>

              {/* Conversation: compact horizontal pill, never vertical/cramped */}
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={() => setIsDualOpen(true)}
                  className="mt-chat-button"
                  title="محادثة صوتية ثنائية اللغة"
                  aria-label="محادثة">
                  <MessageSquareText size={18} />
                  <span className="label">محادثة</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modals & sheets ─────────────────────────────────────────────── */}
      <ZoomModal isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} zoom={zoom} onChangeZoom={setZoom} currentTheme={currentTheme} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={currentTheme}
        forceOffline={forceOffline}
        onToggleForceOffline={setForceOffline}
        instantTranslate={instantTranslate}
        onToggleInstant={setInstantTranslate}
        keepScreenOn={keepScreenOn}
        onToggleKeepScreenOn={setKeepScreenOn}
        ttsSettings={ttsSettings}
        onChangeTtsSettings={setTtsSettings}
        availableVoices={AVAILABLE_VOICES}
        onOpenThemes={() => { setIsSettingsOpen(false); setIsThemeGalleryOpen(true); }}
        onOpenZoom={() => { setIsSettingsOpen(false); setIsZoomOpen(true); }}
        onOpenPacks={() => { setIsSettingsOpen(false); setIsPacksOpen(true); }}
        historyCount={history.length}
        onClearHistory={clearHistory}
      />

      <OfflinePacksModal isOpen={isPacksOpen} onClose={() => setIsPacksOpen(false)} theme={currentTheme} />

      <DualConversationModal
        isOpen={isDualOpen}
        onClose={() => setIsDualOpen(false)}
        theme={currentTheme}
        ttsSettings={ttsSettings}
        forceOffline={forceOffline}
      />

      <FloatingTranslateWindow
        isOpen={isFloatingOpen}
        onClose={() => setIsFloatingOpen(false)}
        currentTheme={currentTheme}
        languages={LANGUAGES}
        onTranslate={floatingTranslate}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
        onShowToast={showToast}
      />

      <ImageTranslateModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        currentTheme={currentTheme}
        languages={LANGUAGES}
        targetLang={targetLang}
        onTranslateImage={handleImageTranslate}
        onApplyText={(text) => {
          setInputText('');
          setResultText(text);
          lastTranslatedText.current = '';
          showToast('تم إدراج ترجمة الصورة ✓');
        }}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
      />

      <StarredTranslationsModal
        isOpen={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onSelectTranslation={restoreItem}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
        theme={currentTheme}
      />

      <OverlayPermissionGuide
        isOpen={isOverlayGuideOpen}
        onClose={() => setIsOverlayGuideOpen(false)}
        onActivated={() => { /* native overlay service is now running */ }}
        onShowToast={showToast}
      />

      {isThemeGalleryOpen && (
        <div className="mt-modal-backdrop" onClick={() => setIsThemeGalleryOpen(false)} role="dialog" aria-modal="true">
          <div className="mt-modal w-full max-w-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
              <h2 className="text-base font-extrabold mt-heading flex items-center gap-2"><Palette size={18} /> مكتبة الثيمات</h2>
              <button onClick={() => setIsThemeGalleryOpen(false)} className="mt-icon-btn p-2" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto mt-scroll p-4" style={{ maxHeight: '78vh' }}>
              <ThemeGallery variant="compact" onApplied={() => showToast('تم تطبيق الثيم ✓')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
