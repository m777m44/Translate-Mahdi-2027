import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  ThemeConfig, 
  TranslationHistoryItem, 
  TtsSettings, 
  ZoomLevel,
  AppSettings,
  DomainCode,
  ToneCode,
  DialectCode,
  AIAnalysisResult,
  MultiEngineComparison
} from './types.ts';
import { 
  LANGUAGES, 
  AUTO_DETECT_OPTION, 
  detectLanguageFromText, 
  LANG_BCP47_MAP,
  DOMAINS,
  TONES,
  DIALECTS,
  DEFAULT_APP_SETTINGS
} from './constants.ts';
import { useTheme } from './themeContext.tsx';
import { ThemeGallery } from './components/ThemeGallery.tsx';
import { translateText, speakText, translateImage, compareEngines } from './geminiService.ts';
import { translateOffline } from './offlineEngine.ts';
import { 
  getOfflinePacks, 
  subscribeToPacks, 
  getTotalDownloadedSizeMB,
  isLanguageDownloaded,
  downloadPackForLanguage
} from './offlinePacksManager.ts';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ProSettingsPanel } from './components/ProSettingsPanel.tsx';
import { OfflinePacksModal } from './components/OfflinePacksModal.tsx';
import { DualConversationModal } from './components/DualConversationModal.tsx';
import { AIAnalysisDrawer } from './components/AIAnalysisDrawer.tsx';
import { FloatingTranslateWindow } from './components/FloatingTranslateWindow.tsx';
import { ImageTranslateModal } from './components/ImageTranslateModal.tsx';
import { ZoomModal } from './components/ZoomModal.tsx';
import { ResizeHandle } from './components/ResizeHandle.tsx';
import { LanguageSelectDropdown } from './components/LanguageSelectDropdown.tsx';
import { StarredTranslationsModal } from './components/StarredTranslationsModal.tsx';
import { HandwritingModal } from './components/HandwritingModal.tsx';
import { GoogleTranslateResultView } from './components/GoogleTranslateResultView.tsx';
import { AdvancedTwoBoxLayout } from './components/AdvancedTwoBoxLayout.tsx';
import { GoogleAuthModal, GoogleUser } from './components/GoogleAuthModal.tsx';
import { InstallAppButton } from './components/InstallAppButton.tsx';
import { NeuralModelsModal } from './components/NeuralModelsModal.tsx';
import { WalkieTalkieModal } from './components/WalkieTalkieModal.tsx';
import { P2PConversationModal } from './components/P2PConversationModal.tsx';
import { PhrasebookModal } from './components/PhrasebookModal.tsx';
import { DocumentTranslateModal } from './components/DocumentTranslateModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { ToolsHubModal, ToolId } from './components/ToolsHubModal.tsx';
import { WhatsNewModal, shouldShowWhatsNew } from './components/WhatsNewModal.tsx';
import {
  translateNeural,
  isModelDownloaded,
  resolveTranslationModel,
  supportsNeuralPair,
  NeuralQuality,
} from './neuralEngine.ts';
import { recordTranslation } from './usageStats.ts';
import { ensureTargetScript, beautifyArabic } from './transliterate.ts';
import { WordBreakdownModal } from './components/WordBreakdownModal.tsx';
import { BUILTIN_PHRASES, phraseInLanguage } from './phrasebook.ts';
import { FileDown, ListTree, FlipHorizontal2, Lightbulb, Power } from 'lucide-react';
import {
  syncHistory,
  getSignedInUser,
  signOutUser as cloudSignOut,
  readCloudStatus,
  CloudHistoryItem,
} from './cloudSyncService.ts';
import { MoreTranslation, WordDefinition } from './types.ts';
import { 
  Languages, 
  History, 
  Volume2, 
  Copy, 
  Share2, 
  Camera, 
  Mic, 
  MicOff, 
  ArrowRightLeft, 
  Sliders, 
  Trash2, 
  X, 
  Check, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  RefreshCw, 
  ZoomIn, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  RotateCcw, 
  Palette, 
  Star, 
  CornerDownLeft, 
  ChevronDown, 
  Wand2, 
  Download, 
  Users, 
  Scale, 
  BrainCircuit, 
  Globe2, 
  BookOpen,
  SlidersHorizontal,
  HardDrive,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  User,
  Clipboard,
  Pen,
  MoreVertical,
  LayoutGrid
} from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const AVAILABLE_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

export const App: React.FC = () => {
  // Theme engine: 1500+ themes, applied globally through CSS custom properties.
  const {
    theme: currentTheme,
    setTheme: setCurrentTheme,
    appearance,
    updateAppearance,
    total: themeTotal,
  } = useTheme();

  // UI Scale / Zoom with direct user numeric input modal
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    try {
      const savedZoom = localStorage.getItem('mahdi_zoom');
      return savedZoom ? Number(savedZoom) : 100;
    } catch {
      return 100;
    }
  });
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Translation Core
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('ar');
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [translationEngine, setTranslationEngine] = useState<'online' | 'offline'>('online');

  // Resizable Box Dimensions & Typography controlled by the micro drag handle ("الشخطة")
  const [sourceBoxHeight, setSourceBoxHeight] = useState<number>(115);
  const [sourceBoxWidth, setSourceBoxWidth] = useState<number>(100);
  const [sourceBoxFontSize, setSourceBoxFontSize] = useState<number>(18);
  const [sourceBoxRadius, setSourceBoxRadius] = useState<number>(24);

  const [targetBoxHeight, setTargetBoxHeight] = useState<number>(115);
  const [targetBoxWidth, setTargetBoxWidth] = useState<number>(100);
  const [targetBoxFontSize, setTargetBoxFontSize] = useState<number>(18);
  const [targetBoxRadius, setTargetBoxRadius] = useState<number>(24);

  // Reorderable toolbar buttons & orientation
  const [toolbarOrientation, setToolbarOrientation] = useState<'horizontal' | 'vertical'>(() => {
    try {
      return (localStorage.getItem('mahdi_toolbar_orientation') as 'horizontal' | 'vertical') || 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [toolbarButtonsOrder, setToolbarButtonsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mahdi_toolbar_order');
      return saved ? JSON.parse(saved) : ['floating', 'image', 'conversation', 'packs', 'analysis', 'compare', 'history'];
    } catch {
      return ['floating', 'image', 'conversation', 'packs', 'analysis', 'compare', 'history'];
    }
  });

  const handleUpdateToolbarOrientation = (ori: 'horizontal' | 'vertical') => {
    setToolbarOrientation(ori);
    try {
      localStorage.setItem('mahdi_toolbar_orientation', ori);
    } catch {}
  };

  const handleUpdateToolbarOrder = (newOrder: string[]) => {
    setToolbarButtonsOrder(newOrder);
    try {
      localStorage.setItem('mahdi_toolbar_order', JSON.stringify(newOrder));
    } catch {}
  };

  // Fast translation memory cache for instantaneous typing results
  const translationCache = useRef<Map<string, string>>(new Map());

  // Network & Local Engine with Automatic Offline Detection
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [forceOffline, setForceOffline] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mahdi_force_offline') === 'true' || !navigator.onLine;
    } catch {
      return !navigator.onLine;
    }
  });

  // History & Bookmarks
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [lastItem, setLastItem] = useState<TranslationHistoryItem | null>(null);

  // Advanced feature modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isThemeGalleryOpen, setIsThemeGalleryOpen] = useState<boolean>(false);
  const [isProSettingsOpen, setIsProSettingsOpen] = useState<boolean>(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isOfflinePacksModalOpen, setIsOfflinePacksModalOpen] = useState<boolean>(false);
  const [isDualConversationModalOpen, setIsDualConversationModalOpen] = useState<boolean>(false);
  const [isAnalysisDrawerOpen, setIsAnalysisDrawerOpen] = useState<boolean>(false);

  // V3 Master Settings, Linguistic Context & Offline Sync
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('mahdi_app_settings');
      return saved ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) } : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [selectedDomain, setSelectedDomain] = useState<DomainCode>(appSettings.defaultDomain || 'general');
  const [selectedTone, setSelectedTone] = useState<ToneCode>(appSettings.defaultTone || 'standard');
  const [selectedDialect, setSelectedDialect] = useState<DialectCode>(appSettings.defaultDialect || 'standard');

  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [engineComparison, setEngineComparison] = useState<MultiEngineComparison | null>(null);

  const [downloadedPacksCount, setDownloadedPacksCount] = useState<number>(() => {
    return getOfflinePacks().filter(p => p.status === 'downloaded').length;
  });

  useEffect(() => {
    const unsub = subscribeToPacks(() => {
      setDownloadedPacksCount(getOfflinePacks().filter(p => p.status === 'downloaded').length);
    });
    return unsub;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_app_settings', JSON.stringify(appSettings));
    } catch {}
  }, [appSettings]);

  // Audio & Speech
  const [isListening, setIsListening] = useState<boolean>(false);
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>(() => {
    try {
      const savedTts = localStorage.getItem('mahdi_tts_settings');
      return savedTts ? JSON.parse(savedTts) : { voiceName: 'Kore', rate: 1.0, pitch: 1.0 };
    } catch {
      return { voiceName: 'Kore', rate: 1.0, pitch: 1.0 };
    }
  });

  // Google Translate Style Dictionary & Transliteration States
  const [transliteration, setTransliteration] = useState<string>('');
  const [detectedLangBanner, setDetectedLangBanner] = useState<string>('');
  const [moreTranslations, setMoreTranslations] = useState<MoreTranslation[]>([]);
  const [definitions, setDefinitions] = useState<WordDefinition[]>([]);
  const [isStarredModalOpen, setIsStarredModalOpen] = useState<boolean>(false);
  const [isHandwritingModalOpen, setIsHandwritingModalOpen] = useState<boolean>(false);

  // Google Account State
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() => {
    try {
      const saved = localStorage.getItem('mahdi_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState<boolean>(false);

  // ── v4.0 RTranslator-grade on-device AI suite ─────────────────────────────
  const [isToolsHubOpen, setIsToolsHubOpen] = useState<boolean>(false);
  const [isNeuralModelsOpen, setIsNeuralModelsOpen] = useState<boolean>(false);
  const [isWalkieOpen, setIsWalkieOpen] = useState<boolean>(false);
  const [isP2pOpen, setIsP2pOpen] = useState<boolean>(false);
  const [isPhrasebookOpen, setIsPhrasebookOpen] = useState<boolean>(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState<boolean>(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [keepScreenOn, setKeepScreenOn] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_keep_screen_on') === 'true'; } catch { return false; }
  });
  const [showPhraseOfDay, setShowPhraseOfDay] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_phrase_day_hidden') !== 'true'; } catch { return true; }
  });
  const phraseOfDay = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000);
    const phrase = BUILTIN_PHRASES[dayIndex % BUILTIN_PHRASES.length];
    return {
      ar: phraseInLanguage(phrase, 'ar'),
      en: phraseInLanguage(phrase, 'en'),
    };
  }, []);
  const [neuralQuality, setNeuralQuality] = useState<NeuralQuality>(() => {
    try {
      return (localStorage.getItem('mahdi_neural_quality') as NeuralQuality) || 'balanced-int8';
    } catch { return 'balanced-int8'; }
  });
  const [neuralUseGpu, setNeuralUseGpu] = useState<boolean>(() => {
    try { return localStorage.getItem('mahdi_neural_gpu') !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('mahdi_neural_quality', neuralQuality); } catch {}
  }, [neuralQuality]);

  useEffect(() => {
    try { localStorage.setItem('mahdi_neural_gpu', String(neuralUseGpu)); } catch {}
  }, [neuralUseGpu]);

  // Keep the Android screen awake during long translation/voice sessions.
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    let cancelled = false;
    const requestLock = async () => {
      if (!keepScreenOn || !('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch { /* permission/visibility issue — non-fatal */ }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && keepScreenOn) requestLock();
    };
    if (keepScreenOn) {
      requestLock();
      document.addEventListener('visibilitychange', onVisible);
    } else {
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    }
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (cancelled) wakeLockRef.current?.release?.().catch(() => {});
    };
  }, [keepScreenOn]);

  useEffect(() => {
    try { localStorage.setItem('mahdi_keep_screen_on', String(keepScreenOn)); } catch {}
  }, [keepScreenOn]);

  useEffect(() => {
    try { localStorage.setItem('mahdi_phrase_day_hidden', String(!showPhraseOfDay)); } catch {}
  }, [showPhraseOfDay]);

  useEffect(() => {
    if (shouldShowWhatsNew()) {
      const t = window.setTimeout(() => setIsWhatsNewOpen(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  // View Mode: 'classic' (Single screen stream) vs 'advanced' (Dual box workspace)
  const [viewMode, setViewMode] = useState<'classic' | 'advanced'>(() => {
    try {
      const saved = localStorage.getItem('mahdi_view_mode');
      return (saved === 'advanced' || saved === 'classic') ? saved : 'classic';
    } catch {
      return 'classic';
    }
  });

  const handleSetViewMode = (mode: 'classic' | 'advanced') => {
    setViewMode(mode);
    try {
      localStorage.setItem('mahdi_view_mode', mode);
    } catch {}
    showToast(mode === 'advanced' ? 'تم التبديل إلى الوضع المتقدم (شاشتان)' : 'تم التبديل إلى الوضع الكلاسيكي');
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const lastTranslatedText = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  // Late-bound action refs used by the global keyboard shortcuts.
  const translateNowRef = useRef<() => void>(() => {});
  const toggleListeningRef = useRef<() => void>(() => {});
  const swapLanguagesRef = useRef<() => void>(() => {});
  /** Monotonic id used to drop stale translation responses (race protection). */
  const requestSeq = useRef<number>(0);

  // Toast helper (single timer — new toasts replace the pending dismissal).
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Reverse translation: swap languages and feed the current result back.
  const handleReverseTranslate = useCallback(() => {
    if (!resultText.trim()) {
      showToast('لا توجد ترجمة لعكس اتجاهها بعد');
      return;
    }
    const newSource = targetLang;
    const newTarget = sourceLang === 'auto' ? detectLanguageFromText(resultText) : sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget === newSource ? 'ar' : newTarget);
    setInputText(resultText);
    setResultText('');
    lastTranslatedText.current = '';
    showToast('تم عكس اتجاه الترجمة 🔄');
  }, [resultText, sourceLang, targetLang, showToast]);

  const handleDownloadResult = useCallback(() => {
    if (!resultText.trim()) {
      showToast('لا يوجد نتيجة لتنزيلها بعد');
      return;
    }
    const content = `${inputText}\n\n${resultText}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahdi-translation-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast('تم تنزيل الترجمة كملف نصي ✓');
  }, [inputText, resultText, showToast]);

  // Automatic Language Detection Effect
  useEffect(() => {
    if (sourceLang === 'auto' && inputText.trim()) {
      const detected = detectLanguageFromText(inputText);
      setDetectedLangCode(detected);
    } else {
      setDetectedLangCode('');
    }
  }, [inputText, sourceLang]);

  // Persistent storage setup
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem('mahdi_translate_history');
      if (savedHist) {
        const parsed = JSON.parse(savedHist);
        setHistory(parsed);
        if (parsed.length > 0) setLastItem(parsed[0]);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Automatic Offline Mode Detection for Phone Disconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setForceOffline(false);
      showToast('تمت استعادة الاتصال بالإنترنت 🌐');
    };
    const handleOffline = () => {
      setIsOffline(true);
      setForceOffline(true);
      showToast('تم تفعيل وضع بدون إنترنت تلقائياً لعدم وجود اتصال بالشبكة 📴');
    };

    if (!navigator.onLine) {
      setIsOffline(true);
      setForceOffline(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // One-click quick download for any language pack
  const handleQuickDownloadLanguage = (langCode: string) => {
    const langObj = LANGUAGES.find(l => l.code === langCode);
    const langName = langObj ? langObj.nativeName : langCode;

    if (isLanguageDownloaded(langCode)) {
      showToast(`حزمة ${langName} محملة بالفعل وجاهزة للعمل أوفلاين ✓`);
      setIsOfflinePacksModalOpen(true);
      return;
    }

    const triggered = downloadPackForLanguage(langCode);
    if (triggered) {
      showToast(`جاري تنزيل حزمة لغة (${langName}) للاستخدام بدون إنترنت 📥...`);
    } else {
      showToast(`يمكنك إدارة حزم لغة (${langName}) من لوحة الحزم`);
      setIsOfflinePacksModalOpen(true);
    }
  };

  // Theme id + appearance are persisted by the ThemeProvider (debounced).

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_zoom', zoom.toString());
    } catch {}
  }, [zoom]);

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_force_offline', forceOffline ? 'true' : 'false');
    } catch {}
  }, [forceOffline]);

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_translate_history', JSON.stringify(history));
      if (history.length > 0) setLastItem(history[0]);
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_tts_settings', JSON.stringify(ttsSettings));
    } catch {}
  }, [ttsSettings]);

  // Speech Recognition (Voice-to-Text) — continuous with live interim results so
  // spoken words appear (and get translated) while the user is still talking.
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const actualLangCode = sourceLang === 'auto' ? (detectedLangCode || 'ar') : sourceLang;
    recognition.lang = LANG_BCP47_MAP[actualLangCode] || actualLangCode;

    /** Finalised speech accumulated during this listening session. */
    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += `${finalTranscript ? ' ' : ''}${chunk.trim()}`;
        else interim += chunk;
      }
      const combined = [finalTranscript, interim.trim()].filter(Boolean).join(' ');
      if (!combined) return;
      // Replace the in-progress segment instead of appending duplicates.
      setInputText(prev => {
        const base = prev.endsWith('…') ? prev.slice(0, -1).trim() : prev;
        return base ? `${base} ${combined}` : combined;
      });
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' / 'aborted' are normal during continuous listening.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('تم رفض إذن الوصول للميكروفون. يرجى السماح بالوصول في المتصفح.');
        setIsListening(false);
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition:', event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) showToast('تم التقاط الصوت وترجمته ✓');
    };

    recognitionRef.current = recognition;
    return () => {
      try { recognition.stop(); } catch {}
    };
  }, [sourceLang, detectedLangCode, showToast]);


  // Keep the accessibility flag from the settings panel in sync with the theme engine.
  useEffect(() => {
    if (appearance.highContrast !== appSettings.highContrast) {
      updateAppearance({ highContrast: appSettings.highContrast });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings.highContrast]);

  // Global keyboard shortcuts (uses refs so the handler always sees fresh closures)
  useEffect(() => {
    if (!appSettings.keyboardShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'k') {
        e.preventDefault();
        setIsThemeGalleryOpen(v => !v);
      } else if (key === 'enter') {
        e.preventDefault();
        translateNowRef.current();
      } else if (key === 'm') {
        e.preventDefault();
        toggleListeningRef.current();
      } else if (key === 'd') {
        e.preventDefault();
        swapLanguagesRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appSettings.keyboardShortcuts]);

  // Purge history entries older than the configured retention window.
  useEffect(() => {
    const days = appSettings.autoClearHistoryDays;
    if (!days || days <= 0) return;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    setHistory(prev => {
      const next = prev.filter(i => (i.timestamp || 0) >= cutoff);
      return next.length === prev.length ? prev : next;
    });
  }, [appSettings.autoClearHistoryDays]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('التعرف الصوتي غير مدعوم في متصفحك حالياً.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
        showToast('جاري الاستماع لصوتك الآن...');
      } catch {
        setIsListening(false);
      }
    }
  };

  // ---- Translation memory helpers -----------------------------------------
  /** Bounded (LRU) translation cache so memory never grows without limit. */
  const cachePut = useCallback((key: string, value: string) => {
    const map = translationCache.current;
    map.set(key, value);
    if (map.size > 400) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
  }, []);

  /** Stores a translation, honouring Private Mode and the configured history limit. */
  const rememberTranslation = useCallback(
    (item: Omit<TranslationHistoryItem, 'id' | 'timestamp'>) => {
      if (appSettings.privateModeNoHistory) return;
      const limit = Math.max(10, appSettings.historyLimit || 50);
      setHistory(prev => [
        { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() },
        ...prev.filter(i => i.sourceText !== item.sourceText),
      ].slice(0, limit));
    },
    [appSettings.privateModeNoHistory, appSettings.historyLimit]
  );

  /** Guarantee fully target-script output with Arabic punctuation polish. */
  const finalizeTarget = useCallback((t: string, to: string): string => {
    if (!t) return t;
    return beautifyArabic(ensureTargetScript(t, to), to);
  }, []);

  /**
   * Unified translation pipeline shared by every v4 tool (WalkieTalkie, P2P,
   * documents, phrasebook): cloud Gemini → on-device neural (NLLB/Marian) →
   * bundled offline dictionary. Never throws — always returns a best effort.
   */
  const universalTranslate = useCallback(async (text: string, from: string, to: string): Promise<string> => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    const activeFrom = from === 'auto' ? detectLanguageFromText(trimmed) : from;

    if (!forceOffline && navigator.onLine) {
      try {
        const r = await translateText(trimmed, from, to, {
          domain: selectedDomain,
          tone: selectedTone,
          dialect: selectedDialect,
          accuracy: appSettings.accuracyLevel,
          preserveFormatting: appSettings.preserveFormatting,
          translateNumbers: appSettings.translateNumbers,
        });
        if (r.translation) {
          recordTranslation({ chars: trimmed.length, from: activeFrom, to, engine: 'online', kind: 'text' });
          return finalizeTarget(r.translation, to);
        }
      } catch { /* try next engine */ }
    }

    try {
      if (supportsNeuralPair(activeFrom, to)) {
        const info = resolveTranslationModel(activeFrom, to);
        if (await isModelDownloaded(info.id)) {
          const neural = await translateNeural(trimmed, activeFrom, to, {
            quality: neuralQuality,
            useGpu: neuralUseGpu,
          });
          if (neural) {
            recordTranslation({ chars: trimmed.length, from: activeFrom, to, engine: 'neural', kind: 'neural' });
            return finalizeTarget(neural, to);
          }
        }
      }
    } catch (e) { /* fall through to dictionary */ }

    const local = translateOffline(trimmed, from, to, {
      domain: selectedDomain,
      dialect: selectedDialect,
    });
    recordTranslation({ chars: trimmed.length, from: activeFrom, to, engine: 'offline', kind: 'text' });
    return finalizeTarget(local.translation, to);
  }, [
    forceOffline, selectedDomain, selectedTone, selectedDialect,
    appSettings.accuracyLevel, appSettings.preserveFormatting, appSettings.translateNumbers,
    neuralQuality, neuralUseGpu, finalizeTarget,
  ]);

  /** Try the on-device neural model for the active pair when a model is cached. */
  const tryNeuralTranslation = useCallback(async (text: string, from: string, to: string): Promise<string | null> => {
    try {
      if (!supportsNeuralPair(from, to)) return null;
      const info = resolveTranslationModel(from, to);
      if (!(await isModelDownloaded(info.id))) return null;
      return await translateNeural(text, from, to, { quality: neuralQuality, useGpu: neuralUseGpu });
    } catch {
      return null;
    }
  }, [neuralQuality, neuralUseGpu]);

  // Translation Handler (Online AI + Local Offline Engine + Auto Detect)
  const handleTranslate = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastTranslatedText.current || trimmed === '[Image Translated]') {
      if (!trimmed) setResultText('');
      return;
    }

    // Every request gets a sequence number; stale responses are discarded so a
    // slow reply can never overwrite the translation of newer text.
    const seq = ++requestSeq.current;
    const isStale = () => seq !== requestSeq.current;

    // Instant check in-memory cache for 0ms retrieval
    const cacheKey = `${trimmed}__${sourceLang}__${targetLang}__${selectedDomain}__${selectedTone}__${selectedDialect}`;
    if (translationCache.current.has(cacheKey)) {
      setResultText(translationCache.current.get(cacheKey)!);
      lastTranslatedText.current = trimmed;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const activeFrom = sourceLang === 'auto' 
      ? (detectLanguageFromText(trimmed) || 'en') 
      : sourceLang;

    // Check if we should use the local offline engine
    const shouldRunOffline = forceOffline || !navigator.onLine;

    if (shouldRunOffline) {
      try {
        // Prefer a downloaded on-device neural model (NLLB/Marian), then the
        // instant bundled dictionary as a zero-download fallback.
        const neuralOut = await tryNeuralTranslation(trimmed, activeFrom, targetLang);
        const offlineRes = neuralOut
          ? {
              translation: neuralOut,
              transliteration: '',
              detectedLanguageName: '',
              moreTranslations: [],
              definitions: [],
            }
          : translateOffline(trimmed, sourceLang, targetLang, {
              domain: selectedDomain,
              dialect: selectedDialect
            });
        if (isStale()) return;
        recordTranslation({
          chars: trimmed.length,
          from: activeFrom,
          to: targetLang,
          engine: neuralOut ? 'neural' : 'offline',
          kind: neuralOut ? 'neural' : 'text',
        });
        setResultText(offlineRes.translation);
        setTransliteration(offlineRes.transliteration || '');
        setDetectedLangBanner(offlineRes.detectedLanguageName || '');
        setMoreTranslations(offlineRes.moreTranslations || []);
        setDefinitions(offlineRes.definitions || []);
        cachePut(cacheKey, offlineRes.translation);
        setTranslationEngine('offline');
        lastTranslatedText.current = trimmed;

        rememberTranslation({
          sourceText: trimmed,
          translatedText: offlineRes.translation,
          sourceLang,
          targetLang,
          mode: 'offline',
          domain: selectedDomain,
          tone: selectedTone,
          dialect: selectedDialect,
          detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
        });

        if (appSettings.autoSpeakTarget) {
          speakText(offlineRes.translation, targetLang, ttsSettings);
        }
      } catch (err: any) {
        if (!isStale()) setError('تعذر إتمام الترجمة المحلية.');
      } finally {
        if (!isStale()) setIsLoading(false);
      }
      return;
    }

    // Online AI Translation via Gemini
    try {
      const result = await translateText(trimmed, sourceLang, targetLang, {
        domain: selectedDomain,
        tone: selectedTone,
        dialect: selectedDialect,
        includeAnalysis: false,
        accuracy: appSettings.accuracyLevel,
        engine: appSettings.defaultEngine,
        preserveFormatting: appSettings.preserveFormatting,
        translateNumbers: appSettings.translateNumbers,
      });
      if (isStale()) return;
      const safeTranslation = finalizeTarget(result.translation, targetLang);
      setResultText(safeTranslation);
      setTransliteration(result.transliteration || '');
      setDetectedLangBanner(result.detectedLanguageName || '');
      setMoreTranslations(result.moreTranslations || []);
      setDefinitions(result.definitions || []);
      cachePut(cacheKey, safeTranslation);
      if (result.analysis) setAiAnalysis(result.analysis);
      setTranslationEngine('online');
      setError(null);
      lastTranslatedText.current = trimmed;

      rememberTranslation({
        sourceText: trimmed,
        translatedText: safeTranslation,
        sourceLang,
        targetLang,
        mode: 'online',
        domain: selectedDomain,
        tone: selectedTone,
        dialect: selectedDialect,
        detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
      });
      recordTranslation({ chars: trimmed.length, from: activeFrom, to: targetLang, engine: 'online', kind: 'text' });

      if (appSettings.autoCopyOnTranslate) {
        try { await navigator.clipboard.writeText(safeTranslation); } catch {}
      }
      if (appSettings.autoSpeakTarget) {
        speakText(safeTranslation, targetLang, ttsSettings);
      }
    } catch (err: any) {
      if (isStale()) return;
      console.warn('Online translation temporary issue, switching to on-device neural/offline engine:', err?.message || err);
      // Fallback chain: on-device neural model → bundled offline dictionary.
      try {
        const neuralFallback = await tryNeuralTranslation(trimmed, activeFrom, targetLang);
        const offlineFallback = neuralFallback
          ? {
              translation: neuralFallback,
              transliteration: '',
              detectedLanguageName: '',
              moreTranslations: [],
              definitions: [],
            }
          : translateOffline(trimmed, sourceLang, targetLang, {
              domain: selectedDomain,
              dialect: selectedDialect
            });
        if (isStale()) return;
        setResultText(offlineFallback.translation);
        setTransliteration(offlineFallback.transliteration || '');
        setDetectedLangBanner(offlineFallback.detectedLanguageName || '');
        setMoreTranslations(offlineFallback.moreTranslations || []);
        setDefinitions(offlineFallback.definitions || []);
        cachePut(cacheKey, offlineFallback.translation);
        setTranslationEngine('offline');
        setError(null); // Clear error because translation succeeded via offline engine
        lastTranslatedText.current = trimmed;
        showToast(neuralFallback ? 'تمت الترجمة بالذكاء الاصطناعي على جهازك 🧠⚡' : 'تمت الترجمة بالمحرك المحلي الفوري ⚡');
        recordTranslation({
          chars: trimmed.length,
          from: activeFrom,
          to: targetLang,
          engine: neuralFallback ? 'neural' : 'offline',
          kind: neuralFallback ? 'neural' : 'text',
        });

        rememberTranslation({
          sourceText: trimmed,
          translatedText: offlineFallback.translation,
          sourceLang,
          targetLang,
          mode: 'offline',
          domain: selectedDomain,
          tone: selectedTone,
          dialect: selectedDialect,
          detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
        });
      } catch (offlineErr: any) {
        if (!isStale()) setError('تعذر إتمام الترجمة عبر السيرفر أو المحرك المحلي.');
      }
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [
    sourceLang,
    targetLang,
    forceOffline,
    selectedDomain,
    selectedTone,
    selectedDialect,
    cachePut,
    rememberTranslation,
    showToast,
    ttsSettings,
    tryNeuralTranslation,
    appSettings.accuracyLevel,
    appSettings.defaultEngine,
    appSettings.preserveFormatting,
    appSettings.translateNumbers,
    appSettings.autoCopyOnTranslate,
    appSettings.autoSpeakTarget,
  ]);

  // Late-bind the keyboard-shortcut actions to the freshest closures.
  translateNowRef.current = () => {
    if (!inputText.trim()) return;
    lastTranslatedText.current = '';
    void handleTranslate(inputText);
  };

  toggleListeningRef.current = toggleListening;

  // Deep AI Analysis Handler (Alternatives, Cultural Context, Grammar)
  const handleRunDeepAnalysis = async () => {
    const textToAnalyze = inputText.trim();
    if (!textToAnalyze) {
      showToast('يرجى إدخال نص للتحليل');
      return;
    }
    setIsLoading(true);
    try {
      const res = await translateText(textToAnalyze, sourceLang, targetLang, {
        domain: selectedDomain,
        tone: selectedTone,
        dialect: selectedDialect,
        includeAnalysis: true
      });
      setResultText(res.translation);
      setAiAnalysis(res.analysis || null);
      setIsAnalysisDrawerOpen(true);
      showToast('تم إنجاز التحليل اللغوي الذكي ✨');
    } catch {
      showToast('تعذر إجراء التحليل اللغوي حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  // Multi-Engine Comparison Handler (Mahdi Neural, DeepL Style, Standard MT)
  const handleRunComparison = async () => {
    const textToCompare = inputText.trim();
    if (!textToCompare) {
      showToast('يرجى إدخال نص للمقارنة');
      return;
    }
    setIsLoading(true);
    try {
      const comp = await compareEngines(textToCompare, sourceLang, targetLang);
      setEngineComparison(comp);
      setIsAnalysisDrawerOpen(true);
      showToast('تمت مقارنة المحركات الثلاثية ⚖️');
    } catch {
      showToast('تعذر إجراء المقارنة حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fast Debounced translation on typing
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setResultText('');
      setTransliteration('');
      setDetectedLangBanner('');
      setMoreTranslations([]);
      setDefinitions([]);
      lastTranslatedText.current = '';
      setError(null);
      return;
    }
    if (trimmed === '[Image Translated]') return;

    // Instant cache retrieval on typing (0 ms for anything seen before)
    const cacheKey = `${trimmed}__${sourceLang}__${targetLang}__${selectedDomain}__${selectedTone}__${selectedDialect}`;
    if (translationCache.current.has(cacheKey)) {
      setResultText(translationCache.current.get(cacheKey)!);
      lastTranslatedText.current = trimmed;
      setIsLoading(false);
      return;
    }

    // "Instant translate while typing" off → the user translates manually.
    if (!appSettings.instantTranslateWhileTyping) {
      setIsLoading(false);
      return;
    }

    // Adaptive debounce: shorter for the local engine, user-tunable for online.
    const configured = Math.max(0, appSettings.translateDelayMs ?? 280);
    const delayMs = forceOffline || !navigator.onLine ? Math.min(160, configured) : configured;
    const timer = setTimeout(() => {
      handleTranslate(inputText);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [
    inputText,
    handleTranslate,
    sourceLang,
    targetLang,
    selectedDomain,
    selectedTone,
    selectedDialect,
    forceOffline,
    appSettings.instantTranslateWhileTyping,
    appSettings.translateDelayMs,
  ]);

  // Favorites & Starred translations
  const favorites = history.filter(item => item.isFavorite);

  const toggleFavorite = (idOrItem?: string) => {
    if (typeof idOrItem === 'string') {
      setHistory(prev => {
        const updated = prev.map(item => item.id === idOrItem ? { ...item, isFavorite: !item.isFavorite } : item);
        try { localStorage.setItem('mahdi_translate_history', JSON.stringify(updated)); } catch {}
        return updated;
      });
      showToast('تم تحديث المفضلة ⭐');
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed || !resultText) return;

    setHistory(prev => {
      const existingIndex = prev.findIndex(item => item.sourceText === trimmed);
      let updated: TranslationHistoryItem[];
      if (existingIndex >= 0) {
        const currentFav = prev[existingIndex].isFavorite;
        updated = prev.map((item, idx) => idx === existingIndex ? { ...item, isFavorite: !currentFav } : item);
        showToast(!currentFav ? 'تم الحفظ في المفضلة ⭐' : 'تمت الإزالة من المفضلة');
      } else {
        const newItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          sourceText: trimmed,
          translatedText: resultText,
          sourceLang,
          targetLang,
          timestamp: Date.now(),
          isFavorite: true,
          mode: translationEngine,
        };
        updated = [newItem, ...prev];
        showToast('تم الحفظ في المفضلة ⭐');
      }
      try { localStorage.setItem('mahdi_translate_history', JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const isCurrentFavorite = Boolean(
    history.find(item => item.sourceText === inputText.trim() && item.isFavorite)
  );

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setInputText(text.trim());
        showToast('تم لصق النص 📋');
      } else {
        showToast('الحافظة فارغة حالياً');
      }
    } catch {
      showToast('يرجى السماح بالوصول إلى الحافظة');
    }
  };

  // Swap Languages
  const swapLanguages = () => {
    const actualSource = sourceLang === 'auto' ? (detectedLangCode || 'en') : sourceLang;
    setSourceLang(targetLang);
    setTargetLang(actualSource);
    lastTranslatedText.current = '';

    const prevInput = inputText;
    setInputText(resultText);
    setResultText(prevInput);
    lastTranslatedText.current = '';
  };

  swapLanguagesRef.current = swapLanguages;

  // Restore Last Translation
  const restoreLastTranslation = () => {
    if (!lastItem && history.length > 0) {
      setLastItem(history[0]);
    }
    const itemToRestore = lastItem || history[0];
    if (itemToRestore) {
      setSourceLang(itemToRestore.sourceLang);
      setTargetLang(itemToRestore.targetLang);
      setInputText(itemToRestore.sourceText);
      setResultText(itemToRestore.translatedText);
      lastTranslatedText.current = itemToRestore.sourceText;
      setError(null);
      showToast('تم استدعاء آخر ترجمة بنجاح ✓');
    } else {
      showToast('لا توجد ترجمة سابقة في الذاكرة');
    }
  };

  // Clear History
  const clearHistory = () => {
    setHistory([]);
    setLastItem(null);
    showToast('تم مسح سجل الترجمات بالكامل ✓');
  };

  // Quick Copy
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('تم النسخ إلى الحافظة بنجاح ✓');
  };

  // Quick Listen (TTS)
  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) return;
    const actualLang = lang === 'auto' ? (detectedLangCode || 'ar') : lang;
    speakText(text, actualLang, ttsSettings);
    showToast('جاري تشغيل الصوت...');
  };

  // Share Translation
  const shareTranslation = async (source: string, translated: string) => {
    if (!translated) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ترجمة Mahdi Translate Pro',
          text: `النص: ${source}\nالترجمة: ${translated}`,
        });
        showToast('تمت المشاركة بنجاح');
      } catch {
        copyToClipboard(`${source} -> ${translated}`);
      }
    } else {
      copyToClipboard(`${source} -> ${translated}`);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const isTargetRTL = LANGUAGES.find(l => l.code === targetLang)?.rtl;
  const isSourceRTL = sourceLang === 'auto' 
    ? (detectedLangCode === 'ar')
    : LANGUAGES.find(l => l.code === sourceLang)?.rtl;

  const detectedLanguageName = detectedLangCode 
    ? LANGUAGES.find(l => l.code === detectedLangCode)?.nativeName 
    : '';

  const sourceLangObj = LANGUAGES.find(l => l.code === sourceLang);
  const targetLangObj = LANGUAGES.find(l => l.code === targetLang);
  const sourceLangName = sourceLangObj?.name || (sourceLang === 'auto' ? 'التعرف التلقائي' : 'الإنجليزية');
  const targetLangName = targetLangObj?.name || 'العربية';

  const handleSourceTextChange = (newText: string) => {
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
    // Instant 0ms preview from the local dictionary.
    //
    // IMPORTANT: this is only a *preview*. Marking it as the last translated
    // text used to cancel the debounced AI request, so anything the local
    // dictionary knew ("hello", "thank you") never reached the neural engine.
    // We now only claim the text when we are genuinely offline.
    const offlineNow = forceOffline || !navigator.onLine;
    const instant = translateOffline(newText.trim(), sourceLang, targetLang, {
      domain: selectedDomain,
      dialect: selectedDialect,
      tone: selectedTone,
    });
    if (instant && instant.confidence !== 'fallback' && instant.translation) {
      setResultText(instant.translation);
      setTransliteration(instant.transliteration || '');
      setDetectedLangBanner(instant.detectedLanguageName || '');
      setMoreTranslations(instant.moreTranslations || []);
      setDefinitions(instant.definitions || []);
      if (offlineNow) lastTranslatedText.current = newText.trim();
    }
  };

  const handleClearAll = () => {
    setInputText('');
    setResultText('');
    setTransliteration('');
    setDetectedLangBanner('');
    setMoreTranslations([]);
    setDefinitions([]);
    lastTranslatedText.current = '';
  };

  /* ------------------------- Cloud (Firestore) sync ----------------------- */

  const toCloud = (item: TranslationHistoryItem): CloudHistoryItem => ({
    id: item.id,
    sourceText: item.sourceText,
    translatedText: item.translatedText,
    sourceLang: item.sourceLang,
    targetLang: item.targetLang,
    domain: item.domain,
    dialect: item.dialect,
    tone: item.tone,
    favorites: Boolean(item.isFavorite),
    timestamp: new Date(item.timestamp).toISOString(),
  });

  const fromCloud = (item: CloudHistoryItem): TranslationHistoryItem => ({
    id: item.id,
    sourceText: item.sourceText,
    translatedText: item.translatedText,
    sourceLang: item.sourceLang,
    targetLang: item.targetLang,
    domain: item.domain as any,
    dialect: item.dialect as any,
    tone: item.tone as any,
    isFavorite: Boolean(item.favorites),
    timestamp: new Date(item.timestamp).getTime() || Date.now(),
  });

  const isCloudSignedIn = Boolean(googleUser) && Boolean(getSignedInUser());

  // Two-way merge with Firestore right after a cloud login.
  const performCloudSync = useCallback(async (silent = false) => {
    if (!isCloudSignedIn) return;
    try {
      const { merged } = await syncHistory(history.map(toCloud));
      const mergedLocal = merged.map(fromCloud);
      setHistory(mergedLocal);
      if (!silent) showToast(`تمت المزامنة السحابية (${mergedLocal.length} عنصر) ✓`);
    } catch (e) {
      if (!silent) showToast('تعذرت المزامنة السحابية — سيُعاد لاحقاً');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloudSignedIn, history, showToast]);

  // Debounced background push so every new translation backs up to the account.
  useEffect(() => {
    if (!isCloudSignedIn) return;
    const t = window.setTimeout(() => {
      syncHistory(history.map(toCloud)).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, isCloudSignedIn]);

  const handleGoogleLogin = (user: GoogleUser) => {
    setGoogleUser(user);
    try {
      localStorage.setItem('mahdi_google_user', JSON.stringify(user));
    } catch {}
    showToast(`مرحباً ${user.name} 👋`);
    // If this is a real cloud account, pull + merge the user's history.
    if (getSignedInUser()) performCloudSync(true);
  };

  const handleGoogleLogout = async () => {
    setGoogleUser(null);
    try {
      localStorage.removeItem('mahdi_google_user');
    } catch {}
    await cloudSignOut().catch(() => {});
    showToast('تم تسجيل الخروج');
  };

  const hasActiveText = Boolean(inputText.trim() || resultText);

  return (
    <div
      className="mt-app flex flex-col"
      dir="rtl"
      style={{
        fontSize: `${zoom}%`,
      }}
    >
      {/* Ambient themed glow (respects the appearance toggles) */}
      <div className="mt-glow-orbs" aria-hidden="true">
        <span /><span /><span />
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="mt-toast mt-fade-in fixed top-5 left-1/2 -translate-x-1/2 z-[115] px-5 py-2 text-xs font-bold flex items-center gap-2" role="status" aria-live="polite">
          <Sparkles size={14} className="mt-accent-text" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div 
        className="w-full flex-1 flex flex-col p-3 sm:p-5 md:p-6 max-w-5xl mx-auto transition-transform duration-200 origin-top"
      >
        {/* Unified Responsive Header */}
        <header className="mt-surface-soft w-full flex items-center justify-between gap-2 mb-3 px-3 py-2 border" style={{ borderColor: 'var(--mt-border)', borderRadius: 'var(--mt-radius)' }}>
          {/* Right side (in RTL): Google Account Button & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsGoogleAuthOpen(true)}
              className="mt-btn h-8 sm:h-9 px-2 sm:px-2.5 rounded-full text-[11px] group"
              title={googleUser ? `حساب Google: ${googleUser.email}` : "تسجيل الدخول بحساب Google"}
            >
              {googleUser ? (
                <div className="flex items-center gap-1.5">
                  {googleUser.photoUrl ? (
                    <img src={googleUser.photoUrl} alt={googleUser.name} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border" style={{ borderColor: 'var(--mt-accent)' }} />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full font-bold text-[10px] flex items-center justify-center" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
                      {googleUser.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] font-bold max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline">
                    {googleUser.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--mt-success)' }} />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full font-bold flex items-center justify-center text-[10px]" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
                    <User size={13} />
                  </div>
                  <span className="text-[11px] font-bold hidden sm:inline opacity-80">تسجيل الدخول</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setIsToolsHubOpen(true)}
              className="mt-icon-btn p-2 relative"
              title="مركز الأدوات — كل الميزات في مكان واحد"
              aria-label="مركز الأدوات"
            >
              <LayoutGrid size={17} />
              <span
                className="absolute -top-0.5 -left-0.5 text-[7px] font-extrabold px-1 rounded-full"
                style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}
              >
                4
              </span>
            </button>

            <button
              onClick={() => setKeepScreenOn((v) => !v)}
              className="mt-icon-btn p-2"
              data-active={keepScreenOn}
              title={keepScreenOn ? 'إبقاء الشاشة مضاءة: مفعّل' : 'إبقاء الشاشة مضاءة أثناء الاستخدام'}
              aria-label="إبقاء الشاشة مضاءة"
            >
              <Power size={17} />
            </button>

            <button
              onClick={() => setIsThemeGalleryOpen(true)}
              className="mt-icon-btn p-2"
              title={`مكتبة الثيمات (${themeTotal}+ ثيم)`}
              aria-label="مكتبة الثيمات"
            >
              <Palette size={17} />
            </button>

            {/* Install / APK shortcut — hides itself when running as an installed app */}
            <InstallAppButton onShowToast={showToast} className="!h-8 !px-2 sm:!px-2.5 rounded-full text-[11px]" />

            <button
              onClick={() => setIsProSettingsOpen(true)}
              className="mt-icon-btn p-2"
              title="الإعدادات الاحترافية الشاملة"
            >
              <SlidersHorizontal size={17} />
            </button>
          </div>

          {/* Center: Mode Switcher (الوضع المتقدم شاشتان vs الوضع الكلاسيكي) */}
          <div className="mt-surface-soft flex items-center p-0.5 rounded-full text-xs" style={{ border: '1px solid var(--mt-border)' }}>
            <button
              onClick={() => handleSetViewMode('classic')}
              className={`mt-btn px-2.5 py-1 rounded-full text-[11px] ${viewMode === 'classic' ? 'mt-btn-primary' : 'mt-btn-ghost'}`}
              title="الوضع الكلاسيكي"
            >
              <Globe2 size={12} />
              <span className="hidden sm:inline">الوضع الكلاسيكي</span>
              <span className="sm:hidden">كلاسيكي</span>
            </button>
            <button
              onClick={() => handleSetViewMode('advanced')}
              className={`mt-btn px-2.5 py-1 rounded-full text-[11px] ${viewMode === 'advanced' ? 'mt-btn-primary' : 'mt-btn-ghost'}`}
              title="الوضع المتقدم (شاشتان)"
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">الوضع المتقدم</span>
              <span className="sm:hidden">متقدم</span>
            </button>
          </div>

          {/* Left side (in RTL): Quick Actions: Handwriting, Starred, History */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsHandwritingModalOpen(true)}
              className="mt-icon-btn p-1.5 sm:p-2"
              title="الكتابة باليد والرسم"
            >
              <Pen size={16} />
            </button>

            <button
              onClick={() => setIsStarredModalOpen(true)}
              className="mt-icon-btn relative p-1.5 sm:p-2"
              title="المفضلة والمحفوظات"
            >
              <Star size={17} className={favorites.length > 0 ? "fill-[var(--mt-accent)] mt-accent-text" : "opacity-70"} />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full font-black text-[9px] flex items-center justify-center" style={{ background: 'var(--mt-primary)', color: 'var(--mt-on-primary)' }}>
                  {favorites.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="mt-icon-btn p-1.5 sm:p-2"
              data-active={showHistory}
              title="سجل الترجمة"
            >
              <History size={17} />
            </button>
          </div>
        </header>

        {/* Translation Card Workspace */}
        <main className="w-full flex flex-col gap-3 sm:gap-4 flex-1">
          {/* Phrase of the day — compact, dismissible daily-learning nudge */}
          {showPhraseOfDay && (
            <div
              className="mt-surface-soft rounded-2xl border px-3.5 py-2.5 flex items-center gap-3 mt-fade-in"
              style={{ borderColor: 'var(--mt-border)' }}
            >
              <div className="p-2 rounded-xl mt-accent-soft shrink-0">
                <Lightbulb size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-extrabold mt-accent-text mb-0.5">عبارة اليوم</div>
                <p className="text-xs font-extrabold truncate" dir="rtl">{phraseOfDay.ar}</p>
                <p className="text-[10px] mt-subtext truncate" dir="ltr">{phraseOfDay.en}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleSpeak(phraseOfDay.ar, 'ar')} className="mt-icon-btn p-1.5" title="نطق العبارة">
                  <Volume2 size={14} />
                </button>
                <button
                  onClick={() => { setShowPhraseOfDay(false); showToast('تم إخفاء عبارة اليوم'); }}
                  className="mt-icon-btn p-1.5"
                  title="إخفاء"
                  aria-label="إخفاء عبارة اليوم"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
          {viewMode === 'advanced' ? (
            <AdvancedTwoBoxLayout
              inputText={inputText}
              resultText={resultText}
              sourceLang={sourceLang}
              targetLang={targetLang}
              sourceLangName={sourceLangName}
              targetLangName={targetLangName}
              detectedLangBanner={detectedLangBanner}
              transliteration={transliteration}
              moreTranslations={moreTranslations}
              definitions={definitions}
              isLoading={isLoading}
              isFavorite={isCurrentFavorite}
              isListening={isListening}
              selectedDomain={selectedDomain}
              selectedTone={selectedTone}
              selectedDialect={selectedDialect}
              sourceBoxFontSize={sourceBoxFontSize}
              isSourceRTL={isSourceRTL}
              isTargetRTL={isTargetRTL}
              theme={currentTheme}
              onSourceTextChange={handleSourceTextChange}
              onClear={handleClearAll}
              onPaste={handlePaste}
              onToggleListening={toggleListening}
              onOpenHandwriting={() => setIsHandwritingModalOpen(true)}
              onSpeakSource={() => handleSpeak(inputText, sourceLang)}
              onSpeakTarget={() => handleSpeak(resultText, targetLang)}
              onCopySource={() => {
                copyToClipboard(inputText);
                showToast('تم نسخ النص الأصلي ✓');
              }}
              onCopyTarget={() => {
                copyToClipboard(resultText);
                showToast('تم نسخ الترجمة ✓');
              }}
              onToggleFavorite={toggleFavorite}
              onOpenZoom={() => setIsZoomModalOpen(true)}
              onShare={() => shareTranslation(inputText, resultText)}
              onOpenAIAnalysis={() => {
                handleRunDeepAnalysis();
              }}
              onOpenCompareEngines={() => {
                handleRunComparison();
              }}
              onChangeDomain={(d) => {
                setSelectedDomain(d);
                lastTranslatedText.current = '';
              }}
              onChangeTone={(t) => {
                setSelectedTone(t);
                lastTranslatedText.current = '';
              }}
              onChangeDialect={(dl) => {
                setSelectedDialect(dl);
                lastTranslatedText.current = '';
              }}
              onSelectAlternative={(altText) => {
                setResultText(altText);
                showToast(`تم اختيار الترجمة: ${altText}`);
              }}
              onSelectSynonym={(syn) => {
                handleSourceTextChange(syn);
                showToast(`تم اختيار المرادف: ${syn}`);
              }}
              onShowToast={showToast}
            />
          ) : (
            <GoogleTranslateResultView
              sourceText={inputText}
              sourceLangName={sourceLangName}
              targetLangName={targetLangName}
              translatedText={resultText || (isLoading ? 'جاري الترجمة...' : '')}
              transliteration={transliteration}
              detectedLangName={detectedLangBanner}
              moreTranslations={moreTranslations}
              definitions={definitions}
              isFavorite={isCurrentFavorite}
              isLoading={isLoading}
              onSourceTextChange={handleSourceTextChange}
              onToggleFavorite={toggleFavorite}
              onSpeakSource={() => handleSpeak(inputText, sourceLang)}
              onSpeakTarget={() => handleSpeak(resultText, targetLang)}
              onCopySource={() => {
                copyToClipboard(inputText);
                showToast('تم نسخ النص الأصلي ✓');
              }}
              onCopyTarget={() => {
                copyToClipboard(resultText);
                showToast('تم نسخ الترجمة ✓');
              }}
              onClear={handleClearAll}
              onSelectAlternative={(altText) => {
                setResultText(altText);
                showToast(`تم اختيار الترجمة: ${altText}`);
              }}
              onSelectSynonym={(syn) => {
                handleSourceTextChange(syn);
                showToast(`تم اختيار المرادف: ${syn}`);
              }}
              onOpenZoom={() => setIsZoomModalOpen(true)}
              onShowToast={showToast}
              onPaste={handlePaste}
              onCommitTranslation={(text) => {
                setResultText(text);
                cachePut(`${inputText.trim()}__${sourceLang}__${targetLang}__${selectedDomain}__${selectedTone}__${selectedDialect}`, text);
              }}
              theme={currentTheme}
            />
          )}

          {/* Result meta bar: counters, engine badge and quick actions */}
          <div className="mt-surface-soft rounded-2xl border px-3 py-2 flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--mt-border)' }}>
            <span className="text-[10px] mt-subtext font-bold whitespace-nowrap">
              {inputText.trim() ? `${inputText.trim().length} حرف · ${inputText.trim().split(/\s+/).filter(Boolean).length} كلمة` : 'جاهز للترجمة'}
            </span>
            {resultText && (
              <span
                className="text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  background: translationEngine === 'online'
                    ? 'color-mix(in srgb, var(--mt-success) 16%, transparent)'
                    : 'var(--mt-accent-soft)',
                  color: translationEngine === 'online' ? 'var(--mt-success)' : 'var(--mt-accent)',
                }}
              >
                {translationEngine === 'online' ? 'محرك سحابي' : 'محرك محلي'}
              </span>
            )}
            <div className="flex items-center gap-1 mr-auto">
              <button
                onClick={() => setIsBreakdownOpen(true)}
                disabled={!inputText.trim()}
                className="mt-btn mt-btn-ghost rounded-xl px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1"
                title="تحليل كل كلمة وكيفية ترجمتها"
              >
                <ListTree size={13} /> <span className="hidden sm:inline">تحليل الكلمات</span>
              </button>
              <button
                onClick={handleReverseTranslate}
                disabled={!resultText}
                className="mt-btn mt-btn-ghost rounded-xl px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1"
                title="عكس اتجاه الترجمة"
              >
                <FlipHorizontal2 size={13} /> <span className="hidden sm:inline">عكسي</span>
              </button>
              <button
                onClick={handleDownloadResult}
                disabled={!resultText}
                className="mt-btn mt-btn-ghost rounded-xl px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1"
                title="تنزيل الترجمة ملف نصي"
              >
                <FileDown size={13} /> <span className="hidden sm:inline">تنزيل</span>
              </button>
            </div>
          </div>

          {/* Swipe Down History Pull Handle Bar (Screenshot 2) */}
          <div 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex flex-col items-center justify-center py-2 cursor-pointer group select-none transition-all my-1"
            title="انقر لفتح سجل الترجمات السابقة"
          >
            <div className="w-10 h-1.5 rounded-full transition-colors mb-1" style={{ background: 'var(--mt-border-strong)' }} />
            <span className="text-[11px] opacity-60 group-hover:opacity-100 transition-all font-medium">
              {showHistory ? 'إخفاء السجلّ' : 'يمكنك النقر أو التمرير سريعاً للأسفل لإظهار السجلّ.'}
            </span>
          </div>

          {/* Translation History Drawer / Card */}
          {showHistory && (
            <div className="mt-glass mt-slide-up p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--mt-border)' }}>
                <div className="flex items-center gap-2">
                  <History size={17} className="mt-accent-text" />
                  <h3 className="font-bold text-sm">سجل الترجمات المحفوظة محلياً</h3>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="mt-btn mt-btn-danger px-2 py-1 text-xs"
                    >
                      <Trash2 size={13} />
                      <span>مسح السجل</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded-lg mt-subtext hover:text-[var(--mt-text)] hover:bg-[var(--mt-surface)] transition-colors"
                    title="إغلاق السجل"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="py-6 text-center opacity-40 text-xs">
                  لا توجد أي ترجمات مسجلة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="mt-surface-soft p-3 flex items-start justify-between gap-3 group" style={{ border: '1px solid var(--mt-border)' }}
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setInputText(item.sourceText);
                          setResultText(item.translatedText);
                          showToast('تم تحميل الترجمة إلى الواجهة');
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="mt-badge font-mono">
                            {item.sourceLang} → {item.targetLang}
                          </span>
                          <span className="text-[10px] opacity-40">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs font-semibold truncate">{item.sourceText}</div>
                        <div className="text-xs opacity-80 truncate mt-accent-text">{item.translatedText}</div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSpeak(item.translatedText, item.targetLang)}
                          className="mt-icon-btn p-1.5"
                          title="استماع"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.translatedText)}
                          className="mt-icon-btn p-1.5"
                          title="نسخ"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="mt-icon-btn p-1.5"
                          title={item.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          <Star size={13} className={item.isFavorite ? "fill-[var(--mt-accent)] mt-accent-text" : ""} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating Bottom Navigation (Screenshots 1 & 2) */}
          <div className="mt-auto pt-4 pb-2 mt-safe-bottom-pad flex flex-col items-center gap-3 w-full">
            
            {/* Floating Language Pill Selector */}
            <div className="mt-glass w-full max-w-lg rounded-full px-2 py-1.5 flex items-center justify-between">
              <div className="flex-1 flex items-center justify-center">
                <LanguageSelectDropdown
                  label="من"
                  value={sourceLang}
                  onChange={(newLang) => {
                    setSourceLang(newLang);
                    lastTranslatedText.current = '';
                  }}
                  allowAutoDetect={true}
                  isLanguageDownloaded={isLanguageDownloaded}
                  onDownloadLanguage={handleQuickDownloadLanguage}
                  onOpenOfflinePacks={() => setIsOfflinePacksModalOpen(true)}
                  offlinePacks={getOfflinePacks()}
                  autoDetectedName={detectedLanguageName}
                  autoDetectedCode={detectedLangCode}
                  onAcceptAutoDetect={() => {
                    setSourceLang(detectedLangCode);
                    showToast(`تم تثبيت اللغة: ${detectedLanguageName}`);
                  }}
                />
              </div>

              {/* Swap Button */}
              <button
                onClick={swapLanguages}
                className="mt-icon-btn w-8 h-8 mx-1 shrink-0 active:rotate-180"
                title="تبديل اللغات"
              >
                <ArrowRightLeft size={15} />
              </button>

              <div className="flex-1 flex items-center justify-center">
                <LanguageSelectDropdown
                  label="إلى"
                  value={targetLang}
                  onChange={(newLang) => {
                    setTargetLang(newLang);
                    lastTranslatedText.current = '';
                  }}
                  allowAutoDetect={false}
                  isLanguageDownloaded={isLanguageDownloaded}
                  onDownloadLanguage={handleQuickDownloadLanguage}
                  onOpenOfflinePacks={() => setIsOfflinePacksModalOpen(true)}
                  offlinePacks={getOfflinePacks()}
                />
              </div>
            </div>

            {/* The 3 Iconic Action Buttons: Camera, Microphone, Live Conversation */}
            <div className="flex items-center justify-center gap-6 sm:gap-14 w-full pt-1">
              {/* 1. Camera OCR */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="mt-glass mt-icon-btn w-12 h-12 sm:w-14 sm:h-14 hover:scale-105 active:scale-95"
                  title="ترجمة الصور والكاميرا"
                >
                  <Camera size={22} />
                </button>
                <span className="text-[10px] sm:text-[11px] font-semibold opacity-80 whitespace-nowrap">الكاميرا</span>
              </div>

              {/* 2. Large Central Microphone */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={toggleListening}
                  className={`mt-icon-btn rounded-full hover:scale-105 active:scale-95 border ${
                    isListening ? 'mt-listening' : 'mt-glass'
                  }`}
                  style={{
                    width: 'clamp(3.75rem, 17vw, 4.5rem)',
                    height: 'clamp(3.75rem, 17vw, 4.5rem)',
                    background: isListening ? 'var(--mt-danger)' : undefined,
                    color: isListening ? '#fff' : 'var(--mt-accent)',
                    borderColor: isListening ? 'var(--mt-danger)' : undefined,
                  }}
                  title={isListening ? 'جاري الاستماع... انقر للإيقاف' : 'التحدث بالصوت'}
                >
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                <span className="text-[10px] sm:text-[11px] font-bold opacity-80 whitespace-nowrap">
                  {isListening ? 'جاري الاستماع...' : 'صوت'}
                </span>
              </div>

              {/* 3. Live Dual Conversation */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setIsDualConversationModalOpen(true)}
                  className="mt-glass mt-icon-btn w-12 h-12 sm:w-14 sm:h-14 hover:scale-105 active:scale-95"
                  title="الترجمة المباشرة والمحادثة الثنائية"
                >
                  <Users size={22} />
                </button>
                <span className="text-[10px] sm:text-[11px] font-semibold opacity-80 whitespace-nowrap">الترجمة المباشرة</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL 1: Precision Numeric Zoom Modal */}
      <ZoomModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        zoom={zoom}
        onChangeZoom={setZoom}
        currentTheme={currentTheme}
      />

      {/* MODAL 2: V3 Pro Settings Panel (15 Horizontal Tabs & Vertical Lateral Sidebar) */}
      <ProSettingsPanel
        isOpen={isProSettingsOpen}
        onClose={() => setIsProSettingsOpen(false)}
        appSettings={appSettings}
        onUpdateAppSettings={setAppSettings}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        history={history}
        onClearHistory={clearHistory}
        onRestoreLastTranslation={restoreLastTranslation}
        lastItem={lastItem}
        forceOffline={forceOffline}
        onToggleForceOffline={setForceOffline}
        zoom={zoom}
        onChangeZoom={setZoom}
        ttsSettings={ttsSettings}
        onChangeTtsSettings={setTtsSettings}
        availableVoices={AVAILABLE_VOICES}
        selectedDomain={selectedDomain}
        onChangeDomain={(d) => {
          setSelectedDomain(d);
          lastTranslatedText.current = '';
        }}
        selectedTone={selectedTone}
        onChangeTone={(t) => {
          setSelectedTone(t);
          lastTranslatedText.current = '';
        }}
        selectedDialect={selectedDialect}
        onChangeDialect={(dl) => {
          setSelectedDialect(dl);
          lastTranslatedText.current = '';
        }}
        toolbarOrientation={toolbarOrientation}
        onChangeToolbarOrientation={handleUpdateToolbarOrientation}
        toolbarButtonsOrder={toolbarButtonsOrder}
        onChangeToolbarButtonsOrder={handleUpdateToolbarOrder}
        onOpenConversation={() => setIsDualConversationModalOpen(true)}
        onOpenImage={() => setIsImageModalOpen(true)}
        isFloatingOpen={isFloatingOpen}
        onToggleFloating={() => setIsFloatingOpen(!isFloatingOpen)}
        onOpenOfflinePacks={() => setIsOfflinePacksModalOpen(true)}
        downloadedPacksCount={downloadedPacksCount}
        onOpenComparison={handleRunComparison}
        onOpenAnalysis={handleRunDeepAnalysis}
        onOpenHistory={() => setShowHistory(true)}
        inputText={inputText}
      />

      {/* MODAL 3: Offline Language Packs Download Manager */}
      <OfflinePacksModal
        isOpen={isOfflinePacksModalOpen}
        onClose={() => setIsOfflinePacksModalOpen(false)}
        theme={currentTheme}
        storageLimitGB={appSettings.storageLimitGB}
        onStorageLimitChange={(limit) => setAppSettings(prev => ({ ...prev, storageLimitGB: limit }))}
      />

      {/* MODAL 4: Dual Speaker Voice-to-Voice Conversation Mode */}
      <DualConversationModal
        isOpen={isDualConversationModalOpen}
        onClose={() => setIsDualConversationModalOpen(false)}
        theme={currentTheme}
        ttsSettings={ttsSettings}
        forceOffline={forceOffline}
      />

      {/* MODAL 5: Mahdi Deep AI Linguistic Analysis & Engine Comparison Drawer */}
      <AIAnalysisDrawer
        isOpen={isAnalysisDrawerOpen}
        onClose={() => setIsAnalysisDrawerOpen(false)}
        analysis={aiAnalysis}
        comparison={engineComparison}
        onSelectAlternative={(altText) => {
          setResultText(altText);
          showToast('تم اعتماد الصياغة البديلة بنجاح ✓');
        }}
        theme={currentTheme}
        sourceText={inputText}
      />

      {/* MODAL 6: Legacy/Compact Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        history={history}
        onClearHistory={clearHistory}
        onRestoreLastTranslation={restoreLastTranslation}
        lastItem={lastItem}
        forceOffline={forceOffline}
        onToggleForceOffline={setForceOffline}
        zoom={zoom}
        onChangeZoom={setZoom}
        ttsSettings={ttsSettings}
        onChangeTtsSettings={setTtsSettings}
        availableVoices={AVAILABLE_VOICES}
      />

      {/* MODAL 7: Floating Translate Window (Screen Translation) */}
      <FloatingTranslateWindow
        isOpen={isFloatingOpen}
        onClose={() => setIsFloatingOpen(false)}
        currentTheme={currentTheme}
        languages={LANGUAGES}
        onTranslate={async (text, from, to) => {
          try {
            const res = await translateText(text, from, to, {
              domain: selectedDomain,
              tone: selectedTone,
              dialect: selectedDialect
            });
            return res.translation;
          } catch (e) {
            const offline = translateOffline(text, from, to, {
              domain: selectedDomain,
              dialect: selectedDialect
            });
            return offline.translation;
          }
        }}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
      />

      {/* MODAL 8: Camera & Image OCR Translate Modal */}
      <ImageTranslateModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        currentTheme={currentTheme}
        languages={LANGUAGES}
        targetLang={targetLang}
        onTranslateImage={translateImage}
        onApplyText={(text) => {
          setInputText('[Image Translated]');
          setResultText(text);
          showToast('تم إدراج ترجمة الصورة بنجاح ✓');
        }}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
      />

      {/* MODAL 9: Starred / Favorite Translations Modal */}
      <StarredTranslationsModal
        isOpen={isStarredModalOpen}
        onClose={() => setIsStarredModalOpen(false)}
        starredItems={favorites}
        onToggleStar={toggleFavorite}
        onSelect={(item) => {
          setSourceLang(item.sourceLang);
          setTargetLang(item.targetLang);
          setInputText(item.sourceText);
          setResultText(item.translatedText);
          showToast('تم تحميل الترجمة المميزة بنجمة');
        }}
        onSpeak={handleSpeak}
        onCopy={copyToClipboard}
      />

      {/* MODAL 10: Handwriting Canvas Input Modal */}
      <HandwritingModal
        isOpen={isHandwritingModalOpen}
        onClose={() => setIsHandwritingModalOpen(false)}
        onApplyText={(text) => {
          setInputText(prev => prev ? `${prev} ${text}` : text);
          showToast('تم إدراج النص المكتوب بخط اليد');
        }}
      />

      {/* MODAL 11: Theme Gallery — 1500+ themes applied to the whole app */}
      {isThemeGalleryOpen && (
        <div className="mt-modal-backdrop" onClick={() => setIsThemeGalleryOpen(false)} role="dialog" aria-modal="true" aria-label="مكتبة الثيمات">
          <div className="mt-modal max-w-6xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--mt-border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl" style={{ background: 'var(--mt-primary-gradient)', color: 'var(--mt-on-primary)' }}>
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold mt-heading">مكتبة الثيمات الاحترافية</h2>
                  <p className="text-[11px] mt-subtext">
                    {themeTotal} ثيم بألوان وأشكال متميزة — يُطبَّق فوراً على كل التطبيق
                  </p>
                </div>
              </div>
              <button onClick={() => setIsThemeGalleryOpen(false)} className="mt-icon-btn p-2" title="إغلاق" aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-scroll p-4 sm:p-5">
              <ThemeGallery
                variant="full"
                maxHeightClass="max-h-[42vh]"
                onApplied={(t) => showToast(`تم تطبيق ثيم: ${t.nameAr} ✓`)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google account + cloud sync modal (real Firebase when configured) */}
      <GoogleAuthModal
        isOpen={isGoogleAuthOpen}
        onClose={() => setIsGoogleAuthOpen(false)}
        currentUser={googleUser}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        starredCount={favorites.length}
        historyCount={history.length}
      />

      {/* ── v4.0 RTranslator-grade on-device AI suite ──────────────────── */}
      <ToolsHubModal
        isOpen={isToolsHubOpen}
        onClose={() => setIsToolsHubOpen(false)}
        theme={currentTheme}
        onOpenTool={(id: ToolId) => {
          switch (id) {
            case 'image': setIsImageModalOpen(true); break;
            case 'dual': setIsDualConversationModalOpen(true); break;
            case 'walkie': setIsWalkieOpen(true); break;
            case 'p2p': setIsP2pOpen(true); break;
            case 'neural': setIsNeuralModelsOpen(true); break;
            case 'document': setIsDocumentOpen(true); break;
            case 'phrasebook': setIsPhrasebookOpen(true); break;
            case 'stats': setIsStatsOpen(true); break;
            case 'packs': setIsOfflinePacksModalOpen(true); break;
            case 'floating': setIsFloatingOpen(true); break;
            case 'handwriting': setIsHandwritingModalOpen(true); break;
            case 'starred': setIsStarredModalOpen(true); break;
            case 'themes': setIsThemeGalleryOpen(true); break;
            case 'settings': setIsProSettingsOpen(true); break;
            case 'breakdown': setIsBreakdownOpen(true); break;
          }
        }}
      />

      <NeuralModelsModal
        isOpen={isNeuralModelsOpen}
        onClose={() => setIsNeuralModelsOpen(false)}
        theme={currentTheme}
        quality={neuralQuality}
        onQualityChange={setNeuralQuality}
        useGpu={neuralUseGpu}
        onUseGpuChange={setNeuralUseGpu}
        onToast={showToast}
      />

      <WalkieTalkieModal
        isOpen={isWalkieOpen}
        onClose={() => setIsWalkieOpen(false)}
        theme={currentTheme}
        languages={LANGUAGES}
        translateFn={universalTranslate}
        onSpeak={handleSpeak}
      />

      <P2PConversationModal
        isOpen={isP2pOpen}
        onClose={() => setIsP2pOpen(false)}
        theme={currentTheme}
        languages={LANGUAGES}
        translateFn={universalTranslate}
        onSpeak={handleSpeak}
      />

      <PhrasebookModal
        isOpen={isPhrasebookOpen}
        onClose={() => setIsPhrasebookOpen(false)}
        theme={currentTheme}
        languages={LANGUAGES}
        onSpeak={handleSpeak}
        translateFn={universalTranslate}
        onToast={showToast}
      />

      <DocumentTranslateModal
        isOpen={isDocumentOpen}
        onClose={() => setIsDocumentOpen(false)}
        theme={currentTheme}
        languages={LANGUAGES}
        translateFn={universalTranslate}
        onToast={showToast}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        theme={currentTheme}
      />

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        theme={currentTheme}
      />

      <WordBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        theme={currentTheme}
        text={inputText}
        from={sourceLang === 'auto' ? detectLanguageFromText(inputText) : sourceLang}
        to={targetLang}
        dialect={selectedDialect}
        onSpeak={handleSpeak}
      />
    </div>
  );
};

export default App;
