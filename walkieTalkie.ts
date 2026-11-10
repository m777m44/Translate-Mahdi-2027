/**
 * walkieTalkie.ts — the brain behind the RTranslator-style hands-free mode.
 *
 * RTranslator's signature feature is a one-phone "walkie talkie": the mic
 * listens for two languages at once, decides which one was just spoken, then
 * translates into the other and speaks it out loud. Ported here on top of the
 * web/native speech stack with two extra guarantees:
 *
 *  - language identification is *restricted* to the two selected languages
 *    (much more reliable than open-set detection, and it needs no 1GB model),
 *  - sentences are completed before translating, so the voice sounds natural
 *    instead of reading half a phrase.
 *
 * Everything in this file is pure and side-effect free so it can be verified
 * without a browser.
 */

/* ───────────────────────── script identification ───────────────────────── */

interface ScriptRule {
  test: RegExp;
  langs: string[];
}

const SCRIPT_RULES: ScriptRule[] = [
  { test: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/, langs: ['ar', 'ur', 'fa', 'ps'] },
  { test: /[\u0400-\u04FF]/, langs: ['ru', 'uk', 'bg', 'sr', 'mk'] },
  { test: /[\u3040-\u30FF]/, langs: ['ja'] },
  { test: /[\u4E00-\u9FFF]/, langs: ['zh'] },
  { test: /[\uAC00-\uD7AF\u1100-\u11FF]/, langs: ['ko'] },
  { test: /[\u0900-\u097F]/, langs: ['hi', 'mr', 'ne'] },
  { test: /[\u0E00-\u0E7F]/, langs: ['th'] },
  { test: /[\u0590-\u05FF]/, langs: ['he'] },
  { test: /[\u0370-\u03FF]/, langs: ['el'] },
  { test: /[\u10A0-\u10FF]/, langs: ['ka'] },
  { test: /[\u0B80-\u0BFF]/, langs: ['ta'] },
  { test: /[\u0980-\u09FF]/, langs: ['bn'] },
];

/** Scripts a language is normally written in. */
const LANG_SCRIPTS: Record<string, string> = {
  ar: 'arabic', ur: 'arabic', fa: 'arabic', ps: 'arabic',
  ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic', mk: 'cyrillic',
  ja: 'japanese', zh: 'han', ko: 'hangul', hi: 'devanagari', mr: 'devanagari',
  ne: 'devanagari', th: 'thai', he: 'hebrew', el: 'greek', ka: 'georgian',
  ta: 'tamil', bn: 'bengali',
};

function scriptOf(text: string): string | null {
  let best: { lang: string; script: string; hits: number } | null = null;
  for (const rule of SCRIPT_RULES) {
    const hits = (text.match(new RegExp(rule.test.source, 'g')) || []).length;
    if (hits > 0) {
      const candidate = { lang: rule.langs[0], script: LANG_SCRIPTS[rule.langs[0]] || 'other', hits };
      if (!best || candidate.hits > best.hits) best = candidate;
    }
  }
  if (!best) return null;
  // Latin is the implicit remaining script.
  return best.script;
}

/* ─────────────────────────── stop-word scoring ─────────────────────────── */

const STOPWORDS: Record<string, string[]> = {
  ar: ['في', 'من', 'على', 'إلى', 'عن', 'هذا', 'هذه', 'هو', 'هي', 'أنا', 'أنت', 'نحن', 'لا', 'ما', 'هل', 'كيف', 'أين', 'متى', 'لماذا', 'شكرا', 'شكراً', 'مرحبا', 'نعم', 'مع', 'كان', 'كانت', 'الذي', 'التي', 'لكن', 'أيضا', 'أيضاً', 'بعد', 'قبل', 'جدا', 'جداً', 'يريد', 'أريد', 'عندي', 'عندك'],
  en: ['the', 'and', 'is', 'are', 'was', 'were', 'you', 'your', 'to', 'of', 'in', 'that', 'it', 'for', 'with', 'what', 'this', 'have', 'has', 'do', 'does', 'can', 'my', 'me', 'not', 'on', 'hello', 'thanks', 'thank', 'please', 'how', 'much', 'where', 'when', 'why', 'want', 'need', 'know', 'good', 'very'],
  fr: ['le', 'la', 'les', 'de', 'et', 'est', 'un', 'une', 'des', 'du', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'pas', 'que', 'qui', 'pour', 'dans', 'avec', 'sur', 'mais', 'ce', 'cette', 'comment', 'merci', 'bonjour', 'oui', 'non', 'très', 'beaucoup', 'veux', 'peux', 'où', 'quand', 'pourquoi'],
  es: ['el', 'la', 'los', 'las', 'de', 'y', 'es', 'un', 'una', 'que', 'en', 'por', 'para', 'con', 'no', 'se', 'su', 'al', 'como', 'más', 'pero', 'sí', 'hola', 'gracias', 'dónde', 'cuándo', 'qué', 'cómo', 'muy', 'tengo', 'quiero', 'puedo', 'necesito', 'bueno'],
  de: ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'nicht', 'mit', 'für', 'auf', 'von', 'zu', 'den', 'dem', 'des', 'wie', 'was', 'wo', 'wann', 'warum', 'danke', 'hallo', 'ja', 'nein', 'bitte', 'sehr', 'möchte', 'kann'],
  tr: ['ve', 'bir', 'bu', 'şu', 'ben', 'sen', 'biz', 'siz', 'ne', 'nasıl', 'nerede', 'neden', 'evet', 'hayır', 'teşekkür', 'merhaba', 'çok', 'var', 'yok', 'için', 'ile', 'değil', 'mi', 'mı', 'istiyorum', 'lütfen', 'güzel'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', 'di', 'e', 'è', 'un', 'una', 'che', 'per', 'con', 'non', 'sono', 'come', 'dove', 'quando', 'perché', 'grazie', 'ciao', 'sì', 'molto', 'questo', 'voglio', 'posso'],
  pt: ['o', 'os', 'as', 'de', 'e', 'é', 'um', 'uma', 'que', 'para', 'com', 'não', 'se', 'seu', 'como', 'onde', 'quando', 'obrigado', 'olá', 'sim', 'muito', 'isso', 'você', 'quero', 'posso'],
  nl: ['de', 'het', 'een', 'en', 'is', 'van', 'ik', 'jij', 'hij', 'zij', 'wij', 'niet', 'met', 'voor', 'op', 'hoe', 'wat', 'waar', 'wanneer', 'waarom', 'dank', 'hallo', 'ja', 'nee', 'alsjeblieft', 'heel'],
  sv: ['och', 'att', 'det', 'som', 'en', 'ett', 'är', 'jag', 'du', 'han', 'hon', 'vi', 'inte', 'med', 'för', 'på', 'hur', 'vad', 'var', 'när', 'varför', 'tack', 'hej', 'ja', 'nej', 'mycket'],
  id: ['dan', 'yang', 'di', 'itu', 'dengan', 'untuk', 'tidak', 'saya', 'kamu', 'dia', 'kami', 'apa', 'bagaimana', 'mana', 'kapan', 'mengapa', 'terima', 'kasih', 'halo', 'ya', 'sangat', 'mau', 'bisa'],
  pl: ['i', 'w', 'na', 'z', 'to', 'jest', 'nie', 'się', 'że', 'do', 'jak', 'co', 'gdzie', 'kiedy', 'dlaczego', 'dziękuję', 'cześć', 'tak', 'bardzo', 'chcę', 'mogę'],
  ru: ['и', 'в', 'не', 'на', 'что', 'я', 'ты', 'он', 'она', 'мы', 'вы', 'это', 'как', 'где', 'когда', 'почему', 'спасибо', 'привет', 'да', 'нет', 'очень', 'хочу', 'можно'],
  fa: ['و', 'در', 'به', 'از', 'که', 'این', 'آن', 'است', 'من', 'تو', 'او', 'ما', 'شما', 'نه', 'چه', 'چگونه', 'کجا', 'کی', 'چرا', 'ممنون', 'سلام', 'بله', 'خیلی'],
  ur: ['اور', 'میں', 'سے', 'کو', 'ہے', 'ہیں', 'یہ', 'وہ', 'کیا', 'کیسے', 'کہاں', 'کب', 'کیوں', 'شکریہ', 'سلام', 'ہاں', 'نہیں', 'بہت'],
  hi: ['और', 'में', 'से', 'को', 'है', 'हैं', 'यह', 'वह', 'क्या', 'कैसे', 'कहाँ', 'कब', 'क्यों', 'धन्यवाद', 'नमस्ते', 'हाँ', 'नहीं', 'बहुत'],
};

/** Arabic-script languages share the script, so their stop words disambiguate. */
const SHARED_SCRIPT_HINTS: Record<string, RegExp> = {
  fa: /[\u067E\u0686\u0698\u06AF\u06CC\u06A9]/,
  ur: /[\u0679\u0688\u0691\u06BA\u06BE\u06C1\u06D2\u06AF]/,
  ar: /[\u0629\u0649\u0643]/,
  ru: /[\u044B\u044D\u0451\u044A]/,
  uk: /[\u0456\u0457\u0454\u0491]/,
};

/** Tokenises Latin/Cyrillic text into lower-cased word units. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u0600-\u06FF\u0750-\u077F\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Scores how much `text` looks like `lang`. Higher is better; 0 means "no
 * evidence at all".
 */
export function scoreLanguage(text: string, lang: string): number {
  if (!text || !text.trim() || !lang) return 0;
  const script = scriptOf(text);
  const expected = LANG_SCRIPTS[lang];
  let score = 0;

  // A language written in a different script cannot be what was spoken.
  if (script && expected && script !== expected) return 0;
  if (!script && expected && expected !== 'latin') return 0;
  if (script && script === expected) score += 3;

  const words = tokens(text);
  const stop = STOPWORDS[lang];
  if (stop) {
    const set = new Set(stop);
    for (const w of words) {
      if (set.has(w)) score += 1;
      // Arabic/Persian/Urdu words often carry prefixes (و، ال، ب).
      else if (w.length > 3 && (set.has(w.slice(1)) || set.has(w.slice(2)))) score += 0.5;
    }
  }

  // Diacritics and signature letters are a strong, cheap signal.
  const hint = SHARED_SCRIPT_HINTS[lang];
  if (hint && hint.test(text)) score += 1.5;
  if (lang === 'de' && /[äöüß]/i.test(text)) score += 2;
  if (lang === 'es' && /[ñ¿¡]/i.test(text)) score += 2;
  if (lang === 'fr' && /[àâçèêëîïôûùœ]/i.test(text)) score += 2;
  if (lang === 'pt' && /[ãõçáâ]/i.test(text)) score += 2;
  if (lang === 'tr' && /[ğşıİ]/.test(text)) score += 2;
  if (lang === 'pl' && /[ąćęłńóśźż]/i.test(text)) score += 2;
  if (lang === 'sv' && /[åäö]/i.test(text)) score += 1.5;
  if (lang === 'it' && /[ìòùè]/i.test(text)) score += 1;

  return score;
}

/**
 * Decides which of the two walkie-talkie languages was just spoken.
 * Falls back to `fallback` when there is no usable evidence (very short or
 * purely numeric utterances).
 */
export function detectBetween(text: string, langA: string, langB: string, fallback: string = langA): string {
  if (!text || !text.trim()) return fallback;
  const a = scoreLanguage(text, langA);
  const b = scoreLanguage(text, langB);
  if (a === 0 && b === 0) return fallback;
  if (a === b) return fallback;
  return a > b ? langA : langB;
}

/** The other side of the conversation. */
export function otherLanguage(lang: string, langA: string, langB: string): string {
  if (lang === langA) return langB;
  if (lang === langB) return langA;
  return langB;
}

/* ──────────────────────── sentence segmentation ────────────────────────── */

const SENTENCE_END = /[.!?؟…\u3002\uFF01\uFF1F]+/;

/**
 * Splits dictation into complete sentences so TTS never reads half a phrase.
 * Returns the finished sentences plus whatever is still unfinished.
 */
export function splitSentences(text: string): { sentences: string[]; rest: string } {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return { sentences: [], rest: '' };

  const sentences: string[] = [];
  let buffer = '';
  let depth = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (ch === '(' || ch === '[' || ch === '«') depth += 1;
    if (ch === ')' || ch === ']' || ch === '»') depth = Math.max(0, depth - 1);
    buffer += ch;
    if (depth === 0 && SENTENCE_END.test(ch)) {
      const done = buffer.trim();
      if (done) sentences.push(done);
      buffer = '';
    }
  }

  const rest = buffer.trim();
  return { sentences, rest };
}

/**
 * True when the leftover fragment is long enough to be worth translating even
 * if the speaker has not finished the sentence (prevents stalling the loop
 * when someone talks without punctuation).
 */
export function isCompleteEnough(fragment: string, minWords = 6): boolean {
  const words = tokens(fragment);
  return words.length >= minWords;
}

/* ──────────────────────────── text clean-up ────────────────────────────── */

/** Removes recogniser noise: repeated filler words and stray punctuation. */
export function cleanTranscript(text: string): string {
  let out = (text || '').replace(/\s+/g, ' ').trim();
  out = out.replace(/^[\s,،.۔-]+/, '');
  // Collapse an immediately repeated word ("that that", "هو هو").
  out = out.replace(/\b(\p{L}{2,})\s+\1\b/giu, '$1');
  // Collapse a repeated whole phrase (common when a segment is re-delivered).
  out = out.replace(/\b(.{6,40}?)\s+\1\b/giu, '$1');
  return out.trim();
}

/** Human-readable provider badge for the mode header. */
export function describeEngine(online: boolean, hasOfflinePack: boolean): string {
  if (!online) return hasOfflinePack ? 'بدون إنترنت · حزمة محمّلة' : 'بدون إنترنت · ترجمة محلية';
  return 'متصل · ترجمة فورية';
}

/* ──────────────────────────── conversation log ─────────────────────────── */

export interface WalkieTurn {
  id: string;
  speaker: 'A' | 'B';
  sourceLang: string;
  targetLang: string;
  original: string;
  translation: string;
  at: number;
}

/** Exports the conversation as a readable aligned transcript. */
export function exportTranscript(turns: WalkieTurn[], langA: string, langB: string): string {
  if (!turns.length) return '';
  const stamp = new Date().toLocaleString('ar');
  const head = [
    'محادثة مهدي للترجمة 2027 — الوضع الفوري',
    `اللغة الأولى: ${langA} · اللغة الثانية: ${langB}`,
    `التاريخ: ${stamp}`,
    '='.repeat(48),
    '',
  ].join('\n');
  const body = turns
    .map((turn, index) => {
      const who = turn.speaker === 'A' ? 'المتحدث ١' : 'المتحدث ٢';
      const label = `#${index + 1} · ${who} · ${turn.sourceLang} → ${turn.targetLang}`;
      return `${label}\n  الأصلي: ${turn.original}\n  الترجمة: ${turn.translation}`;
    })
    .join('\n\n');
  return `${head}${body}\n`;
}
