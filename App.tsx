import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { THEMES_LIST, DEFAULT_THEME_ID } from './themeRegistry.ts';
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
  MoreVertical
} from 'lucide-react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const AVAILABLE_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

export const App: React.FC = () => {
  // Theme state from 125+ themes
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    try {
      const savedThemeId = localStorage.getItem('mahdi_theme_id');
      const found = THEMES_LIST.find(t => t.id === savedThemeId);
      return found || THEMES_LIST[0];
    } catch {
      return THEMES_LIST[0];
    }
  });

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

  const lastTranslatedText = useRef<string>('');
  const recognitionRef = useRef<any>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

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

  useEffect(() => {
    try {
      localStorage.setItem('mahdi_theme_id', currentTheme.id);
    } catch {}
  }, [currentTheme]);

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

  // Speech Recognition (Voice-to-Text)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      const actualLangCode = sourceLang === 'auto' ? (detectedLangCode || 'ar') : sourceLang;
      const bcp47 = LANG_BCP47_MAP[actualLangCode] || actualLangCode;
      recognition.lang = bcp47;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
        showToast('تم التقاط الصوت بنجاح ✓');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('تم رفض إذن الوصول للميكروفون. يرجى السماح بالوصول في المتصفح.');
        }
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [sourceLang, detectedLangCode]);

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

  // Translation Handler (Online AI + Local Offline Engine + Auto Detect)
  const handleTranslate = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastTranslatedText.current || trimmed === '[Image Translated]') {
      if (!trimmed) setResultText('');
      return;
    }

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
        const offlineRes = translateOffline(trimmed, sourceLang, targetLang, {
          domain: selectedDomain,
          dialect: selectedDialect
        });
        setResultText(offlineRes.translation);
        setTransliteration(offlineRes.transliteration || '');
        setDetectedLangBanner(offlineRes.detectedLanguageName || '');
        setMoreTranslations(offlineRes.moreTranslations || []);
        setDefinitions(offlineRes.definitions || []);
        translationCache.current.set(cacheKey, offlineRes.translation);
        setTranslationEngine('offline');
        lastTranslatedText.current = trimmed;

        const newItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          sourceText: trimmed,
          translatedText: offlineRes.translation,
          sourceLang,
          targetLang,
          timestamp: Date.now(),
          mode: 'offline',
          detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
        };
        setHistory(prev => [newItem, ...prev.filter(i => i.sourceText !== trimmed)].slice(0, 50));
      } catch (err: any) {
        setError('تعذر إتمام الترجمة المحلية.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Online AI Translation via Gemini
    try {
      const result = await translateText(trimmed, sourceLang, targetLang, {
        domain: selectedDomain,
        tone: selectedTone,
        dialect: selectedDialect,
        includeAnalysis: false
      });
      setResultText(result.translation);
      setTransliteration(result.transliteration || '');
      setDetectedLangBanner(result.detectedLanguageName || '');
      setMoreTranslations(result.moreTranslations || []);
      setDefinitions(result.definitions || []);
      translationCache.current.set(cacheKey, result.translation);
      if (result.analysis) setAiAnalysis(result.analysis);
      setTranslationEngine('online');
      setError(null);
      lastTranslatedText.current = trimmed;

      const newItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        sourceText: trimmed,
        translatedText: result.translation,
        sourceLang,
        targetLang,
        timestamp: Date.now(),
        mode: 'online',
        detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
      };
      setHistory(prev => [newItem, ...prev.filter(i => i.sourceText !== trimmed)].slice(0, 50));
    } catch (err: any) {
      console.warn('Online translation temporary issue, switching to local offline engine:', err?.message || err);
      // Fallback to offline engine seamlessly!
      try {
        const offlineFallback = translateOffline(trimmed, sourceLang, targetLang, {
          domain: selectedDomain,
          dialect: selectedDialect
        });
        setResultText(offlineFallback.translation);
        setTransliteration(offlineFallback.transliteration || '');
        setDetectedLangBanner(offlineFallback.detectedLanguageName || '');
        setMoreTranslations(offlineFallback.moreTranslations || []);
        setDefinitions(offlineFallback.definitions || []);
        translationCache.current.set(cacheKey, offlineFallback.translation);
        setTranslationEngine('offline');
        setError(null); // Clear error because translation succeeded via offline engine
        lastTranslatedText.current = trimmed;
        showToast('تمت الترجمة بالمحرك المحلي الفوري ⚡');

        const newItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          sourceText: trimmed,
          translatedText: offlineFallback.translation,
          sourceLang,
          targetLang,
          timestamp: Date.now(),
          mode: 'offline',
          detectedLang: sourceLang === 'auto' ? activeFrom : undefined,
        };
        setHistory(prev => [newItem, ...prev.filter(i => i.sourceText !== trimmed)].slice(0, 50));
      } catch (offlineErr: any) {
        setError('تعذر إتمام الترجمة عبر السيرفر أو المحرك المحلي.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sourceLang, targetLang, forceOffline, selectedDomain, selectedTone, selectedDialect]);

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

    // Instant cache retrieval on typing
    const cacheKey = `${trimmed}__${sourceLang}__${targetLang}__${selectedDomain}__${selectedTone}__${selectedDialect}`;
    if (translationCache.current.has(cacheKey)) {
      setResultText(translationCache.current.get(cacheKey)!);
      lastTranslatedText.current = trimmed;
      return;
    }

    const delayMs = forceOffline || !navigator.onLine ? 160 : 280;
    const timer = setTimeout(() => {
      handleTranslate(inputText);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [inputText, handleTranslate, sourceLang, targetLang, selectedDomain, selectedTone, selectedDialect, forceOffline]);

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

    const prevInput = inputText;
    setInputText(resultText);
    setResultText(prevInput);
    lastTranslatedText.current = '';
  };

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
    // Instant 0ms response from rich offline dictionary
    const instant = translateOffline(newText.trim(), sourceLang, targetLang);
    if (instant && instant.confidence === 'exact') {
      setResultText(instant.translation);
      setTransliteration(instant.transliteration || '');
      setDetectedLangBanner(instant.detectedLanguageName || '');
      setMoreTranslations(instant.moreTranslations || []);
      setDefinitions(instant.definitions || []);
      lastTranslatedText.current = newText.trim();
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

  const hasActiveText = Boolean(inputText.trim() || resultText);

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${currentTheme.bg} ${currentTheme.text} flex flex-col selection:bg-amber-500/30 selection:text-amber-200`}
      dir="rtl"
      style={{
        fontSize: `${zoom}%`,
      }}
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[115] px-5 py-2 rounded-full bg-zinc-950/90 text-amber-300 border border-amber-500/40 shadow-2xl backdrop-blur-md text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Sparkles size={14} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div 
        className="w-full flex-1 flex flex-col p-3 sm:p-5 md:p-6 max-w-5xl mx-auto transition-transform duration-200 origin-top"
      >
        {/* Unified Responsive Header */}
        <header className="w-full flex items-center justify-between gap-2 mb-3 pb-2 border-b border-inherit/30">
          {/* Right side (in RTL): Google Account Button & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsGoogleAuthOpen(true)}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 border border-inherit flex items-center gap-1.5 transition-all active:scale-95 shadow-sm group"
              title={googleUser ? `حساب Google: ${googleUser.email}` : "تسجيل الدخول بحساب Google"}
            >
              {googleUser ? (
                <div className="flex items-center gap-1.5">
                  {googleUser.photoUrl ? (
                    <img src={googleUser.photoUrl} alt={googleUser.name} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-emerald-400" />
                  ) : (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-emerald-400">
                      {googleUser.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-[11px] font-bold max-w-[70px] sm:max-w-[100px] truncate hidden sm:inline">
                    {googleUser.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-blue-500 to-amber-500 text-white font-bold flex items-center justify-center text-[10px] shadow-inner">
                    <User size={13} />
                  </div>
                  <span className="text-[11px] font-bold hidden sm:inline opacity-80">تسجيل الدخول</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setIsProSettingsOpen(true)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-all"
              title="الإعدادات الاحترافية الشاملة"
            >
              <SlidersHorizontal size={17} />
            </button>
          </div>

          {/* Center: Mode Switcher (الوضع المتقدم شاشتان vs الوضع الكلاسيكي) */}
          <div className="flex items-center p-0.5 rounded-full bg-black/10 dark:bg-white/10 border border-inherit/30 text-xs shadow-inner">
            <button
              onClick={() => handleSetViewMode('classic')}
              className={`px-2.5 py-1 rounded-full font-bold transition-all text-[11px] flex items-center gap-1 ${
                viewMode === 'classic'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-inherit opacity-65 hover:opacity-100'
              }`}
              title="الوضع الكلاسيكي"
            >
              <Globe2 size={12} />
              <span className="hidden sm:inline">الوضع الكلاسيكي</span>
              <span className="sm:hidden">كلاسيكي</span>
            </button>
            <button
              onClick={() => handleSetViewMode('advanced')}
              className={`px-2.5 py-1 rounded-full font-bold transition-all text-[11px] flex items-center gap-1 ${
                viewMode === 'advanced'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-inherit opacity-65 hover:opacity-100'
              }`}
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
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-colors"
              title="الكتابة باليد والرسم"
            >
              <Pen size={16} />
            </button>

            <button
              onClick={() => setIsStarredModalOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-colors"
              title="المفضلة والمحفوظات"
            >
              <Star size={17} className={favorites.length > 0 ? "text-amber-400 fill-amber-400" : "opacity-70"} />
              {favorites.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 font-black text-[9px] flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="p-1.5 sm:p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-inherit transition-colors"
              title="سجل الترجمة"
            >
              <History size={17} />
            </button>
          </div>
        </header>

        {/* Translation Card Workspace */}
        <main className="w-full flex flex-col gap-4 flex-1">
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
              onOpenAIAnalysis={() => setIsAIAnalysisOpen(true)}
              onOpenCompareEngines={() => setIsCompareModalOpen(true)}
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
              theme={currentTheme}
            />
          )}

          {/* Swipe Down History Pull Handle Bar (Screenshot 2) */}
          <div 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex flex-col items-center justify-center py-2 cursor-pointer group select-none transition-all my-1"
            title="انقر لفتح سجل الترجمات السابقة"
          >
            <div className="w-10 h-1.5 rounded-full bg-inherit/40 group-hover:bg-amber-500 transition-colors mb-1" />
            <span className="text-[11px] opacity-60 group-hover:opacity-100 group-hover:text-amber-400 transition-all font-medium">
              {showHistory ? 'إخفاء السجلّ' : 'يمكنك النقر أو التمرير سريعاً للأسفل لإظهار السجلّ.'}
            </span>
          </div>

          {/* Translation History Drawer / Card */}
          {showHistory && (
            <div className={`${currentTheme.card} rounded-3xl p-4 sm:p-5 border ${currentTheme.border} shadow-xl animate-in slide-in-from-bottom-3 duration-200`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <History size={17} className="text-amber-500" />
                  <h3 className="font-bold text-sm">سجل الترجمات المحفوظة محلياً</h3>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={13} />
                      <span>مسح السجل</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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
                      className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-inherit hover:border-amber-500/40 transition-all flex items-start justify-between gap-3 group"
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
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            {item.sourceLang} → {item.targetLang}
                          </span>
                          <span className="text-[10px] opacity-40">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs font-semibold truncate">{item.sourceText}</div>
                        <div className="text-xs opacity-75 text-amber-400/90 truncate">{item.translatedText}</div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSpeak(item.translatedText, item.targetLang)}
                          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                          title="استماع"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.translatedText)}
                          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                          title="نسخ"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                          title={item.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          <Star size={13} className={item.isFavorite ? "text-amber-400 fill-amber-400" : "text-zinc-400"} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating Bottom Navigation (Screenshots 1 & 2) */}
          <div className="mt-auto pt-4 pb-2 flex flex-col items-center gap-3 w-full">
            
            {/* Floating Language Pill Selector */}
            <div className="w-full max-w-lg bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-white/10 text-white rounded-full px-2 py-1.5 shadow-2xl flex items-center justify-between">
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:rotate-180 transition-all shadow-inner mx-1 shrink-0"
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
            <div className="flex items-center justify-center gap-8 sm:gap-14 w-full pt-1">
              {/* 1. Camera OCR */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setIsImageModalOpen(true)}
                  className="w-14 h-14 rounded-full bg-zinc-900/90 dark:bg-zinc-800/90 text-blue-400 hover:bg-blue-500 hover:text-white border border-white/10 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="ترجمة الصور والكاميرا"
                >
                  <Camera size={24} />
                </button>
                <span className="text-[11px] font-semibold opacity-80">الكاميرا</span>
              </div>

              {/* 2. Large Central Microphone */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={toggleListening}
                  className={`w-18 h-18 rounded-full flex items-center justify-center transition-all shadow-2xl hover:scale-105 active:scale-95 border ${
                    isListening
                      ? 'bg-red-500 text-white border-red-400 animate-pulse ring-8 ring-red-500/30 shadow-red-500/50'
                      : 'bg-zinc-800/90 dark:bg-zinc-700/90 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 border-white/10'
                  }`}
                  style={{ width: '4.5rem', height: '4.5rem' }}
                  title={isListening ? 'جاري الاستماع... انقر للإيقاف' : 'التحدث بالصوت'}
                >
                  {isListening ? <MicOff size={30} /> : <Mic size={30} />}
                </button>
                <span className="text-[11px] font-bold opacity-80">
                  {isListening ? 'جاري الاستماع...' : 'صوت'}
                </span>
              </div>

              {/* 3. Live Dual Conversation */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => setIsDualConversationModalOpen(true)}
                  className="w-14 h-14 rounded-full bg-zinc-900/90 dark:bg-zinc-800/90 text-blue-400 hover:bg-blue-500 hover:text-white border border-white/10 shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="الترجمة المباشرة والمحادثة الثنائية"
                >
                  <Users size={24} />
                </button>
                <span className="text-[11px] font-semibold opacity-80">الترجمة المباشرة</span>
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
    </div>
  );
};

export default App;
