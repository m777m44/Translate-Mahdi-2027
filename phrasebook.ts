/**
 * phrasebook.ts — offline travel/emergency phrase bank + user phrasebook +
 * Leitner flashcard reviews. Mirrors RTranslator 3.0's multilingual dictionary
 * and Tatoeba integration, but fully embedded (works in the APK with no
 * network) and extendable with the user's own saved phrases.
 */

export type PhraseCategory =
  | 'greetings'
  | 'travel'
  | 'emergency'
  | 'dining'
  | 'shopping'
  | 'directions'
  | 'medical'
  | 'common';

export interface PhraseEntry {
  id: string;
  category: PhraseCategory;
  /** Key = ISO language code. Always includes at least ar + en. */
  translations: Record<string, string>;
}

export const PHRASE_CATEGORIES: Array<{ id: PhraseCategory; nameAr: string; icon: string }> = [
  { id: 'greetings', nameAr: 'تحيات وتعارف', icon: 'Hand' },
  { id: 'travel', nameAr: 'سفر ومطارات', icon: 'Plane' },
  { id: 'emergency', nameAr: 'طوارئ ومساعدة', icon: 'Siren' },
  { id: 'dining', nameAr: 'مطاعم وطعام', icon: 'UtensilsCrossed' },
  { id: 'shopping', nameAr: 'تسوق وأسعار', icon: 'ShoppingBag' },
  { id: 'directions', nameAr: 'اتجاهات ومواصلات', icon: 'MapPin' },
  { id: 'medical', nameAr: 'صيدلة وطب', icon: 'Stethoscope' },
  { id: 'common', nameAr: 'عبارات شائعة', icon: 'MessagesSquare' },
];

/**
 * Curated bilingual+ phrase bank. Each entry carries 8 languages; the UI falls
 * back to English when a language is missing.
 */
export const BUILTIN_PHRASES: PhraseEntry[] = [
  // ---- Greetings ----
  { id: 'g1', category: 'greetings', translations: { ar: 'مرحباً، كيف حالك؟', en: 'Hello, how are you?', fr: 'Bonjour, comment allez-vous ?', es: 'Hola, ¿cómo está?', de: 'Hallo, wie geht es Ihnen?', tr: 'Merhaba, nasılsınız?', ru: 'Здравствуйте, как дела?', zh: '你好，你好吗？' } },
  { id: 'g2', category: 'greetings', translations: { ar: 'صباح الخير', en: 'Good morning', fr: 'Bonjour', es: 'Buenos días', de: 'Guten Morgen', tr: 'Günaydın', ru: 'Доброе утро', zh: '早上好' } },
  { id: 'g3', category: 'greetings', translations: { ar: 'مساء الخير', en: 'Good evening', fr: 'Bonsoir', es: 'Buenas noches', de: 'Guten Abend', tr: 'İyi akşamlar', ru: 'Добрый вечер', zh: '晚上好' } },
  { id: 'g4', category: 'greetings', translations: { ar: 'شكراً جزيلاً', en: 'Thank you very much', fr: 'Merci beaucoup', es: 'Muchas gracias', de: 'Vielen Dank', tr: 'Çok teşekkür ederim', ru: 'Большое спасибо', zh: '非常感谢' } },
  { id: 'g5', category: 'greetings', translations: { ar: 'عفواً / على الرحب والسعة', en: 'You are welcome', fr: 'Je vous en prie', es: 'De nada', de: 'Gern geschehen', tr: 'Rica ederim', ru: 'Пожалуйста', zh: '不客气' } },
  { id: 'g6', category: 'greetings', translations: { ar: 'معذرةً، ما اسمك؟', en: 'Excuse me, what is your name?', fr: 'Excusez-moi, comment vous appelez-vous ?', es: 'Disculpe, ¿cómo se llama?', de: 'Entschuldigung, wie heißen Sie?', tr: 'Affedersiniz, adınız ne?', ru: 'Простите, как вас зовут?', zh: '请问，您叫什么名字？' } },
  { id: 'g7', category: 'greetings', translations: { ar: 'تشرفت بمعرفتك', en: 'Nice to meet you', fr: 'Enchanté de vous rencontrer', es: 'Encantado de conocerle', de: 'Freut mich, Sie kennenzulernen', tr: 'Tanıştığımıza memnun oldum', ru: 'Приятно познакомиться', zh: '很高兴认识你' } },
  { id: 'g8', category: 'greetings', translations: { ar: 'إلى اللقاء', en: 'Goodbye', fr: 'Au revoir', es: 'Adiós', de: 'Auf Wiedersehen', tr: 'Hoşça kalın', ru: 'До свидания', zh: '再见' } },

  // ---- Travel ----
  { id: 't1', category: 'travel', translations: { ar: 'أين المطار؟', en: 'Where is the airport?', fr: 'Où est l aéroport ?', es: '¿Dónde está el aeropuerto?', de: 'Wo ist der Flughafen?', tr: 'Havalimanı nerede?', ru: 'Где аэропорт?', zh: '机场在哪里？' } },
  { id: 't2', category: 'travel', translations: { ar: 'أريد تذكرة إلى ...', en: 'I would like a ticket to ...', fr: 'Je voudrais un billet pour ...', es: 'Quisiera un billete para ...', de: 'Ich möchte ein Ticket nach ...', tr: '... için bir bilet istiyorum', ru: 'Мне нужен билет до ...', zh: '我要买一张去……的票' } },
  { id: 't3', category: 'travel', translations: { ar: 'متى تغادر الرحلة؟', en: 'When does the flight depart?', fr: 'Quand part le vol ?', es: '¿Cuándo sale el vuelo?', de: 'Wann geht der Flug?', tr: 'Uçak ne zaman kalkıyor?', ru: 'Когда вылетает рейс?', zh: '航班什么时候起飞？' } },
  { id: 't4', category: 'travel', translations: { ar: 'أين جواز السفر؟', en: 'Where is the passport control?', fr: 'Où est le contrôle des passeports ?', es: '¿Dónde está el control de pasaportes?', de: 'Wo ist die Passkontrolle?', tr: 'Pasaport kontrolü nerede?', ru: 'Где паспортный контроль?', zh: '边检在哪里？' } },
  { id: 't5', category: 'travel', translations: { ar: 'أين محطة القطار؟', en: 'Where is the train station?', fr: 'Où est la gare ?', es: '¿Dónde está la estación de tren?', de: 'Wo ist der Bahnhof?', tr: 'Tren istasyonu nerede?', ru: 'Где железнодорожный вокзал?', zh: '火车站在哪里？' } },
  { id: 't6', category: 'travel', translations: { ar: 'أريد سيارة أجرة من فضلك', en: 'I need a taxi, please', fr: 'Je voudrais un taxi, s il vous plaît', es: 'Necesito un taxi, por favor', de: 'Ich brauche bitte ein Taxi', tr: 'Lütfen bir taksi istiyorum', ru: 'Мне нужно такси, пожалуйста', zh: '请帮我叫辆出租车' } },
  { id: 't7', category: 'travel', translations: { ar: 'هذه حقائبي', en: 'These are my suitcases', fr: 'Voici mes valises', es: 'Estas son mis maletas', de: 'Das sind meine Koffer', tr: 'Bunlar benim valizlerim', ru: 'Это мой багаж', zh: '这是我的行李' } },
  { id: 't8', category: 'travel', translations: { ar: 'هل توجد تأشيرة مطلوبة؟', en: 'Is a visa required?', fr: 'Un visa est-il nécessaire ?', es: '¿Se necesita visado?', de: 'Ist ein Visum erforderlich?', tr: 'Vize gerekiyor mu?', ru: 'Нужна ли виза?', zh: '需要签证吗？' } },

  // ---- Emergency ----
  { id: 'e1', category: 'emergency', translations: { ar: 'النجدة! ساعدوني!', en: 'Help!', fr: 'Au secours !', es: '¡Socorro!', de: 'Hilfe!', tr: 'İmdat! Yardım edin!', ru: 'Помогите!', zh: '救命！' } },
  { id: 'e2', category: 'emergency', translations: { ar: 'اتصل بالإسعاف فوراً', en: 'Call an ambulance immediately', fr: 'Appelez une ambulance immédiatement', es: 'Llame a una ambulancia ahora', de: 'Rufen Sie sofort einen Krankenwagen', tr: 'Hemen ambulans çağırın', ru: 'Срочно вызовите скорую', zh: '马上叫救护车' } },
  { id: 'e3', category: 'emergency', translations: { ar: 'اتصل بالشرطة', en: 'Call the police', fr: 'Appelez la police', es: 'Llame a la policía', de: 'Rufen Sie die Polizei', tr: 'Polisi çağırın', ru: 'Вызовите полицию', zh: '报警' } },
  { id: 'e4', category: 'emergency', translations: { ar: 'لقد ضاعت محفظتي', en: 'I have lost my wallet', fr: 'J ai perdu mon portefeuille', es: 'He perdido mi cartera', de: 'Ich habe meine Brieftasche verloren', tr: 'Cüzdanımı kaybettim', ru: 'Я потерял кошелёк', zh: '我的钱包丢了' } },
  { id: 'e5', category: 'emergency', translations: { ar: 'أين أقرب مستشفى؟', en: 'Where is the nearest hospital?', fr: 'Où est l hôpital le plus proche ?', es: '¿Dónde está el hospital más cercano?', de: 'Wo ist das nächste Krankenhaus?', tr: 'En yakın hastane nerede?', ru: 'Где ближайшая больница?', zh: '最近的医院在哪里？' } },
  { id: 'e6', category: 'emergency', translations: { ar: 'أنا ضائع / ضائعة', en: 'I am lost', fr: 'Je suis perdu', es: 'Estoy perdido', de: 'Ich habe mich verlaufen', tr: 'Kayboldum', ru: 'Я заблудился', zh: '我迷路了' } },
  { id: 'e7', category: 'emergency', translations: { ar: 'رقم الطوارئ لديكم؟', en: 'What is your emergency number?', fr: 'Quel est votre numéro d urgence ?', es: '¿Cuál es su número de emergencia?', de: 'Wie ist Ihre Notrufnummer?', tr: 'Acil durum numaranız nedir?', ru: 'Какой у вас номер экстренной службы?', zh: '你们的紧急电话是多少？' } },

  // ---- Dining ----
  { id: 'd1', category: 'dining', translations: { ar: 'أريد طاولة لشخصين', en: 'A table for two, please', fr: 'Une table pour deux, s il vous plaît', es: 'Una mesa para dos, por favor', de: 'Einen Tisch für zwei, bitte', tr: 'İki kişilik bir masa lütfen', ru: 'Столик на двоих, пожалуйста', zh: '请给我一张两人桌' } },
  { id: 'd2', category: 'dining', translations: { ar: 'القائمة من فضلك', en: 'The menu, please', fr: 'La carte, s il vous plaît', es: 'El menú, por favor', de: 'Die Speisekarte, bitte', tr: 'Menü lütfen', ru: 'Меню, пожалуйста', zh: '请给我菜单' } },
  { id: 'd3', category: 'dining', translations: { ar: 'لدي حساسية من ...', en: 'I am allergic to ...', fr: 'Je suis allergique à ...', es: 'Soy alérgico a ...', de: 'Ich bin allergisch gegen ...', tr: '... alerjim var', ru: 'У меня аллергия на ...', zh: '我对……过敏' } },
  { id: 'd4', category: 'dining', translations: { ar: 'بدون لحم من فضلك', en: 'No meat, please', fr: 'Sans viande, s il vous plaît', es: 'Sin carne, por favor', de: 'Kein Fleisch, bitte', tr: 'Etsiz lütfen', ru: 'Без мяса, пожалуйста', zh: '请不要肉' } },
  { id: 'd5', category: 'dining', translations: { ar: 'الحساب من فضلك', en: 'The bill, please', fr: 'L addition, s il vous plaît', es: 'La cuenta, por favor', de: 'Die Rechnung, bitte', tr: 'Hesap lütfen', ru: 'Счёт, пожалуйста', zh: '请结账' } },
  { id: 'd6', category: 'dining', translations: { ar: 'كان الطعام لذيذاً', en: 'The food was delicious', fr: 'C était délicieux', es: 'La comida estuvo deliciosa', de: 'Das Essen war köstlich', tr: 'Yemek lezzetliydi', ru: 'Еда была вкусной', zh: '饭菜很好吃' } },
  { id: 'd7', category: 'dining', translations: { ar: 'ماء من فضلك', en: 'Water, please', fr: 'De l eau, s il vous plaît', es: 'Agua, por favor', de: 'Wasser, bitte', tr: 'Su lütfen', ru: 'Воды, пожалуйста', zh: '请给我水' } },

  // ---- Shopping ----
  { id: 's1', category: 'shopping', translations: { ar: 'كم ثمن هذا؟', en: 'How much is this?', fr: 'Combien ça coûte ?', es: '¿Cuánto cuesta esto?', de: 'Was kostet das?', tr: 'Bu ne kadar?', ru: 'Сколько это стоит?', zh: '这个多少钱？' } },
  { id: 's2', category: 'shopping', translations: { ar: 'هل يوجد تخفيض؟', en: 'Is there a discount?', fr: 'Y a-t-il une réduction ?', es: '¿Hay algún descuento?', de: 'Gibt es einen Rabatt?', tr: 'İndirim var mı?', ru: 'Есть скидка?', zh: '有折扣吗？' } },
  { id: 's3', category: 'shopping', translations: { ar: 'هل تقبلون البطاقة؟', en: 'Do you accept cards?', fr: 'Acceptez-vous les cartes ?', es: '¿Aceptan tarjetas?', de: 'Akzeptieren Sie Karten?', tr: 'Kart kabul ediyor musunuz?', ru: 'Вы принимаете карты?', zh: '可以刷卡吗？' } },
  { id: 's4', category: 'shopping', translations: { ar: 'أريد مقاساً أكبر', en: 'I need a larger size', fr: 'Je voudrais une taille au-dessus', es: 'Necesito una talla más grande', de: 'Ich brauche eine größere Größe', tr: 'Daha büyük bir beden istiyorum', ru: 'Мне нужен размер побольше', zh: '我要大一号' } },
  { id: 's5', category: 'shopping', translations: { ar: 'هل يمكنني إرجاعه؟', en: 'Can I return this?', fr: 'Puis-je le retourner ?', es: '¿Puedo devolverlo?', de: 'Kann ich das zurückgeben?', tr: 'Bunu iade edebilir miyim?', ru: 'Можно это вернуть?', zh: '可以退货吗？' } },
  { id: 's6', category: 'shopping', translations: { ar: 'سأشتريه', en: 'I will take it', fr: 'Je le prends', es: 'Me lo llevo', de: 'Ich nehme es', tr: 'Onu alıyorum', ru: 'Я это беру', zh: '我买了' } },

  // ---- Directions ----
  { id: 'x1', category: 'directions', translations: { ar: 'أين الفندق؟', en: 'Where is the hotel?', fr: 'Où est l hôtel ?', es: '¿Dónde está el hotel?', de: 'Wo ist das Hotel?', tr: 'Otel nerede?', ru: 'Где отель?', zh: '酒店在哪里？' } },
  { id: 'x2', category: 'directions', translations: { ar: 'اذهب يميناً', en: 'Turn right', fr: 'Tournez à droite', es: 'Gire a la derecha', de: 'Biegen Sie rechts ab', tr: 'Sağa dönün', ru: 'Поверните направо', zh: '右转' } },
  { id: 'x3', category: 'directions', translations: { ar: 'اذهب يساراً', en: 'Turn left', fr: 'Tournez à gauche', es: 'Gire a la izquierda', de: 'Biegen Sie links ab', tr: 'Sola dönün', ru: 'Поверните налево', zh: '左转' } },
  { id: 'x4', category: 'directions', translations: { ar: 'هل هو بعيد من هنا؟', en: 'Is it far from here?', fr: 'C est loin d ici ?', es: '¿Está lejos de aquí?', de: 'Ist es weit von hier?', tr: 'Buradan uzak mı?', ru: 'Это далеко отсюда?', zh: '离这里远吗？' } },
  { id: 'x5', category: 'directions', translations: { ar: 'محطة المترو أين؟', en: 'Where is the metro station?', fr: 'Où est la station de métro ?', es: '¿Dónde está el metro?', de: 'Wo ist die U-Bahn?', tr: 'Metro istasyonu nerede?', ru: 'Где станция метро?', zh: '地铁站在哪里？' } },
  { id: 'x6', category: 'directions', translations: { ar: 'أنا أنزل في المحطة القادمة', en: 'I get off at the next stop', fr: 'Je descends au prochain arrêt', es: 'Bajo en la próxima parada', de: 'Ich steige an der nächsten Haltestelle aus', tr: 'Bir sonraki durakta iniyorum', ru: 'Я выхожу на следующей остановке', zh: '我下一站下车' } },

  // ---- Medical ----
  { id: 'm1', category: 'medical', translations: { ar: 'أشعر بألم في الصدر', en: 'I have chest pain', fr: 'J ai une douleur à la poitrine', es: 'Tengo dolor en el pecho', de: 'Ich habe Brustschmerzen', tr: 'Göğüs ağrım var', ru: 'У меня боль в груди', zh: '我胸痛' } },
  { id: 'm2', category: 'medical', translations: { ar: 'أنا مريض / مريضة', en: 'I am feeling sick', fr: 'Je me sens malade', es: 'Me siento enfermo', de: 'Ich fühle mich krank', tr: 'Kendimi hasta hissediyorum', ru: 'Я плохо себя чувствую', zh: '我不舒服' } },
  { id: 'm3', category: 'medical', translations: { ar: 'أحتاج دواءً', en: 'I need medicine', fr: 'J ai besoin de médicaments', es: 'Necesito medicina', de: 'Ich brauche Medizin', tr: 'İlaca ihtiyacım var', ru: 'Мне нужны лекарства', zh: '我需要药' } },
  { id: 'm4', category: 'medical', translations: { ar: 'أين الصيدلية؟', en: 'Where is the pharmacy?', fr: 'Où est la pharmacie ?', es: '¿Dónde está la farmacia?', de: 'Wo ist die Apotheke?', tr: 'Eczane nerede?', ru: 'Где аптека?', zh: '药店在哪里？' } },
  { id: 'm5', category: 'medical', translations: { ar: 'فصيلة دمي ...', en: 'My blood type is ...', fr: 'Mon groupe sanguin est ...', es: 'Mi grupo sanguíneo es ...', de: 'Meine Blutgruppe ist ...', tr: 'Kan grubum ...', ru: 'Моя группа крови ...', zh: '我的血型是……' } },
  { id: 'm6', category: 'medical', translations: { ar: 'أنا أعاني من السكري', en: 'I have diabetes', fr: 'Je suis diabétique', es: 'Tengo diabetes', de: 'Ich habe Diabetes', tr: 'Diyabet hastasıyım', ru: 'У меня диабет', zh: '我有糖尿病' } },

  // ---- Common ----
  { id: 'c1', category: 'common', translations: { ar: 'نعم', en: 'Yes', fr: 'Oui', es: 'Sí', de: 'Ja', tr: 'Evet', ru: 'Да', zh: '是' } },
  { id: 'c2', category: 'common', translations: { ar: 'لا', en: 'No', fr: 'Non', es: 'No', de: 'Nein', tr: 'Hayır', ru: 'Нет', zh: '不' } },
  { id: 'c3', category: 'common', translations: { ar: 'من فضلك', en: 'Please', fr: 'S il vous plaît', es: 'Por favor', de: 'Bitte', tr: 'Lütfen', ru: 'Пожалуйста', zh: '请' } },
  { id: 'c4', category: 'common', translations: { ar: 'معذرةً', en: 'Excuse me', fr: 'Excusez-moi', es: 'Disculpe', de: 'Entschuldigung', tr: 'Affedersiniz', ru: 'Простите', zh: '打扰一下' } },
  { id: 'c5', category: 'common', translations: { ar: 'لا أفهم', en: 'I do not understand', fr: 'Je ne comprends pas', es: 'No entiendo', de: 'Ich verstehe nicht', tr: 'Anlamıyorum', ru: 'Я не понимаю', zh: '我听不懂' } },
  { id: 'c6', category: 'common', translations: { ar: 'هل تتكلم الإنجليزية؟', en: 'Do you speak English?', fr: 'Parlez-vous anglais ?', es: '¿Habla inglés?', de: 'Sprechen Sie Englisch?', tr: 'İngilizce konuşuyor musunuz?', ru: 'Вы говорите по-английски?', zh: '你会说英语吗？' } },
  { id: 'c7', category: 'common', translations: { ar: 'تكلم ببطء من فضلك', en: 'Please speak slowly', fr: 'Parlez lentement, s il vous plaît', es: 'Hable despacio, por favor', de: 'Sprechen Sie bitte langsam', tr: 'Lütfen yavaş konuşun', ru: 'Говорите медленнее, пожалуйста', zh: '请说慢一点' } },
  { id: 'c8', category: 'common', translations: { ar: 'كم الساعة؟', en: 'What time is it?', fr: 'Quelle heure est-il ?', es: '¿Qué hora es?', de: 'Wie spät ist es?', tr: 'Saat kaç?', ru: 'Который час?', zh: '现在几点？' } },
];

/* ------------------------------------------------------------------ */
/* User phrasebook (localStorage)                                      */
/* ------------------------------------------------------------------ */

const USER_KEY = 'mahdi_phrasebook_user_v1';
const CARDS_KEY = 'mahdi_flashcards_v1';

export interface UserPhrase {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: number;
}

export function getUserPhrases(): UserPhrase[] {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addUserPhrase(phrase: Omit<UserPhrase, 'id' | 'createdAt'>): UserPhrase {
  const list = getUserPhrases();
  const entry: UserPhrase = {
    ...phrase,
    id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  localStorage.setItem(USER_KEY, JSON.stringify([entry, ...list]));
  return entry;
}

export function removeUserPhrase(id: string): void {
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(getUserPhrases().filter((p) => p.id !== id)),
  );
}

/* ------------------------------------------------------------------ */
/* Leitner flashcards                                                  */
/* ------------------------------------------------------------------ */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  frontLang: string;
  backLang: string;
  /** Leitner box 1..5. */
  box: number;
  /** Epoch ms of the next due review. */
  dueAt: number;
  reviews: number;
  correct: number;
}

const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 8, 16];

export function getFlashcards(): Flashcard[] {
  try {
    return JSON.parse(localStorage.getItem(CARDS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFlashcards(cards: Flashcard[]): void {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function addFlashcard(card: Omit<Flashcard, 'id' | 'box' | 'dueAt' | 'reviews' | 'correct'>): Flashcard {
  const cards = getFlashcards();
  const entry: Flashcard = {
    ...card,
    id: `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    box: 1,
    dueAt: Date.now(),
    reviews: 0,
    correct: 0,
  };
  saveFlashcards([entry, ...cards]);
  return entry;
}

export function removeFlashcard(id: string): void {
  saveFlashcards(getFlashcards().filter((c) => c.id !== id));
}

export function getDueFlashcards(): Flashcard[] {
  const now = Date.now();
  return getFlashcards()
    .filter((c) => c.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

export function rateFlashcard(id: string, remembered: boolean): void {
  const cards = getFlashcards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.reviews += 1;
  if (remembered) {
    card.correct += 1;
    card.box = Math.min(5, card.box + 1);
  } else {
    card.box = 1;
  }
  card.dueAt = Date.now() + BOX_INTERVALS_DAYS[card.box] * 24 * 60 * 60 * 1000;
  saveFlashcards(cards);
}

export function phraseInLanguage(phrase: PhraseEntry, lang: string): string {
  return phrase.translations[lang] || phrase.translations.en || Object.values(phrase.translations)[0];
}
