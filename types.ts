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
  cardOpacity: number;
  glassBlur: number;
  borderRadius: number;
  bgStyle: 'obsidian' | 'aurora' | 'emerald' | 'crystal' | 'royal-dark' | 'sunset';
  glowAnimation: boolean;
}

export interface ThemeConfig {
  id: string;
  name: string;
  nameAr: string;
  category: 'royal' | 'dark' | 'neon' | 'nature' | 'ocean' | 'sunset' | 'pastel' | 'minimal' | 'glass' | 'custom';
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
}

export type Theme = ThemeConfig;

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
}


