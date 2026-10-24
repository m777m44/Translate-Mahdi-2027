import { detectLanguageFromText } from './constants.ts';
import { MoreTranslation, WordDefinition } from './types.ts';
import {
  transliterateWord,
  beautifyArabic,
  targetUsesArabicScript,
  isArabicScript,
  isLatinScript,
  NAMES_EN_AR,
} from './transliterate.ts';

/**
 * Offline Translation Engine for Mahdi Translate Pro
 * Provides full local client-side translation without requiring an internet connection.
 */

export interface OfflineTranslateResult {
  translation: string;
  transliteration?: string;
  detectedLanguageName?: string;
  moreTranslations?: MoreTranslation[];
  definitions?: WordDefinition[];
  confidence?: 'exact' | 'partial' | 'fallback';
  engineNotice?: string;
}

// Common Multi-language phrasebook & vocabulary database
export interface DictionaryEntry {
  en: string;
  ar: string;
  fr?: string;
  es?: string;
  de?: string;
  tr?: string;
  ru?: string;
  it?: string;
  zh?: string;
  ja?: string;
  /** Optional dialect-specific renderings of the target value (e.g. ar-iq, ar-eg). */
  dialects?: Record<string, string>;
}

export const OFFLINE_DICTIONARY: DictionaryEntry[] = [
  // Greetings & Courtesies
  { en: 'hello', ar: 'مرحباً', fr: 'bonjour', es: 'hola', de: 'hallo', tr: 'merhaba', ru: 'здравствуйте', it: 'ciao', zh: '你好', ja: 'こんにちは' },
  { en: 'hi', ar: 'أهلاً', fr: 'salut', es: 'hola', de: 'hallo', tr: 'selam', ru: 'привет', it: 'ciao', zh: '嗨', ja: 'やあ' },
  { en: 'welcome', ar: 'أهلاً وسهلاً', fr: 'bienvenue', es: 'bienvenido', de: 'willkommen', tr: 'hoşgeldiniz', ru: 'добро пожаловать', it: 'benvenuto', zh: '欢迎', ja: 'ようこそ' },
  { en: 'good morning', ar: 'صباح الخير', fr: 'bonjour', es: 'buenos días', de: 'guten morgen', tr: 'günaydın', ru: 'доброе утро', it: 'buongiorno', zh: '早上好', ja: 'おはようございます' },
  { en: 'good evening', ar: 'مساء الخير', fr: 'bonsoir', es: 'buenas tardes', de: 'guten abend', tr: 'iyi akşamlar', ru: 'добрый вечер', it: 'buonasera', zh: '晚上好', ja: 'こんばんは' },
  { en: 'good night', ar: 'تصبح على خير', fr: 'bonne nuit', es: 'buenas noches', de: 'gute nacht', tr: 'iyi geceler', ru: 'спокойной ночи', it: 'buonanotte', zh: '晚安', ja: 'おやすみなさい' },
  { en: 'goodbye', ar: 'مع السلامة', fr: 'au revoir', es: 'adiós', de: 'auf wiedersehen', tr: 'hoşça kal', ru: 'до свидания', it: 'arrivederci', zh: '再见', ja: 'さようなら' },
  { en: 'bye', ar: 'إلى اللقاء', fr: 'salut', es: 'chao', de: 'tschüss', tr: 'güle güle', ru: 'пока', it: 'ciao', zh: '拜拜', ja: 'バイバイ' },
  { en: 'thank you', ar: 'شكراً لك', fr: 'merci', es: 'gracias', de: 'danke', tr: 'teşekkür ederim', ru: 'спасибо', it: 'grazie', zh: '谢谢你', ja: 'ありがとう' },
  { en: 'thanks', ar: 'شكراً', fr: 'merci', es: 'gracias', de: 'danke', tr: 'sağol', ru: 'спасибо', it: 'grazie', zh: '谢谢', ja: 'どうも' },
  { en: 'thank you very much', ar: 'شكراً جزيلاً', fr: 'merci beaucoup', es: 'muchas gracias', de: 'vielen dank', tr: 'çok teşekkürler', ru: 'большое спасибо', it: 'grazie mille', zh: '非常感谢', ja: 'どうもありがとうございます' },
  { en: 'you are welcome', ar: 'عفواً', fr: 'de rien', es: 'de nada', de: 'bitte', tr: 'rica ederim', ru: 'пожалуйста', it: 'prego', zh: '不客气', ja: 'どういたしまして' },
  { en: 'please', ar: 'من فضلك', fr: 's\'il vous plaît', es: 'por favor', de: 'bitte', tr: 'lütfen', ru: 'пожалуйста', it: 'per favore', zh: '请', ja: 'お願いします' },
  { en: 'excuse me', ar: 'عذراً', fr: 'excusez-moi', es: 'disculpe', de: 'entschuldigung', tr: 'affedersiniz', ru: 'извините', it: 'scusi', zh: '打扰一下', ja: 'すみません' },
  { en: 'sorry', ar: 'أنا آسف', fr: 'désolé', es: 'lo siento', de: 'es tut mir leid', tr: 'özür dilerim', ru: 'простите', it: 'mi dispiace', zh: '对不起', ja: 'ごめんなさい' },
  { en: 'no problem', ar: 'لا مشكلة', fr: 'pas de problème', es: 'no hay problema', de: 'kein problem', tr: 'sorun değil', ru: 'без проблем', it: 'nessun problema', zh: '没问题', ja: '問題ありません' },

  // Questions & Conversation
  { en: 'how are you', ar: 'كيف حالك', fr: 'comment allez-vous', es: 'cómo estás', de: 'wie geht es dir', tr: 'nasılsın', ru: 'как дела', it: 'come stai', zh: '你好吗', ja: 'お元気ですか' },
  { en: 'i am fine', ar: 'أنا بخير', fr: 'je vais bien', es: 'estoy bien', de: 'mir geht es gut', tr: 'iyiyim', ru: 'я в порядке', it: 'sto bene', zh: '我很好', ja: '元気です' },
  { en: 'what is your name', ar: 'ما اسمك', fr: 'comment vous appelez-vous', es: 'cómo te llamas', de: 'wie heißt du', tr: 'adın ne', ru: 'как вас зовут', it: 'come ti chiami', zh: '你叫什么名字', ja: 'お名前は何ですか' },
  { en: 'my name is', ar: 'اسمي هو', fr: 'je m\'appelle', es: 'me llamo', de: 'mein name ist', tr: 'benim adım', ru: 'меня зовут', it: 'mi chiamo', zh: '我的名字是', ja: '私の名前は' },
  { en: 'nice to meet you', ar: 'تشرفت بمعرفتك', fr: 'enchanté', es: 'mucho gusto', de: 'schön sie kennenzulernen', tr: 'tanıştığıma memnun oldum', ru: 'приятно познакомиться', it: 'piacere di conoscerti', zh: '很高兴认识你', ja: 'はじめまして' },
  { en: 'where are you from', ar: 'من أين أنت', fr: 'd\'où venez-vous', es: 'de dónde eres', de: 'woher kommst du', tr: 'nerelisin', ru: 'откуда вы', it: 'di dove sei', zh: '你来自哪里', ja: 'どこから来ましたか' },
  { en: 'yes', ar: 'نعم', fr: 'oui', es: 'sí', de: 'ja', tr: 'evet', ru: 'да', it: 'sì', zh: '是', ja: 'はい' },
  { en: 'no', ar: 'لا', fr: 'non', es: 'no', de: 'nein', tr: 'hayır', ru: 'нет', it: 'no', zh: '不', ja: 'いいえ' },
  { en: 'maybe', ar: 'ربما', fr: 'peut-être', es: 'tal vez', de: 'vielleicht', tr: 'belki', ru: 'может быть', it: 'forse', zh: '也许', ja: '多分' },
  { en: 'i understand', ar: 'أنا أفهم', fr: 'je comprends', es: 'entiendo', de: 'ich verstehe', tr: 'anlıyorum', ru: 'я понимаю', it: 'capisco', zh: '我明白', ja: '分かります' },
  { en: 'i do not understand', ar: 'أنا لا أفهم', fr: 'je ne comprends pas', es: 'no entiendo', de: 'ich verstehe nicht', tr: 'anlamıyorum', ru: 'я не понимаю', it: 'non capisco', zh: '我不明白', ja: '分かりません' },
  { en: 'do you speak english', ar: 'هل تتحدث الإنجليزية', fr: 'parlez-vous anglais', es: 'hablas inglés', de: 'sprechen sie englisch', tr: 'ingilizce biliyor musun', ru: 'вы говорите по-английски', it: 'parli inglese', zh: '你会说英语吗', ja: '英語を話せますか' },
  { en: 'do you speak arabic', ar: 'هل تتحدث العربية', fr: 'parlez-vous arabe', es: 'hablas árabe', de: 'sprechen sie arabisch', tr: 'arapça biliyor musun', ru: 'вы говорите по-арабски', it: 'parli arabo', zh: '你会说阿拉伯语吗', ja: 'アラビア語を話せますか' },
  { en: 'help', ar: 'مساعدة', fr: 'aide', es: 'ayuda', de: 'hilfe', tr: 'yardım', ru: 'помощь', it: 'aiuto', zh: '帮助', ja: '助けて' },
  { en: 'can you help me', ar: 'هل يمكنك مساعدتي', fr: 'pouvez-vous m\'aider', es: 'puedes ayudarme', de: 'kannst du mir helfen', tr: 'bana yardım edebilir misin', ru: 'можете мне помочь', it: 'puoi aiutarmi', zh: '你能帮我吗', ja: '手伝ってくれますか' },

  // Directions & Travel
  { en: 'where is', ar: 'أين يوجد', fr: 'où est', es: 'dónde está', de: 'wo ist', tr: 'nerede', ru: 'где находится', it: 'dov\'è', zh: '在哪里', ja: 'どこですか' },
  { en: 'where is the bathroom', ar: 'أين الحمام', fr: 'où sont les toilettes', es: 'dónde está el baño', de: 'wo ist die toilette', tr: 'tuvalet nerede', ru: 'где туалет', it: 'dov\'è il bagno', zh: '洗手间在哪里', ja: 'トイレはどこですか' },
  { en: 'airport', ar: 'مطار', fr: 'aéroport', es: 'aeropuerto', de: 'flughafen', tr: 'havalimanı', ru: 'аэропорт', it: 'aeroporto', zh: '机场', ja: '空港' },
  { en: 'hotel', ar: 'فندق', fr: 'hôtel', es: 'hotel', de: 'hotel', tr: 'otel', ru: 'отель', it: 'hotel', zh: '酒店', ja: 'ホテル' },
  { en: 'restaurant', ar: 'مطعم', fr: 'restaurant', es: 'restaurante', de: 'restaurant', tr: 'restoran', ru: 'ресторан', it: 'ristorante', zh: '餐厅', ja: 'レストラン' },
  { en: 'hospital', ar: 'مستشفى', fr: 'hôpital', es: 'hospital', de: 'krankenhaus', tr: 'hastane', ru: 'больница', it: 'ospedale', zh: '医院', ja: '病院' },
  { en: 'train station', ar: 'محطة القطار', fr: 'gare', es: 'estación de tren', de: 'bahnhof', tr: 'tren istasyonu', ru: 'вокзал', it: 'stazione ferroviaria', zh: '火车站', ja: '駅' },
  { en: 'how much is this', ar: 'كم سعر هذا', fr: 'combien ça coûte', es: 'cuánto cuesta esto', de: 'wie viel kostet das', tr: 'bu ne kadar', ru: 'сколько это стоит', it: 'quanto costa questo', zh: '这个多少钱', ja: 'いくらですか' },
  { en: 'water', ar: 'ماء', fr: 'eau', es: 'agua', de: 'wasser', tr: 'su', ru: 'вода', it: 'acqua', zh: '水', ja: '水' },
  { en: 'food', ar: 'طعام', fr: 'nourriture', es: 'comida', de: 'essen', tr: 'yemek', ru: 'еда', it: 'cibo', zh: '食物', ja: '食べ物' },
  { en: 'coffee', ar: 'قهوة', fr: 'café', es: 'café', de: 'kaffee', tr: 'kahve', ru: 'кофе', it: 'caffè', zh: '咖啡', ja: 'コーヒー' },
  { en: 'tea', ar: 'شاي', fr: 'thé', es: 'té', de: 'tee', tr: 'çay', ru: 'чай', it: 'tè', zh: '茶', ja: 'お茶' },
  { en: 'bill', ar: 'الفاتورة', fr: 'l\'addition', es: 'la cuenta', de: 'die rechnung', tr: 'hesap', ru: 'счет', it: 'il conto', zh: '账单', ja: 'お会計' },

  // Technology & General
  { en: 'computer', ar: 'حاسوب', fr: 'ordinateur', es: 'computadora', de: 'computer', tr: 'bilgisayar', ru: 'компьютер', it: 'computer', zh: '电脑', ja: 'コンピューター' },
  { en: 'phone', ar: 'هاتف', fr: 'téléphone', es: 'teléfono', de: 'telefon', tr: 'telefon', ru: 'телефон', it: 'telefono', zh: '手机', ja: '電話' },
  { en: 'internet', ar: 'إنترنت', fr: 'internet', es: 'internet', de: 'internet', tr: 'internet', ru: 'интернет', it: 'internet', zh: '互联网', ja: 'インターネット' },
  { en: 'application', ar: 'تطبيق', fr: 'application', es: 'aplicación', de: 'anwendung', tr: 'uygulama', ru: 'приложение', it: 'applicazione', zh: '应用', ja: 'アプリ' },
  { en: 'translation', ar: 'ترجمة', fr: 'traduction', es: 'traducción', de: 'übersetzung', tr: 'çeviri', ru: 'перевод', it: 'traduzione', zh: '翻译', ja: '翻訳' },
  { en: 'camera', ar: 'كاميرا', fr: 'caméra', es: 'cámara', de: 'kamera', tr: 'kamera', ru: 'камера', it: 'fotocamera', zh: '相机', ja: 'カメラ' },
  { en: 'voice', ar: 'صوت', fr: 'voix', es: 'voz', de: 'stimme', tr: 'ses', ru: 'голос', it: 'voce', zh: '声音', ja: '声' },
  { en: 'speech', ar: 'كلام', fr: 'parole', es: 'discurso', de: 'sprache', tr: 'konuşma', ru: 'речь', it: 'discorso', zh: '演讲', ja: 'スピーチ' },
  { en: 'offline', ar: 'بدون إنترنت', fr: 'hors ligne', es: 'desconectado', de: 'offline', tr: 'çevrimdışı', ru: 'офлайн', it: 'non in linea', zh: '离线', ja: 'オフライン' },
  { en: 'online', ar: 'متصل بالإنترنت', fr: 'en ligne', es: 'en línea', de: 'online', tr: 'çevrimiçi', ru: 'онлайн', it: 'online', zh: '在线', ja: 'オンライン' },
  { en: 'history', ar: 'السجل', fr: 'historique', es: 'historial', de: 'verlauf', tr: 'geçmiş', ru: 'история', it: 'cronologia', zh: '历史', ja: '履歴' },
  { en: 'settings', ar: 'الإعدادات', fr: 'paramètres', es: 'configuración', de: 'einstellungen', tr: 'ayarlar', ru: 'настройки', it: 'impostazioni', zh: '设置', ja: '設定' },
  { en: 'theme', ar: 'المظهر', fr: 'thème', es: 'tema', de: 'design', tr: 'tema', ru: 'тема', it: 'tema', zh: '主题', ja: 'テーマ' },

  // Numbers
  { en: 'one', ar: 'واحد', fr: 'un', es: 'uno', de: 'eins', tr: 'bir', ru: 'один', it: 'uno', zh: '一', ja: '一' },
  { en: 'two', ar: 'اثنان', fr: 'deux', es: 'dos', de: 'zwei', tr: 'iki', ru: 'два', it: 'due', zh: '二', ja: '二' },
  { en: 'three', ar: 'ثلاثة', fr: 'trois', es: 'tres', de: 'drei', tr: 'üç', ru: 'три', it: 'tre', zh: '三', ja: '三' },
  { en: 'four', ar: 'أربعة', fr: 'quatre', es: 'cuatro', de: 'vier', tr: 'dört', ru: 'четыре', it: 'quattro', zh: '四', ja: '四' },
  { en: 'five', ar: 'خمسة', fr: 'cinq', es: 'cinco', de: 'fünf', tr: 'beş', ru: 'пять', it: 'cinque', zh: '五', ja: '五' },
  { en: 'six', ar: 'ستة', fr: 'six', es: 'seis', de: 'sechs', tr: 'altı', ru: 'шесть', it: 'sei', zh: '六', ja: '六' },
  { en: 'seven', ar: 'سبعة', fr: 'sept', es: 'siete', de: 'sieben', tr: 'yedi', ru: 'семь', it: 'sette', zh: '七', ja: '七' },
  { en: 'eight', ar: 'ثمانية', fr: 'huit', es: 'ocho', de: 'acht', tr: 'sekiz', ru: 'восемь', it: 'otto', zh: '八', ja: '八' },
  { en: 'nine', ar: 'تسعة', fr: 'neuf', es: 'nueve', de: 'neun', tr: 'dokuz', ru: 'девять', it: 'nove', zh: '九', ja: '九' },
  { en: 'ten', ar: 'عشرة', fr: 'dix', es: 'diez', de: 'zehn', tr: 'on', ru: 'десять', it: 'dieci', zh: '十', ja: '十' },
  { en: 'hundred', ar: 'مئة', fr: 'cent', es: 'cien', de: 'hundert', tr: 'yüz', ru: 'сто', it: 'cento', zh: '百', ja: '百' },
  { en: 'thousand', ar: 'ألف', fr: 'mille', es: 'mil', de: 'tausend', tr: 'bin', ru: 'тысяча', it: 'mille', zh: '千', ja: '千' },

  // Dialect dictionary & slang — one entry per meaning, dialect variants kept
  // separate so standard Arabic never leaks a dialect word by accident.
  { en: 'how are you', ar: 'كيف حالك', fr: 'comment ça va', dialects: { 'ar-iq': 'شلونك', 'ar-gulf': 'شلونك', 'ar-eg': 'ازيك', 'ar-sy': 'كيفك', 'ar-ma': 'كيداير' } },
  { en: 'what do you want', ar: 'ماذا تريد', fr: 'que veux-tu', dialects: { 'ar-iq': 'شنو تريد', 'ar-eg': 'عايز ايه', 'ar-sy': 'شو بدك', 'ar-gulf': 'وش تبي' } },
  { en: 'i want', ar: 'أريد', fr: 'je veux', dialects: { 'ar-eg': 'عايز', 'ar-sy': 'بدي', 'ar-ma': 'بغيت', 'ar-iq': 'أريد', 'ar-gulf': 'أبغى' } },
  { en: 'very much', ar: 'كثيراً', fr: 'beaucoup', dialects: { 'ar-gulf': 'وايد', 'ar-eg': 'أوي', 'ar-sy': 'كتير', 'ar-ma': 'بزاف', 'ar-iq': 'حيل' } },
  { en: 'now', ar: 'الآن', fr: 'maintenant', dialects: { 'ar-iq': 'هسة', 'ar-eg': 'دلوقتي', 'ar-gulf': 'الحين', 'ar-ma': 'دابا', 'ar-sy': 'هلّق' } },
  { en: 'good', ar: 'جيد', fr: 'bon', dialects: { 'ar-iq': 'زين', 'ar-eg': 'كويس', 'ar-sy': 'منيح', 'ar-ma': 'زوين' } },
  { en: 'what is this', ar: 'ما هذا', fr: 'qu\'est-ce que c\'est', dialects: { 'ar-iq': 'شنو هذا', 'ar-eg': 'ايه ده', 'ar-sy': 'شو هادا' } },
  { en: 'there is nothing', ar: 'لا يوجد شيء', fr: 'il n\'y a rien', dialects: { 'ar-iq': 'ماكو شي', 'ar-eg': 'مفيش حاجة', 'ar-sy': 'ما في شي' } },
  { en: 'where are you', ar: 'أين أنت', fr: 'où es-tu', dialects: { 'ar-iq': 'وينك', 'ar-eg': 'انت فين', 'ar-sy': 'وينك' } },
  { en: 'i love you', ar: 'أحبك', fr: 'je t\'aime', dialects: { 'ar-iq': 'أحبك', 'ar-eg': 'بحبك', 'ar-sy': 'بحبك', 'ar-ma': 'كنبغيك' } },
  { en: 'see you later', ar: 'أراك لاحقاً', fr: 'à plus tard', dialects: { 'ar-iq': 'أشوفك بعدين', 'ar-eg': 'أشوفك بعدين' } },
  { en: 'no problem', ar: 'لا مشكلة', fr: 'pas de problème', dialects: { 'ar-iq': 'ماكو مشكلة', 'ar-eg': 'مفيش مشكلة' } },

  // Specialized Domains (Medical, Legal, Technical, Religious)
  { en: 'artificial intelligence', ar: 'ذكاء اصطناعي', fr: 'intelligence artificielle', es: 'inteligencia artificial', de: 'künstliche intelligenz' },
  { en: 'machine learning', ar: 'تعلم الآلة', fr: 'apprentissage automatique', es: 'aprendizaje automático' },
  { en: 'neural network', ar: 'شبكة عصبية', fr: 'réseau de neurones' },
  { en: 'database', ar: 'قاعدة بيانات', fr: 'base de données', es: 'base de datos' },
  { en: 'encryption', ar: 'تشفير', fr: 'chiffrement', es: 'cifrado' },
  { en: 'blood pressure', ar: 'ضغط الدم', fr: 'tension artérielle', es: 'presión arterial' },
  { en: 'heart rate', ar: 'معدل ضربات القلب', fr: 'rythme cardiaque' },
  { en: 'prescription', ar: 'وصفة طبية', fr: 'ordonnance', es: 'receta médica' },
  { en: 'symptoms', ar: 'أعراض', fr: 'symptômes', es: 'síntomas' },
  { en: 'agreement', ar: 'اتفاقية', fr: 'accord', es: 'acuerdo' },
  { en: 'contract', ar: 'عقد', fr: 'contrat', es: 'contrato' },
  { en: 'clause', ar: 'بند قانوني', fr: 'clause', es: 'cláusula' },
  { en: 'terms and conditions', ar: 'الشروط والأحكام', fr: 'termes et conditions', es: 'términos y condiciones' },
  { en: 'peace be upon you', ar: 'السلام عليكم ورحمة الله وبركاته', fr: 'que la paix soit sur vous' },
  { en: 'praise be to god', ar: 'الحمد لله', fr: 'louange à dieu' },
  { en: 'in the name of god', ar: 'بسم الله الرحمن الرحيم', fr: 'au nom de dieu' },
  { en: 'blessings', ar: 'بركات', fr: 'bénédictions' },
  { en: 'god willing', ar: 'إن شاء الله', fr: 'si dieu le veut' },

  // ---- High-frequency vocabulary (makes everyday sentences complete) ----
  { en: 'today', ar: 'اليوم', fr: "aujourd'hui", es: 'hoy', de: 'heute', tr: 'bugün' },
  { en: 'tomorrow', ar: 'غداً', fr: 'demain', es: 'mañana', de: 'morgen', tr: 'yarın' },
  { en: 'yesterday', ar: 'أمس', fr: 'hier', es: 'ayer', de: 'gestern', tr: 'dün' },
  { en: 'now', ar: 'الآن', fr: 'maintenant', es: 'ahora' },
  { en: 'later', ar: 'لاحقاً', fr: 'plus tard', es: 'más tarde' },
  { en: 'morning', ar: 'صباح', fr: 'matin', es: 'mañana' },
  { en: 'night', ar: 'ليل', fr: 'nuit', es: 'noche' },
  { en: 'evening', ar: 'مساء', fr: 'soir', es: 'tarde' },
  { en: 'please', ar: 'من فضلك', fr: "s'il vous plaît", es: 'por favor', de: 'bitte' },
  { en: 'yes', ar: 'نعم', fr: 'oui', es: 'sí', de: 'ja', tr: 'evet' },
  { en: 'no', ar: 'لا', fr: 'non', es: 'no', de: 'nein', tr: 'hayır' },
  { en: 'maybe', ar: 'ربما', fr: 'peut-être', es: 'quizás' },
  { en: 'i', ar: 'أنا', fr: 'je', es: 'yo' },
  { en: 'you', ar: 'أنت', fr: 'tu', es: 'tú' },
  { en: 'he', ar: 'هو', fr: 'il', es: 'él' },
  { en: 'she', ar: 'هي', fr: 'elle', es: 'ella' },
  { en: 'we', ar: 'نحن', fr: 'nous', es: 'nosotros' },
  { en: 'they', ar: 'هم', fr: 'ils', es: 'ellos' },
  { en: 'my', ar: 'لي', fr: 'mon', es: 'mi' },
  { en: 'your', ar: 'لك', fr: 'ton', es: 'tu' },
  { en: 'friend', ar: 'صديق', fr: 'ami', es: 'amigo' },
  { en: 'my friend', ar: 'صديقي', fr: 'mon ami', es: 'mi amigo' },
  { en: 'is', ar: 'يكون', fr: 'est', es: 'es' },
  { en: 'are', ar: 'تكون', fr: 'sont', es: 'son' },
  { en: 'am', ar: 'أكون', fr: 'suis', es: 'soy' },
  { en: 'was', ar: 'كان', fr: 'était', es: 'era' },
  { en: 'have', ar: 'أملك', fr: 'avoir', es: 'tener' },
  { en: 'has', ar: 'يملك', fr: 'a', es: 'tiene' },
  { en: 'do', ar: 'يفعل', fr: 'faire', es: 'hacer' },
  { en: 'go', ar: 'يذهب', fr: 'aller', es: 'ir' },
  { en: 'come', ar: 'يأتي', fr: 'venir', es: 'venir' },
  { en: 'eat', ar: 'يأكل', fr: 'manger', es: 'comer' },
  { en: 'drink', ar: 'يشرب', fr: 'boire', es: 'beber' },
  { en: 'sleep', ar: 'ينام', fr: 'dormir', es: 'dormir' },
  { en: 'see', ar: 'يرى', fr: 'voir', es: 'ver' },
  { en: 'know', ar: 'يعرف', fr: 'savoir', es: 'saber' },
  { en: 'want', ar: 'يريد', fr: 'vouloir', es: 'querer' },
  { en: 'need', ar: 'يحتاج', fr: 'avoir besoin', es: 'necesitar' },
  { en: 'like', ar: 'يحب', fr: 'aimer', es: 'gustar' },
  { en: 'love', ar: 'حب', fr: 'amour', es: 'amor' },
  { en: 'good', ar: 'جيد', fr: 'bon', es: 'bueno' },
  { en: 'bad', ar: 'سيئ', fr: 'mauvais', es: 'malo' },
  { en: 'big', ar: 'كبير', fr: 'grand', es: 'grande' },
  { en: 'small', ar: 'صغير', fr: 'petit', es: 'pequeño' },
  { en: 'beautiful', ar: 'جميل', fr: 'beau', es: 'hermoso' },
  { en: 'happy', ar: 'سعيد', fr: 'heureux', es: 'feliz' },
  { en: 'sad', ar: 'حزين', fr: 'triste', es: 'triste' },
  { en: 'hot', ar: 'حار', fr: 'chaud', es: 'caliente' },
  { en: 'cold', ar: 'بارد', fr: 'froid', es: 'frío' },
  { en: 'water', ar: 'ماء', fr: 'eau', es: 'agua', de: 'wasser', tr: 'su' },
  { en: 'food', ar: 'طعام', fr: 'nourriture', es: 'comida' },
  { en: 'bread', ar: 'خبز', fr: 'pain', es: 'pan' },
  { en: 'tea', ar: 'شاي', fr: 'thé', es: 'té' },
  { en: 'coffee', ar: 'قهوة', fr: 'café', es: 'café' },
  { en: 'house', ar: 'منزل', fr: 'maison', es: 'casa' },
  { en: 'home', ar: 'بيت', fr: 'maison', es: 'hogar' },
  { en: 'hotel', ar: 'فندق', fr: 'hôtel', es: 'hotel' },
  { en: 'airport', ar: 'مطار', fr: 'aéroport', es: 'aeropuerto' },
  { en: 'car', ar: 'سيارة', fr: 'voiture', es: 'coche' },
  { en: 'taxi', ar: 'سيارة أجرة', fr: 'taxi', es: 'taxi' },
  { en: 'street', ar: 'شارع', fr: 'rue', es: 'calle' },
  { en: 'city', ar: 'مدينة', fr: 'ville', es: 'ciudad' },
  { en: 'country', ar: 'بلد', fr: 'pays', es: 'país' },
  { en: 'money', ar: 'مال', fr: 'argent', es: 'dinero' },
  { en: 'price', ar: 'سعر', fr: 'prix', es: 'precio' },
  { en: 'cost', ar: 'تكلفة', fr: 'coût', es: 'costo' },
  { en: 'time', ar: 'وقت', fr: 'temps', es: 'tiempo' },
  { en: 'day', ar: 'يوم', fr: 'jour', es: 'día' },
  { en: 'name', ar: 'اسم', fr: 'nom', es: 'nombre' },
  { en: 'my name is', ar: 'اسمي', fr: 'je m\'appelle', es: 'me llamo' },
  { en: 'what is your name', ar: 'ما اسمك', fr: 'comment tu t\'appelles', es: 'cómo te llamas' },
  { en: 'how much', ar: 'كم', fr: 'combien', es: 'cuánto' },
  { en: 'where', ar: 'أين', fr: 'où', es: 'dónde' },
  { en: 'when', ar: 'متى', fr: 'quand', es: 'cuándo' },
  { en: 'why', ar: 'لماذا', fr: 'pourquoi', es: 'por qué' },
  { en: 'who', ar: 'من', fr: 'qui', es: 'quién' },
  { en: 'what', ar: 'ماذا', fr: 'quoi', es: 'qué' },
  { en: 'help', ar: 'مساعدة', fr: 'aide', es: 'ayuda' },
  { en: 'help me', ar: 'ساعدني', fr: 'aidez-moi', es: 'ayúdame' },
  { en: 'stop', ar: 'توقف', fr: 'arrête', es: 'para' },
  { en: 'wait', ar: 'انتظر', fr: 'attends', es: 'espera' },
  { en: 'quickly', ar: 'بسرعة', fr: 'vite', es: 'rápido' },
  { en: 'slowly', ar: 'ببطء', fr: 'lentement', es: 'despacio' },
  { en: 'open', ar: 'افتح', fr: 'ouvre', es: 'abre' },
  { en: 'close', ar: 'أغلق', fr: 'ferme', es: 'cierra' },
  { en: 'left', ar: 'يسار', fr: 'gauche', es: 'izquierda' },
  { en: 'right', ar: 'يمين', fr: 'droite', es: 'derecha' },
  { en: 'straight', ar: 'مباشرة', fr: 'tout droit', es: 'recto' },
  { en: 'near', ar: 'قريب', fr: 'près', es: 'cerca' },
  { en: 'far', ar: 'بعيد', fr: 'loin', es: 'lejos' },
  { en: 'doctor', ar: 'طبيب', fr: 'médecin', es: 'médico' },
  { en: 'hospital', ar: 'مستشفى', fr: 'hôpital', es: 'hospital' },
  { en: 'pharmacy', ar: 'صيدلية', fr: 'pharmacie', es: 'farmacia' },
  { en: 'school', ar: 'مدرسة', fr: 'école', es: 'escuela' },
  { en: 'work', ar: 'عمل', fr: 'travail', es: 'trabajo' },
  { en: 'family', ar: 'عائلة', fr: 'famille', es: 'familia' },
  { en: 'mother', ar: 'أم', fr: 'mère', es: 'madre' },
  { en: 'father', ar: 'أب', fr: 'père', es: 'padre' },
  { en: 'brother', ar: 'أخ', fr: 'frère', es: 'hermano' },
  { en: 'sister', ar: 'أخت', fr: 'sœur', es: 'hermana' },
  { en: 'son', ar: 'ابن', fr: 'fils', es: 'hijo' },
  { en: 'daughter', ar: 'ابنة', fr: 'fille', es: 'hija' },
  { en: 'the hotel', ar: 'الفندق', fr: "l'hôtel", es: 'el hotel' },
  { en: 'mahdi', ar: 'مهدي', fr: 'mahdi', es: 'mahdi' },
  { en: 'cars', ar: 'سيارات', fr: 'voitures', es: 'coches' },
  { en: 'i have', ar: 'لدي', fr: "j'ai", es: 'tengo' },
  { en: 'a lot', ar: 'كثيراً', fr: 'beaucoup', es: 'mucho' },
  { en: 'thank you my friend', ar: 'شكراً يا صديقي', fr: 'merci mon ami', es: 'gracias mi amigo' },
  { en: 'see you', ar: 'أراك', fr: 'à bientôt', es: 'hasta luego' },
  { en: 'good night', ar: 'تصبح على خير', fr: 'bonne nuit', es: 'buenas noches' },
  { en: 'excuse me', ar: 'اعذرني', fr: 'excusez-moi', es: 'discúlpame' },
  { en: 'i am', ar: 'أنا', fr: 'je suis', es: 'soy' },
  { en: 'you are', ar: 'أنت', fr: 'tu es', es: 'eres' },

  // ---- v4.1 high-frequency vocabulary (complete everyday coverage) ----
  { en: 'man', ar: 'رجل', fr: 'homme', es: 'hombre', de: 'mann', tr: 'adam' },
  { en: 'woman', ar: 'امرأة', fr: 'femme', es: 'mujer', de: 'frau', tr: 'kadın' },
  { en: 'boy', ar: 'ولد', fr: 'garçon', es: 'niño', de: 'junge', tr: 'oğlan' },
  { en: 'girl', ar: 'فتاة', fr: 'fille', es: 'chica', de: 'mädchen', tr: 'kız' },
  { en: 'child', ar: 'طفل', fr: 'enfant', es: 'niño', de: 'kind', tr: 'çocuk' },
  { en: 'children', ar: 'أطفال', fr: 'enfants', es: 'niños', tr: 'çocuklar' },
  { en: 'people', ar: 'ناس', fr: 'gens', es: 'gente', de: 'leute', tr: 'insanlar' },
  { en: 'person', ar: 'شخص', fr: 'personne', es: 'persona', de: 'person', tr: 'kişi' },
  { en: 'friend', ar: 'صديق', fr: 'ami', es: 'amigo', de: 'freund', tr: 'arkadaş' },
  { en: 'book', ar: 'كتاب', fr: 'livre', es: 'libro', de: 'buch', tr: 'kitap' },
  { en: 'pen', ar: 'قلم', fr: 'stylo', es: 'bolígrafo', de: 'stift', tr: 'kalem' },
  { en: 'sun', ar: 'شمس', fr: 'soleil', es: 'sol', de: 'sonne', tr: 'güneş' },
  { en: 'moon', ar: 'قمر', fr: 'lune', es: 'luna', de: 'mond', tr: 'ay' },
  { en: 'star', ar: 'نجمة', fr: 'étoile', es: 'estrella', de: 'stern', tr: 'yıldız' },
  { en: 'sky', ar: 'سماء', fr: 'ciel', es: 'cielo', de: 'himmel', tr: 'gökyüzü' },
  { en: 'rain', ar: 'مطر', fr: 'pluie', es: 'lluvia', de: 'regen', tr: 'yağmur' },
  { en: 'wind', ar: 'رياح', fr: 'vent', es: 'viento', de: 'wind', tr: 'rüzgar' },
  { en: 'fire', ar: 'نار', fr: 'feu', es: 'fuego', de: 'feuer', tr: 'ateş' },
  { en: 'sea', ar: 'بحر', fr: 'mer', es: 'mar', de: 'meer', tr: 'deniz' },
  { en: 'river', ar: 'نهر', fr: 'rivière', es: 'río', de: 'fluss', tr: 'nehir' },
  { en: 'mountain', ar: 'جبل', fr: 'montagne', es: 'montaña', de: 'berg', tr: 'dağ' },
  { en: 'road', ar: 'طريق', fr: 'route', es: 'camino', de: 'straße', tr: 'yol' },
  { en: 'door', ar: 'باب', fr: 'porte', es: 'puerta', de: 'tür', tr: 'kapı' },
  { en: 'window', ar: 'نافذة', fr: 'fenêtre', es: 'ventana', de: 'fenster', tr: 'pencere' },
  { en: 'table', ar: 'طاولة', fr: 'table', es: 'mesa', de: 'tisch', tr: 'masa' },
  { en: 'chair', ar: 'كرسي', fr: 'chaise', es: 'silla', de: 'stuhl', tr: 'sandalye' },
  { en: 'room', ar: 'غرفة', fr: 'chambre', es: 'habitación', de: 'zimmer', tr: 'oda' },
  { en: 'school', ar: 'مدرسة', fr: 'école', es: 'escuela', de: 'schule', tr: 'okul' },
  { en: 'university', ar: 'جامعة', fr: 'université', es: 'universidad', de: 'universität', tr: 'üniversite' },
  { en: 'student', ar: 'طالب', fr: 'étudiant', es: 'estudiante', de: 'student', tr: 'öğrenci' },
  { en: 'teacher', ar: 'مدرس', fr: 'enseignant', es: 'profesor', de: 'lehrer', tr: 'öğretmen' },
  { en: 'nurse', ar: 'ممرضة', fr: 'infirmière', es: 'enfermera', de: 'krankenschwester', tr: 'hemşire' },
  { en: 'market', ar: 'سوق', fr: 'marché', es: 'mercado', de: 'markt', tr: 'pazar' },
  { en: 'shop', ar: 'متجر', fr: 'boutique', es: 'tienda', de: 'laden', tr: 'dükkan' },
  { en: 'bank', ar: 'بنك', fr: 'banque', es: 'banco', de: 'bank', tr: 'banka' },
  { en: 'dollar', ar: 'دولار', fr: 'dollar', es: 'dólar', de: 'dollar', tr: 'dolar' },
  { en: 'year', ar: 'سنة', fr: 'an', es: 'año', de: 'jahr', tr: 'yıl' },
  { en: 'month', ar: 'شهر', fr: 'mois', es: 'mes', de: 'monat', tr: 'ay' },
  { en: 'week', ar: 'أسبوع', fr: 'semaine', es: 'semana', de: 'woche', tr: 'hafta' },
  { en: 'hour', ar: 'ساعة', fr: 'heure', es: 'hora', de: 'stunde', tr: 'saat' },
  { en: 'minute', ar: 'دقيقة', fr: 'minute', es: 'minuto', de: 'minute', tr: 'dakika' },
  { en: 'new', ar: 'جديد', fr: 'nouveau', es: 'nuevo', de: 'neu', tr: 'yeni' },
  { en: 'old', ar: 'قديم', fr: 'vieux', es: 'viejo', de: 'alt', tr: 'eski' },
  { en: 'young', ar: 'شاب', fr: 'jeune', es: 'joven', de: 'jung', tr: 'genç' },
  { en: 'long', ar: 'طويل', fr: 'long', es: 'largo', de: 'lang', tr: 'uzun' },
  { en: 'short', ar: 'قصير', fr: 'court', es: 'corto', de: 'kurz', tr: 'kısa' },
  { en: 'fast', ar: 'سريع', fr: 'rapide', es: 'rápido', de: 'schnell', tr: 'hızlı' },
  { en: 'slow', ar: 'بطيء', fr: 'lent', es: 'lento', de: 'langsam', tr: 'yavaş' },
  { en: 'easy', ar: 'سهل', fr: 'facile', es: 'fácil', de: 'einfach', tr: 'kolay' },
  { en: 'difficult', ar: 'صعب', fr: 'difficile', es: 'difícil', de: 'schwierig', tr: 'zor' },
  { en: 'hard', ar: 'صعب', fr: 'dur', es: 'duro', de: 'schwer', tr: 'zor' },
  { en: 'strong', ar: 'قوي', fr: 'fort', es: 'fuerte', de: 'stark', tr: 'güçlü' },
  { en: 'weak', ar: 'ضعيف', fr: 'faible', es: 'débil', de: 'schwach', tr: 'zayıf' },
  { en: 'rich', ar: 'غني', fr: 'riche', es: 'rico', de: 'reich', tr: 'zengin' },
  { en: 'poor', ar: 'فقير', fr: 'pauvre', es: 'pobre', de: 'arm', tr: 'fakir' },
  { en: 'many', ar: 'كثير', fr: 'beaucoup', es: 'muchos', de: 'viele', tr: 'çok' },
  { en: 'few', ar: 'قليل', fr: 'peu', es: 'pocos', de: 'wenige', tr: 'az' },
  { en: 'all', ar: 'كل', fr: 'tout', es: 'todo', de: 'alle', tr: 'hepsi' },
  { en: 'some', ar: 'بعض', fr: 'quelques', es: 'algunos', de: 'einige', tr: 'bazı' },
  { en: 'this', ar: 'هذا', fr: 'ce', es: 'este', de: 'dieser', tr: 'bu' },
  { en: 'that', ar: 'ذلك', fr: 'cela', es: 'ese', de: 'jener', tr: 'şu' },
  { en: 'here', ar: 'هنا', fr: 'ici', es: 'aquí', de: 'hier', tr: 'burada' },
  { en: 'there', ar: 'هناك', fr: 'là', es: 'allí', de: 'dort', tr: 'orada' },
  { en: 'and', ar: 'و', fr: 'et', es: 'y', de: 'und', tr: 've' },
  { en: 'or', ar: 'أو', fr: 'ou', es: 'o', de: 'oder', tr: 'veya' },
  { en: 'but', ar: 'لكن', fr: 'mais', es: 'pero', de: 'aber', tr: 'ama' },
  { en: 'because', ar: 'لأن', fr: 'parce que', es: 'porque', de: 'weil', tr: 'çünkü' },
  { en: 'then', ar: 'ثم', fr: 'puis', es: 'entonces', de: 'dann', tr: 'sonra' },
  { en: 'make', ar: 'يصنع', fr: 'faire', es: 'hacer', de: 'machen', tr: 'yapmak' },
  { en: 'take', ar: 'يأخذ', fr: 'prendre', es: 'tomar', de: 'nehmen', tr: 'almak' },
  { en: 'give', ar: 'يعطي', fr: 'donner', es: 'dar', de: 'geben', tr: 'vermek' },
  { en: 'say', ar: 'يقول', fr: 'dire', es: 'decir', de: 'sagen', tr: 'söylemek' },
  { en: 'tell', ar: 'يخبر', fr: 'raconter', es: 'contar', de: 'erzählen', tr: 'anlatmak' },
  { en: 'ask', ar: 'يسأل', fr: 'demander', es: 'preguntar', de: 'fragen', tr: 'sormak' },
  { en: 'answer', ar: 'يجيب', fr: 'répondre', es: 'responder', de: 'antworten', tr: 'cevaplamak' },
  { en: 'read', ar: 'يقرأ', fr: 'lire', es: 'leer', de: 'lesen', tr: 'okumak' },
  { en: 'write', ar: 'يكتب', fr: 'écrire', es: 'escribir', de: 'schreiben', tr: 'yazmak' },
  { en: 'listen', ar: 'يستمع', fr: 'écouter', es: 'escuchar', de: 'zuhören', tr: 'dinlemek' },
  { en: 'watch', ar: 'يشاهد', fr: 'regarder', es: 'mirar', de: 'sehen', tr: 'izlemek' },
  { en: 'buy', ar: 'يشتري', fr: 'acheter', es: 'comprar', de: 'kaufen', tr: 'satın almak' },
  { en: 'sell', ar: 'يبيع', fr: 'vendre', es: 'vender', de: 'verkaufen', tr: 'satmak' },
  { en: 'pay', ar: 'يدفع', fr: 'payer', es: 'pagar', de: 'bezahlen', tr: 'ödemek' },
  { en: 'play', ar: 'يلعب', fr: 'jouer', es: 'jugar', de: 'spielen', tr: 'oynamak' },
  { en: 'run', ar: 'يجري', fr: 'courir', es: 'correr', de: 'rennen', tr: 'koşmak' },
  { en: 'walk', ar: 'يمشي', fr: 'marcher', es: 'caminar', de: 'gehen', tr: 'yürümek' },
  { en: 'sit', ar: 'يجلس', fr: 's asseoir', es: 'sentarse', de: 'sitzen', tr: 'oturmak' },
  { en: 'begin', ar: 'يبدأ', fr: 'commencer', es: 'empezar', de: 'beginnen', tr: 'başlamak' },
  { en: 'finish', ar: 'ينهي', fr: 'finir', es: 'terminar', de: 'beenden', tr: 'bitirmek' },
  { en: 'try', ar: 'يحاول', fr: 'essayer', es: 'intentar', de: 'versuchen', tr: 'denemek' },
  { en: 'use', ar: 'يستخدم', fr: 'utiliser', es: 'usar', de: 'benutzen', tr: 'kullanmak' },
  { en: 'find', ar: 'يجد', fr: 'trouver', es: 'encontrar', de: 'finden', tr: 'bulmak' },
  { en: 'meet', ar: 'يقابل', fr: 'rencontrer', es: 'encontrar', de: 'treffen', tr: 'buluşmak' },
  { en: 'call', ar: 'يتصل', fr: 'appeler', es: 'llamar', de: 'anrufen', tr: 'aramak' },
  { en: 'send', ar: 'يرسل', fr: 'envoyer', es: 'enviar', de: 'senden', tr: 'göndermek' },
  { en: 'learn', ar: 'يتعلم', fr: 'apprendre', es: 'aprender', de: 'lernen', tr: 'öğrenmek' },
  { en: 'teach', ar: 'يعلم', fr: 'enseigner', es: 'enseñar', de: 'lehren', tr: 'öğretmek' },
  { en: 'think', ar: 'يفكر', fr: 'penser', es: 'pensar', de: 'denken', tr: 'düşünmek' },
  { en: 'remember', ar: 'يتذكر', fr: 'se souvenir', es: 'recordar', de: 'erinnern', tr: 'hatırlamak' },
  { en: 'forget', ar: 'ينسى', fr: 'oublier', es: 'olvidar', de: 'vergessen', tr: 'unutmak' },
  { en: 'feel', ar: 'يشعر', fr: 'sentir', es: 'sentir', de: 'fühlen', tr: 'hissetmek' },
  { en: 'hope', ar: 'يأمل', fr: 'espérer', es: 'esperar', de: 'hoffen', tr: 'ummak' },
  { en: 'dream', ar: 'حلم', fr: 'rêve', es: 'sueño', de: 'traum', tr: 'rüya' },
  { en: 'world', ar: 'عالم', fr: 'monde', es: 'mundo', de: 'welt', tr: 'dünya' },
  { en: 'life', ar: 'حياة', fr: 'vie', es: 'vida', de: 'leben', tr: 'hayat' },
  { en: 'day', ar: 'يوم', fr: 'jour', es: 'día', de: 'tag', tr: 'gün' },
  { en: 'night', ar: 'ليل', fr: 'nuit', es: 'noche', de: 'nacht', tr: 'gece' },
  { en: 'language', ar: 'لغة', fr: 'langue', es: 'idioma', de: 'sprache', tr: 'dil' },
  { en: 'word', ar: 'كلمة', fr: 'mot', es: 'palabra', de: 'wort', tr: 'kelime' },
  { en: 'sentence', ar: 'جملة', fr: 'phrase', es: 'frase', de: 'satz', tr: 'cümle' },
  { en: 'question', ar: 'سؤال', fr: 'question', es: 'pregunta', de: 'frage', tr: 'soru' },
  { en: 'answer', ar: 'إجابة', fr: 'réponse', es: 'respuesta', de: 'antwort', tr: 'cevap' },
  { en: 'problem', ar: 'مشكلة', fr: 'problème', es: 'problema', de: 'problem', tr: 'sorun' },
  { en: 'idea', ar: 'فكرة', fr: 'idée', es: 'idea', de: 'idee', tr: 'fikir' },
  { en: 'story', ar: 'قصة', fr: 'histoire', es: 'historia', de: 'geschichte', tr: 'hikaye' },
  { en: 'movie', ar: 'فيلم', fr: 'film', es: 'película', de: 'film', tr: 'film' },
  { en: 'music', ar: 'موسيقى', fr: 'musique', es: 'música', de: 'musik', tr: 'müzik' },
  { en: 'song', ar: 'أغنية', fr: 'chanson', es: 'canción', de: 'lied', tr: 'şarkı' },
  { en: 'game', ar: 'لعبة', fr: 'jeu', es: 'juego', de: 'spiel', tr: 'oyun' },
  { en: 'work', ar: 'عمل', fr: 'travail', es: 'trabajo', de: 'arbeit', tr: 'iş' },
  { en: 'job', ar: 'وظيفة', fr: 'emploi', es: 'trabajo', de: 'job', tr: 'meslek' },
  { en: 'company', ar: 'شركة', fr: 'entreprise', es: 'empresa', de: 'firma', tr: 'şirket' },
  { en: 'team', ar: 'فريق', fr: 'équipe', es: 'equipo', de: 'team', tr: 'takım' },
  { en: 'project', ar: 'مشروع', fr: 'projet', es: 'proyecto', de: 'projekt', tr: 'proje' },
  { en: 'system', ar: 'نظام', fr: 'système', es: 'sistema', de: 'system', tr: 'sistem' },
  { en: 'program', ar: 'برنامج', fr: 'programme', es: 'programa', de: 'programm', tr: 'program' },
  { en: 'data', ar: 'بيانات', fr: 'données', es: 'datos', de: 'daten', tr: 'veri' },
  { en: 'email', ar: 'بريد إلكتروني', fr: 'e-mail', es: 'correo', de: 'e-mail', tr: 'e-posta' },
  { en: 'website', ar: 'موقع إلكتروني', fr: 'site web', es: 'sitio web', de: 'webseite', tr: 'web sitesi' },
  { en: 'password', ar: 'كلمة المرور', fr: 'mot de passe', es: 'contraseña', de: 'passwort', tr: 'şifre' },
  { en: 'battery', ar: 'بطارية', fr: 'batterie', es: 'batería', de: 'akku', tr: 'pil' },
  { en: 'screen', ar: 'شاشة', fr: 'écran', es: 'pantalla', de: 'bildschirm', tr: 'ekran' },
  { en: 'button', ar: 'زر', fr: 'bouton', es: 'botón', de: 'knopf', tr: 'düğme' },
  { en: 'message', ar: 'رسالة', fr: 'message', es: 'mensaje', de: 'nachricht', tr: 'mesaj' },
  { en: 'notification', ar: 'إشعار', fr: 'notification', es: 'notificación', de: 'benachrichtigung', tr: 'bildirim' },
  { en: 'update', ar: 'تحديث', fr: 'mise à jour', es: 'actualización', de: 'aktualisierung', tr: 'güncelleme' },
  { en: 'download', ar: 'تنزيل', fr: 'téléchargement', es: 'descarga', de: 'download', tr: 'indirme' },
  { en: 'upload', ar: 'رفع', fr: 'téléversement', es: 'subida', de: 'upload', tr: 'yükleme' },
  { en: 'search', ar: 'بحث', fr: 'recherche', es: 'búsqueda', de: 'suche', tr: 'arama' },
  { en: 'login', ar: 'تسجيل الدخول', fr: 'connexion', es: 'iniciar sesión', de: 'anmeldung', tr: 'giriş' },
  { en: 'logout', ar: 'تسجيل الخروج', fr: 'déconnexion', es: 'cerrar sesión', de: 'abmeldung', tr: 'çıkış' },
  { en: 'heroes', ar: 'أبطال', fr: 'héros', es: 'héroes' },
  { en: 'hero', ar: 'بطل', fr: 'héros', es: 'héroe' },

  // ---- v4.1 function words & connectives (fixes "the"→"ث" style leaks) ----
  { en: 'the', ar: '', fr: 'le', es: 'el' },
  { en: 'a', ar: '', fr: 'un', es: 'un' },
  { en: 'an', ar: '', fr: 'une', es: 'una' },
  { en: 'this', ar: 'هذا', fr: 'ce', es: 'este' },
  { en: 'that', ar: 'ذلك', fr: 'cela', es: 'ese' },
  { en: 'these', ar: 'هؤلاء', fr: 'ces', es: 'estos' },
  { en: 'those', ar: 'أولئك', fr: 'ces', es: 'esos' },
  { en: 'there', ar: 'هناك', fr: 'là', es: 'allí' },
  { en: 'their', ar: 'لهم', fr: 'leur', es: 'su' },
  { en: 'them', ar: 'هم', fr: 'eux', es: 'ellos' },
  { en: 'they', ar: 'هم', fr: 'ils', es: 'ellos' },
  { en: 'it', ar: 'إنه', fr: 'il', es: 'ello' },
  { en: 'its', ar: 'له', fr: 'son', es: 'su' },
  { en: 'then', ar: 'ثم', fr: 'puis', es: 'entonces' },
  { en: 'than', ar: 'من', fr: 'que', es: 'que' },
  { en: 'to', ar: 'إلى', fr: 'à', es: 'a' },
  { en: 'of', ar: 'من', fr: 'de', es: 'de' },
  { en: 'in', ar: 'في', fr: 'dans', es: 'en' },
  { en: 'on', ar: 'على', fr: 'sur', es: 'sobre' },
  { en: 'at', ar: 'في', fr: 'à', es: 'en' },
  { en: 'for', ar: 'لـ', fr: 'pour', es: 'para' },
  { en: 'with', ar: 'مع', fr: 'avec', es: 'con' },
  { en: 'without', ar: 'بدون', fr: 'sans', es: 'sin' },
  { en: 'from', ar: 'من', fr: 'depuis', es: 'desde' },
  { en: 'by', ar: 'بواسطة', fr: 'par', es: 'por' },
  { en: 'as', ar: 'مثل', fr: 'comme', es: 'como' },
  { en: 'into', ar: 'إلى', fr: 'dans', es: 'hacia' },
  { en: 'over', ar: 'فوق', fr: 'sur', es: 'sobre' },
  { en: 'under', ar: 'تحت', fr: 'sous', es: 'bajo' },
  { en: 'between', ar: 'بين', fr: 'entre', es: 'entre' },
  { en: 'after', ar: 'بعد', fr: 'après', es: 'después' },
  { en: 'before', ar: 'قبل', fr: 'avant', es: 'antes' },
  { en: 'about', ar: 'حول', fr: 'sur', es: 'sobre' },
  { en: 'up', ar: 'أعلى', fr: 'haut', es: 'arriba' },
  { en: 'down', ar: 'أسفل', fr: 'bas', es: 'abajo' },
  { en: 'out', ar: 'خارجاً', fr: 'dehors', es: 'fuera' },
  { en: 'off', ar: 'مطفأ', fr: 'éteint', es: 'apagado' },
  { en: 'again', ar: 'مرة أخرى', fr: 'encore', es: 'otra vez' },
  { en: 'very', ar: 'جداً', fr: 'très', es: 'muy' },
  { en: 'also', ar: 'أيضاً', fr: 'aussi', es: 'también' },
  { en: 'only', ar: 'فقط', fr: 'seulement', es: 'solo' },
  { en: 'just', ar: 'فقط', fr: 'juste', es: 'solo' },
  { en: 'even', ar: 'حتى', fr: 'même', es: 'incluso' },
  { en: 'still', ar: 'لا يزال', fr: 'encore', es: 'todavía' },
  { en: 'already', ar: 'بالفعل', fr: 'déjà', es: 'ya' },
  { en: 'always', ar: 'دائماً', fr: 'toujours', es: 'siempre' },
  { en: 'never', ar: 'أبداً', fr: 'jamais', es: 'nunca' },
  { en: 'often', ar: 'غالباً', fr: 'souvent', es: 'a menudo' },
  { en: 'sometimes', ar: 'أحياناً', fr: 'parfois', es: 'a veces' },
  { en: 'how', ar: 'كيف', fr: 'comment', es: 'cómo' },
  { en: 'which', ar: 'أي', fr: 'quel', es: 'cuál' },
  { en: 'if', ar: 'إذا', fr: 'si', es: 'si' },
  { en: 'not', ar: 'ليس', fr: 'ne...pas', es: 'no' },
  { en: 'will', ar: 'سوف', fr: 'vais', es: 'voy' },
  { en: 'would', ar: 'كان', fr: 'voudrais', es: 'haría' },
  { en: 'can', ar: 'يستطيع', fr: 'pouvoir', es: 'poder' },
  { en: 'could', ar: 'استطاع', fr: 'pourrait', es: 'podría' },
  { en: 'should', ar: 'يجب', fr: 'devrait', es: 'debería' },
  { en: 'must', ar: 'يجب', fr: 'doit', es: 'debe' },
  { en: 'may', ar: 'قد', fr: 'peut', es: 'puede' },
  { en: 'might', ar: 'ربما', fr: 'pourrait', es: 'podría' },
  { en: 'does', ar: 'يفعل', fr: 'fait', es: 'hace' },
  { en: 'did', ar: 'فعل', fr: 'a fait', es: 'hizo' },
  { en: 'were', ar: 'كانوا', fr: 'étaient', es: 'estaban' },
  { en: 'been', ar: 'كان', fr: 'été', es: 'estado' },
  { en: 'be', ar: 'يكون', fr: 'être', es: 'ser' },
  { en: 'me', ar: 'ني', fr: 'moi', es: 'yo' },
  { en: 'him', ar: 'له', fr: 'lui', es: 'él' },
  { en: 'her', ar: 'لها', fr: 'elle', es: 'ella' },
  { en: 'us', ar: 'لنا', fr: 'nous', es: 'nosotros' },
  { en: 'costs', ar: 'تكاليف', fr: 'coûte', es: 'cuesta' },
  { en: 'dollars', ar: 'دولارات', fr: 'dollars', es: 'dólares' },
  { en: 'euros', ar: 'يورو', fr: 'euros', es: 'euros' },
  { en: 'football', ar: 'كرة القدم', fr: 'football', es: 'fútbol' },
  { en: 'school', ar: 'مدرسة', fr: 'école', es: 'escuela' },
  { en: 'airport', ar: 'مطار', fr: 'aéroport', es: 'aeropuerto' },

  // ---- Arabic-side connectives (improve ar→en and other reverse pairs) ----
  { en: 'peace be upon you', ar: 'السلام عليكم' },
  { en: 'hello there', ar: 'أهلاً' },
  { en: 'to (toward)', ar: 'إلى' },
  { en: 'in (inside)', ar: 'في' },
  { en: 'on (upon)', ar: 'على' },
  { en: 'about (regarding)', ar: 'عن' },
  { en: 'with (together)', ar: 'مع' },
  { en: 'between (among)', ar: 'بين' },
  { en: 'after (later)', ar: 'بعد' },
  { en: 'before (earlier)', ar: 'قبل' },
  { en: 'above (over)', ar: 'فوق' },
  { en: 'below (under)', ar: 'تحت' },
  { en: 'this one', ar: 'هذه' },
  { en: 'but however', ar: 'لكن' },
  { en: 'also too', ar: 'أيضاً' },
  { en: 'very much so', ar: 'جداً' },
  { en: 'yes indeed', ar: 'نعم' },
  { en: 'the school', ar: 'المدرسة' },
  { en: 'the house', ar: 'المنزل' },
  { en: 'the book', ar: 'الكتاب' },
  { en: 'the man', ar: 'الرجل' },
  { en: 'the woman', ar: 'المرأة' },
];

/**
 * Words that must resolve inside sentences (the whole-text special cases above
 * only fire for single-word inputs). Includes the common-name lexicon so
 * "Mahdi Heroes ahmed" fully renders as "مهدي أبطال أحمد".
 */
const SPECIAL_WORDS_EN_AR: Record<string, string> = {
  heroes: 'أبطال',
  hero: 'بطل',
  mahdi: 'مهدي',
  ahmed: 'أحمد',
  ahmad: 'أحمد',
  color: 'لون',
  colour: 'لون',
  ...NAMES_EN_AR,
};

/**
 * Normalizes text for case-insensitive and diacritic-insensitive matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()؟?،!]/g, '')
    .replace(/[\u064B-\u065F]/g, '') // remove Arabic tashkeel
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه');
}

/**
 * Performs local offline dictionary translation with dialect and domain awareness.
 */
export interface OfflineTranslateOptions {
  domain?: string;
  dialect?: string;
  tone?: string;
}

export function translateOffline(
  text: string,
  fromLang: string,
  toLang: string,
  optionsOrDomain?: OfflineTranslateOptions | string,
  _dialect?: string,
  _tone?: string
): OfflineTranslateResult {
  if (!text || !text.trim()) {
    return { translation: '', confidence: 'exact' };
  }

  // Accept both the object form and the legacy positional form.
  const options: OfflineTranslateOptions =
    typeof optionsOrDomain === 'string'
      ? { domain: optionsOrDomain, dialect: _dialect, tone: _tone }
      : optionsOrDomain || {};

  const cleanInput = text.trim();
  const actualFromLang = (fromLang === 'auto' || !fromLang) ? detectLanguageFromText(cleanInput) : fromLang;
  const normalizedInput = normalizeText(cleanInput);

  // 1. Specialized rich dictionary for instant response
  const lower = cleanInput.toLowerCase();
  if (lower === 'heroes' || lower === 'hero') {
    return {
      translation: lower === 'heroes' ? 'أبطال' : 'بطل',
      transliteration: lower === 'heroes' ? "'abtal" : "batal",
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      moreTranslations: [
        { phrase: 'بطل', partOfSpeech: 'اسم', reverseTranslations: ['champion', 'hero'] },
        { phrase: 'شجاع', partOfSpeech: 'اسم', reverseTranslations: ['tiger', 'hero'] },
        { phrase: 'شخص محط بالاعجاب', partOfSpeech: 'اسم', reverseTranslations: ['hero'] },
        { phrase: 'الشخصية الرئيسية في أثر أدبي', partOfSpeech: 'اسم', reverseTranslations: ['protagonist', 'hero'] }
      ],
      definitions: [
        {
          partOfSpeech: 'اسم',
          number: 1,
          definition: 'a person who is admired or idealized for courage, outstanding achievements, or noble qualities.',
          example: '"a war hero"',
          synonyms: [
            'champion', 'brave man', 'great man', 'man of courage', 'conquering hero',
            'man of the hour', 'conqueror', 'winner', 'victor', 'paladin', 'warrior',
            'lionheart', 'superstar', 'idol', 'star', 'celebrity', 'megastar', 'luminary',
            'ideal man', 'ideal', 'lion', 'exemplar', 'paragon', 'perfect example',
            'shining example', 'darling', 'favorite', 'knight in shining armor', 'beau idéal'
          ]
        }
      ],
      confidence: 'exact'
    };
  }

  if (lower === 'mahdi') {
    return {
      translation: 'مهدي',
      transliteration: "'mādē",
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      definitions: [
        {
          partOfSpeech: 'اسم',
          number: 1,
          definition: '(in popular Muslim belief) a spiritual and temporal leader who will rule before the end of the world and restore religion and justice.'
        }
      ],
      confidence: 'exact'
    };
  }

  if (lower === 'ahmed' || lower === 'ahmad') {
    return {
      translation: 'أحمد',
      transliteration: "'ahmad",
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      confidence: 'exact'
    };
  }

  if (lower === 'color' || lower === 'colour') {
    return {
      translation: 'لون',
      transliteration: 'lawn',
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      moreTranslations: [
        { phrase: 'اللون', partOfSpeech: 'اسم', reverseTranslations: ['color', 'course', 'colour'] },
        { phrase: 'صبغ', partOfSpeech: 'فعل', reverseTranslations: ['dye', 'pigment', 'tincture', 'color', 'imbue'] },
        { phrase: 'صباغ', partOfSpeech: 'اسم', reverseTranslations: ['dyer', 'dye', 'dyestuff', 'stain', 'colour'] },
        { phrase: 'بشرة', partOfSpeech: 'اسم', reverseTranslations: ['skin', 'cuticle', 'complexion', 'color'] },
        { phrase: 'راية', partOfSpeech: 'اسم', reverseTranslations: ['banner', 'flag', 'standard', 'ensign', 'color'] },
        { phrase: 'تورد البشرة', partOfSpeech: 'اسم', reverseTranslations: ['color', 'colour'] },
        { phrase: 'مظهر خارجي', partOfSpeech: 'اسم', reverseTranslations: ['color', 'appearance', 'face', 'semblance'] },
        { phrase: 'لون محلي', partOfSpeech: 'اسم', reverseTranslations: ['colour', 'color'] },
        { phrase: 'شوه', partOfSpeech: 'فعل', reverseTranslations: ['distort', 'deform', 'maim', 'color'] }
      ],
      definitions: [
        {
          partOfSpeech: 'اسم',
          number: 1,
          definition: 'the property possessed by an object of producing different sensations on the eye as a result of the way the object reflects or emits light.',
          example: '"the lights flickered and changed color"',
          synonyms: ['tint', 'shade', 'hue', 'cast', 'tinge', 'tone', 'tincture']
        },
        {
          partOfSpeech: 'اسم',
          number: 2,
          definition: "pigmentation of the skin, especially as an indication of someone's ethnicity.",
          example: '"discrimination on the basis of color"',
          synonyms: ['skin coloring', 'skin color', 'complexion', 'skin tone', 'pigmentation', 'coloring', 'ethnic group', 'race', 'stock']
        },
        {
          partOfSpeech: 'فعل',
          number: 1,
          definition: 'change the color of (something) by painting, dyeing, or shading it.',
          example: '"he colored her hair with a selection of blonde and brown shades"',
          synonyms: ['tinge', 'dye', 'tint', 'stain', 'pigment', 'shade', 'paint', 'color in', 'color-wash']
        },
        {
          partOfSpeech: 'فعل',
          number: 2,
          definition: '(of a person or their skin) show embarrassment or shame by becoming red; blush.',
          example: '"everyone stared at him, and he colored slightly"',
          synonyms: ['go pink/red', 'redden', 'blush', 'flush', 'turn red/crimson/scarlet', 'crimson']
        }
      ],
      confidence: 'exact'
    };
  }

  if (lower === 'color in' || lower === 'colour in') {
    return {
      translation: 'لون',
      transliteration: 'lwwn',
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      confidence: 'exact'
    };
  }

  if (lower === 'i love you') {
    return {
      translation: 'أحبك',
      transliteration: "'uhibuk",
      detectedLanguageName: 'الإنجليزية، تم رصدها',
      confidence: 'exact'
    };
  }

  // 1. Whole-phrase lookup — dialect-aware, so "how are you" with the Egyptian
  //    dialect returns "ازيك" instead of the standard form.
  const index = getPhraseIndex(actualFromLang, toLang, options.dialect);
  const exactMatch = index.get(normalizedInput);
  if (exactMatch) {
    const isHi = normalizedInput === 'hi' || normalizedInput === 'hello';
    return {
      translation: exactMatch,
      transliteration: exactMatch === 'أهلاً' ? 'ahlaan' : exactMatch === 'مرحباً' ? 'marhaban' : '',
      detectedLanguageName: detectedLanguageLabel(actualFromLang),
      moreTranslations: isHi ? [
        { phrase: 'مرحبا!', partOfSpeech: 'لفظ تعجب', reverseTranslations: ['Welcome!', 'Hello!', 'Hi!', 'Hallo!'] },
        { phrase: 'أهلا!', partOfSpeech: 'لفظ تعجب', reverseTranslations: ['Hi!', 'Hello!', 'Hallo!'] },
        { phrase: 'هاي هتاف للفت الانتباه!', partOfSpeech: 'لفظ تعجب', reverseTranslations: ['Hi!', 'Hello!'] }
      ] : [],
      definitions: isHi ? [
        { partOfSpeech: 'صيغة تعجب', definition: 'used as a friendly greeting or to attract attention.', example: '"Hi there. How was the flight?"', number: 1 },
        { partOfSpeech: 'اختصار', definition: 'Hawaii (in official postal use).', number: 1 }
      ] : [],
      confidence: 'exact',
      engineNotice: 'تمت الترجمة بدقة تامة عبر حزمة اللغات المحلية (Mahdi Offline Engine)'
    };
  }

  // 2. Greedy longest-match segmentation.
  //
  // The previous implementation matched ONE word at a time, so a dictionary
  // phrase such as "thank you" / "how are you" never matched inside a longer
  // sentence ("how are you today" returned the source text unchanged). We now
  // walk the sentence and try the longest dictionary phrase first (5 words down
  // to 1), which makes whole sentences translate instead of a single word.
  const words = cleanInput.split(/(\s+)/).filter(t => t.length > 0);
  const out: string[] = [];
  let matchedWords = 0;
  const totalWords = words.filter(t => !/^\s+$/.test(t)).length;

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (/^\s+$/.test(token)) {
      out.push(token); // keep the original spacing/line breaks intact
      continue;
    }
    // Collect the next up-to-MAX_PHRASE_WORDS meaningful tokens.
    const upcoming: { idx: number; norm: string; core: string; pre: string; post: string }[] = [];
    for (let j = i; j < words.length && upcoming.length < MAX_PHRASE_WORDS; j++) {
      if (/^\s+$/.test(words[j])) continue;
      const p = splitPunct(words[j]);
      upcoming.push({ idx: j, norm: normalizeText(p.core), core: p.core, pre: p.pre, post: p.post });
    }

    let matched = false;
    for (let n = upcoming.length; n >= 1; n--) {
      const first = upcoming[0];
      const last = upcoming[n - 1];
      const key = upcoming.slice(0, n).map(u => u.norm).join(' ');

      // Numeric token(s): localise digits to the target language convention.
      // Use the ORIGINAL core so thousands separators ("1,000") survive.
      if (n === 1 && isNumeric(first.norm)) {
        out.push(first.pre + localizeNumber(first.core, toLang) + first.post);
        i = first.idx;
        matchedWords += 1;
        matched = true;
        break;
      }

      const hit = index.get(key);
      // NB: an empty-string hit is valid — articles like "the/a" disappear in
      // Arabic, so an explicit undefined check is required (not truthiness).
      if (hit !== undefined) {
        // Re-attach the punctuation that surrounded the matched phrase.
        out.push(first.pre + hit + last.post);
        i = last.idx; // skip the consumed tokens
        matchedWords += n;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Unknown word: never leak the source script — transliterate it into the
      // target writing system while preserving surrounding punctuation.
      const p = splitPunct(token);
      out.push(p.pre + renderUnknownWord(p.core, actualFromLang, toLang) + p.post);
    }
  }

  let translation = out.join('').replace(/\s{2,}/g, ' ').trim();
  if (targetUsesArabicScript(toLang)) {
    translation = beautifyArabic(translation, toLang);
  }
  const coverage = totalWords === 0 ? 0 : matchedWords / totalWords;

  if (matchedWords > 0) {
    return {
      translation,
      confidence: coverage >= 1 ? 'exact' : 'partial',
      detectedLanguageName: detectedLanguageLabel(actualFromLang),
      engineNotice:
        coverage >= 1
          ? 'تمت الترجمة كاملة عبر حزمة اللغات المحلية (Mahdi Offline Engine)'
          : `تمت ترجمة ${matchedWords} من ${totalWords} كلمة عبر المعجم المحلي، وحُوِّلت بقية الكلمات إلى كتابة اللغة الهدف`,
    };
  }

  // 3. Fallback: zero dictionary hits — render the whole text in the target
  //    script (transliteration) so output is never a broken mixed-script mix.
  const fallbackText = targetUsesArabicScript(toLang)
    ? beautifyArabic(ensureLocalScript(cleanInput, actualFromLang, toLang), toLang)
    : ensureLocalScript(cleanInput, actualFromLang, toLang);
  return {
    translation: fallbackText,
    confidence: 'fallback',
    detectedLanguageName: detectedLanguageLabel(actualFromLang),
    engineNotice: 'تعذّرت مطابقة المعجم المحلي — تم تحويل النص إلى كتابة اللغة الهدف؛ فعّل الإنترنت أو النموذج العصبي لترجمة أدق',
  };
}

/** Apply the unknown-word rendering across a full sentence, keeping spaces. */
function ensureLocalScript(text: string, fromLang: string, toLang: string): string {
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (!token.trim()) return token;
      const p = splitPunct(token);
      return p.pre + renderUnknownWord(p.core, fromLang, toLang) + p.post;
    })
    .join('');
}

export interface WordToken {
  source: string;
  target: string;
  /** dictionary = exact dictionary/phrase hit, transliterated = script fallback, number, punct, space */
  kind: 'dictionary' | 'transliterated' | 'number' | 'punct' | 'space';
}

/**
 * Word-by-word breakdown used by the "تحليل الكلمات" tool. Mirrors the
 * segmentation logic of translateOffline but exposes every token decision.
 */
export function translateWordByWord(
  text: string,
  fromLang: string,
  toLang: string,
  optionsOrDomain?: OfflineTranslateOptions | string,
  _dialect?: string,
): WordToken[] {
  if (!text || !text.trim()) return [];
  const options: OfflineTranslateOptions =
    typeof optionsOrDomain === 'string'
      ? { domain: optionsOrDomain, dialect: _dialect }
      : optionsOrDomain || {};
  const actualFromLang = (fromLang === 'auto' || !fromLang) ? detectLanguageFromText(text) : fromLang;
  const index = getPhraseIndex(actualFromLang, toLang, options.dialect);
  const tokens: WordToken[] = [];

  for (const raw of text.split(/(\s+)/)) {
    if (!raw) continue;
    if (/^\s+$/.test(raw)) {
      tokens.push({ source: raw, target: raw, kind: 'space' });
      continue;
    }
    const p = splitPunct(raw);
    if (!p.core) {
      tokens.push({ source: raw, target: raw, kind: 'punct' });
      continue;
    }
    const norm = normalizeText(p.core);
    if (isNumeric(norm)) {
      tokens.push({ source: raw, target: p.pre + localizeNumber(p.core, toLang) + p.post, kind: 'number' });
      continue;
    }
    const hit = index.get(norm);
    if (hit !== undefined) {
      tokens.push({ source: raw, target: p.pre + (hit || '—') + p.post, kind: 'dictionary' });
    } else {
      tokens.push({
        source: raw,
        target: p.pre + renderUnknownWord(p.core, actualFromLang, toLang) + p.post,
        kind: 'transliterated',
      });
    }
  }
  return tokens;
}

/** Maximum dictionary phrase length (in words) considered during segmentation. */
const MAX_PHRASE_WORDS = 5;

/** Splits surrounding punctuation from a token so matching ignores it but output keeps it. */
function splitPunct(token: string): { pre: string; core: string; post: string } {
  const m = token.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}].*?)([^\p{L}\p{N}]*)$/u);
  if (!m) return { pre: '', core: token, post: '' };
  return { pre: m[1], core: m[2], post: m[3] };
}

function isNumeric(norm: string): boolean {
  return /^[\d.,٠-٩]+$/.test(norm) && /\d|٠|١|٢|٣|٤|٥|٦|٧|٨|٩/.test(norm);
}

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Localises a numeric string to the target language's digit convention. */
function localizeNumber(norm: string, toLang: string): string {
  const ascii = norm.replace(/[٠-٩]/g, d => String(ARABIC_INDIC.indexOf(d)));
  if (toLang === 'ar' || toLang.startsWith('ar-') || toLang === 'fa' || toLang === 'ur') {
    return ascii.replace(/\d/g, d => ARABIC_INDIC[Number(d)]);
  }
  return ascii;
}

const PHRASE_INDEX_CACHE = new Map<string, Map<string, string>>();

/**
 * Builds (and caches) a normalized "source phrase → target phrase" lookup for a
 * language pair. When a dialect is requested and the dictionary holds a
 * dialect-specific variant, that variant wins over the standard one.
 */
function getPhraseIndex(fromLang: string, toLang: string, dialect?: string): Map<string, string> {
  const key = `${fromLang}>${toLang}>${dialect || 'standard'}`;
  const cached = PHRASE_INDEX_CACHE.get(key);
  if (cached) return cached;

  const index = new Map<string, string>();
  for (const entry of OFFLINE_DICTIONARY) {
    const fromVal = (entry as any)[fromLang] as string | undefined;
    let toVal = (entry as any)[toLang] as string | undefined;

    // Dialect-specific target (e.g. Iraqi/Egyptian/Levantine Arabic).
    if (dialect && dialect !== 'standard' && (entry as any).dialects) {
      const dialectValue = (entry as any).dialects[dialect];
      if (typeof dialectValue === 'string' && dialectValue) toVal = dialectValue;
    }

    // Note: empty-string targets ARE valid (e.g. English articles "the/a/an"
    // disappear in Arabic) — only skip genuinely missing entries.
    if (!fromVal || toVal === undefined || toVal === null) continue;
    const norm = normalizeText(fromVal);
    // A dialect-aware entry may overwrite the standard one; otherwise keep the first.
    const dialectSpecific = Boolean(dialect && dialect !== 'standard' && (entry as any).dialects?.[dialect]);
    if (!index.has(norm) || dialectSpecific) index.set(norm, toVal);
  }

  // English → Arabic: fold in the special-word and proper-name lexicons so
  // unknown-in-dictionary names still resolve inside full sentences.
  if (fromLang === 'en' && targetUsesArabicScript(toLang)) {
    for (const [word, ar] of Object.entries(SPECIAL_WORDS_EN_AR)) {
      const norm = normalizeText(word);
      if (!index.has(norm)) index.set(norm, ar);
    }
  }

  PHRASE_INDEX_CACHE.set(key, index);
  return index;
}

/**
 * Render a token the dictionary cannot translate. Instead of leaking the
 * source script into the output (e.g. "مهدي Heroes ahmed"), the word is
 * transliterated into the target language's writing system.
 */
function renderUnknownWord(core: string, fromLang: string, toLang: string): string {
  if (!core) return core;
  // Pure numeric tokens are localised by the caller.
  if (isNumeric(normalizeText(core))) return localizeNumber(core, toLang);

  const wantArabic = targetUsesArabicScript(toLang);
  if (wantArabic && isLatinScript(core) && !isArabicScript(core)) {
    return transliterateWord(core, toLang);
  }
  if (!wantArabic && isArabicScript(core)) {
    return transliterateWord(core, toLang);
  }
  // Same-script fallback (e.g. en→fr unknown word): keep the word but normalise
  // capitalisation so the sentence stays readable.
  return core;
}

/** Arabic label shown in the "detected language" chip. */
function detectedLanguageLabel(langCode: string): string {
  const names: Record<string, string> = {
    en: 'الإنجليزية، تم رصدها',
    ar: 'العربية، تم رصدها',
    fr: 'الفرنسية، تم رصدها',
    es: 'الإسبانية، تم رصدها',
    de: 'الألمانية، تم رصدها',
    tr: 'التركية، تم رصدها',
    ru: 'الروسية، تم رصدها',
    it: 'الإيطالية، تم رصدها',
    zh: 'الصينية، تم رصدها',
    ja: 'اليابانية، تم رصدها',
  };
  return names[langCode] || '';
}

