export interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
  flag?: string;
  hasOfflinePack?: boolean;
}

export type DialectCode = 
  | 'standard' 
  | 'ar-iq' // عراقي
  | 'ar-eg' // مصري
  | 'ar-sy' // شامي
  | 'ar-gulf' // خليجي
  | 'ar-ma' // مغربي
  | 'ar-sd' // سوداني
  | 'ar-ye' // يمني
  | 'ar-tn' // تونسي
  | 'ar-dz' // جزائري
  | 'en-us' // أمريكي
  | 'en-uk' // بريطاني
  | 'en-au' // أسترالي
  | 'fr-ca' // فرنسي كندي
  | 'es-mx' // إسباني مكسيكي
  | 'zh-cantonese'; // كانتونية

export interface DialectOption {
  code: DialectCode;
  name: string;
  nameAr: string;
  parentLang: string;
}

export type DomainCode = 
  | 'general'
  | 'medical'
  | 'legal'
  | 'tech'
  | 'literary'
  | 'religious'
  | 'academic'
  | 'marketing'
  | 'business'
  | 'diplomatic'
  | 'travel';

export interface DomainOption {
  code: DomainCode;
  nameAr: string;
  icon: string;
  desc: string;
}

export type ToneCode = 
  | 'standard'
  | 'formal'
  | 'casual'
  | 'professional'
  | 'humorous'
  | 'poetic'
  | 'simplified';

export interface ToneOption {
  code: ToneCode;
  nameAr: string;
  desc: string;
}

export type OfflinePackType = 
  | 'text' // حزمة الترجمة النصية
  | 'voice' // حزمة الصوت والنطق (STT + TTS)
  | 'ocr' // حزمة الكاميرا والتعرف البصري
  | 'llm' // حزمة النموذج اللغوي المحلي
  | 'dialects' // حزمة اللهجات
  | 'glossary' // حزمة المعاجم والمصطلحات
  | 'natural_voice'; // حزمة الأصوات الطبيعية

export interface OfflinePack {
  id: string;
  langCode: string;
  langName: string;
  langNative: string;
  type: OfflinePackType;
  typeNameAr: string;
  sizeMB: number;
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'paused' | 'update_available';
  progress: number; // 0 to 100
  downloadSpeedMBs?: number;
  remainingSeconds?: number;
  checksum: string;
  lastUpdated: string;
  isEssential?: boolean;
}

export interface MoreTranslation {
  phrase: string;
  partOfSpeech: string;
  reverseTranslations: string[];
}

export interface WordDefinition {
  partOfSpeech: string;
  definition: string;
  example?: string;
  number: number;
  synonyms?: string[];
}

export interface AIAnalysisResult {
  alternatives: string[];
  culturalNotes?: string;
  grammarExplanation?: string;
  sentiment?: string;
  keyTerms?: { term: string; meaning: string }[];
  detectedDialect?: string;
}

export interface MultiEngineComparison {
  mahdiNeural: string;
  deepLStyle: string;
  standardMt: string;
}

export interface ConversationMessage {
  id: string;
  speaker: 'A' | 'B';
  speakerName: string;
  lang: string;
  sourceText: string;
  translatedText: string;
  timestamp: number;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
  isFavorite?: boolean;
  mode?: 'online' | 'offline';
  detectedLang?: string;
  domain?: DomainCode;
  tone?: ToneCode;
  dialect?: DialectCode;
  tags?: string[];
}

export interface TtsSettings {
  voiceName: string;
  rate: number;
  pitch: number;
  engine: 'mahdi-neural' | 'browser-native' | 'offline-piper';
}

export interface CustomThemeSettings {
  accentColor: string;
  secondaryColor?: string;
  cardOpacity: number;
  glassBlur: number;
  borderRadius: number;
  bgStyle:
    | 'obsidian'
    | 'aurora'
    | 'emerald'
    | 'crystal'
    | 'royal-dark'
    | 'sunset'
    | 'light'
    | 'midnight'
    | 'desert'
    | 'ocean'
    | 'neon'
    | 'rose';
  glowAnimation: boolean;
  pattern?: ThemePattern;
  shape?: ThemeShapeId;
}

/** Resolved colour tokens of a theme (always hex, safe for CSS custom properties). */
export interface ThemeColors {
  /** App page background (solid base under any gradient/pattern). */
  bg: string;
  /** Secondary background stop used by the gradient. */
  bgAlt: string;
  /** Third background stop used by the gradient. */
  bgDeep: string;
  /** Solid card surface (already includes the glass tint). */
  card: string;
  /** Nested surface inside a card (chips, rows, inputs). */
  surface: string;
  /** Elevated surface (modals, dropdowns, popovers). */
  elevated: string;
  /** Main readable text colour. */
  text: string;
  /** Secondary / muted text colour. */
  subtext: string;
  /** Primary action colour (buttons, active states). */
  primary: string;
  /** Hover/pressed variant of the primary colour. */
  primaryHover: string;
  /** Text/icon colour that sits on top of the primary colour. */
  onPrimary: string;
  /** Secondary action colour. */
  secondary: string;
  secondaryHover: string;
  onSecondary: string;
  /** Decorative accent used for highlights, icons, focus rings. */
  accent: string;
  /** Hairline border colour (already semi-transparent). */
  border: string;
  /** Stronger border used on focus / active elements. */
  borderStrong: string;
  /** Danger / destructive colour. */
  danger: string;
  /** Success colour. */
  success: string;
  /** Warning colour. */
  warning: string;
  /** Colour of the glow / shadow tint. */
  glow: string;
}

export type ThemePattern =
  | 'none'
  | 'dots'
  | 'grid'
  | 'waves'
  | 'arabesque'
  | 'mesh'
  | 'aurora'
  | 'rays'
  | 'noise'
  | 'hex'
  | 'diamonds'
  | 'stars'
  | 'topography'
  | 'circuit'
  | 'silk';

export type ThemeShapeId =
  | 'rounded'
  | 'squircle'
  | 'pill'
  | 'sharp'
  | 'glass'
  | 'silk'
  | 'metal'
  | 'neumorph'
  | 'brutalist'
  | 'terminal'
  | 'royal'
  | 'aurora'
  | 'desert'
  | 'heritage'
  | 'cyber'
  | 'pastel'
  | 'neon'
  | 'minimal'
  | 'crystal'
  | 'velvet';

/** Geometry / texture tokens of a theme ("the shape" of the design). */
export interface ThemeShape {
  id: ThemeShapeId;
  nameAr: string;
  /** Base radius for cards in px. */
  radius: number;
  /** Small radius for chips/inputs in px. */
  radiusSm: number;
  /** backdrop-filter blur amount in px. */
  blur: number;
  /** 0..100 opacity of the glass card surface. */
  glassOpacity: number;
  /** Border width in px. */
  borderWidth: number;
  /** Shadow definition used by cards. */
  shadow: string;
  /** Background pattern painted behind everything. */
  pattern: ThemePattern;
  /** Whether the primary colour is painted as a gradient. */
  gradientPrimary: boolean;
  /** Heading font family. */
  fontHeading: string;
  /** Body font family. */
  fontBody: string;
  /** Ambient animated glow behind the workspace. */
  glow: boolean;
  /** Extra letter spacing for headings. */
  tracking: string;
}

export type ThemeCategoryId =
  | 'all'
  | 'favorites'
  | 'glass'
  | 'royal'
  | 'dark'
  | 'light'
  | 'neon'
  | 'ocean'
  | 'nature'
  | 'sunset'
  | 'pastel'
  | 'minimal'
  | 'cyber'
  | 'heritage'
  | 'desert'
  | 'aurora'
  | 'mono'
  | 'vivid'
  | 'custom';

export interface ThemeConfig {
  id: string;
  name: string;
  nameAr: string;
  category: ThemeCategoryId;
  /** Tailwind class strings (kept for backwards compatibility with every screen). */
  bg: string;
  card: string;
  text: string;
  subtext: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  border: string;
  accent: string;
  headerBg: string;
  previewColor: string;
  isGlass?: boolean;
  /** True when the theme is a light-on-dark design. */
  isDark?: boolean;
  /** Resolved colour tokens — the single source of truth for CSS variables. */
  colors: ThemeColors;
  /** Geometry / texture tokens. */
  shape: ThemeShape;
  /** Gradient definition (CSS background-image) painted on the page. */
  backgroundImage: string;
  /** Search keywords (Arabic + English) used by the theme finder. */
  tags?: string[];
  /** True for hand-tuned signature themes. */
  signature?: boolean;
}

export type Theme = ThemeConfig;

/** Runtime appearance preferences applied on top of the selected theme. */
export interface AppearanceOptions {
  /** 0..100 — opacity of the classic-mode translation boxes (0 = fully transparent glass). */
  cardOpacity: number;
  /** 0..40 px backdrop blur. */
  glassBlur: number;
  /** 50..150 % scaling of every radius in the active shape. */
  radiusScale: number;
  /** Page background pattern override ('theme' keeps the theme default). */
  pattern: ThemePattern | 'theme';
  /** Animated ambient background. */
  animateBackground: boolean;
  /** Respect reduced-motion / disable all animation. */
  reduceMotion: boolean;
  /** Accessibility high-contrast mode. */
  highContrast: boolean;
  /** Show the ambient glow orbs. */
  showGlow: boolean;
  /** Text size scale in %. */
  textScale: number;
  /** Recently used theme ids (newest first). */
  recentThemeIds: string[];
  /** Favourite theme ids. */
  favoriteThemeIds: string[];
}

export type ZoomLevel = number;

export interface AppSettings {
  // General
  appLanguage: 'ar' | 'en';
  timeFormat: '12h' | '24h';
  autoCopyOnTranslate: boolean;
  instantTranslateWhileTyping: boolean;
  simpleMode: boolean;

  // Translation
  defaultEngine: 'mahdi-neural' | 'deepl-style' | 'offline-local';
  accuracyLevel: 'fast' | 'balanced' | 'ultra-accurate';
  defaultDomain: DomainCode;
  defaultTone: ToneCode;
  defaultDialect: DialectCode;
  preserveFormatting: boolean;
  translateNumbers: boolean;

  // Offline
  wifiOnlyDownload: boolean;
  autoUpdatePacks: boolean;
  storageLimitGB: number;
  autoClearUnusedPacks: boolean;
  localModelQuality: 'fast-int4' | 'balanced-int8' | 'fp16-precise';
  runOnNpuGpu: boolean;

  // Voice
  sttEngine: 'whisper-ondevice' | 'gemini-voice' | 'browser-web-speech';
  ttsVoiceGender: 'male' | 'female' | 'neural-ai';
  noiseCancellation: boolean;
  speakerDiarization: boolean;

  // Privacy & Security
  privateModeNoHistory: boolean;
  pinLockEnabled: boolean;
  pinCode?: string;
  autoClearHistoryDays: number;
  e2eEncryptedLocally: boolean;

  // Accessibility
  highContrast: boolean;
  screenReaderOptimized: boolean;
  keyboardShortcuts: boolean;

  // Instant / automatic translation tuning
  translateDelayMs: number;
  autoSpeakTarget: boolean;
  showTransliteration: boolean;
  historyLimit: number;
  autoSwapOnDetected: boolean;
}


