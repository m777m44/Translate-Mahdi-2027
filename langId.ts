/**
 * langId.ts — lightweight, fully offline language identification.
 *
 * Inspired by the FastText / Lingua detectors RTranslator 3.0 adopted to go
 * 100% open-source: a compact trigram frequency model built at module load
 * from embedded reference corpora, plus script-range signals for languages
 * whose writing systems are unambiguous. No network, no model download.
 */

export interface LangIdResult {
  lang: string;
  /** 0..1 confidence relative to the best candidate. */
  confidence: number;
}

const CORPORA: Record<string, string> = {
  en: 'the quick brown fox jumps over the lazy dog language translation conversation hello good morning thank you please where is the station how much does this cost I need help do you speak english what time is it today tomorrow yesterday water food hotel airport taxi doctor hospital emergency exit entrance open closed welcome excuse me sorry beautiful excellent',
  ar: 'السلام عليكم صباح الخير مساء الخير شكرا جزيلا من فضلك أين المحطة كم السعر أحتاج مساعدة هل تتحدث الإنجليزية كم الساعة اليوم غدا أمس ماء طعام فندق مطار سيارة أجرة طبيب مستشفى طوارئ مخرج مدخل مفتوح مغلق أهلا وسهلا المعذرة جميل ممتاز ترجمة محادثة لغة ثعلب بني سريع',
  fr: 'bonjour bonsoir merci beaucoup sil vous plaît où est la gare combien ça coûte j ai besoin d aide parlez vous anglais quelle heure est il aujourd hui demain hier eau nourriture hôtel aéroport taxi médecin hôpital urgence sortie entrée ouvert fermé bienvenue pardon beau excellent langue traduction conversation',
  es: 'buenos días buenas noches muchas gracias por favor dónde está la estación cuánto cuesta necesito ayuda habla inglés qué hora es hoy mañana ayer agua comida hotel aeropuerto taxi médico hospital emergencia salida entrada abierto cerrado bienvenida perdón hermoso excelente idioma traducción conversación',
  de: 'guten morgen guten abend vielen dank bitte wo ist der bahnhof wie viel kostet das ich brauche hilfe sprechen sie englisch wie spät ist es heute morgen gestern wasser essen hotel flughafen taxi arzt krankenhaus notfall ausgang eingang offen geschlossen willkommen entschuldigung schön ausgezeichnet sprache übersetzung',
  tr: 'günaydın iyi akşamlar çok teşekkür ederim lütfen istasyon nerede ne kadar yardım lazım ingilizce konuşuyor musunuz saat kaç bugün yarın dün su yemek otel havaalanı taksi doktor hastane acil çıkış giriş açık kapalı hoş geldiniz affedersiniz güzel mükemmel dil çeviri konuşma',
  ru: 'доброе утро добрый вечер большое спасибо пожалуйста где находится станция сколько это стоит мне нужна помощь вы говорите по английски который час сегодня завтра вчера вода еда отель аэропорт такси врач больница emergency выход вход открыт закрыто добро пожаловать извините красивый отличный язык перевод',
  it: 'buongiorno buonasera grazie mille per favore dov è la stazione quanto costa ho bisogno di aiuto parla inglese che ore sono oggi domani ieri acqua cibo albergo aeroporto taxi medico ospedale emergenza uscita ingresso aperto chiuso benvenuto scusa bello eccellente lingua traduzione conversazione',
  pt: 'bom dia boa noite muito obrigado por favor onde fica a estação quanto custa preciso de ajuda você fala inglês que horas são hoje amanhã ontem água comida hotel aeroporto táxi médico hospital emergência saída entrada aberto fechado bem vindo desculpe bonito excelente idioma tradução conversação',
  nl: 'goedemorgen goedenavond hartelijk dank alstublieft waar is het station hoeveel kost dit ik heb hulp nodig spreekt u engels hoe laat is het vandaag morgen gisteren water eten hotel luchthaven taxi dokter ziekenhuis nooduitgang ingang open gesloten welkom pardon mooi uitstekend taal vertaling gesprek',
  sv: 'god morgon god kväll tack så mycket snälla var är stationen hur mycket kostar det jag behöver hjälp talar du engelska vad är klockan idag i morgon går vatten mat hotell flygplats taxi läkare sjukhus utgång ingång öppen stängd välkommen ursäkta vacker utmärkt språk översättning samtal',
  pl: 'dzień dobry dobry wieczór dziękuję bardzo proszę gdzie jest stacja ile to kosztuje potrzebuję pomocy mówi pan po angielsku która godzina dzisiaj jutro wczoraj woda jedzenie hotel lotnisko taksówka lekarz szpital wyjście wejście otwarte zamknięte witam przepraszam piękny doskonały język tłumaczenie rozmowa',
  el: 'καλημέρα καληνύχτα ευχαριστώ πολύ παρακαλώ πού είναι ο σταθμός πόσο κοστίζει χρειάζομαι βοήθεια μιλάτε αγγλικά τι ώρα είναι σήμερα αύριο χθες νερό φαγητό ξενοδοχείο αεροδρόμιο ταξί γιατρός νοσοκομείο έξοδος είσοδος ανοιχτό κλειστό καλώς ήρθατε συγνώμη όμορφο εξαιρετικό γλώσσα μετάφραση',
  id: 'selamat pagi selamat malam terima kasih banyak silakan di mana stasiun berapa harganya saya butuh bantuan apakah Anda berbicara bahasa inggris jam berapa sekarang hari ini besok kemarin air makanan hotel bandara taksi dokter rumah sakit darurat keluar masuk buka tutup selamat datang maaf indah bagus bahasa terjemahan percakapan',
  fa: 'صبح بخیر شب بخیر بسیار متشکرم لطفا ایستگاه کجاست قیمت چقدر است به کمک نیاز دارم آیا انگلیسی صحبت می کنید ساعت چند است امروز فردا دیروز آب غذا هتل فرودگاه تاکسی پزشک بیمارستان اورژانس خروجی ورودی باز بسته خوش آمدید ببخشید زیبا عالی زبان ترجمه گفتگو',
  ur: 'صبح بخیر شب بخیر بہت شکریہ براہ کرم اسٹیشن کہاں ہے اس کی قیمت کتنی ہے مجھے مدد چاہیے کیا آپ انگریزی بولتے ہیں ابھی کتنے بجے ہیں آج کل پرسوں پانی کھانا ہوٹل ہوائی اڈا ٹیکسی ڈاکٹر ہسپتال ایمرجنسی راستہ دروازہ کھلا بند خوش آمدید معاف کیجیے خوبصورت بہترین زبان ترجمہ گفتگو',
  hi: 'सुप्रभात शुभ रात्रि बहुत धन्यवाद कृपया स्टेशन कहाँ है इसका दाम क्या है मुझे मदद चाहिए क्या आप अंग्रेज़ी बोलते हैं अभी कितने बजे हैं आज कल बीता कल पानी खाना होटल हवाई अड्डा टैक्सी डॉक्टर अस्पताल आपात निकास प्रवेश खुला बंद स्वागत क्षमा सुंदर उत्तम भाषा अनुवाद बातचीत',
};

type Profile = Map<string, number>;
const profiles = new Map<string, Profile>();

function trigrams(text: string): string[] {
  const normalized = ` ${text.toLowerCase().replace(/\s+/g, ' ').trim()} `;
  const out: string[] = [];
  for (let i = 0; i <= normalized.length - 3; i++) {
    const tri = normalized.slice(i, i + 3);
    if (!tri.includes('\n')) out.push(tri);
  }
  return out;
}

function buildProfile(corpus: string): Profile {
  const counts = new Map<string, number>();
  for (const tri of trigrams(corpus)) {
    counts.set(tri, (counts.get(tri) || 0) + 1);
  }
  // Keep the strongest signals to keep memory tiny.
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 120));
}

for (const [lang, corpus] of Object.entries(CORPORA)) {
  profiles.set(lang, buildProfile(corpus));
}

function scriptBoost(text: string): Record<string, number> {
  const boosts: Record<string, number> = {};
  const add = (lang: string, weight: number) => { boosts[lang] = (boosts[lang] || 0) + weight; };
  for (const ch of text) {
    const code = ch.codePointAt(0) || 0;
    if (code >= 0x0600 && code <= 0x06ff) add('ar', 2);
    else if (code >= 0x0750 && code <= 0x077f) add('ar', 2);
    else if (code >= 0xfb50 && code <= 0xfdff) add('ar', 2);
    else if (code >= 0x0400 && code <= 0x04ff) add('ru', 2);
    else if (code >= 0x3040 && code <= 0x309f) add('ja', 4); // Hiragana
    else if (code >= 0x30a0 && code <= 0x30ff) add('ja', 4); // Katakana
    else if (code >= 0xac00 && code <= 0xd7af) add('ko', 4); // Hangul
    else if (code >= 0x4e00 && code <= 0x9fff) add('zh', 1); // Han
    else if (code >= 0x0900 && code <= 0x097f) add('hi', 4); // Devanagari
    else if (code >= 0x0370 && code <= 0x03ff) add('el', 3); // Greek
  }
  return boosts;
}

/** Identify the language of a piece of text, best candidate first. */
export function identifyLanguage(text: string, topK = 3): LangIdResult[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  const inputTrigrams = trigrams(clean);
  if (inputTrigrams.length === 0) return [];
  const inputSet = new Set(inputTrigrams);
  const boosts = scriptBoost(clean);
  const scores: Record<string, number> = {};

  for (const [lang, profile] of profiles) {
    let score = boosts[lang] || 0;
    for (const tri of inputSet) {
      const weight = profile.get(tri);
      if (weight) score += weight;
    }
    scores[lang] = score;
  }

  // Han-only text without kana defaults to Chinese; Hangul-only to Korean.
  if (boosts.zh && !boosts.ja) scores.zh = (scores.zh || 0) + 6;
  if (boosts.ko) scores.ko = (scores.ko || 0) + 6;
  // Persian/Urdu share Arabic script — trigram overlap decides, ensure they rank.
  if (boosts.ar) {
    scores.fa = (scores.fa || 0) + 1;
    scores.ur = (scores.ur || 0) + 1;
  }

  const ranked = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);

  if (ranked.length === 0) return [{ lang: 'en', confidence: 0 }];
  const best = ranked[0][1];
  return ranked.map(([lang, score]) => ({
    lang,
    confidence: best > 0 ? Math.round((score / best) * 100) / 100 : 0,
  }));
}

/** Convenience: single best language code. */
export function detectLang(text: string): string {
  return identifyLanguage(text, 1)[0]?.lang || 'en';
}
