/**
 * transliterate.ts — script-level fallback so a translation is NEVER returned
 * as a mixed-script string (e.g. "مهدي Heroes ahmed").
 *
 * When the dictionary/MT engine cannot translate a word, we render it in the
 * TARGET language's writing system:
 *   • Latin → Arabic  : rule-based Arabization with a common-names lexicon
 *   • Arabic → Latin  : readable romanization
 *
 * The module is fully offline, dependency-free and conservative: tokens that
 * look like URLs, e-mails, handles, code identifiers or numbers are preserved
 * untouched by the text-level helper.
 */

/* ------------------------------------------------------------------ */
/* Script detection                                                    */
/* ------------------------------------------------------------------ */

const LATIN_RE = /[A-Za-z]/;
const ARABIC_RE = /[؀-ۿ]/;
const ARABIC_TARGETS = new Set(['ar', 'fa', 'ur']);

export function isArabicScript(s: string): boolean {
  return ARABIC_RE.test(s);
}

export function isLatinScript(s: string): boolean {
  return LATIN_RE.test(s) && !isArabicScript(s);
}

export function targetUsesArabicScript(lang: string): boolean {
  return ARABIC_TARGETS.has(lang) || lang.startsWith('ar-');
}

/* ------------------------------------------------------------------ */
/* Common proper names (always win over rule-based Arabization)        */
/* ------------------------------------------------------------------ */

export const NAMES_EN_AR: Record<string, string> = {
  mahdi: 'مهدي', ahmed: 'أحمد', ahmad: 'أحمد', mohammad: 'محمد', mohammed: 'محمد',
  muhammad: 'محمد', mohamed: 'محمد', ali: 'علي', hussein: 'حسين', husain: 'حسين',
  hussain: 'حسين', hassan: 'حسن', husam: 'حسام', omar: 'عمر', othman: 'عثمان',
  osman: 'عثمان', fatima: 'فاطمة', fatma: 'فاطمة', zeinab: 'زينب', zainab: 'زينب',
  mary: 'مريم', maria: 'مريم', mariam: 'مريم', yusuf: 'يوسف', youssef: 'يوسف',
  joseph: 'يوسف', ibrahim: 'إبراهيم', abraham: 'إبراهيم', adam: 'آدم', noah: 'نوح',
  musa: 'موسى', moses: 'موسى', isa: 'عيسى', jesus: 'عيسى', david: 'داود',
  dawud: 'داود', sulaiman: 'سليمان', solomon: 'سليمان', sarah: 'سارة', sara: 'سارة',
  huda: 'هدى', noor: 'نور', nour: 'نور', aya: 'آية', ayah: 'آية', reem: 'ريم',
  layla: 'ليلى', leila: 'ليلى', salma: 'سلمى', khalid: 'خالد', walid: 'وليد',
  tarek: 'طارق', tariq: 'طارق', zaid: 'زيد', zayd: 'زيد', hamza: 'حمزة',
  karim: 'كريم', rahim: 'رحيم', malik: 'ملك', amir: 'أمير', ameer: 'أمير',
  samir: 'سمير', bashar: 'بشار', mazin: 'مازن', younis: 'يونس', yunus: 'يونس',
  ayman: 'أيمن', amin: 'أمين', ameen: 'أمين', faris: 'فارس', saif: 'سيف',
  salah: 'صلاح', salih: 'صالح', jad: 'جاد', jawad: 'جواد', ramy: 'رامي',
  rami: 'رامي', sami: 'سامي', adel: 'عادل', adil: 'عادل', nader: 'نادر',
  monther: 'منذر', muhannad: 'مهند', mohannad: 'مهند', mustafa: 'مصطفى',
  mortada: 'مرتضى', mujtaba: 'مجتبى', jaafar: 'جعفر', jaffer: 'جعفر',
  abdullah: 'عبد الله', abdallah: 'عبد الله', abdelrahman: 'عبد الرحمن',
  abdulrahman: 'عبد الرحمن', abdelaziz: 'عبد العزيز', abdulaziz: 'عبد العزيز',
  abdelkader: 'عبد القادر', abdulkader: 'عبد القادر', abdelkarim: 'عبد الكريم',
  rahman: 'رحمن', raheeq: 'رهيق', duniya: 'دنيا', dunya: 'دنيا', marwa: 'مروة',
  haya: 'هيا', hanin: 'حنين', haneen: 'حنين', rana: 'رنا', raneem: 'رنيم',
  shahd: 'شهد', shahed: 'شاهد', tasneem: 'تسنيم', tawfik: 'توفيق', toufiq: 'توفيق',
  waleed: 'وليد', yasmin: 'ياسمين', yasmine: 'ياسمين', jana: 'جنا', joudi: 'جودي',
  judy: 'جودي', malak: 'ملاك', nada: 'ندى', narjis: 'نرجس', razan: 'روزان',
  roa: 'رؤى', ruaa: 'رؤى', siba: 'صبا', sabaa: 'صبا', warood: 'ورود',
  // International names frequently encountered
  james: 'جيمس', john: 'جون', robert: 'روبرت', michael: 'مايكل',
  william: 'ويليام', richard: 'ريتشارد', thomas: 'توماس', charles: 'تشارلز',
  daniel: 'دانيال', matthew: 'ماثيو', anthony: 'أنطوني', mark: 'مارك',
  paul: 'بول', steven: 'ستيفن', andrew: 'أندرو', peter: 'بيتر', george: 'جورج',
  kevin: 'كيفن', brian: 'براين', edward: 'إدوارد', ronald: 'رونالد', jason: 'جيسون',
  emma: 'إيما', olivia: 'أوليفيا', sophia: 'صوفيا', isabella: 'إيزابيلا',
  charlotte: 'شارلوت', amelia: 'أميليا', harper: 'هاربر', evelyn: 'إيفلين',
  abigail: 'أبيغيل', emily: 'إميلي', elizabeth: 'إليزابيث', sofia: 'صوفيا',
  madison: 'ماديسون', avery: 'أفيري', ella: 'إيلا', scarlett: 'سكارليت',
  grace: 'غرايس', chloe: 'كلوي', victoria: 'فيكتوريا', rihanna: 'ريهانا',
};

/* ------------------------------------------------------------------ */
/* Latin → Arabic rule-based engine                                    */
/* ------------------------------------------------------------------ */

// Multi-letter sequences checked greedily (longest first).
const DIGRAPHS: Array<[string, string]> = [
  ['tch', 'تش'], ['sch', 'ش'], ['dge', 'ج'], ['ck', 'ك'],
  ['sh', 'ش'], ['th', 'ث'], ['kh', 'خ'], ['gh', 'غ'], ['ph', 'ف'],
  ['qu', 'ك'], ['ch', 'تش'], ['oo', 'و'], ['ee', 'ي'], ['ea', 'ي'],
  ['ou', 'او'], ['ow', 'او'], ['aw', 'او'], ['ew', 'يو'], ['au', 'او'],
  ['ai', 'ي'], ['ay', 'ي'], ['ey', 'ي'], ['ie', 'ي'], ['igh', 'اي'],
  ['ng', 'نغ'], ['nk', 'نك'], ['ll', 'ل'], ['tt', 'ت'], ['ss', 'س'],
  ['mm', 'م'], ['nn', 'ن'], ['bb', 'ب'], ['dd', 'د'], ['ff', 'ف'],
  ['gg', 'غ'], ['pp', 'ب'], ['rr', 'ر'], ['zz', 'ز'], ['cc', 'ك'],
];

const LETTER_MAP: Record<string, string> = {
  a: 'ا', b: 'ب', c: 'ك', d: 'د', e: 'ه', f: 'ف', g: 'غ', h: 'ه',
  i: 'ي', j: 'ج', k: 'ك', l: 'ل', m: 'م', n: 'ن', o: 'و', p: 'ب',
  q: 'ق', r: 'ر', s: 'س', t: 'ت', u: 'و', v: 'ف', w: 'و', x: 'كس',
  y: 'ي', z: 'ز',
};

// Word-initial vowels carry a hamza.
const INITIAL_VOWEL: Record<string, string> = {
  a: 'أ', e: 'إ', i: 'إ', o: 'أو', u: 'أو',
};

function arabizeWord(raw: string): string {
  const original = raw;
  const lower = raw.toLowerCase();

  // 1. Exact name/lexicon match (includes hyphen-stripped variants).
  const flat = lower.replace(/['’-]/g, '');
  if (NAMES_EN_AR[lower]) return NAMES_EN_AR[lower];
  if (NAMES_EN_AR[flat]) return NAMES_EN_AR[flat];

  // 2. "al"/"el" definite article prefix.
  let rest = lower;
  let prefix = '';
  if (/^[ae]l[- ]/.test(rest)) {
    prefix = 'ال';
    rest = rest.slice(3);
  }

  // 3. Greedy digraph + single-letter scan.
  let out = '';
  let i = 0;
  while (i < rest.length) {
    const ch = rest[i];
    if (!/[a-z]/.test(ch)) { i += 1; continue; }

    let matched: string | null = null;
    for (const [seq, ar] of DIGRAPHS) {
      if (rest.startsWith(seq, i)) {
        matched = ar;
        i += seq.length;
        break;
      }
    }
    if (matched !== null) {
      out += matched;
      continue;
    }

    // Word-initial vowel → hamza form.
    if (i === 0 && INITIAL_VOWEL[ch]) {
      out += INITIAL_VOWEL[ch];
      i += 1;
      continue;
    }

    // Silent trailing 'e'.
    if (ch === 'e' && i === rest.length - 1) { i += 1; continue; }

    out += LETTER_MAP[ch] || ch;
    i += 1;
  }

  const result = prefix + out;
  // Capitalised source word but empty output guard — never return ''.
  return result || original;
}

/* ------------------------------------------------------------------ */
/* Arabic → Latin romanization                                         */
/* ------------------------------------------------------------------ */

const AR2LAT: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ء: '', ؤ: 'w', ئ: 'e',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh',
  ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', ة: 'a', و: 'w', ي: 'y', ى: 'a',
};

// Common Arabic names rendered in their conventional English spelling.
const AR_NAMES_EN: Record<string, string> = {
  أحمد: 'Ahmed', محمد: 'Mohammed', مهدي: 'Mahdi', علي: 'Ali', حسن: 'Hassan',
  حسين: 'Hussein', عمر: 'Omar', عثمان: 'Othman', فاطمة: 'Fatima', زينب: 'Zainab',
  مريم: 'Mariam', يوسف: 'Youssef', إبراهيم: 'Ibrahim', ابراهيم: 'Ibrahim',
  آدم: 'Adam', نوح: 'Noah', موسى: 'Musa', عيسى: 'Isa', داود: 'Dawud',
  سليمان: 'Sulaiman', سارة: 'Sarah', نور: 'Noor', هدى: 'Huda', خالد: 'Khalid',
  وليد: 'Walid', طارق: 'Tariq', حمزة: 'Hamza', كريم: 'Karim', مصطفى: 'Mustafa',
  عبدالله: 'Abdullah', ياسمين: 'Yasmin', ليلى: 'Layla', سلمى: 'Salma',
  أيمن: 'Ayman', أمين: 'Amin', فارس: 'Fares', صلاح: 'Salah', صالح: 'Saleh',
  رامي: 'Ramy', سامي: 'Sami', عادل: 'Adel', نادر: 'Nader', مهند: 'Muhannad',
  جعفر: 'Jaafar', رنا: 'Rana', شهد: 'Shahd', تسنيم: 'Tasneem', حنين: 'Haneen',
  مروة: 'Marwa', هيا: 'Haya', ندى: 'Nada', دانيا: 'Dania', تالا: 'Tala',
};

function romanizeWord(raw: string): string {
  // 1. Conventional name spelling wins over letter-by-letter romanization.
  if (AR_NAMES_EN[raw]) return AR_NAMES_EN[raw];
  const normalized = raw.replace(/[ً-ٟ]/g, '').replace(/أ|إ|آ/g, 'ا').replace(/ة/g, 'ه');
  if (AR_NAMES_EN[normalized]) return AR_NAMES_EN[normalized];

  let out = '';
  for (const ch of raw) {
    if (AR2LAT[ch] !== undefined) out += AR2LAT[ch];
    else if (/\s/.test(ch)) out += ' ';
    else out += ch; // punctuation/digits preserved
  }
  return out.replace(/([^aeiouyw\s])\1+/g, '$1') || raw;
}

/* ------------------------------------------------------------------ */
/* Token-level public API                                              */
/* ------------------------------------------------------------------ */

/** Transliterate a single word into the target language's script. */
export function transliterateWord(word: string, targetLang: string): string {
  if (!word) return word;
  if (targetUsesArabicScript(targetLang) && isLatinScript(word)) {
    return arabizeWord(word);
  }
  if (!targetUsesArabicScript(targetLang) && isArabicScript(word)) {
    return romanizeWord(word);
  }
  return word;
}

/** A token is "protected" when it is structural, not natural language. */
function isProtectedToken(token: string): boolean {
  return (
    /[@#/_\\]/.test(token) ||
    /\.(com|net|org|io|app|dev|me|gov|edu)\b/i.test(token) ||
    /^https?:/i.test(token) ||
    /^\d/.test(token) ||
    /\d/.test(token) && /[A-Za-z]/.test(token) // e.g. iPhone5, G20
  );
}

/**
 * Rewrite any residual source-script words of a finished translation into the
 * target script. Protected tokens (URLs, e-mails, handles, mixed alphanumerics)
 * and punctuation are preserved. This guarantees no mixed-script output for
 * natural-language sentences.
 */
export function ensureTargetScript(text: string, targetLang: string): string {
  if (!text) return text;
  const wantArabic = targetUsesArabicScript(targetLang);
  // Split but keep separators so spacing/punctuation survive byte-for-byte.
  return text
    .split(/(\s+)/)
    .map((token) => {
      if (!token.trim() || isProtectedToken(token)) return token;
      const letters = token.replace(/[^\p{L}]/gu, '');
      if (!letters) return token;
      const needsArabic = wantArabic && /^[A-Za-z'’-]+$/.test(letters) && !isArabicScript(letters);
      const needsLatin = !wantArabic && isArabicScript(letters) && !/[A-Za-z]/.test(letters);
      if (!needsArabic && !needsLatin) return token;

      // Keep leading/trailing punctuation attached.
      const m = token.match(/^([^\p{L}]*)([\p{L}'’-]+)([^\p{L}]*)$/u);
      if (!m) return token;
      return m[1] + transliterateWord(m[2], targetLang) + m[3];
    })
    .join('');
}

/* ------------------------------------------------------------------ */
/* Arabic output beautification                                        */
/* ------------------------------------------------------------------ */

/** Normalise punctuation/spacing of an Arabic-target translation. */
export function beautifyArabic(text: string, targetLang: string): string {
  if (!text || !targetUsesArabicScript(targetLang)) return text;
  return text
    .replace(/\s+([،؟!؛?,;:.%)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    // Convert Latin punctuation to Arabic only when it is not part of a number
    // (keep "1,000" / "3.14" intact).
    .replace(/(?<!\d),(?!\d)/g, '،')
    .replace(/(?<!\d);(?!\d)/g, '؛')
    .replace(/\?/g, '؟')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
