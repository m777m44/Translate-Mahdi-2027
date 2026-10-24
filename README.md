# 🌐 مهدي 4.0 — Mahdi Translator Pro

> تطبيق ترجمة احترافي ذكي وشامل — **ذكاء اصطناعي يعمل بالكامل على الجهاز**
> (نماذج NLLB و Bergamot/Marian و Whisper)، وضعا **اللاسلكي WalkieTalkie**
> و**المحادثة المشفّرة بين جهازين**، ترجمة مستندات وترجمات مرئية، بنك عبارات
> وبطاقات مراجعة، أكثر من **1544 ثيم**، حزم أوفلاين، مزامنة سحابية، وتطبيق
> Android قابل للتثبيت (APK / PWA).

**A professional all-in-one translator with RTranslator-grade on-device AI** —
local NLLB / Marian-Bergamot / Whisper inference (Transformers.js + ONNX
Runtime Web, WebGPU/WASM), WalkieTalkie dual-language mode, encrypted WebRTC
peer-to-peer conversation, document & subtitle translation, an offline
phrasebook with Leitner flashcards, 1544 themes, cloud sync, and an installable
Android app (APK / PWA).

---

## © الحقوق / Rights & Ownership

> **جميع الحقوق محفوظة © 2027 — MAHDI**
> هذا المشروع وكل محتوياته (الكود، الثيمات، الشعارات، الأيقونات، التسمية) ملكية فكرية
> بإسم **MAHDI**. يُمنع نسخ أو إعادة نشر أو بيع أي جزء منه دون إذن كتابي صريح.
>
> **All rights reserved © 2027 — MAHDI.** No part may be copied, republished, or
> sold without explicit written permission.

---

## 🆗 ما الجديد في الإصدار 4.0 / What's new in v4.0

دمج فلسفة وتقنيات مشروع [RTranslator](https://github.com/niedev/RTranslator)
(الترجمة الفورية المحلية بالكامل) ضمن بنية الويب/Capacitor، دون نسخ أي كود منه:

| تقنية RTranslator | التنفيذ في مهدي 4.0 |
|---|---|
| نموذج Meta NLLB محلي | `neuralEngine.ts` عبر Transformers.js + ONNX Runtime Web (`Xenova/nllb-200-distilled-600M`) |
| نماذج Mozilla Bergamot (v3.0) | نماذج Helsinki Opus-MT لكل زوج لغوي (خفيفة وسريعة) |
| OpenAI Whisper للتعرّف الصوتي | Whisper Tiny/Base محلي على الجهاز |
| كشف اللغة FastText/Lingua | `langId.ts` — معرّف ثلاثي الحروف (trigram) يعمل أوفلاين |
| وضع WalkieTalkie (هاتف واحد، لغتان) | `walkieTalkieEngine.ts` + `WalkieTalkieModal` — استمع ← ترجم ← نطق ← استمع تلقائياً |
| وضع Conversation بين هاتفين | `p2pSession.ts` + `P2PConversationModal` — WebRTC مشفّر بتبادل كود QR |
| تنزيل النماذج عند أول تشغيل | `NeuralModelsModal` — تنزيل/حذف بقياس جودة INT4/INT8/FP32 وتسريع WebGPU |
| تكامل Tatoeba والقواميس | `phrasebook.ts` — 56 عبارة × 8 لغات + بطاقات Leitner |
| تقنية Beam Search | خيارات `num_beams` ودقات أوزان متعددة في الاستدعاءات |

### مميزات جديدة إضافية / Brand-new extras
- 📄 **ترجمة المستندات**: TXT / Markdown / SRT / VTT مع الحفاظ على توقيتات الترجمة المرئية.
- 📊 **لوحة إحصائيات**: الإجماليات، سلسلة الأيام، أكثر الأزواج والمحركات (محلية 100%).
- 🧭 **مركز أدوات** موحّد يجمع كل القداسات في واجهة واحدة أنيقة.
- 🪞 مرآة تنزيل نماذج بديلة للمناطق المحجوبة (مثل `hf-mirror.com`).
- 🪟 نافذة "ما الجديد" عند أول تشغيل + شارات إصدار في الواجهة.

---

## ✨ المميزات / Features

### 🧠 ذكاء اصطناعي على الجهاز / On-device AI
- **ترجمة عصبية محلية بالكامل** بدون إنترنت ولا مفاتيح: NLLB-200 (200+ لغة) أو
  نماذج Opus-MT الخفيفة لكل زوج لغوي.
- **تعرّف كلام Whisper** محلي، مع تسريع **WebGPU/NPU** عند توفره.
- النماذج تُخزَّن في ذاكرة التطبيق (Cache API) وتُدار من واجهة واحدة مع تقدّم التنزيل.
- سلسلة محركات ذكية: سحابي Gemini ← النموذج المحلي ← القاموس الأوفلاين الفوري.

### 🎙️ أوضاع محادثة متقدمة / Conversation modes
- **WalkieTalkie**: هاتف واحد يستمع للغتين معاً، يكشف اللغة تلقائياً، يترجم وينطق
  ثم يعود للاستماع — مع تحكم يدوي (اضغط للتحدث).
- **P2P بين جهازين**: اقتران عبر رمز QR/كود نصي فوق قناة WebRTC مشفّرة، كل طرف
  يترجم الرسائل على جهازه.
- **المحادثة الثنائية الكلاسيكية** صوت-إلى-صوت بين متحدثين.

### 📷 أدوات النص والصوت والمستندات
- ترجمة فورية أثناء الكتابة، كشف تلقائي للغة، ترجمة صور (OCR)، كتابة يدوية،
  نطق TTS، نافذة ترجمة عائمة، مفضلة وسجل كامل.
- ترجمة ملفات كاملة مع تصديرها جاهزة، وبنك عبارات سفر وطوارئ بثماني لغات.

### 🎨 واجهة بـ 1544 ثيم
- 1544 ثيم في 16 فئة تُطبَّق فوراً على كل التطبيق، وضع زجاجي، تباين وحركة وتكبير.

### ☁️ وأكثر
- PWA يعمل أوفلاين + Service Worker ذكي (يتجاوز تخزين النماذج المزدوج).
- مزامنة سحابية عبر Firestore مربوطة بحساب Google، ووضع محلي أنيق بلا مفاتيح.
- غلاف Capacitor 8 يبني **APK حقيقياً** (Android 7.0+).

---

## 🚀 التشغيل / Getting started

```bash
npm install --ignore-scripts   # onnxruntime-node postinstall غير لازم للمتصفح
npm rebuild esbuild
cp .env.example .env           # مفاتيح Gemini/Firebase اختيارية
npm run dev                    # http://localhost:3000
```

التطبيق يعمل **بدون** أي مفاتيح. المفاتيح تفعّل الترجمة السحابية والمزامنة فقط؛
أما النماذج العصبية فتُنزَّل من داخل التطبيق عند الطلب.

### أوامر / Scripts

| الأمر | الوصف |
|---|---|
| `npm run dev` | تشغيل خادم التطوير |
| `npm run build` | بناء الواجهة (يتضمن حزمة WASM العصبية) + الخادم |
| `npm run lint` | فحص الأنواع TypeScript |
| `npm run verify` | فحوصات الثيمات + عرض التطبيق |
| `npx tsx scripts/test-v4-logic.ts` | اختبارات منطق v4 (اللغة، المستندات، البطاقات، الإحصائيات) |
| `npm run cap:sync` | بناء الويب ونسخه لغلاف Android |
| `npm run apk:debug` | بناء APK محلياً (يتطلب Android SDK + JDK 21) |

---

## 📱 بناء APK / Building the APK

**الطريقة الأسهل — GitHub Actions:** ادفع الفرع فينفّذ `.github/workflows/build-apk.yml`
البناء ويرفع `mahdi-translate.apk` كـ Artifact وينشره في `public/downloads/`.
ولإنشاء إصدار رسمي: ادفع وسماً `v*` فينفّذ `release-apk.yml` وينشئ
[GitHub Release](https://github.com/m777m44/Translate-Mahdi-2027/releases) مع ملف APK.

**محلياً:**
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🧠 النماذج العصبية / Neural models

| النموذج | الاستخدام | الحجم التقريبي |
|---|---|---|
| `Xenova/nllb-200-distilled-600M` | ترجمة متعددة اللغات (200+ لغة) | ~390 MB (INT8) |
| `Xenova/opus-mt-{src}-{tgt}` | أزواج لغوية سريعة (Bergamot/Marian) | ~75 MB لكل زوج |
| `Xenova/whisper-tiny` / `whisper-base` | تعرّف الكلام المحلي | 45 / 85 MB |

النماذج تعمل عبر WASM افتراضياً وWebGPU عند الدعم، وتُحمَّل كسوائب كسولة
(`neural-runtime` chunk) فلا تثقّل الإقلاع.

---

## 🗂️ البنية / Structure

| الملف | الدور |
|---|---|
| `neuralEngine.ts` | محرك NLLB/Marian/Whisper المحلي (Transformers.js) |
| `langId.ts` | كاشف اللغة ثلاثي الحروف (مستوحى من FastText/Lingua) |
| `walkieTalkieEngine.ts` | حلقة الاستماع المزدوج (WalkieTalkie) |
| `p2pSession.ts` | جلسة WebRTC بنظام إشارات يدوي (QR/كود) |
| `phrasebook.ts` | بنك العبارات + بطاقات Leitner |
| `documentTranslator.ts` | ترجمة TXT/SRT/VTT مع الحفاظ على البنية |
| `usageStats.ts` | إحصائيات استخدام محلية |
| `components/NeuralModelsModal.tsx` | مدير تنزيل النماذج |
| `components/WalkieTalkieModal.tsx` | واجهة وضع اللاسلكي |
| `components/P2PConversationModal.tsx` | محادثة جهاز-إلى-جهاز |
| `components/PhrasebookModal.tsx` | العبارات والمراجعة |
| `components/DocumentTranslateModal.tsx` | ترجمة المستندات |
| `components/StatsModal.tsx` / `ToolsHubModal.tsx` / `WhatsNewModal.tsx` | الإحصائيات/مركز الأدوات/ما الجديد |
| `App.tsx` | الغلاف الرئيسي وسلسلة المحركات الموحدة |
| `offlineEngine.ts` / `geminiService.ts` | القاموس المحلي / الترجمة السحابية |
| `themeEngine.ts` وغيرها | نظام 1544 ثيم |
| `android/` | غلاف Capacitor لبناء APK |

---

## ⚖️ إسناد المشاريع مفتوحة المصدر / Open-source attribution

هذا المشروع **لم ينسخ أي كود** من RTranslator (رخصة GPL-3.0)، بل أعاد تنفيذ
مفاهيمه باستخدام مكتبات بتراخيص متساهلة:

- **[RTranslator](https://github.com/niedev/RTranslator)** (niedev, GPL-3.0) — مرجع إلهام معماري فقط.
- **[Transformers.js](https://github.com/huggingface/transformers.js)** (Apache-2.0) + **ONNX Runtime Web** (MIT).
- **[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)** (MIT).
- النماذج: **NLLB-200** (أوزان CC-BY-NC 4.0)، **Whisper** (MIT)، **Opus-MT/Helsinki-NLP** (CC-BY 2.0).

---

**صُنع بحب بواسطة MAHDI © 2027 — جميع الحقوق محفوظة.**
