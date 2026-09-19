
import { Language, DomainOption, ToneOption, DialectOption, AppSettings } from './types.ts';

export const AUTO_DETECT_OPTION: Language = {
  code: 'auto',
  name: 'Detect Language',
  nativeName: '✨ كشف تلقائي عن اللغة',
  flag: '🌐',
};

export const LANGUAGES: Language[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, flag: '🇸🇦', hasOfflinePack: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', hasOfflinePack: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', hasOfflinePack: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', hasOfflinePack: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', hasOfflinePack: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', hasOfflinePack: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', hasOfflinePack: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', hasOfflinePack: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', hasOfflinePack: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', hasOfflinePack: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', hasOfflinePack: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', hasOfflinePack: false },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true, flag: '🇮🇷', hasOfflinePack: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, flag: '🇵🇰', hasOfflinePack: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', hasOfflinePack: false },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', hasOfflinePack: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', hasOfflinePack: false },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', hasOfflinePack: false },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', hasOfflinePack: false },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', hasOfflinePack: false },
];

export const DOMAINS: DomainOption[] = [
  { code: 'general', nameAr: 'عام ويومي', icon: 'Globe', desc: 'محادثات ونصوص عامة يومية' },
  { code: 'medical', nameAr: 'طبي وصحي', icon: 'Stethoscope', desc: 'مصطلحات طبية، تشخيصات، ووصفات دقيقة' },
  { code: 'legal', nameAr: 'قانوني وعقود', icon: 'Scale', desc: 'بنود قانونية، اتفاقيات، وتشريعات محكمة' },
  { code: 'tech', nameAr: 'تقني وبرمجي', icon: 'Code', desc: 'برمجة، ذكاء اصطناعي، وشروحات هندسية' },
  { code: 'literary', nameAr: 'أدبي وشعري', icon: 'BookOpen', desc: 'روايات، بلاغة، استعارات، ونصوص إبداعية' },
  { code: 'religious', nameAr: 'ديني وتراثي', icon: 'Sparkles', desc: 'نصوص دينية، أدعية، ومصطلحات فقهية' },
  { code: 'academic', nameAr: 'أكاديمي وبحثي', icon: 'GraduationCap', desc: 'أبحاث علمية، مراجع، ومصطلحات تخصصية' },
  { code: 'business', nameAr: 'تجاري ومالي', icon: 'Briefcase', desc: 'اقتصاد، شركات، فواتير، وأسواق مالية' },
  { code: 'marketing', nameAr: 'تسويقي وترويجي', icon: 'Megaphone', desc: 'إعلانات، صياغات جذابة، وشعارات مؤثرة' },
  { code: 'diplomatic', nameAr: 'سياسي ودبلوماسي', icon: 'Shield', desc: 'بيانات رسمية، علاقات دولية، وخطابات' },
  { code: 'travel', nameAr: 'سياحة وسفر', icon: 'Compass', desc: 'حجوزات، إرشادات، طعام، ومعالم سياحية' },
];

export const TONES: ToneOption[] = [
  { code: 'standard', nameAr: 'طبيعي معتدل', desc: 'توازن سلس بين البساطة والدقة' },
  { code: 'formal', nameAr: 'رسمي مهيب', desc: 'للمخاطبات الرسمية والدوائر الحكومية' },
  { code: 'casual', nameAr: 'ودي وعفوي', desc: 'للدردشة اليومية والأصدقاء' },
  { code: 'professional', nameAr: 'احترافي رفيع', desc: 'لبيئات الأعمال والشركات' },
  { code: 'humorous', nameAr: 'فكاهي وطريف', desc: 'نبرة مرحة مع تكييف النكات محلياً' },
  { code: 'poetic', nameAr: 'شعري وبليغ', desc: 'صياغة فنية راقية ذات جرس موسيقي' },
  { code: 'simplified', nameAr: 'مبسط وسهل', desc: 'نصوص واضحة وسريعة الفهم للمبتدئين' },
];

export const DIALECTS: DialectOption[] = [
  { code: 'standard', name: 'Standard / Classical', nameAr: 'فصحى قياسية', parentLang: 'ar' },
  { code: 'ar-iq', name: 'Iraqi Dialect', nameAr: 'اللهجة العراقية', parentLang: 'ar' },
  { code: 'ar-eg', name: 'Egyptian Dialect', nameAr: 'اللهجة المصرية', parentLang: 'ar' },
  { code: 'ar-sy', name: 'Levantine Dialect', nameAr: 'اللهجة الشامية (سوريا/لبنان)', parentLang: 'ar' },
  { code: 'ar-gulf', name: 'Gulf Dialect', nameAr: 'اللهجة الخليجية (سعودي/إماراتي/كويتي)', parentLang: 'ar' },
  { code: 'ar-ma', name: 'Moroccan Darija', nameAr: 'اللهجة المغربية (الدارجة)', parentLang: 'ar' },
  { code: 'ar-sd', name: 'Sudanese Dialect', nameAr: 'اللهجة السودانية', parentLang: 'ar' },
  { code: 'ar-ye', name: 'Yemeni Dialect', nameAr: 'اللهجة اليمنية', parentLang: 'ar' },
  { code: 'ar-tn', name: 'Tunisian Dialect', nameAr: 'اللهجة التونسية', parentLang: 'ar' },
  { code: 'ar-dz', name: 'Algerian Dialect', nameAr: 'اللهجة الجزائرية', parentLang: 'ar' },
  { code: 'en-us', name: 'American English', nameAr: 'الإنجليزية الأمريكية', parentLang: 'en' },
  { code: 'en-uk', name: 'British English', nameAr: 'الإنجليزية البريطانية', parentLang: 'en' },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appLanguage: 'ar',
  timeFormat: '12h',
  autoCopyOnTranslate: false,
  instantTranslateWhileTyping: true,
  simpleMode: false,

  defaultEngine: 'mahdi-neural',
  accuracyLevel: 'ultra-accurate',
  defaultDomain: 'general',
  defaultTone: 'standard',
  defaultDialect: 'standard',
  preserveFormatting: true,
  translateNumbers: true,

  wifiOnlyDownload: true,
  autoUpdatePacks: true,
  storageLimitGB: 32,
  autoClearUnusedPacks: false,
  localModelQuality: 'balanced-int8',
  runOnNpuGpu: true,

  sttEngine: 'whisper-ondevice',
  ttsVoiceGender: 'neural-ai',
  noiseCancellation: true,
  speakerDiarization: true,

  privateModeNoHistory: false,
  pinLockEnabled: false,
  pinCode: '',
  autoClearHistoryDays: 30,
  e2eEncryptedLocally: true,

  highContrast: false,
  screenReaderOptimized: false,
  keyboardShortcuts: true,
};


/**
 * Fast client-side language detector using character sets and patterns
 */
export function detectLanguageFromText(text: string): string {
  if (!text || !text.trim()) return 'en';
  const trimmed = text.trim();

  // Arabic characters range
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(trimmed)) {
    return 'ar';
  }
  // Japanese characters (Hiragana / Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed)) {
    return 'ja';
  }
  // Chinese Hanzi characters
  if (/[\u4E00-\u9FFF]/.test(trimmed)) {
    return 'zh';
  }
  // Russian / Cyrillic
  if (/[\u0400-\u04FF]/.test(trimmed)) {
    return 'ru';
  }
  // Turkish specific characters
  if (/[ğüşıöçĞÜŞİÖÇ]/.test(trimmed)) {
    return 'tr';
  }
  // German specific characters
  if (/[äöüßÄÖÜ]/.test(trimmed)) {
    return 'de';
  }
  // Spanish specific characters
  if (/[ñáéíóú¿¡]/.test(trimmed)) {
    return 'es';
  }
  // French specific characters
  if (/[éàèùâêîôûëïüÿçœæ]/.test(trimmed)) {
    return 'fr';
  }

  // Default to English for general Latin scripts
  return 'en';
}


export const THEME_CONFIGS = {
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    border: 'border-gray-200'
  },
  dark: {
    bg: 'bg-slate-950',
    card: 'bg-slate-900',
    text: 'text-slate-100',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'bg-slate-800 text-slate-300 hover:bg-slate-700',
    border: 'border-slate-800'
  },
  sky: {
    bg: 'bg-sky-50',
    card: 'bg-white',
    text: 'text-sky-900',
    primary: 'bg-sky-500 hover:bg-sky-600 text-white',
    secondary: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
    border: 'border-sky-200'
  },
  'mahdi-gold': {
    bg: 'bg-zinc-950',
    card: 'bg-zinc-900',
    text: 'text-amber-50',
    primary: 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold',
    secondary: 'bg-zinc-800 text-amber-400 hover:bg-zinc-700',
    border: 'border-amber-900/30'
  }
};

export const LANG_BCP47_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  tr: 'tr-TR',
  ru: 'ru-RU',
  it: 'it-IT',
};

